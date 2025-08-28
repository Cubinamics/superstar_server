import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SessionService } from '../services/session.service';
import { EventsService } from '../services/events.service';
import { EmailService } from '../services/email.service';
import { ImageService } from '../services/image.service';

@Controller()
export class AppController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly eventsService: EventsService,
    private readonly emailService: EmailService,
    private readonly imageService: ImageService,
  ) {}

  /**
   * Server-Sent Events endpoint for monitors
   */
  @Get('events')
  getEvents(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection confirmation
    res.write('data: {"type":"connected"}\n\n');

    // Subscribe to events
    const subscription = this.eventsService.getEventStream().subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (error) => {
        console.error('SSE error:', error);
        res.end();
      },
    });

    // Handle client disconnect
    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

    /**
   * Create new session with photo and gender
   * STRICT SPEC: Returns 201 Created with sessionId and ttlMs
   */
  @Post('session')
  @UseInterceptors(FileInterceptor('photo'))
  async createSession(
    @UploadedFile() photo: any,
    @Body('gender') gender: string,
  ) {
    if (!photo) {
      throw new BadRequestException('Photo is required');
    }

    if (!['male', 'female', 'neutral'].includes(gender)) {
      throw new BadRequestException(
        'Invalid gender. Must be male, female, or neutral',
      );
    }

    try {
      // Debug photo data
      console.log('Photo object:', {
        originalname: photo.originalname,
        mimetype: photo.mimetype,
        size: photo.size,
        bufferExists: !!photo.buffer,
        bufferLength: photo.buffer ? photo.buffer.length : 0
      });

      // Validate photo buffer
      if (!photo.buffer || photo.buffer.length === 0) {
        throw new BadRequestException('Photo buffer is empty or invalid');
      }

      // Create session with timeout callback
      const session = this.sessionService.createSession(
        gender as 'male' | 'female' | 'neutral',
        photo.buffer,
        (sessionId: string) => {
          // Session expired - emit timeout event
          console.log(`Session ${sessionId} timed out`);
          this.eventsService.emitTimeoutEvent();
        },
      );

      // Resize photo for web display
      const resizedPhoto = await this.imageService.resizeUserPhoto(
        photo.buffer,
      );
      const photoBase64 = resizedPhoto.toString('base64');

      // Emit session event to monitors with proper format
      this.eventsService.emitSessionEvent({
        sessionId: session.id,
        gender: session.gender,
        outfits: session.selectedOutfits,
        userPhotoToken: `data:image/jpeg;base64,${photoBase64}`,
      });

      // Return 201 Created as per spec
      return {
        sessionId: session.id,
        ttlMs: 90000,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new BadRequestException('Failed to create session');
    }
  }

  /**
   * Send email with snapshot
   * STRICT SPEC: Returns 202 Accepted, handles 410 Gone for expired sessions
   */
  @Post('session/:id/email')
  async sendEmail(
    @Param('id') sessionId: string,
    @Body('email') email: string,
  ) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }

    // Check if session is expired or already used (410 Gone)
    if (this.sessionService.isSessionExpired(sessionId)) {
      throw new HttpException('Session expired or already used', 410);
    }

    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    try {
      // Compose snapshot image IN RAM ONLY
      const snapshotBuffer = await this.imageService.composeSnapshot(
        session.userPhoto,
        session.selectedOutfits,
      );

      // Send email with snapshot attachment
      const emailSent = await this.emailService.sendSnapshotEmail(
        email,
        snapshotBuffer,
        sessionId,
      );

      if (!emailSent) {
        throw new BadRequestException('Failed to send email');
      }

      // IMMEDIATELY mark session as used and purge all data
      this.sessionService.markSessionAsUsed(sessionId);

      // Return to idle mode
      this.eventsService.returnToIdle();

      // Return 202 Accepted as per spec
      return {
        ok: true,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      
      if (error.status === 410) {
        throw error; // Re-throw 410 Gone
      }
      
      throw new BadRequestException('Failed to send email');
    }
  }

  /**
   * Skip session (user chose not to provide email)
   * STRICT SPEC: Returns 202 Accepted and immediately returns to idle
   */
  @Post('session/:id/skip')
  async skipSession(@Param('id') sessionId: string) {
    try {
      // Check if session exists and is valid
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new NotFoundException('Session not found or has expired');
      }

      // IMMEDIATELY mark session as used and purge all data
      this.sessionService.markSessionAsUsed(sessionId);

      // Return to idle mode immediately
      this.eventsService.returnToIdle();

      // Return 202 Accepted as per spec
      return {
        ok: true,
      };
    } catch (error) {
      console.error('Error skipping session:', error);
      
      if (error.status === 404) {
        throw error; // Re-throw 404 Not Found
      }
      
      throw new BadRequestException('Failed to skip session');
    }
  }

  /**
   * Get outfit files list (for frontend preloading)
   */
  @Get('outfits')
  getOutfitFiles() {
    return {
      files: this.sessionService.getAllOutfitFiles(),
      randomOutfits: this.sessionService.getRandomIdleOutfits(),
    };
  }

  /**
   * Health check
   */
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeSessions: this.sessionService.getActiveSessionsCount(),
    };
  }
}
