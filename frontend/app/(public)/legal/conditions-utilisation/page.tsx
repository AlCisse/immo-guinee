'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, Download } from 'lucide-react';

export default function ConditionsUtilisationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/legal"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux informations legales
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Conditions Generales d&apos;Utilisation
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Mise a jour : 26 decembre 2025
                </div>
              </div>
            </div>
            <a
              href="/legal/conditions-utilisation.md"
              download
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Telecharger
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-gray max-w-none">
          {/* Preambule */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">PREAMBULE</h2>
            <p className="text-gray-600 mt-4">
              Les presentes Conditions Generales d&apos;Utilisation (ci-apres &quot;CGU&quot;) regissent l&apos;acces et
              l&apos;utilisation de la plateforme ImmoGuinee, accessible via le site web https://immoguinee.com
              et les applications mobiles associees (ci-apres &quot;la Plateforme&quot;).
            </p>
            <p className="text-gray-600">
              ImmoGuinee est une plateforme numerique de mise en relation entre proprietaires, agences
              immobilieres, promoteurs et locataires/acheteurs potentiels en Republique de Guinee.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600 mb-2"><strong>Editeur :</strong> ImmoGuinee SARL</p>
              <p className="text-sm text-gray-600 mb-2"><strong>Siege social :</strong> Conakry, Republique de Guinee</p>
              <p className="text-sm text-gray-600 mb-2"><strong>Contact :</strong> support@immoguinee.com</p>
              <p className="text-sm text-gray-600"><strong>Telephone :</strong> +224 613 354 420</p>
            </div>
          </section>

          {/* Article 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 1 - DEFINITIONS</h2>
            <ul className="mt-4 space-y-3 text-gray-600">
              <li><strong>Utilisateur :</strong> Toute personne physique ou morale utilisant la Plateforme.</li>
              <li><strong>Compte :</strong> Espace personnel cree par l&apos;Utilisateur pour acceder aux services.</li>
              <li><strong>Annonce :</strong> Publication d&apos;un bien immobilier sur la Plateforme.</li>
              <li><strong>Proprietaire/Bailleur :</strong> Utilisateur proposant un bien a la location ou vente.</li>
              <li><strong>Locataire/Acheteur :</strong> Utilisateur recherchant un bien immobilier.</li>
              <li><strong>Contrat Numerique :</strong> Document contractuel genere et signe electroniquement.</li>
            </ul>
          </section>

          {/* Article 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 2 - CADRE LEGAL</h2>
            <p className="text-gray-600 mt-4">Les presentes CGU sont conformes a :</p>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Legislation guineenne</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>- Loi L/2016/037/AN (cybersecurite)</li>
                  <li>- Code Civil de Guinee</li>
                  <li>- Loi L/2010/AN (obligations civiles)</li>
                  <li>- Decret D/2017 (transactions electroniques)</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Standards internationaux</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>- Directives CEDEAO</li>
                  <li>- Principes RGPD (UE)</li>
                  <li>- Recommandations UIT</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Article 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 3 - ACCES A LA PLATEFORME</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.1 Conditions d&apos;inscription</h3>
            <ul className="text-gray-600 space-y-2">
              <li>- Etre age d&apos;au moins 18 ans ou avoir l&apos;autorisation d&apos;un representant legal</li>
              <li>- Disposer de la capacite juridique de contracter</li>
              <li>- Fournir des informations exactes et completes</li>
              <li>- Disposer d&apos;un numero de telephone mobile valide</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.2 Creation de compte</h3>
            <p className="text-gray-600">L&apos;inscription requiert :</p>
            <ul className="text-gray-600 space-y-2 mt-2">
              <li>- Un numero de telephone mobile (verification par OTP via WhatsApp)</li>
              <li>- Un mot de passe securise (minimum 6 caracteres)</li>
              <li>- Le nom complet de l&apos;Utilisateur</li>
              <li>- Le type de compte : Particulier, Professionnel ou Agence</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.3 Securite du compte</h3>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
              <p className="text-amber-800">
                <strong>Important :</strong> ImmoGuinee propose une authentification a deux facteurs (2FA)
                pour renforcer la securite de votre compte. Nous vous recommandons fortement de l&apos;activer.
              </p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 4 - SERVICES PROPOSES</h2>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Services gratuits</h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>- Consultation des annonces</li>
                  <li>- Recherche et filtrage</li>
                  <li>- Creation de compte</li>
                  <li>- Sauvegarde de favoris</li>
                  <li>- Messagerie securisee</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Services proprietaires</h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li>- Publication d&apos;annonces (5 photos max)</li>
                  <li>- Gestion des visites</li>
                  <li>- Contrats numeriques</li>
                  <li>- Signature electronique</li>
                  <li>- Suivi des transactions</li>
                </ul>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Commissions</h3>
            <p className="text-gray-600">
              ImmoGuinee percoit une commission sur les transactions reussies, variable selon le niveau
              de badge (30% a 50%). Les taux sont communiques avant toute transaction.
            </p>
          </section>

          {/* Article 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 5 - OBLIGATIONS DES UTILISATEURS</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Comportements interdits</h3>
            <div className="bg-red-50 rounded-lg p-4 mt-4">
              <ul className="text-red-800 space-y-2">
                <li>- Publication de fausses annonces ou informations trompeuses</li>
                <li>- Usurpation d&apos;identite</li>
                <li>- Harcelement ou comportements abusifs</li>
                <li>- Collecte de donnees personnelles d&apos;autres Utilisateurs</li>
                <li>- Spam ou messages publicitaires non sollicites</li>
                <li>- Contournement de la Plateforme pour eviter les commissions</li>
                <li>- Partage de numeros de telephone dans les messages</li>
                <li>- Utilisation de scripts ou bots automatises</li>
              </ul>
            </div>
          </section>

          {/* Article 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 6 - MESSAGERIE ET COMMUNICATIONS</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Chiffrement de bout en bout</h3>
            <div className="bg-green-50 rounded-lg p-4 mt-4">
              <p className="text-green-800">
                Les messages contenant des medias (photos, videos, messages vocaux) sont proteges par
                un chiffrement de bout en bout (E2E). Les cles de chiffrement ne sont <strong>jamais
                stockees</strong> sur nos serveurs. Seuls l&apos;expediteur et le destinataire peuvent lire le contenu.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Detection de fraude</h3>
            <p className="text-gray-600">
              Un systeme automatise analyse les messages pour detecter les tentatives de fraude
              (partage de numeros, liens suspects) afin de proteger les Utilisateurs.
            </p>
          </section>

          {/* Article 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 7 - CONTRATS NUMERIQUES</h2>

            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-900 mb-2">Validite juridique</h4>
              <p className="text-blue-800">
                Conformement a la legislation guineenne sur les transactions electroniques,
                les contrats signes via la Plateforme ont la meme valeur juridique que les
                contrats papier signes manuscritement.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Processus de signature</h3>
            <ol className="text-gray-600 space-y-2 list-decimal list-inside">
              <li>Verification de l&apos;identite via OTP (code a usage unique)</li>
              <li>Enregistrement de l&apos;horodatage et de l&apos;adresse IP</li>
              <li>Generation d&apos;un cachet electronique (sceau numerique SHA-256)</li>
              <li>Stockage securise du contrat signe</li>
            </ol>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Conservation</h3>
            <p className="text-gray-600">
              Les contrats sont conserves pendant <strong>10 ans</strong> conformement aux obligations legales.
            </p>
          </section>

          {/* Article 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">ARTICLE 8 - PAIEMENTS</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Modes de paiement acceptes</h3>
            <div className="flex gap-4 mt-4">
              <div className="bg-orange-50 px-4 py-2 rounded-lg">
                <span className="text-orange-800 font-medium">Orange Money</span>
              </div>
              <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                <span className="text-yellow-800 font-medium">MTN Mobile Money</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Systeme d&apos;escrow (sequestre)</h3>
            <p className="text-gray-600">
              Pour securiser les transactions, les depots sont places en sequestre jusqu&apos;a la
              signature du contrat par les deux parties. Les fonds sont liberes uniquement
              apres confirmation des deux parties.
            </p>
          </section>

          {/* Articles 9-16 (resumes) */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">AUTRES DISPOSITIONS</h2>

            <div className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold text-gray-800">Article 9 - Propriete intellectuelle</h3>
                <p className="text-gray-600 mt-2">
                  ImmoGuinee est titulaire de tous les droits de propriete intellectuelle
                  relatifs a la Plateforme.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 10 - Responsabilites</h3>
                <p className="text-gray-600 mt-2">
                  ImmoGuinee agit en qualite d&apos;intermediaire technique et n&apos;est pas partie
                  aux contrats conclus entre Utilisateurs.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 11 - Moderation et sanctions</h3>
                <p className="text-gray-600 mt-2">
                  ImmoGuinee se reserve le droit de supprimer tout contenu non conforme
                  et de suspendre ou cloturer les comptes en cas de violation.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 12 - Donnees personnelles</h3>
                <p className="text-gray-600 mt-2">
                  Le traitement des donnees personnelles est regi par notre{' '}
                  <Link href="/legal/politique-confidentialite" className="text-primary-600 hover:underline">
                    Politique de Confidentialite
                  </Link>.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 13 - Modifications</h3>
                <p className="text-gray-600 mt-2">
                  ImmoGuinee peut modifier les CGU a tout moment. Les Utilisateurs
                  seront informes par notification.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 14 - Resiliation</h3>
                <p className="text-gray-600 mt-2">
                  L&apos;Utilisateur peut supprimer son compte a tout moment depuis les parametres.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Article 15 - Droit applicable</h3>
                <p className="text-gray-600 mt-2">
                  Les CGU sont soumises au droit de la Republique de Guinee.
                  Les tribunaux de Conakry sont competents.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href="mailto:support@immoguinee.com" className="text-primary-600 hover:underline">
                  support@immoguinee.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">WhatsApp</p>
                <a href="https://wa.me/224613354420" className="text-primary-600 hover:underline">
                  +224 613 354 420
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Site web</p>
                <a href="https://immoguinee.com" className="text-primary-600 hover:underline">
                  immoguinee.com
                </a>
              </div>
            </div>
          </section>

          {/* Version */}
          <div className="text-center text-gray-500 text-sm mt-8">
            Version 1.0 - Entree en vigueur : 26 decembre 2025
          </div>
        </div>
      </div>
    </div>
  );
}
