import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  // Hardcoded API key for simplicity - change this for production
  private readonly API_KEY = 'adidas-superstar-2025-secret';

  use(req: Request, res: Response, next: NextFunction) {
    // Skip API key check for health endpoint (for monitoring)
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }

    // Skip API key check for SSE events endpoint (EventSource can't send custom headers)
    if (req.path === '/events' || req.path === '/api/events') {
      return next();
    }

    // Skip API key check for static files (React frontend)
    if (
      req.path.startsWith('/static/') ||
      req.path.startsWith('/public/') ||
      req.path === '/favicon.ico' ||
      req.path === '/manifest.json' ||
      req.path === '/robots.txt' ||
      req.path === '/' ||
      req.path.endsWith('.html') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.jpg') ||
      req.path.endsWith('.gif') ||
      req.path.endsWith('.svg') ||
      req.path.endsWith('.ico')
    ) {
      return next();
    }

    // Check API key for API endpoints only
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey || apiKey !== this.API_KEY) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    next();
  }
}
