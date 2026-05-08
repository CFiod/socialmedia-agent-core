import { createCanvas, loadImage } from '@napi-rs/canvas';
import { resolveRenderStrategy, applyBackdrop } from '../engines/attention/renderEngine.js';

// ── STRIP EMOJIS (Canvas não renderiza emojis — aparecem como □) ─────────────
// Remove todos os caracteres emoji e símbolos Unicode fora do BMP/Latin
function stripEmojis(text) {
    if (!text) return '';
    return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{200D}]/gu, '')
        .replace(/[\u{20E3}]/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// ── SISTEMA DE DESTAQUE ──────────────────────────────────────────────────────

const IGNORE_HIGHLIGHTS = ['A', 'O', 'AS', 'OS', 'E', 'É', 'DO', 'DA', 'DOS', 'DAS', 'UM', 'UMA', 'NO', 'NA', 'NOS', 'NAS', 'PARA', 'COM', 'POR', 'QUE', 'SE', 'EM', 'DE', 'MAS', 'SUA', 'SEU', 'ESSE', 'ESSA', 'COMO', 'MAIS', 'POR', 'SEM', 'NEM', 'UM', 'UNS'];

function normalizeWord(word) {
    return word.replace(/[.,!?;:()""\u2018\u2019\u201C\u201D'"]/g, '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Filtra a lista de destaques para conter APENAS palavras que existem
 * no texto real (principal + secundário). Evita destacar palavras fantasmas.
 */
export function filterHighlightsToText(destaques, textoPrincipal = '', textoSecundario = '') {
    if (!destaques || destaques.length === 0) return [];
    const fullText = `${textoPrincipal} ${textoSecundario}`;
    const fullNorm = normalizeWord(fullText);
    const wordsInText = fullText.split(/\s+/).map(w => normalizeWord(w));
    return destaques.filter(d => {
        const norm = normalizeWord(d);
        if (norm.length < 3) return false;
        // Suporte a destaques multi-palavra (ex: "Complexo de Édipo")
        if (d.includes(' ')) {
            return fullNorm.includes(norm);
        }
        return wordsInText.includes(norm);
    });
}

function isHighlightWord(word, explicitHighlights) {
    if (!explicitHighlights || explicitHighlights.length === 0) return false;
    const cleanWord = normalizeWord(word);
    if (cleanWord.length < 3 || IGNORE_HIGHLIGHTS.includes(cleanWord)) return false;
    for (const h of explicitHighlights) {
        const normH = normalizeWord(h);
        // Match exato (single word highlight)
        if (normH === cleanWord) return true;
        // Match parcial (palavra faz parte de destaque multi-palavra, ex: "COMPLEXO" ∈ "COMPLEXO DE EDIPO")
        if (h.includes(' ')) {
            const parts = h.split(/\s+/).map(p => normalizeWord(p)).filter(p => p.length >= 3);
            if (parts.includes(cleanWord)) return true;
        }
    }
    return false;
}

// ── WRAP TEXT & RENDER ───────────────────────────────────────────────────────

function wrapText(ctx, text, x, y, maxWidth, lineHeight, useHighlight = false, highlightColor = '#FF3D00', explicitHighlights = [], baseColor = '#FFFFFF', textAlign = 'center') {
    if (!text) return y;
    const paragraphs = text.split('\n');
    let currentY = y;

    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let line = [];
        let currentLineWidth = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = ctx.measureText(word + ' ').width;

            if (currentLineWidth + wordWidth > maxWidth && line.length > 0) {
                renderLine(ctx, line, x, currentY, highlightColor, useHighlight, explicitHighlights, baseColor, textAlign, maxWidth);
                line = [word];
                currentLineWidth = wordWidth;
                currentY += lineHeight;
            } else {
                line.push(word);
                currentLineWidth += wordWidth;
            }
        }
        renderLine(ctx, line, x, currentY, highlightColor, useHighlight, explicitHighlights, baseColor, textAlign, maxWidth);
        currentY += lineHeight;
    }
    return currentY;
}

function renderLine(ctx, words, startX, y, highlightColor, useHighlight, explicitHighlights = [], baseColor = '#FFFFFF', textAlign = 'center', maxWidth = 0) {
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';

    const wordWidths = words.map(w => ctx.measureText(w + ' ').width);
    const totalWidth = wordWidths.reduce((a, b) => a + b, 0)
        - ctx.measureText(' ').width;

    // Calculate starting X based on alignment
    let currentX;
    if (textAlign === 'left') {
        currentX = startX;
    } else if (textAlign === 'right') {
        currentX = startX - totalWidth;
    } else {
        // center (default)
        currentX = startX - (totalWidth / 2);
    }

    for (let wi = 0; wi < words.length; wi++) {
        const word = words[wi];
        const shouldHighlight = useHighlight && isHighlightWord(word, explicitHighlights);

        ctx.shadowBlur = 10;

        const isLast = wi === words.length - 1;
        const wordText = isLast ? word : word + ' ';

        if (shouldHighlight) {
            // Separar texto da pontuação final (ex: "assombra?" → highlight "assombra" + normal "?")
            const trailingPuncMatch = word.match(/^(.+?)([?.!,;:]+)$/);
            if (trailingPuncMatch) {
                const [, cleanPart, punctuation] = trailingPuncMatch;
                const cleanWidth = ctx.measureText(cleanPart).width;
                // Desenhar parte destacada
                ctx.fillStyle = highlightColor;
                ctx.strokeText(cleanPart, currentX, y);
                ctx.fillText(cleanPart, currentX, y);
                // Desenhar pontuação na cor base
                const puncText = isLast ? punctuation : punctuation + ' ';
                ctx.fillStyle = baseColor;
                ctx.strokeText(puncText, currentX + cleanWidth, y);
                ctx.fillText(puncText, currentX + cleanWidth, y);
            } else {
                ctx.fillStyle = highlightColor;
                ctx.strokeText(wordText, currentX, y);
                ctx.fillText(wordText, currentX, y);
            }
        } else {
            ctx.fillStyle = baseColor;
            ctx.strokeText(wordText, currentX, y);
            ctx.fillText(wordText, currentX, y);
        }
        currentX += wordWidths[wi];
    }

    ctx.textAlign = prevAlign;
}

// ── COLOR INTELLIGENCE ──────────────────────────────────────────────────────

// Calcula luminância relativa de uma cor hex (0=preto, 1=branco)
function hexLuminance(hex) {
    if (!hex || !hex.startsWith('#')) return 0.5;
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0,2), 16) / 255;
    const g = parseInt(h.substring(2,4), 16) / 255;
    const b = parseInt(h.substring(4,6), 16) / 255;
    const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Paleta vibrante para fundos ESCUROS (imagens escuras, vinhetas pesadas)
const VIBRANT_DARK_BG = [
    '#FFD700', // Dourado
    '#FF9F0A', // Laranja Âmbar
    '#FF2D55', // Rosa Vibrante
    '#00CFFF', // Azul Ciano
    '#BF5AF2', // Roxo Premium
    '#FF4500', // Vermelho-Laranja
];

// Paleta saturada para fundos CLAROS/PASTEL (precisa de alto contraste)
const VIBRANT_LIGHT_BG = [
    '#C0392B', // Vermelho Escuro
    '#8E44AD', // Roxo Forte
    '#1A73E8', // Azul Royal
    '#E67E22', // Laranja Queimado
    '#16A085', // Verde-Azulado
    '#D4380D', // Terracota
    '#7B2FBE', // Violeta
];

/**
 * Escolhe cor de destaque com contraste garantido contra o tom da imagem.
 * @param {string[]} gradientColors — cores do gradiente da imagem
 * @param {number}   seedIndex      — variação por slide
 * @param {boolean}  isLightImage   — true se a imagem é clara/pastel
 */
function pickVibrantColor(gradientColors, seedIndex = 0, isLightImage = false) {
    // Imagem clara → paleta escura/saturada para contraste máximo
    if (isLightImage) {
        return VIBRANT_LIGHT_BG[seedIndex % VIBRANT_LIGHT_BG.length];
    }

    // Imagem escura → tentar usar a cor do gradiente se for suficientemente brilhante
    if (gradientColors?.length > 1) {
        const lum = hexLuminance(gradientColors[1]);
        if (lum > 0.15 && lum < 0.85) { // vibrante mas não pastel claro
            return gradientColors[1];
        }
        const lum0 = hexLuminance(gradientColors[0]);
        if (lum0 > 0.15 && lum0 < 0.85) {
            return gradientColors[0];
        }
    }
    // Fallback: paleta vibrante escura
    return VIBRANT_DARK_BG[seedIndex % VIBRANT_DARK_BG.length];
}

// Retorna '#FFFFFF' ou '#111111' dependendo do contraste com a cor dada
function contrastTextColor(bgHex) {
    const lum = hexLuminance(bgHex);
    // Usando WCAG: ratio mínimo 4.5:1 → se luminância > 0.35, fundo é claro → texto escuro
    return lum > 0.35 ? '#111111' : '#FFFFFF';
}

// ── TEXT METRICS ──────────────────────────────────────────────────────────────

function checkWordsFit(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    for (const word of words) {
        if (ctx.measureText(word).width > maxWidth) return false;
    }
    return true;
}

function getTextMetrics(ctx, text, maxWidth, lineHeight) {
    if (!text) return 0;
    const paragraphs = text.split('\n');
    let lineCount = 0;
    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lineCount++;
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        lineCount++;
    }
    return lineCount * lineHeight;
}

function getAreaBrightness(ctx, x, y, w, h) {
    try {
        const imageData = ctx.getImageData(x, y, w, h);
        const data = imageData.data;
        let brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            brightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return brightness / (data.length / 4);
    } catch (e) {
        return 100;
    }
}

// ── TYPOGRAPHY SYSTEM ────────────────────────────────────────────────────────

function getTypography(isVertical) {
  return {
    // Headline ajustado para ficar mais legível em relação à imagem
    headline: isVertical ? 100 : 75,
    sub:      isVertical ? 65 : 50,
    lineHeight: isVertical ? 120 : 90
  };
}

function getSafeArea(canvas) {
  const isVertical = canvas.height > canvas.width;
  return isVertical
    ? { top: 200, bottom: 340, left: 80, right: 80 }
    : { top: 100, bottom: 180, left: 80, right: 80 };
}

function adaptText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

// ── V2: LAYOUT-AWARE POSITIONING ─────────────────────────────────────────────
// Resolve posições absolutas (pixels) a partir do layoutDef V2

function resolveLayoutPositions(layoutDef, width, height) {
    if (!layoutDef || !layoutDef.headline) {
        // Fallback para layout center_text
        return {
            headline: { y: Math.round(height * 0.30), align: 'center', maxWidth: Math.round(width * 0.85), x: width / 2 },
            subtitle: { y: Math.round(height * 0.55), align: 'center', maxWidth: Math.round(width * 0.80), x: width / 2 },
            cta:      { y: Math.round(height * 0.80), align: 'center', maxWidth: Math.round(width * 0.75), x: width / 2 },
        };
    }

    const resolveX = (def) => {
        if (def.xOffsetPercent) return Math.round(width * def.xOffsetPercent);
        return width / 2;
    };

    return {
        headline: {
            y: Math.round(height * (layoutDef.headline.yPercent || 0.30)),
            align: layoutDef.headline.align || 'center',
            maxWidth: Math.round(width * (layoutDef.headline.maxWidthPercent || 0.85)),
            x: resolveX(layoutDef.headline),
        },
        subtitle: {
            y: Math.round(height * (layoutDef.subtitle?.yPercent || 0.55)),
            align: layoutDef.subtitle?.align || 'center',
            maxWidth: Math.round(width * (layoutDef.subtitle?.maxWidthPercent || 0.80)),
            x: resolveX(layoutDef.subtitle || {}),
        },
        cta: {
            y: Math.round(height * (layoutDef.cta?.yPercent || 0.78)),
            align: layoutDef.cta?.align || 'center',
            maxWidth: Math.round(width * (layoutDef.cta?.maxWidthPercent || 0.75)),
            x: resolveX(layoutDef.cta || {}),
        },
    };
}

// ── DRAW CTA TEXT HELPER ──────────────────────────────────────────────────────

function drawCTAText(ctx, ctaText, width, height, typo, isStory, highlightColor, isAuthorMode, layoutPositions) {
    if (!ctaText) return;

    const footFontSize = Math.round(typo.headline * 0.65);
    ctx.font = `bold ${footFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;

    let ctaX = width / 2;
    let ctaY = height * 0.88;
    let ctaAlign = 'center';
    let ctaMaxWidth = width * 0.8;

    if (isAuthorMode) {
        ctaY = height * 0.88;
    } else if (layoutPositions && layoutPositions.cta) {
        ctaX = layoutPositions.cta.x;
        ctaY = layoutPositions.cta.y;
        ctaAlign = layoutPositions.cta.align;
        ctaMaxWidth = layoutPositions.cta.maxWidth;
    }

    // CTA sempre usa a mesma highlightColor do destaque
    // O texto em CIMA do CTA usa branco ou preto conforme contraste WCAG
    const ctaFillColor = highlightColor || '#FFD700';
    const ctaTextColor = contrastTextColor(ctaFillColor);

    const words = ctaText.toUpperCase().split(' ');
    let currentLine = '';
    const lines = [];
    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > ctaMaxWidth && i > 0) {
            lines.push(currentLine.trim());
            currentLine = words[i] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    const lineHeight = Math.round(footFontSize * 1.3);

    ctx.save();
    ctx.textAlign = ctaAlign;
    ctx.textBaseline = 'top';
    // Sombra forte para o CTA aparecer sobre qualquer fundo
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.fillStyle = ctaFillColor;

    lines.forEach((line, index) => {
        const lineY = ctaY + (index * lineHeight);
        ctx.strokeText(line, ctaX, lineY);
        ctx.fillText(line, ctaX, lineY);
    });

    ctx.restore();
}

// ── MAIN OVERLAY FUNCTION (V2) ───────────────────────────────────────────────

export async function overlayTextOnImage(imageBuffer, item, width, height, styleOptions = {}, signatureBuffer = null, metaItem = null) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const isStory = height > 1500;
    const isAuthorMode = !!styleOptions.authorName;
    const authorName = styleOptions.authorName || '';

    // ── V2: Extract layout info from metaItem or styleOptions ──
    const layoutDef = metaItem?.layoutDef || styleOptions.layoutDef || null;
    const layoutId = metaItem?.layoutId || styleOptions.layoutId || 'center_text';

    // -- FUNDO / IMAGEM --
    let img;

    if (imageBuffer) {
        try {
            img = await loadImage(imageBuffer);
        } catch (e) {
            console.warn('⚠️ Falha ao carregar buffer de imagem, usando modo gradiente.');
        }
    }

    if (!img || isAuthorMode) {
        const colors = styleOptions.gradientColors || ['#1a1a1a', '#434343'];
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // ── V5.1: MODO AUTOR — [TEXTO topo] → [ASSINATURA] → [IMAGEM inferior] ──
    if (img && isAuthorMode) {
        const rawTitle = stripEmojis((item.texto_principal || item.titulo || '').trim());
        const adaptedTitle = adaptText(rawTitle, 120);
        const typo = getTypography(isStory);
        const maxWidth = width - 160;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // ── 1. TEXTO / FRASE no topo ─────────────────────────────────────────
        const textStartY = isStory ? 140 : 100;

        ctx.font = `bold ${typo.headline}px "Georgia", serif`;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FFFFFF';

        const mainText = `"${adaptedTitle.replace(/^["'""]/,'').replace(/["'""]+$/,'')}"`;
        let currentY = wrapText(ctx, mainText, width / 2, textStartY, maxWidth, Math.round(typo.headline * 1.2), false, '#E53935', [], '#FFFFFF');

        // ── 2. ASSINATURA + NOME logo abaixo do texto ────────────────────────
        if (signatureBuffer) {
            try {
                const sigImg = await loadImage(signatureBuffer);
                const sigW = isStory ? 280 : 210;
                const sigH = (sigImg.height / sigImg.width) * sigW;
                const sigX = (width - sigW) / 2;
                const sigY = currentY + (isStory ? 30 : 20);

                ctx.shadowBlur = 0;
                ctx.drawImage(sigImg, sigX, sigY, sigW, sigH);

                // Nome do autor centralizado abaixo da assinatura
                const nameFontSize = isStory ? 42 : 32;
                ctx.font = `italic ${nameFontSize}px "Georgia", serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0,0,0,0.6)';

                const nameY = sigY + sigH + (isStory ? 15 : 10);
                ctx.strokeText(authorName, width / 2, nameY);
                ctx.fillText(authorName, width / 2, nameY);

                currentY = nameY + nameFontSize + 10;
            } catch (e) { }
        }

        // ── 3. IMAGEM DO AUTOR na parte inferior ─────────────────────────────
        const scaleFactor = isStory ? 0.55 : 0.42;
        const scale = (width * scaleFactor) / img.width;
        const imgW = img.width * scale;
        const imgH = img.height * scale;

        // Posição: centralizado horizontalmente, encostado na base (com margem)
        const imgX = (width - imgW) / 2;
        const bottomMargin = isStory ? 80 : 50;
        const imgY = height - imgH - bottomMargin;

        ctx.drawImage(img, imgX, imgY, imgW, imgH);

        // ── 4. CTA DO MODO AUTOR ─────────────────────────────────────────────
        const rawCta = stripEmojis((item.frase_final || item.cta || '').trim());
        const adaptedCta = adaptText(rawCta, 60);
        
        // Determina cor de destaque baseada no gradiente da imagem
        let highlightColor = '#E8A838'; // Dourado padrão suave
        if (styleOptions?.gradientColors?.length > 1) {
            highlightColor = styleOptions.gradientColors[1];
        }
        if (metaItem?.isLast) highlightColor = '#FF6F00';
        
        if (adaptedCta) {
            drawCTAText(ctx, adaptedCta, width, height, typo, isStory, highlightColor, true, null);
        }

        // Logo
        await drawLogo(ctx, width, height, isStory);

        return canvas.toBuffer('image/png');
    }

    // ── MODO NORMAL (post/carrossel) ─────────────────────────────────────────
    if (img && !isAuthorMode) {
        // EFEITO 'COVER'
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawW, drawH, drawX, drawY;

        if (imgRatio > canvasRatio) {
            drawH = height;
            drawW = img.width * (height / img.height);
            drawX = (width - drawW) / 2;
            drawY = 0;
        } else {
            drawW = width;
            drawH = img.height * (width / img.width);
            drawX = 0;
            drawY = (height - drawH) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // ── INTEGRAÇÃO V3: APPLY BACKDROP ──────────────────────────────────────────
        // Se a inteligência V3 detectou risco, ela definiu _v3Strategy
        if (layoutDef?._v3Strategy && layoutDef?._v3Zone) {
            const backdropDef = resolveRenderStrategy(layoutDef._v3Strategy, layoutDef._v3Zone, width, height);
            applyBackdrop(ctx, backdropDef);
        } else {
            // ── FALLBACK V2: VINHETA ADAPTATIVA POR LAYOUT ──
            drawVignette(ctx, width, height, layoutId);
        }
    }

    // ── V2: LAYOUT-AWARE TEXT POSITIONING ─────────────────────────────────────
    const positions = resolveLayoutPositions(layoutDef, width, height);

    const rawTitle = stripEmojis((item.texto_principal || item.titulo || '').trim());
    const rawSub = stripEmojis((item.texto_secundario || '').trim());
    const rawCta = stripEmojis((item.frase_final || item.cta || '').trim());

    const adaptedTitle = adaptText(rawTitle, 80);
    const adaptedSub = adaptText(rawSub, 100);
    const adaptedCta = adaptText(rawCta, 60);

    const typo = getTypography(isStory);

    ctx.textBaseline = 'top';

    // ── DYNAMIC TYPOGRAPHY E CORES ─────────────────────────────────────────
    const fontFamilies = [
        '"Georgia", serif', 
        '"Playfair Display", serif', 
        '"Helvetica Neue", Arial, sans-serif', 
        '"Montserrat", sans-serif'
    ];
    // Escolhe uma fonte consistente baseada na semente global (mantém a mesma fonte no carrossel inteiro)
    const titleHash = rawTitle.length + (item.texto_secundario || '').length;
    const seed = metaItem?.globalSeed || titleHash;
    const selectedFont = fontFamilies[seed % fontFamilies.length];

    // ── BASE TEXT COLOR (CONTRASTE) ──
    // isDarkText precisa ser declarado ANTES de isLightImage (fix: TDZ bug)
    const isDarkText = styleOptions?.textColor === 'black';
    const baseTextColor = isDarkText ? '#111111' : '#FFFFFF';
    const baseSubColor  = isDarkText ? '#222222' : '#F0F0F0';
    const strokeColor   = isDarkText ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.85)';
    const shadowColor   = isDarkText ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.9)';

    // ── HIGHLIGHT COLOR DINÂMICA (CONTRASTE-AWARE) ──
    // Para imagens claras/pastel: usa paleta escura/saturada (contraste WCAG)
    // Para imagens escuras: usa paleta vibrante neon
    const isLightImage = isDarkText; // analyzeImageForText retorna textColor:'black' para imagens claras
    let highlightColor = pickVibrantColor(styleOptions?.gradientColors, seed, isLightImage);

    // ── FACE-AWARE Y ADJUSTMENT ──
    // Se temos rostos detectados e eles estão na metade superior da imagem,
    // empurramos o texto para baixo para não cobrí-los.
    const detectedFaces = metaItem?.faces || [];
    let faceAdjustY = 0;
    if (detectedFaces.length > 0) {
        const topFace = detectedFaces.reduce((top, f) => f.y < top.y ? f : top, detectedFaces[0]);
        const faceBottomRel = (topFace.y + topFace.height) / height;
        // Se o rosto termina acima de 55% da altura, e o texto está sobrepondo
        if (faceBottomRel < 0.55) {
            const faceBottomPx = topFace.y + topFace.height;
            const textStartPx  = positions.headline.y;
            if (textStartPx < faceBottomPx + 40) {
                faceAdjustY = (faceBottomPx + 40) - textStartPx;
            }
        }
    }

    // ── PRE-CALCULATE HEIGHTS TO AVOID COLLISION ──
    let headlineHeight = 0;
    if (adaptedTitle) {
        ctx.font = `bold ${typo.headline}px ${selectedFont}`;
        headlineHeight = getTextMetrics(ctx, adaptedTitle, positions.headline.maxWidth, Math.round(typo.headline * 1.25));
    }

    let subHeight = 0;
    if (adaptedSub) {
        ctx.font = `${typo.sub}px ${selectedFont}`;
        subHeight = getTextMetrics(ctx, adaptedSub, positions.subtitle.maxWidth, Math.round(typo.sub * 1.45));
    }

    const gap = Math.round(typo.headline * 0.35);
    const totalTextHeight = headlineHeight + (adaptedTitle && adaptedSub ? gap : 0) + subHeight;

    // ── DYNAMIC GROUPING ──
    let currentTextY = positions.headline.y + faceAdjustY;
    
    // Empurrar para cima se for colidir com CTA ou logo
    const maxBottomY = adaptedCta ? positions.cta.y - 60 : height * 0.82;
    if (currentTextY + totalTextHeight > maxBottomY) {
        currentTextY -= ((currentTextY + totalTextHeight) - maxBottomY);
        // Limite superior de segurança para não sumir da imagem
        const minTopY = isStory ? 180 : 120;
        if (currentTextY < minTopY) {
            currentTextY = minTopY;
        }
    }

    // ── FILTRAR DESTAQUES (hoisted: necessário para headline E subtitle) ──
    // Declarado antes dos blocos de render para estar no escopo de ambos
    const destaquesFiltrados = filterHighlightsToText(
        item.destaques || [],
        item.texto_principal || item.titulo || '',
        item.texto_secundario || ''
    );

    // ── DRAW HEADLINE ──
    if (adaptedTitle) {
        ctx.font = `bold ${typo.headline}px ${selectedFont}`;
        ctx.textAlign = positions.headline.align;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 5;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = baseTextColor;
        const mainText = adaptedTitle;
        currentTextY = wrapText(ctx, mainText, positions.headline.x, currentTextY, positions.headline.maxWidth, Math.round(typo.headline * 1.25), true, highlightColor, destaquesFiltrados, baseTextColor, positions.headline.align);
    } else {
        currentTextY = currentTextY + (positions.subtitle.y - positions.headline.y);
    }

    // ── DRAW SUBTITLE ──
    if (adaptedSub) {
        ctx.font = `${typo.sub}px ${selectedFont}`;
        ctx.textAlign = positions.subtitle.align;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = shadowColor;
        ctx.fillStyle = baseSubColor;

        // V5: Dynamic Stacking — gap proporcional ao headline
        const subY = adaptedTitle ? currentTextY + gap : currentTextY;

        wrapText(ctx, adaptedSub, positions.subtitle.x, subY, positions.subtitle.maxWidth, Math.round(typo.sub * 1.45), true, highlightColor, destaquesFiltrados, baseSubColor, positions.subtitle.align);
    }

    // ── DRAW CTA ──
    if (adaptedCta) {
        drawCTAText(ctx, adaptedCta, width, height, typo, isStory, highlightColor, false, positions);
    }

    // ── LOGO ──
    await drawLogo(ctx, width, height, isStory);

    return canvas.toBuffer('image/png');
}

// ── VIGNETTE ADAPTATIVA POR LAYOUT ───────────────────────────────────────────
// Diferente do V1 (vinheta fixa top+bottom), V2 adapta ao layout escolhido.

function drawVignette(ctx, width, height, layoutId) {
    switch (layoutId) {
        case 'top_text':
            // Vinheta forte no topo, leve na base
            drawTopVignette(ctx, width, height, 0.65, 0.40);
            drawBottomVignette(ctx, width, height, 0.35, 0.20);
            break;

        case 'bottom_text':
            // Vinheta forte na base, leve no topo
            drawTopVignette(ctx, width, height, 0.30, 0.15);
            drawBottomVignette(ctx, width, height, 0.70, 0.35);
            break;

        case 'split_left':
        case 'split_right':
            // Vinheta lateral + base
            drawTopVignette(ctx, width, height, 0.35, 0.18);
            drawBottomVignette(ctx, width, height, 0.50, 0.25);
            // Lateral gradient
            const side = layoutId === 'split_left' ? 0 : width;
            const sideGrad = ctx.createLinearGradient(side, 0, layoutId === 'split_left' ? width * 0.6 : width * 0.4, 0);
            sideGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
            sideGrad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
            sideGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sideGrad;
            ctx.fillRect(0, 0, width, height);
            break;

        case 'overlay_soft':
            // Overlay uniforme suave
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'center_text':
        default:
            // Vinheta balanceada V3
            drawTopVignette(ctx, width, height, 0.55, 0.18);
            drawBottomVignette(ctx, width, height, 0.65, 0.28);
            break;
    }
}

function drawTopVignette(ctx, width, height, maxAlpha, midAlpha) {
    const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.35);
    topVignette.addColorStop(0, `rgba(0,0,0,${maxAlpha})`);
    topVignette.addColorStop(0.6, `rgba(0,0,0,${midAlpha})`);
    topVignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, width, height * 0.35);
}

function drawBottomVignette(ctx, width, height, maxAlpha, midAlpha) {
    const bottomVignette = ctx.createLinearGradient(0, height, 0, height * 0.55);
    bottomVignette.addColorStop(0, `rgba(0,0,0,${maxAlpha})`);
    bottomVignette.addColorStop(0.5, `rgba(0,0,0,${midAlpha})`);
    bottomVignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bottomVignette;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);
}

// ── LOGO HELPER ──────────────────────────────────────────────────────────────

async function drawLogo(ctx, width, height, isStory) {
    try {
        const logoPath = './assets/logo.png';
        const logoImg = await loadImage(logoPath);
        const logoWidth = isStory ? 180 : 150; // Reduced from 260/200 to prevent collisions
        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
        const margin = isStory ? 45 : 35; // Reduced margin to push to edge
        const x = width - logoWidth - margin;
        const y = height - logoHeight - margin;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
    } catch (e) {
        // Se o logo não existir, apenas ignora
    }
}
