import{x as Fa,y as Pt,z as Oa,D as ut,m as $e,E as oa,G as Qt,V as st,J as Ba,K as Ye,X as ei,Y as pt,Z as In,_ as ti,W as kt,p as it,$ as Kt,H as nn,a0 as Ot,a1 as bt,a as vt,a2 as Jt,a3 as mn,a4 as Ga,a5 as jt,a6 as zt,b as Bt,j as Xn,i as Ha,a7 as ln,B as sa,n as Va,a8 as ka,f as ht,a9 as za,aa as Mn,ab as At,ac as pn,ad as Yn,ae as en,af as tn,ag as ca,ah as Wa,ai as Xa,aj as la,ak as Rt,al as Nn,k as Ut,N as Lt,am as _n,an as fn,ao as Vt,ap as hn,aq as Ya,ar as qa,as as Yt,at as Ka,au as $a,av as Za,aw as Qa,ax as Ja,ay as ja,az as er,aA as tr,aB as nr,aC as ir,aD as ar,aE as rr,aF as or,aG as sr,aH as cr,aI as lr,aJ as fr,aK as Tn,aL as on,aM as dr,aN as Zt,aO as ur,aP as pr,aQ as hr,aR as xr,aS as fa,aT as mr,aU as _r,aV as vr,g as gr,aW as Be,aX as Sr,aY as Er,aZ as Mr,a_ as da,a$ as Tt,b0 as ua,b1 as pa,b2 as ha,b3 as xn,b4 as xa,b5 as ma,b6 as _a,b7 as va,b8 as Tr,b9 as br,ba as Ar,bb as Rr,bc as ga,bd as Ft,be as Cr,bf as Pr,bg as Lr,bh as bn,bi as An,bj as Rn,bk as Cn,q as Xe,bl as ni,bm as ii,bn as ai,bo as ri,bp as oi,bq as si,br as ci,bs as li,bt as fi,bu as di,bv as ui,bw as pi,bx as hi,by as xi,bz as mi,bA as _i,bB as vi,bC as gi,bD as Si,bE as Ei,bF as Mi,bG as Ti,bH as bi,bI as Ai,bJ as Ri,bK as Ci,bL as Pi,bM as Li,bN as yn,bO as Fn,bP as On,bQ as Bn,bR as Gn,bS as Hn,bT as Vn,bU as Ur,bV as Ui,bW as Dr,bX as dn,bY as wr,bZ as Di,b_ as wi,A as Ii,b$ as kn,c0 as zn,c1 as Ir,c2 as Sa,U as Nr,c3 as dt,c4 as yr,c5 as Fr,c6 as Ea,c7 as Ni,c8 as Ma,c9 as yi,ca as Ta,cb as Or,cc as Br,cd as Gr,ce as Fi,cf as Hr,cg as Vr,w as kr,v as zr,u as Wr,t as Xr,s as Yr,r as qr,L as Kr,ch as $r,ci as Zr,cj as Qr,ck as Jr,cl as jr,cm as eo,cn as to,co as no,cp as io}from"./three-core-DvEXxghc.js";function ba(){let e=null,n=!1,t=null,i=null;function c(o,h){t(o,h),i=e.requestAnimationFrame(c)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(c),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(o){t=o},setContext:function(o){e=o}}}function ao(e){const n=new WeakMap;function t(d,R){const E=d.array,U=d.usage,g=E.byteLength,S=e.createBuffer();e.bindBuffer(R,S),e.bufferData(R,E,U),d.onUploadCallback();let b;if(E instanceof Float32Array)b=e.FLOAT;else if(typeof Float16Array<"u"&&E instanceof Float16Array)b=e.HALF_FLOAT;else if(E instanceof Uint16Array)d.isFloat16BufferAttribute?b=e.HALF_FLOAT:b=e.UNSIGNED_SHORT;else if(E instanceof Int16Array)b=e.SHORT;else if(E instanceof Uint32Array)b=e.UNSIGNED_INT;else if(E instanceof Int32Array)b=e.INT;else if(E instanceof Int8Array)b=e.BYTE;else if(E instanceof Uint8Array)b=e.UNSIGNED_BYTE;else if(E instanceof Uint8ClampedArray)b=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+E);return{buffer:S,type:b,bytesPerElement:E.BYTES_PER_ELEMENT,version:d.version,size:g}}function i(d,R,E){const U=R.array,g=R.updateRanges;if(e.bindBuffer(E,d),g.length===0)e.bufferSubData(E,0,U);else{g.sort((b,B)=>b.start-B.start);let S=0;for(let b=1;b<g.length;b++){const B=g[S],D=g[b];D.start<=B.start+B.count+1?B.count=Math.max(B.count,D.start+D.count-B.start):(++S,g[S]=D)}g.length=S+1;for(let b=0,B=g.length;b<B;b++){const D=g[b];e.bufferSubData(E,D.start*U.BYTES_PER_ELEMENT,U,D.start,D.count)}R.clearUpdateRanges()}R.onUploadCallback()}function c(d){return d.isInterleavedBufferAttribute&&(d=d.data),n.get(d)}function o(d){d.isInterleavedBufferAttribute&&(d=d.data);const R=n.get(d);R&&(e.deleteBuffer(R.buffer),n.delete(d))}function h(d,R){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const U=n.get(d);(!U||U.version<d.version)&&n.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const E=n.get(d);if(E===void 0)n.set(d,t(d,R));else if(E.version<d.version){if(E.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(E.buffer,d,R),E.version=d.version}}return{get:c,remove:o,update:h}}var ro=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,oo=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,so=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,co=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,lo=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,fo=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,uo=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,po=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,ho=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,xo=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,mo=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,_o=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,vo=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,go=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,So=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Eo=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Mo=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,To=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,bo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ao=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Ro=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Co=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Po=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Lo=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Uo=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Do=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,wo=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Io=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,No=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,yo=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Fo="gl_FragColor = linearToOutputTexel( gl_FragColor );",Oo=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Bo=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Go=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Ho=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Vo=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ko=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,zo=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Wo=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Xo=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Yo=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,qo=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Ko=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$o=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Zo=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Qo=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Jo=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,jo=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,es=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ts=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ns=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,is=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,as=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,rs=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,os=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,ss=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,cs=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ls=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fs=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ds=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,us=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ps=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,hs=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,xs=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ms=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,_s=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,vs=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,gs=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ss=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Es=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Ms=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ts=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,bs=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,As=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rs=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cs=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ps=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ls=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Us=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ds=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ws=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Is=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ns=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,ys=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Fs=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Os=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Bs=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Gs=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Hs=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Vs=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,ks=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,zs=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Ws=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Xs=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ys=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,qs=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Ks=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,$s=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Zs=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Qs=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Js=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,js=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ec=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,tc=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,nc=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ic=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,ac=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const rc=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,oc=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cc=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,fc=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,dc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,uc=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,pc=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,hc=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,xc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,mc=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_c=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,vc=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Sc=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ec=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Mc=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tc=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,bc=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ac=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Rc=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Cc=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pc=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lc=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Uc=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Dc=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wc=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ic=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Nc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,yc=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Fc=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Oc=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ue={alphahash_fragment:ro,alphahash_pars_fragment:oo,alphamap_fragment:so,alphamap_pars_fragment:co,alphatest_fragment:lo,alphatest_pars_fragment:fo,aomap_fragment:uo,aomap_pars_fragment:po,batching_pars_vertex:ho,batching_vertex:xo,begin_vertex:mo,beginnormal_vertex:_o,bsdfs:vo,iridescence_fragment:go,bumpmap_pars_fragment:So,clipping_planes_fragment:Eo,clipping_planes_pars_fragment:Mo,clipping_planes_pars_vertex:To,clipping_planes_vertex:bo,color_fragment:Ao,color_pars_fragment:Ro,color_pars_vertex:Co,color_vertex:Po,common:Lo,cube_uv_reflection_fragment:Uo,defaultnormal_vertex:Do,displacementmap_pars_vertex:wo,displacementmap_vertex:Io,emissivemap_fragment:No,emissivemap_pars_fragment:yo,colorspace_fragment:Fo,colorspace_pars_fragment:Oo,envmap_fragment:Bo,envmap_common_pars_fragment:Go,envmap_pars_fragment:Ho,envmap_pars_vertex:Vo,envmap_physical_pars_fragment:Jo,envmap_vertex:ko,fog_vertex:zo,fog_pars_vertex:Wo,fog_fragment:Xo,fog_pars_fragment:Yo,gradientmap_pars_fragment:qo,lightmap_pars_fragment:Ko,lights_lambert_fragment:$o,lights_lambert_pars_fragment:Zo,lights_pars_begin:Qo,lights_toon_fragment:jo,lights_toon_pars_fragment:es,lights_phong_fragment:ts,lights_phong_pars_fragment:ns,lights_physical_fragment:is,lights_physical_pars_fragment:as,lights_fragment_begin:rs,lights_fragment_maps:os,lights_fragment_end:ss,logdepthbuf_fragment:cs,logdepthbuf_pars_fragment:ls,logdepthbuf_pars_vertex:fs,logdepthbuf_vertex:ds,map_fragment:us,map_pars_fragment:ps,map_particle_fragment:hs,map_particle_pars_fragment:xs,metalnessmap_fragment:ms,metalnessmap_pars_fragment:_s,morphinstance_vertex:vs,morphcolor_vertex:gs,morphnormal_vertex:Ss,morphtarget_pars_vertex:Es,morphtarget_vertex:Ms,normal_fragment_begin:Ts,normal_fragment_maps:bs,normal_pars_fragment:As,normal_pars_vertex:Rs,normal_vertex:Cs,normalmap_pars_fragment:Ps,clearcoat_normal_fragment_begin:Ls,clearcoat_normal_fragment_maps:Us,clearcoat_pars_fragment:Ds,iridescence_pars_fragment:ws,opaque_fragment:Is,packing:Ns,premultiplied_alpha_fragment:ys,project_vertex:Fs,dithering_fragment:Os,dithering_pars_fragment:Bs,roughnessmap_fragment:Gs,roughnessmap_pars_fragment:Hs,shadowmap_pars_fragment:Vs,shadowmap_pars_vertex:ks,shadowmap_vertex:zs,shadowmask_pars_fragment:Ws,skinbase_vertex:Xs,skinning_pars_vertex:Ys,skinning_vertex:qs,skinnormal_vertex:Ks,specularmap_fragment:$s,specularmap_pars_fragment:Zs,tonemapping_fragment:Qs,tonemapping_pars_fragment:Js,transmission_fragment:js,transmission_pars_fragment:ec,uv_pars_fragment:tc,uv_pars_vertex:nc,uv_vertex:ic,worldpos_vertex:ac,background_vert:rc,background_frag:oc,backgroundCube_vert:sc,backgroundCube_frag:cc,cube_vert:lc,cube_frag:fc,depth_vert:dc,depth_frag:uc,distanceRGBA_vert:pc,distanceRGBA_frag:hc,equirect_vert:xc,equirect_frag:mc,linedashed_vert:_c,linedashed_frag:vc,meshbasic_vert:gc,meshbasic_frag:Sc,meshlambert_vert:Ec,meshlambert_frag:Mc,meshmatcap_vert:Tc,meshmatcap_frag:bc,meshnormal_vert:Ac,meshnormal_frag:Rc,meshphong_vert:Cc,meshphong_frag:Pc,meshphysical_vert:Lc,meshphysical_frag:Uc,meshtoon_vert:Dc,meshtoon_frag:wc,points_vert:Ic,points_frag:Nc,shadow_vert:yc,shadow_frag:Fc,sprite_vert:Oc,sprite_frag:Bc},ne={common:{diffuse:{value:new $e(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new ht(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new $e(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new $e(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new $e(16777215)},opacity:{value:1},center:{value:new ht(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},Et={basic:{uniforms:dt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.fog]),vertexShader:Ue.meshbasic_vert,fragmentShader:Ue.meshbasic_frag},lambert:{uniforms:dt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,ne.lights,{emissive:{value:new $e(0)}}]),vertexShader:Ue.meshlambert_vert,fragmentShader:Ue.meshlambert_frag},phong:{uniforms:dt([ne.common,ne.specularmap,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,ne.lights,{emissive:{value:new $e(0)},specular:{value:new $e(1118481)},shininess:{value:30}}]),vertexShader:Ue.meshphong_vert,fragmentShader:Ue.meshphong_frag},standard:{uniforms:dt([ne.common,ne.envmap,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.roughnessmap,ne.metalnessmap,ne.fog,ne.lights,{emissive:{value:new $e(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag},toon:{uniforms:dt([ne.common,ne.aomap,ne.lightmap,ne.emissivemap,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.gradientmap,ne.fog,ne.lights,{emissive:{value:new $e(0)}}]),vertexShader:Ue.meshtoon_vert,fragmentShader:Ue.meshtoon_frag},matcap:{uniforms:dt([ne.common,ne.bumpmap,ne.normalmap,ne.displacementmap,ne.fog,{matcap:{value:null}}]),vertexShader:Ue.meshmatcap_vert,fragmentShader:Ue.meshmatcap_frag},points:{uniforms:dt([ne.points,ne.fog]),vertexShader:Ue.points_vert,fragmentShader:Ue.points_frag},dashed:{uniforms:dt([ne.common,ne.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ue.linedashed_vert,fragmentShader:Ue.linedashed_frag},depth:{uniforms:dt([ne.common,ne.displacementmap]),vertexShader:Ue.depth_vert,fragmentShader:Ue.depth_frag},normal:{uniforms:dt([ne.common,ne.bumpmap,ne.normalmap,ne.displacementmap,{opacity:{value:1}}]),vertexShader:Ue.meshnormal_vert,fragmentShader:Ue.meshnormal_frag},sprite:{uniforms:dt([ne.sprite,ne.fog]),vertexShader:Ue.sprite_vert,fragmentShader:Ue.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ue.background_vert,fragmentShader:Ue.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:Ue.backgroundCube_vert,fragmentShader:Ue.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ue.cube_vert,fragmentShader:Ue.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ue.equirect_vert,fragmentShader:Ue.equirect_frag},distanceRGBA:{uniforms:dt([ne.common,ne.displacementmap,{referencePosition:{value:new st},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ue.distanceRGBA_vert,fragmentShader:Ue.distanceRGBA_frag},shadow:{uniforms:dt([ne.lights,ne.fog,{color:{value:new $e(0)},opacity:{value:1}}]),vertexShader:Ue.shadow_vert,fragmentShader:Ue.shadow_frag}};Et.physical={uniforms:dt([Et.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new ht(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new $e(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new ht},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new $e(0)},specularColor:{value:new $e(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new ht},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:Ue.meshphysical_vert,fragmentShader:Ue.meshphysical_frag};const sn={r:0,b:0,g:0},It=new Ma,Gc=new Qt;function Hc(e,n,t,i,c,o,h){const d=new $e(0);let R=o===!0?0:1,E,U,g=null,S=0,b=null;function B(v){let L=v.isScene===!0?v.background:null;return L&&L.isTexture&&(L=(v.backgroundBlurriness>0?t:n).get(L)),L}function D(v){let L=!1;const N=B(v);N===null?r(d,R):N&&N.isColor&&(r(N,1),L=!0);const _=e.xr.getEnvironmentBlendMode();_==="additive"?i.buffers.color.setClear(0,0,0,1,h):_==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,h),(e.autoClear||L)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function l(v,L){const N=B(L);N&&(N.isCubeTexture||N.mapping===_n)?(U===void 0&&(U=new Bt(new sa(1,1,1),new Ut({name:"BackgroundCubeMaterial",uniforms:Ni(Et.backgroundCube.uniforms),vertexShader:Et.backgroundCube.vertexShader,fragmentShader:Et.backgroundCube.fragmentShader,side:vt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(_,y,Q){this.matrixWorld.copyPosition(Q.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),c.update(U)),It.copy(L.backgroundRotation),It.x*=-1,It.y*=-1,It.z*=-1,N.isCubeTexture&&N.isRenderTargetTexture===!1&&(It.y*=-1,It.z*=-1),U.material.uniforms.envMap.value=N,U.material.uniforms.flipEnvMap.value=N.isCubeTexture&&N.isRenderTargetTexture===!1?-1:1,U.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(Gc.makeRotationFromEuler(It)),U.material.toneMapped=it.getTransfer(N.colorSpace)!==Xe,(g!==N||S!==N.version||b!==e.toneMapping)&&(U.material.needsUpdate=!0,g=N,S=N.version,b=e.toneMapping),U.layers.enableAll(),v.unshift(U,U.geometry,U.material,0,0,null)):N&&N.isTexture&&(E===void 0&&(E=new Bt(new va(2,2),new Ut({name:"BackgroundMaterial",uniforms:Ni(Et.background.uniforms),vertexShader:Et.background.vertexShader,fragmentShader:Et.background.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),E.geometry.deleteAttribute("normal"),Object.defineProperty(E.material,"map",{get:function(){return this.uniforms.t2D.value}}),c.update(E)),E.material.uniforms.t2D.value=N,E.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,E.material.toneMapped=it.getTransfer(N.colorSpace)!==Xe,N.matrixAutoUpdate===!0&&N.updateMatrix(),E.material.uniforms.uvTransform.value.copy(N.matrix),(g!==N||S!==N.version||b!==e.toneMapping)&&(E.material.needsUpdate=!0,g=N,S=N.version,b=e.toneMapping),E.layers.enableAll(),v.unshift(E,E.geometry,E.material,0,0,null))}function r(v,L){v.getRGB(sn,Ea(e)),i.buffers.color.setClear(sn.r,sn.g,sn.b,L,h)}function P(){U!==void 0&&(U.geometry.dispose(),U.material.dispose(),U=void 0),E!==void 0&&(E.geometry.dispose(),E.material.dispose(),E=void 0)}return{getClearColor:function(){return d},setClearColor:function(v,L=1){d.set(v),R=L,r(d,R)},getClearAlpha:function(){return R},setClearAlpha:function(v){R=v,r(d,R)},render:D,addToRenderList:l,dispose:P}}function Vc(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},c=S(null);let o=c,h=!1;function d(f,A,O,z,W){let $=!1;const X=g(z,O,A);o!==X&&(o=X,E(o.object)),$=b(f,z,O,W),$&&B(f,z,O,W),W!==null&&n.update(W,e.ELEMENT_ARRAY_BUFFER),($||h)&&(h=!1,L(f,A,O,z),W!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(W).buffer))}function R(){return e.createVertexArray()}function E(f){return e.bindVertexArray(f)}function U(f){return e.deleteVertexArray(f)}function g(f,A,O){const z=O.wireframe===!0;let W=i[f.id];W===void 0&&(W={},i[f.id]=W);let $=W[A.id];$===void 0&&($={},W[A.id]=$);let X=$[z];return X===void 0&&(X=S(R()),$[z]=X),X}function S(f){const A=[],O=[],z=[];for(let W=0;W<t;W++)A[W]=0,O[W]=0,z[W]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:O,attributeDivisors:z,object:f,attributes:{},index:null}}function b(f,A,O,z){const W=o.attributes,$=A.attributes;let X=0;const re=O.getAttributes();for(const H in re)if(re[H].location>=0){const pe=W[H];let De=$[H];if(De===void 0&&(H==="instanceMatrix"&&f.instanceMatrix&&(De=f.instanceMatrix),H==="instanceColor"&&f.instanceColor&&(De=f.instanceColor)),pe===void 0||pe.attribute!==De||De&&pe.data!==De.data)return!0;X++}return o.attributesNum!==X||o.index!==z}function B(f,A,O,z){const W={},$=A.attributes;let X=0;const re=O.getAttributes();for(const H in re)if(re[H].location>=0){let pe=$[H];pe===void 0&&(H==="instanceMatrix"&&f.instanceMatrix&&(pe=f.instanceMatrix),H==="instanceColor"&&f.instanceColor&&(pe=f.instanceColor));const De={};De.attribute=pe,pe&&pe.data&&(De.data=pe.data),W[H]=De,X++}o.attributes=W,o.attributesNum=X,o.index=z}function D(){const f=o.newAttributes;for(let A=0,O=f.length;A<O;A++)f[A]=0}function l(f){r(f,0)}function r(f,A){const O=o.newAttributes,z=o.enabledAttributes,W=o.attributeDivisors;O[f]=1,z[f]===0&&(e.enableVertexAttribArray(f),z[f]=1),W[f]!==A&&(e.vertexAttribDivisor(f,A),W[f]=A)}function P(){const f=o.newAttributes,A=o.enabledAttributes;for(let O=0,z=A.length;O<z;O++)A[O]!==f[O]&&(e.disableVertexAttribArray(O),A[O]=0)}function v(f,A,O,z,W,$,X){X===!0?e.vertexAttribIPointer(f,A,O,W,$):e.vertexAttribPointer(f,A,O,z,W,$)}function L(f,A,O,z){D();const W=z.attributes,$=O.getAttributes(),X=A.defaultAttributeValues;for(const re in $){const H=$[re];if(H.location>=0){let fe=W[re];if(fe===void 0&&(re==="instanceMatrix"&&f.instanceMatrix&&(fe=f.instanceMatrix),re==="instanceColor"&&f.instanceColor&&(fe=f.instanceColor)),fe!==void 0){const pe=fe.normalized,De=fe.itemSize,Ve=n.get(fe);if(Ve===void 0)continue;const Ze=Ve.buffer,qe=Ve.type,Qe=Ve.bytesPerElement,V=qe===e.INT||qe===e.UNSIGNED_INT||fe.gpuType===ga;if(fe.isInterleavedBufferAttribute){const q=fe.data,le=q.stride,Le=fe.offset;if(q.isInstancedInterleavedBuffer){for(let _e=0;_e<H.locationSize;_e++)r(H.location+_e,q.meshPerAttribute);f.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=q.meshPerAttribute*q.count)}else for(let _e=0;_e<H.locationSize;_e++)l(H.location+_e);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let _e=0;_e<H.locationSize;_e++)v(H.location+_e,De/H.locationSize,qe,pe,le*Qe,(Le+De/H.locationSize*_e)*Qe,V)}else{if(fe.isInstancedBufferAttribute){for(let q=0;q<H.locationSize;q++)r(H.location+q,fe.meshPerAttribute);f.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let q=0;q<H.locationSize;q++)l(H.location+q);e.bindBuffer(e.ARRAY_BUFFER,Ze);for(let q=0;q<H.locationSize;q++)v(H.location+q,De/H.locationSize,qe,pe,De*Qe,De/H.locationSize*q*Qe,V)}}else if(X!==void 0){const pe=X[re];if(pe!==void 0)switch(pe.length){case 2:e.vertexAttrib2fv(H.location,pe);break;case 3:e.vertexAttrib3fv(H.location,pe);break;case 4:e.vertexAttrib4fv(H.location,pe);break;default:e.vertexAttrib1fv(H.location,pe)}}}}P()}function N(){Q();for(const f in i){const A=i[f];for(const O in A){const z=A[O];for(const W in z)U(z[W].object),delete z[W];delete A[O]}delete i[f]}}function _(f){if(i[f.id]===void 0)return;const A=i[f.id];for(const O in A){const z=A[O];for(const W in z)U(z[W].object),delete z[W];delete A[O]}delete i[f.id]}function y(f){for(const A in i){const O=i[A];if(O[f.id]===void 0)continue;const z=O[f.id];for(const W in z)U(z[W].object),delete z[W];delete O[f.id]}}function Q(){p(),h=!0,o!==c&&(o=c,E(o.object))}function p(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:d,reset:Q,resetDefaultState:p,dispose:N,releaseStatesOfGeometry:_,releaseStatesOfProgram:y,initAttributes:D,enableAttribute:l,disableUnusedAttributes:P}}function kc(e,n,t){let i;function c(E){i=E}function o(E,U){e.drawArrays(i,E,U),t.update(U,i,1)}function h(E,U,g){g!==0&&(e.drawArraysInstanced(i,E,U,g),t.update(U,i,g))}function d(E,U,g){if(g===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,E,0,U,0,g);let b=0;for(let B=0;B<g;B++)b+=U[B];t.update(b,i,1)}function R(E,U,g,S){if(g===0)return;const b=n.get("WEBGL_multi_draw");if(b===null)for(let B=0;B<E.length;B++)h(E[B],U[B],S[B]);else{b.multiDrawArraysInstancedWEBGL(i,E,0,U,0,S,0,g);let B=0;for(let D=0;D<g;D++)B+=U[D]*S[D];t.update(B,i,1)}}this.setMode=c,this.render=o,this.renderInstances=h,this.renderMultiDraw=d,this.renderMultiDrawInstances=R}function zc(e,n,t,i){let c;function o(){if(c!==void 0)return c;if(n.has("EXT_texture_filter_anisotropic")===!0){const y=n.get("EXT_texture_filter_anisotropic");c=e.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else c=0;return c}function h(y){return!(y!==At&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(y){const Q=y===nn&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(y!==Ot&&i.convert(y)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==Ft&&!Q)}function R(y){if(y==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let E=t.precision!==void 0?t.precision:"highp";const U=R(E);U!==E&&(Ye("WebGLRenderer:",E,"not supported, using",U,"instead."),E=U);const g=t.logarithmicDepthBuffer===!0,S=t.reversedDepthBuffer===!0&&n.has("EXT_clip_control"),b=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),B=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),D=e.getParameter(e.MAX_TEXTURE_SIZE),l=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),r=e.getParameter(e.MAX_VERTEX_ATTRIBS),P=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),v=e.getParameter(e.MAX_VARYING_VECTORS),L=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),N=B>0,_=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:R,textureFormatReadable:h,textureTypeReadable:d,precision:E,logarithmicDepthBuffer:g,reversedDepthBuffer:S,maxTextures:b,maxVertexTextures:B,maxTextureSize:D,maxCubemapSize:l,maxAttributes:r,maxVertexUniforms:P,maxVaryings:v,maxFragmentUniforms:L,vertexTextures:N,maxSamples:_}}function Wc(e){const n=this;let t=null,i=0,c=!1,o=!1;const h=new gr,d=new Be,R={value:null,needsUpdate:!1};this.uniform=R,this.numPlanes=0,this.numIntersection=0,this.init=function(g,S){const b=g.length!==0||S||i!==0||c;return c=S,i=g.length,b},this.beginShadows=function(){o=!0,U(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(g,S){t=U(g,S,0)},this.setState=function(g,S,b){const B=g.clippingPlanes,D=g.clipIntersection,l=g.clipShadows,r=e.get(g);if(!c||B===null||B.length===0||o&&!l)o?U(null):E();else{const P=o?0:i,v=P*4;let L=r.clippingState||null;R.value=L,L=U(B,S,v,b);for(let N=0;N!==v;++N)L[N]=t[N];r.clippingState=L,this.numIntersection=D?this.numPlanes:0,this.numPlanes+=P}};function E(){R.value!==t&&(R.value=t,R.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function U(g,S,b,B){const D=g!==null?g.length:0;let l=null;if(D!==0){if(l=R.value,B!==!0||l===null){const r=b+D*4,P=S.matrixWorldInverse;d.getNormalMatrix(P),(l===null||l.length<r)&&(l=new Float32Array(r));for(let v=0,L=b;v!==D;++v,L+=4)h.copy(g[v]).applyMatrix4(P,d),h.normal.toArray(l,L),l[L+3]=h.constant}R.value=l,R.needsUpdate=!0}return n.numPlanes=D,n.numIntersection=0,l}}function Xc(e){let n=new WeakMap;function t(h,d){return d===kn?h.mapping=jt:d===zn&&(h.mapping=zt),h}function i(h){if(h&&h.isTexture){const d=h.mapping;if(d===kn||d===zn)if(n.has(h)){const R=n.get(h).texture;return t(R,h.mapping)}else{const R=h.image;if(R&&R.height>0){const E=new Ir(R.height);return E.fromEquirectangularTexture(e,h),n.set(h,E),h.addEventListener("dispose",c),t(E.texture,h.mapping)}else return null}}return h}function c(h){const d=h.target;d.removeEventListener("dispose",c);const R=n.get(d);R!==void 0&&(n.delete(d),R.dispose())}function o(){n=new WeakMap}return{get:i,dispose:o}}const Ct=4,Oi=[.125,.215,.35,.446,.526,.582],yt=20,Yc=256,qt=new Ha,Bi=new $e;let Pn=null,Ln=0,Un=0,Dn=!1;const qc=new st;class Gi{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(n,t=0,i=.1,c=100,o={}){const{size:h=256,position:d=qc}=o;Pn=this._renderer.getRenderTarget(),Ln=this._renderer.getActiveCubeFace(),Un=this._renderer.getActiveMipmapLevel(),Dn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(h);const R=this._allocateTargets();return R.depthBuffer=!0,this._sceneToCubeUV(n,i,c,R,d),t>0&&this._blur(R,0,0,t),this._applyPMREM(R),this._cleanup(R),R}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ki(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Vi(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodMeshes.length;n++)this._lodMeshes[n].geometry.dispose()}_cleanup(n){this._renderer.setRenderTarget(Pn,Ln,Un),this._renderer.xr.enabled=Dn,n.scissorTest=!1,Ht(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===jt||n.mapping===zt?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),Pn=this._renderer.getRenderTarget(),Ln=this._renderer.getActiveCubeFace(),Un=this._renderer.getActiveMipmapLevel(),Dn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Rt,minFilter:Rt,generateMipmaps:!1,type:nn,format:At,colorSpace:mn,depthBuffer:!1},c=Hi(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Hi(n,t,i);const{_lodMax:o}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Kc(o)),this._blurMaterial=Zc(o,n,t),this._ggxMaterial=$c(o,n,t)}return c}_compileMaterial(n){const t=new Bt(new Xn,n);this._renderer.compile(t,qt)}_sceneToCubeUV(n,t,i,c,o){const R=new ln(90,1,t,i),E=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],g=this._renderer,S=g.autoClear,b=g.toneMapping;g.getClearColor(Bi),g.toneMapping=Pt,g.autoClear=!1,g.state.buffers.depth.getReversed()&&(g.setRenderTarget(c),g.clearDepth(),g.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Bt(new sa,new Va({name:"PMREM.Background",side:vt,depthWrite:!1,depthTest:!1})));const D=this._backgroundBox,l=D.material;let r=!1;const P=n.background;P?P.isColor&&(l.color.copy(P),n.background=null,r=!0):(l.color.copy(Bi),r=!0);for(let v=0;v<6;v++){const L=v%3;L===0?(R.up.set(0,E[v],0),R.position.set(o.x,o.y,o.z),R.lookAt(o.x+U[v],o.y,o.z)):L===1?(R.up.set(0,0,E[v]),R.position.set(o.x,o.y,o.z),R.lookAt(o.x,o.y+U[v],o.z)):(R.up.set(0,E[v],0),R.position.set(o.x,o.y,o.z),R.lookAt(o.x,o.y,o.z+U[v]));const N=this._cubeSize;Ht(c,L*N,v>2?N:0,N,N),g.setRenderTarget(c),r&&g.render(D,R),g.render(n,R)}g.toneMapping=b,g.autoClear=S,n.background=P}_textureToCubeUV(n,t){const i=this._renderer,c=n.mapping===jt||n.mapping===zt;c?(this._cubemapMaterial===null&&(this._cubemapMaterial=ki()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Vi());const o=c?this._cubemapMaterial:this._equirectMaterial,h=this._lodMeshes[0];h.material=o;const d=o.uniforms;d.envMap.value=n;const R=this._cubeSize;Ht(t,0,0,3*R,2*R),i.setRenderTarget(t),i.render(h,qt)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const c=this._lodMeshes.length;for(let o=1;o<c;o++)this._applyGGXFilter(n,o-1,o);t.autoClear=i}_applyGGXFilter(n,t,i){const c=this._renderer,o=this._pingPongRenderTarget,h=this._ggxMaterial,d=this._lodMeshes[i];d.material=h;const R=h.uniforms,E=i/(this._lodMeshes.length-1),U=t/(this._lodMeshes.length-1),g=Math.sqrt(E*E-U*U),S=.05+E*.95,b=g*S,{_lodMax:B}=this,D=this._sizeLods[i],l=3*D*(i>B-Ct?i-B+Ct:0),r=4*(this._cubeSize-D);R.envMap.value=n.texture,R.roughness.value=b,R.mipInt.value=B-t,Ht(o,l,r,3*D,2*D),c.setRenderTarget(o),c.render(d,qt),R.envMap.value=o.texture,R.roughness.value=0,R.mipInt.value=B-i,Ht(n,l,r,3*D,2*D),c.setRenderTarget(n),c.render(d,qt)}_blur(n,t,i,c,o){const h=this._pingPongRenderTarget;this._halfBlur(n,h,t,i,c,"latitudinal",o),this._halfBlur(h,n,i,i,c,"longitudinal",o)}_halfBlur(n,t,i,c,o,h,d){const R=this._renderer,E=this._blurMaterial;h!=="latitudinal"&&h!=="longitudinal"&&pt("blur direction must be either latitudinal or longitudinal!");const U=3,g=this._lodMeshes[c];g.material=E;const S=E.uniforms,b=this._sizeLods[i]-1,B=isFinite(o)?Math.PI/(2*b):2*Math.PI/(2*yt-1),D=o/B,l=isFinite(o)?1+Math.floor(U*D):yt;l>yt&&Ye(`sigmaRadians, ${o}, is too large and will clip, as it requested ${l} samples when the maximum is set to ${yt}`);const r=[];let P=0;for(let y=0;y<yt;++y){const Q=y/D,p=Math.exp(-Q*Q/2);r.push(p),y===0?P+=p:y<l&&(P+=2*p)}for(let y=0;y<r.length;y++)r[y]=r[y]/P;S.envMap.value=n.texture,S.samples.value=l,S.weights.value=r,S.latitudinal.value=h==="latitudinal",d&&(S.poleAxis.value=d);const{_lodMax:v}=this;S.dTheta.value=B,S.mipInt.value=v-i;const L=this._sizeLods[c],N=3*L*(c>v-Ct?c-v+Ct:0),_=4*(this._cubeSize-L);Ht(t,N,_,3*L,2*L),R.setRenderTarget(t),R.render(g,qt)}}function Kc(e){const n=[],t=[],i=[];let c=e;const o=e-Ct+1+Oi.length;for(let h=0;h<o;h++){const d=Math.pow(2,c);n.push(d);let R=1/d;h>e-Ct?R=Oi[h-e+Ct-1]:h===0&&(R=0),t.push(R);const E=1/(d-2),U=-E,g=1+E,S=[U,U,g,U,g,g,U,U,g,g,U,g],b=6,B=6,D=3,l=2,r=1,P=new Float32Array(D*B*b),v=new Float32Array(l*B*b),L=new Float32Array(r*B*b);for(let _=0;_<b;_++){const y=_%3*2/3-1,Q=_>2?0:-1,p=[y,Q,0,y+2/3,Q,0,y+2/3,Q+1,0,y,Q,0,y+2/3,Q+1,0,y,Q+1,0];P.set(p,D*B*_),v.set(S,l*B*_);const f=[_,_,_,_,_,_];L.set(f,r*B*_)}const N=new Xn;N.setAttribute("position",new fn(P,D)),N.setAttribute("uv",new fn(v,l)),N.setAttribute("faceIndex",new fn(L,r)),i.push(new Bt(N,null)),c>Ct&&c--}return{lodMeshes:i,sizeLods:n,sigmas:t}}function Hi(e,n,t){const i=new kt(e,n,t);return i.texture.mapping=_n,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Ht(e,n,t,i,c){e.viewport.set(n,t,i,c),e.scissor.set(n,t,i,c)}function $c(e,n,t){return new Ut({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Yc,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:vn(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Lt,depthTest:!1,depthWrite:!1})}function Zc(e,n,t){const i=new Float32Array(yt),c=new st(0,1,0);return new Ut({name:"SphericalGaussianBlur",defines:{n:yt,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:c}},vertexShader:vn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Lt,depthTest:!1,depthWrite:!1})}function Vi(){return new Ut({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:vn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Lt,depthTest:!1,depthWrite:!1})}function ki(){return new Ut({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:vn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Lt,depthTest:!1,depthWrite:!1})}function vn(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Qc(e){let n=new WeakMap,t=null;function i(d){if(d&&d.isTexture){const R=d.mapping,E=R===kn||R===zn,U=R===jt||R===zt;if(E||U){let g=n.get(d);const S=g!==void 0?g.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==S)return t===null&&(t=new Gi(e)),g=E?t.fromEquirectangular(d,g):t.fromCubemap(d,g),g.texture.pmremVersion=d.pmremVersion,n.set(d,g),g.texture;if(g!==void 0)return g.texture;{const b=d.image;return E&&b&&b.height>0||U&&b&&c(b)?(t===null&&(t=new Gi(e)),g=E?t.fromEquirectangular(d):t.fromCubemap(d),g.texture.pmremVersion=d.pmremVersion,n.set(d,g),d.addEventListener("dispose",o),g.texture):null}}}return d}function c(d){let R=0;const E=6;for(let U=0;U<E;U++)d[U]!==void 0&&R++;return R===E}function o(d){const R=d.target;R.removeEventListener("dispose",o);const E=n.get(R);E!==void 0&&(n.delete(R),E.dispose())}function h(){n=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:h}}function Jc(e){const n={};function t(i){if(n[i]!==void 0)return n[i];const c=e.getExtension(i);return n[i]=c,c}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const c=t(i);return c===null&&In("WebGLRenderer: "+i+" extension not supported."),c}}}function jc(e,n,t,i){const c={},o=new WeakMap;function h(g){const S=g.target;S.index!==null&&n.remove(S.index);for(const B in S.attributes)n.remove(S.attributes[B]);S.removeEventListener("dispose",h),delete c[S.id];const b=o.get(S);b&&(n.remove(b),o.delete(S)),i.releaseStatesOfGeometry(S),S.isInstancedBufferGeometry===!0&&delete S._maxInstanceCount,t.memory.geometries--}function d(g,S){return c[S.id]===!0||(S.addEventListener("dispose",h),c[S.id]=!0,t.memory.geometries++),S}function R(g){const S=g.attributes;for(const b in S)n.update(S[b],e.ARRAY_BUFFER)}function E(g){const S=[],b=g.index,B=g.attributes.position;let D=0;if(b!==null){const P=b.array;D=b.version;for(let v=0,L=P.length;v<L;v+=3){const N=P[v+0],_=P[v+1],y=P[v+2];S.push(N,_,_,y,y,N)}}else if(B!==void 0){const P=B.array;D=B.version;for(let v=0,L=P.length/3-1;v<L;v+=3){const N=v+0,_=v+1,y=v+2;S.push(N,_,_,y,y,N)}}else return;const l=new(Gr(S)?Or:Br)(S,1);l.version=D;const r=o.get(g);r&&n.remove(r),o.set(g,l)}function U(g){const S=o.get(g);if(S){const b=g.index;b!==null&&S.version<b.version&&E(g)}else E(g);return o.get(g)}return{get:d,update:R,getWireframeAttribute:U}}function el(e,n,t){let i;function c(S){i=S}let o,h;function d(S){o=S.type,h=S.bytesPerElement}function R(S,b){e.drawElements(i,b,o,S*h),t.update(b,i,1)}function E(S,b,B){B!==0&&(e.drawElementsInstanced(i,b,o,S*h,B),t.update(b,i,B))}function U(S,b,B){if(B===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,b,0,o,S,0,B);let l=0;for(let r=0;r<B;r++)l+=b[r];t.update(l,i,1)}function g(S,b,B,D){if(B===0)return;const l=n.get("WEBGL_multi_draw");if(l===null)for(let r=0;r<S.length;r++)E(S[r]/h,b[r],D[r]);else{l.multiDrawElementsInstancedWEBGL(i,b,0,o,S,0,D,0,B);let r=0;for(let P=0;P<B;P++)r+=b[P]*D[P];t.update(r,i,1)}}this.setMode=c,this.setIndex=d,this.render=R,this.renderInstances=E,this.renderMultiDraw=U,this.renderMultiDrawInstances=g}function tl(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(o,h,d){switch(t.calls++,h){case e.TRIANGLES:t.triangles+=d*(o/3);break;case e.LINES:t.lines+=d*(o/2);break;case e.LINE_STRIP:t.lines+=d*(o-1);break;case e.LINE_LOOP:t.lines+=d*o;break;case e.POINTS:t.points+=d*o;break;default:pt("WebGLInfo: Unknown draw mode:",h);break}}function c(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:c,update:i}}function nl(e,n,t){const i=new WeakMap,c=new ut;function o(h,d,R){const E=h.morphTargetInfluences,U=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,g=U!==void 0?U.length:0;let S=i.get(d);if(S===void 0||S.count!==g){let p=function(){y.dispose(),i.delete(d),d.removeEventListener("dispose",p)};S!==void 0&&S.texture.dispose();const b=d.morphAttributes.position!==void 0,B=d.morphAttributes.normal!==void 0,D=d.morphAttributes.color!==void 0,l=d.morphAttributes.position||[],r=d.morphAttributes.normal||[],P=d.morphAttributes.color||[];let v=0;b===!0&&(v=1),B===!0&&(v=2),D===!0&&(v=3);let L=d.attributes.position.count*v,N=1;L>n.maxTextureSize&&(N=Math.ceil(L/n.maxTextureSize),L=n.maxTextureSize);const _=new Float32Array(L*N*4*g),y=new Sa(_,L,N,g);y.type=Ft,y.needsUpdate=!0;const Q=v*4;for(let f=0;f<g;f++){const A=l[f],O=r[f],z=P[f],W=L*N*4*f;for(let $=0;$<A.count;$++){const X=$*Q;b===!0&&(c.fromBufferAttribute(A,$),_[W+X+0]=c.x,_[W+X+1]=c.y,_[W+X+2]=c.z,_[W+X+3]=0),B===!0&&(c.fromBufferAttribute(O,$),_[W+X+4]=c.x,_[W+X+5]=c.y,_[W+X+6]=c.z,_[W+X+7]=0),D===!0&&(c.fromBufferAttribute(z,$),_[W+X+8]=c.x,_[W+X+9]=c.y,_[W+X+10]=c.z,_[W+X+11]=z.itemSize===4?c.w:1)}}S={count:g,texture:y,size:new ht(L,N)},i.set(d,S),d.addEventListener("dispose",p)}if(h.isInstancedMesh===!0&&h.morphTexture!==null)R.getUniforms().setValue(e,"morphTexture",h.morphTexture,t);else{let b=0;for(let D=0;D<E.length;D++)b+=E[D];const B=d.morphTargetsRelative?1:1-b;R.getUniforms().setValue(e,"morphTargetBaseInfluence",B),R.getUniforms().setValue(e,"morphTargetInfluences",E)}R.getUniforms().setValue(e,"morphTargetsTexture",S.texture,t),R.getUniforms().setValue(e,"morphTargetsTextureSize",S.size)}return{update:o}}function il(e,n,t,i){let c=new WeakMap;function o(R){const E=i.render.frame,U=R.geometry,g=n.get(R,U);if(c.get(g)!==E&&(n.update(g),c.set(g,E)),R.isInstancedMesh&&(R.hasEventListener("dispose",d)===!1&&R.addEventListener("dispose",d),c.get(R)!==E&&(t.update(R.instanceMatrix,e.ARRAY_BUFFER),R.instanceColor!==null&&t.update(R.instanceColor,e.ARRAY_BUFFER),c.set(R,E))),R.isSkinnedMesh){const S=R.skeleton;c.get(S)!==E&&(S.update(),c.set(S,E))}return g}function h(){c=new WeakMap}function d(R){const E=R.target;E.removeEventListener("dispose",d),t.remove(E.instanceMatrix),E.instanceColor!==null&&t.remove(E.instanceColor)}return{update:o,dispose:h}}const Aa=new Qr,zi=new ca(1,1),Ra=new Sa,Ca=new Zr,Pa=new $r,Wi=[],Xi=[],Yi=new Float32Array(16),qi=new Float32Array(9),Ki=new Float32Array(4);function Wt(e,n,t){const i=e[0];if(i<=0||i>0)return e;const c=n*t;let o=Wi[c];if(o===void 0&&(o=new Float32Array(c),Wi[c]=o),n!==0){i.toArray(o,0);for(let h=1,d=0;h!==n;++h)d+=t,e[h].toArray(o,d)}return o}function at(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function rt(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function gn(e,n){let t=Xi[n];t===void 0&&(t=new Int32Array(n),Xi[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function al(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function rl(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(at(t,n))return;e.uniform2fv(this.addr,n),rt(t,n)}}function ol(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(at(t,n))return;e.uniform3fv(this.addr,n),rt(t,n)}}function sl(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(at(t,n))return;e.uniform4fv(this.addr,n),rt(t,n)}}function cl(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(at(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),rt(t,n)}else{if(at(t,i))return;Ki.set(i),e.uniformMatrix2fv(this.addr,!1,Ki),rt(t,i)}}function ll(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(at(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),rt(t,n)}else{if(at(t,i))return;qi.set(i),e.uniformMatrix3fv(this.addr,!1,qi),rt(t,i)}}function fl(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(at(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),rt(t,n)}else{if(at(t,i))return;Yi.set(i),e.uniformMatrix4fv(this.addr,!1,Yi),rt(t,i)}}function dl(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function ul(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(at(t,n))return;e.uniform2iv(this.addr,n),rt(t,n)}}function pl(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(at(t,n))return;e.uniform3iv(this.addr,n),rt(t,n)}}function hl(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(at(t,n))return;e.uniform4iv(this.addr,n),rt(t,n)}}function xl(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function ml(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(at(t,n))return;e.uniform2uiv(this.addr,n),rt(t,n)}}function _l(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(at(t,n))return;e.uniform3uiv(this.addr,n),rt(t,n)}}function vl(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(at(t,n))return;e.uniform4uiv(this.addr,n),rt(t,n)}}function gl(e,n,t){const i=this.cache,c=t.allocateTextureUnit();i[0]!==c&&(e.uniform1i(this.addr,c),i[0]=c);let o;this.type===e.SAMPLER_2D_SHADOW?(zi.compareFunction=fa,o=zi):o=Aa,t.setTexture2D(n||o,c)}function Sl(e,n,t){const i=this.cache,c=t.allocateTextureUnit();i[0]!==c&&(e.uniform1i(this.addr,c),i[0]=c),t.setTexture3D(n||Ca,c)}function El(e,n,t){const i=this.cache,c=t.allocateTextureUnit();i[0]!==c&&(e.uniform1i(this.addr,c),i[0]=c),t.setTextureCube(n||Pa,c)}function Ml(e,n,t){const i=this.cache,c=t.allocateTextureUnit();i[0]!==c&&(e.uniform1i(this.addr,c),i[0]=c),t.setTexture2DArray(n||Ra,c)}function Tl(e){switch(e){case 5126:return al;case 35664:return rl;case 35665:return ol;case 35666:return sl;case 35674:return cl;case 35675:return ll;case 35676:return fl;case 5124:case 35670:return dl;case 35667:case 35671:return ul;case 35668:case 35672:return pl;case 35669:case 35673:return hl;case 5125:return xl;case 36294:return ml;case 36295:return _l;case 36296:return vl;case 35678:case 36198:case 36298:case 36306:case 35682:return gl;case 35679:case 36299:case 36307:return Sl;case 35680:case 36300:case 36308:case 36293:return El;case 36289:case 36303:case 36311:case 36292:return Ml}}function bl(e,n){e.uniform1fv(this.addr,n)}function Al(e,n){const t=Wt(n,this.size,2);e.uniform2fv(this.addr,t)}function Rl(e,n){const t=Wt(n,this.size,3);e.uniform3fv(this.addr,t)}function Cl(e,n){const t=Wt(n,this.size,4);e.uniform4fv(this.addr,t)}function Pl(e,n){const t=Wt(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function Ll(e,n){const t=Wt(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function Ul(e,n){const t=Wt(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function Dl(e,n){e.uniform1iv(this.addr,n)}function wl(e,n){e.uniform2iv(this.addr,n)}function Il(e,n){e.uniform3iv(this.addr,n)}function Nl(e,n){e.uniform4iv(this.addr,n)}function yl(e,n){e.uniform1uiv(this.addr,n)}function Fl(e,n){e.uniform2uiv(this.addr,n)}function Ol(e,n){e.uniform3uiv(this.addr,n)}function Bl(e,n){e.uniform4uiv(this.addr,n)}function Gl(e,n,t){const i=this.cache,c=n.length,o=gn(t,c);at(i,o)||(e.uniform1iv(this.addr,o),rt(i,o));for(let h=0;h!==c;++h)t.setTexture2D(n[h]||Aa,o[h])}function Hl(e,n,t){const i=this.cache,c=n.length,o=gn(t,c);at(i,o)||(e.uniform1iv(this.addr,o),rt(i,o));for(let h=0;h!==c;++h)t.setTexture3D(n[h]||Ca,o[h])}function Vl(e,n,t){const i=this.cache,c=n.length,o=gn(t,c);at(i,o)||(e.uniform1iv(this.addr,o),rt(i,o));for(let h=0;h!==c;++h)t.setTextureCube(n[h]||Pa,o[h])}function kl(e,n,t){const i=this.cache,c=n.length,o=gn(t,c);at(i,o)||(e.uniform1iv(this.addr,o),rt(i,o));for(let h=0;h!==c;++h)t.setTexture2DArray(n[h]||Ra,o[h])}function zl(e){switch(e){case 5126:return bl;case 35664:return Al;case 35665:return Rl;case 35666:return Cl;case 35674:return Pl;case 35675:return Ll;case 35676:return Ul;case 5124:case 35670:return Dl;case 35667:case 35671:return wl;case 35668:case 35672:return Il;case 35669:case 35673:return Nl;case 5125:return yl;case 36294:return Fl;case 36295:return Ol;case 36296:return Bl;case 35678:case 36198:case 36298:case 36306:case 35682:return Gl;case 35679:case 36299:case 36307:return Hl;case 35680:case 36300:case 36308:case 36293:return Vl;case 36289:case 36303:case 36311:case 36292:return kl}}class Wl{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Tl(t.type)}}class Xl{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=zl(t.type)}}class Yl{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const c=this.seq;for(let o=0,h=c.length;o!==h;++o){const d=c[o];d.setValue(n,t[d.id],i)}}}const wn=/(\w+)(\])?(\[|\.)?/g;function $i(e,n){e.seq.push(n),e.map[n.id]=n}function ql(e,n,t){const i=e.name,c=i.length;for(wn.lastIndex=0;;){const o=wn.exec(i),h=wn.lastIndex;let d=o[1];const R=o[2]==="]",E=o[3];if(R&&(d=d|0),E===void 0||E==="["&&h+2===c){$i(t,E===void 0?new Wl(d,e,n):new Xl(d,e,n));break}else{let g=t.map[d];g===void 0&&(g=new Yl(d),$i(t,g)),t=g}}}class un{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let c=0;c<i;++c){const o=n.getActiveUniform(t,c),h=n.getUniformLocation(t,o.name);ql(o,h,this)}}setValue(n,t,i,c){const o=this.map[t];o!==void 0&&o.setValue(n,i,c)}setOptional(n,t,i){const c=t[i];c!==void 0&&this.setValue(n,i,c)}static upload(n,t,i,c){for(let o=0,h=t.length;o!==h;++o){const d=t[o],R=i[d.id];R.needsUpdate!==!1&&d.setValue(n,R.value,c)}}static seqWithValue(n,t){const i=[];for(let c=0,o=n.length;c!==o;++c){const h=n[c];h.id in t&&i.push(h)}return i}}function Zi(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const Kl=37297;let $l=0;function Zl(e,n){const t=e.split(`
`),i=[],c=Math.max(n-6,0),o=Math.min(n+6,t.length);for(let h=c;h<o;h++){const d=h+1;i.push(`${d===n?">":" "} ${d}: ${t[h]}`)}return i.join(`
`)}const Qi=new Be;function Ql(e){it._getMatrix(Qi,it.workingColorSpace,e);const n=`mat3( ${Qi.elements.map(t=>t.toFixed(4))} )`;switch(it.getTransfer(e)){case Ta:return[n,"LinearTransferOETF"];case Xe:return[n,"sRGBTransferOETF"];default:return Ye("WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function Ji(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),o=(e.getShaderInfoLog(n)||"").trim();if(i&&o==="")return"";const h=/ERROR: 0:(\d+)/.exec(o);if(h){const d=parseInt(h[1]);return t.toUpperCase()+`

`+o+`

`+Zl(e.getShaderSource(n),d)}else return o}function Jl(e,n){const t=Ql(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function jl(e,n){let t;switch(n){case Kr:t="Linear";break;case qr:t="Reinhard";break;case Yr:t="Cineon";break;case Xr:t="ACESFilmic";break;case Wr:t="AgX";break;case zr:t="Neutral";break;case kr:t="Custom";break;default:Ye("WebGLProgram: Unsupported toneMapping:",n),t="Linear"}return"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const cn=new st;function ef(){it.getLuminanceCoefficients(cn);const e=cn.x.toFixed(4),n=cn.y.toFixed(4),t=cn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function tf(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($t).join(`
`)}function nf(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function af(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let c=0;c<i;c++){const o=e.getActiveAttrib(n,c),h=o.name;let d=1;o.type===e.FLOAT_MAT2&&(d=2),o.type===e.FLOAT_MAT3&&(d=3),o.type===e.FLOAT_MAT4&&(d=4),t[h]={type:o.type,location:e.getAttribLocation(n,h),locationSize:d}}return t}function $t(e){return e!==""}function ji(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function ea(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const rf=/^[ \t]*#include +<([\w\d./]+)>/gm;function Wn(e){return e.replace(rf,sf)}const of=new Map;function sf(e,n){let t=Ue[n];if(t===void 0){const i=of.get(n);if(i!==void 0)t=Ue[i],Ye('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return Wn(t)}const cf=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function ta(e){return e.replace(cf,lf)}function lf(e,n,t,i){let c="";for(let o=parseInt(n);o<parseInt(t);o++)c+=i.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return c}function na(e){let n=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?n+=`
#define HIGH_PRECISION`:e.precision==="mediump"?n+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(n+=`
#define LOW_PRECISION`),n}function ff(e){let n="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===da?n="SHADOWMAP_TYPE_PCF":e.shadowMapType===Vr?n="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===Tt&&(n="SHADOWMAP_TYPE_VSM"),n}function df(e){let n="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case jt:case zt:n="ENVMAP_TYPE_CUBE";break;case _n:n="ENVMAP_TYPE_CUBE_UV";break}return n}function uf(e){let n="ENVMAP_MODE_REFLECTION";if(e.envMap)switch(e.envMapMode){case zt:n="ENVMAP_MODE_REFRACTION";break}return n}function pf(e){let n="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case to:n="ENVMAP_BLENDING_MULTIPLY";break;case eo:n="ENVMAP_BLENDING_MIX";break;case jr:n="ENVMAP_BLENDING_ADD";break}return n}function hf(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function xf(e,n,t,i){const c=e.getContext(),o=t.defines;let h=t.vertexShader,d=t.fragmentShader;const R=ff(t),E=df(t),U=uf(t),g=pf(t),S=hf(t),b=tf(t),B=nf(o),D=c.createProgram();let l,r,P=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(l=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B].filter($t).join(`
`),l.length>0&&(l+=`
`),r=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B].filter($t).join(`
`),r.length>0&&(r+=`
`)):(l=[na(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+U:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+R:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($t).join(`
`),r=[na(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+E:"",t.envMap?"#define "+U:"",t.envMap?"#define "+g:"",S?"#define CUBEUV_TEXEL_WIDTH "+S.texelWidth:"",S?"#define CUBEUV_TEXEL_HEIGHT "+S.texelHeight:"",S?"#define CUBEUV_MAX_MIP "+S.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+R:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Pt?"#define TONE_MAPPING":"",t.toneMapping!==Pt?Ue.tonemapping_pars_fragment:"",t.toneMapping!==Pt?jl("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ue.colorspace_pars_fragment,Jl("linearToOutputTexel",t.outputColorSpace),ef(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter($t).join(`
`)),h=Wn(h),h=ji(h,t),h=ea(h,t),d=Wn(d),d=ji(d,t),d=ea(d,t),h=ta(h),d=ta(d),t.isRawShaderMaterial!==!0&&(P=`#version 300 es
`,l=[b,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+l,r=["#define varying in",t.glslVersion===Fi?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Fi?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+r);const v=P+l+h,L=P+r+d,N=Zi(c,c.VERTEX_SHADER,v),_=Zi(c,c.FRAGMENT_SHADER,L);c.attachShader(D,N),c.attachShader(D,_),t.index0AttributeName!==void 0?c.bindAttribLocation(D,0,t.index0AttributeName):t.morphTargets===!0&&c.bindAttribLocation(D,0,"position"),c.linkProgram(D);function y(A){if(e.debug.checkShaderErrors){const O=c.getProgramInfoLog(D)||"",z=c.getShaderInfoLog(N)||"",W=c.getShaderInfoLog(_)||"",$=O.trim(),X=z.trim(),re=W.trim();let H=!0,fe=!0;if(c.getProgramParameter(D,c.LINK_STATUS)===!1)if(H=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(c,D,N,_);else{const pe=Ji(c,N,"vertex"),De=Ji(c,_,"fragment");pt("THREE.WebGLProgram: Shader Error "+c.getError()+" - VALIDATE_STATUS "+c.getProgramParameter(D,c.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+$+`
`+pe+`
`+De)}else $!==""?Ye("WebGLProgram: Program Info Log:",$):(X===""||re==="")&&(fe=!1);fe&&(A.diagnostics={runnable:H,programLog:$,vertexShader:{log:X,prefix:l},fragmentShader:{log:re,prefix:r}})}c.deleteShader(N),c.deleteShader(_),Q=new un(c,D),p=af(c,D)}let Q;this.getUniforms=function(){return Q===void 0&&y(this),Q};let p;this.getAttributes=function(){return p===void 0&&y(this),p};let f=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return f===!1&&(f=c.getProgramParameter(D,Kl)),f},this.destroy=function(){i.releaseStatesOfProgram(this),c.deleteProgram(D),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=$l++,this.cacheKey=n,this.usedTimes=1,this.program=D,this.vertexShader=N,this.fragmentShader=_,this}let mf=0;class _f{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,c=this._getShaderStage(t),o=this._getShaderStage(i),h=this._getShaderCacheForMaterial(n);return h.has(c)===!1&&(h.add(c),c.usedTimes++),h.has(o)===!1&&(h.add(o),o.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new vf(n),t.set(n,i)),i}}class vf{constructor(n){this.id=mf++,this.code=n,this.usedTimes=0}}function gf(e,n,t,i,c,o,h){const d=new Hr,R=new _f,E=new Set,U=[],g=c.logarithmicDepthBuffer,S=c.vertexTextures;let b=c.precision;const B={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function D(p){return E.add(p),p===0?"uv":`uv${p}`}function l(p,f,A,O,z){const W=O.fog,$=z.geometry,X=p.isMeshStandardMaterial?O.environment:null,re=(p.isMeshStandardMaterial?t:n).get(p.envMap||X),H=re&&re.mapping===_n?re.image.height:null,fe=B[p.type];p.precision!==null&&(b=c.getMaxPrecision(p.precision),b!==p.precision&&Ye("WebGLProgram.getParameters:",p.precision,"not supported, using",b,"instead."));const pe=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,De=pe!==void 0?pe.length:0;let Ve=0;$.morphAttributes.position!==void 0&&(Ve=1),$.morphAttributes.normal!==void 0&&(Ve=2),$.morphAttributes.color!==void 0&&(Ve=3);let Ze,qe,Qe,V;if(fe){const Ge=Et[fe];Ze=Ge.vertexShader,qe=Ge.fragmentShader}else Ze=p.vertexShader,qe=p.fragmentShader,R.update(p),Qe=R.getVertexShaderID(p),V=R.getFragmentShaderID(p);const q=e.getRenderTarget(),le=e.state.buffers.depth.getReversed(),Le=z.isInstancedMesh===!0,_e=z.isBatchedMesh===!0,Ie=!!p.map,ot=!!p.matcap,we=!!re,Ke=!!p.aoMap,x=!!p.lightMap,Ne=!!p.bumpMap,ye=!!p.normalMap,ze=!!p.displacementMap,he=!!p.emissiveMap,Je=!!p.metalnessMap,ge=!!p.roughnessMap,Pe=p.anisotropy>0,u=p.clearcoat>0,a=p.dispersion>0,C=p.iridescence>0,G=p.sheen>0,Y=p.transmission>0,F=Pe&&!!p.anisotropyMap,me=u&&!!p.clearcoatMap,ie=u&&!!p.clearcoatNormalMap,Se=u&&!!p.clearcoatRoughnessMap,xe=C&&!!p.iridescenceMap,K=C&&!!p.iridescenceThicknessMap,j=G&&!!p.sheenColorMap,be=G&&!!p.sheenRoughnessMap,Me=!!p.specularMap,se=!!p.specularColorMap,Re=!!p.specularIntensityMap,m=Y&&!!p.transmissionMap,ae=Y&&!!p.thicknessMap,ee=!!p.gradientMap,te=!!p.alphaMap,Z=p.alphaTest>0,k=!!p.alphaHash,de=!!p.extensions;let Ce=Pt;p.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(Ce=e.toneMapping);const We={shaderID:fe,shaderType:p.type,shaderName:p.name,vertexShader:Ze,fragmentShader:qe,defines:p.defines,customVertexShaderID:Qe,customFragmentShaderID:V,isRawShaderMaterial:p.isRawShaderMaterial===!0,glslVersion:p.glslVersion,precision:b,batching:_e,batchingColor:_e&&z._colorsTexture!==null,instancing:Le,instancingColor:Le&&z.instanceColor!==null,instancingMorph:Le&&z.morphTexture!==null,supportsVertexTextures:S,outputColorSpace:q===null?e.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:mn,alphaToCoverage:!!p.alphaToCoverage,map:Ie,matcap:ot,envMap:we,envMapMode:we&&re.mapping,envMapCubeUVHeight:H,aoMap:Ke,lightMap:x,bumpMap:Ne,normalMap:ye,displacementMap:S&&ze,emissiveMap:he,normalMapObjectSpace:ye&&p.normalMapType===Fr,normalMapTangentSpace:ye&&p.normalMapType===yr,metalnessMap:Je,roughnessMap:ge,anisotropy:Pe,anisotropyMap:F,clearcoat:u,clearcoatMap:me,clearcoatNormalMap:ie,clearcoatRoughnessMap:Se,dispersion:a,iridescence:C,iridescenceMap:xe,iridescenceThicknessMap:K,sheen:G,sheenColorMap:j,sheenRoughnessMap:be,specularMap:Me,specularColorMap:se,specularIntensityMap:Re,transmission:Y,transmissionMap:m,thicknessMap:ae,gradientMap:ee,opaque:p.transparent===!1&&p.blending===dn&&p.alphaToCoverage===!1,alphaMap:te,alphaTest:Z,alphaHash:k,combine:p.combine,mapUv:Ie&&D(p.map.channel),aoMapUv:Ke&&D(p.aoMap.channel),lightMapUv:x&&D(p.lightMap.channel),bumpMapUv:Ne&&D(p.bumpMap.channel),normalMapUv:ye&&D(p.normalMap.channel),displacementMapUv:ze&&D(p.displacementMap.channel),emissiveMapUv:he&&D(p.emissiveMap.channel),metalnessMapUv:Je&&D(p.metalnessMap.channel),roughnessMapUv:ge&&D(p.roughnessMap.channel),anisotropyMapUv:F&&D(p.anisotropyMap.channel),clearcoatMapUv:me&&D(p.clearcoatMap.channel),clearcoatNormalMapUv:ie&&D(p.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Se&&D(p.clearcoatRoughnessMap.channel),iridescenceMapUv:xe&&D(p.iridescenceMap.channel),iridescenceThicknessMapUv:K&&D(p.iridescenceThicknessMap.channel),sheenColorMapUv:j&&D(p.sheenColorMap.channel),sheenRoughnessMapUv:be&&D(p.sheenRoughnessMap.channel),specularMapUv:Me&&D(p.specularMap.channel),specularColorMapUv:se&&D(p.specularColorMap.channel),specularIntensityMapUv:Re&&D(p.specularIntensityMap.channel),transmissionMapUv:m&&D(p.transmissionMap.channel),thicknessMapUv:ae&&D(p.thicknessMap.channel),alphaMapUv:te&&D(p.alphaMap.channel),vertexTangents:!!$.attributes.tangent&&(ye||Pe),vertexColors:p.vertexColors,vertexAlphas:p.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,pointsUvs:z.isPoints===!0&&!!$.attributes.uv&&(Ie||te),fog:!!W,useFog:p.fog===!0,fogExp2:!!W&&W.isFogExp2,flatShading:p.flatShading===!0&&p.wireframe===!1,sizeAttenuation:p.sizeAttenuation===!0,logarithmicDepthBuffer:g,reversedDepthBuffer:le,skinning:z.isSkinnedMesh===!0,morphTargets:$.morphAttributes.position!==void 0,morphNormals:$.morphAttributes.normal!==void 0,morphColors:$.morphAttributes.color!==void 0,morphTargetsCount:De,morphTextureStride:Ve,numDirLights:f.directional.length,numPointLights:f.point.length,numSpotLights:f.spot.length,numSpotLightMaps:f.spotLightMap.length,numRectAreaLights:f.rectArea.length,numHemiLights:f.hemi.length,numDirLightShadows:f.directionalShadowMap.length,numPointLightShadows:f.pointShadowMap.length,numSpotLightShadows:f.spotShadowMap.length,numSpotLightShadowsWithMaps:f.numSpotLightShadowsWithMaps,numLightProbes:f.numLightProbes,numClippingPlanes:h.numPlanes,numClipIntersection:h.numIntersection,dithering:p.dithering,shadowMapEnabled:e.shadowMap.enabled&&A.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ce,decodeVideoTexture:Ie&&p.map.isVideoTexture===!0&&it.getTransfer(p.map.colorSpace)===Xe,decodeVideoTextureEmissive:he&&p.emissiveMap.isVideoTexture===!0&&it.getTransfer(p.emissiveMap.colorSpace)===Xe,premultipliedAlpha:p.premultipliedAlpha,doubleSided:p.side===bt,flipSided:p.side===vt,useDepthPacking:p.depthPacking>=0,depthPacking:p.depthPacking||0,index0AttributeName:p.index0AttributeName,extensionClipCullDistance:de&&p.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(de&&p.extensions.multiDraw===!0||_e)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:p.customProgramCacheKey()};return We.vertexUv1s=E.has(1),We.vertexUv2s=E.has(2),We.vertexUv3s=E.has(3),E.clear(),We}function r(p){const f=[];if(p.shaderID?f.push(p.shaderID):(f.push(p.customVertexShaderID),f.push(p.customFragmentShaderID)),p.defines!==void 0)for(const A in p.defines)f.push(A),f.push(p.defines[A]);return p.isRawShaderMaterial===!1&&(P(f,p),v(f,p),f.push(e.outputColorSpace)),f.push(p.customProgramCacheKey),f.join()}function P(p,f){p.push(f.precision),p.push(f.outputColorSpace),p.push(f.envMapMode),p.push(f.envMapCubeUVHeight),p.push(f.mapUv),p.push(f.alphaMapUv),p.push(f.lightMapUv),p.push(f.aoMapUv),p.push(f.bumpMapUv),p.push(f.normalMapUv),p.push(f.displacementMapUv),p.push(f.emissiveMapUv),p.push(f.metalnessMapUv),p.push(f.roughnessMapUv),p.push(f.anisotropyMapUv),p.push(f.clearcoatMapUv),p.push(f.clearcoatNormalMapUv),p.push(f.clearcoatRoughnessMapUv),p.push(f.iridescenceMapUv),p.push(f.iridescenceThicknessMapUv),p.push(f.sheenColorMapUv),p.push(f.sheenRoughnessMapUv),p.push(f.specularMapUv),p.push(f.specularColorMapUv),p.push(f.specularIntensityMapUv),p.push(f.transmissionMapUv),p.push(f.thicknessMapUv),p.push(f.combine),p.push(f.fogExp2),p.push(f.sizeAttenuation),p.push(f.morphTargetsCount),p.push(f.morphAttributeCount),p.push(f.numDirLights),p.push(f.numPointLights),p.push(f.numSpotLights),p.push(f.numSpotLightMaps),p.push(f.numHemiLights),p.push(f.numRectAreaLights),p.push(f.numDirLightShadows),p.push(f.numPointLightShadows),p.push(f.numSpotLightShadows),p.push(f.numSpotLightShadowsWithMaps),p.push(f.numLightProbes),p.push(f.shadowMapType),p.push(f.toneMapping),p.push(f.numClippingPlanes),p.push(f.numClipIntersection),p.push(f.depthPacking)}function v(p,f){d.disableAll(),f.supportsVertexTextures&&d.enable(0),f.instancing&&d.enable(1),f.instancingColor&&d.enable(2),f.instancingMorph&&d.enable(3),f.matcap&&d.enable(4),f.envMap&&d.enable(5),f.normalMapObjectSpace&&d.enable(6),f.normalMapTangentSpace&&d.enable(7),f.clearcoat&&d.enable(8),f.iridescence&&d.enable(9),f.alphaTest&&d.enable(10),f.vertexColors&&d.enable(11),f.vertexAlphas&&d.enable(12),f.vertexUv1s&&d.enable(13),f.vertexUv2s&&d.enable(14),f.vertexUv3s&&d.enable(15),f.vertexTangents&&d.enable(16),f.anisotropy&&d.enable(17),f.alphaHash&&d.enable(18),f.batching&&d.enable(19),f.dispersion&&d.enable(20),f.batchingColor&&d.enable(21),f.gradientMap&&d.enable(22),p.push(d.mask),d.disableAll(),f.fog&&d.enable(0),f.useFog&&d.enable(1),f.flatShading&&d.enable(2),f.logarithmicDepthBuffer&&d.enable(3),f.reversedDepthBuffer&&d.enable(4),f.skinning&&d.enable(5),f.morphTargets&&d.enable(6),f.morphNormals&&d.enable(7),f.morphColors&&d.enable(8),f.premultipliedAlpha&&d.enable(9),f.shadowMapEnabled&&d.enable(10),f.doubleSided&&d.enable(11),f.flipSided&&d.enable(12),f.useDepthPacking&&d.enable(13),f.dithering&&d.enable(14),f.transmission&&d.enable(15),f.sheen&&d.enable(16),f.opaque&&d.enable(17),f.pointsUvs&&d.enable(18),f.decodeVideoTexture&&d.enable(19),f.decodeVideoTextureEmissive&&d.enable(20),f.alphaToCoverage&&d.enable(21),p.push(d.mask)}function L(p){const f=B[p.type];let A;if(f){const O=Et[f];A=Nr.clone(O.uniforms)}else A=p.uniforms;return A}function N(p,f){let A;for(let O=0,z=U.length;O<z;O++){const W=U[O];if(W.cacheKey===f){A=W,++A.usedTimes;break}}return A===void 0&&(A=new xf(e,f,p,o),U.push(A)),A}function _(p){if(--p.usedTimes===0){const f=U.indexOf(p);U[f]=U[U.length-1],U.pop(),p.destroy()}}function y(p){R.remove(p)}function Q(){R.dispose()}return{getParameters:l,getProgramCacheKey:r,getUniforms:L,acquireProgram:N,releaseProgram:_,releaseShaderCache:y,programs:U,dispose:Q}}function Sf(){let e=new WeakMap;function n(h){return e.has(h)}function t(h){let d=e.get(h);return d===void 0&&(d={},e.set(h,d)),d}function i(h){e.delete(h)}function c(h,d,R){e.get(h)[d]=R}function o(){e=new WeakMap}return{has:n,get:t,remove:i,update:c,dispose:o}}function Ef(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.z!==n.z?e.z-n.z:e.id-n.id}function ia(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function aa(){const e=[];let n=0;const t=[],i=[],c=[];function o(){n=0,t.length=0,i.length=0,c.length=0}function h(g,S,b,B,D,l){let r=e[n];return r===void 0?(r={id:g.id,object:g,geometry:S,material:b,groupOrder:B,renderOrder:g.renderOrder,z:D,group:l},e[n]=r):(r.id=g.id,r.object=g,r.geometry=S,r.material=b,r.groupOrder=B,r.renderOrder=g.renderOrder,r.z=D,r.group=l),n++,r}function d(g,S,b,B,D,l){const r=h(g,S,b,B,D,l);b.transmission>0?i.push(r):b.transparent===!0?c.push(r):t.push(r)}function R(g,S,b,B,D,l){const r=h(g,S,b,B,D,l);b.transmission>0?i.unshift(r):b.transparent===!0?c.unshift(r):t.unshift(r)}function E(g,S){t.length>1&&t.sort(g||Ef),i.length>1&&i.sort(S||ia),c.length>1&&c.sort(S||ia)}function U(){for(let g=n,S=e.length;g<S;g++){const b=e[g];if(b.id===null)break;b.id=null,b.object=null,b.geometry=null,b.material=null,b.group=null}}return{opaque:t,transmissive:i,transparent:c,init:o,push:d,unshift:R,finish:U,sort:E}}function Mf(){let e=new WeakMap;function n(i,c){const o=e.get(i);let h;return o===void 0?(h=new aa,e.set(i,[h])):c>=o.length?(h=new aa,o.push(h)):h=o[c],h}function t(){e=new WeakMap}return{get:n,dispose:t}}function Tf(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new st,color:new $e};break;case"SpotLight":t={position:new st,direction:new st,color:new $e,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new st,color:new $e,distance:0,decay:0};break;case"HemisphereLight":t={direction:new st,skyColor:new $e,groundColor:new $e};break;case"RectAreaLight":t={color:new $e,position:new st,halfWidth:new st,halfHeight:new st};break}return e[n.id]=t,t}}}function bf(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ht,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let Af=0;function Rf(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function Cf(e){const n=new Tf,t=bf(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let E=0;E<9;E++)i.probe.push(new st);const c=new st,o=new Qt,h=new Qt;function d(E){let U=0,g=0,S=0;for(let p=0;p<9;p++)i.probe[p].set(0,0,0);let b=0,B=0,D=0,l=0,r=0,P=0,v=0,L=0,N=0,_=0,y=0;E.sort(Rf);for(let p=0,f=E.length;p<f;p++){const A=E[p],O=A.color,z=A.intensity,W=A.distance,$=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)U+=O.r*z,g+=O.g*z,S+=O.b*z;else if(A.isLightProbe){for(let X=0;X<9;X++)i.probe[X].addScaledVector(A.sh.coefficients[X],z);y++}else if(A.isDirectionalLight){const X=n.get(A);if(X.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const re=A.shadow,H=t.get(A);H.shadowIntensity=re.intensity,H.shadowBias=re.bias,H.shadowNormalBias=re.normalBias,H.shadowRadius=re.radius,H.shadowMapSize=re.mapSize,i.directionalShadow[b]=H,i.directionalShadowMap[b]=$,i.directionalShadowMatrix[b]=A.shadow.matrix,P++}i.directional[b]=X,b++}else if(A.isSpotLight){const X=n.get(A);X.position.setFromMatrixPosition(A.matrixWorld),X.color.copy(O).multiplyScalar(z),X.distance=W,X.coneCos=Math.cos(A.angle),X.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),X.decay=A.decay,i.spot[D]=X;const re=A.shadow;if(A.map&&(i.spotLightMap[N]=A.map,N++,re.updateMatrices(A),A.castShadow&&_++),i.spotLightMatrix[D]=re.matrix,A.castShadow){const H=t.get(A);H.shadowIntensity=re.intensity,H.shadowBias=re.bias,H.shadowNormalBias=re.normalBias,H.shadowRadius=re.radius,H.shadowMapSize=re.mapSize,i.spotShadow[D]=H,i.spotShadowMap[D]=$,L++}D++}else if(A.isRectAreaLight){const X=n.get(A);X.color.copy(O).multiplyScalar(z),X.halfWidth.set(A.width*.5,0,0),X.halfHeight.set(0,A.height*.5,0),i.rectArea[l]=X,l++}else if(A.isPointLight){const X=n.get(A);if(X.color.copy(A.color).multiplyScalar(A.intensity),X.distance=A.distance,X.decay=A.decay,A.castShadow){const re=A.shadow,H=t.get(A);H.shadowIntensity=re.intensity,H.shadowBias=re.bias,H.shadowNormalBias=re.normalBias,H.shadowRadius=re.radius,H.shadowMapSize=re.mapSize,H.shadowCameraNear=re.camera.near,H.shadowCameraFar=re.camera.far,i.pointShadow[B]=H,i.pointShadowMap[B]=$,i.pointShadowMatrix[B]=A.shadow.matrix,v++}i.point[B]=X,B++}else if(A.isHemisphereLight){const X=n.get(A);X.skyColor.copy(A.color).multiplyScalar(z),X.groundColor.copy(A.groundColor).multiplyScalar(z),i.hemi[r]=X,r++}}l>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ne.LTC_FLOAT_1,i.rectAreaLTC2=ne.LTC_FLOAT_2):(i.rectAreaLTC1=ne.LTC_HALF_1,i.rectAreaLTC2=ne.LTC_HALF_2)),i.ambient[0]=U,i.ambient[1]=g,i.ambient[2]=S;const Q=i.hash;(Q.directionalLength!==b||Q.pointLength!==B||Q.spotLength!==D||Q.rectAreaLength!==l||Q.hemiLength!==r||Q.numDirectionalShadows!==P||Q.numPointShadows!==v||Q.numSpotShadows!==L||Q.numSpotMaps!==N||Q.numLightProbes!==y)&&(i.directional.length=b,i.spot.length=D,i.rectArea.length=l,i.point.length=B,i.hemi.length=r,i.directionalShadow.length=P,i.directionalShadowMap.length=P,i.pointShadow.length=v,i.pointShadowMap.length=v,i.spotShadow.length=L,i.spotShadowMap.length=L,i.directionalShadowMatrix.length=P,i.pointShadowMatrix.length=v,i.spotLightMatrix.length=L+N-_,i.spotLightMap.length=N,i.numSpotLightShadowsWithMaps=_,i.numLightProbes=y,Q.directionalLength=b,Q.pointLength=B,Q.spotLength=D,Q.rectAreaLength=l,Q.hemiLength=r,Q.numDirectionalShadows=P,Q.numPointShadows=v,Q.numSpotShadows=L,Q.numSpotMaps=N,Q.numLightProbes=y,i.version=Af++)}function R(E,U){let g=0,S=0,b=0,B=0,D=0;const l=U.matrixWorldInverse;for(let r=0,P=E.length;r<P;r++){const v=E[r];if(v.isDirectionalLight){const L=i.directional[g];L.direction.setFromMatrixPosition(v.matrixWorld),c.setFromMatrixPosition(v.target.matrixWorld),L.direction.sub(c),L.direction.transformDirection(l),g++}else if(v.isSpotLight){const L=i.spot[b];L.position.setFromMatrixPosition(v.matrixWorld),L.position.applyMatrix4(l),L.direction.setFromMatrixPosition(v.matrixWorld),c.setFromMatrixPosition(v.target.matrixWorld),L.direction.sub(c),L.direction.transformDirection(l),b++}else if(v.isRectAreaLight){const L=i.rectArea[B];L.position.setFromMatrixPosition(v.matrixWorld),L.position.applyMatrix4(l),h.identity(),o.copy(v.matrixWorld),o.premultiply(l),h.extractRotation(o),L.halfWidth.set(v.width*.5,0,0),L.halfHeight.set(0,v.height*.5,0),L.halfWidth.applyMatrix4(h),L.halfHeight.applyMatrix4(h),B++}else if(v.isPointLight){const L=i.point[S];L.position.setFromMatrixPosition(v.matrixWorld),L.position.applyMatrix4(l),S++}else if(v.isHemisphereLight){const L=i.hemi[D];L.direction.setFromMatrixPosition(v.matrixWorld),L.direction.transformDirection(l),D++}}}return{setup:d,setupView:R,state:i}}function ra(e){const n=new Cf(e),t=[],i=[];function c(U){E.camera=U,t.length=0,i.length=0}function o(U){t.push(U)}function h(U){i.push(U)}function d(){n.setup(t)}function R(U){n.setupView(t,U)}const E={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:c,state:E,setupLights:d,setupLightsView:R,pushLight:o,pushShadow:h}}function Pf(e){let n=new WeakMap;function t(c,o=0){const h=n.get(c);let d;return h===void 0?(d=new ra(e),n.set(c,[d])):o>=h.length?(d=new ra(e),h.push(d)):d=h[o],d}function i(){n=new WeakMap}return{get:t,dispose:i}}const Lf=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Uf=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Df(e,n,t){let i=new oa;const c=new ht,o=new ht,h=new ut,d=new Sr({depthPacking:Er}),R=new Mr,E={},U=t.maxTextureSize,g={[Jt]:vt,[vt]:Jt,[bt]:bt},S=new Ut({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ht},radius:{value:4}},vertexShader:Lf,fragmentShader:Uf}),b=S.clone();b.defines.HORIZONTAL_PASS=1;const B=new Xn;B.setAttribute("position",new fn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const D=new Bt(B,S),l=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=da;let r=this.type;this.render=function(_,y,Q){if(l.enabled===!1||l.autoUpdate===!1&&l.needsUpdate===!1||_.length===0)return;const p=e.getRenderTarget(),f=e.getActiveCubeFace(),A=e.getActiveMipmapLevel(),O=e.state;O.setBlending(Lt),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const z=r!==Tt&&this.type===Tt,W=r===Tt&&this.type!==Tt;for(let $=0,X=_.length;$<X;$++){const re=_[$],H=re.shadow;if(H===void 0){Ye("WebGLShadowMap:",re,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;c.copy(H.mapSize);const fe=H.getFrameExtents();if(c.multiply(fe),o.copy(H.mapSize),(c.x>U||c.y>U)&&(c.x>U&&(o.x=Math.floor(U/fe.x),c.x=o.x*fe.x,H.mapSize.x=o.x),c.y>U&&(o.y=Math.floor(U/fe.y),c.y=o.y*fe.y,H.mapSize.y=o.y)),H.map===null||z===!0||W===!0){const De=this.type!==Tt?{minFilter:Zt,magFilter:Zt}:{};H.map!==null&&H.map.dispose(),H.map=new kt(c.x,c.y,De),H.map.texture.name=re.name+".shadowMap",H.camera.updateProjectionMatrix()}e.setRenderTarget(H.map),e.clear();const pe=H.getViewportCount();for(let De=0;De<pe;De++){const Ve=H.getViewport(De);h.set(o.x*Ve.x,o.y*Ve.y,o.x*Ve.z,o.y*Ve.w),O.viewport(h),H.updateMatrices(re,De),i=H.getFrustum(),L(y,Q,H.camera,re,this.type)}H.isPointLightShadow!==!0&&this.type===Tt&&P(H,Q),H.needsUpdate=!1}r=this.type,l.needsUpdate=!1,e.setRenderTarget(p,f,A)};function P(_,y){const Q=n.update(D);S.defines.VSM_SAMPLES!==_.blurSamples&&(S.defines.VSM_SAMPLES=_.blurSamples,b.defines.VSM_SAMPLES=_.blurSamples,S.needsUpdate=!0,b.needsUpdate=!0),_.mapPass===null&&(_.mapPass=new kt(c.x,c.y)),S.uniforms.shadow_pass.value=_.map.texture,S.uniforms.resolution.value=_.mapSize,S.uniforms.radius.value=_.radius,e.setRenderTarget(_.mapPass),e.clear(),e.renderBufferDirect(y,null,Q,S,D,null),b.uniforms.shadow_pass.value=_.mapPass.texture,b.uniforms.resolution.value=_.mapSize,b.uniforms.radius.value=_.radius,e.setRenderTarget(_.map),e.clear(),e.renderBufferDirect(y,null,Q,b,D,null)}function v(_,y,Q,p){let f=null;const A=Q.isPointLight===!0?_.customDistanceMaterial:_.customDepthMaterial;if(A!==void 0)f=A;else if(f=Q.isPointLight===!0?R:d,e.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0||y.alphaToCoverage===!0){const O=f.uuid,z=y.uuid;let W=E[O];W===void 0&&(W={},E[O]=W);let $=W[z];$===void 0&&($=f.clone(),W[z]=$,y.addEventListener("dispose",N)),f=$}if(f.visible=y.visible,f.wireframe=y.wireframe,p===Tt?f.side=y.shadowSide!==null?y.shadowSide:y.side:f.side=y.shadowSide!==null?y.shadowSide:g[y.side],f.alphaMap=y.alphaMap,f.alphaTest=y.alphaToCoverage===!0?.5:y.alphaTest,f.map=y.map,f.clipShadows=y.clipShadows,f.clippingPlanes=y.clippingPlanes,f.clipIntersection=y.clipIntersection,f.displacementMap=y.displacementMap,f.displacementScale=y.displacementScale,f.displacementBias=y.displacementBias,f.wireframeLinewidth=y.wireframeLinewidth,f.linewidth=y.linewidth,Q.isPointLight===!0&&f.isMeshDistanceMaterial===!0){const O=e.properties.get(f);O.light=Q}return f}function L(_,y,Q,p,f){if(_.visible===!1)return;if(_.layers.test(y.layers)&&(_.isMesh||_.isLine||_.isPoints)&&(_.castShadow||_.receiveShadow&&f===Tt)&&(!_.frustumCulled||i.intersectsObject(_))){_.modelViewMatrix.multiplyMatrices(Q.matrixWorldInverse,_.matrixWorld);const z=n.update(_),W=_.material;if(Array.isArray(W)){const $=z.groups;for(let X=0,re=$.length;X<re;X++){const H=$[X],fe=W[H.materialIndex];if(fe&&fe.visible){const pe=v(_,fe,p,f);_.onBeforeShadow(e,_,y,Q,z,pe,H),e.renderBufferDirect(Q,null,z,pe,_,H),_.onAfterShadow(e,_,y,Q,z,pe,H)}}}else if(W.visible){const $=v(_,W,p,f);_.onBeforeShadow(e,_,y,Q,z,$,null),e.renderBufferDirect(Q,null,z,$,_,null),_.onAfterShadow(e,_,y,Q,z,$,null)}}const O=_.children;for(let z=0,W=O.length;z<W;z++)L(O[z],y,Q,p,f)}function N(_){_.target.removeEventListener("dispose",N);for(const Q in E){const p=E[Q],f=_.target.uuid;f in p&&(p[f].dispose(),delete p[f])}}}const wf={[Vn]:Hn,[Gn]:Fn,[Bn]:yn,[hn]:On,[Hn]:Vn,[Fn]:Gn,[yn]:Bn,[On]:hn};function If(e,n){function t(){let m=!1;const ae=new ut;let ee=null;const te=new ut(0,0,0,0);return{setMask:function(Z){ee!==Z&&!m&&(e.colorMask(Z,Z,Z,Z),ee=Z)},setLocked:function(Z){m=Z},setClear:function(Z,k,de,Ce,We){We===!0&&(Z*=Ce,k*=Ce,de*=Ce),ae.set(Z,k,de,Ce),te.equals(ae)===!1&&(e.clearColor(Z,k,de,Ce),te.copy(ae))},reset:function(){m=!1,ee=null,te.set(-1,0,0,0)}}}function i(){let m=!1,ae=!1,ee=null,te=null,Z=null;return{setReversed:function(k){if(ae!==k){const de=n.get("EXT_clip_control");k?de.clipControlEXT(de.LOWER_LEFT_EXT,de.ZERO_TO_ONE_EXT):de.clipControlEXT(de.LOWER_LEFT_EXT,de.NEGATIVE_ONE_TO_ONE_EXT),ae=k;const Ce=Z;Z=null,this.setClear(Ce)}},getReversed:function(){return ae},setTest:function(k){k?q(e.DEPTH_TEST):le(e.DEPTH_TEST)},setMask:function(k){ee!==k&&!m&&(e.depthMask(k),ee=k)},setFunc:function(k){if(ae&&(k=wf[k]),te!==k){switch(k){case Vn:e.depthFunc(e.NEVER);break;case Hn:e.depthFunc(e.ALWAYS);break;case Gn:e.depthFunc(e.LESS);break;case hn:e.depthFunc(e.LEQUAL);break;case Bn:e.depthFunc(e.EQUAL);break;case On:e.depthFunc(e.GEQUAL);break;case Fn:e.depthFunc(e.GREATER);break;case yn:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}te=k}},setLocked:function(k){m=k},setClear:function(k){Z!==k&&(ae&&(k=1-k),e.clearDepth(k),Z=k)},reset:function(){m=!1,ee=null,te=null,Z=null,ae=!1}}}function c(){let m=!1,ae=null,ee=null,te=null,Z=null,k=null,de=null,Ce=null,We=null;return{setTest:function(Ge){m||(Ge?q(e.STENCIL_TEST):le(e.STENCIL_TEST))},setMask:function(Ge){ae!==Ge&&!m&&(e.stencilMask(Ge),ae=Ge)},setFunc:function(Ge,St,gt){(ee!==Ge||te!==St||Z!==gt)&&(e.stencilFunc(Ge,St,gt),ee=Ge,te=St,Z=gt)},setOp:function(Ge,St,gt){(k!==Ge||de!==St||Ce!==gt)&&(e.stencilOp(Ge,St,gt),k=Ge,de=St,Ce=gt)},setLocked:function(Ge){m=Ge},setClear:function(Ge){We!==Ge&&(e.clearStencil(Ge),We=Ge)},reset:function(){m=!1,ae=null,ee=null,te=null,Z=null,k=null,de=null,Ce=null,We=null}}}const o=new t,h=new i,d=new c,R=new WeakMap,E=new WeakMap;let U={},g={},S=new WeakMap,b=[],B=null,D=!1,l=null,r=null,P=null,v=null,L=null,N=null,_=null,y=new $e(0,0,0),Q=0,p=!1,f=null,A=null,O=null,z=null,W=null;const $=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let X=!1,re=0;const H=e.getParameter(e.VERSION);H.indexOf("WebGL")!==-1?(re=parseFloat(/^WebGL (\d)/.exec(H)[1]),X=re>=1):H.indexOf("OpenGL ES")!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),X=re>=2);let fe=null,pe={};const De=e.getParameter(e.SCISSOR_BOX),Ve=e.getParameter(e.VIEWPORT),Ze=new ut().fromArray(De),qe=new ut().fromArray(Ve);function Qe(m,ae,ee,te){const Z=new Uint8Array(4),k=e.createTexture();e.bindTexture(m,k),e.texParameteri(m,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(m,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let de=0;de<ee;de++)m===e.TEXTURE_3D||m===e.TEXTURE_2D_ARRAY?e.texImage3D(ae,0,e.RGBA,1,1,te,0,e.RGBA,e.UNSIGNED_BYTE,Z):e.texImage2D(ae+de,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,Z);return k}const V={};V[e.TEXTURE_2D]=Qe(e.TEXTURE_2D,e.TEXTURE_2D,1),V[e.TEXTURE_CUBE_MAP]=Qe(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),V[e.TEXTURE_2D_ARRAY]=Qe(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),V[e.TEXTURE_3D]=Qe(e.TEXTURE_3D,e.TEXTURE_3D,1,1),o.setClear(0,0,0,1),h.setClear(1),d.setClear(0),q(e.DEPTH_TEST),h.setFunc(hn),Ne(!1),ye(Ui),q(e.CULL_FACE),Ke(Lt);function q(m){U[m]!==!0&&(e.enable(m),U[m]=!0)}function le(m){U[m]!==!1&&(e.disable(m),U[m]=!1)}function Le(m,ae){return g[m]!==ae?(e.bindFramebuffer(m,ae),g[m]=ae,m===e.DRAW_FRAMEBUFFER&&(g[e.FRAMEBUFFER]=ae),m===e.FRAMEBUFFER&&(g[e.DRAW_FRAMEBUFFER]=ae),!0):!1}function _e(m,ae){let ee=b,te=!1;if(m){ee=S.get(ae),ee===void 0&&(ee=[],S.set(ae,ee));const Z=m.textures;if(ee.length!==Z.length||ee[0]!==e.COLOR_ATTACHMENT0){for(let k=0,de=Z.length;k<de;k++)ee[k]=e.COLOR_ATTACHMENT0+k;ee.length=Z.length,te=!0}}else ee[0]!==e.BACK&&(ee[0]=e.BACK,te=!0);te&&e.drawBuffers(ee)}function Ie(m){return B!==m?(e.useProgram(m),B=m,!0):!1}const ot={[Yt]:e.FUNC_ADD,[qa]:e.FUNC_SUBTRACT,[Ya]:e.FUNC_REVERSE_SUBTRACT};ot[no]=e.MIN,ot[io]=e.MAX;const we={[cr]:e.ZERO,[sr]:e.ONE,[or]:e.SRC_COLOR,[rr]:e.SRC_ALPHA,[ar]:e.SRC_ALPHA_SATURATE,[ir]:e.DST_COLOR,[nr]:e.DST_ALPHA,[tr]:e.ONE_MINUS_SRC_COLOR,[er]:e.ONE_MINUS_SRC_ALPHA,[ja]:e.ONE_MINUS_DST_COLOR,[Ja]:e.ONE_MINUS_DST_ALPHA,[Qa]:e.CONSTANT_COLOR,[Za]:e.ONE_MINUS_CONSTANT_COLOR,[$a]:e.CONSTANT_ALPHA,[Ka]:e.ONE_MINUS_CONSTANT_ALPHA};function Ke(m,ae,ee,te,Z,k,de,Ce,We,Ge){if(m===Lt){D===!0&&(le(e.BLEND),D=!1);return}if(D===!1&&(q(e.BLEND),D=!0),m!==wr){if(m!==l||Ge!==p){if((r!==Yt||L!==Yt)&&(e.blendEquation(e.FUNC_ADD),r=Yt,L=Yt),Ge)switch(m){case dn:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ii:e.blendFunc(e.ONE,e.ONE);break;case wi:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case Di:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:pt("WebGLState: Invalid blending: ",m);break}else switch(m){case dn:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case Ii:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case wi:pt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Di:pt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:pt("WebGLState: Invalid blending: ",m);break}P=null,v=null,N=null,_=null,y.set(0,0,0),Q=0,l=m,p=Ge}return}Z=Z||ae,k=k||ee,de=de||te,(ae!==r||Z!==L)&&(e.blendEquationSeparate(ot[ae],ot[Z]),r=ae,L=Z),(ee!==P||te!==v||k!==N||de!==_)&&(e.blendFuncSeparate(we[ee],we[te],we[k],we[de]),P=ee,v=te,N=k,_=de),(Ce.equals(y)===!1||We!==Q)&&(e.blendColor(Ce.r,Ce.g,Ce.b,We),y.copy(Ce),Q=We),l=m,p=!1}function x(m,ae){m.side===bt?le(e.CULL_FACE):q(e.CULL_FACE);let ee=m.side===vt;ae&&(ee=!ee),Ne(ee),m.blending===dn&&m.transparent===!1?Ke(Lt):Ke(m.blending,m.blendEquation,m.blendSrc,m.blendDst,m.blendEquationAlpha,m.blendSrcAlpha,m.blendDstAlpha,m.blendColor,m.blendAlpha,m.premultipliedAlpha),h.setFunc(m.depthFunc),h.setTest(m.depthTest),h.setMask(m.depthWrite),o.setMask(m.colorWrite);const te=m.stencilWrite;d.setTest(te),te&&(d.setMask(m.stencilWriteMask),d.setFunc(m.stencilFunc,m.stencilRef,m.stencilFuncMask),d.setOp(m.stencilFail,m.stencilZFail,m.stencilZPass)),he(m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits),m.alphaToCoverage===!0?q(e.SAMPLE_ALPHA_TO_COVERAGE):le(e.SAMPLE_ALPHA_TO_COVERAGE)}function Ne(m){f!==m&&(m?e.frontFace(e.CW):e.frontFace(e.CCW),f=m)}function ye(m){m!==Ur?(q(e.CULL_FACE),m!==A&&(m===Ui?e.cullFace(e.BACK):m===Dr?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):le(e.CULL_FACE),A=m}function ze(m){m!==O&&(X&&e.lineWidth(m),O=m)}function he(m,ae,ee){m?(q(e.POLYGON_OFFSET_FILL),(z!==ae||W!==ee)&&(e.polygonOffset(ae,ee),z=ae,W=ee)):le(e.POLYGON_OFFSET_FILL)}function Je(m){m?q(e.SCISSOR_TEST):le(e.SCISSOR_TEST)}function ge(m){m===void 0&&(m=e.TEXTURE0+$-1),fe!==m&&(e.activeTexture(m),fe=m)}function Pe(m,ae,ee){ee===void 0&&(fe===null?ee=e.TEXTURE0+$-1:ee=fe);let te=pe[ee];te===void 0&&(te={type:void 0,texture:void 0},pe[ee]=te),(te.type!==m||te.texture!==ae)&&(fe!==ee&&(e.activeTexture(ee),fe=ee),e.bindTexture(m,ae||V[m]),te.type=m,te.texture=ae)}function u(){const m=pe[fe];m!==void 0&&m.type!==void 0&&(e.bindTexture(m.type,null),m.type=void 0,m.texture=void 0)}function a(){try{e.compressedTexImage2D(...arguments)}catch(m){m("WebGLState:",m)}}function C(){try{e.compressedTexImage3D(...arguments)}catch(m){m("WebGLState:",m)}}function G(){try{e.texSubImage2D(...arguments)}catch(m){m("WebGLState:",m)}}function Y(){try{e.texSubImage3D(...arguments)}catch(m){m("WebGLState:",m)}}function F(){try{e.compressedTexSubImage2D(...arguments)}catch(m){m("WebGLState:",m)}}function me(){try{e.compressedTexSubImage3D(...arguments)}catch(m){m("WebGLState:",m)}}function ie(){try{e.texStorage2D(...arguments)}catch(m){m("WebGLState:",m)}}function Se(){try{e.texStorage3D(...arguments)}catch(m){m("WebGLState:",m)}}function xe(){try{e.texImage2D(...arguments)}catch(m){m("WebGLState:",m)}}function K(){try{e.texImage3D(...arguments)}catch(m){m("WebGLState:",m)}}function j(m){Ze.equals(m)===!1&&(e.scissor(m.x,m.y,m.z,m.w),Ze.copy(m))}function be(m){qe.equals(m)===!1&&(e.viewport(m.x,m.y,m.z,m.w),qe.copy(m))}function Me(m,ae){let ee=E.get(ae);ee===void 0&&(ee=new WeakMap,E.set(ae,ee));let te=ee.get(m);te===void 0&&(te=e.getUniformBlockIndex(ae,m.name),ee.set(m,te))}function se(m,ae){const te=E.get(ae).get(m);R.get(ae)!==te&&(e.uniformBlockBinding(ae,te,m.__bindingPointIndex),R.set(ae,te))}function Re(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),h.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),U={},fe=null,pe={},g={},S=new WeakMap,b=[],B=null,D=!1,l=null,r=null,P=null,v=null,L=null,N=null,_=null,y=new $e(0,0,0),Q=0,p=!1,f=null,A=null,O=null,z=null,W=null,Ze.set(0,0,e.canvas.width,e.canvas.height),qe.set(0,0,e.canvas.width,e.canvas.height),o.reset(),h.reset(),d.reset()}return{buffers:{color:o,depth:h,stencil:d},enable:q,disable:le,bindFramebuffer:Le,drawBuffers:_e,useProgram:Ie,setBlending:Ke,setMaterial:x,setFlipSided:Ne,setCullFace:ye,setLineWidth:ze,setPolygonOffset:he,setScissorTest:Je,activeTexture:ge,bindTexture:Pe,unbindTexture:u,compressedTexImage2D:a,compressedTexImage3D:C,texImage2D:xe,texImage3D:K,updateUBOMapping:Me,uniformBlockBinding:se,texStorage2D:ie,texStorage3D:Se,texSubImage2D:G,texSubImage3D:Y,compressedTexSubImage2D:F,compressedTexSubImage3D:me,scissor:j,viewport:be,reset:Re}}function Nf(e,n,t,i,c,o,h){const d=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,R=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),E=new ht,U=new WeakMap;let g;const S=new WeakMap;let b=!1;try{b=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function B(u,a){return b?new OffscreenCanvas(u,a):Jr("canvas")}function D(u,a,C){let G=1;const Y=Pe(u);if((Y.width>C||Y.height>C)&&(G=C/Math.max(Y.width,Y.height)),G<1)if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&u instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&u instanceof ImageBitmap||typeof VideoFrame<"u"&&u instanceof VideoFrame){const F=Math.floor(G*Y.width),me=Math.floor(G*Y.height);g===void 0&&(g=B(F,me));const ie=a?B(F,me):g;return ie.width=F,ie.height=me,ie.getContext("2d").drawImage(u,0,0,F,me),Ye("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+F+"x"+me+")."),ie}else return"data"in u&&Ye("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),u;return u}function l(u){return u.generateMipmaps}function r(u){e.generateMipmap(u)}function P(u){return u.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:u.isWebGL3DRenderTarget?e.TEXTURE_3D:u.isWebGLArrayRenderTarget||u.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function v(u,a,C,G,Y=!1){if(u!==null){if(e[u]!==void 0)return e[u];Ye("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+u+"'")}let F=a;if(a===e.RED&&(C===e.FLOAT&&(F=e.R32F),C===e.HALF_FLOAT&&(F=e.R16F),C===e.UNSIGNED_BYTE&&(F=e.R8)),a===e.RED_INTEGER&&(C===e.UNSIGNED_BYTE&&(F=e.R8UI),C===e.UNSIGNED_SHORT&&(F=e.R16UI),C===e.UNSIGNED_INT&&(F=e.R32UI),C===e.BYTE&&(F=e.R8I),C===e.SHORT&&(F=e.R16I),C===e.INT&&(F=e.R32I)),a===e.RG&&(C===e.FLOAT&&(F=e.RG32F),C===e.HALF_FLOAT&&(F=e.RG16F),C===e.UNSIGNED_BYTE&&(F=e.RG8)),a===e.RG_INTEGER&&(C===e.UNSIGNED_BYTE&&(F=e.RG8UI),C===e.UNSIGNED_SHORT&&(F=e.RG16UI),C===e.UNSIGNED_INT&&(F=e.RG32UI),C===e.BYTE&&(F=e.RG8I),C===e.SHORT&&(F=e.RG16I),C===e.INT&&(F=e.RG32I)),a===e.RGB_INTEGER&&(C===e.UNSIGNED_BYTE&&(F=e.RGB8UI),C===e.UNSIGNED_SHORT&&(F=e.RGB16UI),C===e.UNSIGNED_INT&&(F=e.RGB32UI),C===e.BYTE&&(F=e.RGB8I),C===e.SHORT&&(F=e.RGB16I),C===e.INT&&(F=e.RGB32I)),a===e.RGBA_INTEGER&&(C===e.UNSIGNED_BYTE&&(F=e.RGBA8UI),C===e.UNSIGNED_SHORT&&(F=e.RGBA16UI),C===e.UNSIGNED_INT&&(F=e.RGBA32UI),C===e.BYTE&&(F=e.RGBA8I),C===e.SHORT&&(F=e.RGBA16I),C===e.INT&&(F=e.RGBA32I)),a===e.RGB&&(C===e.UNSIGNED_INT_5_9_9_9_REV&&(F=e.RGB9_E5),C===e.UNSIGNED_INT_10F_11F_11F_REV&&(F=e.R11F_G11F_B10F)),a===e.RGBA){const me=Y?Ta:it.getTransfer(G);C===e.FLOAT&&(F=e.RGBA32F),C===e.HALF_FLOAT&&(F=e.RGBA16F),C===e.UNSIGNED_BYTE&&(F=me===Xe?e.SRGB8_ALPHA8:e.RGBA8),C===e.UNSIGNED_SHORT_4_4_4_4&&(F=e.RGBA4),C===e.UNSIGNED_SHORT_5_5_5_1&&(F=e.RGB5_A1)}return(F===e.R16F||F===e.R32F||F===e.RG16F||F===e.RG32F||F===e.RGBA16F||F===e.RGBA32F)&&n.get("EXT_color_buffer_float"),F}function L(u,a){let C;return u?a===null||a===tn||a===en?C=e.DEPTH24_STENCIL8:a===Ft?C=e.DEPTH32F_STENCIL8:a===xn&&(C=e.DEPTH24_STENCIL8,Ye("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):a===null||a===tn||a===en?C=e.DEPTH_COMPONENT24:a===Ft?C=e.DEPTH_COMPONENT32F:a===xn&&(C=e.DEPTH_COMPONENT16),C}function N(u,a){return l(u)===!0||u.isFramebufferTexture&&u.minFilter!==Zt&&u.minFilter!==Rt?Math.log2(Math.max(a.width,a.height))+1:u.mipmaps!==void 0&&u.mipmaps.length>0?u.mipmaps.length:u.isCompressedTexture&&Array.isArray(u.image)?a.mipmaps.length:1}function _(u){const a=u.target;a.removeEventListener("dispose",_),Q(a),a.isVideoTexture&&U.delete(a)}function y(u){const a=u.target;a.removeEventListener("dispose",y),f(a)}function Q(u){const a=i.get(u);if(a.__webglInit===void 0)return;const C=u.source,G=S.get(C);if(G){const Y=G[a.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&p(u),Object.keys(G).length===0&&S.delete(C)}i.remove(u)}function p(u){const a=i.get(u);e.deleteTexture(a.__webglTexture);const C=u.source,G=S.get(C);delete G[a.__cacheKey],h.memory.textures--}function f(u){const a=i.get(u);if(u.depthTexture&&(u.depthTexture.dispose(),i.remove(u.depthTexture)),u.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(a.__webglFramebuffer[G]))for(let Y=0;Y<a.__webglFramebuffer[G].length;Y++)e.deleteFramebuffer(a.__webglFramebuffer[G][Y]);else e.deleteFramebuffer(a.__webglFramebuffer[G]);a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer[G])}else{if(Array.isArray(a.__webglFramebuffer))for(let G=0;G<a.__webglFramebuffer.length;G++)e.deleteFramebuffer(a.__webglFramebuffer[G]);else e.deleteFramebuffer(a.__webglFramebuffer);if(a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer),a.__webglMultisampledFramebuffer&&e.deleteFramebuffer(a.__webglMultisampledFramebuffer),a.__webglColorRenderbuffer)for(let G=0;G<a.__webglColorRenderbuffer.length;G++)a.__webglColorRenderbuffer[G]&&e.deleteRenderbuffer(a.__webglColorRenderbuffer[G]);a.__webglDepthRenderbuffer&&e.deleteRenderbuffer(a.__webglDepthRenderbuffer)}const C=u.textures;for(let G=0,Y=C.length;G<Y;G++){const F=i.get(C[G]);F.__webglTexture&&(e.deleteTexture(F.__webglTexture),h.memory.textures--),i.remove(C[G])}i.remove(u)}let A=0;function O(){A=0}function z(){const u=A;return u>=c.maxTextures&&Ye("WebGLTextures: Trying to use "+u+" texture units while this GPU supports only "+c.maxTextures),A+=1,u}function W(u){const a=[];return a.push(u.wrapS),a.push(u.wrapT),a.push(u.wrapR||0),a.push(u.magFilter),a.push(u.minFilter),a.push(u.anisotropy),a.push(u.internalFormat),a.push(u.format),a.push(u.type),a.push(u.generateMipmaps),a.push(u.premultiplyAlpha),a.push(u.flipY),a.push(u.unpackAlignment),a.push(u.colorSpace),a.join()}function $(u,a){const C=i.get(u);if(u.isVideoTexture&&Je(u),u.isRenderTargetTexture===!1&&u.isExternalTexture!==!0&&u.version>0&&C.__version!==u.version){const G=u.image;if(G===null)Ye("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Ye("WebGLRenderer: Texture marked for update but image is incomplete");else{V(C,u,a);return}}else u.isExternalTexture&&(C.__webglTexture=u.sourceTexture?u.sourceTexture:null);t.bindTexture(e.TEXTURE_2D,C.__webglTexture,e.TEXTURE0+a)}function X(u,a){const C=i.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&C.__version!==u.version){V(C,u,a);return}else u.isExternalTexture&&(C.__webglTexture=u.sourceTexture?u.sourceTexture:null);t.bindTexture(e.TEXTURE_2D_ARRAY,C.__webglTexture,e.TEXTURE0+a)}function re(u,a){const C=i.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&C.__version!==u.version){V(C,u,a);return}t.bindTexture(e.TEXTURE_3D,C.__webglTexture,e.TEXTURE0+a)}function H(u,a){const C=i.get(u);if(u.version>0&&C.__version!==u.version){q(C,u,a);return}t.bindTexture(e.TEXTURE_CUBE_MAP,C.__webglTexture,e.TEXTURE0+a)}const fe={[fr]:e.REPEAT,[Nn]:e.CLAMP_TO_EDGE,[lr]:e.MIRRORED_REPEAT},pe={[Zt]:e.NEAREST,[dr]:e.NEAREST_MIPMAP_NEAREST,[on]:e.NEAREST_MIPMAP_LINEAR,[Rt]:e.LINEAR,[Tn]:e.LINEAR_MIPMAP_NEAREST,[Kt]:e.LINEAR_MIPMAP_LINEAR},De={[vr]:e.NEVER,[_r]:e.ALWAYS,[mr]:e.LESS,[fa]:e.LEQUAL,[xr]:e.EQUAL,[hr]:e.GEQUAL,[pr]:e.GREATER,[ur]:e.NOTEQUAL};function Ve(u,a){if(a.type===Ft&&n.has("OES_texture_float_linear")===!1&&(a.magFilter===Rt||a.magFilter===Tn||a.magFilter===on||a.magFilter===Kt||a.minFilter===Rt||a.minFilter===Tn||a.minFilter===on||a.minFilter===Kt)&&Ye("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(u,e.TEXTURE_WRAP_S,fe[a.wrapS]),e.texParameteri(u,e.TEXTURE_WRAP_T,fe[a.wrapT]),(u===e.TEXTURE_3D||u===e.TEXTURE_2D_ARRAY)&&e.texParameteri(u,e.TEXTURE_WRAP_R,fe[a.wrapR]),e.texParameteri(u,e.TEXTURE_MAG_FILTER,pe[a.magFilter]),e.texParameteri(u,e.TEXTURE_MIN_FILTER,pe[a.minFilter]),a.compareFunction&&(e.texParameteri(u,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(u,e.TEXTURE_COMPARE_FUNC,De[a.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(a.magFilter===Zt||a.minFilter!==on&&a.minFilter!==Kt||a.type===Ft&&n.has("OES_texture_float_linear")===!1)return;if(a.anisotropy>1||i.get(a).__currentAnisotropy){const C=n.get("EXT_texture_filter_anisotropic");e.texParameterf(u,C.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,c.getMaxAnisotropy())),i.get(a).__currentAnisotropy=a.anisotropy}}}function Ze(u,a){let C=!1;u.__webglInit===void 0&&(u.__webglInit=!0,a.addEventListener("dispose",_));const G=a.source;let Y=S.get(G);Y===void 0&&(Y={},S.set(G,Y));const F=W(a);if(F!==u.__cacheKey){Y[F]===void 0&&(Y[F]={texture:e.createTexture(),usedTimes:0},h.memory.textures++,C=!0),Y[F].usedTimes++;const me=Y[u.__cacheKey];me!==void 0&&(Y[u.__cacheKey].usedTimes--,me.usedTimes===0&&p(a)),u.__cacheKey=F,u.__webglTexture=Y[F].texture}return C}function qe(u,a,C){return Math.floor(Math.floor(u/C)/a)}function Qe(u,a,C,G){const F=u.updateRanges;if(F.length===0)t.texSubImage2D(e.TEXTURE_2D,0,0,0,a.width,a.height,C,G,a.data);else{F.sort((K,j)=>K.start-j.start);let me=0;for(let K=1;K<F.length;K++){const j=F[me],be=F[K],Me=j.start+j.count,se=qe(be.start,a.width,4),Re=qe(j.start,a.width,4);be.start<=Me+1&&se===Re&&qe(be.start+be.count-1,a.width,4)===se?j.count=Math.max(j.count,be.start+be.count-j.start):(++me,F[me]=be)}F.length=me+1;const ie=e.getParameter(e.UNPACK_ROW_LENGTH),Se=e.getParameter(e.UNPACK_SKIP_PIXELS),xe=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,a.width);for(let K=0,j=F.length;K<j;K++){const be=F[K],Me=Math.floor(be.start/4),se=Math.ceil(be.count/4),Re=Me%a.width,m=Math.floor(Me/a.width),ae=se,ee=1;e.pixelStorei(e.UNPACK_SKIP_PIXELS,Re),e.pixelStorei(e.UNPACK_SKIP_ROWS,m),t.texSubImage2D(e.TEXTURE_2D,0,Re,m,ae,ee,C,G,a.data)}u.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,ie),e.pixelStorei(e.UNPACK_SKIP_PIXELS,Se),e.pixelStorei(e.UNPACK_SKIP_ROWS,xe)}}function V(u,a,C){let G=e.TEXTURE_2D;(a.isDataArrayTexture||a.isCompressedArrayTexture)&&(G=e.TEXTURE_2D_ARRAY),a.isData3DTexture&&(G=e.TEXTURE_3D);const Y=Ze(u,a),F=a.source;t.bindTexture(G,u.__webglTexture,e.TEXTURE0+C);const me=i.get(F);if(F.version!==me.__version||Y===!0){t.activeTexture(e.TEXTURE0+C);const ie=it.getPrimaries(it.workingColorSpace),Se=a.colorSpace===Vt?null:it.getPrimaries(a.colorSpace),xe=a.colorSpace===Vt||ie===Se?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe);let K=D(a.image,!1,c.maxTextureSize);K=ge(a,K);const j=o.convert(a.format,a.colorSpace),be=o.convert(a.type);let Me=v(a.internalFormat,j,be,a.colorSpace,a.isVideoTexture);Ve(G,a);let se;const Re=a.mipmaps,m=a.isVideoTexture!==!0,ae=me.__version===void 0||Y===!0,ee=F.dataReady,te=N(a,K);if(a.isDepthTexture)Me=L(a.format===pn,a.type),ae&&(m?t.texStorage2D(e.TEXTURE_2D,1,Me,K.width,K.height):t.texImage2D(e.TEXTURE_2D,0,Me,K.width,K.height,0,j,be,null));else if(a.isDataTexture)if(Re.length>0){m&&ae&&t.texStorage2D(e.TEXTURE_2D,te,Me,Re[0].width,Re[0].height);for(let Z=0,k=Re.length;Z<k;Z++)se=Re[Z],m?ee&&t.texSubImage2D(e.TEXTURE_2D,Z,0,0,se.width,se.height,j,be,se.data):t.texImage2D(e.TEXTURE_2D,Z,Me,se.width,se.height,0,j,be,se.data);a.generateMipmaps=!1}else m?(ae&&t.texStorage2D(e.TEXTURE_2D,te,Me,K.width,K.height),ee&&Qe(a,K,j,be)):t.texImage2D(e.TEXTURE_2D,0,Me,K.width,K.height,0,j,be,K.data);else if(a.isCompressedTexture)if(a.isCompressedArrayTexture){m&&ae&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Me,Re[0].width,Re[0].height,K.depth);for(let Z=0,k=Re.length;Z<k;Z++)if(se=Re[Z],a.format!==At)if(j!==null)if(m){if(ee)if(a.layerUpdates.size>0){const de=yi(se.width,se.height,a.format,a.type);for(const Ce of a.layerUpdates){const We=se.data.subarray(Ce*de/se.data.BYTES_PER_ELEMENT,(Ce+1)*de/se.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,Z,0,0,Ce,se.width,se.height,1,j,We)}a.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,Z,0,0,0,se.width,se.height,K.depth,j,se.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,Z,Me,se.width,se.height,K.depth,0,se.data,0,0);else Ye("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else m?ee&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,Z,0,0,0,se.width,se.height,K.depth,j,be,se.data):t.texImage3D(e.TEXTURE_2D_ARRAY,Z,Me,se.width,se.height,K.depth,0,j,be,se.data)}else{m&&ae&&t.texStorage2D(e.TEXTURE_2D,te,Me,Re[0].width,Re[0].height);for(let Z=0,k=Re.length;Z<k;Z++)se=Re[Z],a.format!==At?j!==null?m?ee&&t.compressedTexSubImage2D(e.TEXTURE_2D,Z,0,0,se.width,se.height,j,se.data):t.compressedTexImage2D(e.TEXTURE_2D,Z,Me,se.width,se.height,0,se.data):Ye("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):m?ee&&t.texSubImage2D(e.TEXTURE_2D,Z,0,0,se.width,se.height,j,be,se.data):t.texImage2D(e.TEXTURE_2D,Z,Me,se.width,se.height,0,j,be,se.data)}else if(a.isDataArrayTexture)if(m){if(ae&&t.texStorage3D(e.TEXTURE_2D_ARRAY,te,Me,K.width,K.height,K.depth),ee)if(a.layerUpdates.size>0){const Z=yi(K.width,K.height,a.format,a.type);for(const k of a.layerUpdates){const de=K.data.subarray(k*Z/K.data.BYTES_PER_ELEMENT,(k+1)*Z/K.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,k,K.width,K.height,1,j,be,de)}a.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,K.width,K.height,K.depth,j,be,K.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Me,K.width,K.height,K.depth,0,j,be,K.data);else if(a.isData3DTexture)m?(ae&&t.texStorage3D(e.TEXTURE_3D,te,Me,K.width,K.height,K.depth),ee&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,K.width,K.height,K.depth,j,be,K.data)):t.texImage3D(e.TEXTURE_3D,0,Me,K.width,K.height,K.depth,0,j,be,K.data);else if(a.isFramebufferTexture){if(ae)if(m)t.texStorage2D(e.TEXTURE_2D,te,Me,K.width,K.height);else{let Z=K.width,k=K.height;for(let de=0;de<te;de++)t.texImage2D(e.TEXTURE_2D,de,Me,Z,k,0,j,be,null),Z>>=1,k>>=1}}else if(Re.length>0){if(m&&ae){const Z=Pe(Re[0]);t.texStorage2D(e.TEXTURE_2D,te,Me,Z.width,Z.height)}for(let Z=0,k=Re.length;Z<k;Z++)se=Re[Z],m?ee&&t.texSubImage2D(e.TEXTURE_2D,Z,0,0,j,be,se):t.texImage2D(e.TEXTURE_2D,Z,Me,j,be,se);a.generateMipmaps=!1}else if(m){if(ae){const Z=Pe(K);t.texStorage2D(e.TEXTURE_2D,te,Me,Z.width,Z.height)}ee&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,j,be,K)}else t.texImage2D(e.TEXTURE_2D,0,Me,j,be,K);l(a)&&r(G),me.__version=F.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function q(u,a,C){if(a.image.length!==6)return;const G=Ze(u,a),Y=a.source;t.bindTexture(e.TEXTURE_CUBE_MAP,u.__webglTexture,e.TEXTURE0+C);const F=i.get(Y);if(Y.version!==F.__version||G===!0){t.activeTexture(e.TEXTURE0+C);const me=it.getPrimaries(it.workingColorSpace),ie=a.colorSpace===Vt?null:it.getPrimaries(a.colorSpace),Se=a.colorSpace===Vt||me===ie?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);const xe=a.isCompressedTexture||a.image[0].isCompressedTexture,K=a.image[0]&&a.image[0].isDataTexture,j=[];for(let k=0;k<6;k++)!xe&&!K?j[k]=D(a.image[k],!0,c.maxCubemapSize):j[k]=K?a.image[k].image:a.image[k],j[k]=ge(a,j[k]);const be=j[0],Me=o.convert(a.format,a.colorSpace),se=o.convert(a.type),Re=v(a.internalFormat,Me,se,a.colorSpace),m=a.isVideoTexture!==!0,ae=F.__version===void 0||G===!0,ee=Y.dataReady;let te=N(a,be);Ve(e.TEXTURE_CUBE_MAP,a);let Z;if(xe){m&&ae&&t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Re,be.width,be.height);for(let k=0;k<6;k++){Z=j[k].mipmaps;for(let de=0;de<Z.length;de++){const Ce=Z[de];a.format!==At?Me!==null?m?ee&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de,0,0,Ce.width,Ce.height,Me,Ce.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de,Re,Ce.width,Ce.height,0,Ce.data):Ye("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):m?ee&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de,0,0,Ce.width,Ce.height,Me,se,Ce.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de,Re,Ce.width,Ce.height,0,Me,se,Ce.data)}}}else{if(Z=a.mipmaps,m&&ae){Z.length>0&&te++;const k=Pe(j[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,te,Re,k.width,k.height)}for(let k=0;k<6;k++)if(K){m?ee&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,0,0,j[k].width,j[k].height,Me,se,j[k].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,Re,j[k].width,j[k].height,0,Me,se,j[k].data);for(let de=0;de<Z.length;de++){const We=Z[de].image[k].image;m?ee&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de+1,0,0,We.width,We.height,Me,se,We.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de+1,Re,We.width,We.height,0,Me,se,We.data)}}else{m?ee&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,0,0,Me,se,j[k]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,Re,Me,se,j[k]);for(let de=0;de<Z.length;de++){const Ce=Z[de];m?ee&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de+1,0,0,Me,se,Ce.image[k]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,de+1,Re,Me,se,Ce.image[k])}}}l(a)&&r(e.TEXTURE_CUBE_MAP),F.__version=Y.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function le(u,a,C,G,Y,F){const me=o.convert(C.format,C.colorSpace),ie=o.convert(C.type),Se=v(C.internalFormat,me,ie,C.colorSpace),xe=i.get(a),K=i.get(C);if(K.__renderTarget=a,!xe.__hasExternalTextures){const j=Math.max(1,a.width>>F),be=Math.max(1,a.height>>F);Y===e.TEXTURE_3D||Y===e.TEXTURE_2D_ARRAY?t.texImage3D(Y,F,Se,j,be,a.depth,0,me,ie,null):t.texImage2D(Y,F,Se,j,be,0,me,ie,null)}t.bindFramebuffer(e.FRAMEBUFFER,u),he(a)?d.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,G,Y,K.__webglTexture,0,ze(a)):(Y===e.TEXTURE_2D||Y>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,G,Y,K.__webglTexture,F),t.bindFramebuffer(e.FRAMEBUFFER,null)}function Le(u,a,C){if(e.bindRenderbuffer(e.RENDERBUFFER,u),a.depthBuffer){const G=a.depthTexture,Y=G&&G.isDepthTexture?G.type:null,F=L(a.stencilBuffer,Y),me=a.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ie=ze(a);he(a)?d.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ie,F,a.width,a.height):C?e.renderbufferStorageMultisample(e.RENDERBUFFER,ie,F,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,F,a.width,a.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,me,e.RENDERBUFFER,u)}else{const G=a.textures;for(let Y=0;Y<G.length;Y++){const F=G[Y],me=o.convert(F.format,F.colorSpace),ie=o.convert(F.type),Se=v(F.internalFormat,me,ie,F.colorSpace),xe=ze(a);C&&he(a)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,xe,Se,a.width,a.height):he(a)?d.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,xe,Se,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,Se,a.width,a.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function _e(u,a){if(a&&a.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(e.FRAMEBUFFER,u),!(a.depthTexture&&a.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const G=i.get(a.depthTexture);G.__renderTarget=a,(!G.__webglTexture||a.depthTexture.image.width!==a.width||a.depthTexture.image.height!==a.height)&&(a.depthTexture.image.width=a.width,a.depthTexture.image.height=a.height,a.depthTexture.needsUpdate=!0),$(a.depthTexture,0);const Y=G.__webglTexture,F=ze(a);if(a.depthTexture.format===Yn)he(a)?d.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,Y,0,F):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,Y,0);else if(a.depthTexture.format===pn)he(a)?d.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,Y,0,F):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,Y,0);else throw new Error("Unknown depthTexture format")}function Ie(u){const a=i.get(u),C=u.isWebGLCubeRenderTarget===!0;if(a.__boundDepthTexture!==u.depthTexture){const G=u.depthTexture;if(a.__depthDisposeCallback&&a.__depthDisposeCallback(),G){const Y=()=>{delete a.__boundDepthTexture,delete a.__depthDisposeCallback,G.removeEventListener("dispose",Y)};G.addEventListener("dispose",Y),a.__depthDisposeCallback=Y}a.__boundDepthTexture=G}if(u.depthTexture&&!a.__autoAllocateDepthBuffer){if(C)throw new Error("target.depthTexture not supported in Cube render targets");const G=u.texture.mipmaps;G&&G.length>0?_e(a.__webglFramebuffer[0],u):_e(a.__webglFramebuffer,u)}else if(C){a.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer[G]),a.__webglDepthbuffer[G]===void 0)a.__webglDepthbuffer[G]=e.createRenderbuffer(),Le(a.__webglDepthbuffer[G],u,!1);else{const Y=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,F=a.__webglDepthbuffer[G];e.bindRenderbuffer(e.RENDERBUFFER,F),e.framebufferRenderbuffer(e.FRAMEBUFFER,Y,e.RENDERBUFFER,F)}}else{const G=u.texture.mipmaps;if(G&&G.length>0?t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer[0]):t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer),a.__webglDepthbuffer===void 0)a.__webglDepthbuffer=e.createRenderbuffer(),Le(a.__webglDepthbuffer,u,!1);else{const Y=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,F=a.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,F),e.framebufferRenderbuffer(e.FRAMEBUFFER,Y,e.RENDERBUFFER,F)}}t.bindFramebuffer(e.FRAMEBUFFER,null)}function ot(u,a,C){const G=i.get(u);a!==void 0&&le(G.__webglFramebuffer,u,u.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),C!==void 0&&Ie(u)}function we(u){const a=u.texture,C=i.get(u),G=i.get(a);u.addEventListener("dispose",y);const Y=u.textures,F=u.isWebGLCubeRenderTarget===!0,me=Y.length>1;if(me||(G.__webglTexture===void 0&&(G.__webglTexture=e.createTexture()),G.__version=a.version,h.memory.textures++),F){C.__webglFramebuffer=[];for(let ie=0;ie<6;ie++)if(a.mipmaps&&a.mipmaps.length>0){C.__webglFramebuffer[ie]=[];for(let Se=0;Se<a.mipmaps.length;Se++)C.__webglFramebuffer[ie][Se]=e.createFramebuffer()}else C.__webglFramebuffer[ie]=e.createFramebuffer()}else{if(a.mipmaps&&a.mipmaps.length>0){C.__webglFramebuffer=[];for(let ie=0;ie<a.mipmaps.length;ie++)C.__webglFramebuffer[ie]=e.createFramebuffer()}else C.__webglFramebuffer=e.createFramebuffer();if(me)for(let ie=0,Se=Y.length;ie<Se;ie++){const xe=i.get(Y[ie]);xe.__webglTexture===void 0&&(xe.__webglTexture=e.createTexture(),h.memory.textures++)}if(u.samples>0&&he(u)===!1){C.__webglMultisampledFramebuffer=e.createFramebuffer(),C.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,C.__webglMultisampledFramebuffer);for(let ie=0;ie<Y.length;ie++){const Se=Y[ie];C.__webglColorRenderbuffer[ie]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,C.__webglColorRenderbuffer[ie]);const xe=o.convert(Se.format,Se.colorSpace),K=o.convert(Se.type),j=v(Se.internalFormat,xe,K,Se.colorSpace,u.isXRRenderTarget===!0),be=ze(u);e.renderbufferStorageMultisample(e.RENDERBUFFER,be,j,u.width,u.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ie,e.RENDERBUFFER,C.__webglColorRenderbuffer[ie])}e.bindRenderbuffer(e.RENDERBUFFER,null),u.depthBuffer&&(C.__webglDepthRenderbuffer=e.createRenderbuffer(),Le(C.__webglDepthRenderbuffer,u,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(F){t.bindTexture(e.TEXTURE_CUBE_MAP,G.__webglTexture),Ve(e.TEXTURE_CUBE_MAP,a);for(let ie=0;ie<6;ie++)if(a.mipmaps&&a.mipmaps.length>0)for(let Se=0;Se<a.mipmaps.length;Se++)le(C.__webglFramebuffer[ie][Se],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ie,Se);else le(C.__webglFramebuffer[ie],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+ie,0);l(a)&&r(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(me){for(let ie=0,Se=Y.length;ie<Se;ie++){const xe=Y[ie],K=i.get(xe);let j=e.TEXTURE_2D;(u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(j=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(j,K.__webglTexture),Ve(j,xe),le(C.__webglFramebuffer,u,xe,e.COLOR_ATTACHMENT0+ie,j,0),l(xe)&&r(j)}t.unbindTexture()}else{let ie=e.TEXTURE_2D;if((u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(ie=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(ie,G.__webglTexture),Ve(ie,a),a.mipmaps&&a.mipmaps.length>0)for(let Se=0;Se<a.mipmaps.length;Se++)le(C.__webglFramebuffer[Se],u,a,e.COLOR_ATTACHMENT0,ie,Se);else le(C.__webglFramebuffer,u,a,e.COLOR_ATTACHMENT0,ie,0);l(a)&&r(ie),t.unbindTexture()}u.depthBuffer&&Ie(u)}function Ke(u){const a=u.textures;for(let C=0,G=a.length;C<G;C++){const Y=a[C];if(l(Y)){const F=P(u),me=i.get(Y).__webglTexture;t.bindTexture(F,me),r(F),t.unbindTexture()}}}const x=[],Ne=[];function ye(u){if(u.samples>0){if(he(u)===!1){const a=u.textures,C=u.width,G=u.height;let Y=e.COLOR_BUFFER_BIT;const F=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,me=i.get(u),ie=a.length>1;if(ie)for(let xe=0;xe<a.length;xe++)t.bindFramebuffer(e.FRAMEBUFFER,me.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+xe,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,me.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+xe,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,me.__webglMultisampledFramebuffer);const Se=u.texture.mipmaps;Se&&Se.length>0?t.bindFramebuffer(e.DRAW_FRAMEBUFFER,me.__webglFramebuffer[0]):t.bindFramebuffer(e.DRAW_FRAMEBUFFER,me.__webglFramebuffer);for(let xe=0;xe<a.length;xe++){if(u.resolveDepthBuffer&&(u.depthBuffer&&(Y|=e.DEPTH_BUFFER_BIT),u.stencilBuffer&&u.resolveStencilBuffer&&(Y|=e.STENCIL_BUFFER_BIT)),ie){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,me.__webglColorRenderbuffer[xe]);const K=i.get(a[xe]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,K,0)}e.blitFramebuffer(0,0,C,G,0,0,C,G,Y,e.NEAREST),R===!0&&(x.length=0,Ne.length=0,x.push(e.COLOR_ATTACHMENT0+xe),u.depthBuffer&&u.resolveDepthBuffer===!1&&(x.push(F),Ne.push(F),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,Ne)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,x))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),ie)for(let xe=0;xe<a.length;xe++){t.bindFramebuffer(e.FRAMEBUFFER,me.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+xe,e.RENDERBUFFER,me.__webglColorRenderbuffer[xe]);const K=i.get(a[xe]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,me.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+xe,e.TEXTURE_2D,K,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,me.__webglMultisampledFramebuffer)}else if(u.depthBuffer&&u.resolveDepthBuffer===!1&&R){const a=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[a])}}}function ze(u){return Math.min(c.maxSamples,u.samples)}function he(u){const a=i.get(u);return u.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&a.__useRenderToTexture!==!1}function Je(u){const a=h.render.frame;U.get(u)!==a&&(U.set(u,a),u.update())}function ge(u,a){const C=u.colorSpace,G=u.format,Y=u.type;return u.isCompressedTexture===!0||u.isVideoTexture===!0||C!==mn&&C!==Vt&&(it.getTransfer(C)===Xe?(G!==At||Y!==Ot)&&Ye("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):pt("WebGLTextures: Unsupported texture color space:",C)),a}function Pe(u){return typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement?(E.width=u.naturalWidth||u.width,E.height=u.naturalHeight||u.height):typeof VideoFrame<"u"&&u instanceof VideoFrame?(E.width=u.displayWidth,E.height=u.displayHeight):(E.width=u.width,E.height=u.height),E}this.allocateTextureUnit=z,this.resetTextureUnits=O,this.setTexture2D=$,this.setTexture2DArray=X,this.setTexture3D=re,this.setTextureCube=H,this.rebindTextures=ot,this.setupRenderTarget=we,this.updateRenderTargetMipmap=Ke,this.updateMultisampleRenderTarget=ye,this.setupDepthRenderbuffer=Ie,this.setupFrameBufferTexture=le,this.useMultisampledRTT=he}function yf(e,n){function t(i,c=Vt){let o;const h=it.getTransfer(c);if(i===Ot)return e.UNSIGNED_BYTE;if(i===xa)return e.UNSIGNED_SHORT_4_4_4_4;if(i===ma)return e.UNSIGNED_SHORT_5_5_5_1;if(i===Tr)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===br)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===Ar)return e.BYTE;if(i===Rr)return e.SHORT;if(i===xn)return e.UNSIGNED_SHORT;if(i===ga)return e.INT;if(i===tn)return e.UNSIGNED_INT;if(i===Ft)return e.FLOAT;if(i===nn)return e.HALF_FLOAT;if(i===Cr)return e.ALPHA;if(i===Pr)return e.RGB;if(i===At)return e.RGBA;if(i===Yn)return e.DEPTH_COMPONENT;if(i===pn)return e.DEPTH_STENCIL;if(i===Lr)return e.RED;if(i===ha)return e.RED_INTEGER;if(i===la)return e.RG;if(i===pa)return e.RG_INTEGER;if(i===ua)return e.RGBA_INTEGER;if(i===bn||i===An||i===Rn||i===Cn)if(h===Xe)if(o=n.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(i===bn)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===An)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Rn)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Cn)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=n.get("WEBGL_compressed_texture_s3tc"),o!==null){if(i===bn)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===An)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Rn)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Cn)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===ni||i===ii||i===ai||i===ri)if(o=n.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(i===ni)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===ii)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===ai)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===ri)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===oi||i===si||i===ci)if(o=n.get("WEBGL_compressed_texture_etc"),o!==null){if(i===oi||i===si)return h===Xe?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(i===ci)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===li||i===fi||i===di||i===ui||i===pi||i===hi||i===xi||i===mi||i===_i||i===vi||i===gi||i===Si||i===Ei||i===Mi)if(o=n.get("WEBGL_compressed_texture_astc"),o!==null){if(i===li)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===fi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===di)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===ui)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===pi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===hi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===xi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===mi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===_i)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===vi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===gi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Si)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Ei)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Mi)return h===Xe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Ti||i===bi||i===Ai)if(o=n.get("EXT_texture_compression_bptc"),o!==null){if(i===Ti)return h===Xe?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===bi)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Ai)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Ri||i===Ci||i===Pi||i===Li)if(o=n.get("EXT_texture_compression_rgtc"),o!==null){if(i===Ri)return o.COMPRESSED_RED_RGTC1_EXT;if(i===Ci)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Pi)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Li)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===en?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const Ff=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Of=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Bf{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t){if(this.texture===null){const i=new _a(n.texture);(n.depthNear!==t.depthNear||n.depthFar!==t.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=i}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new Ut({vertexShader:Ff,fragmentShader:Of,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Bt(new va(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Gf extends ka{constructor(n,t){super();const i=this;let c=null,o=1,h=null,d="local-floor",R=1,E=null,U=null,g=null,S=null,b=null,B=null;const D=typeof XRWebGLBinding<"u",l=new Bf,r={},P=t.getContextAttributes();let v=null,L=null;const N=[],_=[],y=new ht;let Q=null;const p=new ln;p.viewport=new ut;const f=new ln;f.viewport=new ut;const A=[p,f],O=new za;let z=null,W=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let q=N[V];return q===void 0&&(q=new Mn,N[V]=q),q.getTargetRaySpace()},this.getControllerGrip=function(V){let q=N[V];return q===void 0&&(q=new Mn,N[V]=q),q.getGripSpace()},this.getHand=function(V){let q=N[V];return q===void 0&&(q=new Mn,N[V]=q),q.getHandSpace()};function $(V){const q=_.indexOf(V.inputSource);if(q===-1)return;const le=N[q];le!==void 0&&(le.update(V.inputSource,V.frame,E||h),le.dispatchEvent({type:V.type,data:V.inputSource}))}function X(){c.removeEventListener("select",$),c.removeEventListener("selectstart",$),c.removeEventListener("selectend",$),c.removeEventListener("squeeze",$),c.removeEventListener("squeezestart",$),c.removeEventListener("squeezeend",$),c.removeEventListener("end",X),c.removeEventListener("inputsourceschange",re);for(let V=0;V<N.length;V++){const q=_[V];q!==null&&(_[V]=null,N[V].disconnect(q))}z=null,W=null,l.reset();for(const V in r)delete r[V];n.setRenderTarget(v),b=null,S=null,g=null,c=null,L=null,Qe.stop(),i.isPresenting=!1,n.setPixelRatio(Q),n.setSize(y.width,y.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){o=V,i.isPresenting===!0&&Ye("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){d=V,i.isPresenting===!0&&Ye("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return E||h},this.setReferenceSpace=function(V){E=V},this.getBaseLayer=function(){return S!==null?S:b},this.getBinding=function(){return g===null&&D&&(g=new XRWebGLBinding(c,t)),g},this.getFrame=function(){return B},this.getSession=function(){return c},this.setSession=async function(V){if(c=V,c!==null){if(v=n.getRenderTarget(),c.addEventListener("select",$),c.addEventListener("selectstart",$),c.addEventListener("selectend",$),c.addEventListener("squeeze",$),c.addEventListener("squeezestart",$),c.addEventListener("squeezeend",$),c.addEventListener("end",X),c.addEventListener("inputsourceschange",re),P.xrCompatible!==!0&&await t.makeXRCompatible(),Q=n.getPixelRatio(),n.getSize(y),D&&"createProjectionLayer"in XRWebGLBinding.prototype){let le=null,Le=null,_e=null;P.depth&&(_e=P.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,le=P.stencil?pn:Yn,Le=P.stencil?en:tn);const Ie={colorFormat:t.RGBA8,depthFormat:_e,scaleFactor:o};g=this.getBinding(),S=g.createProjectionLayer(Ie),c.updateRenderState({layers:[S]}),n.setPixelRatio(1),n.setSize(S.textureWidth,S.textureHeight,!1),L=new kt(S.textureWidth,S.textureHeight,{format:At,type:Ot,depthTexture:new ca(S.textureWidth,S.textureHeight,Le,void 0,void 0,void 0,void 0,void 0,void 0,le),stencilBuffer:P.stencil,colorSpace:n.outputColorSpace,samples:P.antialias?4:0,resolveDepthBuffer:S.ignoreDepthValues===!1,resolveStencilBuffer:S.ignoreDepthValues===!1})}else{const le={antialias:P.antialias,alpha:!0,depth:P.depth,stencil:P.stencil,framebufferScaleFactor:o};b=new XRWebGLLayer(c,t,le),c.updateRenderState({baseLayer:b}),n.setPixelRatio(1),n.setSize(b.framebufferWidth,b.framebufferHeight,!1),L=new kt(b.framebufferWidth,b.framebufferHeight,{format:At,type:Ot,colorSpace:n.outputColorSpace,stencilBuffer:P.stencil,resolveDepthBuffer:b.ignoreDepthValues===!1,resolveStencilBuffer:b.ignoreDepthValues===!1})}L.isXRRenderTarget=!0,this.setFoveation(R),E=null,h=await c.requestReferenceSpace(d),Qe.setContext(c),Qe.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(c!==null)return c.environmentBlendMode},this.getDepthTexture=function(){return l.getDepthTexture()};function re(V){for(let q=0;q<V.removed.length;q++){const le=V.removed[q],Le=_.indexOf(le);Le>=0&&(_[Le]=null,N[Le].disconnect(le))}for(let q=0;q<V.added.length;q++){const le=V.added[q];let Le=_.indexOf(le);if(Le===-1){for(let Ie=0;Ie<N.length;Ie++)if(Ie>=_.length){_.push(le),Le=Ie;break}else if(_[Ie]===null){_[Ie]=le,Le=Ie;break}if(Le===-1)break}const _e=N[Le];_e&&_e.connect(le)}}const H=new st,fe=new st;function pe(V,q,le){H.setFromMatrixPosition(q.matrixWorld),fe.setFromMatrixPosition(le.matrixWorld);const Le=H.distanceTo(fe),_e=q.projectionMatrix.elements,Ie=le.projectionMatrix.elements,ot=_e[14]/(_e[10]-1),we=_e[14]/(_e[10]+1),Ke=(_e[9]+1)/_e[5],x=(_e[9]-1)/_e[5],Ne=(_e[8]-1)/_e[0],ye=(Ie[8]+1)/Ie[0],ze=ot*Ne,he=ot*ye,Je=Le/(-Ne+ye),ge=Je*-Ne;if(q.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(ge),V.translateZ(Je),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert(),_e[10]===-1)V.projectionMatrix.copy(q.projectionMatrix),V.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const Pe=ot+Je,u=we+Je,a=ze-ge,C=he+(Le-ge),G=Ke*we/u*Pe,Y=x*we/u*Pe;V.projectionMatrix.makePerspective(a,C,G,Y,Pe,u),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}}function De(V,q){q===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(q.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(c===null)return;let q=V.near,le=V.far;l.texture!==null&&(l.depthNear>0&&(q=l.depthNear),l.depthFar>0&&(le=l.depthFar)),O.near=f.near=p.near=q,O.far=f.far=p.far=le,(z!==O.near||W!==O.far)&&(c.updateRenderState({depthNear:O.near,depthFar:O.far}),z=O.near,W=O.far),O.layers.mask=V.layers.mask|6,p.layers.mask=O.layers.mask&3,f.layers.mask=O.layers.mask&5;const Le=V.parent,_e=O.cameras;De(O,Le);for(let Ie=0;Ie<_e.length;Ie++)De(_e[Ie],Le);_e.length===2?pe(O,p,f):O.projectionMatrix.copy(p.projectionMatrix),Ve(V,O,Le)};function Ve(V,q,le){le===null?V.matrix.copy(q.matrixWorld):(V.matrix.copy(le.matrixWorld),V.matrix.invert(),V.matrix.multiply(q.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(q.projectionMatrix),V.projectionMatrixInverse.copy(q.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=Wa*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(S===null&&b===null))return R},this.setFoveation=function(V){R=V,S!==null&&(S.fixedFoveation=V),b!==null&&b.fixedFoveation!==void 0&&(b.fixedFoveation=V)},this.hasDepthSensing=function(){return l.texture!==null},this.getDepthSensingMesh=function(){return l.getMesh(O)},this.getCameraTexture=function(V){return r[V]};let Ze=null;function qe(V,q){if(U=q.getViewerPose(E||h),B=q,U!==null){const le=U.views;b!==null&&(n.setRenderTargetFramebuffer(L,b.framebuffer),n.setRenderTarget(L));let Le=!1;le.length!==O.cameras.length&&(O.cameras.length=0,Le=!0);for(let we=0;we<le.length;we++){const Ke=le[we];let x=null;if(b!==null)x=b.getViewport(Ke);else{const ye=g.getViewSubImage(S,Ke);x=ye.viewport,we===0&&(n.setRenderTargetTextures(L,ye.colorTexture,ye.depthStencilTexture),n.setRenderTarget(L))}let Ne=A[we];Ne===void 0&&(Ne=new ln,Ne.layers.enable(we),Ne.viewport=new ut,A[we]=Ne),Ne.matrix.fromArray(Ke.transform.matrix),Ne.matrix.decompose(Ne.position,Ne.quaternion,Ne.scale),Ne.projectionMatrix.fromArray(Ke.projectionMatrix),Ne.projectionMatrixInverse.copy(Ne.projectionMatrix).invert(),Ne.viewport.set(x.x,x.y,x.width,x.height),we===0&&(O.matrix.copy(Ne.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),Le===!0&&O.cameras.push(Ne)}const _e=c.enabledFeatures;if(_e&&_e.includes("depth-sensing")&&c.depthUsage=="gpu-optimized"&&D){g=i.getBinding();const we=g.getDepthInformation(le[0]);we&&we.isValid&&we.texture&&l.init(we,c.renderState)}if(_e&&_e.includes("camera-access")&&D){n.state.unbindTexture(),g=i.getBinding();for(let we=0;we<le.length;we++){const Ke=le[we].camera;if(Ke){let x=r[Ke];x||(x=new _a,r[Ke]=x);const Ne=g.getCameraImage(Ke);x.sourceTexture=Ne}}}}for(let le=0;le<N.length;le++){const Le=_[le],_e=N[le];Le!==null&&_e!==void 0&&_e.update(Le,q,E||h)}Ze&&Ze(V,q),q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:q}),B=null}const Qe=new ba;Qe.setAnimationLoop(qe),this.setAnimationLoop=function(V){Ze=V},this.dispose=function(){}}}const Nt=new Ma,Hf=new Qt;function Vf(e,n){function t(l,r){l.matrixAutoUpdate===!0&&l.updateMatrix(),r.value.copy(l.matrix)}function i(l,r){r.color.getRGB(l.fogColor.value,Ea(e)),r.isFog?(l.fogNear.value=r.near,l.fogFar.value=r.far):r.isFogExp2&&(l.fogDensity.value=r.density)}function c(l,r,P,v,L){r.isMeshBasicMaterial||r.isMeshLambertMaterial?o(l,r):r.isMeshToonMaterial?(o(l,r),g(l,r)):r.isMeshPhongMaterial?(o(l,r),U(l,r)):r.isMeshStandardMaterial?(o(l,r),S(l,r),r.isMeshPhysicalMaterial&&b(l,r,L)):r.isMeshMatcapMaterial?(o(l,r),B(l,r)):r.isMeshDepthMaterial?o(l,r):r.isMeshDistanceMaterial?(o(l,r),D(l,r)):r.isMeshNormalMaterial?o(l,r):r.isLineBasicMaterial?(h(l,r),r.isLineDashedMaterial&&d(l,r)):r.isPointsMaterial?R(l,r,P,v):r.isSpriteMaterial?E(l,r):r.isShadowMaterial?(l.color.value.copy(r.color),l.opacity.value=r.opacity):r.isShaderMaterial&&(r.uniformsNeedUpdate=!1)}function o(l,r){l.opacity.value=r.opacity,r.color&&l.diffuse.value.copy(r.color),r.emissive&&l.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(l.map.value=r.map,t(r.map,l.mapTransform)),r.alphaMap&&(l.alphaMap.value=r.alphaMap,t(r.alphaMap,l.alphaMapTransform)),r.bumpMap&&(l.bumpMap.value=r.bumpMap,t(r.bumpMap,l.bumpMapTransform),l.bumpScale.value=r.bumpScale,r.side===vt&&(l.bumpScale.value*=-1)),r.normalMap&&(l.normalMap.value=r.normalMap,t(r.normalMap,l.normalMapTransform),l.normalScale.value.copy(r.normalScale),r.side===vt&&l.normalScale.value.negate()),r.displacementMap&&(l.displacementMap.value=r.displacementMap,t(r.displacementMap,l.displacementMapTransform),l.displacementScale.value=r.displacementScale,l.displacementBias.value=r.displacementBias),r.emissiveMap&&(l.emissiveMap.value=r.emissiveMap,t(r.emissiveMap,l.emissiveMapTransform)),r.specularMap&&(l.specularMap.value=r.specularMap,t(r.specularMap,l.specularMapTransform)),r.alphaTest>0&&(l.alphaTest.value=r.alphaTest);const P=n.get(r),v=P.envMap,L=P.envMapRotation;v&&(l.envMap.value=v,Nt.copy(L),Nt.x*=-1,Nt.y*=-1,Nt.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Nt.y*=-1,Nt.z*=-1),l.envMapRotation.value.setFromMatrix4(Hf.makeRotationFromEuler(Nt)),l.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,l.reflectivity.value=r.reflectivity,l.ior.value=r.ior,l.refractionRatio.value=r.refractionRatio),r.lightMap&&(l.lightMap.value=r.lightMap,l.lightMapIntensity.value=r.lightMapIntensity,t(r.lightMap,l.lightMapTransform)),r.aoMap&&(l.aoMap.value=r.aoMap,l.aoMapIntensity.value=r.aoMapIntensity,t(r.aoMap,l.aoMapTransform))}function h(l,r){l.diffuse.value.copy(r.color),l.opacity.value=r.opacity,r.map&&(l.map.value=r.map,t(r.map,l.mapTransform))}function d(l,r){l.dashSize.value=r.dashSize,l.totalSize.value=r.dashSize+r.gapSize,l.scale.value=r.scale}function R(l,r,P,v){l.diffuse.value.copy(r.color),l.opacity.value=r.opacity,l.size.value=r.size*P,l.scale.value=v*.5,r.map&&(l.map.value=r.map,t(r.map,l.uvTransform)),r.alphaMap&&(l.alphaMap.value=r.alphaMap,t(r.alphaMap,l.alphaMapTransform)),r.alphaTest>0&&(l.alphaTest.value=r.alphaTest)}function E(l,r){l.diffuse.value.copy(r.color),l.opacity.value=r.opacity,l.rotation.value=r.rotation,r.map&&(l.map.value=r.map,t(r.map,l.mapTransform)),r.alphaMap&&(l.alphaMap.value=r.alphaMap,t(r.alphaMap,l.alphaMapTransform)),r.alphaTest>0&&(l.alphaTest.value=r.alphaTest)}function U(l,r){l.specular.value.copy(r.specular),l.shininess.value=Math.max(r.shininess,1e-4)}function g(l,r){r.gradientMap&&(l.gradientMap.value=r.gradientMap)}function S(l,r){l.metalness.value=r.metalness,r.metalnessMap&&(l.metalnessMap.value=r.metalnessMap,t(r.metalnessMap,l.metalnessMapTransform)),l.roughness.value=r.roughness,r.roughnessMap&&(l.roughnessMap.value=r.roughnessMap,t(r.roughnessMap,l.roughnessMapTransform)),r.envMap&&(l.envMapIntensity.value=r.envMapIntensity)}function b(l,r,P){l.ior.value=r.ior,r.sheen>0&&(l.sheenColor.value.copy(r.sheenColor).multiplyScalar(r.sheen),l.sheenRoughness.value=r.sheenRoughness,r.sheenColorMap&&(l.sheenColorMap.value=r.sheenColorMap,t(r.sheenColorMap,l.sheenColorMapTransform)),r.sheenRoughnessMap&&(l.sheenRoughnessMap.value=r.sheenRoughnessMap,t(r.sheenRoughnessMap,l.sheenRoughnessMapTransform))),r.clearcoat>0&&(l.clearcoat.value=r.clearcoat,l.clearcoatRoughness.value=r.clearcoatRoughness,r.clearcoatMap&&(l.clearcoatMap.value=r.clearcoatMap,t(r.clearcoatMap,l.clearcoatMapTransform)),r.clearcoatRoughnessMap&&(l.clearcoatRoughnessMap.value=r.clearcoatRoughnessMap,t(r.clearcoatRoughnessMap,l.clearcoatRoughnessMapTransform)),r.clearcoatNormalMap&&(l.clearcoatNormalMap.value=r.clearcoatNormalMap,t(r.clearcoatNormalMap,l.clearcoatNormalMapTransform),l.clearcoatNormalScale.value.copy(r.clearcoatNormalScale),r.side===vt&&l.clearcoatNormalScale.value.negate())),r.dispersion>0&&(l.dispersion.value=r.dispersion),r.iridescence>0&&(l.iridescence.value=r.iridescence,l.iridescenceIOR.value=r.iridescenceIOR,l.iridescenceThicknessMinimum.value=r.iridescenceThicknessRange[0],l.iridescenceThicknessMaximum.value=r.iridescenceThicknessRange[1],r.iridescenceMap&&(l.iridescenceMap.value=r.iridescenceMap,t(r.iridescenceMap,l.iridescenceMapTransform)),r.iridescenceThicknessMap&&(l.iridescenceThicknessMap.value=r.iridescenceThicknessMap,t(r.iridescenceThicknessMap,l.iridescenceThicknessMapTransform))),r.transmission>0&&(l.transmission.value=r.transmission,l.transmissionSamplerMap.value=P.texture,l.transmissionSamplerSize.value.set(P.width,P.height),r.transmissionMap&&(l.transmissionMap.value=r.transmissionMap,t(r.transmissionMap,l.transmissionMapTransform)),l.thickness.value=r.thickness,r.thicknessMap&&(l.thicknessMap.value=r.thicknessMap,t(r.thicknessMap,l.thicknessMapTransform)),l.attenuationDistance.value=r.attenuationDistance,l.attenuationColor.value.copy(r.attenuationColor)),r.anisotropy>0&&(l.anisotropyVector.value.set(r.anisotropy*Math.cos(r.anisotropyRotation),r.anisotropy*Math.sin(r.anisotropyRotation)),r.anisotropyMap&&(l.anisotropyMap.value=r.anisotropyMap,t(r.anisotropyMap,l.anisotropyMapTransform))),l.specularIntensity.value=r.specularIntensity,l.specularColor.value.copy(r.specularColor),r.specularColorMap&&(l.specularColorMap.value=r.specularColorMap,t(r.specularColorMap,l.specularColorMapTransform)),r.specularIntensityMap&&(l.specularIntensityMap.value=r.specularIntensityMap,t(r.specularIntensityMap,l.specularIntensityMapTransform))}function B(l,r){r.matcap&&(l.matcap.value=r.matcap)}function D(l,r){const P=n.get(r).light;l.referencePosition.value.setFromMatrixPosition(P.matrixWorld),l.nearDistance.value=P.shadow.camera.near,l.farDistance.value=P.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:c}}function kf(e,n,t,i){let c={},o={},h=[];const d=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function R(P,v){const L=v.program;i.uniformBlockBinding(P,L)}function E(P,v){let L=c[P.id];L===void 0&&(B(P),L=U(P),c[P.id]=L,P.addEventListener("dispose",l));const N=v.program;i.updateUBOMapping(P,N);const _=n.render.frame;o[P.id]!==_&&(S(P),o[P.id]=_)}function U(P){const v=g();P.__bindingPointIndex=v;const L=e.createBuffer(),N=P.__size,_=P.usage;return e.bindBuffer(e.UNIFORM_BUFFER,L),e.bufferData(e.UNIFORM_BUFFER,N,_),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,v,L),L}function g(){for(let P=0;P<d;P++)if(h.indexOf(P)===-1)return h.push(P),P;return pt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function S(P){const v=c[P.id],L=P.uniforms,N=P.__cache;e.bindBuffer(e.UNIFORM_BUFFER,v);for(let _=0,y=L.length;_<y;_++){const Q=Array.isArray(L[_])?L[_]:[L[_]];for(let p=0,f=Q.length;p<f;p++){const A=Q[p];if(b(A,_,p,N)===!0){const O=A.__offset,z=Array.isArray(A.value)?A.value:[A.value];let W=0;for(let $=0;$<z.length;$++){const X=z[$],re=D(X);typeof X=="number"||typeof X=="boolean"?(A.__data[0]=X,e.bufferSubData(e.UNIFORM_BUFFER,O+W,A.__data)):X.isMatrix3?(A.__data[0]=X.elements[0],A.__data[1]=X.elements[1],A.__data[2]=X.elements[2],A.__data[3]=0,A.__data[4]=X.elements[3],A.__data[5]=X.elements[4],A.__data[6]=X.elements[5],A.__data[7]=0,A.__data[8]=X.elements[6],A.__data[9]=X.elements[7],A.__data[10]=X.elements[8],A.__data[11]=0):(X.toArray(A.__data,W),W+=re.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,O,A.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function b(P,v,L,N){const _=P.value,y=v+"_"+L;if(N[y]===void 0)return typeof _=="number"||typeof _=="boolean"?N[y]=_:N[y]=_.clone(),!0;{const Q=N[y];if(typeof _=="number"||typeof _=="boolean"){if(Q!==_)return N[y]=_,!0}else if(Q.equals(_)===!1)return Q.copy(_),!0}return!1}function B(P){const v=P.uniforms;let L=0;const N=16;for(let y=0,Q=v.length;y<Q;y++){const p=Array.isArray(v[y])?v[y]:[v[y]];for(let f=0,A=p.length;f<A;f++){const O=p[f],z=Array.isArray(O.value)?O.value:[O.value];for(let W=0,$=z.length;W<$;W++){const X=z[W],re=D(X),H=L%N,fe=H%re.boundary,pe=H+fe;L+=fe,pe!==0&&N-pe<re.storage&&(L+=N-pe),O.__data=new Float32Array(re.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=L,L+=re.storage}}}const _=L%N;return _>0&&(L+=N-_),P.__size=L,P.__cache={},this}function D(P){const v={boundary:0,storage:0};return typeof P=="number"||typeof P=="boolean"?(v.boundary=4,v.storage=4):P.isVector2?(v.boundary=8,v.storage=8):P.isVector3||P.isColor?(v.boundary=16,v.storage=12):P.isVector4?(v.boundary=16,v.storage=16):P.isMatrix3?(v.boundary=48,v.storage=48):P.isMatrix4?(v.boundary=64,v.storage=64):P.isTexture?Ye("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Ye("WebGLRenderer: Unsupported uniform value type.",P),v}function l(P){const v=P.target;v.removeEventListener("dispose",l);const L=h.indexOf(v.__bindingPointIndex);h.splice(L,1),e.deleteBuffer(c[v.id]),delete c[v.id],delete o[v.id]}function r(){for(const P in c)e.deleteBuffer(c[P]);h=[],c={},o={}}return{bind:R,update:E,dispose:r}}const zf=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let Mt=null;function Wf(){return Mt===null&&(Mt=new Xa(zf,32,32,la,nn),Mt.minFilter=Rt,Mt.magFilter=Rt,Mt.wrapS=Nn,Mt.wrapT=Nn,Mt.generateMipmaps=!1,Mt.needsUpdate=!0),Mt}class Yf{constructor(n={}){const{canvas:t=Fa(),context:i=null,depth:c=!0,stencil:o=!1,alpha:h=!1,antialias:d=!1,premultipliedAlpha:R=!0,preserveDrawingBuffer:E=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:g=!1,reversedDepthBuffer:S=!1}=n;this.isWebGLRenderer=!0;let b;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");b=i.getContextAttributes().alpha}else b=h;const B=new Set([ua,pa,ha]),D=new Set([Ot,tn,xn,en,xa,ma]),l=new Uint32Array(4),r=new Int32Array(4);let P=null,v=null;const L=[],N=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Pt,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const _=this;let y=!1;this._outputColorSpace=Oa;let Q=0,p=0,f=null,A=-1,O=null;const z=new ut,W=new ut;let $=null;const X=new $e(0);let re=0,H=t.width,fe=t.height,pe=1,De=null,Ve=null;const Ze=new ut(0,0,H,fe),qe=new ut(0,0,H,fe);let Qe=!1;const V=new oa;let q=!1,le=!1;const Le=new Qt,_e=new st,Ie=new ut,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let we=!1;function Ke(){return f===null?pe:1}let x=i;function Ne(s,M){return t.getContext(s,M)}try{const s={alpha:!0,depth:c,stencil:o,antialias:d,premultipliedAlpha:R,preserveDrawingBuffer:E,powerPreference:U,failIfMajorPerformanceCaveat:g};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ba}`),t.addEventListener("webglcontextlost",Z,!1),t.addEventListener("webglcontextrestored",k,!1),t.addEventListener("webglcontextcreationerror",de,!1),x===null){const M="webgl2";if(x=Ne(M,s),x===null)throw Ne(M)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(s){throw s("WebGLRenderer: "+s.message),s}let ye,ze,he,Je,ge,Pe,u,a,C,G,Y,F,me,ie,Se,xe,K,j,be,Me,se,Re,m,ae;function ee(){ye=new Jc(x),ye.init(),Re=new yf(x,ye),ze=new zc(x,ye,n,Re),he=new If(x,ye),ze.reversedDepthBuffer&&S&&he.buffers.depth.setReversed(!0),Je=new tl(x),ge=new Sf,Pe=new Nf(x,ye,he,ge,ze,Re,Je),u=new Xc(_),a=new Qc(_),C=new ao(x),m=new Vc(x,C),G=new jc(x,C,Je,m),Y=new il(x,G,C,Je),be=new nl(x,ze,Pe),xe=new Wc(ge),F=new gf(_,u,a,ye,ze,m,xe),me=new Vf(_,ge),ie=new Mf,Se=new Pf(ye),j=new Hc(_,u,a,he,Y,b,R),K=new Df(_,Y,ze),ae=new kf(x,Je,ze,he),Me=new kc(x,ye,Je),se=new el(x,ye,Je),Je.programs=F.programs,_.capabilities=ze,_.extensions=ye,_.properties=ge,_.renderLists=ie,_.shadowMap=K,_.state=he,_.info=Je}ee();const te=new Gf(_,x);this.xr=te,this.getContext=function(){return x},this.getContextAttributes=function(){return x.getContextAttributes()},this.forceContextLoss=function(){const s=ye.get("WEBGL_lose_context");s&&s.loseContext()},this.forceContextRestore=function(){const s=ye.get("WEBGL_lose_context");s&&s.restoreContext()},this.getPixelRatio=function(){return pe},this.setPixelRatio=function(s){s!==void 0&&(pe=s,this.setSize(H,fe,!1))},this.getSize=function(s){return s.set(H,fe)},this.setSize=function(s,M,w=!0){if(te.isPresenting){Ye("WebGLRenderer: Can't change size while VR device is presenting.");return}H=s,fe=M,t.width=Math.floor(s*pe),t.height=Math.floor(M*pe),w===!0&&(t.style.width=s+"px",t.style.height=M+"px"),this.setViewport(0,0,s,M)},this.getDrawingBufferSize=function(s){return s.set(H*pe,fe*pe).floor()},this.setDrawingBufferSize=function(s,M,w){H=s,fe=M,pe=w,t.width=Math.floor(s*w),t.height=Math.floor(M*w),this.setViewport(0,0,s,M)},this.getCurrentViewport=function(s){return s.copy(z)},this.getViewport=function(s){return s.copy(Ze)},this.setViewport=function(s,M,w,I){s.isVector4?Ze.set(s.x,s.y,s.z,s.w):Ze.set(s,M,w,I),he.viewport(z.copy(Ze).multiplyScalar(pe).round())},this.getScissor=function(s){return s.copy(qe)},this.setScissor=function(s,M,w,I){s.isVector4?qe.set(s.x,s.y,s.z,s.w):qe.set(s,M,w,I),he.scissor(W.copy(qe).multiplyScalar(pe).round())},this.getScissorTest=function(){return Qe},this.setScissorTest=function(s){he.setScissorTest(Qe=s)},this.setOpaqueSort=function(s){De=s},this.setTransparentSort=function(s){Ve=s},this.getClearColor=function(s){return s.copy(j.getClearColor())},this.setClearColor=function(){j.setClearColor(...arguments)},this.getClearAlpha=function(){return j.getClearAlpha()},this.setClearAlpha=function(){j.setClearAlpha(...arguments)},this.clear=function(s=!0,M=!0,w=!0){let I=0;if(s){let T=!1;if(f!==null){const J=f.texture.format;T=B.has(J)}if(T){const J=f.texture.type,oe=D.has(J),ue=j.getClearColor(),ce=j.getClearAlpha(),Te=ue.r,Ae=ue.g,ve=ue.b;oe?(l[0]=Te,l[1]=Ae,l[2]=ve,l[3]=ce,x.clearBufferuiv(x.COLOR,0,l)):(r[0]=Te,r[1]=Ae,r[2]=ve,r[3]=ce,x.clearBufferiv(x.COLOR,0,r))}else I|=x.COLOR_BUFFER_BIT}M&&(I|=x.DEPTH_BUFFER_BIT),w&&(I|=x.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),x.clear(I)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",Z,!1),t.removeEventListener("webglcontextrestored",k,!1),t.removeEventListener("webglcontextcreationerror",de,!1),j.dispose(),ie.dispose(),Se.dispose(),ge.dispose(),u.dispose(),a.dispose(),Y.dispose(),m.dispose(),ae.dispose(),F.dispose(),te.dispose(),te.removeEventListener("sessionstart",qn),te.removeEventListener("sessionend",Kn),Dt.stop()};function Z(s){s.preventDefault(),ei("WebGLRenderer: Context Lost."),y=!0}function k(){ei("WebGLRenderer: Context Restored."),y=!1;const s=Je.autoReset,M=K.enabled,w=K.autoUpdate,I=K.needsUpdate,T=K.type;ee(),Je.autoReset=s,K.enabled=M,K.autoUpdate=w,K.needsUpdate=I,K.type=T}function de(s){pt("WebGLRenderer: A WebGL context could not be created. Reason: ",s.statusMessage)}function Ce(s){const M=s.target;M.removeEventListener("dispose",Ce),We(M)}function We(s){Ge(s),ge.remove(s)}function Ge(s){const M=ge.get(s).programs;M!==void 0&&(M.forEach(function(w){F.releaseProgram(w)}),s.isShaderMaterial&&F.releaseShaderCache(s))}this.renderBufferDirect=function(s,M,w,I,T,J){M===null&&(M=ot);const oe=T.isMesh&&T.matrixWorld.determinant()<0,ue=Ua(s,M,w,I,T);he.setMaterial(I,oe);let ce=w.index,Te=1;if(I.wireframe===!0){if(ce=G.getWireframeAttribute(w),ce===void 0)return;Te=2}const Ae=w.drawRange,ve=w.attributes.position;let Fe=Ae.start*Te,He=(Ae.start+Ae.count)*Te;J!==null&&(Fe=Math.max(Fe,J.start*Te),He=Math.min(He,(J.start+J.count)*Te)),ce!==null?(Fe=Math.max(Fe,0),He=Math.min(He,ce.count)):ve!=null&&(Fe=Math.max(Fe,0),He=Math.min(He,ve.count));const tt=He-Fe;if(tt<0||tt===1/0)return;m.setup(T,I,ue,w,ce);let nt,ke=Me;if(ce!==null&&(nt=C.get(ce),ke=se,ke.setIndex(nt)),T.isMesh)I.wireframe===!0?(he.setLineWidth(I.wireframeLinewidth*Ke()),ke.setMode(x.LINES)):ke.setMode(x.TRIANGLES);else if(T.isLine){let Ee=I.linewidth;Ee===void 0&&(Ee=1),he.setLineWidth(Ee*Ke()),T.isLineSegments?ke.setMode(x.LINES):T.isLineLoop?ke.setMode(x.LINE_LOOP):ke.setMode(x.LINE_STRIP)}else T.isPoints?ke.setMode(x.POINTS):T.isSprite&&ke.setMode(x.TRIANGLES);if(T.isBatchedMesh)if(T._multiDrawInstances!==null)In("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ke.renderMultiDrawInstances(T._multiDrawStarts,T._multiDrawCounts,T._multiDrawCount,T._multiDrawInstances);else if(ye.get("WEBGL_multi_draw"))ke.renderMultiDraw(T._multiDrawStarts,T._multiDrawCounts,T._multiDrawCount);else{const Ee=T._multiDrawStarts,je=T._multiDrawCounts,Oe=T._multiDrawCount,xt=ce?C.get(ce).bytesPerElement:1,Gt=ge.get(I).currentProgram.getUniforms();for(let mt=0;mt<Oe;mt++)Gt.setValue(x,"_gl_DrawID",mt),ke.render(Ee[mt]/xt,je[mt])}else if(T.isInstancedMesh)ke.renderInstances(Fe,tt,T.count);else if(w.isInstancedBufferGeometry){const Ee=w._maxInstanceCount!==void 0?w._maxInstanceCount:1/0,je=Math.min(w.instanceCount,Ee);ke.renderInstances(Fe,tt,je)}else ke.render(Fe,tt)};function St(s,M,w){s.transparent===!0&&s.side===bt&&s.forceSinglePass===!1?(s.side=vt,s.needsUpdate=!0,rn(s,M,w),s.side=Jt,s.needsUpdate=!0,rn(s,M,w),s.side=bt):rn(s,M,w)}this.compile=function(s,M,w=null){w===null&&(w=s),v=Se.get(w),v.init(M),N.push(v),w.traverseVisible(function(T){T.isLight&&T.layers.test(M.layers)&&(v.pushLight(T),T.castShadow&&v.pushShadow(T))}),s!==w&&s.traverseVisible(function(T){T.isLight&&T.layers.test(M.layers)&&(v.pushLight(T),T.castShadow&&v.pushShadow(T))}),v.setupLights();const I=new Set;return s.traverse(function(T){if(!(T.isMesh||T.isPoints||T.isLine||T.isSprite))return;const J=T.material;if(J)if(Array.isArray(J))for(let oe=0;oe<J.length;oe++){const ue=J[oe];St(ue,w,T),I.add(ue)}else St(J,w,T),I.add(J)}),v=N.pop(),I},this.compileAsync=function(s,M,w=null){const I=this.compile(s,M,w);return new Promise(T=>{function J(){if(I.forEach(function(oe){ge.get(oe).currentProgram.isReady()&&I.delete(oe)}),I.size===0){T(s);return}setTimeout(J,10)}ye.get("KHR_parallel_shader_compile")!==null?J():setTimeout(J,10)})};let gt=null;function La(s){gt&&gt(s)}function qn(){Dt.stop()}function Kn(){Dt.start()}const Dt=new ba;Dt.setAnimationLoop(La),typeof self<"u"&&Dt.setContext(self),this.setAnimationLoop=function(s){gt=s,te.setAnimationLoop(s),s===null?Dt.stop():Dt.start()},te.addEventListener("sessionstart",qn),te.addEventListener("sessionend",Kn),this.render=function(s,M){if(M!==void 0&&M.isCamera!==!0){pt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;if(s.matrixWorldAutoUpdate===!0&&s.updateMatrixWorld(),M.parent===null&&M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),te.enabled===!0&&te.isPresenting===!0&&(te.cameraAutoUpdate===!0&&te.updateCamera(M),M=te.getCamera()),s.isScene===!0&&s.onBeforeRender(_,s,M,f),v=Se.get(s,N.length),v.init(M),N.push(v),Le.multiplyMatrices(M.projectionMatrix,M.matrixWorldInverse),V.setFromProjectionMatrix(Le,ti,M.reversedDepth),le=this.localClippingEnabled,q=xe.init(this.clippingPlanes,le),P=ie.get(s,L.length),P.init(),L.push(P),te.enabled===!0&&te.isPresenting===!0){const J=_.xr.getDepthSensingMesh();J!==null&&Sn(J,M,-1/0,_.sortObjects)}Sn(s,M,0,_.sortObjects),P.finish(),_.sortObjects===!0&&P.sort(De,Ve),we=te.enabled===!1||te.isPresenting===!1||te.hasDepthSensing()===!1,we&&j.addToRenderList(P,s),this.info.render.frame++,q===!0&&xe.beginShadows();const w=v.state.shadowsArray;K.render(w,s,M),q===!0&&xe.endShadows(),this.info.autoReset===!0&&this.info.reset();const I=P.opaque,T=P.transmissive;if(v.setupLights(),M.isArrayCamera){const J=M.cameras;if(T.length>0)for(let oe=0,ue=J.length;oe<ue;oe++){const ce=J[oe];Zn(I,T,s,ce)}we&&j.render(s);for(let oe=0,ue=J.length;oe<ue;oe++){const ce=J[oe];$n(P,s,ce,ce.viewport)}}else T.length>0&&Zn(I,T,s,M),we&&j.render(s),$n(P,s,M);f!==null&&p===0&&(Pe.updateMultisampleRenderTarget(f),Pe.updateRenderTargetMipmap(f)),s.isScene===!0&&s.onAfterRender(_,s,M),m.resetDefaultState(),A=-1,O=null,N.pop(),N.length>0?(v=N[N.length-1],q===!0&&xe.setGlobalState(_.clippingPlanes,v.state.camera)):v=null,L.pop(),L.length>0?P=L[L.length-1]:P=null};function Sn(s,M,w,I){if(s.visible===!1)return;if(s.layers.test(M.layers)){if(s.isGroup)w=s.renderOrder;else if(s.isLOD)s.autoUpdate===!0&&s.update(M);else if(s.isLight)v.pushLight(s),s.castShadow&&v.pushShadow(s);else if(s.isSprite){if(!s.frustumCulled||V.intersectsSprite(s)){I&&Ie.setFromMatrixPosition(s.matrixWorld).applyMatrix4(Le);const oe=Y.update(s),ue=s.material;ue.visible&&P.push(s,oe,ue,w,Ie.z,null)}}else if((s.isMesh||s.isLine||s.isPoints)&&(!s.frustumCulled||V.intersectsObject(s))){const oe=Y.update(s),ue=s.material;if(I&&(s.boundingSphere!==void 0?(s.boundingSphere===null&&s.computeBoundingSphere(),Ie.copy(s.boundingSphere.center)):(oe.boundingSphere===null&&oe.computeBoundingSphere(),Ie.copy(oe.boundingSphere.center)),Ie.applyMatrix4(s.matrixWorld).applyMatrix4(Le)),Array.isArray(ue)){const ce=oe.groups;for(let Te=0,Ae=ce.length;Te<Ae;Te++){const ve=ce[Te],Fe=ue[ve.materialIndex];Fe&&Fe.visible&&P.push(s,oe,Fe,w,Ie.z,ve)}}else ue.visible&&P.push(s,oe,ue,w,Ie.z,null)}}const J=s.children;for(let oe=0,ue=J.length;oe<ue;oe++)Sn(J[oe],M,w,I)}function $n(s,M,w,I){const{opaque:T,transmissive:J,transparent:oe}=s;v.setupLightsView(w),q===!0&&xe.setGlobalState(_.clippingPlanes,w),I&&he.viewport(z.copy(I)),T.length>0&&an(T,M,w),J.length>0&&an(J,M,w),oe.length>0&&an(oe,M,w),he.buffers.depth.setTest(!0),he.buffers.depth.setMask(!0),he.buffers.color.setMask(!0),he.setPolygonOffset(!1)}function Zn(s,M,w,I){if((w.isScene===!0?w.overrideMaterial:null)!==null)return;v.state.transmissionRenderTarget[I.id]===void 0&&(v.state.transmissionRenderTarget[I.id]=new kt(1,1,{generateMipmaps:!0,type:ye.has("EXT_color_buffer_half_float")||ye.has("EXT_color_buffer_float")?nn:Ot,minFilter:Kt,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:it.workingColorSpace}));const J=v.state.transmissionRenderTarget[I.id],oe=I.viewport||z;J.setSize(oe.z*_.transmissionResolutionScale,oe.w*_.transmissionResolutionScale);const ue=_.getRenderTarget(),ce=_.getActiveCubeFace(),Te=_.getActiveMipmapLevel();_.setRenderTarget(J),_.getClearColor(X),re=_.getClearAlpha(),re<1&&_.setClearColor(16777215,.5),_.clear(),we&&j.render(w);const Ae=_.toneMapping;_.toneMapping=Pt;const ve=I.viewport;if(I.viewport!==void 0&&(I.viewport=void 0),v.setupLightsView(I),q===!0&&xe.setGlobalState(_.clippingPlanes,I),an(s,w,I),Pe.updateMultisampleRenderTarget(J),Pe.updateRenderTargetMipmap(J),ye.has("WEBGL_multisampled_render_to_texture")===!1){let Fe=!1;for(let He=0,tt=M.length;He<tt;He++){const nt=M[He],{object:ke,geometry:Ee,material:je,group:Oe}=nt;if(je.side===bt&&ke.layers.test(I.layers)){const xt=je.side;je.side=vt,je.needsUpdate=!0,Qn(ke,w,I,Ee,je,Oe),je.side=xt,je.needsUpdate=!0,Fe=!0}}Fe===!0&&(Pe.updateMultisampleRenderTarget(J),Pe.updateRenderTargetMipmap(J))}_.setRenderTarget(ue,ce,Te),_.setClearColor(X,re),ve!==void 0&&(I.viewport=ve),_.toneMapping=Ae}function an(s,M,w){const I=M.isScene===!0?M.overrideMaterial:null;for(let T=0,J=s.length;T<J;T++){const oe=s[T],{object:ue,geometry:ce,group:Te}=oe;let Ae=oe.material;Ae.allowOverride===!0&&I!==null&&(Ae=I),ue.layers.test(w.layers)&&Qn(ue,M,w,ce,Ae,Te)}}function Qn(s,M,w,I,T,J){s.onBeforeRender(_,M,w,I,T,J),s.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,s.matrixWorld),s.normalMatrix.getNormalMatrix(s.modelViewMatrix),T.onBeforeRender(_,M,w,I,s,J),T.transparent===!0&&T.side===bt&&T.forceSinglePass===!1?(T.side=vt,T.needsUpdate=!0,_.renderBufferDirect(w,M,I,T,s,J),T.side=Jt,T.needsUpdate=!0,_.renderBufferDirect(w,M,I,T,s,J),T.side=bt):_.renderBufferDirect(w,M,I,T,s,J),s.onAfterRender(_,M,w,I,T,J)}function rn(s,M,w){M.isScene!==!0&&(M=ot);const I=ge.get(s),T=v.state.lights,J=v.state.shadowsArray,oe=T.state.version,ue=F.getParameters(s,T.state,J,M,w),ce=F.getProgramCacheKey(ue);let Te=I.programs;I.environment=s.isMeshStandardMaterial?M.environment:null,I.fog=M.fog,I.envMap=(s.isMeshStandardMaterial?a:u).get(s.envMap||I.environment),I.envMapRotation=I.environment!==null&&s.envMap===null?M.environmentRotation:s.envMapRotation,Te===void 0&&(s.addEventListener("dispose",Ce),Te=new Map,I.programs=Te);let Ae=Te.get(ce);if(Ae!==void 0){if(I.currentProgram===Ae&&I.lightsStateVersion===oe)return jn(s,ue),Ae}else ue.uniforms=F.getUniforms(s),s.onBeforeCompile(ue,_),Ae=F.acquireProgram(ue,ce),Te.set(ce,Ae),I.uniforms=ue.uniforms;const ve=I.uniforms;return(!s.isShaderMaterial&&!s.isRawShaderMaterial||s.clipping===!0)&&(ve.clippingPlanes=xe.uniform),jn(s,ue),I.needsLights=wa(s),I.lightsStateVersion=oe,I.needsLights&&(ve.ambientLightColor.value=T.state.ambient,ve.lightProbe.value=T.state.probe,ve.directionalLights.value=T.state.directional,ve.directionalLightShadows.value=T.state.directionalShadow,ve.spotLights.value=T.state.spot,ve.spotLightShadows.value=T.state.spotShadow,ve.rectAreaLights.value=T.state.rectArea,ve.ltc_1.value=T.state.rectAreaLTC1,ve.ltc_2.value=T.state.rectAreaLTC2,ve.pointLights.value=T.state.point,ve.pointLightShadows.value=T.state.pointShadow,ve.hemisphereLights.value=T.state.hemi,ve.directionalShadowMap.value=T.state.directionalShadowMap,ve.directionalShadowMatrix.value=T.state.directionalShadowMatrix,ve.spotShadowMap.value=T.state.spotShadowMap,ve.spotLightMatrix.value=T.state.spotLightMatrix,ve.spotLightMap.value=T.state.spotLightMap,ve.pointShadowMap.value=T.state.pointShadowMap,ve.pointShadowMatrix.value=T.state.pointShadowMatrix),I.currentProgram=Ae,I.uniformsList=null,Ae}function Jn(s){if(s.uniformsList===null){const M=s.currentProgram.getUniforms();s.uniformsList=un.seqWithValue(M.seq,s.uniforms)}return s.uniformsList}function jn(s,M){const w=ge.get(s);w.outputColorSpace=M.outputColorSpace,w.batching=M.batching,w.batchingColor=M.batchingColor,w.instancing=M.instancing,w.instancingColor=M.instancingColor,w.instancingMorph=M.instancingMorph,w.skinning=M.skinning,w.morphTargets=M.morphTargets,w.morphNormals=M.morphNormals,w.morphColors=M.morphColors,w.morphTargetsCount=M.morphTargetsCount,w.numClippingPlanes=M.numClippingPlanes,w.numIntersection=M.numClipIntersection,w.vertexAlphas=M.vertexAlphas,w.vertexTangents=M.vertexTangents,w.toneMapping=M.toneMapping}function Ua(s,M,w,I,T){M.isScene!==!0&&(M=ot),Pe.resetTextureUnits();const J=M.fog,oe=I.isMeshStandardMaterial?M.environment:null,ue=f===null?_.outputColorSpace:f.isXRRenderTarget===!0?f.texture.colorSpace:mn,ce=(I.isMeshStandardMaterial?a:u).get(I.envMap||oe),Te=I.vertexColors===!0&&!!w.attributes.color&&w.attributes.color.itemSize===4,Ae=!!w.attributes.tangent&&(!!I.normalMap||I.anisotropy>0),ve=!!w.morphAttributes.position,Fe=!!w.morphAttributes.normal,He=!!w.morphAttributes.color;let tt=Pt;I.toneMapped&&(f===null||f.isXRRenderTarget===!0)&&(tt=_.toneMapping);const nt=w.morphAttributes.position||w.morphAttributes.normal||w.morphAttributes.color,ke=nt!==void 0?nt.length:0,Ee=ge.get(I),je=v.state.lights;if(q===!0&&(le===!0||s!==O)){const ct=s===O&&I.id===A;xe.setState(I,s,ct)}let Oe=!1;I.version===Ee.__version?(Ee.needsLights&&Ee.lightsStateVersion!==je.state.version||Ee.outputColorSpace!==ue||T.isBatchedMesh&&Ee.batching===!1||!T.isBatchedMesh&&Ee.batching===!0||T.isBatchedMesh&&Ee.batchingColor===!0&&T.colorTexture===null||T.isBatchedMesh&&Ee.batchingColor===!1&&T.colorTexture!==null||T.isInstancedMesh&&Ee.instancing===!1||!T.isInstancedMesh&&Ee.instancing===!0||T.isSkinnedMesh&&Ee.skinning===!1||!T.isSkinnedMesh&&Ee.skinning===!0||T.isInstancedMesh&&Ee.instancingColor===!0&&T.instanceColor===null||T.isInstancedMesh&&Ee.instancingColor===!1&&T.instanceColor!==null||T.isInstancedMesh&&Ee.instancingMorph===!0&&T.morphTexture===null||T.isInstancedMesh&&Ee.instancingMorph===!1&&T.morphTexture!==null||Ee.envMap!==ce||I.fog===!0&&Ee.fog!==J||Ee.numClippingPlanes!==void 0&&(Ee.numClippingPlanes!==xe.numPlanes||Ee.numIntersection!==xe.numIntersection)||Ee.vertexAlphas!==Te||Ee.vertexTangents!==Ae||Ee.morphTargets!==ve||Ee.morphNormals!==Fe||Ee.morphColors!==He||Ee.toneMapping!==tt||Ee.morphTargetsCount!==ke)&&(Oe=!0):(Oe=!0,Ee.__version=I.version);let xt=Ee.currentProgram;Oe===!0&&(xt=rn(I,M,T));let Gt=!1,mt=!1,Xt=!1;const et=xt.getUniforms(),lt=Ee.uniforms;if(he.useProgram(xt.program)&&(Gt=!0,mt=!0,Xt=!0),I.id!==A&&(A=I.id,mt=!0),Gt||O!==s){he.buffers.depth.getReversed()&&s.reversedDepth!==!0&&(s._reversedDepth=!0,s.updateProjectionMatrix()),et.setValue(x,"projectionMatrix",s.projectionMatrix),et.setValue(x,"viewMatrix",s.matrixWorldInverse);const ft=et.map.cameraPosition;ft!==void 0&&ft.setValue(x,_e.setFromMatrixPosition(s.matrixWorld)),ze.logarithmicDepthBuffer&&et.setValue(x,"logDepthBufFC",2/(Math.log(s.far+1)/Math.LN2)),(I.isMeshPhongMaterial||I.isMeshToonMaterial||I.isMeshLambertMaterial||I.isMeshBasicMaterial||I.isMeshStandardMaterial||I.isShaderMaterial)&&et.setValue(x,"isOrthographic",s.isOrthographicCamera===!0),O!==s&&(O=s,mt=!0,Xt=!0)}if(T.isSkinnedMesh){et.setOptional(x,T,"bindMatrix"),et.setOptional(x,T,"bindMatrixInverse");const ct=T.skeleton;ct&&(ct.boneTexture===null&&ct.computeBoneTexture(),et.setValue(x,"boneTexture",ct.boneTexture,Pe))}T.isBatchedMesh&&(et.setOptional(x,T,"batchingTexture"),et.setValue(x,"batchingTexture",T._matricesTexture,Pe),et.setOptional(x,T,"batchingIdTexture"),et.setValue(x,"batchingIdTexture",T._indirectTexture,Pe),et.setOptional(x,T,"batchingColorTexture"),T._colorsTexture!==null&&et.setValue(x,"batchingColorTexture",T._colorsTexture,Pe));const _t=w.morphAttributes;if((_t.position!==void 0||_t.normal!==void 0||_t.color!==void 0)&&be.update(T,w,xt),(mt||Ee.receiveShadow!==T.receiveShadow)&&(Ee.receiveShadow=T.receiveShadow,et.setValue(x,"receiveShadow",T.receiveShadow)),I.isMeshGouraudMaterial&&I.envMap!==null&&(lt.envMap.value=ce,lt.flipEnvMap.value=ce.isCubeTexture&&ce.isRenderTargetTexture===!1?-1:1),I.isMeshStandardMaterial&&I.envMap===null&&M.environment!==null&&(lt.envMapIntensity.value=M.environmentIntensity),lt.dfgLUT!==void 0&&(lt.dfgLUT.value=Wf()),mt&&(et.setValue(x,"toneMappingExposure",_.toneMappingExposure),Ee.needsLights&&Da(lt,Xt),J&&I.fog===!0&&me.refreshFogUniforms(lt,J),me.refreshMaterialUniforms(lt,I,pe,fe,v.state.transmissionRenderTarget[s.id]),un.upload(x,Jn(Ee),lt,Pe)),I.isShaderMaterial&&I.uniformsNeedUpdate===!0&&(un.upload(x,Jn(Ee),lt,Pe),I.uniformsNeedUpdate=!1),I.isSpriteMaterial&&et.setValue(x,"center",T.center),et.setValue(x,"modelViewMatrix",T.modelViewMatrix),et.setValue(x,"normalMatrix",T.normalMatrix),et.setValue(x,"modelMatrix",T.matrixWorld),I.isShaderMaterial||I.isRawShaderMaterial){const ct=I.uniformsGroups;for(let ft=0,En=ct.length;ft<En;ft++){const wt=ct[ft];ae.update(wt,xt),ae.bind(wt,xt)}}return xt}function Da(s,M){s.ambientLightColor.needsUpdate=M,s.lightProbe.needsUpdate=M,s.directionalLights.needsUpdate=M,s.directionalLightShadows.needsUpdate=M,s.pointLights.needsUpdate=M,s.pointLightShadows.needsUpdate=M,s.spotLights.needsUpdate=M,s.spotLightShadows.needsUpdate=M,s.rectAreaLights.needsUpdate=M,s.hemisphereLights.needsUpdate=M}function wa(s){return s.isMeshLambertMaterial||s.isMeshToonMaterial||s.isMeshPhongMaterial||s.isMeshStandardMaterial||s.isShadowMaterial||s.isShaderMaterial&&s.lights===!0}this.getActiveCubeFace=function(){return Q},this.getActiveMipmapLevel=function(){return p},this.getRenderTarget=function(){return f},this.setRenderTargetTextures=function(s,M,w){const I=ge.get(s);I.__autoAllocateDepthBuffer=s.resolveDepthBuffer===!1,I.__autoAllocateDepthBuffer===!1&&(I.__useRenderToTexture=!1),ge.get(s.texture).__webglTexture=M,ge.get(s.depthTexture).__webglTexture=I.__autoAllocateDepthBuffer?void 0:w,I.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(s,M){const w=ge.get(s);w.__webglFramebuffer=M,w.__useDefaultFramebuffer=M===void 0};const Ia=x.createFramebuffer();this.setRenderTarget=function(s,M=0,w=0){f=s,Q=M,p=w;let I=!0,T=null,J=!1,oe=!1;if(s){const ce=ge.get(s);if(ce.__useDefaultFramebuffer!==void 0)he.bindFramebuffer(x.FRAMEBUFFER,null),I=!1;else if(ce.__webglFramebuffer===void 0)Pe.setupRenderTarget(s);else if(ce.__hasExternalTextures)Pe.rebindTextures(s,ge.get(s.texture).__webglTexture,ge.get(s.depthTexture).__webglTexture);else if(s.depthBuffer){const ve=s.depthTexture;if(ce.__boundDepthTexture!==ve){if(ve!==null&&ge.has(ve)&&(s.width!==ve.image.width||s.height!==ve.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Pe.setupDepthRenderbuffer(s)}}const Te=s.texture;(Te.isData3DTexture||Te.isDataArrayTexture||Te.isCompressedArrayTexture)&&(oe=!0);const Ae=ge.get(s).__webglFramebuffer;s.isWebGLCubeRenderTarget?(Array.isArray(Ae[M])?T=Ae[M][w]:T=Ae[M],J=!0):s.samples>0&&Pe.useMultisampledRTT(s)===!1?T=ge.get(s).__webglMultisampledFramebuffer:Array.isArray(Ae)?T=Ae[w]:T=Ae,z.copy(s.viewport),W.copy(s.scissor),$=s.scissorTest}else z.copy(Ze).multiplyScalar(pe).floor(),W.copy(qe).multiplyScalar(pe).floor(),$=Qe;if(w!==0&&(T=Ia),he.bindFramebuffer(x.FRAMEBUFFER,T)&&I&&he.drawBuffers(s,T),he.viewport(z),he.scissor(W),he.setScissorTest($),J){const ce=ge.get(s.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_CUBE_MAP_POSITIVE_X+M,ce.__webglTexture,w)}else if(oe){const ce=M;for(let Te=0;Te<s.textures.length;Te++){const Ae=ge.get(s.textures[Te]);x.framebufferTextureLayer(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0+Te,Ae.__webglTexture,w,ce)}}else if(s!==null&&w!==0){const ce=ge.get(s.texture);x.framebufferTexture2D(x.FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,ce.__webglTexture,w)}A=-1},this.readRenderTargetPixels=function(s,M,w,I,T,J,oe,ue=0){if(!(s&&s.isWebGLRenderTarget)){pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ce=ge.get(s).__webglFramebuffer;if(s.isWebGLCubeRenderTarget&&oe!==void 0&&(ce=ce[oe]),ce){he.bindFramebuffer(x.FRAMEBUFFER,ce);try{const Te=s.textures[ue],Ae=Te.format,ve=Te.type;if(!ze.textureFormatReadable(Ae)){pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ze.textureTypeReadable(ve)){pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}M>=0&&M<=s.width-I&&w>=0&&w<=s.height-T&&(s.textures.length>1&&x.readBuffer(x.COLOR_ATTACHMENT0+ue),x.readPixels(M,w,I,T,Re.convert(Ae),Re.convert(ve),J))}finally{const Te=f!==null?ge.get(f).__webglFramebuffer:null;he.bindFramebuffer(x.FRAMEBUFFER,Te)}}},this.readRenderTargetPixelsAsync=async function(s,M,w,I,T,J,oe,ue=0){if(!(s&&s.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ce=ge.get(s).__webglFramebuffer;if(s.isWebGLCubeRenderTarget&&oe!==void 0&&(ce=ce[oe]),ce)if(M>=0&&M<=s.width-I&&w>=0&&w<=s.height-T){he.bindFramebuffer(x.FRAMEBUFFER,ce);const Te=s.textures[ue],Ae=Te.format,ve=Te.type;if(!ze.textureFormatReadable(Ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ze.textureTypeReadable(ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Fe=x.createBuffer();x.bindBuffer(x.PIXEL_PACK_BUFFER,Fe),x.bufferData(x.PIXEL_PACK_BUFFER,J.byteLength,x.STREAM_READ),s.textures.length>1&&x.readBuffer(x.COLOR_ATTACHMENT0+ue),x.readPixels(M,w,I,T,Re.convert(Ae),Re.convert(ve),0);const He=f!==null?ge.get(f).__webglFramebuffer:null;he.bindFramebuffer(x.FRAMEBUFFER,He);const tt=x.fenceSync(x.SYNC_GPU_COMMANDS_COMPLETE,0);return x.flush(),await Ga(x,tt,4),x.bindBuffer(x.PIXEL_PACK_BUFFER,Fe),x.getBufferSubData(x.PIXEL_PACK_BUFFER,0,J),x.deleteBuffer(Fe),x.deleteSync(tt),J}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(s,M=null,w=0){const I=Math.pow(2,-w),T=Math.floor(s.image.width*I),J=Math.floor(s.image.height*I),oe=M!==null?M.x:0,ue=M!==null?M.y:0;Pe.setTexture2D(s,0),x.copyTexSubImage2D(x.TEXTURE_2D,w,0,0,oe,ue,T,J),he.unbindTexture()};const Na=x.createFramebuffer(),ya=x.createFramebuffer();this.copyTextureToTexture=function(s,M,w=null,I=null,T=0,J=null){J===null&&(T!==0?(In("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),J=T,T=0):J=0);let oe,ue,ce,Te,Ae,ve,Fe,He,tt;const nt=s.isCompressedTexture?s.mipmaps[J]:s.image;if(w!==null)oe=w.max.x-w.min.x,ue=w.max.y-w.min.y,ce=w.isBox3?w.max.z-w.min.z:1,Te=w.min.x,Ae=w.min.y,ve=w.isBox3?w.min.z:0;else{const _t=Math.pow(2,-T);oe=Math.floor(nt.width*_t),ue=Math.floor(nt.height*_t),s.isDataArrayTexture?ce=nt.depth:s.isData3DTexture?ce=Math.floor(nt.depth*_t):ce=1,Te=0,Ae=0,ve=0}I!==null?(Fe=I.x,He=I.y,tt=I.z):(Fe=0,He=0,tt=0);const ke=Re.convert(M.format),Ee=Re.convert(M.type);let je;M.isData3DTexture?(Pe.setTexture3D(M,0),je=x.TEXTURE_3D):M.isDataArrayTexture||M.isCompressedArrayTexture?(Pe.setTexture2DArray(M,0),je=x.TEXTURE_2D_ARRAY):(Pe.setTexture2D(M,0),je=x.TEXTURE_2D),x.pixelStorei(x.UNPACK_FLIP_Y_WEBGL,M.flipY),x.pixelStorei(x.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),x.pixelStorei(x.UNPACK_ALIGNMENT,M.unpackAlignment);const Oe=x.getParameter(x.UNPACK_ROW_LENGTH),xt=x.getParameter(x.UNPACK_IMAGE_HEIGHT),Gt=x.getParameter(x.UNPACK_SKIP_PIXELS),mt=x.getParameter(x.UNPACK_SKIP_ROWS),Xt=x.getParameter(x.UNPACK_SKIP_IMAGES);x.pixelStorei(x.UNPACK_ROW_LENGTH,nt.width),x.pixelStorei(x.UNPACK_IMAGE_HEIGHT,nt.height),x.pixelStorei(x.UNPACK_SKIP_PIXELS,Te),x.pixelStorei(x.UNPACK_SKIP_ROWS,Ae),x.pixelStorei(x.UNPACK_SKIP_IMAGES,ve);const et=s.isDataArrayTexture||s.isData3DTexture,lt=M.isDataArrayTexture||M.isData3DTexture;if(s.isDepthTexture){const _t=ge.get(s),ct=ge.get(M),ft=ge.get(_t.__renderTarget),En=ge.get(ct.__renderTarget);he.bindFramebuffer(x.READ_FRAMEBUFFER,ft.__webglFramebuffer),he.bindFramebuffer(x.DRAW_FRAMEBUFFER,En.__webglFramebuffer);for(let wt=0;wt<ce;wt++)et&&(x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,ge.get(s).__webglTexture,T,ve+wt),x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,ge.get(M).__webglTexture,J,tt+wt)),x.blitFramebuffer(Te,Ae,oe,ue,Fe,He,oe,ue,x.DEPTH_BUFFER_BIT,x.NEAREST);he.bindFramebuffer(x.READ_FRAMEBUFFER,null),he.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else if(T!==0||s.isRenderTargetTexture||ge.has(s)){const _t=ge.get(s),ct=ge.get(M);he.bindFramebuffer(x.READ_FRAMEBUFFER,Na),he.bindFramebuffer(x.DRAW_FRAMEBUFFER,ya);for(let ft=0;ft<ce;ft++)et?x.framebufferTextureLayer(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,_t.__webglTexture,T,ve+ft):x.framebufferTexture2D(x.READ_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,_t.__webglTexture,T),lt?x.framebufferTextureLayer(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,ct.__webglTexture,J,tt+ft):x.framebufferTexture2D(x.DRAW_FRAMEBUFFER,x.COLOR_ATTACHMENT0,x.TEXTURE_2D,ct.__webglTexture,J),T!==0?x.blitFramebuffer(Te,Ae,oe,ue,Fe,He,oe,ue,x.COLOR_BUFFER_BIT,x.NEAREST):lt?x.copyTexSubImage3D(je,J,Fe,He,tt+ft,Te,Ae,oe,ue):x.copyTexSubImage2D(je,J,Fe,He,Te,Ae,oe,ue);he.bindFramebuffer(x.READ_FRAMEBUFFER,null),he.bindFramebuffer(x.DRAW_FRAMEBUFFER,null)}else lt?s.isDataTexture||s.isData3DTexture?x.texSubImage3D(je,J,Fe,He,tt,oe,ue,ce,ke,Ee,nt.data):M.isCompressedArrayTexture?x.compressedTexSubImage3D(je,J,Fe,He,tt,oe,ue,ce,ke,nt.data):x.texSubImage3D(je,J,Fe,He,tt,oe,ue,ce,ke,Ee,nt):s.isDataTexture?x.texSubImage2D(x.TEXTURE_2D,J,Fe,He,oe,ue,ke,Ee,nt.data):s.isCompressedTexture?x.compressedTexSubImage2D(x.TEXTURE_2D,J,Fe,He,nt.width,nt.height,ke,nt.data):x.texSubImage2D(x.TEXTURE_2D,J,Fe,He,oe,ue,ke,Ee,nt);x.pixelStorei(x.UNPACK_ROW_LENGTH,Oe),x.pixelStorei(x.UNPACK_IMAGE_HEIGHT,xt),x.pixelStorei(x.UNPACK_SKIP_PIXELS,Gt),x.pixelStorei(x.UNPACK_SKIP_ROWS,mt),x.pixelStorei(x.UNPACK_SKIP_IMAGES,Xt),J===0&&M.generateMipmaps&&x.generateMipmap(je),he.unbindTexture()},this.initRenderTarget=function(s){ge.get(s).__webglFramebuffer===void 0&&Pe.setupRenderTarget(s)},this.initTexture=function(s){s.isCubeTexture?Pe.setTextureCube(s,0):s.isData3DTexture?Pe.setTexture3D(s,0):s.isDataArrayTexture||s.isCompressedArrayTexture?Pe.setTexture2DArray(s,0):Pe.setTexture2D(s,0),he.unbindTexture()},this.resetState=function(){Q=0,p=0,f=null,he.reset(),m.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ti}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorSpace=it._getDrawingBufferColorSpace(n),t.unpackColorSpace=it._getUnpackColorSpace()}}export{Gi as P,Yf as W};
