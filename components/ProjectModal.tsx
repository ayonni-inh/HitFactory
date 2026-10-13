import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, X, Music, Clock, Sparkles } from 'lucide-react';
import { projectDb } from '../services/db';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onNewProject: (name: string, bpm: number) => void;
  onLoadProject: (id: string) => void;
  onLoadDemoProject: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onNewProject,
  onLoadProject,
  onLoadDemoProject
}) => {
  const [projects, setProjects] = useState<Array<{ id: string; name: string; updatedAt: number; bpm: number; trackCount: number }>>([]);
  const [newProjectName, setNewProjectName] = useState('New Vocal Session');
  const [newProjectBpm, setNewProjectBpm] = useState(128);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjectsList();
    }
  }, [isOpen]);

  const loadProjectsList = async () => {
    try {
      const list = await projectDb.listProjects();
      setProjects(list);
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this project from browser storage?")) {
      await projectDb.deleteProject(id);
      loadProjectsList();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-lg bg-studio-950 border border-studio-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 bg-studio-900 border-b border-studio-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-studio-accent" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Project Sessions
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-studio-500 hover:text-white p-1 rounded-lg hover:bg-studio-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Create New Project Section */}
          <div className="bg-studio-900 p-4 rounded-xl border border-studio-800 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-studio-500 tracking-wider">
              Create New Session
            </span>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Session Name"
                className="flex-1 bg-studio-950 text-xs font-bold text-white px-3 py-2 rounded-lg border border-studio-800 focus:outline-none focus:border-studio-accent"
              />
              <div className="flex items-center gap-1 bg-studio-950 px-2 py-1 rounded-lg border border-studio-800">
                <span className="text-[9px] font-mono text-studio-500">BPM</span>
                <input 
                  type="number"
                  value={newProjectBpm}
                  onChange={(e) => setNewProjectBpm(Number(e.target.value))}
                  min={60}
                  max={200}
                  className="w-12 bg-transparent text-xs font-bold font-mono text-white text-center focus:outline-none"
                />
              </div>
              <button 
                onClick={() => {
                  if (newProjectName.trim()) {
                    onNewProject(newProjectName.trim(), newProjectBpm);
                    onClose();
                  }
                }}
                className="btn-primary flex items-center gap-1.5 text-xs px-4"
              >
                <Plus size={14} />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Template */}
          <div className="bg-studio-900/60 p-3.5 rounded-xl border border-studio-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Load Starter Beat Session</span>
              </div>
              <p className="text-[10px] text-studio-500 mt-0.5">
                Preloads an 808 Trap beat, 140 BPM, ready to record vocals instantly.
              </p>
            </div>
            <button
              onClick={() => {
                onLoadDemoProject();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-bold text-zinc-200 border border-studio-700 transition-colors"
            >
              Load Demo
            </button>
          </div>

          {/* Existing Projects List */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-studio-500 tracking-wider">
              Saved Sessions in Browser ({projects.length})
            </span>

            {projects.length === 0 ? (
              <div className="p-8 text-center text-studio-500 text-xs">
                No saved projects found. Your sessions will be automatically stored here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map(p => (
                  <div 
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      p.id === currentProjectId 
                        ? 'bg-studio-900 border-studio-accent/40 shadow-sm' 
                        : 'bg-studio-900/60 border-studio-800 hover:border-studio-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.id === currentProjectId && (
                          <span className="text-[9px] uppercase font-bold text-studio-accent px-1.5 py-0.2 rounded bg-studio-accent/15 border border-studio-accent/30">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-studio-500 font-mono mt-1">
                        <span>{p.bpm} BPM</span>
                        <span>·</span>
                        <span>{p.trackCount} Tracks</span>
                        <span>·</span>
                        <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadProject(p.id);
                          onClose();
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-studio-800 hover:bg-studio-700 text-white transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1 text-studio-600 hover:text-rose-500 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
