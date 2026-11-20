/**
 * errata.slip() — Narrative State Machine & Four-Edition Almanac (1911–1914)
 *
 * Pure module: no DOM, no side effects.
 * Every slip pasted in an edition rewrites the harbor state, mutates the
 * copperplate engraving, changes the text and stakes of later editions,
 * and records an inspectable causal chain for the final colophon.
 */

export const STORAGE_KEY = 'errata-slip-colophon-v1'

export const STAMP_CHIPS = [
  { id: 'warn-bar', text: 'shoal shifts east after every spring tide' },
  { id: 'keep-light', text: 'double-wick the outer lens before dusk' },
  { id: 'name-clerk', text: 'check the quay clerk against the ink ledger' },
  { id: 'ask-void', text: 'who set the cancelled plate in 1910?' }
]

const MOTIF_RULES = [
  { key: 'light', words: ['light', 'lamp', 'wick', 'beacon', 'lantern', 'glow', 'beam', 'flame'], effect: 'beacon', delta: 1, reply: 'The light-keeper pinned your margin note beside the oil rack.' },
  { key: 'shoal', words: ['shoal', 'silt', 'bar', 'depth', 'rock', 'sand', 'tide', 'reef', 'sound'], effect: 'channel', delta: 1, reply: 'Pilots copied your sounding gloss onto the cabin slate.' },
  { key: 'ledger', words: ['clerk', 'ledger', 'customs', 'manifest', 'bribe', 'pay', 'smuggl', 'truth', 'audit', 'name'], effect: 'ledger', delta: 1, reply: 'A harbour auditor underlined your margin line in blue pencil.' },
  { key: 'ghost', words: ['plate', 'cancel', '1910', 'compositor', 'missing', 'vanish', 'void', 'cat', 'shadow', 'ghost', 'bell'], effect: 'compositor', delta: 1, reply: 'Someone slipped an unsigned proof-sheet under your door before dawn.' }
]

export function parseMarginalia(rawText) {
  const clean = String(rawText || '').trim().replace(/\s+/g, ' ').slice(0, 52)
  if (!clean) return { text: '', motif: null, effect: null, delta: 0, reply: null }
  const lower = clean.toLowerCase()
  for (const rule of MOTIF_RULES) {
    if (rule.words.some(w => lower.includes(w))) {
      return { text: clean, motif: rule.key, effect: rule.effect, delta: rule.delta, reply: rule.reply }
    }
  }
  return {
    text: clean,
    motif: 'note',
    effect: 'trust',
    delta: 1,
    reply: 'The town librarian copied your marginalium into the reading-room index.'
  }
}

export function createInitialState() {
  return {
    editionIndex: 0, // 0..3 for 1911..1914, 4 for bound colophon
    metrics: {
      channel: 0,     // -3 (silted hazard) to +4 (charted safe)
      beacon: 0,      // -3 (dark/failing) to +4 (bright/reliable)
      ledger: 0,      // -3 (captured by smugglers) to +4 (audited open)
      trust: 1,       // -3 (town distrusts almanac) to +5 (trusted civic witness)
      compositor: 0   // 0..6 hidden thread of the vanished 1910 compositor
    },
    flags: {},
    slips: {},          // { [slotId]: slipId } for current + past editions
    editions: [],       // locked edition snapshots [{ year, slips, marginalia, deltaSummary, headline }]
    draftSlips: {},     // { [slotId]: slipId } in the active edition
    draftMargin: '',
    loupeDiscoveries: [], // array of clue ids spotted through the optical loupe
    causalTrail: [],    // [{ year, slotTitle, slipLabel, mark, consequence }]
    ending: null
  }
}

/**
 * Compute dynamic Edition definitions based on accumulated state from prior years.
 */
export function getEditionSpec(editionIndex, state) {
  const f = state.flags
  const m = state.metrics
  const lastEd = state.editions[state.editions.length - 1]
  const lastMargin = lastEd?.marginalia?.text ? lastEd.marginalia : null

  if (editionIndex === 0) {
    return {
      index: 0,
      year: 1911,
      roman: 'I',
      title: 'The Sounding',
      dateline: 'SALTMERE HARBOR ALMANAC · PROOF I OF IV · AUTUMN 1911',
      epigraph: 'The previous compositor walked out at low water leaving three live errors in the galley. Paste an erratum slip onto each underlined clause before pulling the press.',
      footnote: 'Printer’s rule: hold the brass Loupe over the page or map to read the vanished compositor’s cancelled under-ink.',
      weather: 'clear',
      mapNotice: '1911 SURVEY — OUTER BAR UNPROVED',
      slots: [
        {
          id: '1911-depth',
          ref: '§1 · OUTER BAR',
          landmark: 'siltBar',
          before: 'At mean low water the Outer Bar carries ',
          original: 'fourteen feet of clear channel',
          after: ' past the bell-buoy.',
          underInk: 'CANCELLED 1910 PLATE: soundings show 9 ft — shoal crept 40 yds east; buoy chain was shortened.',
          clueId: 'clue-1911-bar',
          options: [
            {
              id: '1911-depth-true',
              mark: '₰',
              markName: 'corr.',
              label: 'nine feet; keep west of the bell',
              short: '9 ft · keep west',
              effects: { channel: 2, trust: 1 },
              flags: { barCharted: true },
              consequence: 'Pilots trust the shoal warning and hug the west ledges.'
            },
            {
              id: '1911-depth-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — leave fourteen feet as set',
              short: 'stet 14 ft',
              effects: { channel: -2, ledger: -1, trust: -1 },
              flags: { barHidden: true },
              consequence: 'Insurance rates stay cheap, but the silt tongue lies unmarked.'
            },
            {
              id: '1911-depth-dredge',
              mark: '‸',
              markName: 'ins.',
              label: 'ten feet; pilot-boat mandatory at dusk',
              short: '10 ft · pilot req.',
              effects: { channel: 1, trust: 1, compositor: 1 },
              flags: { pilotRule: true },
              consequence: 'Dusk vessels wait for local pilots; harbour dues double.'
            }
          ]
        },
        {
          id: '1911-beacon',
          ref: '§2 · BREAKWATER LIGHT',
          landmark: 'lighthouse',
          before: 'The Breakwater lantern burns colza oil on a ',
          original: 'single wick from sunset to midnight',
          after: ' during coastal fog.',
          underInk: 'MARGIN SCRATCH: colza tins are half-watered; keeper begs a double wick & all-night watch.',
          clueId: 'clue-1911-light',
          options: [
            {
              id: '1911-beacon-double',
              mark: '₰',
              markName: 'corr.',
              label: 'double wick from dusk till first bell',
              short: 'double wick · all night',
              effects: { beacon: 2, trust: 1 },
              flags: { doubleWick: true },
              consequence: 'The outer lens throws four miles further across the sound.'
            },
            {
              id: '1911-beacon-shutter',
              mark: '⇄',
              markName: 'tr.',
              label: 'occulting red sector over the Rookery',
              short: 'red sector · occulting',
              effects: { beacon: 1, compositor: 1 },
              flags: { redSector: true },
              consequence: 'A ruby band warns trawlers off the rocks — and signals someone ashore.'
            },
            {
              id: '1911-beacon-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — darken the lens at midnight',
              short: 'stet midnight dark',
              effects: { beacon: -2, ledger: -1 },
              flags: { darkAfterMidnight: true },
              consequence: 'The breakwater goes black at twelve; dark barges slip in unseen.'
            }
          ]
        },
        {
          id: '1911-quay',
          ref: '§3 · CUSTOMS QUAY',
          landmark: 'customs',
          before: 'Night landings at the Stone Quay consist solely of ',
          original: 'kelp ash and cured herring',
          after: ', weighed before the clerk.',
          underInk: 'UNDER-INK NOTE: crates marked "slate" ring hollow — Clerk Vane tore p. 19 out of the ledger.',
          clueId: 'clue-1911-quay',
          options: [
            {
              id: '1911-quay-audit',
              mark: '₰',
              markName: 'corr.',
              label: 'sealed crates subject to open weigh-bill',
              short: 'open weigh-bill',
              effects: { ledger: 2, trust: 1 },
              flags: { openWeighBill: true },
              consequence: 'Clerk Vane’s midnight crates must sit on the public scale.'
            },
            {
              id: '1911-quay-slate',
              mark: '‸',
              markName: 'ins.',
              label: 'herring, kelp, and unexamined slate',
              short: '+ unexamined slate',
              effects: { ledger: -2, compositor: 1 },
              flags: { smugglersNamed: true },
              consequence: 'The contraband gets printed in plain sight as a legal loophole.'
            },
            {
              id: '1911-quay-vane',
              mark: '⇄',
              markName: 'tr.',
              label: 'landings countersigned by the tide-miller',
              short: 'tide-miller countersign',
              effects: { ledger: 1, compositor: 2 },
              flags: { millerWitness: true },
              consequence: 'The tide-miller begins keeping a second tally in chalk on the mill-beam.'
            }
          ]
        }
      ]
    }
  }

  if (editionIndex === 1) {
    const grounded = Boolean(f.barHidden && !f.doubleWick)
    const safeArrival = Boolean(f.barCharted || f.pilotRule)
    return {
      index: 1,
      year: 1912,
      roman: 'II',
      title: grounded ? 'The Halcyon Wreck' : 'The Autumn Gale',
      dateline: 'SALTMERE HARBOR ALMANAC · PROOF II OF IV · NOVEMBER 1912',
      epigraph: grounded
        ? 'Last year’s fourteen-foot figure stood in print. In the November gale, the coastal packet SS Halcyon drove hard onto the Outer Bar. Now the town argues over what the Almanac will say happened.'
        : safeArrival
          ? 'Your 1911 sounding correction kept the coastal packet SS Halcyon clear of the Outer Bar in the November gale. She lies at the Stone Quay now—with two locked mailbags nobody expected.'
          : 'The SS Halcyon scraped her keel on the Outer Bar during the November gale and limped inside the breakwater. Her captain holds last year’s Almanac in one wet hand.',
      footnote: lastMargin
        ? `1911 Reader’s Gloss echoed: “${lastMargin.text}” — ${lastMargin.reply}`
        : 'The press room smells of wet wool and linseed oil. The harbour bell has been tolling since dusk.',
      weather: 'gale',
      mapNotice: grounded ? '1912 GALE — HALCYON AGROUND ON OUTER BAR' : '1912 GALE — HALCYON INSIDE BREAKWATER',
      slots: [
        {
          id: '1912-halcyon',
          ref: '§1 · PACKET LOG',
          landmark: 'ship',
          before: grounded
            ? 'The SS Halcyon took the Outer Bar owing to '
            : 'The SS Halcyon cleared the narrows and moored with ',
          original: grounded ? 'an act of God and sudden squall' : 'all mail-sacks delivered to Customs',
          after: ' at 02:15.',
          underInk: grounded
            ? 'CANCELLED GALLEY: her master followed the 1911 Almanac’s "14 ft" line — ink killed the hull.'
            : 'UNDER-INK NOTE: one oilskin satchel bore the vanished compositor’s punch-mark (a crooked S).',
          clueId: 'clue-1912-ship',
          options: grounded
            ? [
                {
                  id: '1912-ship-confess',
                  mark: '₰',
                  markName: 'corr.',
                  label: 'a false sounding left standing in 1911',
                  short: 'admit 1911 error',
                  effects: { trust: 2, channel: 1, ledger: 1 },
                  flags: { errorConfessed: true, halcyonWrecked: true },
                  consequence: 'The Almanac prints its own guilt; Trinity House orders a true survey.'
                },
                {
                  id: '1912-ship-blame-bell',
                  mark: '‸',
                  markName: 'ins.',
                  label: 'a parted bell-buoy chain unlogged by the quay',
                  short: 'blame parted chain',
                  effects: { ledger: 1, compositor: 1 },
                  flags: { chainExposed: true, halcyonWrecked: true },
                  consequence: 'Eyes turn from the shoal to whoever cut the buoy chain.'
                },
                {
                  id: '1912-ship-stet',
                  mark: 'stet',
                  markName: 'stet',
                  label: 'STET — call it an act of God',
                  short: 'stet act of God',
                  effects: { trust: -2, ledger: -2 },
                  flags: { wreckCovered: true, halcyonWrecked: true },
                  consequence: 'Salvage bidders strip the Halcyon by lantern-light; sailors spit at the book.'
                }
              ]
            : [
                {
                  id: '1912-ship-satchel',
                  mark: '‸',
                  markName: 'ins.',
                  label: 'one unclaimed compositor’s satchel held at the Press',
                  short: 'hold compositor satchel',
                  effects: { compositor: 2, trust: 1 },
                  flags: { satchelKept: true },
                  consequence: 'Inside the oilskin: brass type-punches and a map of a second harbour.'
                },
                {
                  id: '1912-ship-quarantine',
                  mark: '₰',
                  markName: 'corr.',
                  label: 'cargo impounded pending public manifest',
                  short: 'impound cargo',
                  effects: { ledger: 2, trust: 1 },
                  flags: { cargoImpounded: true },
                  consequence: 'Two smuggling schooners turn back to open sea before dawn.'
                },
                {
                  id: '1912-ship-stet',
                  mark: 'stet',
                  markName: 'stet',
                  label: 'STET — pass every sack to Customs',
                  short: 'stet to Customs',
                  effects: { ledger: -1, trust: -1 },
                  flags: { satchelLostToCustoms: true },
                  consequence: 'Clerk Vane locks the oilskin bag in the customs safe.'
                }
              ]
        },
        {
          id: '1912-bell',
          ref: '§2 · SOUNDING BELL',
          landmark: 'bellBuoy',
          before: 'During the gale the Sounding Bell at the Rookery ',
          original: 'rang steadily on the flood',
          after: ' until daybreak.',
          underInk: f.redSector
            ? 'UNDER-INK: the bell was muffled with sailcloth while the red lantern blinked twice.'
            : 'UNDER-INK: the clapper was lashed with hemp rope from 01:00 to 03:00 — fresh tar on the ring.',
          clueId: 'clue-1912-bell',
          options: [
            {
              id: '1912-bell-lashed',
              mark: '₰',
              markName: 'corr.',
              label: 'fell silent, its clapper lashed with tarred hemp',
              short: 'clapper lashed',
              effects: { ledger: 2, beacon: 1, trust: 1 },
              flags: { bellSabotagePrinted: true },
              consequence: 'The parish posts a watchman on the Rookery steps every dark moon.'
            },
            {
              id: '1912-bell-echo',
              mark: '⇄',
              markName: 'tr.',
              label: 'answered a second bell ringing out in the fog',
              short: 'second bell in fog',
              effects: { compositor: 2, beacon: 1 },
              flags: { ghostBellPrinted: true },
              consequence: 'Fishermen swear a drowned tower answers whenever the mist lies thick.'
            },
            {
              id: '1912-bell-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — rang steadily on the flood',
              short: 'stet steady bell',
              effects: { trust: -1, beacon: -1 },
              flags: { bellLieKept: true },
              consequence: 'Nobody investigates the tarred hemp left coiled under the steps.'
            }
          ]
        },
        {
          id: '1912-mill',
          ref: '§3 · TIDE-MILL GATE',
          landmark: 'tideMill',
          before: 'The Tide-Mill sluice ',
          original: 'remained closed for seasonal grinding',
          after: ' throughout the storm.',
          underInk: f.millerWitness
            ? 'CHALK NOTE FROM MILLER: I opened the sluice to flush the silt bar — print it and save the harbour.'
            : 'UNDER-INK: the old sluice can scour the silt channel clean if opened on a spring ebb.',
          clueId: 'clue-1912-mill',
          options: [
            {
              id: '1912-mill-scour',
              mark: '₰',
              markName: 'corr.',
              label: 'was lifted on the ebb to scour the Outer Bar',
              short: 'scour the silt bar',
              effects: { channel: 2, trust: 1 },
              flags: { channelScoured: true },
              consequence: 'A dark plume of mud pours seaward; the channel deepens by three feet.'
            },
            {
              id: '1912-mill-shelter',
              mark: '‸',
              markName: 'ins.',
              label: 'sheltered six stranded deckhands and a black cat',
              short: 'sheltered crew + cat',
              effects: { trust: 1, compositor: 1 },
              flags: { catInMill: true },
              consequence: 'The mill-loft becomes an informal listening post for everyone who reads the Almanac.'
            },
            {
              id: '1912-mill-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — closed for private grinding',
              short: 'stet private mill',
              effects: { channel: -1, ledger: -1 },
              flags: { millShut: true },
              consequence: 'Silt banks higher behind the breakwater; the basin begins to shallow.'
            }
          ]
        }
      ]
    }
  }

  if (editionIndex === 2) {
    const scandal = m.ledger >= 2 || f.bellSabotagePrinted || f.cargoImpounded
    const silting = m.channel <= -1
    return {
      index: 2,
      year: 1913,
      roman: 'III',
      title: scandal ? 'The Board of Inquiry' : silting ? 'The Closing Bar' : 'The Second Ledger',
      dateline: 'SALTMERE HARBOR ALMANAC · PROOF III OF IV · OCTOBER 1913',
      epigraph: scandal
        ? 'Your 1912 corrections reached London. Two inspectors from the Board of Trade arrived on the morning coach—and Clerk Vane offered the press double wages to print a quiet edition.'
        : silting
          ? 'The Outer Bar has grown a dry spine at low tide. Coasters pass Saltmere without whistling, and the harbour syndicate wants the Almanac to declare the port "open for steam."'
          : 'Strange galleys keep turning up in the composing tray overnight—set in lead type nobody in Saltmere owns. The town reads your Almanac before it reads the Bible.',
      footnote: lastMargin
        ? `1912 Gloss printed in town broadsheet: “${lastMargin.text}” — ${lastMargin.reply}`
        : 'Two inspectors are drinking tea across the street, watching the press chimney.',
      weather: silting ? 'mist' : 'dusk',
      mapNotice: scandal ? '1913 INQUIRY — INSPECTORS AT STONE QUAY' : silting ? '1913 SHOALING — CHANNEL CLOSING' : '1913 — UNSIGNED PROOFS IN CIRCULATION',
      slots: [
        {
          id: '1913-inquiry',
          ref: '§1 · HARBOUR RECORD',
          landmark: 'customs',
          before: 'The 1913 Registry certifies Clerk Vane’s books as ',
          original: 'complete and without discrepancy',
          after: ' for the Board of Trade.',
          underInk: f.openWeighBill || f.millerWitness
            ? 'PROOF SCRAP: Page 19 was found wedged behind the tide-mill hopper — 11 unlisted landings signed "V."'
            : 'UNDER-INK: Vane paid the foundry to melt down the 1910 woodblock of the inner cove.',
          clueId: 'clue-1913-vane',
          options: [
            {
              id: '1913-vane-expose',
              mark: '₰',
              markName: 'corr.',
              label: 'missing Page 19 — eleven night landings unentered',
              short: 'print missing p. 19',
              effects: { ledger: 2, trust: 2 },
              flags: { vaneIndicted: true },
              consequence: 'Clerk Vane boards the midnight mail-cart and never returns to the quay.'
            },
            {
              id: '1913-vane-block',
              mark: '‸',
              markName: 'ins.',
              label: 'altered where the 1910 inner-cove plate was melted',
              short: 'cite melted 1910 plate',
              effects: { compositor: 2, ledger: 1 },
              flags: { plateCited: true },
              consequence: 'Old mariners remember why the compositor vanished: he printed the cove that wasn’t on Admiralty charts.'
            },
            {
              id: '1913-vane-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — certify the books complete',
              short: 'stet books clean',
              effects: { ledger: -2, trust: -2 },
              flags: { syndicateBribe: true },
              consequence: 'Gold sovereigns appear on the composing stone; the inspectors leave empty-handed.'
            }
          ]
        },
        {
          id: '1913-rookery',
          ref: '§2 · ROOKERY STEPS',
          landmark: 'rookery',
          before: 'Below the Rookery Steps, the old sea-door stands ',
          original: 'bricked shut since the charter of 1884',
          after: ' at every tide.',
          underInk: 'UNDER-INK IN VERMILION: NOT BRICKED — hung with painted canvas. The 1910 compositor’s press is inside.',
          clueId: 'clue-1913-door',
          options: [
            {
              id: '1913-door-reveal',
              mark: '₰',
              markName: 'corr.',
              label: 'masked by painted canvas hiding a tidal cellar',
              short: 'expose hidden cellar',
              effects: { ledger: 1, compositor: 2, trust: 1 },
              flags: { cellarFound: true },
              consequence: 'At low water you find a damp iron hand-press and galleys dated five years ahead.'
            },
            {
              id: '1913-door-harbor',
              mark: '⇄',
              markName: 'tr.',
              label: 'open as a storm-refuge stair for boatmen',
              short: 'open storm-refuge',
              effects: { trust: 2, beacon: 1 },
              flags: { refugeOpened: true },
              consequence: 'Boatmen hang an oil lantern inside the arch; the steps glow all winter.'
            },
            {
              id: '1913-door-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — bricked shut since 1884',
              short: 'stet bricked shut',
              effects: { compositor: -1, ledger: -1 },
              flags: { doorIgnored: true },
              consequence: 'The painted canvas swells in the salt wind; whatever ticks behind it stays quiet.'
            }
          ]
        },
        {
          id: '1913-charter',
          ref: '§3 · PORT STATUS',
          landmark: 'lighthouse',
          before: 'By order of the Commissioners, Saltmere is classed as ',
          original: 'a third-rate fishing haven of no strategic note',
          after: ' for the coming year.',
          underInk: 'CANCELLED COLOPHON: Print a harbour into the Almanac and ships believe it exists; erase it and the sea takes it back.',
          clueId: 'clue-1913-charter',
          options: [
            {
              id: '1913-charter-free',
              mark: '₰',
              markName: 'corr.',
              label: 'a pilot-held refuge port with open lights',
              short: 'pilot refuge port',
              effects: { beacon: 2, channel: 1, trust: 1 },
              flags: { refugeCharter: true },
              consequence: 'Coastal charts adopt your wording; Saltmere earns a permanent Trinity lamp.'
            },
            {
              id: '1913-charter-unlisted',
              mark: '⇄',
              markName: 'tr.',
              label: 'an unmapped meridian known only by errata',
              short: 'unmapped meridian',
              effects: { compositor: 2, beacon: 1 },
              flags: { meridianClaimed: true },
              consequence: 'Cartographers argue over your footnote; strange vessels begin anchoring at slack tide.'
            },
            {
              id: '1913-charter-stet',
              mark: 'stet',
              markName: 'stet',
              label: 'STET — of no strategic note',
              short: 'stet minor haven',
              effects: { channel: -1, beacon: -1 },
              flags: { portDowngraded: true },
              consequence: 'The dredging grant is redirected south; weeds sprout along the customs bollards.'
            }
          ]
        }
      ]
    }
  }

  // Edition IV (1914) — The Final Proof & Colophon
  const knowsCompositor = m.compositor >= 3 || f.cellarFound || f.satchelKept
  return {
    index: 3,
    year: 1914,
    roman: 'IV',
    title: knowsCompositor ? 'The Unprinted Colophon' : 'The Last Edition',
    dateline: 'SALTMERE HARBOR ALMANAC · FINAL PROOF IV OF IV · WINTER 1914',
    epigraph: knowsCompositor
      ? 'At dawn a wet proof-sheet lay on your desk beside a black paw-print in vermilion ink. The vanished compositor’s final plate is locked in the chase. Three last slips decide what survives in print—and what vanishes from the coast.'
      : 'The town press closes at midnight. Every slip you paste into this final proof sets the permanent record by which Saltmere will be navigated, audited, or forgotten.',
    footnote: lastMargin
      ? `1913 Gloss cited in the margin: “${lastMargin.text}” — ${lastMargin.reply}`
      : 'This final impression binds all four years into the permanent Colophon.',
    weather: 'night',
    mapNotice: knowsCompositor ? '1914 FINAL PROOF — SECOND PLATE ALIGNED' : '1914 FINAL PROOF — BINDING COLOPHON',
    slots: [
      {
        id: '1914-beacon',
        ref: '§1 · WINTER LIGHT',
        landmark: 'lighthouse',
        before: 'On the longest night of 1914 the Breakwater lens ',
        original: 'was extinguished for want of oil',
        after: ' across the sound.',
        underInk: 'FINAL UNDER-INK: whoever holds the wick decides whether Saltmere stays on the living coast.',
        clueId: 'clue-1914-light',
        options: [
          {
            id: '1914-light-burn',
            mark: '₰',
            markName: 'corr.',
            label: 'burned white and steady from dusk to dawn',
            short: 'burn white & steady',
            effects: { beacon: 2, trust: 1 },
            flags: { finalLightLit: true },
            consequence: 'Every inbound master sets his compass by Saltmere’s lamp.'
          },
          {
            id: '1914-light-prism',
            mark: '⇄',
            markName: 'tr.',
            label: 'turned a prism of vermilion ink across the mist',
            short: 'vermilion prism',
            effects: { compositor: 2, beacon: 1 },
            flags: { vermilionLens: true },
            consequence: 'The beam illuminates a harbour pier that only appears when the Almanac is open.'
          },
          {
            id: '1914-light-stet',
            mark: 'stet',
            markName: 'stet',
            label: 'STET — extinguished for want of oil',
            short: 'stet darkened lens',
            effects: { beacon: -2, trust: -1 },
            flags: { finalLightOut: true },
            consequence: 'The tower falls dark; the sea folds quietly over the outer stones.'
          }
        ]
      },
      {
        id: '1914-record',
        ref: '§2 · TOWN ARCHIVE',
        landmark: 'tideMill',
        before: 'The bound volumes of 1911–1914 are deposited in ',
        original: 'the locked customs vault',
        after: ' for posterity.',
        underInk: 'UNDER-INK: a locked book is a dead coast; an open proof is a living city.',
        clueId: 'clue-1914-archive',
        options: [
          {
            id: '1914-arch-public',
            mark: '₰',
            markName: 'corr.',
            label: 'the open pilot-house table, errata intact',
            short: 'open pilot-house table',
            effects: { ledger: 2, trust: 2 },
            flags: { publicArchive: true },
            consequence: 'Every crossed-out lie stays readable beneath the correction—proof that the town learned to see.'
          },
          {
            id: '1914-arch-sea',
            mark: '‸',
            markName: 'ins.',
            label: 'the tidal cellar beside the vanished compositor’s chase',
            short: 'tidal cellar chase',
            effects: { compositor: 2, trust: 1 },
            flags: { cellarArchive: true },
            consequence: 'Each spring tide prints a new margin note on the damp sheets without human hands.'
          },
          {
            id: '1914-arch-stet',
            mark: 'stet',
            markName: 'stet',
            label: 'STET — sealed in the customs vault',
            short: 'stet customs vault',
            effects: { ledger: -2, trust: -1 },
            flags: { vaultArchive: true },
            consequence: 'The syndicate owns the only copy; the town remembers only what they are told.'
          }
        ]
      },
      {
        id: '1914-colophon',
        ref: '§3 · COLOPHON SEAL',
        landmark: 'siltBar',
        before: 'Set and corrected at Saltmere Press; ',
        original: 'all remaining errors belong to the sea',
        after: '.',
        underInk: 'LAST LINE OF THE 1910 PLATE: "No town truly sinks while one erratum slip still contradicts the dark."',
        clueId: 'clue-1914-seal',
        options: [
          {
            id: '1914-seal-contradict',
            mark: '₰',
            markName: 'corr.',
            label: 'every erratum herein holds back the silt',
            short: 'errata hold the silt',
            effects: { channel: 1, trust: 1, compositor: 1 },
            flags: { sealDefiant: true },
            consequence: 'The Almanac closes with a sharp vermilion rule—a seawall made of print.'
          },
          {
            id: '1914-seal-unprinted',
            mark: '⇄',
            markName: 'tr.',
            label: 'the fifth edition is already setting itself in the dark',
            short: 'fifth edition setting',
            effects: { compositor: 3 },
            flags: { fifthEditionInvoked: true },
            consequence: 'The lead type clicks softly in the tray after the lamp goes out.'
          },
          {
            id: '1914-seal-stet',
            mark: 'stet',
            markName: 'stet',
            label: 'STET — all errors belong to the sea',
            short: 'stet give to the sea',
            effects: { channel: -2, beacon: -1 },
            flags: { sealSurrendered: true },
            consequence: 'Salt water seeps under the press-room sill as the final sheet dries.'
          }
        ]
      }
    ]
  }
}

export const ENDINGS = [
  {
    id: 'unprinted-town',
    code: 'COLOPHON V · SECRET',
    title: 'The Unprinted Town',
    seal: '₰ V',
    accent: '#b83227',
    verdict: 'You read the under-ink, kept the vanished compositor’s thread alive, and printed a meridian the Admiralty never charted.',
    epilogue: 'At slack water on winter nights, a second quay answers the vermilion lens—lit by lamps not listed in any ledger. Ships that have lost their bearings find your errata slips pinned to their binnacles, still wet with press ink.'
  },
  {
    id: 'lit-harbour',
    code: 'COLOPHON I · MASTERY',
    title: 'The Lit Harbour',
    seal: '★ I',
    accent: '#2c6b58',
    verdict: 'Through four hard winters you corrected the soundings, kept the double wick burning, and forced the customs scale into daylight.',
    epilogue: 'Saltmere remains open to every coaster on the northern reach. In the pilot-house, your 1911–1914 Almanac lies chained open under glass—not because it was spotless, but because every paste-in slip shows where a lie was caught in time.'
  },
  {
    id: 'smugglers-charter',
    code: 'COLOPHON II · CAPTURE',
    title: 'The Smuggler’s Charter',
    seal: '§ II',
    accent: '#8a5a1e',
    verdict: 'Your STET seals kept the dark barges moving and the Board of Trade looking elsewhere. Saltmere grew rich—and invisible to the law.',
    epilogue: 'Every lantern on the Stone Quay burns amber instead of white, and the Almanac sells for two guineas in foreign ports as a coded timetable. Everyone in town knows the real depth of the bar; nobody ever writes it down.'
  },
  {
    id: 'silted-haven',
    code: 'COLOPHON III · COLLAPSE',
    title: 'The Silted Haven',
    seal: '✕ III',
    accent: '#59636d',
    verdict: 'Unmarked shoals, a shut sluice, and darkened wicks handed the outer channel back to the sand.',
    epilogue: 'By 1916 grass grew on the Outer Bar at low tide. The press rusted under canvas, and the last copy of the Almanac was found propping up a broken table in the empty Customs House—its uncorrected fourteen-foot sounding still promising open water.'
  },
  {
    id: 'palimpsest-coast',
    code: 'COLOPHON IV · DIVIDED',
    title: 'The Palimpsest Coast',
    seal: '⇄ IV',
    accent: '#5c4b7a',
    verdict: 'Half-reformed and half-concealed, Saltmere survives as two towns sharing one breakwater—one printed in black ink, one whispered in red.',
    epilogue: 'Captains carry two pairs of spectacles when approaching the Rookery: one for the official Admiralty chart, and one for the gummed slips pasted inside your Almanac. Truth and rumor balance on the tide-mill beam.'
  }
]

export function evaluateEnding(state) {
  const m = state.metrics
  const f = state.flags
  const loupeCount = state.loupeDiscoveries.length

  if (m.compositor >= 6 && (f.vermilionLens || f.fifthEditionInvoked || f.cellarArchive || loupeCount >= 3)) {
    return ENDINGS[0] // The Unprinted Town (Secret / Mastery)
  }
  if (m.channel >= 2 && m.beacon >= 2 && m.ledger >= 2 && m.trust >= 3) {
    return ENDINGS[1] // The Lit Harbour (Civic Mastery)
  }
  if (m.ledger <= -2 || f.syndicateBribe || f.vaultArchive) {
    return ENDINGS[2] // The Smuggler's Charter
  }
  if (m.channel <= -1 || m.beacon <= -1 || f.finalLightOut || f.sealSurrendered) {
    return ENDINGS[3] // The Silted Haven (Collapse)
  }
  return ENDINGS[4] // The Palimpsest Coast (Divided)
}

/**
 * Compute live preview metrics combining committed state + currently pasted draft slips.
 */
export function computePreviewState(state) {
  if (state.editionIndex >= 4) return state
  const spec = getEditionSpec(state.editionIndex, state)
  const metrics = { ...state.metrics }
  const flags = { ...state.flags }

  for (const slot of spec.slots) {
    const chosenId = state.draftSlips[slot.id]
    if (!chosenId) continue
    const opt = slot.options.find(o => o.id === chosenId)
    if (!opt) continue
    for (const [k, v] of Object.entries(opt.effects || {})) {
      metrics[k] = (metrics[k] || 0) + v
    }
    Object.assign(flags, opt.flags || {})
  }

  return { ...state, metrics, flags }
}

/**
 * Commit the current edition's slips & marginalia and advance to the next year (or final colophon).
 */
export function commitEdition(state) {
  if (state.editionIndex >= 4) return state
  const spec = getEditionSpec(state.editionIndex, state)
  const missing = spec.slots.filter(s => !state.draftSlips[s.id])
  if (missing.length > 0) return state

  const metrics = { ...state.metrics }
  const flags = { ...state.flags }
  const newSlips = { ...state.slips }
  const newTrail = [...state.causalTrail]
  const chosenSummary = []

  for (const slot of spec.slots) {
    const chosenId = state.draftSlips[slot.id]
    const opt = slot.options.find(o => o.id === chosenId)
    if (!opt) continue
    newSlips[slot.id] = opt.id
    for (const [k, v] of Object.entries(opt.effects || {})) {
      metrics[k] = (metrics[k] || 0) + v
    }
    Object.assign(flags, opt.flags || {})
    chosenSummary.push({
      slotId: slot.id,
      ref: slot.ref,
      before: slot.before,
      original: slot.original,
      replacement: opt.label,
      short: opt.short,
      after: slot.after,
      mark: opt.mark,
      consequence: opt.consequence
    })
    newTrail.push({
      year: spec.year,
      ref: slot.ref,
      mark: opt.mark,
      short: opt.short,
      consequence: opt.consequence
    })
  }

  const parsedMargin = parseMarginalia(state.draftMargin)
  if (parsedMargin.effect) {
    metrics[parsedMargin.effect] = (metrics[parsedMargin.effect] || 0) + parsedMargin.delta
  }

  const editionRecord = {
    index: spec.index,
    year: spec.year,
    roman: spec.roman,
    title: spec.title,
    weather: spec.weather,
    slips: chosenSummary,
    marginalia: parsedMargin
  }

  const nextIndex = state.editionIndex + 1
  const nextState = {
    ...state,
    editionIndex: nextIndex,
    metrics,
    flags,
    slips: newSlips,
    editions: [...state.editions, editionRecord],
    draftSlips: {},
    draftMargin: '',
    causalTrail: newTrail,
    ending: null
  }

  if (nextIndex >= 4) {
    nextState.ending = evaluateEnding(nextState)
  }

  return nextState
}
