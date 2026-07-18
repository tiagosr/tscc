import { readFileSync } from "fs"
import { resolve } from "path"
import { tokenize } from "./lexer.js"
import { process as preprocess } from "./preprocessor.js"
import { Config, PreprocessorContext, CompilerContext } from "./context.js"
import { parse_args } from "./cmdline.js"
import { load_target } from "./target.js"
import { parse } from "./parser/parser.js"
import process from "process"

let args = parse_args(process.argv)

let config = new Config(resolve(import.meta.dirname, ".."), true)
let compile_target = await load_target("m68k")

let defines = [] //[TODO] work on command line defines
/**
 * Process a single file
 * @param {string} filename 
 * @param {Config} config 
 * @param {object} args 
 */
function process_file(filename, config, args) {
    let preprocess_context = new PreprocessorContext(config, defines)
    let read_file = readFileSync(filename).toString()
    let tokenized = tokenize(read_file, filename, preprocess_context)
    let preprocessed = tokenized
    if (!args.skip_preprocess) {
        preprocessed = preprocess(tokenized, filename, preprocess_context)
    }
    if (args.just_preprocess) {
        let all = preprocessed.map(function(token) { return token.toString() }).join(' ')
        preprocess_context.emit_info(all)
        return true
    }
    let target_context = new CompilerContext(config, compile_target)
    let ast = parse(preprocessed, target_context)
}

let input_files = args.input_file
input_files.concat(args.input_files)

let results = []
for (const input_file of input_files) {
    results.push(process_file(input_file, config, args))
}

