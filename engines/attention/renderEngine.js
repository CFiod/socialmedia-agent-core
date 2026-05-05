/**
 * renderEngine.js — V3 Intelligent Text Renderer
 *
 * Decide como renderizar texto sobre a imagem baseado na estratégia
 * escolhida pelo safeZoneEngine. Exporta helpers para o imageOverlayer.js.
 */

/**
 * Retorna as configurações de backdrop a aplicar no Canvas
 * antes de renderizar o texto, dado a estratégia da safe zone.
 *
 * @param {string} strategy  — 'clean' | 'gradient_underlay' | 'background_overlay'
 * @param {{ x, y, w, h, name }} zone
 * @param {number} width
 * @param {number} height
 * @returns {{ type: string, params: object } | null}
 */
export function resolveRenderStrategy(strategy, zone, width, height) {
  switch (strategy) {
    case 'background_overlay':
      // Caixa escura semitransparente (scrim) cobrindo toda a zona
      return {
        type: 'scrim',
        params: {
          x:       zone.x,
          y:       zone.y,
          w:       zone.w,
          h:       zone.h,
          color:   'rgba(0,0,0,0.52)',
          radius:  0
        }
      };

    case 'gradient_underlay':
      // Gradiente suave na direção da zona (top→down ou down→top)
      return {
        type: 'gradient',
        params: {
          x0: zone.x,
          y0: zone.name === 'top' ? zone.y : zone.y + zone.h,
          x1: zone.x,
          y1: zone.name === 'top' ? zone.y + zone.h : zone.y,
          stops: [
            { offset: 0,   color: 'rgba(0,0,0,0.60)' },
            { offset: 0.7, color: 'rgba(0,0,0,0.30)' },
            { offset: 1,   color: 'rgba(0,0,0,0)'    }
          ],
          rectX: zone.x,
          rectY: zone.y,
          rectW: zone.w,
          rectH: zone.h
        }
      };

    case 'clean':
    default:
      return null; // Nenhum backdrop necessário
  }
}

/**
 * Aplica o backdrop resolvido num contexto Canvas 2D.
 * Deve ser chamado ANTES de desenhar o texto.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ type: string, params: object } | null} backdropDef
 */
export function applyBackdrop(ctx, backdropDef) {
  if (!backdropDef) return;

  const { type, params: p } = backdropDef;

  ctx.save();
  ctx.shadowBlur = 0;

  if (type === 'scrim') {
    ctx.fillStyle = p.color;
    if (p.radius > 0) {
      roundRect(ctx, p.x, p.y, p.w, p.h, p.radius);
      ctx.fill();
    } else {
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  } else if (type === 'gradient') {
    const grad = ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1);
    for (const stop of p.stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(p.rectX, p.rectY, p.rectW, p.rectH);
  }

  ctx.restore();
}

/**
 * Calcula a posição Y de ancoragem para o bloco de texto dentro da zona.
 *
 * @param {{ name: string, y: number, h: number }} zone
 * @param {number} textBlockHeight  — altura estimada do bloco de texto em px
 * @returns {number} y de início do bloco de texto
 */
export function resolveTextYAnchor(zone, textBlockHeight = 120) {
  switch (zone.name) {
    case 'top':
      // Centralizar verticalmente dentro da zona superior
      return zone.y + (zone.h - textBlockHeight) / 2;

    case 'bottom':
      // Posicionar com margem interna no terço superior da zona inferior
      return zone.y + zone.h * 0.15;

    case 'left':
    case 'right':
    case 'center':
    default:
      return zone.y + (zone.h - textBlockHeight) / 2;
  }
}

/**
 * Converte zona de safe zone em layoutId para o imageOverlayer.
 */
export function zoneToLayoutId(zoneName) {
  const map = {
    'top':    'top_text',
    'bottom': 'bottom_text',
    'left':   'split_left',
    'right':  'split_right',
    'center': 'center_text'
  };
  return map[zoneName] || 'center_text';
}

// ── Helper interno ────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
