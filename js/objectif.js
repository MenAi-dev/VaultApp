// Objectif d'épargne : montant cible + date, avec progression et effort mensuel nécessaire.

function moisRestantsJusqua(dateIso){
  const jours = Math.ceil((new Date(dateIso + 'T00:00:00') - new Date(auj() + 'T00:00:00')) / 86400000);
  return jours <= 0 ? 0 : Math.max(1, Math.ceil(jours / 30.4375));
}

// Moyenne mensuelle épargnée sur les 3 derniers mois (mois en cours inclus).
function moyenneEpargne3Mois(){
  const mois = [0, -1, -2].map(d=>moisDecale(moisActuel(), d));
  const total = epargnes.filter(e=>mois.some(m=>(e.date || '').startsWith(m))).reduce((s,e)=>s+e.montant, 0);
  return total / 3;
}

let objectifAtteintAvant = null; // null = pas encore évalué (1re ouverture)

function renderObjectif(){
  const zone = document.getElementById('objectifBody');
  if(!zone) return;
  if(!objectifEpargne){
    objectifAtteintAvant = null;
    zone.innerHTML = '<button type="button" class="cat-btn" id="btnDefinirObjectif">+ Définir un objectif d\'épargne</button>';
    document.getElementById('btnDefinirObjectif').addEventListener('click', ()=>ouvrirModalObjectif());
    return;
  }
  const o = objectifEpargne;
  const total = situation().epargneNette;
  const pct = Math.min(100, total / o.cible * 100);
  const reste = Math.max(0, o.cible - total);
  const mois = moisRestantsJusqua(o.date);
  const dateLibelle = new Date(o.date + 'T00:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

  // Fête l'objectif quand il vient d'être atteint (jamais à l'ouverture de l'application).
  const atteint = total >= o.cible;
  if(objectifAtteintAvant === false && atteint){
    setTimeout(()=>confettis(document.querySelector('#objectifBody .objectif'), [couleurTheme('--epargne'), couleurTheme('--sain'), '#FFD166', '#FFFFFF']), 300);
    toast('Objectif atteint, félicitations !', 'epargne');
  }
  objectifAtteintAvant = atteint;

  let lignes = '';
  if(total >= o.cible){
    lignes = '<div class="objectif-ligne ok">Objectif atteint.</div>';
  } else if(mois === 0){
    lignes = '<div class="objectif-ligne mal">Échéance dépassée : il reste ' + fmt(reste) + ' FCFA.</div>';
  } else {
    const besoin = reste / mois;
    lignes = '<div class="objectif-ligne">Il faut épargner environ <b>' + fmt(besoin) + ' FCFA par mois</b> ('
      + mois + ' mois restant' + (mois > 1 ? 's' : '') + ').</div>';
    const moy = moyenneEpargne3Mois();
    if(moy > 0){
      lignes += moy >= besoin
        ? '<div class="objectif-ligne ok">Ton rythme (' + fmt(moy) + ' FCFA/mois sur 3 mois) suffit.</div>'
        : '<div class="objectif-ligne mal">Ton rythme (' + fmt(moy) + ' FCFA/mois sur 3 mois) est insuffisant : il manque environ ' + fmt(besoin - moy) + ' FCFA/mois.</div>';
    }
  }
  zone.innerHTML = `
    <div class="objectif">
      <div class="objectif-head">
        <div class="objectif-nom">${esc(o.nom || 'Objectif d\'épargne')}<span class="objectif-date">avant le ${dateLibelle}</span></div>
        <button type="button" class="modif-btn" id="btnModifierObjectif" title="Modifier l'objectif">✎</button>
      </div>
      <div class="objectif-montants"><b>${fmt(total)}</b> / ${fmt(o.cible)} FCFA · ${Math.round(pct)} %</div>
      <div class="barre"><div class="barre-fill" style="width:${pct}%; background:${total >= o.cible ? 'var(--sain)' : 'var(--epargne)'}"></div></div>
      ${lignes}
    </div>`;
  document.getElementById('btnModifierObjectif').addEventListener('click', ()=>ouvrirModalObjectif());
}

function ouvrirModalObjectif(){
  const o = objectifEpargne;
  document.getElementById('objTitre').textContent = o ? "Modifier l'objectif" : "Nouvel objectif d'épargne";
  document.getElementById('objNom').value = o ? o.nom : '';
  document.getElementById('objCible').value = o ? o.cible : '';
  document.getElementById('objDate').value = o ? o.date : '';
  document.getElementById('btnValiderObjectif').textContent = o ? 'Enregistrer' : 'Créer';
  document.getElementById('objSuppr').hidden = !o;
  document.getElementById('overlayObjectif').classList.add('actif');
  document.getElementById('objCible').focus();
}
function fermerModalObjectif(){
  document.getElementById('overlayObjectif').classList.remove('actif');
}
async function validerObjectif(){
  const nom = document.getElementById('objNom').value.trim().slice(0, 40);
  const cible = parseFloat(document.getElementById('objCible').value);
  const date = document.getElementById('objDate').value;
  if(!montantValide(cible)){ toast(MSG_MONTANT, 'alerte'); return; }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= auj()){ toast("Choisis une date d'échéance à venir", 'alerte'); return; }
  objectifEpargne = { nom, cible, date };
  await sauvegarderTout();
  fermerModalObjectif();
  rendre();
}
async function supprimerObjectif(){
  if(!objectifEpargne) return;
  if(!confirm("Supprimer cet objectif ? Ton épargne enregistrée n'est pas touchée.")) return;
  objectifEpargne = null;
  await sauvegarderTout();
  fermerModalObjectif();
  rendre();
}
