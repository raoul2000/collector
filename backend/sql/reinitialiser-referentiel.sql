-- REMISE À ZÉRO du référentiel : SUPPRIME TOUTES LES SAISIES, puis remplace catégories et sections par la
-- liste des bénévoles. À n'utiliser que tant qu'aucune vraie saisie n'a été faite, après une sauvegarde de la base.
-- Campagnes, magasins, appareils et journal sont conservés.
-- Généré par scripts/generer-categories.mjs à partir de docs/categories/liste-benevoles.csv : ne pas modifier à la main.
-- 7 sections, 35 catégories.

SET NAMES utf8mb4;

DELETE FROM saisie;
DELETE FROM format;
DELETE FROM categorie;
DELETE FROM section;

-- Épicerie salée
INSERT INTO section (nom, ordre) VALUES ('Épicerie salée', 10);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Pâtes, semoule', @section, 'kg', 10, 'coquillettes, spaghetti, macaronis, penne, tagliatelles, nouilles, vermicelles, lasagnes, couscous, semoule');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2), (@categorie, 1000, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Riz', @section, 'kg', 20, 'basmati, thaï, riz long, riz rond, risotto');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1000, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Purée', @section, 'kg', 30, 'purée en flocons, flocons de pomme de terre, Mousline');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 125, 'Sachet', 1), (@categorie, 500, 'Boîte', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Farine', @section, 'kg', 40, 'farine de blé, Maïzena, fécule, levure');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Légumes secs', @section, 'kg', 50, 'lentilles, pois chiches, haricots secs, pois cassés, flageolets, fèves, quinoa');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1000, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Soupes', @section, 'unite', 60, 'soupe, potage, velouté, bouillon, soupe déshydratée');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'Sachet', 1), (@categorie, NULL, 'Brique 25 cl', 2), (@categorie, NULL, 'Brique 1 L', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Huile', @section, 'L', 70, 'tournesol, olive, colza, arachide, noix');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, 'Olive / colza', 1), (@categorie, 1000, 'Tournesol, autres', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Sauces, condiments, épices', @section, 'unite', 80, 'ketchup, mayonnaise, moutarde, vinaigre, vinaigrette, sauce tomate, cornichons, olives, sel, poivre, herbes, bouillon cube');
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Apéritif, chips', @section, 'unite', 90, 'chips, biscuits apéritif, cacahuètes, crackers, graines, snack');

-- Conserves
INSERT INTO section (nom, ordre) VALUES ('Conserves', 20);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Conserves de légumes', @section, 'kg', 100, 'haricots verts, petits pois, maïs, carottes, champignons, épinards, ratatouille, tomates pelées, concentré de tomate, macédoine');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 140, '1/6', 1), (@categorie, 220, '1/4', 2), (@categorie, 400, '1/2', 3), (@categorie, 800, '4/4', 4);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Légumineuses en conserve', @section, 'kg', 110, 'lentilles, pois chiches, haricots blancs, haricots rouges, flageolets, fèves');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, '1/4', 1), (@categorie, 400, '1/2', 2), (@categorie, 800, '4/4', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Plats cuisinés', @section, 'kg', 120, 'cassoulet, raviolis, chili, couscous, choucroute, petit salé, paella, plat préparé');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 400, NULL, 1), (@categorie, 800, NULL, 2), (@categorie, 1200, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Conserves de viande', @section, 'kg', 130, 'pâté, rillettes, terrine, corned beef, saucisses, poulet');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 400, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Conserves de poisson', @section, 'kg', 140, 'thon, sardines, maquereaux, saumon, anchois, miettes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 150, NULL, 1), (@categorie, 300, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Fruits au sirop', @section, 'kg', 150, 'pêches, poires, ananas, abricots, macédoine de fruits, cocktail de fruits');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 400, NULL, 1), (@categorie, 800, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Desserts en conserve', @section, 'kg', 160, 'crème dessert, Mont Blanc, crème de marrons, riz au lait, semoule au lait, flan');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2);

-- Petit-déjeuner et sucré
INSERT INTO section (nom, ordre) VALUES ('Petit-déjeuner et sucré', 30);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Café', @section, 'kg', 170, 'café moulu, café en grains, arabica');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Thé, infusion, café soluble', @section, 'unite', 180, 'thé, tisane, infusion, chicorée, Ricoré, Nescafé, capsules, dosettes');
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Chocolat', @section, 'kg', 190, 'chocolat noir, chocolat au lait, tablette, cacao, chocolat en poudre, Nesquik, Banania');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 100, 'Tablette', 1), (@categorie, 400, 'Poudre', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Biscuits, céréales', @section, 'kg', 200, 'biscuits, gâteaux secs, céréales, corn flakes, muesli, flocons d''avoine, madeleines, brioche, pain d''épices, barres de céréales');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 20, 'Mini', 1), (@categorie, 250, NULL, 2), (@categorie, 500, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Confiture, pâte à tartiner', @section, 'kg', 210, 'confiture, gelée, marmelade, miel, Nutella, pâte à tartiner');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 370, NULL, 1), (@categorie, 750, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Compote', @section, 'kg', 220, 'compote, purée de fruits, gourde');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 100, 'Gourde', 1), (@categorie, 400, NULL, 2), (@categorie, 650, NULL, 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Sucre', @section, 'kg', 230, 'sucre en poudre, sucre en morceaux, cassonade, sucre roux');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Fruits secs', @section, 'kg', 240, 'raisins secs, pruneaux, abricots secs, dattes, figues, amandes, noix, noisettes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 250, NULL, 1), (@categorie, 500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Bonbons, confiserie', @section, 'unite', 250, 'bonbons, chocolats, confiserie, sucettes, chewing-gum, barres chocolatées');

-- Boissons
INSERT INTO section (nom, ordre) VALUES ('Boissons', 40);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Eau', @section, 'L', 260, 'eau minérale, eau de source, eau gazeuse');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 500, NULL, 1), (@categorie, 1500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Jus, sodas', @section, 'L', 270, 'jus de fruits, jus d''orange, soda, cola, limonade, sirop, nectar');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 330, NULL, 1), (@categorie, 1500, NULL, 2);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Lait', @section, 'L', 280, 'lait demi-écrémé, lait entier, lait UHT, brique de lait');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, 1000, NULL, 1);

-- Bébé
INSERT INTO section (nom, ordre) VALUES ('Bébé', 50);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Petits pots', @section, 'unite', 290, 'petit pot, compote bébé, purée bébé, Blédina');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'Fruits', 1), (@categorie, NULL, 'Légumes', 2), (@categorie, NULL, 'Viande / poisson', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Lait infantile', @section, 'unite', 300, 'lait 1er âge, lait 2e âge, lait de croissance, lait en poudre, Guigoz, Gallia');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, '1er âge', 1), (@categorie, NULL, '2e âge', 2), (@categorie, NULL, 'Croissance', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Céréales bébé', @section, 'unite', 310, 'Blédine, céréales bébé, farine bébé');

-- Hygiène et entretien
INSERT INTO section (nom, ordre) VALUES ('Hygiène et entretien', 60);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Hygiène', @section, 'unite', 320, 'savon, gel douche, shampoing, dentifrice, brosse à dents, déodorant, coton, serviettes hygiéniques, protections, rasoir, mouchoirs, papier toilette, lingettes');
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Couches', @section, 'unite', 330, 'couches, change bébé, Pampers, culottes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (@categorie, NULL, 'T1-2', 1), (@categorie, NULL, 'T3', 2), (@categorie, NULL, 'T4', 3), (@categorie, NULL, 'T5', 4), (@categorie, NULL, 'T6', 5);
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Entretien, lessive', @section, 'unite', 340, 'lessive, liquide vaisselle, javel, éponge, nettoyant, produit ménager, adoucissant');

-- Divers
INSERT INTO section (nom, ordre) VALUES ('Divers', 70);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, mots_cles) VALUES ('Autre', @section, 'unite', 350, NULL);
