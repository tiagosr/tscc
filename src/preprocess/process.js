import { Token } from "../tokens.js"
import { pound, string_token } from "../token_kinds.js"
import { PreprocessorError } from "../errors.js"
import { PreprocessorContext } from "../context.js"
import { process_define, match_defined_symbols, match_define, substitute_defined, PreprocessorDefine } from "./define.js"
import { match_include, process_include } from "./include.js"
import { match_else, match_ifdef, match_endif, process_ifdef, match_ifndef } from "./ifdef.js"
import { match_elif, match_if, process_if } from "./if.js"
import { match_undef, process_undef } from "./undef.js"

/**
 * Dispatches processing based on the token at index {@link i}
 * @param {Token[]} tokens 
 * @param {number} i 
 * @param {PreprocessorContext} context 
 * @returns {{produced:Token[], consumed:number}}
 */
export function process_token(tokens, i, context, this_file) {
    if (tokens[i].isKind(pound) && tokens[i].line !== tokens[i+1].line) {
        throw new PreprocessorError("unexpected end-of-line after #", tokens[i].r, [])
    } else if (match_include(tokens, i)) {
        let this_file_body = context.defines["__FILE__"].body // back up __FILE__ (as it might have been changed by user code)
        let result = process_include(tokens, i, this_file, context)
        context.defines["__FILE__"] = new PreprocessorDefine("__FILE__", null, this_file_body, -1) // reset __FILE__ #define
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_if(tokens, i)) {
        let result = process_if(tokens, i, context, this_file)
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_ifdef(tokens, i) || match_ifndef(tokens, i)) {
        let result = process_ifdef(tokens, i, context, this_file)
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_else(tokens, i)) {
        throw new PreprocessorError("unexpected #else", tokens[i].r.concat(tokens[i+1].r), [])
    } else if (match_endif(tokens, i)) {
        throw new PreprocessorError("unexpected #endif", tokens[i].r.concat(tokens[i+1].r), [])
    } else if (match_elif(tokens, i)) {
        throw new PreprocessorError("unexpected #elif", tokens[i].r.concat(tokens[i+1].r), [])
    } else if (match_define(tokens, i)) {
        let result = process_define(tokens, i, context)
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_undef(tokens, i)) {
        process_undef(tokens, i, context)
        return {produced: [], consumed: 3}
    } else if (match_defined_symbols(tokens, i, context.defines)) {
        let result = substitute_defined(tokens, i, context.defines, context)
        return {produced: result.produced, consumed: result.consumed}
    } else {
        return {produced: [tokens[i], ], consumed: 1}
    }
}


/**
 * Do a preprocessor pass on the tokens generated from a file
 * @param {Token[]} tokens Input token list
 * @param {string} this_file The full path to the current file
 * @param {PreprocessorContext} context 
 * @returns {Token[]} The preprocessed tokens
 */
export function process(tokens, this_file, context) {
    /** @type {Token[]} */
    let processed = []
    let i = 0
    let this_file_token = new Token(string_token, this_file)
    context.defines["__FILE__"] = new PreprocessorDefine("__FILE__", null, [this_file_token, ], -1)
    while (i < tokens.length) {
        var {produced, consumed} = process_token(tokens, i, context, this_file);
        i += consumed;
        processed = [...processed, ...produced]
    }
    return processed.concat(tokens.slice(i))
}
