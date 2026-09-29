package httpapi

import (
	"net/http"

	"coaster-api/internal/adapter/handler/middleware"
	"coaster-api/internal/adapter/handler/respond"
	"coaster-api/internal/core/domain"
	"coaster-api/internal/core/ports"
)

type EstablishmentMemberHandler struct {
	members ports.EstablishmentMemberService
}

func NewEstablishmentMemberHandler(members ports.EstablishmentMemberService) *EstablishmentMemberHandler {
	return &EstablishmentMemberHandler{members: members}
}

func (h *EstablishmentMemberHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	handle(mux, guard, "GET /establishments/{establishmentId}/members/me", h.me,
		middleware.Permissions())
	handle(mux, guard, "GET /establishments/{establishmentId}/members", h.list,
		middleware.Permissions(domain.PermissionViewMembers))
	handle(mux, guard, "POST /establishments/{establishmentId}/members", h.invite,
		middleware.Permissions(domain.PermissionInviteMember))
	handle(mux, guard, "POST /establishments/{establishmentId}/members/{memberId}/invite", h.resendInvite,
		middleware.Permissions(domain.PermissionInviteMember))
	handle(mux, guard, "PATCH /establishments/{establishmentId}/members/{memberId}", h.updateRole,
		middleware.Permissions(domain.PermissionUpdateMemberRole))
	handle(mux, guard, "DELETE /establishments/{establishmentId}/members/{memberId}", h.remove,
		middleware.Permissions(domain.PermissionRemoveMember))
}

type inviteMemberRequest struct {
	Email string                    `json:"email" validate:"required,email" msg:"required=REQUIRED,email=INVALID_EMAIL,type=INVALID_EMAIL"`
	Role  *domain.EstablishmentRole `json:"role" validate:"omitnil,oneof=OWNER MANAGER STAFF" msg:"oneof=INVALID_ROLE,type=INVALID_ROLE"`
}

type updateMemberRoleRequest struct {
	Role domain.EstablishmentRole `json:"role" validate:"required,oneof=OWNER MANAGER STAFF" msg:"required=INVALID_ROLE,oneof=INVALID_ROLE,type=INVALID_ROLE"`
}

type adminStandInResponse struct {
	ID              string                   `json:"id"`
	UserID          string                   `json:"userId"`
	EstablishmentID string                   `json:"establishmentId"`
	Role            domain.EstablishmentRole `json:"role"`
	Active          bool                     `json:"active"`
	Pending         bool                     `json:"pending"`
	UserName        string                   `json:"userName"`
	UserEmail       string                   `json:"userEmail"`
	UserImage       string                   `json:"userImage"`
}

func (h *EstablishmentMemberHandler) me(w http.ResponseWriter, r *http.Request) {
	caller := middleware.CurrentUser(r.Context())

	member, err := h.members.Me(r.Context(), r.PathValue("establishmentId"), *caller)
	if err != nil {
		writeError(w, err)
		return
	}

	if member.StandIn {
		respond.JSON(w, http.StatusOK, adminStandInResponse{
			ID:              member.ID,
			UserID:          member.UserID,
			EstablishmentID: member.EstablishmentID,
			Role:            member.Role,
			Active:          member.Active,
			Pending:         member.Pending,
			UserName:        member.UserName,
			UserEmail:       member.UserEmail,
			UserImage:       member.UserImage,
		})
		return
	}

	respond.JSON(w, http.StatusOK, member)
}

func (h *EstablishmentMemberHandler) list(w http.ResponseWriter, r *http.Request) {
	members, err := h.members.List(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, members)
}

func (h *EstablishmentMemberHandler) invite(w http.ResponseWriter, r *http.Request) {
	var input inviteMemberRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	caller := middleware.CurrentUser(r.Context())

	if err := h.members.Invite(r.Context(), r.PathValue("establishmentId"), *caller, input.Email, input.Role); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *EstablishmentMemberHandler) resendInvite(w http.ResponseWriter, r *http.Request) {
	caller := middleware.CurrentUser(r.Context())

	err := h.members.ResendInvite(r.Context(), r.PathValue("establishmentId"), r.PathValue("memberId"), *caller)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *EstablishmentMemberHandler) updateRole(w http.ResponseWriter, r *http.Request) {
	var input updateMemberRoleRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	caller := middleware.CurrentUser(r.Context())

	err := h.members.UpdateRole(r.Context(), r.PathValue("establishmentId"), r.PathValue("memberId"), input.Role, *caller)
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *EstablishmentMemberHandler) remove(w http.ResponseWriter, r *http.Request) {
	if err := h.members.Remove(r.Context(), r.PathValue("establishmentId"), r.PathValue("memberId")); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}
