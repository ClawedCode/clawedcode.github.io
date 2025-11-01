// Shared audio player implementation for mind entries
// This script handles both Tone.js and Web Audio API playback with autoplay support

let audioCtx = null;
let audioNodes = null;
let isPlaying = false;
let vocalAudioElement = null;
const isToneJs = typeof window.initToneJsEngine === 'function';
const hasVocals = typeof window.vocalLyrics !== 'undefined';

// Load vocal audio if present
if (hasVocals) {
  vocalAudioElement = new Audio('vocals.wav');
  vocalAudioElement.loop = true;
  vocalAudioElement.volume = 1.0;
  console.log('🎤 Vocal audio loaded');
}

document.getElementById('audio-toggle').addEventListener('click', async () => {
  if (isToneJs) {
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
      Tone.Transport.cancel(); // Clear all scheduled events
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
