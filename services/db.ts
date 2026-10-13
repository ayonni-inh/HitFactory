// IndexedDB storage service for AYONI STUDIO
// Stores project session state, metadata, and raw audio Blobs reliably offline.

import { Project } from '../types';

const DB_NAME = 'AyoniStudioDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_AUDIO = 'audio_blobs';

class ProjectDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
            db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_AUDIO)) {
            db.createObjectStore(STORE_AUDIO); // key: string (e.g. `clip_${clipId}` or `take_${takeId}`)
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      
      // Strip AudioBuffer instances from serialized project structure
      const serializedProject: Project = {
        ...project,
        updatedAt: Date.now(),
        tracks: project.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip => ({
            ...clip,
            audioBuffer: undefined, // AudioBuffer cannot be stored in IDB directly; blob is stored in STORE_AUDIO
            blob: undefined
          })),
          takes: track.takes.map(take => ({
            ...take,
            blob: undefined as any // Blob stored separately or cloned
          }))
        }))
      };

      const request = store.put(serializedProject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async listProjects(): Promise<Array<{ id: string; name: string; updatedAt: number; bpm: number; trackCount: number }>> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result as Project[];
        const summaries = projects.map(p => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt || p.createdAt,
          bpm: p.bpm,
          trackCount: p.tracks?.length || 0
        })).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(summaries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Audio Blob storage
  async saveAudioBlob(key: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAudioBlob(key: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const store = tx.objectStore(STORE_AUDIO);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAudioBlob(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      const store = tx.objectStore(STORE_AUDIO);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const projectDb = new ProjectDatabase();
