'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useGenerateContract, type GenerateContractData } from '@/lib/hooks/useContracts';
import ContractForm from '@/components/contracts/ContractForm';
import PDFPreview from '@/components/contracts/PDFPreview';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

// Fetch listing details
async function fetchListing(id: string) {
  const response = await apiClient.get(`/listings/${id}`);
  return response.data.data.listing || response.data.data;
}

// Fetch user's listings for selection
async function fetchUserListings() {
  const response = await apiClient.get('/listings/my');
  return response.data.data?.listings || response.data.data || [];
}

// Fetch contacts/conversations for a listing
async function fetchListingContacts(listingId: string) {
  const response = await apiClient.get(`/listings/${listingId}/contacts`);
  return response.data.data?.contacts || response.data.data || [];
}

export default function ContractGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingIdParam = searchParams.get('listing');

  const [selectedListingId, setSelectedListingId] = useState<string | null>(listingIdParam);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedLocataire, setSelectedLocataire] = useState<{
    userId: string;
    nom: string;
    telephone?: string;
    email?: string;
  } | null>(null);

  // Fetch user's listings for the selector
  const { data: userListings, isLoading: userListingsLoading } = useQuery({
    queryKey: ['user-listings'],
    queryFn: fetchUserListings,
    enabled: !listingIdParam,
  });

  // Fetch selected listing details
  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', selectedListingId],
    queryFn: () => fetchListing(selectedListingId!),
    enabled: !!selectedListingId,
  });

  // Fetch contacts/conversations for the selected listing
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['listing-contacts', selectedListingId],
    queryFn: () => fetchListingContacts(selectedListingId!),
    enabled: !!selectedListingId,
  });

  // Generate contract mutation
  const generateContract = useGenerateContract();

  const handleSubmit = async (data: GenerateContractData) => {
    try {
      // Add locataire_id if a locataire is selected
      const contractData = {
        ...data,
        locataire_id: selectedLocataire?.userId,
      };

      const contract = await generateContract.mutateAsync(contractData);

      // Redirect to "Mes contrats" with the new contract highlighted
      router.push(`/dashboard/mes-contrats?success=created&highlight=${contract.id}`);
    } catch (error) {
      console.error('Failed to generate contract:', error);
    }
  };

  const handleSendForSignature = () => {
    if (generatedContractId) {
      router.push(`/contrats/${generatedContractId}`);
    }
  };

  const handleSelectListing = (id: string) => {
    setSelectedListingId(id);
    router.push(`/contrats/generer?listing=${id}`);
  };

  // Helper to get photo URL
  const getPhotoUrl = (item: any): string => {
    const photo = item.main_photo_url || item.photo_principale ||
      (item.photos && item.photos.length > 0 ? item.photos[0] : null) ||
      (item.listing_photos && item.listing_photos.length > 0
        ? (item.listing_photos[0].medium_url || item.listing_photos[0].url)
        : null);

    if (!photo || photo.includes('via.placeholder.com')) {
      return '/placeholder-property.jpg';
    }
    return photo;
  };

  // Format price
  const formatPrice = (item: any): string => {
    const price = item.formatted_price ||
      (item.loyer_mensuel ? `${parseInt(item.loyer_mensuel).toLocaleString('fr-GN')} GNF/mois` :
      (item.prix ? `${item.prix.toLocaleString('fr-GN')} GNF` : 'Prix non défini'));
    return price;
  };

  // No listing selected - show listing selector
  if (!selectedListingId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Générer un contrat</h1>
          <p className="mt-2 text-gray-600">
            Sélectionnez une de vos annonces pour générer un contrat de location
          </p>
        </div>

        {userListingsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : userListings && userListings.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vos annonces</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {userListings.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectListing(item.id)}
                  className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={getPhotoUrl(item)}
                      alt={item.titre}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.titre}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {item.quartier}, {item.commune}
                    </p>
                    <p className="text-sm font-semibold text-green-600 mt-1">
                      {formatPrice(item)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-600 mb-4">Vous n&apos;avez pas encore d&apos;annonces</p>
            <Link href="/publier">
              <Button variant="primary">
                Publier une annonce
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">Ou parcourez toutes les annonces disponibles</p>
          <Link href="/annonces">
            <Button variant="outline">
              Voir toutes les annonces
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading listing
  if (listingLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Contract generated - show preview
  if (generatedContractId && previewUrl) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">Contrat genere avec succes!</h3>
              <p className="mt-1 text-sm text-green-700">
                Verifiez le document ci-dessous avant de l&apos;envoyer pour signature.
              </p>
            </div>
          </div>
        </div>

        <PDFPreview url={previewUrl} title="Apercu du contrat" />

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setGeneratedContractId(null)}>
            Modifier le contrat
          </Button>
          <Button variant="primary" onClick={handleSendForSignature}>
            Envoyer pour signature
          </Button>
        </div>
      </div>
    );
  }

  // Show contract form
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href={`/annonces/${selectedListingId}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour a l&apos;annonce
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Generer un contrat</h1>
        {listing && (
          <p className="mt-2 text-gray-600">
            Pour: <span className="font-medium">{listing.titre}</span> - {listing.quartier}
          </p>
        )}
      </div>

      {/* Listing summary card */}
      {listing && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex gap-4">
            {listing.photos?.[0] && (
              <img
                src={listing.photos[0]}
                alt={listing.titre}
                className="h-24 w-32 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{listing.titre}</h3>
              <p className="text-sm text-gray-500">{listing.adresse}, {listing.quartier}</p>
              <p className="mt-1 text-lg font-bold text-primary-600">
                {listing.formatted_price ||
                  (listing.loyer_mensuel ? `${parseInt(listing.loyer_mensuel).toLocaleString('fr-GN')} GNF/mois` :
                  (listing.prix ? `${listing.prix.toLocaleString('fr-GN')} GNF` : 'Prix non défini'))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent contacts/conversations for this listing - Dropdown */}
      <div className="mb-8">
        <label htmlFor="contact-select" className="block text-sm font-medium text-gray-700 mb-2">
          Contacts intéressés {contacts && contacts.length > 0 && `(${contacts.length})`}
        </label>
        <div className="relative">
          <select
            id="contact-select"
            disabled={contactsLoading}
            onChange={(e) => {
              const selectedContact = contacts?.find((c: any) => (c.id || c.user_id) === e.target.value);
              if (selectedContact) {
                setSelectedLocataire({
                  userId: selectedContact.user_id || selectedContact.id,
                  nom: selectedContact.nom_complet || selectedContact.user?.nom_complet || 'Locataire',
                  telephone: selectedContact.telephone || selectedContact.user?.telephone,
                  email: selectedContact.email || selectedContact.user?.email,
                });
              } else {
                setSelectedLocataire(null);
              }
            }}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white ${contactsLoading ? 'bg-gray-100 cursor-wait' : ''}`}
          >
            {contactsLoading ? (
              <option>Chargement des contacts...</option>
            ) : contacts && contacts.length > 0 ? (
              <>
                <option value="">-- Sélectionner un contact intéressé --</option>
                {contacts.map((contact: any) => (
                  <option key={contact.id || contact.user_id} value={contact.id || contact.user_id}>
                    {contact.nom_complet || contact.user?.nom_complet || 'Utilisateur'} - {contact.telephone || contact.user?.telephone || 'Pas de téléphone'}
                  </option>
                ))}
              </>
            ) : (
              <option value="">Aucun contact intéressé pour le moment</option>
            )}
          </select>
          {/* Dropdown arrow icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {contactsLoading ? (
              <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Sélectionnez un contact pour pré-remplir les informations du locataire
        </p>

        {/* Show selected locataire */}
        {selectedLocataire && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  Locataire: {selectedLocataire.nom}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLocataire(null)}
                className="text-green-600 hover:text-green-800"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {selectedLocataire.telephone && (
              <p className="mt-1 text-xs text-green-600 ml-7">
                Tél: {selectedLocataire.telephone}
              </p>
            )}
          </div>
        )}

        {/* Warning if no locataire selected */}
        {!selectedLocataire && contacts && contacts.length > 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-yellow-800">
                Veuillez sélectionner un locataire pour générer le contrat
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contract form */}
      <ContractForm
        listingId={selectedListingId!}
        listingType={listing?.type_bien}
        defaultLoyer={listing?.loyer_mensuel ? parseInt(listing.loyer_mensuel) : (listing?.prix || 0)}
        onSubmit={handleSubmit}
        isSubmitting={generateContract.isPending}
      />

      {/* Error message */}
      {generateContract.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-2">
            Une erreur est survenue lors de la génération du contrat:
          </p>
          <p className="text-sm text-red-700">
            {(generateContract.error as any)?.response?.data?.message ||
             (generateContract.error as any)?.message ||
             'Erreur inconnue'}
          </p>
          {(generateContract.error as any)?.response?.data?.errors && (
            <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
              {Object.entries((generateContract.error as any).response.data.errors).map(([field, messages]: [string, any]) => (
                <li key={field}><strong>{field}:</strong> {Array.isArray(messages) ? messages.join(', ') : messages}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
