import 'chai';
import 'mocha';
import { expect } from 'chai';

import { Iter, enable_debug_logging } from '../src';
// enable_debug_logging();

describe('LazyIterator', () => {

    describe('generate', () => {
        it('.from_array([...])', () => {
            const counter = Iter.fromArray([1, 2, 3, 4, 5]);

            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(4);
            expect(counter.next().value).to.eq(5);

        });

        it('.count_to(n)', () => {
            const counter = Iter.countTo(5);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(4);
            expect(counter.next().value).to.eq(5);
        });
    });

    describe('.map()', () => {
        it('maps', () => {
            const counter = Iter.countTo(5).map(x => -x);

            expect(counter.next().value).to.eq(-1);
            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-3);
            expect(counter.next().value).to.eq(-4);
            expect(counter.next().value).to.eq(-5);
        });

        it('stops when done', () => {
            const collection = Iter.fromArray(['a', 'b', 'c'])
                .map((x: string) => x.toUpperCase())
                .intoArray()
            expect(collection).to.deep.equal(['A','B','C']);
        })

        it('infers return type from callback', () => { // only needs to compile
            const collection = Iter.fromArray([1, 2, 3])
                .map((x) => `${x} ✔`)
                .map((x) => x.toUpperCase())
                .intoArray()
            const it = Iter.fromArray(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'])
                .enumerate()
                .map(([k, v]) => [k, v.toUpperCase()])
                .filter(([k, v]) => k % 2 == 0)
                .map(([, v]) => v)
            expect(collection).to.deep.equal(['1 ✔', '2 ✔', '3 ✔']);
        })
    });

    describe('.filter()', () => {
        it('filters', () => {
            const counter = Iter.countTo(5).filter(x => x % 2 == 0);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(4);
        });
    });

    describe('.map() and .filter()', () => {
        it('maps and filters', () => {
            const counter = Iter.countTo(5)
                .map(x => -x)
                .filter(x => x % 2 == 0);

            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-4);
        });

        it('filters and maps', () => {
            const counter = Iter.countTo(5)
                .filter(x => x % 2 == 0)
                .map(x => -x);

            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-4);
        });

    });

    describe('.find()', () => {
        it('finds', () => {
            const hay = ['a', 'b', true, undefined, null, 'needle']
            const needle1 = Iter.fromArray(hay).find((x: any) => x === 5);
            const needle2 = Iter.fromArray(hay).find((x: any) => x === 'b');
            const needle3 = Iter.fromArray(hay).find((x: any) => !!x);
            expect(needle1).to.eq(undefined);
            expect(needle2).to.eq('b');
            expect(needle3).to.eq('a');

        });
    });

    describe('.enumerate()', () => {
        it('enumerates', () => {
            const counter = Iter.countTo(5).map(x => x * 100).enumerate();
            expect(counter.next().value).to.deep.eq([0, 100]);
            expect(counter.next().value).to.deep.eq([1, 200]);
            expect(counter.next().value).to.deep.eq([2, 300]);
        });
    });

    describe('.take()', () => {
        it('takes', () => {
            const counter = Iter.countTo(5).take(2);

            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next()).to.deep.eq({ value: undefined, done: true });
        });

        it('has a size_hint', () => {
            const counter = Iter.countTo(5).take(2);
            expect(counter.sizeHint()).to.eq(2);
        });
    });

    describe('.skip()', () => {
        it('skips', () => {
            const collection1 = Iter.countTo(10)
                .skip(2)
                .intoArray();
            expect(collection1).to.deep.eq([3,4,5,6,7,8,9,10]);

        });
        it('works with take', () => {
            const collection2 = Iter.countTo(10)
                .skip(2)
                .take(5)
                .intoArray();
            expect(collection2).to.deep.eq([3,4,5,6,7]);
        });
    });

    describe('.skipWhile()', () => {
        it('skips while x < 6', () => {
            const collection1 = Iter.countTo(10)
                .skipWhile(x => x < 6)
                .intoArray();
            expect(collection1).to.deep.eq([6, 7, 8, 9, 10]);
        });

        it('skips while x <= 6', () => {
            const collection1 = Iter.countTo(10)
                .skipWhile(x => x <= 6)
                .intoArray();
            expect(collection1).to.deep.eq([7, 8, 9, 10]);
        });

        it('skips while', () => {
            const hey = Iter.fromArray(['a', 'b', true, undefined, null, 'needle']);
            const collection = hey.skipWhile((x) => x !== 'b').intoArray();
            expect(collection).to.deep.eq(['b', true, undefined, null, 'needle']);

            const collection2 = Iter.fromArray(['a', 'x', 'f', 3, 4, 5, 6, 7, 8])
                .skipWhile(x => typeof x === 'string')
                .take(5)
                .intoArray();
            expect(collection2).to.deep.eq([3, 4, 5, 6, 7]);
        });

        it('handles empty', () => {
            const next = Iter.fromArray([])
                .skipWhile(x => typeof x !== 'string')
                .next();
            expect(next.value).to.be.undefined;
        });

        it('handles unfindable', () => {
            const hey = Iter.fromArray(['a', 'b', true, undefined, null, 'needle']);
            const collection = hey.skipWhile((x: any) => x !== 5).intoArray();
            expect(collection).to.deep.eq([]);
        });
    });

    describe('termination', function() {
        this.timeout(1000);
        it('.skipWhile()', () => {
            const collection = Iter.fromArray([])
                .skipWhile(() => true)
                .intoArray();
        })

        it('.map()', () => {
            const collection = Iter.fromArray([])
                .map(x => !!x)
                .intoArray();
        })

        it('.filter()', () => {
            Iter.fromArray([])
                .filter(x => !!x)
                .intoArray();
        })
    });

    describe('.collect_to_array()', () => {
        it('collects', () => {
            const counter = Iter.countTo(5).intoArray();

            expect(counter).to.deep.eq([1, 2, 3, 4, 5]);
        });
    });

    describe('.cycle()', () => {
       it('cycles', () => {
           const counter = Iter.countTo(3).cycle().take(5);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().done).to.be.true;
       }) ;
    });

    describe('.zip()', () => {
        it('zips two simple iterators', () => {
            const numbers = Iter.countTo(6);
            const letters = Iter.fromArray(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']);
            const zipped = numbers.zip(letters);
            expect(zipped.next().value).to.deep.eq([1, 'a']);
            expect(zipped.next().value).to.deep.eq([2, 'b']);

            expect(zipped.next().value).to.deep.eq([3, 'c']);
            expect(zipped.next().value).to.deep.eq([4, 'd']);
            expect(zipped.next().value).to.deep.eq([5, 'e']);
            expect(zipped.next().value).to.deep.eq([6, 'f']);
            const next = zipped.next()
            expect(next.done).to.be.true;
            expect(next.value).to.deep.eq([undefined, 'g']);
        });
    });

    describe('Sized Iterators', () => {
        it('gives a proper size hint', () => {
            const a = [1, 2, 3, 4, 5];
            const iter = Iter.fromArray(a);
            expect(iter.sizeHint()).to.eq(a.length)
        });
    });

    describe('.last()', () => {
        it('takes the last element', () => {
            const iter = Iter.fromArray([1, 2, 3, 4, 5]);
            expect(iter.last()).to.eq(5);
        });
        it('keeps returning the last element', () => {
            const iter = Iter.fromArray([1, 2, 3, 4, 5]);
            expect(iter.last()).to.eq(5);
            expect(iter.last()).to.eq(5);
            expect(iter.last()).to.eq(5);
        });
    })

});
