const ctypes = require("../ctypes")


class LValue {
    /** @type {ctypes.CType} */
    get ctype() { throw new Error("not implemented") }

    /**
     * 
     * @param {IValue} rvalue 
     * @param {ICode} i_code 
     * @param {*} r 
     */
    set_to(rvalue, i_code, r) {
        
    }

}

exports.LValue = LValue