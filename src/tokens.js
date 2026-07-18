import { StreamRange } from "./utils.js"

class TokenKind {
    /**
     * 
     * @param {String} text_repr
     * Text representation of the type of this token
     * @param {TokenKind[]} kinds
     * List of kinds to which this particular kind is added
     */
    constructor(text_repr = "", kinds = []) {
        this.text_repr = text_repr
        kinds.push(this)
    }

    /**
     * @returns {String}
     */
    toString() {
        return this.text_repr
    }
}

class Token {
    /**
     * 
     * @param {TokenKind} kind 
     * @param {String} content 
     * @param {String} rep 
     * @param {?StreamRange} r 
     */
    constructor(kind, content = "", rep = "", r = null) {
        this.kind = kind
        this.content = content || this.kind.toString()
        this.rep = rep
        this.r = r
    }

    /**
     * @returns {String}
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
