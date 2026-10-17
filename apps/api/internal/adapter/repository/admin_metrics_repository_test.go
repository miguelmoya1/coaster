package repository

import (
	"context"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestAdminMetricsRepository(t *testing.T) {
	resetDB(t)
	ctx := context.Background()
	metrics := NewAdminMetricsRepository(testPool)

	insertAdminUser(t, "admin", "Miguel", "miguel@example.com", "ADMIN", true, daysBefore(60))
	insertAdminUser(t, "old-admin", "Olga", "olga@example.com", "ADMIN", false, daysBefore(40))
	insertAdminUser(t, "ana", "Ana", "ana@bar.com", "USER", true, daysBefore(10))

	insertAdminEstablishment(t, "manual", "Manual", daysBefore(3))
	insertAdminEstablishment(t, "stripe", "Stripe", daysBefore(10))
	insertAdminEstablishment(t, "both", "Both", daysBefore(40))
	insertAdminEstablishment(t, "trial", "Trial", daysBefore(40))
	insertAdminEstablishment(t, "lapsed", "Lapsed", daysBefore(40))
	insertAdminEstablishment(t, "free", "Free", daysBefore(40))

	future := adminTestNow.Add(24 * time.Hour)
	insertAdminSubscription(t, "manual", "INACTIVE", `"manualPlan" = 'PRO'`)
	insertAdminSubscription(t, "stripe", "ACTIVE", `plan = 'PRO', "stripeSubscriptionId" = 'sub_1', "currentPeriodEnd" = $2`, future)
	insertAdminSubscription(t, "both", "CANCELED", `plan = 'PRO', "currentPeriodEnd" = $2, "manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, future)
	insertAdminSubscription(t, "trial", "TRIALING", `"trialEndsAt" = $2`, future)
	insertAdminSubscription(t, "free", "INACTIVE", `"manualPlan" = 'FREE'`)
	insertAdminSubscription(t, "lapsed", "ACTIVE", `"stripeSubscriptionId" = 'sub_2', "currentPeriodEnd" = $2, "manualPlan" = 'PRO', "manualGrantExpiresAt" = $2`, daysBefore(1))

	adminExec(t, `INSERT INTO "Order" (id, "establishmentId", status, "totalAmount", "createdAt", "updatedAt") VALUES
		('o1', 'stripe', 'CLOSED', 1000, $1, now()),
		('o2', 'manual', 'CANCELLED', 999, $1, now()),
		('o3', 'manual', 'CLOSED', 500, $2, now())`,
		daysBefore(1), daysBefore(31))

	got, err := metrics.Collect(ctx, adminTestNow, daysBefore(7), daysBefore(30))
	if err != nil {
		t.Fatal(err)
	}

	want := domain.AdminPlatformMetrics{
		Establishments: domain.AdminEstablishmentMetrics{Total: 6, CreatedLast7Days: 1, CreatedLast30Days: 2},
		Users:          domain.AdminUserMetrics{Total: 3, Active: 2, Admins: 1, CreatedLast30Days: 1},
		Subscriptions: domain.AdminSubscriptionMetrics{
			WithAccess: 4,
			Stripe:     2,
			Manual:     2,
			ByStatus:   domain.SubscriptionStatusCounts{Inactive: 2, Trialing: 1, Active: 2, Canceled: 1},
			ByPlan:     domain.SubscriptionPlanCounts{Free: 4, Pro: 2},
		},
		Activity: domain.AdminActivityMetrics{OrdersLast30Days: 2, RevenueLast30Days: 1000},
	}
	if got != want {
		t.Errorf("Collect =\n%+v\nwant\n%+v", got, want)
	}
}
