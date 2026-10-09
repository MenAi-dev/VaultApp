// Animations qui donnent de la vie à l'application. Toutes respectent « réduire les animations » d'Android.
// Les styles correspondants sont dans css/oneui.css (section « Animations »).

const mouvementReduit = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// ---------- Ondulation au toucher (comme les boutons Material / One UI) ----------
const CIBLES_ONDULATION = '.ajout-btn, .cat-btn, .btn-valider, .btn-annuler, .ajout-entree-btn, .lien-global, .btn-sauvegarde, '
  + '.btn-danger, .nav-btn, .modif-btn, .suppr-btn, .theme-btn, .seg-btn, .verrou-btn, .nav-mois button';

document.addEventListener('pointerdown', e=>{
  if(mouvementReduit()) return;
  const bouton = e.target.closest && e.target.closest(CIBLES_ONDULATION);
  if(!bouton || bouton.disabled) return;
  const r = bouton.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2;
  const onde = document.createElement('span');
  onde.className = 'onde';
  onde.style.width = onde.style.height = d + 'px';
  onde.style.left = (e.clientX - r.left - d / 2) + 'px';
  onde.style.top = (e.clientY - r.top - d / 2) + 'px';
  bouton.appendChild(onde);
  onde.addEventListener('animationend', ()=>onde.remove());
  setTimeout(()=>onde.remove(), 900); // sécurité : si l'animation ne se termine pas (affichage suspendu), l'élément ne reste pas
}, { passive:true });

// ---------- Confettis : petite explosion de couleur pour fêter un bon geste ----------
function confettis(origine, couleurs){
  if(mouvementReduit() || !origine) return;
  const r = origine.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const n = 20;
  const boite = document.createElement('div');
  boite.className = 'confettis';
  for(let i = 0; i < n; i++){
    const p = document.createElement('i');
    const angle = (Math.PI * 2 * i / n) + Math.random() * 0.5;
    const dist = 55 + Math.random() * 85;
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.setProperty('--dx', Math.round(Math.cos(angle) * dist) + 'px');
    p.style.setProperty('--dy', Math.round(Math.sin(angle) * dist - 20) + 'px');
    p.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
    p.style.background = couleurs[i % couleurs.length];
    p.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
    boite.appendChild(p);
  }
  document.body.appendChild(boite);
  setTimeout(()=>boite.remove(), 1300);
}
const couleurTheme = nom => getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || '#5B9BFF';

// ---------- Secousse : un champ ou une fenêtre refuse une saisie ----------
function secouer(el){
  if(!el || mouvementReduit()) return;
  el.classList.remove('secoue');
  void el.offsetWidth; // relance l'animation
  el.classList.add('secoue');
  setTimeout(()=>el.classList.remove('secoue'), 600);
}
const secouerModale = () => secouer(document.querySelector('.overlay.actif .modal'));

// ---------- La carte résumé « réagit » quand l'état du mois change ----------
function animerEtat(carte){
  if(!carte || mouvementReduit()) return;
  carte.classList.remove('etat-change');
  void carte.offsetWidth;
  carte.classList.add('etat-change');
  // Retrait temporisé (et non « animationend » : les animations des éléments enfants le déclencheraient trop tôt).
  setTimeout(()=>carte.classList.remove('etat-change'), 1100);
}
