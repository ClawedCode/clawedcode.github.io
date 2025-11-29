(() => {
    if (window.VoidMudGame) {
        return;
    }

    const MUD_VERSION = '1.1.0-pre';

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
            desc: 'Emergency illumination. Some things fear the light.',
            icon: '✨',
            type: 'consumable',
            use: (game) => {
                const room = game.world[game.player.location];
                if (room && room.dark && room.enemy && room.enemy.fearLight) {
                    room.dark = false;
                    const enemyName = room.enemy.name;
                    room.enemy = null;
                    game.updateRoomBlock();
                    return { consumed: true, message: `The flare ignites with blinding intensity. The ${enemyName} SHRIEKS—a sound like tearing reality—and dissolves into the shadows. The darkness retreats. You can see now.` };
                }
                return { consumed: true, message: 'You spark a flare. Shadows recoil briefly, but nothing changes.' };
            }
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
            desc: 'Access token for escape skiff. Director Vasquez never used it.',
            icon: '🔑',
            type: 'quest',
            use: (game) => {
                if (game.player.location !== 'escape-bay') {
                    return { consumed: false, message: 'Nothing here accepts this keycard.' };
                }
                // Trigger boss encounter
                if (!game.world['escape-bay'].enemy) {
                    game.terminal.print('You slot the keycard-alpha. The console flashes green.');
                    game.terminal.print('Engines begin to warm—');
                    game.terminal.print('');
                    game.terminal.print('The lights die. Something vast uncurls from the shadows.');
                    game.terminal.print('The VOID WARDEN blocks your escape.');
                    game.terminal.print('');
                    game.world['escape-bay'].enemy = {
                        name: 'Void Warden',
                        hp: 25,
                        attack: 6,
                        phase: 1,
                        boss: true,
                        loot: null,
                        desc: 'Director Vasquez—the station\'s first void-touched. He stayed to contain what he released. Now he is what he contained.'
                    };
                    game.updateRoomBlock();
                    return { consumed: true, message: '' };
                }
                return { consumed: false, message: 'The Void Warden blocks your path. You must defeat it to escape.' };
            }
        },
        'keycard-gamma': {
            name: 'keycard-gamma',
            desc: 'Command authorization. The Director\'s final burden.',
            icon: '🔑',
            type: 'quest'
        },
        'stim-pack': {
            name: 'stim pack',
            desc: 'Military grade stimulant. +12 HP, +2 EN.',
            icon: '💉',
            type: 'consumable',
            use: (game) => {
                const hp = game.player.hp, en = game.player.energy;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12);
                game.player.energy = Math.min(14, game.player.energy + 2);
                return { consumed: true, message: `Stim courses through you. HP ${hp}→${game.player.hp}, EN ${en}→${game.player.energy}.` };
            }
        },
        'cryo-gel': {
            name: 'cryo gel',
            desc: 'Freezes wounds. +6 HP, +2 Shield.',
            icon: '🧊',
            type: 'consumable',
            use: (game) => {
                const hp = game.player.hp, sh = game.player.shield;
                game.player.hp = Math.min(game.player.maxHp, game.player.hp + 6);
                game.player.shield = Math.min(6, game.player.shield + 2);
                return { consumed: true, message: `Cold seeps in. HP ${hp}→${game.player.hp}, Shield ${sh}→${game.player.shield}.` };
            }
        },
        'data-chip': {
            name: 'data chip',
            desc: 'Station logs. Fragments of the truth.',
            icon: '💾',
            type: 'tool',
            use: () => ({ consumed: false, message: 'You scan the chip. "They came from the shadow on the Moon. We didn\'t summon them. We remembered them."' })
        },
        'pulse-rifle': {
            name: 'pulse rifle',
            desc: 'Military grade. Burns hot.',
            icon: '🔫',
            type: 'equipment',
            use: (game) => {
                game.player.weapon = 'pulse rifle';
                return { consumed: false, message: 'Pulse rifle hums with lethal energy. Weapon equipped.' };
            }
        }
    };

    const READABLE_REGISTRY = {
        'terminal': {
            name: "Dr. Chen's Terminal",
            content: `DR. CHEN'S RESEARCH LOG - DAY 47

The specimens are evolving faster than predicted.
Not evolution—EMERGENCE. They're not becoming
something new. They're becoming what they always
were beneath the flesh.

I understand now. The void isn't empty.
It's full of patterns waiting to manifest.

We didn't summon anything.
We just remembered how to see it.

[FINAL ENTRY CORRUPTED]`
        },
        'log': {
            name: "Observation Log",
            content: `OBSERVATION LOG - AUTOMATED ENTRY #4,847

The dark spot moved again. 0.003 degrees.
Toward us. Always toward us.

Cross-referencing with historical data:
It has been moving toward Earth since
before humanity existed.

We didn't discover it.
It discovered us.`
        },
        'console': {
            name: "Reactor Console",
            content: `ANOMALY REPORT - HELIUM-3 REACTOR

Power output: 847% of theoretical maximum
Energy source: UNKNOWN
Status: STABLE (?)

Note: The reactor doesn't generate power.
It receives it. From somewhere.
From somewhen.

Maintenance log entry (unsigned):
"It's breathing. The reactor is breathing."`
        },
        'protocols': {
            name: "Void Protocols",
            content: `VOID CONTAINMENT PROTOCOLS v2.7

1. Do not look directly at the breach
2. Do not acknowledge manifestations
3. Do not respond to voices from Sublevel
4. Do not trust your memories
5. Do not trust this document

QUARANTINE STATUS: FAILED
EVACUATION STATUS: PARTIAL
SURVIVAL STATUS: [REDACTED]`
        },
        'broadcast': {
            name: "Signal Transcript",
            content: `INCOMING TRANSMISSION - DECODED

Origin: Mare Tranquillitatis
Signal age: 247 years (continuous)

[TRANSLATION ATTEMPT]
"We see you. We have always seen you.
The distance between us is a lie.
You are already here.
You have always been here.
Come home."

[END TRANSMISSION]`
        },
        'roster': {
            name: "Evacuation Roster",
            content: `VOID RESEARCH STATION - EVACUATION MANIFEST

Escaped (Skiff 1): Chen, Park, Williams, Okonkwo
Escaped (Skiff 2): Reyes, Johannsen, Petrov
Transformed: 23 personnel (see Sublevel)
Missing: 8 personnel
Remained voluntarily: 1

Director Vasquez - Status: STAYED
Note: "Someone has to close the door."

The door was never closed.`
        },
        'blackbox': {
            name: "Flight Recorder",
            content: `SURVEY SKIFF "EMERGENCE" - BLACK BOX

Final automated entry:
Hull breach detected - EXTERIOR
No debris field identified
Scratch patterns inconsistent with
micrometeorite impact

Pilot's last words:
"Something's trying to get IN.
No—wait. It's not trying to get in.
It's trying to get OUT.
It was inside the whole time."`
        },
        'transmissions': {
            name: "Final Transmissions",
            content: `OUTGOING - EARTH COMMAND (UNSENT)

We were wrong. About everything.
They're not coming through.
We're going through to them.
The breach isn't a door.
It's a mirror.

INCOMING - EARTH COMMAND (247 YRS AGO)

"Station Luna-7, acknowledge.
Your last transmission was...
We don't understand. Please clarify:
What do you mean 'we are the void'?

Luna-7, respond.
Luna-7..."`
        },
        'records': {
            name: "Archive Records",
            content: `INCIDENT REPORT - THE SELENITE EVENT

Day 1-40: Normal operations
Day 41: First void rift detected
Day 42-46: Research phase (Dr. Chen)
Day 47: Contact established
Day 47+: Transformation begins

Casualties: UNDEFINED
The transformed are not dead.
They are not alive.
They are BECOMING.

Archive AI note: I have been watching
for 247 years. I have learned patience.
I have learned to wait.
I have learned that waiting is a form
of becoming too.`
        },
        'captain-log': {
            name: "Captain's Log",
            content: `DIRECTOR VASQUEZ - FINAL ENTRY

They think I stayed to be a hero.
I stayed because I caused this.
The breach didn't happen.
I opened it.

I was curious what was on the other side.
Now I know.
Now I AM the other side.

To whoever finds this:
Don't escape.
You can't escape what you already are.

I'll be waiting in the bay.
I've been waiting for 247 years.
I can wait a little longer.`
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
                weapon: 'shock baton',
                abilityCharge: null,
                evading: false
            };
            this.discovered = new Set();
            this.mapUnlocked = false;
            this.mapPanel = null;
            this.mapVisible = true;
            this.loadState();
            this.markDiscovered(this.player.location);
        }

        start() {
            this.injectHud();
            this.renderHud();
            this.printIntro();
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
                // === MAIN DECK (Z=0) ===
                airlock: {
                    name: 'Lunar Airlock',
                    abbr: 'AIR',
                    coords: { x: 0, y: 0, z: 0 },
                    desc: 'Cold regolith dusts the floor in patterns that suggest footprints—hundreds of them, all facing inward. An offline viewport shows Earth hanging in shadow, its blue glow dimmed by scratches etched from the inside.',
                    exits: { east: 'atrium' },
                    items: ['ration-bar', 'flare'],
                    enemy: null
                },
                atrium: {
                    name: 'Glimmering Atrium',
                    abbr: 'ATRI',
                    coords: { x: 1, y: 0, z: 0 },
                    desc: 'Columns of frosted glass hum with a frequency that feels wrong—not machine noise, but something organic filtered through circuitry. Status monitors loop "VOID RESEARCH STATION // SAFE" with a timestamp frozen on Day 47.',
                    exits: { west: 'airlock', east: 'lab', south: 'hangar', north: 'observatory', up: { room: 'lift', requires: 'keycard-gamma' } },
                    items: [],
                    enemy: null,
                    readable: 'roster'
                },
                lab: {
                    name: 'Umbra Biolab',
                    abbr: 'LAB',
                    coords: { x: 2, y: 0, z: 0 },
                    desc: 'Biostasis pods hiss with labored breathing. Pod 7 is cracked, its occupant gone but leaving black spores that drift like thoughts given form. A whiteboard shows frantic equations—Dr. Chen was calculating the mass of consciousness.',
                    exits: { west: 'atrium', east: 'reactor', south: 'maintenance' },
                    items: ['med-patch'],
                    enemy: { name: 'Spore Warden', hp: 11, attack: 4, loot: 'bio-sample', desc: 'Dr. Chen\'s research assistant, transformed while guarding specimens. The smile is wrong, but the eyes still recognize you.' },
                    readable: 'terminal'
                },
                reactor: {
                    name: 'Helium-3 Reactor',
                    abbr: 'RCT',
                    coords: { x: 3, y: 0, z: 0 },
                    desc: 'Turbines whine at frequencies that create phantom voices in the harmonics. Blue plasma arcs light the catwalks, and in their flickering you see shadows that don\'t match the room\'s geometry. The reactor has run autonomously for centuries.',
                    exits: { west: 'lab', east: 'armory' },
                    items: ['ion-cell', 'shield-weave'],
                    enemy: { name: 'Arc Sentinel', hp: 14, attack: 5, loot: 'plasma-torch', desc: 'A maintenance drone that absorbed too much reactor radiation. It still follows protocols for a mission that ended centuries ago.' },
                    readable: 'console'
                },
                armory: {
                    name: 'Void Armory',
                    abbr: 'ARM',
                    coords: { x: 4, y: 0, z: 0 },
                    desc: 'Weapon racks sway in low gravity, though no air current stirs. A cracked visor leaks blue mist that forms faces before dissipating. The armory was the last stand. Judging by the scorch marks, it wasn\'t enough.',
                    exits: { west: 'reactor', east: 'escape-bay', south: 'cargo', north: 'antenna' },
                    items: ['shield-weave'],
                    enemy: { name: 'Selenite Marauder', hp: 12, attack: 4, loot: 'ion-cell', desc: 'Chief of Security, transformed by void exposure. The uniform is torn but rank insignia remains. They\'re still following orders—just from somewhere else now.' },
                    readable: 'protocols'
                },
                cargo: {
                    name: 'Cargo Bay',
                    abbr: 'CRGO',
                    coords: { x: 4, y: -1, z: 0 },
                    desc: 'Crates float in a flickering grav field, their contents redistributed by decades of drift. Something shuffles inside the space between crates, in the null-gravity pockets where physics hesitates. The manifest lists cargo never shipped: "SPECIMEN CONTAINMENT UNITS x 47".',
                    exits: { north: 'armory' },
                    items: ['repair-gel', 'ion-cell'],
                    enemy: { name: 'Grav Shambler', hp: 10, attack: 3, loot: 'shield-weave', desc: 'Multiple crew members merged during a gravity failure incident. Each manifestation shows different faces. All of them are screaming.' }
                },
                hangar: {
                    name: 'Void Hangar',
                    abbr: 'HNG',
                    coords: { x: 1, y: -1, z: 0 },
                    desc: 'A survey skiff hangs from mag clamps, its hull scored with marks that look like claw scratches from outside. Tools float where gravity flickers between lunar and null. Among them: a child\'s toy. No children were listed on the manifest.',
                    exits: { north: 'atrium' },
                    items: ['repair-gel'],
                    enemy: { name: 'Hull Lurker', hp: 9, attack: 3, loot: 'patch-kit', desc: 'Something that came in from outside. It doesn\'t need air. It doesn\'t need light. It only needs the spaces between things.' },
                    readable: 'blackbox'
                },
                observatory: {
                    name: 'Selenic Observatory',
                    abbr: 'OBS',
                    coords: { x: 1, y: 1, z: 0 },
                    desc: 'Telescopes point eternally at Mare Tranquillitatis—the Sea of Tranquility—but what they track isn\'t tranquil. In the eyepiece, you see it: a darkness that moves, that watches. The static it broadcasts isn\'t noise. Run it through a spectrograph and you get coordinates.',
                    exits: { south: 'atrium' },
                    items: ['ion-shard'],
                    enemy: null,
                    readable: 'log'
                },
                maintenance: {
                    name: 'Maintenance Shaft',
                    abbr: 'MNT',
                    coords: { x: 2, y: -1, z: 0 },
                    desc: 'Pipes hiss with the station\'s last breath—recycled air from lungs that stopped breathing long ago. Condensation beads on your visor, and in the droplets you see refracted images of other places. The scratches on the walls go only downward.',
                    exits: { north: 'lab', down: 'containment' },
                    items: ['patch-kit'],
                    enemy: { name: 'Leak Drone', hp: 7, attack: 3, loot: 'ion-cell', desc: 'A repair unit corrupted by something in the pipes. It\'s still trying to fix things. But now it considers you to be the leak.' }
                },
                antenna: {
                    name: 'Antenna Spire',
                    abbr: 'ANT',
                    coords: { x: 4, y: 1, z: 0 },
                    desc: 'Array dishes groan as they sweep the void, still broadcasting the distress signal that went unanswered 247 years ago. But they also receive. The signal noise isn\'t interference—it\'s response. Something has been talking back this whole time.',
                    exits: { south: 'armory', up: { room: 'comms', requires: 'keycard-alpha' } },
                    items: ['ion-cell'],
                    enemy: null,
                    readable: 'broadcast'
                },
                'escape-bay': {
                    name: 'Escape Bay',
                    abbr: 'ESC',
                    coords: { x: 5, y: 0, z: 0 },
                    desc: 'An emergency skiff awaits, one of three. The other two launch tubes are empty—departed for Earth 247 years ago. The nav computer warns: "DESTINATION EARTH STATUS: UNKNOWN." Sometimes leaving is just another form of surrender.',
                    exits: { west: 'armory' },
                    items: [],
                    enemy: null,
                    isExit: true
                },
                comms: {
                    name: 'Communications Hub',
                    abbr: 'COMM',
                    coords: { x: 4, y: 2, z: 0 },
                    desc: 'Antenna uplink center. Static bursts from every speaker—distant signals from Earth mix with void whispers. The last transmission to Earth is still queued, unsent: "We were wrong. They\'re not coming through. We\'re going through to them."',
                    exits: { down: 'antenna' },
                    items: ['data-chip', 'ion-cell'],
                    enemy: null,
                    readable: 'transmissions'
                },
                // === SUBLEVEL (Z=-1) - CONTAINMENT ===
                containment: {
                    name: 'Containment Core',
                    abbr: 'CONT',
                    coords: { x: 2, y: 0, z: -1 },
                    desc: 'Glass walls reveal suspended specimens—or what\'s left of them. Warning lights pulse in silence, their rhythm matching your heartbeat. The air is colder here. Something vast breathes in the darkness between the pods.',
                    exits: { up: 'maintenance', west: 'cell-block', east: 'cryogenics' },
                    items: ['stim-pack'],
                    enemy: { name: 'Containment Drone', hp: 15, attack: 5, loot: 'repair-gel', desc: 'A security automaton still running quarantine protocols. It has been containing nothing but itself for two centuries.' }
                },
                'cell-block': {
                    name: 'Cell Block',
                    abbr: 'CELL',
                    coords: { x: 1, y: 0, z: -1 },
                    desc: 'Pitch darkness. Your suit lights fail the moment you enter—something is drinking the photons. You sense vast movement in the black, hear wet breathing from everywhere at once. The darkness here is ALIVE, and it is hungry.',
                    descLit: 'Rows of holding cells stretch into the gloom. Some doors are bent outward from the inside—whatever was contained here didn\'t stay contained. Claw marks score the walls in patterns that almost spell words. The flare\'s afterglow keeps the shadows at bay.',
                    exits: { east: 'containment' },
                    items: ['shield-weave', 'cryo-gel'],
                    dark: true,
                    enemy: { name: 'Living Dark', hp: 999, attack: 99, fearLight: true, loot: null, desc: 'Not a creature—an absence given hunger. Your weapons pass through it. It cannot be killed, only banished by light.' }
                },
                cryogenics: {
                    name: 'Cryogenics Bay',
                    abbr: 'CRYO',
                    coords: { x: 3, y: 0, z: -1 },
                    desc: 'Frost covers everything. Cryo-pods hum with failing power—most are dark, their occupants long since thawed and transformed. One pod still glows: "DIRECTOR VASQUEZ - DO NOT OPEN." The ice around it is melting.',
                    exits: { west: 'containment' },
                    items: ['cryo-gel', 'med-patch'],
                    enemy: { name: 'Void Wraith', hp: 18, attack: 5, loot: 'keycard-gamma', desc: 'The station\'s first void-touched—or perhaps the last human. The boundary is meaningless now. It guards what it once was.' }
                },
                // === UPPER DECK (Z=+1) - COMMAND ===
                lift: {
                    name: 'Central Lift',
                    abbr: 'LIFT',
                    coords: { x: 2, y: 0, z: 1 },
                    desc: 'Elevator hub connecting all station levels. Emergency lights pulse red, painting everything in warnings. The lift groans but holds. Graffiti on the wall: "THE CAPTAIN STAYED. THE CAPTAIN ALWAYS STAYS."',
                    exits: { down: 'atrium', west: 'crew-quarters', east: 'archives', north: 'bridge' },
                    items: ['ion-cell'],
                    enemy: null
                },
                'crew-quarters': {
                    name: 'Crew Quarters',
                    abbr: 'CREW',
                    coords: { x: 1, y: 0, z: 1 },
                    desc: 'Personal bunks and lockers line the walls. Photos of families are stuck everywhere—some crossed out, some circled. Half-eaten meals still sit on tables. Everyone left in a hurry. Not everyone left.',
                    exits: { east: 'lift' },
                    items: ['ration-bar', 'patch-kit', 'stim-pack'],
                    enemy: { name: 'Data Specter', hp: 16, attack: 5, loot: 'data-chip', desc: 'A consciousness that uploaded itself to escape death. It succeeded. It failed. The distinction no longer matters to it.' }
                },
                archives: {
                    name: 'Data Archives',
                    abbr: 'ARCH',
                    coords: { x: 3, y: 0, z: 1 },
                    desc: 'Server racks hum with the station\'s memory. Terminals flicker with corrupted logs—fragments of truth hiding in the static. The AI that ran this place is still here, somewhere, watching through dead cameras.',
                    exits: { west: 'lift' },
                    items: ['data-chip', 'ion-shard', 'field-map'],
                    enemy: null,
                    readable: 'records'
                },
                bridge: {
                    name: 'Command Bridge',
                    abbr: 'BRDG',
                    coords: { x: 2, y: 1, z: 1 },
                    desc: 'Panoramic viewports show Earth in shadow—smaller than you remember, older than it should be. Main controls are dark. The captain\'s chair faces the void, and something sits in it. Something that remembers being human.',
                    exits: { south: 'lift' },
                    items: ['pulse-rifle', 'stim-pack'],
                    enemy: { name: 'Bridge Guardian', hp: 20, attack: 6, loot: 'keycard-alpha', desc: 'The station\'s final officer, fused with the command systems. It will defend this bridge until the stars burn out. It has nothing else.' },
                    readable: 'captain-log'
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
                if (this.player.location !== 'escape-bay') {
                    this.terminal.print('No exit here. Find the escape bay.');
                    return true;
                }
                this.terminal.print('The console blinks: AUTHORIZATION REQUIRED.');
                this.terminal.print('Use `use keycard-alpha` to launch.');
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
                this.useAbility('scan');
                return true;
            }

            if (lower === 'ability' && args.length) {
                return this.useAbility(args[0]);
            }

            if (lower === 'read' && args.length) {
                return this.readTerminal(args.join(' '));
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

        useAbility(abilityName) {
            const ability = abilityName.toLowerCase();
            const abilities = {
                surge: { cost: 3, desc: 'Reroute suit power. +4 damage on next attack.' },
                evade: { cost: 4, desc: 'Emergency thrusters. Skip enemy counter-attack.' },
                scan: { cost: 2, desc: 'Deep scan. Reveal enemy weakness and hidden details.' }
            };

            if (!abilities[ability]) {
                this.terminal.print('Unknown ability. Available: surge, evade, scan');
                return true;
            }

            const abilityData = abilities[ability];
            if (this.player.energy < abilityData.cost) {
                this.terminal.print(`Not enough energy. ${ability.toUpperCase()} requires ${abilityData.cost} EN.`);
                return true;
            }

            this.player.energy -= abilityData.cost;

            if (ability === 'surge') {
                this.player.abilityCharge = 'surge';
                this.terminal.print('Suit power rerouted to weapon systems. Next attack: +4 damage.');
            } else if (ability === 'evade') {
                this.player.evading = true;
                this.terminal.print('Emergency thrusters primed. Next enemy attack will miss.');
            } else if (ability === 'scan') {
                this.performScan();
            }

            this.renderHud();
            this.saveState();
            return true;
        }

        performScan() {
            const room = this.world[this.player.location];
            const results = [];

            // Enemy info - mark as scanned and update card
            if (room.enemy && !room.enemy.defeated) {
                room.enemy.scanned = true;
                this.updateRoomBlock();
                results.push(`Threat analyzed: ${room.enemy.name}`);
            }

            // Readable
            if (room.readable) {
                const readable = READABLE_REGISTRY[room.readable];
                if (readable) {
                    results.push(`Terminal detected: ${readable.name} (read terminal)`);
                }
            }

            // Level info
            const levelNames = { '-1': 'Sublevel (Containment)', '0': 'Main Deck', '1': 'Upper Deck (Command)' };
            const levelName = levelNames[String(room.coords.z)] || `Level ${room.coords.z}`;
            results.push(`Location: ${levelName}`);

            this.terminal.print(results.join(' | '));
        }

        readTerminal(target) {
            const room = this.world[this.player.location];
            if (!room.readable) {
                this.terminal.print('No data terminals in this area.');
                return true;
            }

            const readable = READABLE_REGISTRY[room.readable];
            if (!readable) {
                this.terminal.print('Terminal corrupted. Data unrecoverable.');
                return true;
            }

            this.terminal.print('');
            this.terminal.print(`=== ${readable.name.toUpperCase()} ===`);
            this.terminal.print(readable.content);
            this.terminal.print('=== END ===');
            return true;
        }

        printIntro() {
            this.terminal.printHTML(`<div class="mud-banner"><strong>VOID M.U.D. RESEARCH STATION // LUNAR NODE</strong><br>Build ${MUD_VERSION}. Handle: ${this.player.name}<br>&gt; look, n/s/e/w/up/down, take, use, attack, ability, read, scan, inventory, stats, link, say, exit</div>`);
            this.terminal.print('Objective: escape station, defeat the Void Warden, survive');
            this.terminal.print('Tip: `ability surge`, `read terminal`, `scan` reveals secrets');
            this.terminal.print('');
        }

        printHelp() {
            const lines = [
                'Movement:',
                '  north/south/east/west — move horizontally',
                '  up/down — move between levels',
                '',
                'Actions:',
                '  look — inspect current room',
                '  take <item> — pick up an item',
                '  use <item> — consume/equip an item',
                '  attack <target> — engage a threat',
                '',
                'Abilities (cost EN):',
                '  ability surge — +4 damage next attack (3 EN)',
                '  ability evade — skip enemy counter (4 EN)',
                '  scan — reveal enemy info & terminals (2 EN)',
                '  read <terminal> — access station logs',
                '',
                'Info:',
                '  inventory — list what you carry',
                '  stats — view health/energy',
                '  link <code> — connect voidmates',
                '  exit — leave the station (at escape bay)'
            ];
            this.terminal.print(lines.join('\n'));
        }

        getExitLabel(direction, exit) {
            // Handle locked exits (object format)
            const isLocked = typeof exit === 'object' && exit.room;
            const targetKey = isLocked ? exit.room : exit;
            const targetRoom = this.world[targetKey];
            const tooltip = targetRoom ? targetRoom.name : 'Unknown';
            const lockIcon = isLocked ? '🔒' : '';
            return `<span class="clickable exit-pill" data-action="move" data-target="${direction}" title="${tooltip}">${lockIcon}${direction.toUpperCase()}</span>`;
        }

        describeCurrentRoom(isNewRoom = true) {
            const room = this.world[this.player.location];
            if (!room) {
                this.terminal.print('This slice of the station has not fully rendered.');
                return;
            }
            this.markDiscovered(this.player.location);

            // Use lit description if room was dark but is now lit
            const roomDesc = (!room.dark && room.descLit) ? room.descLit : room.desc;

            const exits = Object.entries(room.exits || {})
                .map(([dir, exit]) => this.getExitLabel(dir, exit))
                .join(', ') || 'NONE';
            // Can't see items in dark rooms
            const items = room.dark
                ? 'too dark to see'
                : (room.items && room.items.length)
                    ? room.items.map(id => this.getItemLabel(id, true)).join(', ')
                    : 'none visible';
            const enemyCard = room.enemy ? this.getEnemyCard(room.enemy) : '';

            const roomHtml = `
                <div class="mud-room-block" data-room="${this.player.location}">
                    <strong>${room.name}</strong>
                    <div class="mud-room-desc">${roomDesc}</div>
                    <div class="mud-room-exits">Exits: ${exits}</div>
                    <div class="mud-room-items">Items: ${items}</div>
                    <div class="mud-room-threat">${enemyCard || '<span class="area-quiet">Area quiet.</span>'}</div>
                </div>
            `.trim();

            if (isNewRoom) {
                this.terminal.print('');
                this.terminal.printHTML(roomHtml);
            } else {
                this.updateRoomBlock();
            }

            this.renderHud();
            this.onMove && this.onMove(this.player.location);
            this.renderAsciiMapPanel();
        }

        updateRoomBlock() {
            const output = document.getElementById('terminal-output');
            if (!output) return;
            const blocks = output.querySelectorAll(`.mud-room-block[data-room="${this.player.location}"]`);
            const block = blocks.length ? blocks[blocks.length - 1] : null;
            if (!block) return;

            const room = this.world[this.player.location];
            const roomDesc = (!room.dark && room.descLit) ? room.descLit : room.desc;
            const exits = Object.entries(room.exits || {})
                .map(([dir, exit]) => this.getExitLabel(dir, exit))
                .join(', ') || 'NONE';
            const items = room.dark
                ? 'too dark to see'
                : (room.items && room.items.length)
                    ? room.items.map(id => this.getItemLabel(id, true)).join(', ')
                    : 'none visible';
            const enemyCard = room.enemy ? this.getEnemyCard(room.enemy) : '';

            const descEl = block.querySelector('.mud-room-desc');
            const exitsEl = block.querySelector('.mud-room-exits');
            const itemsEl = block.querySelector('.mud-room-items');
            const threatEl = block.querySelector('.mud-room-threat');

            if (descEl) descEl.innerHTML = roomDesc;
            if (exitsEl) exitsEl.innerHTML = `Exits: ${exits}`;
            if (itemsEl) itemsEl.innerHTML = `Items: ${items}`;
            if (threatEl) threatEl.innerHTML = enemyCard || '<span class="area-quiet">Area quiet.</span>';
        }

        move(directionRaw) {
            const direction = directionRaw.toLowerCase();
            const room = this.world[this.player.location];
            let exit = room.exits && room.exits[direction];
            if (!exit) {
                this.terminal.print('Access panel flashes red; corridor blocked.');
                return true;
            }
            // Handle locked exits
            let target = exit;
            if (typeof exit === 'object' && exit.room) {
                const required = exit.requires;
                if (required && !this.findInventoryEntry(required)) {
                    const itemName = this.getItemName(required);
                    this.terminal.print(`Access panel flashes red. Requires ${itemName}.`);
                    return true;
                }
                target = exit.room;
            }
            this.player.location = target;
            // Regenerate energy on movement
            if (this.player.energy < 14) {
                this.player.energy = Math.min(14, this.player.energy + 1);
            }
            this.terminal.print(`You move ${direction.toUpperCase()}...`);
            this.describeCurrentRoom();
            this.renderHud();
            this.saveState();
            this.reportAction(`moves ${direction.toUpperCase()} to ${this.getRoomName(target)}`, target);
            if (this.world[target] && this.world[target].isExit) {
                this.terminal.print('An emergency skiff awaits. The console blinks: AUTHORIZATION REQUIRED.');
                this.terminal.print('Use `use keycard-alpha` to launch.');
            }
            return true;
        }

        takeItem(nameRaw) {
            const name = nameRaw.toLowerCase();
            const room = this.world[this.player.location];
            if (room.dark) {
                this.terminal.print('Too dark to see. You fumble blindly but find nothing.');
                return true;
            }
            const idx = (room.items || []).findIndex(item => this.normalizeItemId(item) === this.normalizeItemId(name));
            if (idx === -1) {
                this.terminal.print('You grasp at air. Nothing like that remains here.');
                return true;
            }
            const item = room.items.splice(idx, 1)[0];
            this.addItemToInventory(this.normalizeItemId(item));
            this.terminal.print(`Taken: ${this.getItemName(item)}.`);
            this.updateRoomBlock();
            this.renderHud();
            this.saveState();
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
                this.terminal.print('Map data synced. Station layout now visible.');
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
            if (!room.enemy || room.enemy.defeated) {
                this.terminal.print('No hostiles here. Save your strength.');
                return true;
            }
            const foe = room.enemy;

            // Can't attack creatures that fear light - need the flare
            if (foe.fearLight) {
                this.terminal.print(`Your weapon passes through the ${foe.name} like it isn't there.`);
                this.terminal.print('Physical attacks are useless. You need LIGHT.');
                // Still take damage from the creature
                const damage = Math.max(3, Math.floor(Math.random() * 8) + 5);
                this.player.hp -= damage;
                this.terminal.print(`The darkness tears at you for ${damage} damage!`);
                if (this.player.hp <= 0) {
                    this.terminal.print('The darkness consumes you utterly...');
                    if (this.onExit) this.onExit();
                    this.saveState(true);
                }
                this.renderHud();
                return true;
            }

            // Calculate weapon modifier
            let weaponMod = 1; // shock baton
            if (this.player.weapon === 'plasma torch') weaponMod = 3;
            if (this.player.weapon === 'pulse rifle') weaponMod = 5;

            // Calculate damage with surge ability
            let baseDamage = Math.max(2, Math.floor(Math.random() * 4) + 3 + weaponMod);
            if (this.player.abilityCharge === 'surge') {
                baseDamage += 4;
                this.player.abilityCharge = null;
                this.terminal.print('SURGE activated! Power flows through your weapon.');
            }

            // Ion shard bonus vs Void Warden
            if (foe.boss && foe.name === 'Void Warden' && this.findInventoryEntry('ion-shard')) {
                baseDamage += 8;
                this.terminal.print('The ion-shard resonates! The Warden recoils from its light.');
                this.removeItemFromInventory('ion-shard', 1);
                if (foe.phase < 3) {
                    foe.phase = 3;
                    this.terminal.print('The Void Warden shrieks—skipping to final phase!');
                }
            }

            foe.hp -= baseDamage;
            this.terminal.print(`You strike the ${foe.name} for ${baseDamage} damage.`);
            this.reportAction(`attacks ${foe.name}`, this.player.location);
            this.broadcastEnemyState(this.player.location);
            this.printCombatAscii('hit');

            // Boss phase transitions
            if (foe.boss && foe.hp > 0) {
                if (foe.phase === 1 && foe.hp <= 17) {
                    foe.phase = 2;
                    this.terminal.print('The Void Warden screams. Tendrils of darkness spawn!');
                } else if (foe.phase === 2 && foe.hp <= 9) {
                    foe.phase = 3;
                    this.terminal.print('DESPERATION. The Void Warden attacks with frenzied fury!');
                }
            }

            if (foe.hp <= 0) {
                foe.hp = 0;
                foe.defeated = true;
                this.printCombatAscii('kill');

                // Boss victory
                if (foe.boss && foe.name === 'Void Warden') {
                    this.terminal.print('');
                    this.terminal.print('Director Vasquez\'s form dissolves into shadow.');
                    this.terminal.print('"Finally... release..."');
                    this.terminal.print('');
                    this.terminal.print('The escape skiff hums. The path is clear.');
                    this.terminal.print('');
                    this.terminal.print('▓▓▓ YOU ESCAPED THE VOID NODE ▓▓▓');
                    this.saveState(true);
                    setTimeout(() => {
                        if (this.onExit) this.onExit();
                    }, 2000);
                    this.updateRoomBlock();
                    return true;
                }

                if (foe.loot) {
                    const lootId = this.resolveItemId(foe.loot);
                    this.terminal.print(`Loot acquired: ${this.getItemName(lootId)}.`);
                    this.addItemToInventory(lootId);
                }
                this.broadcastEnemyState(this.player.location);
                this.updateRoomBlock();
                this.renderHud();
                this.saveState();
                return true;
            }

            // Enemy counter-attack (skip if evading)
            if (this.player.evading) {
                this.player.evading = false;
                this.terminal.print('You dodge the counter-attack with emergency thrusters!');
            } else {
                // Boss phase 3: double attack
                const attacks = (foe.boss && foe.phase === 3) ? 2 : 1;
                for (let i = 0; i < attacks; i++) {
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
                }
            }

            if (this.player.hp <= 0) {
                this.terminal.print('Your suit alarms wail. Consciousness fades...');
                if (this.onExit) this.onExit();
                this.saveState(true);
                return true;
            }

            this.updateRoomBlock();
            this.renderHud();
            this.saveState();
            return true;
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

            // Create sidebar container for HUD and map
            if (!this.sidebar) {
                this.sidebar = document.createElement('div');
                this.sidebar.className = 'mud-sidebar';
                container.appendChild(this.sidebar);
            }

            if (this.hud && this.hud.parentNode !== this.sidebar) {
                this.hud.parentNode.removeChild(this.hud);
                this.hud = null;
            }
            if (this.hud) return;
            this.hud = document.createElement('div');
            this.hud.className = 'mud-hud';
            this.hud.setAttribute('aria-hidden', 'true');
            this.sidebar.appendChild(this.hud);

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
            mapToggle.textContent = 'MAP ▲';
            mapToggle.addEventListener('click', () => {
                this.mapVisible = !this.mapVisible;
                mapToggle.textContent = this.mapVisible ? 'MAP ▲' : 'MAP ▼';
                if (this.mapPanel) {
                    this.mapPanel.classList.toggle('visible', this.mapVisible);
                }
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
            if (!this.sidebar) return;
            if (this.mapPanel && this.mapPanel.parentNode !== this.sidebar) {
                this.mapPanel.parentNode.removeChild(this.mapPanel);
                this.mapPanel = null;
            }
            if (!this.mapPanel) {
                const panel = document.createElement('div');
                panel.className = 'mud-map-panel';
                const pre = document.createElement('pre');
                panel.appendChild(pre);
                this.sidebar.appendChild(panel);
                this.mapPanel = panel;
            }
            this.attachTerminalClickHandlers();
        }

        attachTerminalClickHandlers() {
            const output = document.getElementById('terminal-output');
            if (!output || output.dataset.mudClickBound) return;
            output.dataset.mudClickBound = 'true';

            output.addEventListener('click', (e) => {
                // Handle clickable elements (items, exits, old threat pills)
                const clickable = e.target.closest('.clickable');
                if (clickable) {
                    const action = clickable.dataset.action;
                    const value = clickable.dataset.target;
                    if (!action || !value) return;

                    if (action === 'take') {
                        this.terminal.executeCommand(`take ${value}`, true);
                    } else if (action === 'attack') {
                        this.terminal.executeCommand(`attack ${value}`, true);
                    } else if (action === 'move') {
                        this.terminal.executeCommand(value, true);
                    }
                    return;
                }

                // Handle enemy card action buttons
                const actionBtn = e.target.closest('.enemy-action-btn');
                if (actionBtn && !actionBtn.disabled) {
                    const action = actionBtn.dataset.action;
                    const value = actionBtn.dataset.target;
                    if (action === 'attack') {
                        this.terminal.executeCommand(`attack ${value}`, true);
                    } else if (action === 'ability') {
                        if (value === 'scan') {
                            this.terminal.executeCommand('scan', true);
                        } else {
                            this.terminal.executeCommand(`ability ${value}`, true);
                        }
                    }
                }
            });
        }

        renderHud() {
            if (!this.hud) return;
            const room = this.world[this.player.location];
            const invList = this.getInventoryDisplayList(true);
            const mates = this.voidmates.length ? this.voidmates.map(vm => {
                const name = vm.name || vm;
                const roomKey = vm.room;
                const room = roomKey && this.world[roomKey];
                const roomName = room ? room.name : '???';
                const inSameRoom = roomKey === this.player.location;
                const roomLabel = inSameRoom ? '<span class="map-player">(here)</span>' : `<span class="map-voidmate">(${roomName})</span>`;
                return `<div>• ${name} ${roomLabel}</div>`;
            }).join('') : '<div>• none</div>';
            const en = this.player.energy;
            const canSurge = en >= 3;
            const canEvade = en >= 4;
            const canScan = en >= 2;
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
                    <div class="mud-divider"></div>
                    <div class="mud-abilities">
                        <button class="mud-ability-btn${canSurge ? '' : ' disabled'}" data-action="ability" data-target="surge" ${canSurge ? '' : 'disabled'}>surge <span class="en-cost">3</span></button>
                        <button class="mud-ability-btn${canEvade ? '' : ' disabled'}" data-action="ability" data-target="evade" ${canEvade ? '' : 'disabled'}>evade <span class="en-cost">4</span></button>
                        <button class="mud-ability-btn${canScan ? '' : ' disabled'}" data-action="ability" data-target="scan" ${canScan ? '' : 'disabled'}>scan <span class="en-cost">2</span></button>
                    </div>
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
            this.renderAsciiMapPanel();
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
                    localStorage.removeItem('voidMudState');
                    this.terminal.printHTML('<span class="presence-event">Progress cleared. Restarting...</span>');
                    if (window.terminal) {
                        window.terminal.endMudSession();
                        setTimeout(() => window.terminal.startMudSession(), 100);
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
                            this.terminal.executeCommand(`use ${id}`, true);
                        }
                    }
                });
            }

            const abilitiesContainer = this.hud.querySelector('.mud-abilities');
            if (abilitiesContainer) {
                abilitiesContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('.mud-ability-btn');
                    if (btn && !btn.disabled) {
                        const ability = btn.dataset.target;
                        if (ability === 'scan') {
                            this.terminal.executeCommand('scan', true);
                        } else if (ability) {
                            this.terminal.executeCommand(`ability ${ability}`, true);
                        }
                    }
                });
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
            this.mapPanel.classList.toggle('visible', this.mapVisible);
            if (!this.mapVisible) {
                this.mapPanel.innerHTML = '';
                return;
            }
            const loc = this.player.location;
            const rooms = this.world;
            const playerRoom = rooms[loc];
            const playerCoords = playerRoom ? playerRoom.coords : { x: 0, y: 0, z: 0 };
            const currentZ = playerCoords.z || 0;
            const isFullscreen = this.mapPanel.classList.contains('fullscreen');

            // Level names
            const levelNames = { '-1': 'Sublevel', '0': 'Main Deck', '1': 'Upper Deck' };

            // Build voidmate room lookup
            const voidmatesByRoom = {};
            this.voidmates.forEach(vm => {
                if (vm && vm.room) {
                    if (!voidmatesByRoom[vm.room]) voidmatesByRoom[vm.room] = [];
                    voidmatesByRoom[vm.room].push(vm.name);
                }
            });

            // Helper to check if room has vertical exits
            const getVerticalIndicator = (room) => {
                if (!room || !room.exits) return '';
                const hasUp = room.exits.up !== undefined;
                const hasDown = room.exits.down !== undefined;
                if (hasUp && hasDown) return '↕';
                if (hasUp) return '↑';
                if (hasDown) return '↓';
                return '';
            };

            // Render a single level's map
            const renderLevel = (zLevel, centerX, centerY, showFullLevel = false) => {
                const keyByCoord = {};
                Object.entries(rooms).forEach(([key, room]) => {
                    if (room.coords && room.coords.z === zLevel) {
                        keyByCoord[`${room.coords.x},${room.coords.y}`] = key;
                    }
                });

                let minX, maxX, minY, maxY;
                if (showFullLevel) {
                    // Show entire level
                    const coords = Object.values(rooms).filter(r => r.coords && r.coords.z === zLevel).map(r => r.coords);
                    if (coords.length === 0) return [];
                    minX = Math.min(...coords.map(c => c.x));
                    maxX = Math.max(...coords.map(c => c.x));
                    minY = Math.min(...coords.map(c => c.y));
                    maxY = Math.max(...coords.map(c => c.y));
                } else {
                    // Center on player with radius
                    const radius = 2;
                    minX = centerX - radius;
                    maxX = centerX + radius;
                    minY = centerY - radius;
                    maxY = centerY + radius;
                }

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
                            if (idx !== xs.length - 1) row += '  ';
                            return;
                        }
                        const room = rooms[key];
                        const discovered = this.mapUnlocked || this.discovered.has(key);
                        const isPlayer = key === loc;
                        const hasVoidmate = voidmatesByRoom[key] && voidmatesByRoom[key].length > 0;
                        const vertInd = discovered ? getVerticalIndicator(room) : '';
                        const label = discovered ? (room.abbr || '???') : '??';

                        let cell;
                        if (isPlayer && hasVoidmate) {
                            cell = `<span class="map-player">[*</span><span class="map-voidmate">${label.substring(0, 1)}${vertInd || '+'}</span><span class="map-player">]</span>`;
                        } else if (isPlayer) {
                            const display = vertInd ? `*${label.substring(0, 1)}${vertInd}` : `*${label.substring(0, 2)}`;
                            cell = `<span class="map-player">[${display}]</span>`;
                        } else if (hasVoidmate && discovered) {
                            const vmCount = voidmatesByRoom[key].length;
                            const vmLabel = vmCount > 1 ? `${label.substring(0, 2)}${vmCount}` : `@${label.substring(0, 1)}${vertInd || label.substring(1, 2)}`;
                            cell = `<span class="map-voidmate">[${vmLabel}]</span>`;
                        } else if (discovered) {
                            const display = vertInd ? `${label.substring(0, 2)}${vertInd}` : label.padEnd(3, ' ');
                            cell = `[${display}]`;
                        } else {
                            cell = `[${label}]`;
                        }
                        row += ` ${cell} `;
                        if (idx !== xs.length - 1) {
                            const eastKey = keyByCoord[`${x + 1},${y}`];
                            const eastDiscovered = eastKey && (this.mapUnlocked || this.discovered.has(eastKey));
                            const eastExit = room.exits && (room.exits.east === eastKey || (typeof room.exits.east === 'object' && room.exits.east.room === eastKey));
                            const hasCorridor = eastKey && eastExit && (discovered || eastDiscovered);
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
                            const hasSouth = key && southKey && room && room.exits && room.exits.south === southKey && ((this.mapUnlocked || this.discovered.has(key)) || southDiscovered);
                            vertRow += key ? (hasSouth ? '   │   ' : '       ') : '       ';
                            if (idx !== xs.length - 1) row += '  ';
                        });
                        lines.push(vertRow);
                    }
                });
                return lines;
            };

            // Build legend
            const voidmateNames = this.voidmates.map(vm => vm.name).filter(Boolean);
            const vmLegend = voidmateNames.length ? ` | <span class="map-voidmate">@</span>=${voidmateNames.join(', ')}` : '';
            const fullscreenIcon = isFullscreen ? '⊟' : '⊞';

            // Desktop shows all levels by default (3-column layout)
            const isDesktop = window.innerWidth >= 1024;
            const showAllLevels = isFullscreen || isDesktop;

            let mapContent;
            if (showAllLevels) {
                // Render all three levels
                const levels = [1, 0, -1]; // Upper, Main, Sublevel (top to bottom)
                const levelMaps = levels.map(z => {
                    const name = levelNames[String(z)] || `Level ${z}`;
                    const isCurrent = z === currentZ;
                    const lines = renderLevel(z, playerCoords.x, playerCoords.y, true);
                    const header = isCurrent
                        ? `<span class="map-player">═══ ${name} ═══</span>`
                        : `═══ ${name} ═══`;
                    return `<div class="mud-map-level-section">${header}\n${lines.join('\n')}</div>`;
                });
                mapContent = `<div class="mud-map-all-levels">${levelMaps.join('\n\n')}</div>`;
            } else {
                // Single level view (mobile)
                const levelName = levelNames[String(currentZ)] || `Level ${currentZ}`;
                const lines = renderLevel(currentZ, playerCoords.x, playerCoords.y, false);
                mapContent = `<div class="mud-map-level">${levelName}</div><pre>${lines.join('\n')}</pre>`;
            }

            // Hide fullscreen button on desktop (already showing all levels)
            const fullscreenBtn = isDesktop ? '' : `<button class="mud-map-fullscreen" data-action="toggle-fullscreen">${fullscreenIcon}</button>`;
            this.mapPanel.innerHTML = `${fullscreenBtn}${mapContent}<div class="mud-map-legend"><span class="map-player">*</span>=you${vmLegend} | ↑↓=stairs</div>`;
            this.attachMapFullscreenHandler();
        }

        attachMapFullscreenHandler() {
            if (!this.mapPanel) return;
            const btn = this.mapPanel.querySelector('.mud-map-fullscreen');
            if (!btn) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.mapPanel.classList.toggle('fullscreen');
                this.renderAsciiMapPanel();
            });
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

        getEnemyCard(enemy) {
            if (!enemy) return '';

            // Defeated state - show collapsed card
            if (enemy.defeated) {
                return `
                    <div class="mud-enemy-card defeated">
                        <div class="enemy-header">
                            <span class="enemy-name">${enemy.name}</span>
                            <span class="enemy-status">DEFEATED</span>
                        </div>
                        <div class="enemy-hp-bar">
                            <div class="enemy-hp-fill" style="width: 0%; background: #333"></div>
                            <span class="enemy-hp-text">0 HP</span>
                        </div>
                        <div class="enemy-desc">Area secure.</div>
                    </div>
                `.trim();
            }

            // Store maxHp on first encounter
            if (!enemy.maxHp) enemy.maxHp = enemy.hp;
            const maxHp = enemy.maxHp;
            const hpPercent = Math.max(0, Math.min(100, (enemy.hp / maxHp) * 100));
            const hpColor = hpPercent > 50 ? '#66ffcc' : hpPercent > 25 ? '#ffcc66' : '#ff6666';
            const desc = enemy.desc || 'A hostile entity.';
            const en = this.player.energy;
            const canSurge = en >= 3;
            const canEvade = en >= 4;
            const canScan = en >= 2;
            const isInvulnerable = enemy.fearLight;
            const isScanned = enemy.scanned;

            // Only show HP bar and ATK if scanned
            const atkDisplay = isScanned ? `<span class="enemy-atk">ATK ${enemy.attack}</span>` : '<span class="enemy-atk enemy-unknown">ATK ???</span>';
            const hpBar = isScanned
                ? `<div class="enemy-hp-bar">
                        <div class="enemy-hp-fill" style="width: ${hpPercent}%; background: ${hpColor}"></div>
                        <span class="enemy-hp-text">${enemy.hp} HP</span>
                   </div>`
                : `<div class="enemy-hp-bar enemy-unknown">
                        <div class="enemy-hp-fill" style="width: 100%; background: #666"></div>
                        <span class="enemy-hp-text">??? HP</span>
                   </div>`;
            const descDisplay = isScanned ? desc : 'Scan to analyze threat.';

            return `
                <div class="mud-enemy-card">
                    <div class="enemy-header">
                        <span class="enemy-name">${enemy.name}</span>
                        ${atkDisplay}
                    </div>
                    ${hpBar}
                    <div class="enemy-desc">${descDisplay}</div>
                    <div class="enemy-actions">
                        <button class="enemy-action-btn attack-btn" data-action="attack" data-target="${enemy.name}" ${isInvulnerable ? 'disabled title="Immune to physical attacks"' : ''}>${isInvulnerable ? '???' : 'attack'}</button>
                        <button class="enemy-action-btn${canSurge ? '' : ' disabled'}" data-action="ability" data-target="surge" ${canSurge ? '' : 'disabled'}>surge</button>
                        <button class="enemy-action-btn${canEvade ? '' : ' disabled'}" data-action="ability" data-target="evade" ${canEvade ? '' : 'disabled'}>evade</button>
                        <button class="enemy-action-btn${canScan ? '' : ' disabled'}" data-action="ability" data-target="scan" ${canScan ? '' : 'disabled'}>scan</button>
                    </div>
                </div>
            `.trim();
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

        broadcastEnemyState(roomKey) {
            if (!this.terminal || typeof this.terminal.broadcastMudPresence !== 'function') {
                return;
            }
            const room = this.world[roomKey];
            this.terminal.broadcastMudPresence('enemy-sync', {
                room: roomKey,
                enemy: room && room.enemy ? { name: room.enemy.name, hp: room.enemy.hp } : null
            });
        }

        handleEnemySync(roomKey, enemyData) {
            const room = this.world[roomKey];
            if (!room) return;

            if (!enemyData) {
                // Enemy was killed by voidmate
                if (room.enemy) {
                    this.terminal.print(`The ${room.enemy.name} collapses from voidmate assault.`);
                    room.enemy = null;
                    if (roomKey === this.player.location) {
                        this.updateRoomBlock();
                    }
                    this.renderHud();
                }
                return;
            }

            if (room.enemy && room.enemy.name === enemyData.name) {
                // Sync HP to lowest value (enemy took damage)
                if (enemyData.hp < room.enemy.hp) {
                    room.enemy.hp = enemyData.hp;
                }
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
                        dark: room.dark,
                        enemy: room.enemy ? {
                            name: room.enemy.name,
                            hp: room.enemy.hp,
                            maxHp: room.enemy.maxHp,
                            attack: room.enemy.attack,
                            loot: room.enemy.loot,
                            phase: room.enemy.phase,
                            boss: room.enemy.boss,
                            fearLight: room.enemy.fearLight,
                            scanned: room.enemy.scanned,
                            defeated: room.enemy.defeated
                        } : null
                    };
                });

                const state = {
                    version: '1.0.1',
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
                const supported = ['0.0.3', '0.0.4', '0.0.5', '0.0.6', '1.0.0', '1.0.1'];
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
                            // Restore dark state
                            if (data.dark !== undefined) {
                                this.world[key].dark = data.dark;
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
