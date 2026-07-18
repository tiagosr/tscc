import { ParserError, SimpleSymbolTable, AT, GOT, AFTER } from "./utils.js"
import { EmptyStatement, ExprStatement } from "../ast/nodes.js"
import { Token, TokenKind } from "../tokens.js"
import { semicolon } from "../token_kinds.js"
import format from "string-format"

class NodeIndexPair {
    /**
     * Stores a node and an index into the tokens list
     * @param {number} index 
     * @param {nodes.Node} node
     */
    constructor(node, index) {
        this.node = node
        this.index = index
    }
}

class ParserContext {
    /**
     * 
     * @param {CompilerContext} context 
     * @param {Token[]} tokens
     */
    constructor(context, tokens) {
        this.context = context
        this.tokens = tokens
        this.symbols = new SimpleSymbolTable()
        /** @type {ParserError} */
        this.best_error = null
    }

    throw_error_at(err, index) {
        throw new ParserError(err, index, this.tokens, AT)
    }

    throw_error_got(err, index) {
        throw new ParserError(err, index, this.tokens, GOT)
    }

    throw_error_after(err, index) {
        throw new ParserError(err, index, this.tokens, AFTER)
    }

    /**
     * Returns true if the token under index is of the given kind
     * @param {number} index 
     * @param {TokenKind} kind 
     */
    token_is(index, kind) {
        return (this.tokens.length > index) && (this.tokens[index].isKind(kind))
    }

    /**
     * Returns true if the token under index is of any of the given kinds
     * @param {number} index 
     * @param {TokenKind[]} kinds 
     */
    token_in(index, kinds) {
        return (this.tokens.length > index) && (kinds.filter(kind => this.tokens[index].isKind(kind)).length > 0)
    }

    /**
     * 
     * @param {number} start 
     * @param {number} end 
     * @returns {StreamRange}
     */
    token_range(start, end) {
        let start_index = Math.min(start, this.tokens.length - 1, end - 1)
        let end_index = Math.min(end - 1, this.tokens.length - 1)
        return this.tokens[start_index].r.concat(this.tokens[end_index].r)
    }



    /**
     * 
     * @param {ParserContext~memoizeCallback} to_try 
     * @param {*} on_failure 
     */
    memoize(to_try, on_failure) {
        /** @type {SimpleSymbolTable} */
        let symbols_bak = structuredClone(this.symbols)
        try {
            return to_try()
        } catch (e) {
            if (e instanceof ParserError) {
                if (!this.best_error || e.amount_parsed >= this.best_error.amount_parsed) {
                    this.best_error = e
                }
                this.symbols = symbols_bak
                return on_failure()
            } else {
                throw e
            }
        }
    }

    /**
     * 
     * @param {number} index 
     * @param {TokenKind} kind 
     * @param {number} message_type 
     * @param {String} [message]
     * @returns {number}
     */
    match_token(index, kind, message_type, message = null) {
        if (this.token_is(index, kind)) {
            return index + 1
        }
        if (!message) {
            message = format("expected '{kind}'", { kind: kind.text_repr })
        }
        throw new ParserError(message, index, this.tokens, message_type)
    }

    /**
     * 
     * @param {number} index 
     * @param {TokenKind[]} kinds 
     * @param {number} message_type 
     * @param {String} [message]
     * @returns {number}
     */
    match_token_kinds(index, kinds, message_type, message = null) {
        if (this.token_in(index, kinds)) {
            return index + 1
        }
        if (!message) {
            message = format("expected one of {kinds}", {
                kinds: kinds.map(function (kind) { return kind.text_repr }).join(", ")
            })
        }
        throw new ParserError(message, index, this.tokens, message_type)
    }

    with_range(parse_func) {
        return (function (index) {
            let start_index = index
            /** @type {NodeIndexPair} */
            let result = parse_func()
            result.node.r = this.token_range(start_index, result.index)
            return result
        })
    }



    parse_statement(index) {
        return this.with_range(() => {
            for (const func of []) {
                //
            }
            return this.parse_expr_statement(index)
        })(index)
    }

    parse_expr_statement(index) {
        return this.with_range(()=> {
            if (this.token_is(index, semicolon)) {
                return new NodeIndexPair(EmptyStatement(), index + 1)
            }
            let expr = this.parse_expression(index)
            expr.index = this.match_token(index, semicolon, AFTER)
            return new NodeIndexPair(ExprStatement(expr.node), index)
        })(index)
    }
    
}
/**
 * 
 * @param {Token[]} tokens 
 * @param {CompilerContext} context 
 * @returns {?nodes.Root}
 */
function parse(tokens, context) {
    let parser_ctx = new ParserContext(context, tokens)
    
    return null
}

export { parse }