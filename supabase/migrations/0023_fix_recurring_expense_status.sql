-- Fix existing recurring expenses status
-- This migration corrects the status and payment_status fields for recurring expenses

-- 1. Fix expenses that were created with status='paid' but should be status='approved' (Final)
-- These are non-placeholder recurring expenses that were marked as paid
UPDATE team_expenses
SET 
  status = 'approved',
  payment_status = COALESCE(payment_status, 'paid')
WHERE 
  recurring_expense_id IS NOT NULL
  AND status = 'paid'
  AND is_recurring_placeholder = false;

-- 2. Fix placeholders that were not properly set up
-- Ensure all placeholders have status='placeholder' and payment_status='unpaid'
UPDATE team_expenses
SET 
  status = 'placeholder',
  payment_status = 'unpaid'
WHERE 
  recurring_expense_id IS NOT NULL
  AND is_recurring_placeholder = true
  AND (status != 'placeholder' OR payment_status != 'unpaid');

-- 3. For recurring expenses where is_recurring_placeholder is true but payment_status is 'paid',
-- change them to non-placeholders with status 'approved' (they were marked as paid)
UPDATE team_expenses
SET 
  status = 'approved',
  is_recurring_placeholder = false
WHERE 
  recurring_expense_id IS NOT NULL
  AND is_recurring_placeholder = true
  AND payment_status = 'paid';

-- 4. For recurring expenses with status 'approved' but wrong payment_status, fix payment_status
-- If status is 'approved' (Final) and it's from a recurring expense, it should be paid
UPDATE team_expenses
SET payment_status = 'paid'
WHERE 
  recurring_expense_id IS NOT NULL
  AND status = 'approved'
  AND (payment_status IS NULL OR payment_status = 'unpaid')
  AND is_recurring_placeholder = false;
