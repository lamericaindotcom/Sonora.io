/* =====================================================================
   ADSR EXTENSION - ANALYSER CONNECTION
   ===================================================================== 
   
   À inclure APRÈS adsr.js
   Ajoute la méthode setAnalysers() au ADSRManager
   
===================================================================== */

// Extendre la classe ADSRVoice pour connecter les oscillateurs aux analyseurs
const originalADSRVoiceNoteOn = ADSRVoice.prototype.noteOn;

ADSRVoice.prototype.noteOn = function(midi, freq, adsr) {
  // Appeler la méthode originale
  originalADSRVoiceNoteOn.call(this, midi, freq, adsr);
  
  // Si des analyseurs sont définis, connecter les oscillateurs
  if (this.analyser1 && this.osc1) {
    this.osc1.connect(this.analyser1);
  }
  if (this.analyser2 && this.osc2) {
    this.osc2.connect(this.analyser2);
  }
};

// Ajouter la méthode setAnalysers à ADSRManager
ADSRManager.prototype.setAnalysers = function(analyser1, analyser2) {
  console.log('📊 Setting up analysers for scopes');
  
  // Assigner les analyseurs à toutes les voix
  this.voices.forEach(voice => {
    voice.analyser1 = analyser1;
    voice.analyser2 = analyser2;
  });
  
  console.log('✅ Analysers connected to all voices');
};

console.log('✅ adsr_extension.js loaded - Analyser routing enabled');
