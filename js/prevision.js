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

// Dépenses récurrentes du mois en cours, séparées en deux : ce qui est DÉJÀ payé (compté dans les dépenses)
// et ce qui reste À VENIR ce mois-ci (connu à l'avance : montant et jour). catId (facultatif) : un seul poste.
// Ces montants ne se « projettent » pas au rythme des jours : on sait exactement quand ils tombent.
function fixesDuMois(catId){
  const mois = moisActuel(), aujourdhui = auj();
  const deja = depensesDuMois(mois).filter(d=>d.recId && (!catId || d.cat === catId)).reduce((s,d)=>s+d.montant, 0);
  const aVenir = recurrentes
    .filter(r=>(!catId || r.cat === catId) && r.dernierMois < mois && dateRecurrence(mois, r.jour) > aujourdhui)
    .map(r=>({ jour: Number(dateRecurrence(mois, r.jour).slice(8, 10)), montant: r.montant }));
  return { deja, aVenir, totalAVenir: aVenir.reduce((s,f)=>s+f.montant, 0) };
}

// État du mois, en une couleur et une phrase. cle : sain | vigilance | alerte | depasse (voir css/oneui.css).
// fixes (facultatif) : résultat de fixesDuMois(). Les récurrentes sont traitées à part : une location payée le 1er
// ne doit pas faire croire qu'on « dépense trop vite », et celles à venir réduisent ce qu'il reste vraiment à dépenser.
function etatBudget(dep, budget, jour, joursMois, fixes){
  if(!(budget > 0)) return { cle:'sain', message:'Définis un budget pour suivre ton mois.' };
  const deja = fixes ? fixes.deja : 0, aVenir = fixes ? fixes.totalAVenir : 0;
  const reste = budget - dep;
  if(reste < 0) return { cle:'depasse', message:'Budget dépassé de ' + fmt(-reste) + ' FCFA. Cet excédent sera pris sur ton épargne.' };
  const libre = reste - aVenir; // ce qui reste vraiment, une fois les récurrentes à venir mises de côté
  if(libre < 0) return { cle:'alerte', message:'Les dépenses récurrentes à venir (' + fmt(aVenir) + ' FCFA) dépasseront ton budget de ' + fmt(-libre) + ' FCFA.' };
  const joursRestants = Math.max(1, joursMois - jour + 1);
  const parJour = fmt(libre / joursRestants);
  const part = dep / budget, temps = jour / joursMois;
  if(part >= 0.9) return { cle:'alerte', message:'Presque épuisé : il reste ' + fmt(reste) + ' FCFA pour ' + joursRestants + ' jour' + (joursRestants > 1 ? 's' : '') + '. Garde l\'essentiel.' };
  // Rythme des dépenses variables (hors récurrentes) comparé au budget variable et au temps écoulé.
  const budgetVariable = budget - deja - aVenir, variable = dep - deja;
  if(variable > 0 && budgetVariable > 0 && variable / budgetVariable > temps + 0.15)
    return { cle:'vigilance', message:'Tu dépenses plus vite que le mois n\'avance. Il reste environ ' + parJour + ' FCFA par jour.' };
  if(dep === 0) return { cle:'sain', message:'Mois tout neuf : environ ' + parJour + ' FCFA disponibles par jour.' };
  return { cle:'sain', message:'Tu es dans les clous : tu peux dépenser environ ' + parJour + ' FCFA par jour.' };
}

// Prévision de fin de mois = dépenses d'aujourd'hui
//   + le rythme des dépenses VARIABLES (hors récurrentes) prolongé jusqu'à la fin du mois
//   + les récurrentes encore à venir, à leur vraie date.
// Renvoie null tant que c'est trop tôt (peu de données) ou si le budget est déjà atteint.
// fixes (facultatif) : résultat de fixesDuMois(), pour les mêmes dépenses que dep.
function previsionFinDeMois(dep, budget, jour, joursMois, fixes){
  const deja = fixes ? fixes.deja : 0;
  const aVenir = fixes ? fixes.aVenir : [];
  const totalAVenir = fixes ? fixes.totalAVenir : 0;
  if(jour < SEUIL_PREVISION_JOUR || dep >= budget || (dep <= 0 && totalAVenir <= 0)) return null;
  const rythme = Math.max(0, dep - deja) / jour; // FCFA variables par jour
  const fin = dep + rythme * (joursMois - jour) + totalAVenir;
  if(fin <= budget) return { alerte: false, fin };
  // Jour où le cumul prévu atteint le budget (en tenant compte du jour de chaque récurrence).
  let jourAtteint = joursMois;
  for(let d = jour + 1; d <= joursMois; d++){
    const cumul = dep + rythme * (d - jour) + aVenir.filter(f=>f.jour <= d).reduce((s,f)=>s+f.montant, 0);
    if(cumul >= budget){ jourAtteint = d; break; }
  }
  return { alerte: true, fin, jourAtteint };
}
