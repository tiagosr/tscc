import { StreamRange, StreamPosition } from "./utils";


class CompilerError extends Error {
    /**
     * 
     * @param {string} description 
     * @param {StreamRange} range 
     * @param {bool} warning 
     */
    constructor(description, range, warning) {
        this.description = description
        this.range = range
        this.warning = warning
        super("Compiler error: "+description)
    }
}




exports.CompilerError = CompilerError

