import type { DryvValidationRuleSet } from '@softwareproduction/dryvjs'
import type { Lieferadresse, PersonalData } from '@/models'

export const lieferadresseValidationRules: DryvValidationRuleSet<Lieferadresse> = {
  validators: {
    'rechnungsadresse.anrede': [
      {
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !$m.rechnungsadresse.anrede
            ? {
                type: 'error',
                text: 'Du entscheidest, was du angibst. Und ob überhaupt! ',
                group: null
              }
            : null
        }
      }
    ],
    'rechnungsadresse.vorname': [
      {
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.vorname || '')
            ? {
                type: 'error',
                text: 'Wie dürfen wir dich ansprechen?',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.rechnungsadresse.vorname)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.rechnungsadresse.vorname.toLowerCase().indexOf('familie') >= 0
            ? {
                type: 'error',
                text: 'Bitte trage deinen tatsächlichen Vornamen ein',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /^(\s*[0-9]+\s*)+$/i.test($m.rechnungsadresse.vorname)
            ? {
                type: 'error',
                text: 'Bitte check nochmal den Vornamen. Er darf nicht nur aus Zahlen bestehen.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return $ctx.dryv
            .callServer('/_v/c5nx5bp24', 'POST', {
              rechnungsadresse: {
                vorname: $m.rechnungsadresse.vorname
              }
            })
            .then(function ($r) {
              return $ctx.dryv.handleResult($ctx, $m, 'rechnungsadresse.vorname', null, $r)
            })
            .then(function ($p6) {
              return ($p6 || {}).errorMessage
            })
        }
      }
    ],
    'rechnungsadresse.nachname': [
      {
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.nachname || '')
            ? {
                type: 'error',
                text: 'Wie heißt du mit Nachnamen?',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.rechnungsadresse.nachname)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /^(\s*[0-9]+\s*)+$/i.test($m.rechnungsadresse.nachname)
            ? {
                type: 'error',
                text: 'Bitte check nochmal den Nachnamen. Er darf nicht nur aus Zahlen bestehen.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return $ctx.dryv
            .callServer('/_v/caoibsfqn', 'POST', {
              rechnungsadresse: {
                nachname: $m.rechnungsadresse.nachname
              }
            })
            .then(function ($r) {
              return $ctx.dryv.handleResult($ctx, $m, 'rechnungsadresse.nachname', null, $r)
            })
            .then(function ($p8) {
              return ($p8 || {}).errorMessage
            })
        }
      }
    ],
    'lieferadresse.strasse': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: ['lieferadresse.hausnummer', 'lieferadresse.ort', 'lieferadresse.postleitzahl'],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.strasse || '') ||
            !/\S/.test($m.lieferadresse.hausnummer || '') ||
            !/\S/.test($m.lieferadresse.ort || '') ||
            !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.lieferadresse.strasse.length > 50
            ? {
                type: 'error',
                text: 'Check bitte nochmal die Schreibweise deiner Straße. Sie darf maximal 50 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? null
            : $ctx.dryv
                .callServer('/_v/c51r4lw8l', 'POST', {
                  lieferadresse: {
                    postleitzahl: $m.lieferadresse.postleitzahl,
                    ort: $m.lieferadresse.ort,
                    strasse: $m.lieferadresse.strasse
                  }
                })
                .then(function ($r) {
                  return $ctx.dryv.handleResult($ctx, $m, 'lieferadresse.strasse', null, $r)
                })
        }
      }
    ],
    'rechnungsadresse.strasse': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: [
          'rechnungsadresse.hausnummer',
          'rechnungsadresse.ort',
          'rechnungsadresse.postleitzahl'
        ],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.strasse || '') ||
            !/\S/.test($m.rechnungsadresse.hausnummer || '') ||
            !/\S/.test($m.rechnungsadresse.ort || '') ||
            !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.rechnungsadresse.strasse.length > 50
            ? {
                type: 'error',
                text: 'Check bitte nochmal die Schreibweise deiner Straße. Sie darf maximal 50 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? null
            : $ctx.dryv
                .callServer('/_v/ce8cfb52i', 'POST', {
                  rechnungsadresse: {
                    postleitzahl: $m.rechnungsadresse.postleitzahl,
                    ort: $m.rechnungsadresse.ort,
                    strasse: $m.rechnungsadresse.strasse
                  }
                })
                .then(function ($r) {
                  return $ctx.dryv.handleResult($ctx, $m, 'rechnungsadresse.strasse', null, $r)
                })
        }
      }
    ],
    'lieferadresse.hausnummer': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: ['lieferadresse.strasse', 'lieferadresse.ort', 'lieferadresse.postleitzahl'],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.strasse || '') ||
            !/\S/.test($m.lieferadresse.hausnummer || '') ||
            !/\S/.test($m.lieferadresse.ort || '') ||
            !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /^\s*[0-9][\w×\-\.\/]*\s*$/i.test($m.lieferadresse.hausnummer)
            ? null
            : {
                type: 'error',
                text: 'Check bitte nochmal die Schreibweise deiner Hausnummer. Neben Ziffern und Buchstaben kannst du auch einen Bindestrich, Punkt oder Schrägstrich benutzen.',
                group: null
              }
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.lieferadresse.hausnummer.length > 9
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Hausnummer (max. 9 Zeichen).',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.lieferadresse.hausnummer)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      }
    ],
    'rechnungsadresse.hausnummer': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: [
          'rechnungsadresse.strasse',
          'rechnungsadresse.ort',
          'rechnungsadresse.postleitzahl'
        ],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.strasse || '') ||
            !/\S/.test($m.rechnungsadresse.hausnummer || '') ||
            !/\S/.test($m.rechnungsadresse.ort || '') ||
            !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /^\s*[0-9][\w×\-\.\/]*\s*$/i.test($m.rechnungsadresse.hausnummer)
            ? null
            : {
                type: 'error',
                text: 'Check bitte nochmal die Schreibweise deiner Hausnummer. Neben Ziffern und Buchstaben kannst du auch einen Bindestrich, Punkt oder Schrägstrich benutzen.',
                group: null
              }
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.rechnungsadresse.hausnummer.length > 9
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Hausnummer (max. 9 Zeichen).',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.rechnungsadresse.hausnummer)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      }
    ],
    'lieferadresse.ort': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: [
          'lieferadresse.strasse',
          'lieferadresse.hausnummer',
          'lieferadresse.postleitzahl'
        ],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.strasse || '') ||
            !/\S/.test($m.lieferadresse.hausnummer || '') ||
            !/\S/.test($m.lieferadresse.ort || '') ||
            !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.ort || '')
            ? {
                type: 'error',
                text: 'Bitte gib hier den Ort an.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.lieferadresse.ort.length < 2
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Angabe für den Ort. Sie muss mindestens 2 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.lieferadresse.ort.length > 40
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Angabe für den Ort. Sie darf maximal 40 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.lieferadresse.ort)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? null
            : $ctx.dryv
                .callServer('/_v/cdihst5tv', 'POST', {
                  lieferadresse: {
                    postleitzahl: $m.lieferadresse.postleitzahl,
                    ort: $m.lieferadresse.ort
                  }
                })
                .then(function ($r) {
                  return $ctx.dryv.handleResult($ctx, $m, 'lieferadresse.ort', null, $r)
                })
        }
      }
    ],
    'rechnungsadresse.ort': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: [
          'rechnungsadresse.strasse',
          'rechnungsadresse.hausnummer',
          'rechnungsadresse.postleitzahl'
        ],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.strasse || '') ||
            !/\S/.test($m.rechnungsadresse.hausnummer || '') ||
            !/\S/.test($m.rechnungsadresse.ort || '') ||
            !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.ort || '')
            ? {
                type: 'error',
                text: 'Bitte gib hier den Ort an.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.rechnungsadresse.ort.length < 2
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Angabe für den Ort. Sie muss mindestens 2 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return $m.rechnungsadresse.ort.length > 40
            ? {
                type: 'error',
                text: 'Check bitte nochmal deine Angabe für den Ort. Sie darf maximal 40 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /[^\u0020-\u00ff]/.test($m.rechnungsadresse.ort)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? null
            : $ctx.dryv
                .callServer('/_v/cqb3y92mg', 'POST', {
                  rechnungsadresse: {
                    postleitzahl: $m.rechnungsadresse.postleitzahl,
                    ort: $m.rechnungsadresse.ort
                  }
                })
                .then(function ($r) {
                  return $ctx.dryv.handleResult($ctx, $m, 'rechnungsadresse.ort', null, $r)
                })
        }
      }
    ],
    'lieferadresse.postleitzahl': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: ['lieferadresse.strasse', 'lieferadresse.hausnummer', 'lieferadresse.ort'],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.lieferadresse.strasse || '') ||
            !/\S/.test($m.lieferadresse.hausnummer || '') ||
            !/\S/.test($m.lieferadresse.ort || '') ||
            !/\S/.test($m.lieferadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /\d{5,5}/.test($m.lieferadresse.postleitzahl)
            ? null
            : {
                type: 'error',
                text: 'Deine Postleitzahl muss aus 5 Ziffern bestehen.',
                group: null
              }
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return $ctx.dryv
            .callServer('/_v/ccee7q6to', 'POST', {
              lieferadresse: {
                postleitzahl: $m.lieferadresse.postleitzahl
              }
            })
            .then(function ($r) {
              return $ctx.dryv.handleResult($ctx, $m, 'lieferadresse.postleitzahl', null, $r)
            })
        }
      }
    ],
    'rechnungsadresse.postleitzahl': [
      {
        group: 'strasse-hausnummer-ort-plz',
        related: [
          'rechnungsadresse.strasse',
          'rechnungsadresse.hausnummer',
          'rechnungsadresse.ort'
        ],
        annotations: {
          required: true
        },
        validate: function ($m, $ctx) {
          return !/\S/.test($m.rechnungsadresse.strasse || '') ||
            !/\S/.test($m.rechnungsadresse.hausnummer || '') ||
            !/\S/.test($m.rechnungsadresse.ort || '') ||
            !/\S/.test($m.rechnungsadresse.postleitzahl || '')
            ? 'Bitte achte darauf, dass deine Adresse vollständig ist.'
            : null
        }
      },
      {
        validate: function ($m, $ctx) {
          return /\d{5,5}/.test($m.rechnungsadresse.postleitzahl)
            ? null
            : {
                type: 'error',
                text: 'Deine Postleitzahl muss aus 5 Ziffern bestehen.',
                group: null
              }
        }
      },
      {
        async: true,
        validate: function ($m, $ctx) {
          return $ctx.dryv
            .callServer('/_v/cnv78guqd', 'POST', {
              rechnungsadresse: {
                postleitzahl: $m.rechnungsadresse.postleitzahl
              }
            })
            .then(function ($r) {
              return $ctx.dryv.handleResult($ctx, $m, 'rechnungsadresse.postleitzahl', null, $r)
            })
        }
      }
    ]
  },
  disablers: {
    rechnungsadresse: [
      {
        validate: function ($m, $ctx) {
          return !$m.abweichendeRechnungsadresse
        }
      }
    ]
  },
  parameters: {}
}
