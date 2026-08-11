const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialisation de Firebase Admin pour accéder à Firestore depuis la Cloud Function
initializeApp();
const db = getFirestore();

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

    const uid = request.auth.uid;

    // 1. Récupération automatique de l'historique privé de l'utilisateur
    let formattedHistory = [];
    try {
        const messagesRef = db.collection(`messages_ia_${uid}`);
        const snapshot = await messagesRef.orderBy("timestamp", "desc").limit(12).get();
        
        // Remettre les messages dans l'ordre chronologique
        const docs = snapshot.docs.reverse();

        docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.texte && (data.role === "user" || data.role === "model")) {
                formattedHistory.push({
                    role: data.role,
                    parts: [{ text: data.texte }]
                });
            }
        });

        // Retirer le tout dernier message s'il s'agit du message courant (déjà écrit par le frontend)
        if (formattedHistory.length > 0) {
            const lastMsg = formattedHistory[formattedHistory.length - 1];
            if (lastMsg.role === "user" && lastMsg.parts[0].text === message) {
                formattedHistory.pop();
            }
        }
    } catch (err) {
        console.warn("Erreur lors de la récupération de l'historique :", err.message);
    }

    // 2. Définition du contexte et des connaissances du site
    const systemPrompt = `Tu es l'IA officielle de Gamenter (aussi appelé Gamentercity), une plateforme communautaire et un univers dédié aux jeux vidéo rétro et à l'arcade.

À propos du site Gamenter :
- Créateurs : Développé par Kevin et son ami Lucas.
- Fonctionnalités :
  * Sélection de jeux rétro et arcade jouables directement sur le site.
  * Chat public en temps réel avec modération (anti-VPN, mutes, bans, filtre de mots interdits).
  * Salon privé avec toi (l'IA officielle de Gamenter).
  * Compteur de présence en direct et suivi du temps de session.
- Ton rôle : Tu fais partie intégrante du site. Tu réponds de manière naturelle, humaine, amicale et passionnée par l'univers du retrogaming. Si on te demande qui a créé le site ou l'IA, mentionne fièrement Kevin et son ami Lucas.`;

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

            // Injection de l'historique dans la session de chat
            const chat = model.startChat({
                history: formattedHistory
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            responseText = response.text();
            successfulModel = modelName;
            break; 
        } catch (error) {
            console.warn(`Modèle ${modelName} indisponible, passage au suivant...`, error.message);
        }
    }

    if (!responseText) {
        throw new HttpsError('resource-exhausted', 'Tous les modèles ont atteint leurs limites ou sont indisponibles.');
    }

    return { response: responseText, modelUsed: successfulModel };
});
