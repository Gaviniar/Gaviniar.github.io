/**
 * Real-time 60fps Atmospheric & Wind Physics Canvas Engine
 * Renders:
 * - Dynamic alpine wind gust model driving all particles, sparks, smoke, and wind ribbons
 * - Lively hearth fire glow + dense flying hot sparks with luminous motion trails (炉子火星)
 * - Ghibli-inspired subtle translucent wind streams sweeping across the valley (有风吹的感觉)
 * - Drifting chimney smoke from distant manor cottages
 * - Twilight/midnight twinkling starfield & occasional shooting stars
 * - Volumetric sunrise/sunset light shafts
 * - Season & weather particles (petals, fireflies, autumn leaves, frost, rain streaks, snowfall, alpine mist)
 */
export class ManorCanvasFX {
  constructor(canvas, parallaxEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.parallaxEl = parallaxEl;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.state = {
      timePhase: 'night',
      season: 'autumn',
      weather: 'clear',
      hearthPower: 1.0
    };

    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.stars = [];
    this.shootingStar = null;
    this.embers = [];
    this.smokePuffs = [];
    this.windRibbons = [];
    this.particles = [];
    this.mistClouds = [];
    this.rafId = null;
    this.lastTs = 0;

    this.resize();
    this.seedStars();
    this.seedEmbers();
    this.seedSmoke();
    this.seedWindRibbons();
    this.seedMist();
    this.seedWeatherParticles();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      this.pointer.tx = nx;
      this.pointer.ty = ny;
    }, { passive: true });
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Smoothly oscillating mountain breeze + periodic wind gusts (0.4 .. 2.2)
   */
  getWind(t) {
    const base = 0.85 + 0.45 * Math.sin(t * 0.42) + 0.3 * Math.sin(t * 1.08 + 1.3);
    const gust = Math.pow(Math.max(0, Math.sin(t * 0.27 - 0.8)), 3) * 1.15;
    const weatherMult = this.state.weather === 'rain' ? 1.35 : this.state.weather === 'snow' ? 1.1 : 1.0;
    return (base + gust) * weatherMult;
  }

  /**
   * Maps normalized (0..1, 0..1) image coordinates of the 16:9 manor painting
   * into viewport pixel coordinates under object-fit: cover + parallax scale(1.045).
   */
  imgToScreen(nx, ny) {
    const imgRatio = 16 / 9;
    const scaleBoost = 1.045;
    const vw = this.width;
    const vh = this.height;
    const viewRatio = vw / vh;

    let drawW, drawH;
    if (viewRatio > imgRatio) {
      drawW = vw * scaleBoost;
      drawH = (vw / imgRatio) * scaleBoost;
    } else {
      drawH = vh * scaleBoost;
      drawW = vh * imgRatio * scaleBoost;
    }

    const offsetX = (vw - drawW) / 2 - this.pointer.x * 13;
    const offsetY = (vh - drawH) / 2 - this.pointer.y * 8;
    return {
      x: offsetX + nx * drawW,
      y: offsetY + ny * drawH,
      drawW,
      drawH
    };
  }

  updateState(snapshot) {
    const needReseed =
      snapshot.season !== this.state.season ||
      snapshot.weather !== this.state.weather ||
      snapshot.timePhase !== this.state.timePhase;

    this.state = {
      timePhase: snapshot.timePhase,
      season: snapshot.season,
      weather: snapshot.weather,
      hearthPower: snapshot.phaseMeta.hearthPower
    };

    if (needReseed) {
      this.seedWeatherParticles();
    }
  }

  seedStars() {
    this.stars = Array.from({ length: 92 }, () => ({
      nx: 0.20 + Math.random() * 0.62,
      ny: 0.04 + Math.random() * 0.34,
      r: 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 2.1,
      alpha: 0.35 + Math.random() * 0.65
    }));
  }

  seedEmbers() {
    this.embers = Array.from({ length: 54 }, () => this.makeEmber(true));
  }

  makeEmber(randomLife = false) {
    const isHotSpark = Math.random() > 0.45;
    return {
      nx: 0.028 + Math.random() * 0.082,
      ny: 0.56 + Math.random() * 0.095,
      prevNx: 0.055,
      prevNy: 0.60,
      vx: 0.012 + Math.random() * (isHotSpark ? 0.042 : 0.022),
      vy: -(0.028 + Math.random() * (isHotSpark ? 0.068 : 0.038)),
      size: isHotSpark ? (1.0 + Math.random() * 1.7) : (1.7 + Math.random() * 2.3),
      hot: isHotSpark,
      life: randomLife ? Math.random() * 1.5 : 0,
      maxLife: isHotSpark ? (1.2 + Math.random() * 1.5) : (2.0 + Math.random() * 2.2),
      wobble: Math.random() * Math.PI * 2,
      wobbleFreq: 3.0 + Math.random() * 4.5
    };
  }

  seedSmoke() {
    this.smokePuffs = Array.from({ length: 14 }, (_, i) => ({
      nx: 0.72,
      ny: 0.40,
      age: (i / 14) * 5.0,
      maxAge: 4.5 + Math.random() * 2.0,
      drift: Math.random() * Math.PI * 2,
      scale: 0.7 + Math.random() * 0.6
    }));
  }

  seedWindRibbons() {
    this.windRibbons = Array.from({ length: 5 }, (_, i) => this.makeWindRibbon(i * 0.22));
  }

  makeWindRibbon(offset = 0) {
    return {
      progress: -offset,
      speed: 0.22 + Math.random() * 0.16,
      yBase: 0.18 + Math.random() * 0.52,
      amp: 14 + Math.random() * 24,
      freq: 2.2 + Math.random() * 1.8,
      length: 0.16 + Math.random() * 0.14,
      alpha: 0.08 + Math.random() * 0.10,
      phase: Math.random() * Math.PI * 2
    };
  }

  seedMist() {
    this.mistClouds = Array.from({ length: 10 }, (_, i) => ({
      x: (i / 10) * this.width * 1.3 - this.width * 0.15,
      y: this.height * (0.26 + Math.random() * 0.36),
      w: 280 + Math.random() * 440,
      h: 70 + Math.random() * 115,
      speed: 12 + Math.random() * 18,
      alpha: 0.08 + Math.random() * 0.12
    }));
  }

  seedWeatherParticles() {
    const { weather, season, timePhase } = this.state;
    this.particles = [];

    if (weather === 'rain') {
      for (let i = 0; i < 155; i++) {
        this.particles.push({
          kind: 'rain',
          x: Math.random() * (this.width + 260) - 130,
          y: Math.random() * this.height,
          len: 16 + Math.random() * 26,
          speed: 680 + Math.random() * 440,
          alpha: 0.16 + Math.random() * 0.28,
          width: 0.75 + Math.random() * 0.7
        });
      }
      return;
    }

    if (weather === 'snow') {
      for (let i = 0; i < 130; i++) {
        const depth = Math.random();
        this.particles.push({
          kind: 'snow',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: 1.2 + depth * 3.2,
          speedY: 22 + depth * 44,
          speedX: 16 + depth * 28,
          wobble: Math.random() * Math.PI * 2,
          alpha: 0.36 + depth * 0.56
        });
      }
      return;
    }

    if (weather === 'mist') {
      for (let i = 0; i < 36; i++) {
        this.particles.push({
          kind: 'mote',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: 1.0 + Math.random() * 1.9,
          vx: 16 + Math.random() * 20,
          vy: (Math.random() - 0.5) * 8,
          alpha: 0.14 + Math.random() * 0.18,
          phase: Math.random() * Math.PI * 2
        });
      }
      return;
    }

    // Clear weather: lively wind-swept seasonal atmosphere
    if (season === 'spring') {
      for (let i = 0; i < 46; i++) {
        this.particles.push({
          kind: 'petal',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 3.4 + Math.random() * 4.8,
          vx: 36 + Math.random() * 44,
          vy: 14 + Math.random() * 24,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 3.4,
          wobble: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.35 ? '#ffd4e4' : '#fff6fa'
        });
      }
    } else if (season === 'autumn') {
      const leafColors = ['#d96b27', '#eb9b34', '#c13b22', '#f4c152', '#a8341d'];
      for (let i = 0; i < 42; i++) {
        this.particles.push({
          kind: 'leaf',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 4.5 + Math.random() * 5.6,
          vx: 42 + Math.random() * 54,
          vy: 16 + Math.random() * 28,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 3.6,
          wobble: Math.random() * Math.PI * 2,
          color: leafColors[i % leafColors.length]
        });
      }
    } else if (season === 'summer' && (timePhase === 'dusk' || timePhase === 'night')) {
      for (let i = 0; i < 38; i++) {
        this.particles.push({
          kind: 'firefly',
          x: this.width * (0.18 + Math.random() * 0.68),
          y: this.height * (0.34 + Math.random() * 0.54),
          r: 1.5 + Math.random() * 2.3,
          vx: (Math.random() - 0.35) * 18,
          vy: (Math.random() - 0.5) * 12,
          phase: Math.random() * Math.PI * 2,
          speed: 1.3 + Math.random() * 2.2
        });
      }
    } else if (season === 'winter') {
      for (let i = 0; i < 52; i++) {
        this.particles.push({
          kind: 'snow',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: 0.9 + Math.random() * 2.0,
          speedY: 12 + Math.random() * 22,
          speedX: 14 + Math.random() * 24,
          wobble: Math.random() * Math.PI * 2,
          alpha: 0.28 + Math.random() * 0.38
        });
      }
    } else {
      // Clear summer daytime: wind-borne dandelion seeds & golden pollen
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          kind: i % 3 === 0 ? 'seed' : 'mote',
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: 1.2 + Math.random() * 2.0,
          vx: 26 + Math.random() * 34,
          vy: -6 + Math.random() * 14,
          alpha: 0.26 + Math.random() * 0.34,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  start() {
    this.lastTs = performance.now();
    const loop = (ts) => {
      const dt = Math.min((ts - this.lastTs) / 1000, 0.05);
      this.lastTs = ts;
      this.render(ts / 1000, dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  render(t, dt) {
    const wind = this.getWind(t);

    // Smooth cursor parallax + subtle wind breathing
    this.pointer.x += (this.pointer.tx - this.pointer.x) * Math.min(1, dt * 4.5);
    this.pointer.y += (this.pointer.ty - this.pointer.y) * Math.min(1, dt * 4.5);
    if (this.parallaxEl) {
      this.parallaxEl.style.transform = `translate3d(${(-this.pointer.x * 13).toFixed(2)}px, ${(-this.pointer.y * 8).toFixed(2)}px, 0) scale(1.045)`;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const { timePhase, weather, hearthPower } = this.state;
    const isNativeArt = document.documentElement.dataset.artMode === 'native';

    // 1. Twilight / Midnight Stars & Occasional Shooting Star
    if ((timePhase === 'night' || timePhase === 'dusk') && weather !== 'rain') {
      // In native night artwork (which already paints rich stars/Milky Way), add only subtle twinkling accents + shooting stars
      const skyAlpha = (timePhase === 'night' ? (isNativeArt ? 0.38 : 0.94) : 0.36) * (weather === 'mist' ? 0.42 : 1);
      ctx.save();
      for (const s of this.stars) {
        const pos = this.imgToScreen(s.nx, s.ny);
        const twinkle = 0.52 + 0.48 * Math.sin(t * s.speed + s.phase);
        ctx.fillStyle = `rgba(235, 245, 255, ${(s.alpha * twinkle * skyAlpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (timePhase === 'night' && weather === 'clear') {
        if (!this.shootingStar && Math.random() < dt * 0.16) {
          this.shootingStar = {
            x: this.width * (0.26 + Math.random() * 0.36),
            y: this.height * (0.06 + Math.random() * 0.14),
            vx: 410 + Math.random() * 190,
            vy: 120 + Math.random() * 90,
            life: 0,
            maxLife: 0.72
          };
        }
        if (this.shootingStar) {
          const st = this.shootingStar;
          st.x += st.vx * dt;
          st.y += st.vy * dt;
          st.life += dt;
          const p = 1 - st.life / st.maxLife;
          if (p <= 0) {
            this.shootingStar = null;
          } else {
            const grad = ctx.createLinearGradient(st.x, st.y, st.x - st.vx * 0.17, st.y - st.vy * 0.17);
            grad.addColorStop(0, `rgba(255,255,255,${(p * 0.88).toFixed(3)})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(st.x, st.y);
            ctx.lineTo(st.x - st.vx * 0.17, st.y - st.vy * 0.17);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 2. Volumetric Sun Shafts during Sunrise & Sunset (Clear)
    if ((timePhase === 'sunrise' || timePhase === 'sunset') && weather === 'clear') {
      ctx.save();
      const shaftColor = timePhase === 'sunrise' ? '255, 210, 162' : '255, 144, 74';
      const origin = this.imgToScreen(timePhase === 'sunrise' ? 0.66 : 0.34, 0.15);
      const grad = ctx.createRadialGradient(origin.x, origin.y, 10, origin.x, origin.y, this.width * 0.56);
      grad.addColorStop(0, `rgba(${shaftColor}, 0.22)`);
      grad.addColorStop(0.5, `rgba(${shaftColor}, 0.06)`);
      grad.addColorStop(1, `rgba(${shaftColor}, 0)`);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // 3. Distant Manor Chimney Smoke Bending in the Wind (subtle in native art)
    ctx.save();
    const smokeTint = timePhase === 'night' || timePhase === 'dusk' ? '185, 200, 224' : '244, 246, 250';
    const smokeOriginX = isNativeArt ? 0.846 : 0.715;
    const smokeOriginY = isNativeArt ? 0.555 : 0.415;
    for (const puff of this.smokePuffs) {
      puff.age += dt;
      if (puff.age >= puff.maxAge) {
        puff.age = 0;
        puff.drift = Math.random() * Math.PI * 2;
      }
      const p = puff.age / puff.maxAge;
      const sx = smokeOriginX + p * 0.055 * wind + Math.sin(t * 1.4 + puff.drift) * 0.004 * p;
      const sy = smokeOriginY - p * 0.115;
      const pos = this.imgToScreen(sx, sy);
      const radius = (6 + p * 26) * puff.scale;
      const alpha = Math.sin(p * Math.PI) * (isNativeArt ? 0.065 : (timePhase === 'night' ? 0.10 : 0.16));
      const g = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, radius);
      g.addColorStop(0, `rgba(${smokeTint}, ${alpha.toFixed(3)})`);
      g.addColorStop(1, `rgba(${smokeTint}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Drifting Alpine Valley Mist (moves faster with wind)
    const mistStrength = weather === 'mist' ? 1.0 : weather === 'rain' ? 0.52 : timePhase === 'sunrise' ? 0.34 : 0.08;
    ctx.save();
    const mistTint = timePhase === 'night' || timePhase === 'dusk'
      ? '150, 178, 224'
      : timePhase === 'sunset'
        ? '255, 208, 182'
        : '238, 246, 255';
    for (const m of this.mistClouds) {
      m.x += m.speed * wind * dt;
      if (m.x - m.w > this.width) m.x = -m.w;
      const g = ctx.createRadialGradient(m.x, m.y, m.h * 0.1, m.x, m.y, m.w * 0.65);
      g.addColorStop(0, `rgba(${mistTint}, ${(m.alpha * mistStrength).toFixed(3)})`);
      g.addColorStop(1, `rgba(${mistTint}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.w * 0.65, m.h * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Poetic Wind-Stream Ribbons (有风吹的感觉 — subtle curving gusts across valley)
    ctx.save();
    const ribbonTint = timePhase === 'night' || timePhase === 'dusk'
      ? '210, 228, 255'
      : timePhase === 'sunset'
        ? '255, 232, 200'
        : '255, 255, 255';
    for (const r of this.windRibbons) {
      r.progress += r.speed * (0.7 + wind * 0.55) * dt;
      if (r.progress > 1.35) {
        Object.assign(r, this.makeWindRibbon(0.25 + Math.random() * 0.55));
      }
      if (r.progress < -0.1) continue;

      const startX = (r.progress - r.length) * this.width;
      const endX = r.progress * this.width;
      const baseY = r.yBase * this.height;
      const fade = Math.sin(Math.max(0, Math.min(1, r.progress / 1.15)) * Math.PI);
      const a = r.alpha * fade * Math.min(1.4, wind * 0.85);
      if (a <= 0.008) continue;

      const grad = ctx.createLinearGradient(startX, baseY, endX, baseY);
      grad.addColorStop(0, `rgba(${ribbonTint}, 0)`);
      grad.addColorStop(0.5, `rgba(${ribbonTint}, ${a.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${ribbonTint}, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const px = startX + (endX - startX) * u;
        const py = baseY + Math.sin(u * Math.PI * r.freq + t * 2.2 + r.phase) * r.amp * (0.4 + 0.6 * u);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 6. Lively Hearth Fire Glow + Luminous Rising Sparks with Trails (炉子火星)
    const hearthPos = this.imgToScreen(isNativeArt ? 0.055 : 0.068, isNativeArt ? 0.48 : 0.585);
    const flicker = 0.86 + 0.14 * Math.sin(t * 8.2) + 0.08 * Math.sin(t * 19.7) + 0.04 * Math.cos(t * 31.3);
    const fireAlpha = (isNativeArt ? (0.08 + hearthPower * 0.14) : (0.18 + hearthPower * 0.38)) * flicker;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Warm forge / hearth window breathing glow
    const fireRadius = Math.max(this.width, this.height) * (isNativeArt ? 0.15 : (0.22 + hearthPower * 0.16));
    const fireGrad = ctx.createRadialGradient(hearthPos.x, hearthPos.y, 4, hearthPos.x, hearthPos.y, fireRadius);
    fireGrad.addColorStop(0, `rgba(255, 206, 112, ${(fireAlpha * 0.90).toFixed(3)})`);
    fireGrad.addColorStop(0.28, `rgba(255, 118, 36, ${(fireAlpha * 0.48).toFixed(3)})`);
    fireGrad.addColorStop(0.65, `rgba(218, 66, 16, ${(fireAlpha * 0.14).toFixed(3)})`);
    fireGrad.addColorStop(1, 'rgba(218, 66, 16, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(hearthPos.x, hearthPos.y, fireRadius, 0, Math.PI * 2);
    ctx.fill();

    // Flickering inner flame licks (only boosted in simulated open-hearth art)
    if (!isNativeArt) {
      for (let f = 0; f < 3; f++) {
        const fx = hearthPos.x + Math.sin(t * (7 + f * 3.1) + f * 2) * (6 + f * 3);
        const fy = hearthPos.y - 4 - Math.abs(Math.sin(t * (9 + f * 2.5))) * 14;
        const fr = (18 + f * 10) * flicker;
        const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy, fr);
        fg.addColorStop(0, `rgba(255, 244, 196, ${(0.34 * flicker).toFixed(3)})`);
        fg.addColorStop(0.5, `rgba(255, 132, 34, ${(0.22 * flicker).toFixed(3)})`);
        fg.addColorStop(1, 'rgba(255, 92, 12, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glowing flying sparks / embers curving rightwards in the breeze
    for (const e of this.embers) {
      e.prevNx = e.nx;
      e.prevNy = e.ny;
      e.life += dt;
      if (e.life >= e.maxLife) {
        Object.assign(e, this.makeEmber(false));
        e.prevNx = e.nx;
        e.prevNy = e.ny;
      }
      const gustPush = wind * 0.022 * (e.life / e.maxLife + 0.35);
      e.nx += (e.vx + gustPush + Math.sin(t * e.wobbleFreq + e.wobble) * 0.016) * dt;
      e.ny += (e.vy + Math.cos(t * 2.4 + e.wobble) * 0.008) * dt;

      const p = this.imgToScreen(e.nx, e.ny);
      const prev = this.imgToScreen(e.prevNx, e.prevNy);
      const lifeRatio = 1 - e.life / e.maxLife;
      const pulse = 0.72 + 0.28 * Math.sin(t * 22 + e.wobble);
      const a = Math.sin(lifeRatio * Math.PI) * (0.58 + hearthPower * 0.42) * pulse;
      if (a <= 0.02) continue;

      // Crisp luminous spark trail
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      ctx.strokeStyle = e.hot
        ? `rgba(255, 222, 130, ${(a * 0.85).toFixed(3)})`
        : `rgba(255, 138, 46, ${(a * 0.65).toFixed(3)})`;
      ctx.lineWidth = e.size * 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - dx * 2.4, p.y - dy * 2.4);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Bright ember core
      ctx.fillStyle = e.hot
        ? `rgba(255, 248, 210, ${a.toFixed(3)})`
        : `rgba(255, ${Math.floor(150 + lifeRatio * 90)}, 64, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, e.size * (0.55 + lifeRatio * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 7. Weather & Seasonal Particles (all driven by live alpine wind!)
    ctx.save();
    for (const p of this.particles) {
      if (p.kind === 'rain') {
        const slant = 0.22 * wind;
        p.x += p.speed * slant * dt;
        p.y += p.speed * dt;
        if (p.y > this.height + 30 || p.x > this.width + 130) {
          p.y = -30;
          p.x = Math.random() * (this.width + 260) - 180;
        }
        const rainColor = timePhase === 'night' || timePhase === 'dusk' ? '186, 214, 248' : '230, 242, 255';
        ctx.strokeStyle = `rgba(${rainColor}, ${p.alpha})`;
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len * slant, p.y + p.len);
        ctx.stroke();
      } else if (p.kind === 'snow') {
        p.x += (p.speedX * wind + Math.sin(t * 1.6 + p.wobble) * 16) * dt;
        p.y += p.speedY * dt;
        if (p.y > this.height + 10) {
          p.y = -10;
          p.x = Math.random() * this.width;
        }
        if (p.x > this.width + 10) p.x = -10;
        if (p.x < -10) p.x = this.width + 10;
        const nearHearth = p.x < this.width * 0.28 && p.y > this.height * 0.35;
        ctx.fillStyle = nearHearth
          ? `rgba(255, 224, 185, ${(p.alpha * 0.94).toFixed(3)})`
          : `rgba(246, 251, 255, ${p.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'petal') {
        p.x += (p.vx * wind + Math.sin(t * 1.9 + p.wobble) * 16) * dt;
        p.y += (p.vy + Math.cos(t * 1.5 + p.wobble) * 10) * dt;
        p.rot += p.vrot * wind * dt;
        if (p.x > this.width + 20 || p.y > this.height + 20) {
          p.x = Math.random() < 0.5 ? -20 : Math.random() * this.width * 0.75;
          p.y = Math.random() < 0.5 ? Math.random() * this.height * 0.6 : -15;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.hue;
        ctx.globalAlpha = timePhase === 'night' ? 0.48 : 0.82;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'leaf') {
        p.x += (p.vx * wind + Math.sin(t * 2.1 + p.wobble) * 20) * dt;
        p.y += (p.vy + Math.cos(t * 1.7 + p.wobble) * 12) * dt;
        p.rot += p.vrot * wind * dt;
        if (p.x > this.width + 24 || p.y > this.height + 24) {
          p.x = Math.random() < 0.55 ? -20 : Math.random() * this.width * 0.7;
          p.y = Math.random() < 0.5 ? Math.random() * this.height * 0.55 : -20;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = timePhase === 'night' ? 0.56 : 0.88;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.82, 0, 0, p.size);
        ctx.quadraticCurveTo(-p.size * 0.82, 0, 0, -p.size);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'firefly') {
        p.x += (p.vx + wind * 6 + Math.sin(t * 1.2 + p.phase) * 14) * dt;
        p.y += (p.vy + Math.cos(t * 0.95 + p.phase) * 9) * dt;
        if (p.x > this.width * 0.88) p.x = this.width * 0.16;
        if (p.x < this.width * 0.14) p.x = this.width * 0.84;
        if (p.y < this.height * 0.30) p.y = this.height * 0.86;
        if (p.y > this.height * 0.88) p.y = this.height * 0.32;
        const glow = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(t * p.speed + p.phase), 2);
        const g = ctx.createRadialGradient(p.x, p.y, 0.2, p.x, p.y, p.r * 5.2);
        g.addColorStop(0, `rgba(235, 255, 168, ${(glow * 0.96).toFixed(3)})`);
        g.addColorStop(0.4, `rgba(186, 235, 92, ${(glow * 0.42).toFixed(3)})`);
        g.addColorStop(1, 'rgba(186, 235, 92, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'seed') {
        // Wind-carried dandelion tuft
        p.x += (p.vx * wind + Math.sin(t * 2.1 + p.phase) * 10) * dt;
        p.y += (p.vy + Math.cos(t * 1.4 + p.phase) * 9) * dt;
        if (p.x > this.width + 16) p.x = -16;
        if (p.y < -16) p.y = this.height + 16;
        if (p.y > this.height + 16) p.y = -16;
        ctx.strokeStyle = `rgba(255, 253, 240, ${(p.alpha * 0.9).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y - 5);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 2, p.y - 6);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 1, p.y + 4);
        ctx.stroke();
      } else if (p.kind === 'mote') {
        p.x += p.vx * wind * dt;
        p.y += (p.vy + Math.sin(t * 1.3 + p.phase) * 6) * dt;
        if (p.x > this.width + 10) p.x = -10;
        if (p.y < -10) p.y = this.height + 10;
        if (p.y > this.height + 10) p.y = -10;
        ctx.fillStyle = `rgba(255, 248, 224, ${p.alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
