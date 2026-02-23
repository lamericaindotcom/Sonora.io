<?php
declare(strict_types=1);

final class PresetController
{
    public function __construct(private PresetModel $model) {}

    public function list(): void
    {
        // Optionnel: $userId = $_GET['user_id'] ?? null;
        $rows = $this->model->listByUser(null);

        // Tu peux aussi renvoyer uniquement id+name si tu préfères
        jsonResponse(['presets' => $rows], 200);
    }

    public function load(): void
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            jsonResponse(['error' => 'Paramètre id manquant'], 400);
        }

        $preset = $this->model->load($id);
        if (!$preset) {
            jsonResponse(['error' => 'Preset introuvable'], 404);
        }

        jsonResponse(['preset' => $preset], 200);
    }

    public function save(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Méthode non autorisée'], 405);
        }

        $body = readJsonBody();

        $id   = isset($body['id']) ? (int)$body['id'] : null;
        $name = isset($body['name']) ? trim((string)$body['name']) : '';
        $data = $body['data'] ?? null;

        if ($name === '' || $data === null) {
            jsonResponse(['error' => 'Champs requis: name, data'], 400);
        }

        // data : accepte array ou string JSON
        if (is_array($data)) {
            $data = json_encode($data);
        } else {
            $data = (string)$data;
        }

        $savedId = $this->model->save($id, $name, $data, null);
        jsonResponse(['ok' => true, 'id' => $savedId], 200);
    }

    public function delete(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Méthode non autorisée'], 405);
        }

        $body = readJsonBody();
        $id = isset($body['id']) ? (int)$body['id'] : 0;

        if ($id <= 0) {
            jsonResponse(['error' => 'Champ requis: id'], 400);
        }

        $deleted = $this->model->delete($id);
        if (!$deleted) {
            jsonResponse(['error' => 'Preset introuvable'], 404);
        }

        jsonResponse(['ok' => true], 200);
    }
}