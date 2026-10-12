/*!
 * Gulegul 3D rose — dependency-free WebGL renderer (no three.js, no CDN).
 * Procedural geometry: petals on a golden-angle spiral, sepals, stem, leaves,
 * plus a shower of falling rose petals. ~12k vertices, one program for the flower and one
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
    low:    { petals: 24, nu: 10, nv: 8,  dust: 22, dpr: 1.5 },
    medium: { petals: 32, nu: 14, nv: 11, dust: 32, dpr: 2 },
    high:   { petals: 40, nu: 18, nv: 14, dust: 44, dpr: 2 }
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

  function Mesh() { this.pos = []; this.nrm = []; this.pos2 = []; this.nrm2 = []; this.att = []; this.idx = []; this.n = 0; }

  function grid(fn, nu, nv) {
    var P = [], i, j;
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) P.push(fn(i / nu, j / nv));
    return P;
  }
  function normalAt(P, nu, nv, i, j, closeU) {
    var cols = nu + 1;
    var at = function (a, b) {
      if (closeU) a = (a + nu) % nu; else a = Math.max(0, Math.min(nu, a));
      b = Math.max(0, Math.min(nv, b));
      return P[b * cols + a];
    };
    var a = at(i + 1, j), b = at(i - 1, j), c = at(i, j + 1), d = at(i, j - 1);
    var u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], w = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    var nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
    var l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  }

  // fn(s,v) = open shape; fn2(s,v) = closed (bud) shape, defaults to fn. attrs: [t, s, v, kind+seed]
  Mesh.prototype.patch = function (fn, nu, nv, t, kind, seed, closeU, fn2) {
    var P = grid(fn, nu, nv), P2 = fn2 ? grid(fn2, nu, nv) : P, i, j, cols = nu + 1, base = this.n;
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) {
      var p = P[j * cols + i], p2 = P2[j * cols + i];
      var n1 = normalAt(P, nu, nv, i, j, closeU), n2 = fn2 ? normalAt(P2, nu, nv, i, j, closeU) : n1;
      this.pos.push(p[0], p[1], p[2]); this.nrm.push(n1[0], n1[1], n1[2]);
      this.pos2.push(p2[0], p2[1], p2[2]); this.nrm2.push(n2[0], n2[1], n2[2]);
      this.att.push(t, i / nu, j / nv, kind + seed * 0.001);
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
        var rnd = Math.sin(k * 12.9898) * 0.5 + 0.5;
        function shape(closed) {
          var R = closed ? 0.1 + 0.3 * Math.pow(t, 0.8) : 0.16 + 0.8 * Math.pow(t, 0.8);
          var hw = (closed ? 1.45 : 1.2) - 0.32 * t;
          var y0 = closed ? 0.2 - 0.1 * t : 0.3 - 0.5 * t;
          var H = closed ? 0.95 - 0.04 * t : 0.62 - 0.26 * t;
          var oo = closed ? 0 : o;
          return function (s, v) {
            var x = s * 2 - 1;
            var vv = v * (1 - 0.3 * x * x);
            var wf = 0.5 + 0.5 * Math.sqrt(v);
            var th = phi + x * hw * wf;
            var rho = R * (0.62 + 0.38 * vv) + oo * 0.5 * Math.pow(vv, 2.0) + 0.1 * oo * x * x * vv;
            rho *= 1 - (1 - oo) * (closed ? 0.8 : 0.38) * vv * vv;       // petals close over the top
            rho += 0.035 * oo * Math.sin(x * 5 + k) * Math.pow(vv, 3);   // ruffled rim
            var y = y0 + H * Math.sin(vv * 1.35 * (1 - 0.45 * oo)) - oo * 0.22 * Math.pow(vv, 3)
                  + 0.05 * x * x * vv + 0.02 * rnd;
            return [rho * Math.cos(th), y, rho * Math.sin(th)];
          };
        }
        m.patch(shape(false), q.nu, q.nv, t, 0, rnd * 1000, false, shape(true));
      })(k);
    }
    // receptacle cup: fills the gaps between petal layers so no background shows through
    m.patch(function (s, v) {
      var a = s * Math.PI * 2, r = 0.12 + 0.95 * v, y = -0.25 + 0.62 * Math.pow(v, 0.55);
      return [r * Math.cos(a), y, r * Math.sin(a)];
    }, 12, 6, 0.55, 0, 500, true, function (s, v) {
      var a = s * Math.PI * 2, r = 0.08 + 0.3 * v, y = -0.25 + 0.7 * Math.pow(v, 0.6);
      return [r * Math.cos(a), y, r * Math.sin(a)];
    });
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
    'attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aPos2; attribute vec3 aNrm2; attribute vec4 aAtt;',
    'uniform mat4 uVP; uniform mat4 uModel; uniform float uTime; uniform float uBloom;',
    'varying vec3 vN; varying vec3 vW; varying vec4 vAtt;',
    'void main(){',
    '  float x = clamp(uBloom * 1.7 - (1.0 - aAtt.x) * 0.7, 0.0, 1.0); float pr = aAtt.w < 0.999 ? (1.0 + 2.1 * (x - 1.0) * (x - 1.0) * (x - 1.0) + 1.1 * (x - 1.0) * (x - 1.0)) : 1.0;',
    '  vec3 lp = mix(aPos2, aPos, pr); vec3 ln = normalize(mix(aNrm2, aNrm, pr));',
    '  vec4 w = uModel * vec4(lp,1.0);',
    '  vW = w.xyz; vN = mat3(uModel) * ln; vAtt = aAtt;',
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

  // Falling rose petals (same colours as the flower). One shower during the bloom, then they are gone.
  var DVS = [
    'attribute vec4 aD; uniform mat4 uVP; uniform float uTime; uniform float uPx; varying float vA; varying float vRot; varying vec3 vC;',
    'void main(){',
    '  float ph = aD.w;',
    '  float delay = fract(ph * 13.7) * 1.3;',
    '  float dur = 2.6 + fract(ph * 7.3) * 1.5;',
    '  float p = clamp((uTime - delay) / dur, 0.0, 1.0);',
    '  vec3 q = aD.xyz;',
    '  q.y = 2.0 - p * 3.9 + aD.y * 0.25;',
    '  q.x += sin(p * 6.0 + ph * 40.0) * 0.28;',
    '  q.z += cos(p * 5.0 + ph * 31.0) * 0.2;',
    '  vA = (p <= 0.0 || p >= 1.0) ? 0.0 : smoothstep(0.0, 0.08, p) * smoothstep(1.0, 0.85, p);',
    '  vRot = p * 7.0 + ph * 20.0;',
    '  vC = mix(vec3(0.78,0.10,0.27), vec3(0.96,0.52,0.62), fract(ph * 5.1));',
    '  gl_Position = uVP * vec4(q,1.0);',
    '  gl_PointSize = uPx * (0.7 + 0.8 * fract(ph * 3.7)) / gl_Position.w;',
    '}'
  ].join('\n');
  var DFS = [
    'precision mediump float; varying float vA; varying float vRot; varying vec3 vC;',
    'void main(){',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float cs = cos(vRot), sn = sin(vRot);',
    '  vec2 r = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);',
    '  float d = (r.x * r.x) / (0.2 * 0.2) + (r.y * r.y) / (0.46 * 0.46);',
    '  if (d > 1.0 || vA <= 0.0) discard;',
    '  float shade = 0.75 + 0.35 * (r.y + 0.5);',
    '  gl_FragColor = vec4(vC * shade * vA, vA);',
    '}'
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
    var v2 = gl.createBuffer(), n2 = gl.createBuffer(), vbo = gl.createBuffer(), nbo = gl.createBuffer(), abo = gl.createBuffer(), ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.pos), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.nrm), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, v2); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.pos2), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, n2); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.nrm2), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, abo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.att), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.idx), gl.STATIC_DRAW);

    var dust = [], i, seedR = 7;
    function rnd() { seedR = (seedR * 16807) % 2147483647; return seedR / 2147483647; }
    for (i = 0; i < q.dust; i++) dust.push((rnd() - .5) * 3.6, (rnd() - .5) * 1.5, (rnd() - .5) * 2.0, rnd());
    var dbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dust), gl.STATIC_DRAW);

    var L = {
      aPos: gl.getAttribLocation(prog, 'aPos'), aNrm: gl.getAttribLocation(prog, 'aNrm'), aAtt: gl.getAttribLocation(prog, 'aAtt'), aPos2: gl.getAttribLocation(prog, 'aPos2'), aNrm2: gl.getAttribLocation(prog, 'aNrm2'), uBloom: gl.getUniformLocation(prog, 'uBloom'),
      uVP: gl.getUniformLocation(prog, 'uVP'), uModel: gl.getUniformLocation(prog, 'uModel'),
      uCam: gl.getUniformLocation(prog, 'uCam'), uLight: gl.getUniformLocation(prog, 'uLight'),
      dD: gl.getAttribLocation(dprog, 'aD'), dVP: gl.getUniformLocation(dprog, 'uVP'),
      dTime: gl.getUniformLocation(dprog, 'uTime'), dPx: gl.getUniformLocation(dprog, 'uPx')
    };

    host.appendChild(canvas);
    var W = 0, H = 0, dpr = 1;
    var tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    // Bloom: 0 = closed bud, 1 = open. Plays once on load; tap/click the rose to replay.
    var BLOOM_S = 2.4, DELAY_S = 0.6, STOP_S = 5.8;   // bloom takes 2.2s, then everything settles and stops
    var fixedBloom = params.has('b') ? parseFloat(params.get('b')) : ((pinned != null || reduced) ? 1 : null);
    function bloom() {
      if (fixedBloom != null) return fixedBloom;
      var p = Math.min(1, Math.max(0, (time - DELAY_S) / BLOOM_S));
      return p;   // linear; each petal eases itself in the shader (staggered, slight overshoot)
    }
    function settled() { return time >= STOP_S && Math.abs(tgt.x - cur.x) < 0.002 && Math.abs(tgt.y - cur.y) < 0.002; }
    host.addEventListener('click', function () { if (fixedBloom == null) { time = 0; last = performance.now(); schedule(); } });
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
      var yaw = (pinned != null ? pinned * 0.28 : 0.28 * STOP_S * (1 - Math.pow(1 - Math.min(time, STOP_S) / STOP_S, 2))) + cur.x * 0.5;
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
      gl.bindBuffer(gl.ARRAY_BUFFER, v2); gl.enableVertexAttribArray(L.aPos2); gl.vertexAttribPointer(L.aPos2, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, n2); gl.enableVertexAttribArray(L.aNrm2); gl.vertexAttribPointer(L.aNrm2, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(L.uBloom, bloom());
      gl.bindBuffer(gl.ARRAY_BUFFER, abo); gl.enableVertexAttribArray(L.aAtt); gl.vertexAttribPointer(L.aAtt, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(L.aNrm); gl.disableVertexAttribArray(L.aAtt); gl.disableVertexAttribArray(L.aPos2); gl.disableVertexAttribArray(L.aNrm2);

      gl.useProgram(dprog);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.uniformMatrix4fv(L.dVP, false, new Float32Array(vp));
      gl.uniform1f(L.dTime, pinned != null ? pinned : Math.min(time, STOP_S));
      gl.uniform1f(L.dPx, 190 * dpr);
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
      if (!settled()) schedule();
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
      last = performance.now(); schedule();
    }, { passive: true });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); host.classList.remove('is-live'); host.classList.add('is-fallback'); });

    resize(); draw(); last = performance.now(); schedule();
    return { redraw: draw };
  }

  // Start after the page has loaded and the browser is idle, so the poster (bud) is on screen first
  // and the bloom plays as a reveal a moment later.
  function boot() {
    var hosts = document.querySelectorAll('[data-rose]');
    var go = function () { for (var i = 0; i < hosts.length; i++) init(hosts[i]); };
    var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 250); })(go); };
    var q = new URLSearchParams(location.search);
    if (q.has('t') || q.has('b')) go();   // pinned frames (screenshots) start immediately
    else if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle);
  }
  window.GulegulRose = { init: init };
  boot();
})();
