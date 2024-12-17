# Lazy Iterators in Typescript

Javascript iterators suck so...

```typescript
const it = Iter.fromArray([
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
])
  .enumerate()
  .map(([k, v]) => [k, v.toUpperCase()])
  .filter(([k, v]) => k % 2 == 0)
  .map(([, v]) => v);

const collected = it.take(3)
  .intoArray(); // -> [ 'A', 'C', 'E']

const collected2 = it
  .intoArray(); // -> ['G', 'I', 'K']
```
