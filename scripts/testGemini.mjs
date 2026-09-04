import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

console.log('Testing Gemini API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT FOUND');

const models = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

for (const model of models) {
  try {
    console.log(`Trying model: ${model}...`);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: 'Explain retail inventory safety stock in 1 short sentence.',
    });
    console.log(`✓ Model ${model} SUCCESS:`, response.text);
    break;
  } catch (err) {
    console.log(`  ✗ Model ${model} error:`, err.message);
  }
}
