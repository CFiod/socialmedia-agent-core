/**
 * ============================================================
 * 🏷️ CONTENT CLASSIFIER (v1.0) — Classificação de Conteúdo
 * ============================================================
 * Classifica o conteúdo em 4 categorias estratégicas:
 *   carrossel → storytelling progressivo, persona consistente
 *   post      → conteúdo único, pode ou não ter persona
 *   growth    → alto engajamento, foco em contraste/dor/curiosidade
 *   autor     → pensamento/reflexão, ZERO persona, tipografia forte
 *
 * CORREÇÕES IMPLEMENTADAS:
 *   - 1 slide = modo "post" (nunca "carrossel")
 *   - Padronização de output: sempre usar "slides" (sem "conteudo")
 *   - Sistema de variação criativa (ângulo, hook, estilo visual)
 *   - Scoring de qualidade (0–100)
 * ============================================================
 */

// ── CLASSIFICAÇÃO AUTOMÁTICA ─────────────────────────────────────────────────

/**
 * Classifica o tipo de conteúdo com base nos parâmetros de entrada.
 *
 * @param {Object} params
 * @param {string} params.tipo — tipo solicitado pelo usuário (post, carrossel, growth, autor)
 * @param {number} params.qtdSlides — quantidade de slides gerados
 * @param {boolean} params.hasAutor — se foi passado um autor (citação)
 * @param {string} params.tema — tema do post
 * @returns {Object} — { categoria, subtipo, usarPersona, formato }
 */
export function classificarConteudo({ tipo, qtdSlides = 1, hasAutor = false, tema = '' }) {
  // ── REGRA CRÍTICA: 1 slide = modo post ────────────────────────────────────
  if (qtdSlides === 1 && tipo === 'carrossel') {
    console.log('   ⚠️ [Classifier] 1 slide detectado — forçando modo "post"');
    tipo = 'post';
  }

  // ── Autor explícito ────────────────────────────────────────────────────────
  if (tipo === 'autor' || hasAutor) {
    return {
      categoria: 'autor',
      subtipo: detectarSubtipoAutor(tema),
      formato: 'texto_visual',
      usarPersona: false,
      regras: {
        maxPersonaScale: 0,
        backgroundTipo: 'minimal',
        focoTipografia: true,
        estiloPreferido: 'typography_focus',
      },
    };
  }

  // ── Growth ──────────────────────────────────────────────────────────────────
  if (tipo === 'growth') {
    return {
      categoria: 'growth',
      subtipo: 'viral',
      formato: 'single',
      usarPersona: null, // decidido pelo persona_bank (30%)
      regras: {
        maxPersonaScale: 0.5,
        backgroundTipo: 'abstract',
        focoTipografia: false,
        prioridadeCriativa: ['contraste', 'curiosidade', 'dor'],
      },
    };
  }

  // ── Carrossel ──────────────────────────────────────────────────────────────
  if (tipo === 'carrossel') {
    return {
      categoria: 'carrossel',
      subtipo: 'storytelling',
      formato: 'multi',
      usarPersona: true, // sempre, com consistência
      regras: {
        maxPersonaScale: 0.7,
        backgroundTipo: 'contextual',
        focoTipografia: false,
        repetirPersona: true,
      },
    };
  }

  // ── Post (default) ─────────────────────────────────────────────────────────
  return {
    categoria: 'post',
    subtipo: 'direto',
    formato: 'single',
    usarPersona: null, // decidido pelo persona_bank (50%)
    regras: {
      maxPersonaScale: 0.6,
      backgroundTipo: 'minimal',
      focoTipografia: false,
    },
  };
}

// ── SUBTIPO AUTOR ────────────────────────────────────────────────────────────

function detectarSubtipoAutor(tema) {
  if (!tema) return 'pensamento';
  const temaLow = tema.toLowerCase();

  if (temaLow.includes('frase') || temaLow.includes('quote') || temaLow.includes('citação') || temaLow.includes('citacao'))
    return 'frase_viral';
  if (temaLow.includes('reflexão') || temaLow.includes('reflexao') || temaLow.includes('pensar'))
    return 'reflexao';
  if (temaLow.includes('autoridade') || temaLow.includes('expert') || temaLow.includes('especialista'))
    return 'autoridade';

  return 'pensamento';
}

// ── VARIAÇÃO CRIATIVA ────────────────────────────────────────────────────────

/**
 * Gera parâmetros de variação criativa para o conteúdo.
 * Injetado no prompt para garantir diversidade.
 *
 * @param {string} categoria — carrossel | post | growth | autor
 * @returns {Object} — { angulo, formato_hook, estilo_visual }
 */
export function gerarVariacaoCriativa(categoria) {
  const ANGULOS = ['emocional', 'logico', 'provocativo', 'educativo'];
  const HOOKS = ['pergunta', 'afirmacao', 'choque', 'historia'];
  const ESTILOS = ['editorial', 'cinematic', 'minimal', 'bold'];

  // Pesos por categoria
  const pesosPorCategoria = {
    carrossel: {
      angulos: { emocional: 0.4, logico: 0.1, provocativo: 0.3, educativo: 0.2 },
      hooks: { pergunta: 0.2, afirmacao: 0.3, choque: 0.3, historia: 0.2 },
      estilos: { editorial: 0.3, cinematic: 0.4, minimal: 0.2, bold: 0.1 },
    },
    post: {
      angulos: { emocional: 0.3, logico: 0.2, provocativo: 0.3, educativo: 0.2 },
      hooks: { pergunta: 0.3, afirmacao: 0.3, choque: 0.2, historia: 0.2 },
      estilos: { editorial: 0.3, cinematic: 0.2, minimal: 0.3, bold: 0.2 },
    },
    growth: {
      angulos: { emocional: 0.2, logico: 0.1, provocativo: 0.5, educativo: 0.2 },
      hooks: { pergunta: 0.3, afirmacao: 0.2, choque: 0.4, historia: 0.1 },
      estilos: { editorial: 0.2, cinematic: 0.2, minimal: 0.2, bold: 0.4 },
    },
    autor: {
      angulos: { emocional: 0.4, logico: 0.2, provocativo: 0.2, educativo: 0.2 },
      hooks: { pergunta: 0.2, afirmacao: 0.4, choque: 0.2, historia: 0.2 },
      estilos: { editorial: 0.4, cinematic: 0.1, minimal: 0.4, bold: 0.1 },
    },
  };

  const pesos = pesosPorCategoria[categoria] || pesosPorCategoria.post;

  const angulo = weightedPick(pesos.angulos);
  const formato_hook = weightedPick(pesos.hooks);
  const estilo_visual = weightedPick(pesos.estilos);

  console.log(`   🎨 [Classifier] Variação Criativa: ângulo=${angulo}, hook=${formato_hook}, visual=${estilo_visual}`);

  return {
    angulo,
    formato_hook,
    estilo_visual,
  };
}

// ── NORMALIZAÇÃO DE OUTPUT ───────────────────────────────────────────────────

/**
 * Normaliza o output do LLM removendo duplicidades.
 * REGRA: sempre usar "slides" como array, nunca "conteudo" como wrapper.
 *
 * @param {Object} dataJson — output bruto do LLM
 * @returns {Object} — output normalizado
 */
export function normalizarOutput(dataJson) {
  if (!dataJson) return dataJson;

  // Se tem "conteudo" como objeto único → converter para slides[0]
  if (dataJson.conteudo && !Array.isArray(dataJson.conteudo) && !dataJson.slides) {
    dataJson.slides = [dataJson.conteudo];
    // Manter conteudo para backward compat, mas slides é a fonte primária
  }

  // Se slides tem apenas 1 item → modo = post
  if (dataJson.slides && dataJson.slides.length === 1) {
    if (dataJson.meta) {
      dataJson.meta.modo = 'post';
    }
  }

  // Garantir que slides existe
  if (!dataJson.slides && dataJson.conteudo) {
    if (Array.isArray(dataJson.conteudo)) {
      dataJson.slides = dataJson.conteudo;
    } else {
      dataJson.slides = [dataJson.conteudo];
    }
  }

  return dataJson;
}

// ── UTILIDADE ────────────────────────────────────────────────────────────────

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

// ── PROMPT BLOCK: VARIAÇÃO CRIATIVA ──────────────────────────────────────────

/**
 * Gera o bloco de prompt para injetar variação criativa.
 *
 * @param {Object} variacao — resultado de gerarVariacaoCriativa()
 * @returns {string} — bloco de texto para o prompt
 */
export function buildVariacaoCriativaPrompt(variacao) {
  return `
# 🎲 VARIAÇÃO CRIATIVA (OBRIGATÓRIA)
Siga estas diretrizes de variação para este conteúdo específico:

- ÂNGULO DE ABORDAGEM: ${variacao.angulo.toUpperCase()}
  ${variacao.angulo === 'emocional' ? '→ Foque na DOR emocional, identificação visceral, sensação crua.' : ''}
  ${variacao.angulo === 'logico' ? '→ Foque em CAUSA e EFEITO, explicação clara, insight racional.' : ''}
  ${variacao.angulo === 'provocativo' ? '→ QUEBRE uma crença. Provoque desconforto. Confronte.' : ''}
  ${variacao.angulo === 'educativo' ? '→ Revele um MECANISMO oculto. Explique o "por quê" de forma simples.' : ''}

- FORMATO DO HOOK: ${variacao.formato_hook.toUpperCase()}
  ${variacao.formato_hook === 'pergunta' ? '→ Comece com uma PERGUNTA que gera identificação imediata.' : ''}
  ${variacao.formato_hook === 'afirmacao' ? '→ Comece com uma AFIRMAÇÃO forte e direta.' : ''}
  ${variacao.formato_hook === 'choque' ? '→ Comece com um FATO CHOCANTE ou verdade desconfortável.' : ''}
  ${variacao.formato_hook === 'historia' ? '→ Comece com uma MICRO-HISTÓRIA (1 frase que cria cena).' : ''}

- ESTILO VISUAL: ${variacao.estilo_visual.toUpperCase()}
  ${variacao.estilo_visual === 'editorial' ? '→ Composição limpa, tipografia elegante, revista premium.' : ''}
  ${variacao.estilo_visual === 'cinematic' ? '→ Profundidade cinematográfica, luz narrativa, mood forte.' : ''}
  ${variacao.estilo_visual === 'minimal' ? '→ Espaço negativo dominante, poucos elementos, impacto máximo.' : ''}
  ${variacao.estilo_visual === 'bold' ? '→ Contraste forte, tipografia grande, cores vibrantes.' : ''}
`;
}

// ── PROMPT BLOCK: CATEGORIA DE CONTEÚDO ──────────────────────────────────────

/**
 * Gera o bloco de prompt para a categoria de conteúdo.
 *
 * @param {Object} classificacao — resultado de classificarConteudo()
 * @returns {string}
 */
export function buildCategoriaPrompt(classificacao) {
  const { categoria, subtipo } = classificacao;

  const blocos = {
    carrossel: `
# 📌 CATEGORIA: CARROSSEL (Storytelling Progressivo)
- Tipo: ${subtipo}
- Persona: OBRIGATÓRIA — mesma pessoa em TODOS os slides
- Progressão emocional obrigatória entre slides
- Cada slide avança a narrativa
- NUNCA repetir a mesma emoção em 2 slides seguidos`,

    post: `
# 📌 CATEGORIA: POST ÚNICO (Conteúdo Direto)
- Tipo: ${subtipo}
- Persona: OPCIONAL (50% chance — será decidido pelo sistema)
- Máximo impacto em 1 imagem
- Copy curta e certeira
- descricao_visual PODE ou NÃO incluir pessoa humana`,

    growth: `
# 📌 CATEGORIA: GROWTH (Alto Engajamento)
- Tipo: ${subtipo}
- Persona: RARA (30% chance — será decidido pelo sistema)
- Foco TOTAL em: contraste, curiosidade, dor
- NÃO depender de rosto humano para engajamento
- Copy provocativa e scroll-stopping
- descricao_visual: prefira cenas simbólicas, objetos, metáforas`,

    autor: `
# 📌 CATEGORIA: AUTOR (Pensamento/Reflexão)
- Tipo: ${subtipo}
- Persona: ZERO — PROIBIDO usar pessoa humana
- Formato: fundo clean + tipografia forte + frase impactante
- descricao_visual: "minimalist background, soft gradient, modern typography, centered text, editorial style, high contrast"
- A IMAGEM é secundária — o TEXTO é o protagonista
- Estilo de pensador/filósofo — frase viral com peso emocional`,
  };

  return blocos[categoria] || blocos.post;
}

export default classificarConteudo;
