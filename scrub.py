from urllib.parse import urlparse, parse_qsl
import pandas

SEARCH_URL = 'https://api.data.gov/gsa/calc/search/'
RATES_URL = 'https://api.data.gov/gsa/calc/rates/'

def get_query_dict(url):
    info = urlparse(url)
    query = dict(parse_qsl(info.query))

    return query

rows = pandas.read_csv('logs.csv', nrows=None, index_col=False, usecols=[
    'Time',
    'Method',
    'URL',
    'State',
    'Country',
    'City',
    'Status',
    'IP Address',
])

rows = rows.drop_duplicates(subset=['Method', 'URL', 'IP Address'])

rows = rows[rows['Method'] == 'GET']\
           [rows['Status'] == 200]\
           [rows['URL'].str.startswith(RATES_URL)]

rows['Query'] = rows['URL'].apply(get_query_dict)
rows['min_xp'] = rows['Query'].apply(
    lambda q: int(q.get('min_experience', '0')) > 0
)
rows['max_xp'] = rows['Query'].apply(
    lambda q: int(q.get('max_experience', '45')) < 45
)
rows['education'] = rows['Query'].apply(lambda q: 'education' in q) 
rows['site'] = rows['Query'].apply(lambda q: 'site' in q) 
rows['business_size'] = rows['Query'].apply(lambda q: 'business_size' in q) 
rows['schedule'] = rows['Query'].apply(lambda q: 'schedule' in q) 
rows['search'] = rows['Query'].apply(lambda q: q.get('q', '').strip() != '')

rows['Search Term'] = rows['Query'].apply(
    lambda query: query.get('q', '').split(', ')[0].lower().strip()[:25]
)

rows = rows.drop(['Method', 'Status', 'State', 'Country', 'City', 'URL',
                  'Query', 'IP Address', 'Time'], 1)

total_rows = rows['min_xp'].count()

for field in ['min_xp', 'max_xp', 'education', 'site', 'business_size',
              'schedule', 'search']:
    print("searches using {}: {}%".format(
              field,
              int(rows[field][rows[field] == True].count() /
                  rows[field].count() * 100)
          ))

print(rows['Search Term'].value_counts()[:30])
#print(rows.groupby(['min_xp', 'education']).count())
#print(rows[rows['min_xp'] == True].count() / rows.count())
