import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Payment & Commission Flow (User Story 4)
 *
 * Tests the complete payment workflow including:
 * - Invoice display with 3 sections (FR-041)
 * - Commission transparency warning (FR-042)
 * - Payment method selection (Orange Money, MTN MoMo, Cash)
 * - OTP verification for mobile money
 * - Escrow status display
 * - Payment history and filtering
 * - Quittance download
 */

// Test user credentials
const TEST_LOCATAIRE = {
  phone: '+224620000002',
  otp: '123456',
  id: 'locataire-1',
  name: 'Mamadou Diallo',
};

const TEST_PROPRIETAIRE = {
  phone: '+224620000001',
  otp: '654321',
  id: 'proprietaire-1',
  name: 'Ibrahima Sow',
};

// Mock contract and payment data
const MOCK_CONTRACT = {
  id: 'contract-123',
  reference: 'CTR-20250115-A1B2C',
  type: 'BAIL_LOCATION_RESIDENTIEL',
  loyer_mensuel: 2500000,
  avance_mois: 2,
  caution_mois: 2,
  listing: {
    id: 'listing-456',
    titre: 'Appartement 3 pièces Kaloum',
    quartier: 'Kaloum Centre',
    ville: 'Conakry',
  },
};

const MOCK_INVOICE = {
  contract_reference: MOCK_CONTRACT.reference,
  contract_type: 'Location résidentielle',
  sections: [
    {
      label: 'Loyer',
      amount: 5000000,
      formatted: '5 000 000 GNF',
      description: '2 mois d\'avance',
    },
    {
      label: 'Caution',
      amount: 5000000,
      formatted: '5 000 000 GNF',
      description: 'Dépôt de garantie (2 mois)',
    },
    {
      label: 'Commission plateforme',
      amount: 1250000,
      formatted: '1 250 000 GNF',
      description: '50% du loyer mensuel',
      non_refundable: true,
    },
  ],
  total: {
    amount: 11250000,
    formatted: '11 250 000 GNF',
  },
  pour_proprietaire: {
    amount: 10000000,
    formatted: '10 000 000 GNF',
  },
  pour_plateforme: {
    amount: 1250000,
    formatted: '1 250 000 GNF',
  },
};

const MOCK_PAYMENT = {
  id: 'payment-789',
  reference_paiement: 'PAY-20250115-X1Y2Z',
  montant_loyer: 5000000,
  montant_caution: 5000000,
  montant_frais_service: 1250000,
  montant_total: 11250000,
  methode_paiement: 'orange_money',
  statut_paiement: 'escrow',
  quittance_url: '/api/payments/payment-789/quittance',
  created_at: new Date().toISOString(),
  contrat: MOCK_CONTRACT,
  beneficiaire: { nom_complet: TEST_PROPRIETAIRE.name },
};

// Helper function to login
async function login(page: Page, phone: string, otp: string) {
  await page.goto('/auth/login');
  await page.fill('[data-testid="phone-input"]', phone);
  await page.click('[data-testid="login-submit"]');
  await page.waitForSelector('[data-testid="otp-input"]');

  const otpDigits = otp.split('');
  for (let i = 0; i < otpDigits.length; i++) {
    await page.fill(`[data-testid="otp-input-${i}"]`, otpDigits[i]);
  }

  await page.click('[data-testid="verify-otp"]');
  await page.waitForURL(/\/dashboard/);
}

// Setup API mocks
async function setupApiMocks(page: Page) {
  // Auth endpoints
  await page.route('**/api/auth/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/login')) {
      await route.fulfill({ json: { success: true, message: 'OTP sent' } });
    } else if (url.includes('/verify')) {
      await route.fulfill({
        json: {
          success: true,
          data: {
            user: { id: TEST_LOCATAIRE.id, nom_complet: TEST_LOCATAIRE.name },
            token: 'test-token',
          },
        },
      });
    } else {
      await route.continue();
    }
  });

  // Payment initiation
  await page.route('**/api/payments/initiate', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          invoice: MOCK_INVOICE,
          contract_reference: MOCK_CONTRACT.reference,
          payment_methods: ['orange_money', 'mtn_momo', 'especes'],
        },
      },
    });
  });

  // Payment creation
  await page.route('**/api/payments', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          data: { payment: MOCK_PAYMENT },
        },
      });
    } else {
      // GET - payment history
      await route.fulfill({
        json: {
          success: true,
          data: {
            payments: [MOCK_PAYMENT, { ...MOCK_PAYMENT, id: 'payment-2', statut_paiement: 'confirme' }],
            pagination: { current_page: 1, total: 2, per_page: 10, total_pages: 1 },
          },
        },
      });
    }
  });

  // Single payment
  await page.route('**/api/payments/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/validate')) {
      await route.fulfill({
        json: {
          success: true,
          data: { payment: { ...MOCK_PAYMENT, statut_paiement: 'confirme' } },
        },
      });
    } else if (url.includes('/status')) {
      await route.fulfill({
        json: {
          success: true,
          data: { status: 'escrow', hours_remaining: 47 },
        },
      });
    } else if (url.includes('/quittance')) {
      await route.fulfill({
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 test content'),
      });
    } else {
      await route.fulfill({
        json: {
          success: true,
          data: { payment: MOCK_PAYMENT },
        },
      });
    }
  });

  // Contracts
  await page.route('**/api/contracts/**', async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: { contract: MOCK_CONTRACT },
      },
    });
  });
}

test.describe('Payment Flow - Invoice Display (FR-041)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display invoice with 3 sections', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Check invoice sections exist
    await expect(page.getByText('Loyer')).toBeVisible();
    await expect(page.getByText('Caution')).toBeVisible();
    await expect(page.getByText('Commission plateforme')).toBeVisible();

    // Check amounts
    await expect(page.getByText('5 000 000 GNF').first()).toBeVisible();
    await expect(page.getByText('1 250 000 GNF')).toBeVisible();
    await expect(page.getByText('11 250 000 GNF')).toBeVisible();
  });

  test('should show commission as non-refundable', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Commission section should have non-refundable warning
    await expect(page.getByText('Non remboursable')).toBeVisible();
  });

  test('should display total breakdown (proprietaire vs plateforme)', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Total amount
    await expect(page.getByText('11 250 000 GNF')).toBeVisible();
  });
});

test.describe('Payment Flow - Transparency Warning (FR-042)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display transparency warning about commission', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Check warning is visible
    await expect(page.getByText(/commission plateforme est.*non remboursable/i)).toBeVisible();
  });

  test('should allow expanding tariff details', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Click to expand
    await page.click('text=En savoir plus sur nos tarifs');

    // Check tariff grid is shown
    await expect(page.getByText('Grille tarifaire')).toBeVisible();
    await expect(page.getByText('Location (résidentielle/commerciale)')).toBeVisible();
    await expect(page.getByText("50% d'un mois de loyer")).toBeVisible();
  });

  test('should display badge discounts in tariff details', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=En savoir plus sur nos tarifs');

    // Check badge discounts
    await expect(page.getByText('Bronze: Tarif standard')).toBeVisible();
    await expect(page.getByText('Argent: -5%')).toBeVisible();
    await expect(page.getByText('Or: -10%')).toBeVisible();
    await expect(page.getByText('Diamant: -15%')).toBeVisible();
  });
});

test.describe('Payment Flow - Method Selection', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display payment method options', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Check payment methods are displayed
    await expect(page.getByText('Orange Money')).toBeVisible();
    await expect(page.getByText('MTN MoMo')).toBeVisible();
    await expect(page.getByText('Espèces')).toBeVisible();
  });

  test('should navigate to phone input when Orange Money selected', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');

    // Should show phone input
    await expect(page.getByPlaceholder(/6XX/)).toBeVisible();
  });

  test('should validate Orange Money phone prefix', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '670000000'); // MTN prefix

    await page.click('text=Continuer');

    // Should show error
    await expect(page.getByText(/numéro Orange Money/i)).toBeVisible();
  });

  test('should show cash payment instructions', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Espèces');

    // Should show cash payment instructions
    await expect(page.getByText('Instructions pour le paiement en espèces')).toBeVisible();
    await expect(page.getByText('Présentez-vous dans l\'une de nos agences')).toBeVisible();
  });
});

test.describe('Payment Flow - OTP Verification', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should show OTP input after phone submission', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '620000002');
    await page.click('text=Continuer');

    // Should show OTP input
    await expect(page.getByText('Vérification OTP')).toBeVisible();
    await expect(page.getByText('Code envoyé')).toBeVisible();
  });

  test('should show resend countdown', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '620000002');
    await page.click('text=Continuer');

    // Should show countdown
    await expect(page.getByText(/Renvoyer le code dans \d+s/)).toBeVisible();
  });

  test('should process payment after OTP verification', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '620000002');
    await page.click('text=Continuer');

    // Enter OTP
    await page.fill('[id="otp"]', '123456');
    await page.click('text=Confirmer le paiement');

    // Should show processing or success
    await expect(page.getByText(/Traitement en cours|Paiement réussi/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Payment Flow - Escrow Status', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display escrow status after payment', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/dashboard/mes-paiements`);

    // Click on payment in escrow
    await page.click('text=PAY-20250115-X1Y2Z');

    // Should show escrow info
    await expect(page.getByText(/séquestre|escrow/i)).toBeVisible();
  });

  test('should show escrow countdown', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/dashboard/mes-paiements`);

    // Should show escrow badge
    await expect(page.getByText('En séquestre')).toBeVisible();
  });
});

test.describe('Payment History (FR-048)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display payment history', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Should show payment list
    await expect(page.getByText('PAY-20250115-X1Y2Z')).toBeVisible();
  });

  test('should filter payments by status', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Select status filter
    await page.selectOption('[id="status-filter"]', 'escrow');

    // Should filter results
    await expect(page.getByText('En séquestre')).toBeVisible();
  });

  test('should export payments to CSV', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Set up download handler
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Exporter CSV'),
    ]);

    expect(download.suggestedFilename()).toContain('paiements');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should display payment totals', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Should show totals summary
    await expect(page.getByText('Total:')).toBeVisible();
    await expect(page.getByText('Loyers:')).toBeVisible();
    await expect(page.getByText('Cautions:')).toBeVisible();
    await expect(page.getByText('Commissions:')).toBeVisible();
  });
});

test.describe('Owner Payment Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Override auth for proprietaire
    await page.route('**/api/auth/verify', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            user: { id: TEST_PROPRIETAIRE.id, nom_complet: TEST_PROPRIETAIRE.name, type_compte: 'proprietaire' },
            token: 'test-token',
          },
        },
      });
    });
  });

  test('should allow owner to validate payment', async ({ page }) => {
    await login(page, TEST_PROPRIETAIRE.phone, TEST_PROPRIETAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Should show validation option for escrow payments
    await expect(page.getByText('Valider')).toBeVisible();
  });
});

test.describe('Quittance Download (FR-047)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should show download button for confirmed payments', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto('/dashboard/mes-paiements');

    // Click on confirmed payment
    await page.click('text=Confirmé');

    // Should show download button
    await expect(page.getByText(/Télécharger quittance/i)).toBeVisible();
  });
});

test.describe('Payment Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should have proper labels for form inputs', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');

    // Phone input should have label
    const phoneLabel = page.locator('label[for="phone"]');
    await expect(phoneLabel).toBeVisible();
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Tab through payment method buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to select with Enter
    await page.keyboard.press('Enter');

    // Should navigate to next step
    await expect(page.getByPlaceholder(/6XX/)).toBeVisible();
  });
});

test.describe('Payment Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display payment form correctly on mobile', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Payment methods should stack vertically on mobile
    const orangeButton = page.getByText('Orange Money');
    const mtnButton = page.getByText('MTN MoMo');

    await expect(orangeButton).toBeVisible();
    await expect(mtnButton).toBeVisible();

    // They should be vertically aligned
    const orangeBox = await orangeButton.boundingBox();
    const mtnBox = await mtnButton.boundingBox();

    if (orangeBox && mtnBox) {
      // On mobile, buttons should be stacked (same x, different y)
      expect(Math.abs(orangeBox.x - mtnBox.x)).toBeLessThan(50);
    }
  });

  test('should display invoice breakdown on mobile', async ({ page }) => {
    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // Invoice sections should be visible
    await expect(page.getByText('Loyer')).toBeVisible();
    await expect(page.getByText('Commission plateforme')).toBeVisible();
    await expect(page.getByText('11 250 000 GNF')).toBeVisible();
  });
});

test.describe('Payment Error Handling', () => {
  test('should display error on payment failure', async ({ page }) => {
    await setupApiMocks(page);

    // Override payment endpoint to fail
    await page.route('**/api/payments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          json: {
            success: false,
            message: 'Solde insuffisant',
          },
        });
      } else {
        await route.continue();
      }
    });

    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '620000002');
    await page.click('text=Continuer');
    await page.fill('[id="otp"]', '123456');
    await page.click('text=Confirmer le paiement');

    // Should show error
    await expect(page.getByText(/erreur|échoué/i)).toBeVisible({ timeout: 5000 });
  });

  test('should allow retry after failure', async ({ page }) => {
    await setupApiMocks(page);

    let callCount = 0;
    await page.route('**/api/payments', async (route) => {
      if (route.request().method() === 'POST') {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({
            status: 500,
            json: { success: false, message: 'Erreur serveur' },
          });
        } else {
          await route.fulfill({
            status: 201,
            json: { success: true, data: { payment: MOCK_PAYMENT } },
          });
        }
      } else {
        await route.continue();
      }
    });

    await login(page, TEST_LOCATAIRE.phone, TEST_LOCATAIRE.otp);
    await page.goto(`/contrats/${MOCK_CONTRACT.id}/paiement`);

    // First attempt fails
    await page.click('text=Orange Money');
    await page.fill('[id="phone"]', '620000002');
    await page.click('text=Continuer');
    await page.fill('[id="otp"]', '123456');
    await page.click('text=Confirmer le paiement');

    // Wait for error
    await expect(page.getByText(/Réessayer/i)).toBeVisible({ timeout: 5000 });

    // Retry
    await page.click('text=Réessayer');

    // Should return to method selection
    await expect(page.getByText('Orange Money')).toBeVisible();
  });
});
