import { pound, identifier as _identifier } from "../token_kinds.js";
import { PreprocessItemResult } from "./PreprocessItemResult.js";
import { PreprocessorError } from "../errors.js";
import { StreamRange } from "../utils.js";
import { process_token } from "./process.js";


/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_ifdef(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "ifdef" &&
        tokens[index + 2].isKind(_identifier)
    )
}
/**
 *
 * @param {Token[]} tokens
 * @param {int} index
 * @returns {boolean}
 */
export function match_else(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].content == "else"
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {int} index 
 * @returns {boolean}
 */
export function match_endif(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].content == "endif"
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {PreprocessorContext} context 
 * @returns {PreprocessItemResult}
 */
export function process_ifdef(tokens, index, context, this_file) {
    let allow = tokens[index + 1].content == "ifdef" && (tokens[index + 2].content in context.defines)
    /** @type {Token[]} */
    let processed = []
    let i = index + 3

    for (;;) {
        if (i + 1 >= tokens.length) {
            throw new PreprocessorError("unexpected end-of-file while processing #ifdef branches", new StreamRange(tokens[tokens.length-1].r.end), processed)
        }
        if (match_endif(tokens, i)) {
            i+=2
            break
        } else if (match_else(tokens, i)) {
            allow = !allow
            i+=2
            continue
        }
        let {produced, consumed} = process_token(tokens, i, context, this_file)
        i += consumed;
        if (allow) {
            processed = [...processed, ...produced]
        }        
    }
    return new PreprocessItemResult(processed, i - index)
}
