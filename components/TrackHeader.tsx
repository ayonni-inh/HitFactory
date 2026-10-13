import React, { useState } from 'react';
import { 
  Mic, Music, Volume2, VolumeX, Trash2, 
  ChevronDown, ChevronRight, Layers, Sliders
} from 'lucide-react';
import { Track, VocalType } from '../types';

interface TrackHeaderProps {
  track: Track;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Track>) => void;
  onDelete: () => void;
  meterLevel: number;
  isRecordingActive: boolean;
}

const VOCAL_TYPES: VocalType[] = ['main', 'adlib', 'double', 'harmony', 'backing'];

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  meterLevel,
  isRecordingActive
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(track.name);

  const handleNameBlur = () => {
    if (nameInput.trim()) {
      onUpdate({ name: nameInput.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div 
      onClick={onSelect}
      className={`h-28 border-b border-studio-800 p-2.5 flex flex-col justify-between transition-all cursor-pointer relative select-none ${
        isSelected 
          ? 'bg-studio-900 border-l-4' 
          : 'bg-studio-950/80 hover:bg-studio-900/50 border-l-4 border-l-transparent'
      }`}
      style={{ borderLeftColor: isSelected ? track.color : undefined }}
    >
      {/* 1. Track Name & Controls Bar */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Track Type Icon */}
          <div 
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${track.color}25`, color: track.color }}
          >
            {track.type === 'beat' ? <Music size={11} /> : <Mic size={11} />}
          </div>

          {/* Track Name */}
          {isEditingName ? (
            <input 
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
              autoFocus
              className="bg-studio-950 text-xs font-bold text-white px-1.5 py-0.5 rounded border border-studio-accent w-28 focus:outline-none"
            />
          ) : (
            <span 
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
              className="text-xs font-bold text-zinc-200 truncate hover:text-white"
              title="Double click to rename"
            >
              {track.name}
            </span>
          )}
        </div>

        {/* Vocal Subtype Selector */}
        {track.type === 'vocal' && (
          <select 
            value={track.vocalType || 'main'}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate({ vocalType: e.target.value as VocalType });
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-studio-900 text-[9px] font-bold text-studio-400 rounded px-1 py-0.5 border border-studio-800 uppercase focus:outline-none"
          >
            {VOCAL_TYPES.map(vt => (
              <option key={vt} value={vt}>{vt}</option>
            ))}
          </select>
        )}

        {/* Delete Track button (allow deletion of non-beat tracks, or beats if desired) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-studio-600 hover:text-rose-500 p-0.5 rounded transition-colors"
          title="Delete Track"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* 2. Arm, Mute, Solo, and Takes Indicator */}
      <div className="flex items-center justify-between gap-1 mt-1">
        <div className="flex items-center gap-1">
          {/* Arm Button */}
          {track.type === 'vocal' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ isArmed: !track.isArmed });
              }}
              className={`w-6 h-6 rounded text-[10px] font-black transition-all flex items-center justify-center ${
                track.isArmed 
                  ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse' 
                  : 'bg-studio-900 text-studio-500 hover:text-rose-400 border border-studio-800'
              }`}
              title="Arm Track for Recording (R)"
            >
              R
            </button>
          )}

          {/* Mute Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isMuted: !track.isMuted });
            }}
            className={`w-6 h-6 rounded text-[10px] font-black transition-all flex items-center justify-center ${
              track.isMuted 
                ? 'bg-amber-500 text-black shadow-sm' 
                : 'bg-studio-900 text-studio-500 hover:text-amber-400 border border-studio-800'
            }`}
            title="Mute Track (M)"
          >
            M
          </button>

          {/* Solo Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isSolo: !track.isSolo });
            }}
            className={`w-6 h-6 rounded text-[10px] font-black transition-all flex items-center justify-center ${
              track.isSolo 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'bg-studio-900 text-studio-500 hover:text-blue-400 border border-studio-800'
            }`}
            title="Solo Track (S)"
          >
            S
          </button>

          {/* Take Lanes Toggle */}
          {track.takes && track.takes.length > 0 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ showTakeLanes: !track.showTakeLanes });
              }}
              className={`px-1.5 h-6 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                track.showTakeLanes 
                  ? 'bg-studio-accent text-white' 
                  : 'bg-studio-900 text-studio-400 border border-studio-800'
              }`}
              title="Toggle Take Lanes & Comping"
            >
              <Layers size={10} />
              <span>{track.takes.length}</span>
            </button>
          )}
        </div>

        {/* Live VU Meter Bar */}
        <div className="w-16 h-2 bg-studio-950 rounded-full overflow-hidden flex border border-studio-800">
          <div 
            className={`h-full transition-all duration-75 ${
              meterLevel > 0.85 ? 'bg-rose-500' : meterLevel > 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, meterLevel * 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Volume Fader & Pan Sliders */}
      <div className="flex items-center gap-2 mt-1">
        {/* Pan */}
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[8px] font-mono font-bold text-studio-500 w-3">
            {track.pan < -0.05 ? 'L' : track.pan > 0.05 ? 'R' : 'C'}
          </span>
          <input 
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={track.pan}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate({ pan: parseFloat(e.target.value) })}
            className="w-full h-1 bg-studio-800 rounded-lg appearance-none cursor-pointer"
            title={`Pan: ${Math.round(track.pan * 100)}%`}
          />
        </div>

        {/* Volume Fader */}
        <div className="flex items-center gap-1 flex-1">
          <input 
            type="range"
            min={0}
            max={1.5}
            step={0.02}
            value={track.volume}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
            className="w-full h-1 bg-studio-800 rounded-lg appearance-none cursor-pointer"
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
          <span className="text-[8px] font-mono text-zinc-400 w-6 text-right">
            {Math.round(track.volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
