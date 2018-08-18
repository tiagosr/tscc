const argparse = require("argparse")

let arg_parser = new argparse.ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: "Tiny Script-based C Compiler"
})
arg_parser.addArgument("-o",
    {
        help: "output file",
        metavar: "OUTPUT_FILE",
        dest: "output"
    }
)
arg_parser.addArgument("input_file",
    {
        help: "files to compile",
        action: "append"
    }
)
arg_parser.addArgument("-c",
    {
        help: "just compile file into an object",
        dest: "just_compile",
        action: "storeTrue"
    }
)
arg_parser.addArgument("-E",
    {
        help: "Stop at the preprocessing stage; do not run the compiler. The output is in the form of preprocessed source code.",
        dest: "just_preprocess",
        action: "storeTrue"
    }
)
arg_parser.addArgument("-D",
    {
        help: "Set a #define symbol",
        dest: "defines"
    }
)

/**
 * 
 * @param {string[]} [args] Optional string list with arguments
 */
exports.parse_args = function parse_args(args=null) {
    return arg_parser.parseArgs(args)
}