import React, { useState } from 'react';
import { Mic, Music, Plus, X, Sparkles, Check, Upload } from 'lucide-react';
import { VocalType, TrackType } from '../types';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (type: TrackType, name: string, vocalType?: VocalType) => void;
  onImportBeat?: () => void;
}

interface RecordTemplate {
  name: string;
  type: TrackType;
  vocalType?: VocalType;
  color: string;
  description: string;
  icon: string;
}

const TEMPLATES: RecordTemplate[] = [
  { 
    name: 'Lead Vocal', 
    type: 'vocal', 
    vocalType: 'main', 
    color: '#a855f7', 
    description: 'Main melodic vocals with central presence & auto-tune',
    icon: '🎤'
  },
  { 
    name: 'Ad-libs', 
    type: 'vocal', 
    vocalType: 'adlib', 
    color: '#00f2fe', 
    description: 'Background vocal stabs, echoes & hype phrases',
    icon: '🗣️'
  },
  { 
    name: 'Double Vocal', 
    type: 'vocal', 
    vocalType: 'double', 
    color: '#ec4899', 
    description: 'Layered stereo double to thicken the chorus/hook',
    icon: '👥'
  },
  { 
    name: 'Harmonies', 
    type: 'vocal', 
    vocalType: 'harmony', 
    color: '#f59e0b', 
    description: 'High or low musical harmonic layers',
    icon: '🎶'
  },
  { 
    name: 'Backing Vocal', 
    type: 'vocal', 
    vocalType: 'backing', 
    color: '#10b981', 
    description: 'Background chorus pads and responses',
    icon: '🎧'
  },
  { 
    name: 'Instrumental Beat', 
    type: 'beat', 
    color: '#3b82f6', 
    description: 'Instrumental MP3, 808s or rhythm track',
    icon: '🎵'
  }
];

const QUICK_NAMES = [
  'Lead',
  'Ad-libs',
  'Ad-libs 2',
  'Double',
  'Hook Vocal',
  'Harmonies',
  'Backing',
  'Intro Vocal'
];

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onAddTrack,
  onImportBeat
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<RecordTemplate>(TEMPLATES[0]);
  const [customName, setCustomName] = useState(TEMPLATES[0].name);

  if (!isOpen) return null;

  const handleSelectTemplate = (tmpl: RecordTemplate) => {
    setSelectedTemplate(tmpl);
    setCustomName(tmpl.name);
  };

  const handleCreate = () => {
    const finalName = customName.trim() || selectedTemplate.name;
    onAddTrack(selectedTemplate.type, finalName, selectedTemplate.vocalType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#161722] border border-[#27293a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 bg-[#181a26] border-b border-[#242637] px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙️</span>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">
                Add New Record Track
              </h3>
              <p className="text-[9px] text-zinc-500">Choose vocal role and name</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-[#202232] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Quick Vocal Role Templates */}
          <div>
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block mb-2">
              Select Record Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.name === tmpl.name;
                return (
                  <button
                    key={tmpl.name}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[#222435] border-purple-500 shadow-md ring-1 ring-purple-500/40'
                        : 'bg-[#12131b] border-[#222432] text-zinc-400 hover:text-white hover:bg-[#1a1c26]'
                    }`}
                  >
                    <span className="text-base shrink-0">{tmpl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{tmpl.name}</div>
                      <div className="text-[8px] text-zinc-500 truncate mt-0.5">{tmpl.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editable Track Name Field with Quick Chips */}
          <div>
            <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider block mb-1.5">
              Custom Record Name
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Lead, Ad-libs, Double, Verse 1"
                className="w-full bg-[#101117] text-xs font-bold text-white px-3 py-2.5 rounded-xl border border-[#27293a] focus:outline-none focus:border-purple-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>

            {/* Quick Rename Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_NAMES.map((qName) => (
                <button
                  key={qName}
                  type="button"
                  onClick={() => setCustomName(qName)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    customName.toLowerCase() === qName.toLowerCase()
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                      : 'bg-[#13141c] text-zinc-400 border-[#262837] hover:text-white hover:bg-[#1f212f]'
                  }`}
                >
                  {qName}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-500 mt-2">
              Tip: You can also double-click the track name in the record list anytime to rename it.
            </p>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-98 mt-1"
          >
            <Plus size={15} />
            <span>CREATE & ARM {customName.toUpperCase()}</span>
          </button>

          {/* Optional: Import MP3 directly */}
          {onImportBeat && (
            <div className="pt-2 border-t border-[#222434] flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-medium">Want to import an audio file?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onImportBeat();
                }}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Upload size={12} />
                <span>Import MP3 File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
