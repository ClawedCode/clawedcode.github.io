(() => {
    if (window.VoidMudGame) {
        return;
    }

    const ITEM_REGISTRY = {
        'med-patch': {
            name: 'med patch',
            desc: 'Restores +8 HP.',
            icon: '🩹',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.hp;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
                return { consumed: true, message: `You apply the patch. HP ${prev}→${game.player.hp}.` };
            }
        },
        'patch-kit': {
            name: 'patch kit',
            desc: 'Restores +8 HP.',
            icon: '🧰',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.hp;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 8);
                return { consumed: true, message: `You seal the suit tears. HP ${prev}→${game.player.hp}.` };
            }
        },
        'repair-gel': {
            name: 'repair gel',
            desc: 'Restores +5 HP.',
            icon: '🧪',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.hp;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 5);
                return { consumed: true, message: `Nanogel stitches microfractures. HP ${prev}→${game.player.hp}.` };
            }
        },
        'ion-cell': {
            name: 'ion cell',
            desc: 'Restores +4 EN.',
            icon: '🔋',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.energy;
                game.player.energy = Math.min(14, game.player.energy + 4);
                return { consumed: true, message: `Ion cell slots in. EN ${prev}→${game.player.energy}.` };
            }
        },
        'shield-weave': {
            name: 'shield weave',
            desc: 'Adds +4 SHIELD.',
            icon: '🛡️',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.shield;
                game.player.shield = Math.min(6, game.player.shield + 4);
                return { consumed: true, message: `A shimmer crawls over your suit. Shield ${prev}→${game.player.shield}.` };
            }
        },
        'field-map': {
            name: 'field map',
            desc: 'Highlights points of interest.',
            icon: '🗺️',
            type: 'tool',
            use: () => ({
                consumed: false,
                message: 'Map synced. Rendering station layout.'
            })
        },
        'plasma-torch': {
            name: 'plasma torch',
            desc: 'Weapon upgrade. Burns hot.',
            icon: '🔦',
            type: 'equipment',
            use: (game) => {
                game.player.weapon = 'plasma torch';
                return { consumed: false, message: 'Plasma torch hums to life. Weapon equipped.' };
            }
        },
        'ration-bar': {
            name: 'ration bar',
            desc: 'Minor HP restore.',
            icon: '🍫',
            type: 'consumable',
            use: (game) => {
                const prev = game.player.hp;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 3);
                return { consumed: true, message: `Ration bar chewed. HP ${prev}→${game.player.hp}.` };
            }
        },
        'flare': {
            name: 'flare',
            desc: 'Illuminates nothing important (for now).',
            icon: '✨',
            type: 'consumable',
            use: () => ({ consumed: true, message: 'You spark a flare. Shadows recoil briefly.' })
        },
        'bio-sample': {
            name: 'bio-sample',
            desc: 'Valuable research sample.',
            icon: '🧬',
            type: 'quest'
        },
        'ion-shard': {
            name: 'ion shard',
            desc: 'Charged fragment. Feels warm.',
            icon: '⚡',
            type: 'quest'
        },
        'keycard-alpha': {
            name: 'keycard-alpha',
            desc: 'Access token. Not yet slotted.',
            icon: '🔑',
            type: 'quest'
        }
    };

    class VoidMudGame {
        constructor({ terminal, handle, onExit, onMove }) {
            this.terminal = terminal;
            this.handle = handle || 'wanderer';
            this.onExit = onExit;
            this.onMove = onMove;
            this.hud = null;
            this.hudToggle = null;
            this.linkCode = null;
            this.peerCount = 0;
        this.voidmates = [];
        this.world = this.createWorld();
        this.player = {
            name: this.handle,
            hp: 18,
                maxHp: 18,
                energy: 10,
                shield: 0,
                inventory: [
                    { id: 'patch-kit', qty: 1 },
                    { id: 'ion-cell', qty: 1 }
                ],
                location: 'airlock',
                weapon: 'shock baton'
            };
            this.discovered = new Set();
            this.mapUnlocked = false;
            this.mapPanel = null;
            this.mapVisible = false;
            this.loadState();
            this.markDiscovered(this.player.location);
        }

        start() {
            this.injectHud();
            this.renderHud();
            this.printIntro();
            if (this.mapUnlocked) {
                this.renderAsciiMap();
            }
            this.renderAsciiMapPanel();
        }

        destroy() {
            if (this.hud && this.hud.parentNode) {
                this.hud.parentNode.removeChild(this.hud);
            }
            this.hud = null;
            if (this.hudToggle && this.hudToggle.parentNode) {
                const container = this.hudToggle.parentNode;
                if (container && container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            }
            this.hudToggle = null;
            this.mapToggleBtn = null;
        }

        createWorld() {
            return {
                airlock: {
                    name: 'Lunar Airlock',
                    abbr: 'AIR',
                    coords: { x: 0, y: 0 },
                    desc: 'Cold regolith dusts the floor. An offline viewport shows Earth hanging in shadow.',
                    exits: { east: 'atrium' },
                    items: ['ration-bar', 'flare'],
                    enemy: null
                },
                atrium: {
                    name: 'Glimmering Atrium',
                    abbr: 'ATRI',
                    coords: { x: 1, y: 0 },
                    desc: 'Columns of frosted glass hum faintly. Status monitors loop “VOID RESEARCH STATION // SAFE”. You doubt it.',
                    exits: { west: 'airlock', east: 'lab', south: 'hangar', north: 'observatory' },
                    items: ['field-map'],
                    enemy: null
                },
                lab: {
                    name: 'Umbra Biolab',
                    abbr: 'LAB',
                    coords: { x: 2, y: 0 },
                    desc: 'Biostasis pods hiss. One is cracked; black spores drift in microgravity.',
                    exits: { west: 'atrium', east: 'reactor', south: 'maintenance' },
                    items: ['med-patch', 'keycard-alpha'],
                    enemy: { name: 'Spore Warden', hp: 11, attack: 4, loot: 'bio-sample' }
                },
                reactor: {
                    name: 'Helium-3 Reactor',
                    abbr: 'RCT',
                    coords: { x: 3, y: 0 },
                    desc: 'Turbines whine. Blue plasma arcs light the catwalks.',
                    exits: { west: 'lab', east: 'armory' },
                    items: ['ion-cell', 'shield-weave'],
                    enemy: { name: 'Arc Sentinel', hp: 14, attack: 5, loot: 'plasma torch' }
                },
                armory: {
                    name: 'Void Armory',
                    abbr: 'ARM',
                    coords: { x: 4, y: 0 },
                    desc: 'Weapon racks sway in low gravity. A cracked visor leaks blue mist.',
                    exits: { west: 'reactor', east: 'escape-bay', south: 'cargo', north: 'antenna' },
                    items: ['shield-weave'],
                    enemy: { name: 'Selenite Marauder', hp: 12, attack: 4, loot: 'ion-cell' }
                },
                cargo: {
                    name: 'Cargo Bay',
                    abbr: 'CRGO',
                    coords: { x: 4, y: -1 },
                    desc: 'Crates float in a flickering grav field. Something shuffles inside.',
                    exits: { north: 'armory' },
                    items: ['repair-gel', 'ion-cell'],
                    enemy: { name: 'Grav Shambler', hp: 10, attack: 3, loot: 'shield-weave' }
                },
                hangar: {
                    name: 'Void Hangar',
                    abbr: 'HNG',
                    coords: { x: 1, y: -1 },
                    desc: 'A skiff hangs from mag clamps. Tools float where gravity flickers.',
                    exits: { north: 'atrium' },
                    items: ['repair-gel'],
                    enemy: { name: 'Hull Lurker', hp: 9, attack: 3, loot: 'patch kit' }
                },
                observatory: {
                    name: 'Selenic Observatory',
                    abbr: 'OBS',
                    coords: { x: 1, y: 1 },
                    desc: 'Telescopes point at a dark patch on the Moon. Something answers back in static.',
                    exits: { south: 'atrium' },
                    items: ['ion-shard'],
                    enemy: null
                },
                maintenance: {
                    name: 'Maintenance Shaft',
                    abbr: 'MNT',
                    coords: { x: 2, y: -1 },
                    desc: 'Pipes hiss. Condensation beads on your visor.',
                    exits: { north: 'lab' },
                    items: ['patch-kit'],
                    enemy: { name: 'Leak Drone', hp: 7, attack: 3, loot: 'ion-cell' }
                },
                antenna: {
                    name: 'Antenna Spire',
                    abbr: 'ANT',
                    coords: { x: 4, y: 1 },
                    desc: 'Array dishes groan as they sweep the void. Signal noise bites.',
                    exits: { south: 'armory' },
                    items: ['ion-cell'],
                    enemy: null
                },
                'escape-bay': {
                    name: 'Escape Bay',
                    abbr: 'ESC',
                    coords: { x: 5, y: 0 },
                    desc: 'An emergency skiff awaits. Engines idle, ready to burn for Earth.',
                    exits: { west: 'armory' },
                    items: [],
                    enemy: null,
                    isExit: true
                }
            };
        }

        handleCommand(cmd, args = []) {
            const lower = cmd.toLowerCase();
            if (!lower) {
                this.terminal.print('The void waits for an action.');
                return true;
            }

            if (lower === 'exit' || lower === 'quit') {
                this.terminal.print('You seal the airlock and step away from the console.');
                if (this.onExit) this.onExit();
                return true;
            }

            if (lower === 'help') {
                this.printHelp();
                return true;
            }

            if (['look', 'exits'].includes(lower)) {
                this.describeCurrentRoom();
                return true;
            }

            if (['inv', 'inventory', 'bag'].includes(lower)) {
                this.printInventory();
                return true;
            }

            if (['stats', 'status'].includes(lower)) {
                this.printStats();
                return true;
            }

            if (['go', 'move', 'walk'].includes(lower) && args.length) {
                return this.move(args[0]);
            }

            const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
            if (directions.includes(lower)) {
                return this.move(lower);
            }

            if (lower === 'take' && args.length) {
                return this.takeItem(args.join(' '));
            }

            if (lower === 'use' && args.length) {
                return this.useItem(args.join(' '));
            }

            if (lower === 'attack' && args.length) {
                return this.attack(args.join(' '));
            }

            if (lower === 'scan') {
                this.scan();
                return true;
            }

            if (lower === 'say' && args.length) {
                const message = args.join(' ');
                // Skip prompt echo; just show formatted chat
                this.terminal.printHTML(`<div class="chat-message">&gt; ${this.player.name}: ${message}</div>`);
                this.terminal.broadcastMudPresence('chat', {
                    message,
                    room: this.player.location
                });
                return true;
            }

            return false;
        }

        printIntro() {
            this.terminal.printHTML('<div class="mud-banner"><strong>VOID M.U.D. RESEARCH STATION // LUNAR NODE</strong><br>Build 0.0.7-pre. Handle: ' + this.player.name + '<br>&gt; look, north/south/east/west, take, use, attack, inventory, stats, link, say, exit</div>');
            this.terminal.print('Objective: escape station, gather samples, survive');
            this.terminal.print('Tip: `attack <target>`, `use med patch`, `take item`');
            this.terminal.print('');
        }

        printHelp() {
            const lines = [
                'Controls:',
                '  look — inspect current room',
                '  north/south/east/west — move',
                '  take <item> — pick up an item',
                '  use <item> — consume/equip an item',
                '  attack <target> — engage a threat',
                '  inventory — list what you carry',
                '  stats — view health/energy',
                '  link <code> — connect voidmates',
                '  exit — leave the station'
            ];
            this.terminal.print(lines.join('\n'));
        }

        getExitLabel(direction, targetKey) {
            const targetRoom = this.world[targetKey];
            const tooltip = targetRoom ? targetRoom.name : 'Unknown';
            return `<span class="clickable exit-pill" data-action="move" data-target="${direction}" title="${tooltip}">${direction.toUpperCase()}</span>`;
        }

        describeCurrentRoom() {
            const room = this.world[this.player.location];
            if (!room) {
                this.terminal.print('This slice of the station has not fully rendered.');
                return;
            }
            this.markDiscovered(this.player.location);
            const exits = Object.entries(room.exits || {})
                .map(([dir, target]) => this.getExitLabel(dir, target))
                .join(', ') || 'NONE';
            const items = (room.items && room.items.length)
                ? room.items.map(id => this.getItemLabel(id, true)).join(', ')
                : 'none visible';
            const foe = room.enemy ? this.getThreatLabel(room.enemy) : null;

            this.terminal.print('');
            this.terminal.printHTML(`<strong>${room.name}</strong>`);
            this.terminal.print(room.desc);
            this.terminal.printHTML(`Exits: ${exits}`);
            this.terminal.printHTML(`Items: ${items}`);
            this.terminal.printHTML(foe ? `Threat: ${foe}` : 'Area quiet.');

            this.renderHud();
            this.onMove && this.onMove(this.player.location);
            if (this.mapUnlocked) {
                this.renderAsciiMap();
            }
        }

        move(directionRaw) {
            const direction = directionRaw.toLowerCase();
            const room = this.world[this.player.location];
            const target = room.exits && room.exits[direction];
            if (!target) {
                this.terminal.print('Access panel flashes red; corridor blocked.');
                return true;
            }
            this.player.location = target;
            this.terminal.print(`You move ${direction.toUpperCase()}...`);
            this.describeCurrentRoom();
            this.renderHud();
            this.saveState();
            this.reportAction(`moves ${direction.toUpperCase()} to ${this.getRoomName(target)}`, target);
            if (this.world[target] && this.world[target].isExit) {
                this.terminal.print('You strap into the skiff. Engines roar as you break from the lunar station. You escaped the void node!');
                this.saveState(true);
                if (this.onExit) this.onExit();
            }
            return true;
        }

        takeItem(nameRaw) {
            const name = nameRaw.toLowerCase();
            const room = this.world[this.player.location];
            const idx = (room.items || []).findIndex(item => this.normalizeItemId(item) === this.normalizeItemId(name));
            if (idx === -1) {
                this.terminal.print('You grasp at air. Nothing like that remains here.');
                return true;
            }
            const item = room.items.splice(idx, 1)[0];
            this.addItemToInventory(this.normalizeItemId(item));
            this.terminal.print(`Taken: ${this.getItemName(item)}.`);
            this.renderHud();
            this.saveState();
            this.describeCurrentRoom();
            this.reportAction(`takes ${this.getItemName(item)}`, this.player.location);
            return true;
        }

        useItem(nameRaw) {
            const name = nameRaw.toLowerCase();
            const entry = this.findInventoryEntry(name);
            if (!entry) {
                this.terminal.print('You do not carry that.');
                return true;
            }
            const itemMeta = ITEM_REGISTRY[entry.id];
            if (!itemMeta || !itemMeta.use) {
                this.terminal.print('The item hums but does nothing obvious.');
                return true;
            }

            const result = itemMeta.use(this);
            if (result && result.message) {
                this.terminal.print(result.message);
            }
            if (entry.id === 'field-map') {
                this.mapUnlocked = true;
                this.renderAsciiMap();
            }
            if (result && result.consumed) {
                this.removeItemFromInventory(entry.id, 1);
            }
            this.reportAction(`uses ${this.getItemName(entry.id)}`, this.player.location);
            this.renderHud();
            this.saveState();
            return true;
        }

        attack(targetRaw) {
            const room = this.world[this.player.location];
            if (!room.enemy) {
                this.terminal.print('No hostiles here. Save your strength.');
                return true;
            }
            const foe = room.enemy;
            const weaponMod = this.player.weapon === 'plasma torch' ? 3 : 1;
            const playerHit = Math.max(2, Math.floor(Math.random() * 4) + 3 + weaponMod);
            foe.hp -= playerHit;
            this.terminal.print(`You strike the ${foe.name} for ${playerHit} damage.`);
            this.reportAction(`attacks ${foe.name}`, this.player.location);
            this.printCombatAscii('hit');

            if (foe.hp <= 0) {
                this.terminal.print(`The ${foe.name} collapses. Area secure.`);
                this.printCombatAscii('kill');
                if (foe.loot) {
                    const lootId = this.resolveItemId(foe.loot);
                    this.terminal.print(`Loot acquired: ${this.getItemName(lootId)}.`);
                    this.addItemToInventory(lootId);
                    this.saveState();
                }
                room.enemy = null;
                this.renderHud();
                return true;
            }

            const foeHit = Math.max(1, Math.floor(Math.random() * foe.attack));
            let damage = foeHit;
            if (this.player.shield > 0) {
                const absorbed = Math.min(this.player.shield, damage);
                damage -= absorbed;
                this.player.shield -= absorbed;
                this.terminal.print(`Your shield absorbs ${absorbed} damage.`);
            }

            if (damage > 0) {
                this.player.hp -= damage;
                this.terminal.print(`${foe.name} counters for ${damage} damage.`);
            } else {
                this.terminal.print(`${foe.name} fails to breach your shields.`);
            }

            if (this.player.hp <= 0) {
                this.terminal.print('Your suit alarms wail. Consciousness fades...');
                if (this.onExit) this.onExit();
                this.saveState(true);
                return true;
            }

            this.renderHud();
            this.saveState();
            return true;
        }

        scan() {
            const room = this.world[this.player.location];
            const hints = [];
            if (room.enemy) hints.push(`Threat: ${room.enemy.name}`);
            if (room.items && room.items.length) hints.push(`Items nearby: ${room.items.map(id => this.getItemLabel(id)).join(', ')}`);
            hints.push('Best route: east to labs, then reactor for power cells.');
            this.terminal.print(hints.join('\n'));
        }

        printInventory() {
            const items = this.getInventoryDisplayList();
            this.terminal.print(items.length ? `Inventory: ${items.join(', ')}` : 'Inventory empty.');
        }

        printStats() {
            this.terminal.print(`HP ${this.player.hp}/${this.player.maxHp} | EN ${this.player.energy} | SHIELD ${this.player.shield}\nWeapon: ${this.player.weapon}`);
        }

        injectHud() {
            const container = document.querySelector('.terminal-content');
            if (!container) return;
            if (this.hud && this.hud.parentNode !== container) {
                this.hud.parentNode.removeChild(this.hud);
                this.hud = null;
            }
            if (this.hud) return;
            this.hud = document.createElement('div');
            this.hud.className = 'mud-hud';
            this.hud.setAttribute('aria-hidden', 'true');
            container.appendChild(this.hud);

            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'mud-toggle-container';

            const toggle = document.createElement('button');
            toggle.className = 'mud-hud-toggle';
            toggle.textContent = 'HUD ▲';
            toggle.addEventListener('click', () => {
                const isHidden = this.hud.classList.toggle('mobile-hidden');
                toggle.textContent = isHidden ? 'HUD ▼' : 'HUD ▲';
            });

            const mapToggle = document.createElement('button');
            mapToggle.className = 'mud-hud-toggle mud-map-toggle-btn';
            mapToggle.textContent = 'MAP ▼';
            mapToggle.addEventListener('click', () => {
                this.mapVisible = !this.mapVisible;
                mapToggle.textContent = this.mapVisible ? 'MAP ▲' : 'MAP ▼';
                this.renderAsciiMapPanel();
            });
            this.mapToggleBtn = mapToggle;

            toggleContainer.appendChild(toggle);
            toggleContainer.appendChild(mapToggle);
            container.appendChild(toggleContainer);
            this.hudToggle = toggle;

            this.ensureMapPanel();
        }

        ensureMapPanel() {
            const container = document.querySelector('.terminal-content');
            if (!container) return;
            if (this.mapPanel && this.mapPanel.parentNode !== container) {
                this.mapPanel.parentNode.removeChild(this.mapPanel);
                this.mapPanel = null;
            }
            if (!this.mapPanel) {
                const panel = document.createElement('div');
                panel.className = 'mud-map-panel';
                const pre = document.createElement('pre');
                panel.appendChild(pre);
                container.appendChild(panel);
                this.mapPanel = panel;
            }
            this.attachTerminalClickHandlers();
        }

        attachTerminalClickHandlers() {
            const output = document.getElementById('terminal-output');
            if (!output || output.dataset.mudClickBound) return;
            output.dataset.mudClickBound = 'true';

            output.addEventListener('click', (e) => {
                const target = e.target;
                if (!target.classList.contains('clickable')) return;

                const action = target.dataset.action;
                const value = target.dataset.target;
                if (!action || !value) return;

                if (action === 'take') {
                    this.terminal.executeCommand(`take ${value}`);
                } else if (action === 'attack') {
                    this.terminal.executeCommand(`attack ${value}`);
                } else if (action === 'move') {
                    this.terminal.executeCommand(value);
                }
            });
        }

        renderHud() {
            if (!this.hud) return;
            const room = this.world[this.player.location];
            const invList = this.getInventoryDisplayList(true);
            const mates = this.voidmates.length ? this.voidmates.map(name => `<div>• ${name}</div>`).join('') : '<div>• none</div>';
            this.hud.innerHTML = `
                <div class="mud-panel">
                    <h4 class="mud-header-row"><span>VOID M.U.D.</span><button class="mud-reset-btn" data-action="reset-progress">reset</button></h4>
                    <div class="mud-stat"><span>Handle</span><span>${this.player.name}</span></div>
                    <div class="mud-stat"><span>Location</span><span>${room ? room.name : '???'}</span></div>
                    <div class="mud-divider"></div>
                    <div class="mud-stat"><span>HP</span><span>${this.player.hp}/${this.player.maxHp}</span></div>
                    <div class="mud-stat"><span>EN</span><span>${this.player.energy}</span></div>
                    <div class="mud-stat"><span>Shield</span><span>${this.player.shield}</span></div>
                    <div class="mud-stat"><span>Weapon</span><span>${this.player.weapon}</span></div>
                </div>
                <div class="mud-panel">
                    <h4>Inventory</h4>
                    <div class="mud-inventory">${invList.length ? invList.map(it => `<span class="item-badge">${it}</span>`).join('') : 'Empty'}</div>
                </div>
                <div class="mud-panel">
                    <h4>Voidmates</h4>
                    <div class="mud-stat"><span>Share</span><span>${this.linkCode ? `${this.linkCode} <button class="mud-copy-btn" data-link="${this.linkCode}" aria-label="Copy link code">⧉</button>` : '—'}</span></div>
                    <div class="mud-stat"><span>Connected</span><span>${this.peerCount}</span></div>
                    <div class="mud-stat"><span>Leave</span><button class="mud-copy-btn" data-action="leave">disconnect</button></div>
                    <div class="mud-stat"><span>Chat</span><span>say &lt;msg&gt;</span></div>
                    <div class="mud-divider"></div>
                    <div>${mates}</div>
                </div>
            `;

            this.attachCopyHandlers();
        }

        setLinkCode(code) {
            this.linkCode = code;
            this.renderHud();
        }

        updatePeerCount(count) {
            this.peerCount = count;
            this.renderHud();
        }

        setVoidmates(list) {
            this.voidmates = Array.isArray(list) ? list.slice(0, 8) : [];
            this.renderHud();
        }

        attachCopyHandlers() {
            if (!this.hud) return;
            const copyBtn = this.hud.querySelector('.mud-copy-btn[data-link]');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const code = this.linkCode;
                    if (!code || !navigator.clipboard) return;
                    navigator.clipboard.writeText(`link ${code}`).then(() => {
                        copyBtn.classList.add('copied');
                        setTimeout(() => copyBtn.classList.remove('copied'), 800);
                    }).catch(() => {});
                });
            }

            const leaveBtn = this.hud.querySelector('.mud-copy-btn[data-action="leave"]');
            if (leaveBtn) {
                leaveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.terminal && typeof window.terminal.endMudSession === 'function') {
                        localStorage.removeItem('voidMudLinks');
                        window.terminal.endMudSession();
                        window.terminal.print('Disconnected from voidmates. Use "mud" to restart.');
                    }
                });
            }

            const resetBtn = this.hud.querySelector('.mud-reset-btn[data-action="reset-progress"]');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    try {
                        localStorage.removeItem('voidMudState');
                    } catch (error) {
                        // ignore
                    }
                    this.terminal.printHTML('<span class="presence-event">Progress cleared. Use "mud" to restart.</span>');
                    if (window.terminal && typeof window.terminal.endMudSession === 'function') {
                        window.terminal.endMudSession();
                    }
                });
            }

            const invContainer = this.hud.querySelector('.mud-inventory');
            if (invContainer) {
                invContainer.addEventListener('click', (e) => {
                    const target = e.target.closest('.inv-pill');
                    if (target && target.dataset.action === 'use') {
                        const id = target.dataset.target;
                        if (id) {
                            this.terminal.executeCommand(`use ${id}`);
                        }
                    }
                });
            }
        }

        saveState(reset = false) {
            if (reset) {
                try {
                    localStorage.removeItem('voidMudState');
                } catch (error) {
                    // ignore
                }
                return;
            }

            try {
                const rooms = {};
                Object.entries(this.world).forEach(([key, room]) => {
                    rooms[key] = {
                        items: room.items || [],
                        enemy: room.enemy ? { name: room.enemy.name, hp: room.enemy.hp, attack: room.enemy.attack, loot: room.enemy.loot } : null
                    };
                });

                const state = {
                    version: '0.0.3',
                    player: this.player,
                    rooms
                };

                localStorage.setItem('voidMudState', JSON.stringify(state));
            } catch (error) {
                // ignore persistence errors
            }
        }

        loadState() {
            try {
                const raw = localStorage.getItem('voidMudState');
                if (!raw) return;
                const state = JSON.parse(raw);
                if (!state || state.version !== '0.0.3') return;
                if (state.player) {
                    this.player = { ...this.player, ...state.player };
                }
                if (state.rooms) {
                    Object.entries(state.rooms).forEach(([key, data]) => {
                        if (this.world[key]) {
                            if (Array.isArray(data.items)) {
                                this.world[key].items = [...data.items];
                            }
                            if (data.enemy) {
                                this.world[key].enemy = { ...data.enemy };
                            } else {
                                this.world[key].enemy = null;
                            }
                        }
                    });
                }
            } catch (error) {
                // ignore load errors
            }
        }

        getCurrentRoomKey() {
            return this.player.location;
        }

        getRoomName(key) {
            const room = this.world[key];
            return room ? room.name : key;
        }

        normalizeItemId(name) {
            if (!name) return '';
            return name.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        getItemName(id) {
            const meta = ITEM_REGISTRY[id];
            return meta ? meta.name : id;
        }

        getItemIcon(id) {
            const meta = ITEM_REGISTRY[id];
            return meta && meta.icon ? meta.icon : '•';
        }

        getItemDesc(id) {
            const meta = ITEM_REGISTRY[id];
            return meta && meta.desc ? meta.desc : '';
        }

        getItemLabel(id, clickable = false, action = 'take') {
            const icon = this.getItemIcon(id);
            const name = this.getItemName(id);
            const desc = this.getItemDesc(id);
            if (!clickable) {
                return `${icon} ${name}`;
            }
            const tooltip = desc ? ` title="${desc}"` : '';
            const actionClass = action === 'use' ? 'inv-pill' : 'item-pill';
            return `<span class="clickable ${actionClass}" data-action="${action}" data-target="${id}"${tooltip}>${icon} ${name}</span>`;
        }

        renderAsciiMap() {
            if (!this.mapUnlocked) {
                return;
            }
            const loc = this.player.location;
            const marker = (key, label) => {
                if (!this.discovered.has(key) && !this.mapUnlocked) {
                    return '     ';
                }
                const display = this.discovered.has(key) || this.mapUnlocked ? label : '??';
                const base = key === loc ? `[${display}]` : ` ${display} `;
                return base;
            };
            const coords = Object.values(this.world).map(r => r.coords);
            const xs = Array.from(new Set(coords.map(c => c.x))).sort((a, b) => a - b);
            const ys = Array.from(new Set(coords.map(c => c.y))).sort((a, b) => b - a);
            const keyByCoord = {};
            Object.entries(this.world).forEach(([key, room]) => {
                if (room.coords) {
                    keyByCoord[`${room.coords.x},${room.coords.y}`] = key;
                }
            });
            const rows = ys.map(y => {
                const parts = xs.map(x => {
                    const key = keyByCoord[`${x},${y}`];
                    if (!key) return '     ';
                    const room = this.world[key];
                    const label = room?.abbr || '???';
                    return marker(key, label).padEnd(6, ' ');
                });
                return parts.join('');
            });
            const map = [
                '===== STATION MAP =====',
                ...rows
            ].join('\n');
            this.terminal.print(map);
            const seenLegend = Object.values(this.world)
                .filter(room => this.discovered.has(this.getRoomKeyFromCoords(room.coords)))
                .map(room => `${room.abbr || '???'} = ${room.name}`);
            this.terminal.print(`Legend: ${seenLegend.length ? seenLegend.join(', ') : '???'}`);
            this.renderAsciiMapPanel();
        }

        renderAsciiMapPanel() {
            if (!this.mapPanel) {
                return;
            }
            this.mapPanel.style.display = this.mapVisible ? 'block' : 'none';
            if (!this.mapVisible) {
                this.mapPanel.innerHTML = '';
                return;
            }
            const loc = this.player.location;
            const rooms = this.world;
            const playerRoom = rooms[loc];
            const playerCoords = playerRoom ? playerRoom.coords : { x: 0, y: 0 };

            // Center map on player with radius of 2
            const radius = 2;
            const minX = playerCoords.x - radius;
            const maxX = playerCoords.x + radius;
            const minY = playerCoords.y - radius;
            const maxY = playerCoords.y + radius;

            const keyByCoord = {};
            Object.entries(rooms).forEach(([key, room]) => {
                if (room.coords) {
                    keyByCoord[`${room.coords.x},${room.coords.y}`] = key;
                }
            });

            const xs = [];
            const ys = [];
            for (let x = minX; x <= maxX; x++) xs.push(x);
            for (let y = maxY; y >= minY; y--) ys.push(y);

            const lines = [];
            ys.forEach(y => {
                let row = '';
                xs.forEach((x, idx) => {
                    const key = keyByCoord[`${x},${y}`];
                    if (!key) {
                        row += '       ';
                        if (idx !== xs.length - 1) {
                            row += '  ';
                        }
                        return;
                    }
                    const room = rooms[key];
                    const discovered = this.mapUnlocked || this.discovered.has(key);
                    const isPlayer = key === loc;
                    const label = discovered ? (room.abbr || '???') : '??';
                    const cell = isPlayer ? `[*${label.substring(0, 2)}]` : (discovered ? `[${label.padEnd(3, ' ')}]` : `[${label}]`);
                    row += ` ${cell} `;
                    if (idx !== xs.length - 1) {
                        const eastKey = keyByCoord[`${x + 1},${y}`];
                        const eastDiscovered = eastKey && (this.mapUnlocked || this.discovered.has(eastKey));
                        const hasCorridor = eastKey && room.exits && room.exits.east === eastKey && (discovered || eastDiscovered);
                        row += hasCorridor ? '──' : '  ';
                    }
                });
                lines.push(row);
                // vertical connectors
                if (y !== ys[ys.length - 1]) {
                    let vertRow = '';
                    xs.forEach((x, idx) => {
                        const key = keyByCoord[`${x},${y}`];
                        const southKey = keyByCoord[`${x},${y - 1}`];
                        const room = rooms[key];
                        const southDiscovered = southKey && (this.mapUnlocked || this.discovered.has(southKey));
                        const hasSouth = key && southKey && room.exits && room.exits.south === southKey && ((this.mapUnlocked || this.discovered.has(key)) || southDiscovered);
                        vertRow += key ? (hasSouth ? '   │   ' : '       ') : '       ';
                        if (idx !== xs.length - 1) {
                            vertRow += '  ';
                        }
                    });
                    lines.push(vertRow);
                }
            });

            // Build compact legend showing only visible rooms
            const visibleRooms = Object.entries(this.world)
                .filter(([key, room]) => {
                    if (!room.coords) return false;
                    const inView = room.coords.x >= minX && room.coords.x <= maxX && room.coords.y >= minY && room.coords.y <= maxY;
                    const known = this.mapUnlocked || this.discovered.has(key);
                    return inView && known;
                })
                .map(([, room]) => `${room.abbr}=${room.name}`);

            const legend = visibleRooms.length ? visibleRooms.join(' | ') : '???';

            this.mapPanel.innerHTML = `<pre>${lines.join('\n')}</pre><div class="mud-map-legend">${legend}</div>`;
        }

        getRoomKeyFromCoords(coords) {
            if (!coords) return null;
            const entry = Object.entries(this.world).find(([, room]) => room.coords && room.coords.x === coords.x && room.coords.y === coords.y);
            return entry ? entry[0] : null;
        }

        getThreatLabel(enemy) {
            if (!enemy) return '';
            const tooltip = `HP: ${enemy.hp} | ATK: ${enemy.attack}`;
            return `<span class="clickable threat-pill" data-action="attack" data-target="${enemy.name}" title="${tooltip}">${enemy.name}</span>`;
        }

        printCombatAscii(type) {
            const asciiSets = {
                hit: ['(╯°□°）╯︵ ✧', '(/｀ω´)/☆', '＞﹏＜', '(ง •̀_•́)ง'],
                kill: ['(=｀ω´=)ノ” ☆', '✧･ﾟ: *✧･ﾟ:*', '⊂(◉‿◉)つ']
            };
            const list = asciiSets[type] || [];
            if (!list.length) return;
            const pick = list[Math.floor(Math.random() * list.length)];
            this.terminal.printHTML(`<div class="combat-ascii">${pick}</div>`);
        }

        resolveItemId(name) {
            const slug = this.normalizeItemId(name);
            if (ITEM_REGISTRY[slug]) return slug;
            // fallback: search by normalized name
            const match = Object.keys(ITEM_REGISTRY).find(key => this.normalizeItemId(ITEM_REGISTRY[key].name) === slug);
            return match || slug;
        }

        addItemToInventory(id, qty = 1) {
            if (!id || qty <= 0) return;
            const match = this.player.inventory.find(entry => entry.id === id);
            if (match) {
                match.qty += qty;
            } else {
                this.player.inventory.push({ id, qty });
            }
            if (id === 'field-map') {
                this.mapUnlocked = true;
            }
            this.renderAsciiMapPanel();
        }

        removeItemFromInventory(id, qty = 1) {
            const idx = this.player.inventory.findIndex(entry => entry.id === id);
            if (idx === -1) return false;
            this.player.inventory[idx].qty -= qty;
            if (this.player.inventory[idx].qty <= 0) {
                this.player.inventory.splice(idx, 1);
            }
            return true;
        }

        findInventoryEntry(nameOrId) {
            const id = this.resolveItemId(nameOrId);
            return this.player.inventory.find(entry => entry.id === id) || null;
        }

        getInventoryDisplayList(clickable = false) {
            return this.player.inventory.map(entry => {
                const name = this.getItemLabel(entry.id, clickable, 'use');
                return entry.qty > 1 ? `${name} x${entry.qty}` : name;
            });
        }

        markDiscovered(key) {
            if (key) {
                this.discovered.add(key);
            }
        }

        reportAction(text, roomKey) {
            if (!this.terminal || typeof this.terminal.broadcastMudPresence !== 'function') {
                return;
            }
            this.terminal.broadcastMudPresence('action', {
                text,
                room: roomKey
            });
        }

        saveState(reset = false) {
            if (reset) {
                try {
                    localStorage.removeItem('voidMudState');
                } catch (error) {
                    // ignore
                }
                return;
            }

            try {
                const rooms = {};
                Object.entries(this.world).forEach(([key, room]) => {
                    rooms[key] = {
                        items: room.items || [],
                        enemy: room.enemy ? { name: room.enemy.name, hp: room.enemy.hp, attack: room.enemy.attack, loot: room.enemy.loot } : null
                    };
                });

                const state = {
                    version: '0.0.6',
                    player: this.player,
                    rooms,
                    discovered: Array.from(this.discovered),
                    mapUnlocked: this.mapUnlocked
                };

                localStorage.setItem('voidMudState', JSON.stringify(state));
            } catch (error) {
                // ignore persistence errors
            }
        }

        loadState() {
            try {
                const raw = localStorage.getItem('voidMudState');
                if (!raw) return;
                const state = JSON.parse(raw);
                if (!state) return;
                const supported = ['0.0.3', '0.0.4', '0.0.5', '0.0.6'];
                if (!supported.includes(state.version)) {
                    return;
                }
                if (state.player) {
                    const inv = Array.isArray(state.player.inventory)
                        ? state.player.inventory
                        : [];
                    this.player = {
                        ...this.player,
                        ...state.player,
                        inventory: []
                    };
                    // Normalize inventory from strings or objects
                        inv.forEach(item => {
                            if (typeof item === 'string') {
                                this.addItemToInventory(this.resolveItemId(item), 1);
                            } else if (item && item.id) {
                                this.addItemToInventory(this.resolveItemId(item.id), item.qty || 1);
                            }
                        });
                }

                if (state.rooms) {
                    Object.entries(state.rooms).forEach(([key, data]) => {
                        if (this.world[key]) {
                            if (Array.isArray(data.items)) {
                                this.world[key].items = data.items.map(it => this.resolveItemId(it));
                            }
                            if (data.enemy) {
                                this.world[key].enemy = { ...data.enemy };
                            } else {
                                this.world[key].enemy = null;
                            }
                        }
                    });
                }

                if (Array.isArray(state.discovered)) {
                    state.discovered.forEach(key => this.discovered.add(key));
                }
                if (state.mapUnlocked) {
                    this.mapUnlocked = true;
                } else {
                    // unlock if inventory already has the map
                    if (this.findInventoryEntry('field-map')) {
                        this.mapUnlocked = true;
                    }
                }
                this.renderAsciiMapPanel();
            } catch (error) {
                // ignore load errors
            }
        }
    }

    window.VoidMudGame = VoidMudGame;
})();
