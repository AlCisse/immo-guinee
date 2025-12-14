'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  DollarSign,
  Ruler,
  BedDouble,
  Bath,
  Sofa,
  Camera,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  MapPin,
  Building2,
  Key,
  Store,
  Trees,
  Warehouse,
  Car,
  Wifi,
  Wind,
  Shield,
  Droplets,
  Zap,
  XCircle,
  Wand2,
  Calendar,
} from 'lucide-react';
import TypeBienSelector, { type TypeBien } from './TypeBienSelector';
import LocationSelector from './LocationSelector';
import PhotoUploader, { type PhotoFile } from './PhotoUploader';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

export type OperationType = 'LOCATION' | 'LOCATION_COURTE' | 'VENTE';

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
  avanceMois: string;
  dureeMinimumJours: string;
  meuble: boolean;
  photos: PhotoFile[];
  amenities: string[];
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
  avanceMois: '1',
  dureeMinimumJours: '1',
  meuble: false,
  photos: [],
  amenities: [],
};

const AMENITIES = [
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'wifi', label: 'Wifi', icon: Wifi },
  { id: 'climatisation', label: 'Climatisation', icon: Wind },
  { id: 'securite', label: 'Sécurité 24h', icon: Shield },
  { id: 'piscine', label: 'Piscine', icon: Droplets },
  { id: 'groupe_electrogene', label: 'Groupe électrogène', icon: Zap },
];

interface ListingFormStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  totalSteps: number;
}

export default function ListingFormStepper({
  currentStep,
  onStepChange,
  totalSteps,
}: ListingFormStepperProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const submissionInProgress = useRef(false); // Prevent duplicate submissions
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  // Validation for current step
  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (currentStep === 1) {
      if (!formData.operationType) {
        newErrors.operationType = "Veuillez sélectionner le type d'opération";
      }
      if (!formData.typeBien) {
        newErrors.typeBien = 'Veuillez sélectionner le type de bien';
      }
    }

    if (currentStep === 2) {
      if (!formData.titre.trim()) {
        newErrors.titre = 'Le titre est requis';
      } else if (formData.titre.trim().length < 15) {
        newErrors.titre = 'Le titre doit contenir au moins 15 caractères';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'La description est requise';
      } else if (formData.description.trim().length < 50) {
        newErrors.description = 'La description doit contenir au moins 50 caractères';
      }

      if (!formData.prix.trim()) {
        newErrors.prix = 'Le prix est requis';
      }

      if (!formData.superficie.trim()) {
        newErrors.superficie = 'La superficie est requise';
      }

      if (!formData.nombreChambres.trim()) {
        newErrors.nombreChambres = 'Le nombre de chambres est requis';
      }
    }

    if (currentStep === 3) {
      if (!formData.quartier) {
        newErrors.quartier = 'Veuillez sélectionner le quartier';
      }
    }

    if (currentStep === 4) {
      if (formData.photos.length < 3) {
        newErrors.photos = `Ajoutez au moins 3 photos (${formData.photos.length}/3)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  // Handle next step
  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        onStepChange(currentStep + 1);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  // Handle AI optimization
  const handleOptimize = async () => {
    if (!formData.titre.trim() || !formData.description.trim()) {
      setOptimizeError('Veuillez remplir le titre et la description avant d\'optimiser');
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);

    try {
      const response = await api.ai.optimizeListing({
        titre: formData.titre,
        description: formData.description,
        type_bien: formData.typeBien || undefined,
        type_operation: formData.operationType || undefined,
        quartier: formData.quartier || undefined,
      });

      if (response.data?.success && response.data?.data) {
        setFormData((prev) => ({
          ...prev,
          titre: response.data.data.titre || prev.titre,
          description: response.data.data.description || prev.description,
        }));
        // Clear any errors on success
        setErrors((prev) => ({ ...prev, titre: undefined, description: undefined }));
      } else {
        setOptimizeError(response.data?.message || 'Erreur lors de l\'optimisation');
      }
    } catch (error: any) {
      console.error('AI optimization error:', error);
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 404) {
        setOptimizeError('Service d\'optimisation non disponible.');
      } else if (status === 422) {
        setOptimizeError(message || 'Le texte n\'a pas pu être optimisé.');
      } else if (status === 503) {
        setOptimizeError('Service temporairement indisponible.');
      } else {
        setOptimizeError(
          message || 'Erreur lors de l\'optimisation. Veuillez réessayer.'
        );
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (submissionInProgress.current || isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate click');
      return;
    }

    if (!validateCurrentStep()) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/connexion?redirect=/publier');
      return;
    }

    // Lock submission
    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Map frontend TypeBien to backend type_propriete
      const typeBienToTypePropriete: Record<string, string> = {
        'STUDIO': 'studio',
        'CHAMBRE_SALON': 'appartement',
        'APPARTEMENT_2CH': 'appartement',
        'APPARTEMENT_3CH': 'appartement',
        'VILLA': 'villa',
        'DUPLEX': 'maison',
        'BUREAU': 'bureau',
        'MAGASIN': 'magasin',
        'ENTREPOT': 'magasin',
        'TERRAIN': 'terrain',
      };

      // Map frontend operation type to backend type_transaction
      const typeTransaction = formData.operationType === 'VENTE' ? 'vente' : formData.operationType === 'LOCATION_COURTE' ? 'location_courte' : 'location';

      // For Conakry, determine the commune based on quartier code/name
      // For other regions, use the prefecture name as commune
      const getCommune = (): string => {
        // If we have a prefecture set, we need to determine the commune
        if (formData.region === '01') { // Conakry
          // Map quartier to commune for Conakry (based on quartier code patterns)
          const quartier = formData.quartier || '';
          // Known quartiers by commune
          const ratomaQuartiers = ['Taouyah', 'Kipé', 'Kipé 2', 'Nongo', 'Dar-es-salam', 'Hamdalaye 1', 'Hamdalaye 2',
            'Hamdalaye-mosquée', 'Kaporo-centre', 'Kaporo-rails', 'Koloma 1', 'Koloma 2', 'Ratoma-centre',
            'Ratoma-dispensaire', 'Demoudoula', 'Bomboli', 'Simanbossia', 'Dadiya', 'Kakimbo', 'Soloprimo',
            'Sonfonia', 'Lambanyi', 'Kobaya'];
          const matomoQuartiers = ['Béanzin', 'Camp Alpha Yaya Diallo', 'Dabompa', 'Dabondy 1', 'Dabondy 2',
            'Dabondy 3', 'Dabondy école', 'Dabondy-rails', 'Kissosso', 'Matoto-centre',
            'Matoto-marché', 'Matoto-Khabitayah', 'Sangoya-mosquée', 'Simbaya 1', 'Simbaya 2', 'Tanéné-marché',
            'Tanéné-mosquée', 'Yimbaya-école', 'Yimbaya-permanence', 'Yimbaya-tannerie', 'Cosa', 'Enta', 'Gbessia'];
          const kaloumQuartiers = ['Almamya', 'Boulbinet', 'Coronthie', 'Sandervalia', 'Tombo', 'Manquepas', 'Sans-Fil'];
          const matamQuartiers = ['Matam-Centre', 'Madina', 'Hamdallaye', 'Teminetaye', 'Bonfie', 'Coléah',
            'Hermakono', 'Lanséboudyi'];

          if (ratomaQuartiers.some(q => quartier.includes(q) || q.includes(quartier))) return 'Ratoma';
          if (matomoQuartiers.some(q => quartier.includes(q) || q.includes(quartier))) return 'Matoto';
          if (kaloumQuartiers.some(q => quartier.includes(q) || q.includes(quartier))) return 'Kaloum';
          if (matamQuartiers.some(q => quartier.includes(q) || q.includes(quartier))) return 'Matam';
          return 'Dixinn'; // Default for Conakry
        }
        // For other regions, use prefecture name (stored in formData.prefecture is the code)
        // We need to find the prefecture name from GUINEA_REGIONS
        return formData.prefecture || 'Conakry';
      };
      const commune = getCommune();

      // Prepare FormData for multipart upload
      const submitData = new FormData();

      // Add basic fields (matching backend validation)
      submitData.append('titre', formData.titre);
      submitData.append('description', formData.description);
      submitData.append('prix', formData.prix.replace(/\s/g, '')); // Remove spaces from formatted price
      submitData.append('type_transaction', typeTransaction);
      submitData.append('type_propriete', typeBienToTypePropriete[formData.typeBien || 'APPARTEMENT_2CH'] || 'appartement');
      submitData.append('surface_m2', formData.superficie || '0');
      submitData.append('nombre_chambres', formData.nombreChambres || '0');
      submitData.append('nombre_salles_bain', formData.nombreSallesDeBain || '1');

      // Location (backend expects commune and quartier)
      submitData.append('commune', commune);
      submitData.append('quartier', formData.quartier || 'Centre');

      // Caution and Avance for long-term rental
      if (formData.operationType === 'LOCATION') {
        submitData.append('caution_mois', formData.cautionMois || '1');
        submitData.append('avance_mois', formData.avanceMois || '1');
      }

      // Short-term rental specific fields
      if (formData.operationType === 'LOCATION_COURTE') {
        submitData.append('duree_minimum_jours', formData.dureeMinimumJours || '1');
        submitData.append('meuble', 'true'); // Always furnished for short-term
      } else if (formData.meuble) {
        submitData.append('meuble', 'true');
      }

      // Amenities (backend expects equipements with specific values)
      // Map frontend amenity IDs to backend expected values
      const amenityMapping: Record<string, string> = {
        'parking': 'garage',
        'wifi': 'wifi',
        'climatisation': 'climatisation',
        'securite': 'gardien',
        'piscine': 'piscine',
        'groupe_electrogene': 'electricite',
      };

      if (formData.amenities.length > 0) {
        formData.amenities.forEach((amenity, index) => {
          const mappedAmenity = amenityMapping[amenity] || amenity;
          submitData.append(`equipements[${index}]`, mappedAmenity);
        });
      }

      // Photos
      formData.photos.forEach((photo, index) => {
        if (photo.file) {
          submitData.append(`photos[${index}]`, photo.file);
        }
      });

      // Call API
      const response = await api.listings.create(submitData);

      if (response.data?.success) {
        // Invalidate cache to ensure fresh data on mes-annonces page
        queryClient.invalidateQueries({ queryKey: ['my-listings'] });
        // Redirect immediately to mes-annonces with success message
        router.push('/mes-annonces?success=created');
        return; // Exit early, no need to show success state in form
      } else {
        throw new Error(response.data?.message || 'Une erreur est survenue');
      }
    } catch (error: unknown) {
      console.error('Error submitting listing:', error);
      // Handle Axios errors with validation messages
      let errorMessage = 'Erreur lors de la publication. Veuillez réessayer.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        if (axiosError.response?.data?.errors) {
          // Format validation errors
          const validationErrors = Object.entries(axiosError.response.data.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('\n');
          errorMessage = validationErrors || axiosError.response.data.message || errorMessage;
          console.error('Validation errors:', axiosError.response.data.errors);
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setSubmitError(errorMessage);
      // Unlock submission on error to allow retry
      submissionInProgress.current = false;
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
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Format number
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

  // Toggle amenity
  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" custom={currentStep}>
        {/* Step 1: Type d'opération et Type de bien */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6"
          >
            {/* Operation Type */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-orange-500 rounded-xl shadow-lg shadow-primary-500/30">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Que souhaitez-vous faire ?
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Choisissez le type d'opération
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: 'LOCATION' as OperationType,
                    icon: Home,
                    title: 'Louer',
                    subtitle: 'Location longue durée',
                    color: 'from-blue-500 to-cyan-500',
                  },
                  {
                    type: 'LOCATION_COURTE' as OperationType,
                    icon: Calendar,
                    title: 'Louer courte durée',
                    subtitle: 'Meublé, à partir de 1 jour',
                    color: 'from-purple-500 to-pink-500',
                  },
                  {
                    type: 'VENTE' as OperationType,
                    icon: DollarSign,
                    title: 'Vendre',
                    subtitle: 'Mettre en vente',
                    color: 'from-emerald-500 to-teal-500',
                  },
                ].map((option) => (
                  <motion.button
                    key={option.type}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        operationType: option.type,
                        // Auto-enable meublé for short-term rental
                        meuble: option.type === 'LOCATION_COURTE' ? true : prev.meuble,
                      }));
                      setErrors((prev) => ({ ...prev, operationType: undefined }));
                    }}
                    className={`
                      relative p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden
                      ${formData.operationType === option.type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/20'
                        : 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-300 hover:shadow-md'
                      }
                    `}
                  >
                    {/* Background Gradient */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-5 transition-opacity
                      ${formData.operationType === option.type ? 'opacity-10' : ''}
                    `} />

                    <div className="relative">
                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all
                        ${formData.operationType === option.type
                          ? `bg-gradient-to-br ${option.color} shadow-lg`
                          : 'bg-neutral-100 dark:bg-dark-border group-hover:bg-neutral-200'
                        }
                      `}>
                        <option.icon className={`w-7 h-7 ${formData.operationType === option.type ? 'text-white' : 'text-neutral-500'}`} />
                      </div>

                      <div className="font-bold text-lg text-neutral-900 dark:text-white mb-1">
                        {option.title}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {option.subtitle}
                      </div>

                      {formData.operationType === option.type && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4"
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-orange-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {errors.operationType && (
                <div className="mt-4 flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {errors.operationType}
                </div>
              )}
            </div>

            {/* Property Type */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Type de bien
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Sélectionnez la catégorie de votre propriété
                  </p>
                </div>
              </div>

              <TypeBienSelector
                value={formData.typeBien}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, typeBien: value }));
                  setErrors((prev) => ({ ...prev, typeBien: undefined }));
                }}
                error={errors.typeBien}
              />
            </div>
          </motion.div>
        )}

        {/* Step 2: Détails et Prix */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="space-y-6"
          >
            {/* Title & Description */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Présentez votre bien
                    </h3>
                    <p className="text-sm text-neutral-500">
                      Un bon titre et une description détaillée attirent plus de visiteurs
                    </p>
                  </div>
                </div>

                {/* AI Optimize Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOptimize}
                  disabled={isOptimizing || (!formData.titre.trim() && !formData.description.trim())}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all font-medium shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Optimisation...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Optimiser avec l'IA</span>
                      <span className="sm:hidden">IA</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* AI Optimization Error */}
              {optimizeError && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {optimizeError}
                </div>
              )}

              <div className="space-y-5">
                {/* Titre */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Titre de l'annonce
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      ({formData.titre.length}/100)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="titre"
                    value={formData.titre}
                    onChange={handleInputChange}
                    maxLength={100}
                    className={`
                      w-full px-4 py-3.5 rounded-xl border-2 transition-all text-lg
                      ${errors.titre
                        ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                        : 'border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card'
                      }
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10
                      text-neutral-900 dark:text-white placeholder-neutral-400
                    `}
                    placeholder="Ex: Magnifique villa 4 chambres avec piscine à Kipé"
                  />
                  {errors.titre && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.titre}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Description
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      ({formData.description.length}/2000)
                    </span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={2000}
                    rows={5}
                    className={`
                      w-full px-4 py-3.5 rounded-xl border-2 transition-all resize-none
                      ${errors.description
                        ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                        : 'border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card'
                      }
                      focus:outline-none focus:ring-4 focus:ring-primary-500/10
                      text-neutral-900 dark:text-white placeholder-neutral-400
                    `}
                    placeholder="Décrivez votre bien en détail: état général, équipements, proximité des services..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Prix et Caractéristiques */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/30">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Prix et caractéristiques
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Définissez le prix et les détails de votre bien
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Prix */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                    Prix {formData.operationType === 'LOCATION' ? 'mensuel' : formData.operationType === 'LOCATION_COURTE' ? 'par jour' : 'de vente'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="prix"
                      value={formData.prix}
                      onChange={handlePrixChange}
                      className={`
                        w-full px-4 py-3.5 pr-16 rounded-xl border-2 transition-all text-lg font-semibold
                        ${errors.prix
                          ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                          : 'border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card'
                        }
                        focus:outline-none focus:ring-4 focus:ring-primary-500/10
                        text-neutral-900 dark:text-white
                      `}
                      placeholder="2 000 000"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-500 font-bold">
                      GNF
                    </div>
                  </div>
                  {errors.prix && (
                    <p className="mt-2 text-sm text-red-500">{errors.prix}</p>
                  )}
                </div>

                {/* Caution & Avance (only for LOCATION longue durée) */}
                {formData.operationType === 'LOCATION' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Caution
                      </label>
                      <select
                        name="cautionMois"
                        value={formData.cautionMois}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-neutral-900 dark:text-white"
                      >
                        {[1, 2, 3, 4, 5, 6].map((month) => (
                          <option key={month} value={month}>
                            {month} mois de loyer
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Avance
                      </label>
                      <select
                        name="avanceMois"
                        value={formData.avanceMois}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-neutral-900 dark:text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                          <option key={month} value={month}>
                            {month} mois
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Durée minimum (only for LOCATION_COURTE) */}
                {formData.operationType === 'LOCATION_COURTE' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">Location courte durée (meublé)</span>
                      </div>
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        Le prix indiqué est par jour. Le bien sera automatiquement marqué comme meublé.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        Durée minimum de location
                      </label>
                      <select
                        name="dureeMinimumJours"
                        value={formData.dureeMinimumJours}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg focus:bg-white dark:focus:bg-dark-card focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-neutral-900 dark:text-white"
                      >
                        {[1, 2, 3, 5, 7, 14, 30].map((days) => (
                          <option key={days} value={days}>
                            {days === 1 ? '1 jour minimum' : days < 7 ? `${days} jours minimum` : days === 7 ? '1 semaine minimum' : days === 14 ? '2 semaines minimum' : '1 mois minimum'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Caractéristiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'superficie', label: 'Superficie', icon: Ruler, unit: 'm²', required: true },
                  { id: 'nombreChambres', label: 'Chambres', icon: BedDouble, required: true },
                  { id: 'nombreSallesDeBain', label: 'Salles de bain', icon: Bath },
                  { id: 'nombreSalons', label: 'Salons', icon: Sofa },
                ].map((field) => (
                  <div key={field.id}>
                    <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      <field.icon className="w-4 h-4 text-primary-500" />
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name={field.id}
                        value={formData[field.id as keyof FormData] as string}
                        onChange={handleInputChange}
                        min="0"
                        className={`
                          w-full px-4 py-3 rounded-xl border-2 transition-all
                          ${errors[field.id as keyof FormErrors]
                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                            : 'border-neutral-200 dark:border-dark-border focus:border-primary-500 bg-neutral-50 dark:bg-dark-bg'
                          }
                          focus:outline-none focus:ring-4 focus:ring-primary-500/10
                          text-neutral-900 dark:text-white
                        `}
                        placeholder="0"
                      />
                      {field.unit && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 text-sm">
                          {field.unit}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Équipements */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/30">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Équipements
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Sélectionnez les équipements disponibles
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <motion.button
                    key={amenity.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                      ${formData.amenities.includes(amenity.id)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                        : 'border-neutral-200 dark:border-dark-border hover:border-primary-300'
                      }
                    `}
                  >
                    <amenity.icon className={`w-5 h-5 ${formData.amenities.includes(amenity.id) ? 'text-primary-500' : 'text-neutral-400'}`} />
                    <span className={`text-sm font-medium ${formData.amenities.includes(amenity.id) ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      {amenity.label}
                    </span>
                    {formData.amenities.includes(amenity.id) && (
                      <CheckCircle className="w-4 h-4 text-primary-500 ml-auto" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Localisation */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl shadow-lg shadow-rose-500/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Localisation du bien
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Indiquez l'emplacement précis de votre propriété
                  </p>
                </div>
              </div>

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
            </div>
          </motion.div>
        )}

        {/* Step 4: Photos */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Photos du bien
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Ajoutez des photos de qualité pour attirer plus de visiteurs
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

              {/* Photo Tips */}
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                  Conseils pour de bonnes photos :
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Prenez les photos en journée avec une bonne lumière naturelle</li>
                  <li>• Montrez toutes les pièces principales</li>
                  <li>• Rangez et nettoyez avant de photographier</li>
                  <li>• La première photo sera l'image principale de l'annonce</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 flex items-start gap-3"
        >
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Erreur</p>
            <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {submitSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-8 h-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">
            Annonce publiée avec succès !
          </h3>
          <p className="text-emerald-700 dark:text-emerald-300">
            Votre annonce est en cours de validation. Vous serez notifié une fois approuvée.
          </p>
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 gap-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={currentStep === 1 ? () => router.back() : handlePrevious}
          className="flex items-center gap-2 px-6 py-3.5 text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-dark-border rounded-xl hover:bg-neutral-200 dark:hover:bg-dark-card transition-all font-medium"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-5 h-5" />
          {currentStep === 1 ? 'Annuler' : 'Précédent'}
        </motion.button>

        {currentStep < totalSteps ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3.5 text-white bg-gradient-to-r from-primary-500 to-orange-500 rounded-xl hover:from-primary-600 hover:to-orange-600 transition-all font-semibold shadow-lg shadow-primary-500/30"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3.5 text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Publier l'annonce
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
