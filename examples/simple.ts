import { enable_debug_logging, Iter } from "../src/mod.ts";
enable_debug_logging();

// deno-lint-ignore no-explicit-any
const dir = (content: any) => console.dir(content, { colors: true, depth: 10 });

const abc = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];

const it = Iter.fromArray(abc)
  .enumerate()
  .map(([k, v]) => [k, v.toUpperCase()])
  .filter(([k, _v]) => k % 2 == 0)
  .map(([_k, v]) => v);

const collected = it.take(3).intoArray(); // -> [ 'A', 'C', 'E']

const collected2 = it.intoArray(); // -> ['G', 'I', 'K']

dir({
  collected,
  collected2,
});
