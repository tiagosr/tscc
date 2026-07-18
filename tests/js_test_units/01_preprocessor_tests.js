/* eslint-disable no-undef */
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { tokenize } from "../../src/lexer.js"
import { process as preprocess } from "../../src/preprocessor.js"
import { Config, PreprocessorContext } from "../../src/context.js"
import { PreprocessorError } from "../../src/errors.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures_dir = path.join(__dirname, "fixtures")

/**
 * @param {?string[]} sys_include_paths
 * @param {Object.<string, Token[]>} defines
 * @returns {PreprocessorContext}
 */
function make_context(sys_include_paths = [], defines = {}) {
    const config = new Config(fixtures_dir, true)
    config.sys_include_paths = sys_include_paths
    return new PreprocessorContext(config, defines)
}

/**
 * Tokenize and preprocess a snippet of source as if it were `filename`.
 * @param {string} source
 * @param {string} filename
 * @param {PreprocessorContext} context
 * @returns {Token[]}
 */
function preprocess_source(source, filename, context) {
    const tokens = tokenize(source, filename, context)
    return preprocess(tokens, filename, context)
}

/**
 * @param {Token[]} tokens
 * @returns {string[]}
 */
function contents(tokens) {
    return tokens.map((token) => token.content)
}

describe("preprocessor", function() {

    describe("passthrough", function() {
        it("leaves source with no directives or macros untouched", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("int main() { return 0; }", filename, context)
            assert.deepEqual(
                contents(result),
                ["int", "main", "(", ")", "{", "return", "0", ";", "}"]
            )
        })
    })

    describe("#define", function() {
        it("removes the directive line and substitutes later uses of the macro", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define FOO 42\nFOO", filename, context)
            assert.deepEqual(contents(result), ["42"])
        })

        it("substitutes every token from the macro body", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define GREETING hello world\nGREETING", filename, context)
            assert.deepEqual(contents(result), ["hello", "world"])
        })

        it("does not disturb surrounding code on other lines", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("int x;\n#define VALUE 10\nint y = VALUE;", filename, context)
            assert.deepEqual(
                contents(result),
                ["int", "x", ";", "int", "y", "=", "10", ";"]
            )
        })

        it("lets a later #define override an earlier one with the same name", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define FOO 1\n#define FOO 2\nFOO", filename, context)
            assert.deepEqual(contents(result), ["2"])
        })

        it("recursively expands a macro referenced from another macro's body", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define A 1\n#define B A\nB", filename, context)
            assert.deepEqual(contents(result), ["1"])
        })

        it("correctly fails to expand a macro referenced from a future macro's body", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define B A\nB\n#define A 1\n", filename, context)
            assert.deepEqual(contents(result), ["A"])
        })

        it("correctly fails to infinitely loop on definitions", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define B B\nB\n", filename, context)
            assert.deepEqual(contents(result), ["B"])
        })

        it("correctly fails to infinitely loop on cyclical definitions", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define B A\n#define A B\nB\n", filename, context)
            assert.deepEqual(contents(result), ["B"])
        })

        it("correctly parses parameter lists in defines", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define ADD(a, b) a + b\n", filename, context)
            assert.deepEqual(contents(result), [])
        })

        it("correctly parses parameter lists in defines with variadic parameters", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define ADD(a, b, ...) a + b\n", filename, context)
            assert.deepEqual(contents(result), [])
        })

        it("correctly throws error in incomplete lists of parameters (1/2)", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#define ADD(", filename, context)
            }, PreprocessorError)
        })

        it("correctly throws error in incomplete lists of parameters (2/2)", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#define ADD(a\n)", filename, context)
            }, PreprocessorError)
        })

        it("correctly throws error in multiple variadic parameters", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#define ADD(a, ..., ...)", filename, context)
            }, PreprocessorError)
        })

        it("substitutes macro parameters at the call site", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define ADD(a, b) a + b\nADD(1, 2)", filename, context)
            assert.deepEqual(contents(result), ["1", "+", "2"])
        })


        it("correctly throws error if parameters are incomplete at the call site", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#define ADD(a, b) a + b\nADD(1, 2", filename, context)
            }, PreprocessorError)
        })

        it("correctly throws error if parameter count doesn't match at the call site", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#define ADD(a, b) a + b\nADD(1)", filename, context)
            }, PreprocessorError)
        })


        describe("#undef", function() {
            it("undefines a previously defined macro", function() {
                const context = make_context()
                const filename = path.join(fixtures_dir, "virtual_main.c")
                const result = preprocess_source("#define A 1\nA\n#undef A\nA", filename, context)
                assert.deepEqual(contents(result), ["1", "A"])
            })
            it("fails silently if an identifier was not defined", function() {
                const context = make_context()
                const filename = path.join(fixtures_dir, "virtual_main.c")
                const result = preprocess_source("#undef A\nA", filename, context)
                assert.deepEqual(contents(result), ["A"])
            })
        })
    })

    describe("__FILE__, __LINE__, __DATE__, __TIME__", function() {
        it("expands to the path of the file being processed", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("__FILE__", filename, context)
            assert.deepEqual(contents(result), [filename])
        })
        it("expands to the current line (1-indexed) of the file being processed", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("__LINE__\n__LINE__\n", filename, context)
            assert.deepEqual(contents(result), ["1","2"])
        })
        it("expands to the current date as of processing the file", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("__DATE__", filename, context)
            assert.match(result[0].content, /\w\w\w\s\d\d\s\d\d\d\d/)
        })
        it("expands to the current time as of processing the file", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("__TIME__", filename, context)
            assert.match(result[0].content, /\d\d:\d\d:\d\d/)
        })
    })

    describe("#include", function() {
        it("splices in the tokens produced by the included file", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#include \"include_target.h\"", filename, context)
            assert.deepEqual(
                contents(result),
                ["int", "included_value", "=", "42", ";"]
            )
        })

        it("resolves angle-bracket includes against the configured system include paths", function() {
            const context = make_context([path.join(fixtures_dir, "sys")])
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#include <sys_header.h>\nSYS_MACRO", filename, context)
            assert.deepEqual(contents(result), ["7"])
        })

        it("correctly throws an error when the included file cannot be found", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            assert.throws(function() {
                preprocess_source("#include \"does_not_exist.h\"", filename, context)
            }, PreprocessorError)
        })
    })

    // #if / #ifdef are not implemented yet (see the bare "// TODO" branches in
    // process()): matching one of these directives currently leaves the loop index
    // untouched, which would spin forever, so these stay skipped rather than exercised.
    describe("#if / #ifdef", function() {
        it.skip("skips the body of a false #if block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#if 0\nHELLO;\n#endif", filename, context)
            assert.deepEqual(contents(result), [])
        })
        it.skip("keeps the body of a true #if block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#if 1\nHELLO;\n#endif", filename, context)
            assert.deepEqual(contents(result), ["HELLO", ";"])
        })
        it("skips the body of a false #ifdef block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#ifdef HI\nHELLO;\n#endif", filename, context)
            assert.deepEqual(contents(result), [])
        })
        it("keeps the body of a true #ifdef block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define HI\n#ifdef HI\nHELLO;\n#endif", filename, context)
            assert.deepEqual(contents(result), ["HELLO", ";"])
        })
        it("skips the first body of a false #ifdef/#else block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#ifdef HI\nHELLO;\n#else\nHEY;\n#endif", filename, context)
            assert.deepEqual(contents(result), ["HEY", ";"])
        })
        it("keeps the first body of a true #ifdef/#else block", function() {
            const context = make_context()
            const filename = path.join(fixtures_dir, "virtual_main.c")
            const result = preprocess_source("#define HI\n#ifdef HI\nHELLO;\n#else\nHEY;\n#endif", filename, context)
            assert.deepEqual(contents(result), ["HELLO", ";"])
        })
    })
})
