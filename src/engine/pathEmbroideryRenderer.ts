import { EmbroiderySettings } from '../types';
import { createRenderCanvas } from './renderCanvas';
import { StitchCommand, StitchPlan, StitchPoint } from './stitchPlanner';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseHex = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3 ? normalized.split('').map((character) => character + character).join('') : normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const toCss = (color: { r: number; g: number; b: number }, alpha = 1) =>
  `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(clamp(color.g, 0, 255))}, ${Math.round(clamp(color.b, 0, 255))}, ${clamp(alpha, 0, 1)})`;

const adjustColor = (hex: string, settings: EmbroiderySettings) => {
  const source = parseHex(hex);
  const contrast = (settings.contrast + 100) / 100;
  const brightness = 1 + settings.brightness / 100;
  const saturation = (settings.saturation + 100) / 100;
  let r = ((source.r - 128) * contrast + 128) * brightness;
  let g = ((source.g - 128) * contrast + 128) * brightness;
  let b = ((source.b - 128) * contrast + 128) * brightness;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = gray + (r - gray) * saturation;
  g = gray + (g - gray) * saturation;
  b = gray + (b - gray) * saturation;
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) };
};

const mix = (color: { r: number; g: number; b: number }, target: number, amount: number) => ({
  r: color.r + (target - color.r) * amount,
  g: color.g + (target - color.g) * amount,
  b: color.b + (target - color.b) * amount
});

const deterministicNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

const drawLine = (
  context: CanvasRenderingContext2D,
  start: StitchPoint,
  end: StitchPoint,
  strokeStyle: string | CanvasGradient,
  width: number,
  offsetX = 0,
  offsetY = 0
) => {
  context.beginPath();
  context.moveTo(start.x + offsetX, start.y + offsetY);
  context.lineTo(end.x + offsetX, end.y + offsetY);
  context.strokeStyle = strokeStyle;
  context.lineWidth = width;
  context.stroke();
};

const commandWidth = (command: StitchCommand, settings: EmbroiderySettings, outputScale: number) => {
  const base = Math.max(0.85, settings.threadThickness * 0.42) * outputScale;
  if (command.underlay) return base * 0.42;
  if (command.stitchType === 'running') return base * 0.48;
  if (command.stitchType === 'border') return base * Math.max(0.75, settings.borderThickness / 5);
  if (command.stitchType === 'satin') return base * 1.08;
  return base * 0.88;
};

const drawClassicSegment = (
  context: CanvasRenderingContext2D,
  start: StitchPoint,
  end: StitchPoint,
  command: StitchCommand,
  settings: EmbroiderySettings,
  outputScale: number,
  segmentIndex: number
) => {
  const color = adjustColor(command.color, settings);
  const width = commandWidth(command, settings, outputScale);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const lightRadians = (settings.lightAngle * Math.PI) / 180;
  const directional = normalX * Math.cos(lightRadians) + normalY * Math.sin(lightRadians);
  const highlightSide = directional >= 0 ? 1 : -1;

  drawLine(context, start, end, toCss(mix(color, 0, 0.34), command.underlay ? 0.28 : 0.9), width * 1.16);
  drawLine(context, start, end, toCss(color, command.underlay ? 0.42 : 1), width);
  drawLine(
    context,
    start,
    end,
    toCss(mix(color, 255, 0.72), command.underlay ? 0.1 : 0.46 + settings.specularStrength * 0.02),
    Math.max(0.35, width * 0.19),
    normalX * width * 0.2 * highlightSide,
    normalY * width * 0.2 * highlightSide
  );
  if (!command.underlay && segmentIndex % 3 === 0) {
    context.fillStyle = toCss(mix(color, 0, 0.48), 0.34);
    context.beginPath();
    context.arc(end.x, end.y, Math.max(0.28, width * 0.13), 0, Math.PI * 2);
    context.fill();
  }
};

const drawNaturalSegment = (
  context: CanvasRenderingContext2D,
  start: StitchPoint,
  end: StitchPoint,
  command: StitchCommand,
  settings: EmbroiderySettings,
  outputScale: number,
  segmentIndex: number
) => {
  const color = adjustColor(command.color, settings);
  const width = commandWidth(command, settings, outputScale) * 0.94;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const jitter = deterministicNoise(segmentIndex + command.regionId * 101) * width * 0.1;
  const shiftedStart = { x: start.x + normalX * jitter, y: start.y + normalY * jitter };
  const shiftedEnd = { x: end.x - normalX * jitter * 0.35, y: end.y - normalY * jitter * 0.35 };

  drawLine(context, shiftedStart, shiftedEnd, toCss(mix(color, 0, 0.42), command.underlay ? 0.2 : 0.72), width * 1.18);
  drawLine(context, shiftedStart, shiftedEnd, toCss(mix(color, 128, 0.04), command.underlay ? 0.36 : 0.94), width * 0.92);

  const fiberAlpha = command.underlay ? 0.08 : 0.25 + settings.specularStrength * 0.012;
  for (let fiber = -1; fiber <= 1; fiber++) {
    const phase = deterministicNoise(segmentIndex * 7 + fiber * 31 + command.regionId * 13);
    const offset = fiber * width * 0.2 + phase * width * 0.055;
    const fiberColor = fiber === -1 ? mix(color, 0, 0.3) : mix(color, 255, 0.5);
    drawLine(
      context,
      shiftedStart,
      shiftedEnd,
      toCss(fiberColor, fiberAlpha),
      Math.max(0.24, width * 0.095),
      normalX * offset,
      normalY * offset
    );
  }
  if (!command.underlay && segmentIndex % 4 === 0) {
    context.fillStyle = toCss(mix(color, 0, 0.52), 0.28);
    context.beginPath();
    context.arc(shiftedEnd.x, shiftedEnd.y, Math.max(0.25, width * 0.12), 0, Math.PI * 2);
    context.fill();
  }
};

/** Render real stitch coordinates with either of Raven's preserved thread styles. */
export const renderStitchPlan = (
  plan: StitchPlan,
  settings: EmbroiderySettings,
  targetScale = 1
) => {
  const width = Math.max(1, Math.round(plan.width * targetScale));
  const height = Math.max(1, Math.round(plan.height * targetScale));
  const scaleX = width / plan.analysisWidth;
  const scaleY = height / plan.analysisHeight;
  const outputScale = Math.sqrt(scaleX * scaleY);
  const threadCanvas = createRenderCanvas();
  threadCanvas.width = width;
  threadCanvas.height = height;
  const context = threadCanvas.getContext('2d', { alpha: true })!;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  let cursor: StitchPoint | null = null;
  let segmentIndex = 0;
  for (const command of plan.commands) {
    const point = { x: command.x * scaleX, y: command.y * scaleY };
    if (command.type === 'jump') {
      cursor = point;
      continue;
    }
    if (command.type === 'trim' || command.type === 'color-change') {
      cursor = null;
      continue;
    }
    if (!cursor) {
      cursor = point;
      continue;
    }
    // Underlay is part of the generated machine path but sits beneath the top
    // stitches in a finished sew-out. Exposing it in the beauty preview creates
    // false wires and tangles, especially in complex raster artwork.
    if (command.underlay) {
      cursor = point;
      continue;
    }
    if (settings.renderStyle === 'natural') {
      drawNaturalSegment(context, cursor, point, command, settings, outputScale, segmentIndex);
    } else {
      drawClassicSegment(context, cursor, point, command, settings, outputScale, segmentIndex);
    }
    cursor = point;
    segmentIndex++;
  }

  const finalCanvas = createRenderCanvas();
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalContext = finalCanvas.getContext('2d', { alpha: true })!;
  if (settings.shadowStrength > 0) {
    const shadowRadians = ((settings.lightAngle + 180) * Math.PI) / 180;
    finalContext.save();
    finalContext.shadowColor = `rgba(0, 0, 0, ${0.12 + settings.shadowStrength * 0.04})`;
    finalContext.shadowBlur = (2 + settings.shadowBlur * 0.55) * targetScale;
    finalContext.shadowOffsetX = Math.cos(shadowRadians) * (1 + settings.shadowDistance * 0.45) * targetScale;
    finalContext.shadowOffsetY = Math.sin(shadowRadians) * (1 + settings.shadowDistance * 0.45) * targetScale;
    finalContext.drawImage(threadCanvas, 0, 0);
    finalContext.restore();
  }
  finalContext.drawImage(threadCanvas, 0, 0);
  return finalCanvas;
};
