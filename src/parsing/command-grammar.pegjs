Start
  = _ command:Command _ { return [command]; }
  / Commands

Commands
  = _ "(" _ first:Command _ ")" _ rest:Commands? {
    return [first, ...(rest || [])];
  }

Command
  = name:Identifier params:Parameters? {
    return { type: 'command', name, params: params || [] };
  }

Parameters
  = _ head:Parameter tail:Parameters? { return [head, ...(tail || [])]; }

Parameter
  = name:Variable     { return { type: 'variable', name }; }
  / value:Identifier  { return { type: 'value', value }; }
  / value:Number      { return { type: 'value', value }; }
  / value:String      { return { type: 'value', value }; }
  / "(" _ command:Command _ ")" { return command; }

Variable
  = ":" name:Identifier { return name; }

Identifier
  = head:[a-z_]i tail:[a-z_0-9-]i* { return head + (tail || []).join(''); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(''), 10); }

String
  = '"' contents:[^"]* '"' { return (contents || []).join(''); }

_
  = Filler*

Filler
  = [ \t\r\n]             // whitespace
  / ";" [^\r\n]* [\r\n]   // comment then line-feed
  / ";" [^\r\n]* EOF      // last comment without line-feed

EOF
  = !.
