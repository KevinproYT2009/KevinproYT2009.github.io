// 1. Gestion du Thème
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

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

// 2. Gestion de la fenêtre de jeu (Modale)
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
    // 1. Calculer une variation aléatoire (entre -3 et +3 joueurs)
    const variation = Math.floor(Math.random() * 7) - 3;
    nbActuel += variation;

    // 2. Sécurité pour ne pas descendre en dessous de 5 ou trop monter
    if (nbActuel < 5) nbActuel = 5;
    if (nbActuel > 40) nbActuel = 35;

    // 3. Mettre à jour l'affichage
    liveElement.textContent = nbActuel;

    // 4. Définir le prochain délai aléatoire (entre 3 et 10 secondes)
    const prochainDelai = (Math.floor(Math.random() * 8) + 3) * 1000;

    // 5. Relancer la fonction après ce délai (récursivité avec setTimeout)
    setTimeout(actualiserJoueurs, prochainDelai);
}

// Lancement au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    genererCalcul();
    actualiserJoueurs(); // Démarre la boucle infinie
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