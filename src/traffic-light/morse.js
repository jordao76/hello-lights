/* eslint no-multi-spaces: 0 */

const {isLight} = require('./validation');
const {isString} = require('../parsing/validation');
const {pause} = require('../parsing/base-commands');

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
  ' ': ' ',
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

/**
 * Encodes text to morse code.
 * @package
 * @param {string} text - Text to encode.
 * @returns {string[]} Encoded text as an array of morse encoded letters,
 *   with dots (.) and dashes (-).
 * @example
 *   let encodedText = encode('SOS'); // => ['...','---','...']
 */
function encode(text) {
  let code = text.toLowerCase().split('').map(c => morseCode[c] || ' ');
  while (code[0] === ' ') code.shift();
  while (code[code.length - 1] === ' ') code.pop();
  return code;
}

/**
 * Time-codes a morse code array to on/off durations.
 * @package
 * @param {string[]} encoded - Morse encoded letters array. Output of 'encode'.
 * @returns {number[]} Time coded morse code, an array where each element is a
 *   number indicating how many time-units the signal should be on or off.
 *   Alternates between on and off starting with 'on'.
 * @example
 *   let timecodedMorse = timecode(['...','---','...']); // => [1,1,...]
 */
function timecode(encoded) {
  let res = [];
  encoded.forEach((coded, codedIndex) => {
    // 'coded' is a single coded letter, e.g '.-' for A
    let isLastCoded = codedIndex === encoded.length - 1;
    let morseChars = coded.split(''); // e.g. ['.','-'] for A
    morseChars.forEach((morseChar, morseCharIndex) => {
      let isLastMorseChar = morseCharIndex === morseChars.length - 1;
      // on
      if (morseChar === '.') res.push(DOT_SIGNAL);
      else if (morseChar === '-') res.push(DASH_SIGNAL);
      // off
      if (morseChar === ' ') { res.pop(); res.push(WORD_GAP); } // eslint-disable-line brace-style
      else if (!isLastMorseChar) res.push(INTER_LETTER_GAP);
      else if (!isLastCoded) res.push(LETTER_GAP);
    });

    if (isLastCoded) res.push(END_OF_INPUT_GAP);
  });
  return res;
}

//////////////////////////////////////////////////////////////////////////////

async function morse({tl, ct}, [light, text]) {
  if (ct.isCancelled) return;

  let times = timecode(encode(text));

  tl[light].turnOff(); // start as off
  for (let i = 0; i < times.length; ++i) {
    if (ct.isCancelled) break;
    tl[light].toggle();
    await pause({ct}, [times[i] * TIME_UNIT]);
  }
}

morse.paramNames = ['light', 'text'];
morse.validation = [isLight, isString];
morse.doc = {
  name: 'morse',
  desc: 'Morse code pattern with the given light and text:\n' +
        '(morse green "hello-lights")'
};

//////////////////////////////////////////////////////////////////////////////

function defineCommands(cp) {
  cp.add('morse', morse);
}

//////////////////////////////////////////////////////////////////////////////

module.exports = {encode, timecode, morse, defineCommands};
