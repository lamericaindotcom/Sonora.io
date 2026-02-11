<?php
header('Content-Type: application/json; charset=utf-8');

// Config MAMP
$host = 'localhost';
$port = 8889;
$db   = 'synth_db';
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
    echo json_encode([
        'success' => true,
        'message' => 'Connexion à la BDD réussie !',
        'host' => $host,
        'port' => $port,
        'db' => $db
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
}
?>
