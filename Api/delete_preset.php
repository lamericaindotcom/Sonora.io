<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
if ($id <= 0) {
  http_response_code(400);
  echo json_encode(['success' => false, 'error' => 'ID du preset manquant']);
  exit;
}

try {
  $sql = "DELETE FROM presets WHERE id = :id";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':id' => $id]);

  if ($stmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Preset non trouvé']);
    exit;
  }

  echo json_encode(['success' => true, 'message' => 'Preset supprimé']);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur suppression']);
}
