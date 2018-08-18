const TokenKind = require("./tokens").TokenKind

/** @type {TokenKind[]} */
let keyword_kinds = []
/** @type {TokenKind[]} */
let symbol_kinds = []
/** @type {TokenKind[]} */
let error_kinds = []

// keywords for base types
exports.bool_kw = new TokenKind("_Bool", keyword_kinds)
exports.char_kw = new TokenKind("char", keyword_kinds)
exports.short_kw = new TokenKind("short", keyword_kinds)
exports.int_kw = new TokenKind("int", keyword_kinds)
exports.long_kw = new TokenKind("long", keyword_kinds)
exports.short_kw = new TokenKind("short", keyword_kinds)
exports.signed_kw = new TokenKind("signed", keyword_kinds)
exports.unsigned_kw = new TokenKind("unsigned", keyword_kinds)
exports.void_kw = new TokenKind("void", keyword_kinds)

// keywords for data structure and storage classes
exports.auto_kw = new TokenKind("auto", keyword_kinds)
exports.static_kw = new TokenKind("static", keyword_kinds)
exports.extern_kw = new TokenKind("extern", keyword_kinds)
exports.struct_kw = new TokenKind("struct", keyword_kinds)
exports.enum_kw = new TokenKind("enum", keyword_kinds)
exports.union_kw = new TokenKind("union", keyword_kinds)
exports.register_kw = new TokenKind("register", keyword_kinds)
exports.volatile_kw = new TokenKind("volatile", keyword_kinds)
exports.const_kw = new TokenKind("const", keyword_kinds)
exports.typedef_kw = new TokenKind("typedef", keyword_kinds)
exports.sizeof_kw = new TokenKind("sizeof", keyword_kinds)

// keywords for control flow structures
exports.return_kw = new TokenKind("return", keyword_kinds)
exports.if_kw = new TokenKind("if", keyword_kinds)
exports.else_kw = new TokenKind("else", keyword_kinds)
exports.while_kw = new TokenKind("while", keyword_kinds)
exports.for_kw = new TokenKind("for", keyword_kinds)
exports.break_kw = new TokenKind("break", keyword_kinds)
exports.continue_kw = new TokenKind("continue", keyword_kinds)
exports.do_kw = new TokenKind("do", keyword_kinds)
exports.switch_kw = new TokenKind("switch", keyword_kinds)
exports.case_kw = new TokenKind("case", keyword_kinds)
exports.default_kw = new TokenKind("default", keyword_kinds)
exports.goto_kw = new TokenKind("goto", keyword_kinds)


// symbols for operations
exports.plus = new TokenKind("+", symbol_kinds)
exports.minus = new TokenKind("-", symbol_kinds)
exports.star = new TokenKind("*", symbol_kinds)
exports.slash = new TokenKind("/", symbol_kinds)
exports.mod = new TokenKind("%", symbol_kinds)
exports.incr = new TokenKind("++", symbol_kinds)
exports.decr = new TokenKind("--", symbol_kinds)
exports.equals = new TokenKind("=", symbol_kinds)
exports.plusequals = new TokenKind("+=", symbol_kinds)
exports.minusequals = new TokenKind("-=", symbol_kinds)
exports.starequals = new TokenKind("*=", symbol_kinds)
exports.divequals = new TokenKind("/=", symbol_kinds)
exports.modequals = new TokenKind("%=", symbol_kinds)
exports.xorequals = new TokenKind("^=", symbol_kinds)
exports.complequals = new TokenKind("~=", symbol_kinds)
exports.equalequal = new TokenKind("==", symbol_kinds)
exports.notequal = new TokenKind("!=", symbol_kinds)
exports.bool_and = new TokenKind("&&", symbol_kinds)
exports.bool_or = new TokenKind("||", symbol_kinds)
exports.bool_not = new TokenKind("!", symbol_kinds)
exports.lt = new TokenKind("<", symbol_kinds)
exports.gt = new TokenKind(">", symbol_kinds)
exports.lt_eq = new TokenKind("<=", symbol_kinds)
exports.gt_eq = new TokenKind(">=", symbol_kinds)
exports.amp = new TokenKind("&", symbol_kinds)
exports.xor = new TokenKind("^", symbol_kinds)
exports.pound = new TokenKind("#", symbol_kinds)
exports.lshift = new TokenKind("<<", symbol_kinds)
exports.rshift = new TokenKind(">>", symbol_kinds)
exports.lshiftequals = new TokenKind("<<=", symbol_kinds)
exports.rshiftequals = new TokenKind(">>=", symbol_kinds)
exports.compl = new TokenKind("~", symbol_kinds)

// symbols for character sequences
exports.dquote = new TokenKind('"', symbol_kinds)
exports.squote = new TokenKind("'", symbol_kinds)


exports.open_paren = new TokenKind("(", symbol_kinds)
exports.close_paren = new TokenKind(")", symbol_kinds)
exports.open_brack = new TokenKind("{", symbol_kinds)
exports.close_brack = new TokenKind("}", symbol_kinds)
exports.open_sq_brack = new TokenKind("[", symbol_kinds)
exports.close_sq_brack = new TokenKind("]", symbol_kinds)

exports.q_mark = new TokenKind("?", symbol_kinds)
exports.colon = new TokenKind(":", symbol_kinds)

exports.comma = new TokenKind(",", symbol_kinds)
exports.semicolon = new TokenKind(";", symbol_kinds)
exports.dot = new TokenKind(".", symbol_kinds)
exports.arrow = new TokenKind("->", symbol_kinds)

exports.identifier = new TokenKind()
exports.number = new TokenKind()
exports.string = new TokenKind()
exports.char_string = new TokenKind()
exports.include_file = new TokenKind()
exports.define_placeholder = new TokenKind()

exports.error_char_string_size = new TokenKind("", error_kinds)

exports.keyword_kinds = keyword_kinds
exports.symbol_kinds = symbol_kinds
exports.error_kinds = error_kinds