import { useState, useEffect, useRef, useCallback } from "react";

const SB="https://rngptdmetqolhkjpkuvs.supabase.co";
const SK="sb_publishable_Z_jHWgSTpvl-AE1XjsBy4A_6Z1WovxI";
async function sbq(m,t,b=null,q=""){
  const r=await fetch(`${SB}/rest/v1/${t}${q}`,{method:m,headers:{"apikey":SK,"Authorization":`Bearer ${SK}`,"Content-Type":"application/json","Prefer":"return=representation"},body:b?JSON.stringify(b):null});
  const x=await r.text();if(!r.ok)throw new Error(x);return x?JSON.parse(x):null;
}
const DB={get:(t,q="")=>sbq("GET",t,null,q),post:(t,b)=>sbq("POST",t,b),patch:(t,q,b)=>sbq("PATCH",t,b,q),del:(t,q)=>sbq("DELETE",t,null,q)};
const getAK=()=>localStorage.getItem("anthropic_key")||import.meta.env.VITE_ANTHROPIC_KEY||"";
const GURL=()=>`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${getAK()}`;
const gParts=(d)=>d.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||"").join("")||"";
const parseJSON=(txt)=>{if(!txt)return null;const s=txt.replace(/```json\s?/gi,"").replace(/```/g,"").trim();try{return JSON.parse(s);}catch{}const m=s.match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0]);}catch{}return null;};
const HF_TYPE_MAP={"Outdoor Running":{id:"corrida",label:"Corrida",xp:35},"Indoor Running":{id:"corrida",label:"Corrida",xp:35},"Tennis":{id:"tenis",label:"Tênis",xp:25},"Outdoor Walking":{id:"caminhada",label:"Caminhada",xp:15},"Indoor Walking":{id:"caminhada",label:"Caminhada",xp:15},"Strength Training":{id:"musculacao",label:"Musculação",xp:30},"Outdoor Cycling":{id:"bike",label:"Bike",xp:30},"Indoor Cycling":{id:"bike",label:"Bike Indoor",xp:30},"Open Water Swim":{id:"natacao",label:"Natação",xp:35},"Swimming":{id:"natacao",label:"Natação",xp:35},"Mixed Cardio":{id:"hiit",label:"HIIT",xp:30},"HIIT":{id:"hiit",label:"HIIT",xp:30}};
const parseHFTime=(t)=>{const m=t&&t.match(/(\d+)h:(\d+)m/);return m?parseInt(m[1])*60+parseInt(m[2]):0;};
const parseHFDate=(d)=>{const p=d&&d.split("/");return p&&p.length===3?`${p[2]}-${p[1]}-${p[0]}`:null;};
const parseCSV=(text)=>{const lines=text.trim().split("\n");const hdrs=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));return lines.slice(1).map(line=>{const vals=[];let inQ=false,cur="";for(const ch of line){if(ch==='"')inQ=!inQ;else if(ch===','&&!inQ){vals.push(cur.trim());cur="";}else cur+=ch;}vals.push(cur.trim());return Object.fromEntries(hdrs.map((h,i)=>[h,(vals[i]||"").replace(/^"|"$/g,"").trim()]));});};
async function callAI(msgs,sys="",max=1000){
  const contents=msgs.map((m,i)=>({role:m.role==="assistant"?"model":"user",parts:[{text:i===0&&sys?sys+"\n\n"+m.content:m.content}]}));
  const r=await fetch(GURL(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents,generationConfig:{maxOutputTokens:max,thinkingConfig:{thinkingBudget:0}}})});
  const d=await r.json();if(d.error)throw new Error(d.error.message);
  return gParts(d);
}
const compressImg=(dataUrl,maxPx=1100)=>new Promise(res=>{const img=new Image();img.onload=()=>{const ratio=Math.min(maxPx/img.width,maxPx/img.height,1);const c=document.createElement("canvas");c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext("2d").drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.82));};img.src=dataUrl;});
async function callVision(b64,mime,prompt,max=2500){
  const body={contents:[{parts:[{inlineData:{mimeType:mime,data:b64}},{text:"Retorne APENAS JSON válido sem markdown.\n\n"+prompt}]}],generationConfig:{maxOutputTokens:max,thinkingConfig:{thinkingBudget:0}}};
  const r=await fetch(GURL(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();if(d.error)throw new Error(d.error.message);
  return parseJSON(gParts(d));
}

const todayStr=()=>new Date().toISOString().slice(0,10);
const fmt=(d)=>new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
const fmtFull=(d)=>new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
const fmtNow=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const XPL=[0,500,1200,2500,4200,6500,9500,13500,20000];
const LVLN=["Iniciante","Comprometido","Consistente","Disciplinado","Focado","Inabalável","Elite","Lendário"];
const getLvl=(xp)=>{for(let i=XPL.length-1;i>=0;i--)if(xp>=XPL[i])return i;return 0;};
const bmrCalc=(p,a,i,s)=>s==="M"?(10*p)+(6.25*a)-(5*i)+5:(10*p)+(6.25*a)-(5*i)-161;

const C={bg:"#0f172a",surface:"#1e293b",card:"#1e293b",border:"rgba(255,255,255,0.06)",muted:"rgba(255,255,255,0.5)",dim:"rgba(255,255,255,0.25)",yellow:"#fbbf24",green:"#34d399",blue:"#60a5fa",purple:"#a78bfa",orange:"#fb923c",red:"#f87171"};

const MODALITIES=[
  {id:"musculacao",label:"Musculação",emoji:"🏋️",color:"#a78bfa",xp:30},
  {id:"natacao",label:"Natação",emoji:"🏊",color:"#60a5fa",xp:35},
  {id:"bike",label:"Bike Indoor",emoji:"🚴",color:"#4ade80",xp:30},
  {id:"corrida",label:"Corrida",emoji:"🏃",color:"#f59e0b",xp:35},
  {id:"tenis",label:"Tênis",emoji:"🎾",color:"#f472b6",xp:25},
  {id:"caminhada",label:"Caminhada",emoji:"🚶",color:"#34d399",xp:15},
  {id:"hiit",label:"HIIT",emoji:"🔥",color:"#fb923c",xp:30},
];

const MEAL_TYPES=[
  {id:"cafe",label:"☕ Café da manhã",color:"#f59e0b",horario:"07:00–09:00"},
  {id:"lanche_m",label:"🍎 Lanche manhã",color:"#4ade80",horario:"10:00–11:00"},
  {id:"almoco",label:"🍽️ Almoço",color:"#60a5fa",horario:"12:00–14:00"},
  {id:"lanche_t",label:"🥤 Lanche tarde",color:"#a78bfa",horario:"15:00–16:30"},
  {id:"jantar",label:"🌙 Jantar",color:"#fb923c",horario:"19:00–21:00"},
  {id:"ceia",label:"🌛 Ceia",color:"#f87171",horario:"21:00–22:00"},
  {id:"pre_treino",label:"⚡ Pré-treino",color:"#facc15",horario:"60min antes"},
  {id:"pos_treino",label:"💪 Pós-treino",color:"#34d399",horario:"até 60min após"},
];

const CATS={mente:{color:"#a78bfa",label:"Mente"},corpo:{color:"#4ade80",label:"Corpo"},disciplina:{color:"#fb923c",label:"Disciplina"},carreira:{color:"#60a5fa",label:"Carreira"}};

const DEFAULT_HABITS=[
  {emoji:"🌅",titulo:"Acordar cedo",cat:"mente",xp:15},
  {emoji:"💧",titulo:"Beber 4L de água",cat:"corpo",xp:15},
  {emoji:"🏊",titulo:"Treino do dia",cat:"corpo",xp:30},
  {emoji:"🥗",titulo:"Comer dentro da meta",cat:"corpo",xp:20},
  {emoji:"🌙",titulo:"Dormir 7-8h",cat:"corpo",xp:15},
  {emoji:"💊",titulo:"Suplementação",cat:"corpo",xp:10},
  {emoji:"📊",titulo:"Registrar no app",cat:"disciplina",xp:20},
];

const ULTRAMAN=[
  {n:1,name:"Fase 1",goal:"Perder 10kg · Natação · Bike",weight:130,color:"#4ade80"},
  {n:2,name:"Fase 2",goal:"Correr 5K · 120kg",weight:120,color:"#60a5fa"},
  {n:3,name:"Fase 3",goal:"Correr 10K · 110kg",weight:110,color:"#a78bfa"},
  {n:4,name:"Fase 4",goal:"Triathlon Sprint · 100kg",weight:100,color:"#fb923c"},
  {n:5,name:"Fase 5",goal:"Iron Man 70.3 · 95kg",weight:95,color:"#f87171"},
  {n:6,name:"🏆 ULTRAMAN",goal:"515km · O objetivo final",weight:null,color:"#facc15"},
];

const TABS=[
  {id:"home",icon:"⚡",label:"Início"},
  {id:"training",icon:"🏋️",label:"Treino"},
  {id:"nutrition",icon:"🍽️",label:"Nutrição"},
  {id:"health",icon:"📊",label:"Saúde"},
  {id:"mais",icon:"☰",label:"Mais"},
];
const MAIS_ITEMS=[
  {id:"habits",icon:"🔥",label:"Hábitos"},
  {id:"journey",icon:"🏆",label:"Jornada"},
  {id:"settings",icon:"⚙️",label:"Configurações"},
];

// UI Components
const Card=({children,style,onClick})=><div onClick={onClick} style={{background:C.card,borderRadius:20,padding:18,transition:"all .2s",boxShadow:"0 2px 8px rgba(0,0,0,.35)",...(style||{})}}>{children}</div>;
const Badge=({children,color,style})=>{const c=color||C.yellow;return<span style={{fontSize:9,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",padding:"4px 10px",borderRadius:20,color:c,background:`${c}18`,whiteSpace:"nowrap",...(style||{})}}>{children}</span>;};
const SLbl=({children,mt})=><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:14,marginTop:mt||8,fontWeight:700}}>{children}</p>;
const Spin=({text})=>(
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"28px 0"}}>
    <div style={{display:"flex",gap:7}}>{[0,1,2,3].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.yellow,animation:`ldot 1.4s ease-in-out ${i*.18}s infinite`}}/>)}</div>
    <p style={{fontSize:11,color:C.dim,letterSpacing:".15em",textTransform:"uppercase"}}>{text||"Carregando"}</p>
  </div>
);
const Bar=({value,max,color,h})=>{const c=color||C.yellow,ht=h||5,pct=max?Math.min(100,(value/max)*100):0;return<div style={{height:ht,borderRadius:ht,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:ht,background:c,transition:"width .6s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 8px ${c}50`}}/></div>;};
const Ring=({value,max,size,sw,color,children})=>{const v=value||0,m=max||100,s=size||60,w=sw||5,c=color||C.yellow,r=(s-w*2)/2,circ=2*Math.PI*r,dash=m?Math.min(1,v/m)*circ:0;return(<div style={{position:"relative",width:s,height:s,flexShrink:0}}><svg width={s} height={s} style={{transform:"rotate(-90deg)",display:"block"}}><circle cx={s/2} cy={s/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={w}/><circle cx={s/2} cy={s/2} r={r} fill="none" stroke={c} strokeWidth={w} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray .7s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 4px ${c}60)`}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>{children}</div></div>);};
const FIn=({label,value,onChange,placeholder,type,req,style})=>(
  <div style={{marginBottom:14,...(style||{})}}>
    {label&&<p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:7,fontWeight:700}}>{label}{req&&<span style={{color:C.yellow,marginLeft:3}}>✦</span>}</p>}
    <input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",fontFamily:"inherit",transition:"border-color .2s"}}
      onFocus={e=>{e.target.style.borderColor="rgba(250,204,21,.6)";setTimeout(()=>e.target.scrollIntoView({behavior:"smooth",block:"center"}),320);}} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
  </div>
);
const Btn=({children,onClick,variant,disabled,full,sm,style})=>{
  const V={primary:{bg:C.yellow,color:"#000",shadow:"0 0 20px rgba(250,204,21,.3)"},ghost:{bg:"rgba(255,255,255,.07)",color:C.muted,shadow:"none"},green:{bg:"rgba(74,222,128,.12)",color:C.green,shadow:"none"},blue:{bg:"rgba(96,165,250,.12)",color:C.blue,shadow:"none"},purple:{bg:"rgba(167,139,250,.12)",color:C.purple,shadow:"none"},danger:{bg:"rgba(248,113,113,.12)",color:C.red,shadow:"none"}};
  const v=V[variant||"primary"];
  return<button onClick={!disabled?onClick:undefined} style={{border:"none",borderRadius:sm?8:13,padding:sm?"7px 14px":"14px 22px",fontSize:sm?11:13,fontWeight:800,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:".04em",transition:"all .2s",width:full?"100%":"auto",opacity:disabled?.4:1,background:v.bg,color:v.color,boxShadow:disabled?"none":v.shadow,...(style||{})}}>{children}</button>;
};
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick();}} style={{background:"rgba(248,113,113,.12)",border:"none",borderRadius:7,width:28,height:28,cursor:"pointer",color:C.red,fontSize:13,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>;
const Sheet=({children,onClose,title,subtitle})=>(
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",backdropFilter:"blur(16px)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,background:C.surface,borderRadius:"24px 24px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -20px 60px rgba(0,0,0,.5)",animation:"slideUp .32s cubic-bezier(.4,0,.2,1)"}}>
      <div style={{padding:"16px 22px 0",flexShrink:0}}>
        <div style={{width:38,height:4,borderRadius:2,background:"rgba(255,255,255,.12)",margin:"0 auto 18px"}}/>
        {title&&<h3 style={{fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:700,marginBottom:subtitle?4:16}}>{title}</h3>}
        {subtitle&&<p style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.5}}>{subtitle}</p>}
      </div>
      <div style={{overflowY:"auto",padding:"0 22px",paddingBottom:"max(32px, env(safe-area-inset-bottom, 32px))",flex:1,WebkitOverflowScrolling:"touch"}}>{children}
        <div style={{height:"max(env(safe-area-inset-bottom,0px),24px)"}}/>
      </div>
    </div>
  </div>
);
const Tabs2=({tabs,active,onChange})=>(
  <div style={{display:"flex",background:"#12121a",borderRadius:14,padding:4,marginBottom:20,gap:3}}>
    {tabs.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:"9px 4px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all .2s",background:active===t.id?"rgba(250,204,21,.12)":"transparent",color:active===t.id?C.yellow:C.muted,fontWeight:active===t.id?800:400,fontSize:10,borderBottom:active===t.id?"2px solid #facc15":"2px solid transparent"}}>{t.label}</button>)}
  </div>
);

// ONBOARDING
function Onboarding({onSave}){
  const [step,setStep]=useState(0);
  const [saving,setSaving]=useState(false);
  const [f,setF]=useState({nome:"",sexo:"M",idade:"",peso:"",altura:"",peso_meta:"",limitacoes:"",medicamentos:"",experiencia:"",objetivo:""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const steps=[{title:"Bem-vindo, atleta! 👊",sub:"Sua jornada rumo ao Ultraman começa aqui.",ok:f.nome.trim().length>0},{title:"Dados físicos 📏",sub:"Para calcular suas metas com precisão.",ok:f.peso&&f.idade&&f.altura},{title:"Sua meta 🎯",sub:"Onde você quer chegar?",ok:!!f.peso_meta},{title:"Saúde & histórico 🩺",sub:"Quanto mais você compartilha, melhor o app te conhece.",ok:true}];
  const cur=steps[step];
  const isLast=step===3;
  const finish=async()=>{
    setSaving(true);
    try{
      const p=parseFloat(f.peso),a=parseFloat(f.altura),i=parseFloat(f.idade);
      const bmr=bmrCalc(p,a,i,f.sexo),tdee=Math.round(bmr*1.55),cal=tdee-500;
      const profile={nome:f.nome,sexo:f.sexo,idade:i,peso:p,altura:a,peso_meta:parseFloat(f.peso_meta),bmr:Math.round(bmr),tdee,cal_meta:cal,prot_meta:Math.round(p*2.4),carbs_meta:Math.round((cal*.35)/4),gord_meta:Math.round((cal*.25)/9),xp:0,data_criacao:todayStr(),limitacoes:f.limitacoes||"",medicamentos:f.medicamentos||"",experiencia:f.experiencia||"Intermediário",objetivo:f.objetivo||"Emagrecer"};
      const [saved]=await DB.post("perfil",profile);
      for(const h of DEFAULT_HABITS) await DB.post("habitos",h);
      onSave(saved);
    }catch(e){console.error(e);setSaving(false);}
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:"#fff",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{display:"flex",gap:6,marginBottom:36}}>{steps.map((_,i)=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=step?C.yellow:"rgba(255,255,255,.1)",transition:"background .3s"}}/>)}</div>
        <Badge style={{marginBottom:16}}>Etapa {step+1}/4</Badge>
        <h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:30,fontWeight:700,marginBottom:8,marginTop:10}}>{cur.title}</h2>
        <p style={{fontSize:13,color:C.muted,marginBottom:28,lineHeight:1.65}}>{cur.sub}</p>
        {step===0&&<><FIn label="Seu nome" req value={f.nome} onChange={v=>set("nome",v)} placeholder="Ex: Cleiton"/><div style={{marginBottom:14}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Sexo biológico</p><div style={{display:"flex",gap:8}}>{[{v:"M",l:"Masculino"},{v:"F",l:"Feminino"}].map(s=><button key={s.v} onClick={()=>set("sexo",s.v)} style={{flex:1,padding:13,borderRadius:12,border:f.sexo===s.v?`2px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:f.sexo===s.v?"rgba(250,204,21,.12)":"transparent",color:f.sexo===s.v?C.yellow:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>)}</div></div></>}
        {step===1&&<><FIn label="Idade" type="number" req value={f.idade} onChange={v=>set("idade",v)} placeholder="Ex: 32"/><FIn label="Peso atual (kg)" type="number" req value={f.peso} onChange={v=>set("peso",v)} placeholder="Ex: 139.8"/><FIn label="Altura (cm)" type="number" req value={f.altura} onChange={v=>set("altura",v)} placeholder="Ex: 192"/></>}
        {step===2&&<><FIn label="Peso meta (kg)" type="number" req value={f.peso_meta} onChange={v=>set("peso_meta",v)} placeholder="Ex: 100"/><div style={{background:"rgba(250,204,21,.06)",border:"1px solid rgba(250,204,21,.18)",borderRadius:14,padding:"14px 16px",marginTop:4}}><p style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.7}}>Meta <strong style={{color:C.yellow}}>Ultraman</strong>: 10km natação + 421km bike + 84km corrida. 🏆</p></div></>}
        {step===3&&(
          <>
            <div style={{marginBottom:14}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:7,fontWeight:700}}>Limitações físicas ou lesões</p><textarea value={f.limitacoes||""} onChange={e=>set("limitacoes",e.target.value)} placeholder="Ex: síndrome compartimental na canela, dor no joelho esquerdo..." rows={3} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit",resize:"none"}}/></div>
            <FIn label="Medicamentos em uso" value={f.medicamentos||""} onChange={v=>set("medicamentos",v)} placeholder="Ex: Wegovy 2.4mg semanal, Vitamina D..."/>
            <div style={{marginBottom:14}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Experiência com treino</p><div style={{display:"flex",gap:8}}>{["Iniciante","Intermediário","Avançado"].map(exp=><button key={exp} onClick={()=>set("experiencia",exp)} style={{flex:1,padding:"11px 6px",borderRadius:12,border:f.experiencia===exp?`2px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:f.experiencia===exp?"rgba(250,204,21,.12)":"transparent",color:f.experiencia===exp?C.yellow:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{exp}</button>)}</div></div>
            <div style={{marginBottom:14}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Objetivo principal</p><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["Emagrecer","Ganhar músculo","Melhorar condicionamento","Preparar para Ultraman","Saúde geral"].map(obj=><button key={obj} onClick={()=>set("objetivo",obj)} style={{padding:"8px 14px",borderRadius:20,border:f.objetivo===obj?`1.5px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:f.objetivo===obj?"rgba(250,204,21,.12)":"transparent",color:f.objetivo===obj?C.yellow:C.muted,fontSize:12,fontWeight:f.objetivo===obj?700:400,cursor:"pointer",fontFamily:"inherit"}}>{obj}</button>)}</div></div>
          </>
        )}
        {saving?<Spin text="Configurando"/>:(
          <div style={{display:"flex",gap:8,marginTop:8}}>
            {step>0&&<Btn onClick={()=>setStep(s=>s-1)} variant="ghost">← Voltar</Btn>}
            <Btn onClick={isLast?finish:()=>cur.ok&&setStep(s=>s+1)} disabled={!cur.ok} full={step===0}>{isLast?"Começar 🚀":"Próximo →"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// DASHBOARD
function Dashboard({profile,meals,weights,checkins,habits,trainings,onTab}){
  const [insight,setInsight]=useState("");
  const [plateauAnalysis,setPlateauAnalysis]=useState("");
  const [loadingPlateau,setLoadingPlateau]=useState(false);
  const [aguaCopos,setAguaCopos]=useState(()=>{const s=localStorage.getItem("agua_"+todayStr());return s?parseInt(s):0;});
  const tk=todayStr(),tm=meals.filter(m=>m.data===tk);
  const cal=tm.reduce((s,m)=>s+(m.calorias||0),0),prot=tm.reduce((s,m)=>s+(m.proteina||0),0);
  const ctd=checkins.filter(c=>c.data===tk);
  const lvl=getLvl(profile.xp||0),xpB=XPL[lvl]||0,xpN=XPL[lvl+1]||20000;
  const xpP=Math.min(100,(((profile.xp||0)-xpB)/(xpN-xpB))*100);
  const lw=weights[0]?.peso||profile.peso,lost=Math.max(0,(profile.peso||0)-(lw||0));
  const days=Math.max(1,Math.floor((new Date()-new Date(profile.data_criacao||tk))/86400000)+1);
  const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=d.toISOString().slice(0,10);return{k,dw:["D","S","T","Q","Q","S","S"][d.getDay()],cal:meals.filter(m=>m.data===k).reduce((s,m)=>s+(m.calorias||0),0),tr:trainings.some(t=>t.data===k),today:k===tk};});
  const treinouHoje=trainings.some(t=>t.data===tk);
  const calCiclo=treinouHoje?Math.round((profile.cal_meta||2800)*1.1):Math.round((profile.cal_meta||2800)*0.9);
  const calDiff=calCiclo-(profile.cal_meta||2800);
  const tipoCiclo=treinouHoje?"treino":"descanso";
  const pausaAtiva=localStorage.getItem("pausa_ativa")==="true";
  const pausaMotivo=localStorage.getItem("pausa_motivo");
  const pausaInicio=localStorage.getItem("pausa_inicio");
  const pausaDias=pausaInicio?Math.floor((new Date()-new Date(pausaInicio))/86400000):0;
  useEffect(()=>{
    const cached=localStorage.getItem("dashInsight"),cachedDate=localStorage.getItem("dashInsightDate");
    if(cached&&cachedDate===todayStr()){setInsight(cached);return;}
    callAI([{role:"user",content:`${profile.nome}, ${lw}kg (meta ${profile.peso_meta}kg), proteína ${prot}/${profile.prot_meta}g, hábitos ${ctd.length}/${habits.length}. Objetivo Ultraman. 2 frases motivacionais.`}],"Coach Paulo Musy + Renato Cariani. Português direto.",160)
      .then(r=>{setInsight(r);localStorage.setItem("dashInsight",r);localStorage.setItem("dashInsightDate",todayStr());})
      .catch(()=>setInsight("Foco total. Cada treino te aproxima do Ultraman."));
  },[]);
  const d14=new Date();d14.setDate(d14.getDate()-14);
  const recentW=weights.filter(w=>new Date(w.data+"T12:00:00")>=d14);
  const isPlateauActive=recentW.length>=2&&(Math.max(...recentW.map(w=>w.peso))-Math.min(...recentW.map(w=>w.peso)))<0.5;
  const plateauDays=isPlateauActive?Math.round((new Date()-new Date(recentW[recentW.length-1].data+"T12:00:00"))/86400000):0;
  const hour=new Date().getHours();
  const showProtAlert=prot<(profile.prot_meta*0.7)&&hour>=14;
  const protRestante=(profile.prot_meta||0)-prot;
  const blocosAgua=[{label:"Manhã",horario:"06–12h",meta:4,emoji:"🌅"},{label:"Tarde",horario:"12–17h",meta:5,emoji:"☀️"},{label:"Pré-treino",horario:"17–19h",meta:4,emoji:"🏋️"},{label:"Noite",horario:"19–23h",meta:3,emoji:"🌙"}];
  const addCopo=()=>{const n=Math.min(aguaCopos+1,16);setAguaCopos(n);localStorage.setItem("agua_"+todayStr(),n);};
  const removeCopo=()=>{const n=Math.max(aguaCopos-1,0);setAguaCopos(n);localStorage.setItem("agua_"+todayStr(),n);};
  const analyzePlateau=async()=>{
    setLoadingPlateau(true);
    const d7=new Date();d7.setDate(d7.getDate()-7);
    const avgProt=Math.round(meals.filter(m=>new Date(m.data+"T12:00:00")>=d7).reduce((s,m)=>s+(m.proteina||0),0)/7);
    const weekTrainings=trainings.filter(t=>new Date(t.data+"T12:00:00")>=d7).length;
    try{const r=await callAI([{role:"user",content:`Cleiton está em plateau há ${plateauDays} dias. Peso atual: ${lw}kg. Meta: ${profile.peso_meta}kg. Proteína média dos últimos 7 dias: ${avgProt}g (meta: ${profile.prot_meta}g). Treinos na última semana: ${weekTrainings}. Analise as 4 causas mais prováveis do plateau nesse caso específico e dê uma ação concreta para cada causa. Seja direto, sem enrolação.`}],"Você é o Coach IA com personalidade de Paulo Musy e Renato Cariani. Seja direto e prático.",1000);setPlateauAnalysis(r);}
    catch{setPlateauAnalysis("Erro ao analisar. Tente novamente.");}
    setLoadingPlateau(false);
  };
  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div><p style={{fontSize:11,color:C.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>Dia {days} · Jornada Ultraman</p><h1 style={{fontFamily:"'Clash Display',sans-serif",fontSize:30,fontWeight:700,lineHeight:1.1}}>Olá, <span style={{color:C.yellow}}>{profile.nome?.split(" ")[0]}</span> 💪</h1></div>
        <Ring value={days} max={180} size={58} sw={5} color={C.yellow}><span style={{fontSize:10,fontWeight:900,color:C.yellow}}>{Math.round((days/180)*100)}%</span></Ring>
      </div>
      {pausaAtiva&&<div style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.3)",borderRadius:16,padding:14,marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><p style={{fontSize:13,fontWeight:700,color:C.orange,marginBottom:3}}>⏸️ Modo pausa ativo — {pausaDias} dias</p><p style={{fontSize:11,color:C.muted}}>{pausaMotivo} · Sem cobrança de hábitos</p></div><button onClick={()=>onTab("settings")} style={{background:"rgba(251,146,60,0.2)",border:"1px solid rgba(251,146,60,0.4)",borderRadius:10,padding:"8px 12px",color:C.orange,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Retomar</button></div></div>}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"12px 16px",background:C.card,borderRadius:16,boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
        <div style={{width:28,height:28,borderRadius:9,background:"linear-gradient(135deg,#fbbf24,#f59e0b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#000",flexShrink:0}}>{lvl}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{fontSize:12,fontWeight:700,color:C.yellow}}>{LVLN[lvl]}</span>
            <span style={{fontSize:10,color:C.dim}}>{(profile.xp||0).toLocaleString()} XP · {Math.round(xpP)}%</span>
          </div>
          <Bar value={profile.xp||0} max={xpN}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[{v:cal,max:calCiclo,c:C.yellow,l:"KCAL",s:`/${calCiclo}`},{v:prot,max:profile.prot_meta||336,c:C.green,l:"PROT",s:`/${profile.prot_meta}g`},{v:ctd.length,max:habits.length||1,c:C.yellow,l:"HÁBITOS",s:`/${habits.length}`}].map((r,i)=>(
          <Card key={i} style={{padding:"16px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <Ring value={r.v} max={r.max} size={56} sw={5} color={r.c}><span style={{fontSize:11,fontWeight:900,color:r.c}}>{r.v}</span></Ring>
            <p style={{fontSize:9,color:C.dim,letterSpacing:".1em",textAlign:"center"}}>{r.l}<br/><span style={{color:C.muted,fontSize:10}}>{r.s}</span></p>
          </Card>
        ))}
      </div>
      {showProtAlert&&(
        <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:18,padding:18,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:22}}>💪</span>
            <p style={{fontSize:14,fontWeight:700,color:C.yellow}}>Proteína em risco — só {prot}g de {profile.prot_meta}g hoje</p>
          </div>
          <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>Você precisa de {protRestante}g nas próximas refeições para proteger o músculo.</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["🥚 4 ovos = ~24g","🍗 150g frango = ~46g","🥛 1 whey = ~25g"].map((s,i)=>(
              <span key={i} style={{background:"rgba(251,191,36,0.12)",borderRadius:20,padding:"6px 12px",fontSize:11,color:C.yellow}}>{s}</span>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <Card style={{padding:20}}><p style={{fontSize:9,color:C.dim,letterSpacing:".12em",textTransform:"uppercase",marginBottom:10}}>Peso atual</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:32,fontWeight:700,color:C.yellow,marginBottom:6}}>{lw}<span style={{fontSize:14,color:C.muted,fontWeight:400}}> kg</span></p><Badge color={C.green}>-{lost.toFixed(1)}kg perdidos</Badge></Card>
        <Card style={{padding:20}}><p style={{fontSize:9,color:C.dim,letterSpacing:".12em",textTransform:"uppercase",marginBottom:10}}>Faltam</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:32,fontWeight:700,color:"#fff",marginBottom:6}}>{Math.max(0,(lw||0)-(profile.peso_meta||0)).toFixed(1)}<span style={{fontSize:14,color:C.muted,fontWeight:400}}> kg</span></p><Bar value={lost} max={(profile.peso||0)-(profile.peso_meta||0)} color={C.green} h={5}/></Card>
      </div>
      {isPlateauActive&&(
        <div style={{background:"rgba(251,146,60,0.08)",borderRadius:20,padding:20,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
          <p style={{fontSize:13,fontWeight:700,color:"rgba(251,146,60,1)",marginBottom:12}}>⚠️ Plateau detectado — {plateauDays} dias sem variação</p>
          <Btn onClick={analyzePlateau} disabled={loadingPlateau} full>{loadingPlateau?"Analisando...":"Analisar com Coach IA"}</Btn>
          {plateauAnalysis&&<p style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.7,marginTop:12,whiteSpace:"pre-line"}}>{plateauAnalysis}</p>}
        </div>
      )}
      <div style={{background:"rgba(251,191,36,0.06)",borderRadius:20,padding:20,marginBottom:20,position:"relative",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(251,191,36,.5),transparent)"}}/>
        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:38,height:38,borderRadius:12,background:"rgba(251,191,36,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🧠</div>
          <div style={{flex:1}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.yellow,fontWeight:700,marginBottom:8}}>Coach IA · Musy + Cariani</p>{insight?<p style={{fontSize:14,color:"rgba(255,255,255,.75)",lineHeight:1.75}}>{insight}</p>:<Spin text="Gerando insight"/>}{insight&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:6,flexWrap:"wrap"}}>{[{l:"📊 Estou em plateau",prompt:"plateau"},{l:"🍽️ Vou comer fora",prompt:"comer_fora"},{l:"📋 Plano da semana",prompt:"plano_semana"},{l:"💪 Proteger músculo",prompt:"proteger_musculo"}].map(acao=><button key={acao.prompt} onClick={async()=>{setInsight("...");const lw=weights[0]?.peso||profile?.peso;const last7=meals.filter(m=>new Date()-new Date(m.data)<=7*86400000);const avgProt=last7.length>0?Math.round(last7.reduce((s,m)=>s+(m.proteina||0),0)/7):0;const wkTrain=trainings.filter(t=>new Date()-new Date(t.data)<7*86400000).length;const prompts={plateau:`Cleiton, ${lw}kg (meta ${profile.peso_meta}kg), proteína média ${avgProt}g/${profile.prot_meta}g, ${wkTrain} treinos essa semana. Está em plateau. Dê 3 ações concretas e diretas para quebrar o plateau agora.`,comer_fora:`Cleiton vai comer fora hoje. Meta calórica: ${profile.cal_meta}kcal. Proteína meta: ${profile.prot_meta}g. Já consumiu hoje: ${cal}kcal e ${prot}g de proteína. Dê uma estratégia prática: o que pedir, o que evitar e como compensar no restante do dia.`,plano_semana:`Crie um plano objetivo para Cleiton essa semana. Peso: ${lw}kg, meta: ${profile.peso_meta}kg. Treinos na semana passada: ${wkTrain}. Proteína média: ${avgProt}g/${profile.prot_meta}g. Plano com: dias de treino recomendados, meta de proteína diária e 1 ajuste prioritário na alimentação. Seja direto e específico.`,proteger_musculo:`Cleiton está em déficit calórico. Peso: ${lw}kg, ${profile.prot_meta}g de proteína/dia. Proteína média essa semana: ${avgProt}g. Dê 4 estratégias específicas para preservar massa muscular durante o emagrecimento. Foco em prática, não teoria.`};try{const r=await callAI([{role:"user",content:prompts[acao.prompt]}],"Coach Paulo Musy + Renato Cariani. Português direto. Máximo 5 frases.",400);setInsight(r);}catch{setInsight("Erro ao carregar. Tente novamente.");}}} style={{padding:"7px 12px",borderRadius:20,fontSize:11,border:"1px solid rgba(250,204,21,0.25)",background:"rgba(250,204,21,0.08)",color:C.yellow,cursor:"pointer",fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s"}}>{acao.l}</button>)}</div>}</div>
        </div>
      </div>
      <div style={{background:treinouHoje?"rgba(74,222,128,0.08)":"rgba(96,165,250,0.08)",border:`1px solid ${treinouHoje?"rgba(74,222,128,0.25)":"rgba(96,165,250,0.25)"}`,borderRadius:16,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{fontSize:11,fontWeight:700,marginBottom:3,color:treinouHoje?C.green:C.blue}}>{treinouHoje?"⚡ Dia de treino":"😴 Dia de descanso"}</p>
            <p style={{fontSize:13,fontWeight:800,color:treinouHoje?C.green:C.blue}}>Meta ajustada: {calCiclo} kcal</p>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>{treinouHoje?`+${calDiff} kcal — carboidratos extras para recuperação`:`${calDiff} kcal — déficit maior no descanso`}</p>
          </div>
          <div style={{width:48,height:48,borderRadius:14,flexShrink:0,background:treinouHoje?"rgba(74,222,128,0.15)":"rgba(96,165,250,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{treinouHoje?"🏋️":"🛋️"}</div>
        </div>
        {treinouHoje&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)"}}><p style={{fontSize:11,color:C.muted,lineHeight:1.6}}>💡 Priorize carboidratos na refeição pós-treino para repor glicogênio e proteger o músculo.</p></div>}
      </div>
      <Card style={{marginBottom:20}}>
        <SLbl>Semana — calorias & treinos</SLbl>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:60}}>
          {week.map((d,i)=>{const pct=Math.min(1,d.cal/(profile.cal_meta||2800)),h=8+pct*46;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{d.tr&&<div style={{width:6,height:6,borderRadius:"50%",background:C.green,marginBottom:2}}/>}<div style={{width:"100%",height:h,borderRadius:4,background:d.cal>(profile.cal_meta||2800)?"rgba(248,113,113,.4)":d.today?C.yellow:"rgba(250,204,21,.22)",boxShadow:d.today?"0 0 8px rgba(250,204,21,.35)":"none"}}/><span style={{fontSize:8,color:d.today?C.yellow:C.dim}}>{d.dw}</span></div>);})}
        </div>
      </Card>
      <Card style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><p style={{fontSize:13,fontWeight:700,marginBottom:2}}>💧 Hidratação</p><p style={{fontSize:11,color:C.muted}}>{aguaCopos} de 16 copos · {(aguaCopos*250/1000).toFixed(1)}L de 4L</p></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={removeCopo} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.07)",color:C.muted,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>−</button>
            <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:C.blue,minWidth:28,textAlign:"center"}}>{aguaCopos}</span>
            <button onClick={addCopo} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(96,165,250,0.2)",color:C.blue,fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>+</button>
          </div>
        </div>
        <Bar value={aguaCopos} max={16} color={C.blue} h={6}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:14}}>
          {blocosAgua.map((b,i)=>{const ant=blocosAgua.slice(0,i).reduce((s,x)=>s+x.meta,0),cur=Math.min(Math.max(0,aguaCopos-ant),b.meta),ok=cur>=b.meta;return(
            <div key={i} style={{background:ok?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.04)",border:ok?"1px solid rgba(96,165,250,0.3)":"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
              <p style={{fontSize:16,marginBottom:4}}>{b.emoji}</p>
              <p style={{fontSize:9,color:ok?C.blue:C.dim,fontWeight:700,marginBottom:2}}>{b.label}</p>
              <p style={{fontSize:9,color:C.dim}}>{b.horario}</p>
              <p style={{fontSize:11,fontWeight:800,color:ok?C.blue:C.muted,marginTop:4}}>{cur}/{b.meta}</p>
            </div>
          );})}
        </div>
      </Card>
    </div>
  );
}

// TRAINING
function Training({profile,trainings,onAdd,onDelete,onImport}){
  const [show,setShow]=useState(false);
  const [mod,setMod]=useState(MODALITIES[0]);
  const [dur,setDur]=useState("");
  const [notes,setNotes]=useState("");
  const [hr,setHr]=useState("");
  const [analysis,setAnalysis]=useState("");
  const [loadA,setLoadA]=useState(false);
  const [plan,setPlan]=useState("");
  const [loadP,setLoadP]=useState(false);
  const [filter,setFilter]=useState("all");
  const [date,setDate]=useState(todayStr());
  const [rir,setRir]=useState("");
  const [planoMensal,setPlanoMensal]=useState("");
  const [loadPM,setLoadPM]=useState(false);
  const [showPlanoMensal,setShowPlanoMensal]=useState(false);
  const [showImport,setShowImport]=useState(false);
  const [importUrl,setImportUrl]=useState("");
  const [importing,setImporting]=useState(false);
  const [importResult,setImportResult]=useState(null);
  const csvRef=useRef(null);

  const processCSVRows=async(rows)=>{
    const toInsert=[];
    for(const row of rows){
      const type=(row["Type"]||row[" Type "]||"").trim();
      const mod=HF_TYPE_MAP[type];
      if(!mod)continue;
      const dur=parseHFTime(row["Total Time"]);
      if(dur<5)continue;
      const date=parseHFDate(row["Date"]);
      if(!date)continue;
      const hora=(row["Time"]||"").slice(0,5);
      const isDup=trainings.some(t=>t.data===date&&t.modalidade===mod.id&&(t.hora||"").slice(0,5)===hora);
      if(isDup)continue;
      const fc=parseInt((row["Avg. Heart Rate"]||"0").replace(/\D/g,""))||0;
      const cals=parseInt((row["Active Calories"]||"0").replace(/\D/g,""))||0;
      const dist=(row["Distance"]||"").replace(/"/g,"").trim();
      const parts=[dist&&dist!=="0 km"&&dist,cals&&`${cals} kcal`,row["Temperature"]&&row["Temperature"]!=="0 C"&&row["Temperature"]].filter(Boolean);
      toInsert.push({tipo:mod.label,modalidade:mod.id,duracao:dur,fc,notas:parts.join(" · "),data:date,hora,xp:mod.xp,fonte:"apple_watch"});
    }
    if(toInsert.length===0)return{imported:0,skipped:rows.length};
    const n=await onImport(toInsert);
    return{imported:n,skipped:rows.length-n};
  };

  const importFromUrl=async()=>{
    setImporting(true);setImportResult(null);
    try{
      const match=importUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const gidMatch=importUrl.match(/gid=(\d+)/);
      if(!match)throw new Error("URL inválida. Cole a URL do Google Sheets.");
      const csvUrl=`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gidMatch?.[1]||"0"}`;
      const res=await fetch(csvUrl);
      if(!res.ok)throw new Error("Não foi possível acessar. Verifique se a planilha está pública.");
      const text=await res.text();
      const rows=parseCSV(text);
      const result=await processCSVRows(rows);
      setImportResult(result);
    }catch(e){alert("Erro: "+e.message);}
    setImporting(false);
  };

  const importFromFile=(file)=>{
    if(!file)return;
    setImporting(true);setImportResult(null);
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{const rows=parseCSV(e.target.result);const result=await processCSVRows(rows);setImportResult(result);}
      catch(ex){alert("Erro ao ler arquivo: "+ex.message);}
      setImporting(false);
    };
    reader.readAsText(file);
  };

  const analyze=async()=>{
    setLoadA(true);
    try{const r=await callAI([{role:"user",content:`Atleta: ${profile?.nome}, ${profile?.peso}kg, meta ${profile?.peso_meta}kg, Ultraman. Treino: ${mod.label}, ${dur} min${hr?`, FC ${hr}bpm`:""}. ${notes?"Notas: "+notes:""} Análise: calorias estimadas, estímulo, recuperação.`}],"Coach Paulo Musy + Renato Cariani. Português.",400);setAnalysis(r);}
    catch{setAnalysis("Ótimo treino!");}
    setLoadA(false);
  };
  const save=()=>{
    onAdd({tipo:mod.label,modalidade:mod.id,duracao:parseInt(dur),fc:parseInt(hr)||0,rir,notas:notes,analise:analysis,data:date,hora:fmtNow(),xp:mod.xp});
    setShow(false);setDur("");setNotes("");setHr("");setAnalysis("");setDate(todayStr());setRir("");
  };
  const genPlan=async()=>{
    setLoadP(true);
    try{const hist=trainings.slice(0,7).map(t=>`${t.tipo}(${t.duracao}min)`).join(", ")||"nenhum";const r=await callAI([{role:"user",content:`Plano semanal: ${profile?.nome}, ${profile?.peso}kg, meta ${profile?.peso_meta}kg, Ultraman. Últimos: ${hist}. Protocolo Musy+Cariani. DIA → TREINO → DURAÇÃO → INTENSIDADE. Máx 280 palavras.`}],"Personal trainer triathlon. Português.",700);setPlan(r);}
    catch{setPlan("Erro. Tente novamente.");}
    setLoadP(false);
  };
  const genPlanoMensal=async()=>{
    setLoadPM(true);setShowPlanoMensal(true);
    const mesPassado=trainings.filter(t=>(new Date()-new Date(t.data))<=30*86400000);
    const porModalidade=MODALITIES.map(m=>({nome:m.label,total:mesPassado.filter(t=>t.modalidade===m.id).length,minutos:mesPassado.filter(t=>t.modalidade===m.id).reduce((s,t)=>s+(t.duracao||0),0)})).filter(m=>m.total>0);
    const resumoMes=porModalidade.length>0?porModalidade.map(m=>`${m.nome}: ${m.total}x (${m.minutos}min total)`).join(", "):"Nenhum treino registrado no último mês";
    const fcArr=mesPassado.filter(t=>t.fc>0);
    const fcMedia=fcArr.length>0?Math.round(fcArr.reduce((s,t)=>s+t.fc,0)/fcArr.length):null;
    const rirMedio=mesPassado.filter(t=>t.rir).length>0?mesPassado.filter(t=>t.rir)[0].rir:null;
    try{
      const r=await callAI([{role:"user",content:`Crie um plano de treino MENSAL completo para Cleiton.\n\nPERFIL:\n- Peso: ${weights[0]?.peso||profile?.peso}kg\n- Meta: ${profile?.peso_meta}kg\n- Objetivo: Ultraman (10km natação + 421km bike + 84km corrida)\n- Experiência: ${profile?.experiencia||"Intermediário"}\n- Limitações: ${profile?.limitacoes||"Nenhuma reportada"}\n\nMÊS ANTERIOR (últimos 30 dias):\n- Treinos realizados: ${mesPassado.length}\n- Por modalidade: ${resumoMes}${fcMedia?`\n- FC média: ${fcMedia}bpm`:""}${rirMedio?`\n- RIR médio: ${rirMedio}`:""}\n\nPROTOCOLO BASE (Musy + Cariani):\n- Musculação 3x/semana\n- Aeróbico diário (natação prioridade)\n- Tênis sábado (recreação)\n- Progressão gradual\n\nCrie um plano para as 4 semanas do próximo mês:\n- Semana 1: Adaptação/base\n- Semana 2: Progressão\n- Semana 3: Intensificação\n- Semana 4: Deload (redução 40%)\n\nPara cada semana liste:\nSegunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo\n→ Modalidade | Duração | Intensidade | Foco principal\n\nAo final: 1 objetivo mensurável para o mês.\nFormato limpo, direto. Máximo 400 palavras.`}],"Personal trainer especialista em triathlon e emagrecimento. Protocolo Musy + Cariani. Português.",800);
      setPlanoMensal(r);
    }catch{setPlanoMensal("Erro ao gerar plano. Tente novamente.");}
    setLoadPM(false);
  };
  const filtered=filter==="all"?trainings:trainings.filter(t=>t.modalidade===filter);
  const weekCount=trainings.filter(t=>new Date()-new Date(t.data)<7*86400000).length;
  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{marginBottom:20}}><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Treinos 🏋️</h2><p style={{fontSize:12,color:C.muted}}>Musculação · Natação · Bike · Tênis · Corrida</p></div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {[{v:weekCount,l:"Esta semana",c:C.yellow},{v:trainings.length,l:"Total",c:C.blue},{v:trainings.reduce((s,t)=>s+(t.duracao||0),0),l:"Minutos",c:C.green}].map((s,i)=>(
          <Card key={i} style={{flex:1,padding:"12px 10px",textAlign:"center"}}><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:s.c,marginBottom:3}}>{s.v}</p><p style={{fontSize:9,color:C.dim,letterSpacing:".1em",textTransform:"uppercase"}}>{s.l}</p></Card>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,marginTop:10}}>
        <Btn onClick={()=>setShow(true)} full>+ Registrar treino</Btn>
        <Btn onClick={()=>{setShowImport(true);setImportResult(null);}} variant="blue" style={{flexShrink:0}}>📥 Import</Btn>
        <Btn onClick={genPlan} variant="ghost" disabled={loadP} style={{flexShrink:0}}>{loadP?"...":"✦ Semana"}</Btn>
        <Btn onClick={genPlanoMensal} variant="purple" disabled={loadPM} style={{flexShrink:0}}>{loadPM?"...":"📅 Mês"}</Btn>
      </div>
      {loadP&&<Spin text="Gerando plano"/>}
      {plan&&!loadP&&<Card style={{marginBottom:20,background:"rgba(167,139,250,.1)",border:"1px solid rgba(167,139,250,.2)"}}><p style={{fontSize:9,letterSpacing:".18em",textTransform:"uppercase",color:C.purple,marginBottom:12,fontWeight:800}}>✦ Plano Semanal</p><p style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.85,whiteSpace:"pre-line"}}>{plan}</p></Card>}
      {showPlanoMensal&&(
        <Card style={{marginBottom:20,background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <p style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:C.purple,fontWeight:800,marginBottom:4}}>📅 Plano Mensal · Musy + Cariani</p>
              <p style={{fontSize:11,color:C.dim}}>Baseado nos seus últimos 30 dias</p>
            </div>
            <button onClick={()=>{setShowPlanoMensal(false);setPlanoMensal("");}} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",color:C.muted,fontSize:13}}>✕</button>
          </div>
          {loadPM&&<Spin text="Coach elaborando plano mensal"/>}
          {planoMensal&&!loadPM&&(
            <>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.9,whiteSpace:"pre-line",marginBottom:14}}>{planoMensal}</p>
              <button onClick={()=>{const blob=new Blob([planoMensal],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`plano-treino-${todayStr()}.txt`;a.click();URL.revokeObjectURL(url);}} style={{width:"100%",border:"none",borderRadius:12,padding:"11px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"rgba(167,139,250,0.15)",color:C.purple}}>⬇ Baixar plano em TXT</button>
            </>
          )}
        </Card>
      )}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16}}>
        {[{id:"all",label:"Todos",color:C.yellow,emoji:"🏅"},...MODALITIES].map(m=>(
          <button key={m.id} onClick={()=>setFilter(m.id)} style={{padding:"6px 14px",borderRadius:20,border:filter===m.id?`1.5px solid ${m.color}`:"1.5px solid rgba(255,255,255,.1)",background:filter===m.id?`${m.color}15`:"transparent",color:filter===m.id?m.color:C.muted,fontSize:11,fontWeight:filter===m.id?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {m.emoji} {m.label||"Todos"}
          </button>
        ))}
      </div>
      <SLbl>Histórico</SLbl>
      {filtered.length===0?<div style={{textAlign:"center",padding:"40px 0",color:C.dim}}><p style={{fontSize:36,marginBottom:10}}>🏋️</p><p style={{fontSize:13}}>Nenhum treino registrado</p></div>:
        filtered.map(t=>{
          const m=MODALITIES.find(x=>x.id===t.modalidade)||MODALITIES[0];
          return(
            <Card key={t.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:t.analise?10:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:38,height:38,borderRadius:11,background:`${m.color}15`,border:`1px solid ${m.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.emoji}</div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <p style={{fontSize:14,fontWeight:700}}>{t.tipo}</p>
                      <Badge color={m.color}>{t.duracao}min</Badge>
                      {t.fc>0&&<Badge color={C.red}>FC {t.fc}</Badge>}
                      {t.rir&&<Badge color={C.orange}>RIR {t.rir}</Badge>}
                      {t.fonte==="apple_watch"&&<Badge color={C.blue}>⌚</Badge>}
                    </div>
                    <p style={{fontSize:11,color:C.muted}}>{fmt(t.data)}{t.hora?` · ${t.hora}`:""}</p>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Badge color={C.yellow}>+{t.xp||m.xp}XP</Badge>
                  <DelBtn onClick={()=>onDelete(t.id)}/>
                </div>
              </div>
              {t.analise&&<p style={{fontSize:11,color:C.muted,lineHeight:1.65,borderTop:`1px solid ${C.border}`,paddingTop:10}}>{t.analise}</p>}
            </Card>
          );
        })
      }
      {show&&(
        <Sheet onClose={()=>setShow(false)} title="🏋️ Registrar Treino">
          <SLbl>Modalidade</SLbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {MODALITIES.map(m=>(
              <button key={m.id} onClick={()=>setMod(m)} style={{padding:"12px 10px",borderRadius:14,border:mod.id===m.id?`2px solid ${m.color}`:"1.5px solid rgba(255,255,255,.08)",background:mod.id===m.id?`${m.color}15`:"transparent",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:20}}>{m.emoji}</span><span style={{fontSize:12,fontWeight:mod.id===m.id?800:400,color:mod.id===m.id?m.color:C.muted}}>{m.label}</span>
              </button>
            ))}
          </div>
          <FIn label="Data" type="date" value={date} onChange={setDate}/>
          <FIn label="Duração (minutos)" type="number" req value={dur} onChange={setDur} placeholder="Ex: 60"/>
          <FIn label="FC média (bpm) — Apple Watch" type="number" value={hr} onChange={setHr} placeholder="Ex: 148"/>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>RIR — Repetições na reserva <span style={{color:C.dim,fontWeight:400,fontSize:9,marginLeft:6}}>(quantas reps sobraram no tanque)</span></p>
            <div style={{display:"flex",gap:6}}>
              {[{v:"0",l:"Falha"},{v:"1",l:"Quase"},{v:"2",l:"Difícil"},{v:"3",l:"Moderado"},{v:"4+",l:"Fácil"}].map(op=>(
                <button key={op.v} onClick={()=>setRir(op.v)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:rir===op.v?`2px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:rir===op.v?"rgba(250,204,21,.12)":"transparent",color:rir===op.v?C.yellow:C.muted,fontSize:10,fontWeight:rir===op.v?800:400,cursor:"pointer",fontFamily:"inherit",textAlign:"center",lineHeight:1.4}}>
                  <span style={{display:"block",fontSize:14,fontWeight:900}}>{op.v}</span>
                  <span style={{fontSize:8}}>{op.l}</span>
                </button>
              ))}
            </div>
          </div>
          <FIn label="Notas" value={notes} onChange={setNotes} placeholder="Ex: Agachamento 4x10"/>
          {loadA&&<Spin text="Analisando"/>}
          {analysis&&!loadA&&<div style={{background:"rgba(250,204,21,.06)",border:"1px solid rgba(250,204,21,.15)",borderRadius:14,padding:14,marginBottom:16}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.yellow,marginBottom:8,fontWeight:800}}>✦ Análise</p><p style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>{analysis}</p></div>}
          {!analysis&&(
            <button onClick={async()=>{const prompt=`Atleta fazendo ${mod.label}. Equipamento/situação: "${notes||"equipamentos padrão de academia"}". Sugira 3 exercícios substitutos para o mesmo grupo muscular com equipamento diferente. Formato: Exercício → Equipamento → Por que substitui bem.`;setAnalysis("Buscando substitutos...");try{const r=await callAI([{role:"user",content:prompt}],"Personal trainer especialista. Português direto.",300);setAnalysis(r);}catch{setAnalysis("Erro. Tente novamente.");}}} style={{width:"100%",border:"none",borderRadius:13,padding:"12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:"rgba(96,165,250,.12)",color:C.blue,marginBottom:8}}>
              🔄 Não tenho equipamento — sugerir substituto
            </button>
          )}
          <div style={{display:"flex",gap:8}}>
            {!analysis&&<Btn onClick={analyze} variant="ghost" disabled={!dur||loadA}>Analisar IA</Btn>}
            <Btn onClick={save} full disabled={!dur}>Salvar</Btn>
          </div>
        </Sheet>
      )}
      {showImport&&(
        <Sheet onClose={()=>{setShowImport(false);setImportResult(null);}} title="📥 Importar Treinos" subtitle="HealthFit · Apple Watch · Google Sheets">
          <input ref={csvRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>importFromFile(e.target.files[0])}/>
          {importResult?(
            <div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <p style={{fontSize:22,fontWeight:800,color:C.green,marginBottom:6}}>{importResult.imported} treinos importados</p>
              <p style={{fontSize:13,color:C.muted,marginBottom:24}}>{importResult.skipped} já existiam ou ignorados</p>
              <Btn onClick={()=>{setShowImport(false);setImportResult(null);}} full>Fechar</Btn>
            </div>
          ):(
            <>
              <div style={{background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.15)",borderRadius:14,padding:14,marginBottom:18}}>
                <p style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:6}}>Como exportar do HealthFit</p>
                <p style={{fontSize:11,color:C.muted,lineHeight:1.8}}>{"1. Abra o Google Sheets com seus treinos\n2. Cole a URL abaixo\n   OU\n3. Baixe como CSV e faça upload".split("\n").map((l,i)=><span key={i}>{l}<br/></span>)}</p>
              </div>
              <p style={{fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:C.dim,marginBottom:8,fontWeight:700}}>URL do Google Sheets</p>
              <input value={importUrl} onChange={e=>setImportUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"#fff",fontFamily:"inherit",marginBottom:12,boxSizing:"border-box"}}/>
              <Btn onClick={importFromUrl} full disabled={!importUrl.trim()||importing}>{importing?"Importando...":"🌐 Importar da URL"}</Btn>
              <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}><div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/><span style={{fontSize:11,color:C.dim}}>ou</span><div style={{flex:1,height:1,background:"rgba(255,255,255,.08)"}}/></div>
              <Btn onClick={()=>csvRef.current?.click()} variant="ghost" full disabled={importing}>📂 Upload CSV</Btn>
              {importing&&<Spin text="Importando treinos"/>}
              <div style={{marginTop:16,background:"rgba(250,204,21,.06)",border:"1px solid rgba(250,204,21,.12)",borderRadius:12,padding:12}}>
                <p style={{fontSize:10,color:C.dim,lineHeight:1.7}}>Tipos importados: Corrida · Tênis · Caminhada · Musculação · Bike · Natação · HIIT. Duplicatas são ignoradas automaticamente.</p>
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

// NUTRITION — 4 subtabs: Hoje / Calendário / TACO / Foto IA
function Nutrition({profile,meals,onAdd,onDelete}){
  const [sub,setSub]=useState("hoje");
  const [selDate,setSelDate]=useState(todayStr());
  const [mealDate,setMealDate]=useState(todayStr());
  const [mealType,setMealType]=useState("almoco");
  const [loadImg,setLoadImg]=useState(false);
  const [imgRes,setImgRes]=useState(null);
  const [imgPrev,setImgPrev]=useState(null);
  const fileRef=useRef();
  const [tacoQ,setTacoQ]=useState("");
  const [tacoR,setTacoR]=useState([]);
  const [tacoSel,setTacoSel]=useState(null);
  const [tacoQtd,setTacoQtd]=useState("100");
  const [loadTaco,setLoadTaco]=useState(false);

  const tk=todayStr();
  const dayMeals=meals.filter(m=>m.data===selDate);
  const cal=dayMeals.reduce((s,m)=>s+(m.calorias||0),0);
  const prot=dayMeals.reduce((s,m)=>s+(m.proteina||0),0);
  const carbs=dayMeals.reduce((s,m)=>s+(m.carbs||0),0);
  const fat=dayMeals.reduce((s,m)=>s+(m.gordura||0),0);

  const calDays=Array.from({length:35},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-34+i);
    const k=d.toISOString().slice(0,10);
    const c=meals.filter(m=>m.data===k).reduce((s,m)=>s+(m.calorias||0),0);
    return{k,day:d.getDate(),cal:c,today:k===tk,sel:k===selDate};
  });

  const processPhoto=(file)=>{
    setLoadImg(true);
    const reader=new FileReader();
    reader.onload=async(e)=>{
      const url=e.target.result;setImgPrev(url);
      const b64=url.split(",")[1];
      try{const r=await callVision(b64,file.type,'Analise esta refeição. JSON: {"nome":"nome da refeição","calorias":número,"proteina":número,"carbs":número,"gordura":número,"descricao":"breve descrição","dica":"dica nutricional para atleta em emagrecimento"}');setImgRes(r||{nome:"Refeição",calorias:400,proteina:20,carbs:40,gordura:15,descricao:"",dica:""});}
      catch{setImgRes({nome:"Refeição",calorias:400,proteina:20,carbs:40,gordura:15,descricao:"",dica:""});}
      setLoadImg(false);
    };
    reader.readAsDataURL(file);
  };

  const searchTaco=async()=>{
    if(!tacoQ.trim())return;
    setLoadTaco(true);
    try{const r=await DB.get("alimentos_taco",`?nome=ilike.*${tacoQ.toLowerCase().trim()}*&limit=8`);setTacoR(r||[]);}
    catch{setTacoR([]);}
    setLoadTaco(false);
  };

  const tacoMacros=(food,qtd)=>{
    const f=parseFloat(qtd)/(food.porcao_padrao||100);
    return{calorias:Math.round((food.calorias||0)*f),proteina:Math.round((food.proteina||0)*f*10)/10,carbs:Math.round((food.carbs||0)*f*10)/10,gordura:Math.round((food.gordura||0)*f*10)/10};
  };

  const saveMeal=(data)=>{
    onAdd({...data,tipo:mealType,data:mealDate,hora:fmtNow()});
    setImgRes(null);setImgPrev(null);setTacoSel(null);setTacoQ("");setTacoR([]);
  };

  const TypeSelector=()=>(
    <div style={{marginBottom:14}}>
      <p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Tipo de refeição</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {MEAL_TYPES.map(t=>(
          <button key={t.id} onClick={()=>setMealType(t.id)} style={{padding:"6px 10px",borderRadius:20,border:mealType===t.id?`1.5px solid ${t.color}`:"1.5px solid rgba(255,255,255,.08)",background:mealType===t.id?`${t.color}20`:"transparent",color:mealType===t.id?t.color:C.muted,fontSize:11,fontWeight:mealType===t.id?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );

  const MealCard=({m})=>{
    const mt=MEAL_TYPES.find(t=>t.id===(m.tipo||m.tipo_refeicao));
    return(
      <Card style={{marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
        {m.foto?<img src={m.foto} alt="" style={{width:50,height:50,borderRadius:11,objectFit:"cover",flexShrink:0}}/>:
          <div style={{width:50,height:50,borderRadius:11,background:`${mt?.color||C.yellow}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{mt?.label?.slice(0,2)||"🍽️"}</div>}
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <p style={{fontSize:13,fontWeight:700}}>{m.nome}</p>
            {mt&&<Badge color={mt.color} style={{fontSize:8}}>{mt.label}</Badge>}
          </div>
          <p style={{fontSize:11,color:C.muted}}>{m.hora} · <span style={{color:C.yellow}}>{m.calorias}kcal</span> · <span style={{color:C.purple}}>{m.proteina}g prot</span></p>
          {mt&&<p style={{fontSize:10,color:C.dim,marginTop:2}}>{mt.label}{mt.horario?` · ${mt.horario}`:""}</p>}
        </div>
        <DelBtn onClick={()=>onDelete(m.id)}/>
      </Card>
    );
  };

  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{marginBottom:20}}><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Nutrição 🍽️</h2><p style={{fontSize:12,color:C.muted}}>Meta: {profile?.cal_meta}kcal · {profile?.prot_meta}g proteína</p></div>
      <Tabs2 tabs={[{id:"hoje",label:"Hoje"},{id:"cal",label:"Calendário"},{id:"taco",label:"TACO 🇧🇷"},{id:"foto",label:"Foto IA"}]} active={sub} onChange={setSub}/>

      {sub==="hoje"&&(
        <>
          <Card style={{marginBottom:14,background:"rgba(250,204,21,.03)",border:"1px solid rgba(250,204,21,.1)"}}>
            <SLbl>Macros — {fmt(selDate)}</SLbl>
            {[{l:"Calorias",v:cal,max:profile?.cal_meta||2800,c:C.yellow,u:"kcal"},{l:"Proteína",v:prot,max:profile?.prot_meta||336,c:C.purple,u:"g"},{l:"Carboidratos",v:carbs,max:profile?.carbs_meta||250,c:C.blue,u:"g"},{l:"Gordura",v:fat,max:profile?.gord_meta||70,c:C.orange,u:"g"}].map(m=>(
              <div key={m.l} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:C.muted,fontWeight:600}}>{m.l}</span><span style={{fontSize:12,fontWeight:800,color:m.c}}>{m.v}{m.u} <span style={{color:C.dim}}>/ {m.max}{m.u}</span></span></div>
                <Bar value={m.v} max={m.max} color={m.c} h={6}/>
              </div>
            ))}
          </Card>
          {dayMeals.length>0&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {MEAL_TYPES.filter(t=>dayMeals.some(m=>(m.tipo||m.tipo_refeicao)===t.id)).map(t=>{
                const count=dayMeals.filter(m=>(m.tipo||m.tipo_refeicao)===t.id).length;
                return<span key={t.id} style={{background:`${t.color}20`,borderRadius:20,padding:"5px 10px",fontSize:11,color:t.color}}>{t.label.slice(0,2)} {count}</span>;
              })}
            </div>
          )}
          <FIn label="Ver outro dia" type="date" value={selDate} onChange={v=>{setSelDate(v);setMealDate(v);}}/>
          <SLbl mt={4}>Refeições — {fmt(selDate)}</SLbl>
          {dayMeals.length===0?<div style={{textAlign:"center",padding:"24px 0",color:C.dim}}><p style={{fontSize:28,marginBottom:8}}>🍽️</p><p style={{fontSize:13}}>Nenhuma refeição neste dia</p><p style={{fontSize:11,marginTop:4}}>Use "TACO 🇧🇷" ou "Foto IA"</p></div>:
            MEAL_TYPES.map(t=>{const group=dayMeals.filter(m=>(m.tipo||m.tipo_refeicao)===t.id);if(!group.length)return null;return(<div key={t.id}><p style={{fontSize:10,letterSpacing:".15em",textTransform:"uppercase",color:t.color,marginTop:16,marginBottom:8,fontWeight:700}}>{t.label}{t.horario?` · ${t.horario}`:""}</p>{group.map(m=><MealCard key={m.id} m={m}/>)}</div>);})
          }
        </>
      )}

      {sub==="cal"&&(
        <>
          <SLbl>Últimos 35 dias — toque para ver refeições</SLbl>
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {calDays.map(d=>{
                const pct=Math.min(1,d.cal/(profile?.cal_meta||2800));
                const bg=d.sel?C.yellow:d.cal>0?`rgba(250,204,21,${.15+pct*.7})`:"rgba(255,255,255,.04)";
                const color=d.sel?"#000":d.cal>0&&pct>.5?"#000":C.dim;
                return(
                  <div key={d.k} onClick={()=>setSelDate(d.k)} style={{width:"calc(14.28% - 3px)",aspectRatio:"1",borderRadius:7,background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",border:d.today&&!d.sel?`2px solid ${C.yellow}`:"none"}}>
                    <span style={{fontSize:10,fontWeight:800,color}}>{d.day}</span>
                    {d.cal>0&&<span style={{fontSize:7,color:d.sel?"#000":C.muted}}>{d.cal}</span>}
                  </div>
                );
              })}
            </div>
            <p style={{fontSize:10,color:C.dim,marginTop:10,textAlign:"center"}}>Selecionado: {fmtFull(selDate)}</p>
          </Card>
          <SLbl>Refeições — {fmt(selDate)}</SLbl>
          {dayMeals.length===0?<p style={{fontSize:13,color:C.dim,textAlign:"center",padding:"16px 0"}}>Nenhuma refeição neste dia</p>:dayMeals.map(m=><MealCard key={m.id} m={m}/>)}
        </>
      )}

      {sub==="taco"&&(
        <>
          <div style={{background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.2)",borderRadius:14,padding:"12px 14px",marginBottom:16}}>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6}}>🇧🇷 <strong>Tabela TACO</strong> — Tabela Brasileira de Composição de Alimentos. Busque pelo nome e ajuste a quantidade.</p>
          </div>
          <FIn label="Data da refeição" type="date" value={mealDate} onChange={setMealDate}/>
          <TypeSelector/>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input value={tacoQ} onChange={e=>setTacoQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchTaco()} placeholder="Ex: frango grelhado, arroz..." style={{flex:1,background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
            <Btn onClick={searchTaco} disabled={loadTaco} style={{flexShrink:0}}>{loadTaco?"...":"Buscar"}</Btn>
          </div>
          {tacoR.length===0&&tacoQ&&!loadTaco&&<p style={{fontSize:13,color:C.dim,textAlign:"center",padding:"16px 0"}}>Nenhum resultado. Tente: "frango", "arroz", "feijao"</p>}
          {tacoR.map(food=>(
            <Card key={food.id} onClick={()=>setTacoSel(food)} style={{marginBottom:8,cursor:"pointer",border:tacoSel?.id===food.id?`1.5px solid ${C.yellow}`:`1px solid ${C.border}`,background:tacoSel?.id===food.id?"rgba(250,204,21,.06)":C.card}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><p style={{fontSize:13,fontWeight:700,marginBottom:3}}>{food.nome}</p><p style={{fontSize:11,color:C.muted}}>{food.categoria} · por {food.porcao_padrao||100}g</p></div>
                <div style={{textAlign:"right"}}><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:16,fontWeight:700,color:C.yellow}}>{food.calorias}</p><p style={{fontSize:9,color:C.dim}}>kcal</p></div>
              </div>
              {tacoSel?.id===food.id&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",gap:16,marginBottom:12}}>
                    {[{l:"Prot",v:`${food.proteina}g`,c:C.purple},{l:"Carbs",v:`${food.carbs}g`,c:C.blue},{l:"Gord",v:`${food.gordura}g`,c:C.orange}].map((m,i)=><div key={i} style={{textAlign:"center"}}><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:15,fontWeight:700,color:m.c}}>{m.v}</p><p style={{fontSize:9,color:C.dim}}>{m.l}</p></div>)}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="number" value={tacoQtd} onChange={e=>setTacoQtd(e.target.value)} style={{width:80,background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                    <span style={{fontSize:12,color:C.muted}}>g</span>
                    <Btn onClick={()=>{const m=tacoMacros(food,tacoQtd);saveMeal({nome:`${food.nome} (${tacoQtd}g)`,...m,foto:null,dica:"",descricao:""});}} style={{flex:1}}>Adicionar</Btn>
                  </div>
                  {tacoQtd&&parseFloat(tacoQtd)!==100&&<p style={{fontSize:11,color:C.muted,marginTop:8}}>Para {tacoQtd}g: {tacoMacros(food,tacoQtd).calorias}kcal · {tacoMacros(food,tacoQtd).proteina}g prot</p>}
                </div>
              )}
            </Card>
          ))}
        </>
      )}

      {sub==="foto"&&(
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&processPhoto(e.target.files[0])}/>
          {!imgPrev&&!loadImg&&(
            <>
              <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(255,255,255,.1)",borderRadius:18,padding:"44px 24px",textAlign:"center",cursor:"pointer",marginBottom:16,background:"rgba(255,255,255,.02)"}}>
                <p style={{fontSize:40,marginBottom:12}}>📷</p>
                <p style={{fontSize:14,fontWeight:700,marginBottom:6}}>Foto da refeição</p>
                <p style={{fontSize:12,color:C.muted,lineHeight:1.6}}>Câmera ou galeria — Claude analisa automaticamente</p>
              </div>
              <Btn onClick={()=>fileRef.current?.click()} full>Selecionar foto</Btn>
            </>
          )}
          {loadImg&&<Spin text="Claude analisando"/>}
          {imgRes&&imgPrev&&!loadImg&&(
            <>
              <img src={imgPrev} alt="" style={{width:"100%",borderRadius:14,marginBottom:14,maxHeight:200,objectFit:"cover"}}/>
              <h4 style={{fontFamily:"'Clash Display',sans-serif",fontSize:18,fontWeight:700,marginBottom:6}}>{imgRes.nome}</h4>
              {imgRes.descricao&&<p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.6}}>{imgRes.descricao}</p>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[{l:"Calorias",v:`${imgRes.calorias}kcal`,c:C.yellow},{l:"Proteína",v:`${imgRes.proteina}g`,c:C.purple},{l:"Carbs",v:`${imgRes.carbs}g`,c:C.blue},{l:"Gordura",v:`${imgRes.gordura}g`,c:C.orange}].map((m,i)=>(
                  <div key={i} style={{background:C.card,borderRadius:10,padding:10,textAlign:"center"}}><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:18,fontWeight:700,color:m.c,marginBottom:2}}>{m.v}</p><p style={{fontSize:9,color:C.dim,letterSpacing:".1em",textTransform:"uppercase"}}>{m.l}</p></div>
                ))}
              </div>
              {imgRes.dica&&<div style={{background:"rgba(250,204,21,.1)",border:"1px solid rgba(250,204,21,.18)",borderRadius:10,padding:"11px 13px",marginBottom:12}}><p style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.65}}>💡 {imgRes.dica}</p></div>}
              <FIn label="Data" type="date" value={mealDate} onChange={setMealDate}/>
              <TypeSelector/>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>{setImgRes(null);setImgPrev(null);}} variant="ghost">Refazer</Btn>
                <Btn onClick={()=>saveMeal({...imgRes,foto:imgPrev})} full>Salvar ✓</Btn>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// HEALTH — 3 subtabs: Peso / Xiaomi / Exames
function Health({profile,weights,compositions,onAddWeight,onAddComp,onDeleteWeight}){
  const [sub,setSub]=useState("peso");
  const [showW,setShowW]=useState(false);
  const [showX,setShowX]=useState(false);
  const [showMedidas,setShowMedidas]=useState(false);
  const [medidas,setMedidas]=useState([]);
  const [loadingMedidas,setLoadingMedidas]=useState(false);
  const [novasMedidas,setNovasMedidas]=useState({});
  const [marcadoresHist,setMarcadoresHist]=useState([]);
  const [showMarcadorSheet,setShowMarcadorSheet]=useState(false);
  const [novoMarcador,setNovoMarcador]=useState({nome:"",valor:"",unidade:"",status:"ok",referencia:""});
  const [wVal,setWVal]=useState(String(weights[0]?.peso||profile?.peso||""));
  const [wDate,setWDate]=useState(todayStr());
  const [xi,setXi]=useState({peso:"",gordura_pct:"",musculo_kg:"",agua_pct:"",proteina_pct:"",gordura_visceral:"",metabolismo_basal:"",massa_ossea:""});
  const [loadXi,setLoadXi]=useState(false);
  const [exImg,setExImg]=useState(null);
  const [exRes,setExRes]=useState(null);
  const [loadEx,setLoadEx]=useState(false);
  const [insight,setInsight]=useState("");
  const [loadIns,setLoadIns]=useState(false);
  const fileXiRef=useRef();
  const fileExRef=useRef();

  const lw=weights[0]?.peso||profile?.peso;
  const lost=Math.max(0,(profile?.peso||0)-(lw||0));
  const rem=Math.max(0,(lw||0)-(profile?.peso_meta||0));
  const prog=profile?.peso&&profile?.peso_meta?Math.min(100,Math.round((lost/((profile.peso)-(profile.peso_meta)))*100)):0;
  const lastComp=compositions[0];

  const getInsight=async()=>{
    setLoadIns(true);
    try{
      const ci=lastComp?`${lastComp.gordura_pct}% gordura, ${lastComp.musculo_kg}kg músculo, visceral ${lastComp.gordura_visceral}`:"";
      const r=await callAI([{role:"user",content:`${profile?.nome}: início ${profile?.peso}kg, atual ${lw}kg, meta ${profile?.peso_meta}kg. Perdeu ${lost.toFixed(1)}kg. ${ci}. Objetivo Ultraman. Análise médica como Paulo Musy em 3 frases.`}],"Médico especialista em saúde e performance. Português honesto.",300);
      setInsight(r);
    }catch{setInsight("Progresso sólido. Continue firme.");}
    setLoadIns(false);
  };

  const processZepp=(file)=>{
    setLoadXi(true);
    const reader=new FileReader();
    reader.onload=async(e)=>{
      try{
        const compressed=await compressImg(e.target.result);
        const b64=compressed.split(",")[1];
        const zp="Extraia valores do app Zepp Life. JSON com campos: peso, gordura_pct, musculo_kg, agua_pct, proteina_pct, gordura_visceral, metabolismo_basal, massa_ossea. Valores numeros, null se nao visivel.";const r=await callVision(b64,"image/jpeg",zp);
        if(r){setXi({peso:r.peso?.toString()||"",gordura_pct:r.gordura_pct?.toString()||"",musculo_kg:r.musculo_kg?.toString()||"",agua_pct:r.agua_pct?.toString()||"",proteina_pct:r.proteina_pct?.toString()||"",gordura_visceral:r.gordura_visceral?.toString()||"",metabolismo_basal:r.metabolismo_basal?.toString()||"",massa_ossea:r.massa_ossea?.toString()||""});setShowX(true);}
        else{alert("IA não conseguiu extrair dados. Tente outra foto ou preencha manualmente.");}
      }catch(e){alert("Erro ao analisar foto Zepp: "+e.message);}
      setLoadXi(false);
    };
    reader.readAsDataURL(file);
  };

  const saveXi=async()=>{
    const data={...Object.fromEntries(Object.entries(xi).map(([k,v])=>[k,parseFloat(v)||null])),data:todayStr()};
    await onAddComp(data);
    if(xi.peso) await onAddWeight({peso:parseFloat(xi.peso),data:todayStr()});
    setShowX(false);
    setXi({peso:"",gordura_pct:"",musculo_kg:"",agua_pct:"",proteina_pct:"",gordura_visceral:"",metabolismo_basal:"",massa_ossea:""});
  };

  const analyzeEx=(file)=>{
    setLoadEx(true);
    const reader=new FileReader();
    reader.onload=async(e)=>{
      const isPdf=file.type==="application/pdf";
      const ep=`Médico especialista medicina esportiva. Paciente: ${profile?.nome||"atleta"}, ${profile?.peso||130}kg, meta ${profile?.peso_meta||90}kg, objetivo Ultraman triathlon, fase de emagrecimento com treinos natação/bike/corrida. RETORNE APENAS JSON VÁLIDO: {"marcadores":[{"nome":"","valor":"","unidade":"","referencia":"","status":"ok|atencao|critico","interpretacao":"","impacto_treino":"como afeta treino e recuperação","recomendacao":"ação específica"}],"resumo":"","alertas":[],"pontos_positivos":[],"o_que_mudar":[{"marcador":"","acao":"ação concreta","prazo":"ex: 30 dias"}],"ajustes_nutricionais":["ajustes em proteína, carboidratos, gordura, vitaminas e minerais baseados nos resultados"],"suplementacao":["suplemento e dosagem recomendada"],"impacto_performance":"","plano_30_dias":""}`;
      try{
        let r;
        if(isPdf){
          const body={contents:[{parts:[{inlineData:{mimeType:"application/pdf",data:e.target.result.split(",")[1]}},{text:"Retorne APENAS JSON válido sem markdown.\n\n"+ep}]}],generationConfig:{maxOutputTokens:8000,thinkingConfig:{thinkingBudget:0}}};
          const res=await fetch(GURL(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
          const d=await res.json();if(d.error)throw new Error(d.error.message);
          r=parseJSON(gParts(d));
        }else{
          const compressed=await compressImg(e.target.result,1400);
          setExImg(compressed);
          r=await callVision(compressed.split(",")[1],"image/jpeg",ep,4000);
        }
        if(r)setExRes(r);
        else alert("IA retornou resposta inválida. Tente novamente.");
      }catch(e){setExRes(null);alert("Erro ao analisar exame: "+e.message);}
      setLoadEx(false);
    };
    reader.readAsDataURL(file);
  };

  const exportEx=()=>{
    if(!exRes)return;
    const lines=["ANÁLISE DE EXAME — VIDA TRACKER",`Data: ${new Date().toLocaleDateString("pt-BR")}`,"","RESUMO:",exRes.resumo||"","","IMPACTO NA PERFORMANCE:",exRes.impacto_performance||"","","ALERTAS:",...(exRes.alertas||[]).map(a=>`• ${a}`),"","PONTOS POSITIVOS:",...(exRes.pontos_positivos||[]).map(a=>`• ${a}`),"","MARCADORES DETALHADOS:",...(exRes.marcadores||[]).flatMap(m=>[`\n${m.nome}: ${m.valor} ${m.unidade} (Ref: ${m.referencia}) — ${m.status?.toUpperCase()}`,`  ${m.interpretacao}`,m.recomendacao?`  💡 ${m.recomendacao}`:""])].join("\n");
    const blob=new Blob([lines],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`exame-${todayStr()}.txt`;a.click();URL.revokeObjectURL(url);
  };

  const sColor=(s)=>(!s||s==="ok")?C.green:(s==="crítico"||s==="critico")?C.red:C.orange;
  const camposMedidas=[{k:"cintura",l:"Cintura (cm)",ref:"Meta: < 94cm"},{k:"quadril",l:"Quadril (cm)",ref:"Rel. cintura/quadril"},{k:"peito",l:"Peito (cm)",ref:""},{k:"braco_d",l:"Braço Dir. (cm)",ref:"Flexionado"},{k:"braco_e",l:"Braço Esq. (cm)",ref:"Flexionado"},{k:"coxa_d",l:"Coxa Dir. (cm)",ref:""},{k:"coxa_e",l:"Coxa Esq. (cm)",ref:""},{k:"pescoco",l:"Pescoço (cm)",ref:""}];
  const salvarMedidas=async()=>{
    setLoadingMedidas(true);
    try{const data={...Object.fromEntries(Object.entries(novasMedidas).map(([k,v])=>[k,parseFloat(v)||null])),data:todayStr()};const [s]=await DB.post("medidas_corporais",data);setMedidas(m=>[s,...m]);setShowMedidas(false);setNovasMedidas({});}
    catch(e){console.error(e);}
    setLoadingMedidas(false);
  };
  useEffect(()=>{DB.get("medidas_corporais","?order=created_at.desc&limit=20").then(r=>setMedidas(r||[])).catch(()=>{});},[]);
  useEffect(()=>{DB.get("marcadores_exame","?order=created_at.desc&limit=100").then(r=>setMarcadoresHist(r||[])).catch(()=>{});},[]);

  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{marginBottom:20}}><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Saúde 📊</h2><p style={{fontSize:12,color:C.muted}}>Peso · Composição · Exames · Medidas</p></div>
      <Tabs2 tabs={[{id:"peso",label:"Peso"},{id:"comp",label:"Xiaomi"},{id:"exames",label:"Exames"},{id:"medidas",label:"Medidas"}]} active={sub} onChange={setSub}/>

      {sub==="peso"&&(
        <>
          <div style={{background:"linear-gradient(135deg,rgba(250,204,21,.07),rgba(250,204,21,.02))",border:"1px solid rgba(250,204,21,.18)",borderRadius:22,padding:20,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <Ring value={prog} max={100} size={78} sw={7} color={C.yellow}><span style={{fontFamily:"'Clash Display',sans-serif",fontSize:16,fontWeight:700,color:C.yellow}}>{prog}%</span></Ring>
              <div style={{flex:1}}>
                <p style={{fontSize:11,color:C.muted,marginBottom:5}}>Progresso total</p>
                <p style={{fontFamily:"'Clash Display',sans-serif",fontSize:28,fontWeight:700,color:C.yellow,marginBottom:4}}>-{lost.toFixed(1)} kg</p>
                <p style={{fontSize:11,color:C.muted}}>De {profile?.peso}kg → {profile?.peso_meta}kg</p>
                <p style={{fontSize:12,color:C.green,fontWeight:700,marginTop:4}}>Faltam {rem.toFixed(1)}kg</p>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            <Btn onClick={()=>setShowW(true)} full>+ Registrar peso</Btn>
            <Btn onClick={getInsight} variant="ghost" disabled={loadIns} style={{flexShrink:0}}>{loadIns?"...":"✦ Musy"}</Btn>
          </div>
          {loadIns&&<Spin text="Dr. Musy analisando"/>}
          {insight&&!loadIns&&<Card style={{marginBottom:18,background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.2)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.green,marginBottom:8,fontWeight:800}}>✦ Dr. Paulo Musy</p><p style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.7}}>{insight}</p></Card>}
          {weights.length>1&&<><SLbl>Evolução</SLbl><Card style={{marginBottom:16}}><div style={{display:"flex",gap:4,alignItems:"flex-end",height:72}}>{weights.slice(0,20).reverse().map((p,i,arr)=>{const all=arr.map(x=>x.peso),min=Math.min(...all),max=Math.max(...all),range=max-min||1,h=12+((p.peso-min)/range)*54,last=i===arr.length-1;return<div key={i} style={{flex:1,height:h,borderRadius:4,background:last?C.yellow:`rgba(250,204,21,${.15+(i/arr.length)*.55})`,boxShadow:last?"0 0 8px rgba(250,204,21,.4)":"none"}} title={`${p.peso}kg`}/>;})}</div></Card></>}
          <SLbl>Histórico</SLbl>
          {weights.length===0?<div style={{textAlign:"center",padding:"24px 0",color:C.dim}}><p style={{fontSize:28,marginBottom:8}}>⚖️</p><p style={{fontSize:13}}>Registre seu peso diariamente</p></div>:
            weights.slice(0,30).map((p,i)=>{
              const diff=i<weights.length-1?(parseFloat(p.peso)-parseFloat(weights[i+1]?.peso||p.peso)).toFixed(1):null;
              return(
                <Card key={p.id} style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:700,color:C.yellow}}>{p.peso} kg</p><p style={{fontSize:11,color:C.muted}}>{fmt(p.data)}</p></div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {diff!==null&&<Badge color={parseFloat(diff)<0?C.green:parseFloat(diff)>0?C.red:C.muted}>{parseFloat(diff)>0?"+":""}{diff}kg</Badge>}
                    <DelBtn onClick={()=>onDeleteWeight(p.id)}/>
                  </div>
                </Card>
              );
            })
          }
        </>
      )}

      {sub==="comp"&&(
        <>
          <div style={{background:"rgba(96,165,250,.1)",border:"1px solid rgba(96,165,250,.2)",borderRadius:16,padding:14,marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:6}}>📱 Balança Xiaomi — Zepp Life</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Tire foto da tela do Zepp Life — Claude extrai todos os valores automaticamente. Ou preencha manualmente.</p>
          </div>
          <input ref={fileXiRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&processZepp(e.target.files[0])}/>
          {loadXi&&<Spin text="Extraindo dados da balança"/>}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <Btn onClick={()=>fileXiRef.current?.click()} variant="blue" full disabled={loadXi}>📸 Foto Zepp Life → IA extrai</Btn>
            <Btn onClick={()=>setShowX(true)} variant="ghost" style={{flexShrink:0}}>Manual</Btn>
          </div>
          {lastComp&&(
            <>
              <SLbl>Última medição — {fmt(lastComp.data)}</SLbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[{l:"Gordura",v:`${lastComp.gordura_pct}%`,c:C.orange,ok:lastComp.gordura_pct},{l:"Músculo",v:`${lastComp.musculo_kg}kg`,c:C.green,ok:lastComp.musculo_kg},{l:"Visceral",v:`${lastComp.gordura_visceral}`,c:lastComp.gordura_visceral>12?C.red:C.green,ok:lastComp.gordura_visceral},{l:"Hidratação",v:`${lastComp.agua_pct}%`,c:C.blue,ok:lastComp.agua_pct},{l:"Proteína",v:`${lastComp.proteina_pct}%`,c:C.purple,ok:lastComp.proteina_pct},{l:"Met. Basal",v:`${lastComp.metabolismo_basal}`,c:C.yellow,ok:lastComp.metabolismo_basal}].filter(x=>x.ok).map((m,i)=>(
                  <Card key={i} style={{padding:"14px 13px"}}><p style={{fontSize:10,color:C.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>{m.l}</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:m.c}}>{m.v}</p></Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {sub==="exames"&&(
        <>
          <div style={{background:"rgba(96,165,250,.1)",border:"1px solid rgba(96,165,250,.2)",borderRadius:16,padding:14,marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:6}}>🩸 Exame de Sangue por Foto</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Tire foto do exame. Claude analisa marcadores e impacto na performance. Exporte o relatório em TXT.</p>
          </div>
          <input ref={fileExRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>e.target.files[0]&&analyzeEx(e.target.files[0])}/>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <Btn onClick={()=>fileExRef.current?.click()} variant="blue" full>📸 Foto ou PDF do exame</Btn>
            {exRes&&<Btn onClick={exportEx} variant="green" style={{flexShrink:0}}>⬇ Exportar</Btn>}
          </div>
          {loadEx&&<Spin text="Claude analisando"/>}
          {exRes&&!loadEx&&(
            <>
              {exImg&&<img src={exImg} alt="" style={{width:"100%",borderRadius:14,marginBottom:16,maxHeight:160,objectFit:"cover"}}/>}
              {/* Resumo + Performance */}
              <Card style={{marginBottom:12,background:"rgba(96,165,250,.1)",border:"1px solid rgba(96,165,250,.2)"}}>
                <p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.blue,marginBottom:8,fontWeight:800}}>✦ Resumo geral</p>
                <p style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.7}}>{exRes.resumo}</p>
                {exRes.impacto_performance&&<><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.purple,marginBottom:6,fontWeight:800,marginTop:12}}>⚡ Impacto na performance</p><p style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{exRes.impacto_performance}</p></>}
              </Card>
              {/* Plano 30 dias */}
              {exRes.plano_30_dias&&<Card style={{marginBottom:12,background:"rgba(250,204,21,.07)",border:"1px solid rgba(250,204,21,.2)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.yellow,marginBottom:8,fontWeight:800}}>🗓 Plano 30 dias</p><p style={{fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.7}}>{exRes.plano_30_dias}</p></Card>}
              {/* O que mudar */}
              {exRes.o_que_mudar?.length>0&&<Card style={{marginBottom:12,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.red,marginBottom:10,fontWeight:800}}>🔧 O que precisa mudar</p>{exRes.o_que_mudar.map((item,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}><div style={{width:6,height:6,borderRadius:"50%",background:C.red,marginTop:5,flexShrink:0}}/><div><p style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.85)",marginBottom:2}}>{item.marcador}</p><p style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{item.acao}</p>{item.prazo&&<span style={{fontSize:10,color:C.red,fontWeight:600}}>⏱ {item.prazo}</span>}</div></div>)}</Card>}
              {/* Alertas */}
              {exRes.alertas?.length>0&&<Card style={{marginBottom:12,background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.25)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.orange,marginBottom:8,fontWeight:800}}>⚠ Atenção</p>{exRes.alertas.map((a,i)=><p key={i} style={{fontSize:12,color:"rgba(255,255,255,.65)",marginBottom:4,lineHeight:1.5}}>• {a}</p>)}</Card>}
              {/* Ajustes nutricionais */}
              {exRes.ajustes_nutricionais?.length>0&&<Card style={{marginBottom:12,background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.25)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.purple,marginBottom:10,fontWeight:800}}>🥗 Ajustes nutricionais (macros)</p>{exRes.ajustes_nutricionais.map((a,i)=><p key={i} style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6,lineHeight:1.5}}>• {a}</p>)}</Card>}
              {/* Suplementação */}
              {exRes.suplementacao?.length>0&&<Card style={{marginBottom:12,background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.2)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.blue,marginBottom:10,fontWeight:800}}>💊 Suplementação recomendada</p>{exRes.suplementacao.map((s,i)=><p key={i} style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6,lineHeight:1.5}}>• {s}</p>)}</Card>}
              {/* Pontos positivos */}
              {exRes.pontos_positivos?.length>0&&<Card style={{marginBottom:12,background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)"}}><p style={{fontSize:9,letterSpacing:".15em",textTransform:"uppercase",color:C.green,marginBottom:8,fontWeight:800}}>✓ Pontos positivos</p>{exRes.pontos_positivos.map((a,i)=><p key={i} style={{fontSize:12,color:"rgba(255,255,255,.65)",marginBottom:4}}>• {a}</p>)}</Card>}
              {/* Marcadores detalhados */}
              <SLbl mt={4}>Marcadores detalhados</SLbl>
              {exRes.marcadores?.map((m,i)=>(
                <Card key={i} style={{marginBottom:10,borderLeft:`3px solid ${sColor(m.status)}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div><p style={{fontSize:13,fontWeight:700,marginBottom:4}}>{m.nome}</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:sColor(m.status)}}>{m.valor}<span style={{fontSize:11,color:C.muted,marginLeft:4}}>{m.unidade}</span></p></div>
                    <Badge color={sColor(m.status)} style={{flexShrink:0}}>{m.status}</Badge>
                  </div>
                  <p style={{fontSize:10,color:C.dim,marginBottom:6}}>Ref: {m.referencia}</p>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.6,marginBottom:6}}>{m.interpretacao}</p>
                  {m.impacto_treino&&<p style={{fontSize:11,color:C.purple,lineHeight:1.5,marginBottom:m.recomendacao?6:0}}>🏋️ {m.impacto_treino}</p>}
                  {m.recomendacao&&<p style={{fontSize:11,color:C.blue,lineHeight:1.5}}>💡 {m.recomendacao}</p>}
                </Card>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8,marginBottom:8}}>
                <Btn onClick={()=>{setExRes(null);setExImg(null);}} variant="ghost" full>Novo exame</Btn>
                {exRes?.marcadores&&<Btn onClick={async()=>{try{for(const m of exRes.marcadores){await DB.post("marcadores_exame",{nome:m.nome,valor:parseFloat(m.valor)||null,unidade:m.unidade||"",status:m.status||"ok",referencia:m.referencia||"",data:todayStr(),fonte:"foto_ia"});}const r=await DB.get("marcadores_exame","?order=created_at.desc&limit=100");setMarcadoresHist(r||[]);alert("Marcadores salvos!");}catch(e){alert("Erro: "+e.message);}}} variant="green" full>💾 Salvar histórico</Btn>}
              </div>
            </>
          )}
          <Btn onClick={()=>setShowMarcadorSheet(true)} variant="ghost" full style={{marginBottom:20}}>+ Adicionar marcador manualmente</Btn>
          {marcadoresHist.length>0&&(()=>{const nomes=[...new Set(marcadoresHist.map(m=>m.nome))];const prioritarios=["Vitamina B12","Vitamina D","Colesterol Total","HDL","LDL","Triglicerídeos","Glicose","Hemoglobina","Ferritina","TSH"];const ordenados=[...prioritarios.filter(p=>nomes.includes(p)),...nomes.filter(n=>!prioritarios.includes(n))];return(<><SLbl mt={8}>Histórico de marcadores</SLbl>{ordenados.map(nome=>{const registros=marcadoresHist.filter(m=>m.nome===nome).slice(0,6);const ultimo=registros[0];const sC=s=>s==="ok"?C.green:s==="crítico"?C.red:C.orange;return(<Card key={nome} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><p style={{fontSize:13,fontWeight:700,marginBottom:3}}>{nome}</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:sC(ultimo.status)}}>{ultimo.valor}<span style={{fontSize:11,color:C.muted,marginLeft:4}}>{ultimo.unidade}</span></p></div><div style={{textAlign:"right"}}><Badge color={sC(ultimo.status)}>{ultimo.status}</Badge><p style={{fontSize:10,color:C.dim,marginTop:4}}>{fmt(ultimo.data)}</p></div></div>{ultimo.referencia&&<p style={{fontSize:10,color:C.dim,marginBottom:8}}>Ref: {ultimo.referencia}</p>}{registros.length>1&&(<><p style={{fontSize:9,color:C.dim,letterSpacing:".12em",textTransform:"uppercase",marginBottom:6}}>Evolução</p><div style={{display:"flex",gap:6,alignItems:"flex-end"}}>{registros.slice().reverse().map((r,i)=>{const isLast=i===registros.length-1;return(<div key={r.id} style={{flex:1,textAlign:"center"}}><div style={{height:6,borderRadius:3,background:isLast?sC(r.status):`${sC(r.status)}50`,marginBottom:4}}/><p style={{fontSize:8,color:C.dim}}>{r.valor}</p><p style={{fontSize:7,color:C.dim}}>{fmt(r.data)}</p></div>);})}</div></>)}</Card>);})}</>);})()}
        </>
      )}

      {showW&&(
        <Sheet onClose={()=>setShowW(false)} title="⚖️ Registrar Peso">
          <FIn label="Peso (kg)" type="number" req value={wVal} onChange={setWVal} placeholder="Ex: 139.8"/>
          <FIn label="Data" type="date" value={wDate} onChange={setWDate}/>
          {wVal&&<div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:20}}><p style={{fontSize:12,color:C.muted,marginBottom:4}}>Meta: <strong style={{color:C.yellow}}>{profile?.peso_meta}kg</strong></p><p style={{fontSize:12,color:C.muted}}>Falta: <strong style={{color:C.green}}>{Math.max(0,parseFloat(wVal)-(profile?.peso_meta||0)).toFixed(1)}kg</strong></p></div>}
          <Btn onClick={()=>{if(!wVal)return;onAddWeight({peso:parseFloat(wVal),data:wDate});setShowW(false);}} full disabled={!wVal}>Salvar</Btn>
        </Sheet>
      )}

      {showX&&(
        <Sheet onClose={()=>setShowX(false)} title="📊 Dados Zepp Life" subtitle="Confirme ou preencha os valores da balança">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{k:"peso",l:"Peso (kg)",p:"139.8"},{k:"gordura_pct",l:"Gordura (%)",p:"39.0"},{k:"musculo_kg",l:"Músculo (kg)",p:"80.85"},{k:"agua_pct",l:"Água (%)",p:"43.5"},{k:"proteina_pct",l:"Proteína (%)",p:"14.3"},{k:"gordura_visceral",l:"Visceral",p:"16"},{k:"metabolismo_basal",l:"Met. Basal",p:"2527"},{k:"massa_ossea",l:"Massa Óssea",p:"4.35"}].map(field=>(
              <div key={field.k}>
                <p style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dim,marginBottom:6,fontWeight:700}}>{field.l}</p>
                <input type="number" value={xi[field.k]} onChange={e=>setXi(p=>({...p,[field.k]:e.target.value}))} placeholder={field.p}
                  style={{width:"100%",background:xi[field.k]?"rgba(250,204,21,.08)":"rgba(255,255,255,.05)",border:xi[field.k]?"1.5px solid rgba(250,204,21,.4)":"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            ))}
          </div>
          <Btn onClick={saveXi} full style={{marginTop:18}}>Salvar medição</Btn>
        </Sheet>
      )}

      {sub==="medidas"&&(
        <>
          {/* -- Executar no Supabase SQL Editor:
          create table if not exists medidas_corporais (
            id uuid default gen_random_uuid() primary key,
            cintura numeric, quadril numeric, braco_d numeric,
            braco_e numeric, coxa_d numeric, coxa_e numeric,
            pescoco numeric, peito numeric,
            data date default current_date, obs text,
            created_at timestamptz default now()
          );
          alter table medidas_corporais disable row level security; -- */}
          <div style={{background:"rgba(96,165,250,.1)",border:"1px solid rgba(96,165,250,.2)",borderRadius:16,padding:14,marginBottom:18}}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:6}}>📏 Medidas Corporais</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Registre mensalmente. A balança mente durante recomposição — as medidas mostram a verdade.</p>
          </div>
          <Btn onClick={()=>setShowMedidas(true)} full style={{marginBottom:20}}>+ Registrar medidas</Btn>
          {medidas.length>0&&(
            <>
              <SLbl>Última medição — {fmt(medidas[0].data)}</SLbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {camposMedidas.filter(c=>medidas[0][c.k]).map((campo,i)=>(
                  <Card key={i} style={{padding:"14px 13px"}}>
                    <p style={{fontSize:10,color:C.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6}}>{campo.l}</p>
                    <p style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:700,color:C.blue}}>{medidas[0][campo.k]} cm</p>
                    {campo.ref&&<p style={{fontSize:9,color:C.dim,marginTop:4}}>{campo.ref}</p>}
                  </Card>
                ))}
              </div>
              {medidas.length>1&&(
                <>
                  <SLbl>Histórico</SLbl>
                  {medidas.slice(0,6).map((m,i)=>(
                    <Card key={i} style={{marginBottom:8}}>
                      <p style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:8}}>{fmt(m.data)}</p>
                      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                        {camposMedidas.filter(c=>m[c.k]).map(c=>(
                          <div key={c.k} style={{textAlign:"center"}}>
                            <p style={{fontFamily:"'Clash Display',sans-serif",fontSize:16,fontWeight:700,color:C.blue}}>{m[c.k]}</p>
                            <p style={{fontSize:9,color:C.dim}}>{c.l.split(" ")[0]}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
          {medidas.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.dim}}><p style={{fontSize:32,marginBottom:8}}>📏</p><p style={{fontSize:13}}>Nenhuma medida registrada</p><p style={{fontSize:11,marginTop:4}}>Registre uma vez por mês para acompanhar a evolução real</p></div>}
        </>
      )}

      {showMarcadorSheet&&(
        <Sheet onClose={()=>setShowMarcadorSheet(false)} title="+ Marcador Manual" subtitle="Adicione valores de exames anteriores">
          {/* -- Executar no Supabase SQL Editor:
          create table if not exists marcadores_exame (
            id uuid default gen_random_uuid() primary key,
            nome text not null, valor numeric, unidade text,
            status text, referencia text,
            data date default current_date, fonte text default 'manual',
            created_at timestamptz default now()
          );
          alter table marcadores_exame disable row level security; -- */}
          <div style={{marginBottom:14}}>
            <p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Nome do marcador</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {["Vitamina B12","Vitamina D","Colesterol Total","HDL","LDL","Triglicerídeos","Glicose","Hemoglobina","Ferritina","TSH"].map(n=>(
                <button key={n} onClick={()=>setNovoMarcador(p=>({...p,nome:n}))} style={{padding:"6px 12px",borderRadius:20,fontSize:11,border:novoMarcador.nome===n?`1.5px solid ${C.blue}`:"1.5px solid rgba(255,255,255,.1)",background:novoMarcador.nome===n?"rgba(96,165,250,.15)":"transparent",color:novoMarcador.nome===n?C.blue:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:novoMarcador.nome===n?700:400}}>{n}</button>
              ))}
            </div>
            <input value={novoMarcador.nome} onChange={e=>setNovoMarcador(p=>({...p,nome:e.target.value}))} placeholder="Ou digite outro marcador..." style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:12,padding:"11px 14px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{k:"valor",l:"Valor",p:"Ex: 450"},{k:"unidade",l:"Unidade",p:"Ex: pg/mL"},{k:"referencia",l:"Referência",p:"Ex: 200-900"}].map(f=>(
              <div key={f.k} style={{gridColumn:f.k==="referencia"?"span 2":"span 1"}}>
                <p style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dim,marginBottom:6,fontWeight:700}}>{f.l}</p>
                <input type={f.k==="valor"?"number":"text"} value={novoMarcador[f.k]} onChange={e=>setNovoMarcador(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,marginBottom:18}}>
            <p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Status</p>
            <div style={{display:"flex",gap:8}}>
              {[{v:"ok",l:"✓ Normal",c:C.green},{v:"atenção",l:"⚠ Atenção",c:C.orange},{v:"crítico",l:"✕ Crítico",c:C.red}].map(s=>(
                <button key={s.v} onClick={()=>setNovoMarcador(p=>({...p,status:s.v}))} style={{flex:1,padding:"11px 6px",borderRadius:12,border:novoMarcador.status===s.v?`2px solid ${s.c}`:"1.5px solid rgba(255,255,255,.1)",background:novoMarcador.status===s.v?`${s.c}15`:"transparent",color:novoMarcador.status===s.v?s.c:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>
              ))}
            </div>
          </div>
          <Btn onClick={async()=>{if(!novoMarcador.nome||!novoMarcador.valor)return;try{const [s]=await DB.post("marcadores_exame",{...novoMarcador,valor:parseFloat(novoMarcador.valor),data:todayStr(),fonte:"manual"});setMarcadoresHist(m=>[s,...m]);setShowMarcadorSheet(false);setNovoMarcador({nome:"",valor:"",unidade:"",status:"ok",referencia:""});}catch(e){console.error(e);}}} full disabled={!novoMarcador.nome||!novoMarcador.valor}>Salvar marcador</Btn>
        </Sheet>
      )}

      {showMedidas&&(
        <Sheet onClose={()=>setShowMedidas(false)} title="📏 Registrar Medidas" subtitle="Meça sempre no mesmo horário, em jejum.">
          <div style={{background:"rgba(250,204,21,0.06)",border:"1px solid rgba(250,204,21,0.15)",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>📸 Dica: tire também fotos de frente, costas e lado com a mesma roupa e iluminação para comparar mensalmente.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {camposMedidas.map(campo=>(
              <div key={campo.k}>
                <p style={{fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:C.dim,marginBottom:6,fontWeight:700}}>{campo.l}</p>
                <input type="number" value={novasMedidas[campo.k]||""} onChange={e=>setNovasMedidas(p=>({...p,[campo.k]:e.target.value}))} placeholder="cm" style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            ))}
          </div>
          {loadingMedidas&&<Spin text="Salvando"/>}
          <Btn onClick={salvarMedidas} full style={{marginTop:18}} disabled={loadingMedidas}>Salvar medidas</Btn>
        </Sheet>
      )}
    </div>
  );
}

// JOURNEY
function Journey({profile,weights,trainings}){
  const lw=weights[0]?.peso||profile?.peso;
  const lost=Math.max(0,(profile?.peso||0)-(lw||0));
  const phase=lw>130?1:lw>120?2:lw>110?3:lw>100?4:lw>95?5:6;
  const [planoFase,setPlanoFase]=useState("");
  const [loadPlanoFase,setLoadPlanoFase]=useState(false);
  const [faseExpandida,setFaseExpandida]=useState(null);
  const genPlanoFase=async(fase)=>{
    setFaseExpandida(fase.n);setLoadPlanoFase(true);setPlanoFase("");
    const totalTreinos=trainings.length;
    const mesPassado=trainings.filter(t=>(new Date()-new Date(t.data))<=30*86400000).length;
    try{
      const r=await callAI([{role:"user",content:`Crie um plano específico para a ${fase.name} da Jornada Ultraman do Cleiton.\n\nOBJETIVO DA FASE: ${fase.goal}\nPESO ALVO DA FASE: ${fase.weight?fase.weight+"kg":"Completar Ultraman"}\n\nSITUAÇÃO ATUAL:\n- Peso: ${lw}kg\n- Total de treinos registrados: ${totalTreinos}\n- Treinos no último mês: ${mesPassado}\n- Limitações: ${profile?.limitacoes||"Nenhuma"}\n- Medicamentos: ${profile?.medicamentos||"Nenhum"}\n\nCONTEXTO:\n- Objetivo final: Ultraman (10km natação + 421km bike + 84km corrida)\n- Não sabe nadar ainda (prioridade aprender)\n- Tem bike indoor\n- Joga tênis aos sábados\n- Protocolo Musy + Cariani\n\nCrie um plano COMPLETO para essa fase com:\n\n1. DURAÇÃO ESTIMADA\n   Quantas semanas/meses para atingir o objetivo da fase\n\n2. TREINOS SEMANAIS\n   Distribuição dos 7 dias com modalidade e duração\n\n3. FOCO PRINCIPAL\n   O que é mais importante nessa fase específica\n\n4. MARCOS DE PROGRESSÃO\n   3 checkpoints mensuráveis para saber que está evoluindo\n\n5. NUTRIÇÃO DA FASE\n   Ajuste calórico e proteico específico para esse momento\n\n6. ALERTA DE RISCO\n   O que pode fazer a fase falhar e como evitar\n\nSeja específico, prático e direto. Máximo 350 palavras.`}],"Coach especialista em triathlon e emagrecimento progressivo. Protocolo Musy + Cariani. Português direto.",700);
      setPlanoFase(r);
    }catch{setPlanoFase("Erro ao gerar. Tente novamente.");}
    setLoadPlanoFase(false);
  };
  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{marginBottom:20}}><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Jornada Ultraman 🏆</h2><p style={{fontSize:12,color:C.muted}}>Sua linha do tempo até o objetivo final</p></div>
      <div style={{background:"linear-gradient(135deg,rgba(250,204,21,.08),rgba(250,204,21,.02))",border:"1px solid rgba(250,204,21,.2)",borderRadius:22,padding:20,marginBottom:24,textAlign:"center"}}>
        <p style={{fontSize:11,color:C.dim,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Você está na</p>
        <p style={{fontFamily:"'Clash Display',sans-serif",fontSize:32,fontWeight:700,color:C.yellow,marginBottom:8}}>{ULTRAMAN[phase-1]?.name}</p>
        <p style={{fontSize:12,color:C.muted,marginBottom:16}}>{ULTRAMAN[phase-1]?.goal}</p>
        <div style={{display:"flex",justifyContent:"center",gap:24}}>
          {[{v:`-${lost.toFixed(1)}kg`,l:"Perdidos",c:C.green},{v:trainings.length,l:"Treinos",c:C.yellow}].map((s,i)=><div key={i} style={{textAlign:"center"}}><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:24,fontWeight:700,color:s.c}}>{s.v}</p><p style={{fontSize:9,color:C.dim,letterSpacing:".1em",textTransform:"uppercase"}}>{s.l}</p></div>)}
        </div>
      </div>
      <SLbl>Linha do tempo</SLbl>
      <div style={{position:"relative"}}>
        <div style={{position:"absolute",left:20,top:0,bottom:0,width:2,background:"linear-gradient(to bottom,#facc15,rgba(250,204,21,.1))",zIndex:0}}/>
        {ULTRAMAN.map((p,i)=>{
          const done=phase>p.n,cur=phase===p.n;
          return(
            <div key={i} style={{marginBottom:20,position:"relative",zIndex:1}}>
              <div style={{display:"flex",gap:16}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:done?p.color:cur?`${p.color}20`:"rgba(255,255,255,.05)",border:cur?`3px solid ${p.color}`:`2px solid ${done?p.color:"rgba(255,255,255,.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:done?16:12,fontWeight:900,color:done?"#000":cur?p.color:C.dim,flexShrink:0,boxShadow:cur?`0 0 20px ${p.color}40`:"none"}}>{done?"✓":p.n}</div>
                <div style={{flex:1,background:cur?`${p.color}08`:"transparent",border:cur?`1px solid ${p.color}25`:"1px solid transparent",borderRadius:14,padding:"10px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <p style={{fontSize:14,fontWeight:cur||done?800:600,color:done?C.muted:cur?p.color:"rgba(255,255,255,.5)"}}>{p.name}</p>
                    {cur&&<Badge color={p.color}>Atual</Badge>}
                    {done&&<Badge color={C.green}>✓</Badge>}
                  </div>
                  <p style={{fontSize:11,color:C.dim}}>{p.goal}</p>
                  {cur&&<button onClick={()=>faseExpandida===p.n?setFaseExpandida(null):genPlanoFase(p)} style={{marginTop:8,background:`${p.color}15`,border:`1px solid ${p.color}30`,borderRadius:10,padding:"7px 14px",color:p.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{faseExpandida===p.n?"▲ Fechar":"📋 Ver plano desta fase"}</button>}
                  {done&&<button onClick={()=>faseExpandida===p.n?setFaseExpandida(null):genPlanoFase(p)} style={{marginTop:8,background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"7px 14px",color:C.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{faseExpandida===p.n?"▲ Fechar":"📋 Revisitar plano"}</button>}
                </div>
              </div>
              {faseExpandida===p.n&&(
                <div style={{marginLeft:56,marginBottom:16,background:`${p.color}08`,border:`1px solid ${p.color}20`,borderRadius:16,padding:16,animation:"fadeIn 0.3s ease"}}>
                  {loadPlanoFase&&<Spin text="Coach elaborando plano da fase"/>}
                  {planoFase&&!loadPlanoFase&&(
                    <>
                      <p style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:p.color,fontWeight:800,marginBottom:12}}>📋 Plano · {p.name}</p>
                      <p style={{fontSize:12,color:"rgba(255,255,255,0.72)",lineHeight:1.85,whiteSpace:"pre-line",marginBottom:14}}>{planoFase}</p>
                      <button onClick={()=>{const blob=new Blob([`PLANO - ${p.name}\n${p.goal}\n\n${planoFase}`],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`plano-${p.name.toLowerCase().replace(" ","-")}.txt`;a.click();URL.revokeObjectURL(url);}} style={{width:"100%",border:"none",borderRadius:12,padding:"11px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:`${p.color}15`,color:p.color}}>⬇ Baixar plano em TXT</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// HABITS
function Habits({habits,checkins,onToggle,onAdd,onRemove}){
  const [show,setShow]=useState(false);
  const [newH,setNewH]=useState({emoji:"🎯",titulo:"",cat:"mente"});
  const tk=todayStr();
  const todayCI=checkins.filter(c=>c.data===tk).map(c=>c.habito_id);
  const EMOJIS=["🌅","💧","🏃","📚","🧘","✍️","🥗","🌙","🎯","💰","🤝","🔥","⏱️","🎓","💊","🏋️","🍎","🏊","🎾","🚴"];
  const week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=d.toISOString().slice(0,10);return{k,day:d.getDate(),dw:["D","S","T","Q","Q","S","S"][d.getDay()],done:checkins.filter(c=>c.data===k).length,today:k===tk};});
  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Hábitos 🔥</h2><p style={{fontSize:12,color:C.muted}}>Construa sua melhor versão</p></div>
        <Btn onClick={()=>setShow(true)} variant="ghost" sm>+ Novo</Btn>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",gap:6}}>
          {week.map(d=>{const pct=habits.length?d.done/habits.length:0;const bg=d.today?C.yellow:pct===0?"rgba(255,255,255,.05)":`rgba(250,204,21,${.18+pct*.7})`;return(<div key={d.k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><span style={{fontSize:8,color:C.dim}}>{d.dw}</span><div style={{width:"100%",aspectRatio:"1",borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:d.today?"#000":pct>.5?"#000":C.dim,border:d.today?`2px solid ${C.yellow}`:"none"}}>{d.done||d.day}</div></div>);})}
        </div>
      </Card>
      <div style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,color:C.muted}}>Hoje</span><span style={{fontSize:12,fontWeight:800,color:C.yellow}}>{todayCI.length}/{habits.length}</span></div><Bar value={todayCI.length} max={habits.length||1} h={7}/></div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {habits.map(h=>{
          const done=todayCI.includes(h.id);const cat=CATS[h.cat]||CATS.mente;
          return(
            <div key={h.id} onClick={()=>onToggle(h)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:16,cursor:"pointer",border:done?`1.5px solid ${cat.color}40`:`1px solid ${C.border}`,background:done?`${cat.color}10`:C.card,transition:"all .2s"}}>
              <div style={{width:28,height:28,borderRadius:9,border:done?`2px solid ${cat.color}`:"2px solid rgba(255,255,255,.1)",background:done?cat.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:done?`0 0 12px ${cat.color}50`:"none"}}>{done&&<span style={{fontSize:13,color:"#000",fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:22,flexShrink:0}}>{h.emoji}</span>
              <div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,color:done?"#fff":"rgba(255,255,255,.75)",textDecoration:done?"line-through":"none",textDecorationColor:"rgba(255,255,255,.25)"}}>{h.titulo}</p><Badge color={cat.color} style={{marginTop:4}}>{cat.label}</Badge></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,fontWeight:900,color:done?C.yellow:C.dim}}>+{h.xp}</span><DelBtn onClick={()=>onRemove(h.id)}/></div>
            </div>
          );
        })}
      </div>
      {todayCI.length===habits.length&&habits.length>0&&<div style={{marginTop:20,background:"linear-gradient(135deg,rgba(250,204,21,.1),rgba(250,204,21,.04))",border:"1px solid rgba(250,204,21,.25)",borderRadius:20,padding:20,textAlign:"center"}}><p style={{fontSize:32,marginBottom:8}}>🏆</p><p style={{fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:700,color:C.yellow,marginBottom:6}}>DIA PERFEITO!</p><p style={{fontSize:12,color:C.muted}}>Todos os {habits.length} hábitos concluídos.</p></div>}
      {show&&(
        <Sheet onClose={()=>setShow(false)} title="➕ Novo Hábito">
          <div style={{marginBottom:16}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Emoji</p><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{EMOJIS.map(e=><button key={e} onClick={()=>setNewH(h=>({...h,emoji:e}))} style={{width:38,height:38,borderRadius:10,border:newH.emoji===e?`2px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.08)",background:newH.emoji===e?"rgba(250,204,21,.12)":"transparent",fontSize:18,cursor:"pointer"}}>{e}</button>)}</div></div>
          <FIn label="Nome" req value={newH.titulo} onChange={v=>setNewH(h=>({...h,titulo:v}))} placeholder="Ex: Natação 30 min"/>
          <div style={{marginBottom:18}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Categoria</p><div style={{display:"flex",gap:7}}>{Object.entries(CATS).map(([id,cat])=><button key={id} onClick={()=>setNewH(h=>({...h,cat:id}))} style={{flex:1,padding:"9px 4px",borderRadius:11,border:newH.cat===id?`1.5px solid ${cat.color}`:"1.5px solid rgba(255,255,255,.08)",background:newH.cat===id?`${cat.color}15`:"transparent",color:newH.cat===id?cat.color:C.muted,fontSize:11,fontWeight:newH.cat===id?700:400,cursor:"pointer",fontFamily:"inherit"}}>{cat.label}</button>)}</div></div>
          <Btn onClick={()=>{onAdd({...newH,xp:15});setShow(false);setNewH({emoji:"🎯",titulo:"",cat:"mente"});}} full disabled={!newH.titulo.trim()}>Adicionar</Btn>
        </Sheet>
      )}
    </div>
  );
}

// SETTINGS
function Settings({profile,onUpdateProfile}){
  const [sub,setSub]=useState("perfil");
  const [f,setF]=useState({nome:profile?.nome||"",sexo:profile?.sexo||"M",idade:String(profile?.idade||""),peso:String(profile?.peso||""),altura:String(profile?.altura||""),peso_meta:String(profile?.peso_meta||""),cal_meta:String(profile?.cal_meta||""),prot_meta:String(profile?.prot_meta||"")});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [webhook,setWebhook]=useState("");
  const [showReset,setShowReset]=useState(false);
  const [motivo,setMotivo]=useState("");
  const [showPausaForm,setShowPausaForm]=useState(false);
  const [apiKey,setApiKey]=useState(()=>localStorage.getItem("anthropic_key")||"");
  const [apiKeySaved,setApiKeySaved]=useState(false);
  useEffect(()=>{DB.get("configuracoes","?chave=eq.webhook_url").then(r=>{if(r?.[0]?.valor)setWebhook(r[0].valor);}).catch(()=>{});}, []);
  const save=async()=>{
    setSaving(true);
    try{
      const p=parseFloat(f.peso),a=parseFloat(f.altura),i=parseFloat(f.idade);
      const bmr=bmrCalc(p,a,i,f.sexo),tdee=Math.round(bmr*1.55);
      const upd={nome:f.nome,sexo:f.sexo,idade:i,peso:p,altura:a,peso_meta:parseFloat(f.peso_meta),bmr:Math.round(bmr),tdee,cal_meta:parseInt(f.cal_meta)||tdee-500,prot_meta:parseInt(f.prot_meta)||Math.round(p*2.4)};
      await DB.patch("perfil",`?id=eq.${profile.id}`,upd);
      onUpdateProfile({...profile,...upd});
      setSaved(true);setTimeout(()=>setSaved(false),2500);
    }catch(e){console.error(e);}
    setSaving(false);
  };
  const IBtnStyle=(active,color)=>({flex:1,padding:10,borderRadius:11,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"all .2s",background:active?"rgba(250,204,21,.12)":"transparent",color:active?C.yellow:C.muted,fontWeight:active?800:400,fontSize:10,borderBottom:active?"2px solid #facc15":"2px solid transparent"});
  return(
    <div style={{padding:"22px 18px",paddingBottom:170}}>
      <div style={{marginBottom:20}}><h2 style={{fontFamily:"'Clash Display',sans-serif",fontSize:26,fontWeight:700,marginBottom:4}}>Configurações ⚙️</h2><p style={{fontSize:12,color:C.muted}}>Perfil, metas e integrações</p></div>
      <div style={{display:"flex",background:"#12121a",borderRadius:14,padding:4,marginBottom:20,gap:3}}>
        {[{id:"perfil",l:"Perfil"},{id:"metas",l:"Metas"},{id:"integ",l:"Watch"},{id:"dados",l:"Dados"}].map(t=><button key={t.id} onClick={()=>setSub(t.id)} style={IBtnStyle(sub===t.id)}>{t.l}</button>)}
      </div>
      {sub==="perfil"&&(
        <>
          {[{k:"nome",l:"Nome",p:"Seu nome",t:"text"},{k:"idade",l:"Idade",p:"32",t:"number"},{k:"peso",l:"Peso atual (kg)",p:"139.8",t:"number"},{k:"altura",l:"Altura (cm)",p:"192",t:"number"},{k:"peso_meta",l:"Peso meta (kg)",p:"100",t:"number"}].map(field=>(
            <FIn key={field.k} label={field.l} type={field.t} value={f[field.k]} onChange={v=>set(field.k,v)} placeholder={field.p}/>
          ))}
          <div style={{marginBottom:14}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Sexo biológico</p><div style={{display:"flex",gap:8}}>{[{v:"M",l:"Masculino"},{v:"F",l:"Feminino"}].map(s=><button key={s.v} onClick={()=>set("sexo",s.v)} style={{flex:1,padding:13,borderRadius:12,border:f.sexo===s.v?`2px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:f.sexo===s.v?"rgba(250,204,21,.12)":"transparent",color:f.sexo===s.v?C.yellow:C.muted,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>)}</div></div>
          <Btn onClick={save} full disabled={saving}>{saving?"Salvando...":saved?"✓ Salvo!":"Salvar perfil"}</Btn>
        </>
      )}
      {sub==="metas"&&(
        <>
          <div style={{background:"rgba(250,204,21,.06)",border:"1px solid rgba(250,204,21,.15)",borderRadius:14,padding:"13px 14px",marginBottom:18}}><p style={{fontSize:12,color:C.muted,lineHeight:1.7}}>Calculado automaticamente. Ajuste manualmente se necessário.</p></div>
          <FIn label={`Calorias diárias (auto: ${profile?.cal_meta} kcal)`} type="number" value={f.cal_meta} onChange={v=>set("cal_meta",v)} placeholder={String(profile?.cal_meta)}/>
          <FIn label={`Proteína diária (auto: ${profile?.prot_meta}g)`} type="number" value={f.prot_meta} onChange={v=>set("prot_meta",v)} placeholder={String(profile?.prot_meta)}/>
          <Card style={{marginBottom:18}}>
            <SLbl>Seus números</SLbl>
            {[{l:"BMR",v:`${profile?.bmr} kcal`},{l:"TDEE",v:`${profile?.tdee} kcal`},{l:"Meta (-500kcal)",v:`${profile?.cal_meta} kcal`},{l:"Proteína (2.4g/kg)",v:`${profile?.prot_meta}g`}].map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",paddingBottom:8,marginBottom:8,borderBottom:i<3?`1px solid ${C.border}`:"none"}}><span style={{fontSize:12,color:C.muted}}>{r.l}</span><span style={{fontSize:12,fontWeight:700,color:C.yellow}}>{r.v}</span></div>
            ))}
          </Card>
          <Btn onClick={save} full disabled={saving}>{saving?"Salvando...":saved?"✓ Salvo!":"Salvar metas"}</Btn>
        </>
      )}
      {sub==="integ"&&(
        <>
          <Card style={{marginBottom:16,background:apiKey?"rgba(74,222,128,.06)":"rgba(251,191,36,.06)",border:apiKey?`1px solid rgba(74,222,128,.2)`:`1px solid rgba(251,191,36,.2)`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(251,191,36,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
              <div>
                <p style={{fontSize:14,fontWeight:700,marginBottom:2}}>Gemini IA — API Key</p>
                <p style={{fontSize:11,color:apiKey?C.green:C.orange}}>{apiKey?"✓ Configurada":"⚠ Necessária para análises por foto e Coach IA"}</p>
              </div>
            </div>
            <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="AIza..." style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 14px",color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit",marginBottom:10}}/>
            <Btn onClick={()=>{localStorage.setItem("anthropic_key",apiKey);setApiKeySaved(true);setTimeout(()=>setApiKeySaved(false),2000);}} variant={apiKey?"green":"primary"} full>{apiKeySaved?"✓ Salva!":"Salvar API Key"}</Btn>
          </Card>
          <Card style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(96,165,250,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⌚</div>
              <div><p style={{fontSize:14,fontWeight:700,marginBottom:2}}>Apple Watch + HealthFit</p><p style={{fontSize:11,color:C.muted}}>Sync automático de treinos</p></div>
            </div>
            <FIn label="URL do Webhook Supabase" value={webhook} onChange={setWebhook} placeholder="https://rngptdmetqolhkjpkuvs.supabase.co/functions/v1/receive-workout"/>
            <Btn onClick={async()=>{try{await DB.patch("configuracoes","?chave=eq.webhook_url",{valor:webhook});}catch{}}} variant="blue" full>Salvar URL</Btn>
          </Card>
          <Card>
            <p style={{fontSize:14,fontWeight:700,marginBottom:12}}>📋 Como configurar</p>
            {["Abra o HealthFit no iPhone","Vá em Settings → Auto Export","Ative a opção Google Sheets","Autorize acesso à conta Google","Cole a URL do webhook acima","Termine um treino no Apple Watch","O app registra automaticamente"].map((step,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(250,204,21,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.yellow,flexShrink:0}}>{i+1}</div>
                <p style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{step}</p>
              </div>
            ))}
          </Card>
        </>
      )}
      {sub==="dados"&&(
        <>
          <Card style={{marginBottom:14}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:6}}>📦 Backup dos dados</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>Exporta todos os dados em JSON.</p>
            <Btn onClick={async()=>{const [p,m,t,w]=await Promise.all([DB.get("perfil"),DB.get("refeicoes"),DB.get("treinos"),DB.get("pesos")]);const blob=new Blob([JSON.stringify({perfil:p,refeicoes:m,treinos:t,pesos:w},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`vida-tracker-backup.json`;a.click();}} variant="green" full>⬇ Baixar backup JSON</Btn>
          </Card>
          <Card style={{marginBottom:14}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:6}}>⏸️ Modo Pausa</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>Viagem, trabalho intenso ou período de recuperação? Registre a pausa para não quebrar seu histórico.</p>
            {(()=>{
              const pausaAtiva=localStorage.getItem("pausa_ativa");
              const pausaMotivo=localStorage.getItem("pausa_motivo");
              const pausaInicio=localStorage.getItem("pausa_inicio");
              if(pausaAtiva==="true"){
                const dias=Math.floor((new Date()-new Date(pausaInicio))/86400000);
                return(<div><div style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.25)",borderRadius:12,padding:"12px 14px",marginBottom:12}}><p style={{fontSize:12,fontWeight:700,color:C.orange,marginBottom:4}}>⏸️ Pausa ativa há {dias} dias</p><p style={{fontSize:11,color:C.muted}}>Motivo: {pausaMotivo}</p><p style={{fontSize:11,color:C.muted}}>Desde: {pausaInicio}</p></div><Btn onClick={()=>{localStorage.removeItem("pausa_ativa");localStorage.removeItem("pausa_motivo");localStorage.removeItem("pausa_inicio");window.location.reload();}} variant="green" full>▶️ Retomar jornada</Btn></div>);
              }
              return(<div>{!showPausaForm?(<Btn onClick={()=>setShowPausaForm(true)} variant="ghost" full>⏸️ Ativar modo pausa</Btn>):(<><div style={{marginBottom:12}}><p style={{fontSize:10,letterSpacing:".16em",textTransform:"uppercase",color:C.dim,marginBottom:10,fontWeight:700}}>Motivo da pausa</p><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{["Trabalho intenso","Viagem","Lesão","Doença","Férias","Outro"].map(m=>(<button key={m} onClick={()=>setMotivo(m)} style={{padding:"8px 14px",borderRadius:20,border:motivo===m?`1.5px solid ${C.orange}`:"1.5px solid rgba(255,255,255,.1)",background:motivo===m?"rgba(251,146,60,0.15)":"transparent",color:motivo===m?C.orange:C.muted,fontSize:11,fontWeight:motivo===m?700:400,cursor:"pointer",fontFamily:"inherit"}}>{m}</button>))}</div></div><div style={{display:"flex",gap:8}}><Btn onClick={()=>setShowPausaForm(false)} variant="ghost">Cancelar</Btn><Btn onClick={()=>{localStorage.setItem("pausa_ativa","true");localStorage.setItem("pausa_motivo",motivo||"Não especificado");localStorage.setItem("pausa_inicio",todayStr());window.location.reload();}} disabled={!motivo} full>Confirmar pausa</Btn></div></>)}</div>);
            })()}
          </Card>
          <Card style={{background:"rgba(248,113,113,.06)",border:"1px solid rgba(248,113,113,.2)"}}>
            <p style={{fontSize:14,fontWeight:700,marginBottom:6,color:C.red}}>⚠️ Zona de perigo</p>
            <p style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:14}}>Apaga todos os dados permanentemente.</p>
            {!showReset?<Btn onClick={()=>setShowReset(true)} variant="danger" full>Resetar app</Btn>:(
              <div><p style={{fontSize:13,color:C.red,fontWeight:700,marginBottom:12,textAlign:"center"}}>Tem certeza? Isso apaga TUDO.</p><div style={{display:"flex",gap:8}}><Btn onClick={()=>setShowReset(false)} variant="ghost" full>Cancelar</Btn><Btn onClick={async()=>{try{await Promise.all([DB.del("refeicoes","?id=neq.00000000-0000-0000-0000-000000000000"),DB.del("treinos","?id=neq.00000000-0000-0000-0000-000000000000"),DB.del("pesos","?id=neq.00000000-0000-0000-0000-000000000000"),DB.del("checkins_habitos","?id=neq.00000000-0000-0000-0000-000000000000"),DB.del("habitos","?id=neq.00000000-0000-0000-0000-000000000000"),DB.del("perfil","?id=neq.00000000-0000-0000-0000-000000000000")]);window.location.reload();}catch(e){console.error(e);}}} variant="danger" full>Sim, resetar</Btn></div></div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function CheckinSemanal({profile,weights,meals,onClose}){
  const [respostas,setRespostas]=useState({});
  const [analise,setAnalise]=useState("");
  const [loading,setLoading]=useState(false);
  const lw=weights[0]?.peso||profile?.peso;
  const d7=new Date();d7.setDate(d7.getDate()-7);
  const avgProt=Math.round(meals.filter(m=>new Date(m.data+"T12:00:00")>=d7).reduce((s,m)=>s+(m.proteina||0),0)/7);
  const perguntas=[
    {id:"p1",q:"Como foi sua semana de treinos?",opts:["😴 Fraca","😐 Regular","💪 Boa","🔥 Incrível"]},
    {id:"p2",q:"Como foi sua alimentação?",opts:["😴 Fugi muito","😐 Mais ou menos","✅ No plano","🎯 Perfeito"]},
    {id:"p3",q:"Como foi seu sono?",opts:["😫 Péssimo","😐 Regular","😴 Bom","⭐ Ótimo"]},
    {id:"p4",q:"Seu nível de energia geral?",opts:["🪫 Sem energia","😐 Ok","⚡ Bem disposto","🚀 No máximo"]},
    {id:"p5",q:"Algo que travou sua semana?",opts:["Trabalho","Lesão","Falta de tempo","Motivação","Nada travou"]},
  ];
  const allAnswered=perguntas.every(p=>respostas[p.id]);
  const gerar=async()=>{
    setLoading(true);
    try{const r=await callAI([{role:"user",content:`Check-in semanal do Cleiton:\n- Treinos: ${respostas.p1}\n- Alimentação: ${respostas.p2}\n- Sono: ${respostas.p3}\n- Energia: ${respostas.p4}\n- O que travou: ${respostas.p5}\n- Peso atual: ${lw}kg (meta ${profile?.peso_meta}kg)\n- Proteína média da semana: ${avgProt}g/${profile?.prot_meta}g\nDê um diagnóstico honesto da semana e 1 foco prioritário para a próxima semana.`}],"Coach de alta performance, Paulo Musy + Renato Cariani. Português direto e motivador. Máximo 4 frases.",400);setAnalise(r);}
    catch{setAnalise("Erro. Tente novamente.");}
    setLoading(false);
  };
  const fechar=()=>{localStorage.setItem("lastCheckin",todayStr());onClose();};
  return(
    <Sheet title="📋 Check-in Semanal" subtitle="Leva 2 minutos. Faz toda diferença." onClose={fechar}>
      {perguntas.map(p=>(
        <div key={p.id} style={{marginBottom:20}}>
          <p style={{fontSize:13,fontWeight:700,marginBottom:10}}>{p.q}</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {p.opts.map(o=>{const sel=respostas[p.id]===o;return(
              <button key={o} onClick={()=>setRespostas(r=>({...r,[p.id]:o}))} style={{padding:"8px 14px",borderRadius:20,border:sel?`1.5px solid ${C.yellow}`:"1.5px solid rgba(255,255,255,.1)",background:sel?"rgba(250,204,21,0.2)":"transparent",color:sel?C.yellow:C.muted,fontSize:11,fontWeight:sel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{o}</button>
            );})}
          </div>
        </div>
      ))}
      <Btn onClick={gerar} full disabled={!allAnswered||loading} style={{marginBottom:analise?12:0}}>{loading?"Analisando...":"Gerar análise da semana"}</Btn>
      {analise&&<p style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.7,marginTop:12,whiteSpace:"pre-line"}}>{analise}</p>}
      <Btn onClick={fechar} full variant="ghost" style={{marginTop:16}}>Fechar e salvar</Btn>
    </Sheet>
  );
}

// APP ROOT
export default function App(){
  const [loading,setLoading]=useState(true);
  const [profile,setProfile]=useState(null);
  const [meals,setMeals]=useState([]);
  const [trainings,setTrainings]=useState([]);
  const [habits,setHabits]=useState([]);
  const [checkins,setCheckins]=useState([]);
  const [weights,setWeights]=useState([]);
  const [compositions,setCompositions]=useState([]);
  const [tab,setTab]=useState("home");
  const [showCheckin,setShowCheckin]=useState(false);
  const [showMais,setShowMais]=useState(false);
  const [showQuick,setShowQuick]=useState(false);

  const loadAll=useCallback(async()=>{
    try{
      const [p,m,t,h,c,w,comp]=await Promise.all([
        DB.get("perfil","?order=created_at.desc&limit=1"),
        DB.get("refeicoes","?order=created_at.desc&limit=300"),
        DB.get("treinos","?order=created_at.desc&limit=100"),
        DB.get("habitos","?order=created_at.asc"),
        DB.get("checkins_habitos","?order=created_at.desc&limit=500"),
        DB.get("pesos","?order=created_at.desc&limit=90"),
        DB.get("composicao_corporal","?order=created_at.desc&limit=30").catch(()=>[]),
      ]);
      if(p?.length)setProfile(p[0]);
      setMeals(m||[]);setTrainings(t||[]);setHabits(h||[]);setCheckins(c||[]);setWeights(w||[]);setCompositions(comp||[]);
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{
    loadAll();
    const day=new Date().getDay(),h=new Date().getHours(),last=localStorage.getItem("lastCheckin");
    if(day===0&&h>=18&&last!==todayStr())setTimeout(()=>setShowCheckin(true),2000);
  },[]);

  const updXP=async(d)=>{
    if(!profile)return;const n=(profile.xp||0)+d;
    await DB.patch("perfil",`?id=eq.${profile.id}`,{xp:n});
    setProfile(p=>({...p,xp:n}));
  };
  const addMeal=async(data)=>{try{const [s]=await DB.post("refeicoes",data);setMeals(m=>[s,...m]);await updXP(15);}catch(e){console.error(e);alert("Erro ao salvar refeição: "+e.message);}};
  const delMeal=async(id)=>{try{await DB.del("refeicoes",`?id=eq.${id}`);setMeals(m=>m.filter(x=>x.id!==id));}catch(e){console.error(e);}};
  const addTraining=async(data)=>{try{const [s]=await DB.post("treinos",data);setTrainings(t=>[s,...t]);await updXP(data.xp||25);}catch(e){console.error(e);}};
  const delTraining=async(id)=>{try{await DB.del("treinos",`?id=eq.${id}`);setTrainings(t=>t.filter(x=>x.id!==id));}catch(e){console.error(e);}};
  const importTrainings=async(rows)=>{const inserted=await DB.post("treinos",rows);setTrainings(t=>[...([...inserted].reverse()),...t]);await updXP(Math.round(rows.reduce((s,r)=>s+(r.xp||25),0)*0.3));return inserted.length;};;
  const addWeight=async(data)=>{try{const [s]=await DB.post("pesos",data);setWeights(w=>[s,...w]);}catch(e){console.error(e);}};
  const delWeight=async(id)=>{try{await DB.del("pesos",`?id=eq.${id}`);setWeights(w=>w.filter(x=>x.id!==id));}catch(e){console.error(e);}};
  const addComp=async(data)=>{try{const [s]=await DB.post("composicao_corporal",data);setCompositions(c=>[s,...c]);}catch(e){console.error(e);alert("Erro ao salvar composição: "+e.message);}};
  const toggleCI=async(habit)=>{
    const tk=todayStr(),ex=checkins.find(c=>c.habito_id===habit.id&&c.data===tk);
    try{
      if(ex){await DB.del("checkins_habitos",`?id=eq.${ex.id}`);setCheckins(c=>c.filter(x=>x.id!==ex.id));await updXP(-habit.xp);}
      else{const [s]=await DB.post("checkins_habitos",{habito_id:habit.id,data:tk});setCheckins(c=>[s,...c]);await updXP(habit.xp);}
    }catch(e){console.error(e);}
  };
  const addHabit=async(data)=>{try{const [s]=await DB.post("habitos",data);setHabits(h=>[...h,s]);}catch(e){console.error(e);}};
  const remHabit=async(id)=>{try{await DB.del("habitos",`?id=eq.${id}`);setHabits(h=>h.filter(x=>x.id!==id));}catch(e){console.error(e);}};

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');`}</style>
      <div style={{fontSize:44}}>🏆</div><Spin text="Carregando sua jornada"/>
    </div>
  );

  if(!profile)return<Onboarding onSave={async p=>{setProfile(p);await loadAll();}}/>;

  const pages={
    home:<Dashboard profile={profile} meals={meals} weights={weights} checkins={checkins} habits={habits} trainings={trainings} onTab={setTab}/>,
    training:<Training profile={profile} trainings={trainings} onAdd={addTraining} onDelete={delTraining} onImport={importTrainings}/>,
    nutrition:<Nutrition profile={profile} meals={meals} onAdd={addMeal} onDelete={delMeal}/>,
    health:<Health profile={profile} weights={weights} compositions={compositions} onAddWeight={addWeight} onAddComp={addComp} onDeleteWeight={delWeight}/>,
    journey:<Journey profile={profile} weights={weights} trainings={trainings}/>,
    habits:<Habits habits={habits} checkins={checkins} onToggle={toggleCI} onAdd={addHabit} onRemove={remHabit}/>,
    settings:<Settings profile={profile} onUpdateProfile={setProfile}/>,
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:"#fff",fontFamily:"'Plus Jakarta Sans',sans-serif",maxWidth:520,margin:"0 auto",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes ldot{0%,80%,100%{transform:scale(.45);opacity:.2}40%{transform:scale(1);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input{font-family:'Plus Jakarta Sans',sans-serif!important;color:#fff!important;}
        input::placeholder{color:rgba(255,255,255,.2)!important;}
        ::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
        button:active{transform:scale(.97);}
      `}</style>
      <div>{pages[tab]||pages.home}</div>
      {showCheckin&&<CheckinSemanal profile={profile} weights={weights} meals={meals} onClose={()=>setShowCheckin(false)}/>}
      {showMais&&(
        <Sheet title="Menu" onClose={()=>setShowMais(false)}>
          {MAIS_ITEMS.map(item=>(
            <div key={item.id} onClick={()=>{setTab(item.id);setShowMais(false);}} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
              <span style={{fontSize:24}}>{item.icon}</span>
              <span style={{fontSize:15,fontWeight:600}}>{item.label}</span>
            </div>
          ))}
        </Sheet>
      )}
      <div style={{position:"fixed",bottom:80,right:"max(16px,calc(50vw - 244px))",zIndex:150}}>
        {showQuick&&(
          <div style={{position:"absolute",bottom:64,right:0,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end"}}>
            {[{e:"🍽️",l:"Refeição",t:"nutrition"},{e:"🏋️",l:"Treino",t:"training"},{e:"⚖️",l:"Peso",t:"health"}].map(a=>(
              <div key={a.t} onClick={()=>{setTab(a.t);setShowQuick(false);}} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"9px 16px",cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 4px 16px rgba(0,0,0,.4)"}}>
                <span style={{fontSize:18}}>{a.e}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{a.l}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={()=>setShowQuick(q=>!q)} style={{width:52,height:52,borderRadius:"50%",background:C.yellow,border:"none",fontSize:26,cursor:"pointer",color:"#000",fontWeight:900,boxShadow:"0 4px 20px rgba(250,204,21,.45)",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform .2s",transform:showQuick?"rotate(45deg)":"none"}}>+</button>
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"rgba(15,23,42,.97)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(255,255,255,0.05)",zIndex:100}}>
        <div style={{display:"flex",padding:`8px 2px max(20px,env(safe-area-inset-bottom,20px))`}}>
          {TABS.map(t=>{
            const isMais=t.id==="mais";
            const isActive=isMais?MAIS_ITEMS.some(m=>m.id===tab):tab===t.id;
            return(
              <button key={t.id} onClick={()=>isMais?setShowMais(v=>!v):setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 2px",border:"none",cursor:"pointer",background:isActive?"rgba(250,204,21,.08)":"transparent",borderRadius:10,fontFamily:"inherit",transition:"all .2s",borderBottom:isActive?`2px solid ${C.yellow}`:"2px solid transparent"}}>
                <span style={{fontSize:15}}>{t.icon}</span>
                <span style={{fontSize:8,fontWeight:isActive?800:400,color:isActive?C.yellow:C.dim,letterSpacing:".03em"}}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
