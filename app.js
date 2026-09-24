(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = 2, N = 36;
  const eqs = {paraboloid:'x² + y²',wide:'(x² + y²) / 2',saddle:'x² − y²',tilted:'x + y',flat:'0'};
  const state = {kind:'paraboloid', expr:eqs.paraboloid, f:(x,y)=>x*x+y*y, mode:'horizontal', c:2, a:.8, b:.4, yaw:.78, pitch:.55, zoom:1, zmin:-.8, zmax:8.8, mesh:[], preset:'rings'};
  const space = $('space'), flat = $('flat');
  const fmt = n => (Math.abs(n)<.049 ? 0 : n).toFixed(1).replace(/\.0$/,'');
  const signed = n => n<0 ? ' − '+fmt(-n) : ' + '+fmt(n);
  const escapeHTML = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Small expression parser: user input is never executed as JavaScript.
  function parse(source){
    const s=source.replace(/[²³]/g,c=>c==='²'?'^2':'^3').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/π/g,'pi').replace(/\s+/g,'').toLowerCase();
    if(!s || s.length>100) throw Error('Enter an equation with at most 100 characters.');
    const tokens=s.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^]/g)||[];
    if(tokens.join('')!==s) throw Error('Use x, y, numbers, parentheses, and standard operators.');
    let pos=0; const next=()=>tokens[pos], take=c=>{if(next()===c){pos++;return true}return false};
    function primary(){
      if(take('(')){const v=sum();if(!take(')'))throw Error('Close the parenthesis.');return v}
      const t=next();if(!t)throw Error('The equation ends too soon.');pos++;
      if(/^\d|^\./.test(t)){const n=Number(t);return()=>n}
      if(t==='x')return(x)=>x;if(t==='y')return(_,y)=>y;
      if(t==='pi')return()=>Math.PI;if(t==='e')return()=>Math.E;
      const fun={sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,log:Math.log}[t];
      if(fun){if(!take('('))throw Error('Write functions with parentheses, such as sin(x).');const arg=sum();if(!take(')'))throw Error('Close the function parenthesis.');return(x,y)=>fun(arg(x,y))}
      throw Error('Unknown name “'+t+'”. Use x, y, sin, cos, sqrt, abs, exp, or log.');
    }
    function power(){const left=primary();if(take('^')){const right=unary();return(x,y)=>Math.pow(left(x,y),right(x,y))}return left}
    function unary(){if(take('+'))return unary();if(take('-')){const v=unary();return(x,y)=>-v(x,y)}return power()}
    function product(){let v=unary();while(next()==='*'||next()==='/'){const op=tokens[pos++],left=v,right=unary();v=op==='*'?(x,y)=>left(x,y)*right(x,y):(x,y)=>left(x,y)/right(x,y)}return v}
    function sum(){let v=product();while(next()==='+'||next()==='-'){const op=tokens[pos++],left=v,right=product();v=op==='+'?(x,y)=>left(x,y)+right(x,y):(x,y)=>left(x,y)-right(x,y)}return v}
    const fn=sum();if(pos!==tokens.length)throw Error('Check the operators and parentheses near “'+tokens[pos]+'”.');
    let count=0;for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(Number.isFinite(fn(-2+i,-2+j)))count++;
    if(!count)throw Error('This equation has no real values in the plotted range.');
    return fn;
  }

  function setSurface(expr,kind){
    try{const fn=parse(expr);state.f=fn;state.expr=expr.trim();state.kind=kind;$('equation-error').hidden=true;
      if(kind==='custom')$('surface-select').value='custom';
      rebuild();return true;
    }catch(e){$('equation-error').textContent=e.message;$('equation-error').hidden=false;return false}
  }
  function rebuild(){
    const mesh=[], vals=[];for(let j=0;j<=N;j++){const row=[];for(let i=0;i<=N;i++){const x=-D+2*D*i/N,y=-D+2*D*j/N,z=state.f(x,y);row.push({x,y,z});if(Number.isFinite(z)&&Math.abs(z)<40)vals.push(z)}mesh.push(row)}
    state.mesh=mesh;const min=Math.min(0,...vals),max=Math.max(0,...vals);state.zmin=Math.max(-40,min-Math.max(.7,(max-min)*.08));state.zmax=Math.min(40,max+Math.max(.7,(max-min)*.08));
    if(state.mode==='horizontal'||state.mode==='oblique'){const lo=Math.floor(state.zmin*10)/10,hi=Math.ceil(state.zmax*10)/10;$('c-range').min=lo;$('c-range').max=hi;state.c=Math.min(hi,Math.max(lo,state.c));$('c-range').value=state.c}
    update();
  }
  function updateControls(){
    const vertical=state.mode.startsWith('vertical');$('c-range').min=vertical?-2:Math.floor(state.zmin*10)/10;$('c-range').max=vertical?2:Math.ceil(state.zmax*10)/10;
    state.c=Math.max(Number($('c-range').min),Math.min(Number($('c-range').max),state.c));$('c-range').value=state.c;
    $('c-label').textContent=vertical?'Position c':'Height c';$('c-value').textContent=fmt(state.c);
    for(const name of ['a','b']){$(name+'-row').hidden=state.mode!=='oblique';$(name+'-range').value=state[name];$(name+'-value').textContent=fmt(state[name])}
    $('slice-select').value=state.mode;
  }
  function setPreset(name){
    state.preset=name;const settings={rings:['horizontal',2],xz:['vertical-y',0],yz:['vertical-x',0],tilt:['oblique',1.5]};
    [state.mode,state.c]=settings[name];if(name==='tilt'){state.a=.8;state.b=.4}
    $('surface-select').value='paraboloid';$('equation').value=eqs.paraboloid;
    document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));setSurface(eqs.paraboloid,'paraboloid');
  }
  function updateNotation(){
    const f=escapeHTML(state.expr),c=fmt(state.c),a=fmt(state.a),b=fmt(state.b),mode=state.mode;
    let plane,intersection,title,caption,explain,metric;
    if(mode==='horizontal'){
      plane=`P = {(x, y, z) ∈ ℝ³ ∣ z = ${c}}`;
      intersection=`S ∩ P = {(x, y, ${c}) ∣ ${f} = ${c}}`;
      title='Contour in the xy-plane';caption='The intersection projected straight down';metric=`z = ${c}`;
      explain=state.kind==='paraboloid'?(state.c>=0?`For this paraboloid, x² + y² = ${c}. In the xy-plane this is a circle of radius √${c} ≈ ${fmt(Math.sqrt(state.c))}.`:'This plane is below the paraboloid, so there is no real intersection.'):'The flat view keeps x and y and draws the points where the surface has the chosen height.';
    }else if(mode==='vertical-x'){
      plane=`P = {(x, y, z) ∈ ℝ³ ∣ x = ${c}}`;
      intersection=`S ∩ P = {(${c}, y, z) ∣ z = f(${c}, y)}`;
      title='Cross-section in the yz-plane';caption='Use y horizontally and z vertically';metric=`x = ${c}`;
      explain=state.kind==='paraboloid'?`Substitute x = ${c} into z = x² + y². The cross-section is z = ${fmt(state.c*state.c)} + y².`:'Hold x fixed and plot z = f(c, y) against y.';
    }else if(mode==='vertical-y'){
      plane=`P = {(x, y, z) ∈ ℝ³ ∣ y = ${c}}`;
      intersection=`S ∩ P = {(x, ${c}, z) ∣ z = f(x, ${c})}`;
      title='Cross-section in the xz-plane';caption='Use x horizontally and z vertically';metric=`y = ${c}`;
      explain=state.kind==='paraboloid'?`Substitute y = ${c} into z = x² + y². The cross-section is z = x² + ${fmt(state.c*state.c)}.`:'Hold y fixed and plot z = f(x, c) against x.';
    }else{
      const planeExpr=`${a}x${signed(state.b)}y${signed(state.c)}`;
      plane=`P = {(x, y, z) ∈ ℝ³ ∣ z = ${planeExpr}}`;
      intersection=`S ∩ P = {(x, y, z) ∣ z = ${f} = ${planeExpr}}`;
      title='Projected trace in the xy-plane';caption='The 3D intersection viewed from above';metric=`a=${a} · b=${b}`;
      if(state.kind==='paraboloid'){
        const r2=state.c+(state.a*state.a+state.b*state.b)/4;
        explain=r2>=0?`Completing the square gives (x − ${fmt(state.a/2)})² + (y − ${fmt(state.b/2)})² = ${fmt(r2)}. The tilted cut projects to a circle centred at (${fmt(state.a/2)}, ${fmt(state.b/2)}).`:'The tilted plane misses the paraboloid: its projected circle would have negative squared radius.';
      }else explain='The flat view plots the (x, y) positions where the surface height equals the tilted plane height.';
    }
    $('surface-set').textContent=`S = {(x, y, z) ∈ ℝ³ ∣ z = ${state.expr}}`;
    $('plane-set').textContent=plane;$('intersection-set').textContent=intersection;
    $('flat-title').textContent=title;$('flat-caption').textContent=caption;$('flat-metric').textContent=metric;$('explanation').textContent=explain;
    flat.setAttribute('aria-label',title+'. '+explain);
  }
  function resize(canvas){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return {ctx,w:r.width,h:r.height}}
  function project(x,y,z,w,h){
    const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
    const u=x*cy-y*sy,depth=x*sy+y*cy,zscale=4.5/(state.zmax-state.zmin),zz=(z-(state.zmin+state.zmax)/2)*zscale;
    const v=zz*cp-depth*sp,dep=depth*cp+zz*sp,scale=Math.min(w/6.7,h/6.7)*state.zoom;
    return {x:w/2+u*scale,y:h/2-v*scale,dep};
  }
  function stroke3(ctx,points,w,h,color,width,dashes=[]){ctx.beginPath();let begun=false;for(const p of points){if(!p||!Number.isFinite(p.z)||Math.abs(p.z)>40){begun=false;continue}const q=project(p.x,p.y,p.z,w,h);if(begun)ctx.lineTo(q.x,q.y);else{ctx.moveTo(q.x,q.y);begun=true}}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashes);ctx.stroke();ctx.setLineDash([])}
  function polygon(ctx,pts,color){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=color;ctx.fill()}
  function planePoint(x,y){return {x,y,z:state.a*x+state.b*y+state.c}}
  function getPlane(){const m=state.mode,c=state.c;
    if(m==='horizontal')return [{x:-D,y:-D,z:c},{x:D,y:-D,z:c},{x:D,y:D,z:c},{x:-D,y:D,z:c}];
    if(m==='vertical-x')return [{x:c,y:-D,z:state.zmin},{x:c,y:D,z:state.zmin},{x:c,y:D,z:state.zmax},{x:c,y:-D,z:state.zmax}];
    if(m==='vertical-y')return [{x:-D,y:c,z:state.zmin},{x:D,y:c,z:state.zmin},{x:D,y:c,z:state.zmax},{x:-D,y:c,z:state.zmax}];
    return [planePoint(-D,-D),planePoint(D,-D),planePoint(D,D),planePoint(-D,D)];
  }
  function diff(x,y){const z=state.f(x,y);return z-(state.mode==='horizontal'?state.c:state.a*x+state.b*y+state.c)}
  function coincident(){if(state.mode.startsWith('vertical'))return false;return [[-2,-2],[-2,2],[0,0],[2,-2],[2,2]].every(([x,y])=>Math.abs(diff(x,y))<1e-8)}
  function contourSegments(levelFn, resolution=75){
    const out=[];for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
      const x=-D+i*2*D/resolution,y=-D+j*2*D/resolution,step=2*D/resolution;
      const p=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]],v=p.map(q=>levelFn(...q));
      if(v.some(t=>!Number.isFinite(t)))continue;const cuts=[];
      for(let k=0;k<4;k++){const l=(k+1)%4;if((v[k]<0)!==(v[l]<0)){const t=v[k]/(v[k]-v[l]);cuts.push([p[k][0]+t*(p[l][0]-p[k][0]),p[k][1]+t*(p[l][1]-p[k][1])])}}
      for(let k=0;k+1<cuts.length;k+=2)out.push([cuts[k],cuts[k+1]]);
    }return out;
  }
  function drawSpace(){const {ctx,w,h}=resize(space);ctx.clearRect(0,0,w,h);
    const z0=Math.max(state.zmin,Math.min(state.zmax,0));
    for(const t of [-2,-1,0,1,2]){
      stroke3(ctx,[{x:t,y:-D,z:z0},{x:t,y:D,z:z0}],w,h,'rgba(75,121,104,.11)',1);
      stroke3(ctx,[{x:-D,y:t,z:z0},{x:D,y:t,z:z0}],w,h,'rgba(75,121,104,.11)',1);
    }
    // Painter sorting keeps the translucent slice visually inside the surface.
    const faces=[],mesh=state.mesh;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const ps=[mesh[j][i],mesh[j][i+1],mesh[j+1][i+1],mesh[j+1][i]];
      if(ps.some(p=>!Number.isFinite(p.z)||Math.abs(p.z)>40))continue;
      const qs=ps.map(p=>project(p.x,p.y,p.z,w,h)),z=ps.reduce((s,p)=>s+p.z,0)/4,t=(z-state.zmin)/(state.zmax-state.zmin);
      const light=Math.round(92-28*t),alpha=.58;
      faces.push({dep:qs.reduce((s,p)=>s+p.dep,0)/4,qs,fill:`hsla(${164+13*t}, 35%, ${light}%, ${alpha})`,edge:'rgba(35,121,102,.13)'});
    }
    const plane=getPlane(),pq=plane.map(p=>project(p.x,p.y,p.z,w,h));
    faces.push({dep:pq.reduce((s,p)=>s+p.dep,0)/4,qs:pq,fill:'rgba(234,143,112,.17)',edge:'rgba(215,111,84,.64)',plane:true});
    faces.sort((a,b)=>a.dep-b.dep);
    for(const face of faces){polygon(ctx,face.qs,face.fill);ctx.beginPath();ctx.moveTo(face.qs[0].x,face.qs[0].y);for(let i=1;i<face.qs.length;i++)ctx.lineTo(face.qs[i].x,face.qs[i].y);if(face.plane)ctx.closePath();ctx.strokeStyle=face.edge;ctx.lineWidth=face.plane?1.5:.65;ctx.stroke()}
    stroke3(ctx,[{x:-D,y:0,z:z0},{x:D+.35,y:0,z:z0}],w,h,'#778e87',1.3);
    stroke3(ctx,[{x:0,y:-D,z:z0},{x:0,y:D+.35,z:z0}],w,h,'#778e87',1.3);
    stroke3(ctx,[{x:0,y:0,z:state.zmin},{x:0,y:0,z:state.zmax+.3}],w,h,'#778e87',1.3);
    ctx.fillStyle='#476c62';ctx.font='700 12px DM Sans, sans-serif';for(const [letter,p] of [['x',{x:D+.45,y:0,z:z0}],['y',{x:0,y:D+.45,z:z0}],['z',{x:0,y:0,z:state.zmax+.48}]]){const q=project(p.x,p.y,p.z,w,h);ctx.fillText(letter,q.x,q.y)}
    ctx.strokeStyle='#e1755c';ctx.lineWidth=3.3;ctx.lineCap='round';ctx.beginPath();let count=0;
    if(state.mode.startsWith('vertical')){
      let drawing=false;for(let k=0;k<=240;k++){const t=-D+k*2*D/240,x=state.mode==='vertical-x'?state.c:t,y=state.mode==='vertical-y'?state.c:t,z=state.f(x,y);if(!Number.isFinite(z)||z<state.zmin||z>state.zmax){drawing=false;continue}const q=project(x,y,z,w,h);if(drawing)ctx.lineTo(q.x,q.y);else{ctx.moveTo(q.x,q.y);drawing=true}count++}
    }else if(coincident()){stroke3(ctx,[...getPlane(),getPlane()[0]],w,h,'#e1755c',2.5);count=1}
    else for(const segment of contourSegments(diff)){const a=segment[0],b=segment[1],za=state.f(...a),zb=state.f(...b);if(!Number.isFinite(za)||!Number.isFinite(zb)||za<state.zmin||za>state.zmax||zb<state.zmin||zb>state.zmax)continue;const p=project(...a,za,w,h),q=project(...b,zb,w,h);ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);count++}
    ctx.stroke();return count;
  }
  function grid(ctx,w,h,X,Y,xLabel,yLabel){
    ctx.clearRect(0,0,w,h);const pad={l:44,r:24,t:24,b:36},px=x=>pad.l+(x-X[0])/(X[1]-X[0])*(w-pad.l-pad.r),py=y=>h-pad.b-(y-Y[0])/(Y[1]-Y[0])*(h-pad.t-pad.b);
    ctx.font='11px DM Sans, sans-serif';ctx.textAlign='center';for(let x=Math.ceil(X[0]);x<=X[1];x++){const q=px(x);ctx.beginPath();ctx.moveTo(q,pad.t);ctx.lineTo(q,h-pad.b);ctx.strokeStyle=x===0?'#a9bdb1':'#e9eee9';ctx.lineWidth=x===0?1.3:1;ctx.stroke();ctx.fillStyle='#94a69b';ctx.fillText(String(x),q,h-16)}
    ctx.textAlign='right';for(let y=Math.ceil(Y[0]);y<=Y[1];y++){const q=py(y);ctx.beginPath();ctx.moveTo(pad.l,q);ctx.lineTo(w-pad.r,q);ctx.strokeStyle=y===0?'#a9bdb1':'#e9eee9';ctx.lineWidth=y===0?1.3:1;ctx.stroke();ctx.fillStyle='#94a69b';ctx.fillText(String(y),pad.l-9,q+3)}
    ctx.fillStyle='#547a6b';ctx.font='italic 14px Georgia, serif';ctx.textAlign='right';ctx.fillText(xLabel,w-12,h-15);ctx.textAlign='left';ctx.fillText(yLabel,10,17);
    return {px,py,pad};
  }
  function drawFlat(){const {ctx,w,h}=resize(flat),vertical=state.mode.startsWith('vertical');let count=0;
    if(vertical){const zlo=Math.floor(state.zmin),zhi=Math.ceil(state.zmax),horizontal=state.mode==='vertical-x'?'y':'x',g=grid(ctx,w,h,[-2.2,2.2],[zlo,zhi],horizontal,'z');
      const samples=[];for(let k=0;k<=320;k++){const t=-D+k*2*D/320,z=state.mode==='vertical-x'?state.f(state.c,t):state.f(t,state.c);samples.push([t,z])}
      ctx.beginPath();let drawing=false;for(const [t,z] of samples){if(!Number.isFinite(z)||z<zlo||z>zhi){drawing=false;continue}if(drawing)ctx.lineTo(g.px(t),g.py(z));else{ctx.moveTo(g.px(t),g.py(z));drawing=true}count++}ctx.strokeStyle='#e4785d';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
    }else{const g=grid(ctx,w,h,[-2.2,2.2],[-2.2,2.2],'x','y');
      if(coincident()){ctx.fillStyle='rgba(228,120,93,.15)';ctx.fillRect(g.px(-2),g.py(2),g.px(2)-g.px(-2),g.py(-2)-g.py(2));ctx.textAlign='center';ctx.fillStyle='#ae6d5b';ctx.font='700 12px DM Sans, sans-serif';ctx.fillText('Entire plane coincides',w/2,h/2);return}
      const levels=state.mode==='horizontal'?[.5,1.5,3,5]:[-1,0,1,2,3];
      ctx.strokeStyle='rgba(63,151,121,.16)';ctx.lineWidth=1;
      for(const lv of levels){ctx.beginPath();for(const [a,b] of contourSegments((x,y)=>state.f(x,y)-lv,48)){ctx.moveTo(g.px(a[0]),g.py(a[1]));ctx.lineTo(g.px(b[0]),g.py(b[1]))}ctx.stroke()}
      const segs=contourSegments(diff,90);ctx.beginPath();for(const [a,b] of segs){ctx.moveTo(g.px(a[0]),g.py(a[1]));ctx.lineTo(g.px(b[0]),g.py(b[1]))}ctx.strokeStyle='#e4785d';ctx.lineWidth=2.7;ctx.lineCap='round';ctx.stroke();count=segs.length;
      if(state.mode==='oblique'&&state.kind==='paraboloid'){const cx=state.a/2,cy=state.b/2;ctx.strokeStyle='#c26954';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(g.px(cx)-5,g.py(cy));ctx.lineTo(g.px(cx)+5,g.py(cy));ctx.moveTo(g.px(cx),g.py(cy)-5);ctx.lineTo(g.px(cx),g.py(cy)+5);ctx.stroke()}
    }
    if(!count){ctx.fillStyle='rgba(255,255,255,.93)';ctx.fillRect(w/2-105,h/2-24,210,48);ctx.textAlign='center';ctx.fillStyle='#8e675e';ctx.font='600 12px DM Sans, sans-serif';ctx.fillText('No intersection in this view',w/2,h/2+4)}
  }
  function update(){updateControls();updateNotation();drawSpace();drawFlat()}
  $('surface-select').addEventListener('change',e=>{const v=e.target.value;if(v==='custom'){$('equation').focus();return}$('equation').value=eqs[v];state.preset=null;document.querySelectorAll('.preset').forEach(b=>b.classList.remove('active'));if(v==='flat'){state.mode='vertical-x';state.c=0}setSurface(eqs[v],v)});
  $('apply').addEventListener('click',()=>{state.preset=null;document.querySelectorAll('.preset').forEach(b=>b.classList.remove('active'));setSurface($('equation').value,'custom')});
  $('equation').addEventListener('keydown',e=>{if(e.key==='Enter')$('apply').click()});
  $('slice-select').addEventListener('change',e=>{state.mode=e.target.value;if(state.mode.startsWith('vertical'))state.c=0;else state.c=Math.min(state.zmax,Math.max(state.zmin,2));document.querySelectorAll('.preset').forEach(b=>b.classList.remove('active'));update()});
  for(const n of ['c','a','b'])$(n+'-range').addEventListener('input',e=>{state[n]=Number(e.target.value);update()});
  document.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));
  $('reset-view').addEventListener('click',()=>{state.yaw=.78;state.pitch=.55;state.zoom=1;update()});
  let drag=null,pinch=0;space.addEventListener('pointerdown',e=>{space.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};});
  space.addEventListener('pointermove',e=>{if(!drag)return;state.yaw+=(e.clientX-drag.x)*.009;state.pitch=Math.max(-1.15,Math.min(1.35,state.pitch+(e.clientY-drag.y)*.007));drag={x:e.clientX,y:e.clientY};drawSpace()});
  space.addEventListener('pointerup',()=>drag=null);space.addEventListener('pointercancel',()=>drag=null);
  space.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.55,Math.min(2.5,state.zoom*Math.exp(-e.deltaY*.001)));drawSpace()},{passive:false});
  space.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')state.yaw-=.12;if(e.key==='ArrowRight')state.yaw+=.12;if(e.key==='ArrowUp')state.pitch=Math.max(-1.15,state.pitch-.1);if(e.key==='ArrowDown')state.pitch=Math.min(1.35,state.pitch+.1);if(e.key==='+'||e.key==='=')state.zoom=Math.min(2.5,state.zoom*1.12);if(e.key==='-')state.zoom=Math.max(.55,state.zoom/1.12);drawSpace()}});
  space.addEventListener('touchstart',e=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
  space.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);state.zoom=Math.max(.55,Math.min(2.5,state.zoom*d/pinch));pinch=d;drag=null;drawSpace()}},{passive:true});
  new ResizeObserver(()=>{drawSpace();drawFlat()}).observe(space);new ResizeObserver(()=>{drawSpace();drawFlat()}).observe(flat);
  rebuild();
  // Expose mathematical primitives for lightweight interaction checks.
  window.__geometryExplorer={parse,contourSegments,state,setPreset};
})();
