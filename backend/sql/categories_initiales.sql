-- Catégories et formats PROVISOIRES, à importer une fois sur une base neuve si l'on souhaite partir
-- de cette liste (sinon, les créer depuis l'espace responsable). À remplacer par la liste de référence
-- de la Croix-Rouge dès qu'elle sera disponible.

SET NAMES utf8mb4;

INSERT INTO categorie (id, nom, unite, ordre) VALUES
    (1, 'Pâtes', 'kg', 10),
    (2, 'Riz et semoule', 'kg', 20),
    (3, 'Conserves de légumes', 'kg', 30),
    (4, 'Conserves de poisson', 'kg', 40),
    (5, 'Plats cuisinés', 'kg', 50),
    (6, 'Huile', 'L', 60),
    (7, 'Lait', 'L', 70),
    (8, 'Sucre', 'kg', 80),
    (9, 'Farine', 'kg', 90),
    (10, 'Café, thé, chocolat', 'kg', 100),
    (11, 'Céréales et biscuits', 'kg', 110),
    (12, 'Confiture et pâte à tartiner', 'kg', 120),
    (13, 'Conserves de fruits et compotes', 'kg', 130),
    (14, 'Légumes secs', 'kg', 140),
    (15, 'Alimentation bébé', 'kg', 150),
    (16, 'Hygiène', 'unite', 160),
    (17, 'Entretien', 'unite', 170),
    (18, 'Couches', 'unite', 180),
    (19, 'Divers', 'unite', 190);

INSERT INTO format (categorie_id, contenance, ordre) VALUES
    (1, 250, 1), (1, 500, 2), (1, 1000, 3),
    (2, 500, 1), (2, 1000, 2),
    (3, 200, 1), (3, 400, 2), (3, 800, 3),
    (4, 115, 1), (4, 140, 2), (4, 200, 3),
    (5, 400, 1), (5, 800, 2),
    (6, 500, 1), (6, 1000, 2),
    (7, 500, 1), (7, 1000, 2),
    (8, 1000, 1),
    (9, 1000, 1),
    (10, 250, 1), (10, 500, 2),
    (11, 250, 1), (11, 375, 2), (11, 500, 3),
    (12, 370, 1), (12, 750, 2),
    (13, 400, 1), (13, 850, 2),
    (14, 500, 1), (14, 1000, 2),
    (15, 200, 1), (15, 800, 2);
