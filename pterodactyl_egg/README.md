# 🥚 Guide de Déploiement Pterodactyl — Jeux SvelteKit Play.Sog.Re

Ce guide détaille pas à pas la configuration complète dans **Pterodactyl** pour déployer de façon **100% autonome** vos applications SvelteKit basées sur le devkit (`PSR-movie-selector`, `PSR-SogQuiz`, `PSR-tcg`, etc.).

---

## 📋 Prérequis

1. Un accès administrateur à votre panel Pterodactyl (`https://panel.votre-domaine.com/admin`).
2. Le fichier Egg : [`pterodactyl/egg-play-sog-re-svelte-kit-game.json`](file:///c:/Users/tirio/PhpstormProjects/PSR-movie-selector/pterodactyl/egg-play-sog-re-svelte-kit-game.json).
3. Une paire de clés SSH de déploiement (Deploy Key) pour cloner votre dépôt GitHub privé.

---

## 🔑 Étape 1 : Préparer la Deploy Key GitHub

Puisque les dépôts sont privés, le container Pterodactyl a besoin d'une clé SSH pour cloner le code :

1. Sur votre machine ou serveur, générez une clé dédiée si vous n'en avez pas :
   ```bash
   ssh-keygen -t ed25519 -C "pterodactyl-deploy" -f id_deploy
   ```
2. Rendez-vous sur votre dépôt GitHub privé (ex: `https://github.com/play-sog-re/PSR-movie-selector`).
3. Allez dans **Settings** > **Deploy keys** > **Add deploy key**.
4. Titre : `Pterodactyl Container`
5. Collez le contenu de la clé publique `id_deploy.pub`.
6. Laissez la case *Allow write access* décochée et validez.
7. Gardez sous la main le contenu de la **clé privée** `id_deploy` (commençant par `-----BEGIN OPENSSH PRIVATE KEY-----`), vous en aurez besoin à l'étape 4.

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

## 🌐 Étape 3 : Vérifier / Créer une allocation de port (Allocation)

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

## 🖥️ Étape 4 : Créer le Serveur (Container)

Toujours dans la section Admin, allez dans **Servers** > **Create New** :

### 1. Core Details
- **Server Name** : `Movie Selector` (ou `SogQuiz`, `TCG`...).
- **Server Owner** : Sélectionnez votre compte utilisateur.

### 2. Allocation Management
- **Node** : Sélectionnez votre Node.
- **Default Allocation** : Choisissez l'adresse IP et le port assigné à l'étape 3 (ex: `123.45.67.89:3005`).
  *(Ce port sera injecté automatiquement dans l'application comme `${SERVER_PORT}`)*.

### 3. Application Feature Limits
- Laissez les valeurs par défaut (généralement 0 base de données, 0 backup si non nécessaire).

### 4. Resource Management (Ressources recommandées)
- **CPU Limit** : `100%` (ou `200%` pour un build rapide).
- **Memory Limit** : `1024 MB` (ou `2048 MB` recommandé pour être très à l'aise pendant la compilation SvelteKit).
- **Swap Limit** : `512 MB` (ou `1024 MB` pour avoir une marge de sécurité mémoire).
- **Disk Space** : `2048 MB` (2 Go suffisent largement pour Node, node_modules et le build).

### 5. Nest Configuration
- **Nest** : Sélectionnez le Nest où vous avez importé l'Egg.
- **Egg** : Sélectionnez **Play.Sog.Re SvelteKit Game**.
- **Docker Image** : `ghcr.io/parkervcp/yolks:nodejs_22` (par défaut).

### 6. Variables d'Environnement (Service Variables)
Renseignez les champs :

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| **Dépôt Git** (`GIT_REPO`) | URL SSH de votre dépôt privé | `git@github.com:play-sog-re/PSR-movie-selector.git` |
| **Branche Git** (`GIT_BRANCH`) | Branche à déployer | `master` |
| **Clé SSH Privée** (`GIT_SSH_KEY`) | Votre clé privée SSH complète générée à l'étape 1 | `-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----` |
| **Auto Update** (`AUTO_UPDATE`) | Mettre à jour et recompiler à chaque reboot | `0` (Manuel) ou `1` (Automatique) |
| **Mode API** (`PUBLIC_PLAY_SOG_MODE`) | Mode d'exécution de l'API | `live` (ou `dev` pour test hors ligne) |
| **Identifiant App** (`PUBLIC_APP_ID`) | Identifiant de l'application sur play.sog.re | `psr-movie-selector` (ou `psr-sogquiz`) |
| **Secret API Système** (`PRIVATE_GAME_SYSTEM_API_SECRET`) | Clé secrète de communication backend | `7c3e080530898de6e346e9440eb1191...` |
| **URL Portail** (`PUBLIC_PLAY_SOG_URL`) | URL du portail officiel | `https://play.sog.re` |
| **URL API v1** (`PUBLIC_PLAY_SOG_API_URL`) | URL de l'API v1 | `https://play.sog.re/api/v1` |
| **Clé API TMDB** (`PRIVATE_TMDB_API_KEY`) | Clé The Movie Database (Movie Selector) | `42ec70fc7ba828df0f35713620871e7f` |

7. Cliquez sur le bouton vert **Create Server** en bas à droite.

---

## 🚀 Étape 5 : Premier Démarrage & Suivi des Logs

1. Rendez-vous sur la vue utilisateur de Pterodactyl : `https://panel.votre-domaine.com/server/<ID>`.
2. Le statut affiche d'abord **Installing** :
   - Pterodactyl lance le container d'installation Alpine.
   - Il configure la clé SSH, clone le repo GitHub privé, installe les modules npm (`npm ci`), génère le fichier `.env` avec vos variables et compile l'application (`npm run build`).
3. Une fois l'installation terminée (1 à 2 minutes), le serveur passe en **Offline**.
4. Cliquez sur **Start** :
   - La console affiche : `Listening on 0.0.0.0:3005`.
   - Le statut passe au vert : **Running**.

Votre jeu est immédiatement en ligne et accessible sur `http://IP_DE_VOTRE_NODE:PORT` !

---

## 🔄 Étape 6 : Comment mettre à jour le jeu lors d'un nouveau commit ?

Vous avez deux méthodes simples :

### Méthode A : Avec la variable `AUTO_UPDATE=1` (Recommandé)
1. Dans l'onglet **Startup** du serveur Pterodactyl, réglez `AUTO_UPDATE` sur `1`.
2. Dès que vous avez poussé du nouveau code sur GitHub, cliquez simplement sur le bouton **Restart** dans la console Pterodactyl.
3. Le container va automatiquement faire `git fetch`, `git reset --hard`, `npm ci`, recompiler et redémarrer la nouvelle version.

### Méthode B : Réinstallation propre (Reinstall)
Dans les paramètres du serveur (**Settings** dans le panel utilisateur), vous pouvez cliquer sur **Reinstall Server** pour forcer une réinstallation complète à partir de zéro sans perdre le dossier ``.
