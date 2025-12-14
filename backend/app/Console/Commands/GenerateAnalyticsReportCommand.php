<?php

namespace App\Console\Commands;

use App\Jobs\GenerateAnalyticsReportJob;
use Illuminate\Console\Command;

class GenerateAnalyticsReportCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'analytics:generate {type=daily : Report type (daily, weekly, monthly)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate analytics report and cache results (FR-084)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $type = $this->argument('type');

        if (!in_array($type, ['daily', 'weekly', 'monthly'])) {
            $this->error("Invalid report type. Must be: daily, weekly, or monthly");
            return Command::FAILURE;
        }

        $this->info("Generating {$type} analytics report...");

        try {
            // Dispatch job to generate analytics
            GenerateAnalyticsReportJob::dispatch($type);

            $this->info("Analytics report generation job dispatched successfully!");
            $this->line("Type: {$type}");

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Failed to generate analytics report: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
