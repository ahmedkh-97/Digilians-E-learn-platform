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
  if(!question?.nativeResponse)return [];
  return Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
}

export function structuredFieldChoices(field){
  return Array.isArray(field?.choices)?[...new Set(field.choices.map(value=>String(value??'').trim()).filter(Boolean))]:[];
}

export function structuredChoicePool(question){
  const out=[];
  const seen=new Set();
  for(const field of structuredFields(question)){
    for(const choice of structuredFieldChoices(field)){
      const key=normalizeStructuredValue(choice);
      if(!key||seen.has(key))continue;
      seen.add(key);
      out.push(choice);
    }
  }
  return out;
}

function yesNoEvidence(question){
  const fields=structuredFields(question);
  if(!fields.length)return false;
  const text=String(question?.questionText||question?.question||'');
  if(/\byes\s+or\s+no\b/i.test(text)||/select\s+yes[\s\S]{0,160}(?:otherwise|else)[\s\S]{0,80}no/i.test(text))return true;
  const expected=fields.flatMap(field=>Array.isArray(field?.expected)?field.expected:[]).map(normalizeStructuredValue).filter(Boolean);
  return expected.length>=fields.length&&expected.every(value=>value==='yes'||value==='no');
}

export function structuredBinaryChoices(question,field){
  if(structuredInteractionKind(question)!=='yes-no')return [];
  const explicit=structuredFieldChoices(field).filter(choice=>['yes','no'].includes(normalizeStructuredValue(choice)));
  if(explicit.length===2)return explicit;
  return ['Yes','No'];
}

export function structuredInteractionKind(question){
  const fields=structuredFields(question);
  if(!fields.length)return 'text-fields';
  const raw=String(question?.nativeResponse?.interaction||'').toLowerCase();
  const sourceType=String(question?.sourceType||'').toLowerCase();
  if(yesNoEvidence(question)&&sourceType!=='drag-drop'&&raw!=='ordered-fields')return 'yes-no';
  if((raw==='ordered-fields'||sourceType==='drag-drop')&&structuredChoicePool(question).length)return 'ordered-fields';
  if(yesNoEvidence(question))return 'yes-no';
  if(fields.some(field=>structuredFieldChoices(field).length))return 'choice-fields';
  return 'text-fields';
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