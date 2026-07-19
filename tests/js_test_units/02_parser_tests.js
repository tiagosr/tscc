import assert from "node:assert/strict"

import { tokenize } from "../../src/lexer.js"
import { Config, CompilerContext } from "../../src/context.js"
import { CompilationTarget } from "../../src/target.js"
import { ParserContext } from "../../src/parser/parser.js"
import { ParserError } from "../../src/parser/utils.js"
import {
    parse_assignment, parse_binary, parse_conditional, parse_expr_statement, parse_expression,
    parse_postfix, parse_primary, parse_statement, parse_unary
} from "../../src/parser/parser_nodes.stmt.js"

/**
 * @returns {CompilerContext}
 */
function make_context() {
    const config = new Config("/virtual", true)
    const target = new CompilationTarget()
    return new CompilerContext(config, target)
}

/**
 * Tokenizes {@link source} and builds a fresh ParserContext over the result.
 * @param {string} source
 * @returns {ParserContext}
 */
function parser_for(source) {
    const context = make_context()
    const tokens = tokenize(source, "<test>", context)
    return new ParserContext(context, tokens)
}

/**
 * Reduces an AST node to a plain, comparable object (drops source ranges).
 * @param {*} node
 * @returns {*}
 */
function shape(node) {
    if (Array.isArray(node)) {
        return node.map(shape)
    }
    if (node === null || node === undefined) {
        return node
    }
    switch (node.constructor.name) {
    case "Identifier":
        return { type: "Identifier", name: node.name }
    case "NumberLiteral":
        return { type: "Number", raw: node.raw }
    case "StringLiteral":
        return { type: "String", raw: node.raw }
    case "Unary":
        return { type: "Unary", op: node.op.text_repr, prefix: node.prefix, expr: shape(node.expr) }
    case "Binary":
        return { type: "Binary", op: node.op.text_repr, left: shape(node.left), right: shape(node.right) }
    case "Assignment":
        return { type: "Assignment", op: node.op.text_repr, target: shape(node.target), value: shape(node.value) }
    case "Ternary":
        return { type: "Ternary", cond: shape(node.cond), then_expr: shape(node.then_expr), else_expr: shape(node.else_expr) }
    case "Call":
        return { type: "Call", callee: shape(node.callee), args: shape(node.args) }
    case "Index":
        return { type: "Index", target: shape(node.target), index: shape(node.index) }
    case "Member":
        return { type: "Member", target: shape(node.target), name: node.name, arrow: node.arrow }
    case "EmptyStatement":
        return { type: "EmptyStatement" }
    case "ExprStatement":
        return { type: "ExprStatement", expr: shape(node.expr) }
    default:
        throw new Error("shape: unhandled node type " + node.constructor.name)
    }
}

const id = (name) => ({ type: "Identifier", name })
const num = (raw) => ({ type: "Number", raw })

describe("parser", function() {

    describe("parse_primary", function() {
        it("parses an identifier", function() {
            const p = parser_for("foo")
            const result = parse_primary(0, p)
            assert.deepEqual(shape(result.node), id("foo"))
            assert.equal(result.index, 1)
        })

        it("parses a number literal", function() {
            const p = parser_for("42")
            const result = parse_primary(0, p)
            assert.deepEqual(shape(result.node), num("42"))
            assert.equal(result.index, 1)
        })

        it("parses a string literal", function() {
            const p = parser_for("\"hi\"")
            const result = parse_primary(0, p)
            // the lexer's string-token content is the char codes plus a trailing NUL, not a JS string
            assert.deepEqual(shape(result.node), { type: "String", raw: [104, 105, 0] })
            assert.equal(result.index, 1)
        })

        it("parses a parenthesized expression, unwrapped", function() {
            const p = parser_for("(a)")
            const result = parse_primary(0, p)
            assert.deepEqual(shape(result.node), id("a"))
            assert.equal(result.index, 3)
        })

        it("recurses through nested parentheses", function() {
            const p = parser_for("((a))")
            const result = parse_primary(0, p)
            assert.deepEqual(shape(result.node), id("a"))
            assert.equal(result.index, 5)
        })

        it("throws a ParserError when nothing expression-shaped is there", function() {
            const p = parser_for(";")
            assert.throws(function() { parse_primary(0, p) }, ParserError)
        })

        it("throws a ParserError on an unmatched '('", function() {
            const p = parser_for("(a")
            assert.throws(function() { parse_primary(0, p) }, ParserError)
        })

        it("sets a source range spanning the parsed tokens", function() {
            const p = parser_for("foo")
            const result = parse_primary(0, p)
            assert.notEqual(result.node.r, null)
            assert.equal(result.node.r.start.column, p.tokens[0].r.start.column)
        })
    })

    describe("parse_postfix", function() {
        it("falls through to a bare primary expression", function() {
            const p = parser_for("a")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), id("a"))
        })

        it("parses a call with no arguments", function() {
            const p = parser_for("f()")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Call", callee: id("f"), args: [] })
            assert.equal(result.index, 3)
        })

        it("parses a call with several arguments", function() {
            const p = parser_for("f(a, b, 1)")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Call", callee: id("f"), args: [id("a"), id("b"), num("1")]
            })
        })

        it("parses array subscripting", function() {
            const p = parser_for("a[1]")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Index", target: id("a"), index: num("1") })
        })

        it("parses member access with '.'", function() {
            const p = parser_for("a.b")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Member", target: id("a"), name: "b", arrow: false })
        })

        it("parses member access with '->'", function() {
            const p = parser_for("a->b")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Member", target: id("a"), name: "b", arrow: true })
        })

        it("parses postfix increment and decrement", function() {
            let p = parser_for("a++")
            let result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Unary", op: "++", prefix: false, expr: id("a") })

            p = parser_for("a--")
            result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), { type: "Unary", op: "--", prefix: false, expr: id("a") })
        })

        it("chains postfix operators left to right", function() {
            const p = parser_for("a.b[0](x)++")
            const result = parse_postfix(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Unary", op: "++", prefix: false,
                expr: {
                    type: "Call",
                    callee: {
                        type: "Index",
                        target: { type: "Member", target: id("a"), name: "b", arrow: false },
                        index: num("0")
                    },
                    args: [id("x")]
                }
            })
        })

        it("throws a ParserError when a member name is missing", function() {
            const p = parser_for("a.")
            assert.throws(function() { parse_postfix(0, p) }, ParserError)
        })

        it("throws a ParserError on an unterminated call", function() {
            const p = parser_for("f(a")
            assert.throws(function() { parse_postfix(0, p) }, ParserError)
        })
    })

    describe("parse_unary", function() {
        const prefix_ops = ["+", "-", "!", "~", "*", "&", "++", "--", "~~"]
        for (const op of prefix_ops) {
            it(`parses prefix '${op}'`, function() {
                const p = parser_for(`${op}a`)
                const result = parse_unary(0, p)
                assert.deepEqual(shape(result.node), { type: "Unary", op: op, prefix: true, expr: id("a") })
            })
        }

        it("chains prefix operators right to left", function() {
            const p = parser_for("!!a")
            const result = parse_unary(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Unary", op: "!", prefix: true,
                expr: { type: "Unary", op: "!", prefix: true, expr: id("a") }
            })
        })

        it("binds tighter than postfix isn't its job -- postfix runs first on the operand", function() {
            const p = parser_for("-a[0]")
            const result = parse_unary(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Unary", op: "-", prefix: true,
                expr: { type: "Index", target: id("a"), index: num("0") }
            })
        })

        it("falls through to parse_postfix when there is no prefix operator", function() {
            const p = parser_for("a()")
            const result = parse_unary(0, p)
            assert.deepEqual(shape(result.node), { type: "Call", callee: id("a"), args: [] })
        })
    })

    describe("parse_binary", function() {
        it("is left-associative for same-precedence operators", function() {
            const p = parser_for("a - b - c")
            const result = parse_binary(0, 1, p)
            assert.deepEqual(shape(result.node), {
                type: "Binary", op: "-",
                left: { type: "Binary", op: "-", left: id("a"), right: id("b") },
                right: id("c")
            })
        })

        it("binds '*' tighter than '+'", function() {
            const p = parser_for("a + b * c")
            const result = parse_binary(0, 1, p)
            assert.deepEqual(shape(result.node), {
                type: "Binary", op: "+",
                left: id("a"),
                right: { type: "Binary", op: "*", left: id("b"), right: id("c") }
            })
        })

        it("respects parentheses over precedence", function() {
            const p = parser_for("(a + b) * c")
            const result = parse_binary(0, 1, p)
            assert.deepEqual(shape(result.node), {
                type: "Binary", op: "*",
                left: { type: "Binary", op: "+", left: id("a"), right: id("b") },
                right: id("c")
            })
        })

        // low to high, adjacent pairs from BINARY_PRECEDENCE
        const precedence_pairs = [
            ["a || b && c", "||", "&&"],
            ["a && b | c", "&&", "|"],
            ["a | b ^ c", "|", "^"],
            ["a ^ b & c", "^", "&"],
            ["a & b == c", "&", "=="],
            ["a == b < c", "==", "<"],
            ["a < b << c", "<", "<<"],
            ["a << b + c", "<<", "+"],
            ["a + b * c", "+", "*"],
        ]
        for (const [source, outer_op, inner_op] of precedence_pairs) {
            it(`parses '${source}' as ${outer_op}(a, ${inner_op}(b, c))`, function() {
                const p = parser_for(source)
                const result = parse_binary(0, 1, p)
                assert.deepEqual(shape(result.node), {
                    type: "Binary", op: outer_op,
                    left: id("a"),
                    right: { type: "Binary", op: inner_op, left: id("b"), right: id("c") }
                })
            })
        }

        it("stops at an operator below the given minimum precedence", function() {
            // min_prec above '||' (1) means it should stop right after 'a'
            const p = parser_for("a || b")
            const result = parse_binary(0, 2, p)
            assert.deepEqual(shape(result.node), id("a"))
            assert.equal(result.index, 1)
        })
    })

    describe("parse_conditional", function() {
        it("parses a plain binary expression when there's no '?'", function() {
            const p = parser_for("a + b")
            const result = parse_conditional(0, p)
            assert.deepEqual(shape(result.node), { type: "Binary", op: "+", left: id("a"), right: id("b") })
        })

        it("parses a simple ternary", function() {
            const p = parser_for("a ? b : c")
            const result = parse_conditional(0, p)
            assert.deepEqual(shape(result.node), { type: "Ternary", cond: id("a"), then_expr: id("b"), else_expr: id("c") })
        })

        it("is right-associative when nested in the else branch", function() {
            const p = parser_for("a ? b : c ? d : e")
            const result = parse_conditional(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Ternary", cond: id("a"), then_expr: id("b"),
                else_expr: { type: "Ternary", cond: id("c"), then_expr: id("d"), else_expr: id("e") }
            })
        })

        it("allows a full expression (e.g. an assignment) in the 'then' branch", function() {
            const p = parser_for("a ? b = 1 : c")
            const result = parse_conditional(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Ternary", cond: id("a"),
                then_expr: { type: "Assignment", op: "=", target: id("b"), value: num("1") },
                else_expr: id("c")
            })
        })

        it("throws a ParserError when the ':' branch is missing", function() {
            const p = parser_for("a ? b")
            assert.throws(function() { parse_conditional(0, p) }, ParserError)
        })
    })

    describe("parse_assignment", function() {
        it("parses a plain conditional expression when there's no assignment operator", function() {
            const p = parser_for("a + b")
            const result = parse_assignment(0, p)
            assert.deepEqual(shape(result.node), { type: "Binary", op: "+", left: id("a"), right: id("b") })
        })

        it("parses a simple assignment", function() {
            const p = parser_for("a = b")
            const result = parse_assignment(0, p)
            assert.deepEqual(shape(result.node), { type: "Assignment", op: "=", target: id("a"), value: id("b") })
        })

        it("is right-associative", function() {
            const p = parser_for("a = b = c")
            const result = parse_assignment(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Assignment", op: "=", target: id("a"),
                value: { type: "Assignment", op: "=", target: id("b"), value: id("c") }
            })
        })

        const compound_ops = ["+=", "-=", "*=", "/=", "%=", "^=", "|=", "&=", "<<=", ">>="]
        for (const op of compound_ops) {
            it(`parses compound assignment '${op}'`, function() {
                const p = parser_for(`a ${op} b`)
                const result = parse_assignment(0, p)
                assert.deepEqual(shape(result.node), { type: "Assignment", op: op, target: id("a"), value: id("b") })
            })
        }
    })

    describe("parse_expression", function() {
        it("delegates to parse_assignment", function() {
            const p = parser_for("a = 1 + 2")
            const result = parse_expression(0, p)
            assert.deepEqual(shape(result.node), {
                type: "Assignment", op: "=", target: id("a"),
                value: { type: "Binary", op: "+", left: num("1"), right: num("2") }
            })
        })
    })

    describe("parse_expr_statement", function() {
        it("parses a bare ';' as an empty statement", function() {
            const p = parser_for(";")
            const result = parse_expr_statement(0, p)
            assert.deepEqual(shape(result.node), { type: "EmptyStatement" })
            assert.equal(result.index, 1)
        })

        it("parses an expression followed by ';'", function() {
            const p = parser_for("a = b + c;")
            const result = parse_expr_statement(0, p)
            assert.deepEqual(shape(result.node), {
                type: "ExprStatement",
                expr: { type: "Assignment", op: "=", target: id("a"), value: { type: "Binary", op: "+", left: id("b"), right: id("c") } }
            })
            assert.equal(result.index, p.tokens.length)
        })

        it("throws a ParserError when the ';' is missing", function() {
            const p = parser_for("a = b")
            assert.throws(function() { parse_expr_statement(0, p) }, ParserError)
        })

        it("sets a source range covering the whole statement, including the ';'", function() {
            const p = parser_for("a;")
            const result = parse_expr_statement(0, p)
            assert.notEqual(result.node.r, null)
            assert.equal(result.node.r.end.column, p.tokens[1].r.end.column)
        })
    })

    describe("parse_statement", function() {
        it("currently just delegates to parse_expr_statement via first_of", function() {
            const p = parser_for("a;")
            const result = parse_statement(0, p)
            assert.deepEqual(shape(result.node), { type: "ExprStatement", expr: id("a") })
        })

        it("surfaces the underlying ParserError when its sole alternative fails", function() {
            const p = parser_for("a")
            assert.throws(() => { parse_statement(0, p) }, ParserError)
        })
    })

    describe("first_of", function() {
        it("returns the result of the first alternative that succeeds", function() {
            const p = parser_for("a")
            const result = p.first_of(0, [
                i => parse_primary(i, p),
            ])
            assert.deepEqual(shape(result.node), id("a"))
        })

        it("falls through to the next alternative on a ParserError, retrying from the same index", function() {
            const p = parser_for("a")
            const result = p.first_of(0, [
                i => { p.throw_error_got("this alternative never matches here", i) },
                i => parse_primary(i, p),
            ])
            assert.deepEqual(shape(result.node), id("a"))
        })

        it("rolls the symbol table back before retrying the next alternative", function() {
            const p = parser_for("a")
            p.first_of(0, [
                i => {
                    p.symbols.add_symbol("leaked", true)
                    p.throw_error_got("force a backtrack", i)
                },
                i => parse_primary(i, p),
            ])
            assert.equal(p.symbols.symbols[0]["leaked"], undefined)
        })

        it("throws the deepest (best) error when every alternative fails", function() {
            const p = parser_for("a")
            assert.throws(function() {
                p.first_of(0, [
                    i => { p.throw_error_got("shallow failure", i) },
                    i => { p.throw_error_got("deep failure", i + 1) },
                ])
            }, /deep failure/)
        })

        it("re-throws exceptions that aren't ParserErrors immediately, without trying later alternatives", function() {
            const p = parser_for("a")
            let second_alternative_tried = false
            assert.throws(function() {
                p.first_of(0, [
                    () => { throw new TypeError("boom") },
                    i => { second_alternative_tried = true; return parse_primary(i, p) },
                ])
            }, TypeError)
            assert.equal(second_alternative_tried, false)
        })

        describe("cut", function() {
            it("without a cut, a failure still falls through to the next alternative (baseline)", function() {
                const p = parser_for("a")
                let second_alternative_tried = false
                const result = p.first_of(0, [
                    i => { p.throw_error_got("no cut here", i) },
                    i => { second_alternative_tried = true; return parse_primary(i, p) },
                ])
                assert.equal(second_alternative_tried, true)
                assert.deepEqual(shape(result.node), id("a"))
            })

            it("after a cut, a later failure in the same alternative skips the remaining alternatives", function() {
                const p = parser_for("a")
                let second_alternative_tried = false
                assert.throws(function() {
                    p.first_of(0, [
                        i => {
                            p.cut(i)
                            p.throw_error_got("committed, then failed anyway", i)
                        },
                        i => { second_alternative_tried = true; return parse_primary(i, p) },
                    ])
                }, /committed, then failed anyway/)
                assert.equal(second_alternative_tried, false)
            })

            it("a cut deep in a call chain still stops backtracking at every enclosing first_of", function() {
                const p = parser_for("a")
                let outer_fallback_tried = false
                let inner_fallback_tried = false

                // mimics: outer first_of choosing a statement kind, whose first
                // alternative is itself a first_of over sub-cases, one of which
                // cuts once it's seen unambiguous evidence and then fails deeper in
                const inner_rule = (i) => p.first_of(i, [
                    (j) => {
                        p.cut(j) // e.g. "we just matched the unambiguous 'if (' prefix"
                        p.throw_error_got("malformed condition", j)
                    },
                    (j) => { inner_fallback_tried = true; return parse_primary(j, p) },
                ])

                assert.throws(function() {
                    p.first_of(0, [
                        inner_rule,
                        (i) => { outer_fallback_tried = true; return parse_primary(i, p) },
                    ])
                }, /malformed condition/)

                assert.equal(inner_fallback_tried, false, "the inner first_of should not have tried its own fallback")
                assert.equal(outer_fallback_tried, false, "the outer first_of should not have fallen back to an unrelated statement kind")
            })

            it("commitment doesn't leak into a sibling alternative that never cut", function() {
                const p = parser_for("a")
                const result = p.first_of(0, [
                    i => { p.throw_error_got("first alternative fails before ever cutting", i) },
                    i => parse_primary(i, p),
                ])
                assert.deepEqual(shape(result.node), id("a"))
            })
        })
    })
})
