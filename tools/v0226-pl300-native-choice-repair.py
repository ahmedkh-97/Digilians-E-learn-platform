import json, pathlib, copy
ROOT=pathlib.Path('.')
BASE=ROOT/'voucher/tracks/data-analysis/microsoft-pl-300'

# Source-backed choice pools transcribed from the preserved source-review answer/question images.
# Each entry is one list per nativeResponse field, in field order.
C={
's01q012': [['4','65','69','73'],['4','65','69','73']],
's01q013': [['Append','Merge','Transpose'],['Delete the query.','Disable the query load.','Exclude the query from report refresh.']],
's01q015': [[
 'From Power BI Desktop, select Get Data, and then select Folder.',
 'From Power Query Editor, expand the Attributes column.',
 'From Power Query Editor, remove the Content column.',
 'From Power Query Editor, remove the Attributes column.',
 'From Power BI Desktop, select Get Data, and then select Text/CSV.',
 'From Power Query Editor, combine the Content column.'
]]*3,
's01q020': [['unlimited','one minute','10 minutes'],['all the tables','only tables that contain data','only tables that contain hierarchies']],
's01q028': [['DirectQuery','Import','LiveConnect','Push']]*2,
's01q031': [['Folder','JSON','Text/CSV'],['Combine the files of the Content column.','Delete the Attribute column.','Delete the Content column.','Expand the Attribute column.']],
's01q033': [['None','Organizational','Private','Public']]*2,
's01q035': [['Keep top rows','Remove errors','Remove top rows'],['Rename','Replace values','Use first row as headers']],
's01q042': [['Date','Patient','Test','Test Result'],['Date of birth','Last name','Patient key','Patient source ID']],
's01q045': [['Change the data type to Binary.','Remove any duplicate values.','Remove the column.'],['Change the data type to Duration.','Remove the column.','Split the column into separate date and time columns.']],
's01q054': [['Dataflows','JSON','OData','Web'],['Anonymous','Basic','Organizational account','Web API']],
's01q061': [['Cost Center','Headcount','ID','Name'],['Cost Center','Headcount','ID','Name'],['No','Yes']],
's01q063': [['Cardinality','Cross filter direction','Assume Referential Integrity'],['star schema','snowflake schema','denormalized table']],
's01q066': [[
 'Merge [Region_Manager] and [Manager] by using an inner join.',
 'Merge [Sales_Manager] and [Sales_Region] by using a left join.',
 'Merge [Sales_Region] and [Sales_Manager] by using an inner join.',
 'Merge [Sales_Region] and [Sales_Manager] by using an inner join as a new query named [Sales_Region_and_Manager].',
 'Merge [Sales_Region] and [Region_Manager] by using a right join as a new query named [Sales_Region_and_Region_Manager].',
 'Merge [Sales_Region] and [Region_Manager] by using an inner join.'
]]*3,
's01q073': [[
 'Use headers as the first row.',
 'Rename the Measure column as Year.',
 'Rename the Attribute column as Year.',
 'Use the first row as headers.',
 'Transpose the table.',
 'Unpivot all the columns other than Measure.',
 'Change the data type of the Year column to Date.'
]]*4,
's01q074': [['Change Type','Delete','Hide','Sort']]*2,
's01q075': [['Attendance fact','Class dimension','Teacher dimension','Teacher fact']]*2,
's01q078': [['0 rows','1 row','51 rows','75 rows'],['maintain','reduce','increase']],
's01q081': [['One-to-many','One-to-one','Many-to-many'],['Single','Both']],
's01q083': [['CALCULATE','DATESBETWEEN','SAMEPERIODLASTYEAR','SUM']]*3,
's01q090': [['CALCULATE','CALCULATETABLE','DATEADD','DIVIDE','FILTER','FIND']]*3,
's01q091': [['ASC','DESC','RELATEDTABLE','CALCULATETABLE','MAXX','TOPN']]*2,
's01q095': [['CALENDAR','CALENDARAUTO','DATE','EOMONTH','TODAY','YEAR']]*3,
's01q097': [['TOTALYTD','CALCULATE','SUM','EVALUATE'],["'Date'[Date]",'TODAY()',"EOMONTH('Date'[Date])","LASTDATE('Date'[Date])"]],
's01q101': [['Month','Total Cost','Total Order Qty','Total Sales','Year'],['Date','Month','Total Sales','Year'],['Days','Months','Quarters','Years']],
's01q108': [['ALL','ALLSELECTED','CALCULATE','FILTER','SELECTEDVALUE']]*2,
's01q146': [['CALCULATE','HASONEVALUE','SELECTEDVALUE','WINDOW'],['DEFAULT','DENSE','FIRST','SKIP']],
's01q165': [['auto date/time','bidirectional relationship','quick measures'],['the Date table','the MonthEndDate date hierarchy from the Date table','the MonthStartDate column']],
's01q179': [['Decimal number','Fixed decimal number','Percentage','Whole number'],['Date','Date/time/timezone','Datetime','Time']],
's01q189': [['turning on Cross-report','adding more fields to Explain by','adding more fields to Expand by','moving fields from Explain by to Expand by'],['0.11','.2','1','3']],
's01q191': [['City','Occupation','Total Sales']]*2,
's01q195': [[
 'From Focus mode, pin the relevant visuals to DashboardA.',
 'From Focus mode, review the generated visuals.',
 'From DashboardA, select the TileA options, and then select View insights.',
 'From ReportA, select the treemap visual options, and then select Spotlight.',
 'From ReportA, select Get insights.',
 'From DashboardA, select TileA to open ReportA.'
]]*3,
's01q197': [['Background color','Data bars','Font color','Icons','Web URL'],['Color scale','Field value','Rules']],
's01q202': [['cross-filter','cross-highlight','not affect']]*2,
's01q209': [['are 20 values that occur','are 365 values that occur','are 277,329 values that occur','is one value that occurs'],['Ash, Green','Crabapple, Flowering','Elm, American','Spruce, Blue']],
's01q212': [['Line','Pie','Treemap'],['Select the Show value as option','Enable Cross-report drill-through','Populate the axis with a date field']],
's01q219': [['1','2','3','4'],['Data','Display','Current page']],
's01q221': [['Dashboard mobile layout','Dashboard web layout','Report mobile layout'],['The SubTotal map tile','The Total Sales and Total Quantity tiles','The Total Sales by Parent Category tile']],
's01q225': [['a line','a line and clustered column','an area'],['a custom visual','a trendline','anomaly detection','line chart markers']],
's01q227': [['a trend line','a secondary axis','an average reference line','two measures in the Values bucket'],['Axis','Values','Legend','Secondary values']],
's01q233': [['A column chart of Quantity Ordered and Unit Price by year','A line chart of Quantity Ordered and Unit Price by item','A scatter plot of Quantity Ordered and Unit Price by item'],['Automatically find clusters','Explain the decrease','Find where the distribution is different']],
's01q257': [['Bar chart','Card','Matrix'],['Edit Interactions to Filter','Edit Interactions to None','Apply drill down filters to Selected visual']],
's01q268': [['Microsoft SQL Server Reporting Services (SSRS) (.rdlc)','Power BI (.pbix)','Power BI paginated (.rdl)']]*2,
's01q278': [['Column distribution','Column profile','Column quality']]*2,
's01q287': [['Decrease the space between categories.','Enable overlap for every series.','Enable overlap for the Plan series.','Increase the space between categories.'],['Enable data labels for every series.','Enable data labels for the Plan series.','Enable the title on the X-axis.','Enable the title on the Y-axis.']],
's01q300': [['Open Power BI Desktop.','Pin the page.','Pin each visual.','Open powerbi.com.','Open the Sales report.','Create a new report.']]*3,
's01q306': [['Admin','Contributor','Member','Viewer']]*2,
's01q317': [['assign sensitivity labels to','use Analyze in Excel with','delete'],['grant the Build permission for','grant the Read permission for','remove a table from']],
's01q322': [['Assign User1 the Contributor role for WorkspaceA.','Grant User1 the Build permission for the HR dataset.','Grant User1 read permissions for the HR dataset.','Grant User1 share permissions for the HR dataset.'],['Assign User1 the Admin role for WorkspaceB.','Assign User1 the Contributor role for WorkspaceA.','Assign User1 the Contributor role for WorkspaceB.','Assign User1 the Member role for WorkspaceB.']],
's01q344': [['report','bookmark','dashboard'],['data alert','phone view','subscription']],
's01q346': [['ALL','ALLEXCEPT','CALCULATE','DIVIDE','FILTER']]*3,
's01q347': [[
 'From powerbi.com, assign the analysts the Contributor role to the workspace.',
 'From Power BI Desktop, add a Table Filter DAX Expression to the roles.',
 'From powerbi.com, add role members to the roles.',
 'From Power BI Desktop, create four roles.',
 'From Power BI Desktop, publish the dataset to powerbi.com.'
]]*4,
's01q356': [['SUM','COUNTX','CALCULATE','CALCULATETABLE'],['FILTER','ALLEXCEPT','CALCULATE','DATESBETWEEN'],['Orders[OrderDate] > Orders[RequiredDate]','Orders[ShippedDate] >= Orders[OrderDate]','Orders[ShippedDate] < Orders[RequiredDate]','Orders[ShippedDate] > Orders[RequiredDate]']],
's01q359': [['one-to-one','one-to-many','many-to-one','many-to-many'],['Orders table','Suppliers table','Order Details table','Customer Details worksheet']],
's01q361': [['Top N','Basic','Advanced'],['Page','Visual','Report']],
's01q366': [['Access permissions to an app','The Member role to the workspace','The Viewer role to the workspace'],['Build','Delete','Reshare']],
's01q367': [['Sharing individual reports','Using a workspace membership','Using an app'],['A dynamic distribution list','A mail-enabled security group in Azure Active Directory','Individual user emails']],

's02q001': [['Card','Donut chart','Gauge','Key influencers','KPI'],['Date[month]','Sales[sales_amount]','Sales[sales_id]','Targets[sales_target]','Weekly_Returns[total_returns]'],['Date[month]','Sales[sales_amount]','Sales[sales_id]','Targets[sales_target]','Weekly_Returns[total_returns]'],['Date[month]','Sales[sales_amount]','Sales[sales_id]','Targets[sales_target]','Weekly_Returns[total_returns]']],
's02q008': [['Top N','Basic','Advanced'],['Page','Visual','Report']],
's02q020': [['Background color','Data bars','Font color','Icons','Web URL'],['Color scale','Field value','Rules']],
's02q050': [['Change Type','Delete','Hide','Sort']]*2,
's02q100': [['Expand the columns.','Expand the records.','Add columns that use data type conversions.','Set the data types.','Convert the list to a table.']]*3,
's02q157': [[
 'Merge [Region_Manager] and [Manager] by using an inner join.',
 'Merge [Sales_Manager] and [Sales_Region] by using a left join.',
 'Merge [Sales_Region] and [Sales_Manager] by using an inner join.',
 'Merge [Sales_Region] and [Sales_Manager] by using an inner join as a new query named [Sales_Region_and_Manager].',
 'Merge [Sales_Region] and [Region_Manager] by using a right join as a new query named [Sales_Region_and_Region_Manager].',
 'Merge [Sales_Region] and [Region_Manager] by using an inner join.'
]]*3,
's02q174': [['CALCULATE','CONCATENATEX','SUM','SUMX','TOPN']]*3+[['[TransactionID]','[Amount]','[ItemsOrdered]','[TransactionDate]']],
's02q209': [['ASC','DESC','FILTER','SUMMARIZE','TOPN']]*3,
's02q281': [[
 'From Power BI Desktop, remove the Attributes column.',
 'From Power Query Editor, remove the Content column.',
 'From Power BI Desktop, select Get Data, and then select Text/CSV.',
 'From Power BI Desktop, select Get Data, and then select Folder.',
 'From Power Query Editor, expand the Attributes column.',
 'From Power Query Editor, combine the Content column.'
]]*3,
's02q353': [['CONTOSO BIKES report','CONTOSO dashboard','Realtime dashboard'],['one dataset','two datasets','three datasets','four datasets']],
's02q378': [['CALCULATE','CALCULATETABLE','DATEADD','DIVIDE','FILTER','FIND']]*3,
's02q389': [['Table.CombineColumn','Table.FindText','Table.FromList','Table.RemoveColumns'],['List.Contains','List.Select','Table.FindText','Table.FromList'],['Text.Contains','Text.EndsWith','Text.From','Text.StartsWith']],
's02q396': [['ALL','CALCULATE','COUNTROWS','EVALUATE','SUM','SUMX']]*3,
}

# Expected values that were previously paraphrased rather than stored as the exact source choice.
EXPECTED={
's01q015':['From Power BI Desktop, select Get Data, and then select Folder.','From Power Query Editor, remove the Content column.','From Power Query Editor, expand the Attributes column.'],
's01q066':['Merge [Region_Manager] and [Manager] by using an inner join.','Merge [Sales_Region] and [Sales_Manager] by using an inner join.','Merge [Sales_Region] and [Region_Manager] by using an inner join.'],
's01q078':['75 rows','reduce'],
's01q073':['Use the first row as headers.','Unpivot all the columns other than Measure.','Rename the Attribute column as Year.','Change the data type of the Year column to Date.'],
's01q083':['CALCULATE','SUM','DATESBETWEEN'],
's01q108':['CALCULATE','ALLSELECTED'],
's01q165':['quick measures','the MonthStartDate column'],
's01q189':['adding more fields to Explain by','3'],
's01q195':['From DashboardA, select the TileA options, and then select View insights.','From Focus mode, review the generated visuals.','From Focus mode, pin the relevant visuals to DashboardA.'],
's01q209':['are 20 values that occur','Elm, American'],
's01q221':['Dashboard mobile layout','The Total Sales and Total Quantity tiles'],
's01q225':['a line','anomaly detection'],
's01q227':['an average reference line','Axis'],
's01q257':['Matrix','Apply drill down filters to Selected visual'],
's01q268':['Power BI paginated (.rdl)','Power BI (.pbix)'],
's01q300':['Open powerbi.com.','Open the Sales report.','Pin the page.'],
's01q317':['use Analyze in Excel with','grant the Build permission for'],
's01q322':['Grant User1 the Build permission for the HR dataset.','Assign User1 the Contributor role for WorkspaceB.'],
's01q347':['From Power BI Desktop, create four roles.','From Power BI Desktop, add a Table Filter DAX Expression to the roles.','From Power BI Desktop, publish the dataset to powerbi.com.','From powerbi.com, add role members to the roles.'],
's01q359':['many-to-many','Customer Details worksheet'],
's01q367':['Using an app','A mail-enabled security group in Azure Active Directory'],
's02q100':['Convert the list to a table.','Expand the records.','Set the data types.'],
's02q157':['Merge [Region_Manager] and [Manager] by using an inner join.','Merge [Sales_Region] and [Sales_Manager] by using an inner join.','Merge [Sales_Region] and [Region_Manager] by using an inner join.'],
's02q281':['From Power BI Desktop, select Get Data, and then select Folder.','From Power Query Editor, remove the Content column.','From Power Query Editor, expand the Attributes column.'],
's02q389':['Table.RemoveColumns','List.Select','Text.EndsWith'],
's02q396':['CALCULATE','COUNTROWS','ALL'],
}

TYPE_FIX={
's01q344':'hotspot','s01q346':'hotspot','s01q347':'drag-drop','s01q366':'hotspot','s01q367':'hotspot'
}
INTERACTION_FIX={'s01q347':'ordered-fields'}
MASTER_SYNC_KEYS=set(C)|{'s01q001'}

def key_for(q):
    sid='s01' if q['sourceId']=='source-01' else 's02'
    return f"{sid}q{int(q['questionNumber']):03d}"

def patch_source(path):
    data=json.load(open(path,encoding='utf-8'))
    touched=[]
    for q in data['questions']:
        k=key_for(q)
        if k not in C: continue
        fields=(q.get('nativeResponse') or {}).get('fields') or []
        pools=C[k]
        if len(fields)!=len(pools): raise RuntimeError(f'{q["id"]}: fields {len(fields)} != pools {len(pools)}')
        if k in TYPE_FIX: q['sourceType']=TYPE_FIX[k]
        if k in INTERACTION_FIX: q['nativeResponse']['interaction']=INTERACTION_FIX[k]
        for i,(field,pool) in enumerate(zip(fields,pools)):
            field['choices']=pool
            if k in EXPECTED: field['expected']=[EXPECTED[k][i]]
        touched.append(q['id'])
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return touched,data

p1=BASE/'source-01-review-bank.json'; p2=BASE/'source-02-review-bank.json'
t1,s1=patch_source(p1); t2,s2=patch_source(p2)

# Keep approved master-bank native payloads synchronized with the canonical source records.
source_by_ref={(q['sourceId'],str(q['questionNumber'])):q for q in [*s1['questions'],*s2['questions']]}
mp=BASE/'master-bank.json'; master=json.load(open(mp,encoding='utf-8')); synced=[]
for mq in master['questions']:
    refs=mq.get('sourceRefs') or []
    hit=None
    for r in refs:
        ref=(r.get('sourceId'),str(r.get('questionNumber')))
        sq=source_by_ref.get(ref)
        if sq and key_for(sq) in MASTER_SYNC_KEYS:
            hit=sq; break
    if not hit or not hit.get('nativeResponse'): continue
    mq['nativeResponse']=copy.deepcopy(hit['nativeResponse'])
    synced.append((mq['id'],hit['id']))
mp.write_text(json.dumps(master,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('source touched',len(t1)+len(t2),len(t1),len(t2))
print('master synced',len(synced))
