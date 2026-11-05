// The hall's ear. It is never told which key was pressed. It reads the tube's real
// resonances and the state of its seals, writes down the sounds it believes in,
// then finds the nearest word it knows.
import { N } from './articulate.js'

const SR = 96000 // two scattering steps per sample at 48 kHz
const FADE = 0.9992
const STEP_HZ = 25
const BINS = 164 // 100 to 4175 Hz

const hzGrid = Float32Array.from({ length: BINS }, (_, i) => 100 + i * STEP_HZ)
const cosT = hzGrid.map(f => Math.cos((2 * Math.PI * f) / SR))
const sinT = hzGrid.map(f => Math.sin((2 * Math.PI * f) / SR))

// The exact frequency response of the waveguide, section by section from lips to
// glottis, so what the ear reads is the same physics the speaker radiates.
export function tubeResponse(d, into = new Float32Array(BINS)) {
  const k = new Float64Array(N)
  for (let i = 1; i < N; i++) {
    const a0 = d[i - 1] * d[i - 1]
    const a1 = d[i] * d[i]
    const v = a1 <= 1e-6 ? 0.999 : (a0 - a1) / (a0 + a1)
    k[i] = Math.max(-0.998, Math.min(0.998, v))
  }
  for (let b = 0; b < BINS; b++) {
    const c = cosT[b]
    const s = sinT[b]
    let rbR = 1
    let rbI = 0
    let laR = -0.85
    let laI = 0
    for (let i = N - 1; i >= 0; i--) {
      // undo one sample of travel each way across this section
      const raR = (rbR * c - rbI * s) / FADE
      const raI = (rbR * s + rbI * c) / FADE
      const lbR = (laR * c + laI * s) * FADE
      const lbI = (laI * c - laR * s) * FADE
      if (i === 0) {
        const gR = raR - lbR * 0.75
        const gI = raI - lbI * 0.75
        into[b] = 1 / Math.max(1e-9, Math.hypot(gR, gI))
        break
      }
      const kk = k[i]
      const prR = (raR + kk * lbR) / (1 - kk)
      const prI = (raI + kk * lbI) / (1 - kk)
      laR = lbR * (1 + kk) + kk * prR
      laI = lbI * (1 + kk) + kk * prI
      rbR = prR
      rbI = prI
    }
  }
  return into
}

export function formants(d, spectrum = tubeResponse(d)) {
  const out = []
  for (let b = 1; b < BINS - 1 && out.length < 3; b++) {
    const y0 = spectrum[b - 1]
    const y1 = spectrum[b]
    const y2 = spectrum[b + 1]
    if (y1 > y0 && y1 >= y2) {
      const den = y0 - 2 * y1 + y2
      const off = den === 0 ? 0 : 0.5 * (y0 - y2) / den
      const f = 100 + (b + off) * STEP_HZ
      if (f > 170) out.push(f)
    }
  }
  // On a back, rounded tube F1 and F2 can merge into one hump, and the next peak up is really
  // F3. The merged F2 still shows as a shoulder: the slope stops falling for a moment on the
  // way down from F1. A true high F2 leaves that slope falling steadily into a valley.
  if (out[0] && out[0] < 560 && (out[1] ?? 0) > 2200) {
    const from = Math.floor((out[0] - 100) / STEP_HZ) + 3
    const to = Math.floor((1500 - 100) / STEP_HZ)
    let prev = Math.log(spectrum[from] / spectrum[from - 1])
    for (let b = from + 1; b < to; b++) {
      const slope = Math.log(spectrum[b] / spectrum[b - 1])
      const next = Math.log(spectrum[b + 1] / spectrum[b])
      if (slope < 0 && slope > prev && slope > next) {
        out.splice(1, 0, 100 + b * STEP_HZ)
        break
      }
      prev = slope
    }
  }
  return { f1: out[0] ?? 0, f2: out[1] ?? 0, f3: out[2] ?? 0 }
}

// The five vowels the hall knows, in Hz, as this length of tube says them.
export const VOWEL_MAP = {
  A: { f1: 780, f2: 1300 },
  E: { f1: 500, f2: 1920 },
  I: { f1: 320, f2: 2320 },
  O: { f1: 450, f2: 760 },
  U: { f1: 280, f2: 780 }
}
const lg = Math.log
// The chart's corners have no far side: past the centre of I, away from everything else, the
// sound is only more I. Each vowel forgives overshoot in the directions nothing else lives.
const OUTWARD = { A: [1, 0], E: [0, 0], I: [-1, 1], O: [0, -1], U: [-1, -1] }
export function vowelDistance(f1, f2, v) {
  let a = (lg(f1) - lg(VOWEL_MAP[v].f1)) * 1.25
  let b = lg(f2) - lg(VOWEL_MAP[v].f2)
  const [out1, out2] = OUTWARD[v]
  if (a * out1 > 0) a = 0
  if (b * out2 > 0) b = 0
  return Math.hypot(a, b)
}
export function hearVowel(f1, f2) {
  let best = 'A'
  let bd = 1e9
  let second = 1e9
  for (const v in VOWEL_MAP) {
    const d = vowelDistance(f1, f2, v)
    if (d < bd) {
      second = bd
      bd = d
      best = v
    } else if (d < second) second = d
  }
  return { vowel: best, dist: bd, margin: second - bd }
}

// Past this distance a shape is out in empty chart space: the nearest vowel is only nearest.
export const NO_VOWEL = 0.38
// How true a pinned vowel rings: 1 is dead centre, 0 is out where no vowel lives.
export const trueness = (f1, f2, vowel) => {
  const h = hearVowel(f1, f2)
  if (h.vowel !== vowel) return 0
  return Math.max(0, Math.min(1, 1 - h.dist / NO_VOWEL))
}

// One frame of what's coming out, classified without knowing the intent.
export function classifyFrame(d, art, press) {
  if (press < 0.06 || (art.voice < 0.35 && art.asp < 0.25)) {
    let lo = 9
    let at = 0
    for (let i = 14; i < N; i++) if (d[i] < lo) { lo = d[i]; at = i }
    if (press >= 0.06 && lo > 0.03 && lo < 0.3) return { label: friction(at, false), kind: 'c' }
    if (press >= 0.06 && lo <= 0.03) return { label: closureAt(at, false), kind: 's' }
    return { label: null, kind: 'q' }
  }
  let lo = 9
  let at = 0
  for (let i = 14; i < N; i++) if (d[i] < lo) { lo = d[i]; at = i }
  const voiced = art.voice >= 0.35
  if (art.asp >= 0.25 && !voiced) return lo < 0.3 ? { label: friction(at, false), kind: 'c' } : { label: 'H', kind: 'c' }
  if (lo <= 0.03) {
    if (art.vel > 0.5 && voiced) return { label: at >= 39 ? 'M' : at >= 28 ? 'N' : 'NG', kind: 'c' }
    return { label: closureAt(at, voiced), kind: 's' }
  }
  if (lo < 0.235) return { label: friction(at, voiced), kind: 'c' }
  // a raised tip is a liquid even when the tongue body behind it happens to be narrower
  if (lo < 0.56 && art.tipD < 0.7) return { label: art.tipI < 32 ? 'R' : 'L', kind: 'c' }
  if (at >= 39 && lo < 0.42) return { label: 'W', kind: 'c' }
  // only the Y cam presses this far; a tongue merely travelling to I passes through as I
  if (art.tx > 0.85 && art.ty > 0.995) return { label: 'Y', kind: 'c' }
  const fm = formants(d)
  const h = hearVowel(fm.f1, fm.f2)
  return { label: h.dist < NO_VOWEL ? h.vowel : 'UH', kind: 'v', fm }
}
const closureAt = (at, voiced) => (at >= 39 ? (voiced ? 'B' : 'P') : at >= 29 ? (voiced ? 'D' : 'T') : (voiced ? 'G' : 'K'))
const friction = (at, voiced) => {
  if (at >= 39) return voiced ? 'V' : 'F'
  if (at >= 35) return voiced ? 'Z' : 'S'
  if (at >= 28) return 'X'
  return voiced ? 'G' : 'H'
}

const STOP_MIN = 0.03
const CONT_MIN = { H: 0.05, S: 0.06, Z: 0.05, F: 0.05, V: 0.04, X: 0.06, M: 0.045, N: 0.045, NG: 0.045, L: 0.038, R: 0.038, W: 0.034, Y: 0.03 }
const VOWEL_MIN = 0.075
const SETTLED = 4 // log-Hz per second: faster than this and the tongue is still travelling
const WORD_GAP = 0.15

// Frames become sounds, sounds become words.
export function createListener() {
  let run = null
  let quiet = 0
  let word = []
  let words = []
  let spoken = false
  let lastF1 = 0
  let lastF2 = 0

  const flush = () => {
    if (!run) return
    const { label, kind, time } = run
    const min = kind === 's' ? STOP_MIN : kind === 'v' ? VOWEL_MIN : CONT_MIN[label] ?? 0.05
    const prev = word[word.length - 1]
    // the breath after an unvoiced release is part of the stop, not a sound of its own
    const breathOfStop = label === 'H' && (prev === 'P' || prev === 'T' || prev === 'K')
    if (label && time >= min && prev !== label && !breathOfStop) word.push(label)
    run = null
  }
  const endWord = () => {
    flush()
    if (word.length) words.push(word)
    word = []
  }

  return {
    feed(frame, dt) {
      if (frame.kind === 'q' || !frame.label) {
        flush()
        quiet += dt
        if (quiet > WORD_GAP && word.length) endWord()
        return
      }
      quiet = 0
      spoken = true
      if (frame.kind === 'v') {
        const f1 = Math.log(Math.max(frame.fm.f1, 100))
        const f2 = Math.log(Math.max(frame.fm.f2, 100))
        const rate = lastF1 ? Math.hypot(f1 - lastF1, f2 - lastF2) / dt : 99
        lastF1 = f1
        lastF2 = f2
        if (rate > SETTLED) return
      } else lastF1 = 0
      if (run && run.label === frame.label) run.time += dt
      else {
        flush()
        run = { label: frame.label, kind: frame.kind, time: dt }
      }
    },
    get quiet() { return quiet },
    get spoken() { return spoken },
    // Drains what has been heard so far. Call once the speaker has fallen silent.
    drain() {
      endWord()
      const out = words
      words = []
      spoken = false
      quiet = 0
      return out
    }
  }
}

// Spellings use the machine's own keys: five vowels, X for SH.
const LEX = `A:ah E:eh I:ee O:oh U:oo OU:oh EI:eh AU:ow OI:oy AI:I AM:am NO:no NOU:know NAU:now SI:see MI:me MA:ma MAMA:mama PAPA:papa BABA:baba DADA:dada NANA:nana MIMI:mimi MOMO:momo MUMU:moo-moo
MU:moo MIAU:meow MEU:mew BU:boo BOU:bow BAI:bye BI:bee DU:do DEI:day DAI:die DOU:dough GO:go GOU:go GAI:guy KI:key KAU:cow KEI:kay
TU:two TI:tea TOU:toe TAI:tie SO:so SOU:so SAI:sigh SEI:say SU:sue ZU:zoo HI:he HU:who HAU:how HAI:high HEI:hey FI:fee FAI:fie FOU:foe
LI:lee LAI:lie LEI:lay LO:low LOU:low LU:loo RU:rue RAI:rye REI:ray RO:row ROU:row WI:we WAI:why WEI:way WO:woe
XI:she XU:shoe XOU:show XAI:shy YU:you YO:yo YA:yah YEI:yay
AM:am AN:an AT:at AS:as AZ:as AX:ash AD:add AK:ack AP:app IT:it IS:is IZ:is IN:in IF:if ON:on OF:of OD:odd OK:ock UP:up US:us UM:um EM:em EN:en ED:ed EG:egg
ALO:hello HELO:hello HALO:halo HOLA:hola
MAN:man MEN:men MUN:moon MIN:mean MEIN:main MAIN:mine MON:moan MOUN:moan NUN:noon NON:none NIN:nine NAIN:nine NEIM:name NOM:gnome NOUM:gnome HOM:home HOUM:home
MAT:mat MET:met MIT:meet MOT:moat MUT:moot MAD:mad MID:mid MOD:mode MUD:mood NOT:not NET:net NIT:neat NAT:gnat NUT:newt NED:need NID:need NOD:nod
SIT:sit SAT:sat SET:set SOT:sought SUT:suit SID:seed SAD:sad SED:said SAID:side SIM:seem SAM:same SOM:some SUM:sum SIN:seen SAN:sun SUN:soon SON:son SEM:seam
BAT:bat BET:bet BIT:beat BOT:boat BUT:boot BAD:bad BED:bed BID:bead BOD:bode BIN:bean BAN:ban BEN:ben BON:bone BUN:boon BAM:bam BIM:beam BOM:bomb BUM:boom
PAT:pat PET:pet PIT:pit POT:pot PUT:put PAN:pan PEN:pen PIN:pin PON:pawn PIK:peek POK:poke PAK:pack PIG:pig PEG:peg
TAM:tam TIM:team TOM:tom TOD:toad TAD:tad TED:ted TAN:tan TEN:ten TIN:teen TON:tone TUN:tune TAIM:time TAK:tack TIK:tick TOK:talk TUK:took
DAN:dan DEN:den DIN:dean DON:don DUN:dune DOG:dog DIG:dig DAG:dag DOT:dot DAT:that DEK:deck DOK:dock
KAT:cat KAN:can KEN:ken KIN:keen KON:cone KIT:kit KOT:coat KUT:coot KAD:cad KID:kid KOD:code KUD:could KAM:calm KIM:kim KOM:comb KUM:come KUL:cool KOL:coal KIL:kill KAL:call
GET:get GIT:git GOT:got GUT:good GOD:god GUD:good GAN:gan GIN:gin GON:gone GAM:game GUM:gum GOL:goal GIL:gill GAL:gal GOUL:goal
HAT:hat HET:het HIT:heat HOT:hot HUT:hoot HAM:ham HEM:hem HIM:him HUM:hum HAN:hand HEN:hen HIN:hin HON:hone HID:heed HAD:had HED:head HOD:hood HUD:hood HIL:heel HEL:hell HOL:hole HAL:hal HUL:who'll
FAT:fat FET:fate FIT:feet FOT:fought FUT:foot FAN:fan FEN:fen FIN:fin FON:phone FUN:fun FAM:fame FOM:foam FUD:food FID:feed FED:fed FAD:fad FIX:fish FIL:feel FEL:fell FOL:fall FAL:fall FUL:fool
LAT:lat LET:let LIT:lit LOT:lot LUT:loot LAD:lad LED:led LID:lid LOD:load LAM:lamb LEM:lem LIM:limb LOM:loam LUM:loom LIN:lean LAN:land LEN:len LON:loan LUN:loon LAK:lack LEK:leg LIK:leak LOK:lock LUK:look LAV:love LIV:leave LOV:love LUV:love LAIF:life
RAT:rat RET:red RIT:read ROT:rot RUT:root RAM:ram RIM:ream ROM:roam RUM:room RAN:ran REN:ren RIN:rain RON:ron RUN:rune RAD:rad RED:red RID:read ROD:road RUD:rude RAK:rack REK:wreck RIK:reek ROK:rock RUK:rook
VAN:van VIN:vin VON:von VOT:vote VET:vet VAT:vat VIM:vim VIL:veal VOL:vole VOM:vom
WAN:one WEN:when WIN:win WON:one WUN:wound WAT:what WET:wet WIT:wit WOT:what WUT:wood WAM:wham WIM:whim WOM:womb WAL:wall WEL:well WIL:will WOL:wall
ZAN:zan ZIN:zen ZON:zone ZUM:zoom ZIP:zip ZAP:zap ZIT:zit
XET:shed XIT:sheet XOT:shot XUT:shoot XAN:shan XIN:sheen XON:shone XUN:shun XAM:sham XIM:shim XEL:shell XOL:shawl XUL:school
YAN:yan YEN:yen YON:yawn YUN:yune YES:yes YET:yet YOT:yacht YAM:yam YUM:yum YAK:yak YOK:yolk YUK:yuck
MAK:make MEK:mek MIK:meek MOK:mock MUK:muck MIL:meal MAL:mall MOL:mole MEL:mel MUL:mule NIL:kneel NOL:knoll NUL:null
NEK:neck NOK:knock NIK:nick NAK:knack NUK:nook NIZ:knees NOZ:nose MIZ:miss MOS:moss MAS:mass MES:mess MUS:moose MUZ:muse MIS:miss
SIK:seek SAK:sack SEK:sec SOK:sock SIL:seal SEL:sell SOL:soul SAL:sal SIX:sheesh SAX:sash 
AMI:amy ANI:annie EMI:emmy ONI:only ALI:ali OLI:ollie ILI:eely UNI:uni ANA:anna EMA:emma IDA:ida ODA:oda
MANI:many MONI:money MAMI:mummy NANI:nanny TATA:tata TUTU:tutu BOBO:bobo DODO:dodo KOKO:coco NINI:nini LALA:lala LULU:lulu
DEIZI:daisy DEIZ:days DAIZ:dies DIZ:these MAI:my TEIK:take MEIK:make KEIK:cake LEIK:lake FEIK:fake BEIK:bake SEIK:sake WEIK:wake
XIP:ship XOP:shop XAP:shap FIP:fip SIP:sip SAP:sap SOP:sop MOP:mop MAP:map NAP:nap NIP:nip TOP:top TIP:tip TAP:tap DIP:dip LIP:lip LAP:lap RIP:rip RAP:rap HIP:hip HOP:hop KAP:cap KOP:cop KIP:keep BOP:bop BIP:beep GAP:gap
THEI:they HEILO:hello HELOU:hello HALOU:hello HALU:hallo`

const known = new Map()
for (const row of LEX.split(/\s+/)) {
  const [k, v] = row.split(':')
  if (!k || !v) continue
  if (!known.has(k)) known.set(k, v)
}
const KEYS = [...known.keys()]

const VOWEL_NEAR = { AO: 0.5, AE: 0.62, EI: 0.42, OU: 0.42, AU: 0.8, AI: 0.9, EO: 0.8, EU: 0.8, IU: 0.8, IO: 0.9 }
const PAIRS = { BP: 0.32, DT: 0.32, GK: 0.32, FV: 0.32, SZ: 0.32, SX: 0.48, FS: 0.6, MN: 0.5, LR: 0.42, MB: 0.56, ND: 0.56, DZ: 0.72, TS: 0.72, HF: 0.6, KH: 0.7, WU: 0.34, YI: 0.34, WV: 0.5, NL: 0.62, DL: 0.6, GD: 0.62, KT: 0.62, PT: 0.62, BD: 0.62, BG: 0.72, PK: 0.72 }
const isVowel = s => 'AEIOU'.includes(s)
const sub = (a, b) => {
  if (a === b) return 0
  const k = a < b ? a + b : b + a
  if (isVowel(a) && isVowel(b)) return VOWEL_NEAR[k] ?? 0.9
  if (PAIRS[k] !== undefined) return PAIRS[k]
  if (isVowel(a) !== isVowel(b)) return 1.1
  return 0.95
}
const insCost = s => (s === 'H' ? 0.4 : s === 'UH' || isVowel(s) ? 0.72 : s === 'NG' ? 0.5 : 0.78)

function editCost(a, b) {
  let prev = new Float32Array(b.length + 1)
  let cur = new Float32Array(b.length + 1)
  for (let j = 1; j <= b.length; j++) prev[j] = prev[j - 1] + insCost(b[j - 1])
  for (let i = 1; i <= a.length; i++) {
    cur[0] = prev[0] + insCost(a[i - 1])
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j - 1] + sub(a[i - 1], b[j - 1]), prev[j] + insCost(a[i - 1]), cur[j - 1] + insCost(b[j - 1]))
    }
    const t = prev
    prev = cur
    cur = t
  }
  return prev[b.length]
}

const LOWER = { A: 'ah', E: 'eh', I: 'ee', O: 'oh', U: 'oo', X: 'sh', NG: 'ng', UH: 'uh' }
const nonsense = sounds => sounds.map(s => LOWER[s] || s.toLowerCase()).join('')

// A sequence of heard sounds to the word the hall writes on the slate. Its `key`
// is the machine's own spelling, or null for a noise no one has a word for.
export function nearestWord(sounds) {
  if (!sounds.length) return { key: null, text: '', cost: 9, sounds }
  let best = null
  let bc = 1e9
  for (const key of KEYS) {
    const tokens = key.split('')
    if (Math.abs(tokens.length - sounds.length) > 2) continue
    const c = editCost(sounds, tokens) / Math.max(tokens.length, sounds.length)
    if (c < bc) {
      bc = c
      best = key
    }
  }
  if (!best || bc > 0.3) return { key: null, text: `"${nonsense(sounds)}"`, cost: bc, sounds }
  return { key: best, text: known.get(best), cost: bc, sounds }
}

// Slow speech arrives one sound at a time. A listener still hears the word in it: any run of
// fragments that spells a word it knows exactly is taken as that word, longest first.
export function rejoin(groups) {
  const out = []
  for (let i = 0; i < groups.length; i++) {
    const solid = groups[i].length >= 2 && known.has(groups[i].join(''))
    let taken = null
    if (!solid) {
      for (let j = Math.min(groups.length, i + 7); j > i + 1; j--) {
        const merged = groups.slice(i, j).flat()
        if (known.has(merged.join(''))) {
          taken = { merged, j }
          break
        }
      }
    }
    if (taken) {
      out.push(taken.merged)
      i = taken.j - 1
    } else out.push(groups[i])
  }
  return out
}

// In running speech a lone "ah" is the article the hall would write.
export const phraseOf = words => words.map(w => (words.length > 1 && w.key === 'A' ? 'a' : w.text)).join(' ')
