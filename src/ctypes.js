import { void_kw, bool_kw, char_kw, short_kw, int_kw, long_kw } from "./token_kinds.js"
import { NotImplementedError } from "./errors.js"

class CType {
    /**
     * 
     * @param {number} size Result of sizeof() on this type
     * @param {bool} [is_const] True if type instances must be considered const
     */
    constructor(size, is_const = false) {
        this.size = size
        this._const = is_const

        this._bool = false

        this._orig = this
    }

    /**
     * Check for weak compatibility (unqualified equality) with {@link other} type
     * @param {CType} other Type to compare to
     * @returns {boolean} True if compatible, false otherwise
     */
    weak_compat(other) {
        (other)
        throw new NotImplementedError
    }

    get is_complete() { return false }
    get is_incomplete() { return false }
    get is_object() { return false }
    get is_arith() { return false }
    get is_integral() { return false }
    get is_pointer() { return false }
    get is_function() { return false }
    get is_void() { return false }
    get is_bool() { return this._bool }
    get is_array() { return false }
    get is_struct_union() { return false }
    make_unsigned() {
        throw new Error("not implemented")
    }
    /**
     * 
     * @param {CType} other Type to compare to
     */
    compatible(other) {
        return this.weak_compat(other) && (this.is_const == other.is_const)
    }
    get is_scalar() { return this.is_arith || this.is_pointer }
    get is_const() { return this._const }

    /**
     * @returns {CType} Type object with const qualifier
     */
    make_const() {
        return Object.assign({ __prototype__: this.__prototype__ }, this, { _const: true })
    }
    /**
     * @returns {CType} Type object with const qualifier removed
     */
    make_unqual() {
        return Object.assign({ __prototype__: this.__prototype__ }, this, { _const: false })
    }

    /** @type {PointerCType} */
    get as_pointer() {
        throw new NotImplementedError()
    }

    /** @type {UnionStructCType} */
    get as_union_struct() {
        throw new NotImplementedError()
    }

    /** @type {FunctionCType} */
    get as_function() {
        throw new NotImplementedError()
    }
}

class IntegerCType extends CType {

    /**
     * Integer C type - should only be instatiated once for each distinct integer C type
     * @param {number} size 
     * @param {boolean} signed 
     */
    constructor(size, signed) {
        super(size)
        this._signed = signed
    }
    weak_compat(other) {
        return (this._orig == other._orig) &&
            (this._signed == other._signed) &&
            (this.is_bool == this.is_bool)
    }
    get is_complete() { return true }
    get is_object() { return true }
    get is_arith() { return true }
    get is_integral() { return true }
    /**
     * @returns {IntegerCType}
     */
    make_unsigned() {
        return Object.assign({ __prototype__: this.__prototype__ }, this, { _signed: false })
    }
}

class VoidCType extends CType {
    constructor() {
        super(1) //TODO: set size to base "byte" size
    }
    weak_compat(other) { return other.is_void }
    get is_incomplete() { return true }
    get is_void() { return true }
    get is_object() { return true }
}

class PointerCType extends CType {
    /**
     * Represents a pointer C type
     * @param {CType} pointed_to Type pointed to
     * @param {boolean} [is_const] 
     */
    constructor(pointed_to, is_const = false) {
        super(4, is_const)
        this.pointed_to = pointed_to
    }
    weak_compat(other) {
        return other.is_pointer && this.pointed_to.compatible(other.pointed_to)
    }
    get is_complete() { return true }
    get is_pointer() { return true }
    get is_object() { return true }
    get as_pointer() { return this }
}

class FunctionCType extends CType {
    /**
     * 
     * @param {CType[]} args 
     * @param {CType} ret 
     * @param {boolean} no_info 
     */
    constructor(args, ret, no_info) {
        super(1)
        this.args = args
        this.ret = ret
        this.no_info = no_info
    }

    get is_function() { return true }
}

class UnionStructMemberCType {
    /**
     * 
     * @param {String} name 
     * @param {CType} type 
     */
    constructor(name, type) {
        this.name = name
        this.type = type
    }
}
class UnionStructCTypeOffset {
    constructor(offset, type) {
        this.offset = offset
        this.type = type
    }
}
class UnionStructCType extends CType {
    /**
     * Base class for structs and unions
     * @param {?String} tag Name of the struct/union, or null if anonymous
     * @param {?UnionStructMemberCType[]} [members] List of members
     */
    constructor(tag, members = null) {
        super(1)
        this.tag = tag
        /** @type {Object.<String, UnionStructCTypeOffset>} */
        this.offsets = {}
        /** @type {UnionStructMemberCType[]} */
        this.members = []
        this.set_members(members)
    }

    weak_compat(other) {
        // within a translation unit, two structs are compatible
        // if they share the same declaration
        return this._orig == other._orig
    }

    get is_complete() { return this.members != null }
    get is_incomplete() { return !this.is_complete }
    get is_object() { return true }
    get is_struct_union() { return true }
    get_offset(member) {
        if (member in this.offsets) {
            return this.offsets[member]
        } else {
            return [null, null]
        }
    }
    /**
     * 
     * @param {UnionStructMemberCType[]} members 
     */
    set_members(members) {
        throw new Error("not implemented")
    }
}

class StructCType extends UnionStructCType {
    /**
     * 
     * @param {UnionStructMemberCType[]} members 
     */
    set_members(members) {
        this.members = members
        this.offsets = {}
        let curr_offset = 0
        for (let item of members) {
            this.offsets[item.name] = new UnionStructCTypeOffset(curr_offset, item.type)
            curr_offset += item.size // deal with struct packing here
        }
        this.size = curr_offset
    }
}

class UnionCType extends UnionStructCType {
    /**
     * 
     * @param {UnionStructMemberCType[]} members 
     */
    set_members(members) {
        this.members = members
        this.offsets = {}
        this.size = 0
        for (let item of members) {
            this.offsets[item.name] = new UnionStructCTypeOffset(0, item.type)
            this.size = Math.max(this.size, item.type.size)
        }
    }
}


export { CType, VoidCType, IntegerCType, PointerCType, FunctionCType, UnionStructMemberCType, UnionStructCType, StructCType, UnionCType }


export const void_t = new VoidCType()
export const bool_t = new IntegerCType(1, false)
bool_t._bool = true

export const char_t = new IntegerCType(1, true)
export const unsigned_char_t = new IntegerCType(1, false)
export const unsigned_char_max = 255

export const short_t = new IntegerCType(2, true)
export const unsigned_short_t = new IntegerCType(2, false)
export const unsigned_short_max = 65535

export const int_t = new IntegerCType(4, true)
export const unsigned_int_t = new IntegerCType(4, false)
export const int_max = 2147483647
export const int_min = -2147483648

export const long_t = new IntegerCType(8, true)
export const unsigned_long_t = new IntegerCType(8, false)
export const long_max = 9223372036854775807n
export const long_min = -9223372036854775808n


export const simple_types = {
    [void_kw]: void_t,
    [bool_kw]: bool_t,
    [char_kw]: char_t,
    [short_kw]: short_t,
    [int_kw]: int_t,
    [long_kw]: long_t
}
