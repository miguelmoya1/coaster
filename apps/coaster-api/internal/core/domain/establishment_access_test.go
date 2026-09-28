package domain

import (
	"os"
	"regexp"
	"slices"
	"testing"
)

const (
	permissionTypesPath = "../../../../../packages/common/src/constants/establishment-permissions.type.ts"
	rolePermissionsPath = "../../../../../packages/common/src/domain/permissions/establishment-permissions.ts"
)

func TestPermissionsMatchCommon(t *testing.T) {
	source, err := os.ReadFile(permissionTypesPath)
	if err != nil {
		t.Fatalf("reading %s: %v", permissionTypesPath, err)
	}

	entry := regexp.MustCompile(`(?m)^\s+[A-Z_]+: '([a-z:-]+)',`)

	var want []EstablishmentPermission
	for _, match := range entry.FindAllStringSubmatch(string(source), -1) {
		want = append(want, EstablishmentPermission(match[1]))
	}

	if len(want) == 0 {
		t.Fatal("found no permissions in establishment-permissions.type.ts")
	}
	if !slices.Equal(AllEstablishmentPermissions, want) {
		t.Errorf("AllEstablishmentPermissions does not match @coaster/common\ngot  %v\nwant %v", AllEstablishmentPermissions, want)
	}
}

func TestRolePermissionsMatchCommon(t *testing.T) {
	source, err := os.ReadFile(rolePermissionsPath)
	if err != nil {
		t.Fatalf("reading %s: %v", rolePermissionsPath, err)
	}

	tests := []struct {
		constant string
		got      []EstablishmentPermission
	}{
		{"STAFF_PERMISSIONS", staffPermissions},
		{"MANAGER_PERMISSIONS", managerPermissions},
		{"OWNER_PERMISSIONS", ownerPermissions},
	}

	for _, tt := range tests {
		t.Run(tt.constant, func(t *testing.T) {
			block := regexp.MustCompile(`(?s)const ` + tt.constant + `[^=]*= \[(.*?)\];`).FindStringSubmatch(string(source))
			if block == nil {
				t.Fatalf("found no %s", tt.constant)
			}

			var want []EstablishmentPermission
			for _, match := range regexp.MustCompile(`'([a-z:-]+)'`).FindAllStringSubmatch(block[1], -1) {
				want = append(want, EstablishmentPermission(match[1]))
			}

			if !slices.Equal(tt.got, want) {
				t.Errorf("got  %v\nwant %v", tt.got, want)
			}
		})
	}
}

func TestOwnerHoldsEveryPermission(t *testing.T) {
	for _, permission := range AllEstablishmentPermissions {
		if !HasPermission(EstablishmentRoleOwner, permission) {
			t.Errorf("owner lacks %s", permission)
		}
	}
}

func TestRolePermissions(t *testing.T) {
	tests := []struct {
		role       EstablishmentRole
		permission EstablishmentPermission
		want       bool
	}{
		{EstablishmentRoleStaff, PermissionClockIn, true},
		{EstablishmentRoleStaff, PermissionViewFinancials, false},
		{EstablishmentRoleStaff, PermissionViewTimeEntries, false},
		{EstablishmentRoleManager, PermissionViewFinancials, true},
		{EstablishmentRoleManager, PermissionManageBilling, false},
		{EstablishmentRoleManager, PermissionRemoveMember, false},
		{EstablishmentRoleOwner, PermissionManageSettings, true},
		{EstablishmentRole("GHOST"), PermissionViewDashboard, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.role)+" "+string(tt.permission), func(t *testing.T) {
			if got := HasPermission(tt.role, tt.permission); got != tt.want {
				t.Errorf("HasPermission = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAsEstablishmentRole(t *testing.T) {
	tests := map[string]EstablishmentRole{
		"OWNER":   EstablishmentRoleOwner,
		"MANAGER": EstablishmentRoleManager,
		"STAFF":   EstablishmentRoleStaff,
		"ADMIN":   EstablishmentRoleStaff,
		"":        EstablishmentRoleStaff,
	}

	for input, want := range tests {
		if got := AsEstablishmentRole(input); got != want {
			t.Errorf("AsEstablishmentRole(%q) = %s, want %s", input, got, want)
		}
	}
}

func TestResolveModules(t *testing.T) {
	tests := []struct {
		name      string
		requested []EstablishmentModule
		want      []EstablishmentModule
	}{
		{name: "nothing still keeps time tracking", requested: nil, want: []EstablishmentModule{ModuleTimeTracking}},
		{name: "orders brings inventory", requested: []EstablishmentModule{ModuleOrders}, want: []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}},
		{name: "inventory alone", requested: []EstablishmentModule{ModuleInventory}, want: []EstablishmentModule{ModuleTimeTracking, ModuleInventory}},
		{name: "order of the list, not of the request", requested: []EstablishmentModule{ModuleInventory, ModuleTimeTracking, ModuleOrders}, want: []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ResolveModules(tt.requested); !slices.Equal(got, tt.want) {
				t.Errorf("ResolveModules = %v, want %v", got, tt.want)
			}
		})
	}
}
