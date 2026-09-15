import { Plant } from './plant.js';

function seededUnit(seed) {
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 10000) / 10000;
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
    this.particles = Array.from({ length: 34 }, (_, i) => ({
      x: seededUnit(i * 1871 + 17),
      y: seededUnit(i * 7193 + 31) * 0.72,
      size: 1.2 + seededUnit(i * 3571 + 43) * 2.4,
      phase: seededUnit(i * 1459 + 71) * Math.PI * 2
    }));

    this.sketch = new window.p5(p => {
      p.setup = () => {
        const { width, height } = this.#measure();
        const canvas = p.createCanvas(width, height);
        canvas.parent(this.container);
        canvas.elt.setAttribute('aria-hidden', 'true');
        this.#updateGround(p);
      };

      p.draw = () => {
        this.#drawScene(p);
      };

      p.mouseMoved = () => {
        this.hoveredPlant = this.findPlantAt(p.mouseX, p.mouseY);
        this.onPlantVisualChange();
      };

      p.mousePressed = () => {
        const plant = this.findPlantAt(p.mouseX, p.mouseY);
        if (plant) this.onPlantActivate(plant.entry);
      };

      p.windowResized = () => this.resize();
    });
  }

  #measure() {
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(320, Math.floor(rect.width || window.innerWidth)),
      height: Math.max(420, Math.floor(rect.height || window.innerHeight))
    };
  }

  #updateGround(p) {
    this.groundY = p.height * 0.78;
  }

  #drawScene(p) {
    const top = p.color('#111827');
    const bottom = p.color('#26354a');
    for (let y = 0; y < p.height; y += 4) {
      const c = p.lerpColor(top, bottom, y / p.height);
      p.noStroke();
      p.fill(c);
      p.rect(0, y, p.width, 5);
    }

    this.#drawParticles(p);
    this.#drawTerrain(p);

    const now = p.millis();
    for (const plant of this.plants) {
      plant.draw(p, this.groundY, now, this.reducedMotion);
    }
  }

  #drawParticles(p) {
    p.noStroke();
    const now = p.millis();
    for (const particle of this.particles) {
      const drift = this.reducedMotion ? 0 : Math.sin(now * 0.0003 + particle.phase) * 8;
      const x = particle.x * p.width + drift;
      const y = particle.y * p.height;
      p.fill(238, 225, 188, this.reducedMotion ? 34 : 55);
      p.circle(x, y, particle.size);
    }
  }

  #drawTerrain(p) {
    p.noStroke();
    p.fill('#17261f');
    p.beginShape();
    p.vertex(0, p.height);
    p.vertex(0, this.groundY + 12);
    p.bezierVertex(p.width * 0.18, this.groundY - 8, p.width * 0.34, this.groundY + 14, p.width * 0.52, this.groundY + 2);
    p.bezierVertex(p.width * 0.7, this.groundY - 10, p.width * 0.86, this.groundY + 12, p.width, this.groundY);
    p.vertex(p.width, p.height);
    p.endShape(p.CLOSE);
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
    if (!this.sketch) return null;
    for (let i = this.plants.length - 1; i >= 0; i -= 1) {
      const plant = this.plants[i];
      if (plant.contains(x, y, this.sketch.width, this.sketch.height, this.groundY)) return plant;
    }
    return null;
  }

  resize() {
    if (!this.sketch) return;
    const { width, height } = this.#measure();
    this.sketch.resizeCanvas(width, height);
    this.#updateGround(this.sketch);
    this.onPlantVisualChange();
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
  }

  getPlants() {
    return [...this.plants];
  }

  getPlantScreenBounds(plant) {
    if (!this.sketch) return null;
    return plant.getScreenBounds(this.sketch.width, this.sketch.height, this.groundY);
  }
}
