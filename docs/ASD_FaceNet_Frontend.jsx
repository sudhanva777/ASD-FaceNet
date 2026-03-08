import { useState, useEffect, useRef } from "react";

/* ══════════════════ GLOBAL STYLES ══════════════════ */
const injectStyles = () => {
  if (document.querySelector("[data-asd-v2]")) return;
  const s = document.createElement("style");
  s.setAttribute("data-asd-v2", "");
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #060a10; font-family: 'Outfit', sans-serif; color: #e0e7ef; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1e3a4a; border-radius: 10px; }
    input:focus, textarea:focus, button:focus { outline: none; }
    @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
    @keyframes glow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideUp { from { opacity:0; transform:translateY(30px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes rotate { to { transform: rotate(360deg); } }
    @keyframes blob { 0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } 50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; } }
    @keyframes scan-line { 0% { top: -10%; } 100% { top: 110%; } }
    @keyframes border-glow { 0%,100% { border-color: rgba(0,240,200,0.15); } 50% { border-color: rgba(0,240,200,0.35); } }
    .fi { animation: fadeIn 0.5s ease both; }
    .fi1 { animation: fadeIn 0.5s ease 0.08s both; }
    .fi2 { animation: fadeIn 0.5s ease 0.16s both; }
    .fi3 { animation: fadeIn 0.5s ease 0.24s both; }
    .fi4 { animation: fadeIn 0.5s ease 0.32s both; }
    .fi5 { animation: fadeIn 0.5s ease 0.40s both; }
    .su { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
    .su1 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
    .su2 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
    .su3 { animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
  `;
  document.head.appendChild(s);
};

const T = {
  bg: "#060a10", card: "rgba(10,18,28,0.7)", glass: "rgba(10,22,34,0.55)",
  border: "rgba(0,240,200,0.1)", borderActive: "rgba(0,240,200,0.4)",
  glow: "#00f0c8", glowDim: "rgba(0,240,200,0.15)", glowSoft: "rgba(0,240,200,0.06)",
  cyan: "#00f0c8", cyanDark: "#00b896", blue: "#3b82f6",
  asd: "#ffb020", asdGlow: "rgba(255,176,32,0.2)", td: "#00e09e", tdGlow: "rgba(0,224,158,0.2)",
  danger: "#ff4466", text: "#e0e7ef", textSec: "#8899aa", textDim: "#556677",
  mono: "'Fira Code', monospace",
};

/* ══════ PARTICLES ══════ */
const NeuralBG = () => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); let w, h, pts = [], frame;
    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    for (let i = 0; i < 45; i++) pts.push({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, r:Math.random()*2+0.5, a:Math.random()*0.5+0.2 });
    const draw = () => {
      ctx.clearRect(0,0,w,h);
      for (let p of pts) { p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(0,240,200,${p.a})`; ctx.fill(); }
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) { const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy); if(d<140){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(0,240,200,${0.07*(1-d/140)})`;ctx.lineWidth=0.5;ctx.stroke();}}
      frame = requestAnimationFrame(draw);
    }; draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
};

const Blob = ({color=T.glow,size=300,top,left,right,bottom,delay=0}) => (
  <div style={{position:"absolute",width:size,height:size,top,left,right,bottom,background:`radial-gradient(circle,${color}18 0%,transparent 70%)`,borderRadius:"60% 40% 30% 70%/60% 30% 70% 40%",animation:`blob 12s ease-in-out ${delay}s infinite`,filter:"blur(40px)",pointerEvents:"none",zIndex:0}}/>
);

const Glass = ({children,style,className="",glow=false}) => (
  <div className={className} style={{background:T.glass,backdropFilter:"blur(20px) saturate(1.4)",WebkitBackdropFilter:"blur(20px) saturate(1.4)",border:`1px solid ${glow?T.borderActive:T.border}`,borderRadius:20,transition:"all 0.35s",boxShadow:glow?`0 0 40px ${T.glowDim},inset 0 1px 0 rgba(255,255,255,0.05)`:"0 8px 32px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.03)",...style}}>{children}</div>
);

/* ══════ ICONS ══════ */
const I = ({n,s=20,c="currentColor"}) => {
  const d = {
    brain:<><path d="M9.5 2a6.5 6.5 0 0 0-3.17 12.2A3.5 3.5 0 0 0 4 17.5 3.5 3.5 0 0 0 7.5 21h9a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-2.33-3.3A6.5 6.5 0 0 0 14.5 2" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M12 2v19" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" opacity="0.4"/></>,
    upload:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></>,
    clock:<><circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth="1.5"/><polyline points="12 6 12 12 16 14" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    bar:<><line x1="18" y1="20" x2="18" y2="10" stroke={c} strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke={c} strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke={c} strokeWidth="2" strokeLinecap="round"/></>,
    out:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><polyline points="16 17 21 12 16 7" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></>,
    user:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="7" r="4" fill="none" stroke={c} strokeWidth="1.5"/></>,
    mail:<><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke={c} strokeWidth="1.5"/><polyline points="22,6 12,13 2,6" fill="none" stroke={c} strokeWidth="1.5"/></>,
    lock:<><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={c} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={c} strokeWidth="1.5"/></>,
    warn:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke={c} strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="17" r="0.5" fill={c}/></>,
    check:<polyline points="20 6 9 17 4 12" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    arrow:<><line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    scan:<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="4" fill="none" stroke={c} strokeWidth="1.5"/></>,
    download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></>,
    eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke={c} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke={c} strokeWidth="1.5"/></>,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{flexShrink:0}}>{d[n]}</svg>;
};

/* ══════ BUTTON ══════ */
const Btn = ({children,onClick,v="primary",disabled,full,style:sx}) => {
  const [h,setH] = useState(false);
  const base = {padding:"11px 22px",borderRadius:12,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:"'Outfit'",fontWeight:600,fontSize:14,display:"inline-flex",alignItems:"center",gap:8,transition:"all 0.3s",width:full?"100%":"auto",justifyContent:"center",opacity:disabled?0.4:1};
  const vs = {
    primary:{background:h&&!disabled?`linear-gradient(135deg,${T.cyan},${T.cyanDark})`:`linear-gradient(135deg,${T.cyanDark},#008a6e)`,color:"#021a14",boxShadow:h&&!disabled?`0 6px 30px ${T.glowDim}`:"0 2px 10px rgba(0,0,0,0.3)"},
    ghost:{background:h?"rgba(0,240,200,0.08)":"transparent",color:T.textSec,border:`1px solid ${h?T.borderActive:T.border}`},
  };
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{...base,...vs[v],...sx}}>{children}</button>;
};

/* ══════ INPUT ══════ */
const Inp = ({label,icon,type="text",value,onChange,placeholder,error}) => {
  const [f,setF] = useState(false);
  return (
    <div style={{marginBottom:18}}>
      {label && <label style={{fontSize:12,fontWeight:500,color:T.textSec,marginBottom:7,display:"block",letterSpacing:0.5}}>{label}</label>}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderRadius:12,border:`1.5px solid ${error?T.danger:f?T.borderActive:T.border}`,background:f?"rgba(0,240,200,0.03)":"rgba(6,10,16,0.6)",transition:"all 0.3s",boxShadow:f?`0 0 20px ${T.glowSoft}`:"none"}}>
        {icon && <I n={icon} s={17} c={f?T.cyan:T.textDim}/>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{flex:1,border:"none",background:"transparent",color:T.text,fontSize:14,fontFamily:"'Outfit'"}}/>
      </div>
      {error && <p style={{fontSize:11,color:T.danger,marginTop:5,fontWeight:500}}>{error}</p>}
    </div>
  );
};

const Disclaimer = () => (
  <Glass style={{padding:"14px 18px",marginBottom:24,display:"flex",gap:12,alignItems:"flex-start",border:"1px solid rgba(255,176,32,0.15)",background:"rgba(255,176,32,0.04)"}}>
    <I n="warn" s={18} c={T.asd}/>
    <p style={{fontSize:12,color:"#ccaa55",lineHeight:1.6}}><strong style={{color:T.asd}}>Research Prototype.</strong> ASD-FaceNet is NOT a medical device. Results must be interpreted by qualified professionals with ADOS-2/ADI-R protocols.</p>
  </Glass>
);

const Ring = ({value,label}) => {
  const color = label==="ASD"?T.asd:T.td;
  const pct = Math.round(value*100), rad=64, circ=2*Math.PI*rad;
  return (
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative",width:160,height:160,margin:"0 auto"}}>
        <svg viewBox="0 0 160 160" style={{transform:"rotate(-90deg)"}}>
          <circle cx="80" cy="80" r={rad} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
          <circle cx="80" cy="80" r={rad} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1)",filter:`drop-shadow(0 0 8px ${color}88)`}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:36,fontWeight:800,color,fontFamily:T.mono,textShadow:`0 0 20px ${color}44`}}>{pct}<span style={{fontSize:18}}>%</span></span>
          <span style={{fontSize:10,color:T.textDim,fontWeight:500,letterSpacing:1.5,textTransform:"uppercase"}}>Confidence</span>
        </div>
      </div>
    </div>
  );
};

const Stat = ({label,value,color,icon,delay=""}) => (
  <Glass className={delay} style={{padding:"22px 20px",flex:"1 1 180px",minWidth:155,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,background:`radial-gradient(circle,${color||T.glow}15 0%,transparent 70%)`,borderRadius:"50%"}}/>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      {icon && <I n={icon} s={15} c={color||T.textDim}/>}
      <p style={{fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>{label}</p>
    </div>
    <p style={{fontSize:30,fontWeight:800,color:color||T.text,fontFamily:T.mono,textShadow:color?`0 0 20px ${color}33`:"none"}}>{value}</p>
  </Glass>
);

const Spinner = ({size=20}) => <div style={{width:size,height:size,border:"2px solid rgba(0,0,0,0.15)",borderTopColor:T.bg,borderRadius:"50%",animation:"rotate 0.6s linear infinite"}}/>;

const HIST = [
  {id:"pred_001",label:"ASD",asd_probability:0.8723,confidence:0.8723,ms:1847,ver:"v1.0.0",at:"2026-03-07T10:35:22Z"},
  {id:"pred_002",label:"TD",asd_probability:0.1245,confidence:0.8755,ms:1623,ver:"v1.0.0",at:"2026-03-06T14:22:10Z"},
  {id:"pred_003",label:"ASD",asd_probability:0.9102,confidence:0.9102,ms:1945,ver:"v1.0.0",at:"2026-03-05T09:11:33Z"},
  {id:"pred_004",label:"TD",asd_probability:0.0834,confidence:0.9166,ms:1502,ver:"v1.0.0",at:"2026-03-04T16:45:09Z"},
  {id:"pred_005",label:"ASD",asd_probability:0.7891,confidence:0.7891,ms:2011,ver:"v1.0.0",at:"2026-03-03T11:30:55Z"},
  {id:"pred_006",label:"TD",asd_probability:0.2134,confidence:0.7866,ms:1701,ver:"v1.0.0",at:"2026-03-02T08:15:44Z"},
];

/* ═══════ LOGIN ═══════ */
const LoginPage = ({onLogin,onSwitch}) => {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [err,setErr]=useState({}); const [ld,setLd]=useState(false);
  const go = () => {
    const e={}; if(!email)e.email="Required"; if(!pass)e.pass="Required";
    if(Object.keys(e).length) return setErr(e);
    setLd(true); setTimeout(()=>{setLd(false);onLogin({name:"Sudhanva",email,role:"clinician"});},1400);
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <NeuralBG/><Blob color={T.glow} size={400} top="-10%" left="-5%"/><Blob color="#3b82f6" size={350} bottom="-10%" right="-5%" delay={3}/>
      <div style={{width:"100%",maxWidth:420,padding:20,position:"relative",zIndex:2}}>
        <div className="fi" style={{textAlign:"center",marginBottom:44}}>
          <div style={{width:72,height:72,borderRadius:22,margin:"0 auto 18px",background:`linear-gradient(135deg,${T.cyan}22,${T.blue}22)`,border:`1.5px solid ${T.borderActive}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 50px ${T.glowDim}`,animation:"float 4s ease-in-out infinite"}}>
            <I n="brain" s={36} c={T.cyan}/>
          </div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:-1,background:`linear-gradient(135deg,${T.cyan},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ASD-FaceNet</h1>
          <p style={{color:T.textDim,fontSize:13,marginTop:6}}>Deep Learning ASD Detection from Facial Images</p>
        </div>
        <Glass className="fi1" style={{padding:36}} glow>
          <h2 style={{fontSize:22,fontWeight:700,marginBottom:4}}>Welcome back</h2>
          <p style={{color:T.textDim,fontSize:13,marginBottom:28}}>Sign in to continue to your dashboard</p>
          <Inp label="EMAIL" icon="mail" type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr(p=>({...p,email:null}));}} placeholder="you@example.com" error={err.email}/>
          <Inp label="PASSWORD" icon="lock" type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr(p=>({...p,pass:null}));}} placeholder="Enter password" error={err.pass}/>
          <Btn onClick={go} full disabled={ld} style={{marginTop:6,height:48,fontSize:15,fontWeight:700}}>
            {ld ? <Spinner/> : <>Sign In <I n="arrow" s={16}/></>}
          </Btn>
          <p style={{textAlign:"center",marginTop:24,fontSize:13,color:T.textDim}}>No account? <span onClick={onSwitch} style={{color:T.cyan,cursor:"pointer",fontWeight:600,borderBottom:`1px dashed ${T.cyan}44`}}>Create one</span></p>
        </Glass>
        <p className="fi2" style={{textAlign:"center",marginTop:28,fontSize:11,color:T.textDim}}>AIEMS · Dept. of ISE · Final Year Project 2024-25</p>
      </div>
    </div>
  );
};

/* ═══════ REGISTER ═══════ */
const RegisterPage = ({onRegister,onSwitch}) => {
  const [f,setF]=useState({name:"",email:"",pass:"",confirm:"",role:"demo_user"});
  const [err,setErr]=useState({}); const [ld,setLd]=useState(false);
  const s=(k,v)=>{setF(p=>({...p,[k]:v}));setErr(p=>({...p,[k]:null}));};
  const go = () => {
    const e={}; if(!f.name)e.name="Required"; if(!f.email)e.email="Required";
    if(f.pass.length<8)e.pass="Min 8 characters"; if(f.pass!==f.confirm)e.confirm="Doesn't match";
    if(Object.keys(e).length)return setErr(e);
    setLd(true); setTimeout(()=>{setLd(false);onRegister({name:f.name,email:f.email,role:f.role});},1300);
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <NeuralBG/><Blob color="#3b82f6" size={400} top="-8%" right="-5%"/><Blob color={T.glow} size={300} bottom="-5%" left="10%" delay={2}/>
      <div style={{width:"100%",maxWidth:420,padding:20,position:"relative",zIndex:2}}>
        <div className="fi" style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:60,height:60,borderRadius:18,margin:"0 auto 14px",background:`linear-gradient(135deg,${T.cyan}22,${T.blue}22)`,border:`1.5px solid ${T.borderActive}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 50px ${T.glowDim}`,animation:"float 4s ease-in-out infinite"}}><I n="brain" s={28} c={T.cyan}/></div>
          <h1 style={{fontSize:26,fontWeight:800,background:`linear-gradient(135deg,${T.cyan},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Create Account</h1>
        </div>
        <Glass className="fi1" style={{padding:32}} glow>
          <Inp label="FULL NAME" icon="user" value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Your name" error={err.name}/>
          <Inp label="EMAIL" icon="mail" type="email" value={f.email} onChange={e=>s("email",e.target.value)} placeholder="you@example.com" error={err.email}/>
          <Inp label="PASSWORD" icon="lock" type="password" value={f.pass} onChange={e=>s("pass",e.target.value)} placeholder="Min 8 characters" error={err.pass}/>
          <Inp label="CONFIRM" icon="lock" type="password" value={f.confirm} onChange={e=>s("confirm",e.target.value)} placeholder="Repeat password" error={err.confirm}/>
          <div style={{marginBottom:18}}>
            <label style={{fontSize:12,fontWeight:500,color:T.textSec,marginBottom:8,display:"block",letterSpacing:0.5}}>ROLE</label>
            <div style={{display:"flex",gap:10}}>
              {[["demo_user","Demo User"],["clinician","Clinician"]].map(([k,l])=>(
                <button key={k} onClick={()=>s("role",k)} style={{flex:1,padding:"10px 14px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Outfit'",transition:"all 0.3s",background:f.role===k?`${T.cyan}12`:"rgba(6,10,16,0.6)",border:`1.5px solid ${f.role===k?T.borderActive:T.border}`,color:f.role===k?T.cyan:T.textDim,boxShadow:f.role===k?`0 0 15px ${T.glowSoft}`:"none"}}>{l}</button>
              ))}
            </div>
          </div>
          <Btn onClick={go} full disabled={ld} style={{height:48,fontSize:15,fontWeight:700}}>{ld?<Spinner/>:"Create Account"}</Btn>
          <p style={{textAlign:"center",marginTop:22,fontSize:13,color:T.textDim}}>Have an account? <span onClick={onSwitch} style={{color:T.cyan,cursor:"pointer",fontWeight:600,borderBottom:`1px dashed ${T.cyan}44`}}>Sign in</span></p>
        </Glass>
      </div>
    </div>
  );
};

/* ═══════ DASHBOARD ═══════ */
const Dashboard = () => {
  const bars=[3,5,2,7,4,6,1];
  return (
    <div>
      <h2 className="fi" style={{fontSize:24,fontWeight:800,marginBottom:22}}>Dashboard</h2>
      <Disclaimer/>
      <div className="fi1" style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:22}}>
        <Stat label="Total Scans" value="42" icon="scan" delay="su"/><Stat label="ASD Detected" value="18" color={T.asd} icon="warn" delay="su1"/>
        <Stat label="TD Detected" value="24" color={T.td} icon="check" delay="su2"/><Stat label="Avg Confidence" value="84.5%" color={T.cyan} icon="eye" delay="su3"/>
      </div>
      <Glass className="su1" style={{padding:24,marginBottom:22}}>
        <p style={{fontSize:12,color:T.textDim,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:18}}>This Week</p>
        <div style={{display:"flex",alignItems:"flex-end",gap:10,height:110,padding:"0 4px"}}>
          {bars.map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,fontFamily:T.mono,color:T.textDim,fontWeight:500}}>{v}</span>
            <div style={{width:"100%",height:v*13,borderRadius:8,background:`linear-gradient(to top,${T.cyan}55,${T.cyan})`,boxShadow:`0 0 12px ${T.cyan}22`,transition:"height 0.8s cubic-bezier(0.22,1,0.36,1)",transitionDelay:`${i*0.06}s`}}/>
            <span style={{fontSize:10,color:T.textDim,fontWeight:500}}>{["M","T","W","T","F","S","S"][i]}</span>
          </div>))}
        </div>
      </Glass>
      <Glass className="su2" style={{padding:24}}>
        <p style={{fontSize:12,color:T.textDim,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>Recent Predictions</p>
        {HIST.slice(0,4).map((p,i)=>(<div key={p.id} className={`fi${Math.min(i+1,5)}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:i<3?`1px solid ${T.border}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:p.label==="ASD"?T.asd:T.td,boxShadow:`0 0 10px ${p.label==="ASD"?T.asd:T.td}55`}}/>
            <div><span style={{fontWeight:600,fontSize:14}}>{p.label}</span><span style={{fontSize:12,color:T.textDim,marginLeft:10}}>{new Date(p.at).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></div>
          </div>
          <span style={{fontFamily:T.mono,fontSize:13,fontWeight:600,color:p.label==="ASD"?T.asd:T.td,textShadow:`0 0 10px ${p.label==="ASD"?T.asd:T.td}33`}}>{Math.round(p.confidence*100)}%</span>
        </div>))}
      </Glass>
    </div>
  );
};

/* ═══════ PREDICT ═══════ */
const Predict = () => {
  const [file,setFile]=useState(null); const [preview,setPreview]=useState(null);
  const [result,setResult]=useState(null); const [ld,setLd]=useState(false); const [drag,setDrag]=useState(false);
  const ref=useRef(null);
  const pick = f => { if(!f)return; setFile(f);setResult(null); const r=new FileReader(); r.onload=e=>setPreview(e.target.result); r.readAsDataURL(f); };
  const predict = () => {
    setLd(true);
    setTimeout(()=>{const isASD=Math.random()>0.4;setResult({label:isASD?"ASD":"TD",asd_probability:isASD?0.7+Math.random()*0.25:0.05+Math.random()*0.25,confidence:0.72+Math.random()*0.25,ms:1400+Math.round(Math.random()*900),ver:"v1.0.0"});setLd(false);},2800);
  };
  return (
    <div>
      <h2 className="fi" style={{fontSize:24,fontWeight:800,marginBottom:22}}>Predict</h2>
      <Disclaimer/>
      {!result ? (
        <div className="su">
          <Glass style={{overflow:"hidden",animation:!preview?"border-glow 4s ease infinite":"none"}}>
            <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);pick(e.dataTransfer.files[0]);}} onClick={()=>!preview&&ref.current?.click()} style={{padding:preview?0:"64px 40px",textAlign:"center",cursor:preview?"default":"pointer",background:drag?`${T.cyan}08`:"transparent",transition:"all 0.3s"}}>
              <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={e=>pick(e.target.files[0])}/>
              {preview ? (
                <div style={{position:"relative"}}>
                  <img src={preview} alt="Preview" style={{width:"100%",maxHeight:420,objectFit:"contain",display:"block"}}/>
                  {ld && (<div style={{position:"absolute",inset:0,background:"rgba(6,10,16,0.75)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,backdropFilter:"blur(4px)"}}>
                    <div style={{position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.cyan},transparent)`,animation:"scan-line 2s ease-in-out infinite",boxShadow:`0 0 20px ${T.cyan}`}}/>
                    <I n="scan" s={40} c={T.cyan}/><p style={{color:T.cyan,fontWeight:600,fontSize:14,letterSpacing:1}}>Analyzing facial features...</p>
                  </div>)}
                </div>
              ) : (
                <><div style={{width:64,height:64,borderRadius:18,margin:"0 auto 20px",background:`${T.cyan}10`,border:`1.5px dashed ${T.borderActive}`,display:"flex",alignItems:"center",justifyContent:"center",animation:"float 3s ease-in-out infinite"}}><I n="upload" s={28} c={T.cyan}/></div>
                <p style={{fontWeight:700,fontSize:17,marginBottom:6}}>Drop a facial image here</p>
                <p style={{color:T.textDim,fontSize:13}}>or click to browse · JPEG, PNG, WebP · Max 10MB</p></>
              )}
            </div>
          </Glass>
          {preview && !ld && (<div style={{display:"flex",gap:12,marginTop:16}}>
            <Btn onClick={predict} full style={{flex:1,height:52,fontSize:15,fontWeight:700}}><I n="brain" s={20}/> Run Prediction</Btn>
            <Btn v="ghost" onClick={()=>{setFile(null);setPreview(null);}}>Clear</Btn>
          </div>)}
        </div>
      ) : (
        <div className="su">
          <Glass glow style={{overflow:"hidden",border:`1px solid ${result.label==="ASD"?T.asd:T.td}33`}}>
            <div style={{padding:"18px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",background:result.label==="ASD"?"rgba(255,176,32,0.06)":"rgba(0,224,158,0.06)",borderBottom:`1px solid ${T.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:result.label==="ASD"?T.asd:T.td,boxShadow:`0 0 15px ${result.label==="ASD"?T.asd:T.td}88`,animation:"glow 2s ease infinite"}}/>
                <span style={{fontWeight:800,fontSize:20,color:result.label==="ASD"?T.asd:T.td}}>{result.label==="ASD"?"ASD Detected":"Typically Developing"}</span>
              </div>
              <span style={{fontSize:12,color:T.textDim,fontFamily:T.mono}}>{result.ms}ms · {result.ver}</span>
            </div>
            <div style={{padding:28,display:"flex",gap:28,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{flex:"1 1 280px",display:"flex",gap:14}}>
                <div style={{flex:1}}><p style={{fontSize:10,color:T.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Original</p><div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`}}><img src={preview} alt="" style={{width:"100%",display:"block"}}/></div></div>
                <div style={{flex:1}}><p style={{fontSize:10,color:T.textDim,marginBottom:8,textTransform:"uppercase",letterSpacing:2,fontWeight:600}}>Grad-CAM</p>
                  <div style={{width:"100%",aspectRatio:"1",borderRadius:14,border:`1px solid ${T.border}`,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,rgba(255,100,0,0.12),rgba(0,255,100,0.08))"}}>
                    <img src={preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:0.5}}/>
                    <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 45% 40%,rgba(255,0,0,0.35) 0%,rgba(255,160,0,0.2) 30%,rgba(0,200,100,0.1) 60%,transparent 80%)",mixBlendMode:"screen"}}/>
                    <div style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center"}}><span style={{fontSize:10,padding:"4px 10px",borderRadius:6,background:"rgba(0,0,0,0.6)",color:T.textSec}}>Activation Heatmap</span></div>
                  </div>
                </div>
              </div>
              <div style={{flex:"0 0 190px",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                <Ring value={result.confidence} label={result.label}/>
                <div style={{textAlign:"center"}}><p style={{fontSize:11,color:T.textDim,letterSpacing:1,textTransform:"uppercase"}}>ASD Probability</p><p style={{fontFamily:T.mono,fontSize:22,fontWeight:700,color:T.text,marginTop:4}}>{(result.asd_probability*100).toFixed(1)}%</p></div>
              </div>
            </div>
          </Glass>
          <div style={{display:"flex",gap:12,marginTop:18}}><Btn v="ghost" onClick={()=>{setResult(null);setFile(null);setPreview(null);}} full><I n="upload" s={16}/> New Prediction</Btn></div>
        </div>
      )}
    </div>
  );
};

/* ═══════ HISTORY ═══════ */
const History = () => (
  <div>
    <div className="fi" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h2 style={{fontSize:24,fontWeight:800}}>History</h2>
      <Btn v="ghost" style={{fontSize:12}}><I n="download" s={14}/> Export CSV</Btn>
    </div>
    <Glass className="su" style={{overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 80px 120px",padding:"14px 24px",background:"rgba(0,240,200,0.03)",borderBottom:`1px solid ${T.border}`,fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:2,fontWeight:700}}>
        <span>ID</span><span>Label</span><span>Confidence</span><span>Time</span><span>Date</span>
      </div>
      {HIST.map((p,i)=>(<div key={p.id} className={`fi${Math.min(i+1,5)}`} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 80px 120px",padding:"16px 24px",fontSize:13,borderBottom:i<HIST.length-1?`1px solid ${T.border}`:"none",transition:"background 0.2s",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,240,200,0.03)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{fontFamily:T.mono,fontSize:12,color:T.textSec}}>{p.id}</span>
        <span><span style={{padding:"3px 12px",borderRadius:8,fontSize:11,fontWeight:700,letterSpacing:0.5,background:p.label==="ASD"?T.asdGlow:T.tdGlow,color:p.label==="ASD"?T.asd:T.td,boxShadow:`0 0 10px ${p.label==="ASD"?T.asd:T.td}15`}}>{p.label}</span></span>
        <span style={{fontFamily:T.mono,fontWeight:600}}>{Math.round(p.confidence*100)}%</span>
        <span style={{color:T.textDim,fontFamily:T.mono,fontSize:12}}>{p.ms}ms</span>
        <span style={{color:T.textDim,fontSize:12}}>{new Date(p.at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
      </div>))}
    </Glass>
  </div>
);

/* ═══════ APP ═══════ */
export default function App() {
  injectStyles();
  const [user,setUser]=useState(null); const [auth,setAuth]=useState("login"); const [page,setPage]=useState("dashboard");
  if (!user) return auth==="login" ? <LoginPage onLogin={setUser} onSwitch={()=>setAuth("register")}/> : <RegisterPage onRegister={setUser} onSwitch={()=>setAuth("login")}/>;
  const nav=[{id:"dashboard",icon:"bar",label:"Dashboard"},{id:"predict",icon:"brain",label:"Predict"},{id:"history",icon:"clock",label:"History"}];
  return (
    <div style={{display:"flex",minHeight:"100vh",position:"relative"}}>
      <NeuralBG/>
      <aside style={{width:240,background:"rgba(6,10,16,0.85)",backdropFilter:"blur(30px)",borderRight:`1px solid ${T.border}`,padding:"28px 16px",display:"flex",flexDirection:"column",flexShrink:0,position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:40,paddingLeft:10}}>
          <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.cyan}22,${T.blue}22)`,border:`1px solid ${T.borderActive}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 25px ${T.glowDim}`}}><I n="brain" s={22} c={T.cyan}/></div>
          <div><p style={{fontWeight:800,fontSize:16,lineHeight:1,background:`linear-gradient(135deg,${T.cyan},${T.blue})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ASD-FaceNet</p><p style={{fontSize:10,color:T.textDim,marginTop:3,fontFamily:T.mono}}>v1.0.0 · local</p></div>
        </div>
        <nav style={{flex:1}}>{nav.map(item=>{const active=page===item.id;return(
          <button key={item.id} onClick={()=>setPage(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderRadius:12,border:"none",cursor:"pointer",marginBottom:4,fontFamily:"'Outfit'",fontSize:14,fontWeight:active?700:400,background:active?`${T.cyan}10`:"transparent",color:active?T.cyan:T.textDim,transition:"all 0.25s",boxShadow:active?`inset 0 0 20px ${T.glowSoft}`:"none"}}>
            <I n={item.icon} s={18} c={active?T.cyan:T.textDim}/>{item.label}
            {active && <div style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:T.cyan,boxShadow:`0 0 10px ${T.cyan}`}}/>}
          </button>);})}</nav>
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingLeft:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.cyan}20,${T.blue}20)`,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n="user" s={16} c={T.cyan}/></div>
            <div><p style={{fontSize:13,fontWeight:700}}>{user.name}</p><p style={{fontSize:10,color:T.textDim,fontFamily:T.mono}}>{user.role}</p></div>
          </div>
          <button onClick={()=>setUser(null)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 16px",borderRadius:10,border:"1px solid transparent",cursor:"pointer",background:"transparent",color:T.textDim,fontSize:13,fontFamily:"'Outfit'",transition:"all 0.25s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,68,102,0.2)";e.currentTarget.style.color=T.danger;}} onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.color=T.textDim;}}><I n="out" s={16}/> Sign Out</button>
        </div>
      </aside>
      <main style={{flex:1,padding:"36px 44px",maxWidth:940,overflowY:"auto",position:"relative",zIndex:5}} key={page}>
        {page==="dashboard" && <Dashboard/>}
        {page==="predict" && <Predict/>}
        {page==="history" && <History/>}
      </main>
    </div>
  );
}
