<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

try {
  $sql = "SELECT id, user_id, name, description, created_at, updated_at
          FROM presets
          ORDER BY updated_at DESC";
  $stmt = $pdo->query($sql);
  $presets = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'presets' => $presets,
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur lecture']);
}
