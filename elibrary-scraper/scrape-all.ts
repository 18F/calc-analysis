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

function normalizeContractNumber(value: string): string {
   const re = /^(\wF)(\w\w\w\w\w)$/;
   const match = re.exec(value);
   // https://github.com/18F/calc/issues/1668#issuecomment-377513631
   const bizarroToGs: {[key: string]: string|undefined} = {
       'BF': 'GS-00F',
       'TF': 'GS-10F',
       'FF': 'GS-07F',
       'XF': 'GS-23F',
       'ZF': 'GS-35F',
   };
   if (match) {
       const bizarro = match[1];
       const final = match[2];
       const gs = bizarroToGs[bizarro];
       if (gs) {
           return `${gs}-${final}`
       } else {
           throw new Error(`No bizarro mapping for ${value}`);
       }
   }
   return value;
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
        const contract = normalizeContractNumber(rate.idv_piid);
        if (this.contracts.has(contract)) {
            return callback(null, null);
        }
        this.contracts.add(contract);

        getCachedContractorInfo(contract).then(info => {
            this.validContracts.add(contract);
            callback(null, info);
        }).catch(e => {
            const name = `${rate.idv_piid} / ${rate.vendor_name}`;
            if (e instanceof InvalidContractError) {
                this.invalidContracts.add(contract);
                this.emit('invalid-contract');
                this.emit(
                    'status',
                    `Invalid contract ${name} (${e.message})`
                );
                callback(null, null);
            } else {
                this.emit(
                    'status',
                    `Error retrieving contract ${name} (${e.message})`
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
    const filename = process.argv[2] || HOURLY_PRICES_CSV;
    const bar = new ProgressBar(
        'scraping [:bar] :percent | ' +
        'contracts: :valid valid / ' +
        ':invalid invalid',
        {
          total: fs.statSync(filename).size,
        }
    );
    const updateContractCounts = () => {
        bar.tick({
            'valid': contractStream.validContracts.size,
            'invalid': contractStream.invalidContracts.size
        });
    };

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
