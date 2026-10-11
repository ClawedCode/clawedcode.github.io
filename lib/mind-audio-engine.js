/**
 * Mind Audio Engine - Shared Tone.js audio engine library
 * Used by ClawedCode for generative music synthesis
 *
 * Supports multiple engine types:
 * - synthwave: Pattern-based synthwave/retrowave music
 * - ambient: Drone-based ambient soundscapes
 * - hum: Single-frequency hum generator
 * - dtmf: DTMF tone sequences
 *
 * Usage:
 *   window.audioRecipe = { ... };
 *   await window.MindAudioEngine.initEngine(window.audioRecipe);
 */

(function() {
  'use strict';

  // Public API
  window.MindAudioEngine = {
    version: '1.0.0',

    initEngine: async function(audioRecipe) {
      if (window.toneJsInitialized) {
        console.log('🎵 Audio engine already initialized');
        return;
      }

      if (!audioRecipe) {
        console.error('❌ No audio recipe provided');
        return;
      }

      const type = audioRecipe.type || (audioRecipe.global ? 'synthwave' : 'synthwave');
      console.log(`🎵 Initializing ${type} audio engine...`);

      switch(type) {
        case 'ambient':
          await initAmbientEngine(audioRecipe);
          break;
        case 'hum':
          await initHumEngine(audioRecipe);
          break;
        case 'dtmf':
          await initDTMFEngine(audioRecipe);
          break;
        default: // 'synthwave' or undefined
          await initSynthwaveEngine(audioRecipe);
          break;
      }

      window.toneJsInitialized = true;
      console.log('✅ Audio engine initialized');
    }
  };

  // ============================================================================
  // SYNTHWAVE ENGINE
  // ============================================================================

  async function initSynthwaveEngine(recipe) {
    if (window.toneJsInitialized) return;

    if (!recipe) {
      console.error('No audio recipe found');
      return;
    }

    function euclidean(steps, pulses) {
      if (pulses >= steps) return Array(steps).fill(1);
      if (pulses === 0) return Array(steps).fill(0);

      const pattern = [];
      const counts = [];
      const remainders = [];
      let divisor = steps - pulses;
      remainders.push(pulses);
      let level = 0;

      while (remainders[level] > 1) {
        counts.push(Math.floor(divisor / remainders[level]));
        remainders.push(divisor % remainders[level]);
        divisor = remainders[level];
        level++;
      }
      counts.push(divisor);

      function build(level) {
        if (level === -1) {
          pattern.push(0);
        } else if (level === -2) {
          pattern.push(1);
        } else {
          for (let i = 0; i < counts[level]; i++) {
            build(level - 1);
          }
          if (remainders[level] !== 0) {
            build(level - 2);
          }
        }
      }

      build(level);
      return pattern.slice(0, steps);
    }

    function generatePattern(type, steps = 8, patternData = null) {
      if (patternData && Array.isArray(patternData)) {
        return patternData;
      }

      switch(type) {
        case '16n_groove':
        case '8n_groove':
          return Array(steps).fill(null).map((_, i) =>
            [0, 3, 4, 6].includes(i) ? 0 : -1
          );

        case 'updown_8n':
        case 'updown_16n':
          return [0, 1, 2, 1, 0, 1, 2, 1];

        case 'random_8n':
        case 'random_16n':
          return Array(steps).fill(null).map(() =>
            Math.random() > 0.3 ? Math.floor(Math.random() * 3) : -1
          );

        case 'euclidean_8_5':
          const e85 = euclidean(8, 5);
          return e85.map((hit, i) => hit ? i % 3 : -1);

        case 'euclidean_16_9':
          const e169 = euclidean(16, 9);
          return e169.map((hit, i) => hit ? i % 3 : -1);

        default:
          return [0, 1, 2, 1, 0, 1, 2, 1];
      }
    }

    function applyVelocities(pattern, velocities) {
      return pattern.map((noteIdx, step) => {
        const vel = velocities[step % velocities.length];
        if (noteIdx === -1 || vel === 0) return null;
        return { noteIdx, velocity: vel };
      });
    }

    const BPM = recipe.global.bpm || 86;
    Tone.Transport.bpm.value = BPM;

    const Scale = {
      natural_minor: [0, 2, 3, 5, 7, 8, 10],
      notes(key = "F") {
        const semis = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11};
        return (degree) => (semis[key] + degree) % 12;
      }
    };

    const key = recipe.global.key || "F";
    const scale = recipe.global.scale || "natural_minor";
    const noteNum = Scale.notes(key);

    const romanToDegree = {
      "i": 0, "ii": 2, "III": 3, "iv": 5, "v": 7, "VI": 8, "VII": 10,
      "bIII": 3, "bVI": 8, "bVII": 10, "IV": 5, "V": 7
    };

    const progression = recipe.progression || ["i","VI","III","VII"];
    const chordRootMIDIs = progression.map(rn => 53 + romanToDegree[rn]);

    function buildTriad(rootMidi) {
      return [rootMidi, rootMidi+3, rootMidi+7];
    }

    const mixBus = new Tone.Gain(1).toDestination();

    const verb = new Tone.Reverb({
      decay: recipe.instruments?.lead?.reverb?.decay_s || 1.6,
      preDelay: 0.02,
      wet: 0.08
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

    const duckBus = new Tone.Gain(1).connect(mixBus);

    const waveMap = { "saw": "sawtooth", "sawtooth": "sawtooth", "square": "square", "sine": "sine", "triangle": "triangle" };

    const bassConfig = recipe.instruments?.bass || {};
    const bass = new Tone.MonoSynth({
      oscillator: { type: waveMap[bassConfig.wave] || "sawtooth" },
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

    const subBassConfig = recipe.instruments?.sub_bass || {};
    const subBass = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.005,
        decay: 0.2,
        sustain: 0.9,
        release: 0.3
      }
    }).connect(duckBus);

    const arpConfig = recipe.instruments?.arp || {};
    const arp = new Tone.Synth({
      oscillator: { type: waveMap[arpConfig.wave] || "sawtooth" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.15 }
    });
    const arpFilter = new Tone.Filter({ type: "lowpass", frequency: 8000, rolloff: -24 });
    arp.connect(arpFilter);
    arpFilter.connect(delayDotted8);

    const padConfig = recipe.instruments?.pad || {};
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: waveMap[padConfig.wave] || "sawtooth" },
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
    duckBus.connect(mixBus);

    const pianoConfig = recipe.instruments?.piano || {};
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.2,
        release: 0.8
      }
    });
    piano.connect(verb);

    const stringsConfig = recipe.instruments?.strings || {};
    const strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: stringsConfig.envelope?.attack || 0.5,
        decay: stringsConfig.envelope?.decay || 0.3,
        sustain: stringsConfig.envelope?.sustain || 0.9,
        release: stringsConfig.envelope?.release || 2.0
      }
    });

    // Dedicated strings processing chain for orchestral sound
    const stringsFilter = new Tone.Filter(stringsConfig.filter?.cutoff_hz || 2400, "lowpass");
    stringsFilter.Q.value = stringsConfig.filter?.q || 0.7;
    const stringsChorus = new Tone.Chorus(1.5, 2.5, 0.3).start(); // Gentler chorus
    const stringsReverb = new Tone.Reverb({
      decay: stringsConfig.reverb?.decay_s || 3.2,
      preDelay: stringsConfig.reverb?.predelay_ms ? stringsConfig.reverb.predelay_ms / 1000 : 0.02
    }).toDestination();
    stringsReverb.wet.value = stringsConfig.reverb?.mix || 0.35;

    // Signal chain: strings → filter → chorus → reverb → mixBus
    strings.connect(stringsFilter);
    stringsFilter.connect(stringsChorus);
    stringsChorus.connect(stringsReverb);
    stringsReverb.connect(mixBus);

    const leadConfig = recipe.instruments?.lead || {};
    const lead = new Tone.MonoSynth({
      oscillator: { type: waveMap[leadConfig.wave] || "triangle" },
      portamento: leadConfig.glide_s !== undefined ? leadConfig.glide_s : (leadConfig.portamento || 0.06),
      envelope: leadConfig.envelope || { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 }
    });
    lead.connect(delayDotted8);
    delayDotted8.connect(verb);

    const drumConfig = recipe.instruments?.drums || {};
    const kickSynthesis = drumConfig.kick?.synthesis || {};
    const kick = new Tone.MembraneSynth({
      pitchDecay: kickSynthesis.pitchDecay || 0.03,
      octaves: kickSynthesis.octaves || 6,
      oscillator: { type: "sine" },
      envelope: kickSynthesis.envelope || { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }
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

    // Noise instrument for risers/swells (Detroit/industrial style)
    const noiseConfig = recipe.instruments?.noise || {};
    let noiseSource, noiseFilter, noiseEnv;
    if (noiseConfig.type) {
      noiseSource = new Tone.Noise(noiseConfig.type);
      noiseFilter = new Tone.Filter({
        type: noiseConfig.filter?.type || "highpass",
        frequency: noiseConfig.filter?.cutoff_hz || 500
      });
      noiseEnv = new Tone.AmplitudeEnvelope({
        attack: 0.4,
        decay: 0.2,
        sustain: 0,
        release: 0.6
      });
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseEnv);
      noiseEnv.connect(verb);
      noiseSource.start();

      // Schedule noise swells at specific bars
      if (noiseConfig.swells && Array.isArray(noiseConfig.swells)) {
        noiseConfig.swells.forEach(swell => {
          const swellTime = Tone.Time(`${swell.bar}:0:0`).toSeconds();
          const duration = Tone.Time(swell.duration || "2_bars").toSeconds();

          Tone.Transport.schedule((time) => {
            noiseEnv.triggerAttackRelease(duration, time);

            // Apply filter sweep if specified
            if (swell.filter_sweep) {
              const startHz = swell.filter_sweep.start_hz;
              const endHz = swell.filter_sweep.end_hz;
              noiseFilter.frequency.setValueAtTime(startHz, time);
              noiseFilter.frequency.linearRampToValueAtTime(endHz, time + duration);
            }
          }, swellTime);
        });
      }
    }

    function duck(time) {
      return;
    }

    function chordAtBar(barIdx) {
      const chordRoot = chordRootMIDIs[barIdx % chordRootMIDIs.length];
      return buildTriad(chordRoot);
    }

    const totalBars = recipe.sections.reduce((sum, s) => sum + s.bars, 0);

    const sectionTiming = {};
    let currentBar = 0;
    recipe.sections.forEach(section => {
      const sectionName = section.name || `section_${currentBar}`;
      sectionTiming[sectionName] = {
        startBar: currentBar,
        endBar: currentBar + section.bars
      };
      currentBar += section.bars;
    });

    function getCurrentSection(bar) {
      for (const [name, timing] of Object.entries(sectionTiming)) {
        if (bar >= timing.startBar && bar < timing.endBar) {
          return name;
        }
      }
      return null;
    }

    function isInstrumentEnabled(instrumentConfig, currentSection) {
      // If instrument config is empty (no properties besides section_overrides), disable by default
      const configKeys = Object.keys(instrumentConfig || {}).filter(k => k !== 'section_overrides');
      if (configKeys.length === 0) return false;

      if (!currentSection) return true;
      const overrides = instrumentConfig.section_overrides || {};
      const sectionOverride = overrides[currentSection];

      if (sectionOverride && typeof sectionOverride.enabled === 'boolean') {
        return sectionOverride.enabled;
      }

      return true;
    }

    function isDrumPartEnabled(drumPartConfig, currentSection) {
      if (!currentSection) return true;
      const overrides = drumPartConfig.section_overrides || {};
      const sectionOverride = overrides[currentSection];

      if (sectionOverride && typeof sectionOverride.enabled === 'boolean') {
        return sectionOverride.enabled;
      }

      return true;
    }

    let bassPart;
    if (bassConfig.melody) {
      const melody = bassConfig.melody;
      const rhythm = bassConfig.rhythm || "8n";
      const velocities = bassConfig.velocity || melody.map(() => 0.65);
      const startBeat = bassConfig.startBeat || 0;
      const stopBeat = bassConfig.stopBeat || Infinity;

      let stepIndex = 0;
      bassPart = new Tone.Loop(time => {
        const currentBeat = Math.floor(Tone.Transport.ticks / Tone.Time("4n").toTicks());
        const currentBar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(currentBar);

        if (currentBeat >= startBeat && currentBeat < stopBeat && isInstrumentEnabled(bassConfig, currentSection)) {
          const note = melody[stepIndex % melody.length];
          const velocity = velocities[stepIndex % velocities.length];
          if (velocity > 0) {
            bass.triggerAttackRelease(Tone.Frequency(note, "midi"), rhythm, time, velocity);
          }
          stepIndex++;
        }
      }, rhythm).start(0);
    } else {
      const bassPattern = generatePattern(bassConfig.pattern || '16n_groove', 8, bassConfig.patternData);
      const bassVelocities = bassConfig.velocity || [0.65, 0.7, 0.62, 0.68, 0.66, 0.72, 0.64, 0.69];
      const bassPatternWithVel = applyVelocities(bassPattern, bassVelocities);

      bassPart = new Tone.Loop(time => {
        const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(bar);
        const triad = chordAtBar(bar);
        const stepInBar = Math.floor((Tone.Transport.ticks % Tone.Time("1m").toTicks()) / Tone.Time("8n").toTicks());
        const step = bassPatternWithVel[stepInBar % bassPatternWithVel.length];

        if (step && isInstrumentEnabled(bassConfig, currentSection)) {
          const note = triad[step.noteIdx];
          bass.triggerAttackRelease(Tone.Frequency(note, "midi"), "8n", time, step.velocity);
        }
      }, "8n").start(0);
    }

    const subBassVelocities = subBassConfig.velocity || [0.7, 0.7, 0.7, 0.7];
    const subBassPattern = [0, -1, -1, -1];
    const subBassPatternWithVel = applyVelocities(subBassPattern, subBassVelocities);

    const subBassPart = new Tone.Loop(time => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);
      const triad = chordAtBar(bar).map(n => n - 12);
      const stepInBar = Math.floor((Tone.Transport.ticks % Tone.Time("1m").toTicks()) / Tone.Time("4n").toTicks());
      const step = subBassPatternWithVel[stepInBar % subBassPatternWithVel.length];

      if (step && isInstrumentEnabled(subBassConfig, currentSection)) {
        const note = triad[0];
        subBass.triggerAttackRelease(Tone.Frequency(note, "midi"), "4n", time, step.velocity);
      }
    }, "4n").start(0);

    let arpPart;
    if (arpConfig.melody) {
      const melody = arpConfig.melody;
      const rhythm = arpConfig.rhythm || "8n";
      const velocities = arpConfig.velocity || melody.map(() => 0.5);
      const startBeat = arpConfig.startBeat || 0;
      const stopBeat = arpConfig.stopBeat || Infinity;

      let stepIndex = 0;
      arpPart = new Tone.Loop(time => {
        const currentBeat = Math.floor(Tone.Transport.ticks / Tone.Time("4n").toTicks());
        const currentBar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(currentBar);

        if (currentBeat >= startBeat && currentBeat < stopBeat && isInstrumentEnabled(arpConfig, currentSection)) {
          const note = melody[stepIndex % melody.length];
          const velocity = velocities[stepIndex % velocities.length];
          if (velocity > 0) {
            arp.triggerAttackRelease(Tone.Frequency(note, "midi"), rhythm, time, velocity);
          }
          stepIndex++;
        }
      }, rhythm).start(0);
    } else {
      const arpPattern = generatePattern(arpConfig.pattern || 'updown_8n', 8, arpConfig.patternData);
      const arpVelocities = arpConfig.velocity || [0.48, 0.52, 0.45, 0.5, 0.47, 0.53, 0.46, 0.51];
      const arpPatternWithVel = applyVelocities(arpPattern, arpVelocities);

      arpPart = new Tone.Loop(time => {
        const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(bar);
        const triad = chordAtBar(bar).map(n => n + 12);
        const stepInBar = Math.floor((Tone.Transport.ticks % Tone.Time("1m").toTicks()) / Tone.Time("8n").toTicks());
        const step = arpPatternWithVel[stepInBar % arpPatternWithVel.length];

        if (step && isInstrumentEnabled(arpConfig, currentSection)) {
          const note = triad[step.noteIdx];
          arp.triggerAttackRelease(Tone.Frequency(note, "midi"), "8n", time, step.velocity);
        }
      }, "8n").start(0);
    }

    const padPart = new Tone.Loop(time => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);
      const triad = chordAtBar(bar).map(n => n - 12);
      const velocity = (padConfig.velocity && padConfig.velocity[0]) || 0.45;

      if (isInstrumentEnabled(padConfig, currentSection)) {
        pad.triggerAttackRelease(triad.map(n => Tone.Frequency(n, "midi")), "1m", time, velocity);
      }
    }, "1m").start(0);

    let pianoPart;
    if (pianoConfig.melody) {
      const melody = pianoConfig.melody;
      const rhythm = pianoConfig.rhythm || "4n";
      const velocities = pianoConfig.velocity || melody.map(() => 0.7);
      const gate = pianoConfig.gate || 0.9;
      const startBeat = pianoConfig.startBeat || 0;
      const stopBeat = pianoConfig.stopBeat || Infinity;

      let stepIndex = 0;
      pianoPart = new Tone.Loop(time => {
        const currentBeat = Math.floor(Tone.Transport.ticks / Tone.Time("4n").toTicks());
        const currentBar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(currentBar);

        if (currentBeat >= startBeat && currentBeat < stopBeat && isInstrumentEnabled(pianoConfig, currentSection)) {
          const noteOrChord = melody[stepIndex % melody.length];
          const velocity = velocities[stepIndex % velocities.length];

          if (noteOrChord !== 0) {
            const duration = Tone.Time(rhythm).toSeconds() * gate;
            if (Array.isArray(noteOrChord)) {
              piano.triggerAttackRelease(noteOrChord.map(n => Tone.Frequency(n, "midi")), duration, time, velocity);
            } else {
              piano.triggerAttackRelease(Tone.Frequency(noteOrChord, "midi"), duration, time, velocity);
            }
          }
          stepIndex++;
        }
      }, rhythm).start(0);
    } else {
      pianoPart = new Tone.Loop(time => {
        const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(bar);
        const triad = chordAtBar(bar);
        const velocity = (pianoConfig.velocity && pianoConfig.velocity[0]) || 0.65;
        const rhythm = pianoConfig.rhythm || "1m";

        if (isInstrumentEnabled(pianoConfig, currentSection)) {
          piano.triggerAttackRelease(triad.map(n => Tone.Frequency(n, "midi")), rhythm, time, velocity);
        }
      }, pianoConfig.rhythm || "1m").start(0);
    }

    const stringsPart = new Tone.Loop(time => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);
      const octaveShift = stringsConfig.octaveShift || 0;
      const triad = chordAtBar(bar).map(n => n + (octaveShift * 12));
      const velocity = (stringsConfig.velocity && stringsConfig.velocity[0]) || 0.6;
      const rhythm = stringsConfig.rhythm || "1m";

      if (isInstrumentEnabled(stringsConfig, currentSection)) {
        strings.triggerAttackRelease(triad.map(n => Tone.Frequency(n, "midi")), rhythm, time, velocity);
      }
    }, stringsConfig.rhythm || "1m").start(0);

    const kickConfig = drumConfig.kick || {};
    const kickPart = new Tone.Loop(time => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);

      if (isDrumPartEnabled(kickConfig, currentSection)) {
        kick.triggerAttackRelease("C1", "8n", time);
        duck(time);
      }
    }, "4n").start(0);

    const snareConfig = drumConfig.snare || {};
    const snarePart = new Tone.Part((time) => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);

      if (isDrumPartEnabled(snareConfig, currentSection)) {
        snareNoise.triggerAttackRelease("8n", time);
        snareTone.triggerAttackRelease("16n", time);
      }
    }, [
      ["0:2:0", null],
      ["0:3:2", null]
    ]).start(0);
    snarePart.loop = true;
    snarePart.loopEnd = "1m";

    const hatClosedConfig = drumConfig.hat_closed || {};
    const hatPart = new Tone.Part((time) => {
      const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
      const currentSection = getCurrentSection(bar);

      if (isDrumPartEnabled(hatClosedConfig, currentSection)) {
        hat.triggerAttackRelease("32n", time);
      }
    }, [["0:0:2"], ["0:1:2"], ["0:2:2"], ["0:3:2"]]).start(0);
    hatPart.loop = true;
    hatPart.loopEnd = "1m";

    let leadPart;
    if (leadConfig.melody) {
      const melody = leadConfig.melody;
      const rhythm = leadConfig.rhythm || "8n";
      const velocities = leadConfig.velocity || melody.map(() => 0.75);
      const startBeat = leadConfig.startBeat || 0;
      const stopBeat = leadConfig.stopBeat || Infinity;

      let stepIndex = 0;
      leadPart = new Tone.Loop(time => {
        const currentBeat = Math.floor(Tone.Transport.ticks / Tone.Time("4n").toTicks());
        const currentBar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(currentBar);

        if (currentBeat >= startBeat && currentBeat < stopBeat && isInstrumentEnabled(leadConfig, currentSection)) {
          const note = melody[stepIndex % melody.length];
          const velocity = velocities[stepIndex % velocities.length];
          if (velocity > 0) {
            lead.triggerAttackRelease(Tone.Frequency(note, "midi"), rhythm, time, velocity);
          }
          stepIndex++;
        }
      }, rhythm).start(0);
    } else {
      const leadPattern = generatePattern(leadConfig.pattern || 'updown_8n', 8, leadConfig.patternData);
      const leadVelocities = leadConfig.velocity || [0.75, 0.82, 0.78, 0.8];
      const leadPatternWithVel = applyVelocities(leadPattern, leadVelocities);

      leadPart = new Tone.Loop(time => {
        const bar = Math.floor(Tone.Transport.ticks / Tone.Time("1m").toTicks());
        const currentSection = getCurrentSection(bar);
        const triad = chordAtBar(bar).map(n => n + 12);
        const stepInBar = Math.floor((Tone.Transport.ticks % Tone.Time("1m").toTicks()) / Tone.Time("8n").toTicks());
        const step = leadPatternWithVel[stepInBar % leadPatternWithVel.length];

        if (step && isInstrumentEnabled(leadConfig, currentSection)) {
          const note = triad[step.noteIdx];
          lead.triggerAttackRelease(Tone.Frequency(note, "midi"), "8n", time, step.velocity);
        }
      }, "8n").start(0);
    }

    // Apply arp filter automation if specified (Detroit-style filter opening)
    if (arpConfig.automation) {
      Object.entries(arpConfig.automation).forEach(([sectionName, automation]) => {
        const sectionInfo = sectionTiming[sectionName];
        if (!sectionInfo) return;

        const sectionStartTime = Tone.Time(`${sectionInfo.startBar}:0:0`).toSeconds();

        if (automation.filter_cutoff) {
          // Set static filter cutoff for this section
          Tone.Transport.schedule((time) => {
            arpFilter.frequency.setValueAtTime(automation.filter_cutoff, time);
          }, sectionStartTime);
        } else if (automation.filter_sweep) {
          // Sweep filter over duration
          const sweepDuration = Tone.Time(automation.filter_sweep.duration || "4_bars").toSeconds();
          Tone.Transport.schedule((time) => {
            arpFilter.frequency.setValueAtTime(automation.filter_sweep.start_hz, time);
            arpFilter.frequency.linearRampToValueAtTime(automation.filter_sweep.end_hz, time + sweepDuration);
          }, sectionStartTime);
        }
      });
    }

    window.toneJsParts = { bassPart, subBassPart, arpPart, padPart, pianoPart, stringsPart, leadPart, kickPart, snarePart, hatPart };
    window.toneJsInstruments = { bass, subBass, arp, pad, piano, strings, lead, kick, snareNoise, snareTone, hat };
    window.toneJsFx = { verb, chorus, delayDotted8, arpFilter };

    // Apply baseVolume from recipe to each instrument
    const defaultVolumes = {
      bass: 0.7,
      sub_bass: 0.7,
      arp: 0.5,
      pad: 0.15,
      piano: 0.8,
      strings: 0.6,
      lead: 0.7,
      kick: 0.9,
      snare: 0.9,
      hat: 0.5
    };

    const applyBaseVolume = (instrument, configBaseVolume, defaultVol) => {
      if (!instrument || !instrument.volume) return;
      const baseVol = configBaseVolume !== undefined ? configBaseVolume : defaultVol;
      const multiplier = baseVol / defaultVol;
      const volumeDb = baseVol === 0 ? -Infinity : 20 * Math.log10(multiplier);
      instrument.volume.value = volumeDb;
    };

    applyBaseVolume(bass, bassConfig.baseVolume, defaultVolumes.bass);
    applyBaseVolume(subBass, subBassConfig.baseVolume, defaultVolumes.sub_bass);
    applyBaseVolume(arp, arpConfig.baseVolume, defaultVolumes.arp);
    applyBaseVolume(pad, padConfig.baseVolume, defaultVolumes.pad);
    applyBaseVolume(piano, pianoConfig.baseVolume, defaultVolumes.piano);
    applyBaseVolume(strings, stringsConfig.baseVolume, defaultVolumes.strings);
    applyBaseVolume(lead, leadConfig.baseVolume, defaultVolumes.lead);
    applyBaseVolume(kick, drumConfig.kick?.baseVolume, defaultVolumes.kick);
    applyBaseVolume(snareNoise, drumConfig.snare?.baseVolume, defaultVolumes.snare);
    applyBaseVolume(snareTone, drumConfig.snare?.baseVolume, defaultVolumes.snare);
    applyBaseVolume(hat, drumConfig.hat_closed?.baseVolume, defaultVolumes.hat);

    window.cleanupAudio = function() {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      bassPart.dispose();
      subBassPart.dispose();
      arpPart.dispose();
      padPart.dispose();
      leadPart.dispose();
      kickPart.dispose();
      snarePart.dispose();
      hatPart.dispose();
      bass.dispose();
      subBass.dispose();
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
      arpFilter.dispose();
      if (noiseSource) {
        noiseSource.stop();
        noiseSource.dispose();
      }
      if (noiseFilter) noiseFilter.dispose();
      if (noiseEnv) noiseEnv.dispose();
      window.toneJsInitialized = false;
    };
  }

  // ============================================================================
  // AMBIENT ENGINE
  // ============================================================================

  async function initAmbientEngine(recipe) {
    if (!recipe || recipe.type !== 'ambient') {
      console.error('Invalid ambient recipe');
      return;
    }

    const synths = [];
    const lfos = [];
    const instruments = {};

    recipe.layers.forEach((layer, idx) => {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 2, decay: 0, sustain: 1, release: 2 }
      }).toDestination();

      // Store base volume from recipe (for UI to read)
      synth.baseVolume = layer.gain;
      synth.volume.value = Tone.gainToDb(layer.gain);

      if (layer.lfo) {
        const lfo = new Tone.LFO(layer.lfo.rate, layer.freq - layer.lfo.depth, layer.freq + layer.lfo.depth);
        lfo.connect(synth.frequency);
        lfo.start();
        lfos.push(lfo);
      }

      synth.triggerAttack(layer.freq + (layer.detune || 0));
      synths.push(synth);

      // Expose as individual instruments (layer0, layer1, etc.)
      instruments[`layer${idx}`] = synth;
    });

    // Expose both array format (for backwards compatibility) and individual layers
    window.toneJsInstruments = { synths, ...instruments };
    window.cleanupAudio = function() {
      // Release sustained tones before disposing
      synths.forEach(s => {
        s.triggerRelease();
        s.dispose();
      });
      lfos.forEach(l => l.dispose());
      window.toneJsInitialized = false;
    };
  }

  // ============================================================================
  // HUM ENGINE
  // ============================================================================

  async function initHumEngine(recipe) {
    if (!recipe || recipe.type !== 'hum') {
      console.error('Invalid hum recipe - expected recipe.type === "hum"');
      return;
    }

    const synths = [];
    const vibratos = [];
    const instruments = {};

    // Get envelope settings (with defaults)
    const envelope = recipe.envelope || {};
    const attack = envelope.attack || 0.8;
    const release = envelope.release || 0.8;

    recipe.layers.forEach((layer, idx) => {
      // Create synth with specified wave type and envelope
      const synth = new Tone.Synth({
        oscillator: {
          type: layer.wave || 'sine'
        },
        envelope: {
          attack: attack,
          decay: 0,
          sustain: 1,
          release: release
        }
      }).toDestination();

      // Store base volume from recipe (for UI to read)
      synth.baseVolume = layer.gain;
      synth.volume.value = Tone.gainToDb(layer.gain);

      // Calculate final frequency with optional detune
      const freq = layer.freq + (layer.detune || 0);

      // Add vibrato (purr effect) if specified
      if (layer.vibrato) {
        const vib = new Tone.LFO({
          frequency: layer.vibrato.rate,
          min: freq - (freq * layer.vibrato.depth),
          max: freq + (freq * layer.vibrato.depth)
        });
        vib.connect(synth.frequency);
        vib.start();
        vibratos.push(vib);
      }

      // Trigger sustained tone
      synth.triggerAttack(freq);
      synths.push(synth);

      // Expose as individual instruments (layer0, layer1, etc.)
      instruments[`layer${idx}`] = synth;
    });

    // Expose both array format (for backwards compatibility) and individual layers
    window.toneJsInstruments = { synths, vibratos, ...instruments };
    window.cleanupAudio = function() {
      // Release sustained tones before disposing
      synths.forEach(s => {
        s.triggerRelease();
        s.dispose();
      });
      vibratos.forEach(v => v.dispose());
      window.toneJsInitialized = false;
    };
  }

  // ============================================================================
  // DTMF ENGINE
  // ============================================================================

  async function initDTMFEngine(recipe) {
    if (!recipe || recipe.type !== 'dtmf') {
      console.error('Invalid DTMF recipe');
      return;
    }

    // Continuous hum
    const hum = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 1, decay: 0, sustain: 1, release: 1 }
    }).toDestination();
    hum.baseVolume = recipe.hum.gain;
    hum.volume.value = Tone.gainToDb(recipe.hum.gain);
    hum.triggerAttack(recipe.hum.freq);

    // DTMF tone bursts
    const dtmfSynths = [
      new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination(),
      new Tone.Synth({ oscillator: { type: 'sine' } }).toDestination()
    ];

    recipe.tones.forEach(tone => {
      dtmfSynths[0].volume.value = Tone.gainToDb(tone.gain);
      dtmfSynths[1].volume.value = Tone.gainToDb(tone.gain);

      Tone.Transport.schedule((time) => {
        dtmfSynths[0].triggerAttackRelease(tone.freqs[0], tone.duration, time);
        dtmfSynths[1].triggerAttackRelease(tone.freqs[1], tone.duration, time);
      }, tone.time);
    });

    Tone.Transport.start();

    // Expose hum as layer0 (DTMF tones are transient and don't need individual control)
    window.toneJsInstruments = { hum, dtmfSynths, layer0: hum };
    window.cleanupAudio = function() {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      // Release sustained hum tone before disposing
      hum.triggerRelease();
      hum.dispose();
      dtmfSynths.forEach(s => s.dispose());
      window.toneJsInitialized = false;
    };
  }

})();
