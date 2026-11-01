-- Produits à privilégier : catégories signalées par un responsable pour orienter les donateurs.
-- Liste propre à chaque campagne : elle repart vide à la campagne suivante.

CREATE TABLE categorie_privilegiee (
    campagne_id  INT UNSIGNED NOT NULL,
    categorie_id INT UNSIGNED NOT NULL,
    ajoute_le    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campagne_id, categorie_id),
    CONSTRAINT fk_privilegiee_campagne FOREIGN KEY (campagne_id) REFERENCES campagne (id) ON DELETE CASCADE,
    CONSTRAINT fk_privilegiee_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
