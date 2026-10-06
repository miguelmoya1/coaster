package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/openai/openai-go/v3/option"

	"coaster-api/internal/adapter/nodejson"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type fakeStep struct {
	text         []string
	toolCalls    []fakeToolCall
	finishReason string
}

type fakeToolCall struct {
	id, name  string
	arguments []string
}

type fakeGateway struct {
	t       *testing.T
	steps   []fakeStep
	status  int
	mu      sync.Mutex
	bodies  []map[string]any
	headers []http.Header
}

func (f *fakeGateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/chat/completions" {
		f.t.Errorf("path = %s, want /chat/completions", r.URL.Path)
	}

	raw, _ := io.ReadAll(r.Body)
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		f.t.Errorf("the body is not JSON: %s", raw)
	}

	f.mu.Lock()
	f.bodies = append(f.bodies, body)
	f.headers = append(f.headers, r.Header.Clone())
	index := len(f.bodies) - 1
	f.mu.Unlock()

	if f.status != 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(f.status)
		fmt.Fprint(w, `{"error":{"message":"gateway down","type":"server_error"}}`)
		return
	}
	if index >= len(f.steps) {
		f.t.Errorf("request %d has no step in the script", index+1)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	step := f.steps[index]
	if body["stream"] == true {
		f.stream(w, step)
		return
	}

	var calls []map[string]any
	for _, call := range step.toolCalls {
		calls = append(calls, map[string]any{
			"id": call.id, "type": "function",
			"function": map[string]any{"name": call.name, "arguments": strings.Join(call.arguments, "")},
		})
	}
	message := map[string]any{"role": "assistant", "content": strings.Join(step.text, "")}
	if calls != nil {
		message["tool_calls"] = calls
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id": "chatcmpl-1", "object": "chat.completion", "created": 0, "model": "zai/glm-4.7",
		"choices": []any{map[string]any{"index": 0, "message": message, "finish_reason": step.finishReasonOr()}},
	})
}

func (f *fakeGateway) stream(w http.ResponseWriter, step fakeStep) {
	w.Header().Set("Content-Type", "text/event-stream")

	chunk := func(delta map[string]any, finishReason any) {
		data, _ := json.Marshal(map[string]any{
			"id": "chatcmpl-1", "object": "chat.completion.chunk", "created": 0, "model": "zai/glm-4.7",
			"choices": []any{map[string]any{"index": 0, "delta": delta, "finish_reason": finishReason}},
		})
		fmt.Fprintf(w, "data: %s\n\n", data)
	}

	chunk(map[string]any{"role": "assistant", "content": ""}, nil)
	for _, piece := range step.text {
		chunk(map[string]any{"content": piece}, nil)
	}
	for i, call := range step.toolCalls {
		for j, piece := range call.arguments {
			toolCall := map[string]any{"index": i, "function": map[string]any{"arguments": piece}}
			if j == 0 {
				toolCall["id"] = call.id
				toolCall["type"] = "function"
				toolCall["function"] = map[string]any{"name": call.name, "arguments": piece}
			}
			chunk(map[string]any{"tool_calls": []any{toolCall}}, nil)
		}
	}
	chunk(map[string]any{}, step.finishReasonOr())
	fmt.Fprint(w, "data: [DONE]\n\n")
}

func (s fakeStep) finishReasonOr() string {
	if s.finishReason != "" {
		return s.finishReason
	}
	if len(s.toolCalls) > 0 {
		return "tool_calls"
	}
	return "stop"
}

func newFakeGateway(t *testing.T, steps ...fakeStep) (*fakeGateway, *Gateway) {
	t.Helper()
	fake := &fakeGateway{t: t, steps: steps}
	server := httptest.NewServer(fake)
	t.Cleanup(server.Close)
	return fake, newGateway("test-key", option.WithBaseURL(server.URL), option.WithMaxRetries(0))
}

type recordingTool struct {
	inputs []string
}

func (r *recordingTool) tool() ports.AITool {
	return ports.AITool{
		Name:        "createTable",
		Description: "Create a new table in the establishment.",
		Parameters:  json.RawMessage(`{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"name":{"type":"string","description":"Table name."}},"required":["name"],"additionalProperties":false}`),
		Run: func(_ context.Context, input json.RawMessage) domain.AIToolResult {
			r.inputs = append(r.inputs, string(input))
			return domain.AIToolResult{Status: domain.AIToolOK, Message: "Action completed successfully."}
		},
	}
}

func baseRequest(tools ...ports.AITool) ports.AIRequest {
	return ports.AIRequest{
		Model:          "zai/glm-4.7",
		FallbackModels: []string{"openai/gpt-oss-120b", "google/gemini-3.6-flash"},
		Temperature:    0.1,
		MaxSteps:       8,
		System:         "You are the Coaster Voice Assistant.",
		Messages: []domain.AIMessage{
			{Role: "user", Content: "Hola"},
			{Role: "assistant", Content: "Hola, ¿en qué puedo ayudarte?"},
			{Role: "user", Content: "Crea la mesa 4"},
		},
		Tools: tools,
	}
}

func TestGatewayRunsTheToolsTheModelAsksForAndReturnsItsAnswer(t *testing.T) {
	fake, gateway := newFakeGateway(t,
		fakeStep{toolCalls: []fakeToolCall{{id: "call_1", name: "createTable", arguments: []string{`{"name": "Mesa 4", "extra": 1}`}}}},
		fakeStep{text: []string{"He creado la ", "**Mesa 4**."}},
	)
	tables := &recordingTool{}

	text, err := gateway.Generate(context.Background(), baseRequest(tables.tool()))
	if err != nil {
		t.Fatal(err)
	}

	if text != "He creado la **Mesa 4**." {
		t.Errorf("text = %q", text)
	}
	if len(tables.inputs) != 1 || tables.inputs[0] != `{"extra":1,"name":"Mesa 4"}` {
		t.Errorf("the tool ran with %v", tables.inputs)
	}
	if len(fake.bodies) != 2 {
		t.Fatalf("requests = %d, want 2", len(fake.bodies))
	}

	first := fake.bodies[0]
	if first["model"] != "zai/glm-4.7" || first["temperature"] != 0.1 || first["stream"] != nil {
		t.Errorf("first request: model %v, temperature %v, stream %v", first["model"], first["temperature"], first["stream"])
	}
	if got := mustJSON(t, first["providerOptions"]); got != `{"gateway":{"models":["openai/gpt-oss-120b","google/gemini-3.6-flash"]}}` {
		t.Errorf("providerOptions = %s", got)
	}
	wantMessages := `[{"content":"You are the Coaster Voice Assistant.","role":"system"},{"content":"Hola","role":"user"},` +
		`{"content":"Hola, ¿en qué puedo ayudarte?","role":"assistant"},{"content":"Crea la mesa 4","role":"user"}]`
	if got := mustJSON(t, first["messages"]); got != wantMessages {
		t.Errorf("messages = %s\nwant %s", got, wantMessages)
	}
	wantTools := `[{"function":{"description":"Create a new table in the establishment.","name":"createTable",` +
		`"parameters":{"$schema":"http://json-schema.org/draft-07/schema#","additionalProperties":false,` +
		`"properties":{"name":{"description":"Table name.","type":"string"}},"required":["name"],"type":"object"}},"type":"function"}]`
	if got := mustJSON(t, first["tools"]); got != wantTools {
		t.Errorf("tools = %s\nwant %s", got, wantTools)
	}
	if auth := fake.headers[0].Get("Authorization"); auth != "Bearer test-key" {
		t.Errorf("Authorization = %q", auth)
	}

	messages := fake.bodies[1]["messages"].([]any)
	if len(messages) != 6 {
		t.Fatalf("the second request has %d messages, want 6: %s", len(messages), mustJSON(t, messages))
	}
	wantAssistant := `{"role":"assistant","tool_calls":[{"function":{"arguments":"{\"name\":\"Mesa 4\",\"extra\":1}","name":"createTable"},"id":"call_1","type":"function"}]}`
	if got := mustJSON(t, messages[4]); got != wantAssistant {
		t.Errorf("assistant message = %s\nwant %s", got, wantAssistant)
	}
	wantTool := `{"content":"{\"status\":\"ok\",\"message\":\"Action completed successfully.\"}","role":"tool","tool_call_id":"call_1"}`
	if got := mustJSON(t, messages[5]); got != wantTool {
		t.Errorf("tool message = %s\nwant %s", got, wantTool)
	}
}

func TestGatewayStreamsTheTextOfEveryStep(t *testing.T) {
	fake, gateway := newFakeGateway(t,
		fakeStep{
			text:      []string{"Voy a ", "mirarlo. "},
			toolCalls: []fakeToolCall{{id: "call_1", name: "createTable", arguments: []string{`{"na`, `me":"Mesa`, ` 4"}`}}},
		},
		fakeStep{text: []string{"Hoy llevas ", "240 €."}},
	)
	tables := &recordingTool{}
	var deltas []string

	request := baseRequest(tables.tool())
	request.OnDelta = func(delta string) { deltas = append(deltas, delta) }
	text, err := gateway.Generate(context.Background(), request)
	if err != nil {
		t.Fatal(err)
	}

	if strings.Join(deltas, "|") != "Voy a |mirarlo. |Hoy llevas |240 €." {
		t.Errorf("deltas = %q", deltas)
	}
	if text != "Hoy llevas 240 €." {
		t.Errorf("text = %q, want the last step's", text)
	}
	if len(tables.inputs) != 1 || tables.inputs[0] != `{"name":"Mesa 4"}` {
		t.Errorf("the tool ran with %v", tables.inputs)
	}
	if fake.bodies[0]["stream"] != true {
		t.Errorf("stream = %v", fake.bodies[0]["stream"])
	}

	assistant := mustJSON(t, fake.bodies[1]["messages"].([]any)[4])
	want := `{"content":"Voy a mirarlo. ","role":"assistant","tool_calls":[{"function":{"arguments":"{\"name\":\"Mesa 4\"}","name":"createTable"},"id":"call_1","type":"function"}]}`
	if assistant != want {
		t.Errorf("assistant message = %s\nwant %s", assistant, want)
	}
}

func TestGatewayStopsAfterMaxSteps(t *testing.T) {
	var steps []fakeStep
	for i := range 4 {
		steps = append(steps, fakeStep{
			text:      []string{fmt.Sprintf("paso %d", i+1)},
			toolCalls: []fakeToolCall{{id: fmt.Sprintf("call_%d", i+1), name: "createTable", arguments: []string{`{"name":"Mesa"}`}}},
		})
	}
	fake, gateway := newFakeGateway(t, steps...)
	tables := &recordingTool{}

	request := baseRequest(tables.tool())
	request.MaxSteps = 3
	text, err := gateway.Generate(context.Background(), request)
	if err != nil {
		t.Fatal(err)
	}

	if len(fake.bodies) != 3 || len(tables.inputs) != 3 {
		t.Errorf("requests = %d and tool runs = %d, want 3 of each: the tools of the last step still run", len(fake.bodies), len(tables.inputs))
	}
	if text != "paso 3" {
		t.Errorf("text = %q, want the last step's", text)
	}
}

func TestGatewayTellsTheModelWhatWasWrongWithACall(t *testing.T) {
	fake, gateway := newFakeGateway(t,
		fakeStep{toolCalls: []fakeToolCall{
			{id: "call_1", name: "createTable", arguments: []string{`{"name": 4}`}},
			{id: "call_2", name: "dropDatabase", arguments: []string{`{}`}},
			{id: "call_3", name: "createTable", arguments: []string{`{"name":`}},
		}},
		fakeStep{text: []string{"Perdona, ¿qué nombre le pongo?"}},
	)
	tables := &recordingTool{}

	if _, err := gateway.Generate(context.Background(), baseRequest(tables.tool())); err != nil {
		t.Fatal(err)
	}

	if len(tables.inputs) != 0 {
		t.Errorf("the tool ran with %v", tables.inputs)
	}

	messages := fake.bodies[1]["messages"].([]any)
	contents := make([]string, 0, 3)
	for _, message := range messages[5:] {
		contents = append(contents, message.(map[string]any)["content"].(string))
	}

	wantInvalid := "Invalid input for tool createTable: Type validation failed: Value: {\"name\":4}.\nError message: [\n" +
		"  {\n    \"expected\": \"string\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"name\"\n    ],\n" +
		"    \"message\": \"Invalid input: expected string, received number\"\n  }\n]"
	if contents[0] != wantInvalid {
		t.Errorf("invalid input message =\n%s\nwant\n%s", contents[0], wantInvalid)
	}
	if contents[1] != "Model tried to call unavailable tool 'dropDatabase'. Available tools: createTable." {
		t.Errorf("unknown tool message = %q", contents[1])
	}
	if !strings.HasPrefix(contents[2], "Invalid input for tool createTable: JSON parsing failed: Text: {\"name\":.\nError message: ") {
		t.Errorf("broken JSON message = %q", contents[2])
	}

	assistant := messages[4].(map[string]any)["tool_calls"].([]any)
	if got := assistant[2].(map[string]any)["function"].(map[string]any)["arguments"]; got != "{}" {
		t.Errorf("broken arguments go back to the model as %v, want {}", got)
	}
}

func TestGatewayGivesAnEmptyInputAsAnEmptyObject(t *testing.T) {
	_, gateway := newFakeGateway(t,
		fakeStep{toolCalls: []fakeToolCall{{id: "call_1", name: "listTables", arguments: []string{""}}}},
		fakeStep{text: []string{"Tienes dos mesas."}},
	)
	var input string
	listTables := ports.AITool{
		Name:       "listTables",
		Parameters: json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		Run: func(_ context.Context, raw json.RawMessage) domain.AIToolResult {
			input = string(raw)
			return domain.AIToolResult{Status: domain.AIToolOK, Message: "Query completed.", Data: []string{}}
		},
	}

	if _, err := gateway.Generate(context.Background(), baseRequest(listTables)); err != nil {
		t.Fatal(err)
	}
	if input != "{}" {
		t.Errorf("input = %q, want {}", input)
	}
}

func TestGatewayDoesNotRunTheToolsOfAnAnswerThatWasCutOff(t *testing.T) {
	fake, gateway := newFakeGateway(t, fakeStep{
		text:         []string{"Voy a crear"},
		toolCalls:    []fakeToolCall{{id: "call_1", name: "createTable", arguments: []string{`{"name":"Mesa 4"}`}}},
		finishReason: "length",
	})
	tables := &recordingTool{}

	text, err := gateway.Generate(context.Background(), baseRequest(tables.tool()))
	if err != nil {
		t.Fatal(err)
	}
	if text != "Voy a crear" || len(tables.inputs) != 0 || len(fake.bodies) != 1 {
		t.Errorf("text %q, tool runs %d, requests %d", text, len(tables.inputs), len(fake.bodies))
	}
}

func TestGatewayFailsWhenTheGatewayDoes(t *testing.T) {
	for _, stream := range []bool{false, true} {
		fake, gateway := newFakeGateway(t)
		fake.status = http.StatusBadGateway

		request := baseRequest()
		if stream {
			request.OnDelta = func(string) {}
		}
		if _, err := gateway.Generate(context.Background(), request); err == nil {
			t.Errorf("stream %v: a failing gateway gave no error", stream)
		}
	}
}

func TestGatewayWithoutAKeyFailsWithoutCallingTheGateway(t *testing.T) {
	fake := &fakeGateway{t: t}
	server := httptest.NewServer(fake)
	defer server.Close()
	gateway := newGateway("", option.WithBaseURL(server.URL))

	if _, err := gateway.Generate(context.Background(), baseRequest()); err == nil {
		t.Error("no error without a key")
	}
	if len(fake.bodies) != 0 {
		t.Errorf("the gateway was called %d times", len(fake.bodies))
	}
}

func TestGatewayLeavesOutFallbackModelsWhenThereAreNone(t *testing.T) {
	fake, gateway := newFakeGateway(t, fakeStep{text: []string{"Hola"}})

	request := baseRequest()
	request.FallbackModels = nil
	if _, err := gateway.Generate(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	if _, found := fake.bodies[0]["providerOptions"]; found {
		t.Error("providerOptions was sent without fallback models")
	}
	if _, found := fake.bodies[0]["tools"]; found {
		t.Error("tools was sent without tools")
	}
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	data, err := nodejson.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}
