
import { StreamRange, StreamPosition, Range } from "./utils";
import { CompilerError } from "./errors";
import { Token, TokenKind } from "./tokens";
import  * as token_kinds from "./token_kinds";
import * as format from 'string-format';

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
 */
function tokenize(stream, filename) {
    let tokens = []
    let lines = join_extended_lines(split_to_tagged_lines(stream, filename))
    let in_comment = false
    for (const line of lines) {
        try {
            let line_tokens = tokenize_line(line, in_comment)
            tokens += line_tokens.tokens
            in_comment = line_tokens.in_comment
        } catch (e) {
            if (e instanceof CompilerError) {
                // add msg to errorcollector
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
            const char = line[col];
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
        if (lines[i] && (lines[i][lines[i].length-1].c == "\\")) {
            if (i + 1 < lines.length) {
                lines[i].pop() // remove trailing \ character
                lines[i] += lines[i + 1]
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
    if (chunk) {
        let range = new StreamRange(chunk[0].p, chunk[chunk.length-1].p)
        const keyword_kind = match_keyword_kind(chunk)
        if (keyword_kind) {
            return [new Token(keyword_kind, null, null, range), ]
        }
        const number_string = match_number_string(chunk)
        if (number_string) {
            return [new Token(token_kinds.number, number_string, null, range), ]
        }
        const identifier_name = match_identifier_name(chunk)
        if (identifier_name) {
            return [new Token(token_kinds.identifier, identifier_name, null, range), ]
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
 * @returns {LineTokens}
 */
function tokenize_line(line, in_comment) {
    let tokens = []

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
            if (symbol_kind == token_kinds.star && next == token_kinds.slash) {
                in_comment = false
                chunk_start = chunk_end + 2
                chunk_end = chunk_start
            } else {
                // still inside comment: consume another character
                chunk_start = chunk_end + 1
                chunk_end = chunk_start
            }
        } else if (symbol_kind == token_kinds.slash && next == token_kinds.star) {
            // we just started a comment
            tokens += chunk_to_tokens(line.slice(chunk_start, chunk_end))
            in_comment = true
        } else if (symbol_kind == token_kinds.slash && next == token_kinds.slash) {
            // two slashes is a comment //
            // drop everything til the end of the line
            break
        } else if (" \t\n\r\v".indexOf(line[chunk_end].c) > -1) {
            // skip whitespace characters: commit characters that were consumed up to now
            tokens += chunk_to_tokens(line.slice(chunk_start, chunk_end))
            chunk_start = chunk_end + 1
            chunk_end = chunk_start
        } else if (include_line) {
            if (seen_filename) {
                throw new CompilerError("extra tokens at the end of #include directive")
            }
            let {filename, end} = read_include_filename(line, chunk_end)
            tokens.push(new Token(token_kinds.include_file, filename, null, 
                new Range(line[chunk_end].p, line[end].p)))
            chunk_start = end + 1
            chunk_end = chunk_start
            seen_filename = true
        } else if (symbol_kind in [token_kinds.dquote, token_kinds.squote]) {
            let quote_str = "'"
            let kind = token_kinds.char_string
            let add_null = false
            if (symbol_kind == token_kinds.dquote) {
                quote_str = "\""
                kind = token_kinds.string
                add_null = true
            }
            let [chars, end] = read_string(line, chunk_end + 1, quote_str, add_null)
            let rep = chunk_to_string(line.slice(chunk_end, end+1))
            let r = new StreamRange(line[chunk_end].p, line[end].p)

            if ((kind == token_kinds.char_string) && (chars.length == 0)) {
                // emit error message to say char string is empty
            } else if ((kind == token_kinds.char_string) && (chars.length > 1)) {
                // emit error message to say char string is too big
            }
            tokens.push(new Token(kind, chars, rep, r))

            chunk_start = end + 1
            chunk_end = chunk_start

        } else if (symbol_kind) {
            let symbol_start_index = chunk_end
            let symbol_end_index = chunk_end + symbol_kind.text_repr.length - 1
            let r = new StreamRange(line[symbol_start_index].p, line[symbol_end_index].p)
            let symbol_token = new Token(symbol_kind, null, null, r)

            tokens += chunk_to_tokens(line.slice(chunk_start, chunk_end))
            chunk_start = chunk_end + symbol_kind.text_repr.length
            chunk_end = chunk_start
        } else {
            chunk_end += 1
        }
        
    }
    tokens += chunk_to_tokens(line.splice(chunk_start, chunk_end))

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
    for (const symbol_kind of token_kinds.symbol_kinds) {
        try {
            let found = true
            for (let i = 0; i < symbol_kind.text_repr.length; i++) {
                if (content[start+i].c != symbol_kind.text_repr[i]) {
                    found = false;
                }
            }
            if (found) return symbol_kind
        } catch (error) {
            if (!(error instanceof RangeError)) {
                throw error
            }
        }
    }
}

/**
 * 
 * @param {Token[]} tokens 
 * @returns {boolean}
 */
function match_include_command(tokens) {
    return ((tokens.length == 2) &&
        tokens[0].kind == token_kinds.pound &&
        tokens[1].kind == token_kinds.identifier &&
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
            chars.append(escapes[line[i+1].c])
            i += 2
        } else if (
            (i + 1 < line.length) &&
            (line[i].c == "\\") &&
            (line[i + 1].c in octdigits)
        ) {
            let octal = line[i+1].c
            i += 2
            while (
                (i < line.length) &&
                (octal.length < 3) &&
                (line[i].c in octdigits)
            ) {
                octal += line[i].c
                i += 1
            }
            chars.push(parseInt(octal, 8))
        } else if (
            (i + 2 < line.length) &&
            (line[i].c == "\\") &&
            (line[i+1].c == "x") &&
            (line[i+2].c in hexdigits)
        ) {
            let hex = line[i+2].c
            i += 3
            while ((i < line.length) && (line[i].c in hexdigits)) {
                hex += line[i].c
                i += 1
            }
            chars.push(parseInt(hex, 16))
        } else {
            chars.append(line[i].c.charCodeAt(0))
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
    let end = ""
    if (start < line.length && line[start].c == "\"") {
        end = "\""
    } else if (start < line.length && line[start].c == "<") {
        end = ">"
    } else {
        let char = line[line.length-1]
        if (start < line.length) {
            char = line[start]
        }
        throw new CompilerError("Expected \"FILENAME\" or <FILENAME> after include directive")
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
    return new IncludeFilenameIndex(chunk_to_string(line.slice(start, i+1)))
}

/**
 * 
 * @param {Tagged[]} chunk 
 * @returns {?TokenKind}
 */
function match_keyword_kind(chunk) {
    const token_str = chunk_to_string(chunk)
    for (const keyword_kind of token_kinds.keyword_kinds) {
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
    if (token_str.match(/[_a-zA-Z][_a-zA-Z0-9]*$/)) {
        return token_str
    }
    return null
}

exports.Tagged = Tagged
exports.tokenize = tokenize
