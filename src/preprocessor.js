import { Config, CompilerContext } from "./context.js"
import { Token } from "./tokens.js"
import { tokenize } from "./lexer.js"
import { pound, identifier as _identifier, open_paren, close_paren, ellipsis, comma, include_file, define_placeholder, string } from "./token_kinds.js"
import { resolve } from "path"
import { existsSync, readFileSync } from "fs"
import { NotImplementedError, PreprocessorError } from "./errors.js"
import { StreamRange } from "./utils.js"

class PreprocessItemResult {
    /**
     * 
     * @param {Token[]} produced 
     * @param {number} consumed
     */
    constructor(produced, consumed) {
        this.produced = produced
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
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "define" &&
        tokens[index + 2].isKind(_identifier)
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
    
    if (tokens[i].isKind(open_paren) &&               // there is an open paren
        tokens[i-1].r.end.line == tokens[i].r.start.line &&       // in the same line
        tokens[i-1].r.end.column == tokens[i].r.start.column - 1) // and no space between the identifier and paren
    {
        let expect_param = true
        params = []
        i++ // skip the opening param
        for (;;i++)
        {
            if (i >= tokens.length)
                throw new PreprocessorError("unexpected end-of-file", new StreamRange(tokens[tokens.length-1].r.end), [])
            if (tokens[i].r.start.line != current_line) {
                if (expect_param)
                    throw new PreprocessorError("malformed define parameter list: expected identifier, '...' or ')' before new-line", tokens[i].r, [])
                else
                    throw new PreprocessorError("malformed define parameter list: expected ',' or ')' before new-line", tokens[i].r, [])
            }
            if (expect_param) {
                if (tokens[i].isKind(ellipsis)) { // variadic parameter
                    if (variadic >= 0) {
                        throw new PreprocessorError("multiple variadic parameters", tokens[i].r, [])
                    } else {
                        params.push(tokens[i].content)
                        variadic = params.length - 1
                    }
                    expect_param = false
                } else if (tokens[i].isKind(_identifier)) {
                    if (variadic > 0) {
                        throw new PreprocessorError("invalid identifier after variadic parameter", tokens[i].r, [])
                    }
                    params.push(tokens[i].content)
                    expect_param = false
                } else if (tokens[i].isKind(close_paren)) {
                    i++
                    break
                } else {
                    throw new PreprocessorError("invalid token: expected identifier, '...' or ')'", tokens[i].r, [])
                }
            } else {
                if (tokens[i].isKind(comma)) {
                    expect_param = true // flip back to expecting a parameter or )
                } else if (tokens[i].isKind(close_paren)) {
                    i++
                    break
                } else {
                    throw new PreprocessorError("invalid token: expected ',' or ')'", tokens[i+1].r, [])
                }
            }
        }
    }
    for (; i < tokens.length && tokens[i].r.start.line == current_line; i++) {
        let found = params.indexOf(tokens[i].content);
        if (found !== -1) {
            body.push(new Token(define_placeholder, tokens[i].content, tokens[i].rep, tokens[i].r))
        } else {
            body.push(tokens[i])
        }
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
function match_undef(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "undef"
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
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
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
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "ifdef" &&
        tokens[index + 2].isKind(_identifier)
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
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "include" &&
        tokens[index + 2].isKind(include_file)
    )
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index
 * @param {string} this_file 
 * @param {CompilerContext} context
 * @returns {PreprocessItemResult} The preprocessed tokens
 */
function process_include(tokens, index, this_file, context) {
    let { file, filename } = read_file(tokens[index + 2], this_file, context.config)
    let new_tokens = process(tokenize(file, filename, context), filename, context)
    return new PreprocessItemResult(new_tokens, 3)
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
    throw new PreprocessorError("include file not found", include_file_token.r, [])
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
 * @returns {PreprocessItemResult}
 */
function substitute_defined(tokens, index, defines, context) {
    /** @type {Token[]} */
    let new_tokens = []
    /** @type {Object.<string,Token[]>} */
    let substitute_tokens = {}

    /** @type {PreprocessorDefine} */
    let define = defines[tokens[index].content];
    let i = index + 1;

    const collectTokensUntilCloseParen = () => {
        let param_tokens = []
        for (;;i++) {
            if (i >= tokens.length) {
                throw new PreprocessorError("unexpected end-of-file collecting arguments for define instantiation", new StreamRange(tokens[tokens.length-1].end), [])
            }
            if (tokens[i].isKind(close_paren)) {
                return param_tokens
            } else if (tokens[i].isKind(open_paren)) {
                param_tokens.append(collectTokensUntilCloseParen())
            } else {
                param_tokens.push(tokens[i])
            }
        }
    }

    const collectNextParameterTokens = () => {
        /** @type {Token[]} */
        let param_tokens = []

        for (;;i++) {
            if (i >= tokens.length) {
                throw new PreprocessorError("unexpected end-of-file collecting arguments for define instantiation", new StreamRange(tokens[tokens.length-1].end), [])
            }
            if (tokens[i].isKind(close_paren)) {
                i--;
                return param_tokens
            } else if (tokens[i].isKind(comma)) {
                return param_tokens
            } else if (tokens[i].isKind(open_paren)) {
                param_tokens.append(collectTokensUntilCloseParen())
            } else {
                param_tokens.push(tokens[i])
            }
        }
    }

    if (define.parameters != null) {
        /** @type {Token[][]} */
        let collected = []
        if (i >= tokens.length) {
            throw new PreprocessorError("unexpected end-of-file collecting arguments for define instantiation", new StreamRange(tokens[tokens.length-1].end), [])
        }
        if (!tokens[i].isKind(open_paren)) {
            throw new PreprocessorError(`define ${define.identifier} expected '('`, tokens[i].r, [])
        }
        i++; // walk past the open_paren
        for (;;i++) {
            if (i >= tokens.length)
                throw new PreprocessorError("unexpected end-of-file collecting arguments for define instantiation", new StreamRange(tokens[tokens.length-1].end), [])
            if (tokens[i].isKind(close_paren)) break
            if (tokens[i].isKind(comma)) continue
            collected.push(collectNextParameterTokens())
        }
        if (collected.length < define.parameters.length) {
            throw new PreprocessorError(`define ${define.identifier} expected ${define.parameters.length} parameters, got ${collected.length}`, tokens[i].r, [])
        }
        define.parameters.forEach((parameter, i) => {
            substitute_tokens[parameter] = collected[i]
        });
        if (define.variadic > 0) {
            substitute_tokens['__VA_ARGS__'] = collected.slice(define.parameters.length).flatMap(args => args)
        }
        i++; // walk past the close_paren
    }

    // apply the substitution (recursively)
    for (const token of defines[tokens[index].content].body) {
        if (token.isKind(define_placeholder)) {
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
            new_tokens = [...new_tokens.slice(0, i), ...repeat.produced, ...new_tokens.slice(i+1)];
        }
    }
    return new PreprocessItemResult(new_tokens, i - index)
}


/**
 * 
 * @param {Token} token 
 * @param {Token[]} tokens 
 * @param {number} i 
 * @param {Context} context 
 * @returns {{produced:Token[], consumed:number}}
 */
function process_token(token, tokens, i, context, this_file) {
    if (match_include(tokens, i)) {
        let this_file_body = context.defines["__FILE__"].body // back up __FILE__ (as it might have been changed by user code)
        let result = process_include(tokens, i, this_file, context)
        context.defines["__FILE__"] = new PreprocessorDefine("__FILE__", null, this_file_body, -1) // reset __FILE__ #define
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_if(tokens, i)) {
        // TODO
        throw new NotImplementedError()
    } else if (match_ifdef(tokens, i)) {
        // TODO
        throw new NotImplementedError()
    } else if (match_define(tokens, i)) {
        // TODO flesh out
        let result = process_define(tokens, i, context)
        return {produced: result.produced, consumed: result.consumed}
    } else if (match_undef(tokens, i)) {
        if (tokens[i+2].content in context.defines) {
            delete context.defines[tokens[i+2].content]
        }
        return {produced: [], consumed: 3}
    } else if (match_defined_symbols(tokens, i, context.defines)) {
        let result = substitute_defined(tokens, i, context.defines, context)
        return {produced: result.produced, consumed: result.consumed}
    } else {
        return {produced: [token, ], consumed: 1}
    }
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
        var {produced, consumed} = process_token(tokens[i], tokens, i, context, this_file);
        i += consumed;
        processed = [...processed, ...produced]
    }
    return processed.concat(tokens.slice(i))
}

export { process }