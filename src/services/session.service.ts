import { Injectable } from '@nestjs/common';
import { Session, OutfitSelection } from '../types/session.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SessionService {
  private sessions = new Map<string, Session>();
  private expiredSessions = new Set<string>(); // Track expired/sent sessions
  private outfitFiles: { [key: string]: string[] } = {};
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.loadOutfitFiles();
  }

  /**
   * Load all outfit files from public/outfits directory
   */
  private loadOutfitFiles() {
    const outfitsPath = path.join(process.cwd(), 'public', 'outfits');
    
    try {
      const files = fs.readdirSync(outfitsPath);
      
      // Group files by gender and part
      files.forEach((file) => {
        if (file.endsWith('.png') && !file.includes('Logo')) {
          const parts = file.replace('.png', '').split('_');
          if (parts.length === 3) {
            const [gender, part] = parts;
            const key = `${gender}_${part}`;
            
            if (!this.outfitFiles[key]) {
              this.outfitFiles[key] = [];
            }
            this.outfitFiles[key].push(file);
          }
        }
      });
      
      console.log('Loaded outfit files:', this.outfitFiles);
    } catch (error) {
      console.error('Error loading outfit files:', error);
      this.initializeEmptyOutfits();
    }
  }

  private initializeEmptyOutfits() {
    const genders = ['male', 'female', 'neutral'];
    const parts = ['head', 'top', 'bottom', 'shoes', 'left', 'right'];
    
    genders.forEach((gender) => {
      parts.forEach((part) => {
        this.outfitFiles[`${gender}_${part}`] = [];
      });
    });
  }

  /**
   * Create a new session with user photo and gender
   * Returns session with 90s timeout
   */
  createSession(
    gender: 'male' | 'female' | 'neutral',
    userPhoto: Buffer,
    onTimeout: (sessionId: string) => void,
  ): Session {
    const sessionId = this.generateSessionId();
    const selectedOutfits = this.selectRandomOutfits(gender);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90000); // 90 seconds
    
    const session: Session = {
      id: sessionId,
      gender,
      userPhoto,
      selectedOutfits,
      createdAt: now,
      expiresAt,
    };

    this.sessions.set(sessionId, session);
    
    // Set timeout for session expiry
    const timeout = setTimeout(() => {
      this.expireSession(sessionId);
      onTimeout(sessionId);
    }, 90000);
    
    this.sessionTimeouts.set(sessionId, timeout);
    
    console.log(`Session ${sessionId} created, expires at ${expiresAt.toISOString()}`);
    return session;
  }

  /**
   * Get session by ID - returns null if expired or doesn't exist
   */
  getSession(sessionId: string): Session | null {
    if (this.expiredSessions.has(sessionId)) {
      return null;
    }
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.expireSession(sessionId);
      return null;
    }
    
    return session;
  }

  /**
   * Mark session as used (after email sent) and clean up
   */
  markSessionAsUsed(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || this.expiredSessions.has(sessionId)) {
      return false;
    }
    
    // Clean up session data
    this.sessions.delete(sessionId);
    this.expiredSessions.add(sessionId);
    
    // Clear timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
    
    console.log(`Session ${sessionId} marked as used and cleaned up`);
    return true;
  }

  /**
   * Check if session is expired or already used
   */
  isSessionExpired(sessionId: string): boolean {
    return this.expiredSessions.has(sessionId) || !this.sessions.has(sessionId);
  }

  /**
   * Expire a session due to timeout
   */
  private expireSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.expiredSessions.add(sessionId);
      
      // Clear timeout
      const timeout = this.sessionTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.sessionTimeouts.delete(sessionId);
      }
      
      console.log(`Session ${sessionId} expired due to timeout`);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Select random outfits for a gender
   */
  private selectRandomOutfits(gender: string): OutfitSelection {
    const getRandomFile = (part: string): string => {
      const files = this.outfitFiles[`${gender}_${part}`] || [];
      if (files.length === 0) {
        return `${gender}_${part}_1.png`; // fallback
      }
      return files[Math.floor(Math.random() * files.length)];
    };

    return {
      head: getRandomFile('head'),
      top: getRandomFile('top'),
      bottom: getRandomFile('bottom'),
      shoes: getRandomFile('shoes'),
      left: getRandomFile('left'),
      right: getRandomFile('right'),
    };
  }

  /**
   * Get random outfits for idle mode (single gender consistency)
   */
  getRandomIdleOutfits(): OutfitSelection {
    // Pick a random gender first for consistency
    const genders = ['male', 'female', 'neutral'];
    const selectedGender = genders[Math.floor(Math.random() * genders.length)];
    
    const getRandomFileForGender = (part: string, gender: string): string => {
      const files = this.outfitFiles[`${gender}_${part}`] || [];
      if (files.length === 0) {
        return `${gender}_${part}_1.png`; // fallback
      }
      return files[Math.floor(Math.random() * files.length)];
    };

    return {
      head: getRandomFileForGender('head', selectedGender),
      top: getRandomFileForGender('top', selectedGender),
      bottom: getRandomFileForGender('bottom', selectedGender),
      shoes: getRandomFileForGender('shoes', selectedGender),
      left: getRandomFileForGender('left', selectedGender),
      right: getRandomFileForGender('right', selectedGender),
    };
  }

  /**
   * Get all outfit files grouped by category
   */
  getAllOutfitFiles(): { [key: string]: string[] } {
    return this.outfitFiles;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions (called periodically)
   */
  cleanupExpiredSessions() {
    const now = new Date();
    const expiredIds: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredIds.push(sessionId);
      }
    }
    
    expiredIds.forEach((sessionId) => this.expireSession(sessionId));
    
    if (expiredIds.length > 0) {
      console.log(`Cleaned up ${expiredIds.length} expired sessions`);
    }
  }
}
