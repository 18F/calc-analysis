import * as url from "url";
import * as request from "request";
import * as cheerio from "cheerio";

import * as cache from "./cache";

// TODO: Get rid of this eventually.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = 'https://www.gsaelibrary.gsa.gov';

const SEARCH_RESULTS_URL = `${BASE_URL}/ElibMain/searchResults.do`;

function getContractorInfoURL(contract: string): Promise<string> {
    return new Promise((resolve, reject) => {
        request.get(SEARCH_RESULTS_URL, {
            qs: {
                searchText: contract,
                searchType: 'exactWords',
            },
        }, (err, _, body) => {
            if (err) return reject(err);
            const $ = cheerio.load(body);
            const a = $('a[href^="contractorInfo.do"]');

            if (a.length === 1) {
                const href = url.resolve(SEARCH_RESULTS_URL, a.attr('href'));
                return resolve(href);
            }
            reject(new Error(`Invalid contract: ${contract}`));
        });
    });
}

function getContractorInfoHTMLFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        request.get(url, {}, (err, _, body) => {
            if (err) return reject(err);
            resolve(body);
        });
    });
}

async function getContractorInfoHTML(contract: string): Promise<string> {
    const url = await cache.get(`url_${contract}`, () => getContractorInfoURL(contract));

    return cache.get(`html_${contract}`, () => getContractorInfoHTMLFromURL(url));
}

interface ContractorInfo {
    name: string;
    website?: string;
    duns?: string;
    naics?: string;
    address?: string;
}

interface ContractInfo {
    contractor: ContractorInfo;
    endDate: string;
    sins: string[];
}

interface StrMapping {
    [key: string]: string|undefined;
}

function parseContractorInfo($: CheerioStatic, table: Cheerio): ContractorInfo {
    const column = table.find('table:nth-child(1) table:nth-child(1)').first();
    const raw: StrMapping = {};

    column.find('tr').each((i, rowEl) => {
        const name = $(rowEl).find('td:nth-child(1)').text().trim().toLowerCase().slice(0, -1);
        const value = $(rowEl).find('td:nth-child(2)');

        value.find('br').replaceWith($('<span>\n</span>'));

        raw[name] = value.text().trim();
    });

    const name = raw['contractor'];

    if (!name) {
        throw new Error('could not find contractor name!');
    }

    const result: ContractorInfo = { name };

    if (raw['web address']) result.website = raw['web address'];
    if (raw.duns) result.duns = raw.duns;
    if (raw.naics) result.naics = raw.naics;
    if (raw.address) result.address = raw.address;

    return result;
}

function parseContractorInfoHTML(html: string): ContractInfo {
    const $ = cheerio.load(html);

    const skipnav = $('a[name="skipnavigation"]');

    if (skipnav.length !== 1) {
        throw new Error('could not find skipnavigation target!');
    }

    const table = skipnav.closest('table').next('table');
    const sourcesTable = table.find('table:nth-child(2)');
    const endDate = sourcesTable.find('tr:nth-child(2) td:nth-child(5)').text().trim();
    const sins = sourcesTable.find('tr:nth-child(2) td:nth-child(6) a')
        .map((i, a) => $(a).text()).get();

    const result: ContractInfo = {
        contractor: parseContractorInfo($, table),
        sins,
        endDate
    };

    return result;
}

if (module.parent === null) {
    const contract = process.argv[2] || 'GS-10F-0247K';

    console.log(`Getting info for ${contract}...`);

    getContractorInfoHTML(contract)
        .then(html => {
            console.log(parseContractorInfoHTML(html));
        }).catch(e => {
            console.error(e);
            process.exit(1);
        });
}
