// Thème clair / sombre / automatique. Le choix est mémorisé sur l'appareil ; « auto » suit le téléphone.
// L'application du thème au démarrage est faite par verrou-precoce.js (avant l'affichage, sans éclair).

const CLE_THEME = 'budgetTheme';
const MODES_THEME = ['auto', 'clair', 'sombre'];
const NOMS_THEME = { auto:'Automatique (comme ton téléphone)', clair:'Clair', sombre:'Sombre' };
const COULEUR_BARRE = { clair:'#F2F3F7', sombre:'#000000' }; // barre d'état du téléphone

function themeEnregistre(){
  try{ const t = localStorage.getItem(CLE_THEME); return MODES_THEME.includes(t) ? t : 'auto'; }catch(e){ return 'auto'; }
}

// Pose le thème sur la page et la couleur de la barre d'état du téléphone.
function appliquerTheme(mode){
  const racine = document.documentElement;
  if(mode === 'clair') racine.setAttribute('data-theme', 'light');
  else if(mode === 'sombre') racine.setAttribute('data-theme', 'dark');
  else racine.removeAttribute('data-theme');
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{
    const media = m.getAttribute('media') || '';
    const parDefaut = media.includes('light') ? COULEUR_BARRE.clair : COULEUR_BARRE.sombre;
    m.setAttribute('content', mode === 'auto' ? parDefaut : COULEUR_BARRE[mode]);
  });
  const btn = document.getElementById('btnTheme');
  if(btn) btn.dataset.mode = mode;
  document.querySelectorAll('[data-theme-mode]').forEach(b=>{
    b.setAttribute('aria-pressed', String(b.dataset.themeMode === mode));
  });
}

// Changement avec animation : un cercle de la nouvelle couleur s'étend depuis le bouton touché
// (View Transitions) ; sans cette API, simple fondu. Aucune animation si elles sont réduites.
function changerTheme(mode, origine){
  if(!MODES_THEME.includes(mode) || mode === themeEnregistre()) return;
  const appliquer = ()=>{
    try{ localStorage.setItem(CLE_THEME, mode); }catch(e){}
    appliquerTheme(mode);
  };
  const reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduit){ appliquer(); }
  else if(document.startViewTransition){
    const r = origine ? origine.getBoundingClientRect() : { left:innerWidth / 2, top:innerHeight / 2, width:0, height:0 };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rayon = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(appliquer);
    vt.ready.then(()=>{
      document.documentElement.animate(
        { clipPath:['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rayon + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration:650, easing:'cubic-bezier(.32,.72,0,1)', pseudoElement:'::view-transition-new(root)' }
      );
    }).catch(()=>{});
  } else {
    const racine = document.documentElement;
    racine.classList.add('theme-fondu');
    appliquer();
    setTimeout(()=>racine.classList.remove('theme-fondu'), 500);
  }
  toast('Thème : ' + NOMS_THEME[mode]);
}

document.getElementById('btnTheme').addEventListener('click', e=>{
  const suivant = MODES_THEME[(MODES_THEME.indexOf(themeEnregistre()) + 1) % MODES_THEME.length];
  changerTheme(suivant, e.currentTarget);
});
document.querySelectorAll('[data-theme-mode]').forEach(b=>{
  b.addEventListener('click', ()=>changerTheme(b.dataset.themeMode, b));
});

appliquerTheme(themeEnregistre());
