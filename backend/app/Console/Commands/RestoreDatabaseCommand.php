<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * T288: Database Restore Command for Disaster Recovery
 *
 * FR-090: Supports daily backup restoration
 */
class RestoreDatabaseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:restore
                            {file? : The backup file to restore}
                            {--list : List available backups}
                            {--latest : Restore the latest backup}
                            {--force : Skip confirmation prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restore database from a backup file (FR-090: Disaster recovery)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // List available backups
        if ($this->option('list')) {
            return $this->listBackups();
        }

        // Determine which backup to restore
        $backupFile = $this->resolveBackupFile();

        if (!$backupFile) {
            $this->error('No backup file specified or found.');
            $this->line('Use --list to see available backups, or --latest to restore the most recent one.');
            return Command::FAILURE;
        }

        $backupPath = storage_path("app/backups/{$backupFile}");

        if (!file_exists($backupPath)) {
            $this->error("Backup file not found: {$backupPath}");
            return Command::FAILURE;
        }

        // Get file info
        $fileSize = filesize($backupPath);
        $fileSizeMB = round($fileSize / 1024 / 1024, 2);
        $fileDate = date('Y-m-d H:i:s', filemtime($backupPath));

        $this->warn('⚠️  DATABASE RESTORE WARNING');
        $this->line('');
        $this->line("File: {$backupFile}");
        $this->line("Size: {$fileSizeMB} MB");
        $this->line("Date: {$fileDate}");
        $this->line('');
        $this->warn('This will REPLACE all current data in the database!');

        // Confirmation
        if (!$this->option('force')) {
            if (!$this->confirm('Are you sure you want to restore this backup?')) {
                $this->info('Restore cancelled.');
                return Command::SUCCESS;
            }

            // Double confirmation for production
            if (app()->environment('production')) {
                $database = config('database.connections.pgsql.database');
                $this->error("You are about to restore PRODUCTION database: {$database}");

                if (!$this->confirm('Type YES to confirm production restore:')) {
                    $this->info('Restore cancelled.');
                    return Command::SUCCESS;
                }
            }
        }

        return $this->performRestore($backupPath);
    }

    /**
     * List available backup files.
     */
    private function listBackups(): int
    {
        $backupDir = storage_path('app/backups');

        if (!is_dir($backupDir)) {
            $this->warn('No backups directory found.');
            return Command::SUCCESS;
        }

        $files = glob($backupDir . '/backup_*.sql*');

        if (empty($files)) {
            $this->warn('No backup files found.');
            return Command::SUCCESS;
        }

        // Sort by modification time (newest first)
        usort($files, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        $this->info('Available backups:');
        $this->newLine();

        $headers = ['#', 'Filename', 'Size', 'Date'];
        $rows = [];

        foreach ($files as $index => $file) {
            $filename = basename($file);
            $size = round(filesize($file) / 1024 / 1024, 2) . ' MB';
            $date = date('Y-m-d H:i:s', filemtime($file));

            $rows[] = [$index + 1, $filename, $size, $date];
        }

        $this->table($headers, $rows);

        return Command::SUCCESS;
    }

    /**
     * Resolve which backup file to use.
     */
    private function resolveBackupFile(): ?string
    {
        // Explicit file argument
        if ($file = $this->argument('file')) {
            return $file;
        }

        // Latest backup option
        if ($this->option('latest')) {
            return $this->getLatestBackup();
        }

        // Interactive selection
        $backupDir = storage_path('app/backups');
        $files = glob($backupDir . '/backup_*.sql*');

        if (empty($files)) {
            return null;
        }

        // Sort by modification time (newest first)
        usort($files, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        $options = array_map(function ($file) {
            $filename = basename($file);
            $date = date('Y-m-d H:i', filemtime($file));
            return "{$filename} ({$date})";
        }, array_slice($files, 0, 10));

        $selected = $this->choice('Select a backup to restore:', $options, 0);

        // Extract filename from selection
        preg_match('/^([^\s]+)/', $selected, $matches);
        return $matches[1] ?? null;
    }

    /**
     * Get the most recent backup file.
     */
    private function getLatestBackup(): ?string
    {
        $backupDir = storage_path('app/backups');
        $files = glob($backupDir . '/backup_*.sql*');

        if (empty($files)) {
            return null;
        }

        // Sort by modification time (newest first)
        usort($files, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });

        return basename($files[0]);
    }

    /**
     * Perform the database restore.
     */
    private function performRestore(string $backupPath): int
    {
        $this->info('Starting database restore...');
        $this->newLine();

        $database = config('database.connections.pgsql.database');
        $username = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');
        $host = config('database.connections.pgsql.host');
        $port = config('database.connections.pgsql.port', 5432);

        // Check if file is compressed
        $isCompressed = str_ends_with($backupPath, '.gz');

        // Step 1: Drop existing connections
        $this->line('Terminating existing database connections...');
        $terminateCommand = sprintf(
            'PGPASSWORD="%s" psql -h %s -p %d -U %s -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = \'%s\' AND pid <> pg_backend_pid();"',
            $password,
            $host,
            $port,
            $username,
            $database
        );
        exec($terminateCommand, $output, $returnCode);

        // Step 2: Drop and recreate database
        $this->line('Recreating database...');
        $dropCommand = sprintf(
            'PGPASSWORD="%s" psql -h %s -p %d -U %s -d postgres -c "DROP DATABASE IF EXISTS %s;"',
            $password,
            $host,
            $port,
            $username,
            $database
        );
        exec($dropCommand, $output, $returnCode);

        $createCommand = sprintf(
            'PGPASSWORD="%s" psql -h %s -p %d -U %s -d postgres -c "CREATE DATABASE %s;"',
            $password,
            $host,
            $port,
            $username,
            $database
        );
        exec($createCommand, $output, $returnCode);

        if ($returnCode !== 0) {
            $this->error('Failed to recreate database!');
            return Command::FAILURE;
        }

        // Step 3: Restore from backup
        $this->line('Restoring data from backup...');
        $this->output->write('Progress: ');

        if ($isCompressed) {
            $restoreCommand = sprintf(
                'gunzip -c %s | PGPASSWORD="%s" psql -h %s -p %d -U %s %s',
                $backupPath,
                $password,
                $host,
                $port,
                $username,
                $database
            );
        } else {
            $restoreCommand = sprintf(
                'PGPASSWORD="%s" psql -h %s -p %d -U %s %s < %s',
                $password,
                $host,
                $port,
                $username,
                $database,
                $backupPath
            );
        }

        exec($restoreCommand . ' 2>&1', $output, $returnCode);

        if ($returnCode !== 0) {
            $this->error('Database restore failed!');
            $this->line('Error output:');
            foreach ($output as $line) {
                $this->line($line);
            }
            return Command::FAILURE;
        }

        $this->info('✅ Done');
        $this->newLine();

        // Step 4: Run any pending migrations
        $this->line('Running pending migrations...');
        $this->call('migrate', ['--force' => true]);

        // Step 5: Clear caches
        $this->line('Clearing caches...');
        $this->call('cache:clear');
        $this->call('config:clear');

        $this->newLine();
        $this->info('✅ Database restore completed successfully!');
        $this->line("Restored from: " . basename($backupPath));

        // Log the restore action
        activity()
            ->withProperties([
                'backup_file' => basename($backupPath),
                'restored_at' => now()->toIso8601String(),
                'restored_by' => 'console',
            ])
            ->log('Database restored from backup');

        return Command::SUCCESS;
    }
}
