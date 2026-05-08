/**
 * safeZoneEngine.js — V3 Safe Zone Calculator
 *
 * Gera zonas candidatas para posicionamento de texto e rankeia por risco,
 * baseando-se no mapa de atenção visual (attentionEngine).
 *
 * Zonas com menor risco são as mais seguras para colocar texto.
 */

/**
 * Verifica se dois retângulos se intersectam.
 * @param {{ x, y, w, h }} a
 * @param {{ x, y, w, h }} b
 */
function intersects(a, b) {
  return !(
    a.x > b.x + b.w ||
    a.x + a.w < b.x ||
    a.y > b.y + b.h ||
    a.y + a.h < b.y
  );
}

/**
 * Calcula a área de interseção entre dois retângulos (como proporção de `a`).
 * Retorna valor entre 0 (sem interseção) e 1 (totalmente sobreposto).
 */
function overlapRatio(a, b) {
  const left   = Math.max(a.x, b.x);
  const top    = Math.max(a.y, b.y);
  const right  = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);

  if (right <= left || bottom <= top) return 0;

  const interArea = (right - left) * (bottom - top);
  const aArea     = a.w * a.h;
  return aArea > 0 ? interArea / aArea : 0;
}

/**
 * Gera as zonas candidatas padrão para uma imagem com as dimensões fornecidas.
 * Baseado no formato 1080x1440 (3:4) do Instagram Feed.
 *
 * @param {number} width
 * @param {number} height
 * @returns {Array<{ name: string, x, y, w, h, priority: number }>}
 */
function getCandidateZones(width, height) {
  return [
    {
      name: 'bottom',
      x: 0,
      y: height * 0.72,
      w: width,
      h: height * 0.28,
      priority: 1   // Preferido — mais natural para texto em Instagram
    },
    {
      name: 'top',
      x: 0,
      y: 0,
      w: width,
      h: height * 0.22,
      priority: 2
    },
    {
      name: 'right',
      x: width * 0.62,
      y: height * 0.10,
      w: width * 0.38,
      h: height * 0.80,
      priority: 3
    },
    {
      name: 'left',
      x: 0,
      y: height * 0.10,
      w: width * 0.38,
      h: height * 0.80,
      priority: 4
    },
    {
      name: 'center',
      x: width * 0.10,
      y: height * 0.35,
      w: width * 0.80,
      h: height * 0.30,
      priority: 5   // Último recurso — centro é a zona de maior risco
    }
  ];
}

/**
 * Gera e rankeia safe zones por menor risco de colisão com áreas de atenção.
 *
 * @param {number} width             — largura da imagem em pixels
 * @param {number} height            — altura da imagem em pixels
 * @param {Array}  attentionMap      — saída do simulateAttentionMap()
 * @returns {Array<{ name, x, y, w, h, risk: number, strategy: string }>}
 */
export function generateSafeZonesV3(width, height, attentionMap = []) {
  const candidates = getCandidateZones(width, height);

  const scored = candidates.map(zone => {
    let risk = 0;

    for (const attention of attentionMap) {
      if (!attention.area) continue;
      const ratio = overlapRatio(zone, attention.area);
      // Risco ponderado: intersecção × peso da atenção
      risk += ratio * (attention.weight || 0.5);
    }

    // Determinar estratégia de renderização baseada no risco acumulado
    let strategy;
    if (risk >= 0.8) {
      strategy = 'background_overlay'; // Blur/scrim atrás do texto
    } else if (risk >= 0.4) {
      strategy = 'gradient_underlay';  // Gradiente sutil atrás do texto
    } else {
      strategy = 'clean';              // Texto limpo, sem backdrop
    }

    return {
      ...zone,
      risk: parseFloat(risk.toFixed(3)),
      strategy
    };
  });

  // Ordenar por risco crescente. Em caso de empate, respeitar prioridade natural.
  return scored.sort((a, b) => {
    const riskDiff = a.risk - b.risk;
    if (Math.abs(riskDiff) < 0.05) return a.priority - b.priority;
    return riskDiff;
  });
}

// ── FACE AVOIDANCE INTEGRATION (Instrucao.txt §2) ──────────────────────────
// Integra zonas de rosto no cálculo de safe zones.
// faceAvoidance: 0.0 (ignora rostos) → 1.0 (bloqueia zonas com rosto 100%)

/**
 * Calcula faceAvoidance com base no copyIntent.
 * Psicanálise: posts emocionais NUNCA cobrem rosto.
 * @param {string} copyIntent — 'emocional' | 'engajar' | 'converter' | 'educar'
 * @returns {number} — 0.0 a 1.0
 */
export function calculateFaceAvoidance(copyIntent = 'engajar') {
  const INTENT_AVOIDANCE = {
    emocional: 1.0,    // Dor emocional → NÃO cobrir rosto
    engajar:   0.6,    // Engajamento → pode aproximar
    converter: 0.9,    // CTA → evitar rosto
    educar:    0.7,    // Educacional → evitar parcialmente
    atrair:    0.5,    // Atração → flexível
  };
  return INTENT_AVOIDANCE[copyIntent] ?? 0.7;
}

/**
 * Remove ou penaliza zonas candidatas que colidem com rostos detectados.
 *
 * @param {Array} safeZones     — saída de generateSafeZonesV3()
 * @param {Array} faces         — array de { x, y, width, height } dos rostos detectados
 * @param {number} faceAvoidance — 0.0 a 1.0 (intensidade do bloqueio)
 * @param {number} expansionFactor — percentual de expansão da zona do rosto (default 25%)
 * @returns {Array} — safeZones re-rankeadas com penalização de rosto
 */
export function removeFaceZones(safeZones, faces = [], faceAvoidance = 1.0, expansionFactor = 0.25) {
  if (!faces.length || faceAvoidance <= 0) return safeZones;

  // Expandir cada rosto em 25% para criar "zona proibida"
  const faceAreas = faces.map(f => ({
    x: (f.x || 0) - (f.width || f.w || 0) * expansionFactor,
    y: (f.y || 0) - (f.height || f.h || 0) * expansionFactor,
    w: (f.width || f.w || 0) * (1 + expansionFactor * 2),
    h: (f.height || f.h || 0) * (1 + expansionFactor * 2),
  }));

  return safeZones.map(zone => {
    let faceRisk = 0;
    for (const face of faceAreas) {
      const ratio = overlapRatio(zone, face);
      faceRisk += ratio;
    }

    // Penalizar risco proporcional ao faceAvoidance
    const adjustedRisk = zone.risk + (faceRisk * faceAvoidance * 1.5);

    // Se risco do rosto é alto E avoidance é máximo → forçar backdrop pesado
    let strategy = zone.strategy;
    if (faceRisk > 0.3 && faceAvoidance >= 0.8) {
      strategy = 'background_overlay';
    } else if (faceRisk > 0.1 && faceAvoidance >= 0.5) {
      strategy = strategy === 'clean' ? 'gradient_underlay' : strategy;
    }

    return { ...zone, risk: parseFloat(adjustedRisk.toFixed(3)), strategy, faceRisk: parseFloat(faceRisk.toFixed(3)) };
  }).sort((a, b) => {
    const riskDiff = a.risk - b.risk;
    if (Math.abs(riskDiff) < 0.05) return a.priority - b.priority;
    return riskDiff;
  });
}

/**
 * Resolve o melhor layout com base nas safe zones rankeadas.
 *
 * @param {Array} safeZones  — saída de generateSafeZonesV3()
 * @returns {{ zone: object, strategy: string, layoutId: string }}
 */
export function resolveLayoutV3(safeZones = []) {
  if (!safeZones.length) {
    return {
      zone: { name: 'bottom', x: 0, y: 0, w: 1080, h: 1440 },
      strategy: 'background_overlay',
      layoutId: 'bottom_text'
    };
  }

  const best = safeZones[0];

  // Mapear nome de zona → layoutId existente no imageOverlayer
  const zoneToLayoutId = {
    'top':    'top_text',
    'bottom': 'bottom_text',
    'left':   'split_left',
    'right':  'split_right',
    'center': 'center_text'
  };

  return {
    zone: best,
    strategy: best.strategy,
    layoutId: zoneToLayoutId[best.name] || 'center_text'
  };
}
