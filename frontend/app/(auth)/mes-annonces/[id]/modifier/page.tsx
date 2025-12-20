'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Home,
  MapPin,
  DollarSign,
  Ruler,
  BedDouble,
  Bath,
  Camera,
  Trash2,
  Plus,
  GripVertical,
  Star,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface ListingPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  order: number;
}

interface Listing {
  id: string;
  titre: string;
  description: string;
  type_bien: string;
  type_transaction: string;
  loyer_mensuel: number | string;
  caution?: number | string;
  avance?: number | string;
  duree_minimum_jours?: number;
  commune: string;
  quartier: string;
  surface_m2?: number | null;
  nombre_chambres?: number | null;
  nombre_salles_bain?: number | null;
  meuble: boolean;
  commodites?: string[];
  statut: string;
  photos?: ListingPhoto[];
  listing_photos?: ListingPhoto[];
}

export default function ModifierAnnoncePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const listingId = params.id as string;

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    prix: '',
    surface_m2: '',
    nombre_chambres: '',
    nombre_salles_bain: '',
    meuble: false,
  });

  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [primaryPhotoId, setPrimaryPhotoId] = useState<string | null>(null);

  // Fetch listing data
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const response = await api.listings.get(listingId);
      return response.data?.data?.listing as Listing;
    },
  });

  // Populate form when listing loads
  useEffect(() => {
    if (listing) {
      setFormData({
        titre: listing.titre || '',
        description: listing.description || '',
        prix: String(listing.loyer_mensuel || ''),
        surface_m2: String(listing.surface_m2 || ''),
        nombre_chambres: String(listing.nombre_chambres || ''),
        nombre_salles_bain: String(listing.nombre_salles_bain || ''),
        meuble: listing.meuble || false,
      });
      // Set initial primary photo
      const photos = listing.listing_photos || listing.photos || [];
      const primary = photos.find(p => p.is_primary);
      if (primary) {
        setPrimaryPhotoId(primary.id);
      }
    }
  }, [listing]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await api.listings.update(listingId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      toast.success('Annonce mise a jour avec succes');
      router.back();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise a jour';
      toast.error(message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = new FormData();
    submitData.append('titre', formData.titre);
    submitData.append('description', formData.description);
    submitData.append('prix', formData.prix.replace(/\s/g, ''));
    submitData.append('surface_m2', formData.surface_m2);
    submitData.append('nombre_chambres', formData.nombre_chambres);
    submitData.append('nombre_salles_bain', formData.nombre_salles_bain);
    submitData.append('meuble', formData.meuble ? '1' : '0');

    // Add new photos
    newPhotos.forEach((photo, index) => {
      submitData.append(`photos[${index}]`, photo);
    });

    // Add photos to delete
    if (photosToDelete.length > 0) {
      submitData.append('delete_photos', JSON.stringify(photosToDelete));
    }

    // Set primary photo
    if (primaryPhotoId) {
      submitData.append('primary_photo_id', primaryPhotoId);
    }

    updateMutation.mutate(submitData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewPhotos(prev => [...prev, ...files]);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const markPhotoForDeletion = (photoId: string) => {
    setPhotosToDelete(prev => [...prev, photoId]);
  };

  const formatNumber = (value: string): string => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-xl font-semibold mb-2">Annonce introuvable</h2>
        <p className="text-neutral-500 mb-4">Cette annonce n'existe pas ou a ete supprimee.</p>
        <Link href="/mes-annonces" className="text-primary-500 hover:underline">
          Retour a mes annonces
        </Link>
      </div>
    );
  }

  const existingPhotos = (listing.listing_photos || listing.photos || []).filter(
    p => !photosToDelete.includes(p.id)
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/mes-annonces"
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Modifier l'annonce</h1>
              <p className="text-white/80 text-sm">Mettez a jour les informations de votre bien</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 pb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-primary-500" />
              Informations generales
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Titre de l'annonce
                </label>
                <input
                  type="text"
                  name="titre"
                  value={formData.titre}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* Price & Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Prix et caracteristiques
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Prix (GNF)
                </label>
                <input
                  type="text"
                  name="prix"
                  value={formatNumber(formData.prix)}
                  onChange={(e) => setFormData(prev => ({ ...prev, prix: e.target.value.replace(/\s/g, '') }))}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Ruler className="w-4 h-4" />
                  Surface (m2)
                </label>
                <input
                  type="number"
                  name="surface_m2"
                  value={formData.surface_m2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <BedDouble className="w-4 h-4" />
                  Chambres
                </label>
                <input
                  type="number"
                  name="nombre_chambres"
                  value={formData.nombre_chambres}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  <Bath className="w-4 h-4" />
                  Salles de bain
                </label>
                <input
                  type="number"
                  name="nombre_salles_bain"
                  value={formData.nombre_salles_bain}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="meuble"
                  checked={formData.meuble}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-neutral-700 dark:text-neutral-300">Meuble</span>
              </label>
            </div>
          </motion.div>

          {/* Photos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-500" />
              Photos
            </h2>

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-neutral-500 mb-2">Photos actuelles (cliquez sur l'etoile pour definir l'image principale)</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {existingPhotos.map((photo) => {
                    const isPrimary = primaryPhotoId === photo.id;
                    return (
                      <div key={photo.id} className={`relative aspect-square rounded-xl overflow-hidden group ${isPrimary ? 'ring-2 ring-primary-500' : ''}`}>
                        <img
                          src={photo.thumbnail_url || photo.url}
                          alt="Photo"
                          className="w-full h-full object-cover"
                        />
                        {/* Primary photo selector */}
                        <button
                          type="button"
                          onClick={() => setPrimaryPhotoId(photo.id)}
                          className={`absolute top-2 left-2 p-1.5 rounded-full transition-all ${
                            isPrimary
                              ? 'bg-primary-500 text-white'
                              : 'bg-black/50 text-white/70 hover:bg-primary-500 hover:text-white'
                          }`}
                          title={isPrimary ? 'Image principale' : 'Definir comme principale'}
                        >
                          <Star className={`w-4 h-4 ${isPrimary ? 'fill-current' : ''}`} />
                        </button>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => markPhotoForDeletion(photo.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                        {isPrimary && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                            Principale
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Photos */}
            {newPhotos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-neutral-500 mb-2">Nouvelles photos</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {newPhotos.map((file, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Nouvelle photo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewPhoto(index)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-300 dark:border-dark-border rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
              <Plus className="w-5 h-5 text-neutral-400" />
              <span className="text-neutral-500">Ajouter des photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4"
          >
            <Link
              href="/mes-annonces"
              className="flex-1 py-3 px-6 bg-neutral-100 dark:bg-dark-border text-neutral-700 dark:text-neutral-300 font-medium rounded-xl text-center hover:bg-neutral-200 dark:hover:bg-dark-hover transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-3 px-6 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
