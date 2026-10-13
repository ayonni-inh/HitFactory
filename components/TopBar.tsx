import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, SkipBack, Circle, Repeat, 
  Volume2, Bell, Sliders, Download, FolderOpen, Save,
  Headphones, Layers, CheckCircle2, Mic
} from 'lucide-react';
import { RecorderState, MeterLevels, ReferenceTrack } from '../types';

interface TopBarProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  isPlaying: boolean;
  recorderState: RecorderState;
  onTogglePlay: () => void;
  onStop: () => void;
  onReturnToZero: () => void;
  onToggleRecord: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  playbackTime: number; // in seconds
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onTapTempo: () => void;
  isMetronomeOn: boolean;
  onToggleMetronome: () => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (vol: number) => void;
  countInBars: number; // 0, 1, 2
  onChangeCountIn: (bars: number) => void;
  latencyCompensationMs: number;
  onChangeLatency: (ms: number) => void;
  meterLevels: MeterLevels;
  referenceTrack: ReferenceTrack;
  onToggleReferenceAB: () => void;
  onLoadReferenceClick: () => void;
  onOpenProjects: () => void;
  onSaveProject: () => void;
  isAutoSaved: boolean;
  onOpenExport: () => void;
  onToggleAiPanel: () => void;
  isAiPanelOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onUpdateProjectName,
  isPlaying,
  recorderState,
  onTogglePlay,
  onStop,
  onReturnToZero,
  onToggleRecord,
  isLooping,
  onToggleLoop,
  playbackTime,
  bpm,
  onBpmChange,
  onTapTempo,
  isMetronomeOn,
  onToggleMetronome,
  metronomeVolume,
  onMetronomeVolumeChange,
  countInBars,
  onChangeCountIn,
  latencyCompensationMs,
  onChangeLatency,
  meterLevels,
  referenceTrack,
  onToggleReferenceAB,
  onLoadReferenceClick,
  onOpenProjects,
  onSaveProject,
  isAutoSaved,
  onOpenExport,
  onToggleAiPanel,
  isAiPanelOpen
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);

  useEffect(() => {
    setNameInput(projectName);
  }, [projectName]);

  // Convert seconds to BARS.BEATS.TICKS (assuming 4/4)
  const secondsPerBeat = 60 / bpm;
  const totalBeats = playbackTime / secondsPerBeat;
  const currentBar = Math.floor(totalBeats / 4) + 1;
  const currentBeat = Math.floor(totalBeats % 4) + 1;
  const currentTick = Math.floor(((totalBeats % 1) * 96));

  const formatBars = `${String(currentBar).padStart(3, '0')}.${String(currentBeat).padStart(2, '0')}.${String(currentTick).padStart(2, '0')}`;

  // Time format MM:SS.MS
  const minutes = Math.floor(playbackTime / 60);
  const seconds = Math.floor(playbackTime % 60);
  const millis = Math.floor((playbackTime % 1) * 100);
  const formatTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;

  const handleTap = () => {
    onTapTempo();
    setTapPulse(true);
    setTimeout(() => setTapPulse(false), 120);
  };

  return (
    <header className="h-16 bg-studio-950 border-b border-studio-800 flex items-center justify-between px-4 select-none shrink-0 z-30 shadow-md">
      {/* 1. Left Section: Logo & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-studio-accent to-purple-800 flex items-center justify-center shadow-lg shadow-studio-accent/20 border border-studio-accent/40">
            <Mic size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-white">AYONI</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-studio-800 text-studio-accent border border-studio-700">STUDIO</span>
            </div>
            <span className="text-[9px] font-semibold text-studio-500 tracking-tight">Vocal Multitrack DAW</span>
          </div>
        </div>

        <div className="h-6 w-px bg-studio-800 mx-1" />

        {/* Project Name & Save Status */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input 
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => {
                if (nameInput.trim()) onUpdateProjectName(nameInput.trim());
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (nameInput.trim()) onUpdateProjectName(nameInput.trim());
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="bg-studio-900 text-xs font-bold text-white px-2 py-1 rounded border border-studio-accent focus:outline-none w-44"
            />
          ) : (
            <button 
              onClick={() => setIsEditingName(true)}
              className="text-xs font-bold text-zinc-300 hover:text-white px-2 py-1 rounded hover:bg-studio-900 transition-colors text-left truncate max-w-[170px]"
              title="Click to rename project"
            >
              {projectName}
            </button>
          )}

          <button 
            onClick={onSaveProject}
            className="flex items-center gap-1 text-[10px] font-medium text-studio-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-studio-900 transition-colors"
            title="Save Project (Ctrl+S)"
          >
            {isAutoSaved ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 size={11} /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Save size={11} /> Save
              </span>
            )}
          </button>

          <button 
            onClick={onOpenProjects}
            className="text-[10px] font-semibold text-studio-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-studio-900 transition-colors flex items-center gap-1"
            title="Projects library"
          >
            <FolderOpen size={11} />
            <span>Projects</span>
          </button>
        </div>
      </div>

      {/* 2. Center Section: Transport Controls & LCD Time Readout */}
      <div className="flex items-center gap-3">
        {/* Transport Buttons */}
        <div className="flex items-center gap-1 bg-studio-900 p-1 rounded-xl border border-studio-800 shadow-inner">
          {/* Return to Zero */}
          <button 
            onClick={onReturnToZero}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-studio-800 transition-all active:scale-95"
            title="Return to Zero (Home / Enter)"
          >
            <SkipBack size={15} />
          </button>

          {/* Stop */}
          <button 
            onClick={onStop}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-studio-800 transition-all active:scale-95"
            title="Stop Playback"
          >
            <Square size={14} />
          </button>

          {/* Play / Pause */}
          <button 
            onClick={onTogglePlay}
            className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 font-bold shadow-md ${
              isPlaying 
                ? 'bg-amber-500 text-black hover:bg-amber-400' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Record */}
          <button 
            onClick={onToggleRecord}
            className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 font-bold shadow-md ${
              recorderState === RecorderState.RECORDING
                ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.8)]'
                : recorderState === RecorderState.COUNTING_IN
                ? 'bg-amber-500 text-black animate-bounce'
                : 'bg-studio-800 text-rose-500 hover:bg-rose-950/60 hover:text-rose-400'
            }`}
            title="Record Vocals (R)"
          >
            <Circle size={14} fill="currentColor" />
          </button>

          {/* Loop Toggle */}
          <button 
            onClick={onToggleLoop}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
              isLooping 
                ? 'bg-studio-accent text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-studio-800'
            }`}
            title="Toggle Loop (L)"
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Dual LCD Display: BARS.BEATS.TICKS + MM:SS.MS */}
        <div className="bg-studio-950 px-3.5 py-1.5 rounded-xl border border-studio-800 flex items-center gap-4 shadow-inner">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-mono uppercase text-studio-500 tracking-widest font-black">BARS.BEATS</span>
            <span className="text-sm font-mono font-black text-studio-accent tracking-wider">{formatBars}</span>
          </div>

          <div className="w-px h-6 bg-studio-800" />

          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-mono uppercase text-studio-500 tracking-widest font-black">TIME</span>
            <span className="text-sm font-mono font-bold text-zinc-300 tracking-wider">{formatTime}</span>
          </div>
        </div>

        {/* Tempo, Tap & Time Signature */}
        <div className="bg-studio-900 px-3 py-1 rounded-xl border border-studio-800 flex items-center gap-2.5">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-black text-studio-500 tracking-wider">BPM</span>
            <input 
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="w-12 bg-transparent text-xs font-black font-mono text-white focus:outline-none"
            />
          </div>

          <button 
            onClick={handleTap}
            className={`px-2 py-1 text-[9px] font-black uppercase rounded border transition-all active:scale-95 ${
              tapPulse 
                ? 'bg-studio-accent text-white border-studio-accent shadow-[0_0_8px_rgba(139,92,246,0.8)]' 
                : 'bg-studio-800 text-studio-400 border-studio-700 hover:text-white hover:bg-studio-700'
            }`}
            title="Tap Tempo (click repeatedly in rhythm)"
          >
            TAP
          </button>

          <div className="text-[10px] font-mono font-bold text-studio-500 border-l border-studio-800 pl-2">
            4/4
          </div>
        </div>

        {/* Metronome & Count-In */}
        <div className="flex items-center gap-1 bg-studio-900 p-1 rounded-xl border border-studio-800">
          <button 
            onClick={onToggleMetronome}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              isMetronomeOn 
                ? 'bg-studio-accent/20 text-studio-accent border border-studio-accent/30' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-studio-800'
            }`}
            title="Metronome Click"
          >
            <Bell size={12} className={isMetronomeOn && isPlaying ? "animate-pulse" : ""} />
            <span>CLICK</span>
          </button>

          {/* Count-in selector */}
          <select 
            value={countInBars}
            onChange={(e) => onChangeCountIn(Number(e.target.value))}
            className="bg-studio-950 text-[10px] font-bold text-zinc-300 rounded px-1.5 py-1 border border-studio-800 focus:outline-none cursor-pointer"
            title="Count-in before recording"
          >
            <option value={0}>0 Bar</option>
            <option value={1}>1 Bar</option>
            <option value={2}>2 Bars</option>
          </select>
        </div>
      </div>

      {/* 3. Right Section: Master VU Meter, Reference Track A/B, AI Assistant & Export */}
      <div className="flex items-center gap-3">
        {/* Latency compensation readout & settings */}
        <div className="relative">
          <button 
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            className="px-2 py-1 rounded-lg bg-studio-900 hover:bg-studio-800 text-[10px] font-bold text-zinc-400 flex items-center gap-1.5 border border-studio-800"
            title="Audio Hardware & Latency Settings"
          >
            <Sliders size={12} />
            <span>{latencyCompensationMs}ms SYNC</span>
          </button>

          {showSettingsPopover && (
            <div className="absolute right-0 top-10 w-64 bg-studio-900 border border-studio-700 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-white border-b border-studio-800 pb-2">
                <span>Latency Compensation</span>
                <span className="font-mono text-studio-accent">{latencyCompensationMs} ms</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Adjusts vocal take alignment on the timeline to eliminate audio driver roundtrip delay.
              </p>
              <input 
                type="range"
                min={-100}
                max={150}
                value={latencyCompensationMs}
                onChange={(e) => onChangeLatency(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] font-mono text-studio-500">
                <span>-100ms</span>
                <span>0ms (Direct)</span>
                <span>+150ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Master Output Meter (Peak L/R & LUFS) */}
        <div className="flex items-center gap-2 bg-studio-900 px-2.5 py-1 rounded-xl border border-studio-800">
          <div className="flex flex-col gap-0.5">
            {/* Left Channel */}
            <div className="w-16 h-1.5 bg-studio-950 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-75 ${
                  meterLevels.isClipping ? 'bg-rose-500' : meterLevels.peakL > 0.8 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, meterLevels.peakL * 100)}%` }}
              />
            </div>
            {/* Right Channel */}
            <div className="w-16 h-1.5 bg-studio-950 rounded-full overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-75 ${
                  meterLevels.isClipping ? 'bg-rose-500' : meterLevels.peakR > 0.8 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, meterLevels.peakR * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-end leading-none">
            <span className={`text-[8px] font-black font-mono ${meterLevels.isClipping ? 'text-rose-500' : 'text-studio-500'}`}>
              {meterLevels.isClipping ? 'CLIP' : 'LUFS'}
            </span>
            <span className="text-[10px] font-mono font-bold text-zinc-300">
              {meterLevels.lufsShortTerm < -60 ? '-∞' : `${meterLevels.lufsShortTerm.toFixed(1)}`}
            </span>
          </div>
        </div>

        {/* Reference Track A/B Switch */}
        <div className="flex items-center gap-1">
          {referenceTrack.loaded ? (
            <button 
              onClick={onToggleReferenceAB}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${
                referenceTrack.isActive 
                  ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]' 
                  : 'bg-studio-900 text-zinc-400 hover:text-white border border-studio-800'
              }`}
              title="A/B Toggle: Audition Mix vs Reference Track"
            >
              <Headphones size={12} />
              <span>{referenceTrack.isActive ? 'REF (B)' : 'MIX (A)'}</span>
            </button>
          ) : (
            <button 
              onClick={onLoadReferenceClick}
              className="px-2 py-1.5 rounded-lg text-[10px] font-semibold text-studio-500 hover:text-zinc-300 hover:bg-studio-900 border border-studio-800/80 transition-colors"
              title="Load reference song for loudness & mix comparison"
            >
              + Ref Track
            </button>
          )}
        </div>

        {/* AI Assistant Toggle Button */}
        <button 
          onClick={onToggleAiPanel}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            isAiPanelOpen 
              ? 'bg-studio-accent text-white shadow-lg shadow-studio-accent/25' 
              : 'bg-studio-900 text-zinc-300 hover:bg-studio-800 border border-studio-800'
          }`}
          title="Open Gemini AI Vocal & Mix Assistant"
        >
          <Layers size={13} className={isAiPanelOpen ? "text-white" : "text-studio-accent"} />
          <span>AI Producer</span>
        </button>

        {/* Export Mixdown */}
        <button 
          onClick={onOpenExport}
          className="btn-primary flex items-center gap-1.5 text-xs font-black tracking-wide"
          title="Export WAV/MP3 Mixdown or Stems"
        >
          <Download size={14} />
          <span>EXPORT</span>
        </button>
      </div>
    </header>
  );
};
