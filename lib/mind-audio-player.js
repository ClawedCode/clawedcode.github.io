// Shared audio player implementation for mind entries
// This script handles both Tone.js and Web Audio API playback with autoplay support

let audioCtx = null;
let audioNodes = null;
let isPlaying = false;
let vocalAudioElement = null;

// Helper to detect audio type (check at runtime, not load time)
function isToneJsMode() {
  return typeof window.initToneJsEngine === 'function';
}

function hasVocalsMode() {
  return typeof window.vocalLyrics !== 'undefined' || typeof window.vocalAudioElement !== 'undefined';
}

// Load vocal audio if present (either from vocalLyrics or pre-existing vocalAudioElement)
if (hasVocalsMode()) {
  // Check if vocal element already exists (from HTML)
  if (window.vocalAudioElement) {
    vocalAudioElement = window.vocalAudioElement;
    vocalAudioElement.loop = true;
    // Read vocals volume from audioRecipe if available, default to 1.0
    const vocalsVolume = window.audioRecipe?.vocalsVolume ?? 1.0;
    vocalAudioElement.volume = Math.min(vocalsVolume, 1.0);
    console.log(`🎤 Vocal audio element found (volume: ${vocalAudioElement.volume.toFixed(2)})`);
  } else if (typeof window.vocalLyrics !== 'undefined') {
    // Create new audio element for vocalLyrics
    vocalAudioElement = new Audio(`vocals.wav?t=${Date.now()}`);
    vocalAudioElement.loop = true;
    // Read vocals volume from audioRecipe if available, default to 1.0
    const vocalsVolume = window.audioRecipe?.vocalsVolume ?? 1.0;
    vocalAudioElement.volume = Math.min(vocalsVolume, 1.0);
    console.log(`🎤 Vocal audio loaded (volume: ${vocalAudioElement.volume.toFixed(2)})`);

    // Expose globally for AudioInstrumentControls
    window.vocalAudioElement = vocalAudioElement;
  }
}

document.getElementById('audio-toggle').addEventListener('click', async () => {
  if (isToneJsMode()) {
    // Tone.js control (loops indefinitely)
    if (!isPlaying) {
      // Initialize Tone.js engine if not already done
      if (window.initToneJsEngine) {
        await window.initToneJsEngine();
      }
      await Tone.start();
      Tone.Transport.position = 0; // Reset to beginning
      Tone.Transport.start('+0.1');
      if (vocalAudioElement) {
        vocalAudioElement.play().catch(e => {
          console.log('⚠️ Autoplay blocked, waiting for user interaction');
        });
      }
      document.getElementById('audio-toggle').textContent = '🔇 STOP MUSIC';
      isPlaying = true;
      console.log('🎵 Tone.js instruments available:', Object.keys(window.toneJsInstruments || {}));
    } else {
      Tone.Transport.stop();
      Tone.Transport.cancel(); // Cancel all scheduled events

      // Release all sustained notes from instruments
      if (window.toneJsInstruments) {
        Object.values(window.toneJsInstruments).forEach(instrument => {
          if (instrument && typeof instrument.triggerRelease === 'function') {
            instrument.triggerRelease();
          }
          // For synths with sustained notes, explicitly release
          if (instrument && typeof instrument.releaseAll === 'function') {
            instrument.releaseAll();
          }
        });
      }

      // Stop all loops
      if (window.toneJsParts) {
        Object.values(window.toneJsParts).forEach(part => {
          if (part && typeof part.stop === 'function') {
            part.stop();
          }
        });
      }

      // For ambient/hum/dtmf audio, also cleanup sustained synths
      if (window.cleanupAudio) {
        window.cleanupAudio();
      }

      if (vocalAudioElement) {
        vocalAudioElement.pause();
        vocalAudioElement.currentTime = 0;
      }
      document.getElementById('audio-toggle').textContent = '🔊 PLAY MUSIC';
      isPlaying = false;
    }
  } else {
    // Web Audio API control (re-trigger every 60s for looping)
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (isPlaying) {
      // Stop audio by closing and recreating the AudioContext
      // This is the only reliable way to stop all scheduled oscillators in Web Audio API
      if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
      }
      if (window.audioLoopInterval) {
        clearInterval(window.audioLoopInterval);
        window.audioLoopInterval = null;
      }
      if (vocalAudioElement) {
        vocalAudioElement.pause();
        vocalAudioElement.currentTime = 0;
      }
      document.getElementById('audio-toggle').textContent = '🔊 PLAY MUSIC';
      isPlaying = false;
    } else {
      // Create new AudioContext if needed (after stopping)
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Start audio and loop based on duration
      function startAudio() {
        audioNodes = window.generateAudio(audioCtx);
      }
      startAudio();
      // Re-trigger based on animation duration (exposed as window.audioDuration or default to 60s)
      const loopMs = (window.audioDuration || 60) * 1000;
      window.audioLoopInterval = setInterval(startAudio, loopMs);
      if (vocalAudioElement) {
        vocalAudioElement.play().catch(e => {
          console.log('⚠️ Autoplay blocked, waiting for user interaction');
        });
      }
      document.getElementById('audio-toggle').textContent = '🔇 STOP MUSIC';
      isPlaying = true;
    }
  }
});

// Auto-play if URL parameter is set
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('autoplay') === 'true') {
  // Wait a bit for everything to be ready, then auto-click
  setTimeout(async () => {
    const button = document.getElementById('audio-toggle');
    if (button && !isPlaying) {
      // Store original click handler behavior
      const originalIsPlaying = isPlaying;
      button.click();

      // Check if autoplay actually worked by waiting a bit
      setTimeout(() => {
        // If still not playing, reset button state for manual interaction
        if (!isPlaying || (vocalAudioElement && vocalAudioElement.paused)) {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.close();
            audioCtx = null;
          }
          if (window.audioLoopInterval) {
            clearInterval(window.audioLoopInterval);
            window.audioLoopInterval = null;
          }
          isPlaying = false;
          document.getElementById('audio-toggle').textContent = '🔊 PLAY MUSIC';
          console.log('⚠️ Autoplay blocked - click button to play');
        }
      }, 100);
    }
  }, 500);
}
