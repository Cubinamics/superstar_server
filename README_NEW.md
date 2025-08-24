# Adidas Superstar Experience - Backend

NestJS backend server for the interactive store experience.

## Features

- **Session Management**: Create and manage user sessions with photo uploads
- **Image Processing**: Compose snapshots using Sharp library
- **Server-Sent Events (SSE)**: Real-time communication with monitor displays
- **Email Service**: Send personalized snapshots via email
- **Static File Serving**: Serve outfit images for frontend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure your email settings in `.env`:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@adidas-superstar.com
   ```

4. Add outfit images to `public/outfits/` directory:
   - Logo images: `Logo_Left_static.png`, `Logo_Right_static.png`
   - Outfit images: `{gender}_{part}_{id}.png`
   - Example: `male_top_1.png`, `female_shoes_2.png`

5. Start the server:
   ```bash
   npm run start:dev
   ```

## API Endpoints

- `GET /events` - Server-Sent Events for monitors
- `POST /session` - Create session with photo upload
- `POST /session/:id/email` - Send email with snapshot
- `GET /outfits` - Get available outfit files
- `GET /health` - Health check
- `GET /public/outfits/*` - Static outfit images

## Architecture

- **In-memory storage**: No database required
- **90-second session timeout**: Sessions auto-expire
- **Image composition**: Combines user photo with outfit selections
- **Event broadcasting**: Notifies monitors of state changes

## File Structure

```
src/
├── controllers/         # API controllers
├── services/           # Business logic services
│   ├── session.service.ts    # Session management
│   ├── events.service.ts     # SSE event handling
│   ├── email.service.ts      # Email sending
│   └── image.service.ts      # Image processing
└── types/              # TypeScript interfaces
```
