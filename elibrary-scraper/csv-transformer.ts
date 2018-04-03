import { Transform } from "stream";

import { Rate } from "./pull-rates";

function parseMoney(val: any): number {
    return parseFloat(((val || '').toString() as string)
      .replace(/,/g, ''));
}

export default class CsvTransformer extends Transform {
    currId: number;

    constructor() {
        super({ objectMode: true });
        this.currId = 0;
    }

    _transform(rec: any, _: any, callback: (err: Error|null, rate: Rate) => void) {
        callback(null, {
            id: this.currId++,
            idv_piid: rec['CONTRACT .'] as string,
            vendor_name: rec['COMPANY NAME'] as string,
            labor_category: rec['Labor Category'] as string,
            education_level: rec['Education'] as string,
            min_years_experience: parseInt(rec['MinExpAct']),
            current_price: parseMoney(rec["CurrentYearPricing"]),
            hourly_rate_year1: parseMoney(rec["Year 1/base"]),
            second_year_price: parseMoney(rec["Year 2"]),
            schedule: rec["Schedule"] as string,
            sin: rec["SIN NUMBER"] as string,
            contractor_site: rec["Location"] as string,
            business_size: rec["Bus Size"] as string,        
        });
    }
}
