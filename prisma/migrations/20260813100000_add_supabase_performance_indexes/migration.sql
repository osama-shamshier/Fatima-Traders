-- Add indexes for the query patterns that became expensive after moving to remote Postgres.
-- Postgres does not automatically index foreign keys, and most app reads filter by
-- soft-delete flags, dates, branch, product, buyer/supplier, or FIFO layer state.

CREATE INDEX IF NOT EXISTS "users_branchId_idx" ON "users"("branchId");
CREATE INDEX IF NOT EXISTS "users_isDeleted_isActive_idx" ON "users"("isDeleted", "isActive");
CREATE INDEX IF NOT EXISTS "roles_isDeleted_idx" ON "roles"("isDeleted");
CREATE INDEX IF NOT EXISTS "user_roles_roleId_idx" ON "user_roles"("roleId");
CREATE INDEX IF NOT EXISTS "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");
CREATE INDEX IF NOT EXISTS "branches_isDeleted_isActive_idx" ON "branches"("isDeleted", "isActive");

CREATE INDEX IF NOT EXISTS "cash_counters_branchId_idx" ON "cash_counters"("branchId");
CREATE INDEX IF NOT EXISTS "cash_counters_isDeleted_isActive_idx" ON "cash_counters"("isDeleted", "isActive");
CREATE INDEX IF NOT EXISTS "cash_counter_sessions_cashCounterId_idx" ON "cash_counter_sessions"("cashCounterId");
CREATE INDEX IF NOT EXISTS "cash_counter_sessions_userId_idx" ON "cash_counter_sessions"("userId");
CREATE INDEX IF NOT EXISTS "cash_counter_sessions_status_idx" ON "cash_counter_sessions"("status");
CREATE INDEX IF NOT EXISTS "cash_counter_sessions_openedAt_idx" ON "cash_counter_sessions"("openedAt");

CREATE INDEX IF NOT EXISTS "product_categories_isDeleted_idx" ON "product_categories"("isDeleted");
CREATE INDEX IF NOT EXISTS "units_isDeleted_idx" ON "units"("isDeleted");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "products_unitId_idx" ON "products"("unitId");
CREATE INDEX IF NOT EXISTS "products_isDeleted_isActive_createdAt_idx" ON "products"("isDeleted", "isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "inventory_branchId_idx" ON "inventory"("branchId");
CREATE INDEX IF NOT EXISTS "inventory_quantity_idx" ON "inventory"("quantity");
CREATE INDEX IF NOT EXISTS "inventory_layers_branchId_productId_remainingQty_createdAt_idx" ON "inventory_layers"("branchId", "productId", "remainingQty", "createdAt");
CREATE INDEX IF NOT EXISTS "inventory_layers_purchaseItemId_idx" ON "inventory_layers"("purchaseItemId");
CREATE INDEX IF NOT EXISTS "stock_movements_branchId_createdAt_idx" ON "stock_movements"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "stock_adjustments_branchId_createdAt_idx" ON "stock_adjustments"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_adjustments_productId_createdAt_idx" ON "stock_adjustments"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_adjustments_createdById_idx" ON "stock_adjustments"("createdById");
CREATE INDEX IF NOT EXISTS "stock_adjustments_isDeleted_idx" ON "stock_adjustments"("isDeleted");

CREATE INDEX IF NOT EXISTS "stock_transfers_sourceBranchId_idx" ON "stock_transfers"("sourceBranchId");
CREATE INDEX IF NOT EXISTS "stock_transfers_destBranchId_idx" ON "stock_transfers"("destBranchId");
CREATE INDEX IF NOT EXISTS "stock_transfers_createdById_idx" ON "stock_transfers"("createdById");
CREATE INDEX IF NOT EXISTS "stock_transfers_status_transferDate_idx" ON "stock_transfers"("status", "transferDate");
CREATE INDEX IF NOT EXISTS "stock_transfers_isDeleted_transferDate_idx" ON "stock_transfers"("isDeleted", "transferDate");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_stockTransferId_idx" ON "stock_transfer_items"("stockTransferId");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_productId_idx" ON "stock_transfer_items"("productId");

CREATE INDEX IF NOT EXISTS "suppliers_isDeleted_isActive_idx" ON "suppliers"("isDeleted", "isActive");
CREATE INDEX IF NOT EXISTS "purchases_supplierId_idx" ON "purchases"("supplierId");
CREATE INDEX IF NOT EXISTS "purchases_branchId_purchaseDate_idx" ON "purchases"("branchId", "purchaseDate");
CREATE INDEX IF NOT EXISTS "purchases_createdById_idx" ON "purchases"("createdById");
CREATE INDEX IF NOT EXISTS "purchases_paymentStatus_idx" ON "purchases"("paymentStatus");
CREATE INDEX IF NOT EXISTS "purchases_isDeleted_purchaseDate_idx" ON "purchases"("isDeleted", "purchaseDate");
CREATE INDEX IF NOT EXISTS "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX IF NOT EXISTS "purchase_items_productId_idx" ON "purchase_items"("productId");
CREATE INDEX IF NOT EXISTS "supplier_payments_supplierId_paymentDate_idx" ON "supplier_payments"("supplierId", "paymentDate");
CREATE INDEX IF NOT EXISTS "supplier_payments_purchaseId_idx" ON "supplier_payments"("purchaseId");
CREATE INDEX IF NOT EXISTS "supplier_payments_isDeleted_createdAt_idx" ON "supplier_payments"("isDeleted", "createdAt");

CREATE INDEX IF NOT EXISTS "buyers_isDeleted_isActive_idx" ON "buyers"("isDeleted", "isActive");
CREATE INDEX IF NOT EXISTS "sales_buyerId_idx" ON "sales"("buyerId");
CREATE INDEX IF NOT EXISTS "sales_branchId_createdAt_idx" ON "sales"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_cashCounterId_idx" ON "sales"("cashCounterId");
CREATE INDEX IF NOT EXISTS "sales_sessionId_idx" ON "sales"("sessionId");
CREATE INDEX IF NOT EXISTS "sales_createdById_idx" ON "sales"("createdById");
CREATE INDEX IF NOT EXISTS "sales_paymentStatus_idx" ON "sales"("paymentStatus");
CREATE INDEX IF NOT EXISTS "sales_dueDate_idx" ON "sales"("dueDate");
CREATE INDEX IF NOT EXISTS "sales_isDeleted_createdAt_idx" ON "sales"("isDeleted", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx" ON "sale_items"("saleId");
CREATE INDEX IF NOT EXISTS "sale_items_productId_idx" ON "sale_items"("productId");
CREATE INDEX IF NOT EXISTS "buyer_payments_buyerId_paymentDate_idx" ON "buyer_payments"("buyerId", "paymentDate");
CREATE INDEX IF NOT EXISTS "buyer_payments_saleId_idx" ON "buyer_payments"("saleId");
CREATE INDEX IF NOT EXISTS "buyer_payments_isDeleted_createdAt_idx" ON "buyer_payments"("isDeleted", "createdAt");

CREATE INDEX IF NOT EXISTS "sales_returns_saleId_idx" ON "sales_returns"("saleId");
CREATE INDEX IF NOT EXISTS "sales_returns_buyerId_idx" ON "sales_returns"("buyerId");
CREATE INDEX IF NOT EXISTS "sales_returns_branchId_returnDate_idx" ON "sales_returns"("branchId", "returnDate");
CREATE INDEX IF NOT EXISTS "sales_returns_isDeleted_createdAt_idx" ON "sales_returns"("isDeleted", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_return_items_salesReturnId_idx" ON "sales_return_items"("salesReturnId");
CREATE INDEX IF NOT EXISTS "sales_return_items_saleItemId_idx" ON "sales_return_items"("saleItemId");

CREATE INDEX IF NOT EXISTS "expense_categories_isDeleted_idx" ON "expense_categories"("isDeleted");
CREATE INDEX IF NOT EXISTS "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX IF NOT EXISTS "expenses_branchId_expenseDate_idx" ON "expenses"("branchId", "expenseDate");
CREATE INDEX IF NOT EXISTS "expenses_createdById_idx" ON "expenses"("createdById");
CREATE INDEX IF NOT EXISTS "expenses_isDeleted_createdAt_idx" ON "expenses"("isDeleted", "createdAt");
