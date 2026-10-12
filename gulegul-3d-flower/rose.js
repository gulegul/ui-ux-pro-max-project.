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
    low:    { petals: 28, nu: 12, nv: 10,  dust: 22, dpr: 1.5 },
    medium: { petals: 36, nu: 16, nv: 13, dust: 32, dpr: 2 },
    high:   { petals: 46, nu: 22, nv: 18, dust: 44, dpr: 2 }
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
            var lip = sm(0.7, 1.0, vv);                                   // rolled-back lip
            rho += 0.05 * oo * Math.sin(x * 4.2 + k * 1.7) * Math.pow(vv, 3.5) + 0.2 * oo * lip * lip;
            var y = y0 + H * Math.sin(vv * 1.35 * (1 - 0.45 * oo)) - oo * 0.2 * vv * vv
                  + oo * 0.2 * lip + 0.05 * x * x * vv + 0.02 * rnd
                  + 0.035 * oo * Math.sin(x * 3.1 + k * 2.3) * lip;
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
    'uniform vec3 uCam; uniform vec3 uLight; uniform sampler2D uTex;',
    'varying vec3 vN; varying vec3 vW; varying vec4 vAtt;',
    'void main(){',
    '  float t = vAtt.x, s = vAtt.y, v = vAtt.z, kind = floor(vAtt.w + 0.0005);',
    '  float seed = (vAtt.w - kind) * 1000.0;',
    '  vec3 V = normalize(uCam - vW);',
    '  vec3 N = normalize(vN); if (dot(N,V) < 0.0) N = -N;',
    '  vec3 L = normalize(uLight);',
    '  vec3 col; float ao = 1.0; float sheen = 0.0;',
    '  if (kind < 0.5) {',
    '    vec3 deep = vec3(0.14,0.0,0.02), mid = vec3(0.52,0.02,0.06), lite = vec3(0.66,0.03,0.07), edge = vec3(0.84,0.09,0.12);',
    '    col = mix(deep, mid, smoothstep(0.0,0.45,v));',
    '    col = mix(col, lite, smoothstep(0.45,1.0,v) * 0.8);',
    '    col = mix(col, edge, pow(v,6.0) * 0.55);',
    '    col *= 0.55 + 0.45 * smoothstep(0.0, 0.5, t);',
    '    vec3 tx = texture2D(uTex, vec2(s * 0.8 + seed * 0.37, v * 0.8 + seed * 0.11)).rgb;',
    '    col = mix(col, tx * vec3(1.05,0.9,0.9), 0.62);',
    '    ao = mix(0.30,1.0,smoothstep(0.0,0.7,v)) * mix(0.42,1.0,smoothstep(0.0,0.9,t));',
    '    sheen = 1.0;',
    '  } else {',
    '    vec3 g1 = vec3(0.04,0.15,0.06), g2 = vec3(0.16,0.36,0.14);',
    '    col = mix(g1, g2, kind > 1.5 ? v*0.8 : 0.35);',
    '    if (kind > 1.5) col += 0.04 * smoothstep(0.02,0.0,abs(s-0.5));',
    '    ao = 0.8;',
    '  }',
    '  float ndl = dot(N,L);',
    '  float diff = 0.30 + 0.70 * smoothstep(-0.4, 1.0, ndl);',
    '  float back = max(0.0, -dot(N,L)) * 0.28;',
    '  float ndv = max(dot(N,V),0.0);',
    '  float rim = pow(1.0 - ndv, 3.0);',
    '  vec3 H = normalize(L + V);',
    '  float spec = pow(max(dot(N,H),0.0), 28.0) * 0.12;',
    '  vec3 c = col * diff * ao + col * back + vec3(0.75,0.05,0.10) * rim * 0.38 * sheen * (0.4 + 0.6 * ao) + vec3(1.0,0.82,0.8) * spec * ao * sheen;',
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
    '  vC = mix(vec3(0.50,0.02,0.07), vec3(0.86,0.12,0.18), fract(ph * 5.1));',
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
      aPos: gl.getAttribLocation(prog, 'aPos'), aNrm: gl.getAttribLocation(prog, 'aNrm'), aAtt: gl.getAttribLocation(prog, 'aAtt'), aPos2: gl.getAttribLocation(prog, 'aPos2'), aNrm2: gl.getAttribLocation(prog, 'aNrm2'), uBloom: gl.getUniformLocation(prog, 'uBloom'), uTex: gl.getUniformLocation(prog, 'uTex'),
      uVP: gl.getUniformLocation(prog, 'uVP'), uModel: gl.getUniformLocation(prog, 'uModel'),
      uCam: gl.getUniformLocation(prog, 'uCam'), uLight: gl.getUniformLocation(prog, 'uLight'),
      dD: gl.getAttribLocation(dprog, 'aD'), dVP: gl.getUniformLocation(dprog, 'uVP'),
      dTime: gl.getUniformLocation(dprog, 'uTime'), dPx: gl.getUniformLocation(dprog, 'uPx')
    };

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([120, 8, 20, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var timg = new Image();
    timg.onload = function () {   // real petal photo (velvet grain + dew) mapped on every 3D petal
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, timg);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      if (typeof draw === 'function') draw();
    };
    timg.src = 'data:image/jpeg;base64,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';

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
      var halfH = 2.15, halfW = 2.1;
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
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(L.uTex, 0);
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
  // Optional footage: <div data-rose data-video="rose-bloom"> (loads rose-bloom.webm / .mp4). Plays once muted: bud blooms, then holds the open rose.
  // If the file is missing or cannot play, the 3D rose is used instead.
  function tryVideo(host) {
    var v = document.createElement('video'), done = false, base = host.getAttribute('data-video');
    v.className = 'rose-video'; v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('aria-hidden', 'true');
    ['webm', 'mp4'].forEach(function (ext) {
      var src = document.createElement('source'); src.src = base + '.' + ext; src.type = 'video/' + ext;
      v.appendChild(src);
    });
    var fallback = function () { if (!done) { done = true; init(host); } };
    v.lastElementChild.addEventListener('error', fallback, { once: true });   // no source could be loaded
    v.addEventListener('error', fallback, { once: true });
    v.addEventListener('canplaythrough', function () {
      if (done) return; done = true;
      host.appendChild(v); host.classList.add('is-live', 'is-video');
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { v.currentTime = 3.9; }
      else { var p = v.play(); if (p && p.catch) p.catch(function () { v.currentTime = 3.9; }); }
    }, { once: true });
    setTimeout(fallback, 5000);   // slow or unsupported: use the 3D rose
    v.load();
  }

  function boot() {
    var hosts = document.querySelectorAll('[data-rose]');
    var go = function () { for (var i = 0; i < hosts.length; i++) { if (hosts[i].hasAttribute('data-video')) tryVideo(hosts[i]); else init(hosts[i]); } };
    var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 250); })(go); };
    var q = new URLSearchParams(location.search);
    if (q.has('t') || q.has('b')) go();   // pinned frames (screenshots) start immediately
    else if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle);
  }
  window.GulegulRose = { init: init };
  boot();
})();
