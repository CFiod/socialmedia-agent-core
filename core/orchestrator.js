import path from 'path';
import readline from 'readline';
import { generateContent } from '../services/contentService.js';
import { getStyleWithAntiRepetition } from '../services/styleEngine.js';
import { generateAndSaveImages } from '../services/imageService.js';
import { generatePreview } from '../utils/previewGenerator.js';
import { ensureDir, saveJSON } from '../utils/fileManager.js';
import { formatTimestamp } from '../utils/dateHelper.js';
import { saveToMemory, captureEdit, getUltimasComposicoes, getRecentHumanCount } from '../services/memoryService.js';
import { validateAndCorrectSlides, validateCaption } from '../services/slideValidator.js';
import { normalizarOutput } from '../agents/content_classifier.js';
import { scoreContent } from '../services/postScorer.js';
import { artDirectionEngine } from '../agents/art_direction_engine.js';
import { getSinglePostEmotion, getEmotionArc } from '../agents/scene_decision_engine.js';
import { buildSceneFromCopy } from '../agents/semantic_scene_builder.js';

// ─── Helper de input ──────────────────────────────────────────────────────────
function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

// ─── Etapa 1.5: Aprovação de COPY + CAPTION ──────────────────────────────────
async function approveCopy(slides, originalCaptionObj) {
    const sep  = '─'.repeat(60);
    const sep2 = '═'.repeat(60);

    console.log(`\n${sep2}`);
    console.log('  ✍️  ETAPA 1.5 — APROVAÇÃO DE COPY');
    console.log(sep2);
    console.log('  Revise cada slide. [S]im • [E]ditar • [P]ular (mantém) • [D]escartar\n');

    const approvedSlides = [];
    let captionObj = originalCaptionObj || { texto: '', hashtags: [] };
    let caption = typeof captionObj === 'object' ? (captionObj.texto || '') : (captionObj || '');

    // ── Slides ──────────────────────────────────────────────────────────────
    for (let i = 0; i < slides.length; i++) {
        const slide = { ...slides[i] };

        console.log(sep);
        console.log(`  📄 SLIDE ${i + 1}/${slides.length}`);
        console.log(sep);
        console.log(`  Principal  : ${slide.texto_principal}`);
        console.log(`  Secundário : ${slide.texto_secundario}`);
        console.log(`  Destaques  : [${(slide.destaques || []).join(', ')}]`);
        console.log(`  Visual     : ${slide.descricao_base}`);
        console.log(sep);

        const dec = await askQuestion('  Aprovar? [S/E/P/D]: ');

        if (dec.toLowerCase() === 'p') {
            console.log('  ⏩ Slide pulado — mantido sem edição.\n');
            approvedSlides.push(slide); // Mantém o slide original sem editar
            continue;
        }

        if (dec.toLowerCase() === 'd') {
            console.log('  ❌ Slide descartado. A requisição foi REJEITADA e o pipeline será finalizado.\n');
            return null; // Sinaliza rejeição total
        }

        if (dec.toLowerCase() === 'e') {
            const campos = [
                { key: 'texto_principal',  label: 'Principal' },
                { key: 'texto_secundario', label: 'Secundário' },
                { key: 'descricao_base', label: 'Visual (EN)' },
            ];
            for (const c of campos) {
                const novo = await askQuestion(`  ${c.label} [atual: "${slide[c.key]}"]\n  Novo (Enter = manter): `);
                if (novo && novo !== slide[c.key]) {
                    captureEdit(c.key, slide[c.key], novo);
                    slide[c.key] = novo;
                }
            }

            // ── 🆕 Editar Destaques ─────────────────────────────────────────
            const destaquesAtuais = (slide.destaques || []).join(', ');
            const novosDestaques = await askQuestion(`  Destaques [atual: "${destaquesAtuais}"]\n  Novos (separados por vírgula, Enter = manter): `);
            if (novosDestaques && novosDestaques.trim() !== destaquesAtuais) {
                const antes = destaquesAtuais;
                slide.destaques = novosDestaques.split(',').map(d => d.trim()).filter(Boolean);
                captureEdit('destaques', antes, novosDestaques.trim());
                console.log(`  ✅ Destaques atualizados: [${slide.destaques.join(', ')}]`);
            }
        }

        approvedSlides.push(slide);
        console.log(`  ✅ Slide ${i + 1} aprovado.\n`);
    }

    // ── Caption ──────────────────────────────────────────────────────────────
    console.log(`\n${sep}`);
    console.log('  📝 LEGENDA (CAPTION)');
    console.log(sep);
    const preview = (caption || '(vazia)').substring(0, 300);
    console.log(`  ${preview}${caption && caption.length > 300 ? '\n  [...]' : ''}`);
    console.log(sep);

    const captionDec = await askQuestion('  Aprovar caption? [S]im / [E]ditar: ');
    if (captionDec.toLowerCase() === 'e') {
        const nova = await askQuestion('  Nova caption (cole o texto e pressione Enter): ');
        if (nova && nova !== caption) {
            captureEdit('caption', caption, nova);
            caption = nova;
        }
    }
    console.log('  ✅ Caption aprovada.\n');

    if (typeof captionObj === 'object') {
        captionObj.texto = caption;
    } else {
        captionObj = caption;
    }

    return { slides: approvedSlides, captionObj };
}

// ─── Pipeline Principal ───────────────────────────────────────────────────────
export async function runPipeline(options) {
    let { tipo, tema, qtd, dataBase, autor, canal } = options;
    const SEP = '\n' + '='.repeat(100) + '\n';
    
    console.log(`\n🚀 Iniciando pipeline para [${tipo.toUpperCase()}]: "${tema}"`);
    if (autor) console.log(`🧠 Autor Selecionado: ${autor.toUpperCase()}`);
    console.log(`📅 Data Agendada: ${dataBase.toLocaleString()}`);

    try {
        // ── STAGE 0: Configuração de Contexto ───────────────────────────────
        if (!canal && !autor) {
            console.log(SEP);
            console.log('🎛️  ETAPA 0 — TIPO DE DISTRIBUIÇÃO');
            console.log('  [1] Post Orgânico (Engajamento / Topo de Funil)');
            console.log('  [2] Campanha ADS (Conversão / Fundo de Funil)');
            const escolhaCanal = await askQuestion('\nEscolha [1] ou [2] (Enter = 1): ');
            canal = escolhaCanal === '2' ? 'pago' : 'organico';
        } else if (!canal) {
            canal = 'organico';
        }

        const marketingContext = {
            canal: canal,
            objetivo: canal === 'pago' ? 'conversao' : 'engajamento',
            nivel_funil: canal === 'pago' ? 'fundo' : 'topo'
        };

        // ── COMPOSITION ENGINE: Carregar histórico de composições da memória ─────
        const ultimasComposicoes = getUltimasComposicoes(5);
        const humanCount = getRecentHumanCount(5);

        // ── V5: Emotion State para propagação ────────────────────────────
        const emotionState = getSinglePostEmotion(marketingContext.objetivo);

        const estilo = getStyleWithAntiRepetition({
            marketing: marketingContext,
            estrategia: { emocao_principal: tema, emocao: emotionState?.label || '' }
        });

        // ── STAGE 1: Gerar Conteúdo com Retry automático ─────────────────────
        console.log(SEP);
        console.log(`🎨 Estilo pré-selecionado pelo StyleEngine: ${estilo.base} (${estilo.grupo})`);
        console.log('🧠 STAGE 1 — Gerando conteúdo com o Prompt Mestre...');

        const MAX_RETRIES = 3;
        let dataJson;
        let imageItems = [];
        let tentativa = 0;

        while (tentativa < MAX_RETRIES) {
            tentativa++;
            if (tentativa > 1) {
                console.log(`\n🔄 [HUMANIZER ENGINE] Tentativa ${tentativa}/${MAX_RETRIES} — Refazendo conteúdo...\n`);
            }

            dataJson = await generateContent(tipo, tema, qtd, autor, marketingContext, estilo.base);

            // ── Normalização V2: slides[], modo fix ─────────────────────────────
            dataJson = normalizarOutput(dataJson);

            // Alerta de caption com placeholder
            let legendaTxt = dataJson.legenda ? dataJson.legenda.texto : dataJson.caption;
            if (dataJson.conteudo && dataJson.conteudo.legenda) legendaTxt = dataJson.conteudo.legenda.texto;
            
            if (legendaTxt) {
                const captionOk = validateCaption(legendaTxt, tema);
                if (!captionOk) {
                    console.log('\n  ⚠️  [Validator] Caption parece ser um template não substituído.');
                    console.log('  → Você poderá editá-la na Etapa 1.5.\n');
                }
            }

            // ── STAGE 1.1: Validador Adaptativo ─────────────────────────────
            if (tipo === 'post') {
                // conteudo pode vir como objeto OU array (LLM inconsistente)
                if (Array.isArray(dataJson.conteudo)) {
                    imageItems = [dataJson.conteudo[0]]; // POST = só 1 item
                } else if (dataJson.conteudo) {
                    imageItems = [dataJson.conteudo];
                } else {
                    imageItems = [];
                }
            } else {
                imageItems = dataJson.slides || (Array.isArray(dataJson.conteudo) ? dataJson.conteudo : (dataJson.conteudo ? [dataJson.conteudo] : []));
            }

            if (imageItems.length === 0) throw new Error('Conteúdo da IA está vazio ou inválido.');

            if (!autor && tipo === 'carrossel') {
                const { slides: validados, isValid, issues } = validateAndCorrectSlides(imageItems);
                imageItems = validados;
                dataJson.slides = imageItems;

                if (!isValid) {
                    console.log(`\n  🚨 [HUMANIZER ENGINE] Conteúdo REJEITADO na tentativa ${tentativa}/${MAX_RETRIES}:`);
                    issues.forEach(iss => {
                        console.log(`     → Slide ${iss.slide} [${iss.tipo}]: ${iss.detalhe}`);
                    });

                    if (tentativa < MAX_RETRIES) {
                        console.log(`  🔄 Iniciando regeneração automática...`);
                        continue; // volta ao while
                    } else {
                        console.log(`\n  ❌ [HUMANIZER ENGINE] Máx. tentativas atingido (${MAX_RETRIES}x) sem sucesso.`);
                        console.log(`  → A requisição foi REJEITADA e o pipeline será finalizado.\n`);
                        return; // FINALIZA A REQUISIÇÃO
                    }
                } else {
                    console.log(`\n  ✅ [HUMANIZER ENGINE] Conteúdo APROVADO na tentativa ${tentativa}/${MAX_RETRIES}.`);
                }
            }

            break; // sai do loop (aprovado ou post/autor que não valida)
        }

        // ── STAGE 1.2: Content Scoring V2 (auto-block < 70) ──────────────────
        const contentScore = scoreContent({
            slides: imageItems,
            classificacao: dataJson._classificacao || null,
            variacao: dataJson._variacao || null,
            categoria: dataJson._classificacao?.categoria || tipo,
        });
        if (contentScore && !contentScore.passed) {
            console.log(`\n  ⚠️ [ContentScorer] Score ${contentScore.nota_final}/100 — conteúdo pode ser melhorado.`);
            console.log('  → Você poderá editar na Etapa 1.5.\n');
        }

        // ── STAGE 1.3: Art Direction Engine (Substituindo descrições genéricas) ──
        if (!autor) {
            console.log(SEP);
            console.log('  🎬 [ArtDirectionEngine] Direcionando visual de todos os slides...');
            await Promise.all(imageItems.map(async (slide) => {
                const ad = await artDirectionEngine({
                    copy: { headline: slide.texto_principal, subtexto: slide.texto_secundario },
                    estrategia: dataJson.estrategia || { emocao: tema },
                    modo: tipo,
                    category: dataJson._classificacao?.categoria || tipo
                });
                slide.descricao_visual = ad.scene_construction.ambiente + ". " + ad.symbol_mapping;
                slide.artDirection = ad;
            }));
            console.log('  ✅ [ArtDirectionEngine] Direção visual concluída.');
        }

        // ── STAGE 1.4: 🔥 SEMANTIC SCENE BUILDER (Copy → Cena Visual) ────────────
        // Princípio: a imagem NASCE da copy, não do tema.
        if (!autor) {
            console.log('  🧠 [SemanticScene] Gerando cenas visuais a partir da COPY...');
            for (const slide of imageItems) {
                const sceneResult = buildSceneFromCopy({
                    texto: slide.texto_principal || slide.titulo || '',
                    subtexto: slide.texto_secundario || '',
                    emocao: emotionState?.label || dataJson.estrategia?.emocao_principal || '',
                    tema: tema,
                    estilo: estilo.base,
                });
                // Armazena a análise semântica no slide para o novo prompt engine
                slide._semanticAnalysis = sceneResult.analysis;
            }
            console.log('  ✅ [SemanticScene] Cenas visuais copy-driven geradas.');
        }

        // ── Criar diretório de output (DRAFT) ────────────────────────────────
        const execucaoId = `${formatTimestamp(dataBase)}_${tipo}`;
        const outputDir  = path.resolve('output', execucaoId);
        ensureDir(outputDir);
        console.log(`📂 Draft criado: ${execucaoId}`);

        const metaJson = {
            tipo,
            autor,
            status: 'draft',
            qtd_slides: tipo === 'post' ? 1 : imageItems.length,
            data_agendada: dataBase.toISOString(),
            formatos: ['feed', 'story'],
            resolucoes: { feed: '1080x1440', story: '1080x1920' },
            // ── COMPOSITION ENGINE: Dados para anti-repetição e rastreamento ────
            marketing: marketingContext,
            estrategia: dataJson.estrategia || {},
            _ultimasComposicoes: ultimasComposicoes,
            _humanCount: humanCount,
            _classificacao: dataJson._classificacao || null,
            _persona: dataJson._persona || null,
            _variacao: dataJson._variacao || null,
        };

        if (tipo === 'carrossel') {
            dataJson._narrativeState = {
                seed: `${tipo}_${Math.random().toString(36).substring(7)}`,
                persona_locked: true,
                visual_identity: dataJson._persona || {
                    genero: "woman",
                    idade_aparente: 30,
                    pele: "light brown",
                    cabelo: "dark wavy",
                    roupa_base: "neutral casual"
                },
                progression: "emocional_progressiva",
                estilo_visual: estilo
            };
        }

        saveJSON(path.join(outputDir, 'data.json'), dataJson);
        saveJSON(path.join(outputDir, 'meta.json'), metaJson);

        if (!autor) {
            // conteudo pode ser array ou objeto — extrair legenda com segurança
            const conteudoObj = Array.isArray(dataJson.conteudo) ? dataJson.conteudo[0] : dataJson.conteudo;
            let legendaRoot = dataJson.legenda || (conteudoObj ? conteudoObj.legenda : null) || dataJson.caption;
            const result = await approveCopy(imageItems, legendaRoot);
            if (!result) {
                console.log('\n⚠️  Conteúdo não aprovado ou descartado. Pipeline cancelado.');
                return;
            }
            const { slides: slidesAprovados, captionObj: captionAprovada } = result;

            imageItems       = slidesAprovados;
            dataJson.slides  = imageItems;
            
            if (dataJson.legenda) dataJson.legenda = captionAprovada;
            else if (dataJson.conteudo && dataJson.conteudo.legenda) dataJson.conteudo.legenda = captionAprovada;
            else dataJson.caption = captionAprovada;

            saveJSON(path.join(outputDir, 'data.json'), dataJson);
        }

        // ── STAGE 2: Geração de Imagens ───────────────────────────────────────
        console.log(SEP);
        console.log('🎨 STAGE 2 — Gerando imagens...');
        const currentStyleBase = dataJson.estilo_visual?.base || estilo.base;
        await generateAndSaveImages(outputDir, metaJson, imageItems, autor, currentStyleBase, dataJson.publico, tema);
        saveJSON(path.join(outputDir, 'data.json'), dataJson);

        // ── STAGE 3: Aprovação Final → Memória ──────────────────────────────
        console.log(SEP);
        const finalDec = await askQuestion('🏁 STAGE 3 — Aprovação FINAL: Salvar na memória? [S]im / [N]ão: ');

        if (finalDec.toLowerCase() === 's') {
            metaJson.status = 'approved';
            saveJSON(path.join(outputDir, 'meta.json'), metaJson);
            saveToMemory(dataJson, metaJson);
            console.log('✅ Post APROVADO e salvo na memória principal.');
        } else {
            console.log('⏸️  Post mantido como DRAFT. Memória não atualizada.');
        }

        // ── Preview HTML ─────────────────────────────────────────────────────
        console.log(SEP);
        console.log('🖥️  Gerando preview HTML...');
        generatePreview(outputDir, metaJson, dataJson);

        console.log(SEP);
        console.log(`✅ Pipeline concluído! Output: /output/${execucaoId}`);
        console.log('='.repeat(100));

    } catch (error) {
        console.error(`❌ Erro no pipeline para o tema "${tema}":`, error.message);
    }
}
