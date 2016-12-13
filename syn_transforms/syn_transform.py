import pandas as pd
import re

calc_pricing = pd.read_csv("calc_pricing_results.csv")
schedule_contracts = pd.read_csv("schedule_contracts_summary.csv")

def parse_shortened_sin(SIN):
    if SIN.count(",") > 1:
        tmp = [elem.strip() for elem in SIN.split(",")]
        new_tmp = []
        full_syn = tmp[0].split("-")[0] +"-"
        for elem in tmp:
            if len(elem) == 1 or len(elem) == 3:
                new_tmp.append(full_syn+elem)
            else:
                new_tmp.append(elem)
        return ", ".join(new_tmp)
    else:
        return SIN

def dealing_with_and(SIN):
    SIN = SIN.replace("and",", ")
    SIN = SIN.replace("&",", ")
    SIN = ' '.join(SIN.split())
    SIN = SIN.replace(" , ",", ")
    return SIN
    
def replace_parens(SIN):
    #this comes from this stackoverflow:
    #http://stackoverflow.com/questions/14596884/remove-text-between-and-in-python
    return re.sub("[\(\[].*?[\)\]]", "", SIN)

def iterate_sins(SIN):
    if SIN.count("-") > 1 and "," not in SIN:
        split_string = SIN.split("-")
        prefix = split_string[0]
        start = int(split_string[1])
        end = int(split_string[2])
        return ",".join([prefix+"-"+str(elem) for elem in range(start,end+1)])
    return SIN

def parse_sin(SIN):
    SIN = SIN.replace("R","")
    SIN = SIN.replace("plus RC SINs","")
    SIN = SIN.replace("SINS","")
    SIN = SIN.replace(";",",")
    SIN = SIN.replace("C","")
    SIN = iterate_sins(SIN)
    SIN = SIN.replace(" -","")
    SIN = SIN.strip()
    SIN = replace_parens(SIN)
    SIN = dealing_with_and(SIN)
    SIN = SIN.replace("RC","")
    SIN = SIN.replace("/",", ")
    
    if SIN.count(" ") > 1 and SIN.count(",") == 0:
        SIN = SIN.replace(" ",", ")
    SIN = ",".join(list(set([elem.strip() for elem in SIN.split(",")])))
    SIN = parse_shortened_sin(SIN)
    return SIN

new_calc_pricing = pd.DataFrame()
import code
code.interact(local=locals())
for i in calc_pricing.index:
    row = calc_pricing.ix[i].to_dict()
    row["SIN"] = parse_sin(row["SIN"])
    new_calc_pricing.append(row, ignore_index=True)
