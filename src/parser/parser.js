import { ParserError, SimpleSymbolTable, AT, GOT, AFTER } from "./utils.js"
import { Root, Node, CollectionNode } from "../ast/nodes.js"
import { Token, TokenKind } from "../tokens.js"
import { CompilerContext } from "../context.js"
import { parse_root } from "./parser_nodes.top.js"
import { StreamRange } from "../utils.js"

export class NodeIndexPair {
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

export class ParserContext {
    /**
     * 
     * @param {CompilerContext} context 
     * @param {Token[]} tokens
     */
    constructor(context, tokens) {
        /** @type {CompilerContext} */
        this.context = context
        /** @type {Token[]} */
        this.tokens = tokens
        /** @type {SimpleSymbolTable} */
        this.symbols = new SimpleSymbolTable();
        [
            'void', 'char', 'short', 'int', 'long', 'float', 'double',
            'signed', 'unsigned', '_Bool', 'complex'
        ].forEach(t => this.symbols.add_symbol(t, true))
        /** @type {ParserError} */
        this.best_error = null
        /** @type {?number} token index of the current alternative's cut point, or null if uncommitted -- see {@link ParserContext#cut} */
        this.committed_at = null
    }

    /**
     * Commits the alternative currently being attempted, as of {@link index}:
     * any ParserError raised afterward is tagged `.fatal` by the nearest
     * enclosing {@link ParserContext#first_of}, which re-throws it immediately
     * instead of trying a sibling alternative -- and every first_of further out
     * on the call stack does the same, since the tag travels with the error
     * object through however many frames it unwinds.
     *
     * Call this once a rule has seen something that could only mean it's on the
     * right alternative (e.g. right after matching `if` `(`), so a mistake
     * further in (a malformed condition) is reported as a real syntax error
     * instead of being discarded while first_of tries something that could
     * never have matched in the first place.
     * @param {number} index
     */
    cut(index) {
        this.committed_at = index
    }

    /**
     * 
     * @param {string} err 
     * @param {number} index 
     */
    throw_error_at(err, index) {
        throw new ParserError(err, index, this.tokens, AT)
    }

    // eslint-disable-next-line jsdoc/require-returns-check
    /**
     * 
     * @param {string} err 
     * @param {number} index 
     * @throws {ParserError}
     * @returns {NodeIndexPair}
     */
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
     * @returns {boolean} true if the token is of kind {@link kind}, false if not or if {@link index} is past the list of tokens
     */
    token_is(index, kind) {
        return (this.tokens.length > index) && (this.tokens[index].isKind(kind))
    }

    /**
     * Returns true if the token under {@link index} is of any of the given {@link kinds}
     * @param {number} index 
     * @param {TokenKind[]} kinds 
     * @returns {boolean} true if the token under index is of any of the given kinds
     */
    token_in(index, kinds) {
        return (this.tokens.length > index) && (kinds.filter(kind => this.tokens[index].isKind(kind)).length > 0)
    }

    /**
     * Selects the StreamRange between tokens at index {@link start} and at index {@link end}
     * @param {number} start 
     * @param {number} end 
     * @returns {StreamRange} range spanning both entries
     */
    token_range(start, end) {
        if (this.tokens.length == 0) {
            return new StreamRange(0, 0)
        }
        let start_index = Math.min(start, this.tokens.length - 1, end - 1)
        let end_index = Math.min(end - 1, this.tokens.length - 1)
        return this.tokens[start_index].r.concat(this.tokens[end_index].r)
    }



    /**
     * 
     * @param {ParserContext~memoizeCallback} to_try 
     * @param {ParserContext~memoizeCallback} on_failure 
     * @returns {NodeIndexPair}
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
     * PEG-style ordered choice: tries each rule in {@link rules} in turn, always
     * starting from the same {@link index}, and returns the first one that
     * succeeds. Rolls the symbol table back before each retry (mirroring
     * {@link ParserContext#memoize}) and folds every failure into
     * {@link ParserContext#best_error}, so if all alternatives fail the caller
     * still gets the deepest, most plausible error instead of the last one tried.
     *
     * Only reach for this when the alternatives genuinely can't be told apart
     * without attempting a full parse. If a fixed amount of extra lookahead (or
     * a symbol-table check, e.g. {@link SimpleSymbolTable} for typedef names)
     * can decide the branch, prefer that -- it's cheaper and gives better error
     * messages than discarding a whole failed parse.
     *
     * Respects {@link ParserContext#cut}: if a rule calls `ctx.cut(i)` and then
     * fails, that failure is tagged `.fatal` and re-thrown immediately instead
     * of being backtracked past -- no further alternative here is tried, and
     * every first_of further out on the stack will see the same tag and do the
     * same, so committing deep in a call chain still stops backtracking all the
     * way up.
     * @param {number} index
     * @param {((index:number, ctx:ParserContext)=>NodeIndexPair)[]} rules alternatives to try, in priority order
     * @param {string} [message] used only if every alternative fails and somehow left no error behind
     * @returns {NodeIndexPair}
     */
    first_of(index, rules, message = "expected one of several alternatives") {
        let symbols_bak = structuredClone(this.symbols)
        let committed_bak = this.committed_at
        for (const rule of rules) {
            this.committed_at = null
            try {
                let result = rule(index, this)
                this.committed_at = committed_bak
                return result
            } catch (e) {
                if (!(e instanceof ParserError)) {
                    this.committed_at = committed_bak
                    throw e
                }
                if (!this.best_error || e.amount_parsed >= this.best_error.amount_parsed) {
                    this.best_error = e
                }
                if (this.committed_at !== null) {
                    e.fatal = true
                }
                this.symbols = symbols_bak
                this.committed_at = committed_bak
                if (e.fatal) {
                    throw e
                }
            }
        }
        throw this.best_error || new ParserError(message, index, this.tokens, GOT)
    }

    /**
     * PEG-style sequence lookup: tries accumulating all {@link rules} in sequence, and
     * only succeeds if every single rule is successful
     * @param {number} index 
     * @param {((index:number, ctx:ParserContext)=>NodeIndexPair)[]} rules 
     * @param {string} message 
     * @returns {NodeIndexPair}
     */
    sequence_of(index, rules, message = "expected a sequence of tokens") {
        let symbols_bak = structuredClone(this.symbols)
        try {
            let start = index
            let nodes = []
            for (const rule of rules) {
                let result = rule(index)
                nodes.push(result.node)
                index = result.index
            }
            return new NodeIndexPair(this.finish(new CollectionNode(nodes), start, index), index)
        } catch (e) {
            if (!(e instanceof ParserError)) {
                throw e
            }
            if (!this.best_error || e.amount_parsed >= this.best_error.amount_parsed) {
                this.best_error = e
            }
            this.symbols = symbols_bak
        }
        throw this.best_error || new ParserError(message, index, this.tokens, GOT)
    }

    /**
     * 
     * @param {number} index 
     * @param {((index:number, ctx:ParserContext)=>NodeIndexPair)} rule 
     * @param {number} min 
     * @param {number} max 
     * @param {string} message_min 
     * @param {string} message_max 
     * @param {string} element_name 
     * @returns {NodeIndexPair}
     */
    multiple_of(index, rule, min=0, max=-1, message_min = null, message_max=null, element_name="element") {
        let start = index
        let nodes = []
        let symbols_bak
        let exceeded = false
        for (;;) {
            try {
                symbols_bak = structuredClone(this.symbols)
                let result = rule(index)
                if (max > 0 && max >= nodes.length) {
                    exceeded = true;
                    throw new ParserError(message_max || `exceeded ${max} matches of ${element_name}`, index, this.tokens, AT)
                }
                nodes.push(result.node)
                index = result.index
            } catch (e) {
                if (!(e instanceof ParserError)) {
                    throw e
                }
                this.symbols = symbols_bak
                if (!exceeded) {
                    if (nodes.length >= min) {
                        return new NodeIndexPair(this.finish(new CollectionNode(nodes), start, index), index)
                    }
                    if (!this.best_error || index >= this.best_error.amount_parsed) {
                        this.best_error = new ParserError(message_min || `expected ${min} matches of ${element_name}, got ${nodes.length}`, index, this.tokens, AT)
                    }
                }
                if (!this.best_error || e.amount_parsed >= this.best_error.amount_parsed) {
                    this.best_error = e
                }
                throw this.best_error
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
            message = `expected ${kind.text_repr}`
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
            message = `expected one of ${kinds.map(kind => kind.text_repr).join(", ")}`
        }
        throw new ParserError(message, index, this.tokens, message_type)
    }

    /**
     * 
     * @param {()=>NodeIndexPair} parse_func 
     * @returns {NodeIndexPair}
     */
    with_range(parse_func) {
        return (index) => {
            let start_index = index
            /** @type {NodeIndexPair} */
            let result = parse_func()
            result.node.r = this.token_range(start_index, result.index)
            return result
        }
    }

    /**
     * Sets the source range on a freshly built node and returns it
     * @param {Node} node the node to stamp with a range
     * @param {number} start_index first token index of the node
     * @param {number} end_index index just past the last token of the node
     * @returns {Node} the same node, with {@link Node#r} set
     */
    finish(node, start_index, end_index) {
        node.r = this.token_range(start_index, end_index)
        return node
    }

    /**
     * @param {number} index
     * @returns {?TokenKind} the kind of the token at {@link index}, or null past the end
     */
    kind_at(index) {
        return (this.tokens.length > index) ? this.tokens[index].kind : null
    }

}
/**
 * 
 * @param {Token[]} tokens 
 * @param {CompilerContext} context 
 * @returns {?Root}
 */
export function parse(tokens, context) {
    let parser_ctx = new ParserContext(context, tokens)
    let result = parse_root(parser_ctx)
    return result.node
}
