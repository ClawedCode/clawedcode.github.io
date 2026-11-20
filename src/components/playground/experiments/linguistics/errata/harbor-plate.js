/**
 * errata.slip() — Copperplate Harbor Engraving Geometry & Visual State
 *
 * Pure derivation from live almanac state to SVG copperplate layers.
 * Changes visibly as slips are pasted: silt bar encroaches or scours away,
 * lighthouse beam strengthens, turns vermilion, or dies, SS Halcyon steers
 * into the quay or grounds on the shoal, customs crates pile or open,
 * and hidden under-ink annotations appear beneath the optical loupe.
 */

export const PLATE_W = 860
export const PLATE_H = 330

export function derivePlateVisuals(previewState, activeSlotLandmark = null, editionIndex = 0) {
  const m = previewState.metrics
  const f = previewState.flags

  // Silt bar size grows when channel is negative, shrinks when charted/scoured
  const siltExtent = Math.max(0.28, Math.min(1.0, 0.62 - m.channel * 0.11))
  const depthFeet = Math.max(6, Math.min(16, 11 + m.channel * 1.2))
  const channelSafe = m.channel >= 1 || f.barCharted || f.channelScoured

  // Lighthouse beam state
  const beaconDark = Boolean(f.finalLightOut || (f.darkAfterMidnight && !f.doubleWick && !f.finalLightLit))
  const beaconVermilion = Boolean(f.vermilionLens || f.redSector)
  const beaconPower = beaconDark ? 0 : Math.max(0.35, Math.min(1.0, 0.55 + m.beacon * 0.14))

  // Ship state across editions
  const showShip = editionIndex >= 1 || Boolean(f.barHidden || f.barCharted || f.pilotRule)
  const shipWrecked = Boolean(f.halcyonWrecked || (editionIndex >= 1 && f.barHidden && !f.doubleWick))
  const shipMoored = !shipWrecked && (editionIndex >= 1 || f.barCharted)

  // Customs & quay lanterns
  const customsOpen = Boolean(f.openWeighBill || f.cargoImpounded || f.vaneIndicted || f.publicArchive)
  const smugglersActive = Boolean(f.smugglersNamed || f.syndicateBribe || f.vaultArchive || m.ledger <= -2)

  // Rookery & hidden compositor plate
  const cellarVisible = Boolean(f.cellarFound || f.cellarArchive || m.compositor >= 3)
  const refugeLit = Boolean(f.refugeOpened || f.catInMill)
  const ghostQuayVisible = Boolean(f.vermilionLens || f.fifthEditionInvoked || m.compositor >= 5)

  // Tide-mill wheel & scour plume
  const millScouring = Boolean(f.channelScoured)

  // Sky / paper tone per edition weather
  const paletteByEdition = [
    { sky: '#efe4cc', sea: '#d7ddda', ink: '#1d2630', hatch: '#596773', warm: '#c48a34' }, // 1911 clear parchment
    { sky: '#d9d4c7', sea: '#bec9cd', ink: '#17202a', hatch: '#455460', warm: '#c97c2c' }, // 1912 gale slate
    { sky: '#e6d8be', sea: '#c9d2d3', ink: '#1c232d', hatch: '#505e6a', warm: '#cf6f2d' }, // 1913 inquiry dusk
    { sky: '#242d38', sea: '#19232d', ink: '#e7dcc5', hatch: '#6f8191', warm: '#e59c45' }, // 1914 winter night
    { sky: '#ede3cd', sea: '#d0d9d6', ink: '#1a232c', hatch: '#556572', warm: '#b83227' }  // colophon engraving
  ]
  const palette = paletteByEdition[Math.min(4, Math.max(0, editionIndex))]
  const isNight = editionIndex === 3

  // Landmark coordinates for red proof callouts & loupe under-ink
  const landmarks = {
    lighthouse: { x: 146, y: 128, label: 'BREAKWATER LIGHT' },
    siltBar: { x: 356, y: 248, label: `OUTER BAR · ${depthFeet.toFixed(0)} FT` },
    ship: { x: shipWrecked ? 364 : 474, y: shipWrecked ? 228 : 196, label: shipWrecked ? 'SS HALCYON (AGROUND)' : 'SS HALCYON' },
    bellBuoy: { x: 268, y: 232, label: 'BELL-BUOY' },
    customs: { x: 612, y: 162, label: 'STONE QUAY' },
    tideMill: { x: 748, y: 152, label: 'TIDE-MILL' },
    rookery: { x: 716, y: 88, label: 'ROOKERY STEPS' }
  }

  return {
    siltExtent,
    depthFeet,
    channelSafe,
    beaconDark,
    beaconVermilion,
    beaconPower,
    showShip,
    shipWrecked,
    shipMoored,
    customsOpen,
    smugglersActive,
    cellarVisible,
    refugeLit,
    ghostQuayVisible,
    millScouring,
    palette,
    isNight,
    landmarks,
    activeLandmark: activeSlotLandmark ? landmarks[activeSlotLandmark] : null
  }
}

// Precomputed engraving wave hatches (deterministic, zero runtime jitter)
export const WAVE_HATCHES = Array.from({ length: 28 }, (_, i) => {
  const row = Math.floor(i / 7)
  const col = i % 7
  const x = 42 + col * 114 + (row % 2) * 44
  const y = 196 + row * 29 + ((i * 13) % 7)
  const w = 34 + ((i * 19) % 28)
  return { id: i, x, y, w }
})

// Sounding depth numerals distributed cleanly outside the silt bar & buoy
export const SOUNDING_MARKS = [
  { x: 186, y: 214, base: 15 },
  { x: 224, y: 266, base: 14 },
  { x: 312, y: 204, base: 11 },
  { x: 422, y: 204, base: 12 },
  { x: 468, y: 262, base: 13 },
  { x: 544, y: 222, base: 14 }
]
