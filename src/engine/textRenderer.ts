import { TextConfig } from '../types';

export const FONT_OPTIONS = [
  { name: 'Alfa Slab One', label: 'Varsity Block (Heavy)', family: "'Alfa Slab One', cursive" },
  { name: 'Bebas Neue', label: 'Athletic Condensed', family: "'Bebas Neue', sans-serif" },
  { name: 'Oswald', label: 'Heavyweight Sans', family: "'Oswald', sans-serif" },
  { name: 'Montserrat', label: 'Modern Geometric Bold', family: "'Montserrat', sans-serif" },
  { name: 'Cinzel', label: 'Classic Roman Serif', family: "'Cinzel', serif" },
  { name: 'Playfair Display', label: 'Luxury Display Serif', family: "'Playfair Display', serif" },
  { name: 'Alex Brush', label: 'Formal Calligraphy', family: "'Alex Brush', cursive" },
  { name: 'Great Vibes', label: 'Flowing Script', family: "'Great Vibes', cursive" },
  { name: 'Rye', label: 'Vintage Western', family: "'Rye', serif" },
  { name: 'Inter', label: 'Clean Technical', family: "'Inter', sans-serif" }
];

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
 * Render text to a canvas element and return the data URL and canvas
 */
export function renderTextToCanvas(config: TextConfig, targetWidth = 1000, targetHeight = 600): { canvas: HTMLCanvasElement; dataUrl: string } {
  if (typeof document === 'undefined') {
    return { canvas: { width: targetWidth, height: targetHeight } as HTMLCanvasElement, dataUrl: 'data:image/png;base64,placeholder' };
  }
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { canvas, dataUrl: '' };

  ctx.clearRect(0, 0, targetWidth, targetHeight);

  const textToDraw = config.uppercase ? config.text.toUpperCase() : config.text;
  const lines = textToDraw.split('\n');

  ctx.fillStyle = config.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;

  const centerX = targetWidth / 2;
  const centerY = targetHeight / 2;

  if (Math.abs(config.archAngle) > 2) {
    // Render curved/arched text
    renderArchedText(ctx, lines.join(' '), centerX, centerY, config);
  } else {
    // Standard multi-line rendering with letter spacing
    const totalHeight = lines.length * (config.fontSize * config.lineHeight);
    let startY = centerY - totalHeight / 2 + (config.fontSize * config.lineHeight) / 2;

    for (const line of lines) {
      drawSpacedText(ctx, line, centerX, startY, config.letterSpacing);
      startY += config.fontSize * config.lineHeight;
    }
  }

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png')
  };
}

function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number) {
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
