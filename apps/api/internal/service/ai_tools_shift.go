package service

import (
	"context"

	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type listShiftsInput struct {
	StartDate *string `json:"startDate,omitempty" jsonschema_description:"Start of the range as an ISO date-time, e.g. \"2026-08-06T00:00:00Z\". Defaults to all shifts."`
	EndDate   *string `json:"endDate,omitempty" jsonschema_description:"End of the range as an ISO date-time."`
}

type createShiftInput struct {
	UserID    string  `json:"userId" jsonschema_description:"The user UUID of the worker taking the shift."`
	StartTime string  `json:"startTime" jsonschema_description:"Shift start as an ISO date-time, e.g. \"2026-08-07T16:00:00Z\"."`
	EndTime   string  `json:"endTime" jsonschema_description:"Shift end as an ISO date-time, e.g. \"2026-08-07T23:00:00Z\"."`
	Notes     *string `json:"notes,omitempty" jsonschema_description:"Optional note for the shift, e.g. \"turno de cierre\"."`
}

type deleteShiftInput struct {
	ShiftID   string `json:"shiftId" jsonschema_description:"The UUID of the shift to delete. Use listShifts to find it."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the deletion in a previous turn."`
}

type requestShiftExchangeInput struct {
	ShiftID      string  `json:"shiftId" jsonschema_description:"The UUID of the shift the current user wants to give away."`
	TargetUserID *string `json:"targetUserId,omitempty" jsonschema_description:"Optional user UUID of the colleague the swap is offered to. Omit to offer it to everyone."`
}

type acceptShiftExchangeInput struct {
	ExchangeID string `json:"exchangeId" jsonschema_description:"The UUID of the exchange request to accept."`
}

type cancelShiftExchangeInput struct {
	ExchangeID string `json:"exchangeId" jsonschema_description:"The UUID of the exchange request to withdraw."`
	Confirmed  bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the withdrawal in a previous turn."`
}

type aiShift struct {
	ID        string         `json:"id"`
	Worker    string         `json:"worker"`
	UserID    string         `json:"userId"`
	StartTime domain.Instant `json:"startTime"`
	EndTime   domain.Instant `json:"endTime"`
	Notes     *string        `json:"notes,omitempty"`
}

type aiShiftExchange struct {
	ID             string                     `json:"id"`
	ShiftID        string                     `json:"shiftId"`
	Requester      string                     `json:"requester"`
	Status         domain.ShiftExchangeStatus `json:"status"`
	ShiftStartTime domain.Instant             `json:"shiftStartTime"`
	ShiftEndTime   domain.Instant             `json:"shiftEndTime"`
}

func (s *AIService) shiftTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listShifts",
			`List the scheduled shifts of the establishment within a date range, with the worker assigned to each one. Use it for "¿quién trabaja mañana?" or "¿cuándo me toca turno?".`,
			func(ctx context.Context, input listShiftsInput) domain.AIToolResult {
				var startDate, endDate string
				if input.StartDate != nil {
					startDate = *input.StartDate
				}
				if input.EndDate != nil {
					endDate = *input.EndDate
				}

				return aiQuery(tc, domain.PermissionViewShifts,
					func() ([]domain.Shift, error) { return s.shifts.List(ctx, tc.establishmentID, startDate, endDate) },
					func(shifts []domain.Shift) any {
						listed := make([]aiShift, 0, len(shifts))
						for _, shift := range shifts {
							listed = append(listed, aiShift{
								ID:        shift.ID,
								Worker:    shift.UserName,
								UserID:    shift.UserID,
								StartTime: shift.StartTime,
								EndTime:   shift.EndTime,
								Notes:     shift.Notes,
							})
						}
						return listed
					})
			}),

		newAITool("createShift",
			"Schedule a shift for a member of the establishment. Use listMembers first to resolve the worker name into a user UUID.",
			func(ctx context.Context, input createShiftInput) domain.AIToolResult {
				start, startOK := domain.ParseInstant(input.StartTime)
				end, endOK := domain.ParseInstant(input.EndTime)
				if !startOK || !endOK {
					return aiFailed(`The shift start and end must be valid ISO date-times, e.g. "2026-08-07T16:00:00Z".`)
				}
				if !end.After(start) {
					return aiFailed("The shift end must be later than its start.")
				}

				return tc.execute(domain.PermissionCreateShift, nil, func() error {
					return s.shifts.Create(ctx, tc.establishmentID, domain.CreateShiftInput{
						UserID:    input.UserID,
						StartTime: input.StartTime,
						EndTime:   input.EndTime,
						Notes:     input.Notes,
					})
				})
			}),

		newAITool("deleteShift", "Delete a scheduled shift. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input deleteShiftInput) domain.AIToolResult {
				confirmation := &aiConfirmation{summary: "delete that scheduled shift", confirmed: input.Confirmed}
				return tc.execute(domain.PermissionDeleteShift, confirmation, func() error {
					return s.shifts.Delete(ctx, tc.establishmentID, input.ShiftID)
				})
			}),

		newAITool("listShiftExchanges",
			"List the pending shift exchange requests of the establishment, so staff can see which swaps are open.",
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewExchanges,
					func() ([]domain.ShiftExchange, error) { return s.exchanges.ListPending(ctx, tc.establishmentID) },
					func(exchanges []domain.ShiftExchange) any {
						listed := make([]aiShiftExchange, 0, len(exchanges))
						for _, exchange := range exchanges {
							listed = append(listed, aiShiftExchange{
								ID:             exchange.ID,
								ShiftID:        exchange.ShiftID,
								Requester:      exchange.RequesterName,
								Status:         exchange.Status,
								ShiftStartTime: exchange.ShiftStartTime,
								ShiftEndTime:   exchange.ShiftEndTime,
							})
						}
						return listed
					})
			}),

		newAITool("requestShiftExchange",
			`Ask to swap one of the current user's own shifts, optionally targeting a specific colleague. Use it for "no puedo el sábado, ¿alguien me cambia el turno?".`,
			func(ctx context.Context, input requestShiftExchangeInput) domain.AIToolResult {
				return tc.execute(domain.PermissionCreateExchange, nil, func() error {
					return s.exchanges.Request(ctx, tc.establishmentID, input.ShiftID, tc.user.ID, domain.NilIfEmpty(input.TargetUserID))
				})
			}),

		newAITool("acceptShiftExchange",
			"Accept a pending shift exchange on behalf of the current user, taking over that shift.",
			func(ctx context.Context, input acceptShiftExchangeInput) domain.AIToolResult {
				return tc.execute(domain.PermissionAcceptExchange, nil, func() error {
					return s.exchanges.Accept(ctx, tc.establishmentID, input.ExchangeID, tc.user.ID)
				})
			}),

		newAITool("cancelShiftExchange",
			"Withdraw a pending shift exchange request. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input cancelShiftExchangeInput) domain.AIToolResult {
				confirmation := &aiConfirmation{summary: "withdraw that shift exchange request", confirmed: input.Confirmed}
				return tc.execute(domain.PermissionDeleteExchange, confirmation, func() error {
					return s.exchanges.Delete(ctx, tc.establishmentID, input.ExchangeID, tc.user.ID)
				})
			}),
	}
}
