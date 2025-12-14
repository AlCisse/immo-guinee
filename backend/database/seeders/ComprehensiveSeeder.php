<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Listing;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Visit;
use App\Models\Rating;
use App\Models\Notification;
use App\Models\Dispute;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ComprehensiveSeeder extends Seeder
{
    private $quartiers = [
        'Kaloum' => ['Boulbinet', 'Almamya', 'Sandervalia', 'Tombo', 'Manquepas'],
        'Dixinn' => ['Belle Vue', 'Dixinn Centre', 'Cameroun', 'Landreah', 'Université'],
        'Matam' => ['Hamdallaye', 'Bonfi', 'Madina', 'Matam Centre', 'Carrière'],
        'Ratoma' => ['Kipé', 'Kaporo', 'Nongo', 'Lambanyi', 'Cosa', 'Sonfonia'],
        'Matoto' => ['Matoto Centre', 'Dabondy', 'Sangoya', 'Gbessia', 'Tanene'],
    ];

    private $typesAnnonce = ['APPARTEMENT', 'MAISON', 'TERRAIN', 'BUREAU', 'MAGASIN', 'ENTREPOT'];
    private $typesBien = ['LOCATION', 'VENTE'];

    public function run(): void
    {
        $this->command->info('=== Seeding comprehensive data ===');

        // Get existing users
        $users = User::all();
        $proprietaires = $users->filter(fn($u) => $u->hasRole('proprietaire') || $u->hasRole('agence'));
        $chercheurs = $users->filter(fn($u) => $u->hasRole('chercheur'));

        if ($proprietaires->isEmpty() || $chercheurs->isEmpty()) {
            $this->command->error('No users found. Run DatabaseSeeder first.');
            return;
        }

        // Create conversations and messages (skip if already exists)
        if (Conversation::count() < 5) {
            $this->createConversationsAndMessages($proprietaires, $chercheurs);
        } else {
            $this->command->info('Conversations already exist, skipping...');
        }

        // Create visits (skip if already exists)
        if (Visit::count() < 5) {
            $this->createVisits($proprietaires, $chercheurs);
        } else {
            $this->command->info('Visits already exist, skipping...');
        }

        // Create notifications (skip if already exists)
        if (Notification::count() < 10) {
            $this->createNotifications($users);
        } else {
            $this->command->info('Notifications already exist, skipping...');
        }

        // Create ratings (skip if already exists)
        if (Rating::count() < 5) {
            $this->createRatings($proprietaires, $chercheurs);
        } else {
            $this->command->info('Ratings already exist, skipping...');
        }

        // Create disputes (skip if already exists)
        if (Dispute::count() < 3) {
            $this->createDisputes();
        } else {
            $this->command->info('Disputes already exist, skipping...');
        }

        $this->command->info('=== Comprehensive seeding complete ===');
    }

    /**
     * Create conversations and messages between users
     */
    protected function createConversationsAndMessages($proprietaires, $chercheurs): void
    {
        $this->command->info('Creating conversations and messages...');

        $listings = Listing::with('user')->get();
        $conversationCount = 0;
        $messageCount = 0;

        $sampleMessages = [
            'Bonjour, je suis intéressé par votre annonce. Est-ce que le bien est toujours disponible ?',
            'Oui, il est toujours disponible. Quand souhaiteriez-vous le visiter ?',
            'Je suis disponible ce weekend. Samedi matin vous conviendrait ?',
            'Samedi à 10h serait parfait. Je vous envoie l\'adresse exacte.',
            'Merci beaucoup ! À samedi alors.',
            'Bonjour, pouvez-vous me donner plus de détails sur les charges mensuelles ?',
            'Les charges comprennent l\'eau et la gestion de l\'immeuble, environ 150 000 GNF par mois.',
            'D\'accord, merci pour l\'information. Et concernant le parking ?',
            'Il y a un parking gratuit dans la cour, 2 places disponibles.',
            'Parfait, je souhaite visiter le bien.',
            'Est-ce que la caution est négociable ?',
            'On peut en discuter lors de la visite.',
            'Le quartier est-il sécurisé ?',
            'Oui, très calme. Il y a un gardien 24h/24.',
            'Quand puis-je emménager si je signe ?',
            'Dès la signature du contrat, le bien est disponible immédiatement.',
            'Y a-t-il des travaux prévus dans l\'immeuble ?',
            'Non, tout a été rénové récemment.',
            'Merci pour votre réactivité !',
            'Je vous en prie. N\'hésitez pas si vous avez d\'autres questions.',
        ];

        foreach ($listings->take(15) as $listing) {
            // Each listing gets 1-3 conversations
            $numConversations = rand(1, 3);
            $usedChercheurs = [];

            for ($i = 0; $i < $numConversations; $i++) {
                // Pick a random chercheur not already in conversation for this listing
                $availableChercheurs = $chercheurs->filter(fn($c) => !in_array($c->id, $usedChercheurs));
                if ($availableChercheurs->isEmpty()) break;

                $chercheur = $availableChercheurs->random();
                $usedChercheurs[] = $chercheur->id;

                // Create conversation using correct column names
                $conversation = Conversation::create([
                    'initiator_id' => $chercheur->id,      // Chercheur initiates
                    'participant_id' => $listing->user_id, // Proprietaire is participant
                    'listing_id' => $listing->id,
                    'last_message_at' => now()->subHours(rand(1, 72)),
                    'subject' => 'Demande concernant: ' . substr($listing->titre, 0, 50),
                ]);
                $conversationCount++;

                // Add 3-8 messages to the conversation
                $numMessages = rand(3, 8);
                $participants = [$listing->user_id, $chercheur->id];
                $currentParticipant = 1; // Start with chercheur

                for ($j = 0; $j < $numMessages; $j++) {
                    $senderId = $participants[$currentParticipant];
                    $messageText = $sampleMessages[array_rand($sampleMessages)];
                    $createdAt = now()->subHours(rand(1, 168))->addMinutes($j * rand(5, 60));

                    Message::create([
                        'conversation_id' => $conversation->id,
                        'sender_id' => $senderId,
                        'contenu' => $messageText,
                        'type_message' => 'TEXT',
                        'is_read' => $j < $numMessages - 2 ? true : (rand(0, 1) == 1),
                        'created_at' => $createdAt,
                        'updated_at' => $createdAt,
                    ]);
                    $messageCount++;

                    // Alternate sender
                    $currentParticipant = $currentParticipant == 0 ? 1 : 0;
                }

                // Update last message timestamp
                $lastMessage = Message::where('conversation_id', $conversation->id)
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($lastMessage) {
                    $conversation->update([
                        'last_message_at' => $lastMessage->created_at,
                    ]);
                }
            }
        }

        $this->command->info("Created {$conversationCount} conversations with {$messageCount} messages");
    }

    /**
     * Create visits for listings
     */
    protected function createVisits($proprietaires, $chercheurs): void
    {
        $this->command->info('Creating visits...');

        $listings = Listing::where('statut', 'ACTIVE')->get();
        $visitCount = 0;
        $statuts = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

        foreach ($listings->take(20) as $listing) {
            // Each listing gets 0-4 visits
            $numVisits = rand(0, 4);

            for ($i = 0; $i < $numVisits; $i++) {
                $chercheur = $chercheurs->random();
                $statut = $statuts[array_rand($statuts)];
                $dateVisite = now()->addDays(rand(-30, 14));

                // Past visits should be completed or cancelled
                if ($dateVisite->isPast()) {
                    $statut = rand(0, 1) == 0 ? 'COMPLETED' : 'CANCELLED';
                } else {
                    $statut = rand(0, 1) == 0 ? 'PENDING' : 'CONFIRMED';
                }

                $createdAt = $dateVisite->copy()->subDays(rand(1, 7));

                Visit::create([
                    'listing_id' => $listing->id,
                    'proprietaire_id' => $listing->user_id,
                    'visiteur_id' => $chercheur->id,
                    'client_nom' => $chercheur->nom_complet,
                    'client_telephone' => $chercheur->telephone,
                    'client_email' => $chercheur->email,
                    'date_visite' => $dateVisite->format('Y-m-d'),
                    'heure_visite' => sprintf('%02d:00:00', rand(8, 18)),
                    'duree_minutes' => 30,
                    'statut' => $statut,
                    'notes' => $statut == 'CANCELLED' ? 'Annulée par le visiteur' : null,
                    'confirmed_at' => $statut == 'CONFIRMED' || $statut == 'COMPLETED' ? $createdAt->addHours(rand(1, 24)) : null,
                    'completed_at' => $statut == 'COMPLETED' ? $dateVisite->addHours(1) : null,
                    'cancelled_at' => $statut == 'CANCELLED' ? $createdAt->addDays(rand(1, 3)) : null,
                    'created_at' => $createdAt,
                ]);
                $visitCount++;
            }
        }

        $this->command->info("Created {$visitCount} visits");
    }

    /**
     * Create notifications for users
     */
    protected function createNotifications($users): void
    {
        $this->command->info('Creating notifications...');

        $notificationCount = 0;
        $notificationTypes = [
            [
                'type' => Notification::TYPE_WELCOME,
                'titre' => 'Bienvenue sur ImmoGuinée !',
                'message' => 'Nous sommes ravis de vous accueillir. Commencez à explorer les annonces immobilières.',
            ],
            [
                'type' => Notification::TYPE_LISTING_APPROVED,
                'titre' => 'Annonce approuvée',
                'message' => 'Votre annonce a été approuvée et est maintenant visible.',
            ],
            [
                'type' => Notification::TYPE_MESSAGE_RECEIVED,
                'titre' => 'Nouveau message',
                'message' => 'Vous avez reçu un nouveau message concernant une annonce.',
            ],
            [
                'type' => Notification::TYPE_VISIT_REQUESTED,
                'titre' => 'Demande de visite',
                'message' => 'Quelqu\'un souhaite visiter votre bien.',
            ],
            [
                'type' => Notification::TYPE_VISIT_CONFIRMED,
                'titre' => 'Visite confirmée',
                'message' => 'Votre demande de visite a été confirmée.',
            ],
            [
                'type' => Notification::TYPE_CONTRACT_CREATED,
                'titre' => 'Nouveau contrat',
                'message' => 'Un contrat de location a été créé pour votre bien.',
            ],
            [
                'type' => Notification::TYPE_PAYMENT_RECEIVED,
                'titre' => 'Paiement reçu',
                'message' => 'Un paiement a été effectué pour votre location.',
            ],
            [
                'type' => Notification::TYPE_RATING_RECEIVED,
                'titre' => 'Nouvelle évaluation',
                'message' => 'Vous avez reçu une nouvelle évaluation.',
            ],
            [
                'type' => Notification::TYPE_SYSTEM,
                'titre' => 'Mise à jour système',
                'message' => 'De nouvelles fonctionnalités sont disponibles sur ImmoGuinée.',
            ],
        ];

        $priorities = ['LOW', 'NORMAL', 'NORMAL', 'NORMAL', 'HIGH', 'URGENT'];

        foreach ($users as $user) {
            // Each user gets 3-10 notifications
            $numNotifications = rand(3, 10);

            for ($i = 0; $i < $numNotifications; $i++) {
                $notifData = $notificationTypes[array_rand($notificationTypes)];
                $createdAt = now()->subDays(rand(0, 30))->subHours(rand(0, 23));

                Notification::create([
                    'user_id' => $user->id,
                    'type' => $notifData['type'],
                    'titre' => $notifData['titre'],
                    'message' => $notifData['message'],
                    'priority' => $priorities[array_rand($priorities)],
                    'is_read' => rand(0, 1) == 1,
                    'read_at' => rand(0, 1) == 1 ? $createdAt->addHours(rand(1, 24)) : null,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
                $notificationCount++;
            }
        }

        $this->command->info("Created {$notificationCount} notifications");
    }

    /**
     * Create ratings between users
     */
    protected function createRatings($proprietaires, $chercheurs): void
    {
        $this->command->info('Creating ratings...');

        $contracts = Contract::where('statut', 'ACTIF')->with(['bailleur', 'locataire'])->get();
        $ratingCount = 0;

        $commentaires = [
            5 => [
                'Excellent propriétaire, très réactif et professionnel.',
                'Appartement impeccable, comme décrit. Je recommande !',
                'Transaction fluide, communication parfaite.',
                'Le bien correspond parfaitement à l\'annonce. Très satisfait.',
                'Propriétaire à l\'écoute et arrangeant. Top !',
            ],
            4 => [
                'Bon propriétaire, quelques petits détails à améliorer.',
                'Logement conforme, bon rapport qualité/prix.',
                'Bonne expérience dans l\'ensemble.',
                'Réactif et professionnel.',
            ],
            3 => [
                'Expérience correcte, rien de particulier à signaler.',
                'Logement moyen, correspond à peu près à l\'annonce.',
                'Communication parfois difficile.',
            ],
            2 => [
                'Quelques problèmes de communication.',
                'Le bien ne correspondait pas totalement à l\'annonce.',
            ],
            1 => [
                'Très déçu par cette expérience.',
            ],
        ];

        foreach ($contracts->take(10) as $contract) {
            // Rating from tenant to landlord
            $note = rand(3, 5);
            $comments = $commentaires[$note];

            Rating::create([
                'evaluateur_id' => $contract->locataire_id,
                'evalue_id' => $contract->bailleur_id,
                'contract_id' => $contract->id,
                'note' => $note,
                'commentaire' => $comments[array_rand($comments)],
                'is_published' => true,
                'is_flagged' => false,
                'created_at' => now()->subDays(rand(1, 60)),
            ]);
            $ratingCount++;

            // Rating from landlord to tenant (50% chance)
            if (rand(0, 1) == 1) {
                $note = rand(3, 5);
                $comments = $commentaires[$note];

                Rating::create([
                    'evaluateur_id' => $contract->bailleur_id,
                    'evalue_id' => $contract->locataire_id,
                    'contract_id' => $contract->id,
                    'note' => $note,
                    'commentaire' => str_replace('propriétaire', 'locataire', $comments[array_rand($comments)]),
                    'is_published' => true,
                    'is_flagged' => false,
                    'created_at' => now()->subDays(rand(1, 60)),
                ]);
                $ratingCount++;
            }
        }

        $this->command->info("Created {$ratingCount} ratings");
    }

    /**
     * Create disputes for contracts
     */
    protected function createDisputes(): void
    {
        $this->command->info('Creating disputes...');

        $contracts = Contract::with(['bailleur', 'locataire'])->get();
        $disputeCount = 0;

        $motifs = [
            'NON_PAIEMENT' => [
                'Retard de paiement de loyer',
                'Non paiement des charges',
                'Loyers impayés depuis 3 mois',
            ],
            'DEGRADATION' => [
                'Dégradations dans le logement',
                'Murs endommagés',
                'Equipements cassés',
            ],
            'NON_RESPECT_BAIL' => [
                'Sous-location non autorisée',
                'Nuisances sonores répétées',
                'Non respect du règlement intérieur',
            ],
            'AUTRE' => [
                'Problème de voisinage',
                'Désaccord sur les réparations',
                'Différend sur l\'état des lieux',
            ],
        ];

        $statuts = ['OUVERT', 'EN_MEDIATION', 'RESOLU_AMIABLE', 'RESOLU_JUDICIAIRE', 'FERME'];

        foreach ($contracts->take(5) as $contract) {
            $categorie = array_rand($motifs);
            $motifList = $motifs[$categorie];
            $motif = $motifList[array_rand($motifList)];
            $statut = $statuts[array_rand($statuts)];
            $createdAt = now()->subDays(rand(5, 60));

            Dispute::create([
                'contract_id' => $contract->id,
                'plaignant_id' => rand(0, 1) ? $contract->bailleur_id : $contract->locataire_id,
                'defendeur_id' => rand(0, 1) ? $contract->locataire_id : $contract->bailleur_id,
                'motif' => $motif,
                'description' => "Description détaillée du litige: {$motif}. Le plaignant souhaite une résolution rapide de ce différend.",
                'categorie' => $categorie,
                'statut' => $statut,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            $disputeCount++;
        }

        $this->command->info("Created {$disputeCount} disputes");
    }
}
