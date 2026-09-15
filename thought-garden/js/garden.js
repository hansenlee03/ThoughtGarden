import { Plant } from './plant.js';

function seededUnit(seed) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10000) / 10000;
}

function devicePixelRatio() {
  return Math.min(2, Math.max(1, Number(globalThis.devicePixelRatio) || 1));
}

export class Garden {
  constructor(container, { onPlantActivate = () => {}, onPlantVisualChange = () => {} } = {}) {
    this.container = container;
    this.onPlantActivate = onPlantActivate;
    this.onPlantVisualChange = onPlantVisualChange;
    this.plants = [];
    this.hoveredPlant = null;
    this.reducedMotion = false;
    this.groundY = 0;
    this.width = 0;
    this.height = 0;
    this.frameId = null;
    this.particles = Array.from({ length: 34 }, (_, i) => ({
      x: seededUnit(i * 1871 + 17),
      y: seededUnit(i * 7193 + 31) * 0.72,
      size: 1.2 + seededUnit(i * 3571 + 43) * 2.4,
      phase: seededUnit(i * 1459 + 71) * Math.PI * 2
    }));

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'garden-renderer';
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas 2D is not supported in this browser.');
    this.container.prepend(this.canvas);

    this.canvas.addEventListener('mousemove', event => {
      const { x, y } = this.#eventPoint(event);
      const next = this.findPlantAt(x, y);
      if (next !== this.hoveredPlant) {
        this.hoveredPlant = next;
        this.onPlantVisualChange();
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      if (this.hoveredPlant) {
        this.hoveredPlant = null;
        this.onPlantVisualChange();
      }
    });
    this.canvas.addEventListener('click', event => {
      const { x, y } = this.#eventPoint(event);
      const plant = this.findPlantAt(x, y);
      if (plant) this.onPlantActivate(plant.entry);
    });

    this.resize();
    this.#loop = this.#loop.bind(this);
    this.frameId = requestAnimationFrame(this.#loop);
  }

  #eventPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  #measure() {
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(320, Math.floor(rect.width || globalThis.innerWidth || 320)),
      height: Math.max(420, Math.floor(rect.height || globalThis.innerHeight || 420))
    };
  }

  #loop(now) {
    this.#drawScene(now);
    this.frameId = requestAnimationFrame(this.#loop);
  }

  #drawScene(now) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, '#26354a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.#drawParticles(now);
    this.#drawTerrain();

    for (const plant of this.plants) {
      plant.draw(ctx, {
        width: this.width,
        height: this.height,
        groundY: this.groundY,
        now,
        reducedMotion: this.reducedMotion
      });
    }
  }

  #drawParticles(now) {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      const drift = this.reducedMotion ? 0 : Math.sin(now * 0.0003 + particle.phase) * 8;
      const x = particle.x * this.width + drift;
      const y = particle.y * this.height;
      ctx.fillStyle = this.reducedMotion ? 'rgba(238,225,188,0.13)' : 'rgba(238,225,188,0.22)';
      ctx.beginPath();
      ctx.arc(x, y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawTerrain() {
    const ctx = this.ctx;
    ctx.fillStyle = '#17261f';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, this.groundY + 12);
    ctx.bezierCurveTo(
      this.width * 0.18, this.groundY - 8,
      this.width * 0.34, this.groundY + 14,
      this.width * 0.52, this.groundY + 2
    );
    ctx.bezierCurveTo(
      this.width * 0.7, this.groundY - 10,
      this.width * 0.86, this.groundY + 12,
      this.width, this.groundY
    );
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
  }

  setEntries(entries) {
    this.plants = entries.map(entry => new Plant(entry, { mature: true }));
    this.onPlantVisualChange();
  }

  addEntry(entry, { animate = true } = {}) {
    const plant = new Plant(entry, { mature: !animate || this.reducedMotion });
    this.plants.push(plant);
    this.onPlantVisualChange();
    return plant;
  }

  removeAll() {
    this.plants = [];
    this.hoveredPlant = null;
    this.onPlantVisualChange();
  }

  findPlantAt(x, y) {
    for (let i = this.plants.length - 1; i >= 0; i -= 1) {
      const plant = this.plants[i];
      if (plant.contains(x, y, this.width, this.height, this.groundY)) return plant;
    }
    return null;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = this.#measure();
    const ratio = devicePixelRatio();
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.groundY = height * 0.78;
    this.onPlantVisualChange();
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
  }

  getPlants() {
    return [...this.plants];
  }

  getPlantScreenBounds(plant) {
    return plant.getScreenBounds(this.width, this.height, this.groundY);
  }
}
