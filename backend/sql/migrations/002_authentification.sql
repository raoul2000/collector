-- Sessions de l'espace responsable et limitation des tentatives de connexion

CREATE TABLE session_admin (
    jeton_hash CHAR(64)    NOT NULL COMMENT 'SHA-256 du jeton envoyé dans le cookie',
    prenom     VARCHAR(50) NOT NULL,
    cree_le    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expire_le  DATETIME    NOT NULL,
    PRIMARY KEY (jeton_hash),
    KEY idx_session_admin_expire (expire_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tentative_connexion (
    id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ip       VARCHAR(45)     NOT NULL,
    tente_le DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tentative_ip_date (ip, tente_le)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
