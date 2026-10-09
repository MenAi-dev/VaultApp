function animerValeur(el, debut, fin, versTexte){
  const duree = 550;
  const t0 = performance.now();
  function step(now){
    const t = Math.min(1, (now - t0) / duree);
    const ease = 1 - Math.pow(1 - t, 3);
    const v = debut + (fin - debut) * ease;
    el.innerHTML = versTexte(v);
    if(t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function declencherPulse(el){
  if(!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
}

const nouvelId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const normaliser = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// À utiliser pour toute valeur textuelle (nom, note, id, couleur) insérée dans un gabarit innerHTML,
// y compris dans un attribut : le texte saisi doit rester du texte, jamais du code.
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let toastTimer = null;
// action (facultatif) : { label, fn } -> bouton dans le message (ex. « Annuler »).
function toast(message, type, action){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = message;
  el.className = 'toast actif' + (type ? ' ' + type : '');
  if(action){
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', ()=>{ el.classList.remove('actif'); clearTimeout(toastTimer); action.fn(); });
    el.appendChild(b);
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('actif'), action ? 7000 : 4500);
}

// Message « supprimé » avec possibilité d'annuler (un seul niveau).
function annulable(message, restaurer){
  toast(message, '', { label:'Annuler', fn: async ()=>{
    await restaurer();
    await sauvegarderTout();
    rendre();
    toast('Suppression annulée');
  }});
}
