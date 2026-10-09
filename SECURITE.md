# Sécurité de Mon Budget

Application 100 % locale (PWA) : pas de serveur, pas de compte. Les données restent dans le `localStorage` du navigateur.
Ce document résume l'audit réalisé, les corrections apportées et les limites connues.

## Règles à respecter pour garder l'application sûre

1. **Tout texte inséré dans un gabarit `innerHTML` passe par `esc()`** (`js/helpers.js`) : noms, notes, identifiants, couleurs.
2. **Pas de script inline ni de `onclick=` dans `index.html`** : la CSP les bloque.
3. **Toute nouvelle donnée lue depuis le stockage ou un fichier passe par les fonctions `nettoyer*`** (`js/donnees.js`).
4. **Tout montant saisi passe par `montantValide()` / `budgetValide()`** (`js/config.js`).
5. **Dates et mois en heure locale** : utiliser `auj()`, `moisActuel()`, `cleMois()`, jamais `toISOString()` pour une date affichée.
6. **Ajouter tout nouveau fichier à `URLS_A_METTRE_EN_CACHE`** dans `sw.js` et incrémenter `CACHE_NAME` **et** `VERSION_APP` (`js/config.js`).
7. **Si un réseau externe devient nécessaire**, élargir `connect-src` de la CSP en connaissance de cause.

## Corrections apportées

| # | Problème | Correction | Fichiers |
|---|---|---|---|
| 1 | Texte saisi inséré sans échappement (XSS) | `esc()` partout, y compris dans les attributs | `helpers.js`, `render.js`, `modals.js`, `historique.js`, `recurrentes.js`, `objectif.js`, `budgets.js` |
| 2 | Données du stockage jamais validées | Mêmes contrôles qu'une restauration, doublons d'identifiants corrigés | `storage.js`, `donnees.js` |
| 3 | Pas de Content-Security-Policy | CSP stricte, `referrer` désactivé | `index.html` |
| 4a | Données illisibles écrasées par du vide | Copie brute conservée (`budgetDataCorrompu`) | `storage.js` |
| 4b | Stockage plein sans message | `sauvegarderTout()` renvoie un succès/échec et prévient | `storage.js` |
| 4c | Deux onglets s'écrasent | Écoute de l'événement `storage` | `storage.js` |
| 4d | Restauration sans filet | État précédent gardé (`budgetAvantImport`) + bouton Annuler | `donnees.js` |
| 4e | Annulation du reset perdait les ajouts | Fusion au lieu du remplacement | `events.js` |
| 5 | Saisies sans limites | Montants 1 à 10¹², noms 40 car., notes 200 car., dates réelles | `config.js`, `modals.js`, `donnees.js`, `index.html` |
| 6 | Cache sans mise à jour automatique | Stale-while-revalidate, repli hors ligne | `sw.js` |
| 7 | Police chargée depuis Google | Inter hébergée (`fonts/inter-latin.woff2`, 48 Ko, licence SIL OFL) | `css/base.css`, `index.html` |
| 8 | Graphiques décalés d'un mois en UTC+1 | Heure locale partout | `config.js`, `render.js` |

## Ajouts de protection

- **Sauvegarde chiffrée** (`js/securite.js`) : AES-256-GCM, clé dérivée par PBKDF2-SHA256 (250 000 itérations). Mot de passe de 8 caractères minimum, non récupérable s'il est perdu.
- **Code PIN** (4 à 8 chiffres) : empreinte PBKDF2 (150 000 itérations) avec sel, jamais le code en clair. Verrouillage au démarrage et après 1 minute d'absence. Après 5 erreurs : attente de 30 s, doublée à chaque erreur, jusqu'à 15 min.
- **Récupération** : bouton pour revenir avant la dernière restauration et pour télécharger la copie des données illisibles.

## Design One UI (Samsung / Android récent)

Toute la mise en forme est dans `css/oneui.css`, chargé en dernier : il redéfinit les couleurs (variables CSS) et les formes sans toucher aux autres feuilles.

- **Thème clair / sombre / auto**, choisi dans l'onglet Réglages (voir plus bas). Les noms de variables historiques (`--noir`, `--blanc`…) sont conservés mais **leur valeur change selon le thème** : `--blanc` est « la couleur du texte ». Pour du texte posé sur un bouton coloré, utiliser `--sur-accent`.
- **Pas d'animations ajoutées** (ondulation, confettis, secousses, glissements, etc. retirés volontairement). Restent seulement les animations d'origine : apparition des cartes, compteur des montants, anneau du graphique.
- **Couleurs qui ont un sens** : vert = sain · ambre = vigilance · corail = alerte/dépassement · violet = épargne · bleu = action. Les graphiques par catégorie utilisent des teintes à part (`COULEURS_GRAPHIQUE` dans `render.js`) pour ne pas être confondus avec ces états.
- **État du mois** (`etatBudget()` dans `prevision.js`) : compare la part du budget dépensée au temps écoulé. Seuils : vigilance si l'avance dépasse 15 points ; alerte à partir de 90 % du budget ; dépassé au-delà de 100 %.
- **Retour d'action** (`toast()` et `vibrer()` dans `helpers.js`) : couleur, icône et vibration par type (`info`, `succes`, `entree`, `epargne`, `alerte`, `danger`). Pas de vibration sans geste de la personne, ni si les animations sont réduites.
- **Navigation** : barre flottante en bas (zone de pouce), avec les marges de sécurité des écrans à encoche (`viewport-fit=cover`).
- **Police** : `system-ui` en premier (police One UI native sur Samsung), Inter hébergée en repli.

## Prévision de fin de mois (`js/prevision.js`)

Aucune IA : un calcul simple et explicable, 100 % local.

`fin de mois = dépenses d'aujourd'hui + rythme des dépenses VARIABLES × jours restants + récurrentes encore à venir`

- **Dépenses variables** : tout ce qui n'est pas une récurrence. Leur rythme (FCFA par jour depuis le 1er) est prolongé jusqu'à la fin du mois.
- **Récurrentes déjà payées** : comptées telles quelles, jamais « projetées » (un loyer payé le 1er ne se répète pas chaque jour).
- **Récurrentes à venir ce mois-ci** : ajoutées à leur vraie date (`fixesDuMois()`), ce qui permet aussi de dire « budget atteint le 25 » au bon jour.
- **Pas de prévision** avant le 5 du mois, sans dépense ni récurrence, ou si le budget est déjà atteint.
- `etatBudget()` suit la même logique : une récurrence payée n'est pas prise pour une dépense « trop rapide », et les récurrentes à venir sont déduites du « X FCFA par jour » disponible. Si elles suffisent à dépasser le budget, l'état passe en alerte.
- Limites : le rythme variable est supposé constant (pas de saisonnalité ni de week-ends), et l'application n'apprend pas des mois précédents.

## Onglet Réglages (`js/reglages.js`)

Cinquième onglet de la barre de navigation. Il regroupe : **Profil** (prénom), **Apparence** (thème Auto / Clair / Sombre, couleur principale, taille du texte), **Alertes** (seuil de 70 / 80 / 90 % et vibrations), **Sauvegarde et données** (sauvegarde, sauvegarde chiffrée, restauration, CSV, récupération, suppression des dépenses), **Verrouillage** (code PIN) et **Application** (version, mise à jour, réinitialisation des réglages).

- **Mémorisation** : clé `budgetPrefs` du `localStorage`. Toute valeur lue passe par `nettoyerPrefs()` : un réglage invalide ou modifié retombe sur la valeur par défaut.
- **Thème** : `js/verrou-precoce.js` (dans `<head>`) et `reglages.js` posent **toujours** `data-theme="light"` ou `"dark"` sur `<html>` ; en mode Auto, c'est le téléphone qui décide (et l'application suit s'il change). Un seul bloc de couleurs claires à maintenir dans `css/oneui.css`. Couleur principale : `data-accent`, taille du texte : `data-texte`.
- **Le prénom** est affiché avec `textContent` (jamais interprété comme du HTML).
- **Les réglages voyagent avec la sauvegarde** (`preferences` dans le fichier JSON, chiffré ou non). Une ancienne sauvegarde sans réglages laisse les réglages actuels.
- **« Mettre à jour l'application »** retire le service worker et son cache puis recharge la page, sans toucher aux données.

## Mises à jour de l'application (service worker)

- Le cache fonctionne en « cache d'abord », **par version** : tous les fichiers d'une version sont rangés ensemble (en ignorant le cache HTTP du navigateur) et remplacent l'ancienne version d'un bloc. On ne voit donc jamais un mélange d'anciens et de nouveaux fichiers (ce mélange est ce qui donnait un thème « à moitié appliqué »).
- Quand une nouvelle version prend la main, la page se recharge une fois (`js/app.js`).
- **Conséquence : à chaque modification, il faut changer le numéro de version** dans `sw.js` (`CACHE_NAME`) **et** dans `js/config.js` (`VERSION_APP`), sinon les utilisateurs gardent l'ancienne version. Tout nouveau fichier doit aussi être ajouté à `URLS_A_METTRE_EN_CACHE`.

## Ce que la CSP autorise

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'
```

`'unsafe-inline'` n'est requis que pour les attributs `style=""` générés par l'application. Aucun script inline n'est autorisé.

## Limites connues (à connaître honnêtement)

- **Le PIN est un verrou léger.** Les données restent en clair dans le `localStorage`. Quelqu'un qui maîtrise les outils du navigateur peut les lire, ou supprimer le PIN et son compteur d'essais. Il protège d'un regard curieux, pas d'une personne déterminée.
- **Le chiffrement et le PIN exigent une connexion sécurisée** (https ou localhost), car `crypto.subtle` n'existe pas ailleurs.
- **Code PIN oublié** : la seule issue est d'effacer les données de l'appareil puis de restaurer un fichier de sauvegarde. Faire des sauvegardes régulières est donc indispensable.
- **Clickjacking** : une balise `<meta>` ne permet pas `frame-ancestors`. Sur un hébergement sans en-têtes HTTP (ex. GitHub Pages), l'intégration dans une iframe ne peut pas être bloquée.
- **Hébergement partagé** : sur `utilisateur.github.io/...`, tous les dépôts du même compte partagent le même `localStorage`. Préférer un domaine dédié si possible.
- **Service worker** : le nouveau comportement du cache n'a pas pu être testé dans l'environnement de développement. À vérifier sur téléphone (mode avion).
- **Design non testé sur un vrai Samsung** : vibration, police One UI et dépliage d'un Galaxy Fold sont à vérifier sur l'appareil.
- **Autres points non traités** : pas de chiffrement des données au repos ; la sauvegarde JSON non chiffrée contient toutes les données en clair.

## Tests réalisés (navigateur, serveur local)

- Données illisibles : copie de secours créée, message affiché.
- Stockage plein simulé : échec détecté, message affiché, retour à la normale ensuite.
- Synchronisation entre onglets, restauration puis annulation.
- Charges XSS (`<img onerror>`, couleur avec guillemet, identifiant avec guillemet) : rien ne s'exécute, texte affiché tel quel.
- CSP : script inline et appel réseau externe bloqués.
- Montants hors limites, dates impossibles, longueurs maximales.
- Chiffrement : aller-retour, mauvais mot de passe, itérations anormales, import de bout en bout.
- PIN : formats, verrouillage au rechargement, blocage après 5 erreurs, reverrouillage après 61 s (pas après 5 s), changement et retrait du code.
- Récupération : les deux boutons, échange réversible, « Code oublié ? ».
- Design : les 4 états du budget, les couleurs des messages, onglets Aperçu / Argent / Analyse / Historique, feuille de saisie.
- Prévision : sans récurrences, résultat identique à l'ancien calcul (203 911 pour 59 200 au 9e jour) ; avec un loyer payé le 1er, plus de fausse alerte (103 333 → 54 444) ; récurrente à venir ajoutée à sa date ; filtrage par poste ; alerte quand les seules récurrentes à venir dépassent le budget ; cas limites (trop tôt, budget atteint, rien à projeter) ; courbe et messages affichés sans erreur.
- Réglages : 30 contrôles réussis (structure et déplacement des blocs, thème Clair / Sombre / Auto avec un téléphone en mode sombre, couleur principale et ses variantes claires, texte grand, prénom piégé sans exécution de code et limité à 30 caractères, seuil d'alerte qui redessine les cartes, vibrations coupées, valeurs invalides et JSON illisible, réinitialisation, réglages inclus dans la sauvegarde et restaurés, ancienne sauvegarde sans réglages, CSP, chiffrement). Les cinq onglets ont été vus en thème clair avec un téléphone en mode sombre.
- **Batterie de non-régression rejouée après le retrait du thème et des animations : 24 contrôles sur 24 réussis** (application toujours sombre même si le téléphone est en mode clair, plus aucune fonction de thème ni d'animation, ajout de dépense / entrée / épargne, navigation, saisie refusée, XSS, CSP, copie de secours, stockage plein, bornes, dates, fuseau, chiffrement, PIN, prévision, états du budget). Console sans erreur. Le cache hors ligne contient bien tous les fichiers de l'application.

## Historique des versions du cache (`sw.js`)

`v30` → `v42` au fil des corrections, du thème One UI sombre (`css/oneui.css`) et de la prévision améliorée. Toute nouvelle modification de code doit incrémenter ce numéro.
