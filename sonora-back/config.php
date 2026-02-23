<?php
declare(strict_types=1);

/**
 * config.php
 * - Charge .env
 * - Crée $pdo (PDO MySQL)
 * - Répond en JSON en cas d'erreur
 */

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// Toujours renvoyer JSON pour l'API
header('Content-Type: application/json; charset=utf-8');

// Charger .env (dans le même dossier que ce fichier)
$envPath = __DIR__ . '/.env';
$env = @parse_ini_file($envPath);

if (!$env) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Fichier .env introuvable ou illisible',
        'expected_path' => $envPath
    ]);
    exit;
}

// Lire variables (avec valeurs par défaut)
$host    = $env['DB_HOST'] ?? 'localhost';
$port    = (int)($env['DB_PORT'] ?? 3306);
$db      = $env['DB_NAME'] ?? '';
$user    = $env['DB_USER'] ?? '';
$pass    = $env['DB_PASS'] ?? '';
$charset = $env['DB_CHARSET'] ?? 'utf8mb4';

if ($db === '' || $user === '') {
    http_response_code(500);
    echo json_encode([
        'error' => 'Variables DB_NAME ou DB_USER manquantes dans .env'
    ]);
    exit;
}

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur de connexion à la base de données',
        'details' => $e->getMessage()
    ]);
    exit;
}