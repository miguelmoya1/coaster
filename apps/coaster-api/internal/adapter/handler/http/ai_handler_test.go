package http

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
	"coaster-api/internal/service"
)

type aiModel struct {
	text     string
	deltas   []string
	err      error
	requests []ports.AIRequest
}

func (m *aiModel) Generate(_ context.Context, request ports.AIRequest) (string, error) {
	m.requests = append(m.requests, request)
	if request.OnDelta != nil {
		for _, delta := range m.deltas {
			request.OnDelta(delta)
		}
	}
	return m.text, m.err
}

type aiUsage struct{ messages int }

func (u *aiUsage) MessagesThisPeriod(context.Context, string, string) (int, error) {
	return u.messages, nil
}

func (u *aiUsage) ReserveMessage(_ context.Context, _, _ string, allowance int) (bool, error) {
	if u.messages >= allowance {
		return false, nil
	}
	u.messages++
	return true, nil
}

func (u *aiUsage) ReleaseMessage(context.Context, string, string) error {
	u.messages--
	return nil
}

type aiSecurity struct{ member bool }

func (aiSecurity) UserRole(context.Context, string) (domain.Role, error) { return domain.RoleUser, nil }
func (s aiSecurity) Membership(context.Context, string, string) (*domain.Membership, error) {
	if !s.member {
		return nil, nil
	}
	return &domain.Membership{Role: "STAFF", Active: true}, nil
}
func (aiSecurity) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, bool, error) {
	return []domain.EstablishmentModule{domain.ModuleTimeTracking}, true, nil
}
func (aiSecurity) SubscriptionState(context.Context, string) (*domain.SubscriptionState, error) {
	return &domain.SubscriptionState{Status: domain.SubscriptionActive}, nil
}

type aiServer struct {
	http.Handler
	model *aiModel
	usage *aiUsage
}

func newAIServer(member bool) *aiServer {
	server := &aiServer{model: &aiModel{text: "Hola"}, usage: &aiUsage{}}

	ai := service.NewAIService(service.AIDependencies{
		Model:    server.model,
		Usage:    server.usage,
		Security: service.NewSecurityService(aiSecurity{member: member}, adminNoCache{}, nil),
	})

	access := tillAccess{role: domain.EstablishmentRoleStaff, modules: []domain.EstablishmentModule{domain.ModuleTimeTracking}}
	guard := middleware.NewGuard(fakeTokens{}, access, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewAIHandler(ai).RegisterRoutes(mux, guard)
	server.Handler = mux

	return server
}

const aiGatewayFailedBody = `{"text":"ai_voice.errors.ai_gateway_failed","isError":true,"errorKey":"ai_voice.errors.ai_gateway_failed"}`

func TestAIRoutesNeedAMember(t *testing.T) {
	server := newAIServer(true)
	routes := []string{
		"GET /api/v1/establishments/e1/ai/usage",
		"POST /api/v1/establishments/e1/ai",
		"POST /api/v1/establishments/e1/ai/stream",
	}

	for _, route := range routes {
		method, target, _ := strings.Cut(route, " ")
		if response := send(server, method, target, `{"prompt":"hola"}`, nil); response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}
	}

	guard := middleware.NewGuard(fakeTokens{}, fakeAccess{}, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewAIHandler(nil).RegisterRoutes(mux, guard)
	for _, route := range routes {
		method, target, _ := strings.Cut(route, " ")
		if response := send(mux, method, target, `{"prompt":"hola"}`, tillSignedIn); response.Code != http.StatusForbidden {
			t.Errorf("%s of somebody who is not a member = %d", route, response.Code)
		}
	}
}

func TestAIUsageRoute(t *testing.T) {
	server := newAIServer(true)
	server.usage.messages = 3

	response := send(server, "GET", "/api/v1/establishments/e1/ai/usage", "", tillSignedIn)

	want := `{"used":3,"allowance":500,"remaining":497,"period":"` + domain.AIPeriodOf(time.Now()) + `"}`
	if response.Code != http.StatusOK || response.Body.String() != want {
		t.Errorf("usage = %d %s, want %s", response.Code, response.Body, want)
	}
}

func TestAIAnswersWithCreated(t *testing.T) {
	server := newAIServer(true)

	response := send(server, "POST", "/api/v1/establishments/e1/ai",
		`{"prompt":"hola","messages":[{"role":"user","content":"Hola"},{"role":"assistant","content":"¿Qué tal?"},{"role":"user","content":"hola"}],"extra":true}`,
		tillSignedIn)

	if response.Code != http.StatusCreated || response.Body.String() != `{"text":"Hola"}` {
		t.Fatalf("answer = %d %s", response.Code, response.Body)
	}
	if messages := server.model.requests[0].Messages; len(messages) != 3 || messages[1] != (domain.AIMessage{Role: "assistant", Content: "¿Qué tal?"}) {
		t.Errorf("messages = %+v", messages)
	}
	if server.usage.messages != 1 {
		t.Errorf("messages counted = %d", server.usage.messages)
	}
}

func TestAIAnswersAGatewayFailureWithCreated(t *testing.T) {
	server := newAIServer(true)
	server.model.err = errors.New("gateway down")

	response := send(server, "POST", "/api/v1/establishments/e1/ai", `{"prompt":"hola"}`, tillSignedIn)
	if response.Code != http.StatusCreated || response.Body.String() != aiGatewayFailedBody {
		t.Errorf("answer = %d %s", response.Code, response.Body)
	}
}

func TestAIReadsABodyWithoutPromptOrWithOtherTypes(t *testing.T) {
	server := newAIServer(true)

	for _, body := range []string{`{}`, `{"prompt":5}`, `[1]`} {
		response := send(server, "POST", "/api/v1/establishments/e1/ai", body, tillSignedIn)
		if response.Code != http.StatusCreated || response.Body.String() != aiGatewayFailedBody {
			t.Errorf("%s: answer = %d %s", body, response.Code, response.Body)
		}
	}

	response := send(server, "POST", "/api/v1/establishments/e1/ai", `{"prompt":`, tillSignedIn)
	if response.Code != http.StatusBadRequest {
		t.Errorf("broken JSON = %d %s", response.Code, response.Body)
	}
}

func TestAIRefusesInJSON(t *testing.T) {
	tests := []struct {
		name   string
		member bool
		used   int
		want   string
	}{
		{"not a member", false, 0, `{"message":"MEMBER_NOT_FOUND","error":"Forbidden","statusCode":403}`},
		{"over the allowance", true, 500, `{"message":"AI_QUOTA_EXCEEDED","error":"Forbidden","statusCode":403}`},
	}

	for _, test := range tests {
		server := newAIServer(test.member)
		server.usage.messages = test.used

		response := send(server, "POST", "/api/v1/establishments/e1/ai", `{"prompt":"hola"}`, tillSignedIn)
		if response.Code != http.StatusForbidden || response.Body.String() != test.want {
			t.Errorf("%s: %d %s", test.name, response.Code, response.Body)
		}
	}
}

func TestAIStreamsTheAnswer(t *testing.T) {
	server := newAIServer(true)
	server.model.deltas = []string{"Ho", "la <3"}

	response := send(server, "POST", "/api/v1/establishments/e1/ai/stream", `{"prompt":"hola"}`, tillSignedIn)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d", response.Code)
	}
	for header, want := range map[string]string{
		"Content-Type":      "text/event-stream",
		"Cache-Control":     "no-cache, no-transform",
		"Connection":        "keep-alive",
		"X-Accel-Buffering": "no",
	} {
		if got := response.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}

	want := "event: delta\ndata: {\"delta\":\"Ho\"}\n\n" +
		"event: delta\ndata: {\"delta\":\"la <3\"}\n\n" +
		"event: done\ndata: {\"text\":\"Hola <3\"}\n\n"
	if response.Body.String() != want {
		t.Errorf("body =\n%q\nwant\n%q", response.Body, want)
	}
}

func TestAIStreamSendsARefusalWithItsCode(t *testing.T) {
	for member, code := range map[bool]string{false: "MEMBER_NOT_FOUND", true: "AI_QUOTA_EXCEEDED"} {
		server := newAIServer(member)
		server.usage.messages = 500

		response := send(server, "POST", "/api/v1/establishments/e1/ai/stream", `{"prompt":"hola"}`, tillSignedIn)

		want := "event: done\ndata: {\"text\":\"" + code + "\",\"isError\":true,\"errorKey\":\"" + code + "\"}\n\n"
		if response.Code != http.StatusOK || response.Body.String() != want {
			t.Errorf("member %v: %d %q", member, response.Code, response.Body)
		}
	}
}

func TestAIRoutesAllowTwentyRequestsAMinute(t *testing.T) {
	server := newAIServer(true)

	for i := 1; i <= 21; i++ {
		response := send(server, "GET", "/api/v1/establishments/e1/ai/usage", "", tillSignedIn)
		if i <= 20 && response.Code != http.StatusOK {
			t.Fatalf("request %d = %d", i, response.Code)
		}
		if i == 21 && response.Code != http.StatusTooManyRequests {
			t.Errorf("request 21 = %d, want 429", response.Code)
		}
	}
}
