package e2e

import (
	"context"
	"testing"
	"time"
	"uuid"

	"coaster-api/internal/core/domain"
)

type user struct {
	id    string
	email string
	name  string
	role  string
}

var mockUser = user{id: defaultUserID, email: "test@example.com", name: "Test User", role: "USER"}

func newID() string {
	return uuid.NewV4().String()
}

func resetDatabase(t *testing.T) {
	t.Helper()

	if err := testDB.Reset(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func resetWithMockUser(t *testing.T) {
	t.Helper()

	resetDatabase(t)
	createUser(t, mockUser)
}

func createUser(t *testing.T, u user) {
	t.Helper()

	role := u.role
	if role == "" {
		role = "USER"
	}
	mustExec(t, `INSERT INTO "User" (id, email, name, role, active, "updatedAt")
		VALUES ($1, $2, $3, $4::"Role", true, CURRENT_TIMESTAMP)`, u.id, u.email, u.name, role)
}

type establishmentFixture struct {
	ownerID string
	role    domain.EstablishmentRole
	modules []domain.EstablishmentModule
}

type establishmentOption func(*establishmentFixture)

func ownedBy(userID string, role domain.EstablishmentRole) establishmentOption {
	return func(fixture *establishmentFixture) {
		fixture.ownerID = userID
		fixture.role = role
	}
}

func withoutOwner() establishmentOption {
	return func(fixture *establishmentFixture) {
		fixture.ownerID = ""
	}
}

func withModules(modules ...domain.EstablishmentModule) establishmentOption {
	return func(fixture *establishmentFixture) {
		fixture.modules = modules
	}
}

func createEstablishment(t *testing.T, name string, options ...establishmentOption) string {
	t.Helper()

	fixture := establishmentFixture{
		ownerID: mockUser.id,
		role:    domain.EstablishmentRoleOwner,
		modules: domain.DefaultEstablishmentModules,
	}
	for _, apply := range options {
		apply(&fixture)
	}

	id := newID()
	mustExec(t, `INSERT INTO "Establishment" (id, name, "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP)`, id, name)

	if fixture.ownerID != "" {
		addMember(t, id, fixture.ownerID, fixture.role)
	}

	mustExec(t, `INSERT INTO "EstablishmentSubscription" (id, "establishmentId", plan, status, "trialEndsAt", "updatedAt")
		VALUES ($1, $2, 'FREE', 'TRIALING', CURRENT_TIMESTAMP + interval '14 days', CURRENT_TIMESTAMP)`, newID(), id)

	var modules []string
	for _, module := range domain.ResolveModules(fixture.modules) {
		modules = append(modules, string(module))
	}
	mustExec(t, `INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, "updatedAt")
		VALUES ($1, $2, $3::text[]::"EstablishmentModule"[], CURRENT_TIMESTAMP)`, newID(), id, modules)

	return id
}

func addMember(t *testing.T, establishmentID, userID string, role domain.EstablishmentRole) string {
	t.Helper()

	id := newID()
	mustExec(t, `INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, "updatedAt")
		VALUES ($1, $2, $3, $4::"EstablishmentRole", CURRENT_TIMESTAMP)`, id, userID, establishmentID, string(role))
	return id
}

func mustExec(t *testing.T, sql string, args ...any) {
	t.Helper()

	if _, err := testDB.Pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func queryValue[T any](t *testing.T, sql string, args ...any) T {
	t.Helper()

	var value T
	if err := testDB.Pool.QueryRow(context.Background(), sql, args...).Scan(&value); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
	return value
}

func createCategory(t *testing.T, establishmentID, name string) string {
	t.Helper()

	id := newID()
	mustExec(t, `INSERT INTO "Category" (id, "establishmentId", name) VALUES ($1, $2, $3)`, id, establishmentID, name)
	return id
}

type product struct {
	name      string
	price     int
	stock     int
	allergens []string
}

func createProduct(t *testing.T, categoryID string, p product) string {
	t.Helper()

	id := newID()
	mustExec(t, `INSERT INTO "Product" (id, name, price, "categoryId", "currentStock", allergens, "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6::text[]::"Allergen"[], CURRENT_TIMESTAMP)`, id, p.name, p.price, categoryID, p.stock, p.allergens)
	return id
}

func createShift(t *testing.T, establishmentID, userID string, startsIn, length time.Duration, notes string) string {
	t.Helper()

	id := newID()
	mustExec(t, `INSERT INTO "Shift" (id, "startTime", "endTime", "userId", "establishmentId", notes, "updatedAt")
		VALUES ($1, CURRENT_TIMESTAMP + make_interval(secs => $2), CURRENT_TIMESTAMP + make_interval(secs => $3), $4, $5, nullif($6, ''), CURRENT_TIMESTAMP)`,
		id, startsIn.Seconds(), (startsIn + length).Seconds(), userID, establishmentID, notes)
	return id
}

func createExchange(t *testing.T, shiftID, requesterID, targetID string) string {
	t.Helper()

	id := newID()
	mustExec(t, `INSERT INTO "ShiftExchange" (id, "shiftId", "requesterId", "targetId", status) VALUES ($1, $2, $3, nullif($4, ''), 'PENDING')`,
		id, shiftID, requesterID, targetID)
	return id
}
