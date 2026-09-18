import { TextConfig } from '../types';
import { BUILTIN_FONTS, FontOption } from './fontManager';

export const FONT_OPTIONS: FontOption[] = BUILTIN_FONTS;

export const DEFAULT_TEXT_CONFIG: TextConfig = {
  text: 'RAVEN STUDIO',
  fontFamily: "'Alfa Slab One', cursive",
  fontSize: 80,
  fontWeight: 'bold',
  color: '#FDB813',
  letterSpacing: 4,
  lineHeight: 1.1,
  textAlign: 'center',
  archAngle: 0,
  uppercase: true
};

/**
 * Trim transparent boundary pixels from canvas so custom text graphics
 * are centered and framed nicely without giant blank padding.
 */
export function trimTextCanvas(canvas: HTMLCanvasElement, padding = 24): HTMLCanvasElement {
  if (typeof document === 'undefined') return canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return canvas;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const { data } = imgData;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If completely blank or no text detected, return original
    if (maxX < minX || maxY < minY) {
      return canvas;
    }

    // Apply safety padding
    const boundMinX = Math.max(0, minX - padding);
    const boundMinY = Math.max(0, minY - padding);
    const boundMaxX = Math.min(width - 1, maxX + padding);
    const boundMaxY = Math.min(height - 1, maxY + padding);

    const croppedWidth = boundMaxX - boundMinX + 1;
    const croppedHeight = boundMaxY - boundMinY + 1;

    // Minimum size to prevent 1px anomalies
    if (croppedWidth < 10 || croppedHeight < 10) return canvas;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = croppedWidth;
    trimmedCanvas.height = croppedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');

    if (trimmedCtx) {
      trimmedCtx.drawImage(
        canvas,
        boundMinX,
        boundMinY,
        croppedWidth,
        croppedHeight,
        0,
        0,
        croppedWidth,
        croppedHeight
      );
      return trimmedCanvas;
    }
  } catch {
    // If security error (cross-origin) or memory error, fall back gracefully
  }

  return canvas;
}

/**
 * Render text to a canvas element and return the data URL and trimmed canvas
 * Supersamples vector typography at 3x Ultra-HD density so threads and curves remain
 * razor-sharp at high zoom levels in both the embroidery engine and garment mockups.
 */
export function renderTextToCanvas(
  config: TextConfig,
  baseWidth = 1400,
  baseHeight = 900,
  supersample = 3.0
): { canvas: HTMLCanvasElement; dataUrl: string; logicalWidth: number; logicalHeight: number } {
  const scaledWidth = Math.round(baseWidth * supersample);
  const scaledHeight = Math.round(baseHeight * supersample);

  if (typeof document === 'undefined') {
    return {
      canvas: { width: scaledWidth, height: scaledHeight } as HTMLCanvasElement,
      dataUrl: 'data:image/png;base64,placeholder',
      logicalWidth: baseWidth,
      logicalHeight: baseHeight
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas, dataUrl: '', logicalWidth: baseWidth, logicalHeight: baseHeight };

  ctx.clearRect(0, 0, scaledWidth, scaledHeight);

  const textToDraw = config.uppercase ? config.text.toUpperCase() : config.text;
  const lines = textToDraw.split('\n');

  const scaledFontSize = Math.round(config.fontSize * supersample);
  const scaledLetterSpacing = config.letterSpacing * supersample;
  const scaledConfig: TextConfig = {
    ...config,
    fontSize: scaledFontSize,
    letterSpacing: scaledLetterSpacing
  };

  ctx.fillStyle = config.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${config.fontWeight} ${scaledFontSize}px ${config.fontFamily}`;

  const centerX = scaledWidth / 2;
  const centerY = scaledHeight / 2;

  if (Math.abs(config.archAngle) > 2) {
    // Render curved/arched text
    renderArchedText(ctx, lines.join(' '), centerX, centerY, scaledConfig);
  } else {
    // Standard multi-line rendering with letter spacing
    const totalHeight = lines.length * (scaledFontSize * config.lineHeight);
    let startY = centerY - totalHeight / 2 + (scaledFontSize * config.lineHeight) / 2;

    for (const line of lines) {
      drawSpacedText(ctx, line, centerX, startY, scaledLetterSpacing);
      startY += scaledFontSize * config.lineHeight;
    }
  }

  // Auto-crop to content for tight, professional embroidery layout
  const croppedCanvas = trimTextCanvas(canvas, Math.round(32 * supersample));
  const logicalWidth = Math.max(1, Math.round(croppedCanvas.width / supersample));
  const logicalHeight = Math.max(1, Math.round(croppedCanvas.height / supersample));

  return {
    canvas: croppedCanvas,
    dataUrl: croppedCanvas.toDataURL('image/png'),
    logicalWidth,
    logicalHeight
  };
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
) {
  if (letterSpacing === 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  let totalWidth = 0;
  const charWidths = chars.map(char => {
    const w = ctx.measureText(char).width;
    totalWidth += w + letterSpacing;
    return w;
  });
  totalWidth -= letterSpacing; // remove trailing spacing

  let currentX = x - totalWidth / 2;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const w = charWidths[i];
    ctx.fillText(char, currentX + w / 2, y);
    currentX += w + letterSpacing;
  }
}

function renderArchedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  config: TextConfig
) {
  const chars = Array.from(text);
  if (chars.length === 0) return;

  const archRad = (config.archAngle * Math.PI) / 180;
  const isConvex = config.archAngle > 0;

  // Calculate approximate radius based on text length and arch angle
  const totalLength = ctx.measureText(text).width + (chars.length - 1) * config.letterSpacing;
  const radius = Math.max(120, Math.abs(totalLength / archRad));

  const centerOffset = isConvex ? centerY + radius - config.fontSize : centerY - radius + config.fontSize;
  const charAngleStep = archRad / Math.max(1, chars.length - 1);
  const startAngle = -archRad / 2;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const angle = startAngle + i * charAngleStep;

    ctx.save();
    if (isConvex) {
      ctx.translate(
        centerX + Math.sin(angle) * radius,
        centerOffset - Math.cos(angle) * radius
      );
      ctx.rotate(angle);
    } else {
      ctx.translate(
        centerX + Math.sin(-angle) * radius,
        centerOffset + Math.cos(-angle) * radius
      );
      ctx.rotate(-angle + Math.PI);
    }

    ctx.fillText(char, 0, 0);
    ctx.restore();
  }
}
