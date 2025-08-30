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
   * New Layout: Perfect Cross pattern without logos
   * [Empty]        [User_Head]     [Empty]
   * [Outfit_Left]  [Outfit_Top]    [Outfit_Right]  
   * [Empty]        [Outfit_Bottom] [Empty]
   * [Empty]        [Outfit_Shoes]  [Empty]
   */
  async composeSnapshot(
    userPhotoBuffer: Buffer,
    outfits: OutfitSelection,
    autoRotate: boolean = true, // Default true for mobile compatibility
  ): Promise<Buffer> {
    try {
      // Grid configuration (3x4 layout for perfect cross)
      const gridCols = 3;
      const gridRows = 4; // Extended to 4 rows for shoes at bottom
      const cellWidth = 400;
      const cellHeight = 300;
      const gap = 10;
      const padding = 20;
      
      const canvasWidth = (cellWidth * gridCols) + (gap * (gridCols - 1)) + (padding * 2);
      const canvasHeight = (cellHeight * gridRows) + (gap * (gridRows - 1)) + (padding * 2); // Now taller

      // Create base canvas 
      const canvas = sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 } 
        },
      });

      const composite: sharp.OverlayOptions[] = [];

      // Helper function to calculate grid position
      const getGridPosition = (row: number, col: number) => ({
        top: padding + (row * (cellHeight + gap)),
        left: padding + (col * (cellWidth + gap)),
      });

      // Row 0, Col 1: User Head (center top) - Main focal point
      const { top: headTop, left: headLeft } = getGridPosition(0, 1);
      let userPhotoProcessor = sharp(userPhotoBuffer);
      
      // Only auto-rotate for mobile photos (when autoRotate is true)
      // Mobile photos need -90-degree rotation to be upright in the email
      if (autoRotate) {
        userPhotoProcessor = userPhotoProcessor.rotate(-90);
      }
      
      // Resize after rotation using 'contain' to preserve aspect ratio without cropping
      userPhotoProcessor = userPhotoProcessor.resize(cellWidth, cellHeight, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } 
      });
      
      const userPhotoResized = await userPhotoProcessor.toBuffer();

      composite.push({
        input: userPhotoResized,
        top: headTop,
        left: headLeft,
      });

      // Row 1, Col 0: Left Outfit (left arm position)
      if (outfits.left) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', outfits.left);
        if (fs.existsSync(outfitPath)) {
          const { top, left } = getGridPosition(1, 0);
          const outfitResized = await sharp(outfitPath)
            .resize(cellWidth, cellHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          composite.push({ input: outfitResized, top, left });
        }
      }

      // Row 1, Col 1: Top Outfit (torso/chest position)
      if (outfits.top) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', outfits.top);
        if (fs.existsSync(outfitPath)) {
          const { top, left } = getGridPosition(1, 1);
          const outfitResized = await sharp(outfitPath)
            .resize(cellWidth, cellHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          composite.push({ input: outfitResized, top, left });
        }
      }

      // Row 1, Col 2: Right Outfit (right arm position)
      if (outfits.right) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', outfits.right);
        if (fs.existsSync(outfitPath)) {
          const { top, left } = getGridPosition(1, 2);
          const outfitResized = await sharp(outfitPath)
            .resize(cellWidth, cellHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          composite.push({ input: outfitResized, top, left });
        }
      }

      // Row 2, Col 1: Bottom Outfit (legs/pants position)
      if (outfits.bottom) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', outfits.bottom);
        if (fs.existsSync(outfitPath)) {
          const { top, left } = getGridPosition(2, 1);
          const outfitResized = await sharp(outfitPath)
            .resize(cellWidth, cellHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          composite.push({ input: outfitResized, top, left });
        }
      }

      // Row 3, Col 1: Shoes (feet position - bottom of cross)
      if (outfits.shoes) {
        const outfitPath = path.join(process.cwd(), 'public', 'outfits', outfits.shoes);
        if (fs.existsSync(outfitPath)) {
          const { top, left } = getGridPosition(3, 1); // Row 3 for perfect cross shape
          const outfitResized = await sharp(outfitPath)
            .resize(cellWidth, cellHeight, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .toBuffer();
          composite.push({ input: outfitResized, top, left });
        }
      }

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
  async resizeUserPhoto(buffer: Buffer, maxWidth = 800, maxHeight = 1000): Promise<Buffer> {
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
      // Get image metadata to preserve format
      const metadata = await sharp(buffer).metadata();
      const isJpeg = metadata.format === 'jpeg';
      
      const processedImage = sharp(buffer)
        .resize(maxWidth, maxHeight, { 
          fit: 'inside', 
          withoutEnlargement: false,
          // Use high-quality resampling
          kernel: sharp.kernel.lanczos3 
        });

      // Preserve original format with high quality
      if (isJpeg) {
        return processedImage
          .jpeg({ quality: 95, mozjpeg: true })
          .toBuffer();
      } else {
        // For PNG/other formats, keep as PNG for better quality
        return processedImage
          .png({ quality: 100, compressionLevel: 6 })
          .toBuffer();
      }
    } catch (error) {
      console.error('Sharp error details:', error);
      throw error;
    }
  }
}
