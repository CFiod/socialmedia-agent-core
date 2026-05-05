/**
 * ============================================================
 * 🔥 STRUCTURAL HOOK ENGINE (v5.0)
 * Arquétipos alinhados ao blueprint meta/estratégia/execução:
 *   confrontador → revela a verdade desconfortável
 *   espelho       → espelha a dor com precisão cirúrgica
 *   mentor        → guia da exploração à solução
 *   revelador     → usa curiosidade e contraste como força
 * ============================================================
 */

export const ARQUETIPOS = {

  // Diz a verdade que ninguém quer ouvir. Provoca, confronta, liberta.
  confrontador: {
    descricao: "Revela a verdade desconfortável antes do alívio",
    emocao:    "Choque → Identificação → Libertação",
    estrutura: [
      "provocacao",        // Slide 1: Afirmação direta que quebra o conforto
      "identificacao",     // Slide 2: Cena espelho — a pessoa reconhece a si
      "tensao",            // Slide 3: Peso emocional do padrão
      "quebra",            // Slide 4: 1 linha inesperada — máximo impacto
      "expansao",          // Slide 5: Aprofunda sem teorizar
      "alivio",            // Slide 6: Micro-alívio — valida sem resolver
      "cta",               // Slide 7: WhatsApp direto
    ],
  },

  // Mostra o ciclo com precisão, torna o invisível visível.
  espelho: {
    descricao: "Espelha a dor cotidiana com precisão cirúrgica",
    emocao:    "Reconhecimento → Exaustão → Possibilidade",
    estrutura: [
      "espelho",           // Slide 1: Algo que a pessoa viveu HOJE
      "ampliacao",         // Slide 2: Consequências e intensificação
      "intensificacao",    // Slide 3: A dor é pior do que assumida
      "insight",           // Slide 4: Revela o mecanismo ("clique mental")
      "validacao",         // Slide 5: Isso é real, não é sua culpa (sozinha)
      "direcionamento",    // Slide 6: A saída é prática e guiada
      "cta",               // Slide 7: WhatsApp direto
    ],
  },

  // Guia pela jornada: comportamento → ciclo → consciência → saída.
  mentor: {
    descricao: "Conduz da exploração do ciclo à solução real",
    emocao:    "Curiosidade → Frustração → Consciência → Esperança",
    estrutura: [
      "comportamento",     // Slide 1: O padrão automático invisível
      "tentativa_controle",// Slide 2: Como a pessoa tenta controlar
      "frustracao",        // Slide 3: O colapso do controle ilusório
      "repeticao",         // Slide 4: O ciclo que se repete
      "consciencia",       // Slide 5: Por que o ciclo existe (1 slide, curto)
      "possibilidade",     // Slide 6: Esperança realista de mudança
      "cta",               // Slide 7: WhatsApp direto
    ],
  },

  // Usa curiosidade e contraste para revelar, ressignificar e converter.
  revelador: {
    descricao: "Usa contraste e curiosidade para gerar insight e ação",
    emocao:    "Curiosidade → Contraste → Insight → Reframe",
    estrutura: [
      "curiosidade",       // Slide 1: Percepção instigante do dia a dia
      "contraste",         // Slide 2: Expectativa vs realidade do sintoma
      "sintoma",           // Slide 3: O sintoma real, nu e cru
      "insight",           // Slide 4: Clique mental de auto-reconhecimento
      "explicacao_minima", // Slide 5: Causa em 1 slide (sensação, não conceito)
      "reframe",           // Slide 6: Tira a culpa — abre espaço de acolhimento
      "cta",               // Slide 7: WhatsApp direto
    ],
  },
};

// ── ROTAÇÃO ANTI-REPETIÇÃO ────────────────────────────────────────────────────

export function getHookRotationContext(memoria) {
  const postsRecentes = Array.isArray(memoria)
    ? memoria
    : (Array.isArray(memoria?.posts) ? memoria.posts : []);

  const ultimosIds = postsRecentes.slice(-4).map(p => p.arquetipo_id).filter(Boolean);
  const idsDisponiveis = Object.keys(ARQUETIPOS).filter(id => !ultimosIds.includes(id));

  const selecionadoId = idsDisponiveis.length > 0
    ? idsDisponiveis[Math.floor(Math.random() * idsDisponiveis.length)]
    : Object.keys(ARQUETIPOS)[Math.floor(Math.random() * Object.keys(ARQUETIPOS).length)];

  const arquetipo = ARQUETIPOS[selecionadoId];

  return {
    tipo:      selecionadoId,
    id:        selecionadoId,
    descricao: arquetipo.descricao,
    emocao:    arquetipo.emocao,
    estrutura: arquetipo.estrutura,
  };
}

// ── INSTRUÇÃO DE ARQUÉTIPO PARA O PROMPT ─────────────────────────────────────

export function buildHookPromptInstruction(context) {
  return `
--- ARQUÉTIPO NARRATIVO ATIVO: ${context.id.toUpperCase()} ---
Descrição: ${context.descricao}
Jornada emocional: ${context.emocao}
REGRA: O carrossel deve seguir ESTRITAMENTE este mapa emocional — cada slide avança na jornada.
O hook inicial é o PRIMEIRO elemento orgânico da história, NÃO um template enlatado.
`;
}
