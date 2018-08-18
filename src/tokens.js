const StreamRange = require("./utils").StreamRange

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
        kinds.sort(TokenKind.kindsSorter)
    }

    /**
     * Sorts kinds by key length
     * @param {TokenKind} a 
     * @param {TokenKind} b 
     * @returns {number}
     */
    static kindsSorter(a, b) {
        return a.text_repr.length - b.text_repr.length
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
}

class ErrorToken extends Token {
    
}

exports.TokenKind = TokenKind
exports.Token = Token
exports.ErrorToken = ErrorToken
