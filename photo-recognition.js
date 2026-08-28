(function (root) {
  async function recognizePhoto({ state, dateKey, core }) {
    return {
      provider: "manual-local",
      confidence: 0,
      candidates: core.suggestions(state, dateKey),
      note: "有料AI APIを使わず、残りkcal/PFCに合う候補を端末内で表示します。",
    };
  }

  root.CaloriePhotoRecognition = { recognizePhoto };
})(typeof window !== "undefined" ? window : globalThis);
