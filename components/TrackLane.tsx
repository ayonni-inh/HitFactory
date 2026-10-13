import React, { useRef, useState, useEffect } from 'react';
import { Clip, Take, Track, QuantizationValue } from '../types';
import { Scissors, Copy, Trash2, Volume2, VolumeX, RotateCcw, Star, Play, Check } from 'lucide-react';

interface TrackLaneProps {
  track: Track;
  pixelsPerSecond: number;
  timelineDuration: number;
  currentTime: number;
  bpm: number;
  quantization: QuantizationValue;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTrack: (updates: Partial<Track>) => void;
  onSplitClip: (clipId: string, splitProjectTime: number) => void;
  onDuplicateClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onSelectTake: (take: Take) => void;
  onDeleteTake: (takeId: string) => void;
  isRecordingThisTrack: boolean;
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  pixelsPerSecond,
  timelineDuration,
  currentTime,
  bpm,
  quantization,
  isSelected,
  onSelect,
  onUpdateTrack,
  onSplitClip,
  onDuplicateClip,
  onDeleteClip,
  onSelectTake,
  onDeleteTake,
  isRecordingThisTrack
}) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Dragging interaction state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'trim-left' | 'trim-right' | 'fade-in' | 'fade-out';
    clipId: string;
    startX: number;
    initialStart: number;
    initialDuration: number;
    initialOffset: number;
    initialFadeIn: number;
    initialFadeOut: number;
  } | null>(null);

  // Snap calculation
  const snapTime = (time: number): number => {
    if (quantization === 'none') return Math.max(0, time);
    const beatSec = 60 / bpm;
    let div = beatSec;
    switch (quantization) {
      case '1/4': div = beatSec; break;
      case '1/8': div = beatSec / 2; break;
      case '1/16': div = beatSec / 4; break;
      case '1/32': div = beatSec / 8; break;
    }
    return Math.max(0, Math.round(time / div) * div);
  };

  // Mouse move & mouse up listeners for clip dragging
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX / pixelsPerSecond;

      const updatedClips = track.clips.map(clip => {
        if (clip.id !== dragState.clipId) return clip;

        if (dragState.type === 'move') {
          const newStart = snapTime(dragState.initialStart + deltaTime);
          return { ...clip, start: newStart };
        } else if (dragState.type === 'trim-left') {
          const newStart = snapTime(dragState.initialStart + deltaTime);
          const timeShift = newStart - dragState.initialStart;
          const newDuration = Math.max(0.1, dragState.initialDuration - timeShift);
          const newOffset = Math.max(0, dragState.initialOffset + timeShift);
          return { ...clip, start: newStart, duration: newDuration, offset: newOffset };
        } else if (dragState.type === 'trim-right') {
          const rawDuration = dragState.initialDuration + deltaTime;
          const newDuration = Math.max(0.1, snapTime(dragState.initialStart + rawDuration) - dragState.initialStart);
          return { ...clip, duration: newDuration };
        } else if (dragState.type === 'fade-in') {
          const newFadeIn = Math.max(0, Math.min(clip.duration * 0.5, dragState.initialFadeIn + deltaTime));
          return { ...clip, fadeIn: newFadeIn };
        } else if (dragState.type === 'fade-out') {
          const newFadeOut = Math.max(0, Math.min(clip.duration * 0.5, dragState.initialFadeOut - deltaTime));
          return { ...clip, fadeOut: newFadeOut };
        }
        return clip;
      });

      onUpdateTrack({ clips: updatedClips });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pixelsPerSecond, quantization, bpm, track.clips, onUpdateTrack]);

  return (
    <div 
      ref={laneRef}
      onClick={onSelect}
      className={`h-28 border-b border-studio-800/80 relative flex items-center transition-colors ${
        isSelected ? 'bg-studio-900/30' : 'bg-transparent'
      }`}
      style={{ width: `${Math.max(1000, timelineDuration * pixelsPerSecond)}px` }}
    >
      {/* Live Recording Waveform Pulse on Lane */}
      {isRecordingThisTrack && (
        <div 
          className="absolute top-0 bottom-0 bg-rose-600/15 border-y border-rose-500/40 z-10 flex items-center px-4 animate-pulse"
          style={{
            left: `${currentTime * pixelsPerSecond}px`,
            width: '240px'
          }}
        >
          <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">
            ● RECORDING VOCAL...
          </span>
        </div>
      )}

      {/* Render Audio Clips */}
      {track.clips.map(clip => {
        const clipLeft = clip.start * pixelsPerSecond;
        const clipWidth = Math.max(20, clip.duration * pixelsPerSecond);
        const isClipSelected = selectedClipId === clip.id;

        return (
          <div
            key={clip.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClipId(clip.id);
              onSelect();
            }}
            className={`absolute h-24 top-2 rounded-lg overflow-hidden cursor-move border transition-all group ${
              isClipSelected 
                ? 'border-white shadow-xl ring-2 ring-white/30 z-20' 
                : 'border-studio-700/80 hover:border-zinc-400 z-10'
            }`}
            style={{
              left: `${clipLeft}px`,
              width: `${clipWidth}px`,
              backgroundColor: `${track.color}18`
            }}
            onMouseDown={(e) => {
              // Left click to start move
              if (e.button === 0 && !(e.target as HTMLElement).dataset.handle) {
                setDragState({
                  type: 'move',
                  clipId: clip.id,
                  startX: e.clientX,
                  initialStart: clip.start,
                  initialDuration: clip.duration,
                  initialOffset: clip.offset,
                  initialFadeIn: clip.fadeIn,
                  initialFadeOut: clip.fadeOut
                });
              }
            }}
          >
            {/* Clip Header Bar */}
            <div 
              className="h-5 px-2 flex items-center justify-between text-[9px] font-bold text-white select-none border-b border-black/20"
              style={{ backgroundColor: `${track.color}cc` }}
            >
              <span className="truncate max-w-[120px]">{clip.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Reverse Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = track.clips.map(c => c.id === clip.id ? { ...c, isReversed: !c.isReversed } : c);
                    onUpdateTrack({ clips: updated });
                  }}
                  className={`p-0.5 rounded ${clip.isReversed ? 'bg-amber-500 text-black' : 'hover:bg-black/20'}`}
                  title="Reverse Audio"
                >
                  <RotateCcw size={10} />
                </button>

                {/* Split at Playhead */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplitClip(clip.id, currentTime);
                  }}
                  className="p-0.5 rounded hover:bg-black/20"
                  title="Split at Playhead (S)"
                >
                  <Scissors size={10} />
                </button>

                {/* Duplicate */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateClip(clip.id);
                  }}
                  className="p-0.5 rounded hover:bg-black/20"
                  title="Duplicate Clip (D)"
                >
                  <Copy size={10} />
                </button>

                {/* Delete */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClip(clip.id);
                  }}
                  className="p-0.5 rounded hover:bg-rose-600"
                  title="Delete Clip (Del)"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>

            {/* Waveform Canvas */}
            <div className="w-full h-[calc(100%-20px)] relative flex items-center justify-center p-1">
              <ClipWaveform 
                peaks={clip.peaks} 
                color={track.color} 
                isReversed={clip.isReversed}
                fadeInWidth={clip.fadeIn * pixelsPerSecond}
                fadeOutWidth={clip.fadeOut * pixelsPerSecond}
                clipWidth={clipWidth}
              />
            </div>

            {/* Left Trim Handle */}
            <div 
              data-handle="trim-left"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragState({
                  type: 'trim-left',
                  clipId: clip.id,
                  startX: e.clientX,
                  initialStart: clip.start,
                  initialDuration: clip.duration,
                  initialOffset: clip.offset,
                  initialFadeIn: clip.fadeIn,
                  initialFadeOut: clip.fadeOut
                });
              }}
              className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-white/0 hover:bg-white/40 cursor-w-resize transition-all z-20"
              title="Drag to trim start"
            />

            {/* Right Trim Handle */}
            <div 
              data-handle="trim-right"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDragState({
                  type: 'trim-right',
                  clipId: clip.id,
                  startX: e.clientX,
                  initialStart: clip.start,
                  initialDuration: clip.duration,
                  initialOffset: clip.offset,
                  initialFadeIn: clip.fadeIn,
                  initialFadeOut: clip.fadeOut
                });
              }}
              className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 bg-white/0 hover:bg-white/40 cursor-e-resize transition-all z-20"
              title="Drag to trim end"
            />
          </div>
        );
      })}

      {/* Expanded Take Lanes for Comping */}
      {track.showTakeLanes && track.takes && track.takes.length > 0 && (
        <div className="absolute left-0 right-0 top-full bg-studio-950/95 border-b border-studio-800 z-30 p-2 flex flex-col gap-1.5 shadow-2xl">
          <div className="flex items-center justify-between text-[10px] font-bold text-studio-400 px-2 pb-1 border-b border-studio-800">
            <span>TAKE LANES (COMPING)</span>
            <span>Click Star to promote take to Main Vocal Clip</span>
          </div>
          {track.takes.map((take) => (
            <div 
              key={take.id} 
              className="flex items-center justify-between bg-studio-900 px-3 py-1.5 rounded-lg border border-studio-800 hover:border-studio-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white font-mono">Take #{take.takeNumber}</span>
                <span className="text-[9px] text-studio-500 font-mono">
                  {take.duration.toFixed(1)}s @ {take.startTime.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTake(take);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 transition-all ${
                    take.isSelected 
                      ? 'bg-amber-500 text-black' 
                      : 'bg-studio-800 text-studio-400 hover:text-white'
                  }`}
                  title="Promote Take to active timeline clip"
                >
                  <Star size={11} fill={take.isSelected ? "currentColor" : "none"} />
                  <span>{take.isSelected ? 'ACTIVE TAKE' : 'COMP TO TRACK'}</span>
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTake(take.id);
                  }}
                  className="text-studio-600 hover:text-rose-500 p-1"
                  title="Delete Take"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Canvas Waveform Renderer with Fade Slopes
const ClipWaveform: React.FC<{
  peaks: number[];
  color: string;
  isReversed: boolean;
  fadeInWidth: number;
  fadeOutWidth: number;
  clipWidth: number;
}> = ({ peaks, color, isReversed, fadeInWidth, fadeOutWidth, clipWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) {
      ctx.strokeStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const data = isReversed ? [...peaks].reverse() : peaks;
    const barWidth = Math.max(1.5, width / data.length);
    const midY = height / 2;

    ctx.fillStyle = color;

    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth;
      const amp = Math.min(1, Math.max(0.04, data[i]));
      const barHeight = amp * (height * 0.85);

      // Fade factor
      let fadeMultiplier = 1.0;
      if (fadeInWidth > 0 && x < fadeInWidth) {
        fadeMultiplier = x / fadeInWidth;
      } else if (fadeOutWidth > 0 && x > width - fadeOutWidth) {
        fadeMultiplier = Math.max(0, (width - x) / fadeOutWidth);
      }

      const finalHeight = barHeight * fadeMultiplier;
      ctx.fillRect(x, midY - finalHeight / 2, Math.max(1, barWidth - 0.5), finalHeight);
    }
  }, [peaks, color, isReversed, fadeInWidth, fadeOutWidth, clipWidth]);

  return (
    <canvas 
      ref={canvasRef} 
      width={Math.max(100, Math.floor(clipWidth))} 
      height={64} 
      className="w-full h-full object-fill pointer-events-none"
    />
  );
};
