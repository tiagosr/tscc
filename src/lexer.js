import { CompilerContext } from "./context.js"
import { StreamRange, StreamPosition } from "./utils.js"
import { CompilerError } from "./errors.js"
import { Token, TokenKind } from "./tokens.js"
import { 
    number_token, identifier_token, star, slash, 
    include_file, dquote, squote, char_string, 
    string_token, symbol_kinds, pound, keyword_kinds
} from "./token_kinds.js"
import format from "string-format"

format.extend(String.prototype, {})

/**
 * Class representing tagged characters
 */
class Tagged {
    /**
     * 
     * @param {string} c The tagged character
     * @param {StreamPosition} p 
     */
    constructor(c, p) {
        this.c = c
        this.p = p
        this.r = new StreamRange(p, p)
    }
}

/**
 * 
 * @param {string} stream 
 * @param {string} filename 
 * @param {CompilerContext} context
 * @returns {Token[]} tokenized stream
 */
function tokenize(stream, filename, context) {
    /** @type {Token[]} */
    let tokens = []
    let lines = join_extended_lines(split_to_tagged_lines(stream, filename))
    let in_comment = false
    for (const line of lines) {
        try {
            let line_tokens = tokenize_line(line, in_comment, context)
            tokens = tokens.concat(line_tokens.tokens)
            in_comment = line_tokens.in_comment
        } catch (e) {
            if (e instanceof CompilerError) {
                context.emit_error(e)
            } else {
                throw e
            }
        }
    }
    return tokens
}

/**
 * 
 * @param {string} text 
 * @param {string} filename 
 * @returns {Tagged[][]}
 */
function split_to_tagged_lines(text, filename) {
    let lines = text.split("\n")
    let tagged_lines = []
    for (let line_num = 0; line_num < lines.length; line_num++) {
        const line = lines[line_num]
        let tagged_line = []
        for (let col = 0; col < line.length; col++) {
            const char = line[col]
            let p = new StreamPosition(filename, line_num + 1, col + 1, line)
            tagged_line.push(new Tagged(char, p))
        }
        tagged_lines.push(tagged_line)
    }
    return tagged_lines
}

/**
 * 
 * @param {Tagged[][]} lines List of list of Tagged objects
 * @returns {Tagged[][]}
 */
function join_extended_lines(lines) {
    let i = 0
    while (i < lines.length) {
        if (lines[i] && lines[i].length && (lines[i][lines[i].length-1].c == "\\")) {
            if (i + 1 < lines.length) {
                lines[i].pop() // remove trailing \ character
                lines[i] = [...lines[i], ...lines[i+1]]
                lines.splice(i+1, 1)
                i -= 1
            } else {
                lines[i].pop() // remove final trailing character
                // maybe emit warning about not having a follow-up line to append?
            }
        }
        i += 1
    }
    return lines
}

/**
 * Transform a sequence of tagged characters into (possibly) a token
 * @param {Tagged[]} chunk 
 * @returns {Token[]}
 * @throws {CompilerError}
 */
function chunk_to_tokens(chunk) {
    if (chunk && chunk.length) {
        let range = new StreamRange(chunk[0].p, chunk[chunk.length-1].p)
        const keyword_kind = match_keyword_kind(chunk)
        if (keyword_kind) {
            return [new Token(keyword_kind, null, null, range), ]
        }
        const number_string = match_number_string(chunk)
        if (number_string) {
            return [new Token(number_token, number_string, null, range), ]
        }
        const identifier_name = match_identifier_name(chunk)
        if (identifier_name) {
            return [new Token(identifier_token, identifier_name, null, range), ]
        }
        throw new CompilerError("unrecognized token at {chk}".format({
            chk: chunk_to_string(chunk)
        }))
    }
    return []
}

class LineTokens {
    /**
     * List of tokens in a line (return value for {@link tokenize_line})
     * @param {Token[]} tokens 
     * @param {boolean} in_comment 
     */
    constructor(tokens, in_comment) {
        this.tokens = tokens
        this.in_comment = in_comment
    }
}

/**
 * 
 * @param {Tagged[]} line 
 * @param {boolean} in_comment 
 * @param {CompilerContext} context
 * @returns {LineTokens}
 */
function tokenize_line(line, in_comment, context) {

    /** @type {Token[]} */
    let tokens = new Array()

    let chunk_start = 0
    let chunk_end = 0
    let include_line = false
    let seen_filename = false

    while (chunk_end < line.length) {
        let symbol_kind = match_symbol_kind_at(line, chunk_end)
        let next = match_symbol_kind_at(line, chunk_end + 1)

        if (match_include_command(tokens)) {
            include_line = true
        }
        if (in_comment) {
            // see if we can exit the comment block
            if (symbol_kind == star && next == slash) {
                in_comment = false
                chunk_start = chunk_end + 2
                chunk_end = chunk_start
            } else {
                // still inside comment: consume another character
                chunk_start = chunk_end + 1
                chunk_end = chunk_start
            }
        } else if (symbol_kind == slash && next == star) {
            // we just started a comment
            tokens = tokens.concat(chunk_to_tokens(line.slice(chunk_start, chunk_end)))
            in_comment = true
        } else if (symbol_kind == slash && next == slash) {
            // two slashes is a comment //
            // drop everything til the end of the line
            break
        } else if (" \t\n\r\v".indexOf(line[chunk_end].c) > -1) {
            // skip whitespace characters: commit characters that were consumed up to now
            tokens = tokens.concat(chunk_to_tokens(line.slice(chunk_start, chunk_end)))
            chunk_start = chunk_end + 1
            chunk_end = chunk_start
        } else if (include_line) {
            if (seen_filename) {
                throw new CompilerError("extra tokens at the end of #include directive")
            }
            let {filename, end} = read_include_filename(line, chunk_end)
            tokens = [...tokens, new Token(include_file, filename, null, 
                new StreamRange(line[chunk_end].p, line[end].p))]
            chunk_start = end + 1
            chunk_end = chunk_start
            seen_filename = true
        } else if ([dquote, squote].includes(symbol_kind)) {
            let quote_str = "'"
            let kind = char_string
            let add_null = false
            if (symbol_kind == dquote) {
                quote_str = "\""
                kind = string_token
                add_null = true
            }
            let {chars, length:end} = read_string(line, chunk_end + 1, quote_str, add_null)
            let rep = chunk_to_string(line.slice(chunk_end, end+1))
            let r = new StreamRange(line[chunk_end].p, line[end].p)

            if ((kind == char_string) && (chars.length == 0)) {
                // emit error message to say char string is empty
            } else if ((kind == char_string) && (chars.length > 1)) {
                // emit error message to say char string is too big
            } else {
                tokens.push(new Token(kind, chars, rep, r))
            }

            chunk_start = end + 1
            chunk_end = chunk_start

        } else if (symbol_kind) {
            let symbol_start_index = chunk_end
            let symbol_end_index = chunk_end + symbol_kind.text_repr.length - 1
            let r = new StreamRange(line[symbol_start_index].p, line[symbol_end_index].p)
            let symbol_token = new Token(symbol_kind, null, null, r)

            let remainder = chunk_to_tokens(line.slice(chunk_start, chunk_end))
            tokens = tokens.concat(remainder)
            tokens.push(symbol_token)

            chunk_start = chunk_end + symbol_kind.text_repr.length
            chunk_end = chunk_start
        } else {
            chunk_end += 1
        }
        
    }
    tokens = tokens.concat(chunk_to_tokens(line.slice(chunk_start, chunk_end)))

    if ((include_line || match_include_command(tokens)) && !seen_filename) {
        read_include_filename(line, chunk_end)
    }
    return new LineTokens(tokens, in_comment)
}

/**
 * 
 * @param {Tagged} tagged 
 * @returns {string}
 */
function TaggedToString(tagged) {
    return tagged.c
}
/**
 * 
 * @param {Tagged[]} chunk 
 * @returns {string}
 */
function chunk_to_string(chunk) {
    return chunk.map(TaggedToString).join("")
}

/**
 * Return the longest-matching symbol token kind
 * @param {Tagged[]} content List of objects in which to search for a match
 * @param {number} start Index, inclusive, at which to start searching for the match
 * @returns {?TokenKind}
 */
function match_symbol_kind_at(content, start) {
    let best = null
    for (const symbol_kind of symbol_kinds) {
        if (content.length - start < symbol_kind.text_repr.length) {
            continue // not enough characters remaining for a full match
        }
        let found = true
        for (let i = 0; i < symbol_kind.text_repr.length; i++) {
            if (content[start+i].c != symbol_kind.text_repr[i]) {
                found = false
                break
            }
        }
        if (found && (!best || symbol_kind.text_repr.length > best.text_repr.length)) {
            best = symbol_kind
        }
    }
    return best
}

/**
 * 
 * @param {Token[]} tokens 
 * @returns {boolean}
 */
function match_include_command(tokens) {
    return ((tokens.length == 2) &&
        tokens[0].isKind(pound) &&
        tokens[1].isKind(identifier_token) &&
        tokens[1].content == "include")
}

class ReadString {
    /**
     * 
     * @param {number[]} chars 
     * @param {number} length 
     */
    constructor(chars, length) {
        this.chars = chars
        this.length = length
    }
}

/**
 * 
 * @param {Tagged[]} line 
 * @param {number} start 
 * @param {string} delim 
 * @param {boolean} append_null 
 * @returns {number[]}
 */
function read_string(line, start, delim, append_null) {
    let i = start
    let chars = []
    const escapes = {
        "'": 39,
        "\"": 34,
        "?": 63,
        "\\": 92,
        "a": 7,
        "b": 8,
        "f": 12,
        "n": 10,
        "r": 13,
        "t": 9,
        "v": 11,
        "0": 0
    }

    const octdigits = "01234567"
    const hexdigits = "0123456789abcdefABCDEF"

    while (true) {
        if (i >= line.length) {
            throw new CompilerError("missing terminating quote", line[start - 1].r)
        } else if (line[i].c == delim) {
            if (append_null) {
                chars.push(0)
            }
            return new ReadString(chars, i)
        } else if (
            (i + 1 < line.length) &&
            (line[i].c == "\\") &&
            (line[i + 1].c in escapes)
        ) {
            chars.push(escapes[line[i+1].c])
            i += 2
        } else if (
            (i + 1 < line.length) &&
            (line[i].c == "\\") &&
            octdigits.includes(line[i + 1].c)
        ) {
            let octal = line[i+1].c
            i += 2
            while (
                (i < line.length) &&
                (octal.length < 3) &&
                octdigits.includes(line[i].c)
            ) {
                octal += line[i].c
                i += 1
            }
            chars.push(parseInt(octal, 8))
        } else if (
            (i + 2 < line.length) &&
            (line[i].c == "\\") &&
            (line[i+1].c == "x") &&
            hexdigits.includes(line[i+2].c)
        ) {
            let hex = line[i+2].c
            i += 3
            while ((i < line.length) && hexdigits.includes(line[i].c)) {
                hex += line[i].c
                i += 1
            }
            chars.push(parseInt(hex, 16))
        } else {
            chars.push(line[i].c.charCodeAt(0))
            i += 1
        }
    }
}

class IncludeFilenameIndex {
    /**
     * 
     * @param {string} filename 
     * @param {number} end 
     */
    constructor(filename, end) {
        this.filename = filename
        this.end = end
    }
}

/**
 * 
 * @param {Tagged[]} line 
 * @param {number} start 
 */
function read_include_filename(line, start) {
    let end
    if (start < line.length && line[start].c == "\"") {
        end = "\""
    } else if (start < line.length && line[start].c == "<") {
        end = ">"
    } else {
        throw new CompilerError("Expected \"FILENAME\" or <FILENAME> after include directive", line[start].r)
    }
    let i = start + 1
    try {
        while (line[i].c != end) {
            i += 1
        }
    } catch (e) {
        if (e instanceof RangeError) {
            throw new CompilerError("Missing terminating character for include filename", line[start].r)
        } else {
            throw e
        }
    }
    return new IncludeFilenameIndex(chunk_to_string(line.slice(start, i+1)), i)
}

/**
 * Checks if chunk is one of the keywords - if so, return that keyword's kind
 * @param {Tagged[]} chunk List of tagged characters
 * @returns {?TokenKind} Keyword kind if match, else null
 */
function match_keyword_kind(chunk) {
    const token_str = chunk_to_string(chunk)
    for (const keyword_kind of keyword_kinds) {
        if (keyword_kind.text_repr == token_str) {
            return keyword_kind
        }
    }
    return null
}

/**
 * 
 * @param {Tagged[]} chunk 
 * @returns {?string}
 */
function match_number_string(chunk) {
    const token_str = chunk_to_string(chunk)
    const parsed = parseInt(token_str)
    if (!isNaN(parsed)) {
        return token_str
    }
    return null
}

/**
 * 
 * @param {Tagged[]} chunk 
 * @returns {?string}
 */
function match_identifier_name(chunk) {
    const token_str = chunk_to_string(chunk)
    if (token_str.match(/^[_a-zA-Z][_a-zA-Z0-9]*$/)) {
        return token_str
    }
    return null
}

export { Tagged, tokenize }
