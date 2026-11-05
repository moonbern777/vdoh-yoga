// The one sun behind the whole page. A small fragment shader: a sky gradient, a soft
// disc that breathes, its glow, and film grain so the gradients do not band.
// At night the same shader draws a moon and stars.
const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uSize, uSun;
uniform float uTime, uBreath, uRadius, uGlow, uNight, uDepth;
out vec4 color;

// A hash without sine: sine-based ones draw visible lines at large screen coordinates.
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6. - 15.) + 10.);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// Layers of noise, each turned so the square grid underneath never lines up.
float fbm(vec2 p) {
  const mat2 turn = mat2(.8, .6, -.6, .8);
  float sum = 0., amount = .5;
  for (int i = 0; i < 5; i++) {
    sum += amount * noise(p);
    p = turn * p * 2.03 + 11.7;
    amount *= .5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  uv.y = 1. - uv.y;
  float aspect = uSize.x / uSize.y;
  vec2 p = vec2((uv.x - uSun.x) * aspect, uv.y - uSun.y);
  float r = length(p);
  float angle = atan(p.y, p.x);

  // the edge is never a perfect circle, and it drifts very slowly
  float wobble = .022 * sin(angle * 3. + uTime * .22) + .014 * sin(angle * 5. - uTime * .17) + .009 * sin(angle * 2. + uTime * .31);
  float radius = uRadius * (1. + uBreath * .24) * (1. + wobble);

  float core = 1. - smoothstep(radius * .1, radius, r);
  float halo = exp(-pow(r / (radius * 1.75), 2.) * 1.5);

  // day
  vec3 skyHigh = vec3(.984, .961, .933);
  vec3 skyLow = vec3(.953, .925, .969);
  vec3 sky = mix(skyHigh, skyLow, uv.y * .5 + uDepth * .5);
  vec3 day = mix(sky, vec3(.957, .714, .878), halo * .62 * uGlow);
  day = mix(day, vec3(1., .478, .365), smoothstep(.02, .55, core) * uGlow);
  day = mix(day, vec3(1., .745, .4), smoothstep(.42, 1., core) * uGlow);

  // night
  vec3 nightSky = mix(vec3(.059, .047, .118), vec3(.102, .078, .2), uv.y * .5 + uDepth * .5);
  vec2 starCell = floor(gl_FragCoord.xy / 3.);
  float starSeed = hash(starCell);
  float stars = step(.9985, starSeed) * (.5 + .5 * sin(uTime * 1.1 + starSeed * 900.));
  vec3 night = nightSky + stars * .8;
  float moonRadius = uRadius * (1. + uBreath * .24) * .66; // the moon stays round, only the sun wobbles
  float disc = 1. - smoothstep(moonRadius - .004, moonRadius + .004, r);
  // soft grey seas, and a little fine texture so the disc does not look airbrushed
  float seas = fbm(p * 7. + 3.);
  float dust = fbm(p * 42.);
  vec3 moon = mix(vec3(.95, .92, .84), vec3(.74, .72, .75), smoothstep(.43, .62, seas));
  moon *= .95 + .1 * dust;
  // lit from the upper left, falling off towards the opposite edge
  moon *= .8 + .2 * (1. - smoothstep(0., moonRadius * 1.6, length(p - vec2(-moonRadius * .42, -moonRadius * .42))));
  float nightHalo = exp(-pow(r / (moonRadius * 2.1), 2.) * 1.3);
  night = mix(night, vec3(.5, .45, .78), nightHalo * .42 * uGlow);
  night = mix(night, moon, disc * uGlow);

  vec3 result = mix(day, night, uNight);
  result += (hash(gl_FragCoord.xy * .73) - .5) * .045;
  color = vec4(result, 1.);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export function createSky(canvas, { still = false } = {}) {
  // `intro` scales the sun up as the page opens. `focus` takes it to the middle of the screen
  // for the breathing minute. Both sit on top of the scroll path, so nothing fights over it.
  const state = { breath: .2, x: .7, y: .41, radius: .36, glow: 1, night: 0, depth: 0, intro: 1, focus: 0, focusRadius: .4 };
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: still });
  if (!gl) return { state, redraw() {}, ok: false };

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return { state, redraw() {}, ok: false };
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'position');
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(['uSize', 'uSun', 'uTime', 'uBreath', 'uRadius', 'uGlow', 'uNight', 'uDepth'].map(name => [name, gl.getUniformLocation(program, name)]));

  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, matchMedia('(max-width: 960px)').matches ? 1 : 1.25);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    draw();
  }

  function draw(seconds = performance.now() / 1000) {
    gl.uniform2f(uniforms.uSize, canvas.width, canvas.height);
    const mix = (a, b) => a + (b - a) * state.focus;
    gl.uniform2f(uniforms.uSun, mix(state.x, .5), mix(state.y, .5));
    gl.uniform1f(uniforms.uTime, seconds);
    gl.uniform1f(uniforms.uBreath, state.breath);
    gl.uniform1f(uniforms.uRadius, mix(state.radius, state.focusRadius) * state.intro);
    gl.uniform1f(uniforms.uGlow, mix(state.glow, 1) * state.intro);
    gl.uniform1f(uniforms.uNight, state.night);
    gl.uniform1f(uniforms.uDepth, state.depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  // Thirty frames a second is plenty for something this slow, and easier on batteries.
  if (!still) {
    let last = 0;
    const loop = now => {
      requestAnimationFrame(loop);
      if (document.hidden || now - last < 32) return;
      last = now;
      draw(now / 1000);
    };
    requestAnimationFrame(loop);
  }

  return { state, redraw: draw, ok: true };
}
