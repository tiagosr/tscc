//import { StreamRange, StreamPosition } from "./utils";

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




exports.CompilerError = CompilerError

