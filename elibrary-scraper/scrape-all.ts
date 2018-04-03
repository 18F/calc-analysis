import * as fs from "fs";
import * as path from "path";
import { Readable, Transform } from "stream";
import * as csvParse from "csv-parse";
import * as ProgressBar from "progress";
import * as JSONStream from "JSONStream";

import * as cache from "./cache";
import { getContractorInfo, ContractInfo } from "./scraper";
import { InvalidContractError } from "./exceptions";
import CsvTransformer from "./csv-transformer";
import { Rate } from "./pull-rates";

const HOURLY_PRICES_CSV = path.join(__dirname, '..', 'data', 'hourly_prices.csv');

async function getCachedContractorInfo(contract: string): Promise<ContractInfo> {
    return cache.getJSON(`parsed_${contract}`, () => getContractorInfo(contract));
}

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

    _transform(rate: Rate, _: any, callback: (err: Error|null, contract: ContractInfo|null) => void) {
        const contract = rate.idv_piid;
        if (this.contracts.has(contract)) {
            return callback(null, null);
        }
        this.contracts.add(contract);

        getCachedContractorInfo(contract).then(info => {
            this.validContracts.add(contract);
            callback(null, info);
        }).catch(e => {
            if (e instanceof InvalidContractError) {
                this.invalidContracts.add(contract);
                this.emit('invalid-contract');
                this.emit(
                    'status',
                    `Invalid contract ${contract} (${e.message})`
                );
                callback(null, null);
            } else {
                this.emit(
                    'status',
                    `Error retrieving contract ${contract} (${e.message})`
                );
                callback(e, null);
            }
        });
    }
}

function toRateStream(raw: Readable, filename: string): Transform {
    if (/\.csv$/.test(filename)) {
        return raw.pipe(csvParse({ columns: true }))
          .pipe(new CsvTransformer());
    } else {
        return raw.pipe(JSONStream.parse('*'));
    }
}

if (module.parent === null) {
    const contractStream = new ContractStream();
    const bar = new ProgressBar(
        'scraping [:bar] :percent | ' +
        'contracts: :valid valid / ' +
        ':invalid invalid',
        {
          total: fs.statSync(HOURLY_PRICES_CSV).size,
        }
    );
    const updateContractCounts = () => {
        bar.tick({
            'valid': contractStream.validContracts.size,
            'invalid': contractStream.invalidContracts.size
        });
    };

    const filename = process.argv[2] || HOURLY_PRICES_CSV;

    const raw = fs.createReadStream(filename, { highWaterMark: 1024 })
        .on('data', (chunk: Buffer) => {
            bar.tick(chunk.length);
        });

    toRateStream(raw, filename)
        .pipe(contractStream)
        .on('status', function(msg: string) {
            bar.interrupt(msg);
        })
        .on('data', function(_record: ContractInfo) {
            updateContractCounts();
        })
        .on('invalid-contract', updateContractCounts)
        .on('error', function(e: any) {
            console.error(e);
            process.exit(1);
        })
        .on('end', updateContractCounts);
}
