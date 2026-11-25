'use strict';
(() => {
  const panel = document.createElement('section');
  panel.id = 'viewEdit'; panel.className = 'hidden';
  panel.innerHTML = `
  <div class="ed-card"><div class="ed-heading"><div><h2>圈選文字與圖片，精準修改</h2><p>開啟文件 → 圈選原內容 → 設定替換方式 → 對照預覽 → 套用並匯出。</p></div><label class="ed-primary ed-upload">開啟 PDF<input id="edFile" type="file" accept="application/pdf,.pdf" hidden></label></div>
  <div id="edConnection" role="status">正在確認本機編輯服務…</div><div class="ed-last-export"><button id="edLastExport" hidden>編輯最近匯出的 PDF</button></div>
  <div class="ed-toolbar"><span id="edName">尚未載入文件</span><button id="edUndo" disabled>復原</button><button id="edRedo" disabled>重做</button><button id="edExport" class="ed-primary" disabled>匯出修改 PDF</button></div>
  <div class="ed-workspace"><div class="ed-document"><div class="ed-pagination"><button id="edPrev" disabled>上一頁</button><span id="edPageLabel">0 / 0</span><button id="edNext" disabled>下一頁</button><select id="edZoom" aria-label="頁面縮放"><option value="1">100%</option><option value="1.4">140%</option><option value="1.8">180%</option></select></div><div class="ed-scroll"><div id="edEmpty">開啟 PDF 後，在頁面拖曳框選要修改的位置。<br>合併、拆分及整理頁面仍可使用上方原有分頁。</div><div id="edPaper" hidden><img id="edImage" alt="PDF 編輯頁面" draggable="false"><div id="edOverlay"></div></div></div></div>
  <aside class="ed-settings"><h3>選取範圍</h3><div id="edSelection">尚未圈選</div><div id="edKind" role="status"></div>
  <label>編輯內容<select id="edAction"><option value="ai_region">AI 整頁參考修改</option><option value="text">替換／新增文字</option><option value="image">替換／新增圖片</option><option value="remove_image">清除點陣圖片區域</option></select></label>
  <div id="edTextFields"><label>處理方式<select id="edMode"><option value="native">替換原生文字（保留背景）</option><option value="scan">清除掃描影像原字後重寫（白底）</option><option value="add">新增文字（保留原內容）</option></select></label><p id="edModeHint" class="ed-hint"></p><label>擷取的原文<textarea id="edOriginal" rows="2" readonly placeholder="掃描影像需 AI 辨識或手動輸入"></textarea></label><label>修改後文字<textarea id="edText" rows="3" placeholder="輸入完整替換文字"></textarea></label><div class="ed-fields"><label>字級<input id="edSize" type="number" min="3" max="144" step=".5" value="14"></label><label>顏色<input id="edColor" type="color" value="#222222"></label></div><div class="ed-fields"><label>字型<select id="edFont"><option value="sans">黑體／無襯線</option><option value="serif">明體／襯線</option></select></label><label>對齊<select id="edAlign"><option value="0">靠左</option><option value="1">置中</option><option value="2">靠右</option></select></label></div>
  <details id="edAiPanel" open><summary>AI 修改要求</summary><p class="ed-hint">圈選用來指定修改位置。請描述想改成什麼，產生結果後先看前後對照再套用。</p><label>AI &#24037;&#20316;&#27169;&#24335;<select id="edAiTask"><option value="region">整頁修改（圈選僅作定位）</option><option value="text">&#36776;&#35672;&#25110;&#25913;&#23531;&#25991;&#23383;&#33609;&#31295;</option></select></label><label>AI &#26381;&#21209;<select id="edProvider"><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label><label>&#27169;&#22411;&#20195;&#34399;<input id="edModel" value="gemini-3.6-flash" placeholder="gemini-3.6-flash"></label><label>&#22294;&#20687;&#32232;&#36655;&#27169;&#22411;<input id="edImageModel" value="gemini-3.1-flash-image"></label><label class="ed-check" id="edRegionConsentLabel"><input id="edRegionConsent" type="checkbox">同意將本頁全圖、參考位置與要求傳給 Gemini 進行整頁修改</label><label class="ed-check"><input id="edMatchTone" type="checkbox" checked>貼近原頁紙張底色（整頁輕度校正，可關閉）</label><p class="ed-hint" id="edProviderHint"></p><label>API 金鑰<input id="edKey" type="password" autocomplete="off" placeholder="貼上金鑰，可選擇加密記在這台電腦"></label><p id="edKeyStatus" class="ed-hint" role="status" aria-live="polite"></p><div class="ed-fields"><button id="edSaveKey" type="button">在這台電腦記住／更換金鑰</button><button id="edClearKey" type="button" disabled>清除已記住的金鑰</button></div><p class="ed-hint">以目前 Windows 帳戶加密保存在本機。只有按「記住」才保存，不會把完整金鑰傳回頁面或寫入 PDF。</p><label class="ed-check"><input id="edVision" type="checkbox">將圈選圖片送給 AI 辨識</label><label>辨識或修改要求<textarea id="edInstruction" rows="2" placeholder="例如：將民國 113 年改為 115 年，只輸出替換文字"></textarea></label><div id="edAiProgress" class="ed-ai-progress" role="status" aria-live="polite" hidden></div><button id="edAi">產生替換文字</button></details></div>
  <div id="edImageFields" hidden><label>替換圖片<input id="edReplacementImage" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="ed-hint">框住完整原圖以替換，或在空白處插入。新圖片保持比例；只框局部會清除該區像素。</p></div><p id="edRemoveHint" class="ed-hint" hidden>只清除框內的點陣圖片像素，保留文字與向量圖形。</p>
  <button id="edQueue" disabled>＋ 加入修改清單</button><div id="edQueueList"></div><button id="edPreview" class="ed-primary" disabled>預覽這筆修改</button><p class="ed-hint" id="edEditNote">掃描重寫會將圈內背景清成白色。請只框住原字，避開邊框與簽章。字型不保證與掃描原件一致。</p></aside></div></div>
  <dialog id="edCompare"><div class="ed-heading"><h2>修改前後對照</h2><button id="edCancelX" aria-label="取消預覽">×</button></div><p class="ed-hint">原文件尚未變更。請檢查所有修改頁面，確認後再套用。</p><p id="edFitNotice" class="ed-hint"></p><label class="ed-check" id="edDiffLabel" hidden><input id="edShowDiff" type="checkbox"> 標示實際影像差異（紅色），藍框為參考位置</label><select id="edComparePage" aria-label="對照頁面"></select><div class="ed-comparison"><figure><figcaption>修改前</figcaption><img id="edBefore" alt="修改前"></figure><figure><figcaption>修改後</figcaption><img id="edAfter" alt="修改後"></figure></div><div class="ed-dialog-actions"><button id="edCancel">取消</button><button id="edAccept" class="ed-primary">套用修改</button></div></dialog>
  <div id="edStatus" role="status" aria-live="polite"></div>`;
  document.querySelector('main').append(panel);
  const el = id => document.getElementById('ed' + id);
  el('TextFields').before(el('AiPanel'));
  let capabilities=[], supportedProviders=['openai'], activeProvider='gemini';
  let savedCredentials={};
  const providerKeys={gemini:'',openai:''}, providerModels={gemini:'gemini-3.6-flash',openai:'gpt-4.1-mini'};
  let state=null, page=0, rect=null, token='', busy=false, pending=null, queue=[], start=null, sequence=0, inspector=null, lastExport=null;
  function message(text) { el('Status').textContent=text; }
  async function post(path, data, form=false, timeout=20000) {
    const res=await fetch(path, {method:'POST',signal:AbortSignal.timeout(timeout),headers:form?{'X-Workshop-Token':token}:{'Content-Type':'application/json','X-Workshop-Token':token},body:form?data:JSON.stringify(data)});
    if(res.status===404&&path.endsWith('/ai-jobs')){const error=Error('使用相容 AI 模式');error.code='LEGACY_AI';throw error;}
    const result=await res.json(); if(!res.ok) throw Error(result.error||'操作失敗'); return result;
  }
  function buttons() {
    for(const id of ['Undo','Redo','Export','Prev','Next','Queue','Preview','Ai']) el(id).disabled=busy||!state;
    el('Undo').disabled=busy||!state?.undo; el('Redo').disabled=busy||!state?.redo;
    el('Prev').disabled=busy||!state||page===0; el('Next').disabled=busy||!state||page===state.pages.length-1;
    el('Queue').disabled=busy||!rect||!inspector; el('Preview').disabled=busy||(!queue.length&&(!rect||!inspector));
    el('File').disabled=busy||!token; el('Action').disabled=busy;
    el('Accept').disabled=busy; el('Cancel').disabled=busy; el('CancelX').disabled=busy;
  }
  async function task(fn) {if(busy)return;busy=true;buttons();message('處理中…');try{const outcome=await fn();message(outcome||'已完成')}catch(err){message(err.message)}finally{busy=false;buttons()}}
  function imageUrl(n){return `/api/${state.id}/page/${n}?width=1400&v=${state.revision}`;}
  function resetSelection(){sequence++;rect=null;inspector=null;start=null;el('AiProgress').hidden=true;el('Overlay').replaceChildren();el('Selection').textContent='尚未圈選';el('Kind').textContent='';el('Original').value='';el('Text').value='';buttons();}
  function render(){el('Empty').hidden=true;el('Paper').hidden=false;el('Name').textContent=state.name;el('PageLabel').textContent=`${page+1} / ${state.pages.length}`;el('Paper').style.width=`${Math.min(800,state.pages[page].width)*Number(el('Zoom').value)}px`;el('Image').src=imageUrl(page);buttons();}
  function modeHint(){el('ModeHint').textContent=el('Mode').value==='scan'?'將框內掃描像素清為白色，再重寫文字。請精準框住原字；預覽確認字級、位置和字型。':el('Mode').value==='add'?'新增文字會保留原內容，不會替換原有字。':'只移除原生文字物件；遇到圖片範圍會阻止操作，請改用掃描重寫模式。';}
  function draw(){el('Overlay').replaceChildren();if(!rect)return;const p=state.pages[page],mark=document.createElement('div');mark.className='ed-selection';Object.assign(mark.style,{left:rect[0]/p.width*100+'%',top:rect[1]/p.height*100+'%',width:(rect[2]-rect[0])/p.width*100+'%',height:(rect[3]-rect[1])/p.height*100+'%'});el('Overlay').append(mark);}
  function point(e){const b=el('Overlay').getBoundingClientRect(),p=state.pages[page];return [Math.max(0,Math.min(p.width,(e.clientX-b.left)*p.width/b.width)),Math.max(0,Math.min(p.height,(e.clientY-b.top)*p.height/b.height))];}
  function updateRect(e){const end=point(e);rect=[Math.min(start[0],end[0]),Math.min(start[1],end[1]),Math.max(start[0],end[0]),Math.max(start[1],end[1])];draw();}
  el('Overlay').onpointerdown=e=>{if(!state||busy||e.button!==0)return;e.preventDefault();resetSelection();start=point(e);el('Overlay').setPointerCapture(e.pointerId);};
  el('Overlay').onpointermove=e=>{if(start)updateRect(e);};
  el('Overlay').onpointercancel=resetSelection;
  el('Overlay').onpointerup=async e=>{if(!start)return;updateRect(e);start=null;if(rect[2]-rect[0]<5||rect[3]-rect[1]<5){resetSelection();return;}const stamp=++sequence;el('Selection').textContent=`第 ${page+1} 頁 · ${Math.round(rect[2]-rect[0])} × ${Math.round(rect[3]-rect[1])} pt`;try{const result=await post(`/api/${state.id}/inspect`,{page,rect});if(stamp!==sequence)return;inspector=result;el('Original').value=result.text;el('Text').value=result.text;el('Size').value=Math.max(3,Math.min(144,result.size));el('Color').value=result.color;el('Mode').value=result.has_image?'scan':result.has_text?'native':'add';el('Vision').checked=result.has_image;el('Kind').textContent=result.has_image?'掃描／圖片區域：原字位於影像中，請檢查清除範圍。':result.has_text?'可編輯的原生文字':'空白區域：可新增文字或圖片。';modeHint();buttons();}catch(err){message(err.message);}};
  function draft(){if(!rect||!inspector)throw Error('請先完成圈選');const edit={page,rect:[...rect],action:el('Action').value==='ai_region'?'text':el('Action').value,text:el('Text').value,size:Number(el('Size').value),color:el('Color').value,font:el('Font').value,align:Number(el('Align').value),replace:el('Mode').value!=='add',erase_scan:el('Mode').value==='scan'};if(edit.action==='image'){edit.file=el('ReplacementImage').files[0];if(!edit.file)throw Error('請選擇替換圖片');}return edit;}
  function renderQueue(){el('QueueList').replaceChildren();queue.forEach((edit,i)=>{const row=document.createElement('div');row.className='ed-queue-item';const text=document.createElement('span');text.textContent=`${i+1}. 第 ${edit.page+1} 頁 · ${edit.action==='text'?'文字':'圖片'}`;const remove=document.createElement('button');remove.textContent='×';remove.onclick=()=>{if(busy)return;queue.splice(i,1);renderQueue();buttons();};row.append(text,remove);el('QueueList').append(row);});el('Preview').textContent=queue.length?`預覽清單 ${queue.length} 筆修改`:'預覽這筆修改';}
  el('Queue').onclick=()=>{try{const edit=draft();if(queue.length>=50)throw Error('每批最多 50 筆');if(queue.some(q=>q.page===edit.page&&q.rect[0]<edit.rect[2]&&q.rect[2]>edit.rect[0]&&q.rect[1]<edit.rect[3]&&q.rect[3]>edit.rect[1]))throw Error('與清單中的圈選重疊，請先移除重疊項目');queue.push(edit);renderQueue();resetSelection();message('已加入清單，可繼續圈選其他區域或頁面。');}catch(err){message(err.message);}};
  async function openFile(file){return task(async()=>{if(!file)return;if(!token)throw Error('請從本機服務 http://127.0.0.1:8766 開啟，再使用圈選編輯。');const form=new FormData();form.append('files',file);state=await post('/api/import',form,true);page=0;queue=[];renderQueue();resetSelection();render();el('File').value='';});}
  el('File').onchange=()=>openFile(el('File').files[0]);
  window.PDFStudioEditor={open:openFile};
  window.addEventListener('pdf-exported',event=>{lastExport=event.detail;el('LastExport').hidden=false;});
  el('LastExport').onclick=()=>{if(lastExport)openFile(new File([lastExport.blob],lastExport.filename,{type:'application/pdf'}));};
  for(const [id,delta] of [['Prev',-1],['Next',1]])el(id).onclick=()=>{if(busy)return;page+=delta;resetSelection();render();};
  el('Zoom').onchange=()=>{if(state)render();};
  el('Mode').onchange=modeHint;
  el('Action').onchange=updateAiMode;
  for(const action of ['undo','redo'])el(action==='undo'?'Undo':'Redo').onclick=()=>task(async()=>{state=await post(`/api/${state.id}/operation`,{action,revision:state.revision});queue=[];renderQueue();resetSelection();render();});
  el('Export').onclick=()=>{if(state)triggerDownloadUrl(`/api/${state.id}/export`);};
  function triggerDownloadUrl(url){const a=document.createElement('a');a.href=url;a.download='edited.pdf';a.click();}
  function showFitNotice(){const full=pending?.mode==='full_page';el('DiffLabel').hidden=!full;if(!full)el('ShowDiff').checked=false;el('FitNotice').textContent=full?`整頁影像差異約 ${pending.difference?.changed_percent??0}%，其中參考框以外約 ${pending.difference?.outside_reference_percent??0}%（占整頁像素）。差異可能包含底色、文字或位置，請核對整頁。`:(pending?.adjustments||[]).map(item=>`第 ${item.page+1} 頁：數字已從 ${item.requested_size} 自動縮至 ${item.actual_size} 字級，以放入圈選範圍。`).join(' ');}
  function comparison(){if(!pending)return;showFitNotice();const n=Number(el('ComparePage').value);el('Before').src=imageUrl(n);const difference=pending.mode==='full_page'&&el('ShowDiff').checked;el('After').src=`/api/${state.id}/preview/${pending.token}/${difference?'difference':'page'}/${n}`;el('After').alt=difference?'整頁實際差異標示，非套用內容':'修改後完整頁面';}
  el('ShowDiff').onchange=comparison;
  el('ComparePage').onchange=comparison;
  el('Preview').onclick=()=>task(async()=>{const edits=queue.length?queue.map(e=>({...e})):[draft()];const form=new FormData();edits.forEach((edit,i)=>{if(edit.file){edit.image_field=`image_${i}`;form.append(edit.image_field,edit.file);delete edit.file;}});form.append('body',JSON.stringify({action:'batch',revision:state.revision,edits}));pending=await post(`/api/${state.id}/preview`,form,true);el('ComparePage').replaceChildren();for(const n of new Set(edits.map(e=>e.page))){const option=document.createElement('option');option.value=n;option.textContent=`第 ${n+1} 頁`;el('ComparePage').append(option);}comparison();el('Compare').showModal();});
  async function closePreview(accept){await task(async()=>{if(!pending)return;state=await post(`/api/${state.id}/preview/${pending.token}/${accept?'accept':'cancel'}`,{});pending=null;el('Compare').close();if(accept){queue=[];renderQueue();resetSelection();render();}return accept?'PDF 已套用修改，請匯出保存。':'已取消預覽，PDF 未變更。';});}
  el('Accept').onclick=()=>closePreview(true);el('Cancel').onclick=()=>closePreview(false);el('CancelX').onclick=()=>closePreview(false);el('Compare').oncancel=e=>{e.preventDefault();if(!busy)closePreview(false);};
  function aiProgress(state, text){el('AiProgress').hidden=false;el('AiProgress').dataset.state=state;el('AiProgress').textContent=text;}
  function updateAiMode(){
    const action=el('Action').value,region=action==='ai_region'&&el('AiTask').value==='region';
    el('AiPanel').hidden=action!=='ai_region';el('AiPanel').open=true;
    el('TextFields').hidden=!(action==='text'||(action==='ai_region'&&!region));
    el('ImageFields').hidden=action!=='image';el('RemoveHint').hidden=action!=='remove_image';
    el('Model').parentElement.hidden=region;el('ImageModel').parentElement.hidden=!region;
    el('RegionConsentLabel').hidden=!region;el('Vision').parentElement.hidden=region;
    el('Queue').hidden=region;el('Preview').hidden=region;
    el('EditNote').textContent=region?'AI 回傳完整頁面，原頁尺寸與其他頁面保留。請檢查整頁內容與差異標示後再套用；本頁會轉成圖片。':'掃描手動重寫會將圈內背景清為白色。請精準圈選，避開邊框與簽章。';
    el('Ai').textContent=region?'AI 修改整頁並預覽':'產生替換文字';
    el('Instruction').placeholder=region?'例如：在這一列每個空方框內加上勾，保留框線、旁邊文字及其他內容。':'辨識或改寫這段文字，只輸出替換文字。';
    providerHint();
  }
  async function runRegionAi(){
    if(!rect||!inspector)throw Error('請先框選大約要修改的位置；框選僅作定位參考');
    if(queue.length)throw Error('請先完成或移除手動修改清單，再使用 AI 整頁修改');
    if(el('Provider').value!=='gemini')throw Error('整頁圖像修改目前請選 Google Gemini；OpenAI 可用於文字草稿');
    if(!capabilities.includes('ai-full-page-edit'))throw Error('本機服務尚未載入整頁修改功能，請先匯出工作後重啟服務');
    if(!el('RegionConsent').checked)throw Error('請勾選同意傳送本頁全圖、位置與修改要求');
    if(!el('Instruction').value.trim())throw Error('請描述要修改什麼，圈選只是大致位置參考');
    const key=el('Key').value.trim();if(key&&(/[^\x21-\x7e]/.test(key)||key.startsWith('sk-')))throw Error('請使用有效的 Gemini API 金鑰');
    const started=Date.now();let accepted=false;
    const tick=()=>{const seconds=Math.floor((Date.now()-started)/1000);el('Ai').textContent=`AI 整頁修改中 · ${seconds} 秒`;aiProgress('waiting',`${accepted?'本機已接收，等待 Gemini 圖像修改':'正在送出完整頁面與參考座標'} · ${seconds} 秒。原文件尚未變更。`);};
    tick();const timer=setInterval(tick,1000);
    try{
      const job=await post(`/api/${state.id}/region-jobs`,{page,rect,revision:state.revision,key,provider:'gemini',image_model:el('ImageModel').value.trim(),instruction:el('Instruction').value,full_page_context:true,match_tone:el('MatchTone').checked});
      accepted=true;tick();
      while(Date.now()-started<180000){
        const response=await fetch(`/api/${state.id}/region-jobs/${job.id}`,{signal:AbortSignal.timeout(20000)});
        const result=await response.json();if(!response.ok||result.state==='failed')throw Error(result.error||'無法取得整頁修改狀態');
        if(result.state==='complete'){
          pending={...result.preview,kind:'full_page'};el('ShowDiff').checked=false;el('ComparePage').replaceChildren();const option=document.createElement('option');option.value=page;option.textContent=`第 ${page+1} 頁`;el('ComparePage').append(option);comparison();el('Compare').showModal();
          const notice='AI 整頁修改已完成，請核對整頁與差異標示。圈選只是位置提示，其他內容可能被連帶重畫；確認後才替換這一頁。';aiProgress('complete',notice);return notice;
        }
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
      throw Error('等待整頁修改逾時，原文件未變更，請稍後重試');
    }catch(error){aiProgress('failed',error.message+'（PDF 未變更）');throw error;}
    finally{clearInterval(timer);el('Ai').textContent='AI 修改整頁並預覽';}
  }
  async function runAi(){
    if(el('AiTask').value==='region')return runRegionAi();
    if(!rect)throw Error('請先圈選');
    if(!el('Instruction').value.trim())throw Error('請輸入辨識或修改要求');
    const started=Date.now();let accepted=false,legacy=false;
    const update=()=>{const seconds=Math.floor((Date.now()-started)/1000);el('Ai').textContent=`AI 處理中 · ${seconds} 秒`;aiProgress('waiting',legacy?`相容模式：正在送出要求並等待 AI 回應 · ${seconds} 秒。尚未修改 PDF。`:accepted?`本機服務已接收，正在等待 AI 回應 · ${seconds} 秒。尚未修改 PDF。`:`正在送出要求至本機服務 · ${seconds} 秒`);};
    update();const timer=setInterval(update,1000);
    try{
      const key=el('Key').value.trim();
      if(key&&(/[^\x21-\x7e]/.test(key)||/^bearer\s/i.test(key)||/^["']|["']$/.test(key)))throw Error('API 金鑰格式不正確：請只貼上金鑰本身，不要包含中文說明、引號、空白或 Bearer 前綴。');
      const provider=el('Provider').value;if(!supportedProviders.includes(provider))throw Error('目前背景服務尚未支援 Gemini。請先匯出工作，關閉執行 backend.py 的服務視窗，再重新啟動 start-local.bat，並重新整理介面。');
      if(provider==='gemini'&&key.startsWith('sk-'))throw Error('這看起來是 OpenAI 金鑰，請切換 OpenAI 或填入 Gemini 金鑰。');
      if(provider==='openai'&&key.startsWith('AIza'))throw Error('這看起來是 Gemini 金鑰，請將 AI 服務改為 Google Gemini。');
      const payload={page,rect,revision:state.revision,key,provider,model:el('Model').value.trim(),instruction:el('Instruction').value,vision:el('Vision').checked};
      let job;
      try{job=await post(`/api/${state.id}/ai-jobs`,payload);}catch(error){
        if(error.code!=='LEGACY_AI')throw error;
        legacy=true;update();
        const result=await post(`/api/${state.id}/ai`,payload,false,75000);
        if(typeof result.text!=='string'||!result.text.trim())throw Error('AI 沒有回傳有效文字');
        el('Text').value=result.text;
        const text=`AI 已回覆，草稿已填入「修改後文字」· 相容模式耗時 ${Math.round((Date.now()-started)/1000)} 秒。請檢查後按「預覽」→「套用修改」，PDF 才會更新。`;
        aiProgress('complete',text);el('Text').scrollIntoView({behavior:'smooth',block:'center'});el('Text').focus();
        return queue.length?text+' 請將新草稿加入修改清單後再預覽。':text;
      }
      accepted=true;update();
      while(Date.now()-started<90000){
        const response=await fetch(`/api/${state.id}/ai-jobs/${job.id}`,{signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error('無法讀取 AI 工作狀態，尚未修改 PDF。請檢查本機服務。');
        const result=await response.json();
        if(result.state==='failed')throw Error(result.error||'AI 處理失敗');
        if(result.state==='complete'){
          el('Text').value=result.text;
          const seconds=Math.round(result.elapsed??(Date.now()-started)/1000);
          const text=`AI 已回覆，草稿已填入「修改後文字」· 耗時 ${seconds} 秒。請檢查後按「預覽」→「套用修改」，PDF 才會更新。`;
          aiProgress('complete',text);el('Text').scrollIntoView({behavior:'smooth',block:'center'});el('Text').focus();
          return queue.length?text+' 目前已有修改清單，請將新草稿加入清單後再預覽。':text;
        }
        await new Promise(resolve=>setTimeout(resolve,800));
      }
      throw Error('已等待 90 秒，尚未取得結果。PDF 未變更；請檢查連線後再試。');
    }catch(error){const reason=/latin-1.*encode|UnicodeEncodeError/i.test(error.message)?'API 金鑰或伺服器環境變數含有不支援的字符。請檢查金鑰，只貼上金鑰本身；不必修改 PDF 中文內容。':error.message;const text=`AI 未完成：${reason}（未套用 PDF 修改）`;aiProgress('failed',text);throw Error(text);}
    finally{clearInterval(timer);el('Ai').textContent='產生替換文字';}
  }
  el('Ai').onclick=()=>task(runAi);
  window.addEventListener('beforeunload',e=>{if(state){e.preventDefault();e.returnValue='';}});
  async function connect(){try{if(!['127.0.0.1','localhost'].includes(location.hostname)||location.port!=='8766')throw Error('offline');const response=await fetch('/api/status');if(!response.ok)throw Error('offline');const status=await response.json();token=status.token;savedCredentials=status.credentials||{};keyStatus();capabilities=status.capabilities||[];supportedProviders=status.ai_providers||['openai'];if(status.default_models)Object.assign(providerModels,status.default_models);el('Model').value=providerModels[el('Provider').value];providerHint();el('Connection').textContent='● 本機編輯服務已連線 · 文件在本機處理，AI 功能另需連網';el('Connection').className='ed-connected';}catch{el('Connection').textContent='圈選編輯需要本機 Python 服務。請執行 start-local.bat，再開啟 http://127.0.0.1:8766。原有合併、拆分與整理功能仍可使用。';el('Connection').className='ed-disconnected';}buttons();}
  function providerHint(){const name=el('Provider').value==='gemini'?'Google Gemini':'OpenAI';el('ProviderHint').textContent=el('Action').value==='ai_region'&&el('AiTask').value==='region'?'圈選僅提示大約位置，不是硬邊界。AI 參照整頁並回傳完整頁面，請以整頁對照與差異標示核對未指定的內容。套用後該頁是圖片，其他頁面保留。圖像模型可能另有費用。':`選取文字與勾選的圖片將傳送給 ${name}。請使用此服務的 API 金鑰；模型請填入帳戶可用的代號。`;}
  el('Provider').onchange=()=>{providerKeys[activeProvider]=el('Key').value;providerModels[activeProvider]=el('Model').value;activeProvider=el('Provider').value;el('Key').value=providerKeys[activeProvider];el('Model').value=providerModels[activeProvider];el('AiProgress').hidden=true;providerHint();keyStatus();};
  function keyStatus(){
    const provider=el('Provider').value,config=savedCredentials[provider]||{},name=provider==='gemini'?'Gemini':'OpenAI';
    el('KeyStatus').textContent=config.usable?`${name} 金鑰已加密記住，可留空直接使用。${config.environment?'另有環境變數設定。':''}`:config.saved?'已保存的金鑰無法解密，請重新儲存或清除。':config.environment?`${name} 已使用本機環境變數，不必重貼。`:`${name} 尚未記住金鑰；只貼上而未按「記住」會隨頁面關閉清除。`;
    el('ClearKey').disabled=!config.saved;
  }
  async function changeKey(action){
    const provider=el('Provider').value,key=el('Key').value.trim();
    if(action==='save'&&!key){el('KeyStatus').textContent='請先貼上要記住的新金鑰。';el('Key').focus();return;}
    el('SaveKey').disabled=true;el('ClearKey').disabled=true;el('Provider').disabled=true;
    try{
      if(!savedCredentials[provider])throw Error('本機服務尚未載入金鑰保存功能，請先匯出 PDF，再重啟服務並重新整理。');
      const result=await post('/api/credentials',{action,provider,...(action==='save'?{key}:{})});
      savedCredentials=result.credentials;providerKeys[provider]='';el('Key').value='';keyStatus();
      if(action==='clear')el('KeyStatus').textContent='已清除本機記住的金鑰。'+(savedCredentials[provider]?.environment?'環境變數仍會生效，需另外移除。':'下次使用時請重新輸入。');
    }catch(error){el('KeyStatus').textContent='金鑰設定未完成：'+error.message;}
    finally{el('SaveKey').disabled=false;el('Provider').disabled=false;el('ClearKey').disabled=!savedCredentials[provider]?.saved;}
  }
  el('SaveKey').onclick=()=>changeKey('save');el('ClearKey').onclick=()=>changeKey('clear');
  el('AiTask').onchange=updateAiMode;modeHint();providerHint();updateAiMode();connect();
})();
