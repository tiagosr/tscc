import { NotImplementedError, CompilerError } from "./errors.js"

class CompilationTarget {
    
}

/**
 * Loads a named architecture
 * @param {String} arch 
 * @returns {CompilationTarget}
 */
async function load_target(arch) {
    var target = (await import("../arch/"+arch+"/target")).Target
    return target
}

export { CompilationTarget, load_target }
