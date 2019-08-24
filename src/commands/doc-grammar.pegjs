Start
  = parts:Part* { return parts; }

Part
  = TaggedText
  / UntaggedText

TaggedText
  = tag:Tag &_ text:Text { return { type: 'block', tag, parts: text }; }
  / tag:Tag              { return { type: 'block', tag, parts: []   }; }

Tag
  = '@' tag:Identifier { return tag; }

Identifier
  = chars:[a-z]i+ { return chars.join(''); }

UntaggedText
  = text:Text { return { type: 'untagged', parts: text }; }

Text
  = parts:TextPart+ { return parts; }

TextPart
  = tagged:InlineTagged { return tagged; }
  / string:String       { return { type: 'text', value: string }; }

String
  = contents:StringContents+ { return contents.join(''); }

StringContents
  = !('@' / '{@') char:. { return char; }

InlineTagged
  = '{' tag:Tag '}'                    { return { type: 'inline', tag, value: ''   }; }
  / '{' tag:Tag &_ text:InlineText '}' { return { type: 'inline', tag, value: text }; }

InlineText
  = contents:InlineTextContents+ { return contents.join(''); }

InlineTextContents
  = !('}') char:. { return char; }

_
  = Space+

Space
  = [ \t\r\n]
