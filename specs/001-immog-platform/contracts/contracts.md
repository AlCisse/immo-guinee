# API Contract: Contracts & Electronic Signatures

**Domain**: Contract Generation, Electronic Signatures, PDF Archiving
**Base URL**: `/api/contracts`
**Version**: 1.0
**Last Updated**: 2025-01-28

---

## Overview

This contract defines endpoints for automatic contract generation (User Story 2) and electronic signatures via OTP SMS (User Story 3).

**Key Requirements**:
- **FR-022**: 5 contract types (bail résidentiel, bail commercial, promesse vente, mandat gestion, attestation caution)
- **FR-023**: 3-step guided form (< 5 minutes total)
- **FR-024**: Professional PDF with Guinea law 2016/037 compliance
- **FR-025**: PDF preview before signature
- **FR-028**: OTP SMS signature (6-digit code, 5-min validity)
- **FR-029**: Anti-fraud: Max 3 OTP attempts, 5-min lockout
- **FR-030**: Signature metadata (name, timestamp, SHA-256 hash)
- **FR-032**: Immutable after full signature
- **FR-033**: 48h retraction period

---

## Endpoints

### 1. Generate Contract

**POST /api/contracts/generate**

**Request**:
```json
{
  "type_contrat": "BAIL_LOCATION_RESIDENTIEL",
  "annonce_id": "uuid-v4",
  "locataire_id": "uuid-v4",
  "donnees": {
    "duree_bail_mois": 12,
    "montant_loyer_gnf": 2500000,
    "montant_caution_gnf": 7500000,
    "date_debut": "2025-02-01",
    "clauses_specifiques": ["Gardiennage inclus", "Paiement EDG par locataire"]
  }
}
```

**Response** (201 Created - < 5 seconds per SC-006):
```json
{
  "success": true,
  "data": {
    "contract": {
      "id": "uuid-v4",
      "type_contrat": "BAIL_LOCATION_RESIDENTIEL",
      "statut": "BROUILLON",
      "fichier_pdf_url": "https://s3.../contracts/preview/uuid.pdf",
      "hash_sha256": null,
      "signatures": [],
      "date_creation": "2025-01-28T14:30:00Z"
    }
  }
}
```

**Side Effects**:
1. Generate PDF using Puppeteer + Handlebars template (see research.md Section 9)
2. Upload to S3: `contracts/preview/{contract_id}.pdf`
3. Auto-fill from listing and user profiles

---

### 2. Preview Contract PDF

**GET /api/contracts/:id/preview**

**Response**: PDF file (Content-Type: application/pdf)

---

### 3. Send Contract for Signature

**POST /api/contracts/:id/send**

**Response**:
```json
{
  "success": true,
  "message": "Contrat envoyé au locataire pour signature",
  "data": {
    "statut": "EN_ATTENTE_SIGNATURE",
    "notifications_sent": ["SMS", "Email", "Push", "WhatsApp"]
  }
}
```

**Side Effects** (FR-027):
1. Send SMS with link: "Nouveau contrat à signer: immog.ne/c/{id}"
2. Send Email with PDF attachment + signature link
3. Send Push notification
4. Send WhatsApp (if opted-in)
5. Update `statut: EN_ATTENTE_SIGNATURE`

---

### 4. Request Signature OTP

**POST /api/contracts/:id/sign/request-otp**

**Response**:
```json
{
  "success": true,
  "message": "Code OTP envoyé à +224 622 123 456",
  "data": {
    "otp_expires_at": "2025-01-28T14:35:00Z",
    "session_token": "temp-token"
  }
}
```

**Side Effects**:
1. Generate 6-digit OTP
2. Send SMS via Twilio
3. Store in Redis: `otp:{phone}:contract:{contract_id}` (TTL: 300s)

---

### 5. Sign Contract with OTP

**POST /api/contracts/:id/sign**

**Request**:
```json
{
  "otp_code": "123456",
  "session_token": "temp-token"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Signature enregistrée",
  "data": {
    "contract": {
      "id": "uuid-v4",
      "statut": "PARTIELLEMENT_SIGNE",  // or "SIGNE_ARCHIVE" if both signed
      "signatures": [
        {
          "user_id": "uuid-v4",
          "nom_complet": "Mamadou Diallo",
          "timestamp": "2025-01-28T14:35:22.000Z",
          "otp_valide": true
        }
      ],
      "delai_retractation_expire": "2025-01-30T14:35:22.000Z"  // +48h
    }
  }
}
```

**Side Effects** (FR-030, FR-032):
1. Add signature to `signatures` JSON array
2. If both parties signed:
   - Generate final PDF with signatures
   - Calculate SHA-256 hash
   - Update `statut: SIGNE_ARCHIVE`
   - Set `delai_retractation_expire: NOW() + 48h`
   - Trigger n8n: `signature-contrat-archivage` workflow
   - Upload to S3 with encryption: `contracts/{id}.pdf`
   - Send copies to both parties (Email + SMS)

---

### 6. Cancel Contract (Before Full Signature)

**DELETE /api/contracts/:id**

**Requirements**: Only if `statut != SIGNE_ARCHIVE`

**Response**:
```json
{
  "success": true,
  "message": "Contrat annulé"
}
```

---

### 7. Download Signed Contract

**GET /api/contracts/:id/download**

**Authentication**: Required (must be signatory)

**Response**: PDF file with watermark (FR-036)

**Side Effects**: Log download event (FR-085)

---

## Contract PDF Template Structure (FR-024)

```handlebars
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    .header { text-align: center; font-weight: bold; margin-bottom: 2cm; }
    .article { margin-bottom: 1cm; }
    .signature-block { margin-top: 3cm; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RÉPUBLIQUE DE GUINÉE</h1>
    <p>Conforme à la loi 2016/037 sur les signatures électroniques</p>
    <h2>CONTRAT DE LOCATION RÉSIDENTIEL</h2>
    <img src="data:image/png;base64,{logo_immog}" width="100" />
  </div>

  <div class="article">
    <h3>Article 1 - PARTIES</h3>
    <p><strong>Propriétaire:</strong> {{landlord.nom_complet}}, CNI {{landlord.cni}}</p>
    <p><strong>Locataire:</strong> {{tenant.nom_complet}}, CNI {{tenant.cni}}</p>
  </div>

  <div class="article">
    <h3>Article 2 - DESCRIPTION DU BIEN</h3>
    <p>{{listing.type_bien}} situé à {{listing.adresse_complete}}</p>
    <p>Superficie: {{listing.superficie_m2}} m²</p>
    <p>Équipements: {{#each listing.equipements}}{{this}}, {{/each}}</p>
  </div>

  <div class="article">
    <h3>Article 3 - LOYER ET CAUTION</h3>
    <p>Loyer mensuel: {{formatGNF contract.montant_loyer_gnf}} GNF</p>
    <p>Caution ({{contract.caution_mois}} mois): {{formatGNF contract.montant_caution_gnf}} GNF</p>
  </div>

  <!-- Articles 4-8: EDG/SEG, Sécurité, Durée, Résiliation, etc. -->

  <div class="signature-block">
    <div>
      <p><strong>Propriétaire</strong></p>
      {{#if contract.signature_landlord}}
        <p>{{contract.signature_landlord.nom_complet}}</p>
        <p>Signé le {{contract.signature_landlord.timestamp}}</p>
      {{else}}
        <p>_______________________</p>
        <p>En attente de signature</p>
      {{/if}}
    </div>
    <div>
      <p><strong>Locataire</strong></p>
      {{#if contract.signature_tenant}}
        <p>{{contract.signature_tenant.nom_complet}}</p>
        <p>Signé le {{contract.signature_tenant.timestamp}}</p>
      {{else}}
        <p>_______________________</p>
        <p>En attente de signature</p>
      {{/if}}
    </div>
  </div>

  <p style="text-align: center; margin-top: 2cm;">
    <em>Cachet électronique ImmoGuinée</em><br>
    Hash SHA-256: {{contract.hash_sha256}}
  </p>
</body>
</html>
```

---

## Testing Checklist

- [ ] PDF generation completes in < 5 seconds (SC-006)
- [ ] PDF contains all mandatory clauses (FR-024)
- [ ] OTP SMS sent and validated correctly (FR-028)
- [ ] Max 3 OTP attempts enforced (FR-029)
- [ ] Signature adds timestamp + hash (FR-030)
- [ ] Contract immutable after full signature (FR-032)
- [ ] 48h retraction period enforced (FR-033)
- [ ] PDF archived with AES-256 encryption (FR-034)
- [ ] Watermark added on download (FR-036)

---

**Contract Status**: ✅ Complete
**Next Contract**: `messaging.md`
