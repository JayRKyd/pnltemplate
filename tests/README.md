# P&L Core Regression Tests

## Overview
These Playwright E2E tests validate the critical fixes made to the P&L module:

1. **Status Badge Fix**: New complete expenses show "Recurent" (pink) instead of "Draft"
2. **PLATA Toggle Fix**: Clicking the toggle changes status from "Recurent" → "Final" (green)
3. **P&L Month Attribution Fix**: Uses `accounting_period` (Luna P&L) instead of `expense_date`

## Test Files

- `pnl-core-regression.spec.ts` - Main test suite covering all critical scenarios

## Running the Tests

### Option 1: Test Against Local Development Server

```bash
# Terminal 1: Start the dev server
npm run dev

# Terminal 2: Run the tests
npx playwright test

# Or run in headed mode (see the browser)
npx playwright test --headed

# Run specific test
npx playwright test -g "Status shows Recurent"
```

### Option 2: Test Against Deployed URL

```bash
# Set the test URL environment variable
$env:TEST_BASE_URL="https://pnltemplate.vercel.app"
npx playwright test
```

### Option 3: Run with UI Mode (Interactive)

```bash
npx playwright test --ui
```

## Test Scenarios

### Test 1: Add Expense - Status Shows Recurent
- Creates a new expense with all required fields
- Verifies status badge shows "Recurent" (pink)

### Test 2: PLATA Toggle Changes Status
- Finds the created expense
- Clicks the PLATA toggle
- Confirms status changes to "Final" (green)

### Test 3: P&L Month Attribution
- Navigates to P&L page
- Selects the accounting_period month
- Verifies expense appears
- Switches to expense_date month
- Verifies expense does NOT appear

### Test 4: P&L Calculations
- Checks for NaN/undefined values
- Validates totals are correct

### Test 5: Complete Workflow
- Runs the entire flow: Create → Toggle → Verify in P&L

## Configuration

The `playwright.config.ts` file contains:
- Test directory: `./tests`
- Base URL: `http://localhost:3000` (or `TEST_BASE_URL` env var)
- Browser: Chromium
- Screenshots/videos on failure
- HTML report generation

## Environment Variables

```bash
# Optional: Test against deployed URL
TEST_BASE_URL=https://pnltemplate.vercel.app

# Optional: Set test user credentials
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
```

## Viewing Results

After running tests:

```bash
# Open HTML report
npx playwright show-report
```

This will show:
- Test pass/fail status
- Screenshots (if tests failed)
- Video recordings (if tests failed)
- Trace viewer for debugging

## Troubleshooting

### Tests fail immediately
- Make sure the dev server is running (`npm run dev`)
- Or set `TEST_BASE_URL` to a deployed environment

### Login issues
- Update the `login()` function in the test file with your actual auth flow
- Or set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` environment variables

### Element not found
- The tests use generic selectors that may need adjustment
- Check the actual DOM structure and update selectors accordingly

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Playwright tests
  run: npx playwright test
  env:
    TEST_BASE_URL: ${{ github.event.deployment_status.target_url }}