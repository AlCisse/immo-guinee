import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { COLORS } from '../constants/config';
import { RootStackParamList } from '../types';
import { requestVisit } from '../services/visits';
import { formatApiError } from '../services/api';

type VisitRouteProp = RouteProp<RootStackParamList, 'VisitBooking'>;

const VisitBookingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VisitRouteProp>();
  const { listingId } = route.params;

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      value: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('fr-FR', { month: 'short' }),
    };
  });

  // Time slots
  const timeSlots = [
    { value: '09:00', label: '09:00 - 10:00' },
    { value: '10:00', label: '10:00 - 11:00' },
    { value: '11:00', label: '11:00 - 12:00' },
    { value: '14:00', label: '14:00 - 15:00' },
    { value: '15:00', label: '15:00 - 16:00' },
    { value: '16:00', label: '16:00 - 17:00' },
    { value: '17:00', label: '17:00 - 18:00' },
  ];

  const handleSubmit = async () => {
    if (!selectedDate) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Erreur', 'Veuillez sélectionner un créneau horaire');
      return;
    }

    setIsSubmitting(true);
    try {
      const endTime = `${parseInt(selectedTime.split(':')[0]) + 1}:00`;
      await requestVisit({
        listing_id: listingId,
        date_visite: selectedDate,
        heure_debut: selectedTime,
        heure_fin: endTime,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Demande envoyée',
        'Votre demande de visite a été envoyée au propriétaire. Vous serez notifié de sa réponse.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erreur', formatApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choisir une date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datesContainer}
            >
              {dates.map((date) => (
                <TouchableOpacity
                  key={date.value}
                  style={[
                    styles.dateCard,
                    selectedDate === date.value && styles.dateCardActive,
                  ]}
                  onPress={() => setSelectedDate(date.value)}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      selectedDate === date.value && styles.dateDayActive,
                    ]}
                  >
                    {date.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateNumber,
                      selectedDate === date.value && styles.dateNumberActive,
                    ]}
                  >
                    {date.date}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      selectedDate === date.value && styles.dateMonthActive,
                    ]}
                  >
                    {date.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choisir un créneau</Text>
            <View style={styles.timeSlotsGrid}>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.value}
                  style={[
                    styles.timeSlot,
                    selectedTime === slot.value && styles.timeSlotActive,
                  ]}
                  onPress={() => setSelectedTime(slot.value)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === slot.value && styles.timeSlotTextActive,
                    ]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ajoutez un message pour le propriétaire..."
              placeholderTextColor={COLORS.gray[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Le propriétaire recevra votre demande et vous contactera pour
              confirmer le rendez-vous.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 14,
  },
  datesContainer: {
    gap: 10,
  },
  dateCard: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    marginRight: 10,
  },
  dateCardActive: {
    backgroundColor: COLORS.primary[500],
  },
  dateDay: {
    fontSize: 12,
    color: COLORS.gray[500],
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dateDayActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  dateNumberActive: {
    color: '#fff',
  },
  dateMonth: {
    fontSize: 12,
    color: COLORS.gray[500],
    textTransform: 'capitalize',
  },
  dateMonthActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.gray[100],
  },
  timeSlotActive: {
    backgroundColor: COLORS.primary[500],
  },
  timeSlotText: {
    fontSize: 14,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  timeSlotTextActive: {
    color: '#fff',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray[900],
    height: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  submitButton: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VisitBookingScreen;
