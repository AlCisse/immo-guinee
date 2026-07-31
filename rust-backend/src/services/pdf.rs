//! PDF rendering via the Typst engine (pure Rust, no headless browser).
//!
//! Callers build a complete Typst source string (data baked in) and get PDF bytes
//! back — used by the contracts domain to produce law-2016/037 lease documents.
//! Fonts are loaded once from the runtime image. The loader tries, in order, the
//! `IMMOG_FONT_PATHS` env override (colon-separated), the Linux DejaVu paths
//! (`fonts-dejavu-core` in the prod Dockerfile), and the macOS system Arial paths
//! (so the flow also works on a dev/test host). Typst falls back to whatever font
//! is available when the source names "DejaVu Sans" and only Arial is present.

use std::sync::OnceLock;

use typst_as_lib::TypstEngine;
use typst_layout::PagedDocument;

use crate::error::{AppError, AppResult};

/// Default font search paths: Linux DejaVu (prod) then macOS Arial (dev/test).
const DEFAULT_FONT_PATHS: [&str; 4] = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
];

static FONTS: OnceLock<Vec<Vec<u8>>> = OnceLock::new();

/// The font files to feed Typst. `IMMOG_FONT_PATHS` (colon-separated) overrides the
/// defaults; otherwise every existing default path is loaded.
fn font_paths() -> Vec<String> {
    if let Ok(env) = std::env::var("IMMOG_FONT_PATHS") {
        return env.split(':').filter(|p| !p.is_empty()).map(str::to_owned).collect();
    }
    DEFAULT_FONT_PATHS.iter().map(|s| s.to_string()).collect()
}

fn fonts() -> &'static Vec<Vec<u8>> {
    FONTS.get_or_init(|| font_paths().iter().filter_map(|p| std::fs::read(p).ok()).collect())
}

/// Compile a self-contained Typst `source` to PDF bytes.
pub fn render(source: String) -> AppResult<Vec<u8>> {
    let font_bytes = fonts();
    if font_bytes.is_empty() {
        return Err(AppError::Internal(anyhow::anyhow!(
            "aucune police disponible pour Typst (IMMOG_FONT_PATHS, fonts-dejavu-core ou Arial système manquants)"
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

#[cfg(test)]
mod tests {
    use super::*;

    /// The render must succeed on the dev host (macOS Arial fallback) as well as in
    /// the prod image (Linux DejaVu) — guards the font-loading path the contract
    /// create flow depends on.
    #[test]
    fn render_returns_pdf_bytes_with_available_fonts() {
        let src = "#set page(paper: \"a4\")\n#set text(lang: \"fr\")\nBonjour ImmoGuinée — éàç.";
        match render(src.into()) {
            Ok(bytes) => assert!(bytes.starts_with(b"%PDF"), "output must be a PDF"),
            Err(e) => {
                // If no font is available at all (bare CI runner), skip rather than fail:
                // the contract flow needs fonts, but this unit test cannot require them.
                let msg = e.to_string();
                assert!(msg.contains("aucune police"), "unexpected render error: {msg}");
                eprintln!("skipped: no font available on this host");
            }
        }
    }

    /// The contract sources name "DejaVu Sans" explicitly. With a fallback list the
    /// render must still succeed when only Arial is available (dev/test host) — this
    /// is the shape the contract/quittance templates must use.
    #[test]
    fn render_with_font_fallback_list_succeeds() {
        let src = "#set page(paper: \"a4\")\n#set text(font: (\"DejaVu Sans\", \"Arial\"), lang: \"fr\")\nBail — éàç.";
        match render(src.into()) {
            Ok(bytes) => assert!(bytes.starts_with(b"%PDF"), "fallback list must render a PDF"),
            Err(e) => panic!("font fallback list render failed: {e}"),
        }
    }

    /// The contract template also sets `size` and `lang` alongside the font fallback
    /// list — reproduce the exact `#set text` line so a Typst syntax regression in the
    /// combined form is caught here (cheap) instead of in the e2e suite.
    #[test]
    fn render_contract_text_set_line_with_size_succeeds() {
        let src = "#set page(paper: \"a4\", margin: 2.2cm)\n#set text(font: (\"DejaVu Sans\", \"Arial\"), size: 10pt, lang: \"fr\")\nBail — éàç.";
        match render(src.into()) {
            Ok(bytes) => assert!(bytes.starts_with(b"%PDF"), "combined set text must render"),
            Err(e) => panic!("combined set text render failed: {e}"),
        }
    }
}
