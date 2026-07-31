import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';

export interface EditFormData {
  titre: string;
  description: string;
  loyer_mensuel: string;
  caution: string;
  avance: string;
  nombre_chambres: string;
  nombre_salles_bain: string;
  surface_m2: string;
  quartier: string;
  commune: string;
  adresse_complete: string;
  meuble: boolean;
  disponible: boolean;
}

interface EditListingModalProps {
  visible: boolean;
  formData: EditFormData;
  isPending: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (updates: Partial<EditFormData>) => void;
}

export function EditListingModal({
  visible,
  formData,
  isPending,
  onClose,
  onSave,
  onFormChange,
}: EditListingModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.secondary[800]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{t('myListings.editListing')}</Text>
          <TouchableOpacity onPress={onSave} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator size="small" color={lightTheme.colors.primary} />
            ) : (
              <Text style={styles.modalSaveText}>{t('myListings.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Section: Informations générales */}
          <Text style={styles.sectionTitle}>{t('myListings.generalInfo')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('myListings.title')} *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.titre}
              onChangeText={(text) => onFormChange({ titre: text })}
              placeholder={t('myListings.titlePlaceholder')}
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('myListings.description')}</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formData.description}
              onChangeText={(text) => onFormChange({ description: text })}
              placeholder={t('myListings.descriptionPlaceholder')}
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Section: Prix */}
          <Text style={styles.sectionTitle}>{t('myListings.priceConditions')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('myListings.monthlyRent')} *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.loyer_mensuel}
              onChangeText={(text) => onFormChange({ loyer_mensuel: text.replace(/[^0-9]/g, '') })}
              placeholder={t('myListings.rentPlaceholder')}
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.deposit')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.caution}
                onChangeText={(text) => onFormChange({ caution: text.replace(/[^0-9]/g, '') })}
                placeholder="0"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.advance')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.avance}
                onChangeText={(text) => onFormChange({ avance: text.replace(/[^0-9]/g, '') })}
                placeholder="0"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Section: Caractéristiques */}
          <Text style={styles.sectionTitle}>{t('myListings.characteristics')}</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.bedrooms')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.nombre_chambres}
                onChangeText={(text) =>
                  onFormChange({ nombre_chambres: text.replace(/[^0-9]/g, '') })
                }
                placeholder="0"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.bathrooms')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.nombre_salles_bain}
                onChangeText={(text) =>
                  onFormChange({ nombre_salles_bain: text.replace(/[^0-9]/g, '') })
                }
                placeholder="0"
                placeholderTextColor={Colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('myListings.area')}</Text>
            <TextInput
              style={styles.formInput}
              value={formData.surface_m2}
              onChangeText={(text) => onFormChange({ surface_m2: text.replace(/[^0-9]/g, '') })}
              placeholder={t('myListings.areaPlaceholder')}
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>

          {/* Section: Localisation */}
          <Text style={styles.sectionTitle}>{t('myListings.location')}</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.commune')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.commune}
                onChangeText={(text) => onFormChange({ commune: text })}
                placeholder={t('myListings.communePlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('myListings.quartier')}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.quartier}
                onChangeText={(text) => onFormChange({ quartier: text })}
                placeholder={t('myListings.quartierPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('myListings.fullAddress')}</Text>
            <TextInput
              style={styles.formInput}
              value={formData.adresse_complete}
              onChangeText={(text) => onFormChange({ adresse_complete: text })}
              placeholder={t('myListings.addressPlaceholder')}
              placeholderTextColor={Colors.neutral[400]}
            />
          </View>

          {/* Section: Options */}
          <Text style={styles.sectionTitle}>{t('myListings.options')}</Text>

          <View style={styles.formSwitchRow}>
            <View>
              <Text style={styles.formLabel}>{t('myListings.furnished')}</Text>
              <Text style={styles.formHint}>{t('myListings.furnishedHint')}</Text>
            </View>
            <Switch
              value={formData.meuble}
              onValueChange={(value) => onFormChange({ meuble: value })}
              trackColor={{ false: Colors.neutral[300], true: lightTheme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.formSwitchRow}>
            <View>
              <Text style={styles.formLabel}>{t('myListings.available')}</Text>
              <Text style={styles.formHint}>{t('myListings.availableHint')}</Text>
            </View>
            <Switch
              value={formData.disponible}
              onValueChange={(value) => onFormChange({ disponible: value })}
              trackColor={{ false: Colors.neutral[300], true: Colors.success[500] }}
              thumbColor="#fff"
            />
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: lightTheme.colors.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.secondary[800],
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  formHint: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 2,
  },
});

export default EditListingModal;
