'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Phone, Search } from 'lucide-react';
import { clsx } from 'clsx';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

// Liste complète des pays (Guinée en premier, puis UE, Amérique du Nord, Golfe, Chine, Afrique)
export const COUNTRIES: Country[] = [
  // Guinée (prioritaire)
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },

  // Union Européenne (27 pays)
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'NL', name: 'Pays-Bas', dialCode: '+31', flag: '🇳🇱' },
  { code: 'AT', name: 'Autriche', dialCode: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Pologne', dialCode: '+48', flag: '🇵🇱' },
  { code: 'SE', name: 'Suède', dialCode: '+46', flag: '🇸🇪' },
  { code: 'DK', name: 'Danemark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlande', dialCode: '+358', flag: '🇫🇮' },
  { code: 'IE', name: 'Irlande', dialCode: '+353', flag: '🇮🇪' },
  { code: 'GR', name: 'Grèce', dialCode: '+30', flag: '🇬🇷' },
  { code: 'CZ', name: 'République tchèque', dialCode: '+420', flag: '🇨🇿' },
  { code: 'RO', name: 'Roumanie', dialCode: '+40', flag: '🇷🇴' },
  { code: 'HU', name: 'Hongrie', dialCode: '+36', flag: '🇭🇺' },
  { code: 'SK', name: 'Slovaquie', dialCode: '+421', flag: '🇸🇰' },
  { code: 'BG', name: 'Bulgarie', dialCode: '+359', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatie', dialCode: '+385', flag: '🇭🇷' },
  { code: 'SI', name: 'Slovénie', dialCode: '+386', flag: '🇸🇮' },
  { code: 'LT', name: 'Lituanie', dialCode: '+370', flag: '🇱🇹' },
  { code: 'LV', name: 'Lettonie', dialCode: '+371', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonie', dialCode: '+372', flag: '🇪🇪' },
  { code: 'CY', name: 'Chypre', dialCode: '+357', flag: '🇨🇾' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
  { code: 'MT', name: 'Malte', dialCode: '+356', flag: '🇲🇹' },

  // Autres pays européens
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'NO', name: 'Norvège', dialCode: '+47', flag: '🇳🇴' },
  { code: 'RU', name: 'Russie', dialCode: '+7', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
  { code: 'TR', name: 'Turquie', dialCode: '+90', flag: '🇹🇷' },

  // Amérique du Nord
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexique', dialCode: '+52', flag: '🇲🇽' },

  // Chine et Asie
  { code: 'CN', name: 'Chine', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japon', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'Corée du Sud', dialCode: '+82', flag: '🇰🇷' },
  { code: 'IN', name: 'Inde', dialCode: '+91', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapour', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaisie', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thaïlande', dialCode: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonésie', dialCode: '+62', flag: '🇮🇩' },

  // Pays du Golfe
  { code: 'AE', name: 'Émirats arabes unis (Dubai)', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Arabie Saoudite', dialCode: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Koweït', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahreïn', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },

  // Autres pays du Moyen-Orient
  { code: 'LB', name: 'Liban', dialCode: '+961', flag: '🇱🇧' },
  { code: 'JO', name: 'Jordanie', dialCode: '+962', flag: '🇯🇴' },
  { code: 'IL', name: 'Israël', dialCode: '+972', flag: '🇮🇱' },
  { code: 'EG', name: 'Égypte', dialCode: '+20', flag: '🇪🇬' },

  // Afrique du Nord
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { code: 'LY', name: 'Libye', dialCode: '+218', flag: '🇱🇾' },

  // Afrique de l'Ouest
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },
  { code: 'GW', name: 'Guinée-Bissau', dialCode: '+245', flag: '🇬🇼' },
  { code: 'GM', name: 'Gambie', dialCode: '+220', flag: '🇬🇲' },
  { code: 'CV', name: 'Cap-Vert', dialCode: '+238', flag: '🇨🇻' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
  { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },

  // Afrique Centrale
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo-Brazzaville', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'CF', name: 'Centrafrique', dialCode: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'GQ', name: 'Guinée équatoriale', dialCode: '+240', flag: '🇬🇶' },

  // Afrique de l'Est et Australe
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Ouganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'ET', name: 'Éthiopie', dialCode: '+251', flag: '🇪🇹' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', flag: '🇿🇦' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'MU', name: 'Maurice', dialCode: '+230', flag: '🇲🇺' },

  // Amérique du Sud
  { code: 'BR', name: 'Brésil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentine', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombie', dialCode: '+57', flag: '🇨🇴' },
  { code: 'CL', name: 'Chili', dialCode: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Pérou', dialCode: '+51', flag: '🇵🇪' },

  // Océanie
  { code: 'AU', name: 'Australie', dialCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'Nouvelle-Zélande', dialCode: '+64', flag: '🇳🇿' },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string, countryCode: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  defaultCountry?: string;
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '621 00 00 00',
  required = false,
  className = '',
  error,
  defaultCountry = 'GN',
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === defaultCountry) || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value prop (to preserve value on error)
  useEffect(() => {
    // Only sync if value is provided and different from internal state
    if (value !== undefined) {
      // Extract just the local number (without country code) if value includes it
      const dialCodeWithoutPlus = selectedCountry.dialCode.replace('+', '');
      if (value.startsWith(dialCodeWithoutPlus)) {
        const localNumber = value.slice(dialCodeWithoutPlus.length);
        if (localNumber !== phoneNumber) {
          setPhoneNumber(localNumber);
        }
      } else if (value !== phoneNumber && value !== dialCodeWithoutPlus + phoneNumber) {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    // Update full number with new country code
    const cleanNumber = phoneNumber.replace(/\s/g, '');
    onChange(country.dialCode.replace('+', '') + cleanNumber, country.code);
    inputRef.current?.focus();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPhoneNumber(newValue);
    // Combine country code with phone number
    const cleanNumber = newValue.replace(/\s/g, '');
    onChange(selectedCountry.dialCode.replace('+', '') + cleanNumber, selectedCountry.code);
  };

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <div className={clsx(
        'flex items-stretch rounded-xl border-2 transition-all overflow-hidden',
        error
          ? 'border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20'
          : 'border-neutral-200 dark:border-dark-border focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20'
      )}>
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-3 bg-neutral-50 dark:bg-dark-hover border-r border-neutral-200 dark:border-dark-border hover:bg-neutral-100 dark:hover:bg-dark-border transition-colors min-w-[120px]"
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown className={clsx(
            'w-4 h-4 text-neutral-400 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Phone Number Input */}
        <div className="flex-1 flex items-center">
          <Phone className="w-4 h-4 text-neutral-400 ml-3" />
          <input
            ref={inputRef}
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            required={required}
            className="flex-1 px-3 py-3 bg-white dark:bg-dark-card text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Country Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card rounded-xl border border-neutral-200 dark:border-dark-border shadow-xl z-50 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-neutral-200 dark:border-dark-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-neutral-900 dark:text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                Aucun pays trouvé
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors text-left',
                    selectedCountry.code === country.code && 'bg-primary-50 dark:bg-primary-500/10'
                  )}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {country.name}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {country.dialCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
