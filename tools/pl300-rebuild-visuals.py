from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, textwrap

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'voucher/tracks/data-analysis/microsoft-pl-300'
ASSETS=BASE/'assets'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def f(size,bold=False): return ImageFont.truetype(BOLD if bold else FONT,size)

def canvas(h=720,w=1200):
    return Image.new('RGB',(w,h),'white')

def title(draw,text,sub='Reconstructed source exhibit'):
    draw.text((52,38),text,font=f(32,True),fill=(20,28,45))
    draw.text((52,82),sub,font=f(17),fill=(92,102,118))
    draw.line((52,116,1148,116),fill=(220,225,234),width=2)

def box(draw,xy,heading,lines,accent=(74,112,245)):
    x1,y1,x2,y2=xy
    draw.rounded_rectangle(xy,14,fill=(248,250,253),outline=(206,214,225),width=2)
    draw.rectangle((x1,y1,x1+8,y2),fill=accent)
    draw.text((x1+24,y1+18),heading,font=f(22,True),fill=(20,28,45))
    y=y1+60
    for line in lines:
        for part in textwrap.wrap(str(line),54):
            draw.text((x1+24,y),part,font=f(18),fill=(52,61,75)); y+=28

def table(draw,x,y,cols,rows,widths=None,row_h=46,header_fill=(235,240,248),font_size=17):
    if widths is None: widths=[(1080)//len(cols)]*len(cols)
    cx=x
    for i,c in enumerate(cols):
        draw.rectangle((cx,y,cx+widths[i],y+row_h),fill=header_fill,outline=(180,190,205))
        draw.text((cx+10,y+12),str(c),font=f(font_size,True),fill=(24,34,50)); cx+=widths[i]
    cy=y+row_h
    for r in rows:
        cx=x
        maxlines=1
        wraps=[]
        for i,val in enumerate(r):
            n=max(8,int(widths[i]/(font_size*0.58)))
            wr=textwrap.wrap(str(val),n) or ['']
            wraps.append(wr); maxlines=max(maxlines,len(wr))
        rh=max(row_h,16+maxlines*(font_size+6))
        for i,val in enumerate(r):
            draw.rectangle((cx,cy,cx+widths[i],cy+rh),fill='white',outline=(200,208,219))
            yy=cy+10
            for line in wraps[i]:
                draw.text((cx+10,yy),line,font=f(font_size),fill=(45,54,68)); yy+=font_size+6
            cx+=widths[i]
        cy+=rh
    return cy

def save(img,qid):
    img.save(ASSETS/f'{qid}.webp','WEBP',quality=92,method=6)

# 152: data-source context
img=canvas(540); d=ImageDraw.Draw(img); title(d,'Data sources')
box(d,(60,150,370,450),'Source1',['Microsoft Excel file','OneDrive for Business'],(57,121,255))
box(d,(445,150,755,450),'Source2',['Azure SQL database','Located on a virtual network'],(115,76,220))
box(d,(830,150,1140,450),'Source3',['Public website'],(12,145,118))
save(img,'pl300-75466073b7c4')

# 218: dashboard timestamp context
img=canvas(650); d=ImageDraw.Draw(img); title(d,'Power BI dashboard')
for xy,head,val in [((70,155,370,305),'Total Sales','$1.24M'),((450,155,750,305),'Orders','8,416'),((830,155,1130,305),'Margin','31.8%')]:
    d.rounded_rectangle(xy,16,fill=(246,248,252),outline=(206,214,225),width=2); d.text((xy[0]+24,xy[1]+22),head,font=f(20,True),fill=(45,54,68)); d.text((xy[0]+24,xy[1]+70),val,font=f(34,True),fill=(35,79,220))
d.rounded_rectangle((70,350,1130,560),16,fill=(250,251,253),outline=(206,214,225),width=2)
d.text((96,374),'Sales trend',font=f(22,True),fill=(30,40,55)); d.line((110,500,300,455,475,470,650,410,820,430,1050,385),fill=(35,79,220),width=5)
d.text((94,525),'Last refresh: 12:03:06 PM',font=f(20,True),fill=(70,80,95))
save(img,'pl300-8edce07bab0d')

# 237: original vs target dashboard theme
img=canvas(690); d=ImageDraw.Draw(img); title(d,'Dashboard appearance comparison')
for ox,label,dark in [(60,'Original dashboard',False),(620,'Modified dashboard',True)]:
    d.text((ox,150),label,font=f(22,True),fill=(24,34,50))
    bg=(247,249,252) if not dark else (39,43,52); fg=(30,40,55) if not dark else (235,239,247)
    d.rounded_rectangle((ox,195,ox+500,600),14,fill=bg,outline=(190,198,210),width=2)
    cards=[('Revenue','$2.1M'),('Orders','12.4K'),('Profit','$610K')]
    for i,(h,v) in enumerate(cards):
        x=ox+25+i*155; d.rounded_rectangle((x,225,x+135,330),10,fill=(255,255,255) if not dark else (62,68,80),outline=(200,206,216),width=1); d.text((x+12,242),h,font=f(16,True),fill=fg); d.text((x+12,278),v,font=f(22,True),fill=(35,79,220) if not dark else (130,170,255))
    d.rounded_rectangle((ox+25,360,ox+475,560),10,fill=(255,255,255) if not dark else (62,68,80),outline=(200,206,216),width=1)
    d.line((ox+55,520,ox+150,470,ox+240,495,ox+330,430,ox+435,455),fill=(35,79,220) if not dark else (130,170,255),width=6)
save(img,'pl300-bcb600a5aadd')

# 99 procurement tables
img=canvas(1000); d=ImageDraw.Draw(img); title(d,'Procurement model and report usage')
y=table(d,55,145,['Table','Source','Columns','Approx. rows'],[
('Suppliers','Dynamics 365','ID; Name; Country','100,000'),
('LineItems','Dynamics 365','ID; Invoice ID; Invoice Date; Supplier ID; Description; Units; Price per Unit; Discount; Price','1,000,000,000')],widths=[160,190,570,160],font_size=16)
d.text((55,y+30),'Report visuals',font=f(24,True),fill=(24,34,50))
table(d,55,y+70,['Visual','Used fields','Filter'],[
('Supplier usage by count and value of invoices','Suppliers[ID], Suppliers[Name], LineItems[Invoice ID], LineItems[Price]','None'),
('Spend by supplier location','Suppliers[Country], LineItems[Price]','None'),
('Top 10 largest invoices last month','LineItems[Invoice ID], LineItems[Price]','LineItems[Invoice Date] in last calendar month')],widths=[300,520,260],font_size=15)
save(img,'pl300-d427152f850b')

# 102 model diagram
img=canvas(560); d=ImageDraw.Draw(img); title(d,'Power BI data model')
box(d,(120,180,470,450),'dimDate',['Date','Month','Year'],(35,122,189)); box(d,(730,180,1080,450),'Sales',['Date','Sales'],(65,152,105))
d.line((470,315,730,315),fill=(80,90,105),width=4); d.text((490,275),'1',font=f(24,True),fill=(35,45,60)); d.text((690,275),'*',font=f(28,True),fill=(35,45,60));
save(img,'pl300-1982bd9c311d')

# 162 semantic model data
img=canvas(780); d=ImageDraw.Draw(img); title(d,'Semantic model source columns')
table(d,110,160,['Table name','Column name'],[
('Date','Date\nMonthName\nMonthStartDate\nMonthYear\nYear'),
('Account','AccountID\nAccountNumber\nAccountName\nAccountCategory'),
('Transactions','TransactionID\nTransactionDate\nAccountID\nTransAmt')],widths=[320,660],row_h=50,font_size=20)
save(img,'pl300-ae1392800727')

# 184: reconstructed for review; scoring conflict remains unresolved until owner approval
img=canvas(650); d=ImageDraw.Draw(img); title(d,'Semantic model relationships')
box(d,(70,180,330,455),'DimStudent',['StudentID','StudentName'],(35,122,189)); box(d,(460,145,800,500),'SemesterEnrollment',['StudentID','BillingAddressID','MailingAddressID','SemesterStartDate','AreaOfStudyID'],(115,76,220)); box(d,(920,180,1150,455),'DimAddress',['AddressID','City','Country','PostalCode'],(12,145,118))
d.line((330,315,460,315),fill=(70,80,95),width=4); d.text((350,280),'1',font=f(22,True),fill=(35,45,60)); d.text((430,280),'*',font=f(26,True),fill=(35,45,60))
d.line((800,275,920,245),fill=(70,80,95),width=4); d.line((800,365,920,395),fill=(130,138,150),width=3); d.text((835,222),'BillingAddressID',font=f(15),fill=(55,65,80)); d.text((825,402),'MailingAddressID',font=f(15),fill=(55,65,80))
save(img,'pl300-56653824317c')

# 26 replace errors context
img=canvas(600); d=ImageDraw.Draw(img); title(d,'Excel worksheet sample')
table(d,120,170,['Product','Quantity','Discount'],[
('A100',4,'0.10'),('A101',2,'Error'),('A102',7,'0.15'),('A103',1,'Error'),('A104',3,'0.05')],widths=[320,300,340],font_size=22)
save(img,'pl300-ef69aa44813d')

# 129 unpivot context
img=canvas(600); d=ImageDraw.Draw(img); title(d,'Sales data preview')
table(d,130,170,['Month','2020','2021'],[
('January','120,000','145,000'),('February','128,000','152,000'),('March','134,000','160,000'),('April','141,000','168,000')],widths=[330,330,330],font_size=22)
save(img,'pl300-9ecf04a2d5ec')

# 173 before/after
img=canvas(780); d=ImageDraw.Draw(img); title(d,'Power Query transformation')
d.text((70,150),'Current data',font=f(22,True),fill=(24,34,50)); table(d,70,190,['StudentID','Student','Classes'],[(1,'John Yang','Biology, Chemistry, English, Calculus'),(2,'Ruben Torres','English, Art History, Geography'),(3,'Chloe Young','Spanish, Marketing, Economics')],widths=[150,240,420],font_size=16)
d.text((70,440),'Required shape',font=f(22,True),fill=(24,34,50)); table(d,70,480,['StudentID','Student','Class'],[(1,'John Yang','Biology'),(1,'John Yang','Chemistry'),(1,'John Yang','English'),(1,'John Yang','Calculus')],widths=[150,240,420],font_size=16)
save(img,'pl300-d8c0068131b3')

# 192 key influencers
img=canvas(700); d=ImageDraw.Draw(img); title(d,'Key influencers result')
d.text((70,155),'What influences Quantity Per Order to increase?',font=f(24,True),fill=(24,34,50))
items=[('Customer City is Cunewalde','22.39'),('Customer City is Graz','22.21'),('Customer City is Boise','20.37'),('Customer Country is Austria','18.8')]
for i,(label,val) in enumerate(items):
    y=225+i*90; d.text((90,y),label,font=f(21),fill=(45,54,68)); d.rounded_rectangle((520,y-4,1020,y+38),10,fill=(235,240,248)); w=int(float(val)/23*450); d.rounded_rectangle((520,y-4,520+w,y+38),10,fill=(86,122,245)); d.text((1040,y+2),val,font=f(20,True),fill=(35,45,60))
d.text((90,610),'Values show the average increase in Quantity Per Order.',font=f(18),fill=(85,95,110))
save(img,'pl300-e530a709f644')

# 204 image URL table
img=canvas(560); d=ImageDraw.Draw(img); title(d,'Table visual')
table(d,95,170,['Plant','Plant Image'],[
('Aster','https://contoso.com/images/aster.jpg'),('Fern','https://contoso.com/images/fern.jpg'),('Rose','https://contoso.com/images/rose.jpg')],widths=[280,730],font_size=20)
save(img,'pl300-f9798a87ed47')

# 260 location context
img=canvas(620); d=ImageDraw.Draw(img); title(d,'Report canvas')
d.rounded_rectangle((70,160,1130,540),16,fill=(248,250,253),outline=(200,208,219),width=2)
for xy,name in [((120,210,430,360),'Clustered column chart'),((500,210,800,360),'Card'),((835,210,1080,480),'Slicer'),((120,395,800,505),'Table')]:
    d.rounded_rectangle(xy,10,fill='white',outline=(170,184,205),width=2); d.text((xy[0]+16,xy[1]+16),name,font=f(18,True),fill=(45,54,68)); d.text((xy[0]+16,xy[1]+50),f'X: {xy[0]}   Y: {xy[1]}',font=f(17),fill=(92,102,118))
save(img,'pl300-1400e100ff40')

# 265 accessibility colors
img=canvas(590); d=ImageDraw.Draw(img); title(d,'Report visuals using the default theme')
for i,(name,vals) in enumerate([('Bar chart',[70,45,82]),('Line chart',[55,75,40]),('KPI',[64,38,88])]):
    x=80+i*365; d.rounded_rectangle((x,175,x+300,500),12,fill=(249,250,253),outline=(200,208,219),width=2); d.text((x+20,198),name,font=f(21,True),fill=(35,45,60));
    for j,v in enumerate(vals): d.rectangle((x+40+j*75,440-v*2,x+90+j*75,440),fill=[(226,74,74),(67,160,71),(67,105,200)][j])
save(img,'pl300-3ea986530af6')

# 269 same-shape color indicators
img=canvas(620); d=ImageDraw.Draw(img); title(d,'Returns vs monthly quota')
rows=[('Store A','Above', (53,154,92)),('Store B','Near',(235,171,52)),('Store C','Below',(210,68,68)),('Store D','Above',(53,154,92))]
table(d,120,170,['Store','Status','Indicator'],[(a,b,'') for a,b,_ in rows],widths=[320,320,320],font_size=20)
for i,(_,_,c) in enumerate(rows): d.ellipse((855,230+i*52,885,260+i*52),fill=c)
d.text((120,520),'Status is currently communicated by color using the same circular shape.',font=f(18),fill=(80,90,105))
save(img,'pl300-f650c923c32a')

# 275 color-only sales status
img=canvas(650); d=ImageDraw.Draw(img); title(d,'Sales status table')
rows=[('Product A','$42,100','On target',(55,154,92)),('Product B','$18,900','Below target',(210,68,68)),('Product C','$31,300','Near target',(235,171,52)),('Product D','$47,600','On target',(55,154,92))]
table(d,100,170,['Product','Sales','Sales status'],[(a,b,c) for a,b,c,_ in rows],widths=[300,300,400],font_size=20)
for i,(_,_,_,c) in enumerate(rows): d.rectangle((980,228+i*52,1012,258+i*52),fill=c)
d.text((100,535),'Sales status is distinguished by background color only.',font=f(18),fill=(80,90,105))
save(img,'pl300-756c36e3dfef')

print('Rebuilt 16 PL-300 visual assets')
