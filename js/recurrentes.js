// Dépenses récurrentes : un modèle (poste, montant, jour du mois) ajoute
// automatiquement la dépense chaque mois, y compris les mois où l'app n'a pas été ouverte.

function moisDecale(mois, delta){
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// Date d'application d'un mois donné ; le jour est ramené au dernier jour si le mois est plus court.
function dateRecurrence(mois, jour){
  const [a, m] = mois.split('-').map(Number);
  const max = new Date(a, m, 0).getDate();
  return mois + '-' + String(Math.min(jour, max)).padStart(2, '0');
}

// À la création, on ne rajoute pas le passé : la 1re application est la prochaine occurrence.
function dernierMoisInitial(jour){
  return dateRecurrence(moisActuel(), jour) <= auj() ? moisActuel() : moisDecale(moisActuel(), -1);
}
function premiereApplication(jour){
  return dateRecurrence(moisDecale(dernierMoisInitial(jour), 1), jour);
}

async function appliquerRecurrentes(){
  const aujourdhui = auj();
  const moisFin = moisActuel();
  let ajoutees = 0;
  recurrentes.forEach(r=>{
    let m = moisDecale(r.dernierMois, 1);
    let garde = 0;
    while(m <= moisFin && garde++ < 24){
      const date = dateRecurrence(m, r.jour);
      if(date > aujourdhui) break;
      depenses.push({ id: nouvelId(), cat: r.cat, montant: r.montant, note: r.note, date, recId: r.id });
      r.dernierMois = m;
      ajoutees++;
      m = moisDecale(m, 1);
    }
  });
  if(ajoutees){
    await sauvegarderTout();
    toast(ajoutees + ' dépense' + (ajoutees > 1 ? 's récurrentes ajoutées' : ' récurrente ajoutée'));
  }
  return ajoutees;
}

function renderRecurrentes(){
  const corps = document.getElementById('recBody');
  if(!corps) return;
  if(recurrentes.length === 0){
    corps.innerHTML = '<div class="vide">Aucune dépense récurrente. Ajoute celles qui reviennent chaque mois (transport, forfait, charges…).</div>';
    return;
  }
  const tri = [...recurrentes].sort((a,b)=>a.jour - b.jour);
  corps.innerHTML = tri.map(r=>{
    const cat = CATEGORIES.find(c=>c.id===r.cat);
    return `
      <div class="ligne-tx">
        <span class="dot" style="background:${cat ? esc(cat.couleur) : 'var(--gris)'}"></span>
        <div>
          <div>${esc(cat ? cat.nom : 'Poste supprimé')}${r.note ? ' — ' + esc(r.note) : ''}</div>
          <div class="meta">le ${r.jour} de chaque mois</div>
        </div>
        <div class="montant">-${fmt(r.montant)} FCFA</div>
        <div class="actions-ligne"><button class="edit" data-id="${esc(r.id)}" title="Modifier">✎</button></div>
      </div>`;
  }).join('');
  corps.querySelectorAll('.edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirModalRec(b.dataset.id));
  });
}

function majHintRec(){
  const hint = document.getElementById('recHint');
  const jour = parseInt(document.getElementById('recJour').value, 10);
  if(recurrenteEnEdition || !(jour >= 1 && jour <= 31)){ hint.textContent = ''; return; }
  const iso = premiereApplication(jour);
  hint.textContent = 'Première application : ' + new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}

function ouvrirModalRec(id){
  const r = id ? recurrentes.find(x=>x.id===id) : null;
  recurrenteEnEdition = r ? r.id : null;
  remplirSelectCategories(document.getElementById('recCat'), r ? r.cat : (CATEGORIES[0] && CATEGORIES[0].id));
  document.getElementById('recTitre').textContent = r ? 'Modifier la récurrence' : 'Nouvelle dépense récurrente';
  document.getElementById('recMontant').value = r ? r.montant : '';
  document.getElementById('recJour').value = r ? r.jour : '';
  document.getElementById('recNote').value = r ? r.note : '';
  document.getElementById('btnValiderRec').textContent = r ? 'Enregistrer' : 'Ajouter';
  document.getElementById('recSuppr').hidden = !r;
  majHintRec();
  document.getElementById('overlayRec').classList.add('actif');
  document.getElementById('recMontant').focus();
}
function fermerModalRec(){
  document.getElementById('overlayRec').classList.remove('actif');
  recurrenteEnEdition = null;
}

async function validerRec(){
  const cat = document.getElementById('recCat').value;
  const montant = parseFloat(document.getElementById('recMontant').value);
  const jour = parseInt(document.getElementById('recJour').value, 10);
  const note = document.getElementById('recNote').value.trim();
  if(!cat || !montantValide(montant)){ toast(MSG_MONTANT, 'alerte'); return; }
  if(!(jour >= 1 && jour <= 31)){ toast('Le jour doit être compris entre 1 et 31', 'alerte'); return; }
  if(recurrenteEnEdition){
    const r = recurrentes.find(x=>x.id===recurrenteEnEdition);
    if(r) Object.assign(r, { cat, montant, jour, note });
  } else {
    recurrentes.push({ id: nouvelId(), cat, montant, note, jour, dernierMois: dernierMoisInitial(jour) });
  }
  await sauvegarderTout();
  fermerModalRec();
  await appliquerRecurrentes();
  rendre();
}

async function supprimerRec(){
  if(!recurrenteEnEdition) return;
  if(!confirm('Supprimer cette récurrence ? Les dépenses déjà ajoutées sont conservées.')) return;
  recurrentes = recurrentes.filter(r=>r.id!==recurrenteEnEdition);
  await sauvegarderTout();
  fermerModalRec();
  rendre();
}
