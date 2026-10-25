// One storm night at the Lantern Hollow exchange, 22:00 to 05:00.
// Times are minutes after ten o'clock. Every call is data; the engine only
// knows lamps, plugs, rings and flags.

export const NIGHT_LENGTH = 420
export const NIGHT_START_HOUR = 22

export const JACKS = [
  { id: 'lighthouse', no: 1, name: 'Lighthouse', who: 'Keeper Orrin', x: 0.93 },
  { id: 'mill', no: 2, name: 'Mill', who: 'Hask, miller', x: 0.12 },
  { id: 'ferry', no: 3, name: 'Ferry House', who: 'Tull', x: 0.72 },
  { id: 'doctor', no: 4, name: 'Surgery', who: 'Dr. Vey', x: 0.36 },
  { id: 'farm', no: 5, name: 'Brennan Farm', short: 'Brennans', who: 'the Brennans', x: 0.82 },
  { id: 'constable', no: 6, name: 'Constable', who: 'Sgt. Pell', x: 0.44 },
  { id: 'church', no: 7, name: "St. Ide's", who: 'Fr. Amsel', x: 0.28 },
  { id: 'inn', no: 8, name: 'The Lamb', who: 'Edda Quill', x: 0.52 },
  { id: 'station', no: 9, name: 'Station', who: 'Mr. Cawley', x: 0.05 },
  { id: 'school', no: 10, name: 'Schoolhouse', who: 'Miss Ines', x: 0.2 },
  { id: 'wire', no: 11, name: 'Wire Office', who: 'night clerk', x: 0.6 },
  { id: 'marrow', no: 12, name: 'Low Street 4', who: 'Widow Marrow', x: 0.66 }
]

export const JACK = Object.fromEntries(JACKS.map(j => [j.id, j]))

export const PAIRS = [
  { id: 0, name: 'oxblood', color: '#a3362b' },
  { id: 1, name: 'bottle', color: '#3f7a4f' },
  { id: 2, name: 'indigo', color: '#3b4f93' },
  { id: 3, name: 'ochre', color: '#c08a2c' }
]

// What a subscriber says when the operator rings the wrong house.
export const GRUMBLES = {
  lighthouse: "Wrong light, operator. I've a lamp to keep.",
  mill: 'Hask. No, not for me. Mind your cords.',
  ferry: "Ferry. Who? No. I'm not your man.",
  doctor: "Surgery. That's not my patient, operator.",
  farm: "Brennans'. Not us. We're waiting on our own call.",
  constable: "Constable. You've rung the wrong door, operator.",
  church: "St. Ide's. Bless you, but no.",
  inn: "The Lamb, we're shut. Wrong line, love.",
  station: 'Station. Not for the station, that.',
  school: "Schoolhouse. I think you've crossed a wire.",
  wire: 'Wire office. Nothing for us, operator.',
  marrow: 'Marrow. Well! Not for me, but do tell me who it was for.'
}

// What you can overhear. `pins` are the jacks the fact points at when a
// caller's request needs it.
export const FACTS = {
  elope: { text: 'Miss Ines leaves on the 4:10. Two travelling, quietly.', pins: ['station'] },
  key: { text: "Tull at the Ferry House has the mill's sluice key.", pins: ['ferry'] },
  lamp: { text: "If the ferry wire fails, the Keeper can flash Tull with the lighthouse lamp.", pins: ['lighthouse'] },
  tobias: { text: 'The second traveller is Tobias Quill, son of the Lamb.', pins: ['school'] },
  cross: { text: 'Dr. Vey can only reach the farm by the ferry.', pins: ['ferry'] },
  bell: { text: "St. Ide's bell tells the low streets to climb the hill.", pins: ['church'] }
}

const line = (who, text, fact) => (fact ? { who, text, fact } : { who, text })

export const EVENTS = {
  'ines-station': {
    at: 0,
    from: 'school',
    request: 'The station, please. And... quietly.',
    patience: 34,
    routes: [{
      to: 'station',
      convo: [
        line('school', 'Mr. Cawley, does the four-ten still run tonight?'),
        line('station', "If the hill line holds, miss. Who's travelling?"),
        line('school', 'Two of us. Keep it off the board, please. We go on the four-ten.', 'elope'),
        line('station', 'Quiet as a cat on a fence, miss.')
      ],
      effects: { flags: ['inesBooked'] }
    }]
  },

  'keeper-mill': {
    at: 16,
    from: 'lighthouse',
    request: "Mill, please. The river's past the third mark.",
    patience: 30,
    routes: [{
      to: 'mill',
      convo: [
        line('lighthouse', "Hask. She's at the third mark and climbing. Open your sluice."),
        line('mill', "I can't, Orrin. Lent the big iron key to Tull for the regatta gates. It's at the ferry.", 'key'),
        line('lighthouse', 'Then wake Tull. And if his wire goes in this, I can still flash him from the lamp.', 'lamp'),
        line('mill', "I'll ring through when my boots are on.")
      ],
      effects: { spawn: [{ id: 'miller-key', delay: 14 }] }
    }],
    onMiss: { spawn: [{ id: 'keeper-mill-again', delay: 20 }] }
  },

  'keeper-mill-again': {
    from: 'lighthouse',
    request: "The mill. Again. The river won't wait for you either, operator.",
    patience: 26,
    routes: [{
      to: 'mill',
      convo: [
        line('lighthouse', 'Hask. Sluice. Now.'),
        line('mill', 'Tull has the key, Orrin. Ferry House.', 'key'),
        line('lighthouse', 'Then get him. If his wire is down, I have the lamp.', 'lamp')
      ],
      effects: { spawn: [{ id: 'miller-key', delay: 8 }] }
    }]
  },

  'marrow-gossip': {
    at: 34,
    from: 'marrow',
    request: "Mrs. Quill at the Lamb, dear. I've news that won't keep.",
    patience: 30,
    routes: [{
      to: 'inn',
      convo: [
        line('marrow', 'Edda, your Tobias was at the schoolhouse gate tonight with a carpet bag.', 'tobias'),
        line('inn', "He never would. He'd tell his mother."),
        line('marrow', "And Tull walked off with Hask's great iron key at noon, bold as brass.", 'key'),
        line('inn', 'Go to bed, Agnes.'),
        line('marrow', "I'm eighty-one, Edda. I've no time left for sleeping.")
      ]
    }]
  },

  'farm-doctor': {
    at: 48,
    from: 'farm',
    request: "The doctor! It's Nell. It's too early, it's too early.",
    patience: 26,
    routes: [{
      to: 'doctor',
      convo: [
        line('farm', "Doctor, it's Nell. The baby's coming. Tonight."),
        line('doctor', "Mill Lane bridge is under. I'll have to cross by the ferry.", 'cross'),
        line('farm', 'Then cross! Please.'),
        line('doctor', "Keep her warm. Keep her talking. I'm coming.")
      ],
      effects: { flags: ['doctorCalled'], spawn: [{ id: 'doctor-ferry', delay: 5 }] }
    }],
    onMiss: { spawn: [{ id: 'farm-doctor-again', delay: 12 }] }
  },

  'farm-doctor-again': {
    from: 'farm',
    request: 'Please. The doctor. Please.',
    patience: 22,
    routes: [{
      to: 'doctor',
      convo: [
        line('farm', "It's Nell. It's now."),
        line('doctor', "The bridge is gone. I'll come by the ferry if Tull will take me.", 'cross')
      ],
      effects: { flags: ['doctorCalled'], spawn: [{ id: 'doctor-ferry', delay: 5 }] }
    }],
    onMiss: { flags: ['noDoctor'], spawn: [{ id: 'farm-marrow', delay: 150 }] }
  },

  'miller-key': {
    at: 128,
    from: 'mill',
    request: "Get me whoever's holding my sluice key.",
    hints: ['key', 'lamp'],
    patience: 30,
    routes: [
      {
        to: 'ferry',
        convo: [
          line('mill', 'Tull! The sluice key, man!'),
          line('ferry', "On the nail by my door. I'll run it up the hill myself."),
          line('mill', 'Run, then.')
        ],
        effects: { timers: [{ delay: 22, flag: 'sluiceOpen', text: 'the mill sluice is open. the river is pouring off the town.' }] }
      },
      {
        to: 'lighthouse',
        convo: [
          line('mill', "Orrin, I need Tull and I can't raise him."),
          line('lighthouse', "Then he'll have it by lamp. Three long, three short. Give me a quarter hour.")
        ],
        effects: { timers: [{ delay: 45, flag: 'sluiceOpen', text: 'tull read the lamp and ran the key up. the mill sluice is open.' }] }
      }
    ],
    onMiss: { flags: ['millGaveUp'] }
  },

  'doctor-ferry': {
    from: 'doctor',
    request: 'The ferry house. I have to get across.',
    hints: ['cross', 'lamp'],
    patience: 28,
    routes: [
      {
        to: 'ferry',
        convo: [
          line('doctor', "Tull, I need the boat. Brennans'. A baby."),
          line('ferry', "River's ugly, doctor. Be at the landing in ten."),
          line('doctor', "I'll be there in five.")
        ],
        effects: { flags: ['doctorCrossed'], spawn: [{ id: 'farm-news', delay: 140 }] }
      },
      {
        to: 'lighthouse',
        convo: [
          line('doctor', "Orrin, the ferry won't answer and there's a child coming."),
          line('lighthouse', "His wire's down, not him. I'll lamp him to the landing for you.")
        ],
        effects: { flags: ['doctorCrossed'], spawn: [{ id: 'farm-news', delay: 160 }] }
      }
    ],
    onMiss: { flags: ['noDoctor'], spawn: [{ id: 'farm-marrow', delay: 130 }] }
  },

  'station-wire': {
    at: 86,
    from: 'station',
    request: 'Wire office. Night timetable check. Nothing urgent.',
    patience: 34,
    routes: [{
      to: 'wire',
      convo: [
        line('station', 'Anything on the line from Corley?'),
        line('wire', 'Only rain, Mr. Cawley.'),
        line('station', "Rain'll do.")
      ]
    }]
  },

  'church-marrow': {
    at: 112,
    from: 'church',
    request: 'Low Street, number four. Mrs. Marrow.',
    patience: 32,
    routes: [{
      to: 'marrow',
      convo: [
        line('church', "Agnes, you're low by the water. When you hear the bell, come up the hill.", 'bell'),
        line('marrow', 'I hear everything, Father. I shall hear a bell.')
      ]
    }]
  },

  'constable-ask': {
    at: 160,
    from: 'constable',
    request: "Operator. Edda Quill's been in about her boy. Who's been ringing the station tonight?",
    patience: 26,
    choices: [
      {
        id: 'tell',
        label: 'The schoolhouse, sergeant.',
        needs: 'connected:ines-station',
        reply: 'The schoolhouse. Thank you, operator.',
        effects: { flags: ['toldConstable'], spawn: [{ id: 'constable-station', delay: 6 }] }
      },
      {
        id: 'lie',
        label: 'Nobody, sergeant. Quiet night.',
        reply: 'Quiet. In this. Hm.',
        effects: { flags: ['keptSecret'] }
      },
      {
        id: 'refuse',
        label: "The exchange doesn't say.",
        reply: "Doesn't it. Then I'll ask the station myself.",
        effects: { flags: ['keptSecret'], spawn: [{ id: 'constable-station', delay: 34 }] }
      }
    ],
    onMiss: { spawn: [{ id: 'constable-station', delay: 34 }] }
  },

  'constable-station': {
    from: 'constable',
    request: 'The station, operator. Now.',
    patience: 24,
    routes: [{
      to: 'station',
      convo: [
        line('constable', 'Cawley. The schoolteacher and the Quill boy. Hold them at the platform.'),
        line('station', '...If they come, sergeant.'),
        line('constable', "They'll come.")
      ],
      effects: { flags: ['coupleStopped'] }
    }],
    onMiss: { flags: ['constableGaveUp'] }
  },

  'keeper-bell': {
    at: 232,
    from: 'lighthouse',
    when: flags => !flags.sluiceOpen,
    request: "St. Ide's. Somebody has to ring for the low streets.",
    hints: ['bell'],
    patience: 26,
    routes: [{
      to: 'church',
      convo: [
        line('lighthouse', 'Father, fifth mark by three. Ring them up the hill.'),
        line('church', "I'll ring till my arms go.")
      ],
      effects: { flags: ['bellRung'], text: "st. ide's is ringing. lamps climb the hill out of the low streets." }
    }],
    onMiss: { flags: ['noBell'] }
  },

  'keeper-falling': {
    at: 232,
    from: 'lighthouse',
    when: flags => flags.sluiceOpen,
    request: 'The mill, operator. Good news for once.',
    patience: 30,
    routes: [{
      to: 'mill',
      convo: [
        line('lighthouse', "She's falling, Hask. A hand's width since midnight."),
        line('mill', 'Tell Tull I want my key back.')
      ]
    }]
  },

  'telegraph-corley': {
    at: 268,
    from: 'wire',
    request: 'Urgent, for the stationmaster. Corley bridge is out.',
    patience: 24,
    routes: [{
      to: 'station',
      convo: [
        line('wire', 'Cawley, Corley bridge is gone. Hold the four-ten.'),
        line('station', 'Then she goes by the hill line or not at all. Hill line it is.')
      ],
      effects: { flags: ['trainRerouted'] }
    }],
    onMiss: { flags: ['trainStranded'] }
  },

  'quill-son': {
    at: 286,
    from: 'inn',
    request: 'Get me wherever my son is.',
    hints: ['tobias', 'elope'],
    patience: 28,
    routes: [
      {
        to: 'school',
        when: flags => !flags.coupleStopped,
        convo: [
          line('inn', 'Ines. Is he with you?'),
          line('school', "He is, Edda. We're going."),
          line('inn', '...Then take the good umbrella. And write.'),
          line('school', 'Every week.')
        ],
        effects: { flags: ['blessing'] }
      },
      {
        to: 'station',
        when: flags => !!flags.coupleStopped,
        convo: [
          line('inn', 'Cawley. Is my boy there?'),
          line('station', "On the bench with the schoolteacher, Mrs. Quill. Sergeant's orders."),
          line('inn', "Then tell the sergeant his orders can wait for my coat. Let them on the train.")
        ],
        effects: { flags: ['blessing', 'motherCame'] }
      }
    ]
  },

  'farm-news': {
    from: 'farm',
    request: 'Anyone awake. Put me through to anyone at all.',
    patience: 40,
    routes: ['inn', 'church', 'marrow', 'station', 'school', 'lighthouse', 'constable', 'mill', 'doctor', 'ferry', 'wire'].map(to => ({
      to,
      convo: [
        line('farm', "It's a girl. Nell's naming her Wren."),
        line(to, '...Wren. Good. That is good.')
      ],
      effects: { flags: ['wren'] }
    }))
  },

  'farm-marrow': {
    from: 'farm',
    when: flags => !!flags.noDoctor,
    request: 'Agnes Marrow. Low Street. Please.',
    patience: 34,
    routes: [{
      to: 'marrow',
      convo: [
        line('farm', "Agnes, the doctor never came. Nell's had it on her own. Will you come?"),
        line('marrow', "I've been coming since the lamps went out, Tom. Put the kettle on.")
      ],
      effects: { flags: ['marrowCame', 'wren'] }
    }]
  },

  'marrow-dawn': {
    at: 376,
    from: 'marrow',
    request: 'The lighthouse, dear. I want to know if it is morning.',
    patience: 34,
    routes: [{
      to: 'lighthouse',
      convo: [
        line('marrow', 'Orrin, is it morning yet?'),
        line('lighthouse', "Near enough, Agnes. The water's turned.")
      ]
    }]
  }
}

// Storm events that change the topology of the board.
export const WORLD = [
  { at: 86, down: 'ferry', text: 'lightning on the ferry wire. the ferry house jack is dead.' },
  { at: 262, down: 'mill', when: flags => !flags.sluiceOpen, text: 'the mill line has gone under the water.' },
  { at: 300, up: 'ferry', text: 'the ferry wire hums again. somebody climbed a pole in the rain.' }
]
