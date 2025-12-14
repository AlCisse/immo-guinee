<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Storage;
use App\Models\Contract;
use App\Services\ContractService;

$contract = Contract::find('019ad4ee-8d30-736d-885b-485502dcabaa');

echo "Resetting contract PDF data..." . PHP_EOL;

// Reset the PDF fields to force regeneration
$contract->update([
    'pdf_url' => null,
    'pdf_hash' => null,
    'pdf_storage_disk' => null,
]);

echo "PDF fields reset. Now regenerating..." . PHP_EOL;

// Regenerate PDF
$contractService = app(ContractService::class);
try {
    $pdfUrl = $contractService->generatePdf($contract);
    echo "PDF generated successfully!" . PHP_EOL;
    echo "New PDF URL: " . $pdfUrl . PHP_EOL;

    // Reload contract
    $contract->refresh();
    echo "Contract PDF URL: " . $contract->pdf_url . PHP_EOL;
    echo "Contract PDF storage disk: " . $contract->pdf_storage_disk . PHP_EOL;
    echo "Contract PDF hash: " . $contract->pdf_hash . PHP_EOL;

    // Check if file exists
    $disk = $contract->pdf_storage_disk ?? 'documents';
    $pdfPath = $contract->pdf_url;

    $exists = Storage::disk($disk)->exists($pdfPath);
    echo "File exists in storage: " . ($exists ? 'YES' : 'NO') . PHP_EOL;

    if ($exists) {
        $content = Storage::disk($disk)->get($pdfPath);
        echo "File size: " . strlen($content) . " bytes" . PHP_EOL;
        echo "Starts with PDF: " . (substr($content, 0, 4) === '%PDF' ? 'YES' : 'NO') . PHP_EOL;
    }
} catch (Exception $e) {
    echo "Error generating PDF: " . $e->getMessage() . PHP_EOL;
    echo "Stack trace: " . $e->getTraceAsString() . PHP_EOL;
}
