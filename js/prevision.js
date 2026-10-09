// Calculs sur le mois en cours : dépenses du mois, prévision de fin de mois.

function depensesDuMois(mois){
  return depenses.filter(d=>(d.date || '').startsWith(mois));
}

function nomMoisLong(mois){
  return new Date(mois + '-01T00:00:00').toLocaleDateString('fr-FR', { month:'long' });
}

// Jour courant et nombre de jours du mois en cours (à partir de la même date que le reste de l'app).
function contexteMois(){
  const [a, m] = moisActuel().split('-').map(Number);
  return { jour: Number(auj().slice(8, 10)), joursMois: new Date(a, m, 0).getDate() };
}

// État du mois, en une couleur et une phrase : compare ce qui est dépensé au temps écoulé.
// cle : sain | vigilance | alerte | depasse (voir css/oneui.css).
function etatBudget(dep, budget, jour, joursMois){
  if(!(budget > 0)) return { cle:'sain', message:'Définis un budget pour suivre ton mois.' };
  const reste = budget - dep;
  if(reste < 0) return { cle:'depasse', message:'Budget dépassé de ' + fmt(-reste) + ' FCFA. Cet excédent sera pris sur ton épargne.' };
  const joursRestants = Math.max(1, joursMois - jour + 1);
  const parJour = fmt(reste / joursRestants);
  const part = dep / budget, temps = jour / joursMois;
  if(part >= 0.9) return { cle:'alerte', message:'Presque épuisé : il reste ' + fmt(reste) + ' FCFA pour ' + joursRestants + ' jour' + (joursRestants > 1 ? 's' : '') + '. Garde l\'essentiel.' };
  if(dep > 0 && part > temps + 0.15) return { cle:'vigilance', message:'Tu dépenses plus vite que le mois n\'avance. Il reste environ ' + parJour + ' FCFA par jour.' };
  if(dep === 0) return { cle:'sain', message:'Mois tout neuf : environ ' + parJour + ' FCFA disponibles par jour.' };
  return { cle:'sain', message:'Tu es dans les clous : tu peux dépenser environ ' + parJour + ' FCFA par jour.' };
}

// Projection linéaire : rythme moyen depuis le 1er du mois, prolongé jusqu'à la fin du mois.
// Renvoie null tant que c'est trop tôt (peu de données) ou si le budget est déjà atteint.
function previsionFinDeMois(dep, budget, jour, joursMois){
  if(dep <= 0 || jour < SEUIL_PREVISION_JOUR || dep >= budget) return null;
  const rythme = dep / jour;
  const fin = rythme * joursMois;
  if(fin > budget){
    return { alerte: true, fin, jourAtteint: Math.min(joursMois, Math.ceil(budget / rythme)) };
  }
  return { alerte: false, fin };
}
