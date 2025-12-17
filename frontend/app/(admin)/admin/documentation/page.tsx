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
                Documentation
              </h1>
            </div>
            <p className="text-white/80 max-w-2xl">
              Guide complet de la plateforme ImmoGuinee - Architecture, API, fonctionnalites et bonnes pratiques.
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
                <TocItem href="#users">Utilisateurs</TocItem>
                <TocItem href="#payments">Paiements</TocItem>
                <TocItem href="#messages">Messages</TocItem>
                <TocItem href="#notifications">Notifications</TocItem>
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
                  ImmoGuinee est une plateforme immobiliere moderne basee sur une architecture microservices.
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
                    </ul>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-primary-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">Services</span>
                    </div>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <li>WAHA (WhatsApp API)</li>
                      <li>MinIO (Stockage S3)</li>
                      <li>n8n (Automatisation)</li>
                      <li>Traefik (Reverse Proxy)</li>
                    </ul>
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Services Docker (17)</h3>
                <CodeBlock
                  code={`# Services principaux
postgres      # Base de donnees PostgreSQL + PostGIS
redis         # Cache et queues
elasticsearch # Moteur de recherche
php           # Application Laravel
nginx         # Serveur web
frontend      # Application Next.js

# Services auxiliaires
queue-worker  # Traitement des jobs
scheduler     # Taches planifiees
waha          # API WhatsApp
minio         # Stockage S3
n8n           # Workflows
laravel-echo  # WebSocket

# Infrastructure
traefik       # Reverse proxy + SSL
varnish       # Cache HTTP
prometheus    # Metriques
grafana       # Dashboards
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
  "errors": { "field": ["erreur"] }
}`}
                />
              </div>
            </DocSection>

            {/* Authentication */}
            <DocSection id="auth" icon={Lock} title="Authentification">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  L'authentification utilise Laravel Passport avec des tokens JWT.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="POST"
                    path="/api/auth/register"
                    description="Inscription d'un nouvel utilisateur"
                    auth={false}
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/auth/login"
                    description="Connexion et obtention du token"
                    auth={false}
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/auth/logout"
                    description="Deconnexion et revocation du token"
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/api/auth/me"
                    description="Informations de l'utilisateur connecte"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/auth/verify-phone"
                    description="Verification du numero de telephone"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/auth/forgot-password"
                    description="Demande de reinitialisation du mot de passe"
                    auth={false}
                  />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Exemple de connexion</h3>
                <CodeBlock
                  code={`curl -X POST https://immoguinee.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "telephone": "+224620000000",
    "mot_de_passe": "password123"
  }'`}
                />
              </div>
            </DocSection>

            {/* Listings */}
            <DocSection id="listings" icon={Building2} title="Annonces">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Gestion des annonces immobilieres (CRUD, recherche, filtres).
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Endpoints publics</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="GET"
                    path="/api/listings"
                    description="Liste des annonces avec pagination et filtres"
                    auth={false}
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/api/listings/{id}"
                    description="Details d'une annonce"
                    auth={false}
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/api/listings/search"
                    description="Recherche avancee (Elasticsearch)"
                    auth={false}
                  />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints authentifies</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="POST"
                    path="/api/listings"
                    description="Creer une nouvelle annonce"
                  />
                  <ApiEndpoint
                    method="PUT"
                    path="/api/listings/{id}"
                    description="Modifier une annonce"
                  />
                  <ApiEndpoint
                    method="DELETE"
                    path="/api/listings/{id}"
                    description="Supprimer une annonce"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/listings/{id}/photos"
                    description="Ajouter des photos"
                  />
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Filtres disponibles</h3>
                <CodeBlock
                  code={`GET /api/listings?
  type_bien=APPARTEMENT,MAISON      # Types de bien
  &type_transaction=LOCATION        # LOCATION ou VENTE
  &commune=Ratoma                   # Commune
  &quartier=Kipé                    # Quartier
  &prix_min=500000                  # Prix minimum (GNF)
  &prix_max=2000000                 # Prix maximum (GNF)
  &chambres_min=2                   # Nombre de chambres min
  &surface_min=50                   # Surface minimum (m²)
  &meuble=true                      # Meuble uniquement
  &sort=prix_asc                    # Tri
  &page=1&limit=20                  # Pagination`}
                />
              </div>
            </DocSection>

            {/* Users */}
            <DocSection id="users" icon={Users} title="Utilisateurs">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Gestion des utilisateurs et des profils.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Types de compte</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>PARTICULIER</strong> - Utilisateur standard</li>
                  <li><strong>AGENCE</strong> - Agence immobiliere</li>
                  <li><strong>PROMOTEUR</strong> - Promoteur immobilier</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Badges</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>BRONZE</strong> - Nouveau membre</li>
                  <li><strong>ARGENT</strong> - 5+ transactions</li>
                  <li><strong>OR</strong> - 20+ transactions, note &gt; 4.0</li>
                  <li><strong>DIAMANT</strong> - 50+ transactions, note &gt; 4.5</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints Admin</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="GET"
                    path="/api/admin/users"
                    description="Liste des utilisateurs (admin)"
                  />
                  <ApiEndpoint
                    method="PUT"
                    path="/api/admin/users/{id}/verify"
                    description="Verifier un utilisateur"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/admin/users/{id}/suspend"
                    description="Suspendre un utilisateur"
                  />
                </div>
              </div>
            </DocSection>

            {/* Payments */}
            <DocSection id="payments" icon={CreditCard} title="Paiements">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Integration des paiements mobile money (Orange Money, MTN MoMo).
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Moyens de paiement</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>Orange Money</strong> - Principal en Guinee</li>
                  <li><strong>MTN Mobile Money</strong> - Alternative</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="POST"
                    path="/api/payments/initiate"
                    description="Initier un paiement"
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/api/payments/{id}/status"
                    description="Verifier le statut d'un paiement"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/webhooks/orange-money"
                    description="Webhook Orange Money"
                    auth={false}
                  />
                </div>
              </div>
            </DocSection>

            {/* Messages */}
            <DocSection id="messages" icon={MessageSquare} title="Messages">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Systeme de messagerie interne entre utilisateurs.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Endpoints</h3>
                <div className="space-y-2">
                  <ApiEndpoint
                    method="GET"
                    path="/api/conversations"
                    description="Liste des conversations"
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/api/conversations/{id}/messages"
                    description="Messages d'une conversation"
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/api/conversations/{id}/messages"
                    description="Envoyer un message"
                  />
                </div>
              </div>
            </DocSection>

            {/* Notifications */}
            <DocSection id="notifications" icon={Bell} title="Notifications">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Notifications multi-canal (WhatsApp, SMS, Email, Push).
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Canaux</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li><strong>WhatsApp</strong> - Via WAHA (principal)</li>
                  <li><strong>SMS</strong> - Via Twilio</li>
                  <li><strong>Email</strong> - Via SMTP</li>
                  <li><strong>Push</strong> - Via Firebase (mobile)</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Configuration WAHA</h3>
                <CodeBlock
                  code={`# Variables d'environnement
WAHA_URL=http://waha:3000
WAHA_API_KEY=your_api_key
WAHA_SESSION_NAME=default

# Webhook URL (configure dans WAHA)
WHATSAPP_HOOK_URL=http://nginx/api/webhooks/waha`}
                />
              </div>
            </DocSection>

            {/* Docker */}
            <DocSection id="docker" icon={Terminal} title="Docker">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Configuration Docker pour developpement et production.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Developpement local</h3>
                <CodeBlock
                  code={`# Demarrer tous les services
cd docker
docker compose up -d

# Voir les logs
docker compose logs -f

# Executer des commandes Laravel
docker exec -it immog-php php artisan migrate
docker exec -it immog-php php artisan db:seed`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Production (Docker Swarm)</h3>
                <CodeBlock
                  code={`# Deployer le stack
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml immog

# Voir les services
docker service ls

# Mettre a jour un service
docker service update --image immoguinee/frontend:latest --force immog_frontend`}
                />

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Secrets Docker</h3>
                <CodeBlock
                  code={`# Creer les secrets
echo "password" | docker secret create db_password -
echo "password" | docker secret create redis_password -
echo "base64_key" | docker secret create app_key -

# Lister les secrets
docker secret ls`}
                />
              </div>
            </DocSection>

            {/* Deployment */}
            <DocSection id="deployment" icon={GitBranch} title="Deploiement">
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-neutral-300">
                  Guide de deploiement en production.
                </p>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-4">Pre-requis serveur</h3>
                <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                  <li>Ubuntu 22.04 LTS</li>
                  <li>Docker Engine 24+</li>
                  <li>Docker Compose v2</li>
                  <li>4 GB RAM minimum (8 GB recommande)</li>
                  <li>50 GB stockage SSD</li>
                </ul>

                <h3 className="font-semibold text-neutral-900 dark:text-white mt-6">Etapes de deploiement</h3>
                <CodeBlock
                  code={`# 1. Cloner le repository
git clone https://github.com/AlCisse/immo-guinee.git
cd immo-guinee

# 2. Configurer les secrets Docker
./scripts/create-secrets.sh

# 3. Deployer
./scripts/deploy-swarm.sh

# 4. Verifier les services
docker service ls

# 5. Executer les migrations
docker exec $(docker ps -q -f name=immog_php) php artisan migrate --force`}
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
                    <span className="text-neutral-600 dark:text-neutral-400">Grafana</span>
                    <code className="text-sm text-neutral-800 dark:text-neutral-200">monitoring.immoguinee.com</code>
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
                  href="/api/documentation"
                  target="_blank"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  <span>API Swagger</span>
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
