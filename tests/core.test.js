const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require(path.join(root, "app-core.js"));
const Photo = require(path.join(root, "photo-recognition.js"));

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  process.stdout.write(`ok ${passed} - ${name}\n`);
}

test("first launch state", () => {
  const state = Core.emptyState();
  assert.equal(state.version, Core.CURRENT_VERSION);
  assert.ok(state.foods.length >= 30);
  assert.ok(Array.isArray(state.photoDrafts));
});

test("migration preserves user data and adds defaults", () => {
  const state = Core.migrate({ customFoods: [{ id: "mine", name: "自作" }], foods: [] });
  assert.equal(state.customFoods[0].id, "mine");
  assert.ok(state.foods.some((food) => food.id === "food-rice"));
  assert.ok(state.mealTemplates.length >= 3);
});

test("meal add and nutrition calculation", () => {
  const state = Core.emptyState();
  const rice = state.foods.find((food) => food.id === "food-rice");
  Core.addLogEntry(state, "2026-08-28", "lunch", rice, 1);
  assert.equal(Core.calculateDay(state, "2026-08-28").kcal, 234);
});

test("quantity change recalculates kcal and PFC", () => {
  const state = Core.emptyState();
  const food = state.foods.find((item) => item.id === "food-chicken");
  const entry = Core.addLogEntry(state, "2026-08-28", "dinner", food, 1);
  Core.updateLogQuantity(state, "2026-08-28", entry.id, 2);
  assert.deepEqual(entry.nutrition, { kcal: 226, protein: 48.8, fat: 3.8, carbs: 0 });
});

test("meal delete", () => {
  const state = Core.emptyState();
  const entry = Core.addLogEntry(state, "2026-08-28", "snack", state.foods[0], 1);
  assert.equal(Core.deleteLogEntry(state, "2026-08-28", entry.id), true);
  assert.equal(state.logs["2026-08-28"].length, 0);
});

test("date range and weight change", () => {
  const state = Core.emptyState();
  state.weights["2026-08-27"] = 70;
  state.weights["2026-08-28"] = 69.5;
  const result = Core.analyze(state, 2, "2026-08-28");
  assert.equal(result.rows[0].date, "2026-08-27");
  assert.equal(result.weightChange, -0.5);
});

test("backup and restore", () => {
  const state = Core.emptyState();
  state.settings.calorieGoal = 1800;
  const restored = Core.restoreBackup(Core.createBackup(state));
  assert.equal(restored.settings.calorieGoal, 1800);
  assert.ok(restored.foods.length >= 30);
});

test("meal templates", () => {
  const state = Core.emptyState();
  const added = Core.applyMealTemplate(state, "2026-08-28", "tpl-balanced-breakfast");
  assert.equal(added.length, 3);
  const saved = Core.createMealTemplateFromEntries(state, "2026-08-28", "breakfast", "朝食セット");
  assert.equal(saved.items.length, 3);
});

test("rice portions use food-specific choices", () => {
  const rice = Core.starterFoods.find((food) => food.id === "food-rice");
  const portions = Core.portionOptions(rice);
  assert.deepEqual(portions.map((item) => item.label), ["小盛 100g", "普通盛 150g", "大盛 200g"]);
  assert.equal(portions[1].quantity, 1);
});

test("photo selection nutrition uses food database", () => {
  const rice = Core.starterFoods.find((food) => food.id === "food-rice");
  assert.deepEqual(Core.photoSelectionNutrition(rice, 200 / 150), { kcal: 312, protein: 5.1, fat: 0.7, carbs: 74.3 });
});

test("pixel analysis identifies green-heavy image", () => {
  const pixels = Uint8ClampedArray.from([20, 180, 30, 255, 30, 190, 40, 255]);
  const features = Photo.analyzePixels(pixels);
  assert.equal(features.green, 1);
  assert.ok(features.saturation > 0.6);
});

test("photo candidates are ranked with confidence", () => {
  const foods = Core.starterFoods;
  const candidates = Photo.rankFoods(foods, { brightness: 0.4, saturation: 0.6, warm: 0.08, green: 0.65, dark: 0.28 });
  assert.equal(candidates.length, 6);
  assert.ok(candidates[0].confidence >= candidates[1].confidence);
  assert.ok(["food-broccoli", "food-green-salad"].includes(candidates[0].food.id));
});

test("photo fallback always returns candidates", () => {
  const state = Core.emptyState();
  const candidates = Photo.fallbackCandidates(state, Core, "2026-08-29");
  assert.ok(candidates.length >= 1);
  assert.ok(candidates[0].food);
});

test("photo fallback prioritizes recent foods", () => {
  const state = Core.emptyState();
  state.recentFoodIds = ["food-banana"];
  const candidates = Photo.fallbackCandidates(state, Core, "2026-08-29");
  assert.equal(candidates[0].food.id, "food-banana");
});

test("photo source is attached to saved meal", () => {
  const state = Core.emptyState();
  const entry = Core.addLogEntry(state, "2026-08-28", "lunch", state.foods[0], 1, "photo-analysis", "photo-1");
  assert.equal(entry.source, "photo-analysis");
  assert.equal(entry.photoId, "photo-1");
});

test("manifest keeps GitHub Pages subpath settings", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
});

test("service worker caches all application entrypoints", () => {
  const source = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  ["./index.html", "./app-core.js", "./photo-recognition.js", "./app.js", "./manifest.webmanifest"].forEach((asset) => assert.ok(source.includes(asset)));
});

test("service worker refreshes application code before cache fallback", () => {
  const source = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.ok(source.includes('event.request.mode === "navigate"'));
  assert.ok(source.includes("isAppCode"));
  assert.ok(source.indexOf("fetch(event.request)") < source.lastIndexOf("caches.match(event.request)"));
});

test("photo input handles read failures with fallback candidates", () => {
  const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
  assert.ok(source.includes('reader.onerror = () => renderPhotoCandidates("")'));
  assert.ok(source.includes('reader.onabort = () => renderPhotoCandidates("")'));
  assert.ok(source.includes("recognizer.fallbackCandidates"));
});

test("mobile viewport and photo controls remain present", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.includes("viewport-fit=cover"));
  assert.ok(html.includes('capture="environment"'));
  assert.ok(html.includes('id="photoCandidateChoices"'));
  assert.ok(html.includes('id="photoPortionSelect"'));
});

test("package version and cache version match", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.equal(pkg.version, "1.1.1");
  assert.ok(serviceWorker.includes(`calorie-log-v${pkg.version}`));
});

process.stdout.write(`# ${passed} tests passed\n`);
