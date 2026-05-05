import fs from 'fs';
import path from 'path';

export function generatePreview(outputDir, metaJson, dataJson) {
    const templatePath = path.resolve('preview', 'template.html');
    let template = fs.existsSync(templatePath) 
        ? fs.readFileSync(templatePath, 'utf8')
        : '<html><body><h1>Preview indisponível (Template não encontrado)</h1></body></html>';

    const isPost = metaJson.tipo === 'post';
    const items = isPost 
        ? (dataJson.conteudo ? [dataJson.conteudo] : []) 
        : (dataJson.slides || (dataJson.conteudo ? [dataJson.conteudo] : []));

    let slidesHtml = '';
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const baseName = isPost ? 'post' : `slide-${i + 1}`;
        slidesHtml += `
        <div class="slide">
            <img src="images/feed/${baseName}.png" alt="${baseName}">
            <div class="slide-title">${item.texto_principal || item.titulo || 'Post'}</div>
            ${item.texto_secundario ? `<div style="margin-top: 10px; font-size: 0.9em; white-space: pre-line;">${item.texto_secundario}</div>` : ''}
            ${item.frase_final ? `<div style="margin-top: 15px; font-weight: bold; font-size: 0.95em; color: #b30000;">${item.frase_final}</div>` : ''}
            ${item.cta ? `<div style="margin-top: 15px; padding: 10px; background: #eef; border-radius: 4px; font-weight: bold; text-align: center;">${item.cta}</div>` : ''}
            <div style="font-size:0.8em; color:#888; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;"><i>Visual: ${item.descricao_visual || item.descricao || ''}</i></div>
        </div>`;
    }

    template = template.replace('{{TEMA}}', dataJson.tema);
    template = template.replace('{{TIPO}}', metaJson.tipo.toUpperCase());
    template = template.replace('{{SLIDES_HTML}}', slidesHtml);
    
    // Fallbacks to handle JSON paths regardless of format variance
    const rawCaption = isPost ? (dataJson.conteudo?.legenda?.texto ?? dataJson.conteudo?.caption ?? '') : (dataJson.legenda?.texto ?? dataJson.caption ?? '');
    const rawHashtags = isPost ? (dataJson.conteudo?.legenda?.hashtags ?? dataJson.conteudo?.hashtags) : (dataJson.legenda?.hashtags ?? dataJson.hashtags);
    
    template = template.replace('{{CAPTION}}', rawCaption || '');
    template = template.replace('{{HASHTAGS}}', rawHashtags && Array.isArray(rawHashtags) ? rawHashtags.join(' ') : (rawHashtags || ''));

    fs.writeFileSync(path.join(outputDir, 'preview.html'), template, 'utf8');
}
