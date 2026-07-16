import { LiteralValueLoc } from "./locations.js"
import { IOp } from "./il.js"
import { NotImplementedError } from "../errors.js"

export class Label extends IOp {
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

export class Jump extends IOp {
    constructor(label) {
        super()
        this.label = label
    }
    get inputs() { return [] }
    get outputs() { return [] }
    get targets() { return [this.label,] }
}

class ConditionalJump extends IOp {

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

export class JumpZero extends ConditionalJump {

}

export class JumpNotZero extends ConditionalJump {

}

export class Return extends IOp {
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

