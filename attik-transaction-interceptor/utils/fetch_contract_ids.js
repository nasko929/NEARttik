import { readFile } from 'fs/promises';

class Contracts {
    constructor() {
        this.allContracts = {};
    }

    async load() {
        this.allContracts = JSON.parse(
            await readFile(
                new URL('./all_contracts.json', import.meta.url)
            )
        );
    }
}

class LastReads {
    constructor() {
        this.lastReads = {};
    }

    async load() {
        this.lastReads = JSON.parse(
            await readFile(
                new URL('./last_read_contract_transaction.json', import.meta.url)
            )
        );
    }
}

export {Contracts, LastReads};
