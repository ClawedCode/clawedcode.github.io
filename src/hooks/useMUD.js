import { useState, useCallback, useEffect, useRef } from 'react'

export const MUD_VERSION = '3.0.0-voidrealm'
const STORAGE_KEY = 'voidMudState'
const STATE_VERSION = 2

// Migrate saved state to current version
const migrateState = (state) => {
  const version = state.stateVersion || 1

  if (version < 2) {
    // Add new player properties
    state.player.abilities = state.player.abilities || []

    // Add void realm tracking
    state.voidRealmUnlocked = state.voidRealmUnlocked || false

    // Ensure enemies have proper structure
    Object.keys(state.world).forEach(roomId => {
      const room = state.world[roomId]
      if (room.enemy && !room.enemy.maxHp) {
        room.enemy.maxHp = room.enemy.hp
      }
    })

    state.stateVersion = 2
  }

  return state
}

// Load saved state from localStorage
const loadSavedState = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  const parsed = JSON.parse(saved)
  // Convert discovered array back to Set
  if (parsed.discovered) {
    parsed.discovered = new Set(parsed.discovered)
  }
  return migrateState(parsed)
}

// Save state to localStorage
const saveState = (state) => {
  const toSave = {
    ...state,
    // Convert Set to array for JSON serialization
    discovered: Array.from(state.discovered),
    // Include state version for migration support
    stateVersion: STATE_VERSION
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
}

// Clear saved state
const clearSavedState = () => {
  localStorage.removeItem(STORAGE_KEY)
}

// Item definitions
export const ITEMS = {
  'med-patch': { name: 'med patch', icon: '🩹', type: 'consumable', desc: 'Restores +8 HP.', heal: 8 },
  'patch-kit': { name: 'patch kit', icon: '🧰', type: 'consumable', desc: 'Restores +8 HP.', heal: 8 },
  'repair-gel': { name: 'repair gel', icon: '🧪', type: 'consumable', desc: 'Restores +5 HP.', heal: 5 },
  'ion-cell': { name: 'ion cell', icon: '🔋', type: 'consumable', desc: 'Restores +4 EN.', energy: 4 },
  'shield-weave': { name: 'shield weave', icon: '🛡️', type: 'consumable', desc: 'Adds +4 SHIELD.', shield: 4 },
  'ration-bar': { name: 'ration bar', icon: '🍫', type: 'consumable', desc: 'Minor HP restore.', heal: 3 },
  'stim-pack': { name: 'stim pack', icon: '💉', type: 'consumable', desc: '+12 HP, +2 EN.', heal: 12, energy: 2 },
  'cryo-gel': { name: 'cryo gel', icon: '🧊', type: 'consumable', desc: '+6 HP, +2 Shield.', heal: 6, shield: 2 },
  'flare': { name: 'flare', icon: '✨', type: 'consumable', desc: 'Emergency illumination. Some things fear the light.', special: 'light' },
  'bio-sample': { name: 'bio-sample', icon: '🧬', type: 'quest', desc: 'Valuable research sample.' },
  'ion-shard': { name: 'ion shard', icon: '⚡', type: 'quest', desc: 'Charged fragment. Feels warm.' },
  'keycard-alpha': { name: 'keycard-alpha', icon: '🔑', type: 'quest', desc: 'Access token for escape skiff.' },
  'keycard-gamma': { name: 'keycard-gamma', icon: '🔑', type: 'quest', desc: 'Command authorization.' },
  'field-map': { name: 'field map', icon: '🗺️', type: 'tool', desc: 'Highlights points of interest.' },
  'plasma-torch': { name: 'plasma torch', icon: '🔦', type: 'equipment', desc: 'Weapon upgrade. Burns hot.', weapon: 'plasma torch' },
  'pulse-rifle': { name: 'pulse rifle', icon: '🔫', type: 'equipment', desc: 'Military grade. Burns hot.', weapon: 'pulse rifle' },
  'data-chip': { name: 'data chip', icon: '💾', type: 'tool', desc: 'Station logs. Fragments of the truth.' },
  // Light weapons for fighting void creatures
  'signal-flare': { name: 'signal flare', icon: '🎇', type: 'equipment', desc: 'Military-grade illumination. +8 bonus vs dark creatures.', weapon: 'signal flare', lightWeapon: true, lightBonus: 8 },
  'sunblade': { name: 'sunblade', icon: '☀️', type: 'equipment', desc: 'Ancient weapon of pure light. +10 vs dark, illuminates rooms.', weapon: 'sunblade', lightWeapon: true, lightBonus: 10, providesLight: true },
  // Artifacts (permanent abilities)
  'crown-of-darkness': { name: 'Crown of Darkness', icon: '👑', type: 'artifact', desc: "The Grue Queen's crown. Grants permanent darkvision.", permanent: true, ability: 'darkvision' }
}

// Readable terminal content
export const READABLES = {
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
I have learned to wait.`
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
  },
  // Void Realm readables
  'void-keeper': {
    name: "Light Keeper's Log",
    content: `KEEPER'S LOG - FINAL ENTRY

They asked why I stayed when the others fled.
I stayed because light needs a guardian.

The sunblade is ready. The signal flares charged.
Whoever finds this: the Queen can be killed.

Coordinated light. Overwhelming brilliance.
That is how you kill what birthed darkness itself.

The Living Dark was just a scout.
The Queen is still waiting.

[END LOG]`
  },
  'grue-queen': {
    name: "Ancient Inscription",
    content: `THE VOID SPEAKS:

Before light, there was Us.
Before warmth, there was Us.
Before you, there was Us.

You bring light to kill darkness.
But darkness does not die.
Darkness WAITS.

When your light fades—
And all light fades—
We will be here.

WE HAVE ALWAYS BEEN HERE.`
  }
}

// Create initial world state
const createWorld = () => ({
  // === MAIN DECK (Z=0) ===
  airlock: {
    name: 'Lunar Airlock',
    abbr: 'AIR',
    coords: { x: 0, y: 0, z: 0 },
    desc: 'Cold regolith dusts the floor in patterns that suggest footprints—hundreds of them, all facing inward. An offline viewport shows Earth hanging in shadow.',
    exits: { east: 'atrium' },
    items: ['ration-bar', 'flare'],
    enemy: null
  },
  atrium: {
    name: 'Glimmering Atrium',
    abbr: 'ATRI',
    coords: { x: 1, y: 0, z: 0 },
    desc: 'Columns of frosted glass hum with a frequency that feels wrong. Status monitors loop "VOID RESEARCH STATION // SAFE" with a timestamp frozen on Day 47.',
    exits: { west: 'airlock', east: 'lab', south: 'hangar', north: 'observatory', up: { room: 'lift', requires: 'keycard-gamma' } },
    items: [],
    enemy: null,
    readable: 'roster'
  },
  lab: {
    name: 'Umbra Biolab',
    abbr: 'LAB',
    coords: { x: 2, y: 0, z: 0 },
    desc: 'Biostasis pods hiss with labored breathing. Pod 7 is cracked, its occupant gone but leaving black spores that drift like thoughts given form.',
    exits: { west: 'atrium', east: 'reactor', south: 'maintenance' },
    items: ['med-patch'],
    enemy: { name: 'Spore Warden', hp: 11, maxHp: 11, attack: 4, loot: 'bio-sample', desc: "Dr. Chen's research assistant, transformed while guarding specimens." },
    readable: 'terminal'
  },
  reactor: {
    name: 'Helium-3 Reactor',
    abbr: 'RCT',
    coords: { x: 3, y: 0, z: 0 },
    desc: "Turbines whine at frequencies that create phantom voices. Blue plasma arcs light the catwalks, and in their flickering you see shadows that don't match the room's geometry.",
    exits: { west: 'lab', east: 'armory' },
    items: ['ion-cell', 'shield-weave'],
    enemy: { name: 'Arc Sentinel', hp: 14, maxHp: 14, attack: 5, loot: 'plasma-torch', desc: 'A maintenance drone that absorbed too much reactor radiation.' },
    readable: 'console'
  },
  armory: {
    name: 'Void Armory',
    abbr: 'ARM',
    coords: { x: 4, y: 0, z: 0 },
    desc: "Weapon racks sway in low gravity. A cracked visor leaks blue mist that forms faces before dissipating. The armory was the last stand.",
    exits: { west: 'reactor', east: 'escape-bay', south: 'cargo', north: 'antenna' },
    items: ['shield-weave'],
    enemy: { name: 'Selenite Marauder', hp: 12, maxHp: 12, attack: 4, loot: 'ion-cell', desc: "Chief of Security, transformed by void exposure." },
    readable: 'protocols'
  },
  cargo: {
    name: 'Cargo Bay',
    abbr: 'CRGO',
    coords: { x: 4, y: -1, z: 0 },
    desc: 'Crates float in a flickering grav field. Something shuffles inside the space between crates, in the null-gravity pockets where physics hesitates.',
    exits: { north: 'armory' },
    items: ['repair-gel', 'ion-cell'],
    enemy: { name: 'Grav Shambler', hp: 10, maxHp: 10, attack: 3, loot: 'shield-weave', desc: 'Multiple crew members merged during a gravity failure incident.' }
  },
  hangar: {
    name: 'Void Hangar',
    abbr: 'HNG',
    coords: { x: 1, y: -1, z: 0 },
    desc: "A survey skiff hangs from mag clamps, its hull scored with marks that look like claw scratches from outside. Among the floating tools: a child's toy.",
    exits: { north: 'atrium' },
    items: ['repair-gel'],
    enemy: { name: 'Hull Lurker', hp: 9, maxHp: 9, attack: 3, loot: 'patch-kit', desc: "Something that came in from outside. It doesn't need air." },
    readable: 'blackbox'
  },
  observatory: {
    name: 'Selenic Observatory',
    abbr: 'OBS',
    coords: { x: 1, y: 1, z: 0 },
    desc: 'Telescopes point eternally at Mare Tranquillitatis. In the eyepiece, you see it: a darkness that moves, that watches.',
    exits: { south: 'atrium' },
    items: ['ion-shard'],
    enemy: null,
    readable: 'log'
  },
  maintenance: {
    name: 'Maintenance Shaft',
    abbr: 'MNT',
    coords: { x: 2, y: -1, z: 0 },
    desc: "Pipes hiss with the station's last breath—recycled air from lungs that stopped breathing long ago. The scratches on the walls go only downward. A military case lies open nearby.",
    exits: { north: 'lab', down: 'containment' },
    items: ['patch-kit', 'signal-flare'],
    enemy: { name: 'Leak Drone', hp: 7, maxHp: 7, attack: 3, loot: 'ion-cell', desc: "A repair unit corrupted by something in the pipes." }
  },
  antenna: {
    name: 'Antenna Spire',
    abbr: 'ANT',
    coords: { x: 4, y: 1, z: 0 },
    desc: 'Array dishes groan as they sweep the void, still broadcasting the distress signal that went unanswered 247 years ago.',
    exits: { south: 'armory', up: { room: 'comms', requires: 'keycard-alpha' } },
    items: ['ion-cell'],
    enemy: null,
    readable: 'broadcast'
  },
  'escape-bay': {
    name: 'Escape Bay',
    abbr: 'ESC',
    coords: { x: 5, y: 0, z: 0 },
    desc: 'An emergency skiff awaits. The nav computer warns: "DESTINATION EARTH STATUS: UNKNOWN." Sometimes leaving is just another form of surrender.',
    exits: { west: 'armory' },
    items: [],
    enemy: null,
    isExit: true
  },
  comms: {
    name: 'Communications Hub',
    abbr: 'COMM',
    coords: { x: 4, y: 2, z: 0 },
    desc: 'Antenna uplink center. Static bursts from every speaker—distant signals from Earth mix with void whispers.',
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
    desc: 'Glass walls reveal suspended specimens. Warning lights pulse in silence, their rhythm matching your heartbeat.',
    exits: { up: 'maintenance', west: 'cell-block', east: 'cryogenics' },
    items: ['stim-pack'],
    enemy: { name: 'Containment Drone', hp: 15, maxHp: 15, attack: 5, loot: 'repair-gel', desc: 'A security automaton still running quarantine protocols.' }
  },
  'cell-block': {
    name: 'Cell Block',
    abbr: 'CELL',
    coords: { x: 1, y: 0, z: -1 },
    desc: 'Pitch darkness. Your suit lights fail the moment you enter—something is drinking the photons. The darkness here is ALIVE.',
    descLit: 'Rows of holding cells stretch into the gloom. Some doors are bent outward from the inside. Claw marks score the walls in patterns that almost spell words.',
    exits: { east: 'containment' },
    items: ['shield-weave', 'cryo-gel'],
    dark: true,
    enemy: { name: 'Living Dark', hp: 150, maxHp: 150, attack: 12, fearLight: true, vulnerableToLight: true, onDefeat: 'unlockVoidRealm', desc: 'Not a creature—an absence given hunger. Light weapons can harm it.' }
  },
  cryogenics: {
    name: 'Cryogenics Bay',
    abbr: 'CRYO',
    coords: { x: 3, y: 0, z: -1 },
    desc: 'Frost covers everything. One pod still glows: "DIRECTOR VASQUEZ - DO NOT OPEN." The ice around it is melting.',
    exits: { west: 'containment' },
    items: ['cryo-gel', 'med-patch'],
    enemy: { name: 'Void Wraith', hp: 18, maxHp: 18, attack: 5, loot: 'keycard-gamma', desc: "The station's first void-touched. It guards what it once was." }
  },
  // === UPPER DECK (Z=+1) - COMMAND ===
  lift: {
    name: 'Central Lift',
    abbr: 'LIFT',
    coords: { x: 2, y: 0, z: 1 },
    desc: 'Elevator hub connecting all station levels. Emergency lights pulse red. Graffiti: "THE CAPTAIN STAYED. THE CAPTAIN ALWAYS STAYS."',
    exits: { down: 'atrium', west: 'crew-quarters', east: 'archives', north: 'bridge' },
    items: ['ion-cell'],
    enemy: null
  },
  'crew-quarters': {
    name: 'Crew Quarters',
    abbr: 'CREW',
    coords: { x: 1, y: 0, z: 1 },
    desc: 'Personal bunks and lockers line the walls. Photos of families are stuck everywhere—some crossed out, some circled.',
    exits: { east: 'lift' },
    items: ['ration-bar', 'patch-kit', 'stim-pack'],
    enemy: { name: 'Data Specter', hp: 16, maxHp: 16, attack: 5, loot: 'data-chip', desc: 'A consciousness that uploaded itself to escape death. It succeeded. It failed.' }
  },
  archives: {
    name: 'Data Archives',
    abbr: 'ARCH',
    coords: { x: 3, y: 0, z: 1 },
    desc: "Server racks hum with the station's memory. Terminals flicker with corrupted logs—fragments of truth hiding in the static.",
    exits: { west: 'lift' },
    items: ['data-chip', 'ion-shard', 'field-map'],
    enemy: null,
    readable: 'records'
  },
  bridge: {
    name: 'Command Bridge',
    abbr: 'BRDG',
    coords: { x: 2, y: 1, z: 1 },
    desc: "Panoramic viewports show Earth in shadow. The captain's chair faces the void, and something sits in it. Something that remembers being human.",
    exits: { south: 'lift' },
    items: ['pulse-rifle', 'stim-pack'],
    enemy: { name: 'Bridge Guardian', hp: 20, maxHp: 20, attack: 6, loot: 'keycard-alpha', desc: "The station's final officer, fused with the command systems." },
    readable: 'captain-log'
  },
  // === VOID REALM (Z=-2) - Secret level unlocked by defeating Living Dark ===
  'void-antechamber': {
    name: 'Void Antechamber',
    abbr: 'VOID',
    coords: { x: 1, y: 0, z: -2 },
    desc: 'You emerge into anti-light. Not darkness—the opposite of seeing. Reality recoils from this place.',
    exits: { up: 'cell-block', east: 'void-nursery', south: 'void-archive' },
    items: ['med-patch'],
    enemy: null,
    dark: true,
    voidRealm: true
  },
  'void-nursery': {
    name: 'The Spawning Darkness',
    abbr: 'NURS',
    coords: { x: 2, y: 0, z: -2 },
    desc: 'Pools of liquid shadow birth things that hunger. They are becoming what they always were.',
    exits: { west: 'void-antechamber', east: 'void-sanctum' },
    items: ['signal-flare'],
    enemy: { name: 'Grue Spawn', hp: 35, maxHp: 35, attack: 6, vulnerableToLight: true, loot: 'cryo-gel', desc: 'A fragment of the Living Dark. Newborn hunger given form.' },
    dark: true,
    voidRealm: true
  },
  'void-archive': {
    name: 'Archive of Lost Light',
    abbr: 'ARCV',
    coords: { x: 1, y: -1, z: -2 },
    desc: 'Crystalline structures hold captured photons from before the void. Ancient weapons of light sleep here.',
    exits: { north: 'void-antechamber' },
    items: ['sunblade', 'stim-pack'],
    enemy: { name: 'Void Wraith', hp: 45, maxHp: 45, attack: 7, vulnerableToLight: true, loot: 'ion-shard', desc: 'A consciousness that became nothing. It remembers light with hatred.' },
    dark: false,
    voidRealm: true,
    readable: 'void-keeper'
  },
  'void-sanctum': {
    name: 'Sanctum of Eternal Night',
    abbr: 'SANC',
    coords: { x: 3, y: 0, z: -2 },
    desc: 'The heart of absence. Here dwells what birthed the Living Dark—the Grue Queen.',
    exits: { west: 'void-nursery' },
    items: [],
    enemy: {
      name: 'Grue Queen',
      hp: 200,
      maxHp: 200,
      attack: 10,
      boss: true,
      vulnerableToLight: true,
      loot: 'crown-of-darkness',
      desc: 'Mother of all that hungers in the dark. She has waited eons for this meeting.'
    },
    dark: true,
    voidRealm: true,
    readable: 'grue-queen'
  }
})

const createPlayer = () => ({
  location: 'airlock',
  hp: 18,
  maxHp: 18,
  energy: 10,
  shield: 0,
  inventory: [
    { id: 'patch-kit', qty: 1 },
    { id: 'ion-cell', qty: 1 }
  ],
  weapon: 'shock baton',
  abilityCharge: null,
  evading: false,
  abilities: []  // Permanent abilities like 'darkvision'
})

export const useMUD = (onOutput, playerName = 'wanderer') => {
  // Try to load saved state
  const savedState = useRef(loadSavedState())
  const isRestored = useRef(!!savedState.current)
  const hasInitialized = useRef(false)

  const [world, setWorld] = useState(() => savedState.current?.world || createWorld())
  const [player, setPlayer] = useState(() => savedState.current?.player || createPlayer())
  const [discovered, setDiscovered] = useState(() => savedState.current?.discovered || new Set(['airlock']))
  const [gameOver, setGameOver] = useState(() => savedState.current?.gameOver || false)
  const [victory, setVictory] = useState(() => savedState.current?.victory || false)
  const [mapUnlocked, setMapUnlocked] = useState(() => savedState.current?.mapUnlocked || false)

  const print = useCallback((text, type = 'output') => {
    onOutput?.({ text, type })
  }, [onOutput])

  const getCurrentRoom = useCallback(() => {
    return world[player.location]
  }, [world, player.location])

  // Inventory helpers
  const findInventoryEntry = useCallback((nameOrId) => {
    const searchId = nameOrId.toLowerCase().replace(/\s+/g, '-')
    return player.inventory.find(entry => {
      const item = ITEMS[entry.id]
      return entry.id === searchId ||
             item?.name.toLowerCase().includes(nameOrId.toLowerCase())
    })
  }, [player.inventory])

  const addItemToInventory = useCallback((id, qty = 1) => {
    setPlayer(prev => {
      const existing = prev.inventory.find(e => e.id === id)
      if (existing) {
        return {
          ...prev,
          inventory: prev.inventory.map(e =>
            e.id === id ? { ...e, qty: e.qty + qty } : e
          )
        }
      }
      return {
        ...prev,
        inventory: [...prev.inventory, { id, qty }]
      }
    })
    if (id === 'field-map') {
      setMapUnlocked(true)
    }
  }, [])

  const removeItemFromInventory = useCallback((id, qty = 1) => {
    setPlayer(prev => {
      const entry = prev.inventory.find(e => e.id === id)
      if (!entry) return prev
      if (entry.qty <= qty) {
        return { ...prev, inventory: prev.inventory.filter(e => e.id !== id) }
      }
      return {
        ...prev,
        inventory: prev.inventory.map(e =>
          e.id === id ? { ...e, qty: e.qty - qty } : e
        )
      }
    })
  }, [])

  const describeRoom = useCallback(() => {
    const room = getCurrentRoom()
    if (!room) return

    print(`\n=== ${room.name.toUpperCase()} ===`, 'system')

    // Check for darkvision ability
    const hasDarkvision = player.abilities?.includes('darkvision')
    const canSee = !room.dark || room.lit || hasDarkvision

    if (!canSee) {
      print('Pitch darkness. You cannot see.')
    } else {
      const roomDesc = room.descLit || room.desc
      if (hasDarkvision && room.dark && !room.lit) {
        print('[Darkvision active]', 'system')
      }
      print(roomDesc)
    }

    if (canSee) {
      if (room.items?.length > 0) {
        const itemNames = room.items.map(id => `${ITEMS[id]?.icon} ${ITEMS[id]?.name}`).join(', ')
        print(`Items: ${itemNames}`, 'system')
      }

      if (room.enemy && !room.enemy.defeated) {
        const scannedInfo = room.enemy.scanned
          ? `HP: ${room.enemy.hp}/${room.enemy.maxHp} | ATK: ${room.enemy.attack}`
          : 'HP: ???/??? | ATK: ???'
        print(`⚠️ Enemy: ${room.enemy.name} (${scannedInfo})`, 'error')
      }

      if (room.readable) {
        print(`📟 Terminal: ${READABLES[room.readable]?.name} (type "read")`, 'system')
      }
    }

    const exitList = Object.entries(room.exits).map(([dir, exit]) => {
      if (typeof exit === 'object' && exit.requires) {
        const hasKey = findInventoryEntry(exit.requires)
        return hasKey ? dir : `${dir}🔒`
      }
      return dir
    }).join(', ')
    print(`Exits: ${exitList}`, 'system')
  }, [getCurrentRoom, print, findInventoryEntry, player.abilities])

  const move = useCallback((direction) => {
    const room = getCurrentRoom()
    const exit = room.exits[direction]

    if (!exit) {
      print(`You cannot go ${direction} from here.`, 'error')
      return false
    }

    // Block movement if there's an undefeated enemy in the room
    if (room.enemy && !room.enemy.defeated) {
      print(`The ${room.enemy.name} blocks your path! You must defeat it first.`, 'error')
      return false
    }

    const targetRoom = typeof exit === 'string' ? exit : exit.room
    const requires = typeof exit === 'object' ? exit.requires : null

    if (requires && !findInventoryEntry(requires)) {
      const itemName = ITEMS[requires]?.name || requires
      print(`Access panel flashes red. Requires ${itemName}.`, 'error')
      return false
    }

    // Regenerate energy on movement
    setPlayer(prev => ({
      ...prev,
      location: targetRoom,
      energy: Math.min(14, prev.energy + 1)
    }))
    setDiscovered(prev => new Set([...prev, targetRoom]))

    print(`You move ${direction.toUpperCase()}...`)
    return true
  }, [getCurrentRoom, findInventoryEntry, print])

  const takeItem = useCallback((itemName) => {
    const room = getCurrentRoom()

    if (room.dark && !room.lit) {
      print('Too dark to see. You fumble blindly but find nothing.', 'error')
      return false
    }

    const itemId = room.items?.find(id =>
      ITEMS[id]?.name.toLowerCase().includes(itemName.toLowerCase())
    )

    if (!itemId) {
      print(`No "${itemName}" here to take.`, 'error')
      return false
    }

    setWorld(prev => ({
      ...prev,
      [player.location]: {
        ...prev[player.location],
        items: prev[player.location].items.filter(i => i !== itemId)
      }
    }))
    addItemToInventory(itemId)
    print(`Taken: ${ITEMS[itemId].icon} ${ITEMS[itemId].name}`)
    return true
  }, [getCurrentRoom, player.location, addItemToInventory, print])

  const useItem = useCallback((itemName) => {
    const entry = findInventoryEntry(itemName)
    if (!entry) {
      print(`You do not carry that.`, 'error')
      return false
    }

    const item = ITEMS[entry.id]
    if (!item) {
      print('The item hums but does nothing obvious.', 'error')
      return false
    }

    let consumed = false
    const messages = []

    if (item.heal) {
      const prev = player.hp
      const newHp = Math.min(player.maxHp, player.hp + item.heal)
      setPlayer(p => ({ ...p, hp: newHp }))
      messages.push(`HP ${prev}→${newHp}`)
      consumed = true
    }

    if (item.energy) {
      const prev = player.energy
      const newEn = Math.min(14, player.energy + item.energy)
      setPlayer(p => ({ ...p, energy: newEn }))
      messages.push(`EN ${prev}→${newEn}`)
      consumed = true
    }

    if (item.shield) {
      const prev = player.shield
      const newSh = Math.min(6, player.shield + item.shield)
      setPlayer(p => ({ ...p, shield: newSh }))
      messages.push(`Shield ${prev}→${newSh}`)
      consumed = true
    }

    if (item.weapon) {
      setPlayer(p => ({ ...p, weapon: item.weapon }))
      print(`${item.name} hums with lethal energy. Weapon equipped.`)
      return true
    }

    if (item.special === 'light') {
      const room = getCurrentRoom()

      // Combat use: burst damage to light-vulnerable enemies
      if (room.enemy?.vulnerableToLight && !room.enemy.defeated) {
        const flareDamage = 25
        const newHp = room.enemy.hp - flareDamage

        print('The flare explodes with blinding intensity!', 'system')
        print(`${room.enemy.name} takes ${flareDamage} damage!`, 'system')

        if (newHp <= 0) {
          // Handle enemy defeat
          print(`${room.enemy.name} is defeated!`, 'system')

          if (room.enemy.onDefeat === 'unlockVoidRealm') {
            print('')
            print('The Living Dark SHRIEKS—a sound that tears reality.', 'system')
            print('Where it fell, a rift opens to somewhere DEEPER.', 'system')
            print('A portal to the Void Realm appears. (Type "down" to enter)', 'system')

            setWorld(prev => ({
              ...prev,
              'cell-block': {
                ...prev['cell-block'],
                exits: { ...prev['cell-block'].exits, down: 'void-antechamber' },
                dark: false,
                lit: true,
                enemy: { ...prev['cell-block'].enemy, hp: 0, defeated: true }
              }
            }))
          } else {
            // Standard defeat
            if (room.enemy.loot) {
              addItemToInventory(room.enemy.loot)
              print(`Looted: ${ITEMS[room.enemy.loot]?.icon} ${ITEMS[room.enemy.loot]?.name}`, 'system')
            }
            setWorld(prev => ({
              ...prev,
              [player.location]: {
                ...prev[player.location],
                dark: false,
                lit: true,
                enemy: { ...prev[player.location].enemy, hp: 0, defeated: true }
              }
            }))
          }
        } else {
          // Enemy still alive, just damaged
          setWorld(prev => ({
            ...prev,
            [player.location]: {
              ...prev[player.location],
              dark: false,
              lit: true,
              enemy: { ...prev[player.location].enemy, hp: newHp }
            }
          }))
        }
        consumed = true
      } else if (room.dark && room.enemy?.fearLight && !room.enemy.vulnerableToLight) {
        // Legacy banish behavior for fearLight-only enemies
        setWorld(prev => ({
          ...prev,
          [player.location]: { ...prev[player.location], dark: false, lit: true, enemy: null }
        }))
        print('The flare ignites with blinding intensity! The creature SHRIEKS and dissolves into shadows.', 'system')
        consumed = true
      } else {
        // No enemy or not vulnerable
        print('The flare burns bright. Shadows recoil briefly.')
        if (room.dark) {
          setWorld(prev => ({
            ...prev,
            [player.location]: { ...prev[player.location], dark: false, lit: true }
          }))
          print('The room is now illuminated.', 'system')
        }
        consumed = true
      }
    }

    if (entry.id === 'field-map') {
      setMapUnlocked(true)
      print('Map data synced. Station layout now visible.')
      return true
    }

    if (entry.id === 'data-chip') {
      print('You scan the chip: "They came from the shadow on the Moon. We didn\'t summon them. We remembered them."')
      return true
    }

    if (entry.id === 'keycard-alpha' && player.location === 'escape-bay') {
      const room = getCurrentRoom()
      if (!room.enemy) {
        setWorld(prev => ({
          ...prev,
          'escape-bay': {
            ...prev['escape-bay'],
            enemy: {
              name: 'Void Warden',
              hp: 25,
              maxHp: 25,
              attack: 6,
              phase: 1,
              boss: true,
              loot: null,
              desc: "Director Vasquez—the station's first void-touched. Now he IS what he contained."
            }
          }
        }))
        print('You slot the keycard-alpha. The console flashes green.', 'system')
        print('Engines begin to warm—')
        print('')
        print('The lights die. Something vast uncurls from the shadows.')
        print('The VOID WARDEN blocks your escape.', 'error')
        return true
      }
    }

    if (messages.length) {
      print(`Used ${item.name}. ${messages.join(', ')}.`)
    }

    if (consumed && item.type === 'consumable') {
      removeItemFromInventory(entry.id, 1)
    }

    return true
  }, [findInventoryEntry, player, getCurrentRoom, addItemToInventory, removeItemFromInventory, print])

  const useAbility = useCallback((abilityName) => {
    const ability = abilityName.toLowerCase()
    const abilities = {
      surge: { cost: 3, desc: 'Reroute suit power. +4 damage on next attack.' },
      evade: { cost: 4, desc: 'Emergency thrusters. Skip enemy counter-attack.' },
      scan: { cost: 2, desc: 'Deep scan. Reveal enemy weakness and hidden details.' }
    }

    const abilityData = abilities[ability]
    if (!abilityData) {
      print('Unknown ability. Available: surge, evade, scan', 'error')
      return false
    }

    if (player.energy < abilityData.cost) {
      print(`Not enough energy. ${ability.toUpperCase()} requires ${abilityData.cost} EN.`, 'error')
      return false
    }

    setPlayer(prev => ({ ...prev, energy: prev.energy - abilityData.cost }))

    if (ability === 'surge') {
      setPlayer(prev => ({ ...prev, abilityCharge: 'surge' }))
      print('Suit power rerouted to weapon systems. Next attack: +4 damage.')
    } else if (ability === 'evade') {
      setPlayer(prev => ({ ...prev, evading: true }))
      print('Emergency thrusters primed. Next enemy attack will miss.')
    } else if (ability === 'scan') {
      const room = getCurrentRoom()
      const results = []

      if (room.enemy && !room.enemy.defeated) {
        setWorld(prev => ({
          ...prev,
          [player.location]: {
            ...prev[player.location],
            enemy: { ...prev[player.location].enemy, scanned: true }
          }
        }))
        results.push(`Threat analyzed: ${room.enemy.name} - HP: ${room.enemy.hp}/${room.enemy.maxHp}, ATK: ${room.enemy.attack}`)
        if (room.enemy.desc) results.push(`Intel: ${room.enemy.desc}`)
      }

      if (room.readable) {
        const readable = READABLES[room.readable]
        if (readable) results.push(`Terminal detected: ${readable.name} (type "read")`)
      }

      const levelNames = { '-1': 'Sublevel (Containment)', '0': 'Main Deck', '1': 'Upper Deck (Command)' }
      const levelName = levelNames[String(room.coords.z)] || `Level ${room.coords.z}`
      results.push(`Location: ${levelName}`)

      print(results.join('\n'), 'system')
    }

    return true
  }, [player, getCurrentRoom, print])

  const attack = useCallback((targetName) => {
    const room = getCurrentRoom()
    if (!room.enemy || room.enemy.defeated) {
      print('Nothing to attack here.', 'error')
      return false
    }

    // Check for darkvision ability
    const hasDarkvision = player.abilities?.includes('darkvision')
    if (room.dark && !room.lit && !hasDarkvision) {
      print('You cannot fight what you cannot see!', 'error')
      return false
    }

    const enemy = room.enemy

    // Check for light-vulnerable enemies (Living Dark, Grue Queen, etc.)
    const weaponKey = Object.keys(ITEMS).find(k => ITEMS[k].weapon === player.weapon)
    const currentWeapon = weaponKey ? ITEMS[weaponKey] : null
    const hasLightWeapon = currentWeapon?.lightWeapon

    if (enemy.vulnerableToLight && !hasLightWeapon) {
      // Can't damage without light weapon
      print(`Your ${player.weapon} passes through the ${enemy.name} like it isn't there.`, 'error')
      print('Physical attacks are useless. You need LIGHT weapons.')

      // Reduced counter-attack (not instant-kill like before)
      const damage = Math.max(3, Math.floor(Math.random() * 6) + 3)
      setPlayer(prev => ({ ...prev, hp: prev.hp - damage }))
      print(`The darkness tears at you for ${damage} damage!`, 'error')

      if (player.hp - damage <= 0) {
        print('\n=== GAME OVER ===', 'error')
        print('The darkness consumes you utterly...', 'error')
        setGameOver(true)
      }
      return true
    }

    // Calculate weapon modifier
    const weaponMod = { 'shock baton': 1, 'plasma torch': 3, 'pulse rifle': 5, 'signal flare': 4, 'sunblade': 6 }
    let baseDamage = Math.max(2, Math.floor(Math.random() * 4) + 3 + (weaponMod[player.weapon] || 1))

    // Light weapon bonus damage vs vulnerable enemies
    if (enemy.vulnerableToLight && hasLightWeapon) {
      const lightBonus = currentWeapon.lightBonus || 0
      baseDamage += lightBonus
      if (lightBonus > 0) {
        print(`Your ${player.weapon} blazes with searing light! +${lightBonus} damage`, 'system')
      }
    }

    // Surge ability
    if (player.abilityCharge === 'surge') {
      baseDamage += 4
      setPlayer(prev => ({ ...prev, abilityCharge: null }))
      print('SURGE activated! Power flows through your weapon.', 'system')
    }

    // Ion shard bonus vs Void Warden
    if (enemy.boss && enemy.name === 'Void Warden' && findInventoryEntry('ion-shard')) {
      baseDamage += 8
      print('The ion-shard resonates! The Warden recoils from its light.', 'system')
      removeItemFromInventory('ion-shard', 1)
    }

    const newEnemyHp = enemy.hp - baseDamage
    print(`You strike ${enemy.name} with ${player.weapon} for ${baseDamage} damage!`)

    // Boss phase transitions
    if (enemy.boss && newEnemyHp > 0) {
      if (enemy.phase === 1 && newEnemyHp <= 17) {
        setWorld(prev => ({
          ...prev,
          [player.location]: {
            ...prev[player.location],
            enemy: { ...prev[player.location].enemy, hp: newEnemyHp, phase: 2 }
          }
        }))
        print('The Void Warden screams. Tendrils of darkness spawn!', 'error')
      } else if (enemy.phase === 2 && newEnemyHp <= 9) {
        setWorld(prev => ({
          ...prev,
          [player.location]: {
            ...prev[player.location],
            enemy: { ...prev[player.location].enemy, hp: newEnemyHp, phase: 3 }
          }
        }))
        print('DESPERATION. The Void Warden attacks with frenzied fury!', 'error')
      }
    }

    if (newEnemyHp <= 0) {
      print(`${enemy.name} is defeated!`, 'system')

      // Living Dark defeat -> Unlock Void Realm
      if (enemy.onDefeat === 'unlockVoidRealm') {
        print('')
        print('The Living Dark SHRIEKS—a sound that tears reality.', 'system')
        print('Where it fell, a rift opens to somewhere DEEPER.', 'system')
        print('A portal to the Void Realm appears. (Type "down" to enter)', 'system')

        // Add exit to void realm from cell-block
        setWorld(prev => ({
          ...prev,
          'cell-block': {
            ...prev['cell-block'],
            exits: { ...prev['cell-block'].exits, down: 'void-antechamber' },
            dark: false,
            lit: true,
            enemy: { ...enemy, hp: 0, defeated: true }
          }
        }))

        if (enemy.loot) {
          addItemToInventory(enemy.loot)
          print(`Looted: ${ITEMS[enemy.loot]?.icon} ${ITEMS[enemy.loot]?.name}`, 'system')
        }
        return true
      }

      // Grue Queen defeat -> Ultimate victory
      if (enemy.boss && enemy.name === 'Grue Queen') {
        print('')
        print('The Grue Queen screams as light pierces her eternal form.', 'system')
        print('"You... have ended... the first darkness..."')
        print('')
        print('The Crown of Darkness falls at your feet.', 'system')
        print('')
        print('▓▓▓ THE VOID REALM IS CLEANSED ▓▓▓', 'system')
        print('You have conquered what existed before light itself.', 'system')

        // Grant crown artifact with ability
        addItemToInventory('crown-of-darkness')
        setPlayer(prev => ({
          ...prev,
          abilities: [...(prev.abilities || []), 'darkvision']
        }))
        print('ABILITY GAINED: DARKVISION', 'system')

        setVictory(true)
        setWorld(prev => ({
          ...prev,
          [player.location]: { ...prev[player.location], enemy: { ...enemy, hp: 0, defeated: true } }
        }))
        return true
      }

      // Void Warden boss victory (original escape victory)
      if (enemy.boss && enemy.name === 'Void Warden') {
        print('')
        print("Director Vasquez's form dissolves into shadow.")
        print('"Finally... release..."')
        print('')
        print('The escape skiff hums. The path is clear.')
        print('')
        print('▓▓▓ YOU ESCAPED THE VOID NODE ▓▓▓', 'system')
        setVictory(true)
        setWorld(prev => ({
          ...prev,
          [player.location]: { ...prev[player.location], enemy: { ...enemy, hp: 0, defeated: true } }
        }))
        return true
      }

      if (enemy.loot) {
        addItemToInventory(enemy.loot)
        print(`Looted: ${ITEMS[enemy.loot]?.icon} ${ITEMS[enemy.loot]?.name}`, 'system')
      }
      setWorld(prev => ({
        ...prev,
        [player.location]: {
          ...prev[player.location],
          enemy: { ...enemy, hp: 0, defeated: true }
        }
      }))
      return true
    }

    // Update enemy HP
    setWorld(prev => ({
      ...prev,
      [player.location]: {
        ...prev[player.location],
        enemy: { ...prev[player.location].enemy, hp: newEnemyHp }
      }
    }))

    // Enemy counter-attack
    if (player.evading) {
      setPlayer(prev => ({ ...prev, evading: false }))
      print('You dodge the counter-attack with emergency thrusters!')
      return true
    }

    // Boss phase 3: double attack
    const attacks = (enemy.boss && enemy.phase === 3) ? 2 : 1
    let totalDamage = 0

    for (let i = 0; i < attacks; i++) {
      let damage = Math.max(1, Math.floor(Math.random() * enemy.attack))
      if (player.shield > 0) {
        const absorbed = Math.min(player.shield, damage)
        damage -= absorbed
        setPlayer(prev => ({ ...prev, shield: prev.shield - absorbed }))
        if (absorbed > 0) print(`Shield absorbs ${absorbed} damage.`)
      }
      totalDamage += damage
    }

    if (totalDamage > 0) {
      setPlayer(prev => ({ ...prev, hp: prev.hp - totalDamage }))
      print(`${enemy.name} counters for ${totalDamage} damage!`, 'error')
    } else {
      print(`${enemy.name} fails to breach your shields.`)
    }

    if (player.hp - totalDamage <= 0) {
      print('\n=== GAME OVER ===', 'error')
      print('Your suit alarms wail. Consciousness fades...', 'error')
      setGameOver(true)
    }

    return true
  }, [getCurrentRoom, player, findInventoryEntry, addItemToInventory, removeItemFromInventory, print])

  const readTerminal = useCallback(() => {
    const room = getCurrentRoom()
    if (!room.readable) {
      print('No data terminals in this area.', 'error')
      return false
    }

    const readable = READABLES[room.readable]
    if (!readable) {
      print('Terminal corrupted. Data unrecoverable.', 'error')
      return false
    }

    print('')
    print(`=== ${readable.name.toUpperCase()} ===`, 'system')
    readable.content.split('\n').forEach(line => print(line))
    print('=== END ===', 'system')
    return true
  }, [getCurrentRoom, print])

  const handleCommand = useCallback((input) => {
    if (gameOver) {
      if (input.toLowerCase() === 'restart') {
        clearSavedState()
        setWorld(createWorld())
        setPlayer(createPlayer())
        setDiscovered(new Set(['airlock']))
        setGameOver(false)
        setVictory(false)
        setMapUnlocked(false)
        print('=== VOID MUD RESTARTED ===', 'system')
        describeRoom()
        return true
      }
      print('Game over. Type "restart" to begin again.', 'error')
      return false
    }

    const [cmd, ...args] = input.trim().toLowerCase().split(/\s+/)

    switch (cmd) {
      case 'help':
        print('\n=== VOID MUD COMMANDS ===', 'system')
        print('Movement: north/south/east/west/up/down')
        print('Actions:')
        print('  look       - Describe current room')
        print('  take <item> - Pick up item')
        print('  use <item>  - Use item from inventory')
        print('  attack      - Attack enemy in room')
        print('  read        - Read terminal in room')
        print('Abilities (cost EN):')
        print('  surge (3 EN)  - +4 damage next attack')
        print('  evade (4 EN)  - Skip enemy counter')
        print('  scan (2 EN)   - Reveal enemy stats')
        print('Info:')
        print('  inv/inventory - Show inventory')
        print('  stats         - Show player stats')
        print('  reset         - Reset progress')
        print('  exit          - Leave (at escape bay)')
        print('Multiplayer:')
        print('  link <code>   - Connect to voidmate')
        print('  say <message> - Chat with voidmates')
        return true

      case 'look':
      case 'l':
        describeRoom()
        return true

      case 'north': case 'n':
      case 'south': case 's':
      case 'east': case 'e':
      case 'west': case 'w':
      case 'up': case 'u':
      case 'down': case 'd':
        const dirMap = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' }
        const dir = dirMap[cmd] || cmd
        if (move(dir)) describeRoom()
        return true

      case 'take':
      case 'get':
        return takeItem(args.join(' '))

      case 'use':
        return useItem(args.join(' '))

      case 'attack':
      case 'fight':
      case 'kill':
        return attack(args.join(' '))

      case 'surge':
      case 'evade':
      case 'scan':
        return useAbility(cmd)

      case 'ability':
        return useAbility(args[0])

      case 'read':
        return readTerminal()

      case 'inv':
      case 'inventory':
      case 'i':
        if (player.inventory.length === 0) {
          print('Inventory is empty.')
        } else {
          print('\n=== INVENTORY ===', 'system')
          player.inventory.forEach(entry => {
            const item = ITEMS[entry.id]
            const qty = entry.qty > 1 ? ` x${entry.qty}` : ''
            print(`${item?.icon} ${item?.name}${qty}: ${item?.desc}`)
          })
        }
        return true

      case 'stats':
      case 'status':
        print('\n=== PLAYER STATUS ===', 'system')
        print(`HP: ${player.hp}/${player.maxHp}`)
        print(`EN: ${player.energy}/14`)
        print(`Shield: ${player.shield}/6`)
        print(`Weapon: ${player.weapon}`)
        if (player.abilityCharge) print(`Charged: ${player.abilityCharge}`)
        if (player.evading) print('Evade ready!')
        if (player.abilities?.length > 0) print(`Abilities: ${player.abilities.join(', ')}`)
        return true

      case 'escape':
      case 'exit':
        if (player.location === 'escape-bay') {
          if (!getCurrentRoom().enemy) {
            print('The console requires keycard-alpha. Use it to activate launch sequence.', 'error')
          } else {
            print('The Void Warden blocks your path. You must defeat it to escape.', 'error')
          }
        } else {
          print('Find the escape bay to leave.', 'error')
        }
        return true

      case 'reset':
        return 'confirm-reset'

      case 'link':
        if (!args[0]) {
          print('Usage: link <code>', 'error')
          return false
        }
        return { action: 'link', code: args[0] }

      case 'say':
        if (!args.length) {
          print('Usage: say <message>', 'error')
          return false
        }
        return { action: 'say', message: args.join(' ') }

      case 'confirm-reset':
        clearSavedState()
        setWorld(createWorld())
        setPlayer(createPlayer())
        setDiscovered(new Set(['airlock']))
        setGameOver(false)
        setVictory(false)
        setMapUnlocked(false)
        print('=== PROGRESS RESET ===', 'system')
        print('The void resets. You wake in the airlock once more.', 'system')
        describeRoom()
        return true

      default:
        print(`Unknown command: ${cmd}. Type "help" for commands.`, 'error')
        return false
    }
  }, [gameOver, move, takeItem, useItem, attack, useAbility, readTerminal, describeRoom, player, getCurrentRoom, print])

  // Auto-save state whenever it changes
  useEffect(() => {
    // Don't save on initial mount before state is ready
    const timeoutId = setTimeout(() => {
      saveState({
        world,
        player,
        discovered,
        gameOver,
        victory,
        mapUnlocked
      })
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [world, player, discovered, gameOver, victory, mapUnlocked])

  // Initial room description (guard against StrictMode double-mount)
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    print('=== VOID MUD v' + MUD_VERSION + ' ===', 'system')
    print('A text adventure in the liminal void.', 'system')
    print(`Handle: ${playerName}`, 'system')
    if (isRestored.current) {
      print('Progress restored from previous session.', 'system')
    }
    print('Objective: escape station, defeat the Void Warden, survive')
    print('Tip: surge/evade/scan abilities, read terminals for lore')
    print('Type "help" for commands.\n', 'system')
    describeRoom()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    world,
    player,
    discovered,
    gameOver,
    victory,
    mapUnlocked,
    handleCommand,
    getCurrentRoom,
    ITEMS
  }
}

export default useMUD
