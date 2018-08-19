class Loc {
    /**
     * 
     * @param {*} context 
     * @param {any} detail 
     */
    constructor(context, detail) {
        this.context = context
        this.detail = detail
    }
    /**
     * 
     * @param {number} size 
     * @returns {string}
     */
    asm_str(size) {
        throw new Error("Not implement")
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
    constructor(name) {
        super(name)
        this.name = name
    }


}

class MemLoc extends Loc {
    /**
     * 
     * @param {?Loc} base 
     * @param {} offset 
     * @param {*} chunk 
     * @param {*} count 
     */
    constructor(context, base, offset=0, chunk=0, count=null) {
        super(context, [base, offset, chunk, count])
        this.base = base
        this.offset = offset
        this.chunk = chunk
        this.count = count
    }
    asm_str(size) {
        let base_str = this.base.asm_str()
        if (this.base instanceof Loc) {
            base_str = this.base.asm_str(0)
        }
    }
    base_ptr_offset() {
        /*
        if (this.base == )

         */
        return 0
    }
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
    asm_str(size) {
        return this.value
    }
}

exports.Loc = Loc
exports.RegLoc = RegLoc
exports.MemLoc = MemLoc
exports.LiteralValueLoc = LiteralValueLoc