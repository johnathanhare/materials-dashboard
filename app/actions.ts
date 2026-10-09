'use server';

import { GoogleGenAI } from '@google/genai';

export async function fetchRealMaterials() {
  const apiKey = process.env.MATERIALS_PROJECT_API_KEY;
  if (!apiKey) {
    throw new Error("API Key missing");
  }

  // Fetch 100 materials from The Materials Project API v2
  // Using _limit and _fields instead of limit and fields
  const url = 'https://api.materialsproject.org/materials/summary/?has_props=elasticity&_limit=100&_fields=material_id,formula_pretty,density,bulk_modulus,shear_modulus';
  
  const response = await fetch(url, {
    headers: { 'X-API-KEY': apiKey },
    next: { revalidate: 3600 } 
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("MP API Error:", errText);
    throw new Error(`MP API Error: ${response.statusText}`);
  }

  const json = await response.json();
  const rawData = json.data || [];

  const commonNames: Record<string, string> = {
    'Fe': 'Iron', 'Al': 'Aluminum', 'Cu': 'Copper', 'Ti': 'Titanium', 'Si': 'Silicon',
    'C': 'Diamond/Graphite', 'Ag': 'Silver', 'Au': 'Gold', 'Pt': 'Platinum', 'Ni': 'Nickel',
    'Zn': 'Zinc', 'Pb': 'Lead', 'Sn': 'Tin', 'W': 'Tungsten', 'Mo': 'Molybdenum',
    'Al2O3': 'Alumina', 'SiO2': 'Silica', 'NaCl': 'Salt', 'TiO2': 'Titania', 'SiC': 'Silicon Carbide',
    'WC': 'Tungsten Carbide', 'ZnO': 'Zinc Oxide', 'MgO': 'Magnesia'
  };

  const processed = rawData.map((mat: any) => {
    // Calculate Young's Modulus (E) from Bulk (K) and Shear (G) moduli (VRH averages)
    const K = mat.bulk_modulus?.vrh || 0; 
    const G = mat.shear_modulus?.vrh || 0; 
    let E = 0;
    if (K > 0 && G > 0) {
      E = (9 * K * G) / (3 * K + G);
    }
    
    let name = mat.formula_pretty;
    if (commonNames[name]) {
      name = `${name} (${commonNames[name]})`;
    }

    // Heuristic to guess if a computed crystal is a Ceramic or a Metal based on elements
    const elements = name.match(/[A-Z][a-z]?/g) || [];
    const ceramicIndicators = new Set(['O', 'N', 'F', 'Cl', 'Br', 'I', 'S', 'P']);
    const isCeramic = elements.some((el: string) => ceramicIndicators.has(el));
    const family = isCeramic ? 'Computed Ceramic' : 'Computed Metal';

    return {
      name: name,
      id: mat.material_id,
      density: mat.density ? Number(mat.density.toFixed(2)) : 0,
      modulus: E ? Number(E.toFixed(1)) : 0,
      bulkModulus: K ? Number(K.toFixed(1)) : 0,
      shearModulus: G ? Number(G.toFixed(1)) : 0,
      family: family,
    };
  }).filter((m: any) => m.modulus > 0.5 && m.modulus < 2000 && m.density > 0.5 && m.density < 25);

  return processed;
}

export async function askMaterialCopilot(query: string, currentMaterials: any[]) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      response: "I received your query: '" + query + "'. (Add GEMINI_API_KEY to .env.local to activate real AI!)",
      highlightIds: []
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    You are an expert Materials Informatics AI Copilot. 
    The user is looking at a dataset of materials. 
    User Query: "${query}"
    
    Here is a JSON list of the materials currently in their database:
    ${JSON.stringify(currentMaterials.slice(0, 50))}
    
    Respond with a very brief, helpful answer (2 sentences max) recommending the best material from the list for their specific constraint.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });
    
    return {
      response: response.text,
      highlightIds: []
    };
  } catch (error) {
    console.error(error);
    return { response: "Sorry, I ran into an error connecting to the AI brain.", highlightIds: [] };
  }
}
