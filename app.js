const Core = window.CalorieCore;

let state = loadState();
let selectedDate = Core.todayKey();
let selectedFood = null;
let currentPhotoId = null;
let photoCandidates = [];
let selectedPhotoFoodId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  remainingKcal: $("#remainingKcal"),
  todayKcal: $("#todayKcal"),
  goalKcal: $("#goalKcal"),
  dayMessage: $("#dayMessage"),
  offlineStatus: $("#offlineStatus"),
  datePicker: $("#datePicker"),
  macroGrid: $("#macroGrid"),
  mealSelect: $("#mealSelect"),
  foodSearch: $("#foodSearch"),
  foodResults: $("#foodResults"),
  favoriteChips: $("#favoriteChips"),
  recentChips: $("#recentChips"),
  templateChips: $("#templateChips"),
  templateName: $("#templateName"),
  saveTemplateButton: $("#saveTemplateButton"),
  mealSections: $("#mealSections"),
  customFoodForm: $("#customFoodForm"),
  customFoodList: $("#customFoodList"),
  photoInput: $("#photoInput"),
  photoPreview: $("#photoPreview"),
  photoNote: $("#photoNote"),
  savePhotoNoteButton: $("#savePhotoNoteButton"),
  photoHistory: $("#photoHistory"),
  photoCandidates: $("#photoCandidates"),
  photoResultForm: $("#photoResultForm"),
  photoAnalysisNote: $("#photoAnalysisNote"),
  photoCandidateChoices: $("#photoCandidateChoices"),
  photoPortionSelect: $("#photoPortionSelect"),
  photoMealSelect: $("#photoMealSelect"),
  photoNutritionPreview: $("#photoNutritionPreview"),
  analysis7: $("#analysis7"),
  analysis30: $("#analysis30"),
  calorieChart: $("#calorieChart"),
  weightForm: $("#weightForm"),
  goalForm: $("#goalForm"),
  profileForm: $("#profileForm"),
  backupButton: $("#backupButton"),
  restoreInput: $("#restoreInput"),
  suggestions: $("#suggestions"),
  entryDialog: $("#entryDialog"),
  entryForm: $("#entryForm"),
  entryTitle: $("#entryTitle"),
  entryMeta: $("#entryMeta"),
  toast: $("#toast"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(Core.STORAGE_KEY);
    return Core.migrate(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn(error);
    return Core.emptyState();
  }
}

function saveState() {
  localStorage.setItem(Core.STORAGE_KEY, JSON.stringify(state));
}

function money(n) {
  return Math.round(n).toLocaleString("ja-JP");
}

function macro(n) {
  return Core.roundMacro(n).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
  })[char]);
}

function init() {
  selectedDate = Core.todayKey();
  els.datePicker.value = selectedDate;
  fillMealSelects();
  bindEvents();
  render();
  registerServiceWorker();
}

function fillMealSelects() {
  const options = Core.mealTypes.map((meal) => `<option value="${meal.id}">${meal.label}</option>`).join("");
  els.mealSelect.innerHTML = options;
  els.entryForm.meal.innerHTML = options;
  els.photoMealSelect.innerHTML = options;
}

function bindEvents() {
  $("#prevDate").addEventListener("click", () => shiftDate(-1));
  $("#nextDate").addEventListener("click", () => shiftDate(1));
  els.datePicker.addEventListener("change", () => {
    selectedDate = els.datePicker.value || Core.todayKey();
    render();
  });
  els.foodSearch.addEventListener("input", renderFoodResults);
  $$(".tabs button").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });
  els.customFoodForm.addEventListener("submit", handleCustomFood);
  els.weightForm.addEventListener("submit", handleWeight);
  els.goalForm.addEventListener("submit", handleGoals);
  els.profileForm.addEventListener("submit", handleProfile);
  els.backupButton.addEventListener("click", downloadBackup);
  els.restoreInput.addEventListener("change", restoreBackup);
  els.photoInput.addEventListener("change", handlePhoto);
  els.savePhotoNoteButton.addEventListener("click", handleSavePhotoNote);
  els.photoResultForm.addEventListener("submit", handlePhotoResultSubmit);
  els.photoPortionSelect.addEventListener("change", renderPhotoNutritionPreview);
  els.entryForm.addEventListener("submit", handleEntrySubmit);
  els.saveTemplateButton.addEventListener("click", handleSaveTemplate);
  $("#installHelp").addEventListener("click", () => toast("Safariの共有からホーム画面に追加できます"));
}

function shiftDate(delta) {
  const date = new Date(`${selectedDate}T00:00:00`);
  date.setDate(date.getDate() + delta);
  selectedDate = Core.todayKey(date);
  els.datePicker.value = selectedDate;
  render();
}

function setTab(tab) {
  $$(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tab}`));
  render();
}

function render() {
  saveState();
  renderSummary();
  renderFoodResults();
  renderQuickRails();
  renderTemplates();
  renderMeals();
  renderCustomFoods();
  renderAnalysis();
  renderForms();
  renderPhotoHistory();
  renderSuggestions();
}

function renderTemplates() {
  els.templateChips.innerHTML = state.mealTemplates.map((template) => {
    const nutrition = Core.templateNutrition(state, template);
    return `<button data-template-id="${template.id}">${escapeHtml(template.name)} ${money(nutrition.kcal)}kcal</button>`;
  }).join("") || `<span class="empty">まだありません</span>`;
  els.templateChips.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const entries = Core.applyMealTemplate(state, selectedDate, button.dataset.templateId);
      toast(entries.length ? "テンプレートを追加しました" : "追加できる食品がありません");
      render();
    });
  });
}

function handleSaveTemplate() {
  try {
    const meal = els.mealSelect.value;
    const mealLabel = Core.mealTypes.find((item) => item.id === meal)?.label || "食事";
    const name = els.templateName.value || `${mealLabel}テンプレート`;
    Core.createMealTemplateFromEntries(state, selectedDate, meal, name);
    els.templateName.value = "";
    toast("テンプレートを保存しました");
    render();
  } catch (error) {
    toast(error.message);
  }
}

function renderSummary() {
  const totals = Core.calculateDay(state, selectedDate);
  const left = Core.remaining(state, selectedDate);
  const goal = state.settings.calorieGoal;
  const progress = Math.min(100, Math.max(0, (totals.kcal / Math.max(goal, 1)) * 100));
  $(".meter-ring").style.setProperty("--progress", `${progress}%`);
  els.remainingKcal.textContent = money(left.kcal);
  els.todayKcal.textContent = money(totals.kcal);
  els.goalKcal.textContent = money(goal);
  els.dayMessage.textContent = left.kcal >= 350 ? "まだ余裕があります" : left.kcal >= 0 ? "仕上げは軽めが良さそう" : "今日は目標を超えています";
  els.offlineStatus.textContent = navigator.onLine ? "端末内に保存中" : "オフラインで利用中";
  const macros = [
    ["P", "protein", "たんぱく質"],
    ["F", "fat", "脂質"],
    ["C", "carbs", "炭水化物"],
  ];
  els.macroGrid.innerHTML = macros.map(([short, key, label]) => {
    const remain = state.settings.macroGoals[key] - totals[key];
    return `<div class="macro-card"><span>${label}</span><b>${macro(remain)}g</b><small>${short} ${macro(totals[key])}/${macro(state.settings.macroGoals[key])}g</small></div>`;
  }).join("");
}

function renderFoodResults() {
  const foods = Core.searchFoods(state, els.foodSearch.value);
  els.foodResults.innerHTML = foods.map(foodCard).join("") || `<p class="empty">食品が見つかりません</p>`;
  bindFoodCards(els.foodResults);
}

function foodCard(food) {
  const fav = state.favorites.includes(food.id) ? "★" : "☆";
  return `
    <article class="food-card" data-food-id="${food.id}">
      <div><strong>${escapeHtml(food.name)}</strong><span>${escapeHtml(food.serving)} · ${money(food.kcal)}kcal · P${macro(food.protein)} F${macro(food.fat)} C${macro(food.carbs)}</span></div>
      <div class="card-actions">
        <button class="tiny-button" data-action="favorite" aria-label="お気に入り">${fav}</button>
        <button class="tiny-button" data-action="add" aria-label="追加">＋</button>
      </div>
    </article>`;
}

function bindFoodCards(root) {
  root.querySelectorAll("[data-food-id]").forEach((card) => {
    const food = Core.allFoods(state).find((item) => item.id === card.dataset.foodId);
    card.querySelector("[data-action='add']").addEventListener("click", () => openEntryDialog(food));
    card.querySelector("[data-action='favorite']").addEventListener("click", () => {
      Core.toggleFavorite(state, food.id);
      render();
    });
  });
}

function renderQuickRails() {
  renderChipList(els.favoriteChips, state.favorites);
  renderChipList(els.recentChips, state.recentFoodIds);
}

function renderChipList(root, ids) {
  const foods = ids.map((id) => Core.allFoods(state).find((food) => food.id === id)).filter(Boolean);
  root.innerHTML = foods.map((food) => `<button data-food-id="${food.id}">${escapeHtml(food.name)}</button>`).join("") || `<span class="empty">まだありません</span>`;
  root.querySelectorAll("button").forEach((button) => {
    const food = foods.find((item) => item.id === button.dataset.foodId);
    button.addEventListener("click", () => openEntryDialog(food));
  });
}

function renderMeals() {
  const entries = state.logs[selectedDate] || [];
  els.mealSections.innerHTML = Core.mealTypes.map((meal) => {
    const mealEntries = entries.filter((entry) => entry.meal === meal.id);
    const kcal = mealEntries.reduce((sum, entry) => sum + entry.nutrition.kcal, 0);
    return `
      <section class="meal-section">
        <div class="meal-header"><h2>${meal.label}</h2><span>${money(kcal)} kcal</span></div>
        ${mealEntries.map(mealEntry).join("") || `<p class="empty">未記録</p>`}
      </section>`;
  }).join("");
  els.mealSections.querySelectorAll(".meal-entry").forEach((row) => {
    row.querySelector("[data-action='delete']").addEventListener("click", () => {
      Core.deleteLogEntry(state, selectedDate, row.dataset.entryId);
      toast("削除しました");
      render();
    });
    row.querySelector("input").addEventListener("change", (event) => {
      Core.updateLogQuantity(state, selectedDate, row.dataset.entryId, event.target.value);
      render();
    });
  });
}

function mealEntry(entry) {
  return `
    <article class="meal-entry" data-entry-id="${entry.id}">
      <div>
        <strong>${escapeHtml(entry.name)}</strong>
        <span>${escapeHtml(entry.serving)} × <input aria-label="数量" type="number" min="0.1" step="0.1" value="${entry.quantity}" /> · ${money(entry.nutrition.kcal)}kcal</span>
      </div>
      <button class="tiny-button" data-action="delete" aria-label="削除">×</button>
    </article>`;
}

function openEntryDialog(food) {
  selectedFood = food;
  els.entryTitle.textContent = food.name;
  els.entryMeta.textContent = `${food.serving} · ${money(food.kcal)}kcal · P${macro(food.protein)} F${macro(food.fat)} C${macro(food.carbs)}`;
  els.entryForm.meal.value = els.mealSelect.value;
  els.entryForm.quantity.value = "1";
  els.entryDialog.showModal();
}

function handleEntrySubmit(event) {
  event.preventDefault();
  const submitter = event.submitter && event.submitter.value;
  if (submitter !== "add" || !selectedFood) {
    els.entryDialog.close();
    return;
  }
  Core.addLogEntry(state, selectedDate, els.entryForm.meal.value, selectedFood, els.entryForm.quantity.value, currentPhotoId ? "photo" : "manual", currentPhotoId);
  els.entryDialog.close();
  toast("追加しました");
  render();
}

function handleCustomFood(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const food = Core.addCustomFood(state, data);
    event.currentTarget.reset();
    toast(`${food.name}を登録しました`);
    render();
  } catch (error) {
    toast(error.message);
  }
}

function renderCustomFoods() {
  els.customFoodList.innerHTML = state.customFoods.map(foodCard).join("") || `<p class="empty">自分専用食品はまだありません</p>`;
  bindFoodCards(els.customFoodList);
}

function handlePhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    currentPhotoId = Core.uid("photo");
    const draft = { id: currentPhotoId, date: selectedDate, image: reader.result, note: "", createdAt: new Date().toISOString() };
    state.photoDrafts = [draft, ...state.photoDrafts].slice(0, 8);
    els.photoPreview.src = reader.result;
    els.photoPreview.hidden = false;
    els.photoNote.value = "";
    renderPhotoCandidates(reader.result);
    renderPhotoHistory();
    saveState();
  };
  reader.readAsDataURL(file);
}

function handleSavePhotoNote() {
  if (!currentPhotoId) {
    toast("先に写真を選んでください");
    return;
  }
  const draft = state.photoDrafts.find((item) => item.id === currentPhotoId);
  if (!draft) return;
  draft.note = els.photoNote.value.trim();
  draft.updatedAt = new Date().toISOString();
  toast("写真メモを保存しました");
  renderPhotoHistory();
  saveState();
}

function renderPhotoHistory() {
  const drafts = state.photoDrafts.filter((draft) => draft.date === selectedDate).slice(0, 4);
  els.photoHistory.innerHTML = drafts.map((draft) => `
    <button class="photo-thumb" data-photo-id="${draft.id}" type="button">
      <img src="${draft.image}" alt="" />
      <span>${escapeHtml(draft.note || "メモなし")}</span>
    </button>
  `).join("");
  els.photoHistory.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const draft = state.photoDrafts.find((item) => item.id === button.dataset.photoId);
      if (!draft) return;
      currentPhotoId = draft.id;
      els.photoPreview.src = draft.image;
      els.photoPreview.hidden = false;
      els.photoNote.value = draft.note || "";
      renderPhotoCandidates(draft.image);
    });
  });
}

async function renderPhotoCandidates(imageSource) {
  const recognizer = window.CaloriePhotoRecognition;
  els.photoCandidates.innerHTML = `<p class="empty">写真を端末内で解析しています…</p>`;
  els.photoResultForm.hidden = true;
  try {
    const result = recognizer
      ? await recognizer.recognizePhoto({ state, dateKey: selectedDate, core: Core, imageSource })
      : { candidates: Core.suggestions(state, selectedDate).map((food) => ({ food, confidence: 0 })) };
    photoCandidates = (result.candidates || []).map((candidate) => candidate.food ? candidate : { food: candidate, confidence: 0 });
    selectedPhotoFoodId = photoCandidates[0]?.food.id || null;
    els.photoCandidates.innerHTML = "";
    els.photoAnalysisNote.textContent = result.note || "候補と量を確認してください。";
    renderPhotoResultChoices();
    els.photoResultForm.hidden = !selectedPhotoFoodId;
  } catch (error) {
    console.warn(error);
    els.photoCandidates.innerHTML = `<p class="empty">解析できませんでした。別の写真を選んでください。</p>`;
  }
}

function renderPhotoResultChoices() {
  els.photoCandidateChoices.innerHTML = photoCandidates.map((candidate, index) => `
    <label class="candidate-choice ${candidate.food.id === selectedPhotoFoodId ? "selected" : ""}">
      <input type="radio" name="photoFood" value="${candidate.food.id}" ${candidate.food.id === selectedPhotoFoodId ? "checked" : ""} />
      <span><b>${index + 1}. ${escapeHtml(candidate.food.name)}</b><small>推定 ${candidate.confidence}%</small></span>
    </label>
  `).join("");
  els.photoCandidateChoices.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      selectedPhotoFoodId = input.value;
      renderPhotoResultChoices();
      renderPhotoPortions();
    });
  });
  renderPhotoPortions();
}

function selectedPhotoFood() {
  return photoCandidates.find((candidate) => candidate.food.id === selectedPhotoFoodId)?.food || null;
}

function renderPhotoPortions() {
  const food = selectedPhotoFood();
  if (!food) return;
  els.photoPortionSelect.innerHTML = Core.portionOptions(food).map((portion, index) =>
    `<option value="${portion.quantity}" ${index === 1 ? "selected" : ""}>${escapeHtml(portion.label)}</option>`
  ).join("");
  els.photoMealSelect.value = els.mealSelect.value;
  renderPhotoNutritionPreview();
}

function renderPhotoNutritionPreview() {
  const food = selectedPhotoFood();
  if (!food) return;
  const nutrition = Core.photoSelectionNutrition(food, els.photoPortionSelect.value);
  els.photoNutritionPreview.innerHTML = `<b>${nutrition.kcal} kcal</b><span>P ${nutrition.protein}g</span><span>F ${nutrition.fat}g</span><span>C ${nutrition.carbs}g</span>`;
}

function handlePhotoResultSubmit(event) {
  event.preventDefault();
  const food = selectedPhotoFood();
  if (!food) return;
  Core.addLogEntry(state, selectedDate, els.photoMealSelect.value, food, els.photoPortionSelect.value, "photo-analysis", currentPhotoId);
  toast(`${food.name}を記録しました`);
  setTab("log");
  render();
}

function handleWeight(event) {
  event.preventDefault();
  state.weights[selectedDate] = Number(new FormData(event.currentTarget).get("weight"));
  toast("体重を保存しました");
  render();
}

function handleGoals(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.settings.calorieGoal = Number(data.calorieGoal) || state.settings.calorieGoal;
  state.settings.macroGoals = {
    protein: Number(data.protein) || state.settings.macroGoals.protein,
    fat: Number(data.fat) || state.settings.macroGoals.fat,
    carbs: Number(data.carbs) || state.settings.macroGoals.carbs,
  };
  toast("目標を保存しました");
  render();
}

function handleProfile(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.settings.profile = {
    sex: data.sex,
    age: Number(data.age),
    heightCm: Number(data.heightCm),
    weightKg: Number(data.weightKg),
    activity: Number(data.activity),
    goal: data.goal,
  };
  const estimate = Core.estimateGoals(state.settings.profile);
  state.settings.calorieGoal = estimate.calorieGoal;
  state.settings.macroGoals = estimate.macroGoals;
  toast("目安を反映しました");
  render();
}

function renderAnalysis() {
  renderAnalysisBox(els.analysis7, Core.analyze(state, 7, selectedDate));
  renderAnalysisBox(els.analysis30, Core.analyze(state, 30, selectedDate));
  const rows = Core.rangeTotals(state, 30, selectedDate);
  const max = Math.max(state.settings.calorieGoal, ...rows.map((row) => row.kcal), 1);
  els.calorieChart.innerHTML = rows.map((row) => `<div class="bar" title="${row.date} ${money(row.kcal)}kcal" style="height:${Math.max(4, (row.kcal / max) * 140)}px"></div>`).join("");
}

function renderAnalysisBox(root, analysis) {
  root.innerHTML = `
    <div class="metric-row"><span>平均kcal</span><b>${money(analysis.avgKcal)}</b></div>
    <div class="metric-row"><span>平均P</span><b>${macro(analysis.avgProtein)}g</b></div>
    <div class="metric-row"><span>記録日数</span><b>${analysis.loggedDays}日</b></div>
    <div class="metric-row"><span>体重変化</span><b>${macro(analysis.weightChange)}kg</b></div>`;
}

function renderForms() {
  els.goalForm.calorieGoal.value = state.settings.calorieGoal;
  els.goalForm.protein.value = state.settings.macroGoals.protein;
  els.goalForm.fat.value = state.settings.macroGoals.fat;
  els.goalForm.carbs.value = state.settings.macroGoals.carbs;
  Object.entries(state.settings.profile).forEach(([key, value]) => {
    if (els.profileForm[key]) els.profileForm[key].value = value;
  });
  els.weightForm.weight.value = state.weights[selectedDate] || "";
}

function renderSuggestions() {
  els.suggestions.innerHTML = Core.suggestions(state, selectedDate).map(foodCard).join("");
  bindFoodCards(els.suggestions);
}

function downloadBackup() {
  const blob = new Blob([Core.createBackup(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `calorie-log-backup-${selectedDate}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("バックアップを作成しました");
}

function restoreBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = Core.restoreBackup(reader.result);
      selectedDate = Core.todayKey();
      els.datePicker.value = selectedDate;
      toast("復元しました");
      render();
    } catch (error) {
      toast("復元できませんでした");
    }
  };
  reader.readAsText(file);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { els.toast.hidden = true; }, 2200);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const base = new URL(".", location.href);
  navigator.serviceWorker.register(new URL("sw.js", base)).catch((error) => console.warn(error));
}

window.addEventListener("online", renderSummary);
window.addEventListener("offline", renderSummary);
init();
