
class RangeAscendingIterator {
    constructor(start, end, increment) {
        this.current = start
        this.end = end
        this.increment = increment
    }
    next() {
        const v = this.current;
        if (v <= this.end) {
            this.current += this.increment;
            return { value: v, done: false }
        }
        return { done: true }
    }
}
class RangeDescendingIterator {
    constructor(start, end, increment) {
        this.current = start
        this.end = end
        this.increment = increment
    }
    next() {
        const v = this.current;
        if (v >= this.end) {
            this.current += this.increment; // this is in effect decreasing the value
            return { value: v, done: false }
        }
        return { done: true }
    }
}


class Range {
    /**
     * Range that can be used as a generator
     * @param {number} start Start value
     * @param {number} end End value
     * @param {number} [increment] Value increment
     */
    constructor(start, end, increment=1) {
        this.start = start
        this.end = end
        this.increment = increment
    }
    [Symbol.iterator]() {
        if (this.increment < 0)
            return new RangeDescendingIterator(this.start, this.end, this.increment)
        return new RangeAscendingIterator(this.start, this.end, this.increment)
    }
}

exports.Range = Range;