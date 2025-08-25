import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { AppController } from './controllers/app.controller';
import { SessionService } from './services/session.service';
import { EventsService } from './services/events.service';
import { EmailService } from './services/email.service';
import { ImageService } from './services/image.service';

@Module({
  imports: [
    // Serve static outfit files FIRST (more specific routes)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
      serveStaticOptions: {
        maxAge: 31536000000, // 1 year cache for outfit images
        immutable: true,
        setHeaders: (res, path) => {
          if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          }
        },
      },
    }),
    // Serve React build files from root path (fallback)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'superstar_front', 'build'),
      exclude: ['/api*', '/events*', '/session*', '/outfits*', '/health*', '/public*'],
    }),
    // Configure multer for file uploads - keep in memory for processing
    MulterModule.register({
      storage: require('multer').memoryStorage(), // Keep files in memory as buffers
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [AppController],
  providers: [SessionService, EventsService, EmailService, ImageService],
})
export class AppModule {}
