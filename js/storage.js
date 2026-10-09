const CLE_STOCKAGE = 'budgetData';
const CLE_SECOURS_CORROMPU = 'budgetDataCorrompu'; // copie brute de données illisibles, pour ne jamais les perdre
const CLE_AVANT_IMPORT = 'budgetAvantImport';      // état précédent, conservé avant une restauration

// Applique un objet de données (déjà parsé) à l'état de l'application.
// Les données lues dans le navigateur passent par les mêmes contrôles qu'une restauration (voir donnees.js) :
// types, identifiants, couleurs, montants. Une valeur modifiée ou corrompue ne peut plus fausser les calculs ni l'affichage.
function appliquerDonnees(data){
  const cats = nettoyerCategories(data.categories);
  if(cats.length) CATEGORIES = cats;
  depenses = nettoyerMouvements(data.depenses, true, true).ok;
  entrees = nettoyerMouvements(data.entrees, false, true).ok;
  epargnes = nettoyerMouvements(data.epargnes, false, true).ok;
  historiqueBudgets = nettoyerHistorique(data.historiqueBudgets);
  recurrentes = nettoyerRecurrentes(data.recurrentes);
  objectifEpargne = nettoyerObjectif(data.objectifEpargne);
  dernierMoisVu = typeof data.dernierMoisVu === 'string' && RE_MOIS.test(data.dernierMoisVu) ? data.dernierMoisVu : null;
}

async function chargerTout(){
  // Stockage local au navigateur (persiste entre les rechargements de la page,
  // tant que tu utilises le même navigateur sur le même appareil).
  let brut = null;
  try{ brut = localStorage.getItem(CLE_STOCKAGE); }catch(e){ console.error('Erreur de lecture des données', e); }
  if(brut){
    let data = null;
    try{ data = JSON.parse(brut); }catch(e){ data = null; }
    if(data && typeof data === 'object' && !Array.isArray(data)){
      appliquerDonnees(data);
      prevRestantTotal = totalBudget();
      return;
    }
    // Données illisibles : on en garde une copie brute AVANT de repartir à vide, pour qu'elles restent récupérables.
    try{ localStorage.setItem(CLE_SECOURS_CORROMPU, brut); }catch(e){}
    console.error('Données illisibles : copie conservée dans « ' + CLE_SECOURS_CORROMPU + ' »');
    toast("Tes données enregistrées sont illisibles. Une copie de secours a été conservée ; l'application repart à vide.", 'danger');
  }

  // Migration depuis un ancien format (clés séparées) si présent
  try{
    const sauvCat = localStorage.getItem('categories');
    if(sauvCat){
      const sauvegarde = JSON.parse(sauvCat);
      if(Array.isArray(sauvegarde) && sauvegarde.length) CATEGORIES = sauvegarde;
    } else {
      const sauvBudgets = localStorage.getItem('budgets');
      if(sauvBudgets){
        const sauvegarde = JSON.parse(sauvBudgets);
        CATEGORIES.forEach(c=>{ if(sauvegarde[c.id] != null) c.budget = sauvegarde[c.id]; });
      }
    }
  }catch(e){ /* rien à migrer */ }
  try{
    const sauvDep = localStorage.getItem('depenses');
    depenses = sauvDep ? JSON.parse(sauvDep) : [];
  }catch(e){ depenses = []; }
  try{
    const sauvEnt = localStorage.getItem('entrees');
    entrees = sauvEnt ? JSON.parse(sauvEnt) : [];
  }catch(e){ entrees = []; }

  appliquerDonnees({ categories: CATEGORIES, depenses, entrees }); // même contrôle que les données récentes
  prevRestantTotal = totalBudget();
  await sauvegarderTout(); // consolide tout de suite pour les prochaines visites
}

let alerteStockageMontree = false;

// Renvoie true si l'écriture a réussi. En cas d'échec (stockage plein, mode privé…), la personne est prévenue.
async function sauvegarderTout(){
  try{
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ categories: CATEGORIES, depenses, entrees, epargnes, historiqueBudgets, recurrentes, objectifEpargne, dernierMoisVu }));
    alerteStockageMontree = false;
    return true;
  }catch(e){
    console.error('Erreur de sauvegarde', e);
    if(!alerteStockageMontree){
      alerteStockageMontree = true;
      toast("Impossible d'enregistrer : l'espace de stockage est plein ou bloqué. Fais une sauvegarde de tes données maintenant.", 'danger');
    }
    return false;
  }
}

// Plusieurs onglets ouverts : quand un autre onglet enregistre, on recharge ses données
// au lieu de les écraser à notre prochaine écriture.
window.addEventListener('storage', e=>{
  if(e.key !== CLE_STOCKAGE || !e.newValue) return;
  try{
    const data = JSON.parse(e.newValue);
    if(!data || typeof data !== 'object' || Array.isArray(data)) return;
    appliquerDonnees(data);
    rendre();
    toast('Données mises à jour depuis un autre onglet');
  }catch(err){ console.error('Synchronisation entre onglets impossible', err); }
});

// Fige un instantané du budget courant (par poste) pour un mois donné.
// methode: 'auto' (déclenché par le changement de mois) ou 'manuel' (bouton discret).
