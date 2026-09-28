package service

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"sync"
	"time"
	"uuid"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

var errDatabaseDown = errors.New("database down")

type fakeCache struct {
	values    map[string][]byte
	forgotten []string
}

func newFakeCache() *fakeCache {
	return &fakeCache{values: make(map[string][]byte)}
}

func (c *fakeCache) Get(_ context.Context, key string, dest any) bool {
	raw, ok := c.values[key]
	if !ok {
		return false
	}
	return json.Unmarshal(raw, dest) == nil
}

func (c *fakeCache) Set(_ context.Context, key string, value any) {
	raw, _ := json.Marshal(value)
	c.values[key] = raw
}

func (c *fakeCache) Forget(_ context.Context, keys ...string) {
	for _, key := range keys {
		delete(c.values, key)
		c.forgotten = append(c.forgotten, key)
	}
}

type fakePublisher struct {
	mu     sync.Mutex
	events []domain.AuthEventOccurred
}

func (p *fakePublisher) Publish(_ context.Context, event ports.Event) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if occurred, ok := event.(domain.AuthEventOccurred); ok {
		p.events = append(p.events, occurred)
	}
}

func (p *fakePublisher) ofType(eventType domain.AuthEventType) []domain.AuthEventOccurred {
	var found []domain.AuthEventOccurred
	for _, event := range p.events {
		if event.Type == eventType {
			found = append(found, event)
		}
	}
	return found
}

type fakeUsers struct {
	byID        map[string]*domain.AuthUser
	betaTesters []string
	lookups     int
	fail        bool
}

func newFakeUsers(users ...domain.AuthUser) *fakeUsers {
	fake := &fakeUsers{byID: make(map[string]*domain.AuthUser)}
	for _, user := range users {
		fake.byID[user.ID] = &user
	}
	return fake
}

func (f *fakeUsers) FindByID(_ context.Context, id string) (*domain.AuthUser, error) {
	f.lookups++
	if f.fail {
		return nil, errDatabaseDown
	}
	user, ok := f.byID[id]
	if !ok {
		return nil, nil
	}
	copied := *user
	return &copied, nil
}

func (f *fakeUsers) FindByEmail(_ context.Context, email string) (*domain.AuthUser, error) {
	email = normalizeEmail(email)
	for _, user := range f.byID {
		if user.Email == email {
			copied := *user
			return &copied, nil
		}
	}
	return nil, nil
}

func (f *fakeUsers) Create(_ context.Context, input domain.NewUser) (*domain.AuthUser, error) {
	user := &domain.AuthUser{
		ID:              uuid.NewV4().String(),
		Email:           input.Email,
		Name:            input.Name,
		PhotoURL:        input.PhotoURL,
		PasswordHash:    input.PasswordHash,
		EmailVerifiedAt: input.EmailVerifiedAt,
		Active:          true,
		Role:            domain.RoleUser,
		Language:        input.Language,
	}
	if user.Language == nil {
		spanish := "es"
		user.Language = &spanish
	}
	f.byID[user.ID] = user
	copied := *user
	return &copied, nil
}

func (f *fakeUsers) SetPassword(_ context.Context, userID, passwordHash string, markEmailVerified bool) error {
	user := f.byID[userID]
	user.PasswordHash = &passwordHash
	if markEmailVerified && user.EmailVerifiedAt == nil {
		now := time.Now()
		user.EmailVerifiedAt = &now
	}
	return nil
}

func (f *fakeUsers) MarkEmailVerified(_ context.Context, userID string) error {
	user := f.byID[userID]
	if user.EmailVerifiedAt == nil {
		now := time.Now()
		user.EmailVerifiedAt = &now
	}
	return nil
}

func (f *fakeUsers) ClaimForGoogle(_ context.Context, userID string, dropPassword bool, photoURL *string) error {
	user := f.byID[userID]
	if user.EmailVerifiedAt == nil {
		now := time.Now()
		user.EmailVerifiedAt = &now
	}
	if dropPassword {
		user.PasswordHash = nil
	}
	if user.PhotoURL == nil {
		user.PhotoURL = photoURL
	}
	return nil
}

func (f *fakeUsers) IsBetaTester(_ context.Context, email string) (bool, error) {
	return slices.Contains(f.betaTesters, email), nil
}

type fakeSessions struct {
	rows          []*domain.AuthSession
	prunedFor     []string
	revokedFamily []string
}

func (f *fakeSessions) add(session domain.AuthSession) *domain.AuthSession {
	if session.ID == "" {
		session.ID = uuid.NewV4().String()
	}
	if session.ExpiresAt.IsZero() {
		session.ExpiresAt = time.Now().Add(time.Hour)
	}
	if session.CreatedAt.IsZero() {
		session.CreatedAt = time.Now()
	}
	if session.LastUsedAt.IsZero() {
		session.LastUsedAt = session.CreatedAt
	}
	f.rows = append(f.rows, &session)
	return &session
}

func (f *fakeSessions) Create(_ context.Context, input domain.NewAuthSession) (*domain.AuthSession, error) {
	created := f.add(domain.AuthSession{
		UserID:    input.UserID,
		TokenHash: input.TokenHash,
		FamilyID:  input.FamilyID,
		ExpiresAt: input.ExpiresAt,
	})
	copied := *created
	return &copied, nil
}

func (f *fakeSessions) FindByTokenHash(_ context.Context, tokenHash string) (*domain.AuthSession, error) {
	for _, row := range f.rows {
		if row.TokenHash == tokenHash {
			copied := *row
			return &copied, nil
		}
	}
	return nil, nil
}

func (f *fakeSessions) ListLiveOf(_ context.Context, userID string) ([]domain.AuthSession, error) {
	var live []domain.AuthSession
	for _, row := range f.rows {
		if row.UserID == userID && row.RevokedAt == nil && row.ExpiresAt.After(time.Now()) {
			live = append(live, *row)
		}
	}
	slices.SortStableFunc(live, func(a, b domain.AuthSession) int { return b.LastUsedAt.Compare(a.LastUsedAt) })
	return live, nil
}

func (f *fakeSessions) FindOwnedBy(_ context.Context, id, userID string) (*domain.AuthSession, error) {
	for _, row := range f.rows {
		if row.ID == id && row.UserID == userID {
			copied := *row
			return &copied, nil
		}
	}
	return nil, nil
}

func (f *fakeSessions) Rotate(ctx context.Context, currentID string, next domain.NewAuthSession) (*domain.AuthSession, error) {
	now := time.Now()
	for _, row := range f.rows {
		if row.ID == currentID {
			row.RotatedAt = &now
		}
	}
	return f.Create(ctx, next)
}

func (f *fakeSessions) revokeWhere(match func(*domain.AuthSession) bool) {
	now := time.Now()
	for _, row := range f.rows {
		if row.RevokedAt == nil && match(row) {
			row.RevokedAt = &now
		}
	}
}

func (f *fakeSessions) RevokeFamily(_ context.Context, familyID string) error {
	f.revokedFamily = append(f.revokedFamily, familyID)
	f.revokeWhere(func(row *domain.AuthSession) bool { return row.FamilyID == familyID })
	return nil
}

func (f *fakeSessions) RevokeEveryOtherSessionOf(_ context.Context, userID, keepID string) error {
	f.revokeWhere(func(row *domain.AuthSession) bool { return row.UserID == userID && row.ID != keepID })
	return nil
}

func (f *fakeSessions) RevokeEveryOtherFamilyOf(_ context.Context, userID, keepFamilyID string) error {
	f.revokeWhere(func(row *domain.AuthSession) bool { return row.UserID == userID && row.FamilyID != keepFamilyID })
	return nil
}

func (f *fakeSessions) RevokeEverySessionOf(_ context.Context, userID string) error {
	f.revokeWhere(func(row *domain.AuthSession) bool { return row.UserID == userID })
	return nil
}

func (f *fakeSessions) DeleteExpiredOf(_ context.Context, userID string) error {
	f.prunedFor = append(f.prunedFor, userID)
	return nil
}

func (f *fakeSessions) revoked(id string) bool {
	for _, row := range f.rows {
		if row.ID == id {
			return row.RevokedAt != nil
		}
	}
	return false
}

type fakeTokens struct {
	users  *fakeUsers
	rows   []*fakeTokenRow
	issued []string
}

type fakeTokenRow struct {
	id, userID, hash string
	purpose          domain.AuthTokenPurpose
	expiresAt        time.Time
	used             bool
}

func (f *fakeTokens) Issue(_ context.Context, userID string, purpose domain.AuthTokenPurpose) (string, error) {
	token := domain.NewAuthToken()
	f.add(userID, token, purpose, time.Now().Add(time.Hour))
	f.issued = append(f.issued, token)
	return token, nil
}

func (f *fakeTokens) add(userID, token string, purpose domain.AuthTokenPurpose, expiresAt time.Time) *fakeTokenRow {
	row := &fakeTokenRow{id: uuid.NewV4().String(), userID: userID, hash: domain.HashAuthToken(token), purpose: purpose, expiresAt: expiresAt}
	f.rows = append(f.rows, row)
	return row
}

func (f *fakeTokens) FindUsable(ctx context.Context, token string, purpose domain.AuthTokenPurpose) (*domain.AuthToken, error) {
	for _, row := range f.rows {
		if row.hash != domain.HashAuthToken(token) {
			continue
		}
		if row.purpose != purpose || row.used || !row.expiresAt.After(time.Now()) {
			return nil, nil
		}
		user, _ := f.users.FindByID(ctx, row.userID)
		return &domain.AuthToken{ID: row.id, UserID: row.userID, Purpose: row.purpose, ExpiresAt: row.expiresAt, User: *user}, nil
	}
	return nil, nil
}

func (f *fakeTokens) Spend(_ context.Context, id string) (bool, error) {
	for _, row := range f.rows {
		if row.id == id && !row.used {
			row.used = true
			return true, nil
		}
	}
	return false, nil
}

type fakeIdentities struct {
	users   *fakeUsers
	rows    map[string][]domain.AuthIdentity
	touched []string
}

func newFakeIdentities(users *fakeUsers) *fakeIdentities {
	return &fakeIdentities{users: users, rows: make(map[string][]domain.AuthIdentity)}
}

func (f *fakeIdentities) FindUserBySubject(ctx context.Context, provider domain.AuthProvider, subject string) (*domain.AuthUser, error) {
	for userID, identities := range f.rows {
		for _, identity := range identities {
			if identity.Provider == provider && identity.Subject == subject {
				return f.users.FindByID(ctx, userID)
			}
		}
	}
	return nil, nil
}

func (f *fakeIdentities) Touch(_ context.Context, _ domain.AuthProvider, subject string) error {
	f.touched = append(f.touched, subject)
	return nil
}

func (f *fakeIdentities) Link(_ context.Context, userID string, identity domain.NewIdentity) error {
	f.rows[userID] = append(f.rows[userID], domain.AuthIdentity{Provider: identity.Provider, Subject: identity.Subject, Email: identity.Email, CreatedAt: time.Now()})
	return nil
}

func (f *fakeIdentities) ListOf(_ context.Context, userID string) ([]domain.AuthIdentity, error) {
	return f.rows[userID], nil
}

func (f *fakeIdentities) Delete(_ context.Context, userID string, provider domain.AuthProvider) error {
	f.rows[userID] = slices.DeleteFunc(f.rows[userID], func(identity domain.AuthIdentity) bool { return identity.Provider == provider })
	return nil
}

type fakeMailer struct {
	sent []sentEmail
	fail bool
}

type sentEmail struct {
	kind, to, token string
}

func (m *fakeMailer) send(kind, to, token string) error {
	if m.fail {
		return errors.New("resend refused it")
	}
	m.sent = append(m.sent, sentEmail{kind: kind, to: to, token: token})
	return nil
}

func (m *fakeMailer) SendInvite(_ context.Context, to string, invite domain.InviteEmail, _ string) error {
	return m.send("invite", to, invite.Token)
}

func (m *fakeMailer) SendEmailVerification(_ context.Context, to, _, token, _ string) error {
	return m.send("verifyEmail", to, token)
}

func (m *fakeMailer) SendPasswordReset(_ context.Context, to, _, token, _ string) error {
	return m.send("resetPassword", to, token)
}

func (m *fakeMailer) SendPasswordChanged(_ context.Context, to, _, _ string) error {
	return m.send("passwordChanged", to, "")
}

func (m *fakeMailer) lastOf(kind string) *sentEmail {
	for i := len(m.sent) - 1; i >= 0; i-- {
		if m.sent[i].kind == kind {
			return &m.sent[i]
		}
	}
	return nil
}

type fakeGoogle struct {
	clientID string
	identity *domain.GoogleIdentity
}

func (g *fakeGoogle) Configured() bool { return g.clientID != "" }

func (g *fakeGoogle) Verify(context.Context, string) *domain.GoogleIdentity { return g.identity }

type fakePwned struct {
	leaked []string
}

func (p *fakePwned) Compromised(_ context.Context, password string) bool {
	return slices.Contains(p.leaked, password)
}

type fakeAttempts struct {
	failures  map[string]int
	lockedFor int
}

func (a *fakeAttempts) LockedFor(context.Context, string) int { return a.lockedFor }

func (a *fakeAttempts) Remember(_ context.Context, email string) {
	if a.failures == nil {
		a.failures = make(map[string]int)
	}
	a.failures[email]++
}

func (a *fakeAttempts) Forget(_ context.Context, email string) {
	delete(a.failures, email)
}

type fakeAuthEvents struct {
	recorded []domain.AuthEventOccurred
	fail     bool
}

func (f *fakeAuthEvents) Record(_ context.Context, event domain.AuthEventOccurred) error {
	if f.fail {
		return errDatabaseDown
	}
	f.recorded = append(f.recorded, event)
	return nil
}

func (f *fakeAuthEvents) FindRecentOf(context.Context, string, int) ([]domain.AuthEventRecord, error) {
	return nil, nil
}

type fakeSecurity struct {
	roles        map[string]domain.Role
	memberships  map[string]*domain.Membership
	modules      map[string][]domain.EstablishmentModule
	subscription map[string]*domain.SubscriptionState
	calls        int
}

func (f *fakeSecurity) UserRole(_ context.Context, userID string) (domain.Role, error) {
	f.calls++
	return f.roles[userID], nil
}

func (f *fakeSecurity) Membership(_ context.Context, userID, establishmentID string) (*domain.Membership, error) {
	f.calls++
	return f.memberships[establishmentID+"/"+userID], nil
}

func (f *fakeSecurity) EnabledModules(_ context.Context, establishmentID string) ([]domain.EstablishmentModule, bool, error) {
	f.calls++
	modules, found := f.modules[establishmentID]
	return modules, found, nil
}

func (f *fakeSecurity) SubscriptionState(_ context.Context, establishmentID string) (*domain.SubscriptionState, error) {
	f.calls++
	return f.subscription[establishmentID], nil
}

type fakeRefresher struct {
	state *domain.SubscriptionState
	err   error
	calls int
}

func (r *fakeRefresher) Refresh(context.Context, string) (*domain.SubscriptionState, error) {
	r.calls++
	return r.state, r.err
}
