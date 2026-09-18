import * as THREE from 'three'
import {
  backgroundVertex,
  backgroundFragment,
  planeVertex,
  planeFragment,
} from './shaders.js'
import { createProjectTexture } from './textures.js'

const CAMERA_Z = 600

/**
 * Stage owns the WebGL renderer, the ambient background and one plane per
 * project. Planes are positioned in screen space so they track their hidden
 * `.project-media` DOM placeholder each frame — this is what makes the
 * horizontal scroll and the case-study transition feel like one continuous
 * surface.
 */
export class Stage {
  constructor(canvas, projects) {
    this.canvas = canvas
    this.projects = projects
    this.clock = new THREE.Clock()
    this.planes = []
    this.transition = null

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 10, 2000)
    this.camera.position.z = CAMERA_Z

    this.createBackground()
    this.createPlanes()
    this.resize()
  }

  createBackground() {
    const colorA = new THREE.Color(this.projects[0].colors[0])
    const colorB = new THREE.Color(this.projects[0].colors[1])

    this.bgUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
    }

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: backgroundVertex,
        fragmentShader: backgroundFragment,
        uniforms: this.bgUniforms,
        depthTest: false,
        depthWrite: false,
      })
    )
    bg.renderOrder = -1
    bg.frustumCulled = false
    this.scene.add(bg)
  }

  createPlanes() {
    const geometry = new THREE.PlaneGeometry(1, 1, 32, 32)

    this.projects.forEach((project, i) => {
      const { texture, dataUrl } = createProjectTexture(
        project.colors[0],
        project.colors[1],
        i * 7 + 1
      )

      const material = new THREE.ShaderMaterial({
        vertexShader: planeVertex,
        fragmentShader: planeFragment,
        uniforms: {
          uMap: { value: texture },
          uVelocity: { value: 0 },
          uHover: { value: 0 },
          uOpacity: { value: 1 },
        },
        transparent: true,
      })

      const mesh = new THREE.Mesh(geometry, material)
      this.scene.add(mesh)

      this.planes.push({
        mesh,
        material,
        project,
        dataUrl,
        el: null, // bound later to the DOM placeholder
        hoverTarget: 0,
      })
    })
  }

  bindPlaneElements(elements) {
    this.planes.forEach((plane, i) => {
      plane.el = elements[i]
    })
  }

  /** Converts a DOM rect to world units at z = 0 for our camera setup. */
  rectToWorld(rect) {
    const w = window.innerWidth
    const h = window.innerHeight
    return {
      x: rect.left + rect.width / 2 - w / 2,
      y: -(rect.top + rect.height / 2 - h / 2),
      width: rect.width,
      height: rect.height,
    }
  }

  setHover(index, hovered) {
    const plane = this.planes[index]
    if (plane) plane.hoverTarget = hovered ? 1 : 0
  }

  /**
   * Animates a project plane from its current rect to a target rect
   * (the case-study hero). Returns a promise resolving when done.
   */
  transitionTo(index, targetRect, duration = 900) {
    const plane = this.planes[index]
    if (!plane || !plane.el) return Promise.resolve()

    const from = this.rectToWorld(plane.el.getBoundingClientRect())
    const to = this.rectToWorld(targetRect)

    return new Promise((resolve) => {
      this.transition = {
        plane,
        from,
        to,
        start: performance.now(),
        duration,
        resolve,
        reverse: false,
      }
    })
  }

  /** Reverses a transition back to the plane's DOM placeholder. */
  transitionBack(index, duration = 700) {
    const plane = this.planes[index]
    if (!plane || !plane.el || !this.transition) return Promise.resolve()

    const from = this.transition.to
    const to = this.rectToWorld(plane.el.getBoundingClientRect())

    return new Promise((resolve) => {
      this.transition = {
        plane,
        from,
        to,
        start: performance.now(),
        duration,
        resolve,
        reverse: true,
      }
    })
  }

  clearTransition() {
    this.transition = null
  }

  update(scrollProgress, velocity) {
    const elapsed = this.clock.getElapsedTime()
    this.bgUniforms.uTime.value = elapsed
    this.bgUniforms.uScroll.value = scrollProgress

    // Blend background hues toward the nearest project's palette
    const t = scrollProgress * (this.projects.length - 1)
    const i = Math.min(Math.floor(t), this.projects.length - 2)
    const mix = Math.min(Math.max(t - i, 0), 1)
    const a = this.projects[Math.max(i, 0)]
    const b = this.projects[Math.min(i + 1, this.projects.length - 1)]
    this.bgUniforms.uColorA.value
      .set(a.colors[0])
      .lerp(new THREE.Color(b.colors[0]), mix)
    this.bgUniforms.uColorB.value
      .set(a.colors[1])
      .lerp(new THREE.Color(b.colors[1]), mix)

    for (const plane of this.planes) {
      const u = plane.material.uniforms
      u.uVelocity.value += (velocity - u.uVelocity.value) * 0.1
      u.uHover.value += (plane.hoverTarget - u.uHover.value) * 0.08

      const isTransitioning =
        this.transition && this.transition.plane === plane

      if (isTransitioning) {
        const { from, to, start, duration, resolve } = this.transition
        const raw = Math.min((performance.now() - start) / duration, 1)
        const e = easeInOutQuint(raw)
        const x = from.x + (to.x - from.x) * e
        const y = from.y + (to.y - from.y) * e
        const w = from.width + (to.width - from.width) * e
        const h = from.height + (to.height - from.height) * e
        plane.mesh.position.set(x, y, 1)
        plane.mesh.scale.set(w, h, 1)
        if (raw >= 1 && resolve) {
          this.transition.resolve = null
          resolve()
        }
      } else if (plane.el) {
        const rect = plane.el.getBoundingClientRect()
        const world = this.rectToWorld(rect)
        plane.mesh.position.set(world.x, world.y, 0)
        plane.mesh.scale.set(world.width, world.height, 1)
        plane.mesh.visible =
          rect.right > -rect.width && rect.left < window.innerWidth + rect.width
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    // Match world units to CSS pixels at z = 0
    this.camera.fov = 2 * Math.atan(h / 2 / CAMERA_Z) * (180 / Math.PI)
    this.camera.updateProjectionMatrix()
  }
}

function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}
