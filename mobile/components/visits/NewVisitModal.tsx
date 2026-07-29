import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Colors, { lightTheme } from '@/constants/Colors';
import { Listing } from '@/types';
import { NewVisitForm, ListingContact } from '@/lib/hooks/useMyVisits';

interface NewVisitModalProps {
  visible: boolean;
  formData: NewVisitForm;
  myListings: Listing[];
  listingContacts: ListingContact[];
  isLoadingListings: boolean;
  isLoadingContacts: boolean;
  showContactsList: boolean;
  showDatePicker: boolean;
  showTimePicker: boolean;
  selectedDate: Date;
  selectedTime: Date;
  isCreating: boolean;
  onClose: () => void;
  onCreate: () => void;
  onFormChange: (updates: Partial<NewVisitForm>) => void;
  onListingChange: (listingId: string) => void;
  onSelectContact: (contact: ListingContact) => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (date: Date | undefined) => void;
  setShowContactsList: (show: boolean) => void;
  setShowDatePicker: (show: boolean) => void;
  setShowTimePicker: (show: boolean) => void;
}

export function NewVisitModal({
  visible,
  formData,
  myListings,
  listingContacts,
  isLoadingListings,
  isLoadingContacts,
  showContactsList,
  showDatePicker,
  showTimePicker,
  selectedDate,
  selectedTime,
  isCreating,
  onClose,
  onCreate,
  onFormChange,
  onListingChange,
  onSelectContact,
  onDateChange,
  onTimeChange,
  setShowContactsList,
  setShowDatePicker,
  setShowTimePicker,
}: NewVisitModalProps) {
  const { t, i18n } = useTranslation();

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatLastMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('visits.today');
    if (diffDays === 1) return t('visits.yesterday');
    if (diffDays < 7) return t('visits.daysAgo', { count: diffDays });
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    onDateChange(date);
  };

  const handleTimePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    onTimeChange(date);
  };

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
          <Text style={styles.modalTitle}>{t('visits.newVisit')}</Text>
          <TouchableOpacity onPress={onCreate} disabled={isCreating}>
            {isCreating ? (
              <ActivityIndicator size="small" color={lightTheme.colors.primary} />
            ) : (
              <Text style={styles.modalSaveText}>{t('visits.create')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Property Selection */}
          <Text style={styles.sectionTitle}>{t('visits.property')}</Text>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{t('visits.selectListing')}</Text>

            {isLoadingListings ? (
              <View style={styles.loadingContacts}>
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                <Text style={styles.loadingContactsText}>{t('common.loading')}</Text>
              </View>
            ) : myListings.length === 0 ? (
              <View style={styles.noContacts}>
                <Ionicons name="home-outline" size={32} color={Colors.neutral[300]} />
                <Text style={styles.noContactsText}>{t('visits.noListing')}</Text>
              </View>
            ) : (
              <View style={styles.propertyList}>
                {myListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    style={[
                      styles.propertyItem,
                      formData.listing_id === listing.id && styles.propertyItemSelected,
                    ]}
                    onPress={() => onListingChange(listing.id)}
                  >
                    {listing.main_photo_url || listing.photo_principale ? (
                      <Image
                        source={{ uri: listing.main_photo_url || listing.photo_principale }}
                        style={styles.propertyItemImage}
                      />
                    ) : (
                      <View style={[styles.propertyItemImage, styles.propertyItemImagePlaceholder]}>
                        <Ionicons name="home-outline" size={20} color={Colors.neutral[400]} />
                      </View>
                    )}
                    <View style={styles.propertyItemInfo}>
                      <Text style={styles.propertyItemTitle} numberOfLines={2}>
                        {listing.titre}
                      </Text>
                      <Text style={styles.propertyItemLocation} numberOfLines={1}>
                        {listing.quartier}, {listing.commune}
                      </Text>
                    </View>
                    {formData.listing_id === listing.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={lightTheme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Client Selection */}
          <Text style={styles.sectionTitle}>{t('visits.client')}</Text>
          <View style={styles.formGroup}>
            <View style={styles.clientLabelRow}>
              <Text style={styles.formLabel}>{t('visits.client')} *</Text>
              {formData.listing_id && (
                <TouchableOpacity onPress={() => setShowContactsList(!showContactsList)}>
                  <Text style={styles.toggleContactsText}>
                    {showContactsList ? t('visits.enterManually') : t('visits.listingContacts')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingContacts && formData.listing_id && (
              <View style={styles.loadingContacts}>
                <ActivityIndicator size="small" color={lightTheme.colors.primary} />
                <Text style={styles.loadingContactsText}>{t('visits.loadingContacts')}</Text>
              </View>
            )}

            {showContactsList && !isLoadingContacts && formData.listing_id ? (
              listingContacts.length > 0 ? (
                <View style={styles.contactsList}>
                  <View style={styles.contactsHeader}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={14}
                      color={lightTheme.colors.primary}
                    />
                    <Text style={styles.contactsHeaderText}>
                      {t('visits.contactsCount', { count: listingContacts.length })}
                    </Text>
                  </View>
                  {listingContacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contactItem}
                      onPress={() => onSelectContact(contact)}
                    >
                      <View style={styles.contactAvatar}>
                        {contact.photo_profil_url ? (
                          <Image
                            source={{ uri: contact.photo_profil_url }}
                            style={styles.contactAvatarImage}
                          />
                        ) : (
                          <Text style={styles.contactAvatarText}>
                            {contact.nom_complet.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.nom_complet}</Text>
                        <View style={styles.contactMeta}>
                          <Text style={styles.contactPhone}>
                            {contact.telephone || t('visits.noPhone')}
                          </Text>
                          {contact.last_message_at && (
                            <>
                              <Text style={styles.contactMetaDot}>•</Text>
                              <Text style={styles.contactDate}>
                                {formatLastMessageTime(contact.last_message_at)}
                              </Text>
                            </>
                          )}
                        </View>
                        {contact.last_message && (
                          <Text style={styles.contactLastMessage} numberOfLines={1}>
                            "{contact.last_message}"
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noContacts}>
                  <Ionicons name="people-outline" size={32} color={Colors.neutral[300]} />
                  <Text style={styles.noContactsText}>{t('visits.noContactsForListing')}</Text>
                  <TouchableOpacity onPress={() => setShowContactsList(false)}>
                    <Text style={styles.noContactsLink}>{t('visits.enterManually')}</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <>
                <TextInput
                  style={styles.formInput}
                  value={formData.client_nom}
                  onChangeText={(text) => onFormChange({ client_nom: text })}
                  placeholder={t('visits.namePlaceholder')}
                  placeholderTextColor={Colors.neutral[400]}
                />
                <View style={[styles.formGroup, { marginTop: 12 }]}>
                  <Text style={styles.formLabel}>{t('visits.phone')} *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.client_telephone}
                    onChangeText={(text) => onFormChange({ client_telephone: text })}
                    placeholder="+224 6XX XX XX XX"
                    placeholderTextColor={Colors.neutral[400]}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
          </View>

          {/* Date & Time */}
          <Text style={styles.sectionTitle}>{t('visits.dateTime')}</Text>
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('visits.date')} *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={lightTheme.colors.primary} />
                <Text
                  style={[
                    styles.datePickerText,
                    !formData.date_visite && styles.datePickerPlaceholder,
                  ]}
                >
                  {formData.date_visite
                    ? formatDisplayDate(formData.date_visite)
                    : t('visits.chooseDate')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>{t('visits.time')} *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={lightTheme.colors.primary} />
                <Text
                  style={[
                    styles.datePickerText,
                    !formData.heure_visite && styles.datePickerPlaceholder,
                  ]}
                >
                  {formData.heure_visite || t('visits.chooseTime')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerHeaderText}>{t('visits.chooseDate')}</Text>
                <TouchableOpacity
                  style={styles.pickerOkButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerOkText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDatePickerChange}
                minimumDate={new Date()}
                locale="fr-FR"
                style={styles.picker}
              />
            </View>
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerHeaderText}>{t('visits.selectTime')}</Text>
                <TouchableOpacity
                  style={styles.pickerOkButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.pickerOkText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimePickerChange}
                is24Hour={true}
                locale="fr-FR"
                style={styles.picker}
              />
            </View>
          )}

          {/* Quick time buttons */}
          <View style={styles.quickTimeButtons}>
            {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.quickTimeButton,
                  formData.heure_visite === time && styles.quickTimeButtonSelected,
                ]}
                onPress={() => onFormChange({ heure_visite: time })}
              >
                <Text
                  style={[
                    styles.quickTimeText,
                    formData.heure_visite === time && styles.quickTimeTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>{t('visits.notesOptional')}</Text>
          <View style={styles.formGroup}>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formData.notes}
              onChangeText={(text) => onFormChange({ notes: text })}
              placeholder={t('visits.additionalInfo')}
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 40 }} />
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
    marginBottom: 12,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 16,
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
    minHeight: 80,
    paddingTop: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingContacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingContactsText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  noContacts: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  noContactsText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  noContactsLink: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  propertyList: {
    gap: 8,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  propertyItemSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: lightTheme.colors.primary + '15',
  },
  propertyItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  propertyItemImagePlaceholder: {
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyItemInfo: {
    flex: 1,
  },
  propertyItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  propertyItemLocation: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  clientLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleContactsText: {
    fontSize: 13,
    color: lightTheme.colors.primary,
    fontWeight: '500',
  },
  contactsList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: lightTheme.colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: lightTheme.colors.primary,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.neutral[500],
  },
  contactMetaDot: {
    fontSize: 13,
    color: Colors.neutral[400],
    marginHorizontal: 6,
  },
  contactDate: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  contactLastMessage: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 10,
  },
  datePickerText: {
    fontSize: 15,
    color: Colors.secondary[800],
    flex: 1,
  },
  datePickerPlaceholder: {
    color: Colors.neutral[400],
  },
  pickerContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  pickerOkButton: {
    backgroundColor: lightTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerOkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  picker: {
    height: 150,
  },
  quickTimeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickTimeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  quickTimeButtonSelected: {
    backgroundColor: lightTheme.colors.primary,
    borderColor: lightTheme.colors.primary,
  },
  quickTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[700],
  },
  quickTimeTextSelected: {
    color: '#fff',
  },
});

export default NewVisitModal;
