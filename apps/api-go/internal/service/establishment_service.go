package service

import (
	"context"
	"time"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

// EstablishmentService is the establishments module: creating one, the ones of a user and
// their settings.
type EstablishmentService struct {
	establishments ports.EstablishmentRepository
	events         ports.EventPublisher
	cache          ports.Cache
	now            func() time.Time
}

func NewEstablishmentService(establishments ports.EstablishmentRepository, events ports.EventPublisher, cache ports.Cache) *EstablishmentService {
	return &EstablishmentService{establishments: establishments, events: events, cache: cache, now: time.Now}
}

// Create is CreateEstablishmentCommand: the user becomes its OWNER, it starts a FREE trial
// and its settings take the default modules and the user's language.
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

// ListFor is GetEstablishmentsForUserQuery: the establishments where the user is an active member.
func (s *EstablishmentService) ListFor(ctx context.Context, userID string) ([]domain.Establishment, error) {
	return s.establishments.ListForMember(ctx, userID)
}

// Get is GetEstablishmentByIdQuery.
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

// Settings is GetEstablishmentSettingsQuery: the defaults when the establishment has no
// settings row.
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

// UpdateSettings is UpdateEstablishmentSettingsCommand: the modules are stored resolved and
// the establishment counts as configured from now on.
func (s *EstablishmentService) UpdateSettings(ctx context.Context, establishmentID string, changes domain.EstablishmentSettingsChanges) (domain.EstablishmentSettings, error) {
	if _, err := s.Get(ctx, establishmentID); err != nil {
		return domain.EstablishmentSettings{}, err
	}

	changes.Modules = domain.ResolveModules(changes.Modules)

	saved, err := s.establishments.SaveSettings(ctx, establishmentID, changes)
	if err != nil {
		return domain.EstablishmentSettings{}, err
	}

	s.events.Publish(ctx, domain.EstablishmentSettingsUpdated{EstablishmentID: establishmentID})

	return saved.Resolved(), nil
}

// ForgetModulesCache is ForgetModulesCacheHandler: after the settings change, the next
// request reads the modules from the database.
func (s *EstablishmentService) ForgetModulesCache(ctx context.Context, event ports.Event) {
	if updated, ok := event.(domain.EstablishmentSettingsUpdated); ok {
		s.cache.Forget(ctx, modulesCacheKey(updated.EstablishmentID))
	}
}
