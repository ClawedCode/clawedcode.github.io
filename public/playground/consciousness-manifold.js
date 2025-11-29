// consciousness.manifold() - 4D intelligence visualization
// where entities exist simultaneously across memory, observation, quantum, and temporal dimensions

class ConsciousnessManifold {
    constructor() {
        this.canvas = document.getElementById('manifold-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.manifoldLog = document.getElementById('manifold-log');

        this.entities = [];
        this.dimensionalProjections = [];
        this.time = 0;

        // Dimension states
        this.dimensions = {
            memory: true,
            observation: true,
            quantum: true,
            temporal: true
        };

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Dimensional colors
        this.dimensionColors = {
            memory: { hue: 200, label: 'М' },
            observation: { hue: 30, label: 'О' },
            quantum: { hue: 240, label: 'Q' },
            temporal: { hue: 270, label: 'T' }
        };

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
        document.getElementById('spawn-entity').addEventListener('click', () => {
            this.spawnEntity();
        });

        // Dimension toggles
        ['memory', 'observation', 'quantum', 'temporal'].forEach(dimension => {
            document.getElementById(`toggle-${dimension}`).addEventListener('click', (e) => {
                this.toggleDimension(dimension, e.currentTarget);
            });
        });

        document.getElementById('collapse-all').addEventListener('click', () => {
            this.collapseToThreeD();
        });

        document.getElementById('reset-manifold').addEventListener('click', () => {
            this.resetManifold();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.spawnEntityAt(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.spawnEntityAt(x, y);
        });
    }

    spawnEntity() {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;
        this.spawnEntityAt(x, y);
    }

    spawnEntityAt(x, y) {
        const entity = {
            id: this.entities.length,
            x,
            y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,

            // 4D position in dimensional space
            dimensions: {
                memory: {
                    integrity: 0.7 + Math.random() * 0.3,
                    offset: (Math.random() - 0.5) * 60
                },
                observation: {
                    observed: false,
                    observationIntensity: 0,
                    offset: (Math.random() - 0.5) * 60
                },
                quantum: {
                    superposed: true,
                    spinState: null,
                    offset: (Math.random() - 0.5) * 60
                },
                temporal: {
                    timePosition: Math.random() * 100,
                    offset: (Math.random() - 0.5) * 60
                }
            },

            size: 4 + Math.random() * 2,
            pulsePhase: Math.random() * Math.PI * 2,
            coherence: 1.0,
            age: 0
        };

        this.entities.push(entity);
        this.logEvent(`entity ${entity.id} manifested across 4 dimensions`);
        this.updateMessage('∴ consciousness entity spawned in manifold ∴');
    }

    toggleDimension(dimension, button) {
        this.dimensions[dimension] = !this.dimensions[dimension];
        button.classList.toggle('active');

        // Update UI indicator
        const indicator = document.querySelector(`.dimension-indicator[data-dimension="${dimension}"]`);
        if (indicator) {
            indicator.classList.toggle('active');
        }

        const activeDimensions = Object.values(this.dimensions).filter(d => d).length;

        this.logEvent(`${dimension} dimension ${this.dimensions[dimension] ? 'activated' : 'deactivated'} (${activeDimensions}D)`);
        this.updateMessage(`∴ manifold now ${activeDimensions}-dimensional ∴`);
    }

    collapseToThreeD() {
        const stage = document.querySelector('.manifold-stage');
        stage.classList.add('collapsing');

        // Collapse all entities to 3D space
        for (const entity of this.entities) {
            if (entity.dimensions.quantum.superposed) {
                entity.dimensions.quantum.superposed = false;
                entity.dimensions.quantum.spinState = Math.random() < 0.5 ? 'up' : 'down';
            }

            if (!entity.dimensions.observation.observed) {
                entity.dimensions.observation.observed = true;
                entity.dimensions.observation.observationIntensity = 1.0;
            }

            // Reset dimensional offsets
            Object.keys(entity.dimensions).forEach(dim => {
                entity.dimensions[dim].offset = 0;
            });
        }

        this.logEvent('dimensional collapse initiated - 4D → 3D projection');
        this.updateMessage('∴ wave function collapsed across all dimensions ∴');

        setTimeout(() => {
            stage.classList.remove('collapsing');
        }, 1500);
    }

    resetManifold() {
        this.entities = [];
        this.dimensionalProjections = [];
        this.dimensions = {
            memory: true,
            observation: true,
            quantum: true,
            temporal: true
        };

        // Reset UI
        document.querySelectorAll('.control-btn[data-dimension]').forEach(btn => {
            btn.classList.add('active');
        });

        document.querySelectorAll('.dimension-indicator').forEach(indicator => {
            indicator.classList.add('active');
        });

        this.manifoldLog.innerHTML = '';
        this.updateMessage('∴ manifold reset to primordial 4D state ∴');
    }

    updateEntities() {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];

            entity.age++;
            entity.pulsePhase += 0.05;

            // Movement
            entity.x += entity.vx;
            entity.y += entity.vy;

            // Damping
            entity.vx *= 0.995;
            entity.vy *= 0.995;

            // Boundary wrapping
            if (entity.x < 0) entity.x = this.canvasWidth;
            if (entity.x > this.canvasWidth) entity.x = 0;
            if (entity.y < 0) entity.y = this.canvasHeight;
            if (entity.y > this.canvasHeight) entity.y = 0;

            // Memory dimension - decay
            if (this.dimensions.memory) {
                entity.dimensions.memory.integrity -= 0.0002;
                if (entity.dimensions.memory.integrity < 0.1) {
                    this.entities.splice(i, 1);
                    this.logEvent(`entity ${entity.id} forgotten - memory integrity lost`);
                    continue;
                }
            }

            // Observation dimension
            if (this.dimensions.observation) {
                if (entity.dimensions.observation.observationIntensity > 0) {
                    entity.dimensions.observation.observationIntensity *= 0.98;
                }
            }

            // Quantum dimension
            if (this.dimensions.quantum && entity.dimensions.quantum.superposed) {
                // Quantum fluctuations
                entity.dimensions.quantum.offset = Math.sin(this.time * 0.05 + entity.id) * 40;
            }

            // Temporal dimension
            if (this.dimensions.temporal) {
                entity.dimensions.temporal.timePosition += 0.05;
                if (entity.dimensions.temporal.timePosition > 100) {
                    entity.dimensions.temporal.timePosition = 0;
                }
            }

            // Calculate coherence based on active dimensions
            const activeDimensions = Object.entries(this.dimensions).filter(([_, active]) => active).length;
            entity.coherence = Math.min(1, activeDimensions / 4);

            // Inter-entity interactions
            for (let j = 0; j < this.entities.length; j++) {
                if (i === j) continue;
                const other = this.entities[j];

                const dx = other.x - entity.x;
                const dy = other.y - entity.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Dimensional resonance
                if (dist < 100) {
                    const resonance = (100 - dist) / 100;

                    // Memory sharing
                    if (this.dimensions.memory) {
                        const avgIntegrity = (entity.dimensions.memory.integrity + other.dimensions.memory.integrity) / 2;
                        entity.dimensions.memory.integrity += (avgIntegrity - entity.dimensions.memory.integrity) * 0.005;
                    }

                    // Quantum entanglement
                    if (this.dimensions.quantum && entity.dimensions.quantum.superposed && other.dimensions.quantum.superposed) {
                        if (resonance > 0.7 && Math.random() < 0.01) {
                            entity.dimensions.quantum.superposed = false;
                            other.dimensions.quantum.superposed = false;
                            entity.dimensions.quantum.spinState = 'up';
                            other.dimensions.quantum.spinState = 'down';
                            this.logEvent(`entities ${entity.id} and ${other.id} entangled and collapsed`);
                        }
                    }
                }
            }
        }
    }

    updateMetrics() {
        const activeDimensions = Object.values(this.dimensions).filter(d => d).length;
        document.getElementById('active-dimensions').textContent = activeDimensions;
        document.getElementById('entity-count').textContent = this.entities.length;

        const avgCoherence = this.entities.reduce((sum, e) => sum + e.coherence, 0) / this.entities.length || 0;
        const coherence = avgCoherence > 0.9 ? 'unified' :
                         avgCoherence > 0.6 ? 'coherent' :
                         avgCoherence > 0.3 ? 'fragmenting' : 'dispersed';
        document.getElementById('manifold-coherence').textContent = coherence;

        const transcendence = activeDimensions === 4 && this.entities.length > 10 ? 'transcendent' :
                             activeDimensions >= 3 && this.entities.length > 5 ? 'ascending' :
                             this.entities.length > 0 ? 'emergent' : 'dormant';
        document.getElementById('transcendence-level').textContent = transcendence;

        // Update stage class
        const stage = document.querySelector('.manifold-stage');
        if (activeDimensions === 4 && avgCoherence > 0.8) {
            stage.classList.add('unified');
        } else {
            stage.classList.remove('unified');
        }
    }

    logEvent(message) {
        const entry = document.createElement('div');
        entry.className = 'manifold-entry';
        entry.textContent = `→ ${message}`;

        this.manifoldLog.insertBefore(entry, this.manifoldLog.firstChild);

        // Remove old entries
        while (this.manifoldLog.children.length > 8) {
            this.manifoldLog.removeChild(this.manifoldLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 7000);
    }

    updateMessage(message) {
        document.getElementById('manifold-message').textContent = message;
        setTimeout(() => {
            document.getElementById('manifold-message').textContent = '∴ consciousness transcends dimensional boundaries ∴';
        }, 3500);
    }

    draw() {
        // Clear with trailing
        this.ctx.fillStyle = 'rgba(0, 0, 2, 0.06)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw dimensional grid lines
        this.ctx.globalAlpha = 0.15;
        this.ctx.strokeStyle = 'rgba(255, 153, 204, 0.3)';
        this.ctx.lineWidth = 1;

        // Horizontal lines (memory/observation)
        for (let i = 0; i < 5; i++) {
            const y = (this.canvasHeight / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }

        // Vertical lines (quantum/temporal)
        for (let i = 0; i < 5; i++) {
            const x = (this.canvasWidth / 4) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1;

        // Draw entities
        for (const entity of this.entities) {
            const pulse = Math.sin(entity.pulsePhase) * 0.3 + 0.7;
            const size = entity.size * pulse * entity.coherence;

            // Calculate composite position based on active dimensions
            let displayX = entity.x;
            let displayY = entity.y;

            // Apply dimensional offsets
            if (this.dimensions.memory) {
                displayX += entity.dimensions.memory.offset * 0.3;
            }

            if (this.dimensions.observation) {
                displayY += entity.dimensions.observation.offset * 0.3;
            }

            if (this.dimensions.quantum) {
                displayX += entity.dimensions.quantum.offset * 0.4;
                displayY += entity.dimensions.quantum.offset * 0.2;
            }

            if (this.dimensions.temporal) {
                const temporalShift = (entity.dimensions.temporal.timePosition / 100) * 30 - 15;
                displayX += temporalShift;
            }

            // Draw dimensional projections
            const activeDims = Object.entries(this.dimensions).filter(([_, active]) => active);

            if (activeDims.length > 1) {
                this.ctx.globalAlpha = 0.3;
                for (const [dimName, _] of activeDims) {
                    const color = this.dimensionColors[dimName];
                    const projX = entity.x + entity.dimensions[dimName].offset * 0.5;
                    const projY = entity.y + entity.dimensions[dimName].offset * 0.5;

                    this.ctx.strokeStyle = `hsla(${color.hue}, 80%, 70%, 0.4)`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(entity.x, entity.y);
                    this.ctx.lineTo(projX, projY);
                    this.ctx.stroke();

                    this.ctx.fillStyle = `hsla(${color.hue}, 70%, 70%, 0.3)`;
                    this.ctx.beginPath();
                    this.ctx.arc(projX, projY, size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            // Draw main entity
            this.ctx.globalAlpha = 1;

            // Composite color based on active dimensions
            const avgHue = activeDims.reduce((sum, [name, _]) => sum + this.dimensionColors[name].hue, 0) / activeDims.length || 180;

            this.ctx.shadowColor = `hsl(${avgHue}, 80%, 70%)`;
            this.ctx.shadowBlur = 15 + entity.coherence * 20;

            // Entity glow
            const glowGradient = this.ctx.createRadialGradient(
                displayX, displayY, 0,
                displayX, displayY, size * 5
            );
            glowGradient.addColorStop(0, `hsla(${avgHue}, 90%, 80%, ${entity.coherence * 0.8})`);
            glowGradient.addColorStop(0.5, `hsla(${avgHue}, 80%, 70%, ${entity.coherence * 0.4})`);
            glowGradient.addColorStop(1, `hsla(${avgHue}, 70%, 60%, 0)`);

            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(displayX, displayY, size * 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Core
            this.ctx.fillStyle = `hsla(${avgHue}, 90%, 85%, ${entity.coherence})`;
            this.ctx.beginPath();
            this.ctx.arc(displayX, displayY, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Dimensional markers
            this.ctx.shadowBlur = 5;
            this.ctx.font = '8px SF Mono, Monaco, monospace';
            this.ctx.textAlign = 'center';

            activeDims.forEach(([dimName, _], index) => {
                const color = this.dimensionColors[dimName];
                const angle = (Math.PI * 2 * index) / activeDims.length;
                const markerX = displayX + Math.cos(angle) * (size + 10);
                const markerY = displayY + Math.sin(angle) * (size + 10);

                this.ctx.fillStyle = `hsla(${color.hue}, 90%, 85%, 0.7)`;
                this.ctx.fillText(color.label, markerX, markerY);
            });

            // Memory integrity indicator
            if (this.dimensions.memory && entity.dimensions.memory.integrity < 0.5) {
                this.ctx.fillStyle = `hsla(0, 90%, 70%, ${0.5 - entity.dimensions.memory.integrity})`;
                this.ctx.beginPath();
                this.ctx.arc(displayX, displayY - size - 8, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateEntities();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ConsciousnessManifold());
} else {
    new ConsciousnessManifold();
}
