package service

import (
	"context"
	"time"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type EstablishmentService struct {
	establishments ports.EstablishmentRepository
	events         ports.EventPublisher
	cache          ports.Cache
	now            func() time.Time
}

func NewEstablishmentService(establishments ports.EstablishmentRepository, events ports.EventPublisher, cache ports.Cache) *EstablishmentService {
	return &EstablishmentService{establishments: establishments, events: events, cache: cache, now: time.Now}
}

func (s *EstablishmentService) Create(ctx context.Context, owner domain.User, name string) error {
	_, err := s.establishments.Create(ctx, domain.NewEstablishment{
		Name:        name,
		OwnerID:     owner.ID,
		Modules:     domain.DefaultEstablishmentModules,
		Language:    domain.AsLanguage(owner.Language),
		TrialEndsAt: s.now().Add(domain.EstablishmentTrial),
	})
	return err
}

func (s *EstablishmentService) ListFor(ctx context.Context, userID string) ([]domain.Establishment, error) {
	return s.establishments.ListForMember(ctx, userID)
}

func (s *EstablishmentService) Get(ctx context.Context, establishmentID string) (*domain.Establishment, error) {
	establishment, err := s.establishments.FindByID(ctx, establishmentID)
	if err != nil {
		return nil, err
	}
	if establishment == nil {
		return nil, domain.NotFound(domain.CodeEstablishmentNotFound)
	}
	return establishment, nil
}

func (s *EstablishmentService) Settings(ctx context.Context, establishmentID string) (domain.EstablishmentSettings, error) {
	settings, err := s.establishments.FindSettings(ctx, establishmentID)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}
	if settings == nil {
		if _, err := s.Get(ctx, establishmentID); err != nil {
			return domain.EstablishmentSettings{}, err
		}
		return domain.DefaultEstablishmentSettings(establishmentID), nil
	}

	return settings.Resolved(), nil
}

func (s *EstablishmentService) UpdateSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error) {
	if _, err := s.Get(ctx, establishmentID); err != nil {
		return domain.EstablishmentSettings{}, err
	}

	changes.Modules = domain.ResolveModules(changes.Modules)

	saved, err := s.establishments.SaveSettings(ctx, establishmentID, changes)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}

	s.events.Publish(ctx, domain.EstablishmentSettingsUpdatedEvent{EstablishmentID: establishmentID})

	return saved.Resolved(), nil
}

func (s *EstablishmentService) EventHandlers() []ports.EventHandler {
	return []ports.EventHandler{
		ports.On(s.forgetModulesCache),
	}
}

func (s *EstablishmentService) forgetModulesCache(ctx context.Context, event domain.EstablishmentSettingsUpdatedEvent) {
	s.cache.Forget(ctx, modulesCacheKey(event.EstablishmentID))
}
