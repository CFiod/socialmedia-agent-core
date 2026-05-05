import { config } from '../config/config.js';

// ─────────────────────────────────────────────────────────────────────────────
// detectFaces — Detecta rostos e retorna caixas delimitadoras (bounding boxes)
// Usa Gemini como primária, com fallback para OpenRouter e resposta sintética.
// ─────────────────────────────────────────────────────────────────────────────
export async function detectFaces(imageBuffer, imgW = 1080, imgH = 1440) {
    if (!imageBuffer) return [];

    const base64Image = imageBuffer.toString('base64');

    const prompt = [
        'Analyze this image. If there are human faces, return a JSON array of bounding boxes:',
        '[{ "x": number, "y": number, "width": number, "height": number }]',
        'All values in pixels. Image dimensions are ' + imgW + 'x' + imgH + '.',
        'If no faces, return []. Return ONLY valid JSON, no markdown.'
    ].join(' ');

    // PRIORIDADE 1: Google Gemini
    if (config.GOOGLE_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${config.GOOGLE_API_KEY}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/png', data: base64Image } }
                    ]}],
                    generationConfig: { temperature: 0.1 }
                })
            });
            const data = await res.json();
            const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (raw) {
                const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                const faces = JSON.parse(cleaned);
                if (Array.isArray(faces)) {
                    console.log(`   👁️  [FaceDetect] Gemini: ${faces.length} rosto(s) detectado(s).`);
                    return faces;
                }
            }
        } catch (e) {
            console.warn('   ⚠️ [FaceDetect] Gemini falhou, usando fallback...');
        }
    }

    // PRIORIDADE 2: OpenRouter
    if (config.OPENROUTER_API_KEY) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
                        ]
                    }],
                    max_tokens: 200
                })
            });
            const data = await res.json();
            let raw = data?.choices?.[0]?.message?.content || '';
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const faces = JSON.parse(raw);
            if (Array.isArray(faces)) {
                console.log(`   👁️  [FaceDetect] OpenRouter: ${faces.length} rosto(s) detectado(s).`);
                return faces;
            }
        } catch (e) {
            console.warn('   ⚠️ [FaceDetect] OpenRouter falhou. Sem dados de rosto.');
        }
    }

    return []; // Sem detecção disponível
}

export async function analyzeImageForText(imageBuffer, caption) {
    if (!imageBuffer) return { gradientColors: ['#1a1a1a', '#434343'] };

    console.log('\n👁️  Analisando imagem para otimizar layout de texto...');
    const base64Image = imageBuffer.toString('base64');

    // -- PRIORIDADE 1: GOOGLE GEMINI (GRÁTIS) --
    if (config.GOOGLE_API_KEY) {
        try {
            // Usando modelo 1.5-flash que é excelente para visão e gratuito
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${config.GOOGLE_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Analyze this image for social media text overlay. Return ONLY a JSON object with: { \"faces\": boolean, \"brightness\": number, \"primaryColor\": \"string\", \"textColor\": \"white\"|\"black\", \"safeZone\": { \"x\": number, \"y\": number, \"w\": number, \"h\": number } }. Avoid areas with faces or complex patterns for the safeZone." },
                            { inline_data: { mime_type: "image/png", data: base64Image } }
                        ]
                    }],
                    generationConfig: {
                        response_mime_type: "application/json",
                        temperature: 0.1
                    }
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const result = JSON.parse(data.candidates[0].content.parts[0].text);
                console.log('✅ Visão: Google Gemini analisou a imagem com sucesso (Gratuito)');
                return result;
            }
        } catch (e) {
            console.warn('⚠️ Google Vision falhou ou sem cota, tentando OpenRouter...');
        }
    }

    // -- PRIORIDADE 2: OPENROUTER (FALLBACK PAGO) --
    if (config.OPENROUTER_API_KEY) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Analyze this image and return JSON: { \"faces\": boolean, \"brightness\": number, \"primaryColor\": \"string\", \"textColor\": \"white\"|\"black\", \"safeZone\": { \"x\":0, \"y\":0, \"w\":0, \"h\":0 } }" },
                                { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
                            ]
                        }
                    ],
                    max_tokens: 150
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0].message.content) {
                let content = data.choices[0].message.content.trim();
                content = content.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(content);
            }
        } catch (e) {
            console.error('❌ Erro no serviço de visão:', e.message);
        }
    }

    // Padrão se tudo falhar
    return {
        faces: false,
        brightness: 50,
        primaryColor: '#000000',
        textColor: 'white',
        gradientColors: ['#1a1a1a', '#434343'],
        safeZone: { x: 0, y: 1080, w: 1080, h: 360 } // fallback: zona inferior
    };
}
