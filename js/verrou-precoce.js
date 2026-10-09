// Chargé dans <head> : si un code PIN est défini, l'application démarre déjà verrouillée
// (le contenu n'est jamais affiché, même une fraction de seconde, avant la saisie du code).
try{ if(localStorage.getItem('budgetPin')) document.documentElement.classList.add('verrouille'); }catch(e){}
