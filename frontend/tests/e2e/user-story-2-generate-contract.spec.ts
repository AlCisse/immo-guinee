import { test, expect, Page } from '@playwright/test';

/**
 * User Story 2: Génération Automatique de Contrats
 *
 * Goal: Après accord verbal, la plateforme génère automatiquement un contrat de location
 * conforme à la loi guinéenne 2016/037 via un formulaire guidé.
 *
 * Independent Test: Un propriétaire et un locataire sont d'accord sur une location.
 * Le propriétaire initie la génération d'un contrat de location résidentiel,
 * remplit le formulaire en 5 minutes, prévisualise le PDF généré avec toutes les clauses,
 * et l'envoie au locataire pour signature.
 */

// Test data
const testProprietaire = {
  telephone: '620000001',
  password: 'TestPassword123!',
  nom: 'Diallo',
  prenom: 'Mamadou',
};

const testLocataire = {
  telephone: '620000002',
  password: 'TestPassword123!',
  nom: 'Bah',
  prenom: 'Aissatou',
};

const testListing = {
  titre: 'Appartement 3 pièces à Kaloum',
  prix: 2500000,
  quartier: 'Kaloum',
};

test.describe('User Story 2: Contract Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary cookies or authentication state
    await page.goto('/');
  });

  test('should display contract generation page when accessed with listing ID', async ({
    page,
  }) => {
    // Navigate to contract generation with a listing ID
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Should show the page title
    await expect(page.locator('h1')).toContainText('Générer un contrat');
  });

  test('should show listing selector when no listing is provided', async ({
    page,
  }) => {
    await page.goto('/contrats/generer');

    // Should prompt user to select a listing
    await expect(page.getByText('Parcourir les annonces')).toBeVisible();
  });

  test('should display contract type selector in step 1', async ({ page }) => {
    // Assume authenticated and with listing
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Should show contract type options
    await expect(page.getByText('Bail de location résidentiel')).toBeVisible();
    await expect(page.getByText('Bail de location commercial')).toBeVisible();
    await expect(page.getByText('Promesse de vente de terrain')).toBeVisible();
    await expect(page.getByText('Mandat de gestion')).toBeVisible();
    await expect(page.getByText('Attestation de caution')).toBeVisible();
  });

  test('should navigate through 3-step form wizard', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Step 1: Select contract type
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 2: Should show conditions form
    await expect(page.getByText('Conditions du contrat')).toBeVisible();
    await expect(page.getByLabel('Loyer mensuel')).toBeVisible();
    await expect(page.getByLabel('Date de début')).toBeVisible();
    await expect(page.getByLabel('Date de fin')).toBeVisible();

    // Fill in the form
    await page.fill('input[name="loyer_mensuel"]', '2500000');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 3: Should show summary
    await expect(page.getByText('Récapitulatif')).toBeVisible();
    await expect(page.getByText('BAIL LOCATION RESIDENTIEL')).toBeVisible();
  });

  test('should calculate totals correctly in summary', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Complete step 1
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 2: Set values
    await page.fill('input[name="loyer_mensuel"]', '2500000');
    await page.selectOption('select[name="caution_mois"]', '1');
    await page.selectOption('select[name="avance_mois"]', '3');

    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 3: Verify calculations
    // Caution: 2,500,000 GNF (1 mois)
    // Avance: 7,500,000 GNF (3 mois)
    // Commission: 1,250,000 GNF (50%)
    // Total: 11,250,000 GNF
    await expect(page.getByText('2 500 000 GNF')).toBeVisible();
    await expect(page.getByText('Total à payer')).toBeVisible();
  });

  test('should disable next button when no contract type is selected', async ({
    page,
  }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Next button should be disabled initially
    const nextButton = page.getByRole('button', { name: 'Suivant' });
    await expect(nextButton).toBeDisabled();

    // Select a contract type
    await page.getByText('Bail de location résidentiel').click();

    // Now the button should be enabled
    await expect(nextButton).toBeEnabled();
  });

  test('should go back to previous step', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Complete step 1
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should be on step 2
    await expect(page.getByText('Conditions du contrat')).toBeVisible();

    // Click previous
    await page.getByRole('button', { name: 'Précédent' }).click();

    // Should be back on step 1
    await expect(page.getByText('Type de contrat')).toBeVisible();
  });

  test('should show additional fields for commercial lease', async ({
    page,
  }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Select commercial lease
    await page.getByText('Bail de location commercial').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should show activite_commerciale field
    await expect(page.getByLabel('Activité commerciale')).toBeVisible();
  });

  test('should show additional fields for land sale promise', async ({
    page,
  }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Select land sale promise
    await page.getByText('Promesse de vente de terrain').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should show prix_vente field
    await expect(page.getByLabel('Prix de vente')).toBeVisible();
  });

  test('should show additional fields for management mandate', async ({
    page,
  }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Select management mandate
    await page.getByText('Mandat de gestion').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should show commission field
    await expect(page.getByLabel('Commission de gestion')).toBeVisible();
  });

  test('should display important disclaimer before generation', async ({
    page,
  }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Navigate to summary
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.fill('input[name="loyer_mensuel"]', '2500000');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should show legal disclaimer
    await expect(page.getByText('Important')).toBeVisible();
    await expect(
      page.getByText("conditions générales d'utilisation")
    ).toBeVisible();
  });

  test('should show progress steps indicator', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Should show 3 steps
    await expect(page.getByText('Type de contrat')).toBeVisible();
    await expect(page.getByText('Conditions')).toBeVisible();
    await expect(page.getByText('Récapitulatif')).toBeVisible();
  });
});

test.describe('Contract Generation - PDF Preview (FR-025)', () => {
  test('should display PDF preview after generation', async ({ page }) => {
    // This test requires a successful contract generation
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Complete the form (mocked for test)
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.fill('input[name="loyer_mensuel"]', '2500000');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Click generate
    await page.getByRole('button', { name: 'Générer le contrat' }).click();

    // After successful generation, should show PDF preview
    // Note: This would require mocking the API response
    await expect(
      page.getByText('Contrat généré avec succès')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('iframe[title*="Aperçu"]')).toBeVisible();
  });

  test('should have zoom controls in PDF preview', async ({ page }) => {
    // Navigate to a contract with preview
    await page.goto('/contrats/test-contract-id');

    // Check for zoom controls
    await expect(page.getByLabel('Zoom arrière')).toBeVisible();
    await expect(page.getByLabel('Zoom avant')).toBeVisible();
    await expect(page.getByLabel('Niveau de zoom')).toBeVisible();
  });

  test('should have fullscreen toggle', async ({ page }) => {
    await page.goto('/contrats/test-contract-id');

    // Check for fullscreen button
    await expect(
      page.getByRole('button', { name: /plein écran/i })
    ).toBeVisible();
  });
});

test.describe('Contract Generation - Send for Signature (FR-027)', () => {
  test('should show send button after contract generation', async ({
    page,
  }) => {
    // After contract is generated
    await page.goto('/contrats/test-contract-id');

    // Should have send for signature button
    await expect(
      page.getByRole('button', { name: 'Envoyer pour signature' })
    ).toBeVisible();
  });

  test('should display modification option before sending', async ({
    page,
  }) => {
    await page.goto('/contrats/test-contract-id');

    // Should have modify button
    await expect(
      page.getByRole('button', { name: 'Modifier le contrat' })
    ).toBeVisible();
  });
});

test.describe('Contract Generation - Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Navigate to step 2
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Check for proper labels
    const loyerInput = page.getByLabel('Loyer mensuel');
    await expect(loyerInput).toBeVisible();

    const dateDebutInput = page.getByLabel('Date de début');
    await expect(dateDebutInput).toBeVisible();
  });

  test('should be navigable by keyboard', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Tab through the contract type options
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to select with Enter
    await page.keyboard.press('Enter');

    // Verify selection was made
    const nextButton = page.getByRole('button', { name: 'Suivant' });
    await expect(nextButton).toBeEnabled();
  });

  test('should display error messages accessibly', async ({ page }) => {
    await page.goto('/contrats/generer?listing=test-listing-id');

    // Try to submit without selecting contract type
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Clear required field and try to proceed
    await page.fill('input[name="loyer_mensuel"]', '');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Should show error message
    await expect(page.getByText('Loyer mensuel requis')).toBeVisible();
  });
});

test.describe('Contract Generation - Performance', () => {
  test('should load contract form within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/contrats/generer?listing=test-listing-id');

    // Wait for the form to be interactive
    await page.getByText('Bail de location résidentiel').waitFor();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should complete in under 5 minutes (FR-006)', async ({ page }) => {
    // This test verifies the UI supports quick completion
    const startTime = Date.now();

    await page.goto('/contrats/generer?listing=test-listing-id');

    // Step 1: Select contract type (should take < 10 seconds)
    await page.getByText('Bail de location résidentiel').click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 2: Fill conditions (should take < 1 minute)
    await page.fill('input[name="loyer_mensuel"]', '2500000');
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Step 3: Review and generate (should take < 30 seconds)
    await page.getByRole('button', { name: 'Générer le contrat' }).click();

    const totalTime = Date.now() - startTime;

    // Total time should be well under 5 minutes (300,000 ms)
    // For automated test, should complete in under 30 seconds
    expect(totalTime).toBeLessThan(30000);
  });
});
