/* Small standalone WebGL pigment field inspired by Shader Gradient.
   No framework or dependency; it only renders while the hero is visible. */
(() => {
  const canvas = document.querySelector('#heroGradient');
  if (!canvas) return;
  // Small touch screens use the CSS pigment field to avoid a fragile GPU context.
  if (matchMedia('(max-width: 760px) and (pointer: coarse)').matches) return;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return; // The CSS background remains visible.

  const vertexSource = `attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
  const fragmentSource = `precision mediump float;
    uniform vec2 resolution;
    uniform float time;
    float field(vec2 uv, vec2 center, float spread) {
      vec2 d = (uv - center) / vec2(spread, spread * .85);
      return exp(-dot(d, d) * 1.65);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      float slow = time * .13;
      vec3 charcoal = vec3(.141, .137, .125);
      vec3 clay = vec3(.285, .198, .161);
      vec3 sand = vec3(.244, .230, .199);
      float a = field(uv, vec2(.72 + .09 * sin(slow), .58 + .13 * cos(slow * .73)), .55);
      float b = field(uv, vec2(.37 + .11 * cos(slow * .6), -.10 + .12 * sin(slow)), .68);
      vec3 color = mix(charcoal, clay, a * .72);
      color = mix(color, sand, b * .27);
      gl_FragColor = vec4(color, 1.0);
    }`;
  const compile = (kind, source) => {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  canvas.classList.add('has-webgl');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'resolution');
  const time = gl.getUniformLocation(program, 'time');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;
  let last = 0;
  const start = performance.now();

  function draw(now) {
    frame = 0;
    if (document.hidden || !visible) return;
    if (now - last < 33 && !reduced.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    last = now;
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, 1.25);
    const width = Math.max(1, Math.round(rect.width * density));
    const height = Math.max(1, Math.round(rect.height * density));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(resolution, width, height);
    gl.uniform1f(time, reduced.matches ? 0 : (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  }
  function update() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden && visible) frame = requestAnimationFrame(draw);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(canvas);
  } else update();
  document.addEventListener('visibilitychange', update);
  if (reduced.addEventListener) reduced.addEventListener('change', update);
  else reduced.addListener(update); // Older mobile Safari.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
  });
})();
