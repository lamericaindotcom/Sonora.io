<?php
declare(strict_types=1);

final class PresetModel
{
    public function __construct(private PDO $pdo) {}

    public function listByUser(?string $userId = null): array
    {
        // Si tu n'as pas de userId, tu peux ignorer le WHERE
        if ($userId) {
            $stmt = $this->pdo->prepare("SELECT id, name, data, created_at FROM presets WHERE user_id = :uid ORDER BY id DESC");
            $stmt->execute([':uid' => $userId]);
        } else {
            $stmt = $this->pdo->query("SELECT id, name, data, created_at FROM presets ORDER BY id DESC");
        }
        return $stmt->fetchAll();
    }

    public function load(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT id, name, data, created_at FROM presets WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function save(?int $id, string $name, string $data, ?string $userId = null): int
    {
        // Upsert simple: si id fourni -> UPDATE, sinon INSERT
        if ($id) {
            $stmt = $this->pdo->prepare("UPDATE presets SET name = :name, data = :data WHERE id = :id");
            $stmt->execute([
                ':name' => $name,
                ':data' => $data,
                ':id'   => $id,
            ]);
            return $id;
        }

        if ($userId) {
            $stmt = $this->pdo->prepare("INSERT INTO presets (name, data, user_id) VALUES (:name, :data, :uid)");
            $stmt->execute([':name' => $name, ':data' => $data, ':uid' => $userId]);
        } else {
            $stmt = $this->pdo->prepare("INSERT INTO presets (name, data) VALUES (:name, :data)");
            $stmt->execute([':name' => $name, ':data' => $data]);
        }

        return (int)$this->pdo->lastInsertId();
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM presets WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }
}