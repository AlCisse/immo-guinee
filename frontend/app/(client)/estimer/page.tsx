'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CONAKRY_COMMUNES, CONAKRY_QUARTIERS, PROPERTY_TYPES } from '@/lib/data/communes';
import { useTranslations } from '@/lib/i18n';

interface EstimationResult {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  pricePerM2: number;
}

export default function EstimerPage() {
  const { t } = useTranslations('estimate');

  const [formData, setFormData] = useState({
    typeBien: '',
    operationType: 'LOCATION',
    commune: '',
    quartier: '',
    superficie: '',
    nombreChambres: '',
    meuble: false,
  });
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const quartiersForCommune = CONAKRY_QUARTIERS.filter(
    (q) => q.commune === formData.commune
  );

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Prix de référence par commune et type (GNF par m²/mois pour location)
  const getPriceReference = () => {
    const basePrices: Record<string, Record<string, number>> = {
      Kaloum: {
        STUDIO: 50000,
        APPARTEMENT: 45000,
        MAISON: 40000,
        VILLA: 55000,
        BUREAU: 60000,
      },
      Dixinn: {
        STUDIO: 45000,
        APPARTEMENT: 40000,
        MAISON: 35000,
        VILLA: 50000,
        BUREAU: 55000,
      },
      Ratoma: {
        STUDIO: 40000,
        APPARTEMENT: 35000,
        MAISON: 30000,
        VILLA: 45000,
        BUREAU: 50000,
      },
      Matam: {
        STUDIO: 35000,
        APPARTEMENT: 30000,
        MAISON: 25000,
        VILLA: 40000,
        BUREAU: 45000,
      },
      Matoto: {
        STUDIO: 30000,
        APPARTEMENT: 25000,
        MAISON: 20000,
        VILLA: 35000,
        BUREAU: 40000,
      },
    };

    const commune = formData.commune || 'Ratoma';
    const type = formData.typeBien || 'APPARTEMENT';
    return basePrices[commune]?.[type] || 35000;
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);

    // Simulate calculation delay
    setTimeout(() => {
      const basePrice = getPriceReference();
      const superficie = parseFloat(formData.superficie) || 50;
      const chambres = parseInt(formData.nombreChambres) || 2;

      // Ajustements
      let multiplier = 1;

      // Ajustement pour le nombre de chambres
      if (chambres >= 3) multiplier += 0.1;
      if (chambres >= 4) multiplier += 0.15;

      // Ajustement pour meublé
      if (formData.meuble) multiplier += 0.25;

      // Prix de base
      const avgPricePerM2 = basePrice * multiplier;
      const avgPrice = avgPricePerM2 * superficie;

      // Fourchette de prix (±15%)
      const minPrice = avgPrice * 0.85;
      const maxPrice = avgPrice * 1.15;

      // Pour la vente, multiplier par ~120 (10 ans de loyer)
      const venteFactor = formData.operationType === 'VENTE' ? 120 : 1;

      setResult({
        minPrice: Math.round(minPrice * venteFactor / 10000) * 10000,
        maxPrice: Math.round(maxPrice * venteFactor / 10000) * 10000,
        avgPrice: Math.round(avgPrice * venteFactor / 10000) * 10000,
        pricePerM2: Math.round(avgPricePerM2 * venteFactor),
      });
      setIsCalculating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-green-100">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleCalculate} className="space-y-6">
              {/* Type d'opération */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-3">
                  {t('operationType')}
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, operationType: 'LOCATION' })}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      formData.operationType === 'LOCATION'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-dark-border'
                    }`}
                  >
                    {t('rental')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, operationType: 'VENTE' })}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                      formData.operationType === 'VENTE'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-dark-border'
                    }`}
                  >
                    {t('sale')}
                  </button>
                </div>
              </div>

              {/* Type de bien */}
              <div>
                <label htmlFor="typeBien" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  {t('propertyType')} *
                </label>
                <select
                  id="typeBien"
                  value={formData.typeBien}
                  onChange={(e) => setFormData({ ...formData, typeBien: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                  required
                >
                  <option value="">{t('selectType')}</option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commune et Quartier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="commune" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    {t('commune')} *
                  </label>
                  <select
                    id="commune"
                    value={formData.commune}
                    onChange={(e) =>
                      setFormData({ ...formData, commune: e.target.value, quartier: '' })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">{t('selectCommune')}</option>
                    {CONAKRY_COMMUNES.map((commune) => (
                      <option key={commune} value={commune}>
                        {commune}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="quartier" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    {t('quartier')}
                  </label>
                  <select
                    id="quartier"
                    value={formData.quartier}
                    onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-white disabled:opacity-50"
                    disabled={!formData.commune}
                  >
                    <option value="">{t('selectQuartier')}</option>
                    {quartiersForCommune.map((q) => (
                      <option key={q.name} value={q.name}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Superficie et Chambres */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="superficie" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    {t('area')} *
                  </label>
                  <input
                    type="number"
                    id="superficie"
                    value={formData.superficie}
                    onChange={(e) => setFormData({ ...formData, superficie: e.target.value })}
                    placeholder={t('areaPlaceholder')}
                    min="10"
                    max="10000"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="nombreChambres" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    {t('bedrooms')}
                  </label>
                  <select
                    id="nombreChambres"
                    value={formData.nombreChambres}
                    onChange={(e) => setFormData({ ...formData, nombreChambres: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                  >
                    <option value="">{t('selectBedrooms')}</option>
                    <option value="1">1 {t('bedroom')}</option>
                    <option value="2">2 {t('bedroomsPlural')}</option>
                    <option value="3">3 {t('bedroomsPlural')}</option>
                    <option value="4">4 {t('bedroomsPlural')}</option>
                    <option value="5">{t('bedroomsMore')}</option>
                  </select>
                </div>
              </div>

              {/* Meublé */}
              {formData.operationType === 'LOCATION' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="meuble"
                    checked={formData.meuble}
                    onChange={(e) => setFormData({ ...formData, meuble: e.target.checked })}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="meuble" className="ml-3 text-sm text-gray-700 dark:text-neutral-300">
                    {t('furnished')}
                  </label>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isCalculating}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t('calculating')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    {t('estimateButton')}
                  </>
                )}
              </button>
            </form>

            {/* Results */}
            {result && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('resultTitle')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600 dark:text-neutral-400 mb-1">{t('minPrice')}</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(result.minPrice)}</div>
                  </div>
                  <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border-2 border-green-500">
                    <div className="text-sm text-green-600 mb-1">{t('estimatedPrice')}</div>
                    <div className="text-2xl font-bold text-green-600">{formatPrice(result.avgPrice)}</div>
                  </div>
                  <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm">
                    <div className="text-sm text-gray-600 dark:text-neutral-400 mb-1">{t('maxPrice')}</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(result.maxPrice)}</div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
                  {t('pricePerM2')} : <span className="font-semibold">{formatPrice(result.pricePerM2)}</span>
                  {formData.operationType === 'LOCATION' && t('perMonth')}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/publier"
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center"
                  >
                    {t('publishListing')}
                  </Link>
                  <Link
                    href="/recherche"
                    className="flex-1 bg-white dark:bg-dark-bg text-green-600 border border-green-600 py-3 px-4 rounded-lg font-semibold hover:bg-green-50 dark:hover:bg-dark-border transition-colors text-center"
                  >
                    {t('viewSimilar')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('marketData')}</h3>
            <p className="text-gray-600 dark:text-neutral-400 text-sm">
              {t('marketDataDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('preciseLocation')}</h3>
            <p className="text-gray-600 dark:text-neutral-400 text-sm">
              {t('preciseLocationDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('freeService')}</h3>
            <p className="text-gray-600 dark:text-neutral-400 text-sm">
              {t('freeServiceDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
