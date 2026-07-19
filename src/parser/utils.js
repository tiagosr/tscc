import { StreamRange } from "../utils.js"
import { CompilerError } from "../errors.js"
import { Token } from "../tokens.js"

const AT = 1
const AFTER = 2
const GOT = 3
class ParserError extends CompilerError {
    /**
     * 
     * @param {String} message 
     * @param {number} index 
     * @param {Token[]} tokens 
     * @param {number} type 
     * @param {boolean} [warn] 
     */
    constructor(message, index, tokens, type, warn=false) {
        let formatted = ""
        /** @type {StreamRange} */
        let range = null
        if (tokens.length == 0) {
            formatted = `${message} at the beginning of source`
        } else if (tokens.length < index) {
            formatted = `${message} at EOF`
        } else {
            if (index >= tokens.length) {
                index = tokens.length
                type = AFTER
            } else if (index < 0) {
                index = 0
                if (type == AFTER) { type = GOT }
            }
            switch (type) {
            case AT:
                formatted = `${message} at ${tokens[index].toString()}`
                range = tokens[index].r
                break
            case GOT:
                formatted = `${message}, got ${tokens[index].toString()}`
                range = tokens[index].r
                break
            case AFTER:
                if (tokens[index-1].r) {
                    range = new StreamRange(tokens[index - 1].r.end.incr())
                }
                formatted =`${message} after ${tokens[index - 1].toString()}`
                break
            }
        }
        super(formatted, range, warn)
        /** @type {number} */
        this.amount_parsed = index
    }
}

/**
 * 
 */
class SimpleSymbolTable {
    constructor() {
        /** @type {{[key:string]:boolean}[]} */
        this.symbols = []
        this.new_scope()
    }

    copy() {
        let new_table = new SimpleSymbolTable()
        new_table.symbols = structuredClone(this.symbols)
        return new_table
    }

    new_scope() {
        this.symbols.push({})
    }
    end_scope() {
        this.symbols.pop()
    }
    /**
     * 
     * @param {string} identifier 
     * @param {boolean} is_typedef 
     */
    add_symbol(identifier, is_typedef) {
        this.symbols[this.symbols.length-1][identifier] = is_typedef
    }

    /**
     * 
     * @param {string} identifier 
     * @returns {boolean} true if symbol is defined in any of the scopes, false otherwise
     */
    is_symbol_defined(identifier) {
        return this.symbols.findLastIndex(symbols => identifier in symbols) !== -1
    }

    /**
     * 
     * @param {string} identifier 
     * @returns true if symbol was registered as a typedef already, false otherwise
     */
    is_symbol_typedef(identifier) {
        const found = this.symbols.findLast(syms => identifier in syms)
        if (found !== undefined) {
            return found[identifier]
        }
        return false
    }
}

export { AT, AFTER, GOT, SimpleSymbolTable, ParserError }