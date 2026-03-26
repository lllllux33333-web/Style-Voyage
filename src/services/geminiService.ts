import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 2000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = String(error?.message || "").toLowerCase();
      const status = String(error?.status || "").toLowerCase();
      const code = error?.code || error?.error?.code;

      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota') ||
        status === 'resource_exhausted' || 
        code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted');

      if (isRateLimit && retries < maxRetries) {
        retries++;
        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

export interface AestheticPersona {
  vibe: string;
  colors: string[];
  mood: string;
  keywords: string[];
}

export interface TravelDestination {
  id: string;
  name: string;
  type: 'hotel' | 'shop' | 'experience' | 'restaurant';
  description: string;
  imageUrl: string;
  aestheticScore: number;
  location: string;
}

export interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  imageUrl: string;
  goldenMoment: string;
  location: string;
}

export const analyzeAesthetic = async (input: { images?: string[], styleName?: string }): Promise<AestheticPersona> => {
  try {
    const parts: any[] = [];
    
    if (input.styleName) {
      parts.push({ text: `Analyze this aesthetic style: "${input.styleName}". Define a 'Persona Vector' for travel.` });
    } else if (input.images && input.images.length > 0) {
      parts.push({ text: "Analyze these aesthetic travel preferences from the provided images and define a 'Persona Vector'." });
      // Assuming images are base64 strings
      input.images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img.replace(/^data:image\/\w+;base64,/, "")
          }
        });
      });
    } else {
      parts.push({ text: "Analyze a general modern aesthetic travel preference and define a 'Persona Vector'." });
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vibe: { type: Type.STRING, description: "A short phrase describing the overall vibe" },
            colors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of hex color codes" },
            mood: { type: Type.STRING, description: "One word mood description" },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 aesthetic keywords" },
          },
          required: ["vibe", "colors", "mood", "keywords"],
        },
      },
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing aesthetic:", error);
    throw new Error("Failed to analyze aesthetic persona.");
  }
};

export const generateVisualScript = async (persona: AestheticPersona, city: string): Promise<ItineraryItem[]> => {
  try {
    const prompt = `Create a 1-day cinematic visual travel script for ${city} based on this aesthetic persona: ${JSON.stringify(persona)}. 
    Include 3 items (Morning, Afternoon, Evening). 
    Each item needs a time (e.g., '10:00 AM'), title, description, imageUrl (use a relevant picsum.photos seed URL like 'https://picsum.photos/seed/paris-cafe/600/400'), goldenMoment (a tip for the perfect photo), and location.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              goldenMoment: { type: Type.STRING },
              location: { type: Type.STRING },
            },
            required: ["time", "title", "description", "imageUrl", "goldenMoment", "location"],
          },
        },
      },
    }));

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating visual script:", error);
    throw new Error("Failed to generate itinerary.");
  }
};

export const getSurpriseMeRecommendation = async (location: string, persona: AestheticPersona): Promise<ItineraryItem> => {
  try {
    const prompt = `The user is in ${location}. 
    They need an immediate "Surprise Me" destination that fits their aesthetic: ${JSON.stringify(persona)}.
    Provide one unique, highly aesthetic location that maintains their visual continuity.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING, description: "Suggested time to visit" },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            imageUrl: { type: Type.STRING, description: "A relevant picsum.photos seed URL" },
            goldenMoment: { type: Type.STRING },
            location: { type: Type.STRING },
          },
          required: ["time", "title", "description", "imageUrl", "goldenMoment", "location"],
        },
      },
    }));

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error getting surprise recommendation:", error);
    throw new Error("Failed to get surprise recommendation.");
  }
};

export const getRealWeather = async (city: string): Promise<{temperature: string, condition: string, time: string, imageUrl: string}> => {
  try {
    const prompt = `Search for the current weather and temperature in ${city}.
    Then, output ONLY a JSON object with the following structure, nothing else:
    {
      "temperature": "just the number and degree symbol (e.g., '16°')",
      "condition": "a short description (e.g., 'Sunny', 'Rainy', 'Cloudy')",
      "time": "current local time in HH:MM format (e.g., '14:30')",
      "imageUrl": "a relevant unsplash image URL for ${city} during this weather condition (e.g., 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=800&auto=format&fit=crop')"
    }`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    }));

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse JSON from response");
  } catch (error) {
    console.error("Error getting real weather:", error);
    return {
      temperature: "14°",
      condition: "Rainy",
      time: "12:00",
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(city + ' rainy')}/800/600`
    };
  }
};

export const getWeatherAdaptedItinerary = async (currentItinerary: any[], weather: string, city: string): Promise<any[]> => {
  try {
    const prompt = `The user is in ${city} and the weather has changed to: ${weather}.
    Here is their current itinerary: ${JSON.stringify(currentItinerary)}.
    Please adapt this itinerary to be suitable for the new weather conditions (e.g., suggest indoor alternatives if it's raining). Keep the same aesthetic vibe.
    Return the updated itinerary.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              desc: { type: Type.STRING },
              tip: { type: Type.STRING },
              img: { type: Type.STRING },
            },
            required: ["time", "title", "desc", "tip", "img"],
          },
        },
      },
    }));

    const text = response.text || "[]";
    const items = JSON.parse(text);
    return items.map((item: any) => ({
      ...item,
      img: item.img.startsWith('http') ? item.img : `https://picsum.photos/seed/${encodeURIComponent(item.title)}/600/400`
    }));
  } catch (error) {
    console.error("Error adapting itinerary for weather:", error);
    // Fallback adapted itinerary
    return currentItinerary.map((item: any) => ({
      ...item,
      title: `(Indoor) ${item.title}`,
      desc: `Weather adapted: ${item.desc}`,
      img: `https://picsum.photos/seed/${encodeURIComponent(item.title + ' indoor')}/600/400`
    }));
  }
};
