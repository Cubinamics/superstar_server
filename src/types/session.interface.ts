export interface Session {
  id: string;
  gender: 'male' | 'female' | 'neutral';
  userPhoto: Buffer;
  selectedOutfits: OutfitSelection;
  createdAt: Date;
  expiresAt: Date;
}

export interface OutfitSelection {
  head: string;
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
  };
}
