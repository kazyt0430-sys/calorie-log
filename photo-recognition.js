(function (root) {
  const FOOD_PROFILES = {
    "food-rice": { brightness: 0.85, saturation: 0.10, warm: 0.18, green: 0.08, dark: 0.05 },
    "food-bread": { brightness: 0.68, saturation: 0.35, warm: 0.55, green: 0.04, dark: 0.10 },
    "food-egg": { brightness: 0.77, saturation: 0.34, warm: 0.42, green: 0.04, dark: 0.04 },
    "food-chicken": { brightness: 0.63, saturation: 0.25, warm: 0.42, green: 0.06, dark: 0.14 },
    "food-salmon": { brightness: 0.58, saturation: 0.48, warm: 0.68, green: 0.03, dark: 0.12 },
    "food-beef": { brightness: 0.38, saturation: 0.48, warm: 0.58, green: 0.03, dark: 0.42 },
    "food-pork": { brightness: 0.56, saturation: 0.33, warm: 0.52, green: 0.04, dark: 0.20 },
    "food-broccoli": { brightness: 0.38, saturation: 0.58, warm: 0.08, green: 0.66, dark: 0.30 },
    "food-green-salad": { brightness: 0.52, saturation: 0.52, warm: 0.12, green: 0.55, dark: 0.18 },
    "food-tomato": { brightness: 0.50, saturation: 0.66, warm: 0.78, green: 0.04, dark: 0.14 },
    "food-banana": { brightness: 0.72, saturation: 0.56, warm: 0.62, green: 0.10, dark: 0.05 },
    "food-apple": { brightness: 0.52, saturation: 0.62, warm: 0.70, green: 0.12, dark: 0.13 },
    "food-miso": { brightness: 0.43, saturation: 0.38, warm: 0.48, green: 0.08, dark: 0.36 },
    "food-pasta": { brightness: 0.66, saturation: 0.38, warm: 0.54, green: 0.06, dark: 0.10 },
    "food-udon": { brightness: 0.76, saturation: 0.16, warm: 0.24, green: 0.05, dark: 0.08 },
    "food-soba": { brightness: 0.46, saturation: 0.24, warm: 0.36, green: 0.04, dark: 0.30 },
    "food-onigiri": { brightness: 0.72, saturation: 0.13, warm: 0.18, green: 0.05, dark: 0.16 },
  };

  function analyzePixels(data) {
    const totals = { brightness: 0, saturation: 0, warm: 0, green: 0, dark: 0 };
    const count = Math.max(1, data.length / 4);
    for (let index = 0; index < data.length; index += 4) {
      const r = data[index] / 255;
      const g = data[index + 1] / 255;
      const b = data[index + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const light = (max + min) / 2;
      totals.brightness += light;
      totals.saturation += max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
      totals.warm += r > g * 1.08 && r > b * 1.15 ? 1 : 0;
      totals.green += g > r * 1.08 && g > b * 1.08 ? 1 : 0;
      totals.dark += light < 0.28 ? 1 : 0;
    }
    Object.keys(totals).forEach((key) => { totals[key] /= count; });
    return totals;
  }

  function rankFoods(foods, features, recentIds = []) {
    const recent = new Set(recentIds || []);
    const ranked = foods.map((food) => {
      const profile = FOOD_PROFILES[food.id];
      let distance = profile ? Object.keys(features).reduce((sum, key) => sum + Math.abs(features[key] - profile[key]), 0) : 1.8;
      if (recent.has(food.id)) distance -= 0.12;
      return { food, score: Math.max(0.02, 1 / (0.2 + distance)) };
    }).sort((a, b) => b.score - a.score).slice(0, 6);
    const total = ranked.reduce((sum, item) => sum + item.score, 0) || 1;
    return ranked.map((item) => ({
      food: item.food,
      confidence: Math.round((item.score / total) * 100),
    }));
  }

  function fallbackCandidates(state, core, dateKey) {
    const foods = core.allFoods(state) || [];
    const byId = new Map(foods.map((food) => [food.id, food]));
    const ordered = [];
    const add = (food) => {
      if (food && !ordered.some((item) => item.id === food.id)) ordered.push(food);
    };
    (state.recentFoodIds || []).forEach((id) => add(byId.get(id)));
    try {
      (core.suggestions(state, dateKey || core.todayKey()) || []).forEach(add);
    } catch (error) {
      // Suggestions are optional; the standard food database remains available.
    }
    foods.forEach(add);
    return ordered.slice(0, 6).map((food, index) => ({
      food,
      confidence: Math.max(5, 30 - index * 4),
    }));
  }

  function loadImage(imageSource) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Selected image could not be decoded"));
      image.src = imageSource;
    });
  }

  async function recognizePhoto({ state, core, dateKey, imageSource }) {
    const fallback = () => ({
      provider: "local-fallback",
      candidates: fallbackCandidates(state, core, dateKey),
      note: "画像を解析できなかったため、最近使った食品と代表候補を表示しています。食品と量を確認してください。",
    });
    if (!imageSource || typeof document === "undefined") {
      return fallback();
    }
    try {
      const image = await loadImage(imageSource);
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext("2d");
      if (!context) return fallback();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const features = analyzePixels(context.getImageData(0, 0, canvas.width, canvas.height).data);
      const candidates = rankFoods(core.allFoods(state), features, state.recentFoodIds);
      if (!candidates.length) return fallback();
      return {
        provider: "local-color-heuristic-v1",
        features,
        candidates,
        note: "写真の色・明るさを端末内だけで解析した推定です。候補と量を確認してください。",
      };
    } catch (error) {
      console.warn("Photo analysis fallback", error);
      return fallback();
    }
  }

  const api = { FOOD_PROFILES, analyzePixels, rankFoods, fallbackCandidates, recognizePhoto };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CaloriePhotoRecognition = api;
})(typeof window !== "undefined" ? window : globalThis);
