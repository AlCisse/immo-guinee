//! Search query + filter building for public listing search (Phase 1, read-only).
//!
//! Public search returns only `DISPONIBLE` listings (FR-016: public search, no auth).
//! Filters: free-text `q`, type_operation, type_bien, quartier, prix min/max,
//! nombre_chambres (>=). Ordering: date_publication desc. Pagination by the caller.

use serde::de::DeserializeOwned;
use serde::Deserialize;
use sea_orm::sea_query::Expr;
use sea_orm::sea_query::extension::postgres::PgExpr; // .ilike() on Expr (case-insensitive)
use sea_orm::{ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, Select};

use crate::db::entities::listing;
use crate::db::entities::sea_orm_active_enums::{Quartier, StatutListing, TypeBien, TypeOperation};

/// Public listing search query params (all optional). Deserialized from the query
/// string by axum's `Query` extractor, e.g.
/// `?type_operation=LOCATION&quartier=KALOUM&prix_min=1000000&nombre_chambres=2&q=appartement`.
///
/// `type_operation`, `type_bien` and `quartier` accept a **comma-separated list**
/// (e.g. `type_bien=BUREAU,MAGASIN`) → matched with `IN`. They are raw strings so a
/// list doesn't fail enum deserialization; invalid tokens are ignored (not a 400).
#[derive(Debug, Clone, Default, Deserialize)]
pub struct ListingSearchQuery {
    pub q: Option<String>,
    pub type_operation: Option<String>,
    pub type_bien: Option<String>,
    pub quartier: Option<String>,
    pub prix_min: Option<i64>,
    pub prix_max: Option<i64>,
    pub nombre_chambres: Option<i32>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

/// Parse a comma-separated list into enum values. Tokens are trimmed and
/// upper-cased (DB enums are SCREAMING_SNAKE_CASE) then deserialized; anything that
/// doesn't match a variant is skipped, so a stray value never fails the request.
fn parse_enum_csv<T: DeserializeOwned>(csv: &str) -> Vec<T> {
    csv.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .filter_map(|s| serde_json::from_value::<T>(serde_json::Value::String(s.to_uppercase())).ok())
        .collect()
}

/// Map the frontend's property-type labels to the DB `type_bien` variants
/// (MAISON→VILLA, MAGASIN/BOUTIQUE→COMMERCE); pass others through unchanged.
fn map_type_bien_token(token: &str) -> String {
    match token.trim().to_uppercase().as_str() {
        "MAISON" => "VILLA".to_string(),
        "MAGASIN" | "BOUTIQUE" => "COMMERCE".to_string(),
        other => other.to_string(),
    }
}

/// Clamp pagination to sane bounds: page ≥ 1, per_page in 1..=50, defaults 1 / 20.
pub fn normalize_pagination(page: Option<u32>, per_page: Option<u32>) -> (u32, u32) {
    let page = page.unwrap_or(1).max(1);
    let per_page = per_page.unwrap_or(20).clamp(1, 50);
    (page, per_page)
}

/// Build a filtered SeaORM select for public listing search (no execution).
///
/// Pagination is applied by the caller: the count must run on the filtered select
/// *without* offset/limit, then the page is fetched with offset/limit.
pub fn apply_filters(q: &ListingSearchQuery) -> Select<listing::Entity> {
    let mut select = listing::Entity::find().filter(listing::Column::Statut.eq(StatutListing::Disponible));

    if let Some(csv) = &q.type_operation {
        let vals = parse_enum_csv::<TypeOperation>(csv);
        if !vals.is_empty() {
            select = select.filter(listing::Column::TypeOperation.is_in(vals));
        }
    }
    if let Some(csv) = &q.type_bien {
        let mapped = csv.split(',').map(map_type_bien_token).collect::<Vec<_>>().join(",");
        let vals = parse_enum_csv::<TypeBien>(&mapped);
        if !vals.is_empty() {
            select = select.filter(listing::Column::TypeBien.is_in(vals));
        }
    }
    if let Some(csv) = &q.quartier {
        let vals = parse_enum_csv::<Quartier>(csv);
        if !vals.is_empty() {
            select = select.filter(listing::Column::Quartier.is_in(vals));
        }
    }
    if let Some(v) = q.prix_min {
        select = select.filter(listing::Column::PrixGnf.gte(v));
    }
    if let Some(v) = q.prix_max {
        select = select.filter(listing::Column::PrixGnf.lte(v));
    }
    if let Some(v) = q.nombre_chambres {
        select = select.filter(listing::Column::NombreChambres.gte(v));
    }
    if let Some(text) = q.q.as_ref().map(String::as_str).filter(|s| !s.trim().is_empty()) {
        // NOTE: Phase 1 uses a simple ILIKE on titre/description. The schema has a
        // fulltext GIN index (to_tsvector('french', titre || ' ' || description)) we
        // could use for relevance/perf — TODO: switch to ts_query in a later iteration.
        let pattern = format!("%{}%", text.trim());
        // ILIKE (case-insensitive): "Villa" must match "villa". `.like()` is
        // case-sensitive in Postgres, which silently dropped legitimate matches.
        let text_cond = Condition::any()
            .add(Expr::col(listing::Column::Titre).ilike(pattern.clone()))
            .add(Expr::col(listing::Column::Description).ilike(pattern));
        select = select.filter(text_cond);
    }

    select.order_by_desc(listing::Column::DatePublication)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pagination_defaults_when_missing() {
        assert_eq!(normalize_pagination(None, None), (1, 20));
    }

    #[test]
    fn pagination_clamps_out_of_range() {
        assert_eq!(normalize_pagination(Some(0), Some(0)), (1, 1));
        assert_eq!(normalize_pagination(Some(5), Some(100)), (5, 50));
        assert_eq!(normalize_pagination(Some(3), Some(10)), (3, 10));
    }

    #[test]
    fn apply_filters_builds_for_empty_query() {
        // No DB hit — building a Select only constructs the query AST.
        let _ = apply_filters(&ListingSearchQuery::default());
    }

    #[test]
    fn apply_filters_builds_with_every_filter_set() {
        let q = ListingSearchQuery {
            q: Some("appartement".into()),
            type_operation: Some("LOCATION".into()),
            type_bien: Some("APPARTEMENT".into()),
            quartier: Some("KALOUM".into()),
            prix_min: Some(500_000),
            prix_max: Some(5_000_000),
            nombre_chambres: Some(2),
            page: Some(2),
            per_page: Some(10),
        };
        let _ = apply_filters(&q);
    }

    #[test]
    fn apply_filters_builds_with_multi_value_lists() {
        // Comma-separated type_bien/quartier must not fail (IN filter).
        let q = ListingSearchQuery {
            type_bien: Some("BUREAU,MAGASIN".into()),
            quartier: Some("KALOUM,DIXINN".into()),
            ..Default::default()
        };
        let _ = apply_filters(&q);
    }

    #[test]
    fn parse_enum_csv_parses_multi_and_ignores_invalid() {
        // Case-insensitive, trims, and drops unknown tokens (e.g. "MAGASIN" — the
        // enum uses COMMERCE — and empty segments).
        let v = parse_enum_csv::<TypeBien>("bureau, COMMERCE , MAGASIN,");
        assert_eq!(v, vec![TypeBien::Bureau, TypeBien::Commerce]);
        assert!(parse_enum_csv::<Quartier>("").is_empty());
        assert!(parse_enum_csv::<Quartier>("nope,zzz").is_empty());
    }

    #[test]
    fn type_bien_synonyms_map_to_db_variants() {
        assert_eq!(map_type_bien_token("Maison"), "VILLA");
        assert_eq!(map_type_bien_token(" magasin "), "COMMERCE");
        assert_eq!(map_type_bien_token("APPARTEMENT"), "APPARTEMENT");
        // End-to-end: MAISON,MAGASIN → [VILLA, COMMERCE].
        let mapped = "MAISON,MAGASIN".split(',').map(map_type_bien_token).collect::<Vec<_>>().join(",");
        assert_eq!(parse_enum_csv::<TypeBien>(&mapped), vec![TypeBien::Villa, TypeBien::Commerce]);
    }

    #[test]
    fn apply_filters_ignores_blank_query_text() {
        let q = ListingSearchQuery { q: Some("   ".into()), ..Default::default() };
        let _ = apply_filters(&q);
    }
}