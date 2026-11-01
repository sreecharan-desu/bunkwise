# bunkwise

A small web app for college students who have to keep attendance above a fixed percentage (75% at most Indian colleges, including mine). Add your subjects with how many classes you attended and how many were held, and it tells you, per subject:

- your current percentage
- how many upcoming classes you can miss and still stay at or above the target
- if you are already short, how many classes in a row you need to attend to get back
- a "what if" view: attend X and skip Y of the next classes, where do you land

It also shows an overall percentage across subjects, since some colleges use that instead.

## Why

Every semester I see friends do this math in their heads and get it wrong, then find out in the last week that they are short in one subject. The rule is simple but the "how many can I miss" question is not obvious, because each class you skip also raises the total.

## Privacy

There is no backend and no login. Everything is stored in your browser's localStorage. You can export a JSON backup and import it on another device.

## The math

With `a` attended, `t` held and a target of `P` percent:

- safe skips = `floor((100a - P t) / P)`, never below 0
- classes needed = `ceil((P t - 100a) / (100 - P))` when you are short

Targets are whole numbers so all of this runs in integers. The tests in `src/attendance.test.ts` check both formulas against brute force for every attended and held count up to 50 classes.

## Run it locally

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # static build in dist/
```

## Stack

React, TypeScript, Vite, Vitest. Deployed as a static site on Vercel.

## Limitations

- Counts are entered by hand. There is no timetable import or college portal sync.
- Data lives in one browser unless you export and import it.
- It does not know about medical leave or condonation rules, which differ by college.

## License

MIT
