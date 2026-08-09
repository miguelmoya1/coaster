-- Postgres does not index foreign keys on its own, and none of these were declared. Every screen
-- that lists a bar's orders, menu or rota was running a sequential scan.

-- CreateIndex
CREATE INDEX "BarMember_barId_deletedAt_idx" ON "BarMember"("barId", "deletedAt");

-- CreateIndex
CREATE INDEX "Shift_barId_startTime_idx" ON "Shift"("barId", "startTime");

-- CreateIndex
CREATE INDEX "Shift_userId_startTime_idx" ON "Shift"("userId", "startTime");

-- CreateIndex
CREATE INDEX "ShiftExchange_requesterId_idx" ON "ShiftExchange"("requesterId");

-- CreateIndex
CREATE INDEX "ShiftExchange_targetId_idx" ON "ShiftExchange"("targetId");

-- CreateIndex
CREATE INDEX "Category_barId_deletedAt_idx" ON "Category"("barId", "deletedAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_deletedAt_idx" ON "Product"("categoryId", "deletedAt");

-- CreateIndex
CREATE INDEX "Order_barId_status_idx" ON "Order"("barId", "status");

-- CreateIndex
CREATE INDEX "Order_barId_createdAt_idx" ON "Order"("barId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderAdjustment_orderId_idx" ON "OrderAdjustment"("orderId");

-- CreateIndex
CREATE INDEX "OrderAdjustment_itemId_idx" ON "OrderAdjustment"("itemId");
