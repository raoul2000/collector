-- Schéma initial de Collector (cf. docs/specifications.md, 5.3)
-- Contenances stockées en entiers : grammes (unité kg) ou millilitres (unité L).

CREATE TABLE campagne (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom           VARCHAR(100) NOT NULL,
    date_debut    DATE         NOT NULL,
    date_fin      DATE         NOT NULL,
    active        TINYINT(1)   NOT NULL DEFAULT 0,
    -- Vaut 1 pour la campagne active, NULL sinon : l'index unique garantit une seule campagne active
    active_unique TINYINT(1) AS (IF(active = 1, 1, NULL)) VIRTUAL,
    cree_le       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_campagne_nom (nom),
    UNIQUE KEY uq_campagne_active (active_unique),
    CONSTRAINT ck_campagne_dates CHECK (date_fin >= date_debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE magasin (
    id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom     VARCHAR(100) NOT NULL,
    ville   VARCHAR(100) NOT NULL DEFAULT '',
    actif   TINYINT(1)   NOT NULL DEFAULT 1,
    cree_le DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_magasin_nom_ville (nom, ville)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE campagne_magasin (
    campagne_id INT UNSIGNED NOT NULL,
    magasin_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (campagne_id, magasin_id),
    KEY idx_campagne_magasin_magasin (magasin_id),
    CONSTRAINT fk_campagne_magasin_campagne FOREIGN KEY (campagne_id) REFERENCES campagne (id) ON DELETE CASCADE,
    CONSTRAINT fk_campagne_magasin_magasin FOREIGN KEY (magasin_id) REFERENCES magasin (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorie (
    id             INT UNSIGNED                 NOT NULL AUTO_INCREMENT,
    nom            VARCHAR(100)                 NOT NULL,
    unite          ENUM ('kg', 'L', 'unite')    NOT NULL,
    ordre          INT                          NOT NULL DEFAULT 0,
    active         TINYINT(1)                   NOT NULL DEFAULT 1,
    code_reference VARCHAR(50)                  NULL,
    cree_le        DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categorie_nom (nom),
    UNIQUE KEY uq_categorie_code_reference (code_reference),
    KEY idx_categorie_ordre (ordre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Formats prédéfinis proposés en raccourci lors de la saisie (catégories en kg ou en L uniquement)
CREATE TABLE format (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    categorie_id INT UNSIGNED NOT NULL,
    contenance   INT UNSIGNED NOT NULL COMMENT 'g ou ml',
    ordre        INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_format_categorie_contenance (categorie_id, contenance),
    CONSTRAINT fk_format_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id) ON DELETE CASCADE,
    CONSTRAINT ck_format_contenance CHECK (contenance > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Smartphone d'un bénévole, identifié par un UUID généré par l'application
CREATE TABLE appareil (
    id      CHAR(36)    NOT NULL,
    prenom  VARCHAR(50) NOT NULL,
    cree_le DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vu_le   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE saisie (
    id                      CHAR(36)          NOT NULL COMMENT 'UUID généré sur le téléphone',
    campagne_id             INT UNSIGNED      NOT NULL,
    magasin_id              INT UNSIGNED      NOT NULL,
    appareil_id             CHAR(36)          NOT NULL,
    categorie_id            INT UNSIGNED      NOT NULL,
    quantite                SMALLINT UNSIGNED NOT NULL,
    contenance_unitaire     INT UNSIGNED      NULL COMMENT 'g ou ml ; NULL si unité ou contenance inconnue',
    saisie_le               DATETIME          NOT NULL COMMENT 'heure du don, sur le téléphone',
    modifie_le              DATETIME(3)       NOT NULL COMMENT 'dernière modification (téléphone ou responsable)',
    supprime_le             DATETIME(3)       NULL COMMENT 'suppression logique',
    modifie_par_responsable VARCHAR(50)       NULL COMMENT 'prénom du dernier responsable ayant corrigé',
    corrige_le              DATETIME(3)       NULL COMMENT 'date de la dernière correction par un responsable',
    recu_le                 DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'première réception par le serveur',
    maj_le                  DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
                                              COMMENT 'dernière écriture côté serveur (synchronisation descendante)',
    PRIMARY KEY (id),
    KEY idx_saisie_bilan (campagne_id, magasin_id, saisie_le),
    KEY idx_saisie_appareil (appareil_id, maj_le),
    KEY idx_saisie_categorie (categorie_id),
    CONSTRAINT fk_saisie_campagne FOREIGN KEY (campagne_id) REFERENCES campagne (id) ON DELETE RESTRICT,
    CONSTRAINT fk_saisie_magasin FOREIGN KEY (magasin_id) REFERENCES magasin (id) ON DELETE RESTRICT,
    CONSTRAINT fk_saisie_appareil FOREIGN KEY (appareil_id) REFERENCES appareil (id) ON DELETE RESTRICT,
    CONSTRAINT fk_saisie_categorie FOREIGN KEY (categorie_id) REFERENCES categorie (id) ON DELETE RESTRICT,
    CONSTRAINT ck_saisie_quantite CHECK (quantite BETWEEN 1 AND 999),
    CONSTRAINT ck_saisie_contenance CHECK (contenance_unitaire IS NULL OR contenance_unitaire > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE journal_admin (
    id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    prenom    VARCHAR(50)     NOT NULL,
    action    VARCHAR(50)     NOT NULL COMMENT 'ex. creation, modification, suppression, connexion',
    entite    VARCHAR(50)     NULL COMMENT 'ex. campagne, magasin, categorie, saisie',
    entite_id VARCHAR(36)     NULL,
    details   JSON            NULL COMMENT 'valeurs avant/après',
    cree_le   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_journal_entite (entite, entite_id),
    KEY idx_journal_date (cree_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
