import { CompilerError, PreprocessorError } from "./errors.js"
import { CompilationTarget } from "./target.js"
import { Token } from "./tokens.js"
import { Console } from "console"
import process from "process"

class Config {
    /**
     * 
     * @param {string} base_path Compiler base path
     * @param {boolean} compiler_debug flag to set compiler to debug mode
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
     * @param {Error} err 
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
     * @param {Error} warning 
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
     * @param {{[key:string]: Token[]}} defines
     */
    constructor(config, defines) {
        super(config)
        this.defines = defines
        if (!this.defines) {
            this.defines = {}
        }
    }

    /**
     * 
     * @param {PreprocessorError} err 
     */
    emit_error(err) {
        super.emit_error(err)
    }

    /**
     * 
     * @param {PreprocessorError} err 
     */
    emit_warning(err) {
        super.emit_warning(err)
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

    /**
     * 
     * @param {CompilerError} err 
     */
    emit_error(err) {
        super.emit_error(err)
    }

    /**
     * 
     * @param {CompilerError} err 
     */
    emit_warning(err) {
        super.emit_warning(err)
    }
}


export { Config, PreprocessorContext, CompilerContext }
