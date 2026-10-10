// The strategy table in 3D (WebGL2). All computed, no image: the table is a lathe profile, the floor mirrors the table
// (the table is drawn mirrored beneath a semi-transparent floor), space is noise, and the galaxy on the table is
// ~150,000 stars in 3D with differential rotation (inner parts move faster), gas and dust in the disc,
// and six empires as colored star clusters with dashed trade routes.
//   const b = bord3d(canvas);  b(time_seconds, length_seconds)  draws one frame.
function bord3d(cv) {
  const gl = cv.getContext("webgl2", { antialias: true, alpha: false });
  const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, "#version 300 es\nprecision highp float;\n" + src);
    gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p)); return p; };

  // ─── shared: noise, space, galaxy rotation (angular velocity per radius, flat rotation curve) ───
  const RYMD = `
float h3(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float brus(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+1.),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*brus(p);p=p*2.03+7.;a*=.5;}return s;}
float om(float r){return .02/max(r,.12);}                                        // rad/s, inner parts faster
// the hologram floats above the table; the disc has a gentle warp that stays fixed in space while the stars turn through it
float hlyft(float r,float a){return .11+.035*r*r*sin(a-.8);}
vec3 rymd(vec3 d){
 float b=exp(-pow((d.y-.18-.25*sin(atan(d.z,d.x)*1.3+1.))*2.4,2.));            // nebula band
 float n=fbm(d*2.2),m=fbm(d*5.+3.);
 vec3 c=vec3(.006,.004,.02)+b*(pow(n,3.)*vec3(.9,.18,.95)*1.6+pow(m,4.)*vec3(.15,.22,.9)*1.2);
 vec3 q=d*240.,i=floor(q);float h=h3(i);                                        // stars
 c+=pow(max(0.,1.-length(fract(q)-.5-.3*(vec3(h3(i+5.),h3(i+9.),h3(i+13.))-.5))*2.2),12.)*step(.93,h)*mix(vec3(.6,.7,1),vec3(1,.8,.95),h3(i+2.))*3.;
 return c;
}`;

  // ─── the table, disc, floor, railing: one program, material in an attribute ───
  const VS = `in vec3 p,n;in float m;uniform mat4 P,V;uniform float spegel;out vec3 wp,wn;out float wm;
void main(){vec3 q=p,k=n;if(spegel>0.){q.y=-2.-q.y;k.y=-k.y;}wp=q;wn=k;wm=m;gl_Position=P*V*vec4(q,1);}`;
  const FS = RYMD + `in vec3 wp,wn;in float wm;out vec4 o;uniform vec3 oga;uniform float spegel,tid;
vec3 gas(vec2 q){                        // gas and dust in the table top, rotates with the stars (same om)
 float r=length(q),a=atan(q.y,q.x)-om(r)*tid,s=a-3.5*log(max(r,.02)/.1);
 float arm=pow(.5+.5*cos(2.*s),5.),stoft=pow(.5+.5*cos(2.*s-.7),12.);
 vec2 k=r*vec2(cos(a),sin(a));float n=fbm(vec3(k*7.,1)),f=fbm(vec3(k*18.,4));
 vec3 c=vec3(.025,.03,.08)*smoothstep(1.,.1,r)*(.6+n)
   +arm*mix(vec3(.5,.15,.75),vec3(.9,.25,.6),f)*(.25+n*n)*exp(-r*1.1)*1.3
   +vec3(1,.78,.5)*exp(-r*r*90.)*.9+vec3(.9,.45,.75)*exp(-r*r*6.)*.25+vec3(.25,.18,.4)*exp(-r*2.2)*.35;   // faint glow even between the arms
 c*=1.-.75*stoft*smoothstep(.45,.75,n)*smoothstep(.08,.25,r);                    // dark dust lanes
 float ring=smoothstep(.004,0.,abs(fract(r*5.)-.5)-.494)+smoothstep(.003,0.,abs(fract(atan(q.y,q.x)/6.2832*12.)-.5)-.497)*step(.12,r);
 return c+vec3(.15,.45,.6)*ring*.06*smoothstep(.98,.6,r);}                       // the map's faint grid
void main(){
 vec3 N=normalize(wn),v=normalize(oga-wp),r=reflect(-v,N),L=normalize(vec3(0,.6,0)-wp);
 vec3 c;float a=1.;int M=int(wm+.5);
 float fre=pow(1.-max(dot(N,v),0.),4.);
 vec3 glod=vec3(1,.55,.85)*pow(max(dot(N,normalize(L+v)),0.),40.)*1.4/(1.+dot(wp,wp));   // galaxy light in the metal
 if(M==3){c=gas(wp.xz);}
 else if(M==4){                                                                   // floor
   float l=length(wp.xz);vec2 g=abs(fract(wp.xz*.5)-.5);
   c=vec3(.012,.012,.02)+vec3(.05,.1,.16)*smoothstep(.485,.5,max(g.x,g.y))*exp(-l*.25)
     +vec3(.25,.07,.3)*exp(-l*l*.35)*.25;                                       // galaxy glow on the floor
   c+=rymd(reflect(-v,vec3(0,1,0)))*.12;a=.5;}
 else{                                                                            // metal
   float g=M==0?.3:.9,l=length(wp.xz);
   c=rymd(r)*g*(.35+fre)+glod*g+vec3(.02,.02,.03)*max(N.y,0.);
   if(M>0&&M<6)c+=vec3(.55,.3,.75)*g*(.08+.35*smoothstep(-.2,.6,r.y))*(l<1.2?1.:0.)   // galaxy glow in the chrome
     +vec3(1,.95,.9)*pow(max(dot(N,normalize(normalize(vec3(-.5,1,.6))+v)),0.),90.)*g*1.8;  // white highlight
   if(M==2){float s=fract(atan(wp.z,wp.x)/6.2832*14.);                          // cyan slits in the rim
     c+=vec3(.25,.9,1.)*2.5*step(.42,s)*step(s,.56)*smoothstep(.009,.004,abs(wp.y+.05));}
   if(M==6){float s=fract(atan(wp.z,wp.x)/6.2832*60.);                          // railing: amber light
     c=vec3(.01,.01,.016)+rymd(r)*.08+vec3(1.,.6,.2)*1.6*step(.15,s)*step(s,.6)*smoothstep(.014,.006,abs(wp.y+.82));}
 }
 if(spegel>0.)c*=.55;
 o=vec4(c/(1.+c*.35),a);
}`;
  // ─── the stars (points) and trade routes (lines): [radius, angle, height, size/dash] + color ───
  const SV = RYMD + `in vec4 s;in vec3 f;uniform mat4 P,V;uniform float tid,spegel,hojd;out vec3 c;out float k;
void main(){float a=s.y+om(s.x)*tid;vec3 p=vec3(s.x*cos(a),hlyft(s.x,a)+s.z,s.x*sin(a));if(spegel>0.)p.y=-2.-p.y;
 vec4 e=V*vec4(p,1);gl_Position=P*e;
 float px=s.w*hojd/max(-e.z,.05);gl_PointSize=max(px,1.5);                      // size in the world -> pixels
 c=f*min(1.,px*px/2.25)*(spegel>0.?.35:1.);k=s.w;}`;
  const SF = `in vec3 c;in float k;uniform float linje;out vec4 o;
void main(){if(linje>0.){if(fract(k)>.55)discard;o=vec4(c,1);return;}               // dashed trade route
 float l=length(gl_PointCoord-.5)*2.;o=vec4(c*(exp(-l*l*5.)+.5*exp(-l*l*40.)),1);}`;
  const HV = `out vec2 s;void main(){vec2 p=vec2(gl_VertexID&1,gl_VertexID>>1)*4.-1.;s=p;gl_Position=vec4(p,1,1);}`;
  const HF = RYMD + `in vec2 s;out vec4 o;uniform vec3 hx,hy,hz;void main(){vec3 c=rymd(normalize(hz+s.x*hx+s.y*hy));o=vec4(c/(1.+c*.35),1);}`;
  const pB = prog(VS, FS), pH = prog(HV, HF), pS = prog(SV, SF);

  // ─── geometry: the table and railing are lathed, the disc and floor are circles ───
  const PROFIL = [   // [radius, height, material] for the segment to the next point: 1 shiny chrome, 0 dark metal, 2 rim with cyan slits
    [.985, 0, 1], [1.0, .012, 1], [1.045, .012, 1], [1.07, -.006, 2], [1.07, -.1, 1], [1.05, -.12, 0],
    [1.0, -.15, 0], [.9, -.32, 0], [.62, -.44, 1], [.54, -.5, 0], [.5, -.86, 1], [.58, -.93, 0],
    [.66, -.975, 0], [.68, -1, 0]];
  const RACKE = [[7, -1, 6], [7, -.7, 1], [7.06, -.68, 6], [7.4, -.7, 6]];   // low edge around the platform with amber light
  const v = [], SEG = 160;
  const tri = (...p) => p.forEach(x => v.push(...x));
  const svarva = PR => { for (let i = 0; i + 1 < PR.length; i++) {
    const [r0, y0, m] = PR[i], [r1, y1] = PR[i + 1], dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy);
    const nr = -dy / l, ny = dr / l;
    for (let k = 0; k < SEG; k++) {
      const a0 = k / SEG * 6.2832, a1 = (k + 1) / SEG * 6.2832;
      const P = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a), nr * Math.cos(a), ny, nr * Math.sin(a), m];
      tri(P(r0, y0, a0), P(r1, y1, a0), P(r1, y1, a1), P(r0, y0, a0), P(r1, y1, a1), P(r0, y0, a1));
    }
  } };
  const cirkel = (R, y, m) => { for (let k = 0; k < SEG; k++) {
    const a0 = k / SEG * 6.2832, a1 = (k + 1) / SEG * 6.2832, P = (r, a) => [r * Math.cos(a), y, r * Math.sin(a), 0, 1, 0, m];
    tri(P(0, 0), P(R, a1), P(R, a0)); } };
  svarva(PROFIL); const nBord = v.length / 7;
  // the top is fully opaque and runs in under the chrome lip (r .995): no gap at the edge
  cirkel(.995, .001, 3); const nSkiva = v.length / 7 - nBord;
  svarva(RACKE); const nRacke = v.length / 7 - nBord - nSkiva;
  cirkel(7, -1, 4); const nGolv = v.length / 7 - nBord - nSkiva - nRacke;
  const buff = (p, data, attrs) => { const a = gl.createVertexArray(); gl.bindVertexArray(a);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    let o = 0; const st = attrs.reduce((x, [, k]) => x + k, 0) * 4;
    for (const [nm, k] of attrs) { const l = gl.getAttribLocation(p, nm); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, st, o); o += k * 4; }
    return a; };
  const vaoB = buff(pB, v, [["p", 3], ["n", 3], ["m", 1]]);

  // ─── the galaxy: the stars are laid out once (fixed seed, so every lap starts the same) ───
  let fro = 7; const rnd = () => { fro = (fro + 0x6D2B79F5) | 0; let t = Math.imul(fro ^ fro >>> 15, 1 | fro);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
  const blanda = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const st = [], li = [];
  const stjarna = (r, a, y, s, f) => st.push(r, a, y, s, ...f);
  const ARM = r => 3.5 * Math.log(Math.max(r, .02) / .1);                          // logarithmic spiral, ~16° pitch
  for (let i = 0; i < 115000; i++) {                                                // the disc
    const r = -.36 * Math.log(1 - rnd() * (1 - Math.exp(-.96 / .36))), iArm = rnd() < .72 * Math.min(1, Math.max(0, (r - .07) / .2));   // the arms start a bit out
    const a = iArm ? ARM(r) + (rnd() < .5 ? 0 : Math.PI) + gauss() * (.16 + .18 * r) : rnd() * 6.2832;
    const ung = iArm && rnd() < .55, s = .0035 * (1 + Math.pow(rnd(), 9) * 4);
    let f = ung ? blanda([.55, .7, 1], [1, 1, 1], rnd()) : blanda([1, .85, .6], [1, .7, .5], rnd());
    if (iArm && rnd() < .04) f = [1, .35, .7];                                      // star formation (H II), pink
    const b = (ung ? .4 : .2) * (1.05 - .35 * r) * (.15 + .85 * Math.min(1, r / .35));   // dense in the middle: dim
    stjarna(r, a, gauss() * (.006 + .03 * Math.exp(-r * 3)), s, f.map(x => x * b));   // height around the mid-plane, thicker inwards
  }
  for (let i = 0; i < 20000; i++) {                                                 // the bulge: a round core, up and down
    const x = gauss() * .085, z = gauss() * .085, y = gauss() * .055;
    stjarna(Math.hypot(x, z), Math.atan2(z, x), y, .0035, blanda([1, .9, .65], [1, .7, .45], rnd()).map(k => k * .3));
  }
  const IMPERIER = [[.62, .5, [.3, 1, .35]], [.72, 1.6, [1, .25, .2]], [.58, 2.7, [.3, .95, 1]],
                    [.8, 3.8, [1, .8, .25]], [.66, 4.9, [.75, .45, 1]], [.85, 5.8, [.35, .55, 1]]];
  for (const [ir, ia, f] of IMPERIER) {                                             // the empires: cluster + systems + routes
    const cx = ir * Math.cos(ia), cz = ir * Math.sin(ia);
    // systems and cluster stars that land outside the table edge are mirrored back in (no extra random numbers: same galaxy)
    const pol = (x, z) => { const r = Math.hypot(x, z); return [r > .93 ? 1.86 - r : r, Math.atan2(z, x)]; };
    const hc = gauss() * .04;                                                       // the empire's height in the hologram
    for (let i = 0; i < 600; i++) { const [r, a] = pol(cx + gauss() * .075, cz + gauss() * .075); stjarna(r, a, hc + gauss() * .02, .0035, f.map(x => x * .6)); }
    const sys = []; for (let i = 0; i < 7; i++) sys.push([...pol(cx + gauss() * .09, cz + gauss() * .09), hc + gauss() * .05]);
    sys.forEach(([r, a, y]) => stjarna(r, a, y, .022, f.map(x => x * 1.8)));
    sys.forEach(([r, a, y], i) => {                                                 // the trade route: an arc in 12 segments
      const [r2, a2, y2] = sys[(i + 1) % sys.length], p = [r * Math.cos(a), r * Math.sin(a)], q = [r2 * Math.cos(a2), r2 * Math.sin(a2)];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]), lyft = (.008 + .11 * d) * (i % 2 ? -.7 : 1), N = 12;   // every other arc dips down
      const punkt = k => { const u = k / N, x = p[0] + (q[0] - p[0]) * u, z = p[1] + (q[1] - p[1]) * u;
        return [Math.hypot(x, z), Math.atan2(z, x), y + (y2 - y) * u + lyft * 4 * u * (1 - u), d * 90 * u]; };
      for (let k = 0; k < N; k++) li.push(...punkt(k), ...f.map(x => x * .9), ...punkt(k + 1), ...f.map(x => x * .9)); });
  }
  const nSt = st.length / 7, nLi = li.length / 7;
  const vaoS = buff(pS, st, [["s", 4], ["f", 3]]), vaoL = buff(pS, li, [["s", 4], ["f", 3]]);

  const U = (p, n) => gl.getUniformLocation(p, n);
  const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const kors = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => a.map(x => x / Math.hypot(...a));
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const FOV = 30 * Math.PI / 180;

  return (t, langd) => {
    const W = Math.round(cv.clientWidth * devicePixelRatio), H = Math.round(cv.clientHeight * devicePixelRatio);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H);
    const asp = W / H, ty = Math.tan(FOV / 2), tx = ty * asp;
    // camera: starts with the table to the left, 12.7° above, makes one lap and rises toward the center
    const u = sm(0, langd, t), e = sm(0, .25, u);
    const fi = 6.2832 * u, el = (12.7 + 14 * Math.sin(Math.PI * u)) * Math.PI / 180, D = 2.61 + .9 * Math.sin(Math.PI * u);
    const oga = [D * Math.sin(fi) * Math.cos(el), D * Math.sin(el) - .02, D * Math.cos(fi) * Math.cos(el)];
    const hoger = [Math.cos(fi), 0, -Math.sin(fi)];
    const mal = [0, -.02 + .08 * (1 - e), 0].map((x, i) => x + hoger[i] * D * .244 * (1 - e));
    const z = nrm(sub(oga, mal)), x = nrm(kors([0, 1, 0], z)), y = kors(z, x);
    const V = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, oga), -dot(y, oga), -dot(z, oga), 1];
    const nn = .05, ff = 80, P = [1 / tx, 0, 0, 0, 0, 1 / ty, 0, 0, 0, 0, (ff + nn) / (nn - ff), -1, 0, 0, 2 * ff * nn / (nn - ff), 0];

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(pH);                // sky
    gl.uniform3fv(U(pH, "hx"), x.map(k => k * tx)); gl.uniform3fv(U(pH, "hy"), y.map(k => k * ty)); gl.uniform3fv(U(pH, "hz"), z.map(k => -k));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    for (const p of [pB, pS]) { gl.useProgram(p); gl.uniformMatrix4fv(U(p, "P"), false, P); gl.uniformMatrix4fv(U(p, "V"), false, V);
      gl.uniform1f(U(p, "tid"), t); }
    gl.uniform1f(U(pS, "hojd"), H / 2 / ty);
    gl.useProgram(pB); gl.uniform3fv(U(pB, "oga"), oga);
    const yta = (spegel, fran, antal) => { gl.useProgram(pB); gl.bindVertexArray(vaoB); gl.uniform1f(U(pB, "spegel"), spegel); gl.drawArrays(gl.TRIANGLES, fran, antal); };
    const galax = spegel => { gl.useProgram(pS); gl.uniform1f(U(pS, "spegel"), spegel);
      gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      gl.uniform1f(U(pS, "linje"), 1); gl.bindVertexArray(vaoL); gl.drawArrays(gl.LINES, 0, nLi);
      gl.uniform1f(U(pS, "linje"), 0); gl.bindVertexArray(vaoS); gl.drawArrays(gl.POINTS, 0, nSt);
      gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); };
    gl.enable(gl.DEPTH_TEST); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.BLEND);
    yta(1, 0, nBord); yta(1, nBord, nSkiva); yta(1, nBord + nSkiva, nRacke);             // the mirror image under the floor (the stars are not visible there)
    yta(0, nBord + nSkiva + nRacke, nGolv);                                               // the floor (semi-transparent)
    gl.disable(gl.BLEND); yta(0, 0, nBord); yta(0, nBord + nSkiva, nRacke);               // the table, the railing
    gl.enable(gl.BLEND); yta(0, nBord, nSkiva); galax(0);                                 // the disc, the stars
  };
}
