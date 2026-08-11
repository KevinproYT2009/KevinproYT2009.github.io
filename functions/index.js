const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.chatWithGemini = onCall({ secrets: [geminiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Tu dois être connecté pour utiliser l\'IA.');
    }

    const apiKey = geminiApiKey.value();
    const genAI = new GoogleGenerativeAI(apiKey);
    const message = request.data.prompt;

    if (!message) {
        throw new HttpsError('invalid-argument', 'Le message est vide.');
    }

    // Ordre de priorité : 3.5 Flash -> Flash Lite -> Gemma 4 31B -> Gemma 4 26B
    const modelsPriority = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemma-4-31b",
        "gemma-4-26b"
    ];

    let responseText = null;

    for (const modelName of modelsPriority) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(message);
            const response = await result.response;
            responseText = response.text();
            break; // Dès qu'un modèle répond, on stoppe la boucle
        } catch (error) {
            console.warn(`Modèle ${modelName} indisponible, passage au suivant...`, error.message);
        }
    }

    if (!responseText) {
        throw new HttpsError('resource-exhausted', 'Tous les modèles ont atteint leurs limites ou sont indisponibles.');
    }

    return { response: responseText };
});
