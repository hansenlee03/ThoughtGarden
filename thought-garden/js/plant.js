const PALETTES = [
  { stem: '#6f8f62', leaf: '#8fb67c', leafDark: '#587450', petal: '#d7b5d8', petal2: '#f0d7e7', center: '#f1d39b' },
  { stem: '#668c72', leaf: '#88ad8e', leafDark: '#4f6f5a', petal: '#b8c7ec', petal2: '#dce3f7', center: '#ebd9a6' },
  { stem: '#7d8c59', leaf: '#9bac6f', leafDark: '#657244', petal: '#e1bba2', petal2: '#f2d9c6', center: '#e8c57f' },
  { stem: '#6c897f', leaf: '#86aaa0', leafDark: '#506b63', petal: '#c9b4df', petal2: '#e4d8ef', center: '#ecd39a' },
  { stem: '#718a68', leaf: '#93a985', leafDark: '#566e50', petal: '#dcb2bd', petal2: '#f2d4da', center: '#ead18c' }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(value) {
  const input = String(value ?? '');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function derivePlantStyle(features, seed) {
  const random = mulberry32(seed);
  const wordFactor = clamp((Number(features.wordCount) - 3) / 42, 0, 1);
  const energetic = clamp(Number(features.energeticScore) || 0, 0, 1);
  const calm = clamp(Number(features.calmScore) || 0, 0, 1);
  const positive = clamp(Number(features.positiveScore) || 0, 0, 1);
  const negative = clamp(Number(features.negativeScore) || 0, 0, 1);
  const exclamations = Math.max(0, Number(features.exclamationCount) || 0);
  const questions = Math.max(0, Number(features.questionCount) || 0);
  const sentences = Math.max(1, Number(features.sentenceCount) || 1);

  const height = clamp(
    lerp(0.22, 0.46, wordFactor) + energetic * 0.06 + (random() - 0.5) * 0.025,
    0.22,
    0.52
  );
  const bloomOpenness = clamp(
    0.38 + positive * 0.34 + Math.min(exclamations, 4) * 0.08 + (random() - 0.5) * 0.12,
    0.2,
    1
  );
  const width = clamp(0.06 + bloomOpenness * 0.055 + random() * 0.02, 0.055, 0.14);
  const branchCount = clamp(Math.round(sentences + random() * 2), 1, 6);
  const leafRoundness = clamp(0.48 + calm * 0.42 + (random() - 0.5) * 0.12, 0.35, 1);
  const sway = clamp(0.46 + energetic * 0.46 - calm * 0.24 + (random() - 0.5) * 0.16, 0.15, 1);
  const asymmetry = clamp(questions * 0.19 + random() * 0.22, 0, 1);
  const bloomTilt = clamp(negative * 0.48 + (random() - 0.5) * 0.22, -0.18, 0.62);
  const paletteIndex = Math.floor(random() * PALETTES.length) % PALETTES.length;
  const petalCount = 5 + Math.floor(random() * 5);

  return {
    height,
    width,
    branchCount,
    leafRoundness,
    sway,
    asymmetry,
    bloomOpenness,
    bloomTilt,
    paletteIndex,
    petalCount
  };
}

function buildGeometry(seed, style) {
  const random = mulberry32(seed ^ 0x9e3779b9);
  const branches = [];

  for (let i = 0; i < style.branchCount; i += 1) {
    const baseSide = i % 2 === 0 ? -1 : 1;
    const flipChance = style.asymmetry * 0.32;
    const side = random() < flipChance ? -baseSide : baseSide;
    branches.push({
      side,
      t: clamp(0.28 + i * (0.5 / Math.max(1, style.branchCount - 1)) + (random() - 0.5) * 0.08, 0.2, 0.82),
      length: 0.22 + random() * 0.17,
      angle: 0.72 + random() * 0.28,
      leafScale: 0.72 + random() * 0.42
    });
  }

  return branches;
}

export class Plant {
  constructor(entry, { mature = true } = {}) {
    this.entry = entry;
    this.style = entry.style;
    this.progress = mature ? 1 : 0;
    this.growthStartedAt = mature ? null : undefined;
    this.branches = buildGeometry(entry.seed, this.style);
  }

  update(now, reducedMotion = false) {
    if (reducedMotion) {
      this.progress = 1;
      return;
    }
    if (this.progress >= 1) return;
    if (this.growthStartedAt === undefined) this.growthStartedAt = now;
    const elapsed = Math.max(0, now - this.growthStartedAt);
    this.progress = clamp(elapsed / 4800, 0, 1);
  }

  getScreenBounds(width, height, groundY) {
    const plantHeight = this.style.height * height;
    const plantWidth = Math.max(48, this.style.width * width * 1.45);
    const x = this.entry.x * width;
    return {
      left: x - plantWidth / 2,
      top: groundY - plantHeight - 32,
      width: plantWidth,
      height: plantHeight + 44
    };
  }

  contains(px, py, width, height, groundY) {
    const bounds = this.getScreenBounds(width, height, groundY);
    return px >= bounds.left && px <= bounds.left + bounds.width && py >= bounds.top && py <= bounds.top + bounds.height;
  }

  draw(p, groundY, now, reducedMotion = false) {
    this.update(now, reducedMotion);

    const palette = PALETTES[this.style.paletteIndex % PALETTES.length];
    const x = this.entry.x * p.width;
    const totalHeight = this.style.height * p.height;
    const stemGrowth = smoothstep(this.progress / 0.58);
    const branchGrowth = smoothstep((this.progress - 0.28) / 0.48);
    const bloomGrowth = smoothstep((this.progress - 0.7) / 0.3);
    const grownHeight = totalHeight * stemGrowth;
    const wind = reducedMotion ? 0 : Math.sin(now * 0.00082 + this.entry.seed * 0.001) * this.style.sway;
    const tipX = x + wind * Math.min(12, totalHeight * 0.045) * stemGrowth;
    const tipY = groundY - grownHeight;

    p.push();
    p.noFill();
    p.stroke(palette.stem);
    p.strokeWeight(Math.max(2.2, p.width * 0.0024));
    p.strokeCap(p.ROUND);
    p.bezier(x, groundY + 3, x - wind * 2, groundY - grownHeight * 0.35, tipX - wind * 2, groundY - grownHeight * 0.72, tipX, tipY);

    if (branchGrowth > 0) {
      for (const branch of this.branches) {
        const localGrowth = smoothstep((branchGrowth - Math.max(0, branch.t - 0.3) * 0.3) / 0.8);
        if (localGrowth <= 0) continue;
        const y = groundY - grownHeight * branch.t;
        const centerX = x + wind * 4 * branch.t;
        const length = totalHeight * branch.length * localGrowth;
        const endX = centerX + branch.side * length * 0.58;
        const endY = y - length * branch.angle;

        p.stroke(palette.stem);
        p.strokeWeight(Math.max(1.4, p.width * 0.0015));
        p.line(centerX, y, endX, endY);
        this.#drawLeaf(p, endX, endY, branch.side, length * 0.42 * branch.leafScale, palette, localGrowth);
      }
    }

    if (bloomGrowth > 0.01) {
      this.#drawBloom(p, tipX, tipY, totalHeight, bloomGrowth, palette, wind);
    } else if (this.progress < 0.25) {
      const seedGlow = 7 + 8 * this.progress;
      p.noStroke();
      p.fill(236, 218, 160, 55 + 120 * (1 - this.progress));
      p.circle(x, groundY - 2, seedGlow * 2.4);
      p.fill(223, 195, 126, 230);
      p.ellipse(x, groundY - 3, seedGlow, seedGlow * 0.64);
    }

    p.pop();
  }

  #drawLeaf(p, x, y, side, size, palette, growth) {
    const roundness = this.style.leafRoundness;
    const leafW = size * (0.9 + roundness * 0.45) * growth;
    const leafH = size * (0.55 + roundness * 0.52) * growth;
    p.push();
    p.translate(x, y);
    p.rotate(side * (0.48 - roundness * 0.14));
    p.noStroke();
    p.fill(palette.leaf);
    p.ellipse(side * leafW * 0.23, 0, leafW, leafH);
    p.fill(palette.leafDark);
    p.ellipse(side * leafW * 0.12, 0, leafW * 0.52, leafH * 0.28);
    p.pop();
  }

  #drawBloom(p, x, y, totalHeight, growth, palette, wind) {
    const openness = this.style.bloomOpenness;
    const petalCount = this.style.petalCount;
    const radius = Math.max(12, totalHeight * (0.055 + openness * 0.045)) * growth;
    const tilt = this.style.bloomTilt + wind * 0.015;

    p.push();
    p.translate(x, y);
    p.rotate(tilt);
    p.noStroke();

    for (let i = 0; i < petalCount; i += 1) {
      const angle = (p.TWO_PI * i) / petalCount;
      p.push();
      p.rotate(angle);
      p.fill(i % 2 === 0 ? palette.petal : palette.petal2);
      p.ellipse(radius * 0.72, 0, radius * (0.82 + openness * 0.45), radius * (0.42 + openness * 0.32));
      p.pop();
    }

    p.fill(palette.center);
    p.circle(0, 0, radius * 0.66);
    p.pop();
  }
}
