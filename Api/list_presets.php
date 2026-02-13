<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'error' => 'Non authentifié']);
  exit;
}

try {
  $sql = "SELECT id, name, description, created_at, updated_at
          FROM presets
          WHERE user_id = :user_id
          ORDER BY updated_at DESC";
  $stmt = $pdo->prepare($sql);
  $stmt->execute(['user_id' => $_SESSION['user_id']]);
  $presets = $stmt->fetchAll();

  echo json_encode([
    'success' => true,
    'presets' => $presets,
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Erreur lecture']);
}

