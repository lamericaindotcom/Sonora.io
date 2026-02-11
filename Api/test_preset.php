<?php
header('Content-Type: application/json; charset=utf-8');

// Config
$host = 'localhost';
$port = 8889;
$db   = 'sonora_db';  // ✅ Vérifie que c'est le bon nom
$user = 'root';
$pass = 'root';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Tester la requête
    $stmt = $pdo->query("SELECT * FROM presets LIMIT 5");
    $presets = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'count' => count($presets),
        'presets' => $presets
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
