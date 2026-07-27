'use client';

import { Home, Shield, Lock, MessageCircle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

/**
 * Left brand panel shared by all full-bleed auth screens (login / register /
 * OTP). Matches the design mockup: 3-tone terracotta gradient + radial
 * highlights, logo, headline, 3 trust items, testimonial anchored at the bottom.
 * Hidden below lg (the form panel takes the full width on mobile).
 */
export default function AuthBrandPanel() {
  const { t } = useTranslations();

  const trust = [
    { Icon: Shield, title: t('home.trust.verifiedTitle'), desc: t('home.trust.verifiedDesc') },
    { Icon: Lock, title: t('home.trust.depositTitle'), desc: t('home.trust.depositDesc') },
    { Icon: MessageCircle, title: t('home.trust.whatsappTitle'), desc: t('home.trust.whatsappDesc') },
  ];

  return (
    <div
      className="hidden lg:flex lg:w-[52%] relative overflow-hidden text-white flex-col justify-between p-10 xl:p-14"
      style={{ background: 'linear-gradient(155deg, #c0421c, #DB5327 55%, #e8703a)' }}
    >
      {/* soft radial highlights */}
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            'radial-gradient(50% 55% at 85% 10%, rgba(255,255,255,.22), transparent 60%), radial-gradient(45% 50% at 5% 95%, rgba(0,0,0,.18), transparent 60%)',
        }}
      />

      {/* top: logo + wordmark */}
      <div className="relative flex items-center gap-2.5 font-bold text-lg tracking-tight">
        <span className="w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur-sm grid place-items-center">
          <Home className="w-5 h-5" />
        </span>
        ImmoGuinée
      </div>

      {/* middle: headline + trust list */}
      <div className="relative">
        <h2 className="text-3xl xl:text-[2.5rem] font-bold leading-[1.12] max-w-[15ch]">
          {t('auth.brand.headline')}
        </h2>
        <p className="mt-4 text-white/90 text-base max-w-[42ch]">{t('auth.brand.subtitle')}</p>
        <div className="mt-8 space-y-4 max-w-md">
          {trust.map(({ Icon, title, desc }, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              <div className="shrink-0 w-[30px] h-[30px] rounded-[9px] bg-white/[.18] grid place-items-center">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-[.98rem] leading-tight">{title}</div>
                <div className="text-[.86rem] text-white/80 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom: testimonial */}
      <div className="relative flex items-center gap-3.5 bg-white/[.12] backdrop-blur-sm rounded-[13px] p-4">
        <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-white/90 text-primary-700 grid place-items-center font-bold">
          MC
        </div>
        <div>
          <div className="text-[.86rem]">« {t('auth.brand.testimonialQuote')} »</div>
          <div className="text-[.78rem] text-white/80 mt-0.5">{t('auth.brand.testimonialAuthor')}</div>
        </div>
      </div>
    </div>
  );
}
