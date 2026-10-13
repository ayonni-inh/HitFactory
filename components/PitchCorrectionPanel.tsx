import React from 'react';
import { Mic2, Zap, Sparkles, Check, Volume2 } from 'lucide-react';
import { Track } from '../types';
import { Knob } from './Knob';

interface PitchCorrectionPanelProps {
  selectedTrack: Track | null;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  className?: string;
}

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MUSICAL_SCALES = [
  { id: 'minor', label: 'Natural Minor' },
  { id: 'major', label: 'Major' },
  { id: 'chromatic', label: 'Chromatic' },
  { id: 'pentatonic', label: 'Pentatonic' },
  { id: 'dorian', label: 'Dorian' }
];

interface TunePreset {
  name: string;
  speed: number;
  amount: number;
  description: string;
}

const TUNE_PRESETS: TunePreset[] = [
  { name: 'Hard Snap (Trap)', speed: 0, amount: 100, description: '0ms instant snap for Travis/Drill vocals' },
  { name: 'Radio Pop', speed: 20, amount: 85, description: 'Polished modern pitch correction' },
  { name: 'Natural Soul', speed: 55, amount: 65, description: 'Subtle humanized pitch assistance' }
];

export const PitchCorrectionPanel: React.FC<PitchCorrectionPanelProps> = ({
  selectedTrack,
  onUpdateTrack,
  className = ''
}) => {
  if (!selectedTrack) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center text-zinc-500 bg-[#161720] rounded-2xl border border-[#262835] ${className}`}>
        <Mic2 size={32} className="mb-2 text-zinc-600" />
        <p className="text-sm font-bold text-zinc-300">No Vocal Track Selected</p>
        <p className="text-xs text-zinc-500 mt-1">Select a vocal track on the timeline to configure real-time pitch correction.</p>
      </div>
    );
  }

  const autotune = selectedTrack.effects.autotune;

  const handleUpdateAutotune = (patch: Partial<Track['effects']['autotune']>) => {
    onUpdateTrack(selectedTrack.id, {
      effects: {
        ...selectedTrack.effects,
        autotune: {
          ...selectedTrack.effects.autotune,
          ...patch
        }
      }
    });
  };

  return (
    <div className={`bg-[#161720] rounded-2xl border border-[#272938] p-4 flex flex-col gap-4 shadow-xl select-none ${className}`}>
      {/* Header with Power Toggle */}
      <div className="flex items-center justify-between border-b border-[#242635] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mic2 size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider text-white uppercase">Real-Time Pitch Correction</h3>
            <span className="text-[9px] text-zinc-500 font-medium">Channel: {selectedTrack.name}</span>
          </div>
        </div>

        {/* Master Power Toggle Button */}
        <button
          onClick={() => handleUpdateAutotune({ enabled: !autotune.enabled })}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all ${
            autotune.enabled 
              ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
              : 'bg-[#222432] text-zinc-500 hover:text-zinc-300 border border-[#2d3040]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autotune.enabled ? 'bg-black' : 'bg-zinc-600'}`} />
          <span>{autotune.enabled ? 'PITCH ON' : 'BYPASS'}</span>
        </button>
      </div>

      {/* Musical Key and Scale Dropdowns */}
      <div className="grid grid-cols-2 gap-3 bg-[#111218] p-3 rounded-xl border border-[#222432]">
        {/* Key Selector */}
        <div>
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
            Root Musical Key
          </label>
          <select
            value={autotune.key}
            onChange={(e) => handleUpdateAutotune({ key: e.target.value })}
            className="w-full bg-[#1c1d27] text-sm font-black font-mono text-amber-400 rounded-lg p-2 border border-[#2d3042] focus:outline-none focus:border-amber-400"
          >
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k} Key
              </option>
            ))}
          </select>
        </div>

        {/* Scale Selector */}
        <div>
          <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
            Scale Mode
          </label>
          <select
            value={autotune.scale}
            onChange={(e) => handleUpdateAutotune({ scale: e.target.value as any })}
            className="w-full bg-[#1c1d27] text-xs font-bold text-zinc-200 rounded-lg p-2 border border-[#2d3042] focus:outline-none focus:border-amber-400 uppercase"
          >
            {MUSICAL_SCALES.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compact Rotary Knobs: Retune Speed, Correction Depth, and Smoothness */}
      <div className="bg-[#111218] p-3.5 rounded-xl border border-[#222432] flex justify-around items-center">
        <Knob
          label="Retune Speed"
          value={autotune.speed}
          min={0}
          max={100}
          onChange={(v) => handleUpdateAutotune({ speed: v })}
          color="text-amber-400"
          size={46}
        />

        <div className="h-10 w-px bg-[#242635]" />

        <Knob
          label="Correction %"
          value={autotune.amount}
          min={0}
          max={100}
          onChange={(v) => handleUpdateAutotune({ amount: v })}
          color="text-amber-400"
          size={46}
        />
      </div>

      {/* Fast Tuning Style Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">
          Vocal Tuning Presets
        </span>
        <div className="grid grid-cols-3 gap-2">
          {TUNE_PRESETS.map((preset) => {
            const isMatch = autotune.speed === preset.speed && autotune.amount === preset.amount;
            return (
              <button
                key={preset.name}
                onClick={() => handleUpdateAutotune({ speed: preset.speed, amount: preset.amount, enabled: true })}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isMatch
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                    : 'bg-[#181924] border-[#252736] text-zinc-400 hover:text-white hover:bg-[#202230]'
                }`}
              >
                <div className="text-[10px] font-bold text-white truncate">{preset.name}</div>
                <div className="text-[8px] font-mono text-zinc-500 mt-0.5">{preset.speed}ms Speed</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
