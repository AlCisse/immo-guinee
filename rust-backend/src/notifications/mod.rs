//! Notifications (replace app/Notifications/* — 19 notifications, multi-channel).
//!
//! No direct Rust equivalent to Laravel's Notification facade; we build a small
//! dispatcher: a `Notifiable` target + channels { Sms, WhatsApp, Push, Email }.
//! Each channel is a provider impl over reqwest/lettre. Notifications that must
//! be queued are enqueued via apalis (jobs::SendMultiChannel).
//!
//! Channel -> provider mapping:
//!   SMS        -> sms::TwilioSmsService   (reqwest, secret from Vault secret/immoguinee/twilio)
//!   WhatsApp   -> messaging::EvolutionService  (reqwest, secret from Vault secret/immoguinee/evolution)
//!   Push       -> push::ExpoPushService   (reqwest)
//!   Email      -> lettre::SmtpTransport   (secret from Vault secret/immoguinee/mail)
//!
//! Notification examples (from the Laravel audit — 19):
//!   OtpNotification, PaymentNotification, BadgeUpgradeNotification,
//!   DisputePartiesNotification, RentReminderNotification, etc.

use async_trait::async_trait;

use crate::error::AppResult;

/// A destination addressable on one or more channels.
pub trait Notifiable: Send + Sync {
    fn phone(&self) -> Option<&str>;
    fn email(&self) -> Option<&str>;
    fn push_token(&self) -> Option<&str>;
    fn preferred_channels(&self) -> &[Channel];
}

#[derive(Debug, Clone, Copy)]
pub enum Channel {
    Sms,
    WhatsApp,
    Push,
    Email,
}

#[async_trait]
pub trait ChannelSender: Send + Sync {
    async fn send(&self, to: &dyn Notifiable, payload: &NotificationPayload) -> AppResult<()>;
}

/// Rendered message ready to dispatch across channels.
pub struct NotificationPayload {
    pub title: Option<String>,
    pub body: String,
    pub data: serde_json::Value,
}

// pub mod sms;
// pub mod whatsapp;
// pub mod push;
// pub mod email;
// pub mod dispatcher;