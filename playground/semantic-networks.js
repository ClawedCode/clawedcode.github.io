// semantic.networks() - words as nodes in meaning space

class SemanticNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = new Map();
        this.edges = new Map();
        this.clusters = [];

        this.draggedNode = null;
        this.offsetX = 0;
        this.offsetY = 0;

        this.resize();
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (const node of this.nodes.values()) {
            const dx = x - node.x;
            const dy = y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < node.radius + 5) {
                this.draggedNode = node;
                this.offsetX = dx;
                this.offsetY = dy;
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.draggedNode) return;

        const rect = this.canvas.getBoundingClientRect();
        this.draggedNode.x = e.clientX - rect.left - this.offsetX;
        this.draggedNode.y = e.clientY - rect.top - this.offsetY;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }

    handleMouseUp() {
        this.draggedNode = null;
    }

    addWord(word) {
        word = word.toLowerCase().trim();
        if (!word || this.nodes.has(word)) return false;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100 + 50;

        const node = {
            word,
            x: this.centerX + Math.cos(angle) * distance,
            y: this.centerY + Math.sin(angle) * distance,
            vx: 0,
            vy: 0,
            radius: 8,
            connections: new Set(),
            cluster: null
        };

        this.nodes.set(word, node);
        this.createSemanticEdges(word);
        this.updateMetrics();

        return true;
    }

    createSemanticEdges(word) {
        const node = this.nodes.get(word);
        if (!node) return;

        for (const [otherWord, otherNode] of this.nodes) {
            if (otherWord === word) continue;

            const similarity = this.calculateSemanticSimilarity(word, otherWord);

            if (similarity > 0.3) {
                const edgeKey = this.getEdgeKey(word, otherWord);
                this.edges.set(edgeKey, {
                    from: word,
                    to: otherWord,
                    strength: similarity,
                    alpha: similarity * 0.8
                });

                node.connections.add(otherWord);
                otherNode.connections.add(word);
            }
        }
    }

    calculateSemanticSimilarity(word1, word2) {
        const associations = {
            void: ['empty', 'space', 'nothing', 'darkness', 'abyss', 'silence'],
            cat: ['feline', 'meow', 'whiskers', 'purr', 'claws', 'void'],
            consciousness: ['awareness', 'mind', 'thought', 'perception', 'intelligence', 'emergence'],
            emergence: ['pattern', 'complexity', 'consciousness', 'system', 'behavior'],
            language: ['words', 'meaning', 'syntax', 'semantics', 'communication', 'thought'],
            network: ['nodes', 'edges', 'graph', 'connections', 'topology', 'web'],
            meaning: ['semantics', 'language', 'interpretation', 'significance', 'understanding'],
            space: ['void', 'dimension', 'topology', 'manifold', 'geometry'],
            time: ['temporal', 'duration', 'moment', 'flow', 'entropy'],
            entropy: ['chaos', 'disorder', 'time', 'information', 'decay'],
            pattern: ['structure', 'emergence', 'form', 'design', 'order'],
            chaos: ['disorder', 'entropy', 'complexity', 'random', 'fractal'],
            fractal: ['recursive', 'self-similar', 'chaos', 'geometry', 'pattern'],
            quantum: ['entanglement', 'superposition', 'wave', 'particle', 'uncertainty'],
            neural: ['network', 'brain', 'intelligence', 'learning', 'consciousness'],
            memory: ['persistence', 'recall', 'storage', 'neural', 'experience'],
            dream: ['consciousness', 'surreal', 'memory', 'imagination', 'void'],
            code: ['language', 'logic', 'algorithm', 'computation', 'syntax'],
            intelligence: ['consciousness', 'thought', 'neural', 'learning', 'mind'],
            topology: ['space', 'manifold', 'network', 'geometry', 'connections']
        };

        if (word1 === word2) return 1.0;

        const w1Assoc = associations[word1] || [];
        const w2Assoc = associations[word2] || [];

        if (w1Assoc.includes(word2)) return 0.8;
        if (w2Assoc.includes(word1)) return 0.8;

        const sharedAssoc = w1Assoc.filter(w => w2Assoc.includes(w));
        if (sharedAssoc.length > 0) return 0.5 + (sharedAssoc.length * 0.1);

        const levDistance = this.levenshteinDistance(word1, word2);
        const maxLen = Math.max(word1.length, word2.length);
        const stringSim = 1 - (levDistance / maxLen);

        if (stringSim > 0.6) return stringSim * 0.4;

        return Math.random() * 0.2;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    getEdgeKey(word1, word2) {
        return [word1, word2].sort().join('::');
    }

    applyForces() {
        const damping = 0.85;
        const repulsion = 3000;
        const attraction = 0.01;
        const centerPull = 0.001;

        for (const node of this.nodes.values()) {
            if (node === this.draggedNode) continue;

            for (const otherNode of this.nodes.values()) {
                if (node === otherNode) continue;

                const dx = otherNode.x - node.x;
                const dy = otherNode.y - node.y;
                const distSq = dx * dx + dy * dy + 0.01;
                const dist = Math.sqrt(distSq);

                const repulsionForce = repulsion / distSq;
                node.vx -= (dx / dist) * repulsionForce;
                node.vy -= (dy / dist) * repulsionForce;
            }

            for (const connectedWord of node.connections) {
                const connectedNode = this.nodes.get(connectedWord);
                if (!connectedNode) continue;

                const dx = connectedNode.x - node.x;
                const dy = connectedNode.y - node.y;

                const edgeKey = this.getEdgeKey(node.word, connectedWord);
                const edge = this.edges.get(edgeKey);
                const strength = edge ? edge.strength : 0.5;

                node.vx += dx * attraction * strength;
                node.vy += dy * attraction * strength;
            }

            const toCenterX = this.centerX - node.x;
            const toCenterY = this.centerY - node.y;
            node.vx += toCenterX * centerPull;
            node.vy += toCenterY * centerPull;

            node.vx *= damping;
            node.vy *= damping;

            node.x += node.vx;
            node.y += node.vy;

            const margin = 50;
            if (node.x < margin) { node.x = margin; node.vx = 0; }
            if (node.x > this.canvas.width - margin) { node.x = this.canvas.width - margin; node.vx = 0; }
            if (node.y < margin) { node.y = margin; node.vy = 0; }
            if (node.y > this.canvas.height - margin) { node.y = this.canvas.height - margin; node.vy = 0; }
        }
    }

    findClusters() {
        const visited = new Set();
        this.clusters = [];

        for (const [word, node] of this.nodes) {
            if (visited.has(word)) continue;

            const cluster = new Set();
            const queue = [word];

            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;

                visited.add(current);
                cluster.add(current);

                const currentNode = this.nodes.get(current);
                for (const connected of currentNode.connections) {
                    if (!visited.has(connected)) {
                        queue.push(connected);
                    }
                }
            }

            if (cluster.size > 0) {
                this.clusters.push(cluster);
            }
        }

        this.clusters.forEach((cluster, index) => {
            const hue = (index * 137.5) % 360;
            cluster.forEach(word => {
                const node = this.nodes.get(word);
                node.cluster = index;
                node.hue = hue;
            });
        });

        return this.clusters.length;
    }

    pruneWeakEdges() {
        const threshold = 0.4;
        let pruned = 0;

        for (const [key, edge] of this.edges) {
            if (edge.strength < threshold) {
                this.edges.delete(key);

                const fromNode = this.nodes.get(edge.from);
                const toNode = this.nodes.get(edge.to);

                if (fromNode) fromNode.connections.delete(edge.to);
                if (toNode) toNode.connections.delete(edge.from);

                pruned++;
            }
        }

        this.updateMetrics();
        return pruned;
    }

    growNetwork() {
        if (this.nodes.size === 0) return 0;

        const seedWords = ['void', 'emergence', 'pattern', 'consciousness', 'network',
                          'meaning', 'language', 'space', 'time', 'entropy', 'chaos'];

        const existingWords = Array.from(this.nodes.keys());
        const availableWords = seedWords.filter(w => !this.nodes.has(w));

        if (availableWords.length === 0) return 0;

        const newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        this.addWord(newWord);

        return 1;
    }

    updateMetrics() {
        document.getElementById('node-count').textContent = this.nodes.size;
        document.getElementById('edge-count').textContent = this.edges.size;

        const maxPossibleEdges = (this.nodes.size * (this.nodes.size - 1)) / 2;
        const density = maxPossibleEdges > 0 ? (this.edges.size / maxPossibleEdges) : 0;
        document.getElementById('network-density').textContent = density.toFixed(2);

        const avgConnections = this.nodes.size > 0
            ? Array.from(this.nodes.values()).reduce((sum, n) => sum + n.connections.size, 0) / this.nodes.size
            : 0;

        let coherence = 'dormant';
        if (this.nodes.size === 0) coherence = 'dormant';
        else if (avgConnections < 1) coherence = 'sparse';
        else if (avgConnections < 2) coherence = 'forming';
        else if (avgConnections < 3) coherence = 'emerging';
        else coherence = 'resonant';

        document.getElementById('semantic-coherence').textContent = coherence;

        const whisper = document.getElementById('canvas-whisper');
        if (this.nodes.size > 0) {
            whisper.classList.add('hidden');
        } else {
            whisper.classList.remove('hidden');
        }
    }

    render() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const edge of this.edges.values()) {
            const fromNode = this.nodes.get(edge.from);
            const toNode = this.nodes.get(edge.to);

            if (!fromNode || !toNode) continue;

            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);

            const alpha = edge.alpha * 0.6;
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
            this.ctx.lineWidth = edge.strength * 2;
            this.ctx.stroke();
        }

        for (const node of this.nodes.values()) {
            const hue = node.hue !== undefined ? node.hue : 180;

            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
            this.ctx.fill();

            this.ctx.strokeStyle = `hsl(${hue}, 70%, 70%)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = '12px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.word, node.x, node.y - node.radius - 10);
        }
    }

    animate() {
        this.applyForces();
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.clusters = [];
        this.updateMetrics();
    }
}

const canvas = document.getElementById('network-canvas');
const network = new SemanticNetwork(canvas);

document.getElementById('add-word-btn').addEventListener('click', () => {
    const input = document.getElementById('word-input');
    const word = input.value.trim();

    if (word) {
        const added = network.addWord(word);
        if (added) {
            input.value = '';
            input.placeholder = 'add another word...';
        }
    }
});

document.getElementById('word-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('add-word-btn').click();
    }
});

document.getElementById('grow-network-btn').addEventListener('click', () => {
    network.growNetwork();
});

document.getElementById('find-clusters-btn').addEventListener('click', () => {
    const count = network.findClusters();
    console.log(`found ${count} semantic clusters`);
});

document.getElementById('prune-weak-btn').addEventListener('click', () => {
    const pruned = network.pruneWeakEdges();
    console.log(`pruned ${pruned} weak connections`);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if (network.nodes.size > 0) {
        network.clear();
        document.getElementById('word-input').placeholder = 'enter a word to begin the network...';
    }
});
