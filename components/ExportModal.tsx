import React, { useState } from 'react';
import { Download, X, Layers, Music, Check, RefreshCw } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onExport: (format: 'wav16' | 'wav24' | 'stems', range: 'full' | 'loop') => Promise<void>;
  isLoopEnabled: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  onExport,
  isLoopEnabled
}) => {
  const [format, setFormat] = useState<'wav16' | 'wav24' | 'stems'>('wav16');
  const [range, setRange] = useState<'full' | 'loop'>('full');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    try {
      await onExport(format, range);
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1500);
    } catch (e) {
      console.error("Export error", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-md bg-studio-950 border border-studio-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={16} className="text-studio-accent" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Export Master Mixdown
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-studio-500 hover:text-white p-1 rounded-lg hover:bg-studio-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col gap-5">
          {/* Output Format */}
          <div>
            <label className="text-[10px] font-black uppercase text-studio-500 tracking-wider block mb-2">
              Audio Format & Depth
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('wav16')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'wav16' 
                    ? 'bg-studio-accent/20 border-studio-accent text-white shadow-md' 
                    : 'bg-studio-900 border-studio-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-black">WAV 16-Bit</div>
                <div className="text-[9px] text-studio-500 mt-0.5">Commercial Master</div>
              </button>

              <button
                onClick={() => setFormat('wav24')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'wav24' 
                    ? 'bg-studio-accent/20 border-studio-accent text-white shadow-md' 
                    : 'bg-studio-900 border-studio-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-black">WAV 24-Bit</div>
                <div className="text-[9px] text-studio-500 mt-0.5">High-Res Studio</div>
              </button>

              <button
                onClick={() => setFormat('stems')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'stems' 
                    ? 'bg-studio-accent/20 border-studio-accent text-white shadow-md' 
                    : 'bg-studio-900 border-studio-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-black">Stems (Multi)</div>
                <div className="text-[9px] text-studio-500 mt-0.5">All Individual Tracks</div>
              </button>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="text-[10px] font-black uppercase text-studio-500 tracking-wider block mb-2">
              Timeline Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRange('full')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  range === 'full' 
                    ? 'bg-studio-800 border-white text-white' 
                    : 'bg-studio-900 border-studio-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">Entire Project</div>
                <div className="text-[9px] text-studio-500">From start to last clip end + tail</div>
              </button>

              <button
                onClick={() => setRange('loop')}
                disabled={!isLoopEnabled}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  range === 'loop' 
                    ? 'bg-studio-800 border-white text-white' 
                    : isLoopEnabled 
                    ? 'bg-studio-900 border-studio-800 text-zinc-400 hover:text-white'
                    : 'bg-studio-950 border-studio-900 text-studio-700 cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-bold">Loop Region Only</div>
                <div className="text-[9px] text-studio-500">
                  {isLoopEnabled ? 'Selected timeline loop bounds' : 'Enable loop to activate'}
                </div>
              </button>
            </div>
          </div>

          {/* Offline Rendering Notice */}
          <div className="bg-studio-900 p-3 rounded-xl border border-studio-800 text-[11px] text-zinc-400 leading-relaxed">
            Renders using browser's high-speed <span className="text-white font-bold">OfflineAudioContext</span> with all channel parametric EQs, compressors, aux reverb/delay, and master limiting intact.
          </div>

          {/* Render Action */}
          <button
            onClick={handleStartExport}
            disabled={isExporting}
            className="btn-primary w-full py-3 text-xs font-black tracking-wider flex items-center justify-center gap-2 mt-2"
          >
            {isExporting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>RENDERING MIXDOWN...</span>
              </>
            ) : exportComplete ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span>EXPORT COMPLETE!</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>RENDER & DOWNLOAD {format === 'stems' ? 'STEMS' : 'WAV'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
