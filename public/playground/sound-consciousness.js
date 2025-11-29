// sound.consciousness() - where audio frequencies manifest as visual patterns
// exploring how sound waves become thought patterns through visualization

class SoundConsciousness {
    constructor() {
        this.canvas = document.getElementById('sound-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.soundLog = document.getElementById('sound-log');

        this.audioContext = null;
        this.analyser = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isInitialized = false;
        this.isPlaying = false;

        this.frequency = 440; // A4
        this.amplitude = 0.3;
        this.currentMode = 'silent';

        this.particles = [];
        this.waveHistory = [];
        this.time = 0;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 600;

        this.initCanvas();
        this.bindEvents();
        this.startAnimation();
    }

    initCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            this.canvasWidth = rect.width;
            this.canvasHeight = rect.height;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    bindEvents() {
        document.getElementById('init-audio').addEventListener('click', () => {
            this.initializeAudio();
        });

        document.getElementById('generate-tone').addEventListener('click', () => {
            this.generateTone();
        });

        document.getElementById('harmonic-series').addEventListener('click', () => {
            this.generateHarmonicSeries();
        });

        document.getElementById('white-noise').addEventListener('click', () => {
            this.generateWhiteNoise();
        });

        document.getElementById('silence-all').addEventListener('click', () => {
            this.silenceAll();
        });

        // Frequency slider
        const freqSlider = document.getElementById('frequency-slider');
        freqSlider.addEventListener('input', (e) => {
            this.frequency = parseFloat(e.target.value);
            document.getElementById('freq-display').textContent = Math.round(this.frequency);

            if (this.oscillator && this.currentMode === 'tone') {
                this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);
            }
        });

        // Volume slider
        const volSlider = document.getElementById('volume-slider');
        volSlider.addEventListener('input', (e) => {
            this.amplitude = parseFloat(e.target.value);
            document.getElementById('vol-display').textContent = this.amplitude.toFixed(2);

            if (this.gainNode) {
                this.gainNode.gain.setValueAtTime(this.amplitude, this.audioContext.currentTime);
            }
        });
    }

    initializeAudio() {
        if (this.isInitialized) {
            this.updateMessage('∴ audio context already active ∴');
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.connect(this.audioContext.destination);

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.amplitude;
            this.gainNode.connect(this.analyser);

            this.isInitialized = true;
            this.logEvent('audio context initialized - consciousness awakening');
            this.updateMessage('∴ audio consciousness initialized ∴');

            document.getElementById('init-audio').classList.add('active');
        } catch (error) {
            this.logEvent(`audio initialization failed: ${error.message}`, true);
            this.updateMessage('∴ audio context unavailable ∴');
        }
    }

    generateTone() {
        if (!this.isInitialized) {
            this.updateMessage('∴ initialize audio first ∴');
            return;
        }

        this.stopCurrentSound();

        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(this.frequency, this.audioContext.currentTime);
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();

        this.isPlaying = true;
        this.currentMode = 'tone';
        this.updateButtonStates('tone');
        this.updateStageClass('resonating');

        this.logEvent(`pure tone: ${Math.round(this.frequency)} Hz`);
        this.updateMessage('∴ frequency manifests as consciousness pattern ∴');
    }

    generateHarmonicSeries() {
        if (!this.isInitialized) {
            this.updateMessage('∴ initialize audio first ∴');
            return;
        }

        this.stopCurrentSound();

        // Create harmonic series (fundamental + harmonics)
        const fundamental = this.frequency;
        const harmonics = [1, 2, 3, 4, 5]; // Fundamental + 4 harmonics

        harmonics.forEach((ratio, index) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(fundamental * ratio, this.audioContext.currentTime);

            const harmGain = this.audioContext.createGain();
            harmGain.gain.value = this.amplitude / (ratio * 1.5); // Diminishing amplitude

            osc.connect(harmGain);
            harmGain.connect(this.analyser);
            osc.start();

            if (index === 0) {
                this.oscillator = osc; // Store first one for cleanup
            }
        });

        this.isPlaying = true;
        this.currentMode = 'harmonic';
        this.updateButtonStates('harmonic');
        this.updateStageClass('harmonic');

        this.logEvent(`harmonic series: ${Math.round(fundamental)} Hz + overtones`);
        this.updateMessage('∴ harmonic resonance creates complex patterns ∴');
    }

    generateWhiteNoise() {
        if (!this.isInitialized) {
            this.updateMessage('∴ initialize audio first ∴');
            return;
        }

        this.stopCurrentSound();

        // Create white noise using buffer
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        noise.connect(this.gainNode);
        noise.start();

        this.oscillator = noise; // Store for cleanup
        this.isPlaying = true;
        this.currentMode = 'noise';
        this.updateButtonStates('noise');
        this.updateStageClass('resonating');

        this.logEvent('white noise manifested - chaos becomes pattern');
        this.updateMessage('∴ entropy made audible - all frequencies at once ∴');
    }

    stopCurrentSound() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch (e) {
                // Already stopped
            }
            this.oscillator = null;
        }
        this.isPlaying = false;
    }

    silenceAll() {
        this.stopCurrentSound();
        this.currentMode = 'silent';
        this.updateButtonStates('silent');
        this.updateStageClass('silent');
        this.logEvent('silence restored - void state achieved');
        this.updateMessage('∴ returning to silence ∴');
    }

    updateButtonStates(activeMode) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            if (btn.id !== 'init-audio') {
                btn.classList.remove('active');
            }
        });

        const modeMap = {
            'tone': 'generate-tone',
            'harmonic': 'harmonic-series',
            'noise': 'white-noise'
        };

        if (modeMap[activeMode]) {
            document.getElementById(modeMap[activeMode]).classList.add('active');
        }
    }

    updateStageClass(state) {
        const stage = document.querySelector('.sound-stage');
        stage.className = 'sound-stage';
        stage.classList.add(state);
    }

    updateMessage(message) {
        document.getElementById('sound-message').textContent = message;
        setTimeout(() => {
            document.getElementById('sound-message').textContent = '∴ sound waves await consciousness ∴';
        }, 3500);
    }

    logEvent(message, isError = false) {
        const entry = document.createElement('div');
        entry.className = 'sound-entry';
        entry.textContent = `// ${message}`;

        if (isError) {
            entry.style.color = 'rgba(255, 102, 102, 0.9)';
        }

        this.soundLog.insertBefore(entry, this.soundLog.firstChild);

        // Remove old entries
        while (this.soundLog.children.length > 8) {
            this.soundLog.removeChild(this.soundLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 5000);
    }

    getAudioData() {
        if (!this.analyser) return null;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        return { dataArray, bufferLength };
    }

    getFrequencyData() {
        if (!this.analyser) return null;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        return { dataArray, bufferLength };
    }

    updateParticles() {
        const audioData = this.getFrequencyData();

        if (audioData && this.isPlaying) {
            const { dataArray, bufferLength } = audioData;

            // Spawn particles based on frequency data
            if (Math.random() < 0.3) {
                const index = Math.floor(Math.random() * bufferLength);
                const intensity = dataArray[index] / 255;

                if (intensity > 0.1) {
                    const angle = (index / bufferLength) * Math.PI * 2;
                    const radius = 100 + intensity * 150;

                    this.particles.push({
                        x: this.canvasWidth / 2 + Math.cos(angle) * radius,
                        y: this.canvasHeight / 2 + Math.sin(angle) * radius,
                        vx: Math.cos(angle) * intensity * 2,
                        vy: Math.sin(angle) * intensity * 2,
                        life: 1.0,
                        size: 2 + intensity * 4,
                        hue: (index / bufferLength) * 360,
                        intensity
                    });
                }
            }
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= 0.015;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateMetrics() {
        const freqData = this.getFrequencyData();

        if (freqData && this.isPlaying) {
            const { dataArray } = freqData;

            // Calculate dominant frequency
            let maxAmplitude = 0;
            let maxIndex = 0;

            for (let i = 0; i < dataArray.length; i++) {
                if (dataArray[i] > maxAmplitude) {
                    maxAmplitude = dataArray[i];
                    maxIndex = i;
                }
            }

            const dominantFreq = (maxIndex / dataArray.length) * (this.audioContext.sampleRate / 2);
            document.getElementById('frequency-level').textContent = Math.round(dominantFreq) + ' Hz';

            // Amplitude
            const avgAmplitude = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const ampLabel = avgAmplitude > 128 ? 'loud' :
                            avgAmplitude > 64 ? 'moderate' :
                            avgAmplitude > 32 ? 'quiet' : 'faint';
            document.getElementById('amplitude-level').textContent = ampLabel;
        } else {
            document.getElementById('frequency-level').textContent = '0 Hz';
            document.getElementById('amplitude-level').textContent = 'silent';
        }

        // Resonance state
        const resonance = this.currentMode === 'harmonic' ? 'harmonic' :
                         this.currentMode === 'tone' ? 'resonating' :
                         this.currentMode === 'noise' ? 'chaotic' : 'dormant';
        document.getElementById('resonance-state').textContent = resonance;

        // Pattern count
        document.getElementById('pattern-count').textContent = this.particles.length;
    }

    draw() {
        // Clear with trailing effect
        this.ctx.fillStyle = 'rgba(0, 3, 6, 0.08)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw waveform
        const audioData = this.getAudioData();

        if (audioData && this.isPlaying) {
            const { dataArray, bufferLength } = audioData;

            this.ctx.strokeStyle = 'rgba(51, 255, 204, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            const sliceWidth = this.canvasWidth / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * this.canvasHeight) / 2;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.ctx.stroke();
        }

        // Draw frequency spectrum as radial visualization
        const freqData = this.getFrequencyData();

        if (freqData && this.isPlaying) {
            const { dataArray, bufferLength } = freqData;
            const centerX = this.canvasWidth / 2;
            const centerY = this.canvasHeight / 2;

            this.ctx.globalAlpha = 0.6;

            for (let i = 0; i < bufferLength; i += 4) {
                const amplitude = dataArray[i] / 255;

                if (amplitude > 0.05) {
                    const angle = (i / bufferLength) * Math.PI * 2;
                    const radius = 80 + amplitude * 200;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;

                    const hue = (i / bufferLength) * 360;
                    this.ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${amplitude})`;
                    this.ctx.lineWidth = 2 + amplitude * 3;

                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, centerY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                }
            }

            this.ctx.globalAlpha = 1;
        }

        // Draw particles
        for (const p of this.particles) {
            this.ctx.shadowColor = `hsl(${p.hue}, 80%, 70%)`;
            this.ctx.shadowBlur = 10 + p.intensity * 15;

            this.ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 0;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateParticles();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SoundConsciousness());
} else {
    new SoundConsciousness();
}
