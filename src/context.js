const CompilerError = require("./errors").CompilerError
const CompilationTarget = require("./target").CompilationTarget
const Console = require("console").Console

class Config {
    /**
     * 
     * @param {string} base_path Compiler base path
     * @param {boolean} [compiler_debug]
     */
    constructor(base_path, compiler_debug = false) {
        this.base_path = base_path
        /** @type {string[]} */
        this.sys_include_paths = []
        this.compiler_debug = compiler_debug
    }
}

class Context {
    /**
     * 
     * @param {Config} config 
     */
    constructor(config) {
        this.config = config
        this.console = new Console(process.stdout, process.stderr)
    }
    /**
     * 
     * @param {CompilerError} err 
     * @returns {void}
     */
    emit_error(err) {
        if (this.config.compiler_debug) {
            throw err
        } else {
            this.console.error(err.message)
        }
    }
    /**
     * 
     * @param {CompilerError} warning 
     * @returns {void}
     */
    emit_warning(warning) {
        if (this.config.compiler_debug) {
            throw warning
        } else {
            this.console.warn(warning.message)
        }
    }

    /**
     * 
     * @param {string} info 
     * @returns {void}
     */
    emit_info(info) {
        this.console.info(info)
    }
}

class PreprocessorContext extends Context {
    /**
     * 
     * @param {Config} config 
     * @param {Object.<string, Token[]>} defines
     */
    constructor(config, defines) {
        super(config)
        this.defines = defines
        if (!this.defines) {
            this.defines = {}
        }
    }
}

class CompilerContext extends Context {
    /**
     * 
     * @param {Config} config
     * @param {CompilationTarget} target
     */
    constructor(config, target) {
        super(config)
        this.objects = []
        this.target = target
    }
}


exports.Config = Config
exports.PreprocessorContext = PreprocessorContext
exports.CompilerContext = CompilerContext
