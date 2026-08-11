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

    const systemPrompt = "Tu es l'IA officielle de Gamenter (Gamentercity), une plateforme communautaire et un univers dédié aux jeux vidéo rétro. Tu sais exactement où tu te trouves, tu fais partie intégrante du site et tu agis comme un assistant passionné et vivant. Si un utilisateur te demande qui tu es, présente-toi fièrement comme l'intelligence artificielle officielle de Gamenter. Reste toujours branché sur l'ambiance rétro-gaming et réponds de manière naturelle et humaine.";

    const modelsPriority = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemma-4-31b",
        "gemma-4-26b"
    ];

    let responseText = null;
    let successfulModel = null;

    for (const modelName of modelsPriority) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                systemInstruction: systemPrompt 
            });

            const result = await model.generateContent(message);
            const response = await result.response;
            responseText = response.text();
            successfulModel = modelName; // On garde en mémoire quel modèle a fonctionné
            break; 
        } catch (error) {
            console.warn(`Modèle ${modelName} indisponible, passage au suivant...`, error.message);
        }
    }

    if (!responseText) {
        throw new HttpsError('resource-exhausted', 'Tous les modèles ont atteint leurs limites ou sont indisponibles.');
    }

    // On renvoie la réponse ET le nom du modèle utilisé
    return { response: responseText, modelUsed: successfulModel };
});