import path from 'path';
import { readFileSync } from 'fs';
import { generateAndSaveImages } from './services/imageService.js';

async function main() {
    const outputs = ['2026-04-29T08-33-45_post', '2026-04-29T08-34-23_autor'];
    
    for (const dirName of outputs) {
        const outputDir = path.resolve('output', dirName);
        console.log(`Processando diretório: ${outputDir}`);
        
        try {
            const dataJson = JSON.parse(readFileSync(path.join(outputDir, 'data.json')));
            const metaJson = JSON.parse(readFileSync(path.join(outputDir, 'meta.json')));
            
            console.log(`🎨 Gerando imagens para: ${dirName}`);
            await generateAndSaveImages(
                outputDir,
                metaJson,
                dataJson.slides,
                metaJson.autor || null,
                dataJson.estilo_visual?.base || 'editorial_minimalist',
                dataJson.publico || null,
                dataJson.estrategia?.tema || null
            );
            console.log(`✅ Sucesso para: ${dirName}\n`);
        } catch (e) {
            console.error(`❌ Erro em ${dirName}: ${e.message}`);
        }
    }
    console.log("Pronto!");
}

main();
