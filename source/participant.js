(function(root){
'use strict';
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;
function parseDate(value){
 const m=DATE.exec(String(value||''));if(!m)return null;
 const y=+m[1],month=+m[2],day=+m[3],ms=Date.UTC(y,month-1,day),date=new Date(ms);
 return date.getUTCFullYear()===y&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?{year:y,month,day,ms}:null;
}
function testDate(iso){const ms=Date.parse(iso);return Number.isFinite(ms)?new Date(ms+9*3600000).toISOString().slice(0,10):null;}
function age(birthDate,date){
 const b=parseDate(birthDate),t=parseDate(date);if(!b||!t||b.ms>t.ms)return null;
 const before=t.month<b.month||t.month===b.month&&t.day<b.day;
 return {age_years:t.year-b.year-(before?1:0),age_months:(t.year-b.year)*12+t.month-b.month-(t.day<b.day?1:0),age_days:(t.ms-b.ms)/86400000};
}
function validate(input,date){
 const participant_id=String(input.participant_id||'').trim(),participant_name=String(input.participant_name||'').trim(),birth_date=String(input.birth_date||'').trim();
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(participant_id))return {error:'codeError'};
 if(participant_name.length>80||/[\u0000-\u001f\u007f]/.test(participant_name))return {error:'nameError'};
 const b=parseDate(birth_date);if(!b||b.year<1900)return {error:'birthDateError'};
 const ages=age(birth_date,date);if(!ages)return {error:'birthDateFuture'};
 return {participant_id,participant_name:participant_name||null,birth_date,test_date:date,...ages};
}
function fromSession(data){
 const test_date=data.test_date||testDate(data.started_at),ages=data.birth_date?age(data.birth_date,test_date):null;
 return {test_date,age_years:ages?.age_years??data.age_years??null,age_months:ages?.age_months??data.age_months??null,age_days:ages?.age_days??data.age_days??null};
}
const api={parseDate,testDate,age,validate,fromSession};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatteryParticipant=api;
})(typeof globalThis!=='undefined'?globalThis:this);
