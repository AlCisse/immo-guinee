//! Contract request/response shapes (US2). The frontend `useContracts` hook drives
//! these: creation payload, and the `Contract` object it reads (parties + listing
//! embedded, amounts/dates lifted from `donnees_personnalisees`).

use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;
use validator::ValidationError;

use crate::db::entities::{contract, listing, user};

/// Nombre max de clauses spéciales et longueur max par clause (S12). Sans
/// limite, un payload avec des milliers de clauses (ou des clauses très longues)
/// fait DoS sur le rendu PDF Typst (US2) — génération CPU-bound, potentiellement
/// des secondes par contrat.
const MAX_CLAUSES: usize = 50;
const MAX_CLAUSE_LEN: usize = 500;

fn validate_clauses(clauses: &Vec<String>) -> Result<(), ValidationError> {
    if clauses.len() > MAX_CLAUSES {
        let mut err = ValidationError::new("len");
        err.message = Some(format!("trop de clauses (max {MAX_CLAUSES})").into());
        return Err(err);
    }
    for c in clauses {
        if c.chars().count() > MAX_CLAUSE_LEN {
            let mut err = ValidationError::new("len");
            err.message =
                Some(format!("clause trop longue (max {MAX_CLAUSE_LEN} caractères)").into());
            return Err(err);
        }
    }
    Ok(())
}

/// `POST /contracts` payload (frontend `GenerateContractData`). `type_contrat` is
/// the simplified `location` / `vente`; it maps to the DB `TypeContrat` enum.
#[derive(Debug, Deserialize, validator::Validate)]
pub struct GenerateContractRequest {
    pub listing_id: Uuid,
    pub locataire_id: Option<Uuid>,
    pub type_contrat: String,
    #[validate(length(min = 4, message = "date de début requise"))]
    pub date_debut: String,
    pub date_fin: Option<String>,
    pub duree_mois: Option<i64>,
    pub duree_indeterminee: Option<bool>,
    pub montant_loyer: Option<i64>,
    pub montant_caution: Option<i64>,
    pub prix_vente: Option<i64>,
    #[validate(custom(function = "validate_clauses"))]
    pub clauses_speciales: Option<Vec<String>>,
}

/// Human-readable reference derived from the id (not stored): `CTR-XXXXXXXX`.
pub fn reference_for(id: Uuid) -> String {
    format!("CTR-{}", id.simple().to_string()[..8].to_uppercase())
}

/// A compact party block `{id, nom, prenom, telephone, email}` for embedding.
fn party(u: Option<&user::Model>) -> Value {
    match u {
        Some(u) => json!({
            "id": u.id,
            "nom": u.nom_complet,
            "prenom": "",
            "telephone": u.telephone,
            "email": u.email,
        }),
        None => Value::Null,
    }
}

/// Shape a contract for the frontend `Contract` type. Amounts/dates are read from
/// `donnees_personnalisees`; parties and the listing are embedded when available.
pub fn contract_json(
    c: &contract::Model,
    l: Option<&listing::Model>,
    proprietaire: Option<&user::Model>,
    locataire: Option<&user::Model>,
) -> Value {
    let d = &c.donnees_personnalisees;
    let get_i64 = |k: &str| d.get(k).and_then(Value::as_i64);
    let get_str = |k: &str| d.get(k).and_then(Value::as_str).map(str::to_owned);

    json!({
        "id": c.id,
        "reference": reference_for(c.id),
        "type_contrat": c.type_contrat,
        "statut": c.statut,
        "listing_id": c.annonce_id,
        "proprietaire_id": c.proprietaire_id,
        "locataire_id": c.locataire_acheteur_id,
        "loyer_mensuel": get_i64("montant_loyer"),
        "date_debut": get_str("date_debut"),
        "date_fin": get_str("date_fin"),
        "conditions_generales": d.get("clauses_speciales").cloned().unwrap_or(json!([])),
        "donnees_personnalisees": c.donnees_personnalisees,
        "fichier_pdf_url": c.fichier_pdf_url,
        "hash_sha256": c.hash_sha256,
        "delai_retractation_expire": c.delai_retractation_expire,
        "date_signature_complete": c.date_signature_complete,
        "signatures": c.signatures,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "listing": l.map(|l| json!({
            "id": l.id,
            "titre": l.titre,
            "adresse": l.adresse_complete,
            "quartier": l.quartier,
            "type_bien": l.type_bien,
            "prix": l.prix_gnf,
        })),
        "proprietaire": party(proprietaire),
        "locataire": party(locataire),
    })
}
