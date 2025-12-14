<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bail de Location Résidentiel</title>
    <style>
        @page { margin: 2cm; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 18pt;
            font-weight: bold;
        }
        .contract-number {
            font-size: 10pt;
            color: #666;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            font-size: 13pt;
            margin-bottom: 10px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .party {
            margin-left: 20px;
            margin-bottom: 10px;
        }
        .party strong {
            text-decoration: underline;
        }
        .article {
            margin-bottom: 15px;
        }
        .article-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .signature-section {
            margin-top: 50px;
            display: table;
            width: 100%;
        }
        .signature-box {
            display: table-cell;
            width: 45%;
            text-align: center;
            padding: 20px;
        }
        .signature-line {
            margin-top: 60px;
            border-top: 1px solid #000;
            padding-top: 5px;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        table th, table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }
        table th {
            background-color: #f0f0f0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>BAIL DE LOCATION À USAGE D'HABITATION</h1>
        <div class="contract-number">Contrat N° {{ $contract->numero_contrat }}</div>
        <div class="contract-number">Date: {{ $contract->date_debut->format('d/m/Y') }}</div>
    </div>

    <div class="section">
        <div class="section-title">ENTRE LES SOUSSIGNÉS</div>

        <div class="party">
            <strong>LE BAILLEUR :</strong><br>
            Nom complet: {{ $bailleur->nom_complet }}<br>
            Adresse: {{ $bailleur->adresse }}<br>
            Téléphone: {{ $bailleur->telephone }}<br>
            CNI: {{ $bailleur->numero_cni ?? 'Non fourni' }}<br>
            Badge: {{ $bailleur->badge_certification }}
        </div>

        <div class="party">
            <strong>LE LOCATAIRE :</strong><br>
            Nom complet: {{ $locataire->nom_complet }}<br>
            Adresse: {{ $locataire->adresse }}<br>
            Téléphone: {{ $locataire->telephone }}<br>
            CNI: {{ $locataire->numero_cni ?? 'Non fourni' }}<br>
            Badge: {{ $locataire->badge_certification }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">OBJET DU CONTRAT</div>
        <p>Le bailleur donne en location au locataire qui accepte, un logement situé à :</p>
        <p style="margin-left: 20px;">
            <strong>{{ $listing->adresse }}</strong><br>
            Commune: {{ $listing->commune }}<br>
            Type: {{ $listing->type_propriete }}<br>
            Surface: {{ $listing->superficie_m2 }} m²<br>
            Chambres: {{ $listing->nombre_chambres }} | Salons: {{ $listing->nombre_salons }}<br>
            Description: {{ $listing->description }}
        </p>
    </div>

    @if(isset($proprietaire) && $proprietaire)
    <div class="section">
        <div class="section-title">PROPRIÉTAIRE DU BIEN ET DÉTAILS DE L'ANNONCE</div>
        <div class="party" style="background-color: #f0fdf4; border-left: 4px solid #22c55e;">
            <strong>Propriétaire enregistré:</strong><br>
            Nom complet: {{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}<br>
            Téléphone: {{ $proprietaire->telephone ?? 'N/A' }}<br>
            Email: {{ $proprietaire->email ?? 'N/A' }}<br>
            @if($proprietaire->badge)
            Badge: {{ $proprietaire->badge_certification ?? $proprietaire->badge }}
            @endif
        </div>
        <div class="party" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin-top: 10px;">
            <strong>Détails de l'annonce:</strong><br>
            Titre: {{ $listing->titre ?? 'Bien immobilier' }}<br>
            Type de bien: {{ ucfirst($listing->type_bien ?? $listing->type_propriete ?? 'N/A') }}<br>
            @if($listing->description)
            Description: {{ Str::limit($listing->description, 150) }}<br>
            @endif
            Transaction: {{ $listing->type_transaction ?? 'LOCATION' }}<br>
            @if($listing->loyer_mensuel)
            Loyer mensuel: {{ number_format($listing->loyer_mensuel, 0, ',', ' ') }} GNF<br>
            @endif
            @if($listing->caution)
            Caution: {{ number_format($listing->caution, 0, ',', ' ') }} GNF<br>
            @endif
            @if($listing->avance)
            Avance: {{ number_format($listing->avance, 0, ',', ' ') }} GNF
            @endif
        </div>
    </div>
    @endif

    <div class="section">
        <div class="section-title">CONDITIONS FINANCIÈRES</div>

        <table>
            <tr>
                <th>Désignation</th>
                <th>Montant (GNF)</th>
            </tr>
            <tr>
                <td>Loyer mensuel</td>
                <td>{{ number_format($contract->donnees_personnalisees['montant_loyer_gnf'] ?? 0, 0, ',', ' ') }}</td>
            </tr>
            <tr>
                <td>Caution (2 mois)</td>
                <td>{{ number_format(($contract->donnees_personnalisees['montant_loyer_gnf'] ?? 0) * 2, 0, ',', ' ') }}</td>
            </tr>
            <tr>
                <td>Avance ({{ $contract->donnees_personnalisees['mois_avance'] ?? 1 }} mois)</td>
                <td>{{ number_format(($contract->donnees_personnalisees['montant_loyer_gnf'] ?? 0) * ($contract->donnees_personnalisees['mois_avance'] ?? 1), 0, ',', ' ') }}</td>
            </tr>
        </table>

        <p>Le loyer est payable le {{ $contract->donnees_personnalisees['jour_paiement'] ?? 1 }} de chaque mois.</p>
    </div>

    <div class="section">
        <div class="section-title">DURÉE DU BAIL</div>
        <p>
            Date de début: <strong>{{ $contract->date_debut->format('d/m/Y') }}</strong><br>
            Date de fin: <strong>{{ $contract->date_fin->format('d/m/Y') }}</strong><br>
            Durée: <strong>{{ $contract->date_debut->diffInMonths($contract->date_fin) }} mois</strong>
        </p>
    </div>

    <div class="section">
        <div class="section-title">CLAUSES PARTICULIÈRES</div>

        <div class="article">
            <div class="article-title">Article 1 - État des lieux</div>
            <p>Un état des lieux contradictoire sera établi à l'entrée et à la sortie du locataire.</p>
        </div>

        <div class="article">
            <div class="article-title">Article 2 - Charges</div>
            <p>Les charges (eau, électricité) sont à la charge du locataire.</p>
        </div>

        <div class="article">
            <div class="article-title">Article 3 - Assurance</div>
            <p>Le locataire s'engage à souscrire une assurance habitation et à en fournir l'attestation au bailleur.</p>
        </div>

        <div class="article">
            <div class="article-title">Article 4 - Résiliation</div>
            <p>Chaque partie peut résilier le bail avec un préavis de {{ $contract->donnees_personnalisees['preavis_mois'] ?? 2 }} mois.</p>
        </div>

        @if(isset($contract->donnees_personnalisees['clauses_specifiques']))
        <div class="article">
            <div class="article-title">Article 5 - Clauses spécifiques</div>
            <p>{{ $contract->donnees_personnalisees['clauses_specifiques'] }}</p>
        </div>
        @endif
    </div>

    <div class="section">
        <div class="section-title">SIGNATURES</div>
        <p>Fait en deux exemplaires originaux, dont un pour chaque partie.</p>
        <p>À Conakry, le {{ now()->format('d/m/Y') }}</p>

        <div class="signature-section">
            <div class="signature-box">
                <strong>LE BAILLEUR</strong>
                <div class="signature-line">
                    @if($contract->signature_bailleur)
                    <img src="{{ $contract->signature_bailleur }}" alt="Signature Bailleur" style="max-width: 150px;">
                    @endif
                    {{ $bailleur->nom_complet }}
                </div>
            </div>
            <div class="signature-box">
                <strong>LE LOCATAIRE</strong>
                <div class="signature-line">
                    @if($contract->signature_locataire)
                    <img src="{{ $contract->signature_locataire }}" alt="Signature Locataire" style="max-width: 150px;">
                    @endif
                    {{ $locataire->nom_complet }}
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        Document généré par ImmoGuinée - {{ now()->format('d/m/Y H:i') }}<br>
        Ce document est crypté et sécurisé selon les normes FR-038
    </div>
</body>
</html>
