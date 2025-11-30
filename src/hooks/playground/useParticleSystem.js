import { useRef, useCallback } from 'react'

/**
 * Default particle class - experiments can extend or replace
 */
export class Particle {
  constructor(x, y, options = {}) {
    this.x = x
    this.y = y
    this.vx = options.vx ?? (Math.random() - 0.5) * 2
    this.vy = options.vy ?? (Math.random() - 0.5) * 2
    this.radius = options.radius ?? Math.random() * 2 + 1
    this.mass = options.mass ?? this.radius
    this.hue = options.hue ?? Math.random() * 60 + 180
    this.age = 0
    this.connections = 0
    this.life = options.life ?? Infinity
  }

  update(config) {
    this.age++
    this.connections = 0

    // Apply velocity
    this.x += this.vx
    this.y += this.vy

    // Friction
    this.vx *= config.friction
    this.vy *= config.friction

    // Boundary handling
    if (config.boundaryMode === 'wrap') {
      if (this.x < 0) this.x = config.width
      if (this.x > config.width) this.x = 0
      if (this.y < 0) this.y = config.height
      if (this.y > config.height) this.y = 0
    } else if (config.boundaryMode === 'bounce') {
      if (this.x < 0 || this.x > config.width) this.vx *= -1
      if (this.y < 0 || this.y > config.height) this.vy *= -1
    }
  }

  draw(ctx) {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 4
    )
    const saturation = 70 + this.connections * 5
    gradient.addColorStop(0, `hsla(${this.hue}, ${saturation}%, 70%, 0.8)`)
    gradient.addColorStop(0.3, `hsla(${this.hue}, ${saturation}%, 50%, 0.3)`)
    gradient.addColorStop(1, 'transparent')

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 4, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${this.hue}, ${saturation}%, 80%, 1)`
    ctx.fill()
  }

  isDead() {
    return this.age > this.life || this.radius < 0.1
  }
}

/**
 * Physics force functions
 */
export const forces = {
  attract: (particle, target, strength = 0.3) => {
    const dx = target.x - particle.x
    const dy = target.y - particle.y
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq)

    if (dist > 10) {
      const force = (strength * particle.mass) / (distSq * 0.01)
      particle.vx += (dx / dist) * force
      particle.vy += (dy / dist) * force
    }
  },

  repel: (particle, target, strength = 0.5) => {
    const dx = particle.x - target.x
    const dy = particle.y - target.y
    const distSq = dx * dx + dy * dy
    const dist = Math.sqrt(distSq)

    if (dist < 200 && dist > 0) {
      const force = (strength * particle.mass) / (distSq * 0.001)
      particle.vx += (dx / dist) * force
      particle.vy += (dy / dist) * force
    }
  },

  orbit: (particle, center, strength = 0.02) => {
    const dx = center.x - particle.x
    const dy = center.y - particle.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 10) {
      const tangentX = -dy / dist
      const tangentY = dx / dist

      particle.vx += tangentX * strength * dist * 0.01
      particle.vy += tangentY * strength * dist * 0.01
      particle.vx += (dx / dist) * strength * 0.5
      particle.vy += (dy / dist) * strength * 0.5
    }
  },

  vortex: (particle, center, strength = 0.015) => {
    const dx = center.x - particle.x
    const dy = center.y - particle.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 10) {
      const angle = Math.atan2(dy, dx)
      const spiralAngle = angle + Math.PI / 4
      const force = strength * dist * 0.1

      particle.vx += Math.cos(spiralAngle) * force
      particle.vy += Math.sin(spiralAngle) * force
    }
  }
}

/**
 * Hook for managing particle systems
 * @param {Object} options - Configuration options
 * @returns {Object} Particle system controls
 */
export const useParticleSystem = (options = {}) => {
  const {
    maxParticles = 300,
    friction = 0.98,
    boundaryMode = 'wrap',
    connectionDistance = 100,
    ParticleClass = Particle
  } = options

  const particlesRef = useRef([])
  const configRef = useRef({
    friction,
    boundaryMode,
    connectionDistance,
    width: 0,
    height: 0
  })

  const setDimensions = useCallback((width, height) => {
    configRef.current.width = width
    configRef.current.height = height
  }, [])

  const spawn = useCallback((x, y, particleOptions = {}) => {
    if (particlesRef.current.length < maxParticles) {
      const particle = new ParticleClass(x, y, particleOptions)
      particlesRef.current.push(particle)
      return particle
    }
    return null
  }, [maxParticles, ParticleClass])

  const spawnBurst = useCallback((x, y, count = 10, particleOptions = {}) => {
    const spawned = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 2 + Math.random() * 2
      const particle = spawn(x, y, {
        ...particleOptions,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      })
      if (particle) spawned.push(particle)
    }
    return spawned
  }, [spawn])

  const clear = useCallback(() => {
    particlesRef.current = []
  }, [])

  const update = useCallback(() => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.update(configRef.current)
      return !p.isDead()
    })
  }, [])

  const applyForce = useCallback((forceType, target, strength) => {
    const forceFn = forces[forceType]
    if (forceFn) {
      particlesRef.current.forEach(p => forceFn(p, target, strength))
    }
  }, [])

  const draw = useCallback((ctx) => {
    particlesRef.current.forEach(p => p.draw(ctx))
  }, [])

  const drawConnections = useCallback((ctx, maxDistance = connectionDistance) => {
    const particles = particlesRef.current
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.1)'
    ctx.lineWidth = 0.5

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < maxDistance) {
          particles[i].connections++
          particles[j].connections++
          const alpha = 1 - dist / maxDistance
          ctx.strokeStyle = `rgba(102, 255, 204, ${alpha * 0.3})`
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
  }, [connectionDistance])

  return {
    particles: particlesRef.current,
    particlesRef,
    spawn,
    spawnBurst,
    clear,
    update,
    applyForce,
    draw,
    drawConnections,
    setDimensions,
    forces
  }
}

export default useParticleSystem
