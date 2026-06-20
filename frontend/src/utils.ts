import type { BackgroundStar, ScreenPoint, CurvePoint, StabilityMetrics, StabilityLevel } from './types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(p1: ScreenPoint, p2: ScreenPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateBackgroundStars(count: number, width: number, height: number): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  const colors = [
    '#ffffff', '#f8f7ff', '#e8f4ff', '#fff4e6',
    '#ffe8e8', '#e8ffe8', '#f0f0ff'
  ];

  for (let i = 0; i < count; i++) {
    const z = Math.random();
    stars.push({
      x: Math.random() * width * 2 - width * 0.5,
      y: Math.random() * height * 2 - height * 0.5,
      z,
      size: 0.3 + z * 1.8,
      baseBrightness: 0.2 + z * 0.6,
      twinkleSpeed: 0.5 + Math.random() * 2,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  return stars;
}

export function smoothPath(points: CurvePoint[], tension: number = 0.5): CurvePoint[] {
  if (points.length < 3) return [...points];

  const result: CurvePoint[] = [];
  const n = points.length;

  result.push({ x: points[0].x, y: points[0].y, t: 0 });

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(n - 1, i + 1)];
    const p3 = points[Math.min(n - 1, i + 2)];

    const steps = 12;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        tension * 2 * p1.x +
        (-p0.x + p2.x) * tension * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tension * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tension * t3;

      const y =
        tension * 2 * p1.y +
        (-p0.y + p2.y) * tension * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tension * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tension * t3;

      result.push({ x, y });
    }
  }

  return result;
}

export function quadraticBezier(
  p0: ScreenPoint,
  p1: ScreenPoint,
  p2: ScreenPoint,
  steps: number = 30
): CurvePoint[] {
  const result: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    result.push({ x, y, t });
  }
  return result;
}

export function cubicBezier(
  p0: ScreenPoint,
  p1: ScreenPoint,
  p2: ScreenPoint,
  p3: ScreenPoint,
  steps: number = 40
): CurvePoint[] {
  const result: CurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;
    result.push({ x, y, t });
  }
  return result;
}

export function simplifyPath(points: ScreenPoint[], tolerance: number = 3): ScreenPoint[] {
  if (points.length < 3) return [...points];

  const result: ScreenPoint[] = [points[0]];
  let lastAdded = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const d = distance(points[i], lastAdded);
    if (d >= tolerance) {
      result.push(points[i]);
      lastAdded = points[i];
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function rotatePoint(
  point: ScreenPoint,
  center: ScreenPoint,
  angle: number
): ScreenPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function colorToRgb(color: string): { r: number; g: number; b: number } {
  const hex = color.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateStability(
  rawPoints: CurvePoint[],
  startPoint: ScreenPoint,
  endPoint: ScreenPoint
): StabilityMetrics {
  const sampleCount = rawPoints.length;
  const straightDist = distance(startPoint, endPoint);

  const points: ScreenPoint[] = [startPoint, ...rawPoints, endPoint];

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += distance(points[i - 1], points[i]);
  }
  if (pathLength < 1e-6 && straightDist < 1e-6) pathLength = 0;

  const lengthRatio = straightDist > 1e-6 ? pathLength / straightDist : 1;
  const excess = Math.max(0, lengthRatio - 1);
  const lengthScore = 1 / (1 + excess * 2);

  let totalTurnAngle = 0;
  let maxTurnAngle = 0;
  let turnCount = 0;
  for (let i = 2; i < points.length; i++) {
    const v1x = points[i - 1].x - points[i - 2].x;
    const v1y = points[i - 1].y - points[i - 2].y;
    const v2x = points[i].x - points[i - 1].x;
    const v2y = points[i].y - points[i - 1].y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 > 1e-6 && len2 > 1e-6) {
      const dot = clamp((v1x * v2x + v1y * v2y) / (len1 * len2), -1, 1);
      const angle = Math.acos(dot);
      totalTurnAngle += angle;
      if (angle > maxTurnAngle) maxTurnAngle = angle;
      turnCount++;
    }
  }
  const avgTurnAngle = turnCount > 0 ? totalTurnAngle / turnCount : 0;
  const jitterScore = Math.exp(-avgTurnAngle * 2.3);

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const lineLenSq = dx * dx + dy * dy;

  let totalDeviation = 0;
  let maxDeviation = 0;
  for (const pt of points) {
    const t = lineLenSq > 0
      ? clamp(((pt.x - startPoint.x) * dx + (pt.y - startPoint.y) * dy) / lineLenSq, 0, 1)
      : 0;
    const projX = startPoint.x + t * dx;
    const projY = startPoint.y + t * dy;
    const dev = Math.sqrt((pt.x - projX) ** 2 + (pt.y - projY) ** 2);
    totalDeviation += dev;
    if (dev > maxDeviation) maxDeviation = dev;
  }
  const avgDeviation = points.length > 0 ? totalDeviation / points.length : 0;
  const normalizedDeviation = straightDist > 1e-6 ? avgDeviation / straightDist : 0;
  const deviationScore = Math.exp(-normalizedDeviation * 8);

  const overallScore = lengthScore * 0.3 + jitterScore * 0.35 + deviationScore * 0.35;

  let level: StabilityLevel;
  if (overallScore >= 0.75) {
    level = 'stable';
  } else if (overallScore >= 0.45) {
    level = 'shaky';
  } else {
    level = 'chaotic';
  }

  return {
    sampleCount,
    pathLength,
    straightDist,
    lengthRatio,
    lengthScore,
    avgTurnAngle,
    maxTurnAngle,
    jitterScore,
    avgDeviation,
    maxDeviation,
    normalizedDeviation,
    deviationScore,
    overallScore,
    level
  };
}

export function stabilityToDescription(level: StabilityLevel): string {
  switch (level) {
    case 'stable':
      return '稳定';
    case 'shaky':
      return '摇晃';
    case 'chaotic':
      return '紊乱';
  }
}

export function stabilityToColor(level: StabilityLevel): string {
  switch (level) {
    case 'stable':
      return '#7fffbf';
    case 'shaky':
      return '#ffd700';
    case 'chaotic':
      return '#ff8c5a';
  }
}

export interface StabilityAggregation {
  level: StabilityLevel;
  avgScore: number;
  stableCount: number;
  shakyCount: number;
  chaoticCount: number;
  avgLengthRatio: number;
  avgTurnAngle: number;
  avgDeviation: number;
  totalCount: number;
}

export interface StabilitySummary {
  avgScore: number;
  level: string;
  stableCount: number;
  shakyCount: number;
  chaoticCount: number;
  totalCount: number;
  avgLengthRatio: number;
  avgTurnAngle: number;
  avgDeviation: number;
  lastLineDesc?: string;
  lastLineLevel?: string;
  lastLineMetrics?: StabilityMetrics;
}

export function aggregateStability(
  connections: { stability?: StabilityMetrics; valid?: boolean }[]
): StabilityAggregation {
  const withStability = connections.filter(c => c.stability && c.valid);
  if (withStability.length === 0) {
    return {
      level: 'stable', avgScore: 0, stableCount: 0, shakyCount: 0, chaoticCount: 0,
      avgLengthRatio: 0, avgTurnAngle: 0, avgDeviation: 0, totalCount: 0
    };
  }

  let stableCount = 0, shakyCount = 0, chaoticCount = 0;
  let totalScore = 0;
  let totalLengthRatio = 0;
  let totalTurnAngle = 0;
  let totalDeviation = 0;

  for (const c of withStability) {
    const s = c.stability!;
    totalScore += s.overallScore;
    totalLengthRatio += s.lengthRatio;
    totalTurnAngle += s.avgTurnAngle;
    totalDeviation += s.avgDeviation;
    if (s.level === 'stable') stableCount++;
    else if (s.level === 'shaky') shakyCount++;
    else chaoticCount++;
  }

  const n = withStability.length;
  const avgScore = totalScore / n;
  const avgLengthRatio = totalLengthRatio / n;
  const avgTurnAngle = totalTurnAngle / n;
  const avgDeviation = totalDeviation / n;

  let level: StabilityLevel;
  if (avgScore >= 0.75) level = 'stable';
  else if (avgScore >= 0.45) level = 'shaky';
  else level = 'chaotic';

  return {
    level, avgScore, stableCount, shakyCount, chaoticCount,
    avgLengthRatio, avgTurnAngle, avgDeviation, totalCount: n
  };
}

export interface StabilityCaseResult {
  name: string;
  rawPoints: CurvePoint[];
  start: ScreenPoint;
  end: ScreenPoint;
  metrics: StabilityMetrics;
  passed: boolean;
  reason: string;
}

export function validateStabilityCases(): StabilityCaseResult[] {
  const cases: Array<{
    name: string;
    rawPoints: CurvePoint[];
    start: ScreenPoint;
    end: ScreenPoint;
    expectLevel: StabilityLevel;
  }> = [
    {
      name: '短直线(3采样)',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      rawPoints: [
        { x: 25, y: 1 },
        { x: 50, y: -1 },
        { x: 75, y: 1 }
      ],
      expectLevel: 'stable'
    },
    {
      name: '短弯线(3采样)',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      rawPoints: [
        { x: 25, y: 15 },
        { x: 50, y: 20 },
        { x: 75, y: 15 }
      ],
      expectLevel: 'shaky'
    },
    {
      name: '长绕线(多采样)',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      rawPoints: [
        { x: 10, y: 50 }, { x: 20, y: 80 }, { x: 30, y: 40 },
        { x: 40, y: -30 }, { x: 50, y: 70 }, { x: 60, y: 20 },
        { x: 70, y: -40 }, { x: 80, y: 60 }, { x: 90, y: 30 }
      ],
      expectLevel: 'chaotic'
    }
  ];

  const results: StabilityCaseResult[] = [];
  for (const c of cases) {
    const metrics = evaluateStability(c.rawPoints, c.start, c.end);
    const passed = metrics.level === c.expectLevel;
    const reason = passed
      ? `符合预期(${stabilityToDescription(c.expectLevel)})`
      : `预期${stabilityToDescription(c.expectLevel)}但得${stabilityToDescription(metrics.level)}`;
    results.push({
      name: c.name,
      rawPoints: c.rawPoints,
      start: c.start,
      end: c.end,
      metrics,
      passed,
      reason
    });
  }
  return results;
}
