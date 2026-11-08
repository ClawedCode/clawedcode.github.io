// The village, its century, and the five days the cat is awake for.
// Everything here is data; engine.js decides what it does.

export const GERMINATED = 1786
export const SAVE_THRESHOLD = 5

export const SPOTS = {
  roots: {
    label: 'the roots',
    verb: 'bury it in the roots',
    rule: 'Earth keeps silver and glass. Paper and seeds turn to soil, though an acorn here becomes a tree.'
  },
  bark: {
    label: 'the bark',
    verb: 'press it into the bark',
    rule: 'The tree grows over whatever you press into a crack. Nobody gets it back until the wood is cut open.'
  },
  hollow: {
    label: 'the hollow',
    verb: 'tuck it in the hollow',
    rule: 'Dry, and the right height for a child. Children climb to it.'
  },
  fork: {
    label: 'the fork',
    verb: 'leave it in the fork',
    rule: 'Rain and sparks reach the fork. Magpies take anything that shines up to the crown.'
  },
  crown: {
    label: 'the crown',
    verb: 'carry it up to the crown',
    rule: 'Only a cat or a magpie gets up here. Safe until the tree comes down.'
  }
}

export const SPOT_ORDER = ['roots', 'bark', 'hollow', 'fork', 'crown']

export const OBJECTS = {
  acorn: {
    name: 'an acorn',
    short: 'acorn',
    paper: false,
    shiny: false,
    seed: true,
    desc: 'One of this tree\'s own. It would rather be in the ground.'
  },
  sixpence: {
    name: 'the bent sixpence',
    short: 'sixpence',
    paper: false,
    shiny: true,
    proof: true,
    desc: 'Bent double between Abel\'s teeth, a sailor\'s love token. Scratched on the back: A+H 1846.'
  },
  letter: {
    name: 'Abel\'s letter',
    short: 'letter',
    paper: true,
    shiny: false,
    proof: true,
    desc: '"Wait for me under the oak. I will be back by the Michaelmas after next. A. Wren, 29 Sept 1846."'
  },
  marble: {
    name: 'Tom\'s blue marble',
    short: 'marble',
    paper: false,
    shiny: true,
    desc: 'A blue glass alley with a white twist. His best one.'
  },
  fieldcard: {
    name: 'Tom\'s field postcard',
    short: 'postcard',
    paper: true,
    shiny: false,
    proof: true,
    desc: 'Army Form A2042. Every line crossed out except "I am quite well." Dated 30 Oct 1917.'
  }
}

// Older-than-the-house relics: things a previous century left under the kerb.
export const relicOf = kind => ({
  ...OBJECTS[kind],
  name: `${OBJECTS[kind].name}, older`,
  short: `old ${OBJECTS[kind].short}`,
  desc: `${OBJECTS[kind].desc} It was already in the roots when the tree was young. You don't remember putting it there.`
})

// Real British dry years, which the rings remember as thin bands.
export const DROUGHTS = [1800, 1826, 1868, 1893, 1911, 1921, 1934, 1947, 1959, 1976, 1990, 1995, 2003]
export const WET_YEARS = [1816, 1852, 1872, 1903, 1912, 1960, 2000]

export const ERAS = [
  {
    id: 'michaelmas',
    year: 1846,
    title: 'Michaelmas, 1846',
    season: 'autumn',
    sky: [
      ['#f3c9a2', '#c9d6cf'], ['#f2d9b4', '#b9d3d6'], ['#e5e6cf', '#a8cbd8'], ['#e3e7d4', '#9fc6d9'],
      ['#e9dcc0', '#9bb8cf'], ['#9aa5ac', '#6f7f8f'], ['#c78e6b', '#4b4f6b']
    ],
    hours: ['dawn', 'first light', 'morning', 'noon', 'afternoon', 'rain', 'dusk'],
    intro: 'The oak is sixty years old. Two people are under it before the sun is.',
    people: {
      hannah: { name: 'Hannah Pell', age: 18, look: 'girl', family: true },
      abel: { name: 'Abel Wren', age: 20, look: 'sailor' },
      josiah: { name: 'Josiah Pell', age: 51, look: 'father' }
    },
    presence: [
      ['hannah', 'abel'], ['hannah', 'abel'], ['hannah'], ['hannah', 'josiah'], ['josiah'], [], []
    ],
    almanac: [
      { hour: 1, icon: 'heart', text: 'Abel bends a sixpence for Hannah. They carve A+H into the bark.' },
      { hour: 1, icon: 'letter', text: 'Abel hides a letter in the fork.' },
      { hour: 2, icon: 'leave', text: 'Abel runs for the Bristol coach.' },
      { hour: 4, icon: 'drop', text: 'Hannah\'s father comes. She drops the sixpence in the grass.' },
      { hour: 5, icon: 'pond', text: 'He throws whatever is in the grass into the millpond.' },
      { hour: 6, icon: 'rain', text: 'Rain soaks the fork.' }
    ],
    start: [
      { hour: 1, text: 'Abel Wren bends a silver sixpence between his teeth and puts it in Hannah Pell\'s hand. With his knife they cut A+H into the bark.', mark: 'carving', give: { sixpence: 'hannah' }, loose: ['acorn'] },
      { hour: 3, text: 'Abel is gone. Hannah waits under the tree. She hasn\'t found the letter.' },
      { hour: 4, text: 'Her father comes across the green. Hannah lets the sixpence fall into the grass.', drop: { hannah: ['sixpence'] } },
      { hour: 6, text: 'Rain comes in off the river.' },
      { hour: 7, text: 'Dusk. The green is empty.' }
    ],
    end: [
      { hour: 1, text: 'While Hannah looks at the carving, Abel slips a folded letter into the fork.', place: { letter: 'fork' } },
      { hour: 2, text: 'Abel kisses her and runs for the Bristol coach. His ship sails on Thursday.' },
      { hour: 4, text: 'Josiah takes Hannah home by the arm.' },
      { hour: 5, sweep: 'pond', text: 'Josiah comes back and kicks through the grass.' },
      { hour: 6, soak: ['fork'], text: 'The rain runs down the trunk and into the fork.' }
    ],
    needs: [
      {
        id: 'promise',
        who: 'hannah',
        by: 3,
        label: 'Hannah needs a reason to wait, before her father comes',
        accepts: ['letter'],
        guard: 'josiah',
        met: {
          letter: 'Hannah reads it twice, then puts it inside her dress. She will wait. (Abel comes back in 1848, and marries her under this tree.)'
        },
        miss: 'Hannah never learns what Abel meant to say. In the spring she marries Daniel Cole from the mill.'
      }
    ]
  },
  {
    id: 'jubilee',
    year: 1887,
    title: 'Jubilee Night, 1887',
    season: 'summer',
    sky: [
      ['#e7a46a', '#5c5f8a'], ['#c97556', '#3f416c'], ['#7d4b5c', '#26284a'], ['#3a2c45', '#151832'],
      ['#2a2140', '#11132a'], ['#1d1832', '#0c0e22'], ['#14122a', '#08091a']
    ],
    hours: ['dusk', 'lamps', 'bonfire', 'sparks', 'songs', 'crowd', 'midnight'],
    intro: 'A hundred and one years. A gale in 1881 tore off a limb and left a dry hollow. Tonight the village lights a bonfire for the Queen\'s fifty years.',
    people: {
      hannah: { name: 'Hannah {sur}', age: 59, look: 'widow', family: true },
      tom: { name: 'Tom {sur}', age: 9, look: 'boy', family: true },
      ezra: { name: 'Ezra Mott', age: 44, look: 'smith' }
    },
    presence: [
      ['ezra', 'tom'], ['tom', 'hannah'], ['tom', 'hannah'], ['hannah', 'ezra', 'tom'], ['hannah', 'tom'], ['ezra'], []
    ],
    almanac: [
      { hour: 1, icon: 'shoe', text: 'Ezra nails a horseshoe to the trunk.' },
      { hour: 2, icon: 'drop', text: 'Tom loses his marble in the grass.' },
      { hour: 4, icon: 'fire', text: 'Sparks burn the bark and the fork.' },
      { hour: 5, icon: 'heart', text: 'Hannah wants to tell Tom where he comes from.' },
      { hour: 6, icon: 'pond', text: 'The crowd tramples the grass.' }
    ],
    start: [
      { hour: 1, text: 'Ezra Mott nails a horseshoe to the trunk, open end up, for the Queen\'s luck.', mark: 'horseshoe', give: { marble: 'tom' } },
      { hour: 2, text: 'Tom {sur} drops his blue marble somewhere in the dark grass.', drop: { tom: ['marble'] } },
      { hour: 3, text: 'They light the bonfire on the green. Tom is still on his knees, looking.' },
      { hour: 5, text: 'Hannah sits Tom down in the roots and looks for a way to begin.', tell: 'hannah' },
      { hour: 7, text: 'Midnight. The bonfire is a red eye.' }
    ],
    end: [
      { hour: 4, burn: ['bark', 'fork'], mark: 'firescar', text: 'The wind turns. Sparks pour into the oak and the east side of the bark scorches.' },
      { hour: 6, sweep: 'trample', text: 'The crowd goes home across the green.' }
    ],
    needs: [
      {
        id: 'tell',
        who: 'hannah',
        by: 5,
        label: 'Hannah wants something to show Tom',
        accepts: ['sixpence', 'letter'],
        passTo: 'tom',
        met: {
          sixpence: 'Hannah holds the bent sixpence up to the fire. "A sailor gave me this under that tree." She gives it to Tom to keep.',
          letter: 'Hannah reads Abel\'s letter aloud by the fire, every word. Then she folds it into Tom\'s pocket. "Yours now."'
        },
        miss: 'Hannah tells Tom it\'s only a tree and takes him home.'
      },
      {
        id: 'marble',
        who: 'tom',
        by: 5,
        label: 'Tom wants his marble back',
        accepts: ['marble'],
        met: {
          marble: 'Tom closes his fist on the marble and doesn\'t cry any more. He will carry it for thirty years.'
        },
        miss: 'Tom goes home without his marble.'
      }
    ]
  },
  {
    id: 'peace',
    year: 1919,
    title: 'Peace Day, 1919',
    season: 'summer',
    sky: [
      ['#e4e1d3', '#b6c2c4'], ['#e8e3cf', '#aebfc4'], ['#ecebd9', '#a9c0cb'], ['#d3d4c6', '#9aa7ad'],
      ['#e1d6bf', '#a2b0b7'], ['#e3c39a', '#8a93a6'], ['#b9806b', '#4c4f68']
    ],
    hours: ['morning', 'bells', 'laying', 'silence', 'tea', 'evening', 'dusk'],
    intro: 'A hundred and thirty-three years. The war ended last November. Tom {sur} did not come home from it.',
    people: {
      ada: { name: 'Ada {sur}', age: 31, look: 'widow', family: true },
      lily: { name: 'Lily {sur}', age: 6, look: 'girl-small', family: true },
      vicar: { name: 'Rev. Hale', age: 60, look: 'vicar' }
    },
    presence: [
      ['vicar'], ['lily', 'ada'], ['ada', 'lily', 'vicar'], ['ada', 'lily', 'vicar'], ['ada', 'lily'], ['vicar'], []
    ],
    almanac: [
      { hour: 1, icon: 'cross', text: 'A stone cross seals the roots.' },
      { hour: 2, icon: 'climb', text: 'Lily climbs to the hollow and takes what she finds.' },
      { hour: 3, icon: 'lay', text: 'Ada lays Tom\'s things at the cross.' },
      { hour: 4, icon: 'bell', text: 'Two minutes\' silence.' },
      { hour: 5, icon: 'heart', text: 'Ada wants something of Tom to give Lily.' },
      { hour: 6, icon: 'pond', text: 'The verger clears the cross.' }
    ],
    start: [
      { hour: 1, seal: 'roots', text: 'At first light a stone cross is set into the roots, for the eleven men who didn\'t come back. Tom {sur} is the ninth name.' },
      { hour: 2, climb: 'lily', text: 'Lily {sur} climbs up the trunk to the hollow while her mother isn\'t looking.' },
      { hour: 3, lay: true, text: 'Ada lays Tom\'s last field postcard at the foot of the cross.' },
      { hour: 4, text: 'Two minutes\' silence. Even the rooks stop.' },
      { hour: 7, text: 'Dusk. Somebody has left the bunting up.' }
    ],
    end: [
      { hour: 6, sweep: 'vestry', text: 'The verger gathers what was left at the cross and takes it into the church.' }
    ],
    needs: [
      {
        id: 'father',
        who: 'ada',
        alsoWho: ['lily'],
        by: 5,
        label: 'Ada wants Lily to have something of her father',
        accepts: ['marble', 'sixpence', 'letter', 'fieldcard'],
        passTo: 'lily',
        met: {
          marble: 'Ada knows the marble at once. "Your dad had this in his fist in every photograph." Lily won\'t put it down all day.',
          sixpence: 'Ada turns the sixpence over: A+H 1846. "Your great-great-grandmother\'s. Your dad wore it on a string in France." She ties it round Lily\'s neck.',
          letter: 'Ada reads the old letter to Lily under the tree. "Wait for me under the oak." Lily asks if Dad wrote it. Ada says, in a way.',
          fieldcard: 'Ada gives Lily the postcard. "I am quite well." Lily learns to read on it that winter.'
        },
        miss: 'Ada takes Lily home with nothing in her hands.'
      }
    ]
  },
  {
    id: 'bypass',
    year: 1966,
    title: 'The Bypass, 1966',
    season: 'autumn',
    sky: [
      ['#e9d7b0', '#8fb0b8'], ['#ecd6a6', '#86a9b4'], ['#e8cc93', '#7c9fac'], ['#e2bf85', '#7896a4'],
      ['#d9a46f', '#6c8597'], ['#c27b58', '#4e5c78'], ['#874e4c', '#2b3049']
    ],
    hours: ['morning', 'digger', 'petition', 'lunch', 'argument', 'last light', 'four o\'clock'],
    intro: 'A hundred and eighty years. The county wants a bypass, and the oak stands where it should go.',
    people: {
      lily: { name: 'Lily {sur}', age: 53, look: 'woman', family: true },
      pryce: { name: 'Mr Pryce', age: 38, look: 'surveyor' },
      crew: { name: 'the saw crew', age: 0, look: 'crew' }
    },
    presence: [
      ['pryce'], ['pryce', 'crew'], ['pryce', 'lily'], ['pryce', 'lily'], ['pryce', 'lily'], ['pryce'], ['crew', 'pryce']
    ],
    almanac: [
      { hour: 1, icon: 'paint', text: 'A white ring is painted round the trunk.' },
      { hour: 2, icon: 'dig', text: 'A digger opens the roots.' },
      { hour: 3, icon: 'lay', text: 'Lily brings a petition, and whatever her family kept.' },
      { hour: 6, icon: 'pond', text: 'The crew scrape the verge clean.' },
      { hour: 2, icon: 'proof', text: 'Mr Pryce writes down anything that proves the tree mattered: a date, a name, a letter.' },
      { hour: 7, icon: 'saw', text: `Mr Pryce decides. He needs ${SAVE_THRESHOLD} reasons: stories told so far, plus proofs.` }
    ],
    start: [
      { hour: 1, mark: 'paint', text: 'Mr Pryce from the county paints a white ring round the trunk at chest height. "Nothing personal."' },
      { hour: 2, unseal: 'roots', text: 'A digger bites into the roots to move the stone cross.' },
      { hour: 3, show: 'lily', text: 'Lily {sur} crosses the green with a petition of two hundred names.' },
      { hour: 7, verdict: true, text: 'Four o\'clock.' }
    ],
    end: [
      { hour: 6, sweep: 'verge', text: 'The crew rake the verge clean for the morning.' }
    ],
    needs: []
  },
  {
    id: 'storm',
    year: 2008,
    title: 'The Storm, 2008',
    season: 'winter',
    sky: [
      ['#c9cfd6', '#7d8a99'], ['#b8c0cb', '#6c7b8d'], ['#a9b2bf', '#5d6b7e'], ['#8f99a8', '#4a5669'],
      ['#6c7586', '#343e51'], ['#3f4658', '#1b2132']
    ],
    hours: ['afternoon', 'the hollow', 'visitor', 'tea', 'wind', 'storm'],
    intro: 'Two hundred and twenty-two years. Houses fill the fields behind the green. The oak\'s heart has been rotting since the gale of 1881.',
    people: {
      maya: { name: 'Maya Okafor', age: 11, look: 'kid' },
      lily: { name: 'Lily {sur}', age: 95, look: 'chair', family: true }
    },
    presence: [
      ['maya'], ['maya'], ['maya', 'lily'], ['maya', 'lily'], ['maya'], []
    ],
    almanac: [
      { hour: 2, icon: 'climb', text: 'Maya climbs to the hollow.' },
      { hour: 3, icon: 'lay', text: 'Lily is wheeled out with what her family kept. It sits on her lap until the wind.' },
      { hour: 5, icon: 'wind', text: 'The wind gets up.' },
      { hour: 4, icon: 'pond', text: 'Lily goes home. Whatever is still on her lap goes with her.' },
      { hour: 6, icon: 'saw', text: 'The storm brings the oak down. Whatever is in the cat\'s mouth, it keeps for the next oak.' }
    ],
    start: [
      { hour: 1, text: 'Maya Okafor, eleven, new on the estate, sits in the roots with her headphones in. Nobody here knows her yet.' },
      { hour: 2, climb: 'maya', text: 'Maya climbs to the hollow, because nobody told her not to.' },
      { hour: 3, lap: 'lily', text: 'A carer wheels Lily {sur}, ninety-five, across the green. She wants to see the tree once more.' },
      { hour: 5, text: 'The wind gets up. Branches start to talk.' },
      { hour: 6, text: 'The storm comes in. Maya\'s mother calls her home.' }
    ],
    end: [
      { hour: 4, lapHome: 'lily', text: 'The carer turns Lily\'s chair for home.' },
      { hour: 6, fall: true, text: 'Just after nine the oak lets go of the ground, roots and all.' }
    ],
    needs: [
      {
        id: 'belong',
        who: 'maya',
        alsoWho: ['lily'],
        passTo: 'maya',
        by: 5,
        label: 'Maya needs a place in this story',
        accepts: ['marble', 'sixpence', 'letter', 'fieldcard', 'acorn'],
        met: {
          marble: 'Maya holds the marble up to the grey sky. Lily laughs: "That was my dad\'s." She tells Maya about Tom for an hour.',
          sixpence: 'Maya reads A+H 1846 off the sixpence. Lily tells her the whole thing, Abel and Hannah and the coach to Bristol.',
          letter: 'Maya reads Abel\'s letter out loud, slowly, and gets "Michaelmas" wrong. Lily corrects her and starts to cry.',
          fieldcard: 'Maya asks what A2042 means. Lily tells her about Tom, and the eleven names on the cross.',
          acorn: 'Maya pockets the acorn without knowing why.'
        },
        miss: 'Maya goes home before the storm, still new.'
      }
    ]
  }
]

// What a person does with something the cat gives them that they don't need.
export const STRANGER = {
  josiah: { fate: 'lost', text: 'Josiah Pell looks at {it} and throws it into the millpond.' },
  abel: { fate: 'keep:hannah', text: 'Abel laughs and gives {it} to Hannah.' },
  ezra: { fate: 'lost', text: 'Ezra pockets {it} and forgets it by morning.' },
  vicar: { fate: 'lost', text: 'Rev. Hale takes {it} into the church for safe keeping. It is never seen again.' },
  crew: { fate: 'lost', text: 'One of the crew flicks {it} into the brash pile.' },
  pryce: { fate: 'archive', text: 'Mr Pryce looks at {it} and puts it in his folder.' }
}

export const PRYCE_PROOF = {
  sixpence: 'Pryce turns the sixpence to the light: A+H 1846. The same letters are scarred into the bark above his head. He writes that down.',
  letter: 'Pryce reads the letter\'s date twice. "This tree was a meeting place in 1846." He writes that down.',
  fieldcard: 'Pryce looks from the postcard to the eleven names on the cross, and stops talking about drainage.',
  marble: 'Pryce rolls the marble in his palm. "Very nice." It doesn\'t go in the report.',
  acorn: 'Pryce frowns at the acorn. It doesn\'t go in the report.'
}

export const KIND_ANGLE = { sixpence: -0.55, letter: -0.95, marble: -0.2, fieldcard: 0.25, acorn: 0.7 }
