<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
  exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'JSON invalide']);
  exit;
}

$name = $data['name'] ?? null;
$description = $data['description'] ?? null;
$presetData = $data['data'] ?? null;
$userId = $data['user_id'] ?? null;

if (!$name || !$presetData) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'Nom ou données manquants']);
  exit;
}

$presetJson = json_encode($presetData);

try {
  $checkSql = "SELECT id FROM presets WHERE name = :name";
  $checkStmt = $pdo->prepare($checkSql);
  $checkStmt->execute([':name' => $name]);
  $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

  if ($existing) {
    $sql = "UPDATE presets
            SET data = :data, description = :description, updated_at = CURRENT_TIMESTAMP
            WHERE name = :name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
      ':name' => $name,
      ':description' => $description,
      ':data' => $presetJson,
    ]);
    $action = 'updated';
    $presetId = $existing['id'];
  } else {
    $sql = "INSERT INTO presets (user_id, name, description, data)
            VALUES (:user_id, :name, :description, :data)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
      ':user_id' => $userId,
      ':name' => $name,
      ':description' => $description,
      ':data' => $presetJson,
    ]);
    $action = 'created';
    $presetId = $pdo->lastInsertId();
  }

  echo json_encode([
    'success' => true,
    'message' => 'Preset ' . $action,
    'action' => $action,
    'preset_id' => $presetId,
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur sauvegarde: ' . $e->getMessage()]);
}
