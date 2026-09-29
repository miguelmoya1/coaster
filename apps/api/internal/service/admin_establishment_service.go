package service

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type AdminEstablishmentService struct {
	establishments ports.AdminEstablishmentRepository
	audit          ports.AdminAuditRepository
	events         ports.EventPublisher
	cache          ports.Cache
	now            func() time.Time
}

func NewAdminEstablishmentService(establishments ports.AdminEstablishmentRepository, audit ports.AdminAuditRepository, events ports.EventPublisher, cache ports.Cache) *AdminEstablishmentService {
	return &AdminEstablishmentService{establishments: establishments, audit: audit, events: events, cache: cache, now: time.Now}
}

type adminRenameChange struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type adminModulesChange struct {
	From []domain.EstablishmentModule `json:"from"`
	To   []domain.EstablishmentModule `json:"to"`
}

type adminPlanGrant struct {
	Plan         domain.SubscriptionPlan `json:"plan"`
	DurationDays *int                    `json:"durationDays"`
	ExpiresAt    *string                 `json:"expiresAt"`
}

type adminPlanRevoked struct {
	Plan      domain.SubscriptionPlan `json:"plan"`
	ExpiresAt *string                 `json:"expiresAt"`
}

func (s *AdminEstablishmentService) List(ctx context.Context, filter domain.AdminEstablishmentFilter, page domain.PageRequest) (domain.Paginated[domain.AdminEstablishmentSummary], error) {
	now := s.now()
	filter.Search = strings.TrimSpace(filter.Search)

	rows, total, err := s.establishments.List(ctx, filter, page, now)
	if err != nil {
		return domain.Paginated[domain.AdminEstablishmentSummary]{}, err
	}

	summaries := make([]domain.AdminEstablishmentSummary, len(rows))
	for i, row := range rows {
		summaries[i] = row.Summary(now)
	}

	return domain.NewPage(summaries, total, page), nil
}

func (s *AdminEstablishmentService) Detail(ctx context.Context, establishmentID string) (domain.AdminEstablishmentDetail, error) {
	now := s.now()

	establishment, err := s.find(ctx, establishmentID)
	if err != nil {
		return domain.AdminEstablishmentDetail{}, err
	}

	members, err := s.establishments.Members(ctx, establishmentID)
	if err != nil {
		return domain.AdminEstablishmentDetail{}, err
	}

	counters, err := s.establishments.Counters(ctx, establishmentID, now.Add(-30*adminDay))
	if err != nil {
		return domain.AdminEstablishmentDetail{}, err
	}

	activity, err := s.audit.RecentFor(ctx, domain.AuditTargetEstablishment, establishmentID, adminRecentActivity)
	if err != nil {
		return domain.AdminEstablishmentDetail{}, err
	}

	settings := domain.DefaultEstablishmentSettings(establishmentID)
	stored, err := s.establishments.Settings(ctx, establishmentID)
	if err != nil {
		return domain.AdminEstablishmentDetail{}, err
	}
	if stored != nil {
		settings = stored.Resolved()
	}

	var subscription any = domain.FreeSubscriptionView(establishmentID, now)
	if billing := establishment.Billing; billing != nil {
		var grantorName *string
		if billing.ManualGrantedByID != nil {
			grantorName, err = s.establishments.UserName(ctx, *billing.ManualGrantedByID)
			if err != nil {
				return domain.AdminEstablishmentDetail{}, err
			}
		}
		subscription = billing.AdminView(grantorName, now)
	}

	return domain.AdminEstablishmentDetail{
		Establishment:  establishment.Summary(now),
		Settings:       settings,
		Subscription:   subscription,
		Members:        members,
		Counters:       counters,
		RecentActivity: activity,
	}, nil
}

func (s *AdminEstablishmentService) Rename(ctx context.Context, actorID, establishmentID, name string) error {
	name = strings.TrimSpace(name)
	if utf8.RuneCountInString(name) < domain.EstablishmentNameMinLength {
		return domain.BadRequest(domain.CodeMinLength)
	}

	establishment, err := s.find(ctx, establishmentID)
	if err != nil {
		return err
	}

	if name == establishment.Name {
		return nil
	}

	if err := s.establishments.Rename(ctx, establishmentID, name); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AdminActionEvent{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditEstablishmentRenamed,
		TargetType:  domain.AuditTargetEstablishment,
		TargetID:    establishmentID,
		TargetLabel: &name,
		Metadata:    adminRenameChange{From: establishment.Name, To: name},
	}})
	return nil
}

func (s *AdminEstablishmentService) UpdateModules(ctx context.Context, actorID, establishmentID string, modules []domain.EstablishmentModule) (domain.EstablishmentSettings, error) {
	establishment, err := s.find(ctx, establishmentID)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}

	before, err := s.establishments.Settings(ctx, establishmentID)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}

	resolved := domain.ResolveModules(modules)
	settings, err := s.establishments.UpdateModules(ctx, establishmentID, resolved)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}

	s.cache.Forget(ctx, modulesCacheKey(establishmentID))

	var from []domain.EstablishmentModule
	if before != nil {
		from = before.Modules
	}

	s.events.Publish(ctx, domain.AdminActionEvent{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditEstablishmentModulesChanged,
		TargetType:  domain.AuditTargetEstablishment,
		TargetID:    establishmentID,
		TargetLabel: &establishment.Name,
		Metadata:    adminModulesChange{From: from, To: resolved},
	}})

	return settings.Resolved(), nil
}

func (s *AdminEstablishmentService) GrantPlan(ctx context.Context, actorID, establishmentID string, input domain.GrantPlanInput) error {
	establishment, err := s.find(ctx, establishmentID)
	if err != nil {
		return err
	}

	var expiresAt *time.Time
	var expiresAtText *string
	if input.DurationDays != nil && *input.DurationDays != 0 {
		expires := s.now().Add(time.Duration(*input.DurationDays) * adminDay)
		text := domain.FormatISO(expires)
		expiresAt, expiresAtText = &expires, &text
	}

	reason := trimmedOrNil(input.Reason)

	err = s.establishments.GrantPlan(ctx, establishmentID, domain.ManualPlanGrant{
		Plan:        input.Plan,
		ExpiresAt:   expiresAt,
		Reason:      reason,
		GrantedByID: actorID,
	})
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AdminActionEvent{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditEstablishmentPlanGranted,
		TargetType:  domain.AuditTargetEstablishment,
		TargetID:    establishmentID,
		TargetLabel: &establishment.Name,
		Reason:      reason,
		Metadata:    adminPlanGrant{Plan: input.Plan, DurationDays: input.DurationDays, ExpiresAt: expiresAtText},
	}})
	s.events.Publish(ctx, domain.SubscriptionOverriddenEvent{EstablishmentID: establishmentID})
	return nil
}

func (s *AdminEstablishmentService) RevokePlan(ctx context.Context, actorID, establishmentID string, reason *string) error {
	establishment, err := s.find(ctx, establishmentID)
	if err != nil {
		return err
	}

	billing := establishment.Billing
	if billing == nil || billing.ManualPlan == nil {
		return domain.BadRequest(domain.CodeNoManualGrant)
	}

	revoked := adminPlanRevoked{Plan: *billing.ManualPlan}
	if billing.ManualGrantExpiresAt != nil {
		text := domain.FormatISO(*billing.ManualGrantExpiresAt)
		revoked.ExpiresAt = &text
	}

	if err := s.establishments.RevokePlan(ctx, establishmentID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AdminActionEvent{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditEstablishmentPlanRevoked,
		TargetType:  domain.AuditTargetEstablishment,
		TargetID:    establishmentID,
		TargetLabel: &establishment.Name,
		Reason:      trimmedOrNil(reason),
		Metadata:    revoked,
	}})
	s.events.Publish(ctx, domain.SubscriptionOverriddenEvent{EstablishmentID: establishmentID})
	return nil
}

func (s *AdminEstablishmentService) find(ctx context.Context, establishmentID string) (*domain.AdminEstablishmentRow, error) {
	establishment, err := s.establishments.FindByID(ctx, establishmentID)
	if err != nil {
		return nil, err
	}
	if establishment == nil {
		return nil, domain.NotFound(domain.CodeEstablishmentNotFound)
	}
	return establishment, nil
}
