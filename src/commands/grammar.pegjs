{
  const formatter = options.formatter;
  const loc = () => formatter.formatLocation(location());
}

Start
  = _ command:Command _ { return [command]; }
  / Commands

Commands
  = _ "(" _ first:Command _ ")" _ rest:Commands? {
    return [first, ...(rest || [])];
  }

Command
  = name:Identifier args:Arguments? {
    return { type: 'command', name, args: args || [], loc: loc() };
  }

Arguments
  = _ head:Argument tail:Arguments? { return [head, ...(tail || [])]; }

Argument
  = name:Variable     { return { type: 'variable', name, loc: loc() }; }
  / value:Identifier  { return { type: 'value', value, loc: loc() }; }
  / value:Number      { return { type: 'value', value, loc: loc() }; }
  / value:String      { return { type: 'value', value, loc: loc() }; }
  / "(" _ command:Command _ ")" { return command; }

Variable
  = ":" name:Identifier { return name; }

Identifier
  = head:[a-z_]i tail:[a-z_0-9-]i* { return head + tail.join(''); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(''), 10); }

String
  = '"' contents:StringContents* '"' { return contents.join(''); }

StringContents
  = !('"' / '\\') char:. { return char; }
  / '\\' char:EscapeChar { return char; }

EscapeChar
  = '"'
  / '\\'

_
  = Filler*

Filler
  = [ \t\r\n]             // whitespace
  / ";" [^\r\n]* [\r\n]   // comment then line-feed
  / ";" [^\r\n]* EOF      // last comment without line-feed

EOF
  = !.
