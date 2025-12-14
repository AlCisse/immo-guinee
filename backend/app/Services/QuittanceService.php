<?php

namespace App\Services;

use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class QuittanceService
{
    /**
     * Generate payment receipt (quittance) PDF
     */
    public function generateQuittance(Payment $payment): string
    {
        // Load relationships
        $payment->load(['payer', 'beneficiary', 'contract']);

        // Prepare data for template
        $data = [
            'payment' => $payment,
            'payer' => $payment->payer,
            'beneficiary' => $payment->beneficiary,
            'contract' => $payment->contract,
            'numero_quittance' => 'QUIT-' . strtoupper(substr($payment->id, 0, 8)),
            'generated_at' => now()->format('d/m/Y à H:i'),
            'montant_en_lettres' => $this->convertNumberToWords($payment->montant_gnf),
        ];

        // Generate PDF
        $pdf = Pdf::loadView('payments.quittance', $data)
            ->setPaper('a4', 'portrait')
            ->setOption('margin-top', 15)
            ->setOption('margin-bottom', 15)
            ->setOption('margin-left', 10)
            ->setOption('margin-right', 10);

        // Generate filename
        $filename = 'quittances/' . $payment->id . '_' . time() . '.pdf';

        // Save to S3/MinIO
        Storage::disk('s3')->put($filename, $pdf->output());

        // Update payment with quittance URL
        $payment->update([
            'quittance_pdf_url' => Storage::disk('s3')->url($filename),
        ]);

        return $payment->quittance_pdf_url;
    }

    /**
     * Convert number to words in French (for GNF amounts)
     */
    private function convertNumberToWords(int $number): string
    {
        // Simplified conversion - you can use a library like NumberFormatter
        $formatter = new \NumberFormatter('fr_FR', \NumberFormatter::SPELLOUT);
        $words = $formatter->format($number);

        return ucfirst($words) . ' francs guinéens';
    }

    /**
     * Generate monthly rent receipt
     */
    public function generateMonthlyRentReceipt(Payment $payment, string $month, int $year): string
    {
        $payment->load(['payer', 'beneficiary', 'contract']);

        $data = [
            'payment' => $payment,
            'payer' => $payment->payer,
            'beneficiary' => $payment->beneficiary,
            'contract' => $payment->contract,
            'month' => $month,
            'year' => $year,
            'numero_quittance' => 'QUIT-LOYER-' . $month . '-' . $year . '-' . strtoupper(substr($payment->id, 0, 6)),
            'generated_at' => now()->format('d/m/Y à H:i'),
            'montant_en_lettres' => $this->convertNumberToWords($payment->montant_gnf),
        ];

        $pdf = Pdf::loadView('payments.quittance-loyer', $data)
            ->setPaper('a4', 'portrait');

        $filename = 'quittances/loyer_' . $month . '_' . $year . '_' . $payment->id . '.pdf';
        Storage::disk('s3')->put($filename, $pdf->output());

        return Storage::disk('s3')->url($filename);
    }

    /**
     * Generate quittance and return array (FR-046)
     * Used by PaymentController
     */
    public function generate(Payment $payment): array
    {
        try {
            $url = $this->generateQuittance($payment);

            return [
                'success' => true,
                'url' => $url,
                'reference' => 'QUIT-' . strtoupper(substr($payment->id, 0, 8)),
                'generated_at' => now()->toISOString(),
            ];
        } catch (\Exception $e) {
            // Return a placeholder if PDF generation fails
            return [
                'success' => false,
                'url' => null,
                'error' => $e->getMessage(),
            ];
        }
    }
}
