export {
  isStructuredQuestion,
  normalizeStructuredValue,
  structuredFields,
  structuredFieldChoices,
  structuredAnswerFields,
  structuredAnswerComplete,
  structuredAnswerState,
  structuredAnswerCorrect,
  structuredExpectedDisplay,
  structuredSelectedDisplay,
  structuredFieldCorrect
} from './exam-structured.js';
export {isQuestionAnswered,isAnswerCorrect,calculateResult,validateExamPayload} from './exam.js';
export {EXAM_MODE_IDS,resolveExamMode} from './exam-modes.js?v=0.22.2';

import {createFreshExamSession,restoreExamSession} from './exam-session.js?v=0.22.2';

export {
  selectSingleAnswerState,
  toggleMultiSelectAnswerState,
  confirmMultiSelectAnswerState,
  confirmVoucherRankedAnswerState,
  updateStructuredAnswerState,
  confirmStructuredAnswerState
} from './exam-answers.js?v=0.22.2';

export {
  normalizeNavigatorFilter,
  toggleMarkedQuestionState,
  moveQuestionIndex,
  setQuestionIndex
} from './exam-navigation.js?v=0.22.2';

export {examTimerPolicyLabel} from './exam-timer.js?v=0.22.2';

export {
  buildExamProgressSnapshot,
  getActiveExamProgress,
  effectiveSavedRemainingSeconds,
  voucherSavedAttemptMatches
} from './exam-persistence.js?v=0.22.2';

export {
  feedbackStateForQuestion,
  voucherSelectionStatusText,
  isMultiSelectQuestion
} from './exam-feedback.js?v=0.22.2';

export {
  buildSubjectBreakdown,
  buildStandardResultRecord,
  buildOnlineAttemptPayload,
  resultHeadline
} from './exam-results.js?v=0.22.2';

export function createExamSession({restored=null,...options}={}){
  return restored
    ?restoreExamSession({...options,restored})
    :createFreshExamSession(options);
}
