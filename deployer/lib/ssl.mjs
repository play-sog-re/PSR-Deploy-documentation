// ==============================================================================
// 🔒 Module SSL & Certificats Cloudflare — Play.Sog.Re Deployer
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { log } from './banner.mjs';

export function checkSSL(targetDir = process.cwd()) {
	const certPath = path.resolve(targetDir, process.env.SSL_CERT_PATH || './data/ssl/cert.pem');
	const keyPath = path.resolve(targetDir, process.env.SSL_KEY_PATH || './data/ssl/key.pem');

	const hasCert = fs.existsSync(certPath);
	const hasKey = fs.existsSync(keyPath);

	if (hasCert && hasKey) {
		try {
			const certContent = fs.readFileSync(certPath, 'utf-8');
			const keyContent = fs.readFileSync(keyPath, 'utf-8');

			const validCert = certContent.includes('-----BEGIN CERTIFICATE-----');
			const validKey = keyContent.includes('-----BEGIN PRIVATE KEY-----') ||
			                 keyContent.includes('-----BEGIN RSA PRIVATE KEY-----');

			if (validCert && validKey) {
				log.success(`🔒 Certificats Cloudflare Origin détectés et valides.`);
				log.info(`   Certificat : ${path.relative(targetDir, certPath)}`);
				log.info(`   Clé privée : ${path.relative(targetDir, keyPath)}`);
				log.info(`   Mode HTTPS activé avec chiffrement bout-en-bout.`);
				return { enabled: true, certPath, keyPath };
			} else {
				log.warn(`⚠️ Les fichiers SSL existent mais semblent incomplets ou invalides.`);
			}
		} catch (err) {
			log.warn(`Erreur lors de la lecture des certificats SSL: ${err.message}`);
		}
	}

	log.info(`🌐 Aucun certificat SSL Cloudflare Origin valide détecté dans ./data/ssl/`);
	log.info(`   Le serveur démarrera en mode HTTP standard.`);
	return { enabled: false, certPath, keyPath };
}
