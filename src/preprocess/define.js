import { pound, identifier as _identifier, ellipsis, open_paren, close_paren, comma, define_placeholder, string } from "../token_kinds.js";
import { PreprocessorError } from "../errors.js";
import { StreamRange } from "../utils.js";
import { PreprocessItemResult } from "./PreprocessItemResult.js";
import { Token } from "../tokens.js";

/**
 *
 * @param {Token[]} tokens
 * @param {number} index
 * @returns {boolean}
 */
export function match_define(tokens, index) {
    return (
        tokens[index].isKind(pound) &&
        tokens[index + 1].isKind(_identifier) &&
        tokens[index + 1].content == "define" &&
        tokens[index + 2].isKind(_identifier)
    );
}

export class PreprocessorDefine {

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
 * @param {PreprocessorContext} context 
 * @returns {PreprocessItemResult}
 */
export function process_define(tokens, index, context) {
    let body = []
    let current_line = tokens[index + 2].line
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
            if (tokens[i].line != current_line) {
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
    for (; i < tokens.length && tokens[i].line == current_line; i++) {
        let found = (params != null)? params.indexOf(tokens[i].content) : -1;
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
 * @param {Object.<string,Token[]>} defines 
 */
export function match_defined_symbols(tokens, index, defines) {
    return ((tokens[index].content in defines) || ["__LINE__","__DATE__","__TIME__"].includes(tokens[index].content))
}


/**
 * 
 * @param {String} define 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @return {String}
 */
function resolve_standard_define_string_content(define, tokens, index) {
    switch (define) {
        case "__LINE__": return `${tokens[index].line}`
        case "__DATE__": {
            const d = new Date()
            return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]} ${String(d.getDay()).padStart(2, "0")} ${d.getFullYear()}`
        }
        case "__TIME__": {
            const d = new Date()
            return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
        }
    }
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {number} index 
 * @param {Object.<String,PreprocessorDefine>} defines
 * @param {PreprocessorContext} context 
 * @returns {PreprocessItemResult}
 */
export function substitute_defined(tokens, index, defines, context) {
    /** @type {Token[]} */
    let new_tokens = []
    /** @type {Object.<String,Token[]>} */
    let substitute_tokens = {}

    let id = tokens[index].content;

    if (["__LINE__","__DATE__","__TIME__"].includes(id)) {
        // shortcut dynamic C defines application
        return new PreprocessItemResult([new Token(string, resolve_standard_define_string_content(id, tokens, index), tokens[index].rep, tokens[index].r),], 1)
    }

    /** @type {PreprocessorDefine} */
    let define = defines[id];
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
        } else {
            if (collected.length > define.parameters.length) {
                throw new PreprocessorError(`define ${define.identifier} expected ${define.parameters.length} parameters, got ${collected.length}`, tokens[i].r, [])
            }
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

