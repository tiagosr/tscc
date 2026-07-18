import { TokenKind } from "./tokens.js"

/** @type {TokenKind[]} */
let keyword_kinds = []
/** @type {TokenKind[]} */
let symbol_kinds = []
/** @type {TokenKind[]} */
let error_kinds = []

export const bool_kw = new TokenKind("_Bool", keyword_kinds)
export const char_kw = new TokenKind("char", keyword_kinds)
export const short_kw = new TokenKind("short", keyword_kinds)
export const int_kw = new TokenKind("int", keyword_kinds)
export const long_kw = new TokenKind("long", keyword_kinds)
export const signed_kw = new TokenKind("signed", keyword_kinds)
export const unsigned_kw = new TokenKind("unsigned", keyword_kinds)
export const void_kw = new TokenKind("void", keyword_kinds)

export const auto_kw = new TokenKind("auto", keyword_kinds)
export const static_kw = new TokenKind("static", keyword_kinds)
export const extern_kw = new TokenKind("extern", keyword_kinds)
export const struct_kw = new TokenKind("struct", keyword_kinds)
export const enum_kw = new TokenKind("enum", keyword_kinds)
export const union_kw = new TokenKind("union", keyword_kinds)
export const register_kw = new TokenKind("register", keyword_kinds)
export const volatile_kw = new TokenKind("volatile", keyword_kinds)
export const const_kw = new TokenKind("const", keyword_kinds)
export const typedef_kw = new TokenKind("typedef", keyword_kinds)
export const sizeof_kw = new TokenKind("sizeof", keyword_kinds)

export const return_kw = new TokenKind("return", keyword_kinds)
export const if_kw = new TokenKind("if", keyword_kinds)
export const else_kw = new TokenKind("else", keyword_kinds)
export const while_kw = new TokenKind("while", keyword_kinds)
export const for_kw = new TokenKind("for", keyword_kinds)
export const break_kw = new TokenKind("break", keyword_kinds)
export const continue_kw = new TokenKind("continue", keyword_kinds)
export const do_kw = new TokenKind("do", keyword_kinds)
export const switch_kw = new TokenKind("switch", keyword_kinds)
export const case_kw = new TokenKind("case", keyword_kinds)
export const default_kw = new TokenKind("default", keyword_kinds)
export const goto_kw = new TokenKind("goto", keyword_kinds)


export const plus = new TokenKind("+", symbol_kinds)
export const minus = new TokenKind("-", symbol_kinds)
export const star = new TokenKind("*", symbol_kinds)
export const slash = new TokenKind("/", symbol_kinds)
export const mod = new TokenKind("%", symbol_kinds)
export const incr = new TokenKind("++", symbol_kinds)
export const decr = new TokenKind("--", symbol_kinds)
export const equals = new TokenKind("=", symbol_kinds)
export const plusequals = new TokenKind("+=", symbol_kinds)
export const minusequals = new TokenKind("-=", symbol_kinds)
export const starequals = new TokenKind("*=", symbol_kinds)
export const divequals = new TokenKind("/=", symbol_kinds)
export const modequals = new TokenKind("%=", symbol_kinds)
export const xorequals = new TokenKind("^=", symbol_kinds)
export const complequals = new TokenKind("~=", symbol_kinds)
export const equalequal = new TokenKind("==", symbol_kinds)
export const notequal = new TokenKind("!=", symbol_kinds)
export const bool_and = new TokenKind("&&", symbol_kinds)
export const bool_or = new TokenKind("||", symbol_kinds)
export const bool_not = new TokenKind("!", symbol_kinds)
export const lt = new TokenKind("<", symbol_kinds)
export const gt = new TokenKind(">", symbol_kinds)
export const lt_eq = new TokenKind("<=", symbol_kinds)
export const gt_eq = new TokenKind(">=", symbol_kinds)
export const amp = new TokenKind("&", symbol_kinds)
export const xor = new TokenKind("^", symbol_kinds)
export const pound = new TokenKind("#", symbol_kinds)
export const lshift = new TokenKind("<<", symbol_kinds)
export const rshift = new TokenKind(">>", symbol_kinds)
export const lshiftequals = new TokenKind("<<=", symbol_kinds)
export const rshiftequals = new TokenKind(">>=", symbol_kinds)
export const compl = new TokenKind("~", symbol_kinds)

export const dquote = new TokenKind('"', symbol_kinds)
export const squote = new TokenKind("'", symbol_kinds)


export const open_paren = new TokenKind("(", symbol_kinds)
export const close_paren = new TokenKind(")", symbol_kinds)
export const open_brack = new TokenKind("{", symbol_kinds)
export const close_brack = new TokenKind("}", symbol_kinds)
export const open_sq_brack = new TokenKind("[", symbol_kinds)
export const close_sq_brack = new TokenKind("]", symbol_kinds)

export const q_mark = new TokenKind("?", symbol_kinds)
export const colon = new TokenKind(":", symbol_kinds)

export const comma = new TokenKind(",", symbol_kinds)
export const semicolon = new TokenKind(";", symbol_kinds)
export const dot = new TokenKind(".", symbol_kinds)
export const arrow = new TokenKind("->", symbol_kinds)
export const ellipsis = new TokenKind("...", symbol_kinds)

export const identifier_token = new TokenKind("%%identifier%%")
export const number_token = new TokenKind("%%number%%")
export const string_token = new TokenKind("%%string%%")
export const char_string = new TokenKind("%%char_string%%")
export const include_file = new TokenKind("%%include_file%%")
export const define_placeholder = new TokenKind("%%define_placeholder%%")

export const error_char_string_size = new TokenKind("!!error_char_string_size!!", error_kinds)

export { keyword_kinds, symbol_kinds, error_kinds }