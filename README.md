# 📘 Guide de Déploiement Complet : Jeux SvelteKit Play.Sog.Re sur Pterodactyl avec SSL Cloudflare Full (Strict)

Ce guide de référence détaille l'intégralité du processus de déploiement autonome pour n'importe quelle application SvelteKit basée sur `play-sog-svelte-devkit` (**PSR-movie-selector**, **PSR-SogQuiz**, **PSR-tcg**, etc.) dans un conteneur **Pterodactyl** protégé par **Cloudflare** en chiffrement de bout en bout **Full (Strict)** via un certificat Origin (15 ans).

---

## 📑 Sommaire
1. [Génération du Certificat Cloudflare Origin (SSL 15 ans)](#1-génération-du-certificat-cloudflare-origin-ssl-15-ans)
2. [Allocation du Port sur le Nœud Pterodactyl](#2-allocation-du-port-sur-le-nœud-pterodactyl)
3. [Ouverture du Port sur le Firewall du Serveur Hôte](#3-ouverture-du-port-sur-le-firewall-du-serveur-hôte)
4. [Importation de l'Egg Universel Pterodactyl](#4-importation-de-legg-universel-pterodactyl)
5. [Création du Serveur (Conteneur de Jeu)](#5-création-du-serveur-conteneur-de-jeu)
6. [Ajout des Certificats SSL dans le Conteneur](#6-ajout-des-certificats-ssl-dans-le-conteneur)
7. [Premier Démarrage & Validation Git](#7-premier-démarrage--validation-git)
8. [Configuration Cloudflare (DNS + Origin Rule + Mode Strict)](#8-configuration-cloudflare-dns--origin-rule--mode-strict)
9. [Mises à Jour Ultérieures (Après un commit GitHub)](#9-mises-à-jour-ultérieures-après-un-commit-github)

---

## 1. Génération du Certificat Cloudflare Origin (SSL 15 ans)

Ce certificat permet au serveur Node du conteneur d'écouter nativement en HTTPS sur son port custom sans passer par Let's Encrypt (qui n'autorise que les ports 80/443).

1. Connectez-vous sur votre compte [Cloudflare Dashboard](https://dash.cloudflare.com/) et sélectionnez votre domaine (ex: `sog.re`).
2. Dans le menu de gauche, rendez-vous dans **SSL/TLS** > **Origin Server**.
3. Cliquez sur **Create Certificate**.
4. Laissez les options par défaut :
   - **Key type :** RSA (2048)
   - **Hostnames :** `*.sog.re`, `sog.re`
   - **Certificate Validity :** 15 years
5. Cliquez sur **Create**.
6. Deux encadrés apparaissent :
   - **Origin Certificate :** Copiez tout le texte et collez-le sur votre machine dans un fichier nommé `cert.pem`.
   - **Private Key :** Copiez tout le texte et collez-le sur votre machine dans un fichier nommé `key.pem`.
7. Cliquez sur **OK**.

---

## 2. Allocation du Port sur le Nœud Pterodactyl

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

## 3. Ouverture du Port sur le Firewall du Serveur Hôte

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

## 4. Importation de l'Egg Universel Pterodactyl

L'Egg orchestre le cycle de vie du conteneur (Git, dépendances, compilation, SSL et exécution).

1. Dans Pterodactyl Admin, allez dans **Nests**.
2. Sélectionnez votre Nest (ou créez un Nest dédié *Play.Sog.Re*).
3. Cliquez sur **Import Egg** en haut à droite.
4. Uploadez le fichier :
   [`pterodactyl/egg-play-sog-re-svelte-kit-game.json`](file:///c:/Users/tirio/PhpstormProjects/PSR-movie-selector/pterodactyl/egg-play-sog-re-svelte-kit-game.json)
5. Validez l'importation.

---

## 5. Création du Serveur (Conteneur de Jeu)

Dans Pterodactyl Admin, allez dans **Servers** > bouton vert **Create New** :

### 5.1. Core Details
- **Server Name :** Nom du jeu (ex: `Movie Selector` ou `SogQuiz`).
- **Server Owner :** Sélectionnez votre compte utilisateur.

### 5.2. Allocation Management
- **Node :** Sélectionnez votre nœud.
- **Default Allocation :** Choisissez l'adresse IP et le port alloué à l'étape 2 (ex: `IP_DU_SERVEUR:3005`).

### 5.3. Resource Management (Recommandé)
> ⚠️ **Important pour éviter les erreurs mémoires et disques (`ENOSPC`) :**
- **CPU Limit :** `100%` ou plus.
- **Memory Limit :** `2048 MB` (2 Go de RAM).
- **Swap :** `1024 MB`.
- **Disk Space :** `5120 MB` (5 Go minimum).

### 5.4. Nest Configuration
- **Nest :** Votre Nest choisi.
- **Egg :** `Play.Sog.Re SvelteKit Game`.
- **Docker Image :** `ghcr.io/parkervcp/yolks:nodejs_22`.

### 5.5. Service Variables (Variables d'environnement)

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| **`PUBLIC_APP_ID`** | Identifiant officiel de l'application | `psr-movie-selector` *(ou `psr-sogquiz`)* |
| **`GIT_REPO`** | URL Git du dépôt privé | `git@github.com:play-sog-re/PSR-movie-selector.git` *(ou HTTPS)* |
| **`GIT_BRANCH`** | Branche Git à déployer | `master` *(ou `main`)* |
| **`AUTO_UPDATE`** | Mise à jour au redémarrage | `0` (Manuel) ou `1` (Automatique) |
| **`PUBLIC_PLAY_SOG_MODE`** | Mode API Play.Sog.Re | `live` *(ou `dev` pour test hors ligne)* |
| **`PUBLIC_PLAY_SOG_URL`** | URL du portail officiel | `https://play.sog.re` |
| **`PUBLIC_PLAY_SOG_API_URL`** | URL de l'API v1 | `https://play.sog.re/api/v1` |
| **`PRIVATE_GAME_SYSTEM_API_SECRET`** | Clé secrète de communication backend | Clé générée sur play.sog.re |
| **`PRIVATE_TMDB_API_KEY`** | Clé API TMDB (si Movie Selector) | `42ec70fc7ba828df0f35713620871e7f` |

Cliquez sur **Create Server** en bas à droite.

---

## 6. Ajout des Certificats SSL dans le Conteneur

Avant de démarrer le serveur, déposez les certificats Cloudflare créés à l'étape 1 :

1. Ouvrez votre serveur dans le panneau utilisateur Pterodactyl : `https://panel.votre-domaine.com/server/<ID>`.
2. Rendez-vous dans l'onglet **File Manager** (Gestionnaire de fichiers).
3. Cliquez sur **Create Directory** et nommez le dossier : `data`.
4. Entrez dans le dossier `pterodactyl_egg` et créez un sous-dossier : `ssl`.
5. Entrez dans `pterodactyl_egg` et uploadez (ou créez) vos 2 fichiers :
   - `cert.pem` (Contient votre certificat d'origine Cloudflare).
   - `key.pem` (Contient votre clé privée Cloudflare).

Le chemin d'accès doit être exactement :  
`/home/container/data/ssl/cert.pem`  
`/home/container/data/ssl/key.pem`

---

## 7. Premier Démarrage & Validation Git

1. Allez dans l'onglet **Console** du serveur.
2. Cliquez sur le bouton **Start**.
3. **Cas A : Vous utilisez une clé SSH privée (Deploy Key)**
   - Si aucune clé n'existe, la console génère automatiquement la clé et affiche son contenu :
     ```text
     ===================================================================
     🔑 Aucune clé SSH trouvée pour psr-movie-selector, génération...
     
     👉 VEUILLEZ COPIER CETTE CLÉ PUBLIQUE DANS GITHUB :
        (Sur votre repo > Settings > Deploy keys > Add deploy key)
     -------------------------------------------------------------------
     ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... pterodactyl-psr-movie-selector@play.sog.re
     -------------------------------------------------------------------
     ```
   - Copiez cette ligne complète.
   - Rendez-vous sur votre dépôt GitHub > **Settings** > **Deploy keys** > **Add deploy key**.
   - Collez la clé et validez (case *Allow write access* décochée).
   - Retournez sur Pterodactyl et cliquez sur **Restart**.
4. **Cas B : Vous utilisez une URL HTTPS avec token**
   - Le clonage, l'installation npm (`npm ci`) et la compilation (`npm run build`) s'enchaînent immédiatement.

5. **Validation du démarrage HTTPS :**  
   Dès la fin de la compilation, `server.js` détecte vos certificats Cloudflare et affiche :
   ```text
   🔒 Serveur HTTPS démarré avec succès sur https://0.0.0.0:3005
      (Certificat SSL actif : ./data/ssl/cert.pem)
   ```

---

## 8. Configuration Cloudflare (DNS + Origin Rule + Mode Strict)

### 8.1. Entrée DNS
1. Dans le tableau de bord Cloudflare, allez dans **DNS** > **Records**.
2. Cliquez sur **Add record** :
   - **Type :** `A`
   - **Name :** Le sous-domaine de votre jeu (ex: `movieselector` ou `sogquiz`).
   - **IPv4 address :** L'adresse IP publique de votre serveur physique Pterodactyl.
   - **Proxy status :** **Proxied** (Nuage Orange obligatoire ☁️).
3. Cliquez sur **Save**.

---

### 8.2. Origin Rule (Routage du Port)
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
   - Entrez le port Pterodactyl : `3005`.
6. Cliquez sur **Deploy**.

---

### 8.3. Activation du Mode SSL Full (Strict)
1. Dans le menu de gauche, allez dans **SSL/TLS** > **Overview**.
2. Cochez :
   🛡️ **Full (Strict)**.

> 🎉 **Terminé !**  
> Ouvrez `https://movieselector.sog.re` dans votre navigateur : l'application est en ligne avec un cadenas vert valide, un trafic chiffré de bout en bout en HTTPS, et un certificat valide pour 15 ans.

---

## 9. Mises à Jour Ultérieures (Après un commit GitHub)

Dès que vous poussez des commits sur GitHub :

1. Dans Pterodactyl, allez dans l'onglet **Startup**.
2. Assurez-vous que la variable **`AUTO_UPDATE`** est à **`1`**.
3. Cliquez sur **Restart** dans la console.
4. Le conteneur se charge de tout :
   - Récupération des nouveautés (`git fetch` + `git reset --hard origin/master`)
   - Mise à jour des packages (`npm ci`)
   - Recompilation optimisée (`NODE_OPTIONS="--max-old-space-size=1024" npm run build`)
   - Redémarrage automatique du serveur HTTPS.
