import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { OutfitSelection } from '../types/session.interface';

@Injectable()
export class ImageService {
  private logoLeftPath: string;
  private logoRightPath: string;

  constructor() {
    this.logoLeftPath = path.join(process.cwd(), 'public', 'outfits', 'Logo_Left_static.png');
    this.logoRightPath = path.join(process.cwd(), 'public', 'outfits', 'Logo_Right_static.png');
  }

  /**
   * Compose final snapshot image
   * Layout: [Logo_Left] [User_Photo] [Outfit_Parts] [Logo_Right]
   */
  async composeSnapshot(
    userPhotoBuffer: Buffer,
    outfits: OutfitSelection,
  ): Promise<Buffer> {
    try {
      const canvasWidth = 1920;
      const canvasHeight = 1080;
      const partWidth = 300;
      const partHeight = 400;

      // Create base canvas
      const canvas = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      });

      const composite: sharp.OverlayOptions[] = [];

      // Add logos (if they exist)
      if (fs.existsSync(this.logoLeftPath)) {
        composite.push({
          input: await sharp(this.logoLeftPath)
            .resize(200, 200, { fit: 'inside' })
            .toBuffer(),
          top: 50,
          left: 50,
        });
      }

      if (fs.existsSync(this.logoRightPath)) {
        composite.push({
          input: await sharp(this.logoRightPath)
            .resize(200, 200, { fit: 'inside' })
            .toBuffer(),
          top: 50,
          left: canvasWidth - 250,
        });
      }

      // Add outfit parts first (background layer) - positioned around the head
      const outfitPositions = [
        { file: outfits.top, top: 600, left: 600 }, // Move top outfit lower to avoid head
        { file: outfits.bottom, top: 800, left: 600 }, // Bottom outfit at bottom
        { file: outfits.left, top: 400, left: 200 }, // Left side outfit
        { file: outfits.right, top: 400, left: 1300 }, // Right side outfit  
        { file: outfits.shoes, top: 900, left: 600 }, // Shoes at very bottom
      ];

      for (const pos of outfitPositions) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', pos.file);
        if (fs.existsSync(outfitPath)) {
          try {
            const outfitResized = await sharp(outfitPath)
              .resize(partWidth, partHeight, { fit: 'inside' })
              .toBuffer();

            composite.push({
              input: outfitResized,
              top: pos.top,
              left: pos.left,
            });
          } catch (error) {
            console.warn(`Failed to process outfit image ${pos.file}:`, error);
          }
        }
      }

      // Add user photo at the top (head position)
      const userPhotoResized = await sharp(userPhotoBuffer)
        .resize(400, 400, { fit: 'cover' }) // Make it square for head
        .rotate() // Auto-rotate based on EXIF data
        .toBuffer();

      composite.push({
        input: userPhotoResized,
        top: 150, // Position at top of canvas
        left: Math.floor((canvasWidth - 400) / 2), // Center horizontally
      });

      // Compose final image
      const finalImage = await canvas.composite(composite).png().toBuffer();

      return finalImage;
    } catch (error) {
      console.error('Error composing snapshot:', error);
      // Return a simple fallback image
      return this.createFallbackImage();
    }
  }

  /**
   * Create a simple fallback image when composition fails
   */
  private async createFallbackImage(): Promise<Buffer> {
    const fallbackSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#333">
          Adidas Superstar Experience
        </text>
        <text x="50%" y="60%" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">
          Thank you for your visit!
        </text>
      </svg>
    `;

    return sharp(Buffer.from(fallbackSvg)).png().toBuffer();
  }

  /**
   * Resize user photo for web display
   */
  async resizeUserPhoto(buffer: Buffer, maxWidth = 300, maxHeight = 400): Promise<Buffer> {
    console.log('ImageService.resizeUserPhoto called with:', {
      bufferExists: !!buffer,
      bufferLength: buffer ? buffer.length : 0,
      bufferType: typeof buffer,
      isBuffer: Buffer.isBuffer(buffer),
      firstBytes: buffer ? Array.from(buffer.slice(0, 10)) : []
    });

    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid buffer: buffer is null or empty');
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer: not a Buffer instance');
    }

    try {
      return sharp(buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Sharp error details:', error);
      throw error;
    }
  }
}
