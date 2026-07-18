import { ParserError, SimpleSymbolTable, AT, GOT, AFTER } from "./utils.js"
import {
    EmptyStatement, ExprStatement,
    Identifier, NumberLiteral, StringLiteral, Unary, Binary, Assignment, Ternary, Call, Index, Member,
    TypeInstance,
    SymbolDeclaration,
    SymbolDeclarationItem,
    Root,
    Typedef,
    Node,
    TypeIdentifier
} from "../ast/nodes.js"
import { Token, TokenKind } from "../tokens.js"
import {
    semicolon, comma, colon, q_mark,
    identifier_token, number_token, string_token,
    open_paren, close_paren, open_sq_brack, close_sq_brack, dot, arrow,
    equals, plusequals, minusequals, starequals, divequals, modequals,
    ampequals, xorequals, pipeequals, lshiftequals, rshiftequals,
    bool_or, bool_and, pipe, xor, amp,
    equalequal, notequal, lt, gt, lt_eq, gt_eq,
    lshift, rshift, plus, minus, star, slash, mod,
    bool_not, compl, incr, decr, selfcomplement,
    typedef_kw
} from "../token_kinds.js"

/** C binary-operator precedence, low to high (assignment/ternary/comma are handled separately) */
const BINARY_PRECEDENCE = new Map([
    [bool_or, 1],
    [bool_and, 2],
    [pipe, 3],
    [xor, 4],
    [amp, 5],
    [equalequal, 6], [notequal, 6],
    [lt, 7], [gt, 7], [lt_eq, 7], [gt_eq, 7],
    [lshift, 8], [rshift, 8],
    [plus, 9], [minus, 9],
    [star, 10], [slash, 10], [mod, 10],
])

const ASSIGNMENT_OPS = [
    equals, plusequals, minusequals, starequals, divequals, modequals,
    xorequals, pipeequals, ampequals, lshiftequals, rshiftequals
]

const UNARY_PREFIX_OPS = [plus, minus, bool_not, compl, star, amp, incr, decr, selfcomplement]

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

    /**
     * 
     * @param {string} err 
     * @param {number} index 
     */
    throw_error_at(err, index) {
        throw new ParserError(err, index, this.tokens, AT)
    }

    /**
     * 
     * @param {string} err 
     * @param {number} index 
     * @throws {ParserError}
     * @returns {NodeIndexPair}
     */
    throw_error_got(err, index) {
        throw new ParserError(err, index, this.tokens, GOT)
        return new NodeIndexPair(new Node(), index)
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
     * Returns true if the token under index is of any of the given kinds
     * @param {number} index 
     * @param {TokenKind[]} kinds 
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
     * @param {number} index
     * @param {((index:number)=>NodeIndexPair)[]} rules alternatives to try, in priority order
     * @param {string} [message] used only if every alternative fails and somehow left no error behind
     * @returns {NodeIndexPair}
     */
    first_of(index, rules, message = "expected one of several alternatives") {
        let symbols_bak = structuredClone(this.symbols)
        for (const rule of rules) {
            try {
                return rule(index)
            } catch (e) {
                if (!(e instanceof ParserError)) {
                    throw e
                }
                if (!this.best_error || e.amount_parsed >= this.best_error.amount_parsed) {
                    this.best_error = e
                }
                this.symbols = symbols_bak
            }
        }
        throw this.best_error || new ParserError(message, index, this.tokens, GOT)
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



    /**
     * statement: expression-statement
     *
     * TODO: only one alternative exists so far. Once if/while/for/return/compound/
     * declaration statements are written, add them here as further alternatives
     * to first_of, most-specific first, keeping parse_expr_statement last as the
     * catch-all. Alternatives that start with an unambiguous keyword (if, while,
     * return, ...) don't actually need first_of's backtracking -- a plain
     * token_is/token_in dispatch on the leading token is enough and gives better
     * errors. first_of only earns its cost for genuinely ambiguous leads, e.g.
     * telling a declaration (`foo *bar;`) from an expression-statement (`foo * bar;`)
     * apart when `foo` isn't yet known to be a typedef name.
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_statement(index) {
        return this.with_range(() => {
            return this.first_of(index, [
                (i) => this.parse_expr_statement(i),
            ])
        })(index)
    }

    parse_expr_statement(index) {
        return this.with_range(()=> {
            if (this.token_is(index, semicolon)) {
                return new NodeIndexPair(new EmptyStatement(), index + 1)
            }
            let expr = this.parse_expression(index)
            let end = this.match_token(expr.index, semicolon, AFTER)
            return new NodeIndexPair(new ExprStatement(expr.node), end)
        })(index)
    }

    /**
     * expression: assignment-expression
     *
     * TODO: the comma operator isn't handled here yet. It needs to stay out of
     * parse_assignment because call arguments (and later, initializer lists)
     * separate assignment-expressions with bare commas that are NOT the comma
     * operator -- see the argument loop in parse_postfix.
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_expression(index) {
        return this.parse_assignment(index)
    }

    /**
     * assignment-expression: conditional-expression | unary-expression assignment-operator assignment-expression
     *
     * Right-associative: `a = b = c` parses as `a = (b = c)`.
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_assignment(index) {
        let start = index
        let left = this.parse_conditional(index)
        if (this.token_in(left.index, ASSIGNMENT_OPS)) {
            let op = this.kind_at(left.index)
            let right = this.parse_assignment(left.index + 1)
            return new NodeIndexPair(this.finish(new Assignment(op, left.node, right.node), start, right.index), right.index)
        }
        return left
    }

    /**
     * conditional-expression: binary-expression | binary-expression '?' expression ':' conditional-expression
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_conditional(index) {
        let start = index
        let cond = this.parse_binary(index, 1)
        if (this.token_is(cond.index, q_mark)) {
            let then_expr = this.parse_expression(cond.index + 1)
            let colon_index = this.match_token(then_expr.index, colon, AFTER)
            let else_expr = this.parse_conditional(colon_index)
            return new NodeIndexPair(this.finish(new Ternary(cond.node, then_expr.node, else_expr.node), start, else_expr.index), else_expr.index)
        }
        return cond
    }

    /**
     * Precedence-climbing parse of left-associative binary operators, per {@link BINARY_PRECEDENCE}.
     * @param {number} index token index to start at
     * @param {number} min_prec lowest operator precedence this call is allowed to consume
     * @returns {NodeIndexPair}
     */
    parse_binary(index, min_prec) {
        let start = index
        let left = this.parse_unary(index)
        for (;;) {
            let kind = this.kind_at(left.index)
            let prec = kind && BINARY_PRECEDENCE.get(kind)
            if (!prec || prec < min_prec) {
                return left
            }
            let right = this.parse_binary(left.index + 1, prec + 1)
            left = new NodeIndexPair(this.finish(new Binary(kind, left.node, right.node), start, right.index), right.index)
        }
    }

    /**
     * unary-expression: postfix-expression | unary-operator unary-expression
     *
     * TODO: prefix ++/--, sizeof and casts aren't handled here yet -- sizeof and
     * casts both need type-name parsing, which doesn't exist yet.
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_unary(index) {
        let start = index
        if (this.token_in(index, UNARY_PREFIX_OPS)) {
            let op = this.kind_at(index)
            let operand = this.parse_unary(index + 1)
            return new NodeIndexPair(this.finish(new Unary(op, operand.node, true), start, operand.index), operand.index)
        }
        return this.parse_postfix(index)
    }

    /**
     * postfix-expression: primary-expression ( '(' args ')' | '[' expression ']' | '.' id | '->' id | '++' | '--' )*
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_postfix(index) {
        let start = index
        let result = this.parse_primary(index)
        for (;;) {
            if (this.token_is(result.index, open_paren)) {
                let args = []
                let arg_index = result.index + 1
                if (!this.token_is(arg_index, close_paren)) {
                    for (;;) {
                        let arg = this.parse_assignment(arg_index)
                        args.push(arg.node)
                        arg_index = arg.index
                        if (this.token_is(arg_index, comma)) {
                            arg_index += 1
                            continue
                        }
                        break
                    }
                }
                let end = this.match_token(arg_index, close_paren, AFTER)
                result = new NodeIndexPair(this.finish(new Call(result.node, args), start, end), end)
                continue
            }
            if (this.token_is(result.index, open_sq_brack)) {
                let subscript = this.parse_expression(result.index + 1)
                let end = this.match_token(subscript.index, close_sq_brack, AFTER)
                result = new NodeIndexPair(this.finish(new Index(result.node, subscript.node), start, end), end)
                continue
            }
            if (this.token_is(result.index, dot) || this.token_is(result.index, arrow)) {
                let is_arrow = this.token_is(result.index, arrow)
                let name_index = this.match_token(result.index + 1, identifier_token, AFTER, "expected a member name")
                let name = this.tokens[name_index - 1].content
                result = new NodeIndexPair(this.finish(new Member(result.node, name, is_arrow), start, name_index), name_index)
                continue
            }
            if (this.token_in(result.index, [incr, decr])) {
                let op = this.kind_at(result.index)
                let end = result.index + 1
                result = new NodeIndexPair(this.finish(new Unary(op, result.node, false), start, end), end)
                continue
            }
            break
        }
        return result
    }

    /**
     * primary-expression: identifier | number | string | '(' expression ')'
     * @param {number} index
     * @returns {NodeIndexPair}
     */
    parse_primary(index) {
        if (this.token_is(index, identifier_token)) {
            return new NodeIndexPair(this.finish(new Identifier(this.tokens[index].content), index, index + 1), index + 1)
        }
        if (this.token_is(index, number_token)) {
            return new NodeIndexPair(this.finish(new NumberLiteral(this.tokens[index].content), index, index + 1), index + 1)
        }
        if (this.token_is(index, string_token)) {
            return new NodeIndexPair(this.finish(new StringLiteral(this.tokens[index].content), index, index + 1), index + 1)
        }
        if (this.token_is(index, open_paren)) {
            let inner = this.parse_expression(index + 1)
            let end = this.match_token(inner.index, close_paren, AFTER)
            return new NodeIndexPair(inner.node, end)
        }
        return this.throw_error_got("expected expression", index)
    }


    /**
     * 
     * @param {number} index 
     * @returns {NodeIndexPair}
     */
    parse_type(index) {
        if (this.token_is(index, identifier_token)) {
            const id = this.tokens[index].content;
            if (this.symbols.is_symbol_typedef(id)) {
                return new NodeIndexPair(this.finish(new TypeIdentifier(id), index, index + 1), index + 1)
            }
        }
        return this.throw_error_got("expected an already-defined type identifier", index)
    }

    /**
     * 
     * @param {number} index 
     * @returns {NodeIndexPair}
     */
    parse_new_type(index) {
        if (this.token_is(index, identifier_token)) {
            const id = this.tokens[index].content;
            if (!this.symbols.is_symbol_typedef(id)) {
                this.symbols.add_symbol(id, true)
                return new NodeIndexPair(this.finish(new TypeIdentifier(id), index, index + 1), index + 1)
            }
        }
        return this.throw_error_got("expected a previously-undefined type identifier", index)
    }

    /**
     * variable-declaration-item: [ '*' ]* identifier [ array-decl ]* [ '=' initializer ]
     * TODO - for now only:       identifier
     * @param {number} index 
     * @returns {NodeIndexPair}
     */
    parse_sym_decl_item(index) {
        return this.with_range(() => {
            if (this.token_is(index, identifier_token)) {
                return new NodeIndexPair(this.finish(new SymbolDeclarationItem(this.tokens[index].content), index, index+1), index + 1)
            }
            return this.throw_error_got("expected variable identifier", index)
        })(index)
    }

    /**
     * 
     * @param {number} index 
     * @returns {NodeIndexPair}
     */
    parse_sym_decl(index) {
        let start = index;
        let type_node = this.parse_type(index)
        let variable_nodes = [];
        for (;;) {
            let result = this.parse_sym_decl_item(index + 1)
            variable_nodes.push(result.node)
            index = result.index
            if (this.token_is(index, semicolon)) {
                index++;
                break;
            } else if (this.token_is(index, colon)) {
                index++;
            }
        }
        return new NodeIndexPair(this.finish(new SymbolDeclaration(variable_nodes, type_node), start, index))
    }

    /**
     * type definition: 'typedef' ( function-pointer-signature |
     *                              type-then-name )
     * @param {number} index 
     * @returns {NodeIndexPair}
     */
    parse_typedef(index) {
        if (this.token_is(index, typedef_kw)) {
            this.throw_error_got("expected 'typedef'", index)
        }
        const type_result = this.first_of(index + 1, [
            i => this.parse_type(i)
        ], "expected a type definition after 'typedef'")
        /** @type {TypeInstance} */
        const spec = type_result.node

        const new_typename_result = this.parse_new_type(type_result.index)
        /** @type {TypeIdentifier} */
        const typeid = new_typename_result.node

        return new NodeIndexPair(this.finish(new Typedef(typeid, spec), index, new_typename_result.index), new_typename_result.index)
    }


    /**
     * root: ( typedef | symbol-declaration | function-declaration | function-definition )*
     * @returns {NodeIndexPair}
     */
    parse_root() {
        let index = 0
        let items = []
        for (;;) {
            if (index >= this.tokens.length) {
                break;
            }
            let result = this.first_of(index, [
                i => this.parse_sym_decl(i),
            ], "expected top-level statement (type/variable/function declaration)")
            items.push(result.node)
            index = result.index
        }
        return new NodeIndexPair(this.finish(new Root(items), 0, index))
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
    let result = parser_ctx.parse_root()
    
    return result.node
}

export { parse, ParserContext }