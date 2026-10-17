"use client";

import { useEffect, useRef } from "react";

/**
 * Export globe for the home quality & export band: a satellite-textured, lit earth (WebGL) that
 * swings from Agra to the active export region and draws the route, with the routes, markers
 * and labels on a 2D canvas over it. Without WebGL (or until the texture has loaded) the sphere
 * is drawn as a wireframe instead.
 */

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Agra — where every route starts. */
const ORIGIN: [number, number] = [27.18, 78.01];
/** An indicative point inside each export region, used only to draw its route on the globe. */
const PLACES: Record<string, [number, number]> = {
  "Indian sub-continent": [23.7, 90.4],
  "Middle East": [24.5, 54.4],
  "Far East Asia": [14.6, 121],
  Australia: [-25.3, 133.8],
  Africa: [-1.3, 36.8],
  Europe: [48.8, 9.2],
  "The Americas": [-12, -62],
};

/**
 * Satellite texture: NASA Visible Earth, "Blue Marble: Land Surface, Shallow Water, and Shaded
 * Topography" (public domain) — equirectangular, 2048×1024.
 */
const EARTH_TEXTURE = "/images/earth/blue-marble-2048.jpg";
/** Sphere radius as a fraction of half the canvas (shared by the earth and the overlay). */
const GLOBE_R = 0.86;

type Vec = [number, number, number];
const RAD = Math.PI / 180;
const toVec = (lat: number, lon: number): Vec => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const toLatLon = (v: Vec): [number, number] => [Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD, Math.atan2(v[1], v[0]) / RAD];
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Points along the great circle from a to b, each with a lift that peaks mid-route. */
function route(a: [number, number], b: [number, number], steps = 72) {
  const va = toVec(...a);
  const vb = toVec(...b);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  const s = Math.sin(w) || 1;
  const lift = Math.min(0.42, 0.08 + w * 0.22);
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps;
    const ka = Math.sin((1 - t) * w) / s;
    const kb = Math.sin(t * w) / s;
    const [lat, lon] = toLatLon([va[0] * ka + vb[0] * kb, va[1] * ka + vb[1] * kb, va[2] * ka + vb[2] * kb]);
    return { lat, lon, h: Math.sin(Math.PI * t) * lift };
  });
}

/* ------------------------------------------------------------------ */
/* Earth (WebGL)                                                       */
/* ------------------------------------------------------------------ */

const EARTH_VS = "attribute vec2 a; varying vec2 v; void main() { v = a; gl_Position = vec4(a, 0.0, 1.0); }";

// Orthographic sphere, same projection as the overlay: each pixel is turned back into
// latitude/longitude and looked up in the equirectangular texture.
const EARTH_FS = `
precision highp float;
varying vec2 v;
uniform sampler2D tex;
uniform float lon0;
uniform float lat0;
uniform float r;
uniform float aa;
const float PI = 3.141592653589793;
const vec3 AIR = vec3(0.50, 0.64, 0.88);
void main() {
  vec3 light = normalize(vec3(-0.44, 0.36, 0.82));
  vec2 p = v / r;
  float d = length(p);
  // Atmosphere halo just outside the disc.
  float halo = exp(-max(d - 1.0, 0.0) * 22.0) * 0.4 * smoothstep(1.0 - aa, 1.0 + aa, d);
  if (d > 1.0 + aa) {
    gl_FragColor = vec4(AIR * halo, halo);
    return;
  }
  float z = sqrt(max(1.0 - d * d, 0.0));
  vec3 n = vec3(p, z);
  float sp = sin(lat0);
  float cp = cos(lat0);
  float phi = asin(clamp(p.y * cp + z * sp, -1.0, 1.0));
  float lam = atan(p.x, z * cp - p.y * sp) + lon0;
  vec2 uv = vec2(fract((lam + PI) / (2.0 * PI)), (0.5 * PI - phi) / PI);
  vec3 col = texture2D(tex, uv).rgb;
  // A touch less saturation so the earth sits in the palette.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.9);
  // Light from the upper left, a soft terminator, and a glint on the water.
  float diff = max(dot(n, light), 0.0);
  float water = smoothstep(0.24, 0.12, max(col.r, col.g)) * step(col.g, col.b);
  vec3 h = normalize(light + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, h), 0.0), 40.0) * 0.32 * water;
  col = col * (0.22 + 0.95 * diff) + spec;
  // Atmosphere toward the limb.
  col = mix(col, AIR, pow(1.0 - z, 2.4) * 0.5);
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  gl_FragColor = vec4(col * edge + AIR * halo * (1.0 - edge), max(edge, halo));
}`;

type Earth = { render: (lon0: number, lat0: number) => void; resize: () => void; ready: () => boolean; dispose: () => void };

/** Sets up the textured sphere on `canvas`; null when WebGL isn't available. */
function createEarth(canvas: HTMLCanvasElement, onReady: () => void): Earth | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = shader(gl.VERTEX_SHADER, EARTH_VS);
  const fs = shader(gl.FRAGMENT_SHADER, EARTH_FS);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uLon = gl.getUniformLocation(prog, "lon0");
  const uLat = gl.getUniformLocation(prog, "lat0");
  const uAa = gl.getUniformLocation(prog, "aa");
  gl.uniform1f(gl.getUniformLocation(prog, "r"), GLOBE_R);

  const tex = gl.createTexture();
  let loaded = false;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    // No mipmaps: they would show a seam where the longitude wraps around.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    loaded = true;
    onReady();
  };
  img.src = EARTH_TEXTURE;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.width = px;
    canvas.height = px;
    gl.viewport(0, 0, px, px);
    gl.uniform1f(uAa, 1.5 / (GLOBE_R * px * 0.5));
  };
  resize();

  return {
    ready: () => loaded,
    resize,
    render: (lon0, lat0) => {
      if (!loaded) return;
      gl.uniform1f(uLon, lon0 * RAD);
      gl.uniform1f(uLat, lat0 * RAD);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose: () => {
      img.onload = null;
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Globe                                                               */
/* ------------------------------------------------------------------ */

export function ExportGlobe({ regions, active, running }: { regions: readonly string[]; active: number; running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earthCanvasRef = useRef<HTMLCanvasElement>(null);
  const earth = useRef<Earth | null>(null);
  const redraw = useRef<() => void>(() => {});
  const state = useRef({ active, since: 0, lon0: 0, lat0: 16, init: false });

  // The textured earth is set up once; the overlay below redraws it every frame.
  useEffect(() => {
    const c = earthCanvasRef.current;
    const e = c ? createEarth(c, () => redraw.current()) : null;
    earth.current = e;
    return () => {
      e?.dispose();
      earth.current = null;
    };
  }, []);

  useEffect(() => {
    state.current.active = active;
    state.current.since = performance.now();
    redraw.current(); // still frames (reduced motion, off screen) follow the active region too
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = reducedMotion();
    const font = getComputedStyle(canvas).fontFamily;
    const dests = regions.map((r) => PLACES[r] ?? ORIGIN);
    const routes = dests.map((d) => route(ORIGIN, d));
    const s = state.current;
    let size = 0;
    let dpr = 1;
    let last = performance.now();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      earth.current?.resize();
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (still || !running) draw(performance.now());
    });
    ro.observe(canvas);

    const targetLon = (i: number) => ORIGIN[1] + wrap(dests[i][1] - ORIGIN[1]) / 2;
    if (!s.init) {
      s.lon0 = targetLon(s.active);
      s.init = true;
    }

    function draw(now: number) {
      const dt = Math.min(64, now - last);
      last = now;
      const R = size * (GLOBE_R / 2);
      const cx = size / 2;
      const cy = size / 2;
      // Swing toward the active route.
      const goal = targetLon(s.active) + (still ? 0 : Math.sin(now / 5200) * 6);
      s.lon0 += wrap(goal - s.lon0) * (still ? 1 : 1 - Math.pow(0.0018, dt / 1000));
      const textured = !!earth.current?.ready();
      earth.current?.render(s.lon0, s.lat0);

      const p0 = s.lat0 * RAD;
      const sinP0 = Math.sin(p0);
      const cosP0 = Math.cos(p0);
      const project = (lat: number, lon: number, h = 0) => {
        const p = lat * RAD;
        const l = (lon - s.lon0) * RAD;
        const cosP = Math.cos(p);
        const x = cosP * Math.sin(l);
        const y = cosP0 * Math.sin(p) - sinP0 * cosP * Math.cos(l);
        const z = sinP0 * Math.sin(p) + cosP0 * cosP * Math.cos(l);
        const k = 1 + h;
        const visible = z > 0 || (x * x + y * y) * k * k > 1;
        return { x: cx + R * x * k, y: cy - R * y * k, z, visible };
      };

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, size, size);

      // Wireframe sphere, until (or unless) the satellite earth is there
      if (!textured) {
        const g = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
        g.addColorStop(0, "rgba(226, 199, 174, 0.12)");
        g.addColorStop(1, "rgba(153, 111, 81, 0.05)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(cx, cy, R, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = "rgba(247, 239, 232, 0.3)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Graticule (front side only): a faint survey grid over the earth
      const line = (pts: { x: number; y: number; z: number }[]) => {
        let pen = false;
        ctx!.beginPath();
        for (const pt of pts) {
          if (pt.z > 0) {
            if (pen) ctx!.lineTo(pt.x, pt.y);
            else ctx!.moveTo(pt.x, pt.y);
            pen = true;
          } else pen = false;
        }
        ctx!.stroke();
      };
      const grid = textured ? 0.07 : 0.1;
      ctx!.lineWidth = 0.75;
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx!.strokeStyle = `rgba(247, 239, 232, ${lat === 0 ? grid * 2 : grid})`;
        line(Array.from({ length: 121 }, (_, k) => project(lat, -180 + k * 3)));
      }
      ctx!.strokeStyle = `rgba(247, 239, 232, ${grid})`;
      for (let lon = -180; lon < 180; lon += 20) line(Array.from({ length: 61 }, (_, k) => project(-90 + k * 3, lon)));

      // Routes
      const t = (now - s.since) / 1000;
      // The active route may arc out past the edge of the earth; the others stay on its face.
      const drawRoute = (i: number, upto: number, color: string, width: number, faceOnly = false) => {
        const pts = routes[i];
        const n = Math.max(1, Math.floor(upto * (pts.length - 1)));
        ctx!.strokeStyle = color;
        ctx!.lineWidth = width;
        let pen = false;
        ctx!.beginPath();
        for (let k = 0; k <= n; k++) {
          const pt = project(pts[k].lat, pts[k].lon, pts[k].h);
          if (faceOnly ? pt.z > 0 : pt.visible) {
            if (pen) ctx!.lineTo(pt.x, pt.y);
            else ctx!.moveTo(pt.x, pt.y);
            pen = true;
          } else pen = false;
        }
        ctx!.stroke();
      };
      routes.forEach((_, i) => i !== s.active && drawRoute(i, 1, "rgba(247, 239, 232, 0.26)", 1, true));
      const grow = still ? 1 : Math.min(1, t / 1.2);
      const eased = 1 - Math.pow(1 - grow, 3);
      ctx!.shadowColor = "rgba(242, 196, 143, 0.65)";
      ctx!.shadowBlur = 8;
      drawRoute(s.active, eased, "#f2c48f", 2);
      ctx!.shadowBlur = 0;

      // Travelling pulse along the active route
      if (!still && grow >= 1) {
        const u = ((t - 1.2) % 1.6) / 1.6;
        const pts = routes[s.active];
        const q = pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];
        const pt = project(q.lat, q.lon, q.h);
        if (pt.visible) {
          ctx!.shadowColor = "rgba(255, 236, 210, 0.9)";
          ctx!.shadowBlur = 10;
          ctx!.fillStyle = "#fff7ee";
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, 2.8, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      }

      // Markers and labels sit on a soft dark edge so they read over land and sea alike
      const fontSize = Math.max(10, size * 0.026);
      const label = (text: string, x: number, y: number, align: CanvasTextAlign, color: string) => {
        ctx!.font = `500 ${fontSize}px ${font}`;
        ctx!.textAlign = align;
        ctx!.textBaseline = "middle";
        ctx!.shadowColor = "rgba(20, 8, 2, 0.95)";
        ctx!.shadowBlur = 6;
        ctx!.fillStyle = color;
        ctx!.fillText(text, x, y);
        ctx!.shadowBlur = 0;
      };
      const dot = (x: number, y: number, r: number, fill: string) => {
        ctx!.beginPath();
        ctx!.arc(x, y, r + 1.2, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(20, 8, 2, 0.55)";
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fillStyle = fill;
        ctx!.fill();
      };

      // Destinations
      dests.forEach((d, i) => {
        const pt = project(d[0], d[1]);
        if (!pt.visible) return;
        const on = i === s.active;
        dot(pt.x, pt.y, on ? 3.6 : 2.2, on ? "#fff7ee" : "rgba(247, 239, 232, 0.7)");
        if (on && eased >= 1) {
          const text = regions[i].toUpperCase();
          ctx!.font = `500 ${fontSize}px ${font}`;
          const right = pt.x + 10 + ctx!.measureText(text).width < size - 4;
          label(text, right ? pt.x + 10 : pt.x - 10, pt.y, right ? "left" : "right", "#fff7ee");
        }
      });

      // Agra, with a slow pulse
      const o = project(ORIGIN[0], ORIGIN[1]);
      if (o.visible) {
        const pulse = still ? 0 : (now / 1800) % 1;
        ctx!.strokeStyle = `rgba(242, 196, 143, ${0.8 * (1 - pulse)})`;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        ctx!.arc(o.x, o.y, 4 + pulse * 14, 0, Math.PI * 2);
        ctx!.stroke();
        dot(o.x, o.y, 4.2, "#f2c48f");
        label("AGRA", o.x - 11, o.y, "right", "#f6dcc0");
      }
    }

    redraw.current = () => draw(performance.now());
    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    if (still || !running) draw(performance.now());
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      redraw.current = () => {};
    };
  }, [regions, running]);

  return (
    <div aria-hidden className="relative h-full w-full">
      <canvas ref={earthCanvasRef} className="absolute inset-0 block h-full w-full" />
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full font-mono" />
    </div>
  );
}
