import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, FastForward, Rewind, Circle, 
  Clock, Layers, Volume2, VolumeX, Mic, Scissors, 
  RotateCcw, Sliders, FolderOpen, Download, Sparkles, 
  Check, Mic2, Music, Upload, Plus, Edit2, Trash2,
  Copy, Clipboard, X
} from 'lucide-react';
import { Track, Project, RecorderState, Clip, TrackType, VocalType } from '../types';
import { HardwareMixer } from './HardwareMixer';
import { PitchCorrectionPanel } from './PitchCorrectionPanel';
import { AddRecordModal } from './AddRecordModal';

interface StudioWorkstationProps {
  project: Project;
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  onDeleteTrack: (id: string) => void;
  onAddTrack: (type: TrackType, name: string, vocalType?: VocalType) => void;
  isPlaying: boolean;
  playbackTime: number;
  recorderState: RecorderState;
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onReturnToZero: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onTapTempo: () => void;
  onSplitClip: (trackId: string, clipId: string, time: number) => void;
  onCopyClip?: (trackId: string, clipId: string) => void;
  onCutClip?: (trackId: string, clipId: string) => void;
  onDuplicateClip?: (trackId: string, clipId: string) => void;
  onPasteClip?: (trackId: string, time?: number) => void;
  onDeleteClip?: (trackId: string, clipId: string) => void;
  canPaste?: boolean;
  clipboardClipName?: string | null;
  masterVolume?: number;
  onUpdateMasterVolume?: (volume: number) => void;
  onImportBeat: () => void;
  onImportFile: (file: File) => void;
  onOpenExport: () => void;
  onOpenProjects: () => void;
  onToggleAiPanel: () => void;
  isAiPanelOpen: boolean;
  trackLevels: { [trackId: string]: number };
}

const TIMELINE_COLORS = ['#a855f7', '#00f2fe', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export const StudioWorkstation: React.FC<StudioWorkstationProps> = ({
  project,
  selectedTrackId,
  onSelectTrack,
  onUpdateTrack,
  onDeleteTrack,
  onAddTrack,
  isPlaying,
  playbackTime,
  recorderState,
  onTogglePlay,
  onToggleRecord,
  onStop,
  onSeek,
  onReturnToZero,
  bpm,
  onBpmChange,
  onTapTempo,
  onSplitClip,
  onCopyClip,
  onCutClip,
  onDuplicateClip,
  onPasteClip,
  onDeleteClip,
  canPaste = false,
  clipboardClipName = null,
  masterVolume = 1.0,
  onUpdateMasterVolume = (_vol: number) => {},
  onImportBeat,
  onImportFile,
  onOpenExport,
  onOpenProjects,
  onToggleAiPanel,
  isAiPanelOpen,
  trackLevels
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const mobileTimelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  
  // Mobile active tab: 'studio' | 'pitch' | 'mixer'
  const [mobileTab, setMobileTab] = useState<'studio' | 'pitch' | 'mixer'>('studio');

  // Desktop pitch panel toggle drawer
  const [showDesktopPitchDrawer, setShowDesktopPitchDrawer] = useState(false);

  // Add Record Modal
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  // Inline editing track name state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Selected clip id for focused editing
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Drag and drop visual state
  const [isDragOver, setIsDragOver] = useState(false);

  // Total project timeline duration representation in seconds (min 32s or longest clip)
  const longestClipDuration = Math.max(
    32,
    ...project.tracks.flatMap(t => t.clips.map(c => c.start + c.duration + 2))
  );
  const totalDuration = longestClipDuration;

  // Time formatting MM:SS
  const mins = Math.floor(playbackTime / 60);
  const secs = Math.floor(playbackTime % 60);
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Timeline scrubber drag (Desktop)
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(progress * totalDuration);
    setIsScrubbing(true);
  };

  // Timeline scrubber drag (Mobile)
  const handleMobileTimelineTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!mobileTimelineRef.current) return;
    const rect = mobileTimelineRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const progress = Math.max(0, Math.min(1, touchX / rect.width));
    onSeek(progress * totalDuration);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isScrubbing || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(progress * totalDuration);
    };

    const handleUp = () => setIsScrubbing(false);

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isScrubbing, onSeek, totalDuration]);

  // Drag and drop handlers for MP3 / audio files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes('audio') || file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        onImportFile(file);
      }
    }
  };

  const handleStartRename = (track: Track) => {
    setEditingTrackId(track.id);
    setEditingNameValue(track.name);
  };

  const handleSaveRename = (trackId: string) => {
    if (editingNameValue.trim()) {
      onUpdateTrack(trackId, { name: editingNameValue.trim() });
    }
    setEditingTrackId(null);
  };

  // Currently Selected Track
  const selectedTrack = project.tracks.find(t => t.id === selectedTrackId) || project.tracks[0] || null;

  // Active clip under playhead or selected clip
  const currentClip = selectedTrack?.clips.find(c => 
    selectedClipId ? c.id === selectedClipId : (playbackTime >= c.start && playbackTime <= c.start + c.duration)
  ) || selectedTrack?.clips[0] || null;

  // Playhead position percentage
  const playheadPercent = Math.min(100, Math.max(0, (playbackTime / totalDuration) * 100));

  // Clip Action Handlers
  const handleTriggerSplit = () => {
    if (!selectedTrack || !currentClip) return;
    onSplitClip(selectedTrack.id, currentClip.id, playbackTime);
  };

  const handleTriggerCopy = () => {
    if (!selectedTrack || !currentClip || !onCopyClip) return;
    onCopyClip(selectedTrack.id, currentClip.id);
  };

  const handleTriggerCut = () => {
    if (!selectedTrack || !currentClip || !onCutClip) return;
    onCutClip(selectedTrack.id, currentClip.id);
    setSelectedClipId(null);
  };

  const handleTriggerDuplicate = () => {
    if (!selectedTrack || !currentClip || !onDuplicateClip) return;
    onDuplicateClip(selectedTrack.id, currentClip.id);
  };

  const handleTriggerPaste = () => {
    if (!selectedTrack || !onPasteClip) return;
    onPasteClip(selectedTrack.id, playbackTime);
  };

  const handleTriggerDelete = () => {
    if (!selectedTrack || !currentClip || !onDeleteClip) return;
    onDeleteClip(selectedTrack.id, currentClip.id);
    setSelectedClipId(null);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full h-full flex flex-col bg-[#090a0d] select-none overflow-hidden relative ${
        isDragOver ? 'ring-4 ring-cyan-400/80 ring-inset' : ''
      }`}
    >
      {/* Visual Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-cyan-950/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-none">
          <Upload size={48} className="text-cyan-400 animate-bounce mb-3" />
          <p className="text-lg font-black text-white">DROP MP3 / AUDIO FILE HERE</p>
          <p className="text-xs text-cyan-300 mt-1">Decodes audio waveform and auto-detects BPM</p>
        </div>
      )}

      {/* Add Record Modal */}
      <AddRecordModal 
        isOpen={isAddRecordModalOpen}
        onClose={() => setIsAddRecordModalOpen(false)}
        onAddTrack={(type, name, vocalType) => onAddTrack(type, name, vocalType)}
        onImportBeat={onImportBeat}
      />

      {/* ==================================================================== */}
      {/* 1. MOBILE RESPONSIVE DASHBOARD (< 768px Viewport)                   */}
      {/* ==================================================================== */}
      <div className="flex md:hidden flex-col w-full h-full bg-[#101117] text-white">
        
        {/* Mobile Top App Bar (BPM, Tap, Master Volume, Import MP3, Sessions) */}
        <header className="h-14 px-3 bg-[#151620] border-b border-[#232533] flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center font-black text-xs text-white shadow-md">
              A
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-white">AYONI</div>
              <div className="text-[8px] font-mono text-zinc-400 truncate max-w-[80px]">{project.name}</div>
            </div>
          </div>

          {/* Master Volume on Mobile */}
          <div className="flex items-center gap-1.5 bg-[#0f1016] px-2 py-1 rounded-xl border border-[#242634]">
            <Volume2 size={12} className="text-purple-400" />
            <input 
              type="range"
              min="0"
              max="1.5"
              step="0.02"
              value={masterVolume}
              onChange={(e) => onUpdateMasterVolume(Number(e.target.value))}
              className="w-14 accent-purple-500 h-1 bg-[#232534] rounded cursor-pointer"
              title="Master Volume"
            />
            <span className="text-[9px] font-mono font-bold text-zinc-400 w-6 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          {/* Quick BPM & Tap on Mobile */}
          <div className="flex items-center gap-1 bg-[#0f1016] px-2 py-1 rounded-xl border border-[#242634]">
            <span className="text-[8px] font-mono font-bold text-zinc-500">BPM</span>
            <input 
              type="number"
              min={50}
              max={220}
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="w-8 bg-transparent text-xs font-black font-mono text-white text-center focus:outline-none"
            />
            <button
              onClick={() => {
                onTapTempo();
                setTapPulse(true);
                setTimeout(() => setTapPulse(false), 120);
              }}
              className={`px-1 py-0.5 rounded text-[8px] font-black uppercase border transition-all ${
                tapPulse ? 'bg-cyan-400 text-black border-cyan-400' : 'bg-[#1f212d] text-zinc-400 border-[#2b2d3d]'
              }`}
            >
              TAP
            </button>
          </div>

          {/* Import MP3 Beat Button on Mobile */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onImportBeat}
              className="px-2 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/40 text-[10px] font-black flex items-center gap-1"
              title="Import MP3 or Audio Beat File"
            >
              <Upload size={11} />
              <span>+ MP3</span>
            </button>

            <button
              onClick={onOpenProjects}
              className="text-zinc-400 hover:text-white p-1"
              title="Sessions"
            >
              <FolderOpen size={16} />
            </button>
          </div>
        </header>

        {/* Mobile Viewport Body (Switched via bottom dock) */}
        <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
          
          {/* TAB 1: STUDIO TIMELINE VIEW WITH RECORD LIST BY LEFT OF WAVES */}
          {mobileTab === 'studio' && (
            <div className="flex flex-col gap-2 h-full">
              
              {/* WAVE EDITING ACTION STRIP (Split, Copy, Cut, Duplicate, Paste, Delete) */}
              <div className="bg-[#151620] rounded-xl border border-[#242635] p-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <span className="text-[9px] font-black uppercase text-zinc-500 pr-1 shrink-0">WAVE TOOLS:</span>
                  
                  {/* Split Button */}
                  <button
                    onClick={handleTriggerSplit}
                    disabled={!currentClip}
                    className="px-2 py-1 rounded-lg bg-[#202230] hover:bg-[#2b2d3f] disabled:opacity-40 text-white text-[10px] font-bold flex items-center gap-1 border border-[#2d3043] transition-colors shrink-0"
                    title="Split clip at playhead"
                  >
                    <Scissors size={11} className="text-cyan-400" />
                    <span>Split</span>
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={handleTriggerCopy}
                    disabled={!currentClip}
                    className="px-2 py-1 rounded-lg bg-[#202230] hover:bg-[#2b2d3f] disabled:opacity-40 text-white text-[10px] font-bold flex items-center gap-1 border border-[#2d3043] transition-colors shrink-0"
                    title="Copy clip"
                  >
                    <Copy size={11} className="text-amber-400" />
                    <span>Copy</span>
                  </button>

                  {/* Cut Button */}
                  <button
                    onClick={handleTriggerCut}
                    disabled={!currentClip}
                    className="px-2 py-1 rounded-lg bg-[#202230] hover:bg-[#2b2d3f] disabled:opacity-40 text-white text-[10px] font-bold flex items-center gap-1 border border-[#2d3043] transition-colors shrink-0"
                    title="Cut clip"
                  >
                    <Scissors size={11} className="text-rose-400 rotate-90" />
                    <span>Cut</span>
                  </button>

                  {/* Duplicate Button */}
                  <button
                    onClick={handleTriggerDuplicate}
                    disabled={!currentClip}
                    className="px-2 py-1 rounded-lg bg-[#202230] hover:bg-[#2b2d3f] disabled:opacity-40 text-white text-[10px] font-bold flex items-center gap-1 border border-[#2d3043] transition-colors shrink-0"
                    title="Duplicate clip"
                  >
                    <Plus size={11} className="text-emerald-400" />
                    <span>Duplicate</span>
                  </button>

                  {/* Paste Button */}
                  <button
                    onClick={handleTriggerPaste}
                    disabled={!canPaste}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors shrink-0 ${
                      canPaste
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-sm'
                        : 'bg-[#181923] text-zinc-600 border-[#262835] opacity-50'
                    }`}
                    title={canPaste ? `Paste "${clipboardClipName}" at playhead` : "Nothing in clipboard"}
                  >
                    <Clipboard size={11} className={canPaste ? "text-purple-400" : "text-zinc-600"} />
                    <span>Paste</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={handleTriggerDelete}
                    disabled={!currentClip}
                    className="px-1.5 py-1 rounded-lg bg-[#202230] hover:bg-rose-950/40 disabled:opacity-30 text-zinc-400 hover:text-rose-300 border border-[#2d3043] transition-colors shrink-0"
                    title="Delete clip"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {/* Return to zero & Time */}
                <div className="flex items-center gap-2 pl-2 border-l border-[#242635] shrink-0">
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-400">
                    <Clock size={11} className="text-zinc-500" />
                    <span>{timeFormatted}</span>
                  </div>
                  <button 
                    onClick={onReturnToZero}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Return to Zero"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {/* MULTITRACK WORKSTATION: RECORD LIST APPEARS BY THE LEFT OF EACH WAVE */}
              <div className="flex-1 bg-[#13141d] rounded-2xl border border-[#232533] overflow-hidden flex flex-col shadow-inner">
                
                {/* Timeline Scrubber Header */}
                <div className="flex h-7 bg-[#161722] border-b border-[#232533]">
                  {/* Left Label */}
                  <div className="w-28 sm:w-32 shrink-0 px-2 flex items-center justify-between text-[9px] font-black uppercase text-zinc-500 border-r border-[#232533]">
                    <span>RECORD LIST</span>
                    <button 
                      onClick={() => setIsAddRecordModalOpen(true)}
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
                      title="Add Record (Lead / Ad-libs)"
                    >
                      <Plus size={10} />
                      <span>NEW</span>
                    </button>
                  </div>

                  {/* Right Timeline Bars Scrubber */}
                  <div 
                    ref={mobileTimelineRef}
                    onTouchStart={handleMobileTimelineTouch}
                    onTouchMove={handleMobileTimelineTouch}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const progress = Math.max(0, Math.min(1, x / rect.width));
                      onSeek(progress * totalDuration);
                    }}
                    className="flex-1 relative flex items-center px-1 cursor-pointer overflow-hidden"
                  >
                    {/* Bar markers 1, 2, 3, 4, 5, 6, 7, 8 */}
                    <div className="w-full flex justify-between pointer-events-none text-[8px] font-mono text-zinc-600 px-1">
                      <span>1.1</span>
                      <span>2.1</span>
                      <span>3.1</span>
                      <span>4.1</span>
                      <span>5.1</span>
                      <span>6.1</span>
                      <span>7.1</span>
                      <span>8.1</span>
                    </div>

                    {/* Scrubber Playhead Progress Dot */}
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] z-30 pointer-events-none"
                      style={{ left: `${playheadPercent}%` }}
                    />
                  </div>
                </div>

                {/* Multitrack Rows: Each Record on the Left has its own Wave in front on the Right */}
                <div className="flex-1 overflow-y-auto flex flex-col relative divide-y divide-[#1e202d]">
                  {project.tracks.map((trk, i) => {
                    const isSelected = trk.id === selectedTrackId;
                    const isEditing = editingTrackId === trk.id;
                    const trackLevel = trackLevels[trk.id] || 0;
                    const clip = trk.clips[0] || null;

                    return (
                      <div 
                        key={trk.id}
                        onClick={() => onSelectTrack(trk.id)}
                        className={`flex items-stretch transition-colors min-h-[58px] ${
                          isSelected ? 'bg-[#181a26]' : 'bg-[#12131b] hover:bg-[#161722]'
                        }`}
                      >
                        {/* LEFT COLUMN: RECORD TRACK CARD (Name, Rename, Role, Volume Level & Meter, Arm) */}
                        <div className="w-28 sm:w-32 shrink-0 p-2 flex flex-col justify-between border-r border-[#222432] bg-[#14151f]/80 select-none">
                          {/* Row 1: Indicator, Track Name, Inline Rename */}
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div 
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ 
                                  backgroundColor: trk.isArmed ? '#ef4444' : trk.color || TIMELINE_COLORS[i % TIMELINE_COLORS.length],
                                  boxShadow: trk.isArmed ? '0 0 6px rgba(239,68,68,0.9)' : undefined
                                }}
                              />

                              {isEditing ? (
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="text"
                                    value={editingNameValue}
                                    onChange={(e) => setEditingNameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(trk.id);
                                      if (e.key === 'Escape') setEditingTrackId(null);
                                    }}
                                    autoFocus
                                    className="bg-[#0b0c10] text-[10px] font-bold text-white px-1 py-0.5 rounded border border-purple-500 focus:outline-none w-16"
                                  />
                                  <button
                                    onClick={() => handleSaveRename(trk.id)}
                                    className="p-0.5 rounded bg-purple-600 text-white"
                                    title="Save"
                                  >
                                    <Check size={9} />
                                  </button>
                                  <button
                                    onClick={() => setEditingTrackId(null)}
                                    className="p-0.5 rounded bg-[#202230] text-zinc-400"
                                    title="Cancel"
                                  >
                                    <X size={9} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  <span 
                                    onDoubleClick={() => handleStartRename(trk)}
                                    className={`text-[11px] truncate font-bold ${
                                      isSelected ? 'text-white font-extrabold' : 'text-zinc-300'
                                    }`}
                                    title="Double tap to rename"
                                  >
                                    {trk.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(trk);
                                    }}
                                    className="text-zinc-500 hover:text-white p-0.5 shrink-0"
                                    title="Rename"
                                  >
                                    <Edit2 size={9} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Vocal Role Tag / Dropdown */}
                            {trk.type === 'vocal' && (
                              <select 
                                value={trk.vocalType || 'main'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const newRole = e.target.value as VocalType;
                                  onUpdateTrack(trk.id, { 
                                    vocalType: newRole,
                                    name: newRole === 'main' ? 'Lead' : newRole === 'adlib' ? 'Ad-libs' : newRole === 'double' ? 'Double' : 'Harmony'
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#1b1c28] text-[8px] font-bold text-zinc-400 rounded px-1 py-0.5 border border-[#2d3042] uppercase focus:outline-none cursor-pointer"
                              >
                                <option value="main">Lead</option>
                                <option value="adlib">Ad-lib</option>
                                <option value="double">Dbl</option>
                                <option value="harmony">Harm</option>
                              </select>
                            )}

                            {/* Delete Track Button */}
                            {project.tracks.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTrack(trk.id);
                                }}
                                className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                                title={`Delete track "${trk.name}"`}
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>

                          {/* Row 2: TRACK VOLUME LEVEL SLIDER & VU METER BAR */}
                          <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[#1d1f2b]">
                            {/* Volume Slider with % readout */}
                            <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <Volume2 size={10} className="text-zinc-500 shrink-0" />
                              <input 
                                type="range"
                                min="0"
                                max="1.5"
                                step="0.05"
                                value={trk.volume}
                                onChange={(e) => onUpdateTrack(trk.id, { volume: Number(e.target.value) })}
                                className="w-12 accent-cyan-400 h-1 bg-[#232533] rounded cursor-pointer"
                                title={`Volume: ${Math.round(trk.volume * 100)}%`}
                              />
                              <span className="text-[8px] font-mono font-bold text-zinc-400 w-5 text-right shrink-0">
                                {Math.round(trk.volume * 100)}%
                              </span>
                            </div>

                            {/* Live LED Level Meter */}
                            <div className="w-1.5 h-3 bg-[#111218] rounded-full overflow-hidden flex flex-col justify-end border border-[#252737] shrink-0">
                              <div 
                                className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all"
                                style={{ height: `${Math.min(100, trackLevel * 100)}%` }}
                              />
                            </div>

                            {/* Arm Button */}
                            {trk.type === 'vocal' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTrack(trk.id, { isArmed: !trk.isArmed });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 transition-all ${
                                  trk.isArmed ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#1d1f2b] text-zinc-400 hover:text-white'
                                }`}
                                title="Arm track for recording"
                              >
                                {trk.isArmed ? 'REC' : 'ARM'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateTrack(trk.id, { isMuted: !trk.isMuted });
                                }}
                                className={`px-1 py-0.5 rounded text-[8px] font-black shrink-0 ${
                                  trk.isMuted ? 'bg-amber-600 text-white' : 'bg-[#1d1f2b] text-zinc-500'
                                }`}
                                title="Mute track"
                              >
                                {trk.isMuted ? 'MUT' : 'M'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: THAT RECORD'S OWN WAVE IN FRONT OF IT */}
                        <div 
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const progress = Math.max(0, Math.min(1, x / rect.width));
                            onSeek(progress * totalDuration);
                            if (clip) setSelectedClipId(clip.id);
                          }}
                          className="flex-1 relative flex items-center bg-[#0d0e14] cursor-pointer overflow-hidden group select-none"
                        >
                          {/* Symmetrical Neon Waveform for this specific track */}
                          <div className="w-full h-full flex items-center justify-center">
                            <NeonMirrorWaveform 
                              color={trk.color || TIMELINE_COLORS[i % TIMELINE_COLORS.length]} 
                              seed={i + 1} 
                              isActive={true} 
                              height={52} 
                              peaks={clip?.peaks}
                            />
                          </div>

                          {/* Clip Name Badge if clip exists */}
                          {clip && (
                            <div className="absolute top-1 left-2 bg-[#12131d]/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-zinc-300 border border-[#27293b] pointer-events-none flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: trk.color }} />
                              <span>{clip.name}</span>
                            </div>
                          )}

                          {/* Prompt if track has no audio yet */}
                          {!clip && trk.type === 'vocal' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 text-[9px] font-bold text-zinc-500">
                              <span>Ready to record vocals</span>
                            </div>
                          )}

                          {/* Red Playhead sweeping across this track's wave */}
                          <div 
                            className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] z-20 pointer-events-none"
                            style={{ left: `${playheadPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Add Record Track & MP3 Import Row */}
                <div className="p-2 bg-[#141520] border-t border-[#232533] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setIsAddRecordModalOpen(true)}
                    className="flex-1 py-2 rounded-xl bg-[#1d1f2d] hover:bg-[#25283a] text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    <Plus size={13} className="text-purple-400" />
                    <span>+ Add Record (Lead / Ad-libs)</span>
                  </button>

                  <button
                    onClick={onImportBeat}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 shrink-0 transition-all active:scale-98"
                    title="Import MP3 audio file"
                  >
                    <Upload size={12} />
                    <span>+ MP3 Beat</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REAL-TIME PITCH CORRECTION */}
          {mobileTab === 'pitch' && (
            <div className="flex flex-col gap-3">
              <PitchCorrectionPanel 
                selectedTrack={selectedTrack}
                onUpdateTrack={onUpdateTrack}
              />
            </div>
          )}

          {/* TAB 3: HARDWARE MIXER CONSOLE */}
          {mobileTab === 'mixer' && (
            <div className="flex flex-col gap-3">
              <div className="bg-[#161720] rounded-2xl border border-[#272938] overflow-hidden">
                <HardwareMixer 
                  tracks={project.tracks}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={onSelectTrack}
                  onUpdateTrackVolume={(id, vol) => onUpdateTrack(id, { volume: vol })}
                  onUpdateTrackPan={(id, pan) => onUpdateTrack(id, { pan: pan })}
                  masterVolume={masterVolume}
                  onUpdateMasterVolume={onUpdateMasterVolume}
                  meterLevels={trackLevels}
                />
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* PERSISTENT BOTTOM MOBILE DOCK (Play, Big Record, Tabs, Export)   */}
        {/* ================================================================ */}
        <nav className="h-20 bg-[#161720] border-t border-[#262835] px-4 flex items-center justify-between shrink-0 z-40 shadow-2xl">
          {/* Quick Play Transport Button */}
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 text-black shadow-lg flex items-center justify-center transition-transform active:scale-95"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-0.5" />}
          </button>

          {/* Navigation Tabs (Studio, Pitch, Mixer) */}
          <div className="flex bg-[#0f1016] rounded-xl p-1 border border-[#242635] text-[10px] font-bold">
            <button
              onClick={() => setMobileTab('studio')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileTab === 'studio' ? 'bg-[#222432] text-white shadow-sm' : 'text-zinc-500'
              }`}
            >
              Studio
            </button>
            <button
              onClick={() => setMobileTab('pitch')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileTab === 'pitch' ? 'bg-amber-500/20 text-amber-300 shadow-sm' : 'text-zinc-500'
              }`}
            >
              Auto-Pitch
            </button>
            <button
              onClick={() => setMobileTab('mixer')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileTab === 'mixer' ? 'bg-[#222432] text-white shadow-sm' : 'text-zinc-500'
              }`}
            >
              Mixer
            </button>
          </div>

          {/* BIG PINNED RECORD BUTTON */}
          <button
            onClick={onToggleRecord}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
              recorderState === RecorderState.RECORDING
                ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.9)] ring-4 ring-rose-600/40'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(225,29,72,0.6)]'
            }`}
            title="Record Vocal"
          >
            <div className={`w-4 h-4 rounded-full ${recorderState === RecorderState.RECORDING ? 'bg-white rounded-sm' : 'bg-white'}`} />
          </button>

          {/* Export Mixdown */}
          <button
            onClick={onOpenExport}
            className="p-2.5 rounded-xl bg-[#222432] hover:bg-zinc-700 text-zinc-300 hover:text-white border border-[#303346]"
            title="Export WAV"
          >
            <Download size={16} />
          </button>
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* 2. DESKTOP WIDESCREEN WORKSTATION (md:flex >= 768px Viewport)       */}
      {/* ==================================================================== */}
      <div className="hidden md:flex flex-1 items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1280px] h-[720px] bg-[#161720] border border-[#272937] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
          
          {/* Top Transport Bar */}
          <header className="h-16 px-6 bg-[#181923] border-b border-[#242633] flex items-center justify-between shrink-0">
            {/* Left: Play/Action Button & BPM Readout & Master Volume */}
            <div className="flex items-center gap-4">
              <button 
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full bg-white hover:bg-zinc-200 text-black shadow-lg flex items-center justify-center transition-transform active:scale-95"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause size={17} fill="black" /> : <Play size={17} fill="black" className="ml-0.5" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-zinc-400">BPM</span>
                <input 
                  type="number"
                  min={50}
                  max={220}
                  value={bpm}
                  onChange={(e) => onBpmChange(Number(e.target.value))}
                  className="w-14 bg-transparent text-sm font-black font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded px-1"
                />
                <button 
                  onClick={() => {
                    onTapTempo();
                    setTapPulse(true);
                    setTimeout(() => setTapPulse(false), 120);
                  }}
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-all ${
                    tapPulse ? 'bg-cyan-400 text-black border-cyan-400' : 'bg-[#222432] text-zinc-400 border-[#303346] hover:text-white'
                  }`}
                >
                  TAP
                </button>
              </div>

              {/* Master Volume on Desktop */}
              <div className="flex items-center gap-2 bg-[#101117] px-3 py-1.5 rounded-xl border border-[#262835]">
                <Volume2 size={13} className="text-purple-400" />
                <span className="text-[10px] font-bold text-zinc-400">MASTER</span>
                <input 
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={masterVolume}
                  onChange={(e) => onUpdateMasterVolume(Number(e.target.value))}
                  className="w-16 accent-purple-500 h-1 bg-[#232534] rounded cursor-pointer"
                  title="Master Volume"
                />
                <span className="text-[10px] font-mono font-bold text-white w-7 text-right">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>

              {/* Import Beat Trigger on Desktop */}
              <button
                onClick={onImportBeat}
                className="px-2.5 py-1 rounded-xl bg-[#222432] hover:bg-[#2b2e3e] text-cyan-400 border border-[#303346] text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Import MP3, WAV or Audio Beat File"
              >
                <Upload size={13} />
                <span>+ Import MP3 Beat</span>
              </button>
            </div>

            {/* Center Pill Capsule Island with Scrubber & Wave Actions */}
            <div className="flex items-center gap-3 bg-[#101117] px-4 py-2 rounded-full border border-[#262835] shadow-inner">
              {/* Transport Nav Icons */}
              <div className="flex items-center gap-2 pr-2 border-r border-[#242635]">
                <button onClick={onTogglePlay} className="text-white hover:text-cyan-400 transition-colors">
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button onClick={onReturnToZero} className="text-zinc-400 hover:text-white transition-colors" title="Return to Zero">
                  <Rewind size={15} fill="currentColor" />
                </button>
              </div>

              {/* Wave Edit Actions: Split, Copy, Duplicate, Cut, Paste */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleTriggerSplit}
                  disabled={!currentClip}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e202c] hover:bg-[#2b2e3e] text-cyan-400 disabled:opacity-40 flex items-center gap-1"
                  title="Split clip at playhead"
                >
                  <Scissors size={11} />
                  <span>Split</span>
                </button>
                <button 
                  onClick={handleTriggerCopy}
                  disabled={!currentClip}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e202c] hover:bg-[#2b2e3e] text-amber-400 disabled:opacity-40 flex items-center gap-1"
                  title="Copy clip"
                >
                  <Copy size={11} />
                  <span>Copy</span>
                </button>
                <button 
                  onClick={handleTriggerCut}
                  disabled={!currentClip}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e202c] hover:bg-[#2b2e3e] text-rose-400 disabled:opacity-40 flex items-center gap-1"
                  title="Cut clip"
                >
                  <Scissors size={11} className="rotate-90" />
                  <span>Cut</span>
                </button>
                <button 
                  onClick={handleTriggerDuplicate}
                  disabled={!currentClip}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1e202c] hover:bg-[#2b2e3e] text-emerald-400 disabled:opacity-40 flex items-center gap-1"
                  title="Duplicate clip"
                >
                  <Plus size={11} />
                  <span>Duplicate</span>
                </button>
                <button 
                  onClick={handleTriggerPaste}
                  disabled={!canPaste}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                    canPaste ? 'bg-purple-600/30 text-purple-300' : 'bg-[#181923] text-zinc-600 opacity-40'
                  }`}
                  title="Paste clip at playhead"
                >
                  <Clipboard size={11} />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* Right Desktop Controls */}
            <div className="flex items-center gap-4">
              {/* Pitch Correction Drawer Toggle Button */}
              <button 
                onClick={() => setShowDesktopPitchDrawer(!showDesktopPitchDrawer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  showDesktopPitchDrawer 
                    ? 'bg-amber-500 text-black shadow-md' 
                    : 'bg-[#222432] text-zinc-300 hover:text-white border border-[#303346]'
                }`}
                title="Open Pitch Correction Rack"
              >
                <Mic2 size={14} className={showDesktopPitchDrawer ? "text-black" : "text-amber-400"} />
                <span>Auto-Pitch</span>
              </button>

              <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs font-bold">
                <Clock size={16} className="text-zinc-400" />
                <span>{timeFormatted}</span>
              </div>

              <button onClick={onOpenProjects} className="text-zinc-400 hover:text-white transition-colors" title="Sessions">
                <Layers size={17} />
              </button>
            </div>
          </header>

          {/* Desktop Main 3-Column Layout */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Left Track Rail (DYNAMIC TRACKS LIST WITH INLINE RENAME, VOLUME LEVEL & ADD RECORD) */}
            <div className="w-60 shrink-0 bg-[#161720] border-r border-[#242633] flex flex-col justify-between select-none">
              <div className="h-10 px-3 flex items-center justify-between border-b border-[#242633] text-[11px] font-bold text-zinc-400">
                <span className="text-zinc-200">Record Tracks</span>
                <button
                  onClick={() => setIsAddRecordModalOpen(true)}
                  className="text-purple-400 hover:text-purple-300 text-[10px] font-bold flex items-center gap-1"
                  title="Add New Record (Lead, Ad-libs)"
                >
                  <Plus size={12} />
                  <span>+ Record</span>
                </button>
              </div>

              {/* Dynamic Tracks List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-1">
                {project.tracks.map((trk) => {
                  const isItemActive = trk.id === selectedTrackId;
                  const isEditing = editingTrackId === trk.id;
                  const trackLevel = trackLevels[trk.id] || 0;

                  return (
                    <div 
                      key={trk.id}
                      onClick={() => onSelectTrack(trk.id)}
                      className={`px-3 py-2 flex flex-col justify-between cursor-pointer transition-colors border-b border-[#1d1f2a]/60 group ${
                        isItemActive ? 'bg-[#20222f]' : 'hover:bg-[#1a1c25]'
                      }`}
                    >
                      {/* Top: Dot + Name + Role */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: trk.isArmed ? '#ef4444' : isItemActive ? '#a855f7' : trk.color,
                              boxShadow: trk.isArmed ? '0 0 8px rgba(239,68,68,0.9)' : isItemActive ? '0 0 6px rgba(168,85,247,0.8)' : 'none'
                            }}
                          >
                            <div className="w-1 h-1 rounded-full bg-white" />
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(trk.id);
                                  if (e.key === 'Escape') setEditingTrackId(null);
                                }}
                                autoFocus
                                className="bg-[#0b0c10] text-xs font-bold text-white px-1.5 py-0.5 rounded border border-purple-500 focus:outline-none w-24"
                              />
                              <button onClick={() => handleSaveRename(trk.id)} className="p-0.5 rounded bg-purple-600 text-white">
                                <Check size={10} />
                              </button>
                              <button onClick={() => setEditingTrackId(null)} className="p-0.5 rounded bg-[#202230] text-zinc-400">
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span 
                                onDoubleClick={() => handleStartRename(trk)}
                                className={`text-xs font-semibold truncate ${
                                  isItemActive ? 'text-white font-bold' : 'text-zinc-400'
                                }`}
                                title="Double-click to rename"
                              >
                                {trk.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(trk);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white p-0.5 transition-opacity"
                                title="Rename Track"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Vocal Role Tag */}
                        {trk.type === 'vocal' && (
                          <select 
                            value={trk.vocalType || 'main'}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newRole = e.target.value as VocalType;
                              onUpdateTrack(trk.id, { 
                                vocalType: newRole,
                                name: newRole === 'main' ? 'Lead Vocal' : newRole === 'adlib' ? 'Ad-libs' : newRole === 'double' ? 'Double Vocal' : 'Harmonies'
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#181923] text-[9px] font-bold text-zinc-400 rounded px-1 py-0.5 border border-[#2b2d3d] uppercase focus:outline-none cursor-pointer"
                          >
                            <option value="main">Lead</option>
                            <option value="adlib">Ad-lib</option>
                            <option value="double">Double</option>
                            <option value="harmony">Harm</option>
                          </select>
                        )}

                        {/* Delete Track Button */}
                        {project.tracks.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTrack(trk.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all shrink-0"
                            title={`Delete track "${trk.name}"`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {/* Bottom: TRACK VOLUME SLIDER, METER, AND ARM/MUTE */}
                      <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1 border-t border-[#1e202c]">
                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <Volume2 size={10} className="text-zinc-500 shrink-0" />
                          <input 
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={trk.volume}
                            onChange={(e) => onUpdateTrack(trk.id, { volume: Number(e.target.value) })}
                            className="w-16 accent-cyan-400 h-1 bg-[#232533] rounded cursor-pointer"
                            title={`Volume: ${Math.round(trk.volume * 100)}%`}
                          />
                          <span className="text-[9px] font-mono font-bold text-zinc-400 w-6 text-right shrink-0">
                            {Math.round(trk.volume * 100)}%
                          </span>
                        </div>

                        {/* Live VU Meter */}
                        <div className="w-1.5 h-3 bg-[#111218] rounded-full overflow-hidden flex flex-col justify-end border border-[#252737] shrink-0">
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all"
                            style={{ height: `${Math.min(100, trackLevel * 100)}%` }}
                          />
                        </div>

                        {/* Arm Button */}
                        {trk.type === 'vocal' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTrack(trk.id, { isArmed: !trk.isArmed });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-all ${
                              trk.isArmed ? 'bg-rose-600 text-white animate-pulse' : 'bg-[#1b1c26] text-zinc-500 hover:text-white'
                            }`}
                            title="Arm for recording"
                          >
                            R
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateTrack(trk.id, { isMuted: !trk.isMuted });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                              trk.isMuted ? 'bg-amber-600 text-white' : 'bg-[#1b1c26] text-zinc-500 hover:text-white'
                            }`}
                            title="Mute"
                          >
                            M
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Record Button in List */}
                <button
                  onClick={() => setIsAddRecordModalOpen(true)}
                  className="w-full py-2.5 px-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-purple-400 hover:bg-[#1a1c26] transition-colors"
                >
                  <Plus size={12} />
                  <span>Add Record (Lead / Ad-libs)</span>
                </button>
              </div>
            </div>

            {/* Center Timeline */}
            <div 
              ref={timelineRef}
              onMouseDown={handleTimelineMouseDown}
              className="flex-1 bg-[#13141c] flex flex-col relative overflow-hidden cursor-pointer select-none"
            >
              <div className="h-8 border-b border-[#222432] relative flex items-end px-2 pointer-events-none">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-start">
                    <div className={`w-px ${i % 4 === 0 ? 'h-3 bg-[#3a3d50]' : 'h-1.5 bg-[#252735]'}`} />
                  </div>
                ))}
              </div>

              {/* Dynamic Waveform Lanes for all project tracks */}
              <div className="flex-1 flex flex-col justify-around py-2 relative divide-y divide-[#1c1e28]/50">
                {project.tracks.slice(0, 5).map((trk, i) => (
                  <div 
                    key={trk.id}
                    onClick={() => {
                      onSelectTrack(trk.id);
                      if (trk.clips[0]) setSelectedClipId(trk.clips[0].id);
                    }}
                    className="flex-1 flex items-center relative overflow-hidden group"
                  >
                    <NeonMirrorWaveform 
                      color={trk.color || TIMELINE_COLORS[i % TIMELINE_COLORS.length]} 
                      seed={i + 1} 
                      isActive={true} 
                      height={68} 
                      peaks={trk.clips[0]?.peaks}
                    />

                    {/* Clip Name Label */}
                    {trk.clips[0] && (
                      <div className="absolute top-1 left-3 bg-[#161722]/85 px-2 py-0.5 rounded text-[9px] font-bold text-zinc-300 border border-[#27293b]">
                        {trk.clips[0].name}
                      </div>
                    )}
                  </div>
                ))}

                {/* Red Playhead Line */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-[#ef4444] z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,1)]"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>
            </div>

            {/* Right Column: Hardware Mixer OR Pitch Correction Drawer */}
            {showDesktopPitchDrawer ? (
              <div className="w-72 shrink-0 bg-[#161720] border-l border-[#242633] p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-[#242633]">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                    <Mic2 size={14} />
                    <span>REAL-TIME PITCH RACK</span>
                  </div>
                  <button 
                    onClick={() => setShowDesktopPitchDrawer(false)}
                    className="text-zinc-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <PitchCorrectionPanel 
                  selectedTrack={selectedTrack}
                  onUpdateTrack={onUpdateTrack}
                />
              </div>
            ) : (
              <HardwareMixer 
                tracks={project.tracks}
                selectedTrackId={selectedTrackId}
                onSelectTrack={onSelectTrack}
                onUpdateTrackVolume={(id, vol) => onUpdateTrack(id, { volume: vol })}
                onUpdateTrackPan={(id, pan) => onUpdateTrack(id, { pan: pan })}
                masterVolume={masterVolume}
                onUpdateMasterVolume={onUpdateMasterVolume}
                meterLevels={trackLevels}
              />
            )}
          </div>

          {/* Desktop Footer Control Strip */}
          <footer className="h-14 px-6 bg-[#181923] border-t border-[#242633] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6 text-zinc-400 text-xs">
              <button 
                onClick={onReturnToZero} 
                className="hover:text-white transition-colors"
                title="Return to Zero (Home)"
              >
                <RotateCcw size={16} />
              </button>
              <button 
                onClick={handleTriggerSplit}
                className="hover:text-white transition-colors flex items-center gap-1 text-xs"
                title="Split at Playhead"
              >
                <Scissors size={15} />
                <span>Split</span>
              </button>

              <button 
                onClick={onImportBeat} 
                className="hover:text-white transition-colors text-xs font-bold flex items-center gap-1 text-cyan-400" 
                title="Import MP3 or Beat"
              >
                <Upload size={13} />
                <span>+ MP3 Beat</span>
              </button>

              <button 
                onClick={onToggleAiPanel}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  isAiPanelOpen ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'hover:text-purple-400'
                }`}
                title="AI Vocal & Mix Assistant"
              >
                <Sparkles size={13} className={isAiPanelOpen ? "text-white" : "text-purple-400"} />
                <span>AI Producer</span>
              </button>
            </div>

            <button 
              onClick={onOpenExport}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs tracking-wider transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>EXPORT</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

// Symmetrical Neon Mirror Waveform Canvas Component
const NeonMirrorWaveform: React.FC<{
  color: string;
  seed: number;
  isActive: boolean;
  height?: number;
  peaks?: number[];
}> = ({ color, seed, isActive, height = 80, peaks }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, width, canvasHeight);

    const numBars = 160;
    const barWidth = width / numBars;
    const midY = canvasHeight / 2;

    ctx.fillStyle = color;

    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      let amp = 0.12;

      if (peaks && peaks.length > 0) {
        const peakIdx = Math.floor((i / numBars) * peaks.length);
        const rawPeak = peaks[peakIdx] || 0;
        amp = Math.min(1, Math.max(0.08, rawPeak * 1.6));
      } else {
        const t = (i / numBars) * Math.PI * 6 + seed;
        const primaryAmp = Math.abs(Math.sin(t) * 0.75 + Math.cos(t * 1.5) * 0.25);
        const microJitter = ((i % 5) * 0.08);
        amp = Math.min(1, Math.max(0.12, primaryAmp + microJitter));
      }

      const barHeight = amp * (canvasHeight * 0.88);

      ctx.fillRect(
        x, 
        midY - barHeight / 2, 
        Math.max(1.8, barWidth - 0.8), 
        barHeight
      );
    }
  }, [color, seed, isActive, peaks]);

  return (
    <div 
      className="w-full flex items-center justify-center relative border-b border-[#1c1e28]/70 px-4"
      style={{ height: `${height}px` }}
    >
      <canvas 
        ref={canvasRef}
        width={960}
        height={height}
        className="w-full h-full object-fill pointer-events-none drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
};
