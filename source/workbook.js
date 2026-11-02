(function(root){
'use strict';
const encoder=new TextEncoder(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
function xml(value){return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function column(index){let name='';for(let n=index+1;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;return name;}
function cell(value,row,col,header=false,styleId=null){
 const ref=column(col)+row,index=styleId??(header?1:0),style=index?' s="'+index+'"':'';
 if(value===null||value===undefined||typeof value==='number'&&!Number.isFinite(value))return '<c r="'+ref+'"'+style+'/>';
 if(typeof value==='number')return '<c r="'+ref+'"'+style+'><v>'+value+'</v></c>';
 if(typeof value==='boolean')return '<c r="'+ref+'"'+style+' t="b"><v>'+(value?1:0)+'</v></c>';
 const text=typeof value==='object'?JSON.stringify(value):String(value);
 return '<c r="'+ref+'"'+style+' t="inlineStr"><is><t xml:space="preserve">'+xml(text)+'</t></is></c>';
}
function worksheet(sheet){
 const columns=sheet.columns||Array.from(new Set(sheet.rows.flatMap(r=>Object.keys(r)))),end=column(Math.max(0,columns.length-1))+(sheet.rows.length+1);
 const header='<row r="1" ht="30" customHeight="1">'+columns.map((v,i)=>cell(v,1,i,true)).join('')+'</row>';
 const rows=sheet.rows.map((r,i)=>'<row r="'+(i+2)+'">'+columns.map((key,j)=>cell(r[key],i+2,j)).join('')+'</row>').join('');
 const freeze=sheet.freeze||{rows:1,cols:0},fr=freeze.rows??1,fc=freeze.cols??0;
 const pane='<pane '+(fc?'xSplit="'+fc+'" ':'')+(fr?'ySplit="'+fr+'" ':'')+'topLeftCell="'+column(fc)+(fr+1)+'" activePane="'+(fc&&fr?'bottomRight':fc?'topRight':'bottomLeft')+'" state="frozen"/>';
 const widths=columns.map((key,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(key==='measure'?43:key.includes('sequence')?30:key==='condition'?30:key==='summary_scope'?24:key==='error_type'?28:19)+'" customWidth="1"/>').join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="'+ns+'"><dimension ref="A1:'+end+'"/><sheetViews><sheetView workbookViewId="0">'+pane+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>'+widths+'</cols><sheetData>'+header+rows+'</sheetData><autoFilter ref="A1:'+end+'"/></worksheet>';
}
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zip(entries){
 const prepared=entries.map(([name,text])=>({name:encoder.encode(name),bytes:encoder.encode(text)}));
 const length=prepared.reduce((sum,e)=>sum+30+e.name.length+e.bytes.length+46+e.name.length,22),bytes=new Uint8Array(length),view=new DataView(bytes.buffer),central=[];
 let offset=0;const u16=(at,v)=>view.setUint16(at,v,true),u32=(at,v)=>view.setUint32(at,v,true);
 for(const e of prepared){const start=offset,crc=crc32(e.bytes);u32(offset,0x04034b50);u16(offset+4,20);u16(offset+6,0x0800);u16(offset+8,0);u16(offset+10,0);u16(offset+12,33);u32(offset+14,crc);u32(offset+18,e.bytes.length);u32(offset+22,e.bytes.length);u16(offset+26,e.name.length);u16(offset+28,0);bytes.set(e.name,offset+30);bytes.set(e.bytes,offset+30+e.name.length);offset+=30+e.name.length+e.bytes.length;central.push({...e,start,crc});}
 const centralStart=offset;
 for(const e of central){u32(offset,0x02014b50);u16(offset+4,20);u16(offset+6,20);u16(offset+8,0x0800);u16(offset+10,0);u16(offset+12,0);u16(offset+14,33);u32(offset+16,e.crc);u32(offset+20,e.bytes.length);u32(offset+24,e.bytes.length);u16(offset+28,e.name.length);u16(offset+30,0);u16(offset+32,0);u16(offset+34,0);u16(offset+36,0);u32(offset+38,0);u32(offset+42,e.start);bytes.set(e.name,offset+46);offset+=46+e.name.length;}
 const centralLength=offset-centralStart;u32(offset,0x06054b50);u16(offset+4,0);u16(offset+6,0);u16(offset+8,central.length);u16(offset+10,central.length);u32(offset+12,centralLength);u32(offset+16,centralStart);u16(offset+20,0);
 return bytes;
}
function workbookEntries(sheets){
 if(!sheets.length||sheets.some(s=>!s.name||s.name.length>31||/[\\/?*[\]:]/.test(s.name))||new Set(sheets.map(s=>s.name.toLowerCase())).size!==sheets.length)throw Error('Invalid worksheet names');
 const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',types='http://schemas.openxmlformats.org/package/2006/content-types';
 const entries=[
 ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="'+types+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><bookViews><workbookView/></bookViews><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
 ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rIdStyles" Type="'+rel+'/styles" Target="styles.xml"/></Relationships>'],
 ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="'+ns+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEEEEE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
 ];
 sheets.forEach((s,i)=>entries.push(['xl/worksheets/sheet'+(i+1)+'.xml',s.grid?richWorksheet(s):worksheet(s)]));return entries;
}
function richId(c){
 const ids={title:2,meta:3,note:4,warning:5,section:6,sectionTeal:7,header:8,text:9,label:10,n:15,missing:16,good:17,bad:18,excluded:19,center:20};
 return c.s==='value'?({integer:11,decimal:12,precise:13,percent:14}[c.fmt]||13):(ids[c.s]??9);
}
function richStyles(){
 const f=(size,color,bold=false)=>'<font>'+(bold?'<b/>':'')+'<sz val="'+size+'"/><color rgb="'+color+'"/><name val="Malgun Gothic"/></font>';
 const fonts=[f(10,'FF203247'),f(10,'FF203247',true),f(10,'FFFFFFFF',true),f(16,'FF142D4E',true),f(9,'FF64748B'),f(10,'FF166534'),f(10,'FF991B1B'),f(10,'FF92400E'),f(10,'FF203247',true)];
 const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>',...['FFEEEEEE','FFEDF3F9','FFFFF4DC','FF18334E','FF116D77','FFF5F7FA','FFE8F5EC','FFFDECEC'].map(c=>'<fill><patternFill patternType="solid"><fgColor rgb="'+c+'"/><bgColor indexed="64"/></patternFill></fill>')];
 const xfs=[[0,0,0,0,'left'],[1,2,0,0,'left'],[3,0,0,0,'left'],[4,0,0,0,'left'],[4,3,0,0,'left'],[7,4,0,0,'left'],[2,5,0,0,'left'],[2,6,0,0,'left'],[2,5,0,0,'center'],[0,0,1,0,'left'],[8,3,1,0,'left'],[0,0,1,1,'right'],[0,0,1,164,'right'],[0,0,1,165,'right'],[0,0,1,166,'right'],[4,7,1,1,'center'],[4,0,1,0,'center'],[5,8,1,0,'center'],[6,9,1,0,'center'],[4,7,1,0,'center'],[0,0,1,0,'center']];
 return '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="'+ns+'"><numFmts count="3"><numFmt numFmtId="164" formatCode="0.0"/><numFmt numFmtId="165" formatCode="0.000"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts><fonts count="'+fonts.length+'">'+fonts.join('')+'</fonts><fills count="'+fills.length+'">'+fills.join('')+'</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="hair"><color rgb="FFD8E0EA"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+xfs.length+'">'+xfs.map(([font,fill,border,num,align])=>'<xf numFmtId="'+num+'" fontId="'+font+'" fillId="'+fill+'" borderId="'+border+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="'+align+'" vertical="center" wrapText="1"/></xf>').join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}
function richWorksheet(s){
 const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',freeze=s.freeze||{rows:4,cols:0},top=column(freeze.cols||0)+((freeze.rows||0)+1),pane=freeze.cols&&freeze.rows?'bottomRight':freeze.cols?'topRight':'bottomLeft';
 const view='<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="'+(s.zoom||85)+'"><pane '+(freeze.cols?'xSplit="'+freeze.cols+'" ':'')+(freeze.rows?'ySplit="'+freeze.rows+'" ':'')+'topLeftCell="'+top+'" activePane="'+pane+'" state="frozen"/><selection pane="'+pane+'" activeCell="'+top+'" sqref="'+top+'"/></sheetView></sheetViews>';
 const widths=s.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
 const rows=s.grid.map((r,i)=>'<row r="'+(i+1)+'" ht="'+(r.height||28)+'" customHeight="1">'+r.cells.map((c,j)=>{const spec=c&&typeof c==='object'&&Object.prototype.hasOwnProperty.call(c,'v')?c:{v:c,s:'text'};return cell(spec.v,i+1,j,false,richId(spec));}).join('')+'</row>').join('');
 const merges=s.merges.length?'<mergeCells count="'+s.merges.length+'">'+s.merges.map(ref=>'<mergeCell ref="'+xml(ref)+'"/>').join('')+'</mergeCells>':'';
 const tables=s.tables.length?'<tableParts count="'+s.tables.length+'">'+s.tables.map((_,i)=>'<tablePart r:id="rIdT'+(i+1)+'"/>').join('')+'</tableParts>':'';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="'+ns+'" xmlns:r="'+rel+'"><sheetPr><tabColor rgb="'+(s.tabColor||'FF18334E')+'"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+column(s.widths.length-1)+s.grid.length+'"/>'+view+'<sheetFormatPr defaultRowHeight="28"/><cols>'+widths+'</cols><sheetData>'+rows+'</sheetData>'+merges+'<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'+tables+'</worksheet>';
}
function richTable(t,id){
 if(new Set(t.columns).size!==t.columns.length)throw Error('Duplicate table headers');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="'+ns+'" id="'+id+'" name="'+xml(t.name)+'" displayName="'+xml(t.name)+'" ref="'+xml(t.ref)+'" totalsRowShown="0"><autoFilter ref="'+xml(t.ref)+'"/><tableColumns count="'+t.columns.length+'">'+t.columns.map((name,i)=>'<tableColumn id="'+(i+1)+'" name="'+xml(name).replace(/\n/g,'&#10;')+'"/>').join('')+'</tableColumns><tableStyleInfo name="TableStyleLight9" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>';
}
function workbook(sheets){
 const entries=workbookEntries(sheets);
 if(sheets.some(s=>s.grid))entries.find(e=>e[0]==='xl/styles.xml')[1]=richStyles();
 const rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',types=[];let id=0;
 sheets.forEach((s,i)=>{
  if(!s.tables?.length)return;
  const relationships=s.tables.map((t,j)=>{id++;entries.push(['xl/tables/table'+id+'.xml',richTable(t,id)]);types.push('<Override PartName="/xl/tables/table'+id+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>');return '<Relationship Id="rIdT'+(j+1)+'" Type="'+rel+'/table" Target="../tables/table'+id+'.xml"/>';});
  entries.push(['xl/worksheets/_rels/sheet'+(i+1)+'.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relationships.join('')+'</Relationships>']);
 });
 entries[0][1]=entries[0][1].replace('</Types>',types.join('')+'</Types>');
 return zip(entries);
}

function base64(bytes){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2],n=(a<<16)|((b||0)<<8)|(c||0);out+=chars[(n>>>18)&63]+chars[(n>>>12)&63]+(i+1<bytes.length?chars[(n>>>6)&63]:'=')+(i+2<bytes.length?chars[n&63]:'=');}return out;}
const api={workbook,base64};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatteryWorkbook=api;
})(typeof globalThis!=='undefined'?globalThis:this);

