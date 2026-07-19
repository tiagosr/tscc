import { Assignment, Identifier, Root, SymbolDeclaration, Typedef, TypeIdentifier, TypeInstance } from "../ast/nodes.js"
import { bool_kw, char_kw, colon, identifier_token, int_kw, long_kw, semicolon, short_kw, signed_kw, typedef_kw, unsigned_kw, void_kw } from "../token_kinds.js"
import { ParserContext, NodeIndexPair } from "./parser.js"
import { parse_assignment } from "./parser_nodes.stmt.js"


/**
 * type definition: 'typedef' ( function-pointer-signature |
 *                              type-then-name )
 * @param {number} index 
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_typedef = (index, ctx) => {
    if (!ctx.token_is(index, typedef_kw)) {
        ctx.throw_error_got("expected 'typedef'", index)
    }
    const type_result = ctx.first_of(index + 1, [
        parse_type,
    ], "expected a type definition after 'typedef'")
    /** @type {TypeInstance} */
    const spec = type_result.node

    const new_typename_result = parse_new_type(type_result.index, ctx)
    /** @type {TypeIdentifier} */
    const typeid = new_typename_result.node

    return new NodeIndexPair(ctx.finish(new Typedef(typeid, spec), index, new_typename_result.index), new_typename_result.index)
}

    /**
     * 
     * @param {number} index 
     * @param {ParserContext} ctx
     * @returns {NodeIndexPair}
     */
export const parse_type = (index, ctx) => {
    if (ctx.token_in(index, [
        void_kw, char_kw, short_kw, int_kw, long_kw, // float_kw, double_kw,
        signed_kw, unsigned_kw, bool_kw, // complex_kw
    ])) {
        const id = ctx.tokens[index].content;
        return new NodeIndexPair(ctx.finish(new TypeIdentifier(id), index, index + 1), index + 1)
    } else if (ctx.token_is(index, identifier_token)) {
        const id = ctx.tokens[index].content;
        if (ctx.symbols.is_symbol_typedef(id)) {
            return new NodeIndexPair(ctx.finish(new TypeIdentifier(id), index, index + 1), index + 1)
        }
    }
    return ctx.throw_error_got("expected an already-defined type identifier", index)
}

/**
 * 
 * @param {number} index 
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_new_type = (index, ctx) => {
    if (ctx.token_is(index, identifier_token)) {
        const id = ctx.tokens[index].content;
        if (!ctx.symbols.is_symbol_typedef(id)) {
            ctx.symbols.add_symbol(id, true)
            return new NodeIndexPair(ctx.finish(new TypeIdentifier(id), index, index + 1), index + 1)
        }
    }
    return ctx.throw_error_got("expected a previously-undefined type identifier", index)
}


const parse_single_symbol = (i, ctx) => {
    if (ctx.token_is(i, identifier_token)) {
        const id = ctx.tokens[i].content
        if (!ctx.symbols.is_symbol_defined(id)) {
            ctx.symbols.add_symbol(id, false)
            return new NodeIndexPair(ctx.finish(new SymbolDeclaration(ctx.tokens[i].content), i, i + 1), i + 1)
        }
    }
    return ctx.throw_error_got("expected variable identifier", i)
}

const parse_symbol_in_assignment = (i, ctx) => {
    const assign_result = parse_assignment(i, ctx)
    /** @type {Assignment} */
    const assignment = assign_result.node
    if (assignment.target instanceof Identifier) {
        /** @type {Identifier} */
        const target = assignment.target
        if (!ctx.symbols.is_symbol_defined(target.name)) {
            ctx.symbols.add_symbol(target.name, false)
            return new NodeIndexPair(ctx.finish(assignment, i, assign_result.index), assign_result.index)
        }
    }
    return ctx.throw_error_got("expected assignment to a new symbol", i)
}
/**
 * variable-declaration-item: [ '*' ]* identifier [ array-decl ]* [ '=' initializer ]
 * TODO - for now only:       identifier
 * @param {number} index 
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_sym_decl_item = (index, ctx) => {
    return ctx.first_of(index,
        [
            parse_typedef,
            parse_symbol_in_assignment,
            parse_single_symbol
        ], "expected a variable declaration");
}

/**
 * 
 * @param {number} index 
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_sym_decl = (index, ctx) => {
    let start = index;
    let type_result = parse_type(index, ctx)
    let variable_nodes = [];
    index = type_result.index
    for (;;) {
        let result = parse_sym_decl_item(index, ctx)
        variable_nodes.push(result.node)
        index = result.index
        if (ctx.token_is(index, semicolon)) {
            index++; // finished the definition
            break;
        } else if (ctx.token_is(index, colon)) {
            index++; // comma, let's start a new one
        }
    }
    return new NodeIndexPair(ctx.finish(new SymbolDeclaration(variable_nodes, type_result.node), start, index), index)
}


/**
 * root: ( typedef | symbol-declaration | function-declaration | function-definition )*
 * @param {ParserContext} ctx
 * @returns {NodeIndexPair}
 */
export const parse_root = (ctx) => {
    let index = 0
    let items = []
    for (;;) {
        if (index >= ctx.tokens.length - 1) {
            break;
        }
        let result = ctx.first_of(index, [
            parse_typedef,
            parse_sym_decl,
        ], "expected top-level statement (type/variable/function declaration)")
        items.push(result.node)
        index = result.index
    }
    return new NodeIndexPair(ctx.finish(new Root(items), 0, index), index)
}

