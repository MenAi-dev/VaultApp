// Sécurité : sauvegarde chiffrée par mot de passe, verrouillage par code PIN, récupération de données.
// Le chiffrement utilise l'API native du navigateur (Web Crypto) : PBKDF2-SHA256 + AES-256-GCM.

const CLE_PIN = 'budgetPin';
const CLE_PIN_ESSAIS = 'budgetPinEssais';
const ITER_CHIFFREMENT = 250000;
const ITER_PIN = 150000;
const PIN_MIN = 4, PIN_MAX = 8;
const DELAI_VERROU_MS = 60000; // verrouillage après une minute hors de l'application

const cryptoDispo = () => !!(window.crypto && crypto.subtle); // absent hors connexion sécurisée (https / localhost)
const encodeur = new TextEncoder(), decodeur = new TextDecoder();
const versB64 = buf => { let s = ''; new Uint8Array(buf).forEach(b=>{ s += String.fromCharCode(b); }); return btoa(s); };
const depuisB64 = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const lire = cle => { try{ return localStorage.getItem(cle); }catch(e){ return null; } };
const ecrire = (cle, val) => { try{ localStorage.setItem(cle, val); return true; }catch(e){ return false; } };
const effacer = cle => { try{ localStorage.removeItem(cle); }catch(e){} };

// ---------- Chiffrement des sauvegardes ----------

async function deriverCle(mdp, sel, iter){
  const base = await crypto.subtle.importKey('raw', encodeur.encode(mdp), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt:sel, iterations:iter, hash:'SHA-256' }, base,
    { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
}

async function chiffrerTexte(texte, mdp){
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cle = await deriverCle(mdp, sel, ITER_CHIFFREMENT);
  const chiffre = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, cle, encodeur.encode(texte));
  return { app:'mon-budget', chiffre:true, version:1, kdf:'PBKDF2-SHA256', iter:ITER_CHIFFREMENT,
    sel:versB64(sel), iv:versB64(iv), donnees:versB64(chiffre) };
}

async function dechiffrerPaquet(p, mdp){
  const valide = p && typeof p.sel === 'string' && typeof p.iv === 'string' && typeof p.donnees === 'string'
    && Number.isInteger(p.iter) && p.iter >= 100000 && p.iter <= 2000000; // bornes : évite un fichier qui bloquerait le téléphone
  if(!valide) throw new Error("Ce fichier chiffré n'est pas valide.");
  try{
    const cle = await deriverCle(mdp, depuisB64(p.sel), p.iter);
    const clair = await crypto.subtle.decrypt({ name:'AES-GCM', iv:depuisB64(p.iv) }, cle, depuisB64(p.donnees));
    return decodeur.decode(clair);
  }catch(e){
    throw new Error('Mot de passe incorrect, ou fichier abîmé.');
  }
}

// ---------- Fenêtre de saisie secrète (mot de passe ou code PIN) ----------

let secretResolve = null, secretOpts = null;
const elSecret = id => document.getElementById(id);

// Renvoie une promesse : le texte saisi, ou null si la personne annule.
function demanderSecret(opts){
  return new Promise(resolve=>{
    if(secretResolve) secretResolve(null);
    secretResolve = resolve;
    secretOpts = opts;
    elSecret('secretTitre').textContent = opts.titre || '';
    elSecret('secretSub').textContent = opts.sub || '';
    elSecret('secretLabel').textContent = opts.label || '';
    const champs = [elSecret('secretInput'), elSecret('secretInput2')];
    champs.forEach(c=>{
      c.value = '';
      c.inputMode = opts.pin ? 'numeric' : 'text';
      c.maxLength = opts.pin ? PIN_MAX : 128;
    });
    elSecret('secretChamp2').hidden = !opts.confirmer;
    elSecret('secretErreur').textContent = '';
    elSecret('overlaySecret').classList.add('actif');
    champs[0].focus();
  });
}
function fermerSecret(valeur){
  elSecret('overlaySecret').classList.remove('actif');
  elSecret('secretInput').value = '';
  elSecret('secretInput2').value = '';
  const r = secretResolve;
  secretResolve = null;
  if(r) r(valeur);
}
function validerSecret(){
  const o = secretOpts || {};
  const v = elSecret('secretInput').value;
  const erreur = m => { elSecret('secretErreur').textContent = m; };
  if(o.pin){
    if(!/^\d+$/.test(v) || v.length < PIN_MIN || v.length > PIN_MAX) return erreur('Le code doit contenir ' + PIN_MIN + ' à ' + PIN_MAX + ' chiffres.');
  } else if(o.min && v.length < o.min){
    return erreur('Au moins ' + o.min + ' caractères.');
  } else if(!v){
    return erreur('Saisis le mot de passe.');
  }
  if(o.confirmer && v !== elSecret('secretInput2').value) return erreur('Les deux saisies ne sont pas identiques.');
  fermerSecret(v);
}

// ---------- Sauvegarde chiffrée ----------

async function exporterChiffre(){
  if(!cryptoDispo()){
    toast("Le chiffrement n'est pas disponible ici (il faut une connexion sécurisée, en https).", 'danger');
    return;
  }
  const mdp = await demanderSecret({
    titre: 'Sauvegarde chiffrée',
    sub: 'Choisis un mot de passe. Sans lui, le fichier est illisible : ni toi ni personne ne pourra le récupérer.',
    label: 'Mot de passe (8 caractères minimum)', confirmer: true, min: 8
  });
  if(mdp == null) return;
  await exporterJSON(mdp);
}

// ---------- Code PIN ----------

const pinActif = () => !!lire(CLE_PIN);

async function empreintePin(pin, sel, iter){
  const base = await crypto.subtle.importKey('raw', encodeur.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return versB64(await crypto.subtle.deriveBits({ name:'PBKDF2', salt:sel, iterations:iter, hash:'SHA-256' }, base, 256));
}

function etatEssais(){
  try{ const e = JSON.parse(lire(CLE_PIN_ESSAIS)); if(e && typeof e.n === 'number') return e; }catch(e){}
  return { n:0, jusqua:0 };
}

// Après 5 erreurs, attente de plus en plus longue (30 s, 1 min, 2 min… jusqu'à 15 min).
async function tenterPin(pin){
  const e = etatEssais();
  if(e.jusqua > Date.now()) return { ok:false, attente: Math.ceil((e.jusqua - Date.now()) / 1000) };
  let p = null;
  try{ p = JSON.parse(lire(CLE_PIN)); }catch(err){}
  if(!p) return { ok:true };
  if(await empreintePin(pin, depuisB64(p.sel), p.iter) === p.hash){ effacer(CLE_PIN_ESSAIS); return { ok:true }; }
  e.n++;
  if(e.n >= 5) e.jusqua = Date.now() + Math.min(900000, 30000 * Math.pow(2, e.n - 5));
  ecrire(CLE_PIN_ESSAIS, JSON.stringify(e));
  return { ok:false, attente: e.jusqua > Date.now() ? Math.ceil((e.jusqua - Date.now()) / 1000) : 0 };
}

const messageEchecPin = r => r.attente ? 'Trop d\'essais. Réessaie dans ' + r.attente + ' s.' : 'Code incorrect.';

async function confirmerPinActuel(){
  const pin = await demanderSecret({ titre:'Code PIN actuel', label:'Code PIN', pin:true });
  if(pin == null) return false;
  const r = await tenterPin(pin);
  if(!r.ok) toast(messageEchecPin(r), 'danger');
  return r.ok;
}

function majInfoVerrou(){
  const actif = pinActif();
  elSecret('infoVerrou').textContent = actif ? 'Verrouillage activé.' : 'Aucun code défini : l\'application s\'ouvre directement.';
  elSecret('btnPinDefinir').textContent = actif ? 'Changer le code' : 'Définir un code PIN';
  elSecret('btnPinRetirer').hidden = !actif;
}

async function definirPin(){
  if(!cryptoDispo()){
    toast("Le code PIN n'est pas disponible ici (il faut une connexion sécurisée, en https).", 'danger');
    return;
  }
  const modif = pinActif();
  if(modif && !(await confirmerPinActuel())) return;
  const pin = await demanderSecret({
    titre: modif ? 'Nouveau code PIN' : 'Définir un code PIN',
    sub: PIN_MIN + ' à ' + PIN_MAX + ' chiffres, demandés à l\'ouverture de l\'application.',
    label:'Code PIN', pin:true, confirmer:true
  });
  if(pin == null) return;
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const hash = await empreintePin(pin, sel, ITER_PIN);
  if(!ecrire(CLE_PIN, JSON.stringify({ sel:versB64(sel), iter:ITER_PIN, hash }))){
    toast("Impossible d'enregistrer le code (stockage plein ou bloqué).", 'danger');
    return;
  }
  effacer(CLE_PIN_ESSAIS);
  majInfoVerrou();
  toast('Code PIN enregistré');
}

async function retirerPin(){
  if(!(await confirmerPinActuel())) return;
  effacer(CLE_PIN);
  effacer(CLE_PIN_ESSAIS);
  majInfoVerrou();
  toast('Verrouillage désactivé');
}

// ---------- Écran de verrouillage ----------

function verrouiller(){
  if(secretResolve) fermerSecret(null);
  document.documentElement.classList.add('verrouille');
  elSecret('verrouInput').value = '';
  elSecret('verrouErreur').textContent = '';
  elSecret('verrouInput').focus();
}
function deverrouiller(){
  document.documentElement.classList.remove('verrouille');
  elSecret('verrouInput').value = '';
  elSecret('verrouErreur').textContent = '';
}
async function soumettreVerrou(){
  const pin = elSecret('verrouInput').value;
  if(!pin) return;
  let r;
  try{ r = await tenterPin(pin); }
  catch(e){ elSecret('verrouErreur').textContent = 'Vérification impossible ici (connexion non sécurisée).'; return; }
  elSecret('verrouInput').value = '';
  if(r.ok) deverrouiller();
  else elSecret('verrouErreur').textContent = messageEchecPin(r);
}

// Code oublié : la seule issue est d'effacer les données de l'appareil, puis de restaurer une sauvegarde.
function codeOublie(){
  if(!confirm("Code oublié ?\n\nLa seule solution est d'EFFACER toutes les données de cet appareil, puis de restaurer ta dernière sauvegarde (fichier).\n\nEffacer maintenant ?")) return;
  [CLE_STOCKAGE, CLE_PIN, CLE_PIN_ESSAIS, CLE_AVANT_IMPORT, CLE_SECOURS_CORROMPU, CLE_DERNIER_EXPORT].forEach(effacer);
  location.reload();
}

// Reverrouille après une minute hors de l'application (changement d'onglet, téléphone en veille…).
let masqueLe = 0;
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){ masqueLe = Date.now(); return; }
  if(pinActif() && masqueLe && Date.now() - masqueLe > DELAI_VERROU_MS) verrouiller();
});

// ---------- Récupération de données ----------

function majZoneSecours(){
  const avant = !!lire(CLE_AVANT_IMPORT), illisible = !!lire(CLE_SECOURS_CORROMPU);
  elSecret('btnRecupAvantImport').hidden = !avant;
  elSecret('btnRecupCorrompu').hidden = !illisible;
  elSecret('zoneSecours').hidden = !(avant || illisible);
}

async function recupererAvantImport(){
  const avant = lire(CLE_AVANT_IMPORT);
  if(!avant) return;
  if(!confirm("Revenir à l'état d'avant la dernière restauration ?\n\nLes données actuelles seront remplacées (une copie est gardée, tu pourras revenir en arrière).")) return;
  const actuel = lire(CLE_STOCKAGE);
  if(!ecrire(CLE_STOCKAGE, avant)){ toast('Impossible de restaurer (stockage plein ou bloqué).', 'danger'); return; }
  if(actuel) ecrire(CLE_AVANT_IMPORT, actuel); // échange : l'opération reste réversible
  await chargerTout();
  rendre();
  toast('État précédent récupéré');
}

function telechargerIllisible(){
  const brut = lire(CLE_SECOURS_CORROMPU);
  if(!brut) return;
  telecharger('mon-budget-donnees-illisibles-' + auj() + '.txt', brut, 'text/plain;charset=utf-8');
}

// ---------- Branchements ----------

elSecret('btnAnnulerSecret').addEventListener('click', ()=>fermerSecret(null));
elSecret('btnValiderSecret').addEventListener('click', validerSecret);
elSecret('overlaySecret').addEventListener('click', e=>{ if(e.target.id === 'overlaySecret') fermerSecret(null); });
['secretInput', 'secretInput2'].forEach(id=>elSecret(id).addEventListener('keydown', e=>{ if(e.key === 'Enter') validerSecret(); }));

elSecret('btnExportChiffre').addEventListener('click', exporterChiffre);
elSecret('btnPinDefinir').addEventListener('click', definirPin);
elSecret('btnPinRetirer').addEventListener('click', retirerPin);
elSecret('btnDeverrouiller').addEventListener('click', soumettreVerrou);
elSecret('verrouInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') soumettreVerrou(); });
elSecret('btnCodeOublie').addEventListener('click', codeOublie);
elSecret('btnRecupAvantImport').addEventListener('click', recupererAvantImport);
elSecret('btnRecupCorrompu').addEventListener('click', telechargerIllisible);

majInfoVerrou();
majZoneSecours();
if(pinActif()) elSecret('verrouInput').focus();
