# Language Discovery Demo

Static 3-user phone simulator for three discovery prototypes:

1. Wizard of Oz Chat
2. Human Partner Pool
3. Omegle for English

Open `index.html` directly in a browser. No backend or install step is required.

## Demo style

One desktop screen shows three phone interfaces side by side:

- Phone A: Minh
- Phone B: Linh
- Phone C: An, or AI Coach in Prototype 1

Use the left sidebar to switch between prototypes.

## Prototype 1: Wizard of Oz

Phone A and Phone B are student accounts. Phone C is the operator pretending to be the AI Coach.

Demo:

1. Minh or Linh sends an English sentence.
2. Phone C chooses the active student and replies as the AI Coach.
3. This lets you test two students sharing the same manual AI operation flow.

## Prototype 2: Human Partner Pool

Phone A, B, and C are three student accounts.

Demo:

1. Minh joins the partner pool.
2. Linh joins the partner pool.
3. An joins the partner pool.
4. Tap Auto match. The first two learners become a pair.
5. The third learner stays in Waiting state.

Cases this supports:

- enough learners to create a pair
- odd-number learner waiting
- completed session
- clearing a match and trying again

## Prototype 3: Omegle for English

Phone A, B, and C are three student accounts.

Demo:

1. Minh taps Find Partner.
2. Linh taps Find Partner.
3. Minh and Linh are matched automatically.
4. An taps Find Partner and waits while the active pair is practicing.
5. End the current session to test what happens after a match finishes.

Cases this supports:

- live queue
- instant match when two learners are online
- third user waiting
- one matched pair chatting while another learner waits
