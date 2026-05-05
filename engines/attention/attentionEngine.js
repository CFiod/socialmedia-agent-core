/**
 * attentionEngine.js — V3 Visual Attention Simulator
 * 
 * Gera um "mapa de atenção" baseado nos metadados da cena e análise de visão.
 * Identifica áreas de alta densidade visual (rostos, sujeito, pontos de luz)
 * para guiar o posicionamento seguro do texto.
 */

/**
 * Expande uma área com padding uniforme.
 * @param {{ x: number, y: number, w: number, h: number }} area
 * @param {number} padding
 */
function expand(area, padding) {
  return {
    x: (area.x || 0) - padding,
    y: (area.y || 0) - padding,
    w: (area.w || area.width || 0) + padding * 2,
    h: (area.h || area.height || 0) + padding * 2
  };
}

/**
 * Constrói um mapa de atenção visual a partir dos dados disponíveis.
 * 
 * @param {object} scene   — saída do sceneEngine (buildScene)
 * @param {object} vision  — saída do visionService (analyzeImageForText)
 * @param {number} imgW    — largura real da imagem renderizada
 * @param {number} imgH    — altura real da imagem renderizada
 * @returns {Array<{ type: string, weight: number, area: object }>}
 */
export function simulateAttentionMap(scene = {}, vision = {}, imgW = 1080, imgH = 1440) {
  const map = [];

  // ── PRIORIDADE 1: Rostos detectados pela Vision API ──────────────────────
  // A visionService retorna `safeZone` — usamos para inferir a zona do rosto
  // como complemento (a safeZone JÁ é o oposto do rosto, então o "rosto" fica
  // na área restante). Quando `faces: true`, marcamos o centro como zona de risco.
  if (vision?.faces === true) {
    // Se a API de visão retornou uma safeZone explícita, o rosto está FORA dela.
    // Adicionamos a área central como zona de atenção de peso máximo.
    map.push({
      type: 'face',
      weight: 1.0,
      area: {
        x: imgW * 0.25,
        y: imgH * 0.20,
        w: imgW * 0.50,
        h: imgH * 0.50
      }
    });
  }

  // ── PRIORIDADE 2: Safe Zone da Vision API (inversamente, área do sujeito) ─
  // Se a Vision API retornou uma `safeZone` confiável, o sujeito está na área restante.
  if (vision?.safeZone && vision.safeZone.w > 0) {
    const sz = vision.safeZone;
    // Calcular área complementar (onde o sujeito principal provavelmente está)
    const subjectArea = inferSubjectFromSafeZone(sz, imgW, imgH);
    if (subjectArea) {
      map.push({
        type: 'subject',
        weight: 0.75,
        area: subjectArea
      });
    }
  }

  // ── PRIORIDADE 3: Iluminação alta contraste (ponto quente de luz) ─────────
  if (scene?.lighting?.includes('high_contrast') || scene?.lighting?.includes('harsh')) {
    map.push({
      type: 'light_hotspot',
      weight: 0.5,
      area: {
        x: imgW * 0.55,
        y: imgH * 0.10,
        w: imgW * 0.30,
        h: imgH * 0.20
      }
    });
  }

  // ── PRIORIDADE 4: Elementos da cena (símbolo, conflito visual) ────────────
  // Cenas com conflito visual tendem a ter elementos centrais. Peso baixo.
  if (scene?.conflict_visual) {
    map.push({
      type: 'conflict_area',
      weight: 0.4,
      area: {
        x: imgW * 0.20,
        y: imgH * 0.30,
        w: imgW * 0.60,
        h: imgH * 0.40
      }
    });
  }

  return map;
}

/**
 * Infere a área provável do sujeito a partir da safeZone retornada pela visão.
 * A lógica é que a safeZone é onde NÃO está o sujeito.
 */
function inferSubjectFromSafeZone(safeZone, imgW, imgH) {
  const { x = 0, y = 0, w = 0, h = 0 } = safeZone;
  
  // Se a safe zone está na metade inferior, o sujeito provavelmente está no topo
  if (y > imgH * 0.5) {
    return { x: imgW * 0.15, y: imgH * 0.05, w: imgW * 0.70, h: imgH * 0.45 };
  }
  // Se a safe zone está na metade superior, sujeito no centro/inferior
  if (y < imgH * 0.3 && h < imgH * 0.3) {
    return { x: imgW * 0.15, y: imgH * 0.35, w: imgW * 0.70, h: imgH * 0.50 };
  }
  // Safe zone à esquerda → sujeito à direita
  if (x < imgW * 0.3 && w < imgW * 0.4) {
    return { x: imgW * 0.50, y: imgH * 0.10, w: imgW * 0.45, h: imgH * 0.70 };
  }
  // Safe zone à direita → sujeito à esquerda
  if (x > imgW * 0.6) {
    return { x: imgW * 0.05, y: imgH * 0.10, w: imgW * 0.45, h: imgH * 0.70 };
  }

  return null; // inconclusivo
}
