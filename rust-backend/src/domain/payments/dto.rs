//! Payment shapes (US4). The frontend `usePayments` hook uses lowercase status /
//! method vocab (`escrow`, `confirme`, `orange_money`…) — mapped here from the DB
//! SCREAMING_SNAKE enums. Invoice = deposit (to owner, via escrow) + platform
//! commission (50% of one month's rent, collected up-front).

use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::db::entities::sea_orm_active_enums::{MethodePaiement, StatutPaiement};
use crate::db::entities::{contract, listing, payment, user};

#[derive(Debug, Deserialize, validator::Validate)]
pub struct InitiateRequest {
    pub contract_id: Uuid,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ProcessRequest {
    pub contract_id: Uuid,
    pub methode_paiement: String,
    pub numero_telephone: Option<String>,
    /// FR-045: TOTP code required when montant_total > 500 000 GNF.
    #[serde(default)]
    pub totp_code: Option<String>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct ValidateRequest {
    pub validated: bool,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize, validator::Validate)]
pub struct RefundRequest {
    pub reason: Option<String>,
}

/// Amounts derived from a signed contract's stored data.
pub struct Invoice {
    pub loyer: i64,
    pub caution: i64,
    pub commission: i64,
    pub total: i64,
}

impl Invoice {
    /// Commission is 50% of one month's rent; the deposit is what the owner
    /// receives (held in escrow until they confirm).
    pub fn from_contract(c: &contract::Model) -> Self {
        let d = &c.donnees_personnalisees;
        let gi = |k: &str| d.get(k).and_then(Value::as_i64).unwrap_or(0);
        let loyer = gi("montant_loyer");
        let caution = gi("montant_caution");
        let commission = loyer / 2;
        Invoice { loyer, caution, commission, total: caution + commission }
    }
}

/// Format an amount in GNF with space grouping (mirrors the contract formatter).
pub fn fmt_gnf(v: i64) -> String {
    let s = v.abs().to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push(' ');
        }
        out.push(c);
    }
    format!("{} GNF", out.chars().rev().collect::<String>())
}

/// The invoice payload the frontend `PaymentInvoice` reads.
pub fn invoice_json(c: &contract::Model, inv: &Invoice) -> Value {
    json!({
        "contract_reference": super::reference_paiement_for(c.id),
        "contract_type": c.type_contrat,
        "sections": [
            { "label": "Caution", "amount": inv.caution, "formatted": fmt_gnf(inv.caution),
              "description": "Restituée en fin de bail (déduction faite des sommes dues)" },
            { "label": "Commission plateforme (50% d'un mois de loyer)", "amount": inv.commission,
              "formatted": fmt_gnf(inv.commission), "non_refundable": true,
              "description": "Génération du contrat, signatures et archivage" },
        ],
        "total": { "amount": inv.total, "formatted": fmt_gnf(inv.total) },
        "pour_proprietaire": { "amount": inv.caution, "formatted": fmt_gnf(inv.caution) },
        "pour_plateforme": { "amount": inv.commission, "formatted": fmt_gnf(inv.commission) },
    })
}

pub fn statut_str(s: &StatutPaiement) -> &'static str {
    match s {
        StatutPaiement::Initie => "en_attente",
        StatutPaiement::EnAttenteOtp => "en_cours",
        StatutPaiement::EnEscrow | StatutPaiement::CommissionCollectee => "escrow",
        StatutPaiement::Confirme => "confirme",
        StatutPaiement::Echoue => "echoue",
        StatutPaiement::Rembourse => "rembourse",
    }
}

pub fn methode_str(m: &MethodePaiement) -> &'static str {
    match m {
        MethodePaiement::OrangeMoney => "orange_money",
        MethodePaiement::MtnMomo => "mtn_momo",
        MethodePaiement::Especes => "especes",
        MethodePaiement::VirementBancaire => "virement",
    }
}

pub fn parse_methode(s: &str) -> MethodePaiement {
    match s {
        "mtn_momo" | "MTN_MOMO" => MethodePaiement::MtnMomo,
        "especes" | "ESPECES" => MethodePaiement::Especes,
        "virement" | "VIREMENT_BANCAIRE" => MethodePaiement::VirementBancaire,
        _ => MethodePaiement::OrangeMoney,
    }
}

/// The payment shape the frontend `Payment` type reads (parties + contract embedded).
pub fn payment_json(
    p: &payment::Model,
    contract: Option<&contract::Model>,
    listing: Option<&listing::Model>,
    beneficiaire: Option<&user::Model>,
) -> Value {
    let loyer = contract
        .and_then(|c| c.donnees_personnalisees.get("montant_loyer").and_then(Value::as_i64))
        .unwrap_or(0);
    json!({
        "id": p.id,
        "reference_paiement": super::reference_paiement_for(p.id),
        "montant_loyer": loyer,
        "montant_caution": p.montant_gnf,
        "montant_frais_service": p.commission_plateforme_gnf,
        "montant_total": p.montant_total_gnf,
        "methode_paiement": methode_str(&p.methode_paiement),
        "statut_paiement": statut_str(&p.statut),
        "numero_transaction_externe": p.numero_transaction_externe,
        "quittance_url": p.quittance_pdf_url,
        "created_at": p.date_creation,
        "date_validation_proprietaire": p.date_validation_beneficiaire,
        "contrat": contract.map(|c| json!({
            "id": c.id,
            "reference": super::reference_paiement_for(c.id),
            "listing": listing.map(|l| json!({ "titre": l.titre, "quartier": l.quartier })),
        })),
        "beneficiaire": beneficiaire.map(|u| json!({ "nom_complet": u.nom_complet })),
    })
}
