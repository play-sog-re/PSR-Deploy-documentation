#!/usr/bin/env node
// ==============================================================================
// 🎮 Orchestrateur Principal de Déploiement — Play.Sog.Re Deployer
// ==============================================================================

import path from 'node:path';
import { printBanner, log } from './lib/banner.mjs';
import { syncRepository } from './lib/git.mjs';
import { configureEnv } from './lib/env.mjs';
import { checkSSL } from './lib/ssl.mjs';
import { prepareAndBuild } from './lib/build.mjs';
import { startServer } from './lib/runner.mjs';

async function main() {
	printBanner('2.1.0');

	// 1. Détermination du répertoire cible de l'application
	let targetDir = process.env.APP_DIR || process.cwd();
	if (targetDir.endsWith('.deployer') || targetDir.endsWith('deployer')) {
		targetDir = path.resolve(targetDir, '..');
	}

	log.info(`📁 Répertoire d'exécution de l'application : ${targetDir}`);

	const appId = process.env.PUBLIC_APP_ID || 'psr-game';
	const gitRepo = process.env.GIT_REPO || '';
	const gitToken = process.env.GIT_TOKEN || '';
	const gitBranch = process.env.GIT_BRANCH || 'master';
	const autoUpdate = process.env.AUTO_UPDATE === '1';
	const port = process.env.SERVER_PORT || process.env.PORT || '3000';

	log.info(`🎯 Application cible : ${appId} (Port Pterodactyl: ${port})`);

	// Étape 1 : Clonage ou Synchronisation Git du Dépôt Applicatif
	log.step(1, 'Synchronisation Git du Dépôt Applicatif');
	let gitResult = { updated: false };
	try {
		gitResult = syncRepository({
			targetDir,
			gitRepo,
			gitToken,
			branch: gitBranch,
			autoUpdate
		});
	} catch (gitErr) {
		log.error(`Arrêt du déploiement suite à une erreur Git : ${gitErr.message}`);
		process.exit(1);
	}

	// Étape 2 : Configuration des Variables d'Environnement (.env)
	log.step(2, 'Configuration & Synchronisation de l\'Environnement (.env)');
	const appVariables = {
		PORT: String(port),
		HOST: '0.0.0.0',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		HOST_HEADER: 'x-forwarded-host',
		PUBLIC_APP_ID: appId,
		PUBLIC_PLAY_SOG_MODE: process.env.PUBLIC_PLAY_SOG_MODE || 'live',
		PUBLIC_PLAY_SOG_URL: process.env.PUBLIC_PLAY_SOG_URL || 'https://play.sog.re',
		PUBLIC_PLAY_SOG_API_URL: process.env.PUBLIC_PLAY_SOG_API_URL || 'https://play.sog.re/api/v1'
	};

	if (process.env.PRIVATE_GAME_SYSTEM_API_SECRET) {
		appVariables.PRIVATE_GAME_SYSTEM_API_SECRET = process.env.PRIVATE_GAME_SYSTEM_API_SECRET;
	}
	if (process.env.PRIVATE_TMDB_API_KEY) {
		appVariables.PRIVATE_TMDB_API_KEY = process.env.PRIVATE_TMDB_API_KEY;
	}

	configureEnv({
		targetDir,
		variables: appVariables
	});

	// Étape 3 : Détection et Validation SSL Cloudflare Origin
	log.step(3, 'Vérification des Certificats SSL Cloudflare Origin');
	checkSSL(targetDir);

	// Étape 4 : Dépendances et Compilation SvelteKit
	log.step(4, 'Installation des Dépendances & Compilation SvelteKit');
	try {
		prepareAndBuild({
			targetDir,
			forceRebuild: gitResult.updated
		});
	} catch (buildErr) {
		log.error(`Arrêt du déploiement suite à une erreur de compilation : ${buildErr.message}`);
		process.exit(1);
	}

	// Étape 5 : Démarrage du Serveur Node.js
	log.step(5, 'Démarrage du Serveur de Jeu');
	startServer({
		targetDir,
		port
	});
}

main().catch((err) => {
	log.error(`Erreur inattendue dans le déployeur : ${err.stack || err.message}`);
	process.exit(1);
});
