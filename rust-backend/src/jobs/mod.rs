//! Background jobs (replace app/Jobs/* — 13 jobs + Laravel Queue Redis driver + Horizon).
//!
//! Runtime: `apalis` with a Redis storage backend (same Redis instance as Laravel
//! Queue during cohabitation). The scheduler (`tokio-cron-scheduler`) replaces
//! `routes/console.php` / Laravel scheduler.
//!
//! Job mapping (from the Laravel audit — 13 jobs):
//!   GenerateContractPdfJob        -> jobs::contract::GenerateContractPdf
//!   ProcessEscrowTimeoutJob        -> jobs::payment::EscrowTimeout
//!   PublishListingToFacebook        -> jobs::facebook::PublishListing
//!   SendMultiChannelNotificationJob-> notifications::SendMultiChannel (apalis)
//!   ProcessContentModerationJob    -> jobs::moderation::ProcessModeration
//!   OptimizeListingPhotosJob        -> jobs::media::OptimizePhotos
//!   LockSignedContractJob          -> jobs::contract::LockSignedContract
//!   UpdateBadgeCertificationJob     -> jobs::certification::UpdateBadge
//!   ... (see specs/001-immog-platform/tasks.md T313-T322)
//!
//! Scheduled commands (replaces app/Console/Commands/* — 29 commands + routes/console.php):
//!   SendRentRemindersCommand        -> scheduler (cron)
//!   BackupDatabaseCommand            -> scheduler (daily 2h GMT, FR-090)
//!   Integrity audit                  -> scheduler
//!   Vault snapshot                   -> scheduler (FR-038/FR-090)

// pub mod contract;
// pub mod payment;
// pub mod facebook;
// pub mod moderation;
// pub mod media;
// pub mod certification;