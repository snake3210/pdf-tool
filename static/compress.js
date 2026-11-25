'use strict';
(() => {
  const panel=document.createElement('section');panel.id='viewCompress';panel.className='hidden';
  panel.innerHTML=`<div class="ed-card"><h2>壓縮 PDF</h2><p>在本機縮小檔案，保留文字與頁面。標準及高壓縮會降低圖片品質。</p><label>選擇 PDF<input id="cpFile" type="file" accept="application/pdf,.pdf"></label><label>壓縮程度<select id="cpLevel"><option value="lossless">無損：整理檔案結構，保留圖片品質</option><option value="standard" selected>標準：圖片 150 DPI，品質 75</option><option value="strong">高壓縮：圖片 96 DPI，品質 50</option></select></label><p class="ed-hint">已壓縮的 PDF 可能無法再縮小。數位簽章可能失效，請保留原檔。</p><button id="cpRun" class="ed-primary">開始壓縮</button><p id="cpStatus" role="status" aria-live="polite"></p><a id="cpDownload" class="ed-primary" hidden>下載壓縮 PDF</a></div>`;
  document.querySelector('main').append(panel);
  const get=id=>document.getElementById('cp'+id);let url=null;
  const clear=()=>{if(url)URL.revokeObjectURL(url);url=null;get('Download').hidden=true;get('Status').textContent='';};
  get('File').onchange=clear;get('Level').onchange=clear;
  get('Run').onclick=async()=>{
    clear();const file=get('File').files[0];if(!file){get('Status').textContent='請先選擇 PDF';return;}
    if(file.size>100*1024*1024){get('Status').textContent='檔案不可超過 100 MB';return;}
    for(const id of ['Run','File','Level'])get(id).disabled=true;
    get('Status').textContent='本機壓縮中，請稍候…';
    try{
      const status=await fetch('/api/status');if(!status.ok)throw Error('請先啟動新版 start-local.bat');
      const {token}=await status.json();const form=new FormData();form.append('file',file);form.append('level',get('Level').value);
      const response=await fetch('/api/compress',{method:'POST',headers:{'X-Workshop-Token':token},body:form,signal:AbortSignal.timeout(180000)});
      if(!response.ok){const error=await response.json();throw Error(error.error||'壓縮失敗');}
      const blob=await response.blob();url=URL.createObjectURL(blob);
      const link=get('Download');link.href=url;link.download=file.name.replace(/\.pdf$/i,'')+'_compressed.pdf';link.hidden=false;
      const size=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB';
      const saved=Math.max(0,(1-blob.size/file.size)*100);
      get('Status').textContent=`完成：${size(file.size)} → ${size(blob.size)}，減少 ${saved.toFixed(1)}%。${saved===0?'此檔案已相當精簡，保留原檔大小。':''} 請下載並檢查圖片清晰度。`;
    }catch(error){get('Status').textContent='壓縮未完成：'+error.message;}
    finally{for(const id of ['Run','File','Level'])get(id).disabled=false;}
  };
})();
