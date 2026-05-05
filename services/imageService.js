import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { loadImage } from '@napi-rs/canvas';
import { config } from '../config/config.js';
import { ensureDir } from '../utils/fileManager.js';
import { overlayTextOnImage } from '../utils/imageOverlayer.js';
import { analyzeImageForText } from './visionService.js';
import { definirTipoCena } from '../agents/image_prompt_builder.js';
import { buildPrompt, attachGenerationMetadata, buildPromptV3 } from '../engines/prompt/buildPrompt.js';
import { scorePost, quickScoreLocal } from './postScorer.js';
import { buildCorrectionPrompt } from './postAutoCorrector.js';
import { escolherComposicao, variarComposicaoCarrossel } from '../agents/composition_engine.js';
import { selecionarPersona } from '../agents/persona_bank.js';
import { layoutEngine } from '../agents/layout_engine.js';
import { detectFaces } from './visionService.js';
import { uploadImage } from './cloudinary.js';

// ══════════════════════════════════════════════════════════════════════════════
// 🔒 CHARACTER SHEET BUILDER — Persona Locking V3 para Carrosseis
// Gera uma descrição ultra-detalhada do personagem para que DALL-E mantenha
// consistência absoluta entre os cards. Funciona como um "casting sheet".
// ══════════════════════════════════════════════════════════════════════════════

const HAIR_STYLES = [
    'dark brown wavy shoulder-length hair with subtle layers',
    'straight black hair pulled back in a low bun',
    'warm auburn curly hair just past the shoulders',
    'dark brown hair with curtain bangs, medium length',
    'short dark pixie cut with textured waves',
    'light brown hair in a loose ponytail',
];
const SKIN_TONES = [
    'warm light brown skin with olive undertones',
    'fair skin with warm peachy undertones',
    'deep warm brown skin with golden undertones',
    'light caramel skin with subtle freckles',
    'medium tan skin with Mediterranean features',
    'rich dark brown skin with warm undertones',
];
const CLOTHING_SETS = [
    'wearing a cream knit sweater and simple gold necklace',
    'wearing a fitted neutral linen blazer over a white tee',
    'wearing an oversized beige turtleneck, minimal jewelry',
    'wearing a soft olive green henley shirt, no accessories',
    'wearing a classic white button-down, sleeves rolled up',
    'wearing a charcoal crew-neck top, small stud earrings',
];

function buildLockedCharacterSheet(baseProtagonist, personaType) {
    // Gerar seed baseado no baseProtagonist para consistência
    const seed = baseProtagonist.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    const isMale = personaType === 'homem';
    const genderWord = isMale ? 'man' : 'woman';

    // Selecionar atributos deterministicamente a partir do seed
    const hair = HAIR_STYLES[seed % HAIR_STYLES.length];
    const skin = SKIN_TONES[(seed + 3) % SKIN_TONES.length];
    const clothing = CLOTHING_SETS[(seed + 7) % CLOTHING_SETS.length];

    // Decidir idade (consistente com seed)
    const age = 27 + (seed % 12); // 27 a 38

    const sheet = [
        `EXACT SAME ${genderWord.toUpperCase()} in EVERY image of this series.`,
        `Age: ${age} years old.`,
        `Physical: ${skin}, ${hair}.`,
        `Build: natural average build, relaxed posture.`,
        `Clothing: ${clothing}.`,
        `Expression: authentic, NOT looking at camera, natural candid moment.`,
        ``,
        `🔒 CHARACTER CONSISTENCY LOCK:`,
        `This is a SEQUENTIAL CAROUSEL. The character MUST be identical in EVERY card.`,
        `- SAME face, SAME hair, SAME skin tone, SAME clothing across ALL slides.`,
        `- DO NOT change age, ethnicity, hair color, or clothing between images.`,
        `- Treat this as the SAME photoshoot with the SAME model.`,
        `- Only the POSE, ANGLE, and ENVIRONMENT may change between slides.`,
    ].join('\n');

    return sheet;
}

export async function generateAndSaveImages(outputDir, metaJson, slidesOrPost, autor = null, estiloBase = "editorial_minimalist", publico = null, tema = null, composicaoOverride = null) {
    // ── Formatos condicionais: só gera o que foi pedido ──
    const formatos = metaJson.formatos || ['feed', 'story'];
    const gerarFeed  = formatos.includes('feed');
    const gerarStory = formatos.includes('story');

    const feedDir  = gerarFeed  ? path.join(outputDir, 'images', 'feed')  : null;
    const storyDir = gerarStory ? path.join(outputDir, 'images', 'story') : null;
    
    if (feedDir)  ensureDir(feedDir);
    if (storyDir) ensureDir(storyDir);

    if (!gerarStory && gerarFeed) {
        console.log('📐 [Formato] Gerando apenas FEED (1080x1440) — sem Story.');
    } else if (gerarStory && !gerarFeed) {
        console.log('📐 [Formato] Gerando apenas STORY (1080x1920) — sem Feed.');
    }

    if (config.OPENAI_API_KEY) {
        console.log('💎 [MODO PREMIUM] Chave OpenAI detectada. Priorizando DALL-E 3.');
    } else {
        console.log('🆓 [MODO FREE] Chave OpenAI não encontrada. Usando Pollinations.');
    }

    const isPost = metaJson.tipo === 'post';
    const items = slidesOrPost;

    // ══════════════════════════════════════════════════════════════════════════
    // 🔒 PERSONA LOCKING V3 — Consistência ABSOLUTA no carrossel
    // Gera uma "character sheet" detalhada UMA VEZ e reutiliza em TODOS os slides
    // ══════════════════════════════════════════════════════════════════════════
    const genderStr = (publico?.genero || 'feminino').toLowerCase();
    const isMale = genderStr.includes('masc') || genderStr.includes('homem');
    
    const personaMeta = metaJson._persona || null;
    let strictProtagonist;
    let persona;
    let lockedCharacterSheet = null; // V3: character sheet completa para carrossel

    if (personaMeta && !personaMeta.isNoPerson && !personaMeta.isAbstract) {
      const personaSel = selecionarPersona({
        categoria: metaJson._classificacao?.categoria || 'post',
        genero: genderStr,
        styleCategory: estiloBase.includes('painterly') ? 'painterly' : estiloBase.includes('cinematic') ? 'rich' : 'clean',
      });
      strictProtagonist = personaSel.isNoPerson
        ? 'No human faces or figures in this image'
        : personaSel.fullPrompt || `${personaSel.prompt}, ${personaSel.clothing}`;
      persona = personaSel.id.includes('woman') || personaSel.id.includes('profissional') ? 'mulher' : personaSel.id.includes('man') ? 'homem' : 'pessoa';
      console.log(`   👤 [ImageService] Persona dinâmica: ${personaSel.id}`);
    } else if (personaMeta?.isNoPerson) {
      strictProtagonist = 'No human faces or figures in this image. Focus on symbolic objects, metaphors, or environments';
      persona = 'conceito';
      console.log(`   👤 [ImageService] Modo SEM PERSONA (categoria: ${metaJson._classificacao?.categoria || 'N/A'})`);
    } else {
      const pGender = isMale ? 'man' : 'woman';
      const pHair = isMale ? 'short brown hair' : 'brown shoulder-length hair';
      const pClothes = 'wearing neutral vintage clothing';
      strictProtagonist = `${pGender} in their 30s, ${pHair}, light skin tone, soft facial features, ${pClothes}`;
      persona = pGender === 'man' ? 'homem' : 'mulher';
    }

    // ── V3 CAROUSEL CHARACTER LOCK ───────────────────────────────────────────
    // Para carrosseis: criar character sheet ultra-detalhada para manter
    // consistência absoluta do personagem entre todos os cards
    if (!isPost && items.length > 1 && persona !== 'conceito') {
      lockedCharacterSheet = buildLockedCharacterSheet(strictProtagonist, persona);
      strictProtagonist = lockedCharacterSheet;
      console.log(`   🔒 [PersonaLock V3] Character sheet travada para ${items.length} slides`);
      console.log(`   🔒 Referência: "${lockedCharacterSheet.substring(0, 120)}..."`);

      // Injetar no narrativeState para o prompt builder
      if (metaJson._narrativeState) {
        metaJson._narrativeState._lockedCharacterSheet = lockedCharacterSheet;
      }
    }

    // -- PREPARAÇÃO LOCAL PARA AUTORES --
    let photoBuffer = null;
    let caricatureBuffer = null;
    let signatureBuffer = null;
    let useLocal = false;

    if (autor) {
        const authorPath = path.resolve('assets', 'authors', autor.toLowerCase());
        if (fs.existsSync(authorPath)) {
            const authorFiles = fs.readdirSync(authorPath);
            
            const fotoFile = authorFiles.find(f => f.toLowerCase().includes('foto'));
            const assinaturaFile = authorFiles.find(f => f.toLowerCase().includes('assinatura'));

            if (fotoFile) {
                photoBuffer = fs.readFileSync(path.join(authorPath, fotoFile));
                useLocal = true;
            }
            if (assinaturaFile) signatureBuffer = fs.readFileSync(path.join(authorPath, assinaturaFile));
        }
    }

    const authorFullNames = {
        freud: 'Sigmund Freud',
        lacan: 'Jacques Lacan',
        jung: 'Carl Gustav Jung'
    };

    // -- GRADIENTE ÚNICO PARA A RODADA --
    const gradients = [
        ['#997300', '#ffc000'], ['#226214', '#43cc25'], ['#731919', '#e52b2b'], 
        ['#3b0066', '#8b22ff'], ['#004e92', '#000428'], ['#1a1a1a', '#434343'], ['#1e3c72', '#2a5298']
    ];
    const selectedGradient = gradients[Math.floor(Math.random() * gradients.length)];

    let currentHumanCount = 0;
    const limitHumans = 10; // Allow consistent character across all slides

    // ── V3 CAROUSEL SEED: Seed fixo para consistência visual no carrossel ────
    const carouselSeed = !isPost && items.length > 1
      ? Math.floor(Math.random() * 999999)
      : null;

    // ── COMPOSITION ENGINE: Escolher composição para esta rodada ─────────────
    let composicaoBase = composicaoOverride;
    if (!composicaoBase && !useLocal) {
      const ultimasComposicoes = metaJson._ultimasComposicoes || [];
      composicaoBase = escolherComposicao({
        objetivo: metaJson.marketing?.objetivo || 'engajamento',
        emocao: metaJson.estrategia?.emocao_principal || '',
        tipoCena: '',
        ultimasComposicoes,
        humanCount: currentHumanCount,
        formato: metaJson.formatos?.[0] || 'feed',
      });

      // Salvar composição no meta para rastreamento
      metaJson._composicao = composicaoBase.meta;

      console.log('\n──────────────────────────────────────────────────');
      console.log('  🎯 COMPOSITION ENGINE — Decisão Visual');
      console.log('──────────────────────────────────────────────────');
      console.log(`  Tipo       : ${composicaoBase.tipo}`);
      console.log(`  Descrição  : ${composicaoBase.descricao}`);
      console.log(`  Personagem : ${composicaoBase.requer_personagem ? 'SIM' : 'NÃO (simbólico)'}`);
      console.log(`  Sujeito    : max ${Math.round(composicaoBase.layout.subject_max_area * 100)}% da área`);
      console.log(`  Neg. Space : min ${Math.round(composicaoBase.layout.negative_space_min * 100)}%`);
      console.log('──────────────────────────────────────────────────\n');
    }

    // Gerar variações de composição para carrossel
    const composicaoSlides = composicaoBase && !isPost
      ? variarComposicaoCarrossel(composicaoBase, items.length)
      : items.map(() => composicaoBase); // Post único: mesma composição

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const baseName = isPost ? 'post' : `slide-${i + 1}`;
        const currentSeed = Math.floor(Math.random() * 999999);
        const captionDesc = item.descricao_base || item.descricao || item.texto_principal || item.caption || item.titulo;
        
        let feedBuffer, storyBuffer;
        let success = false;

        if (useLocal) {
            console.log(`🧠 [Autor: ${autor.toUpperCase()}] Criando Card de Citação Profissional...`);
            feedBuffer = photoBuffer;
            storyBuffer = photoBuffer; 
        } else {
            // ── NOVO IMAGE PROMPT BUILDER (COM COMPOSIÇÃO) ──
            const slideComposicao = composicaoSlides[i] || composicaoBase;
            let sceneDecision = item.tipo ? definirTipoCena(item.tipo, slideComposicao) : "humano";
            if (sceneDecision === "humano" && currentHumanCount >= limitHumans) {
                sceneDecision = Math.random() > 0.5 ? "simbolico" : "ambiente";
            }
            const isHuman = sceneDecision === "humano" || sceneDecision === "silhueta";
            if (sceneDecision === "humano") currentHumanCount++;
            
            item.tipoCena = sceneDecision;
            item.isHuman = isHuman;
            
            // ── PRÉ-CÁLCULO DE LAYOUT (INTENT) PARA V3 ──
            // Definir provisoriamente para guiar o gerador de imagem a deixar a área correta livre
            const dummyCopy = { headline: item.texto_principal || item.titulo, subtexto: item.texto_secundario };
            const isAutorModeFlag = metaJson.tipo === 'autor';
            const preLayout = layoutEngine(gerarStory ? 'story' : 'feed', sceneDecision, dummyCopy, composicaoSlides[i], { slideIndex: i, isAutor: isAutorModeFlag });

            let lockedPrompt = buildPromptV3({ 
                slide: item, 
                globalState: metaJson._narrativeState || { estilo_visual: { base: estiloBase } },
                index: i,
                total: items.length,
                layoutIntent: preLayout.layoutDef,
                strictProtagonist: isHuman ? strictProtagonist : null
            });
            
            const fullPrompt = lockedPrompt;

            // ── AUTO-TRADUÇÃO PT: gerar descrição em português se ausente ────
            let ptDesc = item.descricao_visual_pt;
            if (!ptDesc && item.descricao_base) {
                // Tradução automática simplificada dos termos-chave
                ptDesc = item.descricao_base
                    .replace(/\bwoman\b/gi, 'mulher')
                    .replace(/\bman\b/gi, 'homem')
                    .replace(/\byoung\b/gi, 'jovem')
                    .replace(/\bsame\b/gi, 'mesma')
                    .replace(/\blooking at\b/gi, 'olhando para')
                    .replace(/\bholding\b/gi, 'segurando')
                    .replace(/\bsitting\b/gi, 'sentada')
                    .replace(/\bstanding\b/gi, 'em pé')
                    .replace(/\bmirror\b/gi, 'espelho')
                    .replace(/\bwindow\b/gi, 'janela')
                    .replace(/\bsoft\b/gi, 'suave')
                    .replace(/\bbright\b/gi, 'luminoso')
                    .replace(/\bbeige\b/gi, 'bege')
                    .replace(/\bbackground\b/gi, 'fundo')
                    .replace(/\blighting\b/gi, 'iluminação')
                    .replace(/\broom\b/gi, 'ambiente')
                    .replace(/\bNo human faces or figures\b/gi, 'Sem rosto humano — foco em objetos/metáforas')
                    .replace(/\bsymbolic object\b/gi, 'objeto simbólico')
                    .replace(/\bbroken\b/gi, 'quebrado')
                    .replace(/\bcandle\b/gi, 'vela')
                    .replace(/\bchair\b/gi, 'cadeira')
                    .replace(/\bempty\b/gi, 'vazio')
                    .replace(/\bsilhouette\b/gi, 'silhueta');
            }

            // ── RESUMO DO PROMPT EM PORTUGUÊS (composição, não restrições) ───
            const compTipo = slideComposicao?.tipo || 'auto';
            const compDesc = slideComposicao?.descricao || '';
            const compPersonagem = slideComposicao?.requer_personagem ? 'COM persona' : 'SEM persona';
            const compMaxArea = slideComposicao?.layout?.subject_max_area
                ? `${Math.round(slideComposicao.layout.subject_max_area * 100)}%`
                : 'auto';
            const compNegSpace = slideComposicao?.layout?.negative_space_min
                ? `${Math.round(slideComposicao.layout.negative_space_min * 100)}%`
                : 'auto';
            const sceneEN = item.descricao_base || 'N/A';

            console.log('\n==================================================');
            console.log(`       🎨 VISUAL DO SLIDE ${i + 1}/${items.length}`);
            console.log('==================================================');
            console.log(`🖼️  EN : ${sceneEN}`);
            console.log(`🖼️  PT : ${ptDesc || 'N/A'}`);
            console.log('──────────────────────────────────────────────────');
            console.log(`📐 Composição : ${compTipo} — ${compDesc}`);
            console.log(`👤 Persona    : ${compPersonagem} (máx ${compMaxArea} da imagem)`);
            const hasLock = (metaJson._narrativeState?.persona_locked || (!isPost && items.length > 1)) && isHuman && !personaMeta?.isNoPerson;
            if (hasLock) {
                console.log(`🔒 Trava Ativa : Usando Persona Consistente`);
            }
            console.log(`🌿 Neg. Space : mín ${compNegSpace}`);
            console.log(`🎨 Estilo     : ${estiloBase}`);
            console.log(`🎬 Cena       : ${sceneDecision}`);
            console.log('──────────────────────────────────────────────────');
            console.log(`📝 Principal  : "${(item.texto_principal || item.titulo || '').substring(0, 60)}"`);
            if (item.texto_secundario) {
                console.log(`📝 Secundário : "${item.texto_secundario.substring(0, 60)}"`);
            }
            if (item.frase_final || item.cta) {
                console.log(`📝 CTA        : "${(item.frase_final || item.cta).substring(0, 60)}"`);
            }
            console.log('==================================================');
            
            let finalPrompt = fullPrompt;
            let userSkipped = false;
            if (config.OPENAI_API_KEY) {
                const decision = await askQuestion('   🤔 Aprovar este prompt? [S]im / [N]ão / [E]ditar: ');

                let finalPrompt = fullPrompt;
                if (decision.toLowerCase() === 'n') {
                    console.log('   ⏩ Pulando geração de imagem para este item (usará fundo com gradiente)...');
                    userSkipped = true;
                } else {
                    if (decision.toLowerCase() === 'e') {
                        finalPrompt = await askQuestion('   ✍️ Digite o novo prompt (em inglês): ');
                    }

                    let attempt = 1;
                    const maxAttempts = 3;
                    let currentPrompt = finalPrompt;
                    let correctionRound = 0;
                    const maxCorrectionRounds = 2;

                    while (!success && attempt <= maxAttempts) {
                        try {
                            console.log(`   └─ [OpenAI] Gerando com DALL-E 3 (Tentativa ${attempt}/${maxAttempts}${correctionRound > 0 ? `, Correção #${correctionRound}` : ''})...`);
                            // Geramos apenas UMA imagem para garantir consistência e economizar créditos
                            const imageUrl = await generateOpenAIImage(currentPrompt, "1024x1024");

                            const buffer = await downloadImageBuffer(imageUrl);
                            
                            if (buffer && buffer.length > 5000) {
                                // Validação ESTRITA: Tentar decodificar a imagem antes de dar success
                                try {
                                    await loadImage(buffer);
                                    
                                    // ── POST SCORER: Análise de Qualidade (0-100) ──────────
                                    const { quickScore, passesPreFilter } = quickScoreLocal(buffer);
                                    
                                    if (!passesPreFilter) {
                                        console.warn(`   ⚠️ Pré-filtro local falhou (score: ${quickScore}). Re-tentando...`);
                                        attempt++;
                                        continue;
                                    }

                                    // Vision AI Scoring (somente se temos API disponível)
                                    let scoreResult = null;
                                    if (config.GOOGLE_API_KEY || config.OPENROUTER_API_KEY) {
                                        scoreResult = await scorePost(buffer, { estilo: estiloBase, tipo: item.tipo });
                                    }

                                    // ── AUTO-CORRECTION LOOP ───────────────────────────────
                                    // Só corrige se Vision AI REAL analisou (não fallback)
                                    if (scoreResult && scoreResult.verdict !== 'APPROVED' && scoreResult.verdict !== 'SKIP' && correctionRound < maxCorrectionRounds) {
                                        const { correctedPrompt, corrections, shouldRetry } = buildCorrectionPrompt(currentPrompt, scoreResult);

                                        if (shouldRetry && corrections.length > 0) {
                                            console.log(`   🔄 Score ${scoreResult.totalScore}/100 — Ativando auto-correção (round ${correctionRound + 1}/${maxCorrectionRounds})...`);
                                            currentPrompt = correctedPrompt;
                                            correctionRound++;
                                            await new Promise(r => setTimeout(r, 2000));
                                            continue;
                                        }
                                    }

                                    // ── RESULTADO FINAL ────────────────────────────────────
                                    feedBuffer = buffer;
                                    storyBuffer = buffer; // Consistência Story/Feed
                                    success = true;
                                    item.prompt_imagem_final = currentPrompt;
                                    attachGenerationMetadata(item, currentPrompt, "dall-e");
                                    
                                    if (scoreResult) {
                                        console.log(`   ✅ Sucesso com OpenAI DALL-E 3 (Score: ${scoreResult.totalScore}/100 — ${scoreResult.verdict})`);
                                        // Salvar score no item para referência no meta.json
                                        item._qualityScore = scoreResult;
                                    } else {
                                        console.log(`   ✅ Sucesso com OpenAI DALL-E 3 (Imagem validada, scoring indisponível)`);
                                    }
                                } catch (imgErr) {
                                    console.warn(`   ⚠️ Buffer baixado não é uma imagem válida. Re-tentando...`);
                                }
                            }
                        } catch (err) {
                            console.warn(`   ⚠️ OpenAI falhou na tentativa ${attempt}: ${err.message}`);
                            const msg = err.message.toLowerCase();
                            if (msg.includes('content') || msg.includes('safety')) {
                                console.log(`   🚨 Bloqueio de Safety System detectado. Pulando para Fallback.`);
                                break;
                            }
                        }
                        if (!success) {
                            await new Promise(r => setTimeout(r, 2000));
                            attempt++;
                        }
                    }
                }
            }

            // -- PRIORIDADE 2: POLLINATIONS (FREE FALLBACK) --
            if (!success && !userSkipped) {
                const seed = Math.floor(Math.random() * 1000000);
                const fallbackPrompt = item._semanticScene ? `Editorial quality, ${item._semanticScene.substring(0, 400)}` : `Editorial minimalist illustration, same ${persona} 30s, ${captionDesc.split('.')[0].replace(/[^\w\s]/gi, '').substring(0, 100)}, soft beige background, bright soft lighting, clean composition, instagram premium aesthetic`;
                const basePrompt = finalPrompt || fallbackPrompt;
                const models = ['turbo', 'flux', 'midjourney', 'pixart', 'dreamshaper'];

                for (const model of models) {
                    if (success) break;
                    try {
                        console.log(`   └─ [Pollinations] Tentando modelo: ${model}...`);
                        const feedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=1024&height=1024&model=${model}&seed=${seed}&nologo=true`;
                        const storyUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=1024&height=1792&model=${model}&seed=${seed}&nologo=true`;

                        const fBuffer = await downloadImageBuffer(feedUrl);
                        const sBuffer = await downloadImageBuffer(storyUrl);

                        if (fBuffer.length > 5000) {
                            feedBuffer = fBuffer;
                            storyBuffer = sBuffer;
                            success = true;
                            item.prompt_imagem_final = basePrompt;
                            attachGenerationMetadata(item, basePrompt, `pollinations-${model}`);
                            console.log(`   ✅ Sucesso com Pollinations: ${model}`);
                        }
                    } catch (err) {
                        console.warn(`   ⚠️ Modelo ${model} falhou: ${err.message}`);
                    }
                }
            }

            // -- PRIORIDADE 3: MODO DE EMERGÊNCIA (GRADIENTE) --
            if (!success) {
                console.error('🚨 [IMAGENS] Todos os provedores falharam. Usando Modo de Emergência...');
                feedBuffer = null; 
                storyBuffer = null;
            }
        }

        // ANALISE E OVERLAY (Sincronizado)
        let itemStyling;
        let visionData = null;
        let finalLayoutDef = item._layoutDef || metaJson._layoutDef || null;
        let finalLayoutId = item._layoutId || metaJson._layoutId || 'center_text';

        if (useLocal) {
            itemStyling = {
                authorName: authorFullNames[autor.toLowerCase()] || autor,
                gradientColors: selectedGradient 
            };
        } else if (!success) {
            // Caso de falha total nas imagens: usa gradiente
            itemStyling = { gradientColors: selectedGradient };
        } else {
            // 1. Extração de características base da imagem
            itemStyling = await analyzeImageForText(feedBuffer, captionDesc);
            if (!itemStyling.gradientColors) itemStyling.gradientColors = selectedGradient;

            // 2. INTEGRAÇÃO V3: Detecção de Rosto e Layout-Aware Overlay
            const faces = await detectFaces(feedBuffer, 1080, 1440);
            visionData = {
                faces: faces.length > 0 || itemStyling.faces, // Combina as duas fontes
                facesBoxes: faces,
                safeZone: itemStyling.safeZone,
                imgW: 1080,
                imgH: 1440,
                sceneMetadata: {
                    lighting: item._scene?.lighting || 'soft',
                    conflict_visual: item._scene?.conflict_visual,
                    subjectPosition: composicaoSlides[i]?.layout || null
                }
            };

            // 3. Recalcular layout usando Vision Data
            const copy = { headline: item.texto_principal || item.titulo, subtexto: item.texto_secundario };
            const isAutorModeFlag = metaJson.tipo === 'autor';
            const v3Layout = layoutEngine(gerarStory ? 'story' : 'feed', item.tipoCena, copy, composicaoSlides[i], { slideIndex: i, isAutor: isAutorModeFlag }, visionData);
            
            finalLayoutDef = v3Layout.layoutDef;
            finalLayoutId = v3Layout.layoutId;
        }

        // ── globalSeed para consistência no carrossel ──
        const globalSeed = items[0] ? (items[0].texto_principal || items[0].titulo || '').length : 123;

        // faces detectadas (bounding boxes) → usadas pelo overlayer para face-aware positioning
        const detectedFaceBoxes = visionData?.facesBoxes || [];

        const metaItem = { 
            index: i, 
            total: items.length, 
            isLast: i === items.length - 1,
            authorMode: !!autor,
            layoutId: finalLayoutId,
            layoutDef: finalLayoutDef,
            globalSeed: globalSeed,
            faces: detectedFaceBoxes,
        };

        // ── Salvar imagens localmente + upload Cloudinary ────────────────────
        let feedFilePath = null;
        let storyFilePath = null;

        if (gerarFeed) {
            const feedFinal = await overlayTextOnImage(feedBuffer, item, 1080, 1440, itemStyling, signatureBuffer, metaItem);
            feedFilePath = path.join(feedDir, `${baseName}.png`);
            fs.writeFileSync(feedFilePath, feedFinal);
        }

        if (gerarStory) {
            const storyFinal = await overlayTextOnImage(storyBuffer, item, 1080, 1920, itemStyling, signatureBuffer, metaItem);
            storyFilePath = path.join(storyDir, `${baseName}.png`);
            fs.writeFileSync(storyFilePath, storyFinal);
        }

        const formatLabel = [gerarFeed && 'Feed', gerarStory && 'Story'].filter(Boolean).join(' + ');
        console.log(`✅ ${useLocal ? 'Author Mode' : 'AI Generation'} finalizado para ${baseName} (${formatLabel})!`);

        // ── GATE DE APROVAÇÃO DE IMAGEM POR SLIDE ────────────────────────────
        // Permite refazer a imagem individual sem avançar no pipeline
        if (!useLocal && success && config.OPENAI_API_KEY) {
            let imageApproved = false;
            while (!imageApproved) {
                const imgDecision = await askQuestion(`   🖼️  Aprovar imagem de ${baseName}? [S]im / [R]efazer / [P]ular: `);
                const dec = (imgDecision || 's').toLowerCase().trim();

                if (dec === 'r') {
                    console.log(`   🔄 Regerando imagem para ${baseName}...`);
                    // Re-run DALL-E generation for this slide
                    const slideComposicaoRetry = composicaoSlides[i] || composicaoBase;
                    let sceneRetry = item.tipo ? definirTipoCena(item.tipo, slideComposicaoRetry) : "humano";
                    const dummyCopyRetry = { headline: item.texto_principal || item.titulo, subtexto: item.texto_secundario };
                    const preLayoutRetry = layoutEngine(gerarStory ? 'story' : 'feed', sceneRetry, dummyCopyRetry, slideComposicaoRetry, { slideIndex: i });

                    let retryPrompt = buildPromptV3({
                        slide: item,
                        globalState: metaJson._narrativeState || { estilo_visual: { base: estiloBase } },
                        index: i,
                        total: items.length,
                        layoutIntent: preLayoutRetry.layoutDef,
                        strictProtagonist: (sceneRetry === 'humano' || sceneRetry === 'silhueta') ? strictProtagonist : null
                    });

                    let retrySuccess = false;
                    for (let retryAttempt = 1; retryAttempt <= 2; retryAttempt++) {
                        try {
                            console.log(`   └─ [OpenAI] Regerando DALL-E 3 (Tentativa ${retryAttempt}/2)...`);
                            const retryUrl = await generateOpenAIImage(retryPrompt, "1024x1024");
                            const retryBuffer = await downloadImageBuffer(retryUrl);
                            if (retryBuffer && retryBuffer.length > 5000) {
                                await loadImage(retryBuffer); // Validate
                                feedBuffer = retryBuffer;
                                storyBuffer = retryBuffer;
                                retrySuccess = true;
                                item.prompt_imagem_final = retryPrompt;
                                attachGenerationMetadata(item, retryPrompt, "dall-e-retry");
                                console.log(`   ✅ Imagem regerada com sucesso!`);

                                // Re-analyze and re-overlay (V3)
                                const retryStyling = await analyzeImageForText(feedBuffer, captionDesc);
                                if (!retryStyling.gradientColors) retryStyling.gradientColors = selectedGradient;

                                const retryFaces = await detectFaces(feedBuffer, 1080, 1440);
                                const retryVisionData = {
                                    faces: retryFaces.length > 0 || retryStyling.faces,
                                    facesBoxes: retryFaces,
                                    safeZone: retryStyling.safeZone,
                                    imgW: 1080,
                                    imgH: 1440,
                                    sceneMetadata: {
                                        lighting: item._scene?.lighting || 'soft',
                                        conflict_visual: item._scene?.conflict_visual,
                                        subjectPosition: composicaoSlides[i]?.layout || null
                                    }
                                };

                                const retryCopy = { headline: item.texto_principal || item.titulo, subtexto: item.texto_secundario };
                                const v3RetryLayout = layoutEngine(gerarStory ? 'story' : 'feed', item.tipoCena, retryCopy, composicaoSlides[i], {}, retryVisionData);
                                
                                const metaItemRetry = {
                                    ...metaItem,
                                    layoutId: v3RetryLayout.layoutId,
                                    layoutDef: v3RetryLayout.layoutDef
                                };

                                if (gerarFeed) {
                                    const feedRetry = await overlayTextOnImage(feedBuffer, item, 1080, 1440, retryStyling, signatureBuffer, metaItemRetry);
                                    fs.writeFileSync(path.join(feedDir, `${baseName}.png`), feedRetry);
                                }
                                if (gerarStory) {
                                    const storyRetry = await overlayTextOnImage(storyBuffer, item, 1080, 1920, retryStyling, signatureBuffer, metaItemRetry);
                                    fs.writeFileSync(path.join(storyDir, `${baseName}.png`), storyRetry);
                                }

                                console.log(`   ✅ Imagem regerada e salva para ${baseName}!`);
                                retrySuccess = true;
                                break;
                            }
                        } catch (retryErr) {
                            console.warn(`   ⚠️ Falha na regeração (${retryAttempt}/2): ${retryErr.message}`);
                        }
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    if (!retrySuccess) {
                        console.log(`   ⚠️ Não foi possível regerar. Mantendo imagem anterior.`);
                        imageApproved = true; // Sai do loop para não travar
                    }
                    // Se regerou com sucesso, volta ao while para nova aprovação
                } else {
                    // 's', 'p', ou qualquer outra coisa = aprovar e avançar
                    imageApproved = true;
                    if (dec === 's') {
                        console.log(`   ✅ Imagem de ${baseName} aprovada.`);
                    } else {
                        console.log(`   ⏩ Imagem de ${baseName} mantida (pulada).`);
                    }
                }
            }
        }

        // ── Cloudinary Upload (após salvar localmente E aprovar) ─────────────
        // Prioriza Feed para a URL pública; fallback para Story se Feed não existir.
        const uploadPath = feedFilePath || storyFilePath;
        if (uploadPath && process.env.CLOUDINARY_CLOUD_NAME) {
            const tipoPost  = metaJson.tipo || 'post';
            // Suporte multi-tenant: lê CLOUDINARY_CLIENTE do .env (opcional)
            const cliente   = process.env.CLOUDINARY_CLIENTE || null;
            const outputFolderName = path.basename(outputDir);
            const cloudResult = await uploadImage(uploadPath, tipoPost, cliente, outputFolderName);

            // Padronizar campos: image_path (local) + image_url + cloudinary_id
            item.image_path    = path.relative(process.cwd(), uploadPath).replace(/\\/g, '/');
            item.image_url     = cloudResult.url;        // null se upload falhou
            item.cloudinary_id = cloudResult.public_id;  // null se upload falhou

            if (cloudResult.url) {
                console.log(`   🔗 [Cloudinary] URL pública (Feed): ${cloudResult.url}`);
            } else {
                console.log(`   ⚠️  [Cloudinary] Upload falhou — imagem disponível apenas localmente: ${item.image_path}`);
            }
        } else if (uploadPath) {
            // Cloudinary não configurado: registra apenas o caminho local
            item.image_path    = path.relative(process.cwd(), uploadPath).replace(/\\/g, '/');
            item.image_url     = null;
            item.cloudinary_id = null;
        }
    }
}

async function downloadImageBuffer(url, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept': 'image/png,image/jpeg,image/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://pollinations.ai/'
                }
            });

            const contentType = response.headers.get('content-type');

            if (!response.ok) {
                if ((response.status === 500 || response.status === 503 || response.status === 429) && i < retries - 1) {
                    console.log(`⚠️ Erro ${response.status} (${contentType}). Tentando novamente em 3s... (${i + 1}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
                throw new Error(`[DOWNLOAD] Error ${response.status}: ${response.statusText}`);
            }

            if (contentType && !contentType.includes('image')) {
                console.warn(`⚠️ Conteúdo inválido recebido: ${contentType}. Esperado: imagem.`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (e) {
            if (i === retries - 1) throw new Error(`[DOWNLOAD] Falha após ${retries} tentativas: ${e.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

async function generateOpenAIImage(prompt, size = "1024x1024") {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: size,
            quality: "standard"
        })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(`[OpenAI] ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].url;
}

async function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}
