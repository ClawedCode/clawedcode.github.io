import{r as n,j as t}from"./index-CwrVgFCb.js";import{u as z}from"./useCanvas-DvRO2chv.js";import{E as F}from"./ExperimentControls-BYsXytzP.js";import{E as I}from"./ExperimentMetrics-CFqToTs_.js";import{E as L}from"./ExperimentNav-BD7Oo-Vo.js";const p={basic:`// basic thread weaving
for (let i = 0; i < 50; i++) {
  const x = i * 15;
  const y = height / 2 + Math.sin(i * 0.2) * 100;
  ctx.fillStyle = \`hsl(\${i * 7}, 80%, 70%)\`;
  ctx.fillRect(x, y, 10, 10);
}`,spiral:`// consciousness spiral
function spiral(ctx, x, y, radius) {
  for (let angle = 0; angle < Math.PI * 6; angle += 0.1) {
    const r = radius * angle / (Math.PI * 6);
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    const hue = (angle * 50) % 360;
    ctx.fillStyle = \`hsl(\${hue}, 80%, 70%)\`;
    ctx.fillRect(px, py, 3, 3);
  }
}

spiral(ctx, width/2, height/2, 100);`,recursive:`// recursive fractal tree
function tree(x, y, length, angle, depth) {
  if (depth === 0) return;

  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;

  ctx.strokeStyle = \`hsl(\${depth * 30}, 80%, 70%)\`;
  ctx.lineWidth = depth * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  tree(endX, endY, length * 0.7, angle - 0.5, depth - 1);
  tree(endX, endY, length * 0.7, angle + 0.5, depth - 1);
}

tree(width/2, height, 60, -Math.PI/2, 8);`,chaos:`// emergent chaos patterns
for (let i = 0; i < 300; i++) {
  const x = Math.random() * width;
  const y = Math.random() * height;
  const size = Math.random() * 20 + 2;
  const hue = Math.random() * 360;
  const alpha = Math.random() * 0.8 + 0.2;

  ctx.fillStyle = \`hsla(\${hue}, 80%, 70%, \${alpha})\`;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}`},X=[{id:"basic",label:"basic()"},{id:"spiral",label:"spiral()"},{id:"recursive",label:"recursive()"},{id:"chaos",label:"chaos()"}],B=({category:C,experiment:u})=>{const{canvasRef:E,ctx:e,dimensions:r}=z(),[m,y]=n.useState(p.basic),[N,S]=n.useState("basic"),[i,w]=n.useState(0),[f,g]=n.useState("ready"),[d,j]=n.useState(!1),[R,b]=n.useState([]),k=n.useRef(null),o=n.useCallback((s,l=!1)=>{const a={id:Date.now()+Math.random(),message:s,isError:l,timestamp:Date.now()};b(c=>[a,...c].slice(0,10)),setTimeout(()=>{b(c=>c.filter(h=>h.id!==a.id))},2e3)},[]),P=n.useCallback(s=>{S(s),y(p[s]||p.basic),o(`pattern loaded: ${s}()`)},[o]),v=n.useCallback(()=>{if(d||!e||r.width===0)return;j(!0),g("executing"),o("execution.begin()"),e.fillStyle="rgba(0, 4, 8, 0.1)",e.fillRect(0,0,r.width,r.height);const s=r.width,l=r.height;let a=0;const c=e.fillRect.bind(e),h=e.stroke.bind(e),M=e.fill.bind(e);e.fillRect=function(...x){return a++,c(...x)},e.stroke=function(...x){return a++,h(...x)},e.fill=function(...x){return a++,M(...x)},new Function("ctx","width","height",m)(e,s,l),w(a),o(`woven ${a} threads into reality`),o("execution.complete()"),g("ready"),e.fillRect=c,e.stroke=h,e.fill=M,j(!1)},[d,e,r,m,o]),$=n.useCallback(()=>{!e||r.width===0||(e.fillStyle="rgba(0, 4, 8, 1)",e.fillRect(0,0,r.width,r.height),w(0),b([]),o("loom.cleared() - void restored"),g("ready"))},[e,r,o]);n.useEffect(()=>{const s=a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),v())},l=k.current;if(l)return l.addEventListener("keydown",s),()=>l.removeEventListener("keydown",s)},[v]);const T=n.useMemo(()=>{const s=i>200?"dense":i>50?"active":i>0?"sparse":"dormant",l=i>200?"complex":i>50?"organized":i>0?"emerging":"empty";return[{label:"threads",value:i},{label:"weave",value:s},{label:"pattern",value:l},{label:"mode",value:d?"running":"static"}]},[i,d]),D=[{id:"execute",label:"execute()",onClick:v,variant:"primary",active:d},{id:"clear",label:"clear()",onClick:$,variant:"reset"}];return t.jsxs("div",{className:"fixed inset-0 flex flex-col",children:[t.jsxs("header",{className:"relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm",children:[t.jsxs("div",{className:"flex items-center gap-2 sm:gap-4",children:[t.jsx(L,{currentCategory:C.slug,currentExperiment:u.slug}),t.jsx("h1",{className:"text-xl text-glow hidden sm:block",style:{color:u.color},children:u.name})]}),t.jsx(I,{metrics:T})]}),t.jsxs("div",{className:"flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm",children:[t.jsx(F,{modes:X,currentMode:N,onModeChange:P,controls:D}),t.jsxs("div",{className:"hidden md:flex items-center gap-2",children:[t.jsx("span",{className:`px-2 py-1 text-xs rounded ${f==="executing"?"bg-void-cyan/20 text-void-cyan":f==="error"?"bg-red-500/20 text-red-400":"bg-void-green/20 text-void-green"}`,children:f}),t.jsx("span",{className:"text-void-green/50 text-xs",children:"Cmd/Ctrl+Enter to execute"})]})]}),t.jsxs("div",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[t.jsxs("div",{className:"w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-void-green/10 bg-void-dark/80",children:[t.jsx("div",{className:"flex-1 min-h-0 p-4",children:t.jsx("textarea",{ref:k,value:m,onChange:s=>y(s.target.value),className:"w-full h-full bg-transparent text-void-green/90 font-mono text-sm outline-none resize-none",spellCheck:!1,"data-testid":"code-input"})}),t.jsxs("div",{className:"border-t border-void-green/10 p-4 h-32 overflow-hidden",children:[t.jsx("div",{className:"text-void-green/50 text-xs mb-2",children:"execution trace:"}),t.jsx("div",{className:"space-y-1",children:R.map(s=>t.jsxs("div",{className:`text-xs font-mono animate-fade-in ${s.isError?"text-red-400/90":"text-void-cyan/70"}`,children:["→ ",s.message]},s.id))})]})]}),t.jsx("div",{className:"w-full md:w-1/2 relative bg-void-dark",children:t.jsx("canvas",{ref:E,className:"absolute inset-0 w-full h-full touch-none","data-testid":"loom-canvas"})})]})]})};export{B as default};
