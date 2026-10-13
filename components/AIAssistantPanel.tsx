import React, { useState } from 'react';
import { 
  Sparkles, Wand2, X, Sliders, Mic2, Layers, 
  Flag, Lightbulb, Check, ChevronRight, RefreshCw, Send
} from 'lucide-react';
import { Track, MasteringSettings, Marker } from '../types';
import { 
  getVocalMixingAdvice, getVocalTuningAdvice, 
  getMasteringAdvice, getArrangementMarkers, getCreativeIdeas,
  MixAdviceResult, VocalKeyAdvice, MasteringAdviceResult, CreativeIdeasResult
} from '../services/geminiService';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTrack: Track | null;
  onApplyTrackEffects: (trackId: string, effects: Partial<Track['effects']>) => void;
  masteringSettings: MasteringSettings;
  onApplyMastering: (settings: MasteringSettings) => void;
  onApplyMarkers: (markers: Marker[]) => void;
  bpm: number;
  trackCount: number;
  totalDuration: number;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  selectedTrack,
  onApplyTrackEffects,
  masteringSettings,
  onApplyMastering,
  onApplyMarkers,
  bpm,
  trackCount,
  totalDuration
}) => {
  const [activeTab, setActiveTab] = useState<'mix' | 'tuning' | 'master' | 'arrange' | 'ideas'>('mix');
  const [genre, setGenre] = useState('Hip-Hop / Trap');
  const [userPrompt, setUserPrompt] = useState('Ethereal, spacious, modern polished vocal');
  const [isLoading, setIsLoading] = useState(false);

  // Results state
  const [mixResult, setMixResult] = useState<MixAdviceResult | null>(null);
  const [tuningResult, setTuningResult] = useState<VocalKeyAdvice | null>(null);
  const [masterResult, setMasterResult] = useState<MasteringAdviceResult | null>(null);
  const [arrangeResult, setArrangeResult] = useState<Marker[] | null>(null);
  const [ideasResult, setIdeasResult] = useState<CreativeIdeasResult | null>(null);
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunMixAssistant = async () => {
    setIsLoading(true);
    setAppliedStatus(null);
    try {
      const res = await getVocalMixingAdvice(
        selectedTrack ? selectedTrack.name : 'Vocal Lead',
        selectedTrack?.vocalType || 'main',
        bpm,
        genre,
        userPrompt
      );
      setMixResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTuning = async () => {
    setIsLoading(true);
    setAppliedStatus(null);
    try {
      const res = await getVocalTuningAdvice(genre, bpm, userPrompt);
      setTuningResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMastering = async () => {
    setIsLoading(true);
    setAppliedStatus(null);
    try {
      const res = await getMasteringAdvice(genre, 'Streaming (-14 LUFS)', trackCount);
      setMasterResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunArrangement = async () => {
    setIsLoading(true);
    setAppliedStatus(null);
    try {
      const res = await getArrangementMarkers(totalDuration || 90, bpm, genre);
      setArrangeResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCreativeIdeas = async () => {
    setIsLoading(true);
    try {
      const res = await getCreativeIdeas(userPrompt, genre);
      setIdeasResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-80 bg-studio-950 border-t border-studio-800 flex flex-col z-40 shadow-2xl shrink-0 select-none">
      {/* Header Bar */}
      <div className="h-11 bg-studio-900 border-b border-studio-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <Sparkles size={14} className="text-studio-accent animate-pulse" />
            <span>AYONI AI PRODUCER</span>
          </div>

          <div className="h-4 w-px bg-studio-800" />

          {/* Mode Selector Tabs */}
          <div className="flex bg-studio-950 rounded-lg p-0.5 border border-studio-800 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab('mix')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'mix' ? 'bg-studio-accent text-white' : 'text-studio-500 hover:text-zinc-300'}`}
            >
              Mix Engineer
            </button>
            <button
              onClick={() => setActiveTab('tuning')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'tuning' ? 'bg-studio-accent text-white' : 'text-studio-500 hover:text-zinc-300'}`}
            >
              Auto-Tune Key
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'master' ? 'bg-studio-accent text-white' : 'text-studio-500 hover:text-zinc-300'}`}
            >
              Mastering
            </button>
            <button
              onClick={() => setActiveTab('arrange')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'arrange' ? 'bg-studio-accent text-white' : 'text-studio-500 hover:text-zinc-300'}`}
            >
              Arrangement
            </button>
            <button
              onClick={() => setActiveTab('ideas')}
              className={`px-3 py-1 rounded transition-colors ${activeTab === 'ideas' ? 'bg-studio-accent text-white' : 'text-studio-500 hover:text-zinc-300'}`}
            >
              Ad-libs & Hooks
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="text-studio-500 hover:text-white p-1 rounded-lg hover:bg-studio-800 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 flex gap-6">
        {/* Left Control Column */}
        <div className="w-72 shrink-0 flex flex-col gap-3 border-r border-studio-800 pr-4">
          <div>
            <label className="text-[9px] font-black uppercase text-studio-500 block mb-1">Track Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-studio-900 text-xs font-bold text-white rounded p-1.5 border border-studio-800 focus:outline-none"
            >
              <option value="Hip-Hop / Trap">Hip-Hop / Trap</option>
              <option value="Modern R&B / Soul">Modern R&B / Soul</option>
              <option value="Pop / Electronic">Pop / Electronic</option>
              <option value="Afrobeats / Dancehall">Afrobeats / Dancehall</option>
              <option value="UK Drill / Grime">UK Drill / Grime</option>
              <option value="Indie / Alternative">Indie / Alternative</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-studio-500 block mb-1">
              Producer Prompt / Vibe
            </label>
            <input 
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. ethereal, spacious, heavy autotune"
              className="w-full bg-studio-900 text-xs text-white rounded p-2 border border-studio-800 focus:outline-none focus:border-studio-accent font-medium"
            />
          </div>

          <button
            onClick={() => {
              if (activeTab === 'mix') handleRunMixAssistant();
              else if (activeTab === 'tuning') handleRunTuning();
              else if (activeTab === 'master') handleRunMastering();
              else if (activeTab === 'arrange') handleRunArrangement();
              else if (activeTab === 'ideas') handleRunCreativeIdeas();
            }}
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2 mt-auto"
          >
            {isLoading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Wand2 size={13} />
            )}
            <span>{isLoading ? 'ANALYZING AUDIO...' : 'GENERATE AI ADVICE'}</span>
          </button>
        </div>

        {/* Right Output Column */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* TAB 1: MIX ASSISTANT */}
          {activeTab === 'mix' && (
            mixResult ? (
              <div className="flex flex-col gap-3">
                <div className="bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                  <span className="text-[10px] font-black uppercase text-studio-accent tracking-widest block mb-1">
                    AI Mixing Recommendation
                  </span>
                  <p className="text-xs font-bold text-white leading-relaxed">{mixResult.suggestion}</p>
                  {mixResult.rationale && (
                    <p className="text-[11px] text-zinc-400 mt-1 italic">{mixResult.rationale}</p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 bg-studio-950 p-2.5 rounded-lg border border-studio-800 text-[10px] font-mono">
                  <div>
                    <span className="text-studio-500 block">Low EQ:</span>
                    <span className="text-blue-400 font-bold">{mixResult.config.eq?.low} dB</span>
                  </div>
                  <div>
                    <span className="text-studio-500 block">High EQ:</span>
                    <span className="text-blue-400 font-bold">{mixResult.config.eq?.high} dB</span>
                  </div>
                  <div>
                    <span className="text-studio-500 block">Comp Ratio:</span>
                    <span className="text-emerald-400 font-bold">{mixResult.config.compression?.ratio}:1</span>
                  </div>
                  <div>
                    <span className="text-studio-500 block">Reverb Send:</span>
                    <span className="text-purple-400 font-bold">{Math.round((mixResult.config.reverbSend || 0) * 100)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-studio-500">
                    Target: {selectedTrack ? selectedTrack.name : 'Active Vocal Track'}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedTrack) {
                        onApplyTrackEffects(selectedTrack.id, mixResult.config);
                        setAppliedStatus('Effects applied to ' + selectedTrack.name);
                      }
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-4"
                  >
                    <Check size={13} />
                    <span>APPLY SETTINGS TO TRACK</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-studio-500">
                <Sliders size={28} className="mb-2 text-studio-700" />
                <p className="text-xs font-bold text-zinc-300">Intelligent Vocal Mix Engineer</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Type your desired tone above and click Generate to receive custom EQ cuts, glue compression, and aux send values.
                </p>
              </div>
            )
          )}

          {/* TAB 2: AUTOTUNE KEY ASSISTANT */}
          {activeTab === 'tuning' && (
            tuningResult ? (
              <div className="flex flex-col gap-3">
                <div className="bg-studio-900 p-4 rounded-xl border border-studio-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-1">
                      Detected Vocal Root & Scale
                    </span>
                    <div className="text-2xl font-black font-mono text-white flex items-center gap-2">
                      <span>{tuningResult.detectedKey}</span>
                      <span className="text-sm font-bold text-studio-500 uppercase">{tuningResult.scale}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-studio-500 block">RECOMMENDED SPEED</span>
                    <span className="text-lg font-mono font-bold text-amber-400">{tuningResult.recommendedSpeed}%</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed bg-studio-950 p-3 rounded-lg border border-studio-800">
                  {tuningResult.notes}
                </p>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      if (selectedTrack) {
                        onApplyTrackEffects(selectedTrack.id, {
                          autotune: {
                            ...selectedTrack.effects.autotune,
                            enabled: true,
                            key: tuningResult.detectedKey,
                            scale: tuningResult.scale as any,
                            speed: tuningResult.recommendedSpeed
                          }
                        });
                        setAppliedStatus('Auto-Tune updated with ' + tuningResult.detectedKey + ' ' + tuningResult.scale);
                      }
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-4"
                  >
                    <Check size={13} />
                    <span>APPLY KEY TO AUTOTUNE</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-studio-500">
                <Mic2 size={28} className="mb-2 text-studio-700" />
                <p className="text-xs font-bold text-zinc-300">Vocal Key & Pitch Correction Finder</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Gemini analyzes your genre, tempo, and vocal tone to detect the optimal song key and retune snap.
                </p>
              </div>
            )
          )}

          {/* TAB 3: MASTERING */}
          {activeTab === 'master' && (
            masterResult ? (
              <div className="flex flex-col gap-3">
                <div className="bg-studio-900 p-3.5 rounded-xl border border-studio-800">
                  <span className="text-[10px] font-black uppercase text-studio-accent tracking-widest block mb-1">
                    Mastering Bus Recommendation
                  </span>
                  <p className="text-xs font-bold text-white">{masterResult.suggestion}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-studio-950 p-3 rounded-lg border border-studio-800">
                  <div>
                    <span className="text-[9px] text-studio-500 block">Limiter Ceiling</span>
                    <span className="text-rose-400 font-bold">{masterResult.config.limiter.threshold} dBFS</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-studio-500 block">Glue Comp</span>
                    <span className="text-amber-400 font-bold">{masterResult.config.glueComp.threshold} dB</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-studio-500 block">Target Loudness</span>
                    <span className="text-studio-accent font-bold uppercase">{masterResult.targetPreset}</span>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      onApplyMastering(masterResult.config);
                      setAppliedStatus('Master bus limiter & glue compression applied');
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-4"
                  >
                    <Check size={13} />
                    <span>APPLY TO MASTER BUS</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-studio-500">
                <Layers size={28} className="mb-2 text-studio-700" />
                <p className="text-xs font-bold text-zinc-300">Commercial Loudness & Limiting Master</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Tune master glue compression and brickwall limiting to target -14 LUFS (Spotify/Apple) or -9 LUFS (Club).
                </p>
              </div>
            )
          )}

          {/* TAB 4: ARRANGEMENT */}
          {activeTab === 'arrange' && (
            arrangeResult ? (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase text-studio-500 tracking-wider">
                  Suggested Song Structure Markers
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {arrangeResult.map((m, idx) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-lg bg-studio-900 border border-studio-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="font-bold text-white">{m.name}</span>
                      </div>
                      <span className="font-mono text-studio-500 text-[10px]">{m.time.toFixed(1)}s</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      onApplyMarkers(arrangeResult);
                      setAppliedStatus('Arrangement markers added to timeline');
                    }}
                    className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-4"
                  >
                    <Check size={13} />
                    <span>INSERT MARKERS ON TIMELINE</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-studio-500">
                <Flag size={28} className="mb-2 text-studio-700" />
                <p className="text-xs font-bold text-zinc-300">Arrangement & Song Structure Helper</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Automatically calculates 4-bar and 8-bar musical divisions for Intro, Verse, Hook, and Outro markers.
                </p>
              </div>
            )
          )}

          {/* TAB 5: CREATIVE IDEAS (AD-LIBS & HOOKS) */}
          {activeTab === 'ideas' && (
            ideasResult ? (
              <div className="flex flex-col gap-3 overflow-y-auto">
                <div className="bg-studio-900 p-3 rounded-xl border border-studio-800">
                  <span className="text-[9px] font-black uppercase text-amber-400 block mb-1">
                    Signature Ad-Lib Cues
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ideasResult.adlibs.map((ad, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-studio-950 text-white font-mono text-[10px] border border-studio-800">
                        {ad}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-studio-900 p-3 rounded-xl border border-studio-800">
                  <span className="text-[9px] font-black uppercase text-studio-accent block mb-1">
                    Vocal Stacking & Layering Advice
                  </span>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    {ideasResult.vocalLayers.map((layer, i) => (
                      <li key={i}>{layer}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-studio-500">
                <Lightbulb size={28} className="mb-2 text-studio-700" />
                <p className="text-xs font-bold text-zinc-300">Creative Ad-libs, Layering & Punchlines</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Spark new melodic ideas, backing vocal harmonies, and signature vocal ad-lib textures.
                </p>
              </div>
            )
          )}

          {/* Feedback banner */}
          {appliedStatus && (
            <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-1.5 rounded mt-2 flex items-center gap-1.5">
              <Check size={12} />
              <span>{appliedStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
