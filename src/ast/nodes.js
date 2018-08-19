const StreamRange = require("../utils").StreamRange
const CompilerError = require("../errors").CompilerError

const control_ops = require("../il/control")
const il = require("../il/il")


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
            il_context.add(control_ops.Jump(label))
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

exports.Node = Node
exports.Root = Root
exports.Compound = Compound
exports.Return = Return
exports.Break = Break
exports.Continue = Continue
exports.EmptyStatement = EmptyStatement
exports.ExprStatement = ExprStatement
exports.IfStatement = IfStatement
