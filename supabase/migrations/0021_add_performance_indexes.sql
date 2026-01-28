-- Performance optimization: Add missing indexes on foreign keys and common query patterns
-- This migration adds indexes to improve query performance without changing the schema

-- Critical indexes for team_expenses (main table for expense queries)
CREATE INDEX IF NOT EXISTS idx_team_expenses_team_id_deleted ON team_expenses(team_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_expenses_category_id ON team_expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_expenses_subcategory_id ON team_expenses(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_expenses_status ON team_expenses(status);
CREATE INDEX IF NOT EXISTS idx_team_expenses_expense_date ON team_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_team_expenses_payment_status ON team_expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_team_expenses_recurring_id ON team_expenses(recurring_expense_id) WHERE recurring_expense_id IS NOT NULL;

-- Composite indexes for common expense queries
CREATE INDEX IF NOT EXISTS idx_team_expenses_team_status_date ON team_expenses(team_id, status, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_expenses_team_date ON team_expenses(team_id, expense_date DESC) WHERE deleted_at IS NULL;

-- Foreign key indexes for expense-related tables
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_log_expense_id ON expense_audit_log(expense_id);

-- Indexes for team_expense_categories
CREATE INDEX IF NOT EXISTS idx_team_expense_categories_parent_id ON team_expense_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_expense_categories_team_id ON team_expense_categories(team_id);

-- Indexes for team_recurring_expenses
CREATE INDEX IF NOT EXISTS idx_team_recurring_expenses_team_id ON team_recurring_expenses(team_id);
CREATE INDEX IF NOT EXISTS idx_team_recurring_expenses_category_id ON team_recurring_expenses(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_recurring_expenses_subcategory_id ON team_recurring_expenses(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_recurring_expenses_active ON team_recurring_expenses(team_id, is_active) WHERE is_active = true;

-- Indexes for team_memberships
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_active ON team_memberships(team_id, is_active) WHERE is_active = true;

-- Indexes for team_invites
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_status ON team_invites(team_id, status);

-- Indexes for stack_users
CREATE INDEX IF NOT EXISTS idx_stack_users_email ON stack_users(email);
CREATE INDEX IF NOT EXISTS idx_stack_users_team_id ON stack_users(team_id) WHERE team_id IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE team_expenses;
ANALYZE team_expense_categories;
ANALYZE team_recurring_expenses;
ANALYZE team_memberships;
ANALYZE team_invites;
ANALYZE stack_users;
ANALYZE expense_attachments;
ANALYZE expense_audit_log;
