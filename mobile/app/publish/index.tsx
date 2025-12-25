import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Colors, { lightTheme } from '@/constants/Colors';
import {
  OPERATION_TYPES,
  PROPERTY_TYPES,
  AMENITIES,
  OperationType,
  PropertyType,
  requiresSuperficie,
  hasRooms,
  mapPropertyTypeToBackend,
  mapOperationTypeToBackend,
} from '@/data/property-types';
import {
  CONAKRY_QUARTIERS,
  POPULAR_QUARTIERS,
  searchQuartiers,
  getCommuneFromQuartier,
  Quartier,
} from '@/data/guinea-locations';

interface FormData {
  operationType: OperationType | null;
  propertyType: PropertyType | null;
  titre: string;
  description: string;
  prix: string;
  superficie: string;
  nombreChambres: number;
  nombreSallesDeBain: number;
  meuble: boolean;
  quartier: string;
  commune: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
  repereProche: string;
  equipements: string[];
  photos: ImagePicker.ImagePickerAsset[];
  cautionMois: number;
  avanceMois: number;
}

const STEPS = [
  { id: 1, label: 'Type', icon: 'options-outline' },
  { id: 2, label: 'Lieu', icon: 'location-outline' },
  { id: 3, label: 'Details', icon: 'document-text-outline' },
  { id: 4, label: 'Photos', icon: 'camera-outline' },
];

export default function PublishScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [showQuartierModal, setShowQuartierModal] = useState(false);
  const [quartierSearch, setQuartierSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyLandmarks, setNearbyLandmarks] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    operationType: null,
    propertyType: null,
    titre: '',
    description: '',
    prix: '',
    superficie: '',
    nombreChambres: 1,
    nombreSallesDeBain: 1,
    meuble: false,
    quartier: '',
    commune: '',
    adresse: '',
    latitude: null,
    longitude: null,
    repereProche: '',
    equipements: [],
    photos: [],
    cautionMois: 2,
    avanceMois: 1,
  });

  const progressAnim = useRef(new Animated.Value(1)).current;

  // Fetch commissions
  const { data: commissionsData } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      try {
        const response = await api.commissions.list();
        return response.data?.data || {};
      } catch {
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const commissions = commissionsData || {};

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Mutation for creating listing
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formDataToSend = new FormData();

      formDataToSend.append('titre', data.titre);
      formDataToSend.append('description', data.description);
      formDataToSend.append('prix', data.prix.replace(/\s/g, ''));
      formDataToSend.append('type_transaction', mapOperationTypeToBackend(data.operationType!));
      formDataToSend.append('type_propriete', mapPropertyTypeToBackend(data.propertyType!));
      formDataToSend.append('commune', data.commune);
      formDataToSend.append('quartier', data.quartier);

      if (data.superficie) {
        formDataToSend.append('surface_m2', data.superficie);
      }
      if (hasRooms(data.propertyType!)) {
        formDataToSend.append('nombre_chambres', String(data.nombreChambres));
        formDataToSend.append('nombre_salles_bain', String(data.nombreSallesDeBain));
      }
      // Combine adresse and repere for adresse_complete
      const adresseComplete = [data.adresse, data.repereProche].filter(Boolean).join(' - ');
      if (adresseComplete) {
        formDataToSend.append('adresse_complete', adresseComplete);
      }
      if (data.latitude && data.longitude) {
        formDataToSend.append('latitude', String(data.latitude));
        formDataToSend.append('longitude', String(data.longitude));
      }
      if (data.operationType === 'LOCATION') {
        formDataToSend.append('caution_mois', String(data.cautionMois));
        formDataToSend.append('avance_mois', String(data.avanceMois));
        formDataToSend.append('commission_mois', '1'); // Toujours 1 mois
      }
      formDataToSend.append('meuble', data.meuble ? '1' : '0');

      if (data.equipements.length > 0) {
        data.equipements.forEach((eq, i) => {
          formDataToSend.append(`equipements[${i}]`, eq);
        });
      }

      // Add photos
      data.photos.forEach((photo, index) => {
        const uri = photo.uri;
        const filename = uri.split('/').pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formDataToSend.append(`photos[${index}]`, {
          uri,
          name: filename,
          type,
        } as any);
      });

      if (__DEV__) console.log('Submitting form data...');
      return api.listings.create(formDataToSend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      Alert.alert(
        'Succes',
        'Votre annonce a ete creee avec succes!',
        [{ text: 'OK', onPress: () => router.replace('/my-listings') }]
      );
    },
    onError: (error: any) => {
      if (__DEV__) console.log('Publish error:', error.response?.data);
      let message = error.response?.data?.message || 'Une erreur est survenue';

      // Show validation errors if any
      const errors = error.response?.data?.errors;
      if (errors) {
        const errorMessages = Object.values(errors).flat().join('\n');
        message = errorMessages || message;
      }

      Alert.alert('Erreur', message);
    },
  });

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Vous devez etre connecte pour publier une annonce',
        [
          { text: 'Annuler', onPress: () => router.back() },
          { text: 'Se connecter', onPress: () => router.push('/auth/login') },
        ]
      );
    }
  }, [isAuthenticated]);

  // GPS Location detection
  const detectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusee', 'Activez la localisation pour continuer');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const addressStr = [address.street, address.district, address.city]
          .filter(Boolean)
          .join(', ');
        setFormData(prev => ({ ...prev, adresse: addressStr }));
      }

      // Fetch nearby landmarks from OpenStreetMap
      fetchNearbyLandmarks(location.coords.latitude, location.coords.longitude);

    } catch (error) {
      Alert.alert('Erreur', 'Impossible de detecter votre position');
    } finally {
      setIsLocating(false);
    }
  };

  // Fetch nearby landmarks from OpenStreetMap Nominatim
  const fetchNearbyLandmarks = async (lat: number, lon: number) => {
    try {
      const radius = 500; // 500 meters
      const query = `
        [out:json][timeout:10];
        (
          node["amenity"~"mosque|school|hospital|bank|restaurant"](around:${radius},${lat},${lon});
          node["shop"](around:${radius},${lat},${lon});
          way["highway"~"primary|secondary|tertiary"](around:100,${lat},${lon});
        );
        out body 5;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      const data = await response.json();
      const landmarks: string[] = [];

      data.elements?.forEach((el: any) => {
        if (el.tags?.name) {
          const type = el.tags.amenity || el.tags.shop || 'route';
          const typeLabel = getTypeLabel(type);
          landmarks.push(`${typeLabel}: ${el.tags.name}`);
        }
      });

      setNearbyLandmarks(landmarks.slice(0, 5));
    } catch (error) {
      // Silently fail - landmarks are optional
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      mosque: 'Mosquee',
      school: 'Ecole',
      hospital: 'Hopital',
      bank: 'Banque',
      restaurant: 'Restaurant',
      shop: 'Commerce',
      route: 'Route',
    };
    return labels[type] || type;
  };

  // Photo picker
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'acces aux photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...result.assets].slice(0, 10),
      }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'acces a la camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, result.assets[0]].slice(0, 10),
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.operationType || !formData.propertyType) {
          Alert.alert('Erreur', 'Selectionnez le type d\'operation et de bien');
          return false;
        }
        return true;
      case 2:
        if (!formData.quartier) {
          Alert.alert('Erreur', 'Selectionnez un quartier');
          return false;
        }
        return true;
      case 3:
        if (!formData.titre || formData.titre.length < 15) {
          Alert.alert('Erreur', 'Le titre doit contenir au moins 15 caracteres');
          return false;
        }
        if (!formData.description || formData.description.length < 50) {
          Alert.alert('Erreur', 'La description doit contenir au moins 50 caracteres');
          return false;
        }
        if (!formData.prix || parseInt(formData.prix.replace(/\s/g, '')) <= 0) {
          Alert.alert('Erreur', 'Entrez un prix valide');
          return false;
        }
        if (requiresSuperficie(formData.propertyType!) && !formData.superficie) {
          Alert.alert('Erreur', 'La superficie est requise pour un terrain');
          return false;
        }
        return true;
      case 4:
        if (formData.photos.length < 3) {
          Alert.alert('Erreur', 'Ajoutez au moins 3 photos');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        // Submit
        createMutation.mutate(formData);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const selectQuartier = (quartier: Quartier) => {
    setFormData(prev => ({
      ...prev,
      quartier: quartier.nom,
      commune: quartier.commune || getCommuneFromQuartier(quartier.nom),
    }));
    setShowQuartierModal(false);
    setQuartierSearch('');
  };

  const filteredQuartiers = searchQuartiers(quartierSearch);

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Render Step 1: Type selection
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Type d'operation</Text>
      <View style={styles.optionsGrid}>
        {OPERATION_TYPES.map(op => (
          <TouchableOpacity
            key={op.value}
            style={[
              styles.optionCard,
              formData.operationType === op.value && styles.optionCardSelected,
            ]}
            onPress={() => setFormData(prev => ({ ...prev, operationType: op.value }))}
          >
            <Ionicons
              name={op.icon as any}
              size={28}
              color={formData.operationType === op.value ? lightTheme.colors.primary : Colors.neutral[500]}
            />
            <Text style={[
              styles.optionLabel,
              formData.operationType === op.value && styles.optionLabelSelected,
            ]}>
              {op.label}
            </Text>
            <Text style={styles.optionDescription}>{op.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Type de bien</Text>

      <Text style={styles.categoryLabel}>Residentiel</Text>
      <View style={styles.propertyGrid}>
        {PROPERTY_TYPES.filter(p => p.category === 'residential').map(pt => (
          <TouchableOpacity
            key={pt.value}
            style={[
              styles.propertyCard,
              formData.propertyType === pt.value && styles.propertyCardSelected,
            ]}
            onPress={() => setFormData(prev => ({ ...prev, propertyType: pt.value }))}
          >
            <Text style={styles.propertyEmoji}>{pt.emoji}</Text>
            <Text style={[
              styles.propertyLabel,
              formData.propertyType === pt.value && styles.propertyLabelSelected,
            ]}>
              {pt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.categoryLabel}>Commercial</Text>
      <View style={styles.propertyGrid}>
        {PROPERTY_TYPES.filter(p => p.category === 'commercial').map(pt => (
          <TouchableOpacity
            key={pt.value}
            style={[
              styles.propertyCard,
              formData.propertyType === pt.value && styles.propertyCardSelected,
            ]}
            onPress={() => setFormData(prev => ({ ...prev, propertyType: pt.value }))}
          >
            <Text style={styles.propertyEmoji}>{pt.emoji}</Text>
            <Text style={[
              styles.propertyLabel,
              formData.propertyType === pt.value && styles.propertyLabelSelected,
            ]}>
              {pt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render Step 2: Location
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Localisation du bien</Text>
      <Text style={styles.sectionSubtitle}>Indiquez l'emplacement precis de votre propriete</Text>

      {/* Quartier Selection */}
      <Text style={styles.inputLabel}>Quartier *</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowQuartierModal(true)}
      >
        <Ionicons name="location-outline" size={20} color={lightTheme.colors.primary} />
        <Text style={[
          styles.selectButtonText,
          !formData.quartier && styles.selectButtonPlaceholder,
        ]}>
          {formData.quartier || 'Selectionnez un quartier'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.neutral[400]} />
      </TouchableOpacity>

      {formData.commune && (
        <View style={styles.communeTag}>
          <Text style={styles.communeTagText}>Commune: {formData.commune}</Text>
        </View>
      )}

      {/* GPS Detection */}
      <TouchableOpacity
        style={styles.gpsButton}
        onPress={detectLocation}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={lightTheme.colors.primary} />
        ) : (
          <Ionicons name="navigate" size={20} color={lightTheme.colors.primary} />
        )}
        <Text style={styles.gpsButtonText}>
          {isLocating ? 'Detection en cours...' : 'Detecter ma position'}
        </Text>
      </TouchableOpacity>

      {formData.latitude && formData.longitude && (
        <View style={styles.coordinatesBox}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success[500]} />
          <Text style={styles.coordinatesText}>Position detectee</Text>
        </View>
      )}

      {/* Nearby Landmarks */}
      {nearbyLandmarks.length > 0 && (
        <View style={styles.landmarksSection}>
          <Text style={styles.landmarksTitle}>Points de repere a proximite</Text>
          {nearbyLandmarks.map((landmark, index) => (
            <TouchableOpacity
              key={index}
              style={styles.landmarkItem}
              onPress={() => setFormData(prev => ({ ...prev, repereProche: landmark }))}
            >
              <Ionicons
                name={formData.repereProche === landmark ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={lightTheme.colors.primary}
              />
              <Text style={styles.landmarkText}>{landmark}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Manual Address */}
      <Text style={[styles.inputLabel, { marginTop: 20 }]}>Adresse / Description du lieu</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Ex: A 200m de la mosquee centrale, apres le carrefour..."
        value={formData.adresse}
        onChangeText={text => setFormData(prev => ({ ...prev, adresse: text }))}
        multiline
        numberOfLines={3}
        placeholderTextColor={Colors.neutral[400]}
      />

      {/* Repere proche */}
      <Text style={styles.inputLabel}>Repere proche (optionnel)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: En face de la station Total"
        value={formData.repereProche}
        onChangeText={text => setFormData(prev => ({ ...prev, repereProche: text }))}
        placeholderTextColor={Colors.neutral[400]}
      />
    </View>
  );

  // Render Step 3: Details
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Details de l'annonce</Text>

      {/* Title */}
      <Text style={styles.inputLabel}>Titre de l'annonce *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Belle villa moderne a Kipe"
        value={formData.titre}
        onChangeText={text => setFormData(prev => ({ ...prev, titre: text }))}
        maxLength={100}
        placeholderTextColor={Colors.neutral[400]}
      />
      <Text style={styles.charCount}>{formData.titre.length}/100</Text>

      {/* Description */}
      <Text style={styles.inputLabel}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textAreaLarge]}
        placeholder="Decrivez votre bien en detail..."
        value={formData.description}
        onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
        multiline
        numberOfLines={5}
        maxLength={2000}
        placeholderTextColor={Colors.neutral[400]}
      />
      <Text style={styles.charCount}>{formData.description.length}/2000</Text>

      {/* Price */}
      <Text style={styles.inputLabel}>
        Prix {formData.operationType === 'LOCATION' ? '(mensuel)' : formData.operationType === 'LOCATION_COURTE' ? '(par jour)' : ''} *
      </Text>
      <View style={styles.priceInput}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Ex: 2 500 000"
          value={formData.prix}
          onChangeText={text => setFormData(prev => ({ ...prev, prix: formatPrice(text) }))}
          keyboardType="numeric"
          placeholderTextColor={Colors.neutral[400]}
        />
        <Text style={styles.priceUnit}>GNF</Text>
      </View>

      {/* Superficie (for terrain or always shown) */}
      {(requiresSuperficie(formData.propertyType!) || formData.propertyType === 'TERRAIN') && (
        <>
          <Text style={styles.inputLabel}>Superficie *</Text>
          <View style={styles.priceInput}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Ex: 500"
              value={formData.superficie}
              onChangeText={text => setFormData(prev => ({ ...prev, superficie: text.replace(/\D/g, '') }))}
              keyboardType="numeric"
              placeholderTextColor={Colors.neutral[400]}
            />
            <Text style={styles.priceUnit}>m²</Text>
          </View>
        </>
      )}

      {/* Rooms (if applicable) */}
      {formData.propertyType && hasRooms(formData.propertyType) && (
        <>
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Chambres</Text>
              <View style={styles.counterInput}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    nombreChambres: Math.max(1, prev.nombreChambres - 1),
                  }))}
                >
                  <Ionicons name="remove" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.nombreChambres}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    nombreChambres: prev.nombreChambres + 1,
                  }))}
                >
                  <Ionicons name="add" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Salles de bain</Text>
              <View style={styles.counterInput}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    nombreSallesDeBain: Math.max(1, prev.nombreSallesDeBain - 1),
                  }))}
                >
                  <Ionicons name="remove" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.nombreSallesDeBain}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    nombreSallesDeBain: prev.nombreSallesDeBain + 1,
                  }))}
                >
                  <Ionicons name="add" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Furnished */}
      <TouchableOpacity
        style={styles.switchRow}
        onPress={() => setFormData(prev => ({ ...prev, meuble: !prev.meuble }))}
      >
        <Text style={styles.switchLabel}>Meuble</Text>
        <View style={[styles.switchTrack, formData.meuble && styles.switchTrackActive]}>
          <View style={[styles.switchThumb, formData.meuble && styles.switchThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Caution & Avance for LOCATION */}
      {formData.operationType === 'LOCATION' && (
        <>
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Caution (mois)</Text>
              <View style={styles.counterInput}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    cautionMois: Math.max(1, prev.cautionMois - 1),
                  }))}
                >
                  <Ionicons name="remove" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.cautionMois}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    cautionMois: Math.min(6, prev.cautionMois + 1),
                  }))}
                >
                  <Ionicons name="add" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Avance (mois)</Text>
              <View style={styles.counterInput}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    avanceMois: Math.max(1, prev.avanceMois - 1),
                  }))}
                >
                  <Ionicons name="remove" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.avanceMois}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    avanceMois: Math.min(12, prev.avanceMois + 1),
                  }))}
                >
                  <Ionicons name="add" size={20} color={Colors.neutral[600]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Commission Info - Display based on operation type */}
      {formData.operationType && (
        <View style={styles.commissionInfoBox}>
          <View style={styles.commissionIconContainer}>
            <Ionicons name="information-circle" size={20} color={lightTheme.colors.primary} />
          </View>
          <View style={styles.commissionTextContainer}>
            <Text style={styles.commissionLabel}>Commission ImmoGuinee</Text>
            <Text style={styles.commissionValue}>
              {formData.operationType === 'LOCATION' && (
                `${commissions?.location?.mois || 1} mois de loyer`
              )}
              {formData.operationType === 'LOCATION_COURTE' && (
                `${commissions?.location_courte?.taux_pourcentage || 10}% du montant`
              )}
              {formData.operationType === 'VENTE' && (
                `${commissions?.vente?.taux_pourcentage || 3}% du prix de vente`
              )}
            </Text>
            <Text style={styles.commissionNote}>
              Payable uniquement apres conclusion de la transaction
            </Text>
          </View>
        </View>
      )}

      {/* Amenities */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Equipements</Text>
      <View style={styles.amenitiesGrid}>
        {AMENITIES.map(amenity => (
          <TouchableOpacity
            key={amenity.id}
            style={[
              styles.amenityChip,
              formData.equipements.includes(amenity.backendKey) && styles.amenityChipSelected,
            ]}
            onPress={() => {
              setFormData(prev => ({
                ...prev,
                equipements: prev.equipements.includes(amenity.backendKey)
                  ? prev.equipements.filter(e => e !== amenity.backendKey)
                  : [...prev.equipements, amenity.backendKey],
              }));
            }}
          >
            <Ionicons
              name={amenity.icon as any}
              size={16}
              color={formData.equipements.includes(amenity.backendKey) ? '#fff' : Colors.neutral[600]}
            />
            <Text style={[
              styles.amenityChipText,
              formData.equipements.includes(amenity.backendKey) && styles.amenityChipTextSelected,
            ]}>
              {amenity.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render Step 4: Photos
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Photos</Text>
      <Text style={styles.sectionSubtitle}>Ajoutez au moins 3 photos de votre bien</Text>

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoActionButton} onPress={pickImages}>
          <Ionicons name="images-outline" size={24} color={lightTheme.colors.primary} />
          <Text style={styles.photoActionText}>Galerie</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoActionButton} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={24} color={lightTheme.colors.primary} />
          <Text style={styles.photoActionText}>Camera</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.photoCount}>
        {formData.photos.length}/10 photos {formData.photos.length < 3 && '(minimum 3)'}
      </Text>

      <View style={styles.photosGrid}>
        {formData.photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            <TouchableOpacity
              style={styles.photoRemoveButton}
              onPress={() => removePhoto(index)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.mainPhotoBadge}>
                <Text style={styles.mainPhotoBadgeText}>Principale</Text>
              </View>
            )}
          </View>
        ))}
        {formData.photos.length < 10 && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
            <Ionicons name="add" size={32} color={Colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Publier une annonce',
          headerTitle: 'Publier une annonce',
          headerBackVisible: false,
          headerStyle: { backgroundColor: Colors.background.primary },
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {STEPS.map((step, index) => (
            <View key={step.id} style={styles.stepIndicator}>
              <View style={[
                styles.stepCircle,
                currentStep >= step.id && styles.stepCircleActive,
                currentStep > step.id && styles.stepCircleCompleted,
              ]}>
                {currentStep > step.id ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Ionicons
                    name={step.icon as any}
                    size={16}
                    color={currentStep >= step.id ? '#fff' : Colors.neutral[400]}
                  />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                currentStep >= step.id && styles.stepLabelActive,
              ]}>
                {step.label}
              </Text>
              {index < STEPS.length - 1 && (
                <View style={[
                  styles.stepLine,
                  currentStep > step.id && styles.stepLineActive,
                ]} />
              )}
            </View>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
              <Ionicons name="arrow-back" size={20} color={Colors.secondary[800]} />
              <Text style={styles.prevButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
            onPress={nextStep}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? 'Publier' : 'Continuer'}
                </Text>
                {currentStep < 4 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Quartier Selection Modal */}
      <Modal
        visible={showQuartierModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selectionnez un quartier</Text>
            <TouchableOpacity onPress={() => setShowQuartierModal(false)}>
              <Ionicons name="close" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un quartier..."
              value={quartierSearch}
              onChangeText={setQuartierSearch}
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          {!quartierSearch && (
            <View style={styles.popularSection}>
              <Text style={styles.popularTitle}>Quartiers populaires</Text>
              <View style={styles.popularGrid}>
                {POPULAR_QUARTIERS.map(name => (
                  <TouchableOpacity
                    key={name}
                    style={styles.popularChip}
                    onPress={() => {
                      const q = CONAKRY_QUARTIERS.find(q => q.nom === name);
                      if (q) selectQuartier(q);
                    }}
                  >
                    <Text style={styles.popularChipText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <FlatList
            data={filteredQuartiers}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quartierItem}
                onPress={() => selectQuartier(item)}
              >
                <View>
                  <Text style={styles.quartierName}>{item.nom}</Text>
                  <Text style={styles.quartierCommune}>{item.commune}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral[300]} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun quartier trouve</Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: lightTheme.colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.success[500],
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.neutral[400],
    marginTop: 4,
  },
  stepLabelActive: {
    color: lightTheme.colors.primary,
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    right: -20,
    width: 40,
    height: 2,
    backgroundColor: Colors.neutral[200],
  },
  stepLineActive: {
    backgroundColor: Colors.success[500],
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: -12,
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  optionCardSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: Colors.primary[50],
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginTop: 8,
  },
  optionLabelSelected: {
    color: lightTheme.colors.primary,
  },
  optionDescription: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginTop: 16,
    marginBottom: 12,
  },
  propertyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  propertyCard: {
    width: '30%',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  propertyCardSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: Colors.primary[50],
  },
  propertyEmoji: {
    fontSize: 24,
  },
  propertyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginTop: 6,
    textAlign: 'center',
  },
  propertyLabelSelected: {
    color: lightTheme.colors.primary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.neutral[400],
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },
  selectButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 10,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  selectButtonPlaceholder: {
    color: Colors.neutral[400],
  },
  communeTag: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  communeTagText: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '500',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  coordinatesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.success[50],
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 13,
    color: Colors.success[700],
    fontWeight: '500',
  },
  landmarksSection: {
    marginTop: 20,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 16,
  },
  landmarksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginBottom: 12,
  },
  landmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  landmarkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.secondary[700],
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  priceUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[500],
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  counterButton: {
    padding: 14,
  },
  counterValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral[300],
    justifyContent: 'center',
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: lightTheme.colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  amenityChipSelected: {
    backgroundColor: lightTheme.colors.primary,
    borderColor: lightTheme.colors.primary,
  },
  amenityChipText: {
    fontSize: 13,
    color: Colors.neutral[600],
  },
  amenityChipTextSelected: {
    color: '#fff',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary[50],
    padding: 16,
    borderRadius: 12,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  photoCount: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mainPhotoBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  addPhotoButton: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  bottomPadding: {
    height: 100,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  prevButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  popularSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: 12,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularChip: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  popularChipText: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '500',
  },
  quartierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  quartierName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  quartierCommune: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: Colors.neutral[500],
  },
  commissionInfoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: lightTheme.colors.primary,
  },
  commissionIconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  commissionTextContainer: {
    flex: 1,
  },
  commissionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginBottom: 4,
  },
  commissionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.colors.primary,
    marginBottom: 4,
  },
  commissionNote: {
    fontSize: 12,
    color: Colors.neutral[500],
    fontStyle: 'italic',
  },
});
