import path from 'path';
import readline from 'readline';
import { runPipeline } from './core/orchestrator.js';
import { readLines, ensureDir, saveJSON } from './utils/fileManager.js';
import { getBaseDate, addDays, formatTimestamp } from './utils/dateHelper.js';
import { gerarPostCompleto } from './agents/growth_orchestrator.js';
import { generateAndSaveImages } from './services/imageService.js';
import { generatePreview } from './utils/previewGenerator.js';
import { saveToMemory } from './services/memoryService.js';
// ── SaaS Layer (V6) ─────────────────────────────────────────────────────────
import { generateContent as generateContentSaaS } from './services/generationService.js';

// ── Helper de input ──────────────────────────────────────────────────────────
function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans.trim()); }));
}

function showHelp() {
    console.log(`
    ==================================================================
    🚀 SOCIAL MEDIA AGENT - SISTEMA DE AUTOMAÇÃO (V6.0 — SaaS Ready)
    ==================================================================

    1️⃣ MODOS DE GERAÇÃO:
    ------------------------------------------------------------------
    post        : Gera 1 arte única (Feed 3:4 e Story 9:16).
    carrossel   : Gera uma sequência de 7+ slides.
    growth      : 🔥 GROWTH ENGINE — Gera post visual completo
                  com decisões automáticas de marketing.
    autor       : ✍️  MODO AUTOR — Frase viral + tipografia forte,
                  SEM persona humana. Pensamento/reflexão.

    2️⃣ COMANDOS DE EXEMPLO:
    ------------------------------------------------------------------
    🔹 GERAÇÃO SIMPLES (IA Completa):
    node index.js post --tema="Complexo de Édipo"
    node index.js carrossel --tema="Narcisismo Digital" --qtd=7

    🔥 GROWTH ENGINE (Decisão Automática — SEM TEMA):
    node index.js growth
    node index.js growth --tema="Ansiedade"
    node index.js growth --lote=7
    node index.js growth --lote=30 --estilo="cinematic_soft"

    ✍️  MODO AUTOR (Frase viral + tipografia, SEM persona):
    node index.js autor --tema="O silêncio que machuca"
    node index.js autor --tema="Você não está atrasada"

    🔸 CITAÇÃO (Foto + Assinatura de autor clássico):
    node index.js post --autor="freud" --tema="O eu e o isso"
    node index.js post --autor="lacan" --tema="O desejo do Outro"
    (Opções: freud, lacan, jung, ou qualquer pasta em /assets/authors)

    📂 PROCESSAMENTO EM MASSA (Esteira de Produção):
    node index.js post --file="temas.txt"
    node index.js carrossel --file="temas.txt" --qtd=7

    🧪 MODO A/B (SaaS V6 — Variações automáticas):
    node index.js carrossel --tema="Ansiedade" --variacoes
    node index.js post --tema="Burnout" --variacoes
    node index.js carrossel --tema="Apego" --angulo=confronto
    (Ângulos: emocional | racional | confronto | curiosidade | esperanca)

    3️⃣ PARÂMETROS DISPONÍVEIS:
    ------------------------------------------------------------------
    --tema="..."     : O tema do post (obrigatório se sem --file).
    --file="..."     : Caminho de um arquivo .txt com um tema por linha.
    --autor="..."   : Ativa o Modo Autor (busca foto e assinatura local).
    --qtd=N          : Slides para carrossel (mínimo forçado: 7).
    --data="..."     : Data/Hora inicial "YYYY-MM-DD HH:mm" (+1 dia por tema).
    --lote=N         : (Growth) Gera N posts de uma vez (planejamento semanal).
    --estilo="..."   : (Growth) Força um estilo visual específico.
    --gender="..."   : (Growth) Gênero da persona (feminino/masculino).
    --variacoes      : 🧪 Gera 4 variações A/B com ângulos diferentes.
    --angulo="..."   : 🎯 Força um ângulo específico (sem aprovação interativa).

    4️⃣ PIPELINE INTELIGENTE (V6) — SaaS Architecture:
    ------------------------------------------------------------------
    GROWTH ENGINE      🚀  Decide modo, objetivo, formato e tipo de post
    COPY ENGINE V2     ✍️  Gera copy adaptativa baseada na emoção
    SCENE ENGINE V2    🎬  Decide tipo de cena + estado emocional
    STYLE ENGINE V2    🎨  Decide estética Instagram-nativa
    LAYOUT ENGINE V2   📐  Posicionamento probabilístico por formato
    CAPTION ENGINE     🧾  Legenda + hashtags + CTA por objetivo
    VARIATION ENGINE   🧪  A/B test automático de ângulos emocionais
    SCORING ENGINE     📊  Score ponderado de performance
    MEMORY ENGINE      🧠  Aprendizado automático de padrões
    LLM ROUTER         🔀  Fallback inteligente entre provedores

    5️⃣ SISTEMA DE MEMÓRIA (/memory/):
    ------------------------------------------------------------------
    memory/memory.json        : Histórico de posts aprovados
    memory/adaptations.json   : Padrões aprendidos das suas edições
    memory/performance.json   : 🆕 Histórico de scores de performance
    memory/insights.json      : 🆕 Ângulos e estilos vencedores

    📊 REGISTRAR MÉTRICAS (fecha o loop de aprendizado):
    node workers/optimizeWorker.js --postId=<id> --likes=200 --saves=80

    📝 LOGS: Todas as etapas são registradas em /logs/generation.log
    ==================================================================
    `);
    process.exit(0);
}

function parseArgs() {
    const args = process.argv.slice(2);

    if (args.includes('help') || args.length === 0) showHelp();

    let options = {
        tipo: 'post', // Padrão
        qtd: null, dataStr: null, tema: null, file: null, autor: null, canal: null,
        lote: null, estilo: null, gender: 'feminino',
        // ── SaaS V6 ────────────────────────────────────────────────────────
        variacoes: false,   // --variacoes → A/B test automático
        angulo: null,       // --angulo=emocional|racional|confronto|curiosidade|esperanca
    };

    // Primeiro argumento pode ser 'post', 'carrossel', 'growth', ou 'autor'
    if (args[0] === 'carrossel' || args[0] === '--carrossel') {
        options.tipo = 'carrossel';
    } else if (args[0] === 'post' || args[0] === '--post') {
        options.tipo = 'post';
    } else if (args[0] === 'growth' || args[0] === '--growth') {
        options.tipo = 'growth';
    } else if (args[0] === 'autor' || args[0] === '--autor') {
        options.tipo = 'autor';
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--tema=')) {
            options.tema = arg.split('=')[1] || arg.substring(7);
        } else if (arg.startsWith('--file=')) {
            options.file = arg.split('=')[1] || arg.substring(7);
        } else if (arg.startsWith('--qtd=') || arg.startsWith('-qtd=')) {
            options.qtd = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--autor=') || arg.startsWith('--author=')) {
            options.autor = arg.split('=')[1] || arg.substring(8);
            options.tipo = 'post';
        } else if (arg.startsWith('--data=')) {
            options.dataStr = arg.split('=')[1] || arg.substring(7);
        } else if (arg.startsWith('--canal=')) {
            options.canal = arg.split('=')[1];
        } else if (arg.startsWith('--lote=')) {
            options.lote = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--estilo=')) {
            options.estilo = arg.split('=')[1];
        } else if (arg.startsWith('--gender=')) {
            options.gender = arg.split('=')[1];
        } else if (arg === '--variacoes' || arg === '--variações') {
            // SaaS V6: ativa geração de variações A/B
            options.variacoes = true;
        } else if (arg.startsWith('--angulo=') || arg.startsWith('--ângulo=')) {
            // SaaS V6: força ângulo específico (bypassa interatividade)
            options.angulo = arg.split('=')[1];
        }
    }

    if (options.qtd === null) {
        options.qtd = options.tipo === 'carrossel' ? 7 : 1;
    }

    return options;
}

// ── CTA Visual (frase_final para overlay na imagem) ─────────────────────────
// Frases curtas de CTA para renderizar NA IMAGEM (diferente da caption/legenda)
function gerarFraseVisualCTA(objetivo) {
    const CTAS = {
        engajamento: [
            "Comenta aqui se fez sentido 👇",
            "Isso fez sentido pra você?",
            "Marca quem precisa ler isso",
            "Se identificou? Comenta aqui",
        ],
        salvamento: [
            "Salva esse post 🔖",
            "Guarda isso pra quando precisar",
            "Salva pra reler depois",
            "Esse post merece ser salvo",
        ],
        compartilhamento: [
            "Manda pra quem precisa ouvir isso",
            "Alguém precisa ler isso hoje 💌",
            "Compartilha com quem você pensou agora",
        ],
        autoridade: [
            "Segue pra mais conteúdo como esse 🧠",
            "Ativa o 🔔 pra não perder",
            "Segue e acompanha",
        ],
        conversao: [
            "Me chama no WhatsApp 📲",
            "Clica no WhatsApp e vamos conversar",
            "Quer sair desse ciclo? Me chama 💬",
        ],
    };

    const opcoes = CTAS[objetivo] || CTAS.engajamento;
    return opcoes[Math.floor(Math.random() * opcoes.length)];
}

// ── GROWTH ENGINE: Pipeline Visual Completo ─────────────────────────────────
async function runGrowthPipeline(options) {
    const SEP = '\n' + '='.repeat(100) + '\n';
    const dataBase = getBaseDate(options.dataStr);

    const growthInput = {
        tema: options.tema || null,
        estilo: options.estilo || 'editorial_minimalist',
        gender: options.gender || 'feminino',
    };

    // ── GROWTH DECISIONS ────────────────────────────────────────────────────
    const post = await gerarPostCompleto(growthInput);
    const estiloBase = post._meta.estiloBase;

    // ── Montar o imageItem no formato que o pipeline espera ─────────────────
    // O imageService.js espera: texto_principal, texto_secundario, frase_final,
    // destaques, descricao_visual, tipo
    const imageItem = {
        tipo: post.tipoPost,
        texto_principal: post.copy.headline,
        texto_secundario: post.copy.subtexto || '',
        frase_final: gerarFraseVisualCTA(post.objetivo),
        destaques: [],
        descricao_visual: post.promptImagem.substring(0, 200),
        descricao_visual_pt: post.copy.headline,
        // V5: Layout info for the overlayer
        _layoutId: post.layout?.layoutId || 'center_text',
        _layoutDef: post.layout?.layoutDef || null,
    };

    // Extrair destaques automáticos da headline (1 palavra forte)
    const palavrasFortes = post.copy.headline
        .split(/\s+/)
        .filter(p => p.length > 4)
        .sort((a, b) => b.length - a.length);
    if (palavrasFortes.length > 0) {
        imageItem.destaques = [palavrasFortes[0].replace(/[?.!,]/g, '')];
    }

    // ── Output Directory ────────────────────────────────────────────────────
    const execucaoId = `growth_${formatTimestamp(dataBase)}`;
    const outputDir = path.resolve('output', execucaoId);
    ensureDir(outputDir);

    // ── Salvar data.json (blueprint completo V6) ─────────────────────────────
    const dataJson = {
        tipo: 'post',
        growth: {
            modo: post.modo,
            objetivo: post.objetivo,
            formato: post.formato,
            tipoPost: post.tipoPost,
            tipoCena: post.tipoCena,
        },
        // 🆕 V6: Estratégia de copy
        copyStrategy: post.copyStrategy || null,
        // 🆕 V6: Tipografia de conversão
        typography: post.typography || null,
        // 🆕 V6: Cena cinematográfica
        sceneV3: post.sceneV3 || null,
        conteudo: imageItem,
        legenda: {
            texto: post.caption.textoCompleto,
            hashtags: post.caption.hashtags,
        },
        estilo_visual: { base: estiloBase },
        publico: { genero: post._meta?.gender || growthInput.gender },
    };

    const metaJson = {
        tipo: 'post',
        modo: 'growth',
        autor: null,
        status: 'draft',
        qtd_slides: 1,
        data_agendada: dataBase.toISOString(),
        formatos: ['feed'],
        resolucoes: { feed: '1080x1440' },
        growth_meta: {
            modo: post.modo,
            objetivo: post.objetivo,
            formato: post.formato,
            tipoPost: post.tipoPost,
            tipoCena: post.tipoCena,
            cta: post.caption.cta,
        },
        // 🆕 V6: Metadados do pipeline de aquisição
        v6_meta: {
            hookPattern: post.copyStrategy?.hookPattern || null,
            copyIntent: post.copyStrategy?.intent || null,
            typographyPair: post.typography?.pairId || null,
            cameraLens: post.sceneV3?.camera?.lens || null,
            ambiente: post.sceneV3?.ambiente?.id || null,
            gender: post._meta?.gender || null,
            emotionalLevel: post.sceneV3?.emotionalLevel?.label || null,
        },
    };

    saveJSON(path.join(outputDir, 'data.json'), dataJson);
    saveJSON(path.join(outputDir, 'meta.json'), metaJson);

    console.log(`\n📂 Draft criado: ${execucaoId}`);

    // ── STAGE 2: Geração de Imagens (REAL) ──────────────────────────────────
    console.log(SEP);
    console.log('🎨 STAGE 2 — Gerando imagens com o Growth Engine...');
    const imageItems = [imageItem];
    await generateAndSaveImages(outputDir, metaJson, imageItems, null, estiloBase, dataJson.publico, growthInput.tema || post.copy.headline);

    // ── Persistir campos Cloudinary no data.json ─────────────────────────────
    // imageItem foi mutado pelo imageService com image_path, image_url, cloudinary_id
    dataJson.conteudo = {
        ...dataJson.conteudo,
        image_path:    imageItem.image_path    || null,
        image_url:     imageItem.image_url     || null,
        cloudinary_id: imageItem.cloudinary_id || null,
    };
    saveJSON(path.join(outputDir, 'data.json'), dataJson);

    // ── STAGE 2.5: Capturar Quality Score ───────────────────────────────────
    const qualityScore = imageItem._qualityScore || null;
    if (qualityScore) {
        metaJson.quality_score = {
            total: qualityScore.totalScore,
            verdict: qualityScore.verdict,
            scores: qualityScore.scores,
            criticalIssues: qualityScore.criticalIssues || [],
            provider: qualityScore.provider,
        };
        saveJSON(path.join(outputDir, 'meta.json'), metaJson);

        // Salvar score detalhado separado para análise
        saveJSON(path.join(outputDir, 'quality_report.json'), {
            timestamp: new Date().toISOString(),
            totalScore: qualityScore.totalScore,
            verdict: qualityScore.verdict,
            scores: qualityScore.scores,
            criticalIssues: qualityScore.criticalIssues,
            suggestions: qualityScore.suggestions,
            provider: qualityScore.provider,
        });
    }

    // ── SCORING AUTO-BLOCK: Score < 70 = alertar e oferecer regeneração ──────
    if (qualityScore && qualityScore.totalScore < 70 && qualityScore.verdict !== 'SKIP') {
        console.log(SEP);
        const scoreIcon = qualityScore.totalScore < 40 ? '🚨' : '⚠️';
        console.log(`${scoreIcon} QUALITY GATE: Score ${qualityScore.totalScore}/100 — ${qualityScore.verdict}`);
        console.log('   Problemas:');
        (qualityScore.criticalIssues || []).forEach(i => console.log(`      • ${i}`));
        console.log('');

        const regenDec = await askQuestion('   🔄 Score abaixo de 70. Regerar imagem? [S]im / [N]ão (continuar): ');
        if (regenDec.toLowerCase() === 's') {
            console.log('   🔄 Regerando imagem...');
            await generateAndSaveImages(outputDir, metaJson, imageItems, null, estiloBase, dataJson.publico, growthInput.tema || post.copy.headline);
            // Re-capturar score
            const newScore = imageItem._qualityScore || null;
            if (newScore) {
                metaJson.quality_score = { total: newScore.totalScore, verdict: newScore.verdict, scores: newScore.scores, criticalIssues: newScore.criticalIssues || [], provider: newScore.provider };
                saveJSON(path.join(outputDir, 'meta.json'), metaJson);
            }
        }
    }

    // ── STAGE 3: Aprovação Final → Memória ──────────────────────────────────
    console.log(SEP);

    // Se o score é muito baixo, alertar antes da aprovação
    if (qualityScore && qualityScore.totalScore < 40) {
        console.log('🚨 ATENÇÃO: Quality Score BAIXO (' + qualityScore.totalScore + '/100).');
        console.log('   Problemas críticos:');
        (qualityScore.criticalIssues || []).forEach(i => console.log(`      • ${i}`));
        console.log('');
    }

    const finalDec = await askQuestion('🏁 STAGE 3 — Aprovação FINAL: Salvar na memória? [S]im / [N]ão: ');

    if (finalDec.toLowerCase() === 's') {
        metaJson.status = 'approved';
        saveJSON(path.join(outputDir, 'meta.json'), metaJson);
        saveToMemory(dataJson, metaJson);
        console.log('✅ Post APROVADO e salvo na memória principal.');
    } else {
        console.log('⏸️  Post mantido como DRAFT. Memória não atualizada.');
    }

    // ── Preview HTML ────────────────────────────────────────────────────────
    console.log(SEP);
    console.log('🖥️  Gerando preview HTML...');
    generatePreview(outputDir, metaJson, dataJson);

    console.log(SEP);
    console.log(`✅ Growth Pipeline V6 concluído! Output: /output/${execucaoId}`);
    console.log(`\n📋 RESUMO FINAL V6:`);
    console.log(`   Modo       : ${post.modo}`);
    console.log(`   Objetivo   : ${post.objetivo}`);
    console.log(`   Formato    : ${post.formato}`);
    console.log(`   Tipo       : ${post.tipoPost}`);
    console.log(`   Cena       : ${post.tipoCena}`);
    console.log(`   Emoção     : ${post.emotionState?.label || 'N/A'}`);
    console.log(`   Estilo     : ${post.estiloInstagram?.id || post._meta?.estiloBase || 'N/A'} (${post.estiloInstagram?.vibe || ''})`);
    console.log(`   Layout     : ${post.layout?.layoutId || post.layout?.size || 'N/A'}`);
    console.log(`   Headline   : "${post.copy.headline}"`);
    console.log(`   CTA        : ${post.caption.cta}`);
    console.log(`   Caption    : ${post.caption.texto.substring(0, 60)}...`);
    // 🆕 V6: Campos do pipeline de aquisição
    console.log(`   🧠 Hook     : ${post.copyStrategy?.hookPattern || 'N/A'} → ${post.copyStrategy?.intent || 'N/A'}`);
    console.log(`   🔤 Fontes   : ${post.typography?.pairId || 'N/A'} (${post.typography?.headlineFont || ''})`);
    console.log(`   📸 Câmera   : ${post.sceneV3?.camera?.lens || 'N/A'}`);
    console.log(`   🏠 Ambiente : ${post.sceneV3?.ambiente?.id || 'N/A'}`);
    console.log(`   👤 Gênero   : ${post._meta?.gender || 'N/A'}`);
    if (qualityScore) {
        const qIcon = qualityScore.verdict === 'APPROVED' ? '✅' : qualityScore.verdict === 'NEEDS_CORRECTION' ? '⚠️' : '❌';
        console.log(`   ${qIcon} Quality  : ${qualityScore.totalScore}/100 — ${qualityScore.verdict}`);
    }
    console.log('='.repeat(100));
}

// ── GROWTH LOTE: Pipeline Visual em Lote ────────────────────────────────────
async function runGrowthLotePipeline(options) {
    const SEP = '\n' + '='.repeat(100) + '\n';
    let currentDate = getBaseDate(options.dataStr);

    const growthInput = {
        tema: options.tema || null,
        estilo: options.estilo || 'editorial_minimalist',
        gender: options.gender || 'feminino',
    };

    console.log(`\n${'═'.repeat(100)}`);
    console.log(`🚀 GROWTH ENGINE — Gerando LOTE VISUAL de ${options.lote} posts`);
    console.log('═'.repeat(100));

    for (let i = 0; i < options.lote; i++) {
        console.log(`\n${'─'.repeat(100)}`);
        console.log(`📌 POST ${i + 1}/${options.lote}`);
        console.log('─'.repeat(100));

        await runGrowthPipeline({
            ...options,
            dataStr: currentDate.toISOString(),
        });

        currentDate = addDays(currentDate, 1);
    }

    console.log(SEP);
    console.log(`✅ LOTE VISUAL COMPLETO: ${options.lote} posts gerados com imagens!`);
    console.log('='.repeat(100));
}

async function main() {
    const options = parseArgs();

    // Assegurar os diretórios base
    ensureDir('output');

    // ── MODO GROWTH ENGINE ──────────────────────────────────────────────────
    if (options.tipo === 'growth') {
        if (options.lote && options.lote > 1) {
            await runGrowthLotePipeline(options);
        } else {
            await runGrowthPipeline(options);
        }
        return;
    }

    // ── MODO AUTOR → redireciona para pipeline clássico com tipo 'autor' ────
    if (options.tipo === 'autor') {
        // V5: Autor mode mantém tipo 'autor' — o layout engine trata isso como fixo
        if (!options.tema && !options.file) {
            console.error('Modo AUTOR requer --tema. Ex: node index.js autor --tema="O silêncio que machuca"');
            process.exit(1);
        }
        // NÃO converte para 'post' — mantém 'autor' para que o pipeline saiba
    }

    // ── MODO CLÁSSICO (post / carrossel) ─────────────────────────────────────
    let temasToProcess = [];
    if (options.file) {
        temasToProcess = readLines(options.file);
        if (temasToProcess.length === 0) {
            console.error(`Arquivo ${options.file} vazio ou não encontrado.`);
            process.exit(1);
        }
    } else if (options.tema) {
        temasToProcess.push(options.tema);
    } else {
        console.error("Você deve especificar --tema ou --file.");
        process.exit(1);
    }

    let currentDate = getBaseDate(options.dataStr);

    for (let i = 0; i < temasToProcess.length; i++) {
        // Normaliza pontuação no tema: troca ". " por "… " para manter força do hook
        const tema = temasToProcess[i]
            .replace(/^"|"$/g, '').replace(/^'|'$/g, '')
            .replace(/\.\s+/g, '… ')   // "não está cansado. está" → "não está cansado… está"
            .trim();

        // ── SaaS V6: Rota por flags ──────────────────────────────────────────
        if (options.variacoes || options.angulo) {
            // Modo SaaS: sem aprovação interativa — gera direto via generationService
            const saasFlag = options.variacoes ? '🧪 A/B' : `🎯 Ângulo: ${options.angulo}`;
            console.log(`\n${saasFlag} — Roteando via GenerationService (SaaS V6)...`);

            const results = await generateContentSaaS({
                tipo:     options.tipo,
                tema,
                qtd:      options.qtd,
                dataBase: currentDate,
                autor:    options.autor || null,
                withVariations: options.variacoes,
                angles:   options.variacoes
                    ? ['emocional', 'racional', 'confronto', 'curiosidade']
                    : [options.angulo],
                estiloBase: options.estilo || null,
            });

            // Resultado pode ser array (--variacoes) ou objeto único (--angulo)
            const arr = Array.isArray(results) ? results : [results];
            arr.forEach(r => {
                if (r?.execucaoId) {
                    console.log(`  ✅ Gerado: /output/${r.execucaoId}`);
                }
            });

        } else {
            // Modo Clássico: fluxo interativo completo via orchestrator existente
            await runPipeline({
                tipo:    options.tipo,
                tema,
                qtd:     options.qtd,
                dataBase: currentDate,
                autor:   options.autor,
            });
        }

        // Adiciona 1 dia (D+1) para o próximo tema, se houver
        currentDate = addDays(currentDate, 1);
    }
}

main();
