## Layout, wire, and simulate simple electrical components, switches, relays & lamps 

For learning purposes, not to be relied on actual live installations. 
Author takes no responsibility if used as an instruction to install actual electrical systems.

Demo: https://virtual-installation-cubicle.netlify.app

## Components

**Power input** — L, N and PE. Feeds the circuit; L is always live.

**Lamps** — two-wire (L, N) and three-wire (L, N, PE). Lights when L is live and N
reaches the supply neutral.

**Switches**

| Type | Behaviour | Terminals |
| --- | --- | --- |
| 1 | Single on/off | IN, OUT |
| 5 | One feed, two outputs switched independently | IN, OUT1, OUT2 |
| 6 | Changeover (two-way): COM follows L1 or L2 | COM, L1, L2 |
| 6+6 | Two changeover switches on one plate | COM1/L1A/L1B, COM2/L2A/L2B |
| 7 | Cross (intermediate): swaps the two travellers | IN1/IN2, OUT1/OUT2 |

**Relays** — two-pole, coil on A1/N, contacts 1-2 and 3-4. Available as NO-NO, NO-NC
and NC-NC. An NO pole closes while the coil is energised, an NC pole opens.

**Step relay** — impulse relay with coil A1/N and one NO contact 1-2. Each coil pulse
flips the contact, which stays put until the next pulse; holding the coil on does
nothing. Pulse it from several push buttons for multi-point switching.

**Start/stop button** — momentary. Green G1-G2 is normally open and conducts only
while held; red R1-R2 is normally closed and opens while held. Pair it with a relay
for a holding (seal-in) circuit.

**Push button (NO)** — momentary, single normally-open contact G1-G2 that conducts
only while held.

**Multifunction timer** — supply A1/A2, control input B1, changeover output 15-16 (NC)
and 15-18 (NO). Delay 0.1–60 s with seven functions:

| Code | Function |
| --- | --- |
| E | On-delay from supply |
| Ec | On-delay started by B1 |
| R | Off-delay after B1 opens |
| Wu | Interval on power-up |
| Ws | Impulse when B1 closes |
| Wa | Impulse when B1 opens |
| Bp | Flasher, 1:1 pause first |

**Star-delta starter timer** — supply A1/A2, changeover output 15-16 (star) and
15-18 (delta). Star time 0.1–60 s, star-to-delta changeover 50–150 ms.

At rest neither contact is made. On supply the output goes to star, back to neutral
for the changeover delay, then to delta, where it stays until the supply is gone for
at least 200 ms. Shorter interruptions change nothing; losing the supply during the
star period aborts the cycle and the next supply starts a fresh one.
