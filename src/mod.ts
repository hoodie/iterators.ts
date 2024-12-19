/**
 * This module provides a lazy iterator interface.
 */

/**
 * Callback function passed to the `map` method.
 */
export type Callback<T, U> = (input: T) => U;

/**
 * Predicate function passed to the `filter` method.
 */
export type Predicate<T> = (input: T) => boolean;

// const __dir = (content: any) => console.dir(content, {colors: true, depth: 10});
// deno-lint-ignore no-explicit-any
const __dir = (_content: any) => {};
// deno-lint-ignore no-explicit-any
let __log = (_content: any) => {};

/// Interface
/**
 * This is the main iterator interface.
 */
export interface LazyIterator<T> extends Iterator<T>, Iterable<T> {
  /**
   * Advances the iterator and returns the next value.
   * Iterators conform to the [iterator protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol).
   */
  next(): IteratorResult<T>;

  /// Adapters

  // chain<U extends ProperIterator><other: U>: ProperIterator<T>;

  /**
   * Creates an iterator which yields the current index and the value of the original iterator.
   */
  enumerate(): LazyIterator<[number, T]>;

  /**
   * Creates an iterator skipping all elements which don't meet the given predicate.
   */
  filter(predicate: Predicate<T>): LazyIterator<T>;

  /**
   * Finds the first element that satisfies the predicate.
   */
  find(predicate: Predicate<T>): T | undefined;

  /**
   * Creates an iterator applying the given callback to each element.
   */
  map<V, U extends [number, V]>(
    callback: Callback<T, U>,
  ): LazyIterator<[number, V]>;
  map<U>(callback: Callback<T, U>): LazyIterator<U>;

  // max / min
  // partition
  // rev (requires double ended iterator)
  // step_by(step: number): number;

  /**
   * Creates an iterator skipping the first `limit` elements.
   */
  skip(limit: number): LazyIterator<T>;
  /**
   * Creates an iterator skipping elements while predicate is `true`.
   */
  skipWhile(predicate: Predicate<T>): LazyIterator<T>;

  /**
   * Creates an iterator yielding the first `limit` elements.
   */
  take(limit: number): SizedLazyIterator<T>;

  /**
   * Creates an iterator yielding elements while predicate is `true`.
   */
  takeWhile(predicate: Predicate<T>): LazyIterator<T>;

  // window

  /* like map, without modifying elements*/
  with(callback: Callback<T, void>): LazyIterator<T>;

  /**
   * Creates an Iterator that ‘Zips up’ two iterators into a single iterator of pairs.
   */
  zip<O>(other: LazyIterator<O>): LazyIterator<[T, O]>;
  // alter<O>(other: LazyIterator<O>): LazyIterator<T | O>;

  /// consumers

  // count(): T // TODO count next() until done and throw if count >= Number.MAX_SAFE_INTEGER
  // nth(index: number): T;
  // sum(acc: T, callback: (a: T, b: T) => T):  T;
  // fold(acc: T, callback: (a: T, b: T) => T):  T;

  /**
   * Collects all elements into an array.
   */
  intoArray(): Array<T>;
}

export interface SizedLazyIterator<T> extends LazyIterator<T> {
  /**
   * Returns the number of elements in the iterator.
   */
  count(): number;

  chain<U>(successor: Iterator<U>): LazyIterator<T | U>;

  /**
   * Creates an iterator that cycles through the elements of the original iterator.
   * It will return the first element again once the last element has been returned.
   */
  cycle(): LazyIterator<T>;

  /**
   * Returns the last element of the iterator.
   */
  last(): T | undefined;

  /**
   * Returns the number of elements in the iterator.
   */
  sizeHint(): number;
}

/**
 * Base Iterator.
 * Yields elements from an inner iterator.
 * Conforms to the [iterator protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterator_protocol).
 */
export class Iter<T> implements LazyIterator<T> {
  /**
   * Creates an iterator from an array.
   */
  static fromArray<T>(a: Array<T>): SizedLazyIterator<T> {
    return new SizedIter(a.length, a[Symbol.iterator]());
  }

  /**
   * Creates an iterator that counts from 1 to `limit`.
   * @param limit
   * @returns SizedLazyIterator<number>
   */
  static countTo(limit: number): SizedLazyIterator<number> {
    return new SizedIter(limit, inner_count_to(limit));
  }

  // deno-lint-ignore no-explicit-any
  constructor(protected iterator?: Iterator<any>) {}

  [Symbol.iterator](): Iter<T> {
    return this;
  }

  /// Iterable Protocol
  next(value?: T): IteratorResult<T> {
    if (this.iterator) {
      return this.iterator.next(value);
    } else {
      return { value: undefined, done: true };
    }
  }

  /// adapters

  /**
   * Creates an iterator which yields the current index and the value of the original iterator.
   * @returns LazyIterator<[number, T]>
   */
  enumerate(): EnumerateAdapter<T> {
    return new EnumerateAdapter(this);
  }

  /**
   * Creates an iterator skipping all elements which don't meet the given predicate.
   * @param predicate
   * @returns
   */
  filter(predicate: Predicate<T>): FilterAdapter<T> {
    return new FilterAdapter(this, predicate);
  }

  /**
   * Finds the first element that satisfies the predicate.
   */
  find(predicate: Predicate<T>): T | undefined {
    const { value, done } = this.skipWhile((x) => !predicate(x)).next();
    if (done) {
      return undefined;
    }
    return value;
  }

  /**
   * Creates an iterator applying the given callback to each element.
   */
  map<U>(callback: Callback<T, U>): MapAdapter<T, U> {
    return new MapAdapter<T, U>(this, callback);
  }

  /**
   * Creates an iterator yielding the first `limit` elements.
   */
  take(limit: number): TakeAdapter<T> {
    return new TakeAdapter(this, limit);
  }

  /**
   * Creates an iterator skipping the first `limit` elements.
   */
  skip(limit: number): SkipAdapter<T> {
    return new SkipAdapter(this, limit);
  }

  /**
   * Creates an iterator skipping elements while predicate is `true`.
   */
  skipWhile(predicate: Predicate<T>): SkipWhileAdapter<T> {
    return new SkipWhileAdapter(this, predicate);
  }

  /**
   * Creates an iterator yielding the first `limit` elements.
   */
  takeWhile(predicate: Predicate<T>): TakeWhileAdapter<T> {
    return new TakeWhileAdapter(this, predicate);
  }

  /**
   * Creates an iterator yielding elements while predicate is `true`.
   */
  with(callback: Callback<T, void>): WithAdapter<T> {
    return new WithAdapter(this, callback);
  }

  /**
   * Creates an Iterator that ‘Zips up’ two iterators into a single iterator of pairs.
   * @param other
   * @returns
   */
  zip<O>(other: LazyIterator<O>): LazyIterator<[T, O]> {
    return new ZipAdapter<T, O>(this, other);
  }

  /// consumers

  /**
   * Collects all elements into an array.
   * @returns Array<T>
   */
  intoArray(): T[] {
    //return [...this];
    const all = [];
    let next: IteratorResult<T> | undefined;
    while (!next || !next.done) {
      next = this.next();
      if (next.done) {
        break;
      }
      all.push(next.value);
    }
    return all;
  }
}

class SizedIter<T> extends Iter<T> implements SizedLazyIterator<T> {
  private __lastElement?: T;

  constructor(
    protected size: number,
    protected override iterator: Iterator<T>,
  ) {
    super();
  }

  count(): number {
    return this.sizeHint();
  }

  chain<U>(successor: Iterator<U>): ChainAdapter<T, U> {
    return new ChainAdapter(this, successor);
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
      const n = this.iterator!.next();
      __dir({ n, v });
      if (n.done) {
        this.__lastElement = v;
        return v;
      }
      v = n.value;
    }
  }

  sizeHint(): number {
    return this.size;
  }

  override intoArray(): T[] {
    const all = new Array<T>(this.size);
    let nxt: IteratorResult<T> | undefined;
    let i = 0;
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

class ChainAdapter<T, U> extends Iter<T | U> {
  constructor(
    protected override iterator: Iterator<T>,
    private successor: Iterator<U>,
  ) {
    super();
    __log(`.chain()`);
  }

  override next(): IteratorResult<T | U> {
    const next = this.iterator.next();

    if (next.done) {
      return this.successor.next();
    } else {
      return next;
    }
  }
}
class CycleAdapter<T> extends Iter<T> {
  private cache: Array<T>;

  constructor(protected override iterator: Iterator<T>) {
    super();
    __log(`.cycle()`);
    this.cache = [];
  }

  override next(): IteratorResult<T> {
    const n = this.iterator.next();
    if (n.done) {
      this.iterator = (<Array<T>> this.cache)[Symbol.iterator]();
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
    __log(`.enumerate()`);
  }

  override next(): IteratorResult<[number, T]> {
    const item = this.iterator.next();
    return { value: [this.count++, item.value], done: item.done };
  }
}

class FilterAdapter<T> extends Iter<T> {
  constructor(
    protected override iterator: Iterator<T>,
    protected predicate: Predicate<T>,
  ) {
    super();
    __log(`.filter()`);
  }

  override next(): IteratorResult<T> {
    while (true) {
      const item = this.iterator.next();

      if (item.done) return item;
      if (this.predicate(item.value)) {
        __log(`filter -> ${item.value}`);
        return item;
      }
    }
  }
}

class MapAdapter<T, U> extends Iter<U> {
  constructor(
    protected override iterator: Iterator<T>,
    protected callback: Callback<T, U>,
  ) {
    super();
    __log(`.map()`);
  }

  override next(): IteratorResult<U> {
    const { value, done } = this.iterator.next();

    if (done) {
      // deno-lint-ignore no-explicit-any
      return { value, done } as any;
    }

    const mappedValue: U = this.callback(value);
    __log(`map -> ${mappedValue}`);
    return { value: mappedValue, done };
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

  override next(): IteratorResult<T> {
    const n = this.iterator.next();
    __log(`take -> ${n.value}`);
    return n;
  }
}

class SkipWhileAdapter<T> extends Iter<T> {
  private first: IteratorResult<T> | undefined;
  private skippedFirst = false;

  constructor(
    protected override iterator: Iterator<T>,
    predicate: Predicate<T>,
  ) {
    super();
    __log(`.skipWhile()`);

    while (true) {
      this.first = this.iterator.next();
      __log(`  skipping ${this.first.value}`);
      if (this.first.done || !predicate(this.first.value)) {
        break;
      }
    }
  }

  override next(): IteratorResult<T> {
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

  override next(): IteratorResult<T> {
    if (this.took < this.limit) {
      this.took++;
      const n = this.iterator.next();
      __log(`take -> ${n.value}`);
      return n;
    } else {
      // deno-lint-ignore no-explicit-any
      return { value: undefined, done: true } as any;
    }
  }
}

class TakeWhileAdapter<T> extends Iter<T> {
  constructor(
    protected override iterator: Iterator<T>,
    private predicate: Predicate<T>,
  ) {
    super();
  }

  override next(): IteratorResult<T> {
    const n = this.iterator.next();
    if (this.predicate(n.value)) {
      return n;
    } else {
      // deno-lint-ignore no-explicit-any
      return { value: undefined, done: true } as any;
    }
  }
}

class WithAdapter<T> extends Iter<T> {
  constructor(
    protected override iterator: Iterator<T>,
    protected callback: Callback<T, void>,
  ) {
    super();
    __log(`.each()`);
  }

  override next(): IteratorResult<T> {
    const item = this.iterator.next();
    this.callback(item.value);
    __log(`each -> ${item.value}`);
    return item;
  }
}

class ZipAdapter<T, O> extends Iter<[T, O]> {
  private iterators: [Iterator<T>, Iterator<O>];

  constructor(first: Iterator<T>, other: Iterator<O>) {
    super();
    this.iterators = [first, other];
    __log(`.zip()`);
  }

  override next(): IteratorResult<[T, O]> {
    const a = this.iterators[0].next();
    const b = this.iterators[1].next();
    __log(`.zip() -> [${a.value}, ${b.value}]`);
    return {
      value: [a.value, b.value],
      done: (a.done || b.done),
    };
  }
}

/// utilities

// deno-lint-ignore no-unused-vars
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
  // deno-lint-ignore no-explicit-any
  __log = (content: any) => console.log(`   ${content}`);
}
