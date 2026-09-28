package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"reflect"
	"strings"
	"testing"

	"api-go/internal/core/domain"
)

// nestAnswers is testdata/nest_ai_answers.json: what the tools of Nest answered for the same
// data as newAIFixture, and the system prompt of three turns. It was written by running the
// tools of apps/api/src/ai/tools with mocked buses.
func nestAnswers(t *testing.T) map[string]json.RawMessage {
	t.Helper()

	data, err := os.ReadFile("testdata/nest_ai_answers.json")
	if err != nil {
		t.Fatal(err)
	}
	var answers map[string]json.RawMessage
	if err := json.Unmarshal(data, &answers); err != nil {
		t.Fatal(err)
	}
	return answers
}

// nestAnswer is one of nestAnswers as JSON.stringify writes it.
func nestAnswer(t *testing.T, answers map[string]json.RawMessage, key string) string {
	t.Helper()

	raw, found := answers[key]
	if !found {
		t.Fatalf("testdata has no answer %q", key)
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, raw); err != nil {
		t.Fatal(err)
	}
	return compact.String()
}

// TestAIToolsAnswerLikeNest runs each tool with the input Nest was given and compares the
// JSON the model reads, byte for byte.
func TestAIToolsAnswerLikeNest(t *testing.T) {
	answers := nestAnswers(t)

	tests := []struct {
		key, user, tool, input string
	}{
		{"listTables", "u1", "listTables", `{}`},
		{"listProducts", "u1", "listProducts", `{}`},
		{"listProducts search", "u1", "listProducts", `{"search":" CAÑ "}`},
		{"listProducts lowStockOnly", "u1", "listProducts", `{"lowStockOnly":true}`},
		{"listCategories", "u1", "listCategories", `{}`},
		{"listOpenOrders", "u1", "listOpenOrders", `{}`},
		{"getOrderDetails", "u1", "getOrderDetails", `{"orderId":"o1"}`},
		{"getOrdersByDate bad date", "u1", "getOrdersByDate", `{"date":"27/09/2026"}`},
		{"getEstablishmentStats owner", "u1", "getEstablishmentStats", `{}`},
		{"getEstablishmentStats manager", "u3", "getEstablishmentStats", `{}`},
		{"getEstablishmentStats staff", "u2", "getEstablishmentStats", `{}`},
		{"listShifts", "u1", "listShifts", `{}`},
		{"listShiftExchanges", "u1", "listShiftExchanges", `{}`},
		{"listMembers", "u1", "listMembers", `{}`},
		{"createTable", "u1", "createTable", `{"name":"Mesa 4"}`},
		{"deleteTable unconfirmed", "u1", "deleteTable", `{"tableId":"t1","confirmed":false}`},
		{"deleteTable unknown unconfirmed", "u1", "deleteTable", `{"tableId":"t9","confirmed":false}`},
		{"deleteCategory unconfirmed", "u1", "deleteCategory", `{"categoryId":"c1","confirmed":false}`},
		{"deleteProduct unconfirmed", "u1", "deleteProduct", `{"productId":"p1","confirmed":false}`},
		{"cancelOrder unconfirmed", "u1", "cancelOrder", `{"orderId":"o1","confirmed":false}`},
		{"deleteOrder unconfirmed", "u1", "deleteOrder", `{"orderId":"o2","confirmed":false}`},
		{"removeOrderItem unconfirmed", "u1", "removeOrderItem", `{"orderId":"o1","itemId":"i1","confirmed":false}`},
		{"deleteShift unconfirmed", "u1", "deleteShift", `{"shiftId":"s1","confirmed":false}`},
		{"cancelShiftExchange unconfirmed", "u1", "cancelShiftExchange", `{"exchangeId":"x1","confirmed":false}`},
		{"inviteMember unconfirmed", "u1", "inviteMember", `{"email":"eva@example.com","role":"MANAGER","confirmed":false}`},
		{"inviteMember bad email", "u1", "inviteMember", `{"email":"eva at example","role":"STAFF","confirmed":true}`},
		{"removeMember unconfirmed", "u1", "removeMember", `{"memberId":"m2","confirmed":false}`},
		{"deleteProduct as staff", "u2", "deleteProduct", `{"productId":"p1","confirmed":true}`},
		{"getEstablishmentStats denied", "u2", "getEstablishmentStats", `{}`},
		{"createShift bad dates", "u1", "createShift", `{"userId":"u2","startTime":"mañana","endTime":"2026-09-28T23:00:00Z"}`},
		{"createShift backwards", "u1", "createShift", `{"userId":"u2","startTime":"2026-09-28T23:00:00Z","endTime":"2026-09-28T16:00:00Z"}`},
		{"applyOrderDiscount item without id", "u1", "applyOrderDiscount", `{"orderId":"o1","target":"ITEM","type":"FIXED_AMOUNT","value":2}`},
		{"applyOrderDiscount too much", "u1", "applyOrderDiscount", `{"orderId":"o1","target":"ORDER","type":"PERCENTAGE","value":150}`},
		{"adjustProductStock zero", "u1", "adjustProductStock", `{"productId":"p1","delta":0}`},
		{"createProduct unknown category", "u1", "createProduct", `{"name":"Tarta","categoryId":"c9","price":4.5}`},
		{"createOrder unknown products", "u1", "createOrder", `{"tableId":"t2","items":[{"productId":"p9","quantity":1}]}`},
		{"updateCategory unknown", "u1", "updateCategory", `{"categoryId":"c9","name":"Otra"}`},
		{"checkoutOrder failing", "u1", "checkoutOrder", `{"orderId":"o404","paymentMethod":"CASH"}`},
	}

	for _, test := range tests {
		t.Run(test.key, func(t *testing.T) {
			f := newAIFixture()
			f.security.memberships["e1/u3"] = &domain.Membership{Role: "MANAGER", Active: true}

			got := f.run(t, f.toolContext(t, test.user), test.tool, test.input)
			if want := nestAnswer(t, answers, test.key); got != want {
				t.Errorf("%s(%s) =\n%s\nwant\n%s", test.tool, test.input, got, want)
			}
		})
	}
}

func TestAIOrdersByDateAddUpWhatEachOrderShows(t *testing.T) {
	f := newAIFixture()

	got := f.run(t, f.toolContext(t, "u1"), "getOrdersByDate", `{"date":"2026-09-27"}`)
	nest := nestAnswer(t, nestAnswers(t), "getOrdersByDate")
	if !strings.Contains(nest, `"revenue":10,`) || !strings.Contains(nest, `"total":11,`) {
		t.Fatalf("the answer of Nest changed: %s", nest)
	}
	if want := strings.Replace(nest, `"revenue":10,`, `"revenue":11,`, 1); got != want {
		t.Errorf("getOrdersByDate =\n%s\nwant\n%s", got, want)
	}
}

func TestAIToolReportsAnErrorThatIsNotACode(t *testing.T) {
	f := newAIFixture()
	tc := f.toolContext(t, "u1")

	result := tc.execute(domain.PermissionCreateTable, nil, func() error { return errors.New("connection refused") })

	got, _ := aiJSON(result)
	if want := nestAnswer(t, nestAnswers(t), "createTable broken"); got != want {
		t.Errorf("result = %s, want %s", got, want)
	}
}

// TestAIToolSchemasAreNests compares each tool with what zod gave the model in Nest
// (testdata/nest_ai_tools.json): the same tools in the same order, with the same
// description and JSON Schema.
func TestAIToolSchemasAreNests(t *testing.T) {
	data, err := os.ReadFile("testdata/nest_ai_tools.json")
	if err != nil {
		t.Fatal(err)
	}
	var want []struct {
		Name        string         `json:"name"`
		Description string         `json:"description"`
		Parameters  map[string]any `json:"parameters"`
	}
	if err := json.Unmarshal(data, &want); err != nil {
		t.Fatal(err)
	}

	f := newAIFixture()
	tools := f.service.aiTools(f.toolContext(t, "u1"))
	if len(tools) != len(want) {
		t.Fatalf("%d tools, want %d", len(tools), len(want))
	}

	for i, tool := range tools {
		if tool.Name != want[i].Name {
			t.Errorf("tool %d is %s, want %s", i, tool.Name, want[i].Name)
			continue
		}
		if tool.Description != want[i].Description {
			t.Errorf("%s: description =\n%q\nwant\n%q", tool.Name, tool.Description, want[i].Description)
		}

		var parameters map[string]any
		if err := json.Unmarshal(tool.Parameters, &parameters); err != nil {
			t.Fatalf("%s: %v", tool.Name, err)
		}
		if !reflect.DeepEqual(parameters, want[i].Parameters) {
			got, _ := aiJSON(parameters)
			wanted, _ := aiJSON(want[i].Parameters)
			t.Errorf("%s: schema =\n%s\nwant\n%s", tool.Name, got, wanted)
		}
	}
}

func TestAIToolsFollowTheModules(t *testing.T) {
	tests := []struct {
		modules []domain.EstablishmentModule
		first   string
		count   int
	}{
		{[]domain.EstablishmentModule{domain.ModuleTimeTracking}, "listShifts", 10},
		{[]domain.EstablishmentModule{domain.ModuleTimeTracking, domain.ModuleInventory}, "listProducts", 20},
		{domain.DefaultEstablishmentModules, "listTables", 40},
	}

	for _, test := range tests {
		f := newAIFixture()
		f.security.modules["e1"] = test.modules

		tools := f.service.aiTools(f.toolContext(t, "u1"))
		if len(tools) != test.count || tools[0].Name != test.first {
			t.Errorf("modules %v: %d tools starting with %s, want %d starting with %s", test.modules, len(tools), tools[0].Name, test.count, test.first)
		}
	}
}

// The runner (context.spec.ts).

func TestAIRunnerChecksThePermissionBeforeTheConfirmation(t *testing.T) {
	f := newAIFixture()
	staff := f.toolContext(t, "u2")
	ran := false

	result := staff.execute(domain.PermissionDeleteTable, &aiConfirmation{summary: `delete the table "Mesa 4"`, confirmed: true}, func() error {
		ran = true
		return nil
	})

	if ran || result.Status != domain.AIToolDenied {
		t.Errorf("staff deleting a table: ran %v, status %s", ran, result.Status)
	}
}

func TestAIRunnerHoldsADestructiveActionUntilConfirmed(t *testing.T) {
	f := newAIFixture()
	owner := f.toolContext(t, "u1")
	runs := 0
	command := func() error { runs++; return nil }

	held := owner.execute(domain.PermissionDeleteTable, &aiConfirmation{summary: `delete the table "Mesa 4"`}, command)
	if runs != 0 || held.Status != domain.AIToolConfirmationRequired || !strings.Contains(held.Message, `delete the table "Mesa 4"`) {
		t.Errorf("unconfirmed: runs %d, %+v", runs, held)
	}

	done := owner.execute(domain.PermissionDeleteTable, &aiConfirmation{summary: `delete the table "Mesa 4"`, confirmed: true}, command)
	if runs != 1 || done.Status != domain.AIToolOK || done.Data != nil {
		t.Errorf("confirmed: runs %d, %+v", runs, done)
	}
}

func TestAIRunnerLetsAPlatformAdminDoAnything(t *testing.T) {
	f := newAIFixture()
	admin := f.toolContext(t, "root")

	if !admin.isAdmin {
		t.Fatal("root is not a platform admin")
	}
	for _, permission := range domain.AllEstablishmentPermissions {
		if !admin.allows(permission) {
			t.Errorf("an admin is denied %s", permission)
		}
	}
}

func TestAIMoneyConversions(t *testing.T) {
	if toEuros(250) != 2.5 || toCents(2.5) != 250 || toCents(0.1+0.2) != 30 {
		t.Errorf("toEuros(250) = %v, toCents(2.5) = %d, toCents(0.1+0.2) = %d", toEuros(250), toCents(2.5), toCents(0.1+0.2))
	}
	if toCents(2.675) != 268 || toCents(1.005) != 100 || toCents(-2.5) != -250 || mathRound(-2.5) != -2 {
		t.Errorf("toCents(2.675) = %d, toCents(1.005) = %d, toCents(-2.5) = %d, mathRound(-2.5) = %d; JavaScript gives 268, 100, -250 and -2",
			toCents(2.675), toCents(1.005), toCents(-2.5), mathRound(-2.5))
	}
}

func TestAIToolSchemaReadsTheStruct(t *testing.T) {
	var schema map[string]any
	if err := json.Unmarshal(aiSchemaOf[aiNoInput](), &schema); err != nil {
		t.Fatal(err)
	}

	got, _ := aiJSON(schema)
	want := `{"$schema":"http://json-schema.org/draft-07/schema#","additionalProperties":false,"properties":{},"type":"object"}`
	if got != want {
		t.Errorf("schema of no input = %s, want %s", got, want)
	}
}

func TestAIToolWithAnInputItCannotReadFails(t *testing.T) {
	f := newAIFixture()

	got := f.run(t, f.toolContext(t, "u1"), "createTable", `{"name":4}`)
	if !strings.HasPrefix(got, `{"status":"error","message":"The action failed: json: cannot unmarshal number`) {
		t.Errorf("result = %s", got)
	}
	if len(f.tables.tables) != 2 {
		t.Error("a table was created")
	}
}
