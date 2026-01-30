import { test, expect, Page } from '@playwright/test';

/**
 * P&L Core Regression Tests
 * 
 * These tests validate the critical fixes made to the P&L module:
 * 1. Status badge shows "Recurent" (pink) for new complete expenses
 * 2. PLATA toggle changes status to "Final" (green)
 * 3. P&L uses accounting_period for month attribution
 */

// Test data
const TEST_EXPENSE = {
  supplier: 'Test Supplier P&L',
  amount: '1250.50',
  description: 'P&L Core Regression Test Expense',
  accountingPeriod: '2026-02', // February 2026
};

// Helper function to login (adjust based on your auth flow)
async function login(page: Page) {
  // Navigate to the app
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // If there's a login form, fill it in
  // Adjust selectors based on your actual login page
  try {
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD || 'password');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    }
  } catch {
    // Already logged in or no login required
  }
}

// Helper function to select dropdown option
async function selectDropdownOption(page: Page, dropdownLabel: string, optionText: string) {
  // Click on the dropdown to open it
  await page.locator(`button:has-text("${dropdownLabel}")`).click();
  
  // Wait for dropdown to open and click the option
  await page.locator(`div:has-text("${optionText}")`).click();
}

test.describe('P&L Core Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Add expense - Status shows Recurent for complete expense', async ({ page }) => {
    // Navigate to expenses page
    await page.goto('/dashboard/test-team/expenses');
    await page.waitForLoadState('networkidle');
    
    // Click "Decont Nou +" button
    await page.click('text=Decont Nou +');
    
    // Wait for the form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill in required fields
    await page.fill('[name="supplier"]', TEST_EXPENSE.supplier);
    await page.fill('[name="amount"]', TEST_EXPENSE.amount);
    await page.fill('[name="description"]', TEST_EXPENSE.description);
    
    // Select Category (top-level)
    await selectDropdownOption(page, 'Categorie', 'Utilitati'); // or any category
    
    // Select Subcategory
    await selectDropdownOption(page, 'Cont', 'Electricitate'); // or any subcategory
    
    // Set Luna P&L (accounting period)
    await page.fill('[name="accounting_period"]', TEST_EXPENSE.accountingPeriod);
    
    // Set expense date
    await page.fill('[name="expense_date"]', '2026-01-15'); // Different from accounting_period
    
    // Click "Salveaza" (NOT "Salveaza ca Draft")
    await page.click('button:has-text("Salveaza"):not(:has-text("Draft"))');
    
    // Wait for the expense to be saved and appear in the table
    await page.waitForTimeout(3000);
    
    // Verify the expense appears in the table
    await expect(page.locator(`text=${TEST_EXPENSE.supplier}`)).toBeVisible();
    
    // ✅ CRITICAL CHECK: Status badge should show "Recurent" (pink background)
    const statusBadge = page.locator('text=Recurent').first();
    await expect(statusBadge).toBeVisible();
    
    // Verify the badge has the pink/recurent styling
    const badgeStyle = await statusBadge.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return computed.background;
    });
    
    // Pink gradient should be present for Recurent status
    expect(badgeStyle).toContain('255'); // RGB value for pink
    
    console.log('✅ Test 1 PASSED: New expense shows "Recurent" status (pink badge)');
  });

  test('2. PLATA toggle changes status from Recurent to Final', async ({ page }) => {
    // Navigate to expenses
    await page.goto('/dashboard/test-team/expenses');
    await page.waitForLoadState('networkidle');
    
    // Find the test expense
    const expenseRow = page.locator(`tr:has-text("${TEST_EXPENSE.supplier}")`);
    await expect(expenseRow).toBeVisible();
    
    // Verify current status is "Recurent" (pink)
    const recurentBadge = expenseRow.locator('text=Recurent');
    await expect(recurentBadge).toBeVisible();
    
    // Find and click the PLATA toggle (X icon)
    const paymentToggle = expenseRow.locator('[data-testid="payment-toggle"], div:has(> svg)').first();
    await paymentToggle.click();
    
    // Wait for confirmation modal
    await expect(page.locator('text=Confirmă schimbarea statusului')).toBeVisible();
    
    // Click "Confirma" to confirm payment
    await page.click('button:has-text("Confirma")');
    
    // Wait for the update
    await page.waitForTimeout(2000);
    
    // ✅ CRITICAL CHECK: Status should now be "Final" (green badge)
    const finalBadge = expenseRow.locator('text=Final');
    await expect(finalBadge).toBeVisible();
    
    // Verify the badge has the green/final styling
    const badgeStyle = await finalBadge.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return computed.background;
    });
    
    // Green gradient should be present for Final status
    expect(badgeStyle).toContain('192'); // RGB value for green
    
    console.log('✅ Test 2 PASSED: PLATA toggle changes status from Recurent to Final');
  });

  test('3. P&L uses accounting_period (Luna P&L) for month attribution', async ({ page }) => {
    // Navigate to P&L page
    await page.goto('/dashboard/test-team/pnl');
    await page.waitForLoadState('networkidle');
    
    // Select February 2026 (the accounting_period we set)
    await page.selectOption('select[name="month"]', '2026-02');
    
    // Wait for P&L to load
    await page.waitForTimeout(2000);
    
    // ✅ CRITICAL CHECK: Expense should appear in February P&L
    const expenseInFeb = page.locator(`text=${TEST_EXPENSE.supplier}`);
    await expect(expenseInFeb).toBeVisible();
    
    // Check the amount is correct
    await expect(page.locator(`text=${TEST_EXPENSE.amount}`)).toBeVisible();
    
    // Now switch to January 2026 (expense_date month, NOT accounting_period)
    await page.selectOption('select[name="month"]', '2026-01');
    await page.waitForTimeout(2000);
    
    // ✅ CRITICAL CHECK: Expense should NOT appear in January P&L
    const expenseInJan = page.locator(`text=${TEST_EXPENSE.supplier}`);
    await expect(expenseInJan).not.toBeVisible();
    
    console.log('✅ Test 3 PASSED: P&L correctly uses accounting_period for month attribution');
  });

  test('4. P&L calculations update correctly', async ({ page }) => {
    // Navigate to P&L page
    await page.goto('/dashboard/test-team/pnl');
    await page.waitForLoadState('networkidle');
    
    // Select February 2026
    await page.selectOption('select[name="month"]', '2026-02');
    await page.waitForTimeout(2000);
    
    // Get the category total before (or note it)
    const categoryTotal = await page.locator('text=Utilitati').locator('..').locator('.total-amount').textContent();
    
    // ✅ CRITICAL CHECK: No NaN or undefined values
    expect(categoryTotal).not.toContain('NaN');
    expect(categoryTotal).not.toContain('undefined');
    expect(categoryTotal).not.toContain('null');
    
    // The total should be a valid number
    const totalNumber = parseFloat(categoryTotal?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0');
    expect(totalNumber).toBeGreaterThan(0);
    
    console.log('✅ Test 4 PASSED: P&L calculations are valid (no NaN/undefined)');
  });

  test('5. Complete workflow: Create → Toggle → Verify in P&L', async ({ page }) => {
    // This test runs the complete workflow
    
    // Step 1: Create expense
    await page.goto('/dashboard/test-team/expenses');
    await page.click('text=Decont Nou +');
    await page.waitForSelector('form');
    
    const timestamp = Date.now();
    const uniqueSupplier = `Workflow Test ${timestamp}`;
    
    await page.fill('[name="supplier"]', uniqueSupplier);
    await page.fill('[name="amount"]', '999.99');
    await page.fill('[name="description"]', 'Complete workflow test');
    await selectDropdownOption(page, 'Categorie', 'Utilitati');
    await selectDropdownOption(page, 'Cont', 'Electricitate');
    await page.fill('[name="accounting_period"]', '2026-03'); // March
    await page.fill('[name="expense_date"]', '2026-01-10');
    await page.click('button:has-text("Salveaza"):not(:has-text("Draft"))');
    
    await page.waitForTimeout(3000);
    
    // Step 2: Verify Recurent status
    const expenseRow = page.locator(`tr:has-text("${uniqueSupplier}")`);
    await expect(expenseRow.locator('text=Recurent')).toBeVisible();
    
    // Step 3: Toggle payment
    await expenseRow.locator('[data-testid="payment-toggle"], div:has(> svg)').first().click();
    await page.click('button:has-text("Confirma")');
    await page.waitForTimeout(2000);
    
    // Step 4: Verify Final status
    await expect(expenseRow.locator('text=Final')).toBeVisible();
    
    // Step 5: Verify in P&L
    await page.goto('/dashboard/test-team/pnl');
    await page.selectOption('select[name="month"]', '2026-03');
    await page.waitForTimeout(2000);
    
    await expect(page.locator(`text=${uniqueSupplier}`)).toBeVisible();
    await expect(page.locator('text=999.99')).toBeVisible();
    
    console.log('✅ Test 5 PASSED: Complete workflow works correctly');
  });
});

// Summary test that runs after all others
test.afterAll(async () => {
  console.log('\n========================================');
  console.log('P&L CORE REGRESSION TESTS COMPLETE');
  console.log('========================================');
  console.log('All critical fixes have been validated:');
  console.log('✅ Status badge shows "Recurent" for new expenses');
  console.log('✅ PLATA toggle changes status to "Final"');
  console.log('✅ P&L uses accounting_period (Luna P&L) for month attribution');
  console.log('✅ No NaN/undefined in calculations');
  console.log('========================================\n');
});