-- Recherches sans résultat des bénévoles (mot cherché, catégorie finalement choisie), pour compléter les mots-clés

CREATE TABLE recherche (
    id           CHAR(36)     NOT NULL COMMENT 'UUID généré sur le téléphone (renvoi sans doublon)',
    campagne_id  INT UNSIGNED NOT NULL,
    appareil_id  CHAR(36)     NOT NULL,
    terme        VARCHAR(100) NOT NULL COMMENT 'tel que tapé',
    categorie_id INT UNSIGNED NULL COMMENT 'catégorie choisie ensuite',
    cherche_le   DATETIME     NOT NULL COMMENT 'heure du téléphone',
    recu_le      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_recherche_campagne (campagne_id),
    CONSTRAINT fk_recherche_campagne FOREIGN KEY (campagne_id) REFERENCES campagne (id) ON DELETE CASCADE,
    CONSTRAINT fk_recherche_appareil FOREIGN KEY (appareil_id) REFERENCES appareil (id) ON DELETE CASCADE,
    CONSTRAINT fk_recherche_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mots écartés par un responsable (faute de frappe, produit hors collecte) : ils ne sont plus présentés
CREATE TABLE recherche_ignoree (
    terme      VARCHAR(100) NOT NULL COMMENT 'forme normalisée (minuscules, sans accents)',
    ignore_par VARCHAR(50)  NOT NULL,
    ignore_le  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (terme)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
