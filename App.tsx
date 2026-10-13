// AYONI STUDIO - Professional Multitrack Vocal Recording & Mixing Studio
// Main Application Coordinator & View Engine

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Track, Clip, Take, Marker, Project, RecorderState, 
  QuantizationValue, MeterLevels, ReferenceTrack, 
  TrackEffects, MasteringSettings, ReverbBusSettings, DelayBusSettings,
  TrackType, VocalType
} from './types';
import { audioEngine } from './services/audioEngine';
import { projectDb } from './services/db';
import { TopBar } from './components/TopBar';
import { Timeline } from './components/Timeline';
import { TrackInspector } from './components/TrackInspector';
import { StudioWorkstation } from './components/StudioWorkstation';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { ExportModal } from './components/ExportModal';
import { ProjectModal } from './components/ProjectModal';

const DEFAULT_EFFECTS: TrackEffects = {
  gain: 0,
  gate: { enabled: false, threshold: -45, reduction: -20 },
  eq: { enabled: true, low: 0, lowMid: 0, highMid: 0, high: 0 },
  deesser: { enabled: false, frequency: 6500, threshold: -20, amount: 50 },
  compression: { enabled: true, threshold: -18, ratio: 4, attack: 0.015, release: 0.16, makeup: 2 },
  saturation: { enabled: false, drive: 20, warmth: 30 },
  reverbSend: 0.2,
  delaySend: 0.1,
  autotune: { enabled: false, key: 'C', scale: 'minor', speed: 25, amount: 80 }
};

const DEFAULT_MASTERING: MasteringSettings = {
  gain: 1.05,
  glueComp: { enabled: true, threshold: -14, ratio: 2.5, attack: 0.03, release: 0.2 },
  eq: { low: 0.5, mid: 0, high: 1.2 },
  limiter: { enabled: true, ceiling: -0.2, threshold: -1.8 },
  targetPreset: 'streaming'
};

const DEFAULT_REVERB: ReverbBusSettings = {
  enabled: true,
  type: 'plate',
  decay: 2.4,
  preDelay: 0.02,
  mix: 0.8,
  highCut: 11000
};

const DEFAULT_DELAY: DelayBusSettings = {
  enabled: true,
  time: 0.375,
  sync: '1/8d',
  feedback: 0.38,
  mix: 0.7,
  pingPong: true,
  highCut: 4500
};

// Generates a punchy 4-bar Hip-Hop / Trap Beat loop via Web Audio synthesis
function generateSyntheticDemoBeat(ctx: AudioContext, bpm: number = 140): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const secondsPerBeat = 60 / bpm;
  const totalBeats = 16; // 4 bars of 4/4
  const duration = secondsPerBeat * totalBeats;
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let beat = 0; beat < totalBeats; beat++) {
    const beatTime = beat * secondsPerBeat;
    const startSample = Math.floor(beatTime * sampleRate);

    // 1. Kick on 0, 3, 6, 8, 11 (Syncopated Trap Kick)
    if ([0, 3, 6, 8, 11].includes(beat)) {
      const kickLength = Math.floor(sampleRate * 0.35);
      for (let i = 0; i < kickLength && startSample + i < totalSamples; i++) {
        const t = i / sampleRate;
        const freq = 120 * Math.exp(-t * 22) + 45;
        const env = Math.exp(-t * 10);
        const s = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
        left[startSample + i] += s;
        right[startSample + i] += s;
      }
    }

    // 2. Snare / Clap on beats 2, 6, 10, 14
    if (beat % 4 === 2) {
      const snareLength = Math.floor(sampleRate * 0.22);
      for (let i = 0; i < snareLength && startSample + i < totalSamples; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 25);
        const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 35) * 0.5;
        const s = (noise * 0.6 + tone) * 0.75;
        left[startSample + i] += s;
        right[startSample + i] += s;
      }
    }

    // 3. Hi-Hats every 1/8th note
    for (let sub = 0; sub < 2; sub++) {
      const hatStart = Math.floor((beatTime + sub * (secondsPerBeat / 2)) * sampleRate);
      const hatLength = Math.floor(sampleRate * 0.05);
      const vel = sub === 0 ? 0.35 : 0.2;
      for (let i = 0; i < hatLength && hatStart + i < totalSamples; i++) {
        const t = i / sampleRate;
        const s = (Math.random() * 2 - 1) * Math.exp(-t * 80) * vel;
        left[hatStart + i] += s * 0.9;
        right[hatStart + i] += s * 1.1; // Slight stereo width
      }
    }
  }

  return buffer;
}

export default function App() {
  // --- Project State ---
  const [project, setProject] = useState<Project>({
    id: `project_${Date.now()}`,
    name: 'HitFactory Session 1',
    bpm: 140,
    timeSignature: [4, 4],
    sampleRate: 44100,
    latencyCompensationMs: 35,
    markers: [
      { id: 'm1', name: 'Intro', time: 0, color: '#6366f1' },
      { id: 'm2', name: 'Verse 1', time: 6.85, color: '#3b82f6' },
      { id: 'm3', name: 'Hook', time: 20.57, color: '#f59e0b' }
    ],
    tracks: [
      {
        id: 'track_beat',
        name: 'Trap Beat (Demo)',
        type: 'beat',
        color: '#6366f1',
        isMuted: false,
        isSolo: false,
        isArmed: false,
        volume: 0.9,
        pan: 0,
        effects: { ...DEFAULT_EFFECTS },
        clips: [],
        takes: []
      },
      {
        id: 'track_vocal_lead',
        name: 'Lead Vocal',
        type: 'vocal',
        vocalType: 'main',
        color: '#ec4899',
        isMuted: false,
        isSolo: false,
        isArmed: true, // Armed ready to record!
        volume: 1.0,
        pan: 0,
        effects: { 
          ...DEFAULT_EFFECTS, 
          autotune: { enabled: true, key: 'C', scale: 'minor', speed: 20, amount: 85 } 
        },
        clips: [],
        takes: []
      }
    ],
    loopSettings: { enabled: true, start: 0, end: 13.71 },
    masteringSettings: { ...DEFAULT_MASTERING },
    reverbBus: { ...DEFAULT_REVERB },
    delayBus: { ...DEFAULT_DELAY },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const [selectedTrackId, setSelectedTrackId] = useState<string>('track_vocal_lead');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(65);
  const [quantization, setQuantization] = useState<QuantizationValue>('1/16');

  // Metronome & Count-In
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(0.5);
  const [countInBars, setCountInBars] = useState(1);

  // Meter levels & Reference track
  const [meterLevels, setMeterLevels] = useState<MeterLevels>({
    peakL: 0, peakR: 0, rmsL: 0, rmsR: 0, lufsIntegrated: -70, lufsShortTerm: -70, isClipping: false
  });
  const [referenceTrack, setReferenceTrack] = useState<ReferenceTrack>({
    loaded: false, name: '', gain: 1.0, isActive: false
  });

  // UI Modals & Notifications
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAutoSaved, setIsAutoSaved] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme Mode (Dark / Light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ayoni_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const handleToggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ayoni_theme', next ? 'dark' : 'light');
      } catch {}
      showToast(next ? "Switched to Dark Mode" : "Switched to Light Mode");
      return next;
    });
  };

  // Clip Clipboard for Cut / Copy / Paste
  const [clipboardClip, setClipboardClip] = useState<Clip | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3200);
  }, []);

  // File Input Refs
  const beatFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Recording internals
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTakeNumberRef = useRef<number>(1);

  // --- Initial Setup & Demo Beat Loader ---
  useEffect(() => {
    // Generate starter demo beat buffer for Track 1 on start
    const setupStarter = async () => {
      const ctx = await audioEngine.init();
      const demoBuffer = generateSyntheticDemoBeat(ctx, project.bpm);
      const peaks = audioEngine.getWaveformData(demoBuffer, 180);

      const beatClip: Clip = {
        id: 'clip_demo_beat',
        trackId: 'track_beat',
        name: 'Trap Beat Loop',
        start: 0,
        duration: demoBuffer.duration,
        offset: 0,
        gain: 1.0,
        fadeIn: 0,
        fadeOut: 0,
        isMuted: false,
        isReversed: false,
        peaks,
        audioBuffer: demoBuffer
      };

      audioEngine.setBuffer('clip_demo_beat', demoBuffer);
      audioEngine.setBuffer('track_beat', demoBuffer);

      setProject(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.id === 'track_beat' ? { ...t, clips: [beatClip] } : t)
      }));
    };

    setupStarter();
  }, []);

  // Sync Bus Settings to Audio Engine
  useEffect(() => {
    audioEngine.setMasteringParams(project.masteringSettings);
  }, [project.masteringSettings]);

  useEffect(() => {
    audioEngine.setReverbBusSettings(project.reverbBus);
  }, [project.reverbBus]);

  useEffect(() => {
    audioEngine.setDelayBusSettings(project.delayBus);
  }, [project.delayBus]);

  useEffect(() => {
    audioEngine.setBpm(project.bpm);
  }, [project.bpm]);

  useEffect(() => {
    audioEngine.setLoopSettings(project.loopSettings);
  }, [project.loopSettings]);

  // Autosave to IndexedDB every 5 seconds if modified
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await projectDb.saveProject(project);
        setIsAutoSaved(true);
      } catch (e) {
        console.warn("Autosave failed", e);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [project]);

  const armedTrack = project.tracks.find(t => t.isArmed && t.type === 'vocal') || project.tracks.find(t => t.type === 'vocal');
  const [trackLevels, setTrackLevels] = useState<{ [trackId: string]: number }>({});

  // Master Meter & Playhead Cursor Animation Loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      // 1. Update Playhead
      if (isPlaying) {
        const time = audioEngine.getCurrentTime();
        // Check loop boundary wrap
        if (project.loopSettings.enabled && time >= project.loopSettings.end) {
          audioEngine.play(project.tracks, project.loopSettings.start);
          setPlaybackTime(project.loopSettings.start);
        } else {
          setPlaybackTime(time);
        }
      }

      // 2. Update Master Levels
      const levels = audioEngine.getMasterMeterLevels();
      setMeterLevels(levels);

      // 3. Update Channel Levels for Hardware Faders
      const levelsMap: { [trackId: string]: number } = {};
      project.tracks.forEach(t => {
        levelsMap[t.id] = audioEngine.getTrackLevel(t.id);
      });
      if (recorderState === RecorderState.RECORDING && armedTrack) {
        levelsMap[armedTrack.id] = audioEngine.getRecordingLevel();
      }
      setTrackLevels(levelsMap);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, project.loopSettings, project.tracks, recorderState, armedTrack]);

  // Metronome State Sync
  useEffect(() => {
    if (isMetronomeOn && isPlaying) {
      audioEngine.startMetronome(project.bpm, metronomeVolume);
    } else {
      audioEngine.stopMetronome();
    }
  }, [isMetronomeOn, isPlaying, project.bpm, metronomeVolume]);

  // --- Transport Actions ---

  const handleTogglePlay = useCallback(() => {
    audioEngine.resume();
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      audioEngine.play(project.tracks, playbackTime);
      setIsPlaying(true);
    }
  }, [isPlaying, project.tracks, playbackTime]);

  const handleStop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    if (recorderState === RecorderState.RECORDING) {
      handleStopRecording();
    }
  }, [recorderState]);

  const handleReturnToZero = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setPlaybackTime(0);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setPlaybackTime(time);
    if (isPlaying) {
      audioEngine.play(project.tracks, time);
    }
  }, [isPlaying, project.tracks]);

  const handleToggleLoop = useCallback(() => {
    setProject(prev => ({
      ...prev,
      loopSettings: {
        ...prev.loopSettings,
        enabled: !prev.loopSettings.enabled
      }
    }));
  }, []);

  // --- Multitrack Vocal Recording with Latency Compensation ---

  const handleStartRecording = async () => {
    if (!armedTrack) {
      alert("Please arm a vocal track to record.");
      return;
    }

    try {
      await audioEngine.init();
      await audioEngine.resume();

      // Check Count-in
      if (countInBars > 0) {
        setRecorderState(RecorderState.COUNTING_IN);
        // Calculate count-in duration
        const barSec = (60 / project.bpm) * 4;
        const countInDurationMs = countInBars * barSec * 1000;

        // Start metronome clicks during count-in
        audioEngine.startMetronome(project.bpm, metronomeVolume);

        setTimeout(() => {
          executeRecordStream();
        }, countInDurationMs);
      } else {
        executeRecordStream();
      }
    } catch (e) {
      console.error("Recording init error", e);
      alert("Microphone permission denied or audio device unavailable.");
      setRecorderState(RecorderState.IDLE);
    }
  };

  const executeRecordStream = async () => {
    try {
      const stream = await audioEngine.initRecordingSession(undefined, 1.0);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setRecorderState(RecorderState.PROCESSING);
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await rawBlob.arrayBuffer();

        try {
          const decodedBuffer = await audioEngine.decodeAudioData(arrayBuffer);
          const peaks = audioEngine.getWaveformData(decodedBuffer, 160);

          // Latency Compensation: Shift start time back by latency compensation ms
          const rawStart = recordingStartTimeRef.current;
          const compensatedStart = Math.max(0, rawStart - (project.latencyCompensationMs / 1000));
          const clipId = `clip_vocal_${Date.now()}`;
          const takeId = `take_${Date.now()}`;

          // Save buffer in engine cache
          audioEngine.setBuffer(clipId, decodedBuffer);

          const newClip: Clip = {
            id: clipId,
            trackId: armedTrack!.id,
            name: `Take ${recordingTakeNumberRef.current}`,
            start: compensatedStart,
            duration: decodedBuffer.duration,
            offset: 0,
            gain: 1.0,
            fadeIn: 0.02,
            fadeOut: 0.05,
            isMuted: false,
            isReversed: false,
            peaks,
            audioBuffer: decodedBuffer,
            blob: rawBlob
          };

          const newTake: Take = {
            id: takeId,
            trackId: armedTrack!.id,
            takeNumber: recordingTakeNumberRef.current,
            blob: rawBlob,
            duration: decodedBuffer.duration,
            startTime: compensatedStart,
            createdAt: Date.now(),
            isSelected: true
          };

          recordingTakeNumberRef.current += 1;

          // Save blob into IndexedDB
          await projectDb.saveAudioBlob(clipId, rawBlob);

          // Add clip to armed track
          setProject(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => {
              if (t.id === armedTrack!.id) {
                return {
                  ...t,
                  clips: [...t.clips, newClip],
                  takes: [...t.takes, newTake]
                };
              }
              return t;
            })
          }));
        } catch (err) {
          console.error("Decoding vocal take failed", err);
        } finally {
          audioEngine.cleanupRecordingSession();
          setRecorderState(RecorderState.IDLE);
        }
      };

      // Start actual recording
      recordingStartTimeRef.current = playbackTime;
      mediaRecorderRef.current.start(100);
      setRecorderState(RecorderState.RECORDING);

      // Start playing backing tracks in perfect sync!
      audioEngine.play(project.tracks, playbackTime);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      setRecorderState(RecorderState.IDLE);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    audioEngine.stop();
    setIsPlaying(false);
  };

  const handleToggleRecord = () => {
    if (recorderState === RecorderState.RECORDING) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  // --- Audio / MP3 File Import & Auto BPM Detection ---

  const handleImportAudioFile = async (file: File) => {
    if (!file) return;

    try {
      showToast(`Decoding ${file.name}...`);
      await audioEngine.init();
      await audioEngine.resume();

      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioEngine.decodeAudioData(arrayBuffer);
      
      // Auto-detect BPM
      const detectedBpm = await audioEngine.detectBPM(decodedBuffer);
      const peaks = audioEngine.getWaveformData(decodedBuffer, 200);

      const clipId = `clip_beat_${Date.now()}`;
      audioEngine.setBuffer(clipId, decodedBuffer);

      // Save blob in IndexedDB
      await projectDb.saveAudioBlob(clipId, file);

      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      const newClip: Clip = {
        id: clipId,
        trackId: 'track_beat',
        name: cleanName,
        start: 0,
        duration: decodedBuffer.duration,
        offset: 0,
        gain: 1.0,
        fadeIn: 0,
        fadeOut: 0,
        isMuted: false,
        isReversed: false,
        peaks,
        audioBuffer: decodedBuffer,
        blob: file
      };

      setProject(prev => {
        let updatedTracks = [...prev.tracks];
        const beatTrackIdx = updatedTracks.findIndex(t => t.type === 'beat');

        if (beatTrackIdx >= 0) {
          updatedTracks[beatTrackIdx] = {
            ...updatedTracks[beatTrackIdx],
            name: `${cleanName}`,
            clips: [newClip]
          };
        } else {
          updatedTracks.unshift({
            id: 'track_beat',
            name: `${cleanName}`,
            type: 'beat',
            color: '#6366f1',
            isMuted: false,
            isSolo: false,
            isArmed: false,
            volume: 0.9,
            pan: 0,
            effects: { ...DEFAULT_EFFECTS },
            clips: [newClip],
            takes: []
          });
        }

        return {
          ...prev,
          bpm: detectedBpm,
          tracks: updatedTracks
        };
      });

      setSelectedTrackId('track_beat');
      showToast(`Imported "${cleanName}" (${detectedBpm} BPM detected)`);
    } catch (err) {
      console.error("Audio / MP3 decode error", err);
      alert("Failed to decode audio file. Please check that the MP3 or audio file is valid.");
    }
  };

  const handleBeatFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImportAudioFile(file);
    }
    if (e.target) e.target.value = '';
  };

  // --- Reference Track Loader ---

  const handleReferenceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioEngine.decodeAudioData(arrayBuffer);
      audioEngine.loadReferenceTrack(decodedBuffer);

      setReferenceTrack({
        loaded: true,
        name: file.name,
        audioBuffer: decodedBuffer,
        blob: file,
        gain: 1.0,
        isActive: false
      });
      showToast(`Reference loaded: ${file.name}`);
    } catch (err) {
      console.error("Reference track decode failed", err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleToggleReferenceAB = () => {
    const nextState = !referenceTrack.isActive;
    setReferenceTrack(prev => ({ ...prev, isActive: nextState }));
    audioEngine.toggleReferenceAB(nextState, playbackTime);
  };

  // --- Tap Tempo Engine ---

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    taps.push(now);

    // Keep only last 5 taps within 2.5 seconds
    const recent = taps.filter(t => now - t < 2500);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 50 && calculatedBpm <= 220) {
        setProject(prev => ({ ...prev, bpm: calculatedBpm }));
      }
    }
  };

  // --- Clip Editing Actions (Split, Copy, Cut, Duplicate, Paste, Delete) ---

  const handleSplitClip = (trackId: string, clipId: string, splitProjectTime: number) => {
    let splitOccurred = false;
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        const target = t.clips.find(c => c.id === clipId);
        if (!target) return t;

        const relTime = splitProjectTime - target.start;
        if (relTime <= 0.08 || relTime >= target.duration - 0.08) return t;

        const clip1: Clip = {
          ...target,
          duration: relTime
        };

        const newId = `clip_${Date.now()}`;
        if (target.audioBuffer) {
          audioEngine.setBuffer(newId, target.audioBuffer);
        }

        const clip2: Clip = {
          ...target,
          id: newId,
          name: `${target.name} (Part 2)`,
          start: splitProjectTime,
          duration: target.duration - relTime,
          offset: target.offset + relTime
        };

        splitOccurred = true;
        return {
          ...t,
          clips: t.clips.map(c => c.id === clipId ? clip1 : c).concat(clip2)
        };
      })
    }));
    if (splitOccurred) {
      showToast("Split clip at playhead");
    }
  };

  const handleCopyClip = (trackId: string, clipId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!clip) return;
    setClipboardClip({ ...clip });
    showToast(`Copied "${clip.name}"`);
  };

  const handleCutClip = (trackId: string, clipId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    const clip = track?.clips.find(c => c.id === clipId);
    if (!clip) return;
    setClipboardClip({ ...clip });
    handleDeleteClip(trackId, clipId);
    showToast(`Cut "${clip.name}"`);
  };

  const handleDuplicateClip = (trackId: string, clipId: string) => {
    const track = project.tracks.find(t => t.id === trackId);
    const target = track?.clips.find(c => c.id === clipId);
    if (!target) return;

    const newClipId = `clip_${Date.now()}`;
    if (target.audioBuffer) {
      audioEngine.setBuffer(newClipId, target.audioBuffer);
    }

    const dupe: Clip = {
      ...target,
      id: newClipId,
      name: `${target.name} (Copy)`,
      start: target.start + target.duration + 0.2
    };

    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: [...t.clips, dupe]
        };
      })
    }));
    showToast(`Duplicated "${target.name}"`);
  };

  const handlePasteClip = (trackId: string, atTime?: number) => {
    if (!clipboardClip) {
      showToast("Clipboard is empty");
      return;
    }
    const pasteTime = atTime !== undefined ? atTime : playbackTime;
    const newClipId = `clip_${Date.now()}`;

    if (clipboardClip.audioBuffer) {
      audioEngine.setBuffer(newClipId, clipboardClip.audioBuffer);
    }

    const pastedClip: Clip = {
      ...clipboardClip,
      id: newClipId,
      trackId,
      name: `${clipboardClip.name} (Paste)`,
      start: Math.max(0, pasteTime)
    };

    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: [...t.clips, pastedClip]
        };
      })
    }));
    showToast(`Pasted "${clipboardClip.name}"`);
  };

  const handleDeleteClip = (trackId: string, clipId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.filter(c => c.id !== clipId)
        };
      })
    }));
    showToast("Deleted clip");
  };

  const handleSelectTake = (trackId: string, take: Take) => {
    // Promotes selected take to active clip on track
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        const updatedTakes = t.takes.map(tk => ({ ...tk, isSelected: tk.id === take.id }));
        return {
          ...t,
          takes: updatedTakes
        };
      })
    }));
  };

  const handleDeleteTake = (trackId: string, takeId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          takes: t.takes.filter(tk => tk.id !== takeId)
        };
      })
    }));
  };

  // --- Track Management (Add Track with Role & Rename, Update, Delete) ---

  const handleAddTrack = (type: TrackType = 'vocal', customName?: string, vocalType?: VocalType) => {
    const id = `track_${Date.now()}`;
    const count = project.tracks.filter(t => t.type === type).length + 1;
    
    const roleColors: Record<string, string> = {
      main: '#a855f7',
      adlib: '#00f2fe',
      double: '#ec4899',
      harmony: '#f59e0b',
      backing: '#10b981',
      beat: '#3b82f6'
    };

    const effectiveRole = vocalType || (type === 'beat' ? 'beat' : count === 1 ? 'main' : count === 2 ? 'adlib' : 'double');
    const color = roleColors[effectiveRole] || '#8b5cf6';

    const defaultName = customName?.trim() || (
      type === 'beat' 
        ? `Beat ${count}` 
        : effectiveRole === 'main' 
          ? 'Lead Vocal' 
          : effectiveRole === 'adlib' 
            ? 'Ad-libs' 
            : effectiveRole === 'double' 
              ? 'Double Vocal' 
              : effectiveRole === 'harmony' 
                ? 'Harmonies' 
                : effectiveRole === 'backing' 
                  ? 'Backing Vocal' 
                  : `Vocal ${count}`
    );

    const newTrack: Track = {
      id,
      name: defaultName,
      type,
      vocalType: type === 'vocal' ? (vocalType || (effectiveRole as VocalType)) : undefined,
      color,
      isMuted: false,
      isSolo: false,
      isArmed: type === 'vocal', // Automatically arm for recording
      volume: 1.0,
      pan: 0,
      effects: { 
        ...DEFAULT_EFFECTS,
        autotune: {
          ...DEFAULT_EFFECTS.autotune,
          enabled: type === 'vocal',
          speed: effectiveRole === 'adlib' ? 12 : 25
        }
      },
      clips: [],
      takes: []
    };

    setProject(prev => {
      // Unarm other vocal tracks if arming this new one
      const updatedTracks = prev.tracks.map(t => ({
        ...t,
        isArmed: type === 'vocal' ? false : t.isArmed
      }));
      return {
        ...prev,
        tracks: [...updatedTracks, newTrack]
      };
    });
    setSelectedTrackId(id);
    showToast(`Added track: ${defaultName}`);
  };

  const handleDeleteTrack = (id: string) => {
    if (project.tracks.length <= 1) {
      showToast("Cannot delete the only track in the project");
      return;
    }
    const target = project.tracks.find(t => t.id === id);
    const targetName = target?.name || "Track";

    setProject(prev => {
      const remaining = prev.tracks.filter(t => t.id !== id);
      return {
        ...prev,
        tracks: remaining
      };
    });

    if (selectedTrackId === id) {
      const remaining = project.tracks.filter(t => t.id !== id);
      setSelectedTrackId(remaining[0]?.id || null);
    }
    showToast(`Deleted track "${targetName}"`);
  };

  const handleUpdateTrack = (id: string, updates: Partial<Track>) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates };
        audioEngine.updateTrackParams(id, updated);
        return updated;
      })
    }));
    setIsAutoSaved(false);
  };

  const handleUpdateMasterVolume = (vol: number) => {
    setProject(prev => ({
      ...prev,
      masteringSettings: {
        ...prev.masteringSettings,
        gain: vol
      }
    }));
  };

  // --- Export Handler ---

  const handleExportMixdown = async (format: 'wav16' | 'wav24' | 'stems', range: 'full' | 'loop') => {
    const bitDepth = format === 'wav24' ? 24 : 16;
    const rangeParam = range === 'loop' && project.loopSettings.enabled ? project.loopSettings : undefined;

    if (format === 'stems') {
      // Export stems: render each track individually
      for (const track of project.tracks) {
        if (track.clips.length === 0) continue;
        const soloTrackList = project.tracks.map(t => ({
          ...t,
          isMuted: t.id !== track.id,
          isSolo: t.id === track.id
        }));

        const stemBlob = await audioEngine.exportMixdown(
          soloTrackList,
          project.masteringSettings,
          project.reverbBus,
          project.delayBus,
          project.bpm,
          rangeParam,
          bitDepth
        );

        triggerDownload(stemBlob, `${project.name} - Stem - ${track.name}.wav`);
      }
    } else {
      // Export full master mixdown
      const mixdownBlob = await audioEngine.exportMixdown(
        project.tracks,
        project.masteringSettings,
        project.reverbBus,
        project.delayBus,
        project.bpm,
        rangeParam,
        bitDepth
      );

      triggerDownload(mixdownBlob, `${project.name} - Master (${bitDepth}-bit).wav`);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Keyboard Shortcuts (Space, R, S, L, M, Home) ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or select
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleToggleLoop();
      } else if (e.code === 'Home' || e.code === 'Enter') {
        e.preventDefault();
        handleReturnToZero();
      } else if (e.key === 's' || e.key === 'S') {
        // Split selected track at playhead
        if (selectedTrackId) {
          const track = project.tracks.find(t => t.id === selectedTrackId);
          const clip = track?.clips.find(c => playbackTime >= c.start && playbackTime <= c.start + c.duration);
          if (clip) {
            handleSplitClip(selectedTrackId, clip.id, playbackTime);
          }
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (selectedTrackId) {
          const track = project.tracks.find(t => t.id === selectedTrackId);
          if (track) handleUpdateTrack(selectedTrackId, { isMuted: !track.isMuted });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleToggleRecord, handleToggleLoop, handleReturnToZero, selectedTrackId, playbackTime, project.tracks]);

  // Selected Track Object
  const selectedTrack = project.tracks.find(t => t.id === selectedTrackId) || null;

  return (
    <div className="w-screen h-screen flex flex-col bg-studio-950 text-zinc-300 font-sans overflow-hidden relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-[#1e202f]/95 border border-purple-500/60 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 animate-bounce pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Inputs (Accepts MP3, WAV, AAC, etc.) */}
      <input 
        ref={beatFileInputRef}
        type="file" 
        accept="audio/*,audio/mpeg,audio/mp3,.mp3,.wav,.ogg,.m4a,.flac,.aac" 
        className="hidden" 
        onChange={handleBeatFileSelected}
      />
      <input 
        ref={refFileInputRef}
        type="file" 
        accept="audio/*,audio/mpeg,audio/mp3,.mp3,.wav,.ogg,.m4a,.flac,.aac" 
        className="hidden" 
        onChange={handleReferenceFileSelected}
      />

      {/* Studio Workstation Interface matching the exact user reference design */}
      <StudioWorkstation 
        project={project}
        selectedTrackId={selectedTrackId}
        onSelectTrack={setSelectedTrackId}
        onUpdateTrack={handleUpdateTrack}
        onDeleteTrack={handleDeleteTrack}
        onAddTrack={handleAddTrack}
        isPlaying={isPlaying}
        playbackTime={playbackTime}
        recorderState={recorderState}
        onTogglePlay={handleTogglePlay}
        onToggleRecord={handleToggleRecord}
        onStop={handleStop}
        onSeek={handleSeek}
        onReturnToZero={handleReturnToZero}
        bpm={project.bpm}
        onBpmChange={(bpm) => setProject(p => ({ ...p, bpm }))}
        onTapTempo={handleTapTempo}
        onSplitClip={handleSplitClip}
        onCopyClip={handleCopyClip}
        onCutClip={handleCutClip}
        onDuplicateClip={handleDuplicateClip}
        onPasteClip={handlePasteClip}
        onDeleteClip={handleDeleteClip}
        canPaste={clipboardClip !== null}
        clipboardClipName={clipboardClip?.name || null}
        masterVolume={project.masteringSettings.gain}
        onUpdateMasterVolume={handleUpdateMasterVolume}
        onImportBeat={() => beatFileInputRef.current?.click()}
        onImportFile={handleImportAudioFile}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenProjects={() => setIsProjectModalOpen(true)}
        onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
        isAiPanelOpen={isAiPanelOpen}
        trackLevels={trackLevels}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Gemini AI Assistant Drawer */}
      <AIAssistantPanel 
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        selectedTrack={selectedTrack}
        onApplyTrackEffects={(trackId, fx) => {
          handleUpdateTrack(trackId, { effects: { ...selectedTrack!.effects, ...fx } });
        }}
        masteringSettings={project.masteringSettings}
        onApplyMastering={(m) => setProject(p => ({ ...p, masteringSettings: m }))}
        onApplyMarkers={(mks) => setProject(p => ({ ...p, markers: mks }))}
        bpm={project.bpm}
        trackCount={project.tracks.length}
        totalDuration={project.tracks[0]?.clips[0]?.duration || 90}
      />

      {/* Export Mixdown Modal */}
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={project.name}
        onExport={handleExportMixdown}
        isLoopEnabled={project.loopSettings.enabled}
      />

      {/* Project Sessions Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentProjectId={project.id}
        onNewProject={(name, bpm) => {
          setProject({
            id: `project_${Date.now()}`,
            name,
            bpm,
            timeSignature: [4, 4],
            sampleRate: 44100,
            latencyCompensationMs: 35,
            markers: [{ id: 'm1', name: 'Intro', time: 0, color: '#6366f1' }],
            tracks: [
              {
                id: 'track_vocal_1',
                name: 'Lead Vocal',
                type: 'vocal',
                vocalType: 'main',
                color: '#ec4899',
                isMuted: false,
                isSolo: false,
                isArmed: true,
                volume: 1.0,
                pan: 0,
                effects: { ...DEFAULT_EFFECTS },
                clips: [],
                takes: []
              }
            ],
            loopSettings: { enabled: false, start: 0, end: 16 },
            masteringSettings: { ...DEFAULT_MASTERING },
            reverbBus: { ...DEFAULT_REVERB },
            delayBus: { ...DEFAULT_DELAY },
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setSelectedTrackId('track_vocal_1');
          setPlaybackTime(0);
        }}
        onLoadProject={async (id) => {
          const loaded = await projectDb.getProject(id);
          if (loaded) {
            setProject(loaded);
            setSelectedTrackId(loaded.tracks[0]?.id || null);
            setPlaybackTime(0);
          }
        }}
        onLoadDemoProject={async () => {
          const ctx = await audioEngine.init();
          const demoBuffer = generateSyntheticDemoBeat(ctx, 140);
          const peaks = audioEngine.getWaveformData(demoBuffer, 180);
          const clipId = `clip_demo_${Date.now()}`;
          audioEngine.setBuffer(clipId, demoBuffer);

          setProject({
            id: `demo_${Date.now()}`,
            name: '808 Trap Demo Session',
            bpm: 140,
            timeSignature: [4, 4],
            sampleRate: 44100,
            latencyCompensationMs: 35,
            markers: [
              { id: 'm1', name: 'Intro', time: 0, color: '#6366f1' },
              { id: 'm2', name: 'Verse', time: 6.85, color: '#3b82f6' },
              { id: 'm3', name: 'Hook', time: 13.71, color: '#f59e0b' }
            ],
            tracks: [
              {
                id: 'track_beat',
                name: '808 Trap Beat',
                type: 'beat',
                color: '#6366f1',
                isMuted: false,
                isSolo: false,
                isArmed: false,
                volume: 0.9,
                pan: 0,
                effects: { ...DEFAULT_EFFECTS },
                clips: [{
                  id: clipId,
                  trackId: 'track_beat',
                  name: '808 Beat Loop',
                  start: 0,
                  duration: demoBuffer.duration,
                  offset: 0,
                  gain: 1.0,
                  fadeIn: 0,
                  fadeOut: 0,
                  isMuted: false,
                  isReversed: false,
                  peaks,
                  audioBuffer: demoBuffer
                }],
                takes: []
              },
              {
                id: 'track_vocal_1',
                name: 'Lead Vocal',
                type: 'vocal',
                vocalType: 'main',
                color: '#ec4899',
                isMuted: false,
                isSolo: false,
                isArmed: true,
                volume: 1.0,
                pan: 0,
                effects: { 
                  ...DEFAULT_EFFECTS, 
                  autotune: { enabled: true, key: 'C', scale: 'minor', speed: 15, amount: 90 } 
                },
                clips: [],
                takes: []
              }
            ],
            loopSettings: { enabled: true, start: 0, end: demoBuffer.duration },
            masteringSettings: { ...DEFAULT_MASTERING },
            reverbBus: { ...DEFAULT_REVERB },
            delayBus: { ...DEFAULT_DELAY },
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          setSelectedTrackId('track_vocal_1');
          setPlaybackTime(0);
        }}
      />
    </div>
  );
}