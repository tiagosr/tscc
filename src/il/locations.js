class Loc {
    /**
     * 
     * @param {?any} detail 
     */
    constructor(detail=null) {
        this.detail = detail
    }
    base_ptr_offset() { return 0 }
    shift(chunk, count=null) {
        if (chunk || count) {
            throw new Error("Not implemented")
        }
        return this
    }
    /**
     * 
     * @param {Loc} other 
     */
    equals(other) {
        return (
            (this.__prototype__ == other.__prototype__) ||
            (this.detail == other.detail))
    }
}

class RegLoc extends Loc {
    /**
     * 
     * @param {string} name 
     */
    constructor(name) {
        super(name)
        this.name = name
    }
}

class MemLoc extends Loc {
    /**
     * 
     * @param {?Loc} base 
     * @param {number} offset 
     * @param {number} chunk 
     * @param {?number} count
     */
    constructor(base, offset=0, chunk=0, count=null) {
        super([base, offset, chunk, count])
        this.base = base
        this.offset = offset
        this.chunk = chunk
        this.count = count
    }
    base_ptr_offset() { return 0 }
}

class BaseRegMemLoc extends MemLoc {
    base_ptr_offset() { return -this.offset }
}

class LiteralValueLoc extends Loc {
    /**
     * 
     * @param {number} value 
     */
    constructor(value) {
        super(value)
        this.value = value
    }
}

exports.Loc = Loc
exports.RegLoc = RegLoc
exports.MemLoc = MemLoc
exports.BaseRegMemLoc = BaseRegMemLoc
exports.LiteralValueLoc = LiteralValueLoc