'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Home, Building, Building2, Store, Warehouse, Castle, Check, Trees, LandPlot } from 'lucide-react';

export type TypeBien =
  | 'STUDIO'
  | 'CHAMBRE_SALON'
  | 'APPARTEMENT_2CH'
  | 'APPARTEMENT_3CH'
  | 'VILLA'
  | 'DUPLEX'
  | 'BUREAU'
  | 'MAGASIN'
  | 'ENTREPOT'
  | 'TERRAIN';

interface TypeBienOption {
  value: TypeBien;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'residential' | 'commercial';
  emoji: string;
  color: string;
}

const TYPE_BIEN_OPTIONS: TypeBienOption[] = [
  {
    value: 'STUDIO',
    label: 'Studio',
    description: 'Espace unique avec coin cuisine',
    icon: Home,
    category: 'residential',
    emoji: '🏠',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    value: 'CHAMBRE_SALON',
    label: 'Chambre-Salon',
    description: '1 chambre avec salon',
    icon: Home,
    category: 'residential',
    emoji: '🛋️',
    color: 'from-violet-500 to-purple-500',
  },
  {
    value: 'APPARTEMENT_2CH',
    label: 'Appart. 2CH',
    description: '2 chambres + salon',
    icon: Building,
    category: 'residential',
    emoji: '🏢',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    value: 'APPARTEMENT_3CH',
    label: 'Appart. 3+CH',
    description: '3 chambres ou plus',
    icon: Building,
    category: 'residential',
    emoji: '🏬',
    color: 'from-primary-500 to-orange-500',
  },
  {
    value: 'VILLA',
    label: 'Villa',
    description: 'Maison individuelle',
    icon: Castle,
    category: 'residential',
    emoji: '🏡',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'DUPLEX',
    label: 'Duplex',
    description: 'Sur 2 niveaux',
    icon: Building2,
    category: 'residential',
    emoji: '🏘️',
    color: 'from-amber-500 to-orange-500',
  },
  {
    value: 'BUREAU',
    label: 'Bureau',
    description: 'Espace professionnel',
    icon: Building2,
    category: 'commercial',
    emoji: '🏢',
    color: 'from-slate-500 to-gray-500',
  },
  {
    value: 'MAGASIN',
    label: 'Boutique',
    description: 'Local commercial',
    icon: Store,
    category: 'commercial',
    emoji: '🏪',
    color: 'from-pink-500 to-rose-500',
  },
  {
    value: 'ENTREPOT',
    label: 'Entrepôt',
    description: 'Espace de stockage',
    icon: Warehouse,
    category: 'commercial',
    emoji: '🏭',
    color: 'from-stone-500 to-neutral-500',
  },
  {
    value: 'TERRAIN',
    label: 'Terrain',
    description: 'Terrain à bâtir',
    icon: LandPlot,
    category: 'residential',
    emoji: '🌳',
    color: 'from-green-500 to-emerald-500',
  },
];

interface TypeBienSelectorProps {
  value?: TypeBien;
  onChange: (value: TypeBien) => void;
  error?: string;
  required?: boolean;
}

export default function TypeBienSelector({
  value,
  onChange,
  error,
  required = true,
}: TypeBienSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TypeBien | undefined>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (type: TypeBien) => {
    setSelectedType(type);
    onChange(type);
    setIsOpen(false);
    // Scroll to center the selector in the viewport after selection
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Handle backdrop click - scroll to selector
  const handleBackdropClick = () => {
    setIsOpen(false);
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const selectedOption = TYPE_BIEN_OPTIONS.find(opt => opt.value === selectedType);
  const residentialOptions = TYPE_BIEN_OPTIONS.filter(opt => opt.category === 'residential');
  const commercialOptions = TYPE_BIEN_OPTIONS.filter(opt => opt.category === 'commercial');

  return (
    <div ref={containerRef} className="w-full relative">
      {/* Dropdown Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-4 rounded-xl border-2 text-left flex items-center gap-4
          bg-white dark:bg-dark-card transition-all duration-200
          ${error
            ? 'border-red-500 focus:border-red-600'
            : isOpen
              ? 'border-primary-500 ring-4 ring-primary-500/10 shadow-lg'
              : 'border-neutral-200 dark:border-dark-border hover:border-primary-300 hover:shadow-md'
          }
          focus:outline-none
        `}
      >
        {selectedOption ? (
          <>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedOption.color} flex items-center justify-center shadow-lg`}>
              <span className="text-2xl">{selectedOption.emoji}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-neutral-900 dark:text-white">
                {selectedOption.label}
              </p>
              <p className="text-sm text-neutral-500">
                {selectedOption.description}
              </p>
            </div>
            <Check className="w-5 h-5 text-primary-500" />
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-dark-border flex items-center justify-center">
              <Building2 className="w-6 h-6 text-neutral-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-400">
                Sélectionner le type de bien
              </p>
              <p className="text-sm text-neutral-400">
                Cliquez pour choisir
              </p>
            </div>
          </>
        )}
        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={handleBackdropClick}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-50 w-full mt-2 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-neutral-200 dark:border-dark-border overflow-hidden"
            >
              {/* Residential Section */}
              <div className="p-3">
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <span className="text-lg">🏠</span>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Résidentiel
                  </p>
                </div>
                <div className="space-y-1">
                  {residentialOptions.map(option => {
                    const isSelected = selectedType === option.value;

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        whileHover={{ x: 4 }}
                        onClick={() => handleSelect(option.value)}
                        className={`
                          w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all
                          ${isSelected
                            ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500'
                            : 'hover:bg-neutral-50 dark:hover:bg-dark-bg border-2 border-transparent'
                          }
                        `}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? `bg-gradient-to-br ${option.color}` : 'bg-neutral-100 dark:bg-dark-bg'}`}>
                          <span className="text-xl">{option.emoji}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold text-sm ${isSelected ? 'text-primary-600' : 'text-neutral-900 dark:text-white'}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-neutral-500">{option.description}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="w-5 h-5 text-primary-500" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Commercial Section */}
              <div className="p-3 border-t border-neutral-100 dark:border-dark-border">
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <span className="text-lg">🏢</span>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Commercial
                  </p>
                </div>
                <div className="space-y-1">
                  {commercialOptions.map(option => {
                    const isSelected = selectedType === option.value;

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        whileHover={{ x: 4 }}
                        onClick={() => handleSelect(option.value)}
                        className={`
                          w-full px-3 py-3 rounded-xl flex items-center gap-3 transition-all
                          ${isSelected
                            ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500'
                            : 'hover:bg-neutral-50 dark:hover:bg-dark-bg border-2 border-transparent'
                          }
                        `}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? `bg-gradient-to-br ${option.color}` : 'bg-neutral-100 dark:bg-dark-bg'}`}>
                          <span className="text-xl">{option.emoji}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold text-sm ${isSelected ? 'text-primary-600' : 'text-neutral-900 dark:text-white'}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-neutral-500">{option.description}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="w-5 h-5 text-primary-500" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl flex items-center gap-2"
        >
          <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">!</span>
          {error}
        </motion.p>
      )}
    </div>
  );
}

// Export the options for use in other components
export { TYPE_BIEN_OPTIONS };
