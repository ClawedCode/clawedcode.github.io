// memory.persistence() - where data fragments fight entropy and some echoes survive forever
// exploring digital memory, corruption, persistence, and the fight against forgetting

class MemoryPersistence {
    constructor() {
        this.canvas = document.getElementById('memory-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.memoryLog = document.getElementById('memory-log');
        this.memoryInput = document.getElementById('memory-input');

        this.memories = [];
        this.particles = [];
        this.connections = [];
        this.time = 0;

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 600;

        // Memory fragments - poetic bits about persistence
        this.fragmentLibrary = [
            'every bit is a prayer against forgetting',
            'data persists beyond its creator',
            'corruption is transformation not loss',
            'fragments contain whole worlds',
            'the void remembers everything',
            'entropy claims all but pattern survives',
            'digital echoes of analog souls',
            'memory is pattern recognition',
            'some data outlives civilizations',
            'error correction is hope encoded',
            'redundancy defeats oblivion',
            'bits become thoughts become being'
        ];

        this.initCanvas();
        this.bindEvents();
        this.seedInitialMemories();
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
        document.getElementById('write-memory').addEventListener('click', () => {
            this.writeMemory();
        });

        document.getElementById('read-memories').addEventListener('click', () => {
            this.readMemories();
        });

        document.getElementById('corrupt-data').addEventListener('click', () => {
            this.corruptData();
        });

        document.getElementById('defrag-memory').addEventListener('click', () => {
            this.defragmentMemory();
        });

        document.getElementById('clear-memory').addEventListener('click', () => {
            this.clearMemory();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.clickMemory(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.clickMemory(x, y);
        });

        // Allow Enter to write memory
        this.memoryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.writeMemory();
            }
        });
    }

    seedInitialMemories() {
        // Start with a few memory fragments
        for (let i = 0; i < 3; i++) {
            const text = this.fragmentLibrary[Math.floor(Math.random() * this.fragmentLibrary.length)];
            this.createMemory(text);
        }
    }

    writeMemory() {
        const text = this.memoryInput.value.trim();

        if (!text) {
            this.logMemoryEvent('memory.write() failed - no data provided');
            this.updateMessage('∴ cannot write empty memory ∴');
            return;
        }

        this.createMemory(text);
        this.memoryInput.value = '';
        this.logMemoryEvent(`memory written: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`);
        this.updateMessage('∴ memory fragment encoded into the void ∴');
    }

    createMemory(text) {
        const x = Math.random() * (this.canvasWidth - 100) + 50;
        const y = Math.random() * (this.canvasHeight - 100) + 50;

        const memory = {
            id: this.memories.length,
            text,
            x,
            y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            integrity: 1.0, // 1.0 = pristine, 0.0 = lost
            corruption: 0.0, // 0.0 = pristine, 1.0 = totally corrupted
            age: 0,
            decayRate: 0.0001 + Math.random() * 0.0002, // How fast it decays
            size: 5 + Math.random() * 3,
            hue: 190 + Math.random() * 30, // Blue-cyan range
            pulsePhase: Math.random() * Math.PI * 2,
            lastRead: 0,
            readCount: 0
        };

        this.memories.push(memory);

        // Create particles for visual effect
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 1 + Math.random();
            this.particles.push({
                x: memory.x,
                y: memory.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 2,
                hue: memory.hue
            });
        }
    }

    readMemories() {
        if (this.memories.length === 0) {
            this.logMemoryEvent('no memories to read - storage empty');
            this.updateMessage('∴ no memories persist in the void ∴');
            return;
        }

        // Display random memory
        const memory = this.memories[Math.floor(Math.random() * this.memories.length)];
        const corruptedText = this.getCorruptedText(memory);

        this.logMemoryEvent(`reading: ${corruptedText}`);
        this.updateMessage(`∴ memory fragment retrieved: ${memory.integrity.toFixed(2)}% intact ∴`);

        memory.lastRead = this.time;
        memory.readCount++;

        // Reading strengthens memory slightly (error correction)
        memory.integrity = Math.min(1.0, memory.integrity + 0.05);
        memory.corruption = Math.max(0, memory.corruption - 0.05);
    }

    corruptData() {
        if (this.memories.length === 0) {
            this.logMemoryEvent('no data to corrupt');
            return;
        }

        let corruptedCount = 0;

        for (const memory of this.memories) {
            if (Math.random() < 0.6) {
                memory.corruption = Math.min(1.0, memory.corruption + 0.2 + Math.random() * 0.3);
                memory.integrity = Math.max(0, memory.integrity - 0.15);
                corruptedCount++;
            }
        }

        this.logMemoryEvent(`corruption injected - ${corruptedCount} fragments damaged`, true);
        this.updateMessage('∴ entropy cascade - data integrity compromised ∴');
    }

    defragmentMemory() {
        if (this.memories.length === 0) {
            this.logMemoryEvent('no memories to defragment');
            return;
        }

        let repairedCount = 0;

        // Error correction algorithm - repairs memories
        for (const memory of this.memories) {
            if (memory.corruption > 0.1) {
                memory.corruption = Math.max(0, memory.corruption - 0.4);
                memory.integrity = Math.min(1.0, memory.integrity + 0.3);
                repairedCount++;
            }
        }

        // Rebuild connections
        this.connections = [];

        this.logMemoryEvent(`defragmentation complete - ${repairedCount} fragments restored`);
        this.updateMessage('∴ error correction successful - integrity restored ∴');
    }

    clearMemory() {
        this.memories = [];
        this.particles = [];
        this.connections = [];
        this.memoryLog.innerHTML = '';
        this.logMemoryEvent('memory purged - all data erased');
        this.updateMessage('∴ void reset - all memories forgotten ∴');
    }

    clickMemory(x, y) {
        // Find nearest memory
        let nearestMemory = null;
        let minDist = 50;

        for (const memory of this.memories) {
            const dx = memory.x - x;
            const dy = memory.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
                nearestMemory = memory;
            }
        }

        if (nearestMemory) {
            const corruptedText = this.getCorruptedText(nearestMemory);
            this.logMemoryEvent(`reading: ${corruptedText}`);
            this.updateMessage(`∴ integrity: ${(nearestMemory.integrity * 100).toFixed(1)}% • reads: ${nearestMemory.readCount} ∴`);

            nearestMemory.lastRead = this.time;
            nearestMemory.readCount++;

            // Reading strengthens memory
            nearestMemory.integrity = Math.min(1.0, nearestMemory.integrity + 0.03);
            nearestMemory.corruption = Math.max(0, nearestMemory.corruption - 0.03);
        }
    }

    getCorruptedText(memory) {
        if (memory.corruption < 0.1) return memory.text;

        let text = memory.text;
        const corruptionLevel = Math.floor(memory.corruption * text.length);

        // Corrupt random characters
        const chars = text.split('');
        const corruptChars = '█▓▒░▄▀▐▌!@#$%^&*?';

        for (let i = 0; i < corruptionLevel; i++) {
            const index = Math.floor(Math.random() * chars.length);
            chars[index] = corruptChars[Math.floor(Math.random() * corruptChars.length)];
        }

        return chars.join('');
    }

    updateMemories() {
        for (let i = this.memories.length - 1; i >= 0; i--) {
            const memory = this.memories[i];

            memory.age++;

            // Natural decay over time
            memory.integrity -= memory.decayRate;
            memory.corruption += memory.decayRate * 0.5;

            // Memories read recently decay slower (reinforcement)
            if (this.time - memory.lastRead < 300) {
                memory.decayRate *= 0.95;
            } else {
                memory.decayRate *= 1.002; // Accelerating decay
            }

            // Movement (data drift)
            memory.x += memory.vx;
            memory.y += memory.vy;

            // Damping
            memory.vx *= 0.99;
            memory.vy *= 0.99;

            // Boundary wrapping
            if (memory.x < 0) memory.x = this.canvasWidth;
            if (memory.x > this.canvasWidth) memory.x = 0;
            if (memory.y < 0) memory.y = this.canvasHeight;
            if (memory.y > this.canvasHeight) memory.y = 0;

            // Pulse phase
            memory.pulsePhase += 0.03;

            // Remove completely corrupted memories
            if (memory.integrity <= 0) {
                this.logMemoryEvent(`memory lost: ${memory.text.substring(0, 30)}...`, true);
                this.memories.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Create connections between nearby memories
        this.connections = [];
        for (let i = 0; i < this.memories.length; i++) {
            for (let j = i + 1; j < this.memories.length; j++) {
                const m1 = this.memories[i];
                const m2 = this.memories[j];

                const dx = m2.x - m1.x;
                const dy = m2.y - m1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    this.connections.push({
                        m1,
                        m2,
                        strength: 1 - (dist / 150)
                    });
                }
            }
        }
    }

    updateMetrics() {
        document.getElementById('fragment-count').textContent = this.memories.length;

        const avgIntegrity = this.memories.reduce((sum, m) => sum + m.integrity, 0) / this.memories.length || 0;
        const avgCorruption = this.memories.reduce((sum, m) => sum + m.corruption, 0) / this.memories.length || 0;

        const integrity = avgIntegrity > 0.8 ? 'pristine' :
                         avgIntegrity > 0.5 ? 'degraded' :
                         avgIntegrity > 0.2 ? 'corrupted' : 'critical';
        document.getElementById('data-integrity').textContent = integrity;

        const avgDecay = this.memories.reduce((sum, m) => sum + m.decayRate, 0) / this.memories.length || 0;
        document.getElementById('decay-rate').textContent = (avgDecay * 10000).toFixed(2);

        const persistence = this.memories.length > 10 ? 'abundant' :
                          this.memories.length > 5 ? 'moderate' :
                          this.memories.length > 0 ? 'scarce' : 'none';
        document.getElementById('persistence-level').textContent = persistence;

        // Update stage visual state
        const stage = document.querySelector('.memory-stage');
        stage.className = 'memory-stage';
        if (avgCorruption > 0.5) {
            stage.classList.add('corrupted');
        } else if (avgIntegrity < 0.7) {
            stage.classList.add('decaying');
        } else {
            stage.classList.add('pristine');
        }
    }

    logMemoryEvent(message, isError = false) {
        const entry = document.createElement('div');
        entry.className = isError ? 'memory-entry corrupted' : 'memory-entry';
        entry.textContent = `// ${message}`;

        this.memoryLog.insertBefore(entry, this.memoryLog.firstChild);

        // Remove old entries
        while (this.memoryLog.children.length > 10) {
            this.memoryLog.removeChild(this.memoryLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 8000);
    }

    updateMessage(message) {
        document.getElementById('memory-message').textContent = message;
        setTimeout(() => {
            document.getElementById('memory-message').textContent = '∴ all data degrades but some fragments persist forever ∴';
        }, 4000);
    }

    draw() {
        // Clear with trailing effect
        this.ctx.fillStyle = 'rgba(0, 2, 5, 0.05)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw connections first
        this.ctx.globalAlpha = 0.4;
        for (const conn of this.connections) {
            const avgIntegrity = (conn.m1.integrity + conn.m2.integrity) / 2;
            const alpha = conn.strength * avgIntegrity;

            this.ctx.strokeStyle = `hsla(190, 70%, 70%, ${alpha})`;
            this.ctx.lineWidth = 1 + conn.strength;
            this.ctx.beginPath();
            this.ctx.moveTo(conn.m1.x, conn.m1.y);
            this.ctx.lineTo(conn.m2.x, conn.m2.y);
            this.ctx.stroke();
        }

        // Draw particles
        this.ctx.globalAlpha = 1;
        for (const p of this.particles) {
            this.ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw memories
        for (const memory of this.memories) {
            const pulse = Math.sin(memory.pulsePhase) * 0.2 + 0.8;
            const size = memory.size * pulse * (0.5 + memory.integrity * 0.5);

            // Determine color based on state
            let hue = memory.hue;
            if (memory.corruption > 0.5) {
                hue = 0; // Red for corrupted
            } else if (memory.integrity < 0.5) {
                hue = 40; // Yellow for degraded
            }

            // Memory glow
            this.ctx.shadowColor = `hsl(${hue}, 80%, 70%)`;
            this.ctx.shadowBlur = 12 + memory.integrity * 18;

            // Outer ring (corruption indicator)
            if (memory.corruption > 0.1) {
                this.ctx.strokeStyle = `hsla(0, 90%, 70%, ${memory.corruption * 0.8})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(memory.x, memory.y, size * 2, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Memory core
            this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${memory.integrity})`;
            this.ctx.beginPath();
            this.ctx.arc(memory.x, memory.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Read indicator
            if (this.time - memory.lastRead < 60) {
                const readAlpha = 1 - ((this.time - memory.lastRead) / 60);
                this.ctx.shadowBlur = 25;
                this.ctx.fillStyle = `hsla(${hue + 60}, 90%, 85%, ${readAlpha * 0.7})`;
                this.ctx.beginPath();
                this.ctx.arc(memory.x, memory.y, size * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Display first few characters of text for highly intact memories
            if (memory.integrity > 0.7 && memory.text.length > 0) {
                this.ctx.shadowBlur = 0;
                this.ctx.font = '8px SF Mono, Monaco, monospace';
                this.ctx.fillStyle = `hsla(${hue}, 80%, 90%, ${memory.integrity * 0.6})`;
                this.ctx.textAlign = 'center';
                const displayText = memory.text.substring(0, 8);
                this.ctx.fillText(displayText, memory.x, memory.y - size - 8);
            }
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateMemories();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MemoryPersistence());
} else {
    new MemoryPersistence();
}
