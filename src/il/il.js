const ctypes = require("../ctypes")

class ICode {

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

class ICommand {
    /** @type {IValue[]} */
    get inputs() { throw new Error("Not implemented") }
    /** @type {IValue[]} */
    get outputs() { throw new Error("Not implemented") }
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
        throw new Error("Not implemented")
    }
    is_imm(spot) {

    }
}

exports.ICode = ICode
exports.IValue = IValue
exports.ICommand = ICommand

exports.IntegerLiteral = IntegerLiteral
exports.StringLiteral = StringLiteral
exports.SymbolTable = SymbolTable
exports.SymbolTableDefinitionStatus = SymbolTableDefinitionStatus
exports.SymbolTableLinkage = SymbolTableLinkage
exports.SymbolTableStorageDuration = SymbolTableStorageDuration
