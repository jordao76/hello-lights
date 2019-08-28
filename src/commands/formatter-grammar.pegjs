{
  const flatten = arr => arr.reduce((acc, val) => acc.concat(val), []);
}

Start
  = filler1:_ command:Command filler2:_ {
    return [
      ...filler1,
      ...command,
      ...filler2
    ];
  }
  / Commands

Commands
  = filler1:_ "(" filler2:_ first:Command filler3:_ ")" filler4:_ rest:Commands? {
    return [
      ...filler1,
      { type: 'parens', text: '(' },
      ...filler2,
      ...first,
      ...filler3,
      { type: 'parens', text: ')' },
      ...filler4,
      ...flatten(rest || [])
    ];
  }

Command
  = name:Identifier args:Arguments? {
    return [
      { type: 'command', text: name },
      ...flatten(args || [])
    ];
  }

Arguments
  = filler:_ head:Argument tail:Arguments? {
    return [
      ...filler,
      ...head,
      ...flatten(tail || [])
    ];
  }

Argument
  = text:Variable    { return [{ type: 'variable', text }]; }
  / text:Identifier  { return [{ type: 'identifier', text }]; }
  / text:Number      { return [{ type: 'number', text }]; }
  / text:String      { return [{ type: 'string', text }]; }
  / "(" filler1:_ command:Command filler2:_ ")" {
    return [
      { type: 'parens', text: '(' },
      ...filler1,
      ...command,
      ...filler2,
      { type: 'parens', text: ')' }
    ]
  }

Variable
  = ":" name:Identifier { return ":" + name; }

Identifier
  = head:[a-z_]i tail:[a-z_0-9-]i* { return head + tail.join(''); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(''), 10); }

String
  = '"' contents:StringContents* '"' { return '"' + contents.join('') + '"'; }

StringContents
  = !('"' / '\\') char:. { return char; }
  / '\\' char:EscapeChar { return char; }

EscapeChar
  = '"'
  / '\\'

_
  = Filler*

Filler
  = space:[ \t\r\n]+                    { return { type: 'space',   text: space.join('') }; }
  / ";" comment:[^\r\n]* newline:[\r\n] { return { type: 'comment', text: ';' + comment.join('') + newline }; }
  / ";" comment:[^\r\n]* EOF            { return { type: 'comment', text: ';' + comment.join('') }; }

EOF
  = !.
