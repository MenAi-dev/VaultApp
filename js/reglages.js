// Réglages : préférences personnelles (thème, couleur principale, taille du texte, prénom, seuil d'alerte, vibrations).
// Elles sont mémorisées sur l'appareil (clé « budgetPrefs ») et incluses dans les sauvegardes.
// Au démarrage, js/verrou-precoce.js (chargé dans <head>) pose déjà le thème avant l'affichage : aucun éclair.

const CLE_PREFS = 'budgetPrefs';
const THEMES = ['auto', 'clair', 'sombre'];
const ACCENTS = ['bleu', 'turquoise', 'rose', 'indigo'];
const TEXTES = ['normal', 'grand'];
const SEUILS = [70, 80, 90];
const COULEUR_BARRE = { clair:'#F2F3F7', sombre:'#000000' }; // barre d'état du téléphone

// Accepte n'importe quoi (fichier de sauvegarde, stockage modifié…) et renvoie des réglages toujours valides.
function nettoyerPrefs(p){
  const o = (p && typeof p === 'object') ? p : {};
  return {
    theme: THEMES.includes(o.theme) ? o.theme : 'auto',
    accent: ACCENTS.includes(o.accent) ? o.accent : 'bleu',
    texte: TEXTES.includes(o.texte) ? o.texte : 'normal',
    prenom: typeof o.prenom === 'string' ? o.prenom.trim().slice(0, 30) : '',
    seuil: SEUILS.includes(o.seuil) ? o.seuil : 80,
    vibrations: o.vibrations !== false
  };
}

let prefs = (()=>{
  try{ return nettoyerPrefs(JSON.parse(localStorage.getItem(CLE_PREFS))); }
  catch(e){ return nettoyerPrefs(null); }
})();

function sauverPrefs(){
  try{ localStorage.setItem(CLE_PREFS, JSON.stringify(prefs)); }
  catch(e){ toast("Impossible d'enregistrer les réglages (stockage plein ou bloqué).", 'danger'); }
}

// « Auto » = le thème du téléphone ; sinon le choix de la personne.
function themeEffectif(){
  if(prefs.theme !== 'auto') return prefs.theme;
  return (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'clair' : 'sombre';
}

// Applique les réglages à la page. redessiner : refaire l'affichage des données (utile si le seuil d'alerte change).
function appliquerPrefs(opts){
  const racine = document.documentElement;
  const theme = themeEffectif();
  racine.setAttribute('data-theme', theme === 'clair' ? 'light' : 'dark');
  if(prefs.accent === 'bleu') racine.removeAttribute('data-accent'); else racine.setAttribute('data-accent', prefs.accent);
  if(prefs.texte === 'grand') racine.setAttribute('data-texte', 'grand'); else racine.removeAttribute('data-texte');
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', COULEUR_BARRE[theme]);

  SEUIL_ALERTE = prefs.seuil / 100;
  const sousTitre = document.querySelector('header p');
  if(sousTitre) sousTitre.textContent = prefs.prenom ? 'Bonjour ' + prefs.prenom + ' 👋' : 'Suivi des dépenses par poste, en FCFA.';

  document.querySelectorAll('[data-pref]').forEach(b=>{
    b.setAttribute('aria-pressed', String(String(prefs[b.dataset.pref]) === b.dataset.valeur));
  });
  const champ = document.getElementById('prefPrenom');
  if(champ && document.activeElement !== champ) champ.value = prefs.prenom;
  const vib = document.getElementById('prefVibrations');
  if(vib) vib.checked = prefs.vibrations;
  if(opts && opts.redessiner && typeof rendre === 'function') rendre();
}

// ---------- Branchements ----------

document.querySelectorAll('[data-pref]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const cle = b.dataset.pref;
    prefs = nettoyerPrefs({ ...prefs, [cle]: cle === 'seuil' ? Number(b.dataset.valeur) : b.dataset.valeur });
    sauverPrefs();
    appliquerPrefs({ redessiner: cle === 'seuil' });
  });
});

document.getElementById('prefPrenom').addEventListener('input', e=>{
  prefs = nettoyerPrefs({ ...prefs, prenom: e.target.value });
  sauverPrefs();
  appliquerPrefs();
});

document.getElementById('prefVibrations').addEventListener('change', e=>{
  prefs = nettoyerPrefs({ ...prefs, vibrations: e.target.checked });
  sauverPrefs();
  appliquerPrefs();
  if(prefs.vibrations) vibrer('succes'); // petit essai pour que la personne sente la vibration
});

// En mode « Auto », on suit le téléphone s'il change (passage jour / nuit).
if(window.matchMedia){
  const suivi = matchMedia('(prefers-color-scheme: light)');
  const surChangement = ()=>{ if(prefs.theme === 'auto') appliquerPrefs(); };
  if(suivi.addEventListener) suivi.addEventListener('change', surChangement);
}

document.getElementById('btnResetPrefs').addEventListener('click', ()=>{
  if(!confirm('Remettre tous les réglages (thème, couleur, texte, prénom, alertes) à leur valeur d\'origine ? Tes données ne sont pas touchées.')) return;
  prefs = nettoyerPrefs(null);
  sauverPrefs();
  appliquerPrefs({ redessiner:true });
  toast('Réglages réinitialisés');
});

// Recharge la dernière version de l'application : retire le service worker et son cache (jamais les données).
document.getElementById('btnMajApp').addEventListener('click', async ()=>{
  if(!confirm("Mettre à jour l'application ? Elle va se recharger. Tes données ne sont pas touchées.")) return;
  try{
    if('serviceWorker' in navigator){
      const inscriptions = await navigator.serviceWorker.getRegistrations();
      await Promise.all(inscriptions.map(i=>i.unregister()));
    }
    if(window.caches){
      const noms = await caches.keys();
      await Promise.all(noms.map(n=>caches.delete(n)));
    }
  }catch(e){}
  location.reload();
});

document.getElementById('versionApp').textContent = VERSION_APP;
appliquerPrefs();
