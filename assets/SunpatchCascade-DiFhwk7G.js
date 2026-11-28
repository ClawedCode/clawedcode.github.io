import{r as y,j as e}from"./react-vendor-CDf3ejbn.js";import{E as ft}from"./ExperimentNav-CnNg04no.js";import"./experiments-Cg5bfFKx.js";import"./router-vendor-B-nFvpNu.js";const at=`
struct Lamp { pos: vec2<f32>, radius: f32, on: f32, color: vec4<f32> }
`,ht=at+`
struct Params { size: vec2<u32>, lampCount: u32, bounce: f32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> lamps: array<Lamp>;
@group(0) @binding(2) var paintTex: texture_2d<f32>;
@group(0) @binding(3) var irrTex: texture_2d<f32>;
@group(0) @binding(4) var sceneOut: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  let fp = vec2<f32>(id.xy) + 0.5;
  for (var i = 0u; i < P.lampCount; i++) {
    let L = lamps[i];
    if (L.on > 0.5 && distance(fp, L.pos) <= L.radius) {
      textureStore(sceneOut, p, vec4<f32>(L.color.rgb, 1.0));
      return;
    }
  }
  let paint = textureLoad(paintTex, p, 0);
  if (paint.a < 0.5) {
    textureStore(sceneOut, p, vec4<f32>(0.0));
    return;
  }
  // Face pixels gather from air 3 px away. Pixels deeper in a thick wall reach
  // 8 px for the nearest face's light: rays never see them (they stop at the
  // face), so this only lets the display show a lit wall instead of a black one.
  let hi = vec2<i32>(P.size) - 1;
  var sum = vec3<f32>(0.0);
  var n = 0.0;
  for (var ring = 0; ring < 2 && n == 0.0; ring++) {
    let reach = select(8.0, 3.0, ring == 0);
    for (var k = 0; k < 8; k++) {
      let a = f32(k) * 0.7853982;
      let q = clamp(p + vec2<i32>(round(vec2<f32>(cos(a), sin(a)) * reach)), vec2<i32>(0), hi);
      let s = textureLoad(irrTex, q, 0);
      if (s.a > 0.5) { sum += s.rgb; n += 1.0; }
    }
  }
  var e = vec3<f32>(0.0);
  if (n > 0.0) { e = min(paint.rgb * (sum / n) * P.bounce, vec3<f32>(6.0)); }
  textureStore(sceneOut, p, vec4<f32>(e, 1.0));
}
`,mt=`
struct Params { size: vec2<u32>, step: i32, pad: i32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var sceneTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  var seed = vec2<f32>(-1000.0);
  if (textureLoad(sceneTex, p, 0).a > 0.5) { seed = vec2<f32>(id.xy) + 0.5; }
  textureStore(outTex, p, vec4<f32>(seed, 0.0, 1.0));
}
`,xt=`
struct Params { size: vec2<u32>, step: i32, pad: i32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var inTex: texture_2d<f32>;
@group(0) @binding(2) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  let fp = vec2<f32>(id.xy) + 0.5;
  let hi = vec2<i32>(P.size) - 1;
  var best = textureLoad(inTex, p, 0).xy;
  var bestD = distance(fp, best);
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let q = p + vec2<i32>(dx, dy) * P.step;
      if (any(q < vec2<i32>(0)) || any(q > hi)) { continue; }
      let s = textureLoad(inTex, q, 0).xy;
      if (s.x < -500.0) { continue; }
      let d = distance(fp, s);
      if (d < bestD) { best = s; bestD = d; }
    }
  }
  textureStore(outTex, p, vec4<f32>(best, 0.0, 1.0));
}
`,gt=`
struct Params { size: vec2<u32>, level: u32, levels: u32, base: f32, writeDebug: u32, pad0: u32, pad1: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var sceneTex: texture_2d<f32>;
@group(0) @binding(2) var seedTex: texture_2d<f32>;
@group(0) @binding(3) var upperTex: texture_2d<f32>;
@group(0) @binding(4) var outTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(5) var debugTex: texture_storage_2d<rgba16float, write>;

fn march(origin: vec2<f32>, dir: vec2<f32>, t0: f32, t1: f32) -> vec4<f32> {
  let sz = vec2<f32>(P.size);
  var t = t0;
  for (var i = 0; i < 48; i++) {
    let pos = origin + dir * t;
    if (pos.x < 0.0 || pos.y < 0.0 || pos.x >= sz.x || pos.y >= sz.y) { return vec4<f32>(0.0); }
    let ip = vec2<i32>(pos);
    let s = textureLoad(sceneTex, ip, 0);
    if (s.a > 0.5) { return vec4<f32>(s.rgb, 0.0); }
    let seed = textureLoad(seedTex, ip, 0).xy;
    t += max(distance(pos, seed) - 0.5, 0.5);
    if (t >= t1) { break; }
  }
  return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}

fn probeCount(level: u32) -> vec2<u32> {
  let span = (1u << level) - 1u;
  return (P.size + vec2<u32>(span)) >> vec2<u32>(level);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let level = P.level;
  let raysDim = 2u << level;
  let probes = probeCount(level);
  if (id.x >= probes.x * raysDim || id.y >= probes.y * raysDim) { return; }
  let probe = id.xy / raysDim;
  let rc = id.xy % raysDim;
  let rayIndex = rc.y * raysDim + rc.x;
  let rayCount = raysDim * raysDim;
  let angle = (f32(rayIndex) + 0.5) / f32(rayCount) * 6.2831853;
  let dir = vec2<f32>(cos(angle), sin(angle));
  let spacing = f32(1u << level);
  let origin = (vec2<f32>(probe) + 0.5) * spacing;
  let pw = pow(4.0, f32(level));
  let t0 = P.base * (pw - 1.0) / 3.0;
  let t1 = P.base * (pw * 4.0 - 1.0) / 3.0;
  var rad = march(origin, dir, t0, t1);
  if (rad.a > 0.0 && level + 1u < P.levels) {
    let uraysDim = raysDim * 2u;
    let uprobes = probeCount(level + 1u);
    let u = origin / (spacing * 2.0) - 0.5;
    let b = floor(u);
    let f = u - b;
    var acc = vec4<f32>(0.0);
    for (var c = 0u; c < 4u; c++) {
      let off = vec2<f32>(f32(c & 1u), f32(c >> 1u));
      let q = vec2<u32>(clamp(b + off, vec2<f32>(0.0), vec2<f32>(uprobes) - 1.0));
      let w = mix(1.0 - f.x, f.x, off.x) * mix(1.0 - f.y, f.y, off.y);
      var s = vec4<f32>(0.0);
      for (var k = 0u; k < 4u; k++) {
        let ur = rayIndex * 4u + k;
        s += textureLoad(upperTex, vec2<i32>(q * uraysDim + vec2<u32>(ur % uraysDim, ur / uraysDim)), 0);
      }
      acc += s * (0.25 * w);
    }
    rad = vec4<f32>(rad.rgb + rad.a * acc.rgb, rad.a * acc.a);
  }
  textureStore(outTex, vec2<i32>(id.xy), rad);
  if (P.writeDebug == 1u) { textureStore(debugTex, vec2<i32>(id.xy), rad); }
}
`,yt=`
struct Params { size: vec2<u32>, pad0: u32, pad1: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var c0: texture_2d<f32>;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var outTex: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.size.x || id.y >= P.size.y) { return; }
  let p = vec2<i32>(id.xy);
  if (textureLoad(sceneTex, p, 0).a > 0.5) {
    textureStore(outTex, p, vec4<f32>(0.0));
    return;
  }
  let o = p * 2;
  let sum = textureLoad(c0, o, 0).rgb + textureLoad(c0, o + vec2<i32>(1, 0), 0).rgb
    + textureLoad(c0, o + vec2<i32>(0, 1), 0).rgb + textureLoad(c0, o + vec2<i32>(1, 1), 0).rgb;
  textureStore(outTex, p, vec4<f32>(sum * 0.25, 1.0));
}
`,vt=`
struct Probe { pos: vec2<f32>, radius: f32, pad: f32 }
struct Params { count: u32, pad0: u32, pad1: u32, pad2: u32 }
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read> probes: array<Probe>;
@group(0) @binding(2) var irrTex: texture_2d<f32>;
@group(0) @binding(3) var<storage, read_write> outBuf: array<vec4<f32>>;

@compute @workgroup_size(16)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= P.count) { return; }
  let pr = probes[id.x];
  let dims = vec2<i32>(textureDimensions(irrTex));
  var sum = vec3<f32>(0.0);
  var n = 0.0;
  for (var y = -2; y <= 2; y++) {
    for (var x = -2; x <= 2; x++) {
      let q = vec2<i32>(pr.pos + vec2<f32>(f32(x), f32(y)) * (pr.radius * 0.5));
      if (any(q < vec2<i32>(0)) || any(q >= dims)) { continue; }
      let s = textureLoad(irrTex, q, 0);
      if (s.a > 0.5) { sum += s.rgb; n += 1.0; }
    }
  }
  outBuf[id.x] = vec4<f32>(select(vec3<f32>(0.0), sum / n, n > 0.0), n);
}
`,bt=at+`
struct Params {
  scene: vec2<f32>, mode: u32, lampCount: u32,
  exposure: f32, bounce: f32, xray: f32, time: f32,
  debugScale: vec2<f32>
}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var irrTex: texture_2d<f32>;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var paintTex: texture_2d<f32>;
@group(0) @binding(4) var debugTex: texture_2d<f32>;
@group(0) @binding(5) var samp: sampler;
@group(0) @binding(6) var<storage, read> lamps: array<Lamp>;

struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var xy = array<vec2<f32>, 3>(vec2<f32>(-1.0, -3.0), vec2<f32>(-1.0, 1.0), vec2<f32>(3.0, 1.0));
  var o: VOut;
  o.pos = vec4<f32>(xy[i], 0.0, 1.0);
  o.uv = vec2<f32>(xy[i].x * 0.5 + 0.5, 0.5 - xy[i].y * 0.5);
  return o;
}

fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn floorAlbedo(sp: vec2<f32>) -> vec3<f32> {
  let tile = floor(sp / 25.0);
  let local = fract(sp / 25.0);
  let grout = smoothstep(0.0, 0.06, local.x) * smoothstep(0.0, 0.06, local.y);
  let v = 0.78 + 0.16 * hash(tile) + 0.05 * (hash(floor(sp * 0.5)) - 0.5);
  return vec3<f32>(0.62, 0.55, 0.48) * v * mix(0.55, 1.0, grout);
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  let sp = in.uv * P.scene;
  let irr = textureSampleLevel(irrTex, samp, in.uv, 0.0).rgb;
  let paint = textureSampleLevel(paintTex, samp, in.uv, 0.0);
  let wallLight = textureSampleLevel(sceneTex, samp, in.uv, 0.0).rgb;
  var col = floorAlbedo(sp) * irr;
  let wall = smoothstep(0.35, 0.65, paint.a);
  let paintRgb = paint.rgb / max(paint.a, 0.001);
  let wallCol = wallLight / max(P.bounce, 0.001) * mix(vec3<f32>(1.0), paintRgb, 0.15) + paintRgb * 0.012;
  col = mix(col, wallCol, wall);
  for (var i = 0u; i < P.lampCount; i++) {
    let L = lamps[i];
    let d = distance(sp, L.pos);
    let ring = 1.0 - smoothstep(L.radius - 0.6, L.radius + 0.6, d);
    let lit = select(L.color.rgb * 0.02, L.color.rgb, L.on > 0.5);
    col = mix(col, lit, ring);
  }
  if (P.mode == 1u) {
    let dbg = textureSampleLevel(debugTex, samp, in.uv * P.debugScale, 0.0).rgb;
    col = mix(col, dbg, P.xray);
  }
  var mapped = vec3<f32>(1.0) - exp(-col * P.exposure);
  let vig = 1.0 - 0.35 * pow(length(in.uv - 0.5) * 1.3, 2.2);
  mapped = mapped * vig;
  mapped = pow(max(mapped, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2));
  mapped += (hash(in.pos.xy + P.time) - 0.5) / 255.0;
  return vec4<f32>(mapped, 1.0);
}
`,ze=400,Fe=500,Ae=8,be=16,We=1,pe="rgba16float";class qe extends Error{}const rt=(s=ze,n=Fe,o=We)=>{const r=Math.hypot(s,n);let l=1;for(;o*(4**l-1)/3<r;)l+=1;return l},nt=(s,n=We)=>({level:s,spacing:2**s,rays:4**(s+1),start:n*(4**s-1)/3,end:n*(4**(s+1)-1)/3}),ce=(s,n)=>Math.ceil(s/2**n);async function wt(s,{onLost:n}={}){if(!navigator.gpu)throw new qe("This browser has no WebGPU.");const o=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!o)throw new qe("WebGPU is present but no GPU adapter was offered.");const r=await o.requestDevice();let l=!0;r.lost.then(c=>{l&&c.reason!=="destroyed"&&n?.(c.message||"GPU device lost")});const p=s.getContext("webgpu"),M=navigator.gpu.getPreferredCanvasFormat();p.configure({device:r,format:M,alphaMode:"opaque"});const f=ze,m=Fe,N=rt(f,m);let h=0,b=0;for(let c=0;c<N;c++)h=Math.max(h,ce(f,c)*2**(c+1)),b=Math.max(b,ce(m,c)*2**(c+1));const g=GPUTextureUsage.TEXTURE_BINDING,k=GPUTextureUsage.STORAGE_BINDING,j=(c,i,x,S)=>r.createTexture({size:[c,i],format:x,usage:S}),A=j(f,m,"rgba8unorm",g|GPUTextureUsage.COPY_DST),E=j(f,m,pe,g|k),$=j(f,m,pe,g|k),R=[j(f,m,pe,g|k),j(f,m,pe,g|k)],ae=[j(h,b,pe,g|k),j(h,b,pe,g|k)],v=j(h,b,pe,g|k),_=(c,i)=>r.createBuffer({size:c,usage:i}),V=GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,G=_(Ae*32,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),he=_(be*16,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),we=_(be*16,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),le=_(be*16,GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST),H=_(16,V),ke=_(16,V),K=_(16,V),ue=_(48,V),z=c=>r.createComputePipeline({layout:"auto",compute:{module:r.createShaderModule({code:c}),entryPoint:"main"}}),re=z(ht),J=z(mt),me=z(xt),Q=z(gt),xe=z(yt),U=z(vt),je=r.createShaderModule({code:bt}),Pe=r.createRenderPipeline({layout:"auto",vertex:{module:je,entryPoint:"vs"},fragment:{module:je,entryPoint:"fs",targets:[{format:M}]},primitive:{topology:"triangle-list"}}),Le=r.createSampler({magFilter:"linear",minFilter:"linear"}),Z=(c,i,x=0)=>r.createBindGroup({layout:c.getBindGroupLayout(x),entries:i.map((S,I)=>({binding:I,resource:S instanceof GPUTexture?S.createView():S}))}),de=Z(re,[{buffer:H},{buffer:G},A,$,E]),B=_(16,V);r.queue.writeBuffer(B,0,new Int32Array([f,m,0,0]));const Ce=Z(J,[{buffer:B},E,R[0]]),Y=[];let ee=0;for(let c=2**Math.ceil(Math.log2(Math.max(f,m)))/2;c>=1;c/=2){const i=_(16,V);r.queue.writeBuffer(i,0,new Int32Array([f,m,c,0])),Y.push(Z(me,[{buffer:i},R[ee],R[1-ee]])),ee=1-ee}const Ue=R[ee],ge=[],te=[];for(let c=0;c<N;c++){const i=_(32,V);ge.push(i);const x=ae[c%2],S=ae[(c+1)%2];te.push(Z(Q,[{buffer:i},E,Ue,S,x,v]))}const Me=c=>{for(let i=0;i<N;i++){const x=new ArrayBuffer(32),S=new Uint32Array(x),I=new Float32Array(x);S[0]=f,S[1]=m,S[2]=i,S[3]=N,I[4]=We,S[5]=i===c?1:0,r.queue.writeBuffer(ge[i],0,x)}};r.queue.writeBuffer(ke,0,new Uint32Array([f,m,0,0]));const Ge=Z(xe,[{buffer:ke},ae[0],E,$]),De=Z(U,[{buffer:K},{buffer:he},$,{buffer:we}]),ne=Z(Pe,[{buffer:ue},$,E,A,v,Le,{buffer:G}]),w={lampCount:0,probeCount:0,bounce:1.3,exposure:2,xray:0,debugLevel:-1,pending:0,displayDirty:!0,reading:!1,measureStale:!1,time:0};Me(-1);const ye=()=>{const c=new ArrayBuffer(16);new Uint32Array(c,0,3).set([f,m,w.lampCount]),new Float32Array(c,12,1)[0]=w.bounce,r.queue.writeBuffer(H,0,c)};ye();let oe=null;const F=c=>Math.ceil(c/8);function ve(c){const i=c.beginComputePass();i.setPipeline(re),i.setBindGroup(0,de),i.dispatchWorkgroups(F(f),F(m)),i.setPipeline(J),i.setBindGroup(0,Ce),i.dispatchWorkgroups(F(f),F(m)),i.setPipeline(me);for(const x of Y)i.setBindGroup(0,x),i.dispatchWorkgroups(F(f),F(m));i.setPipeline(Q);for(let x=N-1;x>=0;x--)i.setBindGroup(0,te[x]),i.dispatchWorkgroups(F(ce(f,x)*2**(x+1)),F(ce(m,x)*2**(x+1)));i.setPipeline(xe),i.setBindGroup(0,Ge),i.dispatchWorkgroups(F(f),F(m)),i.end()}function Re(c){const i=c.beginComputePass();i.setPipeline(U),i.setBindGroup(0,De),i.dispatchWorkgroups(1),i.end(),c.copyBufferToBuffer(we,0,le,0,w.probeCount*16)}function Oe(c){const i=new ArrayBuffer(48),x=new Float32Array(i),S=new Uint32Array(i);if(x[0]=f,x[1]=m,S[2]=w.debugLevel>=0&&w.xray>0?1:0,S[3]=w.lampCount,x[4]=w.exposure,x[5]=w.bounce,x[6]=w.xray,x[7]=w.time,w.debugLevel>=0){const X=w.debugLevel;x[8]=ce(f,X)*2**(X+1)/h,x[9]=ce(m,X)*2**(X+1)/b}r.queue.writeBuffer(ue,0,i);const I=c.beginRenderPass({colorAttachments:[{view:p.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:1}}]});I.setPipeline(Pe),I.setBindGroup(0,ne),I.draw(3),I.end()}return{levels:N,width:f,height:m,raysPerFrame:Array.from({length:N},(c,i)=>ce(f,i)*ce(m,i)*4**(i+1)).reduce((c,i)=>c+i,0),setPaint(c){r.queue.writeTexture({texture:A},c,{bytesPerRow:f*4},[f,m]),this.invalidate()},setLamps(c){const i=new Float32Array(Ae*8);c.slice(0,Ae).forEach((x,S)=>{i.set([x.x,x.y,x.radius,x.on===!1?0:1,x.color[0]*x.power,x.color[1]*x.power,x.color[2]*x.power,1],S*8)}),r.queue.writeBuffer(G,0,i),w.lampCount=Math.min(c.length,Ae),ye(),this.invalidate()},setProbes(c){const i=new Float32Array(be*4);c.slice(0,be).forEach((x,S)=>i.set([x.x,x.y,x.radius||8,0],S*4)),r.queue.writeBuffer(he,0,i),w.probeCount=Math.min(c.length,be),r.queue.writeBuffer(K,0,new Uint32Array([w.probeCount,0,0,0])),this.invalidate()},setView({xray:c,debugLevel:i}={}){c!==void 0&&(w.xray=c),i!==void 0&&i!==w.debugLevel&&(w.debugLevel=i,Me(i),this.invalidate(1)),w.displayDirty=!0},onMeasure(c){oe=c},invalidate(c=24){w.pending=Math.max(w.pending,c),w.displayDirty=!0},frame(c=0){if(!l)return!1;w.time=c%1e3;const i=w.pending>0;i&&(w.measureStale=!0);const x=w.measureStale&&w.probeCount>0&&!w.reading;if(!i&&!w.displayDirty&&!x)return!1;const S=r.createCommandEncoder();if(i&&(ve(S),w.pending-=1),x&&(Re(S),w.measureStale=!1),(i||w.displayDirty)&&Oe(S),r.queue.submit([S.finish()]),w.displayDirty=!1,x){w.reading=!0;const I=w.probeCount;le.mapAsync(GPUMapMode.READ).then(()=>{if(!l)return;const X=new Float32Array(le.getMappedRange().slice(0,I*16));le.unmap(),w.reading=!1;const Ee=Array.from({length:I},(Ze,Te)=>[X[Te*4],X[Te*4+1],X[Te*4+2]]);oe?.(Ee,w.pending===0&&!w.measureStale)}).catch(()=>{w.reading=!1})}return!0},destroy(){l=!1;try{p.unconfigure()}catch{}r.destroy()}}}const O=ze,q=Fe,se={soot:{id:"soot",key:"1",label:"Soot",albedo:[.035,.03,.03],swatch:"#221c18",note:"drinks light, throws clean shadow"},chalk:{id:"chalk",key:"2",label:"Chalk",albedo:[.9,.87,.82],swatch:"#ece6da",note:"throws light back round corners"},rose:{id:"rose",key:"3",label:"Rose",albedo:[.92,.34,.22],swatch:"#e2654c",note:"gives back only the warm part"},tide:{id:"tide",key:"4",label:"Tide",albedo:[.12,.5,.92],swatch:"#3d8fe0",note:"gives back only the cool part"}},Ve=["soot","chalk","rose","tide"],kt=Object.fromEntries(Ve.map((s,n)=>[s,n+1])),_e={amber:{id:"amber",label:"Amber",color:[1,.6,.26],power:22,swatch:"#ffb15a"},moon:{id:"moon",label:"Moon",color:[.36,.62,1],power:22,swatch:"#86b4ff"},rose:{id:"rose",label:"Ember",color:[1,.32,.22],power:22,swatch:"#ff7a5c"},white:{id:"white",label:"Bulb",color:[1,.94,.86],power:20,swatch:"#fff2dc"}},jt=7,ot=6,Pt=17,P=(s,n,o,r,l="stone")=>({x:s,y:n,w:o,h:r,pigment:l}),Mt=[.2,.17,.15],W=[{id:"first-patch",title:"the first patch",brief:"one lamp, one cat, and a hush asleep behind the shelf. light pools wherever nothing stops it. drag the lamp until the cat's ring closes, and keep the hush in the dark.",lesson:"Radiance travels in straight lines until something stops it. The shelf is an occluder, and its shadow edge goes soft because the lamp is a disc rather than a point.",walls:[P(40,70,130,34),P(282,190,22,170),P(0,0,400,8),P(0,492,400,8),P(0,0,8,500),P(392,0,8,500)],lamps:[{kind:"amber",x:330,y:150}],pigments:[],ink:0,creatures:[{id:"cat-a",kind:"cat",name:"Tarn",x:120,y:360,want:"warm",need:22,fur:"#cfa27a"},{id:"hush",kind:"hush",x:345,y:300,limit:6}]},{id:"soot-wall",title:"a wall of soot",brief:"the hush sleeps an arm's length from the cat, on open floor. there's only one lamp. paint soot between them and the shadow will do the rest. you have a little ink.",lesson:"Painted pixels become occluders on the next frame. The distance field is rebuilt by jump flooding in nine passes, so a new wall changes every ray at once.",walls:[P(0,0,400,8),P(0,492,400,8),P(0,0,8,500),P(392,0,8,500),P(186,40,28,60),P(186,400,28,60)],lamps:[{kind:"amber",x:200,y:250}],pigments:["soot"],ink:2600,creatures:[{id:"cat-a",kind:"cat",name:"Wisp",x:110,y:250,want:"warm",need:24,fur:"#9a8f86"},{id:"hush",kind:"hush",x:300,y:250,limit:7}]},{id:"round-the-corner",title:"round the corner",brief:"the lamp has to stay in the cellar, behind the partition. no straight line reaches the cat. paint chalk where the light lands, and let it throw the light on for you.",lesson:"Walls re-emit the light that reached them on the previous frame, scaled by their albedo. Run that every frame and one bounce becomes many. Chalk gives back most of it and soot almost none.",walls:[P(0,0,400,8),P(0,492,400,8),P(0,0,8,500),P(392,0,8,500),P(8,236,300,16),P(8,120,120,14),P(128,120,14,64)],lamps:[{kind:"amber",x:250,y:400}],lampPower:1.6,lampZone:{x:20,y:270,w:360,h:210},pigments:["chalk","soot"],ink:3200,creatures:[{id:"cat-a",kind:"cat",name:"Ossa",x:62,y:195,want:"warm",need:7,fur:"#e2c8a4"},{id:"hush",kind:"hush",x:60,y:60,limit:8}]},{id:"two-moods",title:"two moods",brief:"Ember wants warm light and Sleet wants moonlight, and each one sulks in the other's colour. both lamps have to sit on the shelf between them. keep the pools apart, and don't wake the hush upstairs.",lesson:"Every ray carries colour, and the cats read the mix. Where amber and moonlight overlap, neither cat sleeps. Rose and tide walls bounce only part of the spectrum, so a wall can also tint the light it throws.",walls:[P(0,0,400,8),P(0,492,400,8),P(0,0,8,500),P(392,0,8,500),P(140,230,120,14)],lamps:[{kind:"amber",x:222,y:445},{kind:"moon",x:178,y:445}],lampZone:{x:175,y:405,w:50,h:75},pigments:["soot","chalk","rose","tide"],ink:2600,creatures:[{id:"cat-a",kind:"cat",name:"Ember",x:105,y:400,want:"warm",need:20,fur:"#d9874e"},{id:"cat-b",kind:"cat",name:"Sleet",x:295,y:400,want:"cool",need:20,fur:"#b9c4cf"},{id:"hush",kind:"hush",x:200,y:175,limit:1.4}]},{id:"studio",title:"the studio",studio:!0,brief:"every lamp, every pigment, all the ink you want. no hush. build a room the cats would never leave.",lesson:"Radiance cascades trade spatial and angular resolution between levels: each level has half the probes per axis and four times the directions. The whole room is solved again on every change.",walls:[P(0,0,400,8),P(0,492,400,8),P(0,0,8,500),P(392,0,8,500),P(170,150,60,16),P(60,300,16,80),P(300,250,50,16),{x:220,y:330,w:70,h:12,pigment:"chalk"}],lamps:[{kind:"amber",x:110,y:430},{kind:"moon",x:330,y:90},{kind:"rose",x:200,y:110},{kind:"white",x:340,y:440}],lampPower:.4,pigments:["soot","chalk","rose","tide"],ink:1/0,creatures:[{id:"cat-a",kind:"cat",name:"Tarn",x:130,y:170,want:"warm",need:22,fur:"#cfa27a"},{id:"cat-b",kind:"cat",name:"Sleet",x:280,y:200,want:"cool",need:16,fur:"#b9c4cf"},{id:"cat-c",kind:"cat",name:"Ember",x:200,y:380,want:"warm",need:20,fur:"#d9874e"}]}],Ie=W.filter(s=>!s.studio).length;function Tt(s){const n=new Uint8Array(O*q*4),o=new Uint8Array(O*q);for(const r of s.walls){const l=r.pigment==="stone"?Mt:se[r.pigment].albedo,p=Math.max(0,Math.floor(r.x)),M=Math.max(0,Math.floor(r.y)),f=Math.min(O,Math.ceil(r.x+r.w)),m=Math.min(q,Math.ceil(r.y+r.h));for(let N=M;N<m;N++)for(let h=p;h<f;h++){const b=N*O+h;o[b]=1,n.set([l[0]*255,l[1]*255,l[2]*255,255],b*4)}}return{rgba:n,solid:o}}function Nt(s){const n=new Uint8Array(O*q);for(const o of s.creatures){const r=Pt;for(let l=Math.max(0,o.y-r);l<Math.min(q,o.y+r);l++)for(let p=Math.max(0,o.x-r);p<Math.min(O,o.x+r);p++)(p-o.x)**2+(l-o.y)**2<=r*r&&(n[l*O+p]=1)}return n}function St(s,n,o,r,l,p,M){const f=p?kt[p]:0;let m=0;const N=ot;for(let h=Math.max(0,Math.floor(l-N));h<Math.min(q,Math.ceil(l+N));h++)for(let b=Math.max(0,Math.floor(r-N));b<Math.min(O,Math.ceil(r+N));b++){if((b+.5-r)**2+(h+.5-l)**2>N*N)continue;const g=h*O+b;if(n[g]||o[g])continue;const k=s[g];if(f&&!k){if(M-m<=0)continue;m+=1}else!f&&k&&(m-=1);s[g]=f}return m}function Lt(s,n,o){o.set(s.rgba);for(let r=0;r<n.length;r++){const l=n[r];if(!l||s.solid[r])continue;const p=se[Ve[l-1]].albedo,M=r*4;o[M]=p[0]*255,o[M+1]=p[1]*255,o[M+2]=p[2]*255,o[M+3]=255}return o}const Ct=([s,n,o])=>100*(.2126*s+.7152*n+.0722*o),Je=1.6;function Rt([s,,n]){return s>n*Je?"warm":n>s*Je?"cool":"mixed"}function Et(s,n){const o=n?Ct(n):0,r=n?Rt(n):"mixed";if(s.kind==="hush"){const m=o/s.limit;return{lux:o,tint:r,ratio:m,ok:m<=1,mood:m<=.5?"deep asleep":m<=1?"stirring":"awake"}}const l=o/s.need,p=r===s.want,M=l>=1&&p;let f="asleep in the patch";return l<.35?f="cold":l<1?f="almost":p||(f=s.want==="warm"?"too blue":"too warm"),{lux:o,tint:r,ratio:l,ok:M,mood:f}}const At=(s,n,o)=>{const r=s.lampZone||{x:12,y:12,w:O-24,h:q-24};return[Math.min(r.x+r.w,Math.max(r.x,n)),Math.min(r.y+r.h,Math.max(r.y,o))]};function _t(){let s=null,n=null,o=null,r=!1;const l=new Map;let p=null;const M=()=>{if(s)return s;const h=window.AudioContext||window.webkitAudioContext;if(!h)return null;s=new h,n=s.createGain(),n.gain.value=r?0:.7,n.connect(s.destination);const b=s.sampleRate*2;o=s.createBuffer(1,b,s.sampleRate);const g=o.getChannelData(0);let k=0;for(let j=0;j<b;j++)k=(k+.02*(Math.random()*2-1))/1.02,g[j]=k*3.5;return s},f=(h,b)=>{if(l.has(h))return l.get(h);const g=s.createBufferSource();g.buffer=o,g.loop=!0;const k=s.createBiquadFilter();k.type="bandpass",k.frequency.value=140+Math.random()*60,k.Q.value=1.2;const j=s.createGain();j.gain.value=.5;const A=s.createOscillator();A.frequency.value=22+Math.random()*6;const E=s.createGain();E.gain.value=.5,A.connect(E).connect(j.gain);const $=s.createGain();$.gain.value=0;const R=s.createStereoPanner();R.pan.value=b,g.connect(k).connect(j).connect($).connect(R).connect(n),g.start(),A.start();const ae={level:$,nodes:[g,A]};return l.set(h,ae),ae},m=()=>{if(p)return p;const h=s.createOscillator();h.type="sawtooth",h.frequency.value=49;const b=s.createOscillator();b.type="sawtooth",b.frequency.value=49.6;const g=s.createBiquadFilter();g.type="lowpass",g.frequency.value=160;const k=s.createGain();return k.gain.value=0,h.connect(g),b.connect(g),g.connect(k).connect(n),h.start(),b.start(),p={level:k,lp:g,nodes:[h,b]},p},N=(h,b,g="sine",k=.12,j=0)=>{if(!s)return;const A=s.currentTime+j,E=s.createOscillator();E.type=g,E.frequency.setValueAtTime(h,A);const $=s.createGain();$.gain.setValueAtTime(0,A),$.gain.linearRampToValueAtTime(k,A+.01),$.gain.exponentialRampToValueAtTime(1e-4,A+b),E.connect($).connect(n),E.start(A),E.stop(A+b+.05)};return{wake(){const h=M();h&&h.state==="suspended"&&h.resume().catch(()=>{})},update(h){if(!s)return;const b=s.currentTime;for(const g of h)if(g.kind==="hush"){const k=m(),j=Math.max(0,Math.min(1.5,g.ratio))/1.5;k.level.gain.setTargetAtTime(j*.16,b,.25),k.lp.frequency.setTargetAtTime(120+j*500,b,.25)}else{const k=f(g.id,g.pan),j=g.ok?.22:Math.max(0,Math.min(1,g.ratio))*.05;k.level.gain.setTargetAtTime(j,b,.3)}},lamp(){N(660,.09,"triangle",.08)},paint(){N(220+Math.random()*60,.05,"sine",.025)},asleep(){[392,494,587,784].forEach((h,b)=>N(h,1.6,"sine",.07,b*.12))},setMuted(h){r=h,n&&n.gain.setTargetAtTime(h?0:.7,s.currentTime,.05)},dispose(){for(const h of l.values())h.nodes.forEach(b=>{try{b.stop()}catch{}});p?.nodes.forEach(h=>{try{h.stop()}catch{}}),l.clear(),p=null,s&&s.close().catch(()=>{}),s=null}}}const it="sunpatch-cascade-v1",Qe=rt(),Ut=900,Gt=16,Dt=()=>{try{const s=window.localStorage.getItem(it),n=s?JSON.parse(s):null;return n&&typeof n=="object"?{solved:n.solved||{},room:Number(n.room)||0}:{solved:{},room:0}}catch{return{solved:{},room:0}}},et=s=>{try{window.localStorage.setItem(it,JSON.stringify(s))}catch{}},tt=s=>{let n=1;for(let o=0;o<W.length-1&&s[W[o].id];o++)n=o+2;return Math.min(n,W.length)},st=s=>s.lamps.map((n,o)=>({id:`${s.id}-${o}`,kind:n.kind,x:n.x,y:n.y})),Ot=(s,n)=>s.map(o=>{const r=_e[o.kind];return{x:o.x,y:o.y,radius:jt,color:r.color,power:r.power*(n.lampPower||1)}}),fe=s=>s>=10?Math.floor(s):(Math.floor(s*10)/10).toFixed(1);function $t({c:s,reading:n}){const o=n?Math.min(n.ratio,1.4):0,r=.22+Math.min(o,1.2)*.75,l=n?.ok;return e.jsxs("g",{className:`sp-cat ${l?"is-asleep":""}`,style:{filter:`brightness(${r.toFixed(2)})`},children:[e.jsx("path",{d:"M -15 4 C -16 -8 -4 -12 6 -9 C 13 -7 15 -1 13 5 C 11 10 -12 11 -15 4 Z",fill:s.fur}),e.jsx("path",{d:"M -14 6 C -20 9 -18 15 -8 13",fill:"none",stroke:s.fur,strokeWidth:"3.4",strokeLinecap:"round"}),e.jsx("circle",{cx:"9",cy:"-6",r:"6.6",fill:s.fur}),e.jsx("path",{d:"M 4 -10 L 5 -16 L 9 -12 Z M 10 -12 L 14 -16 L 14 -9 Z",fill:s.fur}),l&&e.jsx("text",{x:"15",y:"-15",className:"sp-z",children:"z"}),l?e.jsx("path",{d:"M 6.5 -6 q 1.4 1.2 2.8 0 M 10.5 -6 q 1.4 1.2 2.8 0",stroke:"#2a1d14",strokeWidth:"0.9",fill:"none",strokeLinecap:"round"}):e.jsxs("g",{fill:"#2a1d14",children:[e.jsx("ellipse",{cx:"7.6",cy:"-6",rx:"1",ry:n&&n.ratio>.35?.9:1.5}),e.jsx("ellipse",{cx:"11.8",cy:"-6",rx:"1",ry:n&&n.ratio>.35?.9:1.5})]})]})}function Bt({reading:s}){const n=s?s.ratio:0,o=Math.min(3.2,.25+n*2.4),r=s&&!s.ok;return e.jsxs("g",{className:`sp-hush ${r?"is-awake":""}`,children:[e.jsx("path",{d:"M -16 6 C -18 -6 -8 -15 0 -14 C 9 -14 18 -6 16 6 C 14 13 -14 13 -16 6 Z",fill:"#07050b",stroke:r?"#b39cff":"#2b2140",strokeWidth:"1.2"}),e.jsx("ellipse",{cx:"-5",cy:"-2",rx:"2.6",ry:o,fill:r?"#efe7ff":"#6d5d93"}),e.jsx("ellipse",{cx:"5",cy:"-2",rx:"2.6",ry:o,fill:r?"#efe7ff":"#6d5d93"})]})}function It({c:s,reading:n}){const r=2*Math.PI*22,l=n?n.ratio:0,p=s.kind==="hush",M=Math.min(l,p?1.5:1)/(p?1.5:1);let f="#7d746a";p?f=n&&!n.ok?"#c4a8ff":"#5c4d80":n?.tint==="warm"?f="#ffb15a":n?.tint==="cool"&&(f="#86b4ff");const m=p?`hush ${n?fe(n.lux):"·"}/${s.limit}`:`${s.name} ${n?fe(n.lux):"·"}/${s.need}`;return e.jsxs("g",{children:[e.jsx("circle",{r:22,fill:"none",stroke:"rgba(239,230,216,0.14)",strokeWidth:"2.2"}),p&&e.jsx("circle",{r:22,fill:"none",stroke:"#c4a8ff",strokeOpacity:"0.5",strokeWidth:"2.2",strokeDasharray:`1.4 ${r/1.5-1.4}`,transform:"rotate(-90)"}),e.jsx("circle",{r:22,fill:"none",stroke:f,strokeWidth:"2.6",strokeLinecap:"round",strokeDasharray:`${(M*r).toFixed(1)} ${r.toFixed(1)}`,transform:"rotate(-90)",className:"sp-gauge-arc"}),n?.ok&&!p&&e.jsx("circle",{r:26,fill:"none",stroke:f,strokeOpacity:"0.35",strokeWidth:"1",className:"sp-halo"}),e.jsx("text",{y:34,textAnchor:"middle",className:"sp-gauge-label",children:m})]})}function qt({at:s,level:n}){if(!s)return null;const o=nt(n),r=o.spacing,l=(Math.floor(s[0]/r)+.5)*r,p=(Math.floor(s[1]/r)+.5)*r,M=Math.min(o.rays,64),f=[];for(let m=0;m<M;m++){const h=(Math.floor((m+.5)*o.rays/M)+.5)/o.rays*Math.PI*2,b=Math.cos(h),g=Math.sin(h);f.push(e.jsx("line",{x1:l+b*o.start,y1:p+g*o.start,x2:l+b*o.end,y2:p+g*o.end},m))}return e.jsxs("g",{className:"sp-lens",pointerEvents:"none",children:[r>=4&&e.jsxs(e.Fragment,{children:[e.jsxs("defs",{children:[e.jsx("pattern",{id:"sp-probes",width:r,height:r,patternUnits:"userSpaceOnUse",children:e.jsx("circle",{cx:r/2,cy:r/2,r:Math.min(1.2,r/5),fill:"#ffe2b8",fillOpacity:"0.75"})}),e.jsxs("radialGradient",{id:"sp-lens-fade",children:[e.jsx("stop",{offset:"0.6",stopColor:"#fff"}),e.jsx("stop",{offset:"1",stopColor:"#000"})]}),e.jsx("mask",{id:"sp-lens-mask",children:e.jsx("circle",{cx:s[0],cy:s[1],r:Math.max(48,r*3),fill:"url(#sp-lens-fade)"})})]}),e.jsx("rect",{width:O,height:q,fill:"url(#sp-probes)",mask:"url(#sp-lens-mask)"})]}),e.jsx("circle",{cx:l,cy:p,r:Math.max(o.start,.5),className:"sp-lens-ring"}),e.jsx("circle",{cx:l,cy:p,r:o.end,className:"sp-lens-ring"}),e.jsx("g",{className:"sp-lens-rays",children:f}),e.jsx("circle",{cx:l,cy:p,r:"2.2",fill:"#fff4e2"})]})}function Zt({category:s,experiment:n}){const o=y.useRef(null),r=y.useRef(null),l=y.useRef(null),p=y.useRef(null),M=y.useRef(null),f=y.useRef(!1),m=y.useRef(new Uint8Array(O*q)),N=y.useRef(null),h=y.useRef(null),b=y.useRef(new Uint8Array(O*q*4)),g=y.useRef([]),k=y.useRef(null),j=y.useRef({}),A=y.useMemo(Dt,[]),[E,$]=y.useState(A),[R,ae]=y.useState(()=>Math.min(A.room,tt(A.solved)-1)),v=W[R],[_,V]=y.useState("title"),[G,he]=y.useState("starting"),[we,le]=y.useState(""),[H,ke]=y.useState(()=>st(W[R])),[K,ue]=y.useState(0),[z,re]=y.useState("paint"),[J,me]=y.useState(v.pigments[0]||null),[Q,xe]=y.useState(0),[U,je]=y.useState([]),[Pe,Le]=y.useState(!1),[Z,de]=y.useState(!1),[B,Ce]=y.useState(!1),[Y,ee]=y.useState(3),[Ue,ge]=y.useState(null),[te,Me]=y.useState(!1),[Ge,De]=y.useState(!1),[ne,w]=y.useState(null),ye=v.ink===1/0?1/0:Math.max(0,v.ink-Q);j.current={room:v,lamps:H,tool:z,pigment:J,inkLeft:ye,xray:B,phase:_,solvedNow:Z,selected:K},y.useEffect(()=>{const t=window.matchMedia("(prefers-reduced-motion: reduce)"),a=()=>De(t.matches);return a(),t.addEventListener("change",a),()=>t.removeEventListener("change",a)},[]),y.useEffect(()=>{let t=0,a=!1;const u=o.current,d=()=>{const T=u.getBoundingClientRect(),D=Math.min(window.devicePixelRatio||1,2),L=Math.max(1,Math.round(T.width*D)),Ne=Math.max(1,Math.round(T.height*D));(u.width!==L||u.height!==Ne)&&(u.width=L,u.height=Ne,l.current?.setView({}))},C=new ResizeObserver(d);return C.observe(u),d(),wt(u,{onLost:T=>{he("lost"),le(T)}}).then(T=>{if(a){T.destroy();return}l.current=T,w({levels:T.levels,rays:T.raysPerFrame}),he("ready");const D=L=>{f.current&&N.current&&(f.current=!1,T.setPaint(Lt(N.current,m.current,b.current))),T.frame(L/1e3),t=requestAnimationFrame(D)};t=requestAnimationFrame(D)}).catch(T=>{a||(he("unsupported"),le(T instanceof qe?T.message:`WebGPU could not start: ${T.message}`))}),()=>{a=!0,cancelAnimationFrame(t),C.disconnect(),l.current?.destroy(),l.current=null}},[]),y.useEffect(()=>{const t=_t();return p.current=t,()=>t.dispose()},[]);const oe=y.useCallback(t=>{const a=W[t];N.current=Tt(a),h.current=Nt(a),m.current=new Uint8Array(O*q),g.current=[],f.current=!0,clearTimeout(k.current),ke(st(a)),ue(0),xe(0),je([]),Le(!1),de(!1),me(a.pigments[0]||null),re("paint")},[]);y.useEffect(()=>{G==="ready"&&(oe(R),l.current.setProbes(W[R].creatures.map(t=>({x:t.x,y:t.y,radius:8}))))},[G,R,oe]),y.useEffect(()=>{l.current?.setLamps(Ot(H,j.current.room))},[H,G]),y.useEffect(()=>{l.current?.setView({xray:B?.82:0,debugLevel:B?Y:-1})},[B,Y,G]),y.useEffect(()=>{const t=l.current;t&&t.onMeasure((a,u)=>{const d=j.current.room;je(d.creatures.map((C,T)=>({id:C.id,...Et(C,a[T])}))),Le(u)})},[G]),y.useEffect(()=>{U.length&&p.current?.update(v.creatures.map((t,a)=>({id:t.id,kind:t.kind,pan:t.x/O*1.4-.7,ok:U[a]?.ok,ratio:U[a]?.ratio||0})))},[U,v]);const F=U.length===v.creatures.length&&U.every(t=>t.ok);y.useEffect(()=>{if(clearTimeout(k.current),!(v.studio||Z||!F||!Pe||M.current))return k.current=setTimeout(()=>{de(!0),p.current?.asleep(),$(t=>{const a=t.solved[v.id],d={solved:{...t.solved,[v.id]:{ink:a?Math.min(a.ink,Q):Q}},room:Math.min(R+1,W.length-1)};return et(d),d})},Ut),()=>clearTimeout(k.current)},[F,Pe,v,Z,Q,R]);const ve=y.useCallback(t=>{ae(t),V("play"),$(a=>{const u={...a,room:t};return et(u),u}),R===t&&G==="ready"&&oe(t)},[R,G,oe]),Re=()=>{R+1>=Ie&&!v.studio?V("ending"):ve(Math.min(R+1,W.length-1))},Oe=()=>{g.current.push(m.current.slice()),g.current.length>Gt&&g.current.shift()},c=t=>{let a=0;for(let u=0;u<t.length;u++)t[u]&&a++;return a},i=()=>{const t=g.current.pop();t&&(m.current=t,f.current=!0,xe(c(t)),de(!1))},x=()=>oe(R),S=t=>{const a=r.current.getBoundingClientRect();return[(t.clientX-a.left)/a.width*O,(t.clientY-a.top)/a.height*q]},I=(t,a,u,d)=>{const C=j.current,T=C.tool==="erase"?null:C.pigment;if(C.tool==="paint"&&!T)return;const D=Math.hypot(u-t,d-a),L=Math.max(1,Math.ceil(D/(ot*.45)));let Ne=C.inkLeft,Be=0;for(let Se=0;Se<=L;Se++){const Ke=Se/L,Xe=St(m.current,N.current.solid,h.current,t+(u-t)*Ke,a+(d-a)*Ke,T,Ne);Be+=Xe,Ne-=Xe}Be!==0&&(f.current=!0,xe(Se=>Math.max(0,Se+Be)),de(!1))},X=(t,a)=>{let u=-1,d=22;return j.current.lamps.forEach((C,T)=>{const D=Math.hypot(C.x-t,C.y-a);D<d&&(u=T,d=D)}),u},Ee=(t,a,u)=>{const[d,C]=At(j.current.room,a,u);ke(T=>T.map((D,L)=>L===t?{...D,x:d,y:C}:D)),de(!1)},Ze=t=>{if(G!=="ready"||_!=="play"||t.target instanceof Element&&t.target.closest(".sp-card, .sp-fallback, button, a"))return;p.current?.wake();const[a,u]=S(t);t.currentTarget.setPointerCapture?.(t.pointerId);const d=j.current,C=X(a,u);if(C>=0){ue(C),M.current={type:"lamp",i:C,dx:d.lamps[C].x-a,dy:d.lamps[C].y-u};return}if(d.xray){M.current={type:"lens"},ge([a,u]);return}d.tool==="paint"&&(!d.pigment||d.inkLeft<=0)||(Oe(),M.current={type:"paint",x:a,y:u},I(a,u,a,u),p.current?.paint())},Te=t=>{if(G!=="ready")return;const[a,u]=S(t),d=M.current;j.current.xray&&(!d||d.type==="lens")&&ge([a,u]),d&&(d.type==="lamp"?Ee(d.i,a+d.dx,u+d.dy):d.type==="paint"&&(I(d.x,d.y,a,u),d.x=a,d.y=u))},He=()=>{const t=M.current;M.current=null,t?.type==="lamp"&&p.current?.lamp(),l.current?.invalidate(2)};y.useEffect(()=>{const t=a=>{if(a.target instanceof HTMLElement&&/input|textarea|select/i.test(a.target.tagName))return;const u=j.current;if(u.phase!=="play"){u.phase==="title"&&(a.key==="Enter"||a.key===" ")&&(a.preventDefault(),V("play"));return}const d=a.key,C=Ve.find(L=>se[L].key===d);if(C&&u.room.pigments.includes(C)){me(C),re("paint");return}if(d==="e"||d==="E"){re(L=>L==="erase"?"paint":"erase");return}if(d==="x"||d==="X"){Ce(L=>!L);return}if(d==="["){ee(L=>Math.max(0,L-1));return}if(d==="]"){ee(L=>Math.min(Qe-1,L+1));return}if((d==="z"||d==="Z")&&!a.shiftKey){a.preventDefault(),i();return}if(d==="r"||d==="R"){x();return}if(d==="m"||d==="M"){Me(L=>(p.current?.setMuted(!L),!L));return}if((d==="n"||d==="N")&&u.solvedNow){Re();return}if((d==="l"||d==="L")&&u.lamps.length>1){ue(L=>(L+(a.shiftKey?u.lamps.length-1:1))%u.lamps.length);return}const T=a.shiftKey?12:3,D={ArrowLeft:[-T,0],ArrowRight:[T,0],ArrowUp:[0,-T],ArrowDown:[0,T]};if(D[d]&&u.lamps[u.selected]){a.preventDefault(),p.current?.wake();const L=u.lamps[u.selected];Ee(u.selected,L.x+D[d][0],L.y+D[d][1]),l.current?.invalidate()}};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)});const ct=()=>{p.current?.wake(),V("play")},lt=tt(E.solved),ie=nt(Y),ut=U.filter((t,a)=>v.creatures[a]?.kind==="cat"&&t.ok).length,Ye=v.creatures.filter(t=>t.kind==="cat").length,$e=U.find((t,a)=>v.creatures[a]?.kind==="hush"),dt=Object.values(E.solved).reduce((t,a)=>t+(a.ink||0),0),pt=v.creatures.reduce((t,a)=>t+a.y,0)/v.creatures.length>q/2;return e.jsxs("div",{className:`sp-root ${Ge?"is-reduced":""}`,"data-testid":"sunpatch-root",children:[e.jsxs("header",{className:"sp-top",children:[e.jsx("div",{className:"sp-nav",children:e.jsx(ft,{currentCategory:s?.slug,currentExperiment:n?.slug})}),e.jsxs("div",{className:"sp-title",children:[e.jsx("span",{className:"sp-name",children:"sunpatch.cascade()"}),e.jsxs("span",{className:"sp-sub",children:[v.studio?"studio":`room ${R+1} of ${Ie}`," · ",v.title]})]}),e.jsxs("div",{className:"sp-top-actions",children:[e.jsxs("button",{type:"button",className:`sp-chip ${B?"is-on":""}`,onClick:()=>Ce(t=>!t),"aria-pressed":B,"data-playground-action":"xray","data-testid":"sp-xray",children:["x-ray ",e.jsx("kbd",{children:"X"})]}),e.jsxs("button",{type:"button",className:`sp-chip ${te?"":"is-on"}`,"aria-pressed":!te,"aria-label":"Sound",onClick:()=>{p.current?.wake(),p.current?.setMuted(!te),Me(!te)},children:[e.jsx("span",{className:"sp-long",children:te?"sound off":"sound on"}),e.jsx("span",{className:"sp-short","aria-hidden":"true",children:te?"♪ off":"♪"})]})]})]}),e.jsxs("main",{className:"sp-main",children:[e.jsx("section",{className:"sp-stagewrap",children:e.jsxs("div",{className:`sp-stage ${B?"is-xray":""} tool-${z}`,ref:r,"data-playground-surface":!0,"data-testid":"sp-stage",onPointerDown:Ze,onPointerMove:Te,onPointerUp:He,onPointerCancel:He,onPointerLeave:()=>{M.current||ge(null)},children:[e.jsx("canvas",{ref:o,className:"sp-canvas","aria-label":`A room lit in real time. ${ut} of ${Ye} cats warm${$e?`, hush ${$e.mood}`:""}.`}),e.jsxs("svg",{className:"sp-overlay",viewBox:`0 0 ${O} ${q}`,preserveAspectRatio:"none","aria-hidden":"true",children:[v.lampZone&&e.jsx("rect",{x:v.lampZone.x,y:v.lampZone.y,width:v.lampZone.w,height:v.lampZone.h,className:"sp-zone"}),v.creatures.map((t,a)=>e.jsxs("g",{transform:`translate(${t.x} ${t.y})`,"data-testid":`sp-creature-${t.id}`,"data-lux":U[a]?U[a].lux.toFixed(2):"","data-ok":U[a]?.ok?"1":"0",children:[e.jsx(It,{c:t,reading:U[a]}),t.kind==="cat"?e.jsx($t,{c:t,reading:U[a]}):e.jsx(Bt,{reading:U[a]})]},t.id)),H.map((t,a)=>e.jsx("g",{transform:`translate(${t.x} ${t.y})`,className:`sp-lamp ${a===K?"is-selected":""}`,children:e.jsx("circle",{r:"15",fill:"transparent",stroke:_e[t.kind].swatch})},t.id)),B&&e.jsx(qt,{at:Ue||(H[K]?[H[K].x+40,H[K].y]:null),level:Y})]}),G==="unsupported"&&e.jsxs("div",{className:"sp-fallback","data-testid":"sp-fallback",children:[e.jsx("img",{src:"/playground/sunpatch-cascade/still.jpg",alt:"A dark room where lamplight pools around a sleeping cat"}),e.jsxs("div",{children:[e.jsx("h2",{children:"This room is lit by your GPU"}),e.jsxs("p",{children:[we," sunpatch.cascade() traces every ray in the room live with WebGPU compute shaders. Open it in a current Chrome, Edge or Safari, or in Firefox with WebGPU enabled, to play."]})]})]}),G==="lost"&&e.jsxs("div",{className:"sp-card sp-card-center",role:"alert",children:[e.jsx("h2",{children:"The GPU let go of the room"}),e.jsx("p",{children:we}),e.jsx("button",{type:"button",className:"sp-primary",onClick:()=>window.location.reload(),children:"Light it again"})]}),G==="starting"&&e.jsx("div",{className:"sp-card sp-card-center",role:"status",children:e.jsx("p",{children:"warming the lamps…"})}),_==="title"&&G==="ready"&&e.jsxs("div",{className:"sp-card sp-card-title",children:[e.jsx("p",{className:"sp-kicker",children:"radiance cascades · webgpu compute"}),e.jsx("h1",{children:"cats sleep where light pools"}),e.jsx("p",{className:"sp-short",children:"Live global illumination on your GPU. Move the lamp, warm the cat, keep the hush in the dark."}),e.jsxs("p",{className:"sp-long",children:["Every ray in this room is traced on your GPU, live: ",ne?`${(ne.rays/1e6).toFixed(1)} million rays across ${ne.levels} cascades`:"millions of rays"," each time anything moves. Move the lamps, paint walls that cast shadows or throw light back, and put each cat in a warm patch without waking the hush."]}),e.jsx("button",{type:"button",className:"sp-primary",onClick:ct,"data-playground-primary":!0,"data-testid":"sp-begin",children:E.solved[W[0].id]?"Back to the rooms":"Enter the first room"})]}),B&&_==="play"&&e.jsxs("div",{className:"sp-xray-tag","aria-live":"polite",children:["x-ray · cascade ",Y," · probe every ",ie.spacing," px · ",ie.rays," rays · ",fe(ie.start),"–",fe(ie.end)," px"]}),_==="play"&&Z&&!v.studio&&e.jsxs("div",{className:`sp-card sp-card-solved ${pt?"is-top":""}`,role:"status","data-testid":"sp-solved",children:[e.jsxs("p",{className:"sp-kicker",children:["room ",R+1," · asleep"]}),e.jsxs("h2",{children:[Ye===1?"the cat is asleep in the patch":"both cats asleep",$e?", and the hush never woke":""]}),e.jsx("p",{children:v.lesson}),e.jsxs("p",{className:"sp-meta",children:["ink used: ",Q," px",E.solved[v.id]&&E.solved[v.id].ink<Q?` (best ${E.solved[v.id].ink})`:""]}),e.jsxs("button",{type:"button",className:"sp-primary",onClick:Re,"data-playground-action":"next-room","data-testid":"sp-next",children:[R+1>=Ie?"Close the last door":"Next room"," ",e.jsx("kbd",{children:"N"})]})]}),_==="ending"&&e.jsxs("div",{className:"sp-card sp-card-center sp-card-ending","data-testid":"sp-ending",children:[e.jsx("p",{className:"sp-kicker",children:"every room asleep"}),e.jsx("h2",{children:"four rooms, every cat in a sunpatch"}),e.jsxs("p",{children:["You shaped light with lamps, soot and chalk while a radiance-cascade solver re-traced the room each time you moved anything. Total ink: ",dt," px."]}),e.jsxs("div",{className:"sp-row",children:[e.jsx("button",{type:"button",className:"sp-primary",onClick:()=>ve(W.length-1),"data-playground-action":"studio","data-testid":"sp-studio",children:"Open the studio"}),e.jsx("button",{type:"button",className:"sp-secondary",onClick:()=>ve(0),children:"Start again"})]})]})]})}),e.jsxs("aside",{className:"sp-panel","aria-label":"Room controls",children:[e.jsxs("section",{className:"sp-block sp-brief",children:[e.jsx("p",{children:v.brief}),e.jsx("ul",{className:"sp-goals",children:v.creatures.map((t,a)=>{const u=U[a];return e.jsxs("li",{className:u?.ok?"is-ok":u?"is-not":"",children:[e.jsx("span",{className:"sp-dot",style:{background:t.kind==="hush"?"#5c4d80":t.fur}}),e.jsx("span",{className:"sp-goal-name",children:t.kind==="hush"?"the hush":t.name}),e.jsx("span",{className:"sp-goal-mood",children:u?u.mood:"…"}),e.jsxs("span",{className:"sp-goal-num",children:[u?fe(u.lux):"·"," ",t.kind==="hush"?`≤ ${t.limit}`:`≥ ${t.need} ${t.want}`]})]},t.id)})})]}),e.jsxs("section",{className:"sp-block",children:[e.jsxs("h3",{children:["lamps ",e.jsxs("span",{className:"sp-hint",children:["drag them, or ",e.jsx("kbd",{children:"L"})," and the arrow keys"]})]}),e.jsx("div",{className:"sp-row sp-lamps",children:H.map((t,a)=>e.jsxs("button",{type:"button",className:`sp-lampbtn ${a===K?"is-on":""}`,onClick:()=>ue(a),"aria-pressed":a===K,"data-playground-action":`lamp-${a}`,children:[e.jsx("i",{style:{background:_e[t.kind].swatch}}),_e[t.kind].label]},t.id))}),v.lampZone&&e.jsx("p",{className:"sp-hint",children:"Lamps stay inside the dashed cellar."})]}),v.pigments.length>0&&e.jsxs("section",{className:"sp-block",children:[e.jsxs("h3",{children:["paint ",e.jsx("span",{className:"sp-hint",children:v.ink===1/0?"unlimited ink":`${ye} px of ink left`})]}),v.ink!==1/0&&e.jsx("div",{className:"sp-ink",children:e.jsx("i",{style:{width:`${ye/v.ink*100}%`}})}),e.jsxs("div",{className:"sp-row",role:"radiogroup","aria-label":"Pigment",children:[v.pigments.map(t=>e.jsxs("button",{type:"button",role:"radio","aria-checked":z==="paint"&&J===t,className:`sp-pigment ${z==="paint"&&J===t?"is-on":""}`,onClick:()=>{me(t),re("paint")},"data-playground-action":`pigment-${t}`,"data-testid":`sp-pigment-${t}`,title:se[t].note,children:[e.jsx("i",{style:{background:se[t].swatch}}),se[t].label," ",e.jsx("kbd",{children:se[t].key})]},t)),e.jsxs("button",{type:"button",className:`sp-pigment ${z==="erase"?"is-on":""}`,onClick:()=>re(t=>t==="erase"?"paint":"erase"),"aria-pressed":z==="erase","data-playground-action":"erase",children:["Erase ",e.jsx("kbd",{children:"E"})]})]}),J&&e.jsxs("p",{className:"sp-hint",children:[se[J].label,": ",se[J].note,"."]})]}),e.jsxs("section",{className:"sp-block sp-row",children:[e.jsxs("button",{type:"button",className:"sp-secondary",onClick:i,"data-playground-action":"undo",children:["Undo ",e.jsx("kbd",{children:"Z"})]}),e.jsxs("button",{type:"button",className:"sp-secondary",onClick:x,"data-playground-action":"reset","data-testid":"sp-reset",children:["Reset room ",e.jsx("kbd",{children:"R"})]})]}),e.jsxs("section",{className:`sp-block sp-xray ${B?"is-open":""}`,children:[e.jsx("h3",{children:"how the light is solved"}),B?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"sp-row",role:"radiogroup","aria-label":"Cascade level",children:Array.from({length:Qe},(t,a)=>e.jsxs("button",{type:"button",role:"radio","aria-checked":Y===a,className:`sp-level ${Y===a?"is-on":""}`,onClick:()=>ee(a),"data-playground-action":`cascade-${a}`,children:["c",a]},a))}),e.jsxs("p",{children:[e.jsxs("b",{children:["Cascade ",Y]}),": a probe every ",ie.spacing," px, each casting ",ie.rays," rays that only look from ",fe(ie.start)," to ",fe(ie.end)," px away. The room shows this cascade's raw probe mosaic: every tile is one probe, and every pixel in a tile is one direction. Hover or drag on the room to move the lens. Use ",e.jsx("kbd",{children:"["})," ",e.jsx("kbd",{children:"]"})," to change level."]}),e.jsx("p",{className:"sp-hint",children:v.lesson})]}):e.jsx("p",{children:"Light comes from radiance cascades, a 2023 real-time global-illumination technique. Coarse cascades see far with many directions; fine ones see near with few. They are merged from the top down every time the room changes. Turn on x-ray to see them."}),ne&&e.jsxs("p",{className:"sp-meta",children:[ne.levels," cascades · ",(ne.rays/1e6).toFixed(2),"M rays per solve · bounce light settles over 24 frames"]})]}),e.jsxs("nav",{className:"sp-block","aria-label":"Rooms",children:[e.jsx("h3",{children:"rooms"}),e.jsx("div",{className:"sp-row",children:W.map((t,a)=>e.jsx("button",{type:"button",disabled:a>=lt,className:`sp-room ${a===R?"is-on":""} ${E.solved[t.id]?"is-done":""}`,onClick:()=>ve(a),"data-playground-action":`room-${a}`,children:t.studio?"studio":a+1},t.id))})]})]})]})]})}export{Zt as default};
