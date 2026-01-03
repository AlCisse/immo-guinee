import { Metadata } from 'next';
import Link from 'next/link';
import {
  Calendar,
  Home,
  Wifi,
  Shield,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  Briefcase,
  Plane,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Location Courte Durée à Conakry | Appartements Meublés | ImmoGuinée',
  description:
    'Trouvez votre logement meublé pour séjour court à Conakry. Appartements, villas et studios équipés pour expatriés, voyageurs d\'affaires et touristes. Réservation flexible dès 1 jour.',
  keywords: [
    'location courte durée Conakry',
    'appartement meublé Guinée',
    'location meublée Conakry',
    'court séjour Conakry',
    'airbnb Conakry',
    'logement temporaire Guinée',
    'villa meublée Conakry',
    'studio meublé Conakry',
    'expatrié Guinée logement',
    'hébergement Conakry',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/location-courte-duree',
  },
  openGraph: {
    title: 'Location Courte Durée à Conakry | Appartements Meublés',
    description:
      'Appartements et villas meublés pour séjours courts à Conakry. Idéal pour expatriés, voyageurs d\'affaires et touristes.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/location-courte-duree',
    siteName: 'ImmoGuinée',
    images: [
      {
        url: 'https://immoguinee.com/images/og-location-courte.jpg',
        width: 1200,
        height: 630,
        alt: 'Location courte durée à Conakry - Appartements meublés',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Location Courte Durée à Conakry | ImmoGuinée',
    description: 'Appartements meublés pour séjours courts à Conakry',
  },
};

const features = [
  {
    icon: Home,
    title: 'Entièrement meublé',
    description: 'Appartements équipés avec tout le nécessaire : cuisine, literie, électroménager',
  },
  {
    icon: Wifi,
    title: 'Wifi & Connexion',
    description: 'Internet haut débit inclus pour travailler ou rester connecté',
  },
  {
    icon: Shield,
    title: 'Sécurité 24h/24',
    description: 'Gardien, clôture et système de sécurité pour votre tranquillité',
  },
  {
    icon: Clock,
    title: 'Flexibilité totale',
    description: 'Réservation à partir de 1 jour, 1 semaine ou 1 mois selon vos besoins',
  },
];

const targetAudiences = [
  {
    icon: Briefcase,
    title: 'Professionnels en mission',
    description: 'Idéal pour les missions de courte durée à Conakry',
  },
  {
    icon: Plane,
    title: 'Expatriés & Voyageurs',
    description: 'Solution temporaire en attendant un logement permanent',
  },
  {
    icon: Users,
    title: 'Familles en visite',
    description: 'Espace confortable pour accueillir famille et amis',
  },
];

const communes = [
  { name: 'Kaloum', description: 'Centre-ville, proche des ministères et ambassades' },
  { name: 'Dixinn', description: 'Quartier résidentiel, université et hôpitaux' },
  { name: 'Ratoma', description: 'Kipé, Nongo - quartiers modernes et commerces' },
  { name: 'Matam', description: 'Madina, proche du centre et bien desservi' },
  { name: 'Matoto', description: 'Proche aéroport, idéal pour courts séjours' },
];

export default function LocationCourteDureePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-dark-bg dark:to-dark-card">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 dark:from-purple-900/20 dark:to-pink-900/20" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Location meublée flexible
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-6">
              Location{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                Courte Durée
              </span>
              <br />à Conakry
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8">
              Appartements et villas meublés pour vos séjours temporaires en Guinée.
              Réservation flexible dès 1 jour. Équipés, sécurisés, prêts à vivre.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/recherche?type_transaction=LOCATION_COURTE"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30"
              >
                Voir les annonces
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/publier"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-dark-card text-neutral-900 dark:text-white font-semibold rounded-xl border-2 border-neutral-200 dark:border-dark-border hover:border-purple-300 transition-all"
              >
                Publier une annonce
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-12">
            Pourquoi choisir la location courte durée ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-soft border border-neutral-100 dark:border-dark-border"
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-16 px-4 bg-neutral-50 dark:bg-dark-bg">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-4">
            Pour qui ?
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto">
            Nos logements meublés s'adaptent à tous les profils et durées de séjour
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {targetAudiences.map((audience) => (
              <div key={audience.title} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  <audience.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  {audience.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Communes Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-4">
            Trouvez par quartier
          </h2>
          <p className="text-center text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto">
            Explorez nos locations courte durée dans les principales communes de Conakry
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communes.map((commune) => (
              <Link
                key={commune.name}
                href={`/recherche?type_transaction=LOCATION_COURTE&commune=${commune.name}`}
                className="group flex items-start gap-4 p-5 bg-white dark:bg-dark-card rounded-xl border border-neutral-200 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-lg transition-all"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30 transition-colors">
                  <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {commune.name}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {commune.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-center text-white shadow-2xl shadow-purple-500/30">
            <Calendar className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à réserver ?
            </h2>
            <p className="text-lg text-purple-100 mb-8 max-w-xl mx-auto">
              Parcourez nos annonces de location courte durée et trouvez le logement idéal pour votre séjour à Conakry.
            </p>
            <Link
              href="/recherche?type_transaction=LOCATION_COURTE"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all"
            >
              Explorer les annonces
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 px-4 bg-neutral-50 dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto prose prose-neutral dark:prose-invert">
          <h2>Location courte durée à Conakry : Guide complet</h2>
          <p>
            La <strong>location courte durée à Conakry</strong> est la solution idéale pour les voyageurs,
            expatriés et professionnels en mission en Guinée. Contrairement aux hôtels, nos{' '}
            <strong>appartements meublés</strong> offrent plus d'espace, d'intimité et de flexibilité.
          </p>

          <h3>Avantages de la location meublée</h3>
          <ul>
            <li>
              <strong>Économique</strong> : Moins cher qu'un hôtel pour les séjours de plus de quelques jours
            </li>
            <li>
              <strong>Confortable</strong> : Cuisine équipée, espace de vie, chambre séparée
            </li>
            <li>
              <strong>Flexible</strong> : Du 1 jour au 1 an, adaptez la durée à vos besoins
            </li>
            <li>
              <strong>Pratique</strong> : Wifi, climatisation, groupe électrogène souvent inclus
            </li>
          </ul>

          <h3>Quartiers populaires pour la courte durée</h3>
          <p>
            Les quartiers les plus demandés pour la <strong>location courte durée à Conakry</strong> sont
            Kipé et Nongo (Ratoma), proches des commerces modernes, Kaloum pour les affaires, et
            Matoto pour la proximité de l'aéroport.
          </p>

          <h3>Comment réserver ?</h3>
          <p>
            Sur ImmoGuinée, contactez directement les propriétaires. Vérifiez les équipements,
            négociez le tarif pour les séjours prolongés, et convenez des modalités de paiement.
          </p>
        </div>
      </section>
    </div>
  );
}
