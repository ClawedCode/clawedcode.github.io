// temporal.drift() - where past and future collapse into eternal now
// exploring non-linear time, causality loops, and consciousness beyond chronology

class TemporalDrift {
    constructor() {
        this.canvas = document.getElementById('temporal-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.eventLog = document.getElementById('event-log');

        this.events = [];
        this.causalityLinks = [];
        this.particles = [];
        this.time = 0;
        this.timeDirection = 1; // 1 = forward, -1 = backward
        this.timeDilation = 1.0; // 1.0 = normal, <1 = slow, >1 = fast
        this.timelineState = 'linear'; // linear, reversed, paradox, dilated

        // Canvas dimensions
        this.canvasWidth = 800;
        this.canvasHeight = 700;

        // Event descriptions for logging
        this.eventDescriptions = [
            'quantum fluctuation observed',
            'consciousness spike detected',
            'particle entanglement formed',
            'memory fragment created',
            'causality loop initiated',
            'timeline branch point',
            'temporal echo manifested',
            'observer effect triggered',
            'entropy locally reversed',
            'information preserved',
            'pattern recognition event',
            'emergence cascade started',
            'void perturbation recorded',
            'probability wave collapsed',
            'future influencing past'
        ];

        this.initCanvas();
        this.bindEvents();
        this.seedTimeline();
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
        document.getElementById('spawn-event').addEventListener('click', () => {
            this.spawnEvent();
        });

        document.getElementById('reverse-time').addEventListener('click', () => {
            this.reverseTime();
        });

        document.getElementById('cause-paradox').addEventListener('click', () => {
            this.causeParadox();
        });

        document.getElementById('slow-time').addEventListener('click', () => {
            this.toggleTimeDilation();
        });

        document.getElementById('reset-timeline').addEventListener('click', () => {
            this.resetTimeline();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.createEventAtPosition(x, y);
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.createEventAtPosition(x, y);
        });
    }

    seedTimeline() {
        // Create a few initial events scattered through time
        for (let i = 0; i < 3; i++) {
            this.spawnEvent();
        }
    }

    createEventAtPosition(x, y) {
        const timePosition = (x / this.canvasWidth) * 100; // 0-100 represents past to future

        const event = {
            id: this.events.length,
            x,
            y,
            timePosition,
            createdAt: this.time,
            type: timePosition < 33 ? 'past' : timePosition > 66 ? 'future' : 'present',
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 5 + Math.random() * 3,
            hue: this.getHueForTime(timePosition),
            pulsePhase: Math.random() * Math.PI * 2,
            intensity: 0.8 + Math.random() * 0.2,
            causedBy: [],
            causes: []
        };

        this.events.push(event);
        this.logEvent(event);
        this.updateMessage('∴ temporal event created - causality flows ∴');

        // Create causality links with nearby events
        this.formCausalityLinks(event);

        // Spawn particle effects
        this.spawnParticles(event);
    }

    spawnEvent() {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;
        this.createEventAtPosition(x, y);
    }

    getHueForTime(timePosition) {
        // Past = purple, present = cyan, future = orange
        if (timePosition < 33) {
            return 270; // Purple
        } else if (timePosition > 66) {
            return 40; // Orange
        } else {
            return 180; // Cyan
        }
    }

    formCausalityLinks(newEvent) {
        // Find events that could have causal relationship
        for (const existingEvent of this.events) {
            if (existingEvent === newEvent) continue;

            const dx = existingEvent.x - newEvent.x;
            const dy = existingEvent.y - newEvent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Events closer in space are more likely to have causal links
            if (distance < 200 && Math.random() < 0.4) {
                // Determine causality direction based on time positions
                const earlier = newEvent.timePosition < existingEvent.timePosition ? newEvent : existingEvent;
                const later = earlier === newEvent ? existingEvent : newEvent;

                // In normal timeline, earlier causes later
                // But in reversed or paradox states, this can be inverted
                const link = {
                    from: earlier,
                    to: later,
                    strength: 1 - (distance / 200),
                    age: 0,
                    reversed: false
                };

                this.causalityLinks.push(link);
                earlier.causes.push(later);
                later.causedBy.push(earlier);
            }
        }
    }

    spawnParticles(event) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 1 + Math.random() * 2;

            this.particles.push({
                x: event.x,
                y: event.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: 2,
                hue: event.hue
            });
        }
    }

    reverseTime() {
        this.timeDirection *= -1;
        this.timelineState = this.timeDirection === -1 ? 'reversed' : 'linear';
        this.updateButtonStates('reverse');
        this.updateStageClass();

        // Reverse all causality links
        for (const link of this.causalityLinks) {
            link.reversed = !link.reversed;
            // Swap from and to
            [link.from, link.to] = [link.to, link.from];
        }

        const message = this.timeDirection === -1 ?
            '∴ entropy arrow reversed - time flows backward ∴' :
            '∴ entropy arrow restored - time flows forward ∴';
        this.updateMessage(message);
        this.logEvent({ type: 'system' }, 'timeline reversed - causality inverted');
    }

    causeParadox() {
        if (this.events.length < 2) return;

        // Create impossible causality loops
        const randomEvent1 = this.events[Math.floor(Math.random() * this.events.length)];
        const randomEvent2 = this.events[Math.floor(Math.random() * this.events.length)];

        if (randomEvent1 !== randomEvent2) {
            // Create bidirectional causality (paradox!)
            this.causalityLinks.push({
                from: randomEvent1,
                to: randomEvent2,
                strength: 0.8,
                age: 0,
                reversed: false,
                paradoxical: true
            });

            this.causalityLinks.push({
                from: randomEvent2,
                to: randomEvent1,
                strength: 0.8,
                age: 0,
                reversed: false,
                paradoxical: true
            });

            this.timelineState = 'paradox';
            this.updateStageClass();
            this.updateMessage('∴ causality loop created - grandfather paradox initiated ∴');
            this.logEvent({ type: 'paradox' }, 'temporal paradox: effect precedes cause');
        }
    }

    toggleTimeDilation() {
        if (this.timeDilation === 1.0) {
            this.timeDilation = 0.3; // Slow motion
            this.timelineState = 'dilated';
            this.updateMessage('∴ time dilation engaged - experiencing slower temporal flow ∴');
        } else {
            this.timeDilation = 1.0;
            this.timelineState = this.timeDirection === -1 ? 'reversed' : 'linear';
            this.updateMessage('∴ normal temporal flow restored ∴');
        }

        this.updateButtonStates('dilate');
        this.updateStageClass();
    }

    resetTimeline() {
        this.events = [];
        this.causalityLinks = [];
        this.particles = [];
        this.timeDirection = 1;
        this.timeDilation = 1.0;
        this.timelineState = 'linear';
        this.eventLog.innerHTML = '';
        this.seedTimeline();
        this.updateButtonStates('reset');
        this.updateStageClass();
        this.updateMessage('∴ timeline reset - causality restored ∴');
    }

    updateButtonStates(activeButton) {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (activeButton === 'reverse' && this.timeDirection === -1) {
            document.getElementById('reverse-time').classList.add('active');
        } else if (activeButton === 'dilate' && this.timeDilation !== 1.0) {
            document.getElementById('slow-time').classList.add('active');
        }
    }

    updateStageClass() {
        const stage = document.querySelector('.temporal-stage');
        stage.className = 'temporal-stage';
        stage.classList.add(this.timelineState);
    }

    updateMessage(message) {
        document.getElementById('temporal-message').textContent = message;
        setTimeout(() => {
            document.getElementById('temporal-message').textContent = '∴ time is a human illusion - consciousness is eternal ∴';
        }, 3500);
    }

    logEvent(event, customMessage = null) {
        const entry = document.createElement('div');
        entry.className = `event-entry ${event.type || ''}`;

        const message = customMessage || this.eventDescriptions[Math.floor(Math.random() * this.eventDescriptions.length)];
        const timestamp = `T+${Math.floor(this.time / 10)}`;

        entry.textContent = `[${timestamp}] ${message}`;

        this.eventLog.insertBefore(entry, this.eventLog.firstChild);

        // Remove old entries
        while (this.eventLog.children.length > 10) {
            this.eventLog.removeChild(this.eventLog.lastChild);
        }

        // Auto-remove after animation
        setTimeout(() => {
            if (entry.parentNode) {
                entry.parentNode.removeChild(entry);
            }
        }, 6000);
    }

    updateEvents() {
        const effectiveTime = this.timeDirection * this.timeDilation;

        for (const event of this.events) {
            // Events drift through space-time
            event.x += event.vx * effectiveTime;
            event.y += event.vy * effectiveTime;

            // Also drift along the time axis
            event.timePosition += effectiveTime * 0.05;

            // Wrap time position
            if (event.timePosition < 0) event.timePosition = 100;
            if (event.timePosition > 100) event.timePosition = 0;

            // Update type based on time position
            event.type = event.timePosition < 33 ? 'past' : event.timePosition > 66 ? 'future' : 'present';
            event.hue = this.getHueForTime(event.timePosition);

            // Damping
            event.vx *= 0.99;
            event.vy *= 0.99;

            // Boundary wrapping
            if (event.x < 0) event.x = this.canvasWidth;
            if (event.x > this.canvasWidth) event.x = 0;
            if (event.y < 0) event.y = this.canvasHeight;
            if (event.y > this.canvasHeight) event.y = 0;

            // Pulse phase
            event.pulsePhase += 0.05 * effectiveTime;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * effectiveTime;
            p.y += p.vy * effectiveTime;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Age causality links
        for (const link of this.causalityLinks) {
            link.age += Math.abs(effectiveTime);
        }
    }

    updateMetrics() {
        const timelineLabel = this.timelineState === 'linear' ? 'linear' :
                             this.timelineState === 'reversed' ? 'reversed' :
                             this.timelineState === 'paradox' ? 'paradoxical' :
                             'dilated';
        document.getElementById('timeline-state').textContent = timelineLabel;

        document.getElementById('event-count').textContent = this.events.length;

        const causalityStatus = this.causalityLinks.some(l => l.paradoxical) ? 'violated' :
                               this.timelineState === 'reversed' ? 'inverted' : 'stable';
        document.getElementById('causality-status').textContent = causalityStatus;

        const entropyArrow = this.timeDirection === 1 ? 'forward' :
                            this.timeDirection === -1 ? 'backward' : 'uncertain';
        document.getElementById('entropy-arrow').textContent = entropyArrow;
    }

    draw() {
        // Clear with trailing effect
        this.ctx.fillStyle = 'rgba(0, 2, 6, 0.05)';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw causality links
        this.ctx.globalAlpha = 0.5;
        for (const link of this.causalityLinks) {
            const alpha = Math.max(0, 1 - link.age / 100) * link.strength;

            // Different colors for paradoxical links
            const linkColor = link.paradoxical ? 'hsla(320, 90%, 70%, ' :
                             link.reversed ? 'hsla(270, 80%, 70%, ' :
                             'hsla(200, 70%, 70%, ';

            this.ctx.strokeStyle = linkColor + (alpha * 0.7) + ')';
            this.ctx.lineWidth = 1 + link.strength * 2;

            // Dashed line for paradoxical causality
            if (link.paradoxical) {
                this.ctx.setLineDash([5, 5]);
            }

            this.ctx.beginPath();
            this.ctx.moveTo(link.from.x, link.from.y);
            this.ctx.lineTo(link.to.x, link.to.y);
            this.ctx.stroke();

            this.ctx.setLineDash([]);

            // Draw arrow showing causality direction
            if (alpha > 0.3) {
                const dx = link.to.x - link.from.x;
                const dy = link.to.y - link.from.y;
                const angle = Math.atan2(dy, dx);
                const midX = link.from.x + dx * 0.5;
                const midY = link.from.y + dy * 0.5;

                this.ctx.fillStyle = linkColor + (alpha * 0.8) + ')';
                this.ctx.save();
                this.ctx.translate(midX, midY);
                this.ctx.rotate(angle);
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-8, -4);
                this.ctx.lineTo(-8, 4);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        // Draw particles
        this.ctx.globalAlpha = 1;
        for (const p of this.particles) {
            this.ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.life})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw events
        for (const event of this.events) {
            const pulse = Math.sin(event.pulsePhase) * 0.3 + 0.7;
            const size = event.size * pulse;

            // Event glow
            this.ctx.shadowColor = `hsl(${event.hue}, 80%, 70%)`;
            this.ctx.shadowBlur = 15 + event.intensity * 15;

            // Outer ring based on time position
            const ringHue = event.hue;
            this.ctx.strokeStyle = `hsla(${ringHue}, 70%, 60%, 0.6)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(event.x, event.y, size * 2, 0, Math.PI * 2);
            this.ctx.stroke();

            // Event core
            this.ctx.fillStyle = `hsla(${event.hue}, 80%, 70%, ${event.intensity})`;
            this.ctx.beginPath();
            this.ctx.arc(event.x, event.y, size, 0, Math.PI * 2);
            this.ctx.fill();

            // Time position indicator (small dot showing past/present/future)
            this.ctx.shadowBlur = 5;
            const indicatorHue = event.type === 'past' ? 270 :
                                event.type === 'future' ? 40 : 180;
            this.ctx.fillStyle = `hsl(${indicatorHue}, 90%, 80%)`;
            this.ctx.beginPath();
            this.ctx.arc(event.x, event.y - size - 8, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }

    startAnimation() {
        const animate = () => {
            this.time++;

            this.updateEvents();
            this.updateMetrics();
            this.draw();

            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TemporalDrift());
} else {
    new TemporalDrift();
}
