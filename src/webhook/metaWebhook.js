/**
 * src/webhook/metaWebhook.js
 *
 * Meta Webhook Module — Instagram / Facebook
 * Registers GET (verification) and POST (event reception) routes on Express.
 *
 * Usage: registerMetaWebhook(app) — called from server.js
 *
 * Event dispatcher architecture:
 *   body.entry[] → entry.changes[] → change.field → EVENT_HANDLERS[field]
 */

import { handleMediaPublished } from './handlers/mediaPublishedHandler.js';

// ── Event Dispatcher Map ──────────────────────────────────────────────────────
// Keys match the "field" value sent by Meta in each change object.
// Add new handlers here as the integration grows.
const EVENT_HANDLERS = {
    // ── Media events ─────────────────────────────────────────────────────────
    media:               handleMediaPublished,  // photo/video published to feed
    media_published:     handleMediaPublished,  // explicit publish event

    // ── Messaging events (stubs — implement as needed) ────────────────────────
    messages:            handleMessages,
    messaging_postbacks: handlePostbacks,
};

// ── Stub handlers (to be implemented) ────────────────────────────────────────

function handleMessages(entry, change) {
    console.log('[Meta Webhook] 💬 Message event — entry:', entry.id);
    console.log('   payload:', JSON.stringify(change.value, null, 2));
    // TODO: implement message handling
}

function handlePostbacks(entry, change) {
    console.log('[Meta Webhook] 🔁 Postback event — entry:', entry.id);
    console.log('   payload:', JSON.stringify(change.value, null, 2));
    // TODO: implement postback handling
}

// ── Route Registration ────────────────────────────────────────────────────────

/**
 * Registers Meta webhook routes on the given Express app.
 * Requires VERIFY_TOKEN in environment variables.
 *
 * @param {import('express').Application} app - Express app instance
 */
export function registerMetaWebhook(app) {

    // ── GET /webhook — Meta subscription verification ─────────────────────────
    app.get('/webhook', (req, res) => {
        const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

        if (!VERIFY_TOKEN) {
            console.error('[Meta Webhook] ❌ VERIFY_TOKEN não definido no .env');
            return res.sendStatus(500);
        }

        const mode      = req.query['hub.mode'];
        const token     = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[Meta Webhook] ✅ Webhook verificado com sucesso!');
            return res.status(200).send(challenge);
        }

        console.warn('[Meta Webhook] ⚠️  Verificação falhou — token inválido ou modo incorreto.');
        res.sendStatus(403);
    });

    // ── POST /webhook — Receive and dispatch Meta events ──────────────────────
    app.post('/webhook', async (req, res) => {
        const body = req.body;

        console.log('\n[Meta Webhook] 📩 Evento recebido — objeto:', body?.object);
        console.log('   Raw payload:', JSON.stringify(body, null, 2));

        if (body?.object !== 'instagram' && body?.object !== 'page') {
            console.warn('[Meta Webhook] ⚠️  Objeto desconhecido:', body?.object);
            return res.sendStatus(404);
        }

        // ── Respond immediately — Meta requires < 5s response time ──────────
        // Async processing happens AFTER the 200 is sent
        res.sendStatus(200);

        // ── Dispatch each change to the appropriate handler ──────────────────
        if (!Array.isArray(body.entry)) return;

        for (const entry of body.entry) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const handler = EVENT_HANDLERS[change.field];

                if (handler) {
                    console.log(`[Meta Webhook] 🔀 Dispatching "${change.field}" → handler`);
                    // Errors are caught per-handler to avoid killing the loop
                    try {
                        await handler(entry, change);
                    } catch (err) {
                        console.error(`[Meta Webhook] ❌ Erro no handler "${change.field}": ${err.message}`);
                    }
                } else {
                    console.log(`[Meta Webhook] 📌 Campo sem handler registrado: "${change.field}"`);
                    console.log('   value:', JSON.stringify(change.value, null, 2));
                }
            }
        }
    });

    console.log('[Meta Webhook] 🔗 Rotas registradas: GET /webhook | POST /webhook');
}
