'use strict';
(() => {
  function move(items,from,to){if(from===to||from<0||to<0||from>=items.length||to>=items.length)return;items.splice(to,0,items.splice(from,1)[0]);}
  function moveMany(items,indices,to,anchor){
    const selected=[...new Set(indices)].filter(i=>Number.isInteger(i)&&i>=0&&i<items.length).sort((a,b)=>a-b);
    if(!selected.length||to<0||to>=items.length)return -1;
    if(selected.length===1){move(items,selected[0],to);return to;}
    const set=new Set(selected);
    let insertAt=0;
    for(let i=0;i<to;i++){if(!set.has(i))insertAt++;}
    const ref=Number.isInteger(anchor)?anchor:selected[0];
    if(!set.has(to)&&ref<to)insertAt++;
    const picked=selected.map(i=>items[i]);
    const remaining=items.filter((_,i)=>!set.has(i));
    remaining.splice(insertAt,0,...picked);
    items.splice(0,items.length,...remaining);
    return insertAt;
  }
  function draggable(card,index,items,render,grid,options){
    card.draggable=true;card.tabIndex=0;card.style.cursor='grab';
    const getSelected=()=>typeof options?.getSelectedIndices==='function'?options.getSelectedIndices():[];
    card.title=options?.title||'拖曳到另一張縮圖以移動；也可按 Alt＋方向鍵';
    card.addEventListener('dragstart',e=>{
      if(e.target.closest('button,input')){e.preventDefault();return;}
      const sel=getSelected();
      const active=sel.length>1&&sel.includes(index)?sel:[index];
      grid.dataset.dragIndex=String(index);
      grid.dataset.dragIndices=active.join(',');
      e.dataTransfer.setData('text/plain',active.join(','));
      e.dataTransfer.effectAllowed='move';
      if(active.length>1){
        active.forEach(i=>grid.children[i]?.classList?.add('pt-dragging'));
        if(typeof document!=='undefined'&&document.body&&typeof e.dataTransfer.setDragImage==='function'){
          const badge=document.createElement('div');
          badge.className='pt-drag-badge';
          badge.textContent=`移動 ${active.length} 頁`;
          document.body.append(badge);
          e.dataTransfer.setDragImage(badge,18,18);
          setTimeout(()=>badge.remove(),0);
        }
      }else{
        card.style.opacity='.4';
      }
    });
    card.addEventListener('dragend',()=>{
      delete grid.dataset.dragIndex;
      delete grid.dataset.dragIndices;
      card.style.opacity='';
      grid.querySelectorAll('.pt-drop').forEach(n=>n.classList.remove('pt-drop'));
      grid.querySelectorAll('.pt-dragging').forEach(n=>n.classList.remove('pt-dragging'));
    });
    card.addEventListener('dragover',e=>{if(grid.dataset.dragIndex===undefined)return;e.preventDefault();e.dataTransfer.dropEffect='move';card.classList.add('pt-drop');const box=grid.getBoundingClientRect();if(e.clientY<box.top+45)grid.scrollTop-=18;if(e.clientY>box.bottom-45)grid.scrollTop+=18;});
    card.addEventListener('dragleave',()=>card.classList.remove('pt-drop'));
    card.addEventListener('drop',e=>{
      if(grid.dataset.dragIndex===undefined)return;
      e.preventDefault();e.stopPropagation();
      const from=Number(grid.dataset.dragIndex);
      const raw=grid.dataset.dragIndices;
      const moving=raw?raw.split(',').map(Number).filter(Number.isInteger):[from];
      delete grid.dataset.dragIndex;
      delete grid.dataset.dragIndices;
      if(moving.length>1){moveMany(items,moving,index,from);}else{move(items,from,index);}
      render();
    });
    card.addEventListener('keydown',e=>{
      if(!e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();
      const step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      const sel=getSelected();
      if(sel.length>1&&sel.includes(index)){
        const sorted=[...new Set(sel)].sort((a,b)=>a-b);
        const to=step<0?Math.max(0,sorted[0]-1):Math.min(items.length-1,sorted[sorted.length-1]+1);
        const anchor=step<0?sorted[sorted.length-1]:sorted[0];
        const pos=moveMany(items,sorted,to,anchor);
        render();
        if(pos>=0)grid.children[pos]?.focus?.();
      }else{
        const to=Math.max(0,Math.min(items.length-1,index+step));
        move(items,index,to);render();grid.children[to]?.focus?.();
      }
    });
  }
  function controls(prefix,grid){
    const box=document.createElement('details');box.className='pt-numbering';box.innerHTML=`<summary>重新編頁碼與版式</summary><div class="pt-options"><label><input id="${prefix}Enabled" type="checkbox">依輸出順序加入新頁碼</label><label>起始號碼<input id="${prefix}Start" type="number" min="1" max="999999" value="1"></label><label>略過前幾頁<input id="${prefix}Skip" type="number" min="0" value="0"></label><label>位置<select id="${prefix}Position"><option value="bottom-center">下方置中</option><option value="bottom-right">右下</option><option value="bottom-left">左下</option><option value="top-center">上方置中</option><option value="top-right">右上</option></select></label><label>樣式<select id="${prefix}Format"><option value="number">1、2、3</option><option value="total">1 / 10</option><option value="dash">- 1 -</option></select></label><label>字級<input id="${prefix}Size" type="number" min="6" max="36" value="11"></label><label>距離頁緣（pt）<input id="${prefix}Margin" type="number" min="8" max="100" value="24"></label><label><input id="${prefix}Cover" type="checkbox">在新頁碼底下加白底（可能遮住原內容）</label></div><p>頁碼依拖曳後的輸出順序產生。多檔拆分時每份重新起算。原文件內既有頁碼不會自動移除；白底僅覆蓋新頁碼附近。</p>`;
    grid.before(box);
    const preview=document.createElement('button');preview.type='button';preview.className='pt-preview';preview.textContent='預覽輸出與頁碼';box.append(preview);return preview;
  }
  function settings(prefix){const get=id=>document.getElementById(prefix+id);const o={enabled:get('Enabled').checked,start:Number(get('Start').value),skip:Number(get('Skip').value),size:Number(get('Size').value),margin:Number(get('Margin').value),position:get('Position').value,format:get('Format').value,cover:get('Cover').checked};if(o.enabled&&(!Number.isInteger(o.start)||o.start<1||o.start>999999||!Number.isInteger(o.skip)||o.skip<0||o.size<6||o.size>36||o.margin<8||o.margin>100||![o.size,o.margin].every(Number.isFinite)))throw Error('請檢查頁碼設定：起始號碼 1–999999、略過頁數非負整數、字級 6–36、距頁緣 8–100');return o;}
  function layout(width,height,rotation,textWidth,size,margin,position){
    const r=((rotation%360)+360)%360;if(![0,90,180,270].includes(r))throw Error('不支援的頁面旋轉角度');
    const w=r%180?height:width,h=r%180?width:height;
    if(textWidth+margin*2>w||size+margin*2>h)throw Error('頁面過小，請縮小字級或頁緣距離');
    const x=position.endsWith('left')?margin:position.endsWith('right')?w-margin-textWidth:(w-textWidth)/2;
    const y=position.startsWith('top')?h-margin-size:margin;
    const map=(a,b)=>r===90?[width-b,a]:r===180?[width-a,height-b]:r===270?[b,height-a]:[a,b];
    return {x,y,w,h,map,rotation:r};
  }
  async function number(doc,o){
    if(!o.enabled)return;const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);const pages=doc.getPages();
    if(o.skip>=pages.length)throw Error('略過頁數必須少於輸出頁數');
    const total=pages.length-o.skip;
    for(let i=o.skip;i<pages.length;i++){
      const n=o.start+i-o.skip,text=o.format==='total'?`${n} / ${o.start+total-1}`:o.format==='dash'?`- ${n} -`:String(n);
      const page=pages[i],crop=page.getCropBox();const p=layout(crop.width,crop.height,page.getRotation().angle,font.widthOfTextAtSize(text,o.size),o.size,o.margin,o.position);
      const at=(x,y)=>{const [a,b]=p.map(x,y);return {x:a+crop.x,y:b+crop.y};};
      if(o.cover)page.drawRectangle({...at(p.x-5,p.y-4),width:font.widthOfTextAtSize(text,o.size)+10,height:o.size+9,rotate:PDFLib.degrees(p.rotation),color:PDFLib.rgb(1,1,1)});
      page.drawText(text,{...at(p.x,p.y),size:o.size,font,color:PDFLib.rgb(.18,.18,.22),rotate:PDFLib.degrees(p.rotation)});
    }
  }
  async function preview(doc){
    const bytes=await doc.save();const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    const dialog=document.createElement('dialog');dialog.className='pt-dialog';dialog.innerHTML='<div class="pt-preview-nav"><button data-close>關閉</button><button data-prev>上一頁</button><span></span><button data-next>下一頁</button></div><p>預覽目前輸出順序與頁碼，尚未下載。拆分多檔時顯示第一份。</p><canvas></canvas>';
    document.body.append(dialog);let page=1,rendering=false;
    const show=async()=>{if(rendering)return;rendering=true;for(const b of dialog.querySelectorAll('button:not([data-close])'))b.disabled=true;try{const source=await pdf.getPage(page),base=source.getViewport({scale:1}),view=source.getViewport({scale:Math.min(1.6,900/base.width)}),canvas=dialog.querySelector('canvas');canvas.width=view.width;canvas.height=view.height;await source.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;dialog.querySelector('span').textContent=`第 ${page} / ${pdf.numPages} 頁`;}finally{rendering=false;dialog.querySelector('[data-prev]').disabled=page===1;dialog.querySelector('[data-next]').disabled=page===pdf.numPages;}};
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{pdf.destroy();dialog.remove();},{once:true});
    dialog.querySelector('[data-prev]').onclick=()=>{if(!rendering&&page>1){page--;show().catch(e=>showToast(e.message,'error'));}};
    dialog.querySelector('[data-next]').onclick=()=>{if(!rendering&&page<pdf.numPages){page++;show().catch(e=>showToast(e.message,'error'));}};
    dialog.showModal();try{await show();}catch(error){dialog.close();throw error;}
  }
  window.PageTools={move,moveMany,draggable,controls,settings,layout,number,preview};
})();
