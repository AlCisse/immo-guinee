<?php

namespace App\Jobs;

use App\Services\ContentModerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessContentModerationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $modelClass,
        public int $modelId,
        public string $content
    ) {}

    /**
     * Execute the job.
     * FR-065, FR-069: Auto-moderate content with keyword detection
     */
    public function handle(ContentModerationService $moderationService): void
    {
        Log::info('Processing content moderation', [
            'model' => $this->modelClass,
            'id' => $this->modelId,
        ]);

        try {
            $model = $this->modelClass::find($this->modelId);

            if (!$model) {
                Log::warning('Model not found for moderation', [
                    'model' => $this->modelClass,
                    'id' => $this->modelId,
                ]);
                return;
            }

            // Check for inappropriate content
            $result = $moderationService->moderate($this->content);

            if ($result['flagged']) {
                // Update model status
                $model->update([
                    'statut_moderation' => 'REJETE',
                    'raison_rejet' => 'Contenu inapproprié détecté: ' . implode(', ', $result['keywords']),
                ]);

                // Log activity
                activity()
                    ->performedOn($model)
                    ->withProperties($result)
                    ->log('Content moderation: flagged');

                Log::warning('Content flagged', [
                    'model' => $this->modelClass,
                    'id' => $this->modelId,
                    'keywords' => $result['keywords'],
                ]);

                // TODO: Notify admin and user
            } else {
                // Auto-approve
                $model->update(['statut_moderation' => 'APPROUVE']);

                Log::info('Content auto-approved', [
                    'model' => $this->modelClass,
                    'id' => $this->modelId,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Content moderation failed', [
                'model' => $this->modelClass,
                'id' => $this->modelId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
