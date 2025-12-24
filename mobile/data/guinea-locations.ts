// Guinea locations data for mobile
export interface Quartier {
  code: string;
  nom: string;
  commune?: string;
}

export interface Region {
  code: string;
  nom: string;
  quartiers: Quartier[];
}

// All Conakry quartiers with their communes
export const CONAKRY_QUARTIERS: Quartier[] = [
  // Commune de Dixinn
  { code: 'CKY-01-01', nom: 'Belle-vue ecole', commune: 'Dixinn' },
  { code: 'CKY-01-02', nom: 'Belle-vue-marche', commune: 'Dixinn' },
  { code: 'CKY-01-03', nom: 'Camayenne', commune: 'Dixinn' },
  { code: 'CKY-01-04', nom: 'Cameroun', commune: 'Dixinn' },
  { code: 'CKY-01-05', nom: 'Dixinn-cite 1', commune: 'Dixinn' },
  { code: 'CKY-01-06', nom: 'Dixinn-cite 2', commune: 'Dixinn' },
  { code: 'CKY-01-07', nom: 'Dixinn-gare', commune: 'Dixinn' },
  { code: 'CKY-01-08', nom: 'Dixinn-gare-rails', commune: 'Dixinn' },
  { code: 'CKY-01-09', nom: 'Dixinn-mosquee', commune: 'Dixinn' },
  { code: 'CKY-01-10', nom: 'Dixinn-port', commune: 'Dixinn' },
  { code: 'CKY-01-11', nom: 'Hafia 1', commune: 'Dixinn' },
  { code: 'CKY-01-12', nom: 'Hafia 2', commune: 'Dixinn' },
  { code: 'CKY-01-13', nom: 'Hafia-miniere', commune: 'Dixinn' },
  { code: 'CKY-01-14', nom: 'Hafia-mosquee', commune: 'Dixinn' },
  { code: 'CKY-01-15', nom: 'Kenien', commune: 'Dixinn' },
  { code: 'CKY-01-16', nom: 'Landreah', commune: 'Dixinn' },
  { code: 'CKY-01-17', nom: 'Miniere-cite', commune: 'Dixinn' },
  // Commune de Kaloum
  { code: 'CKY-01-18', nom: 'Almamya', commune: 'Kaloum' },
  { code: 'CKY-01-19', nom: 'Boulbinet', commune: 'Kaloum' },
  { code: 'CKY-01-20', nom: 'Coronthie', commune: 'Kaloum' },
  { code: 'CKY-01-21', nom: 'Sandervalia', commune: 'Kaloum' },
  { code: 'CKY-01-22', nom: 'Tombo', commune: 'Kaloum' },
  { code: 'CKY-01-23', nom: 'Manquepas', commune: 'Kaloum' },
  { code: 'CKY-01-24', nom: 'Sans-Fil', commune: 'Kaloum' },
  // Commune de Matam
  { code: 'CKY-01-35', nom: 'Matam-Centre', commune: 'Matam' },
  { code: 'CKY-01-36', nom: 'Madina', commune: 'Matam' },
  { code: 'CKY-01-37', nom: 'Hamdallaye', commune: 'Matam' },
  { code: 'CKY-01-38', nom: 'Teminetaye', commune: 'Matam' },
  { code: 'CKY-01-39', nom: 'Bonfie', commune: 'Matam' },
  { code: 'CKY-01-40', nom: 'Coleah', commune: 'Matam' },
  { code: 'CKY-01-41', nom: 'Hermakono', commune: 'Matam' },
  { code: 'CKY-01-42', nom: 'Lanseboudyi', commune: 'Matam' },
  // Commune de Ratoma
  { code: 'RTM-01-01', nom: 'Taouyah', commune: 'Ratoma' },
  { code: 'RTM-01-02', nom: 'Kipe', commune: 'Ratoma' },
  { code: 'RTM-01-03', nom: 'Kipe 2', commune: 'Ratoma' },
  { code: 'RTM-01-04', nom: 'Nongo', commune: 'Ratoma' },
  { code: 'RTM-01-05', nom: 'Dar-es-salam', commune: 'Ratoma' },
  { code: 'RTM-01-06', nom: 'Hamdalaye 1', commune: 'Ratoma' },
  { code: 'RTM-01-07', nom: 'Hamdalaye 2', commune: 'Ratoma' },
  { code: 'RTM-01-08', nom: 'Hamdalaye-mosquee', commune: 'Ratoma' },
  { code: 'RTM-01-09', nom: 'Kaporo-centre', commune: 'Ratoma' },
  { code: 'RTM-01-10', nom: 'Kaporo-rails', commune: 'Ratoma' },
  { code: 'RTM-01-11', nom: 'Koloma 1', commune: 'Ratoma' },
  { code: 'RTM-01-12', nom: 'Koloma 2', commune: 'Ratoma' },
  { code: 'RTM-01-13', nom: 'Ratoma-centre', commune: 'Ratoma' },
  { code: 'RTM-01-14', nom: 'Ratoma-dispensaire', commune: 'Ratoma' },
  { code: 'RTM-01-15', nom: 'Demoudoula', commune: 'Ratoma' },
  { code: 'RTM-01-16', nom: 'Bomboli', commune: 'Ratoma' },
  { code: 'RTM-01-17', nom: 'Simanbossia', commune: 'Ratoma' },
  { code: 'RTM-01-18', nom: 'Dadiya', commune: 'Ratoma' },
  { code: 'RTM-01-19', nom: 'Kakimbo', commune: 'Ratoma' },
  { code: 'RTM-01-20', nom: 'Soloprimo', commune: 'Ratoma' },
  { code: 'RTM-01-21', nom: 'Sonfonia', commune: 'Ratoma' },
  { code: 'RTM-01-22', nom: 'Lambanyi', commune: 'Ratoma' },
  { code: 'RTM-01-23', nom: 'Kobaya', commune: 'Ratoma' },
  // Commune de Matoto
  { code: 'MTT-01-01', nom: 'Beanzin', commune: 'Matoto' },
  { code: 'MTT-01-02', nom: 'Camp Alpha Yaya Diallo', commune: 'Matoto' },
  { code: 'MTT-01-03', nom: 'Dabompa', commune: 'Matoto' },
  { code: 'MTT-01-04', nom: 'Dabondy 1', commune: 'Matoto' },
  { code: 'MTT-01-05', nom: 'Dabondy 2', commune: 'Matoto' },
  { code: 'MTT-01-06', nom: 'Dabondy 3', commune: 'Matoto' },
  { code: 'MTT-01-07', nom: 'Dabondy ecole', commune: 'Matoto' },
  { code: 'MTT-01-08', nom: 'Dabondy-rails', commune: 'Matoto' },
  { code: 'MTT-01-09', nom: 'Dar-es-salam', commune: 'Matoto' },
  { code: 'MTT-01-10', nom: 'Kissosso', commune: 'Matoto' },
  { code: 'MTT-01-11', nom: 'Matoto-centre', commune: 'Matoto' },
  { code: 'MTT-01-12', nom: 'Matoto-marche', commune: 'Matoto' },
  { code: 'MTT-01-13', nom: 'Matoto-Khabitayah', commune: 'Matoto' },
  { code: 'MTT-01-14', nom: 'Sangoya-mosquee', commune: 'Matoto' },
  { code: 'MTT-01-15', nom: 'Simbaya 1', commune: 'Matoto' },
  { code: 'MTT-01-16', nom: 'Simbaya 2', commune: 'Matoto' },
  { code: 'MTT-01-17', nom: 'Tanene-marche', commune: 'Matoto' },
  { code: 'MTT-01-18', nom: 'Tanene-mosquee', commune: 'Matoto' },
  { code: 'MTT-01-19', nom: 'Yimbaya-ecole', commune: 'Matoto' },
  { code: 'MTT-01-20', nom: 'Yimbaya-permanence', commune: 'Matoto' },
  { code: 'MTT-01-21', nom: 'Yimbaya-tannerie', commune: 'Matoto' },
  { code: 'MTT-01-22', nom: 'Cosa', commune: 'Matoto' },
  { code: 'MTT-01-23', nom: 'Enta', commune: 'Matoto' },
  { code: 'MTT-01-24', nom: 'Gbessia', commune: 'Matoto' },
];

// Popular quartiers for quick selection
export const POPULAR_QUARTIERS = [
  'Kipe',
  'Nongo',
  'Lambanyi',
  'Sonfonia',
  'Ratoma-centre',
  'Dar-es-salam',
  'Kaporo-centre',
  'Matam-Centre',
  'Almamya',
  'Dixinn-cite 1',
  'Koloma 1',
  'Yimbaya-ecole',
];

// Get all quartiers as simple list
export function getAllQuartiers(): Quartier[] {
  return CONAKRY_QUARTIERS;
}

// Search quartiers by name
export function searchQuartiers(query: string): Quartier[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return CONAKRY_QUARTIERS.slice(0, 20);

  return CONAKRY_QUARTIERS.filter(q =>
    q.nom.toLowerCase().includes(normalizedQuery) ||
    q.commune?.toLowerCase().includes(normalizedQuery)
  );
}

// Get commune from quartier
export function getCommuneFromQuartier(quartierName: string): string {
  const quartier = CONAKRY_QUARTIERS.find(q => q.nom === quartierName);
  return quartier?.commune || 'Ratoma';
}
