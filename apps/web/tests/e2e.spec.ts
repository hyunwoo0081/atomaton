import { test, expect } from '@playwright/test';

const generateRandomEmail = () => `test-${Math.random().toString(36).substring(7)}@example.com`;

test.describe('Atomaton E2E Tests', () => {
  let email: string;
  const password = 'password123';

  test.beforeAll(async () => {
    email = generateRandomEmail();
  });

  test('TC-AUTH-01: Sign up and Login', async ({ page }) => {
    // 1. Go to Login page (assuming registration is handled via API or separate page, but for now we'll use API to register first or just test login if registration UI isn't ready)
    // Since we don't have a registration UI in the checklist implementation yet (only Login UI), 
    // we will simulate registration via API call or assume the user exists.
    // However, to make this self-contained, let's try to register via API first.
    
    await page.request.post('http://localhost:3000/auth/register', {
      data: {
        email,
        password,
      }
    });

    await page.goto('/login');
    
    // 2. Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // 3. Click Sign in
    await page.click('button[type="submit"]');
    
    // 4. Verify redirection to Dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Workflows')).toBeVisible();
  });

  test('TC-WF-01: Create Workflow', async ({ page }) => {
    // Login first (since state is not shared between tests by default unless configured)
    // For simplicity in this example, we'll just re-login or use storage state in a real setup.
    // Here we repeat login for stability.
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // 1. Click New Workflow
    // Handling prompt in Playwright
    page.on('dialog', dialog => dialog.accept('My E2E Workflow'));
    await page.click('text=+ New Workflow');

    // 2. Verify Workflow appears (might need reload or wait for list update)
    // The current implementation refreshes the list after creation.
    await expect(page.getByText('My E2E Workflow')).toBeVisible();
  });

  test('TC-WF-02: Configure Workflow', async ({ page }) => {
    // Login again
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Go to the workflow created in previous step
    await page.click('text=My E2E Workflow');
    
    // Verify Editor URL
    await expect(page).toHaveURL(/\/workflow\/.+/);
    
    // 1. Add Trigger (Click placeholder)
    await page.click('text=Add Trigger');
    
    // 2. Verify Config Panel opens
    await expect(page.getByText('Configuration')).toBeVisible();
    
    // 3. Close Config Panel
    await page.click('text=✕');
  });
});
