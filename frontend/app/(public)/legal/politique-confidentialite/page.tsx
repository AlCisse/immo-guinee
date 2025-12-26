'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Calendar, Download, Lock, Eye, Trash2, FileDown, Ban, Clock } from 'lucide-react';

export default function PolitiqueConfidentialitePage() {
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
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Politique de Confidentialite
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Mise a jour : 26 decembre 2025
                </div>
              </div>
            </div>
            <a
              href="/legal/politique-confidentialite.md"
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

          {/* Introduction */}
          <section className="mb-12">
            <div className="bg-green-50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-green-900 mb-4">Notre engagement</h2>
              <p className="text-green-800">
                ImmoGuinee s&apos;engage a proteger la vie privee de ses Utilisateurs et a traiter
                leurs donnees personnelles avec le plus grand soin, conformement a la
                legislation guineenne (Loi L/2016/037/AN), aux directives de la CEDEAO,
                et aux standards internationaux (RGPD).
              </p>
            </div>
          </section>

          {/* Responsable du traitement */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">1. RESPONSABLE DU TRAITEMENT</h2>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-gray-700 mb-2"><strong>ImmoGuinee SARL</strong></p>
              <p className="text-gray-600 mb-1">Siege social : Conakry, Republique de Guinee</p>
              <p className="text-gray-600 mb-1">Email : privacy@immoguinee.com</p>
              <p className="text-gray-600 mb-1">DPO : dpo@immoguinee.com</p>
              <p className="text-gray-600">Telephone : +224 613 354 420</p>
            </div>
          </section>

          {/* Donnees collectees */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">2. DONNEES COLLECTEES</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.1 Donnees d&apos;identification</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-medium">Donnee</th>
                    <th className="text-left p-3 font-medium">Finalite</th>
                    <th className="text-left p-3 font-medium">Base legale</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-3">Nom complet</td><td className="p-3">Identification, contrats</td><td className="p-3">Execution du contrat</td></tr>
                  <tr><td className="p-3">Telephone</td><td className="p-3">Authentification, communication</td><td className="p-3">Execution du contrat</td></tr>
                  <tr><td className="p-3">Email</td><td className="p-3">Communication, notifications</td><td className="p-3">Consentement</td></tr>
                  <tr><td className="p-3">Photo de profil</td><td className="p-3">Personnalisation</td><td className="p-3">Consentement</td></tr>
                  <tr><td className="p-3">Adresse</td><td className="p-3">Contrats, livraison</td><td className="p-3">Execution du contrat</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.2 Documents d&apos;identite</h3>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
              <p className="text-amber-800">
                <strong>Protection renforcee :</strong> Vos documents (CNI, Titre Foncier, RCCM)
                sont stockes de maniere <strong>chiffree (AES-256-GCM)</strong> et hashes pour
                verification d&apos;integrite. Seul le personnel autorise y a acces.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.3 Donnees de communication</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Conservation serveur</th>
                    <th className="text-left p-3 font-medium">Protection</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-3">Messages texte</td><td className="p-3">Duree du compte</td><td className="p-3">Chiffrement transit</td></tr>
                  <tr><td className="p-3">Messages vocaux</td><td className="p-3 text-green-600 font-medium">5 jours seulement</td><td className="p-3">E2E (cle jamais stockee)</td></tr>
                  <tr><td className="p-3">Photos/Videos</td><td className="p-3 text-green-600 font-medium">5 jours seulement</td><td className="p-3">E2E (cle jamais stockee)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Mesures de securite */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">3. MESURES DE SECURITE</h2>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Chiffrement
                </h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li><strong>Transit :</strong> TLS 1.3 / HTTPS</li>
                  <li><strong>Stockage :</strong> AES-256-GCM</li>
                  <li><strong>Mots de passe :</strong> Bcrypt (12 rounds)</li>
                  <li><strong>Medias E2E :</strong> AES-256-GCM</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Authentification
                </h4>
                <ul className="text-sm text-purple-800 space-y-2">
                  <li><strong>OTP :</strong> Verification WhatsApp</li>
                  <li><strong>2FA :</strong> Disponible pour tous</li>
                  <li><strong>Tokens :</strong> Expiration 24h</li>
                  <li><strong>Sessions :</strong> Expiration 2h inactivite</li>
                </ul>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-3">Protection attaques</h4>
                <ul className="text-sm text-red-800 space-y-2">
                  <li><strong>SQL Injection :</strong> Requetes preparees</li>
                  <li><strong>XSS :</strong> Sanitisation, CSP</li>
                  <li><strong>CSRF :</strong> Tokens de protection</li>
                  <li><strong>Brute force :</strong> Limitation tentatives</li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-3">Rate Limiting</h4>
                <ul className="text-sm text-orange-800 space-y-2">
                  <li><strong>Connexion :</strong> 5/minute</li>
                  <li><strong>Inscription :</strong> 3/minute</li>
                  <li><strong>OTP :</strong> 3/minute</li>
                  <li><strong>Paiement :</strong> 10/heure</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-50 border rounded-lg p-6 mt-6">
              <h4 className="font-bold text-green-900 mb-3">Chiffrement de bout en bout (E2E)</h4>
              <p className="text-green-800 mb-4">
                Pour les medias (photos, videos, messages vocaux) :
              </p>
              <ul className="text-green-800 space-y-2">
                <li>- Les cles de chiffrement sont generees sur <strong>votre appareil</strong></li>
                <li>- Les cles ne sont <strong>JAMAIS stockees</strong> sur nos serveurs</li>
                <li>- Seuls vous et le destinataire pouvez dechiffrer le contenu</li>
                <li>- Les medias sont supprimes du serveur apres 5 jours</li>
              </ul>
            </div>
          </section>

          {/* Partage des donnees */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">4. PARTAGE DES DONNEES</h2>

            <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">Prestataires techniques</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-medium">Prestataire</th>
                    <th className="text-left p-3 font-medium">Finalite</th>
                    <th className="text-left p-3 font-medium">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-3">DigitalOcean</td><td className="p-3">Hebergement fichiers</td><td className="p-3">UE (Francfort)</td></tr>
                  <tr><td className="p-3">Orange Money</td><td className="p-3">Paiements</td><td className="p-3">Guinee</td></tr>
                  <tr><td className="p-3">MTN Mobile Money</td><td className="p-3">Paiements</td><td className="p-3">Guinee</td></tr>
                  <tr><td className="p-3">Sentry</td><td className="p-3">Monitoring (sans PII)</td><td className="p-3">UE</td></tr>
                </tbody>
              </table>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
              <h4 className="font-semibold text-red-900 mb-2">Ce que nous ne faisons PAS</h4>
              <ul className="text-red-800 space-y-1">
                <li>- Nous ne <strong>vendons pas</strong> vos donnees personnelles</li>
                <li>- Nous ne partageons pas vos donnees a des fins publicitaires tierces</li>
                <li>- Nous ne transmettons pas vos donnees sans base legale</li>
              </ul>
            </div>
          </section>

          {/* Conservation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">5. CONSERVATION DES DONNEES</h2>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 font-medium">Type de donnees</th>
                    <th className="text-left p-3 font-medium">Duree</th>
                    <th className="text-left p-3 font-medium">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-3">Compte utilisateur</td><td className="p-3">Duree du compte + 2 ans</td><td className="p-3">Service, litiges</td></tr>
                  <tr><td className="p-3">Annonces</td><td className="p-3">Duree + 1 an</td><td className="p-3">Historique</td></tr>
                  <tr><td className="p-3 font-medium">Contrats</td><td className="p-3 font-medium">10 ans</td><td className="p-3">Obligation legale</td></tr>
                  <tr><td className="p-3">Medias E2E (serveur)</td><td className="p-3 text-green-600 font-medium">5 jours</td><td className="p-3">Temporaire</td></tr>
                  <tr><td className="p-3">OTP</td><td className="p-3">5 minutes</td><td className="p-3">Securite</td></tr>
                  <tr><td className="p-3">Sessions</td><td className="p-3">2 heures</td><td className="p-3">Securite</td></tr>
                  <tr><td className="p-3">Donnees paiement</td><td className="p-3">10 ans</td><td className="p-3">Obligation fiscale</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Vos droits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">6. VOS DROITS</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit d&apos;acces</h4>
                <p className="text-sm text-gray-600">
                  Obtenez une copie de toutes les donnees que nous detenons sur vous.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit de rectification</h4>
                <p className="text-sm text-gray-600">
                  Corrigez vos donnees inexactes ou incompletes.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit a l&apos;effacement</h4>
                <p className="text-sm text-gray-600">
                  Demandez la suppression de vos donnees personnelles.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <FileDown className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit a la portabilite</h4>
                <p className="text-sm text-gray-600">
                  Recevez vos donnees dans un format structure (JSON).
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <Ban className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit d&apos;opposition</h4>
                <p className="text-sm text-gray-600">
                  Refusez certains traitements de vos donnees.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:border-primary-300 transition-colors">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Droit de limitation</h4>
                <p className="text-sm text-gray-600">
                  Suspendez le traitement de vos donnees.
                </p>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-6 mt-6">
              <h4 className="font-semibold text-primary-900 mb-3">Comment exercer vos droits</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-primary-700 mb-1">Par email</p>
                  <a href="mailto:privacy@immoguinee.com" className="text-primary-600 font-medium hover:underline">
                    privacy@immoguinee.com
                  </a>
                </div>
                <div>
                  <p className="text-sm text-primary-700 mb-1">Dans l&apos;application</p>
                  <p className="text-primary-600 font-medium">Parametres &gt; Confidentialite</p>
                </div>
                <div>
                  <p className="text-sm text-primary-700 mb-1">Delai de reponse</p>
                  <p className="text-primary-600 font-medium">30 jours maximum</p>
                </div>
              </div>
            </div>
          </section>

          {/* Detection de fraude */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">7. DETECTION DE FRAUDE</h2>

            <p className="text-gray-600 mt-4">
              Nous utilisons un systeme automatise pour detecter les activites frauduleuses :
            </p>

            <ul className="mt-4 text-gray-600 space-y-2">
              <li>- Analyse des messages pour detecter les numeros de telephone partages</li>
              <li>- Detection des liens externes suspects</li>
              <li>- Identification des mots-cles associes a la fraude</li>
              <li>- Scoring de risque (0-100)</li>
            </ul>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
              <p className="text-amber-800">
                <strong>Droit de contestation :</strong> Vous avez le droit de contester une
                decision automatisee en contactant le support.
              </p>
            </div>
          </section>

          {/* Incidents de securite */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">8. INCIDENTS DE SECURITE</h2>

            <p className="text-gray-600 mt-4">
              En cas de violation de donnees susceptible d&apos;engendrer un risque pour vos droits :
            </p>

            <ul className="mt-4 text-gray-600 space-y-2">
              <li>- Nous vous informerons dans les <strong>72 heures</strong></li>
              <li>- Nous decrirons la nature de la violation</li>
              <li>- Nous indiquerons les mesures prises</li>
              <li>- Nous fournirons des recommandations</li>
            </ul>

            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-gray-700">
                <strong>Signaler une vulnerabilite :</strong>{' '}
                <a href="mailto:security@immoguinee.com" className="text-primary-600 hover:underline">
                  security@immoguinee.com
                </a>
                <br />
                <span className="text-sm text-gray-500">Nous nous engageons a repondre sous 48 heures.</span>
              </p>
            </div>
          </section>

          {/* Resume des droits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">RESUME DE VOS DROITS</h2>

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-primary-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-primary-900">Droit</th>
                    <th className="text-left p-3 font-medium text-primary-900">Description</th>
                    <th className="text-left p-3 font-medium text-primary-900">Comment l&apos;exercer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-3">Acces</td><td className="p-3">Obtenir une copie de vos donnees</td><td className="p-3">privacy@immoguinee.com</td></tr>
                  <tr><td className="p-3">Rectification</td><td className="p-3">Corriger vos donnees</td><td className="p-3">Parametres du compte</td></tr>
                  <tr><td className="p-3">Effacement</td><td className="p-3">Supprimer vos donnees</td><td className="p-3">privacy@immoguinee.com</td></tr>
                  <tr><td className="p-3">Portabilite</td><td className="p-3">Recevoir vos donnees (JSON)</td><td className="p-3">privacy@immoguinee.com</td></tr>
                  <tr><td className="p-3">Opposition</td><td className="p-3">Refuser certains traitements</td><td className="p-3">privacy@immoguinee.com</td></tr>
                  <tr><td className="p-3">Limitation</td><td className="p-3">Suspendre le traitement</td><td className="p-3">privacy@immoguinee.com</td></tr>
                </tbody>
              </table>
            </div>

            <p className="text-center text-gray-500 mt-4">
              <strong>Delai de reponse : 30 jours maximum</strong>
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">DPO</p>
                <a href="mailto:dpo@immoguinee.com" className="text-primary-600 hover:underline">
                  dpo@immoguinee.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Confidentialite</p>
                <a href="mailto:privacy@immoguinee.com" className="text-primary-600 hover:underline">
                  privacy@immoguinee.com
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Securite</p>
                <a href="mailto:security@immoguinee.com" className="text-primary-600 hover:underline">
                  security@immoguinee.com
                </a>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                <strong>Autorite de controle en Guinee :</strong> Autorite de Regulation des
                Postes et Telecommunications (ARPT), Conakry
              </p>
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
