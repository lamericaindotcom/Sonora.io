// ===== PRESET MANAGEMENT =====

/**
 * Récupère l'état actuel de tous les paramètres du synthétiseur
 * @returns {Object} Objet contenant tous les paramètres
 */
function getCurrentPresetData() {
  const w1 = document.querySelector('input[name="wave1"]:checked');
  const w2 = document.querySelector('input[name="wave2"]:checked');

  return {
    osc1: {
      volume: state.vol1,
      fine: state.fine1,
      semi: state.semi1,
      tune: state.tune1,
      octave: state.octave1,
      waveform: w1 ? w1.value : 'sawtooth'
    },
    osc2: {
      volume: state.vol2,
      fine: state.fine2,
      semi: state.semi2,
      tune: state.tune2,
      octave: state.octave2,
      waveform: w2 ? w2.value : 'sawtooth'
    },
    filter: {
      frequency: state.filterFreq,
      Q: state.filterQ,
      bypassed: filterBypassed || false
    },
    sync: syncOn || false
  };
}


/**
 * Charge les paramètres d'un preset dans le synthétiseur
 * @param {Object} presetData - Objet contenant les paramètres du preset
 */
function loadPresetData(presetData) {
  console.log('📥 Preset reçu:', presetData);
  
  // ===== OSCILLATEUR 1 =====
  state.vol1    = presetData.osc1?.volume ?? state.vol1;
  state.fine1   = presetData.osc1?.fine   ?? 0;
  state.semi1   = presetData.osc1?.semi   ?? 0;
  state.tune1   = presetData.osc1?.tune   ?? 0;
  state.octave1 = presetData.osc1?.octave ?? 0;

  // ===== OSCILLATEUR 2 =====
  state.vol2    = presetData.osc2?.volume ?? state.vol2;
  state.fine2   = presetData.osc2?.fine   ?? 0;
  state.semi2   = presetData.osc2?.semi   ?? 0;
  state.tune2   = presetData.osc2?.tune   ?? 0;
  state.octave2 = presetData.osc2?.octave ?? 0;

  // ===== FILTRE =====
  state.filterFreq = presetData.filter?.frequency ?? 800;
  state.filterQ    = presetData.filter?.Q         ?? 1.2;
  filterBypassed   = presetData.filter?.bypassed  ?? false;

  // ===== SYNC =====
  syncOn = presetData.sync ?? false;

  // ===== METTRE À JOUR LES GAINS AUDIO =====
  if (gain1) gain1.gain.value = state.vol1;
  if (gain2) gain2.gain.value = state.vol2;

  // ===== METTRE À JOUR LE FILTRE AUDIO =====
  filterNode.frequency.value = state.filterFreq;
  filterNode.Q.value = state.filterQ;
  filterNeedsRedraw = true;

  // Reconnecter gain/filtre selon bypass
  if (gain1 && gain2) {
    gain1.disconnect();
    gain2.disconnect();
    if (filterBypassed) {
      gain1.connect(audioCtx.destination);
      gain2.connect(audioCtx.destination);
    } else {
      gain1.connect(filterNode);
      gain2.connect(filterNode);
      filterNode.connect(audioCtx.destination);
    }
  }

  // ===== OSC 1 UI =====
  const vol1Range     = document.getElementById('volume1-range');
  const vol1Canvas    = document.getElementById('volume1');
  if (vol1Range && vol1Canvas) {
    vol1Range.value = state.vol1;
    knobDrawer(vol1Canvas, (state.vol1 - vol1Range.min) / (vol1Range.max - vol1Range.min));
  }

  const fine1Range    = document.getElementById('fine1-range');
  const fine1Canvas   = document.getElementById('fine1');
  if (fine1Range && fine1Canvas) {
    fine1Range.value = state.fine1;
    knobDrawer(fine1Canvas, (state.fine1 - fine1Range.min) / (fine1Range.max - fine1Range.min));
  }

  const semi1Range    = document.getElementById('semi1-range');
  const semi1Canvas   = document.getElementById('semi1');
  if (semi1Range && semi1Canvas) {
    semi1Range.value = state.semi1;
    knobDrawer(semi1Canvas, (state.semi1 - semi1Range.min) / (semi1Range.max - semi1Range.min));
  }

  const tune1Range    = document.getElementById('tune1-range');
  const tune1Canvas   = document.getElementById('tune1');
  if (tune1Range && tune1Canvas) {
    tune1Range.value = state.tune1;
    knobDrawer(tune1Canvas, (state.tune1 - tune1Range.min) / (tune1Range.max - tune1Range.min));
  }

  const octave1Range  = document.getElementById('octave1-range');
  const octave1Canvas = document.getElementById('octave1');
  if (octave1Range && octave1Canvas) {
    octave1Range.value = state.octave1;
    knobDrawer(octave1Canvas, (state.octave1 - octave1Range.min) / (octave1Range.max - octave1Range.min));
  }

  // ===== OSC 2 UI =====
  const vol2Range     = document.getElementById('volume2-range');
  const vol2Canvas    = document.getElementById('volume2');
  if (vol2Range && vol2Canvas) {
    vol2Range.value = state.vol2;
    knobDrawer(vol2Canvas, (state.vol2 - vol2Range.min) / (vol2Range.max - vol2Range.min));
  }

  const fine2Range    = document.getElementById('fine2-range');
  const fine2Canvas   = document.getElementById('fine2');
  if (fine2Range && fine2Canvas) {
    fine2Range.value = state.fine2;
    knobDrawer(fine2Canvas, (state.fine2 - fine2Range.min) / (fine2Range.max - fine2Range.min));
  }

  const semi2Range    = document.getElementById('semi2-range');
  const semi2Canvas   = document.getElementById('semi2');
  if (semi2Range && semi2Canvas) {
    semi2Range.value = state.semi2;
    knobDrawer(semi2Canvas, (state.semi2 - semi2Range.min) / (semi2Range.max - semi2Range.min));
  }

  const tune2Range    = document.getElementById('tune2-range');
  const tune2Canvas   = document.getElementById('tune2');
  if (tune2Range && tune2Canvas) {
    tune2Range.value = state.tune2;
    knobDrawer(tune2Canvas, (state.tune2 - tune2Range.min) / (tune2Range.max - tune2Range.min));
  }

  const octave2Range  = document.getElementById('octave2-range');
  const octave2Canvas = document.getElementById('octave2');
  if (octave2Range && octave2Canvas) {
    octave2Range.value = state.octave2;
    knobDrawer(octave2Canvas, (state.octave2 - octave2Range.min) / (octave2Range.max - octave2Range.min));
  }

  // ===== FORMES D'ONDE =====
  if (presetData.osc1?.waveform) {
    const wave1Radio = document.querySelector(
      `input[name="wave1"][value="${presetData.osc1.waveform}"]`
    );
    if (wave1Radio) wave1Radio.checked = true;
  }

  if (presetData.osc2?.waveform) {
    const wave2Radio = document.querySelector(
      `input[name="wave2"][value="${presetData.osc2.waveform}"]`
    );
    if (wave2Radio) wave2Radio.checked = true;
  }

  // Appliquer les formes d'onde aux oscillateurs si déjà créés
  //updateWaveforms();

    // Appliquer aux oscillateurs (audio)
  adsr.setOscillatorSettings({
    waveform1: presetData.osc1?.waveform || 'sawtooth',
    waveform2: presetData.osc2?.waveform || 'sawtooth',
    vol1: state.vol1,
    vol2: state.vol2,
    fine1: state.fine1,
    fine2: state.fine2,
    semi1: state.semi1,
    semi2: state.semi2,
    octave1: state.octave1,q,
    octave2: state.octave2,
    sync: syncOn
  });


  // ===== FILTRE UI =====
  const freqRange         = document.getElementById('freq-range');
  const freqValDisplay    = document.getElementById('freq-val');
  const filterFreqCanvas  = document.getElementById('filterFreq');
  if (freqRange && filterFreqCanvas) {
    freqRange.value = state.filterFreq;
    knobDrawer(filterFreqCanvas, (state.filterFreq - freqRange.min) / (freqRange.max - freqRange.min));
    if (freqValDisplay) freqValDisplay.textContent = `${Math.round(state.filterFreq)} Hz`;
  }

  const qRange        = document.getElementById('q-range');
  const qValDisplay   = document.getElementById('q-val');
  const filterQCanvas = document.getElementById('filterQ');
  if (qRange && filterQCanvas) {
    qRange.value = state.filterQ;
    knobDrawer(filterQCanvas, (state.filterQ - qRange.min) / (qRange.max - qRange.min));
    if (qValDisplay) qValDisplay.textContent = state.filterQ.toFixed(1);
  }

  // ===== SYNC / BYPASS UI =====
  const syncToggleEl = document.getElementById('sync-toggle');
  if (syncToggleEl) syncToggleEl.checked = syncOn;

  const filterBypassEl = document.getElementById('filter-bypass');
  if (filterBypassEl) filterBypassEl.checked = filterBypassed;

  // ===== REDESSINER & RECALCULER =====
  updateOscFreqs();
  filterNeedsRedraw = true;

  console.log('✅ Preset chargé avec succès !', state);
}


/**
 * Sauvegarde un preset dans la base de données
 */
async function savePreset() {
  const presetName = document.getElementById('presetName')?.value.trim();

  if (!presetName) {
    alert('⚠️ Veuillez entrer un nom pour le preset');
    return;
  }

  const presetData = getCurrentPresetData();

  try {
    const response = await fetch('Api/save_preset.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: presetName,
        description: 'Preset créé le ' + new Date().toLocaleString('fr-FR'),
        data: presetData
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('✅ Preset "' + presetName + '" sauvegardé !');
      document.getElementById('presetName').value = '';
      console.log('Preset ID:', result.preset_id);
    } else {
      alert('❌ Erreur: ' + result.error);
      console.error('Erreur sauvegarde:', result.error);
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Récupère la liste des presets depuis la BDD et les affiche
 */
async function listPresets() {
  try {
    const response = await fetch('Api/list_presets.php');
    const result = await response.json();

    if (result.success) {
      const select = document.getElementById('presetsSelect');
      if (!select) {
        alert('❌ Élément #presetsSelect non trouvé');
        return;
      }

      select.innerHTML = '<option value="">-- Sélectionnez un preset --</option>';

      if (result.presets.length === 0) {
        select.innerHTML += '<option disabled>Aucun preset disponible</option>';
      } else {
        result.presets.forEach(preset => {
          const option = document.createElement('option');
          option.value = preset.id;
          const date = new Date(preset.updated_at).toLocaleDateString('fr-FR');
          option.textContent = preset.name + ' (' + date + ')';
          select.appendChild(option);
        });
      }

      document.getElementById('presetsList').style.display = 'block';
      console.log('✅ Liste des presets chargée');
    } else {
      alert('❌ Erreur: ' + result.error);
      console.error('Erreur liste:', result.error);
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Charge un preset sélectionné depuis la liste
 */
async function loadPreset() {
  const presetId = document.getElementById('presetsSelect')?.value;

  if (!presetId) {
    alert('⚠️ Veuillez sélectionner un preset');
    return;
  }

  try {
    const response = await fetch('Api/load_preset.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: presetId })
    });

    const result = await response.json();

    if (result.success) {
      loadPresetData(result.preset.data);
      alert('✅ Preset "' + result.preset.name + '" chargé !');
      document.getElementById('presetsList').style.display = 'none';
      console.log('Preset chargé:', result.preset.name);
    } else {
      alert('❌ Erreur: ' + result.error);
      console.error('Erreur chargement:', result.error);
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Supprime un preset sélectionné
 */
async function deletePreset() {
  const presetId = document.getElementById('presetsSelect')?.value;
  const presetName = document.getElementById('presetsSelect')?.selectedOptions[0]?.text;

  if (!presetId) {
    alert('⚠️ Veuillez sélectionner un preset');
    return;
  }

  if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer "' + presetName + '" ?')) {
    return;
  }

  try {
    const response = await fetch('Api/delete_preset.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: presetId })
    });

    const result = await response.json();

    if (result.success) {
      alert('✅ Preset supprimé !');
      console.log('Preset supprimé:', presetId);
      await listPresets(); // Rafraîchir la liste
    } else {
      alert('❌ Erreur: ' + result.error);
      console.error('Erreur suppression:', result.error);
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Ferme la fenêtre de liste des presets
 */
function closePresetsList() {
  const presetsList = document.getElementById('presetsList');
  if (presetsList) {
    presetsList.style.display = 'none';
  }
}

/**
 * Initialise les event listeners pour les presets (modal version)
 */
function initPresetListeners() {
  const presetsMenuBtn = document.getElementById('presetsMenuBtn');
  const closeBtn = document.getElementById('closePresetsModal');
  const overlay = document.getElementById('presetsOverlay');
  const modal = document.getElementById('presetsModal');
  
  const saveBtn = document.getElementById('savePresetBtn');
  const listBtn = document.getElementById('listPresetsBtn');
  const loadBtn = document.getElementById('loadPresetBtn');
  const deleteBtn = document.getElementById('deletePresetBtn');

  // Ouvrir le modal
  if (presetsMenuBtn) {
    presetsMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
      overlay.classList.add('active');
    });
  }

  // Fermer le modal
  function closeModal() {
    modal.classList.remove('active');
    overlay.classList.remove('active');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  // Fermer au clic sur Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Event listeners pour les presets
  if (saveBtn) saveBtn.addEventListener('click', savePreset);
  if (listBtn) listBtn.addEventListener('click', listPresets);
  if (loadBtn) loadBtn.addEventListener('click', loadPreset);
  if (deleteBtn) deleteBtn.addEventListener('click', deletePreset);

  console.log('✅ Preset modal listeners initialisés');
}

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', initPresetListeners);


// Initialiser les listeners au chargement du DOM
document.addEventListener('DOMContentLoaded', initPresetListeners);