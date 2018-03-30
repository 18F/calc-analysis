This is an in-progress attempt at creating a scraper for the
[GSA eLibrary][] that allows us to retrieve rich, structured information
about GSA contracts.

## Quick start

```
npm install
```

You can run the script with a contract number to retrieve details
on a particular contract. For example, try:

```
npm start -- GS-00F-239DA
```

This should produce:

```json
{ contractor:
   { name: 'INTELLECT SOLUTIONS, LLC',
     website: 'http://www.intellectsolutions.com',
     duns: '172179850',
     naics: '541611',
     address: '312-F EAST MARKET ST SUITE 114\nLEESBURG, VA 20176-4101' },
  number: 'GS-00F-239DA',
  sins: [ '874 1', '874 4', '874 7' ],
  endDate: 'Jul 31, 2021' }
```

[GSA eLibrary]: https://www.gsaelibrary.gsa.gov/
