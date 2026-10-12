/*!
 * Gulegul 3D rose — dependency-free WebGL renderer (no three.js, no CDN).
 * Procedural geometry: petals on a golden-angle spiral, sepals, stem, leaves,
 * plus drifting gold dust. ~12k vertices, one program for the flower and one
 * for the dust, so it runs on phones.
 *
 * Patterns borrowed from 21st.dev "Lattice Hero" (bevelui): canvas sized to its
 * container (not the viewport), adaptive quality tiers, pause off-screen,
 * damped pointer parallax, reduced-motion respected, `?t=` pinned frame.
 *
 * Usage: <div class="hero-art" data-rose> <img class="rose-poster" ...> </div>
 */
(function () {
  'use strict';

  var GOLD = Math.PI * (3 - Math.sqrt(5));
  var QUALITY = {
    low:    { petals: 24, nu: 10, nv: 8,  dust: 36, dpr: 1.5 },
    medium: { petals: 32, nu: 14, nv: 11, dust: 60, dpr: 2 },
    high:   { petals: 40, nu: 18, nv: 14, dust: 90, dpr: 2 }
  };

  function pickQuality() {
    var w = Math.min(window.innerWidth, screen.width || 9999);
    var cores = navigator.hardwareConcurrency || 4;
    if (w < 768 || cores <= 4) return 'low';
    if (w < 1280 || cores <= 6) return 'medium';
    return 'high';
  }

  /* ---------------------------------------------------------------- geometry */
  function sm(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  function Mesh() { this.pos = []; this.nrm = []; this.att = []; this.idx = []; this.n = 0; }

  // fn(s,v) -> [x,y,z]; s,v in [0,1]. attrs: [t, kind, seed]
  Mesh.prototype.patch = function (fn, nu, nv, t, kind, seed, closeU) {
    var cols = nu + 1, rows = nv + 1, P = [], i, j;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) P.push(fn(i / nu, j / nv));
    var at = function (a, b) {
      if (closeU) a = (a + nu) % nu; else a = Math.max(0, Math.min(nu, a));
      b = Math.max(0, Math.min(nv, b));
      return P[b * cols + a];
    };
    var base = this.n;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
      var u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], w = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
      var nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
      var l = Math.hypot(nx, ny, nz) || 1, p = P[j * cols + i];
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(nx / l, ny / l, nz / l);
      this.att.push(t, i / nu, j / nv, kind + seed * 0.001); // t, s, v, kind+seed
      this.n++;
    }
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) {
      var q = base + j * cols + i;
      this.idx.push(q, q + 1, q + cols, q + 1, q + cols + 1, q + cols);
    }
  };

  function build(q) {
    var m = new Mesh(), K = q.petals, k;
    for (k = 0; k < K; k++) {
      (function (k) {
        var t = k / (K - 1), phi = k * GOLD, o = Math.pow(t, 1.15);
        var R = 0.16 + 0.8 * Math.pow(t, 0.8);
        var hw = 1.2 - 0.32 * t, y0 = 0.3 - 0.5 * t, H = 0.62 - 0.26 * t;
        var rnd = Math.sin(k * 12.9898) * 0.5 + 0.5;
        m.patch(function (s, v) {
          var x = s * 2 - 1;
          var vv = v * (1 - 0.3 * x * x);
          var wf = 0.5 + 0.5 * Math.sqrt(v);
          var th = phi + x * hw * wf;
          var rho = R * (0.62 + 0.38 * vv) + o * 0.5 * Math.pow(vv, 2.0) + 0.1 * o * x * x * vv;
          rho *= 1 - (1 - o) * 0.38 * vv * vv;                       // inner petals stay closed
          rho += 0.035 * o * Math.sin(x * 5 + k) * Math.pow(vv, 3); // ruffled rim
          var y = y0 + H * Math.sin(vv * 1.35 * (1 - 0.45 * o)) - o * 0.22 * Math.pow(vv, 3)
                + 0.05 * x * x * vv + 0.02 * rnd;
          return [rho * Math.cos(th), y, rho * Math.sin(th)];
        }, q.nu, q.nv, t, 0, rnd * 1000);
      })(k);
    }
    // receptacle cup: fills the gaps between petal layers so no background shows through
    m.patch(function (s, v) {
      var a = s * Math.PI * 2, r = 0.12 + 0.95 * v, y = -0.25 + 0.62 * Math.pow(v, 0.55);
      return [r * Math.cos(a), y, r * Math.sin(a)];
    }, 12, 6, 0.55, 0, 500, true);
    // sepals
    for (k = 0; k < 5; k++) (function (k) {
      var a = k * Math.PI * 2 / 5 + 0.3;
      m.patch(function (s, v) {
        var x = s * 2 - 1, w = 0.16 * Math.sin(Math.PI * Math.pow(v, 0.7)) * x;
        var L = v * 0.95, r = 0.14 + 0.5 * Math.pow(v, 1.4);
        var px = Math.cos(a) * r - Math.sin(a) * w, pz = Math.sin(a) * r + Math.cos(a) * w;
        return [px, -0.22 - 0.18 * Math.sin(v * 1.6) + 0.05 * v, pz];
      }, 4, 6, 1, 1, 0);
    })(k);
    // stem
    m.patch(function (s, v) {
      var a = s * Math.PI * 2, r = 0.055 + 0.01 * v;
      var cy = -0.25 - v * 3.2, cx = 0.18 * Math.sin(v * 2.1), cz = 0.05 * v;
      return [cx + r * Math.cos(a), cy, cz + r * Math.sin(a)];
    }, 10, 14, 1, 1, 0, true);
    // leaves
    [[0.5, -1.7, 1], [3.7, -2.35, 1.15]].forEach(function (c) {
      var a = c[0], by = c[1] + 0.2, sc = c[2];
      m.patch(function (s, v) {
        var x = s * 2 - 1, L = v * 1.0 * sc, w = 0.3 * sc * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.8)), 0.9) * x;
        var dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
        var sx = 0.18 * Math.sin(by * -0.6 * 2.1 * 0.3);
        return [sx + dx * L + px * w, by + 0.55 * L - 0.55 * L * L + 0.06 * Math.abs(x) * v, dz * L + pz * w];
      }, 8, 12, 1, 2, 0);
    });
    return m;
  }

  /* ----------------------------------------------------------------- shaders */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aAtt;',
    'uniform mat4 uVP; uniform mat4 uModel; uniform float uTime;',
    'varying vec3 vN; varying vec3 vW; varying vec4 vAtt;',
    'void main(){',
    '  vec4 w = uModel * vec4(aPos,1.0);',
    '  vW = w.xyz; vN = mat3(uModel) * aNrm; vAtt = aAtt;',
    '  gl_Position = uVP * w;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform vec3 uCam; uniform vec3 uLight;',
    'varying vec3 vN; varying vec3 vW; varying vec4 vAtt;',
    'void main(){',
    '  float t = vAtt.x, s = vAtt.y, v = vAtt.z, kind = floor(vAtt.w + 0.0005);',
    '  float seed = (vAtt.w - kind) * 1000.0;',
    '  vec3 V = normalize(uCam - vW);',
    '  vec3 N = normalize(vN); if (dot(N,V) < 0.0) N = -N;',
    '  vec3 L = normalize(uLight);',
    '  vec3 col; float ao = 1.0; float sheen = 0.0;',
    '  if (kind < 0.5) {',
    '    vec3 deep = vec3(0.50,0.05,0.17), mid = vec3(0.82,0.13,0.31), lite = vec3(0.95,0.50,0.60), edge = vec3(0.99,0.78,0.82);',
    '    col = mix(deep, mid, smoothstep(0.0,0.5,v));',
    '    col = mix(col, lite, smoothstep(0.5,1.0,v) * 0.85);',
    '    col = mix(col, edge, pow(v,7.0) * 0.55);',
    '    col *= 0.62 + 0.38 * smoothstep(0.0, 0.45, t);',
    '    col += 0.035 * sin((s-0.5)*34.0 + seed) * (1.0 - v*0.5);',
    '    ao = mix(0.42,1.0,smoothstep(0.0,0.75,v)) * mix(0.5,1.0,smoothstep(0.0,0.85,t));',
    '    sheen = 0.5;',
    '  } else {',
    '    vec3 g1 = vec3(0.09,0.28,0.12), g2 = vec3(0.30,0.52,0.24);',
    '    col = mix(g1, g2, kind > 1.5 ? v*0.8 : 0.35);',
    '    if (kind > 1.5) col += 0.05 * smoothstep(0.02,0.0,abs(s-0.5));',
    '    ao = 0.75;',
    '  }',
    '  float ndl = dot(N,L);',
    '  float diff = 0.38 + 0.62 * smoothstep(-0.35, 1.0, ndl);',
    '  float back = max(0.0, -dot(N,L)) * 0.22;',
    '  float rim = pow(1.0 - max(dot(N,V),0.0), 2.5);',
    '  vec3 H = normalize(L + V);',
    '  float spec = pow(max(dot(N,H),0.0), 36.0) * 0.16;',
    '  vec3 c = col * diff * ao + col * back + vec3(1.0,0.72,0.78) * rim * 0.20 * sheen + vec3(1.0,0.95,0.9) * spec * ao;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  var DVS = [
    'attribute vec4 aD; uniform mat4 uVP; uniform float uTime; uniform float uPx; varying float vA;',
    'void main(){',
    '  float ph = aD.w;',
    '  float life = fract(uTime * 0.035 + ph);',
    '  vec3 p = aD.xyz;',
    '  p.y += life * 3.2 - 1.2;',
    '  p.x += sin(uTime * 0.6 + ph * 40.0) * 0.18;',
    '  p.z += cos(uTime * 0.5 + ph * 31.0) * 0.18;',
    '  vA = smoothstep(0.0,0.15,life) * smoothstep(1.0,0.7,life);',
    '  gl_Position = uVP * vec4(p,1.0);',
    '  gl_PointSize = uPx * (1.2 + 2.2 * fract(ph * 7.31)) / gl_Position.w;',
    '}'
  ].join('\n');
  var DFS = [
    'precision mediump float; varying float vA;',
    'void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;',
    '  float a = smoothstep(0.5,0.0,r) * vA * 0.85;',
    '  gl_FragColor = vec4(vec3(1.0,0.82,0.45) * a, a); }'
  ].join('\n');

  /* ------------------------------------------------------------------ matrix */
  function persp(fovy, asp, n, f) {
    var t = 1 / Math.tan(fovy / 2), r = 1 / (n - f);
    return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * r, -1, 0, 0, 2 * f * n * r, 0];
  }
  function mul(a, b) {
    var o = new Array(16), i, j, k;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s;
    }
    return o;
  }
  function model(yaw, pitch, roll, ty) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
    // R = Rz * Rx * Ry, then translate (0,ty,0) before rotation (rotate around bloom)
    var ry = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
    var rx = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
    var rz = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    var tr = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, ty, 0, 1];
    return mul(rz, mul(rx, mul(ry, tr)));
  }

  /* -------------------------------------------------------------------- init */
  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function init(host, opts) {
    opts = opts || {};
    var params = new URLSearchParams(location.search);
    var pinned = opts.staticTime != null ? opts.staticTime : (params.has('t') ? parseFloat(params.get('t')) : null);
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var q = QUALITY[opts.quality || params.get('q') || pickQuality()];

    var canvas = document.createElement('canvas');
    canvas.className = 'rose-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' }) ||
           canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('no webgl');
      var prog = program(gl, VS, FS), dprog = program(gl, DVS, DFS);
    } catch (e) {
      host.classList.add('is-fallback');
      return null;
    }

    var mesh = build(q);
    var vbo = gl.createBuffer(), nbo = gl.createBuffer(), abo = gl.createBuffer(), ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.pos), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.nrm), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, abo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.att), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.idx), gl.STATIC_DRAW);

    var dust = [], i, seedR = 7;
    function rnd() { seedR = (seedR * 16807) % 2147483647; return seedR / 2147483647; }
    for (i = 0; i < q.dust; i++) dust.push((rnd() - .5) * 4.2, (rnd() - .5) * 1.5, (rnd() - .5) * 2.4, rnd());
    var dbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dust), gl.STATIC_DRAW);

    var L = {
      aPos: gl.getAttribLocation(prog, 'aPos'), aNrm: gl.getAttribLocation(prog, 'aNrm'), aAtt: gl.getAttribLocation(prog, 'aAtt'),
      uVP: gl.getUniformLocation(prog, 'uVP'), uModel: gl.getUniformLocation(prog, 'uModel'),
      uCam: gl.getUniformLocation(prog, 'uCam'), uLight: gl.getUniformLocation(prog, 'uLight'),
      dD: gl.getAttribLocation(dprog, 'aD'), dVP: gl.getUniformLocation(dprog, 'uVP'),
      dTime: gl.getUniformLocation(dprog, 'uTime'), dPx: gl.getUniformLocation(dprog, 'uPx')
    };

    host.appendChild(canvas);
    var W = 0, H = 0, dpr = 1;
    var tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    var visible = true, raf = 0, last = 0, time = pinned != null ? pinned : 0, ready = false;

    function resize() {
      var r = host.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
      if (w === W && h === H && canvas.width === Math.round(w * dpr)) return;
      W = w; H = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      draw();
    }

    function draw() {
      var asp = W / H, fov = 34 * Math.PI / 180;
      // Fit the whole bloom (radius ~1.5, height ~2) inside the container, any aspect.
      var halfH = 2.0, halfW = 1.9;
      var distH = halfH / Math.tan(fov / 2), distW = halfW / (Math.tan(fov / 2) * asp);
      var dist = Math.max(distH, distW);
      var cam = [0, 0.0, dist];
      var view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -cam[0], -cam[1], -cam[2], 1];
      var vp = mul(persp(fov, asp, 0.1, 40), view);
      var yaw = (pinned != null ? pinned : time) * 0.28 + cur.x * 0.5;
      var m = model(yaw, 0.5 + cur.y * 0.25, -0.1, -0.1);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      gl.useProgram(prog);
      gl.uniformMatrix4fv(L.uVP, false, new Float32Array(vp));
      gl.uniformMatrix4fv(L.uModel, false, new Float32Array(m));
      gl.uniform3f(L.uCam, cam[0], cam[1], cam[2]);
      gl.uniform3f(L.uLight, -0.45, 0.8, 0.55);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.enableVertexAttribArray(L.aPos); gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, nbo); gl.enableVertexAttribArray(L.aNrm); gl.vertexAttribPointer(L.aNrm, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, abo); gl.enableVertexAttribArray(L.aAtt); gl.vertexAttribPointer(L.aAtt, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(L.aNrm); gl.disableVertexAttribArray(L.aAtt);

      gl.useProgram(dprog);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.uniformMatrix4fv(L.dVP, false, new Float32Array(vp));
      gl.uniform1f(L.dTime, time);
      gl.uniform1f(L.dPx, 34 * dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, dbo); gl.enableVertexAttribArray(L.dD); gl.vertexAttribPointer(L.dD, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, q.dust);
      gl.disableVertexAttribArray(L.dD); gl.depthMask(true);

      if (!ready) { ready = true; host.classList.add('is-live'); }
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      time += dt;
      cur.x += (tgt.x - cur.x) * Math.min(1, dt * 2.5);
      cur.y += (tgt.y - cur.y) * Math.min(1, dt * 2.5);
      draw();
      schedule();
    }
    function animated() { return pinned == null && !reduced; }
    function schedule() { if (!raf && visible && !document.hidden && animated()) { raf = requestAnimationFrame(frame); } }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting; if (visible) { last = performance.now(); schedule(); }
    }, { rootMargin: '80px' }).observe(host);
    document.addEventListener('visibilitychange', function () { last = performance.now(); schedule(); });
    if (animated()) window.addEventListener('pointermove', function (e) {
      tgt.x = (e.clientX / window.innerWidth - 0.5) * 2; tgt.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); host.classList.remove('is-live'); host.classList.add('is-fallback'); });

    resize(); draw(); last = performance.now(); schedule();
    return { redraw: draw };
  }

  function boot() {
    var hosts = document.querySelectorAll('[data-rose]');
    for (var i = 0; i < hosts.length; i++) init(hosts[i]);
  }
  window.GulegulRose = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
