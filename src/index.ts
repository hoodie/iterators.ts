export type Callback<T, U> = (input: T) => U;
export type Predicate<T> = (input: T) => boolean;

// const __dir = (content: any) => console.dir(content, {colors: true, depth: 10});
const __dir = (_content: any) => { };
let __log = (_content: any) => { };


/// Interface
export interface LazyIterator<T> extends Iterator<T> {
    next(value?: any): IteratorResult<T>;

    /// Adapters

    // chain<U extends ProperIterator><other: U>: ProperIterator<T>;

    enumerate(): LazyIterator<[number, T]>;

    /* Iterator skipping all elements which don't meet the given predicate */
    filter(predicate: Predicate<T>): LazyIterator<T>;

    /* Iterator applying the given callback to each element */
    map<V, U extends [number, V]>(callback: Callback<T, U>): LazyIterator<[number, V]>;
    map<U>(callback: Callback<T, U>): LazyIterator<U>;

    // max / min
    // partition
    // rev (requires double ended iterator)
    // skip
    // step_by(step: number): number;

    take(limit: number): SizedLazyIterator<T>;
    skip(limit: number): LazyIterator<T>;

    /* Iterator yielding elements while predicate is `true` */
    takeWhile(predicate: Predicate<T>): LazyIterator<T>;

    // window

    /* like map, without modifying elements*/
    with(callback: Callback<T, void>): LazyIterator<T>;

    // zip<O>(other: IIter<O>): IIter<T|O>;

    /// consumers

    // count(): T // TODO count next() until done and throw if count >= Number.MAX_SAFE_INTEGER
    // nth(index: number): T;
    // find(predicate: Callback<T>): T;
    //sum(acc: T, callback: (a: T, b: T) => T):  T;
    //fold(acc: T, callback: (a: T, b: T) => T):  T;

    collect_into_array(): Array<T>;
}

export interface SizedLazyIterator<T> extends LazyIterator<T> {
    count(): number;

    cycle(): LazyIterator<T>;

    last(): T | undefined;

    size_hint(): number;
}

/**
 * Base Iterator
 * T is
 */
export class Iter<T> implements LazyIterator<T> {

    static from_array<T>(a: Array<T>): SizedLazyIterator<T> {
        return new SizedIter(a.length, a[Symbol.iterator]());
    }

    static count_to(limit: number): SizedLazyIterator<number> {
        return new SizedIter(limit, inner_count_to(limit));
    }

    constructor(protected iterator?: Iterator<any>) { }

    /// Iterable Protocol
    next(value?: T): IteratorResult<T> {
        if (!!this.iterator) {
            return this.iterator.next(value);
        } else {
            return {value: undefined, done: true} as any;
        }
    }

    /// adapters

    enumerate(): EnumerateAdapter<T> {
        return new EnumerateAdapter(this);
    }

    filter(predicate: Predicate<T>): FilterAdapter<T> {
        return new FilterAdapter(this, predicate);
    }

    map<U>(callback: Callback<T, U>): MapAdapter<T, U> {
        return new MapAdapter<T, U>(this, callback);
    }

    take(limit: number): TakeAdapter<T> {
        return new TakeAdapter(this, limit);
    }

    skip(limit: number): SkipAdapter<T> {
        return new SkipAdapter(this, limit);
    }

    takeWhile(predicate: Predicate<T>): TakeWhileAdapter<T> {
        return new TakeWhileAdapter(this, predicate);
    }

    with(callback: Callback<T, void>): WithAdapter<T> {
        return new WithAdapter(this, callback);
    }


    // zip<O>(other: IIter<O>): IIter<T|O> {
    //     return new ZipAdapter(this, other);
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

export class SizedIter<T> extends Iter<T> implements SizedLazyIterator<T> {
    private __last_element?: T;

    constructor(protected size: number, protected iterator: Iterator<T>) {
        super();
    }

    count(): number {
        return this.size_hint();
    }

    cycle(): CycleAdapter<T> {
        return new CycleAdapter(this);
    }

    last(): T | undefined {
        if (this.__last_element !== undefined) {
            return this.__last_element;
        }

        let v = undefined;
        while (true) {
            let n = this.iterator!.next();
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

class CycleAdapter<T> extends Iter<T> {
    private cache: Array<T>

    constructor(protected iterator: Iterator<T>) {
        super();
        this.cache = [];
    }

    next(): IteratorResult<T> {
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

class WithAdapter<T> extends Iter<T> {
    constructor(protected iterator: Iterator<T>, protected callback: Callback<T, void>) {
        super();
    }

    next() {
        const item = this.iterator.next()
        this.callback(item.value)
        __log(`each -> ${item.value}`);
        return item;
    }
}

class EnumerateAdapter<T> extends Iter<[number, T]> {
    private count = 0;

    constructor(protected iterator: LazyIterator<T>) {
        super();
    }

    next(): IteratorResult<[number, T]> {
        const item = this.iterator.next()
        return { value: [this.count++, item.value], done: item.done };
    }
}

class FilterAdapter<T> extends Iter<T> {
    constructor(protected iterator: Iterator<T>, protected callback: Callback<T, boolean>) {
        super();
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

class MapAdapter<T, U> extends Iter<U> {
    constructor(protected iterator: Iterator<T>, protected callback: Callback<T, U>) {
        super();
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

class TakeAdapter<T> extends SizedIter<T> {
    private took = 0;

    constructor(protected iterator: Iterator<T>, private limit: number) {
        super(limit, iterator);
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

class SkipAdapter<T> extends Iter<T> {

    constructor(protected iterator: Iterator<T>, skip: number) {
        super();
        __log(`skip -> ${skip} values`);
        for (let i = 0; i < skip; i++) {
            this.iterator.next();
        }
    }

    next() {
            const n = this.iterator.next();
            __log(`take -> ${n.value}`);
            return n;
    }
}

class TakeWhileAdapter<T> extends Iter<T> {
    constructor(protected iterator: Iterator<T>, private predicate: Predicate<T>) {
        super();
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

class ZipAdapter<O> extends Iter<O> {
    private iterators: Iterator<any>[];

    constructor(protected iterator: Iterator<any>, private other: Iterator<O>) {
        super();
        this.iterators = [iterator, other];
    }

    next(): never {
        throw new Error("unimplemented");
        // return {value: undefined as any, done: true}
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

export function enable_debug_logging() {
    __log = (content: any) => console.log(`   ${content}`);
}
