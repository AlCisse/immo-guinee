import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors, { lightTheme } from '@/constants/Colors';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  // Afrique de l'Ouest
  { code: 'GN', name: 'Guinee', dialCode: '+224', flag: '🇬🇳' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'CI', name: 'Cote d\'Ivoire', dialCode: '+225', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Benin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },
  { code: 'GM', name: 'Gambie', dialCode: '+220', flag: '🇬🇲' },
  { code: 'GW', name: 'Guinee-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
  { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'CV', name: 'Cap-Vert', dialCode: '+238', flag: '🇨🇻' },
  // Afrique Centrale
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'CF', name: 'Centrafrique', dialCode: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'GQ', name: 'Guinee Equatoriale', dialCode: '+240', flag: '🇬🇶' },
  // Afrique du Nord
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algerie', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { code: 'EG', name: 'Egypte', dialCode: '+20', flag: '🇪🇬' },
  { code: 'LY', name: 'Libye', dialCode: '+218', flag: '🇱🇾' },
  // Amerique du Nord
  { code: 'US', name: 'Etats-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  // Europe
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas', dialCode: '+31', flag: '🇳🇱' },
  { code: 'AT', name: 'Autriche', dialCode: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Pologne', dialCode: '+48', flag: '🇵🇱' },
  { code: 'CZ', name: 'Tchequie', dialCode: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovaquie', dialCode: '+421', flag: '🇸🇰' },
  { code: 'HU', name: 'Hongrie', dialCode: '+36', flag: '🇭🇺' },
  { code: 'RO', name: 'Roumanie', dialCode: '+40', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgarie', dialCode: '+359', flag: '🇧🇬' },
  { code: 'GR', name: 'Grece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'SE', name: 'Suede', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norvege', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Danemark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlande', dialCode: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Irlande', dialCode: '+353', flag: '🇮🇪' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
  { code: 'MC', name: 'Monaco', dialCode: '+377', flag: '🇲🇨' },
  { code: 'MT', name: 'Malte', dialCode: '+356', flag: '🇲🇹' },
  { code: 'CY', name: 'Chypre', dialCode: '+357', flag: '🇨🇾' },
  { code: 'SI', name: 'Slovenie', dialCode: '+386', flag: '🇸🇮' },
  { code: 'HR', name: 'Croatie', dialCode: '+385', flag: '🇭🇷' },
  { code: 'RS', name: 'Serbie', dialCode: '+381', flag: '🇷🇸' },
  { code: 'BA', name: 'Bosnie', dialCode: '+387', flag: '🇧🇦' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪' },
  { code: 'MK', name: 'Macedoine', dialCode: '+389', flag: '🇲🇰' },
  { code: 'AL', name: 'Albanie', dialCode: '+355', flag: '🇦🇱' },
  { code: 'EE', name: 'Estonie', dialCode: '+372', flag: '🇪🇪' },
  { code: 'LV', name: 'Lettonie', dialCode: '+371', flag: '🇱🇻' },
  { code: 'LT', name: 'Lituanie', dialCode: '+370', flag: '🇱🇹' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
  { code: 'BY', name: 'Bielorussie', dialCode: '+375', flag: '🇧🇾' },
  { code: 'MD', name: 'Moldavie', dialCode: '+373', flag: '🇲🇩' },
  { code: 'RU', name: 'Russie', dialCode: '+7', flag: '🇷🇺' },
  { code: 'IS', name: 'Islande', dialCode: '+354', flag: '🇮🇸' },
  { code: 'AD', name: 'Andorre', dialCode: '+376', flag: '🇦🇩' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
  { code: 'SM', name: 'Saint-Marin', dialCode: '+378', flag: '🇸🇲' },
  { code: 'VA', name: 'Vatican', dialCode: '+379', flag: '🇻🇦' },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onChangeCountry?: (country: Country) => void;
  placeholder?: string;
  defaultCountryCode?: string;
}

export default function PhoneInput({
  value,
  onChangeText,
  onChangeCountry,
  placeholder = '6XX XXX XXX',
  defaultCountryCode = 'GN',
}: PhoneInputProps) {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === defaultCountryCode) || COUNTRIES[0]
  );

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    onChangeCountry?.(country);
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        item.code === selectedCountry.code && styles.countryItemSelected,
      ]}
      onPress={() => handleSelectCountry(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryDialCode}>{item.dialCode}</Text>
      {item.code === selectedCountry.code && (
        <Ionicons name="checkmark" size={20} color={lightTheme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.neutral[500]} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          keyboardType="phone-pad"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
        />
      </View>

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un pays</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowCountryPicker(false)}
            >
              <Ionicons name="close" size={24} color={Colors.secondary[800]} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            contentContainerStyle={styles.countryList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}

export { COUNTRIES, Country };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    borderRadius: 14,
    backgroundColor: Colors.neutral[50],
    overflow: 'hidden',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: Colors.neutral[100],
    borderRightWidth: 1,
    borderRightColor: Colors.border.light,
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    fontSize: 15,
    color: Colors.secondary[800],
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: Colors.secondary[800],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryList: {
    padding: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  countryItemSelected: {
    backgroundColor: Colors.primary[50],
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: Colors.secondary[800],
    fontWeight: '500',
  },
  countryDialCode: {
    fontSize: 14,
    color: Colors.neutral[500],
    fontWeight: '500',
  },
});
