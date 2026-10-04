/* Trust Me Bro A1+A2 campaign layer. Keeps the v36 engine available while the
   new campaign owns profile/economy/routes. No network or embedded assets. */
(() => {
  "use strict";
  const SCHEMA = 1,
    PROFILE_KEY = "trust_me_bro_campaign_profile_v1",
    LEGACY_KEY = "trust_me_bro_last_delivery_v2_save";
  const DEBUG = location.hash.toLowerCase().includes("debug");
  const telemetry = [];
  function emitGame(event, data = {}) {
    const detail = { event, params:{...data,gameTime:typeof gameClock==="number"?gameClock:0,frame:typeof renderFrameCount==="number"?renderFrameCount:0}, context:{ routeId, runId:run?.runId }, result:null };
    document.dispatchEvent(new CustomEvent("tmb:analytics-emit", { detail }));
    const row = detail.result;
    if (row) telemetry.push(row);
    return row;
  }
  function sfx(name) { document.dispatchEvent(new CustomEvent("tmb:sfx", { detail:{ name, gameTime:typeof gameClock==="number"?gameClock:0, frame:renderFrameCount } })); }
  function sCoin() { sfx("coin"); }
  function sJump() {}
  const GROUND = 455,
    W = 1080,
    H = 540,
    COIN_FILL_RADIUS = 8,
    COIN_STROKE_WIDTH = 2,
    COIN_CONTACT_RADIUS = COIN_FILL_RADIUS + COIN_STROKE_WIDTH / 2;
  let engine = null,
    cameraWorldY = -78,
    backgroundCameraWorldY = -78,
    cameraWorldVelocity = 0,
    cameraGroundFootY = GROUND,
    player = null,
    keys = null,
    joystick = null,
    ctx = null;
  function parseSave(raw) {
    if (raw && typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  function closeCharacterSelect() {
    const e = document.getElementById("characterSelect");
    e?.classList.remove("show");
    e?.setAttribute("aria-hidden", "true");
  }
  function openCharacterSelect() {
    const e = document.getElementById("characterSelect");
    e?.classList.add("show");
    e?.setAttribute("aria-hidden", "false");
    document.body.dataset.campaignPhase = "choose-runner";
    delete document.body.dataset.routeId;
  }
  const RUNNERS = Object.freeze({
    male: { id: "male", legacy: 0, label: "MALE RUNNER" },
    female: { id: "female", legacy: 2, label: "FEMALE RUNNER" },
  });
  const OUTFITS = Object.freeze({
    default: { id: "default", price: 0 },
    dockCrew: { id: "dockCrew", price: 40 },
    nightShift: { id: "nightShift", price: 240 },
    hazardRunner: { id: "hazardRunner", price: 360 },
  });
  const WORLD_REGISTRY = Object.freeze({
    dock31: { id: "dock31", themeId: "dock", price: 0, enabled: true, routes: ["D01", "D02", "D03", "D04", "D05", "D06"] },
    frozen: { id: "frozen", themeId: "frozen", price: 160, enabled: true, routes: ["F01", "F02", "F03", "F04"] },
    magma: { id: "magma", themeId: "magma", price: 200, enabled: true, routes: ["M01", "M02", "M03", "M04"] },
    aftermath: { id: "aftermath", themeId: "aftermath", price: 500, enabled: true, routes: ["A01", "A02", "A03", "A04"] },
  });
  let pendingWorldId = null, activeWorldCacheKey = "";
  const magmaBackdropCache = new Map();
  let renderSignatures = { deckStripe:0, dock31Text:0, containerBlock:0, dockCrane:0, loadingCorridor:0, foregroundLampGroundGap:0 }, renderFrameCount = 0;
  const I18N = Object.freeze({
    en: {
      M01: "FOUNDRY WALK", M02: "CASTING CRANE", M03: "FURNACE AISLE", M04: "MAGMA LIFT",
      A01: "BROKEN RECEIVING", A02: "EMERGENCY CARGO", A03: "LAST COURIER", A04: "FINAL DISPATCH",
      choose: "CHOOSE YOUR RUNNER",
      male: "MALE RUNNER",
      female: "FEMALE RUNNER",
      route: "ROUTE",
      run: "RUN",
      wallet: "WALLET",
      shop: "SHOP",
      outfits: "OUTFITS",
      buy: "BUY & WEAR — {price}",
      wear: "WEAR",
      worn: "WORN",
      preview: "LIVE PREVIEW",
      next: "NEXT",
      retry: "RETRY",
      earned: "EARNED",
      goals: "GOALS",
      record: "BEST DIFFERENCE",
      first: "FIRST COMPLETION",
      finish: "FINISH",
      safe: "SAFE LINE",
      skill: "SKILL LINE",
      checkpoint: "CHECKPOINT",
      help: "A/D or ←/→ • SPACE/W/↑ • R restart",
      complete: "COMPLETE",
      defaultOutfit: "DEFAULT COURIER",
      dockCrew: "DOCK CREW · HELMET + VEST",
      nightShift: "Night Shift",
      hazardRunner: "Hazard Runner",
      saveFailed: "SAVE FAILED — RETRY",
      noCharge: "LIVE PREVIEW · NO CHARGE",
      worlds: "WORLDS", buyWorld: "BUY — {price}", select: "SELECT", selected: "SELECTED", planned: "PLANNED", insufficient: "INSUFFICIENT COINS",
      idle: "IDLE", motionRun: "RUN", flip: "FLIP", language: "LANGUAGE", samePhysics: "Same physics. Shared wallet. Your runner.", ghostOn: "GHOST ON", ghostOff: "GHOST OFF", effectsFull: "EFFECTS FULL", effectsReduced: "EFFECTS REDUCED", flow: "FLOW", localBest: "LOCAL BEST", newRecord: "NEW", clean: "CLEAN", mastery: "MASTERY", style: "STYLE",
    },
    tr: {
      M01: "DÖKÜMHANE YOLU", M02: "DÖKÜM VİNCİ", M03: "FIRIN KORİDORU", M04: "MAGMA ASANSÖRÜ",
      A01: "HASARLI KABUL", A02: "ACİL DURUM YÜKÜ", A03: "SON KURYE", A04: "SON SEVKİYAT",
      choose: "KOŞUCUNU SEÇ",
      male: "ERKEK KOŞUCU",
      female: "KADIN KOŞUCU",
      route: "ROTA",
      run: "KOŞU",
      wallet: "CÜZDAN",
      shop: "MAĞAZA",
      outfits: "KIYAFETLER",
      buy: "SATIN AL VE GİY — {price}",
      wear: "GİY",
      worn: "GİYİLİ",
      preview: "CANLI ÖNİZLEME",
      next: "SONRAKİ",
      retry: "YENİDEN DENE",
      earned: "KAZANÇ",
      goals: "HEDEFLER",
      record: "REKOR FARKI",
      first: "İLK TAMAMLAMA",
      finish: "BİTİŞ",
      safe: "GÜVENLİ HAT",
      skill: "BECERİ HATTI",
      checkpoint: "KONTROL NOKTASI",
      help: "A/D veya ←/→ • SPACE/W/↑ • R yeniden başlat",
      complete: "TAMAMLANDI",
      defaultOutfit: "VARSAYILAN KURYE",
      dockCrew: "LİMAN EKİBİ · BARET + YELEK",
      nightShift: "GECE VARDİYASI",
      hazardRunner: "TEHLİKE KOŞUCUSU",
      saveFailed: "KAYIT BAŞARISIZ — YENİDEN DENE",
      noCharge: "CANLI ÖNİZLEME · ÜCRETSİZ",
      worlds: "DÜNYALAR", buyWorld: "SATIN AL — {price}", select: "SEÇ", selected: "SEÇİLİ", planned: "PLANLANDI", insufficient: "Yetersiz jeton",
      idle: "BEKLE", motionRun: "KOŞ", flip: "TAKLA", language: "DİL", samePhysics: "Aynı fizik. Ortak cüzdan. Senin koşucun.", ghostOn: "HAYALET AÇIK", ghostOff: "HAYALET KAPALI", effectsFull: "EFEKTLER TAM", effectsReduced: "EFEKTLER AZALTILDI", flow: "AKIŞ", localBest: "YEREL EN İYİ", newRecord: "YENİ", clean: "TEMİZ", mastery: "USTALIK", style: "STİL",
    },
    ru: {
      M01: "ЛИТЕЙНЫЙ ПУТЬ", M02: "ЛИТЕЙНЫЙ КРАН", M03: "ПЕЧНОЙ ПРОХОД", M04: "МАГМОВЫЙ ЛИФТ",
      A01: "ПОВРЕЖДЁННАЯ ПРИЁМКА", A02: "АВАРИЙНЫЙ ГРУЗ", A03: "ПОСЛЕДНИЙ КУРЬЕР", A04: "ФИНАЛЬНАЯ ОТПРАВКА",
      choose: "ВЫБЕРИ БЕГУНА",
      male: "МУЖСКОЙ БЕГУН",
      female: "ЖЕНСКИЙ БЕГУН",
      route: "МАРШРУТ",
      run: "ЗАБЕГ",
      wallet: "КОШЕЛЁК",
      shop: "МАГАЗИН",
      outfits: "КОСТЮМЫ",
      buy: "КУПИТЬ И НАДЕТЬ — {price}",
      wear: "НАДЕТЬ",
      worn: "НАДЕТО",
      preview: "ПРИМЕРКА",
      next: "ДАЛЕЕ",
      retry: "ЕЩЁ РАЗ",
      earned: "НАГРАДА",
      goals: "ЦЕЛИ",
      record: "РАЗНИЦА РЕКОРДА",
      first: "ПЕРВОЕ ПРОХОЖДЕНИЕ",
      finish: "ФИНИШ",
      safe: "БЕЗОПАСНЫЙ ПУТЬ",
      skill: "ЛИНИЯ МАСТЕРСТВА",
      checkpoint: "КОНТРОЛЬНАЯ ТОЧКА",
      help: "A/D или ←/→ • SPACE/W/↑ • R заново",
      complete: "ЗАВЕРШЁН",
      defaultOutfit: "ОБЫЧНЫЙ КУРЬЕР",
      dockCrew: "ПОРТОВАЯ БРИГАДА · КАСКА + ЖИЛЕТ",
      nightShift: "НОЧНАЯ СМЕНА",
      hazardRunner: "ОПАСНЫЙ БЕГУН",
      saveFailed: "ОШИБКА СОХРАНЕНИЯ — ПОВТОРИТЬ",
      noCharge: "ЖИВОЙ ПРОСМОТР · БЕСПЛАТНО",
      worlds: "МИРЫ", buyWorld: "КУПИТЬ — {price}", select: "ВЫБРАТЬ", selected: "ВЫБРАНО", planned: "ЗАПЛАНИРОВАНО", insufficient: "НЕДОСТАТОЧНО МОНЕТ",
      idle: "ОЖИДАНИЕ", motionRun: "БЕГ", flip: "САЛЬТО", language: "ЯЗЫК", samePhysics: "Та же физика. Общий кошелёк. Твой бегун.", ghostOn: "ПРИЗРАК ВКЛ", ghostOff: "ПРИЗРАК ВЫКЛ", effectsFull: "ЭФФЕКТЫ ПОЛНЫЕ", effectsReduced: "ЭФФЕКТЫ СНИЖЕНЫ", flow: "ПОТОК", localBest: "ЛУЧШИЙ РЕЗУЛЬТАТ", newRecord: "НОВЫЙ", clean: "ЧИСТО", mastery: "МАСТЕРСТВО", style: "СТИЛЬ",
    },
  });
  const COINS = Object.freeze({
  "A03": [
    {
      "n": 0,
      "move_id": "a03-m-01",
      "kind": "CS",
      "x": 1768,
      "y": 440,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "a03-m-02",
      "kind": "CC",
      "x": 2780,
      "y": 350,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "a03-m-03",
      "kind": "CJ",
      "x": 3665,
      "y": 355,
      "skill": false
    },
    {
      "n": 3,
      "move_id": "a03-m-04",
      "kind": "CS",
      "x": 4588,
      "y": 440,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "a03-m-05",
      "kind": "CJ",
      "x": 5565,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "a03-m-06",
      "kind": "CC",
      "x": 6520,
      "y": 350,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "a03-m-07",
      "kind": "CJ",
      "x": 7355,
      "y": 355,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "a03-m-08",
      "kind": "CS",
      "x": 8438,
      "y": 440,
      "skill": true
    },
    {
      "n": 8,
      "move_id": "a03-m-09",
      "kind": "CC",
      "x": 9340,
      "y": 350,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "a03-m-10",
      "kind": "CJ",
      "x": 10175,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "a03-m-11",
      "kind": "CC",
      "x": 11240,
      "y": 350,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "a03-m-12",
      "kind": "CJ",
      "x": 12125,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "a03-m-13",
      "kind": "CS",
      "x": 13048,
      "y": 440,
      "skill": true
    },
    {
      "n": 13,
      "move_id": "a03-m-14",
      "kind": "CJ",
      "x": 14025,
      "y": 355,
      "skill": false
    }
  ],
  "A04": [
    {
      "n": 0,
      "move_id": "a04-m-01",
      "kind": "CC",
      "x": 1750,
      "y": 350,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "a04-m-02",
      "kind": "CJ",
      "x": 2635,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "a04-m-03",
      "kind": "CS",
      "x": 3558,
      "y": 440,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "a04-m-04",
      "kind": "CC",
      "x": 4570,
      "y": 370,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "a04-m-05",
      "kind": "CJ",
      "x": 5455,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "a04-m-06",
      "kind": "CS",
      "x": 6378,
      "y": 440,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "a04-m-07",
      "kind": "CC",
      "x": 7390,
      "y": 350,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "a04-m-08",
      "kind": "CJ",
      "x": 8275,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "a04-m-09",
      "kind": "CC",
      "x": 9180,
      "y": 370,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "a04-m-10",
      "kind": "CS",
      "x": 10228,
      "y": 440,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "a04-m-11",
      "kind": "CJ",
      "x": 11095,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "a04-m-12",
      "kind": "CC",
      "x": 12000,
      "y": 350,
      "skill": true
    },
    {
      "n": 12,
      "move_id": "a04-m-13",
      "kind": "CJ",
      "x": 12995,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "a04-m-14",
      "kind": "CJ",
      "x": 13915,
      "y": 355,
      "skill": false
    }
  ],
  "A01": [
    {
      "n": 0,
      "move_id": "a01-m-01",
      "kind": "CJ",
      "x": 1715,
      "y": 355,
      "skill": false
    },
    {
      "n": 1,
      "move_id": "a01-m-02",
      "kind": "CS",
      "x": 2688,
      "y": 440,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "a01-m-03",
      "kind": "CJ",
      "x": 3505,
      "y": 355,
      "skill": false
    },
    {
      "n": 3,
      "move_id": "a01-m-04",
      "kind": "CC",
      "x": 4570,
      "y": 350,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "a01-m-05",
      "kind": "CJ",
      "x": 5455,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "a01-m-06",
      "kind": "CS",
      "x": 6378,
      "y": 440,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "a01-m-07",
      "kind": "CC",
      "x": 7390,
      "y": 350,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "a01-m-08",
      "kind": "CJ",
      "x": 8275,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "a01-m-09",
      "kind": "CC",
      "x": 9180,
      "y": 350,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "a01-m-10",
      "kind": "CJ",
      "x": 10175,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "a01-m-11",
      "kind": "CS",
      "x": 11148,
      "y": 440,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "a01-m-12",
      "kind": "CJ",
      "x": 11965,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "a01-m-13",
      "kind": "CC",
      "x": 13030,
      "y": 350,
      "skill": true
    },
    {
      "n": 13,
      "move_id": "a01-m-14",
      "kind": "CJ",
      "x": 13915,
      "y": 355,
      "skill": false
    }
  ],
  "A02": [
    {
      "n": 0,
      "move_id": "a02-m-01",
      "kind": "CC",
      "x": 1750,
      "y": 370,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "a02-m-02",
      "kind": "CS",
      "x": 2638,
      "y": 440,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "a02-m-03",
      "kind": "CJ",
      "x": 3615,
      "y": 355,
      "skill": false
    },
    {
      "n": 3,
      "move_id": "a02-m-04",
      "kind": "CC",
      "x": 4570,
      "y": 350,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "a02-m-05",
      "kind": "CS",
      "x": 5458,
      "y": 440,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "a02-m-06",
      "kind": "CJ",
      "x": 6435,
      "y": 355,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "a02-m-07",
      "kind": "CC",
      "x": 7390,
      "y": 370,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "a02-m-08",
      "kind": "CJ",
      "x": 8225,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "a02-m-09",
      "kind": "CS",
      "x": 9308,
      "y": 440,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "a02-m-10",
      "kind": "CC",
      "x": 10210,
      "y": 350,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "a02-m-11",
      "kind": "CJ",
      "x": 11045,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "a02-m-12",
      "kind": "CC",
      "x": 12110,
      "y": 370,
      "skill": true
    },
    {
      "n": 12,
      "move_id": "a02-m-13",
      "kind": "CJ",
      "x": 12995,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "a02-m-14",
      "kind": "CJ",
      "x": 13865,
      "y": 355,
      "skill": false
    }
  ],
  "M04": [
    {
      "n": 0,
      "move_id": "m04-m-01",
      "kind": "CC",
      "x": 1800,
      "y": 350,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "m04-m-02",
      "kind": "CJ",
      "x": 2715,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "m04-m-03",
      "kind": "CC",
      "x": 3700,
      "y": 370,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "m04-m-04",
      "kind": "CJ",
      "x": 4615,
      "y": 355,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "m04-m-05",
      "kind": "CS",
      "x": 5618,
      "y": 440,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "m04-m-06",
      "kind": "CC",
      "x": 6550,
      "y": 350,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "m04-m-07",
      "kind": "CJ",
      "x": 7465,
      "y": 355,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "m04-m-08",
      "kind": "CC",
      "x": 8450,
      "y": 370,
      "skill": true
    },
    {
      "n": 8,
      "move_id": "m04-m-09",
      "kind": "CJ",
      "x": 9365,
      "y": 355,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "m04-m-10",
      "kind": "CS",
      "x": 10368,
      "y": 440,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "m04-m-11",
      "kind": "CC",
      "x": 11300,
      "y": 350,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "m04-m-12",
      "kind": "CJ",
      "x": 12215,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "m04-m-13",
      "kind": "CJ",
      "x": 13165,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "m04-m-14",
      "kind": "CJ",
      "x": 14115,
      "y": 355,
      "skill": false
    }
  ],
  "M03": [
    {
      "n": 0,
      "move_id": "m03-m-01",
      "kind": "CJ",
      "x": 1765,
      "y": 355,
      "skill": false
    },
    {
      "n": 1,
      "move_id": "m03-m-02",
      "kind": "CS",
      "x": 2768,
      "y": 440,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "m03-m-03",
      "kind": "CC",
      "x": 3700,
      "y": 350,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "m03-m-04",
      "kind": "CJ",
      "x": 4615,
      "y": 355,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "m03-m-05",
      "kind": "CS",
      "x": 5618,
      "y": 440,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "m03-m-06",
      "kind": "CJ",
      "x": 6515,
      "y": 355,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "m03-m-07",
      "kind": "CC",
      "x": 7500,
      "y": 350,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "m03-m-08",
      "kind": "CJ",
      "x": 8415,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "m03-m-09",
      "kind": "CS",
      "x": 9418,
      "y": 440,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "m03-m-10",
      "kind": "CC",
      "x": 10350,
      "y": 350,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "m03-m-11",
      "kind": "CJ",
      "x": 11265,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "m03-m-12",
      "kind": "CJ",
      "x": 12215,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "m03-m-13",
      "kind": "CC",
      "x": 13200,
      "y": 350,
      "skill": true
    },
    {
      "n": 13,
      "move_id": "m03-m-14",
      "kind": "CJ",
      "x": 14115,
      "y": 355,
      "skill": false
    }
  ],
  "M01": [
    {
      "n": 0,
      "move_id": "m01-m-01",
      "kind": "CJ",
      "x": 1765,
      "y": 355,
      "skill": false
    },
    {
      "n": 1,
      "move_id": "m01-m-02",
      "kind": "CC",
      "x": 2750,
      "y": 350,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "m01-m-03",
      "kind": "CS",
      "x": 3718,
      "y": 440,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "m01-m-04",
      "kind": "CJ",
      "x": 4615,
      "y": 355,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "m01-m-05",
      "kind": "CC",
      "x": 5600,
      "y": 350,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "m01-m-06",
      "kind": "CJ",
      "x": 6515,
      "y": 355,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "m01-m-07",
      "kind": "CS",
      "x": 7518,
      "y": 440,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "m01-m-08",
      "kind": "CC",
      "x": 8450,
      "y": 350,
      "skill": true
    },
    {
      "n": 8,
      "move_id": "m01-m-09",
      "kind": "CJ",
      "x": 9365,
      "y": 355,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "m01-m-10",
      "kind": "CJ",
      "x": 10315,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "m01-m-11",
      "kind": "CC",
      "x": 11300,
      "y": 350,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "m01-m-12",
      "kind": "CJ",
      "x": 12215,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "m01-m-13",
      "kind": "CJ",
      "x": 13165,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "m01-m-14",
      "kind": "CJ",
      "x": 14115,
      "y": 355,
      "skill": false
    }
  ],
  "M02": [
    {
      "n": 0,
      "move_id": "m02-m-01",
      "kind": "CC",
      "x": 1800,
      "y": 370,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "m02-m-02",
      "kind": "CJ",
      "x": 2715,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "m02-m-03",
      "kind": "CS",
      "x": 3718,
      "y": 440,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "m02-m-04",
      "kind": "CC",
      "x": 4650,
      "y": 350,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "m02-m-05",
      "kind": "CJ",
      "x": 5565,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "m02-m-06",
      "kind": "CC",
      "x": 6550,
      "y": 370,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "m02-m-07",
      "kind": "CJ",
      "x": 7465,
      "y": 355,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "m02-m-08",
      "kind": "CC",
      "x": 8450,
      "y": 350,
      "skill": true
    },
    {
      "n": 8,
      "move_id": "m02-m-09",
      "kind": "CS",
      "x": 9418,
      "y": 440,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "m02-m-10",
      "kind": "CC",
      "x": 10350,
      "y": 370,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "m02-m-11",
      "kind": "CJ",
      "x": 11265,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "m02-m-12",
      "kind": "CC",
      "x": 12250,
      "y": 350,
      "skill": true
    },
    {
      "n": 12,
      "move_id": "m02-m-13",
      "kind": "CJ",
      "x": 13165,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "m02-m-14",
      "kind": "CJ",
      "x": 14115,
      "y": 355,
      "skill": false
    }
  ],
  "D01": [
    {
      "n": 0,
      "move_id": "d01-t1b-platform-2",
      "kind": "CC",
      "x": 1200,
      "y": 350,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "d01-vault",
      "kind": "CJ",
      "x": 1600,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "d01-t1b-vault-5",
      "kind": "CJ",
      "x": 2230,
      "y": 355,
      "skill": false
    },
    {
      "n": 3,
      "move_id": "d01-t1b-vault-3",
      "kind": "CJ",
      "x": 3590,
      "y": 355,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "d01-t1b-vault-2",
      "kind": "CJ",
      "x": 4082,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "d01-t1b-platform-3",
      "kind": "CC",
      "x": 5450,
      "y": 350,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "d01-t1b-platform-1",
      "kind": "CC",
      "x": 6588,
      "y": 350,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "d01-t2c-vault-3",
      "kind": "CJ",
      "x": 7128,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "d01-t2c-vault-5",
      "kind": "CJ",
      "x": 7859,
      "y": 355,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "d01-t1b-vault-4",
      "kind": "CJ",
      "x": 8541,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "d01-t1b-platform-4",
      "kind": "CC",
      "x": 9020,
      "y": 350,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "d01-t1b-slide-2",
      "kind": "CS",
      "x": 9800,
      "y": 440,
      "skill": true
    }
  ],
  "D02": [
    {
      "n": 0,
      "move_id": "d02-slide",
      "kind": "CS",
      "x": 1330,
      "y": 440,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "d02-t2c-vault-1",
      "kind": "CJ",
      "x": 3720,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "d02-t1b-platform-1",
      "kind": "CC",
      "x": 4960,
      "y": 350,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "d02-t1b-platform-2",
      "kind": "CC",
      "x": 5890,
      "y": 350,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "d02-loading-vault",
      "kind": "CJ",
      "x": 7120,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "d02-dispatch-vault",
      "kind": "CJ",
      "x": 9122,
      "y": 355,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "d02-t2c-vault-2",
      "kind": "CJ",
      "x": 9596,
      "y": 355,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "d02-t2c-vault-3",
      "kind": "CJ",
      "x": 10553,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "d02-t2c-vault-4",
      "kind": "CJ",
      "x": 11453,
      "y": 355,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "d02-t2c-vault-5",
      "kind": "CJ",
      "x": 11853,
      "y": 355,
      "skill": false
    }
  ],
  "D03": [
    {
      "n": 0,
      "move_id": "d03-v-03",
      "kind": "CC",
      "x": 241.6,
      "y": 94.6,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "d03-v-04",
      "kind": "CC",
      "x": 479.68,
      "y": 137.8,
      "skill": true
    },
    {
      "n": 2,
      "move_id": "d03-tr-15",
      "kind": "CJ",
      "x": 3260.42,
      "y": 225.4,
      "skill": false
    },
    {
      "n": 3,
      "move_id": "d03-dz-02",
      "kind": "CJ",
      "x": 4071.88,
      "y": 238.8,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "d03-v-09",
      "kind": "CC",
      "x": 1318,
      "y": 65.8,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "d03-v-11",
      "kind": "CC",
      "x": 1903.48,
      "y": 44.2,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "d03-v-16",
      "kind": "CC",
      "x": 3889.24,
      "y": 304.6,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "d03-dz-01",
      "kind": "CJ",
      "x": 2791.54,
      "y": 29.8,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "d03-tr-15",
      "kind": "CJ",
      "x": 3260.42,
      "y": 225.4,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "d03-slide-02",
      "kind": "CS",
      "x": 3741.24,
      "y": 326.2,
      "skill": true
    },
    {
      "n": 10,
      "move_id": "d03-v-27",
      "kind": "CC",
      "x": 5788.6,
      "y": 345.4,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "d03-tr-34",
      "kind": "CJ",
      "x": 6699.64,
      "y": 331,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "d03-tr-10",
      "kind": "CJ",
      "x": 1171,
      "y": 101.8,
      "skill": false
    }
  ],
  "D04": [
    {
      "n": 0,
      "move_id": "d04-dz-01",
      "kind": "CJ",
      "x": 3617.2,
      "y": -279.8,
      "skill": false
    },
    {
      "n": 1,
      "move_id": "d04-dz-02",
      "kind": "CJ",
      "x": 4898.8,
      "y": -179.8,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "d04-v-06",
      "kind": "CC",
      "x": 1074.16,
      "y": -560.6,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "d04-dz-03",
      "kind": "CJ",
      "x": 7360.6,
      "y": 194.2,
      "skill": false
    },
    {
      "n": 4,
      "move_id": "d04-slide-01",
      "kind": "CS",
      "x": 576.72,
      "y": -472.6,
      "skill": true
    },
    {
      "n": 5,
      "move_id": "d04-dz-02",
      "kind": "CJ",
      "x": 4898.8,
      "y": -179.8,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "d04-tr-32",
      "kind": "CJ",
      "x": 5352.4,
      "y": -231.8,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "d04-dz-03",
      "kind": "CJ",
      "x": 7360.6,
      "y": 194.2,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "d04-v-17",
      "kind": "CC",
      "x": 4374.4,
      "y": -123.8,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "d04-dz-02",
      "kind": "CJ",
      "x": 4898.8,
      "y": -179.8,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "d04-v-21",
      "kind": "CC",
      "x": 5076.4,
      "y": -195.8,
      "skill": true
    },
    {
      "n": 11,
      "move_id": "d04-slide-01",
      "kind": "CS",
      "x": 576.72,
      "y": -472.6,
      "skill": true
    }
  ],
  "D05": [{"n":0,"move_id":"d05-dz-01","kind":"CJ","x":2461.4,"y":-798.375,"skill":false},{"n":1,"move_id":"d05-tr-17","kind":"CJ","x":4868.85,"y":-245.25,"skill":false},{"n":2,"move_id":"d05-dz-02","kind":"CJ","x":3717.32,"y":-582.625,"skill":false},{"n":3,"move_id":"d05-dz-03","kind":"CJ","x":7169.39,"y":272,"skill":false},{"n":4,"move_id":"d05-tr-36","kind":"CJ","x":6698.75,"y":335,"skill":false},{"n":5,"move_id":"d05-tr-10","kind":"CJ","x":2026.32,"y":-866.75,"skill":false},{"n":6,"move_id":"d05-tr-23","kind":"CJ","x":5167.43,"y":-86.75,"skill":false},{"n":7,"move_id":"d05-tr-37","kind":"CJ","x":6760,"y":313.375,"skill":false},{"n":8,"move_id":"d05-tr-25","kind":"CJ","x":5654.16,"y":-158.375,"skill":false},{"n":9,"move_id":"d05-vault-03","kind":"CS","x":6843.25,"y":337,"skill":true},{"n":10,"move_id":"d05-up-1","kind":"CC","x":211.6,"y":-781,"skill":true},{"n":11,"move_id":"d05-v-05","kind":"CC","x":1134,"y":-797.75,"skill":true},{"n":12,"move_id":"d05-v-15","kind":"CC","x":5315.44,"y":-105.375,"skill":true}],
  "D06": [{"n":0,"move_id":"d06-dz-01","kind":"CJ","x":1099.69,"y":24.75,"skill":false},{"n":1,"move_id":"d06-dz-02","kind":"CJ","x":1400,"y":0,"skill":false},{"n":2,"move_id":"d06-dz-03","kind":"CJ","x":1918.1,"y":-96.375,"skill":false},{"n":3,"move_id":"d06-dz-04","kind":"CJ","x":4647.2,"y":291.25,"skill":false},{"n":4,"move_id":"d06-tr-6","kind":"CJ","x":879,"y":54.75,"skill":false},{"n":5,"move_id":"d06-tr-12","kind":"CJ","x":2422.2,"y":155.625,"skill":false},{"n":6,"move_id":"d06-tr-15","kind":"CJ","x":2930.4,"y":198.75,"skill":false},{"n":7,"move_id":"d06-tr-17","kind":"CJ","x":3439.8,"y":132.75,"skill":false},{"n":8,"move_id":"d06-vault-01","kind":"CS","x":3663,"y":361,"skill":true},{"n":9,"move_id":"d06-v-02","kind":"CC","x":274,"y":129.375,"skill":true},{"n":10,"move_id":"d06-v-05","kind":"CC","x":740.8,"y":107.75,"skill":true},{"n":11,"move_id":"d06-v-16","kind":"CC","x":2539,"y":230.25,"skill":true},{"n":12,"move_id":"d06-v-22","kind":"CC","x":3898.6,"y":327.375,"skill":true}],
  "F01": [{"n":0,"move_id":"f01-dz-01","kind":"CJ","x":632,"y":-31,"skill":false},{"n":1,"move_id":"f01-dz-02","kind":"CJ","x":1784,"y":127.375,"skill":false},{"n":2,"move_id":"f01-dz-03","kind":"CJ","x":2912,"y":207.75,"skill":false},{"n":3,"move_id":"f01-dz-04","kind":"CJ","x":4599.2,"y":294.25,"skill":false},{"n":4,"move_id":"f01-dz-05","kind":"CJ","x":5097.2,"y":183.75,"skill":false},{"n":5,"move_id":"f01-dz-06","kind":"CJ","x":5582.72,"y":224.625,"skill":false},{"n":6,"move_id":"f01-dz-07","kind":"CJ","x":5750,"y":122.75,"skill":false},{"n":7,"move_id":"f01-vault-01","kind":"CJ","x":789.6,"y":-67,"skill":false},{"n":8,"move_id":"f01-v-02","kind":"CC","x":333.6,"y":-52.625,"skill":true},{"n":9,"move_id":"f01-v-08","kind":"CC","x":2186.4,"y":170.625,"skill":true},{"n":10,"move_id":"f01-v-13","kind":"CC","x":3154.8,"y":186.25,"skill":true},{"n":11,"move_id":"f01-v-16","kind":"CC","x":4795.6,"y":246.25,"skill":true},{"n":12,"move_id":"f01-v-18","kind":"CC","x":5097.2,"y":183.75,"skill":true},{"n":13,"move_id":"f01-slide-02","kind":"CS","x":5262.24,"y":287,"skill":true}],
  "F02": [{"n":0,"move_id":"f02-dz-01","kind":"CJ","x":539.6,"y":-445,"skill":false},{"n":1,"move_id":"f02-dz-02","kind":"CJ","x":794,"y":-493,"skill":false},{"n":2,"move_id":"f02-dz-03","kind":"CJ","x":1292,"y":-471.375,"skill":false},{"n":3,"move_id":"f02-dz-04","kind":"CJ","x":2667.2,"y":-351.375,"skill":false},{"n":4,"move_id":"f02-dz-05","kind":"CJ","x":3075.2,"y":-411.375,"skill":false},{"n":5,"move_id":"f02-dz-06","kind":"CJ","x":3435.2,"y":-339.375,"skill":false},{"n":6,"move_id":"f02-dz-07","kind":"CJ","x":4023.2,"y":-255.375,"skill":false},{"n":7,"move_id":"f02-dz-08","kind":"CJ","x":4347.2,"y":-229,"skill":false},{"n":8,"move_id":"f02-dz-09","kind":"CC","x":5800,"y":-184.375,"skill":true},{"n":9,"move_id":"f02-v-08","kind":"CC","x":1074.4,"y":-383.75,"skill":true},{"n":10,"move_id":"f02-v-12","kind":"CC","x":1591.6,"y":-373,"skill":true},{"n":11,"move_id":"f02-dz-10","kind":"CC","x":6900,"y":-137.25,"skill":true},{"n":12,"move_id":"f02-slide-01","kind":"CS","x":2822.61,"y":-351.375,"skill":true}],
  "F03": [
    {
      "n": 0,
      "move_id": "f03-t1b-vault-4",
      "kind": "CJ",
      "x": 1461,
      "y": 355,
      "skill": false
    },
    {
      "n": 1,
      "move_id": "f03-t2c-vault-4",
      "kind": "CJ",
      "x": 1861,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "f03-t1b-platform-1",
      "kind": "CC",
      "x": 3640,
      "y": 350,
      "skill": true
    },
    {
      "n": 3,
      "move_id": "f03-slide-b",
      "kind": "CS",
      "x": 4570,
      "y": 440,
      "skill": true
    },
    {
      "n": 4,
      "move_id": "f03-t1b-vault-2",
      "kind": "CJ",
      "x": 5371,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "f03-t1b-platform-2",
      "kind": "CC",
      "x": 5810,
      "y": 350,
      "skill": true
    },
    {
      "n": 6,
      "move_id": "f03-t1b-vault-3",
      "kind": "CJ",
      "x": 8090,
      "y": 355,
      "skill": false
    },
    {
      "n": 7,
      "move_id": "f03-t2c-vault-6",
      "kind": "CJ",
      "x": 8490,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "f03-t1b-platform-3",
      "kind": "CC",
      "x": 9570,
      "y": 350,
      "skill": true
    },
    {
      "n": 9,
      "move_id": "f03-vault",
      "kind": "CJ",
      "x": 10480,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "f03-t2c-vault-12",
      "kind": "CJ",
      "x": 10880,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "f03-t2c-vault-16",
      "kind": "CJ",
      "x": 12747,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "f03-t1b-vault-1",
      "kind": "CJ",
      "x": 14230,
      "y": 355,
      "skill": false
    }
  ],
  "F04": [
    {
      "n": 0,
      "move_id": "f04-t1b-pallet-1",
      "kind": "CC",
      "x": 3311,
      "y": 385,
      "skill": true
    },
    {
      "n": 1,
      "move_id": "f04-t1b-vault-2",
      "kind": "CJ",
      "x": 4913,
      "y": 355,
      "skill": false
    },
    {
      "n": 2,
      "move_id": "f04-t2c-vault-2",
      "kind": "CJ",
      "x": 5313,
      "y": 355,
      "skill": false
    },
    {
      "n": 5,
      "move_id": "f04-t1b-vault-3",
      "kind": "CJ",
      "x": 8031,
      "y": 355,
      "skill": false
    },
    {
      "n": 6,
      "move_id": "f04-t1b-pallet-2",
      "kind": "CC",
      "x": 8600,
      "y": 385,
      "skill": true
    },
    {
      "n": 7,
      "move_id": "f04-t2c-vault-3",
      "kind": "CJ",
      "x": 10204,
      "y": 355,
      "skill": false
    },
    {
      "n": 8,
      "move_id": "f04-vault",
      "kind": "CJ",
      "x": 10734,
      "y": 355,
      "skill": false
    },
    {
      "n": 9,
      "move_id": "f04-t2c-vault-4",
      "kind": "CJ",
      "x": 11134,
      "y": 355,
      "skill": false
    },
    {
      "n": 10,
      "move_id": "f04-t1b-vault-1",
      "kind": "CJ",
      "x": 11760,
      "y": 355,
      "skill": false
    },
    {
      "n": 11,
      "move_id": "f04-t2c-vault-6",
      "kind": "CJ",
      "x": 12160,
      "y": 355,
      "skill": false
    },
    {
      "n": 12,
      "move_id": "f04-t2c-vault-8",
      "kind": "CJ",
      "x": 13559,
      "y": 355,
      "skill": false
    },
    {
      "n": 13,
      "move_id": "f04-t2c-vault-9",
      "kind": "CJ",
      "x": 13959,
      "y": 355,
      "skill": false
    }
  ]
});
  const ROUTES = Object.freeze({
"A03":{"routeId": "A03", "worldId": "aftermath", "version": 1, "name": "LAST COURIER", "length": 16600, "finishX": 16460, "checkpoints": [70, 3000, 6000, 9000, 11900, 14900, 16000], "obstacles": [{"id": "a03-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "a03-m-01", "type": "slide", "x": 1750, "w": 56, "h": 160}, {"id": "a03-m-02", "type": "platform", "x": 2780, "w": 320, "h": 24, "y": 370}, {"id": "a03-m-03", "type": "vault", "x": 3700, "w": 24, "h": 48}, {"id": "a03-m-04", "type": "slide", "x": 4570, "w": 56, "h": 160}, {"id": "a03-m-05", "type": "vault", "x": 5600, "w": 24, "h": 48}, {"id": "a03-m-06", "type": "platform", "x": 6520, "w": 320, "h": 24, "y": 370}, {"id": "a03-m-07", "type": "vault", "x": 7390, "w": 24, "h": 48}, {"id": "a03-m-08", "type": "slide", "x": 8420, "w": 56, "h": 160}, {"id": "a03-m-09", "type": "platform", "x": 9340, "w": 320, "h": 24, "y": 370}, {"id": "a03-m-10", "type": "vault", "x": 10210, "w": 24, "h": 48}, {"id": "a03-m-11", "type": "platform", "x": 11240, "w": 320, "h": 24, "y": 370}, {"id": "a03-m-12", "type": "vault", "x": 12160, "w": 24, "h": 48}, {"id": "a03-m-13", "type": "slide", "x": 13030, "w": 56, "h": 160}, {"id": "a03-m-14", "type": "vault", "x": 14060, "w": 24, "h": 48}, {"id": "a03-m-door", "type": "containerDoor", "x": 15500, "w": 100, "h": 70, "openY": 250, "y": 385, "prepare": 1, "close": 0.65, "closed": 80, "open": 4}, {"id": "a03-m-bypass", "type": "overpass", "x": 15300, "y": 370, "w": 650, "h": 24}, {"id": "a03-m-step", "type": "platform", "x": 15050, "y": 370, "w": 200, "h": 24}], "chief": {"startX": 12000},"coins":makeCoins("A03",COINS.A03)},"A04":{"routeId": "A04", "worldId": "aftermath", "version": 1, "name": "FINAL DISPATCH", "length": 16600, "finishX": 16460, "checkpoints": [70, 3000, 6000, 9000, 11900, 14900, 16000], "obstacles": [{"id": "a04-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "a04-m-01", "type": "platform", "x": 1750, "w": 320, "h": 24, "y": 370}, {"id": "a04-m-02", "type": "vault", "x": 2670, "w": 24, "h": 48}, {"id": "a04-m-03", "type": "slide", "x": 3540, "w": 56, "h": 160}, {"id": "a04-m-04", "type": "crane", "x": 4570, "w": 230, "h": 24, "y": 390, "minX": 4570, "maxX": 4630, "speed": 40}, {"id": "a04-m-05", "type": "vault", "x": 5490, "w": 24, "h": 48}, {"id": "a04-m-06", "type": "slide", "x": 6360, "w": 56, "h": 160}, {"id": "a04-m-07", "type": "platform", "x": 7390, "w": 320, "h": 24, "y": 370}, {"id": "a04-m-08", "type": "vault", "x": 8310, "w": 24, "h": 48}, {"id": "a04-m-09", "type": "pallet", "x": 9180, "w": 230, "h": 24, "y": 390, "minX": 9180, "maxX": 9240, "speed": 40}, {"id": "a04-m-10", "type": "slide", "x": 10210, "w": 56, "h": 160}, {"id": "a04-m-11", "type": "vault", "x": 11130, "w": 24, "h": 48}, {"id": "a04-m-12", "type": "platform", "x": 12000, "w": 320, "h": 24, "y": 370}, {"id": "a04-m-13", "type": "vault", "x": 13030, "w": 24, "h": 48}, {"id": "a04-m-14", "type": "vault", "x": 13950, "w": 24, "h": 48}, {"id": "a04-m-ramp", "type": "ramp", "x": 650, "w": 100, "h": 40}, {"id": "a04-m-upper-entry", "type": "platform", "x": 14500, "y": 370, "w": 260, "h": 24}, {"id": "a04-m-collapse", "type": "collapse", "x": 14760, "y": 370, "w": 200, "h": 24, "warning": 0.6}, {"id": "a04-m-upper-exit", "type": "platform", "x": 14960, "y": 370, "w": 250, "h": 24}, {"id": "a04-m-door", "type": "containerDoor", "x": 15500, "w": 100, "h": 70, "openY": 250, "y": 385, "prepare": 1, "close": 0.65, "closed": 80, "open": 4}, {"id": "a04-m-bypass", "type": "overpass", "x": 15300, "y": 370, "w": 650, "h": 24}, {"id": "a04-m-step", "type": "platform", "x": 15050, "y": 370, "w": 200, "h": 24}],"coins":makeCoins("A04",COINS.A04)},
"A01":{"routeId": "A01", "worldId": "aftermath", "version": 1, "name": "BROKEN RECEIVING", "length": 16600, "finishX": 16460, "checkpoints": [70, 3000, 6000, 9000, 12000, 15800], "obstacles": [{"id": "a01-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "a01-m-01", "type": "vault", "x": 1750, "w": 24, "h": 48}, {"id": "a01-m-02", "type": "slide", "x": 2670, "w": 56, "h": 160}, {"id": "a01-m-03", "type": "vault", "x": 3540, "w": 24, "h": 48}, {"id": "a01-m-04", "type": "platform", "x": 4570, "w": 320, "h": 24, "y": 370}, {"id": "a01-m-05", "type": "vault", "x": 5490, "w": 24, "h": 48}, {"id": "a01-m-06", "type": "slide", "x": 6360, "w": 56, "h": 160}, {"id": "a01-m-07", "type": "platform", "x": 7390, "w": 320, "h": 24, "y": 370}, {"id": "a01-m-08", "type": "vault", "x": 8310, "w": 24, "h": 48}, {"id": "a01-m-09", "type": "platform", "x": 9180, "w": 320, "h": 24, "y": 370}, {"id": "a01-m-10", "type": "vault", "x": 10210, "w": 24, "h": 48}, {"id": "a01-m-11", "type": "slide", "x": 11130, "w": 56, "h": 160}, {"id": "a01-m-12", "type": "vault", "x": 12000, "w": 24, "h": 48}, {"id": "a01-m-13", "type": "platform", "x": 13030, "w": 320, "h": 24, "y": 370}, {"id": "a01-m-14", "type": "vault", "x": 13950, "w": 24, "h": 48}, {"id": "a01-m-upper-entry", "type": "platform", "x": 14700, "y": 370, "w": 260, "h": 24}, {"id": "a01-m-collapse", "type": "collapse", "x": 14960, "y": 370, "w": 200, "h": 24, "warning": 0.6}, {"id": "a01-m-upper-exit", "type": "platform", "x": 15160, "y": 370, "w": 300, "h": 24}],"coins":makeCoins("A01",COINS.A01)},"A02":{"routeId": "A02", "worldId": "aftermath", "version": 1, "name": "EMERGENCY CARGO", "length": 16600, "finishX": 16460, "checkpoints": [70, 3000, 6000, 9000, 12000, 15800], "obstacles": [{"id": "a02-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "a02-m-01", "type": "crane", "x": 1750, "w": 230, "h": 24, "y": 390, "minX": 1750, "maxX": 1810, "speed": 40}, {"id": "a02-m-02", "type": "slide", "x": 2620, "w": 56, "h": 160}, {"id": "a02-m-03", "type": "vault", "x": 3650, "w": 24, "h": 48}, {"id": "a02-m-04", "type": "platform", "x": 4570, "w": 320, "h": 24, "y": 370}, {"id": "a02-m-05", "type": "slide", "x": 5440, "w": 56, "h": 160}, {"id": "a02-m-06", "type": "vault", "x": 6470, "w": 24, "h": 48}, {"id": "a02-m-07", "type": "pallet", "x": 7390, "w": 230, "h": 24, "y": 390, "minX": 7390, "maxX": 7450, "speed": 40}, {"id": "a02-m-08", "type": "vault", "x": 8260, "w": 24, "h": 48}, {"id": "a02-m-09", "type": "slide", "x": 9290, "w": 56, "h": 160}, {"id": "a02-m-10", "type": "platform", "x": 10210, "w": 320, "h": 24, "y": 370}, {"id": "a02-m-11", "type": "vault", "x": 11080, "w": 24, "h": 48}, {"id": "a02-m-12", "type": "crane", "x": 12110, "w": 230, "h": 24, "y": 390, "minX": 12110, "maxX": 12170, "speed": 40}, {"id": "a02-m-13", "type": "vault", "x": 13030, "w": 24, "h": 48}, {"id": "a02-m-14", "type": "vault", "x": 13900, "w": 24, "h": 48}, {"id": "a02-m-worker", "type": "worker", "x": 15400, "w": 44, "h": 84}, {"id": "a02-m-rescue-overpass", "type": "overpass", "x": 14050, "y": 370, "w": 1800, "h": 24}],"coins":makeCoins("A02",COINS.A02)},
"M03":{"routeId":"M03","worldId":"magma","version":1,"name":"FURNACE AISLE","length":17200,"finishX":17060,"checkpoints":[70,6100,11000,16300],"obstacles":[{"id":"m03-m-intro","type":"slide","x":300,"w":56,"h":160},{"id":"m03-m-01","type":"vault","x":1800,"w":24,"h":48},{"id":"m03-m-02","type":"slide","x":2750,"w":56,"h":160},{"id":"m03-m-03","type":"platform","x":3700,"w":320,"h":24,"y":370},{"id":"m03-m-04","type":"vault","x":4650,"w":24,"h":48},{"id":"m03-m-05","type":"slide","x":5600,"w":56,"h":160},{"id":"m03-m-06","type":"vault","x":6550,"w":24,"h":48},{"id":"m03-m-07","type":"platform","x":7500,"w":320,"h":24,"y":370},{"id":"m03-m-08","type":"vault","x":8450,"w":24,"h":48},{"id":"m03-m-09","type":"slide","x":9400,"w":56,"h":160},{"id":"m03-m-10","type":"platform","x":10350,"w":320,"h":24,"y":370},{"id":"m03-m-11","type":"vault","x":11300,"w":24,"h":48},{"id":"m03-m-12","type":"vault","x":12250,"w":24,"h":48},{"id":"m03-m-13","type":"platform","x":13200,"w":320,"h":24,"y":370},{"id":"m03-m-14","type":"vault","x":14150,"w":24,"h":48},{"id":"m03-m-worker","type":"worker","x":5150,"w":48,"h":70},{"id":"m03-m-ramp","type":"ramp","x":14600,"w":220,"h":74},{"id":"m03-m-overpass","type":"overpass","x":14760,"y":238,"w":1200,"h":24},{"id":"m03-m-door","type":"containerDoor","x":15470,"y":275,"w":76,"h":180,"openY":135,"prepare":1,"close":0.65,"closed":80,"open":4}],"coins":makeCoins("M03",COINS.M03)},
"M04":{"routeId":"M04","worldId":"magma","version":1,"name":"MAGMA LIFT","length":16300,"finishX":16160,"checkpoints":[70,6100,11000,15500],"obstacles":[{"id":"m04-m-intro","type":"slide","x":300,"w":56,"h":160},{"id":"m04-m-ramp","type":"ramp","x":650,"w":220,"h":90},{"id":"m04-m-01","type":"platform","x":1800,"w":320,"h":24,"y":370},{"id":"m04-m-02","type":"vault","x":2750,"w":24,"h":48},{"id":"m04-m-03","type":"crane","x":3700,"w":230,"h":24,"y":390,"minX":3700,"maxX":3760,"speed":40},{"id":"m04-m-04","type":"vault","x":4650,"w":24,"h":48},{"id":"m04-m-05","type":"slide","x":5600,"w":56,"h":160},{"id":"m04-m-06","type":"platform","x":6550,"w":320,"h":24,"y":370},{"id":"m04-m-07","type":"vault","x":7500,"w":24,"h":48},{"id":"m04-m-08","type":"pallet","x":8450,"w":230,"h":24,"y":390,"minX":8450,"maxX":8510,"speed":65},{"id":"m04-m-09","type":"vault","x":9400,"w":24,"h":48},{"id":"m04-m-10","type":"slide","x":10350,"w":56,"h":160},{"id":"m04-m-11","type":"platform","x":11300,"w":320,"h":24,"y":370},{"id":"m04-m-12","type":"vault","x":12250,"w":24,"h":48},{"id":"m04-m-13","type":"vault","x":13200,"w":24,"h":48},{"id":"m04-m-14","type":"vault","x":14150,"w":24,"h":48}],"coins":makeCoins("M04",COINS.M04)},
"M01":{"routeId": "M01", "worldId": "magma", "version": 1, "name": "FOUNDRY WALK", "length": 16300, "finishX": 16160, "checkpoints": [70, 5200, 10400, 15500], "obstacles": [{"id":"m01-m-gap-bridge","type":"platform","x":880,"y":395,"w":410,"h":24},{"id": "m01-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "m01-m-ramp", "type": "ramp", "x": 650, "w": 220, "h": 62}, {"id": "m01-m-01", "type": "vault", "x": 1800, "w": 24, "h": 48}, {"id": "m01-m-02", "type": "platform", "x": 2750, "w": 320, "h": 24, "y": 370}, {"id": "m01-m-03", "type": "slide", "x": 3700, "w": 56, "h": 160}, {"id": "m01-m-04", "type": "vault", "x": 4650, "w": 24, "h": 48}, {"id": "m01-m-05", "type": "platform", "x": 5600, "w": 320, "h": 24, "y": 370}, {"id": "m01-m-06", "type": "vault", "x": 6550, "w": 24, "h": 48}, {"id": "m01-m-07", "type": "slide", "x": 7500, "w": 56, "h": 160}, {"id": "m01-m-08", "type": "platform", "x": 8450, "w": 320, "h": 24, "y": 370}, {"id": "m01-m-09", "type": "vault", "x": 9400, "w": 24, "h": 48}, {"id": "m01-m-10", "type": "vault", "x": 10350, "w": 24, "h": 48}, {"id": "m01-m-11", "type": "platform", "x": 11300, "w": 320, "h": 24, "y": 370}, {"id": "m01-m-12", "type": "vault", "x": 12250, "w": 24, "h": 48}, {"id": "m01-m-13", "type": "vault", "x": 13200, "w": 24, "h": 48}, {"id": "m01-m-14", "type": "vault", "x": 14150, "w": 24, "h": 48}, {"id": "m01-m-upper-entry", "type": "platform", "x": 14500, "y": 370, "w": 260, "h": 24}, {"id": "m01-m-collapse", "type": "collapse", "x": 14760, "y": 370, "w": 200, "h": 24, "warning": 0.6}, {"id": "m01-m-upper-exit", "type": "platform", "x": 14960, "y": 370, "w": 300, "h": 24}], "groundSegments": [{"x": 0, "y": 455, "w": 1030, "h": 100, "kind": "ground"}, {"x": 1160, "y": 455, "w": 15140, "h": 100, "kind": "ground"}], "voidEdges": [1030, 1160],"coins":makeCoins("M01",COINS.M01)},
"M02":{"routeId": "M02", "worldId": "magma", "version": 1, "name": "CASTING CRANE", "length": 16300, "finishX": 16160, "checkpoints": [70, 5200, 10400, 15500], "obstacles": [{"id": "m02-m-intro", "type": "slide", "x": 300, "w": 56, "h": 160}, {"id": "m02-m-ramp", "type": "ramp", "x": 650, "w": 220, "h": 62}, {"id": "m02-m-01", "type": "crane", "x": 1800, "w": 230, "h": 24, "y": 390, "minX": 1730, "maxX": 2160, "speed": 88}, {"id": "m02-m-02", "type": "vault", "x": 2750, "w": 24, "h": 48}, {"id": "m02-m-03", "type": "slide", "x": 3700, "w": 56, "h": 160}, {"id": "m02-m-04", "type": "platform", "x": 4650, "w": 320, "h": 24, "y": 370}, {"id": "m02-m-05", "type": "vault", "x": 5600, "w": 24, "h": 48}, {"id": "m02-m-06", "type": "pallet", "x": 6550, "w": 230, "h": 24, "y": 390, "minX": 6480, "maxX": 6910, "speed": 102}, {"id": "m02-m-07", "type": "vault", "x": 7500, "w": 24, "h": 48}, {"id": "m02-m-08", "type": "platform", "x": 8450, "w": 320, "h": 24, "y": 370}, {"id": "m02-m-09", "type": "slide", "x": 9400, "w": 56, "h": 160}, {"id": "m02-m-10", "type": "crane", "x": 10350, "w": 230, "h": 24, "y": 390, "minX": 10350, "maxX": 10410, "speed": 40}, {"id": "m02-m-11", "type": "vault", "x": 11300, "w": 24, "h": 48}, {"id": "m02-m-12", "type": "platform", "x": 12250, "w": 320, "h": 24, "y": 370}, {"id": "m02-m-13", "type": "vault", "x": 13200, "w": 24, "h": 48}, {"id": "m02-m-14", "type": "vault", "x": 14150, "w": 24, "h": 48}],"coins":makeCoins("M02",COINS.M02)},
    D01: {
      routeId: "D01",
      worldId: "dock31",
      version: 2,
      name: "FIRST SHIFT",
      length: 8375,
      finishX: 8235,
      checkpoints: [70, 4214],
      chief: { startX: 4214 },
      movementProfile: "vector-v1",
      catchableSurfaces: [{id:"d01-v-04"},{id:"d01-v-05"},{id:"d01-v-06"},{id:"d01-v-07"},{id:"d01-v-09"},{id:"d01-v-10"},{id:"d01-v-14"},{id:"d01-v-15"},{id:"d01-v-16"},{id:"d01-v-17"},{id:"d01-v-19"},{id:"d01-v-20"},{id:"d01-v-22"},{id:"d01-v-24"}],
      highJumpZones: [],
      diveZones: [{id:"d01-dz-01",x1:305.6,x2:425.6,landX:1048,landY:-256.45},{id:"d01-dz-02",x1:5586.45,x2:5706.45,landX:5985.67,landY:145.43}],
      groundSegments: [
        { id: "d01-v-01", x: 0, y: -584.05, w: 441.6, h: 66, kind: "ground" },
        { id: "d01-v-02", x: 1008, y: -256.45, w: 240, h: 240, kind: "ground" },
        { id: "d01-v-03", x: 1248, y: -184.45, w: 432, h: 240, kind: "ground" },
        { id: "d01-v-04", x: 1251.6, y: -204.85, w: 34.8, h: 20.4, kind: "ground" },
        { id: "d01-v-05", x: 1259.28, y: -225.25, w: 15.6, h: 20.4, kind: "ground" },
        { id: "d01-v-06", x: 1318.8, y: -256.45, w: 144, h: 72, kind: "ground" },
        { id: "d01-v-07", x: 1536, y: -256.45, w: 144, h: 72, kind: "ground" },
        { id: "d01-v-08", x: 1680, y: -160.45, w: 648, h: 240, kind: "ground" },
        { id: "d01-v-09", x: 1721.94, y: -222.85, w: 66, h: 62.4, kind: "ground" },
        { id: "d01-v-10", x: 2136, y: -255.25, w: 192, h: 94.8, kind: "ground" },
        { id: "d01-v-11", x: 2424.72, y: -107.65, w: 980.04, h: 360, kind: "ground" },
        { id: "d01-v-14", x: 3233.28, y: -129.25, w: 171.6, h: 21.6, kind: "ground" },
        { id: "d01-v-15", x: 3405.12, y: -203.65, w: 1200, h: 240, kind: "ground" },
        { id: "d01-v-16", x: 3549.12, y: -225.25, w: 72, h: 21.6, kind: "ground" },
        { id: "d01-v-17", x: 3767.52, y: -225.25, w: 72, h: 21.6, kind: "ground" },
        { id: "d01-v-19", x: 4197.12, y: -225.25, w: 408, h: 21.6, kind: "ground" },
        { id: "d01-v-20", x: 4461.12, y: -299.65, w: 144, h: 74.4, kind: "ground" },
        { id: "d01-v-21", x: 4763.04, y: -155.65, w: 960, h: 48, kind: "ground" },
        { id: "d01-v-22", x: 4959.84, y: -177.25, w: 72, h: 21.6, kind: "ground" },
        { id: "d01-v-23", x: 5945.67, y: 145.43, w: 960, h: 48, kind: "ground" },
        { id: "d01-v-24", x: 6142.47, y: 123.83, w: 72, h: 21.6, kind: "ground" },
        { id: "d01-v-25", x: 7016.13, y: 382.04, w: 762.06, h: 928.8, kind: "ground" },
        { id: "d01-v-26", x: 7778.61, y: 455, w: 1197.6, h: 240, kind: "ground" },
        { id: "d01-v-27", x: 7778.61, y: 410.84, w: 48.24, h: 43.44, kind: "ground" },
        { id: "d01-v-28", x: 8314.29, y: 262.28, w: 12, h: 120, kind: "ground" },
        { id: "d01-u-1", x: 8098.53, y: 1317.98, w: 15.6, h: 21.6, kind: "ground" },
        { id: "d01-u-2", x: 8330.61, y: 1319.96, w: 408, h: 21.6, kind: "ground" },
        { id: "d01-u-3", x: 8498.61, y: 1300.04, w: 28.8, h: 21.6, kind: "ground" },
        { id: "d01-u-4", x: 8661.81, y: 1300.04, w: 28.8, h: 21.6, kind: "ground" },
      ],
      obstacles: [
        {id:"d01-slide-01",type:"slide",x:2773.2,w:48,h:86.4,baseY:-107.65},
        {id:"d01-slide-02",type:"slide",x:3031.2,w:48,h:86.4,baseY:-107.65},
        {id:"d01-vault-01",type:"vault",x:8609.01,w:24,h:48,baseY:455},
        {id:"d01-vault-02",type:"vault",x:3983.52,w:28.8,h:21.6,baseY:-203.65},
        {id:"d01-vault-03",type:"vault",x:8032.53,w:24,h:48,baseY:455},
        {id:"d01-vault-04",type:"vault",x:8445.81,w:24,h:48,baseY:455},
      ],
      coins: [
        { id: "D01-c01", n: 0, move_id: "d01-dz-01", kind: "CJ", x: 589.01, y: -701.11, skill: false },
        { id: "D01-c02", n: 1, move_id: "d01-slide-01", kind: "CS", x: 2797.2, y: -123.65, skill: true },
        { id: "D01-c03", n: 2, move_id: "d01-tr-14", kind: "CJ", x: 2378, y: -331.25, skill: false },
        { id: "D01-c04", n: 3, move_id: "d01-slide-02", kind: "CS", x: 3055.2, y: -123.65, skill: true },
        { id: "D01-c05", n: 4, move_id: "d01-dz-02", kind: "CJ", x: 5762.54, y: -272.5, skill: false },
        { id: "D01-c06", n: 5, move_id: "d01-vault-02", kind: "CS", x: 3997.92, y: -265.25, skill: true },
        { id: "D01-c07", n: 6, move_id: "d01-v-04", kind: "CC", x: 1267.6, y: -336.46, skill: true },
        { id: "D01-c08", n: 7, move_id: "d01-v-15", kind: "CC", x: 3421.12, y: -243.65, skill: true },
        { id: "D01-c09", n: 8, move_id: "d01-v-24", kind: "CC", x: 6158.47, y: 83.83, skill: true },
        { id: "D01-c10", n: 9, move_id: "d01-tr-29", kind: "CJ", x: 6955.67, y: 69.43, skill: false },
        { id: "D01-c11", n: 10, move_id: "d01-tr-30", kind: "CJ", x: 7828.19, y: 306.04, skill: false },
        { id: "D01-c12", n: 11, move_id: "d01-vault-03", kind: "CS", x: 8044.53, y: 367, skill: true },
      ],
    },
    D02: {
      routeId: "D02",
      worldId: "dock31",
      version: 3,
      name: "BARREL DELIVERY",
      length: 6400,
      finishX: 6260,
      checkpoints: [70, 1211, 3433, 5200],
      chief: { startX: 1211 },
      movementProfile: "vector-v1",
      catchableSurfaces: [{id:"d02-roof1-1"},{id:"d02-roof1-2"},{id:"d02-roof1-3"},{id:"d02-roof2-1"},{id:"d02-roof2-2"},{id:"d02-roof2-3"},{id:"d02-v-06"},{id:"d02-v-08"},{id:"d02-v-09"}],
      highJumpZones: [],
      diveZones: [{id:"d02-dz-01",x1:1685.8,x2:1787.6,landX:2184.7,landY:362.36}],
      groundSegments: [
        { id: "d02-v-01", x: 0, y: -224.2, w: 1280.4, h: 240, kind: "ground" },
        { id: "d02-v-02", x: 1282.8, y: -109, w: 129.6, h: 381.6, kind: "ground" },
        { id: "d02-v-03", x: 1282.8, y: -152.2, w: 88.8, h: 43.2, kind: "ground" },
        { id: "d02-v-04", x: 1755.6, y: 65, w: 48, h: 32.4, kind: "ground" },
        { id: "d02-v-05", x: 2144.7, y: 362.36, w: 146.6, h: 360, kind: "ground" },
        { id: "d02-v-06", x: 2285.58, y: 270.2, w: 1012.8, h: 360, kind: "ground" },
        { id: "d02-v-08", x: 2761.92, y: 248.6, w: 72, h: 21.6, kind: "ground" },
        { id: "d02-v-09", x: 3046.38, y: 248.6, w: 72, h: 21.6, kind: "ground" },
        { id: "d02-v-10", x: 3298.38, y: 270.2, w: 1507.2, h: 120, kind: "ground" },
        { id: "d02-v-11", x: 4930.08, y: 390.2, w: 919.96, h: 616.8, kind: "ground" },
        { id: "d02-v-14", x: 5905.15, y: 455, w: 928.9, h: 463.2, kind: "ground" },
        { id: "d02-v-15", x: 6339.06, y: 263.24, w: 12, h: 120, kind: "ground" },
        { id: "d02-u-1", x: 2655.18, y: 301.64, w: 28.8, h: 21.6, kind: "ground" },
        { id: "d02-u-2", x: 3229.08, y: 342.98, w: 72, h: 21.6, kind: "ground" },
        { id: "d02-u-3", x: 5988.78, y: 1490.78, w: 66, h: 288, kind: "ground" },
        { id: "d02-u-4", x: 6054.78, y: 1553.18, w: 78, h: 69.6, kind: "ground" },
        { id: "d02-u-5", x: 6132.78, y: 1575.98, w: 301.2, h: 46.8, kind: "ground" },
        { id: "d02-u-6", x: 6216.78, y: 1505.18, w: 48, h: 70.8, kind: "ground" },
        { id: "d02-roof1-1", x: 60, y: -263.8, w: 480, h: 39.6, kind: "ground" },
        { id: "d02-roof1-2", x: 140, y: -303.4, w: 320, h: 39.6, kind: "ground" },
        { id: "d02-roof1-3", x: 220, y: -343, w: 160, h: 39.6, kind: "ground" },
        { id: "d02-roof2-1", x: 598.56, y: -263.8, w: 480, h: 39.6, kind: "ground" },
        { id: "d02-roof2-2", x: 678.56, y: -303.4, w: 320, h: 39.6, kind: "ground" },
        { id: "d02-roof2-3", x: 758.56, y: -343, w: 160, h: 39.6, kind: "ground" },
        { id: "d02-slope-1", x: 1412.4, y: -65.5, w: 85.8, h: 43.5, kind: "ground" },
        { id: "d02-slope-2", x: 1498.2, y: -22, w: 85.8, h: 43.5, kind: "ground" },
        { id: "d02-slope-3", x: 1584, y: 21.5, w: 85.8, h: 43.5, kind: "ground" },
        { id: "d02-slope-4", x: 1669.8, y: 65, w: 85.8, h: 43.5, kind: "ground" },
      ],
      obstacles: [
        {id:"d02-vault-01",type:"vault",x:2602.38,w:24,h:48,baseY:270.2},
        {id:"d02-vault-02",type:"vault",x:5627.58,w:28.8,h:21.6,baseY:390.2},
        {id:"d02-vault-03",type:"vault",x:3351.18,w:24,h:48,baseY:270.2},
        {id:"d02-vault-04",type:"vault",x:5458.38,w:28.8,h:21.6,baseY:390.2},
        {id:"d02-vault-05",type:"vault",x:5367.9,w:24,h:48,baseY:390.2},
        {id:"d02-vault-06",type:"vault",x:2494.38,w:28.8,h:21.6,baseY:270.2},
      ],
      coins: [
        { id: "D02-c01", n: 0, move_id: "d02-vault-05", kind: "CS", x: 5379.9, y: 302.2, skill: true },
        { id: "D02-c02", n: 1, move_id: "d02-tr-13", kind: "CJ", x: 1330.4, y: -300.2, skill: false },
        { id: "D02-c03", n: 2, move_id: "d02-roof1-1", kind: "CC", x: 76, y: -303.8, skill: true },
        { id: "D02-c04", n: 3, move_id: "d02-v-09", kind: "CC", x: 3062.38, y: 208.6, skill: true },
        { id: "D02-c05", n: 4, move_id: "d02-dz-01", kind: "CJ", x: 1888.9, y: -52.02, skill: false },
        { id: "D02-c06", n: 5, move_id: "d02-tr-25", kind: "CJ", x: 4855.58, y: 194.2, skill: false },
        { id: "D02-c07", n: 6, move_id: "d02-tr-26", kind: "CJ", x: 5900.04, y: 314.2, skill: false },
        { id: "D02-c08", n: 7, move_id: "d02-tr-01", kind: "CJ", x: 110, y: -300.2, skill: false },
        { id: "D02-c09", n: 8, move_id: "d02-tr-02", kind: "CJ", x: 190, y: -339.4, skill: false },
        { id: "D02-c10", n: 9, move_id: "d02-tr-03", kind: "CJ", x: 270, y: -379, skill: false },
      ],
    },
    D03: {
      routeId: "D03", worldId: "dock31", version: 2, name: "CRANE CROSSING",
      length: 7139, finishX: 6999, checkpoints: [70,2125,4449],
      chief: { startX: 2125 }, movementProfile: "vector-v1",
      catchableSurfaces: [{id:"d03-v-03"},{id:"d03-v-04"},{id:"d03-v-06"},{id:"d03-v-07"},{id:"d03-v-09"},{id:"d03-v-11"},{id:"d03-v-16"},{id:"d03-v-18"},{id:"d03-v-20"},{id:"d03-v-26"},{id:"d03-v-27"},{id:"d03-v-28"},{id:"d03-v-30"}], highJumpZones: [], diveZones: [{id:"d03-dz-01",x1:2442,x2:2562,landX:3029.08,landY:301.4},{id:"d03-dz-02",x1:3873.24,x2:3983.64,landX:4168.12,landY:347},{id:"d03-dz-03",x1:4489.5,x2:4536.12,landX:4576.12,landY:282.2}],
      groundSegments: [{id:"d03-v-01",x:0,y:199.4,w:620.4,h:168,kind:"ground"},{id:"d03-v-02",x:0,y:156.2,w:225.3,h:43.2,kind:"ground"},{id:"d03-v-03",x:225.6,y:134.6,w:69.6,h:64.8,kind:"ground"},{id:"d03-v-04",x:463.68,y:177.8,w:72,h:21.6,kind:"ground"},{id:"d03-v-05",x:620.4,y:221,w:510,h:145.2,kind:"ground"},{id:"d03-v-06",x:705.18,y:199.4,w:72,h:21.6,kind:"ground"},{id:"d03-v-07",x:940.8,y:199.4,w:189.6,h:21.6,kind:"ground"},{id:"d03-v-08",x:1179.6,y:177.8,w:123.7,h:439.2,kind:"ground"},{id:"d03-v-09",x:1302,y:105.8,w:1260,h:120,kind:"ground"},{id:"d03-v-11",x:1887.48,y:84.2,w:72,h:21.6,kind:"ground"},{id:"d03-v-12",x:2989.08,y:301.4,w:255.31,h:254.4,kind:"ground"},{id:"d03-v-13",x:3025.56,y:-49,w:739.2,h:238.8,kind:"ground"},{id:"d03-v-14",x:3244.44,y:387.8,w:739.2,h:238.8,kind:"ground"},{id:"d03-v-16",x:3873.24,y:344.6,w:110.4,h:43.2,kind:"ground"},{id:"d03-v-17",x:4128.12,y:347,w:240,h:240,kind:"ground"},{id:"d03-v-18",x:4208.52,y:325.4,w:160.8,h:21.6,kind:"ground"},{id:"d03-v-19",x:4368.12,y:396.2,w:796.54,h:246.48,kind:"ground"},{id:"d03-v-20",x:4422.12,y:304.04,w:67.38,h:92.4,kind:"ground"},{id:"d03-v-21",x:4536.12,y:282.2,w:309.6,h:114,kind:"ground"},{id:"d03-v-23",x:4845.72,y:282.2,w:100.81,h:115.6,kind:"ground"},{id:"d03-v-24",x:5299.8,y:407,w:121.2,h:554.4,kind:"ground"},{id:"d03-v-25",x:5421,y:428.6,w:117.6,h:218.4,kind:"ground"},{id:"d03-v-26",x:5538.6,y:407,w:720,h:240,kind:"ground"},{id:"d03-v-27",x:5772.6,y:385.4,w:72,h:21.6,kind:"ground"},{id:"d03-v-28",x:6075,y:385.4,w:72,h:21.6,kind:"ground"},{id:"d03-v-29",x:6258.6,y:455,w:115.2,h:192,kind:"ground"},{id:"d03-v-30",x:6373.8,y:407,w:264,h:240,kind:"ground"},{id:"d03-v-31",x:6729.48,y:445.16,w:840,h:463.2,kind:"ground"},{id:"d03-v-32",x:7078.2,y:253.4,w:12,h:120,kind:"ground"},{id:"d03-u-1",x:1170,y:2058.92,w:648,h:240,kind:"ground"},{id:"d03-u-2",x:1399.2,y:1941.32,w:48,h:86.4,kind:"ground"},{id:"d03-u-3",x:1645.68,y:167.06,w:72,h:21.6,kind:"ground"},{id:"d03-u-4",x:1666.8,y:1941.32,w:48,h:86.4,kind:"ground"},{id:"d03-u-5",x:3244.44,y:344.6,w:219.51,h:43.2,kind:"ground"},{id:"d03-u-6",x:3464.04,y:344.6,w:88.8,h:43.2,kind:"ground"},{id:"d03-u-7",x:3552.84,y:366.2,w:244.8,h:21.6,kind:"ground"},{id:"d03-u-8",x:4845.72,y:646.52,w:98.99,h:39.6,kind:"ground"},{id:"d03-u-9",x:4947.72,y:925.4,w:48,h:74.4,kind:"ground"},{id:"d03-u-10",x:5103.72,y:866.36,w:48,h:74.4,kind:"ground"},{id:"d03-u-11",x:5644.2,y:681.8,w:28.8,h:21.6,kind:"ground"},{id:"d03-u-12",x:5945.4,y:653.72,w:28.8,h:21.6,kind:"ground"},{id:"d03-u-13",x:6300.6,y:489.08,w:33.6,h:48,kind:"ground"},{id:"d03-u-14",x:6730.2,y:1925.48,w:480,h:339.6,kind:"ground"},{id:"d03-u-15",x:6958.2,y:1882.28,w:12,h:43.2,kind:"ground"},{id:"d03-u-16",x:7114.2,y:1903.88,w:96,h:21.6,kind:"ground"},{id:"d03-slope-1",x:4946.53,w:117.76,y:323.8,h:41.6,kind:"ground",role:"zemin"},{id:"d03-slope-2",x:5064.29,w:117.76,y:365.4,h:41.6,kind:"ground",role:"zemin"},{id:"d03-slope-3",x:5182.04,w:117.76,y:407,h:41.6,kind:"ground",role:"zemin"}], obstacles: [{id:"d03-slide-01",type:"slide",x:1423.2,w:48,h:86.4,baseY:105.8},{id:"d03-slide-02",type:"slide",x:3693.24,w:96,h:21.6,baseY:387.8},{id:"d03-vault-01",type:"vault",x:5892.6,w:24,h:48,baseY:407},{id:"d03-vault-02",type:"vault",x:4706.52,w:28.8,h:21.6,baseY:282.2},{id:"d03-vault-03",type:"vault",x:5591.4,w:24,h:48,baseY:407}], coins: [{id:"D03-c01",n:0,move_id:"d03-v-03",kind:"CC",x:241.6,y:94.6,skill:true},{id:"D03-c02",n:1,move_id:"d03-v-04",kind:"CC",x:479.68,y:137.8,skill:true},{id:"D03-c03",n:2,move_id:"d03-tr-15",kind:"CJ",x:3260.42,y:225.4,skill:false},{id:"D03-c04",n:3,move_id:"d03-dz-02",kind:"CJ",x:4071.88,y:238.8,skill:false},{id:"D03-c05",n:4,move_id:"d03-v-09",kind:"CC",x:1318,y:65.8,skill:true},{id:"D03-c06",n:5,move_id:"d03-v-11",kind:"CC",x:1903.48,y:44.2,skill:true},{id:"D03-c07",n:6,move_id:"d03-v-16",kind:"CC",x:3889.24,y:304.6,skill:true},{id:"D03-c08",n:7,move_id:"d03-dz-01",kind:"CJ",x:2791.54,y:29.8,skill:false},{id:"D03-c09",n:8,move_id:"d03-tr-15",kind:"CJ",x:3260.42,y:225.4,skill:false},{id:"D03-c10",n:9,move_id:"d03-slide-02",kind:"CS",x:3741.24,y:326.2,skill:true},{id:"D03-c11",n:10,move_id:"d03-v-27",kind:"CC",x:5788.6,y:345.4,skill:true},{id:"D03-c12",n:11,move_id:"d03-tr-34",kind:"CJ",x:6699.64,y:331,skill:false},{id:"D03-c13",n:12,move_id:"d03-tr-10",kind:"CJ",x:1171,y:101.8,skill:false}],
    },
    D04: {
      routeId: "D04", worldId: "dock31", version: 1, name: "ROOFTOP SHORTCUT",
      length: 8169, finishX: 8029, checkpoints: [70,3919],
      chief: { startX: 3919 }, movementProfile: "vector-v1",
      catchableSurfaces: [{id:"d04-v-03"},{id:"d04-v-05"},{id:"d04-v-06"},{id:"d04-v-08"},{id:"d04-v-09"},{id:"d04-v-10"},{id:"d04-v-15"},{id:"d04-v-17"},{id:"d04-v-18"},{id:"d04-v-21"},{id:"d04-v-26"}], highJumpZones: [], diveZones: [{id:"d04-dz-01",x1:3276,x2:3396,landX:3846.4,landY:-83.8},{id:"d04-dz-02",x1:4809.6,x2:4882.8,landX:4922.8,landY:-155.8},{id:"d04-dz-03",x1:6974.4,x2:7094.4,landX:7634.8,landY:455}],
      groundSegments: [{id:"d04-v-01",x:0,y:-376.6,w:1368,h:72,kind:"ground"},{id:"d04-v-02",x:0,y:-448.6,w:240,h:72,kind:"ground"},{id:"d04-v-03",x:379.2,y:-448.6,w:312,h:72,kind:"ground"},{id:"d04-v-05",x:830.4,y:-448.6,w:543.6,h:72,kind:"ground"},{id:"d04-v-06",x:1058.16,y:-520.6,w:144,h:72,kind:"ground"},{id:"d04-v-07",x:1656,y:-131.8,w:360,h:240,kind:"ground"},{id:"d04-v-08",x:1656,y:-203.8,w:121.2,h:72,kind:"ground"},{id:"d04-v-09",x:1873.2,y:-203.8,w:48,h:72,kind:"ground"},{id:"d04-v-10",x:2016,y:-203.8,w:1380,h:240,kind:"ground"},{id:"d04-v-13",x:3806.4,y:-83.8,w:504,h:240,kind:"ground"},{id:"d04-v-14",x:3829.68,y:-297.4,w:42,h:120,kind:"ground"},{id:"d04-v-15",x:4086,y:-105.4,w:72,h:21.6,kind:"ground"},{id:"d04-v-16",x:4310.4,y:-15.4,w:620.4,h:171.6,kind:"ground"},{id:"d04-v-17",x:4358.4,y:-83.8,w:168,h:68.4,kind:"ground"},{id:"d04-v-18",x:4617.6,y:-83.8,w:192,h:68.4,kind:"ground"},{id:"d04-v-19",x:4882.8,y:-155.8,w:48,h:140.4,kind:"ground"},{id:"d04-v-20",x:4930.8,y:-83.8,w:129.6,h:240,kind:"ground"},{id:"d04-v-21",x:5060.4,y:-155.8,w:240,h:312,kind:"ground"},{id:"d04-v-22",x:5372.4,y:-88.6,w:240,h:240,kind:"ground"},{id:"d04-v-23",x:6273.6,y:270.2,w:820.8,h:240,kind:"ground"},{id:"d04-v-24",x:7593.6,y:276.2,w:150,h:87.6,kind:"ground"},{id:"d04-v-25",x:7594.8,y:455,w:1327.2,h:308.4,kind:"ground"},{id:"d04-v-26",x:7879.2,y:433.4,w:87.6,h:21.6,kind:"ground"},{id:"d04-v-27",x:8131.92,y:265.16,w:12,h:120,kind:"ground"},{id:"d04-u-1",x:117.6,y:-413.08,w:28.8,h:21.6,kind:"ground"},{id:"d04-u-2",x:930,y:-382.6,w:28.8,h:21.6,kind:"ground"},{id:"d04-u-3",x:2163.6,y:-44.68,w:72,h:21.6,kind:"ground"},{id:"d04-slope-1",x:1374,w:40.29,y:-403.34,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-2",x:1414.29,w:40.29,y:-358.09,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-3",x:1454.57,w:40.29,y:-312.83,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-4",x:1494.86,w:40.29,y:-267.57,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-5",x:1535.14,w:40.29,y:-222.31,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-6",x:1575.43,w:40.29,y:-177.06,h:45.26,kind:"ground",role:"zemin"},{id:"d04-slope-7",x:1615.71,w:40.29,y:-131.8,h:45.26,kind:"ground",role:"zemin"},{id:"d04-long-1",x:5612.4,w:82.65,y:-43.75,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-2",x:5695.05,w:82.65,y:1.1,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-3",x:5777.7,w:82.65,y:45.95,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-4",x:5860.35,w:82.65,y:90.8,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-5",x:5943,w:82.65,y:135.65,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-6",x:6025.65,w:82.65,y:180.5,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-7",x:6108.3,w:82.65,y:225.35,h:44.85,kind:"ground",role:"zemin"},{id:"d04-long-8",x:6190.95,w:82.65,y:270.2,h:44.85,kind:"ground",role:"zemin"}], obstacles: [{id:"d04-slide-01",type:"slide",x:552.72,w:48,h:86.4,baseY:-448.6},{id:"d04-vault-01",type:"vault",x:877.2,w:24,h:48,baseY:-448.6},{id:"d04-vault-02",type:"vault",x:2397.6,w:28.8,h:21.6,baseY:-203.8},{id:"d04-vault-03",type:"vault",x:2600.4,w:72,h:48,baseY:-203.8}], coins: [{id:"D04-c01",n:0,move_id:"d04-dz-01",kind:"CJ",x:3617.2,y:-279.8,skill:false},{id:"D04-c02",n:1,move_id:"d04-dz-02",kind:"CJ",x:4898.8,y:-179.8,skill:false},{id:"D04-c03",n:2,move_id:"d04-v-06",kind:"CC",x:1074.16,y:-560.6,skill:true},{id:"D04-c04",n:3,move_id:"d04-dz-03",kind:"CJ",x:7360.6,y:194.2,skill:false},{id:"D04-c05",n:4,move_id:"d04-slide-01",kind:"CS",x:576.72,y:-472.6,skill:true},{id:"D04-c06",n:5,move_id:"d04-dz-02",kind:"CJ",x:4898.8,y:-179.8,skill:false},{id:"D04-c07",n:6,move_id:"d04-tr-32",kind:"CJ",x:5352.4,y:-231.8,skill:false},{id:"D04-c08",n:7,move_id:"d04-dz-03",kind:"CJ",x:7360.6,y:194.2,skill:false},{id:"D04-c09",n:8,move_id:"d04-v-17",kind:"CC",x:4374.4,y:-123.8,skill:true},{id:"D04-c10",n:9,move_id:"d04-dz-02",kind:"CJ",x:4898.8,y:-179.8,skill:false},{id:"D04-c11",n:10,move_id:"d04-v-21",kind:"CC",x:5076.4,y:-195.8,skill:true},{id:"D04-c12",n:11,move_id:"d04-slide-01",kind:"CS",x:576.72,y:-472.6,skill:true}],
    },
    D05: {"routeId":"D05","worldId":"dock31","version":1,"name":"CLEAN CHAIN","length":7610,"finishX":7470,"checkpoints":[70,3019.91,6394.48],"chief":{"startX":3019.91},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d05-up-1"},{"id":"d05-up-2"},{"id":"d05-up-3"},{"id":"d05-v-03"},{"id":"d05-v-04"},{"id":"d05-v-05"},{"id":"d05-v-09"},{"id":"d05-v-13"},{"id":"d05-v-15"},{"id":"d05-v-20"},{"id":"d05-v-21"},{"id":"d05-v-22"}],"highJumpZones":[],"diveZones":[{"id":"d05-dz-01","x1":2204.4,"x2":2324.4,"landX":2598.4,"landY":-489.625},{"id":"d05-dz-02","x1":3362.4,"x2":3482.4,"landX":3952.24,"landY":-265},{"id":"d05-dz-03","x1":6929.97,"x2":7049.97,"landX":7240.96,"landY":365}],"groundSegments":[{"id":"d05-v-01","x":0,"y":-701.75,"w":1154.13,"h":165.6,"kind":"ground"},{"id":"d05-v-02","x":435.6,"y":-819.375,"w":300,"h":117.6,"kind":"ground"},{"id":"d05-v-03","x":600,"y":-841,"w":88.8,"h":21.6,"kind":"ground"},{"id":"d05-v-04","x":813.6,"y":-764.25,"w":66,"h":62.4,"kind":"ground"},{"id":"d05-v-05","x":1150.08,"y":-773.75,"w":819.37,"h":237.6,"kind":"ground"},{"id":"d05-v-06","x":2083.2,"y":-705.375,"w":241.2,"h":312,"kind":"ground"},{"id":"d05-v-07","x":2558.4,"y":-489.625,"w":924,"h":452.4,"kind":"ground"},{"id":"d05-v-08","x":2558.64,"y":-827.125,"w":120,"h":240,"kind":"ground"},{"id":"d05-v-09","x":2803.2,"y":-511.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d05-v-10","x":3912.24,"y":-265,"w":360,"h":632.4,"kind":"ground"},{"id":"d05-v-11","x":4272.24,"y":-202.625,"w":312,"h":324,"kind":"ground"},{"id":"d05-v-12","x":4584.24,"y":-118.625,"w":219.31,"h":240,"kind":"ground"},{"id":"d05-v-13","x":4802.88,"y":-193.25,"w":131.94,"h":314.4,"kind":"ground"},{"id":"d05-v-14","x":5167.44,"y":6.25,"w":132,"h":115.2,"kind":"ground"},{"id":"d05-v-15","x":5299.44,"y":-65.375,"w":308.4,"h":186.72,"kind":"ground"},{"id":"d05-v-17","x":5700.48,"y":23,"w":96,"h":549.6,"kind":"ground"},{"id":"d05-v-18","x":6030.48,"y":203,"w":61.2,"h":369.6,"kind":"ground"},{"id":"d05-v-19","x":6324.48,"y":455,"w":353.37,"h":117.6,"kind":"ground"},{"id":"d05-v-20","x":6677.76,"y":383,"w":420.06,"h":189.6,"kind":"ground"},{"id":"d05-v-21","x":6810,"y":361.375,"w":287.53,"h":21.6,"kind":"ground"},{"id":"d05-v-22","x":6989.52,"y":339.75,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d05-v-23","x":7200.96,"y":365,"w":840,"h":463.2,"kind":"ground"},{"id":"d05-v-24","x":7549.68,"y":173.25,"w":12,"h":120,"kind":"ground"},{"id":"d05-u-1","x":1242,"y":-646.375,"w":48,"h":86.4,"kind":"ground"},{"id":"d05-up-1","x":195.6,"w":80,"y":-741,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-up-2","x":275.6,"w":80,"y":-780.25,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-up-3","x":355.6,"w":80,"y":-819.375,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-down1-1","x":4934.82,"w":46.52,"y":-152.875,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-2","x":4981.34,"w":46.52,"y":-113,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-3","x":5027.86,"w":46.52,"y":-73.125,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-4","x":5074.38,"w":46.52,"y":-33.25,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-5","x":5120.9,"w":46.52,"y":6.625,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down2-1","x":5796.48,"w":58.5,"y":68,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-2","x":5854.98,"w":58.5,"y":113,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-3","x":5913.48,"w":58.5,"y":158,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-4","x":5971.98,"w":58.5,"y":203,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down3-1","x":6091.68,"w":38.8,"y":245,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-2","x":6130.48,"w":38.8,"y":287,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-3","x":6169.28,"w":38.8,"y":329,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-4","x":6208.08,"w":38.8,"y":371,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-5","x":6246.88,"w":38.8,"y":413,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-6","x":6285.68,"w":38.8,"y":455,"h":42,"kind":"ground","role":"zemin"}],"obstacles":[{"id":"d05-vault-01","type":"vault","x":5420.16,"w":72,"h":48,"baseY":-65.375},{"id":"d05-vault-02","type":"vault","x":5355.12,"w":24,"h":48,"baseY":-65.375},{"id":"d05-vault-03","type":"vault","x":6924.48,"w":24,"h":48,"baseY":361.375}],"coins":makeCoins("D05", COINS.D05)},
    D06: {"routeId":"D06","worldId":"dock31","version":1,"name":"SHIFT SUPERVISOR","length":5130,"finishX":4990,"checkpoints":[70,1560.4,2281.61,3913],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d06-v-02"},{"id":"d06-v-03"},{"id":"d06-v-05"},{"id":"d06-pit1-step-1"},{"id":"d06-pit1-step-2"},{"id":"d06-pit2-step-1"},{"id":"d06-pit2-step-2"},{"id":"d06-v-11"},{"id":"d06-v-14"},{"id":"d06-v-16"},{"id":"d06-v-18"},{"id":"d06-v-22"},{"id":"d06-v-23"},{"id":"d06-v-24"}],"highJumpZones":[],"diveZones":[{"id":"d06-dz-01","x1":937.2,"x2":992.97,"landX":1206.4,"landY":117.75},{"id":"d06-dz-02","x1":1166.4,"x2":1210.17,"landX":1423.6,"landY":44.625},{"id":"d06-dz-03","x1":1658.4,"x2":1778.4,"landX":2057.8,"landY":291.75},{"id":"d06-dz-04","x1":4414.2,"x2":4534.2,"landX":4760.2,"landY":434.625}],"groundSegments":[{"id":"d06-v-01","x":0,"y":191,"w":652.8,"h":237.6,"kind":"ground"},{"id":"d06-v-02","x":258,"y":169.375,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-v-03","x":532.8,"y":169.375,"w":120,"h":21.6,"kind":"ground"},{"id":"d06-v-04","x":652.8,"y":219.75,"w":72,"h":79.2,"kind":"ground"},{"id":"d06-v-05","x":724.8,"y":147.75,"w":96,"h":178.8,"kind":"ground"},{"id":"d06-v-06","x":937.2,"y":191,"w":120,"h":276,"kind":"ground"},{"id":"d06-v-07","x":1057.2,"y":350.625,"w":148.8,"h":116.4,"kind":"ground"},{"id":"d06-v-08","x":1166.4,"y":117.75,"w":120,"h":232.8,"kind":"ground"},{"id":"d06-v-09","x":1286.4,"y":275,"w":97.2,"h":75.6,"kind":"ground"},{"id":"d06-pit1-step-1","x":1094.4,"y":273,"w":36,"h":77.6,"kind":"ground","role":"pit-step"},{"id":"d06-pit1-step-2","x":1130.4,"y":195.375,"w":36,"h":155.2,"kind":"ground","role":"pit-step"},{"id":"d06-pit2-step-1","x":1335.6,"y":198.25,"w":24,"h":76.8,"kind":"ground","role":"pit-step"},{"id":"d06-pit2-step-2","x":1359.6,"y":121.375,"w":24,"h":153.6,"kind":"ground","role":"pit-step"},{"id":"d06-v-10","x":1383.6,"y":44.625,"w":106.8,"h":306,"kind":"ground"},{"id":"d06-v-11","x":1490.4,"y":-3.375,"w":288,"h":354,"kind":"ground"},{"id":"d06-v-13","x":2017.8,"y":291.75,"w":360,"h":240,"kind":"ground"},{"id":"d06-v-14","x":2260.2,"y":248.625,"w":117.6,"h":43.2,"kind":"ground"},{"id":"d06-v-15","x":2466.6,"y":291.75,"w":408,"h":240,"kind":"ground"},{"id":"d06-v-16","x":2523,"y":270.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-v-17","x":2986.2,"y":307.375,"w":169.2,"h":38.4,"kind":"ground"},{"id":"d06-v-18","x":3155.4,"y":225.75,"w":240,"h":120,"kind":"ground"},{"id":"d06-v-19","x":3484.2,"y":422.625,"w":360,"h":240,"kind":"ground"},{"id":"d06-v-21","x":3843,"y":455,"w":691.2,"h":208.32,"kind":"ground"},{"id":"d06-v-22","x":3882.6,"y":367.375,"w":136.8,"h":87.6,"kind":"ground"},{"id":"d06-v-23","x":4141.8,"y":399.75,"w":138,"h":55.2,"kind":"ground"},{"id":"d06-v-24","x":4396.2,"y":384.25,"w":138,"h":70.8,"kind":"ground"},{"id":"d06-v-25","x":4720.2,"y":434.625,"w":840,"h":463.2,"kind":"ground"},{"id":"d06-v-26","x":5068.92,"y":242.875,"w":12,"h":120,"kind":"ground"},{"id":"d06-u-1","x":109.2,"y":257.125,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d06-u-2","x":2986.2,"y":414.25,"w":408,"h":96,"kind":"ground"},{"id":"d06-u-3","x":3084.6,"y":392.625,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-u-4","x":3364.2,"y":345.75,"w":19.2,"h":10.8,"kind":"ground"}],"obstacles":[{"id":"d06-vault-01","type":"vault","x":3627,"w":72,"h":48,"baseY":422.625},{"id":"d06-vault-02","type":"vault","x":1571.76,"w":24,"h":48,"baseY":-3.375},{"id":"d06-vault-03","type":"vault","x":56.4,"w":24,"h":48,"baseY":191},{"id":"d06-vault-04","type":"vault","x":1633.2,"w":72,"h":48,"baseY":-3.375}],"coins":makeCoins("D06", COINS.D06)},
    F01: {"routeId":"F01","worldId":"frozen","version":1,"name":"COLD ARRIVAL","length":6343.52,"finishX":6203.52,"checkpoints":[70,1918,4825.6],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"f01-v-02"},{"id":"f01-v-04"},{"id":"f01-v-08"},{"id":"f01-v-13"},{"id":"f01-v-16"},{"id":"f01-v-18"},{"id":"f01-v-22"}],"highJumpZones":[],"diveZones":[{"id":"f01-dz-01","x1":480,"x2":612,"landX":652,"landY":-7},{"id":"f01-dz-02","x1":1212,"x2":1332,"landX":1804,"landY":151.375},{"id":"f01-dz-03","x1":2647.2,"x2":2746.36,"landX":2932,"landY":231.75},{"id":"f01-dz-04","x1":4081.2,"x2":4201.2,"landX":4619.2,"landY":318.25},{"id":"f01-dz-05","x1":4787.85,"x2":4907.85,"landX":5117.2,"landY":207.75},{"id":"f01-dz-06","x1":5353.37,"x2":5393.37,"landX":5602.72,"landY":248.625},{"id":"f01-dz-07","x1":5569.2,"x2":5689.2,"landX":5974,"landY":455}],"groundSegments":[{"id":"f01-v-01","x":0,"y":-7,"w":480,"h":238.8,"kind":"ground"},{"id":"f01-v-02","x":289.2,"y":-28.625,"w":88.8,"h":21.6,"kind":"ground"},{"id":"f01-v-03","x":480,"y":163.375,"w":132,"h":68.4,"kind":"ground"},{"id":"f01-v-04","x":612,"y":-7,"w":720,"h":238.8,"kind":"ground"},{"id":"f01-v-06","x":1764,"y":151.375,"w":240,"h":326.4,"kind":"ground"},{"id":"f01-v-07","x":2004,"y":237.75,"w":795.6,"h":240,"kind":"ground"},{"id":"f01-v-08","x":2066.4,"y":194.625,"w":240,"h":43.2,"kind":"ground"},{"id":"f01-v-11","x":2892,"y":231.75,"w":1309.2,"h":320.4,"kind":"ground"},{"id":"f01-v-12","x":2892,"y":101,"w":19.2,"h":79.2,"kind":"ground"},{"id":"f01-v-13","x":3118.8,"y":210.25,"w":72,"h":21.6,"kind":"ground"},{"id":"f01-v-15","x":4579.2,"y":318.25,"w":176.4,"h":369.6,"kind":"ground"},{"id":"f01-v-16","x":4755.6,"y":270.25,"w":408,"h":280.8,"kind":"ground"},{"id":"f01-v-18","x":5077.2,"y":207.75,"w":66,"h":62.4,"kind":"ground"},{"id":"f01-v-19","x":5163.6,"y":311,"w":525.6,"h":240,"kind":"ground"},{"id":"f01-v-22","x":5562.72,"y":248.625,"w":126.48,"h":62.4,"kind":"ground"},{"id":"f01-v-23","x":5934,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"f01-v-24","x":6282.72,"y":263.25,"w":12,"h":120,"kind":"ground"}],"obstacles":[{"id":"f01-slide-02","type":"slide","x":5238.24,"w":48,"h":86.4,"baseY":311},{"id":"f01-slide-03","type":"slide","x":5274.37,"w":48,"h":86.4,"baseY":311},{"id":"f01-vault-01","type":"vault","x":753.6,"w":72,"h":48,"baseY":-7},{"id":"f01-vault-02","type":"vault","x":2575.2,"w":72,"h":48,"baseY":237.75},{"id":"f01-vault-03","type":"vault","x":3382.8,"w":72,"h":48,"baseY":231.75},{"id":"f01-vault-04","type":"vault","x":2457.6,"w":72,"h":48,"baseY":237.75}],"coins":makeCoins("F01", COINS.F01)},
    F02: {"routeId":"F02","worldId":"frozen","version":1,"name":"SUSPENDED CARGO","length":8604.32,"finishX":8464.32,"checkpoints":[70,2496,6073.6],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"f02-v-03"},{"id":"f02-v-05"},{"id":"f02-v-07"},{"id":"f02-v-08"},{"id":"f02-v-12"},{"id":"f02-v-13"},{"id":"f02-v-14"},{"id":"f02-v-15"},{"id":"f02-v-16"},{"id":"f02-v-17"},{"id":"f02-v-20"},{"id":"f02-v-23"},{"id":"f02-v-28"},{"id":"f02-v-29"}],"highJumpZones":[],"diveZones":[{"id":"f02-dz-01","x1":398.4,"x2":519.6,"landX":559.6,"landY":-421},{"id":"f02-dz-02","x1":656.4,"x2":774,"landX":814,"landY":-469},{"id":"f02-dz-03","x1":1034.4,"x2":1093.46,"landX":1312,"landY":-447.375},{"id":"f02-dz-04","x1":2443.2,"x2":2504.62,"landX":2687.2,"landY":-327.375},{"id":"f02-dz-05","x1":2846.61,"x2":2886.61,"landX":3095.2,"landY":-387.375},{"id":"f02-dz-06","x1":3117.94,"x2":3237.94,"landX":3455.2,"landY":-315.375},{"id":"f02-dz-07","x1":3739.2,"x2":3859.2,"landX":4043.2,"landY":-231.375},{"id":"f02-dz-08","x1":4155.6,"x2":4287.6,"landX":4367.2,"landY":-205},{"id":"f02-dz-09","x1":5504.4,"x2":5624.4,"landX":6043.6,"landY":32.625},{"id":"f02-dz-10","x1":6799.62,"x2":6839.62,"landX":7032.4,"landY":11},{"id":"f02-dz-11","x1":7629.84,"x2":7748.4,"landX":8234.8,"landY":455}],"groundSegments":[{"id":"f02-v-01","x":0,"y":-433,"w":162.93,"h":199.2,"kind":"ground"},{"id":"f02-v-02","x":136.8,"y":-301,"w":261.6,"h":67.2,"kind":"ground"},{"id":"f02-v-03","x":260.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"f02-v-04","x":368.4,"y":-233.75,"w":290.4,"h":58.8,"kind":"ground"},{"id":"f02-v-05","x":519.6,"y":-421,"w":136.8,"h":187.2,"kind":"ground"},{"id":"f02-v-06","x":656.4,"y":-301,"w":516,"h":67.2,"kind":"ground"},{"id":"f02-v-07","x":774,"y":-469,"w":136.8,"h":168,"kind":"ground"},{"id":"f02-v-08","x":1034.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"f02-v-09","x":1272,"y":-231.375,"w":1267.2,"h":240,"kind":"ground"},{"id":"f02-v-10","x":1272,"y":-447.375,"w":136.8,"h":216,"kind":"ground"},{"id":"f02-v-11","x":1408.8,"y":-279.375,"w":528,"h":48,"kind":"ground"},{"id":"f02-v-12","x":1551.6,"y":-349,"w":136.8,"h":69.6,"kind":"ground"},{"id":"f02-v-13","x":1760.16,"y":-301,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-v-14","x":2079.6,"y":-274.625,"w":56.4,"h":43.2,"kind":"ground"},{"id":"f02-v-15","x":2188.8,"y":-291.375,"w":16.8,"h":60,"kind":"ground"},{"id":"f02-v-16","x":2282.4,"y":-253,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-v-17","x":2443.2,"y":-327.375,"w":96,"h":96,"kind":"ground"},{"id":"f02-v-18","x":2647.2,"y":-327.375,"w":408,"h":338.4,"kind":"ground"},{"id":"f02-v-20","x":3055.2,"y":-387.375,"w":48,"h":398.4,"kind":"ground"},{"id":"f02-v-21","x":3103.2,"y":-231.375,"w":756,"h":242.4,"kind":"ground"},{"id":"f02-v-23","x":3415.2,"y":-315.375,"w":120,"h":84,"kind":"ground"},{"id":"f02-v-24","x":4003.2,"y":-231.375,"w":80.88,"h":348,"kind":"ground"},{"id":"f02-v-25","x":4069.2,"y":-169,"w":86.4,"h":115.2,"kind":"ground"},{"id":"f02-v-26","x":4155.6,"y":-105.375,"w":132,"h":51.6,"kind":"ground"},{"id":"f02-v-28","x":4327.2,"y":-205,"w":490.8,"h":145.2,"kind":"ground"},{"id":"f02-v-29","x":4595.76,"y":-226.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-u-1","x":4789.2,"y":-143.75,"w":28.8,"h":21.6,"kind":"ground"},{"id":"f02-v-30","x":4902,"y":-67,"w":722.4,"h":145.2,"kind":"ground"},{"id":"f02-v-31","x":4986,"y":-347.75,"w":634.8,"h":145.2,"kind":"ground"},{"id":"f02-v-32","x":6003.6,"y":32.625,"w":1344,"h":434.4,"kind":"ground"},{"id":"f02-v-37","x":6992.4,"y":11,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-v-39","x":7700.4,"y":239,"w":48,"h":32.4,"kind":"ground"},{"id":"f02-v-40","x":8194.8,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"f02-v-41","x":8543.52,"y":263.25,"w":12,"h":120,"kind":"ground"},{"id":"f02-slope-1","x":7347.6,"w":70.56,"y":73.875,"h":41.275,"kind":"ground","role":"zemin"},{"id":"f02-slope-2","x":7418.160000000001,"w":70.56,"y":115.125,"h":41.275,"kind":"ground","role":"zemin"},{"id":"f02-slope-3","x":7488.72,"w":70.56,"y":156.5,"h":41.275,"kind":"ground","role":"zemin"},{"id":"f02-slope-4","x":7559.280000000001,"w":70.56,"y":197.75,"h":41.275,"kind":"ground","role":"zemin"},{"id":"f02-slope-5","x":7629.84,"w":70.56,"y":239,"h":41.275,"kind":"ground","role":"zemin"}],"obstacles":[{"id":"f02-slide-01","type":"slide","x":2767.61,"w":48,"h":86.4,"baseY":-327.375},{"id":"f02-vault-01","type":"vault","x":6222,"w":72,"h":48,"baseY":32.625},{"id":"f02-vault-02","type":"vault","x":7165.2,"w":72,"h":48,"baseY":32.625},{"id":"f02-vault-03","type":"vault","x":6538.8,"w":72,"h":48,"baseY":32.625},{"id":"f02-vault-04","type":"vault","x":6380.4,"w":72,"h":48,"baseY":32.625},{"id":"f02-vault-05","type":"vault","x":6727.62,"w":72,"h":48,"baseY":32.625}],"coins":makeCoins("F02", COINS.F02)},
    F03: {
      routeId: "F03", worldId: "frozen", version: 1, name: "HANGAR RUN",
      length: 14800, finishX: 14660, checkpoints: [70, 4200, 9350],
      obstacles: [
        // T2-c2: approved gap additions; existing geometry is preserved.
        {"id":"f03-t2c-vault-4","type":"vault","x":1864,"y":407,"w":24,"h":48},
        {"id":"f03-t2c-vault-6","type":"vault","x":8494,"y":407,"w":24,"h":48},
        {"id":"f03-t2c-vault-12","type":"vault","x":10884,"y":407,"w":24,"h":48},
        {"id":"f03-t2c-vault-16","type":"vault","x":12826,"y":407,"w":24,"h":48},
        { id: "f03-slide-a", type: "slide", x: 820, w: 56, h: 160 },
        { id: "f03-t1b-vault-4", type: "vault", x: 1540, w: 24, h: 48 },
        { id: "f03-t1b-platform-1", type: "platform", x: 3640, y: 370, w: 320, h: 24 },
        { id: "f03-slide-b", type: "slide", x: 4560, w: 56, h: 160 },
        { id: "f03-t1b-vault-2", type: "vault", x: 5450, w: 24, h: 48 },
        { id: "f03-t1b-platform-2", type: "platform", x: 5810, y: 370, w: 320, h: 24 },
        { id: "f03-overpass-ramp", type: "ramp", x: 6600, w: 220, h: 74 },
        { id: "f03-overpass", type: "overpass", x: 6760, y: 238, w: 1040, h: 24 },
        { id: "f03-door", type: "containerDoor", x: 7470, y: 275, w: 76, h: 180, openY: 135, prepare: 1, close: 0.65, closed: 20, open: 4 },
        { id: "f03-worker", type: "worker", x: 7660, w: 48, h: 70 },
        { id: "f03-t1b-vault-3", type: "vault", x: 8170, w: 24, h: 48 },
        { id: "f03-t1b-platform-3", type: "platform", x: 9570, y: 370, w: 320, h: 24 },
        { id: "f03-vault", type: "vault", x: 10560, w: 24, h: 48 },
        { id: "f03-t1b-slide-1", type: "slide", x: 12470, w: 56, h: 160 },
        { id: "f03-t1b-vault-1", type: "vault", x: 14310, w: 24, h: 48 },
      ],
      coins: makeCoins("F03", COINS.F03),
    },
    F04: {
      routeId: "F04", worldId: "frozen", version: 1, name: "FROSTLINE EXPRESS",
      length: 14500, finishX: 14360, checkpoints: [70, 4600, 9950],
      obstacles: [
        // T2-c2: approved gap additions; existing geometry is preserved.
        {"id":"f04-t2c-vault-2","type":"vault","x":5314,"y":407,"w":24,"h":48},
        {"id":"f04-t2c-vault-3","type":"vault","x":10282,"y":407,"w":24,"h":48},
        {"id":"f04-t2c-vault-4","type":"vault","x":11134,"y":407,"w":24,"h":48},
        {"id":"f04-t2c-vault-6","type":"vault","x":12164,"y":407,"w":24,"h":48},
        {"id":"f04-t2c-vault-8","type":"vault","x":13636,"y":407,"w":24,"h":48},
        {"id":"f04-t2c-vault-9","type":"vault","x":14036,"y":407,"w":24,"h":48},
        { id: "f04-t1b-slide-1", type: "slide", x: 250, w: 56, h: 160 },
        { id: "f04-long-ramp", type: "ramp", x: 1450, w: 420, h: 92 },
        { id: "f04-safe-landing", type: "platform", x: 1850, y: 200, w: 470, h: 24 },
        { id: "f04-roll", type: "rollDrop", x: 1850, w: 900, h: 18 },
        { id: "f04-t1b-pallet-1", type: "pallet", x: 3190, y: 405, w: 210, h: 22, minX: 3060, maxX: 4040, speed: 105 },
        { id: "f04-t1b-vault-2", type: "vault", x: 4990, w: 24, h: 48 },
        { id: "f04-shortcut-ramp", type: "ramp", x: 5970, w: 200, h: 74 },
        { id: "f04-upper-a", type: "platform", x: 6210, y: 330, w: 520, h: 24 },
        { id: "f04-collapse", type: "collapse", x: 6730, y: 330, w: 300, h: 24, warning: 0.9 },
        { id: "f04-upper-b", type: "platform", x: 7030, y: 330, w: 760, h: 24 },
        { id: "f04-t1b-vault-3", type: "vault", x: 8110, w: 24, h: 48 },
        { id: "f04-t1b-pallet-2", type: "pallet", x: 8730, y: 405, w: 210, h: 22, minX: 8600, maxX: 9580, speed: 105 },
        { id: "f04-vault", type: "vault", x: 10810, w: 24, h: 48 },
        { id: "f04-t1b-vault-1", type: "vault", x: 11840, w: 24, h: 48 },
      ],
      coins: makeCoins("F04", COINS.F04),
    },
  });
  const CHIEF_SPRITE = new Image();
  CHIEF_SPRITE.src = "sprites/chief.png";
  function range(start, count, x, step) {
    return Array.from({ length: count }, (_, i) => ({
      n: start + i,
      x: x + i * step,
      y: i % 3 === 1 ? 355 : 390,
      skill: start + i >= 25,
    }));
  }
  function adjustCoins(routeId, list) {
    const fixes = routeId === "D01" ? {15:2830,25:2600} : routeId === "D02" ? {11:2100,19:3460} : routeId === "D03" ? {19:7990} : routeId === "D05" ? {25:4450} : routeId === "D06" ? {6:3000,9:4320} : {};
    const yFixes = routeId === "D01"
      ? {...Object.fromEntries(list.map(v=>[v.n,407])),25:250,26:318,27:431,32:455,34:455,38:455}
      : routeId === "D02"
        ? {...Object.fromEntries(list.map(v=>[v.n,407])),7:455,16:215,17:329}
      : routeId === "D03"
      ? {4:341,12:431,13:431,14:326,19:285,25:431,26:431,27:431,28:431,29:431,30:341,31:341,32:341,33:389,34:431,35:431,36:389,37:431,38:431,39:326}
      : routeId === "D04"
        ? {...Object.fromEntries(list.map(v=>[v.n,407])),4:279,7:455,8:455,9:455,33:341}
      : routeId === "D05"
        ? {14:455,15:455,16:455,17:455,18:376,19:383,20:383,25:431,26:431,27:431,28:415,29:451,30:415,31:431,32:415,33:431,34:415,35:232,36:261}
        : routeId === "D06"
          ? {1:285,6:407,9:407}
        : {};
    return list.map(v => ({...v,x:fixes[v.n] === undefined ? v.x : fixes[v.n],y:yFixes[v.n] === undefined ? v.y : yFixes[v.n]}));
  }
  function makeCoins(routeId, list) {
    return list.map((v) => ({
      id: `${routeId}-c${String(v.n + 1).padStart(2, "0")}`,
      ...v,
    }));
  }
  function drawCoin(c, coin) {
    c.fillStyle = coin.skill ? "#75e5ff" : "#ffd33d";
    c.beginPath();
    c.arc(coin.x, coin.y, COIN_FILL_RADIUS, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#fff2a4";
    c.lineWidth = COIN_STROKE_WIDTH;
    c.stroke();
    c.fillStyle = "#8b6414";
    c.font = "950 9px system-ui";
    c.fillText("T", coin.x - 3, coin.y + 3);
  }
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function baseProfile() {
    return {
      schemaVersion: SCHEMA,
      profileRevision: 0,
      walletBalance: 0,
      runnerId: null,
      ownedRunnerIds: ["male", "female"],
      equippedOutfitByRunner: { male: "default", female: "default" },
      ownedOutfitSetIds: ["default"],
      ownedWorldIds: ["dock31"],
      selectedWorldId: "dock31",
      progressByRoute: {},
      pendingRunsByRoute: {},
      bestRunsByRouteVersion: {},
      settings: { language: languageFrom(platformLanguage()) },
      migrationFlags: {},
      legacyProgress: null,
      bankedRunIds: [],
      rewardedRunIds: [],
    };
  }
  function languageFrom(v) {
    v = String(v || "en").toLowerCase();
    return v.startsWith("tr") ? "tr" : v.startsWith("ru") ? "ru" : "en";
  }
  function platformLanguage() {
    let value = navigator.language;
    document.dispatchEvent(new CustomEvent("tmb:platform-language", { detail:v=>{value=v} }));
    return value;
  }
  function normalizeProfile(raw) {
    const p = baseProfile();
    if (!raw || typeof raw !== "object") return p;
    const n = { ...p, ...raw };
    n.schemaVersion = SCHEMA;
    n.ownedRunnerIds = ["male", "female"];
    n.profileRevision = Math.max(0, Number(raw.profileRevision) || 0);
    n.walletBalance = Math.max(0, Math.floor(Number(raw.walletBalance) || 0));
    n.runnerId = RUNNERS[raw.runnerId] ? raw.runnerId : null;
    n.equippedOutfitByRunner = {
      ...p.equippedOutfitByRunner,
      ...(raw.equippedOutfitByRunner || {}),
    };
    n.ownedOutfitSetIds = [
      ...new Set([
        "default",
        ...(Array.isArray(raw.ownedOutfitSetIds)
          ? raw.ownedOutfitSetIds.filter((x) => OUTFITS[x])
          : []),
      ]),
    ];
    for (const id of Object.keys(RUNNERS)) {
      if (!n.ownedOutfitSetIds.includes(n.equippedOutfitByRunner[id])) n.equippedOutfitByRunner[id] = "default";
    }
    n.ownedWorldIds = [
      ...new Set([
        "dock31",
        ...(Array.isArray(raw.ownedWorldIds) ? raw.ownedWorldIds : []),
      ]),
    ];
    n.progressByRoute =
      raw.progressByRoute && typeof raw.progressByRoute === "object"
        ? raw.progressByRoute
        : {};
    n.pendingRunsByRoute =
      raw.pendingRunsByRoute && typeof raw.pendingRunsByRoute === "object"
        ? raw.pendingRunsByRoute
        : {};
    n.bestRunsByRouteVersion =
      raw.bestRunsByRouteVersion &&
      typeof raw.bestRunsByRouteVersion === "object"
        ? raw.bestRunsByRouteVersion
        : {};
    n.settings = { ...p.settings, ...(raw.settings || {}) };
    n.migrationFlags = { ...(raw.migrationFlags || {}) };
    n.bankedRunIds = [
      ...new Set(
        Array.isArray(raw.bankedRunIds) ? raw.bankedRunIds.slice(-100) : [],
      ),
    ];
    n.rewardedRunIds = [
      ...new Set(Array.isArray(raw.rewardedRunIds) ? raw.rewardedRunIds.slice(-100) : []),
    ];
    return n;
  }
  function validV36(s) {
    return (
      !!s &&
      s.v === 36 &&
      s.partCount === 6 &&
      Number.isInteger(s.currentLevel) &&
      s.currentLevel >= 1 &&
      s.currentLevel <= 31 &&
      Number.isInteger(s.currentPart) &&
      s.currentPart >= 1 &&
      s.currentPart <= 6 &&
      Array.isArray(s.collected) &&
      s.collected.length === 31
    );
  }
  function migrateV36(raw, current) {
    const existing = normalizeProfile(current);
    if (existing.migrationFlags.v36) return existing;
    let parsed = raw;
    try {
      if (typeof raw === "string") parsed = JSON.parse(raw);
    } catch (_) {
      parsed = null;
    }
    const candidate =
      parsed && validV36(parsed.v36)
        ? parsed.v36
        : validV36(parsed)
          ? parsed
          : null;
    if (!candidate) return existing;
    existing.legacyProgress = {
      schema: "v36",
      envelope: clone(parsed),
      importedAt: "2026-09-25",
    };
    existing.runnerId =
      candidate.character === 2 || candidate.character === 3
        ? "female"
        : candidate.character === undefined
          ? null
          : "male";
    existing.settings.bgmMuted = !!candidate.bgmMuted;
    existing.migrationFlags.v36 = true;
    return existing;
  }
  let profile = baseProfile(),
    saveStatus = "idle",
    saveFailure = false;
  function fallbackStorage() {
    return {
      get: async (key) => localStorage.getItem(key),
      set: async (key, value) => localStorage.setItem(key, value),
      delete: async (key) => localStorage.removeItem(key),
    };
  }
  const campaignStorage = window.__tmbStorage || fallbackStorage();
  let persistQueue = Promise.resolve();
  function persist() {
    profile.profileRevision++;
    const raw = JSON.stringify(profile);
    const write = async () => {
      try {
        await campaignStorage.set(PROFILE_KEY, raw);
        saveStatus = "saved";
        saveFailure = false;
        return true;
      } catch (e) {
        saveStatus = "failed";
        saveFailure = true;
        emitGame("profile_save_failed", { reason: e?.name || "storage" });
        return false;
      }
    };
    const result = persistQueue.then(write, write);
    persistQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  async function loadProfile() {
    let raw = null,
      legacy = null;
    try {
      raw = parseSave(await campaignStorage.get(PROFILE_KEY));
      legacy = await campaignStorage.get(LEGACY_KEY);
    } catch (_) {}
    profile = migrateV36(legacy, raw);
    if (!raw) profile.settings.reducedEffects = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (profile.migrationFlags.v36 && !raw) await persist();
    document
      .querySelectorAll(".characterChoice")
      .forEach((el) => el.replaceWith(el.cloneNode(true)));
    addEventListener(
      "keydown",
      (e) => {
        if (e.repeat && ["ArrowUp", "w", "W", " "].includes(e.key))
          e.stopImmediatePropagation();
      },
      true,
    );
    return profile;
  }
  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  let campaign = false,
    routeId = "D01",
    route = ROUTES.D01,
    run = null,
    result = null,
    shopOpen = false,
    shopTab = "outfits",
    previewOutfitId = "default",
    previewWorldId = "dock31",
    previewRunnerId = "male",
    previewMotion = "idle",
    previewStartedAt = 0,
    purchaseBusy = false,
    sceneCache = new Map(),
    staggerT = 0,
    invulnerableT = 0,
    respawnT = 0,
    frontFlip = { active: false, angle: 0 },
    barrels = [],
    workerClock = 0,
    workerDisabled = false,
    workerPreviousBottom = null,
    lastFrame = performance.now(),
    flow = 0,
    flowSeen = new Set(),
    flowMoves = [],
    wallMantle = null,
    lastWallMantle = null,
    edgeClimb = null,
    edgeCatchCooldown = 0,
    edgeCatchProbe = null,
    vectorJumpPending = null,
    vectorAir = null,
    vectorRollStarts = 0,
    diveRun = null,
    slopeContact = null,
    routeStartedAt = 0,
    movingPlatforms = [],
    collapsing = [],
    containerDoors = [],
    campaignChief = null,
    campaignDeaths = 0,
    debugHidePlayer = false,
    debugHideMovingPlatforms = false,
    gameClock = 0,
    movementProfileCache = null,
    obstacleSeedCache = new Map(),
    platformOrder = { colliderFrame: 0, landingFrame: 0, carryFrame: 0 },
    flowFlash = 0,
    campaignAdPaused = false,
    routesSinceInterstitial = 0;
  document.addEventListener("tmb:campaign-ad-pause",e=>{campaignAdPaused=e.detail===true;});
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
    return JSON.stringify(value);
  }
  function sha256(text) {
    const r=(n,x)=>(x>>>n)|(x<<(32-n)),k=[],h=[],p={};let u=2,n=0;
    while(k.length<64){if(!p[u]){for(let i=2;i*i<=u;i++)if(u%i===0){p[u]=1;break}if(!p[u]){if(n<8)h[n]=(Math.pow(u,.5)*4294967296)|0;k[n++]=(Math.pow(u,1/3)*4294967296)|0}}u++}
    const bytes=new TextEncoder().encode(text),bit=bytes.length*8,a=Array.from(bytes);a.push(128);while(a.length%64!==56)a.push(0);for(let i=7;i>=0;i--)a.push(i<4?(bit>>>i*8)&255:0);
    for(let o=0;o<a.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(a[o+4*i]<<24)|(a[o+4*i+1]<<16)|(a[o+4*i+2]<<8)|a[o+4*i+3];for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(r(7,x)^r(18,x)^(x>>>3))+w[i-7]+(r(17,y)^r(19,y)^(y>>>10)))|0}let [A,B,C,D,E,F,G,Hh]=h;for(let i=0;i<64;i++){const t1=(Hh+(r(6,E)^r(11,E)^r(25,E))+((E&F)^(~E&G))+k[i]+w[i])|0,t2=((r(2,A)^r(13,A)^r(22,A))+((A&B)^(A&C)^(B&C)))|0;Hh=G;G=F;F=E;E=(D+t1)|0;D=C;C=B;B=A;A=(t1+t2)|0}h[0]=(h[0]+A)|0;h[1]=(h[1]+B)|0;h[2]=(h[2]+C)|0;h[3]=(h[3]+D)|0;h[4]=(h[4]+E)|0;h[5]=(h[5]+F)|0;h[6]=(h[6]+G)|0;h[7]=(h[7]+Hh)|0}
    return h.map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");
  }
  function movementProfile() {
    return movementProfileCache||(movementProfileCache=sha256(canonical({movementSources:engine?.movementSources||{},engineConstants:engine?.constants||{}})));
  }
  function obstacleSeed(r=route) {
    const key=`${r.routeId}@${r.version}`;
    if(!obstacleSeedCache.has(key))obstacleSeedCache.set(key,sha256(canonical({length:r.length,finishX:r.finishX,checkpoints:r.checkpoints,obstacles:r.obstacles,groundSegments:r.groundSegments||null,voidEdges:r.voidEdges||null})));
    return obstacleSeedCache.get(key);
  }
  function routeSurfaces(r) {
    const out = r.groundSegments ? r.groundSegments.map(s=>({...s})) : [{ x: 0, y: GROUND, w: r.length, h: 100, kind: "ground" }];
    const catchableById=new Map((r.catchableSurfaces||[]).map(s=>typeof s==="string"?[s,{}]:[s.id,s]));
    for (const o of r.obstacles) {
      const baseY = o.baseY ?? GROUND;
      if (o.type === "vault")
        out.push({ x: o.x, y: baseY - o.h, w: o.w, h: o.h, parkour: "vault" });
      if (o.type === "slide")
        out.push({
          x: o.x,
          y: baseY - o.h - 32,
          w: o.w,
          h: o.h,
          parkour: "slide",
        });
      if (o.type === "wallRun")
        out.push({
          x: o.x,
          y: baseY - 130,
          w: o.w,
          h: 130,
          parkour: "wallRun",
        });
      if (o.type === "platform")
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: "platform", ...(catchableById.has(o.id)?{id:o.id}:{}) });
      if (o.type === "overpass")
        out.push({ x: o.x, y: o.y, w: o.w, h: o.h, kind: "movingPlatform", id:o.id });
      if (o.type === "collapse") {
        const c=collapsing.find(v=>v.id===o.id);
        if (!c || c.state === "READY" || c.state === "CONTACT_WARNING")
          out.push({ x:o.x, y:o.y, w:o.w, h:o.h, kind:"collapse", id:o.id });
      }
    }
    for(const s of out)if(s.id&&catchableById.has(s.id)){s.catchable=true;s.catchDir=catchableById.get(s.id).dir||1}
    return out;
  }
  function routeGroundYAt(x) {
    const slope=(route.slopes||[]).find(s=>x>=Math.min(s.x1,s.x2)&&x<=Math.max(s.x1,s.x2));
    if(slope){const t=(x-slope.x1)/(slope.x2-slope.x1);return slope.y1+(slope.y2-slope.y1)*t}
    const grounds=routeSurfaces(route).filter(s=>s.kind==="ground"&&x>=s.x&&x<=s.x+s.w);
    return grounds.length?Math.min(...grounds.map(s=>s.y)):GROUND;
  }
  function deepestGroundYAt(x) {
    const grounds=routeSurfaces(route).filter(s=>s.kind==="ground");
    const covering=grounds.filter(s=>s.x<=x&&x<=s.x+s.w);
    if(covering.length)return Math.max(...covering.map(s=>s.y));
    const nearby=grounds.filter(s=>s.x-400<=x&&x<=s.x+s.w+400);
    return nearby.length?Math.max(...nearby.map(s=>s.y)):GROUND;
  }
  function freshRun(id = routeId) {
    return {
      economyRunId: uid("run"),
      attemptId: uid("try"),
      routeId: id,
      runCoins: 0,
      collectedCoinIds: [],
      banked: false,
      checkpointX: 70,
      startedAt: Date.now(),
      flowScore: 0,
      usedSkill: false,
    };
  }
  function restoreRun(id) {
    const p = profile.pendingRunsByRoute[id];
    if (!p || p.banked) return freshRun(id);
    return {
      ...freshRun(id),
      ...p,
      collectedCoinIds: [...new Set(p.collectedCoinIds || [])],
    };
  }
  function saveRun() {
    if (!run) return;
    profile.pendingRunsByRoute[routeId] = clone(run);
    void persist();
  }
  function routeUnlocked(id) {
    if (/^A0/.test(id)) return !!ROUTES[id] && (id === "A01" || !!profile.progressByRoute[`A0${Number(id.slice(1))-1}`]?.completed);
    if (/^M0/.test(id)) return !!ROUTES[id] && (id === "M01" || !!profile.progressByRoute[`M0${Number(id.slice(1))-1}`]?.completed);
    if (!/^F0[1-4]$/.test(id)) return true;
    const n=Number(id.slice(1));
    return n===1 || !!profile.progressByRoute[`F0${n-1}`]?.completed;
  }
  function firstRouteForWorld(worldId=profile.selectedWorldId) {
    if (worldId==="aftermath") return [...WORLD_REGISTRY.aftermath.routes].reverse().find(id=>routeUnlocked(id));
    if (worldId==="magma") return ["M04","M03","M02","M01"].find(id=>routeUnlocked(id));
    if (worldId!=="frozen") return "D01";
    return ["F04","F03","F02","F01"].find(id=>ROUTES[id]&&routeUnlocked(id)) || "F01";
  }
  function startRoute(id, newEconomy = true, fullD06 = false) {
    if (pendingWorldId && profile.ownedWorldIds.includes(pendingWorldId)) {
      if (pendingWorldId === "aftermath" && !/^A0/.test(id || "")) id = firstRouteForWorld("aftermath");
      else if (profile.selectedWorldId === "aftermath" && pendingWorldId !== "aftermath" && /^A0/.test(id || "")) id = firstRouteForWorld(pendingWorldId);
      if (pendingWorldId === "magma" && !/^M0/.test(id || "")) id = firstRouteForWorld("magma");
      else if (profile.selectedWorldId === "magma" && pendingWorldId !== "magma" && /^M0/.test(id || "")) id = firstRouteForWorld(pendingWorldId);
      profile.selectedWorldId = pendingWorldId;
      pendingWorldId = null;
      sceneCache.clear();
      void persist();
    }
    if (profile.selectedWorldId==="frozen" && (!id || /^D0/.test(id))) id=firstRouteForWorld("frozen");
    if (profile.selectedWorldId!=="frozen" && /^F0/.test(id||"")) id="D01";
    if (/^M0/.test(id||"") && profile.selectedWorldId!=="magma") return false;
    if (/^A0/.test(id||"") && profile.selectedWorldId!=="aftermath") return false;
    if (!routeUnlocked(id)) return false;
    routeId = ROUTES[id] ? id : firstRouteForWorld();
    route = ROUTES[routeId];
    run = newEconomy ? freshRun(routeId) : restoreRun(routeId);
    result = null;
    syncActionVisibility();
    shopOpen = false;
    barrels = [];
    workerClock = 0;
    workerDisabled = false;
    workerPreviousBottom = null;
    flow = run.flowScore || 0;
    flowSeen = new Set();
    flowMoves = [];
    wallMantle = null;
    lastWallMantle = null;
    edgeClimb = null;
    edgeCatchCooldown = 0;
    edgeCatchProbe = null;
    vectorJumpPending = null;
    vectorAir = null;
    vectorRollStarts = 0;
    diveRun = null;
    slopeContact = null;
    flowFlash = 0;
    staggerT = 0;
    respawnT = 0;
    invulnerableT = 2;
    frontFlip = {
      active: false,
      phase: "idle",
      tuckFrame: 0,
      hitboxBefore: null,
    };
    if (!engine._campaignLaunch) {
      const launch = engine.launch;
      engine.launch = (vx, vy) => launch(vx, vy * 1.28);
      engine._campaignLaunch = true;
    }
    engine.setGeometry(routeSurfaces(route));
    movingPlatforms = route.obstacles.filter(o => o.type === "crane" || o.type === "pallet").map(o => ({ ...o, dir: 1, dx: 0, rideFrames: 0 }));
    collapsing = route.obstacles.filter(o=>o.type === "collapse").map(o=>({...o,state:"READY",timer:0,fallY:0}));
    containerDoors = route.obstacles.filter(o=>o.type === "containerDoor").map(o=>({...o,state:"OPEN",timer:0,currentY:o.openY,preparingElapsed:null,pushes:0}));
    document.dispatchEvent(new CustomEvent("tmb:campaign-audio", { detail: { worldId: route.worldId, routeId } }));
    for (const p of movingPlatforms) sfx(p.type === "crane" ? "crane" : "pallet");
    campaignChief = (routeId === "D06" || route.chief) ? {active:false,x:-400,y:routeGroundYAt(route.chief?.startX ?? 70)-48,w:32,h:48,speed:205,catches:0,caughtT:0,lastReturnX:null} : null;
    campaignDeaths = 0;
    gameClock = 0;
    platformOrder = { colliderFrame: 0, landingFrame: 0, carryFrame: 0 };
    engine.setDynamicSurfaces(movingPlatforms);
    engine.reset(70, routeGroundYAt(70) - player.h);
    cameraGroundFootY=player.y+player.h;cameraWorldY=H*(innerWidth>innerHeight?.62:.58)-cameraGroundFootY;backgroundCameraWorldY=cameraWorldY;cameraWorldVelocity=0;engine.setWorldY(cameraWorldY);
    routeStartedAt = performance.now();
    campaign = true;
    closeCharacterSelect();
    document.body.dataset.campaignPhase = "running";
    document.body.dataset.routeId = routeId;
    emitGame("run_start", {
      worldId: profile.selectedWorldId,
      routeId,
      routeVersion: route.version,
      economyRunId: run.economyRunId,
    });
    saveRun();
    return true;
  }
  function addFlow(id, move, points) {
    if (flowSeen.has(id)) return;
    flowSeen.add(id);
    if (flowMoves.at(-1) !== move) points += 2;
    flowMoves.push(move);
    flow += points;
    flowFlash = 0.55;
    run.flowScore = flow;
    if (move === "wallRun") {
      const wall = route.obstacles.find((o) => o.id === id && o.type === "wallRun");
      if (wall) {
        const wallY = (wall.baseY ?? GROUND) - 130;
        wallMantle = {
          wall,
          wallY,
          phase: "wallRun",
          elapsed: 0,
          duration: 0.1,
          startX: null,
          startY: null,
          endX: null,
          endY: wallY - player.h,
          restored: false,
          startedAt: null,
        };
        engine.setGeometry(
          routeSurfaces(route).filter(
            (s) =>
              !(
                s.parkour === "wallRun" &&
                s.x === wall.x &&
                s.y === wallY &&
                s.w === wall.w
              ),
          ),
        );
      }
    }
    emitGame("movement_completed", {
      routeId,
      obstacleId: id,
      kind: move,
      flow,
    });
  }
  function collectPhysical() {
    for (const coin of route.coins) {
      if (run.collectedCoinIds.includes(coin.id)) continue;
      const nearestX = Math.max(player.x, Math.min(coin.x, player.x + player.w)),
        nearestY = Math.max(player.y, Math.min(coin.y, player.y + player.h)),
        dx = nearestX - coin.x,
        dy = nearestY - coin.y;
      if (dx * dx + dy * dy <= COIN_CONTACT_RADIUS * COIN_CONTACT_RADIUS) {
        run.collectedCoinIds.push(coin.id);
        run.runCoins++;
        if (coin.skill) run.usedSkill = true;
        emitGame("coin_collected", { routeId, coinId: coin.id });
        sCoin();
        saveRun();
      }
    }
  }
  function bankRun() {
    if (!run || run.banked || profile.bankedRunIds.includes(run.economyRunId))
      return result;
    const first = !profile.progressByRoute[routeId]?.completed;
    const style = Math.min(10, Math.floor(flow / 8));
    const amount = run.runCoins + 15 + (first ? 20 : 0) + style;
    run.banked = true;
    profile.walletBalance += amount;
    profile.bankedRunIds.push(run.economyRunId);
    profile.bankedRunIds = profile.bankedRunIds.slice(-100);
    const elapsed = gameClock,
      key = `${routeId}@${route.version}`,
      old = profile.bestRunsByRouteVersion[key];
    profile.bestRunsByRouteVersion[key] = old
      ? Math.min(old, elapsed)
      : elapsed;
    profile.progressByRoute[routeId] = {
      ...(profile.progressByRoute[routeId] || {}),
      completed: true,
      completions: (profile.progressByRoute[routeId]?.completions || 0) + 1,
    };
    routesSinceInterstitial++;
    delete profile.pendingRunsByRoute[routeId];
    const stars = 1 + Number(run.runCoins >= Math.ceil(route.coins.length / 2)) + Number(run.runCoins === route.coins.length);
    profile.progressByRoute[routeId].stars = Math.max(profile.progressByRoute[routeId].stars || 0, stars);
    result = {
      stars,
      amount,
      first,
      style,
      elapsed,
      economyRunId: run.economyRunId,
      bestDiff: old ? old - elapsed : null,
      goals: {
        clean: { earned: staggerT <= 0, reason: staggerT <= 0 ? "clean" : "contact" },
        mastery: { earned: !!run.usedSkill, reason: run.usedSkill ? "skill-route" : "skill-route-missed" },
        style: { earned: style >= 5, reason: style >= 5 ? "flow" : "flow-low" },
      },
    };
    document.body.dataset.campaignPhase = "result";
    syncActionVisibility();
    emitGame("run_reward_banked", {
      routeId,
      economyRunId: run.economyRunId,
      runCoins: run.runCoins,
      finishBonus: 15,
      firstBonus: first ? 20 : 0,
      styleBonus: style,
      total: amount,
    });
    void persist();
    return result;
  }
  function retry(full = false) {
    if (!run) return;
    if (full) {
      run.attemptId = uid("try");
      run.checkpointX = 70;
    }
    const resetX=full ? 70 : run.checkpointX;
    engine.reset(resetX, routeGroundYAt(resetX) - player.h);
    if(full)gameClock=0;
    barrels = [];
    workerClock = 0;
    workerDisabled = false;
    workerPreviousBottom = null;
    collapsing = route.obstacles.filter(o=>o.type === "collapse").map(o=>({...o,state:"READY",timer:0,fallY:0}));
    engine.setGeometry(routeSurfaces(route));
    respawnT = 0;
    invulnerableT = 2;
    staggerT = 0;
    frontFlip.active = false;
    result = null;
    syncActionVisibility();
    emitGame("retry", {
      routeId,
      attemptId: run.attemptId,
      economyRunId: run.economyRunId,
    });
    saveRun();
  }
  function failToCheckpoint() {
    if (respawnT > 0 || invulnerableT > 0) return;
    respawnT = 0.8;
    player.vx = player.vy = 0;
    emitGame("player_fall", { routeId });
    setTimeout(() => retry(false), 800);
  }
  function hurdleCollision(o) {
    return (
      player.x + player.w > o.x &&
      player.x < o.x + o.w &&
      player.y + player.h > GROUND - o.h
    );
  }
  function vectorMoveDir() {
    return Math.abs(joystick.axis)>.08?Math.sign(joystick.axis):(keys.right?1:0)-(keys.left?1:0);
  }
  function beginZoneCatch() {
    if(route.movementProfile!=="vector-v1"||edgeClimb||wallMantle||edgeCatchCooldown>0||!keys.jump||engine.parkour.state==="wallRun")return false;
    const dir=vectorMoveDir();
    if(!dir)return false;
    const feet=player.y+player.h,candidates=routeSurfaces(route).filter(s=>s.catchable);
    const wall=candidates.find(s=>{
      const gap=dir>0?s.x-(player.x+player.w):player.x-(s.x+s.w);
      const front=dir===s.catchDir&&(dir>0?player.x+player.w<=s.x+2:player.x>=s.x+s.w-2);
      const toward=dir>0?s.x>=player.x+player.w-2:s.x+s.w<=player.x+2;
      const vertical=player.onGround?feet-s.y>=0&&feet-s.y<=100:feet>=s.y-4&&feet<=s.y+100;
      return gap>=0&&gap<=96&&front&&toward&&vertical;
    });
    if(!wall)return false;
    const gap=dir>0?wall.x-(player.x+player.w):player.x-(wall.x+wall.w),startX=player.x,startY=player.y;
    const catchX=dir>0?wall.x-player.w:wall.x+wall.w,H=Math.max(0,feet-wall.y);
    edgeClimb={wall,dir,elapsed:0,duration:.2+.6*Math.max(0,Math.min(1,(H-60)/36)),startX:catchX,startY,endX:dir>0?wall.x+4:wall.x+wall.w-player.w-4,endY:wall.y-player.h,approach:{elapsed:0,duration:Math.max(.08,gap/Math.max(255,Math.abs(player.vx))),startX,startY,endX:catchX}};
    vectorJumpPending=null;
    keys.jump=false;
    frontFlip.active=false;
    engine.setGeometry(routeSurfaces(route).filter(s=>!(s.catchable&&s.id===wall.id)));
    return true;
  }
  function tryEdgeCatch() {
    if(route.movementProfile!=="vector-v1"||edgeClimb||wallMantle||edgeCatchCooldown>0||player.onGround||engine.parkour.state==="wallRun")return;
    const input=vectorMoveDir(),feet=player.y+player.h,vy=player.vy;
    if(!input)return;
    const candidates=routeSurfaces(route).filter(s=>s.catchable);
    const probes=candidates.map(s=>{const gap=input>0?s.x-(player.x+player.w):player.x-(s.x+s.w),front=input===s.catchDir&&(input>0?player.x+player.w<=s.x+2:player.x>=s.x+s.w-2),toward=input>0?s.x>=player.x+player.w-2:s.x+s.w<=player.x+2,vertical=feet>=s.y-4&&feet<=s.y+60,apex=vy>=-120&&vy<=180;return{id:s.id,gap,feetDelta:feet-s.y,vy,front,toward,vertical,apex}});
    edgeCatchProbe={input,probes};
    const accepted=probes.find(p=>p.gap>=-2&&p.gap<=14&&p.front&&p.toward&&p.vertical&&p.apex);
    const wall=accepted&&candidates.find(s=>s.id===accepted.id);
    if(!wall)return;
    const dir=input,startX=dir>0?wall.x-player.w:wall.x+wall.w;
    edgeClimb={wall,dir,elapsed:0,duration:.2+.6*Math.max(0,Math.min(1,((player.y+player.h)-wall.y-60)/36)),startX,startY:player.y,endX:dir>0?wall.x+4:wall.x+wall.w-player.w-4,endY:wall.y-player.h};
    frontFlip.active=false;
    engine.setGeometry(routeSurfaces(route).filter(s=>!(s.catchable&&s.id===wall.id)));
    player.x=startX;player.vx=player.vy=0;
  }
  function beforePhysicsIntegrated(dt) {
    if (!campaign || shopOpen || result) return;
    gameClock += dt;
    if(edgeClimb){engine.parkour.state="normal";engine.parkour.timer=0}
    if(route.movementProfile==="vector-v1"&&keys.jump&&player.onGround&&!edgeClimb){
      const center=player.x+player.w/2;
      const diveZone=(route.diveZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      vectorJumpPending={kind:diveZone?"dive":(route.highJumpZones||[]).some(z=>center>=z.x1&&center<=z.x2)?"high":"normal",frames:0,diveZone};
    }
    if(!vectorJumpPending||vectorJumpPending.kind==="normal")beginZoneCatch();
    tryEdgeCatch();
    for (const p of movingPlatforms) {
      const oldX = p.x;
      p.x += p.dir * p.speed * dt;
      if (p.x <= p.minX || p.x >= p.maxX) {
        p.x = Math.max(p.minX, Math.min(p.maxX, p.x));
        p.dir *= -1;
      }
      p.dx = p.x - oldX;
      platformOrder.colliderFrame++;
    }
    for (const d of containerDoors) {
      d.timer += dt;
      if (d.state === "OPEN" && d.timer >= d.open && !keys.right && joystick.axis < .08) { d.state="PREPARING"; d.timer=0; sfx("door"); emitGame("hazard_telegraph",{routeId,obstacleId:d.id}); }
      else if (d.state === "PREPARING" && d.timer >= d.prepare) { d.preparingElapsed=d.timer; d.state="CLOSING"; d.timer=0; }
      else if (d.state === "CLOSING") { d.currentY=d.openY+(d.y-d.openY)*Math.min(1,d.timer/d.close); if(d.timer>=d.close){d.currentY=d.y;d.state="CLOSED";d.timer=0;} }
      else if (d.state === "CLOSED" && d.timer >= d.closed) { d.state="OPEN"; d.timer=0; d.currentY=d.openY; }
      const bottom=d.currentY+d.h, overlap=player.x+player.w>d.x&&player.x<d.x+d.w&&player.y+player.h>d.currentY&&player.y<bottom;
      if (overlap && (d.state === "CLOSING" || d.state === "CLOSED")) { const left=d.x-player.w,right=d.x+d.w; player.x=(player.x+player.w/2<d.x+d.w/2)?left:right; player.vx=player.x===left?-150:150; staggerT=Math.max(staggerT,.28); d.pushes++; emitGame("hazard_contact",{routeId,obstacleId:d.id,result:"push"}); }
    }
    const doorRects=containerDoors.filter(d=>d.state==="CLOSING"||d.state==="CLOSED").map(d=>({x:d.x,y:d.currentY,w:d.w,h:d.h,kind:"containerDoor",id:d.id}));
    engine.setDynamicSurfaces([...movingPlatforms.map(p => ({ x:p.x, y:p.y, w:p.w, h:p.h, kind:"movingPlatform", id:p.id })),...doorRects]);
  }
  function updateIntegrated(dt, state, input={}) {
    if (!campaign || shopOpen || result) return;
    edgeCatchCooldown=Math.max(0,edgeCatchCooldown-dt);
    if(route.movementProfile==="vector-v1"&&input.bufferedJump&&!vectorJumpPending){
      const center=player.x+player.w/2,diveZone=(route.diveZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      if(diveZone)vectorJumpPending={kind:"dive",frames:0,diveZone};
    }
    if(route.movementProfile==="vector-v1"&&vectorJumpPending&&player.vy<0&&!player.onGround){
      if(vectorJumpPending.kind==="dive"){
        const z=vectorJumpPending.diveZone,dir=player.facing>=0?1:-1,startX=player.x,startY=player.y;
        const endX=dir>0?z.landX:z.landX-player.w,landY=z.landY-player.h,dx=Math.abs(endX-startX),top=Math.min(startY,landY)-93;
        const Tb=Math.sqrt(2*(startY-top)/1450)+Math.sqrt(2*(landY-top)/1450),vx=Math.max(dx/Tb,Math.abs(player.vx)),duration=dx>0?dx/vx:Tb;
        const vy0=(landY-startY-725*duration*duration)/duration;
        diveRun={elapsed:0,duration,vy0,startX,startY,endX,landY,dir};
        engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=dir;
      }else player.vy=vectorJumpPending.kind==="high"?-520:-390;
      vectorJumpPending=null;
    }else if(vectorJumpPending&&++vectorJumpPending.frames>1){
      vectorJumpPending=null;
    }
    if(route.movementProfile==="vector-v1"){
      const feet=player.y+player.h;
      if(!player.onGround&&!edgeClimb&&!diveRun){
        if(!vectorAir)vectorAir={minFeet:feet};else vectorAir.minFeet=Math.min(vectorAir.minFeet,feet);
      }else if(player.onGround&&vectorAir){
        const drop=feet-vectorAir.minFeet;
        if(drop>=200&&engine.parkour.state!=="roll"){
          engine.parkour.state="roll";engine.parkour.timer=.24;engine.parkour.roll=0;engine.parkour.dir=player.facing;vectorRollStarts++;
        }
        vectorAir=null;
      }
    }else vectorAir=null;
    if(diveRun){
      const d=diveRun,tau=Math.min(d.elapsed+=dt,d.duration),t=tau/d.duration;
      engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=d.dir;
      player.x=d.startX+(d.endX-d.startX)*tau/d.duration;player.y=d.startY+d.vy0*tau+725*tau*tau;
      player.vx=(d.endX-d.startX)/d.duration;player.vy=d.vy0+1450*tau;player.onGround=false;
      if(tau===d.duration){
        player.x=d.endX;player.y=d.landY;player.vx=d.dir*Math.max(255,Math.abs(player.vx));player.vy=0;player.onGround=true;
        engine.parkour.state="roll";engine.parkour.timer=.24;engine.parkour.roll=0;engine.parkour.dir=d.dir;vectorRollStarts++;
        diveRun=null;vectorAir=null;
      }
    }
    if(edgeClimb){
      const input=vectorMoveDir(),c=edgeClimb;
      if(!input||input!==c.dir){
        engine.setGeometry(routeSurfaces(route));
        engine.parkour.state="normal";engine.parkour.timer=0;edgeClimb=null;edgeCatchCooldown=.12;
      }else if(c.approach){
        const a=c.approach,t=Math.min(1,(a.elapsed+=dt)/a.duration),arc=4*t*(1-t);engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=c.dir;player.x=a.startX+(a.endX-a.startX)*t;player.y=a.startY-12*arc;player.vx=(a.endX-a.startX)/a.duration;player.vy=0;player.onGround=false;if(t===1){player.x=a.endX;player.y=a.startY;player.vx=player.vy=0;delete c.approach}
      }else{
        c.elapsed=Math.min(c.duration,c.elapsed+dt);
        const t=c.elapsed/c.duration,hold=.12/c.duration,move=Math.max(0,(t-hold)/(1-hold)),rise=Math.min(1,move/.85),pull=Math.max(0,(move-.85)/.15);
        engine.parkour.state=move>0?"climb":"catch";engine.parkour.timer=c.duration-c.elapsed;engine.parkour.dir=c.dir;
        player.x=c.startX+(c.endX-c.startX)*pull;
        player.y=c.startY+(c.endY-c.startY)*rise;
        player.vx=player.vy=0;player.onGround=false;
        if(t===1){
          engine.setGeometry(routeSurfaces(route));
          player.x=c.endX;player.y=c.endY;player.vx=c.dir*255;player.vy=0;player.onGround=true;
          edgeClimb=null;edgeCatchCooldown=.25;
        }
      }
    }
    const slopeCenter=player.x+player.w/2;
    const slope=(route.slopes||[]).find(s=>slopeCenter>=Math.min(s.x1,s.x2)&&slopeCenter<=Math.max(s.x1,s.x2));
    if(slope){
      const t=(slopeCenter-slope.x1)/(slope.x2-slope.x1),surfaceY=slope.y1+(slope.y2-slope.y1)*t,feet=player.y+player.h;
      if((slopeContact===slope.id||player.onGround||feet>=surfaceY-3)&&feet<=surfaceY+Math.max(36,Math.abs(player.vy)/20)){
        player.y=surfaceY-player.h;player.vy=0;player.onGround=true;slopeContact=slope.id;
        const dx=slope.x2-slope.x1,dy=slope.y2-slope.y1,angle=Math.atan2(Math.abs(dy),Math.abs(dx))*180/Math.PI,downhill=Math.sign(dx*dy);
        if(angle>=25&&Math.sign(player.vx||player.facing)===downhill){player.vx=downhill*Math.max(255,Math.abs(player.vx));engine.parkour.state="slide";engine.parkour.timer=Math.max(engine.parkour.timer,.08);engine.parkour.dir=downhill}
      }
    }else slopeContact=null;
    if (wallMantle) {
      if (wallMantle.phase === "wallRun" && state !== "wallRun") {
        const dir = player.facing >= 0 ? 1 : -1;
        wallMantle.phase = "mantle";
        wallMantle.startedAt = gameClock;
        wallMantle.startX = player.x;
        wallMantle.startY = player.y;
        wallMantle.endX =
          dir > 0
            ? wallMantle.wall.x + wallMantle.wall.w - player.w
            : wallMantle.wall.x;
      }
      if (wallMantle.phase === "mantle") {
        wallMantle.elapsed = Math.min(
          wallMantle.duration,
          wallMantle.elapsed + dt,
        );
        const t = wallMantle.elapsed / wallMantle.duration;
        const riseT = Math.min(1, t * 2);
        const crossT = t ** 1.5;
        player.x =
          wallMantle.startX + (wallMantle.endX - wallMantle.startX) * crossT;
        player.y =
          wallMantle.startY + (wallMantle.endY - wallMantle.startY) * riseT;
        player.vx = player.vy = 0;
        player.onGround = t === 1;
        if (t === 1) {
          engine.setGeometry(routeSurfaces(route));
          wallMantle.restored = true;
          lastWallMantle = {
            wallId: wallMantle.wall.id,
            duration: wallMantle.elapsed,
            startedAt: wallMantle.startedAt,
            restoredAt: gameClock,
            endFeet: player.y + player.h,
            wallTop: wallMantle.wallY,
            geometryRestored: true,
          };
          wallMantle = null;
        }
      }
    }
    if (innerWidth>innerHeight) {
      const footY=player.y+player.h;
      if(player.onGround)cameraGroundFootY=footY;
      const targetWorldY=H*.62-cameraGroundFootY,omega=16;
      cameraWorldVelocity+=(omega*omega*(targetWorldY-cameraWorldY)-2*omega*cameraWorldVelocity)*dt;
      cameraWorldY+=cameraWorldVelocity*dt;
      const foot=cameraWorldY+player.y+player.h;
      if(foot<H*.251){cameraWorldY+=H*.251-foot;cameraWorldVelocity=Math.max(0,cameraWorldVelocity)}
      else if(foot>H*.799){cameraWorldY-=foot-H*.799;cameraWorldVelocity=Math.min(0,cameraWorldVelocity)}
      engine.setWorldY(cameraWorldY);
    } else {
      const footY=player.y+player.h;
      if(player.onGround)cameraGroundFootY=footY;
      const targetWorldY=H*.58-cameraGroundFootY,omega=16;
      cameraWorldVelocity+=(omega*omega*(targetWorldY-cameraWorldY)-2*omega*cameraWorldVelocity)*dt;
      cameraWorldY+=cameraWorldVelocity*dt;
      const foot=cameraWorldY+player.y+player.h;
      if(foot<H*.24){cameraWorldY+=H*.24-foot;cameraWorldVelocity=Math.max(0,cameraWorldVelocity)}
      else if(foot>H*.76){cameraWorldY-=foot-H*.76;cameraWorldVelocity=Math.min(0,cameraWorldVelocity)}
      engine.setWorldY(cameraWorldY);
    }
    document.body.dataset.playerX=String(Math.round(player.x));
    invulnerableT = Math.max(0, invulnerableT - dt);
    staggerT = Math.max(0, staggerT - dt);
    flowFlash = Math.max(0, flowFlash - dt);
    if (campaignChief) {
      campaignChief.caughtT=Math.max(0,campaignChief.caughtT-dt);
      if (!campaignChief.active && player.x>=1800) {
        if (!route.chief || player.x>=route.chief.startX) {
        campaignChief.active=true;
        campaignChief.x=player.x-380;
        emitGame("chief_chase_started",{routeId});
        }
      }
      if (campaignChief.active) {
        campaignChief.x+=campaignChief.speed*dt;
        if (campaignChief.x+campaignChief.w>=player.x+4 && campaignChief.x<=player.x+player.w-4) {
          campaignChief.catches++;
          campaignDeaths++;
          campaignChief.caughtT=.35;
          campaignChief.lastReturnX=run.checkpointX;
          engine.reset(run.checkpointX,routeGroundYAt(run.checkpointX)-player.h);
          campaignChief.x=run.checkpointX-380;
          campaignChief.y=routeGroundYAt(run.checkpointX)-campaignChief.h;
          emitGame("chief_catch",{routeId,checkpointX:run.checkpointX});
        }
      }
    }
    for (const p of movingPlatforms) {
      const ridingOverlap = player.x + player.w > p.x + 3 && player.x < p.x + p.w - 3;
      // Ground is resolved before elevated surfaces in the legacy solver. If a
      // moving top crosses under the feet on the landing frame, prefer that
      // visible support instead of leaving the player on the ground beneath it.
      if (ridingOverlap && player.onGround && Math.abs(player.y + player.h - GROUND) <= 2 && p.y < GROUND) {
        player.y = p.y - player.h;
        player.vy = 0;
      }
      if (ridingOverlap && Math.abs(player.y + player.h - p.y) <= 6 && player.vy >= 0) {
        platformOrder.landingFrame = platformOrder.colliderFrame;
        if (!keys.left && !keys.right && Math.abs(joystick.axis) < .08) player.vx = 0;
        player.x += p.dx;
        platformOrder.carryFrame = platformOrder.colliderFrame;
        p.rideFrames++;
        run.usedSkill = true;
        addFlow(p.id, p.type === "pallet" ? "palletRide" : "craneRide", 10);
      } else if (!ridingOverlap || player.onGround) p.rideFrames = 0;
    }
    for (const c of collapsing) {
      const supported=player.x+player.w>c.x+3&&player.x<c.x+c.w-3&&Math.abs(player.y+player.h-c.y)<7&&player.onGround;
      if (c.state==="READY"&&supported) { c.state="CONTACT_WARNING"; c.timer=0; c.warningStartedAt=gameClock; sfx("collapse-warning"); emitGame("hazard_telegraph",{routeId,obstacleId:c.id}); }
      else if(c.state==="CONTACT_WARNING") { c.timer+=dt; if(c.timer>=c.warning){c.state="FALLING";c.warningElapsed=gameClock-c.warningStartedAt;c.timer=0;sfx("collapse-fall");engine.setGeometry(routeSurfaces(route));} }
      else if(c.state==="FALLING") { c.timer+=dt;c.fallY+=260*dt;if(c.timer>=.65)c.state="ABSENT"; }
    }
    if (["vault", "slide", "wallRun", "roll"].includes(state)) {
      const o = route.obstacles.find(
        (v) => v.type === state || (state === "roll" && v.type === "rollDrop"),
      );
      if (o) addFlow(o.id, state, 8);
    }
    const rollDrop = route.obstacles.find((o)=>o.type==="rollDrop");
    if (rollDrop && !player.onGround && player.x+player.w>rollDrop.x && player.x<rollDrop.x+rollDrop.w)
      addFlow(rollDrop.id,"rollDrop",8);
    const ramp = route.obstacles.find((o) => o.type === "ramp");
    const rampBaseY = ramp?.baseY ?? GROUND;
    if (
      ramp &&
      !frontFlip.active &&
      player.x + player.w > ramp.x &&
      player.x < ramp.x + ramp.w &&
      player.vx > 180 &&
      player.y + player.h >= rampBaseY - 100
    ) {
      engine.launch(390, -680);
      sfx("ramp");
      frontFlip = {
        active: true,
        phase: "launch",
        elapsed: 0,
        tuckFrame: 0,
        hitboxBefore: engine.hitbox(),
      };
      addFlow(ramp.id, "frontFlip", 14);
      emitGame("movement_started", {
        routeId,
        obstacleId: ramp.id,
        kind: "frontFlip",
      });
      sfx("flip");
    }
    if (frontFlip.active) {
      frontFlip.elapsed += dt;
      frontFlip.phase =
        frontFlip.elapsed < 0.16
          ? "launch"
          : frontFlip.elapsed < 0.62
            ? "tuck"
            : "open";
      frontFlip.tuckFrame =
        frontFlip.phase === "tuck"
          ? Math.min(3, Math.floor((frontFlip.elapsed - 0.16) / 0.115))
          : 0;
      if (player.onGround && frontFlip.elapsed > 0.2) {
        frontFlip.active = false;
        frontFlip.phase = "land";
        sfx("land");
        addFlow(`${ramp.id}-landing`, "cleanLanding", 8);
      }
    }
    if (route.obstacles.some((o) => o.type === "worker")) {
      const worker = route.obstacles.find((o) => o.type === "worker"),
        airborne = !player.onGround;
      const workerTop=(worker.baseY ?? GROUND)-84;
      const playerBottom=player.y+player.h;
      const horizontalOverlap=Math.min(player.x+player.w,worker.x+(worker.w ?? 44))-Math.max(player.x,worker.x);
      if (!workerDisabled && workerPreviousBottom !== null && workerPreviousBottom <= workerTop+4 && playerBottom >= workerTop && player.vy > 0 && horizontalOverlap > 0) {
        workerDisabled=true;
        emitGame("hazard_contact",{routeId,obstacleId:worker.id,result:"disabled"});
      }
      workerPreviousBottom=playerBottom;
      if (!workerDisabled) workerClock += dt;
      if (!workerDisabled && workerClock > 2.4 && !airborne && barrels.length < 2) {
        workerClock = 0;
        barrels.push({
          id: uid("barrel"),
          x: worker.x - 18,
          y: (worker.baseY ?? GROUND) - 28,
          vx: -185,
          vy: 0,
          life: 8,
          warning: 0.75,
        });
        emitGame("hazard_telegraph", { routeId, obstacleId: worker.id });
      }
      for (const b of barrels) {
        b.life -= dt;
        if (b.warning > 0) b.warning -= dt;
        else {
          const size=28,oldX=b.x,oldY=b.y,oldBottom=oldY+size;
          b.x+=b.vx*dt;
          const solids=routeSurfaces(route),support=solids.filter(s=>b.x+size>s.x&&b.x<s.x+s.w&&Math.abs(oldBottom-s.y)<=2).sort((a,c)=>a.y-c.y)[0];
          if(support){b.y=support.y-size;b.vy=0;}
          else {
            const face=solids.find(s=>b.vx<0&&oldX>=s.x+s.w-2&&b.x<s.x+s.w&&oldY+size>s.y+2&&oldY<s.y+s.h-2);
            if(face){const step=oldBottom-face.y;if(step>size){b.life=0;continue}if(step>=0){b.y=face.y-size;b.vy=0;continue}}
            b.vy=Math.min(900,(b.vy||0)+1450*dt);b.y+=b.vy*dt;
            const landing=solids.filter(s=>b.x+size>s.x&&b.x<s.x+s.w&&oldBottom<=s.y+2&&b.y+size>=s.y).sort((a,c)=>a.y-c.y)[0];
            if(landing){b.y=landing.y-size;b.vy=0}
          }
        }
      }
      barrels = barrels.filter((b) => b.life > 0 && b.x > -80);
    }
    const overpass = route.obstacles.find((o)=>o.type==="overpass");
    if (overpass && player.x+player.w>overpass.x && player.x<overpass.x+overpass.w && Math.abs(player.y+player.h-overpass.y)<8)
      addFlow(overpass.id,"overpassRide",8);
    for (const cp of route.checkpoints)
      if (player.x >= cp && run.checkpointX < cp) {
        run.checkpointX = cp;
        sfx("checkpoint");
        emitGame("checkpoint_reached", { routeId, x: cp });
        saveRun();
      }
    collectPhysical();
    if (route.movementProfile==="vector-v1"
      ? player.y > deepestGroundYAt(player.x+player.w/2) + 120
      : player.y > Math.max(H + 120,routeGroundYAt(player.x+player.w/2)+120)) retry(false);
    if (player.x >= route.finishX) {
      player.x = route.finishX;
      player.vx = 0;
      result = bankRun();
      sfx("finish");
      engine.setWon(true);
      emitGame("run_complete", { routeId, elapsed_s: result.elapsed });
    }
  }
  function rr(x, y, w, h, r = 6) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  function drawCampaign() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewportW, viewportH);
    ctx.setTransform(
      dpr * viewScale,
      0,
      0,
      dpr * viewScale,
      dpr * viewOffsetX,
      dpr * viewOffsetY,
    );
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#70ccec");
    g.addColorStop(0.68, "#d6eef0");
    g.addColorStop(1, "#355160");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-cam, worldY);
    ctx.fillStyle = "#335d70";
    for (let x = 0; x < route.length; x += 700) {
      ctx.fillRect(x, 200, 90, 255);
      ctx.fillStyle = "#193b4a";
      ctx.fillRect(x + 14, 220, 62, 18);
      ctx.fillStyle = "#335d70";
    }
    ctx.fillStyle = "#4f5c66";
    ctx.fillRect(0, GROUND, route.length, 100);
    ctx.fillStyle = "#f4c842";
    ctx.fillRect(0, GROUND, route.length, 7);
    for (const o of route.obstacles) {
      if (o.type === "low") {
        ctx.fillStyle = "#936339";
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        ctx.strokeStyle = "#ffe38b";
        ctx.strokeRect(o.x + 2, GROUND - o.h + 2, o.w - 4, o.h - 4);
      }
      if (o.type === "ramp") {
        ctx.fillStyle = "#ffb12b";
        ctx.beginPath();
        ctx.moveTo(o.x, GROUND);
        ctx.lineTo(o.x + o.w, GROUND - o.h);
        ctx.lineTo(o.x + o.w, GROUND);
        ctx.fill();
        ctx.strokeStyle = "#fff4a8";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = "#142735";
        ctx.font = "900 20px system-ui";
        ctx.fillText("➜", o.x + 75, GROUND - 20);
      }
      if (o.type === "worker") {
        ctx.fillStyle = "#152b38";
        ctx.fillRect(o.x - 12, GROUND - 70, 24, 70);
        ctx.fillStyle = "#f1bb2c";
        ctx.beginPath();
        ctx.arc(o.x, GROUND - 75, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 15px system-ui";
        ctx.fillText(workerClock > 1.65 ? "!" : "…", o.x - 4, GROUND - 91);
      }
    }
    for(const p of movingPlatforms){
      if(p.type==="crane"){c.strokeStyle="#c7d8df";c.lineWidth=3;c.beginPath();c.moveTo(p.x+p.w/2,115);c.lineTo(p.x+p.w/2,p.y);c.stroke();}
      c.fillStyle="#0005";c.beginPath();c.ellipse(p.x+p.w/2,GROUND-3,p.w*.48,8,0,0,Math.PI*2);c.fill();
      c.fillStyle=p.type==="pallet"?"#91613b":"#d28a2c";c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle="#ffe190";c.strokeRect(p.x+2,p.y+2,p.w-4,p.h-4);
      c.fillStyle=p.type==="pallet"?"#f2c84b":"#ff5148";c.font="950 18px system-ui";c.fillText(p.type==="pallet"?"↔":"!",p.x+p.w/2-8,p.y-10);
    }
    for (const coin of route.coins)
      if (!run?.collectedCoinIds.includes(coin.id)) {
        ctx.fillStyle = coin.skill ? "#75e5ff" : "#ffd33d";
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, COIN_FILL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff0a2";
        ctx.stroke();
      }
    for (const b of barrels) {
      if (b.warning > 0) {
        ctx.strokeStyle = "#ff452f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x + 14, b.y + 14, 18 + b.warning * 10, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#9e6338";
        ctx.beginPath();
        ctx.arc(b.x + 14, b.y + 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a2a1b";
        ctx.stroke();
      }
    }
    for (const cp of route.checkpoints.slice(1)) {
      const baseY=routeGroundYAt(cp);
      ctx.fillStyle = run && run.checkpointX >= cp ? "#65efb0" : "#f1d45e";
      ctx.fillRect(cp, baseY - 62, 6, 62);
      ctx.beginPath();
      ctx.moveTo(cp + 6, baseY - 60);
      ctx.lineTo(cp + 52, baseY - 45);
      ctx.lineTo(cp + 6, baseY - 30);
      ctx.fill();
    }
    const finishY=routeGroundYAt(route.finishX);
    ctx.fillStyle = "#19242b";
    ctx.fillRect(route.finishX, finishY - 120, 16, 120);
    ctx.fillStyle = "#79f0bc";
    ctx.fillRect(route.finishX + 16, finishY - 118, 88, 48);
    ctx.fillStyle = "#10252b";
    ctx.font = "900 15px system-ui";
    ctx.fillText(t("finish"), route.finishX + 28, finishY - 88);
    if (run)
      drawRunner(
        player.x + player.w / 2,
        player.y + player.h,
        1,
        profile.runnerId,
        profile.equippedOutfitByRunner[profile.runnerId],
        frontFlip.active ? frontFlip.angle : 0,
      );
    ctx.restore();
    drawHud();
    if (respawnT > 0) {
      ctx.fillStyle = "#06111bd9";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "900 24px system-ui";
      ctx.fillText(t("checkpoint"), W / 2, H / 2);
    }
    if (result) drawResult();
  }
  function t(k) {
    return (I18N[profile.settings.language] || I18N.en)[k] || I18N.en[k] || k;
  }
  function effectsGain() { return 1; }
  document.addEventListener("tmb:effects-gain",e=>{e.detail.value=effectsGain();});
  function syncActionVisibility() {
    const a = document.getElementById("a12Actions");
    if (!a) return;
    const show = !!result && !shopOpen;
    a.hidden = !show;
    a.setAttribute("aria-hidden", String(!show));
    syncRewardedButton();
  }
  let rewardedInFlight = null;
  let shopReturnToCharacter = false;
  function rewardedText(amount, claimed=false) {
    const language=profile.settings.language;
    if(claimed)return language==="tr"?"ALINDI":language==="ru"?"ПОЛУЧЕНО":"CLAIMED";
    return language==="tr"?`REKLAM İZLE · +${amount} COIN`:language==="ru"?`РЕКЛАМА · +${amount} МОНЕТЫ`:`WATCH AD · +${amount} COINS`;
  }
  function rewardedAvailable() { const detail={available:false};document.dispatchEvent(new CustomEvent("tmb:rewarded-capability",{detail}));return detail.available===true; }
  function interstitialAvailable() { const detail={available:false};document.dispatchEvent(new CustomEvent("tmb:interstitial-capability",{detail}));return detail.available===true; }
  async function requestRouteInterstitial() {
    if(routesSinceInterstitial<2||!interstitialAvailable())return false;
    routesSinceInterstitial=0;
    const detail={placement:"route_completed",promise:null};document.dispatchEvent(new CustomEvent("tmb:interstitial-request",{detail}));
    try{if(detail.promise)await detail.promise;}catch(_){}
    return true;
  }
  function syncRewardedButton() {
    const button=document.querySelector('#a12Actions [data-act="rewarded"]');if(!button)return;
    const claimed=!!result&&profile.rewardedRunIds.includes(result.economyRunId),visible=!!result&&result.amount>0&&(claimed||rewardedAvailable());
    button.hidden=!visible;button.disabled=claimed||rewardedInFlight===result?.economyRunId;button.textContent=rewardedText(result?.amount||0,claimed);
  }
  async function claimRewardedResult() {
    if(!result||result.amount<=0||!rewardedAvailable())return false;
    const id=result.economyRunId,amount=result.amount;if(rewardedInFlight||profile.rewardedRunIds.includes(id))return false;
    rewardedInFlight=id;syncRewardedButton();emitGame("rewarded_offer",{placement:"result_x2",economyRunId:id});emitGame("rewarded_start",{placement:"result_x2",economyRunId:id});
    const detail={placement:"result_x2",promise:null};document.dispatchEvent(new CustomEvent("tmb:rewarded-request",{detail}));let granted=false;try{granted=!!(detail.promise&&await detail.promise)}catch(_){}
    if(rewardedInFlight!==id)return false;rewardedInFlight=null;const current=!!result&&result.economyRunId===id;
    if(!granted||!current||profile.rewardedRunIds.includes(id)){emitGame("rewarded_complete",{placement:"result_x2",granted:false});syncRewardedButton();return false;}
    profile.rewardedRunIds.push(id);profile.rewardedRunIds=profile.rewardedRunIds.slice(-100);profile.walletBalance+=amount;await persist();emitGame("rewarded_complete",{placement:"result_x2",granted:true});emitGame("reward_granted",{placement:"result_x2",economyRunId:id,amount});syncRewardedButton();return true;
  }
  function applyLanguage() {
    document.dispatchEvent(new CustomEvent("tmb:audio-language",{detail:profile.settings.language}));
    document.getElementById("hint").textContent = t("help");
    const card = document.getElementById("characterCard");
    if (card) { card.querySelector("h2").textContent = t("choose"); card.querySelector("p").textContent=t("samePhysics"); }
    const actions = document.getElementById("a12Actions");
    if (actions) for (const b of actions.querySelectorAll("button")) b.textContent = t(b.dataset.act);
    syncRewardedButton();
    const language=document.getElementById("a12Language"),label=document.querySelector("#a12LanguageWrap span");
    if(language) language.value=profile.settings.language;if(label) label.textContent=t("language");
    const characterShop=document.getElementById("characterShop");if(characterShop) characterShop.textContent=t("shop");
    renderShop();
  }
  function drawHud() {
    ctx.setTransform(
      dpr * viewScale,
      0,
      0,
      dpr * viewScale,
      dpr * viewOffsetX,
      dpr * viewOffsetY,
    );
    ctx.fillStyle = "#07151dd9";
    rr(14, 14, 360, 54, 14);
    ctx.fillStyle = "#fff";
    ctx.font = "900 14px system-ui";
    ctx.fillText(`${t("route")} ${routeId} · ${(["magma","aftermath"].includes(route.worldId) ? t(route.routeId) : route.name)}`, 29, 36);
    ctx.fillStyle = "#ffd43d";
    ctx.fillText(`${t("run")} ◉ ${run?.runCoins || 0}/40`, 29, 57);
    ctx.fillStyle = "#7cecc0";
    ctx.fillText(`${t("wallet")} ◉ ${profile.walletBalance}`, 180, 57);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${t("flow")} ${flow}`, 300, 57);
    if(flowFlash>0){ctx.fillStyle=`rgba(255,222,80,${Math.min(1,flowFlash*2)})`;ctx.font="950 18px system-ui";ctx.fillText(`+ ${t("flow")}`,390,42)}
  }
  function drawResult() {
    ctx.fillStyle = "#06111be8";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#142b39";
    rr(W / 2 - 230, H / 2 - 160, 460, 320, 22);
    ctx.textAlign = "center";
    ctx.fillStyle = "#7cecc0";
    ctx.font = "950 30px system-ui";
    ctx.fillText(`${routeId} ${t("complete")}`, W / 2, H / 2 - 112);
    ctx.fillStyle = "#fff";
    ctx.font = "800 18px system-ui";
    ctx.fillText(`${t("earned")} +${result.amount}`, W / 2, H / 2 - 70);
    ctx.fillText(
      `${t("goals")} · ${run.runCoins}/${route.coins.length} · ${t("flow")} ${flow}`,
      W / 2,
      H / 2 - 34,
    );
    ctx.fillText(
      `${t("localBest")} ${result.bestDiff === null ? t("newRecord") : (result.bestDiff >= 0 ? "-" : " +") + Math.abs(result.bestDiff).toFixed(2) + "s"}`,
      W / 2,
      H / 2 + 2,
    );
    ctx.fillText("★".repeat(result.stars) + "☆".repeat(3 - result.stars), W/2, H/2+58);
    const gs=result.goals||{};
    ctx.font="800 13px system-ui";
    ctx.fillText(`${t("clean")} ${gs.clean?.earned?"✓":"○"} · ${t("mastery")} ${gs.mastery?.earned?"✓":"○"} · ${t("style")} ${gs.style?.earned?"✓":"○"}`,W/2,H/2+34);
    ctx.textAlign = "left";
  }
  function installUI() {
    const style = document.createElement("style");
    style.textContent = `#a12Actions{position:fixed;z-index:31;left:50%;bottom:max(86px,calc(env(safe-area-inset-bottom) + 82px));transform:translateX(-50%);display:flex;gap:9px}#a12Actions[hidden]{display:none!important}#a12Actions button,#a12Shop button,#a12Language{border:1px solid #ffffff44;border-radius:12px;background:#153246;color:#fff;padding:11px 16px;font:900 13px system-ui}#a12LanguageWrap{display:flex;align-items:center;justify-content:center;gap:10px;min-height:44px;margin:8px auto 0;color:#fff;font:800 13px system-ui}#a12Language{min-height:44px;margin:0;padding:8px 14px}#a12Shop{position:fixed;inset:0;z-index:45;display:none;background:#06121bf2;color:#fff;padding:clamp(15px,4vw,38px)}#a12Shop.show{display:grid;grid-template-columns:minmax(230px,42%) 1fr;gap:25px}#a12Preview{display:grid;place-items:center;background:#102635;border-radius:18px;min-height:280px}#a12Preview canvas{width:180px;height:240px}#a12Products{overflow:auto;padding-bottom:48px}#a12Products article{padding:17px;margin:12px 0;background:#132b39;border:1px solid #ffffff30;border-radius:14px}.runnerSymbol{font-size:25px;display:block}.characterChoice[data-character="0"]{box-shadow:inset 0 0 0 2px #3aa2ff}.characterChoice[data-character="1"]{box-shadow:inset 0 0 0 2px #ff6aac}@media(max-width:540px) and (orientation:portrait){#a12Shop.show{grid-template-columns:1fr;grid-template-rows:35vh 1fr}#a12Preview{min-height:0}#a12Preview canvas{width:120px;height:160px}}`;
    style.textContent += `#a12Shop{box-sizing:border-box}#a12Shop.show{grid-template-columns:minmax(230px,40%) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:18px}#a12Preview{display:flex;flex-direction:column;justify-content:center;gap:12px;min-width:0;min-height:0;overflow:hidden}#a12Preview canvas{width:min(100%,480px);height:auto;max-height:65%;aspect-ratio:3/2;object-fit:contain;image-rendering:pixelated}#a12WorldWarning{margin:0;padding:7px 10px;border:1px solid #ffcf5c88;border-radius:10px;background:#442b12;color:#ffe29a;text-align:center;font:900 12px/1.2 system-ui}#a12WorldWarning[hidden]{display:none}#a12Preview .previewControls{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}#a12Preview button{padding:8px 10px}#a12Preview button[aria-pressed="true"]{background:#286650;border-color:#8ff1c8}#a12Products{min-height:0;min-width:0;overscroll-behavior:contain}@media(max-width:540px) and (orientation:portrait){#a12Shop.show{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(230px,40%) minmax(0,1fr);gap:12px}#a12Preview{gap:5px}#a12Preview canvas{max-height:62%;width:auto;max-width:100%}}`;
    style.textContent += `@media(orientation:landscape){#a12Shop{padding:max(12px,var(--safe-top)) max(14px,var(--safe-right)) max(12px,var(--safe-bottom)) max(14px,var(--safe-left))}#a12Shop.show{grid-template-columns:minmax(230px,38%) minmax(0,1fr);gap:14px}#a12Preview{min-height:35vh}#a12Preview canvas{max-height:72%}#a12Products{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden;padding:0}#a12ShopTop{display:flex;align-items:center;justify-content:space-between;gap:8px}#a12ShopTop h2{font:900 clamp(15px,2.4vw,22px)/1 system-ui;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#a12ShopTop [data-close]{min-width:44px;min-height:44px;padding:0}#a12Products .a12Tabs{display:flex;gap:7px;margin:5px 0}#a12Products [data-list]{display:grid;grid-template-columns:repeat(4,minmax(96px,1fr));gap:8px;overflow-y:auto;min-height:0;align-content:start}#a12Products article{position:relative;min-width:96px;min-height:102px;margin:0;padding:10px 8px 54px;box-sizing:border-box}#a12Products article h3{margin:0;font:850 12px/1.15 system-ui}#a12Products article [data-action]{position:absolute;left:8px;right:8px;bottom:6px;min-width:0;width:calc(100% - 16px);height:44px;padding:4px 6px;border-radius:999px;background:#07131d;color:#ffd45c;border:1px solid #ffd45c88;font:900 11px/1.05 system-ui;box-shadow:0 2px 0 #0008;text-shadow:none}#a12Products article [data-action]:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 #0008}#a12Products article [data-action]:disabled{opacity:.55;color:#d9e2e8;border-color:#ffffff35;box-shadow:none}#a12ShopBottom{display:flex;gap:8px;padding-top:7px}#a12ShopBottom button{min-height:44px;flex:1}#a12Products [data-save]{display:none}}`;
    style.textContent += `@media(orientation:landscape){#a12Products [data-list][hidden]{display:none!important}#a12Products article [data-action]:disabled{opacity:1;color:#82919a;background:#0b171e;border-color:#52616a;box-shadow:none}}`;
    document.head.appendChild(style);
    style.textContent += `#a12Actions{flex-wrap:wrap;justify-content:center;max-width:min(96vw,720px)}#a12Actions [data-act="rewarded"]{background:#286650;border-color:#8ff1c8}`;
    const actions = document.createElement("div");
    actions.id = "a12Actions";
    actions.innerHTML = `<button data-act="rewarded" hidden></button><button data-act="next">${t("next")}</button><button data-act="retry">${t("retry")}</button><button data-act="shop">${t("shop")}</button>`;
    document.body.appendChild(actions);
    const languageSelect=document.getElementById("a12Language");languageSelect.value=profile.settings.language;languageSelect.addEventListener("change",async()=>{const previous=profile.settings.language;profile.settings.language=languageFrom(languageSelect.value);applyLanguage();emitGame("language_change",{from:previous,to:profile.settings.language});await persist();});
    actions.hidden = true;
    actions.addEventListener("click", async (e) => {
      const a = e.target.dataset.act;
      if (!a) return;
      if (a === "rewarded") { void claimRewardedResult(); return; }
      if (a === "next") { const order=profile.selectedWorldId==="aftermath"?WORLD_REGISTRY.aftermath.routes:profile.selectedWorldId==="magma"?["M01","M02","M03","M04"]:profile.selectedWorldId==="frozen"?["F01","F02","F03","F04"]:["D01","D02","D03","D04","D05","D06"], next=order[order.indexOf(routeId)+1]||order[0]; await requestRouteInterstitial();startRoute(ROUTES[next]?next:order[0], true, next==="D06"); }
      if (a === "retry") startRoute(routeId, true, routeId === "D06");
      if (a === "shop") openShop();
    });
    const shop = document.createElement("section");
    shop.id = "a12Shop";
    shop.setAttribute("aria-hidden", "true");
    shop.innerHTML = `<div id="a12Preview"><canvas width="480" height="320" aria-label="Runner preview"></canvas><p id="a12WorldWarning" data-world-insufficient hidden></p><div class="previewControls"><button data-preview-runner="male"></button><button data-preview-runner="female"></button></div><div class="previewControls"><button data-preview-motion="idle"></button><button data-preview-motion="run"></button><button data-preview-motion="frontFlip"></button></div></div><div id="a12Products"><div id="a12ShopTop"><h2></h2><button data-close>×</button></div><div class="a12Tabs"><button data-tab="outfits"></button><button data-tab="worlds"></button></div><div data-list="outfits"><article data-item="default"><h3></h3><button data-action></button></article><article data-item="dockCrew"><h3></h3><button data-action></button></article></div><div data-list="worlds"></div><div id="a12ShopBottom"><button data-shop-back></button><button data-shop-buy></button></div><p data-save></p></div>`;
    shop.querySelector('[data-list="outfits"]').innerHTML = Object.keys(OUTFITS).map(id=>`<article data-item="${id}"><h3></h3><button data-action></button></article>`).join("");
    document.body.appendChild(shop);
    shop.addEventListener("click", async (e) => {
      if (e.target.closest("[data-close]")) return closeShop();
      if (e.target.closest("[data-shop-back]")) return closeShop();
      if (e.target.closest("[data-shop-buy]")) return shopTab==="worlds"?purchaseOrSelectWorld(previewWorldId):purchaseOrWear(previewOutfitId,previewRunnerId);
      const runnerButton=e.target.closest("[data-preview-runner]");
      if(runnerButton){previewRunnerId=runnerButton.dataset.previewRunner;return renderShop();}
      const motionButton=e.target.closest("[data-preview-motion]");
      if(motionButton){previewMotion=motionButton.dataset.previewMotion;previewStartedAt=performance.now();return renderShop();}
      const tab = e.target.closest("[data-tab]");
      if (tab) { shopTab = tab.dataset.tab; return renderShop(); }
      const article = e.target.closest("[data-item]");
      if (!article) return;
      if (shopTab === "worlds") {
        previewWorldId = article.dataset.item;
        renderShop();
        if (e.target.matches("[data-action]")) await purchaseOrSelectWorld(previewWorldId);
        return;
      }
      previewOutfitId = article.dataset.item;
      renderShop();
      if (e.target.matches("[data-action]"))
        await purchaseOrWear(previewOutfitId, previewRunnerId);
    });
    window.setInterval(() => {
      if (shopOpen) drawShopPreview();
    }, 80);
    const card = document.getElementById("characterCard");
    card.querySelector(".eyebrow").textContent = "TRUST ME BRO · DOCK 31";
    card.querySelector("h2").textContent = t("choose");
    card.querySelector("p").textContent = t("samePhysics");
    const choices = [...document.querySelectorAll(".characterChoice")];
    choices.forEach((el, i) => {
      if (i > 1) {
        el.hidden = true;
        return;
      }
      el.querySelector(":scope > canvas")?.insertAdjacentHTML(
        "beforebegin",
        `<span class="runnerSymbol">${i ? "♀" : "♂"}</span>`,
      );
      el.lastChild.textContent = i ? t("female") : t("male");
      el.addEventListener("click", () => selectRunner(i ? "female" : "male"));
    });
    const syncRunnerChoice=()=>choices.forEach((el,i)=>el.setAttribute("aria-pressed",String((i?"female":"male")===profile.runnerId)));
    syncRunnerChoice();
    document.getElementById("characterShop")?.addEventListener("click",()=>{shopReturnToCharacter=true;openShop();});
    const change = document.getElementById("characterChange");
    change.textContent = "↔";
    change.title = t("choose");
    applyLanguage();
    addEventListener("keydown", (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = true;
      if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = true;
      if (["ArrowUp", "w", "W", " "].includes(e.key)) keys.jump = true;
      if (["r", "R"].includes(e.key) && campaign) retry(true);
    });
    addEventListener("keyup", (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keys.left = false;
      if (["ArrowRight", "d", "D"].includes(e.key)) keys.right = false;
    });
    const joy = document.getElementById("joystick");
    joy?.addEventListener("pointerdown", (e) => {
      joystick.axis = Math.max(
        -1,
        Math.min(
          1,
          (e.clientX - joy.getBoundingClientRect().left - joy.clientWidth / 2) /
            (joy.clientWidth / 2),
        ),
      );
    });
    joy?.addEventListener("pointermove", (e) => {
      if (e.buttons)
        joystick.axis = Math.max(
          -1,
          Math.min(
            1,
            (e.clientX -
              joy.getBoundingClientRect().left -
              joy.clientWidth / 2) /
              (joy.clientWidth / 2),
          ),
        );
    });
    joy?.addEventListener("pointerup", () => (joystick.axis = 0));
    document
      .querySelector("#jumpWrap button")
      ?.addEventListener("pointerdown", () => (keys.jump = true));
  }
  function selectRunner(id) {
    profile.runnerId = id;
    document.querySelectorAll(".characterChoice").forEach((el,i)=>el.setAttribute("aria-pressed",String((i?"female":"male")===id)));
    engine.setCharacter(RUNNERS[id].legacy);
    void persist();
    startRoute(firstRouteForWorld(), true);
  }
  function openShop() {
    shopOpen = true;
    previewRunnerId=profile.runnerId||"male";previewMotion="idle";previewStartedAt=performance.now();
    previewOutfitId =
      profile.equippedOutfitByRunner[profile.runnerId] || "default";
    previewWorldId = profile.selectedWorldId;
    document.getElementById("a12Shop").classList.add("show");
    document.getElementById("a12Shop").setAttribute("aria-hidden", "false");
    emitGame("shop_open", { tab: shopTab });
    renderShop();
    syncActionVisibility();
  }
  function closeShop() {
    shopOpen = false;
    document.getElementById("a12Shop").classList.remove("show");
    document.getElementById("a12Shop").setAttribute("aria-hidden", "true");
    if(shopReturnToCharacter){shopReturnToCharacter=false;document.getElementById("characterSelect")?.classList.add("show");document.getElementById("characterSelect")?.setAttribute("aria-hidden","false");}
    syncActionVisibility();
  }
  function renderShop() {
    const s = document.getElementById("a12Shop");
    const motionLabels=[t("idle"),t("motionRun"),t("flip")];
    s.querySelectorAll('[data-preview-runner]').forEach(b=>{b.textContent=t(b.dataset.previewRunner);b.setAttribute('aria-pressed',String(b.dataset.previewRunner===previewRunnerId));});
    s.querySelectorAll('[data-preview-motion]').forEach((b,i)=>{b.textContent=motionLabels[i];b.setAttribute('aria-pressed',String(b.dataset.previewMotion===previewMotion));});
    s.querySelector("h2").textContent = `${t("shop")} · ${t(shopTab)} · ${t("wallet")} ${profile.walletBalance}`;
    s.querySelector('[data-tab="outfits"]').textContent=t("outfits");
    s.querySelector('[data-tab="worlds"]').textContent=t("worlds");
    s.querySelector('[data-list="outfits"]').hidden=shopTab!=="outfits";
    s.querySelector('[data-list="worlds"]').hidden=shopTab!=="worlds";
    s.querySelector('[data-item="default"] h3').textContent = t("defaultOutfit");
    s.querySelector('[data-item="dockCrew"] h3').textContent = t("dockCrew");
    for (const a of s.querySelectorAll('[data-list="outfits"] article')) {
      const id = a.dataset.item,
        owned = profile.ownedOutfitSetIds.includes(id),
        worn = profile.equippedOutfitByRunner[previewRunnerId] === id,
        short = !owned && profile.walletBalance < OUTFITS[id].price;
      a.querySelector("h3").textContent = t(id === "default" ? "defaultOutfit" : id);
      a.style.outline = previewOutfitId === id ? "2px solid #79e9ba" : "none";
      a.dataset.owned=String(owned);a.dataset.price=String(OUTFITS[id].price);
      a.querySelector("button").textContent = worn
        ? t("worn")
        : owned
          ? t("wear")
          : `${short?"🔒 ":""}◉ ${OUTFITS[id].price}`;
      a.querySelector("button").disabled = worn || purchaseBusy || short;
      a.querySelector('.priceBadge')?.remove();
    }
    const worlds=s.querySelector('[data-list="worlds"]');
    worlds.innerHTML=Object.values(WORLD_REGISTRY).map(w=>`<article data-item="${w.id}"><h3>${w.id.toUpperCase()}</h3><button data-action></button></article>`).join("");
    for(const a of worlds.querySelectorAll("article")){const w=WORLD_REGISTRY[a.dataset.item],owned=profile.ownedWorldIds.includes(w.id),selected=profile.selectedWorldId===w.id,b=a.querySelector("button"),short=!owned&&profile.walletBalance<w.price;a.dataset.owned=String(owned);a.dataset.price=String(w.price);a.style.outline=previewWorldId===w.id?"2px solid #79e9ba":"none";b.textContent=!w.enabled?t("planned"):selected?t("selected"):owned?t("select"):`${short?"🔒 ":""}◉ ${w.price}`;b.disabled=!w.enabled||selected||purchaseBusy||short;}
    const back=s.querySelector('[data-shop-back]'),buy=s.querySelector('[data-shop-buy]'),selected=s.querySelector(`${shopTab==="worlds"?'[data-list="worlds"]':'[data-list="outfits"]'} [data-item="${shopTab==="worlds"?previewWorldId:previewOutfitId}"] [data-action]`),previewWorld=WORLD_REGISTRY[previewWorldId],worldOwned=!!previewWorld&&profile.ownedWorldIds.includes(previewWorldId),worldSelected=profile.selectedWorldId===previewWorldId,worldShort=!!previewWorld&&!worldOwned&&profile.walletBalance<previewWorld.price,warning=s.querySelector('[data-world-insufficient]');back.textContent=profile.settings.language==='tr'?'GERİ':profile.settings.language==='ru'?'НАЗАД':'BACK';if(shopTab==="worlds"&&previewWorld){buy.textContent=!previewWorld.enabled?t("planned"):worldSelected?t("selected"):worldOwned?t("select"):t("buyWorld").replace("{price}",previewWorld.price);buy.disabled=!previewWorld.enabled||worldSelected||purchaseBusy||worldShort}else{buy.textContent=selected?.textContent||t('selected');buy.disabled=!!selected?.disabled}warning.hidden=!(shopTab==="worlds"&&previewWorld?.enabled&&worldShort);warning.textContent=warning.hidden?"":t("insufficient");
    s.querySelector("[data-save]").textContent = saveFailure ? t("saveFailed") : t("noCharge");
    drawShopPreview();
  }
  function drawShopPreview(now=performance.now()) {
    const q = document.querySelector("#a12Preview canvas"),
      x = q.getContext("2d");
    x.clearRect(0, 0, q.width, q.height);
    drawThemeScene(x,q.width,q.height,shopTab==="worlds"?previewWorldId:profile.selectedWorldId,true);
    x.save();x.translate(q.width/2,240);x.scale(3,3);
    drawRunnerAtlas(x,previewRunnerId,previewOutfitId,{motion:previewMotion,frame:Math.floor(Math.max(0,now-previewStartedAt)/1000*(previewMotion==="run"?16:8))%8},0,0);
    x.restore();
  }
  async function purchaseOrSelectWorld(id) {
    if (purchaseBusy) return false;
    const item = WORLD_REGISTRY[id];
    if (!item?.enabled) return false;
    if (profile.ownedWorldIds.includes(id)) {
      pendingWorldId = item.routes.length ? id : null;
      renderShop(); return true;
    }
    if (profile.walletBalance < item.price) return false;
    purchaseBusy = true;
    const before = clone(profile);
    profile.walletBalance -= item.price;
    profile.ownedWorldIds.push(id);
    const ok = await persist();
    if (!ok) profile = before;
    // MAGMA purchase preserves the current run; selecting the owned world queues its next start.
    else pendingWorldId = (id === "magma" || id === "aftermath") ? null : item.routes.length ? id : null;
    purchaseBusy = false;
    emitGame(ok ? "world_purchase_success" : "world_purchase_failed", { worldId:id, price:item.price });
    renderShop(); return ok;
  }
  // AFTERMATH presentation only. Decor is derived from immutable coordinates, never hazard state.
  const aftermathBackdropCache = new Map();
  function aftermathDecor() {
    const items=[];
    for(let x=150;x<route.length;x+=930) items.push({id:`wreck-${x}`,x,y:GROUND,visible:true});
    return items;
  }
  function aftermathBackdrop(c,w,h) {
    const key=`${w}x${h}`;
    if(aftermathBackdropCache.has(key)){c.drawImage(aftermathBackdropCache.get(key),0,0);return;}
    const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#9b9c91');sky.addColorStop(.53,'#626960');sky.addColorStop(1,'#232f30');c.fillStyle=sky;c.fillRect(0,0,w,h);
    // Thin smoke stays in the distant sky, above the gameplay band.
    for(let i=0;i<4;i++){c.strokeStyle='#353f4055';c.lineWidth=9+i*2;c.beginPath();c.moveTo(w*(.16+i*.24),h*.28);c.bezierCurveTo(w*(.08+i*.24),h*.2,w*(.22+i*.24),h*.12,w*(.13+i*.24),-10);c.stroke();}
    for(let i=0;i<8;i++){const x=i*w/7;c.fillStyle=i%2?'#3a4947':'#50564a';c.beginPath();c.moveTo(x,h*.61);c.lineTo(x+15,h*.32);c.lineTo(x+65,h*.38);c.lineTo(x+90,h*.6);c.fill();c.fillStyle='#bbc3a3';c.fillRect(x+27,h*.4,18,7);}
    c.fillStyle='#303a35';c.fillRect(0,h*.64,w,h*.36);
    // Diagonal toppled freight silhouettes, not the regular dock corridor.
    for(let x=-45;x<w;x+=227){c.save();c.translate(x,h*.59);c.rotate(-.28);c.fillStyle='#59645a';c.fillRect(0,-55,160,65);c.strokeStyle='#8d9380';c.lineWidth=3;c.strokeRect(0,-55,160,65);for(let q=12;q<150;q+=23){c.beginPath();c.moveTo(q,-51);c.lineTo(q,6);c.stroke();}c.restore();}
    const tile=document.createElement('canvas');tile.width=w;tile.height=h;tile.getContext('2d').drawImage(c.canvas,0,0);aftermathBackdropCache.set(key,tile);
  }
  function aftermathSurface(c,x,y,w,h,kind='platform') {
    c.fillStyle=kind==='ground'?'#696e64':'#535f55';c.fillRect(x,y,w,h);
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    for(let q=0;q<w;q+=83){c.fillStyle=q%166?'#3f4843':'#929485';c.beginPath();c.moveTo(x+q,y+8);c.lineTo(x+q+63,y+17);c.lineTo(x+q+73,y+h);c.lineTo(x+q+14,y+h);c.fill();c.strokeStyle='#222e2b';c.lineWidth=2;c.beginPath();c.moveTo(x+q+32,y+4);c.lineTo(x+q+18,y+31);c.lineTo(x+q+39,y+44);c.lineTo(x+q+29,y+h);c.stroke();}
    c.restore();c.fillStyle='#e1e7c9';c.fillRect(x,y,w,5);
    // Broken, isolated tape patches; no continuous periodic dock stripe.
    c.fillStyle='#d4b554';if(w>100){c.save();c.translate(x+38,y+13);c.rotate(-.17);c.fillRect(0,0,29,6);c.restore();}
  }
  function aftermathRescuer(c,x,y,chief=false) {
    c.fillStyle='#222c29';c.fillRect(x-12,y-27,9,27);c.fillRect(x+5,y-27,9,27);
    c.fillStyle=chief?'#d9a83e':'#de742c';c.beginPath();c.moveTo(x-16,y-62);c.lineTo(x+16,y-57);c.lineTo(x+22,y-25);c.lineTo(x-21,y-25);c.fill();
    c.strokeStyle='#e8f2cb';c.lineWidth=5;c.beginPath();c.moveTo(x-11,y-57);c.lineTo(x-3,y-28);c.moveTo(x+10,y-55);c.lineTo(x+6,y-28);c.stroke();
    c.fillStyle='#be9770';c.fillRect(x-9,y-77,19,15);c.fillStyle='#ddd6b7';c.fillRect(x-15,y-84,30,9);c.fillStyle='#fcffe1';c.fillRect(x+5,y-82,8,5);
  }
  function aftermathLights(c,time,enabled=true,gain=1) {
    if(!enabled)return;
    const pulse=.5+.5*Math.sin(time*Math.PI); // 2 second period; surface overlay <= 4% alpha.
    for(const d of aftermathDecor()){
      c.fillStyle=`rgba(255,94,38,${.58+.32*pulse*gain})`;c.fillRect(d.x+64,GROUND-116,16,9);
      c.fillStyle=`rgba(255,171,85,${.04*pulse*gain})`;c.fillRect(d.x,GROUND-3,150,28);
    }
  }
  function drawAftermathWorld(c,light=true,time=gameClock,gain=1) {
    for(const d of aftermathDecor()){c.save();c.translate(d.x,d.y-12);c.rotate(-.19);c.fillStyle='#384941';c.fillRect(0,-84,146,77);c.strokeStyle='#86917b';c.lineWidth=3;c.strokeRect(0,-84,146,77);for(let q=16;q<138;q+=27){c.beginPath();c.moveTo(q,-80);c.lineTo(q,-13);c.stroke();}c.restore();}
    aftermathSurface(c,0,GROUND,route.length,100,'ground');
    for(const s of routeSurfaces(route).filter(v=>v.kind!=='ground')){
      aftermathSurface(c,s.x,s.y,s.w,s.h);
      if(s.parkour==='vault'){c.strokeStyle='#c6c9af';c.lineWidth=3;c.beginPath();c.moveTo(s.x+4,s.y+8);c.lineTo(s.x+s.w*.6,s.y+s.h*.6);c.lineTo(s.x+s.w-4,s.y+11);c.stroke();c.fillStyle='#262c29';c.fillRect(s.x+s.w*.2,s.y+s.h*.6,s.w*.6,8);}
      if(s.parkour==='slide'){c.fillStyle='#eff0cc';c.fillRect(s.x-5,s.y+s.h-6,s.w+10,6);c.fillStyle='#e9c04b';c.font='bold 17px system-ui';c.fillText('↓',s.x+s.w/2-7,s.y+s.h+17);}
    }
    for(const o of route.obstacles){if(o.type==='ramp'){c.fillStyle='#73796b';c.beginPath();c.moveTo(o.x,GROUND);c.lineTo(o.x+o.w,GROUND-o.h);c.lineTo(o.x+o.w,GROUND);c.closePath();c.fill();c.strokeStyle='#edf1cd';c.lineWidth=6;c.stroke();c.strokeStyle='#333d35';c.lineWidth=3;c.beginPath();c.moveTo(o.x+o.w*.5,GROUND-o.h*.5+7);c.lineTo(o.x+o.w*.6,GROUND-10);c.stroke();}else if(o.type==='worker'){aftermathRescuer(c,o.x,GROUND);if(!workerDisabled&&workerClock>1.65){c.fillStyle='#ff6551';c.font='bold 22px system-ui';c.fillText('!',o.x-3,GROUND-97);}}}
    if(!debugHideMovingPlatforms)for(const p of movingPlatforms){if(p.type==='crane'){c.strokeStyle='#d5d7b9';c.lineWidth=4;c.beginPath();c.moveTo(p.x+p.w*.3-35,115);c.quadraticCurveTo(p.x+p.w*.3+20,190,p.x+p.w*.3,p.y);c.moveTo(p.x+p.w*.75+22,115);c.lineTo(p.x+p.w*.75,p.y);c.stroke();}aftermathSurface(c,p.x,p.y,p.w,p.h);c.fillStyle='#ecbd55';c.fillRect(p.x+7,p.y+7,Math.max(4,p.w*.24),6);c.fillStyle='#eff2d5';c.font='bold 18px system-ui';c.fillText(p.type==='pallet'?'↔':'!',p.x+p.w/2-7,p.y-9);}
    for(const p of collapsing){if(p.state==='ABSENT')continue;c.save();if(p.state==='CONTACT_WARNING')c.translate(Math.sin(p.timer*55)*3,0);const y=p.y+p.fallY;aftermathSurface(c,p.x,y,p.w,p.h);c.strokeStyle='#17251d';c.lineWidth=4;c.beginPath();c.moveTo(p.x+10,y+5);c.lineTo(p.x+p.w*.4,y+19);c.lineTo(p.x+p.w*.7,y+5);c.lineTo(p.x+p.w-10,y+20);c.stroke();c.fillStyle='#f3c54b';c.fillRect(p.x,y,p.w,4);c.restore();}
    for(const d of containerDoors){aftermathSurface(c,d.x,d.currentY,d.w,d.h);c.strokeStyle='#d5c8a0';c.lineWidth=6;c.beginPath();c.moveTo(d.x-8,d.currentY+d.h);c.lineTo(d.x-3,d.currentY-12);c.lineTo(d.x+d.w+9,d.currentY-5);c.stroke();c.fillStyle=d.state==='OPEN'?'#63f2a5':d.state==='PREPARING'?'#ffd34d':'#ff5b55';c.beginPath();c.arc(d.x+d.w/2,d.currentY-26,9,0,7);c.fill();}
    for(const b of barrels){c.fillStyle='#343c32';c.strokeStyle='#c6bd94';c.lineWidth=3;c.beginPath();c.moveTo(b.x+5,b.y);c.lineTo(b.x+27,b.y+4);c.lineTo(b.x+24,b.y+27);c.lineTo(b.x,b.y+22);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(b.x+3,b.y+9);c.lineTo(b.x+23,b.y+17);c.stroke();}
    if(campaignChief?.active)aftermathRescuer(c,campaignChief.x+14,campaignChief.y+48,true);
    c.strokeStyle='#c1c9ad';c.lineWidth=8;c.strokeRect(route.finishX,GROUND-126,112,126);c.fillStyle='#44be82';c.fillRect(route.finishX+8,GROUND-120,96,35);c.fillStyle='#102a20';c.font='bold 14px system-ui';c.fillText(t('finish'),route.finishX+17,GROUND-97);
    aftermathLights(c,time,light,gain);
    for(const coin of route.coins)if(!run?.collectedCoinIds.includes(coin.id))drawCoin(c,coin);
  }
  function drawThemeScene(c,w,h,worldId,preview=false) {
    if (worldId === "aftermath") { aftermathBackdrop(c,w,h); return; }
    if (worldId === "magma") {
      const cacheKey=`${w}x${h}`,cached=magmaBackdropCache.get(cacheKey);
      if(cached&&c.canvas.width===w&&c.canvas.height===h){c.drawImage(cached,0,0);return;}
      const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#171820");sky.addColorStop(.58,"#48342f");sky.addColorStop(1,"#8a3c24");c.fillStyle=sky;c.fillRect(0,0,w,h);
      c.fillStyle="#24242a";c.beginPath();c.moveTo(0,h*.63);for(let x=0;x<=w;x+=72)c.lineTo(x,h*(.43-((x/72)%5)*.035));c.lineTo(w,h*.72);c.lineTo(0,h*.72);c.fill();
      c.fillStyle="#17171bcc";c.beginPath();c.moveTo(w*.42,h*.59);c.lineTo(w*.59,h*.12);c.lineTo(w*.76,h*.59);c.closePath();c.fill();
      c.fillStyle="#39343c77";for(let i=0;i<5;i++){c.beginPath();c.arc(w*.59+i*12,h*(.12-i*.045),24+i*7,0,7);c.fill();}
      c.strokeStyle="#70605a22";c.lineWidth=11;for(let y=h*.09;y<h*.42;y+=43){c.beginPath();for(let x=-20;x<w+20;x+=55){const yy=y+Math.sin((x+y)/47)*15;x<0?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();}
      c.fillStyle="#aaa7a0";for(let x=18;x<w;x+=163)for(let y=105;y<h*.34;y+=137){c.beginPath();c.arc(x,y,1.2,0,Math.PI*2);c.fill();}
      c.fillStyle="#ff6a22";c.beginPath();c.moveTo(0,h*.24);for(let x=0;x<=w;x+=38)c.lineTo(x,h*(.22+.004*Math.sin(x/83)));c.lineTo(w,h*.25);c.lineTo(0,h*.25);c.fill();
      c.fillStyle="#332f30";c.fillRect(0,h*.76,w,h*.24);c.strokeStyle="#77716b";c.lineWidth=3;for(let x=0;x<w;x+=54){c.beginPath();c.moveTo(x,h*.76);c.lineTo(x+27,h*.81);c.lineTo(x+54,h*.76);c.stroke();}
      c.fillStyle="#36343a";for(let x=35;x<w;x+=210){c.fillRect(x,h*.47,145,h*.2);c.fillStyle="#111216";c.fillRect(x+14,h*.51,54,h*.13);c.fillStyle="#c0ac78";c.fillRect(x+76,h*.49,52,8);c.fillStyle="#26262b";c.fillRect(x+18,h*.39,28,h*.1);c.fillRect(x+94,h*.32,24,h*.15);c.fillStyle="#36343a";}
      c.fillStyle="#d0d3d1";for(let x=18;x<w;x+=113){c.beginPath();c.arc(x,(x*11)%Math.max(30,h*.55),1.5,0,7);c.fill();}
      if(c.canvas.width===w&&c.canvas.height===h){const cachedCanvas=document.createElement("canvas");cachedCanvas.width=w;cachedCanvas.height=h;cachedCanvas.getContext("2d").drawImage(c.canvas,0,0);magmaBackdropCache.set(cacheKey,cachedCanvas);}
      return;
    }
    if (worldId !== "frozen") {
      c.fillStyle="#183849";c.fillRect(0,0,w,h);c.fillStyle="#31566a";
      for(let i=0;i<w;i+=96)c.fillRect(i,h*.48,70,h*.3);
      c.fillStyle="#425d69";c.fillRect(0,h*.78,w,h*.22);return;
    }
    const key=`frozen|${routeId}|${route.version}|${engine?.renderInfo().dpr||1}|${w}x${h}`;
    sceneCache.set(key,true);
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,"#102d4d");g.addColorStop(.48,"#397f9a");g.addColorStop(1,"#d5f2f5");c.fillStyle=g;c.fillRect(0,0,w,h);
    c.strokeStyle="#7fffd477";c.lineWidth=18;c.beginPath();for(let x=-20;x<=w+20;x+=36){const y=h*(.16+.035*Math.sin(x/91));x<0?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();
    c.fillStyle="#bfeaf1bb";c.beginPath();c.moveTo(0,h*.57);for(let x=0;x<=w;x+=90)c.lineTo(x,h*(.25+((x/90)%4)*.055));c.lineTo(w,h*.65);c.lineTo(0,h*.65);c.fill();
    c.fillStyle="#285c74aa";for(let x=-30;x<w;x+=190){c.beginPath();c.moveTo(x,h*.67);c.lineTo(x+35,h*.42);c.lineTo(x+74,h*.49);c.lineTo(x+105,h*.31);c.lineTo(x+150,h*.67);c.closePath();c.fill();c.strokeStyle="#dffaff99";c.lineWidth=5;c.stroke();}
    c.fillStyle="#dff8ff";for(let i=15;i<w;i+=52){c.beginPath();c.arc(i,(i*7)%Math.max(40,h*.55),2,0,7);c.fill();}
    c.fillStyle="#70bdd3";c.fillRect(0,h*.67,w,h*.11);c.fillStyle="#dff9ff";for(let x=12;x<w;x+=86){c.beginPath();c.ellipse(x,h*.71+(x%3)*7,31,7,0,0,7);c.fill();}
    const shelf=c.createLinearGradient(0,h*.78,0,h);shelf.addColorStop(0,"#c8edf3");shelf.addColorStop(.45,"#79bdcd");shelf.addColorStop(1,"#39788d");c.fillStyle=shelf;c.fillRect(0,h*.78,w,h*.22);c.fillStyle="#effcff";c.beginPath();c.moveTo(0,h*.79);for(let x=0;x<=w;x+=58)c.lineTo(x,h*(.775+(x/58%3)*.008));c.lineTo(w,h*.82);c.lineTo(0,h*.82);c.closePath();c.fill();
    c.fillStyle="#edfaff";c.fillRect(0,h*.76,w,7);
    for(let i=35;i<w;i+=120){const groundY=h*.78,ly=groundY-Math.min(92,h*.18);c.strokeStyle="#203944";c.lineWidth=4;c.beginPath();c.moveTo(i,groundY);c.lineTo(i,ly);c.stroke();c.fillStyle="#ffd27a";c.fillRect(i-11,ly-5,22,7);const glow=c.createLinearGradient(i,ly,i,ly+42);glow.addColorStop(0,"#ffd98a88");glow.addColorStop(1,"#ffd98a00");c.fillStyle=glow;c.beginPath();c.moveTo(i-13,ly+2);c.lineTo(i+13,ly+2);c.lineTo(i+28,ly+42);c.lineTo(i-28,ly+42);c.closePath();c.fill();}
    if(!preview){c.strokeStyle="#dff9ff";c.lineWidth=4;c.strokeRect(0,h*.78,w,h*.22);}
  }
  function frozenSurface(c,x,y,w,h,kind="platform") {
    const ice=c.createLinearGradient(0,y,0,y+h);ice.addColorStop(0,"#9dddea");ice.addColorStop(.35,"#397b91");ice.addColorStop(1,"#17384b");c.fillStyle=ice;c.fillRect(x,y,w,h);
    const snowStep=kind==="ground"?120:18,icicleStep=kind==="ground"?260:47,crackStep=kind==="ground"?700:137;
    c.fillStyle="#f4fdff";c.beginPath();c.moveTo(x,y+12);for(let q=0;q<=w;q+=snowStep)c.lineTo(x+q,y+3+((q/snowStep)%4===1?7:(q/snowStep)%4===3?4:0));c.lineTo(x+w,y+18);c.lineTo(x,y+18);c.closePath();c.fill();
    c.strokeStyle="#bceefa";c.lineWidth=3;c.beginPath();c.moveTo(x,y+18);c.lineTo(x+w,y+18);c.stroke();
    c.fillStyle="#c9f4fb";for(let q=15;q<w-8;q+=icicleStep){c.beginPath();c.moveTo(x+q,y+h-1);c.lineTo(x+q+7,y+h+12+(q%19));c.lineTo(x+q+14,y+h-1);c.fill();}
    c.strokeStyle="#79c6d8";c.lineWidth=2;for(let q=35;q<w;q+=crackStep){c.beginPath();c.moveTo(x+q,y+25);c.lineTo(x+q+18,y+34);c.lineTo(x+q+5,y+45);c.lineTo(x+q+29,y+52);c.stroke();}
    if(kind==="ground"){c.fillStyle="#d7f7fb55";for(let q=70;q<w;q+=900){c.beginPath();c.ellipse(x+q,y+29,24,7,-.12,0,7);c.fill();}}
  }
  let magmaBasaltTile;
  function magmaSurface(c,x,y,w,h,kind="platform") {
    if(kind==="ground") {
      if(!magmaBasaltTile){
        magmaBasaltTile=document.createElement("canvas");magmaBasaltTile.width=96;magmaBasaltTile.height=84;
        const t=magmaBasaltTile.getContext("2d");t.fillStyle="#292a30";t.fillRect(0,0,96,84);
        t.strokeStyle="#66666e";t.lineWidth=1.2;
        for(let row=-1;row<4;row++)for(let col=-1;col<4;col++){
          const cx=col*48+(row%2)*24,cy=row*42;t.beginPath();
          for(let i=0;i<6;i++){const a=Math.PI/3*i,px=cx+27*Math.cos(a),py=cy+27*Math.sin(a);i?t.lineTo(px,py):t.moveTo(px,py);}t.closePath();t.stroke();
        }
      }
      c.fillStyle=c.createPattern(magmaBasaltTile,"repeat");c.fillRect(x,y,w,h);
      c.fillStyle="#a9aaa9";c.fillRect(x,y,w,5);c.fillStyle="#181a20";c.fillRect(x,y+5,w,9);
      // Steel grating, distinct from the dock's diagonal hazard stripes.
      c.fillStyle="#8b9098";for(let q=0;q<w;q+=22)c.fillRect(x+q,y+5,3,9);
      return;
    }
    c.fillStyle="#29292d";c.fillRect(x,y,w,h);c.strokeStyle="#77736e";c.lineWidth=3;c.strokeRect(x,y,w,h);
    c.strokeStyle="#47464a";c.lineWidth=2;
    for(let q=0;q<w;q+=42){c.beginPath();c.moveTo(x+q,y);c.lineTo(x+q+21,y+10);c.lineTo(x+q+42,y);c.stroke();}
    c.fillStyle="#ddd8cc";c.fillRect(x,y,w,9);c.fillStyle="#16171a";for(let q=10;q<w;q+=18)c.fillRect(x+q,y+9,9,Math.min(7,h-9));
  }
  async function purchaseOrWear(id, runnerId=profile.runnerId) {
    if (purchaseBusy || !RUNNERS[runnerId] || !Object.hasOwn(OUTFITS, id)) return false;
    if (profile.ownedOutfitSetIds.includes(id)) {
      purchaseBusy = true;
      const before = clone(profile);
      profile.equippedOutfitByRunner[runnerId] = id;
      const ok = await persist();
      if (!ok) profile = before;
      purchaseBusy = false;
      if(ok){sfx("equip");emitGame("outfit_worn",{itemId:id,runnerId});}
      renderShop();
      return ok;
    }
    const item = OUTFITS[id];
    if (!item || profile.walletBalance < item.price) return false;
    purchaseBusy = true;
    const before = clone(profile);
    profile.walletBalance -= item.price;
    profile.ownedOutfitSetIds.push(id);
    profile.equippedOutfitByRunner[runnerId] = id;
    const ok = await persist();
    if (!ok) profile = before;
    purchaseBusy = false;
    if(ok)sfx("purchase");
    emitGame(ok ? "purchase_success" : "purchase_failed", {
      itemId: id,
      price: item.price,
    });
    if(ok){sfx("equip");emitGame("outfit_worn",{itemId:id,runnerId});}
    renderShop();
    return ok;
  }
  function debugState() {
    return {
      schemaVersion: profile.schemaVersion,
      profile: clone(profile),
      routeId,
      routeVersion: route?.version,
      cameraWorldY,
      cameraGroundFootY,
      ...(DEBUG ? {pose:{...runnerAtlasPose(diveRun?{...engine.parkour,state:"dive",timer:Math.max(0,diveRun.duration-diveRun.elapsed),duration:diveRun.duration}:engine.parkour),angle:0}} : {}),
      movementProfile: movementProfile(),
      vectorJumpPending: vectorJumpPending ? { ...vectorJumpPending } : null,
      vectorAir: vectorAir ? { ...vectorAir } : null,
      vectorRollStarts,
      diveRun: diveRun ? {elapsed:diveRun.elapsed,duration:diveRun.duration,startX:diveRun.startX,endX:diveRun.endX,landY:diveRun.landY} : null,
      parkour: {state:diveRun?"dive":engine.parkour.state,timer:diveRun?Math.max(0,diveRun.duration-diveRun.elapsed):engine.parkour.timer,dir:engine.parkour.dir},
      obstacleSeed: obstacleSeed(route),
      runnerId: profile.runnerId,
      hitbox: { w: player.w, h: player.h },
      viewport: { w: engine.W, h: engine.H },
      economy: run
        ? {
            economyRunId: run.economyRunId,
            attemptId: run.attemptId,
            runCoins: run.runCoins,
            collectedCoinIds: [...run.collectedCoinIds],
            walletBalance: profile.walletBalance,
            banked: run.banked,
          }
        : null,
      player: {
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        onGround: player.onGround,
        state: frontFlip.active
          ? "frontFlip"
          : staggerT > 0
            ? "stagger"
            : engine.getState(),
      },
      input: keys
        ? {
            left: keys.left,
            right: keys.right,
            jump: keys.jump,
            joystick: joystick.axis,
          }
        : null,
      frontFlip: { ...frontFlip, renderMode: "tuck-atlas-layer" },
      flow,
      barrels: clone(barrels),
      worker: { disabled:workerDisabled, clock:workerClock },
      checkpointX: run?.checkpointX,
      result: result ? clone(result) : null,
      engine: {
        singleLoop: !document.getElementById("a12Canvas"),
        renderFrameCount,
        wallHeight: engine.constants.PK_WALL_HEIGHT,
        wallRise: engine.constants.PK_WALL_RISE,
        observedStates: [...flowMoves],
      },
      movingPlatforms: movingPlatforms.map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,minX:p.minX,maxX:p.maxX,dx:p.dx,rideFrames:p.rideFrames})),
      platformOrder: {...platformOrder},
      gameClock,
      wallMantle: wallMantle
        ? {
            wallId: wallMantle.wall.id,
            phase: wallMantle.phase,
            elapsed: wallMantle.elapsed,
            duration: wallMantle.duration,
            startedAt: wallMantle.startedAt,
            wallTop: wallMantle.wallY,
            startX: wallMantle.startX,
            startY: wallMantle.startY,
            endX: wallMantle.endX,
            endY: wallMantle.endY,
          }
        : null,
      lastWallMantle: lastWallMantle ? { ...lastWallMantle } : null,
      edgeClimb: edgeClimb ? {wallId:edgeClimb.wall.id,phase:engine.parkour.state,elapsed:edgeClimb.elapsed,duration:edgeClimb.duration,wallTop:edgeClimb.wall.y} : null,
      edgeCatchProbe: edgeCatchProbe ? clone(edgeCatchProbe) : null,
      campaignDeaths,
      collapsing: collapsing.map(c=>({id:c.id,state:c.state,timer:c.timer,fallY:c.fallY,warning:c.warning,warningStartedAt:c.warningStartedAt,warningElapsed:c.warningElapsed})),
      containerDoors: containerDoors.map(d=>({id:d.id,state:d.state,timer:d.timer,x:d.x,y:d.currentY,w:d.w,h:d.h,preparingElapsed:d.preparingElapsed,pushes:d.pushes})),
      chief: campaignChief ? {...campaignChief,distance:player.x-campaignChief.x} : null,
      deaths: campaignDeaths,
      dead: engine.isDead() || !!campaignChief?.caughtT,
      shop: { open: shopOpen, tab:shopTab, previewOutfitId, previewWorldId, purchaseBusy, saveStatus },
      world: { registry:clone(WORLD_REGISTRY), selectedWorldId:profile.selectedWorldId, pendingWorldId, activeCacheKey:activeWorldCacheKey, cacheKeys:[...sceneCache.keys()], renderSignatures:{...renderSignatures} },
      route: {id:routeId,name:(["magma","aftermath"].includes(route.worldId) ? t(route.routeId) : route.name),worldId:route.worldId,length:route.length,finishX:route.finishX,checkpoints:[...route.checkpoints],obstacles:clone(route.obstacles),coins:clone(route.coins),unlocked:Object.fromEntries((route.worldId==="aftermath"?["A01","A02","A03","A04"]:route.worldId==="magma"?["M01","M02","M03","M04"]:["F01","F02","F03","F04"]).map(id=>[id,routeUnlocked(id)]))},
    };
  }
  function drawBackgroundIntegrated(c, w, h) {
    ctx = c;
    const cacheRoute=profile.selectedWorldId==="frozen"&&routeId==="F01"?"D01":routeId;
    const cacheVersion=cacheRoute==="D01"?2:route.version;
    activeWorldCacheKey=`${profile.selectedWorldId}|${cacheRoute}|${cacheVersion}|${engine.renderInfo().dpr}`;
    const frozen=profile.selectedWorldId==="frozen",magma=profile.selectedWorldId==="magma";
    renderSignatures=(frozen||magma||profile.selectedWorldId==="aftermath")?{deckStripe:0,dock31Text:0,containerBlock:0,dockCrane:0,loadingCorridor:0,foregroundLampGroundGap:0,snowCap:0,icicles:0,iceRatio:0}:{deckStripe:1,dock31Text:1,containerBlock:1,dockCrane:1,loadingCorridor:1,foregroundLampGroundGap:0,snowCap:0,icicles:0,iceRatio:0};
    const verticalParallax=Math.max(-.35*h,Math.min(.35*h,.25*(cameraWorldY-backgroundCameraWorldY)));
    const backgroundKey=`${activeWorldCacheKey}|${w}|${h}`;
    drawBackgroundIntegrated.edgeColors=drawBackgroundIntegrated.edgeColors||new Map();
    let backdropCalls=0;
    c.save();
    c.translate(0,verticalParallax);
    if(frozen||magma||profile.selectedWorldId==="aftermath") drawThemeScene(c,w,h,profile.selectedWorldId); else engine.drawDockBackdrop(activeWorldCacheKey);
    backdropCalls++;
    c.restore();
    let edges=drawBackgroundIntegrated.edgeColors.get(backgroundKey);
    if(!edges){
      const transform=c.getTransform(),canvas=c.canvas,averageRow=y=>{
        const py=Math.max(0,Math.min(canvas.height-1,Math.round(transform.f*y+transform.d*y))),x0=Math.max(0,Math.round(transform.e)),x1=Math.min(canvas.width,Math.round(transform.e+transform.a*w));
        const data=c.getImageData(x0,py,Math.max(1,x1-x0),1).data,sum=[0,0,0];let weight=0;
        for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;sum[0]+=data[i]*a;sum[1]+=data[i+1]*a;sum[2]+=data[i+2]*a;weight+=a}
        return sum.map(v=>Math.round(v/Math.max(1,weight)));
      };
      edges={top:averageRow(verticalParallax),bottom:averageRow(verticalParallax+h-1)};
      drawBackgroundIntegrated.edgeColors.set(backgroundKey,edges);
    }
    if(verticalParallax>0){c.fillStyle=`rgb(${edges.top.join(',')})`;c.fillRect(0,0,w,verticalParallax)}
    else if(verticalParallax<0){c.fillStyle=`rgb(${edges.bottom.join(',')})`;c.fillRect(0,h+verticalParallax,w,-verticalParallax)}
    window.__tmbBackgroundDraw={calls:backdropCalls,offset:verticalParallax,fillBoundary:verticalParallax>0?verticalParallax:verticalParallax<0?h+verticalParallax:null};
  }
  function drawWorldIntegrated(c) {
    if(profile.selectedWorldId==="aftermath"){drawAftermathWorld(c,true,gameClock,effectsGain());return;}
    ctx = c;
    const frozen=profile.selectedWorldId==="frozen",magma=profile.selectedWorldId==="magma";
    // Dock silhouettes stay behind gameplay geometry and make hazards readable at approach distance.
    for (let x = 120; x < route.length; x += 720) {
      if(magma){
        c.fillStyle="#25252a";c.beginPath();c.moveTo(x,455);c.lineTo(x+36,292);c.lineTo(x+152,245);c.lineTo(x+218,455);c.fill();c.strokeStyle="#b49e72";c.lineWidth=6;c.stroke();
        c.fillStyle="#4a4644";c.fillRect(x+48,315,112,140);c.fillStyle="#17181b";c.fillRect(x+69,342,70,88);continue;
      } else if(frozen){
        c.fillStyle="#1f5269cc";c.beginPath();c.moveTo(x-20,455);c.lineTo(x+8,310);c.lineTo(x+55,250);c.lineTo(x+105,292);c.lineTo(x+164,235);c.lineTo(x+220,330);c.lineTo(x+238,455);c.closePath();c.fill();
        c.strokeStyle="#8edbea";c.lineWidth=7;c.stroke();c.fillStyle="#d9f8fc";for(let q=18;q<210;q+=48){c.beginPath();c.moveTo(x+q,455);c.lineTo(x+q+13,365-(q%41));c.lineTo(x+q+27,455);c.fill();}
        c.fillStyle="#82c7d8";c.beginPath();c.ellipse(x+112,455,104,18,0,0,Math.PI*2);c.fill();
        continue;
      }
      c.fillStyle = "#29495a88";
      c.fillRect(x, 250, 190, 205);
      c.fillStyle = "#173544aa";
      c.fillRect(x + 18, 275, 154, 15);
      c.strokeStyle = "#355f70";
      c.lineWidth = 7;
      c.beginPath(); c.moveTo(x + 230, 455); c.lineTo(x + 230, 155); c.lineTo(x + 410, 155); c.stroke();
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 350, 155); c.lineTo(x + 350, 245); c.stroke();
    }
    const groundSurfaces=routeSurfaces(route).filter(v=>v.kind==="ground");
    for(const g of groundSurfaces){if(frozen) frozenSurface(c,g.x,g.y,g.w,g.h,"ground");else if(magma)magmaSurface(c,g.x,g.y,g.w,g.h,"ground");else engine.drawMetal(g.x,g.y,g.w,g.h)}
    if(magma)for(const x of (route.voidEdges||[])){c.strokeStyle="#eef1e9";c.lineWidth=4;c.beginPath();c.moveTo(x,GROUND-36);c.lineTo(x,GROUND+8);c.stroke();c.fillStyle="#c8ced2";c.fillText("!",x-4,GROUND-44);}
    if(frozen)for(let x=210;x<route.length;x+=480){const top=GROUND-92;c.strokeStyle="#203944";c.lineWidth=5;c.beginPath();c.moveTo(x,top);c.lineTo(x,GROUND);c.stroke();c.fillStyle="#ffd27a";c.fillRect(x-13,top-5,26,8);const glow=c.createLinearGradient(x,top,x,top+50);glow.addColorStop(0,"#ffd98a77");glow.addColorStop(1,"#ffd98a00");c.fillStyle=glow;c.beginPath();c.moveTo(x-15,top+3);c.lineTo(x+15,top+3);c.lineTo(x+31,top+50);c.lineTo(x-31,top+50);c.closePath();c.fill();}
    for (const s of routeSurfaces(route).filter((v) => v.kind !== "ground")) {
      if(frozen) frozenSurface(c,s.x,s.y,s.w,s.h); else if(magma) magmaSurface(c,s.x,s.y,s.w,s.h); else engine.drawMetal(s.x, s.y, s.w, s.h);
      if (s.parkour === "vault" && magma) {
        c.fillStyle="#c6cbd0";c.fillRect(s.x+2,s.y+3,s.w-4,s.h-5);
        c.strokeStyle="#535b64";c.lineWidth=2;c.strokeRect(s.x+4,s.y+5,s.w-8,s.h-9);
        c.fillStyle="#f1f2e9";c.fillRect(s.x+5,s.y+7,Math.max(3,s.w*.2),s.h-14);
        c.fillStyle="#535b64";c.fillRect(s.x+s.w*.55,s.y+s.h*.45,Math.max(3,s.w*.25),5);
      } else if (s.parkour === "vault") {
        c.fillStyle = frozen?"#75b8ca":"#a86d35"; c.fillRect(s.x + 3, s.y + (frozen?18:6), s.w - 6, s.h - (frozen?21:9));
        c.strokeStyle = frozen?"#e7fbff":"#5a351f"; c.strokeRect(s.x + 4, s.y + (frozen?19:7), s.w - 8, s.h - (frozen?23:11));
        c.beginPath(); c.moveTo(s.x + 5, s.y + 9); c.lineTo(s.x + s.w - 5, s.y + s.h - 5); c.stroke();
      }
      if (s.parkour === "slide") {
        c.fillStyle = frozen?"#bdeff7":magma?"#b9b9b4":"#f2c230"; c.fillRect(s.x - 16, s.y + s.h - 7, s.w + 32, 7);
        c.fillStyle = "#17252d"; c.font = "900 10px system-ui"; c.fillText("↓", s.x + s.w / 2 - 4, s.y + s.h + 15);
      }
    }
    for(const s of route.slopes||[]){c.fillStyle="#30383f";c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.lineTo(s.x2,s.y2+100);c.lineTo(s.x1,s.y1+100);c.closePath();c.fill();c.strokeStyle="#8b98a1";c.lineWidth=3;c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.stroke()}
    for (const o of route.obstacles)
      if (o.type === "ramp") {
        const baseY=o.baseY ?? GROUND;
        c.save(); c.shadowColor = frozen?"#8eeaff":magma?"#aaa49a":"#ffd95a"; c.shadowBlur = 14; c.fillStyle = frozen?"#47778b":magma?"#464549":"#e99b22";
        c.beginPath();
        c.moveTo(o.x, baseY);
        c.lineTo(o.x + o.w, baseY - o.h);
        c.lineTo(o.x + o.w, baseY);
        c.closePath(); c.fill(); c.shadowBlur = 0; c.strokeStyle = frozen?"#effcff":magma?"#eee8dc":"#fff0a0"; c.lineWidth = magma?9:5; c.stroke();
        if(magma){c.strokeStyle="#adb5bb";c.lineWidth=2;for(let q=24;q<o.w;q+=36){c.beginPath();c.moveTo(o.x+q,baseY-5);c.lineTo(o.x+q,baseY-o.h*(q/o.w)+7);c.stroke();}}
        if(frozen){c.fillStyle="#eafaff";for(let q=18;q<o.w;q+=34)c.fillRect(o.x+q,baseY-o.h*(q/o.w)-5,22,5);}
        c.fillStyle = "#17252d"; c.font = "950 26px system-ui"; c.fillText("↗", o.x + o.w * .52, GROUND - 20); c.restore();
      } else if (o.type === "worker" && magma) {
        // Aluminized heat suit: hood, dark visor, separated gauntlets and boots.
        if(!drawNpcWorkerSprite(c,o.x,GROUND)){
          c.fillStyle="#bdc5cc";c.beginPath();c.moveTo(o.x-17,GROUND-65);c.lineTo(o.x-23,GROUND-25);c.lineTo(o.x+23,GROUND-25);c.lineTo(o.x+17,GROUND-65);c.closePath();c.fill();
          c.fillStyle="#8f9ba7";c.fillRect(o.x-13,GROUND-27,10,27);c.fillRect(o.x+3,GROUND-27,10,27);
          c.fillStyle="#e2e6e8";c.beginPath();c.arc(o.x,GROUND-72,17,0,Math.PI*2);c.fill();
          c.fillStyle="#252d3b";c.fillRect(o.x-12,GROUND-81,24,14);c.fillStyle="#a4c0cf";c.fillRect(o.x-10,GROUND-79,8,3);
          c.fillStyle="#535d6b";c.fillRect(o.x-23,GROUND-48,8,19);c.fillRect(o.x+15,GROUND-48,8,19);
        }
        if(!workerDisabled&&workerClock>1.65){c.fillStyle="#ff4f45";c.font="950 22px system-ui";c.fillText("!",o.x-3,GROUND-98);}
      } else if (o.type === "worker") {
        const baseY=o.baseY ?? GROUND;
        if(!drawNpcWorkerSprite(c,o.x,baseY)){
          c.fillStyle = frozen?"#17384b":magma?"#b8b9b5":"#243c49"; c.fillRect(o.x - (frozen?18:15), baseY - 60, frozen?36:30, 60);
          c.fillStyle = frozen?"#397ba0":magma?"#d4d1c7":"#ff8d28"; c.fillRect(o.x - 15, baseY - 48, 30, 20);
          c.fillStyle = "#fff27d"; c.fillRect(o.x - 15, baseY - 39, 30, 4);
          c.fillStyle = "#e8b486"; c.beginPath(); c.arc(o.x, baseY - 69, 11, 0, Math.PI * 2); c.fill();
          c.fillStyle = frozen?"#224e68":"#f1bb2c";c.beginPath();c.arc(o.x,baseY-76,15,Math.PI,0);c.fill();c.fillRect(o.x-15,baseY-77,30,7);
        }
        if (!workerDisabled && workerClock > 1.65) { c.fillStyle = "#ff4f45"; c.font = "950 22px system-ui"; c.fillText("!", o.x - 3, baseY - 92); }
      }
    if (!debugHideMovingPlatforms) for (const p of movingPlatforms) {
      c.save();
      c.fillStyle="#0005";c.beginPath();c.ellipse(p.x+p.w/2,GROUND-3,p.w*.48,8,0,0,Math.PI*2);c.fill();
      if (magma) {
        const center=p.x+p.w/2;c.strokeStyle="#9b9690";c.lineWidth=5;c.beginPath();c.moveTo(center,115);c.lineTo(center,p.y-4);c.stroke();
        if(p.type==="crane"){c.fillStyle="#38383c";c.beginPath();c.ellipse(center,p.y+p.h/2,p.w*.52,p.h*.72,0,0,7);c.fill();c.strokeStyle="#c3beb4";c.stroke();}
        else {c.fillStyle="#514d49";c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle="#aaa49b";c.strokeRect(p.x+2,p.y+2,p.w-4,p.h-4);}
      } else if (!frozen) {
        if(p.type==="crane"){c.strokeStyle="#c7d8df";c.lineWidth=3;c.beginPath();c.moveTo(p.x+p.w/2,115);c.lineTo(p.x+p.w/2,p.y);c.stroke();}
        c.fillStyle=p.type==="pallet"?"#91613b":"#d28a2c";c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle="#ffe190";c.strokeRect(p.x+2,p.y+2,p.w-4,p.h-4);
      } else if (p.type === "crane") {
        const center=p.x+p.w/2;
        c.strokeStyle="#dffaff";c.lineWidth=5;c.beginPath();c.moveTo(center,115);c.lineTo(center,p.y);c.stroke();
        c.fillStyle="#397b91";c.beginPath();c.arc(center,115,15,0,Math.PI*2);c.fill();c.strokeStyle="#effcff";c.lineWidth=4;c.stroke();
        frozenSurface(c,p.x,p.y,p.w,p.h,"platform");
        c.fillStyle="#75b8ca";c.fillRect(p.x+7,p.y+18,p.w-14,Math.max(2,p.h-21));
      } else {
        c.fillStyle="#6b4b38";c.fillRect(p.x,p.y+8,p.w,p.h-8);c.fillStyle="#f4fdff";c.beginPath();c.moveTo(p.x,p.y+10);for(let q=0;q<=p.w;q+=28)c.lineTo(p.x+q,p.y+2+(q/28%2)*5);c.lineTo(p.x+p.w,p.y+14);c.lineTo(p.x,p.y+14);c.closePath();c.fill();
        c.strokeStyle="#dffaff";c.lineWidth=3;c.strokeRect(p.x+2,p.y+2,p.w-4,p.h-4);
      }
      c.fillStyle=p.type==="pallet"?"#f2c84b":"#ff5148";c.font="950 18px system-ui";c.fillText(p.type==="pallet"?"↔":"!",p.x+p.w/2-8,p.y-10);
      c.restore();
    }
    for (const p of collapsing) {
      if (p.state === "ABSENT") continue;
      const y=p.y+p.fallY;
      c.save();
      if(p.state==="CONTACT_WARNING") c.translate(Math.sin(p.timer*55)*3,0);
      if(frozen) frozenSurface(c,p.x,y,p.w,p.h); else if(magma) magmaSurface(c,p.x,y,p.w,p.h); else {c.fillStyle="#596873";c.fillRect(p.x,y,p.w,p.h);}
      c.strokeStyle="#17252d";c.lineWidth=3;c.beginPath();
      c.moveTo(p.x+28,y+2);c.lineTo(p.x+70,y+16);c.lineTo(p.x+112,y+5);
      c.moveTo(p.x+166,y+3);c.lineTo(p.x+205,y+18);c.lineTo(p.x+258,y+4);c.stroke();
      c.fillStyle="#f3c54b";c.fillRect(p.x,y,p.w,4);c.restore();
    }
    for (const d of containerDoors) {
      c.save();
      if(frozen){const ice=c.createLinearGradient(d.x,d.currentY,d.x+d.w,d.currentY);ice.addColorStop(0,"#bceefa");ice.addColorStop(.5,"#397c94");ice.addColorStop(1,"#d8f8fc");c.fillStyle=ice;c.beginPath();c.moveTo(d.x-8,d.currentY+d.h);c.lineTo(d.x-3,d.currentY);c.lineTo(d.x+d.w*.34,d.currentY-15);c.lineTo(d.x+d.w*.68,d.currentY-4);c.lineTo(d.x+d.w+8,d.currentY-19);c.lineTo(d.x+d.w+8,d.currentY+d.h);c.closePath();c.fill();c.strokeStyle="#effcff";c.lineWidth=5;c.stroke();}else if(magma){c.fillStyle="#35363a";c.fillRect(d.x-10,d.currentY-15,d.w+20,d.h+15);c.strokeStyle="#a8a49b";c.lineWidth=6;c.strokeRect(d.x-6,d.currentY-10,d.w+12,d.h+8);c.fillStyle="#77736c";for(let y=d.currentY+8;y<d.currentY+d.h;y+=22)c.fillRect(d.x,y,d.w,4);}else{c.fillStyle=d.state==="PREPARING"?"#f2b632":"#324c5b";c.fillRect(d.x-8,d.currentY-12,d.w+16,d.h+12);c.fillStyle="#d7e1e5";for(let y=d.currentY+8;y<d.currentY+d.h;y+=16)c.fillRect(d.x,y,d.w,3);}
      c.strokeStyle="#ffcf45";c.lineWidth=4;c.beginPath();c.moveTo(d.x+d.w/2,d.currentY-42);c.lineTo(d.x+d.w/2,d.currentY-18);c.stroke();
      c.fillStyle=d.state==="OPEN"?"#63f2a5":d.state==="PREPARING"?"#ffd34d":"#ff5b55";c.beginPath();c.arc(d.x+d.w/2,d.currentY-49,9,0,Math.PI*2);c.fill();
      if(d.state==="PREPARING"){c.fillStyle="#ffd34d";c.beginPath();c.moveTo(d.x+18,d.currentY-18);c.lineTo(d.x+38,d.currentY-18);c.lineTo(d.x+28,d.currentY-5);c.fill();}
      c.restore();
    }
    for (const coin of route.coins)
      if (!run?.collectedCoinIds.includes(coin.id)) {
        drawCoin(c, coin);
      }
    for (const b of barrels) {
      c.strokeStyle = frozen?"#dffaff":magma?"#d4d2ca":"#5a321d";c.fillStyle = frozen?"#75bfd1":magma?"#aaa9a3":"#9e6338";c.lineWidth=3;
      if(magma){c.beginPath();c.moveTo(b.x+7,b.y);c.lineTo(b.x+21,b.y);c.lineTo(b.x+28,b.y+9);c.lineTo(b.x+28,b.y+22);c.lineTo(b.x+20,b.y+28);c.lineTo(b.x+7,b.y+28);c.lineTo(b.x,b.y+19);c.lineTo(b.x,b.y+8);c.closePath();c.fill();c.stroke();c.strokeStyle="#505c65";c.strokeRect(b.x+8,b.y+5,12,18);}else if(frozen){c.beginPath();c.moveTo(b.x+4,b.y+27);c.lineTo(b.x,b.y+10);c.lineTo(b.x+8,b.y);c.lineTo(b.x+24,b.y+3);c.lineTo(b.x+28,b.y+20);c.lineTo(b.x+20,b.y+28);c.closePath();c.fill();c.stroke();c.strokeStyle="#eefbff";c.beginPath();c.moveTo(b.x+5,b.y+8);c.lineTo(b.x+22,b.y+20);c.stroke();}else{c.beginPath();c.arc(b.x+14,b.y+14,14,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(b.x+2,b.y+14);c.lineTo(b.x+26,b.y+14);c.stroke();}
    }
    if (campaignChief?.active) {
      c.save();
      c.fillStyle="#fff2a51c";c.beginPath();c.moveTo(campaignChief.x+22,campaignChief.y+18);c.lineTo(campaignChief.x+175,campaignChief.y-28);c.lineTo(campaignChief.x+175,campaignChief.y+65);c.closePath();c.fill();
      if(magma){c.fillStyle="#8e969f";c.fillRect(campaignChief.x-4,campaignChief.y-5,34,48);c.fillStyle="#d6dadd";c.fillRect(campaignChief.x-6,campaignChief.y-14,38,22);c.fillStyle="#202a36";c.fillRect(campaignChief.x,campaignChief.y-10,26,12);c.fillStyle="#404954";c.fillRect(campaignChief.x-2,campaignChief.y+35,12,18);c.fillRect(campaignChief.x+17,campaignChief.y+35,12,18);} else if (CHIEF_SPRITE.complete && CHIEF_SPRITE.naturalWidth) {
        const fw=CHIEF_SPRITE.naturalWidth/4,fh=CHIEF_SPRITE.naturalHeight,frame=Math.floor(gameClock*8)%4;
        c.imageSmoothingEnabled=false;c.drawImage(CHIEF_SPRITE,frame*fw,0,fw,fh,campaignChief.x-8,campaignChief.y-16,48,64);
      } else { c.fillStyle="#111820";c.fillRect(campaignChief.x,campaignChief.y,campaignChief.w,campaignChief.h); }
      c.restore();
    }
    const finishY=routeGroundYAt(route.finishX);
    c.fillStyle = "#19242b";
    c.fillRect(route.finishX, finishY - 120, 16, 120);
    c.fillStyle = magma?"#bec6cc":"#79f0bc";
    c.fillRect(route.finishX + 16, finishY - 118, 88, 48);
    if(magma){c.fillStyle="#68717b";c.fillRect(route.finishX+99,finishY-120,10,120);c.strokeStyle="#eff1eb";c.lineWidth=3;c.strokeRect(route.finishX+20,finishY-113,76,38);}
    c.fillStyle = "#10252b";
    c.font = "900 15px system-ui";
    c.fillText(t("finish"), route.finishX + 28, finishY - 88);
  }
  // A5b decorative layer: no RNG, collisions, profile or simulation writes.
  function presentationNpcs() {
    const roles=[{role:"carrier",x:520,y:GROUND-125,added:true}];
    for(const o of route.obstacles){
      if(o.type==="worker")roles.push({role:"worker",x:o.x,y:(o.baseY ?? GROUND)-100,added:false});
      if(o.type==="crane")roles.push({role:"operator",x:o.x-90,y:GROUND-145,added:true});
    }
    if(campaignChief?.active)roles.push({role:"chief",x:campaignChief.x+14,y:campaignChief.y-25,added:false});
    return roles;
  }
  let npcAtlasContract=null;
  const npcAtlasImages=new Map();
  const npcAtlasReady=fetch("sprites/a5/npc-contract.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("npc contract");return r.json();}).then(async contract=>{
    await Promise.all(contract.assets.map(asset=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(image.naturalWidth!==asset.size[0]||image.naturalHeight!==asset.size[1])return reject(new Error("npc dimensions"));npcAtlasImages.set(asset.kind,image);resolve();};image.onerror=()=>reject(new Error("npc unavailable"));image.src=asset.path+"?v="+asset.cacheVersion;})));
    npcAtlasContract=contract;return true;
  }).catch(()=>false);
  function drawNpcWorkerSprite(c,x,feet){
    const image=npcAtlasImages.get("worker");
    if(workerDisabled){c.save();c.translate(x,feet-14);c.rotate(-Math.PI/2);if(npcAtlasContract&&image)c.drawImage(image,0,0,128,128,-51,-90,103,103);else{c.fillStyle="#243c49";c.fillRect(-15,-60,30,60);c.fillStyle="#ff8d28";c.fillRect(-15,-48,30,20);}c.restore();return true;}
    if(!npcAtlasContract||!image)return false;
    const thrown=workerClock<=.35&&barrels.length>0,frame=thrown?2:workerClock>1.65?1:0;
    c.drawImage(image,frame*128,0,128,128,x-51,feet-90,103,103);return true;
  }
  function drawNpcPresentation(c, react=true) {
    const colors={dock31:["#447b98","#efc467"],frozen:["#a9cedc","#e7f6fa"],magma:["#b4bbc0","#f1de8e"],aftermath:["#cc7946","#e6d6a3"]};
    const [suit,trim]=colors[profile.selectedWorldId]||colors.dock31;
    for(const n of presentationNpcs()){
      const surprised=react&&frontFlip.active&&Math.abs(player.x-n.x)<320;
      c.save();c.translate(n.x,n.y);
      if(n.added){
        // PLACEHOLDER elevated background station, outside playable surfaces.
        c.fillStyle="#25333d";c.fillRect(-27,0,64,6);c.fillRect(-24,6,3,22);c.fillRect(29,6,3,22);
        const npcImage=npcAtlasImages.get("decor"),frame=(n.role==="carrier"?0:2)+(surprised?1:0);
        if(npcAtlasContract&&npcImage)c.drawImage(npcImage,frame*64,0,64,64,-32,-56,64,64);
        else{
          c.fillStyle=suit;c.fillRect(-9,-32,18,24);c.fillRect(-9,-9,6,9);c.fillRect(3,-9,6,9);
          c.fillStyle=trim;c.fillRect(-10,-46,20,8);c.fillRect(-7,-38,14,9);c.fillRect(-8,-23,16,4);
          if(n.role==="carrier"){c.fillStyle="#a49a80";c.fillRect(6,-28,21,21);c.strokeStyle=trim;c.strokeRect(6,-28,21,21);}
          else{c.fillStyle="#293c48";c.fillRect(9,-21,20,21);c.fillStyle=trim;c.fillRect(12,-18,14,4);}
        }
      }
      if(surprised){const lift=Math.sin(Math.min(1,frontFlip.elapsed/.8)*Math.PI)*5;c.fillStyle="#e4f5ed";c.beginPath();c.ellipse(0,-61-lift,13,10,0,0,Math.PI*2);c.fill();c.fillStyle="#21313b";c.fillRect(-6,-65-lift,3,3);c.fillRect(3,-65-lift,3,3);c.strokeStyle="#21313b";c.lineWidth=2;c.beginPath();c.arc(0,-58-lift,3,0,Math.PI*2);c.stroke();}
      c.restore();
    }
  }
  function drawWorldWithNpcs(c) {
    drawWorldIntegrated(c);
    drawNpcPresentation(c);
  }
  // A5 presentation only: atlas selection never writes player/parkour state.
  let runnerAtlasContract = null;
  const runnerAtlasImages = new Map();
  const runnerAtlasReady = fetch("sprites/a5/atlas-contract.json", {cache:"no-cache"})
    .then(r=>{if(!r.ok)throw new Error("atlas contract");return r.json();})
    .then(async contract=>{
      await Promise.all(contract.assets.map(asset=>new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>{if(image.naturalWidth!==512||image.naturalHeight!==512)return reject(new Error("atlas dimensions"));runnerAtlasImages.set(asset.path,image);resolve();};
        image.onerror=()=>reject(new Error("atlas unavailable"));
        image.src=asset.path+"?v="+asset.cacheVersion;
      })));
      runnerAtlasContract=contract;return true;
    }).catch(()=>false);
  function runnerAtlasPose(state) {
    const pk=state.state;
    if(frontFlip.active){const e=frontFlip.elapsed;return {motion:"frontFlip",frame:e<.16?Math.min(1,Math.floor(e/.08)):e<.62?2+Math.min(3,Math.floor((e-.16)/.115)):6+Math.min(1,Math.floor((e-.62)/.09))};}
    if(["vault","slide","crouch","wallRun","roll","dive"].includes(pk)){const motion=pk==="crouch"?"slide":pk==="dive"?"vault":pk,duration=pk==="dive"?.46:state.duration;return {motion,frame:pk==="crouch"?7:Math.min(7,Math.floor(Math.max(0,1-state.timer/duration)*8+1e-9))};}
    const motion=pk==="stun"?"idle":!player.onGround?"jump":Math.abs(player.vx)>18?"run":"idle";
    // Existing simulation clock and velocity; render does not advance a clock.
    const frame=motion==="jump"?Math.max(0,Math.min(7,Math.floor((player.vy+560)/140))):Math.floor(gameClock*(motion==="run"?16:8))%8;
    return {motion,frame};
  }
  function drawRunnerAtlas(c, runner, outfit, pose, x, feet, facing=1, omit=null) {
    c.save();c.translate(x,feet);c.scale(facing,1);c.imageSmoothingEnabled=false;
    if(!runnerAtlasContract){c.fillStyle=runner==="female"?"#d5e3de":"#c1d2df";c.fillRect(-12,-44,24,44);c.restore();return;}
    const row=runnerAtlasContract.motions[pose.motion].row;
    const fullPath=`sprites/a5/${runner}-${outfit}-full.png`;
    const full=runnerAtlasImages.get(fullPath);
    if(full){c.drawImage(full,pose.frame*64,row*64,64,64,-32,-56,64,64);c.restore();return;}
    for(const layer of runnerAtlasContract.layerOrder){if(layer===omit)continue;
      const path=`sprites/a5/${runner}-${layer==="body"?"base":outfit}-${layer}.png`;
      c.drawImage(runnerAtlasImages.get(path),pose.frame*64,row*64,64,64,-32,-56,64,64);
    }
    c.restore();
  }
  function drawRunnerIntegrated(c,state) {
    if(debugHidePlayer)return;
    const runner=profile.runnerId||"male",outfit=profile.equippedOutfitByRunner[runner]||"default";
    const poseState=diveRun?{...state,state:"dive",timer:Math.max(0,diveRun.duration-diveRun.elapsed),duration:diveRun.duration}:state;
    drawRunnerAtlas(c,runner,outfit,runnerAtlasPose(poseState),player.x+player.w/2,player.y+player.h,player.facing);
  }
  function drawRunnerLayerIntegrated(c) { ctx=c; }
  function drawOverlayIntegrated(c, w, h) {
    ctx = c;
    renderFrameCount++;
    document.body.dataset.playerX = String(Math.round(player.x));
    c.fillStyle = "#07151dd9";
    c.fillRect(14, 14, 360, 54);
    c.fillStyle = "#fff";
    c.font = "900 14px system-ui";
    c.fillText(`${t("route")} ${routeId} · ${(["magma","aftermath"].includes(route.worldId) ? t(route.routeId) : route.name)}`, 29, 36);
    c.fillStyle = "#ffd43d";
    c.fillText(`${t("run")} ◉ ${run?.runCoins || 0}/40`, 29, 57);
    c.fillStyle = "#7cecc0";
    c.fillText(`${t("wallet")} ◉ ${profile.walletBalance}`, 180, 57);
    if (result) {
      c.fillStyle = "#06111be8";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#7cecc0";
      c.textAlign = "center";
      c.font = "950 30px system-ui";
      c.fillText(`${routeId} ${t("complete")} · +${result.amount}`, w / 2, h / 2);
      c.textAlign = "left";
    }
    syncActionVisibility();
  }
  async function init() {
    if (document.body.dataset.gameMode === "campaign") return;
    document.body.dataset.gameMode = "campaign";
    await loadProfile();
    emitGame("session_start", { language: profile.settings.language });
    engine = window.__installCampaignEngine({
      attach(api) {
        engine = api;
        player = api.player;
        keys = api.keys;
        joystick = api.joystick;
      },
      blocked: () =>
        shopOpen ||
        campaignAdPaused ||
        !!result ||
        document.getElementById("characterSelect")?.classList.contains("show"),
      length: () => route.length,
      beforePhysics: beforePhysicsIntegrated,
      update: updateIntegrated,
      drawBackground: drawBackgroundIntegrated,
      drawWorld: drawWorldWithNpcs,
      drawRunner: drawRunnerIntegrated,
      drawRunnerLayer: drawRunnerLayerIntegrated,
      drawOverlay: drawOverlayIntegrated,
      runnerPose: () => frontFlip,
    });
    installUI();
    if (DEBUG) {
      // T2-c2 segment fixture: full route reset, then canonical ground start.
      window.__tmbSegmentStart = (x) => {
        if (!Number.isFinite(x) || x < 0 || x > route.finishX) throw new RangeError('segment x');
        startRoute(routeId, true);
        engine.reset(x, route.movementProfile==="vector-v1" ? routeGroundYAt(x) - player.h : GROUND - player.h);
        player.vx = player.vy = 0;
        player.onGround = true;
        return debugState();
      };
      window.__TMB_A12__ = Object.freeze({
        getState: debugState,
        routeDefinition: (id)=>clone(ROUTES[id]),
        migrateV36: (v, p) => migrateV36(v, p),
        startRoute: (id, fresh = true, fullD06 = false) => startRoute(id, fresh, fullD06),
        placePlayer: (x,y=GROUND-player.h) => { player.x=x; player.y=y; player.vx=player.vy=0; player.onGround=false; },
        setPlayerVisible: (visible) => { debugHidePlayer = !visible; },
        setMovingPlatformsVisible: (visible) => { debugHideMovingPlatforms = !visible; },
        collectCoin: (id) => {
          const coin = route.coins.find((c) => c.id === id);
          if (coin && !run.collectedCoinIds.includes(id)) {
            run.collectedCoinIds.push(id);
            run.runCoins++;
          }
          return debugState();
        },
        finish: () => bankRun(),
        claimRewardedResult,
        syncRewardedButton,
        retry,
        openShop,
        closeShop,
        purchase: purchaseOrWear,
        purchaseWorld: purchaseOrSelectWorld,
        renderThemeFixture: (worldId,id="D01") => { if(!WORLD_REGISTRY[worldId]||!ROUTES[id])return false;profile.selectedWorldId=/^A0/.test(id)?"aftermath":"dock31";pendingWorldId=null;const started=startRoute(id);profile.selectedWorldId=worldId;return started; },
        renderWorldOnRoute: (worldId,id="D01") => { if(!WORLD_REGISTRY[worldId])return false; profile.selectedWorldId=worldId;pendingWorldId=null;return startRoute(id); },
        setShopTab: (v)=>{shopTab=v==="worlds"?"worlds":"outfits";renderShop();},
        previewWorld: (id)=>{if(WORLD_REGISTRY[id])previewWorldId=id;renderShop();return debugState();},
        setWallet: (n) => {
          profile.walletBalance = Math.max(0, n | 0);
          return persist();
        },
        setFlow: (n) => {
          flow = Math.max(0, n | 0);
          run.flowScore = flow;
          return debugState();
        },
        routeCoins: () => route.coins.map((c) => c.id),
        coinGeometry: () => ({ fillRadius: COIN_FILL_RADIUS, strokeWidth: COIN_STROKE_WIDTH, contactRadius: COIN_CONTACT_RADIUS }),
        measureCoinPixels: () => {
          const q=document.createElement("canvas");q.width=q.height=40;const c=q.getContext("2d");drawCoin(c,{x:20,y:20,skill:false});
          const d=c.getImageData(0,0,40,40).data;let radius=0;
          for(let y=0;y<40;y++)for(let x=0;x<40;x++)if(d[(y*40+x)*4+3])radius=Math.max(radius,Math.hypot(x-20,y-20));
          return radius;
        },
        coinContact: (rect, coin) => {
          const x=Math.max(rect.x,Math.min(coin.x,rect.x+rect.w)),y=Math.max(rect.y,Math.min(coin.y,rect.y+rect.h));
          return (x-coin.x)**2+(y-coin.y)**2<=COIN_CONTACT_RADIUS**2;
        },
        setLanguage: (l) => {
          const previous=profile.settings.language;
          profile.settings.language = languageFrom(l);
          applyLanguage();
          emitGame("language_change",{from:previous,to:profile.settings.language});
          return persist();
        },
        effectsGain,
        normalizeProfile: (value) => clone(normalizeProfile(value)),
        i18n: () => clone(I18N),
        analytics: () => { const detail={result:null};document.dispatchEvent(new CustomEvent("tmb:analytics-debug",{detail}));return detail.result||{capability:"LOCAL_ONLY",remote:"NOT_CONFIGURED",events:clone(telemetry),json:JSON.stringify(telemetry)}; },
        failSave: (v) => {
          saveFailure = !!v;
        },
        telemetry: () => clone(telemetry),
        aftermathProbe: (time=0,light=true,gain=1) => {
          const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');
          aftermathBackdrop(c,1280,720);drawAftermathWorld(c,light,time,gain);
          const sample=r=>Array.from(c.getImageData(...r).data);
          return {decor:aftermathDecor(),light:sample([210,338,28,12]),surface:sample([150,455,150,25]),edge:sample([150,451,150,12])};
        },
        benchmarkWorldDraw: (worldId,frames=120) => {
          const old=profile.selectedWorldId,canvas=document.createElement("canvas");canvas.width=1280;canvas.height=720;const c=canvas.getContext("2d");profile.selectedWorldId=worldId;
          const t0=performance.now();for(let i=0;i<frames;i++){drawThemeScene(c,1280,720,worldId);drawWorldIntegrated(c);}const ms=performance.now()-t0;profile.selectedWorldId=old;return ms/frames;
        },
        profile: () => clone(profile),
      });
      const originalPersist = persist;
      persist = async function () {
        if (saveFailure) {
          saveStatus = "failed";
          return false;
        }
        return originalPersist();
      };
    }
    if (profile.runnerId) {
      engine.setCharacter(RUNNERS[profile.runnerId].legacy);
      const available=profile.selectedWorldId==="aftermath"?["A04","A03","A02","A01"]:profile.selectedWorldId==="magma"?["M04","M03","M02","M01"]:profile.selectedWorldId==="frozen"?["F04","F03","F02","F01"]:["D06","D05","D04","D03","D02","D01"];
      const resumeRoute = available.find(id => profile.pendingRunsByRoute[id]&&routeUnlocked(id)) || firstRouteForWorld();
      startRoute(resumeRoute, false, resumeRoute === "D06");
    }
    openCharacterSelect();
  }
  if (document.body.dataset.engineReady === "true") init();
  else addEventListener("tmb-engine-ready", init, { once: true });
})();
