import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import Colors, { lightTheme } from '@/constants/Colors';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Form state
  const [nomComplet, setNomComplet] = useState(user?.nom_complet || '');
  const [email, setEmail] = useState(user?.email || '');
  const [adresse, setAdresse] = useState(user?.adresse || '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photo_profil || null);

  useEffect(() => {
    if (user) {
      setNomComplet(user.nom_complet || '');
      setEmail(user.email || '');
      setAdresse(user.adresse || '');
      setPhotoUri(user.photo_profil || null);
    }
  }, [user]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'acces a la galerie photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'acces a la camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir dans la galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!nomComplet.trim()) {
      Alert.alert('Erreur', 'Le nom complet est requis.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nom_complet', nomComplet.trim());

      if (email.trim()) {
        formData.append('email', email.trim());
      }

      if (adresse.trim()) {
        formData.append('adresse', adresse.trim());
      }

      // Add photo if changed
      if (photoUri && photoUri !== user?.photo_profil && !photoUri.startsWith('http')) {
        const filename = photoUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photo_profil', {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      await api.auth.updateProfile(formData);

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert('Succes', 'Votre profil a ete mis a jour.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Update profile error:', error);
      const message = error.response?.data?.message || 'Erreur lors de la mise a jour du profil.';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Modifier le profil',
          headerStyle: { backgroundColor: Colors.background.primary },
          headerShadowVisible: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={showImageOptions} style={styles.photoContainer}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <Text style={styles.photoInitial}>
                    {nomComplet.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.editPhotoButton}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Appuyez pour changer la photo</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Nom complet */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom complet *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nomComplet}
                  onChangeText={setNomComplet}
                  placeholder="Votre nom complet"
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor={Colors.neutral[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Telephone (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telephone</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Ionicons name="call-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputTextDisabled]}
                  value={user?.telephone || ''}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color={Colors.neutral[400]} />
              </View>
              <Text style={styles.helperText}>
                Le numero de telephone ne peut pas etre modifie
              </Text>
            </View>

            {/* Adresse */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color={Colors.neutral[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={adresse}
                  onChangeText={setAdresse}
                  placeholder="Votre adresse"
                  placeholderTextColor={Colors.neutral[400]}
                />
              </View>
            </View>

            {/* Type de compte (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de compte</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Ionicons
                  name={
                    user?.type_compte === 'AGENCE' ? 'business-outline' :
                    user?.type_compte === 'PROFESSIONNEL' ? 'briefcase-outline' : 'person-outline'
                  }
                  size={20}
                  color={Colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.inputTextDisabled]}
                  value={
                    user?.type_compte === 'AGENCE' ? 'Agence immobiliere' :
                    user?.type_compte === 'PROFESSIONNEL' ? 'Professionnel' : 'Particulier'
                  }
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color={Colors.neutral[400]} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoHint: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.neutral[500],
  },
  formSection: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: 14,
  },
  inputDisabled: {
    backgroundColor: Colors.neutral[50],
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary[800],
    paddingVertical: 14,
  },
  inputTextDisabled: {
    color: Colors.neutral[500],
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.neutral[500],
    fontStyle: 'italic',
  },
});
