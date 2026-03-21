/**
 * Único punto de carga de variables de entorno para el backend.
 * NO importar dotenv en ningún otro archivo.
 *
 * - NODE_ENV === 'production' → solo .env.prod
 * - cualquier otro caso → solo .env.dev
 *
 * NODE_ENV debe venir del entorno (PM2, systemd, shell) antes de arrancar Node.
 */
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Raíz del paquete backend (donde están .env.dev / .env.prod) */
const backendRoot = path.join(__dirname, '../..');

const nodeEnvBefore = process.env.NODE_ENV;
const isProduction = nodeEnvBefore === 'production';
const envFile = isProduction ? '.env.prod' : '.env.dev';
const envPath = path.join(backendRoot, envFile);

if (!existsSync(envPath)) {
    console.warn(`⚠️  Archivo env no encontrado: ${envPath}`);
    console.warn('   Se usarán solo variables ya definidas en el entorno del proceso.');
} else {
    const result = dotenv.config({
        path: envPath,
        /** El archivo elegido tiene prioridad sobre valores heredados del shell */
        override: true
    });
    if (result.error) {
        console.warn('⚠️  dotenv:', result.error.message);
    }
}

console.log('🌍 Entorno:', process.env.NODE_ENV || nodeEnvBefore || '(no definido)');
console.log('📄 Archivo env:', envFile, `(${envPath})`);
console.log('🗄️  DB:', process.env.DB_NAME || '(no definido)');
