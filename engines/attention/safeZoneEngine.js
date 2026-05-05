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
