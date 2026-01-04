'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Shield,
  Lightbulb,
  Camera,
  MapPin,
  FileText,
  Check,
  Sparkles,
  Eye,
  Clock,
  TrendingUp,
  Building2,
  DollarSign,
  Images,
  AlertCircle,
  Loader2
} from 'lucide-react';
import ListingFormStepper from '@/components/listings/ListingFormStepper';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslations } from '@/lib/i18n';

export default function PublierPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const { user, hasVerifiedPhone, resendOtp } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const t = useTranslations('publish');
  const tCommon = useTranslations('common');

  const STEPS = [
    { id: 1, title: t('steps.type'), icon: Home, description: t('steps.typeDesc') },
    { id: 2, title: t('steps.details'), icon: FileText, description: t('steps.detailsDesc') },
    { id: 3, title: t('steps.location'), icon: MapPin, description: t('steps.locationDesc') },
    { id: 4, title: t('steps.photos'), icon: Camera, description: t('steps.photosDesc') },
  ];

  const STATS = [
    { icon: Eye, value: '15K+', label: t('stats.monthlyViews') },
    { icon: Clock, value: '24h', label: t('stats.fastValidation') },
    { icon: TrendingUp, value: '85%', label: t('stats.contactRate') },
  ];

  // Check phone verification on page load
  useEffect(() => {
    if (user && !hasVerifiedPhone()) {
      setIsRedirecting(true);
      // Send OTP and redirect to verify page
      toast(
        t('verification.toastMessage'),
        {
          duration: 5000,
          icon: '📱',
        }
      );
      resendOtp(user.telephone).catch(() => {
        // Silent fail - user will be able to request resend on verify page
      });
      router.push(`/auth/verify-otp?telephone=${encodeURIComponent(user.telephone)}`);
    }
  }, [user, hasVerifiedPhone, resendOtp, router, t]);

  // Show loading while redirecting unverified users
  if (isRedirecting || (user && !hasVerifiedPhone())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            {t('verification.title')}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('verification.message')}
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('verification.redirecting')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-dark-bg dark:to-dark-card">
      {/* Hero Header with Glass Effect */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-orange-500 to-primary-600">
          <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 25, repeat: Infinity }}
            className="absolute -bottom-20 -left-20 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-20 md:pt-8 md:pb-28">
          {/* Top Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <Link
              href="/"
              className="group flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium text-white">{tCommon('back')}</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full text-xs font-medium text-white border border-emerald-400/30">
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
                {t('hero.freePublication')}
              </span>
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 border border-white/20"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-white/90">{t('hero.tagline')}</span>
            </motion.div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto"
          >
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="group bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
              >
                <stat.icon className="w-5 h-5 text-white/80 mx-auto mb-2 group-hover:text-white transition-colors" />
                <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-xs text-white/70">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Steps Indicator - Floating */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-4 md:p-6 border border-neutral-100 dark:border-dark-border"
        >
          {/* Steps Navigation */}
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep(step.id)}
                  className={`
                    relative flex flex-col items-center w-full py-2 transition-all
                    ${currentStep >= step.id
                      ? 'text-primary-600'
                      : 'text-neutral-400 dark:text-neutral-500'
                    }
                  `}
                >
                  {/* Step Circle */}
                  <div className={`
                    relative w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all
                    ${currentStep > step.id
                      ? 'bg-gradient-to-br from-primary-500 to-orange-500 text-white shadow-lg shadow-primary-500/30'
                      : currentStep === step.id
                        ? 'bg-gradient-to-br from-primary-500 to-orange-500 text-white shadow-lg shadow-primary-500/30 ring-4 ring-primary-100 dark:ring-primary-900/30'
                        : 'bg-neutral-100 dark:bg-dark-border text-neutral-400'
                    }
                  `}>
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}

                    {/* Active Pulse */}
                    {currentStep === step.id && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-2xl bg-primary-500/20"
                      />
                    )}
                  </div>

                  {/* Labels */}
                  <span className={`
                    text-sm font-semibold hidden md:block
                    ${currentStep >= step.id ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}
                  `}>
                    {step.title}
                  </span>
                  <span className={`
                    text-xs hidden md:block
                    ${currentStep >= step.id ? 'text-neutral-500' : 'text-neutral-400'}
                  `}>
                    {step.description}
                  </span>
                </motion.button>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-2 rounded-full bg-neutral-100 dark:bg-dark-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: currentStep > step.id ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-orange-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress Text */}
          <div className="flex items-center justify-between text-sm pt-4 border-t border-neutral-100 dark:border-dark-border">
            <span className="text-neutral-500">
              {t('progress.step')} <span className="font-bold text-primary-600">{currentStep}</span> {t('progress.of')} {STEPS.length}
            </span>
            <span className="text-neutral-500">
              <span className="font-bold text-primary-600">{Math.round((currentStep / STEPS.length) * 100)}%</span> {t('progress.completed')}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ListingFormStepper
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            totalSteps={STEPS.length}
          />
        </motion.div>

        {/* Tips Section - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-orange-50/50 dark:from-primary-500/5 dark:to-orange-500/5 rounded-3xl" />
          <div className="relative bg-white/60 dark:bg-dark-card/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-primary-100 dark:border-primary-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-orange-500 rounded-2xl shadow-lg shadow-primary-500/30">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {t('tips.title')}
                </h2>
                <p className="text-sm text-neutral-500">{t('tips.subtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: Camera,
                  color: 'from-purple-500 to-pink-500',
                  title: t('tips.photos.title'),
                  desc: t('tips.photos.desc')
                },
                {
                  icon: FileText,
                  color: 'from-blue-500 to-cyan-500',
                  title: t('tips.titleTip.title'),
                  desc: t('tips.titleTip.desc')
                },
                {
                  icon: MapPin,
                  color: 'from-emerald-500 to-teal-500',
                  title: t('tips.locationTip.title'),
                  desc: t('tips.locationTip.desc')
                },
                {
                  icon: DollarSign,
                  color: 'from-orange-500 to-amber-500',
                  title: t('tips.priceTip.title'),
                  desc: t('tips.priceTip.desc')
                }
              ].map((tip, index) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="group flex items-start gap-4 p-4 bg-white dark:bg-dark-card rounded-2xl border border-neutral-100 dark:border-dark-border hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-500/30 transition-all"
                >
                  <div className={`p-2.5 bg-gradient-to-br ${tip.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                    <tip.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white mb-1">
                      {tip.title}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {tip.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Support Contact - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-neutral-600 dark:text-neutral-400">
            {t('support.needHelp')}{' '}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold underline underline-offset-4 decoration-primary-200 hover:decoration-primary-400 transition-all"
            >
              {t('support.contactSupport')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Bottom Spacer for Mobile */}
      <div className="h-24 md:h-8" />
    </div>
  );
}
