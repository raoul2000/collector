-- Mots-clés des catégories : recherche d'une catégorie par le bénévole (« lentilles » → Légumineuses en conserve)

ALTER TABLE categorie
    ADD COLUMN mots_cles VARCHAR(500) NULL COMMENT 'mots-clés de recherche, séparés par des virgules' AFTER code_reference;
