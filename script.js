// ==========================================
// 1. IMPORTS FIREBASE (Doit toujours être en haut)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDX-ezd4VV_RAVaD4g0G0O2E5YBeutR6h8",
  authDomain: "gamenter-chat.firebaseapp.com",
  projectId: "gamenter-chat",
  storageBucket: "gamenter-chat.firebasestorage.app",
  messagingSenderId: "136972170017",
  appId: "1:136972170017:web:3aa57e41907882e1650460"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesRef = collection(db, "messages");


// ==========================================
// 2. TON CODE EXISTANT (Intact)
// ==========================================

// Mode sombre
const toggleBtn = document.getElementById('toggleBtn');

function applyTheme() {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

applyTheme();

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });
}

// JEUX et modal
const gameCards = document.querySelectorAll('.game-card');
const modal = document.getElementById('game-modal');
const modalTitle = document.getElementById('modal-title');
const gameContainer = document.getElementById('game-container');
const closeBtn = document.getElementById('close-button');
const fsBtn = document.getElementById('fullscreen-button');

gameCards.forEach(card => {
    card.addEventListener('click', () => {
        const title = card.getAttribute('data-title');
        const url = card.getAttribute('data-url');
        
        modalTitle.textContent = title;
        gameContainer.innerHTML = `<iframe src="${url}" width="100%" height="650px" allowfullscreen style="border:none; border-radius:10px;"></iframe>`;
        modal.classList.remove('hidden');
    });
});

closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    gameContainer.innerHTML = "";
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        gameContainer.innerHTML = "";
    }
});

// 3. Option Plein écran
fsBtn.addEventListener('click', () => {
    const iframe = gameContainer.querySelector('iframe');
    if (iframe && iframe.requestFullscreen) {
        iframe.requestFullscreen();
    }
});

// 4. Formulaire Support + Calcul Aléatoire
const contactForm = document.getElementById('contact-form');
const confirmation = document.getElementById('confirmation');
const questionLabel = document.getElementById('question-label');
const captchaReponse = document.getElementById('captcha-reponse');

let solutionAttendue;

function genererCalcul() {
    const num1 = Math.floor(Math.random() * 10) + 1; 
    const num2 = Math.floor(Math.random() * 10) + 1;
    solutionAttendue = num1 + num2;
    questionLabel.textContent = `Combien font ${num1} + ${num2} ?`;
}

// 5. Simulateur de joueurs DYNAMIQUE (Spécial NSI)
const liveElement = document.getElementById('nb-live');
let nbActuel = 15; // Nombre de départ

function actualiserJoueurs() {
    const variation = Math.floor(Math.random() * 7) - 3;
    nbActuel += variation;

    if (nbActuel < 5) nbActuel = 5;
    if (nbActuel > 40) nbActuel = 35;

    liveElement.textContent = nbActuel;
    const prochainDelai = (Math.floor(Math.random() * 8) + 3) * 1000;
    setTimeout(actualiserJoueurs, prochainDelai);
}

// lancement au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    genererCalcul();
    actualiserJoueurs(); // demarre la boucle infinie
});

contactForm.addEventListener('submit', function(e) {
    const reponseUtilisateur = parseInt(captchaReponse.value);

    if (reponseUtilisateur !== solutionAttendue) {
        e.preventDefault(); 
        alert("Réponse incorrecte au calcul.");
        genererCalcul();
        captchaReponse.value = "";
        return;
    }

    setTimeout(() => {
        contactForm.classList.add('hidden');
        confirmation.classList.remove('hidden');
    }, 500); 
});


// ==========================================
// 6. NOUVEAU : LOGIQUE DU CHAT GLOBAL
// ==========================================
const btnSend = document.getElementById("chat-send");
const container = document.getElementById("messages-container");

if (btnSend && container) {
  // Envoyer un message
  btnSend.addEventListener("click", async () => {
    const pseudo = document.getElementById("chat-pseudo").value.trim() || "Anonyme";
    const texte = document.getElementById("chat-message").value.trim();
    
    if (texte !== "") {
      document.getElementById("chat-message").value = ""; // On vide la case
      await addDoc(messagesRef, {
        pseudo: pseudo,
        texte: texte,
        timestamp: serverTimestamp()
      });
    }
  });

  // Valider avec la touche Entrée
  document.getElementById("chat-message").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btnSend.click();
    }
  });

  // Lire les messages en temps réel
  const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
  onSnapshot(q, (snapshot) => {
    container.innerHTML = ""; 
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.style.wordBreak = "break-word";
      div.innerHTML = `<strong style="color: var(--accent-color);">${msg.pseudo}</strong> : ${msg.texte}`;
      container.appendChild(div);
    });
    // Scroll automatiquement tout en bas
    container.scrollTop = container.scrollHeight;
  });
}