package domain

import "slices"

type EstablishmentRole string

const (
	EstablishmentRoleOwner   EstablishmentRole = "OWNER"
	EstablishmentRoleManager EstablishmentRole = "MANAGER"
	EstablishmentRoleStaff   EstablishmentRole = "STAFF"
)

func AsEstablishmentRole(role string) EstablishmentRole {
	switch EstablishmentRole(role) {
	case EstablishmentRoleOwner, EstablishmentRoleManager, EstablishmentRoleStaff:
		return EstablishmentRole(role)
	default:
		return EstablishmentRoleStaff
	}
}

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
	PermissionCloseCash,

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

func HasPermission(role EstablishmentRole, permission EstablishmentPermission) bool {
	return slices.Contains(RolePermissions(role), permission)
}

type EstablishmentModule string

const (
	ModuleTimeTracking EstablishmentModule = "TIME_TRACKING"
	ModuleOrders       EstablishmentModule = "ORDERS"
	ModuleInventory    EstablishmentModule = "INVENTORY"
)

var AllEstablishmentModules = []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}

var DefaultEstablishmentModules = []EstablishmentModule{ModuleTimeTracking, ModuleOrders, ModuleInventory}

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

type Membership struct {
	Role   string `json:"role"`
	Active bool   `json:"active"`
}
