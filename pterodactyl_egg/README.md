# 🥚 Guide de Déploiement Pterodactyl — Jeux SvelteKit Play.Sog.Re

Ce guide détaille pas à pas la configuration complète dans **Pterodactyl** pour déployer de façon **100% autonome** vos applications SvelteKit basées sur le devkit (`PSR-movie-selector`, `PSR-SogQuiz`, `PSR-TCG`, `PSR-Slot`, etc.).

---

## 🏗️ Architecture du Déploiement

Le déploiement repose sur un modèle en deux couches :
1. **L'Egg Pterodactyl universel ([`egg-play-sog-re-svelte-kit-game.json`](./egg-play-sog-re-svelte-kit-game.json))** : Un chargeur (bootstrapper) ultra-léger et stable qui n'a plus besoin d'être modifié ou réimporté à chaque évolution.
2. **L'Application de Déploiement (`PSR-Deploy-documentation/deployer`)** : Moteur Node.js autonome téléchargé automatiquement depuis ce dépôt Git public. Il gère :
   - L'authentification Git sécurisée par **Token GitHub (Personal Access Token)** sans configuration SSH.
   - Le clonage / mise à jour atomique du dépôt privé du jeu.
   - La configuration synchronisée du fichier `.env`.
   - La détection du certificat SSL Cloudflare Origin ou du mode HTTP.
   - L'installation des dépendances (`npm ci`) et la compilation SvelteKit (`npm run build`).
   - L'exécution surveillée du serveur avec gestion gracieuse de l'arrêt (`SIGINT`/`SIGTERM`).

---

## 📋 Prérequis

1. Un accès administrateur à votre panel Pterodactyl (`https://panel.votre-domaine.com/admin`).
2. Le fichier Egg : [`egg-play-sog-re-svelte-kit-game.json`](./egg-play-sog-re-svelte-kit-game.json).
3. L'URL HTTPS de votre dépôt GitHub privé (ex: `https://github.com/play-sog-re/PSR-movie-selector.git`).
4. Un **Token GitHub** (Personal Access Token) disposant des droits de lecture sur les dépôts de l'organisation.

---

## 🔑 Étape 1 : Générer un Token d'accès GitHub (PAT)

Puisque les dépôts de jeux sont privés, le conteneur Pterodactyl a besoin d'un token d'accès pour cloner le code source :

1. Rendez-vous sur votre compte GitHub > Cliquez sur votre avatar en haut à droite > **Settings**.
2. Dans le menu de gauche tout en bas, cliquez sur **Developer Settings** > **Personal access tokens** :
   - **Option recommandée (Fine-grained token) :**
     - Cliquez sur **Fine-grained tokens** > **Generate new token**.
     - **Token name :** `Pterodactyl Deployer`
     - **Resource owner :** Sélectionnez votre organisation `play-sog-re`.
     - **Repository access :** Sélectionnez *Only select repositories* (ou *All repositories*).
     - **Permissions :** Dans *Repository permissions*, cochez **Contents: Read-only**.
     - Cliquez sur **Generate token**.
   - **Option alternative (Token Classic) :**
     - Cliquez sur **Tokens (classic)** > **Generate new token (classic)**.
     - Note : `Pterodactyl Deployer`.
     - Cochez la case **`repo`** (accès complet aux dépôts privés).
     - Cliquez sur **Generate token**.
3. Copiez le token généré (`github_pat_...` ou `ghp_...`). Vous le renseignerez dans la variable **`GIT_TOKEN`**.

---

## 📥 Étape 2 : Importer l'Egg dans Pterodactyl

1. Connectez-vous sur votre panel Pterodactyl et allez dans la section d'administration : **Admin** (icône d'engrenage en haut à droite).
2. Dans le menu de gauche, cliquez sur **Nests**.
3. Choisissez le Nest dans lequel vous souhaitez ranger vos jeux (ex: un Nest nommé *NodeJS* ou créez un Nest dédié *Play.Sog.Re* via le bouton **Create New**).
4. Cliquez sur le bouton bleu **Import Egg** en haut à droite.
5. Sélectionnez le fichier **`egg-play-sog-re-svelte-kit-game.json`**.
6. Dans le menu déroulant *Associated Nest*, sélectionnez votre Nest.
7. Cliquez sur **Import**.
   > L'Egg apparaît sous le nom **Play.Sog.Re SvelteKit Game**.

---

## 🌐 Étape 3 : Créer une Allocation de Port (Allocation)

Pterodactyl a besoin d'un port réseau libre pour exposer votre application SvelteKit :

1. Dans la section Admin, cliquez sur **Nodes** dans le menu de gauche.
2. Cliquez sur le nom de votre Node (le serveur physique qui fait tourner Wings).
3. Allez sur l'onglet **Allocation** en haut.
4. Dans le bloc *Assign New Allocations* :
   - **IP Address** : L'adresse IP publique de votre Node (ou `0.0.0.0`).
   - **Ports** : Entrez un port dédié à ce jeu (ex: `3005`, `3010`, `3456`, ou une plage `3000-3020`).
   - Cliquez sur **Submit**.
5. Votre port est désormais disponible pour être assigné à un serveur.

---

## 🖥️ Étape 4 : Créer le Serveur (Conteneur)

Toujours dans la section Admin, allez dans **Servers** > **Create New** :

### 1. Core Details
- **Server Name** : `Movie Selector` (ou `SogQuiz`, `TCG`, `Slot`...).
- **Server Owner** : Sélectionnez votre compte utilisateur.

### 2. Allocation Management
- **Node** : Sélectionnez votre Node.
- **Default Allocation** : Choisissez l'adresse IP et le port assigné à l'étape 3 (ex: `123.45.67.89:3005`).
  *(Ce port sera injecté automatiquement dans l'application comme `${SERVER_PORT}`)*.

### 3. Application Feature Limits
- Laissez les valeurs par défaut (0 base de données, 0 backup si non nécessaire).

### 4. Resource Management (Ressources recommandées)
- **CPU Limit** : `100%` (ou `200%` pour un build rapide).
- **Memory Limit** : `2048 MB` (Recommandé pour être à l'aise pendant la compilation SvelteKit).
- **Swap Limit** : `1024 MB` (Marge de sécurité mémoire).
- **Disk Space** : `4096 MB` (Suffisant pour Node, les dépendances node_modules et le build).

### 5. Nest Configuration
- **Nest** : Sélectionnez le Nest où vous avez importé l'Egg.
- **Egg** : Sélectionnez **Play.Sog.Re SvelteKit Game**.
- **Docker Image** : `ghcr.io/parkervcp/yolks:nodejs_22` (par défaut).

### 6. Variables d'Environnement (Service Variables)

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| **Dépôt Git du Déployeur** (`DEPLOYER_REPO`) | Dépôt public de l'outil de déploiement | `https://github.com/play-sog-re/PSR-Deploy-documentation.git` |
| **Branche du Déployeur** (`DEPLOYER_BRANCH`) | Branche du déployeur | `master` |
| **Identifiant App** (`PUBLIC_APP_ID`) | Identifiant unique de l'application | `psr-movie-selector` *(ou `psr-sogquiz`)* |
| **Dépôt Git du Jeu** (`GIT_REPO`) | URL HTTPS de votre dépôt privé | `https://github.com/play-sog-re/PSR-movie-selector.git` |
| **Token GitHub** (`GIT_TOKEN`) | Token d'accès généré à l'étape 1 | `github_pat_11A...` *(ou `ghp_...`)* |
| **Branche Git du Jeu** (`GIT_BRANCH`) | Branche à déployer | `master` |
| **Auto Update** (`AUTO_UPDATE`) | Mettre à jour et recompiler à chaque reboot | `0` (Manuel) ou `1` (Automatique) |
| **Mode API** (`PUBLIC_PLAY_SOG_MODE`) | Mode d'exécution de l'API | `live` *(ou `dev` pour test hors-ligne)* |
| **URL Portail** (`PUBLIC_PLAY_SOG_URL`) | URL du portail officiel | `https://play.sog.re` |
| **URL API v1** (`PUBLIC_PLAY_SOG_API_URL`) | URL de l'API v1 | `https://play.sog.re/api/v1` |
| **Secret API Système** (`PRIVATE_GAME_SYSTEM_API_SECRET`) | Clé secrète serveur-à-serveur | `votre_secret_api_systeme` |
| **Clé API TMDB** (`PRIVATE_TMDB_API_KEY`) | Clé TMDB (si Movie Selector) | `votre_cle_tmdb` *(Optionnel)* |

7. Cliquez sur le bouton vert **Create Server** en bas à droite.

---

## 🚀 Étape 5 : Premier Démarrage & Suivi des Logs

1. Rendez-vous sur la vue console du serveur Pterodactyl : `https://panel.votre-domaine.com/server/<ID>`.
2. Cliquez sur le bouton **Start**.
3. Le conteneur télécharge automatiquement l'application de déploiement Play.Sog.Re, s'authentifie auprès de GitHub via votre token, clone le dépôt privé, installe les dépendances npm (`npm ci`), compile SvelteKit et démarre l'application.
4. Le token est **automatiquement masqué** dans la console pour garantir la confidentialité (`https://***@github.com/...`).
5. La console confirme :
   ```text
   Listening on http://0.0.0.0:3005
   🌐 Serveur HTTP standard démarré sur http://0.0.0.0:3005
   ```
   *(Ou en HTTPS si les certificats Cloudflare sont déposés)*.

---

## 🔒 Étape 6 : Configuration SSL Cloudflare Origin (Optionnel mais recommandé)

Si vous utilisez Cloudflare en mode Full (Strict) :

1. Dans Pterodactyl, ouvrez le **File Manager**.
2. Allez dans `data/ssl/` (le dossier est créé automatiquement).
3. Déposez vos deux fichiers :
   - `cert.pem` : Le certificat Cloudflare Origin.
   - `key.pem` : La clé privée Cloudflare Origin.
4. Redémarrez le serveur : la console affichera :
   ```text
   🔒 Certificats Cloudflare Origin détectés et valides.
   Listening on https://0.0.0.0:3005
   🔒 Serveur HTTPS démarré avec succès sur https://0.0.0.0:3005
   ```

---

## 🔄 Étape 7 : Mises à Jour Automatiques

1. Dans l'onglet **Startup** du serveur Pterodactyl, passez **`AUTO_UPDATE`** à **`1`**.
2. Dès que vous poussez un commit sur GitHub, cliquez simplement sur **Restart**.
3. Le conteneur télécharge automatiquement le nouveau code via votre token, met à jour les dépendances, recompile SvelteKit et relance le service sans intervention manuelle.
