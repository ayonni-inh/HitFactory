// A simplified Web Audio Engine Singleton
import { Track, TrackEffects, MasteringSettings, LoopSettings } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterEqLow: BiquadFilterNode | null = null;
  private masterEqMid: BiquadFilterNode | null = null;
  private masterEqHigh: BiquadFilterNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;

  private trackNodes: Map<string, {
    source: AudioBufferSourceNode | null;
    gain: GainNode;
    pan: StereoPannerNode;
    eqLow: BiquadFilterNode;
    eqMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
  }> = new Map();
  
  private bufferCache: Map<string, { buffer: AudioBuffer; blob?: Blob }> = new Map();

  setTrackData(id: string, buffer: AudioBuffer, blob?: Blob) {
    this.bufferCache.set(id, { buffer, blob });
  }

  getTrackBuffer(id: string): AudioBuffer | undefined {
    return this.bufferCache.get(id)?.buffer;
  }

  getTrackBlob(id: string): Blob | undefined {
    return this.bufferCache.get(id)?.blob;
  }

  removeTrackData(id: string) {
    this.bufferCache.delete(id);
  }
  
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private loopSettings: LoopSettings = { enabled: false, start: 0, end: 0 };
  
  // Recording / Monitoring
  private recordingNodes: {
      source: MediaStreamAudioSourceNode;
      gain: GainNode;
      analyser: AnalyserNode;
      destination: MediaStreamAudioDestinationNode;
      recordMaster: boolean;
  } | null = null;
  private monitorGain: GainNode | null = null;

  // Metronome
  private metronomeInterval: number | null = null;
  private nextClickTime: number = 0;

  getAnalyser(): AnalyserNode | null {
    return this.recordingNodes?.analyser || null;
  }

  constructor() {
    // Initialized on user interaction
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master Chain
      this.masterEqLow = this.ctx.createBiquadFilter();
      this.masterEqLow.type = 'lowshelf';
      this.masterEqLow.frequency.value = 200;

      this.masterEqMid = this.ctx.createBiquadFilter();
      this.masterEqMid.type = 'peaking';
      this.masterEqMid.frequency.value = 1000;

      this.masterEqHigh = this.ctx.createBiquadFilter();
      this.masterEqHigh.type = 'highshelf';
      this.masterEqHigh.frequency.value = 3000;

      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.ratio.value = 20; // Hard limiting
      this.masterLimiter.attack.value = 0.003;
      this.masterLimiter.release.value = 0.25;

      this.masterGain = this.ctx.createGain();
      
      // Connect Chain
      this.masterEqLow.connect(this.masterEqMid);
      this.masterEqMid.connect(this.masterEqHigh);
      this.masterEqHigh.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  getContext() {
    return this.ctx;
  }

  getState() {
    return this.ctx?.state || 'uninitialized';
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.ctx) await this.init();
    return new Promise((resolve, reject) => {
      this.ctx!.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  getWaveformData(buffer: AudioBuffer, samplesPerSecond: number = 50): number[] {
    const rawData = buffer.getChannelData(0);
    const totalSamples = Math.max(100, Math.floor(buffer.duration * samplesPerSecond));
    const blockSize = Math.floor(rawData.length / totalSamples);
    const waveform = new Float32Array(totalSamples);
    let max = 0;
    
    for (let i = 0; i < totalSamples; i++) {
      let sum = 0;
      const start = i * blockSize;
      // Step through block to save processing time on long files
      const step = Math.max(1, Math.floor(blockSize / 100)); 
      let count = 0;
      for (let j = 0; j < blockSize; j += step) {
        sum += Math.abs(rawData[start + j]);
        count++;
      }
      const val = sum / count;
      waveform[i] = val;
      if (val > max) max = val;
    }
    
    const result = new Array(totalSamples);
    const multiplier = max > 0 ? 1 / max : 1;
    for (let i = 0; i < totalSamples; i++) {
      result[i] = waveform[i] * multiplier;
    }
    return result;
  }

  async detectBPM(buffer: AudioBuffer): Promise<number> {
    // Simple BPM detection based on peak detection
    try {
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        // 1. Downsample to ~10kHz to save processing
        // (Skipping for simplicity, using raw data but with larger strides)
        
        // 2. Calculate energy (RMS) in small windows
        const windowSize = 4096;
        const hopSize = 1024;
        const energy = [];
        
        for (let i = 0; i < data.length - windowSize; i += hopSize) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                sum += data[i + j] * data[i + j];
            }
            energy.push(sum);
        }

        // 3. Find peaks in energy signal
        const peaks = [];
        const threshold = 0.5; // Relative threshold
        const maxEnergy = Math.max(...energy);
        
        for (let i = 1; i < energy.length - 1; i++) {
            if (energy[i] > energy[i-1] && energy[i] > energy[i+1] && energy[i] > maxEnergy * threshold) {
                peaks.push(i);
            }
        }

        // 4. Calculate intervals between peaks
        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            const interval = peaks[i] - peaks[i-1];
            // Convert window index interval to seconds
            const seconds = (interval * hopSize) / sampleRate;
            // Convert to BPM
            const bpm = 60 / seconds;
            
            // Filter reasonable BPM range (60-180)
            if (bpm >= 60 && bpm <= 180) {
                intervals.push(bpm);
            } else if (bpm >= 30 && bpm < 60) {
                intervals.push(bpm * 2); // Double time
            } else if (bpm > 180 && bpm <= 360) {
                intervals.push(bpm / 2); // Half time
            }
        }

        if (intervals.length === 0) return 120; // Fallback

        // 5. Find mode (most frequent BPM)
        const counts: {[key: number]: number} = {};
        let maxCount = 0;
        let modeBpm = 120;

        intervals.forEach(bpm => {
            const rounded = Math.round(bpm);
            counts[rounded] = (counts[rounded] || 0) + 1;
            if (counts[rounded] > maxCount) {
                maxCount = counts[rounded];
                modeBpm = rounded;
            }
        });

        return modeBpm;
    } catch (e) {
        console.error("BPM Detection failed", e);
        return 120;
    }
  }

  // --- Playback Timing ---

  getCurrentTime(): number {
    if (this.ctx && this.isPlaying) {
      return this.ctx.currentTime - this.startTime;
    }
    return 0;
  }

  // --- Recording Session Management ---

  initRecordingSession(stream: MediaStream, inputGain: number, recordMaster: boolean = false): MediaStream {
      if (!this.ctx) this.init();
      
      const source = this.ctx!.createMediaStreamSource(stream);
      const gainNode = this.ctx!.createGain();
      gainNode.gain.value = inputGain;
      
      const analyser = this.ctx!.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      
      const destination = this.ctx!.createMediaStreamDestination();
      
      // Graph: Source -> Gain -> [Analyser, Destination]
      source.connect(gainNode);
      gainNode.connect(analyser);
      gainNode.connect(destination);
      
      if (recordMaster && this.masterGain) {
          this.masterGain.connect(destination);
      }
      
      this.recordingNodes = { source, gain: gainNode, analyser, destination, recordMaster };
      return destination.stream;
  }

  setInputGain(value: number) {
      if (this.recordingNodes) {
          this.recordingNodes.gain.gain.setTargetAtTime(value, this.ctx!.currentTime, 0.1);
      }
  }

  getRecordingLevel(): number {
      if (!this.recordingNodes) return 0;
      const data = new Uint8Array(this.recordingNodes.analyser.frequencyBinCount);
      this.recordingNodes.analyser.getByteFrequencyData(data);
      
      // Calculate RMS roughly
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      return rms / 255;
  }

  enableMonitoring() {
    if (!this.ctx || !this.recordingNodes) return;
    
    // Create monitor gain if needed
    if (!this.monitorGain) {
        this.monitorGain = this.ctx.createGain();
        this.monitorGain.gain.value = 0.7; // Fixed monitor volume
        this.monitorGain.connect(this.ctx.destination);
    }

    try {
        this.recordingNodes.gain.connect(this.monitorGain);
    } catch (e) { console.warn(e); }
  }

  disableMonitoring() {
    if (this.monitorGain && this.recordingNodes) {
        try {
            this.recordingNodes.gain.disconnect(this.monitorGain);
        } catch(e) {}
    }
  }

  cleanupRecordingSession() {
      if (this.recordingNodes) {
          this.recordingNodes.source.disconnect();
          this.recordingNodes.gain.disconnect();
          this.recordingNodes.analyser.disconnect();
          if (this.recordingNodes.recordMaster && this.masterGain) {
              try {
                  this.masterGain.disconnect(this.recordingNodes.destination);
              } catch (e) {}
          }
          this.recordingNodes = null;
      }
      this.disableMonitoring();
  }

  // --- Metronome ---

  startMetronome(bpm: number) {
      if (!this.ctx) this.init();
      if (this.metronomeInterval) clearInterval(this.metronomeInterval);
      
      this.nextClickTime = this.ctx!.currentTime;
      this.metronomeInterval = window.setInterval(() => this.scheduler(bpm), 25);
  }

  stopMetronome() {
      if (this.metronomeInterval) {
          clearInterval(this.metronomeInterval);
          this.metronomeInterval = null;
      }
  }

  private scheduler(bpm: number) {
      const lookahead = 0.1;
      while (this.nextClickTime < this.ctx!.currentTime + lookahead) {
          this.playClick(this.nextClickTime);
          const secondsPerBeat = 60.0 / bpm;
          this.nextClickTime += secondsPerBeat;
      }
  }

  private playClick(time: number) {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.frequency.value = 1000;
      gain.gain.value = 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      
      osc.start(time);
      osc.stop(time + 0.05);
  }

  setLoopSettings(settings: LoopSettings) {
      this.loopSettings = settings;
  }

  // --- Playback Logic ---
  
  play(tracks: Track[], startOffset: number = 0) {
    if (!this.ctx) this.init();
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.startTime = this.ctx!.currentTime - startOffset;

    tracks.forEach(track => {
      const buffer = this.getTrackBuffer(track.id);
      if (!buffer || track.isMuted) return;

      const source = this.ctx!.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx!.createGain();
      const pan = this.ctx!.createStereoPanner();
      const eqLow = this.ctx!.createBiquadFilter();
      const eqMid = this.ctx!.createBiquadFilter();
      const eqHigh = this.ctx!.createBiquadFilter();
      const compressor = this.ctx!.createDynamicsCompressor();

      // Chain
      source.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(compressor);
      compressor.connect(gain);
      gain.connect(pan);
      // Connect to Master Chain Start
      pan.connect(this.masterEqLow!);

      // Init Params
      this.applyTrackParams({ source, gain, pan, eqLow, eqMid, eqHigh, compressor }, track);

      // Schedule
      const trackStart = track.startTime || 0;
      const bufferOffset = track.offset || 0;
      const playDuration = track.duration || buffer.duration;

      // Calculate when to start relative to project startOffset
      let when = trackStart - startOffset;
      let offset = bufferOffset;
      let duration = playDuration;

      if (when < 0) {
          // Track already started before startOffset
          offset += Math.abs(when);
          duration -= Math.abs(when);
          when = 0;
      }

      if (duration > 0) {
          source.start(this.ctx!.currentTime + when, offset, duration);
      }

      this.trackNodes.set(track.id, { source, gain, pan, eqLow, eqMid, eqHigh, compressor });
    });
  }

  setMasteringParams(settings: MasteringSettings) {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      
      this.masterGain.gain.setTargetAtTime(settings.gain, now, 0.1);
      
      if (this.masterEqLow) this.masterEqLow.gain.setTargetAtTime(settings.eq.low, now, 0.1);
      if (this.masterEqMid) this.masterEqMid.gain.setTargetAtTime(settings.eq.mid, now, 0.1);
      if (this.masterEqHigh) this.masterEqHigh.gain.setTargetAtTime(settings.eq.high, now, 0.1);
      
      if (this.masterLimiter) this.masterLimiter.threshold.setTargetAtTime(settings.limiter.threshold, now, 0.1);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.trackNodes.forEach(node => {
      if (node.source) {
        try {
          node.source.stop();
          node.source.disconnect();
        } catch (e) {}
      }
    });
    this.trackNodes.clear();
  }

  updateTrackParams(trackId: string, track: Track) {
    const nodes = this.trackNodes.get(trackId);
    if (!nodes) return;
    this.applyTrackParams(nodes, track);
  }

  private applyTrackParams(nodes: any, track: Track) {
      const now = this.ctx!.currentTime;
      nodes.gain.gain.setTargetAtTime(track.isMuted ? 0 : track.volume, now, 0.05);
      nodes.pan.pan.setTargetAtTime(track.pan, now, 0.05);
      
      nodes.eqLow.type = 'lowshelf';
      nodes.eqLow.frequency.value = 320;
      nodes.eqLow.gain.setTargetAtTime(track.effects.eq.low, now, 0.1);

      nodes.eqMid.type = 'peaking';
      nodes.eqMid.frequency.value = 1000;
      nodes.eqMid.gain.setTargetAtTime(track.effects.eq.mid, now, 0.1);

      nodes.eqHigh.type = 'highshelf';
      nodes.eqHigh.frequency.value = 3200;
      nodes.eqHigh.gain.setTargetAtTime(track.effects.eq.high, now, 0.1);

      nodes.compressor.threshold.setTargetAtTime(track.effects.compression.threshold, now, 0.1);
      nodes.compressor.ratio.setTargetAtTime(track.effects.compression.ratio, now, 0.1);
  }

  async exportMix(tracks: Track[], masteringSettings: MasteringSettings): Promise<Blob> {
      if (!this.ctx) await this.init();
      
      let maxDuration = 0;
      tracks.forEach(t => {
      if (t.isMuted) return;
      const start = t.startTime || 0;
      const dur = t.duration || 0;
      const end = start + dur;
      if (end > maxDuration) maxDuration = end;
});

if (maxDuration === 0) return new Blob();
      // Master Chain
      const masterEqLow = offlineCtx.createBiquadFilter();
      masterEqLow.type = 'lowshelf';
      masterEqLow.frequency.value = 200;
      masterEqLow.gain.value = masteringSettings.eq.low;

      const masterEqMid = offlineCtx.createBiquadFilter();
      masterEqMid.type = 'peaking';
      masterEqMid.frequency.value = 1000;
      masterEqMid.gain.value = masteringSettings.eq.mid;

      const masterEqHigh = offlineCtx.createBiquadFilter();
      masterEqHigh.type = 'highshelf';
      masterEqHigh.frequency.value = 3000;
      masterEqHigh.gain.value = masteringSettings.eq.high;

      const masterLimiter = offlineCtx.createDynamicsCompressor();
      masterLimiter.ratio.value = 20;
      masterLimiter.attack.value = 0.003;
      masterLimiter.release.value = 0.25;
      masterLimiter.threshold.value = masteringSettings.limiter.threshold;

      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = masteringSettings.gain;
      
      masterEqLow.connect(masterEqMid);
      masterEqMid.connect(masterEqHigh);
      masterEqHigh.connect(masterLimiter);
      masterLimiter.connect(masterGain);
      masterGain.connect(offlineCtx.destination);
      for (const track of tracks) {
    if (track.isMuted) continue;
    const buffer = this.getTrackBuffer(track.id);
    if (!buffer) continue;

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const trackGain = offlineCtx.createGain();
    trackGain.gain.value = track.volume;

    const panner = offlineCtx.createStereoPanner();
    panner.pan.value = track.pan;

    const eqLow = offlineCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 320;
    eqLow.gain.value = track.effects.eq.low;

    const eqMid = offlineCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.gain.value = track.effects.eq.mid;

    const eqHigh = offlineCtx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3200;
    eqHigh.gain.value = track.effects.eq.high;

    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = track.effects.compression.threshold;
    compressor.ratio.value = track.effects.compression.ratio;

    // Chain now matches play(): source -> EQ -> compressor -> gain -> pan -> master
    source.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(compressor);
    compressor.connect(trackGain);
    trackGain.connect(panner);
    panner.connect(masterEqLow);

    const start = track.startTime || 0;
    const offset = track.offset || 0;
    const duration = track.duration || buffer.duration;

    if (duration > 0) {
        source.start(start, offset, duration);
    }
}
      
      const renderedBuffer = await offlineCtx.startRendering();
      return this.bufferToWave(renderedBuffer, renderedBuffer.length);
  }

  private bufferToWave(abuffer: AudioBuffer, len: number): Blob {
      let numOfChan = abuffer.numberOfChannels,
          length = len * numOfChan * 2 + 44,
          buffer = new ArrayBuffer(length),
          view = new DataView(buffer),
          channels = [], i, sample,
          offset = 0,
          pos = 0;

      function setUint16(data: number) {
          view.setUint16(pos, data, true);
          pos += 2;
      }

      function setUint32(data: number) {
          view.setUint32(pos, data, true);
          pos += 4;
      }

      setUint32(0x46464952);                         // "RIFF"
      setUint32(length - 8);                         // file length - 8
      setUint32(0x45564157);                         // "WAVE"
      setUint32(0x20746d66);                         // "fmt " chunk
      setUint32(16);                                 // length = 16
      setUint16(1);                                  // PCM (uncompressed)
      setUint16(numOfChan);
      setUint32(abuffer.sampleRate);
      setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
      setUint16(numOfChan * 2);                      // block-align
      setUint16(16);                                 // 16-bit
      setUint32(0x61746164);                         // "data" - chunk
      setUint32(length - pos - 4);                   // chunk length

      for(i = 0; i < abuffer.numberOfChannels; i++)
          channels.push(abuffer.getChannelData(i));

      while(pos < length) {
          for(i = 0; i < numOfChan; i++) {             // interleave channels
              sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
              sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
              view.setInt16(pos, sample, true);          // write 16-bit sample
              pos += 2;
          }
          offset++                                     // next source sample
      }

      return new Blob([buffer], {type: "audio/wav"});
  }
}

export const audioEngine = new AudioEngine();
