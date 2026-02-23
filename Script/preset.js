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
  if (typeof filterBypassed !== 'undefined') {
    filterBypassed = presetData.filter?.bypassed ?? false;
  }

  // ===== SYNC =====
  if (typeof syncOn !== 'undefined') {
    syncOn = presetData.sync ?? false;
  }

  // ===== METTRE À JOUR LES GAINS AUDIO =====
  if (typeof gain1 !== 'undefined' && gain1) {
    gain1.gain.value = state.vol1;
  }
  if (typeof gain2 !== 'undefined' && gain2) {
    gain2.gain.value = state.vol2;
  }

  // ===== METTRE À JOUR LE FILTRE AUDIO =====
  if (typeof filterNode !== 'undefined' && filterNode) {
    filterNode.frequency.value = state.filterFreq;
    filterNode.Q.value = state.filterQ;
  }
  if (typeof filterNeedsRedraw !== 'undefined') {
    filterNeedsRedraw = true;
  }

  // ===== ROUTING gain/filtre selon bypass =====
  const hasGains = (typeof gain1 !== 'undefined' && gain1) && (typeof gain2 !== 'undefined' && gain2);
  const hasAudio = (typeof audioCtx !== 'undefined' && audioCtx)
                && (typeof filterNode !== 'undefined' && filterNode);

  if (hasGains && hasAudio) {
    try { gain1.disconnect(); } catch {}
    try { gain2.disconnect(); } catch {}

    if (typeof filterBypassed !== 'undefined' && filterBypassed) {
      gain1.connect(audioCtx.destination);
      gain2.connect(audioCtx.destination);
    } else {
      gain1.connect(filterNode);
      gain2.connect(filterNode);

      // évite les doubles connexions
      try { filterNode.disconnect(); } catch {}
      filterNode.connect(audioCtx.destination);
    }
  } else {
    console.warn('Audio nodes non prêts (gain1/gain2/filterNode/audioCtx). Application du preset limitée au state/UI.');
  }

  // ===== UI OSC 1 =====
  const vol1Range  = document.getElementById('volume1-range');
  const vol1Canvas = document.getElementById('volume1');
  if (vol1Range && vol1Canvas && typeof knobDrawer === 'function') {
    vol1Range.value = state.vol1;
    knobDrawer(vol1Canvas, (state.vol1 - vol1Range.min) / (vol1Range.max - vol1Range.min));
  }

  const fine1Range  = document.getElementById('fine1-range');
  const fine1Canvas = document.getElementById('fine1');
  if (fine1Range && fine1Canvas && typeof knobDrawer === 'function') {
    fine1Range.value = state.fine1;
    knobDrawer(fine1Canvas, (state.fine1 - fine1Range.min) / (fine1Range.max - fine1Range.min));
  }

  const semi1Range  = document.getElementById('semi1-range');
  const semi1Canvas = document.getElementById('semi1');
  if (semi1Range && semi1Canvas && typeof knobDrawer === 'function') {
    semi1Range.value = state.semi1;
    knobDrawer(semi1Canvas, (state.semi1 - semi1Range.min) / (semi1Range.max - semi1Range.min));
  }

  const tune1Range  = document.getElementById('tune1-range');
  const tune1Canvas = document.getElementById('tune1');
  if (tune1Range && tune1Canvas && typeof knobDrawer === 'function') {
    tune1Range.value = state.tune1;
    knobDrawer(tune1Canvas, (state.tune1 - tune1Range.min) / (tune1Range.max - tune1Range.min));
  }

  const octave1Range  = document.getElementById('octave1-range');
  const octave1Canvas = document.getElementById('octave1');
  if (octave1Range && octave1Canvas && typeof knobDrawer === 'function') {
    octave1Range.value = state.octave1;
    knobDrawer(octave1Canvas, (state.octave1 - octave1Range.min) / (octave1Range.max - octave1Range.min));
  }

  // ===== UI OSC 2 =====
  const vol2Range  = document.getElementById('volume2-range');
  const vol2Canvas = document.getElementById('volume2');
  if (vol2Range && vol2Canvas && typeof knobDrawer === 'function') {
    vol2Range.value = state.vol2;
    knobDrawer(vol2Canvas, (state.vol2 - vol2Range.min) / (vol2Range.max - vol2Range.min));
  }

  const fine2Range  = document.getElementById('fine2-range');
  const fine2Canvas = document.getElementById('fine2');
  if (fine2Range && fine2Canvas && typeof knobDrawer === 'function') {
    fine2Range.value = state.fine2;
    knobDrawer(fine2Canvas, (state.fine2 - fine2Range.min) / (fine2Range.max - fine2Range.min));
  }

  const semi2Range  = document.getElementById('semi2-range');
  const semi2Canvas = document.getElementById('semi2');
  if (semi2Range && semi2Canvas && typeof knobDrawer === 'function') {
    semi2Range.value = state.semi2;
    knobDrawer(semi2Canvas, (state.semi2 - semi2Range.min) / (semi2Range.max - semi2Range.min));
  }

  const tune2Range  = document.getElementById('tune2-range');
  const tune2Canvas = document.getElementById('tune2');
  if (tune2Range && tune2Canvas && typeof knobDrawer === 'function') {
    tune2Range.value = state.tune2;
    knobDrawer(tune2Canvas, (state.tune2 - tune2Range.min) / (tune2Range.max - tune2Range.min));
  }

  const octave2Range  = document.getElementById('octave2-range');
  const octave2Canvas = document.getElementById('octave2');
  if (octave2Range && octave2Canvas && typeof knobDrawer === 'function') {
    octave2Range.value = state.octave2;
    knobDrawer(octave2Canvas, (state.octave2 - octave2Range.min) / (octave2Range.max - octave2Range.min));
  }

  // ===== FORMES D'ONDE UI =====
  if (presetData.osc1?.waveform) {
    const wave1Radio = document.querySelector(`input[name="wave1"][value="${presetData.osc1.waveform}"]`);
    if (wave1Radio) wave1Radio.checked = true;
  }
  if (presetData.osc2?.waveform) {
    const wave2Radio = document.querySelector(`input[name="wave2"][value="${presetData.osc2.waveform}"]`);
    if (wave2Radio) wave2Radio.checked = true;
  }

  // ===== Appliquer aux oscillateurs (audio) via ADSR si dispo =====
  if (typeof adsr !== 'undefined' && adsr?.setOscillatorSettings) {
    adsr.setOscillatorSettings({
      waveform1: presetData.osc1?.waveform || 'sawtooth',
      waveform2: presetData.osc2?.waveform || 'sawtooth',
      vol1: state.vol1,
      vol2: state.vol2,
      fine1: state.fine1,
      fine2: state.fine2,
      semi1: state.semi1,
      semi2: state.semi2,
      octave1: state.octave1,   // ✅ correction (pas de ",q,")
      octave2: state.octave2,
      sync: (typeof syncOn !== 'undefined') ? syncOn : false
    });
  } else {
    console.warn('adsr.setOscillatorSettings indisponible — application audio partielle.');
  }

  // ===== FILTRE UI =====
  const freqRange        = document.getElementById('freq-range');
  const freqValDisplay   = document.getElementById('freq-val');
  const filterFreqCanvas = document.getElementById('filterFreq');
  if (freqRange && filterFreqCanvas && typeof knobDrawer === 'function') {
    freqRange.value = state.filterFreq;
    knobDrawer(filterFreqCanvas, (state.filterFreq - freqRange.min) / (freqRange.max - freqRange.min));
    if (freqValDisplay) freqValDisplay.textContent = `${Math.round(state.filterFreq)} Hz`;
  }

  const qRange        = document.getElementById('q-range');
  const qValDisplay   = document.getElementById('q-val');
  const filterQCanvas = document.getElementById('filterQ');
  if (qRange && filterQCanvas && typeof knobDrawer === 'function') {
    qRange.value = state.filterQ;
    knobDrawer(filterQCanvas, (state.filterQ - qRange.min) / (qRange.max - qRange.min));
    if (qValDisplay) qValDisplay.textContent = Number(state.filterQ).toFixed(1);
  }

  // ===== SYNC / BYPASS UI =====
  const syncToggleEl = document.getElementById('sync-toggle');
  if (syncToggleEl && typeof syncOn !== 'undefined') syncToggleEl.checked = syncOn;

  const filterBypassEl = document.getElementById('filter-bypass');
  if (filterBypassEl && typeof filterBypassed !== 'undefined') filterBypassEl.checked = filterBypassed;

  // ===== REDESSIN / RECALCUL =====
  if (typeof updateOscFreqs === 'function') {
    updateOscFreqs();
  } else {
    console.warn('updateOscFreqs() indisponible — recalcul fréquences osc non appliqué.');
  }

  if (typeof filterNeedsRedraw !== 'undefined') {
    filterNeedsRedraw = true;
  }

  console.log('✅ Preset chargé (state/UI + audio si dispo).', state);
}

const API_BASE = './sonora-back/public/index.php';

function isOk(result) {
  return result?.ok === true || result?.success === true;
}

/**
 * Sauvegarde un preset dans la base de données (MVC)
 */
async function savePreset() {
  const presetNameEl = document.getElementById('presetName');
  const presetName = presetNameEl?.value?.trim();

  if (!presetName) {
    alert('⚠️ Veuillez entrer un nom pour le preset');
    return;
  }

  const presetData = getCurrentPresetData();

  try {
    const response = await fetch(`${API_BASE}?action=save_preset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        // ton back MVC  utilise  name + data
        name: presetName,
        data: presetData,
        // description sera ignoré si non géré côté back
        description: 'Preset créé le ' + new Date().toLocaleString('fr-FR'),
      })
    });

    const result = await response.json();

    if (!isOk(result)) {
      alert('❌ Erreur: ' + (result.error ?? 'inconnue'));
      console.error('Erreur sauvegarde:', result);
      return;
    }

    alert(`✅ Preset "${presetName}" sauvegardé !`);
    if (presetNameEl) presetNameEl.value = '';
    console.log('Preset ID:', result.id ?? result.preset_id);
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Récupère la liste des presets depuis la BDD et les affiche (MVC)
 */
async function listPresets() {
  try {
    const response = await fetch(`${API_BASE}?action=list_presets`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();

    const presets = result.presets ?? [];
    const select = document.getElementById('presetsSelect');

    if (!select) {
      alert('❌ Élément #presetsSelect non trouvé');
      return;
    }

    select.innerHTML = '<option value="">-- Sélectionnez un preset --</option>';

    if (presets.length === 0) {
      select.innerHTML += '<option disabled>Aucun preset disponible</option>';
    } else {
      presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;

        // back renvoie created_at (pas updated_at)
        const dateStr = preset.created_at
          ? new Date(preset.created_at).toLocaleDateString('fr-FR')
          : '';

        option.textContent = dateStr ? `${preset.name} (${dateStr})` : preset.name;
        select.appendChild(option);
      });
    }

    const list = document.getElementById('presetsList');
    if (list) list.style.display = 'block';

    console.log('✅ Liste des presets chargée');
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Charge un preset sélectionné depuis la liste (MVC)
 */
async function loadPreset() {
  const presetId = document.getElementById('presetsSelect')?.value;

  if (!presetId) {
    alert('⚠️ Veuillez sélectionner un preset');
    return;
  }

  try {
    // back MVC attend GET avec id 
    const response = await fetch(`${API_BASE}?action=load_preset&id=${encodeURIComponent(presetId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const result = await response.json();

    const preset = result.preset;
    if (!preset) {
      alert('❌ Erreur: preset introuvable');
      console.error('Réponse chargement:', result);
      return;
    }

    // data est stocké en string JSON dans  BDD -> on parse
    let data = preset.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }

    loadPresetData(data);
    alert(`✅ Preset "${preset.name}" chargé !`);

    const list = document.getElementById('presetsList');
    if (list) list.style.display = 'none';

    console.log('Preset chargé:', preset.name);
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
  }
}

/**
 * Supprime un preset sélectionné (MVC)
 */
async function deletePreset() {
  const select = document.getElementById('presetsSelect');
  const presetId = select?.value;
  const presetName = select?.selectedOptions?.[0]?.text;

  if (!presetId) {
    alert('⚠️ Veuillez sélectionner un preset');
    return;
  }

  if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer "${presetName}" ?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}?action=delete_preset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ id: presetId })
    });

    const result = await response.json();

    if (!isOk(result)) {
      alert('❌ Erreur: ' + (result.error ?? 'inconnue'));
      console.error('Erreur suppression:', result);
      return;
    }

    alert('✅ Preset supprimé !');
    console.log('Preset supprimé:', presetId);
    await listPresets();
  } catch (error) {
    console.error('Erreur réseau:', error);
    alert('❌ Erreur réseau: ' + error.message);
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

  if (!modal || !overlay) return;

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
  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  if (saveBtn) saveBtn.addEventListener('click', savePreset);
  if (listBtn) listBtn.addEventListener('click', listPresets);
  if (loadBtn) loadBtn.addEventListener('click', loadPreset);
  if (deleteBtn) deleteBtn.addEventListener('click', deletePreset);

  console.log('✅ Preset modal listeners initialisés');
}

// ✅ une seule fois
document.addEventListener('DOMContentLoaded', initPresetListeners);