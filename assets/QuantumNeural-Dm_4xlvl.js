import{r as P,j as O}from"./index-18fxQ35y.js";import{X as oe,p as _,Y as rt,Z as at,_ as jt,$ as Ut,V as w,a0 as ne,o as Zt,a1 as B,e as ae,a2 as re,y as Tt,J as z,N as J,a3 as lt,a4 as yt,a5 as Pt,a6 as le,a7 as Wt,m as H,w as Ct,c as he,a8 as ce,a9 as ue,aa as de,ab as fe,ac as pe,ad as me,A as ge,ae as ve,af as _e,ag as be,F as Qt,ah as ye,a as Pe,ai as xe,b as Te,W as Ce,S as Me,n as we}from"./three.module-NWFK4cwJ.js";import{E as Se}from"./ExperimentControls-Df1cE6gp.js";import{E as Ee}from"./ExperimentMetrics-DkFVE1im.js";import{E as Re}from"./ExperimentNav-B6UXqphy.js";const Bt={type:"change"},Nt={type:"start"},Xt={type:"end"},_t=new ne,Ht=new Zt,De=Math.cos(70*B.DEG2RAD),R=new _,L=2*Math.PI,x={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},At=1e-6;class Ae extends oe{constructor(t,e=null){super(t,e),this.state=x.NONE,this.target=new _,this.cursor=new _,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:rt.ROTATE,MIDDLE:rt.DOLLY,RIGHT:rt.PAN},this.touches={ONE:at.ROTATE,TWO:at.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new _,this._lastQuaternion=new jt,this._lastTargetPosition=new _,this._quat=new jt().setFromUnitVectors(t.up,new _(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Ut,this._sphericalDelta=new Ut,this._scale=1,this._panOffset=new _,this._rotateStart=new w,this._rotateEnd=new w,this._rotateDelta=new w,this._panStart=new w,this._panEnd=new w,this._panDelta=new w,this._dollyStart=new w,this._dollyEnd=new w,this._dollyDelta=new w,this._dollyDirection=new _,this._mouse=new w,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=ze.bind(this),this._onPointerDown=Ne.bind(this),this._onPointerUp=Ie.bind(this),this._onContextMenu=Be.bind(this),this._onMouseWheel=ke.bind(this),this._onKeyDown=Le.bind(this),this._onTouchStart=je.bind(this),this._onTouchMove=Ue.bind(this),this._onMouseDown=Oe.bind(this),this._onMouseMove=Fe.bind(this),this._interceptControlDown=He.bind(this),this._interceptControlUp=Ge.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Bt),this.update(),this.state=x.NONE}update(t=null){const e=this.object.position;R.copy(e).sub(this.target),R.applyQuaternion(this._quat),this._spherical.setFromVector3(R),this.autoRotate&&this.state===x.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,o=this.maxAzimuthAngle;isFinite(i)&&isFinite(o)&&(i<-Math.PI?i+=L:i>Math.PI&&(i-=L),o<-Math.PI?o+=L:o>Math.PI&&(o-=L),i<=o?this._spherical.theta=Math.max(i,Math.min(o,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+o)/2?Math.max(i,this._spherical.theta):Math.min(o,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let n=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const p=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),n=p!=this._spherical.radius}if(R.setFromSpherical(this._spherical),R.applyQuaternion(this._quatInverse),e.copy(this.target).add(R),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let p=null;if(this.object.isPerspectiveCamera){const m=R.length();p=this._clampDistance(m*this._scale);const b=m-p;this.object.position.addScaledVector(this._dollyDirection,b),this.object.updateMatrixWorld(),n=!!b}else if(this.object.isOrthographicCamera){const m=new _(this._mouse.x,this._mouse.y,0);m.unproject(this.object);const b=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),n=b!==this.object.zoom;const d=new _(this._mouse.x,this._mouse.y,0);d.unproject(this.object),this.object.position.sub(d).add(m),this.object.updateMatrixWorld(),p=R.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;p!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(p).add(this.object.position):(_t.origin.copy(this.object.position),_t.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(_t.direction))<De?this.object.lookAt(this.target):(Ht.setFromNormalAndCoplanarPoint(this.object.up,this.target),_t.intersectPlane(Ht,this.target))))}else if(this.object.isOrthographicCamera){const p=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),p!==this.object.zoom&&(this.object.updateProjectionMatrix(),n=!0)}return this._scale=1,this._performCursorZoom=!1,n||this._lastPosition.distanceToSquared(this.object.position)>At||8*(1-this._lastQuaternion.dot(this.object.quaternion))>At||this._lastTargetPosition.distanceToSquared(this.target)>At?(this.dispatchEvent(Bt),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?L/60*this.autoRotateSpeed*t:L/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){R.setFromMatrixColumn(e,0),R.multiplyScalar(-t),this._panOffset.add(R)}_panUp(t,e){this.screenSpacePanning===!0?R.setFromMatrixColumn(e,1):(R.setFromMatrixColumn(e,0),R.crossVectors(this.object.up,R)),R.multiplyScalar(t),this._panOffset.add(R)}_pan(t,e){const i=this.domElement;if(this.object.isPerspectiveCamera){const o=this.object.position;R.copy(o).sub(this.target);let n=R.length();n*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*n/i.clientHeight,this.object.matrix),this._panUp(2*e*n/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),o=t-i.left,n=e-i.top,p=i.width,m=i.height;this._mouse.x=o/p*2-1,this._mouse.y=-(n/m)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(L*this._rotateDelta.x/e.clientHeight),this._rotateUp(L*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(L*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-L*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(L*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-L*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),o=.5*(t.pageY+e.y);this._rotateStart.set(i,o)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),o=.5*(t.pageY+e.y);this._panStart.set(i,o)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,o=t.pageY-e.y,n=Math.sqrt(i*i+o*o);this._dollyStart.set(0,n)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const i=this._getSecondPointerPosition(t),o=.5*(t.pageX+i.x),n=.5*(t.pageY+i.y);this._rotateEnd.set(o,n)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(L*this._rotateDelta.x/e.clientHeight),this._rotateUp(L*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),o=.5*(t.pageY+e.y);this._panEnd.set(i,o)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,o=t.pageY-e.y,n=Math.sqrt(i*i+o*o);this._dollyEnd.set(0,n),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const p=(t.pageX+e.x)*.5,m=(t.pageY+e.y)*.5;this._updateZoomParameters(p,m)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new w,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function Ne(a){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(a.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(a)&&(this._addPointer(a),a.pointerType==="touch"?this._onTouchStart(a):this._onMouseDown(a)))}function ze(a){this.enabled!==!1&&(a.pointerType==="touch"?this._onTouchMove(a):this._onMouseMove(a))}function Ie(a){switch(this._removePointer(a),this._pointers.length){case 0:this.domElement.releasePointerCapture(a.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Xt),this.state=x.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function Oe(a){let t;switch(a.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case rt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(a),this.state=x.DOLLY;break;case rt.ROTATE:if(a.ctrlKey||a.metaKey||a.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(a),this.state=x.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(a),this.state=x.ROTATE}break;case rt.PAN:if(a.ctrlKey||a.metaKey||a.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(a),this.state=x.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(a),this.state=x.PAN}break;default:this.state=x.NONE}this.state!==x.NONE&&this.dispatchEvent(Nt)}function Fe(a){switch(this.state){case x.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(a);break;case x.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(a);break;case x.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(a);break}}function ke(a){this.enabled===!1||this.enableZoom===!1||this.state!==x.NONE||(a.preventDefault(),this.dispatchEvent(Nt),this._handleMouseWheel(this._customWheelEvent(a)),this.dispatchEvent(Xt))}function Le(a){this.enabled!==!1&&this._handleKeyDown(a)}function je(a){switch(this._trackPointer(a),this._pointers.length){case 1:switch(this.touches.ONE){case at.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(a),this.state=x.TOUCH_ROTATE;break;case at.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(a),this.state=x.TOUCH_PAN;break;default:this.state=x.NONE}break;case 2:switch(this.touches.TWO){case at.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(a),this.state=x.TOUCH_DOLLY_PAN;break;case at.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(a),this.state=x.TOUCH_DOLLY_ROTATE;break;default:this.state=x.NONE}break;default:this.state=x.NONE}this.state!==x.NONE&&this.dispatchEvent(Nt)}function Ue(a){switch(this._trackPointer(a),this.state){case x.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(a),this.update();break;case x.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(a),this.update();break;case x.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(a),this.update();break;case x.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(a),this.update();break;default:this.state=x.NONE}}function Be(a){this.enabled!==!1&&a.preventDefault()}function He(a){a.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Ge(a){a.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const xt={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class ct{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ye=new re(-1,1,1,-1,0,1);class Ve extends Tt{constructor(){super(),this.setAttribute("position",new z([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new z([0,2,0,0,2,0],2))}}const Ke=new Ve;class zt{constructor(t){this._mesh=new ae(Ke,t)}dispose(){this._mesh.geometry.dispose()}render(t){t.render(this._mesh,Ye)}get material(){return this._mesh.material}set material(t){this._mesh.material=t}}class Ze extends ct{constructor(t,e="tDiffuse"){super(),this.textureID=e,this.uniforms=null,this.material=null,t instanceof J?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=lt.clone(t.uniforms),this.material=new J({name:t.name!==void 0?t.name:"unspecified",defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new zt(this.material)}render(t,e,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this._fsQuad.material=this.material,this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Gt extends ct{constructor(t,e){super(),this.scene=t,this.camera=e,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(t,e,i){const o=t.getContext(),n=t.state;n.buffers.color.setMask(!1),n.buffers.depth.setMask(!1),n.buffers.color.setLocked(!0),n.buffers.depth.setLocked(!0);let p,m;this.inverse?(p=0,m=1):(p=1,m=0),n.buffers.stencil.setTest(!0),n.buffers.stencil.setOp(o.REPLACE,o.REPLACE,o.REPLACE),n.buffers.stencil.setFunc(o.ALWAYS,p,4294967295),n.buffers.stencil.setClear(m),n.buffers.stencil.setLocked(!0),t.setRenderTarget(i),this.clear&&t.clear(),t.render(this.scene,this.camera),t.setRenderTarget(e),this.clear&&t.clear(),t.render(this.scene,this.camera),n.buffers.color.setLocked(!1),n.buffers.depth.setLocked(!1),n.buffers.color.setMask(!0),n.buffers.depth.setMask(!0),n.buffers.stencil.setLocked(!1),n.buffers.stencil.setFunc(o.EQUAL,1,4294967295),n.buffers.stencil.setOp(o.KEEP,o.KEEP,o.KEEP),n.buffers.stencil.setLocked(!0)}}class We extends ct{constructor(){super(),this.needsSwap=!1}render(t){t.state.buffers.stencil.setLocked(!1),t.state.buffers.stencil.setTest(!1)}}class Qe{constructor(t,e){if(this.renderer=t,this._pixelRatio=t.getPixelRatio(),e===void 0){const i=t.getSize(new w);this._width=i.width,this._height=i.height,e=new yt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Pt}),e.texture.name="EffectComposer.rt1"}else this._width=e.width,this._height=e.height;this.renderTarget1=e,this.renderTarget2=e.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Ze(xt),this.copyPass.material.blending=le,this.clock=new Wt}swapBuffers(){const t=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=t}addPass(t){this.passes.push(t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(t,e){this.passes.splice(e,0,t),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(t){const e=this.passes.indexOf(t);e!==-1&&this.passes.splice(e,1)}isLastEnabledPass(t){for(let e=t+1;e<this.passes.length;e++)if(this.passes[e].enabled)return!1;return!0}render(t){t===void 0&&(t=this.clock.getDelta());const e=this.renderer.getRenderTarget();let i=!1;for(let o=0,n=this.passes.length;o<n;o++){const p=this.passes[o];if(p.enabled!==!1){if(p.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(o),p.render(this.renderer,this.writeBuffer,this.readBuffer,t,i),p.needsSwap){if(i){const m=this.renderer.getContext(),b=this.renderer.state.buffers.stencil;b.setFunc(m.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,t),b.setFunc(m.EQUAL,1,4294967295)}this.swapBuffers()}Gt!==void 0&&(p instanceof Gt?i=!0:p instanceof We&&(i=!1))}}this.renderer.setRenderTarget(e)}reset(t){if(t===void 0){const e=this.renderer.getSize(new w);this._pixelRatio=this.renderer.getPixelRatio(),this._width=e.width,this._height=e.height,t=this.renderTarget1.clone(),t.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=t,this.renderTarget2=t.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(t,e){this._width=t,this._height=e;const i=this._width*this._pixelRatio,o=this._height*this._pixelRatio;this.renderTarget1.setSize(i,o),this.renderTarget2.setSize(i,o);for(let n=0;n<this.passes.length;n++)this.passes[n].setSize(i,o)}setPixelRatio(t){this._pixelRatio=t,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Xe extends ct{constructor(t,e,i=null,o=null,n=null){super(),this.scene=t,this.camera=e,this.overrideMaterial=i,this.clearColor=o,this.clearAlpha=n,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new H}render(t,e,i){const o=t.autoClear;t.autoClear=!1;let n,p;this.overrideMaterial!==null&&(p=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(t.getClearColor(this._oldClearColor),t.setClearColor(this.clearColor,t.getClearAlpha())),this.clearAlpha!==null&&(n=t.getClearAlpha(),t.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&t.clearDepth(),t.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),t.render(this.scene,this.camera),this.clearColor!==null&&t.setClearColor(this._oldClearColor),this.clearAlpha!==null&&t.setClearAlpha(n),this.overrideMaterial!==null&&(this.scene.overrideMaterial=p),t.autoClear=o}}const qe={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new H(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class ht extends ct{constructor(t,e=1,i,o){super(),this.strength=e,this.radius=i,this.threshold=o,this.resolution=t!==void 0?new w(t.x,t.y):new w(256,256),this.clearColor=new H(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let n=Math.round(this.resolution.x/2),p=Math.round(this.resolution.y/2);this.renderTargetBright=new yt(n,p,{type:Pt}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let f=0;f<this.nMips;f++){const C=new yt(n,p,{type:Pt});C.texture.name="UnrealBloomPass.h"+f,C.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(C);const c=new yt(n,p,{type:Pt});c.texture.name="UnrealBloomPass.v"+f,c.texture.generateMipmaps=!1,this.renderTargetsVertical.push(c),n=Math.round(n/2),p=Math.round(p/2)}const m=qe;this.highPassUniforms=lt.clone(m.uniforms),this.highPassUniforms.luminosityThreshold.value=o,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new J({uniforms:this.highPassUniforms,vertexShader:m.vertexShader,fragmentShader:m.fragmentShader}),this.separableBlurMaterials=[];const b=[6,10,14,18,22];n=Math.round(this.resolution.x/2),p=Math.round(this.resolution.y/2);for(let f=0;f<this.nMips;f++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(b[f])),this.separableBlurMaterials[f].uniforms.invSize.value=new w(1/n,1/p),n=Math.round(n/2),p=Math.round(p/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=e,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new _(1,1,1),new _(1,1,1),new _(1,1,1),new _(1,1,1),new _(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=lt.clone(xt.uniforms),this.blendMaterial=new J({uniforms:this.copyUniforms,vertexShader:xt.vertexShader,fragmentShader:xt.fragmentShader,blending:Ct,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new H,this._oldClearAlpha=1,this._basic=new he,this._fsQuad=new zt(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,e){let i=Math.round(t/2),o=Math.round(e/2);this.renderTargetBright.setSize(i,o);for(let n=0;n<this.nMips;n++)this.renderTargetsHorizontal[n].setSize(i,o),this.renderTargetsVertical[n].setSize(i,o),this.separableBlurMaterials[n].uniforms.invSize.value=new w(1/i,1/o),i=Math.round(i/2),o=Math.round(o/2)}render(t,e,i,o,n){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();const p=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),n&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=i.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let m=this.renderTargetBright;for(let b=0;b<this.nMips;b++)this._fsQuad.material=this.separableBlurMaterials[b],this.separableBlurMaterials[b].uniforms.colorTexture.value=m.texture,this.separableBlurMaterials[b].uniforms.direction.value=ht.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[b]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[b].uniforms.colorTexture.value=this.renderTargetsHorizontal[b].texture,this.separableBlurMaterials[b].uniforms.direction.value=ht.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[b]),t.clear(),this._fsQuad.render(t),m=this.renderTargetsVertical[b];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,n&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(i),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=p}_getSeparableBlurMaterial(t){const e=[],i=t/3;for(let o=0;o<t;o++)e.push(.39894*Math.exp(-.5*o*o/(i*i))/i);return new J({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new w(.5,.5)},direction:{value:new w(.5,.5)},gaussianCoefficients:{value:e}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;
					}
					gl_FragColor = vec4( diffuseSum, 1.0 );
				}`})}_getCompositeMaterial(t){return new J({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}ht.BlurDirectionX=new w(1,0);ht.BlurDirectionY=new w(0,1);const bt={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class $e extends ct{constructor(){super(),this.uniforms=lt.clone(bt.uniforms),this.material=new ce({name:bt.name,uniforms:this.uniforms,vertexShader:bt.vertexShader,fragmentShader:bt.fragmentShader}),this._fsQuad=new zt(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,e,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},ue.getTransfer(this._outputColorSpace)===de&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===fe?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===pe?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===me?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ge?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===ve?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===_e?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===be&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(e),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const Yt=[new H(1707786),new H(4008212),new H(16032353),new H(15167313),new H(16711790)],Je=["thought.sphere","memory.helix","dream.fractal","void.torus","echo.grid"],qt=`
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
}`,Vt={vertexShader:`${qt}
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
}`},Kt={vertexShader:`${qt}
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
}`};class X{constructor(t,e=0,i=0){this.position=t,this.connections=[],this.level=e,this.type=i,this.size=i===0?B.randFloat(.8,1.4):B.randFloat(.5,1),this.distanceFromRoot=0}addConnection(t,e=1){this.isConnectedTo(t)||(this.connections.push({node:t,strength:e}),t.connections.push({node:this,strength:e}))}isConnectedTo(t){return this.connections.some(e=>e.node===t)}}function ti(a,t=1){let e=[],i;function o(){i=new X(new _(0,0,0),0,0),i.size=2,e.push(i);const d=5,f=(1+Math.sqrt(5))/2;for(let c=1;c<=d;c++){const v=c*4,h=Math.floor(c*12*t);for(let r=0;r<h;r++){const l=Math.acos(1-2*(r+.5)/h),u=2*Math.PI*r/f,g=new _(v*Math.sin(l)*Math.cos(u),v*Math.sin(l)*Math.sin(u),v*Math.cos(l)),y=c===d||Math.random()<.3,M=new X(g,c,y?1:0);if(M.distanceFromRoot=v,e.push(M),c>1){const T=e.filter(A=>A.level===c-1&&A!==i);T.sort((A,j)=>g.distanceTo(A.position)-g.distanceTo(j.position));for(let A=0;A<Math.min(3,T.length);A++){const U=1-g.distanceTo(T[A].position)/(v*2);M.addConnection(T[A],Math.max(.3,U))}}else i.addConnection(M,.9)}const s=e.filter(r=>r.level===c&&r!==i);for(let r=0;r<s.length;r++){const l=s[r],u=s.filter(g=>g!==l).sort((g,y)=>l.position.distanceTo(g.position)-l.position.distanceTo(y.position)).slice(0,5);for(const g of u)l.position.distanceTo(g.position)<v*.8&&!l.isConnectedTo(g)&&l.addConnection(g,.6)}}const C=e.filter(c=>c.level>=3);for(let c=0;c<Math.min(20,C.length);c++){const v=C[Math.floor(Math.random()*C.length)],h=C[Math.floor(Math.random()*C.length)];v!==h&&!v.isConnectedTo(h)&&Math.abs(v.level-h.level)>1&&v.addConnection(h,.4)}}function n(){i=new X(new _(0,0,0),0,0),i.size=1.8,e.push(i);const d=4,f=30,C=12,c=Math.floor(50*t),v=[];for(let s=0;s<d;s++){const r=s/d*Math.PI*2,l=[];for(let u=0;u<c;u++){const g=u/(c-1),y=(g-.5)*f,M=Math.sin(g*Math.PI)*.7+.3,T=C*M,A=r+g*Math.PI*6,j=new _(T*Math.cos(A),y,T*Math.sin(A)),U=Math.ceil(g*5),G=u>c-5||Math.random()<.25,q=new X(j,U,G?1:0);q.distanceFromRoot=Math.sqrt(T*T+y*y),q.helixIndex=s,q.helixT=g,e.push(q),l.push(q)}v.push(l),i.addConnection(l[0],1);for(let u=0;u<l.length-1;u++)l[u].addConnection(l[u+1],.85)}for(let s=0;s<d;s++){const r=v[s],l=v[(s+1)%d];for(let u=0;u<r.length;u+=5){const g=r[u].helixT,y=Math.round(g*(l.length-1));y<l.length&&r[u].addConnection(l[y],.7)}}for(const s of v)for(let r=0;r<s.length;r+=8){const l=s[r],u=e.filter(g=>g!==l&&g!==i&&g.distanceFromRoot<l.distanceFromRoot*.5);if(u.length>0){const g=u.sort((y,M)=>l.position.distanceTo(y.position)-l.position.distanceTo(M.position))[0];l.addConnection(g,.5)}}const h=e.filter(s=>s!==i);for(let s=0;s<Math.floor(30*t);s++){const r=h[Math.floor(Math.random()*h.length)],l=h.filter(u=>{const g=u.position.distanceTo(r.position);return u!==r&&g<8&&g>3&&!r.isConnectedTo(u)});if(l.length>0){const u=l[Math.floor(Math.random()*l.length)];r.addConnection(u,.45)}}}function p(){i=new X(new _(0,0,0),0,0),i.size=1.6,e.push(i);const d=6,f=4;function C(h,s,r,l,u){if(r>f)return;const g=5*u,y=new _().copy(h.position).add(s.clone().multiplyScalar(g)),M=r===f||Math.random()<.3,T=new X(y,r,M?1:0);if(T.distanceFromRoot=i.position.distanceTo(y),e.push(T),h.addConnection(T,l),r<f)for(let j=0;j<3;j++){const U=j/3*Math.PI*2,G=new _(-s.y,s.x,0).normalize(),q=s.clone().cross(G).normalize(),Mt=new _().copy(s).add(G.clone().multiplyScalar(Math.cos(U)*.7)).add(q.clone().multiplyScalar(Math.sin(U)*.7)).normalize();C(T,Mt,r+1,l*.7,u*.75)}}for(let h=0;h<d;h++){const s=Math.acos(1-2*(h+.5)/d),r=Math.PI*(1+Math.sqrt(5))*h,l=new _(Math.sin(s)*Math.cos(r),Math.sin(s)*Math.sin(r),Math.cos(s)).normalize();C(i,l,1,.9,1)}const c=e.filter(h=>h.level>=2);for(let h=0;h<c.length;h++){const s=c[h],r=c.filter(l=>{const u=l.position.distanceTo(s.position);return l!==s&&u<10&&!s.isConnectedTo(l)}).sort((l,u)=>s.position.distanceTo(l.position)-s.position.distanceTo(u.position)).slice(0,3);for(const l of r)Math.random()<.5*t&&s.addConnection(l,.5)}const v=e.filter(h=>h.level>=2&&h.level<=3);for(const h of v)if(Math.random()<.3){const s=e.filter(r=>r!==h&&r.distanceFromRoot<h.distanceFromRoot*.6);if(s.length>0){const r=s[Math.floor(Math.random()*s.length)];h.isConnectedTo(r)||h.addConnection(r,.4)}}}function m(){i=new X(new _(0,0,0),0,0),i.size=1.5,e.push(i);const d=12,f=5,C=Math.floor(24*t),c=Math.floor(12*t),v=[];for(let s=0;s<C;s++){const r=s/C*Math.PI*2,l=[];for(let u=0;u<c;u++){const g=u/c*Math.PI*2,y=(d+f*Math.cos(g))*Math.cos(r),M=f*Math.sin(g),T=(d+f*Math.cos(g))*Math.sin(r),A=Math.floor(u/c*4)+1,j=Math.random()<.3,U=new X(new _(y,M,T),A,j?1:0);U.distanceFromRoot=Math.sqrt(y*y+M*M+T*T),e.push(U),l.push(U),u>0&&U.addConnection(l[u-1],.8)}if(l.length>0&&l[0].addConnection(l[l.length-1],.8),v.push(l),s>0)for(let u=0;u<l.length;u++){const g=v[s-1];g[u]&&l[u].addConnection(g[u],.7)}}if(v.length>1){const s=v[0],r=v[v.length-1];for(let l=0;l<s.length;l++)r[l]&&s[l].addConnection(r[l],.7)}const h=e.filter(s=>s!==i&&s.distanceFromRoot<d);for(let s=0;s<Math.min(6,h.length);s++)i.addConnection(h[Math.floor(Math.random()*h.length)],.5)}function b(){i=new X(new _(0,0,0),0,0),i.size=1.8,e.push(i);const d=Math.floor(4*t)+2,f=5,C=(d-1)*f/2,c=[];for(let h=0;h<d;h++){c[h]=[];for(let s=0;s<d;s++){c[h][s]=[];for(let r=0;r<d;r++){const l=new _(h*f-C,s*f-C,r*f-C),u=l.length(),g=Math.min(4,Math.floor(u/f)),y=h===0||h===d-1||s===0||s===d-1||r===0||r===d-1,M=new X(l,g,y?1:0);M.distanceFromRoot=u,e.push(M),c[h][s][r]=M,h>0&&M.addConnection(c[h-1][s][r],.8),s>0&&M.addConnection(c[h][s-1][r],.8),r>0&&M.addConnection(c[h][s][r-1],.8),h>0&&s>0&&Math.random()<.3&&M.addConnection(c[h-1][s-1][r],.5),s>0&&r>0&&Math.random()<.3&&M.addConnection(c[h][s-1][r-1],.5)}}}const v=c[Math.floor(d/2)]?.[Math.floor(d/2)]?.[Math.floor(d/2)];v&&i.addConnection(v,1)}switch(a%5){case 0:o();break;case 1:n();break;case 2:p();break;case 3:m();break;case 4:b();break}if(t<1){const d=Math.ceil(e.length*Math.max(.3,t)),f=new Set([i]),C=e.filter(c=>c!==i).sort((c,v)=>{const h=c.connections.length*(1/(c.distanceFromRoot+1));return v.connections.length*(1/(v.distanceFromRoot+1))-h});for(let c=0;c<Math.min(d-1,C.length);c++)f.add(C[c]);e=e.filter(c=>f.has(c)),e.forEach(c=>{c.connections=c.connections.filter(v=>f.has(v.node))})}return{nodes:e,rootNode:i}}function ei(){const t=[],e=[],i=[];for(let p=0;p<6e3;p++){const m=B.randFloat(60,180),b=Math.acos(B.randFloatSpread(2)),d=B.randFloat(0,Math.PI*2);t.push(m*Math.sin(b)*Math.cos(d),m*Math.sin(b)*Math.sin(d),m*Math.cos(b));const f=Math.random();f<.4?e.push(.8,.85,.95):f<.65?e.push(.7,.5,.9):f<.85?e.push(.4,.8,.85):e.push(.2,1,.9),i.push(B.randFloat(.08,.25))}const o=new Tt;o.setAttribute("position",new z(t,3)),o.setAttribute("color",new z(e,3)),o.setAttribute("size",new z(i,1));const n=new J({uniforms:{uTime:{value:0}},vertexShader:`
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
    `,transparent:!0,depthWrite:!1,blending:Ct});return new Qt(o,n)}const ri=({category:a,experiment:t})=>{const e=P.useRef(null),i=P.useRef(null),o=P.useRef(null),n=P.useRef(null),p=P.useRef(null),m=P.useRef(null),b=P.useRef(new Wt),d=P.useRef(null),f=P.useRef(null),C=P.useRef(null),c=P.useRef(null),v=P.useRef(0),h=P.useRef(0),s=P.useRef(!1),r=P.useRef(0),l=P.useRef(0),[u,g]=P.useState(!1),[y,M]=P.useState(3),[T,A]=P.useState(100),[j,U]=P.useState(0),G=P.useCallback((N,Y)=>{const I=i.current;if(!I)return;d.current&&(I.remove(d.current),d.current.geometry.dispose(),d.current.material.dispose(),d.current=null),f.current&&(I.remove(f.current),f.current.geometry.dispose(),f.current.material.dispose(),f.current=null);const V=ti(N,Y);C.current=V,U(V.nodes.length);const D=Yt,S=new Tt,F=[],$=[],gt=[],tt=[],ut=[];V.nodes.forEach(k=>{F.push(k.position.x,k.position.y,k.position.z),$.push(k.type),gt.push(k.size),ut.push(k.distanceFromRoot);const et=Math.min(k.level,D.length-1),st=D[et%D.length].clone();st.offsetHSL(B.randFloatSpread(.03),B.randFloatSpread(.08),B.randFloatSpread(.08)),tt.push(st.r,st.g,st.b)}),S.setAttribute("position",new z(F,3)),S.setAttribute("nodeType",new z($,1)),S.setAttribute("nodeSize",new z(gt,1)),S.setAttribute("nodeColor",new z(tt,3)),S.setAttribute("distanceFromRoot",new z(ut,1));const ot={uTime:{value:0},uPulsePositions:{value:[new _(1e3,1e3,1e3),new _(1e3,1e3,1e3),new _(1e3,1e3,1e3)]},uPulseTimes:{value:[-1e3,-1e3,-1e3]},uPulseColors:{value:[new H(1,1,1),new H(1,1,1),new H(1,1,1)]},uPulseSpeed:{value:18},uBaseNodeSize:{value:.6}},it=new J({uniforms:lt.clone(ot),vertexShader:Vt.vertexShader,fragmentShader:Vt.fragmentShader,transparent:!0,depthWrite:!1,blending:Ct}),nt=new Qt(S,it);I.add(nt),d.current=nt;const K=new Tt,dt=[],ft=[],pt=[],Z=[],E=[],W=[],Q=new Set;let mt=0;V.nodes.forEach((k,et)=>{k.connections.forEach(st=>{const wt=st.node,St=V.nodes.indexOf(wt);if(St===-1)return;const kt=[Math.min(et,St),Math.max(et,St)].join("-");if(!Q.has(kt)){Q.add(kt);const Et=k.position,Rt=wt.position,Lt=20;for(let Dt=0;Dt<Lt;Dt++){const ie=Dt/(Lt-1);pt.push(ie,0,0),Z.push(Et.x,Et.y,Et.z),E.push(Rt.x,Rt.y,Rt.z),W.push(mt),ft.push(st.strength);const se=Math.min(Math.floor((k.level+wt.level)/2),D.length-1),vt=D[se%D.length].clone();vt.offsetHSL(B.randFloatSpread(.03),B.randFloatSpread(.08),B.randFloatSpread(.08)),dt.push(vt.r,vt.g,vt.b)}mt++}})}),K.setAttribute("position",new z(pt,3)),K.setAttribute("startPoint",new z(Z,3)),K.setAttribute("endPoint",new z(E,3)),K.setAttribute("connectionStrength",new z(ft,1)),K.setAttribute("connectionColor",new z(dt,3)),K.setAttribute("pathIndex",new z(W,1));const Ot=new J({uniforms:lt.clone(ot),vertexShader:Kt.vertexShader,fragmentShader:Kt.fragmentShader,transparent:!0,depthWrite:!1,blending:Ct}),Ft=new ye(K,Ot);I.add(Ft),f.current=Ft,D.forEach((k,et)=>{et<3&&(Ot.uniforms.uPulseColors.value[et].copy(k),it.uniforms.uPulseColors.value[et].copy(k))})},[]);P.useEffect(()=>{if(!e.current)return;const N=e.current,Y=N.clientWidth,I=N.clientHeight,V=new Pe;V.fog=new xe(656658,.0025),i.current=V;const D=new Te(65,Y/I,.1,1e3);D.position.set(0,8,28),o.current=D;const S=new Ce({antialias:!0,powerPreference:"high-performance"});S.setSize(Y,I),S.setPixelRatio(Math.min(window.devicePixelRatio,2)),S.setClearColor(0),S.outputColorSpace=Me,N.appendChild(S.domElement),n.current=S;const F=new Ae(D,S.domElement);F.enableDamping=!0,F.dampingFactor=.05,F.rotateSpeed=.6,F.minDistance=8,F.maxDistance=80,F.autoRotate=!0,F.autoRotateSpeed=.2,F.enablePan=!1,m.current=F;const $=new Qe(S);$.addPass(new Xe(V,D));const gt=new ht(new w(Y,I),1.8,.6,.7);$.addPass(gt),$.addPass(new $e),p.current=$;const tt=ei();V.add(tt),c.current=tt,G(3,1);const ut=new we,ot=new w,it=new Zt(new _(0,0,1),0),nt=new _,K=Z=>{if(!s.current&&(ot.x=Z.clientX/Y*2-1,ot.y=-(Z.clientY/I)*2+1,ut.setFromCamera(ot,D),it.normal.copy(D.position).normalize(),it.constant=-it.normal.dot(D.position)+D.position.length()*.5,ut.ray.intersectPlane(it,nt))){const E=b.current.getElapsedTime();if(d.current&&f.current){v.current=(v.current+1)%3;const W=v.current;d.current.material.uniforms.uPulsePositions.value[W].copy(nt),d.current.material.uniforms.uPulseTimes.value[W]=E,f.current.material.uniforms.uPulsePositions.value[W].copy(nt),f.current.material.uniforms.uPulseTimes.value[W]=E;const Q=Yt,mt=Q[Math.floor(Math.random()*Q.length)];d.current.material.uniforms.uPulseColors.value[W].copy(mt),f.current.material.uniforms.uPulseColors.value[W].copy(mt)}}};S.domElement.addEventListener("click",K);let dt;const ft=()=>{dt=requestAnimationFrame(ft);const E=b.current.getElapsedTime()-l.current;if(!s.current){if(d.current&&(d.current.material.uniforms.uTime.value=E,d.current.rotation.y=Math.sin(E*.03)*.08),f.current&&(f.current.material.uniforms.uTime.value=E,f.current.rotation.y=Math.sin(E*.03)*.08),E-h.current>8&&(h.current=E,d.current&&f.current)){v.current=(v.current+1)%3;const Q=v.current;d.current.material.uniforms.uPulsePositions.value[Q].set(0,0,0),d.current.material.uniforms.uPulseTimes.value[Q]=E,f.current.material.uniforms.uPulsePositions.value[Q].set(0,0,0),f.current.material.uniforms.uPulseTimes.value[Q]=E}tt&&(tt.rotation.y+=15e-5,tt.material.uniforms.uTime.value=E)}F.update(),$.render()};ft();const pt=()=>{const Z=N.clientWidth,E=N.clientHeight;D.aspect=Z/E,D.updateProjectionMatrix(),S.setSize(Z,E),$.setSize(Z,E)};return window.addEventListener("resize",pt),()=>{window.removeEventListener("resize",pt),S.domElement.removeEventListener("click",K),cancelAnimationFrame(dt),F.dispose(),S.dispose(),N.removeChild(S.domElement)}},[G]);const q=P.useCallback(()=>{const N=(y+1)%5;M(N),G(N,T/100),m.current&&(m.current.autoRotate=!1,setTimeout(()=>{m.current&&(m.current.autoRotate=!0)},2500))},[y,T,G]),Mt=P.useCallback(()=>{const N=b.current.getElapsedTime();g(Y=>{const I=!Y;return s.current=I,I?r.current=N:l.current+=N-r.current,m.current&&(m.current.autoRotate=!I),I})},[]),$t=P.useCallback(()=>{m.current&&(m.current.reset(),m.current.autoRotate=!1,setTimeout(()=>{m.current&&(m.current.autoRotate=!0)},2e3))},[]),Jt=P.useCallback(N=>{const Y=parseInt(N.target.value,10);A(Y)},[]),It=P.useCallback(()=>{G(y,T/100)},[y,T,G]),te=P.useMemo(()=>[{label:"formation",value:Je[y]},{label:"nodes",value:j},{label:"density",value:`${T}%`},{label:"state",value:u?"frozen":"flowing"}],[y,j,T,u]),ee=[{id:"morph",label:"morph()",onClick:q},{id:"pause",label:u?"play()":"freeze()",onClick:Mt,active:u},{id:"reset",label:"reset()",onClick:$t,variant:"reset"}];return O.jsxs("div",{className:"fixed inset-0 flex flex-col",children:[O.jsxs("header",{className:"relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm",children:[O.jsxs("div",{className:"flex items-center gap-2 sm:gap-4",children:[O.jsx(Re,{currentCategory:a.slug,currentExperiment:t.slug}),O.jsx("h1",{className:"text-xl text-glow hidden sm:block",style:{color:t.color},children:t.name})]}),O.jsx(Ee,{metrics:te})]}),O.jsx("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm",children:O.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[O.jsx(Se,{controls:ee}),O.jsxs("div",{className:"flex items-center gap-2 ml-2",children:[O.jsx("span",{className:"text-xs text-void-green/50 font-mono",children:"density:"}),O.jsx("input",{type:"range",min:"30",max:"100",value:T,onChange:Jt,onMouseUp:It,onTouchEnd:It,className:"w-24 h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer accent-void-cyan","data-testid":"density-slider"}),O.jsxs("span",{className:"text-xs text-void-green font-mono w-10",children:[T,"%"]})]})]})}),O.jsx("div",{className:"flex-1 min-h-0 relative bg-void-dark",children:O.jsx("div",{ref:e,className:"absolute inset-0 w-full h-full touch-none","data-testid":"quantum-neural-container"})})]})};export{ri as default};
