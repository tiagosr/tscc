import { Range } from "./utils";
import { Token } from "./tokens";
import * as lexer from "./lexer";
import * as token_kinds from "./token_kinds";

/**
 * 
 * @param {Token[]} tokens 
 * @param {string} this_file 
 */
function process(tokens, this_file) {
    let processed = []
    let i = 0
    while (i < tokens.length - 2) {
        if (tokens[i].kind == token_kinds.pound &&
            tokens[i+1].kind == token_kinds.identifier &&
            tokens[i+1].content == "include" &&
            tokens[i+2].kind == token_kinds.include_file
        )
        {
            try {
                let { file, filename } = read_file(tokens[i + 2].content, this_file)
                let new_tokens = process(lexer.tokenize(file, filename), filename)
                processed += new_tokens                
            } catch (e) {
                if (e instanceof IOError) {

                } else {
                    throw e;
                }
            }
        }
    }
}

function read_file(include_file, this_file) {
    
}