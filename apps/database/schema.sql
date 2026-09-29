CREATE TYPE public."AdjustmentTarget" AS ENUM (
    'ORDER',
    'ITEM'
);

CREATE TYPE public."AdjustmentType" AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT'
);

CREATE TYPE public."AeatStatus" AS ENUM (
    'NOT_SENT',
    'PENDING',
    'ACCEPTED',
    'ACCEPTED_WITH_ERRORS',
    'REJECTED'
);

CREATE TYPE public."Allergen" AS ENUM (
    'GLUTEN',
    'CRUSTACEANS',
    'EGGS',
    'FISH',
    'PEANUTS',
    'SOYBEANS',
    'MILK',
    'NUTS',
    'CELERY',
    'MUSTARD',
    'SESAME',
    'SULPHITES',
    'LUPIN',
    'MOLLUSCS'
);

CREATE TYPE public."AuthEventType" AS ENUM (
    'REGISTERED',
    'LOGIN_SUCCEEDED',
    'LOGIN_FAILED',
    'LOGIN_BLOCKED',
    'LOGGED_OUT',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_COMPLETED',
    'INVITE_ACCEPTED',
    'EMAIL_VERIFIED',
    'IDENTITY_LINKED',
    'IDENTITY_UNLINKED',
    'REFRESH_REUSE_DETECTED'
);

CREATE TYPE public."AuthProvider" AS ENUM (
    'GOOGLE'
);

CREATE TYPE public."AuthTokenPurpose" AS ENUM (
    'EMAIL_VERIFICATION',
    'PASSWORD_RESET',
    'INVITE'
);

CREATE TYPE public."DeliveryStatus" AS ENUM (
    'PENDING',
    'PARTIAL',
    'SERVED'
);

CREATE TYPE public."EstablishmentModule" AS ENUM (
    'TIME_TRACKING',
    'ORDERS',
    'INVENTORY'
);

CREATE TYPE public."EstablishmentRole" AS ENUM (
    'OWNER',
    'STAFF',
    'MANAGER'
);

CREATE TYPE public."InvoiceRecordType" AS ENUM (
    'ALTA',
    'ANULACION'
);

CREATE TYPE public."InvoiceType" AS ENUM (
    'F1',
    'F2',
    'F3',
    'R1',
    'R2',
    'R3',
    'R4',
    'R5'
);

CREATE TYPE public."OrderStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'MIXED',
    'NONE'
);

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PARTIAL',
    'PAID'
);

CREATE TYPE public."PrintJobStatus" AS ENUM (
    'PENDING',
    'PRINTING',
    'PRINTED',
    'FAILED'
);

CREATE TYPE public."RectificationType" AS ENUM (
    'S',
    'I'
);

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'FREE',
    'PRO'
);

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'INACTIVE',
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'UNPAID',
    'EXPIRED'
);

CREATE TYPE public."TableStatus" AS ENUM (
    'FREE',
    'OCCUPIED'
);

CREATE FUNCTION public.time_entry_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TABLE public."AdminAuditLog" (
    id text NOT NULL,
    "actorId" text NOT NULL,
    action text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    "targetLabel" text,
    reason text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AiUsage" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    period text NOT NULL,
    messages integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."AuthEvent" (
    id text NOT NULL,
    type public."AuthEventType" NOT NULL,
    "userId" text,
    email text,
    "sessionId" text,
    ip text,
    "userAgent" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."AuthIdentity" (
    id text NOT NULL,
    "userId" text NOT NULL,
    provider public."AuthProvider" NOT NULL,
    subject text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastLoginAt" timestamp(3) without time zone
);

CREATE TABLE public."AuthSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "familyId" text NOT NULL,
    "userAgent" text,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "rotatedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone
);

CREATE TABLE public."AuthToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    purpose public."AuthTokenPurpose" NOT NULL,
    "tokenHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone
);

CREATE TABLE public."BetaTester" (
    id text NOT NULL,
    email text NOT NULL,
    note text,
    "invitedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."CashClose" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "closedById" text NOT NULL,
    since timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closedOrders" integer NOT NULL,
    "cancelledOrders" integer NOT NULL,
    "cancelledAmount" integer NOT NULL,
    "cashAmount" integer NOT NULL,
    "cardAmount" integer NOT NULL,
    "tipAmount" integer NOT NULL,
    "openingFloat" integer NOT NULL,
    "countedCash" integer NOT NULL,
    notes text
);

CREATE TABLE public."Category" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    name text NOT NULL,
    icon text,
    "deletedAt" timestamp(3) without time zone,
    "taxRate" integer DEFAULT 1000 NOT NULL
);

CREATE TABLE public."Establishment" (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fiscalAddress" text,
    "legalName" text,
    "taxId" text
);

CREATE TABLE public."EstablishmentMember" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "establishmentId" text NOT NULL,
    role public."EstablishmentRole" DEFAULT 'STAFF'::public."EstablishmentRole" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "hourlyRateCents" integer
);

CREATE TABLE public."EstablishmentSettings" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    modules public."EstablishmentModule"[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "configuredAt" timestamp(3) without time zone,
    language text DEFAULT 'es'::text NOT NULL,
    "markSoldOut" boolean DEFAULT false NOT NULL
);

CREATE TABLE public."EstablishmentSubscription" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    plan public."SubscriptionPlan" DEFAULT 'FREE'::public."SubscriptionPlan" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'INACTIVE'::public."SubscriptionStatus" NOT NULL,
    "stripeCustomerId" text,
    "stripeSubscriptionId" text,
    "currentPeriodStart" timestamp(3) without time zone,
    "currentPeriodEnd" timestamp(3) without time zone,
    "canceledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "trialEndsAt" timestamp(3) without time zone,
    "manualPlan" public."SubscriptionPlan",
    "manualGrantExpiresAt" timestamp(3) without time zone,
    "manualGrantReason" text,
    "manualGrantedById" text,
    "manualGrantedAt" timestamp(3) without time zone,
    seats integer DEFAULT 1 NOT NULL
);

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "orderId" text,
    "idVersion" text NOT NULL,
    "recordType" public."InvoiceRecordType" DEFAULT 'ALTA'::public."InvoiceRecordType" NOT NULL,
    type public."InvoiceType" NOT NULL,
    series text NOT NULL,
    number integer NOT NULL,
    sequence bigint NOT NULL,
    "issuerTaxId" text NOT NULL,
    "issuerLegalName" text NOT NULL,
    "issuerAddress" text NOT NULL,
    "operationText" text NOT NULL,
    "externalRef" text,
    "customerTaxId" text,
    "customerName" text,
    "customerAddress" text,
    "customerCountry" text,
    "customerIdType" text,
    "simplifiedArt7273" boolean DEFAULT false NOT NULL,
    "noCustomerIdArt61d" boolean DEFAULT false NOT NULL,
    macrodato boolean DEFAULT false NOT NULL,
    "issuedByThirdParty" text,
    "thirdPartyTaxId" text,
    "thirdPartyName" text,
    "taxBaseTotal" integer NOT NULL,
    "taxAmountTotal" integer NOT NULL,
    "totalAmount" integer NOT NULL,
    "prevHash" text NOT NULL,
    hash text NOT NULL,
    "hashType" text DEFAULT '01'::text NOT NULL,
    "prevSeries" text,
    "prevNumber" integer,
    "prevIssuedAt" timestamp(3) without time zone,
    "isFirstRecord" boolean DEFAULT false NOT NULL,
    "softwareVersion" text NOT NULL,
    "installationNumber" text NOT NULL,
    "qrPayload" text NOT NULL,
    subsanacion boolean DEFAULT false NOT NULL,
    "rechazoPrevio" boolean DEFAULT false NOT NULL,
    "aeatStatus" public."AeatStatus" DEFAULT 'NOT_SENT'::public."AeatStatus" NOT NULL,
    "aeatCsv" text,
    "aeatRecordState" text,
    "aeatErrorCode" text,
    "aeatErrorText" text,
    "aeatSentAt" timestamp(3) without time zone,
    "aeatAttempts" integer DEFAULT 0 NOT NULL,
    "substitutesId" text,
    "rectifiesId" text,
    "rectificationType" public."RectificationType",
    "rectifiedBase" integer,
    "rectifiedTaxAmount" integer,
    "cancelsId" text,
    "noPreviousRecord" boolean DEFAULT false NOT NULL,
    "generatedBy" text,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "recordedAt" timestamp(3) without time zone NOT NULL,
    "operationDate" date,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."InvoiceTaxLine" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "taxType" text DEFAULT '01'::text NOT NULL,
    "regimeKey" text DEFAULT '01'::text NOT NULL,
    qualification text,
    exemption text,
    "taxRate" integer NOT NULL,
    "taxBase" integer NOT NULL,
    "taxAmount" integer NOT NULL
);

CREATE TABLE public."Menu" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    "defaultLanguage" text NOT NULL,
    languages text[],
    "publishedSnapshot" jsonb,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."MenuItem" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    "productId" text,
    price integer,
    "position" integer NOT NULL,
    translations jsonb NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."MenuSection" (
    id text NOT NULL,
    "menuId" text NOT NULL,
    "position" integer NOT NULL,
    translations jsonb NOT NULL
);

CREATE TABLE public."Order" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "tableId" text,
    "tableName" text,
    status public."OrderStatus" DEFAULT 'OPEN'::public."OrderStatus" NOT NULL,
    "totalAmount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "amountPaidCard" integer DEFAULT 0 NOT NULL,
    "amountPaidCash" integer DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'NONE'::public."PaymentMethod" NOT NULL,
    notes text,
    "tipAmount" integer DEFAULT 0 NOT NULL,
    "createdById" text,
    "ticketNotes" text,
    "cashCloseId" text
);

CREATE TABLE public."OrderAdjustment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    target public."AdjustmentTarget" NOT NULL,
    "itemId" text,
    type public."AdjustmentType" NOT NULL,
    value integer NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."OrderAuditLog" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "actorId" text NOT NULL,
    action text NOT NULL,
    "targetType" text NOT NULL,
    "targetId" text NOT NULL,
    reason text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    "priceAtPurchase" integer NOT NULL,
    "paidQuantity" integer DEFAULT 0 NOT NULL,
    "servedQuantity" integer DEFAULT 0 NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "deliveryStatus" public."DeliveryStatus" DEFAULT 'PENDING'::public."DeliveryStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paidQuantityCard" integer DEFAULT 0 NOT NULL,
    "paidQuantityCash" integer DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'NONE'::public."PaymentMethod" NOT NULL,
    notes text,
    "productNameAtPurchase" text NOT NULL,
    "taxRateAtPurchase" integer DEFAULT 1000 NOT NULL
);

CREATE TABLE public."PrintJob" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    payload jsonb NOT NULL,
    status public."PrintJobStatus" DEFAULT 'PENDING'::public."PrintJobStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "claimedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone
);

CREATE TABLE public."PrinterConfig" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "deviceKey" text NOT NULL,
    "ipAddress" text,
    port integer DEFAULT 8080 NOT NULL,
    "lastSeenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."PrinterPairing" (
    id text NOT NULL,
    code text NOT NULL,
    "establishmentId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "redeemedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    "categoryId" text NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "minStockAlert" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "imageUrl" text,
    allergens public."Allergen"[],
    icon text,
    "taxRate" integer
);

CREATE TABLE public."Shift" (
    id text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
    "establishmentId" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."ShiftExchange" (
    id text NOT NULL,
    "shiftId" text NOT NULL,
    "requesterId" text NOT NULL,
    "targetId" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public."Table" (
    id text NOT NULL,
    name text NOT NULL,
    status public."TableStatus" DEFAULT 'FREE'::public."TableStatus" NOT NULL,
    "establishmentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE public."TimeEntry" (
    id text NOT NULL,
    "establishmentId" text NOT NULL,
    "userId" text NOT NULL,
    "userSnapshot" jsonb NOT NULL,
    "shiftId" text,
    type text NOT NULL,
    action text NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    "recordedAt" timestamp(3) without time zone NOT NULL,
    "workdayDate" date NOT NULL,
    source text NOT NULL,
    latitude double precision,
    longitude double precision,
    "rootId" text NOT NULL,
    "supersedesId" text,
    "actorId" text NOT NULL,
    reason text,
    sequence bigint NOT NULL,
    "prevHash" text NOT NULL,
    hash text NOT NULL
);

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "firebaseUid" text,
    name text NOT NULL,
    "photoUrl" text,
    active boolean DEFAULT true NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "emailVerifiedAt" timestamp(3) without time zone,
    "passwordHash" text,
    "passwordUpdatedAt" timestamp(3) without time zone
);

CREATE TABLE public."UserPreferences" (
    id text NOT NULL,
    "userId" text NOT NULL,
    language text DEFAULT 'es'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AiUsage"
    ADD CONSTRAINT "AiUsage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuthEvent"
    ADD CONSTRAINT "AuthEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuthIdentity"
    ADD CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuthSession"
    ADD CONSTRAINT "AuthSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."AuthToken"
    ADD CONSTRAINT "AuthToken_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."BetaTester"
    ADD CONSTRAINT "BetaTester_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."CashClose"
    ADD CONSTRAINT "CashClose_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."EstablishmentMember"
    ADD CONSTRAINT "EstablishmentMember_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."EstablishmentSettings"
    ADD CONSTRAINT "EstablishmentSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."EstablishmentSubscription"
    ADD CONSTRAINT "EstablishmentSubscription_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Establishment"
    ADD CONSTRAINT "Establishment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."InvoiceTaxLine"
    ADD CONSTRAINT "InvoiceTaxLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MenuItem"
    ADD CONSTRAINT "MenuItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."MenuSection"
    ADD CONSTRAINT "MenuSection_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."OrderAdjustment"
    ADD CONSTRAINT "OrderAdjustment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."OrderAuditLog"
    ADD CONSTRAINT "OrderAuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrintJob"
    ADD CONSTRAINT "PrintJob_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrinterConfig"
    ADD CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."PrinterPairing"
    ADD CONSTRAINT "PrinterPairing_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."ShiftExchange"
    ADD CONSTRAINT "ShiftExchange_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."Table"
    ADD CONSTRAINT "Table_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."UserPreferences"
    ADD CONSTRAINT "UserPreferences_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON public."AdminAuditLog" USING btree ("createdAt");

CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON public."AdminAuditLog" USING btree ("targetType", "targetId", "createdAt");

CREATE UNIQUE INDEX "AiUsage_establishmentId_period_key" ON public."AiUsage" USING btree ("establishmentId", period);

CREATE INDEX "AuthEvent_createdAt_idx" ON public."AuthEvent" USING btree ("createdAt");

CREATE INDEX "AuthEvent_email_createdAt_idx" ON public."AuthEvent" USING btree (email, "createdAt");

CREATE INDEX "AuthEvent_type_createdAt_idx" ON public."AuthEvent" USING btree (type, "createdAt");

CREATE INDEX "AuthEvent_userId_createdAt_idx" ON public."AuthEvent" USING btree ("userId", "createdAt");

CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON public."AuthIdentity" USING btree (provider, subject);

CREATE UNIQUE INDEX "AuthIdentity_provider_userId_key" ON public."AuthIdentity" USING btree (provider, "userId");

CREATE INDEX "AuthSession_expiresAt_idx" ON public."AuthSession" USING btree ("expiresAt");

CREATE INDEX "AuthSession_familyId_idx" ON public."AuthSession" USING btree ("familyId");

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON public."AuthSession" USING btree ("tokenHash");

CREATE INDEX "AuthSession_userId_revokedAt_idx" ON public."AuthSession" USING btree ("userId", "revokedAt");

CREATE INDEX "AuthToken_expiresAt_idx" ON public."AuthToken" USING btree ("expiresAt");

CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON public."AuthToken" USING btree ("tokenHash");

CREATE INDEX "AuthToken_userId_purpose_idx" ON public."AuthToken" USING btree ("userId", purpose);

CREATE UNIQUE INDEX "BetaTester_email_key" ON public."BetaTester" USING btree (email);

CREATE INDEX "CashClose_establishmentId_closedAt_idx" ON public."CashClose" USING btree ("establishmentId", "closedAt");

CREATE INDEX "Category_establishmentId_deletedAt_idx" ON public."Category" USING btree ("establishmentId", "deletedAt");

CREATE INDEX "EstablishmentMember_establishmentId_deletedAt_idx" ON public."EstablishmentMember" USING btree ("establishmentId", "deletedAt");

CREATE UNIQUE INDEX "EstablishmentMember_userId_establishmentId_key" ON public."EstablishmentMember" USING btree ("userId", "establishmentId");

CREATE UNIQUE INDEX "EstablishmentSettings_establishmentId_key" ON public."EstablishmentSettings" USING btree ("establishmentId");

CREATE UNIQUE INDEX "EstablishmentSubscription_establishmentId_key" ON public."EstablishmentSubscription" USING btree ("establishmentId");

CREATE INDEX "EstablishmentSubscription_manualPlan_idx" ON public."EstablishmentSubscription" USING btree ("manualPlan");

CREATE INDEX "EstablishmentSubscription_status_idx" ON public."EstablishmentSubscription" USING btree (status);

CREATE UNIQUE INDEX "EstablishmentSubscription_stripeCustomerId_key" ON public."EstablishmentSubscription" USING btree ("stripeCustomerId");

CREATE UNIQUE INDEX "EstablishmentSubscription_stripeSubscriptionId_key" ON public."EstablishmentSubscription" USING btree ("stripeSubscriptionId");

CREATE INDEX "InvoiceTaxLine_invoiceId_idx" ON public."InvoiceTaxLine" USING btree ("invoiceId");

CREATE UNIQUE INDEX "InvoiceTaxLine_invoiceId_taxRate_regimeKey_key" ON public."InvoiceTaxLine" USING btree ("invoiceId", "taxRate", "regimeKey");

CREATE UNIQUE INDEX "Invoice_cancelsId_key" ON public."Invoice" USING btree ("cancelsId");

CREATE INDEX "Invoice_establishmentId_aeatStatus_idx" ON public."Invoice" USING btree ("establishmentId", "aeatStatus");

CREATE INDEX "Invoice_establishmentId_issuedAt_idx" ON public."Invoice" USING btree ("establishmentId", "issuedAt");

CREATE UNIQUE INDEX "Invoice_establishmentId_series_number_key" ON public."Invoice" USING btree ("establishmentId", series, number);

CREATE UNIQUE INDEX "Invoice_establishmentId_series_sequence_key" ON public."Invoice" USING btree ("establishmentId", series, sequence);

CREATE INDEX "Invoice_orderId_idx" ON public."Invoice" USING btree ("orderId");

CREATE UNIQUE INDEX "Invoice_rectifiesId_key" ON public."Invoice" USING btree ("rectifiesId");

CREATE UNIQUE INDEX "Invoice_substitutesId_key" ON public."Invoice" USING btree ("substitutesId");

CREATE INDEX "MenuItem_productId_idx" ON public."MenuItem" USING btree ("productId");

CREATE INDEX "MenuItem_sectionId_idx" ON public."MenuItem" USING btree ("sectionId");

CREATE INDEX "MenuSection_menuId_idx" ON public."MenuSection" USING btree ("menuId");

CREATE INDEX "Menu_establishmentId_idx" ON public."Menu" USING btree ("establishmentId");

CREATE UNIQUE INDEX "Menu_slug_key" ON public."Menu" USING btree (slug);

CREATE INDEX "OrderAdjustment_itemId_idx" ON public."OrderAdjustment" USING btree ("itemId");

CREATE INDEX "OrderAdjustment_orderId_idx" ON public."OrderAdjustment" USING btree ("orderId");

CREATE INDEX "OrderAuditLog_establishmentId_createdAt_idx" ON public."OrderAuditLog" USING btree ("establishmentId", "createdAt");

CREATE INDEX "OrderAuditLog_targetType_targetId_createdAt_idx" ON public."OrderAuditLog" USING btree ("targetType", "targetId", "createdAt");

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");

CREATE INDEX "OrderItem_productId_idx" ON public."OrderItem" USING btree ("productId");

CREATE INDEX "Order_cashCloseId_idx" ON public."Order" USING btree ("cashCloseId");

CREATE INDEX "Order_establishmentId_createdAt_idx" ON public."Order" USING btree ("establishmentId", "createdAt");

CREATE INDEX "Order_establishmentId_createdById_createdAt_idx" ON public."Order" USING btree ("establishmentId", "createdById", "createdAt");

CREATE INDEX "Order_establishmentId_status_idx" ON public."Order" USING btree ("establishmentId", status);

CREATE INDEX "Order_tableId_idx" ON public."Order" USING btree ("tableId");

CREATE INDEX "PrintJob_establishmentId_status_createdAt_idx" ON public."PrintJob" USING btree ("establishmentId", status, "createdAt");

CREATE UNIQUE INDEX "PrinterConfig_establishmentId_key" ON public."PrinterConfig" USING btree ("establishmentId");

CREATE UNIQUE INDEX "PrinterPairing_code_key" ON public."PrinterPairing" USING btree (code);

CREATE INDEX "PrinterPairing_establishmentId_idx" ON public."PrinterPairing" USING btree ("establishmentId");

CREATE INDEX "Product_categoryId_deletedAt_idx" ON public."Product" USING btree ("categoryId", "deletedAt");

CREATE INDEX "ShiftExchange_requesterId_idx" ON public."ShiftExchange" USING btree ("requesterId");

CREATE INDEX "ShiftExchange_shiftId_idx" ON public."ShiftExchange" USING btree ("shiftId");

CREATE UNIQUE INDEX "ShiftExchange_shiftId_pending_key" ON public."ShiftExchange" USING btree ("shiftId") WHERE (status = 'PENDING'::text);

CREATE INDEX "ShiftExchange_targetId_idx" ON public."ShiftExchange" USING btree ("targetId");

CREATE INDEX "Shift_establishmentId_startTime_idx" ON public."Shift" USING btree ("establishmentId", "startTime");

CREATE INDEX "Shift_userId_startTime_idx" ON public."Shift" USING btree ("userId", "startTime");

CREATE UNIQUE INDEX "TimeEntry_establishmentId_sequence_key" ON public."TimeEntry" USING btree ("establishmentId", sequence);

CREATE INDEX "TimeEntry_establishmentId_userId_workdayDate_idx" ON public."TimeEntry" USING btree ("establishmentId", "userId", "workdayDate");

CREATE INDEX "TimeEntry_establishmentId_workdayDate_idx" ON public."TimeEntry" USING btree ("establishmentId", "workdayDate");

CREATE INDEX "TimeEntry_rootId_idx" ON public."TimeEntry" USING btree ("rootId");

CREATE UNIQUE INDEX "TimeEntry_supersedesId_key" ON public."TimeEntry" USING btree ("supersedesId");

CREATE UNIQUE INDEX "UserPreferences_userId_key" ON public."UserPreferences" USING btree ("userId");

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

CREATE UNIQUE INDEX "User_firebaseUid_key" ON public."User" USING btree ("firebaseUid");

CREATE TRIGGER time_entry_no_delete BEFORE DELETE ON public."TimeEntry" FOR EACH ROW EXECUTE FUNCTION public.time_entry_append_only();

CREATE TRIGGER time_entry_no_update BEFORE UPDATE ON public."TimeEntry" FOR EACH ROW EXECUTE FUNCTION public.time_entry_append_only();

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AiUsage"
    ADD CONSTRAINT "AiUsage_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuthEvent"
    ADD CONSTRAINT "AuthEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."AuthIdentity"
    ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuthSession"
    ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."AuthToken"
    ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."BetaTester"
    ADD CONSTRAINT "BetaTester_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."CashClose"
    ADD CONSTRAINT "CashClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."CashClose"
    ADD CONSTRAINT "CashClose_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."EstablishmentMember"
    ADD CONSTRAINT "EstablishmentMember_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."EstablishmentMember"
    ADD CONSTRAINT "EstablishmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."EstablishmentSettings"
    ADD CONSTRAINT "EstablishmentSettings_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."EstablishmentSubscription"
    ADD CONSTRAINT "EstablishmentSubscription_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."InvoiceTaxLine"
    ADD CONSTRAINT "InvoiceTaxLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_cancelsId_fkey" FOREIGN KEY ("cancelsId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_rectifiesId_fkey" FOREIGN KEY ("rectifiesId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_substitutesId_fkey" FOREIGN KEY ("substitutesId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."MenuItem"
    ADD CONSTRAINT "MenuItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."MenuItem"
    ADD CONSTRAINT "MenuItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."MenuSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."MenuSection"
    ADD CONSTRAINT "MenuSection_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."OrderAdjustment"
    ADD CONSTRAINT "OrderAdjustment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."OrderItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."OrderAdjustment"
    ADD CONSTRAINT "OrderAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."OrderAuditLog"
    ADD CONSTRAINT "OrderAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."OrderAuditLog"
    ADD CONSTRAINT "OrderAuditLog_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_cashCloseId_fkey" FOREIGN KEY ("cashCloseId") REFERENCES public."CashClose"(id) ON UPDATE CASCADE;

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES public."Table"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."PrintJob"
    ADD CONSTRAINT "PrintJob_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PrinterConfig"
    ADD CONSTRAINT "PrinterConfig_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."PrinterPairing"
    ADD CONSTRAINT "PrinterPairing_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ShiftExchange"
    ADD CONSTRAINT "ShiftExchange_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."ShiftExchange"
    ADD CONSTRAINT "ShiftExchange_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."ShiftExchange"
    ADD CONSTRAINT "ShiftExchange_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."Table"
    ADD CONSTRAINT "Table_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES public."Establishment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."Shift"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES public."TimeEntry"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."TimeEntry"
    ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."UserPreferences"
    ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
