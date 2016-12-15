import pandas as pd
from glob import glob

csvs = glob("*.csv")
df = pd.DataFrame()

for csv in csvs:
    tmp = pd.read_csv(csv)
    for i in tmp.index:
        df = df.append(tmp.ix[i],ignore_index=True)

df.to_csv("new_calc_pricing.csv")
