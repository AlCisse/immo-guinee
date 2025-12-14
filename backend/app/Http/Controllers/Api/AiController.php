<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AiController extends Controller
{
    /**
     * Common spelling corrections for French real estate listings.
     */
    private array $corrections = [
        // Common typos
        'appartment' => 'appartement',
        'apartemment' => 'appartement',
        'appart' => 'appartement',
        'chambres' => 'chambres',
        'chambre a coucher' => 'chambre à coucher',
        'salle de bain' => 'salle de bains',
        'salle de bains' => 'salle de bains',
        'toillete' => 'toilettes',
        'toillete' => 'toilettes',
        'cuisne' => 'cuisine',
        'balcont' => 'balcon',
        'terace' => 'terrasse',
        'terassse' => 'terrasse',
        'teraasse' => 'terrasse',
        'terase' => 'terrasse',
        'teresse' => 'terrasse',
        'garrage' => 'garage',
        'garag' => 'garage',
        'parkink' => 'parking',
        'parquing' => 'parking',
        'loaction' => 'location',
        'louer' => 'louer',
        'vente' => 'vente',
        'ventde' => 'vente',
        'maisson' => 'maison',
        'villa' => 'villa',
        'burreau' => 'bureau',
        'bureu' => 'bureau',
        'magazin' => 'magasin',
        'magazing' => 'magasin',
        'inmobilier' => 'immobilier',
        'imobilier' => 'immobilier',
        'disponilbe' => 'disponible',
        'dispnible' => 'disponible',
        'disponble' => 'disponible',
        'metre carre' => 'mètre carré',
        'metres carres' => 'mètres carrés',
        'm2' => 'm²',
        'm²' => 'm²',
        'tres' => 'très',
        'bel ' => 'bel ',
        'Bel ' => 'Bel ',
        'beau' => 'beau',
        'spaceiux' => 'spacieux',
        'spacieu' => 'spacieux',
        'spacieus' => 'spacieux',
        'lumnieux' => 'lumineux',
        'lunineux' => 'lumineux',
        'lumineu' => 'lumineux',
        'quartier' => 'quartier',
        'quarteir' => 'quartier',
        'pres de' => 'près de',
        'a coté' => 'à côté',
        'a cote' => 'à côté',
        'acote' => 'à côté',
        'prôche' => 'proche',
        'prôche de' => 'proche de',
        'securisé' => 'sécurisé',
        'securise' => 'sécurisé',
        'equipé' => 'équipé',
        'equipe' => 'équipé',
        'meublé' => 'meublé',
        'meuble' => 'meublé',
        'climatisé' => 'climatisé',
        'climatise' => 'climatisé',
        'climatisee' => 'climatisée',
        'cloturé' => 'clôturé',
        'cloture' => 'clôturé',
        'renové' => 'rénové',
        'renove' => 'rénové',
        'neuf' => 'neuf',
        'etat neuf' => 'état neuf',
        'bon etat' => 'bon état',
        'tres bon etat' => 'très bon état',
        'excellent etat' => 'excellent état',
    ];

    /**
     * Optimize listing title and description using rule-based text processing.
     * (Fast alternative to LLM - works instantly without GPU)
     */
    public function optimizeListing(Request $request): JsonResponse
    {
        $request->validate([
            'titre' => 'required|string|max:200',
            'description' => 'required|string|max:3000',
            'type_bien' => 'nullable|string',
            'type_operation' => 'nullable|string|in:LOCATION,VENTE',
            'quartier' => 'nullable|string',
        ]);

        $titre = trim($request->input('titre'));
        $description = trim($request->input('description'));
        $typeBien = $request->input('type_bien', '');
        $typeOperation = $request->input('type_operation', 'LOCATION');
        $quartier = $request->input('quartier', '');

        // Optimize title
        $optimizedTitre = $this->optimizeText($titre);
        $optimizedTitre = $this->capitalizeFirst($optimizedTitre);

        // Enhance title if too short or generic
        if (strlen($optimizedTitre) < 20 && $typeBien) {
            $operationText = $typeOperation === 'VENTE' ? 'à vendre' : 'à louer';
            $locationText = $quartier ? " - {$quartier}" : '';
            $optimizedTitre = ucfirst($typeBien) . " {$operationText}{$locationText}";
        }

        // Optimize description
        $optimizedDescription = $this->optimizeText($description);
        $optimizedDescription = $this->formatDescription($optimizedDescription);
        $optimizedDescription = $this->capitalizeFirstSentences($optimizedDescription);

        return response()->json([
            'success' => true,
            'data' => [
                'titre' => $optimizedTitre,
                'description' => $optimizedDescription,
            ],
            'message' => 'Contenu optimisé avec succès',
        ]);
    }

    /**
     * Apply spelling corrections and fix common issues.
     */
    private function optimizeText(string $text): string
    {
        // Fix multiple spaces
        $text = preg_replace('/\s+/', ' ', $text);

        // Apply spelling corrections (case-insensitive)
        foreach ($this->corrections as $wrong => $correct) {
            $text = preg_replace('/\b' . preg_quote($wrong, '/') . '\b/iu', $correct, $text);
        }

        // Fix common punctuation issues
        $text = preg_replace('/\s+([.,!?;:])/', '$1', $text); // Remove space before punctuation
        $text = preg_replace('/([.,!?;:])(?=[^\s\d])/', '$1 ', $text); // Add space after punctuation
        $text = preg_replace('/\s+/', ' ', $text); // Clean up any double spaces created

        // Fix French accents on common words
        $text = $this->fixFrenchAccents($text);

        return trim($text);
    }

    /**
     * Fix missing French accents on common words.
     */
    private function fixFrenchAccents(string $text): string
    {
        $accentFixes = [
            '/\ba\b(?=\s+(louer|vendre|proximité|côté))/iu' => 'à',
            '/\bpres\b/iu' => 'près',
            '/\bcote\b/iu' => 'côté',
            '/\bequipe\b/iu' => 'équipé',
            '/\bsecurise\b/iu' => 'sécurisé',
            '/\brenovE\b/iu' => 'rénové',
            '/\bmeuble\b(?!\s)/iu' => 'meublé',
            '/\betat\b/iu' => 'état',
            '/\betage\b/iu' => 'étage',
            '/\brez-de-chaussee\b/iu' => 'rez-de-chaussée',
            '/\belectricite\b/iu' => 'électricité',
            '/\beau\b(?=\s+chaude)/iu' => 'eau',
            '/\bgarantie\b/iu' => 'garantie',
            '/\binteresse\b/iu' => 'intéressé',
        ];

        foreach ($accentFixes as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        return $text;
    }

    /**
     * Format description with proper paragraph structure.
     */
    private function formatDescription(string $text): string
    {
        // Ensure sentences end properly
        if (!preg_match('/[.!?]$/', $text)) {
            $text .= '.';
        }

        // Add line breaks after sentences if text is long enough
        if (strlen($text) > 200) {
            // Add paragraph breaks after certain patterns
            $text = preg_replace('/([.!?])\s+(?=(?:Comprend|Dispose|Inclut|Avec|Sans|Proche|Situé|Idéal))/iu', "$1\n\n", $text);
        }

        return $text;
    }

    /**
     * Capitalize first letter of the text.
     */
    private function capitalizeFirst(string $text): string
    {
        return mb_strtoupper(mb_substr($text, 0, 1)) . mb_substr($text, 1);
    }

    /**
     * Capitalize first letter of each sentence.
     */
    private function capitalizeFirstSentences(string $text): string
    {
        // Split by sentence-ending punctuation
        return preg_replace_callback(
            '/([.!?]\s+)(\p{Ll})/u',
            fn($matches) => $matches[1] . mb_strtoupper($matches[2]),
            $this->capitalizeFirst($text)
        );
    }
}
