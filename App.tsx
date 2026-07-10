import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, Mic, Upload, Plus, Save, Music, Headphones, 
  Sliders, Clock, Layers, Timer, Gauge, X, Repeat, <Activity size={14} />,
  SkipBack, Square 
} from 'lucide-react';
import { Track, RecorderState, TrackEffects, MasteringSettings, LoopSettings, QuantizationValue } from './types';
import { audioEngine } from './services/audioEngine';
import { TrackItem } from './components/TrackItem';
import { Mixer } from './components/Mixer';
import { WaveformVisualizer } from './components/WaveformVisualizer';

const DEFAULT_EFFECTS: TrackEffects = {
  eq: { low: 0, mid: 0, high: 0 },
  reverb: { mix: 0, decay: 1.5 },
  delay: { mix: 0, time: 0.2, feedback: 0.3 },
  compression: { threshold: -20, ratio: 4 },
  autotune: { enabled: false, amount: 0, key: 'C' }
};

const DEFAULT_MASTERING: MasteringSettings = {
    gain: 1.0,
    eq: { low: 0, mid: 0, high: 0 },
    limiter: { threshold: -1.0 }
};

type VocalType = 'main' | 'adlib' | 'double' | 'harmony';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.IDLE);
  const [playbackTime, setPlaybackTime] = useState(0); 
  
  const [masteringSettings, setMasteringSettings] = useState<MasteringSettings>(DEFAULT_MASTERING);
  const [loopSettings, setLoopSettings] = useState<LoopSettings>({ enabled: false, start: 0, end: 10 });
  const [audioState, setAudioState] = useState<string>('uninitialized');
  const [quantization, setQuantization] = useState<QuantizationValue>('1/16');
  const [bpm, setBpm] = useState(120);

  useEffect(() => {
      const interval = setInterval(() => {
          const state = audioEngine.getState();
          if (state !== audioState) setAudioState(state);
      }, 1000);
      return () => clearInterval(interval);
  }, [audioState]);

  const connectAudio = async () => {
      await audioEngine.init();
      setAudioState(audioEngine.getState());
  };

  const snapToGrid = useCallback((time: number) => {
    if (quantization === 'none') return time;
    const beatDuration = 60 / bpm;
    let snapInterval = beatDuration;
    switch (quantization) {
      case '1/4': snapInterval = beatDuration; break;
      case '1/8': snapInterval = beatDuration / 2; break;
      case '1/16': snapInterval = beatDuration / 4; break;
      case '1/32': snapInterval = beatDuration / 8; break;
    }
    return Math.round(time / snapInterval) * snapInterval;
  }, [bpm, quantization]);

  const handleSeek = useCallback((time: number) => {
      const snappedTime = snapToGrid(time);
      setPlaybackTime(snappedTime);
      if (isPlaying) {
          audioEngine.play(tracks, snappedTime);
      }
  }, [isPlaying, tracks, snapToGrid]);

  useEffect(() => {
      audioEngine.setMasteringParams(masteringSettings);
  }, [masteringSettings]);

  useEffect(() => {
      audioEngine.setLoopSettings(loopSettings);
  }, [loopSettings]);
  
  // Recording Settings
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isMetronome, setIsMetronome] = useState(false);
  const [recordingType, setRecordingType] = useState<VocalType>('main');
  
  // Advanced Rec Settings
  const [showRecSettings, setShowRecSettings] = useState(false);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [preCount, setPreCount] = useState(false);
  const [recordDuration, setRecordDuration] = useState<'free' | '4' | '8' | '16'>('free');
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [isMicTestActive, setIsMicTestActive] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [recordingStartProjectTime, setRecordingStartProjectTime] = useState<number>(0);
  const [recordMaster, setRecordMaster] = useState(false);
  
  // Input Gain & Metering
  const [inputGain, setInputGain] = useState(1.0);
  const [inputLevel, setInputLevel] = useState(0);

  // Refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const isRecordingCancelled = useRef(false);

  // Initialize Input Devices
  useEffect(() => {
    const getDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            setInputDevices(inputs);
            if (inputs.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(inputs[0].deviceId);
            }
        } catch (e) {
            console.error("Error fetching devices:", e);
        }
    };
    getDevices();
    navigator.mediaDevices.ondevicechange = getDevices;
  }, [selectedDeviceId]);

  // VU Meter Loop
  useEffect(() => {
      let animId: number;
      const updateMeter = () => {
          if (recorderState === RecorderState.RECORDING || isMicTestActive) {
              const level = audioEngine.getRecordingLevel();
              setInputLevel(level);
          } else {
              setInputLevel(0);
          }
          animId = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      return () => cancelAnimationFrame(animId);
  }, [recorderState, isMicTestActive]);
  
  // Playback Cursor Loop
  useEffect(() => {
      let animId: number;
      const updateTime = () => {
          if (isPlaying) {
              const currentTime = audioEngine.getCurrentTime();
              if (loopSettings.enabled && currentTime >= loopSettings.end) {
                  handleSeek(loopSettings.start);
              } else {
                  setPlaybackTime(currentTime);
              }
              animId = requestAnimationFrame(updateTime);
          }
      };
      if (isPlaying) {
          updateTime();
      }
      return () => cancelAnimationFrame(animId);
  }, [isPlaying, loopSettings, handleSeek]);

  // Handle Input Gain Change realtime
  useEffect(() => {
      audioEngine.setInputGain(inputGain);
  }, [inputGain]);

  // Clean up mic test when closing settings
  useEffect(() => {
      if (!showRecSettings && isMicTestActive) {
          toggleMicTest();
      }
  }, [showRecSettings]);

  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        // Create a synthetic event to reuse handleFileUpload
        const syntheticEvent = {
          target: { files: [file], value: '' }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleFileUpload(syntheticEvent);
      } else {
        alert('Please drop a valid audio file.');
      }
    }
  };

  // --- Handlers ---

  const TRACK_COLORS = [
      '#ec4899', // Pink
      '#a855f7', // Purple
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#3b82f6', // Blue
      '#8b5cf6', // Violet
      '#ef4444', // Red
      '#14b8a6', // Teal
  ];

  const getRandomTrackColor = () => TRACK_COLORS[Math.floor(Math.random() * TRACK_COLORS.length)];

  const handleImportClick = () => {
      // Must be synchronous for Safari/iOS file picker to work
      audioEngine.init().catch(e => console.warn("AudioEngine init failed on click", e));
      fileInputRef.current?.click();
  };

  const addTrack = (type: 'audio' | 'beat') => {
      if (type === 'beat') {
          handleImportClick();
      } else {
          const newTrack: Track = {
              id: crypto.randomUUID(),
              name: `Audio Track ${tracks.filter(t => t.type === 'vocal').length + 1}`,
              type: 'vocal',
              vocalType: 'main',
              color: getRandomTrackColor(),
              isMuted: false,
              isSolo: false,
              isArmed: true, // Auto-arm new audio tracks
              volume: 1.0,
              pan: 0,
              effects: { ...DEFAULT_EFFECTS },
              waveformData: [],
              startTime: 0,
              duration: 0,
              offset: 0
          };
          // Disarm other tracks
          setTracks(prev => [...prev.map(t => ({ ...t, isArmed: false })), newTrack]);
          setSelectedTrackId(newTrack.id);
      }
      setIsAddTrackOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsImporting(true);
      try {
        // Ensure AudioContext is initialized/resumed on user interaction
        await audioEngine.init();
        
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioEngine.decodeAudioData(arrayBuffer);
        const waveform = audioEngine.getWaveformData(audioBuffer);

        // Detect BPM
        // Give UI time to update loading state before heavy processing
        await new Promise(resolve => setTimeout(resolve, 50));
        const detectedBpm = await audioEngine.detectBPM(audioBuffer);
        setBpm(detectedBpm);

        // Fallback for crypto.randomUUID if not available
        const trackId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15);
            
        audioEngine.setTrackData(trackId, audioBuffer, file);

        const newTrack: Track = {
          id: trackId,
          name: file.name,
          type: 'beat',
          color: '#3b82f6', // blue-500
          isMuted: false,
          isSolo: false,
          isArmed: false,
          volume: 0.8,
          pan: 0,
          effects: { ...DEFAULT_EFFECTS },
          waveformData: waveform,
          startTime: 0,
          duration: audioBuffer.duration,
          offset: 0
        };

        setTracks(prev => [newTrack, ...prev]);
        if (!selectedTrackId) setSelectedTrackId(newTrack.id);
        setIsAddTrackOpen(false);
      } catch (error) {
        console.error("File import failed:", error);
        alert("Failed to import audio file. Please ensure it's a valid audio format (MP3, WAV, OGG).");
      } finally {
        // Reset input value to allow re-uploading same file if needed
        e.target.value = '';
        setIsImporting(false);
      }
    }
  };

  const exportSong = async () => {
    if (tracks.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await audioEngine.exportMix(tracks, masteringSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'HitFactory_Mixdown.wav';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export the song.");
    } finally {
      setIsExporting(false);
    }
  };

  const saveProject = async () => {
    setIsExporting(true);
    try {
      const projectData = {
        tracks: await Promise.all(tracks.map(async (t) => {
          const blob = audioEngine.getTrackBlob(t.id);
          let base64 = null;
          if (blob) {
            base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          return {
            ...t,
            audioData: base64
          };
        })),
        bpm,
        masteringSettings
      };
      
      const json = JSON.stringify(projectData);
      localStorage.setItem('hitfactory_project', json);
      alert('Project saved successfully!');
    } catch (e: any) {
      console.error('Save failed', e);
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        alert('Failed to save project: LocalStorage quota exceeded (5MB limit). Try removing some tracks or using shorter audio.');
      } else {
        alert('Failed to save project.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const loadProject = async () => {
    const json = localStorage.getItem('hitfactory_project');
    if (!json) {
      alert('No saved project found.');
      return;
    }
    
    setIsImporting(true);
    try {
      await audioEngine.init();
      const projectData = JSON.parse(json);
      
      // Clear existing tracks
      tracks.forEach(t => audioEngine.removeTrackData(t.id));
      
      const loadedTracks: Track[] = [];
      for (const tData of projectData.tracks) {
        const { audioData, ...trackMeta } = tData;
        
        if (audioData) {
          const res = await fetch(audioData);
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioEngine.decodeAudioData(arrayBuffer);
          audioEngine.setTrackData(trackMeta.id, audioBuffer, blob);
        }
        loadedTracks.push(trackMeta as Track);
      }
      
      setTracks(loadedTracks);
      setBpm(projectData.bpm || 120);
      if (projectData.masteringSettings) {
        setMasteringSettings(projectData.masteringSettings);
      }
      
      alert('Project loaded successfully!');
    } catch (e) {
      console.error('Load failed', e);
      alert('Failed to load project.');
    } finally {
      setIsImporting(false);
    }
  };

  const getTrackColor = (type: VocalType) => {
      switch(type) {
          case 'main': return '#ec4899'; // Pink
          case 'adlib': return '#a855f7'; // Purple
          case 'double': return '#f43f5e'; // Rose
          case 'harmony': return '#06b6d4'; // Cyan
          default: return '#ec4899';
      }
  };

  const toggleMicTest = async () => {
      if (isMicTestActive) {
          audioEngine.cleanupRecordingSession();
          setIsMicTestActive(false);
      } else {
          try {
              const constraints = { 
                  audio: {
                      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                      echoCancellation: !isMonitoring,
                      latency: 0,
                      noiseSuppression: true,
                      autoGainControl: false 
                  } as any
              };
              const stream = await navigator.mediaDevices.getUserMedia(constraints);
              audioEngine.initRecordingSession(stream, inputGain);
              setIsMicTestActive(true);
          } catch (e) {
              console.error("Mic Test Failed", e);
              alert("Could not access microphone.");
          }
      }
  };

  const startRecording = async () => {
    try {
        // Cleanup mic test if running
        if (isMicTestActive) {
            audioEngine.cleanupRecordingSession();
            setIsMicTestActive(false);
        }

        await audioEngine.init();
        isRecordingCancelled.current = false;

        // Check for armed track
        const armedTrack = tracks.find(t => t.isArmed);

        if (!armedTrack) {
            alert("Please add and arm a vocal track to record.");
            return;
        }

        // 1. Handle Pre-Count
        if (preCount) {
            setRecorderState(RecorderState.COUNTING_IN);
            audioEngine.startMetronome(bpm);
            
            const beatMs = 60000 / bpm;
            for (let i = 4; i > 0; i--) {
                if (isRecordingCancelled.current) {
                    audioEngine.stopMetronome();
                    return;
                }
                setCountInBeat(i);
                await new Promise(resolve => setTimeout(resolve, beatMs));
            }
            setCountInBeat(null);
            
            // Stop metronome if not needed for recording
            if (!isMetronome) audioEngine.stopMetronome();
        } else {
             if (isMetronome) audioEngine.startMetronome(bpm);
        }

        if (isRecordingCancelled.current) return;

        // 2. Setup Stream
        const constraints = { 
            audio: {
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                echoCancellation: !isMonitoring, // Better quality when monitoring via headphones
                latency: 0,
                noiseSuppression: true,
                autoGainControl: false 
            } as any
        };

        const sourceStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 3. Init Session in AudioEngine (Gain -> Dest)
        const destStream = audioEngine.initRecordingSession(sourceStream, inputGain, recordMaster);

        // 4. Monitoring
        if (isMonitoring) {
            audioEngine.enableMonitoring();
        }

        // 5. Start MediaRecorder
        mediaRecorder.current = new MediaRecorder(destStream);
        audioChunks.current = [];

        mediaRecorder.current.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.current.push(e.data);
        };

        const recordingStartTimeInProject = playbackTime;
        setRecordingStartProjectTime(recordingStartTimeInProject);

        mediaRecorder.current.onstop = async () => {
            // Processing logic
            const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
            if (blob.size === 0) return; // Clean up empty recordings

            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioEngine.decodeAudioData(arrayBuffer);
            const waveform = audioEngine.getWaveformData(audioBuffer);
            
            const actualStartTime = recordingStartTimeInProject; // Vocals should not snap to grid automatically
            
            if (armedTrack) {
                // Update existing armed track
                setTracks(prev => prev.map(t => {
                    if (t.id === armedTrack.id) {
                        audioEngine.setTrackData(t.id, audioBuffer, blob);
                        return {
                            ...t,
                            waveformData: waveform,
                            isArmed: false, // Disarm after recording
                            startTime: actualStartTime,
                            duration: audioBuffer.duration,
                            offset: 0
                        };
                    }
                    return t;
                }));
            } else {
                // Create new track
                const trackId = crypto.randomUUID();
                audioEngine.setTrackData(trackId, audioBuffer, blob);

                const newTrack: Track = {
                    id: trackId,
                    name: `${recordingType.charAt(0).toUpperCase() + recordingType.slice(1)} Take`,
                    type: 'vocal',
                    vocalType: recordingType,
                    color: getTrackColor(recordingType),
                    isMuted: false,
                    isSolo: false,
                    isArmed: false,
                    volume: 1.0,
                    pan: recordingType === 'double' ? 0.3 : 0,
                    effects: { ...DEFAULT_EFFECTS },
                    waveformData: waveform,
                    startTime: actualStartTime,
                    duration: audioBuffer.duration,
                    offset: 0
                };
                setTracks(prev => [...prev, newTrack]);
                setSelectedTrackId(newTrack.id);
            }

            setRecorderState(RecorderState.IDLE);
            
            // Cleanup
            audioEngine.cleanupRecordingSession();
            audioEngine.stopMetronome();
        };

        mediaRecorder.current.start();
        setRecorderState(RecorderState.RECORDING);
        setRecordingStartTime(Date.now());
        
        // 6. Start Playback of backing tracks (Resume or Start)
        // Ensure playback engine starts even if no tracks, to track time
        audioEngine.play(tracks, playbackTime);
        setIsPlaying(true);

        // 7. Auto-Stop Duration
      if (recordDuration !== 'free') {
    const bars = parseInt(recordDuration);
    const durationMs = (bars * 4) * (60000 / bpm);
    const recorderInstance = mediaRecorder.current;
    setTimeout(() => {
        if (mediaRecorder.current === recorderInstance && mediaRecorder.current?.state === 'recording') {
            stopRecording();
        }
    }, durationMs);
}

    } catch (err) {
        console.error("Error accessing mic:", err);
        alert("Could not access microphone.");
        setRecorderState(RecorderState.IDLE);
        setCountInBeat(null);
    }
  };

  const stopRecording = useCallback(() => {
    isRecordingCancelled.current = true; // Flag to stop pre-count if active

    if (recorderState === RecorderState.COUNTING_IN) {
        setCountInBeat(null);
        audioEngine.stopMetronome();
        setRecorderState(RecorderState.IDLE);
        return;
    }

    if (mediaRecorder.current && recorderState === RecorderState.RECORDING) {
        mediaRecorder.current.stop();
        // Tracks are stopped in mediaRecorder.onstop -> cleanupRecordingSession
        
        audioEngine.stop(); // Stop backing playback
        setIsPlaying(false);
    }
  }, [recorderState]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
        audioEngine.stop();
        audioEngine.stopMetronome();
        setIsPlaying(false);
    } else {
        audioEngine.play(tracks, playbackTime); // Resume from current cursor position
        if (isMetronome) audioEngine.startMetronome(bpm);
        setIsPlaying(true);
    }
  }, [isPlaying, tracks, playbackTime, isMetronome, bpm]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayback();
        }
        if (e.code === 'KeyR') {
            if (recorderState === RecorderState.IDLE) startRecording();
            else stopRecording();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback, recorderState]); // Dependencies must be fresh for closure

  const handleUpdateTrack = (id: string, updates: Partial<Track>) => {
      setTracks(prev => prev.map(t => {
          if (t.id === id) {
              // If arming, disarm others (exclusive arming for now)
              if (updates.isArmed) {
                  return { ...t, ...updates };
              }
              const updated = { ...t, ...updates };
              audioEngine.updateTrackParams(id, updated);
              return updated;
          }
          // If another track is being armed, disarm this one
          if (updates.isArmed) {
              return { ...t, isArmed: false };
          }
          return t;
      }));
  };

  const deleteTrack = (id: string) => {
      setTracks(prev => prev.filter(t => t.id !== id));
      audioEngine.removeTrackData(id);
      if (selectedTrackId === id) setSelectedTrackId(null);
  };

  const splitTrack = (trackId: string, splitTime: number) => {
      const track = tracks.find(t => t.id === trackId);
      const buffer = audioEngine.getTrackBuffer(trackId);
      if (!track || !buffer) return;

      const trackStart = track.startTime || 0;
      const relativeSplitTime = splitTime - trackStart;
      const currentDuration = track.duration || buffer.duration;

      if (relativeSplitTime <= 0 || relativeSplitTime >= currentDuration) return;

      const firstPart: Track = {
          ...track,
          duration: relativeSplitTime
      };

      const secondPartId = crypto.randomUUID();
      audioEngine.setTrackData(secondPartId, buffer, audioEngine.getTrackBlob(trackId));

      const secondPart: Track = {
          ...track,
          id: secondPartId,
          name: `${track.name} (Split)`,
          startTime: splitTime,
          offset: (track.offset || 0) + relativeSplitTime,
          duration: currentDuration - relativeSplitTime
      };

      setTracks(prev => {
          const index = prev.findIndex(t => t.id === trackId);
          const newTracks = [...prev];
          newTracks[index] = firstPart;
          newTracks.splice(index + 1, 0, secondPart);
          return newTracks;
      });
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || null;

  // Calculate Remaining Time for Display
  const getRecordingTimer = () => {
      if (recordDuration === 'free' || recorderState !== RecorderState.RECORDING) return null;
      const totalSeconds = (parseInt(recordDuration) * 4) * (60 / bpm);
      const elapsed = playbackTime - recordingStartProjectTime;
      const remaining = Math.max(0, totalSeconds - elapsed);
      return remaining.toFixed(1) + 's';
  };

  return (
    <div className="flex flex-col h-screen bg-studio-950 text-zinc-300 font-sans overflow-hidden relative">
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {(isImporting || isExporting) && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
           >
              <div className="w-16 h-16 border-4 border-studio-accent border-t-transparent rounded-full animate-spin mb-4" />
              <h2 className="text-xl font-black text-white tracking-widest">
                {isExporting ? 'PROCESSING...' : 'IMPORTING AUDIO...'}
              </h2>
              <p className="text-studio-400 text-sm mt-2">
                {isExporting ? 'Please wait while we process your request' : 'Processing waveform and detecting BPM'}
              </p>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-count Overlay */}
      <AnimatePresence>
        {recorderState === RecorderState.COUNTING_IN && countInBeat !== null && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
           >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[200px] font-black text-studio-accent drop-shadow-[0_0_50px_rgba(139,92,246,0.5)]"
              >
                {countInBeat}
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Header / Transport Bar */}
      <header className="h-16 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-6 z-40 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-studio-accent rounded-lg flex items-center justify-center shadow-lg shadow-studio-accent/20">
              <Music size={18} className="text-white" />
            </div>
            <h1 className="font-black text-lg tracking-tighter text-white hidden md:block">HITFACTORY</h1>
          </div>

          <div className="h-8 w-px bg-studio-800 hidden md:block" />

          {/* Transport Controls */}
          <div className="flex items-center gap-1 bg-studio-950 p-1 rounded-xl border border-studio-800">
            <button 
              onClick={() => handleSeek(0)}
              className="p-2 text-studio-500 hover:text-white transition-colors"
              title="Return to Start"
            >
              <SkipBack size={16} />
            </button>
            <button 
              onClick={togglePlayback}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isPlaying ? 'bg-studio-800 text-studio-accent' : 'bg-studio-accent text-white shadow-lg shadow-studio-accent/20'}`}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button 
              onClick={() => {
                audioEngine.stop();
                audioEngine.stopMetronome();
                setIsPlaying(false);
                setPlaybackTime(0);
              }}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-studio-800 text-studio-500 hover:text-white hover:bg-studio-700 transition-all"
            >
              <Square size={16} fill="currentColor" />
            </button>
            <button 
              onClick={recorderState === RecorderState.IDLE || recorderState === RecorderState.COUNTING_IN ? startRecording : stopRecording}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${recorderState === RecorderState.RECORDING ? 'bg-studio-danger text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-studio-800 text-studio-danger hover:bg-studio-700'}`}
            >
              <Mic size={20} fill={recorderState === RecorderState.RECORDING ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Center Display */}
        <div className="hidden lg:flex items-center gap-4 bg-studio-950 border border-studio-800 rounded-xl px-6 py-1.5 shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-studio-500 uppercase tracking-widest">Position</span>
            <span className="text-lg font-mono text-studio-accent leading-none">
              {Math.floor(playbackTime / 60).toString().padStart(2, '0')}:
              {Math.floor(playbackTime % 60).toString().padStart(2, '0')}.
              {Math.floor((playbackTime % 1) * 100).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="h-8 w-px bg-studio-800" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-studio-500 uppercase tracking-widest">Tempo</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-mono text-white leading-none">{bpm}</span>
              <span className="text-[9px] font-bold text-studio-500">BPM</span>
            </div>
          </div>
          <div className="h-8 w-px bg-studio-800" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-studio-500 uppercase tracking-widest">Snap</span>
            <select 
              value={quantization}
              onChange={(e) => setQuantization(e.target.value as QuantizationValue)}
              className="bg-transparent text-xs font-mono text-studio-accent border-none focus:ring-0 p-0 cursor-pointer uppercase"
            >
              <option value="none">OFF</option>
              <option value="1/4">1/4</option>
              <option value="1/8">1/8</option>
              <option value="1/16">1/16</option>
              <option value="1/32">1/32</option>
            </select>
          </div>
          {recorderState === RecorderState.RECORDING && (
            <>
              <div className="h-8 w-px bg-studio-800" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-studio-danger uppercase tracking-widest animate-pulse">Recording</span>
                <span className="text-lg font-mono text-studio-danger leading-none">
                  {getRecordingTimer() || 'REC'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {audioState !== 'running' && (
              <button 
                  onClick={connectAudio}
                  className="flex items-center gap-2 px-4 py-2 bg-studio-accent text-white rounded-lg text-xs font-black shadow-lg shadow-studio-accent/20 hover:scale-105 transition-all"
              >
                  <Headphones size={14} />
                  <span className="hidden sm:inline">CONNECT AUDIO</span>
              </button>
          )}
          <button 
            onClick={loadProject}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-bold border border-studio-700 transition-all"
          >
            <Upload size={14} /> <span className="hidden sm:inline">LOAD</span>
          </button>
          <button 
            onClick={saveProject}
            disabled={tracks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-bold border border-studio-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity size={14} /> <span className="hidden sm:inline">SAVE</span>
          </button>
          <button 
            onClick={exportSong}
            disabled={tracks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-bold border border-studio-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity size={14} /> <span className="hidden sm:inline">EXPORT MIX</span>
          </button>
          <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-bold border border-studio-700 transition-all"
          >
            <Upload size={14} /> <span className="hidden sm:inline">IMPORT BEAT</span>
          </button>
          <button 
            onClick={() => setIsAddTrackOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-bold border border-studio-700 transition-all"
          >
            <Plus size={14} /> <span className="hidden sm:inline">ADD TRACK</span>
          </button>
          <button 
            onClick={() => setShowRecSettings(!showRecSettings)}
            className={`p-2 rounded-lg border transition-all ${showRecSettings ? 'bg-studio-accent border-studio-accent text-white shadow-lg shadow-studio-accent/20' : 'bg-studio-800 border-studio-700 text-studio-500 hover:text-white'}`}
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Recording Settings */}
        <AnimatePresence>
          {showRecSettings && (
            <motion.aside 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="w-72 bg-studio-900 border-r border-studio-800 flex flex-col z-30 shadow-2xl"
            >
              <div className="p-6 flex flex-col gap-8 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-white tracking-widest uppercase">Input Settings</h2>
                  <button onClick={() => setShowRecSettings(false)} className="text-studio-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                {/* Meter Section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest">Input Level</label>
                    <button 
                      onClick={toggleMicTest}
                      className={`text-[9px] px-2 py-0.5 rounded font-bold border transition-all ${isMicTestActive ? 'bg-studio-accent border-studio-accent text-white' : 'border-studio-700 text-studio-500'}`}
                    >
                      {isMicTestActive ? 'STOP TEST' : 'TEST INPUT'}
                    </button>
                  </div>
                  
                  {/* Live Waveform */}
                  <div className="relative">
                    <WaveformVisualizer isActive={isMicTestActive || recorderState === RecorderState.RECORDING} audioEngine={audioEngine} />
                    
                    {/* Level Overlay */}
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-studio-950/50 rounded-r-lg overflow-hidden flex flex-col justify-end">
                       <motion.div 
                          className={`w-full transition-all duration-75 ${inputLevel > 0.9 ? 'bg-studio-danger' : (inputLevel > 0.7 ? 'bg-studio-warning' : 'bg-studio-success')}`}
                          style={{ height: `${Math.min(inputLevel * 100, 100)}%` }}
                        />
                    </div>
                  </div>
                </div>

                {/* Device Selection */}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest flex items-center gap-2">
                    <Mic size={12} /> Source Device
                  </label>
                  <select 
                    value={selectedDeviceId} 
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-studio-accent w-full appearance-none cursor-pointer"
                  >
                    {inputDevices.length === 0 && <option value="">Default Input</option>}
                    {inputDevices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Audio Input ${d.deviceId.slice(0,5)}...`}</option>
                    ))}
                  </select>
                </div>

                {/* Recording Options */}
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest flex items-center gap-2">
                      <Timer size={12} /> Pre-Count & Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setPreCount(!preCount)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${preCount ? 'bg-studio-accent/10 border-studio-accent text-studio-accent' : 'bg-studio-950 border-studio-800 text-studio-500'}`}
                      >
                        4-BEAT INTRO
                      </button>
                      <select 
                        value={recordDuration}
                        onChange={(e) => setRecordDuration(e.target.value as any)}
                        className="bg-studio-950 border border-studio-800 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-studio-accent appearance-none cursor-pointer text-center"
                      >
                        <option value="free">FREE REC</option>
                        <option value="4">4 BARS</option>
                        <option value="8">8 BARS</option>
                        <option value="16">16 BARS</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest flex items-center gap-2">
                      <Headphones size={12} /> Monitoring
                    </label>
                    <div className="flex items-center justify-between bg-studio-950 border border-studio-800 rounded-lg p-3">
                      <span className="text-xs font-bold text-zinc-400">Direct Monitor</span>
                      <button 
                        onClick={() => setIsMonitoring(!isMonitoring)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isMonitoring ? 'bg-studio-accent' : 'bg-studio-800'}`}
                      >
                        <motion.div 
                          animate={{ x: isMonitoring ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest flex items-center gap-2">
                      <Music size={12} /> Mixdown Recording
                    </label>
                    <div className="flex items-center justify-between bg-studio-950 border border-studio-800 rounded-lg p-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-400">Record Beat + Voice</span>
                        <span className="text-[9px] text-studio-500">Record master output into track</span>
                      </div>
                      <button 
                        onClick={() => setRecordMaster(!recordMaster)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${recordMaster ? 'bg-studio-accent' : 'bg-studio-800'}`}
                      >
                        <motion.div 
                          animate={{ x: recordMaster ? 22 : 2 }}
                          className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-studio-500 uppercase tracking-widest flex items-center gap-2">
                        <Gauge size={12} /> Input Gain
                      </label>
                      <span className="text-[10px] font-mono text-studio-accent font-bold">{inputGain.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={inputGain}
                        onChange={(e) => setInputGain(parseFloat(e.target.value))}
                        className="w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Timeline Area */}
        <div 
          className="flex-1 flex flex-col overflow-hidden bg-studio-950 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDraggingFile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-studio-accent/20 backdrop-blur-sm border-4 border-dashed border-studio-accent flex items-center justify-center pointer-events-none"
              >
                <div className="bg-studio-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                  <Upload size={48} className="text-studio-accent animate-bounce" />
                  <h2 className="text-2xl font-black text-white tracking-tight">DROP AUDIO FILE HERE</h2>
                  <p className="text-studio-400 font-bold uppercase tracking-widest text-xs">Import as new track</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-auto relative no-scrollbar">
             {/* Time Ruler */}
             <div 
                className="sticky top-0 h-10 bg-studio-900/80 backdrop-blur-sm border-b border-studio-800 z-30 flex items-end min-w-[5000px] cursor-pointer hover:bg-studio-800/30 transition-colors" 
                style={{ paddingLeft: '224px' }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left + e.currentTarget.scrollLeft - 224; // Subtract sidebar width
                    const newTime = Math.max(0, x / 50); // 50px per second
                    handleSeek(newTime);
                }}
             >
                 {Array.from({ length: 100 }).map((_, i) => (
                     <div key={i} className="flex-shrink-0 w-[50px] border-l border-studio-800/50 h-4 relative pointer-events-none">
                         <span className="absolute -top-6 left-1 text-[10px] font-mono text-studio-500 font-bold select-none">{i}s</span>
                         {Array.from({ length: 4 }).map((_, j) => (
                           <div key={j} className="absolute bottom-0 h-1.5 border-l border-studio-800/30" style={{ left: `${(j + 1) * 12.5}px` }} />
                         ))}
                     </div>
                 ))}
             </div>

             <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                style={{ 
                    backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px)', 
                    backgroundSize: '50px 100%', 
                    width: '5000px',
                    top: '40px',
                    left: '224px'
                }} 
             />
             
             {tracks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-studio-700 gap-6" style={{ paddingLeft: '224px' }}>
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 rounded-3xl bg-studio-900 border border-studio-800 flex items-center justify-center shadow-2xl"
                    >
                        <Music size={48} className="text-studio-800" />
                    </motion.div>
                    <div className="text-center flex flex-col items-center gap-4">
                      <div>
                        <p className="text-lg font-black text-studio-800 tracking-tight">EMPTY PROJECT</p>
                        <p className="text-sm text-studio-700">Import a beat or add a vocal track to start</p>
                      </div>
                      <button 
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-6 py-3 bg-studio-accent text-white rounded-xl text-sm font-black shadow-lg shadow-studio-accent/20 hover:scale-105 transition-all"
                      >
                        <Upload size={18} /> IMPORT BEAT
                      </button>
                    </div>
                </div>
             ) : (
                <div className="py-4 pr-4 pb-32 min-w-[5000px] flex flex-col gap-2">
                    {tracks.map(track => (
                        <TrackItem 
                            key={track.id} 
                            track={track} 
                            onUpdate={handleUpdateTrack}
                            onDelete={deleteTrack}
                            onSelect={setSelectedTrackId}
                            onSplit={splitTrack}
                            isSelected={selectedTrackId === track.id}
                            currentTime={playbackTime}
                            onSeek={handleSeek}
                            bpm={bpm}
                            quantization={quantization}
                            isRecording={recorderState === RecorderState.RECORDING}
                        />
                    ))}
                </div>
             )}

             {/* Playback Cursor */}
             <div 
                className="absolute top-0 bottom-0 w-px bg-studio-accent z-40 pointer-events-none shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                style={{ left: `${playbackTime * 50 + 224}px` }} // 50px per second + 224px offset
             >
                <div className="w-3 h-3 bg-studio-accent rounded-full -ml-[5.5px] mt-7 shadow-lg" />
             </div>
          </div>

          {/* Bottom Mixer Section */}
          <Mixer 
            selectedTrack={selectedTrack} 
            onUpdateTrack={handleUpdateTrack}
            masteringSettings={masteringSettings}
            onUpdateMastering={setMasteringSettings}
            trackCount={tracks.length}
          />
        </div>
      </main>

      {/* Modals / Overlays */}
      <AnimatePresence>
        {isAddTrackOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTrackOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-studio-900 border border-studio-800 rounded-2xl shadow-2xl p-8 relative z-10"
            >
              <h2 className="text-xl font-black text-white mb-6 tracking-tight">ADD NEW TRACK</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => addTrack('beat')}
                  className="flex flex-col items-center gap-4 p-6 bg-studio-950 border border-studio-800 rounded-xl hover:border-studio-accent hover:bg-studio-accent/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-studio-800 flex items-center justify-center group-hover:bg-studio-accent group-hover:text-white transition-all">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white">IMPORT BEAT</p>
                    <p className="text-[10px] text-studio-500 uppercase font-bold tracking-widest mt-1">WAV, MP3, OGG</p>
                  </div>
                </button>
                <button 
                  onClick={() => addTrack('audio')}
                  className="flex flex-col items-center gap-4 p-6 bg-studio-950 border border-studio-800 rounded-xl hover:border-studio-accent hover:bg-studio-accent/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-studio-800 flex items-center justify-center group-hover:bg-studio-accent group-hover:text-white transition-all">
                    <Mic size={24} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white">VOCAL TRACK</p>
                    <p className="text-[10px] text-studio-500 uppercase font-bold tracking-widest mt-1">RECORD DIRECTLY</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
          ref={fileInputRef}
          type="file" 
          accept="audio/*" 
          onChange={handleFileUpload} 
          className="hidden" 
      />
    </div>
  );
}

// Helper icon
function Activity({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
    );
}
