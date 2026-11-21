// ==============================================================================
// 📦 Module Git avec Authentification par Token — Play.Sog.Re Deployer
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log, printBox } from './banner.mjs';

/**
 * Nettoie une URL Git pour masquer le token dans les affichages et logs console.
 */
export function sanitizeUrl(url = '') {
	return url.replace(/https:\/\/[^@]+@github\.com/i, 'https://***@github.com');
}

/**
 * Construit l'URL Git HTTPS avec le token d'accès GitHub si disponible.
 */
export function buildAuthenticatedUrl(repoUrl = '', token = '') {
	let cleanUrl = repoUrl.trim();

	// Conversion d'une syntaxe SSH éventuelle en syntaxe HTTPS
	if (cleanUrl.startsWith('git@github.com:')) {
		const repoPath = cleanUrl.replace('git@github.com:', '');
		cleanUrl = `https://github.com/${repoPath}`;
	}

	// Si un token est fourni et que l'URL ne contient pas déjà de token
	if (token && !cleanUrl.includes('@')) {
		cleanUrl = cleanUrl.replace(/^https:\/\//i, `https://${token}@`);
	}

	return cleanUrl;
}

export function syncRepository({
	targetDir = process.cwd(),
	gitRepo = '',
	gitToken = process.env.GIT_TOKEN || '',
	branch = 'master',
	autoUpdate = false
}) {
	const gitDir = path.join(targetDir, '.git');
	let updated = false;

	if (!gitRepo) {
		log.error("Aucun dépôt Git spécifié (variable 'GIT_REPO' vide).");
		throw new Error("Variable GIT_REPO obligatoire.");
	}

	const authRepoUrl = buildAuthenticatedUrl(gitRepo, gitToken);
	const displayUrl = sanitizeUrl(authRepoUrl);

	if (!fs.existsSync(gitDir)) {
		log.info(`📥 Clonage initial du dépôt : ${displayUrl} (branche: ${branch})...`);

		const tmpCloneDir = '/tmp/repo_clone_' + Date.now();
		try {
			execSync(
				`git clone --depth 1 -b "${branch}" "${authRepoUrl}" "${tmpCloneDir}"`,
				{ stdio: 'inherit', env: process.env }
			);

			// Copie sécurisée de tout le contenu dans targetDir
			execSync(`cp -rn "${tmpCloneDir}/." "${targetDir}/"`, { env: process.env });
			execSync(`cp -r "${tmpCloneDir}/.git" "${targetDir}/"`, { env: process.env });
			execSync(`rm -rf "${tmpCloneDir}"`, { env: process.env });

			// S'assurer que le remote origin utilise l'URL authentifiée
			try {
				execSync(`git remote set-url origin "${authRepoUrl}"`, { cwd: targetDir, env: process.env });
			} catch (_) {}

			log.success('Dépôt cloné avec succès dans le conteneur.');
			updated = true;
		} catch (err) {
			try { execSync(`rm -rf "${tmpCloneDir}"`); } catch (_) {}
			log.error(`Échec du clonage Git de ${displayUrl}`);

			printBox(
				'⚠️ ERREUR D\'AUTHENTIFICATION GIT / REPO INTROUVABLE',
				[
					'Le conteneur n\'a pas pu cloner le dépôt GitHub privé.',
					'',
					'Vérifications à effectuer :',
					'1. Avez-vous renseigné la variable GIT_TOKEN dans Pterodactyl ?',
					'2. Le token est-il toujours valide et possède-t-il les droits Read sur le repo ?',
					'3. L\'URL du repo est-elle exacte : ' + displayUrl,
					'',
					'Génération de token GitHub :',
					'👉 GitHub > Settings > Developer Settings > Personal access tokens',
					'   (Droits recommandés : "Contents: Read-only" pour ce repo privé)'
				],
				'red'
			);

			throw err;
		}
	} else {
		// Le dépôt existe déjà dans targetDir
		log.info(`📁 Dépôt Git détecté dans ${targetDir}.`);

		// Mettre à jour l'URL du remote origin si le token ou repo a changé
		try {
			execSync(`git remote set-url origin "${authRepoUrl}"`, { cwd: targetDir, env: process.env });
		} catch (_) {}

		if (autoUpdate) {
			log.info(`🔄 AUTO_UPDATE actif : Vérification des mises à jour sur origin/${branch}...`);
			try {
				execSync(`git fetch origin "${branch}"`, { cwd: targetDir, stdio: 'pipe', env: process.env });
				const localCommit = execSync('git rev-parse HEAD', { cwd: targetDir, encoding: 'utf-8', env: process.env }).trim();
				const remoteCommit = execSync(`git rev-parse origin/"${branch}"`, { cwd: targetDir, encoding: 'utf-8', env: process.env }).trim();

				if (localCommit !== remoteCommit) {
					log.info(`✨ Nouveaux commits détectés (${localCommit.substring(0, 7)} -> ${remoteCommit.substring(0, 7)}). Mise à jour en cours...`);
					execSync(`git reset --hard origin/"${branch}"`, { cwd: targetDir, stdio: 'inherit', env: process.env });
					log.success('Code mis à jour au dernier commit distant.');
					updated = true;
				} else {
					log.info(`✅ L'application est déjà à jour (${localCommit.substring(0, 7)}).`);
				}
			} catch (err) {
				log.warn(`Impossible de synchroniser avec origin/${branch} : ${err.message}`);
			}
		} else {
			log.info(`ℹ️ AUTO_UPDATE désactivé (AUTO_UPDATE=0). Aucun fetch effectué.`);
		}
	}

	// Récupérer et afficher les détails du commit déployé
	try {
		const commitInfo = execSync('git log -1 --pretty=format:"%h - %s (%cr) <%an>"', {
			encoding: 'utf-8',
			cwd: targetDir,
			env: process.env
		}).trim();
		log.info(`📌 Version déployée : ${commitInfo}`);
	} catch (_) {}

	return { updated };
}
