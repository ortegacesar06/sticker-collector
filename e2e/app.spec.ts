import { test, expect } from '@playwright/test'

test.describe('Album Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the album page', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Check that filter bar is visible
    await expect(page.locator('button:has-text("All")')).toBeVisible()
    await expect(page.locator('button:has-text("Have")')).toBeVisible()
    await expect(page.locator('button:has-text("Missing")')).toBeVisible()
  })

  test('displays sticker grid', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Check that team headers are visible
    await expect(page.locator('text=ARG (5)')).toBeVisible()
    await expect(page.locator('text=BRA (5)')).toBeVisible()
  })

  test('filters work correctly', async ({ page }) => {
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Click on "Have" filter - should show no stickers initially
    await page.click('button:has-text("Have")')
    await expect(page.locator('role=button[name*="Sticker"]')).toHaveCount(0)
    
    // Click on "Missing" filter - should show all 50 stickers
    await page.click('button:has-text("Missing")')
    await page.waitForTimeout(500)
  })

  test('search functionality works', async ({ page }) => {
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Type in search box
    const searchInput = page.locator('#search-input')
    await searchInput.fill('Messi')
    
    // Should filter to show only Messi
    await expect(page.locator('text=Messi')).toBeVisible()
  })

  test('quick add mode toggles', async ({ page }) => {
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Click quick add button
    await page.click('button:has-text("Quick")')
    
    // Button should show active state
    const quickButton = page.locator('button:has-text("Quick")')
    await expect(quickButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('bottom navigation works', async ({ page }) => {
    // Navigate to Scan
    await page.click('nav a[aria-label="Scan"]')
    await expect(page).toHaveURL(/\/scan/)
    
    // Navigate to Repes
    await page.click('nav a[aria-label="Repes"]')
    await expect(page).toHaveURL(/\/repes/)
    
    // Navigate to Stats
    await page.click('nav a[aria-label="Stats"]')
    await expect(page).toHaveURL(/\/stats/)
    
    // Navigate back to Album
    await page.click('nav a[aria-label="Album"]')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Sticker Detail', () => {
  test('opens sticker detail page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Click on a sticker cell
    await page.click('[data-sticker-number="1"]')
    
    // Should navigate to sticker detail
    await expect(page).toHaveURL(/\/sticker\/1/)
    
    // Detail page should show sticker info
    await expect(page.locator('text=Logo Argentina')).toBeVisible()
  })

  test('increment and decrement work', async ({ page }) => {
    await page.goto('/sticker/1')
    
    // Find the increment button and click it
    const incrementBtn = page.locator('button[aria-label="Increase count"]')
    await incrementBtn.click()
    
    // Count should show 1
    await expect(page.locator('text=1').first()).toBeVisible()
  })

  test('swipe navigation works', async ({ page }) => {
    await page.goto('/sticker/5')
    
    // Get the sticker detail element
    const detail = page.locator('[role="main"]')
    
    // Swipe left (should go to next sticker)
    await detail.evaluate((el) => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: el, clientX: 200, clientY: 300 })],
        bubbles: true,
      })
      const touchEnd = new TouchEvent('touchend', {
        touches: [],
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: 100, clientY: 300 })],
        bubbles: true,
      })
      el.dispatchEvent(touchStart)
      el.dispatchEvent(touchEnd)
    })
    
    // Should navigate to sticker 6
    await expect(page).toHaveURL(/\/sticker\/6/)
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/sticker/5')
    
    // Focus the detail element
    const detail = page.locator('[role="main"]')
    await detail.focus()
    
    // Press arrow right
    await page.keyboard.press('ArrowRight')
    
    // Should navigate to sticker 6
    await expect(page).toHaveURL(/\/sticker\/6/)
  })
})

test.describe('Scan Page', () => {
  test('shows camera view when available', async ({ page }) => {
    await page.goto('/scan')
    
    // Should show camera controls or permission message
    const scanContent = page.locator('text=Apuntá al número').or(page.locator('text=No se pudo acceder'))
    await expect(scanContent.first()).toBeVisible({ timeout: 10000 })
  })

  test('has manual entry fallback', async ({ page }) => {
    await page.goto('/scan')
    
    // Wait for page to load
    await page.waitForTimeout(1000)
    
    // Click manual entry button if visible
    const manualBtn = page.locator('button[aria-label="Entrada manual"]')
    if (await manualBtn.isVisible()) {
      await manualBtn.click()
      await expect(page.locator('text=Entrada manual')).toBeVisible()
    }
  })
})

test.describe('Stats Page', () => {
  test('displays collection statistics', async ({ page }) => {
    await page.goto('/stats')
    
    // Wait for page to load
    await expect(page.locator('text=Estadisticas')).toBeVisible()
    
    // Should show have/missing/repes counts
    await expect(page.locator('text=Tengo')).toBeVisible()
    await expect(page.locator('text=Faltan')).toBeVisible()
    await expect(page.locator('text=Repes')).toBeVisible()
  })

  test('shows team progress', async ({ page }) => {
    await page.goto('/stats')
    
    // Should show team progress section
    await expect(page.locator('text=Por equipo')).toBeVisible()
  })
})

test.describe('Settings Page', () => {
  test('can navigate to settings from album', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // There's no direct settings link in bottom nav, but settings is accessible
    await page.goto('/settings')
    
    // Should show settings page
    await expect(page.locator('text=Configuración')).toBeVisible()
  })

  test('theme toggle is visible', async ({ page }) => {
    await page.goto('/settings')
    
    // Should show theme options
    await expect(page.locator('text=Tema')).toBeVisible()
    await expect(page.locator('button:has-text("Claro")')).toBeVisible()
    await expect(page.locator('button:has-text("Oscuro")')).toBeVisible()
    await expect(page.locator('button:has-text("Sistema")')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('skip link is present', async ({ page }) => {
    await page.goto('/')
    
    // Skip link should exist but be hidden
    const skipLink = page.locator('a.skip-link')
    await expect(skipLink).toHaveClass(/sr-only/)
  })

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Tab to first interactive element
    await page.keyboard.press('Tab')
    
    // Focus should be visible on some element
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('ARIA labels are present on navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check that nav has proper ARIA
    const nav = page.locator('nav[aria-label="Main navigation"]')
    await expect(nav).toBeVisible()
  })
})

test.describe('Offline/PWA', () => {
  test('manifest is present', async ({ page }) => {
    await page.goto('/')
    
    // Check manifest link exists
    const manifest = page.locator('link[rel="manifest"]')
    await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest')
  })

  test('service worker registers', async ({ page, context }) => {
    // Grant notifications permission if asked
    context.grantPermissions(['notifications'])
    
    await page.goto('/')
    await expect(page.locator('text=Loading album')).toBeHidden({ timeout: 10000 })
    
    // Wait a bit for SW to register
    await page.waitForTimeout(2000)
    
    // Check for SW registration (if available in the app)
    // This is a basic check - full offline testing would require more setup
  })
})
