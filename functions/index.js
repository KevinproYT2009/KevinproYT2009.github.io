const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithGemini = onCall({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
  const prompt = request.data.prompt;

  if (!prompt) {
    throw new HttpsError("invalid-argument", "Le prompt est requis.");
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return { response: response.text() };
  } catch (error) {
    console.error("Erreur Gemini :", error);
    throw new HttpsError("internal", "Erreur lors de la génération de la réponse.");
  }
});