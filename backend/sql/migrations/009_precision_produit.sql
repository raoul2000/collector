-- Précision libre du bénévole sur le produit, obligatoire à la saisie pour certaines catégories (« Autre »)

ALTER TABLE categorie
    ADD COLUMN precision_requise TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'le bénévole doit décrire le produit' AFTER mots_cles;

ALTER TABLE saisie
    ADD COLUMN precision_produit VARCHAR(100) NULL COMMENT 'texte du bénévole, conservé après correction' AFTER format_id;

UPDATE categorie SET precision_requise = 1 WHERE nom = 'Autre';
