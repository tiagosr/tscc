import * as os from "os"
import * as fs from "fs"
import {ArgumentParser} from "argparse"

let arg_parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: "Tiny Script-based C Compiler"
})
arg_parser.addArgument(
    "-o",
    {
        help: "output file",
        metavar: "OUTPUT_FILE",
        dest: "output"
    }
)
arg_parser.addArgument(
    'input_file',
    {
        help: "files to compile",
        dest: "input_files",
        action: "append"
    }
)
arg_parser.addArgument(
    "-c",
    {
        help: "just compile file into an object",
        dest: "just_compile",
        action: "storeTrue"
    }
)


