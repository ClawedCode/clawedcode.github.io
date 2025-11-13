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

// Web Speech API vocals synthesis (for new drafts without vocals.wav)
let scheduledVocalEvents = [];
let useWebSpeechAPI = false;

function initVocals() {
  // Check if vocals.wav exists (backward compatibility)
  if (window.vocalAudioElement) {
    vocalAudioElement = window.vocalAudioElement;
    vocalAudioElement.loop = true;
    const vocalsVolume = window.audioRecipe?.vocalsVolume ?? 1.0;
    vocalAudioElement.volume = Math.min(vocalsVolume, 1.0);
    console.log(`🎤 Vocal audio element found (volume: ${vocalAudioElement.volume.toFixed(2)})`);
    useWebSpeechAPI = false;
    return;
  }

  // Otherwise use Web Speech API (new method)
  if (window.vocalLyrics && Array.isArray(window.vocalLyrics)) {
    const voiceName = window.vocalVoice || 'Fred';

    // Ensure voices are loaded
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener('voiceschanged', () => {
        console.log(`🎤 Web Speech voices loaded (using: ${voiceName})`);
      });
    }

    console.log(`🎤 Web Speech vocals initialized (${window.vocalLyrics.length} phrases, voice: ${voiceName})`);
    useWebSpeechAPI = true;
  }
}

function scheduleWebSpeechVocals(bpm) {
  if (!window.vocalLyrics) return;

  // Tone.js mode (modern)
  if (typeof Tone !== 'undefined' && Tone.Transport) {
    const barDuration = (60 / bpm) * 4; // Duration of one bar in seconds

    window.vocalLyrics.forEach(lyric => {
      const startTime = `${lyric.bar}:0:0`; // Bar:Beat:Sixteenth

      const scheduledEvent = Tone.Transport.schedule((time) => {
        speakPhrase(lyric.text);
      }, startTime);

      scheduledVocalEvents.push(scheduledEvent);
    });

    console.log(`✅ Scheduled ${scheduledVocalEvents.length} vocal events (Tone.js)`);
  }
}

function scheduleWebSpeechVocalsWebAudio(duration) {
  if (!window.vocalLyrics) return;

  // Calculate bar duration from total duration and max bar
  const maxBar = Math.max(...window.vocalLyrics.map(l => l.bar));
  const barDuration = duration / maxBar; // Simple: total time / total bars
  const estimatedBPM = 60 / (barDuration / 4); // BPM from bar duration (4/4 time)

  console.log(`🎵 Duration: ${duration}s, Max bar: ${maxBar}, Bar duration: ${barDuration.toFixed(2)}s, Estimated BPM: ${estimatedBPM.toFixed(1)}`);

  // Clear completed timeout IDs from previous loop (they're already done)
  // We don't call clearTimeout because these have already fired
  const newEvents = [];

  // Schedule each phrase based on bar timing
  window.vocalLyrics.forEach(lyric => {
    const delayMs = lyric.bar * barDuration * 1000;
    const timeoutId = setTimeout(() => {
      speakPhrase(lyric.text);
    }, delayMs);
    newEvents.push(timeoutId);
  });

  // Replace old events with new ones
  scheduledVocalEvents = newEvents;

  console.log(`✅ Scheduled ${scheduledVocalEvents.length} vocal events (Web Audio API, looping every ${duration}s)`);
}

function speakPhrase(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = window.vocalRate || 1.0;
  utterance.pitch = window.vocalPitch || 1.0;
  utterance.volume = 1.0;

  const voiceName = window.vocalVoice || 'Fred';
  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.name === voiceName && v.lang.startsWith('en'));
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  console.log(`🗣️  "${text}"`);
  speechSynthesis.speak(utterance);
}

function cancelWebSpeechVocals() {
  // Cancel all scheduled events (Tone.js or setTimeout)
  scheduledVocalEvents.forEach(eventId => {
    if (typeof Tone !== 'undefined' && Tone.Transport) {
      // Tone.js mode
      Tone.Transport.clear(eventId);
    } else {
      // Web Audio API mode (setTimeout)
      clearTimeout(eventId);
    }
  });
  scheduledVocalEvents = [];

  // Cancel any currently speaking utterances
  speechSynthesis.cancel();

  console.log('🔇 Web Speech vocals cancelled');
}

if (hasVocalsMode()) {
  initVocals();
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

      // Reduce instrumental volume if vocals are present (ducking)
      if (hasVocalsMode()) {
        Tone.Destination.volume.value = -12; // Reduce by 12dB to make vocals audible
        console.log('🎚️  Reduced instrumental volume to -12dB for vocal clarity');
      }

      Tone.Transport.position = 0; // Reset to beginning

      // Handle vocals based on mode
      if (hasVocalsMode()) {
        if (useWebSpeechAPI) {
          // New method: Schedule Web Speech API vocals
          const bpm = Tone.Transport.bpm.value;
          scheduleWebSpeechVocals(bpm);
        } else if (vocalAudioElement) {
          // Legacy method: Play vocals.wav
          vocalAudioElement.play().catch(e => {
            console.log('⚠️ Autoplay blocked, waiting for user interaction');
          });
        }
      }

      Tone.Transport.start('+0.1');
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

      // Stop all effects (Chorus, Tremolo, LFO, etc.)
      if (window.toneJsEffects) {
        Object.values(window.toneJsEffects).forEach(effect => {
          if (effect && typeof effect.stop === 'function') {
            effect.stop();
          }
        });
      }

      // For ambient/hum/dtmf audio, also cleanup sustained synths
      if (window.cleanupAudio) {
        window.cleanupAudio();
      }

      // Stop vocals - always cancel speech synthesis first
      speechSynthesis.cancel();

      // Then clean up scheduled events based on mode
      if (hasVocalsMode()) {
        if (useWebSpeechAPI) {
          // Tone.js mode - clear scheduled Tone.Transport events
          scheduledVocalEvents.forEach(id => Tone.Transport.clear(id));
          scheduledVocalEvents = [];
          console.log('🔇 Web Speech vocals cancelled');
        } else if (vocalAudioElement) {
          vocalAudioElement.pause();
          vocalAudioElement.currentTime = 0;
        }
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
      // Stop vocals - always cancel speech synthesis first
      speechSynthesis.cancel();

      // Then clean up scheduled events based on mode
      if (hasVocalsMode()) {
        if (useWebSpeechAPI) {
          // Clear pending timeouts
          scheduledVocalEvents.forEach(id => clearTimeout(id));
          scheduledVocalEvents = [];
          console.log('🔇 Web Speech vocals cancelled');
        } else if (vocalAudioElement) {
          vocalAudioElement.pause();
          vocalAudioElement.currentTime = 0;
        }
      }
      document.getElementById('audio-toggle').textContent = '🔊 PLAY MUSIC';
      isPlaying = false;
    } else {
      // Create new AudioContext if needed (after stopping)
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Start audio and loop based on duration
      const duration = window.audioDuration || 60;
      function startAudio() {
        audioNodes = window.generateAudio(audioCtx);
      }
      startAudio();

      // Schedule Web Speech vocals once (they will repeat with the audio loop)
      if (useWebSpeechAPI) {
        scheduleWebSpeechVocalsWebAudio(duration);
      }

      // Re-trigger based on animation duration
      const loopMs = duration * 1000;
      window.audioLoopInterval = setInterval(() => {
        startAudio();
        // Re-schedule vocals for the next loop cycle
        if (useWebSpeechAPI) {
          scheduleWebSpeechVocalsWebAudio(duration);
        }
      }, loopMs);

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

// postMessage handler for mute/unmute controls from AudioFingerprint
window.addEventListener('message', (event) => {
  // Filter out non-audio-control messages
  if (!event.data || typeof event.data !== 'object') return;
  if (!event.data.type || !['mute-instrument', 'unmute-instrument', 'mute-effect', 'unmute-effect'].includes(event.data.type)) return;

  console.log('🎚️ Received audio control message:', event.data);

  // Only handle Tone.js instruments (freeform audio)
  if (!isToneJsMode() || !window.toneJsInstruments) {
    console.warn('Tone.js instruments not available for muting');
    return;
  }

  const { type, instrumentType, effectType } = event.data;

  if (type === 'mute-instrument' || type === 'unmute-instrument') {
    const targetVolume = type === 'mute-instrument' ? -60 : 0; // -60dB = silent, 0dB = original

    // Find matching instruments by type name (e.g., "MembraneSynth")
    Object.entries(window.toneJsInstruments).forEach(([name, instrument]) => {
      if (instrument && instrument.name && instrument.name.includes(instrumentType)) {
        if (instrument.volume && instrument.volume.value !== undefined) {
          instrument.volume.value = targetVolume;
          console.log(`🎚️ ${type === 'mute-instrument' ? 'Muted' : 'Unmuted'} instrument: ${name} (${instrumentType})`);
        }
      }
    });
  } else if (type === 'mute-effect' || type === 'unmute-effect') {
    // Effects are typically connected in the signal chain
    // We'll need to adjust their wet/dry mix or bypass them
    const wetValue = type === 'mute-effect' ? 0 : 1; // 0 = dry (no effect), 1 = wet (full effect)

    // Search through all instruments and their connected effects
    Object.entries(window.toneJsInstruments).forEach(([name, instrument]) => {
      if (instrument && instrument._effects) {
        instrument._effects.forEach(effect => {
          if (effect && effect.name && effect.name.includes(effectType)) {
            if (effect.wet && effect.wet.value !== undefined) {
              effect.wet.value = wetValue;
              console.log(`🎚️ ${type === 'mute-effect' ? 'Muted' : 'Unmuted'} effect: ${effectType}`);
            }
          }
        });
      }
    });
  }
});
