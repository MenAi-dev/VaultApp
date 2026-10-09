// Chargé dans <head>, avant l'affichage de la page : évite tout « éclair » au démarrage.
// 1. Si un code PIN est défini, l'application démarre déjà verrouillée (aucun contenu visible avant la saisie).
// 2. Le thème choisi (clair / sombre) est appliqué tout de suite ; sans choix, on suit le téléphone.
try{
  var racine = document.documentElement;
  if(localStorage.getItem('budgetPin')) racine.classList.add('verrouille');
  var theme = localStorage.getItem('budgetTheme');
  if(theme === 'clair') racine.setAttribute('data-theme', 'light');
  else if(theme === 'sombre') racine.setAttribute('data-theme', 'dark');
}catch(e){}
