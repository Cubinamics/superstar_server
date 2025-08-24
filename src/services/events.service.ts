import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { SessionEvent } from '../types/session.interface';

interface SessionEventData {
  sessionId: string;
  gender: string;
  outfits: any;
  userPhotoToken: string;
}

@Injectable()
export class EventsService {
  private eventSubject = new Subject<SessionEvent>();
  private idleInterval: NodeJS.Timeout;

  constructor() {
    this.startIdleMode();
  }

  /**
   * Get event stream for SSE
   */
  getEventStream() {
    return this.eventSubject.asObservable();
  }

  /**
   * Emit session event to all monitors
   * STRICT SPEC: Proper session event format
   */
  emitSessionEvent(sessionData: SessionEventData) {
    this.stopIdleMode();
    this.eventSubject.next({
      type: 'session',
      data: {
        sessionId: sessionData.sessionId,
        gender: sessionData.gender,
        outfits: sessionData.outfits,
        userPhotoToken: sessionData.userPhotoToken,
      },
    });
  }

  /**
   * Emit timeout event and return to idle
   */
  emitTimeoutEvent() {
    this.eventSubject.next({
      type: 'idle',
    });
    this.startIdleMode();
  }

  /**
   * Start idle mode - emit random outfit changes every 10s
   */
  private startIdleMode() {
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
    }

    // Emit initial idle event
    this.eventSubject.next({
      type: 'idle',
    });

    // Continue emitting idle events every 10 seconds
    this.idleInterval = setInterval(() => {
      this.eventSubject.next({
        type: 'idle',
      });
    }, 10000);
  }

  /**
   * Stop idle mode
   */
  private stopIdleMode() {
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
  }

  /**
   * Return to idle mode (after email sent or timeout)
   */
  returnToIdle() {
    this.startIdleMode();
  }
}
