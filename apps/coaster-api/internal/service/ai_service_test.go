package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"testing"

	"coaster-api/internal/core/domain"
)

var aiAna = domain.User{ID: "u1", Name: "Ana", Language: "es"}

func aiPrompt(text string) domain.AIInput {
	return domain.AIInput{Prompt: &text}
}

func TestAIRefusesSomebodyWhoIsNotAMember(t *testing.T) {
	f := newAIFixture()
	f.security.memberships["e1/u2"] = &domain.Membership{Role: "STAFF", Active: false}

	for _, user := range []domain.User{{ID: "stranger"}, {ID: "u2"}} {
		_, err := f.service.Execute(context.Background(), "e1", user, aiPrompt("Crea la mesa 3"))
		if !domain.HasCode(err, domain.CodeMemberNotFound) {
			t.Errorf("%s: err = %v, want MEMBER_NOT_FOUND", user.ID, err)
		}
	}
	if len(f.model.requests) != 0 {
		t.Error("the model was called")
	}
}

func TestAIAnswersAPlatformAdminWhoIsNotAMember(t *testing.T) {
	f := newAIFixture()
	f.model.text = "Mesa creada correctamente."

	response, err := f.service.Execute(context.Background(), "e1", domain.User{ID: "root", Name: "Root"}, aiPrompt("Crea la mesa 3"))
	if err != nil {
		t.Fatal(err)
	}
	if response != (domain.AIResponse{Text: "Mesa creada correctamente."}) {
		t.Errorf("response = %+v", response)
	}
	if f.usage.messages["e1/2026-09"] != 1 {
		t.Errorf("messages this month = %d, want 1", f.usage.messages["e1/2026-09"])
	}
}

func TestAICallsTheModelLikeNest(t *testing.T) {
	f := newAIFixture()

	if _, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("Crea la mesa 3")); err != nil {
		t.Fatal(err)
	}

	request := f.model.lastRequest(t)
	if request.Model != "zai/glm-4.7" || request.Temperature != 0.1 || request.MaxSteps != 8 || request.OnDelta != nil {
		t.Errorf("model %s, temperature %v, steps %d, streaming %v", request.Model, request.Temperature, request.MaxSteps, request.OnDelta != nil)
	}
	wantFallbacks := []string{"openai/gpt-oss-120b", "openai/gpt-oss-20b", "nvidia/nemotron-nano-9b-v2", "google/gemini-3.6-flash"}
	if !slices.Equal(request.FallbackModels, wantFallbacks) {
		t.Errorf("fallback models = %v", request.FallbackModels)
	}
	if len(request.Messages) != 1 || request.Messages[0] != (domain.AIMessage{Role: "user", Content: "Crea la mesa 3"}) {
		t.Errorf("messages = %+v", request.Messages)
	}
	if len(request.Tools) != 40 {
		t.Errorf("%d tools, want 40", len(request.Tools))
	}
}

func TestAIWritesTheSystemPromptOfNest(t *testing.T) {
	answers := nestAnswers(t)

	tests := []struct {
		key      string
		language string
		prepare  func(f *aiFixture)
	}{
		{
			key:      "prompt staff",
			language: "es",
			prepare: func(f *aiFixture) {
				f.security.memberships["e1/u1"] = &domain.Membership{Role: "STAFF", Active: true}
			},
		},
		{
			key:      "prompt admin big catalogue",
			language: "en",
			prepare: func(f *aiFixture) {
				f.security.roles["u1"] = domain.RoleAdmin
				for n := range 5000 {
					id := "product-" + strconv.Itoa(n)
					f.products.products[id] = domain.ProductRow{ID: id, CategoryID: "c1", Name: "Producto numero " + strconv.Itoa(n), Price: 250, CurrentStock: 40}
				}
			},
		},
		{
			key: "prompt manager time tracking",
			prepare: func(f *aiFixture) {
				f.security.memberships["e1/u1"] = &domain.Membership{Role: "MANAGER", Active: true}
				f.security.modules["e1"] = []domain.EstablishmentModule{domain.ModuleTimeTracking}
			},
		},
	}

	for _, test := range tests {
		t.Run(test.key, func(t *testing.T) {
			f := newAIFixture()
			test.prepare(f)

			user := domain.User{ID: "u1", Name: "Ana", Language: test.language}
			if _, err := f.service.Execute(context.Background(), "e1", user, aiPrompt("hola")); err != nil {
				t.Fatal(err)
			}

			var want string
			if err := json.Unmarshal(answers[test.key], &want); err != nil {
				t.Fatal(err)
			}
			if got := f.model.lastRequest(t).System; got != want {
				t.Errorf("system prompt differs from Nest's:\n%s", firstDifference(got, want))
			}
		})
	}
}

func firstDifference(got, want string) string {
	gotLines, wantLines := strings.Split(got, "\n"), strings.Split(want, "\n")
	for i := range min(len(gotLines), len(wantLines)) {
		if gotLines[i] != wantLines[i] {
			return fmt.Sprintf("line %d:\n got %q\nwant %q", i+1, gotLines[i], wantLines[i])
		}
	}
	return fmt.Sprintf("%d lines, want %d", len(gotLines), len(wantLines))
}

func TestAITellsTheModelWhatTheRoleMayDo(t *testing.T) {
	f := newAIFixture()

	if _, err := f.service.Execute(context.Background(), "e1", domain.User{ID: "u2", Name: "Luis"}, aiPrompt("hola")); err != nil {
		t.Fatal(err)
	}

	system := f.model.lastRequest(t).System
	if !strings.Contains(system, "establishment:create-order") || strings.Contains(system, "establishment:delete-product") {
		t.Error("the prompt of a staff member does not list exactly the staff permissions")
	}
	if !strings.Contains(system, `Role: "STAFF"`) || !strings.Contains(system, `the user's language is: "es"`) {
		t.Error("the prompt does not name the role, or the default language")
	}
}

func TestAISendsTheHistoryInsteadOfThePrompt(t *testing.T) {
	f := newAIFixture()
	history := []domain.AIMessage{
		{Role: "user", Content: "Hola"},
		{Role: "assistant", Content: "Hola, ¿en qué puedo ayudarte?"},
		{Role: "user", Content: "Crear mesa 3"},
	}

	if _, err := f.service.Execute(context.Background(), "e1", aiAna, domain.AIInput{Messages: history}); err != nil {
		t.Fatal(err)
	}
	if got := f.model.lastRequest(t).Messages; !slices.Equal(got, history) {
		t.Errorf("messages = %+v", got)
	}
}

func TestAIOnlySendsTheLastTenMessages(t *testing.T) {
	f := newAIFixture()
	var history []domain.AIMessage
	for i := range 30 {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		history = append(history, domain.AIMessage{Role: role, Content: "mensaje " + strconv.Itoa(i)})
	}

	if _, err := f.service.Execute(context.Background(), "e1", aiAna, domain.AIInput{Messages: history}); err != nil {
		t.Fatal(err)
	}

	sent := f.model.lastRequest(t).Messages
	if len(sent) != 10 || sent[0].Content != "mensaje 20" || sent[9].Content != "mensaje 29" {
		t.Errorf("sent %d messages, from %q to %q", len(sent), sent[0].Content, sent[len(sent)-1].Content)
	}
}

func TestAIRefusesAnEstablishmentOverItsAllowance(t *testing.T) {
	tests := []struct {
		name   string
		status domain.SubscriptionStatus
		config AIConfig
		used   int
		allow  bool
	}{
		{"under the monthly allowance", domain.SubscriptionActive, AIConfig{MonthlyMessages: 500}, 499, true},
		{"at the monthly allowance", domain.SubscriptionActive, AIConfig{MonthlyMessages: 500}, 500, false},
		{"on trial", domain.SubscriptionTrialing, AIConfig{MonthlyMessages: 500, TrialMonthlyMessages: 100}, 100, false},
		{"on trial, under", domain.SubscriptionTrialing, AIConfig{MonthlyMessages: 500, TrialMonthlyMessages: 100}, 99, true},
		{"with the assistant switched off", domain.SubscriptionActive, AIConfig{MonthlyMessages: 0}, 0, false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			f := newAIFixture()
			f.service.config = test.config
			f.security.subscription["e1"] = &domain.SubscriptionState{Status: test.status}
			f.usage.messages["e1/2026-09"] = test.used

			_, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("hola"))
			if test.allow && err != nil {
				t.Errorf("err = %v, want an answer", err)
			}
			if !test.allow && !domain.HasCode(err, domain.CodeAiQuotaExceeded) {
				t.Errorf("err = %v, want AI_QUOTA_EXCEEDED", err)
			}
		})
	}
}

func TestAIDoesNotCountAMessageTheGatewayNeverAnswered(t *testing.T) {
	f := newAIFixture()
	f.model.err = errors.New("gateway down")

	response, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("hola"))
	if err != nil {
		t.Fatal(err)
	}

	want := domain.AIResponse{Text: "ai_voice.errors.ai_gateway_failed", IsError: true, ErrorKey: "ai_voice.errors.ai_gateway_failed"}
	if response != want {
		t.Errorf("response = %+v", response)
	}
	if f.usage.messages["e1/2026-09"] != 0 || len(f.usage.released) != 1 {
		t.Errorf("messages %v, released %v; the reserved message should go back", f.usage.messages, f.usage.released)
	}
}

func TestAIDoesNotCallTheModelWhenTheMessageCannotBeCounted(t *testing.T) {
	f := newAIFixture()
	f.usage.err = errors.New("database down")

	if _, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("hola")); err == nil {
		t.Error("err = nil, want the error of the database")
	}
	if len(f.model.requests) != 0 {
		t.Errorf("the model was called %d times", len(f.model.requests))
	}
}

func TestAICountsTheMessageBeforeAnswering(t *testing.T) {
	f := newAIFixture()
	f.usage.messages["e1/2026-09"] = 499

	if _, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("hola")); err != nil {
		t.Fatal(err)
	}
	if _, err := f.service.Execute(context.Background(), "e1", aiAna, aiPrompt("otra")); !domain.HasCode(err, domain.CodeAiQuotaExceeded) {
		t.Errorf("the 501st message = %v, want AI_QUOTA_EXCEEDED", err)
	}
	if f.usage.messages["e1/2026-09"] != 500 || len(f.model.requests) != 1 {
		t.Errorf("messages %d, model calls %d; want 500 and 1", f.usage.messages["e1/2026-09"], len(f.model.requests))
	}
}

func TestAIFailsLikeTheGatewayWithoutAPromptOrWithAnUnknownRole(t *testing.T) {
	for _, input := range []domain.AIInput{
		{},
		{Messages: []domain.AIMessage{{Role: "tool", Content: "hola"}}},
	} {
		f := newAIFixture()

		response, err := f.service.Execute(context.Background(), "e1", aiAna, input)
		if err != nil || response != domain.AIGatewayFailed {
			t.Errorf("%+v: response = %+v, %v", input, response, err)
		}
		if len(f.model.requests) != 0 || f.usage.messages["e1/2026-09"] != 0 {
			t.Errorf("%+v: model called %d times, %d messages counted", input, len(f.model.requests), f.usage.messages["e1/2026-09"])
		}
	}
}

func TestAIAnswersSomethingWhenTheModelSaysNothing(t *testing.T) {
	for language, want := range map[string]string{
		"es": "Acción completada con éxito.",
		"":   "Acción completada con éxito.",
		"en": "Action completed successfully.",
	} {
		f := newAIFixture()
		f.model.text = ""

		response, err := f.service.Execute(context.Background(), "e1", domain.User{ID: "u1", Language: language}, aiPrompt("hola"))
		if err != nil || response.Text != want {
			t.Errorf("language %q: %+v, %v", language, response, err)
		}
	}
}

func TestAIKeepsTheStreamedTranscriptAsTheAnswer(t *testing.T) {
	f := newAIFixture()
	f.model.deltas = []string{"Voy a mirarlo. ", "Hoy llevas 240 €. "}
	f.model.text = "Hoy llevas 240 €."
	var deltas []string

	response, err := f.service.Execute(context.Background(), "e1", aiAna, domain.AIInput{
		Prompt:  new("¿cuánto llevamos hoy?"),
		OnDelta: func(delta string) { deltas = append(deltas, delta) },
	})
	if err != nil {
		t.Fatal(err)
	}

	if strings.Join(deltas, "|") != "Voy a mirarlo. |Hoy llevas 240 €. " {
		t.Errorf("deltas = %q", deltas)
	}
	if response.Text != "Voy a mirarlo. Hoy llevas 240 €." {
		t.Errorf("text = %q", response.Text)
	}
	if len(f.usage.counted) != 1 {
		t.Errorf("counted %v", f.usage.counted)
	}
}

func TestAIKeepsWhatWasStreamedWhenALaterStepFails(t *testing.T) {
	f := newAIFixture()
	f.model.deltas = []string{"He creado la mesa."}
	f.model.err = errors.New("gateway down")

	response, err := f.service.Execute(context.Background(), "e1", aiAna, domain.AIInput{Prompt: new("crea una mesa"), OnDelta: func(string) {}})
	if err != nil || response != (domain.AIResponse{Text: "He creado la mesa."}) {
		t.Errorf("response = %+v, %v", response, err)
	}
	if len(f.usage.counted) != 1 {
		t.Errorf("counted %v", f.usage.counted)
	}
}

func TestAIStreamingWithoutTextUsesTheLastStep(t *testing.T) {
	f := newAIFixture()
	f.model.deltas = []string{"  "}
	f.model.text = ""

	response, err := f.service.Execute(context.Background(), "e1", aiAna, domain.AIInput{Prompt: new("hola"), OnDelta: func(string) {}})
	if err != nil || response.Text != "Acción completada con éxito." {
		t.Errorf("response = %+v, %v", response, err)
	}
}

func TestAIRunsTheToolsWithTheUsersPermissions(t *testing.T) {
	f := newAIFixture()
	f.model.calls = []fakeAICall{
		{tool: "createTable", input: `{"name":"Mesa 4"}`},
		{tool: "deleteProduct", input: `{"productId":"p1","confirmed":true}`},
	}

	if _, err := f.service.Execute(context.Background(), "e1", domain.User{ID: "u2", Name: "Luis"}, aiPrompt("hola")); err != nil {
		t.Fatal(err)
	}

	if len(f.model.results) != 2 || f.model.results[0].Status != domain.AIToolDenied || f.model.results[1].Status != domain.AIToolDenied {
		t.Errorf("results = %+v", f.model.results)
	}
	if f.products.deleted["p1"] {
		t.Error("staff deleted a product")
	}
}

func TestAIUsage(t *testing.T) {
	tests := []struct {
		name   string
		status domain.SubscriptionStatus
		used   int
		want   domain.AIUsage
	}{
		{"active", domain.SubscriptionActive, 120, domain.AIUsage{Used: 120, Allowance: 500, Remaining: 380, Period: "2026-09"}},
		{"on trial", domain.SubscriptionTrialing, 30, domain.AIUsage{Used: 30, Allowance: 100, Remaining: 70, Period: "2026-09"}},
		{"over", domain.SubscriptionTrialing, 130, domain.AIUsage{Used: 130, Allowance: 100, Remaining: 0, Period: "2026-09"}},
	}

	for _, test := range tests {
		f := newAIFixture()
		f.security.subscription["e1"] = &domain.SubscriptionState{Status: test.status}
		f.usage.messages["e1/2026-09"] = test.used

		usage, err := f.service.Usage(context.Background(), "e1")
		if err != nil || usage != test.want {
			t.Errorf("%s: usage = %+v, %v; want %+v", test.name, usage, err, test.want)
		}
	}
}

func TestAIUsageWithoutASubscriptionIsNotATrial(t *testing.T) {
	f := newAIFixture()
	delete(f.security.subscription, "e1")

	usage, err := f.service.Usage(context.Background(), "e1")
	if err != nil || usage.Allowance != 500 {
		t.Errorf("usage = %+v, %v", usage, err)
	}
}
