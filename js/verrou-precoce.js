// Chargé dans <head>, avant l'affichage de la page : évite tout « éclair » au démarrage.
// 1. Si un code PIN est défini, l'application démarre déjà verrouillée (aucun contenu visible avant la saisie).
// 2. Le thème (clair / sombre, ou celui du téléphone en « Auto »), la couleur principale et la taille du texte
//    choisis dans les Réglages sont posés tout de suite. La logique complète est dans js/reglages.js.
try{
  var racine = document.documentElement;
  if(localStorage.getItem('budgetPin')) racine.classList.add('verrouille');
  var p = JSON.parse(localStorage.getItem('budgetPrefs') || 'null') || {};
  var clair = p.theme === 'clair' ||
    ((p.theme !== 'sombre') && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  racine.setAttribute('data-theme', clair ? 'light' : 'dark');
  if(p.accent === 'turquoise' || p.accent === 'rose' || p.accent === 'indigo') racine.setAttribute('data-accent', p.accent);
  if(p.texte === 'grand') racine.setAttribute('data-texte', 'grand');
}catch(e){}
