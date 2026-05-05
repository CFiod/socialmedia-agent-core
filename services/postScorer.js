/**
 * ============================================================
 * 📊 POST SCORER (v1.0) — Sistema de Scoring Automático
 * ============================================================
 * Analisa a imagem final do post via Vision AI e retorna
 * uma pontuação de 0 a 100 com breakdown detalhado.
 *
 * CRITÉRIOS (10 dimensões, 100 pontos total):
 *   singleScene         (20pts) — Cena única, sem grid/collage
 *   noAiText            (15pts) — Sem texto gerado pela IA
 *   noUiElements        (10pts) — Sem mockups de UI
 *   characterConsistency(10pts) — Personagem consistente
 *   textLegibility      (10pts) — Overlay de texto legível
 *   compositionQuality  (10pts) — Composição limpa
 *   lightingMatch       (5pts)  — Iluminação adequada
 *   moodMatch           (5pts)  — Mood visual coerente
 *   brandPresence       (5pts)  — Logo visível
 *   overallPremium      (10pts) — Sensação premium
 * ============================================================
 */

import { config } from '../config/config.js';

// ── SCORING CRITERIA ─────────────────────────────────────────────────────────

const SCORING_CRITERIA = [
    { key: 'singleScene', maxScore: 20, label: 'Cena Única (sem grid/collage)' },
    { key: 'noAiText', maxScore: 15, label: 'Sem texto IA na imagem base' },
    { key: 'noUiElements', maxScore: 10, label: 'Sem elementos de UI/mockup' },
    { key: 'characterConsistency', maxScore: 10, label: 'Personagem consistente' },
    { key: 'textLegibility', maxScore: 10, label: 'Texto overlay legível' },
    { key: 'compositionQuality', maxScore: 10, label: 'Composição visual limpa' },
    { key: 'lightingMatch', maxScore: 5, label: 'Iluminação adequada ao estilo' },
    { key: 'moodMatch', maxScore: 5, label: 'Mood visual coerente' },
    { key: 'brandPresence', maxScore: 5, label: 'Logo/marca visível' },
    { key: 'overallPremium', maxScore: 10, label: 'Sensação premium geral' },
];

// ── VISION PROMPT ────────────────────────────────────────────────────────────

function buildScoringPrompt() {
    return `You are a professional social media visual QA system. Analyze this Instagram post image and score it on these 10 criteria.

For each criterion, give a score from 0 to its maximum. Be STRICT — this is quality control.

CRITERIA:
1. singleScene (max 20): Is this ONE unified scene? Score 0 if there are multiple panels, grid layouts, collages, storyboards, or split screens. Score 20 for a single continuous image.
2. noAiText (max 15): Does the BASE IMAGE (not the text overlay) contain any AI-generated text, numbers, letters, gibberish text, or lorem ipsum? Score 0 if yes, 15 if the base image is purely visual. NOTE: Intentional text overlays (headlines, subtitles, CTAs) placed by the system are EXPECTED and should NOT reduce this score.
3. noUiElements (max 10): Are there any Instagram UI icons, phone bezels, app interfaces, navigation bars, or device mockups in the image? Score 0 if yes, 10 if clean.
4. characterConsistency (max 10): If a person is present, is the character consistent (same face, hair, clothing)? Score based on quality. Score 8-10 for single scenes.
5. textLegibility (max 10): Is the overlaid text (headline, subtitle, CTA) clearly readable? Good contrast? Proper positioning?
6. compositionQuality (max 10): Is the composition clean? Good use of space? Subject well-framed? Text-safe zones respected?
7. lightingMatch (max 5): Is the lighting soft, editorial, and appropriate? Not too dark, not blown out?
8. moodMatch (max 5): Does the visual mood match a professional, introspective, therapeutic Instagram aesthetic?
9. brandPresence (max 5): Is there a visible brand logo/watermark? Is it well-positioned?
10. overallPremium (max 10): Overall, does this look like a premium, professional Instagram post that would stop someone from scrolling?

Return ONLY a JSON object with this exact structure:
{
    "scores": {
        "singleScene": <number>,
        "noAiText": <number>,
        "noUiElements": <number>,
        "characterConsistency": <number>,
        "textLegibility": <number>,
        "compositionQuality": <number>,
        "lightingMatch": <number>,
        "moodMatch": <number>,
        "brandPresence": <number>,
        "overallPremium": <number>
    },
    "totalScore": <number>,
    "criticalIssues": ["list of critical problems found"],
    "suggestions": ["list of improvement suggestions"],
    "verdict": "APPROVED" | "NEEDS_CORRECTION" | "REJECTED"
}

Verdict rules:
- APPROVED: totalScore >= 70
- NEEDS_CORRECTION: totalScore >= 40 and < 70
- REJECTED: totalScore < 40`;
}

// ── MAIN SCORER ──────────────────────────────────────────────────────────────

/**
 * Analisa a imagem do post e retorna um score detalhado (0-100).
 *
 * @param {Buffer} imageBuffer — Buffer PNG da imagem final
 * @param {Object} context — Contexto do post (growth meta, estilo, etc.)
 * @returns {Object} — { scores, totalScore, criticalIssues, suggestions, verdict }
 */
export async function scorePost(imageBuffer, context = {}) {
    if (!imageBuffer) {
        console.log('⚠️ [PostScorer] Nenhuma imagem para analisar.');
        return createFallbackScore('NO_IMAGE');
    }

    console.log('\n📊 ═══════════════════════════════════════════════════════');
    console.log('   POST SCORER — Análise de Qualidade Visual (0-100)');
    console.log('═══════════════════════════════════════════════════════\n');

    const base64Image = imageBuffer.toString('base64');
    const prompt = buildScoringPrompt();

    // ── PRIORIDADE 1: Google Gemini (Grátis) ────────────────────────────────
    if (config.GOOGLE_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${config.GOOGLE_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: 'image/png', data: base64Image } }
                        ]
                    }],
                    generationConfig: {
                        response_mime_type: 'application/json',
                        temperature: 0.1
                    }
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                const result = JSON.parse(data.candidates[0].content.parts[0].text);
                return processScoreResult(result, 'Google Gemini');
            }
        } catch (e) {
            console.warn(`⚠️ [PostScorer] Google Gemini falhou: ${e.message}`);
        }
    }

    // ── PRIORIDADE 2: OpenRouter (Fallback) ─────────────────────────────────
    if (config.OPENROUTER_API_KEY) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.MODEL_VISION || 'google/gemini-2.0-flash-001',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                        ]
                    }],
                    max_tokens: 800
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]?.message?.content) {
                let content = data.choices[0].message.content.trim();
                content = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(content);
                return processScoreResult(result, 'OpenRouter');
            }
        } catch (e) {
            console.warn(`⚠️ [PostScorer] OpenRouter falhou: ${e.message}`);
        }
    }

    // ── Fallback: Score manual sem Vision ────────────────────────────────────
    console.log('⚠️  [PostScorer] Nenhum provedor de visão disponível. Usando score padrão.');
    return createFallbackScore('NO_VISION_PROVIDER');
}

// ── PROCESSAMENTO DO RESULTADO ───────────────────────────────────────────────

function processScoreResult(result, provider) {
    // Validar e normalizar scores
    const scores = {};
    let totalCalculated = 0;

    for (const criterion of SCORING_CRITERIA) {
        const rawScore = result.scores?.[criterion.key];
        const score = Math.min(Math.max(Number(rawScore) || 0, 0), criterion.maxScore);
        scores[criterion.key] = score;
        totalCalculated += score;
    }

    const totalScore = totalCalculated;
    const criticalIssues = result.criticalIssues || [];
    const suggestions = result.suggestions || [];

    // Determinar veredicto
    let verdict;
    if (totalScore >= 70) verdict = 'APPROVED';
    else if (totalScore >= 40) verdict = 'NEEDS_CORRECTION';
    else verdict = 'REJECTED';

    // ── LOG VISUAL ──────────────────────────────────────────────────────────
    const verdictIcon = verdict === 'APPROVED' ? '✅' : verdict === 'NEEDS_CORRECTION' ? '⚠️' : '❌';
    const barLength = 30;

    console.log(`   📡 Provedor: ${provider}`);
    console.log(`   ─────────────────────────────────────────────`);

    for (const criterion of SCORING_CRITERIA) {
        const score = scores[criterion.key];
        const pct = score / criterion.maxScore;
        const filled = Math.round(pct * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        const icon = pct >= 0.7 ? '✅' : pct >= 0.4 ? '⚠️' : '❌';
        console.log(`   ${icon} ${criterion.label.padEnd(35)} ${bar} ${score}/${criterion.maxScore}`);
    }

    console.log(`   ─────────────────────────────────────────────`);
    console.log(`   ${verdictIcon} SCORE TOTAL: ${totalScore}/100 — ${verdict}`);

    if (criticalIssues.length > 0) {
        console.log(`\n   🔴 PROBLEMAS CRÍTICOS:`);
        criticalIssues.forEach(issue => console.log(`      • ${issue}`));
    }

    if (suggestions.length > 0) {
        console.log(`\n   💡 SUGESTÕES:`);
        suggestions.forEach(s => console.log(`      • ${s}`));
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    return {
        scores,
        totalScore,
        criticalIssues,
        suggestions,
        verdict,
        provider
    };
}

// ── FALLBACK SCORE ───────────────────────────────────────────────────────────

function createFallbackScore(reason) {
    console.log(`   ⚠️  Fallback Score (${reason}): Vision AI indisponível — pulando auto-correção.\n`);
    const scores = {};
    for (const criterion of SCORING_CRITERIA) {
        scores[criterion.key] = Math.round(criterion.maxScore * 0.5);
    }
    return {
        scores,
        totalScore: 50,
        criticalIssues: [`Scoring automático indisponível: ${reason}`],
        suggestions: ['Revisar imagem manualmente'],
        verdict: 'SKIP',  // NÃO triggar auto-correção sem Vision real
        provider: 'fallback'
    };
}

// ── SCORE RÁPIDO (Sem Vision — Heurística Local) ─────────────────────────────
// Fallback rápido para quando não quer gastar API. Analisa o buffer raw.

/**
 * Score heurístico local (sem API). Verifica aspectos básicos do buffer.
 * Usado como pré-filtro antes de enviar para Vision AI.
 *
 * @param {Buffer} imageBuffer
 * @returns {Object} — { quickScore, issues }
 */
export function quickScoreLocal(imageBuffer) {
    const issues = [];
    let quickScore = 100;

    if (!imageBuffer) {
        return { quickScore: 0, issues: ['Sem imagem gerada'] };
    }

    // Verificação 1: Tamanho mínimo do buffer (imagens muito pequenas = falha)
    if (imageBuffer.length < 50000) {
        issues.push('Imagem muito pequena — possível falha na geração');
        quickScore -= 30;
    }

    // Verificação 2: Tamanho suspeitamente grande (pode indicar collage/grid)
    // Uma imagem 1080x1440 DALL-E normal fica ~500KB-2MB
    if (imageBuffer.length > 5000000) {
        issues.push('Imagem muito grande — possível composição complexa/collage');
        quickScore -= 10;
    }

    // Verificação 3: PNG válido (magic bytes)
    const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
    const isJPG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
    if (!isPNG && !isJPG) {
        issues.push('Formato de imagem inválido');
        quickScore -= 40;
    }

    return {
        quickScore: Math.max(quickScore, 0),
        issues,
        passesPreFilter: quickScore >= 60
    };
}

export { SCORING_CRITERIA };

// ── CONTENT QUALITY SCORER (V2) ──────────────────────────────────────────────
// Scoring de qualidade do CONTEÚDO (copy + estratégia), não da imagem.
// Complementa o scorePost() que analisa a imagem visual.

/**
 * Analisa a qualidade do conteúdo textual e retorna score 0-100.
 * Critérios: engajamento, clareza, impacto_visual, originalidade.
 *
 * @param {Object} params
 * @param {Object[]} params.slides — array de slides com texto_principal, texto_secundario
 * @param {Object} params.classificacao — resultado do content_classifier
 * @param {Object} params.variacao — resultado do gerarVariacaoCriativa
 * @param {string} params.categoria — carrossel | post | growth | autor
 * @returns {Object} — { scores, nota_final, passed, issues }
 */
export function scoreContent({ slides = [], classificacao = null, variacao = null, categoria = 'post' } = {}) {
    const scores = {
        engajamento: 0,
        clareza: 0,
        impacto_visual: 0,
        originalidade: 0,
    };
    const issues = [];

    if (!slides || slides.length === 0) {
        return { scores, nota_final: 0, passed: false, issues: ['Sem slides para analisar'] };
    }

    // ── ENGAJAMENTO (0-100) ──────────────────────────────────────────────────
    let engScore = 50; // Base
    const allText = slides.map(s => `${s.texto_principal || ''} ${s.texto_secundario || ''}`).join(' ');

    // Tem pergunta direta? (+15)
    if (allText.includes('?')) engScore += 15;
    // Fala diretamente com "você"? (+10)
    if (allText.toLowerCase().includes('você')) engScore += 10;
    // Tem CTA/frase final? (+10)
    if (slides.some(s => s.frase_final && s.frase_final.length > 5)) engScore += 10;
    // Tem destaques? (+5)
    if (slides.some(s => s.destaques && s.destaques.length > 0)) engScore += 5;
    // Muito longo? (-10)
    const avgWords = allText.split(/\s+/).length / slides.length;
    if (avgWords > 25) { engScore -= 10; issues.push('Copy muito longa (média > 25 palavras/slide)'); }
    // Categoria growth/autor deve ter hook forte
    if ((categoria === 'growth' || categoria === 'autor') && !allText.includes('?') && !allText.includes('!')) {
        engScore -= 10;
        issues.push('Growth/Autor sem hook forte (sem ? ou !)');
    }
    scores.engajamento = Math.min(Math.max(engScore, 0), 100);

    // ── CLAREZA (0-100) ─────────────────────────────────────────────────────
    let clarezaScore = 60;
    // texto_principal <= 12 palavras? (+15)
    const principalWords = slides.map(s => (s.texto_principal || '').split(/\s+/).length);
    if (principalWords.every(w => w <= 12)) clarezaScore += 15;
    else { clarezaScore -= 10; issues.push('texto_principal > 12 palavras em algum slide'); }
    // texto_secundario <= 18 palavras? (+10)
    const secWords = slides.map(s => (s.texto_secundario || '').split(/\s+/).length);
    if (secWords.every(w => w <= 18)) clarezaScore += 10;
    // Não repete principal no secundário? (+10)
    const hasRepetition = slides.some(s => {
        if (!s.texto_principal || !s.texto_secundario) return false;
        return s.texto_secundario.toLowerCase().includes(s.texto_principal.toLowerCase().substring(0, 15));
    });
    if (!hasRepetition) clarezaScore += 10;
    else { clarezaScore -= 15; issues.push('texto_secundario repete o principal'); }
    scores.clareza = Math.min(Math.max(clarezaScore, 0), 100);

    // ── IMPACTO VISUAL (0-100) ──────────────────────────────────────────────
    let impactoScore = 50;
    // Tem descricao_visual em inglês? (+15)
    if (slides.every(s => s.descricao_visual && /^[a-zA-Z]/.test(s.descricao_visual))) impactoScore += 15;
    else issues.push('descricao_visual ausente ou não está em inglês');
    // descricao_visual <= 25 palavras? (+10)
    if (slides.every(s => !s.descricao_visual || s.descricao_visual.split(/\s+/).length <= 25)) impactoScore += 10;
    // Não usa termos proibidos? (+15)
    const forbidden = ['dark', 'darkness', 'shadow', 'chains', 'trapped', 'black room', 'oil_painting'];
    const hasForbidden = slides.some(s => forbidden.some(f => (s.descricao_visual || '').toLowerCase().includes(f)));
    if (!hasForbidden) impactoScore += 15;
    else { impactoScore -= 20; issues.push('descricao_visual contém termos visuais proibidos'); }
    // Categoria autor sem persona na visual? (+10)
    if (categoria === 'autor') {
        const hasPersonInVisual = slides.some(s => (s.descricao_visual || '').toLowerCase().match(/woman|man|person|girl|boy/));
        if (!hasPersonInVisual) impactoScore += 10;
        else { impactoScore -= 15; issues.push('Modo AUTOR com persona na descricao_visual'); }
    }
    scores.impacto_visual = Math.min(Math.max(impactoScore, 0), 100);

    // ── ORIGINALIDADE (0-100) ────────────────────────────────────────────────
    let origScore = 60;
    // Não começa com "Você" em mais de 1 slide? (+15)
    const voceStarts = slides.filter(s => (s.texto_principal || '').trim().startsWith('Você')).length;
    if (voceStarts <= 1) origScore += 15;
    else { origScore -= 10; issues.push(`${voceStarts} slides começam com "Você" (máx 1)`); }
    // Variação criativa definida? (+10)
    if (variacao && variacao.angulo && variacao.formato_hook) origScore += 10;
    // Não repete mesma emoção em slides consecutivos? (+15)
    if (slides.length > 1) {
        let repeticaoEmocao = false;
        for (let i = 1; i < slides.length; i++) {
            if (slides[i].tipo && slides[i - 1].tipo && slides[i].tipo === slides[i - 1].tipo) {
                repeticaoEmocao = true;
                break;
            }
        }
        if (!repeticaoEmocao) origScore += 15;
        else issues.push('Slides consecutivos com mesmo tipo/emoção');
    }
    scores.originalidade = Math.min(Math.max(origScore, 0), 100);

    // ── NOTA FINAL ──────────────────────────────────────────────────────────
    const nota_final = Math.round(
        (scores.engajamento + scores.clareza + scores.impacto_visual + scores.originalidade) / 4
    );
    const passed = nota_final >= 70;

    if (!passed) {
        console.log(`\n   ⚠️ [ContentScorer] Nota: ${nota_final}/100 — ABAIXO DO MÍNIMO (70)`);
        issues.forEach(i => console.log(`      • ${i}`));
    } else {
        console.log(`   ✅ [ContentScorer] Nota: ${nota_final}/100 — APROVADO`);
    }

    return {
        scores,
        nota_final,
        passed,
        issues,
    };
}
