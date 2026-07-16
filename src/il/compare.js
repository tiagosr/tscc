import { Loc, LiteralValueLoc, MemLoc } from "./locations.js"
import { IOp, RelLocConflict } from "./il.js"
import { NotImplementedError } from "../errors.js"

class GeneralCmp extends IOp {

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
    get rel_spot_conflicts() { return new RelLocConflict(this.output, [this.arg1, this.arg2]) }
}

class NotEqualCmp extends GeneralCmp {}
class EqualCmp extends GeneralCmp {}
class LessCmp extends GeneralCmp { }
class GreaterCmp extends GeneralCmp { }
class LessOrEqCmp extends GeneralCmp { }
class GreaterOrEqCmp extends GeneralCmp { }

export { NotEqualCmp, EqualCmp, LessCmp, GreaterCmp, LessOrEqCmp, GreaterOrEqCmp }

