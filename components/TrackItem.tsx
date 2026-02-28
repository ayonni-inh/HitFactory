import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, QuantizationValue } from '../types';
import { Mic, Music, Trash2, Scissors, Volume2 } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

import { WaveformVisualizer } from './WaveformVisualizer';

interface TrackItemProps {
  track: Track;
  onUpdate: (id: string, updates: Partial<Track>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onSplit?: (id: string, time: number) => void;
  isSelected: boolean;
  currentTime?: number;
  onSeek?: (time: number) => void;
  bpm?: number;
  quantization?: QuantizationValue;
  isRecording?: boolean;
}

export const TrackItem: React.FC<TrackItemProps> = ({ 
  track, onUpdate, onDelete, onSelect, onSplit, isSelected, 
  currentTime = 0, onSeek, bpm = 120, quantization = 'none',
  isRecording = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(track.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'trim-left' | 'trim-right'>('move');
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStartTime, setInitialStartTime] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);

  const PIXELS_PER_SECOND = 50;

  const snapToGrid = (time: number) => {
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
  };

  useEffect(() => {
    if (isEditingName && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
      if (editedName.trim()) {
          onUpdate(track.id, { name: editedName.trim() });
      } else {
          setEditedName(track.name);
      }
      setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleNameSave();
      } else if (e.key === 'Escape') {
          setEditedName(track.name);
          setIsEditingName(false);
      }
  };

  useEffect(() => {
    if (canvasRef.current && track.waveformData.length > 0) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const { width, height } = canvasRef.current;
        ctx.clearRect(0, 0, width, height);
        
        ctx.globalAlpha = isSelected ? 1.0 : 0.6;
        ctx.fillStyle = track.color;
        
        if (track.waveformData.length === 0) {
            ctx.strokeStyle = '#3f3f46';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
        } else {
            const barWidth = width / track.waveformData.length;
            ctx.beginPath();
            for (let i = 0; i < track.waveformData.length; i++) {
              const val = track.waveformData[i];
              const barHeight = Math.max(1, val * height * 0.8);
              ctx.rect(i * barWidth, (height - barHeight) / 2, Math.max(1, barWidth - 1), barHeight);
            }
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }
    }
  }, [track.waveformData, track.color, isSelected]);

  const buffer = audioEngine.getTrackBuffer(track.id);
  const trackDuration = track.duration || buffer?.duration || 1;
  const trackStartTime = track.startTime || 0;
  const trackOffset = track.offset || 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
      const newTime = x / PIXELS_PER_SECOND;
      onSeek?.(newTime);
  };

  const handleDragStart = (e: React.MouseEvent, type: 'move' | 'trim-left' | 'trim-right' = 'move') => {
      if (e.button !== 0) return;
      e.stopPropagation();
      setIsDragging(true);
      setDragType(type);
      setDragStartX(e.clientX);
      setInitialStartTime(track.startTime || 0);
      setInitialDuration(trackDuration);
      setInitialOffset(trackOffset);
      onSelect(track.id);
  };

  useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
          const deltaX = e.clientX - dragStartX;
          const deltaTime = deltaX / PIXELS_PER_SECOND;

          if (dragType === 'move') {
              const rawStartTime = initialStartTime + deltaTime;
              const newStartTime = Math.max(0, snapToGrid(rawStartTime));
              onUpdate(track.id, { startTime: newStartTime });
          } else if (dragType === 'trim-left') {
              const dt = Math.min(deltaTime, initialDuration - 0.1);
              const rawStartTime = initialStartTime + dt;
              const newStartTime = Math.max(0, snapToGrid(rawStartTime));
              
              // Adjust delta based on snapped start time
              const actualDt = newStartTime - initialStartTime;
              const newOffset = Math.max(0, initialOffset + actualDt);
              const newDuration = Math.max(0.1, initialDuration - actualDt);
              
              onUpdate(track.id, { startTime: newStartTime, offset: newOffset, duration: newDuration });
          } else if (dragType === 'trim-right') {
              const rawDuration = initialDuration + deltaTime;
              const totalEndTime = initialStartTime + rawDuration;
              const snappedEndTime = snapToGrid(totalEndTime);
              const newDuration = Math.max(0.1, snappedEndTime - initialStartTime);
              onUpdate(track.id, { duration: newDuration });
          }
      };

      const handleMouseUp = () => {
          setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, dragStartX, initialStartTime, initialDuration, initialOffset, dragType, track.id, onUpdate]);

  const [showFeedback, setShowFeedback] = useState<{ type: 'volume' | 'pan', value: string } | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedbackValue = (type: 'volume' | 'pan', value: string) => {
      setShowFeedback({ type, value });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setShowFeedback(null), 1000);
  };

  const handlePanChange = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newPan = track.pan === 0 ? -1 : (track.pan === -1 ? 1 : 0);
      onUpdate(track.id, { pan: newPan });
      showFeedbackValue('pan', newPan === 0 ? 'Center' : (newPan < 0 ? 'Left' : 'Right'));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      onUpdate(track.id, { volume: vol });
      showFeedbackValue('volume', `${Math.round(vol * 100)}%`);
  };

  return (
    <motion.div 
      layout
      className={`relative flex items-center h-24 mb-1.5 rounded-xl border transition-all ${
        isSelected ? 'bg-studio-900 border-studio-700 shadow-lg' : 'bg-studio-950/40 border-studio-900 hover:border-studio-800'
      }`}
      onClick={() => onSelect(track.id)}
    >
      <AnimatePresence>
        {showFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 right-2 z-30 bg-studio-accent text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg pointer-events-none"
            >
                {showFeedback.type === 'volume' ? 'VOL: ' : 'PAN: '}{showFeedback.value}
            </motion.div>
        )}
      </AnimatePresence>

      {/* Track Controls Left */}
      <div className={`w-56 flex-shrink-0 flex flex-col p-4 border-r border-studio-900 gap-3 sticky left-0 z-30 ${isSelected ? 'bg-studio-900' : 'bg-studio-950'} rounded-l-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-studio-950 border border-studio-800 cursor-pointer hover:border-studio-accent transition-all overflow-hidden"
                onClick={(e) => {
                    e.stopPropagation();
                    colorInputRef.current?.click();
                }}
            >
                {track.isArmed && isRecording ? (
                   <WaveformVisualizer 
                      isActive={true} 
                      audioEngine={audioEngine} 
                      width={32} 
                      height={32} 
                      className="w-full h-full"
                   />
                ) : (
                   track.type === 'beat' ? 
                   <Music size={16} style={{ color: track.color }} /> : 
                   <Mic size={16} style={{ color: track.color }} />
                )}
            </div>
            <input 
                ref={colorInputRef}
                type="color" 
                value={track.color}
                onChange={(e) => onUpdate(track.id, { color: e.target.value })}
                className="hidden"
            />
            <div className="flex flex-col overflow-hidden">
                {isEditingName ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={handleKeyDown}
                        className="text-xs font-black bg-studio-950 text-white border border-studio-accent rounded px-2 py-1 w-full focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span 
                        className="text-xs font-black truncate text-zinc-100 cursor-text hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditedName(track.name);
                            setIsEditingName(true);
                        }}
                    >
                        {track.name.toUpperCase()}
                    </span>
                )}
                <span className="text-[9px] font-black tracking-widest opacity-40 uppercase" style={{ color: track.color }}>
                    {track.vocalType || track.type}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
                onClick={(e) => { e.stopPropagation(); onSplit?.(track.id, currentTime); }}
                className="text-studio-500 hover:text-studio-accent transition-colors p-1.5"
            >
                <Scissors size={12} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
                className="text-studio-800 hover:text-studio-danger transition-colors p-1.5"
            >
                <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(track.id, { isArmed: !track.isArmed }); }}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all border ${track.isArmed ? 'bg-studio-danger border-studio-danger text-white shadow-lg shadow-studio-danger/20' : 'bg-studio-950 border-studio-800 text-studio-500 hover:text-white'}`}
          >
            R
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(track.id, { isMuted: !track.isMuted }); }}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all border ${track.isMuted ? 'bg-studio-800 border-studio-700 text-white' : 'bg-studio-950 border-studio-800 text-studio-500 hover:text-white'}`}
          >
            M
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(track.id, { isSolo: !track.isSolo }); }}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all border ${track.isSolo ? 'bg-studio-warning border-studio-warning text-black shadow-lg shadow-studio-warning/20' : 'bg-studio-950 border-studio-800 text-studio-500 hover:text-white'}`}
          >
            S
          </button>

          <div className="flex-1 flex items-center gap-2 ml-2">
            <Volume2 size={12} className="text-studio-500" />
            <input 
                type="range" min="0" max="1" step="0.01"
                value={track.volume}
                onClick={(e) => e.stopPropagation()}
                onChange={handleVolumeChange}
                className="flex-1 h-1 bg-studio-800 rounded-full appearance-none cursor-pointer accent-studio-accent"
            />
          </div>
        </div>
      </div>

      {/* Waveform Area */}
      <div 
        className="flex-1 h-full relative overflow-hidden cursor-crosshair"
        onClick={handleSeek}
      >
        <motion.div 
            layout
            className={`absolute top-2 bottom-2 rounded-xl border-2 transition-shadow overflow-hidden ${isDragging ? 'shadow-2xl z-30' : 'z-10'}`}
            style={{ 
                left: `${trackStartTime * PIXELS_PER_SECOND}px`, 
                width: `${trackDuration * PIXELS_PER_SECOND}px`,
                backgroundColor: `${track.color}10`,
                borderColor: `${track.color}40`
            }}
            onMouseDown={(e) => handleDragStart(e, 'move')}
            onClick={(e) => e.stopPropagation()}
        >
            <canvas 
                ref={canvasRef} 
                width={trackDuration * PIXELS_PER_SECOND} 
                height={96} 
                className="w-full h-full" 
            />
            
            {/* Trim Handles */}
            <div 
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/10 z-20 flex items-center justify-center"
                onMouseDown={(e) => handleDragStart(e, 'trim-left')}
            >
              <div className="w-1 h-8 bg-white/20 rounded-full" />
            </div>
            <div 
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/10 z-20 flex items-center justify-center"
                onMouseDown={(e) => handleDragStart(e, 'trim-right')}
            >
              <div className="w-1 h-8 bg-white/20 rounded-full" />
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
