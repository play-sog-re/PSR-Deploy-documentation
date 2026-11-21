// ==============================================================================
// ⚙️ Module Environnement & .env — Play.Sog.Re Deployer
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { log } from './banner.mjs';

export function configureEnv({
	targetDir = process.cwd(),
	variables = {}
}) {
	const envPath = path.join(targetDir, '.env');
	const envExamplePath = path.join(targetDir, '.env.example');

	// 1. Initialiser le .env à partir de .env.example si inexistant
	if (!fs.existsSync(envPath)) {
		if (fs.existsSync(envExamplePath)) {
			log.info(`Création de .env à partir de .env.example...`);
			fs.copyFileSync(envExamplePath, envPath);
		} else {
			log.info(`Création d'un nouveau fichier .env...`);
			fs.writeFileSync(envPath, `# Play.Sog.Re Environment File\n`);
		}
	}

	// 2. Parser le contenu existant ligne par ligne
	const rawContent = fs.readFileSync(envPath, 'utf-8');
	const lines = rawContent.split(/\r?\n/);
	const keysUpdated = new Set();

	// Variables obligatoires à injecter / synchroniser
	const defaultVars = {
		PORT: process.env.SERVER_PORT || '3000',
		HOST: '0.0.0.0',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		HOST_HEADER: 'x-forwarded-host',
		SSL_CERT_PATH: './data/ssl/cert.pem',
		SSL_KEY_PATH: './data/ssl/key.pem',
		...variables
	};

	const updatedLines = lines.map((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) return line;

		const equalIdx = trimmed.indexOf('=');
		if (equalIdx === -1) return line;

		const key = trimmed.substring(0, equalIdx).trim();
		if (Object.prototype.hasOwnProperty.call(defaultVars, key)) {
			const val = defaultVars[key];
			keysUpdated.add(key);
			if (val !== undefined && val !== null && val !== '') {
				return `${key}="${val}"`;
			}
			return line;
		}
		return line;
	});

	// Ajouter les clés qui n'étaient pas présentes dans le fichier .env
	for (const [key, val] of Object.entries(defaultVars)) {
		if (!keysUpdated.has(key) && val !== undefined && val !== null && val !== '') {
			updatedLines.push(`${key}="${val}"`);
		}
	}

	fs.writeFileSync(envPath, updatedLines.join('\n') + '\n', 'utf-8');
	log.success(`Configuration .env synchronisée avec succès (${Object.keys(defaultVars).length} variables vérifiées).`);
}
