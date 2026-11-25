export const TIME_PHASES = [
  {
    id: 'sunrise',
    label: '日出',
    en: 'SUNRISE',
    range: '05:00–07:59',
    tone: 'light',
    mood: '雪峰染上玫瑰晨光，庄园石阶尚有微露，炉膛余火轻暖。',
    hearthPower: 0.45
  },
  {
    id: 'morning',
    label: '上午',
    en: 'MORNING',
    range: '08:00–11:59',
    tone: 'light',
    mood: '高纬晴空澄澈通透，晨风掠过草坡与抛光板甲。',
    hearthPower: 0.25
  },
  {
    id: 'afternoon',
    label: '下午',
    en: 'AFTERNOON',
    range: '12:00–16:59',
    tone: 'light',
    mood: '日照饱满而宁静，铁砧上的骑士头盔泛着暖白高光。',
    hearthPower: 0.28
  },
  {
    id: 'sunset',
    label: '夕阳',
    en: 'SUNSET',
    range: '17:00–18:59',
    tone: 'warm',
    mood: '熔金晚霞倾泻雪岭，长影漫过回廊，石炉火光渐盛。',
    hearthPower: 0.72
  },
  {
    id: 'dusk',
    label: '傍晚',
    en: 'DUSK',
    range: '19:00–20:59',
    tone: 'dark',
    mood: '靛蓝暮色笼罩山谷，远方庄园亮起窗灯，初星点缀天际。',
    hearthPower: 0.92
  },
  {
    id: 'night',
    label: '深夜',
    en: 'MIDNIGHT',
    range: '21:00–04:59',
    tone: 'dark',
    mood: '月华如霜覆于雪山，唯有炉火劈啪作响，照亮盔甲与铁砧。',
    hearthPower: 1.0
  }
];

export const SEASONS = [
  { id: 'spring', label: '春', en: 'SPRING', desc: '繁花初绽 · 融雪新绿' },
  { id: 'summer', label: '夏', en: 'SUMMER', desc: '翠谷晴岚 · 萤火清风' },
  { id: 'autumn', label: '秋', en: 'AUTUMN', desc: '红叶金原 · 霜天明净' },
  { id: 'winter', label: '冬', en: 'WINTER', desc: '素雪覆檐 · 围炉暖甲' }
];

export const WEATHERS = [
  { id: 'clear', label: '晴', en: 'CLEAR', desc: '天光通透' },
  { id: 'mist', label: '雾', en: 'MIST', desc: '山岚漫谷' },
  { id: 'rain', label: '雨', en: 'RAIN', desc: '檐下听雨' },
  { id: 'snow', label: '雪', en: 'SNOW', desc: '飞雪漫天' }
];

export function getBeijingDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = {};
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const hour = parts.hour === 24 ? 0 : parts.hour;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: parts.minute,
    second: parts.second
  };
}

export function getTimePhaseFromBeijingHour(hour) {
  if (hour >= 5 && hour <= 7) return 'sunrise';
  if (hour >= 8 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 18) return 'sunset';
  if (hour >= 19 && hour <= 20) return 'dusk';
  return 'night';
}

export function getSeasonFromMonth(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function formatPad(n) {
  return String(n).padStart(2, '0');
}

export class AtmosphereController {
  constructor(onChange) {
    this.onChange = onChange;
    const now = getBeijingDateParts();
    this.state = {
      autoTime: true,
      timePhase: getTimePhaseFromBeijingHour(now.hour),
      season: getSeasonFromMonth(now.month),
      weather: 'clear',
      clockShort: `${formatPad(now.hour)}:${formatPad(now.minute)}`,
      clockFull: `${formatPad(now.hour)}:${formatPad(now.minute)}:${formatPad(now.second)}`,
      dateStr: `${now.year}.${formatPad(now.month)}.${formatPad(now.day)}`
    };
    this._timer = null;
  }

  start() {
    this.applyToDOM();
    this._timer = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
  }

  tick() {
    const now = getBeijingDateParts();
    this.state.clockShort = `${formatPad(now.hour)}:${formatPad(now.minute)}`;
    this.state.clockFull = `${formatPad(now.hour)}:${formatPad(now.minute)}:${formatPad(now.second)}`;
    this.state.dateStr = `${now.year}.${formatPad(now.month)}.${formatPad(now.day)}`;

    if (this.state.autoTime) {
      const livePhase = getTimePhaseFromBeijingHour(now.hour);
      if (livePhase !== this.state.timePhase) {
        this.state.timePhase = livePhase;
        this.applyToDOM();
      }
    }
    this.onChange?.(this.getSnapshot(), 'tick');
  }

  setTimePhase(phaseId) {
    this.state.autoTime = false;
    this.state.timePhase = phaseId;
    this.applyToDOM();
    this.onChange?.(this.getSnapshot(), 'env');
  }

  enableAutoTime() {
    this.state.autoTime = true;
    const now = getBeijingDateParts();
    this.state.timePhase = getTimePhaseFromBeijingHour(now.hour);
    this.applyToDOM();
    this.onChange?.(this.getSnapshot(), 'env');
  }

  setSeason(seasonId) {
    this.state.season = seasonId;
    this.applyToDOM();
    this.onChange?.(this.getSnapshot(), 'env');
  }

  setWeather(weatherId) {
    this.state.weather = weatherId;
    this.applyToDOM();
    this.onChange?.(this.getSnapshot(), 'env');
  }

  getSnapshot() {
    const phaseMeta = TIME_PHASES.find((p) => p.id === this.state.timePhase) || TIME_PHASES[5];
    const seasonMeta = SEASONS.find((s) => s.id === this.state.season) || SEASONS[2];
    const weatherMeta = WEATHERS.find((w) => w.id === this.state.weather) || WEATHERS[0];
    return {
      ...this.state,
      phaseMeta,
      seasonMeta,
      weatherMeta
    };
  }

  applyToDOM() {
    const snap = this.getSnapshot();
    const html = document.documentElement;
    html.dataset.time = snap.timePhase;
    html.dataset.season = snap.season;
    html.dataset.weather = snap.weather;
    html.dataset.tone = snap.phaseMeta.tone;
    html.style.setProperty('--hearth-power', String(snap.phaseMeta.hearthPower));
  }
}
