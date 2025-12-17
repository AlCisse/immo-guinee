<?php

/**
 * Docker Secrets Helper Functions
 * Reads secrets from Docker Swarm secret files
 */

if (!function_exists('docker_secret')) {
    /**
     * Get a value from a Docker secret file or fall back to environment variable
     *
     * @param string $key The environment variable name (without _FILE suffix)
     * @param mixed $default The default value if neither file nor env var exists
     * @return mixed The secret value
     */
    function docker_secret(string $key, $default = null)
    {
        // First, check if there's a _FILE environment variable pointing to a secret file
        $fileEnv = env($key . '_FILE');

        if ($fileEnv && file_exists($fileEnv)) {
            $value = trim(file_get_contents($fileEnv));
            return $value !== '' ? $value : $default;
        }

        // Fall back to regular environment variable
        return env($key, $default);
    }
}

if (!function_exists('load_docker_secrets')) {
    /**
     * Load all Docker secrets from /run/secrets directory
     * and set them as environment variables
     */
    function load_docker_secrets(): void
    {
        $secretsDir = '/run/secrets';

        if (!is_dir($secretsDir)) {
            return;
        }

        // Map of secret file names to environment variable names
        $secretMap = [
            'db_password' => 'DB_PASSWORD',
            'redis_password' => 'REDIS_PASSWORD',
            'minio_password' => 'MINIO_ROOT_PASSWORD',
            'passport_private_key' => 'PASSPORT_PRIVATE_KEY',
            'passport_public_key' => 'PASSPORT_PUBLIC_KEY',
        ];

        foreach ($secretMap as $secretFile => $envVar) {
            $secretPath = $secretsDir . '/' . $secretFile;
            if (file_exists($secretPath)) {
                $value = trim(file_get_contents($secretPath));
                if ($value !== '') {
                    putenv("{$envVar}={$value}");
                    $_ENV[$envVar] = $value;
                    $_SERVER[$envVar] = $value;
                }
            }
        }
    }
}
