const StreamRange = require("./utils")
const _context = require("./context")
const Config = _context.Config
const CompilerContext = _context.CompilerContext
const tokens = require("./tokens")
const Token = tokens.Token, ErrorToken = tokens.ErrorToken, TokenKind = tokens.TokenKind
const lexer = require("./lexer")
const token_kinds = require("./token_kinds")
const path = require("path")
const fs = require("fs")
const CompilerError = require("./errors").CompilerError

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

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_define(tokens, index) {
    return (
        tokens[index].kind == token_kinds.pound &&
        tokens[index + 1].kind == token_kinds.identifier &&
        tokens[index + 1].content == "define" &&
        tokens[index + 2].kind == token_kinds.identifier
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_if(tokens, index) {
    return (
        tokens[index].kind == token_kinds.pound &&
        tokens[index + 1].kind == token_kinds.identifier &&
        tokens[index + 1].content == "if"
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @returns {boolean}
 */
function match_ifdef(tokens, index) {
    return (
        tokens[index].kind == token_kinds.pound &&
        tokens[index + 1].kind == token_kinds.identifier &&
        tokens[index + 1].content == "ifdef" &&
        tokens[index + 2].kind == token_kinds.identifier
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
        tokens[index].kind == token_kinds.pound &&
        tokens[index + 1].kind == token_kinds.identifier &&
        tokens[index + 1].content == "include" &&
        tokens[index + 2].kind == token_kinds.include_file
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
        let new_tokens = process(lexer.tokenize(file, filename, context), filename, context)
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
    let file_paths = [path.resolve(this_file, "..", include_file_n),]
    if (include_file_token.content[0] == "<") {
        file_paths = config.sys_include_paths.map(function(include_path) {
            return path.resolve(include_path, include_file_n)
        })
    }
    for (const include of file_paths) {
        if (fs.existsSync(include)) {
            return new ReadFileResult(fs.readFileSync(include).toString(), include)
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
 * @param {Object.<string,Token[]>} defines
 * @param {CompilerContext} context 
 * @returns {?PreprocessItemResult}
 */
function substitute_defined(tokens, index, defines, context) {
    let new_tokens = []
    let consumed_tokens = 1
    /** @type {Token[][]} */
    let substitute_tokens = []
    // co
    for (const token of defines[tokens[index].content]) {
        if (token.kind == token_kinds.define_placeholder) {
            for (const substitute of substitute_tokens[token.content]) {
                new_tokens.push(substitute)
            }
        } else {
            new_tokens.push(token)
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
    let this_file_token = new Token(token_kinds.string, this_file)
    context.defines["__FILE__"] = this_file_token
    while (i < tokens.length - 2) {
        if (match_include(tokens, i)) {
            this_file_token = context.defines["__FILE__"] // back up __FILE__ (as it might have been changed by user code)
            let result = process_include(tokens, i, this_file, context)
            context.defines["__FILE__"] = this_file_token // reset __FILE__ #define
            processed = processed.concat(result.tokens)
            i += result.consumed
        } else if (match_defined_symbols(tokens, i, context.defines)) {
            let result = substitute_defined(tokens, i, context.defines, context)
            processed = processed.concat(result.tokens)
            i += result.consumed
        } else {
            processed.push(tokens[i])
            i++
        }
    }
    return processed.concat(tokens.slice(i))
}

exports.process = process