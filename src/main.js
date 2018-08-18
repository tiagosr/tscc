const os = require("os")
const fs = require("fs")
const path = require("path")
const tokenize = require("./lexer").tokenize
const preprocess = require("./preprocessor").process
const context = require("./context")
const Config = context.Config
const PreprocessorContext = context.PreprocessorContext
const parse_args = require("./cmdline").parse_args

let args = parse_args()

let config = new Config(path.resolve(__dirname, ".."), true)


let defines = [] //[TODO] work on command line defines
/**
 * Process a single file
 * @param {string} filename 
 * @param {Config} config 
 * @param {Object} args 
 */
function process_file(filename, config, args) {
    let context = new PreprocessorContext(config, defines)
    let read_file = fs.readFileSync(filename).toString()
    let tokenized = tokenize(read_file, filename, context)
    let preprocessed = preprocess(tokenized, filename, context)
    if (args.just_preprocess || 1) {
        let all = preprocessed.map(function(token) { return token.toString() }).join(' ')
        context.emit_info(all)
        return true
    }
}

let input_files = args.input_file
input_files.concat(args.input_files)

let results = []
for (const input_file of input_files) {
    results.push(process_file(input_file, config, args))
}

