(function (root) {
  const STORAGE_KEY = "calorie-log:v1";
  const CURRENT_VERSION = 1;

  const mealTypes = [
    { id: "breakfast", label: "朝食" },
    { id: "lunch", label: "昼食" },
    { id: "dinner", label: "夕食" },
    { id: "snack", label: "間食" },
  ];

  const starterFoods = [
    { id: "food-rice", name: "ごはん", serving: "150g", grams: 150, kcal: 234, protein: 3.8, fat: 0.5, carbs: 55.7, tags: ["主食"] },
    { id: "food-oatmeal", name: "オートミール", serving: "40g", grams: 40, kcal: 152, protein: 5.5, fat: 2.3, carbs: 27.6, tags: ["朝食"] },
    { id: "food-egg", name: "ゆで卵", serving: "1個", grams: 55, kcal: 74, protein: 6.8, fat: 5.2, carbs: 0.2, tags: ["たんぱく質"] },
    { id: "food-chicken", name: "鶏むね肉", serving: "100g", grams: 100, kcal: 113, protein: 24.4, fat: 1.9, carbs: 0, tags: ["たんぱく質"] },
    { id: "food-salmon", name: "鮭", serving: "100g", grams: 100, kcal: 139, protein: 22.3, fat: 4.1, carbs: 0.1, tags: ["魚"] },
    { id: "food-tofu", name: "豆腐", serving: "150g", grams: 150, kcal: 84, protein: 7.5, fat: 4.5, carbs: 3, tags: ["大豆"] },
    { id: "food-natto", name: "納豆", serving: "1パック", grams: 45, kcal: 86, protein: 7.4, fat: 4.5, carbs: 5.4, tags: ["大豆"] },
    { id: "food-banana", name: "バナナ", serving: "1本", grams: 100, kcal: 93, protein: 1.1, fat: 0.2, carbs: 22.5, tags: ["果物"] },
    { id: "food-yogurt", name: "ギリシャヨーグルト", serving: "100g", grams: 100, kcal: 99, protein: 10, fat: 5, carbs: 3.6, tags: ["朝食"] },
    { id: "food-miso", name: "味噌汁", serving: "1杯", grams: 180, kcal: 56, protein: 3.4, fat: 1.7, carbs: 6.8, tags: ["汁物"] },
    { id: "food-avocado", name: "アボカド", serving: "1/2個", grams: 70, kcal: 123, protein: 1.8, fat: 10.5, carbs: 6.2, tags: ["脂質"] },
    { id: "food-almond", name: "アーモンド", serving: "20g", grams: 20, kcal: 122, protein: 4.1, fat: 10.8, carbs: 4.2, tags: ["間食"] },
    { id: "food-bread", name: "食パン", serving: "6枚切り1枚", grams: 60, kcal: 149, protein: 5.3, fat: 2.5, carbs: 27.8, tags: ["主食", "朝食"] },
    { id: "food-pasta", name: "パスタ", serving: "乾麺100g", grams: 100, kcal: 347, protein: 13, fat: 2.2, carbs: 73, tags: ["主食"] },
    { id: "food-udon", name: "うどん", serving: "1玉", grams: 230, kcal: 242, protein: 6.1, fat: 0.9, carbs: 49.7, tags: ["主食"] },
    { id: "food-soba", name: "そば", serving: "1玉", grams: 170, kcal: 224, protein: 8.2, fat: 1.7, carbs: 43.7, tags: ["主食"] },
    { id: "food-tuna", name: "ツナ水煮", serving: "1缶", grams: 70, kcal: 53, protein: 11.6, fat: 0.5, carbs: 0.2, tags: ["魚", "たんぱく質"] },
    { id: "food-pork", name: "豚ロース", serving: "100g", grams: 100, kcal: 248, protein: 19.3, fat: 19.2, carbs: 0.2, tags: ["たんぱく質"] },
    { id: "food-beef", name: "牛赤身肉", serving: "100g", grams: 100, kcal: 140, protein: 22.5, fat: 4.6, carbs: 0.4, tags: ["たんぱく質"] },
    { id: "food-shrimp", name: "えび", serving: "100g", grams: 100, kcal: 82, protein: 18.4, fat: 0.3, carbs: 0.1, tags: ["魚", "たんぱく質"] },
    { id: "food-broccoli", name: "ブロッコリー", serving: "100g", grams: 100, kcal: 37, protein: 5.4, fat: 0.6, carbs: 6.6, tags: ["野菜"] },
    { id: "food-spinach", name: "ほうれん草", serving: "100g", grams: 100, kcal: 18, protein: 2.2, fat: 0.4, carbs: 3.1, tags: ["野菜"] },
    { id: "food-tomato", name: "トマト", serving: "1個", grams: 150, kcal: 30, protein: 1.1, fat: 0.2, carbs: 7.1, tags: ["野菜"] },
    { id: "food-sweet-potato", name: "さつまいも", serving: "100g", grams: 100, kcal: 126, protein: 1.2, fat: 0.2, carbs: 31.9, tags: ["主食", "間食"] },
    { id: "food-apple", name: "りんご", serving: "1/2個", grams: 125, kcal: 70, protein: 0.2, fat: 0.4, carbs: 19.2, tags: ["果物"] },
    { id: "food-milk", name: "牛乳", serving: "200ml", grams: 206, kcal: 126, protein: 6.8, fat: 7.8, carbs: 9.9, tags: ["飲み物"] },
    { id: "food-protein", name: "プロテイン", serving: "1杯", grams: 30, kcal: 120, protein: 22, fat: 1.8, carbs: 3.5, tags: ["たんぱく質", "間食"] },
    { id: "food-onigiri", name: "おにぎり", serving: "1個", grams: 110, kcal: 180, protein: 3.2, fat: 0.6, carbs: 39.6, tags: ["主食", "昼食"] },
    { id: "food-salad-chicken", name: "サラダチキン", serving: "1個", grams: 110, kcal: 121, protein: 24.2, fat: 1.7, carbs: 1.5, tags: ["コンビニ", "たんぱく質"] },
    { id: "food-green-salad", name: "グリーンサラダ", serving: "1皿", grams: 120, kcal: 38, protein: 1.8, fat: 0.3, carbs: 8.2, tags: ["野菜", "コンビニ"] },
  ];

  const defaultMealTemplates = [
    { id: "tpl-balanced-breakfast", name: "定番朝食", meal: "breakfast", items: [{ foodId: "food-rice", quantity: 0.8 }, { foodId: "food-egg", quantity: 1 }, { foodId: "food-miso", quantity: 1 }] },
    { id: "tpl-high-protein-lunch", name: "高たんぱく昼食", meal: "lunch", items: [{ foodId: "food-salad-chicken", quantity: 1 }, { foodId: "food-onigiri", quantity: 1 }, { foodId: "food-green-salad", quantity: 1 }] },
    { id: "tpl-light-snack", name: "軽め間食", meal: "snack", items: [{ foodId: "food-yogurt", quantity: 1 }, { foodId: "food-banana", quantity: 0.5 }] },
  ];

  const defaultSettings = {
    calorieGoal: 2000,
    macroGoals: { protein: 100, fat: 55, carbs: 250 },
    profile: { sex: "female", age: 35, heightCm: 160, weightKg: 55, activity: 1.375, goal: "maintain" },
  };

  function todayKey(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function uid(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function emptyState() {
    return {
      version: CURRENT_VERSION,
      settings: structuredCloneSafe(defaultSettings),
      foods: structuredCloneSafe(starterFoods),
      customFoods: [],
      logs: {},
      weights: {},
      favorites: [],
      recentFoodIds: [],
      mealTemplates: structuredCloneSafe(defaultMealTemplates),
      photoDrafts: [],
    };
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function migrate(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    const base = emptyState();
    const state = { ...base, ...raw };
    state.version = CURRENT_VERSION;
    state.settings = {
      ...base.settings,
      ...(raw.settings || {}),
      macroGoals: { ...base.settings.macroGoals, ...((raw.settings && raw.settings.macroGoals) || {}) },
      profile: { ...base.settings.profile, ...((raw.settings && raw.settings.profile) || {}) },
    };
    state.foods = mergeStarterFoods(raw.foods);
    state.customFoods = Array.isArray(raw.customFoods) ? raw.customFoods : [];
    state.logs = raw.logs && typeof raw.logs === "object" ? raw.logs : {};
    state.weights = raw.weights && typeof raw.weights === "object" ? raw.weights : {};
    state.favorites = Array.isArray(raw.favorites) ? raw.favorites : [];
    state.recentFoodIds = Array.isArray(raw.recentFoodIds) ? raw.recentFoodIds : [];
    state.mealTemplates = mergeMealTemplates(raw.mealTemplates);
    state.photoDrafts = Array.isArray(raw.photoDrafts) ? raw.photoDrafts : [];
    return state;
  }

  function mergeById(saved, defaults) {
    const savedItems = Array.isArray(saved) ? saved : [];
    const map = new Map(defaults.map((item) => [item.id, structuredCloneSafe(item)]));
    savedItems.forEach((item) => {
      if (item && item.id) map.set(item.id, { ...map.get(item.id), ...item });
    });
    return [...map.values()];
  }

  function mergeStarterFoods(savedFoods) {
    return mergeById(savedFoods, starterFoods);
  }

  function mergeMealTemplates(savedTemplates) {
    return mergeById(savedTemplates, defaultMealTemplates);
  }

  function allFoods(state) {
    return [...state.customFoods, ...state.foods];
  }

  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function scaleFood(food, quantity = 1) {
    const q = Math.max(0, normalizeNumber(quantity, 1));
    return {
      kcal: food.kcal * q,
      protein: food.protein * q,
      fat: food.fat * q,
      carbs: food.carbs * q,
    };
  }

  function roundMacro(value) {
    return Math.round(normalizeNumber(value) * 10) / 10;
  }

  function calculateDay(state, dateKey) {
    const entries = state.logs[dateKey] || [];
    return entries.reduce((sum, entry) => {
      const nutrition = entry.nutrition || {};
      sum.kcal += normalizeNumber(nutrition.kcal);
      sum.protein += normalizeNumber(nutrition.protein);
      sum.fat += normalizeNumber(nutrition.fat);
      sum.carbs += normalizeNumber(nutrition.carbs);
      return sum;
    }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  }

  function remaining(state, dateKey) {
    const totals = calculateDay(state, dateKey);
    return {
      kcal: state.settings.calorieGoal - totals.kcal,
      protein: state.settings.macroGoals.protein - totals.protein,
      fat: state.settings.macroGoals.fat - totals.fat,
      carbs: state.settings.macroGoals.carbs - totals.carbs,
    };
  }

  function addLogEntry(state, dateKey, meal, food, quantity, source = "manual", photoId = null) {
    const entry = {
      id: uid("log"),
      foodId: food.id,
      name: food.name,
      meal,
      quantity: Math.max(0.1, normalizeNumber(quantity, 1)),
      serving: food.serving || "1食",
      nutrition: scaleFood(food, quantity),
      source,
      photoId,
      createdAt: new Date().toISOString(),
    };
    state.logs[dateKey] = [...(state.logs[dateKey] || []), entry];
    touchRecent(state, food.id);
    return entry;
  }

  function updateLogQuantity(state, dateKey, entryId, quantity) {
    const entries = state.logs[dateKey] || [];
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return null;
    const food = allFoods(state).find((item) => item.id === entry.foodId) || entry;
    entry.quantity = Math.max(0.1, normalizeNumber(quantity, 1));
    entry.nutrition = scaleFood(food, entry.quantity);
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  function deleteLogEntry(state, dateKey, entryId) {
    const before = state.logs[dateKey] || [];
    state.logs[dateKey] = before.filter((entry) => entry.id !== entryId);
    return before.length !== state.logs[dateKey].length;
  }

  function templateNutrition(state, template) {
    return template.items.reduce((sum, item) => {
      const food = allFoods(state).find((candidate) => candidate.id === item.foodId);
      if (!food) return sum;
      const nutrition = scaleFood(food, item.quantity);
      sum.kcal += nutrition.kcal;
      sum.protein += nutrition.protein;
      sum.fat += nutrition.fat;
      sum.carbs += nutrition.carbs;
      return sum;
    }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  }

  function applyMealTemplate(state, dateKey, templateId) {
    const template = state.mealTemplates.find((item) => item.id === templateId);
    if (!template) return [];
    return template.items.map((item) => {
      const food = allFoods(state).find((candidate) => candidate.id === item.foodId);
      if (!food) return null;
      return addLogEntry(state, dateKey, template.meal, food, item.quantity, "template");
    }).filter(Boolean);
  }

  function createMealTemplateFromEntries(state, dateKey, meal, name) {
    const entries = (state.logs[dateKey] || []).filter((entry) => entry.meal === meal);
    if (!entries.length) throw new Error("テンプレートにする食事がありません");
    const template = {
      id: uid("tpl"),
      name: String(name || "マイテンプレート").trim(),
      meal,
      items: entries.map((entry) => ({ foodId: entry.foodId, quantity: entry.quantity })),
      createdAt: new Date().toISOString(),
    };
    state.mealTemplates.unshift(template);
    return template;
  }

  function addCustomFood(state, food) {
    const item = {
      id: uid("custom"),
      name: String(food.name || "").trim(),
      serving: String(food.serving || "1食").trim(),
      grams: normalizeNumber(food.grams, 0),
      kcal: normalizeNumber(food.kcal, 0),
      protein: normalizeNumber(food.protein, 0),
      fat: normalizeNumber(food.fat, 0),
      carbs: normalizeNumber(food.carbs, 0),
      tags: ["自分用"],
      createdAt: new Date().toISOString(),
    };
    if (!item.name) throw new Error("食品名が必要です");
    state.customFoods.unshift(item);
    return item;
  }

  function searchFoods(state, query) {
    const words = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const foods = allFoods(state);
    if (!words.length) return foods.slice(0, 24);
    return foods.filter((food) => {
      const haystack = `${food.name} ${food.serving} ${(food.tags || []).join(" ")}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    }).slice(0, 30);
  }

  function touchRecent(state, foodId) {
    state.recentFoodIds = [foodId, ...state.recentFoodIds.filter((id) => id !== foodId)].slice(0, 12);
  }

  function toggleFavorite(state, foodId) {
    state.favorites = state.favorites.includes(foodId)
      ? state.favorites.filter((id) => id !== foodId)
      : [foodId, ...state.favorites].slice(0, 24);
    return state.favorites.includes(foodId);
  }

  function rangeTotals(state, days, endDateKey = todayKey()) {
    const end = new Date(`${endDateKey}T00:00:00`);
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (days - index - 1));
      const key = todayKey(date);
      return { date: key, ...calculateDay(state, key), weight: state.weights[key] || null };
    });
  }

  function average(values) {
    const real = values.filter((value) => Number.isFinite(value));
    if (!real.length) return 0;
    return real.reduce((sum, value) => sum + value, 0) / real.length;
  }

  function analyze(state, days, endDateKey = todayKey()) {
    const rows = rangeTotals(state, days, endDateKey);
    return {
      rows,
      avgKcal: average(rows.map((row) => row.kcal)),
      avgProtein: average(rows.map((row) => row.protein)),
      loggedDays: rows.filter((row) => row.kcal > 0).length,
      weightChange: weightChange(rows),
    };
  }

  function weightChange(rows) {
    const weights = rows.filter((row) => row.weight).map((row) => ({ date: row.date, weight: normalizeNumber(row.weight) }));
    if (weights.length < 2) return 0;
    return weights[weights.length - 1].weight - weights[0].weight;
  }

  function estimateGoals(profile) {
    const weight = normalizeNumber(profile.weightKg, 55);
    const height = normalizeNumber(profile.heightCm, 160);
    const age = normalizeNumber(profile.age, 35);
    const sexOffset = profile.sex === "male" ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
    const activity = normalizeNumber(profile.activity, 1.375);
    const goalOffset = profile.goal === "lose" ? -300 : profile.goal === "gain" ? 250 : 0;
    const calorieGoal = Math.max(1200, Math.round((bmr * activity + goalOffset) / 10) * 10);
    const protein = Math.round(weight * (profile.goal === "gain" ? 1.8 : 1.6));
    const fat = Math.round((calorieGoal * 0.25) / 9);
    const carbs = Math.round((calorieGoal - protein * 4 - fat * 9) / 4);
    return { calorieGoal, macroGoals: { protein, fat, carbs } };
  }

  function suggestions(state, dateKey) {
    const left = remaining(state, dateKey);
    const candidates = allFoods(state).map((food) => {
      const score =
        Math.abs(left.kcal - food.kcal) / 20 +
        (left.protein > 15 && food.protein > 10 ? -8 : 0) +
        (left.fat < 10 && food.fat > 12 ? 10 : 0) +
        (left.carbs < 20 && food.carbs > 30 ? 8 : 0);
      return { food, score };
    });
    return candidates.sort((a, b) => a.score - b.score).slice(0, 5).map((item) => item.food);
  }

  function createBackup(state) {
    return JSON.stringify({ exportedAt: new Date().toISOString(), app: "Calorie Log", state }, null, 2);
  }

  function restoreBackup(json) {
    const parsed = JSON.parse(json);
    return migrate(parsed.state || parsed);
  }

  const api = {
    STORAGE_KEY,
    CURRENT_VERSION,
    mealTypes,
    starterFoods,
    defaultMealTemplates,
    defaultSettings,
    todayKey,
    uid,
    emptyState,
    migrate,
    allFoods,
    normalizeNumber,
    scaleFood,
    roundMacro,
    calculateDay,
    remaining,
    addLogEntry,
    updateLogQuantity,
    deleteLogEntry,
    templateNutrition,
    applyMealTemplate,
    createMealTemplateFromEntries,
    addCustomFood,
    searchFoods,
    touchRecent,
    toggleFavorite,
    rangeTotals,
    analyze,
    estimateGoals,
    suggestions,
    createBackup,
    restoreBackup,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CalorieCore = api;
})(typeof window !== "undefined" ? window : globalThis);
