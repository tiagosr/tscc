
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
class StreamPosition {
    /**
     * 
     * @param {string} stream Name of the stream within which this position points
     * @param {number} line Line number in the stream at which this position points
     * @param {number} column Horizontal index within the line at which this position points
     * @param {string} full_line Full text of the line containing this position
     */
    constructor(stream, line, column, full_line) {
        this.stream = stream
        this.line = line
        this.column = column
        this.full_line = full_line
    }
    incr() {
        return new StreamPosition(this.stream, this.line, this.col + 1, this.full_line)
    }
}
class StreamRange {
    /**
     * 
     * @param {StreamPosition} start Start position, inclusive
     * @param {?StreamPosition} [end] End position, inclusive
     */
    constructor(start, end = null) {
        this.start = start
        this.end = end || start
    }
    /**
     * 
     * @param {StreamRange} other 
     */
    concat(other) {
        return new StreamRange(this.start, other.end)
    }
}

exports.StreamPosition = StreamPosition;
exports.StreamRange = StreamRange;
exports.Range = Range;
