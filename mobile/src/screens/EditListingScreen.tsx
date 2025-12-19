import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { COLORS, PROPERTY_TYPES, REGIONS, CONAKRY_COMMUNES } from '../constants/config';
import { RootStackParamList } from '../types';
import { createListing, uploadListingMedia } from '../services/listings';
import { formatApiError } from '../services/api';

type EditRouteProp = RouteProp<RootStackParamList, 'EditListing'>;

interface FormData {
  type_transaction: 'VENTE' | 'LOCATION';
  type_bien: string;
  titre: string;
  description: string;
  prix: string;
  prix_periode: 'JOUR' | 'SEMAINE' | 'MOIS' | 'ANNEE';
  surface: string;
  nb_chambres: string;
  nb_salles_bain: string;
  adresse: string;
  ville: string;
  commune: string;
  quartier: string;
  meuble: boolean;
}

const EditListingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditRouteProp>();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    type_transaction: 'LOCATION',
    type_bien: 'APPARTEMENT',
    titre: '',
    description: '',
    prix: '',
    prix_periode: 'MOIS',
    surface: '',
    nb_chambres: '',
    nb_salles_bain: '',
    adresse: '',
    ville: 'Conakry',
    commune: '',
    quartier: '',
    meuble: false,
  });

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!formData.type_transaction || !formData.type_bien) {
        Alert.alert('Erreur', 'Veuillez sélectionner le type de transaction et de bien');
        return false;
      }
    } else if (step === 2) {
      if (!formData.titre.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer un titre');
        return false;
      }
      if (!formData.prix || isNaN(Number(formData.prix))) {
        Alert.alert('Erreur', 'Veuillez entrer un prix valide');
        return false;
      }
      if (!formData.surface || isNaN(Number(formData.surface))) {
        Alert.alert('Erreur', 'Veuillez entrer une surface valide');
        return false;
      }
    } else if (step === 3) {
      if (!formData.adresse.trim() || !formData.ville) {
        Alert.alert('Erreur', 'Veuillez entrer l\'adresse et la ville');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins une photo');
      return;
    }

    setIsSubmitting(true);
    try {
      const listing = await createListing({
        ...formData,
        prix: Number(formData.prix),
        surface: Number(formData.surface),
        nb_chambres: formData.nb_chambres ? Number(formData.nb_chambres) : null,
        nb_salles_bain: formData.nb_salles_bain ? Number(formData.nb_salles_bain) : null,
      });

      // Upload images
      const files = images.map((uri, i) => ({
        uri,
        type: 'image/jpeg',
        name: `image_${i}.jpg`,
      }));
      await uploadListingMedia(listing.id, files);

      Alert.alert('Succès', 'Votre annonce a été publiée avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Type d'annonce</Text>

      <Text style={styles.label}>Type de transaction</Text>
      <View style={styles.optionRow}>
        {(['LOCATION', 'VENTE'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              formData.type_transaction === type && styles.optionButtonActive,
            ]}
            onPress={() => handleChange('type_transaction', type)}
          >
            <Text
              style={[
                styles.optionText,
                formData.type_transaction === type && styles.optionTextActive,
              ]}
            >
              {type === 'VENTE' ? 'Vente' : 'Location'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Type de bien</Text>
      <View style={styles.optionGrid}>
        {Object.entries(PROPERTY_TYPES).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.optionChip,
              formData.type_bien === key && styles.optionChipActive,
            ]}
            onPress={() => handleChange('type_bien', key)}
          >
            <Text
              style={[
                styles.optionChipText,
                formData.type_bien === key && styles.optionChipTextActive,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Détails du bien</Text>

      <Text style={styles.label}>Titre de l'annonce</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Bel appartement F3 à Kipé"
        value={formData.titre}
        onChangeText={(v) => handleChange('titre', v)}
        maxLength={100}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Décrivez votre bien..."
        value={formData.description}
        onChangeText={(v) => handleChange('description', v)}
        multiline
        numberOfLines={4}
        maxLength={2000}
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Prix (GNF)</Text>
          <TextInput
            style={styles.input}
            placeholder="1 000 000"
            value={formData.prix}
            onChangeText={(v) => handleChange('prix', v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>
        {formData.type_transaction === 'LOCATION' && (
          <View style={styles.halfInput}>
            <Text style={styles.label}>Période</Text>
            <View style={styles.periodRow}>
              {(['JOUR', 'MOIS'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    formData.prix_periode === period && styles.periodButtonActive,
                  ]}
                  onPress={() => handleChange('prix_periode', period)}
                >
                  <Text
                    style={[
                      styles.periodText,
                      formData.prix_periode === period && styles.periodTextActive,
                    ]}
                  >
                    {period === 'JOUR' ? '/jour' : '/mois'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Surface (m²)</Text>
          <TextInput
            style={styles.input}
            placeholder="100"
            value={formData.surface}
            onChangeText={(v) => handleChange('surface', v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>Chambres</Text>
          <TextInput
            style={styles.input}
            placeholder="3"
            value={formData.nb_chambres}
            onChangeText={(v) => handleChange('nb_chambres', v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.thirdInput}>
          <Text style={styles.label}>SdB</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            value={formData.nb_salles_bain}
            onChangeText={(v) => handleChange('nb_salles_bain', v.replace(/\D/g, ''))}
            keyboardType="numeric"
          />
        </View>
      </View>

      {formData.type_transaction === 'LOCATION' && (
        <>
          <Text style={styles.label}>Meublé</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.optionButton, formData.meuble && styles.optionButtonActive]}
              onPress={() => handleChange('meuble', true)}
            >
              <Text style={[styles.optionText, formData.meuble && styles.optionTextActive]}>
                Oui
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, !formData.meuble && styles.optionButtonActive]}
              onPress={() => handleChange('meuble', false)}
            >
              <Text style={[styles.optionText, !formData.meuble && styles.optionTextActive]}>
                Non
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Localisation</Text>

      <Text style={styles.label}>Adresse</Text>
      <TextInput
        style={styles.input}
        placeholder="Numéro et nom de rue"
        value={formData.adresse}
        onChangeText={(v) => handleChange('adresse', v)}
      />

      <Text style={styles.label}>Ville / Région</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionRowHorizontal}>
          {REGIONS.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.optionChip,
                formData.ville === region && styles.optionChipActive,
              ]}
              onPress={() => handleChange('ville', region)}
            >
              <Text
                style={[
                  styles.optionChipText,
                  formData.ville === region && styles.optionChipTextActive,
                ]}
              >
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {formData.ville === 'Conakry' && (
        <>
          <Text style={styles.label}>Commune</Text>
          <View style={styles.optionGrid}>
            {CONAKRY_COMMUNES.map((commune) => (
              <TouchableOpacity
                key={commune}
                style={[
                  styles.optionChip,
                  formData.commune === commune && styles.optionChipActive,
                ]}
                onPress={() => handleChange('commune', commune)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    formData.commune === commune && styles.optionChipTextActive,
                  ]}
                >
                  {commune}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Quartier</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom du quartier"
        value={formData.quartier}
        onChangeText={(v) => handleChange('quartier', v)}
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Photos</Text>
      <Text style={styles.photoHint}>
        Ajoutez jusqu'à 10 photos de votre bien
      </Text>

      <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImages}>
        <Text style={styles.addPhotoIcon}>📷</Text>
        <Text style={styles.addPhotoText}>Ajouter des photos</Text>
      </TouchableOpacity>

      {images.length > 0 && (
        <View style={styles.imagesGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreview}>
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeImageText}>×</Text>
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Principale</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.imageCount}>{images.length}/10 photos</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, step >= s && styles.progressDotActive]}
            />
          ))}
        </View>

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
            onPress={step < 4 ? nextStep : handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.nextButtonText}>
              {isSubmitting ? 'Publication...' : step < 4 ? 'Suivant' : 'Publier'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[200],
  },
  progressDotActive: {
    backgroundColor: COLORS.primary[500],
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionRowHorizontal: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary[500],
  },
  optionText: {
    fontSize: 15,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  optionChipActive: {
    backgroundColor: COLORS.primary[500],
  },
  optionChipText: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  optionChipTextActive: {
    color: '#fff',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary[500],
  },
  periodText: {
    fontSize: 13,
    color: COLORS.gray[600],
  },
  periodTextActive: {
    color: '#fff',
  },
  photoHint: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 16,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 15,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
    position: 'relative',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: COLORS.primary[500],
    borderRadius: 4,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '600',
  },
  imageCount: {
    fontSize: 13,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginTop: 12,
  },
  navigation: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default EditListingScreen;
