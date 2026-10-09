const ORDRE_PANNEAUX = ['apercu', 'entrees', 'analyse', 'historique'];

function basculerPanneau(nom){
  const ancien = document.querySelector('.panel.actif');
  // Le contenu glisse depuis la droite si on avance dans la barre, depuis la gauche si on recule.
  const sens = ancien ? Math.sign(ORDRE_PANNEAUX.indexOf(nom) - ORDRE_PANNEAUX.indexOf(ancien.dataset.panel)) : 1;
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.classList.toggle('actif', b.dataset.panel===nom);
  });
  document.querySelectorAll('.panel').forEach(p=>{
    if(p.dataset.panel===nom){
      p.style.setProperty('--dx', ((sens || 1) * 26) + 'px');
      p.classList.remove('actif');
      void p.offsetWidth; // relance l'animation d'entrée à chaque bascule
      p.classList.add('actif');
    } else {
      p.classList.remove('actif');
    }
  });
}
document.getElementById('nav').addEventListener('click', e=>{
  const btn = e.target.closest('.nav-btn');
  if(btn) basculerPanneau(btn.dataset.panel);
});

async function init(){
  await chargerTout();
  await verifierChangementMois();
  await appliquerRecurrentes();
  rendre();
  majInfoSauvegarde();
}
init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

// Demande au navigateur de ne pas effacer les données automatiquement (sans effet visible si refusé).
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
