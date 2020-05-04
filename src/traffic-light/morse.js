/* eslint no-multi-spaces: 0 */

const {isLight} = require('./validation');
const {isString} = require('../commands/validation');
const {pause} = require('../commands/base-commands');
const {intersperse, flatten} = require('./utils');

//////////////////////////////////////////////////////////////////////////////

// ref: https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1677-1-200910-I!!PDF-E.pdf [PDF]

const TIME_UNIT = 110; // in ms
const
  DOT_SIGNAL = 1,
  DASH_SIGNAL = 3,
  INTER_LETTER_GAP = 1,
  LETTER_GAP = 3,
  WORD_GAP = 7,
  END_OF_INPUT_GAP = 7;

const morseCode = {
  // Letters
  'a': '.-',    'i': '..',   'r': '.-.',
  'b': '-...',  'j': '.---', 's': '...',
  'c': '-.-.',  'k': '-.-',  't': '-',
  'd': '-..',   'l': '.-..', 'u': '..-',
  'e': '.',     'm': '--',   'v': '...-',
  'é': '..-..', 'n': '-.',   'w': '.--',
  'f': '..-.',  'o': '---',  'x': '-..-',
  'g': '--.',   'p': '.--.', 'y': '-.--',
  'h': '....',  'q': '--.-', 'z': '--..',
  // Figures
  '1': '.----', '6': '-....',
  '2': '..---', '7': '--...',
  '3': '...--', '8': '---..',
  '4': '....-', '9': '----.',
  '5': '.....', '0': '-----',
  // Punctuation marks
  '.': '.-.-.-',
  ',': '--..--',
  ':': '---...',
  '?': '..--..',
  '’': '.----.', "'": '.----.',
  '–': '-....-', '-': '-....-', '−': '-....-',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '“': '.-..-.', '”': '.-..-.', '"': '.-..-.',
  '=': '-...-',
  '+': '.-.-.',
  '×': '-..-',
  '@': '.--.-.'
  // Miscellaneous signs
  /*
    Understood ...-.
    Error ........
    Invitation to transmit -.-
    Wait .-...
    End of work ...-.-
    Starting signal (to precede every transmission) -.-.-
  */
};

//////////////////////////////////////////////////////////////////////////////

function timecodeSignal(signal) {
  if (signal === '.') return DOT_SIGNAL;
  if (signal === '-') return DASH_SIGNAL;
}

function timecodeLetter(letter) {             // '.-'
  let signals = letter.split('');             // ['.', '-']
  let code = signals.map(timecodeSignal);     // [1, 3]
  return intersperse(INTER_LETTER_GAP, code); // [1, 1, 3]
}

function timecodeWord(word) {               // ['.-', '.-']
  let codes = word.map(timecodeLetter);     // [[1, 1, 3], [1, 1, 3]]
  codes = intersperse([LETTER_GAP], codes); // [[1, 1, 3], [3], [1, 1, 3]]
  return flatten(codes);                    // [1, 1, 3, 3, 1, 1, 3]
}

function timecodePhrase(phrase) {         // [['.-'], ['.-']]
  let codes = phrase.map(timecodeWord);   // [[1, 1, 3], [1, 1, 3]]
  codes = intersperse([WORD_GAP], codes); // [[1, 1, 3], [7], [1, 1, 3]]
  return flatten(codes);                  // [1, 1, 3, 7, 1, 1, 3]
}

function encodeWord(word) {
  return word                // 'aãa'
    .split('')               // ['a','ã','a']
    .map(c => morseCode[c])  // ['.-',undefined,'.-']
    .filter(c => !!c);       // ['.-','.-']
}

function timecodeText(text) {
  let phrase = text              // ' A A'
    .toLowerCase()               // ' a a'
    .split(/\s+/)                // ['', 'a', 'a']
    .filter(w => !!w)            // ['a', 'a']
    .map(encodeWord);            // [['.-'], ['.-']]
  return timecodePhrase(phrase)  // [1, 1, 3, 7, 1, 1, 3]
    .concat([END_OF_INPUT_GAP]); // [1, 1, 3, 7, 1, 1, 3, 7]
}

//////////////////////////////////////////////////////////////////////////////

async function morse(ctx, [light, text]) {
  const {tl, ct} = ctx;
  if (ct.isCancelled) return;
  const times = timecodeText(text);
  tl[light].turnOff(); // start as 'off'
  for (let i = 0; i < times.length; ++i) {
    if (ct.isCancelled) break;
    tl[light].toggle();
    await pause(ctx, [times[i] * TIME_UNIT]);
  }
}

morse.meta = {
  name: 'morse',
  params: [
    { name: 'light', validate: isLight },
    { name: 'text', validate: isString }
  ],
  desc: `
    Morse code pattern with the given light and text.
    @example
    (morse green "hello-lights")`
};

//////////////////////////////////////////////////////////////////////////////

function defineCommands(interpreter) {
  interpreter.add('morse', morse);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {
  // morse-utils
  timecodeSignal,
  timecodeLetter,
  timecodeWord,
  timecodePhrase,
  encodeWord,
  timecodeText,
  // morse core
  morse,
  defineCommands
};
