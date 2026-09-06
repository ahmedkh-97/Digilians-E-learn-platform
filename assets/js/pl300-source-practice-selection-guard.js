const installedDocuments=new WeakSet();
const postRenderClickSelector='#sourceReviewNext,#sourceReviewPrev,#sourceReviewJumpBtn,#sourcePracticeRetryBtn,#sourcePracticeNativeRetryBtn,#sourcePracticeRetryLaterBtn,[data-source-review-filter],[data-pl300-part-select],[data-pl300-parts-back],[data-pl300-review-weak],[data-pl300-continue-next-part]';

export function sourcePracticeRequiredCountFromText(text=''){
  const match=String(text||'').match(/Select\s+(\d+)\s+answers?/i);
  const count=Number(match?.[1]);
  return Number.isInteger(count)&&count>1?count:null;
}

export function sourcePracticeSelectionPolicy({requiredCount=1,selectedCount=0,isSelected=false}={}){
  const required=Math.max(1,Number(requiredCount)||1);
  const selected=Math.max(0,Number(selectedCount)||0);
  const multi=required>1;
  return {
    multi,
    blockOption:multi&&!isSelected&&selected>=required,
    checkDisabled:multi?selected!==required:selected!==1,
    autoSubmit:!multi&&selected===1
  };
}

function actionsForGroup(group){
  const actions=group?.nextElementSibling;
  return actions?.classList?.contains?.('source-practice-actions')?actions:null;
}

function requiredCountForGroup(group){
  if(!group)return null;
  if(group.classList?.contains?.('single'))return 1;
  const actions=actionsForGroup(group);
  return sourcePracticeRequiredCountFromText(actions?.querySelector?.('small')?.textContent||'');
}

export function applySourcePracticeSelectionGuard(root){
  if(!root?.querySelectorAll)return;
  root.querySelectorAll('.source-review-options').forEach(group=>{
    const actions=actionsForGroup(group);
    const check=actions?.querySelector?.('#sourcePracticeCheckBtn');
    if(!actions||!check)return;
    const helper=actions.querySelector?.('small');
    const required=requiredCountForGroup(group);
    if(!required)return;
    const selectedButtons=[...group.querySelectorAll('.source-review-option.selected')];
    const selectedCount=selectedButtons.length;
    if(required===1){
      check.hidden=true;
      check.setAttribute?.('aria-hidden','true');
      check.tabIndex=-1;
      if(helper)helper.textContent='Select one answer to check it instantly.';
      return;
    }
    group.querySelectorAll('.source-review-option').forEach(button=>{
      const isSelected=button.classList?.contains?.('selected');
      button.disabled=sourcePracticeSelectionPolicy({requiredCount:required,selectedCount,isSelected}).blockOption;
    });
    check.disabled=sourcePracticeSelectionPolicy({requiredCount:required,selectedCount}).checkDisabled;
    check.textContent=`Check ${required} answers`;
    check.dataset.sourcePracticeRequired=String(required);
    if(helper)helper.textContent=`${selectedCount}/${required} selected · Select ${required} answers.`;
  });
}

function injectSingleAnswerStyle(doc){
  if(!doc?.head||doc.querySelector?.('style[data-pl300-single-instant-submit]'))return;
  const style=doc.createElement('style');
  style.dataset.pl300SingleInstantSubmit='1';
  style.textContent='.source-review-options.single + .source-practice-actions #sourcePracticeCheckBtn{display:none!important}';
  doc.head.append(style);
}

export function installSourcePracticeSelectionGuard(doc=globalThis.document){
  if(!doc||typeof doc.addEventListener!=='function'||installedDocuments.has(doc))return false;
  installedDocuments.add(doc);
  injectSingleAnswerStyle(doc);
  const root=doc.getElementById?.('voucherSourceReviewBody')||doc.body;
  const apply=()=>applySourcePracticeSelectionGuard(root);

  doc.addEventListener('click',event=>{
    const option=event?.target?.closest?.('[data-source-practice-option]');
    const group=option?.closest?.('.source-review-options');
    if(!option||!group||!group.classList?.contains?.('multi'))return;
    const required=requiredCountForGroup(group);
    if(!required)return;
    const selectedCount=group.querySelectorAll('.source-review-option.selected').length;
    const isSelected=option.classList?.contains?.('selected');
    if(sourcePracticeSelectionPolicy({requiredCount:required,selectedCount,isSelected}).blockOption){
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    }
  },true);

  doc.addEventListener('click',event=>{
    const option=event?.target?.closest?.('[data-source-practice-option]');
    const group=option?.closest?.('.source-review-options');
    const postRenderAction=event?.target?.closest?.(postRenderClickSelector);
    if(!option&&!postRenderAction)return;
    const single=Boolean(group?.classList?.contains?.('single'));
    queueMicrotask(()=>{
      apply();
      if(!single)return;
      const check=root?.querySelector?.('#sourcePracticeCheckBtn');
      if(check?.hidden&&!check.disabled)check.click();
    });
  });

  apply();
  return true;
}

if(typeof document!=='undefined')installSourcePracticeSelectionGuard(document);
