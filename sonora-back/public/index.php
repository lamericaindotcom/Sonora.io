<?php
declare(strict_types=1);

require __DIR__ . '/../config/bootstrap.php';
require __DIR__ . '/../models/PresetModel.php';
require __DIR__ . '/../controllers/PresetController.php';

$model = new PresetModel($pdo);
$controller = new PresetController($model);

// Routing via ?action=
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list_presets':
        $controller->list();
        break;

    case 'load_preset':
        $controller->load();
        break;

    case 'save_preset':
        $controller->save();
        break;

    case 'delete_preset':
        $controller->delete();
        break;

    default:
        jsonResponse([
            'error' => 'Route inconnue',
            'routes' => [
                'GET  ?action=list_presets',
                'GET  ?action=load_preset&id=123',
                'POST ?action=save_preset   (JSON: {id?, name, data})',
                'POST ?action=delete_preset (JSON: {id})',
            ]
        ], 404);
}