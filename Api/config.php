<?php
// Config MAMP
$host = 'localhost';
$port = 8889;
$db   = 'sonora_db';
$user = 'root';
$pass = 'root';
$charset = 'utf8mb4';

// Connexion PDO
$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la BDD']);
    exit;
}
?>
