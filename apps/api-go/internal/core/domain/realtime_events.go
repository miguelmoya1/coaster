package domain

// Realtime event names, the same as RealtimeEvents in
// packages/common/src/constants/realtime-events.type.ts.
const (
	RealtimeProductCreated          = "productCreated"
	RealtimeProductUpdated          = "productUpdated"
	RealtimeProductStockChanged     = "productStockChanged"
	RealtimeProductDeleted          = "productDeleted"
	RealtimeCatalogueImported       = "catalogueImported"
	RealtimeCategoryCreated         = "categoryCreated"
	RealtimeCategoryUpdated         = "categoryUpdated"
	RealtimeCategoryDeleted         = "categoryDeleted"
	RealtimeMemberInvited           = "memberInvited"
	RealtimeMemberRemoved           = "memberRemoved"
	RealtimeMemberRoleChanged       = "memberRoleChanged"
	RealtimeTableStatusChanged      = "tableStatusChanged"
	RealtimeTableCreated            = "tableCreated"
	RealtimeTableUpdated            = "tableUpdated"
	RealtimeTableDeleted            = "tableDeleted"
	RealtimeOrderCreated            = "orderCreated"
	RealtimeOrderUpdated            = "orderUpdated"
	RealtimeOrderItemAdded          = "orderItemAdded"
	RealtimeOrderClosed             = "orderClosed"
	RealtimeOrderCancelled          = "orderCancelled"
	RealtimeOrderDeleted            = "orderDeleted"
	RealtimeOrderTipUpdated         = "orderTipUpdated"
	RealtimeOrderAdjustmentsUpdated = "orderAdjustmentsUpdated"
	RealtimeShiftCreated            = "shiftCreated"
	RealtimeShiftDeleted            = "shiftDeleted"
	RealtimeSubscriptionUpdated     = "subscriptionUpdated"
)

// AllRealtimeEvents lists every name, in the same order as RealtimeEvents.
var AllRealtimeEvents = []string{
	RealtimeProductCreated,
	RealtimeProductUpdated,
	RealtimeProductStockChanged,
	RealtimeProductDeleted,
	RealtimeCatalogueImported,
	RealtimeCategoryCreated,
	RealtimeCategoryUpdated,
	RealtimeCategoryDeleted,
	RealtimeMemberInvited,
	RealtimeMemberRemoved,
	RealtimeMemberRoleChanged,
	RealtimeTableStatusChanged,
	RealtimeTableCreated,
	RealtimeTableUpdated,
	RealtimeTableDeleted,
	RealtimeOrderCreated,
	RealtimeOrderUpdated,
	RealtimeOrderItemAdded,
	RealtimeOrderClosed,
	RealtimeOrderCancelled,
	RealtimeOrderDeleted,
	RealtimeOrderTipUpdated,
	RealtimeOrderAdjustmentsUpdated,
	RealtimeShiftCreated,
	RealtimeShiftDeleted,
	RealtimeSubscriptionUpdated,
}
