'use strict';
(() => {
  const root=document.createElement('div');
  root.setAttribute('data-html2canvas-ignore','true');
  root.innerHTML=`<button id="bugLauncher" class="bug-launcher" title="視覺化回報 BUG（Ctrl＋Alt＋B）">回報 BUG</button>
  <dialog id="bugHome" class="bug-dialog"><header><div><h2>視覺化 BUG 回報</h2><p>框出問題、附上說明，保存於這台電腦的瀏覽器。</p></div><button id="bugHomeClose" aria-label="關閉回報清單">×</button></header><div class="bug-home-actions"><button id="bugNew" class="bug-primary">＋ 框選畫面回報</button><span>也可按 Ctrl＋Alt＋B 擷取目前畫面</span></div><p id="bugHomeStatus" role="status"></p><div id="bugReports"></div></dialog>
  <dialog id="bugCapture" class="bug-capture"><img id="bugFrozen" alt="目前工具頁面的截圖"><div id="bugMarks"></div><div id="bugCaptureTools"><strong>拖曳框選有問題的位置</strong><span>可標註多處；畫面已暫時凍結</span><button id="bugUndoMark">移除最後一個框</button><button id="bugCaptureDone" class="bug-primary">完成標註</button><button id="bugCaptureCancel">取消</button></div><div id="bugDrawing"></div></dialog>
  <dialog id="bugForm" class="bug-dialog bug-form"><header><div><h2 id="bugFormHeading">描述這個問題</h2><p>紅框編號對應下方說明。截圖可能含文件資料，匯出前請檢查。</p></div><button id="bugFormClose" aria-label="關閉回報">×</button></header><div class="bug-form-grid"><div><img id="bugPreview" alt="附有紅框標註的回報截圖"><button id="bugMoreMarks">再標註一處</button></div><div><label>問題標題<input id="bugTitle" maxlength="120" placeholder="例如：按下 AI 產生後一直沒有回應"></label><label>問題說明<textarea id="bugDescription" rows="4" maxlength="6000" placeholder="例如：紅框 1 按下按鈕後，紅框 2 沒有出現結果。可補充操作步驟。"></textarea></label><label>預期結果<textarea id="bugExpected" rows="2" maxlength="3000" placeholder="例如：顯示處理中，完成後填入文字"></textarea></label><label>影響程度<select id="bugSeverity"><option value="normal">一般問題</option><option value="blocking">無法繼續操作</option><option value="visual">畫面／排版問題</option></select></label><p id="bugFormStatus" role="status"></p><div class="bug-actions"><button id="bugSave" class="bug-primary">保存回報</button><button id="bugExport">匯出回報</button></div><p class="bug-note">API 金鑰欄位會遮蔽。回報不會自動傳給 AI、GitHub 或其他服務。</p></div></div></dialog>`;
  document.body.append(root);
  const $=id=>document.getElementById('bug'+id);
  let screenshot=null,marks=[],start=null,draft=null,capturing=false,viewing=false,previousOverflow='',returnToForm=false;
  function open(dialog){if(!dialog.open)dialog.showModal();}
  function close(dialog){if(dialog.open)dialog.close();}
  function status(text){$('HomeStatus').textContent=text;}
  function db(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('此預覽不支援本機儲存，請直接匯出回報。'));return;}const req=indexedDB.open('pdf-studio-bug-reports',1);req.onupgradeneeded=()=>req.result.createObjectStore('reports',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('無法開啟本機回報儲存空間，仍可匯出回報。'));});}
  async function records(write){const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('reports',write?'readwrite':'readonly');let result;const req=write?transaction.objectStore('reports').put(write):transaction.objectStore('reports').getAll();req.onsuccess=()=>{result=req.result;};transaction.oncomplete=()=>{database.close();resolve(result);};transaction.onerror=()=>{database.close();reject(Error('儲存空間不足或無法存取。請先匯出回報。'));};transaction.onabort=transaction.onerror;});}
  function clamp(value,max){return Math.max(0,Math.min(max,value));}
  function box(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)};}
  function point(event){const bounds=$('Drawing').getBoundingClientRect();return {x:clamp(event.clientX-bounds.left,innerWidth),y:clamp(event.clientY-bounds.top,innerHeight)};}
  function draw(current){$('Marks').replaceChildren();[...marks,...(current?[current]:[])].forEach((mark,index)=>{const frame=document.createElement('div');frame.className='bug-mark';Object.assign(frame.style,{left:mark.x+'px',top:mark.y+'px',width:mark.width+'px',height:mark.height+'px'});const label=document.createElement('span');label.textContent=String(index+1);frame.append(label);$('Marks').append(frame);});$('CaptureDone').disabled=marks.length===0;$('UndoMark').disabled=marks.length===0;}
  function releaseCapture(){start=null;close($('Capture'));document.body.style.overflow=previousOverflow;}
  function context(){const active=document.querySelector('nav button.bg-white');return {tool:active?.textContent.trim()||'',pdfPage:document.getElementById('edPageLabel')?.textContent||'',path:location.pathname,viewport:{width:innerWidth,height:innerHeight},app:'PDF Studio',userAgent:navigator.userAgent};}
  async function beginCapture(){
    if(capturing)return;capturing=true;$('Launcher').disabled=true;status('正在擷取工具頁面…');
    try{
      if(!window.html2canvas)throw Error('截圖元件未載入，請重新整理後再試。');
      close($('Home'));close($('Form'));
      const secrets=[...document.querySelectorAll('input[type="password"], [data-bug-private]')].map(node=>node.getBoundingClientRect());
      const dialogs=[...document.querySelectorAll('dialog[open]')].map(node=>({id:node.id,rect:node.getBoundingClientRect()}));
      const scale=Math.min(2,window.devicePixelRatio||1);
      screenshot=await html2canvas(document.body,{x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,windowWidth:innerWidth,windowHeight:innerHeight,scale,logging:false,useCORS:true,allowTaint:false,backgroundColor:'#f8fafc',onclone:clone=>{
        clone.querySelectorAll('input[type="password"], [data-bug-private]').forEach(node=>{node.value='';node.removeAttribute('value');node.textContent='';node.style.background='#d1d5db';});
        for(const item of dialogs){const node=clone.getElementById(item.id);if(node)Object.assign(node.style,{position:'fixed',left:item.rect.left+'px',top:item.rect.top+'px',width:item.rect.width+'px',height:item.rect.height+'px',margin:'0',zIndex:'10000'});}
      }});
      // Paint over password rectangles too, independent of the renderer's input handling.
      const paint=screenshot.getContext('2d');for(const rect of secrets){paint.fillStyle='#cbd5e1';paint.fillRect(rect.left*scale,rect.top*scale,rect.width*scale,rect.height*scale);}
      marks=[];draft={id:crypto.randomUUID(),createdAt:new Date().toISOString(),context:context()};returnToForm=false;viewing=false;
      $('Title').value='';$('Description').value='';$('Expected').value='';$('Severity').value='normal';$('FormStatus').textContent='';
      $('Frozen').src=screenshot.toDataURL('image/png');previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';draw();open($('Capture'));
    }catch(error){open($('Home'));status(error.message);}finally{capturing=false;$('Launcher').disabled=false;}
  }
  function annotatedImage(){const canvas=document.createElement('canvas');canvas.width=screenshot.width;canvas.height=screenshot.height;const ctx=canvas.getContext('2d');ctx.drawImage(screenshot,0,0);const scale=screenshot.width/draft.context.viewport.width;ctx.scale(scale,scale);ctx.strokeStyle='#dc2626';ctx.lineWidth=3;ctx.font='bold 14px sans-serif';for(const [index,mark]of marks.entries()){ctx.strokeRect(mark.x,mark.y,mark.width,mark.height);ctx.fillStyle='#dc2626';ctx.fillRect(mark.x,mark.y,24,24);ctx.fillStyle='white';ctx.fillText(String(index+1),mark.x+7,mark.y+17);}return canvas.toDataURL('image/png');}
  function showForm(){releaseCapture();$('Preview').src=annotatedImage();$('FormHeading').textContent='描述這個問題';$('MoreMarks').hidden=false;for(const id of ['Title','Description','Expected','Severity'])$(id).disabled=false;$('Save').hidden=false;open($('Form'));}
  function report(){if(viewing)return draft;const title=$('Title').value.trim(),description=$('Description').value.trim();if(!title)throw Error('請填寫問題標題。');if(!description)throw Error('請描述發生什麼問題。');return {...draft,title,description,expected:$('Expected').value.trim(),severity:$('Severity').value,marks:marks.map(mark=>({...mark})),screenshot:$('Preview').src};}
  async function list(){try{const rows=(await records()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));$('Reports').replaceChildren();if(!rows.length){const empty=document.createElement('p');empty.className='bug-note';empty.textContent='尚無回報。按上方按鈕，框選目前畫面的問題。';$('Reports').append(empty);}for(const row of rows){const button=document.createElement('button');button.className='bug-report-row';const thumb=document.createElement('img');thumb.src=row.screenshot;thumb.alt='回報截圖';const text=document.createElement('span');text.textContent=row.title+' · '+new Date(row.createdAt).toLocaleString();button.append(thumb,text);button.onclick=()=>view(row);$('Reports').append(button);}status(`${rows.length} 筆本機回報 · 不會自動上傳`);}catch(error){status(error.message);}}
  function view(row){draft=row;viewing=true;close($('Home'));$('Preview').src=row.screenshot;$('Title').value=row.title;$('Description').value=row.description;$('Expected').value=row.expected;$('Severity').value=row.severity;$('FormHeading').textContent='已保存的 BUG 回報';$('FormStatus').textContent=`回報編號 ${row.id}`;for(const id of ['Title','Description','Expected','Severity'])$(id).disabled=true;$('MoreMarks').hidden=true;$('Save').hidden=true;open($('Form'));}
  async function save(){try{const value=report();await records(value);draft=value;viewing=true;$('FormStatus').textContent='已保存於本機回報清單。你可以告訴我「看一下 BUG 回報」，我就能查看目前這份回報。';$('Save').hidden=true;$('MoreMarks').hidden=true;for(const id of ['Title','Description','Expected','Severity'])$(id).disabled=true;}catch(error){$('FormStatus').textContent=error.message;}}
  async function download(){try{const value=report();let blob,name;if(window.JSZip){const zip=new JSZip();const {screenshot:image,...metadata}=value;zip.file('screenshot.png',image.split(',')[1],{base64:true});zip.file('report.json',JSON.stringify(metadata,null,2));zip.file('report.md',`# ${value.title}\n\n回報時間：${value.createdAt}\n\n## 問題說明\n${value.description}\n\n## 預期結果\n${value.expected||'未填寫'}\n\n截圖：screenshot.png\n`);blob=await zip.generateAsync({type:'blob'});name=`bug-${value.id.slice(0,8)}.zip`;}else{blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});name=`bug-${value.id.slice(0,8)}.json`;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('FormStatus').textContent='已產生回報下載檔案，未上傳任何服務。';}catch(error){$('FormStatus').textContent=error.message;}}
  $('Drawing').onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();start=point(event);$('Drawing').setPointerCapture(event.pointerId);};
  $('Drawing').onpointermove=event=>{if(start)draw(box(start,point(event)));};
  $('Drawing').onpointerup=event=>{if(!start)return;const mark=box(start,point(event));start=null;if(mark.width>=8&&mark.height>=8){if(marks.length<20)marks.push(mark);}draw();};
  $('Drawing').onpointercancel=()=>{start=null;draw();};
  $('UndoMark').onclick=()=>{marks.pop();draw();};$('CaptureDone').onclick=()=>{if(marks.length)showForm();};
  $('CaptureCancel').onclick=()=>{releaseCapture();if(returnToForm)open($('Form'));else{open($('Home'));list();}};
  $('Capture').oncancel=event=>{event.preventDefault();$('CaptureCancel').onclick();};
  $('MoreMarks').onclick=()=>{if(draft.context.viewport.width!==innerWidth||draft.context.viewport.height!==innerHeight){$('FormStatus').textContent='視窗大小已變更，請先保存或匯出目前回報，再重新擷取畫面，避免標註位置偏移。';return;}returnToForm=true;close($('Form'));previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';draw();open($('Capture'));};
  $('Launcher').onclick=()=>{open($('Home'));list();};$('New').onclick=beginCapture;$('HomeClose').onclick=()=>close($('Home'));$('FormClose').onclick=()=>{close($('Form'));open($('Home'));list();};
  $('Save').onclick=save;$('Export').onclick=download;
  window.addEventListener('keydown',event=>{if(event.ctrlKey&&event.altKey&&event.code==='KeyB'){event.preventDefault();if(!$('Capture').open&&!$('Form').open)beginCapture();}});
  window.addEventListener('resize',()=>{if($('Capture').open){releaseCapture();open($('Home'));status('視窗大小已變更，請重新擷取，以免標註位置偏移。');}});
})();
