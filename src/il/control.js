const locations = require("./locations")
const il = require("./il")
const LiteralValueLoc = locations.LiteralValueLoc
const NotImplementedError = require("../errors").NotImplementedError

exports.Label = class Label extends il.IOp {
    /**
     * Label - maps to an assembler label
     * @param {string} label 
     */
    constructor(label) {
        super()
        this.label = label
    }
    get inputs() { return [] }
    get outputs() { return [] }
    get label_name() { return this.label }
}

exports.Jump = class Jump extends il.IOp {
    constructor(label) {
        super()
        this.label = label
    }
    get inputs() { return [] }
    get outputs() { return [] }
    get targets() { return [this.label,] }
}

class ConditionalJump extends il.IOp {

    /**
     * 
     * @param {il.IValue} cond 
     * @param {string} label 
     */
    constructor(cond, label) {
        super()
        this.cond = cond
        this.label = label
    }
    get inputs() { return [this.cond,] }
    get outputs() { return [] }
    get targets() { return [this.label,] }
}

exports.JumpZero = class JumpZero extends ConditionalJump {

}

exports.JumpNotZero = class JumpNotZero extends ConditionalJump {

}

exports.Return = class Return extends il.IOp {
    /**
     * 
     * @param {?il.IValue} arg 
     */
    constructor(arg=null) {
        super()
        this.arg = arg
    }
    get inputs() {
        if (this.arg) {
            return [this.arg]
        } else {
            return []
        }
    }
    /** @type {locations.Loc} */
    get return_loc() { throw new NotImplementedError() }
    get outputs() { return [] }
    get clobbered() { return [] } // TODO: get clobbered register/return location from target config
    get abs_spot_prefs() { return {[this.arg]: []}} // TODO: get return location from target config
    make_asm(loc_map, home_locs, get_reg, asm_code) {

    }
}

