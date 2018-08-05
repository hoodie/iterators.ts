export type Callback<T, U> = (input: T) => U;
export type Predicate<T> = (input: T) => boolean;

// const __dir = (content: any) => console.dir(content, {colors: true, depth: 10});
const __dir = (_content: any) => { };
// const __log = (content: any) => console.dir(content);
let __log = (_content: any) => { };

/// Interface
export interface IIter<T> {
    next(value?: any): IteratorResult<T>;

    /// Adapters

    // chain<U extends ProperIterator><other: U>: ProperIterator<T>;

    enumerate(): IIter<[number, T]>;

    /* Iterator skipping all elements which don't meet the given predicate */
    filter(predicate: Predicate<T>): IIter<T>;

    /* Iterator applying the given callback to each element */
    map<V, U extends [number, V]>(callback: Callback<T, U>): IIter<[number, V]>;
    map<U>(callback: Callback<T, U>): IIter<U>;

    // max / min
    // partition
    // rev (requires double ended iterator)
    // skip
    // step_by(step: number): number;

    take(limit: number): ISizedIter<T>;

    /* Iterator yielding elements while predicate is `true` */
    takeWhile(predicate: Predicate<T>): IIter<T>;

    // window

    /* like map, without modifying elements*/
    with(callback: Callback<T, void>): IIter<T>;

    // zip<O>(other: IIter<O>): IIter<T|O>;

    /// consumers

    // count(): T // TODO count next() until done and throw if count >= Number.MAX_SAFE_INTEGER
    // nth(index: number): T;
    // find(predicate: Callback<T>): T;
    //sum(acc: T, callback: (a: T, b: T) => T):  T;
    //fold(acc: T, callback: (a: T, b: T) => T):  T;

    collect_into_array(): Array<T>;
}

export interface ISizedIter<T> extends IIter<T> {
    count(): number;

    cycle(): Adapter.Cycle<T>;

    last(): T | undefined;

    size_hint(): number;

}

/**
 * Base Iterator
 * T is
 */
export class Iter<T> implements IIter<T> {

    constructor(protected iterator: Iterator<any>) { }

    /// protocol

    next(value?: any): IteratorResult<T> {
        return this.iterator.next(value);
    }

    /// adapters

    enumerate(): Adapter.Enumerate<T> {
        return new Adapter.Enumerate(this);
    }

    filter(predicate: Predicate<T>): Adapter.Filter<T> {
        return new Adapter.Filter(this, predicate);
    }

    map<U>(callback: Callback<T, U>): Adapter.Map<T, U> {
        return new Adapter.Map<T, U>(this, callback);
    }

    take(limit: number): Adapter.Take<T> {
        return new Adapter.Take(this, limit);
    }

    takeWhile(predicate: Predicate<T>): Adapter.TakeWhile<T> {
        return new Adapter.TakeWhile(this, predicate);
    }

    with(callback: Callback<T, void>): Adapter.Each<T> {
        return new Adapter.Each(this, callback);
    }

    // zip<O>(other: IIter<O>): IIter<T|O> {
    //     return new Adapter.Zip(this, other);
    // }

    /// consumers

    collect_into_array(): T[] {
        //return [...this];
        const all = [];
        while (true) {
            const nxt = this.next();
            if (nxt.done) {
                break;
            }
            all.push(nxt.value);
        }
        return all;
    }
}

export class SizedIter<T> extends Iter<T> implements ISizedIter<T> {
    private __last_element?: T;

    constructor(protected iterator: Iterator<T>, protected size: number) {
        super(iterator);
    }

    count(): number {
        return this.size_hint();
    }

    cycle(): Adapter.Cycle<T> {
        return new Adapter.Cycle(this);
    }

    last(): T | undefined {
        if (this.__last_element !== undefined) {
            return this.__last_element;
        }

        let v = undefined;
        while (true) {
            let n = this.iterator.next();
            __dir({ n, v });
            if (n.done) {
                this.__last_element = v;
                return v;
            }
            v = n.value;
        }
    }


    size_hint(): number {
        return this.size
    }
}

/** adapters */
namespace Adapter {


    export class Cycle<T> extends Iter<T> {
        private cache: Array<T>

        constructor(protected iterator: Iterator<any>) {
            super(iterator);
            this.cache = [];
        }

        next() {
            const n = this.iterator.next();
            if (n.done) {
                this.iterator = (<Array<T>>this.cache)[Symbol.iterator]();
                return this.iterator.next();
            } else {
                this.cache.push(n.value);
                return n;
            }
        }

    }

    export class Each<T> extends Iter<T> {
        constructor(protected iterator: Iterator<T>, protected callback: Callback<T, void>) {
            super(iterator);
        }

        next() {
            const item = this.iterator.next()
            this.callback(item.value)
            __log(`each -> ${item.value}`);
            return item;
        }
    }

    export class Enumerate<T> extends Iter<[number, T]> {
        private count = 0;

        constructor(protected iterator: Iterator<T>) {
            super(iterator);
        }

        next(): IteratorResult<[number, T]> {
            const item = this.iterator.next()
            return { value: [this.count++, item.value], done: item.done };
        }
    }

    export class Filter<T> extends Iter<T> {
        constructor(protected iterator: Iterator<T>, protected callback: Callback<T, boolean>) {
            super(iterator);
        }

        next() {
            while (true) {
                const item = this.iterator.next()

                if (this.callback(item.value)) {
                    __log(`filter -> ${item.value}`);
                    return item
                }
            }
        }
    }

    export class Map<T, U> extends Iter<U> {
        constructor(protected iterator: Iterator<T>, protected callback: Callback<T, U>) {
            super(iterator);
        }

        next(): IteratorResult<U> {
            const {value, done} = this.iterator.next()

            if (done) {
                return { value, done } as any;
            }

            const mappedValue: U = this.callback(value)
            __log(`map -> ${mappedValue}`);
            return { value: mappedValue, done }
        }
    }

    export class Take<T> extends SizedIter<T> {
        private took = 0;

        constructor(protected iterator: Iterator<T>, private limit: number) {
            super(iterator, limit);
        }

        next() {
            if (this.took < this.limit) {
                this.took++;
                const n = this.iterator.next();
                __log(`take -> ${n.value}`);
                return n;
            } else {
                return { value: undefined, done: true } as any;
            }
        }
    }

    export class TakeWhile<T> extends Iter<T> {
        constructor(protected iterator: Iterator<T>, private predicate: Predicate<T>) {
            super(iterator);
        }

        next() {
            const n = this.iterator.next();
            if (this.predicate(n.value)) {
                return n;
            } else {
                return { value: undefined, done: true } as any;
            }
        }
    }

    export class Zip<O> extends Iter<O> {
        private iterators: Iterator<any>[];

        constructor(protected iterator: Iterator<any>, private other: Iterator<O>) {
            super(iterator);
            this.iterators = [iterator, other];
        }

        next(): never {
            throw new Error("unimplemented");
            // return {value: undefined as any, done: true}
        }

    }
}




/// utilities

function* inner_from_array<T>(a: T[]): IterableIterator<T> {
    for (const x of a) {
        yield x;
    }
}

function* inner_count_to(limit: number): IterableIterator<number> {
    let i = 1;
    while (i <= limit) {
        yield i++;
    }
}

export namespace Iter {
    export function from_array<T>(a: Array<T>): ISizedIter<T> {
        return new SizedIter(a[Symbol.iterator](), a.length);
    }

    export function count_to(limit: number): ISizedIter<number> {
        return new SizedIter(inner_count_to(limit), limit);
    }

}

export function enable_debug_logging() {
    __log = (content: any) => console.dir(content);
}
