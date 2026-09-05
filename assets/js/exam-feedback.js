import {correctAnswerIds,selectedAnswerIds,isAnswered,isQuestionAnswered,isAnswerCorrect} from './exam.js';
import {isStructuredQuestion,structuredFields,structuredAnswerFields,structuredAnswerComplete} from './exam-structured.js';

export function isMultiSelectQuestion(question){
  return correctAnswerIds(question).length>1;
}

export function feedbackStateForQuestion({question,selected,feedbackMode='instant',rankedLearning=false,confirmedVoucher=false,confirmedMulti=false}={}){
  const structured=isStructuredQuestion(question);
  const multi=!structured&&isMultiSelectQuestion(question);
  const answered=isQuestionAnswered(question,selected);
  const feedbackReady=feedbackMode!=='instant'||(rankedLearning?Boolean(confirmedVoucher):(!multi||Boolean(confirmedMulti)));
  const showFeedback=feedbackMode==='instant'&&answered&&feedbackReady;
  return {
    multi,answered,feedbackReady,showFeedback,
    correct:showFeedback?isAnswerCorrect(question,selected):false,
    correctIds:structured?[]:correctAnswerIds(question),
    selectedIds:structured?[]:selectedAnswerIds(selected)
  };
}

export function voucherSelectionStatusText({question,selected,feedbackMode='instant',rankedLearning=false,confirmed=false}={}){
  if(isStructuredQuestion(question)){
    const fields=structuredFields(question);
    const values=structuredAnswerFields(selected);
    const filled=fields.filter(field=>String(values?.[field.id]??'').trim()).length;
    const total=fields.length;
    if(feedbackMode==='instant'){
      if(confirmed)return 'Answer submitted. Review the feedback, then continue.';
      return filled===total&&total>0
        ?`Complete all fields · ${filled} of ${total} filled · Ready to confirm`
        :`Complete all fields · ${filled} of ${total} filled`;
    }
    return filled===total&&total>0
      ?`${filled} of ${total} filled · Saved`
      :`Complete all fields · ${filled} of ${total} filled`;
  }
  const required=correctAnswerIds(question).length;
  const selectedCount=selectedAnswerIds(selected).length;
  const multi=required>1;
  if(multi){
    if(feedbackMode==='instant'){
      if(confirmed)return 'Answer submitted. Review the feedback, then continue.';
      if(selectedCount===required)return `${selectedCount} of ${required} selected · Ready to confirm`;
      return `Select ${required} answers · ${selectedCount} of ${required} selected`;
    }
    return selectedCount===required
      ?`${selectedCount} of ${required} selected · Saved`
      :`Select ${required} answers · ${selectedCount} of ${required} selected`;
  }
  if(rankedLearning){
    if(feedbackMode!=='instant')return 'Choose one answer. Your selection is saved and can be changed before submission.';
    return confirmed?'Answer submitted. Review the feedback, then continue.':'Choose one answer. It will be submitted immediately.';
  }
  return 'Choose one answer.';
}
