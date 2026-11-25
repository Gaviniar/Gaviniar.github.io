/**
 * 12-Image Lazy-Loading Crossfade Backdrop Manager
 *
 * File Matrix (4 Seasons × 3 Native Lighting Keyframes = 12 Images):
 *   public/assets/manor-{spring|summer|autumn|winter}-{day|golden|night}.jpg
 *
 * 6 Beijing Time Phases → 3 Native Lighting Keyframes:
 *   - sunrise   (日出) → golden  (subtle rosy morning lift)
 *   - morning   (上午) → day     (crisp clear morning)
 *   - afternoon (下午) → day     (warm golden daylight)
 *   - sunset    (夕阳) → golden  (deep molten amber dusk)
 *   - dusk      (傍晚) → night   (luminous twilight blue-hour lift)
 *   - night     (深夜) → night   (full native midnight + blazing hearth fire)
 *
 * Progressive Fallback:
 *   1) manor-{season}-{lightKey}.jpg  → data-art-mode="native"    (minimal micro-grading)
 *   2) manor-{season}.jpg             → data-art-mode="simulated" (full CSS lighting simulation)
 *   3) manor-summer.jpg               → data-art-mode="simulated" (+ seasonal tint fallback)
 */

// 如使用 .webp 或 .png，直接修改此后缀即可全局生效
export const BACKDROP_EXT = 'jpg';

export function getLightKeyForPhase(timePhase) {
  if (timePhase === 'sunrise' || timePhase === 'sunset') return 'golden';
  if (timePhase === 'dusk' || timePhase === 'night') return 'night';
  return 'day';
}

export class BackdropManager {
  constructor(slotA, slotB) {
    this.slots = [slotA, slotB];
    this.activeIdx = 0;
    this.currentKey = '';
    this.cache = new Map(); // key -> { src, mode, fallbackSeasonTint }
    this.requestSeq = 0;
  }

  probeImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async resolveAsset(season, lightKey) {
    const cacheKey = `${season}-${lightKey}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. Try native 12-image asset: manor-{season}-{day|golden|night}.{ext}
    const nativeSrc = `./assets/manor-${season}-${lightKey}.${BACKDROP_EXT}`;
    if (await this.probeImage(nativeSrc)) {
      const result = { src: nativeSrc, mode: 'native', fallbackSeasonTint: '' };
      this.cache.set(cacheKey, result);
      return result;
    }

    // 2. Fallback to same season's real daytime asset: manor-{season}-day.{ext}
    if (lightKey !== 'day') {
      const seasonDaySrc = `./assets/manor-${season}-day.${BACKDROP_EXT}`;
      if (await this.probeImage(seasonDaySrc)) {
        const result = { src: seasonDaySrc, mode: 'simulated', fallbackSeasonTint: '' };
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    // 3. Final fallback to winter-day anchor
    const fallbackSrc = `./assets/manor-winter-day.${BACKDROP_EXT}`;
    const result = { src: fallbackSrc, mode: 'simulated', fallbackSeasonTint: '' };
    this.cache.set(cacheKey, result);
    return result;
  }

  async update(season, timePhase) {
    const lightKey = getLightKeyForPhase(timePhase);
    const targetKey = `${season}-${lightKey}`;
    const seq = ++this.requestSeq;

    const asset = await this.resolveAsset(season, lightKey);
    if (seq !== this.requestSeq) return; // superseded by newer switch

    document.documentElement.dataset.artMode = asset.mode;
    document.documentElement.dataset.lightKey = lightKey;

    if (targetKey === this.currentKey && this.slots[this.activeIdx].classList.contains('is-active')) {
      return;
    }
    this.currentKey = targetKey;

    const nextIdx = this.activeIdx === 0 ? 1 : 0;
    const nextSlot = this.slots[nextIdx];
    const prevSlot = this.slots[this.activeIdx];

    nextSlot.dataset.fallbackSeason = asset.fallbackSeasonTint;
    nextSlot.src = asset.src;

    // Trigger smooth crossfade on next frame
    requestAnimationFrame(() => {
      if (seq !== this.requestSeq) return;
      nextSlot.classList.add('is-active');
      prevSlot.classList.remove('is-active');
      this.activeIdx = nextIdx;
    });
  }
}
