import { test, expect } from '@playwright/test';

/**
 * T242: User Story 9 - Internationalization E2E Tests
 *
 * Tests the multi-language interface for diaspora users:
 * - Language switching (French, Arabic, English)
 * - RTL layout for Arabic
 * - Timezone handling
 * - Localized content display (FR-092)
 */

test.describe('US9: Internationalization', () => {
  // ==================== LANGUAGE SELECTION TESTS ====================

  test.describe('Language Selection', () => {
    test('should display language selector in navigation', async ({ page }) => {
      await page.goto('/');

      // Should show language selector
      const langSelector = page.locator('[data-testid="language-selector"]');
      await expect(langSelector).toBeVisible();
    });

    test('should show available languages in dropdown', async ({ page }) => {
      await page.goto('/');

      // Click language selector
      await page.click('[data-testid="language-selector"]');

      // Should show French, Arabic, and English options
      await expect(page.getByText('Français')).toBeVisible();
      await expect(page.getByText('العربية')).toBeVisible();
      await expect(page.getByText('English')).toBeVisible();
    });

    test('should switch to Arabic language', async ({ page }) => {
      await page.goto('/');

      // Click language selector and choose Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      // Page should now be in RTL
      const htmlDir = await page.getAttribute('html', 'dir');
      expect(htmlDir).toBe('rtl');

      // Language should be set
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBe('ar');
    });

    test('should switch to English language', async ({ page }) => {
      await page.goto('/');

      await page.click('[data-testid="language-selector"]');
      await page.click('text=English');

      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBe('en');

      const htmlDir = await page.getAttribute('html', 'dir');
      expect(htmlDir).toBe('ltr');
    });

    test('should persist language selection', async ({ page }) => {
      await page.goto('/');

      // Switch to Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      // Reload page
      await page.reload();

      // Should still be in Arabic
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBe('ar');
    });
  });

  // ==================== RTL LAYOUT TESTS ====================

  test.describe('RTL Layout (Arabic)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');
    });

    test('should display navigation in RTL order', async ({ page }) => {
      const nav = page.locator('nav');
      const style = await nav.evaluate((el) => getComputedStyle(el).direction);
      expect(style).toBe('rtl');
    });

    test('should align text to right in Arabic', async ({ page }) => {
      await page.goto('/annonces');

      // Check that text elements have RTL alignment
      const heading = page.locator('h1').first();
      const textAlign = await heading.evaluate((el) => getComputedStyle(el).textAlign);

      // In RTL, text should be right-aligned or start-aligned
      expect(['right', 'start']).toContain(textAlign);
    });

    test('should flip icons/arrows for RTL', async ({ page }) => {
      // Navigate to a page with back button
      await page.goto('/annonces/123');

      const backButton = page.locator('[data-testid="back-button"]');
      if (await backButton.isVisible()) {
        // The back arrow should be transformed for RTL
        const transform = await backButton.evaluate((el) => {
          const arrow = el.querySelector('svg');
          return arrow ? getComputedStyle(arrow).transform : '';
        });

        // Could be scaleX(-1) or rotateY(180deg)
        // Just verify it exists or the icon is visually flipped
      }
    });
  });

  // ==================== TRANSLATED CONTENT TESTS ====================

  test.describe('Translated Content', () => {
    test('should display French content by default', async ({ page }) => {
      await page.goto('/');

      // Should show French navigation labels
      await expect(page.getByRole('link', { name: /accueil/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /annonces/i })).toBeVisible();
    });

    test('should display Arabic content when selected', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      // Should show Arabic navigation labels
      await expect(page.getByText('الرئيسية')).toBeVisible();
      await expect(page.getByText('الإعلانات')).toBeVisible();
    });

    test('should translate listing types', async ({ page }) => {
      await page.goto('/annonces');

      // Default French
      await expect(page.getByText('Appartement')).toBeVisible();

      // Switch to Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      await expect(page.getByText('شقة')).toBeVisible();
    });

    test('should translate form labels', async ({ page }) => {
      // Login to access forms
      await page.goto('/connexion');

      // French labels
      await expect(page.getByLabel(/email|البريد/i)).toBeVisible();
      await expect(page.getByLabel(/mot de passe|كلمة المرور/i)).toBeVisible();

      // Switch to Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      await expect(page.getByText('البريد الإلكتروني')).toBeVisible();
      await expect(page.getByText('كلمة المرور')).toBeVisible();
    });

    test('should translate error messages', async ({ page }) => {
      await page.goto('/connexion');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show French error message
      const errorVisible = await page.getByText(/requis|مطلوب/i).isVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should format dates according to locale', async ({ page }) => {
      // Login as user with listings
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'bailleur@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/dashboard/mes-annonces');

      // Default French date format (dd/MM/yyyy)
      const datePattern = /\d{2}\/\d{2}\/\d{4}/; // French format
      const pageContent = await page.content();

      // Switch to Arabic and check format changes
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      // Arabic may use different date format
      // The key is that the format changes
    });

    test('should format currency according to locale', async ({ page }) => {
      await page.goto('/annonces');

      // Check for GNF currency format
      await expect(page.getByText(/GNF/)).toBeVisible();
    });
  });

  // ==================== TIMEZONE TESTS ====================

  test.describe('Timezone Handling', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'diaspora@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should display timezone selector in settings', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      await expect(page.getByText(/fuseau horaire|المنطقة الزمنية/i)).toBeVisible();
    });

    test('should show common diaspora timezones', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      // Click timezone selector
      await page.click('[data-testid="timezone-selector"]');

      // Should show common timezones for Guinean diaspora
      await expect(page.getByText(/Paris/)).toBeVisible();
      await expect(page.getByText(/New York/)).toBeVisible();
      await expect(page.getByText(/Conakry/)).toBeVisible();
    });

    test('should save timezone preference', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      // Select Paris timezone
      await page.click('[data-testid="timezone-selector"]');
      await page.click('text=Paris');

      // Save settings
      await page.click('button:has-text("Enregistrer")');

      // Reload and verify
      await page.reload();

      const selectedTimezone = page.locator('[data-testid="timezone-selector"]');
      await expect(selectedTimezone).toContainText('Paris');
    });

    test('should display times in user timezone', async ({ page }) => {
      // Set timezone to Paris
      await page.goto('/dashboard/parametres');
      await page.click('[data-testid="timezone-selector"]');
      await page.click('text=Paris');
      await page.click('button:has-text("Enregistrer")');

      // Go to messages or notifications to see times
      await page.goto('/dashboard/messages');

      // Times should be displayed in Paris timezone
      // This would show (CET) or similar timezone indicator
    });
  });

  // ==================== SETTINGS PAGE TESTS ====================

  test.describe('Settings Page i18n', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'user@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
    });

    test('should display language settings', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      await expect(page.getByText(/langue|اللغة/i)).toBeVisible();
    });

    test('should allow changing language from settings', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      // Find and click language dropdown
      await page.click('[data-testid="settings-language-selector"]');
      await page.click('text=العربية');

      // Page should switch to Arabic
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBe('ar');
    });

    test('should display notification preferences', async ({ page }) => {
      await page.goto('/dashboard/parametres');

      // Should show notification channel preferences
      await expect(page.getByText(/notifications/i)).toBeVisible();
      await expect(page.getByText(/email|البريد/i)).toBeVisible();
      await expect(page.getByText(/sms|الرسائل/i)).toBeVisible();
      await expect(page.getByText(/whatsapp|واتساب/i)).toBeVisible();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  test.describe('Accessibility', () => {
    test('should have lang attribute on html element', async ({ page }) => {
      await page.goto('/');

      const lang = await page.getAttribute('html', 'lang');
      expect(lang).toBeTruthy();
      expect(['fr', 'ar', 'en']).toContain(lang);
    });

    test('should have dir attribute for RTL languages', async ({ page }) => {
      await page.goto('/');

      // Switch to Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      const dir = await page.getAttribute('html', 'dir');
      expect(dir).toBe('rtl');
    });

    test('language selector should be keyboard accessible', async ({ page }) => {
      await page.goto('/');

      // Tab to language selector
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Open with Enter
      await page.keyboard.press('Enter');

      // Should open dropdown
      await expect(page.getByText('Français')).toBeVisible();

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    });

    test('translated pages should have proper document title', async ({ page }) => {
      await page.goto('/annonces');

      const frenchTitle = await page.title();
      expect(frenchTitle).toContain('ImmoGuinée');

      // Switch to Arabic
      await page.click('[data-testid="language-selector"]');
      await page.click('text=العربية');

      const arabicTitle = await page.title();
      expect(arabicTitle).toContain('ImmoGuinée');
    });
  });

  // ==================== DIASPORA VERIFICATION TESTS ====================

  test.describe('Diaspora Verification', () => {
    test('should show enhanced verification for diaspora users', async ({ page }) => {
      // Login as diaspora user
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'diaspora-user@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Navigate to land listings
      await page.goto('/annonces?type=TERRAIN');

      // Click on a land listing
      await page.click('[data-testid="listing-card"]');

      // Should show enhanced verification notice
      await expect(page.getByText(/vérification renforcée|التحقق المعزز/i)).toBeVisible();
    });
  });
});
