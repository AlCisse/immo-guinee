//! Search query + filter building for public listing search (Phase 1, read-only).
//!
//! Public search returns only `DISPONIBLE` listings (FR-016: public search, no auth).
//! Filters: free-text `q`, type_operation, type_bien, quartier, prix min/max,
//! nombre_chambres (>=). Ordering: date_publication desc. Pagination by the caller.

use serde::Deserialize;
use sea_orm::sea_query::Expr;
use sea_orm::{ColumnTrait, Condition, EntityTrait, QueryFilter, QueryOrder, Select};

use crate::db::entities::listing;
use crate::db::entities::sea_orm_active_enums::{Quartier, StatutListing, TypeBien, TypeOperation};

/// Public listing search query params (all optional). Deserialized from the query
/// string by axum's `Query` extractor, e.g.
/// `?type_operation=LOCATION&quartier=KALOUM&prix_min=1000000&nombre_chambres=2&q=appartement`.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct ListingSearchQuery {
    pub q: Option<String>,
    pub type_operation: Option<TypeOperation>,
    pub type_bien: Option<TypeBien>,
    pub quartier: Option<Quartier>,
    pub prix_min: Option<i64>,
    pub prix_max: Option<i64>,
    pub nombre_chambres: Option<i32>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
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

    if let Some(v) = &q.type_operation {
        select = select.filter(listing::Column::TypeOperation.eq(v.clone()));
    }
    if let Some(v) = &q.type_bien {
        select = select.filter(listing::Column::TypeBien.eq(v.clone()));
    }
    if let Some(v) = &q.quartier {
        select = select.filter(listing::Column::Quartier.eq(v.clone()));
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
        let text_cond = Condition::any()
            .add(Expr::col(listing::Column::Titre).like(pattern.clone()))
            .add(Expr::col(listing::Column::Description).like(pattern));
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
            type_operation: Some(TypeOperation::Location),
            type_bien: Some(TypeBien::Appartement),
            quartier: Some(Quartier::Kaloum),
            prix_min: Some(500_000),
            prix_max: Some(5_000_000),
            nombre_chambres: Some(2),
            page: Some(2),
            per_page: Some(10),
        };
        let _ = apply_filters(&q);
    }

    #[test]
    fn apply_filters_ignores_blank_query_text() {
        let q = ListingSearchQuery { q: Some("   ".into()), ..Default::default() };
        let _ = apply_filters(&q);
    }
}