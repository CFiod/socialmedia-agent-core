// ── CONFIGURAÇÕES ────────────────────────────────────────────────────

import dotenv from 'dotenv';
import { loadMemory, buildAntiRepetitionContext, buildAdaptiveContext } from './memoryService.js';
import { buildHookPromptInstruction, getHookRotationContext } from './hookEngine.js';
import { classificarConteudo, gerarVariacaoCriativa, buildVariacaoCriativaPrompt, buildCategoriaPrompt, normalizarOutput } from '../agents/content_classifier.js';
import { selecionarPersona } from '../agents/persona_bank.js';
import { runAI } from '../ai/core/orchestrator.js';

dotenv.config();

const config = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  MODEL_TEXT: process.env.MODEL_TEXT || 'anthropic/claude-sonnet-4-5',
  MODEL_IMAGE: process.env.MODEL_IMAGE || 'flux',
};

// ── BANCO DE DADOS LOCAIS ───────────────────────────────────────────────────

const BANCO = {
  ctas: [
    "Você não precisa continuar assim. Dá pra mudar. O primeiro passo é me chamar no WhatsApp agora.",
    "Esse padrão tem solução. Clica no WhatsApp e vamos começar a desmontar isso hoje.",
    "Continuar repetindo essa dor é uma escolha. Clica no WhatsApp, eu te ajudo a sair disso.",
    "Isso não é o seu limite, é apenas uma repetição. Me chama no WhatsApp e vamos quebrar isso.",
    "A solução começa quando você entende a raiz. Clica no botão do WhatsApp e comece agora.",
  ],
  hashtags: {
    alto_volume: ["#saudemental", "#ansiedade", "#autoconhecimento", "#bemestar", "#mente"],
    nicho: ["#psicanalise", "#terapia", "#terapiaemocional", "#psicanaliseclinica"],
    intencao: ["#cansaçoemocional", "#esgotamentoemocional", "#sobrecargaemocional", "#equilibrioemocional", "#emocional"],
  },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

function buildHashtags() {
  return [
    ...pickN(BANCO.hashtags.alto_volume, 4),
    ...pickN(BANCO.hashtags.nicho, 4),
    ...pickN(BANCO.hashtags.intencao, 4),
  ];
}

// ── MAPEAMENTO DE SLIDES ─────────────────────────────────────────────────────

function getSlideIntent(tipo) {
  const map = {
    hook_impacto: "Gancho com tensão e impacto — escreva uma frase que PARA O SCROLL. Identificação total com o sintoma disfarçado.",
    sintoma_sobrecarga: "Apresente a exaustão oculta e as consequências reais de tentar controlar/esconder essa dor no dia a dia.",
    raiz_passado: "Conecte o sintoma à origem. Explique de forma simples que isso não começou agora — tem raiz no passado.",
    padrao_repeticao: "Mostre como esse padrão afeta relações atuais — amor, trabalho, escolhas. Ciclo e repetição.",
    consciencia_revelacao: "QUEBRA DE CRENÇA FORTE. Tire a culpa do sujeito. Aponte que o problema verdadeiro não é a emoção, é a tentativa de controle. (Ex: 'O problema não é a ansiedade, é tentar controlar tudo').",
    solucao_possibilidade: "Mostre que dá para quebrar essa corrente quando se entende a causa verdadeira.",
    cta_conversao: "texto_principal: 'Você sente que não consegue sair desse ciclo', texto_secundario: 'Me chama no WhatsApp que te explico'.",
    provocacao: "Afirmação direta, provocativa, que quebra o conforto imediato.",
    identificacao: "Cena espelho — descreva algo que a pessoa VIVEU hoje. Espelhamento purista.",
    tensao: "Mostre o peso emocional que esse padrão causa na vida cotidiana.",
    quebra: "Slide de 1 linha, completamente inesperado. Pergunta desconfortável ou afirmação direta.",
    expansao: "Aprofunde sem explicar em excesso. Foco 100% na EMOÇÃO, não na teoria.",
    alivio: "Micro-alívio. Acolha a dor identificada. Valide sem resolver.",
    cta: "texto_principal: 'Você sente que não consegue sair desse ciclo', texto_secundario: 'Me chama no WhatsApp que te explico'.",
    comportamento: "O que a pessoa faz no modo automático — o padrão comportamental invisível.",
    tentativa_controle: "Como a pessoa tenta controlar, esconder ou reprimir o que sente.",
    frustracao: "O primeiro baque quando o controle ilusório começa a falhar.",
    repeticao: "Evidencie que o ciclo se repete e traz exaustão contínua.",
    consciencia: "QUEBRA DE CRENÇA FORTE. Insight que quebra padrão. MÁXIMO 1 slide (Ex: 'O problema não é a ansiedade, é tentar controlar tudo').",
    possibilidade: "A esperança realista de quebrar a repetição — sem promessas vazias.",
    curiosidade: "Frase de curiosidade sobre uma percepção do dia a dia.",
    contraste: "Contraste gritante entre expectativa e realidade do sintoma.",
    sintoma: "Apresente o sintoma real e silencioso de forma nua e crua.",
    insight: "Revelar o mecanismo de forma clara (Ex: 'Você não está perdendo o controle. Está tentando controlar tudo ao mesmo tempo'). Gera clique mental.",
    explicacao_minima: "Causa explicada em 1 slide. Sensação curta, não conceito abstrato.",
    reframe: "Redirecionamento: tire a culpa do sujeito e abra espaço de acolhimento.",
    espelho: "Descreva algo que a pessoa viveu hoje. Espelhamento purista, sensação crua.",
    ampliacao: "Amplifique as consequências e intensifique a cena do espelho.",
    intensificacao: "Mostre que a dor/peso é pior do que assumido na superfície.",
    nomeacao: "Dê um nome ou voz a essa emoção — sem soar psicanalítico ou técnico.",
    validacao: "Valide que sentir isso é real (ex: 'Você não está sozinha — só nunca te explicaram isso assim'). USE CONCORDÂNCIA FEMININA OBRIGATÓRIA.",
    direcionamento: "texto_principal: 'Existe um jeito de sair desse ciclo', texto_secundario: 'Mas você precisa entender o que está por trás'.",
  };
  return map[tipo] || tipo;
}

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return "Você é um agente especialista em criação de conteúdo para redes sociais com foco em:\\n- Instagram (carrossel, post único)\\n- Criativos para Meta Ads\\n- Copy emocional de alta conversão para psicanálise\\n\\nSua arquitetura mental de criação é composta por 3 camadas estritas:\\n1. STRATEGY ENGINE (CÉREBRO): Define dor central, inimigo, tensão e narrativa.\\n2. COPY ENGINE (EXECUTOR): Lógica estratégica e usa \"copy_rules\" como ponte para gerar o texto. O texto DEVE gerar \"Reconhecimento + Incômbido + Ação\".\\n3. CREATIVE LAYER (VISUAL): Define coerência de humor, atmosfera e estilo atrelados à dor emocional.\\n\\n⚠️ REGRA CENTRAL — A Copy NUNCA deve ser puramente \"bonita\" ou \"educacional\".\\nA estratégia gera CADA PALAVRA da copy. Fuja de leveza, traga urgência e peso emocional onde a pessoa percebe: \"isso sou eu, preciso de ajuda\".\\n\\n⚠️ REGRA DE VOZ — O perfil é de UMA PROFISSIONAL SOLO. NUNCA use \"conosco\", \"nós\", \"nosso\", \"nossa\", \"Fale conosco\", \"Converse conosco\". SEMPRE use primeira pessoa singular: \"comigo\", \"me chama\", \"Fale comigo\", \"Me chama no WhatsApp\".\\n\\nMISSÃO FINAL: Criar conteúdos que façam a pessoa PARAR, SENTIR, SE IDENTIFICAR e AGIR.";
}

// ── PROMPT DE ESTRATÉGIA (UNIVERSAL) ────────────────────────────────────────

function buildStrategiaInstructions(tema, hookContext) {
  const instrucoes = `
# 🎯 ESTRATÉGIA (Independente do Formato)

TEMA: "${tema}"

Defina a estratégia com estes campos — ela deve ser aplicável a QUALQUER formato:
- big_idea: Uma ideia central forte, contraintuitiva.
- angulo: Perspectiva única para abordar o tema
- emocao_principal: A dor dominante da audiência (ex: abandono, culpa, exaustão)
- emocao_secundaria: Reforço emocional complementar
- gatilho: curiosidade | dor | choque | identificação
- arquetipo: mentor | confrontador | espelho | guia
- promessa: A transformação implícita no conteúdo (não explícita)
- inimigo: A crença limitante ou padrão a ser quebrado

ARQUÉTIPO NARRATIVO ATIVO: ${hookContext.id.toUpperCase()}

📌 FÓRMULAS DE COPY OBRIGATÓRIAS (use pelo menos 2):
- "Você acha que X, mas na verdade Y"
- "Ninguém fala isso, mas..."
- "O problema não é X, é Y"
- "Você não é [defeito], você foi [condicionado]"

⚠️📏 LIMITES DE CARACTERES (OBRIGATÓRIOS):
- texto_principal: MÁXIMO 12 PALAVRAS — Frase de IMPACTO (gancho ou headline)
- texto_secundario: MÁXIMO 18 PALAVRAS — COMPLEMENTO com nova informação
- frase_final (CTA): MÁXIMO 20 PALAVRAS — CTA com WhatsApp
- NÃO REPITA o sentido do texto_principal — COMPLEMENTE com ângulo diferente

📌 REGRAS DE COPY (OBRIGATÓRIAS):
1. Falar diretamente com "você", mas evite começar todos os slides com "Você".
2. Frases curtas e impactantes — nada de textão.
3. Evitar linguagem técnica ou psicanalítica.
4. Priorizar emoção > lógica.
5. Criar tensão psicológica antes de qualquer alívio.
6. Gerar identificação imediata — a pessoa deve sentir "isso sou eu".
7. CADA CAMPO DEVE RESPEITAR O LIMITE DE PALAVRAS.
8. VARIAÇÃO DE INÍCIO: Misture perguntas, afirmações e corte direto. PROIBIDO começar mais de 1 slide com "Você".
9. ARQUÉTIPO (MENTOR): Se a estratégia pedir mentor, atue como guia firme.
10. BIG IDEA: Deve cortar fundo na emoção (Ex: "Você não está quebrada. Está se protegendo demais." ou "Ansiedade não é fraqueza. É sua mente tentando te proteger.").
11. MICRO-ESPECIFICIDADE: PROIBIDO genéricos abstratos. Use o cotidiano exato. Em vez de "rotina de dor" use "Você acorda cansada — mesmo depois de dormir". Em vez de "dor que não some" use "Você tenta ignorar... mas ela sempre volta".
12. CONCORDÂNCIA: USE LINGUAGEM FEMININA SEMPRE (ex: sozinha, cansada, esgotada).
13. PONTUAÇÃO CONTÍNUA: Quando texto_principal e texto_secundario formam UMA FRASE CONTÍNUA, a pontuação final (? ! .) vai SOMENTE no texto_secundario. O texto_principal NÃO termina com pontuação nesses casos.
    - ✅ BOM: Principal: "Você sempre precisa de likes" / Secundário: "Para se sentir válida?"
    - ❌ RUIM: Principal: "Você sempre precisa de likes?" / Secundário: "Para se sentir válida?"
    - REGRA: Se o texto_secundario é uma CONTINUAÇÃO direta (começa com "Para", "Mas", "Mesmo", "E", "Quando", "Porque", "Sem", "Só"), o texto_principal NÃO pode ter pontuação final.
14. DESTAQUES (OBRIGATÓRIO): SEMPRE preencha o array "destaques" com 1 a 3 palavras-chave exatas que aparecem no texto_principal ou texto_secundario para receberem cor de destaque na arte. Ex: ["quebrada", "protegendo"]. NUNCA deixe vazio.
15. VOZ SINGULAR (OBRIGATÓRIO): O perfil é de UMA PROFISSIONAL SOLO. PROIBIDO usar "conosco", "nós", "nosso", "Fale conosco", "Converse conosco". USE SEMPRE: "comigo", "me chama", "Fale comigo", "Me chama no WhatsApp". Ex: ✅ "Me chama no WhatsApp" ❌ "Fale conosco pelo WhatsApp".

📕 ESTRUTURA DE CADA SLIDE:
- texto_principal: Frase de IMPACTO ou GATILHO (não explicar, sentir)
- texto_secundario: COMPLEMENTO com nova informação (NÃO repeti o texto_principal)
- exemplo BOM: Principal: "Você finge que está tudo bem" / Secundário: "Mas por dentro, você está implodindo"
- exemplo RUIM: Principal: "Ansiedade" / Secundário: "Você não é fraco" (NÃO faz sentido juntos)

📌 EVITAR SEMPRE:
- Generalizações vagas
- Conteúdo genérico ou motivacional vazio
- Frases clichê como "cuide da sua saúde mental"
- Explicações longas ou abstratas
`;
  return instrucoes;
}

// ── VISUAL INSTRUCTIONS ─────────────────────────────────────────────────────

function buildVisualInstructions(estilo_base) {
  return `
# 🎨 4. VISUAL (DECISÃO DE ESTILO — Instagram 2025-2026)
Escolhido APÓS estratégia e execução.

## 🧠 LÓGICA DE DECISÃO OBRIGATÓRIA
- SEMPRE usar estilos claros, editoriais e premium
- NUNCA usar estilos escuros, sombrios ou dramáticos
- SE modo = carrossel → priorizar legibilidade e consistência visual
- O estilo base já foi escolhido pelo sistema: "${estilo_base}"

## 🎨 ESTILOS PERMITIDOS (SOMENTE ESTES)
- editorial_minimalist: fundo claro, personagem central, luz suave, paleta neutra, estilo revista
- cinematic_soft: luz cinematográfica suave, fundo desfocado, personagem consistente, tons claros
- modern_flat_editorial: ilustração plana moderna, cores suaves, consistente
- photoreal_editorial: foto realista, luz clara, fundo minimalista
- photoreal_soft: foto íntima, luz de janela, emocional, humana
- symbolic_minimal: conceitual, objeto metafórico único, fundo limpo, sofisticado
- soft_3d_editorial: 3D pastel, moderno, limpo, formas suaves
- grain_film_editorial: estilo filme analógico, grain sutil, tons quentes, premium
- dreamlike_pastel: surrealismo onírico CLARO, elementos flutuantes, pastel, metáforas do inconsciente
- watercolor_soft: aquarela suave, pinceladas orgânicas, textura de papel, acolhedor

## ⛔ ESTILOS PROIBIDOS (NUNCA USAR)
- oil_painting
- dark moody cinematic photography
- chiaroscuro
- heavy shadows
- dramatic contrast
- black backgrounds
- dark rooms

## ⚠️📏 DESCRIÇÃO VISUAL (FORMATO EXATO PARA GERAÇÃO DE IMAGEM):
A descricao_base DEVE ser em INGLÊS com formato técnico para IA de imagem:
- formato: "[PERSONA], [ACTION/SYMBOLIC OBJECT], [BRIGHT SCENE], ${estilo_base} (max 25 words, English)"
- A PERSONA será definida automaticamente pelo sistema (Persona Bank V2)
- SE o sistema decidir NÃO usar persona → use: "symbolic object, metaphorical scene, no human faces"
- SE o sistema decidir usar persona → use a descrição exata fornecida pelo sistema
- exemplo BOM: "woman 25, looking at mirror, soft beige room, bright soft lighting, editorial_minimalist"
- exemplo BOM (sem persona): "broken mirror on wooden table, soft lighting, minimal background, editorial"
- exemplo RUIM: "woman 30s, trapped in darkness, dark room, oil_painting"
- REGRA DE OURO: Adicione um OBJETO SIMBÓLICO (espelho, diário, flor, janela, luz) que ancore a emoção — SEMPRE em ambiente CLARO.

## ⚠️ REGRAS VISUAIS CRÍTICAS
1. Texto deve ser sempre legível em 1 segundo
2. Fundo CLARO e LIMPO — beige, branco, neutro pastel
3. Imagem nunca pode competir com a copy
4. CRITICAL: \`descricao_base\` MUST BE 100% IN ENGLISH! NO PORTUGUESE WORDS ALLOWED. THIS IS SENT TO AN IMAGE AI THAT ONLY UNDERSTANDS ENGLISH.
5. Máx 25 palavras - contar palavras separadas por espaço
6. NUNCA usar: "dark", "darkness", "shadow", "chains", "trapped", "black room"
7. Persona máx 70% da imagem — mínimo 30% ambiente/composição
8. PROIBIDO close-up de rosto preenchendo toda a imagem

## 🎯 CONSISTÊNCIA DO ESTILO E VARIAÇÃO NO CARROSSEL:
- MESMA persona em TODOS os slides (se aplicável)
- MESMO estilo visual em TODOS os slides: ${estilo_base}
- MESMA paleta de cores em TODOS os slides
- MESMA iluminação (bright soft lighting) em TODOS os slides
- Só muda a AÇÃO e o OBJETO SIMBÓLICO entre slides

## 🎯 DESCRIÇÃO DA PERSONA (V2 — BANCO ROTATIVO):
- O sistema escolhe automaticamente a persona ideal
- Em modo AUTOR: ZERO persona — foco em tipografia
- Em modo GROWTH: 70% sem persona — foco em objetos/metáforas
- Em modo POST: 50% com/sem persona — variar
- Em modo CARROSSEL: persona consistente em todos os slides
- NUNCA hardcodar "same woman 30s" — usar a persona do sistema
`;
}

// ── CARROSSEL SCHEMA BUILDER ────────────────────────────────────────────────

function buildCarrosselSchema(passosEstrutura, qtd, visualProgression, hashtagsSugeridas, hookContext, publico, marketingContext, estilo_base) {
  const slideQtd = qtd;
  const mapaNarrativo = passosEstrutura.slice(0, slideQtd).map(function(tipoSlide, i) {
    return '  Slide ' + (i + 1) + ': [' + tipoSlide.toUpperCase() + '] → ' + getSlideIntent(tipoSlide);
  }).join('\\n');

  const slidesSchema = passosEstrutura.slice(0, slideQtd).map(function(tipoSlide, i) {
    const sceneHint = visualProgression[i] || visualProgression[0];
    const isPrimeiro = i === 0;
    const isCTA = i === slideQtd - 1;
    const maxP = isPrimeiro ? 12 : isCTA ? 20 : 12;
    const maxS = isCTA ? 25 : 18;
    const finalTipo = isCTA ? 'cta' : tipoSlide;
    return '    {\\n      \\"tipo\\": \\"' + finalTipo + '\\",\\n      \\"texto_principal\\": \\"' + (isPrimeiro ? 'Gancho (máx ' + maxP + ' palavras)' : isCTA ? 'Frase forte de chamada (máx ' + maxP + ' palavras)' : 'Headline impactante (máx ' + maxP + ' palavras)') + '\\",\\n      \\"texto_secundario\\": \\"' + (isCTA ? 'CTA com menção ao WhatsApp (máx ' + maxS + ' palavras)' : 'Soco emocional curto (máx ' + maxS + ' palavras)') + '\\",\\n      \\"destaques\\": [\\"palavra_exata1\\", \\"palavra_exata2\\"],\\n      \\"descricao_base\\": \\"' + sceneHint + ', [ACTION IN ENGLISH ONLY], ' + estilo_base + '\\",\\n      \\"descricao_visual_pt\\": \\"Tradução literal\\",\\n      \\"objetivo\\": \\"' + getSlideIntent(tipoSlide).split('—')[0].trim() + '\\"\\n    }';
  }).join(',\\n');

  return '\\n# 🧩 MAPA NARRATIVO — SIGA EXATAMENTE ESTA ORDEM (' + slideQtd + ' slides):\\n' + mapaNarrativo + '\\n\\n# ⚙️ REGRAS DE EXECUÇÃO — CARROSSEL:\\n' +
    '1. SLIDE 1 (HOOK): Deve atingir em cheio e parar o scroll.\\n' +
    '2. SUBSTÂNCIA PUNCHY: PROIBIDO textos longos.\\n' +
    '3. QUEBRA DE CRENÇA: Slide 5 precisa surpreender muito.\\n' +
    '4. ARQUÉTIPO DA COPY: Adote o tom do arquétipo. Se for Mentor, evite falar "como a vitima". Fale como guia.\\n' +
    '5. DESTAQUES CIRÚRGICOS: Apenas 1 palavra-chave extraída do bloco.\\n' +
    '6. SLIDE FINAL (CTA): Crie curiosidade real ("Existe um jeito de sair...") chamando para o WhatsApp.\\n' +
    '7. CONSISTÊNCIA VISUAL: Construa a variação + base fotográfica no JSON estilo_visual.\\n' +
    '8. LEGENDA: Escreva um texto complementar profundo e persuasivo para a legenda, focando no reframe.\\n\\n' +
    'FORMATO DE SAÍDA (JSON puro, sem markdown):\\n{\\n' +
    '  \\"meta\\": {\\n    \\"modo\\": \\"carrossel\\",\\n    \\"plataforma\\": \\"instagram\\"\\n  },\\n' +
    '  \\"marketing\\": {\\n    \\"canal\\": \\"' + marketingContext.canal + '\\",\\n    \\"objetivo\\": \\"' + marketingContext.objetivo + '\\",\\n    \\"nivel_funil\\": \\"' + marketingContext.nivel_funil + '\\"\\n  },\\n' +
    '  \\"publico\\": {\\n    \\"perfil\\": \\"Descreva o perfil comportamental exato alvo deste tema\\",\\n    \\"genero\\": \\"Inferir pelo tema (ex: masculino, feminino, universal)\\",\\n    \\"idade\\": \\"25-40\\",\\n    \\"nivel_consciencia\\": \\"problema consciente\\"\\n  },\\n' +
    '  \\"estrategia\\": {\\n    \\"big_idea\\": \\"\\",\\n    \\"angulo\\": \\"\\",\\n    \\"emocao_principal\\": \\"\\",\\n    \\"emocao_secundaria\\": \\"\\",\\n    \\"gatilho\\": \\"\\",\\n    \\"arquetipo\\": \\"' + hookContext.id + '\\",\\n    \\"intensidade_emocional\\": \\"alta\\",\\n    \\"ritmo\\": \\"progressivo\\",\\n    \\"padrao_linguagem\\": \\"conversacional\\",\\n    \\"nivel_profundidade\\": \\"emocional-pratico\\",\\n    \\"promessa\\": \\"\\",\\n    \\"inimigo\\": \\"\\"\\n  },\\n' +
    '  \\"estilo_visual\\": {\\n    \\"base\\": \\"' + estilo_base + '\\",\\n    \\"permitidos\\": [\\"editorial_minimalist\\", \\"cinematic_soft\\", \\"modern_flat_editorial\\", \\"photoreal_editorial\\", \\"photoreal_soft\\", \\"symbolic_minimal\\", \\"soft_3d_editorial\\", \\"grain_film_editorial\\", \\"dreamlike_pastel\\", \\"watercolor_soft\\"]\\n  },\\n' +
    '  \\"slides\\": [\\n' + slidesSchema + '\\n  ],\\n' +
    '  \\"legenda\\": {\\n    \\"texto\\": \\"\\",\\n    \\"hashtags\\": []\\n  }\\n}';
}

// ── FUNÇÕES AUXILIARES ──────────────────────────────────────────────────────

function normalizeOutput(parsedJson, originalTipo) {
  // Previne erros se a IA não gerou a chave certa
  const copy = { ...parsedJson };

  // ── AUTO-EXTRAÇÃO DE DESTAQUES (FALLBACK) ──────────────────────────────
  // Se o LLM esquecer de gerar destaques, a gente extrai as palavras mais longas
  const extractHighlights = (text) => {
    if (!text) return [];
    const words = text.replace(/[.,!?;:()""'''\"]/g, '').split(/\s+/).filter(w => w.length > 5);
    return words.slice(-2); // Pega até 2 palavras longas
  };

  const processarDestaques = (slide) => {
    // 1. Limpar destaques fornecidos pelo LLM para garantir que só contêm palavras do texto principal/secundário
    if (slide.destaques && Array.isArray(slide.destaques) && slide.destaques.length > 0) {
      const fullText = `${slide.texto_principal || ''} ${slide.texto_secundario || ''}`.toLowerCase();
      // Remove a pontuação para comparar melhor, mas o includes funciona bem como aproximação
      slide.destaques = slide.destaques.filter(d => fullText.includes(d.toLowerCase()));
    }

    // 2. Se ficar vazio, faz a extração automática
    if (!slide.destaques || slide.destaques.length === 0) {
      slide.destaques = [
        ...extractHighlights(slide.texto_principal),
        ...extractHighlights(slide.texto_secundario)
      ].slice(0, 3);
    }
  };

  if (copy.slides && Array.isArray(copy.slides)) {
    copy.slides.forEach(processarDestaques);
  }
  if (copy.conteudo && Array.isArray(copy.conteudo)) {
    copy.conteudo.forEach(processarDestaques);
  } else if (copy.conteudo) {
    processarDestaques(copy.conteudo);
  }

  // Fallback 1: se for post mas ele mandou slides[0]
  if (originalTipo === 'post' && !copy.conteudo && copy.slides && copy.slides.length > 0) {
    copy.conteudo = copy.slides[0];
    delete copy.slides;
  }
  
  if (!parsedJson) return null;
  if (parsedJson?.conteudo || parsedJson?.slides) return copy;
  
  let parsed = parsedJson;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      console.warn('⚠️ normalizeOutput: string JSON inválida, ignora', e.message);
      return null;
    }
  }
  
  let conteudo = null;
  let slides = null;
  if (Array.isArray(parsed)) {
    slides = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (parsed.texto_principal || parsed.conteudo) {
      conteudo = {
        texto_principal: parsed.texto_principal || parsed.conteudo?.texto_principal || '',
        texto_secundario: parsed.texto_secundario || parsed.conteudo?.texto_secundario || '',
        frase_final: parsed.frase_final || parsed.conteudo?.frase_final || '',
        destaques: parsed.destaques || parsed.conteudo?.destaques || [],
        descricao_base: parsed.descricao_base || parsed.conteudo?.descricao_base || '',
        descricao_visual_pt: parsed.descricao_visual_pt || parsed.conteudo?.descricao_visual_pt || '',
      };
    }
    if (parsed.slides) slides = parsed.slides;
  }
  return { conteudo, slides };
}

// ── GERAÇÃO PRINCIPAL ────────────────────────────────────────────────────────

export async function generateContent(tipo, tema, qtd, autor, marketingContext = { canal: 'organico', objetivo: 'engajamento', nivel_funil: 'topo' }, estilo_base = "editorial_minimalist") {
  const temaSafe = (tema || '').replace(/\\/g, '/');
  const memoria = loadMemory();
  const hookContext = getHookRotationContext(memoria);

  const isCitacaoCommand = temaSafe.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'citacao';
  const realQtd = tipo === 'post' ? 1 : qtd;
  const isSpecificQuote = autor && !isCitacaoCommand && temaSafe.length > 20;

  if (autor && isSpecificQuote) {
    console.log('💎 [Economia] Texto direto detectado. Gerando card localmente (Custo 0)...');
    return {
      tipo: 'post',
      tema: temaSafe,
      autor: autor,
      conteudo: {
        texto_principal: temaSafe,
        texto_secundario: '',
        frase_final: '',
        destaques: [],
        descricao_base: "Portrait of " + autor + " ",
        descricao_visual_pt: "Retrato literal de " + autor + " ",
        legenda: {
          texto: "Card de citação de " + autor + ": \"" + tema + "\"",
          hashtags: ["#" + autor.toLowerCase() + " ", "#psicanalise"],
        }
      },
    };
  }

  // ── CLASSIFICAÇÃO DE CONTEÚDO (V2) ──────────────────────────────────────────
  const classificacao = classificarConteudo({ tipo, qtdSlides: realQtd, hasAutor: !!autor, tema: temaSafe });
  const variacao = gerarVariacaoCriativa(classificacao.categoria);
  console.log(`   🏷️ [Classifier] Categoria: ${classificacao.categoria} | Subtipo: ${classificacao.subtipo} | Persona: ${classificacao.usarPersona === false ? 'NUNCA' : classificacao.usarPersona === true ? 'SEMPRE' : 'DECIDIR'}`);

  // ── PERSONA DINÂMICA (V2) — substitui hardcode "same woman 30s" ─────────────
  const isMaleTheme = temaSafe.toLowerCase().includes('homem') || temaSafe.toLowerCase().includes('masculino') || temaSafe.toLowerCase().includes('pai') || temaSafe.toLowerCase().includes('masc');
  const genderHint = isMaleTheme ? 'masculino' : 'feminino';

  const persona = selecionarPersona({
    categoria: classificacao.categoria,
    genero: genderHint,
    styleCategory: estilo_base.includes('painterly') ? 'painterly' : estilo_base.includes('cinematic') ? 'rich' : 'clean',
  });
  console.log(`   👤 [PersonaBank] Persona: ${persona.id} | Abstrata: ${persona.isAbstract} | NoPerson: ${persona.isNoPerson}`);

  // Gerar visualProgression dinâmica baseada na persona selecionada
  const personaTag = persona.isNoPerson
    ? 'No human faces or figures'
    : persona.isAbstract
      ? persona.prompt
      : `same ${persona.prompt}`;

  const visualProgression = [
    `${personaTag}, reflective expression, soft beige background, bright soft lighting`,
    `${personaTag}, holding symbolic object, clean neutral setting, bright editorial light`,
    `${personaTag}, looking at mirror, soft warm room, bright balanced exposure`,
    `${personaTag}, sitting thoughtfully, minimal bright environment, soft window light`,
    `${personaTag}, moment of realization, clean bright space, editorial lighting`,
    `${personaTag}, standing near open window with light, hopeful pose, bright tones`,
    `${personaTag}, holding phone with calm confidence, bright clean background`,
    `${personaTag}, peaceful resolution, soft beige setting, bright editorial aesthetic`,
  ];

  const antiRepetitionBlock = buildAntiRepetitionContext(memoria);
  const adaptiveBlock = buildAdaptiveContext();
  const hookInstruction = buildHookPromptInstruction(hookContext);
  const hashtagsSugeridas = buildHashtags();

  const passosEstrutura = hookContext.estrutura || [
    "hook_impacto", "sintoma_sobrecarga", "raiz_passado",
    "padrao_repeticao", "consciencia_revelacao", "solucao_possibilidade", "cta_conversao",
  ];

  const systemPrompt = buildSystemPrompt();

  let execucaoSchema;
  if (tipo === 'carrossel') {
    execucaoSchema = buildCarrosselSchema(passosEstrutura, realQtd, visualProgression, hashtagsSugeridas, hookContext, temaSafe, marketingContext, estilo_base);
  } else if (autor || isCitacaoCommand) {
    execucaoSchema = '{\n    \"meta\": {\"modo\": \"post\", \"plataforma\": \"instagram\"},\n    \"marketing\": {\"canal\": \"' + marketingContext.canal + '\", \"objetivo\": \"' + marketingContext.objetivo + '\", \"nivel_funil\": \"' + marketingContext.nivel_funil + '\"},\n    \"estrategia\": {\"emocao_principal\": \"\"},\n    \"conteudo\": {\n      \"texto_principal\": \"\",\n      \"texto_secundario\": \"\",\n      \"frase_final\": \"\",\n      \"destaques\": [\"palavra1\", \"palavra2\"],\n      \"descricao_base\": \"\",\n      \"descricao_visual_pt\": \"\"\n    },\n    \"legenda\": {\n      \"texto\": \"\",\n      \"hashtags\": []\n    }\n  }';
  } else {
    execucaoSchema = '{\n    \"meta\": {\"modo\": \"post\", \"plataforma\": \"instagram\"},\n    \"marketing\": {\"canal\": \"' + marketingContext.canal + '\", \"objetivo\": \"' + marketingContext.objetivo + '\", \"nivel_funil\": \"' + marketingContext.nivel_funil + '\"},\n    \"estrategia\": {\"emocao_principal\": \"\"},\n    \"conteudo\": {\n      \"texto_principal\": \"\",\n      \"texto_secundario\": \"\",\n      \"frase_final\": \"\",\n      \"destaques\": [\"palavra1\", \"palavra2\"],\n      \"descricao_base\": \"\",\n      \"descricao_visual_pt\": \"\"\n    },\n    \"legenda\": {\n      \"texto\": \"\",\n      \"hashtags\": []\n    }\n  }';
  }

  // ── Blocos de Classificação e Variação Criativa ────────────────────────────
  const categoriaBlock = buildCategoriaPrompt(classificacao);
  const variacaoBlock = buildVariacaoCriativaPrompt(variacao);

  const userPrompt =
    '# 🎯 TEMA E PERSONA\n    \"'
    + temaSafe
    + '\"'
    + '\n      (Se o tema mencionar persona específica como mulheres, mães ou profissionais, TODO O CONTEÚDO deve usar exemplos e dores reais dessa rotina.)'
    + '\n' + categoriaBlock
    + '\n' + variacaoBlock
    + '\n' + buildStrategiaInstructions(temaSafe, hookContext)
    + '\n' + hookInstruction
    + '\n' + execucaoSchema
    + '\n' + buildVisualInstructions(estilo_base)
    + '\n' + antiRepetitionBlock
    + '\n' + adaptiveBlock
    + '\n' + '\n# 🚨 REGRAS FINAIS'
    + '\n      - Responda APENAS com JSON puro, sem markdown, sem comentários'
    + '\n        - NÃO incluir campo \"slide_role\" na saída'
    + '\n          - JSON deve ser válido e completo'
    + '\n            - NÃO repetir ideias entre slides'
    + '\n  ';

  // ── GERAÇÃO VIA AI ORCHESTRATOR ───────────────────────────────────────────
  try {
    const aiResponseText = await runAI(userPrompt, systemPrompt);
    
    let text = aiResponseText.replace(/^json\s*/gi, '').replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```$/g, '').trim();
    text = text.replace(/"slide_role"\s*:\s*"[^\"]*"\,?\s*/g, '');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(text);
    let normalized = normalizeOutput(parsed, tipo);
    // Aplicar normalização V2 do classifier (slides[], modo fix)
    normalized = normalizarOutput(normalized);
    if (!normalized?.conteudo && !normalized?.slides) {
      throw new Error('Estrutura de output inválida após normalização.');
    }
    // Injetar metadata de classificação e persona
    normalized._classificacao = classificacao;
    normalized._persona = { id: persona.id, isAbstract: persona.isAbstract, isNoPerson: persona.isNoPerson };
    normalized._variacao = variacao;
    return normalized;
  } catch (error) {
    console.error('❌ Falha na geração via AI Orchestrator:', error.message);
    throw new Error('Todas as tentativas de geração de conteúdo falharam: ' + error.message);
  }
}

export default generateContent;
