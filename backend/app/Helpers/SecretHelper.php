<?php

namespace App\Helpers;

/**
 * Helper to read Docker secrets from files.
 *
 * Docker Swarm secrets are mounted at /run/secrets/
 * This helper reads the secret value from the file.
 */
class SecretHelper
{
    /**
     * Get a secret value from environment or Docker secret file.
     *
     * Checks for {KEY}_FILE env var first (Docker secret path),
     * then falls back to {KEY} env var.
     *
     * @param string $key The environment variable name (without _FILE suffix)
     * @param mixed $default Default value if not found
     * @return mixed
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        // First check if there's a _FILE env var pointing to a secret
        $fileEnv = env($key . '_FILE');

        if ($fileEnv && file_exists($fileEnv)) {
            $value = trim(file_get_contents($fileEnv));
            return $value !== '' ? $value : $default;
        }

        // Fall back to regular env var
        return env($key, $default);
    }

    /**
     * Check if a secret exists (either as file or env var).
     *
     * @param string $key The environment variable name
     * @return bool
     */
    public static function has(string $key): bool
    {
        $fileEnv = env($key . '_FILE');

        if ($fileEnv && file_exists($fileEnv)) {
            return true;
        }

        return env($key) !== null;
    }
}
