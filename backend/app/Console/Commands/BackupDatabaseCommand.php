<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackupDatabaseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup {--compress : Compress the backup file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a database backup (FR-086: Daily backups)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting database backup...');

        $database = config('database.connections.pgsql.database');
        $username = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');
        $host = config('database.connections.pgsql.host');
        $port = config('database.connections.pgsql.port', 5432);

        // Generate backup filename with timestamp
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "backup_{$database}_{$timestamp}.sql";

        if ($this->option('compress')) {
            $filename .= '.gz';
        }

        $backupPath = storage_path("app/backups/{$filename}");

        // Ensure backup directory exists
        if (!is_dir(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        // Build pg_dump command
        $command = sprintf(
            'PGPASSWORD="%s" pg_dump -h %s -p %d -U %s %s',
            $password,
            $host,
            $port,
            $username,
            $database
        );

        if ($this->option('compress')) {
            $command .= " | gzip > {$backupPath}";
        } else {
            $command .= " > {$backupPath}";
        }

        // Execute backup
        $this->line("Executing: pg_dump...");
        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            $this->error('Database backup failed!');
            return Command::FAILURE;
        }

        // Get file size
        $fileSize = filesize($backupPath);
        $fileSizeMB = round($fileSize / 1024 / 1024, 2);

        $this->info("Backup completed successfully!");
        $this->line("File: {$filename}");
        $this->line("Size: {$fileSizeMB} MB");
        $this->line("Path: {$backupPath}");

        // Optional: Upload to S3 or remote storage
        // Storage::disk('s3')->put("backups/{$filename}", file_get_contents($backupPath));

        return Command::SUCCESS;
    }
}
