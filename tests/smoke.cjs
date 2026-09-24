const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ids = ['space','flat','surface-select','equation','apply','equation-error','equation-hint','slice-select','c-range','a-range','b-range','c-row','a-row','b-row','c-label','c-value','a-value','b-value','reset-view','flat-title','flat-caption','flat-metric','surface-set','plane-set','intersection-set','explanation'];
const ctx = new Proxy({setTransform(){},fillText(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},closePath(){},setLineDash(){},fillRect(){}},{get(target,key){return target[key] ?? (()=>{})}});
function element(id){return {id,value:id==='c-range'?2:id==='a-range'?.8:id==='b-range'?.4:'',min:-2,max:8,hidden:false,textContent:'',dataset:{},classList:{toggle(){},remove(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn},getContext(){return ctx},getBoundingClientRect(){return {width:500,height:400}},setAttribute(){},setPointerCapture(){},focus(){}}}
const nodes=Object.fromEntries(ids.map(id=>[id,element(id)]));
const presets=['rings','xz','yz','tilt'].map(name=>{const n=element('preset-'+name);n.dataset.preset=name;return n});
const document={getElementById(id){assert(nodes[id],id);return nodes[id]},querySelectorAll(){return presets}};
const window={devicePixelRatio:1};
const sandbox={document,window,ResizeObserver:class{observe(){}},Math,Number,console};
vm.runInNewContext(fs.readFileSync('dist/app.js','utf8'),sandbox);
const {parse,contourSegments,state}=window.__geometryExplorer;
const near=(a,b,t=.03)=>assert(Math.abs(a-b)<t,`${a} should be close to ${b}`);

near(parse('x² + y²')(1,2),5);
near(parse('-x^2 + sin(y)')(2,0),-4);
near(parse('sqrt(x^2+y^2)')(3,4),5);
assert.throws(()=>parse('process.exit()'));
assert.throws(()=>parse('2x'));

let circle=contourSegments((x,y)=>x*x+y*y-2);
assert(circle.length>100);
for(const segment of circle)for(const [x,y] of segment)near(x*x+y*y,2,.008);
assert.match(nodes['flat-title'].textContent,/Contour/);
assert.match(nodes['intersection-set'].textContent,/x² \+ y² = 2/);

nodes['c-range'].value=3;nodes['c-range'].listeners.input({target:nodes['c-range']});
assert.equal(state.c,3);assert.match(nodes['intersection-set'].textContent,/= 3/);
presets.find(p=>p.dataset.preset==='xz').listeners.click();
assert.equal(state.mode,'vertical-y');assert.equal(state.c,0);
assert.match(nodes['flat-title'].textContent,/xz-plane/);
assert.match(nodes.explanation.textContent,/z = x² \+ 0/);
presets.find(p=>p.dataset.preset==='yz').listeners.click();
assert.equal(state.mode,'vertical-x');assert.match(nodes['flat-title'].textContent,/yz-plane/);
presets.find(p=>p.dataset.preset==='tilt').listeners.click();
assert.equal(state.mode,'oblique');assert.equal(nodes['a-row'].hidden,false);
assert.match(nodes.explanation.textContent,/centred at \(0.4, 0.2\)/);

nodes.equation.value='sin(x) + cos(y)';nodes.apply.listeners.click();
assert.equal(state.kind,'custom');assert.equal(nodes['equation-error'].hidden,true);
near(state.f(0,0),1);
nodes.equation.value='alert(1)';nodes.apply.listeners.click();
assert.equal(nodes['equation-error'].hidden,false);
assert.equal(state.expr,'sin(x) + cos(y)');
nodes['surface-select'].value='flat';nodes['surface-select'].listeners.change({target:nodes['surface-select']});
assert.equal(state.mode,'vertical-x');assert.equal(state.c,0);
assert.match(nodes['surface-set'].textContent,/z = 0/);
nodes['slice-select'].value='horizontal';nodes['slice-select'].listeners.change({target:nodes['slice-select']});
nodes['c-range'].value=0;nodes['c-range'].listeners.input({target:nodes['c-range']});
assert.equal(state.c,0);

const originalYaw=state.yaw;nodes.space.listeners.pointerdown({pointerId:1,clientX:100,clientY:100});
nodes.space.listeners.pointermove({clientX:120,clientY:110});
assert(state.yaw>originalYaw);
nodes['reset-view'].listeners.click();near(state.yaw,.78,.0001);
nodes.space.listeners.wheel({preventDefault(){},deltaY:-100});assert(state.zoom>1);
console.log('Smoke checks passed: parser, contours, sliders, presets, input errors, rotation, zoom.');
