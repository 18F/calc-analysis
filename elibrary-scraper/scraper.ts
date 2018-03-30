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

if (module.parent === null) {
    const contract = 'GS-10F-0247K';

    console.log(`Getting info for ${contract}...`);

    getContractorInfoHTML(contract)
        .then(html => {
            console.log(`Got ${html.length} characters of HTML.`);
        }).catch(e => {
            console.error(e);
            process.exit(1);
        });
}
