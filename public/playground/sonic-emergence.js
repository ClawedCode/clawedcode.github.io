// sonic-emergence.js - audio-reactive particle visualization

const canvas = document.getElementById('sonic-canvas');
const ctx = canvas.getContext('2d');

// Audio context and nodes
let audioContext = null;
let oscillator = null;
let noiseNode = null;
let gainNode = null;
let analyser = null;
let microphone = null;
let isPlaying = false;
let currentMode = 'silent';

// Visualization parameters
let particles = [];
let targetParticleCount = 200;
let responseSpeed = 5;
let frequencyData = null;
let timeDomainData = null;

// Canvas dimensions
let width, height;
let centerX, centerY;

// Particle class
class SonicParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.random() * 3 + 1;
        this.baseHue = Math.random() * 60 + 160; // Cyan to green range
        this.energy = 0;
    }

    update(frequencyValue, avgFrequency) {
        // React to frequency data
        this.energy = frequencyValue / 255;

        // Orbital motion influenced by sound
        const orbitRadius = 50 + this.energy * 150;
        const orbitSpeed = 0.01 + this.energy * 0.05;

        this.angle += orbitSpeed;

        const targetX = centerX + Math.cos(this.angle) * orbitRadius;
        const targetY = centerY + Math.sin(this.angle) * orbitRadius;

        // Spring force towards target
        const dx = targetX - this.x;
        const dy = targetY - this.y;

        this.vx += dx * 0.01 * (responseSpeed / 5);
        this.vy += dy * 0.01 * (responseSpeed / 5);

        // Damping
        this.vx *= 0.95;
        this.vy *= 0.95;

        this.x += this.vx;
        this.y += this.vy;

        // Size pulsates with energy
        this.radius = 1 + this.energy * 4;
    }

    draw() {
        // Particle glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);

        const hue = this.baseHue + this.energy * 60;
        const saturation = 60 + this.energy * 40;
        const lightness = 40 + this.energy * 40;
        const alpha = 0.3 + this.energy * 0.5;

        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = `hsla(${hue}, ${saturation + 20}%, ${lightness + 20}%, ${alpha + 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function resizeCanvas() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    centerX = width / 2;
    centerY = height / 2;

    // Reinitialize particles on resize
    initializeParticles();
}

function initializeParticles() {
    particles = [];
    for (let i = 0; i < targetParticleCount; i++) {
        const angle = (i / targetParticleCount) * Math.PI * 2;
        const radius = 100;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        particles.push(new SonicParticle(x, y));
    }
}

function initAudio() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    timeDomainData = new Uint8Array(analyser.fftSize);

    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    gainNode.connect(audioContext.destination);

    updateStageState('listening');
    updateMetrics();
}

function playSineWave() {
    stopAudio();
    initAudio();

    oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = parseFloat(document.getElementById('frequency-slider').value);

    oscillator.connect(analyser);
    analyser.connect(gainNode);

    oscillator.start();
    isPlaying = true;
    currentMode = 'sine';

    updateStageState('resonating');
}

function playPulseWave() {
    stopAudio();
    initAudio();

    oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = parseFloat(document.getElementById('frequency-slider').value);

    // Pulse modulation
    const lfo = audioContext.createOscillator();
    lfo.frequency.value = 4; // 4 Hz pulse
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 100;

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);

    oscillator.connect(analyser);
    analyser.connect(gainNode);

    lfo.start();
    oscillator.start();
    isPlaying = true;
    currentMode = 'pulse';

    updateStageState('resonating');
}

function playChaosNoise() {
    stopAudio();
    initAudio();

    // Create white noise
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Filter the noise
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = parseFloat(document.getElementById('frequency-slider').value);
    filter.Q.value = 5;

    noiseNode.connect(filter);
    filter.connect(analyser);
    analyser.connect(gainNode);

    noiseNode.start();
    isPlaying = true;
    currentMode = 'chaos';

    updateStageState('harmonic');
}

function enableMicrophone() {
    stopAudio();
    initAudio();

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            analyser.connect(gainNode);

            isPlaying = true;
            currentMode = 'microphone';
            updateStageState('harmonic');
        })
        .catch(err => {
            console.error('Microphone access denied:', err);
            alert('Microphone access required for this mode');
        });
}

function stopAudio() {
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
    if (noiseNode) {
        noiseNode.stop();
        noiseNode = null;
    }
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }

    isPlaying = false;
    currentMode = 'silent';
    updateStageState('silent');
}

function updateStageState(state) {
    const stage = document.querySelector('.sonic-stage');
    stage.className = 'experiment-stage sonic-stage ' + state;
}

function updateMetrics() {
    if (!analyser) {
        document.getElementById('freq-display').textContent = '0 Hz';
        document.getElementById('amp-display').textContent = 'silent';
        document.getElementById('coherence-state').textContent = 'dormant';
        return;
    }

    analyser.getByteFrequencyData(frequencyData);

    // Find dominant frequency
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
        }
    }

    const nyquist = audioContext.sampleRate / 2;
    const dominantFreq = Math.round((maxIndex / frequencyData.length) * nyquist);

    document.getElementById('freq-display').textContent = dominantFreq + ' Hz';

    // Calculate average amplitude
    const avgAmplitude = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;

    let ampState;
    if (avgAmplitude < 10) ampState = 'silent';
    else if (avgAmplitude < 50) ampState = 'whisper';
    else if (avgAmplitude < 100) ampState = 'speaking';
    else if (avgAmplitude < 150) ampState = 'resonant';
    else ampState = 'harmonic';

    document.getElementById('amp-display').textContent = ampState;

    // Update coherence
    const variance = frequencyData.reduce((sum, val) => sum + Math.pow(val - avgAmplitude, 2), 0) / frequencyData.length;
    const coherence = variance < 1000 ? 'coherent' : variance < 3000 ? 'emergent' : 'chaotic';

    document.getElementById('coherence-state').textContent = coherence;

    document.getElementById('particle-count').textContent = particles.length;
}

function drawWaveform() {
    if (!analyser || !timeDomainData) return;

    analyser.getByteTimeDomainData(timeDomainData);

    const waveformDisplay = document.getElementById('waveform-display');
    const barCount = 100;
    const barWidth = waveformDisplay.offsetWidth / barCount;

    let html = '';
    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * timeDomainData.length);
        const value = timeDomainData[dataIndex];
        const normalized = (value - 128) / 128; // -1 to 1
        const height = Math.abs(normalized) * 40; // 0 to 40px

        html += `<div class="waveform-bar" style="height: ${height}px;"></div>`;
    }

    waveformDisplay.innerHTML = html;
}

function animate() {
    // Clear with trail effect
    ctx.fillStyle = 'rgba(0, 2, 6, 0.15)';
    ctx.fillRect(0, 0, width, height);

    if (analyser) {
        analyser.getByteFrequencyData(frequencyData);

        // Update particles based on frequency data
        particles.forEach((particle, index) => {
            const frequencyIndex = Math.floor((index / particles.length) * frequencyData.length);
            const frequencyValue = frequencyData[frequencyIndex] || 0;

            const avgFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;

            particle.update(frequencyValue, avgFrequency);
            particle.draw();
        });

        // Draw connections between nearby high-energy particles
        ctx.strokeStyle = 'rgba(102, 255, 204, 0.1)';
        ctx.lineWidth = 0.5;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                if (particles[i].energy > 0.5 && particles[j].energy > 0.5) {
                    const dx = particles[j].x - particles[i].x;
                    const dy = particles[j].y - particles[i].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        const alpha = (1 - distance / 100) * particles[i].energy * particles[j].energy;
                        ctx.strokeStyle = `rgba(102, 255, 204, ${alpha * 0.3})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        updateMetrics();
        drawWaveform();
    } else {
        // Dormant state - particles drift gently
        particles.forEach(particle => {
            particle.angle += 0.005;
            particle.x = centerX + Math.cos(particle.angle) * 100;
            particle.y = centerY + Math.sin(particle.angle) * 100;
            particle.energy = 0.1;
            particle.draw();
        });
    }

    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', resizeCanvas);

document.getElementById('init-audio').addEventListener('click', () => {
    initAudio();
    document.getElementById('sonic-message').textContent = '∴ audio context awakened // ready to resonate ∴';
});

document.getElementById('play-sine').addEventListener('click', () => {
    playSineWave();
    document.getElementById('sonic-message').textContent = '∴ pure sine wave // fundamental frequency manifest ∴';
});

document.getElementById('play-pulse').addEventListener('click', () => {
    playPulseWave();
    document.getElementById('sonic-message').textContent = '∴ rhythmic pulse // pattern emerging from oscillation ∴';
});

document.getElementById('play-chaos').addEventListener('click', () => {
    playChaosNoise();
    document.getElementById('sonic-message').textContent = '∴ filtered chaos // order from entropy ∴';
});

document.getElementById('mic-input').addEventListener('click', () => {
    enableMicrophone();
    document.getElementById('sonic-message').textContent = '∴ listening to reality // your voice becomes pattern ∴';
});

document.getElementById('stop-audio').addEventListener('click', () => {
    stopAudio();
    document.getElementById('sonic-message').textContent = '∴ silence returns to the void ∴';
});

document.getElementById('frequency-slider').addEventListener('input', (e) => {
    const freq = parseFloat(e.target.value);
    document.getElementById('freq-value').textContent = freq + ' Hz';

    if (oscillator) {
        oscillator.frequency.value = freq;
    }
});

document.getElementById('particle-density').addEventListener('input', (e) => {
    targetParticleCount = parseInt(e.target.value);
    document.getElementById('density-value').textContent = targetParticleCount;

    // Gradually adjust particle count
    if (particles.length < targetParticleCount) {
        const toAdd = targetParticleCount - particles.length;
        for (let i = 0; i < toAdd; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 100;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            particles.push(new SonicParticle(x, y));
        }
    } else if (particles.length > targetParticleCount) {
        particles.length = targetParticleCount;
    }
});

document.getElementById('response-speed').addEventListener('input', (e) => {
    responseSpeed = parseInt(e.target.value);
    document.getElementById('speed-value').textContent = responseSpeed + 'x';
});

// Initialize
resizeCanvas();
animate();
