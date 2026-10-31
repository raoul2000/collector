-- Sections : groupes de catégories, repères de la grille de saisie (ex. « Conserves »)

CREATE TABLE section (
    id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom     VARCHAR(60)  NOT NULL,
    ordre   INT          NOT NULL DEFAULT 0,
    cree_le DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_section_nom (nom),
    KEY idx_section_ordre (ordre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une catégorie sans section est affichée après les sections ; supprimer une section n'efface pas ses catégories
ALTER TABLE categorie
    ADD COLUMN section_id INT UNSIGNED NULL AFTER nom,
    ADD KEY idx_categorie_section (section_id),
    ADD CONSTRAINT fk_categorie_section FOREIGN KEY (section_id) REFERENCES section (id) ON DELETE SET NULL;
