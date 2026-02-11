<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Méthode non autorisée']));
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!isset($data['id'])) {
    http_response_code(400);
    die(json_encode(['error' => 'ID du preset manquant']));
}

$id = intval($data['id']);

try {
    $sql = "SELECT id, name, description, data FROM presets WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    $preset = $stmt->fetch();

    if ($preset) {
        $preset['data'] = json_decode($preset['data'], true);
        echo json_encode([
            'success' => true,
            'preset'  => $preset,
        ]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Preset non trouvé']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lecture: ' . $e->getMessage()]);
}
?>
