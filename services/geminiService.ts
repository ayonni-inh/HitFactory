// AYONI STUDIO - Gemini AI Production & Mixing Assistant
// Powered by @google/genai (gemini-3.8-flash)
// Offers Mix Advice, Vocal Tuning Keys, Mastering Presets, Arrangement Markers, and Creative Ad-lib Ideas.

import { GoogleGenAI, Type } from "@google/genai";
import { TrackEffects, MasteringSettings, Marker } from '../types';

let genAI: GoogleGenAI | null = null;

export const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (apiKey) {
    genAI = new GoogleGenAI({ apiKey });
  }
};

// 1. Intelligent Vocal Mix Assistant
export interface MixAdviceResult {
  suggestion: string;
  rationale: string;
  config: Partial<TrackEffects>;
}

export const getVocalMixingAdvice = async (
  trackName: string,
  vocalType: string,
  bpm: number,
  genre: string,
  userPrompt: string
): Promise<MixAdviceResult> => {
  if (!genAI) initGemini();
  if (!genAI) {
    // Pro fallback if API key is not configured
    return {
      suggestion: `Apply a warm high-pass cut at 100Hz, de-ess the sibilance at 6.5kHz, and add a smooth 4:1 optical compression.`,
      rationale: `Gives the ${vocalType} vocal clarity and sits it in the ${genre} pocket without clashing with the low-end beat.`,
      config: {
        eq: { enabled: true, low: -4, lowMid: -1.5, highMid: 2.5, high: 3.5 },
        compression: { enabled: true, threshold: -18, ratio: 4, attack: 0.015, release: 0.18, makeup: 3 },
        deesser: { enabled: true, frequency: 6500, threshold: -22, amount: 60 },
        reverbSend: 0.25,
        delaySend: 0.15,
        saturation: { enabled: true, drive: 20, warmth: 35 }
      }
    };
  }

  const prompt = `
    You are a Grammy-winning vocal mix engineer.
    Track: "${trackName}" (Role: ${vocalType})
    Genre: "${genre}", BPM: ${bpm}
    Producer's Goal/Vibe: "${userPrompt || 'Modern polished radio ready vocal'}"
    
    Provide technical advice and exact DSP settings for 4-Band Parametric EQ, Pro Compression, De-esser, Reverb Send, and Delay Send.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            rationale: { type: Type.STRING },
            eq: {
              type: Type.OBJECT,
              properties: {
                low: { type: Type.NUMBER, description: "Gain dB (-12 to +12)" },
                lowMid: { type: Type.NUMBER, description: "Gain dB (-12 to +12)" },
                highMid: { type: Type.NUMBER, description: "Gain dB (-12 to +12)" },
                high: { type: Type.NUMBER, description: "Gain dB (-12 to +12)" }
              }
            },
            compression: {
              type: Type.OBJECT,
              properties: {
                threshold: { type: Type.NUMBER, description: "-40 to 0 dB" },
                ratio: { type: Type.NUMBER, description: "1.5 to 10" },
                attack: { type: Type.NUMBER, description: "0.005 to 0.05" },
                release: { type: Type.NUMBER, description: "0.05 to 0.4" }
              }
            },
            reverbSend: { type: Type.NUMBER, description: "0.0 to 1.0" },
            delaySend: { type: Type.NUMBER, description: "0.0 to 1.0" },
            saturationDrive: { type: Type.NUMBER, description: "0 to 100" }
          },
          required: ["suggestion", "rationale"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        suggestion: data.suggestion,
        rationale: data.rationale || '',
        config: {
          eq: {
            enabled: true,
            low: data.eq?.low ?? -3,
            lowMid: data.eq?.lowMid ?? 0,
            highMid: data.eq?.highMid ?? 2,
            high: data.eq?.high ?? 3
          },
          compression: {
            enabled: true,
            threshold: data.compression?.threshold ?? -20,
            ratio: data.compression?.ratio ?? 4,
            attack: data.compression?.attack ?? 0.015,
            release: data.compression?.release ?? 0.15,
            makeup: 3
          },
          reverbSend: Math.min(1, Math.max(0, data.reverbSend ?? 0.2)),
          delaySend: Math.min(1, Math.max(0, data.delaySend ?? 0.15)),
          saturation: {
            enabled: true,
            drive: data.saturationDrive ?? 20,
            warmth: 30
          }
        }
      };
    }
  } catch (error) {
    console.error("Gemini Vocal Mix Error:", error);
  }

  return {
    suggestion: "Boost air frequencies above 10kHz and glue the vocal with 4:1 compression.",
    rationale: "Ensures the vocals slice cleanly through the instrumental beat.",
    config: {
      eq: { enabled: true, low: -4, lowMid: -1, highMid: 2, high: 4 },
      compression: { enabled: true, threshold: -18, ratio: 4, attack: 0.01, release: 0.15, makeup: 2 },
      reverbSend: 0.25,
      delaySend: 0.15
    }
  };
};

// 2. Vocal Key & Autotune Assistant
export interface VocalKeyAdvice {
  detectedKey: string;
  scale: 'major' | 'minor' | 'chromatic';
  recommendedSpeed: number; // 0 (hard tune) to 100 (natural)
  notes: string;
}

export const getVocalTuningAdvice = async (
  genre: string,
  bpm: number,
  vibe: string
): Promise<VocalKeyAdvice> => {
  if (!genAI) initGemini();
  if (!genAI) {
    return {
      detectedKey: 'C#',
      scale: 'minor',
      recommendedSpeed: genre.toLowerCase().includes('trap') || genre.toLowerCase().includes('drill') ? 12 : 45,
      notes: `Key of C# Minor aligns with modern ${genre} vocal hooks. Set retune speed fast for tight pitch snaps.`
    };
  }

  const prompt = `
    You are an expert pitch correction specialist and vocal producer.
    The beat is in genre "${genre}" at ${bpm} BPM.
    Style notes: "${vibe}".
    Determine the most likely resonant musical Key, Scale, and optimal Autotune speed (0 = robotic Travis Scott hard tune, 100 = organic John Legend smooth).
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedKey: { type: Type.STRING },
            scale: { type: Type.STRING, enum: ["major", "minor", "chromatic"] },
            recommendedSpeed: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          },
          required: ["detectedKey", "scale", "recommendedSpeed", "notes"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (e) {
    console.warn("Gemini Tuning Error:", e);
  }

  return {
    detectedKey: 'C',
    scale: 'minor',
    recommendedSpeed: 25,
    notes: 'Defaulted to C Minor for deep melodic tone.'
  };
};

// 3. Mastering Chain Assistant
export interface MasteringAdviceResult {
  suggestion: string;
  targetPreset: 'streaming' | 'club' | 'podcast';
  config: MasteringSettings;
}

export const getMasteringAdvice = async (
  genre: string,
  targetPlatform: string,
  trackCount: number
): Promise<MasteringAdviceResult> => {
  if (!genAI) initGemini();
  if (!genAI) {
    const isClub = targetPlatform.toLowerCase().includes('club');
    return {
      suggestion: isClub ? "Target -9 LUFS with tight glue compression and controlled sub-bass." : "Target -14 LUFS for Spotify & Apple Music compliance with crisp air.",
      targetPreset: isClub ? 'club' : 'streaming',
      config: {
        gain: isClub ? 1.25 : 1.05,
        eq: { low: 1.0, mid: 0.2, high: 1.5 },
        glueComp: { enabled: true, threshold: -14, ratio: 2.5, attack: 0.03, release: 0.2 },
        limiter: { enabled: true, ceiling: -0.2, threshold: isClub ? -4.5 : -1.8 },
        targetPreset: isClub ? 'club' : 'streaming'
      }
    };
  }

  const prompt = `
    You are a top mastering engineer.
    The mix has ${trackCount} tracks in genre "${genre}".
    Target delivery: "${targetPlatform}".
    Provide master EQ adjustments, glue compressor settings, and limiter threshold to reach commercial loudness without inter-sample distortion.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestion: { type: Type.STRING },
            targetPreset: { type: Type.STRING, enum: ["streaming", "club", "podcast"] },
            gain: { type: Type.NUMBER },
            eqLow: { type: Type.NUMBER },
            eqMid: { type: Type.NUMBER },
            eqHigh: { type: Type.NUMBER },
            glueThreshold: { type: Type.NUMBER },
            limiterThreshold: { type: Type.NUMBER }
          },
          required: ["suggestion", "targetPreset", "limiterThreshold"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        suggestion: data.suggestion,
        targetPreset: data.targetPreset || 'streaming',
        config: {
          gain: data.gain || 1.1,
          eq: { low: data.eqLow || 0.8, mid: data.eqMid || 0, high: data.eqHigh || 1.2 },
          glueComp: { enabled: true, threshold: data.glueThreshold || -12, ratio: 2.5, attack: 0.03, release: 0.2 },
          limiter: { enabled: true, ceiling: -0.2, threshold: data.limiterThreshold || -2.0 },
          targetPreset: data.targetPreset || 'streaming'
        }
      };
    }
  } catch (e) {
    console.error("Gemini Mastering Error:", e);
  }

  return {
    suggestion: "Mastered for streaming platforms (-14 LUFS target).",
    targetPreset: 'streaming',
    config: {
      gain: 1.05,
      eq: { low: 0.5, mid: 0, high: 1.2 },
      glueComp: { enabled: true, threshold: -12, ratio: 2, attack: 0.03, release: 0.2 },
      limiter: { enabled: true, ceiling: -0.2, threshold: -1.8 },
      targetPreset: 'streaming'
    }
  };
};

// 4. Song Arrangement & Marker Helper
export const getArrangementMarkers = async (
  totalDurationSeconds: number,
  bpm: number,
  genre: string
): Promise<Marker[]> => {
  const barSec = (60 / bpm) * 4;
  
  if (!genAI) initGemini();
  if (!genAI) {
    // Standard pop/hip-hop 8-bar structure
    return [
      { id: 'm1', name: 'Intro', time: 0, color: '#6366f1' },
      { id: 'm2', name: 'Verse 1', time: Math.min(totalDurationSeconds, barSec * 4), color: '#3b82f6' },
      { id: 'm3', name: 'Pre-Chorus', time: Math.min(totalDurationSeconds, barSec * 12), color: '#ec4899' },
      { id: 'm4', name: 'Hook / Chorus', time: Math.min(totalDurationSeconds, barSec * 16), color: '#f59e0b' },
      { id: 'm5', name: 'Verse 2', time: Math.min(totalDurationSeconds, barSec * 24), color: '#10b981' },
      { id: 'm6', name: 'Outro', time: Math.max(0, totalDurationSeconds - (barSec * 4)), color: '#8b5cf6' }
    ];
  }

  const prompt = `
    Suggest standard song structure markers (Intro, Verse, Hook, Bridge, Outro) for a ${genre} track.
    Total duration: ${Math.round(totalDurationSeconds)} seconds, Tempo: ${bpm} BPM.
    Calculate timestamps based on exact 4-bar or 8-bar boundaries.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              time: { type: Type.NUMBER },
              color: { type: Type.STRING }
            },
            required: ["name", "time"]
          }
        }
      }
    });

    if (response.text) {
      const markers = JSON.parse(response.text);
      return markers.map((m: any, idx: number) => ({
        id: `marker_${Date.now()}_${idx}`,
        name: m.name,
        time: Math.min(totalDurationSeconds, Math.max(0, m.time)),
        color: m.color || '#8b5cf6'
      }));
    }
  } catch (e) {
    console.warn("Gemini Arrangement Error:", e);
  }

  return [
    { id: 'm1', name: 'Intro', time: 0, color: '#6366f1' },
    { id: 'm2', name: 'Verse 1', time: barSec * 4, color: '#3b82f6' },
    { id: 'm3', name: 'Hook', time: barSec * 12, color: '#f59e0b' },
    { id: 'm4', name: 'Outro', time: barSec * 20, color: '#8b5cf6' }
  ];
};

// 5. Creative Ideas (Punchlines, Ad-libs, Vocal Layering)
export interface CreativeIdeasResult {
  adlibs: string[];
  vocalLayers: string[];
  punchlines: string[];
  trackTitleSuggestions: string[];
}

export const getCreativeIdeas = async (
  theme: string,
  genre: string
): Promise<CreativeIdeasResult> => {
  if (!genAI) initGemini();
  if (!genAI) {
    return {
      adlibs: ["(Skrrt, skrrt!)", "(Yeah, right now)", "(Ooh-ooh-ah)", "(Hold on)", "(Echo...)"],
      vocalLayers: [
        "Record an octave-down whisper double on the end of each punchline",
        "Add a stereo telephone-EQ panned left/right response",
        "Record high fifth harmony on the second half of the chorus"
      ],
      punchlines: [
        "Turning late-night static into platinum plaques",
        "They was sleeping on the vision till the signal cracked",
        "Moving different in the city with no safety track"
      ],
      trackTitleSuggestions: ["Midnight Frequency", "Golden Hour Echo", "Cold Neon", "Late Call", "Off The Grid"]
    };
  }

  const prompt = `
    You are an executive hit producer and songwriter collaborating in the studio.
    Song theme: "${theme || 'Late night grind and luxury'}"
    Genre: "${genre}"
    Generate:
    1. 5 signature ad-lib vocal cues (formatted with parentheses)
    2. 3 vocal layering & stacking techniques for this specific track
    3. 3 hard-hitting lyric punchlines/bars
    4. 4 viral track title ideas.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adlibs: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocalLayers: { type: Type.ARRAY, items: { type: Type.STRING } },
            punchlines: { type: Type.ARRAY, items: { type: Type.STRING } },
            trackTitleSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["adlibs", "vocalLayers", "punchlines", "trackTitleSuggestions"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (e) {
    console.error("Gemini Creative Ideas Error:", e);
  }

  return {
    adlibs: ["(Yeah!)", "(Ooh)", "(Let's go)", "(Turn it up)", "(Listen)"],
    vocalLayers: [
      "Record a low double an octave below",
      "Panned double vocal 30% Left and 30% Right"
    ],
    punchlines: [
      "Built the studio in the bedroom, now we run the stage"
    ],
    trackTitleSuggestions: ["Ayoni Anthem", "Gold Wave", "Night Shift"]
  };
};