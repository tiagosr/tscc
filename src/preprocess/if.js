import { pound, identifier as _identifier } from "../token_kinds.js";
import { PreprocessItemResult } from "./PreprocessItemResult.js";


/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_if(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "if"
    )
}/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @param {PreprocessorContext} context
 * @returns {PreprocessItemResult}
 */
function process_if(tokens, index, context) {
    if (tokens[index + 2].content == "1") {

        return new PreprocessItemResult()
    } else {
        return new PreprocessItemResult()
    }
}

