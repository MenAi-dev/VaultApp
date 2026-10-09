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
