import React, { useState } from 'react';
import { 
  Sliders, Mic2, Activity, Zap, Radio, 
  Volume2, Layers, Check, Sparkles, Waves
} from 'lucide-react';
import { 
  Track, MasteringSettings, ReverbBusSettings, 
  DelayBusSettings, VocalType 
} from '../types';
import { Knob } from './Knob';

interface TrackInspectorProps {
  selectedTrack: Track | null;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  masteringSettings: MasteringSettings;
  onUpdateMastering: (settings: MasteringSettings) => void;
  reverbBus: ReverbBusSettings;
  onUpdateReverbBus: (settings: ReverbBusSettings) => void;
  delayBus: DelayBusSettings;
  onUpdateDelayBus: (settings: DelayBusSettings) => void;
  bpm: number;
}

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface VocalPreset {
  name: string;
  description: string;
  effects: Partial<Track['effects']>;
}

const VOCAL_PRESETS: VocalPreset[] = [
  {
    name: 'Radio Pop Modern',
    description: 'Crisp air boost, controlled optical compression, smooth plate reverb',
    effects: {
      eq: { enabled: true, low: -3, lowMid: -1, highMid: 2.5, high: 4 },
      compression: { enabled: true, threshold: -18, ratio: 4, attack: 0.012, release: 0.16, makeup: 2 },
      deesser: { enabled: true, frequency: 6500, threshold: -20, amount: 65 },
      reverbSend: 0.22,
      delaySend: 0.12,
      saturation: { enabled: true, drive: 22, warmth: 30 },
      autotune: { enabled: true, key: 'C', scale: 'minor', speed: 35, amount: 85 }
    }
  },
  {
    name: 'Hard Auto-Tune Trap',
    description: 'Instant 0ms retune snap, aggressive 6:1 glue, tape warmth',
    effects: {
      eq: { enabled: true, low: -4, lowMid: 0, highMid: 3, high: 5 },
      compression: { enabled: true, threshold: -24, ratio: 6, attack: 0.005, release: 0.12, makeup: 4 },
      deesser: { enabled: true, frequency: 7000, threshold: -24, amount: 80 },
      reverbSend: 0.35,
      delaySend: 0.28,
      saturation: { enabled: true, drive: 45, warmth: 50 },
      autotune: { enabled: true, key: 'C#', scale: 'minor', speed: 0, amount: 100 }
    }
  },
  {
    name: 'Ethereal Space & Reverb',
    description: 'Lush 4s decay hall reverb, dotted-eighth stereo echo, scooped mids',
    effects: {
      eq: { enabled: true, low: -2, lowMid: -3, highMid: 1.5, high: 4.5 },
      compression: { enabled: true, threshold: -16, ratio: 3, attack: 0.02, release: 0.25, makeup: 1 },
      deesser: { enabled: true, frequency: 6200, threshold: -18, amount: 50 },
      reverbSend: 0.55,
      delaySend: 0.40,
      saturation: { enabled: true, drive: 15, warmth: 40 },
      autotune: { enabled: true, key: 'A', scale: 'minor', speed: 45, amount: 75 }
    }
  },
  {
    name: 'Warm Vintage R&B',
    description: 'Full body low-mid presence, gentle 2:1 leveling, warm tape drive',
    effects: {
      eq: { enabled: true, low: 1.5, lowMid: 1.5, highMid: 0.5, high: 2 },
      compression: { enabled: true, threshold: -14, ratio: 2.5, attack: 0.03, release: 0.3, makeup: 1 },
      deesser: { enabled: true, frequency: 5800, threshold: -16, amount: 45 },
      reverbSend: 0.20,
      delaySend: 0.10,
      saturation: { enabled: true, drive: 30, warmth: 60 },
      autotune: { enabled: false, key: 'F', scale: 'major', speed: 70, amount: 50 }
    }
  }
];

export const TrackInspector: React.FC<TrackInspectorProps> = ({
  selectedTrack,
  onUpdateTrack,
  masteringSettings,
  onUpdateMastering,
  reverbBus,
  onUpdateReverbBus,
  delayBus,
  onUpdateDelayBus,
  bpm
}) => {
  const [activeTab, setActiveTab] = useState<'track' | 'master' | 'busses'>('track');

  if (!selectedTrack && activeTab === 'track') {
    // If no track selected, auto switch or show prompt
  }

  const handleTrackEffect = (patch: Partial<Track['effects']>) => {
    if (!selectedTrack) return;
    onUpdateTrack(selectedTrack.id, {
      effects: {
        ...selectedTrack.effects,
        ...patch
      }
    });
  };

  return (
    <aside className="w-80 shrink-0 bg-studio-950 border-l border-studio-800 flex flex-col z-20 shadow-xl overflow-hidden select-none">
      {/* 1. Header Tabs */}
      <div className="h-12 bg-studio-950 border-b border-studio-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex bg-studio-900 rounded-lg p-0.5 border border-studio-800">
          <button 
            onClick={() => setActiveTab('track')}
            className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'track' ? 'bg-studio-800 text-white shadow-sm' : 'text-studio-500 hover:text-zinc-300'
            }`}
          >
            Track FX
          </button>
          <button 
            onClick={() => setActiveTab('busses')}
            className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'busses' ? 'bg-studio-800 text-white shadow-sm' : 'text-studio-500 hover:text-zinc-300'
            }`}
          >
            FX Busses
          </button>
          <button 
            onClick={() => setActiveTab('master')}
            className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'master' ? 'bg-studio-accent text-white shadow-sm' : 'text-studio-500 hover:text-zinc-300'
            }`}
          >
            Master Bus
          </button>
        </div>

        <span className="text-[9px] font-mono font-bold text-studio-500 uppercase">
          {activeTab === 'track' && selectedTrack ? selectedTrack.name : activeTab.toUpperCase()}
        </span>
      </div>

      {/* 2. Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* TAB 1: Selected Track Channel FX */}
        {activeTab === 'track' && (
          selectedTrack ? (
            <div className="flex flex-col gap-5">
              {/* Vocal Presets Dropdown */}
              <div className="flex flex-col gap-1.5 bg-studio-900 p-3 rounded-xl border border-studio-800">
                <span className="text-[9px] font-black uppercase text-studio-500 tracking-widest flex items-center gap-1.5">
                  <Sparkles size={11} className="text-studio-accent" /> Vocal Chain Presets
                </span>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {VOCAL_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleTrackEffect(preset.effects)}
                      className="px-2 py-1.5 rounded-lg bg-studio-950 hover:bg-studio-800 text-left border border-studio-800/80 hover:border-studio-accent/40 transition-all text-[10px] font-bold text-zinc-300"
                    >
                      <div className="text-white truncate">{preset.name}</div>
                      <div className="text-[8px] text-studio-500 truncate">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Module 1: Pitch Correction / Auto-Tune */}
              <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
                  <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5">
                    <Mic2 size={12} className="text-amber-400" /> Auto-Tune Rack
                  </span>
                  <button 
                    onClick={() => handleTrackEffect({
                      autotune: { ...selectedTrack.effects.autotune, enabled: !selectedTrack.effects.autotune.enabled }
                    })}
                    className={`w-7 h-4 rounded-full relative transition-colors ${
                      selectedTrack.effects.autotune.enabled ? 'bg-amber-500' : 'bg-studio-800'
                    }`}
                  >
                    <div 
                      className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                        selectedTrack.effects.autotune.enabled ? 'left-3.5' : 'left-0.5'
                      }`} 
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1">
                    <label className="text-[8px] font-bold text-studio-500 uppercase block mb-1">Key</label>
                    <select 
                      value={selectedTrack.effects.autotune.key}
                      onChange={(e) => handleTrackEffect({
                        autotune: { ...selectedTrack.effects.autotune, key: e.target.value }
                      })}
                      className="w-full bg-studio-950 text-xs font-bold font-mono text-amber-400 p-1.5 rounded border border-studio-800 focus:outline-none"
                    >
                      {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-[8px] font-bold text-studio-500 uppercase block mb-1">Scale</label>
                    <select 
                      value={selectedTrack.effects.autotune.scale}
                      onChange={(e) => handleTrackEffect({
                        autotune: { ...selectedTrack.effects.autotune, scale: e.target.value as any }
                      })}
                      className="w-full bg-studio-950 text-xs font-bold text-zinc-300 p-1.5 rounded border border-studio-800 focus:outline-none uppercase"
                    >
                      <option value="minor">Minor</option>
                      <option value="major">Major</option>
                      <option value="chromatic">Chromatic</option>
                      <option value="pentatonic">Pentatonic</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-around items-center pt-2">
                  <Knob 
                    label="Retune Speed"
                    value={selectedTrack.effects.autotune.speed}
                    min={0}
                    max={100}
                    onChange={(v) => handleTrackEffect({
                      autotune: { ...selectedTrack.effects.autotune, speed: v }
                    })}
                    color="text-amber-400"
                    size={40}
                  />
                  <Knob 
                    label="Amount"
                    value={selectedTrack.effects.autotune.amount}
                    min={0}
                    max={100}
                    onChange={(v) => handleTrackEffect({
                      autotune: { ...selectedTrack.effects.autotune, amount: v }
                    })}
                    color="text-amber-400"
                    size={40}
                  />
                </div>
              </div>

              {/* Module 2: 4-Band Parametric EQ */}
              <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
                  <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5">
                    <Sliders size={12} className="text-blue-400" /> 4-Band Parametric EQ
                  </span>
                  <button 
                    onClick={() => handleTrackEffect({
                      eq: { ...selectedTrack.effects.eq, enabled: !selectedTrack.effects.eq.enabled }
                    })}
                    className={`w-7 h-4 rounded-full relative transition-colors ${
                      selectedTrack.effects.eq.enabled ? 'bg-blue-500' : 'bg-studio-800'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${selectedTrack.effects.eq.enabled ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  <Knob 
                    label="Low (100Hz)"
                    value={selectedTrack.effects.eq.low}
                    min={-18}
                    max={18}
                    onChange={(v) => handleTrackEffect({ eq: { ...selectedTrack.effects.eq, low: v } })}
                    color="text-blue-400"
                    size={38}
                  />
                  <Knob 
                    label="LoMid (500Hz)"
                    value={selectedTrack.effects.eq.lowMid}
                    min={-18}
                    max={18}
                    onChange={(v) => handleTrackEffect({ eq: { ...selectedTrack.effects.eq, lowMid: v } })}
                    color="text-blue-400"
                    size={38}
                  />
                  <Knob 
                    label="HiMid (3kHz)"
                    value={selectedTrack.effects.eq.highMid}
                    min={-18}
                    max={18}
                    onChange={(v) => handleTrackEffect({ eq: { ...selectedTrack.effects.eq, highMid: v } })}
                    color="text-blue-400"
                    size={38}
                  />
                  <Knob 
                    label="High (10kHz)"
                    value={selectedTrack.effects.eq.high}
                    min={-18}
                    max={18}
                    onChange={(v) => handleTrackEffect({ eq: { ...selectedTrack.effects.eq, high: v } })}
                    color="text-blue-400"
                    size={38}
                  />
                </div>
              </div>

              {/* Module 3: Pro Dynamics Compressor & De-Esser */}
              <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
                  <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5">
                    <Activity size={12} className="text-emerald-400" /> Dynamics Compressor
                  </span>
                  <button 
                    onClick={() => handleTrackEffect({
                      compression: { ...selectedTrack.effects.compression, enabled: !selectedTrack.effects.compression.enabled }
                    })}
                    className={`w-7 h-4 rounded-full relative transition-colors ${
                      selectedTrack.effects.compression.enabled ? 'bg-emerald-500' : 'bg-studio-800'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${selectedTrack.effects.compression.enabled ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Knob 
                    label="Thresh dB"
                    value={selectedTrack.effects.compression.threshold}
                    min={-60}
                    max={0}
                    onChange={(v) => handleTrackEffect({ compression: { ...selectedTrack.effects.compression, threshold: v } })}
                    color="text-emerald-400"
                    size={38}
                  />
                  <Knob 
                    label="Ratio"
                    value={selectedTrack.effects.compression.ratio}
                    min={1}
                    max={20}
                    onChange={(v) => handleTrackEffect({ compression: { ...selectedTrack.effects.compression, ratio: v } })}
                    color="text-emerald-400"
                    size={38}
                  />
                  <Knob 
                    label="Makeup dB"
                    value={selectedTrack.effects.compression.makeup}
                    min={0}
                    max={24}
                    onChange={(v) => handleTrackEffect({ compression: { ...selectedTrack.effects.compression, makeup: v } })}
                    color="text-emerald-400"
                    size={38}
                  />
                </div>
              </div>

              {/* Module 4: Aux Sends (Reverb & Delay) */}
              <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5 border-b border-studio-800/80 pb-2">
                  <Zap size={12} className="text-purple-400" /> Auxiliary FX Sends
                </span>
                <div className="flex justify-around items-center pt-2">
                  <Knob 
                    label="Verb Send"
                    value={selectedTrack.effects.reverbSend}
                    min={0}
                    max={1}
                    onChange={(v) => handleTrackEffect({ reverbSend: v })}
                    color="text-purple-400"
                    size={40}
                  />
                  <Knob 
                    label="Delay Send"
                    value={selectedTrack.effects.delaySend}
                    min={0}
                    max={1}
                    onChange={(v) => handleTrackEffect({ delaySend: v })}
                    color="text-pink-400"
                    size={40}
                  />
                  <Knob 
                    label="Tape Drive"
                    value={selectedTrack.effects.saturation.drive}
                    min={0}
                    max={100}
                    onChange={(v) => handleTrackEffect({
                      saturation: { ...selectedTrack.effects.saturation, enabled: true, drive: v }
                    })}
                    color="text-amber-500"
                    size={40}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-studio-500">
              <Sliders size={24} className="mb-2 text-studio-700" />
              <p className="text-xs font-bold text-zinc-400">No Track Selected</p>
              <p className="text-[10px] mt-1 leading-relaxed">
                Click on any track row in the timeline or channel list to edit its vocal DSP chain.
              </p>
            </div>
          )
        )}

        {/* TAB 2: Auxiliary FX Busses (Reverb Convolver & Stereo Delay) */}
        {activeTab === 'busses' && (
          <div className="flex flex-col gap-5">
            {/* Reverb Bus Settings */}
            <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
              <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
                <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5">
                  <Zap size={12} className="text-purple-400" /> Algorithmic Reverb Bus
                </span>
                <select 
                  value={reverbBus.type}
                  onChange={(e) => onUpdateReverbBus({ ...reverbBus, type: e.target.value as any })}
                  className="bg-studio-950 text-[10px] font-bold text-purple-300 rounded px-2 py-0.5 border border-studio-800 uppercase focus:outline-none"
                >
                  <option value="plate">Plate</option>
                  <option value="hall">Concert Hall</option>
                  <option value="room">Studio Room</option>
                  <option value="space">Space</option>
                </select>
              </div>

              <div className="flex justify-around items-center pt-2">
                <Knob 
                  label="Decay (sec)"
                  value={reverbBus.decay}
                  min={0.5}
                  max={6.0}
                  onChange={(v) => onUpdateReverbBus({ ...reverbBus, decay: v })}
                  color="text-purple-400"
                  size={42}
                />
                <Knob 
                  label="Hi-Cut Hz"
                  value={reverbBus.highCut}
                  min={2000}
                  max={16000}
                  onChange={(v) => onUpdateReverbBus({ ...reverbBus, highCut: v })}
                  color="text-purple-400"
                  size={42}
                />
                <Knob 
                  label="Return Mix"
                  value={reverbBus.mix}
                  min={0}
                  max={1}
                  onChange={(v) => onUpdateReverbBus({ ...reverbBus, mix: v })}
                  color="text-purple-400"
                  size={42}
                />
              </div>
            </div>

            {/* Delay Bus Settings */}
            <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
              <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
                <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider flex items-center gap-1.5">
                  <Radio size={12} className="text-pink-400" /> Stereo Delay Bus
                </span>
                <select 
                  value={delayBus.sync}
                  onChange={(e) => onUpdateDelayBus({ ...delayBus, sync: e.target.value as any })}
                  className="bg-studio-950 text-[10px] font-bold text-pink-300 rounded px-2 py-0.5 border border-studio-800 uppercase focus:outline-none"
                >
                  <option value="1/4">1/4 Note</option>
                  <option value="1/8d">1/8 Dotted</option>
                  <option value="1/8">1/8 Note</option>
                  <option value="1/16">1/16 Note</option>
                  <option value="free">Free (ms)</option>
                </select>
              </div>

              <div className="flex justify-around items-center pt-2">
                <Knob 
                  label="Feedback"
                  value={delayBus.feedback}
                  min={0}
                  max={0.9}
                  onChange={(v) => onUpdateDelayBus({ ...delayBus, feedback: v })}
                  color="text-pink-400"
                  size={42}
                />
                <Knob 
                  label="Return Mix"
                  value={delayBus.mix}
                  min={0}
                  max={1}
                  onChange={(v) => onUpdateDelayBus({ ...delayBus, mix: v })}
                  color="text-pink-400"
                  size={42}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Master Bus Processing & LUFS Standards */}
        {activeTab === 'master' && (
          <div className="flex flex-col gap-5">
            {/* Target Presets */}
            <div className="flex flex-col gap-2 bg-studio-900 p-3 rounded-xl border border-studio-800">
              <span className="text-[9px] font-black uppercase text-studio-500 tracking-widest">
                Target Loudness Standard
              </span>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {[
                  { id: 'streaming', label: '-14 LUFS', sub: 'Streaming' },
                  { id: 'club', label: '-9 LUFS', sub: 'Club / Drill' },
                  { id: 'podcast', label: '-16 LUFS', sub: 'Podcast' }
                ].map((target) => (
                  <button
                    key={target.id}
                    onClick={() => {
                      const isClub = target.id === 'club';
                      const isPod = target.id === 'podcast';
                      onUpdateMastering({
                        ...masteringSettings,
                        targetPreset: target.id as any,
                        gain: isClub ? 1.3 : isPod ? 0.95 : 1.05,
                        limiter: {
                          ...masteringSettings.limiter,
                          threshold: isClub ? -4.5 : isPod ? -1.0 : -2.0
                        }
                      });
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      masteringSettings.targetPreset === target.id 
                        ? 'bg-studio-accent/20 border-studio-accent text-white' 
                        : 'bg-studio-950 border-studio-800/80 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black">{target.label}</div>
                    <div className="text-[8px] text-studio-500 uppercase font-bold">{target.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Master Glue Comp & Limiter */}
            <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
              <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider border-b border-studio-800/80 pb-2">
                Bus Glue & Limiting
              </span>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Knob 
                  label="Master Out"
                  value={masteringSettings.gain}
                  min={0.5}
                  max={2.0}
                  onChange={(v) => onUpdateMastering({ ...masteringSettings, gain: v })}
                  color="text-white"
                  size={40}
                />
                <Knob 
                  label="Glue Comp"
                  value={masteringSettings.glueComp.threshold}
                  min={-30}
                  max={0}
                  onChange={(v) => onUpdateMastering({
                    ...masteringSettings,
                    glueComp: { ...masteringSettings.glueComp, threshold: v }
                  })}
                  color="text-amber-400"
                  size={40}
                />
                <Knob 
                  label="Limiter dB"
                  value={masteringSettings.limiter.threshold}
                  min={-15}
                  max={0}
                  onChange={(v) => onUpdateMastering({
                    ...masteringSettings,
                    limiter: { ...masteringSettings.limiter, threshold: v }
                  })}
                  color="text-rose-500"
                  size={40}
                />
              </div>
            </div>

            {/* Master EQ */}
            <div className="flex flex-col gap-2 bg-studio-900 p-3.5 rounded-xl border border-studio-800">
              <span className="text-[10px] font-black uppercase text-studio-400 tracking-wider border-b border-studio-800/80 pb-2">
                Master 3-Band EQ
              </span>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Knob 
                  label="Sub / Low"
                  value={masteringSettings.eq.low}
                  min={-6}
                  max={6}
                  onChange={(v) => onUpdateMastering({
                    ...masteringSettings,
                    eq: { ...masteringSettings.eq, low: v }
                  })}
                  color="text-studio-accent"
                  size={40}
                />
                <Knob 
                  label="Mid Body"
                  value={masteringSettings.eq.mid}
                  min={-6}
                  max={6}
                  onChange={(v) => onUpdateMastering({
                    ...masteringSettings,
                    eq: { ...masteringSettings.eq, mid: v }
                  })}
                  color="text-studio-accent"
                  size={40}
                />
                <Knob 
                  label="Air / High"
                  value={masteringSettings.eq.high}
                  min={-6}
                  max={6}
                  onChange={(v) => onUpdateMastering({
                    ...masteringSettings,
                    eq: { ...masteringSettings.eq, high: v }
                  })}
                  color="text-studio-accent"
                  size={40}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
