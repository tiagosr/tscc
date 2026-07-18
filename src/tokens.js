import { StreamRange } from "./utils.js"

class TokenKind {
    /**
     * 
     * @param {string} text_repr
     * Text representation of the type of this token
     * @param {TokenKind[]} kinds
     * List of kinds to which this particular kind is added
     */
    constructor(text_repr = "", kinds = []) {
        this.text_repr = text_repr
        kinds.push(this)
    }

    /**
     * @returns {string}
     */
    toString() {
        return this.text_repr
    }
}

class Token {
    /**
     * 
     * @param {TokenKind} kind 
     * @param {string} content 
     * @param {string} rep 
     * @param {?StreamRange} r 
     */
    constructor(kind, content = "", rep = "", r = null) {
        this.kind = kind
        this.content = content || this.kind.toString()
        this.rep = rep
        this.r = r
    }

    /**
     * @returns {string}
     */
    toString() {
        return this.rep || this.content
    }

    /** @type {boolean} */
    get is_line_start() {
        return this.r.start.column == 0
    }

    /**
     * 
     * @param {TokenKind} kind 
     * @returns {boolean} true if token is of kind {@link kind}, false otherwise
     */
    isKind(kind) {
        return this.kind.text_repr == kind.text_repr
    }

    /**
     * @returns {number} line number at this token
     */
    get line() {
        return this.r.getLine()
    }
}

class ErrorToken extends Token {
    
}

export { TokenKind, Token, ErrorToken }
