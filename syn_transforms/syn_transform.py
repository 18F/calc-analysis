import pandas as pd
import re
import math
import os
calc_pricing = pd.read_csv("calc_pricing_results.csv")
schedule_contracts = pd.read_csv("schedule_contracts_summary.csv")

def is_nan(x):
    try:
        return math.isnan(x)
    except:
        return False

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

def parse_whitespace_only(SIN):
    if SIN.count(",") == 0:
        SIN = ",".join(SIN.split())
        return SIN
    else:
        return SIN
def parse_sin(SIN,count):
    
    before_processing = SIN
    SIN = SIN.replace("R","")
    SIN = SIN.replace("\n",", ")
    SIN = SIN.replace("plus RC SINs","")
    SIN = SIN.replace("SINS","")
    SIN = SIN.replace(";",",")
    SIN = SIN.replace("C","")
    SIN = SIN.replace(" -","")
    SIN = SIN.strip()
    SIN = ",".join(list(set([elem.strip() for elem in SIN.split(",")])))
    SIN = parse_whitespace_only(SIN)
    SIN = replace_parens(SIN)

    SIN = dealing_with_and(SIN)

    SIN = SIN.replace("RC","")
    SIN = SIN.replace("/",", ")

    SIN = iterate_sins(SIN)
    if SIN.count(" ") > 1 and SIN.count(",") == 0:
        SIN = SIN.replace(" ",", ")
    
    try:
        SIN = parse_shortened_sin(SIN)
    except:
        import code
        code.interact(local=locals())
    if SIN == before_processing:
        count += 1
    return SIN,count

os.chdir("results")
part = 0
new_calc_pricing = pd.DataFrame()
count = 0
for i in calc_pricing.index:
    print("on element ",i)
    print("count of SIN numbers that didn't need processing ",count)
    row = calc_pricing.ix[i].to_dict()
    if not is_nan(row["SIN"]):
        print("value is not nan")
        try:
            SINS,count = parse_sin(row["SIN"],count)
        except:
            import code
            code.interact(local=locals())
        SIN_list = []
        for SIN in SINS.split(","):
            tmp = row.copy()
            tmp["SIN"] = SIN
            SIN_list.append(tmp)
        #data is everything in the row
        for data in SIN_list:
            new_calc_pricing = new_calc_pricing.append(data,ignore_index=True)
    else:
        new_calc_pricing = new_calc_pricing.append(row, ignore_index=True)
    if i % 1000 == 0:
        new_calc_pricing.to_csv("new_calc_pricing_part_"+str(part)+".csv")
        new_calc_pricing = pd.DataFrame()
        part += 1
        
new_calc_pricing.to_csv("new_calc_pricing_part_"+str(part)+".csv")
