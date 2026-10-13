import React, { useRef, useState, useEffect } from 'react';
import { 
  ZoomIn, ZoomOut, Plus, Flag, Trash2, 
  ChevronRight, Scissors, Music, Mic, Upload
} from 'lucide-react';
import { Track, Marker, LoopSettings, QuantizationValue, Take } from '../types';
import { TrackLane } from './TrackLane';
import { TrackHeader } from './TrackHeader';

interface TimelineProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  onDeleteTrack: (id: string) => void;
  onAddTrack: (type: 'vocal' | 'beat') => void;
  currentTime: number;
  onSeek: (time: number) => void;
  bpm: number;
  quantization: QuantizationValue;
  onChangeQuantization: (q: QuantizationValue) => void;
  loopSettings: LoopSettings;
  onChangeLoopSettings: (settings: LoopSettings) => void;
  markers: Marker[];
  onAddMarker: (name: string, time: number) => void;
  onDeleteMarker: (id: string) => void;
  onJumpToMarker: (time: number) => void;
  pixelsPerSecond: number;
  onChangeZoom: (delta: number) => void;
  recordingTrackId: string | null;
  getTrackLevel: (id: string) => number;
  onSplitClip: (trackId: string, clipId: string, time: number) => void;
  onDuplicateClip: (trackId: string, clipId: string) => void;
  onDeleteClip: (trackId: string, clipId: string) => void;
  onSelectTake: (trackId: string, take: Take) => void;
  onDeleteTake: (trackId: string, takeId: string) => void;
  onImportBeatClick: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onUpdateTrack,
  onDeleteTrack,
  onAddTrack,
  currentTime,
  onSeek,
  bpm,
  quantization,
  onChangeQuantization,
  loopSettings,
  onChangeLoopSettings,
  markers,
  onAddMarker,
  onDeleteMarker,
  onJumpToMarker,
  pixelsPerSecond,
  onChangeZoom,
  recordingTrackId,
  getTrackLevel,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onSelectTake,
  onDeleteTake,
  onImportBeatClick
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDraggingLoopStart, setIsDraggingLoopStart] = useState(false);
  const [isDraggingLoopEnd, setIsDraggingLoopEnd] = useState(false);

  // Calculate timeline display duration (at least 60s, or max clip end + 20s)
  let maxDuration = 75;
  tracks.forEach(track => {
    track.clips.forEach(clip => {
      const end = clip.start + clip.duration;
      if (end > maxDuration) maxDuration = end + 15;
    });
  });

  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * 4;
  const totalBars = Math.ceil(maxDuration / secondsPerBar) + 4;

  // Handle ruler click & drag to scrub playhead
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, clickX / pixelsPerSecond);
    onSeek(newTime);
    setIsScrubbing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = Math.max(0, clickX / pixelsPerSecond);
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, pixelsPerSecond, onSeek]);

  // Handle loop banner drag
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingLoopStart && !isDraggingLoopEnd) return;
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const newTime = Math.max(0, (e.clientX - rect.left) / pixelsPerSecond);

      if (isDraggingLoopStart) {
        if (newTime < loopSettings.end - 0.5) {
          onChangeLoopSettings({ ...loopSettings, start: newTime });
        }
      } else if (isDraggingLoopEnd) {
        if (newTime > loopSettings.start + 0.5) {
          onChangeLoopSettings({ ...loopSettings, end: newTime });
        }
      }
    };

    const handleUp = () => {
      setIsDraggingLoopStart(false);
      setIsDraggingLoopEnd(false);
    };

    if (isDraggingLoopStart || isDraggingLoopEnd) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingLoopStart, isDraggingLoopEnd, loopSettings, onChangeLoopSettings, pixelsPerSecond]);

  return (
    <div className="flex-1 flex flex-col bg-studio-950 overflow-hidden relative">
      {/* 1. Timeline Sub-Bar: Zoom, Grid Snap, Add Marker, Add Tracks */}
      <div className="h-10 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          {/* Snap Selector */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-studio-500">Snap:</span>
            <select 
              value={quantization}
              onChange={(e) => onChangeQuantization(e.target.value as QuantizationValue)}
              className="bg-studio-950 text-xs font-bold text-white rounded px-2 py-0.5 border border-studio-800 focus:outline-none cursor-pointer"
            >
              <option value="none">Off (Free)</option>
              <option value="1/4">1/4 Bar</option>
              <option value="1/8">1/8 Bar</option>
              <option value="1/16">1/16 Bar</option>
              <option value="1/32">1/32 Bar</option>
            </select>
          </div>

          <div className="w-px h-4 bg-studio-800" />

          {/* Quick Marker Button */}
          <button 
            onClick={() => {
              const name = prompt("Marker Name (e.g. Intro, Verse 1, Hook):", "Hook");
              if (name) onAddMarker(name, currentTime);
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-studio-800 border border-studio-800"
            title="Drop named marker at playhead"
          >
            <Flag size={11} className="text-studio-accent" />
            <span>+ Marker</span>
          </button>
        </div>

        {/* Zoom Controls & Track Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-studio-950 rounded-lg border border-studio-800 p-0.5">
            <button 
              onClick={() => onChangeZoom(-10)}
              className="p-1 hover:text-white text-zinc-400 hover:bg-studio-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[9px] font-mono font-bold text-studio-500 px-1.5">
              {Math.round(pixelsPerSecond)}px
            </span>
            <button 
              onClick={() => onChangeZoom(15)}
              className="p-1 hover:text-white text-zinc-400 hover:bg-studio-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="w-px h-4 bg-studio-800" />

          {/* Import Beat Button */}
          <button 
            onClick={onImportBeatClick}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-300 hover:text-white bg-studio-800 hover:bg-studio-700 border border-studio-700 flex items-center gap-1.5 transition-all"
            title="Import Instrumental / Beat Audio"
          >
            <Upload size={13} />
            <span>Import Beat</span>
          </button>

          {/* Add Vocal Track */}
          <button 
            onClick={() => onAddTrack('vocal')}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-studio-accent hover:bg-studio-accentHover flex items-center gap-1.5 transition-all shadow-md shadow-studio-accent/20"
            title="Add Vocal Track"
          >
            <Plus size={14} />
            <span>Add Vocal</span>
          </button>
        </div>
      </div>

      {/* 2. Main Timeline Split View: Left Track Headers (w-64) + Right Scrollable Lanes */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Rail: Track Headers */}
        <div className="w-64 shrink-0 bg-studio-950 border-r border-studio-800 flex flex-col z-20 shadow-lg">
          {/* Header spacer to match ruler height */}
          <div className="h-14 bg-studio-950 border-b border-studio-800 px-3 flex items-center justify-between text-[10px] font-mono font-black text-studio-500 uppercase tracking-wider">
            <span>TRACK CHANNELS</span>
            <span>{tracks.length} ACTIVE</span>
          </div>

          {/* List of Track Headers */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {tracks.map(track => (
              <TrackHeader 
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => onSelectTrack(track.id)}
                onUpdate={(updates) => onUpdateTrack(track.id, updates)}
                onDelete={() => onDeleteTrack(track.id)}
                meterLevel={getTrackLevel(track.id)}
                isRecordingActive={recordingTrackId === track.id}
              />
            ))}

            {/* Quick Add Vocal button at bottom of rail */}
            <button 
              onClick={() => onAddTrack('vocal')}
              className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-studio-500 hover:text-studio-accent border-b border-studio-900 hover:bg-studio-900/40 transition-colors"
            >
              <Plus size={13} />
              <span>Add Vocal Track</span>
            </button>
          </div>
        </div>

        {/* Right Area: Scrollable Time Ruler + Track Lanes + Playhead */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-studio-950/70"
        >
          {/* Scrollable Timeline Canvas Container */}
          <div 
            className="relative"
            style={{ width: `${Math.max(1200, maxDuration * pixelsPerSecond)}px` }}
          >
            {/* Interactive Time Ruler & Marker Track */}
            <div 
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              className="h-14 bg-studio-950 border-b border-studio-800 sticky top-0 z-30 cursor-pointer select-none overflow-hidden"
            >
              {/* Loop Region Highlight Banner */}
              {loopSettings.enabled && (
                <div 
                  className="absolute top-0 bottom-0 bg-studio-accent/20 border-x-2 border-studio-accent z-10 pointer-events-none"
                  style={{
                    left: `${loopSettings.start * pixelsPerSecond}px`,
                    width: `${Math.max(10, (loopSettings.end - loopSettings.start) * pixelsPerSecond)}px`
                  }}
                >
                  <div className="text-[8px] font-mono font-bold text-studio-accent px-1">
                    LOOP REGION
                  </div>
                </div>
              )}

              {/* Loop Start Handle */}
              {loopSettings.enabled && (
                <div 
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingLoopStart(true); }}
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-20 flex items-center justify-center"
                  style={{ left: `${loopSettings.start * pixelsPerSecond}px` }}
                >
                  <div className="w-1.5 h-full bg-studio-accent rounded-l" />
                </div>
              )}

              {/* Loop End Handle */}
              {loopSettings.enabled && (
                <div 
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingLoopEnd(true); }}
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-20 flex items-center justify-center"
                  style={{ left: `${loopSettings.end * pixelsPerSecond}px` }}
                >
                  <div className="w-1.5 h-full bg-studio-accent rounded-r" />
                </div>
              )}

              {/* Marker Flags Row */}
              <div className="h-5 flex items-center relative border-b border-studio-800/60 px-1">
                {markers.map(marker => (
                  <div 
                    key={marker.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToMarker(marker.time);
                    }}
                    className="absolute top-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      left: `${marker.time * pixelsPerSecond}px`,
                      backgroundColor: marker.color
                    }}
                    title={`Jump to ${marker.name} (${marker.time.toFixed(1)}s)`}
                  >
                    <Flag size={9} />
                    <span>{marker.name}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarker(marker.id);
                      }}
                      className="ml-1 text-white/70 hover:text-white"
                      title="Delete marker"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Bars & Beats Ruler Hashmarks */}
              <div className="h-9 relative flex items-end pb-1 font-mono text-[9px] text-studio-500 font-bold">
                {Array.from({ length: totalBars }).map((_, barIdx) => {
                  const barTime = barIdx * secondsPerBar;
                  const barLeft = barTime * pixelsPerSecond;

                  return (
                    <div 
                      key={barIdx} 
                      className="absolute bottom-0 flex flex-col justify-end pointer-events-none"
                      style={{ left: `${barLeft}px` }}
                    >
                      <span className="text-[9px] pl-1 text-zinc-400 font-black">
                        {barIdx + 1}
                      </span>
                      {/* Bar Mark line */}
                      <div className="w-px h-3.5 bg-studio-700" />

                      {/* Sub-beat marks */}
                      <div className="absolute left-0 bottom-0 flex">
                        {Array.from({ length: 3 }).map((_, beatIdx) => (
                          <div 
                            key={beatIdx} 
                            className="w-px h-1.5 bg-studio-800/80 absolute bottom-0"
                            style={{ left: `${(beatIdx + 1) * secondsPerBeat * pixelsPerSecond}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Track Lanes */}
            <div className="relative">
              {/* Background Grid Lines across all tracks */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {Array.from({ length: totalBars }).map((_, barIdx) => (
                  <div 
                    key={barIdx}
                    className="absolute top-0 bottom-0 w-px bg-studio-900"
                    style={{ left: `${barIdx * secondsPerBar * pixelsPerSecond}px` }}
                  />
                ))}
              </div>

              {/* Tracks */}
              {tracks.map(track => (
                <TrackLane 
                  key={track.id}
                  track={track}
                  pixelsPerSecond={pixelsPerSecond}
                  timelineDuration={maxDuration}
                  currentTime={currentTime}
                  bpm={bpm}
                  quantization={quantization}
                  isSelected={selectedTrackId === track.id}
                  onSelect={() => onSelectTrack(track.id)}
                  onUpdateTrack={(updates) => onUpdateTrack(track.id, updates)}
                  onSplitClip={(clipId, splitTime) => onSplitClip(track.id, clipId, splitTime)}
                  onDuplicateClip={(clipId) => onDuplicateClip(track.id, clipId)}
                  onDeleteClip={(clipId) => onDeleteClip(track.id, clipId)}
                  onSelectTake={(take) => onSelectTake(track.id, take)}
                  onDeleteTake={(takeId) => onDeleteTake(track.id, takeId)}
                  isRecordingThisTrack={recordingTrackId === track.id}
                />
              ))}
            </div>

            {/* Glowing Red Vertical Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-rose-500 z-40 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.9)]"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
            >
              {/* Playhead Head Marker */}
              <div className="w-3.5 h-3.5 -ml-[6px] bg-rose-500 transform rotate-45 rounded-sm shadow-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
