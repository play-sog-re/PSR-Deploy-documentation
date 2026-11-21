// ==============================================================================
// 🚀 Module Exécution du Serveur — Play.Sog.Re Deployer
// ==============================================================================

import path from 'node:path';
import { spawn } from 'node:child_process';
import { log } from './banner.mjs';

export function startServer({
	targetDir = process.cwd(),
	port = process.env.PORT || 3000
}) {
	log.step('Démarrage', `Lancement du serveur Node.js sur le port ${port}...`);

	const nodeArgs = ['--env-file=.env', 'server.js'];

	const child = spawn('node', nodeArgs, {
		cwd: targetDir,
		stdio: 'inherit',
		env: {
			...process.env,
			PORT: String(port),
			HOST: '0.0.0.0'
		}
	});

	const forwardSignal = (signal) => {
		if (child && !child.killed) {
			child.kill(signal);
		}
	};

	process.on('SIGINT', () => forwardSignal('SIGINT'));
	process.on('SIGTERM', () => forwardSignal('SIGTERM'));

	child.on('error', (err) => {
		log.error(`Impossible de démarrer server.js: ${err.message}`);
		process.exit(1);
	});

	child.on('exit', (code, signal) => {
		if (signal) {
			log.info(`Serveur arrêté par signal : ${signal}`);
			process.exit(0);
		}
		if (code !== 0 && code !== null) {
			log.error(`Serveur terminé avec le code d'erreur : ${code}`);
			process.exit(code);
		}
		log.info('Serveur arrêté normalement.');
		process.exit(0);
	});
}
