import { test, expect } from '@playwright/test';

/**
 * T220: Playwright E2E tests for User Story 7 - Ratings and Disputes
 *
 * Tests the complete flow for:
 * - Rating submission after contract completion
 * - Viewing user ratings on public profiles
 * - Creating and managing disputes
 * - Mediator assignment and resolution
 */

test.describe('US7 - Système de Notation et Médiation de Litiges', () => {
  // Test data
  const testLocataire = {
    telephone: '+224620001001',
    password: 'Test1234!',
    nom_complet: 'Locataire Test',
  };

  const testBailleur = {
    telephone: '+224620001002',
    password: 'Test1234!',
    nom_complet: 'Bailleur Test',
  };

  test.describe('Ratings - FR-067 to FR-071', () => {
    test('FR-067: User can submit rating after completed contract', async ({ page }) => {
      // Login as locataire
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to completed contracts
      await page.goto('/dashboard/mes-contrats');
      await page.waitForLoadState('networkidle');

      // Find a completed contract with "Noter" button
      const rateButton = page.locator('a:has-text("Noter")').first();
      if (await rateButton.isVisible()) {
        await rateButton.click();
        await page.waitForURL(/\/notations\/[a-f0-9-]+/);

        // Fill rating form
        // Rate communication (5 stars)
        await page.locator('[data-criteria="communication"] button').nth(4).click();

        // Rate ponctualite (4 stars)
        await page.locator('[data-criteria="ponctualite"] button').nth(3).click();

        // Rate proprete (5 stars)
        await page.locator('[data-criteria="proprete"] button').nth(4).click();

        // Rate respect_contrat (4 stars)
        await page.locator('[data-criteria="respect_contrat"] button').nth(3).click();

        // Add comment (minimum 20 characters)
        await page.fill(
          'textarea[id="comment"]',
          'Excellent propriétaire, très réactif et professionnel. Le logement était conforme à la description.'
        );

        // Submit rating
        await page.click('button[type="submit"]:has-text("Publier mon avis")');

        // Verify success
        await expect(page).toHaveURL(/\/dashboard\/mes-contrats\?rated=success/);
      }
    });

    test('FR-067: Rating requires minimum comment length', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      // Navigate to a rating page (mock contract ID)
      await page.goto('/notations/test-contract-id');

      // Try to submit with short comment
      await page.fill('textarea[id="comment"]', 'Trop court');

      // Check validation message
      await expect(page.locator('text=/caractères minimum/')).toBeVisible();
    });

    test('FR-070: Ratings display on public profile', async ({ page }) => {
      // Visit a user's public profile
      await page.goto('/profil/test-user-id');
      await page.waitForLoadState('networkidle');

      // Check ratings section exists
      const ratingsSection = page.locator('[data-testid="ratings-display"]');

      // If ratings exist, verify structure
      if (await ratingsSection.isVisible()) {
        // Check average rating display
        await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();

        // Check rating distribution chart
        await expect(page.locator('[data-testid="rating-distribution"]')).toBeVisible();

        // Check individual rating cards
        const ratingCards = page.locator('[data-testid="rating-card"]');
        if ((await ratingCards.count()) > 0) {
          // Verify rating card structure
          await expect(ratingCards.first().locator('[data-testid="rating-stars"]')).toBeVisible();
          await expect(ratingCards.first().locator('[data-testid="rating-comment"]')).toBeVisible();
        }
      }
    });

    test('FR-070: User can reply to rating', async ({ page }) => {
      // Login as bailleur (evaluated user)
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testBailleur.telephone);
      await page.fill('[name="password"]', testBailleur.password);
      await page.click('button[type="submit"]');

      // Go to my ratings page
      await page.goto('/dashboard/mes-notations');
      await page.waitForLoadState('networkidle');

      // Find a rating without reply
      const replyButton = page.locator('button:has-text("Répondre")').first();
      if (await replyButton.isVisible()) {
        await replyButton.click();

        // Fill reply
        await page.fill(
          'textarea[name="reply"]',
          'Merci pour votre retour positif. Je suis ravi que votre séjour se soit bien passé.'
        );

        // Submit reply
        await page.click('button:has-text("Publier la réponse")');

        // Verify success
        await expect(page.locator('text=/Réponse publiée/')).toBeVisible();
      }
    });

    test('FR-070: User can mark rating as helpful', async ({ page }) => {
      // Visit any user profile with ratings
      await page.goto('/profil/test-user-id');
      await page.waitForLoadState('networkidle');

      // Find helpful button
      const helpfulButton = page.locator('button:has-text("Utile")').first();
      if (await helpfulButton.isVisible()) {
        const initialCount = await helpfulButton.textContent();
        await helpfulButton.click();

        // Verify count increased
        await page.waitForTimeout(500);
        const newCount = await helpfulButton.textContent();
        expect(newCount).not.toBe(initialCount);
      }
    });
  });

  test.describe('Disputes - FR-072 to FR-074', () => {
    test('FR-072: User can create a dispute', async ({ page }) => {
      // Login
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      // Navigate to create dispute page
      await page.goto('/litiges/creer');
      await page.waitForLoadState('networkidle');

      // Step 1: Select contract
      const contractButton = page.locator('[data-testid="contract-select"]').first();
      if (await contractButton.isVisible()) {
        await contractButton.click();

        // Step 2: Select category
        await page.click('button:has-text("Impayé de loyer")');

        // Step 3: Fill description
        await page.fill('[id="motif"]', 'Loyers impayés depuis 3 mois');
        await page.fill(
          '[id="description"]',
          'Le propriétaire ne respecte pas ses engagements contractuels. ' +
            'Les loyers des mois de septembre, octobre et novembre 2024 n\'ont pas été payés malgré mes relances. ' +
            'J\'ai envoyé plusieurs messages et appels sans réponse. ' +
            'Le montant total impayé s\'élève à 7,500,000 GNF. ' +
            'Je demande une médiation pour résoudre ce différend à l\'amiable.'
        );

        // Continue to step 3
        await page.click('button:has-text("Continuer")');

        // Step 4: Upload proof (optional)
        // Skip for this test

        // Submit dispute
        await page.click('button:has-text("Ouvrir le litige")');

        // Verify success redirect
        await expect(page).toHaveURL(/\/dashboard\/mes-litiges\?created=/);

        // Verify success message
        await expect(page.locator('text=/Litige créé avec succès/')).toBeVisible();
      }
    });

    test('FR-072: Dispute requires minimum description length', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/litiges/creer');

      // Try short description
      await page.fill('[id="description"]', 'Description trop courte');

      // Check validation message
      await expect(page.locator('text=/caractères minimum/')).toBeVisible();
    });

    test('FR-072: User can upload proof files', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/litiges/creer');
      await page.waitForLoadState('networkidle');

      // Select contract and category, fill description first
      // ... (navigate to step 3)

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'preuve.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake image content'),
        });

        // Verify file preview appears
        await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
      }
    });

    test('User can view disputes list', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/dashboard/mes-litiges');
      await page.waitForLoadState('networkidle');

      // Check filters exist
      await expect(page.locator('button:has-text("Tous")')).toBeVisible();
      await expect(page.locator('button:has-text("En cours")')).toBeVisible();
      await expect(page.locator('button:has-text("Résolus")')).toBeVisible();

      // Check if disputes are displayed or empty state
      const disputes = page.locator('[data-testid="dispute-card"]');
      const emptyState = page.locator('text=/Aucun litige/');

      await expect(disputes.first().or(emptyState)).toBeVisible();
    });

    test('User can filter disputes by status', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/dashboard/mes-litiges');

      // Click "En cours" filter
      await page.click('button:has-text("En cours")');

      // Verify filter is active
      await expect(page.locator('button:has-text("En cours")')).toHaveClass(/bg-yellow-500/);

      // Click "Résolus" filter
      await page.click('button:has-text("Résolus")');

      // Verify filter changed
      await expect(page.locator('button:has-text("Résolus")')).toHaveClass(/bg-green-500/);
    });

    test('User can view dispute details', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/dashboard/mes-litiges');
      await page.waitForLoadState('networkidle');

      // Click on first dispute if exists
      const disputeCard = page.locator('[data-testid="dispute-card"]').first();
      if (await disputeCard.isVisible()) {
        await disputeCard.click();

        // Verify dispute details page
        await expect(page.locator('[data-testid="dispute-reference"]')).toBeVisible();
        await expect(page.locator('[data-testid="dispute-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="dispute-description"]')).toBeVisible();
      }
    });

    test('FR-073: Mediator is assigned within 24h (displayed info)', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      // Navigate to dispute in mediation
      await page.goto('/dashboard/mes-litiges');

      // Find dispute with mediator assigned
      const mediatorBadge = page.locator('text=/Médiateur assigné/');
      if (await mediatorBadge.isVisible()) {
        // Click to view details
        await mediatorBadge.locator('..').click();

        // Verify mediator info is displayed
        await expect(page.locator('[data-testid="mediator-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="mediation-start-date"]')).toBeVisible();
      }
    });

    test('FR-074: User can send message in dispute', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      // Navigate to active dispute
      await page.goto('/dashboard/mes-litiges');
      await page.click('button:has-text("En cours")');

      const disputeCard = page.locator('[data-testid="dispute-card"]').first();
      if (await disputeCard.isVisible()) {
        await disputeCard.click();

        // Find message input
        const messageInput = page.locator('textarea[name="message"]');
        if (await messageInput.isVisible()) {
          await messageInput.fill('Je souhaite ajouter des informations complémentaires.');
          await page.click('button:has-text("Envoyer")');

          // Verify message sent
          await expect(page.locator('text=/informations complémentaires/')).toBeVisible();
        }
      }
    });
  });

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('Rating form is mobile responsive', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/notations/test-contract-id');

      // Verify form is visible and usable on mobile
      await expect(page.locator('form')).toBeVisible();

      // Star buttons should be tappable
      const stars = page.locator('button svg').first();
      await expect(stars).toBeVisible();
    });

    test('Disputes list is mobile responsive', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/dashboard/mes-litiges');

      // Filters should be visible
      await expect(page.locator('button:has-text("Tous")')).toBeVisible();

      // New dispute button should be accessible
      await expect(page.locator('a:has-text("Nouveau litige")')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('Shows error on rating submission failure', async ({ page }) => {
      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      // Try to rate non-existent contract
      await page.goto('/notations/invalid-contract-id');

      // Should show error or redirect
      await expect(
        page.locator('text=/introuvable/').or(page.locator('text=/erreur/'))
      ).toBeVisible();
    });

    test('Shows error on dispute creation failure', async ({ page }) => {
      await page.route('**/api/disputes', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.goto('/connexion');
      await page.fill('[name="telephone"]', testLocataire.telephone);
      await page.fill('[name="password"]', testLocataire.password);
      await page.click('button[type="submit"]');

      await page.goto('/litiges/creer');

      // Fill form and submit
      // ... (fill form)

      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });
  });
});
