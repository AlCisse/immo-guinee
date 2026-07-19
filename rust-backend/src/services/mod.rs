//! Services layer (replaces app/Services/* — 27 services).
//!
//! Each service is a struct holding shared deps (DbPool, Redis, VaultClient, ...)
//! injected via constructor and stored in AppState. This replaces Laravel's
//! container resolution + facades with explicit, testable dependencies.
//!
//! Mapping (from the Laravel audit — 27 services):
//!   ContractService           -> services::contract::ContractService
//!   EscrowService             -> services::payment::EscrowService
//!   SignatureService           -> services::contract::SignatureService
//!   EncryptionService          -> REMOVED — replaced by Vault Transit (vaultrs)
//!                                  (transit/encrypt/:key + transit/decrypt/:key,
//!                                   key never leaves Vault — fixes the APP_KEY fallback bug)
//!   IntegrityService           -> services::contract::IntegrityService
//!   ImageWatermarkService      -> services::media::WatermarkService (image + imageproc)
//!   StorageService             -> services::storage::S3Service (aws-sdk-s3)
//!   MtnMomoService             -> services::payment::MtnMomoService (reqwest)
//!   OrangeMoneyService         -> services::payment::OrangeMoneyService (reqwest)
//!   OtpService                 -> services::otp::OtpService (Redis TTL + Twilio)
//!   SmsService                  -> services::sms::TwilioSmsService (reqwest)
//!   WhatsAppService            -> services::messaging::EvolutionService (reqwest)
//!   FacebookOAuthService        -> services::facebook::FacebookOAuthService
//!   FacebookPagePublisher       -> services::facebook::PagePublisher
//!   ContentModerationService    -> services::moderation::ContentModerationService
//!   FraudDetectionService       -> services::fraud::FraudDetectionService
//!   ExpoPushService             -> services::push::ExpoPushService (reqwest)
//!   CommissionCalculatorService-> services::payment::CommissionService
//!   InsuranceCertificateService -> services::contract::InsuranceService
//!   QuittanceService            -> services::payment::QuittanceService (PDF)
//!   RateLimitService            -> middleware::rate_limit (tower-governor)
//!   CacheService               -> services::cache::CacheService (redis)
//!   CertificationService        -> services::certification::CertificationService
//!   MessageNotificationService  -> notifications::MessageNotifier
//!   RoleRedirectService         -> services::auth::RoleRedirect
//!   TimezoneService             -> services::util::Timezone
//!   FacebookPostManager          -> services::facebook::PostManager
//!
//! Secrets for all external integrations come from Vault (contracts/secrets.md).

// pub mod contract;
// pub mod payment;
// pub mod media;
pub mod storage;
pub mod listing_photo;
pub mod notify;
pub mod otp;
pub mod whatsapp;
// pub mod sms;
// pub mod messaging;
// pub mod facebook;
// pub mod moderation;
// pub mod fraud;
// pub mod push;
// pub mod cache;
// pub mod certification;