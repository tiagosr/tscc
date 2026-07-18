export class PreprocessItemResult {
    /**
     *
     * @param {Token[]} produced
     * @param {number} consumed
     */
    constructor(produced, consumed) {
        this.produced = produced;
        this.consumed = consumed;
    }
}
