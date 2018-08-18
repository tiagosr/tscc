import * as utils from "../utils";
import { CompilerError } from "../errors";

class SimpleSymbolTable {
    constructor() {
        this.symbols = []
        this.new_scope()
    }
    new_scope() {
        this.symbols.push(new Array())
    }
    end_scope() {
        this.symbols.pop()
    }
    /**
     * 
     * @param {*} identifier 
     * @param {*} is_typedef 
     */
    add_symbol(identifier, is_typedef) {
        this.symbols[this.symbols.length-1][identifier.context] = is_typedef
    }
}