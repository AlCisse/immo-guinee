'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  DollarSign,
  Ruler,
  BedDouble,
  Bath,
  Sofa,
  Camera,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import TypeBienSelector, { type TypeBien } from './TypeBienSelector';
import LocationSelector from './LocationSelector';
import PhotoUploader, { type PhotoFile } from './PhotoUploader';

export type OperationType = 'LOCATION' | 'VENTE';

interface FormData {
  operationType?: OperationType;
  typeBien?: TypeBien;
  titre: string;
  description: string;
  prix: string;
  region?: string;
  prefecture?: string;
  quartier?: string;
  superficie: string;
  nombreChambres: string;
  nombreSallesDeBain: string;
  nombreSalons: string;
  cautionMois: string;
  photos: PhotoFile[];
}

interface FormErrors {
  operationType?: string;
  typeBien?: string;
  titre?: string;
  description?: string;
  prix?: string;
  region?: string;
  prefecture?: string;
  quartier?: string;
  superficie?: string;
  nombreChambres?: string;
  photos?: string;
}

const INITIAL_FORM_DATA: FormData = {
  titre: '',
  description: '',
  prix: '',
  superficie: '',
  nombreChambres: '',
  nombreSallesDeBain: '',
  nombreSalons: '',
  cautionMois: '1',
  photos: [],
};

export default function ListingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Validation functions
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Operation type validation
    if (!formData.operationType) {
      newErrors.operationType = "Veuillez sélectionner le type d'opération";
    }

    // Type de bien validation
    if (!formData.typeBien) {
      newErrors.typeBien = 'Veuillez sélectionner le type de bien';
    }

    // Titre validation (50-100 characters)
    if (!formData.titre.trim()) {
      newErrors.titre = 'Le titre est requis';
    } else if (formData.titre.trim().length < 50) {
      newErrors.titre = 'Le titre doit contenir au moins 50 caractères';
    } else if (formData.titre.trim().length > 100) {
      newErrors.titre = 'Le titre ne doit pas dépasser 100 caractères';
    }

    // Description validation (200-2000 characters)
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    } else if (formData.description.trim().length < 200) {
      newErrors.description = 'La description doit contenir au moins 200 caractères';
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = 'La description ne doit pas dépasser 2000 caractères';
    }

    // Prix validation
    if (!formData.prix.trim()) {
      newErrors.prix = 'Le prix est requis';
    } else {
      const prixNum = parseFloat(formData.prix.replace(/\s/g, ''));
      if (isNaN(prixNum) || prixNum <= 0) {
        newErrors.prix = 'Le prix doit être un nombre positif';
      }
    }

    // Quartier validation
    if (!formData.quartier) {
      newErrors.quartier = 'Veuillez sélectionner le quartier';
    }

    // Superficie validation
    if (!formData.superficie.trim()) {
      newErrors.superficie = 'La superficie est requise';
    } else {
      const superficieNum = parseFloat(formData.superficie);
      if (isNaN(superficieNum) || superficieNum <= 0) {
        newErrors.superficie = 'La superficie doit être un nombre positif';
      }
    }

    // Nombre de chambres validation
    if (!formData.nombreChambres.trim()) {
      newErrors.nombreChambres = 'Le nombre de chambres est requis';
    } else {
      const chambresNum = parseInt(formData.nombreChambres);
      if (isNaN(chambresNum) || chambresNum < 0) {
        newErrors.nombreChambres = 'Le nombre de chambres doit être un nombre positif';
      }
    }

    // Photos validation (at least 3 photos required)
    if (formData.photos.length === 0) {
      newErrors.photos = 'Au moins 3 photos sont requises';
    } else if (formData.photos.length < 3) {
      newErrors.photos = `Vous devez ajouter au moins 3 photos (actuellement ${formData.photos.length})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorElement = document.querySelector('[aria-invalid="true"]');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement API call to create listing
      console.log('Submitting listing:', formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Navigate to success page or listing detail
      router.push('/mes-annonces?success=true');
    } catch (error) {
      console.error('Error submitting listing:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Format number inputs
  const formatNumber = (value: string): string => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handlePrixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value);
    setFormData((prev) => ({ ...prev, prix: formatted }));
    if (errors.prix) {
      setErrors((prev) => ({ ...prev, prix: undefined }));
    }
  };

  // Progress indicator
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto" noValidate>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Étape {currentStep} sur {totalSteps}
          </span>
          <span className="text-sm text-neutral-500">
            {Math.round(progressPercentage)}% complété
          </span>
        </div>
        <div className="h-2 bg-neutral-100 dark:bg-dark-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="h-full bg-gradient-to-r from-primary-500 to-orange-500 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* Operation Type Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10">
              <Home className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Type d'opération <span className="text-red-500">*</span>
              </h3>
              <p className="text-sm text-neutral-500">
                Choisissez si vous souhaitez louer ou vendre
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, operationType: 'LOCATION' }));
                setErrors((prev) => ({ ...prev, operationType: undefined }));
              }}
              className={`
                relative p-5 rounded-xl border-2 transition-all duration-200 text-left group
                ${
                  formData.operationType === 'LOCATION'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-300'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              `}
            >
              <div className="text-3xl mb-3">🏠</div>
              <div className="font-semibold text-neutral-900 dark:text-white">Location</div>
              <div className="text-sm text-neutral-500 mt-1">Louer un bien immobilier</div>
              {formData.operationType === 'LOCATION' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-primary-500" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, operationType: 'VENTE' }));
                setErrors((prev) => ({ ...prev, operationType: undefined }));
              }}
              className={`
                relative p-5 rounded-xl border-2 transition-all duration-200 text-left group
                ${
                  formData.operationType === 'VENTE'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                    : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-300'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              `}
            >
              <div className="text-3xl mb-3">💰</div>
              <div className="font-semibold text-neutral-900 dark:text-white">Vente</div>
              <div className="text-sm text-neutral-500 mt-1">Vendre un bien immobilier</div>
              {formData.operationType === 'VENTE' && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-primary-500" />
                </div>
              )}
            </button>
          </div>

          {errors.operationType && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.operationType}
            </div>
          )}
        </motion.div>

        {/* Type de bien */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <TypeBienSelector
            value={formData.typeBien}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, typeBien: value }));
              setErrors((prev) => ({ ...prev, typeBien: undefined }));
            }}
            error={errors.typeBien}
          />
        </motion.div>

        {/* Localisation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <LocationSelector
            region={formData.region}
            prefecture={formData.prefecture}
            quartier={formData.quartier}
            onRegionChange={(region) => {
              setFormData((prev) => ({ ...prev, region }));
              setErrors((prev) => ({ ...prev, region: undefined }));
            }}
            onPrefectureChange={(prefecture) => {
              setFormData((prev) => ({ ...prev, prefecture }));
              setErrors((prev) => ({ ...prev, prefecture: undefined }));
            }}
            onQuartierChange={(quartier) => {
              setFormData((prev) => ({ ...prev, quartier }));
              setErrors((prev) => ({ ...prev, quartier: undefined }));
            }}
            regionError={errors.region}
            prefectureError={errors.prefecture}
            quartierError={errors.quartier}
          />
        </motion.div>

        {/* Titre et Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft space-y-6"
        >
          {/* Titre */}
          <div>
            <label htmlFor="titre" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Titre de l'annonce <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-neutral-500">
                ({formData.titre.length}/100)
              </span>
            </label>
            <input
              type="text"
              id="titre"
              name="titre"
              value={formData.titre}
              onChange={handleInputChange}
              maxLength={100}
              className={`
                w-full px-4 py-3 rounded-xl border-2 transition-colors
                bg-white dark:bg-dark-card
                ${errors.titre
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500/20
                text-neutral-900 dark:text-white placeholder-neutral-400
              `}
              placeholder="Ex: Villa moderne 3 chambres avec jardin à Kipé"
            />
            {errors.titre ? (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.titre}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-neutral-500">
                Minimum 50 caractères. Soyez descriptif et précis.
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Description <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-neutral-500">
                ({formData.description.length}/2000)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              maxLength={2000}
              rows={6}
              className={`
                w-full px-4 py-3 rounded-xl border-2 transition-colors resize-none
                bg-white dark:bg-dark-card
                ${errors.description
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500/20
                text-neutral-900 dark:text-white placeholder-neutral-400
              `}
              placeholder="Décrivez votre bien en détail: état général, équipements, proximité des services, commodités..."
            />
            {errors.description ? (
              <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-neutral-500">
                Minimum 200 caractères. Décrivez les caractéristiques et avantages du bien.
              </p>
            )}
          </div>
        </motion.div>

        {/* Prix et Caractéristiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Prix et caractéristiques
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Prix */}
            <div>
              <label htmlFor="prix" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Prix <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="prix"
                  name="prix"
                  value={formData.prix}
                  onChange={handlePrixChange}
                  className={`
                    w-full px-4 py-3 pr-16 rounded-xl border-2 transition-colors
                    bg-white dark:bg-dark-card
                    ${errors.prix
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20
                    text-neutral-900 dark:text-white placeholder-neutral-400
                  `}
                  placeholder="2 000 000"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-500 font-medium">
                  GNF
                </div>
              </div>
              {errors.prix ? (
                <p className="mt-1.5 text-sm text-red-500">{errors.prix}</p>
              ) : (
                <p className="mt-1.5 text-xs text-neutral-500">
                  {formData.operationType === 'LOCATION' ? 'Prix mensuel' : 'Prix de vente'}
                </p>
              )}
            </div>

            {/* Caution (only for LOCATION) */}
            {formData.operationType === 'LOCATION' && (
              <div>
                <label htmlFor="cautionMois" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Caution
                </label>
                <select
                  id="cautionMois"
                  name="cautionMois"
                  value={formData.cautionMois}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                >
                  {[1, 2, 3, 4, 5, 6].map((month) => (
                    <option key={month} value={month}>
                      {month} mois de loyer
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-neutral-500">
                  Nombre de mois de loyer pour la caution
                </p>
              </div>
            )}
          </div>

          {/* Caractéristiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Superficie */}
            <div>
              <label htmlFor="superficie" className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                <Ruler className="w-4 h-4" />
                Superficie <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="superficie"
                  name="superficie"
                  value={formData.superficie}
                  onChange={handleInputChange}
                  min="1"
                  className={`
                    w-full px-4 py-3 pr-12 rounded-xl border-2 transition-colors
                    bg-white dark:bg-dark-card
                    ${errors.superficie
                      ? 'border-red-500'
                      : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20
                    text-neutral-900 dark:text-white
                  `}
                  placeholder="100"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500 text-sm">
                  m²
                </div>
              </div>
              {errors.superficie && (
                <p className="mt-1 text-xs text-red-500">{errors.superficie}</p>
              )}
            </div>

            {/* Chambres */}
            <div>
              <label htmlFor="nombreChambres" className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                <BedDouble className="w-4 h-4" />
                Chambres <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="nombreChambres"
                name="nombreChambres"
                value={formData.nombreChambres}
                onChange={handleInputChange}
                min="0"
                className={`
                  w-full px-4 py-3 rounded-xl border-2 transition-colors
                  bg-white dark:bg-dark-card
                  ${errors.nombreChambres
                    ? 'border-red-500'
                    : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20
                  text-neutral-900 dark:text-white
                `}
                placeholder="3"
              />
              {errors.nombreChambres && (
                <p className="mt-1 text-xs text-red-500">{errors.nombreChambres}</p>
              )}
            </div>

            {/* Salles de bain */}
            <div>
              <label htmlFor="nombreSallesDeBain" className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                <Bath className="w-4 h-4" />
                Salles de bain
              </label>
              <input
                type="number"
                id="nombreSallesDeBain"
                name="nombreSallesDeBain"
                value={formData.nombreSallesDeBain}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                placeholder="2"
              />
            </div>

            {/* Salons */}
            <div>
              <label htmlFor="nombreSalons" className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                <Sofa className="w-4 h-4" />
                Salons
              </label>
              <input
                type="number"
                id="nombreSalons"
                name="nombreSalons"
                value={formData.nombreSalons}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors bg-white dark:bg-dark-card text-neutral-900 dark:text-white"
                placeholder="1"
              />
            </div>
          </div>
        </motion.div>

        {/* Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10">
              <Camera className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Photos du bien <span className="text-red-500">*</span>
              </h3>
              <p className="text-sm text-neutral-500">
                Ajoutez au moins 3 photos de qualité
              </p>
            </div>
          </div>

          <PhotoUploader
            photos={formData.photos}
            onChange={(photos) => {
              setFormData((prev) => ({ ...prev, photos }));
              setErrors((prev) => ({ ...prev, photos: undefined }));
            }}
            error={errors.photos}
          />
        </motion.div>

        {/* Submit Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4"
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-3.5 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-dark-card rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-border transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5" />
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 text-white bg-gradient-to-r from-primary-500 to-orange-500 rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Publication en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Publier l'annonce
              </>
            )}
          </button>
        </motion.div>
      </div>
    </form>
  );
}
