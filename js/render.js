// Dépenses d'un poste sur un mois (par défaut : le mois en cours).
function depensePar(catId, mois){
  return depensesDuMois(mois || moisActuel()).filter(d=>d.cat===catId).reduce((s,d)=>s+d.montant,0);
}

// Situation globale : l'épargne est retranchée des entrées, et un dépassement du budget du mois est pris sur l'épargne.
function situation(){
  const entreesTot = entrees.reduce((s,e)=>s+e.montant,0);
  const epargneBrute = epargnes.reduce((s,e)=>s+e.montant,0);
  const depTous = depenses.reduce((s,d)=>s+d.montant,0);
  const mc = moisActuel();
  const depMois = depensesDuMois(mc).reduce((s,d)=>s+d.montant,0);
  // Dépassement cumulé : chaque mois (jusqu'au mois en cours) dépassant son budget est pris sur l'épargne, définitivement.
  const mois = [...new Set(depenses.map(d=>(d.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m) && m<=mc))];
  let depassementTotal = 0, depassementMois = 0;
  mois.forEach(m=>{
    const fige = m < mc ? historiqueBudgets.find(h=>h.mois===m) : null; // mois en cours : budget actuel
    const budgetM = fige ? fige.total : totalBudget();
    const dep = depensesDuMois(m).reduce((s,d)=>s+d.montant,0);
    const exces = Math.max(0, dep - budgetM);
    depassementTotal += exces;
    if(m===mc) depassementMois = exces;
  });
  const prise = Math.min(depassementTotal, epargneBrute);
  return {
    entreesTot, epargneBrute, depTous, depMois, depassement: depassementTotal, depassementMois, prise,
    epargneNette: epargneBrute - prise,
    poche: entreesTot - epargneBrute - depTous + prise
  };
}

// Couleurs du graphique d'accueil (volontairement hors bleu, pour bien distinguer les postes).
// Teintes volontairement à l'écart du vert / ambre / corail / violet, qui ont un sens (sain / vigilance / alerte / épargne).
const COULEURS_GRAPHIQUE = ['#4C8DFF','#22C3E6','#FF7AB6','#D9A441','#C77DFF','#6FA8A0','#FF8A5B','#5B6B8C'];

// Répartition des dépenses du mois par poste.
function renderGraphiqueAccueil(){
  const bloc = document.getElementById('blocRepartition');
  const lignes = CATEGORIES
    .map((c,i)=>({ nom:c.nom, dep:depensePar(c.id), couleur:COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length] }))
    .filter(l=>l.dep>0)
    .sort((a,b)=>b.dep-a.dep);
  const total = lignes.reduce((s,l)=>s+l.dep,0);
  bloc.hidden = total === 0;
  if(total === 0) return;
  let acc = 0;
  const stops = lignes.map(l=>{
    const debut = acc/total*360; acc += l.dep; const fin = acc/total*360;
    return `${l.couleur} ${debut}deg ${fin}deg`;
  }).join(', ');
  const donut = document.getElementById('donut');
  donut.style.background = `conic-gradient(${stops})`;
  donut.style.setProperty('mask','radial-gradient(circle, transparent 56%, black 57%)');
  donut.style.setProperty('-webkit-mask','radial-gradient(circle, transparent 56%, black 57%)');
  document.getElementById('donutTotal').textContent = fmt(total);
  document.getElementById('legende').innerHTML = lignes.map((l,i)=>`
    <div class="leg-ligne" style="animation-delay:${i*0.05}s">
      <span class="dot" style="background:${l.couleur}"></span>
      <span class="nom">${esc(l.nom)}</span>
      <span class="montant">${fmt(l.dep)} FCFA</span>
      <span class="pct-val" style="color:var(--blanc)">${Math.round(l.dep/total*100)}%</span>
    </div>`).join('');
}

function rendre(){
  const budgetActuel = totalBudget();
  const totalDepenseTous = depenses.reduce((s,d)=>s+d.montant,0);            // cumul, pour l'argent en poche
  const totalDepense = depensesDuMois(moisActuel()).reduce((s,d)=>s+d.montant,0); // mois en cours
  const totalRestant = budgetActuel - totalDepense;
  const ctx = contexteMois();
  const nomMois = nomMoisLong(moisActuel());
  document.getElementById('labelDepense').textContent = 'Restant en ' + nomMois;
  document.getElementById('titrePostes').textContent = 'Postes · ' + nomMois;
  const sit = situation();
  const totalEntreesGlobal = sit.entreesTot;
  const solde = sit.poche;

  const soldeEl = document.getElementById('soldeDispo');
  animerValeur(soldeEl, prevSoldeTotal, solde, v => fmt(v)+' FCFA');
  soldeEl.className = solde >= 0 ? 'pos' : 'neg';
  prevSoldeTotal = solde;

  const totalDepenseEl = document.getElementById('totalDepense');
  const totalRestantEl = document.getElementById('totalRestant');
  animerValeur(totalDepenseEl, prevDepenseTotal, totalDepense, v => fmt(v)+' FCFA');
  animerValeur(totalRestantEl, prevRestantTotal, totalRestant, v => fmt(v)+' <small>FCFA</small>');
  totalRestantEl.className = 'resume-valeur ' + (totalRestant >= 0 ? 'pos' : 'neg');
  document.getElementById('totalBudget').textContent = fmt(budgetActuel)+' FCFA';
  prevDepenseTotal = totalDepense;
  prevRestantTotal = totalRestant;

  const pctG = budgetActuel ? Math.min(100, (totalDepense/budgetActuel)*100) : 0;
  const etat = etatBudget(totalDepense, budgetActuel, ctx.jour, ctx.joursMois);
  const carteResume = document.querySelector('.resume');
  const etatAvant = carteResume.dataset.etat;
  carteResume.dataset.etat = etat.cle;
  if(etatAvant && etatAvant !== etat.cle) animerEtat(carteResume); // pas à la 1re ouverture, seulement quand l'état change
  document.getElementById('messageEtat').textContent = etat.message;
  document.getElementById('barreGlobale').style.width = pctG+'%';
  document.getElementById('pctGlobal').textContent = Math.round(pctG)+' %';
  const prevG = previsionFinDeMois(totalDepense, budgetActuel, ctx.jour, ctx.joursMois);
  const elPrevG = document.getElementById('previsionGlobale');
  elPrevG.textContent = (prevG && prevG.alerte) ? 'Au rythme actuel, le budget du mois sera dépassé (~' + fmt(prevG.fin) + ' FCFA)' : '';
  elPrevG.className = 'prevision-globale alerte';

  document.getElementById('grille').innerHTML = CATEGORIES.map((c,i)=>{
    const dep = depensePar(c.id);
    const reste = c.budget - dep;
    const pctCat = c.budget ? Math.min(100, (dep/c.budget)*100) : 0;
    const depasse = dep > c.budget;
    const proche = !depasse && c.budget > 0 && dep >= c.budget*SEUIL_ALERTE;
    const couleurBarre = depasse ? 'var(--alerte)' : proche ? 'var(--vigilance)' : 'var(--sain)';
    const couleurReste = couleurBarre;
    const prev = previsionFinDeMois(dep, c.budget, ctx.jour, ctx.joursMois);
    const prevHtml = (prev && prev.alerte)
      ? '<div class="prevision alerte">Budget atteint vers le ' + prev.jourAtteint + ' ' + nomMois + ' à ce rythme</div>'
      : '';
    const tag = depasse ? '<span class="tag-alerte rouge">Dépassé</span>'
              : proche ? '<span class="tag-alerte">'+Math.round(dep/c.budget*100)+' %</span>' : '';
    return `
    <div class="carte" data-cat="${esc(c.id)}" style="animation-delay:${i*0.06}s">
      <div class="carte-head">
        <div class="nom">${esc(c.nom)}${tag}</div>
        <div class="carte-head-droite">
          <span class="budget">${fmt(c.budget)} FCFA</span>
          <button class="modif-btn" data-cat="${esc(c.id)}" title="Modifier le budget">✎</button>
          <button class="suppr-btn" data-cat="${esc(c.id)}" title="Supprimer la catégorie">🗑</button>
        </div>
      </div>
      <div class="barre"><div class="barre-fill" style="width:${pctCat}%; background:${couleurBarre}"></div></div>
      <div class="carte-foot">
        <span class="depense">${fmt(dep)} FCFA dépensé</span>
        <span class="reste" style="color:${couleurReste}">${depasse ? '-' : ''}${fmt(Math.abs(reste))} FCFA</span>
      </div>
      ${prevHtml}
      <button class="ajout-btn" data-cat="${esc(c.id)}">+ Ajouter une dépense</button>
    </div>`;
  }).join('');
  document.querySelectorAll('.ajout-btn').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirModal(b.dataset.cat));
  });
  document.querySelectorAll('.modif-btn').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirModalBudget(b.dataset.cat));
  });
  document.querySelectorAll('.suppr-btn').forEach(b=>{
    b.addEventListener('click', ()=>supprimerCategorie(b.dataset.cat));
  });

  majOptionsFiltres();
  renderHistoriqueDepenses();
  renderRecurrentes();

  const histoEpargne = [...epargnes].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  if(histoEpargne.length===0){
    document.getElementById('histoEpargneBody').innerHTML = '<div class="vide">Aucune épargne enregistrée pour le moment.</div>';
  } else {
    document.getElementById('histoEpargneBody').innerHTML = histoEpargne.map((e,i)=>{
      const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) : '';
      return `
      <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
        <span class="dot"></span>
        <div>
          <div>${esc(e.note || 'Épargne')}</div>
          <div class="meta">${dateStr}</div>
        </div>
        <div class="montant">+${fmt(e.montant)} FCFA</div>
        <div class="actions-ligne"><button class="edit" data-id="${esc(e.id)}" title="Modifier">✎</button><button class="del" data-id="${esc(e.id)}" title="Supprimer">×</button></div>
      </div>`;
    }).join('');
    document.querySelectorAll('#histoEpargneBody .del').forEach(b=>{
      b.addEventListener('click', ()=>supprimerEpargne(b.dataset.id));
    });
  }

  renderEntrees();
  renderEpargne();
  renderGraphiqueMois();
  renderGraphiqueRevenu();
  renderGraphiqueEpargne();
  renderObjectif();
  renderGraphiqueAccueil();
  brancherEditions();
  majInfoSauvegarde();
}

function brancherEditions(){
  document.querySelectorAll('#entreesBody .edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionEntree(b.dataset.id));
  });
  document.querySelectorAll('#epargneBody .edit, #histoEpargneBody .edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionEpargne(b.dataset.id));
  });
}

function renderEntrees(){
  const total = entrees.reduce((s,e)=>s+e.montant,0);
  animerValeur(document.getElementById('totalEntrees'), prevEntreesTotal, total, v=>fmt(v)+' <small>FCFA</small>');
  prevEntreesTotal = total;
  const tri = [...entrees].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  const body = document.getElementById('entreesBody');
  if(tri.length===0){
    body.innerHTML = '<div class="vide">Aucune entrée enregistrée pour le moment.</div>';
    return;
  }
  body.innerHTML = tri.map((e,i)=>{
    const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
    return `
    <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
      <span class="dot"></span>
      <div>
        <div>${esc(e.note || 'Entrée')}</div>
        <div class="meta">${dateStr}</div>
      </div>
      <div class="montant">+${fmt(e.montant)} FCFA</div>
      <div class="actions-ligne"><button class="edit" data-id="${esc(e.id)}" title="Modifier">✎</button><button class="del" data-id="${esc(e.id)}" title="Supprimer">×</button></div>
    </div>`;
  }).join('');
  document.querySelectorAll('#entreesBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerEntree(b.dataset.id));
  });
}

function renderEpargne(){
  const sit = situation();
  const total = sit.epargneNette;
  const msg = document.getElementById('messageEpargne');
  if(msg){
    msg.textContent = sit.prise > 0 ? 'Budgets dépassés : ' + fmt(sit.prise) + ' FCFA ont été pris sur ton épargne.' : '';
    msg.style.display = sit.prise > 0 ? '' : 'none';
  }
  animerValeur(document.getElementById('totalEpargne'), prevEpargneTotal, total, v=>fmt(v)+' <small>FCFA</small>');
  prevEpargneTotal = total;
  const tri = [...epargnes].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  const body = document.getElementById('epargneBody');
  if(tri.length===0){
    body.innerHTML = '<div class="vide">Aucune épargne enregistrée pour le moment.</div>';
    return;
  }
  body.innerHTML = tri.map((e,i)=>{
    const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
    return `
    <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
      <span class="dot"></span>
      <div>
        <div>${esc(e.note || 'Épargne')}</div>
        <div class="meta">${dateStr}</div>
      </div>
      <div class="montant">+${fmt(e.montant)} FCFA</div>
      <div class="actions-ligne"><button class="edit" data-id="${esc(e.id)}" title="Modifier">✎</button><button class="del" data-id="${esc(e.id)}" title="Supprimer">×</button></div>
    </div>`;
  }).join('');
  document.querySelectorAll('#epargneBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerEpargne(b.dataset.id));
  });
}

function renderGraphiqueMois(){
  const moisEl = document.getElementById('moisSelect');
  if(!moisEl.value) moisEl.value = moisActuel();
  const mois = moisEl.value;
  const label = document.getElementById('moisSelectLabel');
  if(label){
    const court = new Date(mois+'-01T00:00:00').toLocaleDateString('fr-FR', {month:'short', year:'numeric'});
    label.textContent = court.replace('.', '');
  }
  const depMois = depenses.filter(d=>d.date && d.date.startsWith(mois));
  const entMois = entrees.filter(e=>e.date && e.date.startsWith(mois));
  const totalDepMois = depMois.reduce((s,d)=>s+d.montant,0);
  const totalEntMois = entMois.reduce((s,e)=>s+e.montant,0);
  document.getElementById('moisDepense').textContent = fmt(totalDepMois)+' FCFA';
  document.getElementById('moisEntree').textContent = fmt(totalEntMois)+' FCFA';

  const conteneur = document.getElementById('barresMois');
  if(totalDepMois === 0){
    conteneur.innerHTML = '<div class="mois-vide">Aucune dépense enregistrée pour ce mois.</div>';
    return;
  }
  // Budgets : figés pour un mois passé, budget actuel pour le mois en cours.
  const fige = mois < moisActuel() ? historiqueBudgets.find(h=>h.mois===mois) : null;
  const budgetDe = c => {
    const f = fige && fige.categories.find(x=>x.id===c.id);
    return f ? f.budget : c.budget;
  };
  const lignes = CATEGORIES
    .map((c,i)=>({
      id:c.id, nom:c.nom, couleur:COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length], budget:budgetDe(c),
      total: depMois.filter(d=>d.cat===c.id).reduce((s,d)=>s+d.montant,0)
    }))
    .filter(l=>l.total>0)
    .sort((a,b)=>b.total-a.total);

  const maxT = Math.max(...lignes.map(l=>l.total), 1);
  const rangs = lignes.map((l,i)=>{
    const depasse = l.budget > 0 && l.total > l.budget;
    const w = l.budget > 0 ? Math.min(l.total/l.budget,1)*100 : l.total/maxT*100;
    return `
    <div class="rang" data-id="${esc(l.id)}" style="animation-delay:${i*0.05}s">
      <div class="rang-tete">
        <span class="rang-nom"><span class="dot" style="background:${l.couleur}"></span>${esc(l.nom)}</span>
        <span class="rang-montant${depasse?' depasse':''}">${fmt(l.total)}</span>
      </div>
      <div class="rang-piste"><div class="rang-fill" style="background:${l.couleur}" data-w="${w.toFixed(1)}"></div></div>
    </div>`;
  }).join('');

  conteneur.innerHTML = `
    <div class="courbe-bloc" id="courbeBloc"></div>
    <div class="rangs">${rangs}</div>`;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      conteneur.querySelectorAll('[data-w]').forEach(el=>{ el.style.width = el.dataset.w + '%'; });
    });
  });
  initCourbe(mois, lignes, fige ? fige.total : totalBudget());
}

function renderGraphiqueRevenu(){
  const maintenant = new Date();
  const mois = [];
  for(let i=5;i>=0;i--){
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth()-i, 1);
    mois.push({ cle: cleMois(d), label: d.toLocaleDateString('fr-FR',{month:'short'}) });
  }
  const totaux = mois.map(m=>({
    ...m,
    total: entrees.filter(e=>e.date && e.date.startsWith(m.cle)).reduce((s,e)=>s+e.montant,0)
  }));
  // Carte masquée tant qu'il n'y a pas au moins 2 mois de données : un graphique à une seule barre n'apprend rien.
  const carteGraphique = document.getElementById('barresRevenu').closest('.graphique-mois');
  const moisAvecDonnees = totaux.filter(m=>m.total>0).length;
  carteGraphique.hidden = moisAvecDonnees < 2;
  if(moisAvecDonnees < 2) return;
  const moyenne = totaux.reduce((s,m)=>s+m.total,0) / totaux.length;
  document.getElementById('revenuMoyenne').textContent = fmt(moyenne)+' FCFA';
  document.getElementById('revenuCeMois').textContent = fmt(totaux[totaux.length-1].total)+' FCFA';

  const conteneur = document.getElementById('barresRevenu');
  if(totaux.every(m=>m.total===0)){
    conteneur.innerHTML = '<div class="mois-vide">Aucune entrée enregistrée sur les 6 derniers mois.</div>';
    return;
  }
  const max = Math.max(...totaux.map(m=>m.total), 1);
  conteneur.innerHTML = totaux.map((m,i)=>{
    const h = m.total ? Math.max(6, (m.total/max)*150) : 2;
    return `
    <div class="barre-col">
      <div class="valeur-barre">${m.total ? fmt(m.total) : ''}</div>
      <div class="barre-visuelle" style="height:0px; background:var(--vert); transition-delay:${i*0.05}s" data-h="${h}"></div>
      <div class="label-barre">${m.label}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      conteneur.querySelectorAll('.barre-visuelle').forEach(el=>{
        el.style.height = el.dataset.h + 'px';
      });
    });
  });
}

function renderGraphiqueEpargne(){
  const maintenant = new Date();
  const mois = [];
  for(let i=5;i>=0;i--){
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth()-i, 1);
    mois.push({ cle: cleMois(d), label: d.toLocaleDateString('fr-FR',{month:'short'}) });
  }
  const totaux = mois.map(m=>({
    ...m,
    total: epargnes.filter(e=>e.date && e.date.startsWith(m.cle)).reduce((s,e)=>s+e.montant,0)
  }));
  // Carte masquée tant qu'il n'y a pas au moins 2 mois de données : un graphique à une seule barre n'apprend rien.
  const carteGraphique = document.getElementById('barresEpargne').closest('.graphique-mois');
  const moisAvecDonnees = totaux.filter(m=>m.total>0).length;
  carteGraphique.hidden = moisAvecDonnees < 2;
  if(moisAvecDonnees < 2) return;
  const moyenne = totaux.reduce((s,m)=>s+m.total,0) / totaux.length;
  document.getElementById('epargneMoyenne').textContent = fmt(moyenne)+' FCFA';
  document.getElementById('epargneCeMois').textContent = fmt(totaux[totaux.length-1].total)+' FCFA';

  const conteneur = document.getElementById('barresEpargne');
  if(totaux.every(m=>m.total===0)){
    conteneur.innerHTML = '<div class="mois-vide">Aucune épargne enregistrée sur les 6 derniers mois.</div>';
    return;
  }
  const max = Math.max(...totaux.map(m=>m.total), 1);
  conteneur.innerHTML = totaux.map((m,i)=>{
    const h = m.total ? Math.max(6, (m.total/max)*150) : 2;
    return `
    <div class="barre-col">
      <div class="valeur-barre">${m.total ? fmt(m.total) : ''}</div>
      <div class="barre-visuelle" style="height:0px; background:var(--epargne); transition-delay:${i*0.05}s" data-h="${h}"></div>
      <div class="label-barre">${m.label}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      conteneur.querySelectorAll('.barre-visuelle').forEach(el=>{
        el.style.height = el.dataset.h + 'px';
      });
    });
  });
}


// ===== Courbe cumulée du mois (dynamique : toucher un jour / toucher un poste) =====
let courbeSel = null, courbeMois = null;
const kfmt = n => n >= 1000 ? (Math.round(n/100)/10).toString().replace('.',',') + ' k' : String(Math.round(n));

function initCourbe(mois, lignes, budgetTotal){
  const bloc = document.getElementById('courbeBloc');
  if(!bloc) return;
  if(mois !== courbeMois){ courbeMois = mois; courbeSel = null; }
  if(courbeSel && !lignes.some(l=>l.id===courbeSel)) courbeSel = null;
  const [y,m] = mois.split('-').map(Number);
  const J = new Date(y,m,0).getDate();
  const enCours = mois === moisActuel();
  const jourC = enCours ? Math.min(J, contexteMois().jour) : J;
  const pY = m===1 ? y-1 : y, pM = m===1 ? 12 : m-1;
  const pCle = pY+'-'+String(pM).padStart(2,'0');
  const PJ = new Date(pY,pM,0).getDate();
  const W=420, H=170, gL=6, gR=6, gT=16, gB=20;

  function cumul(cle, nbJours, filtre, jusqua){
    const par = Array(nbJours+1).fill(0);
    depensesDuMois(cle).filter(filtre).forEach(d=>{ const j = Number(d.date.slice(8,10)); if(j>=1 && j<=nbJours) par[j]+=d.montant; });
    const cum = [0]; for(let j=1;j<=jusqua;j++) cum[j] = cum[j-1] + par[j];
    return { par, cum };
  }

  function tracer(){
    const ligne = courbeSel ? lignes.find(l=>l.id===courbeSel) : null;
    const filtre = d => !courbeSel || d.cat===courbeSel;
    const budget = ligne ? ligne.budget : budgetTotal;
    const couleur = ligne ? ligne.couleur : '#4C8DFF';
    const cur = cumul(mois, J, filtre, jourC);
    const totalC = cur.cum[jourC];
    const proj = (enCours && budget>0) ? previsionFinDeMois(totalC, budget, jourC, J) : null;
    const ymax = Math.max(budget, totalC, proj ? proj.fin : 0, 1) * 1.1;
    const X = d => gL + (d-1)/(J-1)*(W-gL-gR);
    const Y = v => gT + (1 - v/ymax)*(H-gT-gB);
    const pts = (cum,a,b) => { const o=[]; for(let j=a;j<=b;j++) o.push(X(j).toFixed(1)+','+Y(cum[j]).toFixed(1)); return o.join(' '); };

    let svg = `<defs><linearGradient id="cdeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${couleur}" stop-opacity=".28"/><stop offset="1" stop-color="${couleur}" stop-opacity="0"/></linearGradient></defs>`;
    [1,J].forEach(d=>{ svg += `<text x="${X(d).toFixed(1)}" y="${H-4}" class="c-axe" text-anchor="${d===1?'start':'end'}">${d===1?'1':J}</text>`; });
    if(budget>0) svg += `<line x1="${gL}" x2="${W-gR}" y1="${Y(budget).toFixed(1)}" y2="${Y(budget).toFixed(1)}" class="c-budget"/><text x="${gL}" y="${(Y(budget)-5).toFixed(1)}" class="c-axe">Budget ${kfmt(budget)}</text>`;
    svg += `<polygon points="${X(1).toFixed(1)},${Y(0).toFixed(1)} ${pts(cur.cum,1,jourC)} ${X(jourC).toFixed(1)},${Y(0).toFixed(1)}" fill="url(#cdeg)"/>`;
    svg += `<polyline points="${pts(cur.cum,1,jourC)}" class="c-ligne" stroke="${couleur}"/>`;
    const depasse = budget>0 ? cur.cum.findIndex((v,j)=>j>=1 && v>budget) : -1;
    if(depasse>0) svg += `<polyline points="${pts(cur.cum,Math.max(1,depasse-1),jourC)}" class="c-ligne c-rouge"/>`;
    if(proj) svg += `<line x1="${X(jourC).toFixed(1)}" y1="${Y(totalC).toFixed(1)}" x2="${X(J).toFixed(1)}" y2="${Y(proj.fin).toFixed(1)}" class="c-proj" stroke="${proj.alerte?'#FF6B7A':couleur}"/>`;
    svg += `<line id="cCurseur" class="c-curseur" y1="${gT}" y2="${H-gB}" x1="0" x2="0" style="display:none"/><circle id="cPoint" r="4" fill="${couleur}" class="c-point" style="display:none"/>`;
    svg += `<rect id="cZone" x="0" y="0" width="${W}" height="${H-gB}" fill="transparent"/>`;

    let verdict = '';
    if(proj) verdict = proj.alerte
      ? `Budget atteint le <b class="mauvais">${proj.jourAtteint}</b> à ce rythme`
      : `Fin de mois estimée : <b class="bon">${fmt(proj.fin)}</b> FCFA`;
    else if(budget>0 && totalC>budget) verdict = `Budget dépassé de <b class="mauvais">${fmt(totalC-budget)}</b> FCFA`;
    const pastille = ligne ? `<button type="button" class="c-pastille" id="courbeReset"><i style="background:${ligne.couleur}"></i>${esc(ligne.nom)}<span>×</span></button>` : '';
    bloc.innerHTML = `
      <div class="courbe-tete"><div class="c-verdict">${verdict}</div>${pastille}</div>
      <div class="courbe-wrap"><svg viewBox="0 0 ${W} ${H}" class="courbe-svg">${svg}</svg><div class="courbe-tip" id="cTip" hidden></div></div>`;

    const rs = document.getElementById('courbeReset');
    if(rs) rs.addEventListener('click', ()=>{ courbeSel = null; tracer(); });
    document.querySelectorAll('#barresMois .rang').forEach(r=>{
      r.classList.toggle('actif', r.dataset.id===courbeSel);
      r.classList.toggle('attenue', !!courbeSel && r.dataset.id!==courbeSel);
    });

    const zone = document.getElementById('cZone'), curs = document.getElementById('cCurseur'), pt = document.getElementById('cPoint'), tip = document.getElementById('cTip');
    const svgEl = bloc.querySelector('svg');
    const montrer = e => {
      const r = svgEl.getBoundingClientRect();
      const xv = (e.clientX - r.left)/r.width*W;
      const d = Math.max(1, Math.min(jourC, Math.round((xv-gL)/(W-gL-gR)*(J-1))+1));
      curs.setAttribute('x1',X(d)); curs.setAttribute('x2',X(d)); curs.style.display='';
      pt.setAttribute('cx',X(d)); pt.setAttribute('cy',Y(cur.cum[d])); pt.style.display='';
      const dj = depensesDuMois(mois).filter(filtre).filter(x=>Number(x.date.slice(8,10))===d);
      const lib = new Date(y,m-1,d).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
      tip.innerHTML = `<div class="tip-date">${lib}</div><div class="tip-cumul">${fmt(cur.cum[d])} FCFA <small>cumulés</small></div>`
        + (cur.par[d] ? `<div class="tip-jour">+${fmt(cur.par[d])} ce jour</div>` + dj.slice(0,3).map(x=>`<div class="tip-ligne">${esc(x.note||'Dépense')} · ${fmt(x.montant)}</div>`).join('') + (dj.length>3?`<div class="tip-ligne">+${dj.length-3} autre${dj.length-3>1?'s':''}</div>`:'') : '<div class="tip-ligne">Aucune dépense ce jour</div>');
      tip.hidden = false;
      const pct = X(d)/W*100;
      tip.style.left = Math.max(18, Math.min(82, pct)) + '%';
    };
    zone.addEventListener('pointermove', montrer);
    zone.addEventListener('pointerdown', montrer);
    zone.addEventListener('pointerleave', e=>{ if(e.pointerType==='mouse'){ curs.style.display='none'; pt.style.display='none'; tip.hidden=true; } });
  }

  document.querySelectorAll('#barresMois .rang').forEach(r=>{
    r.addEventListener('click', ()=>{ courbeSel = (courbeSel===r.dataset.id) ? null : r.dataset.id; tracer(); });
  });
  tracer();
}
