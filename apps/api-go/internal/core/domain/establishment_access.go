package domain

import "slices"

// EstablishmentRole is a member's role in an establishment.
type EstablishmentRole string

const (
	EstablishmentRoleOwner   EstablishmentRole = "OWNER"
	EstablishmentRoleManager EstablishmentRole = "MANAGER"
	EstablishmentRoleStaff   EstablishmentRole = "STAFF"
)

// AsEstablishmentRole reads a stored role; anything unknown counts as STAFF.
func AsEstablishmentRole(role string) EstablishmentRole {
	switch EstablishmentRole(role) {
	case EstablishmentRoleOwner, EstablishmentRoleManager, EstablishmentRoleStaff:
		return EstablishmentRole(role)
	default:
		return EstablishmentRoleStaff
	}
}

// EstablishmentPermission is something a member may do in an establishment. They must match
// EstablishmentPermission in @coaster/common; establishment_access_test.go checks it.
type EstablishmentPermission string

const (
	PermissionViewDashboard         EstablishmentPermission = "establishment:view-dashboard"
	PermissionViewFinancials        EstablishmentPermission = "establishment:view-financials"
	PermissionViewFinancialsHistory EstablishmentPermission = "establishment:view-financials-history"
	PermissionViewLaborCost         EstablishmentPermission = "establishment:view-labor-cost"
	PermissionInviteMember          EstablishmentPermission = "establishment:invite-member"
	PermissionRemoveMember          EstablishmentPermission = "establishment:remove-member"
	PermissionUpdateMemberRole      EstablishmentPermission = "establishment:update-member-role"
	PermissionViewMembers           EstablishmentPermission = "establishment:view-members"
	PermissionOpenTable             EstablishmentPermission = "establishment:open-table"
	PermissionViewTables            EstablishmentPermission = "establishment:view-tables"
	PermissionCreateTable           EstablishmentPermission = "establishment:create-table"
	PermissionUpdateTable           EstablishmentPermission = "establishment:update-table"
	PermissionDeleteTable           EstablishmentPermission = "establishment:delete-table"
	PermissionCreateOrder           EstablishmentPermission = "establishment:create-order"
	PermissionViewOrders            EstablishmentPermission = "establishment:view-orders"
	PermissionUpdateOrder           EstablishmentPermission = "establishment:update-order"
	PermissionDeleteOrder           EstablishmentPermission = "establishment:delete-order"
	PermissionDeleteOrderItem       EstablishmentPermission = "establishment:delete-order-item"
	PermissionCheckoutOrder         EstablishmentPermission = "establishment:checkout-order"
	PermissionCloseCash             EstablishmentPermission = "establishment:close-cash"
	PermissionCancelOrder           EstablishmentPermission = "establishment:cancel-order"
	PermissionMoveOrderTable        EstablishmentPermission = "establishment:move-order-table"
	PermissionMergeOrders           EstablishmentPermission = "establishment:merge-orders"
	PermissionViewProducts          EstablishmentPermission = "establishment:view-products"
	PermissionCreateProduct         EstablishmentPermission = "establishment:create-product"
	PermissionUpdateProduct         EstablishmentPermission = "establishment:update-product"
	PermissionUpdateProductStock    EstablishmentPermission = "establishment:update-product-stock"
	PermissionDeleteProduct         EstablishmentPermission = "establishment:delete-product"
	PermissionViewCategories        EstablishmentPermission = "establishment:view-categories"
	PermissionCreateCategory        EstablishmentPermission = "establishment:create-category"
	PermissionUpdateCategory        EstablishmentPermission = "establishment:update-category"
	PermissionDeleteCategory        EstablishmentPermission = "establishment:delete-category"
	PermissionViewShifts            EstablishmentPermission = "establishment:view-shifts"
	PermissionCreateShift           EstablishmentPermission = "establishment:create-shift"
	PermissionDeleteShift           EstablishmentPermission = "establishment:delete-shift"
	PermissionClockIn               EstablishmentPermission = "establishment:clock-in"
	PermissionAmendOwnTimeEntry     EstablishmentPermission = "establishment:amend-own-time-entry"
	PermissionViewTimeEntries       EstablishmentPermission = "establishment:view-time-entries"
	PermissionManageTimeEntries     EstablishmentPermission = "establishment:manage-time-entries"
	PermissionViewExchanges         EstablishmentPermission = "establishment:view-exchanges"
	PermissionCreateExchange        EstablishmentPermission = "establishment:create-exchange"
	PermissionAcceptExchange        EstablishmentPermission = "establishment:accept-exchange"
	PermissionDeleteExchange        EstablishmentPermission = "establishment:delete-exchange"
	PermissionImportCatalogue       EstablishmentPermission = "establishment:import-catalogue"
	PermissionViewPrinter           EstablishmentPermission = "establishment:view-printer"
	PermissionManagePrinter         EstablishmentPermission = "establishment:manage-printer"
	PermissionManageMenu            EstablishmentPermission = "establishment:manage-menu"
	PermissionManageBilling         EstablishmentPermission = "establishment:manage-billing"
	PermissionManageSettings        EstablishmentPermission = "establishment:manage-settings"
)

// AllEstablishmentPermissions lists every permission, in the same order as @coaster/common.
// A platform admin gets all of them.
var AllEstablishmentPermissions = []EstablishmentPermission{
	PermissionViewDashboard,
	PermissionViewFinancials,
	PermissionViewFinancialsHistory,
	PermissionViewLaborCost,
	PermissionInviteMember,
	PermissionRemoveMember,
	PermissionUpdateMemberRole,
	PermissionViewMembers,
	PermissionOpenTable,
	PermissionViewTables,
	PermissionCreateTable,
	PermissionUpdateTable,
	PermissionDeleteTable,
	PermissionCreateOrder,
	PermissionViewOrders,
	PermissionUpdateOrder,
	PermissionDeleteOrder,
	PermissionDeleteOrderItem,
	PermissionCheckoutOrder,
	PermissionCloseCash,
	PermissionCancelOrder,
	PermissionMoveOrderTable,
	PermissionMergeOrders,
	PermissionViewProducts,
	PermissionCreateProduct,
	PermissionUpdateProduct,
	PermissionUpdateProductStock,
	PermissionDeleteProduct,
	PermissionViewCategories,
	PermissionCreateCategory,
	PermissionUpdateCategory,
	PermissionDeleteCategory,
	PermissionViewShifts,
	PermissionCreateShift,
	PermissionDeleteShift,
	PermissionClockIn,
	PermissionAmendOwnTimeEntry,
	PermissionViewTimeEntries,
	PermissionManageTimeEntries,
	PermissionViewExchanges,
	PermissionCreateExchange,
	PermissionAcceptExchange,
	PermissionDeleteExchange,
	PermissionImportCatalogue,
	PermissionViewPrinter,
	PermissionManagePrinter,
	PermissionManageMenu,
	PermissionManageBilling,
	PermissionManageSettings,
}

var staffPermissions = []EstablishmentPermission{
	PermissionViewDashboard,

	PermissionViewMembers,

	PermissionViewTables,
	PermissionOpenTable,

	PermissionViewOrders,
	PermissionCreateOrder,
	PermissionUpdateOrder,
	PermissionDeleteOrderItem,
	PermissionCheckoutOrder,
	PermissionCancelOrder,
	PermissionMoveOrderTable,
	PermissionMergeOrders,

	PermissionViewCategories,
	PermissionViewProducts,
	PermissionUpdateProductStock,

	PermissionViewShifts,
	PermissionClockIn,
	PermissionAmendOwnTimeEntry,
	PermissionViewExchanges,
	PermissionCreateExchange,
	PermissionAcceptExchange,
	PermissionDeleteExchange,

	PermissionViewPrinter,
}

var managerPermissions = []EstablishmentPermission{
	PermissionViewFinancials,
	PermissionCloseCash,

	PermissionInviteMember,

	PermissionCreateCategory,
	PermissionUpdateCategory,
	PermissionCreateProduct,
	PermissionUpdateProduct,

	PermissionCreateShift,
	PermissionDeleteShift,

	PermissionViewTimeEntries,
	PermissionManageTimeEntries,

	PermissionManagePrinter,
	PermissionManageMenu,
}

var ownerPermissions = []EstablishmentPermission{
	PermissionRemoveMember,
	PermissionUpdateMemberRole,

	PermissionCreateTable,
	PermissionUpdateTable,
	PermissionDeleteTable,

	PermissionDeleteOrder,

	PermissionDeleteCategory,
	PermissionDeleteProduct,
	PermissionImportCatalogue,

	PermissionViewFinancialsHistory,
	PermissionViewLaborCost,

	PermissionManageBilling,
	PermissionManageSettings,
}

// RolePermissions lists what a role may do, as ROLE_PERMISSIONS does: an owner has
// everything a manager has, and a manager everything staff has.
func RolePermissions(role EstablishmentRole) []EstablishmentPermission {
	switch role {
	case EstablishmentRoleOwner:
		return slices.Concat(ownerPermissions, managerPermissions, staffPermissions)
	case EstablishmentRoleManager:
		return slices.Concat(managerPermissions, staffPermissions)
	case EstablishmentRoleStaff:
		return slices.Clone(staffPermissions)
	default:
		return nil
	}
}

// HasPermission reports whether role may do permission.
func HasPermission(role EstablishmentRole, permission EstablishmentPermission) bool {
	return slices.Contains(RolePermissions(role), permission)
}

// EstablishmentModule is a part of the product an establishment can switch on.
type EstablishmentModule string

const (
	ModuleTimeTracking EstablishmentModule = "TIME_TRACKING"
	ModuleOrders       EstablishmentModule = "ORDERS"
	ModuleInventory    EstablishmentModule = "INVENTORY"
)

// AllEstablishmentModules lists the modules in the order of @coaster/common.
var AllEstablishmentModules = []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}

// DefaultEstablishmentModules is what an establishment without settings runs.
var DefaultEstablishmentModules = []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}

// ResolveModules is resolveModules: time tracking is always on, orders brings inventory
// with it, and the result follows the order of AllEstablishmentModules.
func ResolveModules(requested []EstablishmentModule) []EstablishmentModule {
	on := map[EstablishmentModule]bool{ModuleTimeTracking: true}
	for _, module := range requested {
		on[module] = true
	}

	if on[ModuleOrders] {
		on[ModuleInventory] = true
	}

	var resolved []EstablishmentModule
	for _, module := range AllEstablishmentModules {
		if on[module] {
			resolved = append(resolved, module)
		}
	}

	return resolved
}

// Membership is a user's place in an establishment, as the permission check reads it.
// The JSON names match what Nest keeps in the cache.
type Membership struct {
	Role   string `json:"role"`
	Active bool   `json:"active"`
}
