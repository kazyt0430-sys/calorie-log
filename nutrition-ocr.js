(function (root) {
  const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js";

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[，、]/g, ",")
      .replace(/[：]/g, ":")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
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
    const found = [energy, protein, fat, carbs, salt || sodium].filter(Boolean).length;
    return {
      barcode: "",
      productName,
      contentAmount: content ? content[1].replace(/\s/g, "") : "",
      servingUnit: serving ? serving[1].replace(/\s/g, "") : "1包装",
      nutritionPerServing: {
        kcal: kcal == null ? null : Math.round(kcal * 10) / 10,
        protein: asGrams(protein),
        fat: asGrams(fat),
        carbs: asGrams(carbs),
        salt: saltValue == null ? null : Math.round(saltValue * 1000) / 1000,
        sugar: asGrams(sugar),
        fiber: asGrams(fiber),
      },
      confidence: Math.min(100, found * 18 + (serving ? 6 : 0) + (content ? 4 : 0)),
      rawText: text,
      detected: found >= 2,
    };
  }

  function loadTesseract() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (loadTesseract.promise) return loadTesseract.promise;
    loadTesseract.promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_URL;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve(root.Tesseract);
      script.onerror = () => reject(new Error("OCRエンジンを読み込めませんでした"));
      document.head.appendChild(script);
    });
    return loadTesseract.promise;
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
    let worker;
    try {
      const [Tesseract, image] = await Promise.all([loadTesseract(), preprocessImage(imageSource)]);
      worker = await Tesseract.createWorker(["jpn", "eng"], 1, {
        logger: (message) => { if (onProgress) onProgress(message); },
      });
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM ? Tesseract.PSM.SINGLE_BLOCK : "6" });
      const result = await worker.recognize(image);
      return { product: parseNutritionText(result.data.text), text: result.data.text, error: null };
    } catch (error) {
      return { product: parseNutritionText(""), text: "", error: error && error.message ? error.message : "OCRに失敗しました" };
    } finally {
      if (worker) await worker.terminate().catch(() => {});
    }
  }

  const api = { TESSERACT_URL, normalizeText, parseNutritionText, preprocessImage, recognize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CalorieNutritionOcr = api;
})(typeof window !== "undefined" ? window : globalThis);
