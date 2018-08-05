import { Iter, enable_debug_logging } from '../src';

const dir = (content: any) => console.dir(content, {colors: true, depth: 10});

const it = Iter.from_array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'])
    .enumerate()
    .map(([k, v]) => [k, v.toUpperCase()])
    .filter(([k, v]) => k % 2 == 0)
    .map(([, v]) => v)


const collected = it.take(3)
    .collect_into_array(); // -> [ 'A', 'C', 'E']

const collected2 = it
    .collect_into_array(); // -> ['G', 'I', 'K']

dir({
    collected,
    collected2
})
