(function (root) {
  const TESSERACT_URLS = ["https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js", "https://unpkg.com/tesseract.js@6/dist/tesseract.min.js"];
  const CDN_OPTIONS = [
    { workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6" },
    { workerPath: "https://unpkg.com/tesseract.js@6/dist/worker.min.js", corePath: "https://unpkg.com/tesseract.js-core@6" },
  ];
  const ALIASES = {
    kcal: ["エネルギー", "熱量", "energy"], protein: ["たんぱく質", "蛋白質", "protein"],
    fat: ["脂質", "fat"], carbs: ["炭水化物", "carbohydrate", "carbs"], sugar: ["糖質", "sugar"],
    fiber: ["食物繊維", "dietaryfiber", "fiber"], salt: ["食塩相当量", "食塩", "saltequivalent"], sodium: ["ナトリウム", "sodium"],
  };

  function normalizeText(value) {
    return String(value || "").normalize("NFKC").replace(/\r/g, "").replace(/[：]/g, ":").replace(/[，、]/g, ",")
      .replace(/[ \t\u3000]+/g, " ").replace(/([ぁ-んァ-ヶ一-龠々])[ \t]+(?=[ぁ-んァ-ヶ一-龠々])/g, "$1").trim();
  }
  function compact(value) { return normalizeText(value).toLowerCase().replace(/[\s:・|=()（）［］\[\]]/g, ""); }
  function readNumber(value) { const m = String(value).replace(/(?<=\d)[oO](?=\d|\b)/g, "0").replace(/(?<=\d)[lI](?=\d|\b)/g, "1").match(/([0-9]+(?:[.,][0-9]+)?)/); return m ? Number(m[1].replace(",", ".")) : null; }
  function nearLabel(lines, aliases) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = compact(lines[i]); const alias = aliases.map(compact).find((a) => line.includes(a)); if (!alias) continue;
      const same = readNumber(line.slice(line.indexOf(alias) + alias.length)); if (same != null) return same;
      const next = readNumber(lines[i + 1] || ""); if (next != null) return next;
    }
    return null;
  }
  function numericFallback(text) {
    const energy = normalizeText(text).match(/([0-9]+(?:[.,][0-9]+)?)\s*kcal/i);
    const grams = [...normalizeText(text).matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi)].map((m) => Number(m[1].replace(",", ".")));
    if (!energy || grams.length < 4) return {};
    return { kcal: Number(energy[1].replace(",", ".")), protein: grams[0], fat: grams[1], carbs: grams[2], sugar: grams.length >= 6 ? grams[3] : null, fiber: grams.length >= 6 ? grams[4] : null, salt: grams.length >= 6 ? grams[5] : grams[3] };
  }
  function parseNutritionText(rawText) {
    const text = normalizeText(rawText), lines = text.split("\n").map((x) => x.trim()).filter(Boolean), flat = compact(text), fallback = numericFallback(text), values = {};
    Object.keys(ALIASES).forEach((key) => { values[key] = nearLabel(lines, ALIASES[key]); });
    const content = text.match(/内容量\s*:?\s*([0-9]+(?:[.,][0-9]+)?\s*(?:kg|g|ml|l|個|本|袋|枚))/i);
    const serving = flat.match(/(100g|1(?:包装|個|食|本|袋|パック|枚|缶))(?:当たり|あたり|当り)?/i);
    const kj = flat.match(/(?:エネルギー|熱量|energy).*?([0-9]+(?:[.,][0-9]+)?)kj/i);
    let kcal = values.kcal ?? fallback.kcal ?? null; if (kj && kcal != null) kcal /= 4.184;
    let salt = values.salt; if (salt == null && values.sodium != null) salt = values.sodium * (/ナトリウム.*mg|sodium.*mg/i.test(text) ? .001 : 1) * 2.54;
    const nutrition = { kcal, protein: values.protein ?? fallback.protein ?? null, fat: values.fat ?? fallback.fat ?? null, carbs: values.carbs ?? fallback.carbs ?? null, salt: salt ?? fallback.salt ?? null, sugar: values.sugar ?? fallback.sugar ?? null, fiber: values.fiber ?? fallback.fiber ?? null };
    if (nutrition.kcal != null) nutrition.kcal = Math.round(nutrition.kcal * 10) / 10; if (nutrition.salt != null) nutrition.salt = Math.round(nutrition.salt * 1000) / 1000;
    const labels = /栄養成分|エネルギー|熱量|たんぱく質|蛋白質|脂質|炭水化物|食塩|糖質|食物繊維|protein|fat|carbohydrate|energy/i;
    const productName = lines.find((line) => !labels.test(line) && !/^内容量/i.test(line) && /[^0-9 .,:()]/.test(line)) || "";
    const found = ["kcal", "protein", "fat", "carbs", "salt"].filter((key) => nutrition[key] != null).length;
    return { barcode: "", productName, contentAmount: content ? content[1].replace(/\s/g, "") : "", servingUnit: serving ? serving[1] : "1包装", nutritionPerServing: nutrition, confidence: Math.min(100, found * 18 + (serving ? 6 : 0)), rawText: text, detected: found >= 2 };
  }
  function mergeProducts(products) {
    const valid = products.filter(Boolean), merged = JSON.parse(JSON.stringify(valid[0] || parseNutritionText("")));
    ["productName", "contentAmount", "servingUnit"].forEach((key) => { if (!merged[key] || (key === "servingUnit" && merged[key] === "1包装")) merged[key] = valid.map((p) => p[key]).find((v) => v && v !== "1包装") || merged[key]; });
    Object.keys(merged.nutritionPerServing).forEach((key) => { if (merged.nutritionPerServing[key] == null) merged.nutritionPerServing[key] = valid.map((p) => p.nutritionPerServing[key]).find((v) => v != null) ?? null; });
    const found = ["kcal", "protein", "fat", "carbs", "salt"].filter((key) => merged.nutritionPerServing[key] != null).length; merged.detected = found >= 2; merged.confidence = Math.max(...valid.map((p) => p.confidence || 0), found * 18); return merged;
  }
  function fitDimensions(width, height, targetWidth = 2400, maxPixels = 5200000) {
    let scale = Math.min(2.5, Math.max(1, targetWidth / Math.max(1, width))); if (width * height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (width * height));
    return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale };
  }
  function adaptiveThreshold(gray, width, height, radius = 15, bias = 9) {
    const sum = new Float64Array((width + 1) * (height + 1)), out = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y += 1) { let row = 0; for (let x = 0; x < width; x += 1) { row += gray[y * width + x]; sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1] + row; } }
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const x0 = Math.max(0, x - radius), y0 = Math.max(0, y - radius), x1 = Math.min(width - 1, x + radius), y1 = Math.min(height - 1, y + radius); const total = sum[(y1 + 1) * (width + 1) + x1 + 1] - sum[y0 * (width + 1) + x1 + 1] - sum[(y1 + 1) * (width + 1) + x0] + sum[y0 * (width + 1) + x0]; out[y * width + x] = gray[y * width + x] < total / ((x1 - x0 + 1) * (y1 - y0 + 1)) - bias ? 0 : 255; }
    return out;
  }
  function removeRules(binary, width, height, ratio = .72) {
    const out = new Uint8ClampedArray(binary);
    for (let y = 0; y < height; y += 1) { let n = 0; for (let x = 0; x < width; x += 1) n += binary[y * width + x] < 128; if (n / width > ratio) out.fill(255, Math.max(0, y - 1) * width, Math.min(height, y + 2) * width); }
    for (let x = 0; x < width; x += 1) { let n = 0; for (let y = 0; y < height; y += 1) n += binary[y * width + x] < 128; if (n / height > ratio) for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) for (let y = 0; y < height; y += 1) out[y * width + xx] = 255; }
    return out;
  }
  function edgeCropBounds(gray, width, height) {
    const rows = new Float64Array(height), cols = new Float64Array(width);
    for (let y = 1; y < height; y += 1) for (let x = 1; x < width; x += 1) { const e = Math.abs(gray[y * width + x] - gray[y * width + x - 1]) + Math.abs(gray[y * width + x] - gray[(y - 1) * width + x]); rows[y] += e; cols[x] += e; }
    function range(a) { const total = a.reduce((x, y) => x + y, 0); if (!total) return [0, a.length - 1]; let s = 0, lo = 0, hi = a.length - 1; while (lo < a.length && s < total * .06) s += a[lo++]; s = 0; while (hi > 0 && s < total * .06) s += a[hi--]; return [Math.max(0, lo - 2), Math.min(a.length - 1, hi + 2)]; }
    const [l, r] = range(cols), [t, b] = range(rows); return r - l < width * .35 || b - t < height * .35 ? { x: 0, y: 0, width, height } : { x: l, y: t, width: r - l + 1, height: b - t + 1 };
  }
  function pixelsCanvas(pixels, width, height) { const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"); canvas.width = width; canvas.height = height; const data = ctx.createImageData(width, height); for (let i = 0; i < pixels.length; i += 1) { const p = i * 4; data.data[p] = data.data[p + 1] = data.data[p + 2] = pixels[i]; data.data[p + 3] = 255; } ctx.putImageData(data, 0, 0); return canvas; }
  function decodeImage(src) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("画像を展開できません。HEICの場合はJPEGまたはPNGへ変換してください")); image.src = src; }); }
  async function preprocessImage(src, cropOverride) {
    const image = await decodeImage(src), sample = document.createElement("canvas"), ratio = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight)); sample.width = Math.round(image.naturalWidth * ratio); sample.height = Math.round(image.naturalHeight * ratio);
    const sc = sample.getContext("2d", { willReadFrequently: true }); sc.drawImage(image, 0, 0, sample.width, sample.height); const rgba = sc.getImageData(0, 0, sample.width, sample.height).data, sg = new Uint8ClampedArray(sample.width * sample.height); for (let i = 0; i < sg.length; i += 1) sg[i] = rgba[i * 4] * .299 + rgba[i * 4 + 1] * .587 + rgba[i * 4 + 2] * .114;
    const auto = edgeCropBounds(sg, sample.width, sample.height), c = cropOverride || { x: auto.x / sample.width, y: auto.y / sample.height, width: auto.width / sample.width, height: auto.height / sample.height };
    const sx = c.x * image.naturalWidth, sy = c.y * image.naturalHeight, sw = c.width * image.naturalWidth, sh = c.height * image.naturalHeight, d = fitDimensions(sw, sh), canvas = document.createElement("canvas"); canvas.width = d.width; canvas.height = d.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.imageSmoothingQuality = "high"; ctx.drawImage(image, sx, sy, sw, sh, 0, 0, d.width, d.height); const p = ctx.getImageData(0, 0, d.width, d.height).data, gray = new Uint8ClampedArray(d.width * d.height); for (let i = 0; i < gray.length; i += 1) gray[i] = p[i * 4] * .299 + p[i * 4 + 1] * .587 + p[i * 4 + 2] * .114;
    const clean = removeRules(adaptiveThreshold(gray, d.width, d.height, Math.max(12, Math.round(d.width / 100))), d.width, d.height), preview = pixelsCanvas(clean, d.width, d.height);
    return { variants: [preview, pixelsCanvas(gray, d.width, d.height)], preview, crop: c, diagnostics: { original: image.naturalWidth + "x" + image.naturalHeight, crop: Math.round(sw) + "x" + Math.round(sh), output: d.width + "x" + d.height, scale: Number(d.scale.toFixed(2)), preprocessing: "auto-crop, grayscale, adaptive-threshold, rule-removal, high-resolution-scale" } };
  }
  function loadScript(url) { return new Promise((resolve, reject) => { const s = document.createElement("script"), timer = setTimeout(() => reject(new Error("OCR本体の取得がタイムアウト")), 20000); s.src = url; s.crossOrigin = "anonymous"; s.onload = () => { clearTimeout(timer); resolve(); }; s.onerror = () => reject(new Error(url + "を読み込めません")); document.head.appendChild(s); }); }
  async function loadTesseract() { if (root.Tesseract) return root.Tesseract; for (const url of TESSERACT_URLS) try { await loadScript(url); if (root.Tesseract) return root.Tesseract; } catch (_) {} throw new Error("OCR本体を取得できません"); }
  const timeout = (p, ms, message) => Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
  function failure(stage, error) { console.error("Nutrition OCR failed", stage, error); return { product: parseNutritionText(""), text: "", error: error.message || String(error), errorStage: stage }; }
  async function recognize(src, onProgress, options = {}) {
    let prepared; try { onProgress?.({ status: "preparing image", progress: 0 }); prepared = await preprocessImage(src, options.crop); options.onPreview?.(prepared.preview, prepared.diagnostics, prepared.crop); } catch (e) { return failure("image-decode", e); }
    let Tesseract; try { Tesseract = await loadTesseract(); } catch (e) { return failure("engine-load", e); } const errors = [];
    for (let attempt = 0; attempt < 2; attempt += 1) { let worker; try { onProgress?.({ status: attempt ? "retrying with lightweight model" : "loading OCR worker", progress: 0 }); worker = await timeout(Tesseract.createWorker(attempt ? "eng" : ["jpn", "eng"], 1, { ...CDN_OPTIONS[attempt], workerBlobURL: true, logger: onProgress, errorHandler: (e) => console.error(e) }), 60000, "OCRワーカー初期化タイムアウト"); const texts = [], products = [];
      for (let pass = 0; pass < prepared.variants.length; pass += 1) { await worker.setParameters({ tessedit_pageseg_mode: pass ? "11" : "6", preserve_interword_spaces: "1", user_defined_dpi: "300" }); onProgress?.({ status: pass ? "recognizing grayscale fallback" : "recognizing enhanced label", progress: pass * .5 }); const result = await timeout(worker.recognize(prepared.variants[pass], { rotateAuto: true }), 90000, "文字認識タイムアウト"); const text = result?.data?.text || ""; texts.push(text); products.push(parseNutritionText(text)); if (products[0].confidence >= 90) break; }
      const product = mergeProducts(products); product.rawText = texts.join("\n--- OCR PASS ---\n"); return { product, text: product.rawText, error: null, fallbackUsed: attempt > 0, diagnostics: prepared.diagnostics, crop: prepared.crop };
    } catch (e) { errors.push(e.message); } finally { if (worker) await worker.terminate().catch(() => {}); } }
    return { ...failure("worker-init", new Error(errors.join(" / "))), diagnostics: prepared.diagnostics, crop: prepared.crop };
  }
  const api = { TESSERACT_URLS, normalizeText, compact, parseNutritionText, numericFallback, mergeProducts, fitDimensions, adaptiveThreshold, removeRules, edgeCropBounds, preprocessImage, recognize };
  if (typeof module !== "undefined" && module.exports) module.exports = api; root.CalorieNutritionOcr = api;
})(typeof window !== "undefined" ? window : globalThis);
