<?php

function loadPublicSiteEnv(): void
{
    static $loaded = false;

    if ($loaded) {
        return;
    }

    $loaded = true;

    $envPaths = [
        __DIR__ . DIRECTORY_SEPARATOR . '.env.development',
        __DIR__ . DIRECTORY_SEPARATOR . '.env',
    ];

    foreach ($envPaths as $envPath) {
        if (!is_readable($envPath)) {
            continue;
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $trimmedLine = trim($line);

            if ($trimmedLine === '' || strpos($trimmedLine, '#') === 0) {
                continue;
            }

            $parts = explode('=', $trimmedLine, 2);

            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            $value = trim($parts[1]);

            if ($key === '') {
                continue;
            }

            $value = trim($value, "\"'");

            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv($key . '=' . $value);
        }

        return;
    }
}

function publicSiteEnv(string $key, string $default = ''): string
{
    $value = getenv($key);

    if ($value !== false && $value !== '') {
        return $value;
    }

    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }

    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }

    return $default;
}