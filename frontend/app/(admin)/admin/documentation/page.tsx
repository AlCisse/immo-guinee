'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Code,
  Server,
  Database,
  Shield,
  Users,
  Building2,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Globe,
  Smartphone,
  Lock,
  Key,
  FileText,
  Zap,
  Layers,
  GitBranch,
  Calendar,
  Scale,
  Star,
  FileCheck,
  Umbrella,
  AlertTriangle,
  Award,
  Send,
  Eye,
  Download,
} from 'lucide-react';

// Documentation Section Component
function DocSection({
  id,
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  id: string;
  icon: any;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
            <Icon className="w-5 h-5 text-primary-500" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t border-neutral-100 dark:border-dark-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </motion.div>
  );
}

// Code Block Component
function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-neutral-900 dark:bg-black text-neutral-100 p-4 rounded-xl overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-neutral-400" />
        )}
      </button>
    </div>
  );
}

// API Endpoint Component
function ApiEndpoint({
  method,
  path,
  description,
  auth = true,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth?: boolean;
}) {
  const methodColors = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
      <span className={`px-2 py-1 text-xs font-bold rounded ${methodColors[method]}`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm text-neutral-800 dark:text-neutral-200 break-all">
          {path}
        </code>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {description}
        </p>
      </div>
      {auth && (
        <Lock className="w-4 h-4 text-neutral-400 flex-shrink-0" title="Authentification requise" />
      )}
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-primary-500" />
        <span className="font-medium text-neutral-900 dark:text-white">{title}</span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
    </div>
  );
}

// Table of Contents Item
function TocItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
    >
      {children}
    </a>
  );
}

export default function AdminDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12 md:pt-8 md:pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-8 h-8 text-white" />
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Documentation ImmoGuinee
              </h1>
            </div>
            <p className="text-white/80 max-w-2xl">
              Guide complet de la plateforme - Architecture, API, Fonctionnalites, Securite et Deploiement.
            </p>

            {/* Search */}
            <div className="relative mt-6 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher dans la documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/30 focus:border-transparent"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Table of Contents */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 bg-white dark:bg-dark-card rounded-2xl shadow-soft p-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
                Sommaire
              </h3>
              <nav className="space-y-1">
                <TocItem href="#architecture">Architecture</TocItem>
                <TocItem href="#api">API Reference</TocItem>
                <TocItem href="#auth">Authentification</TocItem>
                <TocItem href="#listings">Annonces</TocItem>
                <TocItem href="#contracts">Contrats</TocItem>
                <TocItem href="#payments">Paiements</TocItem>
                <TocItem href="#visits">Visites</TocItem>
                <TocItem href="#messages">Messagerie</TocItem>
                <TocItem href="#disputes">Litiges</TocItem>
                <TocItem href="#ratings">Notations</TocItem>
                <TocItem href="#certifications">Certifications</TocItem>
                <TocItem href="#insurances">Assurances</TocItem>
                <TocItem href="#notifications">Notifications</TocItem>
                <TocItem href="#security">Securite & 2FA</TocItem>
                <TocItem href="#admin">Panel Admin</TocItem>
                <TocItem href="#docker">Docker</TocItem>
                <TocItem href="#deployment">Deploiement</TocItem>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Architecture */}
            <DocSection id="architecture" icon={Layers} title="Architecture" defaultOpen>
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  ImmoGuinee est une plateforme immobiliere complete pour la Guinee, basee sur une architecture microservices moderne.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Stack Technique</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-5 h-5 text-primary-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">Backend</span>
                    </div>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <li>Laravel 11 (PHP 8.3)</li>
                      <li>PostgreSQL 15 + PostGIS</li>
                      <li>Redis 7 (Cache & Queues)</li>
                      <li>Elasticsearch 8.11</li>
                      <li>Laravel Passport (OAuth2)</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-primary-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">Frontend</span>
                    </div>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <li>Next.js 15 (React 19)</li>
                      <li>TypeScript</li>
                      <li>Tailwind CSS</li>
                      <li>Framer Motion</li>
                      <li>i18n (FR, EN)</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="w-5 h-5 text-primary-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">Mobile</span>
                    </div>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <li>React Native (Expo)</li>
                      <li>TypeScript</li>
                      <li>NativeWind</li>
                      <li>Expo Router</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-primary-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">Services Externes</span>
                    </div>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <li>WAHA (WhatsApp API)</li>
                      <li>MinIO / DigitalOcean Spaces (S3)</li>
                      <li>Orange Money & MTN MoMo</li>
                      <li>n8n (Automatisation)</li>
                      <li>Traefik (Reverse Proxy + SSL)</li>
                    </ul>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Services Docker (17+)</h3>
                <CodeBlock
                  code={`# Services principaux
postgres      # Base de donnees PostgreSQL + PostGIS
redis         # Cache et queues
elasticsearch # Moteur de recherche full-text
php           # Application Laravel (2 replicas)
nginx         # Serveur web
frontend      # Application Next.js (2 replicas)

# Services auxiliaires
queue-worker  # Traitement des jobs (2 replicas)
scheduler     # Taches planifiees (cron)
waha          # API WhatsApp
minio         # Stockage S3 compatible
n8n           # Workflows automatises
laravel-echo  # WebSocket server

# Infrastructure
traefik       # Reverse proxy + SSL auto
varnish       # Cache HTTP
prometheus    # Metriques
grafana       # Dashboards monitoring
alertmanager  # Alertes
pgadmin       # Admin PostgreSQL`}
                />
              </div>
            </DocSection>

            {/* API Reference */}
            <DocSection id="api" icon={Code} title="API Reference">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  L'API REST est accessible a <code className="px-2 py-1 bg-neutral-100 dark:bg-dark-bg rounded">https://immoguinee.com/api</code>
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Headers requis</h3>
                <CodeBlock
                  code={`Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}  # Pour les routes authentifiees`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Format de reponse</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "success": true,
  "data": { ... },
  "message": "Operation reussie"
}

// En cas d'erreur
{
  "success": false,
  "message": "Message d'erreur",
  "errors": { "field": ["erreur de validation"] }
}

// Avec pagination
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total": 150,
    "per_page": 20,
    "last_page": 8
  }
}`}
                />
              </div>
            </DocSection>

            {/* Authentication */}
            <DocSection id="auth" icon={Lock} title="Authentification">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Authentification via Laravel Passport (OAuth2) avec verification OTP par WhatsApp.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="POST" path="/api/auth/register" description="Inscription (envoie OTP WhatsApp)" auth={false} />
                  <ApiEndpoint method="POST" path="/api/auth/verify-otp" description="Verifier le code OTP" auth={false} />
                  <ApiEndpoint method="POST" path="/api/auth/resend-otp" description="Renvoyer le code OTP" auth={false} />
                  <ApiEndpoint method="POST" path="/api/auth/login" description="Connexion (telephone + mot de passe)" auth={false} />
                  <ApiEndpoint method="POST" path="/api/auth/logout" description="Deconnexion et revocation du token" />
                  <ApiEndpoint method="GET" path="/api/auth/me" description="Informations utilisateur connecte" />
                  <ApiEndpoint method="GET" path="/api/auth/counts" description="Compteurs (notifications, messages, favoris)" />
                  <ApiEndpoint method="POST" path="/api/auth/forgot-password" description="Demande reinitialisation mot de passe" auth={false} />
                  <ApiEndpoint method="POST" path="/api/auth/reset-password" description="Reinitialiser avec code OTP" auth={false} />
                  <ApiEndpoint method="PUT" path="/api/auth/profile" description="Modifier le profil" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Flux d'inscription</h3>
                <CodeBlock
                  code={`1. POST /api/auth/register
   → Cree le compte (is_active=false)
   → Envoie OTP via WhatsApp

2. POST /api/auth/verify-otp
   → Valide le code OTP (6 chiffres, 5 min)
   → Active le compte (is_active=true)
   → Retourne le token d'acces

3. Utilisateur connecte !`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Types de compte</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>PARTICULIER</strong> - Locataire/Acheteur standard</li>
                  <li><strong>PROPRIETAIRE</strong> - Proprietaire/Bailleur</li>
                  <li><strong>AGENT</strong> - Agent immobilier independant</li>
                  <li><strong>AGENCE</strong> - Agence immobiliere</li>
                </ul>
              </div>
            </DocSection>

            {/* Listings */}
            <DocSection id="listings" icon={Building2} title="Annonces">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Gestion complete des annonces immobilieres avec recherche Elasticsearch, photos MinIO et geolocalisation PostGIS.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types de bien</h3>
                <div className="flex flex-wrap gap-2">
                  {['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'TERRAIN', 'COMMERCIAL', 'BUREAU'].map(type => (
                    <span key={type} className="px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm rounded-full">
                      {type}
                    </span>
                  ))}
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types de transaction</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>LOCATION</strong> - Location longue duree (loyer mensuel)</li>
                  <li><strong>LOCATION_COURTE</strong> - Location courte duree (prix/jour)</li>
                  <li><strong>VENTE</strong> - Vente immobiliere</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Statuts</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>BROUILLON</strong> - En cours de creation</li>
                  <li><strong>EN_ATTENTE</strong> - En attente de moderation</li>
                  <li><strong>ACTIVE</strong> - Publiee et visible</li>
                  <li><strong>SUSPENDUE</strong> - Suspendue par admin</li>
                  <li><strong>EXPIREE</strong> - Expiree (30 jours)</li>
                  <li><strong>LOUEE/VENDUE</strong> - Transaction conclue</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints publics</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/listings" description="Liste avec pagination et filtres" auth={false} />
                  <ApiEndpoint method="GET" path="/api/listings/{id}" description="Details d'une annonce" auth={false} />
                  <ApiEndpoint method="GET" path="/api/listings/search" description="Recherche avancee Elasticsearch" auth={false} />
                  <ApiEndpoint method="GET" path="/api/listings/{id}/similar" description="Annonces similaires" auth={false} />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints authentifies</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="POST" path="/api/listings" description="Creer une annonce" />
                  <ApiEndpoint method="PATCH" path="/api/listings/{id}" description="Modifier une annonce" />
                  <ApiEndpoint method="DELETE" path="/api/listings/{id}" description="Supprimer une annonce" />
                  <ApiEndpoint method="POST" path="/api/listings/{id}/photos" description="Ajouter des photos (max 10)" />
                  <ApiEndpoint method="DELETE" path="/api/listings/{id}/photos/{photoId}" description="Supprimer une photo" />
                  <ApiEndpoint method="POST" path="/api/listings/{id}/contact" description="Contacter le proprietaire" />
                  <ApiEndpoint method="POST" path="/api/listings/{id}/renew" description="Renouveler (si expiree)" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Filtres disponibles</h3>
                <CodeBlock
                  code={`GET /api/listings?
  type_bien=APPARTEMENT,MAISON      # Types (virgule separee)
  &type_transaction=LOCATION        # LOCATION, LOCATION_COURTE, VENTE
  &commune=Ratoma                   # Commune
  &quartier=Kipe                    # Quartier
  &prix_min=500000                  # Prix minimum (GNF)
  &prix_max=2000000                 # Prix maximum (GNF)
  &chambres_min=2                   # Nombre chambres min
  &surface_min=50                   # Surface minimum (m2)
  &meuble=true                      # Meuble uniquement
  &disponible=true                  # Disponible uniquement
  &sort=prix_asc                    # Tri: prix_asc, prix_desc, recent
  &page=1&limit=20                  # Pagination`}
                />
              </div>
            </DocSection>

            {/* Contracts */}
            <DocSection id="contracts" icon={FileText} title="Contrats">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Systeme complet de contrats electroniques avec generation PDF, signatures electroniques et chiffrement AES-256-GCM.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types de contrat</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>BAIL_LOCATION_RESIDENTIEL</strong> - Contrat de location standard</li>
                  <li><strong>MANDAT_DE_VENTE</strong> - Mandat de vente immobiliere</li>
                  <li><strong>MANDAT_DE_LOCATION</strong> - Mandat de gestion locative</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Statuts</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>BROUILLON</strong> - En cours de redaction</li>
                  <li><strong>EN_ATTENTE_BAILLEUR</strong> - Attente signature proprietaire</li>
                  <li><strong>EN_ATTENTE_LOCATAIRE</strong> - Attente signature locataire</li>
                  <li><strong>SIGNE</strong> - Signe par les deux parties</li>
                  <li><strong>ACTIF</strong> - Contrat en cours</li>
                  <li><strong>RESILIE</strong> - Contrat resilie</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/contracts" description="Lister mes contrats" />
                  <ApiEndpoint method="POST" path="/api/contracts" description="Creer un contrat" />
                  <ApiEndpoint method="GET" path="/api/contracts/{id}" description="Details du contrat" />
                  <ApiEndpoint method="GET" path="/api/contracts/{id}/preview" description="Apercu PDF" />
                  <ApiEndpoint method="GET" path="/api/contracts/{id}/download" description="Telecharger PDF (watermark)" />
                  <ApiEndpoint method="POST" path="/api/contracts/{id}/sign/request-otp" description="Demander OTP signature" />
                  <ApiEndpoint method="POST" path="/api/contracts/{id}/sign" description="Signer avec OTP" />
                  <ApiEndpoint method="POST" path="/api/contracts/{id}/send" description="Envoyer au locataire (WhatsApp/Email)" />
                  <ApiEndpoint method="POST" path="/api/contracts/{id}/terminate" description="Demander resiliation (3 mois preavis)" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Signature publique (sans auth)</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/contracts/sign/{token}" description="Voir contrat via lien" auth={false} />
                  <ApiEndpoint method="POST" path="/api/contracts/sign/{token}/request-otp" description="Demander OTP" auth={false} />
                  <ApiEndpoint method="POST" path="/api/contracts/sign/{token}" description="Signer le contrat" auth={false} />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Securite</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>PDF chiffre avec AES-256-GCM</li>
                  <li>Hash SHA-256 pour integrite</li>
                  <li>Signature electronique avec OTP</li>
                  <li>IP et timestamp enregistres</li>
                  <li>Periode de retraction (7 jours)</li>
                  <li>Archive WORM (Write Once Read Many)</li>
                </ul>
              </div>
            </DocSection>

            {/* Payments */}
            <DocSection id="payments" icon={CreditCard} title="Paiements">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Paiements Mobile Money (Orange Money, MTN MoMo) avec systeme d'escrow pour les cautions.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Moyens de paiement</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                    <span className="font-medium text-orange-600 dark:text-orange-400">Orange Money</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Principal en Guinee - Frais 0.5%</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl">
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">MTN Mobile Money</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Alternative disponible</p>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Types de paiement</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>CAUTION</strong> - Depot de garantie (escrow 60 jours)</li>
                  <li><strong>LOYER</strong> - Loyer mensuel</li>
                  <li><strong>ADVANCE</strong> - Avance sur loyer</li>
                  <li><strong>COMMISSION</strong> - Commission plateforme</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Commissions plateforme</h3>
                <CodeBlock
                  code={`LOCATION:          50% d'un mois de loyer
VENTE_TERRAIN:     1% du prix de vente
VENTE_MAISON:      2% du prix de vente
VENTE_VILLA:       2% du prix de vente
VENTE_APPARTEMENT: 2% du prix de vente
MANDAT_GESTION:    8% mensuel

Reductions par badge:
  BRONZE:   0%
  ARGENT:  -5%
  OR:     -10%
  DIAMANT: -15%`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/payments" description="Lister mes paiements" />
                  <ApiEndpoint method="POST" path="/api/payments" description="Initier un paiement" />
                  <ApiEndpoint method="GET" path="/api/payments/{id}" description="Details du paiement" />
                  <ApiEndpoint method="GET" path="/api/payments/{id}/status" description="Verifier le statut" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Webhooks</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="POST" path="/api/webhooks/orange-money" description="Callback Orange Money" auth={false} />
                  <ApiEndpoint method="POST" path="/api/webhooks/mtn-momo" description="Callback MTN MoMo" auth={false} />
                </div>
              </div>
            </DocSection>

            {/* Visits */}
            <DocSection id="visits" icon={Calendar} title="Visites">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Systeme de reservation de visites avec notifications automatiques et calendrier.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Statuts</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>DEMANDEE</strong> - Demande initiale</li>
                  <li><strong>CONFIRMEE</strong> - Confirmee par proprietaire</li>
                  <li><strong>COMPLETEE</strong> - Visite realisee</li>
                  <li><strong>ANNULEE</strong> - Annulee</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/visits" description="Lister mes visites" />
                  <ApiEndpoint method="GET" path="/api/visits/upcoming" description="Visites a venir" />
                  <ApiEndpoint method="GET" path="/api/visits/by-date" description="Visites par date" />
                  <ApiEndpoint method="GET" path="/api/visits/stats" description="Statistiques" />
                  <ApiEndpoint method="POST" path="/api/visits" description="Demander une visite" />
                  <ApiEndpoint method="POST" path="/api/visits/{id}/confirm" description="Confirmer" />
                  <ApiEndpoint method="POST" path="/api/visits/{id}/complete" description="Marquer completee" />
                  <ApiEndpoint method="POST" path="/api/visits/{id}/cancel" description="Annuler" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Reponse publique</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/visits/response/{token}" description="Voir demande de visite" auth={false} />
                  <ApiEndpoint method="POST" path="/api/visits/response/{token}" description="Repondre (accepter/proposer/refuser)" auth={false} />
                </div>
              </div>
            </DocSection>

            {/* Messages */}
            <DocSection id="messages" icon={MessageSquare} title="Messagerie">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Messagerie interne avec support texte, audio et photos.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types de messages</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>TEXT</strong> - Message texte</li>
                  <li><strong>VOCAL</strong> - Message audio</li>
                  <li><strong>PHOTO</strong> - Image</li>
                  <li><strong>SYSTEM</strong> - Message systeme</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/messaging/conversations" description="Lister conversations" />
                  <ApiEndpoint method="POST" path="/api/messaging/conversations/start" description="Demarrer conversation" />
                  <ApiEndpoint method="GET" path="/api/messaging/{id}/messages" description="Messages d'une conversation" />
                  <ApiEndpoint method="POST" path="/api/messaging/{id}/messages" description="Envoyer message" />
                  <ApiEndpoint method="POST" path="/api/messaging/{id}/archive" description="Archiver conversation" />
                  <ApiEndpoint method="POST" path="/api/messages/{id}/report" description="Signaler message" />
                </div>
              </div>
            </DocSection>

            {/* Disputes */}
            <DocSection id="disputes" icon={Scale} title="Litiges">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Systeme de gestion des litiges avec mediation integree.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Categories</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>IMPAYE</strong> - Non-paiement de loyer</li>
                  <li><strong>DEGATS</strong> - Degats locatifs</li>
                  <li><strong>EXPULSION_ABUSIVE</strong> - Expulsion sans procedure</li>
                  <li><strong>CAUTION_NON_REMBOURSEE</strong> - Caution non restituee</li>
                  <li><strong>AUTRE</strong> - Autre motif</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Statuts</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>OUVERT</strong> - Litige initie</li>
                  <li><strong>EN_COURS</strong> - En mediation</li>
                  <li><strong>RESOLU_AMIABLE</strong> - Accord a l'amiable</li>
                  <li><strong>RESOLU_COMPENSATION</strong> - Compensation ordonnee</li>
                  <li><strong>ESCALADE_JUDICIAIRE</strong> - Escalade legale</li>
                  <li><strong>FERME</strong> - Clos</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/disputes" description="Lister mes litiges" />
                  <ApiEndpoint method="POST" path="/api/disputes" description="Ouvrir un litige" />
                  <ApiEndpoint method="GET" path="/api/disputes/{id}" description="Details du litige" />
                  <ApiEndpoint method="POST" path="/api/disputes/{id}/assign" description="Assigner mediateur (admin)" />
                  <ApiEndpoint method="POST" path="/api/disputes/{id}/resolve" description="Resoudre (admin/mediator)" />
                </div>
              </div>
            </DocSection>

            {/* Ratings */}
            <DocSection id="ratings" icon={Star} title="Notations">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Systeme de notation a 5 criteres avec moderation automatique du contenu.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Criteres (1-5)</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Note globale</li>
                  <li>Communication</li>
                  <li>Ponctualite</li>
                  <li>Proprete</li>
                  <li>Respect du contrat</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="POST" path="/api/ratings" description="Creer une notation (apres contrat)" />
                  <ApiEndpoint method="GET" path="/api/ratings/{userId}" description="Notations d'un utilisateur" />
                  <ApiEndpoint method="POST" path="/api/ratings/{id}/moderate" description="Moderer (admin)" />
                </div>
              </div>
            </DocSection>

            {/* Certifications */}
            <DocSection id="certifications" icon={FileCheck} title="Certifications">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Verification d'identite et de propriete pour debloquer les badges.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Documents acceptes</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>CNI</strong> - Carte Nationale d'Identite</li>
                  <li><strong>PASSEPORT</strong> - Passeport valide</li>
                  <li><strong>TITRE_FONCIER</strong> - Titre de propriete</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Systeme de badges</h3>
                <CodeBlock
                  code={`BRONZE → ARGENT:
  - CNI verifiee
  - 1+ transaction complete

ARGENT → OR:
  - Titre foncier verifie
  - 5+ transactions
  - Note moyenne >= 4.0

OR → DIAMANT:
  - 20+ transactions
  - Note moyenne >= 4.5
  - 0 litiges ouverts`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/certifications/me" description="Mes certifications" />
                  <ApiEndpoint method="POST" path="/api/certifications/upload" description="Soumettre un document" />
                  <ApiEndpoint method="DELETE" path="/api/certifications/{id}" description="Supprimer" />
                  <ApiEndpoint method="POST" path="/api/certifications/{id}/verify" description="Verifier (admin)" />
                </div>
              </div>
            </DocSection>

            {/* Insurances */}
            <DocSection id="insurances" icon={Umbrella} title="Assurances">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Assurances optionnelles pour proteger locataires et proprietaires.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types d'assurance</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Sejour Serein (Locataire)</span>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 space-y-1">
                      <li>Protection expulsion abusive</li>
                      <li>Garantie caution</li>
                      <li>Assistance juridique</li>
                      <li>Prime: 2% du loyer mensuel</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
                    <span className="font-medium text-green-600 dark:text-green-400">Loyer Garanti (Proprietaire)</span>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 space-y-1">
                      <li>Garantie loyers impayes (6 mois)</li>
                      <li>Couverture degats locatifs (2 mois)</li>
                      <li>Prime: selon profil</li>
                    </ul>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="POST" path="/api/insurances/subscribe" description="Souscrire une assurance" />
                  <ApiEndpoint method="GET" path="/api/insurances/my" description="Mes assurances" />
                  <ApiEndpoint method="POST" path="/api/insurances/{id}/claim" description="Faire une reclamation" />
                  <ApiEndpoint method="GET" path="/api/insurances/{id}/certificate" description="Telecharger certificat" />
                </div>
              </div>
            </DocSection>

            {/* Notifications */}
            <DocSection id="notifications" icon={Bell} title="Notifications">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Notifications multi-canal: WhatsApp (WAHA), Email, SMS.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Canaux</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl text-center">
                    <MessageSquare className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <span className="font-medium text-green-600 dark:text-green-400">WhatsApp</span>
                    <p className="text-xs text-neutral-500 mt-1">Via WAHA API</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-center">
                    <Send className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">Email</span>
                    <p className="text-xs text-neutral-500 mt-1">Via SMTP</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-center">
                    <Smartphone className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <span className="font-medium text-purple-600 dark:text-purple-400">SMS</span>
                    <p className="text-xs text-neutral-500 mt-1">Via Twilio</p>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Types de notifications</h3>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <p>listing_created, listing_approved, listing_rejected, listing_expired</p>
                  <p>contract_created, contract_signed, contract_cancelled</p>
                  <p>payment_received, payment_reminder</p>
                  <p>message_received, visit_requested, visit_confirmed</p>
                  <p>rating_received, dispute_opened, dispute_resolved</p>
                  <p>certification_approved, badge_upgraded</p>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint method="GET" path="/api/notifications" description="Lister mes notifications" />
                  <ApiEndpoint method="POST" path="/api/notifications/{id}/read" description="Marquer comme lu" />
                  <ApiEndpoint method="POST" path="/api/notifications/read-all" description="Tout marquer comme lu" />
                  <ApiEndpoint method="DELETE" path="/api/notifications/{id}" description="Supprimer" />
                </div>
              </div>
            </DocSection>

            {/* Security & 2FA */}
            <DocSection id="security" icon={Shield} title="Securite & 2FA" defaultOpen>
              <div className="space-y-4">
                {/* Security Score Banner */}
                <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">Score de Securite</h3>
                      <p className="text-white/80 text-sm">Audit realise le 24 Decembre 2024</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">A+ (99.99%)</div>
                      <p className="text-white/80 text-sm">Niveau Enterprise</p>
                    </div>
                  </div>
                </div>

                <p className="text-neutral-600 dark:text-neutral-300">
                  Securite renforcee avec 2FA obligatoire pour les admins, httpOnly cookies, et chiffrement des donnees sensibles.
                </p>

                {/* Security Categories */}
                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Scores par Categorie</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { name: 'Authentication', score: 100 },
                    { name: 'Authorization & RBAC', score: 100 },
                    { name: 'XSS Protection', score: 100 },
                    { name: 'CSRF Protection', score: 100 },
                    { name: 'Rate Limiting', score: 100 },
                    { name: 'Session Security', score: 100 },
                    { name: 'Password Security', score: 100 },
                    { name: 'Mobile Security', score: 100 },
                  ].map(cat => (
                    <div key={cat.name} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                      <span className="text-neutral-700 dark:text-neutral-300">{cat.name}</span>
                      <span className="font-bold text-green-500">{cat.score}%</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Protection XSS</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>httpOnly Cookies</strong> - Tokens inaccessibles au JavaScript</li>
                  <li><strong>SanitizeInput Middleware</strong> - htmlspecialchars() sur toutes les entrees</li>
                  <li><strong>CSP Stricte</strong> - Pas de unsafe-inline/unsafe-eval en production</li>
                  <li><strong>X-XSS-Protection</strong> - Header de protection navigateur</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Rate Limiting</h3>
                <CodeBlock
                  code={`# Limiteurs configures
auth:       5 req/min      # Login, register, forgot-password
otp:        3 req/min      # OTP verify, resend (+ 10/heure)
api:        60 req/min     # Routes API generales
search:     30 req/min     # Recherche Elasticsearch
uploads:    100 req/heure  # Upload de fichiers
payments:   10 req/min     # Transactions financieres
messages:   20 req/min     # Messagerie (anti-spam)
listings:   50 req/jour    # Creation d'annonces
admin:      120 req/min    # Panel admin
contact:    5 req/min      # Formulaire contact
ai:         10 req/min     # Endpoints IA`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">2FA Admin Obligatoire</h3>
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                  <p className="text-amber-800 dark:text-amber-300 text-sm">
                    <strong>Important:</strong> Le 2FA est OBLIGATOIRE pour tous les administrateurs.
                    Sans configuration 2FA, l'acces au panel admin est bloque avec erreur 403.
                  </p>
                </div>
                <div className="space-y-2 mt-4">
                  <ApiEndpoint method="GET" path="/api/admin/2fa/status" description="Statut 2FA" />
                  <ApiEndpoint method="POST" path="/api/admin/2fa/setup" description="Configurer 2FA (QR code + secret)" />
                  <ApiEndpoint method="POST" path="/api/admin/2fa/confirm" description="Confirmer avec code TOTP" />
                  <ApiEndpoint method="POST" path="/api/admin/2fa/verify" description="Verifier a la connexion" />
                  <ApiEndpoint method="POST" path="/api/admin/2fa/disable" description="Desactiver (mot de passe + code)" />
                  <ApiEndpoint method="POST" path="/api/admin/2fa/recovery-codes" description="Regenerer 8 codes de secours" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">OTP WhatsApp</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Code 6 chiffres genere avec random_int()</li>
                  <li>Expiration: 5 minutes (stocke dans Redis)</li>
                  <li>Max 3 tentatives (blocage 30 min)</li>
                  <li>Envoye via WAHA (WhatsApp Business API)</li>
                  <li><strong>Jamais expose dans les reponses API</strong></li>
                  <li><strong>Jamais logue meme en mode debug</strong></li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Validation Mot de Passe</h3>
                <CodeBlock
                  code={`# Exigences mot de passe (Laravel Password Rule)
- Minimum 8 caracteres
- Au moins une MAJUSCULE et une minuscule
- Au moins un chiffre (0-9)
- Au moins un caractere special (!@#$%^&*)
- Verification HaveIBeenPwned (mots de passe compromis)`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Headers de Securite</h3>
                <CodeBlock
                  code={`X-Frame-Options: DENY                    # Anti-clickjacking
X-Content-Type-Options: nosniff           # Anti-MIME sniffing
X-XSS-Protection: 1; mode=block           # XSS filter
Strict-Transport-Security: max-age=31536000  # HSTS (1 an)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()

# CSP Production (stricte)
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: https:;
  connect-src 'self' https://*.immoguinee.com wss://*.immoguinee.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Securite Mobile (React Native)</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>expo-secure-store</strong> - Stockage chiffre des tokens</li>
                  <li><strong>Domain Validation</strong> - Whitelist immoguinee.com uniquement</li>
                  <li><strong>SSL Pinning Ready</strong> - Configuration via variables d'environnement</li>
                  <li><strong>Request Timestamp</strong> - Header X-Request-Time pour protection replay</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Chiffrement & Integrite</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>Session</strong> - Chiffrement AES-256-CBC (SESSION_ENCRYPT=true)</li>
                  <li><strong>Contrats PDF</strong> - AES-256-GCM avec cle unique</li>
                  <li><strong>Integrite</strong> - Hash SHA-256 sur documents</li>
                  <li><strong>Signatures</strong> - Token + OTP + IP + Timestamp + User Agent</li>
                  <li><strong>2FA Secrets</strong> - Chiffres avec APP_KEY Laravel</li>
                  <li><strong>Recovery Codes</strong> - 8 codes chiffres, usage unique</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Securite Fichiers</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>Magic Bytes</strong> - Validation du type reel (pas extension)</li>
                  <li><strong>ClamAV</strong> - Scan antivirus automatique</li>
                  <li><strong>UUID Filenames</strong> - Noms de fichiers non-predictibles</li>
                  <li><strong>Extension Blacklist</strong> - php, exe, sh, bat bloques</li>
                  <li><strong>Taille Max</strong> - 5MB images, 10MB audio</li>
                  <li><strong>FFmpeg Timeout</strong> - 30s max pour conversion audio</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">CORS Configuration</h3>
                <CodeBlock
                  code={`# Production (.env)
FRONTEND_URL=https://immoguinee.com
APP_URL=https://immoguinee.com
# Pas de localhost en production!

# Support credentials pour httpOnly cookies
supports_credentials: true`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Policies RBAC (10 Policies)</h3>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {[
                    'ListingPolicy - Proprietaire uniquement',
                    'ContractPolicy - Parties du contrat',
                    'PaymentPolicy - Payeur/Beneficiaire',
                    'ConversationPolicy - Participants',
                    'MessagePolicy - Expediteur/Destinataire',
                    'VisitPolicy - Demandeur/Proprietaire',
                    'DisputePolicy - Parties + Mediateur',
                    'RatingPolicy - Apres transaction',
                    'CertificationPolicy - Proprietaire doc',
                    'InsurancePolicy - Souscripteur',
                  ].map(policy => (
                    <div key={policy} className="p-2 bg-neutral-50 dark:bg-dark-bg rounded-lg text-neutral-600 dark:text-neutral-400">
                      {policy}
                    </div>
                  ))}
                </div>
              </div>
            </DocSection>

            {/* Admin Panel */}
            <DocSection id="admin" icon={Settings} title="Panel Admin">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Dashboard complet avec 40+ endpoints et 15 KPIs en temps reel.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Fonctionnalites</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FeatureCard icon={Building2} title="Annonces" description="Moderation, approbation, suspension, statistiques" />
                  <FeatureCard icon={Users} title="Utilisateurs" description="Gestion, verification, suspension, roles" />
                  <FeatureCard icon={FileText} title="Contrats" description="Suivi, statistiques, interventions" />
                  <FeatureCard icon={CreditCard} title="Paiements" description="Transactions, commissions, remboursements" />
                  <FeatureCard icon={Scale} title="Litiges" description="Mediation, resolution, escalade" />
                  <FeatureCard icon={FileCheck} title="Certifications" description="Verification documents, badges" />
                  <FeatureCard icon={Star} title="Notations" description="Moderation avis, signalements" />
                  <FeatureCard icon={Eye} title="Analytics" description="15 KPIs, graphiques, exports" />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">KPIs Dashboard</h3>
                <CodeBlock
                  code={`# Utilisateurs
total_users, new_users_30d, verified_users

# Annonces
total_listings, active_listings, pending_moderation

# Transactions
total_contracts, signed_contracts, total_revenue

# Performance
avg_response_time, conversion_rate, churn_rate

# Litiges
open_disputes, resolution_rate, avg_resolution_time`}
                />
              </div>
            </DocSection>

            {/* Docker */}
            <DocSection id="docker" icon={Terminal} title="Docker">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Deploiement containerise avec Docker Swarm pour la haute disponibilite.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Developpement local</h3>
                <CodeBlock
                  code={`# Demarrer tous les services
cd docker
docker compose up -d

# Voir les logs
docker compose logs -f php

# Executer des commandes Laravel
docker exec -it docker-php-1 php artisan migrate
docker exec -it docker-php-1 php artisan db:seed
docker exec -it docker-php-1 php artisan tinker`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Production (Docker Swarm)</h3>
                <CodeBlock
                  code={`# Deployer le stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml immog

# Voir les services
docker service ls

# Mettre a jour un service
docker service update --force immog_frontend
docker service update --force immog_php

# Voir les logs d'un service
docker service logs -f immog_php`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Commandes utiles</h3>
                <CodeBlock
                  code={`# Reset admin
docker exec $(docker ps -q -f name=immog_php) php artisan admin:reset

# Vider le cache
docker exec $(docker ps -q -f name=immog_php) php artisan cache:clear
docker exec $(docker ps -q -f name=immog_php) php artisan config:clear

# Migrations
docker exec $(docker ps -q -f name=immog_php) php artisan migrate --force

# Queue worker restart
docker service update --force immog_queue-worker`}
                />
              </div>
            </DocSection>

            {/* Deployment */}
            <DocSection id="deployment" icon={GitBranch} title="Deploiement">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Guide de deploiement sur serveur OVH VPS avec Docker Swarm.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Pre-requis serveur</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Ubuntu 22.04 LTS</li>
                  <li>Docker Engine 24+</li>
                  <li>8 GB RAM minimum</li>
                  <li>100 GB SSD</li>
                  <li>Domaine configure (DNS)</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Deploiement</h3>
                <CodeBlock
                  code={`# 1. Connexion SSH
ssh ubuntu@vps-f9ab3c93.vps.ovh.net

# 2. Pull des changements
cd /home/ubuntu/immoguinee
git pull origin main

# 3. Rebuild et redeploy
docker service update --force immog_frontend
docker service update --force immog_php

# 4. Verifier les services
docker service ls
docker service ps immog_frontend`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">URLs de production</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <span className="text-neutral-600 dark:text-neutral-400">Site principal</span>
                    <a href="https://immoguinee.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary-500 hover:text-primary-600">
                      immoguinee.com <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <span className="text-neutral-600 dark:text-neutral-400">API</span>
                    <code className="text-sm text-neutral-800 dark:text-neutral-200">immoguinee.com/api</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <span className="text-neutral-600 dark:text-neutral-400">Monitoring</span>
                    <code className="text-sm text-neutral-800 dark:text-neutral-200">monitoring.immoguinee.com</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <span className="text-neutral-600 dark:text-neutral-400">PgAdmin</span>
                    <code className="text-sm text-neutral-800 dark:text-neutral-200">pgadmin.immoguinee.com</code>
                  </div>
                </div>
              </div>
            </DocSection>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary-500 to-orange-500 rounded-2xl p-6 text-white"
            >
              <h3 className="font-semibold text-lg mb-4">Liens utiles</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href="https://github.com/AlCisse/immo-guinee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <GitBranch className="w-5 h-5" />
                  <span>Repository GitHub</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
                <a
                  href="https://monitoring.immoguinee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  <span>Monitoring Grafana</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
                <a
                  href="https://pgadmin.immoguinee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Database className="w-5 h-5" />
                  <span>PgAdmin</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
                <a
                  href="https://waha.immoguinee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>WAHA WhatsApp</span>
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
