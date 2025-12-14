<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrat de Bail - Location Commerciale</title>
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
        .property { background-color: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; }
        .financial { background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .financial-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #d1d5db; }
        .financial-row:last-child { border-bottom: none; font-weight: bold; }
        .clauses { font-size: 10pt; text-align: justify; }
        .clause { margin-bottom: 15px; }
        .clause-title { font-weight: bold; margin-bottom: 5px; }
        .signatures { margin-top: 40px; page-break-inside: avoid; }
        .signature-row { display: flex; justify-content: space-between; }
        .signature-box { width: 45%; border: 1px solid #d1d5db; padding: 20px; border-radius: 5px; min-height: 120px; }
        .signature-label { font-weight: bold; font-size: 10pt; margin-bottom: 10px; }
        .signature-date { font-size: 9pt; color: #6b7280; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
        .legal-notice { background-color: #f3f4f6; padding: 10px; font-size: 9pt; margin-top: 20px; border-radius: 5px; }
        .page-break { page-break-before: always; }
        .commercial-highlight { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Immo<span>Guinée</span></div>
        <div class="title">CONTRAT DE BAIL COMMERCIAL</div>
        <div class="subtitle">Location à Usage Professionnel</div>
        <div class="reference">Référence: {{ $reference }} | Généré le {{ $generated_at }}</div>
    </div>

    <div class="section">
        <div class="section-title">PARTIES CONTRACTANTES</div>

        <div class="party">
            <div class="party-title">LE BAILLEUR</div>
            <div class="party-info">
                <strong>Raison sociale / Nom:</strong> {{ $landlord->nom ?? 'N/A' }} {{ $landlord->prenom ?? '' }}<br>
                <strong>RCCM:</strong> {{ $data['landlord_rccm'] ?? 'N/A' }}<br>
                <strong>NIF:</strong> {{ $data['landlord_nif'] ?? 'N/A' }}<br>
                <strong>Téléphone:</strong> {{ $landlord->telephone ?? 'N/A' }}<br>
                <strong>Siège social:</strong> {{ $landlord->adresse ?? 'Conakry, Guinée' }}
            </div>
        </div>

        <div class="party">
            <div class="party-title">LE PRENEUR</div>
            <div class="party-info">
                <strong>Raison sociale / Nom:</strong> {{ $tenant->nom ?? 'N/A' }} {{ $tenant->prenom ?? '' }}<br>
                <strong>RCCM:</strong> {{ $data['tenant_rccm'] ?? 'N/A' }}<br>
                <strong>NIF:</strong> {{ $data['tenant_nif'] ?? 'N/A' }}<br>
                <strong>Téléphone:</strong> {{ $tenant->telephone ?? 'N/A' }}<br>
                <strong>Siège social actuel:</strong> {{ $tenant->adresse ?? 'Conakry, Guinée' }}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DÉSIGNATION DES LOCAUX COMMERCIAUX</div>
        <div class="property">
            <strong>Type de local:</strong> {{ ucfirst($listing->type_bien ?? 'Bureau') }}<br>
            <strong>Adresse:</strong> {{ $listing->adresse ?? 'N/A' }}<br>
            <strong>Quartier:</strong> {{ $listing->quartier ?? 'N/A' }}, {{ $listing->commune ?? 'Conakry' }}<br>
            <strong>Superficie:</strong> {{ $listing->superficie ?? 'N/A' }} m²<br>
            <strong>Étage:</strong> {{ $data['etage'] ?? 'RDC' }}<br>
            <strong>Accessibilité:</strong> {{ $data['accessibilite'] ?? 'Standard' }}
        </div>

        <div class="commercial-highlight">
            <strong>Activité commerciale autorisée:</strong> {{ $data['activite_commerciale'] ?? 'Commerce général' }}<br>
            <strong>Enseigne autorisée:</strong> {{ $data['enseigne'] ?? 'Oui, selon réglementation' }}
        </div>
    </div>

    <!-- Proprietaire du bien et détails de l'annonce -->
    @if(isset($proprietaire) && $proprietaire)
    <div class="section">
        <div class="section-title">PROPRIÉTAIRE DU BIEN ET DÉTAILS DE L'ANNONCE</div>
        <div class="party" style="background-color: #f0fdf4; border-left: 4px solid #22c55e;">
            <div class="party-title" style="color: #22c55e;">Propriétaire enregistré</div>
            <div class="party-info">
                <strong>Nom complet:</strong> {{ $proprietaire->nom_complet ?? ($proprietaire->nom ?? 'N/A') }} {{ $proprietaire->prenom ?? '' }}<br>
                <strong>Téléphone:</strong> {{ $proprietaire->telephone ?? 'N/A' }}<br>
                <strong>Email:</strong> {{ $proprietaire->email ?? 'N/A' }}<br>
                <strong>Adresse:</strong> {{ $proprietaire->adresse ?? 'Conakry, Guinée' }}<br>
                @if($proprietaire->badge)
                <strong>Badge ImmoGuinée:</strong> {{ $proprietaire->badge }}<br>
                @endif
                @if($proprietaire->numero_cni)
                <strong>CNI:</strong> {{ $proprietaire->numero_cni }}
                @endif
            </div>
        </div>
        <!-- Détails de l'annonce -->
        <div class="party" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; margin-top: 10px;">
            <div class="party-title" style="color: #f59e0b;">{{ $listing->titre ?? 'Annonce commerciale' }}</div>
            <div class="party-info">
                <strong>Type de bien:</strong> {{ ucfirst($listing->type_bien ?? 'Local commercial') }}<br>
                @if($listing->description)
                <strong>Description:</strong> {{ Str::limit($listing->description, 200) }}<br>
                @endif
                <strong>Transaction:</strong> {{ $listing->type_transaction ?? 'LOCATION' }}<br>
                @if($listing->loyer_mensuel)
                <strong>Loyer mensuel:</strong> {{ number_format($listing->loyer_mensuel, 0, ',', ' ') }} GNF<br>
                @endif
                @if($listing->caution)
                <strong>Caution:</strong> {{ number_format($listing->caution, 0, ',', ' ') }} GNF<br>
                @endif
                @if($listing->avance)
                <strong>Avance:</strong> {{ number_format($listing->avance, 0, ',', ' ') }} GNF
                @endif
            </div>
        </div>
    </div>
    @endif

    <div class="section">
        <div class="section-title">CONDITIONS FINANCIÈRES</div>
        <div class="financial">
            <div class="financial-row">
                <span>Loyer mensuel HT:</span>
                <span>{{ number_format($contract->loyer_mensuel ?? 0, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Charges mensuelles:</span>
                <span>{{ number_format($data['charges'] ?? 0, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Dépôt de garantie ({{ $data['caution_mois'] ?? 3 }} mois):</span>
                <span>{{ number_format(($contract->loyer_mensuel ?? 0) * ($data['caution_mois'] ?? 3), 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span>Commission ImmoGuinée (50%):</span>
                <span>{{ number_format(($contract->loyer_mensuel ?? 0) * 0.5, 0, ',', ' ') }} GNF</span>
            </div>
            <div class="financial-row">
                <span><strong>TOTAL À L'ENTRÉE:</strong></span>
                <span><strong>{{ number_format(
                    ($contract->loyer_mensuel ?? 0) * (($data['caution_mois'] ?? 3) + 1) + (($contract->loyer_mensuel ?? 0) * 0.5),
                    0, ',', ' '
                ) }} GNF</strong></span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DURÉE ET RENOUVELLEMENT</div>
        <p><strong>Date d'effet:</strong> {{ \Carbon\Carbon::parse($data['date_debut'] ?? now())->format('d/m/Y') }}</p>
        <p><strong>Durée initiale:</strong> {{ $data['duree_mois'] ?? 36 }} mois ({{ ($data['duree_mois'] ?? 36) / 12 }} ans)</p>
        <p><strong>Renouvellement:</strong> Par tacite reconduction pour des périodes successives de même durée, sauf dénonciation par l'une des parties avec un préavis de 6 mois.</p>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <div class="section-title">CLAUSES PARTICULIÈRES AU BAIL COMMERCIAL</div>
        <div class="clauses">
            <div class="clause">
                <div class="clause-title">Article 1 - Destination des lieux</div>
                Les locaux loués sont destinés exclusivement à l'exercice de l'activité commerciale mentionnée ci-dessus. Toute modification d'activité nécessite l'accord préalable et écrit du bailleur.
            </div>

            <div class="clause">
                <div class="clause-title">Article 2 - Droit au bail et fonds de commerce</div>
                Conformément aux dispositions de l'Acte Uniforme OHADA, le preneur bénéficie d'un droit au renouvellement du bail. La cession du droit au bail est soumise à l'autorisation du bailleur.
            </div>

            <div class="clause">
                <div class="clause-title">Article 3 - Travaux d'aménagement</div>
                Le preneur peut effectuer les travaux d'aménagement nécessaires à son activité, sous réserve de l'accord écrit du bailleur et du respect des normes en vigueur.
            </div>

            <div class="clause">
                <div class="clause-title">Article 4 - Révision du loyer</div>
                Le loyer pourra être révisé annuellement selon l'indice des prix à la consommation publié par l'Institut National de la Statistique de Guinée, avec un plafond de 5% par an.
            </div>

            <div class="clause">
                <div class="clause-title">Article 5 - Assurances</div>
                Le preneur s'engage à souscrire une assurance couvrant les risques locatifs, le vol, l'incendie et la responsabilité civile professionnelle.
            </div>

            <div class="clause">
                <div class="clause-title">Article 6 - Horaires d'exploitation</div>
                Le preneur respectera les horaires d'exploitation conformes à la réglementation locale et ne pourra exercer d'activités nuisibles au voisinage.
            </div>
        </div>
    </div>

    <div class="legal-notice">
        <strong>Conformité légale:</strong> Le présent bail commercial est régi par l'Acte Uniforme OHADA relatif au Droit Commercial Général et les dispositions du Code Civil guinéen (Loi L/2016/037/AN).
    </div>

    <div class="signatures">
        <div class="section-title">SIGNATURES</div>
        <div class="signature-row">
            <div class="signature-box">
                <div class="signature-label">LE BAILLEUR</div>
                @if(isset($contract->date_signature_proprietaire))
                <div class="signature-date">Signé le {{ \Carbon\Carbon::parse($contract->date_signature_proprietaire)->format('d/m/Y à H:i') }}</div>
                @else
                <div class="signature-date">En attente de signature</div>
                @endif
            </div>
            <div class="signature-box">
                <div class="signature-label">LE PRENEUR</div>
                @if(isset($contract->date_signature_locataire))
                <div class="signature-date">Signé le {{ \Carbon\Carbon::parse($contract->date_signature_locataire)->format('d/m/Y à H:i') }}</div>
                @else
                <div class="signature-date">En attente de signature</div>
                @endif
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>ImmoGuinée</strong> - Plateforme immobilière professionnelle</p>
        <p>Référence: {{ $reference }}</p>
    </div>
</body>
</html>
