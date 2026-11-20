import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExperimentNav from '../../ExperimentNav'
import {
  ENDINGS,
  STAMP_CHIPS,
  STORAGE_KEY,
  commitEdition,
  computePreviewState,
  createInitialState,
  getEditionSpec
} from './errata/almanac'
import {
  PLATE_H,
  PLATE_W,
  SOUNDING_MARKS,
  WAVE_HATCHES,
  derivePlateVisuals
} from './errata/harbor-plate'
import { createPressAudio } from './errata/audio'
import './ErrataSlip.css'

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function readShelf() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, 12) : []
  } catch {
    return []
  }
}

function writeShelf(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 12)))
  } catch {
    // Storage unavailable; keep in-memory archive only.
  }
}

function HarborPlate({
  previewState,
  editionIndex,
  year,
  mapNotice,
  activeLandmarkKey,
  stampedLandmarks,
  loupeOn,
  loupePos,
  onPlateMove,
  onLandmarkClick,
  reduced
}) {
  const vis = useMemo(
    () => derivePlateVisuals(previewState, activeLandmarkKey, editionIndex),
    [previewState, activeLandmarkKey, editionIndex]
  )
  const { palette, isNight, landmarks, activeLandmark } = vis
  const siltRx = 62 + vis.siltExtent * 72
  const siltRy = 18 + vis.siltExtent * 17
  const beamColor = vis.beaconVermilion ? '#d9483b' : isNight ? '#f4c56a' : '#e0a943'

  const updateLensFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((e.clientX - rect.left) / rect.width) * PLATE_W
    const y = ((e.clientY - rect.top) / rect.height) * PLATE_H
    onPlateMove({ x, y })
  }

  // Anchor cleanly on active landmark when toggled via button/keyboard, and clamp inside copperplate frame
  const rawLensX = loupePos ? loupePos.x : (activeLandmark ? activeLandmark.x : 380)
  const rawLensY = loupePos ? loupePos.y : (activeLandmark ? activeLandmark.y : 178)
  const lensX = Math.max(114, Math.min(PLATE_W - 114, rawLensX))
  const lensY = Math.max(110, Math.min(PLATE_H - 110, rawLensY))

  return (
    <div
      className={`es-plate-wrap ${loupeOn ? 'is-loupe' : ''} ${isNight ? 'is-night' : ''}`}
      onPointerMove={updateLensFromEvent}
      onPointerDown={(e) => { if (loupeOn) updateLensFromEvent(e) }}
      data-testid="es-harbor-plate"
    >
      <svg
        viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
        className="es-plate-svg"
        role="img"
        aria-label={`Copperplate engraving of Saltmere Harbor in ${year}: ${mapNotice}`}
      >
        <defs>
          <pattern id="es-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={palette.hatch} strokeWidth="0.8" strokeOpacity="0.34" />
          </pattern>
          <pattern id="es-stipple" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.9" fill={palette.ink} fillOpacity="0.45" />
            <circle cx="7" cy="7" r="0.8" fill={palette.ink} fillOpacity="0.38" />
          </pattern>
          <linearGradient id="es-beam-grad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={beamColor} stopOpacity={0.62 * vis.beaconPower} />
            <stop offset="100%" stopColor={beamColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id="es-loupe-clip">
            <circle cx={lensX} cy={lensY} r="94" />
          </clipPath>
        </defs>

        {/* Paper ground & sea wash */}
        <rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill={palette.sky} />
        <rect x="0" y="168" width={PLATE_W} height={PLATE_H - 168} fill={palette.sea} />
        <line x1="18" y1="168" x2={PLATE_W - 18} y2="168" stroke={palette.ink} strokeWidth="1.2" strokeOpacity="0.55" />

        {/* Engraving sky hatching & gale clouds */}
        <g opacity={editionIndex === 1 ? 0.55 : 0.25}>
          <path d="M 34 62 Q 150 38 268 58 Q 375 34 480 54 Q 620 30 810 56 L 810 88 L 34 88 Z" fill="url(#es-hatch)" />
          {editionIndex === 1 && (
            <g stroke={palette.ink} strokeWidth="0.9" strokeOpacity="0.32">
              <line x1="120" y1="32" x2="96" y2="112" />
              <line x1="290" y1="28" x2="262" y2="118" />
              <line x1="465" y1="34" x2="438" y2="116" />
              <line x1="650" y1="30" x2="624" y2="114" />
            </g>
          )}
        </g>

        {/* Distant headlands */}
        <path
          d="M 18 168 L 62 126 L 138 118 L 214 146 L 266 168 Z"
          fill={isNight ? '#313d4b' : '#cfc2a6'}
          stroke={palette.ink}
          strokeWidth="1.1"
        />
        <path
          d="M 548 168 L 606 108 L 678 86 L 748 64 L 842 92 L 842 168 Z"
          fill={isNight ? '#2c3745' : '#c9bba0'}
          stroke={palette.ink}
          strokeWidth="1.2"
        />
        <path
          d="M 565 168 L 615 122 L 690 98 L 760 76 L 842 104 L 842 168 Z"
          fill="url(#es-hatch)"
          opacity="0.55"
        />

        {/* Rookery cliff steps & hidden sea-door */}
        <g
          className="es-landmark-hit"
          onClick={() => onLandmarkClick?.('rookery')}
        >
          <path
            d="M 686 92 L 700 92 L 700 104 L 714 104 L 714 116 L 728 116 L 728 128 L 742 128 L 742 142"
            fill="none"
            stroke={palette.ink}
            strokeWidth="1.5"
          />
          {/* Sea-door arch at base of cliff */}
          <path
            d="M 684 168 L 684 148 A 10 10 0 0 1 704 148 L 704 168 Z"
            fill={vis.cellarVisible ? '#b83227' : vis.refugeLit ? '#e4a443' : palette.ink}
            fillOpacity={vis.cellarVisible || vis.refugeLit ? 0.85 : 0.4}
            stroke={palette.ink}
            strokeWidth="1.2"
          />
          {vis.refugeLit && (
            <circle cx="694" cy="153" r="14" fill="#f3bd59" fillOpacity="0.28" />
          )}
        </g>

        {/* Stone Quay & Customs House */}
        <g
          className="es-landmark-hit"
          onClick={() => onLandmarkClick?.('customs')}
        >
          <rect x="556" y="156" width="128" height="20" fill={isNight ? '#3a4654' : '#b8aa8f'} stroke={palette.ink} strokeWidth="1.3" />
          {/* Customs House */}
          <rect x="580" y="120" width="56" height="36" fill={isNight ? '#283340' : '#ece1ca'} stroke={palette.ink} strokeWidth="1.3" />
          <polygon points="574,120 608,98 642,120" fill={isNight ? '#445261' : '#857c70'} stroke={palette.ink} strokeWidth="1.2" />
          {/* Windows glow based on open audit vs smugglers */}
          <rect x="592" y="132" width="10" height="12" fill={vis.customsOpen ? '#f3c158' : vis.smugglersActive ? '#b83227' : palette.ink} fillOpacity={vis.customsOpen || vis.smugglersActive ? 0.9 : 0.35} stroke={palette.ink} strokeWidth="0.9" />
          <rect x="614" y="132" width="10" height="12" fill={vis.customsOpen ? '#f3c158' : vis.smugglersActive ? '#b83227' : palette.ink} fillOpacity={vis.customsOpen || vis.smugglersActive ? 0.9 : 0.35} stroke={palette.ink} strokeWidth="0.9" />
          {/* Quay crane & crates */}
          <path d="M 568 156 L 568 130 L 552 138" fill="none" stroke={palette.ink} strokeWidth="1.5" />
          <rect x="644" y="144" width="13" height="12" fill={vis.smugglersActive ? '#a83c2f' : '#c69d62'} stroke={palette.ink} strokeWidth="1" />
          <rect x="659" y="146" width="11" height="10" fill={vis.customsOpen ? '#efe3c6' : '#8a6c45'} stroke={palette.ink} strokeWidth="1" />
        </g>

        {/* Tide-Mill & waterwheel */}
        <g
          className="es-landmark-hit"
          onClick={() => onLandmarkClick?.('tideMill')}
        >
          <rect x="730" y="122" width="52" height="44" fill={isNight ? '#2c3643' : '#e6d8bd'} stroke={palette.ink} strokeWidth="1.3" />
          <polygon points="724,122 756,98 788,122" fill={isNight ? '#3d4957' : '#7b6f63'} stroke={palette.ink} strokeWidth="1.2" />
          {/* Waterwheel */}
          <g className={!reduced && vis.millScouring ? 'es-wheel-spin' : ''} style={{ transformOrigin: '734px 160px' }}>
            <circle cx="734" cy="160" r="13" fill="none" stroke={palette.ink} strokeWidth="1.5" />
            <line x1="721" y1="160" x2="747" y2="160" stroke={palette.ink} strokeWidth="1.1" />
            <line x1="734" y1="147" x2="734" y2="173" stroke={palette.ink} strokeWidth="1.1" />
          </g>
          {/* Scouring current plume when mill sluice is opened */}
          {vis.millScouring && (
            <path
              d="M 720 176 Q 620 202 475 234 Q 420 245 385 248"
              fill="none"
              stroke={isNight ? '#82b6c2' : '#4a6e7c'}
              strokeWidth="4"
              strokeDasharray="9 6"
              opacity="0.65"
            />
          )}
          {/* Small cat silhouette on mill roof ridge when discovered */}
          {(previewState.flags.catInMill || previewState.metrics.compositor >= 2) && (
            <g transform="translate(756, 94)">
              <path d="M -5 4 L -3 -3 L -1 0 L 1 -3 L 3 4 Z" fill={palette.ink} />
              <path d="M 3 3 Q 8 2 7 -3" fill="none" stroke={palette.ink} strokeWidth="1.3" />
            </g>
          )}
        </g>

        {/* Breakwater pier & Lighthouse */}
        <g
          className="es-landmark-hit"
          onClick={() => onLandmarkClick?.('lighthouse')}
        >
          <path d="M 18 166 L 178 166 L 194 179 L 18 179 Z" fill={isNight ? '#3b4754' : '#afa38c'} stroke={palette.ink} strokeWidth="1.3" />
          {/* Lighthouse tower */}
          <polygon points="134,166 140,104 154,104 160,166" fill={isNight ? '#dcd2bd' : '#f5ebd6'} stroke={palette.ink} strokeWidth="1.4" />
          <line x1="138" y1="132" x2="156" y2="132" stroke="#b83227" strokeWidth="4" opacity="0.85" />
          <rect x="139" y="92" width="16" height="12" fill={vis.beaconDark ? '#2a3037' : beamColor} stroke={palette.ink} strokeWidth="1.3" />
          <polygon points="136,92 147,80 158,92" fill={palette.ink} />
          {/* Rotating / steady volumetric beam */}
          {!vis.beaconDark && (
            <g className={!reduced ? 'es-beam-pulse' : ''}>
              <polygon
                points={`155,95 ${155 + 320 * vis.beaconPower},56 ${155 + 340 * vis.beaconPower},138 155,102`}
                fill="url(#es-beam-grad)"
              />
              <circle cx="147" cy="98" r="7" fill={beamColor} fillOpacity="0.65" />
            </g>
          )}
        </g>

        {/* Engraved sea wave hatches */}
        <g stroke={palette.ink} strokeWidth="0.9" strokeOpacity="0.28">
          {WAVE_HATCHES.map(w => (
            <line key={w.id} x1={w.x} y1={w.y} x2={w.x + w.w} y2={w.y} />
          ))}
        </g>

        {/* Outer Silt Bar (expands or contracts with channel depth!) */}
        <g
          className="es-landmark-hit"
          onClick={() => onLandmarkClick?.('siltBar')}
        >
          <ellipse
            cx="356"
            cy="252"
            rx={siltRx}
            ry={siltRy}
            fill="url(#es-stipple)"
            stroke={vis.channelSafe ? '#2d6c57' : '#b83227'}
            strokeWidth="1.4"
            strokeDasharray={vis.channelSafe ? '5 4' : '2 2'}
          />
          <ellipse
            cx="356"
            cy="252"
            rx={siltRx * 0.65}
            ry={siltRy * 0.6}
            fill={isNight ? '#3a4649' : '#d5c199'}
            fillOpacity="0.55"
            stroke={palette.ink}
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
          <text x="356" y="268" textAnchor="middle" className="es-plate-tiny" fill={palette.ink}>
            OUTER BAR · {vis.depthFeet.toFixed(0)} FT
          </text>
        </g>

        {/* Depth sounding numbers across fairway */}
        <g className="es-plate-soundings" fill={palette.ink} fillOpacity="0.62">
          {SOUNDING_MARKS.map((s, i) => (
            <text key={i} x={s.x} y={s.y}>
              {Math.max(5, Math.round(s.base + previewState.metrics.channel * 0.8))}
            </text>
          ))}
        </g>

        {/* Bell-Buoy */}
        <g
          className={`es-landmark-hit ${!reduced ? 'es-buoy-bob' : ''}`}
          transform="translate(268, 228)"
          onClick={() => onLandmarkClick?.('bellBuoy')}
        >
          <path d="M -9 4 L 9 4 L 5 -8 L -5 -8 Z" fill="#b83227" stroke={palette.ink} strokeWidth="1.2" />
          <line x1="0" y1="-8" x2="0" y2="-19" stroke={palette.ink} strokeWidth="1.3" />
          <circle cx="0" cy="-20" r="3" fill={palette.warm} stroke={palette.ink} strokeWidth="0.9" />
          <path d="M -14 8 Q 0 13 14 8" fill="none" stroke={palette.ink} strokeWidth="1" strokeOpacity="0.55" />
        </g>

        {/* SS Halcyon steamer — course & fate driven by Edition I & II slips */}
        {vis.showShip && (
          <g
            className="es-landmark-hit"
            onClick={() => onLandmarkClick?.('ship')}
          >
            {/* Track dotted curve */}
            <path
              d={vis.shipWrecked
                ? 'M 86 248 Q 220 242 356 234'
                : 'M 86 226 Q 260 198 468 194 Q 524 190 554 176'}
              fill="none"
              stroke={vis.shipWrecked ? '#b83227' : palette.ink}
              strokeWidth="1.3"
              strokeDasharray="4 4"
            />
            <g transform={vis.shipWrecked ? 'translate(362, 228) rotate(-14)' : 'translate(476, 194)'}>
              <path d="M -26 0 L 24 0 L 30 -9 L -22 -9 Z" fill={palette.ink} />
              <rect x="-12" y="-17" width="22" height="8" fill={isNight ? '#e7dcc5' : '#f6eedc'} stroke={palette.ink} strokeWidth="1" />
              <rect x="-2" y="-26" width="6" height="9" fill="#b83227" stroke={palette.ink} strokeWidth="0.9" />
              <path d="M 1 -27 Q 10 -34 22 -32" fill="none" stroke={palette.ink} strokeWidth="1.4" strokeOpacity="0.45" />
              {vis.shipWrecked && (
                <text x="0" y="-34" textAnchor="middle" className="es-plate-alert" fill="#b83227">
                  AGROUND
                </text>
              )}
            </g>
          </g>
        )}

        {/* Secret Second Quay / Unprinted Meridian — placed in open eastern water clear of cartouche */}
        {vis.ghostQuayVisible && (
          <g opacity="0.92">
            <path
              d="M 556 290 L 688 290 L 688 274 L 574 274 Z"
              fill={isNight ? 'rgba(199, 57, 46, 0.16)' : 'rgba(199, 57, 46, 0.09)'}
              stroke="#c7392e"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <circle cx="586" cy="274" r="3" fill="#e59c45" />
            <circle cx="672" cy="274" r="3" fill="#c7392e" />
            <text x="622" y="304" textAnchor="middle" className="es-plate-alert" fill="#c7392e">
              UNLISTED QUAY · MERIDIAN V
            </text>
          </g>
        )}

        {/* Vermilion proof stamps placed on landmarks whose current-edition slip is set */}
        {stampedLandmarks && stampedLandmarks.map((stamp) => {
          const lm = landmarks[stamp.landmark]
          if (!lm) return null
          const sx = Math.max(40, Math.min(PLATE_W - 44, lm.x - 24))
          const sy = Math.max(42, lm.y - 24)
          return (
            <g key={stamp.slotId} transform={`translate(${sx}, ${sy})`}>
              <circle
                cx="0"
                cy="0"
                r="11"
                fill={stamp.isStet ? '#fbf2db' : '#fff7ea'}
                stroke={stamp.isStet ? '#8a5a1e' : '#c2362b'}
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                className="es-plate-stamp"
                fill={stamp.isStet ? '#7c4e15' : '#c2362b'}
              >
                {stamp.mark === 'stet' ? 'S' : stamp.mark}
              </text>
            </g>
          )
        })}

        {/* Active galley slot vermilion proofreader's leader callout */}
        {activeLandmark && (
          <g className="es-callout">
            <circle
              cx={activeLandmark.x}
              cy={activeLandmark.y}
              r="24"
              fill="none"
              stroke="#c2362b"
              strokeWidth="1.8"
              strokeDasharray="6 3"
            />
            <circle cx={activeLandmark.x} cy={activeLandmark.y} r="3.5" fill="#c2362b" />
            <line
              x1={activeLandmark.x + 18}
              y1={activeLandmark.y - 18}
              x2={Math.min(PLATE_W - 140, activeLandmark.x + 56)}
              y2={Math.max(46, activeLandmark.y - 44)}
              stroke="#c2362b"
              strokeWidth="1.4"
            />
            <rect
              x={Math.min(PLATE_W - 184, activeLandmark.x + 50)}
              y={Math.max(28, activeLandmark.y - 58)}
              width="138"
              height="20"
              rx="2"
              fill="#c2362b"
            />
            <text
              x={Math.min(PLATE_W - 115, activeLandmark.x + 119)}
              y={Math.max(41, activeLandmark.y - 45)}
              textAnchor="middle"
              className="es-plate-badge"
            >
              {activeLandmark.label}
            </text>
          </g>
        )}

        {/* Copperplate border, registration marks & compass rose */}
        <rect x="12" y="12" width={PLATE_W - 24} height={PLATE_H - 24} fill="none" stroke={palette.ink} strokeWidth="1.5" />
        <rect x="17" y="17" width={PLATE_W - 34} height={PLATE_H - 34} fill="none" stroke={palette.ink} strokeWidth="0.6" strokeOpacity="0.6" />

        {/* Compass rose top-left */}
        <g transform="translate(56, 56)" stroke={palette.ink} strokeWidth="1">
          <circle cx="0" cy="0" r="18" fill={palette.sky} fillOpacity="0.82" />
          <polygon points="0,-16 3.5,-3 0,-5 -3.5,-3" fill="#b83227" stroke="none" />
          <polygon points="0,16 3.5,3 0,5 -3.5,3" fill={palette.ink} stroke="none" />
          <line x1="-15" y1="0" x2="15" y2="0" />
          <text x="0" y="-21" textAnchor="middle" className="es-plate-tiny" fill={palette.ink} stroke="none">N</text>
        </g>

        {/* Plate engraved cartouche bottom-left */}
        <g transform="translate(26, 286)">
          <rect x="0" y="0" width="330" height="24" fill={palette.sky} fillOpacity="0.92" stroke={palette.ink} strokeWidth="0.9" />
          <text x="10" y="15.5" className="es-plate-caption" fill={palette.ink}>
            {mapNotice}
          </text>
        </g>

        {/* OPTICAL LOUPE LAYER — rendered atop the entire plate & border like a real brass glass on paper */}
        {loupeOn && (
          <g>
            <g clipPath="url(#es-loupe-clip)">
              <rect x="0" y="0" width={PLATE_W} height={PLATE_H} fill="#f7eed8" fillOpacity="0.96" />
              {/* Cancelled 1910 grid & vermilion proof lines */}
              <g stroke="#b83227" strokeWidth="0.8" strokeOpacity="0.34">
                <line x1="0" y1="168" x2={PLATE_W} y2="168" strokeDasharray="4 4" />
                <line x1="356" y1="0" x2="356" y2={PLATE_H} strokeDasharray="4 4" />
                <line x1="612" y1="0" x2="612" y2={PLATE_H} strokeDasharray="4 4" />
              </g>
              {/* Subtle sepia copperplate under-drawing silhouette inside lens */}
              <g fill="none" stroke="#8f2219" strokeOpacity="0.22" strokeWidth="1">
                <polygon points="134,166 140,104 154,104 160,166" />
                <ellipse cx="356" cy="242" rx="88" ry="26" strokeDasharray="3 3" />
                <rect x="580" y="120" width="56" height="36" />
                <rect x="730" y="122" width="52" height="44" />
              </g>
              {/* Hidden 1910 annotations centered cleanly on each landmark */}
              <g className="es-underink-labels">
                <rect x="68" y="114" width="156" height="22" rx="2" fill="#fbf3df" stroke="#b83227" strokeWidth="0.9" />
                <text x="146" y="128.5" textAnchor="middle" className="es-underink-svg">OIL WATERED · 1910</text>

                <rect x="276" y="206" width="160" height="32" rx="2" fill="#fbf3df" stroke="#b83227" strokeWidth="0.9" />
                <text x="356" y="219" textAnchor="middle" className="es-underink-svg">TRUE SOUNDING: 9 FT</text>
                <text x="356" y="232" textAnchor="middle" className="es-underink-svg">CHAIN SHORTENED 40 YDS</text>

                <rect x="534" y="150" width="156" height="22" rx="2" fill="#fbf3df" stroke="#b83227" strokeWidth="0.9" />
                <text x="612" y="164.5" textAnchor="middle" className="es-underink-svg">PAGE 19 TORN BY VANE</text>

                <rect x="634" y="76" width="164" height="22" rx="2" fill="#fbf3df" stroke="#b83227" strokeWidth="0.9" />
                <text x="716" y="90.5" textAnchor="middle" className="es-underink-svg">CANVAS DOOR · PRESS INSIDE</text>

                <rect x="652" y="186" width="168" height="22" rx="2" fill="#fbf3df" stroke="#b83227" strokeWidth="0.9" />
                <text x="736" y="200.5" textAnchor="middle" className="es-underink-svg">SLUICE SCOURS THE BAR</text>

                <path d="M 556 290 L 688 290 L 688 272 L 574 272 Z" fill="#fbf3df" stroke="#b83227" strokeWidth="1.5" />
                <text x="622" y="284.5" textAnchor="middle" className="es-underink-svg">CANCELLED 1910 QUAY</text>
              </g>
            </g>
            {/* Brass loupe shadow, rim & optical lens highlight */}
            <circle cx={lensX} cy={lensY} r="96" fill="none" stroke="rgba(20, 14, 8, 0.35)" strokeWidth="5" />
            <circle cx={lensX} cy={lensY} r="94" fill="none" stroke="#8e6525" strokeWidth="6" />
            <circle cx={lensX} cy={lensY} r="90" fill="none" stroke="#e4c37d" strokeWidth="1.5" />
            <path
              d={`M ${lensX - 58} ${lensY - 58} A 80 80 0 0 1 ${lensX + 12} ${lensY - 78}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeOpacity="0.48"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  )
}

export default function ErrataSlip() {
  const reduced = useReducedMotion()
  const audioRef = useRef(null)
  const pressTimerRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [state, setState] = useState(createInitialState)
  const [activeSlotIdx, setActiveSlotIdx] = useState(0)
  const [loupeOn, setLoupeOn] = useState(false)
  const [loupePos, setLoupePos] = useState(null)
  const [muted, setMuted] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [inspectIdx, setInspectIdx] = useState(null) // null = active edition, 0..3 = past edition review
  const [dragSlip, setDragSlip] = useState(null)     // { slotId, optionId }
  const [dropHoverSlot, setDropHoverSlot] = useState(null)
  const [shelf, setShelf] = useState(readShelf)
  const [statusNote, setStatusNote] = useState('Paste three gummed errata slips into the 1911 galley, then pull the proof press.')

  useEffect(() => {
    const audio = createPressAudio()
    audioRef.current = audio
    return () => {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current)
        pressTimerRef.current = null
      }
      audio.dispose()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    audioRef.current?.setMuted(muted)
  }, [muted])

  const isColophon = state.editionIndex >= 4
  const editionSpec = useMemo(
    () => (isColophon ? null : getEditionSpec(state.editionIndex, state)),
    [isColophon, state]
  )
  const previewState = useMemo(() => computePreviewState(state), [state])

  const activeSlot = editionSpec ? editionSpec.slots[Math.min(activeSlotIdx, editionSpec.slots.length - 1)] : null
  const setCount = editionSpec
    ? editionSpec.slots.filter(s => Boolean(state.draftSlips[s.id])).length
    : 3
  const canPullPress = !isColophon && setCount === 3 && !pressing

  // Track loupe clue discoveries automatically when loupe is on for the active slot
  useEffect(() => {
    if (!loupeOn || !activeSlot) return
    if (state.loupeDiscoveries.includes(activeSlot.clueId)) return
    setState(prev => {
      if (prev.loupeDiscoveries.includes(activeSlot.clueId)) return prev
      return {
        ...prev,
        loupeDiscoveries: [...prev.loupeDiscoveries, activeSlot.clueId],
        metrics: { ...prev.metrics, compositor: prev.metrics.compositor + 0.5 }
      }
    })
    audioRef.current?.playClueChime()
    setStatusNote(`Under-ink uncovered on ${activeSlot.ref}: cancelled 1910 compositor note logged.`)
  }, [loupeOn, activeSlot, state.loupeDiscoveries])

  const handleBegin = useCallback(() => {
    setStarted(true)
    audioRef.current?.playPaperRustle(1.0)
    setStatusNote('1911 Proof opened. Drag or tap an erratum slip onto each underlined clause.')
  }, [])

  const applySlip = useCallback((slotId, option) => {
    if (isColophon || pressing) return
    setStarted(true)
    setInspectIdx(null)
    setState(prev => {
      const nextDrafts = { ...prev.draftSlips, [slotId]: option.id }
      if (editionSpec) {
        const nextUnfilled = editionSpec.slots.findIndex(
          s => s.id !== slotId && !nextDrafts[s.id]
        )
        if (nextUnfilled !== -1) {
          setActiveSlotIdx(nextUnfilled)
        }
      }
      return {
        ...prev,
        draftSlips: nextDrafts
      }
    })
    audioRef.current?.playSlipPaste(option.mark === 'stet')
    setStatusNote(`Pasted [${option.markName}] “${option.short}” — ${option.consequence}`)
  }, [editionSpec, isColophon, pressing])

  const handleToggleLoupe = useCallback(() => {
    setStarted(true)
    setLoupeOn(prev => {
      const next = !prev
      if (!next) setLoupePos(null)
      audioRef.current?.playLoupeToggle(next)
      setStatusNote(next
        ? 'Optical Loupe raised — sweep the engraving or switch clauses to read hidden 1910 under-ink.'
        : 'Optical Loupe lowered back to the brass rest.')
      return next
    })
  }, [])

  const handlePullPress = useCallback(() => {
    if (!canPullPress) return
    const isFinal = state.editionIndex === 3
    audioRef.current?.playPressPull(isFinal)
    setPressing(true)

    const finish = () => {
      pressTimerRef.current = null
      setState(prev => {
        const next = commitEdition(prev)
        if (next.ending) {
          const entry = {
            id: next.ending.id,
            title: next.ending.title,
            seal: next.ending.seal,
            accent: next.ending.accent,
            date: new Date().toISOString().slice(0, 10),
            clues: next.loupeDiscoveries.length,
            margins: next.editions.map(e => e.marginalia?.text).filter(Boolean)
          }
          setShelf(old => {
            const updated = [entry, ...old.filter(item => item.id !== entry.id)]
            writeShelf(updated)
            return updated
          })
          setStatusNote(`Colophon bound: ${next.ending.title}. Every edition from 1911–1914 is archived on your shelf.`)
        } else {
          const nextYear = 1911 + next.editionIndex
          setStatusNote(`Edition ${nextYear} pulled from the press — inspect how last year’s errata reshaped the harbor.`)
        }
        return next
      })
      setActiveSlotIdx(0)
      setInspectIdx(null)
      setLoupeOn(false)
      setLoupePos(null)
      setPressing(false)
    }

    if (reduced) {
      finish()
    } else {
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = window.setTimeout(finish, 460)
    }
  }, [canPullPress, reduced, state.editionIndex])

  const handleReset = useCallback(() => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    setState(createInitialState())
    setActiveSlotIdx(0)
    setInspectIdx(null)
    setLoupeOn(false)
    setLoupePos(null)
    setPressing(false)
    setStarted(true)
    audioRef.current?.playPaperRustle(0.85)
    setStatusNote('Fresh 1911 proof sheet laid on the press stone.')
  }, [])

  const handleLandmarkClick = useCallback((landmarkKey) => {
    if (!editionSpec) return
    const idx = editionSpec.slots.findIndex(s => s.landmark === landmarkKey)
    if (idx !== -1) {
      setActiveSlotIdx(idx)
      setInspectIdx(null)
      audioRef.current?.playPaperRustle(1.15)
    }
  }, [editionSpec])

  // Keyboard channel (skips when typing in marginalia input)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') e.target.blur()
        return
      }
      if (!started) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleBegin()
        }
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'l') {
        e.preventDefault()
        handleToggleLoupe()
      } else if (key === 'm') {
        e.preventDefault()
        setMuted(v => !v)
      } else if (key === 'r') {
        e.preventDefault()
        handleReset()
      } else if (!isColophon && editionSpec) {
        if (key === '1' || key === '2' || key === '3') {
          e.preventDefault()
          setInspectIdx(null)
          setActiveSlotIdx(Number(key) - 1)
          audioRef.current?.playPaperRustle(1.1)
        } else if (key === 'q' || key === 'w' || key === 'e') {
          e.preventDefault()
          const optIdx = key === 'q' ? 0 : key === 'w' ? 1 : 2
          const slot = editionSpec.slots[activeSlotIdx]
          if (slot && slot.options[optIdx]) {
            applySlip(slot.id, slot.options[optIdx])
          }
        } else if ((e.key === 'Enter' || e.key === ' ') && canPullPress) {
          e.preventDefault()
          handlePullPress()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSlotIdx, applySlip, canPullPress, editionSpec, handleBegin, handlePullPress, handleReset, handleToggleLoupe, isColophon, started])

  // Viewed edition when inspecting an archived year
  const inspectedEdition = inspectIdx !== null ? state.editions[inspectIdx] : null
  const uniqueEndingsFound = useMemo(() => new Set(shelf.map(s => s.id)), [shelf])

  const stampedLandmarks = useMemo(() => {
    if (!editionSpec || inspectedEdition) return []
    return editionSpec.slots
      .map(slot => {
        const chosenId = state.draftSlips[slot.id]
        if (!chosenId) return null
        const opt = slot.options.find(o => o.id === chosenId)
        if (!opt) return null
        return { slotId: slot.id, landmark: slot.landmark, mark: opt.mark, isStet: opt.mark === 'stet' }
      })
      .filter(Boolean)
  }, [editionSpec, inspectedEdition, state.draftSlips])

  const plateYear = inspectedEdition ? inspectedEdition.year : (editionSpec ? editionSpec.year : 1914)
  const plateNotice = inspectedEdition
    ? `${inspectedEdition.year} ARCHIVED PROOF — ${inspectedEdition.title.toUpperCase()}`
    : (editionSpec
        ? (setCount > 0 ? `${editionSpec.year} PROOF — ${setCount}/3 ERRATA STAMPED` : editionSpec.mapNotice)
        : `1914 BOUND COLOPHON — ${state.ending?.title?.toUpperCase() || ''}`)
  const plateEditionIndex = inspectedEdition ? inspectedEdition.index : (editionSpec ? editionSpec.index : 4)

  return (
    <div
      className={`es-desk ${pressing ? 'is-pressing' : ''} ${reduced ? 'is-reduced' : ''}`}
      data-playground-surface
      data-testid="es-surface"
    >
      {/* Top Brass Ledger Rail */}
      <header className="es-rail">
        <div className="es-rail-left">
          <div className="es-nav-pill">
            <ExperimentNav currentCategory="linguistics" currentExperiment="errata-slip" />
          </div>
          <div className="es-brand">
            <span className="es-brand-title">errata.slip()</span>
            <span className="es-brand-sub">Saltmere Press · 1911–1914</span>
          </div>
        </div>

        {/* Edition Chronology Tabs */}
        <nav className="es-year-tabs" aria-label="Almanac editions">
          {[1911, 1912, 1913, 1914].map((yr, idx) => {
            const committed = idx < state.editions.length
            const active = !isColophon && inspectIdx === null && state.editionIndex === idx
            const inspecting = inspectIdx === idx
            return (
              <button
                key={yr}
                type="button"
                className={`es-year-tab ${active ? 'is-active' : ''} ${committed ? 'is-done' : ''} ${inspecting ? 'is-inspect' : ''}`}
                disabled={!committed && !active}
                onClick={() => {
                  if (committed) {
                    setInspectIdx(idx)
                    audioRef.current?.playPaperRustle(1.05)
                  } else if (active) {
                    setInspectIdx(null)
                  }
                }}
                data-playground-action
                data-testid={`es-year-${yr}`}
              >
                <span className="es-year-num">{yr}</span>
                <span className="es-year-dot" aria-hidden="true">{committed ? '✓' : active ? '●' : '·'}</span>
              </button>
            )
          })}
          {isColophon && (
            <button
              type="button"
              className={`es-year-tab is-colophon ${inspectIdx === null ? 'is-active' : ''}`}
              onClick={() => setInspectIdx(null)}
              data-testid="es-year-colophon"
            >
              Colophon
            </button>
          )}
        </nav>

        {/* Brass Desk Instruments */}
        <div className="es-tools">
          <button
            type="button"
            className={`es-tool-btn ${loupeOn ? 'is-on' : ''}`}
            onClick={handleToggleLoupe}
            aria-pressed={loupeOn}
            data-playground-action
            data-testid="es-loupe"
            title="Inspect hidden 1910 under-ink (L)"
          >
            <span className="es-tool-icon" aria-hidden="true">◎</span>
            <span>Loupe</span>
            <kbd>L</kbd>
          </button>
          <button
            type="button"
            className={`es-tool-btn ${muted ? '' : 'is-on'}`}
            onClick={() => setMuted(v => !v)}
            aria-pressed={!muted}
            data-testid="es-mute"
            title="Toggle letterpress foley audio (M)"
          >
            <span className="es-tool-icon" aria-hidden="true">{muted ? '×' : '♪'}</span>
            <span className="es-hide-sm">{muted ? 'Muted' : 'Foley'}</span>
          </button>
          <button
            type="button"
            className="es-tool-btn"
            onClick={handleReset}
            data-playground-action
            data-testid="es-reset"
            title="Lay a fresh 1911 proof sheet (R)"
          >
            <span className="es-tool-icon" aria-hidden="true">↺</span>
            <span className="es-hide-sm">Reset</span>
          </button>
        </div>
      </header>

      {/* Main Proofreader's Workbench */}
      <main className="es-workbench">
        {/* LEFT / PRIMARY COLUMN: Open Almanac Folio */}
        <section className="es-folio" aria-label="Saltmere Harbor Almanac Proof Sheet">
          <div className="es-folio-head">
            <span className="es-dateline">
              {inspectedEdition
                ? `ARCHIVED EDITION ${inspectedEdition.roman} · ${inspectedEdition.year} · ${inspectedEdition.title.toUpperCase()}`
                : editionSpec
                  ? editionSpec.dateline
                  : `BOUND COLOPHON · SALTMERE HARBOR ALMANAC · 1911–1914`}
            </span>
            <span className="es-shelf-pips" title={`${uniqueEndingsFound.size} of ${ENDINGS.length} colophons bound in this browser`}>
              {ENDINGS.map(end => (
                <span
                  key={end.id}
                  className={`es-pip ${uniqueEndingsFound.has(end.id) ? 'is-bound' : ''}`}
                  style={uniqueEndingsFound.has(end.id) ? { backgroundColor: end.accent, borderColor: end.accent } : undefined}
                  aria-label={`${end.title}: ${uniqueEndingsFound.has(end.id) ? 'bound' : 'undiscovered'}`}
                />
              ))}
              <span className="es-pip-count">{uniqueEndingsFound.size}/{ENDINGS.length}</span>
            </span>
          </div>

          {/* Living Copperplate Harbor Plate */}
          <HarborPlate
            previewState={previewState}
            editionIndex={plateEditionIndex}
            year={plateYear}
            mapNotice={plateNotice}
            activeLandmarkKey={!inspectedEdition && activeSlot ? activeSlot.landmark : null}
            stampedLandmarks={stampedLandmarks}
            loupeOn={loupeOn}
            loupePos={loupePos}
            onPlateMove={setLoupePos}
            onLandmarkClick={handleLandmarkClick}
            reduced={reduced}
          />

          {/* Press Platen Sweep Indicator */}
          {pressing && <div className="es-press-roller" aria-hidden="true" />}

          {/* FOLIO BODY: Either Archived Edition, Active Proof Galley, or Final Bound Colophon */}
          {inspectedEdition ? (
            <div className="es-galley es-galley-archive" data-testid="es-archive-view">
              <div className="es-galley-title-row">
                <h1>{inspectedEdition.year}: {inspectedEdition.title}</h1>
                <button
                  type="button"
                  className="es-return-btn"
                  onClick={() => setInspectIdx(null)}
                >
                  ← Return to {isColophon ? 'Colophon' : `${1911 + state.editionIndex} Proof`}
                </button>
              </div>
              <div className="es-clauses">
                {inspectedEdition.slips.map(s => (
                  <article key={s.slotId} className="es-clause is-locked">
                    <div className="es-clause-meta">
                      <span className="es-clause-ref">{s.ref}</span>
                      <span className="es-mark-tag">{s.mark}</span>
                    </div>
                    <p className="es-clause-text">
                      {s.before}
                      <del className="es-struck">{s.original}</del>{' '}
                      <span className="es-pasted-slip is-settled">{s.replacement}</span>
                      {s.after}
                    </p>
                    <p className="es-clause-aftermath">↳ {s.consequence}</p>
                  </article>
                ))}
              </div>
              {inspectedEdition.marginalia?.text && (
                <div className="es-printed-margin">
                  <span className="es-margin-label">Printed Margin Gloss:</span> “{inspectedEdition.marginalia.text}”
                </div>
              )}
            </div>
          ) : isColophon && state.ending ? (
            <div className="es-colophon" data-testid="es-ending">
              <div className="es-colophon-banner" style={{ borderColor: state.ending.accent }}>
                <div className="es-colophon-seal" style={{ backgroundColor: state.ending.accent }}>
                  {state.ending.seal}
                </div>
                <div>
                  <div className="es-colophon-code" style={{ color: state.ending.accent }}>
                    {state.ending.code}
                  </div>
                  <h1 className="es-colophon-title">{state.ending.title}</h1>
                </div>
              </div>
              <p className="es-colophon-verdict">{state.ending.verdict}</p>
              <p className="es-colophon-epilogue">{state.ending.epilogue}</p>

              {/* Causal Thread */}
              <div className="es-causal-block">
                <h2>Causal Errata Chain (1911 → 1914)</h2>
                <ol className="es-causal-list">
                  {state.causalTrail.map((item, i) => (
                    <li key={i} className="es-causal-item">
                      <span className="es-causal-yr">{item.year}</span>
                      <span className="es-causal-mark">{item.mark}</span>
                      <span className="es-causal-body">
                        <strong>{item.short}</strong> — {item.consequence}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Player's Authored Marginalia Footnotes */}
              {state.editions.some(e => e.marginalia?.text) && (
                <div className="es-margin-anthology">
                  <h3>Your Surviving Marginalia</h3>
                  <ul>
                    {state.editions.filter(e => e.marginalia?.text).map(e => (
                      <li key={e.year}>
                        <strong>{e.year}:</strong> “{e.marginalia.text}” <em>— {e.marginalia.reply}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="es-colophon-actions">
                <button
                  type="button"
                  className="es-press-btn is-ready"
                  onClick={handleReset}
                  data-playground-primary
                  data-testid="es-replay"
                >
                  Lay Fresh 1911 Galley · Hunt Another Colophon
                </button>
              </div>
            </div>
          ) : (
            <div className="es-galley" data-testid="es-galley">
              {/* Non-blocking Vellum Cover Band before first interaction */}
              {!started && (
                <div className="es-cover-band" data-testid="es-cover">
                  <div className="es-wax-seal" aria-hidden="true">₰</div>
                  <div className="es-cover-copy">
                    <div className="es-cover-kicker">SALTMERE PRESS · PROOFROOM DESK</div>
                    <p>
                      A harbour town lives by what its annual Almanac prints. Paste gummed errata slips over
                      four years, inspect the vanished compositor’s under-ink through the brass loupe, and
                      decide what survives 1914.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="es-begin-btn"
                    onClick={handleBegin}
                    data-playground-primary
                    data-testid="es-begin"
                  >
                    Break Seal &amp; Proof 1911
                  </button>
                </div>
              )}

              <div className="es-galley-title-row">
                <div>
                  <h1 className="es-edition-heading">
                    {editionSpec.year} — {editionSpec.title}
                  </h1>
                  <p className="es-epigraph">{editionSpec.epigraph}</p>
                </div>
                <div className="es-tally" aria-label={`${setCount} of 3 errata slips placed`}>
                  <span className="es-tally-num">{setCount}/3</span>
                  <span className="es-tally-label">SLIPS SET</span>
                </div>
              </div>

              {/* Three Contested Galley Clauses (Drop targets & Tap targets) */}
              <div className="es-clauses">
                {editionSpec.slots.map((slot, idx) => {
                  const chosenId = state.draftSlips[slot.id]
                  const chosenOpt = slot.options.find(o => o.id === chosenId)
                  const isActive = idx === activeSlotIdx
                  const isDropOver = dropHoverSlot === slot.id
                  return (
                    <div
                      key={slot.id}
                      role="button"
                      tabIndex={0}
                      className={`es-clause ${isActive ? 'is-selected' : ''} ${chosenOpt ? 'is-filled' : ''} ${isDropOver ? 'is-drop-over' : ''}`}
                      onClick={() => {
                        setActiveSlotIdx(idx)
                        audioRef.current?.playPaperRustle(1.12)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveSlotIdx(idx)
                        }
                      }}
                      onDragOver={(e) => {
                        if (dragSlip && dragSlip.slotId === slot.id) {
                          e.preventDefault()
                          setDropHoverSlot(slot.id)
                        }
                      }}
                      onDragLeave={() => {
                        if (dropHoverSlot === slot.id) setDropHoverSlot(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDropHoverSlot(null)
                        if (dragSlip && dragSlip.slotId === slot.id) {
                          const opt = slot.options.find(o => o.id === dragSlip.optionId)
                          if (opt) applySlip(slot.id, opt)
                        }
                        setDragSlip(null)
                      }}
                      data-playground-action
                      data-testid={`es-slot-${idx}`}
                    >
                      <div className="es-clause-meta">
                        <span className="es-clause-ref">
                          <kbd>{idx + 1}</kbd> {slot.ref}
                        </span>
                        <span className={`es-clause-state ${chosenOpt ? 'is-set' : ''}`}>
                          {chosenOpt ? `${chosenOpt.mark} ${chosenOpt.markName}` : 'NEEDS ERRATUM'}
                        </span>
                      </div>

                      <p className="es-clause-text">
                        {slot.before}
                        {chosenOpt ? (
                          chosenOpt.mark === 'stet' ? (
                            <>
                              <span className="es-stet-kept">{slot.original}</span>{' '}
                              <span
                                className="es-pasted-slip is-stet"
                                style={{ '--tilt': idx === 1 ? '0.45deg' : '-0.55deg' }}
                              >
                                {chosenOpt.label}
                              </span>
                            </>
                          ) : (
                            <>
                              <del className="es-struck">{slot.original}</del>{' '}
                              <span
                                className="es-pasted-slip"
                                style={{ '--tilt': idx === 1 ? '0.45deg' : '-0.55deg' }}
                              >
                                {chosenOpt.label}
                              </span>
                            </>
                          )
                        ) : (
                          <span className="es-contested">{slot.original}</span>
                        )}
                        {slot.after}
                      </p>

                      {/* Hidden Under-Ink line appears when Optical Loupe is raised */}
                      {loupeOn && (
                        <div className="es-underink-note" data-testid={`es-clue-${idx}`}>
                          <span className="es-underink-tag">UNDER-INK 1910</span>
                          <span>{slot.underInk}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <footer className="es-folio-footnote">
                <span className="es-footnote-glyph" aria-hidden="true">❧</span>
                <span>{editionSpec.footnote}</span>
              </footer>
            </div>
          )}
        </section>

        {/* RIGHT / SECONDARY COLUMN: Brass Composing Stick, Gummed Slips, Marginalia & Press Lever */}
        <aside className="es-tray" aria-label="Composing stick and errata slips">
          {!isColophon && activeSlot ? (
            <>
              <div className="es-tray-head">
                <div>
                  <div className="es-tray-kicker">COMPOSING STICK · {activeSlot.ref}</div>
                  <h2 className="es-tray-title">Drag or tap a gummed slip to paste</h2>
                </div>
                <div className="es-slot-pills" role="tablist" aria-label="Select galley clause">
                  {editionSpec.slots.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeSlotIdx}
                      className={`es-slot-pill ${idx === activeSlotIdx ? 'is-active' : ''} ${state.draftSlips[s.id] ? 'is-done' : ''}`}
                      onClick={() => setActiveSlotIdx(idx)}
                    >
                      §{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Three Gummed Errata Slips */}
              <div className="es-slips-stack">
                {activeSlot.options.map((opt, oIdx) => {
                  const isChosen = state.draftSlips[activeSlot.id] === opt.id
                  const shortcut = oIdx === 0 ? 'Q' : oIdx === 1 ? 'W' : 'E'
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragSlip({ slotId: activeSlot.id, optionId: opt.id })}
                      onDragEnd={() => { setDragSlip(null); setDropHoverSlot(null) }}
                      onClick={() => applySlip(activeSlot.id, opt)}
                      className={`es-slip-card ${isChosen ? 'is-chosen' : ''} ${opt.mark === 'stet' ? 'is-stet' : ''}`}
                      data-playground-action
                      data-testid={`es-slip-${oIdx}`}
                    >
                      <div className="es-slip-top">
                        <span className="es-slip-mark">{opt.mark}</span>
                        <span className="es-slip-kind">{opt.markName}</span>
                        <kbd className="es-slip-key">{shortcut}</kbd>
                      </div>
                      <div className="es-slip-label">“{opt.label}”</div>
                      <div className="es-slip-hint">
                        {isChosen ? '✓ Pasted onto proof' : 'Drag to clause or click to paste'}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Typed Language Channel: Margin Gloss Scribe */}
              <div className="es-margin-box">
                <label htmlFor="es-margin-input" className="es-margin-head">
                  <span>MARGIN GLOSS (PRINTED NEXT YEAR)</span>
                  <span className="es-margin-count">{state.draftMargin.length}/52</span>
                </label>
                <input
                  id="es-margin-input"
                  type="text"
                  maxLength={52}
                  value={state.draftMargin}
                  onChange={(e) => setState(prev => ({ ...prev, draftMargin: e.target.value }))}
                  placeholder="Optional note: warn of shoal, clerk, light, 1910…"
                  className="es-margin-input"
                  data-testid="es-margin-input"
                />
                <div className="es-stamp-chips" aria-label="Quick margin stamps">
                  {STAMP_CHIPS.map(chip => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`es-chip ${state.draftMargin === chip.text ? 'is-active' : ''}`}
                      onClick={() => {
                        setState(prev => ({ ...prev, draftMargin: chip.text }))
                        audioRef.current?.playPaperRustle(1.2)
                      }}
                      data-testid={`es-chip-${chip.id}`}
                    >
                      {chip.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harbor Ledger Telemetry (world-native gauges) */}
              <div className="es-ledger-strip" aria-label="Harbor standing">
                <div className="es-gauge">
                  <span>CHANNEL</span>
                  <strong>{previewState.metrics.channel >= 1 ? 'DEEP' : previewState.metrics.channel <= -1 ? 'SHOALING' : 'SOUNDED'}</strong>
                </div>
                <div className="es-gauge">
                  <span>BEACON</span>
                  <strong>{previewState.metrics.beacon >= 1 ? 'BRIGHT' : previewState.metrics.beacon <= -1 ? 'DIM' : 'WATCH'}</strong>
                </div>
                <div className="es-gauge">
                  <span>LEDGER</span>
                  <strong>{previewState.metrics.ledger >= 1 ? 'OPEN' : previewState.metrics.ledger <= -1 ? 'COVERT' : 'SEALED'}</strong>
                </div>
                <div className="es-gauge">
                  <span>UNDER-INK</span>
                  <strong>{state.loupeDiscoveries.length} {state.loupeDiscoveries.length === 1 ? 'CLUE' : 'CLUES'}</strong>
                </div>
              </div>

              {/* Primary Action: Pull Iron Press Lever */}
              <button
                type="button"
                className={`es-press-btn ${canPullPress ? 'is-ready' : ''}`}
                disabled={!canPullPress}
                onClick={handlePullPress}
                data-playground-primary
                data-testid="es-press"
              >
                <span className="es-press-bar" aria-hidden="true" />
                <span>
                  {canPullPress
                    ? state.editionIndex === 3
                      ? 'Pull Final Press · Bind 1914 Colophon'
                      : `Pull Press · Print ${editionSpec.year} & Advance to ${editionSpec.year + 1}`
                    : `Set ${3 - setCount} More Erratum ${3 - setCount === 1 ? 'Slip' : 'Slips'} to Unlock Press`}
                </span>
              </button>
            </>
          ) : (
            /* Colophon Archive Shelf when finished */
            <div className="es-shelf-panel" data-testid="es-shelf">
              <div className="es-tray-kicker">SALTMERE PRESS · BOUND ARCHIVE</div>
              <h2 className="es-tray-title">Colophon Shelf ({uniqueEndingsFound.size} of {ENDINGS.length})</h2>
              <p className="es-shelf-intro">
                Each bound volume stays on this desk. Click any year tab above to re-read your pasted slips,
                or lay a fresh 1911 proof to discover alternate town histories.
              </p>
              <div className="es-spines">
                {ENDINGS.map(end => {
                  const found = shelf.find(s => s.id === end.id)
                  const isCurrent = state.ending?.id === end.id
                  return (
                    <div
                      key={end.id}
                      className={`es-spine ${found ? 'is-found' : ''} ${isCurrent ? 'is-current' : ''}`}
                      style={found ? { borderLeftColor: end.accent } : undefined}
                    >
                      <div className="es-spine-head">
                        <span className="es-spine-seal" style={found ? { color: end.accent } : undefined}>
                          {found ? end.seal : '—'}
                        </span>
                        <strong>{found ? end.title : 'Unprinted Colophon'}</strong>
                      </div>
                      <span className="es-spine-meta">
                        {found ? (isCurrent ? 'Current edition' : `Bound ${found.date}`) : end.code}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Live Status / Keyboard Hint Strip */}
          <div className="es-status-bar" role="status" aria-live="polite" data-testid="es-status">
            <p className="es-status-msg">{statusNote}</p>
            <p className="es-kbd-legend">
              Keys: <kbd>1–3</kbd> clause · <kbd>Q/W/E</kbd> paste · <kbd>L</kbd> loupe · <kbd>Enter</kbd> press
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}
