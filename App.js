import { Component, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { ErrorCode, getAvailablePurchases, restorePurchases as restoreIapPurchases, useIAP } from "expo-iap";
import * as StoreReview from "expo-store-review";
import {
  Animated,
  Alert,
  Easing,
  FlatList,
  PanResponder,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { makeLevels, key } from "./src/levels";

const ICONS = {
  undo: require("./assets/icon-undo.png"),
  erase: require("./assets/icon-erase.png"),
  restart: require("./assets/icon-restart.png"),
  hint: require("./assets/ui-a-realistic/icon-hint.png"),
  levels: require("./assets/ui-a-realistic/icon-levels.png"),
  home: require("./assets/ui-a-realistic/icon-home.png"),
  shop: require("./assets/ui-a-realistic/icon-shop.png"),
  settings: require("./assets/ui-a-realistic/icon-settings.png"),
  layerCoin: require("./assets/ui-a-realistic/coin-layer.png"),
  hintCoin: require("./assets/ui-a-realistic/coin-hint.png"),
  rewardStar: require("./assets/reward-star-c.png"),
  rewardStarEmpty: require("./assets/reward-star-empty.png"),
  reward2x: require("./assets/ui-a-realistic/reward-double-button.png"),
  rewardHeaderBadge: require("./assets/ui-a-realistic/reward-header-badge.png"),
  rewardDoubleButton: require("./assets/ui-a-realistic/reward-double-bg.png"),
  rewardContinueButton: require("./assets/ui-a-realistic/reward-continue-button.png"),
  hintUseButton: require("./assets/ui-a-realistic/button-hint.png"),
  rewardCompleteReference: require("./assets/reward-complete-c-reference.png"),
  gorsenGames: require("./assets/gorsen-games-logo.png")
};

const SFX = {
  tap: require("./assets/sfx-tap.wav"),
  select: require("./assets/sfx-select.wav"),
  success: require("./assets/sfx-success.wav"),
  advance: require("./assets/sfx-advance.wav"),
  music: require("./assets/music-loop.wav")
};

const GAP = 7;
const RADIUS = 8;
const INTRO_GRID_SIZE = 3;
const INTRO_CELL = 68;
const INTRO_GAP = 8;
const INTRO_BOARD_SIZE = INTRO_CELL * INTRO_GRID_SIZE + INTRO_GAP * (INTRO_GRID_SIZE - 1);
const DEFAULT_THEME = {
  name: "classic",
  background: "#f6f2ea",
  title: "#20242a",
  muted: "#68717c",
  cell: "#ffffff",
  cellBorder: "rgba(32,36,42,0.08)",
  number: "#20242a",
  filledNumber: "#18202a",
  button: "#243447",
  buttonDark: "#1b2635",
  buttonText: "#ffffff",
  win: "#2b8a3e",
  statusBar: "dark-content",
  radius: 8,
  regionPalette: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#5c7cfa", "#95d5b2", "#f4a261"]
};

const FIRST_FIVE_THEMES = [
  {
    ...DEFAULT_THEME,
    name: "fresh",
    background: "#f7f3e8",
    title: "#19212b",
    muted: "#65707d",
    cell: "#fffaf0",
    button: "#203142",
    buttonDark: "#162333",
    regionPalette: ["#ffb703", "#2ec4b6", "#fb6f92", "#8ecae6", "#90be6d", "#f9844a"]
  },
  {
    ...DEFAULT_THEME,
    name: "night",
    background: "#101820",
    title: "#f8fafc",
    muted: "#a8b3c2",
    cell: "#1b2836",
    cellBorder: "rgba(255,255,255,0.08)",
    number: "#f8fafc",
    filledNumber: "#0f1720",
    button: "#f4c430",
    buttonDark: "#20c997",
    buttonText: "#101820",
    win: "#9be564",
    statusBar: "light-content",
    radius: 6,
    regionPalette: ["#f4c430", "#20c997", "#4dabf7", "#ff6b6b", "#cc5de8", "#51cf66"]
  },
  {
    ...DEFAULT_THEME,
    name: "soft",
    background: "#eef8f3",
    title: "#183b35",
    muted: "#58736b",
    cell: "#ffffff",
    cellBorder: "rgba(24,59,53,0.1)",
    number: "#183b35",
    filledNumber: "#12302b",
    button: "#0f766e",
    buttonDark: "#115e59",
    win: "#15803d",
    radius: 8,
    regionPalette: ["#86efac", "#67e8f9", "#fde68a", "#fca5a5", "#c4b5fd", "#93c5fd"]
  },
  {
    ...DEFAULT_THEME,
    name: "pop",
    background: "#fff1f5",
    title: "#33111f",
    muted: "#8a4f67",
    cell: "#fff7fb",
    cellBorder: "rgba(51,17,31,0.09)",
    number: "#33111f",
    filledNumber: "#2b0f1b",
    button: "#db2777",
    buttonDark: "#9d174d",
    win: "#16a34a",
    radius: 10,
    regionPalette: ["#f9a8d4", "#fdba74", "#bef264", "#7dd3fc", "#c084fc", "#f87171"]
  },
  {
    ...DEFAULT_THEME,
    name: "mono",
    background: "#e9edf2",
    title: "#111827",
    muted: "#4b5563",
    cell: "#f8fafc",
    cellBorder: "rgba(17,24,39,0.12)",
    number: "#111827",
    filledNumber: "#0f172a",
    button: "#111827",
    buttonDark: "#374151",
    win: "#047857",
    radius: 4,
    regionPalette: ["#94a3b8", "#38bdf8", "#fb7185", "#a3e635", "#facc15", "#818cf8"]
  },
  {
    id: "layer-small",
    type: "layer",
    title: "Katman Küçük",
    subtitle: "Sıradaki katmana destek",
    hintCoins: 0,
    layerCoins: 20,
    price: "29,99 TL"
  },
  {
    id: "layer-medium",
    type: "layer",
    title: "Katman Orta",
    subtitle: "Birkaç katman için denge",
    hintCoins: 0,
    layerCoins: 70,
    price: "79,99 TL",
    featured: true
  },
  {
    id: "layer-large",
    type: "layer",
    title: "Katman Büyük",
    subtitle: "Büyük katman kilitleri için",
    hintCoins: 0,
    layerCoins: 180,
    price: "149,99 TL"
  }
];

const LEVEL_THEME_WORLDS = [
  FIRST_FIVE_THEMES[0],
  FIRST_FIVE_THEMES[2],
  FIRST_FIVE_THEMES[3],
  FIRST_FIVE_THEMES[4],
  FIRST_FIVE_THEMES[1],
  { ...DEFAULT_THEME, background: "#f0f9ff", title: "#0c4a6e", muted: "#386b86", button: "#0369a1", buttonDark: "#075985", regionPalette: ["#7dd3fc", "#38bdf8", "#0ea5e9", "#a7f3d0", "#fde68a", "#fda4af"] },
  { ...DEFAULT_THEME, background: "#f7fee7", title: "#365314", muted: "#647d2c", button: "#4d7c0f", buttonDark: "#3f6212", regionPalette: ["#bef264", "#86efac", "#fde047", "#fdba74", "#93c5fd", "#c4b5fd"] },
  { ...DEFAULT_THEME, background: "#fff7ed", title: "#7c2d12", muted: "#9a5a36", button: "#c2410c", buttonDark: "#9a3412", regionPalette: ["#fb923c", "#facc15", "#f87171", "#34d399", "#60a5fa", "#a78bfa"] },
  { ...DEFAULT_THEME, background: "#f5f3ff", title: "#3b0764", muted: "#6b4b83", button: "#7e22ce", buttonDark: "#581c87", regionPalette: ["#c084fc", "#f0abfc", "#818cf8", "#67e8f9", "#bef264", "#fca5a5"] },
  { ...DEFAULT_THEME, background: "#111827", title: "#f9fafb", muted: "#cbd5e1", cell: "#1f2937", cellBorder: "rgba(255,255,255,0.1)", number: "#f9fafb", button: "#e5e7eb", buttonDark: "#94a3b8", buttonText: "#111827", statusBar: "light-content", regionPalette: ["#f97316", "#22c55e", "#06b6d4", "#eab308", "#ec4899", "#8b5cf6"] }
];

const STARTER_PACKAGE = "Starter";
const LEGACY_STARTER_PACKAGES = new Set(["3x3", "4x4", "5x5", "6x6"]);
const LEGACY_STARTER_PACKAGE_STARTS = {
  "3x3": 0,
  "4x4": 2,
  "5x5": 5,
  "6x6": 20
};
const PACKAGE_FILTERS = [STARTER_PACKAGE, "7x7", "8x8", "9x9", "10x10", "11x11", "12x11", "13x11", "14x11", "15x11"];
const PACKAGE_STARTS = {
  [STARTER_PACKAGE]: 0,
  "7x7": 40,
  "8x8": 90,
  "9x9": 240,
  "10x10": 390,
  "11x11": 540,
  "12x11": 690,
  "13x11": 840,
  "14x11": 990,
  "15x11": 1140
};
const PACKAGE_ENDS = {
  [STARTER_PACKAGE]: 39,
  "7x7": 89,
  "8x8": 239,
  "9x9": 389,
  "10x10": 539,
  "11x11": 689,
  "12x11": 839,
  "13x11": 989,
  "14x11": 1139,
  "15x11": 1289
};
const LAYER_UNLOCK_COSTS = {
  [STARTER_PACKAGE]: 0,
  "7x7": 40,
  "8x8": 50,
  "9x9": 70,
  "10x10": 70,
  "11x11": 70,
  "12x11": 70,
  "13x11": 70,
  "14x11": 70,
  "15x11": 70
};
const SAVE_SCHEMA_VERSION = 12;
const LEGACY_PACKAGE_RANGES_SCHEMA_11 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 19 },
  { name: "6x6", start: 20, end: 39 },
  { name: "7x7", start: 40, end: 89 },
  { name: "8x8", start: 90, end: 239 },
  { name: "9x9", start: 240, end: 389 },
  { name: "10x10", start: 390, end: 539 },
  { name: "11x11", start: 540, end: 689 },
  { name: "11x12", start: 690, end: 839 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_10 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 19 },
  { name: "6x6", start: 20, end: 39 },
  { name: "7x7", start: 40, end: 89 },
  { name: "8x8", start: 90, end: 239 },
  { name: "9x9", start: 240, end: 389 },
  { name: "10x10", start: 390, end: 539 },
  { name: "11x11", start: 540, end: 689 },
  { name: "11x12", start: 690, end: 839 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_9 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 19 },
  { name: "6x6", start: 20, end: 39 },
  { name: "7x7", start: 40, end: 189 },
  { name: "8x8", start: 190, end: 339 },
  { name: "9x9", start: 340, end: 489 },
  { name: "10x10", start: 490, end: 639 },
  { name: "11x11", start: 640, end: 789 },
  { name: "11x12", start: 790, end: 939 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_8 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 19 },
  { name: "6x6", start: 20, end: 64 },
  { name: "7x7", start: 65, end: 214 },
  { name: "8x8", start: 215, end: 364 },
  { name: "9x9", start: 365, end: 514 },
  { name: "10x10", start: 515, end: 664 },
  { name: "11x11", start: 665, end: 814 },
  { name: "11x12", start: 815, end: 964 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_7 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 29 },
  { name: "6x6", start: 30, end: 74 },
  { name: "7x7", start: 75, end: 224 },
  { name: "8x8", start: 225, end: 374 },
  { name: "9x9", start: 375, end: 524 },
  { name: "10x10", start: 525, end: 674 },
  { name: "11x11", start: 675, end: 824 },
  { name: "11x12", start: 825, end: 974 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_6 = [
  { name: "3x3", start: 0, end: 1 },
  { name: "4x4", start: 2, end: 4 },
  { name: "5x5", start: 5, end: 39 },
  { name: "6x6", start: 40, end: 189 },
  { name: "7x7", start: 190, end: 339 },
  { name: "8x8", start: 340, end: 489 },
  { name: "9x9", start: 490, end: 639 },
  { name: "10x10", start: 640, end: 789 },
  { name: "11x11", start: 790, end: 939 },
  { name: "11x12", start: 940, end: 1089 }
];
const LEGACY_PACKAGE_RANGES_SCHEMA_5 = [
  { name: "3x3", start: 0, end: 9 },
  { name: "4x4", start: 10, end: 19 },
  { name: "5x5", start: 20, end: 99 },
  { name: "6x6", start: 100, end: 249 },
  { name: "7x7", start: 250, end: 399 },
  { name: "8x8", start: 400, end: 529 },
  { name: "9x9", start: 530, end: 639 },
  { name: "10x10", start: 640, end: 729 },
  { name: "11x10", start: 730, end: 879 },
  { name: "12x10", start: 880, end: 1049 }
];
const LEGACY_PACKAGE_NAME_MAP = {
  "11x10": "11x11",
  "12x10": "12x11",
  "11x12": "12x11"
};
const HINT_USE_COST = 10;
const NEXT_LEVEL_COST = 8;
const LEVEL_HINT_REWARD = 1;
const LEVEL_LAYER_REWARD = 1;
const STAR_PERFECT_EXTRA_MOVES = 0;
const STAR_GOOD_EXTRA_RATIO = 0.6;
const INTERSTITIAL_EVERY_COMPLETIONS = 3;
const FIRST_INTERSTITIAL_LEVEL = 12;
const DELAY_CONTINUE_EVERY_COMPLETIONS = 3;
const MAP_COLUMNS = 3;
const MAP_CARD_HEIGHT = 104;
const MAP_ROW_GAP = 10;
const MAP_ROW_HEIGHT = MAP_CARD_HEIGHT + MAP_ROW_GAP;
const ADMOB_ANDROID_APP_ID = "ca-app-pub-2671380652899301~3296118842";
const ADMOB_IOS_APP_ID = "ca-app-pub-2671380652899301~5302862327";
const ANDROID_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-2671380652899301/3084485993";
const IOS_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-2671380652899301/4324822572";
const ANDROID_REWARDED_AD_UNIT_ID = "ca-app-pub-2671380652899301/9266750967";
const IOS_REWARDED_AD_UNIT_ID = "ca-app-pub-2671380652899301/7737453972";
const INTERSTITIAL_AD_UNIT_ID = Platform.OS === "ios" ? IOS_INTERSTITIAL_AD_UNIT_ID : ANDROID_INTERSTITIAL_AD_UNIT_ID;
const REWARDED_AD_UNIT_ID = Platform.OS === "ios" ? IOS_REWARDED_AD_UNIT_ID : ANDROID_REWARDED_AD_UNIT_ID;
const IOS_ADS_ENABLED = Boolean(ADMOB_IOS_APP_ID);

function loadAdsModule() {
  if (Platform.OS === "ios" && !IOS_ADS_ENABLED) return null;
  const hasGoogleMobileAdsModule =
    NativeModules.RNGoogleMobileAdsModule ||
    (() => {
      try {
        return global.__turboModuleProxy?.("RNGoogleMobileAdsModule");
      } catch {
        return null;
      }
    })();
  if (!hasGoogleMobileAdsModule) return null;
  try {
    const ads = require("react-native-google-mobile-ads");
    if (!ads?.default || !ads?.InterstitialAd || !ads?.RewardedAd) return null;
    return ads;
  } catch {
    return null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compareVersion(left, right) {
  const leftParts = String(left || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

async function fetchRemoteUpdateConfig() {
  if (!REMOTE_UPDATE_CONFIG_URL) return null;
  const response = await fetch(`${REMOTE_UPDATE_CONFIG_URL}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`Update config failed: ${response.status}`);
  return response.json();
}

const INITIAL_HINT_COINS = 0;
const INITIAL_FREE_HINTS = 3;
const INITIAL_LAYER_COINS = 0;
const REMOVE_ADS_PRODUCT_ID = "puzzlearea_remove_ads";
const SHOP_PACKS = [
  {
    id: "hint-small",
    productId: "puzzlearea_hint_small",
    type: "hint",
    title: "İpucu Küçük",
    subtitle: "Birkaç zor bölüm için",
    hintCoins: 40,
    layerCoins: 0,
    price: "₺29,99"
  },
  {
    id: "hint-medium",
    productId: "puzzlearea_hint_medium",
    type: "hint",
    title: "İpucu Orta",
    subtitle: "Daha rahat deneme için",
    hintCoins: 120,
    layerCoins: 0,
    price: "₺69,99",
    featured: true
  },
  {
    id: "hint-large",
    productId: "puzzlearea_hint_large",
    type: "hint",
    title: "İpucu Büyük",
    subtitle: "Uzun oyun akışı için",
    hintCoins: 300,
    layerCoins: 0,
    price: "₺149,99"
  }
];
const SHOP_ITEMS = [
  {
    id: "hint-small",
    productId: "puzzlearea_hint_small",
    type: "hint",
    title: "İpucu Küçük",
    subtitle: "Sadece ipucu parası",
    hintCoins: 40,
    layerCoins: 0,
    price: "19,99 TL"
  },
  {
    id: "hint-medium",
    productId: "puzzlearea_hint_medium",
    type: "hint",
    title: "İpucu Orta",
    subtitle: "Sadece ipucu parası",
    hintCoins: 120,
    layerCoins: 0,
    price: "49,99 TL",
    featured: true
  },
  {
    id: "hint-large",
    productId: "puzzlearea_hint_large",
    type: "hint",
    title: "İpucu Büyük",
    subtitle: "Sadece ipucu parası",
    hintCoins: 300,
    layerCoins: 0,
    price: "99,99 TL"
  },
  {
    id: "layer-small",
    productId: "puzzlearea_layer_small",
    type: "layer",
    title: "Katman Küçük",
    subtitle: "Sadece katman parası",
    hintCoins: 0,
    layerCoins: 20,
    price: "29,99 TL"
  },
  {
    id: "layer-medium",
    productId: "puzzlearea_layer_medium",
    type: "layer",
    title: "Katman Orta",
    subtitle: "Sadece katman parası",
    hintCoins: 0,
    layerCoins: 70,
    price: "79,99 TL",
    featured: true
  },
  {
    id: "layer-large",
    productId: "puzzlearea_layer_large",
    type: "layer",
    title: "Katman Büyük",
    subtitle: "Sadece katman parası",
    hintCoins: 0,
    layerCoins: 180,
    price: "149,99 TL"
  },
  {
    id: "remove-ads",
    productId: REMOVE_ADS_PRODUCT_ID,
    type: "removeAds",
    title: "Reklamları Kaldır",
    subtitle: "Tüm reklamları kalıcı olarak kapat",
    hintCoins: 0,
    layerCoins: 0,
    price: "199,99 TL"
  }
];
const SHOP_PRODUCT_IDS = SHOP_ITEMS.map((pack) => pack.productId);
const SAVE_KEY = "gorsen.save.v2";
const SETTINGS_KEY = "puzzlearea.settings.v1";
const CRASH_LOG_KEY = "gorsen.crashLog.v1";
const UPDATE_STATE_KEY = "puzzlearea.updateState.v1";
const REVIEW_STATE_KEY = "puzzlearea.reviewState.v1";
const RESET_PROGRESS_ON_LAUNCH = false;
const APP_UPDATE_VERSION = SAVE_SCHEMA_VERSION;
const CURRENT_APP_VERSION = "1.0.17";
const REMOTE_UPDATE_CONFIG_URL = "";
const STORE_URL = Platform.OS === "ios"
  ? "https://apps.apple.com/app/id6800594940"
  : "https://play.google.com/store/apps/details?id=com.gorsengames.puzzlearea";
const REVIEW_FIRST_COMPLETION = 6;
const REVIEW_COMPLETION_INTERVAL = 25;
const REVIEW_MIN_DAYS_BETWEEN_PROMPTS = 14;
const REVIEW_MAX_PROMPTS_PER_VERSION = 1;
const REVIEW_MAX_PROMPTS_PER_YEAR = 3;
const TRANSLATIONS = {
  tr: {
    settings: "Ayarlar",
    music: "Müzik",
    sound: "Ses",
    haptics: "Titreşim",
    language: "Dil",
    turkish: "Türkçe",
    english: "İngilizce",
    languagePromptTitle: "Dil Seçimi",
    languagePromptBody: "Oyunun ana dili İngilizce olarak ayarlandı. İstersen Türkçe ile devam edebilirsin.",
    close: "Kapat",
    home: "Ana Ekran",
    levels: "Bölümler",
    shop: "Mağaza",
    start: "Başlat",
    continue: "Devam",
    back: "Geri",
    cancel: "Vazgeç",
    ok: "Tamam",
    move: "Hamle",
    level: "Bölüm",
    findAreas: "Alanları bul, bölümü tamamla",
    currentLevel: "Kaldığın Bölüm",
    undo: "Geri Al",
    erase: "Sil",
    restart: "Yeniden Başlat",
    hint: "İpucu",
    clearBoardTitle: "Tahtayı Temizle",
    clearBoardBody: "Bu bölümdeki tüm seçimleri silmek istiyor musun?",
    clear: "Temizle",
    restartTitle: "Yeniden Başlat",
    restartBody: "Bu bölümü en baştan başlatmak istiyor musun?",
    layerLockedTitle: "Sıradaki Katman Kilitli",
    layerLockedBody: "Bu katmanı açmadan önce bir önceki katmanı açman gerekiyor.",
    layerNotEnoughTitle: "Katman Parası Yetersiz",
    layerNotEnoughBody: (pack, cost, coins) => `${pack} katmanı için ${cost} katman parası gerekiyor. Sende ${coins} var.`,
    unlockLayerTitle: (pack) => `${pack} Katmanını Aç`,
    unlockLayerBody: (cost) => `${cost} katman parası harcanacak. Yeni katmanı açmak istiyor musun?`,
    open: "Aç",
    packageAdded: "Paket eklendi",
    packageAddedBody: (text) => `${text} hesabına eklendi.`,
    purchaseUnavailableTitle: "Satın Alma Hazır Değil",
    purchaseUnavailableBody: "Mağaza bağlantısı şu anda hazır değil. Lütfen biraz sonra tekrar dene.",
    purchaseFailedTitle: "Satın Alma Başarısız",
    purchaseFailedBody: "Satın alma tamamlanamadı. Lütfen tekrar dene.",
    productUnavailableTitle: "Ürün Bulunamadı",
    productUnavailableBody: "Bu paket App Store ürünleri arasında görünmüyor. Ürün kimliğini kontrol et.",
    purchasing: "İşleniyor",
    purchased: "Alındı",
    updatingGame: "Oyun Güncelleniyor",
    updatingGameBody: "Yeni bölümler ve ilerleme ayarları hazırlanıyor.",
    updateRequiredTitle: "Güncelleme Gerekli",
    updateRequiredBody: "Oyuna devam etmek için en güncel sürümü indirmen gerekiyor.",
    updateNow: "Güncelle",
    hintCoin: "İpucu Parası",
    layerCoin: "Katman Parası",
    needHintCoins: (cost) => `${cost} ipucu parası gerekiyor`,
    allDone: "Tüm Bölümler Bitti",
    replayDone: "Bölüm Tekrar Tamamlandı",
    paidHintTitle: "İpucu Kullan",
    paidHintBody: (cost) => `Ücretsiz ipucu hakkın bitti. ${cost} ipucu parası harcayarak ipucu kullanmak ister misin?`,
    completedTitle: "Bölüm Tamamlandı",
    completedAgain: "Bu bölüm daha önce geçildi.",
    rewardsAdding: "Kazandıkların bakiyene ekleniyor.",
    starsEarned: "Kazandığın Yıldız",
    bestStars: "En İyi Sonuç",
    perfectStars: "Kusursuz",
    goodStars: "Güzel",
    completedStars: "Tamamlandı",
    watch2x: "Reklam İzle, 2x Kazan",
    got2x: "2x Alındı",
    claim2x: "2x Kazan",
    adNotReadyTitle: "Reklam Hazır Değil",
    adNotReadyBody: "Reklam şu an yüklenemedi. Lütfen biraz sonra tekrar dene.",
    warmupTitle: "Isınma Turları Bitti",
    warmupBody1: (reward) => `Artık tamamladığın yeni bölümlerde bölüm başına ${reward} ipucu parası kazanacaksın.`,
    warmupBody2: "İleride daha zor bölümler olacak. İpucunu ve katman paranı dikkatli kullan.",
    openingPackage: (pack) => `${pack} Açılıyor`,
    congrats: "Tebrikler!",
    packageOpened: (pack) => `${pack} Katmanı Açıldı`,
    firstLevelOpening: "İlk bölüm açılıyor...",
    shopSubtitle: "İpucu ve katman parası paketleri",
    popular: "Popüler",
    removeAds: "Reklamları Kaldır",
    removeAdsBody: "Geçiş reklamları ve ödüllü reklamlar kalıcı olarak kapatılır.",
    adsRemovedTitle: "Reklamlar Kaldırıldı",
    adsRemovedBody: "Bu cihazda tüm reklamlar kapatıldı.",
    restorePurchases: "Satın Alımları Geri Yükle",
    restoreNotFoundTitle: "Satın Alım Bulunamadı",
    restoreNotFoundBody: "Bu hesapta reklamsız paket bulunamadı.",
    comingSoon: "Yakında",
    shopFootnote: "Paketler mağaza üzerinden alınabilir.",
    onlyHintCoins: "Sadece İpucu Parası",
    onlyLayerCoins: "Sadece Katman Parası",
    levelMap: "Bölüm Haritası",
    starterPackage: "Başlangıç",
    packageOpen: "Açık",
    packageLocked: "Kilitli",
    unlockPrice: "Açılış",
    needPreviousLayer: "Önceki katmanı açman gerekiyor",
    unlockLayer: "Katmanı Aç",
    unlockRandom: "Rastgele Bölüm Aç",
    randomUnlockedTitle: (levelNumber) => `Bölüm ${levelNumber} Açıldı`,
    randomUnlockedBody: "Yeni bölüme geçiliyor.",
    needMoreHintCoins: "Daha fazla ipucu parası gerekiyor",
    allLevelsOpen: "Bu katmandaki tüm bölümler açık",
    passed: "Geçildi",
    passedBang: "Geçildi!",
    newlyOpened: "Yeni Açıldı",
    locked: "Kilitli",
    readyTitle: "Oyuna Hazırsın!",
    tryTitle: "Oynanış Tanıtımı",
    readyBody: "Tebrikler, şimdi başlayabilirsiniz.",
    introLeft: "Animasyonu izle. Alanları kare veya dikdörtgen olarak tamamla.",
    introRight: "Sıradaki sayıyı kendi alanının içine al.",
    introDone: "Tebrikler, şimdi başlayabilirsiniz.",
    introTip: "Animasyon tamamlanana kadar izleyin.",
    introAutoStep: (value) => `${value} yazan sayıyı ${value} kutu olacak şekilde içeriye alıp ekranı tamamlamak.`,
    introHowTo:
      "Kaç sayısı varsa o kadar kutuyu birleştirirsin. 3 yazıyorsa 3 kutu, 4 yazıyorsa 4 kutu, 2 yazıyorsa 2 kutu seç. L veya U şeklinde değil, sadece kare ve dikdörtgen alan işaretlenir. Sayıları doğru alanların içine alıp bütün ekranı tamamladığında bölüm otomatik geçilir. Sayıdan başlamak zorunda değilsin; boş alandan da başlayabilirsin. Önemli olan sayının seçtiğin alanın içinde kalması.",
    firstLevel: "İlk Bölüme Geç",
    markFirst: "Önce İşaretle",
    next: "İleri",
    coachDone: "Tamam"
  },
  en: {
    settings: "Settings",
    music: "Music",
    sound: "Sound",
    haptics: "Vibration",
    language: "Language",
    turkish: "Turkish",
    english: "English",
    languagePromptTitle: "Choose Language",
    languagePromptBody: "The main language is English. You can continue in Turkish if you prefer.",
    close: "Close",
    home: "Home",
    levels: "Levels",
    shop: "Shop",
    start: "Start",
    continue: "Continue",
    back: "Back",
    cancel: "Cancel",
    ok: "OK",
    move: "Moves",
    level: "Level",
    findAreas: "Find the areas, complete the level",
    currentLevel: "Current Level",
    undo: "Undo",
    erase: "Erase",
    restart: "Restart",
    hint: "Hint",
    clearBoardTitle: "Clear Board",
    clearBoardBody: "Do you want to erase all selections in this level?",
    clear: "Clear",
    restartTitle: "Restart",
    restartBody: "Do you want to restart this level from the beginning?",
    layerLockedTitle: "Next Layer Is Locked",
    layerLockedBody: "You need to unlock the previous layer first.",
    layerNotEnoughTitle: "Not Enough Layer Coins",
    layerNotEnoughBody: (pack, cost, coins) => `${pack} needs ${cost} layer coins. You have ${coins}.`,
    unlockLayerTitle: (pack) => `Unlock ${pack}`,
    unlockLayerBody: (cost) => `${cost} layer coins will be spent. Do you want to unlock this layer?`,
    open: "Open",
    packageAdded: "Pack Added",
    packageAddedBody: (text) => `${text} added to your balance.`,
    purchaseUnavailableTitle: "Purchases Not Ready",
    purchaseUnavailableBody: "The store connection is not ready yet. Please try again shortly.",
    purchaseFailedTitle: "Purchase Failed",
    purchaseFailedBody: "The purchase could not be completed. Please try again.",
    productUnavailableTitle: "Product Not Found",
    productUnavailableBody: "This pack is not visible in App Store products. Check the product ID.",
    purchasing: "Processing",
    purchased: "Purchased",
    updatingGame: "Updating Game",
    updatingGameBody: "New levels and progress settings are being prepared.",
    updateRequiredTitle: "Update Required",
    updateRequiredBody: "Please install the latest version to keep playing.",
    updateNow: "Update",
    hintCoin: "Hint Coins",
    layerCoin: "Layer Coins",
    needHintCoins: (cost) => `${cost} hint coins needed`,
    allDone: "All Levels Completed",
    replayDone: "Level Completed Again",
    paidHintTitle: "Use Hint",
    paidHintBody: (cost) => `You are out of free hints. Spend ${cost} hint coins to use one?`,
    completedTitle: "Level Completed",
    completedAgain: "This level was completed before.",
    rewardsAdding: "Your rewards are being added.",
    starsEarned: "Stars Earned",
    bestStars: "Best Result",
    perfectStars: "Perfect",
    goodStars: "Great",
    completedStars: "Completed",
    watch2x: "Watch Ad For 2x",
    got2x: "2x Claimed",
    claim2x: "Claim 2x",
    adNotReadyTitle: "Ad Not Ready",
    adNotReadyBody: "The ad could not load right now. Please try again soon.",
    warmupTitle: "Warm-Up Finished",
    warmupBody1: (reward) => `From now on, completed new levels can give ${reward} hint coins per level.`,
    warmupBody2: "Harder levels are coming. Use hints and layer coins carefully.",
    openingPackage: (pack) => `${pack} is opening`,
    congrats: "Congrats!",
    packageOpened: (pack) => `${pack} layer unlocked`,
    firstLevelOpening: "Opening First Level...",
    shopSubtitle: "Hint And Layer Coin Packs",
    popular: "Popular",
    removeAds: "Remove Ads",
    removeAdsBody: "Interstitial and rewarded ads are permanently disabled.",
    adsRemovedTitle: "Ads Removed",
    adsRemovedBody: "All ads are disabled on this device.",
    restorePurchases: "Restore Purchases",
    restoreNotFoundTitle: "No Purchase Found",
    restoreNotFoundBody: "No remove ads purchase was found on this account.",
    comingSoon: "Coming Soon",
    shopFootnote: "Packs can be purchased from the shop.",
    onlyHintCoins: "Only Hint Coins",
    onlyLayerCoins: "Only Layer Coins",
    levelMap: "Level Map",
    starterPackage: "Starter",
    packageOpen: "Open",
    packageLocked: "Locked",
    unlockPrice: "Unlock",
    needPreviousLayer: "Unlock the previous layer first",
    unlockLayer: "Unlock Layer",
    unlockRandom: "Unlock Random Level",
    randomUnlockedTitle: (levelNumber) => `Level ${levelNumber} Unlocked`,
    randomUnlockedBody: "The new level is ready.",
    needMoreHintCoins: "More Hint Coins Needed",
    allLevelsOpen: "All Levels In This Layer Are Open",
    passed: "Passed",
    passedBang: "Passed!",
    newlyOpened: "Newly Opened",
    locked: "Locked",
    readyTitle: "You Are Ready!",
    tryTitle: "How To Play",
    readyBody: "Great job, you can start now.",
    introLeft: "Watch the animation. Complete areas as squares or rectangles.",
    introRight: "Keep the next number inside its own area.",
    introDone: "Great job, you can start now.",
    introTip: "Watch until the animation finishes.",
    introAutoStep: (value) => `Put the ${value} inside an area of exactly ${value} squares and complete the board.`,
    introHowTo:
      "Each number tells you how many squares to combine. If you see 3, select 3 squares; if you see 4, select 4; if you see 2, select 2. Shapes can only be squares or rectangles, not L or U shapes. When every number is inside a correct area and the whole board is filled, the level finishes automatically. You do not have to start on the number; you can start from an empty square too. The important part is keeping the number inside the area you select.",
    firstLevel: "Go To First Level",
    markFirst: "Mark It First",
    next: "Next",
    coachDone: "Done"
  }
};

const AUDIO_SETTINGS = {
  soundEnabled: true,
  hapticsEnabled: true
};
const GAME_COACH_STEPS = [
  {
    title: "Katman Parası",
    text: "Her bölümden sonra gelir. Yeni 7x7, 8x8 gibi katmanları bununla açarsın.",
    target: { top: 142, left: 22 },
    arrow: "↑"
  },
  {
    title: "İpucu Parası",
    text: "İpucu almak ve bulunduğun katmandan rastgele bölüm açmak için kullanılır.",
    target: { top: 142, left: 90 },
    arrow: "↑"
  },
  {
    title: "Ana Ekran",
    text: "Buradan Ana Ekrana dönebilirsin.",
    target: { top: 100, right: 122 },
    arrow: "↑"
  },
  {
    title: "Bölümler",
    text: "Katmanları gezmek ve açık bölümleri seçmek için buraya dokun.",
    target: { top: 100, right: 70 },
    arrow: "↑"
  },
  {
    title: "Mağaza",
    text: "İpucu ve Katman Parası paketlerini buradan alabilirsin.",
    target: { top: 100, right: 18 },
    arrow: "↑"
  },
  {
    title: "Geri Al",
    text: "Son hamleni geri alır.",
    target: { bottom: 124, left: 46 },
    arrow: "↓"
  },
  {
    title: "Sil",
    text: "Tahtadaki seçimleri temizler.",
    target: { bottom: 124, left: "50%", marginLeft: -17 },
    arrow: "↓"
  },
  {
    title: "Yeniden Başlat",
    text: "Bulunduğun bölümü baştan başlatır.",
    target: { bottom: 124, right: 46 },
    arrow: "↓"
  },
  {
    title: "İpucu",
    text: "İpucu Parası harcayarak bir alanı animasyonla işaretler.",
    target: { bottom: 124, right: 46 },
    arrow: "↓"
  }
];

function getGameCoachSteps(t) {
  const english = t.settings === "Settings";
  return [
    {
      title: t.layerCoin,
      text: english
        ? "Earned after levels. Use it to unlock new layers like 7x7 and 8x8."
        : "Her bölümden sonra gelir. Yeni 7x7, 8x8 gibi katmanları bununla açarsın.",
      target: { top: 196, left: 20 },
      arrow: "↑"
    },
    {
      title: t.hintCoin,
      text: english
        ? "Used for hints and unlocking random levels in your current layer."
        : "İpucu almak ve bulunduğun katmandan rastgele bölüm açmak için kullanılır.",
      target: { top: 196, left: 86 },
      arrow: "↑"
    },
    {
      title: t.home,
      text: english ? "Return to the Home screen here." : "Buradan Ana Ekrana dönebilirsin.",
      target: { top: 148, right: 153 },
      arrow: "↑"
    },
    {
      title: t.levels,
      text: english ? "Open the Level Map and choose unlocked levels." : "Katmanları gezmek ve açık bölümleri seçmek için buraya dokun.",
      target: { top: 148, right: 108 },
      arrow: "↑"
    },
    {
      title: t.shop,
      text: english ? "Buy Hint Coin and Layer Coin packs here." : "İpucu ve Katman Parası paketlerini buradan alabilirsin.",
      target: { top: 148, right: 63 },
      arrow: "↑"
    },
    {
      title: t.settings,
      text: english ? "Change music, sound, vibration and language here." : "Müzik, ses, titreşim ve dili buradan değiştirirsin.",
      target: { top: 148, right: 18 },
      arrow: "↑"
    },
    {
      title: t.undo,
      text: english ? "Undo your last move." : "Son hamleni geri alır.",
      target: { bottom: 122, left: 46 },
      arrow: "↓"
    },
    {
      title: t.erase,
      text: english ? "Clear selections on the board." : "Tahtadaki seçimleri temizler.",
      target: { bottom: 122, left: "50%", marginLeft: -17 },
      arrow: "↓"
    },
    {
      title: t.restart,
      text: english ? "Restart the current level." : "Bulunduğun bölümü baştan başlatır.",
      target: { bottom: 122, left: "50%", marginLeft: -17 },
      arrow: "↓"
    },
    {
      title: t.hint,
      text: english ? "Spend Hint Coins to mark one area with animation." : "İpucu Parası harcayarak bir alanı animasyonla işaretler.",
      target: { bottom: 122, right: 46 },
      arrow: "↓"
    }
  ].filter((step) => step.title !== t.erase);
}

function packageForLevel(index) {
  if (index < 40) return STARTER_PACKAGE;
  if (index < 90) return "7x7";
  if (index < 240) return "8x8";
  if (index < 390) return "9x9";
  if (index < 540) return "10x10";
  if (index < 690) return "11x11";
  if (index < 840) return "12x11";
  if (index < 990) return "13x11";
  if (index < 1140) return "14x11";
  return "15x11";
}

function themeForPackage(packageName) {
  const themeIndex = Math.max(0, PACKAGE_FILTERS.indexOf(packageName));
  return LEVEL_THEME_WORLDS[themeIndex % LEVEL_THEME_WORLDS.length];
}

function themeForLevel(index) {
  return themeForPackage(packageForLevel(index));
}

function displayPackageName(packageName, t) {
  return packageName === STARTER_PACKAGE ? t.starterPackage : packageName;
}

function previousPackage(packageName) {
  const index = PACKAGE_FILTERS.indexOf(packageName);
  return index > 0 ? PACKAGE_FILTERS[index - 1] : null;
}

function packageCanBeUnlockedInOrder(packageName, unlockedPackages) {
  const previous = previousPackage(packageName);
  return !previous || unlockedPackages.has(previous);
}

function nextPackage(packageName) {
  const index = PACKAGE_FILTERS.indexOf(packageName);
  return index >= 0 && index < PACKAGE_FILTERS.length - 1 ? PACKAGE_FILTERS[index + 1] : null;
}

function packageCompleted(packageName, completedSnapshot) {
  const start = PACKAGE_STARTS[packageName];
  const end = PACKAGE_ENDS[packageName];
  for (let index = start; index <= end; index += 1) {
    if (!completedSnapshot.has(index)) return false;
  }
  return true;
}

function legacyPackageRangesForSchema(schemaVersion) {
  if (schemaVersion === 11) return LEGACY_PACKAGE_RANGES_SCHEMA_11;
  if (schemaVersion === 10) return LEGACY_PACKAGE_RANGES_SCHEMA_10;
  if (schemaVersion === 9) return LEGACY_PACKAGE_RANGES_SCHEMA_9;
  if (schemaVersion === 8) return LEGACY_PACKAGE_RANGES_SCHEMA_8;
  if (schemaVersion === 7) return LEGACY_PACKAGE_RANGES_SCHEMA_7;
  if (schemaVersion === 6) return LEGACY_PACKAGE_RANGES_SCHEMA_6;
  return LEGACY_PACKAGE_RANGES_SCHEMA_5;
}

function legacyPackageForLevel(index, schemaVersion) {
  return legacyPackageRangesForSchema(schemaVersion).find((range) => index >= range.start && index <= range.end) || null;
}

function migrateLegacyLevelIndex(index, schemaVersion) {
  if (!Number.isInteger(index)) return null;
  const legacyPackage = legacyPackageForLevel(index, schemaVersion);
  if (!legacyPackage) return index;

  const offset = index - legacyPackage.start;
  if (LEGACY_STARTER_PACKAGES.has(legacyPackage.name)) {
    const starterIndex = (LEGACY_STARTER_PACKAGE_STARTS[legacyPackage.name] ?? 0) + offset;
    return Math.min(starterIndex, PACKAGE_ENDS[STARTER_PACKAGE]);
  }
  const packageName = LEGACY_PACKAGE_NAME_MAP[legacyPackage.name] || legacyPackage.name;
  const newStart = PACKAGE_STARTS[packageName];
  const newEnd = PACKAGE_ENDS[packageName];
  if (!Number.isInteger(newStart) || !Number.isInteger(newEnd)) return index;
  return Math.min(newStart + offset, newEnd);
}

function migrateLegacyLevelSet(values, schemaVersion) {
  const next = new Set();
  if (!Array.isArray(values)) return next;
  values.forEach((value) => {
    const migrated = migrateLegacyLevelIndex(value, schemaVersion);
    if (Number.isInteger(migrated)) next.add(migrated);
  });
  return next;
}

function normalizeUnlockedPackages(packages) {
  const next = new Set();
  arrayToSet(packages).forEach((packageName) => {
    next.add(LEGACY_STARTER_PACKAGES.has(packageName) ? STARTER_PACKAGE : LEGACY_PACKAGE_NAME_MAP[packageName] || packageName);
  });
  next.add(STARTER_PACKAGE);
  return next;
}

function spentLayerCoinsForUnlockedPackages(unlockedPackages) {
  return PACKAGE_FILTERS.reduce((sum, packageName) => {
    if (packageName === STARTER_PACKAGE || !unlockedPackages.has(packageName)) return sum;
    return sum + (LAYER_UNLOCK_COSTS[packageName] ?? 0);
  }, 0);
}

function repairedLayerCoinsForSave(savedLayerCoins, completedSet, unlockedPackageSet) {
  const currentCoins = Number.isInteger(savedLayerCoins) ? Math.max(0, savedLayerCoins) : INITIAL_LAYER_COINS;
  const earnedCoins = completedSet.size * LEVEL_LAYER_REWARD;
  const spentCoins = spentLayerCoinsForUnlockedPackages(unlockedPackageSet);
  return Math.max(currentCoins, INITIAL_LAYER_COINS + earnedCoins - spentCoins);
}

function starTargetsForLevel(level) {
  const perfectMoves = Math.max(1, level.regions.length + STAR_PERFECT_EXTRA_MOVES);
  const goodMoves = perfectMoves + Math.max(2, Math.ceil(level.regions.length * STAR_GOOD_EXTRA_RATIO));
  return { perfectMoves, goodMoves };
}

function starsForLevelMoves(level, moves) {
  const moveCount = Math.max(1, Number.isInteger(moves) ? moves : 1);
  const targets = starTargetsForLevel(level);
  if (moveCount <= targets.perfectMoves) return 3;
  if (moveCount <= targets.goodMoves) return 2;
  return 1;
}

function normalizeLevelStars(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce((next, [levelKey, stars]) => {
    const index = Number(levelKey);
    const rating = Number(stars);
    if (Number.isInteger(index) && Number.isInteger(rating) && rating >= 1 && rating <= 3) {
      next[index] = rating;
    }
    return next;
  }, {});
}

function bestStarsForLevel(index, levelStars, completedSet) {
  return levelStars[index] || (completedSet.has(index) ? 1 : 0);
}

function levelIsAccessibleForSave(index, unlockedLevelSet, unlockedPackageSet) {
  return unlockedLevelSet.has(index) && unlockedPackageSet.has(packageForLevel(index));
}

function resumeLevelIndexForSave(preferredIndex, completedSet, unlockedLevelSet, unlockedPackageSet, totalLevels) {
  const fallbackIndex = Math.max(0, Math.min(Number.isInteger(preferredIndex) ? preferredIndex : 0, totalLevels - 1));
  if (!completedSet.has(fallbackIndex) && levelIsAccessibleForSave(fallbackIndex, unlockedLevelSet, unlockedPackageSet)) {
    return fallbackIndex;
  }

  for (let index = fallbackIndex + 1; index < totalLevels; index += 1) {
    if (!completedSet.has(index) && levelIsAccessibleForSave(index, unlockedLevelSet, unlockedPackageSet)) {
      return index;
    }
  }

  for (let index = 0; index <= fallbackIndex; index += 1) {
    if (!completedSet.has(index) && levelIsAccessibleForSave(index, unlockedLevelSet, unlockedPackageSet)) {
      return index;
    }
  }

  return fallbackIndex;
}

function regionColorForTheme(region, theme) {
  if (region.color) return region.color;
  if (region.previewOnly) return theme.button;
  const index = Number(String(region.id).replace("r", ""));
  return theme.regionPalette[index % theme.regionPalette.length];
}

function withHexOpacity(color, opacityHex) {
  return typeof color === "string" && color.startsWith("#") && color.length === 7 ? `${color}${opacityHex}` : color;
}

function darkenHexColor(color, amount = 0.12) {
  if (typeof color !== "string" || !color.startsWith("#") || color.length !== 7) return color;
  const value = color.slice(1);
  const r = Math.max(0, Math.round(parseInt(value.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(value.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(value.slice(4, 6), 16) * (1 - amount)));
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function mixHexColors(a, b, weight = 0.5) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    !a.startsWith("#") ||
    !b.startsWith("#") ||
    a.length !== 7 ||
    b.length !== 7
  ) {
    return a;
  }
  const ratio = Math.max(0, Math.min(1, weight));
  const av = a.slice(1);
  const bv = b.slice(1);
  const mixed = [0, 2, 4].map((index) => {
    const ac = parseInt(av.slice(index, index + 2), 16);
    const bc = parseInt(bv.slice(index, index + 2), 16);
    return Math.round(ac * (1 - ratio) + bc * ratio).toString(16).padStart(2, "0");
  });
  return `#${mixed.join("")}`;
}

function rewardPaletteForTheme(theme) {
  const accent = theme.regionPalette[1] || theme.button;
  const warmAccent = theme.regionPalette[2] || "#f4c430";
  const isDark = theme.statusBar === "light-content";
  const surface = isDark ? mixHexColors(theme.cell, "#ffffff", 0.1) : mixHexColors(theme.cell, "#ffffff", 0.62);
  const panel = isDark ? mixHexColors(theme.cell, theme.button, 0.14) : mixHexColors(theme.background, "#ffffff", 0.78);
  const border = withHexOpacity(accent, isDark ? "8f" : "78");
  return {
    background: theme.background,
    surface,
    panel,
    starPanel: mixHexColors(panel, warmAccent, isDark ? 0.08 : 0.12),
    title: theme.title,
    muted: theme.muted,
    border,
    cap: accent,
    double: theme.button,
    doubleBorder: darkenHexColor(theme.button, 0.18),
    continue: theme.button,
    continueBorder: darkenHexColor(theme.button, 0.18),
    buttonText: theme.buttonText,
    accent,
    warmAccent
  };
}

function normalize(a, b) {
  return {
    r1: Math.min(a.row, b.row),
    c1: Math.min(a.col, b.col),
    r2: Math.max(a.row, b.row),
    c2: Math.max(a.col, b.col)
  };
}

function rectArea(rect) {
  return (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1);
}

function rectsEqual(a, b) {
  return a.r1 === b.r1 && a.c1 === b.c1 && a.r2 === b.r2 && a.c2 === b.c2;
}

function rectsOverlap(a, b) {
  return a.r1 <= b.r2 && a.r2 >= b.r1 && a.c1 <= b.c2 && a.c2 >= b.c1;
}

function cellsInRect(rect) {
  const cells = [];
  for (let row = rect.r1; row <= rect.r2; row += 1) {
    for (let col = rect.c1; col <= rect.c2; col += 1) {
      cells.push(key(row, col));
    }
  }
  return cells;
}

function cellsInRegion(region) {
  if (region?.rect) return cellsInRect(region.rect);
  return Array.isArray(region.cells) ? region.cells : cellsInRect(region);
}

function regionArea(region) {
  return cellsInRegion(region).length;
}

function cellFromKey(cellKey) {
  const [row, col] = cellKey.split("-").map(Number);
  return { row, col };
}

function cloneRegions(regions) {
  return regions.map((region) => ({ ...region, cells: Array.isArray(region.cells) ? region.cells.slice() : undefined }));
}

function buildMaps(level) {
  const clueByCell = new Map();
  const clueValueByCell = new Map();
  const regionMeta = new Map();

  level.regions.forEach((region) => {
    clueByCell.set(region.clue, region.id);
    clueValueByCell.set(region.clue, region.value);
    regionMeta.set(region.id, region);
  });

  return { clueByCell, clueValueByCell, regionMeta };
}

function marksByCell(regions) {
  const marks = new Map();
  regions.forEach((region) => {
    cellsInRegion(region).forEach((cellKey) => {
      marks.set(cellKey, region.id);
    });
  });
  return marks;
}

function completedMarksByCell(regions) {
  const marks = new Map();
  regions.forEach((region) => {
    if (!region.countMatched) return;
    cellsInRegion(region).forEach((cellKey) => {
      marks.set(cellKey, region.id);
    });
  });
  return marks;
}

function previewMarksByCell(regions) {
  const marks = new Map();
  regions.forEach((region) => {
    if (!region.previewOnly) return;
    cellsInRegion(region).forEach((cellKey) => {
      marks.set(cellKey, region.id);
    });
  });
  return marks;
}

function regionAt(regions, cellKey) {
  return regions.find((region) => cellsInRegion(region).includes(cellKey));
}

function regionsOverlapByCells(first, second) {
  const firstCells = new Set(cellsInRegion(first));
  return cellsInRegion(second).some((cellKey) => firstCells.has(cellKey));
}

function activeCellsForLevel(level) {
  if (Array.isArray(level.activeCells) && level.activeCells.length) return level.activeCells;
  const cells = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      cells.push(key(row, col));
    }
  }
  return cells;
}

function levelHasCell(level, cellKey) {
  return activeCellsForLevel(level).includes(cellKey);
}

function rectFitsActiveCells(level, rect) {
  for (let row = rect.r1; row <= rect.r2; row += 1) {
    for (let col = rect.c1; col <= rect.c2; col += 1) {
      if (!levelHasCell(level, key(row, col))) return false;
    }
  }
  return true;
}

function cellFromBoardPoint(x, y, boardLayout, level) {
  if (!boardLayout.width || !boardLayout.height) return null;
  if (x < 0 || y < 0 || x > boardLayout.width || y > boardLayout.height) return null;

  const cellWidth = (boardLayout.width - GAP * (level.cols - 1)) / level.cols;
  const cellHeight = (boardLayout.height - GAP * (level.rows - 1)) / level.rows;
  const col = Math.max(0, Math.min(level.cols - 1, Math.floor(x / (cellWidth + GAP))));
  const row = Math.max(0, Math.min(level.rows - 1, Math.floor(y / (cellHeight + GAP))));

  const cellKey = key(row, col);
  return levelHasCell(level, cellKey) ? { row, col } : null;
}

function cellFromTouch(event, boardLayout, level) {
  const touch = event.nativeEvent;
  return cellFromBoardPoint(touch.locationX, touch.locationY, boardLayout, level);
}

function boardOriginFromTouch(touch) {
  if (
    !Number.isFinite(touch.pageX) ||
    !Number.isFinite(touch.pageY) ||
    !Number.isFinite(touch.locationX) ||
    !Number.isFinite(touch.locationY)
  ) {
    return null;
  }
  return {
    x: touch.pageX - touch.locationX,
    y: touch.pageY - touch.locationY
  };
}

function cellFromPageTouch(event, boardLayout, level, boardOrigin) {
  const touch = event.nativeEvent;
  if (!boardOrigin || !Number.isFinite(touch.pageX) || !Number.isFinite(touch.pageY)) {
    return cellFromTouch(event, boardLayout, level);
  }
  return cellFromBoardPoint(touch.pageX - boardOrigin.x, touch.pageY - boardOrigin.y, boardLayout, level);
}

function makeDrawnRegion(regionId, rect, regionMeta, cells = null) {
  const meta = regionMeta.get(regionId);
  return {
    id: regionId,
    value: meta.value,
    color: meta.color,
    r1: rect.r1,
    c1: rect.c1,
    r2: rect.r2,
    c2: rect.c2,
    cells: cells ? cells.slice() : undefined
  };
}

function clueCountInRect(rect, clueByCell) {
  return cellsInRect(rect).filter((cellKey) => clueByCell.has(cellKey)).length;
}

function BoardRegion({ region, level, boardSize, countMatched, theme }) {
  const cellWidth = (boardSize.width - GAP * (level.cols - 1)) / level.cols;
  const cellHeight = (boardSize.height - GAP * (level.rows - 1)) / level.rows;
  const regionColor = regionColorForTheme(region, theme);
  const displayColor = countMatched ? darkenHexColor(regionColor, 0.1) : regionColor;
  const opacity = countMatched ? 0.96 : region.previewOnly ? 0.42 : 0.56;
  const regionCells = Array.isArray(region.cells) ? region.cells : null;

  if (regionCells) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {regionCells.map((cellKey) => {
          const { row, col } = cellFromKey(cellKey);
          return (
            <View
              key={`${region.id}-${cellKey}`}
              style={[
                styles.regionBlock,
                {
                  left: col * (cellWidth + GAP),
                  top: row * (cellHeight + GAP),
                  width: cellWidth,
                  height: cellHeight,
                  backgroundColor: displayColor,
                  borderWidth: 0,
                  borderRadius: theme.radius,
                  opacity,
                  shadowOpacity: region.previewOnly ? 0.04 : countMatched ? 0.18 : 0.07
                }
              ]}
            />
          );
        })}
      </View>
    );
  }

  const left = region.c1 * (cellWidth + GAP);
  const top = region.r1 * (cellHeight + GAP);
  const width = (region.c2 - region.c1 + 1) * cellWidth + (region.c2 - region.c1) * GAP;
  const height = (region.r2 - region.r1 + 1) * cellHeight + (region.r2 - region.r1) * GAP;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.regionBlock,
        {
          left,
          top,
          width,
          height,
          backgroundColor: displayColor,
          borderWidth: 0,
          borderRadius: theme.radius,
          opacity,
          shadowOpacity: region.previewOnly ? 0.04 : countMatched ? 0.18 : 0.07
        }
      ]}
    />
  );
}

function setToArray(value) {
  return Array.from(value || []);
}

function arrayToSet(value) {
  return new Set(Array.isArray(value) ? value : []);
}

function buildLevelMapCache(levels, unlockedPackages) {
  const cache = {};
  PACKAGE_FILTERS.forEach((packageName) => {
    if (!unlockedPackages.has(packageName)) return;
    const start = PACKAGE_STARTS[packageName];
    const end = PACKAGE_ENDS[packageName];
    cache[packageName] = levels.slice(start, end + 1).map((level, offset) => ({
      level,
      index: start + offset,
      miniPalette: themeForLevel(start + offset).regionPalette.slice(0, 4)
    }));
  });
  return cache;
}

function waitForFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function buildLevelMapCacheWithProgress(levels, unlockedPackages, onProgress) {
  const cache = {};
  const packages = PACKAGE_FILTERS.filter((packageName) => unlockedPackages.has(packageName));
  const total = packages.reduce((sum, packageName) => sum + (PACKAGE_ENDS[packageName] - PACKAGE_STARTS[packageName] + 1), 0) || 1;
  let done = 0;

  onProgress?.(0.18);
  for (const packageName of packages) {
    const start = PACKAGE_STARTS[packageName];
    const end = PACKAGE_ENDS[packageName];
    const items = [];
    for (let index = start; index <= end; index += 1) {
      items.push({
        level: levels[index],
        index,
        miniPalette: themeForLevel(index).regionPalette.slice(0, 4)
      });
      done += 1;
      if (done % 24 === 0) {
        onProgress?.(0.18 + (done / total) * 0.78);
        await waitForFrame();
      }
    }
    cache[packageName] = items;
    onProgress?.(0.18 + (done / total) * 0.78);
    await waitForFrame();
  }
  onProgress?.(1);
  return cache;
}

async function logCrash(error, info) {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      message: error?.message || "Unknown error",
      stack: error?.stack || "",
      componentStack: info?.componentStack || "",
      at: new Date().toISOString()
    });
    await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(logs.slice(0, 8)));
  } catch {
    // Crash logging must never crash the app.
  }
}

async function playSfx(source) {
  if (!AUDIO_SETTINGS.soundEnabled) return;
  try {
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume: 0.45 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // Sound is a polish layer; keep gameplay working if audio fails.
  }
}

function tapFeedback() {
  if (AUDIO_SETTINGS.hapticsEnabled) Haptics.selectionAsync().catch(() => {});
  playSfx(SFX.tap);
}

function selectionFeedback() {
  playSfx(SFX.select);
}

function advanceFeedback() {
  playSfx(SFX.advance);
}

function successFeedback() {
  if (AUDIO_SETTINGS.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  playSfx(SFX.success);
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logCrash(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorScreen}>
          <StatusBar barStyle="light-content" />
          <Text style={styles.errorTitle}>Bir sorun olustu</Text>
          <Text style={styles.errorText}>Oyunu kapatip tekrar acabilirsin. Hata kaydi cihazda tutuldu.</Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function GameApp() {
  const levels = useMemo(() => makeLevels(), []);
  const [levelIndex, setLevelIndex] = useState(0);
  const [drawnRegions, setDrawnRegions] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [won, setWon] = useState(false);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const boardRef = useRef(null);
  const [moves, setMoves] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [freeHints, setFreeHints] = useState(INITIAL_FREE_HINTS);
  const [hintCoins, setHintCoins] = useState(INITIAL_HINT_COINS);
  const [layerCoins, setLayerCoins] = useState(INITIAL_LAYER_COINS);
  const [noAdsPurchased, setNoAdsPurchased] = useState(false);
  const [purchaseInProgress, setPurchaseInProgress] = useState(null);
  const [unlockedLevels, setUnlockedLevels] = useState(() => new Set([0]));
  const [completedLevels, setCompletedLevels] = useState(() => new Set());
  const [levelStars, setLevelStars] = useState({});
  const [unlockedPackages, setUnlockedPackages] = useState(() => new Set([STARTER_PACKAGE]));
  const [screen, setScreen] = useState("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [language, setLanguage] = useState("en");
  const [languagePromptSeen, setLanguagePromptSeen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  const [levelsBackScreen, setLevelsBackScreen] = useState("home");
  const [shopBackScreen, setShopBackScreen] = useState("home");
  const [packageFilter, setPackageFilter] = useState(STARTER_PACKAGE);
  const [introSeen, setIntroSeen] = useState(false);
  const [paidHintConfirmed, setPaidHintConfirmed] = useState(false);
  const [showPaidHintPrompt, setShowPaidHintPrompt] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState(null);
  const [recentCompletedLevel, setRecentCompletedLevel] = useState(null);
  const [recentUnlockedLevel, setRecentUnlockedLevel] = useState(null);
  const [rewardSummary, setRewardSummary] = useState(null);
  const [warmupSummary, setWarmupSummary] = useState(null);
  const [layerCelebration, setLayerCelebration] = useState(null);
  const [mapInteractionLocked, setMapInteractionLocked] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [requiredUpdate, setRequiredUpdate] = useState(null);
  const [mapCacheReady, setMapCacheReady] = useState(false);
  const [levelMapCache, setLevelMapCache] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sparkCells, setSparkCells] = useState(new Set());
  const [showSplash, setShowSplash] = useState(true);
  const [hintAnimating, setHintAnimating] = useState(false);
  const drawRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const hintTimersRef = useRef([]);
  const musicSoundRef = useRef(null);
  const interstitialRef = useRef(null);
  const rewardedRef = useRef(null);
  const interstitialLoadedRef = useRef(false);
  const rewardedLoadedRef = useRef(false);
  const adEventTypeRef = useRef(null);
  const rewardedAdEventTypeRef = useRef(null);
  const adListenersRef = useRef([]);
  const rewardAdPendingRef = useRef(false);
  const paidHintConfirmedRef = useRef(false);
  const rewardPayoutRef = useRef({ hintReward: 0, layerReward: 0 });
  const boardAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const splashAnim = useRef(new Animated.Value(0)).current;
  const homeEntryAnim = useRef(new Animated.Value(0)).current;
  const transitionAnim = useRef(new Animated.Value(1)).current;
  const mapTransitionAnim = useRef(new Animated.Value(1)).current;
  const mapPulseAnim = useRef(new Animated.Value(0)).current;
  const rewardAnim = useRef(new Animated.Value(0)).current;
  const layerCelebrationAnim = useRef(new Animated.Value(0)).current;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const windowSize = useWindowDimensions();
  const grantShopPack = useCallback((pack) => {
    if (pack.hintCoins) {
      setHintCoins((value) => value + pack.hintCoins);
    }
    if (pack.layerCoins) {
      setLayerCoins((value) => value + pack.layerCoins);
    }
  }, []);

  const {
    connected: iapConnected,
    products: iapProducts,
    fetchProducts,
    requestPurchase,
    finishTransaction: finishIapTransaction
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const pack = SHOP_ITEMS.find((item) => item.productId === purchase.productId);
      try {
        if (!pack) {
          setPurchaseInProgress(null);
          return;
        }

        if (pack.type === "removeAds") {
          setNoAdsPurchased(true);
          await finishIapTransaction({ purchase, isConsumable: false });
          Alert.alert(t.adsRemovedTitle, t.adsRemovedBody);
          return;
        }

        grantShopPack(pack);
        await finishIapTransaction({ purchase, isConsumable: true });

        const rewards = [
          pack.hintCoins ? `${pack.hintCoins} ${t.hintCoin}` : null,
          pack.layerCoins ? `${pack.layerCoins} ${t.layerCoin}` : null
        ].filter(Boolean).join(" + ");

        Alert.alert(t.packageAdded, t.packageAddedBody(rewards || localizedPackTitle(pack, t)));
      } catch (error) {
        logCrash(error, { componentStack: "iapPurchaseSuccess" });
        Alert.alert(t.purchaseFailedTitle, t.purchaseFailedBody);
      } finally {
        setPurchaseInProgress(null);
      }
    },
    onPurchaseError: (error) => {
      setPurchaseInProgress(null);
      if (error?.code === ErrorCode.UserCancelled || error?.code === ErrorCode.Pending || error?.code === ErrorCode.DeferredPayment) {
        return;
      }
      logCrash(error, { componentStack: "iapPurchaseError" });
      Alert.alert(t.purchaseFailedTitle, error?.message || t.purchaseFailedBody);
    },
    onError: (error) => {
      logCrash(error, { componentStack: "iapStoreError" });
    }
  });

  const iapProductsById = useMemo(() => {
    const map = {};
    iapProducts.forEach((product) => {
      if (product?.id) map[product.id] = product;
    });
    return map;
  }, [iapProducts]);

  const level = levels[levelIndex];
  const theme = themeForLevel(levelIndex);
  const maps = useMemo(() => buildMaps(level), [level]);
  const systemTopPadding = Platform.OS === "android"
    ? Math.min(58, Math.max(32, (StatusBar.currentHeight || 24) + 10))
    : 0;
  const systemBottomPadding = Platform.OS === "android"
    ? Math.min(104, Math.max(76, Math.round(windowSize.height * 0.085)))
    : 0;
  const maxBoardWidth = Math.min(windowSize.width - 36, 520);
  const tallBoardTopOffset = level.rows >= 13 && level.cols === 11 ? 18 : 0;
  const maxBoardHeight = Math.max(180, windowSize.height - 172 - systemBottomPadding - systemTopPadding - tallBoardTopOffset);
  const boardWidth = Math.floor(Math.min(maxBoardWidth, maxBoardHeight * (level.cols / level.rows)));
  const boardHeight = Math.round(boardWidth * (level.rows / level.cols));
  const cellWidth = (boardWidth - GAP * (level.cols - 1)) / level.cols;
  const cellHeight = (boardHeight - GAP * (level.rows - 1)) / level.rows;
  const numberFontSize = Math.max(12, Math.min(32, Math.floor(Math.min(cellWidth, cellHeight) * 0.48)));
  const cellPadding = Math.max(3, Math.min(10, Math.floor(Math.min(cellWidth, cellHeight) * 0.16)));
  const hintBadge = freeHints > 0 ? { value: freeHints } : { value: HINT_USE_COST, icon: ICONS.hintCoin };

  function updateBoardFrame(width, height) {
    setBoardSize({ width, height });
  }

  useEffect(() => {
    AUDIO_SETTINGS.soundEnabled = soundEnabled;
    AUDIO_SETTINGS.hapticsEnabled = hapticsEnabled;
  }, [soundEnabled, hapticsEnabled]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const settings = JSON.parse(raw);
        if (typeof settings.musicEnabled === "boolean") setMusicEnabled(settings.musicEnabled);
        if (typeof settings.soundEnabled === "boolean") setSoundEnabled(settings.soundEnabled);
        if (typeof settings.hapticsEnabled === "boolean") setHapticsEnabled(settings.hapticsEnabled);
        const promptSeen = settings.languagePromptSeen === true;
        if (promptSeen && (settings.language === "tr" || settings.language === "en")) setLanguage(settings.language);
        if (typeof settings.languagePromptSeen === "boolean") setLanguagePromptSeen(settings.languagePromptSeen);
      })
      .catch((error) => logCrash(error, { componentStack: "loadSettings" }))
      .finally(() => {
        if (active) setSettingsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ musicEnabled, soundEnabled, hapticsEnabled, language, languagePromptSeen })
    ).catch((error) => logCrash(error, { componentStack: "saveSettings" }));
  }, [hapticsEnabled, language, languagePromptSeen, musicEnabled, settingsReady, soundEnabled]);

  useEffect(() => {
    if (!iapConnected) return;
    fetchProducts({ skus: SHOP_PRODUCT_IDS, type: "in-app" }).catch((error) => {
      logCrash(error, { componentStack: "iapFetchProducts" });
    });
  }, [fetchProducts, iapConnected]);

  useEffect(() => {
    if (!settingsReady) return;
    let cancelled = false;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true
    }).catch(() => {});
    Audio.Sound.createAsync(SFX.music, {
      isLooping: true,
      shouldPlay: musicEnabled,
      volume: 0.18
    })
      .then(({ sound }) => {
        if (cancelled) {
          sound.unloadAsync();
          return;
        }
        musicSoundRef.current = sound;
      })
      .catch((error) => logCrash(error, { componentStack: "musicCreate" }));
    return () => {
      cancelled = true;
      musicSoundRef.current?.unloadAsync();
      musicSoundRef.current = null;
    };
  }, [settingsReady]);

  useEffect(() => {
    const sound = musicSoundRef.current;
    if (!sound) return;
    if (musicEnabled) {
      sound.playAsync().catch(() => {});
    } else {
      sound.pauseAsync().catch(() => {});
    }
  }, [musicEnabled]);

  useEffect(() => {
    const ads = loadAdsModule();
    if (!ads) return undefined;

    const {
      default: mobileAds,
      AdEventType,
      InterstitialAd,
      RewardedAd,
      RewardedAdEventType
    } = ads;
    adEventTypeRef.current = AdEventType;
    rewardedAdEventTypeRef.current = RewardedAdEventType;

    mobileAds().initialize().catch((error) => logCrash(error, { componentStack: "mobileAdsInitialize" }));

    const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true
    });
    const rewarded = REWARDED_AD_UNIT_ID
      ? RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true
        })
      : null;

    interstitialRef.current = interstitial;
    rewardedRef.current = rewarded;

    const interstitialLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoadedRef.current = true;
    });
    const interstitialClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoadedRef.current = false;
      interstitial.load();
    });
    const interstitialError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialLoadedRef.current = false;
    });
    const rewardedLoaded = rewarded?.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedLoadedRef.current = true;
    });
    const rewardedClosed = rewarded?.addAdEventListener(AdEventType.CLOSED, () => {
      rewardedLoadedRef.current = false;
      rewarded.load();
    });
    const rewardedError = rewarded?.addAdEventListener(AdEventType.ERROR, () => {
      rewardedLoadedRef.current = false;
    });

    adListenersRef.current = [
      interstitialLoaded,
      interstitialClosed,
      interstitialError,
      rewardedLoaded,
      rewardedClosed,
      rewardedError
    ];

    interstitial.load();
    rewarded?.load();

    return () => {
      adListenersRef.current.forEach((unsubscribe) => unsubscribe?.());
      adListenersRef.current = [];
      interstitialRef.current = null;
      rewardedRef.current = null;
      interstitialLoadedRef.current = false;
      rewardedLoadedRef.current = false;
      adEventTypeRef.current = null;
      rewardedAdEventTypeRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (RESET_PROGRESS_ON_LAUNCH) {
      AsyncStorage.removeItem(SAVE_KEY)
        .catch((error) => logCrash(error, { componentStack: "resetSave" }))
        .finally(() => {
          if (active) setStorageReady(true);
        });
      return () => {
        active = false;
      };
    }

    AsyncStorage.getItem(SAVE_KEY)
      .then((raw) => {
        if (!active || !raw) return;

        const save = JSON.parse(raw);
        const needsMigration = save.schemaVersion !== SAVE_SCHEMA_VERSION;
        const saveSchemaVersion = Number.isInteger(save.schemaVersion) ? save.schemaVersion : 5;
        const loadedUnlockedPackages = save.unlockedPackages
          ? normalizeUnlockedPackages(save.unlockedPackages)
          : new Set([STARTER_PACKAGE]);
        const loadedUnlockedLevels = save.unlockedLevels
          ? (needsMigration ? migrateLegacyLevelSet(save.unlockedLevels, saveSchemaVersion) : arrayToSet(save.unlockedLevels))
          : new Set([0]);
        const loadedCompletedLevels = save.completedLevels
          ? (needsMigration ? migrateLegacyLevelSet(save.completedLevels, saveSchemaVersion) : arrayToSet(save.completedLevels))
          : new Set();
        loadedUnlockedPackages.add(STARTER_PACKAGE);
        loadedUnlockedLevels.add(0);

        if (Number.isInteger(save.levelIndex)) {
          const nextLevelIndex = needsMigration ? migrateLegacyLevelIndex(save.levelIndex, saveSchemaVersion) : save.levelIndex;
          setLevelIndex(resumeLevelIndexForSave(nextLevelIndex, loadedCompletedLevels, loadedUnlockedLevels, loadedUnlockedPackages, levels.length));
        }
        if (Number.isInteger(save.hintCoins)) setHintCoins(Math.max(0, save.hintCoins));
        setLayerCoins(repairedLayerCoinsForSave(save.layerCoins, loadedCompletedLevels, loadedUnlockedPackages));
        if (typeof save.noAdsPurchased === "boolean") setNoAdsPurchased(save.noAdsPurchased);
        if (Number.isInteger(save.freeHints)) setFreeHints(Math.max(0, save.freeHints));
        if (typeof save.introSeen === "boolean") setIntroSeen(save.introSeen);
        setUnlockedLevels(loadedUnlockedLevels);
        setCompletedLevels(loadedCompletedLevels);
        setLevelStars(normalizeLevelStars(save.levelStars));
        setUnlockedPackages(loadedUnlockedPackages);
      })
      .catch((error) => logCrash(error, { componentStack: "loadSave" }))
      .finally(() => {
        if (active) setStorageReady(true);
      });
    return () => {
      active = false;
    };
  }, [levels.length]);

  useEffect(() => {
    if (!storageReady) return;
    let active = true;

    async function prepareUpdate() {
      try {
        setUpdateProgress(0.18);

        const remoteConfig = await fetchRemoteUpdateConfig().catch((error) => {
          logCrash(error, { componentStack: "fetchRemoteUpdateConfig" });
          return null;
        });
        if (!active) return;

        if (remoteConfig?.minimumVersion && compareVersion(CURRENT_APP_VERSION, remoteConfig.minimumVersion) < 0) {
          setRequiredUpdate({
            title: remoteConfig.title,
            body: remoteConfig.body,
            url: remoteConfig.storeUrl || STORE_URL
          });
          setUpdateProgress(1);
          return;
        }

        const raw = await AsyncStorage.getItem(UPDATE_STATE_KEY);
        const state = raw ? JSON.parse(raw) : {};
        const needsLocalUpdate = state.appliedUpdateVersion !== APP_UPDATE_VERSION;

        if (needsLocalUpdate) {
          setUpdateProgress(0.38);
          await wait(140);
          if (!active) return;

          setUnlockedPackages((items) => normalizeUnlockedPackages(setToArray(items)));
          setUpdateProgress(0.68);
          await wait(140);
          if (!active) return;

          await AsyncStorage.setItem(
            UPDATE_STATE_KEY,
            JSON.stringify({
              appliedUpdateVersion: APP_UPDATE_VERSION,
              appVersion: CURRENT_APP_VERSION,
              updatedAt: Date.now()
            })
          );
        }

        if (!active) return;
        setUpdateProgress(1);
        setUpdateReady(true);
      } catch (error) {
        logCrash(error, { componentStack: "prepareUpdate" });
        if (active) {
          setUpdateProgress(1);
          setUpdateReady(true);
        }
      }
    }

    prepareUpdate();
    return () => {
      active = false;
    };
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady || !updateReady) return;
    let cancelled = false;
    setLoadingProgress((value) => Math.max(value, 0.12));
    buildLevelMapCacheWithProgress(levels, unlockedPackages, (value) => {
      if (!cancelled) setLoadingProgress(value);
    })
      .then((cache) => {
        if (cancelled) return;
        setLevelMapCache(cache);
        setLoadingProgress(1);
        setMapCacheReady(true);
      })
      .catch((error) => {
        logCrash(error, { componentStack: "buildLevelMapCache" });
        if (!cancelled) {
          setLevelMapCache(buildLevelMapCache(levels, unlockedPackages));
          setLoadingProgress(1);
          setMapCacheReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [levels, storageReady, updateReady, unlockedLevels, unlockedPackages]);

  useEffect(() => {
    if (!storageReady) return;
    if (!updateReady) return;
    if (RESET_PROGRESS_ON_LAUNCH) return;
    const resumeLevelIndex = resumeLevelIndexForSave(levelIndex, completedLevels, unlockedLevels, unlockedPackages, levels.length);
    const save = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      levelIndex: resumeLevelIndex,
      hintCoins,
      layerCoins,
      noAdsPurchased,
      freeHints,
      introSeen,
      unlockedLevels: setToArray(unlockedLevels),
      completedLevels: setToArray(completedLevels),
      levelStars,
      unlockedPackages: setToArray(unlockedPackages)
    };
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(save)).catch((error) => logCrash(error, { componentStack: "saveProgress" }));
  }, [completedLevels, freeHints, hintCoins, introSeen, layerCoins, levelIndex, levelStars, levels.length, noAdsPurchased, storageReady, updateReady, unlockedLevels, unlockedPackages]);

  function resetLevel(nextIndex = levelIndex) {
    if (nextIndex !== levelIndex || screen !== "game") advanceFeedback();
    clearTimeout(advanceTimerRef.current);
    clearHintTimers();
    Animated.sequence([
      Animated.timing(transitionAnim, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(transitionAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
    setTimeout(() => setLevelIndex(nextIndex), 180);
    setDrawnRegions([]);
    setHistory([]);
    setStatus("");
    setWon(false);
    setSparkCells(new Set());
    setMoves(0);
    setHintCount(0);
    setScreen("game");
    drawRef.current = null;
  }

  function clueInRect(rect) {
    const clues = cellsInRect(rect).filter((cellKey) => maps.clueByCell.has(cellKey));
    return clues.length === 1 ? maps.clueByCell.get(clues[0]) : null;
  }

  function countFeedbackEnabled() {
    return true;
  }

  function rectMatchesClueCount(rect, regionId) {
    const meta = maps.regionMeta.get(regionId);
    return meta && rectArea(rect) === meta.value;
  }


  function allLevelCells() {
    return activeCellsForLevel(level);
  }


  function playSuccessAnimation() {
    boardAnim.setValue(0.96);
    flashAnim.setValue(0);
    Animated.spring(boardAnim, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true
    }).start();
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 260, useNativeDriver: true })
    ]).start();
  }

  function playCellSparkAnimation() {
    const allCells = allLevelCells();

    setSparkCells(new Set());
    const stepDelay = Math.max(4, Math.floor(520 / allCells.length));
    allCells.forEach((cellKey, index) => {
      setTimeout(() => {
        setSparkCells((items) => {
          const next = new Set(items);
          next.add(cellKey);
          return next;
        });
      }, index * stepDelay);
    });
    setTimeout(() => setSparkCells(new Set()), allCells.length * stepDelay + 240);
  }

  function clearHintTimers() {
    hintTimersRef.current.forEach((timer) => clearTimeout(timer));
    hintTimersRef.current = [];
    setHintAnimating(false);
  }

  function visibleRegions() {
    const currentDraw = drawRef.current;
    if (!currentDraw?.dragRect) return drawnRegions;

    if (currentDraw.mode === "erase") {
      return currentDraw.baseRegions.filter((region) => region.id !== currentDraw.eraseRegionId);
    }

    const regionId = clueInRect(currentDraw.dragRect);
    if (!regionId) {
      const preview = {
        id: "preview",
        previewOnly: true,
        r1: currentDraw.dragRect.r1,
        c1: currentDraw.dragRect.c1,
        r2: currentDraw.dragRect.r2,
        c2: currentDraw.dragRect.c2
      };
      return currentDraw.baseRegions
        .filter((region) => region.countMatched || !rectsOverlap(region, preview))
        .concat(preview);
    }
    const countMatched = rectMatchesClueCount(currentDraw.dragRect, regionId);

    const preview = {
      ...makeDrawnRegion(regionId, currentDraw.dragRect, maps.regionMeta),
      previewOnly: true,
      countMatched: countFeedbackEnabled() ? countMatched : false
    };
    return currentDraw.baseRegions
      .filter((region) => region.countMatched || (!rectsOverlap(region, preview) && region.id !== regionId))
      .concat(preview);
  }

  function finishDraw() {
    const currentDraw = drawRef.current;
    if (!currentDraw?.dragRect) return;
    let changed = false;

    if (currentDraw.mode === "erase") {
      setDrawnRegions(currentDraw.baseRegions.filter((region) => region.id !== currentDraw.eraseRegionId));
      setStatus("");
      changed = true;
    } else {
      const regionId = clueInRect(currentDraw.dragRect);
      if (!regionId) {
        setHistory((items) => items.slice(0, -1));
        setStatus("");
        drawRef.current = null;
        return;
      }
      const selectedRect = currentDraw.dragRect;
      if (!rectFitsActiveCells(level, selectedRect)) {
        setHistory((items) => items.slice(0, -1));
        setStatus("");
        drawRef.current = null;
        return;
      }

      const nextRegion = {
        ...makeDrawnRegion(regionId, selectedRect, maps.regionMeta),
        countMatched: countFeedbackEnabled() && rectMatchesClueCount(currentDraw.dragRect, regionId)
      };
      if (currentDraw.baseRegions.some((region) => region.countMatched && (regionsOverlapByCells(region, nextRegion) || region.id === regionId))) {
        setHistory((items) => items.slice(0, -1));
        setStatus("");
        drawRef.current = null;
        return;
      }
      setDrawnRegions(
        currentDraw.baseRegions
          .filter((region) => region.countMatched || (!regionsOverlapByCells(region, nextRegion) && region.id !== regionId))
          .concat(nextRegion)
      );
      setStatus("");
      changed = true;
    }

    drawRef.current = null;
    if (changed) {
      setMoves((value) => value + 1);
      selectionFeedback();
    }
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const touch = event.nativeEvent;
          const pos = cellFromTouch(event, boardSize, level);
          if (!pos) return;

          const cellKey = key(pos.row, pos.col);
          const touchedRegion = regionAt(drawnRegions, cellKey);
          const baseRegions = cloneRegions(drawnRegions);

          setHistory((items) => items.concat([cloneRegions(drawnRegions)]));
          setStatus("");
          setWon(false);
          drawRef.current = {
            start: pos,
            lastPos: pos,
            boardOrigin: boardOriginFromTouch(touch),
            dragRect: normalize(pos, pos),
            baseRegions,
            eraseRegionId: touchedRegion?.id ?? null,
            mode: touchedRegion ? "erase" : "paint"
          };
        },
        onPanResponderMove: (event) => {
          const currentDraw = drawRef.current;
          if (!currentDraw) return;

          const pos = cellFromPageTouch(event, boardSize, level, currentDraw.boardOrigin);
          if (!pos) return;
          const nextRect = normalize(currentDraw.start, pos);
          if (currentDraw.mode === "paint" && !rectFitsActiveCells(level, nextRect)) {
            return;
          }

          if (currentDraw.mode === "paint" && clueCountInRect(nextRect, maps.clueByCell) > 1) {
            return;
          }
          if (currentDraw.mode === "paint" && currentDraw.baseRegions.some((region) => region.countMatched && rectsOverlap(region, nextRect))) {
            return;
          }

          drawRef.current = {
            ...currentDraw,
            lastPos: pos,
            dragRect: nextRect
          };
          setDrawnRegions((items) => items.slice());
        },
        onPanResponderRelease: finishDraw,
        onPanResponderTerminate: finishDraw
      }),
    [boardSize, drawnRegions, level, maps]
  );

  const regions = visibleRegions();
  const marks = marksByCell(regions);
  const completedMarks = completedMarksByCell(regions);
  const previewMarks = previewMarksByCell(regions);

  function evaluatePuzzle() {
    const filledCells = new Map();
    let valid = true;

    drawnRegions.forEach((region) => {
      const regionCells = cellsInRegion(region);
      const clues = regionCells.filter((cellKey) => maps.clueValueByCell.has(cellKey));
      const clueValue = clues.length === 1 ? maps.clueValueByCell.get(clues[0]) : null;

      if (clues.length !== 1 || !clueValue || regionArea(region) !== clueValue) {
        valid = false;
      }

      regionCells.forEach((cellKey) => {
        if (filledCells.has(cellKey)) {
          valid = false;
        }
        filledCells.set(cellKey, true);
      });
    });

    allLevelCells().forEach((cellKey) => {
      if (!filledCells.has(cellKey)) {
        valid = false;
      }
    });

    return {
      valid,
      complete: filledCells.size === allLevelCells().length
    };
  }

  function completeLevel() {
    setWon(true);
    successFeedback();
    playSuccessAnimation();
    playCellSparkAnimation();
    const wasCompleted = completedLevels.has(levelIndex);
    const completedSnapshot = new Set(completedLevels);
    completedSnapshot.add(levelIndex);
    const nextLevelIndex = nextUncompletedLevelAfter(levelIndex, completedSnapshot);
    const hintReward = wasCompleted ? 0 : LEVEL_HINT_REWARD;
    const layerReward = wasCompleted ? 0 : LEVEL_LAYER_REWARD;
    const earnedStars = starsForLevelMoves(level, moves);
    const previousStars = levelStars[levelIndex] || 0;
    const bestStars = Math.max(previousStars, earnedStars);
    setLevelStars((items) => {
      if ((items[levelIndex] || 0) >= bestStars) return items;
      return { ...items, [levelIndex]: bestStars };
    });
    if (!wasCompleted) {
      setCompletedLevels((items) => {
        const next = new Set(items);
        next.add(levelIndex);
        return next;
      });
      if (nextLevelIndex !== null && packageIsUnlocked(packageForLevel(nextLevelIndex))) {
        setUnlockedLevels((items) => {
          const next = new Set(items);
          next.add(nextLevelIndex);
          return next;
        });
      }
    }

    if (levelIndex === levels.length - 1) {
      setStatus(t.allDone);
      return;
    }

    setStatus(wasCompleted ? t.replayDone : "");
    clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      if (shouldShowInterstitialAfterLevel(completedSnapshot.size, wasCompleted, levelIndex)) {
        showInterstitialAdIfReady();
      }
      rewardPayoutRef.current = { hintReward, layerReward };
      setRewardSummary({
        levelIndex,
        nextLevelIndex,
        wasCompleted,
        hintBefore: hintCoins,
        layerBefore: layerCoins,
        hintReward,
        layerReward,
        earnedStars,
        previousStars,
        bestStars,
        starTargets: starTargetsForLevel(level),
        moves,
        packageName: level.package,
        offerDouble: shouldOfferDoubleRewardAfterLevel(wasCompleted, hintReward, layerReward),
        delayContinue: shouldDelayContinueAfterLevel(completedSnapshot.size, wasCompleted, hintReward, layerReward)
      });
      rewardAnim.setValue(0);
      setScreen("reward");
      Animated.timing(rewardAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      maybeRequestAppReview(completedSnapshot, wasCompleted);
    }, 850);
  }

  function nextUncompletedLevelAfter(fromIndex, completedSnapshot = completedLevels) {
    for (let index = fromIndex + 1; index < levels.length; index += 1) {
      if (packageIsUnlocked(packageForLevel(index)) && !completedSnapshot.has(index)) return index;
    }
    return null;
  }

  function shouldShowInterstitialAfterLevel(completedCount, wasCompleted, completedLevelIndex = levelIndex) {
    if (wasCompleted) return false;
    const completedLevelNumber = completedLevelIndex + 1;
    return completedLevelNumber >= FIRST_INTERSTITIAL_LEVEL &&
      (completedLevelNumber - FIRST_INTERSTITIAL_LEVEL) % INTERSTITIAL_EVERY_COMPLETIONS === 0;
  }

  function shouldOfferDoubleRewardAfterLevel(wasCompleted, hintReward, layerReward) {
    return Boolean(hintReward || layerReward);
  }

  function shouldDelayContinueAfterLevel(completedCount, wasCompleted, hintReward, layerReward) {
    if (wasCompleted) return false;
    if (!hintReward && !layerReward) return false;
    return completedCount > 0 && completedCount % DELAY_CONTINUE_EVERY_COMPLETIONS === 0;
  }

  async function maybeRequestAppReview(completedSnapshot, wasCompleted) {
    if (wasCompleted) return;
    const completedCount = completedSnapshot.size;
    if (completedCount < REVIEW_FIRST_COMPLETION) return;
    if ((completedCount - REVIEW_FIRST_COMPLETION) % REVIEW_COMPLETION_INTERVAL !== 0) return;

    try {
      const raw = await AsyncStorage.getItem(REVIEW_STATE_KEY);
      const state = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const promptHistory = Array.isArray(state.promptHistory)
        ? state.promptHistory.filter((timestamp) => Number(timestamp) > yearAgo)
        : [];
      const versionPromptCount = state.version === CURRENT_APP_VERSION ? Number(state.versionPromptCount) || 0 : 0;
      const daysSinceLastPrompt = state.lastPromptAt
        ? (now - Number(state.lastPromptAt)) / (24 * 60 * 60 * 1000)
        : Infinity;

      if (versionPromptCount >= REVIEW_MAX_PROMPTS_PER_VERSION) return;
      if (promptHistory.length >= REVIEW_MAX_PROMPTS_PER_YEAR) return;
      if (daysSinceLastPrompt < REVIEW_MIN_DAYS_BETWEEN_PROMPTS) return;

      const hasAction = await StoreReview.hasAction();
      if (!hasAction) return;

      await AsyncStorage.setItem(
        REVIEW_STATE_KEY,
        JSON.stringify({
          version: CURRENT_APP_VERSION,
          versionPromptCount: versionPromptCount + 1,
          lastPromptAt: now,
          lastCompletedCount: completedCount,
          promptHistory: promptHistory.concat(now)
        })
      );

      setTimeout(() => {
        StoreReview.requestReview().catch((error) => logCrash(error, { componentStack: "requestReview" }));
      }, 900);
    } catch (error) {
      logCrash(error, { componentStack: "maybeRequestAppReview" });
    }
  }

  function showInterstitialAdIfReady() {
    if (noAdsPurchased) return;
    const ad = interstitialRef.current;
    if (!ad || !interstitialLoadedRef.current) {
      ad?.load();
      return;
    }
    try {
      interstitialLoadedRef.current = false;
      ad.show();
    } catch (error) {
      logCrash(error, { componentStack: "showInterstitial" });
      ad.load();
    }
  }

  function showRewardedAdThenContinue(onRewardEarned) {
    if (noAdsPurchased) {
      onRewardEarned();
      return;
    }
    if (rewardAdPendingRef.current) return;
    const ad = rewardedRef.current;
    const AdEventType = adEventTypeRef.current;
    const RewardedAdEventType = rewardedAdEventTypeRef.current;
    if (!ad || !rewardedLoadedRef.current || !AdEventType || !RewardedAdEventType) {
      ad?.load();
      rewardAdPendingRef.current = true;
      setTimeout(() => {
        rewardAdPendingRef.current = false;
        if (rewardedRef.current && rewardedLoadedRef.current && adEventTypeRef.current && rewardedAdEventTypeRef.current) {
          showRewardedAdThenContinue(onRewardEarned);
          return;
        }
        continueAfterReward();
      }, 1400);
      return;
    }

    rewardAdPendingRef.current = true;
    let earned = false;
    const rewardListener = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const closeListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      rewardAdPendingRef.current = false;
      rewardListener();
      closeListener();
      if (earned) {
        onRewardEarned();
      } else {
        continueAfterReward();
      }
    });

    try {
      rewardedLoadedRef.current = false;
      ad.show();
    } catch (error) {
      rewardAdPendingRef.current = false;
      rewardListener();
      closeListener();
      logCrash(error, { componentStack: "showRewarded" });
      ad.load();
      continueAfterReward();
    }
  }

  function continueAfterReward(forcedPayout = null) {
    if (!rewardSummary) return;
    const payout = forcedPayout || rewardPayoutRef.current;
    const completedSnapshot = new Set(completedLevels);
    completedSnapshot.add(rewardSummary.levelIndex);
    const packageName = rewardSummary.packageName;
    const nextPackageName = nextPackage(packageName);
    const shouldTryAutoUnlock =
      nextPackageName &&
      rewardSummary.levelIndex === PACKAGE_ENDS[packageName] &&
      packageCompleted(packageName, completedSnapshot) &&
      !unlockedPackages.has(nextPackageName);
    const nextPackageCost = shouldTryAutoUnlock ? LAYER_UNLOCK_COSTS[nextPackageName] ?? 0 : 0;
    const canAutoUnlock = shouldTryAutoUnlock && layerCoins + payout.layerReward >= nextPackageCost;

    if (payout.hintReward || payout.layerReward || canAutoUnlock) {
      setHintCoins((value) => value + payout.hintReward);
      setLayerCoins((value) => Math.max(0, value + payout.layerReward - (canAutoUnlock ? nextPackageCost : 0)));
      rewardPayoutRef.current = { hintReward: 0, layerReward: 0 };
    }
    if (canAutoUnlock) {
      setUnlockedPackages((items) => {
        const next = new Set(items);
        next.add(nextPackageName);
        return next;
      });
      setUnlockedLevels((items) => {
        const next = new Set(items);
        next.add(PACKAGE_STARTS[nextPackageName]);
        return next;
      });
      setRewardSummary(null);
      setLayerCelebration({ packageName: nextPackageName, levelIndex: PACKAGE_STARTS[nextPackageName], openOnMap: false });
      layerCelebrationAnim.setValue(0);
      setScreen("layerCelebration");
      Animated.timing(layerCelebrationAnim, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    showLevelMapAfterReward({
      levelIndex: rewardSummary.levelIndex,
      nextLevelIndex: rewardSummary.nextLevelIndex,
      packageName: rewardSummary.packageName
    });
  }

  function showLevelMapAfterReward({ levelIndex: completedIndex, nextLevelIndex, packageName }) {
    clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setRecentCompletedLevel(completedIndex);
      setRecentUnlockedLevel(nextLevelIndex !== null ? nextLevelIndex : null);
      setMapInteractionLocked(true);
      setLevelsBackScreen("game");
      setPackageFilter(packageName);
      mapTransitionAnim.setValue(0);
      mapPulseAnim.setValue(0);
      setScreen("levels");
      Animated.parallel([
        Animated.timing(mapTransitionAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(130),
          Animated.timing(mapPulseAnim, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        ])
      ]).start();
      if (nextLevelIndex !== null && packageIsUnlocked(packageForLevel(nextLevelIndex))) {
        advanceTimerRef.current = setTimeout(() => {
          setRecentCompletedLevel(null);
          setRecentUnlockedLevel(null);
          setMapInteractionLocked(false);
          resetLevel(nextLevelIndex);
        }, 1450);
      } else {
        advanceTimerRef.current = setTimeout(() => setMapInteractionLocked(false), 1450);
      }
    }, 120);
  }

  function showUnlockedPackageOnMap(packageName, firstLevelIndex) {
    clearTimeout(advanceTimerRef.current);
    setRecentCompletedLevel(null);
    setRecentUnlockedLevel(firstLevelIndex);
    setMapInteractionLocked(true);
    setLevelsBackScreen("game");
    setPackageFilter(packageName);
    mapTransitionAnim.setValue(0);
    mapPulseAnim.setValue(0);
    setScreen("levels");
    Animated.parallel([
      Animated.timing(mapTransitionAnim, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(mapPulseAnim, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ])
    ]).start();
    advanceTimerRef.current = setTimeout(() => {
      setRecentUnlockedLevel(null);
      setMapInteractionLocked(false);
      resetLevel(firstLevelIndex);
    }, 2100);
  }

  function continueAfterWarmup() {
    if (!warmupSummary) return;
    const { packageName, levelIndex: firstLevelIndex, cost } = warmupSummary;
    setLayerCoins((value) => Math.max(0, value - cost));
    setUnlockedPackages((items) => {
      const next = new Set(items);
      next.add(packageName);
      return next;
    });
    setUnlockedLevels((items) => {
      const next = new Set(items);
      next.add(firstLevelIndex);
      return next;
    });
    setWarmupSummary(null);
    setLayerCelebration({ packageName, levelIndex: firstLevelIndex, openOnMap: false });
    layerCelebrationAnim.setValue(0);
    setScreen("layerCelebration");
    Animated.timing(layerCelebrationAnim, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }

  function doubleReward() {
    if (!rewardSummary || rewardSummary.doubled || (!rewardSummary.hintReward && !rewardSummary.layerReward)) return;
    showRewardedAdThenContinue(() => {
      setRewardSummary((summary) => {
        if (!summary || summary.doubled || (!summary.hintReward && !summary.layerReward)) return summary;
        const next = {
          ...summary,
          hintReward: summary.hintReward * 2,
          layerReward: summary.layerReward * 2,
          doubled: true
        };
        rewardPayoutRef.current = {
          hintReward: next.hintReward,
          layerReward: next.layerReward
        };
        setTimeout(() => continueAfterReward(rewardPayoutRef.current), 120);
        return next;
      });
    });
  }

  useEffect(() => () => {
    clearTimeout(advanceTimerRef.current);
    hintTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(splashAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(360),
      Animated.timing(splashAnim, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start(() => setShowSplash(false));
  }, []);

  useEffect(() => {
    if (showSplash || !storageReady || !updateReady || !mapCacheReady) return;
    homeEntryAnim.setValue(0);
    Animated.timing(homeEntryAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [homeEntryAnim, mapCacheReady, showSplash, storageReady, updateReady]);

  useEffect(() => {
    if (won) return;

    const result = evaluatePuzzle();
    if (!result.complete) return;

    if (!result.valid) {
      setStatus("");
      return;
    }

    completeLevel();
  }, [drawnRegions, levelIndex]);

  useEffect(() => {
    if (!layerCelebration) return;
    const timer = setTimeout(() => {
      if (layerCelebration.openOnMap) {
        showUnlockedPackageOnMap(layerCelebration.packageName, layerCelebration.levelIndex);
      } else {
        resetLevel(layerCelebration.levelIndex);
      }
      setLayerCelebration(null);
    }, 1350);
    return () => clearTimeout(timer);
  }, [layerCelebration]);

  function hint() {
    if (hintAnimating) return;
    const useFreeHint = freeHints > 0;
    if (!useFreeHint && hintCoins < HINT_USE_COST) {
      setStatus(t.needHintCoins(HINT_USE_COST));
      return;
    }
    if (!useFreeHint && !paidHintConfirmedRef.current) {
      setShowPaidHintPrompt(true);
      return;
    }

    const marksForCurrent = marksByCell(drawnRegions);
    const wrongRegion = drawnRegions.find((region) => {
      const regionCells = cellsInRegion(region);
      const clues = regionCells.filter((cellKey) => maps.clueByCell.has(cellKey));
      return clues.length !== 1 || regionArea(region) !== region.value;
    });
    const wrongTarget = wrongRegion
      ? level.regions.find((target) => regionsOverlapByCells(target, wrongRegion))
      : null;
    const next = wrongTarget || level.regions.find((target) => {
      const targetCells = cellsInRegion(target);
      return (
        !drawnRegions.some((region) => region.id === target.id && regionArea(region) === target.value) ||
        targetCells.some((cellKey) => marksForCurrent.get(cellKey) !== target.id)
      );
    });
    if (!next) return;

    if (useFreeHint) {
      setFreeHints((value) => Math.max(0, value - 1));
    } else {
      setHintCoins((value) => Math.max(0, value - HINT_USE_COST));
    }
    const baseRegions = drawnRegions
      .filter((region) => !regionsOverlapByCells(region, next) && region.id !== next.id);
    const clueCell = cellFromKey(next.clue);
    const steps = 5;

    setHistory((items) => items.concat([cloneRegions(drawnRegions)]));
    setStatus("");
    setWon(false);
    setHintAnimating(true);
    setDrawnRegions(baseRegions);
    hintTimersRef.current.forEach((timer) => clearTimeout(timer));
    hintTimersRef.current = [];

    for (let step = 1; step <= steps; step += 1) {
      const timer = setTimeout(() => {
        const progress = step / steps;
        const dragRect = {
          r1: Math.round(clueCell.row + (next.rect.r1 - clueCell.row) * progress),
          c1: Math.round(clueCell.col + (next.rect.c1 - clueCell.col) * progress),
          r2: Math.round(clueCell.row + (next.rect.r2 - clueCell.row) * progress),
          c2: Math.round(clueCell.col + (next.rect.c2 - clueCell.col) * progress)
        };

        drawRef.current = {
          start: clueCell,
          dragRect,
          baseRegions,
          mode: "paint"
        };
        setDrawnRegions((items) => items.slice());
      }, step * 90);
      hintTimersRef.current.push(timer);
    }

    const finishTimer = setTimeout(() => {
      const hintedRegion = {
        ...makeDrawnRegion(next.id, next.rect, maps.regionMeta),
        countMatched: countFeedbackEnabled()
      };

      drawRef.current = null;
      hintTimersRef.current = [];
      setDrawnRegions(baseRegions.concat(hintedRegion));
      setMoves((value) => value + 1);
      setHintCount((value) => value + 1);
      setHintAnimating(false);
      selectionFeedback();
    }, (steps + 1) * 90);
    hintTimersRef.current.push(finishTimer);
    setStatus("");
  }

  function confirmPaidHint() {
    paidHintConfirmedRef.current = true;
    setPaidHintConfirmed(true);
    setShowPaidHintPrompt(false);
    setTimeout(() => hint(), 0);
  }

  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    setDrawnRegions(previous);
    setStatus("");
    setWon(false);
  }

  function doClearBoard() {
    if (!drawnRegions.length) return;
    setHistory((items) => items.concat([cloneRegions(drawnRegions)]));
    setDrawnRegions([]);
    setStatus("");
    setWon(false);
    setMoves((value) => value + 1);
  }

  function clearBoard() {
    setConfirmPrompt({
      icon: ICONS.erase,
      title: t.clearBoardTitle,
      body: t.clearBoardBody,
      cancelLabel: t.cancel,
      confirmLabel: t.clear,
      onConfirm: doClearBoard
    });
  }

  function restartLevel() {
    setConfirmPrompt({
      icon: ICONS.restart,
      title: t.restartTitle,
      body: t.restartBody,
      cancelLabel: t.cancel,
      confirmLabel: t.start,
      onConfirm: () => resetLevel(levelIndex)
    });
  }

  function packageIsUnlocked(packageName) {
    return unlockedPackages.has(packageName);
  }

  function levelIsUnlocked(index) {
    return unlockedLevels.has(index) && packageIsUnlocked(packageForLevel(index));
  }

  function requestUnlockPackage(packageName) {
    if (packageIsUnlocked(packageName)) return;
    const cost = LAYER_UNLOCK_COSTS[packageName] ?? 0;
    const packageLabel = displayPackageName(packageName, t);
    if (!packageCanBeUnlockedInOrder(packageName, unlockedPackages)) {
      setConfirmPrompt({
        icon: ICONS.layerCoin,
        title: t.layerLockedTitle,
        body: t.layerLockedBody,
        confirmLabel: t.ok,
        notice: true
      });
      return;
    }
    if (layerCoins < cost) {
      setConfirmPrompt({
        icon: ICONS.layerCoin,
        title: t.layerNotEnoughTitle,
        body: t.layerNotEnoughBody(packageLabel, cost, layerCoins),
        confirmLabel: t.ok,
        secondaryLabel: t.shop,
        onSecondary: () => openShop("levels"),
        notice: true
      });
      return;
    }
    setConfirmPrompt({
      icon: ICONS.layerCoin,
      title: t.unlockLayerTitle(packageLabel),
      body: t.unlockLayerBody(cost),
      cancelLabel: t.cancel,
      confirmLabel: t.open,
      onConfirm: () => unlockPackage(packageName)
    });
  }

  function unlockPackage(packageName) {
    if (packageIsUnlocked(packageName)) return;
    if (!packageCanBeUnlockedInOrder(packageName, unlockedPackages)) {
      setStatus(t.needPreviousLayer);
      return;
    }
    const cost = LAYER_UNLOCK_COSTS[packageName] ?? 0;
    if (layerCoins < cost) {
      setStatus(t.layerNotEnoughTitle);
      return;
    }
    setLayerCoins((value) => value - cost);
    setUnlockedPackages((items) => {
      const next = new Set(items);
      next.add(packageName);
      return next;
    });
    setUnlockedLevels((items) => {
      const next = new Set(items);
      next.add(PACKAGE_STARTS[packageName]);
      return next;
    });
    clearTimeout(advanceTimerRef.current);
    setLayerCelebration({ packageName, levelIndex: PACKAGE_STARTS[packageName], openOnMap: false });
    layerCelebrationAnim.setValue(0);
    setScreen("layerCelebration");
    Animated.timing(layerCelebrationAnim, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }

  function lockedLevelsInPackage(packageName) {
    const start = PACKAGE_STARTS[packageName];
    const end = PACKAGE_ENDS[packageName];
    const locked = [];
    for (let index = start; index <= end; index += 1) {
      if (!unlockedLevels.has(index)) locked.push(index);
    }
    return locked;
  }

  function unlockRandomLevel(packageName) {
    if (!packageIsUnlocked(packageName)) return;
    const locked = lockedLevelsInPackage(packageName);
    if (!locked.length) return;
    if (hintCoins < NEXT_LEVEL_COST) {
      return;
    }
    const randomIndex = locked[Math.floor(Math.random() * locked.length)];
    setHintCoins((value) => value - NEXT_LEVEL_COST);
    setUnlockedLevels((items) => {
      const next = new Set(items);
      next.add(randomIndex);
      return next;
    });
    setRecentCompletedLevel(null);
    clearTimeout(advanceTimerRef.current);
    setRecentUnlockedLevel(null);
    setMapInteractionLocked(false);
    setConfirmPrompt({
      icon: ICONS.levels,
      title: t.randomUnlockedTitle(randomIndex + 1),
      body: t.randomUnlockedBody,
      confirmLabel: t.ok,
      notice: true,
      onConfirm: () => {
        clearTimeout(advanceTimerRef.current);
        resetLevel(randomIndex);
      }
    });
    advanceTimerRef.current = setTimeout(() => {
      setConfirmPrompt(null);
      resetLevel(randomIndex);
    }, 950);
  }

  function openLevels(backScreen) {
    setPackageFilter(level.package);
    setLevelsBackScreen(backScreen);
    setScreen("levels");
  }

  function openShop(backScreen) {
    setShopBackScreen(backScreen);
    setScreen("shop");
  }

  function buyRemoveAdsFromHome() {
    const removeAdsPack = SHOP_ITEMS.find((pack) => pack.productId === REMOVE_ADS_PRODUCT_ID);
    if (removeAdsPack) {
      buyShopPack(removeAdsPack);
    }
  }

  async function buyShopPack(pack) {
    tapFeedback();
    if (purchaseInProgress) return;
    if (!iapConnected) {
      Alert.alert(t.purchaseUnavailableTitle, t.purchaseUnavailableBody);
      return;
    }
    if (!iapProductsById[pack.productId]) {
      Alert.alert(t.productUnavailableTitle, t.productUnavailableBody);
      fetchProducts({ skus: SHOP_PRODUCT_IDS, type: "in-app" }).catch((error) => {
        logCrash(error, { componentStack: "iapFetchProductsRetry" });
      });
      return;
    }

    setPurchaseInProgress(pack.id);
    try {
      await requestPurchase({
        type: "in-app",
        request: Platform.OS === "ios"
          ? { apple: { sku: pack.productId } }
          : { google: { skus: [pack.productId] } }
      });
    } catch (error) {
      setPurchaseInProgress(null);
      if (error?.code === ErrorCode.UserCancelled || error?.code === ErrorCode.Pending || error?.code === ErrorCode.DeferredPayment) {
        return;
      }
      logCrash(error, { componentStack: "iapRequestPurchase" });
      Alert.alert(t.purchaseFailedTitle, error?.message || t.purchaseFailedBody);
    }
  }

  async function restoreShopPurchases() {
    tapFeedback();
    if (!iapConnected) {
      Alert.alert(t.purchaseUnavailableTitle, t.purchaseUnavailableBody);
      return;
    }

    try {
      await restoreIapPurchases();
      const purchases = await getAvailablePurchases();
      const hasRemoveAds = purchases.some((purchase) => purchase.productId === REMOVE_ADS_PRODUCT_ID);
      if (hasRemoveAds) {
        setNoAdsPurchased(true);
        Alert.alert(t.adsRemovedTitle, t.adsRemovedBody);
      } else {
        Alert.alert(t.restoreNotFoundTitle, t.restoreNotFoundBody);
      }
    } catch (error) {
      logCrash(error, { componentStack: "iapRestorePurchases" });
      Alert.alert(t.purchaseFailedTitle, error?.message || t.purchaseFailedBody);
    }
  }

  function openRequiredUpdate() {
    Linking.openURL(requiredUpdate?.url || STORE_URL).catch((error) => {
      logCrash(error, { componentStack: "openRequiredUpdate" });
    });
  }

  function startFromHome() {
    if (!introSeen) {
      setScreen("intro");
      return;
    }
    setScreen("game");
  }

  function finishIntro() {
    setIntroSeen(true);
    resetLevel(0);
    setScreen("game");
  }

  function chooseLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setLanguagePromptSeen(true);
  }

  const settingsProps = {
    theme,
    t,
    language,
    musicEnabled,
    soundEnabled,
    hapticsEnabled,
    onLanguage: chooseLanguage,
    onMusic: setMusicEnabled,
    onSound: setSoundEnabled,
    onHaptics: setHapticsEnabled,
    onClose: () => setSettingsOpen(false)
  };

  if (requiredUpdate) {
    return (
      <RequiredUpdateScreen
        t={t}
        title={requiredUpdate.title}
        body={requiredUpdate.body}
        onUpdate={openRequiredUpdate}
      />
    );
  }

  if (showSplash || !storageReady || !updateReady || !mapCacheReady) {
    const splashProgress = !updateReady ? updateProgress : loadingProgress;
    const splashMessage = !updateReady && storageReady ? t.updatingGameBody : "";
    return <SplashScreen progress={splashAnim} loadingProgress={splashProgress} message={splashMessage} t={t} />;
  }

  if (screen === "levels") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <LevelMapScreen
          levels={levels}
          levelMapCache={levelMapCache}
          t={t}
          unlockedLevels={unlockedLevels}
          completedLevels={completedLevels}
          levelStars={levelStars}
          unlockedPackages={unlockedPackages}
          levelIndex={levelIndex}
          packageFilter={packageFilter}
          hintCoins={hintCoins}
          layerCoins={layerCoins}
          transitionAnim={mapTransitionAnim}
          pulseAnim={mapPulseAnim}
          recentCompletedLevel={recentCompletedLevel}
          recentUnlockedLevel={recentUnlockedLevel}
          interactionLocked={mapInteractionLocked}
          onBack={() => {
            if (!mapInteractionLocked) setScreen(levelsBackScreen);
          }}
          onPackageFilter={(value) => {
            if (!mapInteractionLocked) setPackageFilter(value);
          }}
          onSelect={(index) => {
            if (!mapInteractionLocked && levelIsUnlocked(index)) resetLevel(index);
          }}
          onUnlockPackage={(value) => {
            if (!mapInteractionLocked) requestUnlockPackage(value);
          }}
          onUnlockRandom={(value) => {
            if (!mapInteractionLocked) unlockRandomLevel(value);
          }}
          onSettings={() => setSettingsOpen(true)}
        />
        {settingsOpen ? <SettingsOverlay {...settingsProps} theme={themeForPackage(packageFilter)} /> : null}
        {confirmPrompt ? (
          <ConfirmPrompt
            theme={themeForPackage(packageFilter)}
            prompt={confirmPrompt}
            onCancel={() => setConfirmPrompt(null)}
            onConfirm={() => {
              const action = confirmPrompt.onConfirm;
              setConfirmPrompt(null);
              action?.();
            }}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  if (screen === "home") {
    const homeOpacity = homeEntryAnim;
    const homeTranslateY = homeEntryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 0]
    });
    const homeScale = homeEntryAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.985, 1]
    });

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <Animated.View
          style={[
            styles.screenEntry,
            {
              opacity: homeOpacity,
              transform: [{ translateY: homeTranslateY }, { scale: homeScale }]
            }
          ]}
        >
          <HomeScreen
            level={level}
            levelIndex={levelIndex}
            levels={levels}
            theme={theme}
            t={t}
            introSeen={introSeen}
            onStart={startFromHome}
            onLevels={() => openLevels("home")}
            onShop={() => openShop("home")}
            onRemoveAds={buyRemoveAdsFromHome}
            onSettings={() => setSettingsOpen(true)}
            noAdsPurchased={noAdsPurchased}
          />
        </Animated.View>
        {!languagePromptSeen ? (
          <LanguageChoicePrompt theme={theme} t={TRANSLATIONS.en} onSelect={chooseLanguage} />
        ) : null}
        {settingsOpen ? <SettingsOverlay {...settingsProps} /> : null}
      </SafeAreaView>
    );
  }

  if (screen === "shop") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ShopScreen
          theme={theme}
          t={t}
          hintCoins={hintCoins}
          layerCoins={layerCoins}
          onBack={() => setScreen(shopBackScreen)}
          onBuy={buyShopPack}
          onRestore={restoreShopPurchases}
          productsById={iapProductsById}
          purchaseInProgress={purchaseInProgress}
          noAdsPurchased={noAdsPurchased}
        />
        {settingsOpen ? <SettingsOverlay {...settingsProps} /> : null}
      </SafeAreaView>
    );
  }

  if (screen === "intro") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <IntroTutorialScreen theme={theme} t={t} onDone={finishIntro} />
      </SafeAreaView>
    );
  }

  if (screen === "reward" && rewardSummary) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <RewardScreen
          summary={rewardSummary}
          progress={rewardAnim}
          theme={theme}
          t={t}
          onDouble={doubleReward}
          onContinue={continueAfterReward}
          noAdsPurchased={noAdsPurchased}
        />
      </SafeAreaView>
    );
  }

  if (screen === "warmupComplete" && warmupSummary) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={theme.statusBar} />
        <WarmupCompleteScreen
          summary={warmupSummary}
          theme={theme}
          t={t}
          onContinue={continueAfterWarmup}
        />
      </SafeAreaView>
    );
  }

  if (screen === "layerCelebration" && layerCelebration) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeForPackage(layerCelebration.packageName).background }]}>
        <StatusBar barStyle={themeForPackage(layerCelebration.packageName).statusBar} />
        <LayerCelebrationScreen
          packageName={layerCelebration.packageName}
          progress={layerCelebrationAnim}
          theme={themeForPackage(layerCelebration.packageName)}
          t={t}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} />
      <View
        style={[
          styles.app,
          {
            backgroundColor: theme.background,
            paddingTop: 10 + systemTopPadding,
            paddingBottom: 18 + systemBottomPadding
          }
        ]}
      >
        <View style={styles.topbar}>
          <View style={styles.topNavRow}>
            <View style={styles.topIconGroup}>
              <IconButton icon={ICONS.home} label={t.home} onPress={() => setScreen("home")} theme={theme} />
              <IconButton icon={ICONS.levels} label={t.levels} onPress={() => openLevels("game")} dark theme={theme} />
            </View>
            <View style={styles.topIconGroup}>
              <IconButton icon={ICONS.shop} label={t.shop} onPress={() => openShop("game")} theme={theme} />
              <SettingsIconButton label={t.settings} onPress={() => setSettingsOpen(true)} theme={theme} />
            </View>
          </View>
          <View style={styles.topbarText}>
            <Text style={[styles.title, { color: theme.title }]}>Puzzle Area</Text>
            <View style={styles.levelMoveRow}>
              <Text style={[styles.levelTitle, { color: theme.muted }]}>
                {t.level} {levelIndex + 1}
              </Text>
              <Text style={[styles.topMoveText, { color: theme.muted }]}>{t.move} {moves}</Text>
            </View>
            <View style={styles.currencyRow}>
              <CurrencyPill icon={ICONS.layerCoin} value={layerCoins} theme={theme} />
              <CurrencyPill icon={ICONS.hintCoin} value={hintCoins} theme={theme} />
              <HintActionButton label={t.hint} icon={ICONS.hint} badge={hintBadge} onPress={hint} theme={theme} />
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.boardWrap,
            {
              paddingTop: tallBoardTopOffset,
              opacity: transitionAnim,
              transform: [
                {
                  translateY: transitionAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0]
                  })
                },
                { scale: boardAnim }
              ]
            }
          ]}
        >
          <Animated.View
            ref={boardRef}
            {...panResponder.panHandlers}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              updateBoardFrame(width, height);
            }}
            style={[styles.board, { width: boardWidth, height: boardHeight }]}
          >
            {regions.map((region) => (
              <BoardRegion
                key={region.id}
                region={region}
                level={level}
                boardSize={boardSize}
                countMatched={region.countMatched}
                theme={theme}
              />
            ))}
            {Array.from({ length: level.rows }).map((_, row) =>
              Array.from({ length: level.cols }).map((__, col) => {
                const cellKey = key(row, col);
                if (!levelHasCell(level, cellKey)) return null;
                const clueId = maps.clueByCell.get(cellKey);
                const mark = marks.get(cellKey);
                const completedMark = completedMarks.get(cellKey);
                const previewMark = previewMarks.get(cellKey);
                const hideCell = completedMark && (!previewMark || completedMark === previewMark);
                const spark = sparkCells.has(cellKey);

                return (
                  <View
                    key={cellKey}
                    pointerEvents="none"
                    style={[
                      styles.cell,
                      {
                        width: cellWidth,
                        height: cellHeight,
                        left: col * (cellWidth + GAP),
                        top: row * (cellHeight + GAP),
                        backgroundColor: hideCell ? "transparent" : mark ? withHexOpacity(theme.cell, "9a") : theme.cell,
                        borderColor: hideCell ? "transparent" : mark ? withHexOpacity(theme.cellBorder, "a8") : theme.cellBorder,
                        borderWidth: hideCell ? 0 : 1,
                        padding: cellPadding,
                        borderRadius: theme.radius
                      }
                    ]}
                  >
                    {clueId ? (
                      <Text
                        allowFontScaling={false}
                        numberOfLines={1}
                        style={[
                          styles.number,
                          {
                            color: hideCell ? theme.filledNumber : theme.number,
                            fontSize: numberFontSize,
                            lineHeight: numberFontSize + 2
                          }
                        ]}
                      >
                        {maps.regionMeta.get(clueId).value}
                      </Text>
                    ) : null}
                    {spark ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.sparkCell,
                          {
                            borderRadius: Math.max(2, theme.radius - 2),
                            backgroundColor: theme.win
                          }
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.flashLayer,
                {
                  opacity: flashAnim,
                  backgroundColor: theme.win,
                  borderRadius: theme.radius
                }
              ]}
            />
          </Animated.View>
          <Text style={[styles.status, { color: won ? theme.win : theme.muted }]}>{status}</Text>
        </Animated.View>

        {showPaidHintPrompt ? (
          <PaidHintPrompt
            theme={theme}
            cost={HINT_USE_COST}
            t={t}
            onCancel={() => setShowPaidHintPrompt(false)}
            onConfirm={confirmPaidHint}
          />
        ) : null}
        {confirmPrompt ? (
          <ConfirmPrompt
            theme={theme}
            prompt={confirmPrompt}
            onCancel={() => setConfirmPrompt(null)}
            onConfirm={() => {
              const action = confirmPrompt.onConfirm;
              setConfirmPrompt(null);
              action?.();
            }}
          />
        ) : null}
        {settingsOpen ? <SettingsOverlay {...settingsProps} /> : null}
      </View>
    </SafeAreaView>
  );
}

function IntroTutorialScreen({ theme, t, onDone }) {
  const drawAnim = useRef(new Animated.Value(0)).current;
  const doneTimerRef = useRef(null);
  const animationRef = useRef(null);
  const [introStep, setIntroStep] = useState(0);
  const [introRepeat, setIntroRepeat] = useState(0);
  const [lockedIntroRegions, setLockedIntroRegions] = useState([]);
  const [introReady, setIntroReady] = useState(false);

  const introTargets = useMemo(
    () => [
      {
        value: 2,
        clue: { row: 0, col: 0 },
        rect: { r1: 0, c1: 0, r2: 0, c2: 1 },
        color: theme.regionPalette[1]
      },
      {
        value: 3,
        clue: { row: 1, col: 2 },
        rect: { r1: 0, c1: 2, r2: 2, c2: 2 },
        color: theme.regionPalette[3]
      },
      {
        value: 4,
        clue: { row: 2, col: 0 },
        rect: { r1: 1, c1: 0, r2: 2, c2: 1 },
        color: theme.regionPalette[4]
      }
    ],
    [theme.regionPalette]
  );

  const activeTarget = introTargets[introStep] || introTargets[introTargets.length - 1];

  function introRectStyle(target) {
    const { rect } = target;
    return {
      left: rect.c1 * (INTRO_CELL + INTRO_GAP),
      top: rect.r1 * (INTRO_CELL + INTRO_GAP),
      width: (rect.c2 - rect.c1 + 1) * INTRO_CELL + (rect.c2 - rect.c1) * INTRO_GAP,
      height: (rect.r2 - rect.r1 + 1) * INTRO_CELL + (rect.r2 - rect.r1) * INTRO_GAP
    };
  }

  useEffect(() => {
    let cancelled = false;

    function runTarget(targetIndex, repeatIndex) {
      if (cancelled) return;
      if (targetIndex >= introTargets.length) {
        setIntroReady(true);
        doneTimerRef.current = setTimeout(onDone, 1700);
        return;
      }

      setIntroStep(targetIndex);
      setIntroRepeat(repeatIndex);
      drawAnim.setValue(0);
      animationRef.current = Animated.sequence([
        Animated.timing(drawAnim, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false
        }),
        Animated.delay(260)
      ]);
      animationRef.current.start(() => {
        if (cancelled) return;
        if (repeatIndex < 2) {
          runTarget(targetIndex, repeatIndex + 1);
          return;
        }

        const target = introTargets[targetIndex];
        setLockedIntroRegions((items) => items.concat([{ ...target, id: `intro-${targetIndex}` }]));
        doneTimerRef.current = setTimeout(() => runTarget(targetIndex + 1, 0), 320);
      });
    }

    runTarget(0, 0);
    return () => {
      cancelled = true;
      animationRef.current?.stop();
      clearTimeout(doneTimerRef.current);
    };
  }, [drawAnim, introTargets, onDone]);

  const activeRect = introRectStyle(activeTarget);
  const clueLeft = activeTarget.clue.col * (INTRO_CELL + INTRO_GAP);
  const clueTop = activeTarget.clue.row * (INTRO_CELL + INTRO_GAP);
  const animatedLeft = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [clueLeft, activeRect.left]
  });
  const animatedTop = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [clueTop, activeRect.top]
  });
  const animatedWidth = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [INTRO_CELL, activeRect.width]
  });
  const animatedHeight = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [INTRO_CELL, activeRect.height]
  });
  const fingerLeft = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [clueLeft + INTRO_CELL * 0.4, activeRect.left + activeRect.width - INTRO_CELL * 0.6]
  });
  const fingerTop = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [clueTop + INTRO_CELL * 0.4, activeRect.top + activeRect.height - INTRO_CELL * 0.6]
  });
  const pulseOpacity = drawAnim.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.35, 1, 1]
  });

  return (
    <View style={[styles.introScreen, { backgroundColor: theme.background }]}>
      <View style={styles.introHeader}>
        <Text style={[styles.introTitle, { color: theme.title }]}>{introReady ? t.readyTitle : t.tryTitle}</Text>
        <Text style={[styles.introSubtitle, { color: theme.muted }]}>
          {introReady ? t.readyBody : t.introLeft}
        </Text>
      </View>

      <View style={[styles.introBoardShell, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <View style={styles.introBoard} pointerEvents="none">
          {!introReady ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.introSelection,
                  {
                    left: animatedLeft,
                    top: animatedTop,
                    width: animatedWidth,
                    height: animatedHeight,
                    opacity: pulseOpacity,
                    backgroundColor: activeTarget.color,
                    borderRadius: theme.radius
                  }
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.introFinger,
                  {
                    left: fingerLeft,
                    top: fingerTop,
                    backgroundColor: theme.button,
                    borderColor: theme.buttonText
                  }
                ]}
              />
            </>
          ) : null}
          {lockedIntroRegions.map((region) => (
            <View
              key={region.id}
              pointerEvents="none"
              style={[
                styles.introSelection,
                {
                  ...introRectStyle(region),
                  backgroundColor: region.color,
                  borderRadius: theme.radius,
                  opacity: 1
                }
              ]}
            />
          ))}
          {Array.from({ length: INTRO_GRID_SIZE * INTRO_GRID_SIZE }).map((_, item) => {
            const row = Math.floor(item / INTRO_GRID_SIZE);
            const col = item % INTRO_GRID_SIZE;
            const clue = introTargets.find((target) => target.clue.row === row && target.clue.col === col);
            return (
            <View
              key={item}
              style={[
                styles.introCell,
                {
                  borderColor: theme.cellBorder,
                  borderRadius: theme.radius,
                    left: col * (INTRO_CELL + INTRO_GAP),
                    top: row * (INTRO_CELL + INTRO_GAP)
                }
              ]}
            >
                {clue ? (
                  <Text style={[styles.introNumber, { color: theme.number }]}>{clue.value}</Text>
              ) : null}
            </View>
            );
          })}
        </View>
        <Text style={[styles.introHint, { color: theme.muted }]}>
          {introReady ? t.introDone : `${t.introAutoStep(activeTarget.value)} ${introRepeat + 1}/3`}
        </Text>
      </View>

      <View style={[styles.introHowToCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Text style={[styles.introHowToText, { color: theme.title }]}>
          {t.introHowTo}
        </Text>
      </View>

      <Pressable
        disabled={!introReady}
        onPress={() => {
          onDone();
          tapFeedback();
        }}
        style={({ pressed }) => [
          styles.introStartButton,
          {
            backgroundColor: theme.button,
            borderRadius: theme.radius,
            opacity: !introReady ? 0.42 : pressed ? 0.86 : 1
          }
        ]}
      >
        <Text style={[styles.introStartText, { color: theme.buttonText }]}>{introReady ? t.firstLevel : t.markFirst}</Text>
      </Pressable>
    </View>
  );
}

function GameCoachOverlay({ step, steps, theme, t, onNext }) {
  const item = steps[step];
  const last = step >= steps.length - 1;
  const pointsUp = item.target.top !== undefined;

  return (
    <View style={styles.coachOverlay}>
      <View pointerEvents="none" style={[styles.coachPointer, item.target]}>
        <View
          style={[
            styles.coachArrowTriangle,
            pointsUp ? styles.coachArrowTriangleUp : styles.coachArrowTriangleDown,
            pointsUp ? { borderBottomColor: theme.button } : { borderTopColor: theme.button }
          ]}
        />
        <View style={[styles.coachPointerPulse, { borderColor: theme.button }]} />
      </View>
      <View style={[styles.coachCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Text style={[styles.coachStepText, { color: theme.muted }]}>
          {step + 1} / {steps.length}
        </Text>
        <Text style={[styles.coachTitle, { color: theme.title }]}>{item.title}</Text>
        <Text style={[styles.coachBody, { color: theme.muted }]}>{item.text}</Text>
        <Pressable
          onPress={() => {
            tapFeedback();
            onNext();
          }}
          style={({ pressed }) => [
            styles.coachButton,
            { backgroundColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
          ]}
        >
          <Text style={[styles.coachButtonText, { color: theme.buttonText }]}>{last ? t.coachDone : t.next}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaidHintPrompt({ theme, cost, t, onCancel, onConfirm }) {
  return (
    <View style={styles.paidHintOverlay}>
      <View style={[styles.paidHintCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Image source={ICONS.hint} style={styles.paidHintIcon} resizeMode="contain" />
        <Text style={[styles.paidHintTitle, { color: theme.title }]}>{t.paidHintTitle}</Text>
        <Text style={[styles.paidHintBody, { color: theme.muted }]}>
          {t.paidHintBody(cost)}
        </Text>
        <View style={styles.paidHintCost}>
          <Text style={[styles.paidHintCostText, { color: theme.title }]}>{cost}</Text>
          <Image source={ICONS.hintCoin} style={styles.paidHintCoin} resizeMode="contain" />
        </View>
        <View style={styles.paidHintActions}>
          <Pressable
            onPress={() => {
              tapFeedback();
              onCancel();
            }}
            style={({ pressed }) => [
              styles.paidHintButton,
              { borderColor: theme.cellBorder, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
            ]}
          >
            <Text style={[styles.paidHintButtonText, { color: theme.title }]}>{t.cancel}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              tapFeedback();
              onConfirm();
            }}
            style={({ pressed }) => [
              styles.paidHintButton,
              { backgroundColor: theme.button, borderColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
            ]}
          >
            <Text style={[styles.paidHintButtonText, { color: theme.buttonText }]}>{t.continue}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ConfirmPrompt({ theme, prompt, onCancel, onConfirm }) {
  const singleAction = prompt.notice && !prompt.secondaryLabel;
  return (
    <View style={styles.paidHintOverlay}>
      <View style={[styles.paidHintCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Image source={prompt.icon} style={styles.paidHintIcon} resizeMode="contain" />
        <Text style={[styles.paidHintTitle, { color: theme.title }]}>{prompt.title}</Text>
        <Text style={[styles.paidHintBody, { color: theme.muted }]}>{prompt.body}</Text>
        <View style={styles.paidHintActions}>
          {singleAction ? null : (
            <Pressable
              onPress={() => {
                tapFeedback();
                onCancel();
              }}
              style={({ pressed }) => [
                styles.paidHintButton,
                { borderColor: theme.cellBorder, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
              ]}
            >
              <Text style={[styles.paidHintButtonText, { color: theme.title }]}>
                {prompt.secondaryLabel ? prompt.confirmLabel : prompt.cancelLabel || "Vazgeç"}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              tapFeedback();
              if (prompt.secondaryLabel && prompt.onSecondary) {
                onCancel();
                prompt.onSecondary();
              } else {
                onConfirm();
              }
            }}
            style={({ pressed }) => [
              styles.paidHintButton,
              { backgroundColor: theme.button, borderColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
            ]}
          >
            <Text style={[styles.paidHintButtonText, { color: theme.buttonText }]}>
              {prompt.secondaryLabel || prompt.confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RewardScreen({ summary, progress, theme, t, onDouble, onContinue, noAdsPurchased }) {
  const [displayCoins, setDisplayCoins] = useState({
    hint: summary.hintBefore,
    layer: summary.layerBefore
  });
  const [continueReady, setContinueReady] = useState(!summary.delayContinue);
  const continueAnim = useRef(new Animated.Value(summary.delayContinue ? 0 : 1)).current;
  const exitAnim = useRef(new Animated.Value(0)).current;
  const isLeavingRef = useRef(false);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setDisplayCoins({
        hint: Math.round(summary.hintBefore + summary.hintReward * value),
        layer: Math.round(summary.layerBefore + summary.layerReward * value)
      });
    });
    return () => progress.removeListener(id);
  }, [progress, summary]);

  useEffect(() => {
    if (!summary.doubled) return;
    setDisplayCoins({
      hint: summary.hintBefore + summary.hintReward,
      layer: summary.layerBefore + summary.layerReward
    });
  }, [summary.doubled, summary.hintBefore, summary.hintReward, summary.layerBefore, summary.layerReward]);

  useEffect(() => {
    let timer = null;
    isLeavingRef.current = false;
    exitAnim.setValue(0);
    continueAnim.stopAnimation();
    if (!summary.delayContinue) {
      setContinueReady(true);
      continueAnim.setValue(1);
      return undefined;
    }

    setContinueReady(false);
    continueAnim.setValue(0);
    timer = setTimeout(() => {
      setContinueReady(true);
      Animated.timing(continueAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    }, 3000);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [continueAnim, exitAnim, summary.delayContinue, summary.levelIndex]);

  const cardScale = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.94, 1.04, 1]
  });
  const fadeUp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0]
  });
  const canDouble = summary.offerDouble && !summary.doubled && (summary.hintReward > 0 || summary.layerReward > 0);
  const continueTranslateY = continueAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0]
  });
  const exitOpacity = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });
  const exitTranslateY = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -26]
  });
  const exitScale = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96]
  });
  const rewardTheme = rewardPaletteForTheme(theme);
  const handleContinue = useCallback(() => {
    if (!continueReady || isLeavingRef.current) return;
    isLeavingRef.current = true;
    tapFeedback();
    Animated.timing(exitAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start(() => onContinue());
  }, [continueReady, exitAnim, onContinue]);

  return (
    <View style={[styles.rewardScreen, { backgroundColor: rewardTheme.background }]}>
      <RewardBackdrop theme={theme} />
      <Animated.View
        style={[
          styles.rewardStage,
          {
            opacity: exitOpacity,
            transform: [{ translateY: exitTranslateY }, { scale: exitScale }]
          }
        ]}
      >
      <Animated.View
        style={[
          styles.rewardCard,
          {
            backgroundColor: rewardTheme.surface,
            borderColor: rewardTheme.border,
            opacity: progress,
            transform: [{ translateY: fadeUp }, { scale: cardScale }]
          }
        ]}
      >
        <View pointerEvents="none" style={[styles.rewardCardTopGlow, { backgroundColor: withHexOpacity(rewardTheme.accent, "28") }]} />
        <View pointerEvents="none" style={[styles.rewardCardAccent, { backgroundColor: rewardTheme.accent }]} />
        <Text style={[styles.rewardTitle, { color: rewardTheme.title }]}>{t.completedTitle}</Text>
        <Text style={[styles.rewardSubtitle, { color: rewardTheme.muted }]}>
          {summary.wasCompleted ? t.completedAgain : t.rewardsAdding}
        </Text>
        <View style={styles.rewardTitleRule}>
          <View style={[styles.rewardTitleRuleLine, { backgroundColor: rewardTheme.border }]} />
          <View style={[styles.rewardTitleRuleGem, { backgroundColor: rewardTheme.accent, borderColor: rewardTheme.border }]} />
          <View style={[styles.rewardTitleRuleLine, { backgroundColor: rewardTheme.border }]} />
        </View>
        <RewardStars summary={summary} progress={progress} rewardTheme={rewardTheme} t={t} />
        <View style={[styles.rewardCoinPanel, { borderColor: rewardTheme.border, backgroundColor: rewardTheme.panel }]}>
          <View pointerEvents="none" style={styles.rewardCoinPanelShine} />
          <RewardCoinChip icon={ICONS.hintCoin} label={t.hintCoin} reward={summary.hintReward} displayValue={displayCoins.hint} theme={theme} rewardTheme={rewardTheme} />
          <View style={[styles.rewardCoinDivider, { backgroundColor: rewardTheme.border }]} />
          <RewardCoinChip icon={ICONS.layerCoin} label={t.layerCoin} reward={summary.layerReward} displayValue={displayCoins.layer} theme={theme} rewardTheme={rewardTheme} />
        </View>
        {summary.offerDouble ? (
          <Pressable
            disabled={!canDouble}
            onPress={() => {
              tapFeedback();
              onDouble();
            }}
            style={({ pressed }) => [
              styles.rewardDoubleButton,
              {
                backgroundColor: canDouble ? rewardTheme.double : theme.cellBorder,
                borderColor: canDouble ? rewardTheme.doubleBorder : rewardTheme.border,
                borderRadius: Math.max(16, theme.radius + 8),
                opacity: !canDouble ? 0.55 : pressed ? 0.86 : 1
              }
            ]}
          >
            <View style={styles.rewardDoubleContent}>
              <View style={[styles.rewardDoubleBadge, { backgroundColor: rewardTheme.surface, borderColor: rewardTheme.doubleBorder }]}>
                <Text style={[styles.rewardDoubleBadgeText, { color: theme.button }]}>{summary.doubled ? "2x" : "2x"}</Text>
              </View>
              <Text style={[styles.rewardDoubleText, { color: canDouble ? rewardTheme.buttonText : rewardTheme.muted }]}>
                {summary.doubled ? t.got2x : noAdsPurchased ? t.claim2x : t.watch2x}
              </Text>
            </View>
          </Pressable>
        ) : null}
        <Animated.View
          pointerEvents={continueReady ? "auto" : "none"}
          style={{
            width: "100%",
            opacity: continueAnim,
            transform: [{ translateY: continueTranslateY }]
          }}
        >
          <Pressable
            disabled={!continueReady}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.rewardContinueButton,
              {
                backgroundColor: rewardTheme.continue,
                borderColor: rewardTheme.continueBorder,
                borderRadius: Math.max(15, theme.radius + 7),
                opacity: !continueReady ? 0 : pressed ? 0.86 : 1
              }
            ]}
          >
            <Text style={[styles.rewardContinueText, { color: rewardTheme.buttonText }]}>{t.continue}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
      </Animated.View>
    </View>
  );
}

function RewardCardCap({ color, borderColor }) {
  return (
    <View pointerEvents="none" style={styles.rewardCardCap}>
      <View style={[styles.rewardCardCapWing, styles.rewardCardCapWingLeft, { backgroundColor: color, borderColor }]} />
      <View style={[styles.rewardCardCapMain, { backgroundColor: color, borderColor }]}>
        <View style={styles.rewardCardCapHighlight} />
      </View>
      <View style={[styles.rewardCardCapWing, styles.rewardCardCapWingRight, { backgroundColor: color, borderColor }]} />
    </View>
  );
}

function RewardBackdrop({ theme }) {
  const colors = theme.regionPalette;
  const blocks = [
    { top: "8%", left: "10%", width: "34%", height: 64, color: colors[0], rotate: "-8deg" },
    { top: "17%", right: "8%", width: "28%", height: 112, color: colors[1], rotate: "7deg" },
    { top: "39%", left: "-4%", width: "42%", height: 88, color: colors[2], rotate: "4deg" },
    { bottom: "20%", right: "-7%", width: "46%", height: 96, color: colors[3], rotate: "-6deg" },
    { bottom: "8%", left: "12%", width: "31%", height: 68, color: colors[4], rotate: "9deg" }
  ];

  return (
    <View pointerEvents="none" style={styles.rewardBackdrop}>
      <Image source={ICONS.rewardCompleteReference} style={styles.rewardBackdropImage} resizeMode="cover" blurRadius={5} />
      <View style={styles.rewardBackdropTint} />
      {blocks.map((block, index) => (
        <View
          key={`${block.color}-${index}`}
          style={[
            styles.rewardBackdropBlock,
            {
              top: block.top,
              bottom: block.bottom,
              left: block.left,
              right: block.right,
              width: block.width,
              height: block.height,
              backgroundColor: block.color,
              borderRadius: theme.radius + 12,
              transform: [{ rotate: block.rotate }]
            }
          ]}
        />
      ))}
      <View style={[styles.rewardGlow, { backgroundColor: withHexOpacity(theme.button, "18") }]} />
    </View>
  );
}

function WarmupCompleteScreen({ summary, theme, t, onContinue }) {
  const packageLabel = displayPackageName(summary.packageName, t);
  return (
    <View style={[styles.warmupScreen, { backgroundColor: theme.background }]}>
      <View style={[styles.warmupCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <View style={styles.warmupMark}>
          {theme.regionPalette.slice(0, 4).map((color) => (
            <View key={color} style={[styles.warmupTile, { backgroundColor: color, borderRadius: theme.radius }]} />
          ))}
        </View>
        <Text style={[styles.warmupTitle, { color: theme.title }]}>{t.warmupTitle}</Text>
        <Text style={[styles.warmupBody, { color: theme.muted }]}>
          {t.warmupBody1(summary.hintReward)}
        </Text>
        <Text style={[styles.warmupBody, { color: theme.muted }]}>
          {t.warmupBody2}
        </Text>
        <View style={[styles.warmupCost, { borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
          <Text style={[styles.warmupCostText, { color: theme.title }]}>{t.openingPackage(packageLabel)}</Text>
          <View style={styles.warmupCoinRow}>
            <Text style={[styles.warmupCoinText, { color: theme.title }]}>-{summary.cost}</Text>
            <Image source={ICONS.layerCoin} style={styles.warmupCoinIcon} resizeMode="contain" />
          </View>
        </View>
        <Pressable
          onPress={() => {
            tapFeedback();
            onContinue();
          }}
          style={({ pressed }) => [
            styles.warmupButton,
            { backgroundColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
          ]}
        >
          <Text style={[styles.warmupButtonText, { color: theme.buttonText }]}>{t.continue}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RewardStars({ summary, progress, rewardTheme, t }) {
  const label = summary.earnedStars === 3
    ? t.perfectStars
    : summary.earnedStars === 2
      ? t.goodStars
      : t.completedStars;

  return (
    <View style={[styles.rewardStarsPanel, { backgroundColor: rewardTheme.starPanel, borderColor: rewardTheme.border }]}>
      <View pointerEvents="none" style={styles.rewardStarsHalo} />
      <View pointerEvents="none" style={[styles.rewardStarsCorner, styles.rewardStarsCornerLeft, { borderColor: rewardTheme.border }]} />
      <View pointerEvents="none" style={[styles.rewardStarsCorner, styles.rewardStarsCornerRight, { borderColor: rewardTheme.border }]} />
      <Text style={[styles.rewardStarsLabel, { color: rewardTheme.muted }]}>{t.starsEarned}</Text>
      <AnimatedStarRating value={summary.earnedStars} summaryKey={`${summary.levelIndex}-${summary.moves}-${summary.earnedStars}`} size={55} gap={2} />
      <Text style={[styles.rewardStarsMeta, { color: rewardTheme.title }]}>
        {label} · {summary.moves} {t.move.toLowerCase()}
      </Text>
      {summary.bestStars > summary.previousStars ? (
        <Text style={styles.rewardStarsBest}>{t.bestStars}</Text>
      ) : null}
    </View>
  );
}

function RewardCoinChip({ icon, label, reward, displayValue, theme, rewardTheme }) {
  return (
    <View style={styles.rewardCoinChip}>
      <Image source={icon} style={styles.rewardCoinIcon} resizeMode="contain" />
      <View style={styles.rewardCoinTextBlock}>
        <Text numberOfLines={1} style={[styles.rewardCoinLabel, { color: rewardTheme.muted }]}>{label}</Text>
        <Text style={[styles.rewardCoinGain, { color: reward ? theme.win : theme.muted }]}>+{reward}</Text>
      </View>
      <Text style={[styles.rewardCoinBalance, { color: rewardTheme.title }]}>{displayValue}</Text>
    </View>
  );
}

function RewardRow({ icon, label, reward, displayValue, theme }) {
  return (
    <View style={[styles.rewardRow, { borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
      <Image source={icon} style={styles.rewardIcon} resizeMode="contain" />
      <View style={styles.rewardTextBlock}>
        <Text style={[styles.rewardLabel, { color: theme.title }]}>{label}</Text>
        <Text style={[styles.rewardGain, { color: reward ? theme.win : theme.muted }]}>+{reward}</Text>
      </View>
      <Text style={[styles.rewardBalance, { color: theme.title }]}>
        {displayValue}
      </Text>
    </View>
  );
}

function AnimatedStarRating({ value, summaryKey, size = 38, gap = 5 }) {
  const starAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    let mounted = true;
    starAnims.forEach((anim) => anim.setValue(0));
    const animation = Animated.sequence([
      Animated.delay(330),
      Animated.stagger(
        380,
        starAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: index < value ? 1 : 0,
            duration: 880,
            easing: Easing.out(Easing.back(1.65)),
            useNativeDriver: true
          })
        )
      )
    ]);
    animation.start(() => {
      mounted = false;
    });
    return () => {
      if (mounted) {
        animation.stop();
      }
      starAnims.forEach((anim) => anim.stopAnimation());
    };
  }, [starAnims, summaryKey, value]);

  return (
    <View style={[styles.starRating, { gap }]}>
      {[1, 2, 3].map((star, index) => {
        const anim = starAnims[index];
        const scale = anim.interpolate({
          inputRange: [0, 0.2, 0.72, 1],
          outputRange: [0.28, 0.72, 1.18, 1]
        });
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0]
        });
        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["-13deg", "0deg"]
        });
        return (
          <View
            key={star}
            style={styles.rewardStarAssetWrap}
          >
            <Image
              source={ICONS.rewardStarEmpty}
              style={[
                styles.rewardStarAsset,
                styles.rewardStarAssetEmpty,
                {
                  width: size + 18,
                  height: size + 18
                }
              ]}
              resizeMode="contain"
            />
            <Animated.Image
              source={ICONS.rewardStar}
              style={[
                styles.rewardStarAsset,
                styles.rewardStarAssetFilled,
                {
                  width: size + 18,
                  height: size + 18,
                  opacity: anim,
                  transform: [{ translateY }, { scale }, { rotate }]
                }
              ]}
              resizeMode="contain"
            />
          </View>
        );
      })}
    </View>
  );
}

function StarRating({ value, size = 20, gap = 3, theme, dimColor = "rgba(104,113,124,0.24)" }) {
  return (
    <View style={[styles.starRating, { gap }]}>
      {[1, 2, 3].map((star) => (
        <Text
          key={star}
          style={[
            styles.starText,
            {
              color: star <= value ? "#f4c430" : dimColor,
              fontSize: size,
              lineHeight: size + 3,
              textShadowColor: star <= value ? "rgba(244,196,48,0.36)" : "transparent",
              textShadowRadius: star <= value ? 8 : 0
            }
          ]}
        >
          {star <= value ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

function MiniStarRating({ value, active, theme }) {
  if (!value) {
    return <View style={styles.mapCardStarsPlaceholder} />;
  }
  return (
    <View style={styles.mapCardStars}>
      <StarRating
        value={value}
        size={12}
        gap={1}
        theme={theme}
        dimColor={active ? "rgba(255,255,255,0.34)" : "rgba(104,113,124,0.22)"}
      />
    </View>
  );
}

function LayerCelebrationScreen({ packageName, progress, theme, t }) {
  const packageLabel = displayPackageName(packageName, t);
  const scale = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0.88, 1.08, 1]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  return (
    <View style={[styles.layerCelebrationScreen, { backgroundColor: theme.background }]}>
      <Animated.View
        style={[
          styles.layerCelebrationCard,
          {
            backgroundColor: theme.cell,
            borderColor: theme.cellBorder,
            borderRadius: theme.radius,
            opacity: progress,
            transform: [{ scale }, { translateY }]
          }
        ]}
      >
        <View style={styles.layerCelebrationMark}>
          {theme.regionPalette.slice(0, 4).map((color) => (
            <View key={color} style={[styles.layerCelebrationTile, { backgroundColor: color, borderRadius: theme.radius }]} />
          ))}
        </View>
        <Text style={[styles.layerCelebrationTitle, { color: theme.title }]}>{t.congrats}</Text>
        <Text style={[styles.layerCelebrationSubtitle, { color: theme.muted }]}>{t.packageOpened(packageLabel)}</Text>
        <Text style={[styles.layerCelebrationSmall, { color: theme.muted }]}>{t.firstLevelOpening}</Text>
      </Animated.View>
    </View>
  );
}

function HomeScreen({ level, levelIndex, levels, theme, t, introSeen, onStart, onLevels, onShop, onRemoveAds, onSettings, noAdsPurchased }) {
  const levelName = t.level === "Level" ? `${t.level} ${levelIndex + 1}` : level.name;
  return (
    <View style={[styles.home, { backgroundColor: theme.background }]}>
      {!noAdsPurchased ? (
        <Pressable
          accessibilityLabel={t.removeAds}
          disabled={!introSeen}
          onPress={() => {
            onRemoveAds?.();
            tapFeedback();
          }}
          style={({ pressed }) => [
            styles.homeRemoveAdsButton,
            {
              opacity: !introSeen ? 0.38 : pressed ? 0.86 : 1
            }
          ]}
        >
          <RemoveAdsIcon compact />
        </Pressable>
      ) : null}
      <SettingsIconButton label={t.settings} onPress={onSettings} theme={theme} floating />
      <View style={styles.homeBrand}>
        <View style={styles.homeMark}>
          {theme.regionPalette.slice(0, 4).map((color) => (
            <View key={color} style={[styles.homeTile, { backgroundColor: color, borderRadius: theme.radius }]} />
          ))}
        </View>
        <Text style={[styles.homeTitle, { color: theme.title }]}>Puzzle Area</Text>
        <Text style={[styles.homeSubtitle, { color: theme.muted }]}>{t.findAreas}</Text>
      </View>

      <View style={[styles.homeCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Text style={[styles.homeCardTitle, { color: theme.title }]}>{t.currentLevel}</Text>
        <Text style={[styles.homeCardMeta, { color: theme.muted }]}>
          {levelName} / {levels.length} - {level.package}
        </Text>
      </View>

      <View style={styles.homeActions}>
        <MenuButton label={t.start} onPress={onStart} primary theme={theme} />
        <MenuButton label={t.levels} icon={ICONS.levels} disabled={!introSeen} onPress={onLevels} theme={theme} />
        <MenuButton label={t.shop} icon={ICONS.shop} disabled={!introSeen} onPress={onShop} theme={theme} />
      </View>

      <View style={styles.studioBadge}>
        <Image source={ICONS.gorsenGames} style={styles.studioLogo} resizeMode="contain" />
        <Text style={[styles.studioText, { color: theme.muted }]}>Görsen Games</Text>
      </View>
    </View>
  );
}

function ShopScreen({ theme, t, hintCoins, layerCoins, onBack, onBuy, onRestore, productsById, purchaseInProgress, noAdsPurchased }) {
  return (
    <View style={[styles.shopScreen, { backgroundColor: theme.background }]}>
      <View style={styles.shopHeader}>
        <View style={styles.shopTitleBlock}>
          <Text style={[styles.shopTitle, { color: theme.title }]}>{t.shop}</Text>
          <Text style={[styles.shopSubtitle, { color: theme.muted }]}>{t.shopSubtitle}</Text>
        </View>
        <IconButton icon={ICONS.home} label={t.back} onPress={onBack} theme={theme} />
      </View>

      <View style={styles.shopBalanceRow}>
        <CurrencyPill icon={ICONS.layerCoin} value={layerCoins} theme={theme} />
        <CurrencyPill icon={ICONS.hintCoin} value={hintCoins} theme={theme} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.shopList}>
        {SHOP_ITEMS.map((pack) => {
          const product = productsById?.[pack.productId];
          const alreadyPurchased = pack.type === "removeAds" && noAdsPurchased;
          const buttonText = alreadyPurchased ? t.purchased : purchaseInProgress === pack.id ? t.purchasing : product?.displayPrice || pack.price;
          const disabled = Boolean(purchaseInProgress) || alreadyPurchased;

          return (
            <View
              key={pack.id}
              style={[
                styles.shopCard,
                {
                  backgroundColor: pack.featured ? `${theme.button}12` : theme.cell,
                  borderColor: pack.featured ? theme.button : theme.cellBorder,
                  borderRadius: theme.radius
                }
              ]}
            >
            <View style={styles.shopPackTop}>
              <View style={styles.shopPackText}>
                <Text style={[styles.shopPackTitle, { color: theme.title }]}>{localizedPackTitle(pack, t)}</Text>
                <Text style={[styles.shopPackSubtitle, { color: theme.muted }]}>
                  {pack.type === "removeAds" ? t.removeAdsBody : pack.type === "hint" ? t.onlyHintCoins : t.onlyLayerCoins}
                </Text>
              </View>
              {pack.featured ? (
                <View style={[styles.shopTag, { backgroundColor: theme.button, borderRadius: theme.radius }]}>
                  <Text style={[styles.shopTagText, { color: theme.buttonText }]}>{t.popular}</Text>
                </View>
              ) : null}
            </View>

            {pack.type === "removeAds" ? (
              <View style={[styles.shopNoAdsPanel, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
                <Text style={[styles.shopNoAdsIcon, { color: theme.button }]}>AD</Text>
                <Text style={[styles.shopNoAdsText, { color: theme.title }]}>{t.removeAds}</Text>
              </View>
            ) : (
              <View style={styles.shopRewardRow}>
                {pack.hintCoins > 0 ? <ShopReward icon={ICONS.hintCoin} value={pack.hintCoins} label={t.hintCoin} theme={theme} /> : null}
                {pack.layerCoins > 0 ? <ShopReward icon={ICONS.layerCoin} value={pack.layerCoins} label={t.layerCoin} theme={theme} /> : null}
              </View>
            )}

            <Pressable
              disabled={disabled}
              onPress={() => {
                onBuy(pack);
              }}
              style={({ pressed }) => [
                styles.shopBuyButton,
                {
                  backgroundColor: theme.button,
                  borderRadius: theme.radius,
                  opacity: disabled ? 0.55 : pressed ? 0.86 : 1
                }
              ]}
            >
              <Text style={[styles.shopBuyText, { color: theme.buttonText }]}>{buttonText}</Text>
            </Pressable>
            </View>
          );
        })}

        <Text style={[styles.shopFootnote, { color: theme.muted }]}>
          {t.shopFootnote}
        </Text>
        <Pressable
          onPress={onRestore}
          style={({ pressed }) => [
            styles.shopRestoreButton,
            {
              borderColor: theme.cellBorder,
              borderRadius: theme.radius,
              opacity: pressed ? 0.86 : 1
            }
          ]}
        >
          <Text style={[styles.shopRestoreText, { color: theme.title }]}>{t.restorePurchases}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ShopReward({ icon, value, label, theme }) {
  return (
    <View style={[styles.shopReward, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
      <Image source={icon} style={styles.shopRewardIcon} resizeMode="contain" />
      <View style={styles.shopRewardText}>
        <Text style={[styles.shopRewardValue, { color: theme.title }]}>+{value}</Text>
        <Text style={[styles.shopRewardLabel, { color: theme.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

function localizedPackTitle(pack, t) {
  if (pack.type === "removeAds") return t.removeAds;
  const size = pack.id.includes("small") ? (t.settings === "Settings" ? "Small" : "Küçük") : pack.id.includes("medium") ? (t.settings === "Settings" ? "Medium" : "Orta") : (t.settings === "Settings" ? "Large" : "Büyük");
  const type = pack.type === "hint" ? (t.settings === "Settings" ? "Hint" : "İpucu") : (t.settings === "Settings" ? "Layer" : "Katman");
  return `${type} ${size}`;
}

function RemoveAdsIcon({ compact = false }) {
  return (
    <View style={[styles.removeAdsIcon, compact ? styles.removeAdsIconCompact : null]}>
      <View style={styles.removeAdsIconInner}>
        <Text style={[styles.removeAdsIconText, compact ? styles.removeAdsIconTextCompact : null]}>AD</Text>
      </View>
      <View style={[styles.removeAdsIconSlash, compact ? styles.removeAdsIconSlashCompact : null]} />
    </View>
  );
}

function MenuButton({ label, icon, iconNode, disabled, onPress, primary, danger, theme }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.menuButton,
        {
          backgroundColor: primary ? theme.button : theme.cell,
          borderColor: danger ? "#ef4444" : primary ? theme.button : theme.cellBorder,
          borderRadius: theme.radius,
          opacity: disabled ? 0.38 : pressed ? 0.86 : 1
        }
      ]}
    >
      {iconNode || null}
      {icon ? <Image source={icon} style={styles.menuIcon} resizeMode="contain" /> : null}
      <Text style={[styles.menuLabel, { color: danger ? "#ef4444" : primary ? theme.buttonText : theme.title }]}>{label}</Text>
    </Pressable>
  );
}

function ToolButton({ label, icon, badge, onPress, dark, theme }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.toolButton,
        {
          backgroundColor: dark ? theme.buttonDark : theme.button,
          borderRadius: theme.radius
        },
        pressed ? styles.toolButtonPressed : null
      ]}
    >
      <Image source={icon} style={styles.toolIcon} resizeMode="contain" />
      {badge !== undefined ? (
        <View style={[styles.toolBadge, { backgroundColor: theme.cell, borderColor: theme.buttonText, borderRadius: theme.radius }]}>
          <Text style={[styles.toolBadgeText, { color: theme.title }]}>{badge.value ?? badge}</Text>
          {badge.icon ? <Image source={badge.icon} style={styles.toolBadgeIcon} resizeMode="contain" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function HintActionButton({ label, icon, badge, onPress, theme }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.hintActionButton,
        {
          opacity: pressed ? 0.86 : 1
        }
      ]}
    >
      <Image source={icon} style={styles.hintActionIcon} resizeMode="contain" />
      {badge !== undefined ? (
        <View style={[styles.hintActionBadge, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: 999 }]}>
          <Text style={[styles.hintActionBadgeText, { color: theme.title }]}>{badge.value ?? badge}</Text>
          {badge.icon ? <Image source={badge.icon} style={styles.hintActionBadgeIcon} resizeMode="contain" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function IconButton({ icon, label, onPress, dark, theme }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          opacity: pressed ? 0.86 : 1
        }
      ]}
    >
      <Image source={icon} style={styles.topIconImage} resizeMode="contain" />
    </Pressable>
  );
}

function SettingsIconButton({ label, onPress, theme, floating }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        floating ? styles.homeSettingsButton : null,
        {
          opacity: pressed ? 0.86 : 1
        }
      ]}
    >
      <Image source={ICONS.settings} style={styles.topIconImage} resizeMode="contain" />
    </Pressable>
  );
}

function LanguageChoicePrompt({ theme, t, onSelect }) {
  return (
    <View style={styles.languagePromptOverlay}>
      <View style={[styles.languagePromptCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <Text style={[styles.languagePromptTitle, { color: theme.title }]}>{t.languagePromptTitle}</Text>
        <Text style={[styles.languagePromptBody, { color: theme.muted }]}>{t.languagePromptBody}</Text>
        <View style={styles.languagePromptActions}>
          <Pressable
            onPress={() => {
              onSelect("en");
              tapFeedback();
            }}
            style={({ pressed }) => [
              styles.languagePromptButton,
              { backgroundColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
            ]}
          >
            <Text style={[styles.languagePromptButtonText, { color: theme.buttonText }]}>English</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onSelect("tr");
              tapFeedback();
            }}
            style={({ pressed }) => [
              styles.languagePromptButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.cellBorder,
                borderRadius: theme.radius,
                opacity: pressed ? 0.86 : 1
              }
            ]}
          >
            <Text style={[styles.languagePromptButtonText, { color: theme.title }]}>Türkçe</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SettingsOverlay({
  theme,
  t,
  language,
  musicEnabled,
  soundEnabled,
  hapticsEnabled,
  onLanguage,
  onMusic,
  onSound,
  onHaptics,
  onClose
}) {
  return (
    <View style={styles.settingsOverlay}>
      <View style={[styles.settingsCard, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: theme.title }]}>{t.settings}</Text>
          <SettingsIconButton label={t.close} onPress={onClose} theme={theme} />
        </View>
        <SettingsToggle label={t.music} value={musicEnabled} onValueChange={onMusic} theme={theme} />
        <SettingsToggle label={t.sound} value={soundEnabled} onValueChange={onSound} theme={theme} />
        <SettingsToggle label={t.haptics} value={hapticsEnabled} onValueChange={onHaptics} theme={theme} />
        <Text style={[styles.settingsSectionLabel, { color: theme.muted }]}>{t.language}</Text>
        <View style={styles.languageRow}>
          <LanguageButton label={t.turkish} active={language === "tr"} onPress={() => onLanguage("tr")} theme={theme} />
          <LanguageButton label={t.english} active={language === "en"} onPress={() => onLanguage("en")} theme={theme} />
        </View>
        <Pressable
          onPress={() => {
            onClose();
            tapFeedback();
          }}
          style={({ pressed }) => [
            styles.settingsCloseButton,
            { backgroundColor: theme.button, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }
          ]}
        >
          <Text style={[styles.settingsCloseText, { color: theme.buttonText }]}>{t.close}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingsToggle({ label, value, onValueChange, theme }) {
  return (
    <Pressable
      onPress={() => {
        onValueChange(!value);
        tapFeedback();
      }}
      style={[styles.settingsRow, { borderColor: theme.cellBorder }]}
    >
      <Text style={[styles.settingsRowText, { color: theme.title }]}>{label}</Text>
      <View style={[styles.switchTrack, { backgroundColor: value ? theme.button : theme.cellBorder, borderRadius: 999 }]}>
        <View
          style={[
            styles.switchThumb,
            {
              backgroundColor: theme.buttonText,
              transform: [{ translateX: value ? 22 : 0 }]
            }
          ]}
        />
      </View>
    </Pressable>
  );
}

function LanguageButton({ label, active, onPress, theme }) {
  return (
    <Pressable
      onPress={() => {
        onPress();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.languageButton,
        {
          backgroundColor: active ? theme.button : theme.background,
          borderColor: active ? theme.button : theme.cellBorder,
          borderRadius: theme.radius,
          opacity: pressed ? 0.86 : 1
        }
      ]}
    >
      <Text style={[styles.languageButtonText, { color: active ? theme.buttonText : theme.title }]}>{label}</Text>
    </Pressable>
  );
}

function CurrencyPill({ icon, value, theme }) {
  return (
    <View style={[styles.currencyPill, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
      <Image source={icon} style={styles.currencyIcon} resizeMode="contain" />
      <Text style={[styles.currencyValue, { color: theme.title }]}>{value}</Text>
    </View>
  );
}

function MiniButton({ label, onPress, theme }) {
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.miniButton,
        {
          backgroundColor: theme.button,
          borderRadius: theme.radius,
          opacity: pressed ? 0.82 : 1
        }
      ]}
    >
      <Text style={[styles.miniButtonText, { color: theme.buttonText }]}>{label}</Text>
    </Pressable>
  );
}

function SplashScreen({ progress, loadingProgress, message, t }) {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1]
  });
  const clampedProgress = Math.max(0.08, Math.min(1, loadingProgress || 0));

  return (
    <SafeAreaView style={styles.splash}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.splashContent, { opacity: progress, transform: [{ scale }] }]}>
        <View style={styles.splashMark}>
          <View style={[styles.splashTile, { backgroundColor: "#ffb703" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#2ec4b6" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#fb6f92" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#8ecae6" }]} />
        </View>
        <Text style={styles.splashTitle}>PUZZLE AREA</Text>
        <Text style={styles.splashSubtitle}>{t.findAreas}</Text>
        {message ? <Text style={styles.splashMessage}>{message}</Text> : null}
      </Animated.View>
      <View style={styles.splashLoading}>
        <View style={styles.splashLoadingTrack}>
          <View style={[styles.splashLoadingFill, { width: `${Math.round(clampedProgress * 100)}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function RequiredUpdateScreen({ t, title, body, onUpdate }) {
  return (
    <SafeAreaView style={styles.requiredUpdateScreen}>
      <StatusBar barStyle="light-content" />
      <View style={styles.requiredUpdateCard}>
        <View style={styles.splashMark}>
          <View style={[styles.splashTile, { backgroundColor: "#ffb703" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#2ec4b6" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#fb6f92" }]} />
          <View style={[styles.splashTile, { backgroundColor: "#8ecae6" }]} />
        </View>
        <Text style={styles.requiredUpdateTitle}>{title || t.updateRequiredTitle}</Text>
        <Text style={styles.requiredUpdateBody}>{body || t.updateRequiredBody}</Text>
        <Pressable style={styles.requiredUpdateButton} onPress={onUpdate}>
          <Text style={styles.requiredUpdateButtonText}>{t.updateNow}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const LevelMapCard = memo(function LevelMapCard({
  item,
  width,
  mapTheme,
  t,
  locked,
  completed,
  stars,
  active,
  justCompleted,
  justUnlocked,
  interactionLocked,
  pulseAnim,
  onSelect
}) {
  const { level, index, miniPalette } = item;
  const card = (
    <Pressable
      disabled={locked || interactionLocked}
      onPress={() => {
        onSelect(index);
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.mapCard,
        {
          backgroundColor: active ? mapTheme.button : justUnlocked ? `${mapTheme.button}18` : mapTheme.cell,
          borderColor: active ? mapTheme.button : justCompleted ? mapTheme.win : justUnlocked ? mapTheme.button : completed ? mapTheme.win : mapTheme.cellBorder,
          borderRadius: mapTheme.radius,
          borderWidth: (completed || justCompleted || justUnlocked) && !active ? 2 : 1,
          opacity: locked ? 0.4 : pressed ? 0.82 : 1
        }
      ]}
    >
      <View style={styles.mapCardTop}>
        <Text style={[styles.mapCardNumber, { color: active ? mapTheme.buttonText : mapTheme.title }]}>
          {index + 1}
        </Text>
        <View style={styles.mapMiniBoard}>
          {miniPalette.map((color) => (
            <View key={color} style={[styles.mapMiniTile, { backgroundColor: color }]} />
          ))}
        </View>
      </View>
      <Text style={[styles.mapCardMeta, { color: active ? mapTheme.buttonText : justCompleted ? mapTheme.win : mapTheme.muted }]}>
        {justCompleted ? t.passedBang : justUnlocked ? t.newlyOpened : completed ? t.passed : locked ? t.locked : `${level.rows}x${level.cols}`}
      </Text>
      <MiniStarRating value={stars} active={active} theme={mapTheme} />
    </Pressable>
  );

  if (!justCompleted && !justUnlocked) {
    return <View style={[styles.mapCardSlot, { width }]}>{card}</View>;
  }

  const animatedScale = pulseAnim.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, justCompleted ? 1.08 : 1.04, 1]
  });
  const animatedOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1]
  });

  return (
    <Animated.View
      style={[
        styles.mapCardSlot,
        {
          width,
          opacity: animatedOpacity,
          transform: [{ scale: animatedScale }]
        }
      ]}
    >
      {card}
    </Animated.View>
  );
});

function LevelMapScreen({
  levels,
  levelMapCache,
  t,
  unlockedLevels,
  completedLevels,
  levelStars,
  unlockedPackages,
  levelIndex,
  packageFilter,
  hintCoins,
  layerCoins,
  transitionAnim,
  pulseAnim,
  recentCompletedLevel,
  recentUnlockedLevel,
  interactionLocked,
  onBack,
  onPackageFilter,
  onSelect,
  onUnlockPackage,
  onUnlockRandom,
  onSettings
}) {
  const mapScrollRef = useRef(null);
  const windowSize = useWindowDimensions();
  const mapTheme = themeForPackage(packageFilter);
  const packageLabel = displayPackageName(packageFilter, t);
  const mapCardWidth = Math.floor((windowSize.width - 36 - 20) / 3);
  const packageUnlocked = unlockedPackages.has(packageFilter);
  const packageUnlockableInOrder = packageCanBeUnlockedInOrder(packageFilter, unlockedPackages);
  const packageCost = LAYER_UNLOCK_COSTS[packageFilter] ?? 0;
  const lockedIndexes = useMemo(() => {
    const items = [];
    for (let index = PACKAGE_STARTS[packageFilter]; index <= PACKAGE_ENDS[packageFilter]; index += 1) {
      if (!unlockedLevels.has(index)) items.push(index);
    }
    return items;
  }, [packageFilter, unlockedLevels]);
  const canUnlockRandom = packageUnlocked && lockedIndexes.length > 0 && hintCoins >= NEXT_LEVEL_COST;
  const visibleLevels = useMemo(
    () => levelMapCache[packageFilter] || levels
      .map((level, index) => ({ level, index, miniPalette: themeForLevel(index).regionPalette.slice(0, 4) }))
      .filter((item) => item.level.package === packageFilter),
    [levelMapCache, levels, packageFilter]
  );
  const visibleLevelRows = useMemo(() => {
    const rows = [];
    for (let index = 0; index < visibleLevels.length; index += MAP_COLUMNS) {
      rows.push(visibleLevels.slice(index, index + MAP_COLUMNS));
    }
    return rows;
  }, [visibleLevels]);
  const currentRowIndex = useMemo(() => {
    const itemIndex = visibleLevels.findIndex((item) => item.index === levelIndex);
    return itemIndex >= 0 ? Math.floor(itemIndex / MAP_COLUMNS) : 0;
  }, [levelIndex, visibleLevels]);

  useEffect(() => {
    if (!visibleLevelRows.length) return;
    const scrollIndex = Math.max(0, Math.min(currentRowIndex, visibleLevelRows.length - 1));
    const timer = setTimeout(() => {
      mapScrollRef.current?.scrollToIndex?.({
        index: scrollIndex,
        animated: false,
        viewPosition: 0.12
      });
    }, 80);
    return () => clearTimeout(timer);
  }, [currentRowIndex, packageFilter, visibleLevelRows.length]);

  const handleSelectLevel = useCallback((index) => {
    onSelect(index);
  }, [onSelect]);

  const renderLevelRow = useCallback(({ item: row }) => {
    return (
      <View style={styles.mapGridRow}>
        {Array.from({ length: MAP_COLUMNS }).map((_, columnIndex) => {
          const item = row[columnIndex];
          if (!item) {
            return <View key={`empty-${columnIndex}`} style={[styles.mapCardSlot, { width: mapCardWidth, opacity: 0 }]} />;
          }

          const { index } = item;
          const locked = !packageUnlocked || !unlockedLevels.has(index);
          const completed = completedLevels.has(index);
          const stars = bestStarsForLevel(index, levelStars, completedLevels);
          const active = index === levelIndex;
          const justCompleted = index === recentCompletedLevel;
          const justUnlocked = index === recentUnlockedLevel;

          return (
            <LevelMapCard
              key={index}
              item={item}
              width={mapCardWidth}
              mapTheme={mapTheme}
              t={t}
              locked={locked}
              completed={completed}
              stars={stars}
              active={active}
              justCompleted={justCompleted}
              justUnlocked={justUnlocked}
              interactionLocked={interactionLocked}
              pulseAnim={pulseAnim}
              onSelect={handleSelectLevel}
            />
          );
        })}
      </View>
    );
  }, [
    completedLevels,
    handleSelectLevel,
    interactionLocked,
    levelIndex,
    levelStars,
    mapCardWidth,
    mapTheme,
    packageUnlocked,
    pulseAnim,
    recentCompletedLevel,
    recentUnlockedLevel,
    t,
    unlockedLevels
  ]);

  return (
    <Animated.View
      style={[
        styles.mapScreen,
        {
          backgroundColor: mapTheme.background,
          opacity: transitionAnim,
          transform: [
            {
              translateY: transitionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0]
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.mapHeader}>
        <View>
          <Text style={[styles.mapTitle, { color: mapTheme.title }]}>{t.levelMap}</Text>
          <View style={styles.mapHeaderCoins}>
            <MapCoin icon={ICONS.layerCoin} value={layerCoins} theme={mapTheme} />
            <MapCoin icon={ICONS.hintCoin} value={hintCoins} theme={mapTheme} />
          </View>
        </View>
        <View style={styles.mapHeaderActions}>
          <MiniButton label={t.back} onPress={onBack} theme={mapTheme} />
          <SettingsIconButton label={t.settings} onPress={onSettings} theme={mapTheme} />
        </View>
      </View>

      <View style={[styles.mapEconomyPanel, { backgroundColor: mapTheme.cell, borderColor: mapTheme.cellBorder, borderRadius: mapTheme.radius }]}>
        <Text style={[styles.mapEconomyText, { color: mapTheme.title }]}>
          {packageLabel} {packageUnlocked ? t.packageOpen : t.packageLocked}
        </Text>
        {!packageUnlocked && packageUnlockableInOrder ? (
          <View style={styles.mapCostRow}>
            <Text style={[styles.mapEconomySub, { color: mapTheme.muted }]}>{t.unlockPrice}</Text>
            <MapCoin icon={ICONS.layerCoin} value={packageCost} theme={mapTheme} small />
          </View>
        ) : null}
        {!packageUnlocked ? (
          !packageUnlockableInOrder ? (
            <Text style={[styles.mapEconomySub, { color: mapTheme.muted }]}>{t.needPreviousLayer}</Text>
          ) : (
            <MapActionButton label={t.unlockLayer} icon={ICONS.layerCoin} cost={packageCost} onPress={() => onUnlockPackage(packageFilter)} theme={mapTheme} />
          )
        ) : lockedIndexes.length > 0 ? (
          canUnlockRandom ? (
            <MapActionButton label={t.unlockRandom} icon={ICONS.hintCoin} cost={NEXT_LEVEL_COST} onPress={() => onUnlockRandom(packageFilter)} theme={mapTheme} />
          ) : (
            <Text style={[styles.mapEconomySub, { color: mapTheme.muted }]}>{t.needMoreHintCoins}</Text>
          )
        ) : (
          <Text style={[styles.mapEconomySub, { color: mapTheme.muted }]}>{t.allLevelsOpen}</Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterList}>
        {PACKAGE_FILTERS.map((item) => (
          <ToggleChip
            key={item}
            label={displayPackageName(item, t)}
            active={packageFilter === item}
            locked={!unlockedPackages.has(item) && !packageCanBeUnlockedInOrder(item, unlockedPackages)}
            theme={mapTheme}
            onPress={() => onPackageFilter(item)}
          />
        ))}
      </ScrollView>

      <FlatList
        key={packageFilter}
        ref={mapScrollRef}
        data={visibleLevelRows}
        keyExtractor={(row) => String(row[0]?.index ?? "empty")}
        renderItem={renderLevelRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mapGrid}
        scrollEnabled
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={false}
        initialScrollIndex={visibleLevelRows.length ? Math.max(0, Math.min(currentRowIndex, visibleLevelRows.length - 1)) : 0}
        getItemLayout={(_, index) => ({
          length: MAP_ROW_HEIGHT,
          offset: index * MAP_ROW_HEIGHT,
          index
        })}
        onScrollToIndexFailed={(info) => {
          mapScrollRef.current?.scrollToOffset?.({
            offset: Math.max(0, info.averageItemLength * info.index),
            animated: false
          });
        }}
      />
    </Animated.View>
  );
}

function ToggleChip({ label, active, locked, theme, onPress }) {
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={[
        styles.toggleChip,
        {
          backgroundColor: active ? theme.button : theme.background,
          borderColor: active ? theme.button : theme.cellBorder,
          borderRadius: theme.radius,
          opacity: locked && !active ? 0.42 : 1
        }
      ]}
    >
      <Text style={[styles.toggleChipText, { color: active ? theme.buttonText : theme.title }]}>{label}</Text>
    </Pressable>
  );
}

function MapCoin({ icon, value, theme, small }) {
  return (
    <View style={[styles.mapCoin, small ? styles.mapCoinSmall : null, { backgroundColor: theme.cell, borderColor: theme.cellBorder, borderRadius: theme.radius }]}>
      <Image source={icon} style={small ? styles.mapCoinIconSmall : styles.mapCoinIcon} resizeMode="contain" />
      <Text style={[small ? styles.mapCoinTextSmall : styles.mapCoinText, { color: theme.title }]}>{value}</Text>
    </View>
  );
}

function MapActionButton({ label, icon, cost, onPress, theme }) {
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        tapFeedback();
      }}
      style={({ pressed }) => [
        styles.mapActionButton,
        {
          backgroundColor: theme.button,
          borderRadius: theme.radius,
          opacity: pressed ? 0.86 : 1
        }
      ]}
    >
      <Text style={[styles.mapActionText, { color: theme.buttonText }]}>{label}</Text>
      <View style={styles.mapActionCost}>
        <Text style={[styles.mapActionCostText, { color: theme.buttonText }]}>{cost}</Text>
        <Image source={icon} style={styles.mapActionIcon} resizeMode="contain" />
      </View>
    </Pressable>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: "#101820",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center"
  },
  errorText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  splash: {
    flex: 1,
    backgroundColor: "#101820",
    alignItems: "center",
    justifyContent: "center"
  },
  splashContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  splashMark: {
    width: 112,
    height: 112,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    transform: [{ rotate: "-6deg" }]
  },
  splashTile: {
    width: 52,
    height: 52,
    borderRadius: 8
  },
  splashTitle: {
    color: "#f8fafc",
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: 0
  },
  splashSubtitle: {
    color: "#a8b3c2",
    fontSize: 14,
    fontWeight: "900"
  },
  splashMessage: {
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 28,
    maxWidth: 340
  },
  splashLoading: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: Platform.OS === "android" ? 52 : 34,
    alignItems: "center",
    gap: 9
  },
  splashLoadingTrack: {
    width: "100%",
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  splashLoadingFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2ec4b6"
  },
  requiredUpdateScreen: {
    flex: 1,
    backgroundColor: "#101820",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  requiredUpdateCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 16,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  requiredUpdateTitle: {
    color: "#f8fafc",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  requiredUpdateBody: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center"
  },
  requiredUpdateButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2ec4b6"
  },
  requiredUpdateButtonText: {
    color: "#101820",
    fontSize: 18,
    fontWeight: "900"
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f2ea"
  },
  screenEntry: {
    flex: 1
  },
  home: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "android" ? Math.max(46, (StatusBar.currentHeight || 24) + 18) : 36,
    paddingBottom: Platform.OS === "android" ? 90 : 22,
    justifyContent: "space-between",
    gap: 18
  },
  homeBrand: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: 1
  },
  homeMark: {
    width: 108,
    height: 108,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    transform: [{ rotate: "-6deg" }]
  },
  homeTile: {
    width: 50,
    height: 50
  },
  homeTitle: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  homeSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  homeCard: {
    borderWidth: 1,
    padding: 16,
    gap: 6,
    shadowColor: "#20242a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  homeCardTitle: {
    fontSize: 13,
    fontWeight: "900"
  },
  homeCardMeta: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  homeActions: {
    gap: 10
  },
  studioBadge: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 2
  },
  studioLogo: {
    width: 42,
    height: 42,
    borderRadius: 10
  },
  studioText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  introScreen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? Math.max(42, (StatusBar.currentHeight || 24) + 14) : 18,
    paddingBottom: Platform.OS === "android" ? 86 : 14,
    justifyContent: "space-between",
    gap: 8
  },
  introHeader: {
    gap: 8,
    alignItems: "center"
  },
  introTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center"
  },
  introSubtitle: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  introBoardShell: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 10,
    shadowColor: "#20242a",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  introBoard: {
    width: INTRO_BOARD_SIZE,
    height: INTRO_BOARD_SIZE,
    position: "relative"
  },
  introCell: {
    position: "absolute",
    width: INTRO_CELL,
    height: INTRO_CELL,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  introSelection: {
    position: "absolute",
    top: 0,
    width: INTRO_CELL,
    zIndex: 1
  },
  introDraftRect: {
    position: "absolute",
    opacity: 1,
    zIndex: 2
  },
  introFinger: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    zIndex: 3
  },
  introNumber: {
    fontSize: 29,
    lineHeight: 32,
    fontWeight: "900",
    zIndex: 2
  },
  introHint: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    textAlign: "center"
  },
  introHowToCard: {
    width: "100%",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  introHowToText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  introTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center"
  },
  introTool: {
    width: "31.5%",
    minHeight: 58,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  introToolIcon: {
    width: 28,
    height: 28
  },
  introToolText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  introStartButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  introStartText: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900"
  },
  coachOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: "center",
    padding: 16
  },
  coachPointer: {
    position: "absolute",
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    shadowColor: "#20242a",
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 }
  },
  coachPointerPulse: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    opacity: 0.26
  },
  coachArrowTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  },
  coachArrowTriangleUp: {
    borderBottomWidth: 22,
    borderTopWidth: 0
  },
  coachArrowTriangleDown: {
    borderTopWidth: 22,
    borderBottomWidth: 0
  },
  coachCard: {
    borderWidth: 1,
    padding: 14,
    gap: 7,
    marginTop: 80,
    shadowColor: "#20242a",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 }
  },
  coachStepText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  coachTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  coachBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  coachButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  coachButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  paidHintOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 24,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,36,42,0.28)"
  },
  paidHintCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#20242a",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  paidHintIcon: {
    width: 62,
    height: 62
  },
  paidHintTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center"
  },
  paidHintBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  paidHintCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  paidHintCostText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900"
  },
  paidHintCoin: {
    width: 34,
    height: 34
  },
  paidHintActions: {
    width: "100%",
    flexDirection: "row",
    gap: 8
  },
  paidHintButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  paidHintButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  rewardScreen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: Platform.OS === "android" ? 72 : 54,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  rewardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1
  },
  rewardBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82
  },
  rewardBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,238,210,0.16)"
  },
  rewardBackdropBlock: {
    position: "absolute",
    opacity: 0.12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    shadowColor: "#20242a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  rewardGlow: {
    position: "absolute",
    top: "18%",
    alignSelf: "center",
    width: 330,
    height: 330,
    borderRadius: 165,
    opacity: 0.54,
    transform: [{ scaleX: 1.25 }]
  },
  rewardStage: {
    width: "100%",
    maxWidth: 410,
    alignItems: "center"
  },
  rewardCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 22,
    paddingHorizontal: 17,
    paddingBottom: 17,
    gap: 10,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#20242a",
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 }
  },
  rewardCardTopGlow: {
    position: "absolute",
    top: -64,
    alignSelf: "center",
    width: 280,
    height: 150,
    borderRadius: 140
  },
  rewardCardAccent: {
    width: 72,
    height: 6,
    borderRadius: 999,
    marginBottom: 2
  },
  rewardCardCap: {
    position: "absolute",
    top: -23,
    alignSelf: "center",
    width: 174,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
    elevation: 8
  },
  rewardHeaderBadgeImage: {
    width: 304,
    height: 134
  },
  rewardCardCapMain: {
    width: 142,
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    shadowColor: "#20242a",
    shadowOpacity: 0.2,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 }
  },
  rewardCardCapWing: {
    position: "absolute",
    top: 15,
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 8,
    opacity: 0.78
  },
  rewardCardCapWingLeft: {
    left: 12,
    transform: [{ rotate: "-13deg" }]
  },
  rewardCardCapWingRight: {
    right: 12,
    transform: [{ rotate: "13deg" }]
  },
  rewardCardCapHighlight: {
    width: "72%",
    height: 10,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  rewardTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center"
  },
  rewardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "center"
  },
  rewardTitleRule: {
    width: "68%",
    height: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: -1,
    marginBottom: -2
  },
  rewardTitleRuleLine: {
    flex: 1,
    height: 1,
    opacity: 0.7
  },
  rewardTitleRuleGem: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderRadius: 3,
    transform: [{ rotate: "45deg" }]
  },
  rewardStarsPanel: {
    width: "100%",
    minHeight: 144,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
    shadowColor: "#20242a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  rewardStarsHalo: {
    position: "absolute",
    top: -54,
    alignSelf: "center",
    width: 210,
    height: 126,
    borderRadius: 63,
    backgroundColor: "rgba(255,205,64,0.18)",
    transform: [{ scaleX: 1.35 }]
  },
  rewardStarsCorner: {
    position: "absolute",
    top: 12,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    opacity: 0.8
  },
  rewardStarsCornerLeft: {
    left: 12,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8
  },
  rewardStarsCornerRight: {
    right: 12,
    borderRightWidth: 2,
    borderTopRightRadius: 8
  },
  rewardStarsLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  rewardStarsMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900"
  },
  rewardStarsBest: {
    color: "#22a35a",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  rewardCoinPanel: {
    width: "100%",
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#d0a455",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  rewardCoinPanelShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.42)"
  },
  rewardCoinChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  rewardCoinIcon: {
    width: 36,
    height: 36
  },
  rewardCoinTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rewardCoinLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900"
  },
  rewardCoinGain: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900"
  },
  rewardCoinBalance: {
    minWidth: 30,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "right"
  },
  rewardCoinDivider: {
    width: 1,
    height: 42,
    marginHorizontal: 8
  },
  rewardRow: {
    minHeight: 76,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  rewardIcon: {
    width: 52,
    height: 52
  },
  rewardTextBlock: {
    flex: 1,
    gap: 3
  },
  rewardLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  rewardGain: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  rewardBalance: {
    minWidth: 42,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    textAlign: "right"
  },
  starRating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  rewardStarAssetWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -4,
    position: "relative"
  },
  rewardStarAsset: {
    shadowColor: "#f4c430",
    shadowOpacity: 0.46,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }
  },
  rewardStarAssetEmpty: {
    opacity: 0.78,
    tintColor: undefined
  },
  rewardStarAssetFilled: {
    position: "absolute",
    top: 0,
    left: 0
  },
  starText: {
    fontWeight: "900",
    textAlign: "center"
  },
  rewardDoubleButton: {
    width: "100%",
    minHeight: 64,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#20242a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  rewardButtonShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  rewardButtonBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  rewardDoubleContent: {
    width: "100%",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  rewardDoubleAsset: {
    width: 88,
    height: 54,
    marginVertical: -7,
    marginLeft: -6
  },
  rewardDoubleBadge: {
    width: 52,
    height: 38,
    borderWidth: 1,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 }
  },
  rewardDoubleBadgeText: {
    color: "#18202a",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  rewardDoubleText: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center"
  },
  rewardContinueButton: {
    width: "78%",
    alignSelf: "center",
    height: 50,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    overflow: "hidden",
    shadowColor: "#20242a",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  rewardContinueText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900"
  },
  warmupScreen: {
    flex: 1,
    padding: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  warmupCard: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    alignItems: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  warmupMark: {
    width: 96,
    height: 96,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    transform: [{ rotate: "-5deg" }]
  },
  warmupTile: {
    width: 44,
    height: 44
  },
  warmupTitle: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    textAlign: "center"
  },
  warmupBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    textAlign: "center"
  },
  warmupCost: {
    width: "100%",
    minHeight: 58,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  warmupCostText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900"
  },
  warmupCoinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  warmupCoinText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900"
  },
  warmupCoinIcon: {
    width: 34,
    height: 34
  },
  warmupButton: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  warmupButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  layerCelebrationScreen: {
    flex: 1,
    padding: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  layerCelebrationCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    padding: 22,
    gap: 12,
    alignItems: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  layerCelebrationMark: {
    width: 104,
    height: 104,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    transform: [{ rotate: "-5deg" }]
  },
  layerCelebrationTile: {
    width: 48,
    height: 48
  },
  layerCelebrationTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "center"
  },
  layerCelebrationSubtitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "center"
  },
  layerCelebrationSmall: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "center"
  },
  menuButton: {
    minHeight: 62,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#20242a",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  menuIcon: {
    width: 42,
    height: 42
  },
  removeAdsIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fecaca",
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  removeAdsIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 13
  },
  removeAdsIconInner: {
    width: 29,
    height: 23,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    backgroundColor: "#991b1b",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  removeAdsIconText: {
    color: "#ffffff",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowRadius: 2
  },
  removeAdsIconTextCompact: {
    fontSize: 11,
    lineHeight: 13
  },
  removeAdsIconSlash: {
    position: "absolute",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    transform: [{ rotate: "-38deg" }],
    zIndex: 3
  },
  removeAdsIconSlashCompact: {
    width: 52,
    height: 4
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: "900"
  },
  shopScreen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? Math.max(42, (StatusBar.currentHeight || 24) + 14) : 18,
    paddingBottom: Platform.OS === "android" ? 86 : 12,
    gap: 14
  },
  shopHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  shopTitleBlock: {
    flex: 1,
    gap: 4
  },
  shopTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900"
  },
  shopSubtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800"
  },
  shopBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  shopList: {
    gap: 12,
    paddingBottom: 20
  },
  shopCard: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: "#20242a",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  shopPackTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  shopPackText: {
    flex: 1,
    gap: 4
  },
  shopPackTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  shopPackSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  shopTag: {
    minHeight: 28,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  shopTagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  shopRewardRow: {
    flexDirection: "row",
    gap: 8
  },
  shopReward: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8
  },
  shopRewardIcon: {
    width: 38,
    height: 38
  },
  shopRewardText: {
    flex: 1,
    gap: 2
  },
  shopRewardValue: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900"
  },
  shopRewardLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  },
  shopNoAdsPanel: {
    minHeight: 68,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14
  },
  shopNoAdsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 15,
    lineHeight: 40,
    fontWeight: "900",
    textDecorationLine: "line-through"
  },
  shopNoAdsText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  shopBuyButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 }
  },
  shopBuyText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  shopFootnote: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 8
  },
  shopRestoreButton: {
    minHeight: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  shopRestoreText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  mapScreen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? Math.max(42, (StatusBar.currentHeight || 24) + 14) : 16,
    paddingBottom: Platform.OS === "android" ? 86 : 12,
    gap: 12
  },
  mapHeader: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  mapTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900"
  },
  mapSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  mapHeaderCoins: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6
  },
  mapHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  mapEconomyPanel: {
    borderWidth: 1,
    padding: 10,
    gap: 6
  },
  mapEconomyText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  mapEconomySub: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  mapCostRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8
  },
  mapCoin: {
    minWidth: 72,
    height: 38,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 7
  },
  mapCoinSmall: {
    minWidth: 58,
    height: 32
  },
  mapCoinIcon: {
    width: 32,
    height: 32
  },
  mapCoinIconSmall: {
    width: 26,
    height: 26
  },
  mapCoinText: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900"
  },
  mapCoinTextSmall: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  mapActionButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12
  },
  mapActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  mapActionCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  mapActionCostText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  mapActionIcon: {
    width: 28,
    height: 28
  },
  mapGrid: {
    paddingBottom: 18
  },
  mapGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    height: MAP_ROW_HEIGHT,
    marginBottom: 0
  },
  mapCardSlot: {
    width: "31.5%",
    height: MAP_CARD_HEIGHT
  },
  mapCard: {
    width: "100%",
    height: MAP_CARD_HEIGHT,
    borderWidth: 1,
    padding: 10,
    justifyContent: "space-between",
    gap: 6
  },
  mapCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6
  },
  mapCardNumber: {
    fontSize: 23,
    lineHeight: 25,
    fontWeight: "900"
  },
  mapMiniBoard: {
    width: 30,
    height: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2
  },
  mapMiniTile: {
    width: 14,
    height: 14,
    borderRadius: 3
  },
  mapCardMeta: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900"
  },
  mapCardStars: {
    minHeight: 14,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  mapCardStarsPlaceholder: {
    minHeight: 14
  },
  app: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    justifyContent: "flex-start",
    gap: 6
  },
  topbar: {
    minHeight: 142,
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 8
  },
  topNavRow: {
    width: "100%",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topIconGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  topMoveText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "right"
  },
  levelMoveRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  topbarText: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5
  },
  title: {
    color: "#20242a",
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  levelTitle: {
    color: "#68717c",
    fontSize: 14,
    fontWeight: "800"
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 18,
    alignItems: "center"
  },
  infoText: {
    fontSize: 12,
    fontWeight: "900"
  },
  miniButton: {
    minWidth: 88,
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  miniButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  filterScroll: {
    minHeight: 42,
    maxHeight: 46,
    marginTop: 4
  },
  filterList: {
    gap: 6,
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    paddingRight: 4
  },
  toggleChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  toggleChipText: {
    fontSize: 11,
    fontWeight: "900"
  },
  boardWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  board: {
    position: "relative"
  },
  flashLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5
  },
  regionBlock: {
    position: "absolute",
    borderRadius: RADIUS,
    shadowColor: "#20242a",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }
  },
  cell: {
    position: "absolute",
    zIndex: 2,
    borderRadius: RADIUS,
    padding: 10,
    overflow: "hidden"
  },
  number: {
    color: "#20242a",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "900",
    includeFontPadding: false,
    textAlign: "left"
  },
  sparkCell: {
    position: "absolute",
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    opacity: 0.22,
    zIndex: 4
  },
  status: {
    minHeight: 18,
    color: "#68717c",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    justifyContent: "center"
  },
  toolButton: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS,
    backgroundColor: "#243447",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  toolButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.86
  },
  toolIcon: {
    width: 40,
    height: 40
  },
  toolBadge: {
    position: "absolute",
    top: 4,
    right: 8,
    minWidth: 20,
    height: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4
  },
  toolBadgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900"
  },
  toolBadgeIcon: {
    width: 15,
    height: 15
  },
  hintActionButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    position: "relative"
  },
  hintActionIcon: {
    width: 38,
    height: 38
  },
  hintActionBadge: {
    position: "absolute",
    top: -4,
    right: -7,
    minWidth: 18,
    height: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: 4
  },
  hintActionBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900"
  },
  hintActionBadgeIcon: {
    width: 13,
    height: 13
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#20242a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 }
  },
  topIconImage: {
    width: 42,
    height: 42
  },
  settingsGear: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false
  },
  homeSettingsButton: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 5
  },
  homeRemoveAdsButton: {
    position: "absolute",
    top: 18,
    right: 68,
    zIndex: 5
  },
  settingsOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 80,
    backgroundColor: "rgba(16,24,32,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  languagePromptOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 90,
    backgroundColor: "rgba(16,24,32,0.44)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22
  },
  languagePromptCard: {
    width: "100%",
    maxWidth: 390,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: "#101820",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  languagePromptTitle: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    textAlign: "center"
  },
  languagePromptBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  languagePromptActions: {
    flexDirection: "row",
    gap: 10
  },
  languagePromptButton: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  languagePromptButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  settingsCard: {
    width: "100%",
    maxWidth: 390,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: "#101820",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  settingsTitle: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900"
  },
  settingsRow: {
    minHeight: 50,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  settingsRowText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  switchTrack: {
    width: 50,
    height: 28,
    padding: 3,
    justifyContent: "center"
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 999
  },
  settingsSectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 4
  },
  languageRow: {
    flexDirection: "row",
    gap: 8
  },
  languageButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  languageButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900"
  },
  settingsCloseButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  settingsCloseText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900"
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4
  },
  currencyPill: {
    minWidth: 58,
    height: 30,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 7
  },
  currencyIcon: {
    width: 24,
    height: 24
  },
  currencyValue: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "900"
  }
});
