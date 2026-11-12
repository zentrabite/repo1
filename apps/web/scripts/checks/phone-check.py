# ZentraBite phone check
# Taps every button, clickable row and dropdown option on every demo page (two levels
# deep) in an emulated iPhone, and after each tap flags: the page wider than the screen,
# content spilling out of its box, content cut off inside a card, squashed text.
# It saves a full-page screenshot of every new state so a person can look through them.
#
# Run against a local build of apps/web:
#   cd apps/web && npx next build && npx next start --port 3127
#   pip install playwright && python3 phone-check.py 393            # CRM, super admin, ordering and app demos
#   WEB=1 python3 phone-check.py 393                                 # plus the main website pages
#   python3 phone-check.py 393 "Delivery,Orders"                     # only some CRM pages
#   SHOTS=0 python3 phone-check.py 375                               # checks only, no screenshots
# Env: BASE (default http://localhost:3127), OUT (default ./phone-check-out)
# Pages are reached by tapping in from /demo, because styles behave differently after
# tapping between pages than on a fresh load. Chat suggestion buttons are skipped so it
# never calls the AI.
import asyncio, sys, json, hashlib, os
from playwright.async_api import async_playwright
B=os.environ.get("BASE","http://localhost:3127")
W=int(sys.argv[1]) if len(sys.argv)>1 else 393
ONLY=sys.argv[2].split(",") if len(sys.argv)>2 else None
SHOTS=os.environ.get("SHOTS","1")=="1"
O=os.environ.get("OUT","phone-check-out")+f"/{W}/"; os.makedirs(O,exist_ok=True)
LIVE=["Dashboard","Orders","Fulfillment","POS","Menu","Stock","AI calls","Delivery","Drivers","Reviews","Customers","Rewards","Win-Back","Automations","Analytics","Financials","Rostering","Settings"]
CHECK=r"""()=>{
 const vw=innerWidth, probs=[];
 const sw=document.documentElement.scrollWidth; if(sw>vw+1) probs.push('PAGE WIDER THAN SCREEN sw='+sw);
 const vis=el=>{const r=el.getBoundingClientRect();return r.width>1&&r.height>1};
 const txt=el=>(el.innerText||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);
 const hiddenDrawer=el=>{const d=el.closest('#demo-sidebar,#sa-sidebar');return d&&!d.classList.contains('open')};
 const all=[...document.body.querySelectorAll('*')].filter(el=>!(el instanceof SVGElement)&&!hiddenDrawer(el));
 // 1. spilling out of its own box (ignores badges placed on purpose with position absolute)
 const spill=new Map();
 for(const el of all){const cs=getComputedStyle(el);
   if(cs.display==='inline'||cs.display==='contents'||cs.display==='none'||cs.overflowX!=='visible')continue;
   if(el.clientWidth<1||!vis(el)||el.scrollWidth<=el.clientWidth+1)continue;
   const r=el.getBoundingClientRect(); let far=0;
   for(const n of el.childNodes){
     if(n.nodeType===3&&n.textContent.trim()){const rg=document.createRange();rg.selectNodeContents(n);for(const q of rg.getClientRects())far=Math.max(far,q.right-r.right,r.left-q.left)}
     else if(n.nodeType===1){const ccs=getComputedStyle(n);if(ccs.position==='absolute'||ccs.position==='fixed'||ccs.display==='none')continue;const q=n.getBoundingClientRect();if(q.width<1)continue;far=Math.max(far,q.right-r.right,r.left-q.left)}}
   if(far>1)spill.set(el,Math.round(far))}
 for(const [el,far] of spill){ if([...spill.keys()].some(o=>o!==el&&el.contains(o)))continue;
   probs.push('SPILLS OUT OF ITS BOX by '+far+'px | '+el.tagName+' "'+txt(el)+'" w='+el.clientWidth)}
 // 2. cut off by a card that hides overflow (not a scroller)
 for(const el of all){ if(el.children.length>0&&el.tagName!=='BUTTON')continue; if(!vis(el))continue;
   const r=el.getBoundingClientRect(); let a=el.parentElement;
   while(a&&a!==document.body){const cs=getComputedStyle(a);const ox=cs.overflowX;
     if(ox==='auto'||ox==='scroll')break;
     if(ox==='hidden'||ox==='clip'){const ar=a.getBoundingClientRect(); if(ar.width>2&&(r.right>ar.right+2||r.left<ar.left-2)&&!el.closest('[aria-hidden="true"]')&&getComputedStyle(el).position!=='absolute') probs.push('CUT OFF | '+el.tagName+' "'+txt(el)+'"'); break}
     a=a.parentElement}}
 // 3. squashed text: a long word broken over lines or text boxes far too narrow
 for(const el of all){ if(!vis(el))continue; const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
   if(own.length>=8){const r=el.getBoundingClientRect(); const fs=parseFloat(getComputedStyle(el).fontSize)||14;
     if(r.width<fs*3.2 && r.height>fs*2.6) probs.push('SQUASHED TEXT | '+el.tagName+' "'+own.slice(0,30)+'" w='+Math.round(r.width))}}
 return [...new Set(probs)].slice(0,12)}"""
SIG="()=>(document.body.innerText||'').replace(/\\d+/g,'#')"
BTNS=r"""()=>{const cands=()=>{const skip=b=>b.closest('#demo-sidebar,#sa-sidebar,.demo-menu-btn,.sa-menu-btn,a[href]:not([href^="#"]),.chat-sugs,.chat-in-row');
  const vis=b=>{const r=b.getBoundingClientRect();return r.width>1&&r.height>1};
  const list=[...document.querySelectorAll('button,[role=tab],[role=button],select,summary')].filter(b=>vis(b)&&!skip(b));
  for(const el of document.querySelectorAll('div,li,tr,span,article,label')){ if(!vis(el)||skip(el)||el.closest('button,a,select,label input'))continue;
    if(getComputedStyle(el).cursor!=='pointer')continue; const p=el.parentElement; if(p&&getComputedStyle(p).cursor==='pointer')continue; list.push(el)}
  return list};
 const key=b=>(b.tagName==='SELECT'?'select:':'')+(b.tagName==='SELECT'?(b.getAttribute('aria-label')||b.name||'box'):(b.innerText||b.getAttribute('aria-label')||'')).trim().replace(/\s+/g,' ').slice(0,40);
 const seen={};return cands().map(b=>{const t=key(b);seen[t]=(seen[t]||0)+1;return [t,seen[t]-1,b.tagName==='SELECT'?b.options.length:0]})}"""
TAP=r"""([t,n,opt])=>{const cands=()=>{const skip=b=>b.closest('#demo-sidebar,#sa-sidebar,.demo-menu-btn,.sa-menu-btn,a[href]:not([href^="#"]),.chat-sugs,.chat-in-row');
  const vis=b=>{const r=b.getBoundingClientRect();return r.width>1&&r.height>1};
  const list=[...document.querySelectorAll('button,[role=tab],[role=button],select,summary')].filter(b=>vis(b)&&!skip(b));
  for(const el of document.querySelectorAll('div,li,tr,span,article,label')){ if(!vis(el)||skip(el)||el.closest('button,a,select,label input'))continue;
    if(getComputedStyle(el).cursor!=='pointer')continue; const p=el.parentElement; if(p&&getComputedStyle(p).cursor==='pointer')continue; list.push(el)}
  return list};
 const key=b=>(b.tagName==='SELECT'?'select:':'')+(b.tagName==='SELECT'?(b.getAttribute('aria-label')||b.name||'box'):(b.innerText||b.getAttribute('aria-label')||'')).trim().replace(/\s+/g,' ').slice(0,40);
 let k=0; for(const b of cands()){ if(key(b)!==t)continue; if(k++!==n)continue;
   if(b.tagName==='SELECT'){b.selectedIndex=opt;b.dispatchEvent(new Event('change',{bubbles:true}));return 'sel'}
   b.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const rr=b.getBoundingClientRect();return [rr.left+rr.width/2,rr.top+rr.height/2]} return null}"""
async def tap(pg,key):
    xy=await pg.evaluate(TAP,[key[0],key[1],key[3] if len(key)>3 else 0])
    if not xy: return False
    if xy!='sel': await pg.touchscreen.tap(xy[0],xy[1])
    await pg.wait_for_timeout(350); return True
def expand(keys):
    out=[]
    for k in keys:
        if k[2]: out+= [[k[0],k[1],k[2],o] for o in range(1,min(k[2],6))]
        else: out.append(k)
    return out
def nm(k): return k[0]+(f' option {k[3]}' if len(k)>3 else '')
def safe(s): return "".join(c if c.isalnum() else "-" for c in s)[:40]
async def run_page(ctx,label,enter,report,reset=None):
    pg=await ctx.new_page()
    await enter(pg)
    async def base():
        if reset:
            try: await reset(pg); return
            except Exception: pass
        await enter(pg)
    seen=set(); n=0
    sig=await pg.evaluate(SIG); seen.add(hashlib.md5(sig.encode()).hexdigest())
    pr=await pg.evaluate(CHECK); report.append((label,"(page as it opens)",pr))
    if SHOTS: await pg.screenshot(path=O+safe(label)+"__base.png",full_page=True)
    lvl1=expand(await pg.evaluate(BTNS))
    for k1 in lvl1[:60]:
        await base()
        if not await tap(pg,k1): continue
        s=await pg.evaluate(SIG); h=hashlib.md5(s.encode()).hexdigest()
        pr=await pg.evaluate(CHECK)
        new = h not in seen; seen.add(h)
        if pr or new: report.append((label,f"tap '{nm(k1)}'",pr))
        if new and SHOTS: n+=1; await pg.screenshot(path=O+safe(label)+f"__{n:02d}-{safe(nm(k1))}.png",full_page=True)
        if not new: continue
        # second level: buttons that appeared after this tap
        after=expand(await pg.evaluate(BTNS)); basekeys=set(map(tuple,lvl1))
        for k2 in [k for k in after if tuple(k) not in basekeys][:12]:
            await base(); await tap(pg,k1)
            if not await tap(pg,k2): continue
            s2=await pg.evaluate(SIG); h2=hashlib.md5(s2.encode()).hexdigest()
            pr=await pg.evaluate(CHECK); new2=h2 not in seen; seen.add(h2)
            if pr or new2: report.append((label,f"tap '{nm(k1)}' then '{nm(k2)}'",pr))
            if new2 and SHOTS: n+=1; await pg.screenshot(path=O+safe(label)+f"__{n:02d}-{safe(nm(k1))}--{safe(nm(k2))}.png",full_page=True)
    await pg.close()
    print("done",label,flush=True)
async def main():
    report=[]
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":W,"height":852},device_scale_factor=1,is_mobile=True,has_touch=True,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")
        sem=asyncio.Semaphore(6); jobs=[]
        async def go(*a,**k):
            async with sem:
                c=await b.new_context(viewport={"width":W,"height":852},device_scale_factor=1,is_mobile=True,has_touch=True,
                    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")
                try: await run_page(c,*a,**k)
                except Exception as e: print("ERROR",a[0],str(e)[:200],flush=True)
                await c.close()
        HREF={"Dashboard":"/demo/live","Win-Back":"/demo/live/winback","AI calls":"/demo/live/ai-calls"}
        async def side(pg,name):
            href=HREF.get(name,"/demo/live/"+name.lower())
            await pg.tap(".demo-menu-btn",timeout=4000); await pg.wait_for_timeout(250)
            await pg.tap(f"#demo-sidebar >> text='{name}'",timeout=4000)
            await pg.wait_for_function("h=>location.pathname===h",arg=href,timeout=8000)
            await pg.wait_for_timeout(500)
        for name in LIVE:
            if ONLY and name not in ONLY: continue
            async def enter(pg,name=name):
                await pg.goto(B+"/demo",wait_until="networkidle")
                await pg.tap("a[href='/demo/live']"); await pg.wait_for_url("**/demo/live"); await pg.wait_for_timeout(400)
                if name!="Dashboard": await side(pg,name)
                await pg.evaluate("scrollTo(0,0)")
            async def reset(pg,name=name):
                await pg.keyboard.press("Escape"); await pg.evaluate("scrollTo(0,0)")
                await side(pg,"Orders" if name=="Dashboard" else "Dashboard"); await side(pg,name)
                await pg.evaluate("scrollTo(0,0)")
            jobs.append(go("CRM "+name,enter,report,reset))
        for scr in ["Tenants","Platform Health","Module Catalogue"]:
            if ONLY and "SA "+scr not in ONLY: continue
            async def enter(pg,scr=scr):
                await pg.goto(B+"/demo",wait_until="networkidle")
                await pg.tap("a[href='/demo/super-admin']"); await pg.wait_for_url("**/super-admin"); await pg.wait_for_timeout(400)
                await pg.tap(".sa-menu-btn"); await pg.wait_for_timeout(250); await pg.tap(f"#sa-sidebar >> text='{scr}'"); await pg.wait_for_timeout(400)
            jobs.append(go("SA "+scr,enter,report))
        WEBPAGES=[("/","Site home"),("/features","Site features"),("/pricing","Site pricing"),("/how-it-works","Site how it works"),("/contact","Site contact"),
                  ("/features/winback","Site feature winback"),("/features/pos","Site feature pos"),("/features/ai-calls","Site feature ai calls")]
        if os.environ.get("WEB")=="1":
            for path,lab in WEBPAGES:
                if ONLY and lab not in ONLY: continue
                async def enter(pg,path=path):
                    await pg.goto(B+path,wait_until="networkidle"); await pg.wait_for_timeout(300)
                jobs.append(go(lab,enter,report))
        DEMOS=[] if os.environ.get("WEB")=="1" and os.environ.get("ONLYWEB")=="1" else [("/demo/merchant","Ordering site demo"),("/demo/app","App demo"),("/demo","Demo index")]
        for path,lab in DEMOS:
            if ONLY and lab not in ONLY: continue
            async def enter(pg,path=path):
                await pg.goto(B+"/demo",wait_until="networkidle")
                if path!="/demo":
                    await pg.tap(f"a[href='{path}']"); await pg.wait_for_url("**"+path); await pg.wait_for_timeout(500)
            jobs.append(go(lab,enter,report))
        await asyncio.gather(*jobs)
        await b.close()
    bad=[r for r in report if r[2]]
    print(f"width {W}: {len(report)} states checked, {len(bad)} with problems")
    for lab,st,pr in bad:
        print(f"- {lab} / {st}"); [print("     ",x[:150]) for x in pr]
    json.dump(report,open(O+"report.json","w"),indent=1)
asyncio.run(main())
