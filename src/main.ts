import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe());

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Adidas Superstar Backend running on http://localhost:${port}`);
  console.log(`📡 SSE Events endpoint: http://localhost:${port}/api/events`);
  console.log(`🖼️  Static files served from: http://localhost:${port}/public/outfits/`);
}

bootstrap();
