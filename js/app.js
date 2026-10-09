function basculerPanneau(nom){
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.classList.toggle('actif', b.dataset.panel===nom);
  });
  document.querySelectorAll('.panel').forEach(p=>{
    if(p.dataset.panel===nom){
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
  // Quand une nouvelle version prend la main, on recharge la page une fois : on n'affiche jamais un mélange
  // d'anciens et de nouveaux fichiers. (Pas au tout premier chargement : il n'y avait pas encore de service worker.)
  if (navigator.serviceWorker.controller) {
    let recharge = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recharge) return;
      recharge = true;
      location.reload();
    });
  }
}

// Demande au navigateur de ne pas effacer les données automatiquement (sans effet visible si refusé).
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
