export class PreprocessItemResult {
    /**
     * Utility class to specify results of a specific preprocessor transform
     * @param {Token[]} produced Tokens produced/transformed by the transform
     * @param {number} consumed Tokens consumed from the initial token stream
     */
    constructor(produced, consumed) {
        this.produced = produced;
        this.consumed = consumed;
    }
}
