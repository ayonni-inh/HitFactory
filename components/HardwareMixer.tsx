import React from 'react';
import { Track, MasteringSettings } from '../types';

interface HardwareMixerProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
  masterVolume: number;
  onUpdateMasterVolume: (volume: number) => void;
  meterLevels: { [trackId: string]: number };
}

export const HardwareMixer: React.FC<HardwareMixerProps> = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onUpdateTrackVolume,
  onUpdateTrackPan,
  masterVolume,
  onUpdateMasterVolume,
  meterLevels
}) => {
  // Use first 4 tracks (or pad to 4) to match the exact 4-fader console in the screenshot!
  const displayTracks = tracks.slice(0, 4);
  while (displayTracks.length < 4) {
    displayTracks.push({
      id: `virtual_${displayTracks.length}`,
      name: `Track ${displayTracks.length + 1}`,
      type: 'vocal',
      color: '#06b6d4',
      isMuted: false,
      isSolo: false,
      isArmed: false,
      volume: 0.8,
      pan: 0,
      effects: {} as any,
      clips: [],
      takes: []
    });
  }

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  return (
    <div className="w-56 shrink-0 bg-[#161720] border-l border-[#242633] p-4 flex flex-col justify-between select-none">
      {/* 1. Top Section: Hardware Dials & Horizontal Sliders */}
      <div className="flex flex-col gap-3.5">
        {/* Top Dual Dials */}
        <div className="flex items-center justify-between px-1">
          {/* Dial 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-[#1e202c] border border-[#2d3040] shadow-md flex items-center justify-center relative">
              {/* Outer notch marker */}
              <div 
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute top-1.5 shadow-[0_0_6px_rgba(34,211,238,0.8)]" 
              />
              <span className="text-[10px] font-mono font-bold text-zinc-300">0</span>
            </div>
          </div>

          {/* Dial 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-[#1e202c] border border-[#2d3040] shadow-md flex items-center justify-center relative">
              {/* Outer notch marker */}
              <div 
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute top-1.5 shadow-[0_0_6px_rgba(34,211,238,0.8)]" 
              />
              <span className="text-[10px] font-mono font-bold text-zinc-300">0</span>
            </div>
          </div>
        </div>

        {/* Horizontal Slider 1 (Track Pan / Trim) */}
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full bg-[#0d0e13] rounded-full overflow-hidden p-0.5 border border-[#222430]">
            <div 
              className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.7)]"
              style={{ width: `${Math.round(((selectedTrack?.pan ?? 0) + 1) * 50)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 px-0.5">
            <span>L</span>
            <span>PAN</span>
            <span>R</span>
          </div>
        </div>

        {/* Horizontal Slider 2 (Stereo Spread / Mix) */}
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full bg-[#0d0e13] rounded-full overflow-hidden p-0.5 border border-[#222430]">
            <div 
              className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.7)]"
              style={{ width: '70%' }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 px-0.5">
            <span>0</span>
            <span>WIDTH</span>
            <span>100</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#252735] my-2" />

      {/* 2. Lower Section: 4 Channel Vertical Hardware Faders Console with Green LED meters */}
      <div className="bg-[#121319] p-3 rounded-2xl border border-[#222431] shadow-inner flex justify-between items-end h-56">
        {displayTracks.map((trk, idx) => {
          const volume = trk.volume ?? 1.0;
          // Calculate fader position: volume 0 -> bottom (0%), volume 1.5 -> top (100%)
          const faderPercent = Math.min(100, Math.max(0, (volume / 1.5) * 100));
          const level = meterLevels[trk.id] || (idx === 1 ? 0.72 : idx === 2 ? 0.85 : 0.45);

          return (
            <div 
              key={trk.id} 
              className="flex flex-col items-center h-full justify-between w-9"
              onClick={() => onSelectTrack(trk.id)}
            >
              {/* Channel Fader + Meter Column */}
              <div className="relative w-8 flex-1 flex items-center justify-center my-1">
                {/* Vertical Recessed Groove */}
                <div className="absolute top-1 bottom-1 w-2 rounded-full fader-track-groove" />

                {/* Vertical Green LED Meter Bar directly beside track */}
                <div className="absolute left-6 top-1 bottom-1 w-1 bg-[#090a0e] rounded-full overflow-hidden flex flex-col justify-end border border-[#1b1d26]">
                  <div 
                    className="w-full meter-led-green transition-all duration-75"
                    style={{ height: `${Math.min(100, level * 100)}%` }}
                  />
                </div>

                {/* Tactile Metallic Hardware Fader Cap */}
                <div 
                  className="absolute w-6 h-5 fader-cap cursor-ns-resize shadow-xl z-20 transition-all duration-75 flex items-center justify-center"
                  style={{ bottom: `calc(${faderPercent}% - 10px)` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const startY = e.clientY;
                    const startVol = volume;

                    const handleMove = (moveEvent: MouseEvent) => {
                      const deltaY = startY - moveEvent.clientY;
                      const newVol = Math.max(0, Math.min(1.5, startVol + (deltaY / 120)));
                      onUpdateTrackVolume(trk.id, newVol);
                    };

                    const handleUp = () => {
                      window.removeEventListener('mousemove', handleMove);
                      window.removeEventListener('mouseup', handleUp);
                    };

                    window.addEventListener('mousemove', handleMove);
                    window.addEventListener('mouseup', handleUp);
                  }}
                />
              </div>

              {/* Bottom Track Channel Label */}
              <span className={`text-[8px] font-mono font-bold mt-1 uppercase truncate max-w-full text-center ${
                trk.id === selectedTrackId ? 'text-cyan-400 font-black' : 'text-zinc-500'
              }`}>
                {idx === 0 ? 'CH 1' : idx === 1 ? 'CH 2' : idx === 2 ? 'CH 3' : 'CH 4'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
