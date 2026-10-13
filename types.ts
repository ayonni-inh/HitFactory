// AYONI STUDIO - Core Data Models and Types

export type VocalType = 'main' | 'adlib' | 'double' | 'harmony' | 'backing';
export type TrackType = 'beat' | 'vocal' | 'reference';

export interface Marker {
  id: string;
  name: string;
  time: number; // seconds
  color: string;
}

export interface Take {
  id: string;
  trackId: string;
  takeNumber: number;
  blob: Blob;
  duration: number;
  startTime: number;
  createdAt: number;
  isSelected: boolean;
  notes?: string;
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  start: number; // Project timeline start in seconds
  duration: number; // Play duration in seconds
  offset: number; // Offset inside source audio buffer in seconds
  gain: number; // 0.0 to 2.0 (clip trim)
  fadeIn: number; // Fade in seconds
  fadeOut: number; // Fade out seconds
  isMuted: boolean;
  isReversed: boolean;
  peaks: number[]; // Normalized waveform peak points (-1 to 1 or 0 to 1)
  audioBuffer?: AudioBuffer;
  blob?: Blob;
}

export interface ParametricBand {
  frequency: number; // Hz
  gain: number; // dB (-18 to +18)
  q: number; // Q factor (0.1 to 10)
  type: 'lowshelf' | 'peaking' | 'highshelf' | 'highpass' | 'lowpass';
}

export interface TrackEffects {
  gain: number; // Trim gain in dB (-12 to +12)
  gate: {
    enabled: boolean;
    threshold: number; // -80 to 0 dB
    reduction: number; // -40 to 0 dB
  };
  eq: {
    enabled: boolean;
    low: number; // -18 to +18 dB (low shelf @ 100Hz)
    lowMid: number; // -18 to +18 dB (peaking @ 500Hz)
    highMid: number; // -18 to +18 dB (peaking @ 3kHz)
    high: number; // -18 to +18 dB (high shelf @ 10kHz)
  };
  deesser: {
    enabled: boolean;
    frequency: number; // 4000 - 9000 Hz
    threshold: number; // -40 to 0 dB
    amount: number; // 0 to 100%
  };
  compression: {
    enabled: boolean;
    threshold: number; // -60 to 0 dB
    ratio: number; // 1 to 20
    attack: number; // seconds (0.001 to 0.1)
    release: number; // seconds (0.01 to 1.0)
    makeup: number; // dB (0 to 24)
  };
  saturation: {
    enabled: boolean;
    drive: number; // 0 to 100%
    warmth: number; // 0 to 100%
  };
  reverbSend: number; // 0 to 1 (Send to Reverb Bus)
  delaySend: number; // 0 to 1 (Send to Delay Bus)
  autotune: {
    enabled: boolean;
    key: string; // 'C', 'C#', etc.
    scale: 'chromatic' | 'major' | 'minor' | 'dorian' | 'pentatonic';
    speed: number; // 0 to 100% (0 = robotic hard tune, 100 = natural slow)
    amount: number; // 0 to 100%
  };
}

export interface ReverbBusSettings {
  enabled: boolean;
  type: 'room' | 'hall' | 'plate' | 'space';
  decay: number; // seconds (0.5 to 7.0)
  preDelay: number; // seconds (0 to 0.1)
  mix: number; // 0 to 1
  highCut: number; // Hz (1000 to 18000)
}

export interface DelayBusSettings {
  enabled: boolean;
  time: number; // seconds or tempo division (0.05 to 1.5)
  sync: 'free' | '1/4' | '1/8d' | '1/8' | '1/16';
  feedback: number; // 0 to 0.95
  mix: number; // 0 to 1
  pingPong: boolean;
  highCut: number; // Hz
}

export interface MasteringSettings {
  gain: number; // Output gain (0.5 to 2.0)
  glueComp: {
    enabled: boolean;
    threshold: number; // -30 to 0 dB
    ratio: number; // 1.5 to 6
    attack: number; // 0.01 to 0.1
    release: number; // 0.1 to 0.8
  };
  eq: {
    low: number; // -6 to +6 dB
    mid: number; // -6 to +6 dB
    high: number; // -6 to +6 dB
  };
  limiter: {
    enabled: boolean;
    ceiling: number; // -0.5 to 0 dBFS
    threshold: number; // -12 to 0 dB
  };
  targetPreset: 'streaming' | 'club' | 'podcast' | 'custom';
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  vocalType?: VocalType;
  color: string;
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean;
  volume: number; // 0.0 to 1.5 (gain multiplier, 1.0 = 0dB)
  pan: number; // -1.0 to 1.0 (Left to Right)
  effects: TrackEffects;
  clips: Clip[];
  takes: Take[];
  showTakeLanes?: boolean;
}

export interface LoopSettings {
  enabled: boolean;
  start: number; // In seconds
  end: number; // In seconds
}

export interface ReferenceTrack {
  loaded: boolean;
  name: string;
  audioBuffer?: AudioBuffer;
  blob?: Blob;
  gain: number; // Volume match gain
  isActive: boolean; // When active, mix is muted and reference is auditioned
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number]; // e.g. [4, 4]
  sampleRate: number;
  latencyCompensationMs: number; // e.g. 35 ms
  markers: Marker[];
  tracks: Track[];
  loopSettings: LoopSettings;
  masteringSettings: MasteringSettings;
  reverbBus: ReverbBusSettings;
  delayBus: DelayBusSettings;
  createdAt: number;
  updatedAt: number;
}

export enum RecorderState {
  IDLE = 'IDLE',
  COUNTING_IN = 'COUNTING_IN',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING'
}

export type QuantizationValue = 'none' | '1/4' | '1/8' | '1/16' | '1/32';

export interface MeterLevels {
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  lufsIntegrated: number;
  lufsShortTerm: number;
  isClipping: boolean;
}
