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
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Pâtes, semoule', @section, 'kg', 10, NULL, 'coquillettes, spaghetti, macaronis, penne, tagliatelles, nouilles, vermicelles, lasagnes, couscous, semoule');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, NULL, '2000000007380', 1), (@categorie, 500, NULL, '2000000007397', 2), (@categorie, 1000, NULL, '2000000007403', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Riz', @section, 'kg', 20, NULL, 'basmati, thaï, riz long, riz rond, risotto');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 500, NULL, '2000000007410', 1), (@categorie, 1000, NULL, '2000000007427', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Purée', @section, 'kg', 30, NULL, 'purée en flocons, flocons de pomme de terre, Mousline');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 125, 'Sachet', '2000000004242', 1), (@categorie, 500, 'Boîte', '2000000004259', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Farine', @section, 'kg', 40, NULL, 'farine de blé, Maïzena, fécule, levure');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 1000, NULL, '2000000007359', 1);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Légumes secs', @section, 'kg', 50, NULL, 'lentilles, pois chiches, haricots secs, pois cassés, flageolets, fèves, quinoa');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 500, NULL, '2000000007731', 1), (@categorie, 1000, NULL, '2000000014067', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Soupes', @section, 'unite', 60, NULL, 'soupe, potage, velouté, bouillon, soupe déshydratée');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, NULL, 'Sachet', '2000000007090', 1), (@categorie, NULL, 'Brique 25 cl', '2000000009056', 2), (@categorie, NULL, 'Brique 1 L', '2000000007458', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Huile', @section, 'L', 70, NULL, 'tournesol, olive, colza, arachide, noix');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 1000, 'Olive / colza', '2000000019758', 1), (@categorie, 1000, 'Tournesol, autres', '2000000007472', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Sauces, condiments, épices', @section, 'unite', 80, '2000000008103', 'ketchup, mayonnaise, moutarde, vinaigre, vinaigrette, sauce tomate, cornichons, olives, sel, poivre, herbes, bouillon cube');
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Apéritif, chips', @section, 'unite', 90, '2000000008110', 'chips, biscuits apéritif, cacahuètes, crackers, graines, snack');

-- Conserves
INSERT INTO section (nom, ordre) VALUES ('Conserves', 20);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Conserves de légumes', @section, 'kg', 100, NULL, 'haricots verts, petits pois, maïs, carottes, champignons, épinards, ratatouille, tomates pelées, concentré de tomate, macédoine');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 140, '1/6', '2000000007588', 1), (@categorie, 220, '1/4', '2000000007595', 2), (@categorie, 400, '1/2', '2000000007601', 3), (@categorie, 800, '4/4', '2000000007618', 4);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Légumineuses en conserve', @section, 'kg', 110, NULL, 'lentilles, pois chiches, haricots blancs, haricots rouges, flageolets, fèves');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, '1/4', '2000000019697', 1), (@categorie, 400, '1/2', '2000000019680', 2), (@categorie, 800, '4/4', '2000000019673', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Plats cuisinés', @section, 'kg', 120, NULL, 'cassoulet, raviolis, chili, couscous, choucroute, petit salé, paella, plat préparé');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 400, NULL, '2000000007700', 1), (@categorie, 800, NULL, '2000000007717', 2), (@categorie, 1200, NULL, '2000000007694', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Conserves de viande', @section, 'kg', 130, NULL, 'pâté, rillettes, terrine, corned beef, saucisses, poulet');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, NULL, '2000000007687', 1), (@categorie, 400, NULL, '2000000007670', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Conserves de poisson', @section, 'kg', 140, NULL, 'thon, sardines, maquereaux, saumon, anchois, miettes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 150, NULL, '2000000007656', 1), (@categorie, 300, NULL, '2000000007663', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Fruits au sirop', @section, 'kg', 150, NULL, 'pêches, poires, ananas, abricots, macédoine de fruits, cocktail de fruits');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 400, NULL, '2000000007366', 1), (@categorie, 800, NULL, '2000000007373', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Desserts en conserve', @section, 'kg', 160, NULL, 'crème dessert, Mont Blanc, crème de marrons, riz au lait, semoule au lait, flan');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, NULL, '2000000007823', 1), (@categorie, 500, NULL, '2000000007830', 2);

-- Petit-déjeuner et sucré
INSERT INTO section (nom, ordre) VALUES ('Petit-déjeuner et sucré', 30);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Café', @section, 'kg', 170, NULL, 'café moulu, café en grains, arabica');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, NULL, '2000000007311', 1);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Thé, infusion, café soluble', @section, 'unite', 180, '2000000008097', 'thé, tisane, infusion, chicorée, Ricoré, Nescafé, capsules, dosettes');
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Chocolat', @section, 'kg', 190, NULL, 'chocolat noir, chocolat au lait, tablette, cacao, chocolat en poudre, Nesquik, Banania');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 100, 'Tablette', '2000000007335', 1), (@categorie, 400, 'Poudre', '2000000007342', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Biscuits, céréales', @section, 'kg', 200, NULL, 'biscuits, gâteaux secs, céréales, corn flakes, muesli, flocons d''avoine, madeleines, brioche, pain d''épices, barres de céréales');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 20, 'Mini', '2000000009100', 1), (@categorie, 250, NULL, '2000000011394', 2), (@categorie, 500, NULL, '2000000004273', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Confiture, pâte à tartiner', @section, 'kg', 210, NULL, 'confiture, gelée, marmelade, miel, Nutella, pâte à tartiner');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 370, NULL, '2000000007526', 1), (@categorie, 750, NULL, '2000000007533', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Compote', @section, 'kg', 220, NULL, 'compote, purée de fruits, gourde');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 100, 'Gourde', '2000000005454', 1), (@categorie, 400, NULL, '2000000007540', 2), (@categorie, 650, NULL, '2000000007564', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Sucre', @section, 'kg', 230, NULL, 'sucre en poudre, sucre en morceaux, cassonade, sucre roux');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 1000, NULL, '2000000007502', 1);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Fruits secs', @section, 'kg', 240, NULL, 'raisins secs, pruneaux, abricots secs, dattes, figues, amandes, noix, noisettes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 250, NULL, '2000000007809', 1), (@categorie, 500, NULL, '2000000007809', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Bonbons, confiserie', @section, 'unite', 250, '2000000008080', 'bonbons, chocolats, confiserie, sucettes, chewing-gum, barres chocolatées');

-- Boissons
INSERT INTO section (nom, ordre) VALUES ('Boissons', 40);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Eau', @section, 'L', 260, NULL, 'eau minérale, eau de source, eau gazeuse');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 500, NULL, '2000000008004', 1), (@categorie, 1500, NULL, '2000000008004', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Jus, sodas', @section, 'L', 270, NULL, 'jus de fruits, jus d''orange, soda, cola, limonade, sirop, nectar');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 330, NULL, '2000000004235', 1), (@categorie, 1500, NULL, '2000000004228', 2);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Lait', @section, 'L', 280, NULL, 'lait demi-écrémé, lait entier, lait UHT, brique de lait');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, 1000, NULL, '2000000011370', 1);

-- Bébé
INSERT INTO section (nom, ordre) VALUES ('Bébé', 50);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Petits pots', @section, 'unite', 290, NULL, 'petit pot, compote bébé, purée bébé, Blédina');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, NULL, 'Fruits', '2000000005201', 1), (@categorie, NULL, 'Légumes', '2000000005218', 2), (@categorie, NULL, 'Viande / poisson', '2000000005225', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Lait infantile', @section, 'unite', 300, NULL, 'lait 1er âge, lait 2e âge, lait de croissance, lait en poudre, Guigoz, Gallia');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, NULL, '1er âge', '2000000009025', 1), (@categorie, NULL, '2e âge', '2000000009018', 2), (@categorie, NULL, 'Croissance', '2000000009001', 3);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Céréales bébé', @section, 'unite', 310, '2000000007847', 'Blédine, céréales bébé, farine bébé');

-- Hygiène et entretien
INSERT INTO section (nom, ordre) VALUES ('Hygiène et entretien', 60);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Hygiène', @section, 'unite', 320, '2000000009865', 'savon, gel douche, shampoing, dentifrice, brosse à dents, déodorant, coton, serviettes hygiéniques, protections, rasoir, mouchoirs, papier toilette, lingettes');
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Couches', @section, 'unite', 330, NULL, 'couches, change bébé, Pampers, culottes');
SET @categorie = LAST_INSERT_ID();
INSERT INTO format (categorie_id, contenance, libelle, code_aida, ordre) VALUES (@categorie, NULL, 'T1-2', '2000000005270', 1), (@categorie, NULL, 'T3', '2000000005287', 2), (@categorie, NULL, 'T4', '2000000005294', 3), (@categorie, NULL, 'T5', '2000000005300', 4), (@categorie, NULL, 'T6', '2000000005317', 5);
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Entretien, lessive', @section, 'unite', 340, '2000000009858', 'lessive, liquide vaisselle, javel, éponge, nettoyant, produit ménager, adoucissant');

-- Divers
INSERT INTO section (nom, ordre) VALUES ('Divers', 70);
SET @section = LAST_INSERT_ID();
INSERT INTO categorie (nom, section_id, unite, ordre, code_reference, mots_cles) VALUES ('Autre', @section, 'unite', 350, NULL, NULL);
