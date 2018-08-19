const NotImplementedError = require("./errors").NotImplementedError
const CompilerError = require("./errors").CompilerError

class CompilationTarget {
    
}

/**
 * Loads a named architecture
 * @param {string} arch 
 * @returns {CompilationTarget}
 */
function load_target(arch) {
    var target = require("../arch/"+arch+"/target").Target
    return target
}

exports.CompilationTarget = CompilationTarget
exports.load_target = load_target
