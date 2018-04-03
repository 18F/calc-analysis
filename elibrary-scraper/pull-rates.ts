import { parse as urlParse } from "url";
import { Readable } from "stream";
import * as request from "request";
import * as ProgressBar from "progress";
import * as JSONStream from "JSONStream";

export interface Rate {
    id: number;
    idv_piid: string;
    vendor_name: string;
    labor_category: string;
    education_level: string;
    min_years_experience: number;
    current_price: number;
    hourly_rate_year1: number;
    second_year_price: number;
    schedule: string;
    sin: string;
    contractor_site: string;
    business_size: string;
}

interface RatesResponse {
    count: number;
    next: string|null;
    nextPage: number|null;
    previous: string|null;
    results: Rate[];
}

interface RatesRequest {
    min_experience: number;
    max_experience: number;
    sort: keyof Rate;
    query_type: 'match_all'|'match_exact'|'match_phrase';
    page?: number;
    q?: string;
}

const RATES_REQUEST_DEFAULTS: RatesRequest = {
    min_experience: 0,
    max_experience: 45,
    sort: 'idv_piid',
    query_type: 'match_all',
};

const BASE_URI = "https://api.data.gov/gsa/calc/rates/";

function extendArray<T>(array: T[], items: T[]) {
    array.push.apply(array, items);
}

class RatesStream extends Readable {
    requestOptions: Partial<RatesRequest>;
    buffer: Rate[];
    currReq: boolean;
    done: boolean;

    constructor(requestOptions: Partial<RatesRequest> = RATES_REQUEST_DEFAULTS, options: any = {}) {
        super(Object.assign({}, options, { objectMode: true }));
        this.requestOptions = requestOptions;
        this.buffer = [];
        this.currReq = false;
        this.done = false;
    }

    _read() {
        if (this.buffer.length) {
            this.push(this.buffer.shift());
        } else if (this.currReq) {
            // We've got a request in-flight, it will push when ready.
        } else if (this.done) {
            this.push(null);
        } else {
            this.currReq = true;
            getRates(this.requestOptions).then(res => {
                this.currReq = false;
                if (!this.requestOptions.page) {
                    this.emit('totalCount', res.count);
                }
                if (res.nextPage === null) {
                    this.done = true;
                } else {
                    this.requestOptions = {
                        ...this.requestOptions,
                        page: res.nextPage,
                    };
                }
                extendArray(this.buffer, res.results);
                this._read();
            }).catch(e => {
                this.currReq = false;
                this.done = true;
                this.emit('error', e);
            });
        }
    }
}

function getRates(req: Partial<RatesRequest> = RATES_REQUEST_DEFAULTS): Promise<RatesResponse> {
    const qs: any = Object.assign({}, RATES_REQUEST_DEFAULTS, req);
    const uri = BASE_URI;

    return new Promise((resolve, reject) => {
        request.get(uri, {
            qs,
            json: true,
        }, (err, res, body) => {
            if (err) return reject(err);
            if (res.statusCode !== 200) {
                return reject(new Error(`Got HTTP ${res.statusCode}`));
            }
            const result = body as RatesResponse;
            if (result.next) {
                result.nextPage = parseInt(urlParse(result.next, true).query.page.toString());
                if (isNaN(result.nextPage)) {
                    return reject(new Error(
                        `Expected next URL to have 'page' param: ${result.next}`
                    ));
                }
            } else {
                result.nextPage = null;
            }
            resolve(result);
        });
    });
}

if (module.parent === null) {
    const q = process.argv[2] || '';

    let bar: ProgressBar|null = null;

    const rates = new RatesStream({ q })
        .on('totalCount', (total: number) => {
            bar = new ProgressBar('retrieving [:bar] :percent :current rates', {
                total,
            });
        })
        .on('data', (_rate: Rate) => {
            if (bar) bar.tick(1);
        })
        .on('error', function(e: any) {
            console.error(e);
            process.exit(1);
        })
        .pipe(JSONStream.stringify())
        .pipe(process.stdout);
}
