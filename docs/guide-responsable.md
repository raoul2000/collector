# Collector — Guide du responsable

Ce guide accompagne la préparation, le suivi et la clôture d'une collecte avec Collector.

**Espace responsable :** `https://<adresse>/admin` — connexion avec **votre prénom** et le **mot de passe partagé** des responsables.

- Le prénom indiqué est enregistré dans le journal des modifications (corrections, créations…).
- Sans activité pendant 12 heures, la session se ferme : il suffit de se reconnecter.
- Après 5 mots de passe erronés, la connexion est bloquée 15 minutes.

---

## 1. Avant la collecte (une semaine avant)

### 1.1 Magasins

Onglet **Magasins** → **Nouveau magasin** : nom (ex. *Carrefour Market*) et, si besoin, ville ou quartier pour distinguer deux magasins de la même enseigne.

Un magasin **désactivé** n'est plus proposé aux bénévoles. Un magasin qui a des saisies ne peut pas être supprimé (le désactiver à la place).

### 1.2 Catégories

Onglet **Catégories** :

- **Ordre** : avec les flèches ↑ ↓, placez en tête les catégories les plus fréquentes. C'est l'ordre des cases sur l'écran des bénévoles.
- **Mesure** : *Poids (kg)*, *Volume (L)* ou *Quantité seule*. Elle n'est plus modifiable dès qu'une saisie existe dans la catégorie.
- **Formats** : les contenances proposées en raccourci (ex. 250 g, 500 g, 1 kg). Quelques formats bien choisis accélèrent beaucoup la saisie ; les bénévoles peuvent toujours saisir une autre valeur.
- **Code de référence** : facultatif, pour faire le lien avec la liste de la Croix-Rouge.

### 1.3 Campagne

Onglet **Campagnes** → **Nouvelle campagne** : nom (ex. *Collecte novembre 2026*), premier et dernier jour, **magasins participants** (cocher).

Puis **Activer** la campagne. Une seule campagne est active à la fois ; sans campagne active, les bénévoles ne peuvent pas saisir.

### 1.4 Essai

1. Sur un téléphone, ouvrez l'application, choisissez un magasin et faites une ou deux saisies d'essai.
2. Vérifiez qu'elles apparaissent dans l'onglet **Bilans** et dans l'onglet **Saisies**.
3. Supprimez-les dans l'onglet **Saisies** (bouton **Supprimer**) pour qu'elles ne faussent pas les chiffres.

### 1.5 Communiquer avec les bénévoles

- Imprimez la [fiche bénévole](fiche-benevole.md) (une par point de collecte) avec l'adresse et un QR code.
- Demandez aux bénévoles d'**installer l'application la veille**, avec du réseau (la première ouverture le nécessite).

---

## 2. Pendant la collecte

### 2.1 Suivre les chiffres

Onglet **Bilans** (actualisé toutes les 30 secondes) : articles, poids, volume, par catégorie, par heure et par magasin. Le choix d'un magasin limite le bilan à ce magasin. Sous chaque graphique, **Voir le tableau** donne les chiffres exacts.

Les bénévoles voient de leur côté (onglet **Collecte**) les chiffres de leur magasin, le total général et le classement des magasins.

### 2.2 Corriger une erreur

Onglet **Saisies** : filtrez par magasin, catégorie, prénom du bénévole ou **code** de référence (il suffit d'en taper une partie).

La colonne **Code** affiche le code de référence de la catégorie. Pour retrouver les saisies dont la catégorie n'a pas encore de code, cochez **Sans code de référence**. Cliquer sur le tiret **—** d'une saisie ouvre sa catégorie pour lui ajouter un code : il s'applique alors à toutes les saisies de cette catégorie.

- **Corriger** une erreur évidente (ex. *500 × Pâtes*, mauvais magasin) : la correction est transmise au téléphone du bénévole et l'emporte sur ses éventuelles modifications ; la saisie y apparaît « Corrigée par *votre prénom* ».
- **Supprimer** un doublon : la saisie n'est plus comptée (elle reste visible avec « Afficher les saisies supprimées »).

**Bénévole qui s'est trompé de magasin** : filtrez sur son prénom (et le magasin erroné), cochez ses saisies (la case de l'en-tête coche toute la page), puis **Changer de magasin…** et choisissez le bon. Seuls les magasins actifs participant à la campagne sont proposés. Les saisies déplacées apparaissent « Corrigées par *votre prénom* » sur le téléphone. Demandez aussi au bénévole de choisir le bon magasin (onglet **Réglages**) pour ses saisies suivantes.

### 2.3 Aider un bénévole

| Situation | Que faire |
|---|---|
| Voyant **Hors ligne** | Normal sans réseau : il peut continuer, les saisies partiront seules. |
| Voyant **Erreur d'envoi** qui persiste | Vérifier que le site répond (`https://<adresse>/api/health`), puis prévenir la personne qui gère l'hébergement. |
| Saisie marquée **Refusée** dans *Mes saisies* | Rare (catégorie supprimée, par exemple) : la refaire, le motif est affiché sous la saisie. |
| Mauvais magasin choisi | Onglet **Réglages** → choisir le bon magasin ; ses saisies déjà faites se corrigent depuis l'onglet **Saisies** (voir 2.2). |
| Bandeau « Nouvelle version disponible » | Toucher **Mettre à jour**. |
| Changement de téléphone | Ses saisies déjà envoyées restent comptées ; il ne pourra plus les modifier depuis le nouveau téléphone (le responsable peut les corriger). |

### 2.4 Ce qu'il vaut mieux éviter pendant la collecte

- Changer l'ordre ou les formats des catégories (déroutant pour les bénévoles) ;
- Désactiver la campagne ou une catégorie en cours d'utilisation ;
- Mettre à jour l'application (voir la procédure de [déploiement](deploiement.md)).

Ajouter une catégorie oubliée est possible : elle apparaît sur les téléphones à leur prochaine synchronisation.

---

## 3. Après la collecte

1. **Laissez la campagne active quelques heures** (ou jusqu'au lendemain) : des téléphones restés hors ligne peuvent encore envoyer leurs dernières saisies. Demandez aux bénévoles d'ouvrir l'application une fois connectés, jusqu'à voir *À jour*.
2. Quand les chiffres ne bougent plus, **désactivez la campagne** (onglet **Campagnes**).
3. Consultez les **Bilans** de la campagne (ils restent consultables en choisissant la campagne). Les tableaux peuvent être copiés dans un tableur ; un export Excel est prévu dans une version ultérieure.
4. Faites (ou faites faire) une **sauvegarde de la base** (voir [déploiement](deploiement.md), section Sauvegardes).

**L'année suivante :** créez une nouvelle campagne, cochez les magasins participants et activez-la. Magasins et catégories sont conservés d'une année sur l'autre ; les bilans des campagnes précédentes restent consultables.

---

## 4. Questions fréquentes

**Changer le mot de passe des responsables ?** C'est une opération technique : générer le nouveau hash puis modifier la configuration du serveur (voir [déploiement](deploiement.md), § 4.2).

**Une saisie a-t-elle été modifiée par un autre responsable ?** Elle porte la mention « Corrigée par *prénom* » ; chaque correction est enregistrée (valeurs avant et après) dans le journal du serveur.

**Les articles « sans poids ni volume » ?** Ce sont des articles saisis avec un poids ou un volume *Inconnu* : ils sont comptés dans le nombre d'articles mais pas dans les kilos ni les litres.
