import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Contract Signature Flow (User Story 3)
 *
 * Tests the complete electronic signature workflow including:
 * - Contract viewing
 * - OTP request and verification
 * - 4-step signature process (FR-028)
 * - Retraction period countdown
 * - Contract cancellation during retraction
 */

// Test user credentials
const TEST_LOCATAIRE = {
  phone: '+224620000002',
  otp: '123456', // Mock OTP for testing
};

const TEST_PROPRIETAIRE = {
  phone: '+224620000001',
  otp: '654321',
};

// Helper function to login
async function login(page: any, phone: string, otp: string) {
  await page.goto('/auth/login');
  await page.fill('[data-testid="phone-input"]', phone);
  await page.click('[data-testid="login-submit"]');

  // Wait for OTP screen
  await page.waitForSelector('[data-testid="otp-input"]');

  // Fill OTP
  const otpDigits = otp.split('');
  for (let i = 0; i < otpDigits.length; i++) {
    await page.fill(`[data-testid="otp-input-${i}"]`, otpDigits[i]);
  }

  await page.click('[data-testid="verify-otp"]');

  // Wait for dashboard
  await page.waitForURL(/\/dashboard/);
}

test.describe('Contract Signature Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock API responses
    await page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/login')) {
        await route.fulfill({
          json: { success: true, message: 'OTP sent' }
        });
      } else if (url.includes('/verify')) {
        await route.fulfill({
          json: {
            success: true,
            data: {
              user: { id: 'user-1', nom_complet: 'Test User' },
              token: 'test-token'
            }
          }
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should display contract list', async ({ page }) => {
    // Mock contracts list
    await page.route('**/api/contracts/my**', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contracts: [
              {
                id: 'contract-1',
                reference: 'CTR-2024-001',
                type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
                statut: 'EN_ATTENTE_SIGNATURE',
                loyer_mensuel: 2500000,
                date_debut: '2024-01-01',
                date_fin: '2025-01-01',
                proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire Test' },
                locataire: { id: 'user-1', nom_complet: 'Locataire Test' },
                listing: {
                  id: 'listing-1',
                  titre: 'Appartement T3',
                  quartier: 'Kaloum',
                  photos: []
                },
                date_signature_proprietaire: null,
                date_signature_locataire: null,
              },
            ],
            pagination: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
          },
        },
      });
    });

    await page.goto('/dashboard/mes-contrats');

    // Should display contract card
    await expect(page.getByText('CTR-2024-001')).toBeVisible();
    await expect(page.getByText('Bail résidentiel')).toBeVisible();
    await expect(page.getByText('En attente')).toBeVisible();
  });

  test('should navigate to signature page', async ({ page }) => {
    // Mock contract details
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              fichier_pdf_url: '/contracts/test.pdf',
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire Test', telephone: '+224620000001' },
              locataire: { id: 'user-1', nom_complet: 'Locataire Test', telephone: '+224620000002' },
              listing: { id: 'listing-1', titre: 'Appartement T3', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            },
          },
        },
      });
    });

    await page.goto('/contrats/contract-1/signer');

    // Should show signature page elements
    await expect(page.getByText('Signer le contrat')).toBeVisible();
    await expect(page.getByText('CTR-2024-001')).toBeVisible();
    await expect(page.getByText('Statut des signatures')).toBeVisible();
  });

  test('should show signature modal with 4 steps', async ({ page }) => {
    // Mock contract
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              fichier_pdf_url: '/contracts/test.pdf',
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            },
          },
        },
      });
    });

    // Mock OTP request
    await page.route('**/api/contracts/contract-1/sign/request-otp', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'OTP sent',
          data: { expires_in: 300 },
        },
      });
    });

    // Set user ID in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Click sign button
    await page.click('button:has-text("Signer le contrat")');

    // Step 1: Accept terms
    await expect(page.getByText('Signature électronique')).toBeVisible();
    await expect(page.getByText('Avant de continuer')).toBeVisible();

    // Check the acceptance checkbox
    await page.click('input[type="checkbox"]');

    // Click continue
    await page.click('button:has-text("Continuer")');

    // Step 2: OTP verification
    await expect(page.getByText('Vérification OTP')).toBeVisible();
    await expect(page.getByText('Code valide pendant')).toBeVisible();
  });

  test('should complete signature flow with OTP', async ({ page }) => {
    // Mock contract
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              fichier_pdf_url: '/contracts/test.pdf',
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            },
          },
        },
      });
    });

    await page.route('**/api/contracts/contract-1/sign/request-otp', async (route) => {
      await route.fulfill({
        json: { success: true, data: { expires_in: 300 } },
      });
    });

    await page.route('**/api/contracts/contract-1/sign', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'Contrat signé avec succès',
          data: {
            signature: {
              signature_id: 'SIG-001',
              timestamp: new Date().toISOString(),
              hash: 'abc123def456',
            },
          },
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Start signature flow
    await page.click('button:has-text("Signer le contrat")');

    // Step 1: Accept
    await page.click('input[type="checkbox"]');
    await page.click('button:has-text("Continuer")');

    // Step 2: Enter OTP
    const otp = '123456';
    for (let i = 0; i < 6; i++) {
      await page.fill(`input[type="text"]:nth-of-type(${i + 1})`, otp[i]);
    }
    await page.click('button:has-text("Vérifier")');

    // Step 3: Confirm
    await expect(page.getByText('Confirmation finale')).toBeVisible();
    await page.click('button:has-text("Signer maintenant")');

    // Step 4: Success
    await expect(page.getByText('Signature enregistrée')).toBeVisible();
  });

  test('should display retraction countdown for signed contracts', async ({ page }) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h from now

    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'SIGNE',
              loyer_mensuel: 2500000,
              fichier_pdf_url: '/contracts/test.pdf',
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: new Date().toISOString(),
              date_signature_locataire: new Date().toISOString(),
              delai_retractation_expire: expiresAt,
            },
          },
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Should show retraction countdown
    await expect(page.getByText('Période de rétractation')).toBeVisible();
    await expect(page.getByText('Annuler le contrat')).toBeVisible();
    await expect(page.getByText('heures')).toBeVisible();
  });

  test('should allow contract cancellation during retraction', async ({ page }) => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'SIGNE',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: new Date().toISOString(),
              date_signature_locataire: new Date().toISOString(),
              delai_retractation_expire: expiresAt,
            },
          },
        },
      });
    });

    await page.route('**/api/contracts/contract-1/cancel', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'Contrat annulé avec succès',
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Click cancel button
    await page.click('button:has-text("Annuler le contrat")');

    // Should show confirmation modal
    await expect(page.getByText('Cette action est irréversible')).toBeVisible();

    // Fill cancellation reason
    await page.fill('textarea', 'Changement de situation personnelle');

    // Confirm cancellation
    await page.click('button:has-text("Confirmer l\'annulation")');

    // Should redirect to contracts list
    await page.waitForURL(/\/dashboard\/mes-contrats/);
  });

  test('should show expired retraction period', async ({ page }) => {
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago

    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'ACTIF',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
              date_signature_locataire: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
              delai_retractation_expire: expiredAt,
            },
          },
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Should show contract is active
    await expect(page.getByText('Contrat actif')).toBeVisible();
    await expect(page.getByText('La période de rétractation est terminée')).toBeVisible();
  });

  test('should allow download of signed contract', async ({ page }) => {
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'ACTIF',
              loyer_mensuel: 2500000,
              fichier_pdf_url: '/contracts/test.pdf',
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: new Date().toISOString(),
              date_signature_locataire: new Date().toISOString(),
              delai_retractation_expire: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Should show download button
    await expect(page.getByText('Télécharger le contrat signé')).toBeVisible();
  });

  test('should filter contracts by status', async ({ page }) => {
    await page.route('**/api/contracts/my**', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('statut');

      let contracts = [];
      if (!status || status.includes('EN_ATTENTE')) {
        contracts = [{
          id: 'contract-1',
          reference: 'CTR-2024-001',
          type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
          statut: 'EN_ATTENTE_SIGNATURE',
          loyer_mensuel: 2500000,
          proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
          locataire: { id: 'user-1', nom_complet: 'Locataire' },
          listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
          date_signature_proprietaire: null,
          date_signature_locataire: null,
        }];
      }

      await route.fulfill({
        json: {
          success: true,
          data: {
            contracts,
            pagination: { current_page: 1, last_page: 1, per_page: 10, total: contracts.length },
          },
        },
      });
    });

    await page.goto('/dashboard/mes-contrats');

    // Click on "En attente" filter
    await page.click('button:has-text("En attente")');

    // Should show filtered results
    await expect(page.getByText('CTR-2024-001')).toBeVisible();
  });

  test('should show pending action indicator', async ({ page }) => {
    await page.route('**/api/contracts/my**', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contracts: [{
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            }],
            pagination: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
          },
        },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/dashboard/mes-contrats');

    // Should show pending action banner
    await expect(page.getByText(/contrat.*en attente de votre signature/i)).toBeVisible();
  });

  test('should validate OTP format', async ({ page }) => {
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            },
          },
        },
      });
    });

    await page.route('**/api/contracts/contract-1/sign/request-otp', async (route) => {
      await route.fulfill({
        json: { success: true, data: { expires_in: 300 } },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Start signature flow
    await page.click('button:has-text("Signer le contrat")');
    await page.click('input[type="checkbox"]');
    await page.click('button:has-text("Continuer")');

    // Try to enter non-numeric characters (should be ignored)
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('abc');

    // Input should remain empty (only digits allowed)
    await expect(firstInput).toHaveValue('');
  });
});

test.describe('Contract Signature - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile viewport', async ({ page }) => {
    await page.route('**/api/contracts/my**', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contracts: [{
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            }],
            pagination: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
          },
        },
      });
    });

    await page.goto('/dashboard/mes-contrats');

    // Should display contract card on mobile
    await expect(page.getByText('CTR-2024-001')).toBeVisible();
    await expect(page.getByText('Signer le contrat')).toBeVisible();
  });
});

test.describe('Contract Signature - Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.route('**/api/contracts/my**', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contracts: [{
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'ACTIF',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: new Date().toISOString(),
              date_signature_locataire: new Date().toISOString(),
              delai_retractation_expire: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            }],
            pagination: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
          },
        },
      });
    });

    await page.goto('/dashboard/mes-contrats');

    // Check filter has aria-label
    await expect(page.locator('select[aria-label="Filtrer par rôle"]')).toBeVisible();

    // Check download button has aria-label
    await expect(page.locator('button[aria-label="Télécharger"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.route('**/api/contracts/contract-1', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            contract: {
              id: 'contract-1',
              reference: 'CTR-2024-001',
              type_contrat: 'BAIL_LOCATION_RESIDENTIEL',
              statut: 'EN_ATTENTE_SIGNATURE',
              loyer_mensuel: 2500000,
              proprietaire: { id: 'owner-1', nom_complet: 'Propriétaire' },
              locataire: { id: 'user-1', nom_complet: 'Locataire' },
              listing: { id: 'listing-1', titre: 'Appartement', quartier: 'Kaloum', photos: [] },
              date_signature_proprietaire: null,
              date_signature_locataire: null,
            },
          },
        },
      });
    });

    await page.route('**/api/contracts/contract-1/sign/request-otp', async (route) => {
      await route.fulfill({
        json: { success: true, data: { expires_in: 300 } },
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('user_id', 'user-1');
    });

    await page.goto('/contrats/contract-1/signer');

    // Tab to sign button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const signButton = page.locator('button:has-text("Signer le contrat")');
    await signButton.focus();
    await page.keyboard.press('Enter');

    // Modal should open
    await expect(page.getByText('Signature électronique')).toBeVisible();
  });
});
