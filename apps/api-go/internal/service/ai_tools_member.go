package service

import (
	"context"
	"regexp"

	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
)

var looksLikeEmail = regexp.MustCompile(`^[^@` + jsSpaces + `]+@[^@` + jsSpaces + `]+\.[^@` + jsSpaces + `]+$`)

const jsSpaces = `\t\n\v\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}`

type inviteMemberInput struct {
	Email     string `json:"email" jsonschema_description:"Email address of the person to invite."`
	Role      string `json:"role" jsonschema:"enum=MANAGER,enum=STAFF" jsonschema_description:"Role to grant: MANAGER can manage the menu and shifts, STAFF only works the floor."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the invite in a previous turn."`
}

type removeMemberInput struct {
	MemberID  string `json:"memberId" jsonschema_description:"The establishment member UUID (memberId, not userId) to remove. Use listMembers to find it."`
	Confirmed bool   `json:"confirmed" jsonschema_description:"Set to true only after the user has explicitly confirmed the removal in a previous turn."`
}

type aiMember struct {
	MemberID string                   `json:"memberId"`
	UserID   string                   `json:"userId"`
	Name     string                   `json:"name"`
	Email    string                   `json:"email"`
	Role     domain.EstablishmentRole `json:"role"`
	Active   bool                     `json:"active"`
}

func (s *AIService) memberTools(tc *aiToolContext) []ports.AITool {
	return []ports.AITool{
		newAITool("listMembers",
			`List the staff of the establishment with their user UUID, name, email and role. Use it to resolve a worker name into a UUID before scheduling shifts, or to answer "¿quién trabaja aquí?".`,
			func(ctx context.Context, _ aiNoInput) domain.AIToolResult {
				return aiQuery(tc, domain.PermissionViewMembers,
					func() ([]domain.EstablishmentMember, error) { return s.members.List(ctx, tc.establishmentID) },
					func(members []domain.EstablishmentMember) any {
						listed := make([]aiMember, 0, len(members))
						for _, member := range members {
							listed = append(listed, aiMember{
								MemberID: member.ID,
								UserID:   member.UserID,
								Name:     member.UserName,
								Email:    member.UserEmail,
								Role:     member.Role,
								Active:   member.Active,
							})
						}
						return listed
					})
			}),

		newAITool("inviteMember",
			"Invite somebody to join the establishment staff by email. Destructive: it sends a real email, so it requires the user to confirm first.",
			func(ctx context.Context, input inviteMemberInput) domain.AIToolResult {
				if !looksLikeEmail.MatchString(input.Email) {
					return aiFailed("That does not look like a valid email address. Ask the user to spell it out.")
				}

				role := domain.EstablishmentRole(input.Role)
				confirmation := &aiConfirmation{
					summary:   "send an invitation email to " + input.Email + " as " + input.Role,
					confirmed: input.Confirmed,
				}
				return tc.execute(domain.PermissionInviteMember, confirmation, func() error {
					return s.members.Invite(ctx, tc.establishmentID, tc.user, input.Email, &role)
				})
			}),

		newAITool("removeMember",
			"Remove a member from the establishment staff, revoking their access. Destructive: requires the user to confirm first.",
			func(ctx context.Context, input removeMemberInput) domain.AIToolResult {
				confirmation := &aiConfirmation{
					summary:   "remove that member from the establishment staff, revoking their access",
					confirmed: input.Confirmed,
				}
				return tc.execute(domain.PermissionRemoveMember, confirmation, func() error {
					return s.members.Remove(ctx, tc.establishmentID, input.MemberID)
				})
			}),
	}
}
