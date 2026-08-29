(function (root) {
  const TESSERACT_URLS = [
    "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js",
    "https://unpkg.com/tesseract.js@6/dist/tesseract.min.js",
  ];
  const CDN_OPTIONS = [
    {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6",
    },
    {
      workerPath: "https://unpkg.com/tesseract.js@6/dist/worker.min.js",
      corePath: "https://unpkg.com/tesseract.js-core@6",
    },
  ];

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[，、]/g, ",")
      .replace(/[：]/g, ":")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/([ぁ-んァ-ヶ一-龠々])[ \t\u3000]+(?=[ぁ-んァ-ヶ一-龠々])/g, "$1")
      .trim();
  }

  function numberAfter(text, labels, unitPattern) {
    const label = `(?:${labels.join("|")})`;
    const unit = unitPattern || "(?:g|mg|kcal|kj)?";
    const patterns = [
      new RegExp(`${label}[^\\d]{0,12}([0-9]+(?:[.,][0-9]+)?)\\s*(${unit})`, "i"),
      new RegExp(`([0-9]+(?:[.,][0-9]+)?)\\s*(${unit})[^\\n]{0,8}${label}`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return { value: Number(match[1].replace(",", ".")), unit: String(match[2] || "").toLowerCase() };
    }
    return null;
  }

  function parseNutritionText(rawText) {
    const text = normalizeText(rawText);
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const content = text.match(/内容量\s*:?\s*([0-9]+(?:[.,][0-9]+)?\s*(?:kg|g|ml|mL|L|個|本|袋|枚))/i);
    const serving = text.match(/((?:100\s*g|1\s*(?:包装|個|食|本|袋|パック|枚|缶)))(?:当たり|あたり|当り)?/i);
    const energy = numberAfter(text, ["エネルギー", "熱量", "energy"], "kcal|kj");
    const protein = numberAfter(text, ["たんぱく質", "蛋白質", "protein"], "g|mg");
    const fat = numberAfter(text, ["脂質", "fat"], "g|mg");
    const carbs = numberAfter(text, ["炭水化物", "carbohydrates?", "carbs?"], "g|mg");
    const salt = numberAfter(text, ["食塩相当量", "食塩", "salt equivalent"], "g|mg");
    const sodium = numberAfter(text, ["ナトリウム", "sodium"], "g|mg");
    const sugar = numberAfter(text, ["糖質", "sugars?"], "g|mg");
    const fiber = numberAfter(text, ["食物繊維", "dietary fiber", "fiber"], "g|mg");
    const asGrams = (item) => !item ? null : item.value * (item.unit === "mg" ? 0.001 : 1);
    const kcal = energy ? (energy.unit === "kj" ? energy.value / 4.184 : energy.value) : null;
    const saltValue = salt ? asGrams(salt) : sodium ? asGrams(sodium) * 2.54 : null;
    const labelWords = /栄養成分|エネルギー|熱量|たんぱく質|蛋白質|脂質|炭水化物|食塩|protein|fat|carbohydrate|energy/i;
    const productName = lines.find((line) => !labelWords.test(line) && !/^内容量/i.test(line) && /[^0-9 .,:()]/.test(line)) || "";
    const numeric = numericFallback(text);
    const values = {
      kcal: kcal == null ? (numeric.kcal ?? null) : kcal,
      protein: asGrams(protein) == null ? (numeric.protein ?? null) : asGrams(protein),
      fat: asGrams(fat) == null ? (numeric.fat ?? null) : asGrams(fat),
      carbs: asGrams(carbs) == null ? (numeric.carbs ?? null) : asGrams(carbs),
      salt: saltValue == null ? (numeric.salt ?? null) : saltValue,
      sugar: asGrams(sugar) == null ? (numeric.sugar ?? null) : asGrams(sugar),
      fiber: asGrams(fiber) == null ? (numeric.fiber ?? null) : asGrams(fiber),
    };
    const found = [values.kcal, values.protein, values.fat, values.carbs, values.salt].filter((value) => value != null).length;
    return {
      barcode: "",
      productName,
      contentAmount: content ? content[1].replace(/\s/g, "") : "",
      servingUnit: serving ? serving[1].replace(/\s/g, "") : "1包装",
      nutritionPerServing: {
        kcal: values.kcal == null ? null : Math.round(values.kcal * 10) / 10,
        protein: values.protein,
        fat: values.fat,
        carbs: values.carbs,
        salt: values.salt == null ? null : Math.round(values.salt * 1000) / 1000,
        sugar: values.sugar,
        fiber: values.fiber,
      },
      confidence: Math.min(100, found * 18 + (serving ? 6 : 0) + (content ? 4 : 0)),
      rawText: text,
      detected: found >= 2,
    };
  }

  function numericFallback(text) {
    const energy = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*kcal/i);
    const grams = [...text.matchAll(/([0-9]+(?:[.,][0-9]+)?)\s*g\b/gi)]
      .map((match) => Number(match[1].replace(",", ".")));
    if (!energy || grams.length < 4) return {};
    return {
      kcal: Number(energy[1].replace(",", ".")),
      protein: grams[0] ?? null,
      fat: grams[1] ?? null,
      carbs: grams[2] ?? null,
      sugar: grams.length >= 6 ? grams[3] : null,
      fiber: grams.length >= 6 ? grams[4] : null,
      salt: grams.length >= 6 ? grams[5] : grams[3],
    };
  }

  function loadTesseract() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (loadTesseract.promise) return loadTesseract.promise;
    loadTesseract.promise = (async () => {
      const errors = [];
      for (const url of TESSERACT_URLS) {
        try {
          await loadScript(url);
          if (root.Tesseract) return root.Tesseract;
        } catch (error) { errors.push(error.message); }
      }
      loadTesseract.promise = null;
      throw new Error(`OCR本体の取得に失敗: ${errors.join(" / ")}`);
    })();
    return loadTesseract.promise;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => { script.remove(); reject(new Error(`${url} がタイムアウト`)); }, 20000);
      script.src = url;
      script.crossOrigin = "anonymous";
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error(`${url} を読み込めませんでした`)); };
      document.head.appendChild(script);
    });
  }

  function preprocessImage(imageSource) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const maxEdge = 1600;
          const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < pixels.data.length; i += 4) {
            const gray = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114;
            const value = gray > 185 ? 255 : gray < 75 ? 0 : Math.round((gray - 75) * 255 / 110);
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
          }
          context.putImageData(pixels, 0, 0);
          resolve(canvas);
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error("画像を展開できませんでした"));
      image.src = imageSource;
    });
  }

  async function recognize(imageSource, onProgress) {
    let image;
    try {
      if (onProgress) onProgress({ status: "preparing image", progress: 0 });
      image = await preprocessImage(imageSource);
    } catch (error) {
      return failure("image-decode", error);
    }
    let Tesseract;
    try { Tesseract = await loadTesseract(); } catch (error) { return failure("engine-load", error); }
    const errors = [];
    for (let attempt = 0; attempt < CDN_OPTIONS.length; attempt += 1) {
      const languages = attempt === 0 ? ["jpn", "eng"] : "eng";
      let worker;
      try {
        if (onProgress) onProgress({ status: attempt ? "retrying with lightweight model" : "loading OCR worker", progress: 0 });
        worker = await withTimeout(Tesseract.createWorker(languages, 1, {
          ...CDN_OPTIONS[attempt],
          workerBlobURL: true,
          logger: (message) => { if (onProgress) onProgress(message); },
          errorHandler: (error) => { console.error("Nutrition OCR worker", error); },
        }), 60000, "OCRワーカー初期化がタイムアウトしました");
        await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM ? Tesseract.PSM.SINGLE_BLOCK : "6", preserve_interword_spaces: "1" });
        const result = await withTimeout(worker.recognize(image), 90000, "文字認識がタイムアウトしました");
        const text = result && result.data ? result.data.text || "" : "";
        return { product: parseNutritionText(text), text, error: null, fallbackUsed: attempt > 0 };
      } catch (error) {
        errors.push(`${attempt === 0 ? "日本語モデル" : "軽量モデル"}: ${error.message || error}`);
      } finally {
        if (worker) await worker.terminate().catch(() => {});
      }
    }
    return { ...failure("worker-init", new Error(errors.join(" / "))), text: errors.join("\n") };
  }

  function withTimeout(promise, milliseconds, message) {
    return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds))]);
  }

  function failure(stage, error) {
    const message = error && error.message ? error.message : String(error || "OCRに失敗しました");
    console.error("Nutrition OCR failed", stage, error);
    return { product: parseNutritionText(""), text: "", error: message, errorStage: stage };
  }

  const api = { TESSERACT_URLS, normalizeText, parseNutritionText, numericFallback, preprocessImage, recognize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CalorieNutritionOcr = api;
})(typeof window !== "undefined" ? window : globalThis);
