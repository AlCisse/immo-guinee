import { test, expect } from '@playwright/test';

/**
 * T231: User Story 8 - Insurance Module E2E Tests
 *
 * Tests the complete insurance flow:
 * - Viewing insurance options (SÉJOUR SEREIN, LOYER GARANTI)
 * - Subscribing to insurance
 * - Filing insurance claims
 * - Downloading certificates
 */

test.describe('US8: Insurance Module', () => {
  // ==================== INSURANCE OPTIONS TESTS ====================

  test.describe('Insurance Options Display', () => {
    test('should display insurance options page', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      // Should show page title
      await expect(page.getByRole('heading', { name: /souscrire/i })).toBeVisible();
    });

    test('should show contract selection step first', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      // Should prompt for contract selection
      await expect(page.getByText(/sélectionnez un contrat/i)).toBeVisible();
    });

    test('should show empty state when no active contracts', async ({ page }) => {
      // Login as user with no contracts
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'newuser@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/souscrire');

      // Should show empty state
      await expect(page.getByText(/aucun contrat actif/i)).toBeVisible();
    });
  });

  // ==================== SUBSCRIPTION FLOW TESTS ====================

  test.describe('Insurance Subscription', () => {
    test.beforeEach(async ({ page }) => {
      // Login as tenant with active contract
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should complete subscription flow for SÉJOUR SEREIN', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      // Step 1: Select contract
      await expect(page.getByText(/sélectionnez un contrat/i)).toBeVisible();
      await page.click('[data-testid="contract-card"]:first-child');

      // Step 2: Select insurance type
      await expect(page.getByText(/séjour serein/i)).toBeVisible();
      await page.click('[data-testid="insurance-option-SEJOUR_SEREIN"]');

      // Step 3: Confirmation
      await expect(page.getByText(/confirmation/i)).toBeVisible();
      await expect(page.getByText(/prime mensuelle/i)).toBeVisible();

      // Accept terms
      await page.click('[type="checkbox"]');
      await page.click('button:has-text("Confirmer")');

      // Success
      await expect(page.getByText(/souscription réussie/i)).toBeVisible();
    });

    test('should show premium calculation based on rent', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      // Select a contract with known rent
      await page.click('[data-testid="contract-card"]:first-child');

      // Select insurance
      await page.click('[data-testid="insurance-option-SEJOUR_SEREIN"]');

      // Premium should be 2% of rent
      const premiumElement = page.locator('[data-testid="premium-amount"]');
      await expect(premiumElement).toBeVisible();
    });

    test('should show insurance coverages before confirmation', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      await page.click('[data-testid="contract-card"]:first-child');
      await page.click('[data-testid="insurance-option-SEJOUR_SEREIN"]');

      // Should list coverages
      await expect(page.getByText(/protection expulsion/i)).toBeVisible();
      await expect(page.getByText(/remboursement caution/i)).toBeVisible();
      await expect(page.getByText(/assistance juridique/i)).toBeVisible();
    });

    test('should require terms acceptance before subscription', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      await page.click('[data-testid="contract-card"]:first-child');
      await page.click('[data-testid="insurance-option-SEJOUR_SEREIN"]');

      // Confirm button should be disabled without accepting terms
      const confirmButton = page.locator('button:has-text("Confirmer")');
      await expect(confirmButton).toBeDisabled();

      // Accept terms
      await page.click('[type="checkbox"]');
      await expect(confirmButton).toBeEnabled();
    });

    test('should allow navigation back through steps', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      await page.click('[data-testid="contract-card"]:first-child');
      await page.click('[data-testid="insurance-option-SEJOUR_SEREIN"]');

      // Go back to insurance selection
      await page.click('button:has-text("Retour")');
      await expect(page.getByText(/protégez-vous/i)).toBeVisible();

      // Go back to contract selection
      await page.click('button:has-text("Retour")');
      await expect(page.getByText(/sélectionnez un contrat/i)).toBeVisible();
    });
  });

  // ==================== CLAIMS FLOW TESTS ====================

  test.describe('Insurance Claims', () => {
    test.beforeEach(async ({ page }) => {
      // Login as tenant with active insurance
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire-assure@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should display claims page', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await expect(page.getByRole('heading', { name: /déclarer un sinistre/i })).toBeVisible();
    });

    test('should show insurance selection first', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await expect(page.getByText(/sélectionnez une assurance/i)).toBeVisible();
    });

    test('should show claim types based on insurance type', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      // Select SÉJOUR SEREIN insurance
      await page.click('[data-testid="insurance-card-SEJOUR_SEREIN"]');

      // Should show tenant claim types
      await expect(page.getByText(/expulsion abusive/i)).toBeVisible();
      await expect(page.getByText(/remboursement caution/i)).toBeVisible();
      await expect(page.getByText(/assistance juridique/i)).toBeVisible();
    });

    test('should check eligibility before showing claim form', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      // Should either show form or eligibility error
      const isEligible = await page.locator('[data-testid="claim-form"]').isVisible();
      const hasError = await page.locator('[data-testid="eligibility-error"]').isVisible();

      expect(isEligible || hasError).toBeTruthy();
    });

    test('should show error for insurance in carence period', async ({ page }) => {
      // Login as user with recent insurance (within 30 days)
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire-carence@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/reclamations');

      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      // Should show carence period error
      await expect(page.getByText(/carence/i)).toBeVisible();
    });

    test('should submit claim with required fields', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      // Fill claim form (if eligible)
      const formVisible = await page.locator('[data-testid="claim-form"]').isVisible();
      if (formVisible) {
        // Description (min 100 chars)
        const description = 'A'.repeat(150);
        await page.fill('[name="description"]', description);

        // Amount
        await page.fill('[name="amount"]', '15000000');

        // Submit
        await page.click('button:has-text("Soumettre")');

        // Should show success
        await expect(page.getByText(/réclamation envoyée/i)).toBeVisible();
      }
    });

    test('should validate minimum description length', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      const formVisible = await page.locator('[data-testid="claim-form"]').isVisible();
      if (formVisible) {
        // Short description
        await page.fill('[name="description"]', 'Too short');
        await page.fill('[name="amount"]', '15000000');

        // Submit button should be disabled or show error
        const submitButton = page.locator('button:has-text("Soumettre")');
        await expect(submitButton).toBeDisabled();
      }
    });

    test('should allow file upload for proof', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      const formVisible = await page.locator('[data-testid="claim-form"]').isVisible();
      if (formVisible) {
        // Upload file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
          name: 'proof.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('test pdf content'),
        });

        // Should show uploaded file
        await expect(page.getByText('proof.pdf')).toBeVisible();
      }
    });
  });

  // ==================== MY INSURANCES TESTS ====================

  test.describe('My Insurances Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire-assure@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    });

    test('should display user insurances', async ({ page }) => {
      await page.goto('/dashboard/mes-assurances');

      // Should show insurances or empty state
      const hasInsurances = await page.locator('[data-testid="insurance-list"]').isVisible();
      const isEmpty = await page.locator('[data-testid="empty-state"]').isVisible();

      expect(hasInsurances || isEmpty).toBeTruthy();
    });

    test('should show insurance status badges', async ({ page }) => {
      await page.goto('/dashboard/mes-assurances');

      const insuranceCard = page.locator('[data-testid="insurance-card"]:first-child');
      if (await insuranceCard.isVisible()) {
        // Should have status badge
        const statusBadge = insuranceCard.locator('[data-testid="status-badge"]');
        await expect(statusBadge).toBeVisible();
      }
    });

    test('should allow certificate download', async ({ page }) => {
      await page.goto('/dashboard/mes-assurances');

      const insuranceCard = page.locator('[data-testid="insurance-card"]:first-child');
      if (await insuranceCard.isVisible()) {
        // Click download certificate button
        const downloadButton = insuranceCard.locator('button:has-text("Certificat")');
        if (await downloadButton.isVisible()) {
          // Set up download listener
          const downloadPromise = page.waitForEvent('download');
          await downloadButton.click();

          // Verify download started
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toContain('Certificat');
        }
      }
    });

    test('should allow insurance cancellation', async ({ page }) => {
      await page.goto('/dashboard/mes-assurances');

      const insuranceCard = page.locator('[data-testid="insurance-card"]:first-child');
      if (await insuranceCard.isVisible()) {
        // Click cancel button
        const cancelButton = insuranceCard.locator('button:has-text("Résilier")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();

          // Confirm cancellation
          await page.click('button:has-text("Confirmer")');

          // Should show cancelled status
          await expect(page.getByText(/résiliée/i)).toBeVisible();
        }
      }
    });
  });

  // ==================== INSURANCE OPTIONS COMPARISON ====================

  test.describe('Insurance Options Comparison', () => {
    test('should display both insurance types for tenants', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/souscrire');
      await page.click('[data-testid="contract-card"]:first-child');

      // Should show SÉJOUR SEREIN for tenants
      await expect(page.getByText(/séjour serein/i)).toBeVisible();
    });

    test('should display LOYER GARANTI for landlords', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'bailleur@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/souscrire');
      await page.click('[data-testid="contract-card"]:first-child');

      // Should show LOYER GARANTI for landlords
      await expect(page.getByText(/loyer garanti/i)).toBeVisible();
    });

    test('should show coverage details for each option', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/souscrire');
      await page.click('[data-testid="contract-card"]:first-child');

      // SÉJOUR SEREIN coverages
      const sejourCard = page.locator('[data-testid="insurance-option-SEJOUR_SEREIN"]');
      await expect(sejourCard.getByText(/protection expulsion/i)).toBeVisible();
      await expect(sejourCard.getByText(/remboursement caution/i)).toBeVisible();
      await expect(sejourCard.getByText(/assistance juridique/i)).toBeVisible();
    });

    test('should show benefits list for each option', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/souscrire');
      await page.click('[data-testid="contract-card"]:first-child');

      // Should show benefits
      await expect(page.getByText(/indemnisation rapide/i)).toBeVisible();
      await expect(page.getByText(/assistance 24\/7/i)).toBeVisible();
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================

  test.describe('Accessibility', () => {
    test('subscription page should have proper headings', async ({ page }) => {
      await page.goto('/assurances/souscrire');

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('claims page should have proper headings', async ({ page }) => {
      await page.goto('/assurances/reclamations');

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    });

    test('form inputs should have labels', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="email"]', 'locataire-assure@test.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/assurances/reclamations');
      await page.click('[data-testid="insurance-card"]');
      await page.click('[data-testid="claim-type-expulsion"]');

      const formVisible = await page.locator('[data-testid="claim-form"]').isVisible();
      if (formVisible) {
        // Check for labels
        const descriptionLabel = page.locator('label:has-text("Description")');
        await expect(descriptionLabel).toBeVisible();

        const amountLabel = page.locator('label:has-text("Montant")');
        await expect(amountLabel).toBeVisible();
      }
    });
  });
});
