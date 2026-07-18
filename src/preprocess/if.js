import { pound } from "../token_kinds.js";
import { PreprocessItemResult } from "./PreprocessItemResult.js";
import { PreprocessorError } from "../errors.js";
import { PreprocessorContext } from "../context.js";
import { match_else, match_endif } from "./ifdef.js";
import { process_token } from "./process.js";
import { StreamRange } from "../utils.js";
import { Token } from "../tokens.js";

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_if(tokens, index) {
    return (
        (index + 1) < tokens.length &&
        tokens[index].isKind(pound) &&
        tokens[index + 1].content == "if"
    )
}

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_elif(tokens, index) {
    return (
        (index + 1) < tokens.length &&
        tokens[index].isKind(pound) &&
        tokens[index + 1].content == "elif"
    )
}

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @param {PreprocessorContext} context
 * @param {string} this_file 
 * @returns {PreprocessItemResult} produced/consumed tokens
 */
export function process_if(tokens, index, context, this_file) {
    let allow = tokens[index + 2].content == "1"
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

