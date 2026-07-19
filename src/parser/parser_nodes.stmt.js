import { 
    Assignment, Binary, Call, EmptyStatement, ExprStatement,
    Identifier, Index, Member, NumberLiteral, StringLiteral,
    Ternary, Unary 
} from "../ast/nodes.js"
import { NodeIndexPair, ParserContext } from "./parser.js"
import { AFTER } from "./utils.js"
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
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_statement = (index, ctx) => {
    return ctx.with_range(() => {
        return ctx.first_of(index, [
            parse_expr_statement,
        ])
    })(index)
}


export const parse_expr_statement = (index, ctx) => {
    return ctx.with_range(()=> {
        if (ctx.token_is(index, semicolon)) {
            return new NodeIndexPair(new EmptyStatement(), index + 1)
        }
        let expr = parse_expression(index, ctx)
        let end = ctx.match_token(expr.index, semicolon, AFTER)
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
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_expression = (index, ctx) => {
    return parse_assignment(index, ctx)
}

/**
 * assignment-expression: conditional-expression | unary-expression assignment-operator assignment-expression
 *
 * Right-associative: `a = b = c` parses as `a = (b = c)`.
 * @param {number} index
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_assignment = (index, ctx) => {
    let start = index
    let left = parse_conditional(index, ctx)
    if (ctx.token_in(left.index, ASSIGNMENT_OPS)) {
        let op = ctx.kind_at(left.index)
        let right = parse_assignment(left.index + 1, ctx)
        return new NodeIndexPair(ctx.finish(new Assignment(op, left.node, right.node), start, right.index), right.index)
    }
    return left
}

/**
 * conditional-expression: binary-expression | binary-expression '?' expression ':' conditional-expression
 * @param {number} index
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_conditional = (index, ctx) => {
    let start = index
    let cond = parse_binary(index, 1, ctx)
    if (ctx.token_is(cond.index, q_mark)) {
        let then_expr = parse_expression(cond.index + 1, ctx)
        let colon_index = ctx.match_token(then_expr.index, colon, AFTER)
        let else_expr = parse_conditional(colon_index, ctx)
        return new NodeIndexPair(ctx.finish(new Ternary(cond.node, then_expr.node, else_expr.node), start, else_expr.index), else_expr.index)
    }
    return cond
}

/**
 * Precedence-climbing parse of left-associative binary operators, per {@link BINARY_PRECEDENCE}.
 * @param {number} index token index to start at
 * @param {number} min_prec lowest operator precedence this call is allowed to consume
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_binary = (index, min_prec, ctx) => {
    let start = index
    let left = parse_unary(index, ctx)
    for (;;) {
        let kind = ctx.kind_at(left.index)
        let prec = kind && BINARY_PRECEDENCE.get(kind)
        if (!prec || prec < min_prec) {
            return left
        }
        let right = parse_binary(left.index + 1, prec + 1, ctx)
        left = new NodeIndexPair(ctx.finish(new Binary(kind, left.node, right.node), start, right.index), right.index)
    }
}

/**
 * unary-expression: postfix-expression | unary-operator unary-expression
 *
 * TODO: prefix ++/--, sizeof and casts aren't handled here yet -- sizeof and
 * casts both need type-name parsing, which doesn't exist yet.
 * @param {number} index
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_unary = (index, ctx) => {
    let start = index
    if (ctx.token_in(index, UNARY_PREFIX_OPS)) {
        let op = ctx.kind_at(index)
        let operand = parse_unary(index + 1, ctx)
        return new NodeIndexPair(ctx.finish(new Unary(op, operand.node, true), start, operand.index), operand.index)
    }
    return parse_postfix(index, ctx)
}


/**
 * postfix-expression: primary-expression ( '(' args ')' | '[' expression ']' | '.' id | '->' id | '++' | '--' )*
 * @param {number} index
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_postfix = (index, ctx) => {
    let start = index
    let result = parse_primary(index, ctx)
    for (;;) {
        if (ctx.token_is(result.index, open_paren)) {
            let args = []
            let arg_index = result.index + 1
            if (!ctx.token_is(arg_index, close_paren)) {
                for (;;) {
                    let arg = parse_assignment(arg_index, ctx)
                    args.push(arg.node)
                    arg_index = arg.index
                    if (ctx.token_is(arg_index, comma)) {
                        arg_index += 1
                        continue
                    }
                    break
                }
            }
            let end = ctx.match_token(arg_index, close_paren, AFTER)
            result = new NodeIndexPair(ctx.finish(new Call(result.node, args), start, end), end)
            continue
        }
        if (ctx.token_is(result.index, open_sq_brack)) {
            let subscript = parse_expression(result.index + 1, this)
            let end = ctx.match_token(subscript.index, close_sq_brack, AFTER)
            result = new NodeIndexPair(ctx.finish(new Index(result.node, subscript.node), start, end), end)
            continue
        }
        if (ctx.token_is(result.index, dot) || ctx.token_is(result.index, arrow)) {
            let is_arrow = ctx.token_is(result.index, arrow)
            let name_index = ctx.match_token(result.index + 1, identifier_token, AFTER, "expected a member name")
            let name = ctx.tokens[name_index - 1].content
            result = new NodeIndexPair(ctx.finish(new Member(result.node, name, is_arrow), start, name_index), name_index)
            continue
        }
        if (ctx.token_in(result.index, [incr, decr])) {
            let op = ctx.kind_at(result.index)
            let end = result.index + 1
            result = new NodeIndexPair(ctx.finish(new Unary(op, result.node, false), start, end), end)
            continue
        }
        break
    }
    return result
}

/**
 * primary-expression: identifier | number | string | '(' expression ')'
 * @param {number} index
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_primary = (index, ctx) => {
    if (ctx.token_is(index, identifier_token)) {
        return new NodeIndexPair(ctx.finish(new Identifier(ctx.tokens[index].content), index, index + 1), index + 1)
    }
    if (ctx.token_is(index, number_token)) {
        return new NodeIndexPair(ctx.finish(new NumberLiteral(ctx.tokens[index].content), index, index + 1), index + 1)
    }
    if (ctx.token_is(index, string_token)) {
        return new NodeIndexPair(ctx.finish(new StringLiteral(ctx.tokens[index].content), index, index + 1), index + 1)
    }
    if (ctx.token_is(index, open_paren)) {
        let inner = parse_expression(index + 1, ctx)
        let end = ctx.match_token(inner.index, close_paren, AFTER)
        return new NodeIndexPair(inner.node, end)
    }
    return ctx.throw_error_got("expected expression", index)
}
