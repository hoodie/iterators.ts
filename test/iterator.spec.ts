import * as chai from 'chai';
import * as mocha from 'mocha';
import { expect } from 'chai';

import { Iter } from '../src';

describe('ProperIterator', () => {

    describe('generate', () => {
        it('.from_array([...])', () => {

            const counter = Iter.from_array([1, 2, 3, 4, 5]);

            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(4);
            expect(counter.next().value).to.eq(5);

        });

        it('.count_to(n)', () => {
            const counter = Iter.count_to(5);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(4);
            expect(counter.next().value).to.eq(5);
        });
    });

    describe('.map() and .filter()', () => {
        it('filters', () => {
            const counter = Iter.count_to(5).filter(x => x % 2 == 0);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(4);
        });

        it('maps', () => {
            const counter = Iter.count_to(5).map(x => -x);

            expect(counter.next().value).to.eq(-1);
            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-3);
            expect(counter.next().value).to.eq(-4);
            expect(counter.next().value).to.eq(-5);
        });

        it('maps and filters', () => {
            const counter = Iter.count_to(5)
                .map(x => -x)
                .filter(x => x % 2 == 0);

            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-4);
        });

        it('filters and maps', () => {
            const counter = Iter.count_to(5)
                .filter(x => x % 2 == 0)
                .map(x => -x);

            expect(counter.next().value).to.eq(-2);
            expect(counter.next().value).to.eq(-4);
        });

        it('stops when done', () => {
            const collection = Iter.from_array(['a', 'b', 'c'])
                .map((x: string) => x.toUpperCase())
                .collect_into_array()
            expect(collection).to.deep.equal(['A','B','C']);
        })
    });

    describe('.enumerate()', () => {
        it('enumerates', () => {
            const counter = Iter.count_to(5).map(x => x * 100).enumerate();
            expect(counter.next().value).to.deep.eq([0, 100]);
            expect(counter.next().value).to.deep.eq([1, 200]);
            expect(counter.next().value).to.deep.eq([2, 300]);
        });
    });

    describe('.take()', () => {
        it('takes', () => {
            const counter = Iter.count_to(5).take(2);

            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next()).to.deep.eq({ value: undefined, done: true });
        });

        it('has a size_hint', () => {
            const counter = Iter.count_to(5).take(2);
            expect(counter.size_hint()).to.eq(2);
        });

    });

    describe('.collect_to_array()', () => {
        it('collects', () => {
            const counter = Iter.count_to(5).collect_into_array();

            expect(counter).to.deep.eq([1, 2, 3, 4, 5]);
        });
    });

    describe('.cycle()', () => {
       it('cycles', () => {
           const counter = Iter.count_to(3).cycle().take(5);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().value).to.eq(3);
            expect(counter.next().value).to.eq(1);
            expect(counter.next().value).to.eq(2);
            expect(counter.next().done).to.be.true;
       }) ;
    });

    it.skip('forEach', () => {
        const counter = Iter.count_to(5).with(console.log).collect_into_array();
    });

    describe('Sized Iterators', () => {
        it('gives a proper size hint', () => {
            const a = [1, 2, 3, 4, 5];
            const iter = Iter.from_array(a);
            expect(iter.size_hint()).to.eq(a.length)
        });
    });

    describe('.last()', () => {
        it('takes the last element', () => {
            const iter = Iter.from_array([1, 2, 3, 4, 5]);
            expect(iter.last()).to.eq(5);
        });
        it('keeps returning the last element', () => {
            const iter = Iter.from_array([1, 2, 3, 4, 5]);
            expect(iter.last()).to.eq(5);
            expect(iter.last()).to.eq(5);
            expect(iter.last()).to.eq(5);
        });
    })

});