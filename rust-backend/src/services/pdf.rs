//! PDF rendering via the Typst engine (pure Rust, no headless browser).
//!
//! Callers build a complete Typst source string (data baked in) and get PDF bytes
//! back — used by the contracts domain to produce law-2016/037 lease documents.
//! Fonts are loaded once from the runtime image (`fonts-dejavu-core`, installed in
//! the Dockerfile); a document with no available font fails to compile.

use std::sync::OnceLock;

use typst_as_lib::TypstEngine;
use typst_layout::PagedDocument;

use crate::error::{AppError, AppResult};

/// DejaVu covers Latin + French accents; regular + bold are enough for a contract.
const FONT_PATHS: [&str; 2] = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

static FONTS: OnceLock<Vec<Vec<u8>>> = OnceLock::new();

fn fonts() -> &'static Vec<Vec<u8>> {
    FONTS.get_or_init(|| FONT_PATHS.iter().filter_map(|p| std::fs::read(p).ok()).collect())
}

/// Compile a self-contained Typst `source` to PDF bytes.
pub fn render(source: String) -> AppResult<Vec<u8>> {
    let font_bytes = fonts();
    if font_bytes.is_empty() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "aucune police disponible pour Typst (fonts-dejavu-core manquant)"
        )));
    }

    let engine = TypstEngine::builder()
        .main_file(source)
        .fonts(font_bytes.iter().map(|f| f.as_slice()))
        .build();

    let doc: PagedDocument = engine
        .compile()
        .output
        .map_err(|e| AppError::Internal(anyhow::anyhow!("compilation Typst: {e:?}")))?;

    typst_pdf::pdf(&doc, &typst_pdf::PdfOptions::default())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("génération PDF Typst: {e:?}")))
}

/// Escape a string for safe inclusion inside a Typst double-quoted string literal.
pub fn escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}
