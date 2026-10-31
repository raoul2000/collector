-- Liste des catégories des bénévoles (sections, catégories, formats et variantes), construite d'après la
-- planche « Articles génériques » de la Croix-Rouge. À importer une fois sur une base neuve, après les migrations.
-- Généré par scripts/generer-categories.mjs à partir de docs/categories/liste-benevoles.csv : ne pas modifier à la main.
-- 7 sections, 35 catégories.

SET NAMES utf8mb4;

-- Épicerie salée
INSERT INTO section (nom, ordre) VALUES ('Épicerie salée', 10);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Pâtes, semoule', @section, 'kg', 10);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2), (@categorie, 1000, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Riz', @section, 'kg', 20);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1000, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Purée', @section, 'kg', 30);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 125, 'Sachet', 1), (@categorie, 500, 'Boîte', 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Farine', @section, 'kg', 40);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Légumes secs', @section, 'kg', 50);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1000, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Soupes', @section, 'unite', 60);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'Sachet', 1), (@categorie, NULL, 'Brique 25 cl', 2), (@categorie, NULL, 'Brique 1 L', 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Huile', @section, 'L', 70);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, 'Olive / colza', 1), (@categorie, 1000, 'Tournesol, autres', 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Sauces, condiments, épices', @section, 'unite', 80);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Apéritif, chips', @section, 'unite', 90);

-- Conserves
INSERT INTO section (nom, ordre) VALUES ('Conserves', 20);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Légumes', @section, 'kg', 100);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 140, '1/6', 1), (@categorie, 220, '1/4', 2), (@categorie, 400, '1/2', 3), (@categorie, 800, '4/4', 4);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Légumineuses', @section, 'kg', 110);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, '1/4', 1), (@categorie, 400, '1/2', 2), (@categorie, 800, '4/4', 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Plats cuisinés', @section, 'kg', 120);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 400, NULL, 1), (@categorie, 800, NULL, 2), (@categorie, 1200, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Viande', @section, 'kg', 130);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 400, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Poisson', @section, 'kg', 140);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 150, NULL, 1), (@categorie, 300, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Fruits au sirop', @section, 'kg', 150);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 400, NULL, 1), (@categorie, 800, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Desserts', @section, 'kg', 160);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2);

-- Petit-déjeuner et sucré
INSERT INTO section (nom, ordre) VALUES ('Petit-déjeuner et sucré', 30);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Café', @section, 'kg', 170);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Thé, infusion, café soluble', @section, 'unite', 180);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Chocolat', @section, 'kg', 190);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 100, 'Tablette', 1), (@categorie, 400, 'Poudre', 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Biscuits, céréales', @section, 'kg', 200);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 20, 'Mini', 1), (@categorie, 250, NULL, 2), (@categorie, 500, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Confiture, pâte à tartiner', @section, 'kg', 210);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 370, NULL, 1), (@categorie, 750, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Compote', @section, 'kg', 220);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 100, 'Gourde', 1), (@categorie, 400, NULL, 2), (@categorie, 650, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Sucre', @section, 'kg', 230);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Fruits secs', @section, 'kg', 240);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Bonbons, confiserie', @section, 'unite', 250);

-- Boissons
INSERT INTO section (nom, ordre) VALUES ('Boissons', 40);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Eau', @section, 'L', 260);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Jus, sodas', @section, 'L', 270);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 330, NULL, 1), (@categorie, 1500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Lait', @section, 'L', 280);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);

-- Bébé
INSERT INTO section (nom, ordre) VALUES ('Bébé', 50);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Petits pots', @section, 'unite', 290);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'Fruits', 1), (@categorie, NULL, 'Légumes', 2), (@categorie, NULL, 'Viande / poisson', 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Lait infantile', @section, 'unite', 300);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, '1er âge', 1), (@categorie, NULL, '2e âge', 2), (@categorie, NULL, 'Croissance', 3);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Céréales bébé', @section, 'unite', 310);

-- Hygiène et entretien
INSERT INTO section (nom, ordre) VALUES ('Hygiène et entretien', 60);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Hygiène', @section, 'unite', 320);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Couches', @section, 'unite', 330);
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'T1-2', 1), (@categorie, NULL, 'T3', 2), (@categorie, NULL, 'T4', 3), (@categorie, NULL, 'T5', 4), (@categorie, NULL, 'T6', 5);
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Entretien, lessive', @section, 'unite', 340);

-- Divers
INSERT INTO section (nom, ordre) VALUES ('Divers', 70);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre) VALUES ('Autre', @section, 'unite', 350);
