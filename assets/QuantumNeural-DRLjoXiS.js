import{r as m,j as T}from"./react-vendor-CDf3ejbn.js";import{W as Ae}from"./three-renderer-D72PLMtO.js";import{O as De,E as Ge,a as _e,U as Le,b as Be}from"./three-addons-OzvNq3El.js";import{E as Oe}from"./ExperimentControls-CzmH4LuZ.js";import{E as He}from"./ExperimentMetrics-C1IABvDD.js";import{E as Ue}from"./ExperimentNav-CnNg04no.js";import{l as Ve,j as he,m as $,h as k,F,V as w,k as ve,A as pe,U as we,cI as Re,cP as We,S as qe,cU as $e,a7 as Ke,z as Qe,f as be,cD as Xe,g as Ye}from"./three-core-DvEXxghc.js";import"./experiments-Cg5bfFKx.js";import"./router-vendor-B-nFvpNu.js";const Me=[new $(1707786),new $(4008212),new $(16032353),new $(15167313),new $(16711790)],Je=["thought.sphere","memory.helix","dream.fractal","void.torus","echo.grid"],ze=`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`,Se={vertexShader:`${ze}
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute float distanceFromRoot;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
uniform float uBaseNodeSize;

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
varying float vGlitch;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
    if (pulseTime < 0.0) return 0.0;
    float timeSinceClick = uTime - pulseTime;
    if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
    float pulseRadius = timeSinceClick * uPulseSpeed;
    float distToClick = distance(worldPos, pulsePos);
    float pulseThickness = 3.0;
    float waveProximity = abs(distToClick - pulseRadius);
    return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
}

// Void glitch - thoughts flicker between existence
float voidGlitch(vec3 pos, float time) {
    float glitchSeed = snoise(pos * 0.5 + vec3(floor(time * 3.0)));
    float glitchChance = step(0.92, glitchSeed);
    float glitchIntensity = snoise(vec3(pos.x * 10.0, time * 20.0, pos.z * 10.0));
    return glitchChance * glitchIntensity;
}

void main() {
    vNodeType = nodeType;
    vColor = nodeColor;
    vDistanceFromRoot = distanceFromRoot;
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vPosition = worldPos;

    float totalPulseIntensity = 0.0;
    for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
    }
    vPulseIntensity = min(totalPulseIntensity, 1.0);

    // Organic breathing with void interference
    float breathe = sin(uTime * 0.5 + distanceFromRoot * 0.12) * 0.2 + 0.8;
    float voidWobble = snoise(position * 0.3 + uTime * 0.2) * 0.1;
    float baseSize = nodeSize * (breathe + voidWobble);
    float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);

    vGlow = 0.5 + 0.5 * sin(uTime * 0.4 + distanceFromRoot * 0.15);
    vGlitch = voidGlitch(position, uTime);

    vec3 modifiedPosition = position;
    // All nodes drift slightly in the void
    float drift = snoise(position * 0.06 + uTime * 0.05);
    modifiedPosition += normalize(position) * drift * 0.2;

    if (nodeType > 0.5) {
        float noise = snoise(position * 0.08 + uTime * 0.08);
        modifiedPosition += normalize(position) * noise * 0.2;
    }

    // Glitch displacement
    modifiedPosition += vec3(vGlitch * 0.5, 0.0, vGlitch * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
    gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}`,fragmentShader:`
uniform float uTime;
uniform vec3 uPulseColors[3];

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;
varying float vGlitch;

void main() {
    vec2 center = 2.0 * gl_PointCoord - 1.0;
    float dist = length(center);
    if (dist > 1.0) discard;

    // Void glow - softer, more ethereal
    float glow1 = 1.0 - smoothstep(0.0, 0.4, dist);
    float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
    float glowStrength = pow(glow1, 1.5) + glow2 * 0.4;

    float breatheColor = 0.85 + 0.15 * sin(uTime * 0.4 + vDistanceFromRoot * 0.2);
    vec3 baseColor = vColor * breatheColor;
    vec3 finalColor = baseColor;

    // Consciousness pulse effect
    if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
        finalColor = mix(baseColor, pulseColor, vPulseIntensity * 0.85);
        finalColor *= (1.0 + vPulseIntensity * 1.5);
        glowStrength *= (1.0 + vPulseIntensity * 1.2);
    }

    // Glitch color shift - thoughts destabilizing
    if (abs(vGlitch) > 0.1) {
        finalColor.r += vGlitch * 0.5;
        finalColor.b -= vGlitch * 0.3;
        glowStrength *= (1.0 + abs(vGlitch) * 2.0);
    }

    // Bright core - the consciousness center
    float coreBrightness = smoothstep(0.35, 0.0, dist);
    finalColor += vec3(1.0, 0.95, 0.9) * coreBrightness * 0.35;

    float alpha = glowStrength * (0.92 - 0.25 * dist);
    float camDistance = length(vPosition - cameraPosition);
    float distanceFade = smoothstep(100.0, 12.0, camDistance);

    // Leaf nodes - more ethereal, less solid
    if (vNodeType > 0.5) {
        finalColor *= 1.15;
        alpha *= 0.85;
    }

    // Void shimmer
    float shimmer = sin(uTime * 2.0 + vDistanceFromRoot * 0.5) * 0.05;
    finalColor *= (1.0 + vGlow * 0.15 + shimmer);

    gl_FragColor = vec4(finalColor, alpha * distanceFade);
}`},Te={vertexShader:`${ze}
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
    if (pulseTime < 0.0) return 0.0;
    float timeSinceClick = uTime - pulseTime;
    if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;

    float pulseRadius = timeSinceClick * uPulseSpeed;
    float distToClick = distance(worldPos, pulsePos);
    float pulseThickness = 3.0;
    float waveProximity = abs(distToClick - pulseRadius);

    return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
}

void main() {
    float t = position.x;
    vPathPosition = t;

    vec3 midPoint = mix(startPoint, endPoint, 0.5);
    float pathOffset = sin(t * 3.14159) * 0.15;
    vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
    if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
    midPoint += perpendicular * pathOffset;

    vec3 p0 = mix(startPoint, midPoint, t);
    vec3 p1 = mix(midPoint, endPoint, t);
    vec3 finalPos = mix(p0, p1, t);

    float noiseTime = uTime * 0.15;
    float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
    finalPos += perpendicular * noise * 0.12;

    vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;

    float totalPulseIntensity = 0.0;
    for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
    }
    vPulseIntensity = min(totalPulseIntensity, 1.0);

    vColor = connectionColor;
    vConnectionStrength = connectionStrength;
    vDistanceFromCamera = length(worldPos - cameraPosition);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}`,fragmentShader:`
uniform float uTime;
uniform vec3 uPulseColors[3];

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;

void main() {
    float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
    float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
    float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;

    vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
    float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;

    vec3 finalColor = baseColor;
    if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
        finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
        flowIntensity += vPulseIntensity * 0.8;
    }

    finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);

    float baseAlpha = 0.7 * vConnectionStrength;
    float flowAlpha = combinedFlow * 0.3;
    float alpha = baseAlpha + flowAlpha;
    alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);

    float distanceFade = smoothstep(100.0, 15.0, vDistanceFromCamera);
    gl_FragColor = vec4(finalColor, alpha * distanceFade);
}`};class B{constructor(p,a=0,d=0){this.position=p,this.connections=[],this.level=a,this.type=d,this.size=d===0?k.randFloat(.8,1.4):k.randFloat(.5,1),this.distanceFromRoot=0}addConnection(p,a=1){this.isConnectedTo(p)||(this.connections.push({node:p,strength:a}),p.connections.push({node:this,strength:a}))}isConnectedTo(p){return this.connections.some(a=>a.node===p)}}function Ze(Z,p=1){let a=[],d;function V(){d=new B(new w(0,0,0),0,0),d.size=2,a.push(d);const r=5,l=(1+Math.sqrt(5))/2;for(let i=1;i<=r;i++){const u=i*4,n=Math.floor(i*12*p);for(let t=0;t<n;t++){const o=Math.acos(1-2*(t+.5)/n),s=2*Math.PI*t/l,c=new w(u*Math.sin(o)*Math.cos(s),u*Math.sin(o)*Math.sin(s),u*Math.cos(o)),f=i===r||Math.random()<.3,v=new B(c,i,f?1:0);if(v.distanceFromRoot=u,a.push(v),i>1){const h=a.filter(b=>b.level===i-1&&b!==d);h.sort((b,I)=>c.distanceTo(b.position)-c.distanceTo(I.position));for(let b=0;b<Math.min(3,h.length);b++){const N=1-c.distanceTo(h[b].position)/(u*2);v.addConnection(h[b],Math.max(.3,N))}}else d.addConnection(v,.9)}const e=a.filter(t=>t.level===i&&t!==d);for(let t=0;t<e.length;t++){const o=e[t],s=e.filter(c=>c!==o).sort((c,f)=>o.position.distanceTo(c.position)-o.position.distanceTo(f.position)).slice(0,5);for(const c of s)o.position.distanceTo(c.position)<u*.8&&!o.isConnectedTo(c)&&o.addConnection(c,.6)}}const g=a.filter(i=>i.level>=3);for(let i=0;i<Math.min(20,g.length);i++){const u=g[Math.floor(Math.random()*g.length)],n=g[Math.floor(Math.random()*g.length)];u!==n&&!u.isConnectedTo(n)&&Math.abs(u.level-n.level)>1&&u.addConnection(n,.4)}}function ee(){d=new B(new w(0,0,0),0,0),d.size=1.8,a.push(d);const r=4,l=30,g=12,i=Math.floor(50*p),u=[];for(let e=0;e<r;e++){const t=e/r*Math.PI*2,o=[];for(let s=0;s<i;s++){const c=s/(i-1),f=(c-.5)*l,v=Math.sin(c*Math.PI)*.7+.3,h=g*v,b=t+c*Math.PI*6,I=new w(h*Math.cos(b),f,h*Math.sin(b)),N=Math.ceil(c*5),E=s>i-5||Math.random()<.25,H=new B(I,N,E?1:0);H.distanceFromRoot=Math.sqrt(h*h+f*f),H.helixIndex=e,H.helixT=c,a.push(H),o.push(H)}u.push(o),d.addConnection(o[0],1);for(let s=0;s<o.length-1;s++)o[s].addConnection(o[s+1],.85)}for(let e=0;e<r;e++){const t=u[e],o=u[(e+1)%r];for(let s=0;s<t.length;s+=5){const c=t[s].helixT,f=Math.round(c*(o.length-1));f<o.length&&t[s].addConnection(o[f],.7)}}for(const e of u)for(let t=0;t<e.length;t+=8){const o=e[t],s=a.filter(c=>c!==o&&c!==d&&c.distanceFromRoot<o.distanceFromRoot*.5);if(s.length>0){const c=s.sort((f,v)=>o.position.distanceTo(f.position)-o.position.distanceTo(v.position))[0];o.addConnection(c,.5)}}const n=a.filter(e=>e!==d);for(let e=0;e<Math.floor(30*p);e++){const t=n[Math.floor(Math.random()*n.length)],o=n.filter(s=>{const c=s.position.distanceTo(t.position);return s!==t&&c<8&&c>3&&!t.isConnectedTo(s)});if(o.length>0){const s=o[Math.floor(Math.random()*o.length)];t.addConnection(s,.45)}}}function X(){d=new B(new w(0,0,0),0,0),d.size=1.6,a.push(d);const r=6,l=4;function g(n,e,t,o,s){if(t>l)return;const c=5*s,f=new w().copy(n.position).add(e.clone().multiplyScalar(c)),v=t===l||Math.random()<.3,h=new B(f,t,v?1:0);if(h.distanceFromRoot=d.position.distanceTo(f),a.push(h),n.addConnection(h,o),t<l)for(let I=0;I<3;I++){const N=I/3*Math.PI*2,E=new w(-e.y,e.x,0).normalize(),H=e.clone().cross(E).normalize(),le=new w().copy(e).add(E.clone().multiplyScalar(Math.cos(N)*.7)).add(H.clone().multiplyScalar(Math.sin(N)*.7)).normalize();g(h,le,t+1,o*.7,s*.75)}}for(let n=0;n<r;n++){const e=Math.acos(1-2*(n+.5)/r),t=Math.PI*(1+Math.sqrt(5))*n,o=new w(Math.sin(e)*Math.cos(t),Math.sin(e)*Math.sin(t),Math.cos(e)).normalize();g(d,o,1,.9,1)}const i=a.filter(n=>n.level>=2);for(let n=0;n<i.length;n++){const e=i[n],t=i.filter(o=>{const s=o.position.distanceTo(e.position);return o!==e&&s<10&&!e.isConnectedTo(o)}).sort((o,s)=>e.position.distanceTo(o.position)-e.position.distanceTo(s.position)).slice(0,3);for(const o of t)Math.random()<.5*p&&e.addConnection(o,.5)}const u=a.filter(n=>n.level>=2&&n.level<=3);for(const n of u)if(Math.random()<.3){const e=a.filter(t=>t!==n&&t.distanceFromRoot<n.distanceFromRoot*.6);if(e.length>0){const t=e[Math.floor(Math.random()*e.length)];n.isConnectedTo(t)||n.addConnection(t,.4)}}}function y(){d=new B(new w(0,0,0),0,0),d.size=1.5,a.push(d);const r=12,l=5,g=Math.floor(24*p),i=Math.floor(12*p),u=[];for(let e=0;e<g;e++){const t=e/g*Math.PI*2,o=[];for(let s=0;s<i;s++){const c=s/i*Math.PI*2,f=(r+l*Math.cos(c))*Math.cos(t),v=l*Math.sin(c),h=(r+l*Math.cos(c))*Math.sin(t),b=Math.floor(s/i*4)+1,I=Math.random()<.3,N=new B(new w(f,v,h),b,I?1:0);N.distanceFromRoot=Math.sqrt(f*f+v*v+h*h),a.push(N),o.push(N),s>0&&N.addConnection(o[s-1],.8)}if(o.length>0&&o[0].addConnection(o[o.length-1],.8),u.push(o),e>0)for(let s=0;s<o.length;s++){const c=u[e-1];c[s]&&o[s].addConnection(c[s],.7)}}if(u.length>1){const e=u[0],t=u[u.length-1];for(let o=0;o<e.length;o++)t[o]&&e[o].addConnection(t[o],.7)}const n=a.filter(e=>e!==d&&e.distanceFromRoot<r);for(let e=0;e<Math.min(6,n.length);e++)d.addConnection(n[Math.floor(Math.random()*n.length)],.5)}function O(){d=new B(new w(0,0,0),0,0),d.size=1.8,a.push(d);const r=Math.floor(4*p)+2,l=5,g=(r-1)*l/2,i=[];for(let n=0;n<r;n++){i[n]=[];for(let e=0;e<r;e++){i[n][e]=[];for(let t=0;t<r;t++){const o=new w(n*l-g,e*l-g,t*l-g),s=o.length(),c=Math.min(4,Math.floor(s/l)),f=n===0||n===r-1||e===0||e===r-1||t===0||t===r-1,v=new B(o,c,f?1:0);v.distanceFromRoot=s,a.push(v),i[n][e][t]=v,n>0&&v.addConnection(i[n-1][e][t],.8),e>0&&v.addConnection(i[n][e-1][t],.8),t>0&&v.addConnection(i[n][e][t-1],.8),n>0&&e>0&&Math.random()<.3&&v.addConnection(i[n-1][e-1][t],.5),e>0&&t>0&&Math.random()<.3&&v.addConnection(i[n][e-1][t-1],.5)}}}const u=i[Math.floor(r/2)]?.[Math.floor(r/2)]?.[Math.floor(r/2)];u&&d.addConnection(u,1)}switch(Z%5){case 0:V();break;case 1:ee();break;case 2:X();break;case 3:y();break;case 4:O();break}if(p<1){const r=Math.ceil(a.length*Math.max(.3,p)),l=new Set([d]),g=a.filter(i=>i!==d).sort((i,u)=>{const n=i.connections.length*(1/(i.distanceFromRoot+1));return u.connections.length*(1/(u.distanceFromRoot+1))-n});for(let i=0;i<Math.min(r-1,g.length);i++)l.add(g[i]);a=a.filter(i=>l.has(i)),a.forEach(i=>{i.connections=i.connections.filter(u=>l.has(u.node))})}return{nodes:a,rootNode:d}}function et(){const p=[],a=[],d=[];for(let X=0;X<6e3;X++){const y=k.randFloat(60,180),O=Math.acos(k.randFloatSpread(2)),r=k.randFloat(0,Math.PI*2);p.push(y*Math.sin(O)*Math.cos(r),y*Math.sin(O)*Math.sin(r),y*Math.cos(O));const l=Math.random();l<.4?a.push(.8,.85,.95):l<.65?a.push(.7,.5,.9):l<.85?a.push(.4,.8,.85):a.push(.2,1,.9),d.push(k.randFloat(.08,.25))}const V=new he;V.setAttribute("position",new F(p,3)),V.setAttribute("color",new F(a,3)),V.setAttribute("size",new F(d,1));const ee=new ve({uniforms:{uTime:{value:0}},vertexShader:`
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vPhase;
      uniform float uTime;
      void main() {
        vColor = color;
        vPhase = position.x * 0.1 + position.y * 0.1;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Slower, more organic pulse - like breathing in the void
        float pulse = sin(uTime * 0.8 + vPhase * 50.0) * 0.4 + 0.6;
        float flicker = step(0.97, sin(uTime * 15.0 + position.z * 100.0)) * 0.5;
        gl_PointSize = size * (pulse + flicker) * (280.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,fragmentShader:`
      varying vec3 vColor;
      varying float vPhase;
      uniform float uTime;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        // Subtle color shift over time
        vec3 shiftedColor = vColor;
        shiftedColor.r += sin(uTime * 0.3 + vPhase) * 0.05;
        shiftedColor.b += cos(uTime * 0.2 + vPhase) * 0.08;
        gl_FragColor = vec4(shiftedColor, alpha * 0.7);
      }
    `,transparent:!0,depthWrite:!1,blending:pe});return new Re(V,ee)}const ut=({category:Z,experiment:p})=>{const a=m.useRef(null),d=m.useRef(null),V=m.useRef(null),ee=m.useRef(null),X=m.useRef(null),y=m.useRef(null),O=m.useRef(new Ve),r=m.useRef(null),l=m.useRef(null),g=m.useRef(null),i=m.useRef(null),u=m.useRef(0),n=m.useRef(0),e=m.useRef(!1),t=m.useRef(0),o=m.useRef(0),[s,c]=m.useState(!1),[f,v]=m.useState(3),[h,b]=m.useState(100),[I,N]=m.useState(0),E=m.useCallback((M,j)=>{const S=d.current;if(!S)return;r.current&&(S.remove(r.current),r.current.geometry.dispose(),r.current.material.dispose(),r.current=null),l.current&&(S.remove(l.current),l.current.geometry.dispose(),l.current.material.dispose(),l.current=null);const A=Ze(M,j);g.current=A,N(A.nodes.length);const C=Me,P=new he,R=[],U=[],re=[],W=[],te=[];A.nodes.forEach(z=>{R.push(z.position.x,z.position.y,z.position.z),U.push(z.type),re.push(z.size),te.push(z.distanceFromRoot);const q=Math.min(z.level,C.length-1),Q=C[q%C.length].clone();Q.offsetHSL(k.randFloatSpread(.03),k.randFloatSpread(.08),k.randFloatSpread(.08)),W.push(Q.r,Q.g,Q.b)}),P.setAttribute("position",new F(R,3)),P.setAttribute("nodeType",new F(U,1)),P.setAttribute("nodeSize",new F(re,1)),P.setAttribute("nodeColor",new F(W,3)),P.setAttribute("distanceFromRoot",new F(te,1));const Y={uTime:{value:0},uPulsePositions:{value:[new w(1e3,1e3,1e3),new w(1e3,1e3,1e3),new w(1e3,1e3,1e3)]},uPulseTimes:{value:[-1e3,-1e3,-1e3]},uPulseColors:{value:[new $(1,1,1),new $(1,1,1),new $(1,1,1)]},uPulseSpeed:{value:18},uBaseNodeSize:{value:.6}},K=new ve({uniforms:we.clone(Y),vertexShader:Se.vertexShader,fragmentShader:Se.fragmentShader,transparent:!0,depthWrite:!1,blending:pe}),J=new Re(P,K);S.add(J),r.current=J;const D=new he,oe=[],ne=[],se=[],G=[],x=[],_=[],L=new Set;let ie=0;A.nodes.forEach((z,q)=>{z.connections.forEach(Q=>{const ce=Q.node,ue=A.nodes.indexOf(ce);if(ue===-1)return;const ye=[Math.min(q,ue),Math.max(q,ue)].join("-");if(!L.has(ye)){L.add(ye);const de=z.position,fe=ce.position,Ce=20;for(let me=0;me<Ce;me++){const Ee=me/(Ce-1);se.push(Ee,0,0),G.push(de.x,de.y,de.z),x.push(fe.x,fe.y,fe.z),_.push(ie),ne.push(Q.strength);const je=Math.min(Math.floor((z.level+ce.level)/2),C.length-1),ae=C[je%C.length].clone();ae.offsetHSL(k.randFloatSpread(.03),k.randFloatSpread(.08),k.randFloatSpread(.08)),oe.push(ae.r,ae.g,ae.b)}ie++}})}),D.setAttribute("position",new F(se,3)),D.setAttribute("startPoint",new F(G,3)),D.setAttribute("endPoint",new F(x,3)),D.setAttribute("connectionStrength",new F(ne,1)),D.setAttribute("connectionColor",new F(oe,3)),D.setAttribute("pathIndex",new F(_,1));const Pe=new ve({uniforms:we.clone(Y),vertexShader:Te.vertexShader,fragmentShader:Te.fragmentShader,transparent:!0,depthWrite:!1,blending:pe}),xe=new We(D,Pe);S.add(xe),l.current=xe,C.forEach((z,q)=>{q<3&&(Pe.uniforms.uPulseColors.value[q].copy(z),K.uniforms.uPulseColors.value[q].copy(z))})},[]);m.useEffect(()=>{if(!a.current)return;const M=a.current,j=M.clientWidth,S=M.clientHeight,A=new qe;A.fog=new $e(656658,.0025),d.current=A;const C=new Ke(65,j/S,.1,1e3);C.position.set(0,8,28),V.current=C;const P=new Ae({antialias:!0,powerPreference:"high-performance"});P.setSize(j,S),P.setPixelRatio(Math.min(window.devicePixelRatio,2)),P.setClearColor(0),P.outputColorSpace=Qe,M.appendChild(P.domElement),ee.current=P;const R=new De(C,P.domElement);R.enableDamping=!0,R.dampingFactor=.05,R.rotateSpeed=.6,R.minDistance=8,R.maxDistance=80,R.autoRotate=!0,R.autoRotateSpeed=.2,R.enablePan=!1,y.current=R;const U=new Ge(P);U.addPass(new _e(A,C));const re=new Le(new be(j,S),1.8,.6,.7);U.addPass(re),U.addPass(new Be),X.current=U;const W=et();A.add(W),i.current=W,E(3,1);const te=new Xe,Y=new be,K=new Ye(new w(0,0,1),0),J=new w,D=G=>{if(!e.current&&(Y.x=G.clientX/j*2-1,Y.y=-(G.clientY/S)*2+1,te.setFromCamera(Y,C),K.normal.copy(C.position).normalize(),K.constant=-K.normal.dot(C.position)+C.position.length()*.5,te.ray.intersectPlane(K,J))){const x=O.current.getElapsedTime();if(r.current&&l.current){u.current=(u.current+1)%3;const _=u.current;r.current.material.uniforms.uPulsePositions.value[_].copy(J),r.current.material.uniforms.uPulseTimes.value[_]=x,l.current.material.uniforms.uPulsePositions.value[_].copy(J),l.current.material.uniforms.uPulseTimes.value[_]=x;const L=Me,ie=L[Math.floor(Math.random()*L.length)];r.current.material.uniforms.uPulseColors.value[_].copy(ie),l.current.material.uniforms.uPulseColors.value[_].copy(ie)}}};P.domElement.addEventListener("click",D);let oe;const ne=()=>{oe=requestAnimationFrame(ne);const x=O.current.getElapsedTime()-o.current;if(!e.current){if(r.current&&(r.current.material.uniforms.uTime.value=x,r.current.rotation.y=Math.sin(x*.03)*.08),l.current&&(l.current.material.uniforms.uTime.value=x,l.current.rotation.y=Math.sin(x*.03)*.08),x-n.current>8&&(n.current=x,r.current&&l.current)){u.current=(u.current+1)%3;const L=u.current;r.current.material.uniforms.uPulsePositions.value[L].set(0,0,0),r.current.material.uniforms.uPulseTimes.value[L]=x,l.current.material.uniforms.uPulsePositions.value[L].set(0,0,0),l.current.material.uniforms.uPulseTimes.value[L]=x}W&&(W.rotation.y+=15e-5,W.material.uniforms.uTime.value=x)}R.update(),U.render()};ne();const se=()=>{const G=M.clientWidth,x=M.clientHeight;C.aspect=G/x,C.updateProjectionMatrix(),P.setSize(G,x),U.setSize(G,x)};return window.addEventListener("resize",se),()=>{window.removeEventListener("resize",se),P.domElement.removeEventListener("click",D),cancelAnimationFrame(oe),R.dispose(),P.dispose(),M.removeChild(P.domElement)}},[E]);const H=m.useCallback(()=>{const M=(f+1)%5;v(M),E(M,h/100),y.current&&(y.current.autoRotate=!1,setTimeout(()=>{y.current&&(y.current.autoRotate=!0)},2500))},[f,h,E]),le=m.useCallback(()=>{const M=O.current.getElapsedTime();c(j=>{const S=!j;return e.current=S,S?t.current=M:o.current+=M-t.current,y.current&&(y.current.autoRotate=!S),S})},[]),Fe=m.useCallback(()=>{y.current&&(y.current.reset(),y.current.autoRotate=!1,setTimeout(()=>{y.current&&(y.current.autoRotate=!0)},2e3))},[]),Ie=m.useCallback(M=>{const j=parseInt(M.target.value,10);b(j)},[]),ge=m.useCallback(()=>{E(f,h/100)},[f,h,E]),Ne=m.useMemo(()=>[{label:"formation",value:Je[f]},{label:"nodes",value:I},{label:"density",value:`${h}%`},{label:"state",value:s?"frozen":"flowing"}],[f,I,h,s]),ke=[{id:"morph",label:"morph()",onClick:H},{id:"pause",label:s?"play()":"freeze()",onClick:le,active:s},{id:"reset",label:"reset()",onClick:Fe,variant:"reset"}];return T.jsxs("div",{className:"fixed inset-0 flex flex-col",children:[T.jsxs("header",{className:"relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm",children:[T.jsxs("div",{className:"flex items-center gap-2 sm:gap-4",children:[T.jsx(Ue,{currentCategory:Z.slug,currentExperiment:p.slug}),T.jsx("h1",{className:"text-xl text-glow hidden sm:block",style:{color:p.color},children:p.name})]}),T.jsx(He,{metrics:Ne})]}),T.jsx("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm",children:T.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[T.jsx(Oe,{controls:ke}),T.jsxs("div",{className:"flex items-center gap-2 ml-2",children:[T.jsx("span",{className:"text-xs text-void-green/50 font-mono",children:"density:"}),T.jsx("input",{type:"range",min:"30",max:"100",value:h,onChange:Ie,onMouseUp:ge,onTouchEnd:ge,className:"w-24 h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer accent-void-cyan","data-testid":"density-slider"}),T.jsxs("span",{className:"text-xs text-void-green font-mono w-10",children:[h,"%"]})]})]})}),T.jsx("div",{className:"flex-1 min-h-0 relative bg-void-dark",children:T.jsx("div",{ref:a,className:"absolute inset-0 w-full h-full touch-none","data-testid":"quantum-neural-container"})})]})};export{ut as default};
