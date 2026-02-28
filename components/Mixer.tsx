import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Track, MasteringSettings } from '../types';
import { Knob } from './Knob';
import { Wand2, Zap, Mic2, Activity, Sliders, Volume2, Layers, X } from 'lucide-react';
import { getMixingAdvice, getMasteringAdvice } from '../services/geminiService';

interface MixerProps {
  selectedTrack: Track | null;
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  masteringSettings: MasteringSettings;
  onUpdateMastering: (settings: MasteringSettings) => void;
  trackCount: number;
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const GENRES = ["Hip-Hop", "Trap", "R&B", "Pop", "Rock", "Electronic", "Lofi", "Drill"];

export const Mixer: React.FC<MixerProps> = ({ selectedTrack, onUpdateTrack, masteringSettings, onUpdateMastering, trackCount }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [view, setView] = useState<'track' | 'master'>('track');

  const handleEffectChange = (category: keyof Track['effects'], param: string, value: number | boolean | string) => {
    if (!selectedTrack) return;
    onUpdateTrack(selectedTrack.id, {
      effects: {
        ...selectedTrack.effects,
        [category]: {
          ...selectedTrack.effects[category as any],
          [param]: value
        }
      }
    });
  };

  const handleMasteringChange = (category: keyof MasteringSettings, param: string | null, value: number) => {
      if (category === 'eq' && param) {
          onUpdateMastering({ ...masteringSettings, eq: { ...masteringSettings.eq, [param]: value } });
      } else if (category === 'limiter' && param) {
          onUpdateMastering({ ...masteringSettings, limiter: { ...masteringSettings.limiter, [param]: value } });
      } else if (category === 'gain') {
          onUpdateMastering({ ...masteringSettings, gain: value });
      }
  };

  const handleMagicMix = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    setAiSuggestion(null);
    try {
        if (view === 'track' && selectedTrack) {
            const result = await getMixingAdvice(selectedTrack.name, aiPrompt, genre);
            onUpdateTrack(selectedTrack.id, { effects: { ...selectedTrack.effects, ...result.config } });
            setAiSuggestion(result.suggestion);
        } else if (view === 'master') {
            const result = await getMasteringAdvice(trackCount, genre, aiPrompt);
            onUpdateMastering(result.config);
            setAiSuggestion(result.suggestion);
        }
    } catch (e) {
        console.error(e);
        setAiSuggestion("AI service unavailable. Check connection.");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="h-[340px] bg-studio-900 border-t border-studio-800 flex flex-col shrink-0 shadow-2xl z-40">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-studio-800 bg-studio-950/50">
        <div className="flex items-center gap-6">
            <div className="flex bg-studio-950 rounded-xl p-1 border border-studio-800 shadow-inner">
                <button 
                    onClick={() => setView('track')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest transition-all ${view === 'track' ? 'bg-studio-800 text-white shadow-lg' : 'text-studio-500 hover:text-studio-400'}`}
                >
                    TRACK
                </button>
                <button 
                    onClick={() => setView('master')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-widest transition-all ${view === 'master' ? 'bg-studio-accent text-white shadow-lg' : 'text-studio-500 hover:text-studio-400'}`}
                >
                    MASTER
                </button>
            </div>
            
            <AnimatePresence mode="wait">
              {view === 'track' && selectedTrack ? (
                  <motion.h3 
                    key="track-title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-xs font-black text-white flex items-center gap-3"
                  >
                      <Sliders size={16} className="text-studio-500" />
                      <span className="text-studio-500 tracking-widest uppercase">Channel:</span>
                      <span className="text-white">{selectedTrack.name.toUpperCase()}</span>
                  </motion.h3>
              ) : view === 'master' ? (
                  <motion.h3 
                    key="master-title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-xs font-black text-white flex items-center gap-3"
                  >
                      <Layers size={16} className="text-studio-accent" />
                      <span className="text-white tracking-widest uppercase">MASTER BUS</span>
                  </motion.h3>
              ) : (
                <motion.p 
                  key="no-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-bold text-studio-700 italic"
                >
                  Select a track to edit effects
                </motion.p>
              )}
            </AnimatePresence>
        </div>
        
        {/* AI Assistant */}
        <div className="flex items-center gap-2 bg-studio-950 rounded-xl px-2 py-1.5 border border-studio-800 shadow-inner">
            <select 
                value={genre} 
                onChange={(e) => setGenre(e.target.value)}
                className="bg-transparent text-[10px] font-black text-studio-500 focus:outline-none px-3 border-r border-studio-800 h-6 cursor-pointer hover:text-studio-accent transition-colors appearance-none"
            >
                {GENRES.map(g => <option key={g} value={g} className="bg-studio-950 text-white">{g.toUpperCase()}</option>)}
            </select>

            <input 
                type="text" 
                placeholder={view === 'master' ? "DESCRIBE MASTERING STYLE..." : "DESCRIBE MIXING STYLE..."}
                className="bg-transparent border-none text-[10px] text-white px-3 focus:outline-none w-64 font-mono font-bold placeholder:text-studio-800"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicMix()}
            />
            <button 
                onClick={handleMagicMix}
                disabled={isAiLoading}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${isAiLoading ? 'bg-studio-800 text-studio-500 animate-pulse' : 'bg-studio-accent text-white hover:bg-studio-accentHover shadow-lg shadow-studio-accent/20'}`}
            >
                <Wand2 size={14} />
                <span>{isAiLoading ? 'PROCESSING...' : 'MAGIC MIX'}</span>
            </button>
        </div>
      </div>
      
      <AnimatePresence>
        {aiSuggestion && (
           <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-2 bg-studio-accent/10 text-[10px] font-bold text-studio-accent border-b border-studio-accent/20 flex items-center justify-between overflow-hidden"
           >
              <span className="font-mono tracking-tight">✨ AI ADVICE: {aiSuggestion}</span>
              <button onClick={() => setAiSuggestion(null)} className="text-studio-accent hover:text-white p-1">
                <X size={14} />
              </button>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Rack Units */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-8 items-start no-scrollbar">
        {view === 'track' && selectedTrack ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-8"
            >
                {/* Module 1: Dynamics */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <Activity size={12} /> Dynamics
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                        <Knob label="Thresh" value={selectedTrack.effects.compression.threshold} min={-60} max={0} onChange={(v) => handleEffectChange('compression', 'threshold', v)} color="text-emerald-400" size={44} />
                        <Knob label="Ratio" value={selectedTrack.effects.compression.ratio} min={1} max={20} onChange={(v) => handleEffectChange('compression', 'ratio', v)} color="text-emerald-400" size={44} />
                    </div>
                </div>

                {/* Module 2: EQ */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <Sliders size={12} /> Equalizer
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                        <Knob label="Low" value={selectedTrack.effects.eq.low} min={-15} max={15} onChange={(v) => handleEffectChange('eq', 'low', v)} color="text-blue-400" size={44} />
                        <Knob label="Mid" value={selectedTrack.effects.eq.mid} min={-15} max={15} onChange={(v) => handleEffectChange('eq', 'mid', v)} color="text-blue-400" size={44} />
                        <Knob label="High" value={selectedTrack.effects.eq.high} min={-15} max={15} onChange={(v) => handleEffectChange('eq', 'high', v)} color="text-blue-400" size={44} />
                    </div>
                </div>

                {/* Module 3: Space */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <Zap size={12} /> Space
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                        <Knob label="Verb Mix" value={selectedTrack.effects.reverb.mix} min={0} max={1} onChange={(v) => handleEffectChange('reverb', 'mix', v)} color="text-purple-400" size={44} />
                        <Knob label="Decay" value={selectedTrack.effects.reverb.decay} min={0.1} max={5} onChange={(v) => handleEffectChange('reverb', 'decay', v)} color="text-purple-400" size={44} />
                        <div className="w-px bg-studio-800 mx-1" />
                        <Knob label="Dly Mix" value={selectedTrack.effects.delay.mix} min={0} max={1} onChange={(v) => handleEffectChange('delay', 'mix', v)} color="text-pink-400" size={44} />
                    </div>
                </div>

                {/* Module 4: Pitch */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <div className="flex items-center gap-2"><Mic2 size={12} /> Pitch</div>
                        <div className="flex items-center gap-2">
                            <select
                                className={`bg-studio-950 border border-studio-800 text-[10px] rounded-lg px-2 py-0.5 font-mono font-bold focus:outline-none focus:border-studio-accent appearance-none cursor-pointer ${selectedTrack.effects.autotune.enabled ? 'text-studio-accent' : 'text-studio-700'}`}
                                value={selectedTrack.effects.autotune.key}
                                onChange={(e) => handleEffectChange('autotune', 'key', e.target.value)}
                                disabled={!selectedTrack.effects.autotune.enabled}
                            >
                                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <button 
                                onClick={() => handleEffectChange('autotune', 'enabled', !selectedTrack.effects.autotune.enabled)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${selectedTrack.effects.autotune.enabled ? 'bg-studio-accent' : 'bg-studio-800'}`}
                            >
                                <motion.div 
                                  animate={{ x: selectedTrack.effects.autotune.enabled ? 18 : 2 }}
                                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm" 
                                />
                            </button>
                        </div>
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                        <Knob 
                            label="Tune Amt" 
                            value={selectedTrack.effects.autotune.amount} 
                            min={0} max={100} 
                            onChange={(v) => handleEffectChange('autotune', 'amount', v)} 
                            color={selectedTrack.effects.autotune.enabled ? "text-amber-400" : "text-studio-700"}
                            size={44}
                        />
                        <Knob label="Pan" value={selectedTrack.pan} min={-1} max={1} onChange={(v) => onUpdateTrack(selectedTrack.id, { pan: v })} color="text-white" size={44} />
                    </div>
                </div>
            </motion.div>
        ) : view === 'master' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-8"
            >
                {/* Master Output */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <Volume2 size={12} /> Output
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/20 to-transparent" />
                        <Knob label="Gain" value={masteringSettings.gain} min={0} max={2} onChange={(v) => handleMasteringChange('gain', null, v)} color="text-white" size={44} />
                        <Knob label="Limiter" value={masteringSettings.limiter.threshold} min={-20} max={0} onChange={(v) => handleMasteringChange('limiter', 'threshold', v)} color="text-studio-danger" size={44} />
                    </div>
                </div>

                {/* Master EQ */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-studio-500 tracking-widest uppercase">
                        <Sliders size={12} /> Master EQ
                    </div>
                    <div className="p-5 bg-studio-950 rounded-2xl border border-studio-800 flex gap-6 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-studio-accent/20 to-transparent" />
                        <Knob label="Low" value={masteringSettings.eq.low} min={-10} max={10} onChange={(v) => handleMasteringChange('eq', 'low', v)} color="text-studio-accent" size={44} />
                        <Knob label="Mid" value={masteringSettings.eq.mid} min={-10} max={10} onChange={(v) => handleMasteringChange('eq', 'mid', v)} color="text-studio-accent" size={44} />
                        <Knob label="High" value={masteringSettings.eq.high} min={-10} max={10} onChange={(v) => handleMasteringChange('eq', 'high', v)} color="text-studio-accent" size={44} />
                    </div>
                </div>
            </motion.div>
        ) : null}
      </div>
    </div>
  );
};
