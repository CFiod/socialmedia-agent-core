/**
 * services/cloudinary.js
 * Serviço de upload Cloudinary — SaaS Ready (multi-tenant via cliente param)
 *
 * Variáveis de ambiente obrigatórias:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config.js'; // Garante que o dotenv rodou

// ── Configuração única (singleton) ───────────────────────────────────────────
let _configured = false;

function ensureConfigured() {
    if (_configured) return;

    // Usando config ou fallback para process.env, para lidar com caching do dotenv
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new Error(
            '[Cloudinary] Credenciais ausentes. Defina CLOUDINARY_CLOUD_NAME, ' +
            'CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env'
        );
    }

    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key:    CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure:     true,
    });

    _configured = true;
}

/**
 * Faz upload de uma imagem local para o Cloudinary.
 *
 * @param {string} filePath  - Caminho absoluto do arquivo local (ex: output/xxx/images/feed/post.png)
 * @param {string} tipo      - Tipo do conteúdo: 'post' | 'carrossel' | 'growth' | 'autor' | 'story'
 * @param {string} [cliente] - (Futuro SaaS) Identificador do tenant. Default: null (sem prefixo de cliente)
 * @param {string} [outputFolderName] - Nome do diretório de output (ex: 2026-05-01T06-00-00_carrossel)
 *
 * @returns {Promise<{ url: string, public_id: string } | { url: null, public_id: null }>}
 *          Retorna fallback com nulls em caso de erro — nunca quebra o pipeline.
 */
export async function uploadImage(filePath, tipo, cliente = null, outputFolderName = null) {
    try {
        ensureConfigured();

        // ── Pasta no Cloudinary ──────────────────────────────────────────────
        // Multi-tenant: SocialMedia_Agent/{cliente}/{tipo}[/{outputFolderName}]
        // Default:      SocialMedia_Agent/{tipo}[/{outputFolderName}]
        let folder = cliente
            ? `SocialMedia_Agent/${cliente}/${tipo}`
            : `SocialMedia_Agent/${tipo}`;
        
        if (outputFolderName) {
            folder += `/${outputFolderName}`;
        }

        console.log(`   ☁️  [Cloudinary] Fazendo upload → ${folder} ...`);

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            use_filename:      true,
            unique_filename:   true,
            overwrite:         false,
            resource_type:     'image',
            // Transformações básicas: otimização automática de formato
            transformation: [
                { quality: 'auto:good', fetch_format: 'auto' }
            ],
        });

        console.log(`   ✅ [Cloudinary] Upload concluído: ${result.secure_url}`);

        return {
            url:       result.secure_url,
            public_id: result.public_id,
        };
    } catch (err) {
        // Fallback seguro: loga o erro mas NÃO quebra o pipeline
        console.error(`   ❌ [Cloudinary] Falha no upload de "${filePath}": ${err.message}`);
        return {
            url:       null,
            public_id: null,
        };
    }
}

/**
 * Upload de múltiplas imagens em paralelo.
 * Útil para carrossel (vários slides de uma vez).
 *
 * @param {Array<{ filePath: string, tipo: string, label?: string }>} items
 * @param {string} [cliente]
 * @param {string} [outputFolderName]
 *
 * @returns {Promise<Array<{ label: string, url: string|null, public_id: string|null }>>}
 */
export async function uploadMultipleImages(items, cliente = null, outputFolderName = null) {
    const promises = items.map(async ({ filePath, tipo, label = filePath }) => {
        const result = await uploadImage(filePath, tipo, cliente, outputFolderName);
        return { label, ...result };
    });

    return Promise.all(promises);
}
