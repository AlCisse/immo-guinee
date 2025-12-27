<?php

namespace App\Console\Commands;

use App\Models\ListingPhoto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Aws\S3\S3Client;

class FixSpacesAclCommand extends Command
{
    protected $signature = 'spaces:fix-acl
                            {--disk=spaces-listings : The disk to fix ACL for}
                            {--dry-run : Show what would be fixed without actually fixing}';

    protected $description = 'Fix ACL of existing files on DigitalOcean Spaces to make them publicly accessible';

    public function handle(): int
    {
        $diskName = $this->option('disk');
        $dryRun = $this->option('dry-run');

        $this->info("Fixing ACL for disk: {$diskName}");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        // Get disk configuration
        $config = config("filesystems.disks.{$diskName}");

        if (!$config) {
            $this->error("Disk '{$diskName}' not found in configuration");
            return 1;
        }

        // Create S3 client directly for ACL operations
        $client = new S3Client([
            'version' => 'latest',
            'region' => $config['region'] ?? 'fra1',
            'endpoint' => $config['endpoint'],
            'credentials' => [
                'key' => $config['key'],
                'secret' => $config['secret'],
            ],
        ]);

        $bucket = $config['bucket'];
        $root = $config['root'] ?? '';
        $prefix = $root ? "{$root}/" : '';

        $this->info("Bucket: {$bucket}");
        $this->info("Prefix: {$prefix}");

        // List all objects
        $disk = Storage::disk($diskName);
        $files = $disk->allFiles();

        $this->info("Found " . count($files) . " files to process");

        $fixed = 0;
        $failed = 0;
        $skipped = 0;

        $bar = $this->output->createProgressBar(count($files));
        $bar->start();

        foreach ($files as $file) {
            $fullKey = $prefix . $file;

            try {
                // Get current ACL
                $currentAcl = $client->getObjectAcl([
                    'Bucket' => $bucket,
                    'Key' => $fullKey,
                ]);

                // Check if already public-read
                $isPublic = false;
                foreach ($currentAcl['Grants'] as $grant) {
                    if (isset($grant['Grantee']['URI']) &&
                        $grant['Grantee']['URI'] === 'http://acs.amazonaws.com/groups/global/AllUsers' &&
                        $grant['Permission'] === 'READ') {
                        $isPublic = true;
                        break;
                    }
                }

                if ($isPublic) {
                    $skipped++;
                } else {
                    if (!$dryRun) {
                        // Set public-read ACL
                        $client->putObjectAcl([
                            'Bucket' => $bucket,
                            'Key' => $fullKey,
                            'ACL' => 'public-read',
                        ]);
                    }
                    $fixed++;
                }
            } catch (\Exception $e) {
                $failed++;
                $this->newLine();
                $this->error("Failed to fix ACL for {$fullKey}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("Results:");
        $this->line("  Fixed: {$fixed}");
        $this->line("  Already public: {$skipped}");
        $this->line("  Failed: {$failed}");

        if ($dryRun && $fixed > 0) {
            $this->warn("Run without --dry-run to apply changes");
        }

        return $failed > 0 ? 1 : 0;
    }
}
