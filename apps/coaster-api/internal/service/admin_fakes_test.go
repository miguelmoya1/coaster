package service

import (
	"context"
	"slices"
	"strings"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type adminAuditFake struct {
	recorded []domain.AdminAuditEntry
	recent   []domain.AdminAuditLogEntry
	fail     bool
	asked    []string
}

func (f *adminAuditFake) Record(_ context.Context, entry domain.AdminAuditEntry) error {
	if f.fail {
		return errDatabaseDown
	}
	f.recorded = append(f.recorded, entry)
	return nil
}

func (f *adminAuditFake) List(_ context.Context, _ domain.AdminAuditFilter, _ domain.PageRequest) ([]domain.AdminAuditLogEntry, int, error) {
	return f.recent, len(f.recent), nil
}

func (f *adminAuditFake) RecentFor(_ context.Context, targetType, targetID string, limit int) ([]domain.AdminAuditLogEntry, error) {
	f.asked = append(f.asked, targetType+":"+targetID)
	return f.recent[:min(limit, len(f.recent))], nil
}

type betaTesterFake struct {
	testers  []domain.BetaTester
	accounts []domain.BetaSignUp
	added    []string
}

func (f *betaTesterFake) List(_ context.Context, search string, _ domain.PageRequest) ([]domain.BetaTester, int, error) {
	var found []domain.BetaTester
	for _, tester := range f.testers {
		if search == "" || strings.Contains(tester.Email, search) {
			found = append(found, tester)
		}
	}
	return found, len(found), nil
}

func (f *betaTesterFake) FindSignUps(_ context.Context, emails []string) ([]domain.BetaSignUp, error) {
	var found []domain.BetaSignUp
	for _, account := range f.accounts {
		if slices.Contains(emails, account.Email) {
			found = append(found, account)
		}
	}
	return found, nil
}

func (f *betaTesterFake) find(match func(domain.BetaTester) bool) *domain.BetaTester {
	for _, tester := range f.testers {
		if match(tester) {
			return &tester
		}
	}
	return nil
}

func (f *betaTesterFake) FindByID(_ context.Context, id string) (*domain.BetaTester, error) {
	return f.find(func(t domain.BetaTester) bool { return t.ID == id }), nil
}

func (f *betaTesterFake) FindByEmail(_ context.Context, email string) (*domain.BetaTester, error) {
	return f.find(func(t domain.BetaTester) bool { return t.Email == email }), nil
}

func (f *betaTesterFake) Add(_ context.Context, email string, note *string, _ string) (string, error) {
	id := "tester-" + email
	f.testers = append(f.testers, domain.BetaTester{ID: id, Email: email, Note: note})
	f.added = append(f.added, email)
	return id, nil
}

func (f *betaTesterFake) Remove(_ context.Context, id string) error {
	f.testers = slices.DeleteFunc(f.testers, func(t domain.BetaTester) bool { return t.ID == id })
	return nil
}

type adminUserFake struct {
	users   map[string]domain.AdminUserSummary
	admins  int
	updated []domain.AdminUserChanges
}

func (f *adminUserFake) List(context.Context, domain.AdminUserFilter, domain.PageRequest) ([]domain.AdminUserSummary, int, error) {
	var users []domain.AdminUserSummary
	for _, user := range f.users {
		users = append(users, user)
	}
	return users, len(users), nil
}

func (f *adminUserFake) FindByID(_ context.Context, userID string) (*domain.AdminUserSummary, error) {
	user, ok := f.users[userID]
	if !ok {
		return nil, nil
	}
	return &user, nil
}

func (f *adminUserFake) Memberships(context.Context, string) ([]domain.AdminUserMembership, error) {
	return []domain.AdminUserMembership{{EstablishmentID: "e1", EstablishmentName: "Bar Pepe", Role: domain.EstablishmentRoleOwner}}, nil
}

func (f *adminUserFake) CountActiveAdmins(context.Context) (int, error) {
	return f.admins, nil
}

func (f *adminUserFake) Update(_ context.Context, userID string, changes domain.AdminUserChanges) error {
	f.updated = append(f.updated, changes)
	user := f.users[userID]
	if changes.Role != nil {
		user.Role = *changes.Role
	}
	if changes.Active != nil {
		user.Active = *changes.Active
	}
	f.users[userID] = user
	return nil
}

type adminEstablishmentFake struct {
	rows     map[string]domain.AdminEstablishmentRow
	settings map[string]domain.AdminEstablishmentSettings
	names    map[string]string

	renamed []string
	modules [][]domain.EstablishmentModule
	granted []domain.ManualPlanGrant
	revoked []string
	since   time.Time
}

func newAdminEstablishmentFake(rows ...domain.AdminEstablishmentRow) *adminEstablishmentFake {
	fake := &adminEstablishmentFake{
		rows:     make(map[string]domain.AdminEstablishmentRow),
		settings: make(map[string]domain.AdminEstablishmentSettings),
		names:    map[string]string{"admin": "Miguel"},
	}
	for _, row := range rows {
		fake.rows[row.ID] = row
	}
	return fake
}

func (f *adminEstablishmentFake) List(context.Context, domain.AdminEstablishmentFilter, domain.PageRequest, time.Time) ([]domain.AdminEstablishmentRow, int, error) {
	var rows []domain.AdminEstablishmentRow
	for _, row := range f.rows {
		rows = append(rows, row)
	}
	return rows, len(rows), nil
}

func (f *adminEstablishmentFake) FindByID(_ context.Context, establishmentID string) (*domain.AdminEstablishmentRow, error) {
	row, ok := f.rows[establishmentID]
	if !ok {
		return nil, nil
	}
	return &row, nil
}

func (f *adminEstablishmentFake) Members(context.Context, string) ([]domain.AdminEstablishmentMember, error) {
	return []domain.AdminEstablishmentMember{{ID: "m1", UserID: "ana", Name: "Ana", Role: domain.EstablishmentRoleOwner}}, nil
}

func (f *adminEstablishmentFake) Counters(_ context.Context, _ string, since time.Time) (domain.AdminEstablishmentCounters, error) {
	f.since = since
	return domain.AdminEstablishmentCounters{Categories: 2, Orders: 5}, nil
}

func (f *adminEstablishmentFake) Settings(_ context.Context, establishmentID string) (*domain.AdminEstablishmentSettings, error) {
	settings, ok := f.settings[establishmentID]
	if !ok {
		return nil, nil
	}
	return &settings, nil
}

func (f *adminEstablishmentFake) UserName(_ context.Context, userID string) (*string, error) {
	name, ok := f.names[userID]
	if !ok {
		return nil, nil
	}
	return &name, nil
}

func (f *adminEstablishmentFake) Rename(_ context.Context, establishmentID, name string) error {
	f.renamed = append(f.renamed, name)
	row := f.rows[establishmentID]
	row.Name = name
	f.rows[establishmentID] = row
	return nil
}

func (f *adminEstablishmentFake) UpdateModules(_ context.Context, establishmentID string, modules []domain.EstablishmentModule) (domain.AdminEstablishmentSettings, error) {
	f.modules = append(f.modules, modules)
	settings, ok := f.settings[establishmentID]
	if !ok {
		settings = domain.AdminEstablishmentSettings{EstablishmentID: establishmentID, Language: "es"}
	}
	settings.Modules = modules
	f.settings[establishmentID] = settings
	return settings, nil
}

func (f *adminEstablishmentFake) GrantPlan(_ context.Context, _ string, grant domain.ManualPlanGrant) error {
	f.granted = append(f.granted, grant)
	return nil
}

func (f *adminEstablishmentFake) RevokePlan(_ context.Context, establishmentID string) error {
	f.revoked = append(f.revoked, establishmentID)
	return nil
}

type adminMetricsFake struct {
	now, last7Days, last30Days time.Time
}

func (f *adminMetricsFake) Collect(_ context.Context, now, last7Days, last30Days time.Time) (domain.AdminPlatformMetrics, error) {
	f.now, f.last7Days, f.last30Days = now, last7Days, last30Days
	return domain.AdminPlatformMetrics{Users: domain.AdminUserMetrics{Total: 3}}, nil
}

func adminActionsIn(events []ports.Event) []domain.AdminAuditEntry {
	var entries []domain.AdminAuditEntry
	for _, event := range events {
		if action, ok := event.(domain.AdminAction); ok {
			entries = append(entries, action.Entry)
		}
	}
	return entries
}
