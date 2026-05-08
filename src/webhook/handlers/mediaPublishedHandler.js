/**
 * src/webhook/handlers/mediaPublishedHandler.js
 *
 * Handles the "media_published" webhook event from Meta (Instagram/Facebook).
 *
 * Flow:
 *   1. Extract media metadata from the webhook change entry
 *   2. Resolve the Cloudinary asset linked to this media via public_id or media_id
 *   3. Build a structured auto-post payload ready for downstream processing
 *   4. Emit to queue / logger (extendable hook for future scheduler integration)
 */

import { v2 as cloudinary } from 'cloudinary';

// ── Cloudinary singleton config ───────────────────────────────────────────────
let _cloudinaryReady = false;

function ensureCloudinary() {
    if (_cloudinaryReady) return;

    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new Error(
            '[mediaPublished] Credenciais Cloudinary ausentes. ' +
            'Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env'
        );
    }

    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key:    CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure:     true,
    });

    _cloudinaryReady = true;
}

// ── Cloudinary asset lookup ───────────────────────────────────────────────────

/**
 * Search Cloudinary for an asset matching the given media_id tag.
 * Assets are tagged with the Instagram media_id during upload (see imageService.js).
 *
 * Falls back to fetching the most recent asset in the SocialMedia_Agent folder
 * if no tag match is found.
 *
 * @param {string} mediaId - Instagram/Facebook media ID from the webhook event
 * @returns {Promise<{ url: string|null, public_id: string|null, width: number|null, height: number|null }>}
 */
async function fetchCloudinaryAsset(mediaId) {
    try {
        ensureCloudinary();

        // Strategy 1: search by tag (media_id should have been applied on upload)
        const tagResult = await cloudinary.search
            .expression(`tags=${mediaId} AND folder:SocialMedia_Agent*`)
            .sort_by('created_at', 'desc')
            .max_results(1)
            .execute();

        if (tagResult.resources?.length > 0) {
            const asset = tagResult.resources[0];
            console.log(`[mediaPublished] ☁️  Cloudinary asset encontrado por tag (${mediaId}): ${asset.secure_url}`);
            return {
                url:       asset.secure_url,
                public_id: asset.public_id,
                width:     asset.width  || null,
                height:    asset.height || null,
            };
        }

        // Strategy 2: fallback — most recent asset in the project folder
        console.warn(`[mediaPublished] ⚠️  Nenhum asset com tag "${mediaId}". Buscando o mais recente...`);

        const fallbackResult = await cloudinary.search
            .expression('folder:SocialMedia_Agent*')
            .sort_by('created_at', 'desc')
            .max_results(1)
            .execute();

        if (fallbackResult.resources?.length > 0) {
            const asset = fallbackResult.resources[0];
            console.log(`[mediaPublished] ☁️  Cloudinary fallback asset: ${asset.secure_url}`);
            return {
                url:       asset.secure_url,
                public_id: asset.public_id,
                width:     asset.width  || null,
                height:    asset.height || null,
            };
        }

        console.warn('[mediaPublished] ⚠️  Nenhum asset encontrado no Cloudinary.');
        return { url: null, public_id: null, width: null, height: null };

    } catch (err) {
        console.error(`[mediaPublished] ❌ Erro ao buscar Cloudinary: ${err.message}`);
        return { url: null, public_id: null, width: null, height: null };
    }
}

// ── Auto-post payload builder ─────────────────────────────────────────────────

/**
 * Builds a structured payload ready for automatic posting or scheduling.
 *
 * @param {object} change       - The change object from the Meta webhook entry
 * @param {object} cloudinaryAsset - Result from fetchCloudinaryAsset()
 * @returns {object} autoPostPayload
 */
function buildAutoPostPayload(change, cloudinaryAsset) {
    const value = change.value || {};

    return {
        // ── Event metadata ───────────────────────────────────────────────────
        event:      'media_published',
        receivedAt: new Date().toISOString(),
        status:     'pending',         // pending → scheduled → posted → failed

        // ── Meta media info ──────────────────────────────────────────────────
        meta: {
            mediaId:    value.media_id    || null,
            igUserId:   value.ig_user_id   || null,
            mediaType:  value.media_type   || 'IMAGE',  // IMAGE | CAROUSEL_ALBUM | VIDEO
            permalink:  value.permalink    || null,
            timestamp:  value.timestamp    || null,
        },

        // ── Cloudinary asset ─────────────────────────────────────────────────
        asset: {
            url:       cloudinaryAsset.url,
            public_id: cloudinaryAsset.public_id,
            width:     cloudinaryAsset.width,
            height:    cloudinaryAsset.height,
        },

        // ── Auto-post config (extendable for scheduler) ──────────────────────
        postConfig: {
            caption:    null,   // Populated by caption engine before posting
            hashtags:   [],     // Populated by caption engine before posting
            scheduleAt: null,   // Set by scheduler module
            platform:   'instagram',
        },

        // ── Pipeline hooks ───────────────────────────────────────────────────
        _pipeline: {
            needsCaption:   true,
            needsSchedule:  true,
            readyToPublish: false,
        },
    };
}

// ── Downstream emit (queue / logger hook) ─────────────────────────────────────

/**
 * Entry point for downstream processing of the auto-post payload.
 * Extend this function to connect to a job queue (BullMQ, etc.) or scheduler.
 *
 * @param {object} payload - The structured auto-post payload
 */
async function emitToQueue(payload) {
    // ── Current: log to console ──────────────────────────────────────────────
    console.log('[mediaPublished] 📤 Auto-post payload pronto:');
    console.log(JSON.stringify(payload, null, 2));

    // ── Future: BullMQ / scheduler integration ───────────────────────────────
    // await postQueue.add('auto-post', payload, { attempts: 3, backoff: 5000 });
}

// ── Main handler (exported) ───────────────────────────────────────────────────

/**
 * Processes a "media_published" webhook change from Meta.
 * Called by metaWebhook.js event dispatcher.
 *
 * @param {object} entry  - A single entry object from body.entry[]
 * @param {object} change - A single change object from entry.changes[]
 */
export async function handleMediaPublished(entry, change) {
    const mediaId = change.value?.media_id || entry.id;

    console.log(`\n[mediaPublished] 🖼️  Mídia publicada detectada — media_id: ${mediaId}`);

    // Step 1: Fetch Cloudinary asset
    const cloudinaryAsset = await fetchCloudinaryAsset(mediaId);

    // Step 2: Build structured payload
    const payload = buildAutoPostPayload(change, cloudinaryAsset);

    // Step 3: Emit to downstream queue / processing
    await emitToQueue(payload);

    console.log(`[mediaPublished] ✅ Evento processado — status: ${payload.status}`);

    return payload;
}
