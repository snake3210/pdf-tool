const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const PDFLib=fs.existsSync('tmp/pdf-lib.min.cjs')?require('./tmp/pdf-lib.min.cjs'):require('pdf-lib');
// The VM has its own Array constructor; normalize at this test-only boundary.
const create=PDFLib.PDFDocument.create.bind(PDFLib.PDFDocument);
PDFLib.PDFDocument.create=async(...args)=>{const doc=await create(...args),copy=doc.copyPages.bind(doc);doc.copyPages=(src,indices)=>copy(src,Array.from(indices));return doc;};
const context={window:{},PDFLib};vm.createContext(context);vm.runInContext(fs.readFileSync('static/page-tools.js','utf8'),context);const tools=context.window.PageTools;
const html=fs.readFileSync('index.html','utf8');
for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
const extract=(name,next)=>html.slice(html.indexOf('    '+name),html.indexOf('    '+next,html.indexOf('    '+name)));
const fields=new Map();context.document={querySelector:()=>({value:context.mode}),getElementById:id=>fields.get(id)};
context.PageTools=tools;context.parsePageRanges=(v)=>v.split(',').flatMap(part=>{const [a,b]=part.split('-').map(Number);return Array.from({length:(b||a)-a+1},(_,i)=>a+i-1);});
vm.runInContext(extract('function splitGroups()','const splitPreview'),context);
vm.runInContext(extract('async function buildOrganizedPdf()','const organizePreview'),context);
class Card{constructor(){this.events={};this.style={};this.classList={add(){},remove(){}};}addEventListener(n,f){this.events[n]=f;}focus(){}}
(async()=>{
  const items=[1,2,3];tools.move(items,0,2);assert.deepEqual(items,[2,3,1]);
  const grid={dataset:{},querySelectorAll:()=>[],children:[],getBoundingClientRect:()=>({top:0,bottom:500})};const cards=items.map(()=>new Card());let rendered=0;cards.forEach((c,i)=>tools.draggable(c,i,items,()=>rendered++,grid));
  const transfer={setData(){}};cards[0].events.dragstart({target:{closest:()=>null},dataTransfer:transfer});cards[2].events.drop({preventDefault(){},stopPropagation(){}});assert.deepEqual(items,[3,1,2]);assert.equal(rendered,1);
  cards[0].events.keydown({altKey:true,key:'ArrowRight',preventDefault(){}});assert.deepEqual(items,[1,3,2]);
  // Multi-select moveMany & drag/keyboard reorder tests
  const m1=['A','B','C','D','E'];tools.moveMany(m1,[0,2],4,0);assert.deepEqual(m1,['B','D','E','A','C']);
  const m2=['A','B','C','D','E'];tools.moveMany(m2,[2,4],0,4);assert.deepEqual(m2,['C','E','A','B','D']);
  const m3=['A','B','C','D','E'];tools.moveMany(m3,[0,4],2,0);assert.deepEqual(m3,['B','C','A','E','D']);
  const m4=['A','B','C','D','E'];tools.moveMany(m4,[0,4],2,4);assert.deepEqual(m4,['B','A','E','C','D']);
  const m5=['A','B','C','D','E'];tools.moveMany(m5,[0,3],3,0);assert.deepEqual(m5,['B','C','A','D','E']);
  const mItems=['P1','P2','P3','P4','P5'];let selected=[0,2];let mRendered=0;
  const mCards=mItems.map(()=>new Card());
  const mGrid={dataset:{},querySelectorAll:()=>[],children:mCards,getBoundingClientRect:()=>({top:0,bottom:500})};
  const bindMulti=()=>mCards.forEach((c,i)=>tools.draggable(c,i,mItems,()=>mRendered++,mGrid,{getSelectedIndices:()=>selected}));
  bindMulti();
  // Dragging one of the selected cards moves all selected cards together
  mCards[0].events.dragstart({target:{closest:()=>null},dataTransfer:transfer});
  mCards[4].events.drop({preventDefault(){},stopPropagation(){}});
  assert.deepEqual(mItems,['P2','P4','P5','P1','P3']);assert.equal(mRendered,1);
  // Dragging an unselected card moves only that single card
  selected=[3,4];bindMulti();
  mCards[0].events.dragstart({target:{closest:()=>null},dataTransfer:transfer});
  mCards[2].events.drop({preventDefault(){},stopPropagation(){}});
  assert.deepEqual(mItems,['P4','P5','P2','P1','P3']);assert.equal(mRendered,2);
  // Keyboard Alt+ArrowLeft moves selected block left by 1
  selected=[3,4];bindMulti();
  mCards[3].events.keydown({altKey:true,key:'ArrowLeft',preventDefault(){}});
  assert.deepEqual(mItems,['P4','P5','P1','P3','P2']);assert.equal(mRendered,3);
  const source=await PDFLib.PDFDocument.create();for(let i=1;i<=4;i++){const p=source.addPage([300,420]);p.drawText('Original '+i,{x:30,y:330,size:20});p.setRotation(PDFLib.degrees((i-1)*90));}
  const bytes=await source.save();context.splitState={file:{pageCount:4,arrayBuffer:bytes},order:[4,2,1,3]};fields.set('splitRangeInput',{value:'1-4'});fields.set('splitEveryNInput',{value:'2'});
  context.mode='extract_single';assert.deepEqual(Array.from(context.splitGroups()[0].indices),[3,1,0,2]);
  context.mode='every_n';assert.deepEqual(Array.from(context.splitGroups(),g=>Array.from(g.indices)),[[3,1],[0,2]]);
  context.mode='ranges_zip';fields.set('splitRangeInput',{value:'1-2,3-4'});assert.deepEqual(Array.from(context.splitGroups(),g=>Array.from(g.indices)),[[1,0],[3,2]]);
  const options={enabled:true,start:7,skip:0,size:12,margin:24,position:'bottom-center',format:'total',cover:true};
  const out=await context.splitDocument(source,[3,1,0,2],options);fs.mkdirSync('tmp/pdfs',{recursive:true});fs.writeFileSync('tmp/pdfs/reordered-numbered.pdf',await out.save());
  for(const r of [0,90,180,270]){const layout=tools.layout(300,420,r,30,12,24,'bottom-right');assert.equal(layout.y,24);assert.ok(layout.x>0);}
  const skipped=await PDFLib.PDFDocument.create();for(let i=0;i<3;i++)skipped.addPage([300,420]);await tools.number(skipped,{...options,skip:1,format:'dash'});fs.writeFileSync('tmp/pdfs/skip-cover.pdf',await skipped.save());
  const before=await source.save();await tools.number(source,{enabled:false});assert.equal((await source.save()).length,before.length);
  await assert.rejects(()=>tools.number(skipped,{...options,skip:3}),/略過/);
  context.organizePages=[{sourceBuffer:bytes,pageIndex:2,rotation:90},{sourceBuffer:bytes,pageIndex:0,rotation:0}];const oldSettings=tools.settings;tools.settings=()=>options;const organized=await context.buildOrganizedPdf();assert.equal(organized.getPageCount(),2);assert.equal(organized.getPage(0).getRotation().angle,270);tools.settings=oldSettings;
  console.log('PASS: drag and keyboard reorder, all split group modes, actual PDF output, rotated numbering, cover skip, disabled numbering and organize export');
})().catch(e=>{console.error(e);process.exitCode=1;});
