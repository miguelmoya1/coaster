package domain

// Error codes shared with the web app. They must match ErrorCodes in
// packages/common/src/constants/error.types.ts; error_codes_test.go checks it.
const (
	CodeUserNotFound                          = "USER_NOT_FOUND"
	CodeUserAlreadyExists                     = "USER_ALREADY_EXISTS"
	CodeUserCreationFailed                    = "USER_CREATION_FAILED"
	CodeInvalidCredentials                    = "INVALID_CREDENTIALS"
	CodeTooManyAttempts                       = "TOO_MANY_ATTEMPTS"
	CodePasswordCompromised                   = "PASSWORD_COMPROMISED"
	CodeEmailAlreadyLinked                    = "EMAIL_ALREADY_LINKED"
	CodeEmailNotVerified                      = "EMAIL_NOT_VERIFIED"
	CodeBetaAccessRequired                    = "BETA_ACCESS_REQUIRED"
	CodeBetaTesterAlreadyExists               = "BETA_TESTER_ALREADY_EXISTS"
	CodeBetaTesterNotFound                    = "BETA_TESTER_NOT_FOUND"
	CodeSessionExpired                        = "SESSION_EXPIRED"
	CodeSessionNotFound                       = "SESSION_NOT_FOUND"
	CodeCannotCloseCurrentSession             = "CANNOT_CLOSE_CURRENT_SESSION"
	CodeGoogleSignInUnavailable               = "GOOGLE_SIGN_IN_UNAVAILABLE"
	CodeInvalidToken                          = "INVALID_TOKEN"
	CodePasswordAlreadySet                    = "PASSWORD_ALREADY_SET"
	CodeIdentityNotLinked                     = "IDENTITY_NOT_LINKED"
	CodeLastWayIn                             = "LAST_WAY_IN"
	CodeUnauthorized                          = "UNAUTHORIZED"
	CodeMissingEstablishmentId                = "MISSING_ESTABLISHMENT_ID"
	CodeModuleNotEnabled                      = "MODULE_NOT_ENABLED"
	CodeAiQuotaExceeded                       = "AI_QUOTA_EXCEEDED"
	CodeMemberNotFound                        = "MEMBER_NOT_FOUND"
	CodeEstablishmentNotFound                 = "ESTABLISHMENT_NOT_FOUND"
	CodeUserAlreadyMember                     = "USER_ALREADY_MEMBER"
	CodeInviteAlreadyAccepted                 = "INVITE_ALREADY_ACCEPTED"
	CodeInviteEmailFailed                     = "INVITE_EMAIL_FAILED"
	CodeCannotRemoveLastOwner                 = "CANNOT_REMOVE_LAST_OWNER"
	CodeCannotGrantOwnerRole                  = "CANNOT_GRANT_OWNER_ROLE"
	CodeInvalidType                           = "INVALID_TYPE"
	CodeMinLength                             = "MIN_LENGTH"
	CodeMaxLength                             = "MAX_LENGTH"
	CodeInvalidEmail                          = "INVALID_EMAIL"
	CodeRequired                              = "REQUIRED"
	CodeInvalidRole                           = "INVALID_ROLE"
	CodeCategoryNotFound                      = "CATEGORY_NOT_FOUND"
	CodeInvalidDate                           = "INVALID_DATE"
	CodeShiftNotFound                         = "SHIFT_NOT_FOUND"
	CodeInvalidShiftRange                     = "INVALID_SHIFT_RANGE"
	CodeExchangeNotFound                      = "EXCHANGE_NOT_FOUND"
	CodeInvalidExchange                       = "INVALID_EXCHANGE"
	CodeNotYourShift                          = "NOT_YOUR_SHIFT"
	CodeUnauthorizedShiftAction               = "UNAUTHORIZED_SHIFT_ACTION"
	CodeExchangeAlreadyPending                = "EXCHANGE_ALREADY_PENDING"
	CodeExchangeShiftAlreadyStarted           = "EXCHANGE_SHIFT_ALREADY_STARTED"
	CodeExchangeAlreadyClosed                 = "EXCHANGE_ALREADY_CLOSED"
	CodeTimeEntryNotFound                     = "TIME_ENTRY_NOT_FOUND"
	CodeTimeEntryNotCurrent                   = "TIME_ENTRY_NOT_CURRENT"
	CodeTimeEntryReasonRequired               = "TIME_ENTRY_REASON_REQUIRED"
	CodeInvalidClockSequence                  = "INVALID_CLOCK_SEQUENCE"
	CodeNotYourTimeEntry                      = "NOT_YOUR_TIME_ENTRY"
	CodeInvalidEstablishmentId                = "INVALID_ESTABLISHMENT_ID"
	CodeProductNotFound                       = "PRODUCT_NOT_FOUND"
	CodeMenuNotFound                          = "MENU_NOT_FOUND"
	CodeMenuLanguageNotOffered                = "MENU_LANGUAGE_NOT_OFFERED"
	CodeTableNotFound                         = "TABLE_NOT_FOUND"
	CodeTableAlreadyOccupied                  = "TABLE_ALREADY_OCCUPIED"
	CodeTableNotOccupied                      = "TABLE_NOT_OCCUPIED"
	CodeOrderNotFound                         = "ORDER_NOT_FOUND"
	CodeOrderNotOpen                          = "ORDER_NOT_OPEN"
	CodeOrderItemNotFound                     = "ORDER_ITEM_NOT_FOUND"
	CodeOrderAlreadyPaid                      = "ORDER_ALREADY_PAID"
	CodeInvalidOrderIds                       = "INVALID_ORDER_IDS"
	CodeOrderInCashClose                      = "ORDER_IN_CASH_CLOSE"
	CodePrinterNotConfigured                  = "PRINTER_NOT_CONFIGURED"
	CodePrinterPairingInvalid                 = "PRINTER_PAIRING_INVALID"
	CodePrinterNotConnected                   = "PRINTER_NOT_CONNECTED"
	CodePrinterAlreadyConfigured              = "PRINTER_ALREADY_CONFIGURED"
	CodePrinterInvalidDeviceKey               = "PRINTER_INVALID_DEVICE_KEY"
	CodePrintJobNotFound                      = "PRINT_JOB_NOT_FOUND"
	CodePrintJobFailed                        = "PRINT_JOB_FAILED"
	CodePrintJobTimeout                       = "PRINT_JOB_TIMEOUT"
	CodeSubscriptionExpired                   = "SUBSCRIPTION_EXPIRED"
	CodeInvalidSubscriptionPlan               = "INVALID_SUBSCRIPTION_PLAN"
	CodeStripeSubscriptionAlreadyExists       = "STRIPE_SUBSCRIPTION_ALREADY_EXISTS"
	CodeStripeSubscriptionPendingCancellation = "STRIPE_SUBSCRIPTION_PENDING_CANCELLATION"
	CodeStripeCustomerNotFound                = "STRIPE_CUSTOMER_NOT_FOUND"
	CodeStripeCheckoutSessionFailed           = "STRIPE_CHECKOUT_SESSION_FAILED"
	CodeStripeBillingPortalFailed             = "STRIPE_BILLING_PORTAL_FAILED"
	CodeStripeSubscriptionLookupFailed        = "STRIPE_SUBSCRIPTION_LOOKUP_FAILED"
	CodeStripeSubscriptionCancelFailed        = "STRIPE_SUBSCRIPTION_CANCEL_FAILED"
	CodeStripeSubscriptionSeatsUpdateFailed   = "STRIPE_SUBSCRIPTION_SEATS_UPDATE_FAILED"
	CodeStripeSecretKeyNotConfigured          = "STRIPE_SECRET_KEY_NOT_CONFIGURED"
	CodeStripePriceNotConfigured              = "STRIPE_PRICE_NOT_CONFIGURED"
	CodeStripeWebhookSecretNotConfigured      = "STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED"
	CodeStripeWebhookSignatureMissing         = "STRIPE_WEBHOOK_SIGNATURE_MISSING"
	CodeStripeWebhookSignatureInvalid         = "STRIPE_WEBHOOK_SIGNATURE_INVALID"
	CodeStripeWebhookEventMissing             = "STRIPE_WEBHOOK_EVENT_MISSING"
	CodeStripeWebhookEstablishmentIdMissing   = "STRIPE_WEBHOOK_ESTABLISHMENT_ID_MISSING"
	CodeStripeWebhookCustomerMissing          = "STRIPE_WEBHOOK_CUSTOMER_MISSING"
	CodeStripeWebhookSubscriptionMissing      = "STRIPE_WEBHOOK_SUBSCRIPTION_MISSING"
	CodeStripeConfigurationInvalid            = "STRIPE_CONFIGURATION_INVALID"
	CodeNoManualGrant                         = "NO_MANUAL_GRANT"
	CodeCannotDemoteLastAdmin                 = "CANNOT_DEMOTE_LAST_ADMIN"
	CodeCannotEditOwnAdminAccount             = "CANNOT_EDIT_OWN_ADMIN_ACCOUNT"
	CodeNetworkError                          = "NETWORK_ERROR"
	CodeUnexpectedError                       = "UNEXPECTED_ERROR"
)

// AllErrorCodes lists every code, in the same order as ErrorCodes.
var AllErrorCodes = []string{
	CodeUserNotFound,
	CodeUserAlreadyExists,
	CodeUserCreationFailed,
	CodeInvalidCredentials,
	CodeTooManyAttempts,
	CodePasswordCompromised,
	CodeEmailAlreadyLinked,
	CodeEmailNotVerified,
	CodeBetaAccessRequired,
	CodeBetaTesterAlreadyExists,
	CodeBetaTesterNotFound,
	CodeSessionExpired,
	CodeSessionNotFound,
	CodeCannotCloseCurrentSession,
	CodeGoogleSignInUnavailable,
	CodeInvalidToken,
	CodePasswordAlreadySet,
	CodeIdentityNotLinked,
	CodeLastWayIn,
	CodeUnauthorized,
	CodeMissingEstablishmentId,
	CodeModuleNotEnabled,
	CodeAiQuotaExceeded,
	CodeMemberNotFound,
	CodeEstablishmentNotFound,
	CodeUserAlreadyMember,
	CodeInviteAlreadyAccepted,
	CodeInviteEmailFailed,
	CodeCannotRemoveLastOwner,
	CodeCannotGrantOwnerRole,
	CodeInvalidType,
	CodeMinLength,
	CodeMaxLength,
	CodeInvalidEmail,
	CodeRequired,
	CodeInvalidRole,
	CodeCategoryNotFound,
	CodeInvalidDate,
	CodeShiftNotFound,
	CodeInvalidShiftRange,
	CodeExchangeNotFound,
	CodeInvalidExchange,
	CodeNotYourShift,
	CodeUnauthorizedShiftAction,
	CodeExchangeAlreadyPending,
	CodeExchangeShiftAlreadyStarted,
	CodeExchangeAlreadyClosed,
	CodeTimeEntryNotFound,
	CodeTimeEntryNotCurrent,
	CodeTimeEntryReasonRequired,
	CodeInvalidClockSequence,
	CodeNotYourTimeEntry,
	CodeInvalidEstablishmentId,
	CodeProductNotFound,
	CodeMenuNotFound,
	CodeMenuLanguageNotOffered,
	CodeTableNotFound,
	CodeTableAlreadyOccupied,
	CodeTableNotOccupied,
	CodeOrderNotFound,
	CodeOrderNotOpen,
	CodeOrderItemNotFound,
	CodeOrderAlreadyPaid,
	CodeInvalidOrderIds,
	CodeOrderInCashClose,
	CodePrinterNotConfigured,
	CodePrinterPairingInvalid,
	CodePrinterNotConnected,
	CodePrinterAlreadyConfigured,
	CodePrinterInvalidDeviceKey,
	CodePrintJobNotFound,
	CodePrintJobFailed,
	CodePrintJobTimeout,
	CodeSubscriptionExpired,
	CodeInvalidSubscriptionPlan,
	CodeStripeSubscriptionAlreadyExists,
	CodeStripeSubscriptionPendingCancellation,
	CodeStripeCustomerNotFound,
	CodeStripeCheckoutSessionFailed,
	CodeStripeBillingPortalFailed,
	CodeStripeSubscriptionLookupFailed,
	CodeStripeSubscriptionCancelFailed,
	CodeStripeSubscriptionSeatsUpdateFailed,
	CodeStripeSecretKeyNotConfigured,
	CodeStripePriceNotConfigured,
	CodeStripeWebhookSecretNotConfigured,
	CodeStripeWebhookSignatureMissing,
	CodeStripeWebhookSignatureInvalid,
	CodeStripeWebhookEventMissing,
	CodeStripeWebhookEstablishmentIdMissing,
	CodeStripeWebhookCustomerMissing,
	CodeStripeWebhookSubscriptionMissing,
	CodeStripeConfigurationInvalid,
	CodeNoManualGrant,
	CodeCannotDemoteLastAdmin,
	CodeCannotEditOwnAdminAccount,
	CodeNetworkError,
	CodeUnexpectedError,
}
