package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"github.com/openai/openai-go/v3/shared"

	"coaster-api/internal/core/ports"
)

const gatewayBaseURL = "https://ai-gateway.vercel.sh/v1"

var errNoAPIKey = errors.New("AI Gateway authentication failed: AI_GATEWAY_API_KEY is not set")

type Gateway struct {
	client openai.Client
	apiKey string
}

func NewGateway(apiKey string) *Gateway {
	return newGateway(apiKey, option.WithBaseURL(gatewayBaseURL))
}

func newGateway(apiKey string, opts ...option.RequestOption) *Gateway {
	opts = append([]option.RequestOption{option.WithAPIKey(apiKey)}, opts...)
	return &Gateway{client: openai.NewClient(opts...), apiKey: apiKey}
}

func (g *Gateway) Generate(ctx context.Context, request ports.AIRequest) (string, error) {
	if g.apiKey == "" {
		return "", errNoAPIKey
	}

	tools, err := toolParams(request.Tools)
	if err != nil {
		return "", err
	}

	messages := []openai.ChatCompletionMessageParamUnion{openai.SystemMessage(request.System)}
	for _, message := range request.Messages {
		switch message.Role {
		case "assistant":
			messages = append(messages, openai.AssistantMessage(message.Content))
		case "system":
			messages = append(messages, openai.SystemMessage(message.Content))
		default:
			messages = append(messages, openai.UserMessage(message.Content))
		}
	}

	for step := 1; ; step++ {
		params := openai.ChatCompletionNewParams{
			Model:       request.Model,
			Messages:    messages,
			Tools:       tools,
			Temperature: openai.Float(request.Temperature),
		}
		if len(request.FallbackModels) > 0 {
			params.SetExtraFields(map[string]any{
				"providerOptions": map[string]any{"gateway": map[string]any{"models": request.FallbackModels}},
			})
		}

		var answer modelAnswer
		if request.OnDelta != nil {
			answer, err = g.stream(ctx, params, request.OnDelta)
		} else {
			answer, err = g.complete(ctx, params)
		}
		if err != nil {
			return "", err
		}

		if len(answer.toolCalls) == 0 || !toolsMayRun(answer.finishReason) {
			return answer.text, nil
		}

		messages = append(messages, answer.assistantMessage())
		for _, call := range answer.toolCalls {
			messages = append(messages, openai.ToolMessage(runTool(ctx, request.Tools, call), call.id))
		}

		if step >= request.MaxSteps {
			return answer.text, nil
		}
	}
}

type modelAnswer struct {
	text         string
	toolCalls    []toolCall
	finishReason string
}

type toolCall struct {
	id        string
	name      string
	arguments string
}

func (g *Gateway) complete(ctx context.Context, params openai.ChatCompletionNewParams) (modelAnswer, error) {
	completion, err := g.client.Chat.Completions.New(ctx, params)
	if err != nil {
		return modelAnswer{}, err
	}
	if len(completion.Choices) == 0 {
		return modelAnswer{}, errors.New("the model answered without choices")
	}

	choice := completion.Choices[0]
	answer := modelAnswer{text: choice.Message.Content, finishReason: choice.FinishReason}
	for _, call := range choice.Message.ToolCalls {
		answer.toolCalls = append(answer.toolCalls, toolCall{id: call.ID, name: call.Function.Name, arguments: call.Function.Arguments})
	}
	return answer, nil
}

func (g *Gateway) stream(ctx context.Context, params openai.ChatCompletionNewParams, onDelta func(string)) (modelAnswer, error) {
	stream := g.client.Chat.Completions.NewStreaming(ctx, params)
	defer stream.Close()

	var answer modelAnswer
	var text strings.Builder
	callAt := map[int64]int{}

	for stream.Next() {
		for _, choice := range stream.Current().Choices {
			if choice.Index != 0 {
				continue
			}

			if choice.Delta.Content != "" {
				text.WriteString(choice.Delta.Content)
				onDelta(choice.Delta.Content)
			}

			for _, piece := range choice.Delta.ToolCalls {
				at, seen := callAt[piece.Index]
				if !seen {
					at = len(answer.toolCalls)
					callAt[piece.Index] = at
					answer.toolCalls = append(answer.toolCalls, toolCall{})
				}

				call := &answer.toolCalls[at]
				if piece.ID != "" {
					call.id = piece.ID
				}
				if piece.Function.Name != "" {
					call.name = piece.Function.Name
				}
				call.arguments += piece.Function.Arguments
			}

			if choice.FinishReason != "" {
				answer.finishReason = choice.FinishReason
			}
		}
	}
	if err := stream.Err(); err != nil {
		return modelAnswer{}, err
	}

	answer.text = text.String()
	return answer, nil
}

func toolsMayRun(finishReason string) bool {
	switch finishReason {
	case "stop", "tool_calls", "function_call":
		return true
	default:
		return false
	}
}

func (a modelAnswer) assistantMessage() openai.ChatCompletionMessageParamUnion {
	message := openai.ChatCompletionAssistantMessageParam{}
	if a.text != "" {
		message.Content.OfString = openai.String(a.text)
	}

	for _, call := range a.toolCalls {
		message.ToolCalls = append(message.ToolCalls, openai.ChatCompletionMessageToolCallUnionParam{
			OfFunction: &openai.ChatCompletionMessageFunctionToolCallParam{
				ID: call.id,
				Function: openai.ChatCompletionMessageFunctionToolCallFunctionParam{
					Name:      call.name,
					Arguments: argumentsForHistory(call.arguments),
				},
			},
		})
	}

	return openai.ChatCompletionMessageParamUnion{OfAssistant: &message}
}

func argumentsForHistory(arguments string) string {
	if strings.TrimSpace(arguments) == "" {
		return "{}"
	}

	var compact bytes.Buffer
	if err := json.Compact(&compact, []byte(arguments)); err != nil {
		return "{}"
	}
	return compact.String()
}

func runTool(ctx context.Context, tools []ports.AITool, call toolCall) string {
	tool, found := findTool(tools, call.name)
	if !found {
		return noSuchToolMessage(tools, call.name)
	}

	input, err := parseToolInput(tool, call.arguments)
	if err != nil {
		slog.Warn("the model called a tool with an input that does not match its schema", "tool", call.name, "error", err)
		return err.Error()
	}

	result, err := marshal(tool.Run(ctx, input))
	if err != nil {
		return fmt.Sprintf("the result of %s could not be written as JSON: %v", call.name, err)
	}
	return string(result)
}

func findTool(tools []ports.AITool, name string) (ports.AITool, bool) {
	for _, tool := range tools {
		if tool.Name == name {
			return tool, true
		}
	}
	return ports.AITool{}, false
}

func noSuchToolMessage(tools []ports.AITool, name string) string {
	names := make([]string, 0, len(tools))
	for _, tool := range tools {
		names = append(names, tool.Name)
	}
	return fmt.Sprintf("Model tried to call unavailable tool '%s'. Available tools: %s.", name, strings.Join(names, ", "))
}

func toolParams(tools []ports.AITool) ([]openai.ChatCompletionToolUnionParam, error) {
	var params []openai.ChatCompletionToolUnionParam
	for _, tool := range tools {
		var parameters shared.FunctionParameters
		if err := json.Unmarshal(tool.Parameters, &parameters); err != nil {
			return nil, fmt.Errorf("reading the schema of %s: %w", tool.Name, err)
		}

		params = append(params, openai.ChatCompletionFunctionTool(shared.FunctionDefinitionParam{
			Name:        tool.Name,
			Description: openai.String(tool.Description),
			Parameters:  parameters,
		}))
	}
	return params, nil
}

func marshal(v any) ([]byte, error) {
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}
