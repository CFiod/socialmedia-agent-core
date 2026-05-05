/**
 * ============================================================
 * 🔥 adaptive_pre_render_validator (v15.0)
 *    + Hook Score expandido — cobre expressões naturais em PT-BR
 *    + Slide 2 mínimo reduzido 10→6 (alinhado ao blueprint punchy)
 *    + Slide 2 raso → auto-correção ao invés de hard-reject
 *    + Redundância Estrutural: Jaccard > 0.7 → isValid: false
 *    + Limites de comprimento máximo por slide
 * ============================================================
 */

// ─── CONFIGURAÇÕES E BANCOS ──────────────────────────────────────────────────

const PALAVRAS_PROFUNDAS = ["dor", "angústia", "trauma", "vazio", "ferida", "sofrimento", "pesado", "peso", "esgotamento", "medo", "culpa", "ansiedade", "cansada", "cansaço"];

const VARIACOES_INICIO = [
  "Tem dias que...",
  "Às vezes...",
  "Você já percebeu que...",
  "Parece que...",
  "Mesmo quando tudo parece ok...",
  "Sabe aquela sensação de...",
];

const COMPLEMENTOS_HUMANOS = [
  " — e isso cansa.",
  ", mesmo quando você tenta ignorar.",
  " — e ninguém parece perceber.",
  " — e isso vai se acumulando.",
  " — mesmo sem entender por quê.",
  " — e o peso só vai aumentando.",
];

const CTA_PADRAO_PRINCIPAL = "Se você se identificou com isso";
const CTA_PADRAO_SECUNDARIO = 'Me chama no WhatsApp: QUERO ENTENDER';

const PALAVRAS_TECH = ['padrão', 'inconsciente', 'sintoma', 'elaborado', 'repetição', 'transferência', 'pesado', 'silêncio', 'disfarçar', 'máscara', 'abandono', 'vazio'];
const PALAVRAS_BANIDAS_DESTAQUE = ['precisa', 'você', 'como', 'algo', 'isso', 'vezes', 'quer', 'melhor', 'onde', 'está', 'muito'];

// ─── ENGINE 1: LINTER BÁSICO ─────────────────────────────────────────────────────

function humanizarTexto(text, tipo) {
  if (!text || text.length < 5 || tipo === 'cta') return text;
  let result = text.trim();

  // A. Limpeza de vícios de IA
  result = result.replace(/^(isso|algo|coisa|basicamente)\s+/i, "");

  // B. Capitalização Forçada
  return result[0].toUpperCase() + result.slice(1);
}

// ─── ENGINE 2: CORRETOR GRAMATICAL E SEMÂNTICO ────────────────────────────────

function applySemantics(slide, tipo, index) {
  let p = slide.texto_principal || "";
  let s = slide.texto_secundario || "";

  // 1. Correções de Concordância Automática (Gênero e Pessoa)
  p = p.replace(/sensação\s+([a-z]+)o/gi, "sensação $1a");
  s = s.replace(/sensação\s+([a-z]+)o/gi, "sensação $1a");
  
  // Corretor de Pessoa: "Você sento" -> "Você sente" | "Você falo" -> "Você fala"
  p = p.replace(/você\s+([a-z]+)o\b/gi, (m, v) => `Você ${v.endsWith('ent') ? v + 'e' : (v.endsWith('al') ? v + 'a' : v + 'e')}`);
  s = s.replace(/você\s+([a-z]+)o\b/gi, (m, v) => `Você ${v.endsWith('ent') ? v + 'e' : (v.endsWith('al') ? v + 'a' : v + 'e')}`);

  // Corretor de pronomes arcaicos (Vosso -> Seu)
  p = p.replace(/\bvosso\b/gi, m => m[0] === 'V' ? 'Seu' : 'seu')
       .replace(/\bvossa\b/gi, m => m[0] === 'V' ? 'Sua' : 'sua')
       .replace(/\bvossos\b/gi, m => m[0] === 'V' ? 'Seus' : 'seus')
       .replace(/\bvossas\b/gi, m => m[0] === 'V' ? 'Suas' : 'suas');
       
  s = s.replace(/\bvosso\b/gi, m => m[0] === 'V' ? 'Seu' : 'seu')
       .replace(/\bvossa\b/gi, m => m[0] === 'V' ? 'Sua' : 'sua')
       .replace(/\bvossos\b/gi, m => m[0] === 'V' ? 'Seus' : 'seus')
       .replace(/\bvossas\b/gi, m => m[0] === 'V' ? 'Suas' : 'suas');

  // -- PONTUAÇÃO CONTÍNUA --
  // Quando texto_secundario é continuação direta do texto_principal,
  // a pontuação (? ! .) deve estar SOMENTE no texto_secundario.
  const CONTINUATION_WORDS = /^(para|mas|mesmo|e\s|quando|porque|sem|só|ainda|que\s|como\s|onde|se\s)/i;
  if (s && CONTINUATION_WORDS.test(s.trim())) {
    const oldP = p;
    p = p.replace(/[?!.]+\s*$/, '').trim();
    if (p !== oldP) {
      console.log(`  🔧 [Pontuação] Slide ${index + 1} — Removida pontuação do texto_principal (continuação detectada)`);
    }
  }

  // -- VALIDAÇÃO DE QUALIDADE --

  // Trava de CTA (Garante acolhimento e menção ao WhatsApp)
  if (tipo === 'cta') {
    if (!s.toLowerCase().includes('whatsapp') && !p.toLowerCase().includes('whatsapp')) {
        s = "Me chama no WhatsApp e vamos conversar sem pressão.";
    }
  }

  // ── SANITIZAÇÃO DE VOZ: conosco → comigo (profissional solo) ──────────────
  const sanitizeVoz = (txt) => {
    if (!txt) return txt;
    return txt
      .replace(/\b[Ff]ale conosco\b/g, 'Fale comigo')
      .replace(/\b[Cc]onverse conosco\b/g, 'Me chama')
      .replace(/\b[Cc]onosco\b/g, 'comigo')
      .replace(/\b[Nn]osso\b/g, 'meu')
      .replace(/\b[Nn]ossa\b/g, 'minha')
      .replace(/\b[Nn]ossos\b/g, 'meus')
      .replace(/\b[Nn]ossas\b/g, 'minhas');
  };
  p = sanitizeVoz(p);
  s = sanitizeVoz(s);

  // Capitalização Forçada (Sempre)
  p = p[0].toUpperCase() + p.slice(1);
  s = (s && s[0]) ? s[0].toUpperCase() + s.slice(1) : s;

  return { p, s };
}

// ─── ENGINE 3: ANTI-SCROLL (HOOK SCORE) ──────────────────────────────────────

// Banco de palavras emocionais ampliado para hooks em PT-BR
const PALAVRAS_HOOK_EMOCIONAL = [
  // Dores
  "dor", "angústia", "trauma", "vazio", "ferida", "sofrimento", "pesado", "peso",
  "esgotamento", "medo", "culpa", "ansiedade", "cansada", "cansaço", "exausto",
  "exaustão", "sufoca", "sufocando", "perdido", "perdida", "sozinho", "sozinha",
  "abandono", "rejeição", "inadequado", "inadequada", "impostor", "impostora",
  "inseguro", "insegura", "fracasso", "falha", "fracassando", "incapaz",
  "infância", "passado", "padrão", "repetição", "bloqueado", "bloqueada",
  "silêncio", "sente", "carrega", "preso", "presa", "invisível",
];

function scoreHook(p, s) {
  const text = `${p} ${s}`.toLowerCase();
  let score = 0;

  // Critério 1: Padrões de confronto/contraste (original + expandido)
  if (/não é|não está|não sou|não são|ninguém|mas é|mas não|você acha|será que|por que ainda|mesmo sendo|mesmo tendo/i.test(text)) score++;

  // Critério 2: Pronome direto — personalização
  if (/você|seu|sua|te |teu|tua/i.test(text)) score++;

  // Critério 3: Palavras emocionais profundas (banco expandido)
  if (PALAVRAS_HOOK_EMOCIONAL.some(w => text.includes(w))) score++;

  // Critério 4: Gatilhos de curiosidade/reflexão
  if (/por que|por quê|entender|percebeu|já notou|já sentiu|ainda|continua|molda|define|influencia|explicação|mais do que|nome/i.test(text)) score++;

  return score;
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const inter = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : inter.size / union.size;
}

function detectSlideType(slide, index, total) {
  const text = `${slide.texto_principal || ''} ${slide.texto_secundario || ''}`.toLowerCase();
  if (index === 0) return 'gancho';
  if (index === total - 1) return 'cta';
  if (/quero entender|direct|comenta|envia/i.test(text)) return 'cta';
  if (/você sente|sente isso|você já|percebeu/i.test(text)) return 'identificacao';
  if (/descansando|mesmo assim|continua|não passa/i.test(text)) return 'tensao';
  if (/pode ser|causa|físico|emoções/i.test(text)) return 'causa';
  if (/elaborad|repete|padrão|voltar/i.test(text)) return 'insight';
  return 'insight';
}

// ─── EXPORT PRINCIPAL ────────────────────────────────────────────────────────

export function validateAndCorrectSlides(slides) {
  const correctedSlides = [];
  let totalFixes = 0;

  // ── Acumulador de issues para o retry engine ──────────────────────────────
  const issues = [];
  let isValid = true;

  console.log('\n🔍 [Validator v14] HUMANIZER ENGINE Ativo...');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const tipo = detectSlideType(slide, i, slides.length);
    const problems = [];
    const actions = [];
    
    const before = { p: slide.texto_principal, s: slide.texto_secundario };
    
    // Etapa 1: Correção Semântica e Gramatical
    let { p, s } = applySemantics(slide, tipo, i);
    if (p !== before.p || s !== before.s) {
      problems.push('semantica_correcao');
      actions.push('ajuste_semantico');
    }

    // Etapa 2: Anti-Scroll — HOOK ESTRITO (Slide 1)
    // Mínimo: score >= 1 (antes era 2 — muito restrito para copy punchy)
    if (i === 0) {
      const score = scoreHook(p, s);
      if (score < 1) {
        const issue = `hook_fraco (score ${score}/4) — hook sem elemento emocional ou de identificação`;
        problems.push(issue);
        issues.push({ slide: i + 1, tipo: 'hook_fraco', score, detalhe: issue });
        isValid = false;
        console.log(`  🚨 [RETRY TRIGGER] Slide 1 — Hook score ${score}/4 (mínimo: 1). Sem ancoragem emocional.`);
      } else if (score === 1) {
        // Aviso suave — não invalida, mas registra
        console.log(`  ⚠️  [Hook] Slide 1 — Score ${score}/4 (ok, mas pode melhorar).`);
      }
    }

    // Etapa 2B: Profundidade Descritiva — Slide 2
    // Mínimo: 6 palavras no total (alinhado ao copy curto do blueprint)
    // Abaixo de 6 → auto-correção local, NÃO hard-reject
    if (i === 1) {
      const totalPalavras = `${p} ${s}`.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (totalPalavras < 6) {
        // Auto-correção: adiciona complemento humano sem precisar de retry
        const complemento = COMPLEMENTOS_HUMANOS[Math.floor(Math.random() * COMPLEMENTOS_HUMANOS.length)];
        s = s ? s + complemento : p + complemento;
        problems.push(`slide_2_raso (${totalPalavras} pal.) → auto-corrigido`);
        actions.push('auto_complemento_slide2');
        console.log(`  🔧 [Auto-fix] Slide 2 — ${totalPalavras} palavras → complemento adicionado.`);
      }
      // NOTA: não invalida mais — só corrige. Hard-reject removido pois conflita com copy punchy.
    }

    // Etapa 2C: Limites de Comprimento Máximo (Anti-Textão Extremo - Foco em Conversão)
    const maxP = 10;
    const maxS = 12;
    const lenP = (p || "").trim().split(/\s+/).filter(w => w.length > 0).length;
    const lenS = (s || "").trim().split(/\s+/).filter(w => w.length > 0).length;
    
    if (lenP > maxP && tipo !== 'cta') {
      const issue = `texto_principal_longo (${lenP} palavras) — máx: ${maxP}`;
      problems.push(issue);
      issues.push({ slide: i + 1, tipo: 'limite_excedido', palavras: lenP, detalhe: issue });
      isValid = false;
      console.log(`  🚨 [RETRY TRIGGER] Slide ${i+1} — Texto principal excessivo (${lenP} pal.). MÁX ${maxP}. Conteúdo rejeitado.`);
    }
    
    if (lenS > maxS && tipo !== 'cta') {
      const issue = `texto_secundario_longo (${lenS} palavras) — máx: ${maxS}`;
      problems.push(issue);
      issues.push({ slide: i + 1, tipo: 'limite_excedido', palavras: lenS, detalhe: issue });
      isValid = false;
      console.log(`  🚨 [RETRY TRIGGER] Slide ${i+1} — Texto secundário excessivo (${lenS} pal.). MÁX ${maxS}. Conteúdo rejeitado.`);
    }

    // Etapa 3: Humanização (Fluidez e Ritmo)
    const oldP = p;
    const oldS = s;
    p = humanizarTexto(p, tipo);
    s = humanizarTexto(s, tipo);
    if (p !== oldP || s !== oldS) {
      problems.push('humanizacao');
      actions.push('engine_humanizer');
    }

    // Etapa 4: Anti-Redundância Estrutural — STRICT (Jaccard > 0.7 → isValid: false)
    const jSim = jaccardSimilarity(p, s);
    if (jSim > 0.7) {
      const issue = `redundancia_estrutural (Jaccard: ${jSim.toFixed(2)}) entre principal e secundário`;
      problems.push(issue);
      issues.push({ slide: i + 1, tipo: 'redundancia_estrutural', jaccard: jSim.toFixed(2), detalhe: issue });
      isValid = false;
      console.log(`  🚨 [RETRY TRIGGER] Slide ${i+1} — Redundância ${(jSim * 100).toFixed(0)}% entre textos. Conteúdo rejeitado.`);
    } else if (jSim > 0.5) {
      // Aviso suave (não invalida)
      problems.push(`redundancia_moderada (Jaccard: ${jSim.toFixed(2)}) — ok, mas atentar`);
    }

    const corrected = { ...slide, texto_principal: p, texto_secundario: s };

    // Etapa 5: Validação de Destaques (Existência Real e Força)
    if (!corrected.destaques) corrected.destaques = [];
    
    const fullText = (p + " " + s).toLowerCase();
    
    // Descarta o que a IA mandou se for palavra muito curta ou banida (dor=3, então check > 2)
    corrected.destaques = corrected.destaques.filter(d => {
        const lowD = d.toLowerCase();
        return fullText.includes(lowD) && !PALAVRAS_BANIDAS_DESTAQUE.includes(lowD) && lowD.length > 2;
    });

    // Extrai palavras puras do texto atual
    const wordsInText = fullText.replace(/[.,!?]/g, "").split(/\s+/);
    const deepCandidates = wordsInText.filter(w => PALAVRAS_PROFUNDAS.some(prof => w.includes(prof)) || PALAVRAS_TECH.some(tech => w.includes(tech)));

    if (deepCandidates.length > 0) {
        // O override definitivo: se a palavra profunda existe ali, ELA é o destaque, ignoramos a IA.
        corrected.destaques = [deepCandidates[0]];
    } else if (corrected.destaques.length === 0) {
        let fallbackWords = wordsInText.filter(w => w.length > 3 && !PALAVRAS_BANIDAS_DESTAQUE.includes(w));
        fallbackWords.sort((a, b) => b.length - a.length);
        corrected.destaques = fallbackWords.length > 0 ? [fallbackWords[0]] : ["você"];
    }

    correctedSlides.push(corrected);

    if (problems.length > 0) {
      totalFixes++;
      console.log(`  ⚡ Slide ${i+1} [${tipo.toUpperCase()}]: ${problems.join(', ')}`);
      if (before.s !== s) console.log(`     S: "${before.s}" → "${s}"`);
      if (before.p !== p) console.log(`     P: "${before.p}" → "${p}"`);
    }
  }

  const statusIcon = isValid ? '✅' : '❌';
  console.log(`\n  📊 ${totalFixes}/${slides.length} slides otimizados | ${statusIcon} isValid: ${isValid}${issues.length > 0 ? ` | ${issues.length} issue(s) detectado(s)` : ''}\n`);

  return { slides: correctedSlides, isValid, issues };
}

export function validateCaption(caption) {
  if (!caption) return null;
  const signals = [/template/i, /legenda emocional/i, /desenvolva:/i];
  return signals.some(p => p.test(caption)) ? null : caption;
}
