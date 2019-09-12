; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(interpreter) { interpreter.execute(`
;------------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  @example
  (lights off off on)"
  (do
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);interpreter.execute(`;-----------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  @example
  (flash red 500)"
  (do
    (toggle :light) (pause :ms)
    (toggle :light) (pause :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define blink
  "Flashes a light for the given number of times and duration for each time:
  @example
  (blink 10 yellow 500)"
  (repeat :times
    (flash :light :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define twinkle
  "Flashes a light for the given duration forever:
  @example
  (twinkle green 500)"
  (loop
    (flash :light :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define cycle
  "Blinks each light in turn for the given duration and number of times,
  repeating forever; starts with red:
  @example
  (cycle 2 500)"
  (loop
    (blink :times red    :ms)
    (blink :times yellow :ms)
    (blink :times green  :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define jointly
  "Flashes all lights together forever:
  @example
  (jointly 500)"
  (loop
    (lights on  on  on)  (pause :ms)
    (lights off off off) (pause :ms)))

;`);interpreter.execute(`;-----------------------------------------------------

(define heartbeat
  "Heartbeat pattern:
  @example
  (heartbeat red)"
  (loop
    (blink 2 :light 250)
    (pause 350)))

;`);interpreter.execute(`;-----------------------------------------------------

(define pulse
  "Single pulse pattern:
  @example
  (pulse red)"
  (loop
    (toggle :light)
    (pause 300)
    (toggle :light)
    (pause 1500)))

;`);interpreter.execute(`;-----------------------------------------------------

(define count
  "Count a number of times repeatedly:
  @example
  (count 7 red)"
  (loop
    (blink :times :light 200)
    (pause 800)))

;`);interpreter.execute(`;-----------------------------------------------------

(define sos
  "SOS distress signal morse code pattern:
  @example
  (sos red)"
  (loop
    (morse :light "SOS")))

;`);interpreter.execute(`;-----------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);interpreter.execute(`;-----------------------------------------------------

(define up
  "Go up with the given duration:
  @example
  (up 200)"
  (do
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);interpreter.execute(`;-----------------------------------------------------

(define down
  "Go down with the given duration:
  @example
  (down 200)"
  (do
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle green)  (pause :ms) (toggle green)))

;`);interpreter.execute(`;-----------------------------------------------------

(define bounce
  "Bounce with the given duration:
  @example
  (bounce 500)"
  (loop
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)))

;`);interpreter.execute(`;-----------------------------------------------------

(define activity
  "Time an activity from green (go) to yellow (attention) to red (stop).
  Blinks green before starting for 5 seconds, keeps green on for the {@code green-ms}
  duration, turns yellow on for the {@code yellow-ms} duration, then blinks yellow
  for {@code attention-ms} duration before turning on red (stop).
  E.g. for an activity that takes one minute with green for 40s, yellow for 10s,
  then yellow blinking for 10s:
  @example
  (activity
    (seconds 40)
    (seconds 10)
    (seconds 10))"
  (do
    (blink 4 green 500)
    (turn green on)
    (pause :green-ms)
    (lights off on off)
    (pause :yellow-ms)
    (turn yellow off)
    (timeout :attention-ms (twinkle yellow 500))
    (lights on off off)))

;`); }//-----------------------------------------------------------------------
