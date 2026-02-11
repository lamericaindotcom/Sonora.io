<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

try {
    $sql = "SELECT id, name, description, created_at, updated_at FROM presets ORDER BY updated_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $presets = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'presets' => $presets,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lecture: ' . $e->getMessage()]);
}
?>
