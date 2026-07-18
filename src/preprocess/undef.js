import { pound, identifier as _identifier } from "../token_kinds.js";
import { PreprocessorError } from "../errors.js";
import { PreprocessItemResult } from "./PreprocessItemResult.js";
import { StreamRange } from "../utils.js";

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_undef(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "undef"
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} i 
 * @param {PreprocessorContext} context 
 * @returns {PreprocessItemResult}
 */
export function process_undef(tokens, i, context) {
    if (i >= tokens.length) {
        throw new PreprocessorError("unexpected end-of-file when processing #undef", new StreamRange(tokens[tokens.length-1].r.end), [])
    }
    if (tokens[i + 2].content in context.defines) {
        delete context.defines[tokens[i + 2].content]
    }
    return new PreprocessItemResult([], 3)
}
