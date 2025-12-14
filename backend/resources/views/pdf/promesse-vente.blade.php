<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Promesse de Vente</title>
    <style>
        @page { margin: 2cm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.6; color: #000; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .header h1 { margin: 0; font-size: 18pt; font-weight: bold; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 13pt; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
        .party { margin-left: 20px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table th, table td { border: 1px solid #333; padding: 8px; }
        table th { background-color: #f0f0f0; }
        .signature-section { margin-top: 50px; display: table; width: 100%; }
        .signature-box { display: table-cell; width: 45%; text-align: center; padding: 20px; }
        .signature-line { margin-top: 60px; border-top: 1px solid #000; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PROMESSE DE VENTE</h1>
        <div>Contrat N° {{ $contract->numero_contrat }}</div>
        <div>Date: {{ $contract->date_debut->format('d/m/Y') }}</div>
    </div>

    <div class="section">
        <div class="section-title">PARTIES CONTRACTANTES</div>
        <div class="party">
            <strong>LE VENDEUR:</strong><br>
            {{ $vendeur->nom_complet }}<br>
            Téléphone: {{ $vendeur->telephone }}<br>
            Badge: {{ $vendeur->badge_certification }}
        </div>
        <div class="party">
            <strong>L'ACHETEUR:</strong><br>
            {{ $acheteur->nom_complet }}<br>
            Téléphone: {{ $acheteur->telephone }}<br>
            Badge: {{ $acheteur->badge_certification }}
        </div>
    </div>

    <div class="section">
        <div class="section-title">BIEN IMMOBILIER</div>
        <p><strong>Adresse:</strong> {{ $listing->adresse }} - {{ $listing->commune }}</p>
        <p><strong>Type:</strong> {{ $listing->type_propriete }}</p>
        <p><strong>Surface:</strong> {{ $listing->superficie_m2 }} m²</p>
        <p><strong>Description:</strong> {{ $listing->description }}</p>
    </div>

    <div class="section">
        <div class="section-title">CONDITIONS DE VENTE</div>
        <table>
            <tr>
                <th>Prix de vente</th>
                <td><strong>{{ number_format($contract->donnees_personnalisees['prix_vente_gnf'], 0, ',', ' ') }} GNF</strong></td>
            </tr>
            <tr>
                <th>Arrhes versées</th>
                <td>{{ number_format($contract->donnees_personnalisees['arrhes_gnf'] ?? 0, 0, ',', ' ') }} GNF</td>
            </tr>
            <tr>
                <th>Solde à payer</th>
                <td>{{ number_format(($contract->donnees_personnalisees['prix_vente_gnf'] - ($contract->donnees_personnalisees['arrhes_gnf'] ?? 0)), 0, ',', ' ') }} GNF</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">CLAUSES PARTICULIÈRES</div>
        <p><strong>Article 1 - Validité:</strong> Cette promesse est valable jusqu'au {{ $contract->date_fin->format('d/m/Y') }}.</p>
        <p><strong>Article 2 - Conditions suspensives:</strong> Obtention du financement bancaire par l'acheteur.</p>
        <p><strong>Article 3 - Pénalités:</strong> En cas de rétractation injustifiée, les arrhes seront conservées par la partie lésée.</p>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <strong>LE VENDEUR</strong>
            <div class="signature-line">{{ $vendeur->nom_complet }}</div>
        </div>
        <div class="signature-box">
            <strong>L'ACHETEUR</strong>
            <div class="signature-line">{{ $acheteur->nom_complet }}</div>
        </div>
    </div>

    <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #666;">
        Document généré par ImmoGuinée - {{ now()->format('d/m/Y H:i') }}
    </div>
</body>
</html>
