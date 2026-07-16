import { StreamRange, StreamPosition } from "./utils.js"

class CompilerError extends Error {
    /**
     * 
     * @param {string} description 
     * @param {StreamRange} range 
     * @param {bool} warning 
     */
    constructor(description, range, warning) {
        super(`Compiler error: ${description}`)
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

class PreprocessorError extends Error {
    /**
     * 
     * @param {string} description 
     * @param {StreamRange} range 
     * @param {Token[]} processed 
     */
    constructor(description, range, processed) {
        super(`Preprocessor error: ${description}`)
        this.description = description
        this.range = range
        this.processed = processed
    }
}


export { CompilerError, NotImplementedError, PreprocessorError }

