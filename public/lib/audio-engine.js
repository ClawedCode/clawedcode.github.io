/**
 * Shared Tone.js Audio Engine for ClawedCode Pages
 * Consumes window.audioRecipe JSON and generates dynamic synthwave audio
 *
 * Usage:
 * 1. Include Tone.js: <script src="/lib/tone.min.js"></script>
 * 2. Include this file: <script src="/lib/audio-engine.js"></script>
 * 3. Define window.audioRecipe object before calling initAudio()
 * 4. Call initAudio() when ready (e.g., on user interaction)
 */

async function initAudio() {
  if (!window.Tone) {
    console.error('Tone.js not loaded');
    return;
  }

  if (!window.audioRecipe) {
    console.error('No audio recipe found');
    return;
  }

  await Tone.start();

  const recipe = window.audioRecipe;

  // ---- Global Setup ----
  const BPM = recipe.global.bpm || 86;
  Tone.Transport.bpm.value = BPM;

  // Scale helper
  const Scale = {
    natural_minor: [0, 2, 3, 5, 7, 8, 10],
    notes(key = "F") {
      const semis = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11};
      return (degree) => (semis[key] + degree) % 12;
    }
  };

  const key = recipe.global.key || "F";
  const scale = recipe.global.scale || "natural_minor";

  // Map Roman numerals to scale degrees in natural minor
  const romanToDegree = {
    "i": 0, "ii": 2, "III": 3, "iv": 5, "v": 7, "VI": 8, "VII": 10
  };

  const progression = recipe.progression || ["i","VI","III","VII"];
  const chordRootMIDIs = progression.map(rn => 53 + romanToDegree[rn]);

  function buildTriad(rootMidi) {
    return [rootMidi, rootMidi+3, rootMidi+7];
  }

  // ---- Buses / FX ----
  const mixBus = new Tone.Gain(1).toDestination();

  const verb = new Tone.Reverb({
    decay: recipe.instruments?.lead?.reverb?.decay_s || 1.6,
    preDelay: 0.02,
    wet: 0.15
  }).connect(mixBus);
  await verb.generate();

  const chorus = new Tone.Chorus({
    frequency: recipe.instruments?.pad?.chorus?.rate_hz || 1.2,
    depth: recipe.instruments?.pad?.chorus?.depth || 0.7,
    wet: 0.4
  }).start().connect(mixBus);

  const delayDotted8 = new Tone.FeedbackDelay("8n.", 0.35);
  delayDotted8.wet.value = 0.25;
  delayDotted8.connect(mixBus);

  // Duck bus for sidechain (pads/bass feed this)
  const duckBus = new Tone.Gain(1).connect(mixBus);

  // ---- Instruments ----
  const bassConfig = recipe.instruments?.bass || {};
  const bass = new Tone.MonoSynth({
    oscillator: { type: bassConfig.wave || "sawtooth" },
    filter: {
      type: "lowpass",
      Q: bassConfig.filter?.q || 0.7,
      frequency: bassConfig.filter?.cutoff_hz || 180
    },
    envelope: {
      attack: 0.002,
      decay: 0.08,
      sustain: 0.7,
      release: 0.12
    },
    filterEnvelope: {
      attack: 0.002,
      decay: 0.06,
      sustain: 0.0,
      release: 0.1,
      baseFrequency: 120,
      octaves: 1.2
    }
  }).connect(duckBus);

  const arpConfig = recipe.instruments?.arp || {};
  const arp = new Tone.Synth({
    oscillator: { type: arpConfig.wave || "sawtooth" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.15 }
  }).connect(delayDotted8);

  const padConfig = recipe.instruments?.pad || {};
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: padConfig.wave || "sawtooth" },
    envelope: {
      attack: 0.2,
      decay: 0.6,
      sustain: 0.7,
      release: 1.5
    }
  });
  const padFilter = new Tone.Filter(padConfig.hp_cut_hz || 180, "highpass");
  pad.connect(padFilter);
  padFilter.connect(chorus);
  chorus.connect(duckBus);
  duckBus.connect(verb);

  const leadConfig = recipe.instruments?.lead || {};
  const lead = new Tone.MonoSynth({
    oscillator: { type: leadConfig.wave || "square" },
    portamento: leadConfig.glide_s || 0.06,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 }
  });
  lead.connect(delayDotted8);
  delayDotted8.connect(verb);

  // ---- Drums ----
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }
  }).connect(mixBus);

  const snareNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
  });
  const snareTone = new Tone.MetalSynth({
    frequency: 200,
    envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000
  }).connect(mixBus);
  const snareVerb = new Tone.Reverb({ decay: 1.0, preDelay: 0.01, wet: 0.2 });
  snareNoise.connect(snareVerb);
  snareVerb.connect(mixBus);

  const hat = new Tone.MetalSynth({
    frequency: 250,
    envelope: { attack: 0.001, decay: 0.05, release: 0.005 },
    harmonicity: 5,
    modulationIndex: 10,
    resonance: 4000
  }).connect(mixBus);

  // ---- Sidechain ducking ----
  function duck(time) {
    const g = duckBus.gain;
    g.cancelAndHoldAtTime(time);
    g.setValueAtTime(g.value, time);
    g.linearRampToValueAtTime(0.5, time + 0.005);
    g.linearRampToValueAtTime(1.0, time + 0.205);
  }

  // ---- Sequencing ----
  function chordAtBar(barIdx) {
    const chordRoot = chordRootMIDIs[barIdx % chordRootMIDIs.length];
    return buildTriad(chordRoot);
  }

  // Calculate total duration from sections
  const totalBars = recipe.sections.reduce((sum, s) => sum + s.bars, 0);

  // Bass: 8th notes on root, per bar
  const bassPart = new Tone.Part((time, step) => {
    const bar = Math.floor(step / 8);
    const root = chordAtBar(bar)[0];
    bass.triggerAttackRelease(Tone.Frequency(root, "midi"), "8n", time);
  }, Array.from({length: totalBars * 8}, (_,i)=> [i * Tone.Time("8n"), i]) ).start(0);

  // Arp: up-down through triad over 1 bar
  const arpPart = new Tone.Loop(time => {
    const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
    const triad = chordAtBar(bar);
    const seq = [...triad, triad[1], triad[0]].map(n => n+12);
    const idx = Math.floor((Tone.Transport.ticks % Tone.Time("1m").toTicks()) / Tone.Time("8n").toTicks()) % seq.length;
    const note = seq[idx];
    arp.triggerAttackRelease(Tone.Frequency(note, "midi"), "8n", time, 0.8);
  }, "8n").start(0);

  // Pads: sustain whole bar triads
  const padPart = new Tone.Loop(time => {
    const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
    const triad = chordAtBar(bar).map(n => n - 12);
    pad.triggerAttackRelease(triad.map(n => Tone.Frequency(n, "midi")), "1m", time, 0.7);
  }, "1m").start(0);

  // Drums
  const kickPart = new Tone.Loop(time => {
    kick.triggerAttackRelease("C1", "8n", time);
    duck(time);
  }, "4n").start(0);

  const snarePart = new Tone.Part((time) => {
    snareNoise.triggerAttackRelease("8n", time);
    snareTone.triggerAttackRelease("16n", time);
  }, [
    ["0:2:0", null],
    ["0:3:2", null]
  ]).start(0);
  snarePart.loop = true;
  snarePart.loopEnd = "1m";

  const hatPart = new Tone.Part((time) => {
    hat.triggerAttackRelease("32n", time);
  }, [["0:0:2"], ["0:1:2"], ["0:2:2"], ["0:3:2"]]).start(0);
  hatPart.loop = true;
  hatPart.loopEnd = "1m";

  // Lead (optional: schedule based on sections)
  function scheduleLeadRiff(barStart) {
    const notes = [0, 2, 3, 5].map(d => 72 + d);
    notes.forEach((m, i) => {
      const t = Tone.Time(`${barStart}:0:0`) + Tone.Time(`${i*2}n`);
      lead.triggerAttackRelease(Tone.Frequency(m, "midi"), "8n", t, 0.7);
    });
  }

  // Schedule lead riffs for drop section
  const dropSection = recipe.sections.find(s => s.name === 'drop');
  if (dropSection) {
    const dropBar = recipe.sections.slice(0, recipe.sections.indexOf(dropSection))
      .reduce((sum, s) => sum + s.bars, 0);
    scheduleLeadRiff(dropBar);
  }

  // Start transport
  Tone.Transport.start("+0.1");

  // Store cleanup function
  window.cleanupAudio = function() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    bassPart.dispose();
    arpPart.dispose();
    padPart.dispose();
    kickPart.dispose();
    snarePart.dispose();
    hatPart.dispose();
    bass.dispose();
    arp.dispose();
    pad.dispose();
    lead.dispose();
    kick.dispose();
    snareNoise.dispose();
    snareTone.dispose();
    hat.dispose();
    verb.dispose();
    chorus.dispose();
    delayDotted8.dispose();
  };

  console.log('🎵 Audio engine initialized');
}

// Make initAudio available globally
if (typeof window !== 'undefined') {
  window.initAudio = initAudio;
}
