export type Callback<T, U> = (input: T) => U;
export type Predicate<T> = (input: T) => boolean;

// const __dir = (content: any) => console.dir(content, {colors: true, depth: 10});
const __dir = (_content: any) => { };
let __log = (_content: any) => { };


/// Interface
export interface LazyIterator<T> extends Iterator<T>, Iterable<T> {
    next(value?: any): IteratorResult<T>;

    /// Adapters

    // chain<U extends ProperIterator><other: U>: ProperIterator<T>;

    enumerate(): LazyIterator<[number, T]>;

    /* Iterator skipping all elements which don't meet the given predicate */
    filter(predicate: Predicate<T>): LazyIterator<T>;
    find(predicate: Predicate<T>): T | undefined;

    /* Iterator applying the given callback to each element */
    map<V, U extends [number, V]>(callback: Callback<T, U>): LazyIterator<[number, V]>;
    map<U>(callback: Callback<T, U>): LazyIterator<U>;

    // max / min
    // partition
    // rev (requires double ended iterator)
    // step_by(step: number): number;
    skip(limit: number): LazyIterator<T>;
    skipWhile(predicate: Predicate<T>): LazyIterator<T>;

    take(limit: number): SizedLazyIterator<T>;

    /* Iterator yielding elements while predicate is `true` */
    takeWhile(predicate: Predicate<T>): LazyIterator<T>;

    // window

    /* like map, without modifying elements*/
    with(callback: Callback<T, void>): LazyIterator<T>;

    zip<O>(other: LazyIterator<O>): LazyIterator<[T, O]>;
    // alter<O>(other: LazyIterator<O>): LazyIterator<T | O>;

    /// consumers

    // count(): T // TODO count next() until done and throw if count >= Number.MAX_SAFE_INTEGER
    // nth(index: number): T;
    // sum(acc: T, callback: (a: T, b: T) => T):  T;
    // fold(acc: T, callback: (a: T, b: T) => T):  T;

    intoArray(): Array<T>;
}

export interface SizedLazyIterator<T> extends LazyIterator<T> {
    count(): number;

    cycle(): LazyIterator<T>;

    last(): T | undefined;

    sizeHint(): number;
}

/**
 * Base Iterator
 * T is
 */
export class Iter<T> implements LazyIterator<T> {

    static fromArray<T>(a: Array<T>): SizedLazyIterator<T> {
        return new SizedIter(a.length, a[Symbol.iterator]());
    }

    static countTo(limit: number): SizedLazyIterator<number> {
        return new SizedIter(limit, inner_count_to(limit));
    }

    constructor(protected iterator?: Iterator<any>) { }

    [Symbol.iterator]() {
        return this;
    }

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

    find(predicate: Predicate<T>): T | undefined {
        const {value, done} = this.skipWhile(x => !predicate(x)).next()
        if (done) {
            return undefined;
        }
        return value;
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

    skipWhile(predicate: Predicate<T>): SkipWhileAdapter<T> {
        return new SkipWhileAdapter(this, predicate);
    }

    takeWhile(predicate: Predicate<T>): TakeWhileAdapter<T> {
        return new TakeWhileAdapter(this, predicate);
    }

    with(callback: Callback<T, void>): WithAdapter<T> {
        return new WithAdapter(this, callback);
    }


    zip<O>(other: LazyIterator<O>): LazyIterator<[T,  O]> {
        return new ZipAdapter<T, O>(this, other);
    }

    /// consumers

    intoArray(): T[] {
        //return [...this];
        const all = [];
        let nxt: IteratorResult<T> | undefined;
        while (!nxt || !nxt.done) {
            nxt = this.next();
            if (nxt.done) {
                break;
            }
            all.push(nxt.value);
        }
        return all;
    }
}

export class SizedIter<T> extends Iter<T> implements SizedLazyIterator<T> {
    private __lastElement?: T;

    constructor(protected size: number, protected override iterator: Iterator<T>) {
        super();
    }

    count(): number {
        return this.sizeHint();
    }

    cycle(): CycleAdapter<T> {
        return new CycleAdapter(this);
    }

    last(): T | undefined {
        if (this.__lastElement !== undefined) {
            return this.__lastElement;
        }

        let v = undefined;
        while (true) {
            let n = this.iterator!.next();
            __dir({ n, v });
            if (n.done) {
                this.__lastElement = v;
                return v;
            }
            v = n.value;
        }
    }

    sizeHint(): number {
        return this.size
    }

    override intoArray(): T[] {
        const all = new Array<T>(this.size);
        let nxt: IteratorResult<T> | undefined;
        let i = 0
        while (!nxt || !nxt.done) {
            nxt = this.next();
            if (nxt.done) {
                break;
            }
            all[i++] = nxt.value;
        }
        return all;
    }
}

/** adapters */

class CycleAdapter<T> extends Iter<T> {
    private cache: Array<T>

    constructor(protected override iterator: Iterator<T>) {
        super();
        __log(`.cycle()`)
        this.cache = [];
    }

    override next(): IteratorResult<T> {
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

class EnumerateAdapter<T> extends Iter<[number, T]> {
    private count = 0;

    constructor(protected override iterator: LazyIterator<T>) {
        super();
        __log(`.enumerate()`)
    }

    override next(): IteratorResult<[number, T]> {
        const item = this.iterator.next()
        return { value: [this.count++, item.value], done: item.done };
    }
}

class FilterAdapter<T> extends Iter<T> {
    constructor(protected override iterator: Iterator<T>, protected predicate: Predicate<T>) {
        super();
        __log(`.filter()`)
    }

    override  next() {
        while (true) {
            const item = this.iterator.next()

            if (item.done) { return item }
            if (this.predicate(item.value)) {
                __log(`filter -> ${item.value}`);
                return item
            }
        }
    }
}

class MapAdapter<T, U> extends Iter<U> {
    constructor(protected override iterator: Iterator<T>, protected callback: Callback<T, U>) {
        super();
        __log(`.map()`);
    }

    override next(): IteratorResult<U> {
        const {value, done} = this.iterator.next()

        if (done) {
            return { value, done } as any;
        }

        const mappedValue: U = this.callback(value)
        __log(`map -> ${mappedValue}`);
        return { value: mappedValue, done }
    }
}

class SkipAdapter<T> extends Iter<T> {

    constructor(protected override iterator: Iterator<T>, skip: number) {
        super();
        __log(`.skip() -> ${skip} values`);
        for (let i = 0; i < skip; i++) {
            this.iterator.next();
        }
    }

    override next() {
            const n = this.iterator.next();
            __log(`take -> ${n.value}`);
            return n;
    }
}

class SkipWhileAdapter<T> extends Iter<T> {

  private first: IteratorResult<T> | undefined;
  private skippedFirst = false;

  constructor(protected override iterator: Iterator<T>, predicate: Predicate<T>) {
    super();
    __log(`.skipWhile()`);

    while (true) {
        this.first = this.iterator.next()
        __log(`  skipping ${this.first.value}`);
        if (this.first.done || !predicate(this.first.value)) {
            break;
        }
    }
  }

  override next() {
      if (!this.skippedFirst && !!this.first) {
          this.skippedFirst = true;
          return this.first;
      } else {
          return this.iterator.next();
      }
  }
}

class TakeAdapter<T> extends SizedIter<T> {
    private took = 0;

    constructor(protected override iterator: Iterator<T>, private limit: number) {
        super(limit, iterator);
    }

    override next() {
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

class TakeWhileAdapter<T> extends Iter<T> {
    constructor(protected override iterator: Iterator<T>, private predicate: Predicate<T>) {
        super();
    }

   override next() {
        const n = this.iterator.next();
        if (this.predicate(n.value)) {
            return n;
        } else {
            return { value: undefined, done: true } as any;
        }
    }
}

class WithAdapter<T> extends Iter<T> {
    constructor(protected override iterator: Iterator<T>, protected callback: Callback<T, void>) {
        super();
        __log(`.each()`)
    }

    override next() {
        const item = this.iterator.next()
        this.callback(item.value)
        __log(`each -> ${item.value}`);
        return item;
    }
}

class ZipAdapter<T, O> extends Iter<[T, O]> {
    private iterators: [Iterator<T>, Iterator<O>];

    constructor(first: Iterator<T>, other: Iterator<O>) {
        super();
        this.iterators = [first, other];
        __log(`.zip()`)
    }

    override next(): IteratorResult<[T, O]> {
        const a = this.iterators[0].next();
        const b = this.iterators[1].next();
        __log(`.zip() -> [${a.value}, ${b.value}]`)
            return {
                value: [a.value, b.value],
                done: (a.done || b.done)
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

// export function enable_debug_logging() {
//     __log = (content: any) => console.log(`   ${content}`);
// }
