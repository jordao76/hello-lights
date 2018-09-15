; // This file is a JavaScript file. It has the cljs extension just to render
; // as Clojure (or ClojureScript).
; // The commands defined here are NOT Clojure, they just look good
; // rendered as such.
; module.exports = function(cp) { cp.execute(`
;---------------------------------------------------------------------------

(define lights
  "Set the lights to the given values (on or off):
  (lights off off on)"
  (run
    (turn red    :red)
    (turn yellow :yellow)
    (turn green  :green)))

;`);cp.execute(`;-----------------------------------------------------------

(define flash
  "Flashes a light for the given duration.
  Toggle, wait, toggle back, wait again:
  (flash red 500)"
  (run
    (toggle :light) (pause :ms)
    (toggle :light) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define blink
  "Flashes a light for the given number of times and duration for each time:
  (blink 10 yellow 500)"
  (repeat :times
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define twinkle
  "Flashes a light for the given duration forever:
  (twinkle green 500)"
  (loop
    (flash :light :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define cycle
  "Blinks each light in turn for the given duration and number of times,
  repeating forever; starts with red:
  (cycle 2 500)"
  (loop
    (blink :times red    :ms)
    (blink :times yellow :ms)
    (blink :times green  :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define jointly
  "Flashes all lights together forever:
  (jointly 500)"
  (loop
    (lights on  on  on)  (pause :ms)
    (lights off off off) (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define heartbeat
  "Heartbeat pattern: (heartbeat red)"
  (loop
    (blink 2 :light 250)
    (pause 350)))

;`);cp.execute(`;-----------------------------------------------------------

(define pulse
  "Single pulse pattern: (pulse red)"
  (loop
    (toggle :light)
    (pause 300)
    (toggle :light)
    (pause 1500)))

;`);cp.execute(`;-----------------------------------------------------------

(define count
  "Count a number of times repeatedly: (count 7 red)"
  (loop
    (blink :times :light 200)
    (pause 800)))

;`);cp.execute(`;-----------------------------------------------------------

(define sos
  "SOS distress signal morse code pattern:
  (sos red)"
  (loop
    (blink 3 :light 150)
    (blink 2 :light 250)
    (toggle :light)
    (pause 250)
    (toggle :light)
    (pause 150)
    (blink 3 :light 150)
    (pause 700)))

;`);cp.execute(`;-----------------------------------------------------------

(define danger
  "Twinkle red with 400ms flashes."
  (twinkle red 400))

;`);cp.execute(`;-----------------------------------------------------------

(define up
  "Go up with the given duration:
  (up 200)"
  (run
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)))

;`);cp.execute(`;-----------------------------------------------------------

(define down
  "Go down with the given duration:
  (down 200)"
  (run
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle green)  (pause :ms) (toggle green)))

;`);cp.execute(`;-----------------------------------------------------------

(define bounce
  "Bounce with the given duration:
  (bounce 500)"
  (loop
    (toggle green)  (pause :ms) (toggle green)
    (toggle yellow) (pause :ms) (toggle yellow)
    (toggle red)    (pause :ms) (toggle red)
    (toggle yellow) (pause :ms) (toggle yellow)))

;`);cp.execute(`;-----------------------------------------------------------

(define soundbar
  "Like a sound bar with the given duration:
  (soundbar 500)"
  (loop
    (toggle green)  (pause :ms)
    (toggle yellow) (pause :ms)
    (toggle red)    (pause :ms)
    (toggle red)    (pause :ms)
    (toggle yellow) (pause :ms)
    (toggle green)  (pause :ms)))

;`);cp.execute(`;-----------------------------------------------------------

(define activity
  "Time an activity from green (go) to yellow (attention) to red (stop).
  Blinks green before starting for 5 seconds, keeps green on for the 'green-ms'
  duration, turns yellow on for the 'yellow-ms' duration, then blinks yellow
  for 'attention-ms' duration before turning on red (stop).
  E.g. for an activity that takes one minute with green for 40s, yellow for 10s,
  then yellow blinking for 10s:
  (activity 40000 10000 10000)"
  (run
    (blink 4 green 500)
    (turn green on)
    (pause :green-ms)
    (lights off on off)
    (pause :yellow-ms)
    (turn yellow off)
    (timeout :attention-ms (twinkle yellow 500))
    (lights on off off)))

;`); }//--------------------------------------------------------------------
