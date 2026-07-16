import { ArgumentParser } from "argparse"

let arg_parser = new ArgumentParser({
    add_help: true,
    description: "Tiny Script-based C Compiler"
})
arg_parser.add_argument("-v", "--version",
    {
        action: "version",
        version: "0.0.1"
    }
)
arg_parser.add_argument("-o",
    {
        help: "output file",
        metavar: "OUTPUT_FILE",
        dest: "output"
    }
)
arg_parser.add_argument("input_file",
    {
        help: "files to compile",
        action: "append"
    }
)
arg_parser.add_argument("-c",
    {
        help: "just compile file into an object",
        dest: "just_compile",
        action: "store_true"
    }
)
arg_parser.add_argument("-E",
    {
        help: "Stop at the preprocessing stage; do not run the compiler. The output is in the form of preprocessed source code.",
        dest: "just_preprocess",
        action: "store_true"
    }
)
arg_parser.add_argument("-D",
    {
        help: "Set a #define symbol",
        dest: "defines"
    }
)

/**
 * 
 * @param {string[]} [args] Optional string list with arguments
 */
export function parse_args(args=[]) {
    return arg_parser.parse_args(args)
}