const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {GoogleGenAI} = require("@google/genai");

exports.chatWithGemini = onCall(
  {cors: true, secrets: ["GEMINI_API_KEY"]},
  async (request) => {
    // L'initialisation se fait ici, quand la clé est bien accessible
    const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

    const userMessage = request.data.prompt;

    if (!userMessage) {
      throw new HttpsError(
        "invalid-argument",
        "Le message ne peut pas être vide."
      );
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userMessage,
      });

      return {response: response.text};
    } catch (error) {
      console.error("Erreur Gemini :", error);
      throw new HttpsError("internal", "Impossible de contacter l'IA.");
    }
  }
);