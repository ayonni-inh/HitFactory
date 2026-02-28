export interface Track {
  id: string;
  name: string;
  type: 'beat' | 'vocal';
  vocalType?: 'main' | 'adlib' | 'double' | 'harmony';
  color: string;
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean;
  volume: number; // 0.0 to 1.0 (gain)
  pan: number; // -1.0 to 1.0
  effects: TrackEffects;
  waveformData: number[]; // Simplified visualization data
  startTime?: number; // Start time in the project (seconds)
  offset?: number; // Offset within the audio buffer (seconds)
  duration?: number; // Duration to play (seconds)
}

export interface LoopSettings {
  enabled: boolean;
  start: number;
  end: number;
}

export interface TrackEffects {
  eq: {
    low: number; // -20 to 20 dB
    mid: number;
    high: number;
  };
  reverb: {
    mix: number; // 0.0 to 1.0
    decay: number;
  };
  delay: {
    mix: number;
    time: number; // 0.0 to 1.0 (relative)
    feedback: number;
  };
  compression: {
    threshold: number; // -60 to 0
    ratio: number; // 1 to 20
  };
  autotune: {
    enabled: boolean;
    amount: number; // 0 to 100%
    key: string;
  };
}

export interface MasteringSettings {
  gain: number; // 0.0 to 2.0
  eq: {
    low: number; // -10 to 10 dB
    mid: number;
    high: number;
  };
  limiter: {
    threshold: number; // -20 to 0 dB
  };
}

export interface AIProcessingState {
  isAnalyzing: boolean;
  suggestion: string | null;
  error: string | null;
}

export enum RecorderState {
  IDLE = 'IDLE',
  COUNTING_IN = 'COUNTING_IN',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING'
}

export type QuantizationValue = 'none' | '1/4' | '1/8' | '1/16' | '1/32';
