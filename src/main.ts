import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable all CORS
  app.enableCors();

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe());

  // Start server
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Adidas Superstar Backend running on http://localhost:${port}`);
  console.log(`� WebSocket Gateway available for real-time events`);
  console.log(`🖼️  Static files served from: http://localhost:${port}/public/outfits/`);
}

bootstrap();
