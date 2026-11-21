// ==============================================================================
// 🚀 Serveur Node.js Universel — Play.Sog.Re SvelteKit Runner
// ==============================================================================
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import path from 'node:path';

// Chargement automatique du .env si présent (Node.js 20.6+ et 22+)
if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
	try {
		process.loadEnvFile('.env');
	} catch (e) {
		console.warn('⚠️ Impossible de charger .env:', e.message);
	}
}

// Détection du handler SvelteKit (généré par adapter-node)
let handler;
const handlerPaths = ['./build/handler.js', './build/index.js'];
let loadedHandlerPath = null;

for (const hp of handlerPaths) {
	if (fs.existsSync(hp)) {
		try {
			const mod = await import(hp);
			handler = mod.handler || mod.default;
			loadedHandlerPath = hp;
			break;
		} catch (err) {
			console.error(`Erreur d'importation du handler ${hp}:`, err);
		}
	}
}

if (!handler) {
	console.error('❌ ERREUR: Impossible de trouver un handler SvelteKit valide dans ./build/.');
	console.error('   Veuillez vérifier que le projet a bien été compilé (npm run build).');
	process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const certPath = process.env.SSL_CERT_PATH || './data/ssl/cert.pem';
const keyPath = process.env.SSL_KEY_PATH || './data/ssl/key.pem';

let server;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
	try {
		const options = {
			cert: fs.readFileSync(certPath),
			key: fs.readFileSync(keyPath)
		};
		server = https.createServer(options, handler);
		server.listen(port, host, () => {
			console.log(`Listening on https://${host}:${port}`);
			console.log(`🔒 Serveur HTTPS démarré avec succès sur https://${host}:${port}`);
			console.log(`   (Certificat SSL actif : ${certPath})`);
		});
	} catch (sslErr) {
		console.warn(`⚠️ Échec du démarrage en HTTPS (${sslErr.message}), bascule vers HTTP standard...`);
		server = http.createServer(handler);
		server.listen(port, host, () => {
			console.log(`Listening on http://${host}:${port}`);
			console.log(`🌐 Serveur HTTP standard démarré sur http://${host}:${port}`);
		});
	}
} else {
	server = http.createServer(handler);
	server.listen(port, host, () => {
		console.log(`Listening on http://${host}:${port}`);
		console.log(`🌐 Serveur HTTP standard démarré sur http://${host}:${port}`);
		console.log(`   (Aucun certificat détecté dans ${certPath}, mode HTTP)`);
	});
}

const shutdown = () => {
	console.log('\n🛑 Arrêt propre du serveur en cours...');
	server.close(() => {
		console.log('✅ Serveur arrêté.');
		process.exit(0);
	});
	// Force exit après 5s si les connexions stagnent
	setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
