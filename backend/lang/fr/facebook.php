<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Facebook Integration - French Translations
    |--------------------------------------------------------------------------
    |
    | Messages pour l'integration Facebook Pages
    |
    */

    // Connection status
    'status' => [
        'not_connected' => 'Page Facebook non connectee',
        'connected' => 'Page Facebook connectee',
        'disabled' => 'Publication automatique desactivee',
        'token_expired' => 'Token expire, veuillez reconnecter',
        'published' => 'Publie sur Facebook',
        'ready' => 'Pret a publier',
        'failed' => 'Echec de la publication',
    ],

    // Connection flow
    'connect' => [
        'redirect' => 'Redirection vers Facebook...',
        'success' => 'Page Facebook connectee avec succes',
        'cancelled' => 'Connexion Facebook annulee',
    ],

    // Disconnect
    'disconnect' => [
        'success' => 'Page Facebook deconnectee',
        'confirm' => 'Etes-vous sur de vouloir deconnecter votre page Facebook ?',
    ],

    // Auto-publish
    'auto_publish' => [
        'enabled' => 'Publication automatique activee',
        'disabled' => 'Publication automatique desactivee',
        'toggle' => 'Activer/Desactiver la publication automatique',
    ],

    // Publishing
    'publish' => [
        'success' => 'Annonce publiee sur Facebook',
        'pending' => 'Publication en cours...',
        'queued' => 'Publication ajoutee a la file d\'attente',
    ],

    // Deletion
    'delete' => [
        'success' => 'Publication Facebook supprimee',
        'pending' => 'Suppression en cours...',
        'confirm' => 'Supprimer cette publication Facebook ?',
    ],

    // Token
    'token' => [
        'refreshed' => 'Token actualise avec succes',
        'expiring_soon' => 'Votre token Facebook expire bientot',
        'expired_notice' => 'Veuillez reconnecter votre page Facebook',
    ],

    // Errors
    'error' => [
        'not_connected' => 'Aucune page Facebook connectee',
        'already_connected' => 'Une page Facebook est deja connectee',
        'connect_failed' => 'Echec de la connexion Facebook',
        'disconnect_failed' => 'Echec de la deconnexion',
        'invalid_state' => 'Token de securite invalide',
        'no_pages' => 'Aucune page Facebook trouvee sur votre compte',
        'token_expired' => 'Token Facebook expire',
        'token_refresh_failed' => 'Impossible d\'actualiser le token',
        'permission_revoked' => 'Permissions Facebook revoquees',
        'rate_limited' => 'Trop de requetes, reessayez plus tard',
        'page_not_found' => 'Page Facebook introuvable',
        'publish_failed' => 'Echec de la publication',
        'delete_failed' => 'Echec de la suppression',
        'already_published' => 'Annonce deja publiee sur Facebook',
        'not_published' => 'Annonce non publiee sur Facebook',
        'not_owner' => 'Vous n\'etes pas proprietaire de cette annonce',
        'watermark_not_found' => 'Logo de filigrane introuvable',
        'image_not_found' => 'Image introuvable',
        'connection_not_found' => 'Connexion Facebook introuvable',
        'auto_publish_disabled' => 'Publication automatique desactivee',
        'network_error' => 'Erreur reseau, reessayez',
    ],

    // Notifications
    'notification' => [
        'published' => 'Votre annonce ":title" a ete publiee sur Facebook',
        'deleted' => 'Votre publication Facebook pour ":title" a ete supprimee',
        'token_expiring' => 'Votre token Facebook expire dans :days jours',
        'publish_failed' => 'Echec de la publication de ":title" sur Facebook',
    ],

    // Admin
    'admin' => [
        'connections' => 'Connexions Facebook',
        'posts' => 'Publications Facebook',
        'statistics' => 'Statistiques Facebook',
    ],
];
