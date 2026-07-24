//! Domain modules (replace app/Http/Controllers/Api/*).
//!
//! Each domain module exposes `routes(state) -> Router` and is mounted in
//! routes::router() incrementally per migration phase (strangler-fig):
//!
//!   Phase 1 (read-only):    listings   (ListingController — search/show)
//!   Phase 2:                visits, messaging (real-time WS via axum ws)
//!   Phase 3:                contracts (PDF, OTP signature, archiving, integrity)
//!   Phase 4 (critical):     payments (escrow, Orange/MTN MoMo, 2FA, commission)
//!   Phase 5:                admin, moderator, facebook, certifications, ratings, disputes
//!
//! A domain module contains:
//!   routes.rs        — handlers (axum) replacing the Controller methods
//!   service.rs       — business logic (replaces app/Services/* calls)
//!   dto.rs           — request/response shapes (replaces FormRequests + API Resources)
//!   policy.rs        — authorization (replaces app/Policies/*)
//!
//! Controllers mapped (from the Laravel audit):
//!   ListingController 1011 l.  -> domain::listings
//!   ContractController 1776 l. -> domain::contracts (split into sub-modules by concern)
//!   AuthController 1107 l.     -> auth + domain::auth
//!   AdminController 1228 l.   -> domain::admin
//!   VisitController 865 l.     -> domain::visits
//!   PaymentController 771 l.  -> domain::payments
//!   ModeratorController 762 l. -> domain::moderator
//!   EvolutionWebhookController 691 l. -> domain::webhooks::evolution
//!   MessagingController 628 l. -> domain::messaging
//!   FacebookController 577 l.  -> domain::facebook

pub mod listings;   // Phase 1 (read-only: search + public detail)
pub mod auth;        // T078-T083 (register / login / 2FA TOTP)
pub mod webhooks;    // W3 (evolution WhatsApp; orange/mtn payments later)
pub mod certifications; // Phase 5 (FR-054: upload + admin verify)
pub mod visits;      // US10 (schedule/manage property visits)
pub mod favorites;   // saved listings (favourites)
pub mod ratings;     // US7 (reviews + average rating)
pub mod admin;       // Phase 5 (dashboard + listing/user moderation)
// pub mod messaging;  // Phase 2
// pub mod contracts;  // Phase 3
// pub mod payments;   // Phase 4 (critical — last)
// pub mod admin;      // Phase 5
// pub mod moderator;  // Phase 5
// pub mod facebook;   // Phase 5