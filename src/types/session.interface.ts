export interface Session {
  id: string;
  gender: 'male' | 'female' | 'neutral';
  userPhoto: Buffer;
  selectedOutfits: OutfitSelection;
  createdAt: Date;
  expiresAt: Date;
  source?: 'mobile' | 'manual'; // Track upload source for rotation handling
}

export interface OutfitSelection {
  head: string | null; // null when frontend should use default Head.gif
  top: string;
  bottom: string;
  shoes: string;
  left: string;
  right: string;
}

export interface SessionEvent {
  type: 'idle' | 'session' | 'timeout';
  data?: {
    sessionId?: string;
    gender?: string;
    userPhotoToken?: string;
    outfits?: OutfitSelection;
    source?: string; // 'mobile' | 'manual'
  };
}
