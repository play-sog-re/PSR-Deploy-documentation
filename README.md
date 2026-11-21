# 📘 Guide de Déploiement Complet : Applications SvelteKit Play.Sog.Re sur Pterodactyl avec SSL Cloudflare Full (Strict)

Ce guide de référence détaille l'intégralité du processus de déploiement autonome pour n'importe quelle application SvelteKit basée sur `play-sog-svelte-devkit` (**PSR-movie-selector**, **PSR-SogQuiz**, **PSR-TCG**, **PSR-Slot**, etc.) dans un conteneur **Pterodactyl** protégé par **Cloudflare** en chiffrement de bout en bout **Full (Strict)** via un certificat Origin (15 ans).

---

## 🏗️ Architecture du Déploiement

Le système de déploiement est structuré en deux composants découplés :
1. **L'Egg Pterodactyl ([`pterodactyl_egg/egg-play-sog-re-svelte-kit-game.json`](./pterodactyl_egg/egg-play-sog-re-svelte-kit-game.json))** : Un bootstrapper universel et léger. Dès le démarrage, il télécharge et met à jour l'application de déploiement Play.Sog.Re depuis ce dépôt public GitHub (`https://github.com/play-sog-re/PSR-Deploy-documentation.git`).
2. **L'Application de Déploiement ([`deployer/`](./deployer))** : Moteur Node.js autonome (sans dépendances npm tierces) qui orchestre le cycle de vie applicatif :
   - 🔑 **Authentification Git par Token** : Utilisation d'un Personal Access Token GitHub (PAT) masqué dans les logs pour cloner le repo privé sans configuration SSH.
   - 📦 **Git Privé & Mises à Jour** : Clonage initial et mise à jour atomique (`git fetch` + `git reset --hard`) lors des commits GitHub.
   - ⚙️ **Environnement (.env)** : Injection et fusion automatique des variables Pterodactyl.
   - 🔒 **SSL Cloudflare Origin** : Détection automatique des certificats SSL (HTTPS de bout-en-bout ou repli HTTP standard).
   - 🔨 **Build SvelteKit** : Gestion du cache, `npm ci` et compilation optimisée (`NODE_OPTIONS="--max-old-space-size=1536"`).
   - 🚀 **Supervision & Arrêt Propre** : Exécution surveillée du serveur Node.js avec transmission des signaux UNIX `SIGINT`/`SIGTERM`.

> ⚠️ **Sécurité importante :** Ce dépôt étant public, **aucune donnée sensible** (clé privée SSL, token GitHub, mot de passe, secret API) ne doit y être commitée. Les tokens et secrets sont renseignés dans les variables Pterodactyl et le File Manager du conteneur.

---

## 📑 Sommaire
1. [Génération du Certificat Cloudflare Origin (SSL 15 ans)](#1-génération-du-certificat-cloudflare-origin-ssl-15-ans)
2. [Création du Token d'Accès GitHub (Personal Access Token)](#2-création-du-token-daccès-github-personal-access-token)
3. [Allocation du Port sur le Nœud Pterodactyl](#3-allocation-du-port-sur-le-nœud-pterodactyl)
4. [Ouverture du Port sur le Firewall du Serveur Hôte](#4-ouverture-du-port-sur-le-firewall-du-serveur-hôte)
5. [Importation de l'Egg Universel Pterodactyl](#5-importation-de-legg-universel-pterodactyl)
6. [Création du Serveur (Conteneur de Jeu)](#6-création-du-serveur-conteneur-de-jeu)
7. [Ajout des Certificats SSL dans le Conteneur](#7-ajout-des-certificats-ssl-dans-le-conteneur)
8. [Premier Démarrage & Validation](#8-premier-démarrage--validation)
9. [Configuration Cloudflare (DNS + Origin Rule + Mode Strict)](#9-configuration-cloudflare-dns--origin-rule--mode-strict)
10. [Mises à Jour Ultérieures (Après un commit GitHub)](#10-mises-à-jour-ultérieures-après-un-commit-github)

---

## 1. Génération du Certificat Cloudflare Origin (SSL 15 ans)

Ce certificat permet au serveur Node du conteneur d'écouter nativement en HTTPS sur son port custom sans passer par Let's Encrypt (qui n'autorise que les ports standard 80/443).

1. Connectez-vous sur votre compte [Cloudflare Dashboard](https://dash.cloudflare.com/) et sélectionnez votre domaine (ex: `sog.re`).
2. Dans le menu de gauche, rendez-vous dans **SSL/TLS** > **Origin Server**.
3. Cliquez sur **Create Certificate**.
4. Laissez les options par défaut :
   - **Key type :** RSA (2048)
   - **Hostnames :** `*.sog.re`, `sog.re`
   - **Certificate Validity :** 15 years
5. Cliquez sur **Create**.
6. Deux encadrés apparaissent :
   - **Origin Certificate :** Copiez tout le texte et enregistrez-le localement dans un fichier `cert.pem`.
   - **Private Key :** Copiez tout le texte et enregistrez-le localement dans un fichier `key.pem`.
7. Cliquez sur **OK**.

---

## 2. Création du Token d'Accès GitHub (Personal Access Token)

Le conteneur Pterodactyl utilise un token GitHub pour cloner et mettre à jour votre dépôt privé sans configuration SSH :

1. Sur GitHub, allez dans **Settings** (avatar en haut à droite) > **Developer Settings** > **Personal access tokens**.
2. Sélectionnez **Fine-grained tokens** (ou *Tokens (classic)*).
3. Cliquez sur **Generate new token** :
   - **Token name :** `Pterodactyl SOG Deployer`
   - **Resource owner :** `play-sog-re`
   - **Repository access :** *Only select repositories* (sélectionnez vos jeux) ou *All repositories*.
   - **Permissions :** Dans *Repository permissions*, cochez **Contents: Read-only**.
4. Cliquez sur **Generate token** et copiez le token (`github_pat_...` ou `ghp_...`). Vous le renseignerez dans la variable **`GIT_TOKEN`**.

---

## 3. Allocation du Port sur le Nœud Pterodactyl

Chaque conteneur de jeu a besoin d'un port dédié réservé sur la machine hôte.

1. Rendez-vous sur votre panel Pterodactyl : `https://panel.votre-domaine.com/admin`.
2. Dans la barre latérale gauche, cliquez sur **Nodes**.
3. Cliquez sur le nom de votre nœud (le serveur physique qui fait tourner Wings).
4. Cliquez sur l'onglet **Allocation** en haut.
5. Dans la section de droite **Assign New Allocations** :
   - **IP Address :** L'adresse IP publique de votre serveur (ou `0.0.0.0`).
   - **Ports :** Entrez le port dédié au jeu (ex: `3005`).
   - Cliquez sur **Submit**.
   > Le port apparaît dans la liste avec le badge vert **Available**.

---

## 4. Ouverture du Port sur le Firewall du Serveur Hôte

Le trafic provenant des proxys Cloudflare doit pouvoir atteindre ce port.

Connectez-vous en SSH sur la machine physique hôte (root ou sudo) :

### Si votre serveur utilise UFW (Ubuntu / Debian) :
```bash
# Ouvrir le port TCP (remplacez 3005 par votre port alloué)
sudo ufw allow 3005/tcp comment "Pterodactyl SvelteKit Game"

# Recharger et vérifier
sudo ufw reload
sudo ufw status verbose
```

### Si votre serveur utilise firewalld (CentOS / Rocky / AlmaLinux) :
```bash
sudo firewall-cmd --permanent --add-port=3005/tcp
sudo firewall-cmd --reload
```

---

## 5. Importation de l'Egg Universel Pterodactyl

1. Dans Pterodactyl Admin, allez dans **Nests**.
2. Sélectionnez votre Nest (ou créez un Nest dédié *Play.Sog.Re*).
3. Cliquez sur **Import Egg** en haut à droite.
4. Uploadez le fichier :
   [`pterodactyl_egg/egg-play-sog-re-svelte-kit-game.json`](./pterodactyl_egg/egg-play-sog-re-svelte-kit-game.json)
5. Validez l'importation.

---

## 6. Création du Serveur (Conteneur de Jeu)

Dans Pterodactyl Admin, allez dans **Servers** > bouton vert **Create New** :

### 6.1. Core Details
- **Server Name :** Nom du jeu (ex: `Movie Selector`, `SogQuiz`, `TCG`, `Slot`).
- **Server Owner :** Sélectionnez votre compte utilisateur.

### 6.2. Allocation Management
- **Node :** Sélectionnez votre nœud.
- **Default Allocation :** Choisissez l'adresse IP et le port alloué à l'étape 3 (ex: `IP_DU_SERVEUR:3005`).

### 6.3. Resource Management (Recommandé)
- **CPU Limit :** `100%` ou plus.
- **Memory Limit :** `2048 MB` (2 Go de RAM recommandés pour la compilation SvelteKit).
- **Swap :** `1024 MB`.
- **Disk Space :** `5120 MB` (5 Go pour Node, node_modules et build).

### 6.4. Nest Configuration
- **Nest :** Votre Nest choisi.
- **Egg :** `Play.Sog.Re SvelteKit Game`.
- **Docker Image :** `ghcr.io/parkervcp/yolks:nodejs_22`.

### 6.5. Service Variables (Variables d'environnement)

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| **`DEPLOYER_REPO`** | Dépôt public de l'outil de déploiement | `https://github.com/play-sog-re/PSR-Deploy-documentation.git` |
| **`DEPLOYER_BRANCH`** | Branche du déployeur | `master` |
| **`PUBLIC_APP_ID`** | Identifiant officiel de l'application | `psr-movie-selector` *(ou `psr-sogquiz`)* |
| **`GIT_REPO`** | URL HTTPS du dépôt GitHub privé | `https://github.com/play-sog-re/PSR-movie-selector.git` |
| **`GIT_TOKEN`** | Token d'accès GitHub privé (PAT) | `github_pat_11A...` *(ou `ghp_...`)* |
| **`GIT_BRANCH`** | Branche Git du jeu à déployer | `master` *(ou `main`)* |
| **`AUTO_UPDATE`** | Mise à jour au redémarrage | `0` (Manuel) ou `1` (Automatique) |
| **`PUBLIC_PLAY_SOG_MODE`** | Mode API Play.Sog.Re | `live` *(ou `dev` pour test hors ligne)* |
| **`PUBLIC_PLAY_SOG_URL`** | URL du portail officiel | `https://play.sog.re` |
| **`PUBLIC_PLAY_SOG_API_URL`** | URL de l'API v1 | `https://play.sog.re/api/v1` |
| **`PRIVATE_GAME_SYSTEM_API_SECRET`** | Clé secrète de communication backend | `votre_secret_api_systeme` |
| **`PRIVATE_TMDB_API_KEY`** | Clé API TMDB (si Movie Selector) | `votre_cle_tmdb` *(Optionnel)* |

Cliquez sur **Create Server** en bas à droite.

---

## 7. Ajout des Certificats SSL dans le Conteneur

Avant de démarrer le serveur, déposez les certificats Cloudflare créés à l'étape 1 :

1. Ouvrez votre serveur dans le panneau utilisateur Pterodactyl : `https://panel.votre-domaine.com/server/<ID>`.
2. Rendez-vous dans l'onglet **File Manager** (Gestionnaire de fichiers).
3. Entrez dans le dossier `data/ssl/` (créé automatiquement).
4. Uploadez ou créez vos 2 fichiers :
   - `cert.pem` (Contient votre certificat d'origine Cloudflare).
   - `key.pem` (Contient votre clé privée Cloudflare).

Le chemin d'accès dans le conteneur doit être :  
`/home/container/data/ssl/cert.pem`  
`/home/container/data/ssl/key.pem`

---

## 8. Premier Démarrage & Validation

1. Allez dans l'onglet **Console** du serveur.
2. Cliquez sur le bouton **Start**.
3. Le conteneur télécharge automatiquement le déployeur, s'authentifie auprès de GitHub via votre token (`GIT_TOKEN`), clone le dépôt privé, configure le `.env`, installe les dépendances npm, compile SvelteKit et démarre l'application.
4. Le token est systématiquement masqué dans les affichages console (`https://***@github.com/...`).
5. La console confirme :
   ```text
   🔒 Certificats Cloudflare Origin détectés et valides.
   Listening on https://0.0.0.0:3005
   🔒 Serveur HTTPS démarré avec succès sur https://0.0.0.0:3005
   ```

---

## 9. Configuration Cloudflare (DNS + Origin Rule + Mode Strict)

### 9.1. Entrée DNS
1. Dans le tableau de bord Cloudflare, allez dans **DNS** > **Records**.
2. Cliquez sur **Add record** :
   - **Type :** `A`
   - **Name :** Le sous-domaine de votre jeu (ex: `movieselector` ou `sogquiz`).
   - **IPv4 address :** L'adresse IP publique de votre serveur physique Pterodactyl.
   - **Proxy status :** **Proxied** (Nuage Orange obligatoire ☁️).
3. Cliquez sur **Save**.

---

### 9.2. Origin Rule (Routage du Port)
Cette règle ordonne à Cloudflare de contacter votre conteneur sur son port dédié (ex: `3005`) au lieu du port 443 standard :

1. Dans le menu de gauche, déroulez **Rules** > cliquez sur **Origin Rules**.
2. Cliquez sur **Create rule**.
3. **Rule name :** `Forward - Movie Selector` (ou le nom du jeu).
4. Section **When incoming requests match...** :
   - Sélectionnez **Custom filter expression**.
   - **Field :** `Hostname`
   - **Operator :** `equals`
   - **Value :** Votre sous-domaine complet (ex: `movieselector.sog.re`).
5. Section **Destination Port** :
   - Cochez **Rewrite to...**.
   - Entrez le port Pterodactyl alloué (ex: `3005`).
6. Cliquez sur **Deploy**.

---

### 9.3. Activation du Mode SSL Full (Strict)
1. Dans le menu de gauche, allez dans **SSL/TLS** > **Overview**.
2. Cochez :
   🛡️ **Full (Strict)**.

> 🎉 **Terminé !**  
> Ouvrez `https://movieselector.sog.re` dans votre navigateur : l'application est en ligne avec un certificat Cloudflare valide et du HTTPS chiffré de bout-en-bout !

---

## 10. Mises à Jour Ultérieures (Après un commit GitHub)

Dès que vous poussez des commits sur GitHub :

1. Dans Pterodactyl, allez dans l'onglet **Startup**.
2. Assurez-vous que la variable **`AUTO_UPDATE`** est à **`1`**.
3. Cliquez sur **Restart** dans la console.
4. Le conteneur se charge de tout de façon transparente :
   - Récupération des nouveautés avec le token (`git fetch` + `git reset --hard origin/master`)
   - Mise à jour des packages (`npm ci`)
   - Recompilation optimisée (`NODE_OPTIONS="--max-old-space-size=1536" npm run build`)
   - Redémarrage automatique du serveur HTTPS.
