import { pound, identifier_token } from "../token_kinds.js";
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
        tokens[index + 1].isKind(identifier_token) &&
        tokens[index + 1].content == "if"
    )
}/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @param {PreprocessorContext} context
 * @returns {PreprocessItemResult}
 */
export function process_if(tokens, index, context) {
    if (tokens[index + 2].content == "1") {

        return new PreprocessItemResult()
    } else {
        return new PreprocessItemResult()
    }
}

