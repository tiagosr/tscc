const ctypes = require("../ctypes")
const NotImplementedError = require("../errors").NotImplementedError
const CompilerContext = require("../context").CompilerContext
const control_ops = require("./control")
const locs = require("./locations")

class ILContext {

    /**
     * 
     * @param {CompilerContext} context 
     */
    constructor(context) {
        this.context = context
        /** @type {Object.<string,IOp[]>} */
        this.ops = {}
        /** @type {string} */
        this.cur_func = null
        this.label_num = 0
        this.static_inits = {}
        this.literals = {}
        this.string_literals = {}
    }

    copy() {
        let new_il_context = new ILContext(this.context)

        new_il_context.ops = {}
        for (const name in this.ops) {
            if (this.ops.hasOwnProperty(name)) {
                new_il_context.ops[name] = [...this.ops[name]]
            }
        }
        new_il_context.cur_func = this.cur_func
        new_il_context.label_num = this.label_num
        new_il_context.static_inits = Object.assign({}, this.static_inits)
        new_il_context.literals = Object.assign({},this.literals)
        new_il_context.string_literals = Object.assign({}, this.string_literals)
        return new_il_context
    }

    /**
     * Adds an IOp to the list for the current function
     * @param {IOp} op 
     */
    add(op) {
        this.ops[this.cur_func].push(op)
    }

    get always_returns() {
        let cur_func_ops = this.ops[this.cur_func]
        if (cur_func_ops) {
            if (cur_func_ops[cur_func_ops.length-1] instanceof control_ops.Return) {
                return true
            }
        }
        return false
    }
}



class IValue {
    /**
     * 
     * @param {ctypes.CType} ctype 
     */
    constructor(ctype) {
        this.ctype = ctype
        this.literal = null
    }
}

class Literal {
    constructor(val) { this.val = val }
}
class IntegerLiteral extends Literal { }
class StringLiteral extends Literal { }

/**
 * @readonly
 * @enum {number}
 */
const SymbolTableDefinitionStatus = {
    UNDEFINED: 0,
    TENTATIVE: 1,
    DEFINED:   2
}
Object.freeze(SymbolTableDefinitionStatus)

/**
 * @readonly
 * @enum {number}
 */
const SymbolTableLinkage = {
    INTERNAL: 0,
    EXTERNAL: 1
}
Object.freeze(SymbolTableLinkage)

/**
 * @readonly
 * @enum {number}
 */
const SymbolTableStorageDuration = {
    STATIC: 0,
    AUTOMATIC: 1
}
Object.freeze(SymbolTableStorageDuration)

class SymbolTableNamespaces {
    constructor() {
        this.vars = {}
        this.structs = {}
    }
}

class SymbolTable {
    constructor() {
        /** @type {SymbolTableNamespaces[]} */
        this.tables = []
        /** @type {Object.<IValue,number>} */
        this.linkage_type = {}
        /** @type {Object.<number,Object.<string, IValue>>} */
        this.linkages = {
            [SymbolTableLinkage.INTERNAL]: {},
            [SymbolTableLinkage.EXTERNAL]: {}
        }
        /** @type {Object.<IValue,SymbolTableDefinitionStatus>} */
        this.def_state = {}

        /** @type {Object.<IValue,string>} */
        this.names = {}
    }
}

class IOp {
    /** @type {IValue[]} */
    get inputs() { throw new NotImplementedError() }
    /** @type {IValue[]} */
    get outputs() { throw new NotImplementedError() }
    /** @type {IValue[]} */
    get clobbers() { return [] }
    get rel_spot_conflicts() { return {} }
    get abs_spot_conflicts() { return {} }
    get rel_spot_prefs() { return {} }
    get abs_spot_prefs() { return {} }
    /** @type {Object.<IValue,IValue[]>} */
    get references() { return {} }
    /** @type {IValue[]} */
    get indirect_write_vals() { return [] }
    /** @type {IValue[]} */
    get indirect_read_vals() { return [] }
    /** @type {?string} */
    get label_name() { return null }
    get targets() { return [] }
    make_asm(spot_map, home_spots, get_reg, asm_code) {
        throw new NotImplementedError()
    }
    is_imm(loc) {
        return (loc instanceof locs.LiteralValueLoc)
    }
    is_imm8(loc) {
        return this.is_imm(loc) && parseInt(loc.detail) < ctypes.unsigned_char_max
    }
    is_imm16(loc) {
        return this.is_imm(loc) && parseInt(loc.detail) < ctypes.unsigned_short_max
    }
}

class RelLocConflict {
    /**
     * 
     * @param {locs.Loc} target 
     * @param {locs.Loc[]} sources 
     */
    constructor(target, sources) {
        this.target = target
        this.sources = sources
    }
}

exports.ILContext = ILContext
exports.IValue = IValue
exports.IOp = IOp

exports.IntegerLiteral = IntegerLiteral
exports.StringLiteral = StringLiteral
exports.SymbolTable = SymbolTable
exports.SymbolTableDefinitionStatus = SymbolTableDefinitionStatus
exports.SymbolTableLinkage = SymbolTableLinkage
exports.SymbolTableStorageDuration = SymbolTableStorageDuration

exports.RelLocConflict = RelLocConflict