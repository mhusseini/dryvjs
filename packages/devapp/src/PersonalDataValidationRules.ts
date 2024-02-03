import type { PersonalData } from '@/models'
import type { DryvValidationRuleSet } from 'dryvue'

export const personalDataValidationRules: DryvValidationRuleSet<PersonalData> = {
  validators: {
    anrede: [
      {
        annotations: {
          required: true
        },
        validate: function ($m) {
          return !/\S/.test($m.anrede || '')
            ? {
                status: 'error',
                text: 'Du entscheidest, was du angibst. Und ob überhaupt!',
                group: null
              }
            : null
        }
      }
    ],
    vorname: [
      {
        annotations: {
          required: true
        },
        validate: function ($m) {
          return !/\S/.test($m.vorname || '')
            ? {
                status: 'error',
                text: 'Wie dürfen wir dich ansprechen?',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return /[^\u0020-\u00ff]/.test($m.vorname)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        validate: function ($m) {
          return $m.vorname.toLowerCase().indexOf('familie') >= 0
            ? {
                status: 'error',
                text: 'Bitte trage deinen tatsächlichen Vornamen ein',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return /^(\s*[0-9 \-'./]+\s*)+$/i.test($m.vorname)
            ? {
                status: 'error',
                text: 'Bitte check nochmal den Vornamen. Er darf nicht nur aus Zahlen oder Sonderzeichen bestehen.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, session) {
          return session.dryv
            .callServer?.('/_v/cuacbsqfo', 'POST', {
              vorname: $m.vorname
            })
            .then(function ($r) {
              return session.dryv.handleResult?.(session, $m, 'vorname', null, $r)
            })
            .then(function ($p21) {
              return $p21.errorMessage
            })
        }
      }
    ],
    nachname: [
      {
        annotations: {
          required: true
        },
        validate: function ($m) {
          return !/\S/.test($m.nachname || '')
            ? {
                status: 'error',
                text: 'Wie heißt du mit Nachnamen?',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return /[^\u0020-\u00ff]/.test($m.nachname)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        validate: function ($m) {
          return /^(\s*[0-9 \-'./]+\s*)+$/i.test($m.nachname)
            ? {
                status: 'error',
                text: 'Bitte check nochmal den Nachnamen. Er darf nicht nur aus Zahlen oder Sonderzeichen bestehen.',
                group: null
              }
            : null
        }
      },
      {
        async: true,
        validate: function ($m, session) {
          return session.dryv
            .callServer('/_v/cflhzdnn4', 'POST', {
              nachname: $m.nachname
            })
            .then(function ($r) {
              return session.dryv.handleResult(session, $m, 'nachname', null, $r)
            })
            .then(function ($p23) {
              return $p23?.errorMessage
            })
        }
      }
    ],
    geburtsdatum: [
      {
        annotations: {
          required: true
        },
        validate: function ($m) {
          return !$m.geburtsdatum
            ? {
                status: 'error',
                text: 'Wann wurdest du geboren?',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return !$m.geburtsdatum ||
            /^\d{4}-(02-(0[1-9]|[12]\d)|(0[469]|11)-(0[1-9]|[12]\d|30)|(0[13578]|1[02])-(0[1-9]|[12]\d|3[01]))$/.test(
              $m.geburtsdatum.toString()
            )
            ? null
            : {
                status: 'error',
                text: 'Deine Angabe ist ungültig. Check bitte nochmal dein Geburtstdatum.',
                group: null
              }
        }
      },
      {
        validate: function ($m) {
          return !$m.geburtsdatum || /\d{4}-\d{2}-\d{2}/.test($m.geburtsdatum.toString())
            ? null
            : {
                status: 'error',
                text: 'Gib dein Geburtsdatum bitte im Format TT.MM.JJJJ an.',
                group: null
              }
        }
      },
      {
        validate: function ($m, session) {
          return $m.geburtsdatum &&
            session.dryv.valueOfDate($m.geburtsdatum, 'de-DE', 'DD.MM.YYYY HH:mm:ss') >
              session.dryv.valueOfDate('28.11.2005 00:00:00', 'de-DE', 'DD.MM.YYYY HH:mm:ss')
            ? {
                status: 'error',
                text: 'Achso, du bist noch nicht volljährig? Dann darfst du hier im Internet leider keinen Vertrag mit uns abschließen. Aber ruf uns doch unter 0221–27 11 7777 an. Dann können wir besprechen, welche Möglichkeiten es gibt.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, session) {
          return $m.geburtsdatum &&
            session.dryv.valueOfDate($m.geburtsdatum, 'de-DE', 'DD.MM.YYYY HH:mm:ss') <
              session.dryv.valueOfDate('28.11.1903 00:00:00', 'de-DE', 'DD.MM.YYYY HH:mm:ss')
            ? {
                status: 'error',
                text: 'Check bitte nochmal dein Geburtsdatum.',
                group: null
              }
            : null
        }
      }
    ],
    emailAdresse: [
      {
        annotations: {
          required: true
        },
        validate: function ($m) {
          return !/\S/.test($m.emailAdresse || '')
            ? {
                status: 'error',
                text: 'Bitte gib hier deine E-Mail-Adresse an.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return /[^\u0020-\u00ff]/.test($m.emailAdresse)
            ? 'Bitte nutzen Sie nur die Zeichen aus dem westeurop\u0026#228;ischen Zeichensatz.'
            : null
        }
      },
      {
        validate: function ($m) {
          return $m.emailAdresse.length < 6
            ? {
                status: 'error',
                text: 'Check bitte nochmal deine E-Mail-Adresse. Sie muss mindestens 6 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m) {
          return $m.emailAdresse.length > 100
            ? {
                status: 'error',
                text: 'Check bitte nochmal deine E-Mail-Adresse. Sie darf maximal 100 Zeichen lang sein.',
                group: null
              }
            : null
        }
      },
      {
        validate: function ($m, session) {
          return /\S/.test($m.emailAdresse || '')
            ? session.dryv
                .callServer('/_v/cmrtdlmkp', 'POST', {
                  emailAdresse: $m.emailAdresse
                })
                .then(function ($r) {
                  return session.dryv.handleResult(session, $m, 'emailAdresse', null, $r)
                })
            : null
        }
      },
      {
        async: true,
        validate: function ($m, session) {
          return /\S/.test($m.emailAdresse || '')
            ? session.dryv
                .callServer('/_v/cynrfjria', 'POST', {
                  emailAdresse: $m.emailAdresse
                })
                .then(function ($r) {
                  return session.dryv.handleResult(session, $m, 'emailAdresse', null, $r)
                })
                .then(function ($p28) {
                  return $p28?.errorMessage
                })
            : null
        }
      }
    ],
    telefonNummer: [
      {
        async: true,
        validate: function ($m, session) {
          return session.dryv
            .callServer('/_v/cgxah0tvz', 'POST', {
              telefonNummer: $m.telefonNummer
            })
            .then(function ($r) {
              return session.dryv.handleResult(session, $m, 'telefonNummer', null, $r)
            })
        }
      }
    ],
    werberVertragsnummer: [
      {
        async: true,
        validate: function ($m, session) {
          return !/\S/.test($m.werberVertragsnummer || '')
            ? null
            : session.dryv
                .callServer('/_v/cy4959vs8', 'POST', {
                  werberVertragsnummer: $m.werberVertragsnummer
                })
                .then(function ($r) {
                  return session.dryv.handleResult(session, $m, 'werberVertragsnummer', null, $r)
                })
                .then(function ($p35) {
                  return $p35
                    ? null
                    : {
                        type: 'error',
                        text: 'Wie schön, dass du geworben wurdest. Allerdings kann die Vertragsnummer nicht stimmen. Check das doch bitte nochmal. Wahrscheinlich ist nur ein Tippfehler drin.',
                        group: null
                      }
                })
        }
      }
    ]
  },
  disablers: {},
  parameters: {
    maxgeburtstag: '28.11.2005 00:00:00',
    mingeburtstag: '28.11.1903 00:00:00',
    istAuftragMitSpedition: false,
    istGewerbekunde: false
  }
}
