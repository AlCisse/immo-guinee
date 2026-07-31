//! Listing photo optimization (FR-010): decode an uploaded image and produce
//! three WebP renditions (thumbnail / medium / large), each resized to fit its
//! target box while preserving aspect ratio.
//!
//! WebP here is lossless (pure-Rust `image`). If output size matters we can add
//! the `webp` (libwebp) crate for lossy q85 encoding.

use std::io::Cursor;

use image::{ImageFormat, ImageReader, imageops::FilterType};

use crate::error::{AppError, AppResult};

/// (label, max width, max height) — the image is scaled to fit inside the box.
const SIZES: [(&str, u32, u32); 3] = [
    ("thumbnail", 200, 150),
    ("medium", 800, 600),
    ("large", 1920, 1440),
];

/// A single optimized rendition.
pub struct Rendition {
    pub label: &'static str,
    pub width: u32,
    pub height: u32,
    pub webp: Vec<u8>,
}

/// Decode `input` (any supported format) and return the three WebP renditions.
/// A non-image / unsupported input yields a `422 Validation` error.
pub fn optimize(input: &[u8]) -> AppResult<Vec<Rendition>> {
    let img = ImageReader::new(Cursor::new(input))
        .with_guessed_format()
        .map_err(|e| AppError::Validation(format!("image illisible: {e}")))?
        .decode()
        .map_err(|e| AppError::Validation(format!("format d'image non supporté: {e}")))?;

    let mut out = Vec::with_capacity(SIZES.len());
    for (label, w, h) in SIZES {
        // `resize` fits within (w, h) and preserves aspect ratio.
        let resized = img.resize(w, h, FilterType::Lanczos3);
        let mut buf = Cursor::new(Vec::new());
        resized
            .write_to(&mut buf, ImageFormat::WebP)
            .map_err(|e| AppError::Internal(anyhow::anyhow!("encodage WebP: {e}")))?;
        out.push(Rendition {
            label,
            width: resized.width(),
            height: resized.height(),
            webp: buf.into_inner(),
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{DynamicImage, RgbImage};

    fn sample_png(w: u32, h: u32) -> Vec<u8> {
        let img = DynamicImage::ImageRgb8(RgbImage::new(w, h));
        let mut buf = Cursor::new(Vec::new());
        img.write_to(&mut buf, ImageFormat::Png).unwrap();
        buf.into_inner()
    }

    #[test]
    fn produces_three_webp_renditions_within_bounds() {
        let out = optimize(&sample_png(3000, 2000)).unwrap();
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].label, "thumbnail");
        assert!(out[0].width <= 200 && out[0].height <= 150);
        assert!(out[2].width <= 1920 && out[2].height <= 1440);
        for r in &out {
            assert!(!r.webp.is_empty());
        }
    }

    #[test]
    fn rejects_non_image_input() {
        assert!(optimize(b"definitely not an image").is_err());
    }
}
