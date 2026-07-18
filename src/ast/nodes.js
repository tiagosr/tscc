import { StreamRange } from "../utils.js"
import { CompilerError } from "../errors.js"

import { Jump } from "../il/control.js"


class Node {
    constructor() {
        /** @type {StreamRange} */
        this.r = null
    }
    make_il(il_context, symbol_table) {
        throw new Error("Not implemented")
    }
}

class Root extends Node {
    /**
     * 
     * @param {Node[]} nodes 
     */
    constructor(nodes) {
        super()
        this.nodes = nodes
    }

    make_il(il_context, symbol_table) {
        for (const node of this.nodes) {
            node.make_il(il_context, symbol_table)
        }
    }
}

class Compound extends Node {
    constructor(nodes) {
        super()
        this.nodes = nodes
    }
    make_il(il_context, symbol_table, no_scope = false) {
        if (!no_scope) {
            symbol_table.new_scope()
        }
        for (const node of this.nodes) {
            node.make_il(il_context, symbol_table)
        }
        if (!no_scope) {
            symbol_table.end_scope()
        }
    }
}

class Return extends Node {
    constructor(return_value) {
        super()
        this.return_value = return_value
    }
    make_il(il_context, symbol_table, context) {
        if (this.return_value && !context.return_type.is_void()) {
            let il_value = this.return_value.make_il(il_context, symbol_table, context)
            
        } else if (this.return_value && context.return_type.is_void()) {
            throw new CompilerError("Function with void return type cannot return a value", this.r)
        } else if (!this.return_value && !context.return_type.is_void()) {
            throw new CompilerError("Function with non-void return type must return a value", this.r)
        } else {
            //il_context.add(control_cmds.Return())
        }
    }
}

class BreakContinue extends Node {
    get get_label() { return function (c) { return null } }
    get description() { return "invalid(break/continue)" }
    make_il(il_context, symbol_table, c) {
        let label = this.get_label(c)
        if (label) {
            il_context.add(Jump(label))
        } else {
            throw new CompilerError(this.description+" statement not in a loop", this.r)
        }
    }
}
class Break extends BreakContinue {
    get get_label() { return function (c) { return c.break_label } }
    get description() { return "break" }
}
class Continue extends BreakContinue {
    get get_label() { return function (c) { return c.continue_label } }
    get description() { return "continue" }
}

class EmptyStatement extends Node {
    make_il(il_context, symbol_table, c) {}
}

class ExprStatement extends Node {
    constructor(expr) {
        super()
        this.expr = expr
    }
    make_il(il_context, symbol_table, c) {
        this.expr.make_il(il_context, symbol_table, c)
    }
}

class IfStatement extends Node {
    /**
     * 
     * @param {ExprStatement} cond 
     * @param {ExprStatement} stat
     * @param {ExprStatement} else_stat
     */
    constructor(cond, stat, else_stat) {
        super()
        this.cond = cond
        this.stat = stat
        this.else_stat = else_stat
    }
    make_il(il_context, symbol_table, c) {
        let endif_label = il_context.get_label()

    }
}

class Identifier extends Node {
    constructor(name) {
        super()
        this.name = name
    }
}

class NumberLiteral extends Node {
    constructor(raw) {
        super()
        this.raw = raw
    }
}

class StringLiteral extends Node {
    constructor(raw) {
        super()
        this.raw = raw
    }
}

class Unary extends Node {
    /**
     * @param {TokenKind} op
     * @param {Node} expr
     * @param {boolean} [prefix]
     */
    constructor(op, expr, prefix = true) {
        super()
        this.op = op
        this.expr = expr
        this.prefix = prefix
    }
}

class Binary extends Node {
    /**
     * @param {TokenKind} op
     * @param {Node} left
     * @param {Node} right
     */
    constructor(op, left, right) {
        super()
        this.op = op
        this.left = left
        this.right = right
    }
}

class Assignment extends Node {
    /**
     * @param {TokenKind} op
     * @param {Node} target
     * @param {Node} value
     */
    constructor(op, target, value) {
        super()
        this.op = op
        this.target = target
        this.value = value
    }
}

class Ternary extends Node {
    constructor(cond, then_expr, else_expr) {
        super()
        this.cond = cond
        this.then_expr = then_expr
        this.else_expr = else_expr
    }
}

class Call extends Node {
    /**
     * @param {Node} callee
     * @param {Node[]} args
     */
    constructor(callee, args) {
        super()
        this.callee = callee
        this.args = args
    }
}

class Index extends Node {
    constructor(target, index) {
        super()
        this.target = target
        this.index = index
    }
}

class Member extends Node {
    /**
     * @param {Node} target
     * @param {string} name
     * @param {boolean} [arrow]
     */
    constructor(target, name, arrow = false) {
        super()
        this.target = target
        this.name = name
        this.arrow = arrow
    }
}


class SymbolDeclarationItem extends Node {
    constructor(name, with_indirection = [], with_assignment = null) {
        super()
        this.name = name
        this.with_indirection = with_indirection
        this.with_assignment = with_assignment
        this.type = null
    }
    setType(type) {
        this.type = type
    }
}

class TypeIdentifier extends Node {
    constructor(name) {
        super()
        this.name = name
    }
}

class TypeInstance extends Node {
    constructor(name) {
        super()
        this.name = name
    }

}

class Typedef extends Node {
    constructor(name, spec) {
        super()
        this.name = name
        this.spec = spec
    }
}

class SymbolDeclaration extends Node {
    constructor(items, of_type) {
        super()
        this.items = items
        this.of_type = of_type
    }
}

export {
    Node, Root, Compound, Return, Break, Continue, EmptyStatement, ExprStatement, IfStatement,
    Identifier, NumberLiteral, StringLiteral, Unary, Binary, Assignment, Ternary, Call, Index, Member,

    TypeIdentifier, TypeInstance, Typedef, SymbolDeclaration, SymbolDeclarationItem
}
