import * as fs from "fs";
import * as path from "path";
import { Transform } from "stream";

import * as csvParse from "csv-parse";

import { getContractorInfo, ContractInfo } from "./scraper";

const HOURLY_PRICES_CSV = path.join(__dirname, '..', 'data', 'hourly_prices.csv');

class ContractStream extends Transform {
    contracts: Set<string>;
    validContracts: Set<string>;
    invalidContracts: Set<string>;

    constructor(options: any = {}) {
        super(Object.assign({}, options, { objectMode: true }));
        this.contracts = new Set();
        this.validContracts = new Set();
        this.invalidContracts = new Set();
    }

    _transform(csvRecord: any, _: any, callback: (err: Error|null, contract: ContractInfo|null) => void) {
        const contract = (csvRecord['CONTRACT .'] as string).trim();
        if (this.contracts.has(contract)) {
            return callback(null, null);
        }
        this.contracts.add(contract);

        getContractorInfo(contract).then(info => {
            this.validContracts.add(contract);
            callback(null, info);
        }).catch(e => {
            if (/Invalid contract/.test(e.message)) {
                this.invalidContracts.add(contract);
                console.warn(e.message);
                callback(null, null);
            } else {
                callback(e, null);
            }
        });
    }
}

if (module.parent === null) {
    const contractStream = new ContractStream();

    fs.createReadStream(HOURLY_PRICES_CSV)
        .pipe(csvParse({ columns: true }))
        .pipe(contractStream)
        .on('data', function(record: ContractInfo) {
            console.log(`Retrieved ${record.number}.`);
        })
        .on('error', function(e: any) {
            console.error(e);
            process.exit(1);
        })
        .on('end', function() {
            console.log(`Valid contracts: ${contractStream.validContracts.size}`);
            console.log(`Invalid contracts: ${contractStream.invalidContracts.size}`);
        });
}
