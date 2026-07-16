import { Config, CompilerContext } from "./context.js"
import { Token, ErrorToken, TokenKind } from "./tokens.js"
import { tokenize } from "./lexer.js"
import { pound, identifier as _identifier, open_paren, close_paren, ellipsis, comma, include_file, define_placeholder, string } from "./token_kinds.js"
import { resolve } from "path"
import { existsSync, readFileSync } from "fs"
import { CompilerError } from "./errors.js"

class PreprocessItemResult {
    /**
     * 
     * @param {Token[]} tokens 
     * @param {number} consumed
     */
    constructor(tokens, consumed) {
        this.tokens = tokens
        this.consumed = consumed
    }
}

class ReadFileResult {
    /**
     * 
     * @param {string} file The file contents of an #include read
     * @param {string} filename The absolute filename
     */
    constructor(file, filename) {
        this.file = file
        this.filename = filename
    }
}

class PreprocessorDefine {

    /**
     * 
     * @param {string} identifier 
     * @param {?string[]} parameters 
     * @param {Token[]} body 
     * @param {number} variadic 
     */
    constructor(identifier, parameters, body, variadic) {
        this.identifier = identifier
        this.parameters = parameters
        this.body = body
        this.variadic = variadic || -1
    }
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_define(tokens, index) {
    return (
        tokens[index].kind == pound &&
        tokens[index + 1].kind == _identifier &&
        tokens[index + 1].content == "define" &&
        tokens[index + 2].kind == _identifier
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {CompilerContext} context 
 * @returns {PreprocessItemResult}
 */
function process_define(tokens, index, context) {
    let body = []
    let current_line = tokens[index + 2].r.start.line
    let i = index + 3
    let params = null
    let variadic = -1

    if (tokens[i].kind == open_paren &&               // there is an open paren
        tokens[i-1].r.end.line == tokens[i].r.start.line &&       // in the same line
        tokens[i-1].r.end.column == tokens[i].r.start.column - 1) // and no space between the identifier and paren
    {
        // TODO test the parameters working correctly
        params = []
        i++ // skip the opening param
        for ( ;
            i < tokens.length &&
            tokens[i].r.start.line == current_line &&
            tokens[i].kind != close_paren;
            i++)
        {
            if (tokens[i].kind == ellipsis) { // variadic parameter
                if (variadic >= 0) {
                    // TODO: throw preprocessor error (multiple variadic arguments)
                } else {
                    params.push(tokens[i].content)
                    variadic = params.length - 1
                }
            } else if (tokens[i].kind == _identifier) {
                params.push(tokens[i].content)
                if (tokens[i+1].kind == comma) {
                    i++
                }
            } else {
                // TODO: throw preprocessor error
            }
        }
        i++ // skip the closing paren
    }
    for (; i < tokens.length && tokens[i].r.start.line == current_line; i++) {
        body.push(tokens[i])
    }
    context.defines[tokens[index + 2].content] = new PreprocessorDefine(
        tokens[index + 2].content,
        params,
        body,
        variadic
    )
    return new PreprocessItemResult([], i-index)
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_if(tokens, index) {
    return (
        tokens[index].kind == pound &&
        tokens[index + 1].kind == _identifier &&
        tokens[index + 1].content == "if"
    )
}


/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {CompilerContext} context 
 * @returns {PreprocessItemResult}
 */
function process_if(tokens, index, context) {
    if (tokens[index + 2].content == "1") {

        return new PreprocessItemResult()
    } else {
        return new PreprocessItemResult()
    }
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_ifdef(tokens, index) {
    return (
        tokens[index].kind == pound &&
        tokens[index + 1].kind == _identifier &&
        tokens[index + 1].content == "ifdef" &&
        tokens[index + 2].kind == _identifier
    )
}



/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_include(tokens, index) {
    return (
        tokens[index].kind == pound &&
        tokens[index + 1].kind == _identifier &&
        tokens[index + 1].content == "include" &&
        tokens[index + 2].kind == include_file
    )
}

const include_error_kind = new TokenKind("include error")

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index
 * @param {string} this_file 
 * @param {CompilerContext} context
 * @returns {PreprocessItemResult} The preprocessed tokens
 */
function process_include(tokens, index, this_file, context) {
    try {
        let { file, filename } = read_file(tokens[index + 2], this_file, context.config)
        let new_tokens = process(tokenize(file, filename, context), filename, context)
        return new PreprocessItemResult(new_tokens, 3)
    } catch (e) {
        if (e instanceof CompilerError) {
            let new_tokens = [
                new ErrorToken(
                    include_error_kind,
                    tokens[index + 2].content,
                    null,
                    tokens[index].r.concat(tokens[index + 2].r)
                )
            ]
            return new PreprocessItemResult(new_tokens, 3)
        } else {
            throw e
        }
    }
}


/**
 * 
 * @param {Token} include_file_token 
 * @param {string} this_file 
 * @param {Config} config 
 * @returns {ReadFileResult}
 */
function read_file(include_file_token, this_file, config) {
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
    throw new CompilerError("Include file not found", include_file_token.r)
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {Object.<string,Token[]>} defines 
 */
function match_defined_symbols(tokens, index, defines) {
    return (tokens[index].content in defines)
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {Object.<string,PreprocessorDefine>} defines
 * @param {CompilerContext} context 
 * @returns {?PreprocessItemResult}
 */
function substitute_defined(tokens, index, defines, context) {
    /** @type {Token[]} */
    let new_tokens = []
    let consumed_tokens = 1
    /** @type {Token[][]} */
    let substitute_tokens = []
    // apply the substitution (recursively)
    for (const token of defines[tokens[index].content].body) {
        if (token.kind == define_placeholder) {
            for (const substitute of substitute_tokens[token.content]) {
                new_tokens.push(substitute)
            }
        } else {
            new_tokens.push(token)
        }
    }
    let definesPaintedBlue = {...defines}
    delete definesPaintedBlue[tokens[index].content]
    for (let i = 0; i < new_tokens.length; i++) {
        if (match_defined_symbols(new_tokens, i, definesPaintedBlue)) {
            let repeat = substitute_defined(new_tokens, i, definesPaintedBlue);
            new_tokens = [...new_tokens.slice(0, i), ...repeat.tokens, ...new_tokens.slice(i+1)];
        }
    }
    return new PreprocessItemResult(new_tokens, consumed_tokens)
}

/**
 * Do a preprocessor pass on the tokens generated from a file
 * @param {Token[]} tokens Input token list
 * @param {string} this_file The full path to the current file
 * @param {Context} context 
 * @returns {Token[]} The preprocessed tokens
 */
function process(tokens, this_file, context) {
    /** @type {Token[]} */
    let processed = []
    let i = 0
    let this_file_token = new Token(string, this_file)
    context.defines["__FILE__"] = new PreprocessorDefine("__FILE__", null, [this_file_token, ], -1)
    while (i < tokens.length) {
        if (match_include(tokens, i)) {
            let this_file_body = context.defines["__FILE__"].body // back up __FILE__ (as it might have been changed by user code)
            let result = process_include(tokens, i, this_file, context)
            context.defines["__FILE__"] = new PreprocessorDefine("__FILE__", null, this_file_body, -1) // reset __FILE__ #define
            processed = [...processed, ...result.tokens]
            i += result.consumed
        } else if (match_defined_symbols(tokens, i, context.defines)) {
            let result = substitute_defined(tokens, i, context.defines, context)
            processed = [...processed, ...result.tokens]
            i += result.consumed
        } else if (match_if(tokens, i)) {
            // TODO
        } else if (match_ifdef(tokens, i)) {
            // TODO
        } else if (match_define(tokens, i)) {
            // TODO flesh out
            let result = process_define(tokens, i, context)
            processed = [...processed, ...result.tokens]
            i += result.consumed
        } else {
            processed.push(tokens[i])
            i++
        }
    }
    return processed.concat(tokens.slice(i))
}

export { process }