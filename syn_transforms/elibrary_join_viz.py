import pandas as pd
import pandasql as ps
import plotly as py
import plotly.graph_objs as go


## loading data
calc_pricing = pd.read_csv("new_calc_pricing.csv")
schedule_contracts = pd.read_csv("schedule_contracts_summary.csv")


## data cleaning columns and creating a join key
calc_pricing.columns = calc_pricing.columns.str.replace('#','')
calc_pricing.columns = calc_pricing.columns.str.replace(' ','')
calc_pricing['SIN'] = calc_pricing['SIN'].str.strip()
calc_pricing['SIN'] = calc_pricing['SIN'].str.replace('-',' ')
calc_pricing['Contract'] = calc_pricing['Contract'].str.strip()
calc_pricing['unique_figure'] = calc_pricing['Contract'] + ' ' + calc_pricing['SIN']
calc_pricing['unique_figure'] = calc_pricing['unique_figure'].str.strip()
schedule_contracts['unique_figure'] = schedule_contracts['CONTRACT_NUMBER'] + ' ' + schedule_contracts['SPECIAL_ITEM_NUMBER']
schedule_contracts['unique_figure'] = schedule_contracts['unique_figure'].str.strip()
schedule_contracts["SCHEDULE_NUMBER"] = [elem.strip() for elem in schedule_contracts["SCHEDULE_NUMBER"]]
#calc_sin_coverage["schedule_number_s"] = [elem.strip() for elem in calc_sin_coverage["schedule_number_s"]]

#in_elibrary = 

## dataframe preview
#print (calc_pricing.head(n = 5))
#print (schedule_contracts.head(n = 5))


## queries joining the datasets
schedule_join = """
	SELECT 
		schedule_number,
		COUNT (DISTINCT contract_number) - COUNT (DISTINCT key_c) as contracts,
		COUNT (DISTINCT key_c) as contracts_incalc
	FROM 
	(SELECT 
		s.CONTRACT_NUMBER as contract_number,
		c.Contract as contract_number_c,
		s.unique_figure as key_s,
		c.unique_figure as key_c,
		s.SCHEDULE_NUMBER as schedule_number,
		s.SCHEDULE_TITLE as schedule_title,
		s.SPECIAL_ITEM_NUMBER as s_SIN,
		c.SIN as c_SIN,
		s.CONTRACTOR_NAME as contractor_name
	FROM 
		schedule_contracts s
	LEFT JOIN 
		calc_pricing c ON s.CONTRACT_NUMBER = c.Contract
	GROUP BY
		key_s)
	GROUP BY
		schedule_number
	ORDER BY 
		contracts;
	"""
#starting here, issue occurs 
sin_join = """
	SELECT 
		schedule_number_s, /* SCHEDULE_NUMBER from elibrary*/
		s_SIN as SIN, /* SIN number from elibrary */
		c_SIN, /* SIN number from calc production */
		COUNT (DISTINCT key_s) - COUNT (DISTINCT key_c) as SINS_elibrary,
		COUNT (DISTINCT key_c) as SINS_calc
	FROM 
	(SELECT 
		DISTINCT s.unique_figure as key_s,
		c.unique_figure as key_c,
		s.SCHEDULE_NUMBER as schedule_number_s,
		s.SCHEDULE_TITLE as schedule_title,
		s.SPECIAL_ITEM_NUMBER as s_SIN,
		c.SIN as c_SIN,
		s.CONTRACTOR_NAME as contractor_name
	FROM 
		schedule_contracts s
	LEFT JOIN 
		calc_pricing c ON key_s = key_c
	WHERE
		schedule_number_s='00CORP'
	ORDER BY 
		key_s)
	GROUP BY
		SIN
	ORDER BY 
		SINS_calc;
	"""


#this is just a test lol 
check_check = """
	SELECT 
		COUNT(DISTINCT s.CONTRACT_NUMBER) as contract_number
	FROM 
		schedule_contracts s
	ORDER BY
		contract_number;
	"""



calc_schedule_coverage = ps.sqldf(schedule_join, locals())
check_check = ps.sqldf(check_check,locals())
calc_sin_coverage = ps.sqldf(sin_join, locals())

#print(calc_schedule_coverage.head())
#print(check_check)
#print(calc_sin_coverage.head())


#calc_sin_coverage["schedule_number_s"] = [elem.strip() for elem in calc_sin_coverage["schedule_number_s"]]
#calc_sin_coverage = calc_sin_coverage[calc_sin_coverage.schedule_number_s == "00CORP"]
    
####################
###  SCHEDULE SUMMARY GRAPH ###
#####################


### trace1 = calc production data
calc_schedules = go.Bar(
    y=calc_schedule_coverage['schedule_number'],
    x=calc_schedule_coverage['contracts_incalc'],
    name='Contracts in CALC',
    orientation = 'h',
    marker = dict(
        color = 'rgba(246, 78, 139, 0.6)',
        line = dict(
            color = 'rgba(246, 78, 139, 1.0)',
            width = 3)
    )
)
## trace2 = elibrary contracts
elibrary_schedules = go.Bar(
    y=calc_schedule_coverage['schedule_number'],
    x=calc_schedule_coverage['contracts'],
    name='Contracts in eLibrary',
    orientation = 'h',
    marker = dict(
        color = 'rgba(58, 71, 80, 0.6)',
        line = dict(
            color = 'rgba(58, 71, 80, 1.0)',
            width = 3)
    )
)

data_sched = [calc_schedules, elibrary_schedules]
layout = go.Layout(
    barmode='stack'
)

schedule_graph = go.Figure(data=data_sched, layout=layout)
py.offline.plot(schedule_graph, filename='schedules.html')



####################
###  SINS GRAPH ###
#####################

#import code
#code.interact(local=locals())
### calc unique sins
calc_sins = go.Bar(
    y=[elem.strip().replace(' ','-') for elem in calc_sin_coverage['SIN']],
    x=[float(elem) for elem in calc_sin_coverage['SINS_calc']],
    name='Contracts in CALC',
    orientation = 'h',
    marker = dict(
        color = 'rgba(246, 78, 139, 0.6)',
        line = dict(
            color = 'rgba(246, 78, 139, 1.0)',
            width = 3)
    )
)
## trace2 = elibrary contracts
elibrary_sins = go.Bar(
    y=[elem.strip().replace(" ","-") for elem in calc_sin_coverage['SIN']],
    x=[float(elem) for elem in calc_sin_coverage['SINS_elibrary']],
    name='Contracts in eLibrary',
    orientation = 'h',
    marker = dict(
        color = 'rgba(58, 71, 80, 0.6)',
        line = dict(
            color = 'rgba(58, 71, 80, 1.0)',
            width = 3)
    )
)

data_sin = [calc_sins, elibrary_sins]
layout = go.Layout(
    barmode='stack'
)

sin_graph = go.Figure(data=data_sin, layout=layout)
py.offline.plot(sin_graph, filename='sins.html')




