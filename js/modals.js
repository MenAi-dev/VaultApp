function remplirSelectCategories(select, valeur){
  select.innerHTML = CATEGORIES.map(c=>`<option value="${esc(c.id)}">${esc(c.nom)}</option>`).join('');
  if(CATEGORIES.some(c=>c.id===valeur)) select.value = valeur;
}
function ouvrirModal(catId){
  depenseEnEdition = null;
  categoriePourAjout = catId;
  const cat = CATEGORIES.find(c=>c.id===catId);
  document.getElementById('modalTitre').textContent = 'Ajouter une dépense';
  document.getElementById('modalSub').textContent = cat.nom + ' — budget ' + fmt(cat.budget) + ' FCFA';
  document.getElementById('champCat').hidden = true;
  document.getElementById('btnValider').textContent = 'Ajouter';
  document.getElementById('inputMontant').value = '';
  document.getElementById('inputDate').value = auj();
  document.getElementById('inputNote').value = '';
  document.getElementById('overlay').classList.add('actif');
  document.getElementById('inputMontant').focus();
}
function ouvrirEditionDepense(id){
  const d = depenses.find(x=>x.id===id);
  if(!d) return;
  depenseEnEdition = id;
  categoriePourAjout = d.cat;
  document.getElementById('modalTitre').textContent = 'Modifier la dépense';
  document.getElementById('modalSub').textContent = d.recId
    ? 'Dépense récurrente : seule cette occurrence est modifiée'
    : 'Corrige le montant, la date, la note ou le poste';
  remplirSelectCategories(document.getElementById('inputCat'), d.cat);
  document.getElementById('champCat').hidden = false;
  document.getElementById('btnValider').textContent = 'Enregistrer';
  document.getElementById('inputMontant').value = d.montant;
  document.getElementById('inputDate').value = d.date || auj();
  document.getElementById('inputNote').value = d.note || '';
  document.getElementById('overlay').classList.add('actif');
  document.getElementById('inputMontant').focus();
}
function fermerModal(){
  document.getElementById('overlay').classList.remove('actif');
  categoriePourAjout = null;
  depenseEnEdition = null;
}

// Avertit quand une dépense fait franchir le seuil de 80 % ou le budget d'un poste.
function verifierAlerte(catId, depAvant){
  const c = CATEGORIES.find(x=>x.id===catId);
  if(!c) return;
  const dep = depensePar(catId);
  if(dep <= depAvant) return; // rien n'a augmenté ce mois-ci (ex. modification d'une ancienne dépense)
  if(dep > c.budget){
    toast(depAvant <= c.budget
      ? c.nom + ' dépasse son budget de ' + fmt(dep - c.budget) + ' FCFA'
      : c.nom + ' : ' + fmt(dep - c.budget) + ' FCFA au-dessus du budget', 'danger');
  } else if(c.budget > 0 && dep >= c.budget*SEUIL_ALERTE && depAvant < c.budget*SEUIL_ALERTE){
    toast(c.nom + ' : ' + Math.round(dep/c.budget*100) + ' % du budget utilisé', 'alerte');
  }
}

async function validerAjout(){
  const montant = parseFloat(document.getElementById('inputMontant').value);
  if(!montantValide(montant)){ toast(MSG_MONTANT, 'alerte'); return; }
  const date = document.getElementById('inputDate').value || auj();
  const note = document.getElementById('inputNote').value.trim();
  let catCible;
  let depAvant;
  const enEdition = !!depenseEnEdition; // fermerModal() remet depenseEnEdition à null avant le message final
  if(depenseEnEdition){
    const d = depenses.find(x=>x.id===depenseEnEdition);
    if(!d){ fermerModal(); return; }
    catCible = document.getElementById('inputCat').value || d.cat;
    depAvant = depensePar(catCible);
    Object.assign(d, { cat:catCible, montant, date, note });
  } else {
    catCible = categoriePourAjout;
    depAvant = depensePar(catCible);
    depenses.push({ id: nouvelId(), cat: catCible, montant, note, date });
  }
  await sauvegarderTout();
  fermerModal();
  rendre();
  declencherPulse(document.getElementById('totalDepense'));
  const carteEl = document.querySelector(`.carte[data-cat="${catCible}"]`);
  if(carteEl) carteEl.classList.add('flash');
  toast((enEdition ? 'Dépense modifiée' : 'Dépense enregistrée') + ' · −' + fmt(montant) + ' FCFA', 'info');
  verifierAlerte(catCible, depAvant); // remplace ce message si le seuil de 80 % ou le budget est franchi
}
async function supprimerDepense(id){
  const d = depenses.find(x=>x.id===id);
  depenses = depenses.filter(x=>x.id!==id);
  await sauvegarderTout();
  rendre();
  if(d) annulable('Dépense supprimée', ()=>{ depenses.push(d); });
}

async function supprimerCategorie(catId){
  const cat = CATEGORIES.find(c=>c.id===catId);
  if(!cat) return;
  const nbDepenses = depenses.filter(d=>d.cat===catId).length;
  const message = nbDepenses > 0
    ? `Supprimer la catégorie "${cat.nom}" ? ${nbDepenses} dépense(s) associée(s) seront aussi supprimées.`
    : `Supprimer la catégorie "${cat.nom}" ?`;
  if(!confirm(message)) return;
  CATEGORIES = CATEGORIES.filter(c=>c.id!==catId);
  depenses = depenses.filter(d=>d.cat!==catId);
  recurrentes = recurrentes.filter(r=>r.cat!==catId);
  await sauvegarderTout();
  if(categoriePourBudget===catId) fermerModalBudget();
  rendre();
}

function ouvrirModalBudget(catId){
  categoriePourBudget = catId;
  const cat = CATEGORIES.find(c=>c.id===catId);
  document.getElementById('modalBudgetSub').textContent = cat.nom + ' — budget actuel ' + fmt(cat.budget) + ' FCFA';
  document.getElementById('inputBudget').value = cat.budget;
  document.getElementById('overlayBudget').classList.add('actif');
  document.getElementById('inputBudget').focus();
}
function fermerModalBudget(){
  document.getElementById('overlayBudget').classList.remove('actif');
  categoriePourBudget = null;
}
async function validerBudget(){
  const montant = parseFloat(document.getElementById('inputBudget').value);
  if(!budgetValide(montant)){ toast(MSG_MONTANT, 'alerte'); return; }
  const cat = CATEGORIES.find(c=>c.id===categoriePourBudget);
  if(!cat){ fermerModalBudget(); return; }
  cat.budget = montant;
  await sauvegarderTout();
  fermerModalBudget();
  rendre();
}

function ouvrirModalEntree(){
  entreeEnEdition = null;
  document.getElementById('entreeTitre').textContent = 'Ajouter une entrée';
  document.getElementById('btnValiderEntree').textContent = 'Ajouter';
  document.getElementById('inputEntreeMontant').value = '';
  document.getElementById('inputEntreeDate').value = auj();
  document.getElementById('inputEntreeNote').value = '';
  document.getElementById('overlayEntree').classList.add('actif');
  document.getElementById('inputEntreeMontant').focus();
}
function ouvrirEditionEntree(id){
  const e = entrees.find(x=>x.id===id);
  if(!e) return;
  entreeEnEdition = id;
  document.getElementById('entreeTitre').textContent = "Modifier l'entrée";
  document.getElementById('btnValiderEntree').textContent = 'Enregistrer';
  document.getElementById('inputEntreeMontant').value = e.montant;
  document.getElementById('inputEntreeDate').value = e.date || auj();
  document.getElementById('inputEntreeNote').value = e.note || '';
  document.getElementById('overlayEntree').classList.add('actif');
  document.getElementById('inputEntreeMontant').focus();
}
function fermerModalEntree(){
  document.getElementById('overlayEntree').classList.remove('actif');
  entreeEnEdition = null;
}
async function validerEntree(){
  const montant = parseFloat(document.getElementById('inputEntreeMontant').value);
  if(!montantValide(montant)){ toast(MSG_MONTANT, 'alerte'); return; }
  const date = document.getElementById('inputEntreeDate').value || auj();
  const note = document.getElementById('inputEntreeNote').value.trim();
  const e = entreeEnEdition ? entrees.find(x=>x.id===entreeEnEdition) : null;
  if(e) Object.assign(e, { montant, date, note });
  else entrees.push({ id: nouvelId(), montant, note, date });
  await sauvegarderTout();
  fermerModalEntree();
  rendre();
  declencherPulse(document.getElementById('totalEntrees'));
  toast('+' + fmt(montant) + ' FCFA reçus', 'entree');
  confettis(document.getElementById('totalEntrees'), [couleurTheme('--sain'), couleurTheme('--accent'), '#FFD166']);
}
async function supprimerEntree(id){
  const e = entrees.find(x=>x.id===id);
  entrees = entrees.filter(x=>x.id!==id);
  await sauvegarderTout();
  rendre();
  if(e) annulable('Entrée supprimée', ()=>{ entrees.push(e); });
}

function ouvrirModalEpargne(){
  epargneEnEdition = null;
  document.getElementById('epargneTitre').textContent = 'Ajouter une épargne';
  document.getElementById('btnValiderEpargne').textContent = 'Ajouter';
  document.getElementById('inputEpargneMontant').value = '';
  document.getElementById('inputEpargneDate').value = auj();
  document.getElementById('inputEpargneNote').value = '';
  document.getElementById('overlayEpargne').classList.add('actif');
  document.getElementById('inputEpargneMontant').focus();
}
function ouvrirEditionEpargne(id){
  const e = epargnes.find(x=>x.id===id);
  if(!e) return;
  epargneEnEdition = id;
  document.getElementById('epargneTitre').textContent = "Modifier l'épargne";
  document.getElementById('btnValiderEpargne').textContent = 'Enregistrer';
  document.getElementById('inputEpargneMontant').value = e.montant;
  document.getElementById('inputEpargneDate').value = e.date || auj();
  document.getElementById('inputEpargneNote').value = e.note || '';
  document.getElementById('overlayEpargne').classList.add('actif');
  document.getElementById('inputEpargneMontant').focus();
}
function fermerModalEpargne(){
  document.getElementById('overlayEpargne').classList.remove('actif');
  epargneEnEdition = null;
}
async function validerEpargne(){
  const montant = parseFloat(document.getElementById('inputEpargneMontant').value);
  if(!montantValide(montant)){ toast(MSG_MONTANT, 'alerte'); return; }
  const date = document.getElementById('inputEpargneDate').value || auj();
  const note = document.getElementById('inputEpargneNote').value.trim();
  const e = epargneEnEdition ? epargnes.find(x=>x.id===epargneEnEdition) : null;
  if(e) Object.assign(e, { montant, date, note });
  else epargnes.push({ id: nouvelId(), montant, note, date });
  await sauvegarderTout();
  fermerModalEpargne();
  rendre();
  declencherPulse(document.getElementById('totalEpargne'));
  toast(fmt(montant) + ' FCFA mis de côté, bravo', 'epargne');
  confettis(document.getElementById('totalEpargne'), [couleurTheme('--epargne'), '#C9BEFF', '#FFFFFF']);
}
async function supprimerEpargne(id){
  const e = epargnes.find(x=>x.id===id);
  epargnes = epargnes.filter(x=>x.id!==id);
  await sauvegarderTout();
  rendre();
  if(e) annulable('Épargne supprimée', ()=>{ epargnes.push(e); });
}

function ouvrirModalGlobal(){
  const budgetActuel = totalBudget();
  document.getElementById('inputGlobalMontant').value = budgetActuel;
  document.getElementById('repartitionPourcent').innerHTML = CATEGORIES.map(c=>{
    const pct = budgetActuel ? Math.round((c.budget/budgetActuel)*1000)/10 : 0;
    return `
    <div class="pourcent-ligne">
      <span class="dot" style="background:${esc(c.couleur)}"></span>
      <span class="nom">${esc(c.nom)}</span>
      <input type="number" class="input-pourcent" data-cat="${esc(c.id)}" min="0" max="100" step="0.1" value="${pct}">
      <span class="pct-symbol">%</span>
    </div>`;
  }).join('');
  document.querySelectorAll('.input-pourcent').forEach(inp=>{
    inp.addEventListener('input', majTotalPourcent);
  });
  majTotalPourcent();
  document.getElementById('overlayGlobal').classList.add('actif');
}
function fermerModalGlobal(){
  document.getElementById('overlayGlobal').classList.remove('actif');
}
function majTotalPourcent(){
  const total = [...document.querySelectorAll('.input-pourcent')].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  const arrondi = Math.round(total*10)/10;
  const txt = document.getElementById('pourcentTotalTxt');
  const ok = Math.abs(total-100) <= 0.5;
  txt.textContent = 'Total saisi : ' + arrondi + '%' + (ok ? '' : ' — sera automatiquement ajusté à 100% à l\'application');
  txt.className = 'pourcent-total ' + (ok ? 'ok' : 'attention');
}
async function validerGlobal(){
  const global = Math.round(parseFloat(document.getElementById('inputGlobalMontant').value));
  if(!budgetValide(global)){ toast(MSG_MONTANT, 'alerte'); return; }
  const inputs = [...document.querySelectorAll('.input-pourcent')];
  const valeurs = inputs.map(i=>({ cat:i.dataset.cat, pct: Math.max(0, parseFloat(i.value)||0) }));
  const sommePct = valeurs.reduce((s,v)=>s+v.pct,0);
  if(sommePct <= 0) return;
  // Méthode du plus grand reste : on arrondit chaque part à l'entier inférieur,
  // puis on distribue les unités restantes aux catégories les plus proches de
  // l'arrondi supérieur, afin que la somme finale corresponde exactement au
  // montant global saisi (au lieu de dériver de quelques FCFA par arrondi indépendant).
  const parts = valeurs.map(v=>{
    const brut = global * (v.pct/sommePct);
    return { cat:v.cat, entier:Math.floor(brut), reste: brut - Math.floor(brut) };
  });
  let restant = global - parts.reduce((s,p)=>s+p.entier,0);
  parts.sort((a,b)=>b.reste-a.reste);
  for(let i=0; i<parts.length && restant>0; i++, restant--){
    parts[i].entier += 1;
  }
  parts.forEach(p=>{
    const cat = CATEGORIES.find(c=>c.id===p.cat);
    if(cat) cat.budget = p.entier;
  });
  await sauvegarderTout();
  fermerModalGlobal();
  rendre();
  declencherPulse(document.getElementById('totalBudget'));
}

function ouvrirModalCategorie(){
  document.getElementById('inputCatNom').value = '';
  document.getElementById('inputCatBudget').value = '';
  document.getElementById('overlayCategorie').classList.add('actif');
  document.getElementById('inputCatNom').focus();
}
function fermerModalCategorie(){
  document.getElementById('overlayCategorie').classList.remove('actif');
}
async function validerCategorie(){
  const nom = document.getElementById('inputCatNom').value.trim().slice(0, 40);
  const budget = parseFloat(document.getElementById('inputCatBudget').value);
  if(!nom){ toast('Donne un nom à la catégorie', 'alerte'); return; }
  if(!budgetValide(budget)){ toast(MSG_MONTANT, 'alerte'); return; }
  const id = 'cat_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  CATEGORIES.push({ id, nom, budget, couleur: couleurAuto(CATEGORIES.length) });
  await sauvegarderTout();
  fermerModalCategorie();
  rendre();
}

