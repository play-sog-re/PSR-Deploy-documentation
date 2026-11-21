// ==============================================================================
// 🔨 Module Compilation & Dépendances SvelteKit — Play.Sog.Re Deployer
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { log } from './banner.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function prepareAndBuild({
	targetDir = process.cwd(),
	forceRebuild = false
}) {
	const buildDir = path.join(targetDir, 'build');
	const serverJsPath = path.join(targetDir, 'server.js');
	const packageJsonPath = path.join(targetDir, 'package.json');
	const packageLockPath = path.join(targetDir, 'package-lock.json');

	// 1. S'assurer de la présence d'un server.js
	if (!fs.existsSync(serverJsPath)) {
		log.info("📄 'server.js' absent du dépôt de l'application. Injection du template universel...");
		const templateServerJs = path.resolve(__dirname, '../templates/server.js');
		if (fs.existsSync(templateServerJs)) {
			fs.copyFileSync(templateServerJs, serverJsPath);
			log.success("Template universel 'server.js' injecté avec succès.");
		} else {
			log.error("Template 'server.js' introuvable dans le déployeur.");
		}
	}

	// 2. Déterminer si la compilation est nécessaire
	const hasBuild = fs.existsSync(buildDir) && (
		fs.existsSync(path.join(buildDir, 'handler.js')) ||
		fs.existsSync(path.join(buildDir, 'index.js'))
	);

	const needsBuild = !hasBuild || forceRebuild || process.env.FORCE_BUILD === '1';

	if (!needsBuild) {
		log.info("⚡ Dossier de compilation 'build/' déjà présent et à jour. Étape de compilation ignorée.");
		return;
	}

	if (!fs.existsSync(packageJsonPath)) {
		log.error("Fichier package.json introuvable dans le répertoire du projet.");
		throw new Error("package.json manquant.");
	}

	// 3. Installation des dépendances npm
	log.info("📦 Installation des dépendances npm...");
	try {
		if (fs.existsSync(packageLockPath)) {
			execSync('npm ci --prefer-offline --no-audit --no-fund', {
				cwd: targetDir,
				stdio: 'inherit',
				env: process.env
			});
		} else {
			execSync('npm install --no-audit --no-fund', {
				cwd: targetDir,
				stdio: 'inherit',
				env: process.env
			});
		}
		log.success("Dépendances npm installées avec succès.");
	} catch (err) {
		log.error(`Échec de l'installation des dépendances npm: ${err.message}`);
		throw err;
	}

	// 4. Compilation SvelteKit
	log.info("🔨 Compilation de l'application SvelteKit (npm run build)...");
	try {
		const buildEnv = {
			...process.env,
			NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1536'
		};
		execSync('npm run build', {
			cwd: targetDir,
			stdio: 'inherit',
			env: buildEnv
		});
		log.success("Application SvelteKit compilée avec succès dans ./build/ !");
	} catch (err) {
		log.error(`Échec lors de la compilation SvelteKit (npm run build): ${err.message}`);
		throw err;
	}
}
