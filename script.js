// ==========================================
// 1. IMPORTS FIREBASE (Firestore uniquement)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const bannedIpsRef = collection(db, "banned_ips");
const mutedIpsRef = collection(db, "muted_ips");

// Récupération de l'IP de l'utilisateur
let userIp = "";
fetch("https://api.ipify.org?format=json")
  .then(res => res.json())
  .then(data => { userIp = data.ip; })
  .catch(() => { userIp = "IP_Inconnue"; });

// Listes locales de modération
let listBanned = [];
let listMuted = [];

onSnapshot(bannedIpsRef, (snapshot) => {
  listBanned = snapshot.docs.map(d => d.data().ip);
});

onSnapshot(mutedIpsRef, (snapshot) => {
  listMuted = snapshot.docs.map(d => d.data().ip);
});


// ==========================================
// 2. CODE SITE & JEUX (Intact)
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

// Plein écran
fsBtn.addEventListener('click', () => {
    const iframe = gameContainer.querySelector('iframe');
    if (iframe && iframe.requestFullscreen) {
        iframe.requestFullscreen();
    }
});

// Support
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

// Simulateur Joueurs
const liveElement = document.getElementById('nb-live');
let nbActuel = 15;

function actualiserJoueurs() {
    const variation = Math.floor(Math.random() * 7) - 3;
    nbActuel += variation;

    if (nbActuel < 5) nbActuel = 5;
    if (nbActuel > 40) nbActuel = 35;

    liveElement.textContent = nbActuel;
    const prochainDelai = (Math.floor(Math.random() * 8) + 3) * 1000;
    setTimeout(actualiserJoueurs, prochainDelai);
}

window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    genererCalcul();
    actualiserJoueurs();
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
// 3. LOGIQUE DU CHAT (Modération & Admin)
// ==========================================
const btnSend = document.getElementById("chat-send");
const container = document.getElementById("messages-container");
const pseudoInput = document.getElementById("chat-pseudo");
const adminPwdInput = document.getElementById("chat-admin-pwd");

let estAdminConnecte = false;

// Affiche le champ mot de passe si on tape "kevin"
if (pseudoInput && adminPwdInput) {
  pseudoInput.addEventListener("input", () => {
    if (pseudoInput.value.trim().toLowerCase() === "kevin") {
      adminPwdInput.style.display = "block";
    } else {
      adminPwdInput.style.display = "none";
      adminPwdInput.value = "";
    }
  });
}

if (btnSend && container) {
  btnSend.addEventListener("click", async () => {
    // Vérification Ban / Mute
    if (listBanned.includes(userIp)) {
      alert("Accès refusé : Ton adresse IP est bannie du chat !");
      return;
    }
    if (listMuted.includes(userIp)) {
      alert("Action impossible : Tu es actuellement rendu muet par un administrateur.");
      return;
    }

    let pseudoSaisi = pseudoInput ? pseudoInput.value.trim() : "Anonyme";
    if (pseudoSaisi === "") pseudoSaisi = "Anonyme";
    
    const texteInput = document.getElementById("chat-message");
    const fileInput = document.getElementById("chat-file");
    
    const texte = texteInput.value.trim();
    const file = fileInput ? fileInput.files[0] : null;

    let pseudoFinal = pseudoSaisi;

    // Connexion Admin
    if (pseudoSaisi.toLowerCase() === "kevin" && !estAdminConnecte) {
      const mdp = adminPwdInput ? adminPwdInput.value : "";
      if (mdp === "Kevin#20091202") {
        estAdminConnecte = true;
        alert("Connecté en tant qu'Administrateur !");
      } else {
        alert("Mot de passe Admin incorrect !");
        return;
      }
    }

    // Badge Rouge Admin avec le vrai pseudo
    if (estAdminConnecte && pseudoSaisi.toLowerCase() === "kevin") {
      pseudoFinal = `<span style="color: #ff3333; font-weight: bold; text-shadow: 0 0 5px rgba(255,0,0,0.4);">🛡️ ADMIN (${pseudoSaisi})</span>`;
    } else {
      pseudoFinal = `<strong style="color: var(--accent-color);">${pseudoSaisi}</strong>`;
    }

    // Fonction d'envoi vers Firestore
    const envoyerMessage = async (contenuMessage) => {
      await addDoc(messagesRef, {
        pseudoHTML: pseudoFinal,
        texte: contenuMessage,
        ip: userIp,
        timestamp: serverTimestamp()
      });
    };

    if (file) {
      if (file.size > 800000) {
        alert("Fichier trop lourd (max 800 Ko).");
        return;
      }
      const reader = new FileReader();
      reader.onload = async function(e) {
        texteInput.value = "";
        if (fileInput) fileInput.value = "";
        await envoyerMessage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else if (texte !== "") {
      texteInput.value = ""; 
      await envoyerMessage(texte);
    }
  });

  document.getElementById("chat-message").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btnSend.click();
    }
  });

  // Affichage en direct des messages
  const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
  onSnapshot(q, (snapshot) => {
    container.innerHTML = ""; 
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.style.wordBreak = "break-word";
      div.style.display = "flex";
      div.style.justifyContent = "space-between";
      div.style.alignItems = "center";
      
      let contenu = msg.texte;
      let lowerContenu = typeof contenu === 'string' ? contenu.toLowerCase() : "";

      if (contenu.startsWith('data:audio') || lowerContenu.endsWith('.mp3')) {
          contenu = `<br><audio controls src="${contenu}" style="max-width: 100%; margin-top: 5px; height: 30px;"></audio>`;
      } 
      else if (contenu.startsWith('data:video') || lowerContenu.endsWith('.mp4')) {
          contenu = `<br><video controls src="${contenu}" style="max-width: 100%; border-radius: 5px; margin-top: 5px; max-height: 200px;"></video>`;
      }
      else if (contenu.startsWith('data:image') || lowerContenu.endsWith('.png') || lowerContenu.endsWith('.jpg') || lowerContenu.endsWith('.jpeg') || lowerContenu.endsWith('.gif')) {
          contenu = `<br><img src="${contenu}" alt="Image partagée" style="max-width: 100%; max-height: 200px; border-radius: 5px; margin-top: 5px;">`;
      }

      const contentSpan = document.createElement("span");
      const identifiant = msg.pseudoHTML || `<strong style="color: var(--accent-color);">${msg.pseudo || 'Anonyme'}</strong>`;
      contentSpan.innerHTML = `${identifiant} : ${contenu}`;
      div.appendChild(contentSpan);

      // Panneau de contrôle Modération (visible uniquement pour l'admin)
      if (estAdminConnecte) {
        const adminTools = document.createElement("div");
        adminTools.style.display = "flex";
        adminTools.style.gap = "5px";

        // Mute IP
        const muteBtn = document.createElement("button");
        muteBtn.textContent = "🔇";
        muteBtn.title = "Muter cette IP";
        muteBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:0.9rem;";
        muteBtn.onclick = async () => {
          if (msg.ip && confirm(`Muter l'IP ${msg.ip} ?`)) {
            await addDoc(mutedIpsRef, { ip: msg.ip });
            alert("IP mutée !");
          }
        };

        // Ban IP
        const banBtn = document.createElement("button");
        banBtn.textContent = "🔨";
        banBtn.title = "Bannir cette IP";
        banBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:0.9rem;";
        banBtn.onclick = async () => {
          if (msg.ip && confirm(`Bannir l'IP ${msg.ip} ?`)) {
            await addDoc(bannedIpsRef, { ip: msg.ip });
            alert("IP bannie !");
          }
        };

        // Supprimer message
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = "Supprimer le message";
        deleteBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:0.9rem;";
        deleteBtn.onclick = async () => {
          if (confirm("Supprimer ce message ?")) {
            await deleteDoc(doc(db, "messages", docSnap.id));
          }
        };

        adminTools.appendChild(muteBtn);
        adminTools.appendChild(banBtn);
        adminTools.appendChild(deleteBtn);
        div.appendChild(adminTools);
      }

      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  });
}