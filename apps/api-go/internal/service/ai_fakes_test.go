package service

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"testing"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// The assistant's tests run the real services of every module with the fakes of P2, filled
// with the same data Nest was given to write testdata/nest_ai_answers.json.

// aiNow is when the turns of the tests happen: Sunday 27 September 2026, 10:00 UTC.
var aiNow = time.Date(2026, 9, 27, 10, 0, 0, 0, time.UTC)

// fakeAIModel answers every turn with text (or err). Before answering it runs the tools of
// calls, keeping what they said, and streams deltas when it is asked to.
type fakeAIModel struct {
	text     string
	err      error
	deltas   []string
	calls    []fakeAICall
	requests []ports.AIRequest
	results  []domain.AIToolResult
}

type fakeAICall struct {
	tool  string
	input string
}

func (m *fakeAIModel) Generate(ctx context.Context, request ports.AIRequest) (string, error) {
	m.requests = append(m.requests, request)

	for _, call := range m.calls {
		for _, tool := range request.Tools {
			if tool.Name == call.tool {
				m.results = append(m.results, tool.Run(ctx, json.RawMessage(call.input)))
			}
		}
	}

	if request.OnDelta != nil {
		for _, delta := range m.deltas {
			request.OnDelta(delta)
		}
	}

	return m.text, m.err
}

// lastRequest is the request of the last turn.
func (m *fakeAIModel) lastRequest(t *testing.T) ports.AIRequest {
	t.Helper()
	if len(m.requests) == 0 {
		t.Fatal("the model was not called")
	}
	return m.requests[len(m.requests)-1]
}

// fakeAIUsage is the "AiUsage" table.
type fakeAIUsage struct {
	messages map[string]int // "e1/2026-09" → messages
	counted  []string
	released []string
	err      error
}

func newFakeAIUsage() *fakeAIUsage {
	return &fakeAIUsage{messages: map[string]int{}}
}

func (u *fakeAIUsage) MessagesThisPeriod(_ context.Context, establishmentID, period string) (int, error) {
	return u.messages[establishmentID+"/"+period], nil
}

func (u *fakeAIUsage) ReserveMessage(_ context.Context, establishmentID, period string, allowance int) (bool, error) {
	if u.err != nil {
		return false, u.err
	}
	key := establishmentID + "/" + period
	if u.messages[key] >= allowance {
		return false, nil
	}
	u.messages[key]++
	u.counted = append(u.counted, key)
	return true, nil
}

func (u *fakeAIUsage) ReleaseMessage(_ context.Context, establishmentID, period string) error {
	key := establishmentID + "/" + period
	u.messages[key]--
	u.released = append(u.released, key)
	return nil
}

// aiProductRepo lists the products by id, so the tests read them always in the same order.
type aiProductRepo struct {
	*fakeProductRepo
}

func (r aiProductRepo) ListOf(ctx context.Context, establishmentID string) ([]domain.ProductRow, error) {
	rows, err := r.fakeProductRepo.ListOf(ctx, establishmentID)
	slices.SortFunc(rows, func(a, b domain.ProductRow) int { return strings.Compare(a.ID, b.ID) })
	return rows, err
}

// aiOrderRepo lists the orders by id and gives ofDay as the orders of any day.
type aiOrderRepo struct {
	*fakeOrderRepo
	ofDay []domain.OrderRow
	day   string
}

func (r *aiOrderRepo) ListOf(ctx context.Context, establishmentID string, status domain.OrderStatus) ([]domain.OrderRow, error) {
	rows, err := r.fakeOrderRepo.ListOf(ctx, establishmentID, status)
	slices.SortFunc(rows, func(a, b domain.OrderRow) int { return strings.Compare(a.ID, b.ID) })
	return rows, err
}

func (r *aiOrderRepo) ListCreatedBetween(_ context.Context, _ string, from, _ time.Time) ([]domain.OrderRow, error) {
	r.day = from.Format(time.DateOnly)
	return r.ofDay, nil
}

// aiFixture is the assistant of establishment e1, where Ana (u1) is the owner and Luis (u2)
// works on the staff.
type aiFixture struct {
	service   *AIService
	model     *fakeAIModel
	usage     *fakeAIUsage
	security  *fakeSecurity
	tables    *fakeTableRepo
	products  *fakeProductRepo
	orders    *aiOrderRepo
	orderLog  *orderEventRecorder
	shifts    *fakeShiftRepository
	exchanges *fakeShiftExchangeRepository
	members   *fakeMemberRepository
	mailer    *memberMailer
}

func newAIFixture() *aiFixture {
	f := &aiFixture{
		model: &fakeAIModel{text: "ok"},
		usage: newFakeAIUsage(),
		security: &fakeSecurity{
			roles: map[string]domain.Role{"u1": domain.RoleUser, "u2": domain.RoleUser, "root": domain.RoleAdmin},
			memberships: map[string]*domain.Membership{
				"e1/u1": {Role: "OWNER", Active: true},
				"e1/u2": {Role: "STAFF", Active: true},
			},
			modules:      map[string][]domain.EstablishmentModule{"e1": domain.DefaultEstablishmentModules},
			subscription: map[string]*domain.SubscriptionState{"e1": {Status: domain.SubscriptionActive}},
		},
		orderLog: &orderEventRecorder{},
		mailer:   &memberMailer{},
	}
	security, cache := newTestSecurity(f.security, nil)

	f.tables = newFakeTableRepo(
		domain.Table{ID: "t1", EstablishmentID: "e1", Name: "Mesa 1", Status: domain.TableOccupied},
		domain.Table{ID: "t2", EstablishmentID: "e1", Name: "Terraza", Status: domain.TableFree},
	)

	f.products = newFakeProductRepo()
	f.products.categoryOf["c1"] = "e1"
	f.products.categoryOf["c2"] = "e1"
	f.products.products["p1"] = domain.ProductRow{ID: "p1", CategoryID: "c1", Name: "Caña", Price: 250, CurrentStock: 3, MinStockAlert: 5}
	f.products.products["p2"] = domain.ProductRow{ID: "p2", CategoryID: "c2", Name: "Café", Price: 120, CurrentStock: 40, MinStockAlert: 10}

	localBar := "local_bar"
	categories := &fakeCategoryRepo{categories: []domain.Category{
		{ID: "c1", EstablishmentID: "e1", Name: "Bebidas", Icon: &localBar, TaxRate: 1000},
		{ID: "c2", EstablishmentID: "e1", Name: "Cafés", TaxRate: 1000},
	}}

	f.orders = &aiOrderRepo{fakeOrderRepo: newFakeOrderRepo(aiOrderOne(), aiOrderTwo())}
	f.orders.products = map[string]domain.OrderProduct{
		"p1": {ID: "p1", Name: "Caña", Price: 250, TaxRate: 1000},
		"p2": {ID: "p2", Name: "Café", Price: 120, TaxRate: 1000},
	}
	f.orders.ofDay = []domain.OrderRow{aiOrderOne(), aiOrderThree()}

	stats := NewStatsService(&fakeStatsRepository{orders: []domain.StatsOrder{
		{AmountPaidCash: 3000, CreatedAt: time.Date(2026, 8, 15, 12, 0, 0, 0, time.UTC)},
		{AmountPaidCard: 4000, CreatedAt: time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)},
		{AmountPaidCash: 800, CreatedAt: time.Date(2026, 9, 20, 13, 0, 0, 0, time.UTC)},
		{AmountPaidCard: 2200, CreatedAt: time.Date(2026, 9, 26, 20, 0, 0, 0, time.UTC)},
		{AmountPaidCash: 1500, TipAmount: 100, CreatedAt: time.Date(2026, 9, 27, 8, 0, 0, 0, time.UTC)},
		{AmountPaidCard: 1234, CreatedAt: time.Date(2026, 9, 27, 9, 0, 0, 0, time.UTC)},
	}})
	stats.now = func() time.Time { return aiNow }

	closing := "turno de cierre"
	f.shifts = &fakeShiftRepository{shifts: []domain.Shift{
		{
			ID: "s1", UserID: "u2", UserName: "Luis", EstablishmentID: "e1", Notes: &closing,
			StartTime: domain.NewInstant(time.Date(2026, 9, 28, 16, 0, 0, 0, time.UTC)),
			EndTime:   domain.NewInstant(time.Date(2026, 9, 28, 23, 0, 0, 0, time.UTC)),
		},
		{
			ID: "s2", UserID: "u1", UserName: "Ana", EstablishmentID: "e1",
			StartTime: domain.NewInstant(time.Date(2026, 9, 29, 8, 0, 0, 0, time.UTC)),
			EndTime:   domain.NewInstant(time.Date(2026, 9, 29, 15, 30, 0, 0, time.UTC)),
		},
	}}
	f.exchanges = newFakeShiftExchangeRepository()
	f.exchanges.pending = []domain.ShiftExchange{{
		ID: "x1", ShiftID: "s1", RequesterID: "u2", Status: domain.ShiftExchangePending, RequesterName: "Luis",
		ShiftStartTime: domain.NewInstant(time.Date(2026, 9, 28, 16, 0, 0, 0, time.UTC)),
		ShiftEndTime:   domain.NewInstant(time.Date(2026, 9, 28, 23, 0, 0, 0, time.UTC)),
		CreatedAt:      domain.NewInstant(time.Date(2026, 9, 27, 8, 0, 0, 0, time.UTC)),
	}}
	exchanges := NewShiftExchangeService(f.shifts, f.exchanges)
	exchanges.now = func() time.Time { return aiNow }

	f.members = newFakeMemberRepository()
	f.members.add(domain.EstablishmentMember{ID: "m1", UserID: "u1", EstablishmentID: "e1", Role: domain.EstablishmentRoleOwner, UserName: "Ana", UserEmail: "ana@example.com"})
	f.members.add(domain.EstablishmentMember{ID: "m2", UserID: "u2", EstablishmentID: "e1", Role: domain.EstablishmentRoleStaff, UserName: "Luis", UserEmail: "luis@example.com"})

	f.service = NewAIService(AIDependencies{
		Model:    f.model,
		Usage:    f.usage,
		Security: security,

		Categories: NewCategoryService(categories, &catalogEvents{}),
		Products:   NewProductService(aiProductRepo{f.products}, &catalogEvents{}),
		Orders:     NewOrderService(f.orders, f.tables, f.orderLog),
		Tables:     NewTableService(f.tables, f.orderLog),
		Stats:      stats,
		Shifts:     NewShiftService(f.shifts, security, &shiftEventRecorder{}, &shiftRealtimeRecorder{}),
		Exchanges:  exchanges,
		Members: NewEstablishmentMemberService(EstablishmentMemberDependencies{
			Members:  f.members,
			Security: security,
			Tokens:   &memberTokens{},
			Mailer:   f.mailer,
			Cache:    cache,
			Events:   &memberEventRecorder{},
			Realtime: &memberRealtimeRecorder{},
		}),
	})
	f.service.now = func() time.Time { return aiNow }

	return f
}

var aiOrderTime = time.Date(2026, 9, 27, 9, 0, 0, 0, time.UTC)

// aiOrderOne is open at Mesa 1: three cañas (two served, one paid) and a product that is
// no longer on the menu, with 10 % off the order and 0,50 € off the cañas.
func aiOrderOne() domain.OrderRow {
	table, reason, item := "t1", "invitación", "i1"
	return domain.OrderRow{
		ID: "o1", EstablishmentID: "e1", TableID: &table, Status: domain.OrderOpen, TotalAmount: 870,
		AmountPaidCash: 275, TipAmount: 100, PaymentMethod: domain.PaymentNone, CreatedAt: aiOrderTime, UpdatedAt: aiOrderTime,
		Items: []domain.OrderItemRow{
			{ID: "i1", OrderID: "o1", ProductID: "p1", ProductName: "Caña", Quantity: 3, PriceAtPurchase: 250, TaxRateAtPurchase: 1000, PaidQuantity: 1, ServedQuantity: 2},
			{ID: "i2", OrderID: "o1", ProductID: "p9", ProductName: "Old", Quantity: 1, PriceAtPurchase: 120, TaxRateAtPurchase: 1000},
		},
		Adjustments: []domain.OrderAdjustmentRow{
			{ID: "a1", OrderID: "o1", Target: domain.AdjustmentOrder, Type: domain.AdjustmentPercentage, Value: 10, Reason: &reason},
			{ID: "a2", OrderID: "o1", Target: domain.AdjustmentItem, ItemID: &item, Type: domain.AdjustmentFixedAmount, Value: 50},
		},
	}
}

// aiOrderTwo is open without a table: a coffee.
func aiOrderTwo() domain.OrderRow {
	return domain.OrderRow{
		ID: "o2", EstablishmentID: "e1", Status: domain.OrderOpen, TotalAmount: 120,
		PaymentMethod: domain.PaymentNone, CreatedAt: aiOrderTime, UpdatedAt: aiOrderTime,
		Items: []domain.OrderItemRow{
			{ID: "i3", OrderID: "o2", ProductID: "p2", ProductName: "Café", Quantity: 1, PriceAtPurchase: 120, TaxRateAtPurchase: 1000},
		},
	}
}

// aiOrderThree was paid in cash at the terrace: two coffees of 5 €.
func aiOrderThree() domain.OrderRow {
	table := "t2"
	return domain.OrderRow{
		ID: "o3", EstablishmentID: "e1", TableID: &table, Status: domain.OrderClosed, TotalAmount: 1000,
		AmountPaidCash: 1100, PaymentMethod: domain.PaymentCash, CreatedAt: aiOrderTime, UpdatedAt: aiOrderTime,
		Items: []domain.OrderItemRow{
			{ID: "i4", OrderID: "o3", ProductID: "p2", ProductName: "Café", Quantity: 2, PriceAtPurchase: 500, TaxRateAtPurchase: 1000, PaidQuantity: 2, ServedQuantity: 2},
		},
	}
}

// toolContext is the context of a turn of userID, with the snapshot the service reads.
func (f *aiFixture) toolContext(t *testing.T, userID string) *aiToolContext {
	t.Helper()
	ctx := context.Background()

	modules, err := f.service.security.EnabledModules(ctx, "e1")
	if err != nil {
		t.Fatal(err)
	}
	tc, err := f.service.snapshot(ctx, "e1", modules)
	if err != nil {
		t.Fatal(err)
	}

	tc.user = domain.User{ID: userID, Name: "Ana", Language: "es"}
	role, _ := f.service.security.UserRole(ctx, userID)
	tc.isAdmin = role == domain.RoleAdmin
	if membership, _ := f.service.security.Membership(ctx, userID, "e1"); membership != nil {
		tc.role = domain.AsEstablishmentRole(membership.Role)
	}
	return tc
}

// run runs a tool of the turn with input, as the gateway would, and returns its answer as
// JSON.
func (f *aiFixture) run(t *testing.T, tc *aiToolContext, name, input string) string {
	t.Helper()

	for _, tool := range f.service.aiTools(tc) {
		if tool.Name == name {
			result, err := aiJSON(tool.Run(context.Background(), json.RawMessage(input)))
			if err != nil {
				t.Fatal(err)
			}
			return result
		}
	}
	t.Fatalf("there is no tool %s", name)
	return ""
}

// aiJSON writes v like JSON.stringify.
func aiJSON(v any) (string, error) {
	var buf strings.Builder
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(v); err != nil {
		return "", err
	}
	return strings.TrimSuffix(buf.String(), "\n"), nil
}
