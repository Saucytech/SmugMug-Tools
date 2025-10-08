// Photo Analysis Session Management
// Uses localStorage for persistent analysis state across page reloads

export interface AnalyzedPhoto {
  imageKey: string;
  fileName: string;
  thumbnailUrl: string;
  title?: string;
  caption?: string;
  keywords?: string[];
  sourceGallery: {
    key: string;
    name: string;
  };
  suggestedDestination: {
    key: string;
    name: string;
    path: string;
  };
  confidence: number;
  reasoning?: string;
  status: 'pending' | 'moved' | 'copied' | 'ignored';
  processedAt?: string;
}

export interface AnalysisSession {
  id: string;
  sourceGalleryKeys: string[];
  sourceGalleryNames: string[];
  analyzedAt: string;
  analysisType: 'sort' | 'cull';
  photos: AnalyzedPhoto[];
  totalPhotos: number;
  pendingCount: number;
  movedCount: number;
  copiedCount: number;
  ignoredCount: number;
  lastViewedAt: string;
  completedAt?: string;
}

const STORAGE_KEY = 'photo_organizer_analyses';

export const analysisStorage = {
  // Get all analysis sessions
  getAllSessions(): AnalysisSession[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Get session by ID
  getSession(id: string): AnalysisSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  },

  // Get most recent incomplete session for given galleries
  getRecentIncompleteSession(galleryKeys: string[]): AnalysisSession | null {
    const sessions = this.getAllSessions();
    const sortedKeys = [...galleryKeys].sort();

    return sessions
      .filter(s => {
        const sessionKeys = [...s.sourceGalleryKeys].sort();
        return JSON.stringify(sessionKeys) === JSON.stringify(sortedKeys) && !s.completedAt;
      })
      .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())[0] || null;
  },

  // Create new analysis session
  createSession(session: Omit<AnalysisSession, 'id' | 'analyzedAt' | 'lastViewedAt' | 'pendingCount' | 'movedCount' | 'copiedCount' | 'ignoredCount'>): AnalysisSession {
    const newSession: AnalysisSession = {
      ...session,
      id: this.generateId(),
      analyzedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
      pendingCount: session.photos.length,
      movedCount: 0,
      copiedCount: 0,
      ignoredCount: 0,
    };

    const sessions = this.getAllSessions();
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  },

  // Update photo status in a session
  updatePhotoStatus(
    sessionId: string,
    imageKey: string,
    status: 'pending' | 'moved' | 'copied' | 'ignored'
  ): void {
    const sessions = this.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      const photo = session.photos.find(p => p.imageKey === imageKey);
      if (photo) {
        photo.status = status;
        photo.processedAt = new Date().toISOString();

        // Recalculate counts
        session.pendingCount = session.photos.filter(p => p.status === 'pending').length;
        session.movedCount = session.photos.filter(p => p.status === 'moved').length;
        session.copiedCount = session.photos.filter(p => p.status === 'copied').length;
        session.ignoredCount = session.photos.filter(p => p.status === 'ignored').length;

        session.lastViewedAt = new Date().toISOString();

        // Mark as completed if all photos are processed
        if (session.pendingCount === 0) {
          session.completedAt = new Date().toISOString();
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    }
  },

  // Bulk update photo statuses
  updatePhotoStatusBulk(
    sessionId: string,
    imageKeys: string[],
    status: 'pending' | 'moved' | 'copied' | 'ignored'
  ): void {
    const sessions = this.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      const now = new Date().toISOString();

      imageKeys.forEach(imageKey => {
        const photo = session.photos.find(p => p.imageKey === imageKey);
        if (photo) {
          photo.status = status;
          photo.processedAt = now;
        }
      });

      // Recalculate counts
      session.pendingCount = session.photos.filter(p => p.status === 'pending').length;
      session.movedCount = session.photos.filter(p => p.status === 'moved').length;
      session.copiedCount = session.photos.filter(p => p.status === 'copied').length;
      session.ignoredCount = session.photos.filter(p => p.status === 'ignored').length;

      session.lastViewedAt = now;

      // Mark as completed if all photos are processed
      if (session.pendingCount === 0) {
        session.completedAt = now;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  },

  // Update last viewed timestamp
  touchSession(sessionId: string): void {
    const sessions = this.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      session.lastViewedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  },

  // Delete session
  deleteSession(id: string): void {
    const sessions = this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Delete old completed sessions (keep last 10)
  cleanupOldSessions(): void {
    const sessions = this.getAllSessions();
    const completed = sessions.filter(s => s.completedAt).sort((a, b) =>
      new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
    );

    const incomplete = sessions.filter(s => !s.completedAt);

    // Keep last 10 completed sessions
    const toKeep = [...incomplete, ...completed.slice(0, 10)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toKeep));
  },

  // Generate unique ID
  generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Get statistics for a session
  getSessionStats(sessionId: string): {
    total: number;
    pending: number;
    moved: number;
    copied: number;
    ignored: number;
    percentComplete: number;
  } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      total: session.totalPhotos,
      pending: session.pendingCount,
      moved: session.movedCount,
      copied: session.copiedCount,
      ignored: session.ignoredCount,
      percentComplete: Math.round(((session.movedCount + session.copiedCount + session.ignoredCount) / session.totalPhotos) * 100),
    };
  },
};
