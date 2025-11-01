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
      Tone.Transport.start('+0.1');
      if (vocalAudioElement) {
        vocalAudioElement.play().catch(e => {
          console.log('⚠️ Autoplay blocked, waiting for user interaction');
        });
      }
      document.getElementById('audio-toggle').textContent = '🔇 STOP MUSIC';
      isPlaying = true;
    } else {
      Tone.Transport.stop();
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
      // Stop audio
      if (audioNodes && audioNodes.nodes) {
        audioNodes.nodes.forEach(node => {
          if (node && node.stop) {
            try {
              node.stop();
            } catch (e) {
              // Node may already be stopped
            }
          }
        });
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
      // Start audio and loop every 60 seconds
      function startAudio() {
        audioNodes = window.generateAudio(audioCtx);
      }
      startAudio();
      // Re-trigger every 60 seconds for continuous playback
      window.audioLoopInterval = setInterval(startAudio, 60000);
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
