const locations = require("./locations")
const il = require("./il")
const Loc = locations.Loc
const LiteralValueLoc = locations.LiteralValueLoc
const MemLoc = locations.MemLoc
const NotImplementedError = require("../errors").NotImplementedError

class GeneralCmp extends il.IOp {

    /**
     * 
     * @param {Loc} output 
     * @param {Loc} arg1 
     * @param {Loc} arg2 
     */
    constructor(output, arg1, arg2) {
        super()
        this.output = output
        this.arg1 = arg1
        this.arg2 = arg2
    }
    get inputs() { return [this.arg1, this.arg2] }
    get outputs() { return [this.output] }
    get rel_spot_conflicts() { return new il.RelLocConflict(this.output, [this.arg1, this.arg2]) }
}

class NotEqualCmp extends GeneralCmp {}
class EqualCmp extends GeneralCmp {}
class LessCmp extends GeneralCmp { }
class GreaterCmp extends GeneralCmp { }
class LessOrEqCmp extends GeneralCmp { }
class GreaterOrEqCmp extends GeneralCmp { }

exports.NotEqualCmp = NotEqualCmp
exports.EqualCmp = EqualCmp
exports.LessCmp = LessCmp
exports.GreaterCmp = GreaterCmp
exports.LessOrEqCmp = LessOrEqCmp
exports.GreaterOrEqCmp = GreaterOrEqCmp

