/* Trust Me Bro A1+A2 campaign layer. Keeps the v36 engine available while the
   new campaign owns profile/economy/routes. No network or embedded assets. */
(() => {
  "use strict";
  const SCHEMA = 1,
    PROFILE_KEY = "trust_me_bro_campaign_profile_v1",
    LEGACY_KEY = "trust_me_bro_last_delivery_v2_save";
  const DEBUG = location.hash.toLowerCase().includes("debug");
  const TEST_MODE_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]),
    TEST_MODE_FIRST_PARTY_HASH = 0xef25b67c;
  function testModeHostAllowed(host) {
    host = String(host || "").trim().toLowerCase().replace(/\.$/, "");
    if (TEST_MODE_LOCAL_HOSTS.has(host)) return true;
    let hash = 0x811c9dc5;
    for (const ch of host) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; }
    return hash === TEST_MODE_FIRST_PARTY_HASH;
  }
  function isNativeRuntime() {
    try { return !!window.Capacitor?.isNativePlatform?.(); }
    catch (_) { return true; }
  }
  const TEST_MODE =
    new URLSearchParams(location.search).get("test") === "hepsi" &&
    testModeHostAllowed(location.hostname) &&
    !isNativeRuntime();
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
    male: { id: "male", legacy: 0, price: 0, outfitLocked: false, labelKey: "male" },
    female: { id: "female", legacy: 2, price: 0, outfitLocked: false, labelKey: "female" },
    tall: { id: "tall", legacy: 0, price: 300, outfitLocked: true, labelKey: "tall" },
    compact: { id: "compact", legacy: 2, price: 300, outfitLocked: true, labelKey: "compact" },
    bruiser: { id: "bruiser", legacy: 0, price: 500, outfitLocked: true, labelKey: "bruiser" },
    athlete: { id: "athlete", legacy: 2, price: 500, outfitLocked: true, labelKey: "athlete" },
  });
  const OUTFITS = Object.freeze({
    default: { id: "default", price: 0 },
    dockCrew: { id: "dockCrew", price: 40 },
    nightShift: { id: "nightShift", price: 240 },
    hazardRunner: { id: "hazardRunner", price: 360 },
    ronin: { id: "ronin", price: 500 },
    shadowNinja: { id: "shadowNinja", price: 650 },
    orbitAstronaut: { id: "orbitAstronaut", price: 800 },
    northRaider: { id: "northRaider", price: 1000 },
    mechaPilot: { id: "mechaPilot", price: 1500 },
  });
  const CHIEFS = Object.freeze({
    securityTall: { id: "securityTall", price: 0, labelKey: "securityTall" },
    classicChief: { id: "classicChief", price: 200, labelKey: "classicChief" },
    robotGuard: { id: "robotGuard", price: 400, labelKey: "robotGuard" },
    bouncer: { id: "bouncer", price: 600, labelKey: "bouncer" },
  });
  const WORLD_REGISTRY = Object.freeze({
    dock31: { id: "dock31", themeId: "dock", price: 0, enabled: true, routes: ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18"] },
    frozen: { id: "frozen", themeId: "frozen", price: 160, enabled: true, routes: ["F01", "F02", "F03", "F04", "F05", "F06"] },
    magma: { id: "magma", themeId: "magma", price: 200, enabled: true, routes: ["M01", "M02", "M03", "M04", "M05", "M06"] },
    aftermath: { id: "aftermath", themeId: "aftermath", price: 500, enabled: true, routes: ["A01", "A02", "A03", "A04", "A05", "A06"] },
  });
  let pendingWorldId = null, activeWorldCacheKey = "";
  const magmaBackdropCache = new Map();
  const frozenBackdropCache = new Map();
  const worldSurfaceCache = new Map();
  let renderSignatures = { deckStripe:0, dock31Text:0, containerBlock:0, dockCrane:0, loadingCorridor:0, foregroundLampGroundGap:0 }, renderFrameCount = 0;
  const I18N = Object.freeze({
    en: {
      M01: "FOUNDRY WALK", M02: "CASTING CRANE", M03: "FURNACE AISLE", M04: "MAGMA LIFT", M05: "SLAG BRIDGE", M06: "CORE MELT",
      A01: "BROKEN RECEIVING", A02: "EMERGENCY CARGO", A03: "LAST COURIER", A04: "FINAL DISPATCH", A05: "COLLAPSED PIER", A06: "FINAL ESCAPE",
      choose: "CHOOSE YOUR RUNNER",
      male: "MALE RUNNER",
      female: "FEMALE RUNNER",
      tall: "BEANPOLE",
      compact: "POCKET",
      bruiser: "BRUISER",
      athlete: "ATHLETE",
      characters: "CHARACTERS",
      chiefs: "CHIEFS",
      securityTall: "SECURITY",
      classicChief: "OLD CHIEF",
      robotGuard: "ROBO GUARD",
      bouncer: "BOUNCER",
      route: "ROUTE",
      run: "RUN",
      wallet: "WALLET",
      shop: "SHOP",
      locked: "LOCK",
      outfits: "OUTFITS",
      buy: "BUY & WEAR — {price}",
      wear: "WEAR",
      worn: "WORN",
      preview: "LIVE PREVIEW",
      next: "NEXT LEVEL",
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
      ronin: "Ronin",
      shadowNinja: "Shadow Ninja",
      orbitAstronaut: "Astronaut",
      northRaider: "North Raider",
      mechaPilot: "Mecha Pilot",
      saveFailed: "SAVE FAILED — RETRY",
      noCharge: "LIVE PREVIEW · NO CHARGE",
      worlds: "WORLDS", buyWorld: "BUY — {price}", select: "SELECT", selected: "SELECTED", planned: "PLANNED", insufficient: "INSUFFICIENT COINS",
      idle: "IDLE", motionRun: "RUN", flip: "FLIP", language: "LANGUAGE", samePhysics: "Same physics. Shared wallet. Your runner.", ghostOn: "GHOST ON", ghostOff: "GHOST OFF", effectsFull: "EFFECTS FULL", effectsReduced: "EFFECTS REDUCED", flow: "FLOW", localBest: "LOCAL BEST", newRecord: "NEW", clean: "CLEAN", mastery: "MASTERY", style: "STYLE", pausedTap: "PAUSED - TAP TO RESUME", parcelForYou: "DELIVERY FOR: YOU", close: "CLOSE", back: "BACK", touchMove: "DRAG = MOVE", touchJump: "TAP = JUMP", exit: "EXIT", closed: "CLOSED", worldDock31: "DOCK 31", worldFrozen: "FROZEN", worldMagma: "MAGMA", worldAftermath: "AFTERMATH",
    },
    tr: {
      M01: "DÖKÜMHANE YOLU", M02: "DÖKÜM VİNCİ", M03: "FIRIN KORİDORU", M04: "MAGMA ASANSÖRÜ", M05: "CÜRUF KÖPRÜSÜ", M06: "ÇEKİRDEK ERİMESİ",
      A01: "HASARLI KABUL", A02: "ACİL DURUM YÜKÜ", A03: "SON KURYE", A04: "SON SEVKİYAT", A05: "ÇÖKMÜŞ İSKELE", A06: "SON KAÇIŞ",
      choose: "KOŞUCUNU SEÇ",
      male: "ERKEK KOŞUCU",
      female: "KADIN KOŞUCU",
      tall: "UZUN",
      compact: "KISA",
      bruiser: "İRİ",
      athlete: "ATLET",
      characters: "KARAKTERLER",
      chiefs: "ŞEFLER",
      securityTall: "GÜVENLİK",
      classicChief: "ESKİ ŞEF",
      robotGuard: "ROBOT GÜVENLİK",
      bouncer: "FEDAİ",
      route: "ROTA",
      run: "KOŞU",
      wallet: "CÜZDAN",
      shop: "MAĞAZA",
      locked: "KİLİT",
      outfits: "KIYAFETLER",
      buy: "SATIN AL VE GİY — {price}",
      wear: "GİY",
      worn: "GİYİLİ",
      preview: "CANLI ÖNİZLEME",
      next: "SONRAKİ BÖLÜM",
      retry: "YENİDEN DENE",
      earned: "KAZANÇ",
      goals: "HEDEFLER",
      record: "REKOR FARKI",
      first: "İLK TAMAMLAMA",
      finish: "BİTİŞ",
      safe: "GÜVENLİ HAT",
      skill: "BECERİ HATTI",
      checkpoint: "KONTROL NOKTASI",
      help: "A/D veya ←/→ • BOŞLUK/W/↑ • R yeniden başlat",
      complete: "TAMAMLANDI",
      defaultOutfit: "VARSAYILAN KURYE",
      dockCrew: "LİMAN EKİBİ · BARET + YELEK",
      nightShift: "GECE VARDİYASI",
      hazardRunner: "TEHLİKE KOŞUCUSU",
      ronin: "RONİN",
      shadowNinja: "GÖLGE NİNJA",
      orbitAstronaut: "ASTRONOT",
      northRaider: "KUZEY AKINCISI",
      mechaPilot: "MECHA PİLOT",
      saveFailed: "KAYIT BAŞARISIZ — YENİDEN DENE",
      noCharge: "CANLI ÖNİZLEME · ÜCRETSİZ",
      worlds: "DÜNYALAR", buyWorld: "SATIN AL — {price}", select: "SEÇ", selected: "SEÇİLİ", planned: "PLANLANDI", insufficient: "Yetersiz jeton",
      idle: "BEKLE", motionRun: "KOŞ", flip: "TAKLA", language: "DİL", samePhysics: "Aynı fizik. Ortak cüzdan. Senin koşucun.", ghostOn: "HAYALET AÇIK", ghostOff: "HAYALET KAPALI", effectsFull: "EFEKTLER TAM", effectsReduced: "EFEKTLER AZALTILDI", flow: "AKIŞ", localBest: "YEREL EN İYİ", newRecord: "YENİ", clean: "TEMİZ", mastery: "USTALIK", style: "STİL", pausedTap: "DURAKLATILDI - DEVAM ETMEK İÇİN DOKUN", parcelForYou: "TESLİMAT: SEN", close: "KAPAT", back: "GERİ", touchMove: "SÜRÜKLE = HAREKET", touchJump: "DOKUN = ZIPLA", exit: "ÇIKIŞ", closed: "KAPANDI", worldDock31: "RIHTIM 31", worldFrozen: "DONMUŞ", worldMagma: "MAGMA DİYARI", worldAftermath: "SONRASI",
    },
    ru: {
      M01: "ЛИТЕЙНЫЙ ПУТЬ", M02: "ЛИТЕЙНЫЙ КРАН", M03: "ПЕЧНОЙ ПРОХОД", M04: "МАГМОВЫЙ ЛИФТ", M05: "ШЛАКОВЫЙ МОСТ", M06: "РАСПЛАВ ЯДРА",
      A01: "ПОВРЕЖДЁННАЯ ПРИЁМКА", A02: "АВАРИЙНЫЙ ГРУЗ", A03: "ПОСЛЕДНИЙ КУРЬЕР", A04: "ФИНАЛЬНАЯ ОТПРАВКА", A05: "РУХНУВШИЙ ПИРС", A06: "ПОСЛЕДНИЙ ПОБЕГ",
      choose: "ВЫБЕРИ БЕГУНА",
      male: "МУЖСКОЙ БЕГУН",
      female: "ЖЕНСКИЙ БЕГУН",
      tall: "ДЛИННЫЙ",
      compact: "МАЛЫШ",
      bruiser: "ГРОМИЛА",
      athlete: "АТЛЕТ",
      characters: "ПЕРСОНАЖИ",
      chiefs: "ШЕФЫ",
      securityTall: "ОХРАННИК",
      classicChief: "СТАРЫЙ ШЕФ",
      robotGuard: "РОБОТ-ОХРАННИК",
      bouncer: "ВЫШИБАЛА",
      route: "МАРШРУТ",
      run: "ЗАБЕГ",
      wallet: "КОШЕЛЁК",
      shop: "МАГАЗИН",
      locked: "ЗАКРЫТО",
      outfits: "КОСТЮМЫ",
      buy: "КУПИТЬ И НАДЕТЬ — {price}",
      wear: "НАДЕТЬ",
      worn: "НАДЕТО",
      preview: "ПРИМЕРКА",
      next: "СЛЕДУЮЩИЙ УРОВЕНЬ",
      retry: "ЕЩЁ РАЗ",
      earned: "НАГРАДА",
      goals: "ЦЕЛИ",
      record: "РАЗНИЦА РЕКОРДА",
      first: "ПЕРВОЕ ПРОХОЖДЕНИЕ",
      finish: "ФИНИШ",
      safe: "БЕЗОПАСНЫЙ ПУТЬ",
      skill: "ЛИНИЯ МАСТЕРСТВА",
      checkpoint: "КОНТРОЛЬНАЯ ТОЧКА",
      help: "A/D или ←/→ • ПРОБЕЛ/W/↑ • R заново",
      complete: "ЗАВЕРШЁН",
      defaultOutfit: "ОБЫЧНЫЙ КУРЬЕР",
      dockCrew: "ПОРТОВАЯ БРИГАДА · КАСКА + ЖИЛЕТ",
      nightShift: "НОЧНАЯ СМЕНА",
      hazardRunner: "ОПАСНЫЙ БЕГУН",
      ronin: "РОНИН",
      shadowNinja: "ТЕНЕВОЙ НИНДЗЯ",
      orbitAstronaut: "АСТРОНАВТ",
      northRaider: "СЕВЕРНЫЙ НАЛЁТЧИК",
      mechaPilot: "ПИЛОТ МЕХА",
      saveFailed: "ОШИБКА СОХРАНЕНИЯ — ПОВТОРИТЬ",
      noCharge: "ЖИВОЙ ПРОСМОТР · БЕСПЛАТНО",
      worlds: "МИРЫ", buyWorld: "КУПИТЬ — {price}", select: "ВЫБРАТЬ", selected: "ВЫБРАНО", planned: "ЗАПЛАНИРОВАНО", insufficient: "НЕДОСТАТОЧНО МОНЕТ",
      idle: "ОЖИДАНИЕ", motionRun: "БЕГ", flip: "САЛЬТО", language: "ЯЗЫК", samePhysics: "Та же физика. Общий кошелёк. Твой бегун.", ghostOn: "ПРИЗРАК ВКЛ", ghostOff: "ПРИЗРАК ВЫКЛ", effectsFull: "ЭФФЕКТЫ ПОЛНЫЕ", effectsReduced: "ЭФФЕКТЫ СНИЖЕНЫ", flow: "ПОТОК", localBest: "ЛУЧШИЙ РЕЗУЛЬТАТ", newRecord: "НОВЫЙ", clean: "ЧИСТО", mastery: "МАСТЕРСТВО", style: "СТИЛЬ", pausedTap: "ПАУЗА - КОСНИСЬ, ЧТОБЫ ПРОДОЛЖИТЬ", parcelForYou: "ДОСТАВКА: ТЕБЕ", close: "ЗАКРЫТЬ", back: "НАЗАД", touchMove: "ТЯНИ = ХОД", touchJump: "КАСАНИЕ = ПРЫЖОК", exit: "ВЫХОД", closed: "ЗАКРЫТО", worldDock31: "ДОК 31", worldFrozen: "МОРОЗ", worldMagma: "МАГМА", worldAftermath: "ПОСЛЕДСТВИЯ",
    },
  });
  for (const lang of ["tr", "ru"]) for (const key of Object.keys(I18N.en)) if (!Object.hasOwn(I18N[lang], key)) I18N[lang][key] = I18N.en[key];
  const ROUTE_NAME_I18N = Object.freeze({
    en: Object.freeze({
      D01:"FIRST SHIFT",D02:"BARREL DELIVERY",D03:"CRANE CROSSING",D04:"ROOFTOP SHORTCUT",D05:"CLEAN CHAIN",D06:"SHIFT SUPERVISOR",D07:"NIGHT GANTRY",D08:"REEFER ROW",D09:"BERTH SEVEN",D10:"STACK RUNNER",D11:"HARBOR ROOFS",D12:"QUAY SPRINT",D13:"BOLLARD LINE",D14:"CUSTOMS YARD",D15:"DRY DOCK",D16:"PILOT TOWER",D17:"TWIN CRANES",D18:"LAST MANIFEST",
      F01:"NIGHT SHIFT",F02:"COLD STORAGE",F03:"BLACK ICE",F04:"ZERO VISIBILITY",F05:"WHITEOUT RUN",F06:"GLACIER GATE",M01:"FOUNDRY WALK",M02:"CASTING CRANE",M03:"FURNACE AISLE",M04:"MAGMA LIFT",M05:"SLAG BRIDGE",M06:"CORE MELT",A01:"BROKEN RECEIVING",A02:"EMERGENCY CARGO",A03:"LAST COURIER",A04:"FINAL DISPATCH",A05:"COLLAPSED PIER",A06:"FINAL ESCAPE",
    }),
    tr: Object.freeze({
      D01:"\u0130LK VARD\u0130YA",D02:"VAR\u0130L TESL\u0130MATI",D03:"V\u0130N\u00c7 GE\u00c7\u0130\u015e\u0130",D04:"\u00c7ATI KEST\u0130RMES\u0130",D05:"TEM\u0130Z Z\u0130NC\u0130R",D06:"VARD\u0130YA \u015eEF\u0130",D07:"GECE V\u0130NC\u0130",D08:"SO\u011eUTUCU SIRASI",D09:"YED\u0130NC\u0130 RIHTIM",D10:"KONTEYNER KO\u015eUSU",D11:"L\u0130MAN \u00c7ATILARI",D12:"RIHTIM SPRINT\u0130",D13:"BABA HATTI",D14:"G\u00dcMR\u00dcK SAHASI",D15:"KURU HAVUZ",D16:"P\u0130LOT KULES\u0130",D17:"\u00c7\u0130FT V\u0130N\u00c7",D18:"SON MAN\u0130FESTO",
      F01:"GECE VARD\u0130YASI",F02:"SO\u011eUK DEPO",F03:"S\u0130YAH BUZ",F04:"SIFIR G\u00d6R\u00dc\u015e",F05:"T\u0130P\u0130 KO\u015eUSU",F06:"BUZUL KAPISI",M01:"D\u00d6K\u00dcMHANE YOLU",M02:"D\u00d6K\u00dcM V\u0130NC\u0130",M03:"FIRIN KOR\u0130DORU",M04:"MAGMA ASANS\u00d6R\u00dc",M05:"C\u00dcRUF K\u00d6PR\u00dcS\u00dc",M06:"\u00c7EK\u0130RDEK ER\u0130MES\u0130",A01:"HASARLI KABUL",A02:"AC\u0130L DURUM Y\u00dcK\u00dc",A03:"SON KURYE",A04:"SON SEVK\u0130YAT",A05:"\u00c7\u00d6KM\u00dc\u015e \u0130SKELE",A06:"SON KA\u00c7I\u015e",
    }),
    ru: Object.freeze({
      D01:"\u041f\u0415\u0420\u0412\u0410\u042f \u0421\u041c\u0415\u041d\u0410",D02:"\u0414\u041e\u0421\u0422\u0410\u0412\u041a\u0410 \u0411\u041e\u0427\u0415\u041a",D03:"\u041f\u0415\u0420\u0415\u0425\u041e\u0414 \u041a\u0420\u0410\u041d\u0410",D04:"\u0421\u0420\u0415\u0417 \u041f\u041e \u041a\u0420\u042b\u0428\u0415",D05:"\u0427\u0418\u0421\u0422\u0410\u042f \u0426\u0415\u041f\u042c",D06:"\u041d\u0410\u0427\u0410\u041b\u042c\u041d\u0418\u041a \u0421\u041c\u0415\u041d\u042b",D07:"\u041d\u041e\u0427\u041d\u041e\u0419 \u041a\u0420\u0410\u041d",D08:"\u0420\u042f\u0414 \u0420\u0415\u0424\u0420\u0418\u0416\u0415\u0420\u0410\u0422\u041e\u0420\u041e\u0412",D09:"\u0421\u0415\u0414\u042c\u041c\u041e\u0419 \u041f\u0420\u0418\u0427\u0410\u041b",D10:"\u0411\u0415\u0413 \u041f\u041e \u0428\u0422\u0410\u0411\u0415\u041b\u042f\u041c",D11:"\u041a\u0420\u042b\u0428\u0418 \u0413\u0410\u0412\u0410\u041d\u0418",D12:"\u0421\u041f\u0420\u0418\u041d\u0422 \u041f\u041e \u041d\u0410\u0411\u0415\u0420\u0415\u0416\u041d\u041e\u0419",D13:"\u041b\u0418\u041d\u0418\u042f \u0422\u0423\u041c\u0411",D14:"\u0422\u0410\u041c\u041e\u0416\u0415\u041d\u041d\u042b\u0419 \u0414\u0412\u041e\u0420",D15:"\u0421\u0423\u0425\u041e\u0419 \u0414\u041e\u041a",D16:"\u041b\u041e\u0426\u041c\u0410\u041d\u0421\u041a\u0410\u042f \u0411\u0410\u0428\u041d\u042f",D17:"\u0414\u0412\u0410 \u041a\u0420\u0410\u041d\u0410",D18:"\u041f\u041e\u0421\u041b\u0415\u0414\u041d\u0418\u0419 \u041c\u0410\u041d\u0418\u0424\u0415\u0421\u0422",
      F01:"\u041d\u041e\u0427\u041d\u0410\u042f \u0421\u041c\u0415\u041d\u0410",F02:"\u0425\u041e\u041b\u041e\u0414\u041d\u042b\u0419 \u0421\u041a\u041b\u0410\u0414",F03:"\u0427\u0415\u0420\u041d\u042b\u0419 \u041b\u0415\u0414",F04:"\u041d\u0423\u041b\u0415\u0412\u0410\u042f \u0412\u0418\u0414\u0418\u041c\u041e\u0421\u0422\u042c",F05:"\u0411\u0415\u0413 \u0412 \u041c\u0415\u0422\u0415\u041b\u042c",F06:"\u0412\u041e\u0420\u041e\u0422\u0410 \u041b\u0415\u0414\u041d\u0418\u041a\u0410",M01:"\u041b\u0418\u0422\u0415\u0419\u041d\u042b\u0419 \u041f\u0423\u0422\u042c",M02:"\u041b\u0418\u0422\u0415\u0419\u041d\u042b\u0419 \u041a\u0420\u0410\u041d",M03:"\u041f\u0415\u0427\u041d\u041e\u0419 \u041f\u0420\u041e\u0425\u041e\u0414",M04:"\u041c\u0410\u0413\u041c\u041e\u0412\u042b\u0419 \u041b\u0418\u0424\u0422",M05:"\u0428\u041b\u0410\u041a\u041e\u0412\u042b\u0419 \u041c\u041e\u0421\u0422",M06:"\u0420\u0410\u0421\u041f\u041b\u0410\u0412 \u042f\u0414\u0420\u0410",A01:"\u041f\u041e\u0412\u0420\u0415\u0416\u0414\u0415\u041d\u041d\u0410\u042f \u041f\u0420\u0418\u0415\u041c\u041a\u0410",A02:"\u0410\u0412\u0410\u0420\u0418\u0419\u041d\u042b\u0419 \u0413\u0420\u0423\u0417",A03:"\u041f\u041e\u0421\u041b\u0415\u0414\u041d\u0418\u0419 \u041a\u0423\u0420\u042c\u0415\u0420",A04:"\u0424\u0418\u041d\u0410\u041b\u042c\u041d\u0410\u042f \u041e\u0422\u041f\u0420\u0410\u0412\u041a\u0410",A05:"\u0420\u0423\u0425\u041d\u0423\u0412\u0428\u0418\u0419 \u041f\u0418\u0420\u0421",A06:"\u041f\u041e\u0421\u041b\u0415\u0414\u041d\u0418\u0419 \u041f\u041e\u0411\u0415\u0413",
    }),
  });
  const COINS = Object.freeze({    "A03": [{"n":0,"move_id":"a03-p1-d10-dz-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"A03-c01"},{"n":1,"move_id":"a03-p1-d10-dz-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"A03-c02"},{"n":2,"move_id":"a03-p1-d10-dz-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"A03-c03"},{"n":3,"move_id":"a03-p1-d10-dz-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"A03-c04"},{"n":4,"move_id":"a03-p1-d10-v-07","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"A03-c05"},{"n":5,"move_id":"a03-p1-d10-dz-03","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"A03-c06"},{"n":6,"move_id":"a03-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A03-c07"},{"n":7,"move_id":"a03-p3-d13-dz-01","kind":"CJ","x":7402.68,"y":-146.62,"skill":false,"id":"A03-c08"},{"n":8,"move_id":"a03-p3-d13-slope1-2","kind":"CC","x":7583.68,"y":-113.62,"skill":true,"id":"A03-c09"},{"n":9,"move_id":"a03-p3-d13-slope1-3","kind":"CC","x":7646.28,"y":-114.24,"skill":true,"id":"A03-c10"},{"n":10,"move_id":"a03-p3-d13-slope1-3","kind":"CC","x":7646.28,"y":-114.24,"skill":true,"id":"A03-c11"},{"n":11,"move_id":"a03-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A03-c12"},{"n":12,"move_id":"a03-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A03-c13"},{"n":13,"move_id":"a03-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A03-c14"}],
    "A04": [{"n":0,"move_id":"a04-p1-d10-dz-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"A04-c01"},{"n":1,"move_id":"a04-p1-d10-dz-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"A04-c02"},{"n":2,"move_id":"a04-p1-d10-dz-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"A04-c03"},{"n":3,"move_id":"a04-p1-d10-dz-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"A04-c04"},{"n":4,"move_id":"a04-p1-d10-v-07","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"A04-c05"},{"n":5,"move_id":"a04-p1-d10-dz-03","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"A04-c06"},{"n":6,"move_id":"a04-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A04-c07"},{"n":7,"move_id":"a04-p2-d17-mix-01","kind":"CJ","x":4801.48,"y":-62.62,"skill":false,"id":"A04-c08"},{"n":8,"move_id":"a04-p2-d17-mix-02","kind":"CJ","x":5325.48,"y":-36.62,"skill":false,"id":"A04-c09"},{"n":9,"move_id":"a04-p2-d17-mix-03","kind":"CC","x":5781.12,"y":69.38,"skill":true,"id":"A04-c10"},{"n":10,"move_id":"a04-p2-d17-mix-04","kind":"CC","x":5781.12,"y":69.38,"skill":true,"id":"A04-c11"},{"n":11,"move_id":"a04-p2-d17-mix-05","kind":"CC","x":5781.12,"y":69.38,"skill":true,"id":"A04-c12"},{"n":12,"move_id":"a04-p2-d17-mix-07","kind":"CJ","x":6490.48,"y":36.38,"skill":false,"id":"A04-c13"},{"n":13,"move_id":"a04-p2-d17-mix-08","kind":"CJ","x":6806.48,"y":119.76,"skill":false,"id":"A04-c14"}],
    "A01": [{"n":0,"move_id":"a01-dz-01","kind":"CJ","x":527,"y":207,"skill":false},{"n":1,"move_id":"a01-dz-02","kind":"CJ","x":1038,"y":88,"skill":false},{"n":2,"move_id":"a01-dz-03","kind":"CJ","x":2244,"y":256,"skill":false},{"n":3,"move_id":"a01-dz-04","kind":"CJ","x":2722,"y":113,"skill":false},{"n":4,"move_id":"a01-dz-05","kind":"CJ","x":4643,"y":38,"skill":false},{"n":5,"move_id":"a01-dz-06","kind":"CJ","x":6049,"y":152,"skill":false},{"n":6,"move_id":"a01-dz-07","kind":"CJ","x":7835,"y":219,"skill":false},{"n":7,"move_id":"a01-slide-01","kind":"CS","x":680,"y":310,"skill":true},{"n":8,"move_id":"a01-slide-02","kind":"CS","x":1620,"y":290,"skill":true},{"n":9,"move_id":"a01-slide-04","kind":"CS","x":3480,"y":170,"skill":true},{"n":10,"move_id":"a01-v-02","kind":"CC","x":250,"y":312.25,"skill":true},{"n":11,"move_id":"a01-v-14","kind":"CC","x":2506,"y":294.25,"skill":true},{"n":12,"move_id":"a01-v-16","kind":"CC","x":2822.8,"y":219.75,"skill":true},{"n":13,"move_id":"a01-v-17","kind":"CC","x":2938.7999999999997,"y":198.25,"skill":true}],
    "A02": [{"n":0,"move_id":"a02-dz-01","kind":"CJ","x":1037,"y":-1502,"skill":false},{"n":1,"move_id":"a02-dz-02","kind":"CJ","x":1838,"y":-1494,"skill":false},{"n":2,"move_id":"a02-dz-03","kind":"CJ","x":2964,"y":-870,"skill":false},{"n":3,"move_id":"a02-dz-04","kind":"CJ","x":3417,"y":-884,"skill":false},{"n":4,"move_id":"a02-dz-05","kind":"CJ","x":3719,"y":-909,"skill":false},{"n":5,"move_id":"a02-dz-06","kind":"CJ","x":4196,"y":-1106.25,"skill":false},{"n":6,"move_id":"a02-vault-02","kind":"CS","x":5085.84,"y":-806.25,"skill":true},{"n":7,"move_id":"a02-vault-03","kind":"CS","x":4926,"y":-806.25,"skill":true},{"n":8,"move_id":"a02-vault-05","kind":"CS","x":4916.4,"y":-806.25,"skill":true},{"n":9,"move_id":"a02-v-06","kind":"CC","x":2650,"y":-945,"skill":true},{"n":10,"move_id":"a02-v-08","kind":"CC","x":2956.8,"y":-884.25,"skill":true},{"n":11,"move_id":"a02-v-09","kind":"CC","x":3050,"y":-920,"skill":true},{"n":12,"move_id":"a02-v-10","kind":"CC","x":3424,"y":-913,"skill":true},{"n":13,"move_id":"a02-v-12","kind":"CC","x":3727.6,"y":-934.625,"skill":true}],
    "M04": [{"n":0,"move_id":"m04-dz-01","kind":"CJ","x":1686,"y":127,"skill":false},{"n":1,"move_id":"m04-dz-02","kind":"CJ","x":2336,"y":48,"skill":false},{"n":2,"move_id":"m04-dz-03","kind":"CJ","x":2782,"y":-104,"skill":false},{"n":3,"move_id":"m04-dz-04","kind":"CJ","x":3870,"y":-105,"skill":false},{"n":4,"move_id":"m04-dz-05","kind":"CJ","x":4765,"y":62,"skill":false},{"n":5,"move_id":"m04-dz-06","kind":"CJ","x":7690,"y":260,"skill":false},{"n":6,"move_id":"m04-dz-07","kind":"CJ","x":8626,"y":235,"skill":false},{"n":7,"move_id":"m04-v-06","kind":"CC","x":1009.6,"y":207.375,"skill":true},{"n":8,"move_id":"m04-slope1-2","kind":"CC","x":1840,"y":160,"skill":true},{"n":9,"move_id":"m04-slope1-3","kind":"CC","x":1904.3999999999999,"y":160.75,"skill":true},{"n":10,"move_id":"m04-v-11","kind":"CC","x":2095.6,"y":85.375,"skill":true},{"n":11,"move_id":"m04-v-16","kind":"CC","x":2867.2,"y":6.25,"skill":true},{"n":12,"move_id":"m04-slide-01","kind":"CS","x":1168.56,"y":195.375,"skill":true},{"n":13,"move_id":"m04-slide-02","kind":"CS","x":2750,"y":-80,"skill":true}],
    "M03": [{"n":0,"move_id":"m03-dz-01","kind":"CJ","x":319,"y":-373,"skill":false},{"n":1,"move_id":"m03-dz-02","kind":"CJ","x":772,"y":-445,"skill":false},{"n":2,"move_id":"m03-dz-03","kind":"CJ","x":1190,"y":-390,"skill":false},{"n":3,"move_id":"m03-dz-04","kind":"CJ","x":1536,"y":-528,"skill":false},{"n":4,"move_id":"m03-dz-05","kind":"CJ","x":2778,"y":-155,"skill":false},{"n":5,"move_id":"m03-dz-06","kind":"CJ","x":3904.4,"y":99.75,"skill":false},{"n":6,"move_id":"m03-dz-07","kind":"CJ","x":4501,"y":14,"skill":false},{"n":7,"move_id":"m03-slope1-2","kind":"CC","x":500,"y":-340,"skill":true},{"n":8,"move_id":"m03-slope1-3","kind":"CC","x":562.6,"y":-340.625,"skill":true},{"n":9,"move_id":"m03-v-07","kind":"CC","x":1198,"y":-415,"skill":true},{"n":10,"move_id":"m03-v-14","kind":"CC","x":3596.8,"y":78.25,"skill":true},{"n":11,"move_id":"m03-slide-02","kind":"CS","x":1400,"y":-415,"skill":true},{"n":12,"move_id":"m03-slide-03","kind":"CS","x":4400,"y":-20,"skill":true},{"n":13,"move_id":"m03-slide-04","kind":"CS","x":5580,"y":114,"skill":true}],
    "M01": [{"id":"M01-c01","type":"CJ","move_id":"m01-dz-01","x":488,"y":-963},{"id":"M01-c02","type":"CJ","move_id":"m01-dz-02","x":1456,"y":-1140},{"id":"M01-c03","type":"CJ","move_id":"m01-dz-03","x":1999,"y":-1122},{"id":"M01-c04","type":"CJ","move_id":"m01-dz-04","x":2388,"y":-1144},{"id":"M01-c05","type":"CJ","move_id":"m01-dz-05","x":2861,"y":-921},{"id":"M01-c06","type":"CJ","move_id":"m01-dz-06","x":3842,"y":-852},{"id":"M01-c07","type":"CJ","move_id":"m01-dz-07","x":4821.2,"y":-943.25},{"id":"M01-c08","type":"CJ","move_id":"m01-dz-08","x":6085,"y":-486},{"id":"M01-c09","type":"CC","move_id":"m01-v-03","x":715.6,"y":-1015.25},{"id":"M01-c10","type":"CC","move_id":"m01-v-06","x":1544.8,"y":-1028.5},{"id":"M01-c11","type":"CC","move_id":"m01-deadend-i11-step-1","x":2374.8,"y":-1169.625},{"id":"M01-c12","type":"CC","move_id":"m01-deadend-i11-step-2","x":2410.8,"y":-1240.125},{"id":"M01-c13","type":"CS","move_id":"m01-vault-06","x":1136.4,"y":-979.25},{"id":"M01-c14","type":"CS","move_id":"m01-vault-08","x":5266.8,"y":-445}],
    "M02": [{"id":"M02-c01","type":"CJ","move_id":"m02-dz-01","x":408,"y":-402},{"id":"M02-c02","type":"CJ","move_id":"m02-dz-02","x":870,"y":-380},{"id":"M02-c03","type":"CJ","move_id":"m02-dz-03","x":1203,"y":-570},{"id":"M02-c04","type":"CJ","move_id":"m02-dz-04","x":2028,"y":-419},{"id":"M02-c05","type":"CJ","move_id":"m02-dz-07","x":4498,"y":-22},{"id":"M02-c06","type":"CJ","move_id":"m02-dz-06","x":3328,"y":-212},{"id":"M02-c07","type":"CC","move_id":"m02-v-03","x":496,"y":-290.25},{"id":"M02-c08","type":"CC","move_id":"m02-v-04","x":620.8,"y":-347.75},{"id":"M02-c09","type":"CC","move_id":"m02-v-06","x":1050.4,"y":-370.625},{"id":"M02-c10","type":"CC","move_id":"m02-v-17","x":3418.24,"y":-99.375},{"id":"M02-c11","type":"CC","move_id":"m02-v-08","x":1303.6,"y":-464.25},{"id":"M02-c12","type":"CC","move_id":"m02-v-13","x":2258.8,"y":-381.375},{"id":"M02-c13","type":"CS","move_id":"m02-slide-01","x":3113.89,"y":-22},{"id":"M02-c14","type":"CS","move_id":"m02-vault-03","x":114,"y":-268.625}],
    "D01": [{"n":0,"move_id":"d01-t1b-platform-2","kind":"CC","x":1200,"y":350,"skill":true},{"n":1,"move_id":"d01-vault","kind":"CJ","x":1600,"y":355,"skill":false},{"n":2,"move_id":"d01-t1b-vault-5","kind":"CJ","x":2230,"y":355,"skill":false},{"n":3,"move_id":"d01-t1b-vault-3","kind":"CJ","x":3590,"y":355,"skill":false},{"n":4,"move_id":"d01-t1b-vault-2","kind":"CJ","x":4082,"y":355,"skill":false},{"n":5,"move_id":"d01-t1b-platform-3","kind":"CC","x":5450,"y":350,"skill":true},{"n":6,"move_id":"d01-t1b-platform-1","kind":"CC","x":6588,"y":350,"skill":true},{"n":7,"move_id":"d01-t2c-vault-3","kind":"CJ","x":7128,"y":355,"skill":false},{"n":8,"move_id":"d01-t2c-vault-5","kind":"CJ","x":7859,"y":355,"skill":false},{"n":9,"move_id":"d01-t1b-vault-4","kind":"CJ","x":8541,"y":355,"skill":false},{"n":10,"move_id":"d01-t1b-platform-4","kind":"CC","x":9020,"y":350,"skill":true},{"n":11,"move_id":"d01-t1b-slide-2","kind":"CS","x":9800,"y":440,"skill":true}],
    "D02": [{"n":0,"move_id":"d02-slide","kind":"CS","x":1330,"y":440,"skill":true},{"n":1,"move_id":"d02-t2c-vault-1","kind":"CJ","x":3720,"y":355,"skill":false},{"n":2,"move_id":"d02-t1b-platform-1","kind":"CC","x":4960,"y":350,"skill":true},{"n":3,"move_id":"d02-t1b-platform-2","kind":"CC","x":5890,"y":350,"skill":true},{"n":4,"move_id":"d02-loading-vault","kind":"CJ","x":7120,"y":355,"skill":false},{"n":5,"move_id":"d02-dispatch-vault","kind":"CJ","x":9122,"y":355,"skill":false},{"n":6,"move_id":"d02-t2c-vault-2","kind":"CJ","x":9596,"y":355,"skill":false},{"n":7,"move_id":"d02-t2c-vault-3","kind":"CJ","x":10553,"y":355,"skill":false},{"n":8,"move_id":"d02-t2c-vault-4","kind":"CJ","x":11453,"y":355,"skill":false},{"n":9,"move_id":"d02-t2c-vault-5","kind":"CJ","x":11853,"y":355,"skill":false}],
    "D03": [{"n":0,"move_id":"d03-v-03","kind":"CC","x":241.6,"y":94.6,"skill":true},{"n":1,"move_id":"d03-v-04","kind":"CC","x":479.68,"y":137.8,"skill":true},{"n":2,"move_id":"d03-tr-15","kind":"CJ","x":3260.42,"y":225.4,"skill":false},{"n":3,"move_id":"d03-dz-02","kind":"CJ","x":4071.88,"y":238.8,"skill":false},{"n":4,"move_id":"d03-v-09","kind":"CC","x":1318,"y":65.8,"skill":true},{"n":5,"move_id":"d03-v-11","kind":"CC","x":1903.48,"y":44.2,"skill":true},{"n":6,"move_id":"d03-v-16","kind":"CC","x":3889.24,"y":304.6,"skill":true},{"n":7,"move_id":"d03-dz-01","kind":"CJ","x":2791.54,"y":29.8,"skill":false},{"n":8,"move_id":"d03-tr-15","kind":"CJ","x":3260.42,"y":225.4,"skill":false},{"n":9,"move_id":"d03-slide-02","kind":"CS","x":3741.24,"y":326.2,"skill":true},{"n":10,"move_id":"d03-v-27","kind":"CC","x":5788.6,"y":345.4,"skill":true},{"n":11,"move_id":"d03-tr-34","kind":"CJ","x":6699.64,"y":331,"skill":false},{"n":12,"move_id":"d03-tr-10","kind":"CJ","x":1171,"y":101.8,"skill":false}],
    "D04": [{"n":0,"move_id":"d04-dz-01","kind":"CJ","x":3617.2,"y":-279.8,"skill":false},{"n":1,"move_id":"d04-dz-02","kind":"CJ","x":4898.8,"y":-179.8,"skill":false},{"n":2,"move_id":"d04-v-06","kind":"CC","x":1074.16,"y":-560.6,"skill":true},{"n":3,"move_id":"d04-dz-03","kind":"CJ","x":7360.6,"y":194.2,"skill":false},{"n":4,"move_id":"d04-slide-01","kind":"CS","x":576.72,"y":-472.6,"skill":true},{"n":5,"move_id":"d04-dz-02","kind":"CJ","x":4898.8,"y":-179.8,"skill":false},{"n":6,"move_id":"d04-tr-32","kind":"CJ","x":5352.4,"y":-231.8,"skill":false},{"n":7,"move_id":"d04-dz-03","kind":"CJ","x":7360.6,"y":194.2,"skill":false},{"n":8,"move_id":"d04-v-17","kind":"CC","x":4374.4,"y":-123.8,"skill":true},{"n":9,"move_id":"d04-dz-02","kind":"CJ","x":4898.8,"y":-179.8,"skill":false},{"n":10,"move_id":"d04-v-21","kind":"CC","x":5076.4,"y":-195.8,"skill":true},{"n":11,"move_id":"d04-slide-01","kind":"CS","x":576.72,"y":-472.6,"skill":true}],
    "D05": [{"n":0,"move_id":"d05-dz-01","kind":"CJ","x":2461.4,"y":-798.375,"skill":false},{"n":1,"move_id":"d05-tr-17","kind":"CJ","x":4868.85,"y":-245.25,"skill":false},{"n":2,"move_id":"d05-dz-02","kind":"CJ","x":3717.32,"y":-582.625,"skill":false},{"n":3,"move_id":"d05-dz-03","kind":"CJ","x":7169.39,"y":272,"skill":false},{"n":4,"move_id":"d05-tr-36","kind":"CJ","x":6698.75,"y":335,"skill":false},{"n":5,"move_id":"d05-tr-10","kind":"CJ","x":2026.32,"y":-866.75,"skill":false},{"n":6,"move_id":"d05-tr-23","kind":"CJ","x":5167.43,"y":-86.75,"skill":false},{"n":7,"move_id":"d05-tr-37","kind":"CJ","x":6760,"y":313.375,"skill":false},{"n":8,"move_id":"d05-tr-25","kind":"CJ","x":5654.16,"y":-158.375,"skill":false},{"n":9,"move_id":"d05-vault-03","kind":"CS","x":6843.25,"y":337,"skill":true},{"n":10,"move_id":"d05-up-1","kind":"CC","x":211.6,"y":-781,"skill":true},{"n":11,"move_id":"d05-v-05","kind":"CC","x":1134,"y":-797.75,"skill":true},{"n":12,"move_id":"d05-v-15","kind":"CC","x":5315.44,"y":-105.375,"skill":true}],
    "D06": [{"n":0,"move_id":"d06-dz-01","kind":"CJ","x":1099.69,"y":24.75,"skill":false},{"n":1,"move_id":"d06-dz-02","kind":"CJ","x":1400,"y":0,"skill":false},{"n":2,"move_id":"d06-dz-03","kind":"CJ","x":1918.1,"y":-96.375,"skill":false},{"n":3,"move_id":"d06-dz-04","kind":"CJ","x":4647.2,"y":291.25,"skill":false},{"n":4,"move_id":"d06-tr-6","kind":"CJ","x":879,"y":54.75,"skill":false},{"n":5,"move_id":"d06-tr-12","kind":"CJ","x":2422.2,"y":155.625,"skill":false},{"n":6,"move_id":"d06-tr-15","kind":"CJ","x":2930.4,"y":198.75,"skill":false},{"n":7,"move_id":"d06-tr-17","kind":"CJ","x":3439.8,"y":132.75,"skill":false},{"n":8,"move_id":"d06-vault-01","kind":"CS","x":3663,"y":361,"skill":true},{"n":9,"move_id":"d06-v-02","kind":"CC","x":274,"y":129.375,"skill":true},{"n":10,"move_id":"d06-v-05","kind":"CC","x":740.8,"y":107.75,"skill":true},{"n":11,"move_id":"d06-v-16","kind":"CC","x":2539,"y":230.25,"skill":true},{"n":12,"move_id":"d06-v-22","kind":"CC","x":3898.6,"y":327.375,"skill":true}],
    "F01": [{"id":"F01-c01","kind":"CJ","move_id":"f01-p1-d07-vault-01","x":797.49,"y":-74.11,"n":0,"skill":false,"traceFrames":4},{"id":"F01-c02","kind":"CJ","move_id":"f01-p1-d07-vault-02","x":2608.21,"y":126.26,"n":1,"skill":false,"traceFrames":4},{"id":"F01-c03","kind":"CJ","move_id":"f01-p1-d07-vault-04","x":2497.72,"y":170.63,"n":2,"skill":false,"traceFrames":4},{"id":"F01-c04","kind":"CJ","move_id":"f01-p2-d13-vault-01","x":7917.56,"y":451.89,"n":3,"skill":false,"traceFrames":4},{"id":"F01-c05","kind":"CJ","move_id":"f01-p2-d13-vault-06","x":6648.76,"y":417.72,"n":4,"skill":false,"traceFrames":4},{"id":"F01-c06","kind":"CJ","move_id":"f01-hard-1","x":3259.8,"y":143.07,"n":5,"skill":false,"traceFrames":4},{"id":"F01-c07","kind":"CJ","move_id":"f01-hard-3","x":3850.51,"y":168.28,"n":6,"skill":false,"traceFrames":4},{"id":"F01-c08","kind":"CJ","move_id":"f01-hard-5","x":6648.76,"y":417.72,"n":7,"skill":false,"traceFrames":4},{"id":"F01-c09","kind":"CC","move_id":"f01-p1-d07-v-02","x":343.2,"y":-31,"n":8,"skill":true,"traceFrames":9},{"id":"F01-c10","kind":"CC","move_id":"f01-p1-d07-v-13","x":3172.8,"y":207.75,"n":9,"skill":true,"traceFrames":8},{"id":"F01-c11","kind":"CC","move_id":"f01-p2-d13-v-21","x":4594.8,"y":256.88,"n":10,"skill":true,"traceFrames":18},{"id":"F01-c12","kind":"CC","move_id":"f01-p2-d13-v-22","x":4594.8,"y":256.88,"n":11,"skill":true,"traceFrames":18},{"id":"F01-c13","kind":"CS","move_id":"f01-p2-d13-slide-04","x":5243.97,"y":291.75,"n":12,"skill":true,"traceFrames":4},{"id":"F01-c14","kind":"CS","move_id":"f01-p2-d13-slide-06","x":8151.3,"y":503.38,"n":13,"skill":true,"traceFrames":4}],
    "F02": [{"id":"F02-c01","kind":"CJ","move_id":"f02-p2-d14-vault-06","x":4827.63,"y":-186.86,"n":0,"skill":false,"traceFrames":4},{"id":"F02-c02","kind":"CJ","move_id":"f02-p2-d14-vault-02","x":6231.54,"y":48.27,"n":1,"skill":false,"traceFrames":4},{"id":"F02-c03","kind":"CJ","move_id":"f02-hard-1","x":3300.97,"y":-497.94,"n":2,"skill":false,"traceFrames":3},{"id":"F02-c04","kind":"CJ","move_id":"f02-hard-3","x":8816.4,"y":73.56,"n":3,"skill":false,"traceFrames":4},{"id":"F02-c05","kind":"CJ","move_id":"f02-p2-d14-v-28","x":6524.79,"y":44.64,"n":4,"skill":false,"traceFrames":4},{"id":"F02-c06","kind":"CJ","move_id":"f02-p1-d08-dz-03","x":1292,"y":-583,"n":5,"skill":false,"traceFrames":9},{"id":"F02-c07","kind":"CJ","move_id":"f02-p1-d08-dz-04","x":2652,"y":-465,"n":6,"skill":false,"traceFrames":9},{"id":"F02-c08","kind":"CJ","move_id":"f02-p1-d08-dz-05","x":3076,"y":-524,"n":7,"skill":false,"traceFrames":10},{"id":"F02-c09","kind":"CC","move_id":"f02-p1-d08-v-12","x":1605.6,"y":-303.37,"n":8,"skill":true,"traceFrames":19},{"id":"F02-c10","kind":"CC","move_id":"f02-p1-d08-v-14","x":2133.6,"y":-255.37,"n":9,"skill":true,"traceFrames":8},{"id":"F02-c11","kind":"CC","move_id":"f02-p1-d08-v-17","x":2497.2,"y":-272.98,"n":10,"skill":true,"traceFrames":11},{"id":"F02-c12","kind":"CC","move_id":"f02-p2-d14-v-24","x":5425.2,"y":-121.6,"n":11,"skill":true,"traceFrames":9},{"id":"F02-c13","kind":"CS","move_id":"f02-p2-d14-slide-03","x":6703.27,"y":151.38,"n":12,"skill":true,"traceFrames":4},{"id":"F02-c14","kind":"CS","move_id":"f02-hard-2","x":6971.02,"y":151.38,"n":13,"skill":true,"traceFrames":4}],
    "F03": [{"id":"F03-c01","kind":"CJ","move_id":"f03-p2-d10-vault-04","x":1039.62,"y":207.19,"n":0,"skill":false,"traceFrames":4},{"id":"F03-c02","kind":"CJ","move_id":"f03-p3-d12-vault-03","x":5631.14,"y":372.95,"n":1,"skill":false,"traceFrames":4},{"id":"F03-c03","kind":"CJ","move_id":"f03-hard-1","x":4675.07,"y":415.41,"n":2,"skill":false,"traceFrames":5},{"id":"F03-c04","kind":"CJ","move_id":"f03-hard-3","x":7297.72,"y":296.43,"n":3,"skill":false,"traceFrames":4},{"id":"F03-c05","kind":"CJ","move_id":"f03-p2-d10-v-14","x":3239.91,"y":241.47,"n":4,"skill":false,"traceFrames":4},{"id":"F03-c06","kind":"CJ","move_id":"f03-p1-d09-v-02","x":354.55,"y":25.98,"n":5,"skill":false,"traceFrames":3},{"id":"F03-c07","kind":"CJ","move_id":"f03-p2-d10-v-04","x":1645.42,"y":145.88,"n":6,"skill":false,"traceFrames":3},{"id":"F03-c08","kind":"CJ","move_id":"f03-p2-d10-v-12","x":2832.34,"y":209.49,"n":7,"skill":false,"traceFrames":3},{"id":"F03-c09","kind":"CC","move_id":"f03-p3-d12-v-03","x":5839,"y":361,"n":8,"skill":true,"traceFrames":5},{"id":"F03-c10","kind":"CC","move_id":"f03-p3-d12-v-08","x":6588.88,"y":247.16,"n":9,"skill":true,"traceFrames":14},{"id":"F03-c11","kind":"CC","move_id":"f03-p2-d10-v-02","x":1212.8,"y":230.05,"n":10,"skill":true,"traceFrames":8},{"id":"F03-c12","kind":"CC","move_id":"f03-p2-d10-v-07","x":2115.44,"y":250.66,"n":11,"skill":true,"traceFrames":9},{"id":"F03-c13","kind":"CS","move_id":"f03-hard-2","x":5023.42,"y":443.01,"n":12,"skill":true,"traceFrames":4},{"id":"F03-c14","kind":"CS","move_id":"f03-hard-4","x":7607.83,"y":378.26,"n":13,"skill":true,"traceFrames":4}],
    "F04": [{"id":"F04-c01","kind":"CJ","move_id":"f04-p1-d02-vault-06","x":2532.84,"y":206.76,"n":0,"skill":false,"traceFrames":4},{"id":"F04-c02","kind":"CJ","move_id":"f04-p1-d02-vault-01","x":3183.12,"y":185.14,"n":1,"skill":false,"traceFrames":4},{"id":"F04-c03","kind":"CJ","move_id":"f04-hard-1","x":5326.34,"y":91.53,"n":2,"skill":false,"traceFrames":4},{"id":"F04-c04","kind":"CJ","move_id":"f04-hard-3","x":7753.12,"y":490.02,"n":3,"skill":false,"traceFrames":4},{"id":"F04-c05","kind":"CJ","move_id":"f04-p1-d02-v-03","x":1205.53,"y":-265.59,"n":4,"skill":false,"traceFrames":5},{"id":"F04-c06","kind":"CJ","move_id":"f04-p2-d03-v-08","x":4515.68,"y":206.79,"n":5,"skill":false,"traceFrames":4},{"id":"F04-c07","kind":"CJ","move_id":"f04-p1-d02-v-05","x":2115.02,"y":29.06,"n":6,"skill":false,"traceFrames":3},{"id":"F04-c08","kind":"CJ","move_id":"f04-p3-d01-v-02","x":6848.87,"y":250.59,"n":7,"skill":false,"traceFrames":3},{"id":"F04-c09","kind":"CC","move_id":"f04-p1-d02-roof1-1","x":114,"y":-248.2,"n":8,"skill":true,"traceFrames":5},{"id":"F04-c10","kind":"CC","move_id":"f04-p1-d02-roof1-2","x":114,"y":-248.2,"n":9,"skill":true,"traceFrames":5},{"id":"F04-c11","kind":"CC","move_id":"f04-p1-d02-roof1-3","x":274,"y":-345.81,"n":10,"skill":true,"traceFrames":8},{"id":"F04-c12","kind":"CC","move_id":"f04-p1-d02-roof2-1","x":652.56,"y":-290.74,"n":11,"skill":true,"traceFrames":8},{"id":"F04-c13","kind":"CS","move_id":"f04-p2-d03-slide-01","x":4787.6,"y":164.63,"n":12,"skill":true,"traceFrames":4},{"id":"F04-c14","kind":"CS","move_id":"f04-hard-2","x":5636.6,"y":164.63,"n":13,"skill":true,"traceFrames":4}],
    "D07": [{"n":0,"move_id":"d07-dz-01","kind":"CJ","x":632,"y":-31,"skill":false},{"n":1,"move_id":"d07-dz-02","kind":"CJ","x":1784,"y":127.375,"skill":false},{"n":2,"move_id":"d07-dz-03","kind":"CJ","x":2912,"y":207.75,"skill":false},{"n":3,"move_id":"d07-dz-04","kind":"CJ","x":4599.2,"y":294.25,"skill":false},{"n":4,"move_id":"d07-dz-05","kind":"CJ","x":5097.2,"y":183.75,"skill":false},{"n":5,"move_id":"d07-dz-06","kind":"CJ","x":5582.72,"y":224.625,"skill":false},{"n":6,"move_id":"d07-dz-07","kind":"CJ","x":5750,"y":122.75,"skill":false},{"n":7,"move_id":"d07-vault-01","kind":"CJ","x":789.6,"y":-67,"skill":false},{"n":8,"move_id":"d07-v-02","kind":"CC","x":333.6,"y":-52.625,"skill":true},{"n":9,"move_id":"d07-v-08","kind":"CC","x":2186.4,"y":170.625,"skill":true},{"n":10,"move_id":"d07-v-13","kind":"CC","x":3154.8,"y":186.25,"skill":true},{"n":11,"move_id":"d07-v-16","kind":"CC","x":4795.6,"y":246.25,"skill":true},{"n":12,"move_id":"d07-v-18","kind":"CC","x":5097.2,"y":183.75,"skill":true},{"n":13,"move_id":"d07-slide-02","kind":"CS","x":5262.24,"y":287,"skill":true}],
    "D08": [{"n":0,"move_id":"d08-dz-01","kind":"CJ","x":539.6,"y":-445,"skill":false},{"n":1,"move_id":"d08-dz-02","kind":"CJ","x":794,"y":-493,"skill":false},{"n":2,"move_id":"d08-dz-03","kind":"CJ","x":1292,"y":-471.375,"skill":false},{"n":3,"move_id":"d08-dz-04","kind":"CJ","x":2667.2,"y":-351.375,"skill":false},{"n":4,"move_id":"d08-dz-05","kind":"CJ","x":3075.2,"y":-411.375,"skill":false},{"n":5,"move_id":"d08-dz-06","kind":"CJ","x":3435.2,"y":-339.375,"skill":false},{"n":6,"move_id":"d08-dz-07","kind":"CJ","x":4023.2,"y":-255.375,"skill":false},{"n":7,"move_id":"d08-dz-08","kind":"CJ","x":4347.2,"y":-229,"skill":false},{"n":8,"move_id":"d08-dz-09","kind":"CC","x":5800,"y":-184.375,"skill":true},{"n":9,"move_id":"d08-v-08","kind":"CC","x":1074.4,"y":-383.75,"skill":true},{"n":10,"move_id":"d08-v-12","kind":"CC","x":1591.6,"y":-373,"skill":true},{"n":11,"move_id":"d08-dz-10","kind":"CC","x":6900,"y":-137.25,"skill":true},{"n":12,"move_id":"d08-slide-01","kind":"CS","x":2822.61,"y":-351.375,"skill":true}],
    "D09": [{"n":0,"move_id":"d09-ir-coin-01","kind":"CJ","x":543.6,"y":242.63,"skill":false},{"n":1,"move_id":"d09-ir-coin-02","kind":"CJ","x":1073.76,"y":323.13,"skill":false},{"n":2,"move_id":"d09-ir-coin-03","kind":"CS","x":1652.97,"y":205.5,"skill":false},{"n":3,"move_id":"d09-ir-coin-04","kind":"CC","x":2249.46,"y":252.25,"skill":true},{"n":4,"move_id":"d09-ir-coin-05","kind":"CJ","x":2845.95,"y":325.5,"skill":false},{"n":5,"move_id":"d09-ir-coin-06","kind":"CS","x":3485.04,"y":259,"skill":false},{"n":6,"move_id":"d09-ir-coin-07","kind":"CJ","x":4038.92,"y":249.38,"skill":false},{"n":7,"move_id":"d09-ir-coin-08","kind":"CC","x":4635.41,"y":264.75,"skill":true},{"n":8,"move_id":"d09-ir-coin-09","kind":"CS","x":5231.89,"y":319,"skill":false},{"n":9,"move_id":"d09-ir-coin-10","kind":"CJ","x":5805.84,"y":158.25,"skill":false},{"n":10,"move_id":"d09-ir-coin-11","kind":"CJ","x":6460,"y":379,"skill":false},{"n":11,"move_id":"d09-ir-coin-12","kind":"CC","x":7021.35,"y":319,"skill":true},{"n":12,"move_id":"d09-ir-coin-13","kind":"CJ","x":7617.84,"y":319,"skill":false}],
    "D10": [{"n":0,"move_id":"d10-dz-01","kind":"CJ","x":283,"y":-247,"skill":false},{"n":1,"move_id":"d10-dz-02","kind":"CJ","x":807,"y":-221,"skill":false},{"n":2,"move_id":"d10-dz-03","kind":"CJ","x":1972,"y":-148,"skill":false},{"n":3,"move_id":"d10-tr-15","kind":"CJ","x":2288,"y":-64.625,"skill":false},{"n":4,"move_id":"d10-dz-05","kind":"CJ","x":4846,"y":157,"skill":false},{"n":5,"move_id":"d10-dz-06","kind":"CJ","x":5143,"y":60,"skill":false},{"n":6,"move_id":"d10-dz-07","kind":"CJ","x":5508,"y":6,"skill":false},{"n":7,"move_id":"d10-dz-08","kind":"CJ","x":6026,"y":92,"skill":false},{"n":8,"move_id":"d10-dz-11","kind":"CJ","x":8600,"y":401,"skill":false},{"n":9,"move_id":"d10-dz-10","kind":"CJ","x":8048,"y":379,"skill":false},{"n":10,"move_id":"d10-v-07","kind":"CC","x":1262.64,"y":-115,"skill":true},{"n":11,"move_id":"d10-v-38","kind":"CC","x":8606.56,"y":430.25,"skill":true}],
    "D11": [{"id":"D11-c01","type":"CJ","move_id":"d11-dz-01","x":488,"y":-963,"n":0},{"id":"D11-c02","type":"CJ","move_id":"d11-dz-02","x":1456,"y":-1140,"n":1},{"id":"D11-c03","type":"CJ","move_id":"d11-dz-03","x":1999,"y":-1122,"n":2},{"id":"D11-c04","type":"CJ","move_id":"d11-dz-04","x":2388,"y":-1144,"n":3},{"id":"D11-c05","type":"CJ","move_id":"d11-dz-05","x":2861,"y":-921,"n":4},{"id":"D11-c06","type":"CJ","move_id":"d11-dz-06","x":3842,"y":-852,"n":5},{"id":"D11-c07","type":"CJ","move_id":"d11-dz-07","x":4821.2,"y":-943.25,"n":6},{"id":"D11-c08","type":"CJ","move_id":"d11-dz-08","x":6085,"y":-486,"n":7},{"id":"D11-c09","type":"CC","move_id":"d11-v-03","x":715.6,"y":-1015.25,"n":8},{"id":"D11-c10","type":"CC","move_id":"d11-v-06","x":1544.8,"y":-1028.5,"n":9},{"id":"D11-c11","type":"CC","move_id":"d11-deadend-i11-step-1","x":2374.8,"y":-1169.625,"n":10},{"id":"D11-c12","type":"CC","move_id":"d11-deadend-i11-step-2","x":2410.8,"y":-1240.125,"n":11},{"id":"D11-c13","type":"CS","move_id":"d11-vault-06","x":1136.4,"y":-979.25,"n":12},{"id":"D11-c14","type":"CS","move_id":"d11-vault-08","x":5266.8,"y":-445,"n":13}],
    "D12": [{"id":"D12-c01","type":"CJ","move_id":"d12-dz-01","x":408,"y":-402,"n":0},{"id":"D12-c02","type":"CJ","move_id":"d12-dz-02","x":870,"y":-380,"n":1},{"id":"D12-c03","type":"CJ","move_id":"d12-dz-03","x":1203,"y":-570,"n":2},{"id":"D12-c04","type":"CJ","move_id":"d12-dz-04","x":2028,"y":-419,"n":3},{"id":"D12-c05","type":"CJ","move_id":"d12-dz-07","x":4498,"y":-22,"n":4},{"id":"D12-c06","type":"CJ","move_id":"d12-dz-06","x":3328,"y":-212,"n":5},{"id":"D12-c07","type":"CC","move_id":"d12-v-03","x":496,"y":-290.25,"n":6},{"id":"D12-c08","type":"CC","move_id":"d12-v-04","x":620.8,"y":-347.75,"n":7},{"id":"D12-c09","type":"CC","move_id":"d12-v-06","x":1050.4,"y":-370.625,"n":8},{"id":"D12-c10","type":"CC","move_id":"d12-v-17","x":3418.24,"y":-99.375,"n":9},{"id":"D12-c11","type":"CC","move_id":"d12-v-08","x":1303.6,"y":-464.25,"n":10},{"id":"D12-c12","type":"CC","move_id":"d12-v-13","x":2258.8,"y":-381.375,"n":11},{"id":"D12-c13","type":"CS","move_id":"d12-slide-01","x":3113.89,"y":-22,"n":12},{"id":"D12-c14","type":"CS","move_id":"d12-vault-03","x":114,"y":-268.625,"n":13}],
    "D13": [{"n":0,"move_id":"d13-dz-01","kind":"CJ","x":319,"y":-373,"skill":false},{"n":1,"move_id":"d13-dz-02","kind":"CJ","x":772,"y":-445,"skill":false},{"n":2,"move_id":"d13-dz-03","kind":"CJ","x":1190,"y":-390,"skill":false},{"n":3,"move_id":"d13-dz-04","kind":"CJ","x":1536,"y":-528,"skill":false},{"n":4,"move_id":"d13-dz-05","kind":"CJ","x":2778,"y":-155,"skill":false},{"n":5,"move_id":"d13-dz-06","kind":"CJ","x":3904.4,"y":99.75,"skill":false},{"n":6,"move_id":"d13-dz-07","kind":"CJ","x":4501,"y":14,"skill":false},{"n":7,"move_id":"d13-slope1-2","kind":"CC","x":500,"y":-340,"skill":true},{"n":8,"move_id":"d13-slope1-3","kind":"CC","x":562.6,"y":-340.625,"skill":true},{"n":9,"move_id":"d13-v-07","kind":"CC","x":1198,"y":-415,"skill":true},{"n":10,"move_id":"d13-v-14","kind":"CC","x":3596.8,"y":78.25,"skill":true},{"n":11,"move_id":"d13-slide-02","kind":"CS","x":1400,"y":-415,"skill":true},{"n":12,"move_id":"d13-slide-03","kind":"CS","x":4400,"y":-20,"skill":true},{"n":13,"move_id":"d13-slide-04","kind":"CS","x":5580,"y":114,"skill":true}],
    "D14": [{"n":0,"move_id":"d14-dz-01","kind":"CJ","x":1686,"y":127,"skill":false},{"n":1,"move_id":"d14-dz-02","kind":"CJ","x":2336,"y":48,"skill":false},{"n":2,"move_id":"d14-dz-03","kind":"CJ","x":2782,"y":-104,"skill":false},{"n":3,"move_id":"d14-dz-04","kind":"CJ","x":3870,"y":-105,"skill":false},{"n":4,"move_id":"d14-dz-05","kind":"CJ","x":4765,"y":62,"skill":false},{"n":5,"move_id":"d14-dz-06","kind":"CJ","x":7690,"y":260,"skill":false},{"n":6,"move_id":"d14-dz-07","kind":"CJ","x":8626,"y":235,"skill":false},{"n":7,"move_id":"d14-v-06","kind":"CC","x":1009.6,"y":207.375,"skill":true},{"n":8,"move_id":"d14-slope1-2","kind":"CC","x":1840,"y":160,"skill":true},{"n":9,"move_id":"d14-slope1-3","kind":"CC","x":1904.3999999999999,"y":160.75,"skill":true},{"n":10,"move_id":"d14-v-11","kind":"CC","x":2095.6,"y":85.375,"skill":true},{"n":11,"move_id":"d14-v-16","kind":"CC","x":2867.2,"y":6.25,"skill":true},{"n":12,"move_id":"d14-slide-01","kind":"CS","x":1168.56,"y":195.375,"skill":true},{"n":13,"move_id":"d14-slide-02","kind":"CS","x":2750,"y":-80,"skill":true}],
    "D15": [{"n":0,"move_id":"d15-dz-01","kind":"CJ","x":527,"y":207,"skill":false},{"n":1,"move_id":"d15-dz-02","kind":"CJ","x":1038,"y":88,"skill":false},{"n":2,"move_id":"d15-dz-03","kind":"CJ","x":2244,"y":256,"skill":false},{"n":3,"move_id":"d15-dz-04","kind":"CJ","x":2722,"y":113,"skill":false},{"n":4,"move_id":"d15-dz-05","kind":"CJ","x":4643,"y":38,"skill":false},{"n":5,"move_id":"d15-dz-06","kind":"CJ","x":6049,"y":152,"skill":false},{"n":6,"move_id":"d15-dz-07","kind":"CJ","x":7835,"y":219,"skill":false},{"n":7,"move_id":"d15-slide-01","kind":"CS","x":680,"y":310,"skill":true},{"n":8,"move_id":"d15-slide-02","kind":"CS","x":1620,"y":290,"skill":true},{"n":9,"move_id":"d15-slide-04","kind":"CS","x":3480,"y":170,"skill":true},{"n":10,"move_id":"d15-v-02","kind":"CC","x":250,"y":312.25,"skill":true},{"n":11,"move_id":"d15-v-14","kind":"CC","x":2506,"y":294.25,"skill":true},{"n":12,"move_id":"d15-v-16","kind":"CC","x":2822.8,"y":219.75,"skill":true},{"n":13,"move_id":"d15-v-17","kind":"CC","x":2938.7999999999997,"y":198.25,"skill":true}],
    "D16": [{"n":0,"move_id":"d16-dz-01","kind":"CJ","x":1037,"y":-1502,"skill":false},{"n":1,"move_id":"d16-dz-02","kind":"CJ","x":1838,"y":-1494,"skill":false},{"n":2,"move_id":"d16-dz-03","kind":"CJ","x":2964,"y":-870,"skill":false},{"n":3,"move_id":"d16-dz-04","kind":"CJ","x":3417,"y":-884,"skill":false},{"n":4,"move_id":"d16-dz-05","kind":"CJ","x":3719,"y":-909,"skill":false},{"n":5,"move_id":"d16-dz-06","kind":"CJ","x":4196,"y":-1106.25,"skill":false},{"n":6,"move_id":"d16-vault-02","kind":"CS","x":5085.84,"y":-806.25,"skill":true},{"n":7,"move_id":"d16-vault-03","kind":"CS","x":4926,"y":-806.25,"skill":true},{"n":8,"move_id":"d16-vault-05","kind":"CS","x":4916.4,"y":-806.25,"skill":true},{"n":9,"move_id":"d16-v-06","kind":"CC","x":2650,"y":-945,"skill":true},{"n":10,"move_id":"d16-v-08","kind":"CC","x":2956.8,"y":-884.25,"skill":true},{"n":11,"move_id":"d16-v-09","kind":"CC","x":3050,"y":-920,"skill":true},{"n":12,"move_id":"d16-v-10","kind":"CC","x":3424,"y":-913,"skill":true},{"n":13,"move_id":"d16-v-12","kind":"CC","x":3727.6,"y":-934.625,"skill":true}],
    "D17": [{"n":0,"move_id":"d17-mix-01","kind":"CJ","x":353,"y":-247,"skill":false},{"n":1,"move_id":"d17-mix-02","kind":"CJ","x":877,"y":-221,"skill":false},{"n":2,"move_id":"d17-mix-03","kind":"CC","x":1332.64,"y":-115,"skill":true},{"n":3,"move_id":"d17-mix-04","kind":"CC","x":1332.64,"y":-115,"skill":true},{"n":4,"move_id":"d17-mix-05","kind":"CC","x":1332.64,"y":-115,"skill":true},{"n":5,"move_id":"d17-mix-06","kind":"CC","x":1332.64,"y":-115,"skill":true},{"n":6,"move_id":"d17-mix-07","kind":"CJ","x":2042,"y":-148,"skill":false},{"n":7,"move_id":"d17-mix-08","kind":"CJ","x":2358,"y":-64.62,"skill":false},{"n":8,"move_id":"d17-mix-09","kind":"CJ","x":4542.68,"y":41.13,"skill":false},{"n":9,"move_id":"d17-mix-10","kind":"CJ","x":4542.68,"y":41.13,"skill":false},{"n":10,"move_id":"d17-mix-11","kind":"CJ","x":4542.68,"y":41.13,"skill":false},{"n":11,"move_id":"d17-mix-12","kind":"CJ","x":4542.68,"y":41.13,"skill":false},{"n":12,"move_id":"d17-mix-13","kind":"CS","x":5621.68,"y":141.13,"skill":true},{"n":13,"move_id":"d17-mix-14","kind":"CS","x":5621.68,"y":141.13,"skill":true}],
    "D18": [{"n":0,"move_id":"d18-mix-01","kind":"CC","x":320,"y":312.25,"skill":true},{"n":1,"move_id":"d18-mix-02","kind":"CJ","x":597,"y":207,"skill":false},{"n":2,"move_id":"d18-mix-03","kind":"CS","x":750,"y":310,"skill":true},{"n":3,"move_id":"d18-mix-04","kind":"CJ","x":1108,"y":88,"skill":false},{"n":4,"move_id":"d18-mix-05","kind":"CS","x":1690,"y":290,"skill":true},{"n":5,"move_id":"d18-mix-06","kind":"CJ","x":2314,"y":256,"skill":false},{"n":6,"move_id":"d18-mix-07","kind":"CC","x":2576,"y":294.25,"skill":true},{"n":7,"move_id":"d18-mix-08","kind":"CJ","x":2792,"y":113,"skill":false},{"n":8,"move_id":"d18-mix-09","kind":"CC","x":2892.8,"y":219.75,"skill":true},{"n":9,"move_id":"d18-mix-10","kind":"CC","x":3008.8,"y":198.25,"skill":true},{"n":10,"move_id":"d18-mix-11","kind":"CJ","x":5664.16,"y":-38.5,"skill":false},{"n":11,"move_id":"d18-mix-12","kind":"CJ","x":6034.53,"y":81.5,"skill":false},{"n":12,"move_id":"d18-mix-13","kind":"CJ","x":6666,"y":-18.25,"skill":false},{"n":13,"move_id":"d18-mix-14","kind":"CJ","x":7614.16,"y":167.5,"skill":false}],
    "F05": [{"n":0,"move_id":"f05-p1-d02-slide","kind":"CS","x":1400,"y":440,"skill":true,"id":"F05-c01"},{"n":1,"move_id":"f05-p2-d01-t1b-platform-3","kind":"CC","x":5421.26,"y":823.85,"skill":true,"id":"F05-c02"},{"n":2,"move_id":"f05-p2-d01-t1b-platform-1","kind":"CC","x":6559.26,"y":823.85,"skill":true,"id":"F05-c03"},{"n":3,"move_id":"f05-p2-d01-t2c-vault-3","kind":"CJ","x":7099.26,"y":828.85,"skill":false,"id":"F05-c04"},{"n":4,"move_id":"f05-p2-d01-t2c-vault-5","kind":"CJ","x":7830.26,"y":828.85,"skill":false,"id":"F05-c05"},{"n":5,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c06"},{"n":6,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c07"},{"n":7,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c08"},{"n":8,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c09"},{"n":9,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c10"},{"n":10,"move_id":"f05-p2-d01-t1b-vault-4","kind":"CJ","x":8512.26,"y":828.85,"skill":false,"id":"F05-c11"},{"n":11,"move_id":"f05-p2-d01-t1b-platform-4","kind":"CC","x":8991.26,"y":823.85,"skill":true,"id":"F05-c12"},{"n":12,"move_id":"f05-p2-d01-t1b-platform-4","kind":"CC","x":8991.26,"y":823.85,"skill":true,"id":"F05-c13"},{"n":13,"move_id":"f05-p2-d01-t1b-slide-2","kind":"CS","x":9771.26,"y":913.85,"skill":true,"id":"F05-c14"}],
    "F06": [{"n":0,"move_id":"f06-p2-d17-mix-01","kind":"CJ","x":1816.6,"y":-481,"skill":false,"id":"F06-c01"},{"n":1,"move_id":"f06-p2-d17-mix-02","kind":"CJ","x":2340.6,"y":-455,"skill":false,"id":"F06-c02"},{"n":2,"move_id":"f06-p2-d17-mix-03","kind":"CC","x":2796.24,"y":-349,"skill":true,"id":"F06-c03"},{"n":3,"move_id":"f06-p2-d17-mix-04","kind":"CC","x":2796.24,"y":-349,"skill":true,"id":"F06-c04"},{"n":4,"move_id":"f06-p2-d17-mix-05","kind":"CC","x":2796.24,"y":-349,"skill":true,"id":"F06-c05"},{"n":5,"move_id":"f06-p2-d17-mix-06","kind":"CC","x":2796.24,"y":-349,"skill":true,"id":"F06-c06"},{"n":6,"move_id":"f06-p2-d17-mix-07","kind":"CJ","x":3505.6,"y":-382,"skill":false,"id":"F06-c07"},{"n":7,"move_id":"f06-p2-d17-mix-08","kind":"CJ","x":3821.6,"y":-298.62,"skill":false,"id":"F06-c08"},{"n":8,"move_id":"f06-p2-d17-mix-08","kind":"CJ","x":3821.6,"y":-298.62,"skill":false,"id":"F06-c09"},{"n":9,"move_id":"f06-p2-d17-mix-08","kind":"CJ","x":3821.6,"y":-298.62,"skill":false,"id":"F06-c10"},{"n":10,"move_id":"f06-p2-d17-mix-08","kind":"CJ","x":3821.6,"y":-298.62,"skill":false,"id":"F06-c11"},{"n":11,"move_id":"f06-p2-d17-mix-08","kind":"CJ","x":3821.6,"y":-298.62,"skill":false,"id":"F06-c12"},{"n":12,"move_id":"f06-p3-d02-slide","kind":"CS","x":7312.08,"y":523.58,"skill":true,"id":"F06-c13"},{"n":13,"move_id":"f06-p3-d02-slide","kind":"CS","x":7312.08,"y":523.58,"skill":true,"id":"F06-c14"}],
    "M05": [{"n":0,"move_id":"m05-p1-d10-dz-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"M05-c01"},{"n":1,"move_id":"m05-p1-d10-dz-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"M05-c02"},{"n":2,"move_id":"m05-p1-d10-dz-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"M05-c03"},{"n":3,"move_id":"m05-p1-d10-dz-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"M05-c04"},{"n":4,"move_id":"m05-p1-d10-v-07","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"M05-c05"},{"n":5,"move_id":"m05-p1-d10-dz-03","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"M05-c06"},{"n":6,"move_id":"m05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M05-c07"},{"n":7,"move_id":"m05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M05-c08"},{"n":8,"move_id":"m05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M05-c09"},{"n":9,"move_id":"m05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M05-c10"},{"n":10,"move_id":"m05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M05-c11"},{"n":11,"move_id":"m05-p2-d05-up-1","kind":"CC","x":4730.08,"y":14.13,"skill":true,"id":"M05-c12"},{"n":12,"move_id":"m05-p2-d05-up-1","kind":"CC","x":4730.08,"y":14.13,"skill":true,"id":"M05-c13"},{"n":13,"move_id":"m05-p2-d05-up-1","kind":"CC","x":4730.08,"y":14.13,"skill":true,"id":"M05-c14"}],
    "M06": [{"n":0,"move_id":"m06-p1-d17-mix-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"M06-c01"},{"n":1,"move_id":"m06-p1-d17-mix-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"M06-c02"},{"n":2,"move_id":"m06-p1-d17-mix-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"M06-c03"},{"n":3,"move_id":"m06-p1-d17-mix-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"M06-c04"},{"n":4,"move_id":"m06-p1-d17-mix-03","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"M06-c05"},{"n":5,"move_id":"m06-p1-d17-mix-04","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"M06-c06"},{"n":6,"move_id":"m06-p1-d17-mix-05","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"M06-c07"},{"n":7,"move_id":"m06-p1-d17-mix-06","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"M06-c08"},{"n":8,"move_id":"m06-p1-d17-mix-07","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"M06-c09"},{"n":9,"move_id":"m06-p1-d17-mix-08","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"M06-c10"},{"n":10,"move_id":"m06-p2-d13-dz-01","kind":"CJ","x":4837.48,"y":-81.87,"skill":false,"id":"M06-c11"},{"n":11,"move_id":"m06-p2-d13-dz-02","kind":"CJ","x":5290.48,"y":-153.87,"skill":false,"id":"M06-c12"},{"n":12,"move_id":"m06-p2-d13-dz-02","kind":"CJ","x":5290.48,"y":-153.87,"skill":false,"id":"M06-c13"},{"n":13,"move_id":"m06-p2-d13-dz-02","kind":"CJ","x":5290.48,"y":-153.87,"skill":false,"id":"M06-c14"}],
    "A05": [{"n":0,"move_id":"a05-p1-d10-dz-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"A05-c01"},{"n":1,"move_id":"a05-p1-d10-dz-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"A05-c02"},{"n":2,"move_id":"a05-p1-d10-dz-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"A05-c03"},{"n":3,"move_id":"a05-p1-d10-dz-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"A05-c04"},{"n":4,"move_id":"a05-p1-d10-v-07","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"A05-c05"},{"n":5,"move_id":"a05-p1-d10-dz-03","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"A05-c06"},{"n":6,"move_id":"a05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A05-c07"},{"n":7,"move_id":"a05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A05-c08"},{"n":8,"move_id":"a05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A05-c09"},{"n":9,"move_id":"a05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A05-c10"},{"n":10,"move_id":"a05-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A05-c11"},{"n":11,"move_id":"a05-p2-d05-up-1","kind":"CC","x":4730.08,"y":14.13,"skill":true,"id":"A05-c12"},{"n":12,"move_id":"a05-p2-d05-v-05","kind":"CC","x":5652.48,"y":-2.62,"skill":true,"id":"A05-c13"},{"n":13,"move_id":"a05-p2-d05-v-05","kind":"CC","x":5652.48,"y":-2.62,"skill":true,"id":"A05-c14"}],
    "A06": [{"n":0,"move_id":"a06-p1-d10-dz-01","kind":"CJ","x":353,"y":-247,"skill":false,"id":"A06-c01"},{"n":1,"move_id":"a06-p1-d10-dz-01","kind":"CS","x":353,"y":-247,"skill":true,"id":"A06-c02"},{"n":2,"move_id":"a06-p1-d10-dz-02","kind":"CJ","x":877,"y":-221,"skill":false,"id":"A06-c03"},{"n":3,"move_id":"a06-p1-d10-dz-02","kind":"CS","x":877,"y":-221,"skill":true,"id":"A06-c04"},{"n":4,"move_id":"a06-p1-d10-v-07","kind":"CC","x":1332.64,"y":-115,"skill":true,"id":"A06-c05"},{"n":5,"move_id":"a06-p1-d10-dz-03","kind":"CJ","x":2042,"y":-148,"skill":false,"id":"A06-c06"},{"n":6,"move_id":"a06-p1-d10-tr-15","kind":"CJ","x":2358,"y":-64.62,"skill":false,"id":"A06-c07"},{"n":7,"move_id":"a06-p3-d13-dz-01","kind":"CJ","x":7402.68,"y":-146.62,"skill":false,"id":"A06-c08"},{"n":8,"move_id":"a06-p3-d13-slope1-2","kind":"CC","x":7583.68,"y":-113.62,"skill":true,"id":"A06-c09"},{"n":9,"move_id":"a06-p3-d13-slope1-3","kind":"CC","x":7646.28,"y":-114.24,"skill":true,"id":"A06-c10"},{"n":10,"move_id":"a06-p3-d13-slope1-3","kind":"CC","x":7646.28,"y":-114.24,"skill":true,"id":"A06-c11"},{"n":11,"move_id":"a06-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A06-c12"},{"n":12,"move_id":"a06-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A06-c13"},{"n":13,"move_id":"a06-p3-d13-dz-02","kind":"CJ","x":7855.68,"y":-218.62,"skill":false,"id":"A06-c14"}]
  });
  const ROUTES = Object.freeze({    A03: {"routeId":"A03","worldId":"aftermath","version":2,"name":"LAST COURIER","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"a03-p1-d10-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"a03-p1-d10-v-02","x":406,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"a03-p1-d10-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"a03-p1-d10-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"a03-p1-d10-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"a03-p1-d10-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"a03-p1-d10-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"a03-p1-d10-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"a03-p1-d10-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"a03-p1-d10-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"a03-p1-d10-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"a03-p1-d10-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"a03-p1-d10-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"a03-p1-d10-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"a03-p1-d10-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"a03-p2-d12-v-01","x":4518.48,"y":93.375,"w":718.8,"h":232.8,"kind":"ground"},{"id":"a03-p2-d12-v-03","x":4974.48,"y":23.75,"w":262.8,"h":69.6,"kind":"ground"},{"id":"a03-p2-d12-v-04","x":5099.28,"y":-33.75,"w":138,"h":57.6,"kind":"ground"},{"id":"a03-p2-d12-v-05","x":5353.68,"y":-35,"w":620.4,"h":301.2,"kind":"ground"},{"id":"a03-p2-d12-v-06","x":5528.88,"y":-56.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"a03-p2-d12-v-07","x":5650.08,"y":-78.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"a03-p2-d12-v-08","x":5782.08,"y":-150.25,"w":192,"h":115.2,"kind":"ground"},{"id":"a03-p2-d12-v-10","x":6306.48,"y":28.63,"w":769.2,"h":301.2,"kind":"ground"},{"id":"a03-p2-d12-v-12","x":6599.28,"y":7,"w":88.8,"h":21.6,"kind":"ground"},{"id":"a03-p2-d12-slope-1","x":5974.08,"y":-131.74,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a03-p2-d12-slope-2","x":6040.56,"y":-91.62,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a03-p2-d12-slope-3","x":6107.04,"y":-51.49,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a03-p2-d12-slope-4","x":6173.52,"y":-11.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a03-p2-d12-slope-5","x":6240,"y":28.63,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a03-p3-d13-v-01","x":7083.68,"y":28.625,"w":375.6,"h":120,"kind":"ground"},{"id":"a03-p3-d13-v-03","x":7683.68,"y":-90.24,"w":120,"h":116.4,"kind":"ground"},{"id":"a03-p3-d13-v-04","x":7920.08,"y":-90.24,"w":120,"h":237.6,"kind":"ground"},{"id":"a03-p3-d13-slope1-1","x":7459.28,"y":-11,"w":74.8,"h":39.63,"kind":"ground"},{"id":"a03-p3-d13-slope1-2","x":7534.08,"y":-50.625,"w":74.8,"h":39.63,"kind":"ground"},{"id":"a03-p3-d13-slope1-3","x":7608.88,"y":-90.25,"w":74.8,"h":39.63,"kind":"ground"}],"catchableSurfaces":[{"id":"a03-p1-d10-v-07"},{"id":"a03-p1-d10-v-08"},{"id":"a03-p1-d10-v-10"},{"id":"a03-p1-d10-v-13"},{"id":"a03-p1-d10-v-15"},{"id":"a03-p1-d10-v-16"},{"id":"a03-p1-d10-v-17"},{"id":"a03-p1-d10-v-18"},{"id":"a03-p1-d10-v-19"},{"id":"a03-p1-d10-v-20"},{"id":"a03-p2-d12-v-03"},{"id":"a03-p2-d12-v-04"},{"id":"a03-p2-d12-v-06"},{"id":"a03-p2-d12-v-07"},{"id":"a03-p2-d12-v-08"},{"id":"a03-p2-d12-v-12"},{"id":"a03-p3-d13-slope1-2"},{"id":"a03-p3-d13-slope1-3"},{"id":"a03-p3-d13-slope1-1"},{"id":"a03-p1-d10-v-02"},{"id":"a03-p2-d12-v-01"},{"id":"a03-p3-d13-v-01"}],"diveZones":[{"id":"a03-p1-d10-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"a03-p1-d10-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"a03-p1-d10-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"a03-p1-d10-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"a03-p2-d12-dz-01","x1":4762.32,"x2":4802.32,"landX":5014.48,"landY":23.75},{"id":"a03-p2-d12-dz-02","x1":5099.28,"x2":5139.28,"landX":5393.68,"landY":-35},{"id":"a03-p2-d12-dz-03","x1":5474.11,"x2":5514.11,"landX":5822.08,"landY":-150.25},{"id":"a03-p2-d12-dz-04","x1":6406.5,"x2":6446.5,"landX":6639.28,"landY":7},{"id":"a03-p3-d13-dz-01","x1":7258.85,"x2":7298.85,"landX":7499.28,"landY":-11},{"id":"a03-p3-d13-dz-02","x1":7657.5,"x2":7697.5,"landX":7960.08,"landY":-90.24}],"obstacles":[{"id":"a03-p1-d10-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"a03-p2-d12-vault-03","type":"vault","x":4804.48,"w":24,"h":48,"baseY":93.38},{"id":"a03-hard-1","type":"vault","x":3738.48,"w":72,"h":48,"baseY":93.38},{"id":"a03-hard-2","type":"slide","x":4030.48,"w":72,"h":48,"baseY":93.38},{"id":"a03-hard-3","type":"vault","x":6494.48,"w":72,"h":48,"baseY":28.63},{"id":"a03-hard-4","type":"slide","x":6786.48,"w":72,"h":48,"baseY":28.63}],"length":8180.08,"finishX":8040.08,"checkpoints":[70,2010.02,4020.04,6030.06],"mode":"hard","coins":makeCoins("A03", COINS.A03)},
    A04: {"routeId":"A04","worldId":"aftermath","version":2,"name":"FINAL DISPATCH","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"a04-p1-d10-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"a04-p1-d10-v-02","x":406,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p1-d10-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"a04-p1-d10-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"a04-p1-d10-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"a04-p1-d10-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"a04-p1-d10-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"a04-p1-d10-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"a04-p1-d10-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"a04-p1-d10-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p1-d10-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"a04-p1-d10-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"a04-p1-d10-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"a04-p1-d10-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"a04-p1-d10-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"a04-p1-d10-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-21","x":7998.96,"y":277.76,"w":960,"h":48,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-22","x":8195.76,"y":256.125,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-19","x":7626.96,"y":213.375,"w":248.58,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-14","x":6886.8,"y":278.13,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"a04-p2-d17-p1-f04-v-20","x":7725.36,"y":154.625,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"a04-p2-d17-p1-f04-v-18","x":7507.2,"y":235,"w":120.9,"h":21.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-17","x":7385.76,"y":256.625,"w":241.2,"h":21.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-16","x":7204.08,"y":256.625,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-15","x":6899.76,"y":209.75,"w":138,"h":67.92,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-13","x":6705.36,"y":143.75,"w":124.8,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-12","x":6580.56,"y":208.63,"w":249.6,"h":307.2,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-05","x":5395.92,"y":158.13,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-11","x":6178.32,"y":115.01,"w":42,"h":43.2,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-10","x":6071.52,"y":93.375,"w":106.8,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-09","x":5929.92,"y":115.01,"w":108,"h":43.2,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-08","x":5881.92,"y":93.375,"w":48,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-07","x":5757.12,"y":93.375,"w":48,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-06","x":5525.52,"y":93.38,"w":136.8,"h":64.8,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-04","x":5390.16,"y":93.38,"w":136.75,"h":309.6,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-01","x":4518.48,"y":93.375,"w":720,"h":240,"kind":"ground"},{"id":"a04-p2-d17-p1-f04-v-02","x":4854.48,"y":71.76,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p3-d06-v-01","x":8966.96,"y":277.75,"w":652.8,"h":237.6,"kind":"ground"},{"id":"a04-p3-d06-v-02","x":9224.96,"y":256.125,"w":72,"h":21.6,"kind":"ground"},{"id":"a04-p3-d06-u-1","x":9076.16,"y":343.89,"w":28.8,"h":21.6,"kind":"ground"}],"catchableSurfaces":[{"id":"a04-p1-d10-v-07"},{"id":"a04-p1-d10-v-08"},{"id":"a04-p1-d10-v-10"},{"id":"a04-p1-d10-v-13"},{"id":"a04-p1-d10-v-15"},{"id":"a04-p1-d10-v-16"},{"id":"a04-p1-d10-v-17"},{"id":"a04-p1-d10-v-18"},{"id":"a04-p1-d10-v-19"},{"id":"a04-p1-d10-v-20"},{"id":"a04-p1-d10-v-22"},{"id":"a04-p2-d17-p1-f04-v-07"},{"id":"a04-p2-d17-p1-f04-v-08"},{"id":"a04-p2-d17-p1-f04-v-10"},{"id":"a04-p2-d17-p1-f04-v-13"},{"id":"a04-p2-d17-p1-f04-v-15"},{"id":"a04-p2-d17-p1-f04-v-16"},{"id":"a04-p2-d17-p1-f04-v-17"},{"id":"a04-p2-d17-p1-f04-v-18"},{"id":"a04-p2-d17-p1-f04-v-19"},{"id":"a04-p2-d17-p1-f04-v-20"},{"id":"a04-p2-d17-p1-f04-v-22"},{"id":"a04-p3-d06-v-02"},{"id":"a04-p1-d10-v-02"},{"id":"a04-p2-d17-p1-f04-v-01"},{"id":"a04-p3-d06-v-01"}],"diveZones":[{"id":"a04-p1-d10-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"a04-p1-d10-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"a04-p1-d10-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"a04-p1-d10-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"a04-p2-d17-p1-f04-dz-01","x1":4661.7,"x2":4701.7,"landX":4894.48,"landY":71.76},{"id":"a04-p2-d17-p1-f04-dz-02","x1":5120.88,"x2":5160.88,"landX":5430.16,"landY":93.38},{"id":"a04-p2-d17-p1-f04-dz-03","x1":6295.79,"x2":6335.79,"landX":6620.56,"landY":208.63},{"id":"a04-p2-d17-p1-f04-dz-04","x1":7835.54,"x2":7875.54,"landX":8038.96,"landY":277.76}],"obstacles":[{"id":"a04-p1-d10-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"a04-p2-d17-p1-f04-vault-04","type":"vault","x":4701.7,"w":24,"h":48,"baseY":93.38},{"id":"a04-p3-d06-vault-03","type":"vault","x":9063.36,"w":24,"h":48,"baseY":277.76},{"id":"a04-hard-1","type":"vault","x":3922.48,"w":72,"h":48,"baseY":93.38},{"id":"a04-hard-2","type":"slide","x":4222.48,"w":72,"h":48,"baseY":93.38},{"id":"a04-hard-3","type":"vault","x":8298.96,"w":72,"h":48,"baseY":277.76},{"id":"a04-hard-4","type":"slide","x":8590.96,"w":72,"h":48,"baseY":277.76},{"id":"a04-hard-5","type":"vault","x":9394.96,"w":72,"h":48,"baseY":277.75}],"length":9759.76,"finishX":9619.76,"checkpoints":[70,2404.94,4809.88,7214.82],"mode":"hard","coins":makeCoins("A04", COINS.A04)},
    A01: {"routeId":"A01","worldId":"aftermath","version":1,"name":"BROKEN RECEIVING","length":8646.08,"finishX":8506.08,"checkpoints":[70,746.16,3210.96,5365.44],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"a01-v-02"},{"id":"a01-v-14"},{"id":"a01-v-16"},{"id":"a01-v-17"},{"id":"a01-v-18"},{"id":"a01-v-19"},{"id":"a01-v-20"},{"id":"a01-v-25"},{"id":"a01-v-28"},{"id":"a01-v-29"},{"id":"a01-v-30"},{"id":"a01-v-33"},{"id":"a01-v-37"},{"id":"a01-v-35"},{"id":"a01-v-13"}],"highJumpZones":[],"diveZones":[{"id":"a01-dz-01","x1":342.96,"x2":443.45,"landX":626.8,"landY":337.875},{"id":"a01-dz-02","x1":801.8,"x2":905.41,"landX":1134.4,"landY":219.375},{"id":"a01-dz-03","x1":2104.02,"x2":2144.02,"landX":2336.8,"landY":391.375},{"id":"a01-dz-04","x1":2488.86,"x2":2608.86,"landX":2822.8,"landY":243.75},{"id":"a01-dz-05","x1":4375.2,"x2":4495.2,"landX":4937.2,"landY":293},{"id":"a01-dz-06","x1":5786.4,"x2":5906.4,"landX":6355.6,"landY":433.375},{"id":"a01-dz-07","x1":7582.62,"x2":7702.62,"landX":7904.32,"landY":326.375},{"id":"a01-dz-08","x1":7953.12,"x2":8055.48,"landX":8276.56,"landY":274.75}],"groundSegments":[{"id":"a01-v-01","x":0,"y":408.25,"w":210,"h":240,"kind":"ground"},{"id":"a01-v-02","x":210,"y":336.25,"w":240,"h":240,"kind":"ground"},{"id":"a01-v-04","x":586.8,"y":337.875,"w":354,"h":240,"kind":"ground"},{"id":"a01-v-06","x":1094.4,"y":219.375,"w":127.2,"h":148.8,"kind":"ground"},{"id":"a01-v-07","x":1221.6,"y":289.375,"w":484.8,"h":240,"kind":"ground"},{"id":"a01-v-10","x":1801.2,"y":413,"w":664.8,"h":240,"kind":"ground"},{"id":"a01-v-13","x":2296.8,"y":391.375,"w":169.2,"h":21.6,"kind":"ground"},{"id":"a01-v-14","x":2466,"y":318.25,"w":316.8,"h":240,"kind":"ground"},{"id":"a01-v-16","x":2782.8,"y":243.75,"w":600,"h":240,"kind":"ground"},{"id":"a01-v-17","x":2899.2,"y":222.25,"w":79.2,"h":21.6,"kind":"ground"},{"id":"a01-v-18","x":3032.4,"y":200.625,"w":88.8,"h":43.2,"kind":"ground"},{"id":"a01-v-19","x":3213.84,"y":179,"w":96,"h":64.8,"kind":"ground"},{"id":"a01-v-20","x":3409.2,"y":177.75,"w":1086,"h":369.6,"kind":"ground"},{"id":"a01-v-23","x":4897.2,"y":293,"w":169.2,"h":240,"kind":"ground"},{"id":"a01-v-24","x":5066.4,"y":361.375,"w":116.4,"h":50.4,"kind":"ground"},{"id":"a01-v-25","x":5182.8,"y":293,"w":723.6,"h":120,"kind":"ground"},{"id":"a01-v-26","x":6315.6,"y":455,"w":636,"h":240,"kind":"ground"},{"id":"a01-v-27","x":6315.6,"y":433.375,"w":240,"h":21.6,"kind":"ground"},{"id":"a01-v-28","x":6628.56,"y":433.375,"w":160.08,"h":21.6,"kind":"ground"},{"id":"a01-v-29","x":6700.56,"y":411.75,"w":79.44,"h":21.6,"kind":"ground"},{"id":"a01-v-30","x":6951.6,"y":382.75,"w":288,"h":240,"kind":"ground"},{"id":"a01-v-32","x":7311.36,"y":443,"w":229.2,"h":240,"kind":"ground"},{"id":"a01-v-33","x":7540.56,"y":369.5,"w":600,"h":240,"kind":"ground"},{"id":"a01-v-35","x":7864.32,"y":326.375,"w":88.8,"h":43.2,"kind":"ground"},{"id":"a01-v-37","x":8236.56,"y":274.75,"w":840,"h":463.2,"kind":"ground"}],"obstacles":[{"id":"a01-slide-01","type":"slide","x":722.8,"w":48,"h":86.4,"baseY":337.875},{"id":"a01-slide-02","type":"slide","x":1642.8,"w":48,"h":86.4,"baseY":289.375},{"id":"a01-slide-04","type":"slide","x":3526.8,"w":48,"h":86.4,"baseY":177.75},{"id":"a01-vault-01","type":"vault","x":3728.4,"w":72,"h":48,"baseY":177.75},{"id":"a01-vault-03","type":"vault","x":1466.4,"w":72,"h":48,"baseY":289.375},{"id":"a01-vault-04","type":"vault","x":270.96,"w":72,"h":48,"baseY":336.25},{"id":"a01-vault-05","type":"vault","x":1936.8,"w":72,"h":48,"baseY":413},{"id":"a01-vault-06","type":"vault","x":7195.8,"w":72,"h":48,"baseY":382.75}],"coins":makeCoins("A01", COINS.A01)},
    A02: {"routeId":"A02","worldId":"aftermath","version":1,"name":"EMERGENCY CARGO","length":8009.12,"finishX":7869.12,"checkpoints":[70,3149.04,4585.44,6433.68],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"a02-v-06"},{"id":"a02-v-08"},{"id":"a02-v-09"},{"id":"a02-v-10"},{"id":"a02-v-12"},{"id":"a02-v-15"},{"id":"a02-v-21"},{"id":"a02-v-17"},{"id":"a02-s-wall-1"},{"id":"a02-s-wall-2"},{"id":"a02-s-wall-3"}],"highJumpZones":[],"diveZones":[{"id":"a02-dz-01","x1":839.02,"x2":959.02,"landX":1141.6,"landY":-1373.75},{"id":"a02-dz-02","x1":1584,"x2":1704,"landX":2413.6,"landY":-929.75},{"id":"a02-dz-03","x1":2841.6,"x2":2932.8,"landX":2972.8,"landY":-860.25},{"id":"a02-dz-04","x1":3331.2,"x2":3384,"landX":3424,"landY":-889},{"id":"a02-dz-05","x1":3639.6,"x2":3687.6,"landX":3727.6,"landY":-910.625},{"id":"a02-dz-06","x1":3687.6,"x2":3807.6,"landX":4216,"landY":-1082.25},{"id":"a02-dz-07","x1":4477.2,"x2":4570.8,"landX":4613.2,"landY":-734.25},{"id":"a02-dz-08","x1":4622.4,"x2":4696.8,"landX":4736.8,"landY":-755.75},{"id":"a02-dz-09","x1":5601.6,"x2":5721.6,"landX":6654.4,"landY":89}],"groundSegments":[{"id":"a02-v-01","x":0,"y":-1373.75,"w":981.6,"h":303.6,"kind":"ground"},{"id":"a02-v-03","x":1101.6,"y":-1373.75,"w":602.4,"h":633.6,"kind":"ground"},{"id":"a02-v-04","x":2373.6,"y":-929.75,"w":240,"h":600,"kind":"ground"},{"id":"a02-v-05","x":2613.6,"y":-823,"w":228,"h":238.8,"kind":"ground"},{"id":"a02-v-06","x":2721.6,"y":-883,"w":120,"h":60,"kind":"ground"},{"id":"a02-v-07","x":2841.6,"y":-741.375,"w":966,"h":146.4,"kind":"ground"},{"id":"a02-v-08","x":2932.8,"y":-860.25,"w":48,"h":118.8,"kind":"ground"},{"id":"a02-v-09","x":3091.2,"y":-833.75,"w":240,"h":92.4,"kind":"ground"},{"id":"a02-v-10","x":3384,"y":-889,"w":255.6,"h":147.6,"kind":"ground"},{"id":"a02-v-12","x":3687.6,"y":-910.625,"w":120,"h":169.2,"kind":"ground"},{"id":"a02-v-13","x":4176,"y":-1082.25,"w":301.2,"h":499.2,"kind":"ground"},{"id":"a02-v-14","x":4466.4,"y":-628.625,"w":104.4,"h":21.6,"kind":"ground"},{"id":"a02-v-15","x":4573.2,"y":-734.25,"w":604.8,"h":24,"kind":"ground"},{"id":"a02-v-16","x":4573.2,"y":-734.25,"w":8.4,"h":48,"kind":"ground"},{"id":"a02-v-17","x":4696.8,"y":-755.75,"w":87.6,"h":21.6,"kind":"ground"},{"id":"a02-v-20","x":5182.8,"y":-502.625,"w":132,"h":21.6,"kind":"ground"},{"id":"a02-v-21","x":5274,"y":-734.25,"w":447.6,"h":231.6,"kind":"ground"},{"id":"a02-v-25","x":6614.4,"y":89,"w":336,"h":28.8,"kind":"ground"},{"id":"a02-v-28","x":7053.6,"y":337.375,"w":96,"h":172.8,"kind":"ground"},{"id":"a02-v-29","x":7174.8,"y":359,"w":300,"h":261.6,"kind":"ground"},{"id":"a02-v-30","x":7599.6,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"a02-s-wall-1","x":5278.8,"y":-811.5,"w":36,"h":77.21,"kind":"ground"},{"id":"a02-s-wall-2","x":5278.8,"y":-888.625,"w":36,"h":77.21,"kind":"ground"},{"id":"a02-s-wall-3","x":5278.8,"y":-965.875,"w":36,"h":77.21,"kind":"ground"}],"obstacles":[{"id":"a02-vault-02","type":"vault","x":5049.84,"w":72,"h":48,"baseY":-734.25},{"id":"a02-vault-03","type":"vault","x":4890,"w":72,"h":48,"baseY":-734.25},{"id":"a02-vault-05","type":"vault","x":4880.4,"w":72,"h":48,"baseY":-734.25},{"id":"a02-vault-06","type":"vault","x":4312,"w":24,"h":48,"baseY":-1082.25},{"id":"a02-vault-07","type":"vault","x":3520,"w":72,"h":48,"baseY":-889},{"id":"a02-vault-08","type":"vault","x":6519.36,"w":72,"h":48,"baseY":-580.625}],"coins":makeCoins("A02", COINS.A02)},
    M03: {"routeId":"M03","worldId":"magma","version":1,"name":"FURNACE AISLE","length":9043.52,"finishX":8903.52,"checkpoints":[70,1683.6,3950.64,5508],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"m03-slope1-2"},{"id":"m03-slope1-3"},{"id":"m03-v-07"},{"id":"m03-v-14"},{"id":"m03-v-19"},{"id":"m03-v-21"},{"id":"m03-v-22"},{"id":"m03-v-23"},{"id":"m03-v-24"},{"id":"m03-v-26"},{"id":"m03-v-32"},{"id":"m03-slope4-1"},{"id":"m03-slope4-2"},{"id":"m03-v-16"},{"id":"m03-slope1-1"}],"highJumpZones":[],"diveZones":[{"id":"m03-dz-01","x1":175.17,"x2":215.17,"landX":415.6,"landY":-237.375},{"id":"m03-dz-02","x1":573.82,"x2":693.82,"landX":876.4,"landY":-316.625},{"id":"m03-dz-03","x1":1103.8,"x2":1158,"landX":1198,"landY":-391},{"id":"m03-dz-04","x1":1373,"x2":1434,"landX":1723.6,"landY":-218.25},{"id":"m03-dz-05","x1":2515.2,"x2":2635.2,"landX":3112,"landY":174.25},{"id":"m03-dz-06","x1":3820.8,"x2":3884.4,"landX":3924.4,"landY":123.75},{"id":"m03-dz-07","x1":4163.13,"x2":4283.13,"landX":4508.8,"landY":66.25},{"id":"m03-dz-08","x1":6022.8,"x2":6142.8,"landX":6660.4,"landY":319.375},{"id":"m03-dz-09","x1":7124.4,"x2":7281.6,"landX":7321.6,"landY":337.375},{"id":"m03-dz-10","x1":8437,"x2":8484.03,"landX":8674,"landY":334.25}],"groundSegments":[{"id":"m03-v-01","x":0,"y":-197.75,"w":375.6,"h":120,"kind":"ground"},{"id":"m03-v-03","x":600,"y":-316.625,"w":120,"h":116.4,"kind":"ground"},{"id":"m03-v-04","x":836.4,"y":-316.625,"w":120,"h":237.6,"kind":"ground"},{"id":"m03-v-05","x":956.4,"y":-223,"w":201.6,"h":144,"kind":"ground"},{"id":"m03-v-07","x":1158,"y":-391,"w":276,"h":240,"kind":"ground"},{"id":"m03-v-09","x":1683.6,"y":-218.25,"w":120,"h":591.6,"kind":"ground"},{"id":"m03-v-10","x":2035.2,"y":-14.25,"w":600,"h":240,"kind":"ground"},{"id":"m03-v-12","x":3072,"y":174.25,"w":1344,"h":571.2,"kind":"ground"},{"id":"m03-v-14","x":3556.8,"y":102.25,"w":264,"h":72,"kind":"ground"},{"id":"m03-v-16","x":3884.4,"y":123.75,"w":66,"h":50.4,"kind":"ground"},{"id":"m03-v-19","x":4468.8,"y":66.25,"w":207.6,"h":240,"kind":"ground"},{"id":"m03-v-20","x":4676.4,"y":138.25,"w":502.8,"h":240,"kind":"ground"},{"id":"m03-v-21","x":4711.2,"y":115.375,"w":97.2,"h":22.8,"kind":"ground"},{"id":"m03-v-22","x":4808.4,"y":66.25,"w":48,"h":72,"kind":"ground"},{"id":"m03-v-23","x":4891.2,"y":116.625,"w":74.4,"h":21.6,"kind":"ground"},{"id":"m03-v-24","x":4965.6,"y":68.625,"w":52.8,"h":69.6,"kind":"ground"},{"id":"m03-v-25","x":5179.2,"y":210.25,"w":140.4,"h":168,"kind":"ground"},{"id":"m03-v-26","x":5319.6,"y":138.25,"w":823.2,"h":240,"kind":"ground"},{"id":"m03-v-28","x":6620.4,"y":319.375,"w":504,"h":254.4,"kind":"ground"},{"id":"m03-v-30","x":7124.4,"y":455,"w":157.2,"h":120,"kind":"ground"},{"id":"m03-v-32","x":7281.6,"y":337.375,"w":105.6,"h":152.4,"kind":"ground"},{"id":"m03-v-33","x":7546.8,"y":444.25,"w":232.8,"h":60,"kind":"ground"},{"id":"m03-v-34","x":7928.4,"y":349.875,"w":600,"h":240,"kind":"ground"},{"id":"m03-v-37","x":8634,"y":334.25,"w":840,"h":463.2,"kind":"ground"},{"id":"m03-slope1-1","x":375.6,"y":-237.375,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m03-slope1-2","x":450.4,"y":-277,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m03-slope1-3","x":525.2,"y":-316.625,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m03-slope2-1","x":1803.6,"y":-177.5,"w":46.32,"h":40.8,"kind":"ground"},{"id":"m03-slope2-2","x":1849.92,"y":-136.625,"w":46.32,"h":40.8,"kind":"ground"},{"id":"m03-slope2-3","x":1896.24,"y":-95.875,"w":46.32,"h":40.8,"kind":"ground"},{"id":"m03-slope2-4","x":1942.56,"y":-55,"w":46.32,"h":40.8,"kind":"ground"},{"id":"m03-slope2-5","x":1988.88,"y":-14.25,"w":46.32,"h":40.8,"kind":"ground"},{"id":"m03-slope3-1","x":7387.2,"y":373,"w":53.2,"h":35.63,"kind":"ground"},{"id":"m03-slope3-2","x":7440.4,"y":408.625,"w":53.2,"h":35.63,"kind":"ground"},{"id":"m03-slope3-3","x":7493.6,"y":444.25,"w":53.2,"h":35.63,"kind":"ground"},{"id":"m03-slope4-1","x":7779.6,"y":397.125,"w":74.4,"h":47.19,"kind":"ground"},{"id":"m03-slope4-2","x":7854,"y":349.875,"w":74.4,"h":47.19,"kind":"ground"}],"obstacles":[{"id":"m03-slide-02","type":"slide","x":1294,"w":48,"h":86.4,"baseY":-391},{"id":"m03-slide-03","type":"slide","x":4268.4,"w":48,"h":86.4,"baseY":174.25},{"id":"m03-slide-04","type":"slide","x":5452.8,"w":48,"h":86.4,"baseY":138.25},{"id":"m03-slide-06","type":"slide","x":8358,"w":48,"h":86.4,"baseY":349.875},{"id":"m03-vault-01","type":"vault","x":8144.4,"w":72,"h":48,"baseY":349.875},{"id":"m03-vault-02","type":"vault","x":103.17,"w":72,"h":48,"baseY":-197.75},{"id":"m03-vault-03","type":"vault","x":3238.8,"w":24,"h":48,"baseY":174.25},{"id":"m03-vault-04","type":"vault","x":3655.2,"w":72,"h":48,"baseY":102.25},{"id":"m03-vault-05","type":"vault","x":4070.4,"w":72,"h":48,"baseY":174.25},{"id":"m03-vault-06","type":"vault","x":6914.4,"w":72,"h":48,"baseY":319.375}],"voidEdges":[],"coins":makeCoins("M03", COINS.M03)},
    M04: {"routeId":"M04","worldId":"magma","version":1,"name":"MAGMA LIFT","length":9084.32,"finishX":8944.32,"checkpoints":[70,396.24,3008.88,6332.16],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"m04-v-06"},{"id":"m04-slope1-2"},{"id":"m04-slope1-3"},{"id":"m04-v-11"},{"id":"m04-v-16"},{"id":"m04-v-24"},{"id":"m04-v-26"},{"id":"m04-v-31"},{"id":"m04-v-34"},{"id":"m04-slope1-1"}],"highJumpZones":[],"diveZones":[{"id":"m04-dz-01","x1":1535.97,"x2":1575.97,"landX":1776.4,"landY":263.875},{"id":"m04-dz-02","x1":2055.6,"x2":2156.83,"landX":2344,"landY":99.75},{"id":"m04-dz-03","x1":2544,"x2":2617.04,"landX":2867.2,"landY":30.25},{"id":"m04-dz-04","x1":3627.6,"x2":3747.6,"landX":4054,"landY":83},{"id":"m04-dz-05","x1":4463.34,"x2":4583.34,"landX":4772.8,"landY":114.25},{"id":"m04-dz-06","x1":7432.8,"x2":7552.8,"landX":7945.6,"landY":455},{"id":"m04-dz-07","x1":8457.54,"x2":8497.54,"landX":8714.8,"landY":371}],"groundSegments":[{"id":"m04-v-01","x":0,"y":188.125,"w":240,"h":240,"kind":"ground"},{"id":"m04-v-02","x":240,"y":231.375,"w":542.4,"h":241.2,"kind":"ground"},{"id":"m04-v-03","x":240,"y":209.75,"w":157.2,"h":21.6,"kind":"ground"},{"id":"m04-v-05","x":782.4,"y":303.375,"w":187.2,"h":147.6,"kind":"ground"},{"id":"m04-v-06","x":969.6,"y":231.375,"w":240,"h":240,"kind":"ground"},{"id":"m04-v-08","x":1281.6,"y":303.375,"w":454.8,"h":240,"kind":"ground"},{"id":"m04-v-10","x":1938,"y":184.75,"w":117.6,"h":240,"kind":"ground"},{"id":"m04-v-11","x":2055.6,"y":109.375,"w":120,"h":240,"kind":"ground"},{"id":"m04-v-12","x":2304,"y":99.75,"w":240,"h":240,"kind":"ground"},{"id":"m04-v-14","x":2544,"y":218.625,"w":232.8,"h":240,"kind":"ground"},{"id":"m04-v-16","x":2827.2,"y":30.25,"w":920.4,"h":360,"kind":"ground"},{"id":"m04-v-18","x":4014,"y":83,"w":360,"h":225.6,"kind":"ground"},{"id":"m04-v-19","x":4374,"y":128.625,"w":268.8,"h":240,"kind":"ground"},{"id":"m04-v-20","x":4732.8,"y":114.25,"w":600,"h":240,"kind":"ground"},{"id":"m04-v-23","x":5332.8,"y":162.25,"w":237.6,"h":240,"kind":"ground"},{"id":"m04-v-24","x":5457.6,"y":99.75,"w":66,"h":62.4,"kind":"ground"},{"id":"m04-v-25","x":5814,"y":345.75,"w":720,"h":62.4,"kind":"ground"},{"id":"m04-v-26","x":5977.2,"y":302.625,"w":88.8,"h":43.2,"kind":"ground"},{"id":"m04-v-28","x":6592.8,"y":397.375,"w":960,"h":240,"kind":"ground"},{"id":"m04-v-30","x":7905.6,"y":455,"w":720,"h":398.4,"kind":"ground"},{"id":"m04-v-31","x":8106,"y":383,"w":192,"h":72,"kind":"ground"},{"id":"m04-v-34","x":8674.8,"y":371,"w":840,"h":463.2,"kind":"ground"},{"id":"m04-slope1-1","x":1736.4,"y":263.875,"w":67.2,"h":39.54,"kind":"ground"},{"id":"m04-slope1-2","x":1803.6,"y":224.25,"w":67.2,"h":39.54,"kind":"ground"},{"id":"m04-slope1-3","x":1870.8,"y":184.75,"w":67.2,"h":39.54,"kind":"ground"},{"id":"m04-slope2-1","x":5570.4,"y":208.125,"w":60.9,"h":45.88,"kind":"ground"},{"id":"m04-slope2-2","x":5631.3,"y":254,"w":60.9,"h":45.88,"kind":"ground"},{"id":"m04-slope2-3","x":5692.2,"y":299.875,"w":60.9,"h":45.88,"kind":"ground"},{"id":"m04-slope2-4","x":5753.1,"y":345.75,"w":60.9,"h":45.88,"kind":"ground"}],"obstacles":[{"id":"m04-slide-01","type":"slide","x":1144.56,"w":48,"h":86.4,"baseY":231.375},{"id":"m04-slide-02","type":"slide","x":2654.4,"w":48,"h":86.4,"baseY":218.625},{"id":"m04-slide-03","type":"slide","x":6733.2,"w":48,"h":86.4,"baseY":397.375},{"id":"m04-vault-01","type":"vault","x":2440,"w":72,"h":48,"baseY":99.75},{"id":"m04-vault-02","type":"vault","x":6277.2,"w":72,"h":48,"baseY":345.75},{"id":"m04-vault-03","type":"vault","x":2963.2,"w":72,"h":48,"baseY":30.25},{"id":"m04-vault-04","type":"vault","x":5100.96,"w":72,"h":48,"baseY":114.25},{"id":"m04-vault-05","type":"vault","x":8181.36,"w":72,"h":48,"baseY":383},{"id":"m04-vault-06","type":"vault","x":4868.8,"w":72,"h":48,"baseY":114.25},{"id":"m04-vault-07","type":"vault","x":546,"w":72,"h":48,"baseY":231.375},{"id":"m04-vault-08","type":"vault","x":1463.97,"w":72,"h":48,"baseY":303.375},{"id":"m04-vault-09","type":"vault","x":8385.54,"w":72,"h":48,"baseY":455}],"voidEdges":[],"coins":makeCoins("M04", COINS.M04)},
    M01: {"routeId":"M01","worldId":"magma","version":1,"name":"FOUNDRY WALK","length":9920,"finishX":9780,"checkpoints":[70,3655,7110,9435],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"m01-v-03"},{"id":"m01-v-06"},{"id":"m01-v-09"},{"id":"m01-v-10"},{"id":"m01-deadend-i11-step-1"},{"id":"m01-deadend-i11-step-2"},{"id":"m01-deadend-i11-step-3"},{"id":"m01-tunnel-floor"},{"id":"m01-v-20"},{"id":"m01-v-21"},{"id":"m01-v-28"},{"id":"m01-slope2-2"},{"id":"m01-v-30"},{"id":"m01-v-33"}],"highJumpZones":[],"diveZones":[{"id":"m01-dz-01","x1":189.05,"x2":309.05,"landX":492.4,"landY":-907.25},{"id":"m01-dz-02","x1":1282.95,"x2":1322.95,"landX":1544.8,"landY":-1004.5},{"id":"m01-dz-03","x1":1712.8,"x2":1795.05,"landX":2004.4,"landY":-1066.875},{"id":"m01-dz-04","x1":2316.8,"x2":2356.8,"landX":2396.8,"landY":-1145.625},{"id":"m01-dz-05","x1":2608.8,"x2":2715.55,"landX":2927.2,"landY":-828,"peakY":-925.7},{"id":"m01-dz-06","x1":3574.8,"x2":3694.8,"landX":3862,"landY":-828,"peakY":-925.7},{"id":"m01-dz-07","x1":4351.2,"x2":4407.13,"landX":4841.2,"landY":-919.25},{"id":"m01-dz-08","x1":5874,"x2":5994,"landX":6330.4,"landY":-25},{"id":"m01-dz-09","x1":7186.8,"x2":7306.8,"landX":8447.44,"landY":455},{"id":"m01-dz-10","x1":9037.44,"x2":9157.44,"landX":9405.04,"landY":275.75}],"groundSegments":[{"id":"m01-v-01","x":0,"y":-906,"w":372,"h":205.2,"kind":"ground"},{"id":"m01-v-02","x":452.4,"y":-907.25,"w":960,"h":240,"kind":"ground"},{"id":"m01-v-03","x":675.6,"y":-991.25,"w":144,"h":84,"kind":"ground"},{"id":"m01-v-06","x":1504.8,"y":-1004.5,"w":890.4,"h":72,"kind":"ground"},{"id":"m01-v-09","x":1964.4,"y":-1066.875,"w":66,"h":62.4,"kind":"ground"},{"id":"m01-v-10","x":2030.4,"y":-1120.875,"w":314.4,"h":116.4,"kind":"ground"},{"id":"m01-v-11","x":2344.8,"y":-1075.25,"w":121.2,"h":70.8,"kind":"ground"},{"id":"m01-v-13","x":2464.8,"y":-1286.5,"w":72,"h":254.4,"kind":"ground"},{"id":"m01-v-14","x":2608.8,"y":-643.25,"w":278.4,"h":144,"kind":"ground"},{"id":"m01-v-17","x":3642,"y":-1257.625,"w":42,"h":301.2,"kind":"ground"},{"id":"m01-v-18","x":3822,"y":-828,"w":144,"h":567.6,"kind":"ground"},{"id":"m01-v-19","x":3966,"y":-780,"w":441.13,"h":519.6,"kind":"ground"},{"id":"m01-v-20","x":4086,"y":-828,"w":72,"h":48,"kind":"ground"},{"id":"m01-v-21","x":4230,"y":-828,"w":121.2,"h":48,"kind":"ground"},{"id":"m01-v-22","x":4393.2,"y":-439.25,"w":532.8,"h":178.8,"kind":"ground"},{"id":"m01-v-24","x":4801.2,"y":-919.25,"w":124.8,"h":91.2,"kind":"ground"},{"id":"m01-v-25","x":5034,"y":-373,"w":960,"h":48,"kind":"ground"},{"id":"m01-v-27","x":6290.4,"y":-25,"w":541.2,"h":628.8,"kind":"ground"},{"id":"m01-v-28","x":6759.12,"y":-68.25,"w":72,"h":43.2,"kind":"ground"},{"id":"m01-v-29","x":6831.6,"y":55.375,"w":450,"h":80.4,"kind":"ground"},{"id":"m01-v-30","x":7040.4,"y":8.625,"w":266.4,"h":46.8,"kind":"ground"},{"id":"m01-v-32","x":8407.44,"y":455,"w":957.6,"h":448.8,"kind":"ground"},{"id":"m01-v-33","x":9365.04,"y":275.75,"w":555.6,"h":393.6,"kind":"ground"},{"id":"m01-tunnel-floor","x":2887.2,"y":-828,"w":807.6,"h":328.8,"kind":"ground"},{"id":"m01-slope1-1","x":4605.6,"y":26.375,"w":138.24,"h":45.6,"kind":"ground"},{"id":"m01-slope1-2","x":4743.84,"y":-19.25,"w":138.24,"h":45.6,"kind":"ground"},{"id":"m01-slope2-1","x":6831.12,"y":8.625,"w":104.4,"h":38.4,"kind":"ground"},{"id":"m01-slope2-2","x":6935.52,"y":-29.75,"w":104.4,"h":38.4,"kind":"ground"},{"id":"m01-deadend-i11-step-1","x":2356.8,"y":-1145.625,"w":36,"h":70.42,"kind":"ground"},{"id":"m01-deadend-i11-step-2","x":2392.8,"y":-1216.125,"w":36,"h":70.42,"kind":"ground"},{"id":"m01-deadend-i11-step-3","x":2428.8,"y":-1286.5,"w":36,"h":70.42,"kind":"ground"}],"obstacles":[{"id":"m01-slide-02","type":"slide","x":7282.32,"w":588,"h":60,"baseY":8.625},{"id":"m01-vault-02","type":"vault","x":4839.84,"w":24,"h":48,"baseY":-439.25},{"id":"m01-vault-03","type":"vault","x":4638,"w":24,"h":48,"baseY":-439.25},{"id":"m01-vault-04","type":"vault","x":2685.84,"w":72,"h":48,"baseY":-956.5},{"id":"m01-vault-05","type":"vault","x":1640.8,"w":72,"h":48,"baseY":-1004.5},{"id":"m01-vault-06","type":"vault","x":1100.4,"w":72,"h":48,"baseY":-907.25},{"id":"m01-vault-07","type":"vault","x":1683.05,"w":72,"h":48,"baseY":-1004.5},{"id":"m01-vault-08","type":"vault","x":5230.8,"w":72,"h":48,"baseY":-373}],"voidEdges":[],"coins":makeCoins("M01", COINS.M01)},
    M02: {"routeId":"M02","worldId":"magma","version":1,"name":"CASTING CRANE","length":7142,"finishX":7002,"checkpoints":[70,1858,3600,5599],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"m02-v-03"},{"id":"m02-v-04"},{"id":"m02-v-06"},{"id":"m02-v-07"},{"id":"m02-v-08"},{"id":"m02-v-13"},{"id":"m02-v-17"},{"id":"m02-v-22"},{"id":"m02-v-25"},{"id":"m02-v-29"},{"id":"m02-v-24"},{"id":"m02-v-12"}],"highJumpZones":[],"diveZones":[{"id":"m02-dz-01","x1":243.84,"x2":283.84,"landX":496,"landY":-266.25},{"id":"m02-dz-02","x1":580.8,"x2":691.86,"landX":875.2,"landY":-325},{"id":"m02-dz-03","x1":955.63,"x2":1075.63,"landX":1303.6,"landY":-440.25},{"id":"m02-dz-04","x1":1888.02,"x2":1928.02,"landX":2120.8,"landY":-283},{"id":"m02-dz-05","x1":2378.86,"x2":2498.86,"landX":2730.4,"landY":-135.375},{"id":"m02-dz-06","x1":3168.89,"x2":3208.89,"landX":3418.24,"landY":-75.375},{"id":"m02-dz-07","x1":4258.8,"x2":4378.8,"landX":4746.4,"landY":299},{"id":"m02-dz-08","x1":5242.8,"x2":5285.32,"landX":5487.28,"landY":347},{"id":"m02-dz-09","x1":6179.28,"x2":6299.28,"landX":6608.08,"landY":336.25}],"groundSegments":[{"id":"m02-v-01","x":0,"y":-196.625,"w":718.8,"h":232.8,"kind":"ground"},{"id":"m02-v-03","x":456,"y":-266.25,"w":262.8,"h":69.6,"kind":"ground"},{"id":"m02-v-04","x":580.8,"y":-323.75,"w":138,"h":57.6,"kind":"ground"},{"id":"m02-v-05","x":835.2,"y":-325,"w":620.4,"h":301.2,"kind":"ground"},{"id":"m02-v-06","x":1010.4,"y":-346.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"m02-v-07","x":1131.6,"y":-368.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"m02-v-08","x":1263.6,"y":-440.25,"w":192,"h":115.2,"kind":"ground"},{"id":"m02-v-10","x":1788,"y":-261.375,"w":769.2,"h":301.2,"kind":"ground"},{"id":"m02-v-12","x":2080.8,"y":-283,"w":88.8,"h":21.6,"kind":"ground"},{"id":"m02-v-13","x":2218.8,"y":-357.375,"w":154.8,"h":96,"kind":"ground"},{"id":"m02-v-14","x":2690.4,"y":-135.375,"w":240,"h":507.6,"kind":"ground"},{"id":"m02-v-15","x":2930.4,"y":-13,"w":573.6,"h":385.2,"kind":"ground"},{"id":"m02-v-17","x":3378.24,"y":-75.375,"w":66,"h":62.4,"kind":"ground"},{"id":"m02-v-18","x":3504,"y":113,"w":874.8,"h":259.2,"kind":"ground"},{"id":"m02-v-20","x":4706.4,"y":299,"w":188.4,"h":871.2,"kind":"ground"},{"id":"m02-v-21","x":4894.8,"y":455,"w":450,"h":69.6,"kind":"ground"},{"id":"m02-v-22","x":5242.8,"y":390.25,"w":322.8,"h":64.8,"kind":"ground"},{"id":"m02-v-24","x":5447.28,"y":347,"w":118.8,"h":43.2,"kind":"ground"},{"id":"m02-v-25","x":5528.88,"y":294.25,"w":770.4,"h":52.8,"kind":"ground"},{"id":"m02-v-28","x":6568.08,"y":336.25,"w":1327.2,"h":308.4,"kind":"ground"},{"id":"m02-v-29","x":6852.48,"y":314.625,"w":87.6,"h":21.6,"kind":"ground"},{"id":"m02-slope-1","x":1455.6,"y":-421.75,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m02-slope-2","x":1522.08,"y":-381.625,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m02-slope-3","x":1588.56,"y":-341.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m02-slope-4","x":1655.04,"y":-301.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m02-slope-5","x":1721.52,"y":-261.375,"w":66.48,"h":40.08,"kind":"ground"}],"obstacles":[{"id":"m02-slide-01","type":"slide","x":3089.89,"w":48,"h":86.4,"baseY":-13},{"id":"m02-vault-03","type":"vault","x":102,"w":24,"h":48,"baseY":-196.625},{"id":"m02-vault-05","type":"vault","x":5662.08,"w":24,"h":48,"baseY":294.25},{"id":"m02-vault-07","type":"vault","x":5668.92,"w":72,"h":48,"baseY":294.25}],"voidEdges":[],"coins":makeCoins("M02", COINS.M02)},
    D01: {"routeId":"D01","worldId":"dock31","version":2,"name":"FIRST SHIFT","length":8375,"finishX":8235,"checkpoints":[70,4214],"chief":{"startX":4214},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d01-v-04"},{"id":"d01-v-05"},{"id":"d01-v-06"},{"id":"d01-v-07"},{"id":"d01-v-09"},{"id":"d01-v-10"},{"id":"d01-v-14"},{"id":"d01-v-15"},{"id":"d01-v-16"},{"id":"d01-v-17"},{"id":"d01-v-19"},{"id":"d01-v-20"},{"id":"d01-v-22"},{"id":"d01-v-24"}],"highJumpZones":[],"diveZones":[{"id":"d01-dz-01","x1":305.6,"x2":425.6,"landX":1048,"landY":-256.45},{"id":"d01-dz-02","x1":5586.45,"x2":5706.45,"landX":5985.67,"landY":145.43}],"groundSegments":[{"id":"d01-v-01","x":0,"y":-584.05,"w":441.6,"h":66,"kind":"ground"},{"id":"d01-v-02","x":1008,"y":-256.45,"w":240,"h":240,"kind":"ground"},{"id":"d01-v-03","x":1248,"y":-184.45,"w":432,"h":240,"kind":"ground"},{"id":"d01-v-04","x":1251.6,"y":-204.85,"w":34.8,"h":20.4,"kind":"ground"},{"id":"d01-v-05","x":1259.28,"y":-225.25,"w":15.6,"h":20.4,"kind":"ground"},{"id":"d01-v-06","x":1318.8,"y":-256.45,"w":144,"h":72,"kind":"ground"},{"id":"d01-v-07","x":1536,"y":-256.45,"w":144,"h":72,"kind":"ground"},{"id":"d01-v-08","x":1680,"y":-160.45,"w":648,"h":240,"kind":"ground"},{"id":"d01-v-09","x":1721.94,"y":-222.85,"w":66,"h":62.4,"kind":"ground"},{"id":"d01-v-10","x":2136,"y":-255.25,"w":192,"h":94.8,"kind":"ground"},{"id":"d01-v-11","x":2424.72,"y":-107.65,"w":980.04,"h":360,"kind":"ground"},{"id":"d01-v-14","x":3233.28,"y":-129.25,"w":171.6,"h":21.6,"kind":"ground"},{"id":"d01-v-15","x":3405.12,"y":-203.65,"w":1200,"h":240,"kind":"ground"},{"id":"d01-v-16","x":3549.12,"y":-225.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d01-v-17","x":3767.52,"y":-225.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d01-v-19","x":4197.12,"y":-225.25,"w":408,"h":21.6,"kind":"ground"},{"id":"d01-v-20","x":4461.12,"y":-299.65,"w":144,"h":74.4,"kind":"ground"},{"id":"d01-v-21","x":4763.04,"y":-155.65,"w":960,"h":48,"kind":"ground"},{"id":"d01-v-22","x":4959.84,"y":-177.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d01-v-23","x":5945.67,"y":145.43,"w":960,"h":48,"kind":"ground"},{"id":"d01-v-24","x":6142.47,"y":123.83,"w":72,"h":21.6,"kind":"ground"},{"id":"d01-v-25","x":7016.13,"y":382.04,"w":762.06,"h":928.8,"kind":"ground"},{"id":"d01-v-26","x":7778.61,"y":455,"w":1197.6,"h":240,"kind":"ground"},{"id":"d01-v-27","x":7778.61,"y":410.84,"w":48.24,"h":43.44,"kind":"ground"},{"id":"d01-v-28","x":8314.29,"y":262.28,"w":12,"h":120,"kind":"ground"},{"id":"d01-u-1","x":8098.53,"y":1317.98,"w":15.6,"h":21.6,"kind":"ground"},{"id":"d01-u-2","x":8330.61,"y":1319.96,"w":408,"h":21.6,"kind":"ground"},{"id":"d01-u-3","x":8498.61,"y":1300.04,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d01-u-4","x":8661.81,"y":1300.04,"w":28.8,"h":21.6,"kind":"ground"}],"obstacles":[{"id":"d01-slide-01","type":"slide","x":2773.2,"w":48,"h":86.4,"baseY":-107.65},{"id":"d01-slide-02","type":"slide","x":3031.2,"w":48,"h":86.4,"baseY":-107.65},{"id":"d01-vault-01","type":"vault","x":8609.01,"w":24,"h":48,"baseY":455},{"id":"d01-vault-02","type":"vault","x":3983.52,"w":28.8,"h":21.6,"baseY":-203.65},{"id":"d01-vault-03","type":"vault","x":8032.53,"w":24,"h":48,"baseY":455},{"id":"d01-vault-04","type":"vault","x":8445.81,"w":24,"h":48,"baseY":455}],"coins":makeCoins("D01", COINS.D01)},
    D02: {"routeId":"D02","worldId":"dock31","version":3,"name":"BARREL DELIVERY","length":6400,"finishX":6260,"checkpoints":[70,1211,3433,5200],"chief":{"startX":1211},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d02-roof1-1"},{"id":"d02-roof1-2"},{"id":"d02-roof1-3"},{"id":"d02-roof2-1"},{"id":"d02-roof2-2"},{"id":"d02-roof2-3"},{"id":"d02-v-06"},{"id":"d02-v-08"},{"id":"d02-v-09"}],"highJumpZones":[],"diveZones":[{"id":"d02-dz-01","x1":1685.8,"x2":1787.6,"landX":2184.7,"landY":362.36}],"groundSegments":[{"id":"d02-v-01","x":0,"y":-224.2,"w":1280.4,"h":240,"kind":"ground"},{"id":"d02-v-02","x":1282.8,"y":-109,"w":129.6,"h":381.6,"kind":"ground"},{"id":"d02-v-03","x":1282.8,"y":-152.2,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d02-v-04","x":1755.6,"y":65,"w":48,"h":32.4,"kind":"ground"},{"id":"d02-v-05","x":2144.7,"y":362.36,"w":146.6,"h":360,"kind":"ground"},{"id":"d02-v-06","x":2285.58,"y":270.2,"w":1012.8,"h":360,"kind":"ground"},{"id":"d02-v-08","x":2761.92,"y":248.6,"w":72,"h":21.6,"kind":"ground"},{"id":"d02-v-09","x":3046.38,"y":248.6,"w":72,"h":21.6,"kind":"ground"},{"id":"d02-v-10","x":3298.38,"y":270.2,"w":1507.2,"h":120,"kind":"ground"},{"id":"d02-v-11","x":4930.08,"y":390.2,"w":919.96,"h":616.8,"kind":"ground"},{"id":"d02-v-14","x":5905.15,"y":455,"w":928.9,"h":463.2,"kind":"ground"},{"id":"d02-v-15","x":6339.06,"y":263.24,"w":12,"h":120,"kind":"ground"},{"id":"d02-u-1","x":2655.18,"y":301.64,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d02-u-2","x":3229.08,"y":342.98,"w":72,"h":21.6,"kind":"ground"},{"id":"d02-u-3","x":5988.78,"y":1490.78,"w":66,"h":288,"kind":"ground"},{"id":"d02-u-4","x":6054.78,"y":1553.18,"w":78,"h":69.6,"kind":"ground"},{"id":"d02-u-5","x":6132.78,"y":1575.98,"w":301.2,"h":46.8,"kind":"ground"},{"id":"d02-u-6","x":6216.78,"y":1505.18,"w":48,"h":70.8,"kind":"ground"},{"id":"d02-roof1-1","x":60,"y":-263.8,"w":480,"h":39.6,"kind":"ground"},{"id":"d02-roof1-2","x":140,"y":-303.4,"w":320,"h":39.6,"kind":"ground"},{"id":"d02-roof1-3","x":220,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"d02-roof2-1","x":598.56,"y":-263.8,"w":480,"h":39.6,"kind":"ground"},{"id":"d02-roof2-2","x":678.56,"y":-303.4,"w":320,"h":39.6,"kind":"ground"},{"id":"d02-roof2-3","x":758.56,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"d02-slope-1","x":1412.4,"y":-65.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"d02-slope-2","x":1498.2,"y":-22,"w":85.8,"h":43.5,"kind":"ground"},{"id":"d02-slope-3","x":1584,"y":21.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"d02-slope-4","x":1669.8,"y":65,"w":85.8,"h":43.5,"kind":"ground"}],"slopes":[],"obstacles":[{"id":"d02-vault-01","type":"vault","x":2602.38,"w":24,"h":48,"baseY":270.2},{"id":"d02-vault-02","type":"vault","x":5627.58,"w":28.8,"h":21.6,"baseY":390.2},{"id":"d02-vault-03","type":"vault","x":3351.18,"w":24,"h":48,"baseY":270.2},{"id":"d02-vault-04","type":"vault","x":5458.38,"w":28.8,"h":21.6,"baseY":390.2},{"id":"d02-vault-05","type":"vault","x":5367.9,"w":24,"h":48,"baseY":390.2},{"id":"d02-vault-06","type":"vault","x":2494.38,"w":28.8,"h":21.6,"baseY":270.2}],"coins":makeCoins("D02", COINS.D02)},
    D03: {"routeId":"D03","worldId":"dock31","version":2,"name":"CRANE CROSSING","length":7139,"finishX":6999,"checkpoints":[70,2125,4449],"chief":{"startX":2125},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d03-v-03"},{"id":"d03-v-04"},{"id":"d03-v-06"},{"id":"d03-v-07"},{"id":"d03-v-09"},{"id":"d03-v-11"},{"id":"d03-v-16"},{"id":"d03-v-18"},{"id":"d03-v-20"},{"id":"d03-v-26"},{"id":"d03-v-27"},{"id":"d03-v-28"},{"id":"d03-v-30"}],"highJumpZones":[],"diveZones":[{"id":"d03-dz-01","x1":2442,"x2":2562,"landX":3029.08,"landY":301.4},{"id":"d03-dz-02","x1":3873.24,"x2":3983.64,"landX":4168.12,"landY":347},{"id":"d03-dz-03","x1":4489.5,"x2":4536.12,"landX":4576.12,"landY":282.2}],"groundSegments":[{"id":"d03-v-01","x":0,"y":199.4,"w":620.4,"h":168,"kind":"ground"},{"id":"d03-v-02","x":0,"y":156.2,"w":225.3,"h":43.2,"kind":"ground"},{"id":"d03-v-03","x":225.6,"y":134.6,"w":69.6,"h":64.8,"kind":"ground"},{"id":"d03-v-04","x":463.68,"y":177.8,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-v-05","x":620.4,"y":221,"w":510,"h":145.2,"kind":"ground"},{"id":"d03-v-06","x":705.18,"y":199.4,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-v-07","x":940.8,"y":199.4,"w":189.6,"h":21.6,"kind":"ground"},{"id":"d03-v-08","x":1179.6,"y":177.8,"w":123.7,"h":439.2,"kind":"ground"},{"id":"d03-v-09","x":1302,"y":105.8,"w":1260,"h":120,"kind":"ground"},{"id":"d03-v-11","x":1887.48,"y":84.2,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-v-12","x":2989.08,"y":301.4,"w":255.31,"h":254.4,"kind":"ground"},{"id":"d03-v-13","x":3025.56,"y":-49,"w":739.2,"h":238.8,"kind":"ground"},{"id":"d03-v-14","x":3244.44,"y":387.8,"w":739.2,"h":238.8,"kind":"ground"},{"id":"d03-v-16","x":3873.24,"y":344.6,"w":110.4,"h":43.2,"kind":"ground"},{"id":"d03-v-17","x":4128.12,"y":347,"w":240,"h":240,"kind":"ground"},{"id":"d03-v-18","x":4208.52,"y":325.4,"w":160.8,"h":21.6,"kind":"ground"},{"id":"d03-v-19","x":4368.12,"y":396.2,"w":796.54,"h":246.48,"kind":"ground"},{"id":"d03-v-20","x":4422.12,"y":304.04,"w":67.38,"h":92.4,"kind":"ground"},{"id":"d03-v-21","x":4536.12,"y":282.2,"w":309.6,"h":114,"kind":"ground"},{"id":"d03-v-23","x":4845.72,"y":282.2,"w":100.81,"h":115.6,"kind":"ground"},{"id":"d03-v-24","x":5299.8,"y":407,"w":121.2,"h":554.4,"kind":"ground"},{"id":"d03-v-25","x":5421,"y":428.6,"w":117.6,"h":218.4,"kind":"ground"},{"id":"d03-v-26","x":5538.6,"y":407,"w":720,"h":240,"kind":"ground"},{"id":"d03-v-27","x":5772.6,"y":385.4,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-v-28","x":6075,"y":385.4,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-v-29","x":6258.6,"y":455,"w":115.2,"h":192,"kind":"ground"},{"id":"d03-v-30","x":6373.8,"y":407,"w":264,"h":240,"kind":"ground"},{"id":"d03-v-31","x":6729.48,"y":445.16,"w":840,"h":463.2,"kind":"ground"},{"id":"d03-v-32","x":7078.2,"y":253.4,"w":12,"h":120,"kind":"ground"},{"id":"d03-u-1","x":1170,"y":2058.92,"w":648,"h":240,"kind":"ground"},{"id":"d03-u-2","x":1399.2,"y":1941.32,"w":48,"h":86.4,"kind":"ground"},{"id":"d03-u-3","x":1645.68,"y":167.06,"w":72,"h":21.6,"kind":"ground"},{"id":"d03-u-4","x":1666.8,"y":1941.32,"w":48,"h":86.4,"kind":"ground"},{"id":"d03-u-5","x":3244.44,"y":344.6,"w":219.51,"h":43.2,"kind":"ground"},{"id":"d03-u-6","x":3464.04,"y":344.6,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d03-u-7","x":3552.84,"y":366.2,"w":244.8,"h":21.6,"kind":"ground"},{"id":"d03-u-8","x":4845.72,"y":646.52,"w":98.99,"h":39.6,"kind":"ground"},{"id":"d03-u-9","x":4947.72,"y":925.4,"w":48,"h":74.4,"kind":"ground"},{"id":"d03-u-10","x":5103.72,"y":866.36,"w":48,"h":74.4,"kind":"ground"},{"id":"d03-u-11","x":5644.2,"y":681.8,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d03-u-12","x":5945.4,"y":653.72,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d03-u-13","x":6300.6,"y":489.08,"w":33.6,"h":48,"kind":"ground"},{"id":"d03-u-14","x":6730.2,"y":1925.48,"w":480,"h":339.6,"kind":"ground"},{"id":"d03-u-15","x":6958.2,"y":1882.28,"w":12,"h":43.2,"kind":"ground"},{"id":"d03-u-16","x":7114.2,"y":1903.88,"w":96,"h":21.6,"kind":"ground"},{"id":"d03-slope-1","x":4946.53,"w":117.76,"y":323.8,"h":41.6,"kind":"ground","role":"zemin"},{"id":"d03-slope-2","x":5064.29,"w":117.76,"y":365.4,"h":41.6,"kind":"ground","role":"zemin"},{"id":"d03-slope-3","x":5182.04,"w":117.76,"y":407,"h":41.6,"kind":"ground","role":"zemin"}],"visualSupports":[{"id":"d03-v-13","type":"stack-to-ground"}],"obstacles":[{"id":"d03-slide-01","type":"slide","x":1423.2,"w":48,"h":86.4,"baseY":105.8},{"id":"d03-slide-02","type":"slide","x":3693.24,"w":96,"h":21.6,"baseY":387.8},{"id":"d03-vault-01","type":"vault","x":5892.6,"w":24,"h":48,"baseY":407},{"id":"d03-vault-02","type":"vault","x":4706.52,"w":28.8,"h":21.6,"baseY":282.2},{"id":"d03-vault-03","type":"vault","x":5591.4,"w":24,"h":48,"baseY":407}],"coins":makeCoins("D03", COINS.D03)},
    D04: {"routeId":"D04","worldId":"dock31","version":1,"name":"ROOFTOP SHORTCUT","length":8169,"finishX":8029,"checkpoints":[70,3919],"chief":{"startX":3919},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d04-v-03"},{"id":"d04-v-05"},{"id":"d04-v-06"},{"id":"d04-v-08"},{"id":"d04-v-09"},{"id":"d04-v-10"},{"id":"d04-v-15"},{"id":"d04-v-17"},{"id":"d04-v-18"},{"id":"d04-v-21"},{"id":"d04-v-22"},{"id":"d04-v-26"}],"highJumpZones":[],"diveZones":[{"id":"d04-dz-01","x1":3276,"x2":3396,"landX":3846.4,"landY":-83.8},{"id":"d04-dz-02","x1":4809.6,"x2":4882.8,"landX":4922.8,"landY":-155.8},{"id":"d04-dz-03","x1":6974.4,"x2":7094.4,"landX":7634.8,"landY":455}],"groundSegments":[{"id":"d04-v-01","x":0,"y":-376.6,"w":1368,"h":72,"kind":"ground"},{"id":"d04-v-02","x":0,"y":-448.6,"w":240,"h":72,"kind":"ground"},{"id":"d04-v-03","x":379.2,"y":-448.6,"w":312,"h":72,"kind":"ground"},{"id":"d04-v-05","x":830.4,"y":-448.6,"w":543.6,"h":72,"kind":"ground"},{"id":"d04-v-06","x":1058.16,"y":-520.6,"w":144,"h":72,"kind":"ground"},{"id":"d04-v-07","x":1656,"y":-131.8,"w":360,"h":240,"kind":"ground"},{"id":"d04-v-08","x":1656,"y":-203.8,"w":121.2,"h":72,"kind":"ground"},{"id":"d04-v-09","x":1873.2,"y":-203.8,"w":48,"h":72,"kind":"ground"},{"id":"d04-v-10","x":2016,"y":-203.8,"w":1380,"h":240,"kind":"ground"},{"id":"d04-v-13","x":3806.4,"y":-83.8,"w":504,"h":240,"kind":"ground"},{"id":"d04-v-14","x":3829.68,"y":-297.4,"w":42,"h":120,"kind":"ground"},{"id":"d04-v-15","x":4086,"y":-105.4,"w":72,"h":21.6,"kind":"ground"},{"id":"d04-v-16","x":4310.4,"y":-15.4,"w":620.4,"h":171.6,"kind":"ground"},{"id":"d04-v-17","x":4358.4,"y":-83.8,"w":168,"h":68.4,"kind":"ground"},{"id":"d04-v-18","x":4617.6,"y":-83.8,"w":192,"h":68.4,"kind":"ground"},{"id":"d04-v-19","x":4882.8,"y":-155.8,"w":48,"h":140.4,"kind":"ground"},{"id":"d04-v-20","x":4930.8,"y":-83.8,"w":129.6,"h":240,"kind":"ground"},{"id":"d04-v-21","x":5060.4,"y":-155.8,"w":240,"h":312,"kind":"ground"},{"id":"d04-v-22","x":5372.4,"y":-88.6,"w":240,"h":240,"kind":"ground"},{"id":"d04-v-23","x":6273.6,"y":270.2,"w":820.8,"h":240,"kind":"ground"},{"id":"d04-v-24","x":7593.6,"y":276.2,"w":150,"h":87.6,"kind":"ground"},{"id":"d04-v-25","x":7594.8,"y":455,"w":1327.2,"h":308.4,"kind":"ground"},{"id":"d04-v-26","x":7879.2,"y":433.4,"w":87.6,"h":21.6,"kind":"ground"},{"id":"d04-v-27","x":8131.92,"y":265.16,"w":12,"h":120,"kind":"ground"},{"id":"d04-u-1","x":117.6,"y":-413.08,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d04-u-2","x":930,"y":-382.6,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d04-u-3","x":2163.6,"y":-44.68,"w":72,"h":21.6,"kind":"ground"},{"id":"d04-slope-1","x":1374,"w":40.29,"y":-403.34,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-2","x":1414.29,"w":40.29,"y":-358.09,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-3","x":1454.57,"w":40.29,"y":-312.83,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-4","x":1494.86,"w":40.29,"y":-267.57,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-5","x":1535.14,"w":40.29,"y":-222.31,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-6","x":1575.43,"w":40.29,"y":-177.06,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-slope-7","x":1615.71,"w":40.29,"y":-131.8,"h":45.26,"kind":"ground","role":"zemin"},{"id":"d04-long-1","x":5612.4,"w":82.65,"y":-43.75,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-2","x":5695.05,"w":82.65,"y":1.1,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-3","x":5777.7,"w":82.65,"y":45.95,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-4","x":5860.35,"w":82.65,"y":90.8,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-5","x":5943,"w":82.65,"y":135.65,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-6","x":6025.65,"w":82.65,"y":180.5,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-7","x":6108.3,"w":82.65,"y":225.35,"h":44.85,"kind":"ground","role":"zemin"},{"id":"d04-long-8","x":6190.95,"w":82.65,"y":270.2,"h":44.85,"kind":"ground","role":"zemin"}],"visualSupports":[{"id":"d04-v-02","type":"stack-to-ground"},{"id":"d04-v-03","type":"stack-to-ground"},{"id":"d04-v-05","type":"stack-to-ground"}],"slopes":[],"obstacles":[{"id":"d04-slide-01","type":"slide","x":552.72,"w":48,"h":86.4,"baseY":-448.6},{"id":"d04-vault-01","type":"vault","x":877.2,"w":24,"h":48,"baseY":-448.6},{"id":"d04-vault-02","type":"vault","x":2397.6,"w":28.8,"h":21.6,"baseY":-203.8},{"id":"d04-vault-03","type":"vault","x":2600.4,"w":72,"h":48,"baseY":-203.8}],"coins":makeCoins("D04", COINS.D04)},
    D05: {"routeId":"D05","worldId":"dock31","version":1,"name":"CLEAN CHAIN","length":7610,"finishX":7470,"checkpoints":[70,3019.91,6394.48],"chief":{"startX":3019.91},"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d05-up-1"},{"id":"d05-up-2"},{"id":"d05-up-3"},{"id":"d05-v-03"},{"id":"d05-v-04"},{"id":"d05-v-05"},{"id":"d05-v-09"},{"id":"d05-v-13"},{"id":"d05-v-15"},{"id":"d05-v-20"},{"id":"d05-v-21"},{"id":"d05-v-22"}],"highJumpZones":[],"diveZones":[{"id":"d05-dz-01","x1":2204.4,"x2":2324.4,"landX":2598.4,"landY":-489.625},{"id":"d05-dz-02","x1":3362.4,"x2":3482.4,"landX":3952.24,"landY":-265},{"id":"d05-dz-03","x1":6929.97,"x2":7049.97,"landX":7240.96,"landY":365}],"groundSegments":[{"id":"d05-v-01","x":0,"y":-701.75,"w":1154.13,"h":165.6,"kind":"ground"},{"id":"d05-v-02","x":435.6,"y":-819.375,"w":300,"h":117.6,"kind":"ground"},{"id":"d05-v-03","x":600,"y":-841,"w":88.8,"h":21.6,"kind":"ground"},{"id":"d05-v-04","x":813.6,"y":-764.25,"w":66,"h":62.4,"kind":"ground"},{"id":"d05-v-05","x":1150.08,"y":-773.75,"w":819.37,"h":237.6,"kind":"ground"},{"id":"d05-v-06","x":2083.2,"y":-705.375,"w":241.2,"h":312,"kind":"ground"},{"id":"d05-v-07","x":2558.4,"y":-489.625,"w":924,"h":452.4,"kind":"ground"},{"id":"d05-v-08","x":2558.64,"y":-827.125,"w":120,"h":240,"kind":"ground"},{"id":"d05-v-09","x":2803.2,"y":-511.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d05-v-10","x":3912.24,"y":-265,"w":360,"h":632.4,"kind":"ground"},{"id":"d05-v-11","x":4272.24,"y":-202.625,"w":312,"h":324,"kind":"ground"},{"id":"d05-v-12","x":4584.24,"y":-118.625,"w":219.31,"h":240,"kind":"ground"},{"id":"d05-v-13","x":4802.88,"y":-193.25,"w":131.94,"h":314.4,"kind":"ground"},{"id":"d05-v-14","x":5167.44,"y":6.25,"w":132,"h":115.2,"kind":"ground"},{"id":"d05-v-15","x":5299.44,"y":-65.375,"w":308.4,"h":186.72,"kind":"ground"},{"id":"d05-v-17","x":5700.48,"y":23,"w":96,"h":549.6,"kind":"ground"},{"id":"d05-v-18","x":6030.48,"y":203,"w":61.2,"h":369.6,"kind":"ground"},{"id":"d05-v-19","x":6324.48,"y":455,"w":353.37,"h":117.6,"kind":"ground"},{"id":"d05-v-20","x":6677.76,"y":383,"w":420.06,"h":189.6,"kind":"ground"},{"id":"d05-v-21","x":6810,"y":361.375,"w":287.53,"h":21.6,"kind":"ground"},{"id":"d05-v-22","x":6989.52,"y":339.75,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d05-v-23","x":7200.96,"y":365,"w":840,"h":463.2,"kind":"ground"},{"id":"d05-v-24","x":7549.68,"y":173.25,"w":12,"h":120,"kind":"ground"},{"id":"d05-u-1","x":1242,"y":-646.375,"w":48,"h":86.4,"kind":"ground"},{"id":"d05-up-1","x":195.6,"w":80,"y":-741,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-up-2","x":275.6,"w":80,"y":-780.25,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-up-3","x":355.6,"w":80,"y":-819.375,"h":39.2,"kind":"ground","role":"zemin"},{"id":"d05-down1-1","x":4934.82,"w":46.52,"y":-152.875,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-2","x":4981.34,"w":46.52,"y":-113,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-3","x":5027.86,"w":46.52,"y":-73.125,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-4","x":5074.38,"w":46.52,"y":-33.25,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down1-5","x":5120.9,"w":46.52,"y":6.625,"h":39.888,"kind":"ground","role":"zemin"},{"id":"d05-down2-1","x":5796.48,"w":58.5,"y":68,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-2","x":5854.98,"w":58.5,"y":113,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-3","x":5913.48,"w":58.5,"y":158,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down2-4","x":5971.98,"w":58.5,"y":203,"h":45,"kind":"ground","role":"zemin"},{"id":"d05-down3-1","x":6091.68,"w":38.8,"y":245,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-2","x":6130.48,"w":38.8,"y":287,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-3","x":6169.28,"w":38.8,"y":329,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-4","x":6208.08,"w":38.8,"y":371,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-5","x":6246.88,"w":38.8,"y":413,"h":42,"kind":"ground","role":"zemin"},{"id":"d05-down3-6","x":6285.68,"w":38.8,"y":455,"h":42,"kind":"ground","role":"zemin"}],"visualSupports":[{"id":"d05-v-08","type":"stack-to-ground"}],"obstacles":[{"id":"d05-vault-01","type":"vault","x":5420.16,"w":72,"h":48,"baseY":-65.375},{"id":"d05-vault-02","type":"vault","x":5355.12,"w":24,"h":48,"baseY":-65.375},{"id":"d05-vault-03","type":"vault","x":6924.48,"w":24,"h":48,"baseY":361.375}],"coins":makeCoins("D05", COINS.D05)},
    D06: {"routeId":"D06","worldId":"dock31","version":1,"name":"SHIFT SUPERVISOR","length":5130,"finishX":4990,"checkpoints":[70,1560.4,2281.61,3913],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d06-v-02"},{"id":"d06-v-03"},{"id":"d06-v-05"},{"id":"d06-pit1-step-1"},{"id":"d06-pit1-step-2"},{"id":"d06-pit2-step-1"},{"id":"d06-pit2-step-2"},{"id":"d06-v-11"},{"id":"d06-v-14"},{"id":"d06-v-16"},{"id":"d06-v-18"},{"id":"d06-v-22"},{"id":"d06-v-23"},{"id":"d06-v-24"}],"highJumpZones":[],"diveZones":[{"id":"d06-dz-01","x1":937.2,"x2":992.97,"landX":1206.4,"landY":117.75},{"id":"d06-dz-02","x1":1166.4,"x2":1210.17,"landX":1423.6,"landY":44.625},{"id":"d06-dz-03","x1":1658.4,"x2":1778.4,"landX":2057.8,"landY":291.75},{"id":"d06-dz-04","x1":4414.2,"x2":4534.2,"landX":4760.2,"landY":434.625}],"groundSegments":[{"id":"d06-v-01","x":0,"y":191,"w":652.8,"h":237.6,"kind":"ground"},{"id":"d06-v-02","x":258,"y":169.375,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-v-03","x":532.8,"y":169.375,"w":120,"h":21.6,"kind":"ground"},{"id":"d06-v-04","x":652.8,"y":219.75,"w":72,"h":79.2,"kind":"ground"},{"id":"d06-v-05","x":724.8,"y":147.75,"w":96,"h":178.8,"kind":"ground"},{"id":"d06-v-06","x":937.2,"y":191,"w":120,"h":276,"kind":"ground"},{"id":"d06-v-07","x":1057.2,"y":350.625,"w":148.8,"h":116.4,"kind":"ground"},{"id":"d06-v-08","x":1166.4,"y":117.75,"w":120,"h":232.8,"kind":"ground"},{"id":"d06-v-09","x":1286.4,"y":275,"w":97.2,"h":75.6,"kind":"ground"},{"id":"d06-pit1-step-1","x":1094.4,"y":273,"w":36,"h":77.6,"kind":"ground","role":"pit-step"},{"id":"d06-pit1-step-2","x":1130.4,"y":195.375,"w":36,"h":155.2,"kind":"ground","role":"pit-step"},{"id":"d06-pit2-step-1","x":1335.6,"y":198.25,"w":24,"h":76.8,"kind":"ground","role":"pit-step"},{"id":"d06-pit2-step-2","x":1359.6,"y":121.375,"w":24,"h":153.6,"kind":"ground","role":"pit-step"},{"id":"d06-v-10","x":1383.6,"y":44.625,"w":106.8,"h":306,"kind":"ground"},{"id":"d06-v-11","x":1490.4,"y":-3.375,"w":288,"h":354,"kind":"ground"},{"id":"d06-v-13","x":2017.8,"y":291.75,"w":360,"h":240,"kind":"ground"},{"id":"d06-v-14","x":2260.2,"y":248.625,"w":117.6,"h":43.2,"kind":"ground"},{"id":"d06-v-15","x":2466.6,"y":291.75,"w":408,"h":240,"kind":"ground"},{"id":"d06-v-16","x":2523,"y":270.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-v-17","x":2986.2,"y":307.375,"w":169.2,"h":38.4,"kind":"ground"},{"id":"d06-v-18","x":3155.4,"y":225.75,"w":240,"h":120,"kind":"ground"},{"id":"d06-v-19","x":3484.2,"y":422.625,"w":360,"h":240,"kind":"ground"},{"id":"d06-v-21","x":3843,"y":455,"w":691.2,"h":208.32,"kind":"ground"},{"id":"d06-v-22","x":3882.6,"y":367.375,"w":136.8,"h":87.6,"kind":"ground"},{"id":"d06-v-23","x":4141.8,"y":399.75,"w":138,"h":55.2,"kind":"ground"},{"id":"d06-v-24","x":4396.2,"y":384.25,"w":138,"h":70.8,"kind":"ground"},{"id":"d06-v-25","x":4720.2,"y":434.625,"w":840,"h":463.2,"kind":"ground"},{"id":"d06-v-26","x":5068.92,"y":242.875,"w":12,"h":120,"kind":"ground"},{"id":"d06-u-1","x":109.2,"y":257.125,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d06-u-2","x":2986.2,"y":414.25,"w":408,"h":96,"kind":"ground"},{"id":"d06-u-3","x":3084.6,"y":392.625,"w":72,"h":21.6,"kind":"ground"},{"id":"d06-u-4","x":3364.2,"y":345.75,"w":19.2,"h":10.8,"kind":"ground"}],"obstacles":[{"id":"d06-vault-01","type":"vault","x":3627,"w":72,"h":48,"baseY":422.625},{"id":"d06-vault-02","type":"vault","x":1571.76,"w":24,"h":48,"baseY":-3.375},{"id":"d06-vault-03","type":"vault","x":56.4,"w":24,"h":48,"baseY":191},{"id":"d06-vault-04","type":"vault","x":1633.2,"w":72,"h":48,"baseY":-3.375}],"coins":makeCoins("D06", COINS.D06)},
    F01: {"routeId":"F01","worldId":"frozen","version":2,"name":"NIGHT SHIFT","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f01-p1-d07-v-11","x":2962,"y":231.75,"w":1309.2,"h":320.4,"kind":"ground"},{"id":"f01-p1-d07-v-13","x":3188.8,"y":210.25,"w":72,"h":21.6,"kind":"ground"},{"id":"f01-p1-d07-v-12","x":2962,"y":101,"w":19.2,"h":79.2,"kind":"ground"},{"id":"f01-p1-d07-v-07","x":2074,"y":237.75,"w":795.6,"h":240,"kind":"ground"},{"id":"f01-p1-d07-v-08","x":2136.4,"y":194.625,"w":240,"h":43.2,"kind":"ground"},{"id":"f01-p1-d07-v-06","x":1834,"y":151.38,"w":240,"h":326.4,"kind":"ground"},{"id":"f01-p1-d07-v-04","x":682,"y":-7,"w":720,"h":238.8,"kind":"ground"},{"id":"f01-p1-d07-v-03","x":550,"y":163.38,"w":132,"h":68.4,"kind":"ground"},{"id":"f01-p1-d07-v-01","x":70,"y":-7,"w":480,"h":238.8,"kind":"ground"},{"id":"f01-p1-d07-v-02","x":359.2,"y":-28.625,"w":88.8,"h":21.6,"kind":"ground"},{"id":"f01-p2-d13-v-19","x":4271.2,"y":231.75,"w":207.6,"h":240,"kind":"ground"},{"id":"f01-p2-d13-v-20","x":4478.8,"y":303.75,"w":502.8,"h":240,"kind":"ground"},{"id":"f01-p2-d13-v-21","x":4513.6,"y":280.875,"w":97.2,"h":22.8,"kind":"ground"},{"id":"f01-p2-d13-v-22","x":4610.8,"y":231.75,"w":48,"h":72,"kind":"ground"},{"id":"f01-p2-d13-v-23","x":4693.6,"y":282.125,"w":74.4,"h":21.6,"kind":"ground"},{"id":"f01-p2-d13-v-24","x":4768,"y":234.125,"w":52.8,"h":69.6,"kind":"ground"},{"id":"f01-p2-d13-v-25","x":4981.6,"y":375.75,"w":140.4,"h":168,"kind":"ground"},{"id":"f01-p2-d13-v-26","x":5122,"y":303.75,"w":823.2,"h":240,"kind":"ground"},{"id":"f01-p2-d13-v-28","x":6422.8,"y":484.88,"w":504,"h":254.4,"kind":"ground"},{"id":"f01-p2-d13-v-30","x":6926.8,"y":620.5,"w":157.2,"h":120,"kind":"ground"},{"id":"f01-p2-d13-v-32","x":7084,"y":502.875,"w":105.6,"h":152.4,"kind":"ground"},{"id":"f01-p2-d13-slope3-1","x":7189.6,"y":538.5,"w":53.2,"h":35.63,"kind":"ground"},{"id":"f01-p2-d13-slope3-2","x":7242.8,"y":574.13,"w":53.2,"h":35.63,"kind":"ground"},{"id":"f01-p2-d13-slope3-3","x":7296,"y":609.75,"w":53.2,"h":35.63,"kind":"ground"},{"id":"f01-p2-d13-v-33","x":7349.2,"y":609.75,"w":232.8,"h":60,"kind":"ground"},{"id":"f01-p2-d13-slope4-1","x":7582,"y":562.625,"w":74.4,"h":47.19,"kind":"ground"},{"id":"f01-p2-d13-slope4-2","x":7656.4,"y":515.375,"w":74.4,"h":47.19,"kind":"ground"},{"id":"f01-p2-d13-v-34","x":7730.8,"y":515.38,"w":600,"h":240,"kind":"ground"},{"id":"f01-p2-d13-v-37","x":8436.4,"y":499.75,"w":840,"h":463.2,"kind":"ground"}],"catchableSurfaces":[{"id":"f01-p1-d07-v-02"},{"id":"f01-p1-d07-v-04"},{"id":"f01-p1-d07-v-08"},{"id":"f01-p1-d07-v-13"},{"id":"f01-p2-d13-v-19"},{"id":"f01-p2-d13-v-21"},{"id":"f01-p2-d13-v-22"},{"id":"f01-p2-d13-v-23"},{"id":"f01-p2-d13-v-24"},{"id":"f01-p2-d13-v-26"},{"id":"f01-p2-d13-v-32"},{"id":"f01-p2-d13-slope4-1"},{"id":"f01-p2-d13-slope4-2"}],"diveZones":[{"id":"f01-p1-d07-dz-01","x1":550,"x2":590,"landX":722,"landY":-7},{"id":"f01-p1-d07-dz-02","x1":1282,"x2":1322,"landX":1874,"landY":151.38},{"id":"f01-p1-d07-dz-03","x1":2717.2,"x2":2757.2,"landX":3002,"landY":231.75},{"id":"f01-p2-d13-dz-08","x1":5825.2,"x2":5865.2,"landX":6462.8,"landY":484.88},{"id":"f01-p2-d13-dz-09","x1":6926.8,"x2":6966.8,"landX":7124,"landY":502.88},{"id":"f01-p2-d13-dz-10","x1":8239.4,"x2":8279.4,"landX":8476.4,"landY":499.75}],"obstacles":[{"id":"f01-p1-d07-vault-01","type":"vault","x":823.6,"w":72,"h":48,"baseY":-7},{"id":"f01-p1-d07-vault-02","type":"vault","x":2645.2,"w":72,"h":48,"baseY":237.75},{"id":"f01-p1-d07-vault-04","type":"vault","x":2527.6,"w":72,"h":48,"baseY":237.75},{"id":"f01-p2-d13-slide-04","type":"slide","x":5255.2,"w":48,"h":86.4,"baseY":303.75},{"id":"f01-p2-d13-slide-06","type":"slide","x":8160.4,"w":48,"h":86.4,"baseY":515.38},{"id":"f01-p2-d13-vault-01","type":"vault","x":7946.8,"w":72,"h":48,"baseY":515.38},{"id":"f01-p2-d13-vault-06","type":"vault","x":6716.8,"w":72,"h":48,"baseY":484.88},{"id":"f01-hard-1","type":"vault","x":3286,"w":72,"h":48,"baseY":231.75},{"id":"f01-hard-2","type":"slide","x":3584,"w":72,"h":48,"baseY":231.75},{"id":"f01-hard-3","type":"vault","x":3882,"w":72,"h":48,"baseY":231.75},{"id":"f01-hard-4","type":"slide","x":5526,"w":72,"h":48,"baseY":303.75},{"id":"f01-hard-5","type":"vault","x":6682.8,"w":72,"h":48,"baseY":484.88},{"id":"f01-hard-6","type":"slide","x":8696.4,"w":72,"h":48,"baseY":499.75},{"id":"f01-hard-7","type":"vault","x":8994.4,"w":72,"h":48,"baseY":499.75}],"length":9416.4,"finishX":9276.4,"checkpoints":[70,2319.1,4638.2,6957.3],"mode":"hard","coins":makeCoins("F01", COINS.F01)},
    F02: {"routeId":"F02","worldId":"frozen","version":2,"name":"COLD STORAGE","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f02-p1-d08-v-01","x":70,"y":-433,"w":162.93,"h":199.2,"kind":"ground"},{"id":"f02-p1-d08-v-02","x":206.8,"y":-301,"w":261.6,"h":67.2,"kind":"ground"},{"id":"f02-p1-d08-v-03","x":330.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"f02-p1-d08-v-04","x":438.4,"y":-233.75,"w":290.4,"h":58.8,"kind":"ground"},{"id":"f02-p1-d08-v-05","x":589.6,"y":-421,"w":136.8,"h":187.2,"kind":"ground"},{"id":"f02-p1-d08-v-06","x":726.4,"y":-301,"w":516,"h":67.2,"kind":"ground"},{"id":"f02-p1-d08-v-07","x":844,"y":-469,"w":136.8,"h":168,"kind":"ground"},{"id":"f02-p1-d08-v-08","x":1104.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"f02-p1-d08-v-09","x":1342,"y":-231.37,"w":1267.2,"h":240,"kind":"ground"},{"id":"f02-p1-d08-v-10","x":1342,"y":-447.37,"w":136.8,"h":216,"kind":"ground"},{"id":"f02-p1-d08-v-11","x":1478.8,"y":-279.37,"w":528,"h":48,"kind":"ground"},{"id":"f02-p1-d08-v-12","x":1621.6,"y":-349,"w":136.8,"h":69.6,"kind":"ground"},{"id":"f02-p1-d08-v-13","x":1830.16,"y":-301,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-p1-d08-v-14","x":2149.6,"y":-274.625,"w":56.4,"h":43.2,"kind":"ground"},{"id":"f02-p1-d08-v-15","x":2258.8,"y":-291.375,"w":16.8,"h":60,"kind":"ground"},{"id":"f02-p1-d08-v-16","x":2352.4,"y":-253,"w":72,"h":21.6,"kind":"ground"},{"id":"f02-p1-d08-v-17","x":2513.2,"y":-327.375,"w":96,"h":96,"kind":"ground"},{"id":"f02-p1-d08-v-18","x":2717.2,"y":-327.37,"w":408,"h":338.4,"kind":"ground"},{"id":"f02-p1-d08-v-20","x":3125.2,"y":-387.375,"w":48,"h":398.4,"kind":"ground"},{"id":"f02-p1-d08-v-21","x":3173.2,"y":-231.37,"w":756,"h":242.4,"kind":"ground"},{"id":"f02-p1-d08-v-23","x":3485.2,"y":-315.375,"w":120,"h":84,"kind":"ground"},{"id":"f02-p1-d08-v-24","x":4073.2,"y":-231.37,"w":80.88,"h":348,"kind":"ground"},{"id":"f02-p1-d08-v-25","x":4139.2,"y":-169,"w":86.4,"h":115.2,"kind":"ground"},{"id":"f02-p1-d08-v-26","x":4225.6,"y":-105.37,"w":132,"h":51.6,"kind":"ground"},{"id":"f02-p2-d14-v-19","x":4357.6,"y":-105.37,"w":268.8,"h":240,"kind":"ground"},{"id":"f02-p2-d14-v-20","x":4716.4,"y":-119.74,"w":600,"h":240,"kind":"ground"},{"id":"f02-p2-d14-v-23","x":5316.4,"y":-71.74,"w":237.6,"h":240,"kind":"ground"},{"id":"f02-p2-d14-v-24","x":5441.2,"y":-134.25,"w":66,"h":62.4,"kind":"ground"},{"id":"f02-p2-d14-v-25","x":5797.6,"y":111.76,"w":720,"h":62.4,"kind":"ground"},{"id":"f02-p2-d14-v-26","x":5960.8,"y":68.625,"w":88.8,"h":43.2,"kind":"ground"},{"id":"f02-p2-d14-v-28","x":6576.4,"y":163.38,"w":960,"h":240,"kind":"ground"},{"id":"f02-p2-d14-v-30","x":7889.2,"y":221.01,"w":720,"h":398.4,"kind":"ground"},{"id":"f02-p2-d14-v-31","x":8089.6,"y":149,"w":192,"h":72,"kind":"ground"},{"id":"f02-p2-d14-v-34","x":8658.4,"y":137,"w":840,"h":463.2,"kind":"ground"},{"id":"f02-p2-d14-slope2-1","x":5554,"y":-25.87,"w":60.9,"h":45.88,"kind":"ground"},{"id":"f02-p2-d14-slope2-2","x":5614.9,"y":20,"w":60.9,"h":45.88,"kind":"ground"},{"id":"f02-p2-d14-slope2-3","x":5675.8,"y":65.88,"w":60.9,"h":45.88,"kind":"ground"},{"id":"f02-p2-d14-slope2-4","x":5736.7,"y":111.76,"w":60.9,"h":45.88,"kind":"ground"}],"catchableSurfaces":[{"id":"f02-p1-d08-v-03"},{"id":"f02-p1-d08-v-05"},{"id":"f02-p1-d08-v-07"},{"id":"f02-p1-d08-v-08"},{"id":"f02-p1-d08-v-12"},{"id":"f02-p1-d08-v-13"},{"id":"f02-p1-d08-v-14"},{"id":"f02-p1-d08-v-15"},{"id":"f02-p1-d08-v-16"},{"id":"f02-p1-d08-v-17"},{"id":"f02-p1-d08-v-20"},{"id":"f02-p1-d08-v-23"},{"id":"f02-p2-d14-v-24"},{"id":"f02-p2-d14-v-26"},{"id":"f02-p2-d14-v-31"},{"id":"f02-p2-d14-v-34"}],"diveZones":[{"id":"f02-p1-d08-dz-01","x1":468.4,"x2":508.4,"landX":629.6,"landY":-421},{"id":"f02-p1-d08-dz-02","x1":726.4,"x2":766.4,"landX":884,"landY":-469},{"id":"f02-p1-d08-dz-03","x1":1104.4,"x2":1144.4,"landX":1382,"landY":-447.37},{"id":"f02-p1-d08-dz-04","x1":2513.2,"x2":2553.2,"landX":2757.2,"landY":-327.37},{"id":"f02-p1-d08-dz-05","x1":2916.61,"x2":2956.61,"landX":3165.2,"landY":-387.37},{"id":"f02-p1-d08-dz-06","x1":3187.94,"x2":3227.94,"landX":3525.2,"landY":-315.37},{"id":"f02-p1-d08-dz-07","x1":3809.2,"x2":3849.2,"landX":4113.2,"landY":-231.37},{"id":"f02-p2-d14-dz-05","x1":4446.94,"x2":4486.94,"landX":4756.4,"landY":-119.74},{"id":"f02-p2-d14-dz-06","x1":7416.4,"x2":7456.4,"landX":7929.2,"landY":221.01},{"id":"f02-p2-d14-dz-07","x1":8441.14,"x2":8481.14,"landX":8698.4,"landY":137}],"obstacles":[{"id":"f02-p2-d14-vault-06","type":"vault","x":4852.4,"w":72,"h":48,"baseY":-119.74},{"id":"f02-p2-d14-vault-02","type":"vault","x":6260.8,"w":72,"h":48,"baseY":111.76},{"id":"f02-p2-d14-slide-03","type":"slide","x":6716.8,"w":48,"h":86.4,"baseY":163.38},{"id":"f02-hard-1","type":"vault","x":3361.2,"w":72,"h":48,"baseY":-231.37},{"id":"f02-hard-2","type":"slide","x":6988.4,"w":72,"h":48,"baseY":163.38},{"id":"f02-hard-3","type":"vault","x":8846.4,"w":72,"h":48,"baseY":137},{"id":"f02-hard-4","type":"slide","x":9138.4,"w":72,"h":48,"baseY":137}],"length":9638.4,"finishX":9498.4,"checkpoints":[70,2374.6,4749.2,7123.8],"mode":"hard","coins":makeCoins("F02", COINS.F02)},
    F03: {"routeId":"F03","worldId":"frozen","version":2,"name":"BLACK ICE","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f03-p1-d09-v-01","x":70,"y":151.88,"w":314.16,"h":240,"kind":"ground"},{"id":"f03-p1-d09-v-02","x":456.64,"y":151.88,"w":33.6,"h":144,"kind":"ground"},{"id":"f03-p1-d09-v-03","x":589.6,"y":270.625,"w":295.2,"h":120,"kind":"ground"},{"id":"f03-p1-d09-up-1","x":490.24,"y":415.38,"w":33.12,"h":39.58,"kind":"ground"},{"id":"f03-p1-d09-up-2","x":523.36,"y":375.875,"w":33.12,"h":39.58,"kind":"ground"},{"id":"f03-p1-d09-up-3","x":556.48,"y":336.25,"w":33.12,"h":39.58,"kind":"ground"},{"id":"f03-p2-d10-v-01","x":892.8,"y":270.625,"w":720,"h":240,"kind":"ground"},{"id":"f03-p2-d10-v-02","x":1228.8,"y":249,"w":72,"h":21.6,"kind":"ground"},{"id":"f03-p2-d10-v-04","x":1764.48,"y":270.63,"w":136.75,"h":309.6,"kind":"ground"},{"id":"f03-p2-d10-v-05","x":1770.24,"y":335.38,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"f03-p2-d10-v-06","x":1899.84,"y":270.63,"w":136.8,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-07","x":2131.44,"y":270.625,"w":48,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-08","x":2256.24,"y":270.625,"w":48,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-09","x":2304.24,"y":292.26,"w":108,"h":43.2,"kind":"ground"},{"id":"f03-p2-d10-v-10","x":2445.84,"y":270.625,"w":106.8,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-11","x":2552.64,"y":292.26,"w":42,"h":43.2,"kind":"ground"},{"id":"f03-p2-d10-v-12","x":2954.88,"y":385.88,"w":249.6,"h":307.2,"kind":"ground"},{"id":"f03-p2-d10-v-13","x":3079.68,"y":321,"w":124.8,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-14","x":3261.12,"y":455.38,"w":976.8,"h":240,"kind":"ground"},{"id":"f03-p2-d10-v-15","x":3274.08,"y":387,"w":138,"h":67.92,"kind":"ground"},{"id":"f03-p2-d10-v-16","x":3578.4,"y":433.875,"w":72,"h":21.6,"kind":"ground"},{"id":"f03-p2-d10-v-17","x":3760.08,"y":433.875,"w":241.2,"h":21.6,"kind":"ground"},{"id":"f03-p2-d10-v-18","x":3881.52,"y":412.25,"w":120.9,"h":21.6,"kind":"ground"},{"id":"f03-p2-d10-v-19","x":4001.28,"y":390.625,"w":248.58,"h":64.8,"kind":"ground"},{"id":"f03-p2-d10-v-20","x":4099.68,"y":331.875,"w":138,"h":58.8,"kind":"ground"},{"id":"f03-p2-d10-v-21","x":4373.28,"y":455.01,"w":960,"h":48,"kind":"ground"},{"id":"f03-p2-d10-v-22","x":4570.08,"y":433.375,"w":72,"h":21.6,"kind":"ground"},{"id":"f03-p3-d12-v-01","x":5341.28,"y":455,"w":718.8,"h":232.8,"kind":"ground"},{"id":"f03-p3-d12-v-03","x":5797.28,"y":385.375,"w":262.8,"h":69.6,"kind":"ground"},{"id":"f03-p3-d12-v-04","x":5922.08,"y":327.875,"w":138,"h":57.6,"kind":"ground"},{"id":"f03-p3-d12-v-05","x":6176.48,"y":326.64,"w":620.4,"h":301.2,"kind":"ground"},{"id":"f03-p3-d12-v-06","x":6351.68,"y":305,"w":208.8,"h":21.6,"kind":"ground"},{"id":"f03-p3-d12-v-07","x":6472.88,"y":283.375,"w":79.44,"h":21.6,"kind":"ground"},{"id":"f03-p3-d12-v-08","x":6604.88,"y":211.375,"w":192,"h":115.2,"kind":"ground"},{"id":"f03-p3-d12-v-10","x":7129.28,"y":390.26,"w":769.2,"h":301.2,"kind":"ground"},{"id":"f03-p3-d12-v-12","x":7422.08,"y":368.625,"w":88.8,"h":21.6,"kind":"ground"},{"id":"f03-p3-d12-slope-1","x":6796.88,"y":229.89,"w":66.48,"h":40.08,"kind":"ground"},{"id":"f03-p3-d12-slope-2","x":6863.36,"y":270.01,"w":66.48,"h":40.08,"kind":"ground"},{"id":"f03-p3-d12-slope-3","x":6929.84,"y":310.14,"w":66.48,"h":40.08,"kind":"ground"},{"id":"f03-p3-d12-slope-4","x":6996.32,"y":350.14,"w":66.48,"h":40.08,"kind":"ground"},{"id":"f03-p3-d12-slope-5","x":7062.8,"y":390.26,"w":66.48,"h":40.08,"kind":"ground"}],"catchableSurfaces":[{"id":"f03-p1-d09-up-2"},{"id":"f03-p1-d09-up-3"},{"id":"f03-p1-d09-v-03"},{"id":"f03-p2-d10-v-07"},{"id":"f03-p2-d10-v-08"},{"id":"f03-p2-d10-v-10"},{"id":"f03-p2-d10-v-13"},{"id":"f03-p2-d10-v-15"},{"id":"f03-p2-d10-v-16"},{"id":"f03-p2-d10-v-17"},{"id":"f03-p2-d10-v-18"},{"id":"f03-p2-d10-v-19"},{"id":"f03-p2-d10-v-20"},{"id":"f03-p2-d10-v-22"},{"id":"f03-p3-d12-v-03"},{"id":"f03-p3-d12-v-04"},{"id":"f03-p3-d12-v-06"},{"id":"f03-p3-d12-v-07"},{"id":"f03-p3-d12-v-08"},{"id":"f03-p3-d12-v-12"},{"id":"f03-p2-d10-v-01"},{"id":"f03-p2-d10-v-02"},{"id":"f03-p3-d12-v-01"}],"diveZones":[{"id":"f03-p1-d09-dz-01","x1":194.06,"x2":234.06,"landX":496.64,"landY":151.88},{"id":"f03-p2-d10-dz-01","x1":1036.02,"x2":1076.02,"landX":1268.8,"landY":249},{"id":"f03-p2-d10-dz-02","x1":1495.2,"x2":1535.2,"landX":1804.48,"landY":270.63},{"id":"f03-p2-d10-dz-03","x1":2670.11,"x2":2710.11,"landX":2994.88,"landY":385.88},{"id":"f03-p2-d10-dz-04","x1":4209.86,"x2":4249.86,"landX":4413.28,"landY":455.01},{"id":"f03-p3-d12-dz-01","x1":5585.12,"x2":5625.12,"landX":5837.28,"landY":385.38},{"id":"f03-p3-d12-dz-02","x1":5922.08,"x2":5962.08,"landX":6216.48,"landY":326.64},{"id":"f03-p3-d12-dz-03","x1":6296.91,"x2":6336.91,"landX":6644.88,"landY":211.38},{"id":"f03-p3-d12-dz-04","x1":7229.3,"x2":7269.3,"landX":7462.08,"landY":368.63}],"obstacles":[{"id":"f03-p2-d10-vault-04","type":"vault","x":1076.02,"w":24,"h":48,"baseY":270.63},{"id":"f03-p3-d12-vault-03","type":"vault","x":5627.28,"w":24,"h":48,"baseY":455.01},{"id":"f03-hard-1","type":"vault","x":4745.28,"w":72,"h":48,"baseY":455.01},{"id":"f03-hard-2","type":"slide","x":5037.28,"w":72,"h":48,"baseY":455.01},{"id":"f03-hard-3","type":"vault","x":7317.28,"w":72,"h":48,"baseY":390.26},{"id":"f03-hard-4","type":"slide","x":7609.28,"w":72,"h":48,"baseY":390.26}],"length":8038.48,"finishX":7898.48,"checkpoints":[70,1974.62,3949.24,5923.86],"mode":"hard","coins":makeCoins("F03", COINS.F03)},
    F04: {"routeId":"F04","worldId":"frozen","version":2,"name":"ZERO VISIBILITY","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f04-p1-d02-v-01","x":70,"y":-224.2,"w":1280.4,"h":240,"kind":"ground"},{"id":"f04-p1-d02-v-02","x":1352.8,"y":-109,"w":129.6,"h":381.6,"kind":"ground"},{"id":"f04-p1-d02-v-03","x":1352.8,"y":-152.2,"w":88.8,"h":43.2,"kind":"ground"},{"id":"f04-p1-d02-v-04","x":1825.6,"y":65,"w":48,"h":32.4,"kind":"ground"},{"id":"f04-p1-d02-v-05","x":2214.7,"y":362.36,"w":146.6,"h":360,"kind":"ground"},{"id":"f04-p1-d02-v-06","x":2355.58,"y":270.25,"w":1012.8,"h":360,"kind":"ground"},{"id":"f04-p1-d02-v-08","x":2831.92,"y":248.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p1-d02-v-09","x":3116.38,"y":248.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p1-d02-u-1","x":2725.18,"y":301.64,"w":28.8,"h":21.6,"kind":"ground"},{"id":"f04-p1-d02-roof1-1","x":130,"y":-263.75,"w":480,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-roof1-2","x":210,"y":-303.375,"w":320,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-roof1-3","x":290,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-roof2-1","x":668.56,"y":-263.75,"w":480,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-roof2-2","x":748.56,"y":-303.375,"w":320,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-roof2-3","x":828.56,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"f04-p1-d02-slope-1","x":1482.4,"y":-65.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f04-p1-d02-slope-2","x":1568.2,"y":-22,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f04-p1-d02-slope-3","x":1654,"y":21.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f04-p1-d02-slope-4","x":1739.8,"y":65,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f04-p2-d03-v-01","x":3376.38,"y":270.25,"w":620.4,"h":168,"kind":"ground"},{"id":"f04-p2-d03-v-02","x":3376.38,"y":227,"w":225.3,"h":43.2,"kind":"ground"},{"id":"f04-p2-d03-v-03","x":3601.98,"y":205.375,"w":69.6,"h":64.8,"kind":"ground"},{"id":"f04-p2-d03-v-04","x":3840.06,"y":248.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p2-d03-v-05","x":3996.78,"y":291.8,"w":510,"h":145.2,"kind":"ground"},{"id":"f04-p2-d03-v-06","x":4081.56,"y":270.25,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p2-d03-v-07","x":4317.18,"y":270.25,"w":189.6,"h":21.6,"kind":"ground"},{"id":"f04-p2-d03-v-08","x":4555.98,"y":248.6,"w":123.7,"h":439.2,"kind":"ground"},{"id":"f04-p2-d03-v-09","x":4678.38,"y":176.625,"w":1260,"h":120,"kind":"ground"},{"id":"f04-p2-d03-v-11","x":5263.86,"y":155,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p2-d03-u-1","x":4546.38,"y":2129.72,"w":648,"h":240,"kind":"ground"},{"id":"f04-p2-d03-u-2","x":4775.58,"y":2012.12,"w":48,"h":86.4,"kind":"ground"},{"id":"f04-p2-d03-u-3","x":5022.06,"y":237.86,"w":72,"h":21.6,"kind":"ground"},{"id":"f04-p2-d03-u-4","x":5043.18,"y":2012.12,"w":48,"h":86.4,"kind":"ground"},{"id":"f04-p3-d01-v-01","x":5946.38,"y":176.625,"w":441.6,"h":66,"kind":"ground"},{"id":"f04-p3-d01-v-02","x":6954.38,"y":504.2,"w":240,"h":240,"kind":"ground"},{"id":"f04-p3-d01-v-03","x":7194.38,"y":576.2,"w":432,"h":240,"kind":"ground"},{"id":"f04-p3-d01-v-04","x":7197.98,"y":555.75,"w":34.8,"h":20.4,"kind":"ground"},{"id":"f04-p3-d01-v-05","x":7205.66,"y":535.375,"w":15.6,"h":20.4,"kind":"ground"},{"id":"f04-p3-d01-v-06","x":7265.18,"y":504.25,"w":144,"h":72,"kind":"ground"},{"id":"f04-p3-d01-v-07","x":7482.38,"y":504.25,"w":144,"h":72,"kind":"ground"},{"id":"f04-p3-d01-v-08","x":7626.38,"y":600.2,"w":648,"h":240,"kind":"ground"},{"id":"f04-p3-d01-v-09","x":7668.32,"y":537.75,"w":66,"h":62.4,"kind":"ground"},{"id":"f04-p3-d01-v-10","x":8082.38,"y":505.375,"w":192,"h":94.8,"kind":"ground"}],"catchableSurfaces":[{"id":"f04-p1-d02-roof1-1"},{"id":"f04-p1-d02-roof1-2"},{"id":"f04-p1-d02-roof1-3"},{"id":"f04-p1-d02-roof2-1"},{"id":"f04-p1-d02-roof2-2"},{"id":"f04-p1-d02-roof2-3"},{"id":"f04-p1-d02-v-06"},{"id":"f04-p1-d02-v-08"},{"id":"f04-p1-d02-v-09"},{"id":"f04-p2-d03-v-03"},{"id":"f04-p2-d03-v-04"},{"id":"f04-p2-d03-v-06"},{"id":"f04-p2-d03-v-07"},{"id":"f04-p2-d03-v-09"},{"id":"f04-p2-d03-v-11"},{"id":"f04-p3-d01-v-04"},{"id":"f04-p3-d01-v-05"},{"id":"f04-p3-d01-v-06"},{"id":"f04-p3-d01-v-07"},{"id":"f04-p3-d01-v-09"},{"id":"f04-p3-d01-v-10"},{"id":"f04-p2-d03-v-01"},{"id":"f04-p3-d01-v-01"}],"diveZones":[{"id":"f04-p1-d02-dz-01","x1":1755.8,"x2":1795.8,"landX":2254.7,"landY":362.36},{"id":"f04-p3-d01-dz-01","x1":6251.98,"x2":6291.98,"landX":6994.38,"landY":504.2}],"obstacles":[{"id":"f04-p1-d02-vault-06","type":"vault","x":2564.38,"w":28.8,"h":21.6,"baseY":270.2},{"id":"f04-p1-d02-vault-01","type":"vault","x":3216.38,"w":24,"h":48,"baseY":270.2},{"id":"f04-p2-d03-slide-01","type":"slide","x":4799.58,"w":48,"h":86.4,"baseY":176.6},{"id":"f04-hard-1","type":"vault","x":5362.38,"w":72,"h":48,"baseY":176.625},{"id":"f04-hard-2","type":"slide","x":5654.38,"w":72,"h":48,"baseY":176.625},{"id":"f04-hard-3","type":"vault","x":7830.38,"w":72,"h":48,"baseY":600.2}],"length":8414.38,"finishX":8274.38,"checkpoints":[70,2068.59,4137.19,6205.79],"mode":"hard","coins":makeCoins("F04", COINS.F04)},
    D07: {"routeId":"D07","worldId":"dock31","version":1,"name":"NIGHT GANTRY","length":6343.52,"finishX":6203.52,"checkpoints":[70,1918,4825.6],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d07-v-02"},{"id":"d07-v-04"},{"id":"d07-v-08"},{"id":"d07-v-13"},{"id":"d07-v-16"},{"id":"d07-v-18"},{"id":"d07-v-22"}],"highJumpZones":[{"id":"d07-hj-01","x1":2366.4,"x2":2604,"landX":2932,"landY":231.75,"targetId":"d07-v-11"}],"diveZones":[{"id":"d07-dz-01","x1":480,"x2":612,"landX":652,"landY":-7},{"id":"d07-dz-02","x1":1212,"x2":1332,"landX":1804,"landY":151.375},{"id":"d07-dz-03","x1":4081.2,"x2":4201.2,"landX":4619.2,"landY":318.25},{"id":"d07-dz-04a","x1":4787.85,"x2":4907.85,"landX":5117.2,"landY":207.75},{"id":"d07-dz-04","x1":5569.2,"x2":5689.2,"landX":5974,"landY":455}],"groundSegments":[{"id":"d07-v-01","x":0,"y":-7,"w":480,"h":238.8,"kind":"ground"},{"id":"d07-v-02","x":289.2,"y":-28.625,"w":88.8,"h":21.6,"kind":"ground"},{"id":"d07-v-03","x":480,"y":163.375,"w":132,"h":68.4,"kind":"ground"},{"id":"d07-v-04","x":612,"y":-7,"w":720,"h":238.8,"kind":"ground"},{"id":"d07-v-06","x":1764,"y":151.375,"w":240,"h":326.4,"kind":"ground"},{"id":"d07-v-07","x":2004,"y":237.75,"w":795.6,"h":240,"kind":"ground"},{"id":"d07-v-08","x":2066.4,"y":194.625,"w":240,"h":43.2,"kind":"ground"},{"id":"d07-v-11","x":2892,"y":231.75,"w":1309.2,"h":320.4,"kind":"ground"},{"id":"d07-v-12","x":2892,"y":101,"w":19.2,"h":79.2,"kind":"ground"},{"id":"d07-v-13","x":3118.8,"y":210.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d07-v-15","x":4579.2,"y":318.25,"w":176.4,"h":369.6,"kind":"ground"},{"id":"d07-v-16","x":4755.6,"y":270.25,"w":408,"h":280.8,"kind":"ground"},{"id":"d07-v-18","x":5077.2,"y":207.75,"w":66,"h":62.4,"kind":"ground"},{"id":"d07-v-19","x":5163.6,"y":311,"w":525.6,"h":240,"kind":"ground"},{"id":"d07-v-22","x":5562.72,"y":248.625,"w":126.48,"h":62.4,"kind":"ground"},{"id":"d07-v-23","x":5934,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"d07-v-24","x":6282.72,"y":263.25,"w":12,"h":120,"kind":"ground"}],"obstacles":[{"id":"d07-slide-01","type":"slide","x":4850.4,"w":48,"h":86.4,"baseY":270.25},{"id":"d07-slide-02","type":"slide","x":5238.24,"w":48,"h":86.4,"baseY":311},{"id":"d07-slide-03","type":"slide","x":5385.36,"w":48,"h":86.4,"baseY":311},{"id":"d07-vault-01","type":"vault","x":775.2,"w":28.8,"h":21.6,"baseY":-7},{"id":"d07-vault-02","type":"vault","x":2596.8,"w":28.8,"h":21.6,"baseY":237.75},{"id":"d07-vault-03","type":"vault","x":3404.4,"w":28.8,"h":21.6,"baseY":231.75},{"id":"d07-vault-04","type":"vault","x":2479.2,"w":28.8,"h":21.6,"baseY":237.75}],"coins":makeCoins("D07", COINS.D07),"chief":{"startX":1918}},
    D08: {"routeId":"D08","worldId":"dock31","version":1,"name":"REEFER ROW","length":8604.32,"finishX":8464.32,"checkpoints":[70,2496,6073.6],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d08-v-03"},{"id":"d08-v-05"},{"id":"d08-v-07"},{"id":"d08-v-08"},{"id":"d08-v-12"},{"id":"d08-v-13"},{"id":"d08-v-14"},{"id":"d08-v-15"},{"id":"d08-v-16"},{"id":"d08-v-17"},{"id":"d08-v-20"},{"id":"d08-v-23"},{"id":"d08-v-28"},{"id":"d08-v-29"}],"highJumpZones":[],"diveZones":[{"id":"d08-dz-01","x1":398.4,"x2":519.6,"landX":559.6,"landY":-421},{"id":"d08-dz-02","x1":656.4,"x2":774,"landX":814,"landY":-469},{"id":"d08-dz-03","x1":1034.4,"x2":1093.46,"landX":1312,"landY":-447.375},{"id":"d08-dz-04","x1":2443.2,"x2":2504.62,"landX":2687.2,"landY":-327.375},{"id":"d08-dz-05-assist","x1":2940,"x2":3042,"landX":3095.2,"landY":-387.375},{"id":"d08-dz-05b-assist","x1":3380,"x2":3460,"landX":4043.2,"landY":-231.375},{"id":"d08-dz-05","x1":3739.2,"x2":3859.2,"landX":4043.2,"landY":-231.375},{"id":"d08-dz-06-assist","x1":4288,"x2":4320,"landX":4367.2,"landY":-205},{"id":"d08-dz-06","x1":5504.4,"x2":5624.4,"landX":6043.6,"landY":32.625},{"id":"d08-dz-07-assist","x1":6950,"x2":7010,"landX":7032.4,"landY":11},{"id":"d08-dz-07","x1":7629.84,"x2":7748.4,"landX":8234.8,"landY":455}],"groundSegments":[{"id":"d08-v-01","x":0,"y":-433,"w":162.93,"h":199.2,"kind":"ground"},{"id":"d08-v-02","x":136.8,"y":-301,"w":261.6,"h":67.2,"kind":"ground"},{"id":"d08-v-03","x":260.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"d08-v-04","x":368.4,"y":-233.75,"w":290.4,"h":58.8,"kind":"ground"},{"id":"d08-v-05","x":519.6,"y":-421,"w":136.8,"h":187.2,"kind":"ground"},{"id":"d08-v-06","x":656.4,"y":-301,"w":516,"h":67.2,"kind":"ground"},{"id":"d08-v-07","x":774,"y":-469,"w":136.8,"h":168,"kind":"ground"},{"id":"d08-v-08","x":1034.4,"y":-359.75,"w":138,"h":58.8,"kind":"ground"},{"id":"d08-v-09","x":1272,"y":-231.375,"w":1267.2,"h":240,"kind":"ground","role":"airport-fill"},{"id":"d08-v-10","x":1272,"y":-447.375,"w":136.8,"h":216,"kind":"ground"},{"id":"d08-v-11","x":1408.8,"y":-279.375,"w":528,"h":48,"kind":"ground"},{"id":"d08-v-12","x":1551.6,"y":-349,"w":136.8,"h":357.63,"kind":"ground","role":"airport-solid"},{"id":"d08-v-13","x":1760.16,"y":-301,"w":72,"h":21.6,"kind":"ground"},{"id":"d08-v-14","x":2079.6,"y":-274.625,"w":56.4,"h":43.2,"kind":"ground"},{"id":"d08-v-15","x":2188.8,"y":-291.375,"w":16.8,"h":60,"kind":"ground"},{"id":"d08-v-16","x":2282.4,"y":-253,"w":72,"h":21.6,"kind":"ground"},{"id":"d08-v-17","x":2443.2,"y":-327.375,"w":96,"h":96,"kind":"ground"},{"id":"d08-v-18","x":2647.2,"y":-327.375,"w":408,"h":338.4,"kind":"ground"},{"id":"d08-v-20","x":3055.2,"y":-387.375,"w":48,"h":398.4,"kind":"ground"},{"id":"d08-v-21","x":3103.2,"y":-231.375,"w":756,"h":242.4,"kind":"ground"},{"id":"d08-v-23","x":3415.2,"y":-315.375,"w":120,"h":84,"kind":"ground"},{"id":"d08-v-24","x":4003.2,"y":-231.375,"w":80.88,"h":348,"kind":"ground"},{"id":"d08-v-25","x":4069.2,"y":-169,"w":86.4,"h":115.2,"kind":"ground"},{"id":"d08-v-26","x":4155.6,"y":-105.375,"w":132,"h":51.6,"kind":"ground"},{"id":"d08-v-28","x":4327.2,"y":-205,"w":490.8,"h":145.2,"kind":"ground"},{"id":"d08-v-29","x":4595.76,"y":-226.625,"w":72,"h":21.6,"kind":"ground"},{"id":"d08-u-1","x":4789.2,"y":-143.75,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d08-v-30","x":4902,"y":-67,"w":722.4,"h":145.2,"kind":"ground"},{"id":"d08-v-31","x":4986,"y":-347.75,"w":634.8,"h":145.2,"kind":"ground"},{"id":"d08-v-32","x":6003.6,"y":32.625,"w":1344,"h":434.4,"kind":"ground"},{"id":"d08-v-37","x":6992.4,"y":11,"w":72,"h":21.6,"kind":"ground"},{"id":"d08-v-39","x":7700.4,"y":239,"w":48,"h":32.4,"kind":"ground"},{"id":"d08-v-40","x":8194.8,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"d08-v-41","x":8543.52,"y":263.25,"w":12,"h":120,"kind":"ground"},{"id":"d08-slope-1","x":7347.6,"w":70.56,"y":73.875,"h":41.275,"kind":"ground","role":"zemin"},{"id":"d08-slope-2","x":7418.160000000001,"w":70.56,"y":115.125,"h":41.275,"kind":"ground","role":"zemin"},{"id":"d08-slope-3","x":7488.72,"w":70.56,"y":156.5,"h":41.275,"kind":"ground","role":"zemin"},{"id":"d08-slope-4","x":7559.280000000001,"w":70.56,"y":197.75,"h":41.275,"kind":"ground","role":"zemin"},{"id":"d08-slope-5","x":7629.84,"w":70.56,"y":239,"h":41.275,"kind":"ground","role":"zemin"}],"visualSupports":[{"id":"d08-v-31","type":"stack-to-ground"}],"obstacles":[{"id":"d08-slide-01","type":"slide","x":2868,"w":48,"h":86.4,"baseY":-327.375},{"id":"d08-slide-02","type":"slide","x":3247.2,"w":48,"h":86.4,"baseY":-231.375},{"id":"d08-slide-03","type":"slide","x":4221.6,"w":48,"h":86.4,"baseY":-105.375},{"id":"d08-vault-01","type":"vault","x":6243.6,"w":28.8,"h":21.6,"baseY":32.625},{"id":"d08-vault-02","type":"vault","x":7186.8,"w":28.8,"h":21.6,"baseY":32.625},{"id":"d08-vault-03","type":"vault","x":6560.4,"w":28.8,"h":21.6,"baseY":32.625},{"id":"d08-vault-04","type":"vault","x":6402,"w":28.8,"h":21.6,"baseY":32.625},{"id":"d08-vault-05","type":"vault","x":6774,"w":28.8,"h":21.6,"baseY":32.625}],"coins":makeCoins("D08", COINS.D08),"chief":{"startX":2496}},
    D09: {"routeId":"D09","worldId":"dock31","version":1,"name":"BERTH SEVEN","length":8058.56,"finishX":7977.84,"checkpoints":[70,2176,4842],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d09-ir-06"},{"id":"d09-ir-10"},{"id":"d09-ir-10"},{"id":"d09-ir-13"},{"id":"d09-ir-14"},{"id":"d09-ir-14"},{"id":"d09-ir-18"},{"id":"d09-ir-19"},{"id":"d09-ir-22"},{"id":"d09-ir-24"},{"id":"d09-ir-26"},{"id":"d09-ir-26"},{"id":"d09-ir-23"},{"id":"d09-ir-34"},{"id":"d09-ir-36"},{"id":"d09-ir-38"},{"id":"d09-ir-39"},{"id":"d09-ir-43"},{"id":"d09-ir-43"},{"id":"d09-ir-45"}],"highJumpZones":[{"id":"d09-highjump500-06","x1":950.64,"x2":1010.64,"landX":1281.84,"landY":233.5,"peakY":111.5},{"id":"d09-highjump500-11","x1":1695.84,"x2":1755.84,"landX":1962.64,"landY":106.25,"peakY":-51.75},{"id":"d09-highjump500-25","x1":4418.4,"x2":4478.4,"landX":4516.24,"landY":398.625,"peakY":276.63},{"id":"d09-highjump500-29","x1":4988,"x2":5060,"landX":5515.84,"landY":258.25,"peakY":136.25},{"id":"d09-highjump500-33","x1":5265.84,"x2":5325.84,"landX":5515.84,"landY":258.25,"peakY":136.25}],"diveZones":[],"groundSegments":[{"id":"d09-ir-01","x":0,"y":151.875,"w":314.16,"h":240,"kind":"ground"},{"id":"d09-ir-03","x":386.64,"y":151.875,"w":132.96,"h":144,"kind":"ground"},{"id":"d09-ir-04","x":519.6,"y":270.625,"w":295.2,"h":120,"kind":"ground"},{"id":"d09-ir-05","x":692.4,"y":249.125,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-06","x":860,"y":270.625,"w":190,"h":240,"kind":"ground"},{"id":"d09-ir-07","x":1049.76,"y":351.125,"w":318.12,"h":159.6,"kind":"ground"},{"id":"d09-ir-08","x":1257.84,"y":233.5,"w":48,"h":86.4,"kind":"ground"},{"id":"d09-ir-09","x":1368.24,"y":423.125,"w":82.8,"h":87.6,"kind":"ground"},{"id":"d09-ir-10","x":1451.04,"y":233.5,"w":240,"h":277.2,"kind":"ground"},{"id":"d09-ir-11","x":1559.04,"y":211.875,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-12","x":1826.64,"y":352.25,"w":248.4,"h":186,"kind":"ground","role":"airport-fill"},{"id":"d09-ir-13","x":1720,"y":165.125,"w":389.84,"h":373.2,"kind":"ground","role":"airport-solid"},{"id":"d09-ir-14","x":1922.64,"y":106.25,"w":187.2,"h":58.8,"kind":"ground"},{"id":"d09-ir-15","x":2018.64,"y":84.625,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-16","x":2075.04,"y":280.25,"w":223.2,"h":258,"kind":"ground"},{"id":"d09-ir-17","x":2171.04,"y":258.625,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-18","x":2298.24,"y":208.25,"w":210,"h":330,"kind":"ground"},{"id":"d09-ir-19","x":2599.44,"y":353.5,"w":420,"h":184.8,"kind":"ground"},{"id":"d09-ir-20","x":2702.64,"y":310.25,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d09-ir-21","x":3019.44,"y":411.125,"w":144,"h":127.2,"kind":"ground"},{"id":"d09-ir-22","x":3163.44,"y":352.25,"w":240,"h":186,"kind":"ground"},{"id":"d09-ir-23","x":3266.64,"y":234.625,"w":48,"h":303.675,"kind":"ground"},{"id":"d09-ir-24","x":3300,"y":287,"w":341.04,"h":240,"kind":"ground"},{"id":"d09-ir-25","x":3641.04,"y":330.25,"w":134.46,"h":21.6,"kind":"ground"},{"id":"d09-ir-26","x":3775.44,"y":277.375,"w":480,"h":120,"kind":"ground"},{"id":"d09-ir-27","x":4261.44,"y":441.75,"w":214.8,"h":196.8,"kind":"ground"},{"id":"d09-ir-28","x":4476.24,"y":398.625,"w":600,"h":240,"kind":"ground"},{"id":"d09-ir-29","x":5030,"y":377,"w":114.64,"h":21.6,"kind":"ground","role":"airport-step"},{"id":"d09-ir-30","x":4741.2,"y":398.625,"w":28.8,"h":21.6,"kind":"ground","role":"airport-flush"},{"id":"d09-ir-31","x":5104.64,"y":347,"w":48,"h":49.2,"kind":"ground","role":"airport-step"},{"id":"d09-ir-32","x":4913.52,"y":398.625,"w":87.6,"h":21.6,"kind":"ground","role":"airport-flush"},{"id":"d09-ir-33","x":5204.64,"y":325.375,"w":28.8,"h":21.6,"kind":"ground","role":"airport-step"},{"id":"d09-ir-34","x":5070,"y":347,"w":405.84,"h":374.4,"kind":"ground"},{"id":"d09-ir-35","x":5284.08,"y":439.375,"w":72,"h":21.6,"kind":"ground"},{"id":"d09-ir-36","x":5475.84,"y":258.25,"w":354,"h":240,"kind":"ground"},{"id":"d09-ir-37","x":5588.64,"y":402.875,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-38","x":5709.84,"y":186.25,"w":120,"h":72,"kind":"ground"},{"id":"d09-ir-39","x":6000,"y":455,"w":792.24,"h":132,"kind":"ground"},{"id":"d09-ir-40","x":6300,"y":407,"w":320,"h":48,"kind":"ground"},{"id":"d09-ir-42","x":6620,"y":411.75,"w":161.44,"h":43.2,"kind":"ground"},{"id":"d09-ir-43","x":6792.24,"y":347,"w":360,"h":240,"kind":"ground"},{"id":"d09-ir-44","x":6939.84,"y":325.375,"w":28.8,"h":21.6,"kind":"ground"},{"id":"d09-ir-45","x":7150,"y":347,"w":947.84,"h":463.2,"kind":"ground"},{"id":"d09-ir-46","x":7606.56,"y":155.25,"w":12,"h":120,"kind":"ground"}],"obstacles":[{"id":"d09-ir-vault-01","type":"vault","x":670.8,"w":72,"h":48,"baseY":270.625},{"id":"d09-ir-vault-02","type":"vault","x":1513.44,"w":72,"h":48,"baseY":233.5},{"id":"d09-ir-vault-03","type":"vault","x":1537.44,"w":72,"h":48,"baseY":233.5},{"id":"d09-ir-vault-04","type":"vault","x":1997.04,"w":72,"h":48,"baseY":106.25},{"id":"d09-ir-slide-01","type":"slide","x":3820,"w":48,"h":86.4,"baseY":277.375},{"id":"d09-ir-slide-02","type":"slide","x":3932,"w":48,"h":86.4,"baseY":277.375},{"id":"d09-ir-slide-03","type":"slide","x":4044,"w":48,"h":86.4,"baseY":277.375},{"id":"d09-ir-slide-04","type":"slide","x":3661.84,"w":48,"h":86.4,"baseY":287},{"id":"d09-ir-vault-07","type":"vault","x":5567.04,"w":72,"h":48,"baseY":258.25},{"id":"d09-ir-vault-08","type":"vault","x":6843.84,"w":72,"h":48,"baseY":347},{"id":"d09-ir-vault-09","type":"vault","x":6918.24,"w":72,"h":48,"baseY":347}],"coins":makeCoins("D09", COINS.D09),"chief":{"startX":2176},"scriptedMoveZones":[{"id":"d09-speedvault-04","move":"TriggerSpeedVault","x":639.6,"x1":543.6,"x2":603.6},{"id":"d09-catch-05","move":"TriggerCatch","x":978.24,"x1":882.24,"x2":942.24},{"id":"d09-highjump500-06","move":"TriggerHighJump500","x":1100.64,"x1":950.64,"x2":1010.64},{"id":"d09-reversevault-07","move":"TriggerReverseVault","x":1482.24,"x1":1386.24,"x2":1446.24},{"id":"d09-catch-08","move":"TriggerCatch","x":1489.44,"x1":1393.44,"x2":1453.44},{"id":"d09-speedvault-09","move":"TriggerSpeedVault","x":1506.24,"x1":1410.24,"x2":1470.24},{"id":"d09-catch-10","move":"TriggerCatch","x":1633.44,"x1":1537.44,"x2":1597.44},{"id":"d09-highjump500-11","move":"TriggerHighJump500","x":1845.84,"x1":1695.84,"x2":1755.84},{"id":"d09-catch-12","move":"TriggerCatch","x":1955.04,"x1":1859.04,"x2":1919.04},{"id":"d09-speedvault-13","move":"TriggerSpeedVault","x":1965.84,"x1":1869.84,"x2":1929.84},{"id":"d09-catch-14","move":"TriggerCatch","x":2109.84,"x1":2013.84,"x2":2073.84},{"id":"d09-catch-15","move":"TriggerCatch","x":2424.24,"x1":2328.24,"x2":2388.24},{"id":"d09-catch-16","move":"TriggerCatch","x":2945.04,"x1":2849.04,"x2":2909.04},{"id":"d09-slide-17","move":"TriggerSlide","x":2969.04,"x1":2873.04,"x2":2933.04},{"id":"d09-slide-18","move":"TriggerSlide","x":3171.84,"x1":3075.84,"x2":3135.84},{"id":"d09-catch-19","move":"TriggerCatch","x":3197.76,"x1":3101.76,"x2":3161.76},{"id":"d09-slide-20","move":"TriggerSlide","x":3209.04,"x1":3113.04,"x2":3173.04},{"id":"d09-catch-21","move":"TriggerCatch","x":3575.04,"x1":3479.04,"x2":3539.04},{"id":"d09-slide-22","move":"TriggerSlide","x":3585.84,"x1":3489.84,"x2":3549.84},{"id":"d09-catch-23","move":"TriggerCatch","x":3812.64,"x1":3716.64,"x2":3776.64},{"id":"d09-catchfast-24","move":"TriggerCatchFast","x":4134.24,"x1":4038.24,"x2":4098.24},{"id":"d09-highjump500-25","move":"TriggerHighJump500","x":4568.4,"x1":4418.4,"x2":4478.4},{"id":"d09-catch-26","move":"TriggerCatch","x":4659.36,"x1":4563.36,"x2":4623.36},{"id":"d09-speedvault-27","move":"TriggerSpeedVault","x":4688.4,"x1":4592.4,"x2":4652.4},{"id":"d09-catch-28","move":"TriggerCatch","x":4698.24,"x1":4602.24,"x2":4662.24},{"id":"d09-highjump500-29","move":"TriggerHighJump500","x":5110.24,"x1":4988,"x2":5060},{"id":"d09-jumptoedge-30","move":"TriggerJumpToEdge","x":5120,"x1":5010,"x2":5080},{"id":"d09-speedvault-31","move":"TriggerSpeedVault","x":5160,"x1":5070,"x2":5140},{"id":"d09-catch-32","move":"TriggerCatch","x":5203.2,"x1":5107.2,"x2":5167.2},{"id":"d09-highjump500-33","move":"TriggerHighJump500","x":5415.84,"x1":5265.84,"x2":5325.84},{"id":"d09-catch-34","move":"TriggerCatch","x":5505.12,"x1":5409.12,"x2":5469.12},{"id":"d09-speedvault-35","move":"TriggerSpeedVault","x":5535.84,"x1":5439.84,"x2":5499.84},{"id":"d09-catch-36","move":"TriggerCatch","x":5761.68,"x1":5665.68,"x2":5725.68},{"id":"d09-catch-37","move":"TriggerCatch","x":6209.76,"x1":6113.76,"x2":6173.76},{"id":"d09-slide-38","move":"TriggerSlide","x":6260.64,"x1":6164.64,"x2":6224.64},{"id":"d09-slide-39","move":"TriggerSlide","x":6260.64,"x1":6164.64,"x2":6224.64},{"id":"d09-slide-40","move":"TriggerSlide","x":6269.04,"x1":6173.04,"x2":6233.04},{"id":"d09-barrelvaulttrick0high-41","move":"TriggerBarrelVaultTrick0High","x":6812.64,"x1":6716.64,"x2":6776.64},{"id":"d09-catch-42","move":"TriggerCatch","x":6861.84,"x1":6765.84,"x2":6825.84},{"id":"d09-speedvault-43","move":"TriggerSpeedVault","x":6887.04,"x1":6791.04,"x2":6851.04},{"id":"d09-catch-44","move":"TriggerCatch","x":7028.16,"x1":6932.16,"x2":6992.16},{"id":"d09-catch-45","move":"TriggerCatch","x":7456.56,"x1":7360.56,"x2":7420.56},{"id":"d09-ir-vault-01-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-01","x":670.8,"x1":543.6,"x2":640.8,"endX":690.8,"top":170.63},{"id":"d09-ir-vault-02-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-02","x":1513.44,"x1":1410.24,"x2":1483.44,"endX":1533.44,"top":133.5},{"id":"d09-ir-vault-03-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-03","x":1537.44,"x1":1410.24,"x2":1507.44,"endX":1557.44,"top":133.5},{"id":"d09-ir-vault-04-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-04","x":1997.04,"x1":1869.84,"x2":1967.04,"endX":2017.04,"top":6.25},{"id":"d09-ir-slide-01-scripted","move":"TriggerSlide","kind":"slide","obstacleId":"d09-ir-slide-01","x":3820,"x1":3760,"x2":3804},{"id":"d09-ir-slide-02-scripted","move":"TriggerSlide","kind":"slide","obstacleId":"d09-ir-slide-02","x":3932,"x1":3872,"x2":3916},{"id":"d09-ir-slide-03-scripted","move":"TriggerSlide","kind":"slide","obstacleId":"d09-ir-slide-03","x":4044,"x1":3984,"x2":4028},{"id":"d09-ir-slide-04-scripted","move":"TriggerSlide","kind":"slide","obstacleId":"d09-ir-slide-04","x":3661.84,"x1":3601.84,"x2":3645.84},{"id":"d09-ir-vault-07-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-07","x":5567.04,"x1":5439.84,"x2":5537.04,"endX":5587.04,"top":158.25},{"id":"d09-ir-vault-08-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-08","x":6843.84,"x1":6716.64,"x2":6813.84,"endX":6863.84,"top":247},{"id":"d09-ir-vault-09-scripted","move":"TriggerVault","kind":"vault","obstacleId":"d09-ir-vault-09","x":6918.24,"x1":6791.04,"x2":6888.24,"endX":6938.24,"top":247}],"visualSupports":[{"id":"d09-ir-01","type":"stack-to-ground"},{"id":"d09-ir-03","type":"stack-to-ground"},{"id":"d09-ir-04","type":"stack-to-ground"},{"id":"d09-ir-05","type":"stack-to-ground"},{"id":"d09-ir-25","type":"stack-to-ground"},{"id":"d09-ir-26","type":"stack-to-ground"},{"id":"d09-ir-30","type":"stack-to-ground"},{"id":"d09-ir-31","type":"stack-to-ground"},{"id":"d09-ir-32","type":"stack-to-ground"},{"id":"d09-ir-37","type":"stack-to-ground"}],"visualAttachments":[{"targetId":"d09-ir-slide-01","type":"suspend"},{"targetId":"d09-ir-slide-02","type":"suspend"},{"targetId":"d09-ir-slide-03","type":"suspend"},{"targetId":"d09-ir-slide-04","type":"suspend"}]},
    D10: {"routeId":"D10","worldId":"dock31","version":1,"name":"STACK RUNNER","length":9081.44,"finishX":8941.44,"checkpoints":[70,2845,6154],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d10-v-07"},{"id":"d10-v-08"},{"id":"d10-v-10"},{"id":"d10-v-13"},{"id":"d10-v-15"},{"id":"d10-v-16"},{"id":"d10-v-17"},{"id":"d10-v-18"},{"id":"d10-v-19"},{"id":"d10-v-20"},{"id":"d10-v-22"},{"id":"d10-v-27"},{"id":"d10-v-28"},{"id":"d10-v-30"},{"id":"d10-v-31"},{"id":"d10-v-32"},{"id":"d10-v-33"},{"id":"d10-v-39"}],"highJumpZones":[],"diveZones":[{"id":"d10-dz-01","x1":143.22,"x2":183.22,"landX":376,"landY":-112.625},{"id":"d10-dz-02","x1":602.4,"x2":720,"landX":911.68,"landY":-91},{"id":"d10-dz-03","x1":1777.31,"x2":1897.31,"landX":2102.08,"landY":24.25},{"id":"d10-dz-04","x1":3317.06,"x2":3357.06,"landX":3520.48,"landY":93.375},{"id":"d10-dz-05","x1":4320.48,"x2":4440.48,"landX":4848.88,"landY":213.5},{"id":"d10-dz-06","x1":4997.7,"x2":5037.7,"landX":5230.48,"landY":192},{"id":"d10-dz-06-assist","x1":5100,"x2":5162,"landX":5230.48,"landY":192},{"id":"d10-dz-07","x1":5349.55,"x2":5389.55,"landX":5602.48,"landY":141.5},{"id":"d10-dz-07-assist","x1":5460,"x2":5536,"landX":5602.48,"landY":141.5},{"id":"d10-dz-08","x1":5839.77,"x2":5959.77,"landX":6189.52,"landY":334.25},{"id":"d10-dz-09","x1":7327.08,"x2":7447.08,"landX":7710.64,"landY":455},{"id":"d10-dz-10","x1":7741.06,"x2":7861.06,"landX":8053.84,"landY":433.375},{"id":"d10-dz-11","x1":8288.64,"x2":8390.64,"landX":8606.56,"landY":454.25}],"groundSegments":[{"id":"d10-v-01","x":0,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"d10-v-02","x":336,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-04","x":871.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"d10-v-05","x":877.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"d10-v-06","x":1007.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"d10-v-07","x":1238.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"d10-v-08","x":1363.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"d10-v-09","x":1411.44,"y":-69.375,"w":108,"h":43.2,"kind":"ground"},{"id":"d10-v-10","x":1553.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"d10-v-11","x":1659.84,"y":-69.375,"w":42,"h":43.2,"kind":"ground"},{"id":"d10-v-12","x":2062.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"d10-v-13","x":2186.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"d10-v-14","x":2368.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"d10-v-15","x":2381.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"d10-v-16","x":2685.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-17","x":2867.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"d10-v-18","x":2988.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"d10-v-19","x":3108.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"d10-v-20","x":3206.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"d10-v-21","x":3480.48,"y":93.375,"w":960,"h":48,"kind":"ground"},{"id":"d10-v-22","x":3677.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-23","x":4808.88,"y":213.5,"w":1200,"h":240,"kind":"ground"},{"id":"d10-v-25","x":5190.48,"y":192,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-27","x":5562.48,"y":141.5,"w":40.8,"h":72,"kind":"ground"},{"id":"d10-v-28","x":5840.88,"y":192,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-29","x":6149.52,"y":334.25,"w":1297.56,"h":240,"kind":"ground","role":"airport-fill"},{"id":"d10-v-30","x":6288.72,"y":286.25,"w":600,"h":48,"kind":"ground"},{"id":"d10-v-31","x":6408.72,"y":264.625,"w":480,"h":309.63,"kind":"ground","role":"airport-solid"},{"id":"d10-v-32","x":6970.32,"y":264.625,"w":48,"h":69.6,"kind":"ground"},{"id":"d10-v-33","x":7155.12,"y":312.625,"w":72,"h":21.6,"kind":"ground"},{"id":"d10-v-34","x":7670.64,"y":455,"w":720,"h":240,"kind":"ground"},{"id":"d10-v-36","x":8013.84,"y":433.375,"w":88.8,"h":21.6,"kind":"ground"},{"id":"d10-v-38","x":8566.56,"y":454.25,"w":320.4,"h":315.6,"kind":"ground"},{"id":"d10-v-39","x":8760.96,"y":367.875,"w":426,"h":86.4,"kind":"ground"}],"obstacles":[{"id":"d10-vault-04","type":"vault","x":119.22,"w":24,"h":48,"baseY":-91},{"id":"d10-vault-01","type":"vault","x":530.4,"w":72,"h":48,"baseY":-91},{"id":"d10-slide-01","type":"slide","x":5022.48,"w":48,"h":86.4,"baseY":213.5},{"id":"d10-slide-02","type":"slide","x":5394.48,"w":48,"h":86.4,"baseY":213.5},{"id":"d10-vault-02","type":"vault","x":7779.84,"w":72,"h":48,"baseY":455},{"id":"d10-vault-05","type":"vault","x":8216.64,"w":72,"h":48,"baseY":455}],"coins":makeCoins("D10", COINS.D10),"chief":{"startX":2845}},
    D11: {"routeId":"D11","worldId":"dock31","version":1,"name":"HARBOR ROOFS","length":9920,"finishX":9780,"checkpoints":[70,3655,7110,9435],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d11-v-03"},{"id":"d11-v-06"},{"id":"d11-v-09"},{"id":"d11-v-10"},{"id":"d11-deadend-i11-step-1"},{"id":"d11-deadend-i11-step-2"},{"id":"d11-deadend-i11-step-3"},{"id":"d11-tunnel-floor"},{"id":"d11-v-20"},{"id":"d11-v-21"},{"id":"d11-v-28"},{"id":"d11-slope2-2"},{"id":"d11-v-30"},{"id":"d11-v-33"}],"highJumpZones":[],"diveZones":[{"id":"d11-dz-01","x1":189.05,"x2":309.05,"landX":492.4,"landY":-907.25},{"id":"d11-dz-02","x1":1282.95,"x2":1322.95,"landX":1544.8,"landY":-1004.5},{"id":"d11-dz-03","x1":1712.8,"x2":1795.05,"landX":2004.4,"landY":-1066.875},{"id":"d11-dz-04","x1":2316.8,"x2":2356.8,"landX":2396.8,"landY":-1145.625},{"id":"d11-dz-05","x1":2608.8,"x2":2715.55,"landX":2927.2,"landY":-828,"peakY":-925.7},{"id":"d11-dz-06","x1":3574.8,"x2":3694.8,"landX":3862,"landY":-828,"peakY":-925.7},{"id":"d11-dz-07","x1":4351.2,"x2":4407.13,"landX":4841.2,"landY":-919.25},{"id":"d11-dz-08","x1":5874,"x2":5994,"landX":6330.4,"landY":-25},{"id":"d11-dz-09","x1":7186.8,"x2":7306.8,"landX":8447.44,"landY":455},{"id":"d11-dz-10","x1":9037.44,"x2":9157.44,"landX":9405.04,"landY":275.75}],"groundSegments":[{"id":"d11-v-01","x":0,"y":-906,"w":372,"h":205.2,"kind":"ground"},{"id":"d11-v-02","x":452.4,"y":-907.25,"w":960,"h":240,"kind":"ground"},{"id":"d11-v-03","x":675.6,"y":-991.25,"w":144,"h":84,"kind":"ground"},{"id":"d11-v-06","x":1504.8,"y":-1004.5,"w":890.4,"h":72,"kind":"ground"},{"id":"d11-v-09","x":1964.4,"y":-1066.875,"w":66,"h":62.4,"kind":"ground"},{"id":"d11-v-10","x":2030.4,"y":-1120.875,"w":314.4,"h":116.4,"kind":"ground"},{"id":"d11-v-11","x":2344.8,"y":-1075.25,"w":12,"h":70.8,"kind":"ground"},{"id":"d11-v-13","x":2464.8,"y":-1286.5,"w":72,"h":254.4,"kind":"ground"},{"id":"d11-v-14","x":2608.8,"y":-643.25,"w":278.4,"h":144,"kind":"ground"},{"id":"d11-v-17","x":3642,"y":-1257.625,"w":42,"h":301.2,"kind":"ground"},{"id":"d11-v-18","x":3822,"y":-828,"w":144,"h":567.6,"kind":"ground"},{"id":"d11-v-19","x":3966,"y":-780,"w":441.13,"h":519.6,"kind":"ground"},{"id":"d11-v-20","x":4086,"y":-828,"w":72,"h":48,"kind":"ground"},{"id":"d11-v-21","x":4230,"y":-828,"w":121.2,"h":48,"kind":"ground"},{"id":"d11-v-22","x":4393.2,"y":-439.25,"w":532.8,"h":178.8,"kind":"ground"},{"id":"d11-v-24","x":4801.2,"y":-919.25,"w":124.8,"h":91.2,"kind":"ground"},{"id":"d11-v-25","x":5034,"y":-373,"w":960,"h":48,"kind":"ground"},{"id":"d11-v-27","x":6290.4,"y":-25,"w":541.2,"h":628.8,"kind":"ground"},{"id":"d11-v-28","x":6759.12,"y":-68.25,"w":72,"h":43.2,"kind":"ground"},{"id":"d11-v-29","x":6831.6,"y":55.375,"w":450,"h":80.4,"kind":"ground","role":"airport-fill"},{"id":"d11-v-30","x":7040.4,"y":8.625,"w":266.4,"h":46.8,"kind":"ground"},{"id":"d11-v-32","x":8407.44,"y":455,"w":957.6,"h":448.8,"kind":"ground"},{"id":"d11-v-33","x":9365.04,"y":275.75,"w":555.6,"h":393.6,"kind":"ground"},{"id":"d11-tunnel-floor","x":2887.2,"y":-828,"w":807.6,"h":328.8,"kind":"ground"},{"id":"d11-slope1-1","x":4605.6,"y":26.375,"w":138.24,"h":45.6,"kind":"ground"},{"id":"d11-slope1-2","x":4743.84,"y":-19.25,"w":138.24,"h":45.6,"kind":"ground"},{"id":"d11-slope2-1","x":6831.12,"y":8.625,"w":104.4,"h":38.4,"kind":"ground"},{"id":"d11-slope2-2","x":6935.52,"y":-29.75,"w":104.4,"h":165.53,"kind":"ground","role":"airport-solid"},{"id":"d11-deadend-i11-step-1","x":2356.8,"y":-1145.625,"w":36,"h":141.18,"kind":"ground"},{"id":"d11-deadend-i11-step-2","x":2392.8,"y":-1216.125,"w":36,"h":211.68,"kind":"ground"},{"id":"d11-deadend-i11-step-3","x":2428.8,"y":-1286.5,"w":36,"h":282.05,"kind":"ground"}],"visualSupports":[{"id":"d11-v-28","type":"stack-to-ground"}],"obstacles":[{"id":"d11-slide-02","type":"slide","x":7282.32,"w":588,"h":60,"baseY":8.625},{"id":"d11-vault-02","type":"vault","x":4839.84,"w":24,"h":48,"baseY":-439.25},{"id":"d11-vault-03","type":"vault","x":4638,"w":24,"h":48,"baseY":-439.25},{"id":"d11-vault-04","type":"vault","x":2685.84,"w":72,"h":48,"baseY":-956.5},{"id":"d11-vault-05","type":"vault","x":1640.8,"w":72,"h":48,"baseY":-1004.5},{"id":"d11-vault-06","type":"vault","x":1100.4,"w":72,"h":48,"baseY":-907.25},{"id":"d11-vault-07","type":"vault","x":1683.05,"w":72,"h":48,"baseY":-1004.5},{"id":"d11-vault-08","type":"vault","x":5230.8,"w":72,"h":48,"baseY":-373}],"coins":makeCoins("D11", COINS.D11),"chief":{"startX":3655}},
    D12: {"routeId":"D12","worldId":"dock31","version":1,"name":"QUAY SPRINT","length":7142,"finishX":7002,"checkpoints":[70,1858,3600,5599],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d12-v-03"},{"id":"d12-v-04"},{"id":"d12-v-06"},{"id":"d12-v-07"},{"id":"d12-v-08"},{"id":"d12-v-13"},{"id":"d12-v-17"},{"id":"d12-v-22"},{"id":"d12-v-25"},{"id":"d12-v-29"},{"id":"d12-v-24"},{"id":"d12-v-12"}],"highJumpZones":[],"diveZones":[{"id":"d12-dz-01","x1":243.84,"x2":283.84,"landX":496,"landY":-266.25},{"id":"d12-dz-02","x1":580.8,"x2":691.86,"landX":875.2,"landY":-325},{"id":"d12-dz-03","x1":955.63,"x2":1075.63,"landX":1303.6,"landY":-440.25},{"id":"d12-dz-04","x1":1888.02,"x2":1928.02,"landX":2120.8,"landY":-283},{"id":"d12-dz-05","x1":2378.86,"x2":2498.86,"landX":2730.4,"landY":-135.375},{"id":"d12-dz-06","x1":3168.89,"x2":3208.89,"landX":3418.24,"landY":-75.375},{"id":"d12-dz-07","x1":4258.8,"x2":4378.8,"landX":4746.4,"landY":299},{"id":"d12-dz-08","x1":5242.8,"x2":5285.32,"landX":5487.28,"landY":347},{"id":"d12-dz-09","x1":6179.28,"x2":6299.28,"landX":6608.08,"landY":336.25}],"groundSegments":[{"id":"d12-v-01","x":0,"y":-196.625,"w":718.8,"h":232.8,"kind":"ground"},{"id":"d12-v-03","x":456,"y":-266.25,"w":262.8,"h":69.6,"kind":"ground"},{"id":"d12-v-04","x":580.8,"y":-323.75,"w":138,"h":57.6,"kind":"ground"},{"id":"d12-v-05","x":835.2,"y":-325,"w":620.4,"h":301.2,"kind":"ground"},{"id":"d12-v-06","x":1010.4,"y":-346.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"d12-v-07","x":1131.6,"y":-368.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"d12-v-08","x":1263.6,"y":-440.25,"w":192,"h":115.2,"kind":"ground"},{"id":"d12-v-10","x":1788,"y":-261.375,"w":769.2,"h":301.2,"kind":"ground"},{"id":"d12-v-12","x":2080.8,"y":-283,"w":88.8,"h":21.6,"kind":"ground"},{"id":"d12-v-13","x":2218.8,"y":-357.375,"w":154.8,"h":96,"kind":"ground"},{"id":"d12-v-14","x":2690.4,"y":-135.375,"w":240,"h":507.6,"kind":"ground"},{"id":"d12-v-15","x":2930.4,"y":-13,"w":573.6,"h":385.2,"kind":"ground"},{"id":"d12-v-17","x":3378.24,"y":-75.375,"w":66,"h":62.4,"kind":"ground"},{"id":"d12-v-18","x":3504,"y":113,"w":874.8,"h":259.2,"kind":"ground"},{"id":"d12-v-20","x":4706.4,"y":299,"w":188.4,"h":871.2,"kind":"ground"},{"id":"d12-v-21","x":4894.8,"y":455,"w":450,"h":69.6,"kind":"ground"},{"id":"d12-v-22","x":5242.8,"y":390.25,"w":322.8,"h":64.8,"kind":"ground"},{"id":"d12-v-24","x":5447.28,"y":347,"w":118.8,"h":43.2,"kind":"ground"},{"id":"d12-v-25","x":5528.88,"y":294.25,"w":770.4,"h":52.8,"kind":"ground"},{"id":"d12-v-28","x":6568.08,"y":336.25,"w":1327.2,"h":308.4,"kind":"ground"},{"id":"d12-v-29","x":6852.48,"y":314.625,"w":87.6,"h":21.6,"kind":"ground"},{"id":"d12-slope-1","x":1455.6,"y":-421.75,"w":66.48,"h":40.08,"kind":"ground"},{"id":"d12-slope-2","x":1522.08,"y":-381.625,"w":66.48,"h":40.08,"kind":"ground"},{"id":"d12-slope-3","x":1588.56,"y":-341.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"d12-slope-4","x":1655.04,"y":-301.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"d12-slope-5","x":1721.52,"y":-261.375,"w":66.48,"h":40.08,"kind":"ground"}],"obstacles":[{"id":"d12-slide-01","type":"slide","x":3089.89,"w":48,"h":86.4,"baseY":-13},{"id":"d12-vault-03","type":"vault","x":102,"w":24,"h":48,"baseY":-196.625},{"id":"d12-vault-05","type":"vault","x":5662.08,"w":24,"h":48,"baseY":294.25},{"id":"d12-vault-07","type":"vault","x":5668.92,"w":72,"h":48,"baseY":294.25}],"coins":makeCoins("D12", COINS.D12),"chief":{"startX":1858}},
    D13: {"routeId":"D13","worldId":"dock31","version":1,"name":"BOLLARD LINE","length":9043.52,"finishX":8903.52,"checkpoints":[70,1683.6,3950.64,5508],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d13-slope1-2"},{"id":"d13-slope1-3"},{"id":"d13-v-07"},{"id":"d13-v-14"},{"id":"d13-v-19"},{"id":"d13-v-21"},{"id":"d13-v-22"},{"id":"d13-v-23"},{"id":"d13-v-24"},{"id":"d13-v-26"},{"id":"d13-v-32"},{"id":"d13-slope4-1"},{"id":"d13-slope4-2"},{"id":"d13-v-16"},{"id":"d13-slope1-1"}],"highJumpZones":[],"diveZones":[{"id":"d13-dz-01","x1":175.17,"x2":215.17,"landX":415.6,"landY":-237.375},{"id":"d13-dz-02","x1":573.82,"x2":693.82,"landX":876.4,"landY":-316.625},{"id":"d13-dz-03","x1":1103.8,"x2":1158,"landX":1198,"landY":-391},{"id":"d13-dz-04","x1":1373,"x2":1434,"landX":1723.6,"landY":-218.25},{"id":"d13-dz-05","x1":2515.2,"x2":2635.2,"landX":3112,"landY":174.25},{"id":"d13-dz-06","x1":3820.8,"x2":3884.4,"landX":3924.4,"landY":123.75},{"id":"d13-dz-07","x1":4163.13,"x2":4283.13,"landX":4508.8,"landY":66.25},{"id":"d13-dz-08","x1":6022.8,"x2":6142.8,"landX":6660.4,"landY":319.375},{"id":"d13-dz-09","x1":7124.4,"x2":7281.6,"landX":7321.6,"landY":337.375},{"id":"d13-dz-10","x1":8437,"x2":8484.03,"landX":8674,"landY":334.25}],"groundSegments":[{"id":"d13-v-01","x":0,"y":-197.75,"w":375.6,"h":120,"kind":"ground"},{"id":"d13-v-03","x":600,"y":-316.625,"w":120,"h":116.4,"kind":"ground"},{"id":"d13-v-04","x":836.4,"y":-316.625,"w":120,"h":237.6,"kind":"ground"},{"id":"d13-v-05","x":956.4,"y":-223,"w":201.6,"h":144,"kind":"ground"},{"id":"d13-v-07","x":1158,"y":-391,"w":276,"h":240,"kind":"ground"},{"id":"d13-v-09","x":1683.6,"y":-218.25,"w":120,"h":591.6,"kind":"ground"},{"id":"d13-v-10","x":2035.2,"y":-14.25,"w":600,"h":240,"kind":"ground"},{"id":"d13-v-12","x":3072,"y":174.25,"w":1344,"h":571.2,"kind":"ground"},{"id":"d13-v-14","x":3556.8,"y":102.25,"w":264,"h":72,"kind":"ground"},{"id":"d13-v-16","x":3884.4,"y":123.75,"w":66,"h":50.4,"kind":"ground"},{"id":"d13-v-19","x":4468.8,"y":66.25,"w":207.6,"h":240,"kind":"ground"},{"id":"d13-v-20","x":4676.4,"y":138.25,"w":502.8,"h":240,"kind":"ground"},{"id":"d13-v-21","x":4711.2,"y":115.375,"w":97.2,"h":22.8,"kind":"ground"},{"id":"d13-v-22","x":4808.4,"y":66.25,"w":48,"h":72,"kind":"ground"},{"id":"d13-v-23","x":4891.2,"y":116.625,"w":74.4,"h":21.6,"kind":"ground"},{"id":"d13-v-24","x":4965.6,"y":68.625,"w":52.8,"h":69.6,"kind":"ground"},{"id":"d13-v-25","x":5179.2,"y":210.25,"w":140.4,"h":168,"kind":"ground"},{"id":"d13-v-26","x":5319.6,"y":138.25,"w":823.2,"h":240,"kind":"ground"},{"id":"d13-v-28","x":6620.4,"y":319.375,"w":504,"h":254.4,"kind":"ground"},{"id":"d13-v-30","x":7124.4,"y":455,"w":157.2,"h":120,"kind":"ground"},{"id":"d13-v-32","x":7281.6,"y":337.375,"w":105.6,"h":152.4,"kind":"ground"},{"id":"d13-v-33","x":7546.8,"y":444.25,"w":232.8,"h":60,"kind":"ground"},{"id":"d13-v-34","x":7928.4,"y":349.875,"w":600,"h":240,"kind":"ground"},{"id":"d13-v-37","x":8634,"y":334.25,"w":840,"h":463.2,"kind":"ground"},{"id":"d13-slope1-1","x":375.6,"y":-237.375,"w":74.8,"h":39.63,"kind":"ground"},{"id":"d13-slope1-2","x":450.4,"y":-277,"w":74.8,"h":39.63,"kind":"ground"},{"id":"d13-slope1-3","x":525.2,"y":-316.625,"w":74.8,"h":39.63,"kind":"ground"},{"id":"d13-slope2-1","x":1803.6,"y":-177.5,"w":46.32,"h":40.8,"kind":"ground"},{"id":"d13-slope2-2","x":1849.92,"y":-136.625,"w":46.32,"h":40.8,"kind":"ground"},{"id":"d13-slope2-3","x":1896.24,"y":-95.875,"w":46.32,"h":40.8,"kind":"ground"},{"id":"d13-slope2-4","x":1942.56,"y":-55,"w":46.32,"h":40.8,"kind":"ground"},{"id":"d13-slope2-5","x":1988.88,"y":-14.25,"w":46.32,"h":40.8,"kind":"ground"},{"id":"d13-slope3-1","x":7387.2,"y":373,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d13-slope3-2","x":7440.4,"y":408.625,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d13-slope3-3","x":7493.6,"y":444.25,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d13-slope4-1","x":7779.6,"y":397.125,"w":74.4,"h":47.19,"kind":"ground"},{"id":"d13-slope4-2","x":7854,"y":349.875,"w":74.4,"h":47.19,"kind":"ground"}],"obstacles":[{"id":"d13-vault-02","type":"vault","x":103.17,"w":72,"h":48,"baseY":-197.75},{"id":"d13-slide-01","type":"slide","x":1024.8,"w":48,"h":86.4,"baseY":-223},{"id":"d13-slide-02","type":"slide","x":1294,"w":48,"h":86.4,"baseY":-391},{"id":"d13-vault-03","type":"vault","x":3238.8,"w":24,"h":48,"baseY":174.25},{"id":"d13-vault-04","type":"vault","x":3655.2,"w":72,"h":48,"baseY":102.25},{"id":"d13-vault-05","type":"vault","x":4070.4,"w":72,"h":48,"baseY":174.25},{"id":"d13-slide-03","type":"slide","x":4268.4,"w":48,"h":86.4,"baseY":174.25},{"id":"d13-slide-04","type":"slide","x":5452.8,"w":48,"h":86.4,"baseY":138.25},{"id":"d13-vault-06","type":"vault","x":6914.4,"w":72,"h":48,"baseY":319.375},{"id":"d13-slide-05","type":"slide","x":7176,"w":48,"h":86.4,"baseY":455},{"id":"d13-vault-01","type":"vault","x":8144.4,"w":72,"h":48,"baseY":349.875},{"id":"d13-slide-06","type":"slide","x":8358,"w":48,"h":86.4,"baseY":349.875}],"coins":makeCoins("D13", COINS.D13),"chief":{"startX":1683.6}},
    D14: {"routeId":"D14","worldId":"dock31","version":1,"name":"CUSTOMS YARD","length":9084.32,"finishX":8944.32,"checkpoints":[70,396.24,3008.88,6332.16],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d14-v-06"},{"id":"d14-slope1-2"},{"id":"d14-slope1-3"},{"id":"d14-v-11"},{"id":"d14-v-16"},{"id":"d14-v-24"},{"id":"d14-v-26"},{"id":"d14-v-31"},{"id":"d14-v-34"},{"id":"d14-slope1-1"}],"highJumpZones":[],"diveZones":[{"id":"d14-dz-01","x1":1535.97,"x2":1575.97,"landX":1776.4,"landY":263.875},{"id":"d14-dz-02","x1":2055.6,"x2":2156.83,"landX":2344,"landY":99.75},{"id":"d14-dz-03","x1":2544,"x2":2617.04,"landX":2867.2,"landY":30.25},{"id":"d14-dz-04","x1":3627.6,"x2":3747.6,"landX":4054,"landY":83},{"id":"d14-dz-05","x1":4463.34,"x2":4583.34,"landX":4772.8,"landY":114.25},{"id":"d14-dz-06","x1":7432.8,"x2":7552.8,"landX":7945.6,"landY":455},{"id":"d14-dz-07","x1":8457.54,"x2":8497.54,"landX":8714.8,"landY":371}],"groundSegments":[{"id":"d14-v-01","x":0,"y":188.125,"w":240,"h":240,"kind":"ground"},{"id":"d14-v-02","x":240,"y":231.375,"w":542.4,"h":241.2,"kind":"ground"},{"id":"d14-v-03","x":240,"y":209.75,"w":157.2,"h":21.6,"kind":"ground"},{"id":"d14-v-05","x":782.4,"y":303.375,"w":187.2,"h":147.6,"kind":"ground"},{"id":"d14-v-06","x":969.6,"y":231.375,"w":240,"h":240,"kind":"ground"},{"id":"d14-v-08","x":1281.6,"y":303.375,"w":454.8,"h":240,"kind":"ground"},{"id":"d14-v-10","x":1938,"y":184.75,"w":117.6,"h":240,"kind":"ground"},{"id":"d14-v-11","x":2055.6,"y":109.375,"w":120,"h":240,"kind":"ground"},{"id":"d14-v-12","x":2304,"y":99.75,"w":240,"h":240,"kind":"ground"},{"id":"d14-v-14","x":2544,"y":218.625,"w":232.8,"h":240,"kind":"ground"},{"id":"d14-v-16","x":2827.2,"y":30.25,"w":920.4,"h":360,"kind":"ground"},{"id":"d14-v-18","x":4014,"y":83,"w":360,"h":225.6,"kind":"ground"},{"id":"d14-v-19","x":4374,"y":128.625,"w":268.8,"h":240,"kind":"ground"},{"id":"d14-v-20","x":4732.8,"y":114.25,"w":600,"h":240,"kind":"ground"},{"id":"d14-v-23","x":5332.8,"y":162.25,"w":237.6,"h":240,"kind":"ground"},{"id":"d14-v-24","x":5457.6,"y":99.75,"w":66,"h":62.4,"kind":"ground"},{"id":"d14-v-25","x":5814,"y":345.75,"w":720,"h":62.4,"kind":"ground"},{"id":"d14-v-26","x":5977.2,"y":302.625,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d14-v-28","x":6592.8,"y":397.375,"w":960,"h":240,"kind":"ground"},{"id":"d14-v-30","x":7905.6,"y":455,"w":720,"h":398.4,"kind":"ground"},{"id":"d14-v-31","x":8106,"y":383,"w":192,"h":72,"kind":"ground"},{"id":"d14-v-34","x":8674.8,"y":371,"w":840,"h":463.2,"kind":"ground"},{"id":"d14-slope1-1","x":1736.4,"y":263.875,"w":67.2,"h":39.54,"kind":"ground"},{"id":"d14-slope1-2","x":1803.6,"y":224.25,"w":67.2,"h":39.54,"kind":"ground"},{"id":"d14-slope1-3","x":1870.8,"y":184.75,"w":67.2,"h":39.54,"kind":"ground"},{"id":"d14-slope2-1","x":5570.4,"y":208.125,"w":60.9,"h":45.88,"kind":"ground"},{"id":"d14-slope2-2","x":5631.3,"y":254,"w":60.9,"h":45.88,"kind":"ground"},{"id":"d14-slope2-3","x":5692.2,"y":299.875,"w":60.9,"h":45.88,"kind":"ground"},{"id":"d14-slope2-4","x":5753.1,"y":345.75,"w":60.9,"h":45.88,"kind":"ground"}],"obstacles":[{"id":"d14-slide-01","type":"slide","x":1144.56,"w":48,"h":86.4,"baseY":231.375},{"id":"d14-slide-02","type":"slide","x":2654.4,"w":48,"h":86.4,"baseY":218.625},{"id":"d14-slide-03","type":"slide","x":6733.2,"w":48,"h":86.4,"baseY":397.375},{"id":"d14-vault-01","type":"vault","x":2440,"w":72,"h":48,"baseY":99.75},{"id":"d14-vault-02","type":"vault","x":6277.2,"w":72,"h":48,"baseY":345.75},{"id":"d14-vault-03","type":"vault","x":2963.2,"w":72,"h":48,"baseY":30.25},{"id":"d14-vault-04","type":"vault","x":5100.96,"w":72,"h":48,"baseY":114.25},{"id":"d14-vault-05","type":"vault","x":8181.36,"w":72,"h":48,"baseY":383},{"id":"d14-vault-06","type":"vault","x":4868.8,"w":72,"h":48,"baseY":114.25},{"id":"d14-vault-07","type":"vault","x":546,"w":72,"h":48,"baseY":231.375},{"id":"d14-vault-08","type":"vault","x":1463.97,"w":72,"h":48,"baseY":303.375},{"id":"d14-vault-09","type":"vault","x":8385.54,"w":72,"h":48,"baseY":455}],"coins":makeCoins("D14", COINS.D14),"chief":{"startX":396.24}},
    D15: {"routeId":"D15","worldId":"dock31","version":1,"name":"DRY DOCK","length":8646.08,"finishX":8506.08,"checkpoints":[70,746.16,3210.96,5365.44],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d15-v-02"},{"id":"d15-v-14"},{"id":"d15-v-16"},{"id":"d15-v-17"},{"id":"d15-v-18"},{"id":"d15-v-19"},{"id":"d15-v-20"},{"id":"d15-v-25"},{"id":"d15-v-28"},{"id":"d15-v-29"},{"id":"d15-v-30"},{"id":"d15-v-33"},{"id":"d15-v-37"},{"id":"d15-v-35"},{"id":"d15-v-13"}],"highJumpZones":[],"diveZones":[{"id":"d15-dz-01","x1":342.96,"x2":443.45,"landX":626.8,"landY":337.875},{"id":"d15-dz-02","x1":801.8,"x2":905.41,"landX":1134.4,"landY":219.375},{"id":"d15-dz-03","x1":2104.02,"x2":2144.02,"landX":2336.8,"landY":391.375},{"id":"d15-dz-04","x1":2488.86,"x2":2608.86,"landX":2822.8,"landY":243.75},{"id":"d15-dz-05","x1":4375.2,"x2":4495.2,"landX":4937.2,"landY":293},{"id":"d15-dz-06","x1":5786.4,"x2":5906.4,"landX":6355.6,"landY":433.375},{"id":"d15-dz-07","x1":7582.62,"x2":7702.62,"landX":7904.32,"landY":326.375},{"id":"d15-dz-08","x1":7953.12,"x2":8055.48,"landX":8276.56,"landY":274.75}],"groundSegments":[{"id":"d15-v-01","x":0,"y":408.25,"w":210,"h":240,"kind":"ground"},{"id":"d15-v-02","x":210,"y":336.25,"w":240,"h":240,"kind":"ground"},{"id":"d15-v-04","x":586.8,"y":337.875,"w":354,"h":240,"kind":"ground"},{"id":"d15-v-06","x":1094.4,"y":219.375,"w":127.2,"h":148.8,"kind":"ground"},{"id":"d15-v-07","x":1221.6,"y":289.375,"w":484.8,"h":240,"kind":"ground"},{"id":"d15-v-10","x":1801.2,"y":413,"w":664.8,"h":240,"kind":"ground"},{"id":"d15-v-13","x":2296.8,"y":391.375,"w":169.2,"h":21.6,"kind":"ground"},{"id":"d15-v-14","x":2466,"y":318.25,"w":316.8,"h":240,"kind":"ground"},{"id":"d15-v-16","x":2782.8,"y":243.75,"w":600,"h":240,"kind":"ground"},{"id":"d15-v-17","x":2899.2,"y":222.25,"w":79.2,"h":21.6,"kind":"ground"},{"id":"d15-v-18","x":3032.4,"y":200.625,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d15-v-19","x":3213.84,"y":179,"w":96,"h":64.8,"kind":"ground"},{"id":"d15-v-20","x":3409.2,"y":177.75,"w":1086,"h":369.6,"kind":"ground"},{"id":"d15-v-23","x":4897.2,"y":293,"w":169.2,"h":240,"kind":"ground"},{"id":"d15-v-24","x":5066.4,"y":361.375,"w":116.4,"h":50.4,"kind":"ground"},{"id":"d15-v-25","x":5182.8,"y":293,"w":723.6,"h":120,"kind":"ground"},{"id":"d15-v-26","x":6315.6,"y":455,"w":636,"h":240,"kind":"ground"},{"id":"d15-v-27","x":6315.6,"y":433.375,"w":240,"h":21.6,"kind":"ground"},{"id":"d15-v-28","x":6628.56,"y":433.375,"w":160.08,"h":21.6,"kind":"ground"},{"id":"d15-v-29","x":6700.56,"y":411.75,"w":79.44,"h":21.6,"kind":"ground"},{"id":"d15-v-30","x":6951.6,"y":382.75,"w":288,"h":240,"kind":"ground"},{"id":"d15-v-32","x":7311.36,"y":443,"w":229.2,"h":240,"kind":"ground"},{"id":"d15-v-33","x":7540.56,"y":369.5,"w":600,"h":240,"kind":"ground"},{"id":"d15-v-35","x":7864.32,"y":326.375,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d15-v-37","x":8236.56,"y":274.75,"w":840,"h":463.2,"kind":"ground"}],"obstacles":[{"id":"d15-slide-01","type":"slide","x":722.8,"w":48,"h":86.4,"baseY":337.875},{"id":"d15-slide-02","type":"slide","x":1642.8,"w":48,"h":86.4,"baseY":289.375},{"id":"d15-slide-04","type":"slide","x":3526.8,"w":48,"h":86.4,"baseY":177.75},{"id":"d15-vault-01","type":"vault","x":3728.4,"w":72,"h":48,"baseY":177.75},{"id":"d15-vault-03","type":"vault","x":1466.4,"w":72,"h":48,"baseY":289.375},{"id":"d15-vault-04","type":"vault","x":270.96,"w":72,"h":48,"baseY":336.25},{"id":"d15-vault-05","type":"vault","x":1936.8,"w":72,"h":48,"baseY":413},{"id":"d15-vault-06","type":"vault","x":7195.8,"w":72,"h":48,"baseY":382.75}],"coins":makeCoins("D15", COINS.D15),"chief":{"startX":746.16}},
    D16: {"routeId":"D16","worldId":"dock31","version":1,"name":"PILOT TOWER","length":8009.12,"finishX":7869.12,"checkpoints":[70,3149.04,4585.44,6433.68],"movementProfile":"vector-v1","catchableSurfaces":[{"id":"d16-v-06"},{"id":"d16-v-08"},{"id":"d16-v-09"},{"id":"d16-v-10"},{"id":"d16-v-12"},{"id":"d16-v-15"},{"id":"d16-v-21"},{"id":"d16-v-17"},{"id":"d16-s-wall-1"},{"id":"d16-s-wall-2"},{"id":"d16-s-wall-3"}],"highJumpZones":[],"wallJumpZones":[{"id":"d16-wj-01","x1":4477.2,"x2":4573.2,"yTop":-734.25,"yBottom":-648.25,"exitX":4613.2,"exitY":-734.25,"rise":86,"duration":2.23}],"diveZones":[{"id":"d16-dz-01","x1":839.02,"x2":959.02,"landX":1141.6,"landY":-1373.75},{"id":"d16-dz-02","x1":1584,"x2":1704,"landX":2413.6,"landY":-929.75},{"id":"d16-dz-03","x1":2841.6,"x2":2932.8,"landX":2972.8,"landY":-860.25},{"id":"d16-dz-04","x1":3331.2,"x2":3384,"landX":3424,"landY":-889},{"id":"d16-dz-05","x1":3639.6,"x2":3687.6,"landX":3727.6,"landY":-910.625},{"id":"d16-dz-06","x1":3687.6,"x2":3807.6,"landX":4216,"landY":-1082.25},{"id":"d16-dz-08","x1":4622.4,"x2":4696.8,"landX":4736.8,"landY":-755.75},{"id":"d16-dz-09","x1":5601.6,"x2":5721.6,"landX":6654.4,"landY":89}],"groundSegments":[{"id":"d16-v-01","x":0,"y":-1373.75,"w":981.6,"h":303.6,"kind":"ground"},{"id":"d16-v-03","x":1101.6,"y":-1373.75,"w":602.4,"h":633.6,"kind":"ground"},{"id":"d16-v-04","x":2373.6,"y":-929.75,"w":240,"h":600,"kind":"ground"},{"id":"d16-v-05","x":2613.6,"y":-823,"w":228,"h":238.8,"kind":"ground"},{"id":"d16-v-06","x":2721.6,"y":-883,"w":120,"h":60,"kind":"ground"},{"id":"d16-v-07","x":2841.6,"y":-741.375,"w":966,"h":146.4,"kind":"ground"},{"id":"d16-v-08","x":2932.8,"y":-860.25,"w":48,"h":118.8,"kind":"ground"},{"id":"d16-v-09","x":3091.2,"y":-833.75,"w":240,"h":92.4,"kind":"ground"},{"id":"d16-v-10","x":3384,"y":-889,"w":255.6,"h":147.6,"kind":"ground"},{"id":"d16-v-12","x":3687.6,"y":-910.625,"w":120,"h":169.2,"kind":"ground"},{"id":"d16-v-13","x":4176,"y":-1082.25,"w":301.2,"h":499.2,"kind":"ground"},{"id":"d16-v-14","x":4466.4,"y":-648.25,"w":106.8,"h":41.225,"kind":"ground","role":"walljump-floor"},{"id":"d16-v-15","x":4573.2,"y":-734.25,"w":604.8,"h":24,"kind":"ground"},{"id":"d16-v-16","x":4573.2,"y":-734.25,"w":8.4,"h":48,"kind":"ground"},{"id":"d16-v-17","x":4696.8,"y":-755.75,"w":87.6,"h":21.6,"kind":"ground"},{"id":"d16-v-20","x":5182.8,"y":-502.625,"w":132,"h":21.6,"kind":"ground"},{"id":"d16-v-21","x":5274,"y":-734.25,"w":447.6,"h":231.6,"kind":"ground"},{"id":"d16-v-25","x":6614.4,"y":89,"w":336,"h":28.8,"kind":"ground"},{"id":"d16-v-28","x":7053.6,"y":337.375,"w":96,"h":172.8,"kind":"ground"},{"id":"d16-v-29","x":7174.8,"y":359,"w":300,"h":261.6,"kind":"ground"},{"id":"d16-v-30","x":7599.6,"y":455,"w":840,"h":463.2,"kind":"ground"},{"id":"d16-s-wall-1","x":5278.8,"y":-811.5,"w":36,"h":77.21,"kind":"ground"},{"id":"d16-s-wall-2","x":5278.8,"y":-888.625,"w":36,"h":77.21,"kind":"ground"},{"id":"d16-s-wall-3","x":5278.8,"y":-965.875,"w":36,"h":77.21,"kind":"ground"}],"obstacles":[{"id":"d16-vault-02","type":"vault","x":5049.84,"w":72,"h":48,"baseY":-734.25},{"id":"d16-vault-03","type":"vault","x":4890,"w":72,"h":48,"baseY":-734.25},{"id":"d16-vault-05","type":"vault","x":4880.4,"w":72,"h":48,"baseY":-734.25},{"id":"d16-vault-06","type":"vault","x":4312,"w":24,"h":48,"baseY":-1082.25},{"id":"d16-vault-07","type":"vault","x":3520,"w":72,"h":48,"baseY":-889},{"id":"d16-vault-08","type":"vault","x":6519.36,"w":72,"h":48,"baseY":-580.625}],"coins":makeCoins("D16", COINS.D16),"chief":{"startX":3149.04}},
    D17: {"routeId":"D17","worldId":"dock31","version":1,"name":"TWIN CRANES","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"d17-p1-f04-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"d17-p1-f04-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"d17-p1-f04-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"d17-p1-f04-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"d17-p1-f04-v-18","x":3058.72,"y":50.63,"w":120.9,"h":21.6,"kind":"ground"},{"id":"d17-p1-f04-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"d17-p1-f04-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"d17-p1-f04-v-15","x":2451.28,"y":25.38,"w":138,"h":67.92,"kind":"ground"},{"id":"d17-p1-f04-v-13","x":2256.88,"y":-40.62,"w":124.8,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"d17-p1-f04-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"d17-p1-f04-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"d17-p1-f04-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"d17-p1-f04-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"d17-p1-f04-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"d17-p1-f04-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"d17-p1-f04-v-02","x":406,"y":-112.62,"w":72,"h":21.6,"kind":"ground"},{"id":"d17-p2-m03-v-19","x":4510.48,"y":93.38,"w":207.6,"h":240,"kind":"ground"},{"id":"d17-p2-m03-v-20","x":4718.08,"y":165.38,"w":502.8,"h":240,"kind":"ground"},{"id":"d17-p2-m03-v-21","x":4752.88,"y":142.51,"w":97.2,"h":22.8,"kind":"ground"},{"id":"d17-p2-m03-v-22","x":4850.08,"y":93.38,"w":48,"h":72,"kind":"ground"},{"id":"d17-p2-m03-v-23","x":4932.88,"y":143.76,"w":74.4,"h":21.6,"kind":"ground"},{"id":"d17-p2-m03-v-24","x":5007.28,"y":95.76,"w":52.8,"h":69.6,"kind":"ground"},{"id":"d17-p2-m03-v-25","x":5220.88,"y":237.38,"w":140.4,"h":168,"kind":"ground"},{"id":"d17-p2-m03-v-26","x":5361.28,"y":165.38,"w":823.2,"h":240,"kind":"ground"},{"id":"d17-p2-m03-v-28","x":6662.08,"y":346.51,"w":504,"h":254.4,"kind":"ground"},{"id":"d17-p2-m03-v-30","x":7166.08,"y":482.13,"w":157.2,"h":120,"kind":"ground"},{"id":"d17-p2-m03-v-32","x":7323.28,"y":364.51,"w":105.6,"h":152.4,"kind":"ground"},{"id":"d17-p2-m03-slope3-1","x":7428.88,"y":400.13,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d17-p2-m03-slope3-2","x":7482.08,"y":435.76,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d17-p2-m03-slope3-3","x":7535.28,"y":471.38,"w":53.2,"h":35.63,"kind":"ground"},{"id":"d17-p2-m03-v-33","x":7588.48,"y":471.38,"w":232.8,"h":60,"kind":"ground"},{"id":"d17-p2-m03-slope4-1","x":7821.28,"y":424.26,"w":74.4,"h":47.19,"kind":"ground"},{"id":"d17-p2-m03-slope4-2","x":7895.68,"y":377.01,"w":74.4,"h":47.19,"kind":"ground"},{"id":"d17-p2-m03-v-34","x":7970.08,"y":377.01,"w":600,"h":240,"kind":"ground"},{"id":"d17-p2-m03-v-37","x":8675.68,"y":361.38,"w":840,"h":463.2,"kind":"ground"}],"catchableSurfaces":[{"id":"d17-p1-f04-v-07"},{"id":"d17-p1-f04-v-08"},{"id":"d17-p1-f04-v-10"},{"id":"d17-p1-f04-v-13"},{"id":"d17-p1-f04-v-15"},{"id":"d17-p1-f04-v-16"},{"id":"d17-p1-f04-v-17"},{"id":"d17-p1-f04-v-18"},{"id":"d17-p1-f04-v-19"},{"id":"d17-p1-f04-v-20"},{"id":"d17-p1-f04-v-22"},{"id":"d17-p2-m03-v-19"},{"id":"d17-p2-m03-v-21"},{"id":"d17-p2-m03-v-22"},{"id":"d17-p2-m03-v-23"},{"id":"d17-p2-m03-v-24"},{"id":"d17-p2-m03-v-26"},{"id":"d17-p2-m03-v-32"},{"id":"d17-p2-m03-slope4-1"},{"id":"d17-p2-m03-slope4-2"}],"diveZones":[{"id":"d17-p1-f04-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"d17-p1-f04-dz-02","x1":672.4,"x2":790,"landX":981.68,"landY":-91},{"id":"d17-p1-f04-dz-03","x1":1847.31,"x2":1967.31,"landX":2172.08,"landY":24.25},{"id":"d17-p1-f04-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"d17-p2-m03-dz-08","x1":6064.48,"x2":6184.48,"landX":6702.08,"landY":346.51},{"id":"d17-p2-m03-dz-09","x1":7166.08,"x2":7323.28,"landX":7363.28,"landY":364.51},{"id":"d17-p2-m03-dz-10","x1":8478.68,"x2":8525.71,"landX":8715.68,"landY":361.38}],"obstacles":[{"id":"d17-p1-f04-vault-01","type":"vault","x":600.4,"w":72,"h":48,"baseY":-91},{"id":"d17-p1-f04-vault-04","type":"vault","x":189.22,"w":24,"h":48,"baseY":-91},{"id":"d17-p2-m03-slide-04","type":"slide","x":5494.48,"w":48,"h":86.4,"baseY":165.38},{"id":"d17-p2-m03-slide-06","type":"slide","x":8399.68,"w":48,"h":86.4,"baseY":377.01},{"id":"d17-p2-m03-vault-01","type":"vault","x":8186.08,"w":72,"h":48,"baseY":377.01},{"id":"d17-p2-m03-vault-06","type":"vault","x":6956.08,"w":72,"h":48,"baseY":346.51}],"length":9655.68,"finishX":9515.68,"checkpoints":[70,2378.92,4757.84,7136.76],"chief":{"startX":2378.92},"coins":makeCoins("D17", COINS.D17)},
    D18: {"routeId":"D18","worldId":"dock31","version":1,"name":"LAST MANIFEST","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"d18-p1-a01-v-20","x":3479.2,"y":177.75,"w":1086,"h":369.6,"kind":"ground"},{"id":"d18-p1-a01-v-16","x":2852.8,"y":243.75,"w":600,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-19","x":3283.84,"y":179,"w":96,"h":64.8,"kind":"ground"},{"id":"d18-p1-a01-v-18","x":3102.4,"y":200.63,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d18-p1-a01-v-17","x":2969.2,"y":222.25,"w":79.2,"h":21.6,"kind":"ground"},{"id":"d18-p1-a01-v-14","x":2536,"y":318.25,"w":316.8,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-10","x":1871.2,"y":413,"w":664.8,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-13","x":2366.8,"y":391.38,"w":169.2,"h":21.6,"kind":"ground"},{"id":"d18-p1-a01-v-07","x":1291.6,"y":289.38,"w":484.8,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-06","x":1164.4,"y":219.38,"w":127.2,"h":148.8,"kind":"ground"},{"id":"d18-p1-a01-v-04","x":656.8,"y":337.88,"w":354,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-02","x":280,"y":336.25,"w":240,"h":240,"kind":"ground"},{"id":"d18-p1-a01-v-01","x":70,"y":408.25,"w":210,"h":240,"kind":"ground"},{"id":"d18-p2-f03-v-23","x":4565.2,"y":177.75,"w":134.46,"h":21.6,"kind":"ground"},{"id":"d18-p2-f03-v-24","x":4699.6,"y":124.88,"w":480,"h":120,"kind":"ground"},{"id":"d18-p2-f03-v-25","x":5185.6,"y":289.25,"w":214.8,"h":196.8,"kind":"ground"},{"id":"d18-p2-f03-v-26","x":5400.4,"y":246.13,"w":600,"h":240,"kind":"ground"},{"id":"d18-p2-f03-v-28","x":5713.6,"y":91,"w":48,"h":49.2,"kind":"ground"},{"id":"d18-p2-f03-v-30","x":6068.8,"y":194.5,"w":331.2,"h":374.4,"kind":"ground"},{"id":"d18-p2-f03-v-31","x":6400,"y":105.75,"w":354,"h":240,"kind":"ground"},{"id":"d18-p2-f03-v-32","x":6634,"y":33.75,"w":120,"h":72,"kind":"ground"},{"id":"d18-p2-f03-down-1","x":6754,"y":78.5,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-down-2","x":6829,"y":123.38,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-down-3","x":6904,"y":168.13,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-down-4","x":6979,"y":212.88,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-down-5","x":7054,"y":257.75,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-v-33","x":7084,"y":302.5,"w":632.4,"h":132,"kind":"ground"},{"id":"d18-p2-f03-down-6","x":7129,"y":302.5,"w":75,"h":44.79,"kind":"ground"},{"id":"d18-p2-f03-v-36","x":7616.8,"y":259.25,"w":88.8,"h":43.2,"kind":"ground"},{"id":"d18-p2-f03-v-37","x":7716.4,"y":194.5,"w":360,"h":240,"kind":"ground"},{"id":"d18-p2-f03-v-39","x":8182,"y":194.5,"w":840,"h":463.2,"kind":"ground"}],"catchableSurfaces":[{"id":"d18-p1-a01-v-02"},{"id":"d18-p1-a01-v-14"},{"id":"d18-p1-a01-v-16"},{"id":"d18-p1-a01-v-17"},{"id":"d18-p1-a01-v-18"},{"id":"d18-p1-a01-v-19"},{"id":"d18-p1-a01-v-20"},{"id":"d18-p1-a01-v-13"},{"id":"d18-p2-f03-v-24"},{"id":"d18-p2-f03-v-26"},{"id":"d18-p2-f03-v-28"},{"id":"d18-p2-f03-v-31"},{"id":"d18-p2-f03-v-32"},{"id":"d18-p2-f03-v-37"}],"diveZones":[{"id":"d18-p1-a01-dz-01","x1":412.96,"x2":513.45,"landX":696.8,"landY":337.88},{"id":"d18-p1-a01-dz-02","x1":871.8,"x2":975.41,"landX":1204.4,"landY":219.38},{"id":"d18-p1-a01-dz-03","x1":2174.02,"x2":2214.02,"landX":2406.8,"landY":391.38},{"id":"d18-p1-a01-dz-04","x1":2558.86,"x2":2678.86,"landX":2892.8,"landY":243.75},{"id":"d18-p2-f03-dz-07","x1":5400.4,"x2":5513.13,"landX":5753.6,"landY":91},{"id":"d18-p2-f03-dz-08","x1":5783.53,"x2":5903.53,"landX":6108.8,"landY":194.5},{"id":"d18-p2-f03-dz-09","x1":6400,"x2":6461.08,"landX":6674,"landY":33.75},{"id":"d18-p2-f03-dz-10","x1":7379,"x2":7454.84,"landX":7656.8,"landY":259.25},{"id":"d18-p2-f03-dz-11","x1":7676.4,"x2":7716.4,"landX":7756.4,"landY":194.5},{"id":"d18-p2-f03-dz-12","x1":7924.4,"x2":8039.42,"landX":8222,"landY":194.5}],"obstacles":[{"id":"d18-p1-a01-slide-02","type":"slide","x":1712.8,"w":48,"h":86.4,"baseY":289.38},{"id":"d18-p1-a01-slide-04","type":"slide","x":3596.8,"w":48,"h":86.4,"baseY":177.75},{"id":"d18-p1-a01-vault-01","type":"vault","x":3798.4,"w":72,"h":48,"baseY":177.75},{"id":"d18-p1-a01-vault-03","type":"vault","x":1536.4,"w":72,"h":48,"baseY":289.38},{"id":"d18-p1-a01-vault-04","type":"vault","x":340.96,"w":72,"h":48,"baseY":336.25},{"id":"d18-p1-a01-vault-05","type":"vault","x":2006.8,"w":72,"h":48,"baseY":413},{"id":"d18-p2-f03-vault-04","type":"vault","x":7852.4,"w":72,"h":48,"baseY":194.5},{"id":"d18-p2-f03-vault-07","type":"vault","x":5612.56,"w":24,"h":48,"baseY":246.13}],"length":9162,"finishX":9022,"checkpoints":[70,2255.5,4511,6766.5],"chief":{"startX":2255.5},"coins":makeCoins("D18", COINS.D18)},
    F05: {"routeId":"F05","worldId":"frozen","version":2,"name":"WHITEOUT RUN","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f05-p1-d02-v-01","x":70,"y":-224.2,"w":1280.4,"h":240,"kind":"ground"},{"id":"f05-p1-d02-v-02","x":1352.8,"y":-109,"w":129.6,"h":381.6,"kind":"ground"},{"id":"f05-p1-d02-v-03","x":1352.8,"y":-152.2,"w":88.8,"h":43.2,"kind":"ground"},{"id":"f05-p1-d02-v-04","x":1825.6,"y":65,"w":48,"h":32.4,"kind":"ground"},{"id":"f05-p1-d02-v-05","x":2214.7,"y":362.36,"w":146.6,"h":360,"kind":"ground"},{"id":"f05-p1-d02-v-06","x":2355.58,"y":270.25,"w":1012.8,"h":360,"kind":"ground"},{"id":"f05-p1-d02-v-08","x":2831.92,"y":248.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f05-p1-d02-v-09","x":3116.38,"y":248.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f05-p1-d02-u-1","x":2725.18,"y":301.64,"w":28.8,"h":21.6,"kind":"ground"},{"id":"f05-p1-d02-roof1-1","x":130,"y":-263.75,"w":480,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-roof1-2","x":210,"y":-303.375,"w":320,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-roof1-3","x":290,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-roof2-1","x":668.56,"y":-263.75,"w":480,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-roof2-2","x":748.56,"y":-303.375,"w":320,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-roof2-3","x":828.56,"y":-343,"w":160,"h":39.6,"kind":"ground"},{"id":"f05-p1-d02-slope-1","x":1482.4,"y":-65.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f05-p1-d02-slope-2","x":1568.2,"y":-22,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f05-p1-d02-slope-3","x":1654,"y":21.5,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f05-p1-d02-slope-4","x":1739.8,"y":65,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f05-p2-d01-v-15","x":3376.38,"y":270.25,"w":1200,"h":240,"kind":"ground"},{"id":"f05-p2-d01-v-19","x":4168.38,"y":248.625,"w":408,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-v-20","x":4432.38,"y":174.25,"w":144,"h":74.4,"kind":"ground"},{"id":"f05-p2-d01-v-21","x":4734.3,"y":318.2,"w":960,"h":48,"kind":"ground"},{"id":"f05-p2-d01-v-22","x":4931.1,"y":296.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-v-23","x":5916.93,"y":619.28,"w":960,"h":48,"kind":"ground"},{"id":"f05-p2-d01-v-24","x":6113.73,"y":597.625,"w":72,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-v-25","x":6987.39,"y":855.89,"w":762.06,"h":928.8,"kind":"ground"},{"id":"f05-p2-d01-v-26","x":7749.87,"y":928.85,"w":1197.6,"h":240,"kind":"ground"},{"id":"f05-p2-d01-v-27","x":7749.87,"y":884.69,"w":48.24,"h":43.44,"kind":"ground"},{"id":"f05-p2-d01-v-28","x":8285.55,"y":736.13,"w":12,"h":120,"kind":"ground"},{"id":"f05-p2-d01-u-1","x":8069.79,"y":1791.83,"w":15.6,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-u-2","x":8301.87,"y":1793.81,"w":408,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-u-3","x":8469.87,"y":1773.89,"w":28.8,"h":21.6,"kind":"ground"},{"id":"f05-p2-d01-u-4","x":8633.07,"y":1773.89,"w":28.8,"h":21.6,"kind":"ground"}],"catchableSurfaces":[{"id":"f05-p1-d02-roof1-1"},{"id":"f05-p1-d02-roof1-2"},{"id":"f05-p1-d02-roof1-3"},{"id":"f05-p1-d02-roof2-1"},{"id":"f05-p1-d02-roof2-2"},{"id":"f05-p1-d02-roof2-3"},{"id":"f05-p1-d02-v-06"},{"id":"f05-p1-d02-v-08"},{"id":"f05-p1-d02-v-09"},{"id":"f05-p2-d01-v-15"},{"id":"f05-p2-d01-v-19"},{"id":"f05-p2-d01-v-20"},{"id":"f05-p2-d01-v-22"},{"id":"f05-p2-d01-v-24"}],"diveZones":[{"id":"f05-p1-d02-dz-01","x1":1755.8,"x2":1795.8,"landX":2254.7,"landY":362.36},{"id":"f05-p2-d01-dz-02","x1":5557.71,"x2":5597.71,"landX":5956.93,"landY":619.28}],"obstacles":[{"id":"f05-p1-d02-vault-06","type":"vault","x":2564.38,"w":28.8,"h":21.6,"baseY":270.2},{"id":"f05-p1-d02-vault-01","type":"vault","x":3216.38,"w":24,"h":48,"baseY":270.2},{"id":"f05-p2-d01-vault-03","type":"vault","x":8003.79,"w":24,"h":48,"baseY":928.85},{"id":"f05-p2-d01-vault-04","type":"vault","x":8417.07,"w":24,"h":48,"baseY":928.85},{"id":"f05-p2-d01-vault-01","type":"vault","x":8668.27,"w":24,"h":48,"baseY":928.85},{"id":"f05-hard-1","type":"vault","x":3564.38,"w":72,"h":48,"baseY":270.25},{"id":"f05-hard-2","type":"slide","x":3856.38,"w":72,"h":48,"baseY":270.25},{"id":"f05-hard-3","type":"vault","x":4148.38,"w":72,"h":48,"baseY":270.25},{"id":"f05-hard-4","type":"slide","x":5106.3,"w":72,"h":48,"baseY":318.2},{"id":"f05-hard-5","type":"vault","x":6288.93,"w":72,"h":48,"baseY":619.28},{"id":"f05-hard-6","type":"slide","x":6580.93,"w":72,"h":48,"baseY":619.28},{"id":"f05-hard-7","type":"vault","x":7175.39,"w":72,"h":48,"baseY":855.89},{"id":"f05-hard-8","type":"slide","x":7467.39,"w":72,"h":48,"baseY":855.89}],"length":9087.47,"finishX":8947.47,"checkpoints":[70,2236.87,4473.73,6710.6],"mode":"hard","coins":makeCoins("F05", COINS.F05)},
    F06: {"routeId":"F06","worldId":"frozen","version":2,"name":"GLACIER GATE","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"f06-p1-d12-v-01","x":70,"y":-196.62,"w":718.8,"h":232.8,"kind":"ground"},{"id":"f06-p1-d12-v-03","x":526,"y":-266.25,"w":262.8,"h":69.6,"kind":"ground"},{"id":"f06-p1-d12-v-04","x":650.8,"y":-323.75,"w":138,"h":57.6,"kind":"ground"},{"id":"f06-p1-d12-v-05","x":905.2,"y":-325,"w":620.4,"h":301.2,"kind":"ground"},{"id":"f06-p1-d12-v-06","x":1080.4,"y":-346.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"f06-p1-d12-v-07","x":1201.6,"y":-368.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"f06-p1-d12-v-08","x":1333.6,"y":-440.25,"w":192,"h":115.2,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-21","x":5014.08,"y":-140.62,"w":960,"h":48,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-22","x":5210.88,"y":-162.25,"w":72,"h":21.6,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-19","x":4642.08,"y":-205,"w":248.58,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-14","x":3901.92,"y":-140.25,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"f06-p2-d17-p1-f04-v-20","x":4740.48,"y":-263.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"f06-p2-d17-p1-f04-v-18","x":4522.32,"y":-183.375,"w":120.9,"h":21.6,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-17","x":4400.88,"y":-161.75,"w":241.2,"h":21.6,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-16","x":4219.2,"y":-161.75,"w":72,"h":21.6,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-15","x":3914.88,"y":-208.625,"w":138,"h":67.92,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-13","x":3720.48,"y":-274.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-12","x":3595.68,"y":-209.75,"w":249.6,"h":307.2,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-05","x":2411.04,"y":-260.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-11","x":3193.44,"y":-303.37,"w":42,"h":43.2,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-10","x":3086.64,"y":-325,"w":106.8,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-09","x":2945.04,"y":-303.37,"w":108,"h":43.2,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-08","x":2897.04,"y":-325,"w":48,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-07","x":2772.24,"y":-325,"w":48,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-06","x":2540.64,"y":-325,"w":136.8,"h":64.8,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-04","x":2405.28,"y":-325,"w":136.75,"h":309.6,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-01","x":1533.6,"y":-325,"w":720,"h":240,"kind":"ground"},{"id":"f06-p2-d17-p1-f04-v-02","x":1869.6,"y":-346.62,"w":72,"h":21.6,"kind":"ground"},{"id":"f06-p3-d02-v-01","x":5982.08,"y":-140.625,"w":1280.4,"h":240,"kind":"ground"},{"id":"f06-p3-d02-v-02","x":7264.88,"y":-25.42,"w":129.6,"h":381.6,"kind":"ground"},{"id":"f06-p3-d02-v-03","x":7264.88,"y":-68.62,"w":88.8,"h":43.2,"kind":"ground"},{"id":"f06-p3-d02-v-04","x":7737.68,"y":148.58,"w":48,"h":32.4,"kind":"ground"},{"id":"f06-p3-d02-v-05","x":8126.78,"y":445.94,"w":146.6,"h":360,"kind":"ground"},{"id":"f06-p3-d02-v-06","x":8267.66,"y":353.75,"w":1012.8,"h":360,"kind":"ground"},{"id":"f06-p3-d02-v-08","x":8744,"y":332.125,"w":72,"h":21.6,"kind":"ground"},{"id":"f06-p3-d02-v-09","x":9028.46,"y":332.125,"w":72,"h":21.6,"kind":"ground"},{"id":"f06-p3-d02-u-1","x":8637.26,"y":385.22,"w":28.8,"h":21.6,"kind":"ground"},{"id":"f06-p3-d02-roof1-1","x":6042.08,"y":-180.25,"w":480,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-roof1-2","x":6122.08,"y":-219.875,"w":320,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-roof1-3","x":6202.08,"y":-259.375,"w":160,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-roof2-1","x":6580.64,"y":-180.25,"w":480,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-roof2-2","x":6660.64,"y":-219.875,"w":320,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-roof2-3","x":6740.64,"y":-259.375,"w":160,"h":39.6,"kind":"ground"},{"id":"f06-p3-d02-slope-1","x":7394.48,"y":18.08,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f06-p3-d02-slope-2","x":7480.28,"y":61.58,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f06-p3-d02-slope-3","x":7566.08,"y":105.08,"w":85.8,"h":43.5,"kind":"ground"},{"id":"f06-p3-d02-slope-4","x":7651.88,"y":148.58,"w":85.8,"h":43.5,"kind":"ground"}],"catchableSurfaces":[{"id":"f06-p1-d12-v-03"},{"id":"f06-p1-d12-v-04"},{"id":"f06-p1-d12-v-06"},{"id":"f06-p1-d12-v-07"},{"id":"f06-p1-d12-v-08"},{"id":"f06-p2-d17-p1-f04-v-07"},{"id":"f06-p2-d17-p1-f04-v-08"},{"id":"f06-p2-d17-p1-f04-v-10"},{"id":"f06-p2-d17-p1-f04-v-13"},{"id":"f06-p2-d17-p1-f04-v-15"},{"id":"f06-p2-d17-p1-f04-v-16"},{"id":"f06-p2-d17-p1-f04-v-17"},{"id":"f06-p2-d17-p1-f04-v-18"},{"id":"f06-p2-d17-p1-f04-v-19"},{"id":"f06-p2-d17-p1-f04-v-20"},{"id":"f06-p2-d17-p1-f04-v-22"},{"id":"f06-p3-d02-roof1-1"},{"id":"f06-p3-d02-roof1-2"},{"id":"f06-p3-d02-roof1-3"},{"id":"f06-p3-d02-roof2-1"},{"id":"f06-p3-d02-roof2-2"},{"id":"f06-p3-d02-roof2-3"},{"id":"f06-p3-d02-v-06"},{"id":"f06-p3-d02-v-08"},{"id":"f06-p3-d02-v-09"},{"id":"f06-p2-d17-p1-f04-v-01"},{"id":"f06-p3-d02-v-01"}],"diveZones":[{"id":"f06-p1-d12-dz-01","x1":313.84,"x2":353.84,"landX":566,"landY":-266.25},{"id":"f06-p1-d12-dz-02","x1":650.8,"x2":690.8,"landX":945.2,"landY":-325},{"id":"f06-p1-d12-dz-03","x1":1025.63,"x2":1065.63,"landX":1373.6,"landY":-440.25},{"id":"f06-p2-d17-p1-f04-dz-01","x1":1676.82,"x2":1716.82,"landX":1909.6,"landY":-346.62},{"id":"f06-p2-d17-p1-f04-dz-02","x1":2136,"x2":2176,"landX":2445.28,"landY":-325},{"id":"f06-p2-d17-p1-f04-dz-03","x1":3310.91,"x2":3350.91,"landX":3635.68,"landY":-209.75},{"id":"f06-p2-d17-p1-f04-dz-04","x1":4850.66,"x2":4890.66,"landX":5054.08,"landY":-140.62},{"id":"f06-p3-d02-dz-01","x1":7667.88,"x2":7707.88,"landX":8166.78,"landY":445.94}],"obstacles":[{"id":"f06-p1-d12-vault-03","type":"vault","x":356,"w":24,"h":48,"baseY":-196.62},{"id":"f06-p2-d17-p1-f04-vault-04","type":"vault","x":1716.82,"w":24,"h":48,"baseY":-325},{"id":"f06-p3-d02-vault-06","type":"vault","x":8476.46,"w":28.8,"h":21.6,"baseY":353.78},{"id":"f06-p3-d02-vault-01","type":"vault","x":9128.46,"w":24,"h":48,"baseY":353.78},{"id":"f06-hard-1","type":"vault","x":5314.08,"w":72,"h":48,"baseY":-140.62},{"id":"f06-hard-2","type":"slide","x":5606.08,"w":72,"h":48,"baseY":-140.62}],"length":9420.46,"finishX":9280.46,"checkpoints":[70,2320.11,4640.23,6960.34],"mode":"hard","coins":makeCoins("F06", COINS.F06)},
    M05: {"routeId":"M05","worldId":"magma","version":2,"name":"SLAG BRIDGE","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"m05-p1-d10-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"m05-p1-d10-v-02","x":406,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"m05-p1-d10-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"m05-p1-d10-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"m05-p1-d10-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"m05-p1-d10-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"m05-p1-d10-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"m05-p1-d10-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"m05-p1-d10-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"m05-p1-d10-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"m05-p1-d10-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"m05-p1-d10-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"m05-p1-d10-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"m05-p1-d10-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"m05-p1-d10-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"m05-p1-d10-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"m05-p2-d05-v-01","x":4518.48,"y":93.375,"w":1154.13,"h":165.6,"kind":"ground"},{"id":"m05-p2-d05-v-02","x":4954.08,"y":-24.25,"w":300,"h":117.6,"kind":"ground"},{"id":"m05-p2-d05-v-03","x":5118.48,"y":-45.875,"w":88.8,"h":21.6,"kind":"ground"},{"id":"m05-p2-d05-up-1","x":4714.08,"w":80,"y":54.125,"h":39.2,"kind":"ground","role":"zemin"},{"id":"m05-p2-d05-up-2","x":4794.08,"w":80,"y":14.875,"h":39.2,"kind":"ground","role":"zemin"},{"id":"m05-p2-d05-up-3","x":4874.08,"w":80,"y":-24.25,"h":39.2,"kind":"ground","role":"zemin"},{"id":"m05-p3-d12-v-01","x":5680.61,"y":93.375,"w":718.8,"h":232.8,"kind":"ground"},{"id":"m05-p3-d12-v-03","x":6136.61,"y":23.75,"w":262.8,"h":69.6,"kind":"ground"},{"id":"m05-p3-d12-v-04","x":6261.41,"y":-33.75,"w":138,"h":57.6,"kind":"ground"},{"id":"m05-p3-d12-v-05","x":6515.81,"y":-35,"w":620.4,"h":301.2,"kind":"ground"},{"id":"m05-p3-d12-v-06","x":6691.01,"y":-56.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"m05-p3-d12-v-07","x":6812.21,"y":-78.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"m05-p3-d12-v-08","x":6944.21,"y":-150.25,"w":192,"h":115.2,"kind":"ground"},{"id":"m05-p3-d12-v-10","x":7468.61,"y":28.63,"w":769.2,"h":301.2,"kind":"ground"},{"id":"m05-p3-d12-v-12","x":7761.41,"y":7,"w":88.8,"h":21.6,"kind":"ground"},{"id":"m05-p3-d12-slope-1","x":7136.21,"y":-131.74,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m05-p3-d12-slope-2","x":7202.69,"y":-91.62,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m05-p3-d12-slope-3","x":7269.17,"y":-51.49,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m05-p3-d12-slope-4","x":7335.65,"y":-11.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"m05-p3-d12-slope-5","x":7402.13,"y":28.63,"w":66.48,"h":40.08,"kind":"ground"}],"catchableSurfaces":[{"id":"m05-p1-d10-v-07"},{"id":"m05-p1-d10-v-08"},{"id":"m05-p1-d10-v-10"},{"id":"m05-p1-d10-v-13"},{"id":"m05-p1-d10-v-15"},{"id":"m05-p1-d10-v-16"},{"id":"m05-p1-d10-v-17"},{"id":"m05-p1-d10-v-18"},{"id":"m05-p1-d10-v-19"},{"id":"m05-p1-d10-v-20"},{"id":"m05-p1-d10-v-22"},{"id":"m05-p2-d05-up-1"},{"id":"m05-p2-d05-up-2"},{"id":"m05-p2-d05-up-3"},{"id":"m05-p2-d05-v-03"},{"id":"m05-p3-d12-v-03"},{"id":"m05-p3-d12-v-04"},{"id":"m05-p3-d12-v-06"},{"id":"m05-p3-d12-v-07"},{"id":"m05-p3-d12-v-08"},{"id":"m05-p3-d12-v-12"},{"id":"m05-p1-d10-v-02"},{"id":"m05-p2-d05-v-01"},{"id":"m05-p3-d12-v-01"}],"diveZones":[{"id":"m05-p1-d10-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"m05-p1-d10-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"m05-p1-d10-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"m05-p1-d10-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"m05-p3-d12-dz-01","x1":5924.45,"x2":5964.45,"landX":6176.61,"landY":23.75},{"id":"m05-p3-d12-dz-02","x1":6261.41,"x2":6301.41,"landX":6555.81,"landY":-35},{"id":"m05-p3-d12-dz-03","x1":6636.24,"x2":6676.24,"landX":6984.21,"landY":-150.25},{"id":"m05-p3-d12-dz-04","x1":7568.63,"x2":7608.63,"landX":7801.41,"landY":7}],"obstacles":[{"id":"m05-p1-d10-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"m05-p3-d12-vault-03","type":"vault","x":5966.61,"w":24,"h":48,"baseY":93.38},{"id":"m05-hard-1","type":"vault","x":3922.48,"w":72,"h":48,"baseY":93.38},{"id":"m05-hard-2","type":"slide","x":4222.48,"w":72,"h":48,"baseY":93.38},{"id":"m05-hard-3","type":"vault","x":5306.48,"w":72,"h":48,"baseY":93.375},{"id":"m05-hard-4","type":"slide","x":7656.61,"w":72,"h":48,"baseY":28.63},{"id":"m05-hard-5","type":"vault","x":7948.61,"w":72,"h":48,"baseY":28.63}],"length":8377.81,"finishX":8237.81,"checkpoints":[70,2059.45,4118.91,6178.36],"mode":"hard","coins":makeCoins("M05", COINS.M05)},
    M06: {"routeId":"M06","worldId":"magma","version":2,"name":"CORE MELT","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"m06-p1-d17-p1-f04-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"m06-p1-d17-p1-f04-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"m06-p1-d17-p1-f04-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"m06-p1-d17-p1-f04-v-02","x":406,"y":-112.62,"w":72,"h":21.6,"kind":"ground"},{"id":"m06-p2-d13-v-01","x":4518.48,"y":93.375,"w":375.6,"h":120,"kind":"ground"},{"id":"m06-p2-d13-v-03","x":5118.48,"y":-25.5,"w":120,"h":116.4,"kind":"ground"},{"id":"m06-p2-d13-v-04","x":5354.88,"y":-25.5,"w":120,"h":237.6,"kind":"ground"},{"id":"m06-p2-d13-slope1-1","x":4894.08,"y":53.75,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m06-p2-d13-slope1-2","x":4968.88,"y":14.125,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m06-p2-d13-slope1-3","x":5043.68,"y":-25.5,"w":74.8,"h":39.63,"kind":"ground"},{"id":"m06-p3-d11-v-01","x":5482.88,"y":-25.5,"w":372,"h":205.2,"kind":"ground"},{"id":"m06-p3-d11-v-02","x":5935.28,"y":-26.75,"w":960,"h":240,"kind":"ground"},{"id":"m06-p3-d11-v-03","x":6158.48,"y":-110.75,"w":144,"h":84,"kind":"ground"},{"id":"m06-p3-d11-v-06","x":6987.68,"y":-124,"w":890.4,"h":72,"kind":"ground"},{"id":"m06-p3-d11-v-09","x":7447.28,"y":-186.375,"w":66,"h":62.4,"kind":"ground"},{"id":"m06-p3-d11-v-10","x":7513.28,"y":-240.375,"w":314.4,"h":116.4,"kind":"ground"},{"id":"m06-p3-d11-v-11","x":7827.68,"y":-194.75,"w":121.2,"h":70.8,"kind":"ground"},{"id":"m06-p3-d11-v-13","x":7947.68,"y":-406,"w":72,"h":254.4,"kind":"ground"},{"id":"m06-p3-d11-v-14","x":8091.68,"y":237.25,"w":278.4,"h":144,"kind":"ground"},{"id":"m06-p3-d11-deadend-i11-step-1","x":7839.68,"y":-265.125,"w":36,"h":70.42,"kind":"ground"},{"id":"m06-p3-d11-deadend-i11-step-2","x":7875.68,"y":-335.625,"w":36,"h":70.42,"kind":"ground"},{"id":"m06-p3-d11-deadend-i11-step-3","x":7911.68,"y":-406,"w":36,"h":70.42,"kind":"ground"}],"catchableSurfaces":[{"id":"m06-p1-d17-p1-f04-v-07"},{"id":"m06-p1-d17-p1-f04-v-08"},{"id":"m06-p1-d17-p1-f04-v-10"},{"id":"m06-p1-d17-p1-f04-v-13"},{"id":"m06-p1-d17-p1-f04-v-15"},{"id":"m06-p1-d17-p1-f04-v-16"},{"id":"m06-p1-d17-p1-f04-v-17"},{"id":"m06-p1-d17-p1-f04-v-18"},{"id":"m06-p1-d17-p1-f04-v-19"},{"id":"m06-p1-d17-p1-f04-v-20"},{"id":"m06-p1-d17-p1-f04-v-22"},{"id":"m06-p2-d13-slope1-2"},{"id":"m06-p2-d13-slope1-3"},{"id":"m06-p2-d13-slope1-1"},{"id":"m06-p3-d11-v-03"},{"id":"m06-p3-d11-v-06"},{"id":"m06-p3-d11-v-09"},{"id":"m06-p3-d11-v-10"},{"id":"m06-p3-d11-deadend-i11-step-1"},{"id":"m06-p3-d11-deadend-i11-step-2"},{"id":"m06-p3-d11-deadend-i11-step-3"},{"id":"m06-p2-d13-v-01"},{"id":"m06-p3-d11-v-01"}],"diveZones":[{"id":"m06-p1-d17-p1-f04-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"m06-p1-d17-p1-f04-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"m06-p1-d17-p1-f04-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"m06-p1-d17-p1-f04-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"m06-p2-d13-dz-01","x1":4693.65,"x2":4733.65,"landX":4934.08,"landY":53.75},{"id":"m06-p2-d13-dz-02","x1":5092.3,"x2":5132.3,"landX":5394.88,"landY":-25.5},{"id":"m06-p3-d11-dz-01","x1":5671.93,"x2":5711.93,"landX":5975.28,"landY":-26.75},{"id":"m06-p3-d11-dz-02","x1":6765.83,"x2":6805.83,"landX":7027.68,"landY":-124},{"id":"m06-p3-d11-dz-03","x1":7195.68,"x2":7235.68,"landX":7487.28,"landY":-186.37},{"id":"m06-p3-d11-dz-04","x1":7799.68,"x2":7839.68,"landX":7879.68,"landY":-265.12}],"obstacles":[{"id":"m06-p1-d17-p1-f04-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"m06-p3-d11-vault-05","type":"vault","x":7235.68,"w":72,"h":48,"baseY":-124},{"id":"m06-hard-1","type":"vault","x":3850.48,"w":72,"h":48,"baseY":93.38},{"id":"m06-hard-2","type":"slide","x":4150.48,"w":72,"h":48,"baseY":93.38},{"id":"m06-hard-3","type":"vault","x":6403.28,"w":72,"h":48,"baseY":-26.75}],"length":8510.08,"finishX":8370.08,"checkpoints":[70,2092.52,4185.04,6277.56],"mode":"hard","coins":makeCoins("M06", COINS.M06)},
    A05: {"routeId":"A05","worldId":"aftermath","version":2,"name":"COLLAPSED PIER","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"a05-p1-d10-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"a05-p1-d10-v-02","x":406,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"a05-p1-d10-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"a05-p1-d10-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"a05-p1-d10-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"a05-p1-d10-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"a05-p1-d10-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"a05-p1-d10-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"a05-p1-d10-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"a05-p1-d10-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"a05-p1-d10-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"a05-p1-d10-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"a05-p1-d10-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"a05-p1-d10-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"a05-p1-d10-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"a05-p1-d10-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"a05-p2-d05-v-01","x":4518.48,"y":93.375,"w":1154.13,"h":165.6,"kind":"ground"},{"id":"a05-p2-d05-v-02","x":4954.08,"y":-24.25,"w":300,"h":117.6,"kind":"ground"},{"id":"a05-p2-d05-v-03","x":5118.48,"y":-45.875,"w":88.8,"h":21.6,"kind":"ground"},{"id":"a05-p2-d05-v-04","x":5332.08,"y":30.875,"w":66,"h":62.4,"kind":"ground"},{"id":"a05-p2-d05-up-1","x":4714.08,"w":80,"y":54.125,"h":39.2,"kind":"ground","role":"zemin"},{"id":"a05-p2-d05-up-2","x":4794.08,"w":80,"y":14.875,"h":39.2,"kind":"ground","role":"zemin"},{"id":"a05-p2-d05-up-3","x":4874.08,"w":80,"y":-24.25,"h":39.2,"kind":"ground","role":"zemin"},{"id":"a05-p3-d12-v-01","x":5680.61,"y":93.375,"w":718.8,"h":232.8,"kind":"ground"},{"id":"a05-p3-d12-v-03","x":6136.61,"y":23.75,"w":262.8,"h":69.6,"kind":"ground"},{"id":"a05-p3-d12-v-04","x":6261.41,"y":-33.75,"w":138,"h":57.6,"kind":"ground"},{"id":"a05-p3-d12-v-05","x":6515.81,"y":-35,"w":620.4,"h":301.2,"kind":"ground"},{"id":"a05-p3-d12-v-06","x":6691.01,"y":-56.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"a05-p3-d12-v-07","x":6812.21,"y":-78.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"a05-p3-d12-v-08","x":6944.21,"y":-150.25,"w":192,"h":115.2,"kind":"ground"},{"id":"a05-p3-d12-v-10","x":7468.61,"y":28.63,"w":769.2,"h":301.2,"kind":"ground"},{"id":"a05-p3-d12-v-12","x":7761.41,"y":7,"w":88.8,"h":21.6,"kind":"ground"},{"id":"a05-p3-d12-slope-1","x":7136.21,"y":-131.74,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a05-p3-d12-slope-2","x":7202.69,"y":-91.62,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a05-p3-d12-slope-3","x":7269.17,"y":-51.49,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a05-p3-d12-slope-4","x":7335.65,"y":-11.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a05-p3-d12-slope-5","x":7402.13,"y":28.63,"w":66.48,"h":40.08,"kind":"ground"}],"catchableSurfaces":[{"id":"a05-p1-d10-v-07"},{"id":"a05-p1-d10-v-08"},{"id":"a05-p1-d10-v-10"},{"id":"a05-p1-d10-v-13"},{"id":"a05-p1-d10-v-15"},{"id":"a05-p1-d10-v-16"},{"id":"a05-p1-d10-v-17"},{"id":"a05-p1-d10-v-18"},{"id":"a05-p1-d10-v-19"},{"id":"a05-p1-d10-v-20"},{"id":"a05-p1-d10-v-22"},{"id":"a05-p2-d05-up-1"},{"id":"a05-p2-d05-up-2"},{"id":"a05-p2-d05-up-3"},{"id":"a05-p2-d05-v-03"},{"id":"a05-p2-d05-v-04"},{"id":"a05-p3-d12-v-03"},{"id":"a05-p3-d12-v-04"},{"id":"a05-p3-d12-v-06"},{"id":"a05-p3-d12-v-07"},{"id":"a05-p3-d12-v-08"},{"id":"a05-p3-d12-v-12"},{"id":"a05-p1-d10-v-02"},{"id":"a05-p2-d05-v-01"},{"id":"a05-p3-d12-v-01"}],"diveZones":[{"id":"a05-p1-d10-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"a05-p1-d10-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"a05-p1-d10-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"a05-p1-d10-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"a05-p3-d12-dz-01","x1":5924.45,"x2":5964.45,"landX":6176.61,"landY":23.75},{"id":"a05-p3-d12-dz-02","x1":6261.41,"x2":6301.41,"landX":6555.81,"landY":-35},{"id":"a05-p3-d12-dz-03","x1":6636.24,"x2":6676.24,"landX":6984.21,"landY":-150.25},{"id":"a05-p3-d12-dz-04","x1":7568.63,"x2":7608.63,"landX":7801.41,"landY":7}],"obstacles":[{"id":"a05-p1-d10-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"a05-p3-d12-vault-03","type":"vault","x":5966.61,"w":24,"h":48,"baseY":93.38},{"id":"a05-hard-1","type":"vault","x":3922.48,"w":72,"h":48,"baseY":93.38},{"id":"a05-hard-2","type":"slide","x":4222.48,"w":72,"h":48,"baseY":93.38},{"id":"a05-hard-3","type":"vault","x":7656.61,"w":72,"h":48,"baseY":28.63},{"id":"a05-hard-4","type":"slide","x":7948.61,"w":72,"h":48,"baseY":28.63}],"length":8377.81,"finishX":8237.81,"checkpoints":[70,2059.45,4118.91,6178.36],"mode":"hard","coins":makeCoins("A05", COINS.A05)},
    A06: {"routeId":"A06","worldId":"aftermath","version":2,"name":"FINAL ESCAPE","movementProfile":"vector-v1","highJumpZones":[],"groundSegments":[{"id":"a06-p1-d10-v-01","x":70,"y":-91,"w":720,"h":240,"kind":"ground"},{"id":"a06-p1-d10-v-02","x":406,"y":-112.625,"w":72,"h":21.6,"kind":"ground"},{"id":"a06-p1-d10-v-04","x":941.68,"y":-91,"w":136.75,"h":309.6,"kind":"ground"},{"id":"a06-p1-d10-v-05","x":947.44,"y":-26.25,"w":1053.6,"h":244.8,"kind":"ground"},{"id":"a06-p1-d10-v-06","x":1077.04,"y":-91,"w":136.8,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-07","x":1308.64,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-08","x":1433.44,"y":-91,"w":48,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-09","x":1481.44,"y":-69.37,"w":108,"h":43.2,"kind":"ground"},{"id":"a06-p1-d10-v-10","x":1623.04,"y":-91,"w":106.8,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-11","x":1729.84,"y":-69.37,"w":42,"h":43.2,"kind":"ground"},{"id":"a06-p1-d10-v-12","x":2132.08,"y":24.25,"w":249.6,"h":307.2,"kind":"ground"},{"id":"a06-p1-d10-v-13","x":2256.88,"y":-40.625,"w":124.8,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-14","x":2438.32,"y":93.75,"w":976.8,"h":240,"kind":"ground","role":"airport-fill"},{"id":"a06-p1-d10-v-15","x":2451.28,"y":25.375,"w":138,"h":67.92,"kind":"ground"},{"id":"a06-p1-d10-v-16","x":2755.6,"y":72.25,"w":72,"h":21.6,"kind":"ground"},{"id":"a06-p1-d10-v-17","x":2937.28,"y":72.25,"w":241.2,"h":21.6,"kind":"ground"},{"id":"a06-p1-d10-v-18","x":3058.72,"y":50.625,"w":120.9,"h":21.6,"kind":"ground"},{"id":"a06-p1-d10-v-19","x":3178.48,"y":29,"w":248.58,"h":64.8,"kind":"ground"},{"id":"a06-p1-d10-v-20","x":3276.88,"y":-29.75,"w":138,"h":363.5,"kind":"ground","role":"airport-solid"},{"id":"a06-p1-d10-v-21","x":3550.48,"y":93.38,"w":960,"h":48,"kind":"ground"},{"id":"a06-p1-d10-v-22","x":3747.28,"y":71.75,"w":72,"h":21.6,"kind":"ground"},{"id":"a06-p2-d12-v-01","x":4518.48,"y":93.375,"w":718.8,"h":232.8,"kind":"ground"},{"id":"a06-p2-d12-v-03","x":4974.48,"y":23.75,"w":262.8,"h":69.6,"kind":"ground"},{"id":"a06-p2-d12-v-04","x":5099.28,"y":-33.75,"w":138,"h":57.6,"kind":"ground"},{"id":"a06-p2-d12-v-05","x":5353.68,"y":-35,"w":620.4,"h":301.2,"kind":"ground"},{"id":"a06-p2-d12-v-06","x":5528.88,"y":-56.625,"w":208.8,"h":21.6,"kind":"ground"},{"id":"a06-p2-d12-v-07","x":5650.08,"y":-78.25,"w":79.44,"h":21.6,"kind":"ground"},{"id":"a06-p2-d12-v-08","x":5782.08,"y":-150.25,"w":192,"h":115.2,"kind":"ground"},{"id":"a06-p2-d12-v-10","x":6306.48,"y":28.63,"w":769.2,"h":301.2,"kind":"ground"},{"id":"a06-p2-d12-v-12","x":6599.28,"y":7,"w":88.8,"h":21.6,"kind":"ground"},{"id":"a06-p2-d12-slope-1","x":5974.08,"y":-131.74,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a06-p2-d12-slope-2","x":6040.56,"y":-91.62,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a06-p2-d12-slope-3","x":6107.04,"y":-51.49,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a06-p2-d12-slope-4","x":6173.52,"y":-11.5,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a06-p2-d12-slope-5","x":6240,"y":28.63,"w":66.48,"h":40.08,"kind":"ground"},{"id":"a06-p3-d13-v-01","x":7083.68,"y":28.625,"w":375.6,"h":120,"kind":"ground"},{"id":"a06-p3-d13-v-03","x":7683.68,"y":-90.24,"w":120,"h":116.4,"kind":"ground"},{"id":"a06-p3-d13-v-04","x":7920.08,"y":-90.24,"w":120,"h":237.6,"kind":"ground"},{"id":"a06-p3-d13-slope1-1","x":7459.28,"y":-11,"w":74.8,"h":39.63,"kind":"ground"},{"id":"a06-p3-d13-slope1-2","x":7534.08,"y":-50.625,"w":74.8,"h":39.63,"kind":"ground"},{"id":"a06-p3-d13-slope1-3","x":7608.88,"y":-90.25,"w":74.8,"h":39.63,"kind":"ground"}],"catchableSurfaces":[{"id":"a06-p1-d10-v-07"},{"id":"a06-p1-d10-v-08"},{"id":"a06-p1-d10-v-10"},{"id":"a06-p1-d10-v-13"},{"id":"a06-p1-d10-v-15"},{"id":"a06-p1-d10-v-16"},{"id":"a06-p1-d10-v-17"},{"id":"a06-p1-d10-v-18"},{"id":"a06-p1-d10-v-19"},{"id":"a06-p1-d10-v-20"},{"id":"a06-p1-d10-v-22"},{"id":"a06-p2-d12-v-03"},{"id":"a06-p2-d12-v-04"},{"id":"a06-p2-d12-v-06"},{"id":"a06-p2-d12-v-07"},{"id":"a06-p2-d12-v-08"},{"id":"a06-p2-d12-v-12"},{"id":"a06-p3-d13-slope1-2"},{"id":"a06-p3-d13-slope1-3"},{"id":"a06-p3-d13-slope1-1"},{"id":"a06-p1-d10-v-02"},{"id":"a06-p2-d12-v-01"},{"id":"a06-p3-d13-v-01"}],"diveZones":[{"id":"a06-p1-d10-dz-01","x1":213.22,"x2":253.22,"landX":446,"landY":-112.62},{"id":"a06-p1-d10-dz-02","x1":672.4,"x2":712.4,"landX":981.68,"landY":-91},{"id":"a06-p1-d10-dz-03","x1":1847.31,"x2":1887.31,"landX":2172.08,"landY":24.25},{"id":"a06-p1-d10-dz-04","x1":3387.06,"x2":3427.06,"landX":3590.48,"landY":93.38},{"id":"a06-p2-d12-dz-01","x1":4762.32,"x2":4802.32,"landX":5014.48,"landY":23.75},{"id":"a06-p2-d12-dz-02","x1":5099.28,"x2":5139.28,"landX":5393.68,"landY":-35},{"id":"a06-p2-d12-dz-03","x1":5474.11,"x2":5514.11,"landX":5822.08,"landY":-150.25},{"id":"a06-p2-d12-dz-04","x1":6406.5,"x2":6446.5,"landX":6639.28,"landY":7},{"id":"a06-p3-d13-dz-01","x1":7258.85,"x2":7298.85,"landX":7499.28,"landY":-11},{"id":"a06-p3-d13-dz-02","x1":7657.5,"x2":7697.5,"landX":7960.08,"landY":-90.24}],"obstacles":[{"id":"a06-p1-d10-vault-04","type":"vault","x":253.22,"w":24,"h":48,"baseY":-91},{"id":"a06-p2-d12-vault-03","type":"vault","x":4804.48,"w":24,"h":48,"baseY":93.38},{"id":"a06-hard-1","type":"vault","x":3922.48,"w":72,"h":48,"baseY":93.38},{"id":"a06-hard-2","type":"slide","x":4222.48,"w":72,"h":48,"baseY":93.38},{"id":"a06-hard-3","type":"vault","x":6494.48,"w":72,"h":48,"baseY":28.63},{"id":"a06-hard-4","type":"slide","x":6786.48,"w":72,"h":48,"baseY":28.63}],"length":8180.08,"finishX":8040.08,"checkpoints":[70,2010.02,4020.04,6030.06],"mode":"hard","coins":makeCoins("A06", COINS.A06)}
  });
  // Tur 13: checkpoints that were sampled over gaps now sit on the last
  // playable, drawn surface before the required traversal.
  const LEGACY_GAP_CHECKPOINTS = Object.freeze({
    A02:[70,3149.04,4585.44,6433.68], A03:[70,2010.02,4020.04,6030.06], A04:[70,2404.94,4809.88,7214.82],
    A05:[70,2059.45,4118.91,6178.36], A06:[70,2010.02,4020.04,6030.06],
    D16:[70,3149.04,4585.44,6433.68], F04:[70,2068.59,4137.19,6205.79],
    F06:[70,2320.11,4640.23,6960.34], M05:[70,2059.45,4118.91,6178.36],
    M06:[70,2092.52,4185.04,6277.56],
  });
  const SAFE_CHECKPOINTS = Object.freeze({
    A02:[70,3149.04,4585.44,5601.6], A03:[70,1847.31,4020.04,6030.06], A04:[70,2256.88,4809.88,7214.82],
    A05:[70,1847.31,4118.91,6178.36], A06:[70,1847.31,4020.04,6030.06],
    D16:[70,3149.04,4585.44,5601.6], F04:[70,1755.8,4137.19,6205.79],
    F06:[70,2136,4640.23,6960.34], M05:[70,1847.31,4118.91,6178.36],
    M06:[70,1847.31,4185.04,6277.56],
  });
  for (const [id, checkpoints] of Object.entries(SAFE_CHECKPOINTS)) ROUTES[id].checkpoints = checkpoints;
const D09_OPENING_FIX=ROUTES.D09;
const F05_DESCENT_FIX=ROUTES.F05?.groundSegments?.find(s=>s.id==="f05-p2-d01-v-21");
if(F05_DESCENT_FIX){
  const right=F05_DESCENT_FIX.x+F05_DESCENT_FIX.w;
  F05_DESCENT_FIX.x=4650;
  F05_DESCENT_FIX.w=Number((right-F05_DESCENT_FIX.x).toFixed(2));
}
const HERMES_ROUTE_IDS=new Set(["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14","D15","D16","D17","D18","F01","F02","F03","F04","F05","F06","M01","M02","M03","M04","M05","M06","A01","A02","A03","A04","A05","A06"]);
let jumpHintZoneSets=new Map();
if(D09_OPENING_FIX){
  D09_OPENING_FIX.highJumpZones=D09_OPENING_FIX.highJumpZones.filter(z=>z.id!=="d09-highjump500-01");
  D09_OPENING_FIX.highJumpZones=D09_OPENING_FIX.highJumpZones.filter(z=>z.id!=="d09-highjump500-03");
  D09_OPENING_FIX.diveZones=D09_OPENING_FIX.diveZones.filter(z=>z.id!=="d09-divingkong-02");
  D09_OPENING_FIX.scriptedMoveZones=D09_OPENING_FIX.scriptedMoveZones.filter(z=>!["d09-highjump500-01","d09-divingkong-02","d09-highjump500-03"].includes(z.id));
  const D09_OPENING_POST=D09_OPENING_FIX.groundSegments.find(s=>s.id==="d09-ir-03");
  if(D09_OPENING_POST)D09_OPENING_POST.w=132.96;
  const D09_G2_BLOCK=D09_OPENING_FIX.groundSegments.find(s=>s.id==="d09-ir-40");
  if(D09_G2_BLOCK)D09_G2_BLOCK.w=320;
  const D09_SARKAN_STEP=D09_OPENING_FIX.groundSegments.find(s=>s.id==="d09-ir-23");
  if(D09_SARKAN_STEP)D09_SARKAN_STEP.h=303.675;
  if(!D09_OPENING_FIX.catchableSurfaces.some(s=>(typeof s==="string"?s:s.id)==="d09-ir-23"))D09_OPENING_FIX.catchableSurfaces.push({id:"d09-ir-23"});
  const D09_SARKAN_SLIDES=[
    ["d09-ir-slide-01",3820,277.375],
    ["d09-ir-slide-02",3932,277.375],
    ["d09-ir-slide-03",4044,277.375],
  ];
  for(const [id,x,baseY] of D09_SARKAN_SLIDES){
    const obstacle=D09_OPENING_FIX.obstacles.find(o=>o.id===id);
    if(obstacle){obstacle.x=x;obstacle.baseY=baseY}
    const scripted=D09_OPENING_FIX.scriptedMoveZones.find(z=>z.id===`${id}-scripted`);
    if(scripted){scripted.x=x;scripted.x1=x-60;scripted.x2=x-16}
  }
}
function applyD09LogicRulesToRoutes(){
  const routeIds=Object.keys(ROUTES).filter(id=>/^(?:D(?:0[1-9]|1[0-8])|[FMA]0[1-6])$/.test(id)&&id!=="D09").sort();
  const overlaps=(a0,a1,b0,b1,pad=0)=>a0<b1+pad&&a1>b0-pad;
  const surfaces=(r)=>{
    const out=r.groundSegments?r.groundSegments.map(s=>({...s})):[{id:`${r.routeId||"route"}-ground`,x:0,y:GROUND,w:r.length,h:100,kind:"ground"}];
    for(const o of r.obstacles||[]){
      const baseY=o.baseY??GROUND;
      if(o.type==="vault")out.push({id:o.id,x:o.x,y:baseY-o.h,w:o.w,h:o.h,parkour:"vault"});
      if(o.type==="slide")out.push({id:o.id,x:o.x,y:baseY-o.h-32,w:o.w,h:o.h,parkour:"slide"});
      if(o.type==="platform")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"platform"});
      if(o.type==="overpass")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"movingPlatform"});
      if(o.type==="wallRun")out.push({id:o.id,x:o.x,y:baseY-130,w:o.w,h:130,parkour:"wallRun"});
      if(o.type==="collapse")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"collapse"});
      if(o.type==="containerDoor")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"containerDoor"});
      if(o.type==="crane"||o.type==="pallet")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"movingPlatform"});
    }
    return out;
  };
  const isSupported=(s,solids)=>{
    if(s.y+s.h>=GROUND-1)return true;
    return solids.some(v=>v.id!==s.id&&v.y>=s.y+s.h-1&&overlaps(s.x,s.x+s.w,v.x,v.x+v.w,4)&&isSupported(v,solids));
  };
  const actionWindows=(r)=>[...(r.highJumpZones||[]).map(z=>({x1:z.x1,x2:z.x2,landX:z.landX})),...(r.diveZones||[]).map(z=>({x1:z.x1,x2:z.x2,landX:z.landX})),...(r.scriptedMoveZones||[]).map(z=>({x1:z.x1,x2:z.x2,landX:z.endX,id:z.id}))].filter(z=>Number.isFinite(z.x1)&&Number.isFinite(z.x2));
  const transitionBands=(r)=>actionWindows(r).flatMap(z=>{
    const out=[{x0:z.x1-16,x1:z.x2+16,id:z.id}];
    if(Number.isFinite(z.landX))out.push({x0:z.landX-40,x1:z.landX+40,id:z.id});
    return out;
  });
  const slideBar=(o)=>({x0:o.x-16,x1:o.x+o.w+16});
  const bandOverlap=(bar,bands)=>bands.reduce((n,b)=>n+Math.max(0,Math.min(bar.x1,b.x1)-Math.max(bar.x0,b.x0)),0);
  const supportUnderSlide=(slide,r)=>{
    const baseY=slide.baseY??GROUND;
    return (r.groundSegments||[]).filter(s=>Math.abs(s.y-baseY)<=1.5&&overlaps(slide.x,slide.x+slide.w,s.x,s.x+s.w,0));
  };
  const slideHasSupport=(slide,r)=>{
    const supports=supportUnderSlide(slide,r);
    if(!supports.length)return false;
    const cover=supports.reduce((n,s)=>n+Math.max(0,Math.min(slide.x+slide.w,s.x+s.w)-Math.max(slide.x,s.x)),0);
    if(cover<slide.w-1)return false;
    return Math.min(...supports.map(s=>Math.min(Math.abs(slide.x-s.x),Math.abs((s.x+s.w)-(slide.x+slide.w)))))>=24;
  };
  const vaultLandingBands=(r)=>(r.obstacles||[]).filter(o=>o.type==="vault").map(o=>({x0:o.x+o.w,x1:o.x+o.w+160,id:o.id}));
  const slideInLanding=(slide,r)=>{
    const bar=slideBar(slide);
    return vaultLandingBands(r).some(b=>overlaps(bar.x0,bar.x1,b.x0,b.x1,0));
  };
  const relocateSlidesOffTransitions=(r)=>{
    const removeByRoute={
      D07:["d07-slide-01"],
      D08:["d08-slide-01","d08-slide-03"],
      D10:["d10-slide-01","d10-slide-02"],
      D11:["d11-slide-02"],
      D12:["d12-slide-01"],
      D13:["d13-slide-01","d13-slide-02","d13-slide-03","d13-slide-05","d13-slide-06"],
      D15:["d15-slide-01"],
      D17:["d17-p2-m03-slide-06"],
      D18:["d18-p1-a01-slide-01","d18-p2-f03-slide-04","d18-p2-f03-slide-05"],
      F01:["f01-p2-d13-slide-06"],
    };
    const stats={moved:0,removed:0,blocked:0,removedIds:[],movedIds:[],blockedIds:[]};
    const removals=new Set(removeByRoute[r.routeId]||[]);
    if(removals.size){
      const before=(r.obstacles||[]).length;
      r.obstacles=(r.obstacles||[]).filter(o=>!(o.type==="slide"&&removals.has(o.id)));
      r.scriptedMoveZones=(r.scriptedMoveZones||[]).filter(z=>!removals.has(z.obstacleId)&&!removals.has(String(z.id||"").replace(/-scripted$/,"")));
      stats.removed=before-r.obstacles.length;
      stats.removedIds=[...removals];
    }
    const bands=transitionBands(r);
    for(const o of [...(r.obstacles||[])]){
      if(o.type!=="slide")continue;
      const ownId=`${o.id}-scripted`;
      const relevant=bands.filter(b=>b.id!==ownId);
      if(!bandOverlap(slideBar(o),relevant))continue;
      stats.blocked++;
      stats.blockedIds.push(o.id);
    }
    const unsafe=(r.obstacles||[]).filter(o=>o.type==="slide"&&(!slideHasSupport(o,r)||slideInLanding(o,r))).map(o=>o.id);
    if(unsafe.length){
      removeSlides(r,unsafe);
      stats.removed+=unsafe.length;
      stats.removedIds.push(...unsafe);
    }
    return stats;
  };
  const surfaceTouched=(s,r)=>{
    const zones=actionWindows(r);
    if(zones.some(z=>overlaps(s.x,s.x+s.w,z.x1-80,z.x2+120)))return true;
    if(zones.some(z=>Number.isFinite(z.landX)&&z.landX>=s.x-16&&z.landX<=s.x+s.w+16))return true;
    if((r.catchableSurfaces||[]).some(c=>(typeof c==="string"?c:c.id)===s.id))return true;
    if((r.coins||[]).some(c=>c.x>=s.x-4&&c.x<=s.x+s.w+4&&c.y<=s.y+8))return true;
    return s.w>=160&&s.x<(r.finishX??r.length);
  };
  const bestStandingSurface=(r,x,preferY=GROUND,minW=72)=>{
    const solids=surfaces(r).filter(s=>(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform")&&s.w>=minW);
    const covered=solids.filter(s=>x>=s.x+18&&x<=s.x+s.w-18);
    const pool=covered.length?covered:solids;
    return pool.sort((a,b)=>Math.abs(a.y-preferY)-Math.abs(b.y-preferY)||Math.abs((a.x+a.w/2)-x)-Math.abs((b.x+b.w/2)-x))[0]||null;
  };
  const narrowGaps=(solids)=>{
    const gaps=[],byX=[...solids].sort((a,b)=>a.x-b.x||a.y-b.y),seen=new Set();
    for(const left of byX)for(const right of byX){
      if(right===left||Math.abs(right.y-left.y)>12)continue;
      const gap=right.x-(left.x+left.w);
      if(gap<=.5||gap>=40)continue;
      const key=`${left.id}/${right.id}`;
      if(!seen.has(key)){seen.add(key);gaps.push({left,right,gap})}
    }
    return gaps;
  };
  const coinRectOverlap=(coin,s,radius=COIN_CONTACT_RADIUS)=>{
    if(!s||s.solid===false||!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.w)||!Number.isFinite(s.h)||s.w<=0||s.h<=0)return false;
    const x=Math.max(s.x,Math.min(coin.x,s.x+s.w)),y=Math.max(s.y,Math.min(coin.y,s.y+s.h));
    return (x-coin.x)**2+(y-coin.y)**2<=(radius+1)**2;
  };
  const coinSolidRects=(r)=>surfaces(r).filter(s=>s.solid!==false&&(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform"||s.kind==="collapse"||s.kind==="containerDoor"||s.parkour));
  const coinNaturalSupport=(coin,solids)=>solids.filter(s=>!s.parkour&&(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform"||s.kind==="collapse")&&coin.x>=s.x+12&&coin.x<=s.x+s.w-12).sort((a,b)=>Math.abs((a.y-COIN_CONTACT_RADIUS-7)-coin.y)-Math.abs((b.y-COIN_CONTACT_RADIUS-7)-coin.y))[0]||null;
  const coinIssue=(coin,r,solids)=>{
    if(coin.x<24||coin.x>(r.finishX??r.length)-60)return true;
    if(solids.some(s=>coinRectOverlap(coin,s)))return true;
    return false;
  };
  const repairCoinSolids=(r)=>{
    let moved=0;
    for(let guard=0;guard<72&&r.coins?.length;guard++){
      const solids=coinSolidRects(r),coin=r.coins.find(c=>!c.pathLocked&&coinIssue(c,r,solids));
      if(!coin)break;
      const outside=coin.x<24||coin.x>(r.finishX??r.length)-60;
      const candidates=solids.filter(s=>!s.parkour&&(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform"||s.kind==="collapse")&&s.w>=44)
        .sort((a,b)=>{const ax=Math.abs(Math.max(a.x+24,Math.min(coin.x,a.x+a.w-24))-coin.x),bx=Math.abs(Math.max(b.x+24,Math.min(coin.x,b.x+b.w-24))-coin.x),ay=Math.abs(a.y-coin.y),by=Math.abs(b.y-coin.y);return outside?ay-by||ax-bx:ax-bx||ay-by});
      const original={x:coin.x,y:coin.y};let placed=false;
      for(const s of candidates){
        const left=Math.max(24,s.x+24),right=Math.min((r.finishX??r.length)-60,s.x+s.w-24);
        if(right<left)continue;
        const center=Math.max(left,Math.min(original.x,right)),slots=[0,-56,56,-112,112,-168,168,-224,224];
        for(const offset of slots){
          const x=Math.max(left,Math.min(right,center+offset));
          if(r.coins.some(c=>c!==coin&&Math.abs(c.x-x)<40&&Math.abs(c.y-(s.y-COIN_CONTACT_RADIUS-7))<40))continue;
          coin.x=Number(x.toFixed(2));coin.y=Number((s.y-COIN_CONTACT_RADIUS-7).toFixed(2));
          if(!coinIssue(coin,r,coinSolidRects(r))){placed=true;moved++;break}
        }
        if(placed)break;
      }
      if(!placed){coin.x=original.x;coin.y=original.y;break}
    }
    return moved;
  };
  const closeNarrowGaps=(r)=>{
    let closed=0;
    for(let guard=0;guard<24;guard++){
      const gap=narrowGaps(surfaces(r).filter(s=>s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform"))[0];
      if(!gap)break;
      const left=(r.groundSegments||[]).find(s=>s.id===gap.left.id);
      const right=(r.groundSegments||[]).find(s=>s.id===gap.right.id);
      if(!left||!right)break;
      left.w=Number((right.x-left.x).toFixed(3));
      closed++;
    }
    return closed;
  };
  const coinPathFixes={
    D03:{"D03-c03":[3288.29,219.29],"D03-c04":[4138.22,291.03],"D03-c08":[2506.16,78.73],"D03-c09":[3279.8,220.61],"D03-c11":[5843.57,330.55]},
    D04:{"D04-c01":[3999.87,-131.8],"D04-c04":[7009.66,231.71],"D04-c08":[7009.66,231.71],"D04-c09":[4275.07,-131.8]},
    D05:{"D05-c01":[2390.36,-639.52],"D05-c03":[3639.21,-419.61],"D05-c04":[7117.82,305.65]},
    D06:{"D06-c01":[957.72,93.15],"D06-c03":[1873.23,72.52],"D06-c04":[4600.39,376.03]},
    D09:{"D09-c01":[620.19,246.63],"D09-c02":[943.72,246.63],"D09-c05":[2925.53,329.5],"D09-c08":[4639.48,374.63],"D09-c09":[4987.96,374.63],"D09-c11":[6518.63,383],"D09-c12":[7080.48,323]},
    D10:{"D10-c01":[314.46,-167.47],"D10-c02":[769,-148.49],"D10-c07":[5574.26,59.03],"D10-c09":[8586.61,424.6]},
    D14:{"D14-c01":[1668.74,198.26],"D14-c03":[2757.07,-36.91],"D14-c04":[3827.42,19.73],"D14-c06":[7674.92,389.14],"D14-c07":[8616.79,319.54],"D14-c14":[2738.28,-38.54]},
    D15:{"D15-c01":[495.82,279.61],"D15-c03":[2235.30,341.23],"D15-c04":[2709.31,178.39],"D15-c05":[4601.82,189.20],"D15-c06":[6016.59,314.53],"D15-c07":[7819.06,262.57],"D15-c08":[626.80,313.88]},
    D16:{"D16-c01":[1041.77,-1437.61],"D16-c02":[1785.43,-1322.78],"D16-c12":[2977.06,-893.2]},
    D18:{"D18-c02":[701.06,179.55],"D18-c03":[678.89,308.05],"D18-c04":[1119.26,108],"D18-c06":[2339.98,343.8],"D18-c08":[2813.89,183.2],"D18-c11":[5697.16,44.94],"D18-c12":[6123.33,-10.98]},
    F03:{"F03-c06":[441.62,83.47],"F03-c07":[1492.53,216.83],"F03-c08":[2679.66,287.95],"F03-c10":[6385.24,165.69]},
    F04:{"F04-c07":[2272.69,314.36],"F04-c08":[7118.66,456.2],"F04-c12":[660.22,-369.92]},
    F05:{"F05-c01":[1464.13,-264.89],"F05-c05":[7897.28,874.38],"F05-c12":[7727.27,831.89]},
    M02:{"M02-c01":[511.38,-291.3],"M02-c04":[2113.74,-341.19],"M02-c06":[3210.65,-95.2]},
    A01:{"A01-c03":[2334.74,340.24],"A01-c04":[2828.27,206.78],"A01-c07":[7909.08,288.8]},
  };
  const alignCoinsToIdealPath=(r)=>{
    const samples=window.TMB_CHIEF_PATHS?.[r.routeId]?.samples;
    if(!Array.isArray(samples)||samples.length<2||!r.coins?.length)return 0;
    let moved=0;
    for(const coin of r.coins){
      let best=null,bestDx=Infinity,bestDy=Infinity;
      for(const sample of samples){
        const dx=Math.abs((sample[1]+16)-coin.x),dy=Math.abs((sample[2]+24)-coin.y);
        if(dx<bestDx-.01||(Math.abs(dx-bestDx)<=.01&&dy<bestDy)){best=sample;bestDx=dx;bestDy=dy}
      }
      if(!best)continue;
      const x=Number((best[1]+16).toFixed(2)),y=Number((best[2]+24).toFixed(2));
      if(Math.abs(coin.x-x)>.01||Math.abs(coin.y-y)>.01)moved++;
      coin.x=x;coin.y=y;
    }
    return moved;
  };
  const moveSlide=(r,id,x,baseY)=>{
    const o=(r.obstacles||[]).find(v=>v.id===id);
    if(o){o.x=x;o.baseY=baseY}
    const z=(r.scriptedMoveZones||[]).find(v=>v.obstacleId===id||v.id===`${id}-scripted`);
    if(z){z.x=x;z.x1=x-60;z.x2=x-16}
  };
  const removeSlides=(r,ids)=>{
    const blocked=new Set(ids);
    r.obstacles=(r.obstacles||[]).filter(o=>!(o.type==="slide"&&blocked.has(o.id)));
    r.scriptedMoveZones=(r.scriptedMoveZones||[]).filter(z=>!blocked.has(z.obstacleId)&&!blocked.has(String(z.id||"").replace(/-scripted$/,"")));
    r.visualAttachments=(r.visualAttachments||[]).filter(a=>!blocked.has(a.targetId));
  };
  if(ROUTES.D09)moveSlide(ROUTES.D09,"d09-ir-slide-04",4156,277.375);
  if(ROUTES.D18)removeSlides(ROUTES.D18,["d18-p1-a01-slide-02","d18-p1-a01-slide-04"]);
  if(ROUTES.D14)removeSlides(ROUTES.D14,["d14-slide-01","d14-slide-02"]);
  if(ROUTES.D15)removeSlides(ROUTES.D15,["d15-slide-02"]);
  for(const id of routeIds){
    const r=ROUTES[id];
    const slideStats=relocateSlidesOffTransitions(r);
    const closedGaps=closeNarrowGaps(r);
    r.logicRuleStats={...(r.logicRuleStats||{}),slideMoved:slideStats.moved,slideRemoved:slideStats.removed,slideBlocked:slideStats.blocked,physicalGapClosed:closedGaps};
    r.logicRuleDetails={...(r.logicRuleDetails||{}),slideMoved:slideStats.movedIds,slideRemoved:slideStats.removedIds,slideBlocked:slideStats.blockedIds};
    r.visualAttachments=r.visualAttachments||[];
    for(const o of r.obstacles||[])if(o.type==="slide"&&!r.visualAttachments.some(a=>a.targetId===o.id&&a.type==="suspend"))r.visualAttachments.push({targetId:o.id,type:"suspend"});
    r.logicRuleStats.coinPathAligned=alignCoinsToIdealPath(r);
    const coinFix=coinPathFixes[id];
    if(coinFix&&r.coins)for(const c of r.coins){const xy=coinFix[c.id];if(xy){c.x=xy[0];c.y=xy[1];c.pathLocked=true}}
    r.logicRuleStats.coinSolidRepaired=repairCoinSolids(r);
    let workersGrounded=0;
    for(const o of r.obstacles||[]){
      if(o.type!=="worker")continue;
      const s=bestStandingSurface(r,o.x,o.baseY??GROUND,96);
      if(!s){o.offscreenWait=true;workersGrounded++;continue}
      const nextX=Number(Math.min(Math.max(o.x,s.x+32),s.x+s.w-32).toFixed(2));
      if(Math.abs(nextX-o.x)>.1||Math.abs((o.baseY??GROUND)-s.y)>.1)workersGrounded++;
      o.x=nextX;
      o.baseY=Number(s.y.toFixed(2));
      o.offscreenWait=false;
    }
    r.logicRuleStats.workerGrounded=workersGrounded;
    r.visualSupports=r.visualSupports||[];
    const solids=surfaces(r).filter(s=>s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform");
    const catchableIds=new Set((r.catchableSurfaces||[]).map(c=>typeof c==="string"?c:c.id));
    const touchesBelow=(s)=>s.y+s.h>=GROUND-1||solids.some(v=>v.id!==s.id&&Math.abs(v.y-(s.y+s.h))<=1.5&&overlaps(s.x,s.x+s.w,v.x,v.x+v.w,4));
    const airGapBelow=(s)=>{
      const bottom=s.y+s.h;
      if(bottom>=GROUND-1)return 0;
      const below=solids.filter(v=>v.id!==s.id&&v.y>=bottom-1&&overlaps(s.x,s.x+s.w,v.x,v.x+v.w,4)).sort((a,b)=>a.y-b.y)[0];
      return below?below.y-bottom:GROUND-bottom;
    };
    const bodyCutsRunPath=(s)=>{
      const top=s.y+s.h;
      if(top>=GROUND-1)return false;
      return solids.some(v=>v.id!==s.id&&v.y>=top-1&&v.y<GROUND-1&&overlaps(s.x,s.x+s.w,v.x,v.x+v.w,0)&&surfaceTouched(v,r));
    };
    let skipped=0;
    for(const s of solids){
      const gap=airGapBelow(s);
      if(!(!isSupported(s,solids)||(catchableIds.has(s.id)&&!touchesBelow(s))||gap>20))continue;
      if(r.visualSupports.some(v=>v.id===s.id&&v.type==="stack-to-ground"))continue;
      if(r.visualAttachments.some(v=>v.targetId===s.id&&v.type==="suspend"))continue;
      if(bodyCutsRunPath(s)){
        if(!r.visualAttachments.some(v=>v.targetId===s.id&&v.type==="suspend"))r.visualAttachments.push({targetId:s.id,type:"suspend"});
        skipped++;
        continue
      }
      r.visualSupports.push({id:s.id,type:"stack-to-ground"});
    }
    r.logicRuleStats.visualSupportSkipped=skipped;
  }
  if(ROUTES.D09){
    ROUTES.D09.logicRuleStats={...(ROUTES.D09.logicRuleStats||{}),coinPathAligned:alignCoinsToIdealPath(ROUTES.D09)};
    const coinFix=coinPathFixes.D09;
    for(const c of ROUTES.D09.coins||[]){const xy=coinFix?.[c.id];if(xy){c.x=xy[0];c.y=xy[1];c.pathLocked=true}}
    ROUTES.D09.logicRuleStats={...(ROUTES.D09.logicRuleStats||{}),coinSolidRepaired:repairCoinSolids(ROUTES.D09)};
  }
  for(const [rid,ids] of Object.entries({
    D09:["d09-ir-08","d09-ir-46"],
    D04:["d04-v-14","d04-v-24","d04-v-27"],
    D11:["d11-v-24","d11-v-22","d11-v-17","d11-deadend-i11-step-2","d11-deadend-i11-step-3"],
  })){
    const r=ROUTES[rid];if(!r)continue;
    r.visualAttachments=r.visualAttachments||[];
    for(const id of ids)if(!r.visualAttachments.some(v=>v.targetId===id&&v.type==="suspend"))r.visualAttachments.push({targetId:id,type:"suspend"});
  }
}
applyD09LogicRulesToRoutes();
  const JUMP_HINT_ZONE_IDS=Object.freeze({
    D01:["d01-dz-01","d01-dz-02"],
    D02:["d02-dz-01"],
    D03:["d03-dz-01","d03-dz-02","d03-dz-03"],
    D04:["d04-dz-01","d04-dz-02","d04-dz-03"],
    D05:["d05-dz-01","d05-dz-02","d05-dz-03"],
    D06:["d06-dz-01","d06-dz-02","d06-dz-03","d06-dz-04"],
    D07:["d07-dz-01","d07-dz-02","d07-hj-01","d07-dz-03","d07-dz-04a","d07-dz-04"],
    D08:["d08-dz-01","d08-dz-02","d08-dz-03","d08-dz-04","d08-dz-05-assist","d08-dz-05b-assist","d08-dz-05","d08-dz-06-assist","d08-dz-06","d08-dz-07-assist","d08-dz-07"],
    D09:["d09-highjump500-06","d09-highjump500-11","d09-highjump500-25","d09-highjump500-29","d09-highjump500-33"],
    D10:["d10-dz-01","d10-dz-02","d10-dz-03","d10-dz-05","d10-dz-06","d10-dz-06-assist","d10-dz-07","d10-dz-07-assist","d10-dz-08","d10-dz-09","d10-dz-10","d10-dz-11"],
    D11:["d11-dz-01","d11-dz-02","d11-dz-03","d11-dz-04","d11-dz-06","d11-dz-07","d11-dz-08","d11-dz-09","d11-dz-10"],
    D12:["d12-dz-01","d12-dz-02","d12-dz-03","d12-dz-04","d12-dz-06","d12-dz-07","d12-dz-08","d12-dz-09"],
    D13:["d13-dz-01","d13-dz-02","d13-dz-03","d13-dz-04","d13-dz-05","d13-dz-06","d13-dz-07","d13-dz-08","d13-dz-10"],
    D14:["d14-dz-01","d14-dz-02","d14-dz-03","d14-dz-04","d14-dz-05","d14-dz-06","d14-dz-07"],
    D15:["d15-dz-01","d15-dz-02","d15-dz-03","d15-dz-04","d15-dz-05","d15-dz-06","d15-dz-07","d15-dz-08"],
    D16:["d16-dz-01","d16-dz-02","d16-dz-03","d16-dz-04","d16-dz-05","d16-dz-06","d16-dz-08","d16-dz-09"],
    D17:["d17-p1-f04-dz-01","d17-p1-f04-dz-02","d17-p1-f04-dz-03","d17-p2-m03-dz-08","d17-p2-m03-dz-09","d17-p2-m03-dz-10"],
    D18:["d18-p1-a01-dz-01","d18-p1-a01-dz-02","d18-p1-a01-dz-03","d18-p1-a01-dz-04","d18-p2-f03-dz-07","d18-p2-f03-dz-08","d18-p2-f03-dz-09","d18-p2-f03-dz-10","d18-p2-f03-dz-11","d18-p2-f03-dz-12"],
    F01:["f01-p1-d07-dz-01","f01-p1-d07-dz-02","f01-p1-d07-dz-03","f01-p2-d13-dz-08","f01-p2-d13-dz-09","f01-p2-d13-dz-10"],
    F02:["f02-p1-d08-dz-01","f02-p1-d08-dz-02","f02-p1-d08-dz-03","f02-p1-d08-dz-04","f02-p1-d08-dz-05","f02-p1-d08-dz-06","f02-p1-d08-dz-07","f02-p2-d14-dz-05","f02-p2-d14-dz-06","f02-p2-d14-dz-07"],
    F03:["f03-p1-d09-dz-01","f03-p2-d10-dz-01","f03-p2-d10-dz-02","f03-p2-d10-dz-03","f03-p3-d12-dz-01","f03-p3-d12-dz-02","f03-p3-d12-dz-03","f03-p3-d12-dz-04"],
    F04:["f04-p1-d02-dz-01","f04-p3-d01-dz-01"],
  });
  jumpHintZoneSets=new Map(Object.entries(JUMP_HINT_ZONE_IDS).map(([id,zones])=>[id,new Set(zones)]));
  function hermesPeakForZone(z,kind){
    if(z.peakY!=null)return z.peakY;
    const longDive=kind==="dive"&&Number.isFinite(z.landX)&&Number.isFinite(z.x1)&&z.landX-z.x1>780;
    return kind==="high"?Math.min(z.landY??455,455)-122:Math.min(z.landY??455,455)-(longDive?220:93);
  }
  function toHermesZone(z,kind){
    const landX=z.landX, landY=z.landY;
    if(!Number.isFinite(z.x1)||!Number.isFinite(z.x2)||!Number.isFinite(landX)||!Number.isFinite(landY))return null;
    return {id:`hermes-${z.id}`,sourceId:z.id,kind,x1:z.x1,x2:z.x2,landX,landY,peakY:hermesPeakForZone({...z,landY},kind)};
  }
  function buildHermesLaunchZones(routeId,route){
    if(!HERMES_ROUTE_IDS.has(routeId))return [];
    const ids=new Set(JUMP_HINT_ZONE_IDS[routeId]||[]);
    const zones=[
      ...(route.diveZones||[]).filter(z=>ids.has(z.id)).map(z=>toHermesZone(z,"dive")),
      ...(route.highJumpZones||[]).filter(z=>ids.has(z.id)).map(z=>toHermesZone(z,"high")),
    ].filter(Boolean);
    if(routeId==="D09")zones.unshift({id:"d09-hermes-opening-gap",sourceId:"d09-opening-gap",kind:"gap",x1:280,x2:324,landX:403.44,landY:151.875,peakY:58});
    const seen=new Set();
    return zones.filter(z=>{if(seen.has(z.id))return false;seen.add(z.id);return true}).sort((a,b)=>a.x1-b.x1);
  }
  for(const [id,r] of Object.entries(ROUTES))r.hermesLaunchZones=buildHermesLaunchZones(id,r);
  const CHIEF_SPRITE = new Image();
  CHIEF_SPRITE.src = "sprites/chief.png";
  const BRAND_WOLF_A12 = new Image();
  BRAND_WOLF_A12.src = "sprites/brand/borugaming-wolf.png";
  let wolfDecalCanvas = null;
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
      equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
      ownedOutfitSetIds: ["default"],
      ownedChiefIds: ["securityTall"],
      equippedChief: "securityTall",
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
  function fullTestProfile(raw) {
    const n = normalizeProfile(raw);
    n.ownedRunnerIds = Object.keys(RUNNERS);
    n.ownedOutfitSetIds = Object.keys(OUTFITS);
    n.ownedChiefIds = Object.keys(CHIEFS);
    n.ownedWorldIds = Object.keys(WORLD_REGISTRY);
    return n;
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
    n.ownedRunnerIds = [
      ...new Set([
        "male",
        "female",
        ...(Array.isArray(raw.ownedRunnerIds) ? raw.ownedRunnerIds.filter((x) => RUNNERS[x]) : []),
      ]),
    ];
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
    n.ownedChiefIds = [
      ...new Set([
        "securityTall",
        ...(Array.isArray(raw.ownedChiefIds) ? raw.ownedChiefIds.filter((x) => CHIEFS[x]) : []),
      ]),
    ];
    n.equippedChief = CHIEFS[raw.equippedChief] && n.ownedChiefIds.includes(raw.equippedChief) ? raw.equippedChief : "securityTall";
    for (const id of Object.keys(RUNNERS)) {
      if (RUNNERS[id].outfitLocked || !n.ownedOutfitSetIds.includes(n.equippedOutfitByRunner[id])) n.equippedOutfitByRunner[id] = "default";
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
    if (TEST_MODE) {
      saveStatus = "memory";
      saveFailure = false;
      return Promise.resolve(true);
    }
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
    if (TEST_MODE) profile = fullTestProfile(profile);
    if (!raw) profile.settings.reducedEffects = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!TEST_MODE && profile.migrationFlags.v36 && !raw) await persist();
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
    previewChiefId = "securityTall",
    previewWorldId = "dock31",
    previewRunnerId = "male",
    previewMotion = "idle",
    previewStartedAt = 0,
    shopPreviewRaf = 0,
    purchaseBusy = false,
    nextRouteInFlight = false,
    finishAdvance = null,
    sceneCache = new Map(),
    staggerT = 0,
    invulnerableT = 0,
    respawnT = 0,
    finishGate = { phase: "open", t: 0, closeS: .52, holdS: .28, playerAlpha: 1 },
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
    jumpRun = null,
    wallJumpRun = null,
    slopeContact = null,
    routeStartedAt = 0,
    movingPlatforms = [],
    collapsing = [],
    containerDoors = [],
    campaignChief = null,
    chiefPlayerTrace = [],
    lastSafeGround = null,
    lastPrePhysicsX = null,
    campaignDeaths = 0,
    debugHidePlayer = false,
    debugHideMovingPlatforms = false,
    debugSuspendGapFilter = true,
    gameClock = 0,
    movementProfileCache = null,
    obstacleSeedCache = new Map(),
    platformOrder = { colliderFrame: 0, landingFrame: 0, carryFrame: 0 },
    flowFlash = 0,
    campaignAdPaused = false,
    routesSinceInterstitial = 0;
  document.addEventListener("tmb:campaign-ad-pause",e=>{campaignAdPaused=e.detail===true;});
  function campaignFrozen(){return campaignAdPaused || document.body.dataset.systemPaused === "true" || document.getElementById("pauseOverlay")?.classList.contains("show");}
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
  const chiefRouteHashCache=new WeakMap();
  function chiefRouteHash(r=route) {
    if(!chiefRouteHashCache.has(r))chiefRouteHashCache.set(r,sha256(canonical({groundSegments:r.groundSegments||null,slopes:r.slopes||null,obstacles:r.obstacles||[],diveZones:r.diveZones||[],catchableSurfaces:r.catchableSurfaces||[],highJumpZones:r.highJumpZones||[],...(r.wallJumpZones?.length?{wallJumpZones:r.wallJumpZones}:{}),checkpoints:r.checkpoints||[],finishX:r.finishX})));
    return chiefRouteHashCache.get(r);
  }
  function chiefPathMatchesRoute(path,r=route) {
    if(!path)return false;
    if(path.routeHash===chiefRouteHash(r))return true;
    const legacy=LEGACY_GAP_CHECKPOINTS[r.routeId];
    return !!legacy&&path.routeHash===chiefRouteHash({...r,checkpoints:legacy});
  }
  function chiefPathFor(r=route) {
    const path=window.TMB_CHIEF_PATHS?.[r.routeId];
    return chiefPathMatchesRoute(path,r)&&Array.isArray(path.samples)&&path.samples.length>1?path:null;
  }
  function chiefSample(path,t) {
    const a=path.samples;if(t<=a[0][0])return {x:a[0][1],y:a[0][2],pose:a[0][3],facing:a[0][4]};
    if(t>=a[a.length-1][0]){const q=a[a.length-1];return {x:q[1],y:q[2],pose:q[3],facing:q[4]}}
    let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m][0]<=t)lo=m;else hi=m}
    const q=a[lo],n=a[hi],u=(t-q[0])/(n[0]-q[0]);return {x:q[1]+(n[1]-q[1])*u,y:q[2]+(n[2]-q[2])*u,pose:u<.5?q[3]:n[3],facing:u<.5?q[4]:n[4]};
  }
  function chiefTimeAtX(path,x){const q=path.samples.find(v=>v[1]>=x)||path.samples[path.samples.length-1];return q[0]}
  function currentPlayerPose(){return diveRun?"dive":wallJumpRun?"wallRun":engine.parkour.state||"run"}
  function resetChiefTrace(){chiefPlayerTrace=[];recordChiefTrace(true)}
  function recordChiefTrace(force=false){
    if(!campaignChief?.path||!run||result)return;
    const last=chiefPlayerTrace[chiefPlayerTrace.length-1];
    if(!force&&last&&gameClock-last.t<.033&&Math.abs(player.x-last.x)<2&&Math.abs(player.y-last.y)<2&&last.pose===currentPlayerPose())return;
    chiefPlayerTrace.push({t:gameClock,x:player.x,y:player.y,feet:player.y+player.h,pose:currentPlayerPose(),facing:player.facing||1,checkpointX:run.checkpointX});
    if(chiefPlayerTrace.length>900)chiefPlayerTrace.splice(0,chiefPlayerTrace.length-900);
  }
  function chiefTraceSample(t){
    const a=chiefPlayerTrace;if(!a.length)return null;
    if(t<=a[0].t)return a[0];
    if(t>=a[a.length-1].t)return a[a.length-1];
    let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].t<=t)lo=m;else hi=m}
    const q=a[lo],n=a[hi],u=(t-q.t)/Math.max(.001,n.t-q.t);
    return {t,x:q.x+(n.x-q.x)*u,y:q.y+(n.y-q.y)*u,feet:q.feet+(n.feet-q.feet)*u,pose:u<.5?q.pose:n.pose,facing:u<.5?q.facing:n.facing,checkpointX:n.checkpointX};
  }
  function chiefTraceSampleAtX(x){
    const a=chiefPlayerTrace;if(!a.length)return null;
    // A retry starts a new live trace at the checkpoint.  Do not project every
    // older chief position onto that first sample: doing so spawns the chief on
    // top of the player until enough post-retry trace has been recorded.
    if(x<a[0].x-2)return null;
    if(x<=a[0].x)return a[0];
    for(let i=1;i<a.length;i++){
      const q=a[i-1],n=a[i];
      if(n.x>=x){
        const u=(x-q.x)/Math.max(.001,n.x-q.x);
        return {t:q.t+(n.t-q.t)*u,x:q.x+(n.x-q.x)*u,y:q.y+(n.y-q.y)*u,feet:q.feet+(n.feet-q.feet)*u,pose:u<.5?q.pose:n.pose,facing:u<.5?q.facing:n.facing,checkpointX:n.checkpointX};
      }
    }
    return null;
  }
  function matchPlayerToChiefPath(c){
    const a=c.path.samples,start=c.playerIndex??0,limitT=c.playerT+1;let end=start;
    while(end+1<a.length&&a[end+1][0]<=limitT)end++;
    let best=start,bestD=Infinity,minY=Infinity;
    for(let i=start;i<=end;i++){const dy=Math.abs(a[i][2]-player.y);minY=Math.min(minY,dy);const d=Math.hypot(a[i][1]-player.x,dy);if(d<bestD){bestD=d;best=i}}
    c.matchMode=minY>72?"x":"xy";
    if(c.matchMode==="x"){best=start;bestD=Infinity;for(let i=start;i<=end;i++){const d=Math.abs(a[i][1]-player.x);if(d<bestD){bestD=d;best=i}}}
    c.playerIndex=Math.max(start,best);c.playerT=Math.max(c.playerT,a[c.playerIndex][0]);
  }
  const CHIEF_ENTRY_X=-64,CHIEF_LADDER_FRACTION=.15,CHIEF_LADDER_HEIGHT=132,CHIEF_LADDER_CLIMB_T=.85,CHIEF_FAST_SCALE=40/30,CHIEF_CLOSE_GAP_PX=160,CHIEF_EASE_GAP_PX=180,CHIEF_STOP_CLOSE_PX=520,CHIEF_STOP_SPEED_PX=54,CHIEF_GRAB_START_GAP_PX=28,CHIEF_CATCH_HOLD_S=.35;
  function chiefDelayFor(path,id){
    if(!path)return undefined;
    const d=path.delay||0;
    return /^D(?:0[1-9]|1[0-8])$/.test(id)?Math.max(d,2.5):d;
  }
  function chiefChaseScale(c,dt){
    if(!c?.path||c.entryPhase!=="running")return 1;
    const gap=player.x-c.x;
    const behind=gap>40;
    const far=Math.max(0,Math.min(1,(gap-CHIEF_CLOSE_GAP_PX)/CHIEF_EASE_GAP_PX));
    let target=gap>CHIEF_CLOSE_GAP_PX?1+(CHIEF_FAST_SCALE-1)*far:1;
    const playerSlow=engine.parkour.state==="stun"||(player.onGround&&engine.parkour.state==="normal"&&!diveRun&&!wallJumpRun&&Math.abs(player.vx)<70);
    if(playerSlow&&behind&&gap<CHIEF_STOP_CLOSE_PX){
      const stopFar=Math.max(0,Math.min(1,(gap-CHIEF_CLOSE_GAP_PX)/(CHIEF_STOP_CLOSE_PX-CHIEF_CLOSE_GAP_PX)));
      const stopTarget=.25+Math.sqrt(stopFar)*.55;
      target=Math.min(target,stopTarget);
    }
    c.chaseScale+=(target-(c.chaseScale||1))*Math.min(1,dt*30);
    return c.chaseScale;
  }
  function chiefLadderEntry(){
    const desired=Math.max(70,Math.min(route.finishX??route.length,(route.length||route.finishX||0)*CHIEF_LADDER_FRACTION));
    const grounds=(route.groundSegments||[]).filter(s=>s.solid!==false&&s.kind==="ground").sort((a,b)=>Math.abs((a.x+a.w/2)-desired)-Math.abs((b.x+b.w/2)-desired));
    const candidates=[];
    for(const s of grounds){
      for(const side of [-1,1]){
        const faceX=side<0?s.x:s.x+s.w,probeX=faceX+side*20,topY=s.y;
        const lower=grounds.filter(v=>v!==s&&probeX>=v.x+8&&probeX<=v.x+v.w-8&&v.y>topY+56&&v.y<topY+230).sort((a,b)=>a.y-b.y)[0];
        if(!lower)continue;
        const h=lower.y-topY;
        candidates.push({x:faceX-side*18,topY,bottomY:lower.y,height:h,duration:Math.max(.7,Math.min(1.2,CHIEF_LADDER_CLIMB_T*h/CHIEF_LADDER_HEIGHT)),offscreen:false});
      }
    }
    if(candidates.length)return candidates.sort((a,b)=>Math.abs(a.x-desired)-Math.abs(b.x-desired))[0];
    const topY=routeGroundYAt(70),bottomY=topY+CHIEF_LADDER_HEIGHT;
    return {x:CHIEF_ENTRY_X,topY,bottomY,height:CHIEF_LADDER_HEIGHT,duration:CHIEF_LADDER_CLIMB_T,offscreen:true};
  }
  function primeChiefLadder(c){
    if(!c?.path)return null;
    c.entry=c.entry||chiefLadderEntry();
    if(!Number.isFinite(c.entry.time))c.entry.time=chiefTimeAtX(c.path,c.entry.x);
    const chaseEntryTime=chiefTimeAtX(c.path,c.entry.x+CHIEF_CLOSE_GAP_PX);
    c.entry.readyTime=Math.max(c.delay+c.entry.duration,chaseEntryTime);
    c.entry.climbStartTime=c.entry.readyTime-c.entry.duration;
    return c.entry;
  }
  function setChiefPlayerTime(c,t){
    c.playerT=Math.max(c.playerT??0,t);
    c.playerIndex=Math.max(c.playerIndex??0,c.path.samples.findIndex(v=>v[0]>=c.playerT));
  }
  function syncChiefPlayerX(c,x){
    if(!c?.path)return;
    setChiefPlayerTime(c,chiefTimeAtX(c.path,x));
  }
  function parkChiefAtLadder(c){
    if(!c?.path)return;
    const entry=primeChiefLadder(c);c.active=false;c.entryPhase="waiting";c.climbElapsed=0;
    c.playerT=chiefTimeAtX(c.path,70);c.playerIndex=0;c.matchMode="xy";c.chaseScale=1;c.chiefT=-c.delay;
    c.x=entry.x-c.w*.5;c.y=entry.bottomY-c.h;c.pose="climb";c.facing=1;
  }
  function finishChiefLadder(c){
    const entry=primeChiefLadder(c);c.entryPhase="running";c.climbElapsed=entry.duration;matchPlayerToChiefPath(c);c.playerT=Math.max(c.playerT,entry.readyTime);c.chaseScale=CHIEF_FAST_SCALE;c.chiefT=Math.max(entry.time,Math.min(c.playerT-.22,chiefTimeAtX(c.path,player.x)));
    const q=chiefSample(c.path,c.chiefT);c.x=q.x;c.y=q.y;c.pose=q.pose;c.facing=q.facing;
    emitGame("chief_chase_started",{routeId,entry:"ladder"});
  }
  function resetRecordedChief(x){if(!campaignChief?.path)return;const entry=primeChiefLadder(campaignChief),t=chiefTimeAtX(campaignChief.path,x);if(entry&&t<entry.readyTime){parkChiefAtLadder(campaignChief);setChiefPlayerTime(campaignChief,t);return}campaignChief.active=true;campaignChief.entryPhase="running";campaignChief.climbElapsed=entry?.duration||0;campaignChief.playerT=t;campaignChief.chaseScale=1;campaignChief.chiefT=Math.max(campaignChief.path.samples[0][0],t-campaignChief.delay);campaignChief.playerIndex=Math.max(0,campaignChief.path.samples.findIndex(v=>v[0]>=t));campaignChief.matchMode="xy";const q=chiefSample(campaignChief.path,campaignChief.chiefT);campaignChief.x=q.x;campaignChief.y=q.y;campaignChief.pose=q.pose;campaignChief.facing=q.facing}
  function obstacleSeed(r=route) {
    const key=`${r.routeId}@${r.version}`;
    if(!obstacleSeedCache.has(key))obstacleSeedCache.set(key,sha256(canonical({length:r.length,finishX:r.finishX,checkpoints:r.checkpoints,obstacles:r.obstacles,groundSegments:r.groundSegments||null,voidEdges:r.voidEdges||null})));
    return obstacleSeedCache.get(key);
  }
  function routeSurfaces(r) {
    const out = r.groundSegments ? r.groundSegments.filter(s=>s.solid!==false).map(s=>({...s})) : [{ x: 0, y: GROUND, w: r.length, h: 100, kind: "ground" }];
    const catchableById=new Map((r.catchableSurfaces||[]).map(s=>typeof s==="string"?[s,{}]:[s.id,s]));
    for (const o of r.obstacles) {
      const baseY = o.baseY ?? GROUND;
      if (o.type === "vault")
        out.push({ id: o.id, x: o.x, y: baseY - o.h, w: o.w, h: o.h, parkour: "vault" });
      if (o.type === "slide")
        out.push({
          id: o.id,
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
  function solidGroundAt(x,r=route) {
    const grounds=r.groundSegments
      ? r.groundSegments.filter(s=>s.kind==="ground"&&s.solid!==false&&x>=s.x&&x<=s.x+s.w)
      : (x>=0&&x<=r.length?[{x:0,y:GROUND,w:r.length,h:100,kind:"ground"}]:[]);
    return grounds.sort((a,b)=>a.y-b.y)[0]||null;
  }
  function safeGroundUnderPlayer() {
    if(!player.onGround)return null;
    const center=player.x+player.w/2,feet=player.y+player.h;
    const support=(route.groundSegments||[])
      .filter(s=>s.kind==="ground"&&s.solid!==false&&center>=s.x&&center<=s.x+s.w&&Math.abs(feet-s.y)<=2)
      .sort((a,b)=>a.y-b.y)[0];
    if(!support)return null;
    const runwayX=Math.max(support.x, support.x+support.w-player.w-120);
    return {x:Math.min(player.x,runwayX),y:support.y,surfaceId:support.id||null};
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
    if (TEST_MODE) return !!ROUTES[id];
    if (/^D\d{2}$/.test(id)) return !!ROUTES[id];
    if (/^A0/.test(id)) return !!ROUTES[id] && (id === "A01" || !!profile.progressByRoute[`A0${Number(id.slice(1))-1}`]?.completed);
    if (/^M0/.test(id)) return !!ROUTES[id] && (id === "M01" || !!profile.progressByRoute[`M0${Number(id.slice(1))-1}`]?.completed);
    if (!/^F0[1-6]$/.test(id)) return true;
    const n=Number(id.slice(1));
    return n===1 || !!profile.progressByRoute[`F0${n-1}`]?.completed;
  }
  function firstRouteForWorld(worldId=profile.selectedWorldId) {
    if (worldId==="dock31") return WORLD_REGISTRY.dock31.routes.find(id=>routeUnlocked(id)) || "D01";
    if (worldId==="aftermath") return [...WORLD_REGISTRY.aftermath.routes].reverse().find(id=>routeUnlocked(id));
    if (worldId==="magma") return [...WORLD_REGISTRY.magma.routes].reverse().find(id=>routeUnlocked(id));
    if (worldId!=="frozen") return "D01";
    return [...WORLD_REGISTRY.frozen.routes].reverse().find(id=>ROUTES[id]&&routeUnlocked(id)) || "F01";
  }
  function routeOrderForWorld(worldId=profile.selectedWorldId) {
    if (worldId==="aftermath") return WORLD_REGISTRY.aftermath.routes;
    if (worldId==="magma") return WORLD_REGISTRY.magma.routes;
    if (worldId==="frozen") return WORLD_REGISTRY.frozen.routes;
    return WORLD_REGISTRY.dock31.routes;
  }
  function nextRouteAfterCurrent() {
    const order=routeOrderForWorld(),i=order.indexOf(routeId);
    if(i<0||i>=order.length-1)return null;
    const id=order[i+1];
    return ROUTES[id]&&routeUnlocked(id)?id:null;
  }
  function startNextRoute() {
    const order=routeOrderForWorld(),start=Math.max(0,order.indexOf(routeId)),candidates=[];
    for(let i=1;i<=order.length;i++)candidates.push(order[(start+i)%order.length]);
    for(const id of candidates)if(ROUTES[id]&&routeUnlocked(id)&&startRoute(id,true,id==="D06"))return id;
    openShop();
    return null;
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
    finishAdvance = null;
    finishGate = { phase: "open", t: 0, closeS: .52, holdS: .28, playerAlpha: 1 };
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
    jumpRun = null;
    wallJumpRun = null;
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
    const recordedChiefPath=chiefPathFor(route);
    const chiefDelay=chiefDelayFor(recordedChiefPath,routeId);
    campaignChief = recordedChiefPath ? {active:false,x:CHIEF_ENTRY_X,y:recordedChiefPath.samples[0][2],w:32,h:48,catches:0,caughtT:0,regrabT:0,lastReturnX:null,path:recordedChiefPath,delay:chiefDelay,timeScale:1,chaseScale:1,chiefT:-chiefDelay,playerT:chiefTimeAtX(recordedChiefPath,70),playerIndex:0,matchMode:"xy",pose:"climb",facing:1,entry:chiefLadderEntry(),entryPhase:"waiting",climbElapsed:0}
      : (routeId === "D06" || route.chief) ? {active:false,x:-400,y:routeGroundYAt(route.chief?.startX ?? 70)-48,w:32,h:48,speed:205,catches:0,caughtT:0,lastReturnX:null} : null;
    if(recordedChiefPath)parkChiefAtLadder(campaignChief);
    campaignDeaths = 0;
    gameClock = 0;
    platformOrder = { colliderFrame: 0, landingFrame: 0, carryFrame: 0 };
    engine.setDynamicSurfaces(movingPlatforms);
    engine.reset(70, routeGroundYAt(70) - player.h);
    const startGround=solidGroundAt(70);
    lastSafeGround={x:70,y:startGround?.y??routeGroundYAt(70),surfaceId:startGround?.id||null};
    run.checkpointRespawn={...lastSafeGround,checkpointX:70};
    resetChiefTrace();
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
    const checkpointX=full ? 70 : run.checkpointX;
    const direct=solidGroundAt(checkpointX);
    const saved=!full&&run.checkpointRespawn?.checkpointX===checkpointX?run.checkpointRespawn:null;
    const respawn=direct?{x:checkpointX,y:direct.y,surfaceId:direct.id||null}:saved||lastSafeGround;
    if(route.movementProfile==="vector-v1"&&!respawn)throw new Error(`No safe checkpoint respawn for ${routeId}@${checkpointX}`);
    const resetX=respawn?.x??checkpointX,resetY=respawn?.y??routeGroundYAt(checkpointX);
    if(window.__tmbXWriteLog)window.__tmbXWriteLog.push({source:"engine.reset/retry",routeId,gameClock,beforeX:player.x,afterX:resetX,checkpointX,full});
    engine.reset(resetX, resetY - player.h);
    player.facing=1;engine.parkour.dir=1;
    if(full)gameClock=0;
    resetChiefTrace();
    resetRecordedChief(resetX);
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
    wallJumpRun = null;
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
      const height=feet-s.y,normalJumpRise=390*390/(2*1450);
      const vertical=player.onGround?height>normalJumpRise&&height<=100:feet>=s.y-4&&feet<=s.y+100;
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
  const finiteMove=n=>Number.isFinite(n);
  function validArcRun(d){return d&&[d.duration,d.vy0,d.startX,d.startY,d.endX,d.landY,d.dir].every(finiteMove)&&d.duration>.001}
  const WALL_JUMP_DURATION=2.23, WALL_JUMP_RISE=86, WALL_JUMP_CONTACTS=[.63,1.4,2.07];
  function wallJumpZoneAt(){
    const center=player.x+player.w/2,feet=player.y+player.h;
    return (route.wallJumpZones||[]).find(z=>center>=z.x1-10&&center<=z.x2+10&&feet>=z.yTop-18&&feet<=z.yBottom+58);
  }
  function beginWallJump(){
    if(route.movementProfile!=="vector-v1"||wallJumpRun||edgeClimb||diveRun||jumpRun)return false;
    const z=wallJumpZoneAt();
    if(!z||!keys.jump)return false;
    const dir=z.dir||1,startCenter=Math.max(z.x1+player.w/2,Math.min(z.x2-player.w/2,player.x+player.w/2));
    const endFeet=z.exitY??z.yTop,endX=(z.exitX??(z.x2+player.w/2))-player.w/2;
    wallJumpRun={zone:z,elapsed:0,duration:z.duration||WALL_JUMP_DURATION,startX:startCenter-player.w/2,startY:(z.yBottom??player.y+player.h)-player.h,endX,endY:endFeet-player.h,dir,contacts:[],queued:false};
    player.x=wallJumpRun.startX;player.y=wallJumpRun.startY;player.vx=player.vy=0;player.onGround=false;player.facing=dir;engine.parkour.state="wallRun";engine.parkour.timer=wallJumpRun.duration;engine.parkour.dir=dir;
    vectorJumpPending=null;keys.jump=false;frontFlip.active=false;addFlow(z.id,"wallJump",12);emitGame("movement_started",{routeId,obstacleId:z.id,kind:"wallJump"});
    return true;
  }
  function applyWallJump(dt){
    if(!wallJumpRun)return false;
    const w=wallJumpRun,z=w.zone;
    if(keys.jump&&w.elapsed>.45)w.queued=true;
    const prev=w.elapsed;w.elapsed=Math.min(w.duration,w.elapsed+dt);
    const u=w.elapsed/w.duration,side=Math.sin(u*Math.PI*2.5);
    const center=(w.startX+player.w/2)+(w.endX-w.startX)*u+side*Math.min(18,(z.x2-z.x1)*.22);
    const rise=(z.rise??WALL_JUMP_RISE)*(1-Math.cos(u*Math.PI))/2;
    player.x=center-player.w/2;player.y=w.startY-rise;player.vx=(w.endX-w.startX)/w.duration;player.vy=-Math.sin(u*Math.PI)*95;player.onGround=false;player.facing=side>=0?1:-1;
    for(const t of WALL_JUMP_CONTACTS)if(prev<t&&w.elapsed>=t)w.contacts.push(+w.elapsed.toFixed(3));
    engine.parkour.state="wallRun";engine.parkour.timer=Math.max(0,w.duration-w.elapsed);engine.parkour.dir=player.facing;
    if(w.elapsed>=w.duration){player.x=w.endX;player.y=w.endY;player.vx=255;player.vy=0;player.onGround=true;player.facing=1;engine.parkour.state="normal";engine.parkour.timer=0;wallJumpRun=null;keys.jump=false;}
    return true;
  }
  function tryScriptedMove(force=false){
    if((!force&&!keys.jump)||engine.parkour.state!=="normal"||edgeClimb)return false;
    const center=player.x+player.w/2,zones=(route.scriptedMoveZones||[]).filter(v=>v.kind==="vault"||v.kind==="slide");
    let z=zones.find(v=>center>=v.x1&&center<=v.x2);
    // A01 recovery: a missed slide window must not become a dead pocket at the block face.
    if(!z&&routeId==="A01"&&player.onGround)z=zones.find(v=>{if(v.kind!=="slide")return false;const o=route.obstacles.find(q=>q.id===v.obstacleId&&q.type==="slide"),right=player.x+player.w;return o&&right>=o.x-4&&right<=o.x+4});
    if(!z)return false;
    const o=route.obstacles.find(v=>v.id===z.obstacleId&&v.type===z.kind);
    if(!o)return false;
    const y=(o.baseY??GROUND)-o.h,cfg={x:o.x,y,w:o.w,endX:z.endX,top:z.top};
    if(![cfg.x,cfg.y,cfg.w].every(finiteMove))return false;
    if(z.kind==="slide"&&!player.onGround)return false;
    if(z.kind==="vault"&&!player.onGround&&!z.airborne)return false;
    if(z.kind==="vault"&&z.airborne)cfg.airborne=true;
    const started=engine.startParkourMove?.(z.kind,cfg);
    if(started){keys.jump=false;vectorJumpPending=null;addFlow(o.id,z.kind,10);emitGame("movement_started",{routeId,obstacleId:o.id,kind:z.kind});}
    return !!started;
  }
  function tryHermesLaunch(){
    if(keys.jump||engine.parkour.state!=="normal"||edgeClimb||wallJumpRun||diveRun||jumpRun)return false;
    const center=player.x+player.w/2,z=(route.hermesLaunchZones||[]).find(v=>center>=v.x1&&center<=v.x2);
    if(!z)return false;
    return launchHermesArc(z);
  }
  function launchHermesArc(z){
    const dir=player.facing>=0?1:-1,startX=player.x,startY=player.y;
    const endX=(z.landX??((z.x1+z.x2)/2))-player.w/2,landY=(z.landY??routeGroundYAt(z.landX))-player.h;
    const dx=Math.abs(endX-startX),top=z.peakY??Math.min(startY,landY)-110;
    const Tb=Math.sqrt(Math.max(0,2*(startY-top)/1450))+Math.sqrt(Math.max(0,2*(landY-top)/1450));
    const vx=Math.max(dx/Math.max(.001,Tb),Math.abs(player.vx),520),duration=dx>0?dx/vx:Tb;
    const vy0=(landY-startY-725*duration*duration)/Math.max(.001,duration);
    const nextJump={elapsed:0,duration,vy0,startX,startY,endX,landY,dir,hermes:true,zoneId:z.id};
    if(!validArcRun(nextJump))return false;
    jumpRun=nextJump;player.onGround=false;player.vx=(endX-startX)/duration;player.vy=vy0;keys.jump=false;vectorJumpPending=null;frontFlip.active=false;invulnerableT=Math.max(invulnerableT,duration+.12);
    addFlow(z.id,"hermesLaunch",14);emitGame("movement_started",{routeId,obstacleId:z.id,kind:"hermesLaunch"});sfx("ramp");
    return true;
  }
  function beforePhysicsIntegrated(dt) {
    if (!campaign || shopOpen || result || campaignFrozen()) return;
    lastPrePhysicsX = player.x;
    gameClock += dt;
    if (finishGate.phase !== "open") return;
    if(edgeClimb){engine.parkour.state="normal";engine.parkour.timer=0}
    tryHermesLaunch();
    tryScriptedMove();
    const d07SlideJump=route.routeId==="D07"&&engine.parkour.state==="slide";
    beginWallJump();
    if(route.movementProfile==="vector-v1"&&keys.jump&&(player.onGround||d07SlideJump)&&!edgeClimb){
      const center=player.x+player.w/2;
      const diveZone=(route.diveZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      const highZone=(route.highJumpZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      vectorJumpPending={kind:diveZone?"dive":highZone?"high":"normal",frames:0,diveZone,highZone,waitForSlide:d07SlideJump};
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
    if (!campaign || shopOpen || result || campaignFrozen()) return;
    if (finishGate.phase !== "open") {
      updateFinishGate(dt);
      return;
    }
    edgeCatchCooldown=Math.max(0,edgeCatchCooldown-dt);
    if(window.__tmbXWriteLog&&Number.isFinite(lastPrePhysicsX)&&player.x<lastPrePhysicsX-1)window.__tmbXWriteLog.push({source:"engine.physics/collision",routeId,gameClock,beforeX:lastPrePhysicsX,afterX:player.x,state:engine.parkour.state});
    if(route.movementProfile==="vector-v1"&&input.bufferedJump&&!vectorJumpPending&&!wallJumpRun){
      const center=player.x+player.w/2,diveZone=(route.diveZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      const highZone=(route.highJumpZones||[]).find(z=>center>=z.x1&&center<=z.x2);
      if(diveZone)vectorJumpPending={kind:"dive",frames:0,diveZone,waitForSlide:route.routeId==="D07"&&engine.parkour.state==="slide"};
      else if(highZone)vectorJumpPending={kind:"high",frames:0,highZone,waitForSlide:route.routeId==="D07"&&engine.parkour.state==="slide"};
    }
    applyWallJump(dt);
    const launchBufferedVectorJump=vectorJumpPending&&!wallJumpRun&&(player.vy<0&&!player.onGround||vectorJumpPending.kind==="high"&&!vectorJumpPending.waitForSlide||vectorJumpPending.waitForSlide&&player.onGround&&engine.parkour.state==="normal");
    if(route.movementProfile==="vector-v1"&&vectorJumpPending&&launchBufferedVectorJump){
      if(vectorJumpPending.kind==="dive"){
        const z=vectorJumpPending.diveZone,dir=player.facing>=0?1:-1,startX=player.x,startY=player.y;
        const endX=dir>0?z.landX:z.landX-player.w,landY=z.landY-player.h,dx=Math.abs(endX-startX),top=z.peakY??Math.min(startY,landY)-93;
        const Tb=Math.sqrt(2*(startY-top)/1450)+Math.sqrt(2*(landY-top)/1450),vx=Math.max(dx/Tb,Math.abs(player.vx)),duration=dx>0?dx/vx:Tb;
        const vy0=(landY-startY-725*duration*duration)/duration;
        const nextDive={elapsed:0,duration,vy0,startX,startY,endX,landY,dir};
        if(validArcRun(nextDive)){diveRun=nextDive;engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=dir;}
      }else if(vectorJumpPending.kind==="high"&&vectorJumpPending.highZone?.landX!==undefined){
        const z=vectorJumpPending.highZone,dir=player.facing>=0?1:-1,startX=player.x,startY=player.y;
        const endX=(z.landX ?? ((z.x1+z.x2)/2))-player.w/2,landY=(z.landY ?? routeGroundYAt(z.landX))-player.h,dx=Math.abs(endX-startX),top=z.peakY??Math.min(startY,landY)-122;
        const Tb=Math.sqrt(Math.max(0,2*(startY-top)/1450))+Math.sqrt(Math.max(0,2*(landY-top)/1450)),vx=Math.max(dx/Math.max(.001,Tb),Math.abs(player.vx)),duration=dx>0?dx/vx:Tb;
        const vy0=(landY-startY-725*duration*duration)/Math.max(.001,duration);
        const nextJump={elapsed:0,duration,vy0,startX,startY,endX,landY,dir};
        if(validArcRun(nextJump)){jumpRun=nextJump;engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=dir;}
      }else player.vy=vectorJumpPending.kind==="high"?-520:-390;
      vectorJumpPending=null;
    }else if(vectorJumpPending&&!(vectorJumpPending.waitForSlide&&engine.parkour.state==="slide")&&++vectorJumpPending.frames>1){
      vectorJumpPending=null;
    }
    if(routeId==="D04"&&route.movementProfile==="vector-v1"&&keys.right&&!keys.left&&lastPrePhysicsX>=5520&&lastPrePhysicsX<=5650&&player.x<lastPrePhysicsX-120&&(engine.parkour.state==="slide"||engine.parkour.state==="normal"||engine.parkour.state==="catch")){
      const beforeX=player.x;
      player.x=lastPrePhysicsX+8;player.vx=Math.max(255,Math.abs(player.vx));player.facing=1;edgeClimb=null;edgeCatchCooldown=.12;
      if(window.__tmbXWriteLog)window.__tmbXWriteLog.push({source:"vector-snapback-guard",routeId,gameClock,beforeX,afterX:player.x,state:engine.parkour.state});
      engine.parkour.state="slide";engine.parkour.timer=Math.max(engine.parkour.timer,.08);engine.parkour.dir=1;
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
    function clampArcRunForward(d, arcX){
      if(!d||!Number.isFinite(arcX)||!Number.isFinite(player.x))return arcX;
      const backwards=(d.dir>=0&&arcX<player.x)||(d.dir<0&&arcX>player.x);
      if(!backwards)return arcX;
      if(window.__tmbXWriteLog)window.__tmbXWriteLog.push({source:"arc-forward-guard",routeId,gameClock,beforeX:arcX,afterX:player.x,kind:diveRun===d?"dive":"jump"});
      const shift=player.x-arcX;
      d.startX+=shift;
      d.endX+=shift;
      return player.x;
    }
    if(diveRun&&validArcRun(diveRun)){
      const d=diveRun,tau=Math.min(d.elapsed+=dt,d.duration),t=tau/d.duration;
      engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=d.dir;
      let arcX=d.startX+(d.endX-d.startX)*tau/d.duration;
      arcX=clampArcRunForward(d,arcX);
      player.x=arcX;player.y=d.startY+d.vy0*tau+725*tau*tau;
      player.vx=(d.endX-d.startX)/d.duration;player.vy=d.vy0+1450*tau;player.onGround=false;
      if(tau===d.duration){
        player.x=d.endX;player.y=d.landY;player.vx=d.dir*Math.max(255,Math.abs(player.vx));player.vy=0;player.onGround=true;
        engine.parkour.state="roll";engine.parkour.timer=.24;engine.parkour.roll=0;engine.parkour.dir=d.dir;vectorRollStarts++;
        diveRun=null;vectorAir=null;
      }
    }else diveRun=null;
    if(jumpRun&&validArcRun(jumpRun)){
      const d=jumpRun,tau=Math.min(d.elapsed+=dt,d.duration);
      engine.parkour.state="normal";engine.parkour.timer=0;engine.parkour.dir=d.dir;
      let arcX=d.startX+(d.endX-d.startX)*tau/d.duration;
      arcX=clampArcRunForward(d,arcX);
      player.x=arcX;player.y=d.startY+d.vy0*tau+725*tau*tau;
      player.vx=(d.endX-d.startX)/d.duration;player.vy=d.vy0+1450*tau;player.onGround=false;
      if(tau===d.duration){
        player.x=d.endX;player.y=d.landY;player.vx=d.dir*Math.max(255,Math.abs(player.vx));player.vy=0;player.onGround=true;
        jumpRun=null;vectorAir=null;
      }
    }else jumpRun=null;
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
      if(campaignChief?.active&&campaignChief.entryPhase==="running"){
        const playerFoot=cameraWorldY+player.y+player.h,chiefFoot=cameraWorldY+campaignChief.y+campaignChief.h;
        const shift=chiefFoot<H*.18?H*.18-chiefFoot:chiefFoot>H*.82?H*.82-chiefFoot:0;
        if(shift&&playerFoot+shift>=player.h/2&&playerFoot+shift<=H+player.h/2){cameraWorldY+=shift;cameraWorldVelocity=0}
      }
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
      if(campaignChief?.active&&campaignChief.entryPhase==="running"){
        const playerFoot=cameraWorldY+player.y+player.h,chiefFoot=cameraWorldY+campaignChief.y+campaignChief.h;
        const shift=chiefFoot<H*.18?H*.18-chiefFoot:chiefFoot>H*.82?H*.82-chiefFoot:0;
        if(shift&&playerFoot+shift>=player.h/2&&playerFoot+shift<=H+player.h/2){cameraWorldY+=shift;cameraWorldVelocity=0}
      }
      engine.setWorldY(cameraWorldY);
    }
    document.body.dataset.playerX=String(Math.round(player.x));
    invulnerableT = Math.max(0, invulnerableT - dt);
    staggerT = Math.max(0, staggerT - dt);
    flowFlash = Math.max(0, flowFlash - dt);
    recordChiefTrace();
    if (campaignChief) {
      campaignChief.caughtT=Math.max(0,campaignChief.caughtT-dt);campaignChief.regrabT=Math.max(0,(campaignChief.regrabT||0)-dt);
      if (campaignChief.path && campaignChief.entryPhase==="waiting") {
        const entry=primeChiefLadder(campaignChief);syncChiefPlayerX(campaignChief,player.x);
        if(player.x>=entry.x&&campaignChief.playerT>=entry.climbStartTime){campaignChief.active=true;campaignChief.entryPhase="climbing";campaignChief.climbElapsed=0;campaignChief.x=entry.x-campaignChief.w*.5;campaignChief.y=entry.bottomY-campaignChief.h;campaignChief.pose="climb";campaignChief.facing=1}
      } else if (!campaignChief.path && !campaignChief.active && player.x>=1800) {
        if (!route.chief || player.x>=route.chief.startX) {
          campaignChief.active=true;
          campaignChief.x=player.x-380;
          emitGame("chief_chase_started",{routeId});
        }
      }
      if (campaignChief.active) {
        const chiefFrameStartX=campaignChief.x;
        campaignChief.stunCatchGrace=engine.parkour.state==="stun"?1.05:Math.max(0,(campaignChief.stunCatchGrace||0)-dt);
        if(campaignChief.path&&campaignChief.entryPhase==="climbing"){campaignChief.climbElapsed=Math.min(campaignChief.entry.duration,campaignChief.climbElapsed+dt);const u=campaignChief.climbElapsed/campaignChief.entry.duration;campaignChief.x=campaignChief.entry.x-campaignChief.w*.5;campaignChief.y=campaignChief.entry.bottomY-campaignChief.h-(campaignChief.entry.height-campaignChief.h*.2)*u;campaignChief.pose="climb";if(u>=1)finishChiefLadder(campaignChief)}
        else if(campaignChief.path){const entry=primeChiefLadder(campaignChief),scale=chiefChaseScale(campaignChief,dt);campaignChief.chiefT=Math.max(entry.time,campaignChief.chiefT+dt*scale);if((player.vx>180||campaignChief.stunCatchGrace>0)&&campaignChief.playerT>0)campaignChief.chiefT=Math.min(campaignChief.chiefT,campaignChief.playerT-.22);matchPlayerToChiefPath(campaignChief);const ideal=chiefSample(campaignChief.path,campaignChief.chiefT),live=chiefTraceSampleAtX(ideal.x);if(live){campaignChief.x=live.x;campaignChief.y=live.feet-campaignChief.h;campaignChief.pose=live.pose;campaignChief.facing=live.facing||1}else{campaignChief.x=ideal.x;campaignChief.y=ideal.y;campaignChief.pose=ideal.pose;campaignChief.facing=ideal.facing}}else campaignChief.x+=campaignChief.speed*dt;
        if(innerHeight>=innerWidth&&campaignChief.path&&campaignChief.x<player.x-(engine.W||W)*.18){const portraitLive=chiefTraceSampleAtX(player.x-(engine.W||W)*.18);if(portraitLive){campaignChief.x=portraitLive.x;campaignChief.y=portraitLive.feet-campaignChief.h;campaignChief.pose=portraitLive.pose;campaignChief.facing=portraitLive.facing||1}}
        const playerCatchable=player.onGround&&engine.parkour.state==="normal"&&!diveRun&&!wallJumpRun&&Math.abs(player.vx)<70;
        if(campaignChief.path&&campaignChief.entryPhase==="running"&&!playerCatchable&&campaignChief.x>player.x-CHIEF_CLOSE_GAP_PX){const trailing=chiefTraceSampleAtX(player.x-CHIEF_CLOSE_GAP_PX);campaignChief.x=player.x-CHIEF_CLOSE_GAP_PX;if(trailing){campaignChief.y=trailing.feet-campaignChief.h;campaignChief.pose=trailing.pose;campaignChief.facing=trailing.facing||1}else campaignChief.y=routeGroundYAt(campaignChief.x+campaignChief.w/2)-campaignChief.h}
        if(campaignChief.path&&campaignChief.entryPhase==="running"&&playerCatchable){campaignChief.x=Math.min(player.x-campaignChief.w+4,chiefFrameStartX+CHIEF_STOP_SPEED_PX*dt);const closing=chiefTraceSampleAtX(campaignChief.x);if(closing){campaignChief.y=closing.feet-campaignChief.h;campaignChief.pose=closing.pose;campaignChief.facing=closing.facing||1}else campaignChief.y=routeGroundYAt(campaignChief.x+campaignChief.w/2)-campaignChief.h}
        campaignChief.catchExposureT=playerCatchable?(campaignChief.catchExposureT||0)+dt:0;
        campaignChief.grabFrame=chiefGrabPose(playerCatchable)?.frame??null;
        const liveChiefCatch=campaignChief.path&&campaignChief.entryPhase==="running"&&playerCatchable&&campaignChief.chiefT>=0&&campaignChief.x+campaignChief.w>=player.x-4&&campaignChief.x<=player.x+player.w+4&&campaignChief.y+campaignChief.h>=player.y-4&&campaignChief.y<=player.y+player.h+4;
        if (campaignChief.caughtT<=0 && (!campaignChief.path ? campaignChief.x+campaignChief.w>=player.x+4 && campaignChief.x<=player.x+player.w-4 : liveChiefCatch)) {
          campaignChief.catches++;
          campaignDeaths++;
          campaignChief.caughtT=CHIEF_CATCH_HOLD_S;campaignChief.grabFrame=3;if(campaignChief.path)campaignChief.regrabT=campaignChief.delay;
          campaignChief.lastReturnX=run.checkpointX;
          if(window.__tmbXWriteLog)window.__tmbXWriteLog.push({source:"chief-catch-reset",routeId,gameClock,beforeX:player.x,afterX:run.checkpointX,chiefX:campaignChief.x,checkpointX:run.checkpointX});
          engine.reset(run.checkpointX,routeGroundYAt(run.checkpointX)-player.h);
          if(campaignChief.path){resetRecordedChief(run.checkpointX);resetChiefTrace();}else{campaignChief.x=run.checkpointX-380;campaignChief.y=routeGroundYAt(run.checkpointX)-campaignChief.h}
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
    if (route.obstacles.some((o) => o.type === "worker" && !o.offscreenWait)) {
      const worker = route.obstacles.find((o) => o.type === "worker" && !o.offscreenWait),
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
    const safeGround=safeGroundUnderPlayer();
    if(safeGround)lastSafeGround=safeGround;
    for (const cp of route.checkpoints)
      if (player.x >= cp && run.checkpointX < cp) {
        run.checkpointX = cp;
        const checkpointGround=solidGroundAt(cp);
        run.checkpointRespawn=checkpointGround
          ? {x:cp,y:checkpointGround.y,surfaceId:checkpointGround.id||null,checkpointX:cp}
          : {...lastSafeGround,checkpointX:cp};
        sfx("checkpoint");
        emitGame("checkpoint_reached", { routeId, x: cp });
        saveRun();
      }
    collectPhysical();
    const fallingOut=route.movementProfile==="vector-v1"
      ? player.y > deepestGroundYAt(player.x+player.w/2) + 120
      : player.y > Math.max(H + 120,routeGroundYAt(player.x+player.w/2)+120);
    if(fallingOut&&!jumpRun?.hermes){campaignDeaths++;emitGame("player_fall",{routeId});retry(false);}
    if (player.x >= route.finishX) startFinishGateEntry();
  }
  function startFinishGateEntry() {
    if (finishGate.phase !== "open") return;
    finishGate.phase = "closing";
    finishGate.t = 0;
    finishGate.playerAlpha = 1;
    player.x = route.finishX - 28;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    engine.parkour.state = "normal";
    engine.parkour.timer = 0;
    diveRun = null;
    jumpRun = null;
    wallJumpRun = null;
    edgeClimb = null;
    keys.left = keys.right = keys.jump = false;
    joystick.axis = 0;
    parkChiefAtFinish();
    sfx("door");
    emitGame("finish_gate_enter", { routeId, x: route.finishX });
  }
  function parkChiefAtFinish() {
    if (!campaignChief) return;
    const door=finishDoorPlacement(route),s=(route.groundSegments||[]).filter(v=>v.solid!==false&&door.x>=v.x-4&&door.x<=v.x+v.w+4).sort((a,b)=>Math.abs(a.y-door.y)-Math.abs(b.y-door.y))[0];
    const minX=s?s.x+48:70,maxX=s?s.x+s.w-64:route.finishX-64,cx=Math.max(minX,Math.min(maxX,door.x-104));
    campaignChief.active=true;campaignChief.entryPhase="result";campaignChief.resultAngry=true;campaignChief.x=cx;
    const feet=routeGroundYAt(cx+16);campaignChief.y=feet-campaignChief.h;campaignChief.pose="idle";campaignChief.facing=1;campaignChief.caughtT=0;campaignChief.regrabT=0;
    campaignChief.resultSnapshot={x:campaignChief.x,y:campaignChief.y,feet,doorX:door.x};
  }
  function updateFinishGate(dt) {
    const holdS = finishGate.holdS ?? .28;
    finishGate.t = Math.min(finishGate.closeS + holdS, finishGate.t + dt);
    const k = finishGate.t / finishGate.closeS;
    const feet = routeGroundYAt(route.finishX);
    player.x += (route.finishX - 28 - player.x) * Math.min(1, dt * 8);
    player.y += (feet - player.h - player.y) * Math.min(1, dt * 10);
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    finishGate.playerAlpha = Math.max(0, 1 - Math.max(0, (k - .2) / .55));
    if (finishGate.t >= finishGate.closeS) finishGate.phase = "closed";
    if (finishGate.t >= finishGate.closeS + holdS) finishGateEntry();
  }
  function finishGateEntry() {
    if (result) return;
    finishGate.phase = "closed";
    finishGate.playerAlpha = 0;
    result = bankRun();
    parkChiefAtFinish();
    sfx("finish");
    engine.setWon(true);
    emitGame("run_complete", { routeId, elapsed_s: result.elapsed });
    emitGame("finish_gate_closed", { routeId, x: route.finishX });
  }
  function beginFinishAdvance() {
    const nextId=nextRouteAfterCurrent();
    if(!nextId)return;
    const token=uid("finish-advance");
    finishAdvance={active:true,token,routeId,amount:result.amount,nextId};
    document.body.dataset.campaignPhase="transition";
    syncActionVisibility();
    setTimeout(async()=>{
      if(!finishAdvance||finishAdvance.token!==token||routeId!==finishAdvance.routeId)return;
      await requestRouteInterstitial();
      if(!finishAdvance||finishAdvance.token!==token||routeId!==finishAdvance.routeId)return;
      startRoute(nextId,true,nextId==="D06");
    },1250);
  }
  function rr(x, y, w, h, r = 6) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  function finishDoorPlacement(r=route) {
    const doorLeftOffset = 74, doorRightOffset = 38, pad = 4;
    const x = r.finishX;
    const surfaces = (r.groundSegments || []).filter(s => s.solid !== false && x >= s.x - 4 && x <= s.x + s.w + 4).sort((a,b)=>b.x+b.w-a.x-a.w);
    const s = surfaces[0] || (r.groundSegments || []).filter(v => v.solid !== false).sort((a,b)=>b.x+b.w-a.x-a.w)[0];
    if (!s) return { x, y: routeGroundYAt(x), groundRight: x, groundId: null };
    const minX = s.x + doorLeftOffset + pad;
    const maxX = s.x + s.w - doorRightOffset - pad;
    const drawX = maxX >= minX ? Math.max(minX, Math.min(x, maxX)) : s.x + s.w - doorRightOffset - pad;
    return { x: drawX, y: routeGroundYAt(drawX), groundRight: s.x + s.w, groundId: s.id };
  }
  function drawFinishDoor(c, x, y, opts = {}) {
    const tGate = opts.gate || finishGate;
    const closeK = tGate.phase === "closed" ? 1 : tGate.phase === "closing" ? Math.min(1, tGate.t / tGate.closeS) : 0;
    const left = x - 74, top = y - 142, w = 112, h = 142;
    c.save();
    if (opts.shutterOnly) {
      drawFinishDoorShutter(c, left, top, w, h, closeK);
      c.restore();
      return;
    }
    const interior = c.createLinearGradient(left + 11, top + 25, left + w - 11, y);
    interior.addColorStop(0, closeK >= 1 ? "#101820" : "#fff3bb");
    interior.addColorStop(.42, closeK >= 1 ? "#18252d" : "#ffd16d");
    interior.addColorStop(1, closeK >= 1 ? "#05090d" : "#1d2a2f");
    c.fillStyle = interior;
    c.fillRect(left + 11, top + 25, w - 22, h - 25);
    if (closeK < .98) {
      const glow = c.createRadialGradient(left + 56, top + 48, 8, left + 56, top + 62, 70);
      glow.addColorStop(0, "rgba(255,247,198,.92)");
      glow.addColorStop(.55, "rgba(255,195,89,.34)");
      glow.addColorStop(1, "rgba(255,195,89,0)");
      c.fillStyle = glow;
      c.fillRect(left + 11, top + 25, w - 22, h - 25);
      c.fillStyle = "rgba(255,222,132,.56)";
      c.beginPath();
      c.moveTo(left + 45, y - 15);
      c.lineTo(left + 72, y - 15);
      c.lineTo(left + 103, y - 2);
      c.lineTo(left + 12, y - 2);
      c.closePath();
      c.fill();
      c.strokeStyle = "rgba(255,255,221,.75)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(left + 52, y - 58);
      c.lineTo(left + 22, y - 5);
      c.stroke();
    }
    const frame = c.createLinearGradient(left, top, left + w, top);
    frame.addColorStop(0, "#61707a");
    frame.addColorStop(.5, "#b0bbc0");
    frame.addColorStop(1, "#3f4b53");
    c.fillStyle = frame;
    c.fillRect(left, top + 14, 13, h - 14);
    c.fillRect(left + w - 13, top + 14, 13, h - 14);
    c.fillRect(left, top, w, 18);
    c.fillStyle = "#17232a";
    c.fillRect(left + 13, top + 18, w - 26, 10);
    drawFinishDoorShutter(c, left, top, w, h, closeK);
    c.fillStyle = "#244a35";
    c.fillRect(left + 34, top - 19, 44, 15);
    c.fillStyle = closeK >= 1 ? "#ff5148" : "#80ffc0";
    c.font = closeK >= 1 ? "900 8px system-ui" : "900 10px system-ui";
    c.textAlign = "center";
    c.fillText(closeK >= 1 ? t("closed") : t("exit"), left + 56, top - 8);
    c.textAlign = "left";
    c.fillStyle = "#111820";
    c.fillRect(left - 7, y - 8, w + 14, 8);
    c.restore();
  }
  function drawFinishDoorShutter(c, left, top, w, h, closeK) {
    const shutterH = (h - 31) * closeK;
    if (shutterH <= 0) return;
    const sy = top + 28;
    const panelW = w - 30;
    const g = c.createLinearGradient(left + 15, sy, left + w - 15, sy);
    g.addColorStop(0, "#6f7d84");
    g.addColorStop(.18, "#d5dde1");
    g.addColorStop(.48, "#9facb3");
    g.addColorStop(.72, "#eef3f4");
    g.addColorStop(1, "#56646c");
    c.fillStyle = g;
    c.fillRect(left + 15, sy, panelW, shutterH);
    c.strokeStyle = "rgba(39,52,60,.8)";
    c.lineWidth = 1.4;
    for (let yy = sy + 8; yy < sy + shutterH; yy += 10) {
      c.beginPath();
      c.moveTo(left + 17, yy);
      c.lineTo(left + w - 17, yy);
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,.45)";
      c.beginPath();
      c.moveTo(left + 17, yy + 2);
      c.lineTo(left + w - 17, yy + 2);
      c.stroke();
      c.strokeStyle = "rgba(39,52,60,.8)";
    }
    const bottomY = sy + shutterH - 9;
    if (shutterH >= 12) {
      c.fillStyle = "#f5c542";
      c.fillRect(left + 15, bottomY, panelW, 9);
      c.save();
      c.beginPath();
      c.rect(left + 15, bottomY, panelW, 9);
      c.clip();
      c.strokeStyle = "#1a1f22";
      c.lineWidth = 5;
      for (let sx = left - 4; sx < left + w; sx += 16) {
        c.beginPath();
        c.moveTo(sx, bottomY + 11);
        c.lineTo(sx + 18, bottomY - 2);
        c.stroke();
      }
      c.restore();
    }
    c.strokeStyle = "#24323a";
    c.lineWidth = 2;
    c.strokeRect(left + 15, sy, panelW, shutterH);
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
    const finishDoor=finishDoorPlacement();
    drawFinishDoor(ctx, finishDoor.x, finishDoor.y);
    if (run)
      {ctx.save();ctx.globalAlpha*=finishGate.playerAlpha;drawRunner(
        player.x + player.w / 2,
        player.y + player.h,
        1,
        profile.runnerId,
        profile.equippedOutfitByRunner[profile.runnerId],
        frontFlip.active ? frontFlip.angle : 0,
      );ctx.restore();}
    drawFinishDoor(ctx, finishDoor.x, finishDoor.y, { shutterOnly: true });
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
    if (finishAdvance) drawFinishAdvanceBanner();
    else if (result) drawResult();
  }
  function t(k) {
    return (I18N[profile.settings.language] || I18N.en)[k] || I18N.en[k] || k;
  }
  function routeDisplayName(r=route) {
    const lang=profile.settings.language;
    return (ROUTE_NAME_I18N[lang]&&ROUTE_NAME_I18N[lang][r.routeId]) || ROUTE_NAME_I18N.en[r.routeId] || r.name;
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
    return language==="tr"?"REKLAM İZLE ×2":language==="ru"?"РЕКЛАМА ×2":"WATCH AD ×2";
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
    const pauseOverlay=document.getElementById("pauseOverlay"),finalParcel=document.getElementById("finalParcel");
    if(pauseOverlay) pauseOverlay.textContent=t("pausedTap");
    if(finalParcel) finalParcel.dataset.label=t("parcelForYou");
    const touchMove=document.querySelector("#controlHint .move"),touchJump=document.querySelector("#controlHint .jump"),joystickLabel=document.getElementById("joystick");
    if(touchMove) touchMove.textContent=t("touchMove");
    if(touchJump) touchJump.textContent=t("touchJump");
    if(joystickLabel) joystickLabel.setAttribute("aria-label",t("touchMove"));
    document.getElementById("hint").textContent = t("help");
    const card = document.getElementById("characterCard");
    if (card) {
      const title = card.querySelector("h2"), copy = card.querySelector("p");
      if (title) title.textContent = t("choose");
      if (copy) copy.textContent = t("samePhysics");
    }
    syncRunnerChoiceCards();
    const actions = document.getElementById("a12Actions");
    if (actions) for (const b of actions.querySelectorAll("button")) b.textContent = t(b.dataset.act);
    syncRewardedButton();
    const language=document.getElementById("a12Language"),label=document.querySelector("#a12LanguageWrap span");
    if(language) language.value=profile.settings.language;if(label) label.textContent=t("language");
    const characterShop=document.getElementById("characterShop");if(characterShop) characterShop.textContent=t("shop");
    const shopClose=document.querySelector("#a12Shop [data-close]");if(shopClose) shopClose.textContent=t("close");
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
    ctx.fillStyle = "#fff";
    ctx.font = "900 14px system-ui";
    ctx.fillText(`${t("route")} ${routeId} · ${routeDisplayName(route)}`, 29, 36);
    ctx.fillStyle = "#ffd43d";
    ctx.fillText(`${t("run")} ◉ ${run?.runCoins || 0}/${route.coins.length}`, 29, 57);
    ctx.fillStyle = "#7cecc0";
    ctx.fillText(`${t("wallet")} ◉ ${profile.walletBalance}`, 180, 57);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${t("flow")} ${flow}`, 300, 57);
    if(flowFlash>0){ctx.fillStyle=`rgba(255,222,80,${Math.min(1,flowFlash*2)})`;ctx.font="950 18px system-ui";ctx.fillText(`+ ${t("flow")}`,390,42)}
  }
  function drawResult() {
    ctx.fillStyle = "#06111bb8";
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
  function drawFinishAdvanceBanner() {
    if(!finishAdvance||!result)return;
    ctx.save();
    const bannerY=innerHeight>=innerWidth?132:30,textY=innerHeight>=innerWidth?164:62;
    ctx.fillStyle="#06111bb8";
    rr(W/2-178,bannerY,356,52,10);
    ctx.fillStyle="#7cecc0";
    ctx.textAlign="center";
    ctx.font="950 19px system-ui";
    ctx.fillText(`${finishAdvance.routeId} ${t("complete")} +${finishAdvance.amount}`,W/2,textY);
    ctx.restore();
  }
  function installUI() {
    const style = document.createElement("style");
    style.textContent = `#a12Actions{position:fixed;z-index:31;left:50%;bottom:max(86px,calc(env(safe-area-inset-bottom) + 82px));transform:translateX(-50%);display:flex;gap:9px}#a12Actions[hidden]{display:none!important}#a12Actions button,#a12Shop button,#a12Language{border:1px solid #ffffff44;border-radius:12px;background:#153246;color:#fff;padding:11px 16px;font:900 13px system-ui}#a12LanguageWrap{display:flex;align-items:center;justify-content:center;gap:10px;min-height:44px;margin:8px auto 0;color:#fff;font:800 13px system-ui}#a12Language{min-height:44px;margin:0;padding:8px 14px}#a12Shop{position:fixed;inset:0;z-index:45;display:none;background:#06121bf2;color:#fff;padding:clamp(15px,4vw,38px)}#a12Shop.show{display:grid;grid-template-columns:minmax(230px,42%) 1fr;gap:25px}#a12Preview{display:grid;place-items:center;background:#102635;border-radius:18px;min-height:280px}#a12Preview canvas{width:180px;height:240px}#a12Products{overflow:auto;padding-bottom:48px}#a12Products article{padding:17px;margin:12px 0;background:#132b39;border:1px solid #ffffff30;border-radius:14px}.characterChoice[data-character="male"]{box-shadow:inset 0 0 0 2px #3aa2ff}.characterChoice[data-character="female"]{box-shadow:inset 0 0 0 2px #ff6aac}@media(max-width:540px) and (orientation:portrait){#a12Shop.show{grid-template-columns:1fr;grid-template-rows:35vh 1fr}#a12Preview{min-height:0}#a12Preview canvas{width:120px;height:160px}}`;
    style.textContent += `#a12Shop{box-sizing:border-box}#a12Shop.show{grid-template-columns:minmax(230px,40%) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:18px}#a12Preview{display:flex;flex-direction:column;justify-content:center;gap:12px;min-width:0;min-height:0;overflow:hidden}#a12Preview canvas{width:min(100%,480px);height:auto;max-height:65%;aspect-ratio:3/2;object-fit:contain;image-rendering:pixelated}#a12WorldWarning{margin:0;padding:7px 10px;border:1px solid #ffcf5c88;border-radius:10px;background:#442b12;color:#ffe29a;text-align:center;font:900 12px/1.2 system-ui}#a12WorldWarning[hidden]{display:none}#a12Preview .previewControls{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}#a12Preview button{padding:8px 10px}#a12Preview button[aria-pressed="true"]{background:#286650;border-color:#8ff1c8}#a12Products{min-height:0;min-width:0;overscroll-behavior:contain}@media(max-width:540px) and (orientation:portrait){#a12Shop.show{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(230px,40%) minmax(0,1fr);gap:12px}#a12Preview{gap:5px}#a12Preview canvas{max-height:62%;width:auto;max-width:100%}}`;
    style.textContent += `@media(orientation:landscape){#a12Shop{padding:max(10px,var(--safe-top)) max(12px,var(--safe-right)) max(10px,var(--safe-bottom)) max(12px,var(--safe-left))}#a12Shop.show{grid-template-columns:minmax(190px,34%) minmax(0,1fr);gap:12px}#a12Preview{min-height:35vh}#a12Preview canvas{max-height:72%}#a12Products{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden;padding:0}#a12ShopTop{display:flex;align-items:center;justify-content:space-between;gap:8px}#a12ShopTop h2{font:900 clamp(14px,2.2vw,22px)/1 system-ui;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#a12ShopTop [data-close]{min-width:40px;min-height:40px;padding:0}#a12Products .a12Tabs{display:flex;gap:6px;margin:4px 0}#a12Products .a12Tabs button{min-height:36px;padding:6px 9px;font-size:11px}#a12Products [data-list]{display:grid;grid-template-columns:repeat(4,minmax(104px,1fr));gap:7px;overflow-y:auto;min-height:0;align-content:start}#a12Products article{position:relative;min-width:104px;min-height:128px;margin:0;padding:7px 6px 48px;box-sizing:border-box}#a12Products article h3{margin:0;min-height:28px;font:850 11px/1.14 system-ui;text-wrap:balance;overflow-wrap:anywhere}#a12Products article [data-action]{position:absolute;left:6px;right:6px;bottom:5px;min-width:0;width:calc(100% - 12px);height:40px;padding:3px 5px;border-radius:999px;background:#07131d;color:#ffd45c;border:1px solid #ffd45c88;font:900 10px/1.04 system-ui;box-shadow:0 2px 0 #0008;text-shadow:none;white-space:normal;overflow-wrap:anywhere}#a12Products article [data-action]:not(:disabled):active{transform:translateY(1px);box-shadow:0 1px 0 #0008}#a12Products article [data-action]:disabled{opacity:.55;color:#d9e2e8;border-color:#ffffff35;box-shadow:none}#a12ShopBottom{display:flex;gap:8px;padding-top:7px}#a12ShopBottom button{min-height:42px;flex:1}#a12Products [data-save]{display:none}}`;
    style.textContent += `#a12Products article canvas.shopThumb{display:block;width:84px;height:84px;margin:4px auto 8px;image-rendering:pixelated;pointer-events:none}#a12Products article h3{text-align:center}#a12Preview .previewControls[hidden]{display:none!important}@media(orientation:landscape){#a12Products article canvas.shopThumb{width:52px;height:52px;margin:1px auto 4px}#a12Products [data-list][hidden]{display:none!important}#a12Products article [data-action]:disabled{opacity:1;color:#82919a;background:#0b171e;border-color:#52616a;box-shadow:none}}`;
    style.textContent += `#characterSelect #characterCard>img,#characterSelect #characterCard>.eyebrow,#characterSelect #characterCard>h2,#characterSelect #characterCard>p,#characterSelect #characterShop,#characterSelect .portrait,#characterSelect .choiceName,#characterSelect .lockBadge{display:none!important}#characterSelect #characterCard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}#characterSelect #characterChoices{grid-template-columns:repeat(2,minmax(120px,1fr))}#characterSelect .characterChoice{position:relative;display:grid;place-items:center;justify-content:center;align-items:center;min-width:120px}#characterSelect #a12LanguageWrap{display:flex!important;margin:0 auto;min-height:44px;max-width:min(100%,320px);flex-wrap:wrap}#characterSelect #a12Language{min-width:92px;min-height:44px}`;
    style.textContent += `#a12DockRoutes{position:fixed;z-index:30;left:50%;bottom:var(--dock-actions-clearance,148px);transform:translateX(-50%);width:min(94vw,760px);display:grid;grid-template-columns:repeat(6,1fr);gap:5px;padding:8px;box-sizing:border-box;background:#06121be8;border:1px solid #ffffff33;border-radius:6px}#a12DockRoutes[hidden]{display:none!important}#a12DockRoutes button{min-width:0;padding:6px 2px;border:1px solid #ffffff33;border-radius:4px;background:#153246;color:#fff;font:800 10px/1.05 system-ui}#a12DockRoutes small{display:block;color:#ffd45c;font-size:9px}@media(max-width:540px) and (orientation:portrait){#a12DockRoutes{grid-template-columns:repeat(6,1fr);gap:3px;padding:5px}#a12DockRoutes button{padding:5px 1px;font-size:9px}}`;
    style.textContent += `@media(orientation:landscape){#a12DockRoutes{left:auto;right:max(12px,var(--safe-right));transform:none;width:min(calc(100vw - 440px),760px)}}`;
    style.textContent += `body[data-campaign-phase="result"] #joystick,body[data-campaign-phase="result"] #jumpWrap,body[data-campaign-phase="result"] #controlHint,body[data-campaign-phase="result"] #hint{display:none!important}`;
    style.textContent += `#a12TestModeLabel{position:fixed;z-index:75;left:max(10px,calc(var(--safe-left) + 10px));top:max(10px,calc(var(--safe-top) + 10px));padding:5px 8px;border:1px solid #ffe07a;border-radius:6px;background:#2b210be8;color:#ffe998;font:950 10px/1 system-ui;letter-spacing:.09em;pointer-events:none;box-shadow:0 3px 10px #0008}#a12TestRoutes{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,minmax(42px,1fr));gap:6px;padding:8px;border:1px solid #79e9ba55;border-radius:10px;background:#071b24}#a12TestRoutes button{min-height:34px;padding:5px 3px;font-size:10px}@media(max-width:540px) and (orientation:portrait){#a12TestRoutes{grid-template-columns:repeat(4,minmax(42px,1fr))}}`;
    document.head.appendChild(style);
    style.textContent += `#a12Actions{flex-wrap:wrap;justify-content:center;max-width:min(96vw,720px)}body[data-campaign-phase="result"] #a12Actions{bottom:max(12px,var(--safe-bottom))}#a12Actions [data-act="rewarded"]{background:#286650;border-color:#8ff1c8}`;
    const actions = document.createElement("div");
    actions.id = "a12Actions";
    actions.innerHTML = `<button data-act="next">${t("next")}</button><button data-act="shop">${t("shop")}</button><button data-act="rewarded" hidden></button><button data-act="retry">${t("retry")}</button>`;
    document.body.appendChild(actions);
    if (TEST_MODE) {
      document.body.dataset.testMode = "hepsi";
      const label = document.createElement("div");
      label.id = "a12TestModeLabel";
      label.setAttribute("role", "status");
      label.textContent = "TEST MODU";
      document.body.appendChild(label);
    }
    const dockRoutes=document.createElement("nav");dockRoutes.id="a12DockRoutes";dockRoutes.hidden=true;document.body.appendChild(dockRoutes);const placeDockRoutes=()=>{if(dockRoutes.hidden||actions.hidden)return;const top=actions.getBoundingClientRect().top;dockRoutes.style.setProperty("--dock-actions-clearance",`${Math.max(8,innerHeight-top+8)}px`)};const renderDockRoutes=()=>{const show=document.body.dataset.campaignPhase==="result"&&profile.selectedWorldId==="dock31";dockRoutes.hidden=!show;if(!show)return;dockRoutes.innerHTML=WORLD_REGISTRY.dock31.routes.map(id=>`<button data-route="${id}">${id}<small>${"★".repeat(profile.progressByRoute[id]?.stars||0)}${"☆".repeat(3-(profile.progressByRoute[id]?.stars||0))}</small></button>`).join("");requestAnimationFrame(placeDockRoutes)};new MutationObserver(renderDockRoutes).observe(document.body,{attributes:true,attributeFilter:["data-campaign-phase"]});addEventListener("resize",placeDockRoutes);dockRoutes.addEventListener("click",e=>{const id=e.target.closest("[data-route]")?.dataset.route;if(id)startRoute(id)});
    if(!document.getElementById("a12Language")){const card=document.getElementById("characterCard");if(card){const wrap=document.createElement("label");wrap.id="a12LanguageWrap";wrap.innerHTML=`<span></span><select id="a12Language" aria-label="Language"><option value="en">EN</option><option value="tr">TR</option><option value="ru">RU</option></select>`;card.appendChild(wrap);}}
    const languageSelect=document.getElementById("a12Language");if(languageSelect){languageSelect.value=profile.settings.language;languageSelect.addEventListener("change",async()=>{const previous=profile.settings.language;profile.settings.language=languageFrom(languageSelect.value);applyLanguage();emitGame("language_change",{from:previous,to:profile.settings.language});await persist();});}
    actions.hidden = true;
    actions.addEventListener("click", async (e) => {
      const a = e.target.dataset.act;
      if (!a) return;
      if (a === "rewarded") { void claimRewardedResult(); return; }
      if (a === "next") {
        if (nextRouteInFlight) return;
        nextRouteInFlight = true;
        try { await requestRouteInterstitial();startNextRoute(); }
        finally { nextRouteInFlight = false; }
      }
      if (a === "retry") startRoute(routeId, true, routeId === "D06");
      if (a === "shop") openShop();
    });
    const shop = document.createElement("section");
    shop.id = "a12Shop";
    shop.setAttribute("aria-hidden", "true");
    shop.innerHTML = `<div id="a12Preview"><canvas width="480" height="320" aria-label="Runner preview"></canvas><p id="a12WorldWarning" data-world-insufficient hidden></p><div class="previewControls" data-runner-controls></div><div class="previewControls" data-motion-controls><button data-preview-motion="idle"></button><button data-preview-motion="run"></button><button data-preview-motion="frontFlip"></button></div></div><div id="a12Products"><div id="a12ShopTop"><h2></h2><button data-close>x</button></div><div class="a12Tabs"><button data-tab="outfits"></button><button data-tab="characters"></button><button data-tab="chiefs"></button><button data-tab="worlds"></button></div><div data-list="outfits"></div><div data-list="characters"></div><div data-list="chiefs"></div><div data-list="worlds"></div><div id="a12ShopBottom"><button data-shop-back></button><button data-shop-buy></button></div><p data-save></p></div>`;
    shop.querySelector('[data-runner-controls]').innerHTML = Object.keys(RUNNERS).map(id=>`<button data-preview-runner="${id}"></button>`).join("");
    shop.querySelector('[data-list="outfits"]').innerHTML = Object.keys(OUTFITS).map(id=>`<article data-item="${id}"><canvas class="shopThumb" width="96" height="96" aria-hidden="true"></canvas><h3></h3><button data-action></button></article>`).join("");
    shop.querySelector('[data-list="characters"]').innerHTML = Object.keys(RUNNERS).map(id=>`<article data-item="${id}"><canvas class="shopThumb" width="96" height="96" aria-hidden="true"></canvas><h3></h3><button data-action></button></article>`).join("");
    shop.querySelector('[data-list="chiefs"]').innerHTML = Object.keys(CHIEFS).map(id=>`<article data-item="${id}"><canvas class="shopThumb" width="96" height="96" aria-hidden="true"></canvas><h3></h3><button data-action></button></article>`).join("");
    document.body.appendChild(shop);
    shop.addEventListener("click", async (e) => {
      if (e.target.closest("[data-close]")) return closeShop();
      if (e.target.closest("[data-shop-back]")) return closeShop();
      if (e.target.closest("[data-shop-buy]")) return shopTab==="worlds"?purchaseOrSelectWorld(previewWorldId):shopTab==="characters"?purchaseOrSelectRunner(previewRunnerId):shopTab==="chiefs"?purchaseOrSelectChief(previewChiefId):purchaseOrWear(previewOutfitId,previewRunnerId);
      const testRoute = e.target.closest("[data-test-route]");
      if (TEST_MODE && testRoute) {
        const id = testRoute.dataset.testRoute, target = ROUTES[id];
        if (!target) return;
        profile.selectedWorldId = target.worldId;
        pendingWorldId = null;
        sceneCache.clear();
        closeShop();
        startRoute(id, true, id === "D06");
        return;
      }
      const runnerButton=e.target.closest("[data-preview-runner]");
      if(runnerButton){previewRunnerId=runnerButton.dataset.previewRunner;return renderShop();}
      const motionButton=e.target.closest("[data-preview-motion]");
      if(motionButton){previewMotion=motionButton.dataset.previewMotion;previewStartedAt=performance.now();return renderShop();}
      const tab = e.target.closest("[data-tab]");
      if (tab) { shopTab = tab.dataset.tab; return renderShop(); }
      const itemAction = !!e.target.closest("[data-action]");
      const article = e.target.closest("[data-item]");
      if (!article) return;
      if (shopTab === "worlds") {
        previewWorldId = article.dataset.item;
        renderShop();
        if (itemAction) await purchaseOrSelectWorld(previewWorldId);
        return;
      }
      if (shopTab === "characters") {
        previewRunnerId = article.dataset.item;
        renderShop();
        if (itemAction) await purchaseOrSelectRunner(previewRunnerId);
        return;
      }
      if (shopTab === "chiefs") {
        previewChiefId = article.dataset.item;
        renderShop();
        if (itemAction) await purchaseOrSelectChief(previewChiefId);
        return;
      }
      previewOutfitId = article.dataset.item;
      renderShop();
      if (itemAction)
        await purchaseOrWear(previewOutfitId, previewRunnerId);
    });
    shop.addEventListener("pointerover", (e) => {
      const article = e.target.closest("[data-item]");
      if (!article || !shop.contains(article)) return;
      const id = article.dataset.item;
      let changed = false;
      if (shopTab === "characters" && previewRunnerId !== id) { previewRunnerId = id; changed = true; }
      else if (shopTab === "chiefs" && previewChiefId !== id) { previewChiefId = id; changed = true; }
      else if (shopTab === "outfits" && previewOutfitId !== id) { previewOutfitId = id; changed = true; }
      else if (shopTab === "worlds" && previewWorldId !== id) { previewWorldId = id; changed = true; }
      if (changed) renderShop();
    });
    addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (shopOpen) closeShop();
    }, { capture: true });
    const choiceWrap = document.getElementById("characterChoices");
    if (choiceWrap) {
      choiceWrap.innerHTML = `<button class="characterChoice" data-character="0" data-runner-id="male" aria-pressed="false"></button><button class="characterChoice" data-character="1" data-runner-id="female" aria-pressed="false"></button>`;
    }
    const choices = [...document.querySelectorAll(".characterChoice")];
    choices.forEach((el, i) => {
      const id = Object.keys(RUNNERS)[i] || "male";
      el.dataset.character = String(i);
      el.dataset.runnerId = id;
      el.textContent = id === "female" ? "\u2640" : "\u2642";
      el.setAttribute("aria-label", t(id));
      el.addEventListener("click", () => selectRunner(id));
    });
    syncRunnerChoiceCards();
    const syncRunnerChoice=()=>syncRunnerChoiceCards();
    syncRunnerChoice();
    const change = document.getElementById("characterChange");
    change.textContent = "ID";
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
  }
  function selectRunner(id) {
    if (!profile.ownedRunnerIds.includes(id)) {
      sfx("deny");
      openShop();
      shopTab = "characters";
      previewRunnerId = id;
      renderShop();
      return;
    }
    const firstSelection = !profile.runnerId || !run;
    profile.runnerId = id;
    syncRunnerChoiceCards();
    engine.setCharacter(RUNNERS[id].legacy);
    void persist();
    if (firstSelection) startRoute(firstRouteForWorld(), true);
    else {
      closeCharacterSelect();
      if (!shopOpen && !result) {
        document.body.dataset.campaignPhase = "running";
        document.body.dataset.routeId = routeId;
      }
      syncActionVisibility();
    }
  }
  function syncRunnerChoiceCards() {
    document.querySelectorAll(".characterChoice").forEach(el=>{
      const id=el.dataset.runnerId||(["male","female"][Number(el.dataset.character)||0])||"male",selected=id===profile.runnerId;
      el.dataset.character = id === "female" ? "1" : "0";
      el.dataset.runnerId = id;
      el.textContent = id === "female" ? "\u2640" : "\u2642";
      el.setAttribute("aria-label", t(id));
      el.setAttribute("aria-pressed",String(selected));
    });
  }
  function openShop() {
    shopOpen = true;
    previewRunnerId=profile.runnerId||"male";previewMotion="idle";previewStartedAt=performance.now();
    previewOutfitId =
      RUNNERS[previewRunnerId]?.outfitLocked ? "default" : profile.equippedOutfitByRunner[profile.runnerId] || "default";
    previewChiefId = profile.equippedChief || "securityTall";
    previewWorldId = profile.selectedWorldId;
    document.getElementById("a12Shop").classList.add("show");
    document.getElementById("a12Shop").setAttribute("aria-hidden", "false");
    emitGame("shop_open", { tab: shopTab });
    renderShop();
    startShopPreviewLoop();
    syncActionVisibility();
  }
  function closeShop() {
    shopOpen = false;
    stopShopPreviewLoop();
    document.getElementById("a12Shop").classList.remove("show");
    document.getElementById("a12Shop").setAttribute("aria-hidden", "true");
    if(shopReturnToCharacter){shopReturnToCharacter=false;document.getElementById("characterSelect")?.classList.add("show");document.getElementById("characterSelect")?.setAttribute("aria-hidden","false");}
    syncActionVisibility();
  }
  function startShopPreviewLoop() {
    if (shopPreviewRaf) return;
    const tick = (now) => {
      if (!shopOpen) { shopPreviewRaf = 0; return; }
      drawShopPreview(now);
      shopPreviewRaf = requestAnimationFrame(tick);
    };
    shopPreviewRaf = requestAnimationFrame(tick);
  }
  function stopShopPreviewLoop() {
    if (shopPreviewRaf) cancelAnimationFrame(shopPreviewRaf);
    shopPreviewRaf = 0;
  }
  function renderShop() {
    const s = document.getElementById("a12Shop");
    const motionLabels=[t("idle"),t("motionRun"),t("flip")];
    s.querySelectorAll('[data-preview-runner]').forEach(b=>{b.textContent=t(b.dataset.previewRunner);b.setAttribute('aria-pressed',String(b.dataset.previewRunner===previewRunnerId));});
    s.querySelectorAll('[data-preview-motion]').forEach((b,i)=>{b.textContent=motionLabels[i];b.setAttribute('aria-pressed',String(b.dataset.previewMotion===previewMotion));});
    s.querySelector('[data-runner-controls]').hidden = shopTab === "characters" || shopTab === "chiefs";
    s.querySelector('[data-motion-controls]').hidden = shopTab === "worlds";
    s.querySelector("h2").textContent = `${t("shop")} · ${t(shopTab)} · ${t("wallet")} ${profile.walletBalance}`;
    s.querySelector('[data-tab="outfits"]').textContent=t("outfits");
    s.querySelector('[data-tab="characters"]').textContent=t("characters");
    s.querySelector('[data-tab="chiefs"]').textContent=t("chiefs");
    s.querySelector('[data-tab="worlds"]').textContent=t("worlds");
    s.querySelector('[data-list="outfits"]').hidden=shopTab!=="outfits";
    s.querySelector('[data-list="characters"]').hidden=shopTab!=="characters";
    s.querySelector('[data-list="chiefs"]').hidden=shopTab!=="chiefs";
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
        ? t(TEST_MODE ? "selected" : "worn")
        : owned
          ? t(TEST_MODE ? "select" : "wear")
          : `${short?"🔒 ":""}◉ ${OUTFITS[id].price}`;
      a.querySelector("button").disabled = worn || purchaseBusy || short;
      a.querySelector('.priceBadge')?.remove();
    }
    for (const a of s.querySelectorAll('[data-list="characters"] article')) {
      const id=a.dataset.item,item=RUNNERS[id],owned=profile.ownedRunnerIds.includes(id),selected=profile.runnerId===id,short=!owned&&profile.walletBalance<item.price,b=a.querySelector("button");
      a.querySelector("h3").textContent=t(id);a.style.outline=previewRunnerId===id?"2px solid #79e9ba":"none";
      b.textContent=selected?t("selected"):owned?t("select"):`${short?t("locked")+" ":""}${item.price}`;
      b.disabled=selected||purchaseBusy||short;
    }
    for (const a of s.querySelectorAll('[data-list="chiefs"] article')) {
      const id=a.dataset.item,item=CHIEFS[id],owned=profile.ownedChiefIds.includes(id),selected=profile.equippedChief===id,short=!owned&&profile.walletBalance<item.price,b=a.querySelector("button");
      a.querySelector("h3").textContent=t(id);a.style.outline=previewChiefId===id?"2px solid #79e9ba":"none";
      b.textContent=selected?t("selected"):owned?t("select"):`${short?t("locked")+" ":""}${item.price}`;
      b.disabled=selected||purchaseBusy||short;
    }
    const worlds=s.querySelector('[data-list="worlds"]');
    worlds.innerHTML=Object.values(WORLD_REGISTRY).map(w=>`<article data-item="${w.id}"><h3>${t(`world${w.id[0].toUpperCase()}${w.id.slice(1)}`)}</h3><button data-action></button></article>`).join("");
    if (TEST_MODE && WORLD_REGISTRY[previewWorldId]) worlds.insertAdjacentHTML("beforeend", `<nav id="a12TestRoutes" aria-label="${t("route")}">${WORLD_REGISTRY[previewWorldId].routes.map(id=>`<button data-test-route="${id}">${id}</button>`).join("")}</nav>`);
    for(const a of worlds.querySelectorAll("article")){const w=WORLD_REGISTRY[a.dataset.item],owned=profile.ownedWorldIds.includes(w.id),selected=profile.selectedWorldId===w.id,b=a.querySelector("button"),short=!owned&&profile.walletBalance<w.price;a.dataset.owned=String(owned);a.dataset.price=String(w.price);a.style.outline=previewWorldId===w.id?"2px solid #79e9ba":"none";b.textContent=!w.enabled?t("planned"):selected?t("selected"):owned?t("select"):`${short?"🔒 ":""}◉ ${w.price}`;b.disabled=!w.enabled||selected||purchaseBusy||short;}
    const activeList=shopTab==="worlds"?"worlds":shopTab==="characters"?"characters":shopTab==="chiefs"?"chiefs":"outfits",activeId=shopTab==="worlds"?previewWorldId:shopTab==="characters"?previewRunnerId:shopTab==="chiefs"?previewChiefId:previewOutfitId,back=s.querySelector('[data-shop-back]'),buy=s.querySelector('[data-shop-buy]'),selected=s.querySelector(`[data-list="${activeList}"] [data-item="${activeId}"] [data-action]`),previewWorld=WORLD_REGISTRY[previewWorldId],worldOwned=!!previewWorld&&profile.ownedWorldIds.includes(previewWorldId),worldSelected=profile.selectedWorldId===previewWorldId,worldShort=!!previewWorld&&!worldOwned&&profile.walletBalance<previewWorld.price,warning=s.querySelector('[data-world-insufficient]');back.textContent=t("back");if(shopTab==="worlds"&&previewWorld){buy.textContent=!previewWorld.enabled?t("planned"):worldSelected?t("selected"):worldOwned?t("select"):t("buyWorld").replace("{price}",previewWorld.price);buy.disabled=!previewWorld.enabled||worldSelected||purchaseBusy||worldShort}else{buy.textContent=selected?.textContent||t('selected');buy.disabled=!!selected?.disabled}warning.hidden=!(shopTab==="worlds"&&previewWorld?.enabled&&worldShort);warning.textContent=warning.hidden?"":t("insufficient");
    s.querySelector("[data-save]").textContent = saveFailure ? t("saveFailed") : t("noCharge");
    drawShopCardThumbs();
    drawShopPreview();
  }
  function drawShopCardThumbs() {
    const root = document.getElementById("a12Shop");
    if (!root) return;
    for (const a of root.querySelectorAll('[data-list="outfits"] article')) {
      const q=a.querySelector("canvas.shopThumb"),c=q?.getContext("2d");
      if(!c)continue;
      c.clearRect(0,0,q.width,q.height);c.save();c.translate(q.width/2,q.height-10);c.scale(1.85,1.85);
      drawRunnerAtlas(c,previewRunnerId,RUNNERS[previewRunnerId]?.outfitLocked?"default":a.dataset.item,{motion:"idle",frame:0},0,0,1);c.restore();
    }
    for (const a of root.querySelectorAll('[data-list="characters"] article')) {
      const id=a.dataset.item,q=a.querySelector("canvas.shopThumb"),c=q?.getContext("2d");
      if(!c)continue;
      c.clearRect(0,0,q.width,q.height);c.save();c.translate(q.width/2,q.height-10);c.scale(1.85,1.85);
      drawRunnerAtlas(c,id,RUNNERS[id]?.outfitLocked?"default":profile.equippedOutfitByRunner[id]||"default",{motion:"idle",frame:0},0,0,1);c.restore();
    }
    for (const a of root.querySelectorAll('[data-list="chiefs"] article')) {
      const q=a.querySelector("canvas.shopThumb"),c=q?.getContext("2d");
      if(!c)continue;
      c.clearRect(0,0,q.width,q.height);c.save();c.translate(q.width/2,q.height-8);c.scale(1.6,1.6);
      drawChiefAtlas(c,a.dataset.item,{motion:"idle",frame:0},0,0,1);c.restore();
    }
  }
  function drawShopPreview(now=performance.now()) {
    const q = document.querySelector("#a12Preview canvas"),
      x = q.getContext("2d");
    x.clearRect(0, 0, q.width, q.height);
    drawThemeScene(x,q.width,q.height,shopTab==="worlds"?previewWorldId:profile.selectedWorldId,true);
    x.save();x.translate(q.width/2,240);x.scale(3,3);
    const motion = previewMotion === "frontFlip" ? "frontFlip" : previewMotion;
    const fps = motion === "run" ? 16 : 8;
    const frame = motion === "idle" ? Math.floor(Math.max(0, now - previewStartedAt) / 1000 * 8) % 8 : Math.floor(Math.max(0, now - previewStartedAt) / 1000 * fps) % 8;
    if(shopTab==="chiefs") drawChiefAtlas(x,previewChiefId,{motion,frame},0,0,1);
    else if(shopTab==="characters") drawRunnerAtlas(x,previewRunnerId,RUNNERS[previewRunnerId]?.outfitLocked?"default":profile.equippedOutfitByRunner[previewRunnerId]||"default",{motion,frame},0,0);
    else drawRunnerAtlas(x,previewRunnerId,RUNNERS[previewRunnerId]?.outfitLocked?"default":previewOutfitId,{motion,frame},0,0);
    x.restore();
  }
  async function purchaseOrSelectWorld(id) {
    if (purchaseBusy) return false;
    const item = WORLD_REGISTRY[id];
    if (!item?.enabled) return false;
    if (profile.ownedWorldIds.includes(id)) {
      if (TEST_MODE) {
        profile.selectedWorldId = id;
        pendingWorldId = null;
        sceneCache.clear();
      } else pendingWorldId = item.routes.length ? id : null;
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
    for(let i=0;i<8;i++){const x=i*w/7;c.fillStyle=i%2?'#3a4947':'#50564a';c.beginPath();c.moveTo(x,h*.58);c.lineTo(x+15,h*.32);c.lineTo(x+65,h*.38);c.lineTo(x+90,h*.58);c.fill();c.fillStyle='#bbc3a355';c.fillRect(x+27,h*.4,18,7);}
    // A soft fog bank has no horizontal edge that can be mistaken for solid ground.
    const fog=c.createLinearGradient(0,h*.5,0,h);fog.addColorStop(0,'#303a3500');fog.addColorStop(.55,'#303a3544');fog.addColorStop(1,'#17232388');c.fillStyle=fog;c.fillRect(0,h*.5,w,h*.5);
    // Wreckage remains distant, low contrast and entirely above the play band.
    c.fillStyle='#39464055';
    for(let x=-30;x<w;x+=235){c.beginPath();c.moveTo(x,h*.55);c.lineTo(x+24,h*.43);c.lineTo(x+61,h*.48);c.lineTo(x+103,h*.39);c.lineTo(x+148,h*.55);c.closePath();c.fill();}
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
    const pulse=.5+.5*Math.sin(time*Math.PI),grounds=routeSurfaces(route).filter(s=>s.kind==='ground');
    for(const d of aftermathDecor()){
      const g=grounds.find(s=>d.x+75>=s.x&&d.x+75<=s.x+s.w);if(!g)continue;
      const x=Math.max(d.x,g.x),w=Math.max(0,Math.min(d.x+150,g.x+g.w)-x);if(!w)continue;
      c.fillStyle=`rgba(255,94,38,${.58+.32*pulse*gain})`;c.fillRect(Math.min(x+w-16,d.x+64),g.y-116,16,9);
      c.fillStyle=`rgba(255,171,85,${.04*pulse*gain})`;c.fillRect(x,g.y-3,w,Math.min(28,g.h+3));
    }
  }
  function drawAftermathSupport(c,s,suspendIds) {
    if(route.visualSupports?.some(v=>v.type==='stack-to-ground'&&v.id===s.id)){
      const bodyH=Math.max(s.h,GROUND-s.y);c.fillStyle='#354039';c.fillRect(s.x,s.y,s.w,bodyH);
      c.fillStyle='#59645a';for(let y=s.y+20;y<s.y+bodyH-8;y+=34)c.fillRect(s.x+5,y,Math.max(0,s.w-10),3);
    }
    if(!s.id||!suspendIds.has(s.id))return;
    const m=c.getTransform(),topWorld=m.d?(-28-m.f)/m.d:s.y-260,cx=s.x+s.w/2,beamY=Math.min(s.y-42,topWorld),hookY=s.y-2;
    c.save();c.strokeStyle='#202b27';c.lineWidth=8;c.beginPath();c.moveTo(cx-Math.max(32,s.w*.45),beamY);c.lineTo(cx+Math.max(32,s.w*.45),beamY);c.stroke();
    c.strokeStyle='#657067';c.lineWidth=4;c.beginPath();c.moveTo(s.x+s.w*.22,beamY+2);c.lineTo(s.x+s.w*.22,hookY);c.moveTo(s.x+s.w*.78,beamY+2);c.lineTo(s.x+s.w*.78,hookY);c.stroke();
    c.fillStyle='#d4b554';c.fillRect(cx-Math.max(27,s.w*.35),beamY-8,Math.max(54,s.w*.7),5);c.restore();
  }
  function drawAftermathWorld(c,light=true,time=gameClock,gain=1) {
    const surfaces=routeSurfaces(route),staticSurfaces=surfaces.filter(s=>s.kind!=='collapse');
    const supportSolids=surfaces.filter(s=>s.kind==='ground'||s.kind==='platform'||s.kind==='movingPlatform'||s.kind==='collapse'||s.parkour);
    const suspendIds=drawableSuspendIds(route,supportSolids);
    // Decorative wrecks sit behind and below collision tops; they never form a readable ledge.
    for(const d of aftermathDecor()){c.fillStyle='#26332f66';c.beginPath();c.moveTo(d.x,GROUND+46);c.lineTo(d.x+38,GROUND+17);c.lineTo(d.x+83,GROUND+39);c.lineTo(d.x+146,GROUND+10);c.lineTo(d.x+146,GROUND+82);c.lineTo(d.x,GROUND+82);c.closePath();c.fill();}
    for(const s of staticSurfaces)drawAftermathSupport(c,s,suspendIds);
    for(const s of staticSurfaces){
      aftermathSurface(c,s.x,s.y,s.w,s.h,s.kind==='ground'?'ground':'platform');
      if(s.parkour==='vault'){c.strokeStyle='#c6c9af';c.lineWidth=3;c.beginPath();c.moveTo(s.x+4,s.y+8);c.lineTo(s.x+s.w*.6,s.y+s.h*.6);c.lineTo(s.x+s.w-4,s.y+11);c.stroke();c.fillStyle='#262c29';c.fillRect(s.x+s.w*.2,s.y+s.h*.6,s.w*.6,8);}
      if(s.parkour==='slide'){c.fillStyle='#eff0cc';c.fillRect(s.x-5,s.y+s.h-6,s.w+10,6);c.fillStyle='#e9c04b';c.font='bold 17px system-ui';c.fillText('↓',s.x+s.w/2-7,s.y+s.h+17);}
    }
    drawDockWolfMarks(c,staticSurfaces.filter(s=>s.kind==='ground'));
    for(const s of route.slopes||[]){if(s.visible===false)continue;c.fillStyle='#535f55';c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.lineTo(s.x2,s.y2+100);c.lineTo(s.x1,s.y1+100);c.closePath();c.fill();c.strokeStyle='#e1e7c9';c.lineWidth=5;c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.stroke();}
    for(const o of route.obstacles){if(o.type==='ramp'){const baseY=o.baseY??GROUND;c.fillStyle='#73796b';c.beginPath();c.moveTo(o.x,baseY);c.lineTo(o.x+o.w,baseY-o.h);c.lineTo(o.x+o.w,baseY);c.closePath();c.fill();c.strokeStyle='#edf1cd';c.lineWidth=6;c.stroke();c.strokeStyle='#333d35';c.lineWidth=3;c.beginPath();c.moveTo(o.x+o.w*.5,baseY-o.h*.5+7);c.lineTo(o.x+o.w*.6,baseY-10);c.stroke();}else if(o.type==='worker'&&!o.offscreenWait){const s=presentationSurface(o.x,96),patrol=patrolMotionOnSurface(s,.8,36);if(patrol){aftermathRescuer(c,patrol.x,s.y);if(!workerDisabled&&workerClock>1.65){c.fillStyle='#ff6551';c.font='bold 22px system-ui';c.fillText('!',patrol.x-3,s.y-97);}}}}
    if(!debugHideMovingPlatforms)for(const p of movingPlatforms){if(p.type==='crane'){c.strokeStyle='#d5d7b9';c.lineWidth=4;c.beginPath();c.moveTo(p.x+p.w*.3-35,115);c.quadraticCurveTo(p.x+p.w*.3+20,190,p.x+p.w*.3,p.y);c.moveTo(p.x+p.w*.75+22,115);c.lineTo(p.x+p.w*.75,p.y);c.stroke();}aftermathSurface(c,p.x,p.y,p.w,p.h);c.fillStyle='#ecbd55';c.fillRect(p.x+7,p.y+7,Math.max(4,p.w*.24),6);c.fillStyle='#eff2d5';c.font='bold 18px system-ui';c.fillText(p.type==='pallet'?'↔':'!',p.x+p.w/2-7,p.y-9);}
    for(const p of collapsing){if(p.state==='ABSENT')continue;c.save();if(p.state==='CONTACT_WARNING')c.translate(Math.sin(p.timer*55)*3,0);const y=p.y+p.fallY;aftermathSurface(c,p.x,y,p.w,p.h);c.strokeStyle='#17251d';c.lineWidth=4;c.beginPath();c.moveTo(p.x+10,y+5);c.lineTo(p.x+p.w*.4,y+19);c.lineTo(p.x+p.w*.7,y+5);c.lineTo(p.x+p.w-10,y+20);c.stroke();c.fillStyle='#f3c54b';c.fillRect(p.x,y,p.w,4);c.restore();}
    for(const d of containerDoors){aftermathSurface(c,d.x,d.currentY,d.w,d.h);c.strokeStyle='#d5c8a0';c.lineWidth=6;c.beginPath();c.moveTo(d.x-8,d.currentY+d.h);c.lineTo(d.x-3,d.currentY-12);c.lineTo(d.x+d.w+9,d.currentY-5);c.stroke();c.fillStyle=d.state==='OPEN'?'#63f2a5':d.state==='PREPARING'?'#ffd34d':'#ff5b55';c.beginPath();c.arc(d.x+d.w/2,d.currentY-26,9,0,7);c.fill();}
    drawHermesShoes(c);
    for(const b of barrels){c.fillStyle='#343c32';c.strokeStyle='#c6bd94';c.lineWidth=3;c.beginPath();c.moveTo(b.x+5,b.y);c.lineTo(b.x+27,b.y+4);c.lineTo(b.x+24,b.y+27);c.lineTo(b.x,b.y+22);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(b.x+3,b.y+9);c.lineTo(b.x+23,b.y+17);c.stroke();}
    if(campaignChief?.active&&campaignChief.entryPhase!=='result'){
      const state=campaignChief.resultAngry?"idle":campaignChief.pose||"run";
      drawChiefAtlas(c,profile.equippedChief||"securityTall",chiefPoseFromState(state),campaignChief.x+16,campaignChief.y+48,campaignChief.facing||1);
    }
    { const finishDoor=finishDoorPlacement(); drawFinishDoor(c, finishDoor.x, finishDoor.y); }
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
      c.fillStyle="#ff6a225c";c.beginPath();c.moveTo(0,h*.18);for(let x=0;x<=w;x+=38)c.lineTo(x,h*(.175+.003*Math.sin(x/83)));c.lineTo(w,h*.19);c.lineTo(0,h*.19);c.fill();
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
    const key=`frozen|${routeId}|${route.version}|${engine?.renderInfo().dpr||1}|${w}x${h}|${preview?1:0}`;
    sceneCache.set(key,true);
    let cached=frozenBackdropCache.get(key);
    if(!cached){
      cached=document.createElement("canvas");cached.width=w;cached.height=h;
      const b=cached.getContext("2d");
      const g=b.createLinearGradient(0,0,0,h);g.addColorStop(0,"#102d4d");g.addColorStop(.48,"#397f9a");g.addColorStop(1,"#d5f2f5");b.fillStyle=g;b.fillRect(0,0,w,h);
      b.strokeStyle="#7fffd477";b.lineWidth=18;b.beginPath();for(let x=-20;x<=w+20;x+=36){const y=h*(.16+.035*Math.sin(x/91));x<0?b.moveTo(x,y):b.lineTo(x,y)}b.stroke();
      b.fillStyle="#bfeaf1bb";b.beginPath();b.moveTo(0,h*.57);for(let x=0;x<=w;x+=90)b.lineTo(x,h*(.25+((x/90)%4)*.055));b.lineTo(w,h*.65);b.lineTo(0,h*.65);b.fill();
      b.fillStyle="#285c74aa";for(let x=-30;x<w;x+=190){b.beginPath();b.moveTo(x,h*.67);b.lineTo(x+35,h*.42);b.lineTo(x+74,h*.49);b.lineTo(x+105,h*.31);b.lineTo(x+150,h*.67);b.closePath();b.fill();b.strokeStyle="#dffaff99";b.lineWidth=5;b.stroke();}
      b.fillStyle="#dff8ff";for(let i=15;i<w;i+=52){b.beginPath();b.arc(i,(i*7)%Math.max(40,h*.55),2,0,7);b.fill();}
      b.fillStyle="#70bdd3";b.fillRect(0,h*.67,w,h*.19);b.fillStyle="#dff9ff";for(let x=12;x<w;x+=86){b.beginPath();b.ellipse(x,h*.71+(x%3)*7,31,7,0,0,7);b.fill();}
      b.fillStyle="#8ccfdc88";for(let x=-20;x<w;x+=74){b.beginPath();b.ellipse(x,h*.81+(x%4)*5,42,9,-.08,0,7);b.fill();}
      const shelf=b.createLinearGradient(0,h*.86,0,h);shelf.addColorStop(0,"#c8edf3");shelf.addColorStop(.45,"#79bdcd");shelf.addColorStop(1,"#39788d");b.fillStyle=shelf;b.fillRect(0,h*.86,w,h*.14);b.fillStyle="#effcff";b.beginPath();b.moveTo(0,h*.87);for(let x=0;x<=w;x+=58)b.lineTo(x,h*(.855+(x/58%3)*.008));b.lineTo(w,h*.9);b.lineTo(0,h*.9);b.closePath();b.fill();
      b.fillStyle="#edfaff";b.fillRect(0,h*.85,w,7);
      for(let i=35;i<w;i+=120){const groundY=h*.86,ly=groundY-Math.min(92,h*.18);b.strokeStyle="#203944";b.lineWidth=4;b.beginPath();b.moveTo(i,groundY);b.lineTo(i,ly);b.stroke();b.fillStyle="#ffd27a";b.fillRect(i-11,ly-5,22,7);const glow=b.createLinearGradient(i,ly,i,ly+42);glow.addColorStop(0,"#ffd98a88");glow.addColorStop(1,"#ffd98a00");b.fillStyle=glow;b.beginPath();b.moveTo(i-13,ly+2);b.lineTo(i+13,ly+2);b.lineTo(i+28,ly+42);b.lineTo(i-28,ly+42);b.closePath();b.fill();}
      if(!preview){b.strokeStyle="#dff9ff";b.lineWidth=4;b.strokeRect(0,h*.86,w,h*.14);}
      frozenBackdropCache.set(key,cached);
    }
    c.drawImage(cached,0,0);
  }
  function suspendGapInfo(target, solids) {
    if (!target) return { ok:false, gap:0, blocked:true };
    const bottom = target.y + target.h;
    if (bottom >= GROUND - 1) return { ok:false, gap:0, blocked:false };
    const overlap = (a,b)=>a.x < b.x + b.w - 4 && a.x + a.w > b.x + 4;
    const below = solids
      .filter(s=>s.id!==target.id && s.y >= bottom - 1 && overlap(target,s))
      .sort((a,b)=>a.y-b.y)[0];
    const belowTop = below ? below.y : GROUND;
    const gap = belowTop - bottom;
    const blocked = solids.some(s=>s.id!==target.id && s.id!==below?.id && overlap(target,s) && s.y < belowTop - 1 && s.y + s.h > bottom + 1);
    return { ok: gap > 20 && !blocked, gap, blocked, belowId: below?.id || "ground" };
  }
  function drawableSuspendIds(r, solids, filtered = debugSuspendGapFilter) {
    const ids = new Set();
    for (const a of r.visualAttachments || []) {
      if (a.type !== "suspend") continue;
      const target = solids.find(s=>s.id===a.targetId);
      if (!filtered || suspendGapInfo(target, solids).ok) ids.add(a.targetId);
    }
    return ids;
  }
  function auditSuspendCounts() {
    const rows = {};
    for (const id of Object.keys(ROUTES).filter(v=>/^(?:D(?:0[1-9]|1[0-8])|[FMA]0[1-6])$/.test(v)).sort()) {
      const r = ROUTES[id], solids = routeSurfaces(r).filter(v=>v.kind==="ground" || v.kind==="platform" || v.kind==="movingPlatform" || v.parkour);
      rows[id] = { before:(r.visualAttachments||[]).filter(v=>v.type==="suspend").length, after:drawableSuspendIds(r, solids, true).size };
    }
    return rows;
  }
  function frozenSurfaceDirect(c,x,y,w,h,kind="platform") {
    const ice=c.createLinearGradient(0,y,0,y+h);ice.addColorStop(0,"#9dddea");ice.addColorStop(.35,"#397b91");ice.addColorStop(1,"#17384b");c.fillStyle=ice;c.fillRect(x,y,w,h);
    const snowStep=kind==="ground"?120:18,icicleStep=kind==="ground"?260:47,crackStep=kind==="ground"?700:137;
    c.fillStyle="#f4fdff";c.beginPath();c.moveTo(x,y+12);for(let q=0;q<=w;q+=snowStep)c.lineTo(x+q,y+3+((q/snowStep)%4===1?7:(q/snowStep)%4===3?4:0));c.lineTo(x+w,y+18);c.lineTo(x,y+18);c.closePath();c.fill();
    c.strokeStyle="#bceefa";c.lineWidth=3;c.beginPath();c.moveTo(x,y+18);c.lineTo(x+w,y+18);c.stroke();
    c.fillStyle="#c9f4fb";for(let q=15;q<w-8;q+=icicleStep){c.beginPath();c.moveTo(x+q,y+h-1);c.lineTo(x+q+7,y+h+12+(q%19));c.lineTo(x+q+14,y+h-1);c.fill();}
    c.strokeStyle="#79c6d8";c.lineWidth=2;for(let q=35;q<w;q+=crackStep){c.beginPath();c.moveTo(x+q,y+25);c.lineTo(x+q+18,y+34);c.lineTo(x+q+5,y+45);c.lineTo(x+q+29,y+52);c.stroke();}
    if(kind==="ground"){c.fillStyle="#d7f7fb55";for(let q=70;q<w;q+=900){c.beginPath();c.ellipse(x+q,y+29,24,7,-.12,0,7);c.fill();}}
  }
  function frozenSurface(c,x,y,w,h,kind="platform") {
    if(kind==="ground"||w>1200){frozenSurfaceDirect(c,x,y,w,h,kind);return;}
    const key=`frozenSurface|${kind}|${w}|${h}`,cached=worldSurfaceCache.get(key);
    if(cached){c.drawImage(cached,x,y);return;}
    const surface=document.createElement("canvas");surface.width=Math.max(1,Math.ceil(w));surface.height=Math.max(1,Math.ceil(h+32));
    const s=surface.getContext("2d");frozenSurfaceDirect(s,0,0,w,h,kind);worldSurfaceCache.set(key,surface);c.drawImage(surface,x,y);
  }
  let magmaBasaltTile;
  function magmaSurfaceDirect(c,x,y,w,h,kind="platform") {
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
  function magmaSurface(c,x,y,w,h,kind="platform") {
    if(kind==="ground"||w>1200){magmaSurfaceDirect(c,x,y,w,h,kind);return;}
    const key=`magmaSurface|${kind}|${w}|${h}`,cached=worldSurfaceCache.get(key);
    if(cached){c.drawImage(cached,x-2,y-2);return;}
    const surface=document.createElement("canvas");surface.width=Math.max(1,Math.ceil(w+4));surface.height=Math.max(1,Math.ceil(h+4));
    const s=surface.getContext("2d");magmaSurfaceDirect(s,2,2,w,h,kind);worldSurfaceCache.set(key,surface);c.drawImage(surface,x-2,y-2);
  }
  async function purchaseOrWear(id, runnerId=profile.runnerId) {
    if (purchaseBusy || !RUNNERS[runnerId] || RUNNERS[runnerId].outfitLocked || !Object.hasOwn(OUTFITS, id)) return false;
    if (profile.ownedOutfitSetIds.includes(id)) {
      purchaseBusy = true;
      const before = clone(profile);
      profile.equippedOutfitByRunner[runnerId] = id;
      const ok = await persist();
      if (!ok) profile = before;
      purchaseBusy = false;
      if(ok){sfx("equip");emitGame("outfit_worn",{itemId:id,runnerId});}
      renderShop();
      drawCharacterChoicePortraits();
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
    drawCharacterChoicePortraits();
    return ok;
  }
  async function purchaseOrSelectRunner(id) {
    if (purchaseBusy || !RUNNERS[id]) return false;
    if (profile.ownedRunnerIds.includes(id)) { selectRunner(id); renderShop(); return true; }
    const item=RUNNERS[id];
    if (profile.walletBalance < item.price) return false;
    purchaseBusy = true;
    const before = clone(profile);
    profile.walletBalance -= item.price;
    profile.ownedRunnerIds.push(id);
    profile.runnerId = id;
    profile.equippedOutfitByRunner[id] = "default";
    const ok = await persist();
    if (!ok) profile = before; else { engine.setCharacter(RUNNERS[id].legacy); sfx("purchase"); }
    purchaseBusy = false;
    renderShop(); syncRunnerChoiceCards(); drawCharacterChoicePortraits();
    return ok;
  }
  async function purchaseOrSelectChief(id) {
    if (purchaseBusy || !CHIEFS[id]) return false;
    if (profile.ownedChiefIds.includes(id)) {
      profile.equippedChief = id;
      const ok = await persist();
      renderShop();
      return ok;
    }
    const item=CHIEFS[id];
    if (profile.walletBalance < item.price) return false;
    purchaseBusy = true;
    const before = clone(profile);
    profile.walletBalance -= item.price;
    profile.ownedChiefIds.push(id);
    profile.equippedChief = id;
    const ok = await persist();
    if (!ok) profile = before; else sfx("purchase");
    purchaseBusy = false;
    renderShop();
    return ok;
  }
  function debugState() {
    return {
      schemaVersion: profile.schemaVersion,
      testMode: TEST_MODE,
      profile: clone(profile),
      routeId,
      routeVersion: route?.version,
      cameraWorldY,
      cameraX: typeof engine?.cameraX === "function" ? engine.cameraX() : null,
      cameraGroundFootY,
      ...(DEBUG ? {pose:{...runnerAtlasPose(diveRun?{...engine.parkour,state:"dive",timer:Math.max(0,diveRun.duration-diveRun.elapsed),duration:diveRun.duration}:engine.parkour),angle:0}} : {}),
      movementProfile: movementProfile(),
      vectorJumpPending: vectorJumpPending ? { ...vectorJumpPending } : null,
      wallJumpRun: wallJumpRun ? {zoneId:wallJumpRun.zone.id,elapsed:wallJumpRun.elapsed,duration:wallJumpRun.duration,startY:wallJumpRun.startY,endY:wallJumpRun.endY,contacts:[...wallJumpRun.contacts],queued:wallJumpRun.queued} : null,
      vectorAir: vectorAir ? { ...vectorAir } : null,
      vectorRollStarts,
      diveRun: diveRun ? {elapsed:diveRun.elapsed,duration:diveRun.duration,startX:diveRun.startX,endX:diveRun.endX,landY:diveRun.landY} : null,
      parkour: {state:diveRun?"dive":wallJumpRun?"wallJump":engine.parkour.state,timer:diveRun?Math.max(0,diveRun.duration-diveRun.elapsed):wallJumpRun?Math.max(0,wallJumpRun.duration-wallJumpRun.elapsed):engine.parkour.timer,dir:engine.parkour.dir},
      obstacleSeed: obstacleSeed(route),
      chiefRouteHash: chiefRouteHash(route),
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
      checkpointRespawn: run?.checkpointRespawn ? {...run.checkpointRespawn} : null,
      lastSafeGround: lastSafeGround ? {...lastSafeGround} : null,
      result: result ? clone(result) : null,
      finishAdvance: finishAdvance ? { ...finishAdvance } : null,
      finishGate: { ...finishGate },
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
      chief: campaignChief ? {...campaignChief,playerT:Number.isFinite(campaignChief.playerT)?campaignChief.playerT:gameClock,chiefT:Number.isFinite(campaignChief.chiefT)?campaignChief.chiefT:Math.max(0,gameClock-Math.max(.1,(player.x-campaignChief.x)/300)),path:undefined,distance:player.x-campaignChief.x} : null,
      deaths: campaignDeaths,
      dead: engine.isDead() || !!campaignChief?.caughtT,
      shop: { open: shopOpen, tab:shopTab, previewOutfitId, previewWorldId, purchaseBusy, saveStatus },
      world: { registry:clone(WORLD_REGISTRY), selectedWorldId:profile.selectedWorldId, pendingWorldId, activeCacheKey:activeWorldCacheKey, cacheKeys:[...sceneCache.keys()], renderSignatures:{...renderSignatures} },
      wallJumpZones: clone(route.wallJumpZones||[]),
      route: {id:routeId,name:routeDisplayName(route),worldId:route.worldId,length:route.length,finishX:route.finishX,checkpoints:[...route.checkpoints],obstacles:clone(route.obstacles),coins:clone(route.coins),hermesLaunchZones:clone(route.hermesLaunchZones||[]),unlocked:Object.fromEntries((route.worldId==="aftermath"?WORLD_REGISTRY.aftermath.routes:route.worldId==="magma"?WORLD_REGISTRY.magma.routes:WORLD_REGISTRY.frozen.routes).map(id=>[id,routeUnlocked(id)]))},
    };
  }
  function drawBackgroundIntegrated(c, w, h) {
    ctx = c;
    const cacheRoute=profile.selectedWorldId==="frozen"&&routeId==="F01"?"D01":routeId;
    const cacheVersion=cacheRoute==="D01"?2:route.version;
    activeWorldCacheKey=`${profile.selectedWorldId}|${cacheRoute}|${cacheVersion}|${engine.renderInfo().dpr}`;
    const frozen=profile.selectedWorldId==="frozen",magma=profile.selectedWorldId==="magma";
    renderSignatures=(frozen||magma||profile.selectedWorldId==="aftermath")?{deckStripe:0,dock31Text:0,containerBlock:0,dockCrane:0,loadingCorridor:0,foregroundLampGroundGap:0,snowCap:0,icicles:0,iceRatio:0}:{deckStripe:1,dock31Text:1,containerBlock:1,dockCrane:1,loadingCorridor:1,foregroundLampGroundGap:0,snowCap:0,icicles:0,iceRatio:0};
    const verticalParallax=(frozen||magma)?0:Math.max(-.35*h,Math.min(.35*h,.25*(cameraWorldY-backgroundCameraWorldY)));
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
  function visibleWorldBounds(c,pad=180) {
    try {
      const m=c.getTransform(),canvas=c.canvas;
      if(m.b===0&&m.c===0&&m.a!==0){
        const x0=(0-m.e)/m.a,x1=(canvas.width-m.e)/m.a;
        return {minX:Math.min(x0,x1)-pad,maxX:Math.max(x0,x1)+pad};
      }
      const inv=m.inverse(),p0=new DOMPoint(0,0).matrixTransform(inv),p1=new DOMPoint(canvas.width,canvas.height).matrixTransform(inv);
      return {minX:Math.min(p0.x,p1.x)-pad,maxX:Math.max(p0.x,p1.x)+pad};
    } catch (_) {
      return {minX:-Infinity,maxX:Infinity};
    }
  }
  function visibleX(bounds,x,w,pad=0) {
    return x+w>=bounds.minX-pad&&x<=bounds.maxX+pad;
  }
  function drawTintedWolfDecal(c, x, y, w, h) {
    if (!wolfDecalCanvas || wolfDecalCanvas.width !== BRAND_WOLF_A12.naturalWidth || wolfDecalCanvas.height !== BRAND_WOLF_A12.naturalHeight) {
      wolfDecalCanvas = document.createElement("canvas");
      wolfDecalCanvas.width = BRAND_WOLF_A12.naturalWidth;
      wolfDecalCanvas.height = BRAND_WOLF_A12.naturalHeight;
      const wc = wolfDecalCanvas.getContext("2d");
      wc.drawImage(BRAND_WOLF_A12, 0, 0);
      const img = wc.getImageData(0, 0, wolfDecalCanvas.width, wolfDecalCanvas.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const luma = img.data[i] * .2126 + img.data[i + 1] * .7152 + img.data[i + 2] * .0722;
        const alpha = Math.max(0, Math.min(235, (luma - 30) * 3.8));
        img.data[i] = 238;
        img.data[i + 1] = 242;
        img.data[i + 2] = 247;
        img.data[i + 3] = alpha;
      }
      wc.putImageData(img, 0, 0);
    }
    c.save();
    c.globalAlpha = .70;
    c.drawImage(wolfDecalCanvas, x, y, w, h);
    c.restore();
  }
  function drawDockWolfMarks(c, groundSurfaces, bounds) {
    window.__tmbWolfDecals = [];
    if (!BRAND_WOLF_A12.complete || !BRAND_WOLF_A12.naturalWidth) return;
    let nextMarkX = 980;
    for (const g of groundSurfaces.filter(v => v.kind === "ground").sort((a, b) => a.x - b.x)) {
      const visibleLeft = Math.max(g.x, bounds?.minX ?? -Infinity);
      const visibleRight = Math.min(g.x + g.w, bounds?.maxX ?? Infinity);
      const visibleW = visibleRight - visibleLeft;
      const faceH = Math.max(0, g.decalFaceH || g.h);
      const faceY = Number.isFinite(g.decalFaceY) ? g.decalFaceY : g.y;
      if (visibleW < 200 || faceH < 120 || g.x + g.w * .5 < nextMarkX) continue;
      const h = Math.max(52, Math.min(faceH * .48, 130));
      const w = h * (BRAND_WOLF_A12.naturalWidth / BRAND_WOLF_A12.naturalHeight);
      if (w > Math.min(g.w * .72, visibleW * .72)) continue;
      const x = Math.max(g.x + 18, Math.min(g.x + g.w - w - 18, g.x + (g.w - w) * .5));
      const y = faceY + 24;
      c.save();
      c.beginPath();
      c.rect(g.x, faceY, g.w, faceH);
      c.clip();
      drawTintedWolfDecal(c, x, y, w, h);
      c.restore();
      try {
        const m = c.getTransform();
        const p0 = new DOMPoint(x, y).matrixTransform(m);
        const p1 = new DOMPoint(x + w, y + h).matrixTransform(m);
        const f0 = new DOMPoint(g.x, faceY).matrixTransform(m);
        window.__tmbWolfDecals.push({
          world: { x, y, w, h, faceX: g.x, faceY, faceW: g.w, faceH },
          screen: { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), w: Math.abs(p1.x - p0.x), h: Math.abs(p1.y - p0.y), faceTop: f0.y },
        });
      } catch (_) {}
      nextMarkX = g.x + 1900;
    }
  }
  function drawClippedSurface(c,bounds,draw,x,y,w,h,pad=36) {
    const x0=Math.max(x,bounds.minX-pad),x1=Math.min(x+w,bounds.maxX+pad);
    if(x1<=x0)return;
    c.save();c.beginPath();c.rect(x0,y-pad,x1-x0,h+pad*2);c.clip();draw();c.restore();
  }
  function drawVectorJumpPads(c,bounds=null) {
    const marked=jumpHintZoneSets.get(routeId);
    const zones = [
      ...(route.diveZones || []).map(z=>({...z,hintKind:"dive"})),
      ...(route.highJumpZones || []).map(z=>({...z,hintKind:"high"})),
    ].filter(z=>marked?.has(z.id)&&z.x1>=370);
    if (!zones.length) return;
    for (const z of zones) {
      const centerX=(z.x1+z.x2)/2;
      const supports=routeSurfaces(route).filter(s=>s.x<=centerX&&centerX<=s.x+s.w);
      const x = z.x1, w = Math.max(36, z.x2 - z.x1), surfaceY = supports.length?Math.min(...supports.map(s=>s.y)):routeGroundYAt(centerX);
      if(bounds&&!visibleX(bounds,x,w,80))continue;
      const px=player?player.x+player.w/2:x-999,approach=1-Math.max(0,Math.min(1,(x-px)/260)),near=px>=x-260&&px<=z.x2+44;
      const pulse=near?(.84+.16*Math.sin(gameClock*7)):1;
      const alpha=(near?(.42+.46*approach):.28)*pulse;
      const stripeY=surfaceY-9,stripeH=8,step=18;
      c.save();
      c.globalAlpha=alpha;
      c.fillStyle="#15130d";
      c.fillRect(x,stripeY,w,stripeH);
      c.beginPath();
      c.rect(x,stripeY,w,stripeH);
      c.clip();
      c.fillStyle=near?"#ffe45c":"#d6a921";
      for(let sx=x-step;sx<x+w+step;sx+=step){
        c.beginPath();
        c.moveTo(sx,stripeY+stripeH);
        c.lineTo(sx+7,stripeY+stripeH);
        c.lineTo(sx+20,stripeY);
        c.lineTo(sx+13,stripeY);
        c.closePath();
        c.fill();
      }
      c.restore();
      c.save();
      c.globalAlpha=Math.min(1,alpha+.12);
      c.fillStyle=near?"#fff0a6":"#dcb53e";
      c.strokeStyle="rgba(14,16,18,.72)";
      c.lineWidth=3;
      c.font="900 22px system-ui";
      c.textAlign="center";
      c.textBaseline="alphabetic";
      const arrow=z.hintKind==="dive"?"\u2198":"\u2197",ax=x+Math.min(w-14,Math.max(14,w*.55)),ay=stripeY-9;
      c.strokeText(arrow,ax,ay);
      c.fillText(arrow,ax,ay);
      c.restore();
    }
  }
  function drawHermesShoes(c,bounds=null) {
    const zones=route.hermesLaunchZones||null;
    if(!zones?.length)return;
    for(const z of zones){
      const centerX=(z.x1+z.x2)/2,w=Math.max(42,z.x2-z.x1);
      if(bounds&&!visibleX(bounds,centerX-w/2,w,120))continue;
      const supports=routeSurfaces(route).filter(s=>s.x<=centerX&&centerX<=s.x+s.w);
      const surfaceY=supports.length?Math.min(...supports.map(s=>s.y)):routeGroundYAt(centerX);
      const px=player?player.x+player.w/2:centerX-999,near=px>=z.x1-230&&px<=z.x2+70;
      const bob=Math.sin(gameClock*5.8+centerX*.03)*(near?2.5:1.3),glow=near?.62:.34;
      const x=centerX,y=surfaceY-12+bob;
      c.save();
      c.globalAlpha=glow;
      c.fillStyle="#ffd86a";
      c.beginPath();c.ellipse(x,y+6,35,8,0,0,Math.PI*2);c.fill();
      c.globalAlpha=1;
      c.shadowColor="#ffe08a";c.shadowBlur=near?18:9;
      c.strokeStyle="#5b3717";c.lineWidth=3;c.lineCap="round";c.lineJoin="round";
      c.fillStyle="#d69032";
      c.beginPath();
      c.moveTo(x-30,y+9);c.quadraticCurveTo(x-8,y+3,x+27,y+5);c.quadraticCurveTo(x+34,y+7,x+29,y+12);
      c.quadraticCurveTo(x+4,y+17,x-27,y+15);c.quadraticCurveTo(x-36,y+13,x-30,y+9);c.closePath();c.fill();c.stroke();
      c.strokeStyle="#704015";c.lineWidth=2;
      c.beginPath();c.moveTo(x-24,y+10);c.lineTo(x+23,y+8);c.moveTo(x-18,y+14);c.lineTo(x+18,y+12);c.stroke();
      c.strokeStyle="#f7c96b";c.lineWidth=4;
      c.beginPath();
      c.moveTo(x-14,y+9);c.quadraticCurveTo(x-7,y-7,x+7,y+4);
      c.moveTo(x-2,y+8);c.quadraticCurveTo(x+7,y-5,x+21,y+5);
      c.moveTo(x-21,y+11);c.quadraticCurveTo(x-10,y-1,x+2,y+8);
      c.stroke();
      c.strokeStyle="#5b3717";c.lineWidth=1.5;
      c.beginPath();
      c.moveTo(x-14,y+9);c.quadraticCurveTo(x-7,y-7,x+7,y+4);
      c.moveTo(x-2,y+8);c.quadraticCurveTo(x+7,y-5,x+21,y+5);
      c.moveTo(x-21,y+11);c.quadraticCurveTo(x-10,y-1,x+2,y+8);
      c.stroke();
      c.fillStyle="#fff6df";c.strokeStyle="#6f8ca0";c.lineWidth=2;
      c.beginPath();c.moveTo(x-27,y+4);c.quadraticCurveTo(x-49,y-10,x-61,y-2);c.quadraticCurveTo(x-47,y+2,x-30,y+8);c.closePath();c.fill();c.stroke();
      c.beginPath();c.moveTo(x-23,y);c.quadraticCurveTo(x-45,y-19,x-57,y-12);c.quadraticCurveTo(x-47,y-5,x-28,y+4);c.closePath();c.fill();c.stroke();
      c.fillStyle="#fff2b0";
      c.beginPath();c.arc(x+24,y-6,3.5,0,Math.PI*2);c.fill();
      c.restore();
    }
  }
  function drawWorldIntegrated(c) {
    if(profile.selectedWorldId==="aftermath"){drawAftermathWorld(c,true,gameClock,effectsGain());return;}
    ctx = c;
    const frozen=profile.selectedWorldId==="frozen",magma=profile.selectedWorldId==="magma";
    const bounds=(frozen||magma)?visibleWorldBounds(c,260):null;
    // Dock silhouettes stay behind gameplay geometry and make hazards readable at approach distance.
    for (let x = 120; x < route.length; x += 720) {
      if(bounds&&!visibleX(bounds,x,430,80))continue;
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
    const surfaces=routeSurfaces(route);
    const visualOnlySurfaces=(route.groundSegments||[]).filter(s=>s.solid===false).map(s=>({...s}));
    const groundSurfaces=[...surfaces,...visualOnlySurfaces].filter(v=>v.kind==="ground"&&v.visible!==false&&(!bounds||visibleX(bounds,v.x,v.w,80)));
    const allSuspendSolids=[...groundSurfaces,...surfaces.filter(v=>v.kind!=="ground")];
    const drawableSuspends=drawableSuspendIds(route, allSuspendSolids);
    const ropeBlocked=(target,ropeX,y1,y2)=>allSuspendSolids.some(s=>s.id!==target.id&&ropeX>=s.x&&ropeX<=s.x+s.w&&Math.max(Math.min(y1,y2),s.y)<Math.min(Math.max(y1,y2),s.y+s.h));
    if(route.visualSupports?.length){
      const supported=new Set(route.visualSupports.filter(v=>v.type==="stack-to-ground").map(v=>v.id));
      for(const g of groundSurfaces.filter(v=>supported.has(v.id))){
        const bodyH=Math.max(0,GROUND-g.y);
        if(bodyH<=g.h+2)continue;
        c.fillStyle=frozen?"#1f5269cc":magma?"#25252acc":"#243b46";c.fillRect(g.x,g.y,g.w,bodyH);
        c.fillStyle=frozen?"#82c7d8":magma?"#4a4644":"#314f5d";for(let yy=g.y+14;yy<GROUND-12;yy+=42)c.fillRect(g.x+4,yy,Math.max(0,g.w-8),4);
        c.strokeStyle=frozen?"#8edbea":magma?"#b49e72":"#f1be31";c.lineWidth=3;c.strokeRect(g.x+2,g.y+2,Math.max(0,g.w-4),Math.max(0,bodyH-4));
      }
    }
    if(route.visualAttachments?.length){
      const suspendedGround=drawableSuspends;
      for(const g of groundSurfaces.filter(v=>suspendedGround.has(v.id))){
        const m=c.getTransform(),topWorld=(m.d?(-28-m.f)/m.d:g.y-260);
        const cx=g.x+g.w/2,beamY=Math.min(g.y-42,topWorld),hookY=g.y-2;
        const ropeL=g.x+Math.max(8,g.w*.2),ropeR=g.x+Math.min(g.w-8,g.w*.8);
        c.save();
        c.strokeStyle=frozen?"#203944":magma?"#28282d":"#1b2a33";c.lineWidth=8;c.beginPath();c.moveTo(cx-Math.max(32,g.w*.45),beamY);c.lineTo(cx+Math.max(32,g.w*.45),beamY);c.stroke();
        c.strokeStyle=frozen?"#356577":magma?"#4a4644":"#253a45";c.lineWidth=5;c.beginPath();c.moveTo(cx-Math.max(26,g.w*.35),beamY+7);c.lineTo(cx+Math.max(26,g.w*.35),beamY+7);c.stroke();
        c.strokeStyle=frozen?"#203944":magma?"#28282d":"#1b2a33";c.lineWidth=4;c.beginPath();
        if(!ropeBlocked(g,ropeL,beamY+2,hookY)){c.moveTo(ropeL,beamY+2);c.lineTo(ropeL,hookY);}
        if(!ropeBlocked(g,ropeR,beamY+2,hookY)){c.moveTo(ropeR,beamY+2);c.lineTo(ropeR,hookY);}
        c.stroke();
        c.fillStyle=frozen?"#1f5269":magma?"#3a3838":"#203846";c.fillRect(cx-Math.max(32,g.w*.45),beamY-10,Math.max(64,g.w*.9),10);
        c.fillStyle=frozen?"#ffd27a":magma?"#c6cbd0":"#f0c544";c.fillRect(cx-Math.max(26,g.w*.35),beamY-15,Math.max(52,g.w*.7),5);
        c.restore();
      }
    }
    for(const g of groundSurfaces){
      if(frozen) drawClippedSurface(c,bounds,()=>frozenSurface(c,g.x,g.y,g.w,g.h,"ground"),g.x,g.y,g.w,g.h,44);
      else if(magma) drawClippedSurface(c,bounds,()=>magmaSurface(c,g.x,g.y,g.w,g.h,"ground"),g.x,g.y,g.w,g.h,24);
      else engine.drawMetal(g.x,g.y,g.w,g.h)
    }
    const decalSurfaces = groundSurfaces.map((g) => {
      const supported = route.visualSupports?.some(v => v.type === "stack-to-ground" && v.id === g.id);
      return supported ? { ...g, decalFaceY: g.y, decalFaceH: Math.max(g.h, GROUND - g.y) } : g;
    });
    drawDockWolfMarks(c, decalSurfaces, bounds);
    for(const z of route.wallJumpZones||[]){
      const x=z.x1,w=z.x2-z.x1,y0=z.yTop,y1=z.yBottom;if(bounds&&!visibleX(bounds,x,w,120))continue;
      c.save();c.strokeStyle="#ffd34dcc";c.lineWidth=4;c.setLineDash([10,8]);
      c.beginPath();c.moveTo(z.x1,y1);c.lineTo(z.x1,y0);c.moveTo(z.x2,y1);c.lineTo(z.x2,y0);c.stroke();c.setLineDash([]);
      c.fillStyle="#ffcf45";for(let yy=y1-18;yy>y0;yy-=34)c.fillRect(x+10,yy,w-20,4);
      c.fillStyle="#102433cc";c.fillRect(x+8,y1+8,w-16,24);c.fillStyle="#fff2a8";c.font="900 13px system-ui";c.fillText("^",x+w/2-4,y1+26);c.restore();
    }
    if(magma)for(const x of (route.voidEdges||[])){c.strokeStyle="#eef1e9";c.lineWidth=4;c.beginPath();c.moveTo(x,GROUND-36);c.lineTo(x,GROUND+8);c.stroke();c.fillStyle="#c8ced2";c.fillText("!",x-4,GROUND-44);}
    if(frozen){const first=Math.max(210,210+Math.floor((bounds.minX-260-210)/480)*480);for(let x=first;x<route.length&&x<=bounds.maxX+260;x+=480){const top=GROUND-92;c.strokeStyle="#203944";c.lineWidth=5;c.beginPath();c.moveTo(x,top);c.lineTo(x,GROUND);c.stroke();c.fillStyle="#ffd27a";c.fillRect(x-13,top-5,26,8);const glow=c.createLinearGradient(x,top,x,top+50);glow.addColorStop(0,"#ffd98a77");glow.addColorStop(1,"#ffd98a00");c.fillStyle=glow;c.beginPath();c.moveTo(x-15,top+3);c.lineTo(x+15,top+3);c.lineTo(x+31,top+50);c.lineTo(x-31,top+50);c.closePath();c.fill();}}
    for (const s of surfaces.filter((v) => v.kind !== "ground"&&(!bounds||visibleX(bounds,v.x,v.w,90)))) {
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
        const suspended=drawableSuspends.has(s.id);
        if(suspended){
          const m=c.getTransform(),topWorld=(m.d?(-28-m.f)/m.d:s.y-260);
          const cx=s.x+s.w/2,beamY=Math.min(s.y-42,topWorld),hookY=s.y-2;
          c.save();
          c.strokeStyle=frozen?"#203944":magma?"#28282d":"#1b2a33";c.lineWidth=8;c.beginPath();c.moveTo(cx-56,beamY);c.lineTo(cx+56,beamY);c.stroke();
          c.strokeStyle=frozen?"#356577":magma?"#4a4644":"#253a45";c.lineWidth=5;c.beginPath();c.moveTo(cx-46,beamY+7);c.lineTo(cx+46,beamY+7);c.stroke();
          const ropeL=s.x+s.w*.25,ropeR=s.x+s.w*.75;
          c.strokeStyle=frozen?"#203944":magma?"#28282d":"#1b2a33";c.lineWidth=4;c.beginPath();
          if(!ropeBlocked(s,ropeL,beamY+2,hookY)){c.moveTo(ropeL,beamY+2);c.lineTo(ropeL,hookY);}
          if(!ropeBlocked(s,ropeR,beamY+2,hookY)){c.moveTo(ropeR,beamY+2);c.lineTo(ropeR,hookY);}
          c.stroke();
          c.fillStyle=frozen?"#1f5269":magma?"#3a3838":"#203846";c.fillRect(cx-53,beamY-10,106,10);
          c.fillStyle=frozen?"#ffd27a":magma?"#c6cbd0":"#f0c544";c.fillRect(cx-46,beamY-15,92,5);
          c.restore();
        }
        c.fillStyle = frozen?"#bdeff7":magma?"#b9b9b4":"#f2c230"; c.fillRect(s.x - 16, s.y + s.h - 7, s.w + 32, 7);
        c.fillStyle = "#17252d"; c.font = "900 10px system-ui"; c.fillText("↓", s.x + s.w / 2 - 4, s.y + s.h + 15);
      }
    }
    drawHermesShoes(c,bounds);
    for(const s of route.slopes||[]){if(s.visible===false)continue;if(bounds&&!visibleX(bounds,Math.min(s.x1,s.x2),Math.abs(s.x2-s.x1),100))continue;c.fillStyle="#30383f";c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.lineTo(s.x2,s.y2+100);c.lineTo(s.x1,s.y1+100);c.closePath();c.fill();c.strokeStyle="#8b98a1";c.lineWidth=3;c.beginPath();c.moveTo(s.x1,s.y1);c.lineTo(s.x2,s.y2);c.stroke()}
    for (const o of route.obstacles)
      if (o.type === "ramp") {
        if(bounds&&!visibleX(bounds,o.x,o.w,120))continue;
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
      } else if (o.type === "worker" && o.offscreenWait) {
        continue;
      } else if (o.type === "worker" && magma) {
        const s=presentationSurface(o.x,96),patrol=patrolMotionOnSurface(s,1.7,36);
        if(!patrol)continue;
        const wx=patrol.x,baseY=s.y;
        if(bounds&&!visibleX(bounds,wx-32,64,120))continue;
        // Aluminized heat suit: hood, dark visor, separated gauntlets and boots.
        if(!drawNpcWorkerSprite(c,wx,baseY,patrol.direction)){
          c.save();c.translate(wx,baseY);c.scale(patrol.direction>0?-1:1,1);
          c.fillStyle="#bdc5cc";c.beginPath();c.moveTo(-17,-65);c.lineTo(-23,-25);c.lineTo(23,-25);c.lineTo(17,-65);c.closePath();c.fill();
          c.fillStyle="#8f9ba7";c.fillRect(-13,-27,10,27);c.fillRect(3,-27,10,27);
          c.fillStyle="#e2e6e8";c.beginPath();c.arc(0,-72,17,0,Math.PI*2);c.fill();
          c.fillStyle="#252d3b";c.fillRect(-12,-81,24,14);c.fillStyle="#a4c0cf";c.fillRect(-10,-79,8,3);
          c.fillStyle="#535d6b";c.fillRect(-23,-48,8,19);c.fillRect(15,-48,8,19);c.restore();
        }
        if(!workerDisabled&&workerClock>1.65){c.fillStyle="#ff4f45";c.font="950 22px system-ui";c.fillText("!",wx-3,baseY-98);}
      } else if (o.type === "worker") {
        const s=presentationSurface(o.x,96),patrol=patrolMotionOnSurface(s,.8,36);
        if(!patrol)continue;
        const wx=patrol.x,baseY=s.y;
        if(bounds&&!visibleX(bounds,wx-32,64,120))continue;
        if(!drawNpcWorkerSprite(c,wx,baseY,patrol.direction)){
          c.save();c.translate(wx,baseY);c.scale(patrol.direction>0?-1:1,1);
          c.fillStyle = frozen?"#17384b":magma?"#b8b9b5":"#243c49"; c.fillRect(-(frozen?18:15), -60, frozen?36:30, 60);
          c.fillStyle = frozen?"#397ba0":magma?"#d4d1c7":"#ff8d28"; c.fillRect(-15,-48,30,20);
          c.fillStyle = "#fff27d"; c.fillRect(-15,-39,30,4);
          c.fillStyle = "#e8b486"; c.beginPath(); c.arc(0,-69,11,0,Math.PI*2); c.fill();
          c.fillStyle = frozen?"#224e68":"#f1bb2c";c.beginPath();c.arc(0,-76,15,Math.PI,0);c.fill();c.fillRect(-15,-77,30,7);c.restore();
        }
        if (!workerDisabled && workerClock > 1.65) { c.fillStyle = "#ff4f45"; c.font = "950 22px system-ui"; c.fillText("!", wx - 3, baseY - 92); }
      }
    if (!debugHideMovingPlatforms) for (const p of movingPlatforms) {
      if(bounds&&!visibleX(bounds,p.x,p.w,150))continue;
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
      if(bounds&&!visibleX(bounds,p.x,p.w,100))continue;
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
      if(bounds&&!visibleX(bounds,d.x-16,d.w+32,120))continue;
      c.save();
      if(frozen){const ice=c.createLinearGradient(d.x,d.currentY,d.x+d.w,d.currentY);ice.addColorStop(0,"#bceefa");ice.addColorStop(.5,"#397c94");ice.addColorStop(1,"#d8f8fc");c.fillStyle=ice;c.beginPath();c.moveTo(d.x-8,d.currentY+d.h);c.lineTo(d.x-3,d.currentY);c.lineTo(d.x+d.w*.34,d.currentY-15);c.lineTo(d.x+d.w*.68,d.currentY-4);c.lineTo(d.x+d.w+8,d.currentY-19);c.lineTo(d.x+d.w+8,d.currentY+d.h);c.closePath();c.fill();c.strokeStyle="#effcff";c.lineWidth=5;c.stroke();}else if(magma){c.fillStyle="#35363a";c.fillRect(d.x-10,d.currentY-15,d.w+20,d.h+15);c.strokeStyle="#a8a49b";c.lineWidth=6;c.strokeRect(d.x-6,d.currentY-10,d.w+12,d.h+8);c.fillStyle="#77736c";for(let y=d.currentY+8;y<d.currentY+d.h;y+=22)c.fillRect(d.x,y,d.w,4);}else{c.fillStyle=d.state==="PREPARING"?"#f2b632":"#324c5b";c.fillRect(d.x-8,d.currentY-12,d.w+16,d.h+12);c.fillStyle="#d7e1e5";for(let y=d.currentY+8;y<d.currentY+d.h;y+=16)c.fillRect(d.x,y,d.w,3);}
      c.strokeStyle="#ffcf45";c.lineWidth=4;c.beginPath();c.moveTo(d.x+d.w/2,d.currentY-42);c.lineTo(d.x+d.w/2,d.currentY-18);c.stroke();
      c.fillStyle=d.state==="OPEN"?"#63f2a5":d.state==="PREPARING"?"#ffd34d":"#ff5b55";c.beginPath();c.arc(d.x+d.w/2,d.currentY-49,9,0,Math.PI*2);c.fill();
      if(d.state==="PREPARING"){c.fillStyle="#ffd34d";c.beginPath();c.moveTo(d.x+18,d.currentY-18);c.lineTo(d.x+38,d.currentY-18);c.lineTo(d.x+28,d.currentY-5);c.fill();}
      c.restore();
    }
    for (const coin of route.coins)
      if (!run?.collectedCoinIds.includes(coin.id)) {
        if(bounds&&!visibleX(bounds,coin.x-16,32,80))continue;
        drawCoin(c, coin);
      }
    for (const b of barrels) {
      if(bounds&&!visibleX(bounds,b.x,28,80))continue;
      c.strokeStyle = frozen?"#dffaff":magma?"#d4d2ca":"#5a321d";c.fillStyle = frozen?"#75bfd1":magma?"#aaa9a3":"#9e6338";c.lineWidth=3;
      if(magma){c.beginPath();c.moveTo(b.x+7,b.y);c.lineTo(b.x+21,b.y);c.lineTo(b.x+28,b.y+9);c.lineTo(b.x+28,b.y+22);c.lineTo(b.x+20,b.y+28);c.lineTo(b.x+7,b.y+28);c.lineTo(b.x,b.y+19);c.lineTo(b.x,b.y+8);c.closePath();c.fill();c.stroke();c.strokeStyle="#505c65";c.strokeRect(b.x+8,b.y+5,12,18);}else if(frozen){c.beginPath();c.moveTo(b.x+4,b.y+27);c.lineTo(b.x,b.y+10);c.lineTo(b.x+8,b.y);c.lineTo(b.x+24,b.y+3);c.lineTo(b.x+28,b.y+20);c.lineTo(b.x+20,b.y+28);c.closePath();c.fill();c.stroke();c.strokeStyle="#eefbff";c.beginPath();c.moveTo(b.x+5,b.y+8);c.lineTo(b.x+22,b.y+20);c.stroke();}else{c.beginPath();c.arc(b.x+14,b.y+14,14,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(b.x+2,b.y+14);c.lineTo(b.x+26,b.y+14);c.stroke();}
    }
    if (campaignChief?.path && campaignChief.entry && !campaignChief.entry.offscreen && (!bounds||visibleX(bounds,campaignChief.entry.x-28,56,120))) {
      const e=campaignChief.entry,x=e.x,top=e.topY,bottom=e.bottomY;
      c.save();c.lineWidth=5;c.strokeStyle=frozen?"#8fd3e6":"#7b5435";c.beginPath();c.moveTo(x-18,top+4);c.lineTo(x-18,bottom);c.moveTo(x+18,top+4);c.lineTo(x+18,bottom);c.stroke();
      c.lineWidth=4;c.strokeStyle=frozen?"#d7f6ff":"#c0915b";for(let y=top+18;y<bottom-6;y+=22){c.beginPath();c.moveTo(x-22,y);c.lineTo(x+22,y);c.stroke()}
      c.fillStyle=frozen?"#6faaba":"#5c3b24";c.fillRect(x-32,top-7,64,9);c.fillStyle=frozen?"#bcefff":"#a06c3c";c.fillRect(x-26,top-11,52,5);c.restore();
    }
    if (campaignChief?.active && campaignChief.entryPhase!=="result") {
      c.save();
      if (chiefAtlasContract) {
        const state=campaignChief.resultAngry?"idle":campaignChief.pose||"run";
        drawChiefAtlas(c,profile.equippedChief||"securityTall",chiefPoseFromState(state),campaignChief.x+16,campaignChief.y+48,campaignChief.facing||1);
      } else if (CHIEF_SPRITE.complete && CHIEF_SPRITE.naturalWidth) {
        const fw=CHIEF_SPRITE.naturalWidth/4,fh=CHIEF_SPRITE.naturalHeight,frame=campaignChief.path&&campaignChief.pose!=="run"?0:Math.floor(gameClock*8)%4;
        c.imageSmoothingEnabled=false;c.drawImage(CHIEF_SPRITE,frame*fw,0,fw,fh,campaignChief.x-8,campaignChief.y-16,48,64);
      } else { c.fillStyle="#111820";c.fillRect(campaignChief.x,campaignChief.y,campaignChief.w,campaignChief.h); }
      if(campaignChief.resultAngry)drawChiefAngerIcon(c,campaignChief.x+16,campaignChief.y-46);
      c.restore();
    }
    const finishDoor=finishDoorPlacement();
      drawFinishDoor(c, finishDoor.x, finishDoor.y);
  }
  // A5b decorative layer: no RNG, collisions, profile or simulation writes.
  function presentationNpcs() {
    const carrierSurface=(targetX=520)=>{
      const s=presentationSurface(targetX,96),patrol=patrolMotionOnSurface(s,.35,42);
      return s&&patrol?{role:"carrier",x:patrol.x,y:s.y-6,direction:patrol.direction,added:false,grounded:true,surfaceId:s.id}:null;
    };
    const roles=[carrierSurface()].filter(Boolean);
    for(const o of route.obstacles){
      if(o.type==="worker"&&!o.offscreenWait){const s=presentationSurface(o.x,96),patrol=patrolMotionOnSurface(s,1.1,38);if(s&&patrol)roles.push({role:"worker",x:patrol.x,y:s.y,direction:patrol.direction,added:false,grounded:true,surfaceId:s.id});}
      if(o.type==="crane"){const s=presentationSurface(o.x-90,96),x=patrolXOnSurface(s,2.2,34);roles.push(s&&Number.isFinite(x)?{role:"operator",x,y:s.y-6,added:false,grounded:true,surfaceId:s.id}:{role:"operator",x:o.x-90,y:GROUND-145,added:true});}
    }
    if(!result&&campaignChief?.active)roles.push({role:"chief",x:campaignChief.x+14,y:campaignChief.y-25,added:false});
    return roles;
  }
  let npcAtlasContract=null;
  const npcAtlasImages=new Map();
  const npcAtlasReady=fetch("sprites/a5/npc-contract.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("npc contract");return r.json();}).then(async contract=>{
    await Promise.all(contract.assets.map(asset=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(image.naturalWidth!==asset.size[0]||image.naturalHeight!==asset.size[1])return reject(new Error("npc dimensions"));npcAtlasImages.set(asset.kind,image);resolve();};image.onerror=()=>reject(new Error("npc unavailable"));image.src=asset.path+"?v="+asset.cacheVersion;})));
    npcAtlasContract=contract;return true;
  }).catch(()=>false);
  function drawNpcWorkerSprite(c,x,feet,direction=-1){
    const image=npcAtlasImages.get("worker");
    if(workerDisabled){c.save();c.translate(x,feet-14);c.rotate(-Math.PI/2);if(npcAtlasContract&&image)c.drawImage(image,0,0,128,128,-51,-90,103,103);else{c.fillStyle="#243c49";c.fillRect(-15,-60,30,60);c.fillStyle="#ff8d28";c.fillRect(-15,-48,30,20);}c.restore();return true;}
    if(!npcAtlasContract||!image)return false;
    const thrown=workerClock<=.35&&barrels.length>0,frame=thrown?2:workerClock>1.65?1:0;
    c.save();c.translate(x,feet);c.scale(direction>0?-1:1,1);c.drawImage(image,frame*128,0,128,128,-51,-103,103,103);c.restore();return true;
  }
  function patrolMotionOnSurface(surface, seed=0, speed=42) {
    if(!surface)return null;
    const left=surface.x+34,right=surface.x+surface.w-34;
    if(right<=left)return {x:surface.x+surface.w/2,direction:1};
    const span=right-left,period=Math.max(1,span/speed*2),phase=(gameClock+seed)%period,forward=phase<period/2,u=forward?phase/(period/2):1-(phase-period/2)/(period/2);
    return {x:left+span*u,direction:forward?1:-1};
  }
  function patrolXOnSurface(surface, seed=0, speed=42) {
    return patrolMotionOnSurface(surface,seed,speed)?.x??null;
  }
  function presentationSurface(targetX=520,minW=96) {
    const solids=routeSurfaces(route).filter(s=>(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform")&&s.w>=minW);
    const covered=solids.filter(s=>targetX>=s.x+24&&targetX<=s.x+s.w-24);
    return (covered.length?covered:solids).sort((a,b)=>Math.abs((a.x+a.w/2)-targetX)-Math.abs((b.x+b.w/2)-targetX))[0]||null;
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
      } else if(n.grounded&&n.role==="carrier"){
        const npcImage=npcAtlasImages.get("decor"),frame=(Math.floor(gameClock*8)%2)+(surprised?1:0);
        c.scale(n.direction>0?-1:1,1);
        if(npcAtlasContract&&npcImage)c.drawImage(npcImage,frame*64,0,64,64,-32,-56,64,64);
        else{
          c.fillStyle=suit;c.fillRect(-9,-32,18,24);c.fillRect(-9,-9,6,9);c.fillRect(3,-9,6,9);
          c.fillStyle=trim;c.fillRect(-10,-46,20,8);c.fillRect(-7,-38,14,9);c.fillRect(-8,-23,16,4);
          c.fillStyle="#a49a80";c.fillRect(6,-28,21,21);c.strokeStyle=trim;c.strokeRect(6,-28,21,21);
        }
      } else if(n.role==="worker"){
        if(!drawNpcWorkerSprite(c,0,0,n.direction)){
          const stride=Math.sin(gameClock*10)*4;
          c.fillStyle=suit;c.fillRect(-10,-48,20,38);c.fillRect(-10+stride,-10,7,10);c.fillRect(3-stride,-10,7,10);
          c.fillStyle=trim;c.fillRect(-12,-56,24,9);c.fillRect(-8,-40,16,8);
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
  let chiefAtlasContract = null;
  const chiefAtlasImages = new Map();
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
  const chiefAtlasReady = fetch("sprites/chiefs/chief-contract.json", {cache:"no-cache"})
    .then(r=>{if(!r.ok)throw new Error("chief contract");return r.json();})
    .then(async contract=>{
      await Promise.all(contract.assets.map(asset=>new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>{if(image.naturalWidth!==640||image.naturalHeight!==720)return reject(new Error("chief dimensions"));chiefAtlasImages.set(asset.id,image);resolve();};
        image.onerror=()=>reject(new Error("chief unavailable"));
        image.src=asset.path+"?v="+asset.cacheVersion;
      })));
      chiefAtlasContract=contract;return true;
    }).catch(()=>false);
  function runnerAtlasPose(state) {
    const pk=state.state;
    if(frontFlip.active){const e=frontFlip.elapsed;return {motion:"frontFlip",frame:e<.16?Math.min(1,Math.floor(e/.08)):e<.62?2+Math.min(3,Math.floor((e-.16)/.115)):6+Math.min(1,Math.floor((e-.62)/.09))};}
    if(pk==="catch"||pk==="climb")return {motion:"wallRun",frame:Math.floor(gameClock*(runnerAtlasContract?.motions.wallRun.fps||8.8888888889))%8};
    if(["vault","slide","crouch","wallRun","roll","dive"].includes(pk)){const motion=pk==="crouch"?"slide":pk==="dive"?"vault":pk,duration=pk==="dive"?.46:state.duration;return {motion,frame:pk==="crouch"?7:Math.min(7,Math.floor(Math.max(0,1-state.timer/duration)*8+1e-9))};}
    const motion=pk==="stun"?"idle":!player.onGround?"jump":Math.abs(player.vx)>18?"run":"idle";
    // Existing simulation clock and velocity; render does not advance a clock.
    const frame=motion==="jump"?Math.max(0,Math.min(7,Math.floor((player.vy+560)/140))):Math.floor(gameClock*(motion==="run"?16:8))%8;
    return {motion,frame};
  }
  function drawCharacterChoicePortraits(now=performance.now()) {
    document.querySelectorAll(".characterChoice").forEach((el, i) => {
      if (el.hidden) return;
      const q = el.querySelector("canvas.portrait"), c = q?.getContext("2d");
      if (!c) return;
      const runner = el.dataset.character || (i ? "female" : "male");
      const outfit = profile.equippedOutfitByRunner[runner] || "default";
      const frame = Math.floor(now / 160) % 8;
      c.clearRect(0, 0, q.width, q.height);
      c.save();
      c.translate(q.width / 2, q.height - 18);
      c.scale(3, 3);
      drawRunnerAtlas(c, runner, outfit, { motion: "idle", frame }, 0, 0, 1);
      c.restore();
    });
  }
  function drawRunnerAtlas(c, runner, outfit, pose, x, feet, facing=1, omit=null) {
    c.save();c.translate(x,feet);c.scale(facing,1);c.imageSmoothingEnabled=false;
    if(!runnerAtlasContract){c.fillStyle=runner==="female"?"#d5e3de":"#c1d2df";c.fillRect(-12,-44,24,44);c.restore();return;}
    const row=runnerAtlasContract.motions[pose.motion].row;
    const fullPath=`sprites/a5/${runner}-${outfit}-full.png`;
    const full=runnerAtlasImages.get(fullPath);
    if(full){c.drawImage(full,pose.frame*64,row*64,64,64,-32,-56,64,64);c.restore();return;}
    if(!runnerAtlasContract.layerOrder?.every(layer=>runnerAtlasImages.get(`sprites/a5/${runner}-${layer==="body"?"base":outfit}-${layer}.png`))){c.fillStyle=runner==="female"?"#d5e3de":"#c1d2df";c.fillRect(-12,-44,24,44);c.restore();return;}
    for(const layer of runnerAtlasContract.layerOrder){if(layer===omit)continue;
      const path=`sprites/a5/${runner}-${layer==="body"?"base":outfit}-${layer}.png`;
      c.drawImage(runnerAtlasImages.get(path),pose.frame*64,row*64,64,64,-32,-56,64,64);
    }
    c.restore();
  }
  function drawChiefAngerIcon(c,x,y){
    c.save();c.textAlign="center";c.textBaseline="middle";c.font="32px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui";c.shadowColor="#000";c.shadowBlur=4;c.fillText("😠",x,y);c.restore();
  }
  function chiefPoseFromState(state) {
    const grab=chiefGrabPose();
    if(grab)return grab;
    const motion=state==="catch"||state==="climb"?"wallRun":state==="roll"?"roll":state==="jump"||state==="dive"?"jump":state==="normal"||state==="run"?"run":"idle";
    return {motion,frame:Math.floor(gameClock*((motion==="run")?16:8))%8};
  }
  function chiefGrabPose(playerCatchable=null) {
    const chief=campaignChief;
    if(!chief?.active||chief.entryPhase==="result")return null;
    if(chief.caughtT>0){
      const elapsed=Math.max(0,CHIEF_CATCH_HOLD_S-chief.caughtT);
      return {motion:"grab",frame:Math.min(7,3+Math.floor(elapsed/(CHIEF_CATCH_HOLD_S/5)))};
    }
    const catchable=playerCatchable??(player.onGround&&engine.parkour.state==="normal"&&!diveRun&&!wallJumpRun&&Math.abs(player.vx)<70);
    const gap=player.x-(chief.x+chief.w),vertical=Math.abs(chief.y-player.y)<=player.h+4;
    if(!catchable||chief.entryPhase!=="running"||!vertical||gap>CHIEF_GRAB_START_GAP_PX||gap<4)return null;
    return {motion:"grab",frame:Math.min(2,Math.max(0,Math.floor((CHIEF_GRAB_START_GAP_PX-gap)/8)))};
  }
  function drawChiefAtlas(c, id, pose, x, feet, facing=1) {
    c.save();c.translate(x,feet);c.scale(facing,1);c.imageSmoothingEnabled=false;
    const image=chiefAtlasImages.get(id||"securityTall");
    if(chiefAtlasContract&&image){const row=chiefAtlasContract.motions[pose.motion]?.row??0;c.drawImage(image,pose.frame*80,row*80,80,80,-40,-74,80,80);}
    else {c.fillStyle="#101820";c.fillRect(-15,-58,30,58);c.fillStyle="#e5d79e";c.fillRect(10,-43,8,5);}
    c.restore();
  }
  function drawRunnerIntegrated(c,state) {
    if(debugHidePlayer)return;
    const runner=profile.runnerId||"male",outfit=RUNNERS[runner]?.outfitLocked?"default":profile.equippedOutfitByRunner[runner]||"default";
    const poseState=diveRun?{...state,state:"dive",timer:Math.max(0,diveRun.duration-diveRun.elapsed),duration:diveRun.duration}:wallJumpRun?{...state,state:"wallRun",timer:Math.max(0,wallJumpRun.duration-wallJumpRun.elapsed),duration:wallJumpRun.duration}:state;
    c.save();
    c.globalAlpha *= finishGate.playerAlpha;
    const camX=typeof engine?.cameraX==="function"?engine.cameraX():0;
    drawRunnerAtlas(c,runner,outfit,runnerAtlasPose(poseState),player.x+player.w/2,player.y+player.h,player.facing);
    c.restore();
  }
  function drawRunnerLayerIntegrated(c) { ctx=c; }
  function drawResultChief(c){
    if(!campaignChief?.active||campaignChief.entryPhase!=="result"||shopOpen)return;
    const camX=typeof engine?.cameraX==="function"?engine.cameraX():0;
    c.save();c.translate(-camX,cameraWorldY);
    drawChiefAtlas(c,profile.equippedChief||"securityTall",{motion:"idle",frame:0},campaignChief.x+16,campaignChief.y+48,campaignChief.facing||1);
    drawChiefAngerIcon(c,campaignChief.x+16,campaignChief.y-46);c.restore();
  }
  function cameraTargetIntegrated(info={}) {
    const fallback=Number.isFinite(info.fallback)?info.fallback:Math.max(0,Math.min(route.length-W,player.x-W*.3));
    if(result)return fallback;
    if(innerHeight>=innerWidth)return Math.max(0,Math.min(route.length-(info.W||W),player.x-(info.W||W)*.25+Math.max(0,player.vx)/6.5));
    return Math.max(0,Math.min(route.length-W,player.x-W*.3));
  }
  function drawOverlayIntegrated(c, w, h) {
    ctx = c;
    renderFrameCount++;
    document.body.dataset.playerX = String(Math.round(player.x));
    c.fillStyle = "#fff";
    c.font = "900 14px system-ui";
    c.fillText(`${t("route")} ${routeId} · ${routeDisplayName(route)}`, 29, 36);
    c.fillStyle = "#ffd43d";
    c.fillText(`${t("run")} ◉ ${run?.runCoins || 0}/${route.coins.length}`, 29, 57);
    c.fillStyle = "#7cecc0";
    c.fillText(`${t("wallet")} ◉ ${profile.walletBalance}`, 180, 57);
    if (finishAdvance&&result) {
      const portrait=innerHeight>=innerWidth,bannerY=portrait?132:30,textY=portrait?164:62;
      c.fillStyle = "#06111bb8";
      c.fillRect(w/2-178, bannerY, 356, 52);
      c.fillStyle = "#7cecc0";
      c.textAlign = "center";
      c.font = "950 19px system-ui";
      c.fillText(`${finishAdvance.routeId} ${t("complete")} +${finishAdvance.amount}`, w / 2, textY);
      c.textAlign = "left";
    } else if (result) {
      c.fillStyle = "#06111bb8";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#7cecc0";
      c.textAlign = "center";
      c.font = "950 30px system-ui";
      c.fillText(`${routeId} ${t("complete")} +${result.amount}`, w / 2, innerHeight>=innerWidth?164:62);
      c.textAlign = "left";
    }
    drawResultChief(c);
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
        campaignFrozen() ||
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
      cameraTarget: cameraTargetIntegrated,
      cameraMax: () => Math.max(0,route.finishX-W*.3),
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
        disableChief: ()=>{campaignChief=null},
        placePlayerAtChiefTime: (t,dy=0)=>{if(!campaignChief?.path)return false;const entry=primeChiefLadder(campaignChief),q=chiefSample(campaignChief.path,t);engine.reset(q.x,q.y+dy);if(t<entry.readyTime){parkChiefAtLadder(campaignChief);setChiefPlayerTime(campaignChief,t);return true}campaignChief.active=true;campaignChief.entryPhase="running";campaignChief.climbElapsed=entry?.duration||0;campaignChief.playerT=t;campaignChief.playerIndex=Math.max(0,campaignChief.path.samples.findIndex(v=>v[0]>=t));campaignChief.chiefT=Math.max(entry?.time??0,t-campaignChief.delay);return true},
        placePlayerAtChiefLadderStart: (dy=0)=>{if(!campaignChief?.path)return false;const entry=primeChiefLadder(campaignChief),t=entry.climbStartTime+.02,x=entry.x+8;player.x=x;player.y=routeGroundYAt(x)-player.h+dy;player.vx=player.vy=0;player.onGround=true;campaignChief.active=false;campaignChief.entryPhase="waiting";campaignChief.climbElapsed=0;campaignChief.playerT=t;campaignChief.playerIndex=Math.max(0,campaignChief.path.samples.findIndex(v=>v[0]>=t));campaignChief.chiefT=entry.time-campaignChief.delay;return debugState()},
        forceChiefNear: (dx=-168)=>{if(!campaignChief)return false;campaignChief.active=true;campaignChief.entryPhase="running";campaignChief.x=player.x+dx;campaignChief.y=routeGroundYAt(campaignChief.x+16)-48;campaignChief.pose=result?"idle":"run";campaignChief.resultAngry=!!result||!!campaignChief.resultAngry;campaignChief.facing=1;return debugState()},
        routeDefinition: (id)=>clone(ROUTES[id]),
        finishDoorPlacement: (id)=>{const old=route;if(id&&ROUTES[id])route=ROUTES[id];const p=finishDoorPlacement(route);route=old;return p;},
        auditSuspendCounts,
        chiefRouteHash: (id)=>chiefRouteHash(ROUTES[id]),
        chiefPathStatus: (id, deltaX=0)=>{const r=clone(ROUTES[id]);if(deltaX&&r.groundSegments?.length)r.groundSegments[0].x+=deltaX;return {stored:window.TMB_CHIEF_PATHS?.[id]?.routeHash||null,current:chiefRouteHash(r),valid:window.TMB_CHIEF_PATHS?.[id]?.routeHash===chiefRouteHash(r)}},
        migrateV36: (v, p) => migrateV36(v, p),
        startRoute: (id, fresh = true, fullD06 = false) => startRoute(id, fresh, fullD06),
        unlockAllRoutes: () => { for(const id of Object.keys(ROUTES)) profile.progressByRoute[id]={...(profile.progressByRoute[id]||{}),completed:true,stars:profile.progressByRoute[id]?.stars||1}; return debugState(); },
        placePlayer: (x,y=GROUND-player.h) => { player.x=x; player.y=y; player.vx=player.vy=0; player.onGround=false; },
        setPlayerVisible: (visible) => { debugHidePlayer = !visible; },
        setMovingPlatformsVisible: (visible) => { debugHideMovingPlatforms = !visible; },
        setSuspendGapFilter: (enabled) => { debugSuspendGapFilter = enabled !== false; },
        collectCoin: (id) => {
          const coin = route.coins.find((c) => c.id === id);
          if (coin && !run.collectedCoinIds.includes(id)) {
            run.collectedCoinIds.push(id);
            run.runCoins++;
          }
          return debugState();
        },
        finish: () => bankRun(),
        finishResult: () => { startFinishGateEntry(); finishGate.t = finishGate.closeS + finishGate.holdS; finishGateEntry(); return debugState(); },
        claimRewardedResult,
        syncRewardedButton,
        retry,
        openShop,
        closeShop,
        purchase: purchaseOrWear,
        purchaseWorld: purchaseOrSelectWorld,
        purchaseRunner: purchaseOrSelectRunner,
        purchaseChief: purchaseOrSelectChief,
        renderThemeFixture: (worldId,id="D01") => { if(!WORLD_REGISTRY[worldId]||!ROUTES[id])return false;profile.selectedWorldId=/^A0/.test(id)?"aftermath":"dock31";pendingWorldId=null;const started=startRoute(id);profile.selectedWorldId=worldId;return started; },
        renderWorldOnRoute: (worldId,id="D01") => { if(!WORLD_REGISTRY[worldId])return false; profile.selectedWorldId=worldId;pendingWorldId=null;return startRoute(id); },
        setShopTab: (v)=>{shopTab=["worlds","characters","chiefs","outfits"].includes(v)?v:"outfits";renderShop();},
        openShop: (tab="outfits")=>{shopTab=["worlds","characters","chiefs","outfits"].includes(tab)?tab:"outfits";openShop();return debugState();},
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
      const available=["aftermath","magma","frozen"].includes(profile.selectedWorldId)?[...WORLD_REGISTRY[profile.selectedWorldId].routes].reverse():[...WORLD_REGISTRY.dock31.routes].reverse();
      const resumeRoute = available.find(id => profile.pendingRunsByRoute[id]&&routeUnlocked(id)) || firstRouteForWorld();
      startRoute(resumeRoute, false, resumeRoute === "D06");
    }
    openCharacterSelect();
  }
  if (document.body.dataset.engineReady === "true") init();
  else addEventListener("tmb-engine-ready", init, { once: true });
})();
