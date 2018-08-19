const utils = require("../utils")
const StreamRange = utils.StreamRange
const ctypes = require("../ctypes")
const il = require("../il/il")
const errors = require("../errors")
const CompilerError = errors.CompilerError
const NotImplementedError = errors.NotImplementedError


class LValue {
    /** @type {ctypes.CType} */
    get ctype() { throw new NotImplementedError() }

    /**
     * 
     * @param {il.IValue} rvalue
     * @param {il.ILContext} i_code 
     * @param {StreamRange} r 
     */
    set_to(rvalue, i_code, r) {
        throw new NotImplementedError()
    }
    /**
     * 
     * @param {il.ILContext} il_code 
     */
    addr(il_code) {
        throw new NotImplementedError()
    }
    /**
     * 
     * @param {il.ILContext} il_code 
     */
    val(il_code) {
        throw new NotImplementedError()
    }
    /** @type {boolean} */
    get modable() {
        // TODO: add "not const-qualified"
        // TODO: add "struct/union has no const-qualified member"
        let ctype = this.ctype
        if (ctype.is_array) {
            return false
        }
        if (ctype.is_incomplete){
            return false
        }
        if (ctype.is_const) {
            return false
        }
        if (ctype.is_struct_union) {
            /** @type {ctypes.UnionStructCType} */
            let struct_ctype = ctype
            if (struct_ctype.members.some(function(member) { member.type.is_const })) {
                return false
            }
        }
        return true
    }
}

class DirectLValue extends LValue {
    /**
     * 
     * @param {il.IValue} il_value 
     */
    constructor(il_value) {
        super()
        this.il_value = il_value
    }
    get ctype() { return this.il_value.ctype }
    set_to(rvalue, il_code, range, context) {
        check_cast(rvalue, this.ctype, range, context)
        let right_cast = set_type(rvalue, this.ctype, il_code, this.il_value, context)
    }
    addr(il_code) {
        let out = new il.IValue(new ctypes.PointerCType(this.il_value.ctype))
        //il_code.add(value_cmds.AddrOf(out, this.il_value))
        return out
    }
    val(il_code) { return this.il_value }
}

class IndirectLValue extends LValue {
    /**
     * 
     * @param {il.IValue} addr_value 
     */
    constructor(addr_value) {
        super()
        this.addr_value = addr_value
    }
    get ctype() { return this.addr_value.ctype.arg }
    set_to(rvalue, il_code, range, context) {
        check_cast(rvalue, this.ctype, range, context)
        return set_type(rvalue, this.ctype, il_code, this.addr_value, context)
    }
    addr(il_code) {
        let out = new il.IValue(new ctypes.PointerCType(this.addr_value.ctype))
        //il_code.add(value_cmds.AddrOf(out, this.addr_value))
        return out
    }
    val(il_code) { return this.addr_value }
}



function report_err(context, cb) {
    try {
        cb()
    } catch (e) {
        if (e instanceof CompilerError) {
            if (e.warning) {
                context.emit_warning(e)
            } else {
                context.emit_error(e)
            }
        } else {
            throw e
        }
    }
}

/**
 * 
 * @param {il.IValue} il_value 
 * @param {ctypes.CType} ctype 
 * @param {StreamRange} range 
 */
function check_cast(il_value, ctype, range, context) {
    if (il_value.ctype.weak_compat(ctype)) {
        return
    }
    if (ctype.is_arith && il_value.ctype.is_arith) {
        return
    }
    if (ctype.is_struct_union && il_value.ctype.is_struct_union &&
        il_value.ctype.weak_compat(ctype)) {
        return
    } else if (ctype.is_pointer && il_value.ctype.is_pointer) {
        let ctype_arg = ctype.as_pointer.pointed_to
        let il_value_ctype_arg = il_value.ctype.as_pointer.pointed_to
        if (ctype_arg.weak_compat(il_value_ctype_arg) && !(ctype_arg.is_const || il_value_ctype_arg.is_const)) {
            return
        } else if (ctype_arg.is_void && il_value.is_void && !(ctype_arg.is_const || il_value_ctype_arg.is_const)) {
            return
        } else if (ctype_arg.is_object && il_value.is_void && !(ctype_arg.is_const || il_value_ctype_arg.is_const)) {
            return
        }
        report_err(context, function () {
            throw new CompilerError("Conversion from incompatible pointer type", range)
        })
    } else if (ctype.is_pointer && il_value.literal) {
        return
    } else if (ctype.is_bool && il_value.ctype.is_pointer) {
        throw new CompilerError("Invalid conversion between types", range)
    }
}

/**
 * 
 * @param {il.IValue} il_value 
 * @param {ctypes.CType} ctype 
 * @param {il.ILContext} il_code 
 * @param {?il.IValue} output 
 * @param {*} context 
 */
function set_type(il_value, ctype, il_code, output, context) {
    if (!output && il_value.ctype.compatible(ctype)) {
        return il_value
    } else if (!output && il_value.literal) {
        output = new il.IValue(ctype)
        let val = il_value.literal.val
        if (ctype.is_integral) {
            val = shift_into_range(il_value.literal.val, ctype)
        }
        il_code.register_literal_var(output, val)
        return output
    } else if (output == il_value) {
        return il_value
    } else {
        if (!output) {
            output = new il.IValue(ctype)
        }
        //il_code.add(value_ops.Set(output, il_value))
        return output
    }
}

/**
 * 
 * @param {number} val 
 * @param {ctypes.IntegerCType} ctype 
 * @returns {number}
 */
function shift_into_range(val, ctype) {
    let max_val = 1 << (ctype.size * 8)
    let range = max_val
    if (ctype._signed) {
        max_val = 1 << (ctype.size * 8 - 1)
    }
    val = val % range
    if (val >= max_val) {
        val -= range
    }
    return val
}

exports.LValue = LValue