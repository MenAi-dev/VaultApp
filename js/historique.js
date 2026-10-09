// Historique des dépenses : recherche, filtres (poste, mois) et rendu de la liste.

// Mois affiché dans la liste (par défaut : le mois en cours). Une recherche texte porte sur tous les mois.
function moisAffiche(){ return filtreHisto.mois || moisActuel(); }
function rechercheEnCours(){ return !!filtreHisto.q.trim(); }

function filtreActif(){
  return !!(filtreHisto.q.trim() || filtreHisto.cat || (filtreHisto.mois && filtreHisto.mois !== moisActuel()));
}

function depensesFiltrees(){
  const mots = normaliser(filtreHisto.q).trim().split(/\s+/).filter(Boolean);
  const mois = rechercheEnCours() ? '' : moisAffiche();
  return depenses.filter(d=>{
    if(filtreHisto.cat && d.cat !== filtreHisto.cat) return false;
    if(mois && !(d.date || '').startsWith(mois)) return false;
    if(mots.length){
      const cat = CATEGORIES.find(c=>c.id===d.cat);
      const texte = normaliser((cat ? cat.nom : 'Poste supprimé') + ' ' + (d.note || '') + ' ' + d.montant);
      if(!mots.every(m=>texte.includes(m))) return false;
    }
    return true;
  });
}

// Mois ayant des dépenses, plus le mois en cours, du plus ancien au plus récent.
function moisDisponibles(){
  const set = new Set(depenses.map(d=>(d.date || '').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)));
  set.add(moisActuel());
  return [...set].sort();
}

function changerMoisHisto(delta){
  const liste = moisDisponibles();
  const idx = liste.indexOf(moisAffiche());
  const cible = liste[Math.min(liste.length-1, Math.max(0, idx + delta))];
  filtreHisto.mois = cible === moisActuel() ? '' : cible;
  majOptionsFiltres();
  renderHistoriqueDepenses();
}

// Reconstruit la liste des postes et le navigateur de mois.
function majOptionsFiltres(){
  const selCat = document.getElementById('filtreCat');
  if(!selCat) return;
  if(filtreHisto.cat && !CATEGORIES.some(c=>c.id===filtreHisto.cat)) filtreHisto.cat = '';
  selCat.innerHTML = '<option value="">Tous les postes</option>'
    + CATEGORIES.map(c=>`<option value="${esc(c.id)}">${esc(c.nom)}</option>`).join('');
  selCat.value = filtreHisto.cat;

  const liste = moisDisponibles();
  if(filtreHisto.mois && !liste.includes(filtreHisto.mois)) filtreHisto.mois = '';
  const m = moisAffiche();
  const idx = liste.indexOf(m);
  const label = new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const totalMois = depenses.filter(d=>(d.date || '').startsWith(m)).reduce((t,d)=>t+d.montant,0);
  const sous = (m === moisActuel() ? 'ce mois-ci · ' + fmt(totalMois) + ' FCFA' : fmt(totalMois) + ' FCFA dépensés');
  document.getElementById('moisHistoLabel').innerHTML = label.charAt(0).toUpperCase() + label.slice(1) + '<small>' + sous + '</small>';
  document.getElementById('moisHistoPrec').disabled = idx <= 0;
  document.getElementById('moisHistoSuiv').disabled = idx >= liste.length - 1;
  document.getElementById('navMoisHisto').classList.toggle('inactif', rechercheEnCours());
}

function renderHistoriqueDepenses(){
  const corps = document.getElementById('histoBody');
  const resume = document.getElementById('filtreResumeTexte');
  const btnReset = document.getElementById('btnResetFiltres');
  if(!corps) return;
  renderResumeMoisHisto();

  const liste = depensesFiltrees().sort((a,b)=>
    (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
  const actif = filtreActif();
  const total = liste.reduce((s,d)=>s+d.montant, 0);

  if(resume){
    resume.textContent = (rechercheEnCours() ? 'Recherche dans tous les mois · ' : '')
      + liste.length + ' dépense' + (liste.length > 1 ? 's' : '') + ((rechercheEnCours() || filtreHisto.cat) ? ' · ' + fmt(total) + ' FCFA' : '');
  }
  if(btnReset) btnReset.hidden = !actif;
  document.getElementById('navMoisHisto').classList.toggle('inactif', rechercheEnCours());

  if(liste.length === 0){
    corps.innerHTML = '<div class="vide">' + (rechercheEnCours() || filtreHisto.cat
      ? 'Aucune dépense ne correspond à ta recherche.'
      : 'Aucune dépense ce mois-ci.') + '</div>';
    return;
  }

  const anneeCourante = new Date().getFullYear();
  corps.innerHTML = liste.map((d,i)=>{
    const cat = CATEGORIES.find(c=>c.id===d.cat);
    let dateStr = '';
    if(d.date){
      const dt = new Date(d.date + 'T00:00:00');
      dateStr = dt.toLocaleDateString('fr-FR', dt.getFullYear() !== anneeCourante
        ? { day:'2-digit', month:'short', year:'numeric' } : { day:'2-digit', month:'short' });
    }
    return `
      <div class="ligne-tx" style="animation-delay:${Math.min(i,8)*0.03}s">
        <span class="dot" style="background:${cat ? esc(cat.couleur) : 'var(--gris)'}"></span>
        <div>
          <div>${esc(cat ? cat.nom : 'Poste supprimé')}${d.note ? ' — ' + esc(d.note) : ''}</div>
          <div class="meta">${dateStr}${d.recId ? ' · ↻ récurrente' : ''}</div>
        </div>
        <div class="montant">-${fmt(d.montant)} FCFA</div>
        <div class="actions-ligne">
          <button class="edit" data-id="${esc(d.id)}" title="Modifier">✎</button>
          <button class="del" data-id="${esc(d.id)}" title="Supprimer">×</button>
        </div>
      </div>`;
  }).join('');
  corps.querySelectorAll('.del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerDepense(b.dataset.id));
  });
  corps.querySelectorAll('.edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionDepense(b.dataset.id));
  });
}

function reinitialiserFiltres(){
  filtreHisto = { q:'', cat:'', mois:'' }; // mois vide = mois en cours
  document.getElementById('filtreQ').value = '';
  majOptionsFiltres();
  renderHistoriqueDepenses();
}
