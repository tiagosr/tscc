import { pound, identifier_token, include_file } from "../token_kinds.js";
import { tokenize } from "../lexer.js"
import { resolve } from "path"
import { existsSync, readFileSync } from "fs"
import { PreprocessItemResult } from "./PreprocessItemResult.js";
import { PreprocessorError } from "../errors.js";
import { process } from "./process.js";

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_include(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(identifier_token) &&
        tokens[index + 1].content == "include" &&
        tokens[index + 2].isKind(include_file)
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index
 * @param {String} this_file 
 * @param {PreprocessorContext} context
 * @returns {PreprocessItemResult} The preprocessed tokens
 */
export function process_include(tokens, index, this_file, context) {
    let { file, filename } = read_file(tokens[index + 2], this_file, context.config)
    let new_tokens = process(tokenize(file, filename, context), filename, context)
    return new PreprocessItemResult(new_tokens, 3)
}


/**
 * 
 * @param {Token} include_file_token 
 * @param {String} this_file 
 * @param {Config} config 
 * @returns {ReadFileResult}
 */
export function read_file(include_file_token, this_file, config) {
    const include_file_n = include_file_token.content.slice(1, -1)
    let file_paths = [resolve(this_file, "..", include_file_n),]
    if (include_file_token.content[0] == "<") {
        file_paths = config.sys_include_paths.map(function(include_path) {
            return resolve(include_path, include_file_n)
        })
    }
    for (const include of file_paths) {
        if (existsSync(include)) {
            return new ReadFileResult(readFileSync(include).toString(), include)
        }
    }
    throw new PreprocessorError("include file not found", include_file_token.r, [])
}class ReadFileResult {
    /**
     *
     * @param {String} file The file contents of an #include read
     * @param {String} filename The absolute filename
     */
    constructor(file, filename) {
        this.file = file
        this.filename = filename
    }
}

