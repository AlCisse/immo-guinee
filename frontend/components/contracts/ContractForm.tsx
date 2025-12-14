'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import ContractTypeSelector from './ContractTypeSelector';
import type { GenerateContractData } from '@/lib/hooks/useContracts';

// Validation schema with conditional validation based on mode_duree
const contractFormSchema = z.object({
  type_contrat: z.enum(['location', 'vente'], { required_error: 'Sélectionnez un type de contrat' }),
  date_debut: z.string().min(1, 'Date de début requise'),
  // Options de durée: date_fin OU duree_mois OU duree_indeterminee
  mode_duree: z.enum(['date_fin', 'duree_mois', 'indeterminee']).default('duree_mois'),
  date_fin: z.string().optional(),
  duree_mois: z.coerce.number().optional(),
  // Montants
  montant_loyer: z.coerce.number().min(0, 'Loyer mensuel requis'),
  caution_mois: z.coerce.number().min(1).max(6, 'Maximum 6 mois de caution'),
  avance_mois: z.coerce.number().min(1).max(12, 'Maximum 12 mois d\'avance'),
  // Optional fields based on contract type
  prix_vente: z.coerce.number().optional(),
}).refine((data) => {
  // Validate duree_mois only when mode is 'duree_mois'
  if (data.mode_duree === 'duree_mois') {
    return data.duree_mois && data.duree_mois >= 1 && data.duree_mois <= 120;
  }
  return true;
}, {
  message: 'Durée minimum 1 mois, maximum 120 mois',
  path: ['duree_mois'],
}).refine((data) => {
  // Validate date_fin only when mode is 'date_fin'
  if (data.mode_duree === 'date_fin') {
    return !!data.date_fin;
  }
  return true;
}, {
  message: 'Date de fin requise',
  path: ['date_fin'],
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractFormProps {
  listingId: string;
  listingType?: string;
  defaultLoyer?: number;
  onSubmit: (data: GenerateContractData) => void;
  isSubmitting?: boolean;
}

const steps = [
  { id: 1, title: 'Type de contrat', description: 'Choisissez le type de document' },
  { id: 2, title: 'Conditions', description: 'Définissez les termes du contrat' },
  { id: 3, title: 'Récapitulatif', description: 'Vérifiez avant génération' },
];

export default function ContractForm({
  listingId,
  listingType,
  defaultLoyer = 0,
  onSubmit,
  isSubmitting = false,
}: ContractFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      type_contrat: undefined,
      date_debut: new Date().toISOString().split('T')[0],
      mode_duree: 'duree_mois',
      date_fin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duree_mois: 12,
      montant_loyer: defaultLoyer,
      caution_mois: 1,
      avance_mois: 1,
    },
  });

  const watchedValues = watch();
  const selectedType = watchedValues.type_contrat;

  // Update loyer when defaultLoyer changes (e.g., when listing is loaded)
  useEffect(() => {
    if (defaultLoyer > 0) {
      setValue('montant_loyer', defaultLoyer);
    }
  }, [defaultLoyer, setValue]);

  const handleContractTypeChange = (type: 'location' | 'vente') => {
    setValue('type_contrat', type);

    // Set default values based on contract type
    if (type === 'vente') {
      setValue('duree_mois', 3);
    } else {
      setValue('duree_mois', 12);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onFormSubmit = (data: ContractFormValues) => {
    console.log('onFormSubmit called with data:', data);
    // Calculate caution amount
    const montantCaution = data.montant_loyer * (data.caution_mois || 1);

    // Build payload matching backend StoreContractRequest validation
    const payload: GenerateContractData = {
      listing_id: listingId,
      type_contrat: data.type_contrat,
      date_debut: data.date_debut,
    };

    // Add duration based on mode_duree
    if (data.mode_duree === 'date_fin' && data.date_fin) {
      payload.date_fin = data.date_fin;
    } else if (data.mode_duree === 'duree_mois' && data.duree_mois) {
      payload.duree_mois = data.duree_mois;
    } else if (data.mode_duree === 'indeterminee') {
      payload.duree_indeterminee = true;
    }

    // Add fields based on contract type
    if (data.type_contrat === 'location') {
      payload.montant_loyer = data.montant_loyer;
      payload.montant_caution = montantCaution;
    } else {
      payload.prix_vente = data.prix_vente;
    }

    onSubmit(payload);
  };

  // Calculate totals
  const loyer = watchedValues.montant_loyer || 0;
  const caution = loyer * (watchedValues.caution_mois || 1);
  const avance = loyer * (watchedValues.avance_mois || 1);
  const commission = loyer * 0.5;
  const total = caution + avance + commission;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress Steps */}
      <nav aria-label="Étapes du formulaire" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-center">
              <div className="flex items-center">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full font-semibold',
                    currentStep >= step.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {currentStep > step.id ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>
                <div className="ml-3 hidden sm:block">
                  <p className={cn('text-sm font-medium', currentStep >= step.id ? 'text-primary-600' : 'text-gray-500')}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn('mx-4 h-0.5 w-12 sm:w-24', currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200')} />
              )}
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={handleSubmit(onFormSubmit, (errors) => {
        console.error('Form validation errors:', errors);
      })}>
        {/* Step 1: Contract Type */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <ContractTypeSelector
              value={selectedType}
              onChange={handleContractTypeChange}
              listingType={listingType}
            />
            {errors.type_contrat && (
              <p className="mt-2 text-sm text-red-600">{errors.type_contrat.message}</p>
            )}
          </div>
        )}

        {/* Step 2: Conditions */}
        {currentStep === 2 && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Conditions du contrat</h3>

            <Input
              label="Date de début"
              type="date"
              {...register('date_debut')}
              error={errors.date_debut?.message}
            />

            {/* Mode de durée */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Durée du contrat</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="duree_mois"
                    {...register('mode_duree')}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Durée en mois</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="date_fin"
                    {...register('mode_duree')}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Date de fin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="indeterminee"
                    {...register('mode_duree')}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Durée indéterminée</span>
                </label>
              </div>

              {/* Champ conditionnel selon le mode */}
              {watchedValues.mode_duree === 'duree_mois' && (
                <Select
                  label="Nombre de mois"
                  options={[1, 3, 6, 12, 24, 36, 48, 60, 120].map((n) => ({
                    value: String(n),
                    label: n >= 12 ? `${Math.floor(n / 12)} an${n >= 24 ? 's' : ''} (${n} mois)` : `${n} mois`
                  }))}
                  defaultValue="12"
                  {...register('duree_mois', { valueAsNumber: true })}
                  error={errors.duree_mois?.message}
                />
              )}

              {watchedValues.mode_duree === 'date_fin' && (
                <Input
                  label="Date de fin"
                  type="date"
                  {...register('date_fin')}
                  error={errors.date_fin?.message}
                />
              )}

              {watchedValues.mode_duree === 'indeterminee' && (
                <p className="text-sm text-gray-500 italic">
                  Le contrat sera à durée indéterminée avec un préavis de résiliation selon la loi.
                </p>
              )}
            </div>

            <Input
              label="Loyer mensuel (GNF)"
              type="number"
              {...register('montant_loyer', { valueAsNumber: true })}
              error={errors.montant_loyer?.message}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label="Caution (mois)"
                options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} mois` }))}
                defaultValue="1"
                {...register('caution_mois', { valueAsNumber: true })}
                error={errors.caution_mois?.message}
              />
              <Select
                label="Avance (mois)"
                options={[1, 2, 3, 6, 12].map((n) => ({ value: String(n), label: `${n} mois` }))}
                defaultValue="1"
                {...register('avance_mois', { valueAsNumber: true })}
                error={errors.avance_mois?.message}
              />
            </div>

            {selectedType === 'vente' && (
              <Input
                label="Prix de vente (GNF)"
                type="number"
                {...register('prix_vente', { valueAsNumber: true })}
              />
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {currentStep === 3 && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Récapitulatif</h3>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Type de contrat</dt>
                  <dd className="font-medium text-gray-900">
                    {selectedType === 'location' ? 'Contrat de Location' : 'Contrat de Vente'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Période</dt>
                  <dd className="font-medium text-gray-900">
                    {watchedValues.mode_duree === 'indeterminee'
                      ? `À partir du ${watchedValues.date_debut} (Durée indéterminée)`
                      : watchedValues.mode_duree === 'date_fin'
                        ? `Du ${watchedValues.date_debut} au ${watchedValues.date_fin}`
                        : `${watchedValues.date_debut} - ${watchedValues.duree_mois} mois`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Loyer mensuel</dt>
                  <dd className="font-medium text-gray-900">
                    {loyer.toLocaleString('fr-GN')} GNF
                  </dd>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Caution ({watchedValues.caution_mois} mois)</dt>
                    <dd className="text-gray-900">{caution.toLocaleString('fr-GN')} GNF</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Avance ({watchedValues.avance_mois} mois)</dt>
                    <dd className="text-gray-900">{avance.toLocaleString('fr-GN')} GNF</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Commission ImmoGuinée (50%)</dt>
                    <dd className="text-gray-900">{commission.toLocaleString('fr-GN')} GNF</dd>
                  </div>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4 text-lg font-bold">
                  <dt className="text-gray-900">Total à payer</dt>
                  <dd className="text-primary-600">{total.toLocaleString('fr-GN')} GNF</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> En cliquant sur &quot;Générer le contrat&quot;, vous acceptez
                les conditions générales d&apos;utilisation d&apos;ImmoGuinée. Le contrat sera envoyé
                aux deux parties pour signature électronique.
              </p>
            </div>

            {/* Display validation errors */}
            {Object.keys(errors).length > 0 && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800 mb-2">Erreurs de validation:</p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}><strong>{field}:</strong> {error?.message as string}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Précédent
          </Button>

          {currentStep < steps.length ? (
            <Button
              type="button"
              variant="primary"
              onClick={nextStep}
              disabled={currentStep === 1 && !selectedType}
            >
              Suivant
            </Button>
          ) : (
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Générer le contrat
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
