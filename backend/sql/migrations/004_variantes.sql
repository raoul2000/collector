-- Variantes : un format peut porter un libellé (« Olive / colza » 1 L, « T4 » pour des couches) ;
-- la saisie retient le bouton choisi

-- Index propre à la clé étrangère, avant de retirer l'unicité (deux variantes peuvent avoir la même contenance)
ALTER TABLE format ADD KEY idx_format_categorie (categorie_id);

ALTER TABLE format
    DROP INDEX uq_format_categorie_contenance,
    MODIFY contenance INT UNSIGNED NULL COMMENT 'g ou ml ; NULL pour une variante d''une catégorie à l''unité',
    ADD COLUMN libelle VARCHAR(40) NULL AFTER contenance;

ALTER TABLE saisie
    ADD COLUMN format_id INT UNSIGNED NULL COMMENT 'bouton choisi ; NULL pour une contenance libre ou inconnue' AFTER contenance_unitaire,
    ADD KEY idx_saisie_format (format_id),
    ADD CONSTRAINT fk_saisie_format FOREIGN KEY (format_id) REFERENCES format (id) ON DELETE SET NULL;
