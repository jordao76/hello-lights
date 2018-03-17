Start
  =       _ command:Command _       { return command; }
  / _ "(" _ command:Command _ ")" _ { return command; }

Command
  = name:Identifier params:Parameters? {
    return { type: 'command', name, params: params || [] };
  }

Parameters
  = _ head:Parameter tail:Parameters? { return [head, ...(tail || [])]; }

Parameter
  = name:Variable    { return { type: 'variable', name }; }
  / value:Identifier  { return { type: 'value', value }; }
  / value:Number      { return { type: 'value', value }; }
  / "(" _ command:Command _ ")" { return command; }

Variable
  = ":" name:Identifier { return name; }

Identifier
  = head:[a-z_]i tail:[a-z_0-9]i* { return head + (tail || []).join(''); }

Number
  = digits:[0-9]+ { return parseInt(digits.join(''), 10); }

_ "Whitespace"
  = [ \n\t\r]*