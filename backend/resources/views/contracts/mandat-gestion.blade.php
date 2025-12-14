<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mandat de Gestion Locative</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #22c55e; padding-bottom: 20px; }
        .logo { font-size: 24pt; font-weight: bold; color: #22c55e; }
        .logo span { color: #ef4444; }
        .title { font-size: 18pt; font-weight: bold; margin: 15px 0; color: #1f2937; }
        .subtitle { font-size: 12pt; color: #6b7280; }
        .reference { font-size: 10pt; color: #9ca3af; margin-top: 10px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 13pt; font-weight: bold; color: #22c55e; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb; }
        .party { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
        .party-title { font-weight: bold; color: #374151; margin-bottom: 8px; }
        .party-info { font-size: 10pt; }
        .mandataire { background-color: #ecfdf5; padding: 15px; border-radius: 5px; border-left: 4px solid #22c55e; }
        .property { background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .services { background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .service-item { padding: 5px 0; border-bottom: 1px dotted #d1d5db; }
        .service-item:last-child { border-bottom: none; }
        .financial { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .financial-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .clauses { font-size: 10pt; text-align: justify; }
        .clause { margin-bottom: 12px; }
        .clause-title { font-weight: bold; margin-bottom: 5px; }
        .signatures { margin-top: 40px; page-break-inside: avoid; }
        .signature-row { display: flex; justify-content: space-between; }
        .signature-box { width: 45%; border: 1px solid #d1d5db; padding: 20px; border-radius: 5px; min-height: 100px; }
        .signature-label { font-weight: bold; font-size: 10pt; margin-bottom: 10px; }
        .signature-date { font-size: 9pt; color: #6b7280; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
        .legal-notice { background-color: #f3f4f6; padding: 10px; font-size: 9pt; margin-top: 20px; border-radius: 5px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Immo<span>Guinée</span></div>
        <div class="title">MANDAT DE GESTION LOCATIVE</div>
        <div class="subtitle">Délégation de Gestion Immobilière</div>
        <div class="reference">Référence: {{ $reference }} | Généré le {{ $generated_at }}</div>
    </div>

    <div class="section">
        <div class="section-title">PARTIES AU MANDAT</div>

        <div class="party">
            <div class="party-title">LE MANDANT (Propriétaire)</div>
            <div class="party-info">
                <strong>Nom complet:</strong> {{ $landlord->nom ?? 'N/A' }} {{ $landlord->prenom ?? '' }}<br>
                <strong>Téléphone:</strong> {{ $landlord->telephone ?? 'N/A' }}<br>
                <strong>Email:</strong> {{ $landlord->email ?? 'N/A' }}<br>
                <strong>Adresse:</strong> {{ $landlord->adresse ?? 'Conakry, Guinée' }}<br>
                <strong>CNI/Passeport:</strong> {{ $data['mandant_cni'] ?? 'À compléter' }}
            </div>
        </div>

        <div class="mandataire">
            <div class="party-title">LE MANDATAIRE</div>
            <div class="party-info">
                <strong>Raison sociale:</strong> ImmoGuinée SARL<br>
                <strong>RCCM:</strong> GN.TCC.2024.A.XXXXX<br>
                <strong>Siège social:</strong> Conakry, République de Guinée<br>
                <strong>Représentant légal:</strong> Directeur Général<br>
                <strong>Contact:</strong> support@immoguinee.com | +224 XXX XXX XXX
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">BIEN(S) OBJET DU MANDAT</div>
        <div class="property">
            <strong>Type de bien:</strong> {{ ucfirst($listing->type_bien ?? 'Appartement') }}<br>
            <strong>Adresse complète:</strong> {{ $listing->adresse ?? 'N/A' }}<br>
            <strong>Quartier:</strong> {{ $listing->quartier ?? 'N/A' }}, {{ $listing->commune ?? 'Conakry' }}<br>
            <strong>Superficie:</strong> {{ $listing->superficie ?? 'N/A' }} m²<br>
            <strong>Nombre de pièces:</strong> {{ $listing->nombre_chambres ?? 'N/A' }} chambres<br>
            <strong>Loyer mensuel souhaité:</strong> {{ number_format($listing->prix ?? 0, 0, ',', ' ') }} GNF
        </div>

        <!-- Propriétaire enregistré de l'annonce -->
        @if(isset($proprietaire) && $proprietaire)
        <div class="property" style="background-color: #f0fdf4; border-left: 4px solid #22c55e; margin-top: 15px;">
            <strong style="color: #22c55e;">Propriétaire enregistré de l'annonce:</strong><br>
            <strong>Nom complet:</strong> {{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}<br>
            <strong>Téléphone:</strong> {{ $proprietaire->telephone ?? 'N/A' }}<br>
            <strong>Email:</strong> {{ $proprietaire->email ?? 'N/A' }}<br>
            @if($proprietaire->badge)
            <strong>Badge ImmoGuinée:</strong> {{ $proprietaire->badge }}
            @endif
        </div>
        @endif

        <!-- Détails de l'annonce -->
        <div class="property" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin-top: 15px;">
            <strong style="color: #f59e0b;">Détails de l'annonce:</strong><br>
            <strong>Titre:</strong> {{ $listing->titre ?? 'Bien immobilier' }}<br>
            <strong>Type de bien:</strong> {{ ucfirst($listing->type_bien ?? 'Appartement') }}<br>
            @if($listing->description)
            <strong>Description:</strong> {{ Str::limit($listing->description, 150) }}<br>
            @endif
            <strong>Transaction:</strong> {{ $listing->type_transaction ?? 'LOCATION' }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">SERVICES INCLUS DANS LE MANDAT</div>
        <div class="services">
            <div class="service-item">✓ Publication et promotion de l'annonce sur la plateforme</div>
            <div class="service-item">✓ Sélection et vérification des candidats locataires</div>
            <div class="service-item">✓ Organisation des visites</div>
            <div class="service-item">✓ Rédaction du bail de location</div>
            <div class="service-item">✓ Réalisation des états des lieux (entrée et sortie)</div>
            <div class="service-item">✓ Encaissement des loyers et charges</div>
            <div class="service-item">✓ Reversement mensuel au propriétaire</div>
            <div class="service-item">✓ Gestion des réclamations et petites réparations</div>
            <div class="service-item">✓ Suivi des impayés et relances</div>
            <div class="service-item">✓ Reporting mensuel (état des lieux, paiements)</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">CONDITIONS FINANCIÈRES</div>
        <div class="financial">
            <div class="financial-row">
                <span>Honoraires de mise en location (à la signature du bail):</span>
                <span>50% d'un mois de loyer</span>
            </div>
            <div class="financial-row">
                <span>Commission de gestion mensuelle:</span>
                <span>{{ $data['commission_pourcentage'] ?? 8 }}% du loyer encaissé</span>
            </div>
            <div class="financial-row">
                <span>Frais d'état des lieux:</span>
                <span>Inclus</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DURÉE DU MANDAT</div>
        <p><strong>Date d'effet:</strong> {{ \Carbon\Carbon::parse($data['date_debut'] ?? now())->format('d/m/Y') }}</p>
        <p><strong>Durée initiale:</strong> {{ $data['duree_mois'] ?? 12 }} mois</p>
        <p><strong>Renouvellement:</strong> Tacite reconduction sauf dénonciation avec préavis de 3 mois</p>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <div class="section-title">OBLIGATIONS DES PARTIES</div>
        <div class="clauses">
            <div class="clause">
                <div class="clause-title">Obligations du mandataire (ImmoGuinée)</div>
                - Gérer le bien en bon père de famille<br>
                - Rechercher activement des locataires solvables<br>
                - Encaisser les loyers et les reverser dans les 10 jours ouvrés<br>
                - Tenir une comptabilité précise et transparente<br>
                - Informer le mandant de tout événement important<br>
                - Assurer le suivi des réparations courantes
            </div>

            <div class="clause">
                <div class="clause-title">Obligations du mandant (Propriétaire)</div>
                - Fournir tous les documents nécessaires à la location<br>
                - Maintenir le bien en état de location<br>
                - Assurer le bien (multirisque habitation propriétaire non occupant)<br>
                - Payer les charges de copropriété éventuelles<br>
                - Régler les honoraires et commissions convenus
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">RÉSILIATION</div>
        <div class="clauses">
            <div class="clause">
                Le présent mandat peut être résilié par l'une ou l'autre des parties moyennant un préavis de 3 mois, notifié par écrit. En cas de vente du bien, le mandat prend fin automatiquement à la date de signature de l'acte authentique.
            </div>
        </div>
    </div>

    <div class="legal-notice">
        <strong>Conformité:</strong> Ce mandat est régi par les dispositions du Code Civil guinéen relatives au mandat (Articles 1984 et suivants) et aux obligations des agents immobiliers.
    </div>

    <div class="signatures">
        <div class="section-title">SIGNATURES</div>
        <div class="signature-row">
            <div class="signature-box">
                <div class="signature-label">LE MANDANT</div>
                @if(isset($contract->date_signature_proprietaire))
                <div class="signature-date">Signé le {{ \Carbon\Carbon::parse($contract->date_signature_proprietaire)->format('d/m/Y à H:i') }}</div>
                @else
                <div class="signature-date">En attente</div>
                @endif
            </div>
            <div class="signature-box">
                <div class="signature-label">LE MANDATAIRE (ImmoGuinée)</div>
                <div class="signature-date">Pour ImmoGuinée SARL<br>Le Directeur Général</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée</strong> - Gestion locative professionnelle</p>
        <p>Référence: {{ $reference }}</p>
    </div>
</body>
</html>
