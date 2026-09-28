package service

import (
	"context"
	"strings"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

type BetaTesterService struct {
	testers     ports.BetaTesterRepository
	events      ports.EventPublisher
	allowlistOn bool
}

func NewBetaTesterService(testers ports.BetaTesterRepository, events ports.EventPublisher, allowlistOn bool) *BetaTesterService {
	return &BetaTesterService{testers: testers, events: events, allowlistOn: allowlistOn}
}

func (s *BetaTesterService) List(ctx context.Context, search string, page domain.PageRequest) (domain.AdminBetaTesters, error) {
	testers, total, err := s.testers.List(ctx, strings.TrimSpace(search), page)
	if err != nil {
		return domain.AdminBetaTesters{}, err
	}

	emails := make([]string, len(testers))
	for i, tester := range testers {
		emails[i] = tester.Email
	}

	signUps, err := s.testers.FindSignUps(ctx, emails)
	if err != nil {
		return domain.AdminBetaTesters{}, err
	}

	byEmail := make(map[string]domain.BetaSignUp, len(signUps))
	for _, signUp := range signUps {
		byEmail[signUp.Email] = signUp
	}

	for i := range testers {
		if signUp, ok := byEmail[testers[i].Email]; ok {
			userID := signUp.UserID
			signedUpAt := domain.NewTime(signUp.CreatedAt)
			testers[i].UserID = &userID
			testers[i].SignedUpAt = &signedUpAt
		}
	}

	return domain.AdminBetaTesters{Paginated: domain.NewPage(testers, total, page), Enforcing: s.allowlistOn}, nil
}

func (s *BetaTesterService) Add(ctx context.Context, actorID, email string, note *string) error {
	email = normalizeEmail(email)

	existing, err := s.testers.FindByEmail(ctx, email)
	if err != nil {
		return err
	}
	if existing != nil {
		return domain.Conflict(domain.CodeBetaTesterAlreadyExists)
	}

	note = adminNote(note)
	id, err := s.testers.Add(ctx, email, note, actorID)
	if err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AdminAction{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditBetaTesterAdded,
		TargetType:  domain.AuditTargetBetaTester,
		TargetID:    id,
		TargetLabel: &email,
		Reason:      note,
	}})
	return nil
}

func (s *BetaTesterService) Remove(ctx context.Context, actorID, betaTesterID string) error {
	tester, err := s.testers.FindByID(ctx, betaTesterID)
	if err != nil {
		return err
	}
	if tester == nil {
		return domain.NotFound(domain.CodeBetaTesterNotFound)
	}

	if err := s.testers.Remove(ctx, betaTesterID); err != nil {
		return err
	}

	s.events.Publish(ctx, domain.AdminAction{Entry: domain.AdminAuditEntry{
		ActorID:     actorID,
		Action:      domain.AuditBetaTesterRemoved,
		TargetType:  domain.AuditTargetBetaTester,
		TargetID:    betaTesterID,
		TargetLabel: &tester.Email,
	}})
	return nil
}
