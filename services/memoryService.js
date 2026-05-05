import fs from 'fs';
import path from 'path';

const MEMORY_DIR  = path.resolve('memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json');
const ADAPTS_FILE = path.join(MEMORY_DIR, 'adaptations.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (_) {}
  return fallback;
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── MEMÓRIA PRINCIPAL ────────────────────────────────────────────────────────

/** Retorna os últimos N posts aprovados */
export function loadMemory(limit = 10) {
  const mem = loadJSON(MEMORY_FILE, { posts: [] });
  return mem.posts.slice(-limit);
}

/**
 * Salva um post aprovado na memória.
 * Extrai só o que importa (anti-poluição).
 */
export function saveToMemory(dataJson, metaJson) {
  ensureMemoryDir();
  const mem = loadJSON(MEMORY_FILE, { posts: [] });

  const slides  = dataJson.slides || (dataJson.conteudo ? [dataJson.conteudo] : []);
  const firstSlide = slides[0] || {};
  const lastSlide  = slides[slides.length - 1] || {};

  const entry = {
    id:         metaJson.data_agendada?.slice(0, 10) + '-' + Date.now(),
    data:       metaJson.data_agendada?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tema:       dataJson.tema || '',
    hook_type:  dataJson.hook_id || '',
    arquetipo_id: dataJson.hook_id || '',
    estrutura_usada: dataJson.hook_id || '',
    palavras_chave: slides.flatMap(s => s.destaques || []).slice(0, 5),
    inicio_slide_1: firstSlide.texto_principal?.split(' ').slice(0, 3).join(' ') || '',
    hook:       firstSlide.texto_principal || '',
    sintomas:   slides[1]?.destaques || [],
    insight:    slides[4]?.texto_secundario || '',
    cta:        lastSlide.texto_secundario || '',
    hashtags:   (dataJson.hashtags || []).slice(0, 5),
    // ── COMPOSITION ENGINE: Rastrear composição e estilo ───────────────────
    composicao: metaJson._composicao?.tipo || '',
    estilo_usado: dataJson.estilo_visual?.base || '',
    // ── PERSONA BANK V2: Rastrear persona usada ─────────────────────────
    persona_usada: metaJson._persona?.id || dataJson._persona?.id || '',
    categoria_conteudo: metaJson._classificacao?.categoria || dataJson._classificacao?.categoria || '',
  };

  mem.posts.push(entry);
  saveJSON(MEMORY_FILE, mem);
  console.log('🧠 [Memória] Post aprovado salvo na memória principal.');
}

// ─── COMPOSIÇÃO: ÚLTIMAS USADAS (para anti-repetição) ─────────────────────────

/**
 * Retorna as últimas N composições usadas.
 * Usado pelo composition_engine para evitar repetição.
 *
 * @param {number} limit — quantas composições recentes retornar
 * @returns {string[]} — array de tipos de composição (ex: ['center_focus', 'side_weight'])
 */
export function getUltimasComposicoes(limit = 5) {
  const mem = loadJSON(MEMORY_FILE, { posts: [] });
  return mem.posts
    .slice(-limit)
    .map(p => p.composicao)
    .filter(Boolean);
}

/**
 * Conta quantos posts recentes tiveram personagem humano.
 * Usado pelo composition_engine para anti-fadiga visual.
 *
 * @param {number} limit — quantos posts recentes verificar
 * @returns {number} — contagem de posts com humano consecutivos
 */
export function getRecentHumanCount(limit = 5) {
  const mem = loadJSON(MEMORY_FILE, { posts: [] });
  const recent = mem.posts.slice(-limit);
  let count = 0;
  // Conta consecutivos do mais recente para trás
  for (let i = recent.length - 1; i >= 0; i--) {
    const comp = recent[i].composicao;
    if (comp && comp !== 'symbolic_scene' && comp !== 'negative_space') {
      count++;
    } else {
      break; // Para na primeira composição sem pessoa
    }
  }
  return count;
}

// ─── PERSONA BANK: Últimas personas usadas (para anti-repetição) ──────────────

/**
 * Retorna as últimas N personas usadas.
 * @param {number} limit
 * @returns {string[]} — array de IDs de persona
 */
export function getRecentPersonas(limit = 5) {
  const mem = loadJSON(MEMORY_FILE, { posts: [] });
  return mem.posts
    .slice(-limit)
    .map(p => p.persona_usada)
    .filter(Boolean);
}

/**
 * Registra uma persona usada (chamado após aprovação).
 * @param {string} personaId
 */
export function savePersonaUsed(personaId) {
  // Já salvo via saveToMemory — esta função é um stub para compat
  // A persona é rastreada no campo persona_usada do entry
}

// ─── CONTEXTO ANTI-REPETIÇÃO ──────────────────────────────────────────────────

/**
 * Gera um bloco de texto para injetar no prompt,
 * listando hooks e insights recentes para evitar repetição.
 */
export function buildAntiRepetitionContext(memoria) {
  // loadMemory() retorna um array direto; normaliza para ambos os formatos
  const posts = Array.isArray(memoria) ? memoria : (Array.isArray(memoria?.posts) ? memoria.posts : []);
  const recent = posts.slice(-6);
  if (!recent.length) return '';

  const estruturas = [...new Set(recent.map(p => p.estrutura_usada).filter(Boolean))].slice(-3);
  const aberturas = [...new Set(recent.map(p => p.inicio_slide_1).filter(Boolean))].slice(-5);
  const palavras = [...new Set(recent.flatMap(p => p.palavras_chave).filter(Boolean))].slice(-6);

  return `
# 🚫 ANTI-REPETIÇÃO ESTRUTURAL E DE MEMÓRIA
Estão BLOQUEADOS e PROIBIDOS os seguintes padrões já utilizados recentemente (EVITE-OS):
- ARQUÉTIPOS/ESTRUTURAS JÁ USADAS: ${estruturas.join(', ') || 'Nenhum'}
- PADRÕES DE ABERTURA (Não comece as frases assim): ${aberturas.map(a => `"${a}..."`).join(' | ') || 'Nenhum'}
- EIXOS DE LÓGICA E PALAVRAS: ${palavras.join(', ') || 'Nenhuma'}

REGRA CRÍTICA: Escolha uma lógica emocional diferente e não repita os mesmos termos descritivos de dor. Inove as palavras e a sequência causal.`;
}

// ─── MODO ADAPTATIVO — CAPTURA DE EDIÇÕES ────────────────────────────────────

/**
 * Registra uma edição manual do usuário.
 * @param {string} campo - campo editado (texto_principal, caption, etc.)
 * @param {string} antes - valor antes da edição
 * @param {string} depois - valor depois da edição
 */
export function captureEdit(campo, antes, depois) {
  if (!antes || !depois || antes.trim() === depois.trim()) return;
  ensureMemoryDir();

  const adapts = loadJSON(ADAPTS_FILE, { edicoes: [], padroes: [] });

  adapts.edicoes.push({
    campo,
    antes: antes.trim(),
    depois: depois.trim(),
    data: new Date().toISOString().slice(0, 10),
  });

  saveJSON(ADAPTS_FILE, adapts);
  console.log(`📝 [Adaptativo] Edição registrada no campo "${campo}".`);

  // Analisa padrões a cada 3 edições no mesmo campo
  const edições_campo = adapts.edicoes.filter(e => e.campo === campo);
  if (edições_campo.length > 0 && edições_campo.length % 3 === 0) {
    detectPattern(adapts, campo);
    saveJSON(ADAPTS_FILE, adapts);
  }
}

/**
 * Detecta padrões simples de edição.
 * Regra: se a palavra adicionada aparece em >= 3 edições → vira padrão.
 */
function detectPattern(adapts, campo) {
  const edições = adapts.edicoes.filter(e => e.campo === campo);
  const wordsAdded = edições.flatMap(e => {
    const before = new Set(e.antes.toLowerCase().split(/\s+/));
    return e.depois.toLowerCase().split(/\s+/).filter(w => !before.has(w) && w.length > 3);
  });

  const freq = {};
  wordsAdded.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  for (const [word, count] of Object.entries(freq)) {
    if (count >= 3) {
      const jaExiste = adapts.padroes.some(p => p.palavra === word && p.campo === campo);
      if (!jaExiste) {
        adapts.padroes.push({
          campo,
          palavra: word,
          frequencia: count,
          regra: `Adicionar intensidade emocional com "${word}" quando aplicável`,
        });
        console.log(`🎯 [Adaptativo] Novo padrão detectado: "${word}" (${count}x em ${campo})`);
      }
    }
  }
}

// ─── MODO ADAPTATIVO — INJEÇÃO NO PROMPT ─────────────────────────────────────

/**
 * Gera o bloco adaptativo para injetar no Prompt Mestre.
 */
export function buildAdaptiveContext() {
  const adapts = loadJSON(ADAPTS_FILE, { edicoes: [], padroes: [] });
  if (!adapts.padroes.length) return '';

  const regras = adapts.padroes
    .sort((a, b) => b.frequencia - a.frequencia)
    .slice(0, 6)
    .map(p => `- ${p.regra} (detectado ${p.frequencia}x)`)
    .join('\n');

  return `
# 🧠 ESTILO APRENDIDO (baseado em edições humanas aprovadas)
Siga estas preferências de estilo identificadas com base em correções anteriores:

${regras}

Aplique essas preferências de forma natural, sem quebrar a fluidez das frases.`;
}
