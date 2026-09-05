export function isStructuredQuestion(question){
  return String(question?.responseType||'').toLowerCase()==='structured' && Boolean(question?.nativeResponse);
}

export function normalizeStructuredValue(value){
  return String(value??'')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu,'');
}

export function structuredFields(question){
  if(!isStructuredQuestion(question))return [];
  return Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
}

export function structuredAnswerFields(selected){
  return selected?.type==='structured' && selected?.fields && typeof selected.fields==='object'
    ?selected.fields:{};
}

export function structuredAnswerComplete(question,selected){
  const fields=structuredFields(question);
  if(!fields.length)return false;
  const values=structuredAnswerFields(selected);
  return fields.every(field=>normalizeStructuredValue(values?.[field.id]).length>0);
}

export function structuredAnswerState(question,fields={}){
  const allowed=new Set(structuredFields(question).map(field=>String(field.id)));
  const clean={};
  for(const [key,value] of Object.entries(fields||{})){
    if(allowed.has(String(key)))clean[String(key)]=String(value??'');
  }
  const state={type:'structured',fields:clean,complete:false};
  state.complete=structuredAnswerComplete(question,state);
  return state;
}

export function structuredFieldCorrect(field,value){
  const actual=normalizeStructuredValue(value);
  if(!actual)return false;
  const expected=Array.isArray(field?.expected)?field.expected:[];
  return expected.some(candidate=>normalizeStructuredValue(candidate)===actual);
}

export function structuredAnswerCorrect(question,selected){
  if(!structuredAnswerComplete(question,selected))return false;
  const values=structuredAnswerFields(selected);
  return structuredFields(question).every(field=>structuredFieldCorrect(field,values?.[field.id]));
}

export function structuredExpectedDisplay(question){
  return structuredFields(question).map(field=>({
    id:String(field.id),label:String(field.label||field.id),value:String((field.expected||[])[0]??'')
  }));
}

export function structuredSelectedDisplay(question,selected){
  const values=structuredAnswerFields(selected);
  return structuredFields(question).map(field=>({
    id:String(field.id),label:String(field.label||field.id),value:String(values?.[field.id]??'')
  }));
}
