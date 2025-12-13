# API Contract: Payments & Escrow

**Domain**: Mobile Money Payments, Escrow, Commission Collection, Quittances
**Base URL**: `/api/payments`
**Version**: 1.0
**Last Updated**: 2025-01-28

---

## Overview

This contract defines the **CRITICAL** payment workflow for ImmoGuinée, including the commission payment on caution day (User Story 4), escrow management, and quittance generation.

**Key Requirements**:
- **FR-039**: Orange Money & MTN Mobile Money API integration
- **FR-040**: Auto-calculate commission (50% monthly rent for location, 1-2% for sales)
- **FR-041**: Generate detailed invoice (caution + commission)
- **FR-042**: Display transparency message about commission
- **FR-043**: **CRITICAL WORKFLOW** - Commission collected IMMEDIATELY on caution day
- **FR-044**: 48h escrow timeout with auto-release
- **FR-045**: 2FA OTP for payments > 500K GNF
- **FR-046**: Auto-generate quittance PDF
- **FR-051**: 3-attempt retry logic
- **FR-052**: Cash payment fallback

---

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Contract Signed                                        │
│ ├─ Landlord and Tenant sign contract via OTP                   │
│ └─ System generates invoice: Caution + Commission               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Tenant Initiates Payment (User Story 4)               │
│ ├─ Tenant clicks "Payer" button                                │
│ ├─ Invoice shows: Caution 7.5M + Commission 1.25M = 8.75M GNF  │
│ ├─ Tenant selects Orange Money or MTN MoMo                     │
│ └─ Redirect to Mobile Money provider                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Payment Confirmation (Webhook)                        │
│ ├─ Orange/MTN sends webhook: "Payment SUCCESS"                 │
│ ├─ System places 7.5M in ESCROW (PostgreSQL)                   │
│ ├─ System extracts 1.25M commission IMMEDIATELY → ImmoG account│
│ ├─ Commission status: CONFIRMÉ (non-refundable)                │
│ └─ Notify landlord: "Caution received, awaiting your validation"│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Landlord Validation (FR-044)                          │
│ ├─ Landlord clicks "Confirmer réception caution"               │
│ ├─ System releases 7.5M from escrow → Landlord account         │
│ ├─ System generates quittance PDF (caution receipt)            │
│ └─ Both parties receive quittance via Email + SMS              │
│                                                                  │
│ ALTERNATIVE: 48h timeout                                        │
│ ├─ If landlord doesn't validate within 48h                     │
│ ├─ n8n cron sends 3 reminders (24h, 36h, 48h)                  │
│ ├─ After 72h: Auto-release escrow (anti-abuse protection)      │
│ └─ Quittance generated automatically                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### 1. Get Invoice (After Contract Signature)

**Endpoint**: `GET /api/payments/invoice/:contract_id`

**Description**: Retrieves payment invoice for a signed contract (FR-041).

**Authentication**: Required (must be tenant/buyer)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "uuid-v4",
      "contrat_id": "uuid-v4",
      "type_operation": "LOCATION",
      "ligne_caution": {
        "label": "Caution (3 mois de loyer)",
        "montant_unitaire_gnf": "2500000",
        "quantite": 3,
        "montant_total_gnf": "7500000"
      },
      "ligne_commission": {
        "label": "Commission plateforme ImmoGuinée (50% d'un mois de loyer)",
        "calcul": "2,500,000 GNF × 50% = 1,250,000 GNF",
        "montant_gnf": "1250000",
        "reduction_applicable": false,  // true if user has OR/DIAMANT badge
        "badge_utilisateur": "BRONZE"
      },
      "montant_total_gnf": "8750000",
      "date_limite_paiement": "2025-02-01T00:00:00Z",  // Date début bail
      "message_transparence": "⚠️ IMPORTANT : Le paiement de la commission (1,250,000 GNF) est obligatoire le même jour que la caution. La commission est collectée par ImmoGuinée pour les services de génération de contrat, signatures électroniques et archivage sécurisé 10 ans. Cette commission n'est PAS remboursable, même en cas d'annulation du contrat après le délai de rétractation de 48h.",
      "methodes_paiement_disponibles": ["ORANGE_MONEY", "MTN_MOMO", "ESPECES"]
    }
  }
}
```

---

### 2. Initiate Payment (Orange Money / MTN MoMo)

**Endpoint**: `POST /api/payments/initiate`

**Description**: Initiates Mobile Money payment and redirects to provider.

**Authentication**: Required (must be payer)

**Request Body**:
```json
{
  "contrat_id": "uuid-v4",
  "methode_paiement": "ORANGE_MONEY",  // ORANGE_MONEY | MTN_MOMO
  "montant_total_gnf": 8750000,
  "telephone_paiement": "+224622123456"  // Must match authenticated user's phone
}
```

**Validation**:
- `montant_total_gnf` MUST match invoice total (cannot pay caution without commission!)
- `telephone_paiement` MUST be Guinea phone number (+224 6XX XXX XXX)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Redirection vers Orange Money...",
  "data": {
    "payment_id": "uuid-v4",
    "payment_url": "https://api.orange.com/orange-money-webpay/gn/v1/webpayment?merchantId=...&amount=8750000&reference=PAY-uuid",
    "reference_externe": "PAY-uuid-v4",
    "montant_gnf": "8750000",
    "expire_at": "2025-01-28T15:00:00Z"  // 30 minutes to complete payment
  }
}
```

**Side Effects**:
1. Create payment record:
   ```typescript
   {
     type_paiement: 'CAUTION',
     montant_gnf: 7500000,
     commission_plateforme_gnf: 1250000,
     montant_total_gnf: 8750000,
     methode_paiement: 'ORANGE_MONEY',
     statut: 'INITIE',
     tentatives_paiement: 1
   }
   ```
2. Store payment session in Redis (TTL: 30 min)
3. If `montant_total_gnf > 500000`, prepare OTP 2FA flow (FR-045)

---

### 3. Orange Money Webhook (Payment Confirmation)

**Endpoint**: `POST /api/payments/webhooks/orange`

**Description**: Receives payment confirmation from Orange Money (FR-043 Étape 4-7).

**Authentication**: API key validation (Orange Money secret)

**Request Body** (from Orange Money):
```json
{
  "status": "SUCCESS",  // SUCCESS | FAILED | PENDING
  "transaction_id": "OM-20250128-123456",
  "reference": "PAY-uuid-v4",
  "amount": 8750000,
  "currency": "GNF",
  "customer_phone": "+224622123456",
  "timestamp": "2025-01-28T14:35:00Z",
  "signature": "sha256-hmac-signature"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook traité"
}
```

**Critical Business Logic** (FR-043):

```typescript
// Step 5: Place in ESCROW
await prisma.payment.update({
  where: { reference_externe: body.reference },
  data: {
    statut: 'EN_ESCROW',
    numero_transaction_externe: body.transaction_id,
    date_confirmation: new Date()
  }
})

// Step 6: Extract commission IMMEDIATELY
const commissionPayment = await prisma.payment.create({
  data: {
    payeur_id: tenant.id,
    beneficiaire_id: IMMOG_PLATFORM_ACCOUNT_ID,
    contrat_id: contract.id,
    type_paiement: 'COMMISSION_PLATEFORME',
    montant_gnf: 1250000,
    statut: 'CONFIRME',  // ✅ Commission collected immediately!
    date_confirmation: new Date()
  }
})

// Step 7: Notify landlord
await n8n.trigger('payment-escrow-notification', {
  landlord_id: contract.proprietaire_id,
  tenant_id: contract.locataire_acheteur_id,
  montant_caution_gnf: 7500000,
  montant_commission_gnf: 1250000,
  contract_id: contract.id
})

// Schedule 48h timeout check (FR-044)
await n8n.schedule('escrow-timeout-check', {
  payment_id: payment.id,
  run_at: new Date(Date.now() + 48 * 60 * 60 * 1000)  // +48 hours
})
```

**Side Effects**:
1. Update payment `statut: EN_ESCROW`
2. Create separate commission payment record with `statut: CONFIRME`
3. Send 4-channel notification to landlord:
   - SMS: "Paiement caution reçu (7,500,000 GNF). Confirmez la réception sur ImmoGuinée."
   - Email: Detailed notification with action button
   - Push: "Nouvelle caution en attente de validation"
   - WhatsApp (if opted-in): Same as SMS
4. Schedule n8n cron job for 48h timeout check

---

### 4. MTN Mobile Money Webhook (Payment Confirmation)

**Endpoint**: `POST /api/payments/webhooks/mtn`

**Description**: Same logic as Orange Money webhook, different payload format.

**Request Body** (from MTN):
```json
{
  "financialTransactionId": "MTN-20250128-789012",
  "externalId": "PAY-uuid-v4",
  "amount": "8750000",
  "currency": "GNF",
  "payer": {
    "partyIdType": "MSISDN",
    "partyId": "224622123456"
  },
  "status": "SUCCESSFUL",
  "reason": null
}
```

**Logic**: Same as Orange Money webhook (steps 5-7 of FR-043)

---

### 5. Landlord Validates Caution Receipt

**Endpoint**: `POST /api/payments/escrow/validate/:payment_id`

**Description**: Landlord confirms caution reception, releases escrow (FR-044).

**Authentication**: Required (must be landlord)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Caution débloquée et transférée sur votre compte",
  "data": {
    "payment": {
      "id": "uuid-v4",
      "montant_gnf": "7500000",
      "statut": "CONFIRME",
      "date_validation_beneficiaire": "2025-01-28T16:00:00Z",
      "date_deblocage_escrow": "2025-01-28T16:00:01Z"
    },
    "quittance_url": "https://s3.../quittances/PAY-uuid.pdf"
  }
}
```

**Side Effects** (FR-046, FR-047):
1. Update payment: `statut: CONFIRME`, `date_deblocage_escrow: NOW()`
2. Generate quittance PDF (Puppeteer):
   ```
   QUITTANCE DE CAUTION
   ImmoGuinée - Plateforme Immobilière

   Date: 28/01/2025 à 16:00:01 GMT

   Payeur: Mamadou Diallo (+224 622 123 456)
   Bénéficiaire: Alpha Barry (+224 622 987 654)

   Montant caution: 7,500,000 GNF
   (en lettres: Sept millions cinq cent mille francs guinéens)

   Méthode de paiement: Orange Money
   Numéro de transaction: OM-20250128-123456

   Objet: Caution pour location - Contrat #CONTRACT-uuid

   Cette quittance certifie le paiement de la caution.

   Signature électronique ImmoGuinée
   Hash: sha256-abc123...
   ```
3. Upload quittance PDF to S3: `quittances/{payment_id}.pdf`
4. Send quittance to both parties:
   - Email with PDF attachment
   - SMS with download link (valid 7 days)
   - Push notification
5. Update transaction status: `statut: COMPLETEE`
6. Trigger n8n workflow: `transaction-completee-request-rating`

---

### 6. Escrow Timeout Handler (48h Auto-Release)

**Endpoint**: `POST /api/payments/escrow/timeout` (Internal, called by n8n)

**Description**: Auto-releases escrow after 72h if landlord doesn't validate (FR-044).

**Authentication**: n8n API key

**Request Body**:
```json
{
  "payment_id": "uuid-v4"
}
```

**Logic**:
```typescript
const payment = await prisma.payment.findUnique({ where: { id: body.payment_id } })

// Check if still in escrow (not already validated)
if (payment.statut === 'EN_ESCROW') {
  const hoursSinceConfirmation = (Date.now() - payment.date_confirmation.getTime()) / (1000 * 60 * 60)

  if (hoursSinceConfirmation >= 72) {
    // Auto-release (anti-abuse protection)
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        statut: 'CONFIRME',
        date_deblocage_escrow: new Date(),
        date_validation_beneficiaire: new Date()  // Auto-validated
      }
    })

    // Generate quittance
    await generateQuittancePDF(payment.id)

    // Notify both parties
    await n8n.trigger('escrow-auto-released', { payment_id: payment.id })
  }
}
```

**Reminder Schedule** (before auto-release):
- **24h**: SMS to landlord "Confirmez la réception de la caution avant 48h"
- **36h**: Email + SMS "Dernière chance: Confirmez dans 12h"
- **48h**: Email + SMS + Push "Délai expiré. Auto-release dans 24h si pas de réponse"
- **72h**: Auto-release + quittance generation

---

### 7. Payment Failure Retry

**Endpoint**: `POST /api/payments/:payment_id/retry`

**Description**: Retries failed payment (max 3 attempts - FR-051).

**Authentication**: Required (must be payer)

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Tentative 2/3. Redirection vers Orange Money...",
  "data": {
    "payment_url": "https://api.orange.com/...",
    "tentatives_restantes": 1
  }
}
```

**Errors**:
- `400 Bad Request`: Max 3 attempts exceeded
- `409 Conflict`: Payment already confirmed

**Side Effects**:
1. Increment `tentatives_paiement` counter
2. If `tentatives_paiement > 3`, suggest cash payment fallback (FR-052)

---

### 8. Cash Payment Declaration (Fallback)

**Endpoint**: `POST /api/payments/cash`

**Description**: Declares cash payment with receipt upload (FR-052).

**Authentication**: Required (tenant)

**Request Body** (multipart/form-data):
```json
{
  "contrat_id": "uuid-v4",
  "montant_declare_gnf": 8750000,
  "date_paiement": "2025-01-28",
  "recu_photo": File  // Photo of handwritten receipt (max 5 MB)
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Déclaration de paiement en espèces enregistrée. En attente de validation du propriétaire.",
  "data": {
    "payment_id": "uuid-v4",
    "statut": "EN_ATTENTE_VALIDATION_PROPRIETAIRE"
  }
}
```

**Side Effects**:
1. Upload receipt photo to S3: `payments/cash-receipts/{payment_id}.jpg`
2. Create payment record: `statut: EN_ATTENTE_VALIDATION_PROPRIETAIRE`
3. Notify landlord: "Le locataire déclare un paiement en espèces. Confirmez la réception."
4. Landlord must validate manually (similar to escrow validation)
5. After landlord validation:
   - Commission collected manually: Bank transfer or Mobile Money from landlord to ImmoGuinée (7-day deadline)
   - ImmoGuinée sends invoice to landlord for commission payment

---

### 9. Get Payment History

**Endpoint**: `GET /api/payments/history`

**Description**: Retrieves authenticated user's payment history (FR-048).

**Authentication**: Required

**Query Parameters**:
```
?type=CAUTION  // Optional filter: CAUTION | LOYER_MENSUEL | COMMISSION_PLATEFORME | VENTE
&statut=CONFIRME  // Optional filter
&date_from=2024-01-01
&date_to=2025-01-28
&page=1
&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid-v4",
        "date_creation": "2025-01-28T14:30:00Z",
        "type_paiement": "CAUTION",
        "montant_gnf": "7500000",
        "commission_gnf": "1250000",
        "montant_total_gnf": "8750000",
        "methode_paiement": "ORANGE_MONEY",
        "statut": "CONFIRME",
        "quittance_url": "https://s3.../quittances/PAY-uuid.pdf",
        "beneficiaire": {
          "nom_complet": "Alpha Barry",
          "badge": "OR"
        },
        "contrat": {
          "id": "uuid-v4",
          "type_contrat": "BAIL_LOCATION_RESIDENTIEL"
        }
      },
      // ... more payments
    ],
    "pagination": { /* ... */ },
    "stats": {
      "total_paye_gnf": "25000000",
      "total_commissions_gnf": "3000000",
      "nombre_paiements": 5
    }
  }
}
```

---

### 10. Download Quittance PDF

**Endpoint**: `GET /api/payments/:payment_id/quittance`

**Description**: Downloads quittance PDF with watermark (FR-036).

**Authentication**: Required (must be payer or beneficiary)

**Response** (200 OK):
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="Quittance-PAY-uuid.pdf"`
- Body: PDF file with watermark "Téléchargé par {user.nom_complet} le {date}"

**Side Effects**:
1. Log audit event: `QUITTANCE_DOWNLOADED` (who, when, IP address)

---

## Commission Calculation Logic (FR-040)

```typescript
function calculateCommission(params: {
  type_operation: 'LOCATION' | 'VENTE'
  loyer_mensuel_gnf?: bigint
  prix_vente_gnf?: bigint
  type_bien?: string
  user_badge: Badge
}): bigint {
  let baseCommission: bigint

  if (params.type_operation === 'LOCATION') {
    // Location: 50% of monthly rent
    baseCommission = params.loyer_mensuel_gnf! / 2n
  } else if (params.type_operation === 'VENTE') {
    if (params.type_bien === 'TERRAIN') {
      // Terrain sale: 1%
      baseCommission = params.prix_vente_gnf! / 100n
    } else {
      // Maison/Villa sale: 2%
      baseCommission = (params.prix_vente_gnf! * 2n) / 100n
    }
  }

  // Apply badge reduction (FR-056)
  if (params.user_badge === 'OR') {
    // Or: -10% (50% → 40%)
    baseCommission = (baseCommission * 9n) / 10n
  } else if (params.user_badge === 'DIAMANT') {
    // Diamant: -20% (50% → 30%)
    baseCommission = (baseCommission * 8n) / 10n
  }

  return baseCommission
}
```

---

## Error Handling

**Error Codes**:
- `PAYMENT_ALREADY_COMPLETED`: Cannot retry completed payment
- `PAYMENT_MAX_ATTEMPTS`: Max 3 attempts exceeded
- `INVALID_AMOUNT`: Amount doesn't match invoice
- `PAYMENT_TIMEOUT`: Payment session expired (>30 min)
- `ESCROW_ALREADY_RELEASED`: Cannot validate already-released escrow
- `COMMISSION_NOT_INCLUDED`: Tenant tried to pay caution without commission
- `PROVIDER_ERROR`: Orange Money / MTN API error

---

## Security Considerations

1. **Webhook Signature Validation**: Verify HMAC-SHA256 signature from Orange/MTN
2. **Idempotency**: Use `reference_externe` as idempotency key (prevent duplicate processing)
3. **Amount Validation**: Always verify `montant_total_gnf` matches invoice (prevent underpayment)
4. **Rate Limiting**: Max 10 payment initiations per user per hour
5. **2FA OTP**: Required for payments > 500,000 GNF (FR-045)
6. **Audit Logging**: Log all payment state transitions (FR-085)

---

## Testing Checklist

- [ ] Invoice calculation correct: Caution + Commission (FR-041)
- [ ] Commission extracted IMMEDIATELY on payment confirmation (FR-043)
- [ ] Escrow releases after landlord validation (FR-044)
- [ ] Escrow auto-releases after 72h timeout (FR-044)
- [ ] Quittance PDF generated correctly (FR-046)
- [ ] Quittance sent via 3 channels: Email + SMS + Push (FR-047)
- [ ] Payment fails if amount != (caution + commission)
- [ ] Max 3 retry attempts enforced (FR-051)
- [ ] Cash payment fallback works (FR-052)
- [ ] Commission reduction applied for Or/Diamant badges (FR-056)
- [ ] Payment history displays correctly (FR-048)
- [ ] 2FA OTP triggered for payments > 500K GNF (FR-045)
- [ ] Webhook signature validation prevents spoofing
- [ ] Commission success rate >= 95% (SC-011)

---

**Contract Status**: ✅ Complete
**Critical Requirement**: Commission payment on caution day (User Story 4) fully specified
**Next Contract**: `contracts.md` (Contract Generation & Electronic Signatures)
