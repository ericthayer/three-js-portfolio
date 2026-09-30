export const backgroundVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

export const backgroundFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  // Simplex-ish value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.05;

    float n = noise(uv * 2.2 + vec2(t + uScroll * 0.6, t * 0.7));
    n += 0.5 * noise(uv * 5.0 - vec2(t * 0.6, uScroll * 0.4));
    n *= 0.66;

    vec3 base = vec3(0.055, 0.055, 0.063);
    vec3 glow = mix(uColorA, uColorB, uv.y + 0.25 * sin(uScroll * 3.14));
    vec3 color = base + glow * n * 0.16;

    // gentle vignette
    float d = distance(uv, vec2(0.5));
    color *= 1.0 - d * 0.55;

    gl_FragColor = vec4(color, 1.0);
  }
`

export const planeVertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uVelocity;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Scroll-velocity bend, strongest at plane center
    float bend = sin(uv.x * 3.141592) * uVelocity;
    pos.y += bend * 0.035;
    pos.z += abs(bend) * 0.02;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

export const planeFragment = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uVelocity;
  uniform float uHover;
  uniform float uOpacity;

  void main() {
    vec2 uv = vUv;

    // subtle zoom on hover
    uv = (uv - 0.5) * (1.0 - uHover * 0.05) + 0.5;

    // velocity-based RGB shift
    float shift = uVelocity * 0.004;
    float r = texture2D(uMap, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uMap, uv).g;
    float b = texture2D(uMap, uv - vec2(shift, 0.0)).b;

    gl_FragColor = vec4(r, g, b, uOpacity);
  }
`
