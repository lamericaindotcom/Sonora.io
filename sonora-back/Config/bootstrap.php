<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Charger .env
$envPath = __DIR__ . '/../.env';
$env = @parse_ini_file($envPath);

if (!$env) {
    http_response_code(500);
    echo json_encode(['error' => 'Fichier .env introuvable ou illisible']);
    exit;
}

// Variables DB
$host    = $env['DB_HOST'] ?? 'localhost';
$port    = (int)($env['DB_PORT'] ?? 3306);
$db      = $env['DB_NAME'] ?? '';
$user    = $env['DB_USER'] ?? '';
$pass    = $env['DB_PASS'] ?? '';
$charset = $env['DB_CHARSET'] ?? 'utf8mb4';

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Helper JSON
function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jsonResponse(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
