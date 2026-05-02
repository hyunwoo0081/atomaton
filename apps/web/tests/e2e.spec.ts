import { test, expect } from '@playwright/test'

test.describe('Atomaton E2E Tests (Mocked API)', () => {
  const email = 'test-user@example.com'
  const password = 'password123'

  test.beforeEach(async ({ page }) => {
    // Mock all API requests to port 3000
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User registered' }),
      })
    })

    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: { email, is_developer: true },
        }),
      })
    })

    await page.route('**/workflows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'wf-1',
              name: 'My E2E Workflow',
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]),
        })
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'wf-2', name: 'New Workflow' }),
        })
      }
    })

    await page.route('**/workflows/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'wf-1',
          name: 'My E2E Workflow',
          ui_config: { nodes: [], edges: [] },
          settings: { enableFailureAlert: false, failureWebhookUrl: '' },
        }),
      })
    })

    await page.route('**/accounts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ logs: [] }),
      })
    })
  })

  test('TC-AUTH-01: Sign up and Login', async ({ page }) => {
    // Playwright captures the register call via route
    await page.request.post('http://localhost:3000/auth/register', {
      data: { email, password },
    })

    await page.goto('/login')

    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // REDIRECTION CHECK
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Workflows')).toBeVisible()
  })

  test('TC-WF-01: Create Workflow', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Handle the browser prompt
    page.on('dialog', (dialog) => dialog.accept('My E2E Workflow'))

    // Wait for the button and click
    await page.getByRole('button', { name: /New Workflow/i }).click()

    // Verify Workflow appears in the mocked list
    await expect(page.getByText('My E2E Workflow')).toBeVisible()
  })

  test('TC-WF-02: Configure Workflow', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Click the mocked workflow
    await page.getByText('My E2E Workflow').first().click()

    await expect(page).toHaveURL(/\/workflow\/.+/)

    // Add Trigger
    await page.getByRole('button', { name: /Add Trigger/i }).click()

    // Verify Config Panel opens
    await expect(page.getByText('Configuration')).toBeVisible()

    // Close Config Panel
    await page.click('text=✕')
  })
})
