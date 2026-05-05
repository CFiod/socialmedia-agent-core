import fs from 'fs';
import path from 'path';

const memory = [];
const LOG_FILE = path.resolve('memory', 'ai_log.json');

export function saveInteraction(prompt, output, modelStats) {
  const entry = { prompt, output, modelStats, timestamp: Date.now() };
  memory.push(entry);
  
  try {
    let history = [];
    if (fs.existsSync(LOG_FILE)) {
      history = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
    history.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.warn('⚠️ Não foi possível salvar o log da IA:', err.message);
  }
}

export function getInteractionHistory() {
  return memory;
}
