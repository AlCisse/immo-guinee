//! Typst source builder for a residential lease (US2, Loi 2016/037).
//!
//! Values are injected as escaped Typst string `let` bindings and rendered via
//! `#binding`, so a string is emitted verbatim (no markup interpretation) — the
//! contents cannot break the layout or inject Typst code.

use crate::services::pdf::escape;

/// Everything the lease template needs, already stringified/formatted.
pub struct ContractContext {
    pub reference: String,
    pub titre: String,
    pub date_generation: String,
    pub proprietaire_nom: String,
    pub proprietaire_tel: String,
    pub locataire_nom: String,
    pub locataire_tel: String,
    pub bien_designation: String,
    pub bien_adresse: String,
    pub loyer: String,
    pub caution: String,
    pub date_debut: String,
    pub duree: String,
    pub clauses: Vec<String>,
    /// Signature status line per party (e.g. "Signé électroniquement le …" or
    /// "Signature électronique — en attente").
    pub proprietaire_signature: String,
    pub locataire_signature: String,
}

/// Format an amount in GNF with thin-space grouping, e.g. `2 500 000 GNF`.
pub fn fmt_gnf(v: i64) -> String {
    let s = v.abs().to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push(' ');
        }
        out.push(c);
    }
    let grouped: String = out.chars().rev().collect();
    format!("{}{} GNF", if v < 0 { "-" } else { "" }, grouped)
}

/// Build the complete Typst source for the residential lease.
pub fn build_source(ctx: &ContractContext) -> String {
    // Dynamic values as escaped string bindings.
    let mut src = String::new();
    src.push_str(&format!("#let c_ref = \"{}\"\n", escape(&ctx.reference)));
    src.push_str(&format!("#let c_titre = \"{}\"\n", escape(&ctx.titre)));
    src.push_str(&format!("#let c_date = \"{}\"\n", escape(&ctx.date_generation)));
    src.push_str(&format!("#let p_nom = \"{}\"\n", escape(&ctx.proprietaire_nom)));
    src.push_str(&format!("#let p_tel = \"{}\"\n", escape(&ctx.proprietaire_tel)));
    src.push_str(&format!("#let l_nom = \"{}\"\n", escape(&ctx.locataire_nom)));
    src.push_str(&format!("#let l_tel = \"{}\"\n", escape(&ctx.locataire_tel)));
    src.push_str(&format!("#let b_des = \"{}\"\n", escape(&ctx.bien_designation)));
    src.push_str(&format!("#let b_adr = \"{}\"\n", escape(&ctx.bien_adresse)));
    src.push_str(&format!("#let m_loyer = \"{}\"\n", escape(&ctx.loyer)));
    src.push_str(&format!("#let m_caution = \"{}\"\n", escape(&ctx.caution)));
    src.push_str(&format!("#let d_debut = \"{}\"\n", escape(&ctx.date_debut)));
    src.push_str(&format!("#let d_duree = \"{}\"\n", escape(&ctx.duree)));
    src.push_str(&format!("#let p_sig = \"{}\"\n", escape(&ctx.proprietaire_signature)));
    src.push_str(&format!("#let l_sig = \"{}\"\n", escape(&ctx.locataire_signature)));

    let clauses = ctx
        .clauses
        .iter()
        .map(|c| format!("\"{}\"", escape(c)))
        .collect::<Vec<_>>()
        .join(", ");
    // Empty clauses must emit `()` — `(,)` is an "unexpected comma" Typst error.
    let clauses_array = if ctx.clauses.is_empty() {
        "()".to_string()
    } else {
        format!("({},)", clauses)
    };
    src.push_str(&format!("#let clauses = {}\n", clauses_array));

    // Static document body (French; references the bindings above).
    src.push_str(TEMPLATE_BODY);
    src
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::pdf;

    fn ctx(clauses: Vec<&str>) -> ContractContext {
        ContractContext {
            reference: "CTR-TEST".into(),
            titre: "CONTRAT DE LOCATION RÉSIDENTIEL".into(),
            date_generation: "01/01/2025".into(),
            proprietaire_nom: "Awa Diallo".into(),
            proprietaire_tel: "+224622000000".into(),
            locataire_nom: "Moussa Camara".into(),
            locataire_tel: "+224622000001".into(),
            bien_designation: "Appartement test".into(),
            bien_adresse: "Kaloum".into(),
            loyer: fmt_gnf(100_000),
            caution: fmt_gnf(0),
            date_debut: "2025-01-01".into(),
            duree: "12 mois".into(),
            clauses: clauses.into_iter().map(String::from).collect(),
            proprietaire_signature: "Signé électroniquement le 01/01/2025".into(),
            locataire_signature: "Signature électronique — en attente".into(),
        }
    }

    /// Regression: an empty `clauses` list used to emit `#let clauses = (,)` which
    /// Typst rejects as "unexpected comma". Both the empty and non-empty cases must
    /// compile to a PDF.
    #[test]
    fn build_source_renders_with_and_without_clauses() {
        for c in [ctx(vec![]), ctx(vec!["Animaux interdits", "Pas de sous-location"])] {
            let src = build_source(&c);
            match pdf::render(src) {
                Ok(bytes) => assert!(bytes.starts_with(b"%PDF"), "expected a PDF"),
                Err(e) => panic!("lease render failed: {e}"),
            }
        }
    }
}

const TEMPLATE_BODY: &str = r##"
#set page(paper: "a4", margin: 2.2cm, numbering: "1/1")
#set text(font: ("DejaVu Sans", "Arial"), size: 10pt, lang: "fr")
#set par(justify: true, leading: 0.65em)

#align(center)[
  #text(size: 15pt, weight: "bold")[#c_titre]
  #linebreak()
  #text(size: 9pt, fill: rgb("#555"))[Conforme à la Loi L/2016/037/AN — République de Guinée]
  #linebreak()
  #text(size: 8pt, fill: rgb("#555"))[Référence : #c_ref — Généré le #c_date]
]

#v(0.6em)
#line(length: 100%, stroke: 0.5pt + rgb("#ccc"))
#v(0.4em)

#text(weight: "bold")[ENTRE LES SOUSSIGNÉS]

#v(0.3em)
*Le Bailleur :* #p_nom, téléphone #p_tel, ci-après dénommé « le Bailleur ».

#v(0.2em)
*Le Preneur :* #l_nom, téléphone #l_tel, ci-après dénommé « le Preneur ».

#v(0.5em)
Il a été convenu et arrêté ce qui suit :

== Article 1 — Objet et désignation du bien
Le Bailleur donne à bail au Preneur le bien immobilier suivant : #b_des, sis à #b_adr. Le Preneur déclare bien connaître les lieux pour les avoir visités.

== Article 2 — Destination
Les locaux sont loués à usage exclusif d'habitation. Toute autre affectation est interdite sans l'accord écrit du Bailleur.

== Article 3 — Durée
Le présent bail est consenti pour une durée de #d_duree, prenant effet le #d_debut.

== Article 4 — Loyer
Le loyer mensuel est fixé à #m_loyer, payable d'avance au plus tard le 5 de chaque mois. Le loyer est révisable dans les conditions prévues par la loi.

== Article 5 — Dépôt de garantie (caution)
Le Preneur verse au Bailleur un dépôt de garantie de #m_caution, restitué en fin de bail déduction faite des sommes éventuellement dues, dans les conditions de la Loi L/2016/037/AN.

== Article 6 — Charges (EDG / SEG)
Les consommations d'électricité (EDG) et d'eau (SEG) sont à la charge du Preneur, qui s'engage à maintenir les abonnements à jour pendant toute la durée du bail.

== Article 7 — Sécurité et entretien
Le Preneur maintient les lieux en bon état, use paisiblement des locaux et prend toute mesure de sécurité utile. Les réparations locatives sont à sa charge ; les grosses réparations restent à la charge du Bailleur.

#if clauses.len() > 0 [
  == Article 8 — Clauses particulières
  #for cl in clauses [
    - #cl
  ]
]

#v(1.2em)
#text(weight: "bold")[SIGNATURES]

#v(0.3em)
#grid(
  columns: (1fr, 1fr),
  gutter: 1.5em,
  [
    *Le Bailleur*#linebreak()
    #p_nom#linebreak()
    #v(2.2em)
    #line(length: 70%, stroke: 0.5pt)
    #text(size: 8pt, fill: rgb("#777"))[#p_sig]
  ],
  [
    *Le Preneur*#linebreak()
    #l_nom#linebreak()
    #v(2.2em)
    #line(length: 70%, stroke: 0.5pt)
    #text(size: 8pt, fill: rgb("#777"))[#l_sig]
  ],
)

#v(1em)
#align(center)[#text(size: 7.5pt, fill: rgb("#999"))[Document généré par ImmoGuinée — signatures électroniques via OTP, archivage sécurisé 10 ans.]]
"##;
