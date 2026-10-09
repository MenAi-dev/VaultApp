# Sécurité de Mon Budget

Application 100 % locale (PWA) : pas de serveur, pas de compte. Les données restent dans le `localStorage` du navigateur.
Ce document résume l'audit réalisé, les corrections apportées et les limites connues.

## Règles à respecter pour garder l'application sûre

1. **Tout texte inséré dans un gabarit `innerHTML` passe par `esc()`** (`js/helpers.js`) : noms, notes, identifiants, couleurs.
2. **Pas de script inline ni de `onclick=` dans `index.html`** : la CSP les bloque.
3. **Toute nouvelle donnée lue depuis le stockage ou un fichier passe par les fonctions `nettoyer*`** (`js/donnees.js`).
4. **Tout montant saisi passe par `montantValide()` / `budgetValide()`** (`js/config.js`).
5. **Dates et mois en heure locale** : utiliser `auj()`, `moisActuel()`, `cleMois()`, jamais `toISOString()` pour une date affichée.
6. **Ajouter tout nouveau fichier à `URLS_A_METTRE_EN_CACHE`** dans `sw.js` et incrémenter `CACHE_NAME`.
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

## Historique des versions du cache (`sw.js`)

`v30` → `v35` au fil des corrections. Toute nouvelle modification de code doit incrémenter ce numéro.
