const utils = require("../utils")
const StreamRange = utils.StreamRange
const StreamPosition = utils.StreamPosition
const errors = require("../errors")
const CompilerError = errors.CompilerError
const NotImplementedError = errors.NotImplementedError
const CompilerContext = require("../context").CompilerContext
const nodes = require("../ast/nodes")
const tokens = require("../tokens")
const Token = tokens.Token
const TokenKind = tokens.TokenKind
const format = require("string-format")

const AT = 1
const AFTER = 2
const GOT = 3
class ParserError extends CompilerError {
    /**
     * 
     * @param {string} message 
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
            formatted = format("{message} at the beginning of source", {message: message})
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
                formatted = format("{message} at {token}", {message: message, token: tokens[index].toString()})
                range = tokens[index].r
                break
            case GOT:
                formatted = format("{message}, got {token}", { message: message, token: tokens[index].toString() })
                range = tokens[index].r
                break
            case AFTER:
                if (tokens[index-1].r) {
                    range = new StreamRange(tokens[index - 1].r.end.incr())
                }
                formatted = format("{message} after {token}", { message: message, token: tokens[index-1].toString() })
                break
            }
        }
        super(formatted, range, warn)
        this.amount_parsed = index
    }
}

/**
 * 
 */
class SimpleSymbolTable {
    constructor() {
        /** @type {} */
        this.symbols = []
        this.new_scope()
    }
    new_scope() {
        this.symbols.push(new Array())
    }
    end_scope() {
        this.symbols.pop()
    }
    /**
     * 
     * @param {*} identifier 
     * @param {*} is_typedef 
     */
    add_symbol(identifier, is_typedef) {
        this.symbols[this.symbols.length-1][identifier.context] = is_typedef
    }
}

exports.AT = AT
exports.AFTER = AFTER
exports.GOT = GOT
exports.SimpleSymbolTable = SimpleSymbolTable
exports.ParserError = ParserError