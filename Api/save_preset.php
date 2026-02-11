<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Méthode non autorisée']));
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    die(json_encode(['error' => 'JSON invalide']));
}

$name        = $data['name']        ?? null;
$description = $data['description'] ?? null;
$presetData  = $data['data']        ?? null;
$userId      = $data['user_id']     ?? null;

if (!$name || !$presetData) {
    http_response_code(400);
    die(json_encode(['error' => 'Nom ou données manquants']));
}

$presetJson = json_encode($presetData);

// Vérifier si le preset existe déjà (pour mise à jour)
$checkSql = "SELECT id FROM presets WHERE name = :name";
$checkStmt = $pdo->prepare($checkSql);
$checkStmt->execute([':name' => $name]);
$existing = $checkStmt->fetch();

try {
    if ($existing) {
        // Mise à jour
        $sql = "UPDATE presets SET data = :data, description = :description, updated_at = CURRENT_TIMESTAMP WHERE name = :name";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name'        => $name,
            ':description' => $description,
            ':data'        => $presetJson,
        ]);
        $action = 'updated';
        $presetId = $existing['id'];
    } else {
        // Insertion
        $sql = "INSERT INTO presets (user_id, name, description, data)
                VALUES (:user_id, :name, :description, :data)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':user_id'     => $userId,
            ':name'        => $name,
            ':description' => $description,
            ':data'        => $presetJson,
        ]);
        $action = 'created';
        $presetId = $pdo->lastInsertId();
    }

    echo json_encode([
        'success'   => true,
        'message'   => 'Preset ' . $action,
        'action'    => $action,
        'preset_id' => $presetId,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur sauvegarde: ' . $e->getMessage()]);
}
?>


