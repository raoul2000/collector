# Collector — Recette sur téléphones

Scénarios à dérouler en production (https://collecte.exdata.info), avant la collecte, sur **Android et iPhone**. Voir le [plan](plan.md), étape 4.3.

- ★ : scénario bloquant ; en cas d'échec, on corrige avant la collecte.
- Cases à remplir : ✅ conforme, ❌ échec (noter ce qui s'est passé dans « Remarques »), — sans objet.
- À traiter en premier, car une erreur y fausserait les chiffres : bloc C, puis E3, F1, H1 et H3.

## Préparation

- Une campagne « Recette » active, avec 2 ou 3 magasins.
- Un responsable connecté sur un ordinateur.
- Au moins un téléphone Android et un iPhone ; le nombre de participants reste à fixer. Une seule personne peut tenir deux téléphones, sauf pour F1, plus parlant à trois téléphones ou plus.
- Une feuille pour noter les totaux de F1.
- Une campagne qui a reçu des saisies ne peut pas être supprimée : la campagne « Recette » restera dans l'historique.

## A. Installation et premier lancement

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| A1 ★ | Ouvrir l'application par le lien, saisir le prénom, choisir le magasin | Arrivée sur l'écran de saisie, magasin affiché en haut | | | |
| A2 ★ | Ajouter à l'écran d'accueil, puis ouvrir l'icône | Plein écran, sans barre du navigateur | | | |
| A3 ★ | Saisir dans le navigateur, installer, puis ouvrir l'icône (surtout sur iPhone, où Safari et l'icône peuvent ne pas partager leurs données) | Noter si les saisies et le prénom suivent ; sinon, vérifier que les saisies déjà faites arrivent bien au serveur et le signaler dans la fiche bénévole | | | |
| A4 | Fermer complètement, puis rouvrir | Arrivée directe sur la saisie | | | |

## B. Saisie

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| B1 ★ | Saisir « 2 × Pâtes 500 g » en chronométrant, d'une seule main | Moins de 5 s, confirmation affichée, retour à la grille | | | |
| B2 ★ | Saisir sur une variante (Huile olive/colza 1 L) et à l'unité (Couches T3) | Variante correcte dans Mes saisies et côté responsable | | | |
| B3 | Utiliser le champ libre (750 g, 1,5 L), puis « Contenance inconnue » | Valeur exacte ; avertissement, puis article compté sans poids | | | |
| B4 | Tester les limites : quantité 51, 1000, 0, contenance 30 kg | Confirmation à 51, refus des autres valeurs | | | |
| B5 | Annuler la dernière saisie | Saisie retirée, y compris côté serveur | | | |
| B6 | Vérifier les récents et la barre de sections | Les 4 dernières catégories en haut, accès direct aux sections | | | |
| B7 ★ | Rechercher « riz », « thon », « CAFE », « céréale » (accents, majuscules, singulier) | Bons résultats, variante ouverte directement | | | |
| B8 | Chercher un mot inconnu, puis choisir une catégorie | Le mot remonte dans « Recherches sans résultat » avec la catégorie choisie | | | |

## C. Coupure réseau

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| C1 ★ | Mode avion : faire 10 saisies, une modification et une suppression | Tout fonctionne, l'indicateur affiche « N en attente » | | | |
| C2 ★ | Mode avion : redémarrer le téléphone, puis rouvrir | L'application et la liste sont là, les saisies en attente aussi | | | |
| C3 ★ | Réactiver le réseau | Envoi automatique, totaux exacts côté serveur, ni perte ni doublon | | | |
| C4 | Couper le réseau pendant un envoi d'une cinquantaine de saisies | Reprise sans doublon | | | |
| C5 | Réseau faible (fond de magasin, mode économie de données) | La saisie reste fluide, sans message bloquant | | | |
| C6 | Application en arrière-plan ou fermée au retour du réseau, puis rouvrir | Envoi à l'ouverture | | | |

## D. Changement de magasin

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| D1 ★ | Saisir au magasin 1, changer pour le 2, puis saisir | Chaque saisie est rattachée au bon magasin, les anciennes ne bougent pas | | | |
| D2 | Faire la même chose hors ligne | Même résultat après l'envoi | | | |

## E. Corrections

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| E1 ★ | Le bénévole modifie, puis supprime une saisie déjà envoyée | Répercuté sur le serveur et dans les bilans | | | |
| E2 ★ | Le responsable corrige « 500 × Pâtes » | Version corrigée sur le téléphone, mention affichée, trace dans le journal | | | |
| E3 ★ | Conflit : téléphone hors ligne, le bénévole modifie la saisie que le responsable corrige aussi, puis retour du réseau | La correction du responsable l'emporte sur les deux | | | |
| E4 | Le responsable déplace des saisies vers un autre magasin | Bilans des deux magasins à jour | | | |

## F. Plusieurs téléphones en simultané

| # | Action | Résultat attendu | Résultat | Remarques |
|---|---|---|---|---|
| F1 ★ | Tous les téléphones, 15 minutes de saisies, dont un qui coupe le réseau par moments. Chacun note ses totaux sur papier. | Totaux du bilan identiques au papier (articles, kg, L, articles sans poids) | | |
| F2 | Vérifier les bilans bénévole et responsable pendant ce temps | Mise à jour en 30 s environ, aucune comparaison entre bénévoles | | |
| F3 | Vérifier l'onglet Appareils et l'export Excel | Tous les appareils présents, export conforme au bilan | | |

## G. Conditions de terrain

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| G1 ★ | Utiliser l'application dehors, en plein jour, luminosité moyenne | Lisible, boutons faciles à toucher, y compris avec des gants fins | | | |
| G2 | Utiliser un téléphone ancien ou d'entrée de gamme | Reste utilisable | | | |
| G3 | Saisir pendant 1 h, écran souvent allumé | Consommation de batterie acceptable | | | |
| G4 | Mesurer le chargement initial | Moins de 300 Ko | | | |

## H. Changements côté serveur

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| H1 ★ | Déployer une mise à jour alors qu'un téléphone a des saisies en attente | Nouvelle version prise en compte, aucune saisie perdue | | | |
| H2 | Ajouter, puis désactiver une catégorie, alors qu'un téléphone est hors ligne et l'utilise | Saisie conservée, liste à jour au retour du réseau | | | |
| H3 ★ | Après la recette : activer la vraie campagne | Les téléphones de test passent à la nouvelle campagne, leurs anciennes saisies ne s'y retrouvent pas, et les bilans partent de zéro | | | |

## I. Produits à privilégier

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| I1 ★ | Application ouverte sur la saisie : le responsable coche deux catégories | En 30 s environ, message « La liste des produits à privilégier a changé » et point rouge sur l'onglet Collecte ; la grille ne bouge pas | | | |
| I2 ★ | Ouvrir l'onglet Collecte | Les deux produits sont listés, le point rouge disparaît | | | |
| I3 | Le responsable décoche tout | Message, point rouge, puis « Aucun produit à privilégier » dans Collecte | | | |
| I4 | Mode avion : ouvrir Collecte, puis redémarrer le téléphone et rouvrir | La liste reste affichée, avec la mention qu'elle n'est peut-être plus à jour | | | |
| I5 | Téléphone hors ligne pendant un changement, puis retour du réseau | Message et point rouge au retour du réseau | | | |
| I6 ★ | Activer une nouvelle campagne (avec H3) | La liste repart vide | | | |

## J. Thème sombre

| # | Action | Résultat attendu | Android | iPhone | Remarques |
|---|---|---|---|---|---|
| J1 ★ | Dans Réglages, choisir **Sombre** | Toute l'interface passe en sombre, sans changement de disposition | | | |
| J2 ★ | Parcourir Saisir, un formulaire de saisie, Mes saisies, Collecte, Réglages | Tout est lisible : bandeau de confirmation, messages, voyant de synchronisation, boîtes de dialogue | | | |
| J3 | Fermer complètement, puis rouvrir, y compris en mode avion | Le thème choisi est conservé | | | |
| J4 | Depuis Réglages, ouvrir l'espace responsable | Il reste en thème standard | | | |
| J5 | Utiliser le thème sombre dehors, puis le thème standard | Noter l'écart de lisibilité | | | |

## Anomalies

| # | Scénario | Téléphone | Description | Bloquant ? | État |
|---|---|---|---|---|---|
| | | | | | |
