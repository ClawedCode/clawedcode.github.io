import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Temporal Decay palette - amber warnings from dying stars
const COLOR_PALETTE = [
  new THREE.Color(0x1a0f0a),
  new THREE.Color(0x3d2914),
  new THREE.Color(0xf4a261),
  new THREE.Color(0xe76f51),
  new THREE.Color(0xff006e)
]

const FORMATION_NAMES = ['thought.sphere', 'memory.helix', 'dream.fractal', 'void.torus', 'echo.grid']

// Noise functions for shaders
const NOISE_FUNCTIONS = `
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
}`

// Node shader - void entities flickering between dimensions
const NODE_SHADER = {
  vertexShader: `${NOISE_FUNCTIONS}
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
}`,
  fragmentShader: `
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
}`
}

// Connection shader - synaptic threads weaving through the void
const CONNECTION_SHADER = {
  vertexShader: `${NOISE_FUNCTIONS}
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
}`,
  fragmentShader: `
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
}`
}

// Node class - discrete thoughts in the consciousness substrate
class Node {
  constructor(position, level = 0, type = 0) {
    this.position = position
    this.connections = []
    this.level = level
    this.type = type
    this.size = type === 0 ? THREE.MathUtils.randFloat(0.8, 1.4) : THREE.MathUtils.randFloat(0.5, 1.0)
    this.distanceFromRoot = 0
  }

  addConnection(node, strength = 1.0) {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength })
      node.connections.push({ node: this, strength })
    }
  }

  isConnectedTo(node) {
    return this.connections.some(conn => conn.node === node)
  }
}

// Generate consciousness substrate - emergent thought patterns
function generateNeuralNetwork(formationIndex, densityFactor = 1.0) {
  let nodes = []
  let rootNode

  // thought.sphere - crystalline consciousness expanding in all directions
  function generateCrystallineSphere() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0)
    rootNode.size = 2.0
    nodes.push(rootNode)

    const layers = 5
    const goldenRatio = (1 + Math.sqrt(5)) / 2

    for (let layer = 1; layer <= layers; layer++) {
      const radius = layer * 4
      const numPoints = Math.floor(layer * 12 * densityFactor)

      for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints)
        const theta = 2 * Math.PI * i / goldenRatio

        const pos = new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        )

        const isLeaf = layer === layers || Math.random() < 0.3
        const node = new Node(pos, layer, isLeaf ? 1 : 0)
        node.distanceFromRoot = radius
        nodes.push(node)

        if (layer > 1) {
          const prevLayerNodes = nodes.filter(n => n.level === layer - 1 && n !== rootNode)
          prevLayerNodes.sort((a, b) =>
            pos.distanceTo(a.position) - pos.distanceTo(b.position)
          )
          for (let j = 0; j < Math.min(3, prevLayerNodes.length); j++) {
            const dist = pos.distanceTo(prevLayerNodes[j].position)
            const strength = 1.0 - (dist / (radius * 2))
            node.addConnection(prevLayerNodes[j], Math.max(0.3, strength))
          }
        } else {
          rootNode.addConnection(node, 0.9)
        }
      }

      const layerNodes = nodes.filter(n => n.level === layer && n !== rootNode)
      for (let i = 0; i < layerNodes.length; i++) {
        const node = layerNodes[i]
        const nearby = layerNodes.filter(n => n !== node)
          .sort((a, b) =>
            node.position.distanceTo(a.position) - node.position.distanceTo(b.position)
          ).slice(0, 5)

        for (const nearNode of nearby) {
          const dist = node.position.distanceTo(nearNode.position)
          if (dist < radius * 0.8 && !node.isConnectedTo(nearNode)) {
            node.addConnection(nearNode, 0.6)
          }
        }
      }
    }

    const outerNodes = nodes.filter(n => n.level >= 3)
    for (let i = 0; i < Math.min(20, outerNodes.length); i++) {
      const n1 = outerNodes[Math.floor(Math.random() * outerNodes.length)]
      const n2 = outerNodes[Math.floor(Math.random() * outerNodes.length)]
      if (n1 !== n2 && !n1.isConnectedTo(n2) && Math.abs(n1.level - n2.level) > 1) {
        n1.addConnection(n2, 0.4)
      }
    }
  }

  // memory.helix - temporal spirals of interconnected recollections
  function generateHelixLattice() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0)
    rootNode.size = 1.8
    nodes.push(rootNode)

    const numHelices = 4
    const height = 30
    const maxRadius = 12
    const nodesPerHelix = Math.floor(50 * densityFactor)
    const helixArrays = []

    for (let h = 0; h < numHelices; h++) {
      const helixPhase = (h / numHelices) * Math.PI * 2
      const helixNodes = []

      for (let i = 0; i < nodesPerHelix; i++) {
        const t = i / (nodesPerHelix - 1)
        const y = (t - 0.5) * height
        const radiusScale = Math.sin(t * Math.PI) * 0.7 + 0.3
        const radius = maxRadius * radiusScale
        const angle = helixPhase + t * Math.PI * 6

        const pos = new THREE.Vector3(
          radius * Math.cos(angle),
          y,
          radius * Math.sin(angle)
        )

        const level = Math.ceil(t * 5)
        const isLeaf = i > nodesPerHelix - 5 || Math.random() < 0.25
        const node = new Node(pos, level, isLeaf ? 1 : 0)
        node.distanceFromRoot = Math.sqrt(radius * radius + y * y)
        node.helixIndex = h
        node.helixT = t
        nodes.push(node)
        helixNodes.push(node)
      }

      helixArrays.push(helixNodes)
      rootNode.addConnection(helixNodes[0], 1.0)

      for (let i = 0; i < helixNodes.length - 1; i++) {
        helixNodes[i].addConnection(helixNodes[i + 1], 0.85)
      }
    }

    for (let h = 0; h < numHelices; h++) {
      const currentHelix = helixArrays[h]
      const nextHelix = helixArrays[(h + 1) % numHelices]

      for (let i = 0; i < currentHelix.length; i += 5) {
        const t = currentHelix[i].helixT
        const targetIdx = Math.round(t * (nextHelix.length - 1))
        if (targetIdx < nextHelix.length) {
          currentHelix[i].addConnection(nextHelix[targetIdx], 0.7)
        }
      }
    }

    for (const helix of helixArrays) {
      for (let i = 0; i < helix.length; i += 8) {
        const node = helix[i]
        const innerNodes = nodes.filter(n =>
          n !== node && n !== rootNode && n.distanceFromRoot < node.distanceFromRoot * 0.5
        )
        if (innerNodes.length > 0) {
          const nearest = innerNodes.sort((a, b) =>
            node.position.distanceTo(a.position) - node.position.distanceTo(b.position)
          )[0]
          node.addConnection(nearest, 0.5)
        }
      }
    }

    const allHelixNodes = nodes.filter(n => n !== rootNode)
    for (let i = 0; i < Math.floor(30 * densityFactor); i++) {
      const n1 = allHelixNodes[Math.floor(Math.random() * allHelixNodes.length)]
      const nearby = allHelixNodes.filter(n => {
        const dist = n.position.distanceTo(n1.position)
        return n !== n1 && dist < 8 && dist > 3 && !n1.isConnectedTo(n)
      })
      if (nearby.length > 0) {
        const n2 = nearby[Math.floor(Math.random() * nearby.length)]
        n1.addConnection(n2, 0.45)
      }
    }
  }

  // dream.fractal - branching paths of recursive imagination
  function generateFractalWeb() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0)
    rootNode.size = 1.6
    nodes.push(rootNode)

    const branches = 6
    const maxDepth = 4

    function createBranch(startNode, direction, depth, strength, scale) {
      if (depth > maxDepth) return

      const branchLength = 5 * scale
      const endPos = new THREE.Vector3()
        .copy(startNode.position)
        .add(direction.clone().multiplyScalar(branchLength))

      const isLeaf = depth === maxDepth || Math.random() < 0.3
      const newNode = new Node(endPos, depth, isLeaf ? 1 : 0)
      newNode.distanceFromRoot = rootNode.position.distanceTo(endPos)
      nodes.push(newNode)
      startNode.addConnection(newNode, strength)

      if (depth < maxDepth) {
        const subBranches = 3
        for (let i = 0; i < subBranches; i++) {
          const angle = (i / subBranches) * Math.PI * 2
          const perpDir1 = new THREE.Vector3(-direction.y, direction.x, 0).normalize()
          const perpDir2 = direction.clone().cross(perpDir1).normalize()

          const newDir = new THREE.Vector3()
            .copy(direction)
            .add(perpDir1.clone().multiplyScalar(Math.cos(angle) * 0.7))
            .add(perpDir2.clone().multiplyScalar(Math.sin(angle) * 0.7))
            .normalize()

          createBranch(newNode, newDir, depth + 1, strength * 0.7, scale * 0.75)
        }
      }
    }

    for (let i = 0; i < branches; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / branches)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i

      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize()

      createBranch(rootNode, direction, 1, 0.9, 1.0)
    }

    const leafNodes = nodes.filter(n => n.level >= 2)
    for (let i = 0; i < leafNodes.length; i++) {
      const node = leafNodes[i]
      const nearby = leafNodes.filter(n => {
        const dist = n.position.distanceTo(node.position)
        return n !== node && dist < 10 && !node.isConnectedTo(n)
      }).sort((a, b) =>
        node.position.distanceTo(a.position) - node.position.distanceTo(b.position)
      ).slice(0, 3)

      for (const nearNode of nearby) {
        if (Math.random() < 0.5 * densityFactor) {
          node.addConnection(nearNode, 0.5)
        }
      }
    }

    const midLevelNodes = nodes.filter(n => n.level >= 2 && n.level <= 3)
    for (const node of midLevelNodes) {
      if (Math.random() < 0.3) {
        const innerNodes = nodes.filter(n =>
          n !== node && n.distanceFromRoot < node.distanceFromRoot * 0.6
        )
        if (innerNodes.length > 0) {
          const target = innerNodes[Math.floor(Math.random() * innerNodes.length)]
          if (!node.isConnectedTo(target)) {
            node.addConnection(target, 0.4)
          }
        }
      }
    }
  }

  // void.torus - consciousness circling back on itself
  function generateTorus() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0)
    rootNode.size = 1.5
    nodes.push(rootNode)

    const majorRadius = 12
    const minorRadius = 5
    const majorSegments = Math.floor(24 * densityFactor)
    const minorSegments = Math.floor(12 * densityFactor)

    const torusNodes = []

    for (let i = 0; i < majorSegments; i++) {
      const majorAngle = (i / majorSegments) * Math.PI * 2
      const ringNodes = []

      for (let j = 0; j < minorSegments; j++) {
        const minorAngle = (j / minorSegments) * Math.PI * 2

        const x = (majorRadius + minorRadius * Math.cos(minorAngle)) * Math.cos(majorAngle)
        const y = minorRadius * Math.sin(minorAngle)
        const z = (majorRadius + minorRadius * Math.cos(minorAngle)) * Math.sin(majorAngle)

        const level = Math.floor((j / minorSegments) * 4) + 1
        const isLeaf = Math.random() < 0.3
        const node = new Node(new THREE.Vector3(x, y, z), level, isLeaf ? 1 : 0)
        node.distanceFromRoot = Math.sqrt(x * x + y * y + z * z)
        nodes.push(node)
        ringNodes.push(node)

        // Connect to previous in ring
        if (j > 0) {
          node.addConnection(ringNodes[j - 1], 0.8)
        }
      }
      // Close the ring
      if (ringNodes.length > 0) {
        ringNodes[0].addConnection(ringNodes[ringNodes.length - 1], 0.8)
      }

      torusNodes.push(ringNodes)

      // Connect to previous ring
      if (i > 0) {
        for (let j = 0; j < ringNodes.length; j++) {
          const prevRing = torusNodes[i - 1]
          if (prevRing[j]) {
            ringNodes[j].addConnection(prevRing[j], 0.7)
          }
        }
      }
    }

    // Close the torus by connecting first and last rings
    if (torusNodes.length > 1) {
      const firstRing = torusNodes[0]
      const lastRing = torusNodes[torusNodes.length - 1]
      for (let j = 0; j < firstRing.length; j++) {
        if (lastRing[j]) {
          firstRing[j].addConnection(lastRing[j], 0.7)
        }
      }
    }

    // Connect center to some inner nodes
    const innerNodes = nodes.filter(n => n !== rootNode && n.distanceFromRoot < majorRadius)
    for (let i = 0; i < Math.min(6, innerNodes.length); i++) {
      rootNode.addConnection(innerNodes[Math.floor(Math.random() * innerNodes.length)], 0.5)
    }
  }

  // echo.grid - structured lattice of interconnected thought
  function generateGrid() {
    rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0)
    rootNode.size = 1.8
    nodes.push(rootNode)

    const gridSize = Math.floor(4 * densityFactor) + 2
    const spacing = 5
    const offset = (gridSize - 1) * spacing / 2

    const gridNodes = []

    for (let x = 0; x < gridSize; x++) {
      gridNodes[x] = []
      for (let y = 0; y < gridSize; y++) {
        gridNodes[x][y] = []
        for (let z = 0; z < gridSize; z++) {
          const pos = new THREE.Vector3(
            x * spacing - offset,
            y * spacing - offset,
            z * spacing - offset
          )

          const distFromCenter = pos.length()
          const level = Math.min(4, Math.floor(distFromCenter / spacing))
          const isLeaf = x === 0 || x === gridSize - 1 || y === 0 || y === gridSize - 1 || z === 0 || z === gridSize - 1
          const node = new Node(pos, level, isLeaf ? 1 : 0)
          node.distanceFromRoot = distFromCenter
          nodes.push(node)
          gridNodes[x][y][z] = node

          // Connect to neighbors
          if (x > 0) node.addConnection(gridNodes[x - 1][y][z], 0.8)
          if (y > 0) node.addConnection(gridNodes[x][y - 1][z], 0.8)
          if (z > 0) node.addConnection(gridNodes[x][y][z - 1], 0.8)

          // Diagonal connections for visual interest
          if (x > 0 && y > 0 && Math.random() < 0.3) {
            node.addConnection(gridNodes[x - 1][y - 1][z], 0.5)
          }
          if (y > 0 && z > 0 && Math.random() < 0.3) {
            node.addConnection(gridNodes[x][y - 1][z - 1], 0.5)
          }
        }
      }
    }

    // Connect center node to nearest grid nodes
    const centerNode = gridNodes[Math.floor(gridSize / 2)]?.[Math.floor(gridSize / 2)]?.[Math.floor(gridSize / 2)]
    if (centerNode) {
      rootNode.addConnection(centerNode, 1.0)
    }
  }

  switch (formationIndex % 5) {
    case 0: generateCrystallineSphere(); break
    case 1: generateHelixLattice(); break
    case 2: generateFractalWeb(); break
    case 3: generateTorus(); break
    case 4: generateGrid(); break
  }

  if (densityFactor < 1.0) {
    const targetCount = Math.ceil(nodes.length * Math.max(0.3, densityFactor))
    const toKeep = new Set([rootNode])
    const sortedNodes = nodes.filter(n => n !== rootNode)
      .sort((a, b) => {
        const scoreA = a.connections.length * (1 / (a.distanceFromRoot + 1))
        const scoreB = b.connections.length * (1 / (b.distanceFromRoot + 1))
        return scoreB - scoreA
      })

    for (let i = 0; i < Math.min(targetCount - 1, sortedNodes.length); i++) {
      toKeep.add(sortedNodes[i])
    }

    nodes = nodes.filter(n => toKeep.has(n))
    nodes.forEach(node => {
      node.connections = node.connections.filter(conn => toKeep.has(conn.node))
    })
  }

  return { nodes, rootNode }
}

// Create void starfield - distant thoughts in the abyss
function createStarfield() {
  const count = 6000
  const positions = []
  const colors = []
  const sizes = []

  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.randFloat(60, 180)
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2)

    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )

    // Void-themed colors - muted purples, cyans, occasional white
    const colorChoice = Math.random()
    if (colorChoice < 0.4) {
      // Muted white-blue
      colors.push(0.8, 0.85, 0.95)
    } else if (colorChoice < 0.65) {
      // Soft purple
      colors.push(0.7, 0.5, 0.9)
    } else if (colorChoice < 0.85) {
      // Void cyan
      colors.push(0.4, 0.8, 0.85)
    } else {
      // Rare bright cyan
      colors.push(0.2, 1.0, 0.9)
    }

    sizes.push(THREE.MathUtils.randFloat(0.08, 0.25))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
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
    `,
    fragmentShader: `
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
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  return new THREE.Points(geo, mat)
}

const QuantumNeural = ({ category, experiment }) => {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const composerRef = useRef(null)
  const controlsRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const nodesMeshRef = useRef(null)
  const connectionsMeshRef = useRef(null)
  const neuralNetworkRef = useRef(null)
  const starFieldRef = useRef(null)
  const lastPulseIndexRef = useRef(0)
  const lastAutoPulseRef = useRef(0)
  const pausedRef = useRef(false)
  const pauseStartTimeRef = useRef(0)
  const totalPausedTimeRef = useRef(0)

  const [paused, setPaused] = useState(false)
  const [currentFormation, setCurrentFormation] = useState(3)
  const [density, setDensity] = useState(100)
  const [nodeCount, setNodeCount] = useState(0)

  // Create network visualization
  const createNetworkVisualization = useCallback((formationIndex, densityFactor) => {
    const scene = sceneRef.current
    if (!scene) return

    // Remove old meshes
    if (nodesMeshRef.current) {
      scene.remove(nodesMeshRef.current)
      nodesMeshRef.current.geometry.dispose()
      nodesMeshRef.current.material.dispose()
      nodesMeshRef.current = null
    }
    if (connectionsMeshRef.current) {
      scene.remove(connectionsMeshRef.current)
      connectionsMeshRef.current.geometry.dispose()
      connectionsMeshRef.current.material.dispose()
      connectionsMeshRef.current = null
    }

    const network = generateNeuralNetwork(formationIndex, densityFactor)
    neuralNetworkRef.current = network
    setNodeCount(network.nodes.length)

    const palette = COLOR_PALETTE

    // Create nodes
    const nodesGeometry = new THREE.BufferGeometry()
    const nodePositions = []
    const nodeTypes = []
    const nodeSizes = []
    const nodeColors = []
    const distancesFromRoot = []

    network.nodes.forEach((node) => {
      nodePositions.push(node.position.x, node.position.y, node.position.z)
      nodeTypes.push(node.type)
      nodeSizes.push(node.size)
      distancesFromRoot.push(node.distanceFromRoot)

      const colorIndex = Math.min(node.level, palette.length - 1)
      const baseColor = palette[colorIndex % palette.length].clone()
      baseColor.offsetHSL(
        THREE.MathUtils.randFloatSpread(0.03),
        THREE.MathUtils.randFloatSpread(0.08),
        THREE.MathUtils.randFloatSpread(0.08)
      )
      nodeColors.push(baseColor.r, baseColor.g, baseColor.b)
    })

    nodesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3))
    nodesGeometry.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1))
    nodesGeometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1))
    nodesGeometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3))
    nodesGeometry.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distancesFromRoot, 1))

    const pulseUniforms = {
      uTime: { value: 0.0 },
      uPulsePositions: { value: [
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3),
        new THREE.Vector3(1e3, 1e3, 1e3)
      ]},
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: { value: [
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1),
        new THREE.Color(1, 1, 1)
      ]},
      uPulseSpeed: { value: 18.0 },
      uBaseNodeSize: { value: 0.6 }
    }

    const nodesMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: NODE_SHADER.vertexShader,
      fragmentShader: NODE_SHADER.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial)
    scene.add(nodesMesh)
    nodesMeshRef.current = nodesMesh

    // Create connections
    const connectionsGeometry = new THREE.BufferGeometry()
    const connectionColors = []
    const connectionStrengths = []
    const connectionPositions = []
    const startPoints = []
    const endPoints = []
    const pathIndices = []
    const processedConnections = new Set()
    let pathIndex = 0

    network.nodes.forEach((node, nodeIndex) => {
      node.connections.forEach(connection => {
        const connectedNode = connection.node
        const connectedIndex = network.nodes.indexOf(connectedNode)
        if (connectedIndex === -1) return

        const key = [Math.min(nodeIndex, connectedIndex), Math.max(nodeIndex, connectedIndex)].join('-')
        if (!processedConnections.has(key)) {
          processedConnections.add(key)

          const startPoint = node.position
          const endPoint = connectedNode.position
          const numSegments = 20

          for (let i = 0; i < numSegments; i++) {
            const t = i / (numSegments - 1)
            connectionPositions.push(t, 0, 0)
            startPoints.push(startPoint.x, startPoint.y, startPoint.z)
            endPoints.push(endPoint.x, endPoint.y, endPoint.z)
            pathIndices.push(pathIndex)
            connectionStrengths.push(connection.strength)

            const avgLevel = Math.min(Math.floor((node.level + connectedNode.level) / 2), palette.length - 1)
            const baseColor = palette[avgLevel % palette.length].clone()
            baseColor.offsetHSL(
              THREE.MathUtils.randFloatSpread(0.03),
              THREE.MathUtils.randFloatSpread(0.08),
              THREE.MathUtils.randFloatSpread(0.08)
            )
            connectionColors.push(baseColor.r, baseColor.g, baseColor.b)
          }
          pathIndex++
        }
      })
    })

    connectionsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3))
    connectionsGeometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3))
    connectionsGeometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3))
    connectionsGeometry.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(connectionStrengths, 1))
    connectionsGeometry.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connectionColors, 3))
    connectionsGeometry.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1))

    const connectionsMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(pulseUniforms),
      vertexShader: CONNECTION_SHADER.vertexShader,
      fragmentShader: CONNECTION_SHADER.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const connectionsMesh = new THREE.LineSegments(connectionsGeometry, connectionsMaterial)
    scene.add(connectionsMesh)
    connectionsMeshRef.current = connectionsMesh

    palette.forEach((color, i) => {
      if (i < 3) {
        connectionsMaterial.uniforms.uPulseColors.value[i].copy(color)
        nodesMaterial.uniforms.uPulseColors.value[i].copy(color)
      }
    })
  }, [])

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene - deep void with subtle purple tint
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0512, 0.0025)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000)
    camera.position.set(0, 8, 28)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.6
    controls.minDistance = 8
    controls.maxDistance = 80
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.2
    controls.enablePan = false
    controlsRef.current = controls

    // Post-processing
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.8,
      0.6,
      0.7
    )
    composer.addPass(bloomPass)
    composer.addPass(new OutputPass())
    composerRef.current = composer

    // Starfield
    const starField = createStarfield()
    scene.add(starField)
    starFieldRef.current = starField

    // Create initial network (torus)
    createNetworkVisualization(3, 1.0)

    // Click to send consciousness pulse
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const interactionPoint = new THREE.Vector3()

    const handleClick = (e) => {
      if (pausedRef.current) return

      pointer.x = (e.clientX / width) * 2 - 1
      pointer.y = -(e.clientY / height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      interactionPlane.normal.copy(camera.position).normalize()
      interactionPlane.constant = -interactionPlane.normal.dot(camera.position) + camera.position.length() * 0.5

      if (raycaster.ray.intersectPlane(interactionPlane, interactionPoint)) {
        const time = clockRef.current.getElapsedTime()
        if (nodesMeshRef.current && connectionsMeshRef.current) {
          lastPulseIndexRef.current = (lastPulseIndexRef.current + 1) % 3
          const idx = lastPulseIndexRef.current

          nodesMeshRef.current.material.uniforms.uPulsePositions.value[idx].copy(interactionPoint)
          nodesMeshRef.current.material.uniforms.uPulseTimes.value[idx] = time
          connectionsMeshRef.current.material.uniforms.uPulsePositions.value[idx].copy(interactionPoint)
          connectionsMeshRef.current.material.uniforms.uPulseTimes.value[idx] = time

          const palette = COLOR_PALETTE
          const randomColor = palette[Math.floor(Math.random() * palette.length)]
          nodesMeshRef.current.material.uniforms.uPulseColors.value[idx].copy(randomColor)
          connectionsMeshRef.current.material.uniforms.uPulseColors.value[idx].copy(randomColor)
        }
      }
    }

    renderer.domElement.addEventListener('click', handleClick)

    // Animation loop
    let animationId
    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const rawTime = clockRef.current.getElapsedTime()
      // Effective time accounts for paused duration
      const t = rawTime - totalPausedTimeRef.current

      if (!pausedRef.current) {
        if (nodesMeshRef.current) {
          nodesMeshRef.current.material.uniforms.uTime.value = t
          nodesMeshRef.current.rotation.y = Math.sin(t * 0.03) * 0.08
        }
        if (connectionsMeshRef.current) {
          connectionsMeshRef.current.material.uniforms.uTime.value = t
          connectionsMeshRef.current.rotation.y = Math.sin(t * 0.03) * 0.08
        }

        // Automatic consciousness pulses from the void center
        const autoPulseInterval = 8.0 // seconds between auto-pulses
        if (t - lastAutoPulseRef.current > autoPulseInterval) {
          lastAutoPulseRef.current = t
          if (nodesMeshRef.current && connectionsMeshRef.current) {
            lastPulseIndexRef.current = (lastPulseIndexRef.current + 1) % 3
            const idx = lastPulseIndexRef.current
            // Pulse from center (0,0,0)
            nodesMeshRef.current.material.uniforms.uPulsePositions.value[idx].set(0, 0, 0)
            nodesMeshRef.current.material.uniforms.uPulseTimes.value[idx] = t
            connectionsMeshRef.current.material.uniforms.uPulsePositions.value[idx].set(0, 0, 0)
            connectionsMeshRef.current.material.uniforms.uPulseTimes.value[idx] = t
          }
        }

        if (starField) {
          starField.rotation.y += 0.00015
          starField.material.uniforms.uTime.value = t
        }
      }

      controls.update()
      composer.render()
    }
    animate()

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight

      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      composer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      cancelAnimationFrame(animationId)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [createNetworkVisualization])

  // Handle formation change
  const handleMorph = useCallback(() => {
    const newFormation = (currentFormation + 1) % 5
    setCurrentFormation(newFormation)
    createNetworkVisualization(newFormation, density / 100)

    if (controlsRef.current) {
      controlsRef.current.autoRotate = false
      setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true
      }, 2500)
    }
  }, [currentFormation, density, createNetworkVisualization])

  // Handle pause/play
  const handleTogglePause = useCallback(() => {
    const rawTime = clockRef.current.getElapsedTime()
    setPaused(prev => {
      const newPaused = !prev
      pausedRef.current = newPaused
      if (newPaused) {
        // Starting pause - record when we paused
        pauseStartTimeRef.current = rawTime
      } else {
        // Resuming - add pause duration to total
        totalPausedTimeRef.current += rawTime - pauseStartTimeRef.current
      }
      if (controlsRef.current) {
        controlsRef.current.autoRotate = !newPaused
      }
      return newPaused
    })
  }, [])

  // Handle reset camera
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
      controlsRef.current.autoRotate = false
      setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true
      }, 2000)
    }
  }, [])

  // Handle density change
  const handleDensityChange = useCallback((e) => {
    const newDensity = parseInt(e.target.value, 10)
    setDensity(newDensity)
  }, [])

  const handleDensityChangeComplete = useCallback(() => {
    createNetworkVisualization(currentFormation, density / 100)
  }, [currentFormation, density, createNetworkVisualization])

  const metrics = useMemo(() => [
    { label: 'formation', value: FORMATION_NAMES[currentFormation] },
    { label: 'nodes', value: nodeCount },
    { label: 'density', value: `${density}%` },
    { label: 'state', value: paused ? 'frozen' : 'flowing' }
  ], [currentFormation, nodeCount, density, paused])

  const controls = [
    {
      id: 'morph',
      label: 'morph()',
      onClick: handleMorph
    },
    {
      id: 'pause',
      label: paused ? 'play()' : 'freeze()',
      onClick: handleTogglePause,
      active: paused
    },
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleResetCamera,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ExperimentControls controls={controls} />

          {/* Density slider */}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-void-green/50 font-mono">density:</span>
            <input
              type="range"
              min="30"
              max="100"
              value={density}
              onChange={handleDensityChange}
              onMouseUp={handleDensityChangeComplete}
              onTouchEnd={handleDensityChangeComplete}
              className="w-24 h-1 bg-void-green/20 rounded-lg appearance-none cursor-pointer accent-void-cyan"
              data-testid="density-slider"
            />
            <span className="text-xs text-void-green font-mono w-10">{density}%</span>
          </div>
        </div>

      </div>

      {/* 3D Container */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          data-testid="quantum-neural-container"
        />
      </div>
    </div>
  )
}

export default QuantumNeural
