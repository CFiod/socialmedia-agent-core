import fs from 'fs';

export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * readJSON — Lê e parseia um arquivo JSON com fallback seguro.
 * Retorna o valor de `fallback` se o arquivo não existir ou for inválido.
 *
 * @param {string} filePath   - Caminho absoluto do arquivo
 * @param {*}      [fallback] - Valor de fallback (padrão: null)
 * @returns {*}
 */
export function readJSON(filePath, fallback = null) {
    if (!fs.existsSync(filePath)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

export function readLines(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

export function saveBuffer(filePath, buffer) {
    fs.writeFileSync(filePath, buffer);
}
