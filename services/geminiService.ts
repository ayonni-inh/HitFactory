import { GoogleGenAI, Type } from "@google/genai";
import { TrackEffects, MasteringSettings } from '../types';

let genAI: GoogleGenAI | null = null;

export const initGemini = () => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (key) {
        genAI = new GoogleGenAI({ apiKey: key });
    }
};

export const getMixingAdvice = async (trackName: string, description: string, currentGenre: string): Promise<{ suggestion: string, config: Partial<TrackEffects> }> => {
  if (!genAI) initGemini();
  if (!genAI) throw new Error("API Key not found");

  const prompt = `
    Act as a world-class audio mixing engineer.
    I have a track named "${trackName}" which is a "${description}" in the genre "${currentGenre}".
    Provide a concise technical suggestion (max 2 sentences) and a JSON configuration for EQ, Compression, Reverb, and Delay effects to achieve a professional sound.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            eq: {
                type: Type.OBJECT,
                properties: {
                    low: { type: Type.NUMBER, description: "Gain in dB (-20 to 20)" },
                    mid: { type: Type.NUMBER, description: "Gain in dB (-20 to 20)" },
                    high: { type: Type.NUMBER, description: "Gain in dB (-20 to 20)" }
                }
            },
            reverb: {
                type: Type.OBJECT,
                properties: {
                    mix: { type: Type.NUMBER, description: "0.0 to 1.0" },
                    decay: { type: Type.NUMBER, description: "Seconds 0.1 to 10" }
                }
            },
            delay: {
                type: Type.OBJECT,
                properties: {
                    mix: { type: Type.NUMBER, description: "0.0 to 1.0" },
                    time: { type: Type.NUMBER, description: "Seconds 0.0 to 2.0" },
                    feedback: { type: Type.NUMBER, description: "0.0 to 1.0" }
                }
            },
            compression: {
                type: Type.OBJECT,
                properties: {
                    threshold: { type: Type.NUMBER, description: "-60 to 0 dB" },
                    ratio: { type: Type.NUMBER, description: "1 to 20" }
                }
            }
          }
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        
        // Construct partial TrackEffects
        const config: Partial<TrackEffects> = {
            eq: {
                low: data.eq?.low || 0,
                mid: data.eq?.mid || 0,
                high: data.eq?.high || 0,
            },
            reverb: {
                mix: data.reverb?.mix || 0,
                decay: data.reverb?.decay || 1.5,
            },
            delay: {
                mix: data.delay?.mix || 0,
                time: data.delay?.time || 0.2,
                feedback: data.delay?.feedback || 0.3
            },
            compression: {
                threshold: data.compression?.threshold || -20,
                ratio: data.compression?.ratio || 4
            },
            autotune: { enabled: false, amount: 0, key: 'C' }
        };

        return {
            suggestion: data.suggestion,
            config
        };
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const getMasteringAdvice = async (trackCount: number, genre: string, intent: string): Promise<{ suggestion: string, config: MasteringSettings }> => {
    if (!genAI) initGemini();
    if (!genAI) throw new Error("API Key not found");

    const prompt = `
      Act as a professional mastering engineer.
      I have a mix with ${trackCount} tracks in the genre "${genre}".
      My goal is: "${intent}".
      Provide a concise mastering suggestion (max 2 sentences) and a JSON configuration for Master EQ, Limiter Threshold, and Output Gain.
    `;

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING },
                        gain: { type: Type.NUMBER, description: "0.5 to 1.5" },
                        eq: {
                            type: Type.OBJECT,
                            properties: {
                                low: { type: Type.NUMBER, description: "-5 to 5 dB" },
                                mid: { type: Type.NUMBER, description: "-5 to 5 dB" },
                                high: { type: Type.NUMBER, description: "-5 to 5 dB" }
                            }
                        },
                        limiter: {
                            type: Type.OBJECT,
                            properties: {
                                threshold: { type: Type.NUMBER, description: "-10 to 0 dB" }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return {
                suggestion: data.suggestion,
                config: {
                    gain: data.gain || 1.0,
                    eq: {
                        low: data.eq?.low || 0,
                        mid: data.eq?.mid || 0,
                        high: data.eq?.high || 0
                    },
                    limiter: {
                        threshold: data.limiter?.threshold || -1.0
                    }
                }
            };
        }
        throw new Error("No response from AI");
    } catch (error) {
        console.error("Gemini Mastering Error:", error);
        throw error;
    }
};