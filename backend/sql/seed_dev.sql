-- Données de développement : à charger sur une base vide (php bin/migrate.php --fresh --seed).
-- Les catégories viennent ensuite de categories_initiales.sql ; saisies de démonstration : php bin/generer-demo.php

INSERT INTO campagne (id, nom, date_debut, date_fin, active) VALUES
    (1, 'Collecte novembre 2025', '2025-11-28', '2025-11-29', 0),
    (2, 'Collecte novembre 2026', '2026-11-27', '2026-11-28', 1);

INSERT INTO magasin (id, nom, ville) VALUES
    (1, 'Carrefour Market', 'Centre-ville'),
    (2, 'E.Leclerc', 'Zone nord'),
    (3, 'Intermarché', 'Quartier de la gare'),
    (4, 'Lidl', 'Route de Lyon'),
    (5, 'Super U', 'Les Prés');

INSERT INTO campagne_magasin (campagne_id, magasin_id) VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5);
