const utils = require("./utils")
const StreamRange = utils.StreamRange
const StreamPosition = utils.StreamPosition

class CompilerError extends Error {
    /**
     * 
     * @param {string} description 
     * @param {StreamRange} range 
     * @param {bool} warning 
     */
    constructor(description, range, warning) {
        super("Compiler error: " + description)
        this.description = description
        this.range = range
        this.warning = warning
    }
}

class NotImplementedError extends Error {
    constructor() {
        super("Not implemented")
    }
}



exports.CompilerError = CompilerError
exports.NotImplementedError = NotImplementedError

