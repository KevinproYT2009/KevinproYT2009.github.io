// ==========================================
// 1. IMPORTS FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const presenceRef = collection(db, "site_presence");

// ==========================================
// 2. DETECTION IP & ANTI-VPN
// ==========================================
let userIp = "IP_Inconnue";
let isVPN = false;
let ipVerifiee = false;

const vpnKeywords = [
    "vpn", "proxy", "hosting", "cloud", "datacenter", "digitalocean", "ovh",
    "mullvad", "nord", "expressvpn", "proton", "vultr", "linode", "aws", 
    "amazon", "hetzner", "cyberghost", "surfshark", "ipvanish", "tunnelbear",
    "private internet", "pia", "choopa", "leaseweb", "colocrossing", "oracle",
    "alibaba", "tencent", "google", "dedicenter", "quadranet", "tzulo"
];

async function verifierConnexion() {
    if (ipVerifiee) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
        const res = await fetch("https://ipwho.is/", { signal: controller.signal });
        const data = await res.json();
        clearTimeout(timeoutId);
        
        if (data && data.success) {
            userIp = data.ip || "IP_Inconnue";
            
            if (data.security && (data.security.vpn || data.security.proxy || data.security.tor || data.security.hosting)) {
                isVPN = true;
            }
            
            const connectionStr = JSON.stringify(data.connection || {}).toLowerCase();
            if (vpnKeywords.some(kw => connectionStr.includes(kw))) {
                isVPN = true;
            }
        }
    } catch (e) {
        try {
            const res2 = await fetch("https://ipapi.co/json/");
            const data2 = await res2.json();
            if (data2 && data2.ip) userIp = data2.ip;
            const org2 = (data2.org || data2.asn || "").toLowerCase();
            if (vpnKeywords.some(kw => org2.includes(kw))) {
                isVPN = true;
            }
        } catch (err) {}
    } finally {
        ipVerifiee = true;
    }
}

verifierConnexion();

let listBanned = [];
let listMuted = [];
let dernieresDonneesMessages = [];

// ==========================================
// 3. CODE SITE, JEUX, CAPTCHA & COMPTEUR RÉEL
// ==========================================
const toggleBtn = document.getElementById('toggleBtn');
function applyTheme() {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark-mode');
    }
}
applyTheme();

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.documentElement.classList.toggle('dark-mode');
        const estSombre = document.body.classList.contains('dark-mode');
        localStorage.setItem("theme", estSombre ? "dark" : "light");
    });
}

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

fsBtn.addEventListener('click', () => {
    const iframe = gameContainer.querySelector('iframe');
    if (iframe && iframe.requestFullscreen) {
        iframe.requestFullscreen();
    }
});

const contactForm = document.getElementById('contact-form');
const confirmation = document.getElementById('confirmation');
const questionLabel = document.getElementById('question-label');
const captchaReponse = document.getElementById('captcha-reponse');
let solutionAttendue;

function genererCalcul() {
    const num1 = Math.floor(Math.random() * 10) + 1; 
    const num2 = Math.floor(Math.random() * 10) + 1;
    solutionAttendue = num1 + num2;
    if (questionLabel) {
        questionLabel.textContent = `Combien font ${num1} + ${num2} ?`;
    }
}

// Compteur de joueurs réel via Firestore
const liveElement = document.getElementById('nb-live');
const sessionId = "user_" + Math.random().toString(36).substring(2, 9);

async function battementDeCoeur() {
    try {
        await setDoc(doc(presenceRef, sessionId), {
            dernierSignal: Date.now()
        });
    } catch (e) {
        console.error("Erreur de présence :", e);
    }
}

battementDeCoeur();
setInterval(battementDeCoeur, 15000);

window.addEventListener("beforeunload", () => {
    deleteDoc(doc(presenceRef, sessionId)).catch(() => {});
});

onSnapshot(presenceRef, (snapshot) => {
    const maintenant = Date.now();
    let actifsCount = 0;
    
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.dernierSignal && (maintenant - data.dernierSignal < 35000)) {
            actifsCount++;
        }
    });

    if (actifsCount < 1) actifsCount = 1;

    if (liveElement) {
        liveElement.textContent = actifsCount;
    }
});

window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    genererCalcul();
});

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        if (parseInt(captchaReponse.value) !== solutionAttendue) {
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
}

// ==========================================
// 4. CHAT ET PANNEAU ADMIN (EN DIRECT)
// ==========================================
const btnSend = document.getElementById("chat-send");
const container = document.getElementById("messages-container");
const pseudoInput = document.getElementById("chat-pseudo");
const adminPwdInput = document.getElementById("chat-admin-pwd");
let estAdminConnecte = false;

const adminPanel = document.createElement("div");
adminPanel.style.display = "none";
adminPanel.style.background = "#2b0000";
adminPanel.style.color = "white";
adminPanel.style.border = "1px solid #ff3333";
adminPanel.style.padding = "15px";
adminPanel.style.marginBottom = "15px";
adminPanel.style.borderRadius = "8px";
adminPanel.style.maxHeight = "250px";
adminPanel.style.overflowY = "auto";
adminPanel.style.textAlign = "left";

if (container) {
    container.parentNode.insertBefore(adminPanel, container);
}

window.unbanUser = async (docId) => {
    try {
        await deleteDoc(doc(db, "banned_ips", docId));
    } catch (e) {
        console.error("Erreur lors du débannissement :", e);
    }
};

window.unmuteUser = async (docId) => {
    try {
        await deleteDoc(doc(db, "muted_ips", docId));
    } catch (e) {
        console.error("Erreur lors du démutage :", e);
    }
};

function renderAdminPanel() {
    if (!estAdminConnecte) {
        adminPanel.style.display = "none";
        return;
    }
    adminPanel.style.display = "block";
    let html = '<h3 style="color:#ff3333; margin-top:0; font-size:1.1rem; border-bottom: 1px solid #ff3333; padding-bottom:5px;">🛠️ Panneau de Modération (Temps réel)</h3>';
    
    const mutesActifs = listMuted.filter(m => !m.finMute || Date.now() < m.finMute);

    if (listBanned.length === 0 && mutesActifs.length === 0) {
        html += "<p style='color:gray; font-size:0.9rem;'>Aucune sanction active.</p>";
    }

    listBanned.forEach(b => {
        html += `<div style="margin-bottom: 8px; font-size: 0.85rem; display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
            <div>
                🔨 <strong>${b.pseudoBrut || 'Anonyme'}</strong> <span style="color:#aaa;">(${b.ip})</span><br>
                <i style="color:#ddd;">"${b.motif}"</i>
            </div>
            <button onclick="window.unbanUser('${b.id}')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Débannir</button>
        </div>`;
    });

    mutesActifs.forEach(m => {
        const tempsRestantSec = Math.max(0, Math.ceil((m.finMute - Date.now()) / 1000));
        const minsRestantes = Math.ceil(tempsRestantSec / 60);
        
        html += `<div style="margin-bottom: 8px; font-size: 0.85rem; display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
            <div>
                🔇 <strong>${m.pseudoBrut || 'Anonyme'}</strong> <span style="color:#aaa;">(${m.ip})</span><br>
                <i style="color:#ddd;">"${m.motif}"</i> — <span style="color:#ff9800;">Reste ~${minsRestantes} min (${tempsRestantSec}s)</span>
            </div>
            <button onclick="window.unmuteUser('${m.id}')" style="background:#ff9800; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Démuter</button>
        </div>`;
    });

    adminPanel.innerHTML = html;
}

setInterval(() => {
    if (estAdminConnecte) {
        renderAdminPanel();
    }
}, 3000);

function afficherMessagesHTML(snapshotDocs) {
    if (!container) return;
    container.innerHTML = "";
    
    snapshotDocs.forEach((docSnap) => {
      try {
        const msg = docSnap.data();
        const div = document.createElement("div");
        div.style.marginBottom = "10px";
        div.style.wordBreak = "break-word";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        
        let contenu = String(msg.texte || "");
        let lowerContenu = contenu.toLowerCase();

        if (contenu.startsWith('data:audio') || lowerContenu.endsWith('.mp3')) {
            contenu = `<br><audio controls src="${contenu}" style="max-width: 100%; margin-top: 5px; height: 30px;"></audio>`;
        } 
        else if (contenu.startsWith('data:video') || lowerContenu.endsWith('.mp4')) {
            contenu = `<br><video controls src="${contenu}" style="max-width: 100%; border-radius: 5px; margin-top: 5px; max-height: 200px;"></video>`;
        }
        else if (contenu.startsWith('data:image') || lowerContenu.endsWith('.png') || lowerContenu.endsWith('.jpg') || lowerContenu.endsWith('.jpeg') || lowerContenu.endsWith('.gif')) {
            contenu = `<br><img src="${contenu}" alt="Image partagée" style="max-width: 100%; max-height: 200px; border-radius: 5px; margin-top: 5px;">`;
        }

        let cleanPseudo = msg.pseudoBrut;
        if (!cleanPseudo && msg.pseudoHTML) {
          cleanPseudo = String(msg.pseudoHTML).replace(/<[^>]*>?/gm, '').replace('🛡️ ADMIN (', '').replace(')', '');
        }
        if (!cleanPseudo) cleanPseudo = msg.pseudo || "Anonyme";

        const contentSpan = document.createElement("span");
        const identifiant = msg.pseudoHTML || `<strong style="color: var(--accent-color);">${cleanPseudo}</strong>`;
        contentSpan.innerHTML = `${identifiant} : ${contenu}`;
        div.appendChild(contentSpan);

        if (estAdminConnecte) {
          const adminTools = document.createElement("div");
          adminTools.style.display = "flex";
          adminTools.style.gap = "5px";

          let sanctionMotif = !contenu.startsWith('data:') ? contenu : '[Fichier Multimédia]';

          const muteBtn = document.createElement("button");
          muteBtn.textContent = "🔇";
          muteBtn.title = "Muter cet utilisateur";
          muteBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:0.9rem;";
          muteBtn.onclick = async () => {
            if (msg.ip) {
              const dureeStr = prompt(`Pendant combien de minutes veux-tu muter ${cleanPseudo} ?`, "5");
              const minutes = parseInt(dureeStr);
              if (!isNaN(minutes) && minutes > 0) {
                const finMute = Date.now() + (minutes * 60 * 1000);
                await addDoc(mutedIpsRef, {
                  ip: msg.ip,
                  pseudoBrut: cleanPseudo,
                  motif: sanctionMotif,
                  finMute: finMute
                });
              }
            }
          };

          const banBtn = document.createElement("button");
          banBtn.textContent = "🔨";
          banBtn.title = "Bannir cette IP";
          banBtn.style.cssText = "background:none; border:none; cursor:pointer; font-size:0.9rem;";
          banBtn.onclick = async () => {
            if (msg.ip && confirm(`Bannir définitivement ${cleanPseudo} ?`)) {
              await addDoc(bannedIpsRef, { ip: msg.ip, pseudoBrut: cleanPseudo, motif: sanctionMotif });
            }
          };

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
      } catch (err) {
        console.error("Erreur d'affichage d'un message :", err);
      }
    });
    container.scrollTop = container.scrollHeight;
}

onSnapshot(bannedIpsRef, (snapshot) => {
  listBanned = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAdminPanel();
});
onSnapshot(mutedIpsRef, (snapshot) => {
  listMuted = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderAdminPanel();
});

if (pseudoInput && adminPwdInput) {
  pseudoInput.addEventListener("input", () => {
    if (pseudoInput.value.trim().toLowerCase() === "kevin" && !estAdminConnecte) {
      adminPwdInput.style.display = "block";
    } else {
      adminPwdInput.style.display = "none";
    }
  });
}

if (btnSend && container) {
  btnSend.addEventListener("click", async () => {
    let pseudoSaisi = pseudoInput ? pseudoInput.value.trim() : "Anonyme";
    if (pseudoSaisi === "") pseudoSaisi = "Anonyme";
    
    if (pseudoSaisi.toLowerCase() === "kevin" && !estAdminConnecte) {
      const mdp = adminPwdInput ? adminPwdInput.value : "";
      if (mdp === "Kevin#20091202") {
        estAdminConnecte = true;
        adminPwdInput.style.display = "none";
        alert("🛡️ Connecté en tant qu'Administrateur !");
        renderAdminPanel();
        afficherMessagesHTML(dernieresDonneesMessages);
      } else {
        alert("Mot de passe Admin incorrect !");
        return;
      }
    }

    if (!estAdminConnecte) {
      if (!ipVerifiee) {
        await verifierConnexion();
      }

      if (isVPN) {
        alert("Accès refusé : L'utilisation d'un VPN ou Proxy est interdite.");
        return;
      }
      if (listBanned.some(b => b.ip === userIp)) {
        alert("Accès refusé : Ton adresse IP est bannie du chat !");
        return;
      }

      const muteActif = listMuted.find(m => m.ip === userIp && (!m.finMute || Date.now() < m.finMute));
      if (muteActif) {
        const minsRestantes = Math.ceil((muteActif.finMute - Date.now()) / 60000);
        alert(`Action impossible : Tu es muet pour encore ${minsRestantes} minute(s).`);
        return;
      }
    }

    const texteInput = document.getElementById("chat-message");
    const fileInput = document.getElementById("chat-file");
    const texte = texteInput.value.trim();
    const file = fileInput ? fileInput.files[0] : null;

    let pseudoFinal = pseudoSaisi;
    if (estAdminConnecte && pseudoSaisi.toLowerCase() === "kevin") {
      pseudoFinal = `<span style="color: #ff3333; font-weight: bold; text-shadow: 0 0 5px rgba(255,0,0,0.4);">🛡️ ADMIN (${pseudoSaisi})</span>`;
    } else {
      pseudoFinal = `<strong style="color: var(--accent-color);">${pseudoSaisi}</strong>`;
    }

    const envoyerMessage = async (contenuMessage) => {
      await addDoc(messagesRef, {
        pseudoHTML: pseudoFinal,
        pseudoBrut: pseudoSaisi,
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

  const chatMsgInput = document.getElementById("chat-message");
  if (chatMsgInput) {
      chatMsgInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          btnSend.click();
        }
      });
  }

  const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));
  onSnapshot(q, (snapshot) => {
    dernieresDonneesMessages = snapshot.docs;
    afficherMessagesHTML(dernieresDonneesMessages);
  }, (error) => {
    console.error("Erreur Firestore :", error);
  });
}