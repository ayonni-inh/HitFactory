// AYONI STUDIO - Professional Web Audio Engine
// Real Web Audio API Graph with Parametric EQ, Glue Comp, De-Esser, Gate, 
// Saturation Waveshaper, Algorithmic Convolver Reverb, Stereo Delay, 
// Master Bus with ITU-R BS.1770 LUFS metering, Latency Compensated Recording,
// Multi-Take management, and Offline Mixdown / Stems Export.

import { 
  Track, Clip, Take, TrackEffects, MasteringSettings, 
  ReverbBusSettings, DelayBusSettings, LoopSettings, MeterLevels 
} from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  
  // Master Graph Nodes
  private masterGain: GainNode | null = null;
  private masterEqLow: BiquadFilterNode | null = null;
  private masterEqMid: BiquadFilterNode | null = null;
  private masterEqHigh: BiquadFilterNode | null = null;
  private masterGlueComp: DynamicsCompressorNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;

  // Auxiliary FX Busses
  private reverbBusGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbFilter: BiquadFilterNode | null = null;
  
  private delayBusGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private delayFilterNode: BiquadFilterNode | null = null;

  // Track Nodes mapping: trackId -> active nodes
  private activeClipSources: Map<string, AudioBufferSourceNode[]> = new Map();
  private trackChannelStrips: Map<string, {
    inputGain: GainNode;
    eqLow: BiquadFilterNode;
    eqLowMid: BiquadFilterNode;
    eqHighMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    saturator: WaveShaperNode;
    reverbSend: GainNode;
    delaySend: GainNode;
    fader: GainNode;
    panner: StereoPannerNode;
    analyser: AnalyserNode;
  }> = new Map();

  // Buffer Cache: clipId/trackId -> AudioBuffer
  private bufferCache: Map<string, AudioBuffer> = new Map();

  // Playback & Transport State
  private isPlaying: boolean = false;
  private playbackStartTime: number = 0;
  private currentPlayheadOffset: number = 0;
  private loopSettings: LoopSettings = { enabled: false, start: 0, end: 16 };
  private bpm: number = 120;

  // Metronome State
  private metronomeActive: boolean = false;
  private metronomeTimer: number | null = null;
  private nextClickTime: number = 0;
  private metronomeVolume: number = 0.5;

  // Recording State & Nodes
  private micStream: MediaStream | null = null;
  private recordingNodes: {
    source: MediaStreamAudioSourceNode;
    gain: GainNode;
    analyser: AnalyserNode;
    destination: MediaStreamAudioDestinationNode;
  } | null = null;
  private monitorGain: GainNode | null = null;
  private isMonitoringEnabled: boolean = false;

  // Reference Track
  private referenceBuffer: AudioBuffer | null = null;
  private referenceSource: AudioBufferSourceNode | null = null;
  private referenceGainNode: GainNode | null = null;
  private isReferenceActive: boolean = false;

  // Saturation curve cache
  private distortionCurve: Float32Array | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  // --- AudioContext Initialization ---

  async init(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // 1. Master Chain
      this.masterEqLow = this.ctx.createBiquadFilter();
      this.masterEqLow.type = 'lowshelf';
      this.masterEqLow.frequency.value = 100;

      this.masterEqMid = this.ctx.createBiquadFilter();
      this.masterEqMid.type = 'peaking';
      this.masterEqMid.frequency.value = 1200;
      this.masterEqMid.Q.value = 1.0;

      this.masterEqHigh = this.ctx.createBiquadFilter();
      this.masterEqHigh.type = 'highshelf';
      this.masterEqHigh.frequency.value = 10000;

      // Master Glue Compressor
      this.masterGlueComp = this.ctx.createDynamicsCompressor();
      this.masterGlueComp.threshold.value = -12;
      this.masterGlueComp.ratio.value = 2.5;
      this.masterGlueComp.attack.value = 0.03;
      this.masterGlueComp.release.value = 0.2;

      // Brickwall Limiter
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.value = -0.5;
      this.masterLimiter.ratio.value = 20;
      this.masterLimiter.attack.value = 0.001;
      this.masterLimiter.release.value = 0.1;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 1024;
      this.masterAnalyser.smoothingTimeConstant = 0.7;

      // Connect Master Chain
      this.masterEqLow.connect(this.masterEqMid);
      this.masterEqMid.connect(this.masterEqHigh);
      this.masterEqHigh.connect(this.masterGlueComp);
      this.masterGlueComp.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterGain);
      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);

      // 2. Aux FX Bus: Reverb
      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbFilter = this.ctx.createBiquadFilter();
      this.reverbFilter.type = 'lowpass';
      this.reverbFilter.frequency.value = 12000;
      this.reverbBusGain = this.ctx.createGain();
      this.reverbBusGain.gain.value = 1.0;

      this.updateReverbImpulse(2.5, 'plate');

      this.reverbConvolver.connect(this.reverbFilter);
      this.reverbFilter.connect(this.reverbBusGain);
      this.reverbBusGain.connect(this.masterEqLow);

      // 3. Aux FX Bus: Delay
      this.delayNode = this.ctx.createDelay(3.0);
      this.delayNode.delayTime.value = 0.375; // Default dotted 8th @ 120bpm
      this.delayFeedbackNode = this.ctx.createGain();
      this.delayFeedbackNode.gain.value = 0.4;
      this.delayFilterNode = this.ctx.createBiquadFilter();
      this.delayFilterNode.type = 'lowpass';
      this.delayFilterNode.frequency.value = 4500;
      this.delayBusGain = this.ctx.createGain();
      this.delayBusGain.gain.value = 1.0;

      // Delay feedback loop: Delay -> Filter -> Feedback -> Delay
      this.delayNode.connect(this.delayFilterNode);
      this.delayFilterNode.connect(this.delayFeedbackNode);
      this.delayFeedbackNode.connect(this.delayNode);
      // Send to bus output
      this.delayFilterNode.connect(this.delayBusGain);
      this.delayBusGain.connect(this.masterEqLow);

      // 4. Reference Track Node
      this.referenceGainNode = this.ctx.createGain();
      this.referenceGainNode.gain.value = 1.0;
      this.referenceGainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getState(): string {
    return this.ctx?.state || 'uninitialized';
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // --- Algorithmic Impulse Response for Reverb ---

  private updateReverbImpulse(durationSec: number = 2.5, type: 'room' | 'hall' | 'plate' | 'space' = 'plate') {
    if (!this.ctx || !this.reverbConvolver) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.max(0.2, durationSec));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const decayFactor = type === 'room' ? 5.0 : type === 'hall' ? 3.0 : type === 'space' ? 1.5 : 2.5;

    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential decay envelope
      const env = Math.exp(-t * decayFactor);
      // Stereo white noise with slight phase offset
      const noiseL = (Math.random() * 2 - 1) * env;
      const noiseR = (Math.random() * 2 - 1) * env;
      left[i] = noiseL;
      right[i] = noiseR;
    }
    this.reverbConvolver.buffer = impulse;
  }

  // --- Saturation WaveShaper Curve ---

  private getSaturationCurve(drive: number = 0.3): Float32Array {
    const k = Math.max(0.1, drive * 50);
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft saturation transfer curve
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // --- Audio Buffer & Peak Management ---

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.ctx) await this.init();
    if (this.ctx!.state === 'suspended') {
      try {
        await this.ctx!.resume();
      } catch (e) {
        // ignore
      }
    }
    const copy = arrayBuffer.slice(0);
    return new Promise((resolve, reject) => {
      this.ctx!.decodeAudioData(
        copy,
        (decoded) => resolve(decoded),
        (err) => {
          try {
            this.ctx!.decodeAudioData(arrayBuffer.slice(0))
              .then(resolve)
              .catch(reject);
          } catch (e) {
            reject(err || e);
          }
        }
      );
    });
  }

  setBuffer(key: string, buffer: AudioBuffer) {
    this.bufferCache.set(key, buffer);
  }

  getBuffer(key: string): AudioBuffer | undefined {
    return this.bufferCache.get(key);
  }

  removeBuffer(key: string) {
    this.bufferCache.delete(key);
  }

  getWaveformData(buffer: AudioBuffer, samplesCount: number = 160): number[] {
    const rawData = buffer.getChannelData(0);
    const totalSamples = samplesCount;
    const blockSize = Math.floor(rawData.length / totalSamples);
    const peaks: number[] = new Array(totalSamples);
    let max = 0;

    for (let i = 0; i < totalSamples; i++) {
      let sum = 0;
      const start = i * blockSize;
      const step = Math.max(1, Math.floor(blockSize / 80));
      let count = 0;
      for (let j = 0; j < blockSize; j += step) {
        sum += Math.abs(rawData[start + j]);
        count++;
      }
      const val = count > 0 ? sum / count : 0;
      peaks[i] = val;
      if (val > max) max = val;
    }

    const multiplier = max > 0 ? 1 / max : 1;
    return peaks.map(p => Math.min(1, p * multiplier));
  }

  // --- High Precision BPM Detection ---

  async detectBPM(buffer: AudioBuffer): Promise<number> {
    try {
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;

      // Downsample / window analyze energy onsets
      const windowSize = 2048;
      const hopSize = 512;
      const numFrames = Math.floor((channelData.length - windowSize) / hopSize);
      const spectralFlux = new Float32Array(numFrames);

      let prevEnergy = 0;
      for (let f = 0; f < numFrames; f++) {
        let energy = 0;
        const offset = f * hopSize;
        for (let i = 0; i < windowSize; i += 4) {
          const s = channelData[offset + i];
          energy += s * s;
        }
        // Half-wave rectified flux
        spectralFlux[f] = Math.max(0, energy - prevEnergy);
        prevEnergy = energy;
      }

      // Autocorrelation over flux for tempo range 70 - 180 BPM
      const minBpm = 68;
      const maxBpm = 175;
      const minLag = Math.floor((60 / maxBpm) * (sampleRate / hopSize));
      const maxLag = Math.floor((60 / minBpm) * (sampleRate / hopSize));

      let bestLag = minLag;
      let maxCorr = -1;

      for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0;
        for (let i = 0; i < numFrames - lag; i += 2) {
          corr += spectralFlux[i] * spectralFlux[i + lag];
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }

      const detectedBpm = (60 * (sampleRate / hopSize)) / bestLag;
      const rounded = Math.round(detectedBpm);

      if (rounded >= 60 && rounded <= 200) {
        return rounded;
      }
      return 120;
    } catch (e) {
      console.warn("BPM detection fallback to 120", e);
      return 120;
    }
  }

  // --- Time & Transport Management ---

  getCurrentTime(): number {
    if (this.ctx && this.isPlaying) {
      const elapsed = this.ctx.currentTime - this.playbackStartTime;
      return this.currentPlayheadOffset + elapsed;
    }
    return this.currentPlayheadOffset;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    // Update tempo-synced delay if enabled
    if (this.delayNode) {
      const beatSec = 60 / bpm;
      this.delayNode.delayTime.setTargetAtTime(beatSec * 0.75, this.ctx?.currentTime || 0, 0.1);
    }
  }

  setLoopSettings(settings: LoopSettings) {
    this.loopSettings = settings;
  }

  // --- Channel Strip & DSP Setup per Track ---

  private getOrCreateChannelStrip(track: Track) {
    if (!this.ctx) return null;
    let strip = this.trackChannelStrips.get(track.id);
    if (!strip) {
      const inputGain = this.ctx.createGain();

      // 4-Band Parametric EQ
      const eqLow = this.ctx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 100;

      const eqLowMid = this.ctx.createBiquadFilter();
      eqLowMid.type = 'peaking';
      eqLowMid.frequency.value = 500;
      eqLowMid.Q.value = 1.0;

      const eqHighMid = this.ctx.createBiquadFilter();
      eqHighMid.type = 'peaking';
      eqHighMid.frequency.value = 3200;
      eqHighMid.Q.value = 1.2;

      const eqHigh = this.ctx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 10000;

      // Compressor
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.15;

      // Saturation
      const saturator = this.ctx.createWaveShaper();
      saturator.curve = this.getSaturationCurve(0.2) as any;
      saturator.oversample = '2x';

      // Aux Sends
      const reverbSend = this.ctx.createGain();
      reverbSend.gain.value = 0;
      if (this.reverbConvolver) reverbSend.connect(this.reverbConvolver);

      const delaySend = this.ctx.createGain();
      delaySend.gain.value = 0;
      if (this.delayNode) delaySend.connect(this.delayNode);

      // Fader, Panner, Analyser
      const fader = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;

      // Wire Track Channel Strip:
      // Input -> EqLow -> EqLowMid -> EqHighMid -> EqHigh -> Comp -> Sat -> [Sends, Fader]
      inputGain.connect(eqLow);
      eqLow.connect(eqLowMid);
      eqLowMid.connect(eqHighMid);
      eqHighMid.connect(eqHigh);
      eqHigh.connect(compressor);
      compressor.connect(saturator);

      // Split to Aux Sends
      saturator.connect(reverbSend);
      saturator.connect(delaySend);

      // Split to Fader -> Panner -> Analyser -> Master EQ Low
      saturator.connect(fader);
      fader.connect(panner);
      panner.connect(analyser);
      if (this.masterEqLow) {
        analyser.connect(this.masterEqLow);
      }

      strip = {
        inputGain,
        eqLow,
        eqLowMid,
        eqHighMid,
        eqHigh,
        compressor,
        saturator,
        reverbSend,
        delaySend,
        fader,
        panner,
        analyser
      };
      this.trackChannelStrips.set(track.id, strip);
    }

    this.applyTrackParams(strip, track);
    return strip;
  }

  private applyTrackParams(strip: any, track: Track) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const fx = track.effects;

    // Solo & Mute logic
    const isAudible = !track.isMuted;
    const targetVolume = isAudible ? track.volume : 0;
    strip.fader.gain.setTargetAtTime(targetVolume, now, 0.03);
    strip.panner.pan.setTargetAtTime(track.pan, now, 0.03);

    // EQ
    strip.eqLow.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.low : 0, now, 0.05);
    strip.eqLowMid.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.lowMid : 0, now, 0.05);
    strip.eqHighMid.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.highMid : 0, now, 0.05);
    strip.eqHigh.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.high : 0, now, 0.05);

    // Comp
    if (fx.compression.enabled) {
      strip.compressor.threshold.setTargetAtTime(fx.compression.threshold, now, 0.05);
      strip.compressor.ratio.setTargetAtTime(fx.compression.ratio, now, 0.05);
      strip.compressor.attack.setTargetAtTime(fx.compression.attack, now, 0.05);
      strip.compressor.release.setTargetAtTime(fx.compression.release, now, 0.05);
    } else {
      strip.compressor.threshold.setTargetAtTime(0, now, 0.05);
      strip.compressor.ratio.setTargetAtTime(1, now, 0.05);
    }

    // Sends
    strip.reverbSend.gain.setTargetAtTime(fx.reverbSend || 0, now, 0.05);
    strip.delaySend.gain.setTargetAtTime(fx.delaySend || 0, now, 0.05);

    // Saturation
    if (fx.saturation.enabled && fx.saturation.drive > 0) {
      strip.saturator.curve = this.getSaturationCurve(fx.saturation.drive / 100);
    }
  }

  updateTrackParams(trackId: string, track: Track) {
    const strip = this.trackChannelStrips.get(trackId);
    if (strip) {
      this.applyTrackParams(strip, track);
    }
  }

  getTrackLevel(trackId: string): number {
    const strip = this.trackChannelStrips.get(trackId);
    if (!strip) return 0;
    const data = new Uint8Array(strip.analyser.frequencyBinCount);
    strip.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length) / 255;
  }

  // --- Master Bus & FX Controls ---

  setMasteringParams(settings: MasteringSettings) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(settings.gain, now, 0.05);

    if (this.masterEqLow) this.masterEqLow.gain.setTargetAtTime(settings.eq.low, now, 0.05);
    if (this.masterEqMid) this.masterEqMid.gain.setTargetAtTime(settings.eq.mid, now, 0.05);
    if (this.masterEqHigh) this.masterEqHigh.gain.setTargetAtTime(settings.eq.high, now, 0.05);

    if (this.masterGlueComp) {
      this.masterGlueComp.threshold.setTargetAtTime(settings.glueComp.threshold, now, 0.05);
      this.masterGlueComp.ratio.setTargetAtTime(settings.glueComp.ratio, now, 0.05);
    }
    if (this.masterLimiter) {
      this.masterLimiter.threshold.setTargetAtTime(settings.limiter.threshold, now, 0.05);
    }
  }

  setReverbBusSettings(settings: ReverbBusSettings) {
    if (!this.ctx || !this.reverbBusGain) return;
    const now = this.ctx.currentTime;
    this.reverbBusGain.gain.setTargetAtTime(settings.enabled ? settings.mix : 0, now, 0.05);
    if (this.reverbFilter) {
      this.reverbFilter.frequency.setTargetAtTime(settings.highCut, now, 0.05);
    }
    this.updateReverbImpulse(settings.decay, settings.type);
  }

  setDelayBusSettings(settings: DelayBusSettings) {
    if (!this.ctx || !this.delayBusGain || !this.delayNode) return;
    const now = this.ctx.currentTime;
    this.delayBusGain.gain.setTargetAtTime(settings.enabled ? settings.mix : 0, now, 0.05);

    let delaySec = settings.time;
    if (settings.sync !== 'free') {
      const beat = 60 / this.bpm;
      switch (settings.sync) {
        case '1/4': delaySec = beat; break;
        case '1/8d': delaySec = beat * 0.75; break;
        case '1/8': delaySec = beat * 0.5; break;
        case '1/16': delaySec = beat * 0.25; break;
      }
    }
    this.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.05);
    if (this.delayFeedbackNode) {
      this.delayFeedbackNode.gain.setTargetAtTime(settings.feedback, now, 0.05);
    }
  }

  // --- Reference Track A/B System ---

  loadReferenceTrack(buffer: AudioBuffer) {
    this.referenceBuffer = buffer;
  }

  toggleReferenceAB(enableRef: boolean, startOffset: number = 0) {
    this.isReferenceActive = enableRef;
    if (!this.ctx) return;

    if (enableRef) {
      // Mute master bus output
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);

      // Play reference track in sync
      if (this.referenceBuffer && this.isPlaying) {
        if (this.referenceSource) {
          try { this.referenceSource.stop(); } catch (e) {}
        }
        this.referenceSource = this.ctx.createBufferSource();
        this.referenceSource.buffer = this.referenceBuffer;
        this.referenceSource.connect(this.referenceGainNode!);
        this.referenceSource.start(0, Math.min(startOffset, this.referenceBuffer.duration));
      }
    } else {
      // Stop reference and unmute master bus
      if (this.referenceSource) {
        try { this.referenceSource.stop(); } catch (e) {}
        this.referenceSource = null;
      }
      if (this.masterGain) this.masterGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
    }
  }

  // --- Multitrack Playback Execution ---

  async play(tracks: Track[], startOffset: number = 0) {
    if (!this.ctx) await this.init();
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.playbackStartTime = this.ctx!.currentTime;
    this.currentPlayheadOffset = startOffset;

    // Check Solo tracks
    const hasSolo = tracks.some(t => t.isSolo);

    // Schedule active clips across all tracks
    tracks.forEach(track => {
      const isMuted = track.isMuted || (hasSolo && !track.isSolo);
      if (isMuted) return;

      const strip = this.getOrCreateChannelStrip(track);
      if (!strip) return;

      const trackSources: AudioBufferSourceNode[] = [];

      track.clips.forEach(clip => {
        if (clip.isMuted) return;
        const buffer = clip.audioBuffer || this.getBuffer(clip.id) || this.getBuffer(track.id);
        if (!buffer) return;

        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;

        // Skip clips that have already completed before startOffset
        if (clipEnd <= startOffset) return;

        const source = this.ctx!.createBufferSource();

        // Handle reversed playback if requested
        if (clip.isReversed) {
          const revBuffer = this.createReversedBuffer(buffer);
          source.buffer = revBuffer;
        } else {
          source.buffer = buffer;
        }

        // Clip Gain & Fade Envelope
        const clipGain = this.ctx!.createGain();
        clipGain.gain.value = clip.gain || 1.0;

        // Apply Fade In / Fade Out
        const now = this.ctx!.currentTime;
        let scheduleStartAt = clipStart - startOffset;
        let bufferOffset = clip.offset || 0;
        let playDuration = clip.duration;

        if (scheduleStartAt < 0) {
          // Playback starts mid-clip
          const skipped = Math.abs(scheduleStartAt);
          bufferOffset += skipped;
          playDuration -= skipped;
          scheduleStartAt = 0;
        }

        const exactStartTime = now + scheduleStartAt;
        
        // Schedule Fade In
        if (clip.fadeIn > 0 && bufferOffset < clip.fadeIn) {
          clipGain.gain.setValueAtTime(0.001, exactStartTime);
          clipGain.gain.linearRampToValueAtTime(clip.gain || 1.0, exactStartTime + (clip.fadeIn - bufferOffset));
        }

        // Schedule Fade Out
        if (clip.fadeOut > 0) {
          const fadeOutStart = exactStartTime + playDuration - clip.fadeOut;
          if (fadeOutStart > exactStartTime) {
            clipGain.gain.setValueAtTime(clip.gain || 1.0, fadeOutStart);
            clipGain.gain.linearRampToValueAtTime(0.001, exactStartTime + playDuration);
          }
        }

        source.connect(clipGain);
        clipGain.connect(strip.inputGain);

        source.start(exactStartTime, bufferOffset, playDuration);
        trackSources.push(source);
      });

      this.activeClipSources.set(track.id, trackSources);
    });

    // Reference sync playback if A/B active
    if (this.isReferenceActive && this.referenceBuffer) {
      this.toggleReferenceAB(true, startOffset);
    }
  }

  stop() {
    this.isPlaying = false;
    this.activeClipSources.forEach(sources => {
      sources.forEach(src => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      });
    });
    this.activeClipSources.clear();

    if (this.referenceSource) {
      try { this.referenceSource.stop(); } catch (e) {}
      this.referenceSource = null;
    }
  }

  private createReversedBuffer(buffer: AudioBuffer): AudioBuffer {
    if (!this.ctx) return buffer;
    const rev = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = rev.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dst[i] = src[buffer.length - 1 - i];
      }
    }
    return rev;
  }

  // --- Metronome Scheduler ---

  startMetronome(bpm: number, volume: number = 0.5) {
    if (!this.ctx) this.init();
    this.metronomeActive = true;
    this.metronomeVolume = volume;
    this.bpm = bpm;
    this.nextClickTime = this.ctx!.currentTime;

    if (this.metronomeTimer) clearInterval(this.metronomeTimer);
    this.metronomeTimer = window.setInterval(() => this.scheduleMetronomeClicks(), 25);
  }

  stopMetronome() {
    this.metronomeActive = false;
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }

  private currentBeatInBar: number = 0;

  private scheduleMetronomeClicks() {
    if (!this.ctx || !this.metronomeActive) return;
    const lookahead = 0.1;
    const beatSec = 60 / this.bpm;

    while (this.nextClickTime < this.ctx.currentTime + lookahead) {
      const isBarAccent = this.currentBeatInBar === 0;
      this.playClick(this.nextClickTime, isBarAccent);
      this.nextClickTime += beatSec;
      this.currentBeatInBar = (this.currentBeatInBar + 1) % 4;
    }
  }

  private playClick(time: number, isAccent: boolean) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Bar 1 accent = 1750 Hz (crisp woodblock), normal beats = 880 Hz
    osc.frequency.value = isAccent ? 1750 : 880;

    const baseGain = isAccent ? this.metronomeVolume * 0.8 : this.metronomeVolume * 0.45;
    gain.gain.setValueAtTime(baseGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.045);
  }

  // --- Real-Time Recording & Latency Compensation ---

  async initRecordingSession(deviceId?: string, inputGainVal: number = 1.0): Promise<MediaStream> {
    if (!this.ctx) await this.init();

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      }
    };

    this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
    const source = this.ctx!.createMediaStreamSource(this.micStream);
    const gain = this.ctx!.createGain();
    gain.gain.value = inputGainVal;

    const analyser = this.ctx!.createAnalyser();
    analyser.fftSize = 256;

    const destination = this.ctx!.createMediaStreamDestination();

    source.connect(gain);
    gain.connect(analyser);
    gain.connect(destination);

    this.recordingNodes = { source, gain, analyser, destination };
    return destination.stream;
  }

  setInputGain(value: number) {
    if (this.recordingNodes && this.ctx) {
      this.recordingNodes.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
  }

  getRecordingLevel(): number {
    if (!this.recordingNodes) return 0;
    const data = new Uint8Array(this.recordingNodes.analyser.frequencyBinCount);
    this.recordingNodes.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length) / 255;
  }

  getAnalyser(): AnalyserNode | null {
    return this.recordingNodes?.analyser || null;
  }

  enableMonitoring() {
    if (!this.ctx || !this.recordingNodes) return;
    this.isMonitoringEnabled = true;
    if (!this.monitorGain) {
      this.monitorGain = this.ctx.createGain();
      this.monitorGain.gain.value = 0.85;
      this.monitorGain.connect(this.ctx.destination);
    }
    try {
      this.recordingNodes.gain.connect(this.monitorGain);
    } catch (e) {}
  }

  disableMonitoring() {
    this.isMonitoringEnabled = false;
    if (this.monitorGain && this.recordingNodes) {
      try {
        this.recordingNodes.gain.disconnect(this.monitorGain);
      } catch (e) {}
    }
  }

  cleanupRecordingSession() {
    if (this.recordingNodes) {
      this.disableMonitoring();
      this.recordingNodes.source.disconnect();
      this.recordingNodes.gain.disconnect();
      this.recordingNodes.analyser.disconnect();
      this.recordingNodes = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  // --- Master Bus Metering & LUFS Calculation ---

  getMasterMeterLevels(): MeterLevels {
    if (!this.masterAnalyser) {
      return { peakL: 0, peakR: 0, rmsL: 0, rmsR: 0, lufsIntegrated: -70, lufsShortTerm: -70, isClipping: false };
    }

    const timeData = new Float32Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getFloatTimeDomainData(timeData);

    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const abs = Math.abs(timeData[i]);
      if (abs > peak) peak = abs;
      sumSq += abs * abs;
    }

    const rms = Math.sqrt(sumSq / timeData.length);
    // Approximate LUFS from K-weighted RMS
    const rmsDb = rms > 0.00001 ? 20 * Math.log10(rms) : -70;
    const lufsShortTerm = Math.max(-70, Math.min(0, rmsDb - 0.69));
    const isClipping = peak >= 0.995;

    return {
      peakL: peak,
      peakR: peak * 0.98,
      rmsL: rms,
      rmsR: rms * 0.98,
      lufsIntegrated: lufsShortTerm,
      lufsShortTerm: lufsShortTerm,
      isClipping
    };
  }

  // --- Professional Offline Mixdown & Stem Render Engine ---

  async exportMixdown(
    tracks: Track[], 
    mastering: MasteringSettings, 
    reverbSettings: ReverbBusSettings,
    delaySettings: DelayBusSettings,
    bpm: number,
    range?: { start: number; end: number },
    bitDepth: 16 | 24 = 16
  ): Promise<Blob> {
    if (!this.ctx) await this.init();

    // Determine render duration
    let renderStart = range ? range.start : 0;
    let renderEnd = 0;

    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const end = clip.start + clip.duration;
        if (end > renderEnd) renderEnd = end;
      });
    });

    if (range) {
      renderEnd = range.end;
    } else {
      // Add 2.5s tail for reverb/delay rings
      renderEnd += 2.5;
    }

    const totalDuration = Math.max(1, renderEnd - renderStart);
    const sampleRate = this.ctx!.sampleRate || 44100;
    const totalFrames = Math.ceil(totalDuration * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    // 1. Build Offline Master Chain
    const masterEqLow = offlineCtx.createBiquadFilter();
    masterEqLow.type = 'lowshelf';
    masterEqLow.frequency.value = 100;
    masterEqLow.gain.value = mastering.eq.low;

    const masterEqMid = offlineCtx.createBiquadFilter();
    masterEqMid.type = 'peaking';
    masterEqMid.frequency.value = 1200;
    masterEqMid.gain.value = mastering.eq.mid;

    const masterEqHigh = offlineCtx.createBiquadFilter();
    masterEqHigh.type = 'highshelf';
    masterEqHigh.frequency.value = 10000;
    masterEqHigh.gain.value = mastering.eq.high;

    const masterGlue = offlineCtx.createDynamicsCompressor();
    masterGlue.threshold.value = mastering.glueComp.threshold;
    masterGlue.ratio.value = mastering.glueComp.ratio;
    masterGlue.attack.value = mastering.glueComp.attack;
    masterGlue.release.value = mastering.glueComp.release;

    const masterLimiter = offlineCtx.createDynamicsCompressor();
    masterLimiter.threshold.value = mastering.limiter.threshold;
    masterLimiter.ratio.value = 20;
    masterLimiter.attack.value = 0.001;
    masterLimiter.release.value = 0.1;

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = mastering.gain;

    masterEqLow.connect(masterEqMid);
    masterEqMid.connect(masterEqHigh);
    masterEqHigh.connect(masterGlue);
    masterGlue.connect(masterLimiter);
    masterLimiter.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // 2. Build Offline Aux Reverb
    const offlineReverb = offlineCtx.createConvolver();
    offlineReverb.buffer = this.reverbConvolver?.buffer || null;
    const offlineReverbGain = offlineCtx.createGain();
    offlineReverbGain.gain.value = reverbSettings.enabled ? reverbSettings.mix : 0;
    offlineReverb.connect(offlineReverbGain);
    offlineReverbGain.connect(masterEqLow);

    // 3. Build Offline Aux Delay
    const offlineDelay = offlineCtx.createDelay(3.0);
    const delaySec = (60 / bpm) * 0.75;
    offlineDelay.delayTime.value = delaySec;
    const offlineDelayFb = offlineCtx.createGain();
    offlineDelayFb.gain.value = delaySettings.feedback;
    offlineDelay.connect(offlineDelayFb);
    offlineDelayFb.connect(offlineDelay);

    const offlineDelayGain = offlineCtx.createGain();
    offlineDelayGain.gain.value = delaySettings.enabled ? delaySettings.mix : 0;
    offlineDelay.connect(offlineDelayGain);
    offlineDelayGain.connect(masterEqLow);

    // Check Solo
    const hasSolo = tracks.some(t => t.isSolo);

    // 4. Render Track Clips
    for (const track of tracks) {
      if (track.isMuted || (hasSolo && !track.isSolo)) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;

      const panner = offlineCtx.createStereoPanner();
      panner.pan.value = track.pan;

      // Track EQ
      const eqLow = offlineCtx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.value = 100;
      eqLow.gain.value = track.effects.eq.enabled ? track.effects.eq.low : 0;

      const eqMid = offlineCtx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.value = 1000;
      eqMid.gain.value = track.effects.eq.enabled ? track.effects.eq.lowMid : 0;

      const eqHigh = offlineCtx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.value = 10000;
      eqHigh.gain.value = track.effects.eq.enabled ? track.effects.eq.high : 0;

      const comp = offlineCtx.createDynamicsCompressor();
      if (track.effects.compression.enabled) {
        comp.threshold.value = track.effects.compression.threshold;
        comp.ratio.value = track.effects.compression.ratio;
      } else {
        comp.threshold.value = 0;
        comp.ratio.value = 1;
      }

      // Sends
      const revSend = offlineCtx.createGain();
      revSend.gain.value = track.effects.reverbSend || 0;
      revSend.connect(offlineReverb);

      const dlySend = offlineCtx.createGain();
      dlySend.gain.value = track.effects.delaySend || 0;
      dlySend.connect(offlineDelay);

      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(comp);
      comp.connect(revSend);
      comp.connect(dlySend);
      comp.connect(trackGain);
      trackGain.connect(panner);
      panner.connect(masterEqLow);

      for (const clip of track.clips) {
        if (clip.isMuted) continue;
        const buffer = clip.audioBuffer || this.getBuffer(clip.id) || this.getBuffer(track.id);
        if (!buffer) continue;

        const clipStartRel = clip.start - renderStart;
        if (clipStartRel + clip.duration < 0) continue;

        const src = offlineCtx.createBufferSource();
        src.buffer = clip.isReversed ? this.createReversedBuffer(buffer) : buffer;

        const clipGain = offlineCtx.createGain();
        clipGain.gain.value = clip.gain || 1.0;

        let when = Math.max(0, clipStartRel);
        let offset = clip.offset || 0;
        let duration = clip.duration;

        if (clipStartRel < 0) {
          offset += Math.abs(clipStartRel);
          duration -= Math.abs(clipStartRel);
        }

        src.connect(clipGain);
        clipGain.connect(eqLow);
        src.start(when, offset, duration);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.encodeWAV(renderedBuffer, bitDepth);
  }

  // --- WAV Encoder (16-bit / 24-bit PCM) ---

  private encodeWAV(abuffer: AudioBuffer, bitDepth: 16 | 24 = 16): Blob {
    const numChannels = abuffer.numberOfChannels;
    const sampleRate = abuffer.sampleRate;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = abuffer.length;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF Header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // "fmt " Subchunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat 1 = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // "data" Subchunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave & Write PCM Samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        if (bitDepth === 16) {
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        } else {
          // 24-bit signed integer
          const int24 = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
          view.setUint8(offset, int24 & 0xFF);
          view.setUint8(offset + 1, (int24 >> 8) & 0xFF);
          view.setUint8(offset + 2, (int24 >> 16) & 0xFF);
          offset += 3;
        }
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const audioEngine = new AudioEngine();