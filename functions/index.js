const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialisation nécessaire pour lire l'historique
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

    // 1. On récupère les 6 derniers messages de manière sécurisée
    let historiqueTexte = "";
    try {
        const messagesRef = db.collection(`messages_ia_${uid}`);
        const snapshot = await messagesRef.orderBy("timestamp", "desc").limit(6).get();
        const docs = snapshot.docs.reverse();

        docs.forEach(docSnap => {
            const data = docSnap.data();
            // On ne rajoute pas le message actuel s'il est déjà en base
            if (data.texte && data.texte !== message) {
                const nomRole = data.role === "user" ? "Utilisateur" : "IA";
                historiqueTexte += `${nomRole} : ${data.texte}\n`;
            }
        });
    } catch (err) {
        console.warn("L'historique n'a pas pu être chargé, on continue sans...", err.message);
    }

    // 2. On intègre tout (Gamenter, Kevin, Lucas et l'historique) dans ton prompt système
    const systemPrompt = `Tu es l'IA officielle de Gamenter (Gamentercity), une plateforme communautaire et un univers dédié aux jeux vidéo rétro. 
À propos de Gamenter :
- Créateurs : Développé par Kevin (l'utilisateur avec qui tu peux interagir) et son ami Lucas.
- Fonctionnalités : Jeux rétro et arcade jouables sur le site, chat public avec modération (anti-VPN, mutes, bans), ce salon IA, et un suivi de session.
Tu sais exactement où tu te trouves, tu fais partie intégrante du site et tu agis comme un assistant passionné et vivant. Si on te demande qui tu es, présente-toi fièrement. Si on te demande qui t'a créé ou qui a fait le site, mentionne Kevin et Lucas.

Voici les derniers échanges avec cet utilisateur pour te donner du contexte et de la mémoire :
${historiqueTexte}
`;

    // 3. Ta liste de modèles qui fonctionne parfaitement
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

            // On utilise ta méthode classique qui ne plante pas !
            const result = await model.generateContent(message);
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
