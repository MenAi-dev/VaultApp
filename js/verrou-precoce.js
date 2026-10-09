// Chargé dans <head>, avant l'affichage de la page : si un code PIN est défini, l'application démarre
// déjà verrouillée (aucun contenu visible, même une fraction de seconde, avant la saisie du code).
try{ if(localStorage.getItem('budgetPin')) document.documentElement.classList.add('verrouille'); }catch(e){}
