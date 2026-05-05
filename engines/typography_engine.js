/**
 * 🔤 TYPOGRAPHY ENGINE — Conversion-Oriented Type System
 * Selects fonts by FUNCTION, enforces hierarchy, max 2 families/post.
 */

export const FONT_FAMILIES = {
  impacto: [
    { id: 'bebas_neue', family: 'Bebas Neue', weight: 700, style: 'uppercase condensed', vibe: 'bold editorial' },
    { id: 'oswald', family: 'Oswald', weight: 600, style: 'semi-condensed', vibe: 'modern authoritative' },
    { id: 'anton', family: 'Anton', weight: 400, style: 'ultra-condensed', vibe: 'aggressive impact' },
    { id: 'archivo_black', family: 'Archivo Black', weight: 900, style: 'extra-bold wide', vibe: 'powerful commanding' },
  ],
  emocao: [
    { id: 'playfair_display', family: 'Playfair Display', weight: 400, style: 'italic serif', vibe: 'elegant emotional' },
    { id: 'cormorant_garamond', family: 'Cormorant Garamond', weight: 300, style: 'light serif', vibe: 'classic refined' },
    { id: 'lora', family: 'Lora', weight: 400, style: 'balanced serif', vibe: 'warm approachable' },
    { id: 'dm_serif_display', family: 'DM Serif Display', weight: 400, style: 'modern serif', vibe: 'contemporary editorial' },
  ],
  leitura: [
    { id: 'inter', family: 'Inter', weight: 400, style: 'geometric sans', vibe: 'clean modern' },
    { id: 'dm_sans', family: 'DM Sans', weight: 400, style: 'humanist sans', vibe: 'friendly clear' },
    { id: 'source_sans_3', family: 'Source Sans 3', weight: 400, style: 'humanist sans', vibe: 'professional neutral' },
  ],
  cta: [
    { id: 'poppins', family: 'Poppins', weight: 600, style: 'rounded sans', vibe: 'friendly trustworthy' },
    { id: 'space_grotesk', family: 'Space Grotesk', weight: 500, style: 'technical sans', vibe: 'modern premium' },
    { id: 'outfit', family: 'Outfit', weight: 600, style: 'contemporary', vibe: 'clean conversion' },
  ],
};

export const TYPE_PAIRS = [
  { id: 'editorial_power', headline: 'bebas_neue', body: 'lora', vibe: 'editorial de impacto', best_for: ['verdade_dura', 'quebra_padrao', 'confronto'] },
  { id: 'modern_minimal', headline: 'oswald', body: 'inter', vibe: 'minimalismo moderno', best_for: ['insight', 'educacional', 'checklist'] },
  { id: 'emotional_depth', headline: 'dm_serif_display', body: 'dm_sans', vibe: 'profundidade emocional', best_for: ['identificacao', 'alivio', 'reflexao'] },
  { id: 'raw_impact', headline: 'anton', body: 'source_sans_3', vibe: 'impacto bruto', best_for: ['tensao', 'provocacao', 'dor_solucao'] },
  { id: 'classic_authority', headline: 'archivo_black', body: 'cormorant_garamond', vibe: 'autoridade clássica', best_for: ['autoridade', 'explicacao'] },
  { id: 'warm_human', headline: 'playfair_display', body: 'dm_sans', vibe: 'humanidade calorosa', best_for: ['empatia', 'acolhimento'] },
  { id: 'clean_conversion', headline: 'oswald', body: 'poppins', vibe: 'conversão limpa', best_for: ['convite', 'cta', 'conversao'] },
  { id: 'premium_editorial', headline: 'bebas_neue', body: 'space_grotesk', vibe: 'editorial premium', best_for: ['salvamento', 'guia'] },
];

const HIERARCHY = {
  impact_short:    { headline: { size: 1.0, w: 800, ls: '-0.02em', lh: 1.05, tx: 'uppercase' }, sub: { size: 0.42, w: 400, ls: '0.01em', lh: 1.4 }, cta: { size: 0.28, w: 600, ls: '0.03em', lh: 1.3 } },
  emotional:       { headline: { size: 0.75, w: 700, ls: '-0.01em', lh: 1.15, tx: 'none' },     sub: { size: 0.50, w: 300, ls: '0.005em', lh: 1.5 }, cta: { size: 0.30, w: 500, ls: '0.02em', lh: 1.3 } },
  cta_dominant:    { headline: { size: 0.65, w: 600, ls: '0em', lh: 1.2, tx: 'none' },           sub: { size: 0.40, w: 400, ls: '0.01em', lh: 1.4 }, cta: { size: 0.55, w: 800, ls: '0.02em', lh: 1.1, tx: 'uppercase' } },
  educational:     { headline: { size: 0.70, w: 700, ls: '-0.01em', lh: 1.15, tx: 'none' },      sub: { size: 0.45, w: 400, ls: '0.005em', lh: 1.55 }, cta: { size: 0.28, w: 500, ls: '0.02em', lh: 1.3 } },
  type_dominant:   { headline: { size: 1.3, w: 900, ls: '-0.03em', lh: 0.95, tx: 'uppercase' },   sub: { size: 0.35, w: 300, ls: '0.02em', lh: 1.5 }, cta: { size: 0.25, w: 500, ls: '0.03em', lh: 1.3, tx: 'uppercase' } },
};

function resolveFont(fontId) {
  for (const cat of Object.values(FONT_FAMILIES)) {
    const f = cat.find(x => x.id === fontId);
    if (f) return f;
  }
  return FONT_FAMILIES.impacto[0];
}

function selectPair(tipoPost, objetivo, lastPairs = []) {
  let cands = TYPE_PAIRS.filter(p => p.best_for.includes(tipoPost) || p.best_for.includes(objetivo));
  if (!cands.length) cands = [...TYPE_PAIRS];
  if (lastPairs.length) {
    const filtered = cands.filter(p => !lastPairs.includes(p.id));
    if (filtered.length) cands = filtered;
  }
  return cands[Math.floor(Math.random() * cands.length)];
}

function selectHierarchy(copyIntent, tipoCena, headlineLen) {
  if (tipoCena === 'tipografia' || tipoCena === 'abstrato') return 'type_dominant';
  if (copyIntent === 'converter') return 'cta_dominant';
  if (headlineLen <= 25) return 'impact_short';
  if (copyIntent === 'educar') return 'educational';
  return 'emotional';
}

export function decideTypography({ tipoPost = 'frase_curta', objetivo = 'engajamento', copyIntent = 'engajar', tipoCena = 'simbolico', headlineLength = 30, lastTypePairs = [] } = {}) {
  const pair = selectPair(tipoPost, objetivo, lastTypePairs);
  const hierKey = selectHierarchy(copyIntent, tipoCena, headlineLength);
  const hier = HIERARCHY[hierKey];
  const hFont = resolveFont(pair.headline);
  const bFont = resolveFont(pair.body);
  const sizeAdj = headlineLength > 50 ? 0.75 : headlineLength > 30 ? 0.90 : 1.0;

  console.log(`   🔤 [Typography] Par: ${pair.id} (${pair.vibe}) | Hierarquia: ${hierKey}`);

  return {
    pair: { id: pair.id, vibe: pair.vibe },
    headline: { font: hFont, ...hier.headline, size: hier.headline.size * sizeAdj },
    subtexto: { font: bFont, ...hier.sub },
    cta: { font: bFont, ...hier.cta },
    meta: { pairId: pair.id, hierarchy: hierKey, sizeAdj, headlineLength },
  };
}

export default decideTypography;
