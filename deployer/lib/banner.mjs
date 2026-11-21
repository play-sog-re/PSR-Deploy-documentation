// ==============================================================================
// 🎨 Module d'Affichage & Logs — Play.Sog.Re Deployer
// ==============================================================================

const colors = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	bgBlue: '\x1b[44m'
};

const timestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

export const log = {
	info(msg) {
		console.log(`${colors.blue}[INFO]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} - ${msg}`);
	},
	success(msg) {
		console.log(`${colors.green}[SUCCESS]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} - ${colors.bold}${msg}${colors.reset}`);
	},
	warn(msg) {
		console.log(`${colors.yellow}[WARN]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} - ${msg}`);
	},
	error(msg) {
		console.error(`${colors.red}[ERROR]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} - ${colors.bold}${msg}${colors.reset}`);
	},
	step(num, title) {
		console.log(`\n${colors.cyan}▶ [Étape ${num}] ${colors.bold}${title}${colors.reset}`);
	}
};

export function printBanner(version = '1.0.0') {
	console.log(`\n${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
	console.log(`${colors.cyan}${colors.bold}   🎮 PLAY.SOG.RE — SVELTEKIT APPLICATION DEPLOYER v${version}        ${colors.reset}`);
	console.log(`${colors.cyan}   Conteneur Pterodactyl autonome pour jeux & services SOG           ${colors.reset}`);
	console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);
}

export function printBox(title, lines, style = 'cyan') {
	const color = colors[style] || colors.cyan;
	const maxWidth = Math.max(
		title.length,
		...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length)
	) + 4;
	const border = '═'.repeat(maxWidth);

	console.log(`\n${color}╔${border}╗${colors.reset}`);
	console.log(`${color}║  ${colors.bold}${title.padEnd(maxWidth - 2)}${colors.reset}${color}║${colors.reset}`);
	console.log(`${color}╠${border}╣${colors.reset}`);
	for (const line of lines) {
		const plainLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
		const padding = ' '.repeat(Math.max(0, maxWidth - 2 - plainLength));
		console.log(`${color}║  ${colors.reset}${line}${padding}${color}║${colors.reset}`);
	}
	console.log(`${color}╚${border}╝${colors.reset}\n`);
}
