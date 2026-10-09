document.getElementById('btnAnnuler').addEventListener('click', fermerModal);
document.getElementById('btnValider').addEventListener('click', validerAjout);
document.getElementById('overlay').addEventListener('click', e=>{ if(e.target.id==='overlay') fermerModal(); });
document.getElementById('inputMontant').addEventListener('keydown', e=>{ if(e.key==='Enter') validerAjout(); });

document.getElementById('btnAnnulerBudget').addEventListener('click', fermerModalBudget);
document.getElementById('btnValiderBudget').addEventListener('click', validerBudget);
document.getElementById('overlayBudget').addEventListener('click', e=>{ if(e.target.id==='overlayBudget') fermerModalBudget(); });
document.getElementById('inputBudget').addEventListener('keydown', e=>{ if(e.key==='Enter') validerBudget(); });
document.getElementById('btnSupprimerCat').addEventListener('click', ()=>{
  if(!categoriePourBudget) return;
  supprimerCategorie(categoriePourBudget);
});

document.getElementById('btnAjoutEntree').addEventListener('click', ouvrirModalEntree);
document.getElementById('btnAnnulerEntree').addEventListener('click', fermerModalEntree);
document.getElementById('btnValiderEntree').addEventListener('click', validerEntree);
document.getElementById('overlayEntree').addEventListener('click', e=>{ if(e.target.id==='overlayEntree') fermerModalEntree(); });
document.getElementById('inputEntreeMontant').addEventListener('keydown', e=>{ if(e.key==='Enter') validerEntree(); });

document.getElementById('btnAjoutEpargne').addEventListener('click', ouvrirModalEpargne);
document.getElementById('btnAnnulerEpargne').addEventListener('click', fermerModalEpargne);
document.getElementById('btnValiderEpargne').addEventListener('click', validerEpargne);
document.getElementById('overlayEpargne').addEventListener('click', e=>{ if(e.target.id==='overlayEpargne') fermerModalEpargne(); });
document.getElementById('inputEpargneMontant').addEventListener('keydown', e=>{ if(e.key==='Enter') validerEpargne(); });

document.getElementById('btnAjoutCat').addEventListener('click', ouvrirModalCategorie);
document.getElementById('btnAnnulerCat').addEventListener('click', fermerModalCategorie);
document.getElementById('btnValiderCat').addEventListener('click', validerCategorie);
document.getElementById('overlayCategorie').addEventListener('click', e=>{ if(e.target.id==='overlayCategorie') fermerModalCategorie(); });
document.getElementById('inputCatNom').addEventListener('keydown', e=>{ if(e.key==='Enter') validerCategorie(); });

document.getElementById('btnModifierGlobal').addEventListener('click', ouvrirModalGlobal);
document.getElementById('btnAnnulerGlobal').addEventListener('click', fermerModalGlobal);
document.getElementById('btnValiderGlobal').addEventListener('click', validerGlobal);
document.getElementById('overlayGlobal').addEventListener('click', e=>{ if(e.target.id==='overlayGlobal') fermerModalGlobal(); });
document.getElementById('inputGlobalMontant').addEventListener('keydown', e=>{ if(e.key==='Enter') validerGlobal(); });

document.getElementById('moisSelect').addEventListener('change', renderGraphiqueMois);
document.getElementById('moisSelect').addEventListener('click', function(){
  if(typeof this.showPicker === 'function'){
    try{ this.showPicker(); }catch(e){}
  }
});

document.getElementById('btnReset').addEventListener('click', async ()=>{
  if(depenses.length === 0) return;
  if(confirm('Supprimer TOUTES les dépenses, tous mois confondus ? Les budgets par poste sont conservés.')){
    const sauvegarde = depenses;
    depenses = [];
    await sauvegarderTout();
    rendre();
    annulable(sauvegarde.length + ' dépenses supprimées', ()=>{ depenses = sauvegarde.concat(depenses); }); // concat : garde aussi ce qui a été ajouté entre-temps
  }
});

document.getElementById('moisSelect').value = moisActuel();
renderGraphiqueMois();

document.getElementById('btnExportJson').addEventListener('click', ()=>exporterJSON());
document.getElementById('btnExportCsv').addEventListener('click', exporterCSV);
document.getElementById('btnImport').addEventListener('click', ()=>document.getElementById('inputImport').click());
document.getElementById('inputImport').addEventListener('change', e=>importerFichier(e.target.files[0]));

// Récurrences
document.getElementById('btnAjoutRec').addEventListener('click', ()=>ouvrirModalRec());
document.getElementById('btnAnnulerRec').addEventListener('click', fermerModalRec);
document.getElementById('btnValiderRec').addEventListener('click', validerRec);
document.getElementById('btnSupprimerRec').addEventListener('click', supprimerRec);
document.getElementById('overlayRec').addEventListener('click', e=>{ if(e.target.id==='overlayRec') fermerModalRec(); });
document.getElementById('recJour').addEventListener('input', majHintRec);

// Recherche et filtres de l'historique
document.getElementById('filtreQ').addEventListener('input', e=>{ filtreHisto.q = e.target.value; majOptionsFiltres(); renderHistoriqueDepenses(); });
document.getElementById('filtreCat').addEventListener('change', e=>{ filtreHisto.cat = e.target.value; renderHistoriqueDepenses(); });
document.getElementById('moisHistoPrec').addEventListener('click', ()=>changerMoisHisto(-1));
document.getElementById('moisHistoSuiv').addEventListener('click', ()=>changerMoisHisto(1));
document.getElementById('btnResetFiltres').addEventListener('click', reinitialiserFiltres);

// Objectif d'épargne
document.getElementById('btnAnnulerObjectif').addEventListener('click', fermerModalObjectif);
document.getElementById('btnValiderObjectif').addEventListener('click', validerObjectif);
document.getElementById('btnSupprimerObjectif').addEventListener('click', supprimerObjectif);
document.getElementById('overlayObjectif').addEventListener('click', e=>{ if(e.target.id==='overlayObjectif') fermerModalObjectif(); });
document.getElementById('btnRappelSauvegarde').addEventListener('click', ()=>exporterJSON());
