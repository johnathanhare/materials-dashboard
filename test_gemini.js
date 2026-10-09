const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    console.log("Using key:", process.env.GEMINI_API_KEY);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: "Hello"
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Error:", e.message || e);
  }
}
run();
