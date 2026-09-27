package repository

import (
	"context"
	_ "embed"
	"errors"
	"time"
	"uuid"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api-go/internal/core/domain"
)

var (
	//go:embed queries/establishment_member/list_active.sql
	listActiveMembersQuery string
	//go:embed queries/establishment_member/find_by_user.sql
	findMemberByUserQuery string
	//go:embed queries/establishment_member/users_of.sql
	memberUsersQuery string
	//go:embed queries/establishment_member/find_invite.sql
	findMemberInviteQuery string
	//go:embed queries/establishment_member/has_member_with_email.sql
	hasMemberWithEmailQuery string
	//go:embed queries/establishment_member/upsert_invited_user.sql
	upsertInvitedUserQuery string
	//go:embed queries/establishment_member/upsert.sql
	upsertMemberQuery string
	//go:embed queries/establishment_member/update_role.sql
	updateMemberRoleQuery string
	//go:embed queries/establishment_member/remove.sql
	removeMemberQuery string
	//go:embed queries/establishment_member/establishment_name.sql
	memberEstablishmentNameQuery string
)

// EstablishmentMemberRepository keeps the "EstablishmentMember" rows and the users they
// point to.
type EstablishmentMemberRepository struct {
	pool *pgxpool.Pool
}

func NewEstablishmentMemberRepository(pool *pgxpool.Pool) *EstablishmentMemberRepository {
	return &EstablishmentMemberRepository{pool: pool}
}

func (r *EstablishmentMemberRepository) ListActive(ctx context.Context, establishmentID string) ([]domain.EstablishmentMember, error) {
	rows, err := r.pool.Query(ctx, listActiveMembersQuery, establishmentID)
	if err != nil {
		return nil, err
	}

	members, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.EstablishmentMember, error) {
		return scanEstablishmentMember(row)
	})
	if err != nil {
		return nil, err
	}

	if err := r.addUsers(ctx, members); err != nil {
		return nil, err
	}

	return members, nil
}

func (r *EstablishmentMemberRepository) FindByUser(ctx context.Context, establishmentID, userID string) (*domain.EstablishmentMember, error) {
	member, err := scanEstablishmentMember(r.pool.QueryRow(ctx, findMemberByUserQuery, userID, establishmentID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	members := []domain.EstablishmentMember{member}
	if err := r.addUsers(ctx, members); err != nil {
		return nil, err
	}

	return &members[0], nil
}

// scanEstablishmentMember reads a row of list_active.sql or find_by_user.sql. The user's
// fields are filled later by addUsers.
func scanEstablishmentMember(row pgx.Row) (domain.EstablishmentMember, error) {
	var member domain.EstablishmentMember
	var role string

	err := row.Scan(&member.ID, &member.UserID, &member.EstablishmentID, &role, &member.Active)
	member.Role = domain.AsEstablishmentRole(role)

	return member, err
}

// establishmentMemberUser is what a member shows of their user.
type establishmentMemberUser struct {
	name              string
	email             string
	photoURL          *string
	passwordUpdatedAt *time.Time
	identities        int
}

// addUsers reads the users of the members in a second query and fills their name, photo,
// email and whether their invitation is still pending.
func (r *EstablishmentMemberRepository) addUsers(ctx context.Context, members []domain.EstablishmentMember) error {
	if len(members) == 0 {
		return nil
	}

	userIDs := make([]string, len(members))
	for i, member := range members {
		userIDs[i] = member.UserID
	}

	rows, err := r.pool.Query(ctx, memberUsersQuery, userIDs)
	if err != nil {
		return err
	}
	defer rows.Close()

	users := make(map[string]establishmentMemberUser, len(members))
	for rows.Next() {
		var id string
		var user establishmentMemberUser
		if err := rows.Scan(&id, &user.name, &user.email, &user.photoURL, &user.passwordUpdatedAt, &user.identities); err != nil {
			return err
		}
		users[id] = user
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for i := range members {
		user := users[members[i].UserID]

		members[i].UserName = user.name
		members[i].UserEmail = user.email
		members[i].Pending = domain.IsInvitePending(user.passwordUpdatedAt, user.identities)
		if user.photoURL != nil {
			members[i].UserImage = *user.photoURL
		}
	}

	return nil
}

func (r *EstablishmentMemberRepository) FindInvite(ctx context.Context, establishmentID, memberID string) (*domain.MemberInvite, error) {
	var invite domain.MemberInvite
	var passwordUpdatedAt *time.Time
	var identities int

	err := r.pool.QueryRow(ctx, findMemberInviteQuery, memberID, establishmentID).Scan(
		&invite.ID, &invite.UserID, &invite.UserEmail, &invite.UserActive, &passwordUpdatedAt, &identities, &invite.EstablishmentName,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	invite.Pending = domain.IsInvitePending(passwordUpdatedAt, identities)

	return &invite, nil
}

func (r *EstablishmentMemberRepository) HasMemberWithEmail(ctx context.Context, establishmentID, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, hasMemberWithEmailQuery, establishmentID, email).Scan(&exists)
	return exists, err
}

func (r *EstablishmentMemberRepository) Invite(ctx context.Context, invitation domain.MemberInvitation) (*domain.InvitedMember, error) {
	savedAt := now()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	newUserID := uuid.NewV4().String()
	var userID string
	err = tx.QueryRow(ctx, upsertInvitedUserQuery, newUserID, invitation.Email, invitation.UserName, savedAt).Scan(&userID)
	if err != nil {
		return nil, err
	}

	if userID == newUserID {
		_, err = tx.Exec(ctx, insertUserPreferencesQuery, uuid.NewV4().String(), userID, nil, savedAt)
		if err != nil {
			return nil, err
		}
	}

	var role *string
	if invitation.Role != nil {
		value := string(*invitation.Role)
		role = &value
	}

	var memberID string
	err = tx.QueryRow(ctx, upsertMemberQuery, uuid.NewV4().String(), userID, invitation.EstablishmentID, role, savedAt).Scan(&memberID)
	if err != nil {
		return nil, err
	}

	var establishmentName string
	if err := tx.QueryRow(ctx, memberEstablishmentNameQuery, invitation.EstablishmentID).Scan(&establishmentName); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &domain.InvitedMember{
		ID:                memberID,
		UserID:            userID,
		UserEmail:         invitation.Email,
		UserName:          invitation.UserName,
		EstablishmentName: establishmentName,
	}, nil
}

func (r *EstablishmentMemberRepository) UpdateRole(ctx context.Context, establishmentID, memberID string, role domain.EstablishmentRole) (bool, error) {
	tag, err := r.pool.Exec(ctx, updateMemberRoleQuery, memberID, establishmentID, string(role), now())
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() > 0, nil
}

func (r *EstablishmentMemberRepository) Remove(ctx context.Context, establishmentID, memberID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, removeMemberQuery, memberID, establishmentID, now())
	if err != nil {
		return false, err
	}

	return tag.RowsAffected() > 0, nil
}

func (r *EstablishmentMemberRepository) EstablishmentName(ctx context.Context, establishmentID string) (*string, error) {
	var name string

	err := r.pool.QueryRow(ctx, memberEstablishmentNameQuery, establishmentID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &name, nil
}
