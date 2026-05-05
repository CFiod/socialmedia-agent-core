/**
 * ============================================================
 * 🔧 POST AUTO-CORRECTOR (v1.0) — Correção Automática de Posts
 * ============================================================
 * Quando o PostScorer detecta problemas (score < 70), este
 * módulo gera um prompt corrigido com reforços negativos
 * específicos contra os erros encontrados.
 *
 * PIPELINE:
 *   scoreResult → buildCorrectionPrompt() → novo prompt reforçado
 *                                         → re-gera imagem (até 2x)
 * ============================================================
 */

// ── BANCO DE CORREÇÕES ───────────────────────────────────────────────────────
// Cada tipo de erro tem um bloco de correção específico

const CORRECTION_BLOCKS = {

    // ── GRID / COLLAGE ───────────────────────────────────────────────────────
    singleScene: {
        threshold: 14,  // Score abaixo desse valor = ativar correção (máx: 20)
        label: 'Grid/Collage detectado',
        correction: `CRITICAL FIX — SINGLE SCENE ONLY:
The previous image showed MULTIPLE PANELS in a grid/collage/storyboard layout.
THIS IS WRONG. Generate ONE SINGLE unified scene filling the entire canvas.
NOT a collage. NOT a storyboard. NOT an Instagram mockup. NOT split screens.
Think: ONE MAGAZINE COVER PHOTO — a single continuous image.
Do NOT show multiple versions of the same person in separate panels.`,
        negativeReinforcement: `no grid layout, no panels, no frames, no collage, no storyboard, no multiple scenes, no split screen, no border around the image, no mosaic, no tiled layout, no comic strip layout, no before-and-after, no side-by-side comparison`
    },

    // ── TEXTO DA IA ──────────────────────────────────────────────────────────
    noAiText: {
        threshold: 10,
        label: 'Texto/números gerados pela IA',
        correction: `CRITICAL FIX — NO TEXT IN IMAGE:
The previous image contained AI-generated text, numbers, percentages, or gibberish letters.
Do NOT render ANY text, letters, numbers, words, or typographic elements in the image.
The image must be PURELY VISUAL — text overlay will be added separately by the system.
No captions, no percentages, no labels, no watermarks, no lorem ipsum.`,
        negativeReinforcement: `no text in image, no letters, no numbers, no percentages, no words, no typography, no captions, no labels, no watermarks, no lorem ipsum text`
    },

    // ── ELEMENTOS DE UI ──────────────────────────────────────────────────────
    noUiElements: {
        threshold: 6,
        label: 'Elementos de UI/mockup detectados',
        correction: `CRITICAL FIX — NO UI ELEMENTS:
The previous image contained Instagram UI icons, phone bezels, app navigation bars, or device mockups.
Generate ONLY the artistic scene. This is an EDITORIAL ILLUSTRATION, not a screenshot.
No app interfaces, no device frames, no social media icons, no notification bars, no phone bezels.`,
        negativeReinforcement: `no Instagram UI, no phone bezels, no app interfaces, no navigation bars, no device mockups, no social media icons, no notification bars, no status bars, no like/comment buttons`
    },

    // ── CONSISTÊNCIA DO PERSONAGEM ───────────────────────────────────────────
    characterConsistency: {
        threshold: 6,
        label: 'Personagem inconsistente',
        correction: `FIX — CHARACTER CONSISTENCY:
Maintain the EXACT SAME character across the entire image:
Same face, same hair color and style, same clothing, same body type, same age.
Do not show different versions of the person. Single, unified representation.`,
        negativeReinforcement: `no character variation, same person throughout, consistent identity`
    },

    // ── LEGIBILIDADE DO TEXTO ────────────────────────────────────────────────
    textLegibility: {
        threshold: 6,
        label: 'Texto overlay com baixa legibilidade',
        correction: `FIX — TEXT SAFE ZONES:
Ensure the image has clear areas (top 25% and bottom 30%) with low visual complexity
for text overlay. Avoid placing the character's face or important details in these zones.
Keep the visual "quiet" in areas where text will be placed.`,
        negativeReinforcement: `clear safe zones for text overlay at top and bottom of image`
    },

    // ── COMPOSIÇÃO ───────────────────────────────────────────────────────────
    compositionQuality: {
        threshold: 6,
        label: 'Composição visual problemática',
        correction: `FIX — COMPOSITION:
Use proper editorial composition: subject centered or rule-of-thirds,
occupying 45-65% of the frame. Clean negative space around the subject.
Professional framing, consistent with premium Instagram content.`,
        negativeReinforcement: `clean composition, proper framing, negative space for text`
    },

    // ── ILUMINAÇÃO ───────────────────────────────────────────────────────────
    lightingMatch: {
        threshold: 3,
        label: 'Iluminação inadequada',
        correction: `FIX — LIGHTING:
Use bright, soft, editorial lighting. Avoid dark/moody scenes, heavy shadows,
or overly dramatic contrast. The lighting should feel calm, professional, and inviting.`,
        negativeReinforcement: `bright soft lighting, no dark scenes, no heavy shadows`
    },

    // ── MOOD ─────────────────────────────────────────────────────────────────
    moodMatch: {
        threshold: 3,
        label: 'Mood visual incoerente',
        correction: `FIX — MOOD:
The visual mood should match a professional, introspective, therapeutic aesthetic.
Calm, reflective, and emotionally engaging — not dramatic, scary, or chaotic.`,
        negativeReinforcement: `calm reflective mood, therapeutic aesthetic, not dramatic`
    },

    // ── PREMIUM ──────────────────────────────────────────────────────────────
    overallPremium: {
        threshold: 6,
        label: 'Não passa sensação premium',
        correction: `FIX — PREMIUM QUALITY:
This should look like a premium editorial illustration or high-end magazine content.
Clean lines, sophisticated color palette, professional quality throughout.`,
        negativeReinforcement: `premium quality, magazine editorial level, high production value`
    },
};

// ── LIMITE DO DALL-E ─────────────────────────────────────────────────────────
const DALLE_MAX_PROMPT = 3900; // DALL-E 3 limit is 4000, leave 100 chars margin

// ── MAIN AUTO-CORRECTOR ──────────────────────────────────────────────────────

/**
 * Gera um prompt corrigido baseado nos erros do scorer.
 * 
 * ESTRATÉGIA: Em vez de concatenar blocos longos ao prompt original,
 * gera um prompt COMPACTO de correção que substitui o original.
 * Máximo: 3900 chars (DALL-E 3 aceita até 4000).
 *
 * @param {string} originalPrompt — Prompt original enviado ao DALL-E
 * @param {Object} scoreResult — Resultado do postScorer
 * @returns {Object} — { correctedPrompt, corrections, shouldRetry }
 */
export function buildCorrectionPrompt(originalPrompt, scoreResult) {
    if (!scoreResult || !scoreResult.scores) {
        return { correctedPrompt: originalPrompt, corrections: [], shouldRetry: false };
    }

    const { scores, totalScore, criticalIssues, verdict } = scoreResult;
    const corrections = [];
    const negativeRules = [];

    console.log('\n🔧 ═══════════════════════════════════════════════════════');
    console.log('   POST AUTO-CORRECTOR — Gerando Prompt Corrigido');
    console.log('═══════════════════════════════════════════════════════\n');

    // ── Identificar quais correções são necessárias ──────────────────────────
    for (const [key, cfg] of Object.entries(CORRECTION_BLOCKS)) {
        const score = scores[key];
        if (score !== undefined && score < cfg.threshold) {
            corrections.push({
                criterion: key,
                label: cfg.label,
                score: score,
                threshold: cfg.threshold,
                maxScore: cfg.threshold + (key === 'singleScene' ? 6 : key === 'noAiText' ? 5 : 4),
            });
            negativeRules.push(cfg.negativeReinforcement);

            console.log(`   ❌ ${cfg.label} (score: ${score}/${cfg.threshold + (key === 'singleScene' ? 6 : key === 'noAiText' ? 5 : 4)})`);
        }
    }

    if (criticalIssues && criticalIssues.length > 0) {
        console.log('\n   🔴 Issues críticos da Vision AI:');
        criticalIssues.forEach(issue => console.log(`      • ${issue}`));
    }

    if (corrections.length === 0) {
        console.log('   ✅ Nenhuma correção necessária.\n');
        return { correctedPrompt: originalPrompt, corrections: [], shouldRetry: false };
    }

    // ── ESTRATÉGIA: Injetar regras compactas NO FINAL do prompt original ─────
    // Em vez de duplicar o prompt, adicionamos um bloco curto de reforço
    const compactFix = buildCompactCorrectionBlock(corrections, negativeRules);

    // Injetar no final do prompt original (antes do Negative prompt se existir)
    let correctedPrompt;
    const negativeIndex = originalPrompt.indexOf('Negative prompt');
    
    if (negativeIndex > 0) {
        // Substituir o bloco de Negative prompt existente pelo reforçado
        const beforeNegative = originalPrompt.substring(0, negativeIndex).trim();
        correctedPrompt = `${beforeNegative}\n\n${compactFix}`;
    } else {
        // Adicionar ao final
        correctedPrompt = `${originalPrompt}\n\n${compactFix}`;
    }

    // ── HARD LIMIT: Truncar se exceder o limite do DALL-E ───────────────────
    if (correctedPrompt.length > DALLE_MAX_PROMPT) {
        console.log(`   ⚠️ Prompt ${correctedPrompt.length} chars → truncando para ${DALLE_MAX_PROMPT}`);
        correctedPrompt = correctedPrompt.substring(0, DALLE_MAX_PROMPT);
    }

    // ── Decisão de retry ────────────────────────────────────────────────────
    const hasCriticalCorrection = corrections.some(c =>
        ['singleScene', 'noAiText', 'noUiElements'].includes(c.criterion)
    );

    const shouldRetry = verdict !== 'APPROVED' && hasCriticalCorrection;

    console.log(`\n   📝 ${corrections.length} correção(ões) aplicada(s)`);
    console.log(`   📏 Prompt: ${correctedPrompt.length}/${DALLE_MAX_PROMPT} chars`);
    console.log(`   🔄 Retry automático: ${shouldRetry ? 'SIM' : 'NÃO'}`);
    console.log(`   📊 Score anterior: ${totalScore}/100 — ${verdict}`);
    console.log('\n═══════════════════════════════════════════════════════\n');

    return {
        correctedPrompt,
        corrections,
        shouldRetry,
        originalScore: totalScore,
        originalVerdict: verdict
    };
}

// ── BLOCO COMPACTO DE CORREÇÃO ───────────────────────────────────────────────
// Gera um bloco curto (~500 chars) que substitui/reforça o negative prompt

function buildCompactCorrectionBlock(corrections, negativeRules) {
    const criticalKeys = corrections.map(c => c.criterion);
    
    // Regras compactas por tipo de erro
    const rules = [];
    
    if (criticalKeys.includes('singleScene')) {
        rules.push('MUST be ONE SINGLE scene, no grid, no collage, no panels, no storyboard, no split screen');
    }
    if (criticalKeys.includes('noAiText')) {
        rules.push('NO text, letters, numbers, or words rendered in the image');
    }
    if (criticalKeys.includes('noUiElements')) {
        rules.push('NO Instagram UI, no phone bezels, no app icons, no device frames');
    }
    if (criticalKeys.includes('characterConsistency')) {
        rules.push('same character throughout, no variation');
    }
    if (criticalKeys.includes('textLegibility')) {
        rules.push('leave clear space at top and bottom for text overlay');
    }
    if (criticalKeys.includes('compositionQuality')) {
        rules.push('clean editorial composition, subject centered, negative space');
    }
    if (criticalKeys.includes('lightingMatch')) {
        rules.push('bright soft editorial lighting, no dark scenes');
    }
    if (criticalKeys.includes('overallPremium')) {
        rules.push('premium magazine quality');
    }

    return `CRITICAL RULES:\n${rules.join('.\n')}.\n\nNegative prompt / Restrictions:\n${rules.join(', ')},\ndo not change character between slides, no different clothing per slide, no text or letters in the image, single unified scene only.`;
}

// ── PROMPT SIMPLIFICADO (Para injetar direto no imageService) ────────────────

/**
 * Gera apenas o bloco de reforço negativo para injetar no final do prompt.
 * Usado quando se quer um approach mais leve (sem re-escrever todo o prompt).
 *
 * @param {Object} scoreResult
 * @returns {string} — Bloco de reforço para concatenar ao prompt
 */
export function getReinforcementBlock(scoreResult) {
    if (!scoreResult || !scoreResult.scores) return '';

    const { scores } = scoreResult;
    const reinforcements = [];

    for (const [key, cfg] of Object.entries(CORRECTION_BLOCKS)) {
        const score = scores[key];
        if (score !== undefined && score < cfg.threshold) {
            reinforcements.push(cfg.negativeReinforcement);
        }
    }

    if (reinforcements.length === 0) return '';

    return `\n\nADDITIONAL RESTRICTIONS (auto-corrected):\n${reinforcements.join(',\n')}.`;
}

// ── RESUMO DE CORREÇÕES (Para logging/preview) ──────────────────────────────

/**
 * Gera um resumo legível das correções aplicadas.
 *
 * @param {Array} corrections — Lista de correções do buildCorrectionPrompt
 * @returns {string} — Resumo formatado
 */
export function formatCorrectionSummary(corrections) {
    if (!corrections || corrections.length === 0) return '✅ Nenhuma correção necessária.';

    let summary = `🔧 ${corrections.length} CORREÇÃO(ÕES) APLICADA(S):\n`;
    corrections.forEach((c, i) => {
        summary += `   ${i + 1}. ${c.label} (score: ${c.score}/${c.maxScore})\n`;
    });

    return summary;
}

export { CORRECTION_BLOCKS };
