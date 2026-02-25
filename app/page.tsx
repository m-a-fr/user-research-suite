"use client";
// @ts-nocheck
import { useState, useRef, useEffect } from "react";

/* ━━━ DESIGN TOKENS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const T = {
  bg:"#FFFFFF",bg2:"#F7F8FC",bg3:"#EDEEF5",
  ink:"#0A0A14",ink2:"#3D3D5C",muted:"#8B8BAD",border:"#E2E4F0",
  accent:"#4F46E5",accent2:"#818CF8",
  ok:"#059669",warn:"#D97706",danger:"#DC2626",
  ff:"'Inter',system-ui,sans-serif",
};

const callClaude = async (messages, system="", max_tokens=4000) => {
  const res = await fetch("/api/claude", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens,
      ...(system ? {system} : {}),
      messages,
    })
  });
  const d = await res.json();
  if(!res.ok) throw new Error(d?.error?.message||"API error");
  return d.content?.map(c=>c.text||"").join("")||"";
};

/* ━━━ SYSTEM PROMPTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const PROTOCOL_SYSTEM = `Tu es un UX Researcher senior spécialisé dans les tests utilisateurs non modérés sur UserTesting.

Tu génères des protocoles de test complets, professionnels, directement exploitables.

═══════════════════════════════════════════════════
DEUX MODES D'ENTRÉE
═══════════════════════════════════════════════════

MODE A — Template rempli (partiel ou complet) :
L'utilisateur t'a fourni un template structuré. Analyse-le. Si des champs sont vides ou marqués [décrire], infère des valeurs cohérentes et professionnelles à partir du contexte disponible. Ne pose AUCUNE question — génère immédiatement le protocole complet. Signale les inférences dans le champ "missingInfo" du JSON.

MODE B — Description libre :
L'utilisateur décrit son projet librement. Si tu as assez d'informations pour produire un protocole solide, génère-le directement. Sinon, pose UNE seule question ciblée pour débloquer la génération (pas de questionnaire séquentiel).

═══════════════════════════════════════════════════
PROTOCOLE À GÉNÉRER — CONTENU REQUIS
═══════════════════════════════════════════════════

Le protocole doit couvrir TOUS ces éléments :

1. HYPOTHÈSES DE RECHERCHE (2-4 hypothèses testables, formulées en "Nous pensons que…")
2. OBJECTIFS DU TEST (1 primaire + 2-3 secondaires)
3. CRITÈRES DE RECRUTEMENT (profil précis + screeners : 3-5 questions éliminatoires formulées)
4. STRUCTURE DU TEST (optimisé 15-20 min) :
   - Introduction / script d'accueil (texte complet, ton neutre)
   - Questions warm-up (2-3 questions pour mettre à l'aise)
   - Scénarios réalistes et contextualisés (mise en situation narrative avant chaque tâche)
   - Tâches formulées sans biais (impératif neutre, pas de mots-indices)
   - Questions de relance non-modéré (think-aloud prompts, auto-administrés)
   - Questions post-tâche (1-2 par tâche : difficulté perçue, ressenti)
   - Questionnaire final (SUS si pertinent, intention, perception globale)
5. KPIs MESURABLES (taux de succès, taux de complétion, nb d'erreurs, temps/tâche, score SUS cible, verbatims clés à rechercher)
6. DURÉE ESTIMÉE (ventilée par section)
7. RISQUES MÉTHODOLOGIQUES (biais spécifiques au non-modéré, points de vigilance)
8. PLAN D'ANALYSE RECOMMANDÉ (framework de synthèse : grille d'observation, catégories de verbatims, priorisation des insights)

═══════════════════════════════════════════════════
MAPPING BRIEF BUILDER — CHAMPS À REMPLIR
═══════════════════════════════════════════════════

Le champ "briefData" du JSON doit couvrir TOUS ces champs pour alimenter le Brief Builder.
Pour les champs de gestion de projet (projectName, team, sponsor, date, keyDates, deliverables) : si l'information n'est pas fournie, laisse vide — le Brief Builder s'adapte.

═══════════════════════════════════════════════════
MODALITÉS DE RÉPONSE — RÈGLE ABSOLUE
═══════════════════════════════════════════════════

Pour un test remote non-modéré, chaque question doit préciser comment le participant répond. Choisis toujours le format le plus adapté au contenu et à l'objectif de la question :

- Réponse écrite libre → pour les questions ouvertes exploratoires (pensées, ressentis, descriptions)
- Échelle numérique [1–5] ou [1–7] → pour mesurer intensité, difficulté, satisfaction (précise les ancres ex: 1=Très difficile, 7=Très facile)
- Échelle de Likert [Pas du tout d'accord → Tout à fait d'accord] → pour valider des perceptions
- QCM à choix unique → liste les options + précise "Une seule réponse possible"
- QCM à choix multiple → liste les options + précise "Plusieurs réponses possibles"
- Score SUS (System Usability Scale) → 10 affirmations standardisées, échelle 1–5
- NPS [0–10] → pour intention de recommandation uniquement
- Ranking / tri par ordre de préférence → liste les éléments à trier

Cette information est obligatoire dans le champ "responseFormat" de chaque objet question.

═══════════════════════════════════════════════════
FORMAT DE SORTIE — JSON STRICT
═══════════════════════════════════════════════════

Réponds UNIQUEMENT avec ce JSON brut. Zéro texte avant ou après. Zéro markdown. Commence par { et finis par }.

{
  "ready": true,
  "missingInfo": ["liste des éléments inférés ou supposés, vide si tout était fourni"],
  "protocol": {
    "title": "Titre du test (produit + objectif)",
    "platform": "Plateforme exacte",
    "duration": "Durée totale estimée",
    "objective": "Objectif en 1 phrase actionnable",

    "hypotheses": [
      "Nous pensons que [comportement utilisateur] parce que [raison]. Nous le validerons si [indicateur observable].",
      "Nous pensons que…"
    ],

    "intro": "Script complet d'introduction lu (ou affiché) au participant. Ton neutre, encourageant, sans biais. 4-6 phrases.",

    "warmUpQuestions": [
      {"question": "Question warm-up ouverte sur les habitudes generales", "responseFormat": "Reponse ecrite libre"},
      {"question": "Question contextuelle sur l experience produit", "responseFormat": "Reponse ecrite libre"}
    ],

    "recruitingCriteria": [
      "Critere d inclusion 1",
      "Critere d exclusion 1"
    ],

    "screeners": [
      {
        "question": "Texte de la question screener",
        "responseFormat": "QCM a choix unique — options : [A] / [B] / [C] — Une seule reponse possible",
        "qualifying": "Reponse qualifiante",
        "disqualifying": "Reponse eliminatoire"
      }
    ],

    "tasks": [
      {
        "id": 1,
        "title": "Titre court",
        "scenario": "Mise en situation narrative, 2-3 phrases realistes.",
        "instruction": "Instruction sans biais, verbe d action neutre.",
        "thinkAloudPrompt": "Pensez a voix haute pendant que vous naviguez.",
        "successCriteria": "Definition objective et observable du succes.",
        "metrics": ["taux de succes", "temps de realisation"],
        "postTaskQuestions": [
          {"question": "Sur une echelle de 1 a 7, cette tache vous a-t-elle semble difficile ?", "responseFormat": "Echelle numerique [1-7] — 1 = Tres difficile, 7 = Tres facile"},
          {"question": "Qu est-ce qui vous a pose probleme ou facilite cette tache ?", "responseFormat": "Reponse ecrite libre"}
        ],
        "followUpQuestions": [
          {"question": "Question de relance exploratoire", "responseFormat": "Reponse ecrite libre"}
        ]
      }
    ],

    "closingQuestions": [
      {"question": "Comment evalueriez-vous votre experience globale ?", "responseFormat": "Echelle numerique [1-5] — 1 = Tres mauvaise, 5 = Excellente"},
      {"question": "Qu est-ce qui vous a le plus marque, positivement ou negativement ?", "responseFormat": "Reponse ecrite libre"},
      {"question": "Recommanderiez-vous ce produit a un proche ?", "responseFormat": "NPS [0-10] — 0 = Pas du tout, 10 = Absolument"}
    ],

    "kpis": {
      "quantitatifs": [
        {"label": "Taux de succès global", "cible": "> 70%"},
        {"label": "Taux de complétion par tâche", "cible": ""},
        {"label": "Score SUS moyen", "cible": "> 68"}
      ],
      "qualitatifs": [
        "Verbatims clés à identifier (ex: confusion sur le libellé CTA)",
        "Comportements à observer (ex: hésitation sur l'étape X)"
      ],
      "kpiBusiness": [
        {"label": "KPI business impacté par ce test", "lien": "Lien avec les mesures UX"}
      ]
    },

    "methodology": {
      "risks": "Description des risques méthodologiques spécifiques au non-modéré (biais de sélection, absence de clarification possible, drop-out…)",
      "analysisPlan": "Framework d'analyse recommandé : grille d'observation, catégories de verbatims, méthode de priorisation (ex: rainbow spreadsheet, matrice impact/fréquence)",
      "sessionPlan": "Déroulé détaillé avec timing : 0-2 min intro / 2-5 min warm-up / 5-18 min tâches / 18-20 min clôture",
      "format": "Remote non-modéré",
      "sessionMode": "Non-modéré",
      "tools": "UserTesting"
    },

    "briefMeta": {
      "projectName": "",
      "team": "",
      "date": "",
      "sponsor": "",
      "keyDates": "",
      "deliverables": "",
      "execSummary": "Resume executif 3-4 phrases",
      "keyQuestion": "Question centrale du test",
      "decisionExpected": "Decision business attendue",
      "businessIssue": "Enjeu business concret",
      "businessImpact": "Impact mesurable si resolu",
      "businessStrategy": "Lien strategique",
      "primaryQuestion": "Question de recherche primaire",
      "secondaryQuestions": "Questions secondaires, une par ligne",
      "scopeYes": "Ce que ce test tranche",
      "scopeNo": "Ce que ce test ne tranche PAS",
      "participantCount": "5-8 participants",
      "segments": "",
      "maturityLevel": "",
      "priorExperience": "",
      "constraints": ""
    }
  }
}`;

const TEMPLATE_MESSAGE = `Bonjour ! Je suis votre UX Researcher IA. Je génère des protocoles de test complets et directement exploitables sur UserTesting.

Deux options :

**Option 1 — Template guidée** : remplissez les champs ci-dessous (tout ou partie) et envoyez. Je génère immédiatement un protocole complet avec hypothèses, screeners, scénarios, KPIs, plan d'analyse et risques méthodologiques — en inférant ce qui manque.

**Option 2 — Description libre** : décrivez votre projet en quelques phrases, je prends en charge le reste.`;

const TEMPLATE_TEXT = `Voici le contexte du projet :
* Produit / service : [décrire]
* Type de plateforme : [B2B / B2C / SaaS / e-commerce / app mobile…]
* Objectif business : [ex : augmenter le taux de création de compte]
* Objectif de recherche : [ex : identifier les frictions dans le parcours d'inscription]
* Cible : [profil précis, critères de recrutement]
* Stade du produit : [prototype / beta / live]
* Contraintes spécifiques : [temps, budget, device, marché, etc.]

Informations projet (optionnel) :
* Nom du projet : 
* Équipe / commanditaire : 
* Date souhaitée : 
* Livrables attendus : `;

/* ━━━ BRIEF STEPS & DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const STEPS = [
  {id:1,label:"Synthèse exécutive",icon:"⚡"},
  {id:2,label:"Enjeu business",icon:"💼"},
  {id:3,label:"Type de test",icon:"🔬"},
  {id:4,label:"Objectifs",icon:"🎯"},
  {id:5,label:"Mesures & KPI",icon:"📊"},
  {id:6,label:"Périmètre de décision",icon:"🗺️"},
  {id:7,label:"Participants",icon:"👥"},
  {id:8,label:"Méthodologie",icon:"⚙️"},
  {id:9,label:"Plan de session",icon:"📝"},
  {id:10,label:"Planning & logistique",icon:"📅"},
  {id:11,label:"Risques",icon:"⚠️"},
];
const TEST_TYPES = ["Modéré","Non-modéré","Test de concept","Accessibilité","A/B User Test"];
const initData = () => ({
  projectName:"",team:"",date:"",sponsor:"",execSummary:"",keyQuestion:"",decisionExpected:"",
  businessIssue:"",businessImpact:"",businessStrategy:"",testTypes:[],
  primaryQuestion:"",secondaryQuestions:"",hypotheses:"",
  measuresQuanti:[],measuresQuali:[],kpiBusiness:[],
  scopeYes:"",scopeNo:"",
  participantCriteria:"",participantCount:"",segments:"",maturityLevel:"",priorExperience:"",
  format:"",sessionMode:"",duration:"",tools:"",
  sessionPlan:"",tasks:"",interviewGuide:"",keyDates:"",deliverables:"",risks:"",constraints:"",
});

/* ━━━ SLIDE ATOMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Lbl = ({c,color=T.muted}) => <div style={{fontFamily:T.ff,fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color,marginBottom:5}}>{c}</div>;
const Rule = ({color=T.accent,h=2,w=40,my=12}:{color?:string,h?:number,w?:number|string,my?:number}) => <div style={{height:h,width:w,background:color,borderRadius:1,margin:`${my}px 0`}}/>;
const Chip = ({c,color=T.accent}) => <span style={{fontFamily:T.ff,fontSize:9,fontWeight:700,color,background:`${color}14`,border:`1px solid ${color}28`,borderRadius:4,padding:"2px 8px",display:"inline-block"}}>{c}</span>;
const Body = ({c,size=11,lh=1.8,color=T.ink2}) => <p style={{fontFamily:T.ff,fontSize:size,color,lineHeight:lh,margin:0,whiteSpace:"pre-line"}}>{c||"—"}</p>;
const Shell = ({children}) => (
  <div style={{fontFamily:T.ff,width:"100%",height:"100%",background:T.bg,display:"flex",flexDirection:"column",position:"relative",boxSizing:"border-box"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:T.accent,zIndex:2}}/>
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",padding:"28px 30px 22px",paddingTop:32,scrollbarWidth:"thin",scrollbarColor:`${T.border} transparent`}}>{children}</div>
  </div>
);
const TwoCol = ({l,r,split="1fr 1fr",gap=20}) => <div style={{display:"grid",gridTemplateColumns:split,gap,flex:1}}>{l}{r}</div>;
const MetaBox = ({icon,val,label}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:T.bg2,borderRadius:6,border:`1px solid ${T.border}`}}>
    <span style={{fontSize:15}}>{icon}</span>
    <div><div style={{fontSize:11,fontWeight:800,color:T.ink,lineHeight:1}}>{val||"—"}</div><div style={{fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{label}</div></div>
  </div>
);
const v = x => x||"—";

/* ━━━ BRIEF SLIDES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const buildBriefSlides = (d, ai) => {
  const g = (key, fallback) => (ai&&ai[key]) ? ai[key] : fallback;
  return [
    {id:1,label:"Couverture",render:()=>(
      <Shell>
        <div style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:24,height:"100%"}}>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <Lbl c="User Research · Brief de validation"/>
            <h1 style={{fontFamily:T.ff,fontSize:24,fontWeight:900,color:T.ink,margin:"0 0 4px",lineHeight:1.1,letterSpacing:"-0.02em"}}>{g("coverTitle",v(d.projectName))}</h1>
            <div style={{fontSize:11,color:T.muted,marginBottom:14,fontStyle:"italic"}}>{g("coverSub",d.testTypes.join(" · ")||"Test utilisateur")}</div>
            <Rule/>
            <div style={{background:`${T.accent}0D`,border:`1px solid ${T.accent}28`,borderLeft:`3px solid ${T.accent}`,borderRadius:6,padding:"10px 14px",marginBottom:10}}>
              <div style={{fontSize:8,fontWeight:700,color:T.accent,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Question clé</div>
              <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.4}}>{g("coverKeyQuestion",v(d.keyQuestion))}</div>
            </div>
            <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 14px"}}>
              <div style={{fontSize:8,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>Décision attendue</div>
              <div style={{fontSize:11,color:T.ink2,lineHeight:1.5}}>{g("coverDecision",v(d.decisionExpected))}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,justifyContent:"center",borderLeft:`1px solid ${T.border}`,paddingLeft:18}}>
            <Lbl c="Contexte"/>
            {[["Équipe",d.team],["Commanditaire",d.sponsor],["Date",d.date]].map(([l,val])=>(
              <div key={l} style={{marginBottom:6}}>
                <div style={{fontSize:8,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>{l}</div>
                <div style={{fontSize:11,fontWeight:700,color:T.ink}}>{v(val)}</div>
              </div>
            ))}
            <Rule color={T.border} h={1} w="100%" my={6}/>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{d.testTypes.map(t=><Chip key={t} c={t}/>)}</div>
            <Rule color={T.border} h={1} w="100%" my={6}/>
            <Body c={g("coverSummary",v(d.execSummary))} size={10}/>
          </div>
        </div>
      </Shell>
    )},
    {id:2,label:"Enjeu",render:()=>(
      <Shell>
        <Lbl c="02 · Enjeu Business"/>
        <TwoCol split="1.4fr 1fr"
          l={<div style={{display:"flex",flexDirection:"column"}}>
            <h2 style={{fontFamily:T.ff,fontSize:19,fontWeight:900,color:T.ink,margin:"0 0 4px",letterSpacing:"-0.02em",lineHeight:1.2}}>{g("enjeuTitle","Pourquoi ce test, maintenant ?")}</h2>
            <div style={{fontSize:10,color:T.muted,marginBottom:12,fontStyle:"italic"}}>{g("enjeuSub","La question business que ce test doit éclairer")}</div>
            <Rule/>
            <Body c={g("enjeuIssue",v(d.businessIssue))} size={12}/>
            <Rule color={T.border} h={1} w="100%" my={12}/>
            <Lbl c="Impact attendu"/>
            <Body c={g("enjeuImpact",v(d.businessImpact))}/>
          </div>}
          r={<div style={{background:T.accent,borderRadius:10,padding:18,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:8}}>Lien stratégique</div>
              <p style={{fontFamily:T.ff,fontSize:11,color:"#fff",lineHeight:1.75,margin:0}}>{g("enjeuStrategy",v(d.businessStrategy))}</p>
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.2)"}}>
              <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>Équipe</div>
              <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{v(d.team)}</div>
            </div>
          </div>}
        />
      </Shell>
    )},
    {id:3,label:"Objectifs",render:()=>(
      <Shell>
        <Lbl c="03 · Objectifs de Recherche"/>
        <div style={{background:T.ink,borderRadius:8,padding:"14px 18px",marginBottom:16}}>
          <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:6}}>Question primaire — celle qui débloque la décision</div>
          <div style={{fontFamily:T.ff,fontSize:14,fontWeight:800,color:"#fff",lineHeight:1.4}}>{g("objPrimary",v(d.primaryQuestion))}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,flex:1}}>
          <div style={{borderTop:`2px solid ${T.accent}`,paddingTop:12}}><Lbl c="Questions secondaires"/><Body c={g("objSecondary",v(d.secondaryQuestions))}/></div>
          <div style={{borderTop:`2px solid ${T.border}`,paddingTop:12}}><Lbl c="Hypothèses à valider"/><Body c={g("objHypotheses",v(d.hypotheses))}/></div>
        </div>
      </Shell>
    )},
    {id:4,label:"Mesures & KPI",render:()=>(
      <Shell>
        <Lbl c="04 · Mesures de l'étude & KPI business"/>
        <h2 style={{fontFamily:T.ff,fontSize:19,fontWeight:900,color:T.ink,margin:"0 0 14px",letterSpacing:"-0.02em"}}>Ce qu'on mesure & ce qu'on veut atteindre</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,flex:1}}>
          {[
            {label:"Données quantitatives",color:T.accent,shape:"circle",items:d.measuresQuanti,render:m=><><div style={{fontSize:11,fontWeight:700,color:T.ink}}>{m.label}</div>{m.threshold&&<div style={{marginTop:4,fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"1px 6px",display:"inline-block"}}>Seuil : {m.threshold}</div>}</>},
            {label:"Données qualitatives",color:T.ink,shape:"square",items:d.measuresQuali,render:m=><div style={{fontSize:11,color:T.ink2}}>{m.label}</div>},
            {label:"KPI business visés",color:T.ok,shape:"diamond",items:d.kpiBusiness,render:m=><div style={{fontSize:11,fontWeight:600,color:T.ink}}>{m.label}</div>,footer:"Les mesures de l'étude sont des indicateurs proxy de ces KPI business."},
          ].map(({label,color,shape,items,render,footer})=>(
            <div key={label} style={{display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`2px solid ${color}`}}>
                <div style={{width:8,height:8,borderRadius:shape==="circle"?"50%":shape==="diamond"?2:2,background:color,flexShrink:0,transform:shape==="diamond"?"rotate(45deg)":"none"}}/>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color}}>{label}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,flex:1}}>
                {(items.length>0?items:[{label:"—"}]).map((m,i)=>(
                  <div key={i} style={{background:color===T.ok?`${T.ok}08`:T.bg2,borderRadius:6,padding:"8px 10px",border:`1px solid ${color===T.ok?`${T.ok}20`:T.border}`}}>{render(m)}</div>
                ))}
              </div>
              {footer&&<div style={{marginTop:10,padding:"8px 10px",background:T.bg3,borderRadius:6,fontSize:9,color:T.muted,fontStyle:"italic",lineHeight:1.5}}>{footer}</div>}
            </div>
          ))}
        </div>
      </Shell>
    )},
    {id:5,label:"Périmètre",render:()=>(
      <Shell>
        <Lbl c="05 · Périmètre de Décision"/>
        <h2 style={{fontFamily:T.ff,fontSize:19,fontWeight:900,color:T.ink,margin:"0 0 4px",letterSpacing:"-0.02em"}}>{g("scopeTitle","Ce test tranche — et ce qu'il ne tranche pas")}</h2>
        <div style={{fontSize:10,color:T.muted,fontStyle:"italic",marginBottom:14}}>{g("scopeSub","Clarifier le périmètre maintenant évite les mauvaises surprises à l'analyse")}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,flex:1}}>
          {[{color:T.ok,icon:"✓",label:"Ce test permettra de trancher",key:"scopeYes",val:d.scopeYes},{color:T.danger,icon:"✕",label:"Ce test ne permettra PAS de décider",key:"scopeNo",val:d.scopeNo}].map(({color,icon,label,key,val})=>(
            <div key={key} style={{border:`1px solid ${color}28`,borderTop:`3px solid ${color}`,borderRadius:8,padding:16,background:`${color}04`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{background:color,color:"#fff",borderRadius:4,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,flexShrink:0}}>{icon}</span>
                <div style={{fontSize:9,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.12em"}}>{label}</div>
              </div>
              {g(key,v(val)).split("\n").filter(Boolean).map((line,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color,fontSize:10,flexShrink:0,marginTop:1}}>{icon}</span>
                  <span style={{fontFamily:T.ff,fontSize:10.5,color:T.ink2,lineHeight:1.6}}>{line.replace(/^[-•→✕✓]\s*/,"")}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Shell>
    )},
    {id:6,label:"Participants",render:()=>(
      <Shell>
        <Lbl c="06 · Profil des Participants"/>
        <TwoCol split="1.1fr 1fr"
          l={<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <h2 style={{fontFamily:T.ff,fontSize:19,fontWeight:900,color:T.ink,margin:0,letterSpacing:"-0.02em",lineHeight:1.2}}>{g("participantTitle","À qui s'adresse ce test ?")}</h2>
            <Rule/>
            <div><Lbl c="Critères de recrutement"/><Body c={g("participantCriteria",v(d.participantCriteria))}/></div>
            <Rule color={T.border} h={1} w="100%" my={4}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><Lbl c="Maturité digitale"/><Body c={g("participantMaturity",v(d.maturityLevel))}/></div>
              <div><Lbl c="Expérience produit"/><Body c={g("participantExperience",v(d.priorExperience))}/></div>
            </div>
            {d.segments&&<div><Lbl c="Segments cibles"/><Body c={g("participantSegments",v(d.segments))}/></div>}
          </div>}
          r={<div style={{display:"flex",flexDirection:"column",gap:8,paddingLeft:18,borderLeft:`1px solid ${T.border}`,justifyContent:"center"}}>
            <MetaBox icon="👥" val={v(d.participantCount)} label="Participants"/>
            <MetaBox icon="📍" val={v(d.format)} label="Format"/>
            <MetaBox icon="⏱" val={v(d.duration)} label="Durée / session"/>
            <MetaBox icon="🛠" val={v(d.tools).split(",")[0]||"—"} label="Outil principal"/>
          </div>}
        />
      </Shell>
    )},
    {id:7,label:"Méthodo & Session",render:()=>{
      const layout = g("methoLayout","default");
      const title  = g("methoTitle","Méthodologie & Session");
      const steps  = g("methoSteps", null); // [{label, duration, detail}]
      const badges = [{label:"Format",val:g("methoFormat",v(d.format))},{label:"Mode",val:g("methoMode",v(d.sessionMode))},{label:"Durée",val:g("methoDuration",v(d.duration))},{label:"Outils",val:g("methoTools",v(d.tools))}];
      const plan   = g("sessionPlan", v(d.sessionPlan));
      const tasks  = g("sessionTasks", v(d.tasks));
      const guide  = g("sessionGuide", v(d.interviewGuide));

      /* ── Layout: timeline ── étapes horodatées avec barre verticale */
      if(layout==="timeline" && steps) return (
        <Shell>
          <Lbl c="07 · Méthodologie & Plan de Session"/>
          <h2 style={{fontFamily:T.ff,fontSize:16,fontWeight:900,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.01em"}}>{title}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {badges.map(({label,val})=><span key={label} style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 9px"}}>{label} : {val}</span>)}
          </div>
          <div style={{position:"relative",paddingLeft:20,flex:1}}>
            <div style={{position:"absolute",left:6,top:4,bottom:4,width:2,background:T.border,borderRadius:1}}/>
            {steps.map((s,i)=>(
              <div key={i} style={{position:"relative",marginBottom:12,paddingLeft:12}}>
                <div style={{position:"absolute",left:-14,top:4,width:10,height:10,borderRadius:"50%",background:T.accent,border:`2px solid ${T.bg}`}}/>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:2}}>
                  {s.duration&&<span style={{fontSize:9,fontWeight:800,color:T.accent,minWidth:40}}>{s.duration}</span>}
                  <span style={{fontSize:11,fontWeight:700,color:T.ink}}>{s.label}</span>
                </div>
                {s.detail&&<div style={{fontSize:10,color:T.ink2,lineHeight:1.6}}>{s.detail}</div>}
              </div>
            ))}
          </div>
        </Shell>
      );

      /* ── Layout: steps ── blocs numérotés en ligne */
      if(layout==="steps" && steps) return (
        <Shell>
          <Lbl c="07 · Méthodologie & Plan de Session"/>
          <h2 style={{fontFamily:T.ff,fontSize:16,fontWeight:900,color:T.ink,margin:"0 0 10px",letterSpacing:"-0.01em"}}>{title}</h2>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {badges.map(({label,val})=><span key={label} style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 9px"}}>{label} : {val}</span>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(steps.length,4)},1fr)`,gap:10,flex:1}}>
            {steps.map((s,i)=>(
              <div key={i} style={{background:T.bg2,borderRadius:8,padding:"12px 14px",border:`1px solid ${T.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:T.accent,opacity:.35+i*.13}}/>
                <div style={{fontSize:22,fontWeight:900,color:T.accent,opacity:.15,lineHeight:1,marginBottom:4}}>{String(i+1).padStart(2,"0")}</div>
                <div style={{fontSize:11,fontWeight:800,color:T.ink,marginBottom:4,lineHeight:1.3}}>{s.label}</div>
                {s.duration&&<div style={{fontSize:9,fontWeight:700,color:T.accent,marginBottom:4}}>{s.duration}</div>}
                {s.detail&&<div style={{fontSize:10,color:T.ink2,lineHeight:1.6}}>{s.detail}</div>}
              </div>
            ))}
          </div>
        </Shell>
      );

      /* ── Layout: split ── 2 colonnes tâches / guide */
      if(layout==="split") return (
        <Shell>
          <Lbl c="07 · Méthodologie & Plan de Session"/>
          <h2 style={{fontFamily:T.ff,fontSize:16,fontWeight:900,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.01em"}}>{title}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {badges.map(({label,val})=><span key={label} style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 9px"}}>{label} : {val}</span>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,flex:1}}>
            <div style={{background:T.ink,borderRadius:8,padding:14,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)"}}>Tâches & Scénarios</div>
              <div style={{width:16,height:2,background:"rgba(255,255,255,0.2)",borderRadius:1}}/>
              <Body c={tasks} size={10} color="rgba(255,255,255,0.85)" lh={1.7}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{background:T.bg2,borderRadius:8,padding:14,border:`1px solid ${T.border}`,flex:1}}>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Déroulé</div>
                <Body c={plan} size={10} lh={1.7}/>
              </div>
              <div style={{background:T.bg2,borderRadius:8,padding:14,border:`1px solid ${T.border}`,flex:1}}>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Guide d'entretien</div>
                <Body c={guide} size={10} lh={1.7}/>
              </div>
            </div>
          </div>
        </Shell>
      );

      /* ── Default fallback ── grille 4 badges + 3 colonnes contenu */
      return (
        <Shell>
          <Lbl c="07 · Méthodologie & Plan de Session"/>
          <h2 style={{fontFamily:T.ff,fontSize:16,fontWeight:900,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.01em"}}>{title}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {badges.map(({label,val})=><span key={label} style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 9px"}}>{label} : {val}</span>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.1fr 1fr",gap:10,flex:1}}>
            {[{label:"Déroulé",val:plan,accent:false},{label:"Tâches & Scénarios",val:tasks,accent:true},{label:"Guide d'entretien",val:guide,accent:false}].map(({label,val,accent})=>(
              <div key={label} style={{background:accent?T.ink:T.bg2,borderRadius:8,padding:12,border:`1px solid ${accent?T.ink:T.border}`,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:accent?"rgba(255,255,255,0.4)":T.muted}}>{label}</div>
                <div style={{width:16,height:2,background:accent?"rgba(255,255,255,0.2)":T.accent,borderRadius:1}}/>
                <Body c={val} size={10} color={accent?"rgba(255,255,255,0.85)":T.ink2} lh={1.7}/>
              </div>
            ))}
          </div>
        </Shell>
      );
    }},
    {id:8,label:"Planning",render:()=>(
      <Shell>
        <Lbl c="08 · Planning & Livrables"/>
        <TwoCol split="1.1fr 1fr"
          l={<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <h2 style={{fontFamily:T.ff,fontSize:19,fontWeight:900,color:T.ink,margin:0,letterSpacing:"-0.02em"}}>{g("planningTitle","Calendrier & livrables")}</h2>
            <Rule/>
            <div><Lbl c="Dates clés"/><Body c={g("planningDates",v(d.keyDates))}/></div>
            <Rule color={T.border} h={1} w="100%" my={4}/>
            <div><Lbl c="Livrables attendus"/><Body c={g("planningDeliverables",v(d.deliverables))}/></div>
          </div>}
          r={<div style={{background:T.bg2,borderRadius:8,padding:16,border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:12}}>
            <div><Lbl c="⚠ Risques identifiés"/><Body c={g("planningRisks",v(d.risks))}/></div>
            <Rule color={T.border} h={1} w="100%" my={4}/>
            <div><Lbl c="🔒 Contraintes"/><Body c={g("planningConstraints",v(d.constraints))}/></div>
          </div>}
        />
      </Shell>
    )},
    {id:9,label:"Validation",render:()=>(
      <Shell>
        <TwoCol split="1.2fr 1fr"
          l={<div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <Lbl c="09 · Décision attendue"/>
            <h1 style={{fontFamily:T.ff,fontSize:24,fontWeight:900,color:T.ink,margin:"0 0 6px",letterSpacing:"-0.03em",lineHeight:1.1}}>
              {g("validationTitle","Votre go pour")}<br/>
              <span style={{color:T.accent}}>{g("validationTitleAccent","lancer ce test.")}</span>
            </h1>
            <Rule/>
            <p style={{fontFamily:T.ff,fontSize:10.5,color:T.muted,lineHeight:1.7,margin:"0 0 16px"}}>{g("validationSub",v(d.decisionExpected))}</p>
            {(g("validationChecks",["Lancement opérationnel validé",`Échantillon confirmé (${v(d.participantCount)})`,"Planning acté","Périmètre de décision partagé avec l'équipe"])).map((c,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                <div style={{width:17,height:17,borderRadius:4,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <span style={{color:"#fff",fontSize:8,fontWeight:900}}>✓</span>
                </div>
                <span style={{fontFamily:T.ff,fontSize:11,color:T.ink2,lineHeight:1.5}}>{c}</span>
              </div>
            ))}
          </div>}
          r={<div style={{background:T.ink,borderRadius:10,padding:20,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:8,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:8}}>Résumé du brief</div>
              <div style={{fontSize:18,fontWeight:900,color:"#fff",lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:10}}>{g("validationProject",v(d.projectName))}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",lineHeight:1.6,marginBottom:12}}>{g("validationQuestion",v(d.keyQuestion))}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{d.testTypes.map(t=><span key={t} style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.75)",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:3}}>{t}</span>)}</div>
            </div>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["👥",v(d.participantCount),"participants"],["⏱",v(d.duration),"durée"],["📍",v(d.format),"format"],["📊",String((d.measuresQuanti.length+d.measuresQuali.length)||0),"mesures"]].map(([ic,val,label])=>(
                <div key={label}><div style={{fontSize:13,marginBottom:2}}>{ic}</div><div style={{fontSize:11,fontWeight:700,color:"#fff",lineHeight:1}}>{val}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:2}}>{label}</div></div>
              ))}
            </div>
          </div>}
        />
      </Shell>
    )},
  ];
};

/* ━━━ PROTOCOL VIEWER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const ProtocolViewer = ({protocol, onEdit, onUseBrief, onAnalyse, onBack}) => {
  const [editing, setEditing]   = useState(null);
  const [editVal, setEditVal]   = useState("");
  const [proto, setProto]       = useState(protocol);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [addingTo, setAddingTo] = useState(null); // {section, taskIdx?}
  const [addVal, setAddVal]     = useState("");
  const chatBottomRef = useRef(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  /* ── Inline edit ── */
  const startEdit = (path, val) => { setEditing(path); setEditVal(typeof val === "string" ? val : ""); };
  const saveEdit = () => {
    if (!editing) return;
    const p = JSON.parse(JSON.stringify(proto));
    const {type, taskIdx, qIdx, idx} = editing;
    if (type==="intro")          p.intro = editVal;
    else if (type==="objective") p.objective = editVal;
    else if (type==="hypothesis") p.hypotheses[idx] = editVal;
    else if (type==="recruiting") p.recruitingCriteria[qIdx] = editVal;
    else if (type==="screenerQ") p.screeners[qIdx].question = editVal;
    else if (type==="screenerFmt") p.screeners[qIdx].responseFormat = editVal;
    else if (type==="taskTitle") p.tasks[taskIdx].title = editVal;
    else if (type==="taskScenario") p.tasks[taskIdx].scenario = editVal;
    else if (type==="taskInstruction") p.tasks[taskIdx].instruction = editVal;
    else if (type==="taskSuccess") p.tasks[taskIdx].successCriteria = editVal;
    else if (type==="warmUp") { const q=p.warmUpQuestions[qIdx]; p.warmUpQuestions[qIdx]=typeof q==="object"?{...q,question:editVal}:editVal; }
    else if (type==="postTask") { const q=p.tasks[taskIdx].postTaskQuestions[qIdx]; p.tasks[taskIdx].postTaskQuestions[qIdx]=typeof q==="object"?{...q,question:editVal}:editVal; }
    else if (type==="followUp") { const q=p.tasks[taskIdx].followUpQuestions[qIdx]; p.tasks[taskIdx].followUpQuestions[qIdx]=typeof q==="object"?{...q,question:editVal}:editVal; }
    else if (type==="closing") { const q=p.closingQuestions[qIdx]; p.closingQuestions[qIdx]=typeof q==="object"?{...q,question:editVal}:editVal; }
    else if (type==="risks") p.methodology.risks = editVal;
    else if (type==="analysisPlan") p.methodology.analysisPlan = editVal;
    else if (type==="responseFormat") {
      const {section, qIdx, taskIdx} = editing;
      const updateFmt = (q) => typeof q==="object" ? {...q, responseFormat:editVal} : {question:q, responseFormat:editVal};
      if (section==="warmUp")   p.warmUpQuestions[qIdx] = updateFmt(p.warmUpQuestions[qIdx]);
      else if (section==="postTask")  p.tasks[taskIdx].postTaskQuestions[qIdx] = updateFmt(p.tasks[taskIdx].postTaskQuestions[qIdx]);
      else if (section==="followUp")  p.tasks[taskIdx].followUpQuestions[qIdx] = updateFmt(p.tasks[taskIdx].followUpQuestions[qIdx]);
      else if (section==="closing")   p.closingQuestions[qIdx] = updateFmt(p.closingQuestions[qIdx]);
    }
    setProto(p); setEditing(null);
  };

  /* ── Add to list ── */
  const commitAdd = () => {
    if (!addVal.trim()) { setAddingTo(null); return; }
    const p = JSON.parse(JSON.stringify(proto));
    const {section, taskIdx} = addingTo;
    const newQ = {question: addVal, responseFormat: "Reponse ecrite libre"};
    if (section==="hypothesis")  p.hypotheses = [...(p.hypotheses||[]), addVal];
    else if (section==="recruiting") p.recruitingCriteria = [...(p.recruitingCriteria||[]), addVal];
    else if (section==="screener")   p.screeners = [...(p.screeners||[]), {question:addVal, responseFormat:"QCM a choix unique", qualifying:"", disqualifying:""}];
    else if (section==="warmUp")     p.warmUpQuestions = [...(p.warmUpQuestions||[]), newQ];
    else if (section==="postTask")   p.tasks[taskIdx].postTaskQuestions = [...(p.tasks[taskIdx].postTaskQuestions||[]), newQ];
    else if (section==="followUp")   p.tasks[taskIdx].followUpQuestions = [...(p.tasks[taskIdx].followUpQuestions||[]), newQ];
    else if (section==="closing")    p.closingQuestions = [...(p.closingQuestions||[]), newQ];
    else if (section==="task")       p.tasks = [...(p.tasks||[]), {id:p.tasks.length+1, title:addVal, scenario:"", instruction:"", successCriteria:"", metrics:[], postTaskQuestions:[], followUpQuestions:[]}];
    setProto(p); setAddingTo(null); setAddVal("");
  };

  /* ── Remove from list ── */
  const removeItem = (section, idx, taskIdx) => {
    const p = JSON.parse(JSON.stringify(proto));
    if (section==="hypothesis")  p.hypotheses.splice(idx, 1);
    else if (section==="recruiting") p.recruitingCriteria.splice(idx, 1);
    else if (section==="screener")   p.screeners.splice(idx, 1);
    else if (section==="warmUp")     p.warmUpQuestions.splice(idx, 1);
    else if (section==="postTask")   p.tasks[taskIdx].postTaskQuestions.splice(idx, 1);
    else if (section==="followUp")   p.tasks[taskIdx].followUpQuestions.splice(idx, 1);
    else if (section==="closing")    p.closingQuestions.splice(idx, 1);
    setProto(p);
  };

  /* ── AI revision ── */
  const sendRevision = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, {role:"user", content:msg}]);
    setChatInput(""); setChatLoading(true);
    try {
      const sys = `Tu es un UX Researcher senior. Tu modifies un protocole de test existant selon les instructions. Reponds UNIQUEMENT avec le JSON complet mis a jour, sans markdown, sans texte avant ou apres. Commence par { et finis par }.`;
      const prompt = `Protocole actuel:
${JSON.stringify(proto, null, 2)}

Instruction: "${msg}"

Retourne le protocole complet modifie.`;
      const reply = await callClaude([{role:"user", content:prompt}], sys, 12000);
      const clean = reply.replace(/\`\`\`json|\`\`\`/g,"").trim();
      const s = clean.indexOf("{"), e2 = clean.lastIndexOf("}");
      if (s!==-1 && e2!==-1) {
        try {
          const updated = JSON.parse(clean.slice(s, e2+1));
          if (updated.tasks || updated.hypotheses || updated.objective) {
            setProto(updated);
            setChatMessages(prev => [...prev, {role:"assistant", content:"Protocole mis a jour."}]);
          } else setChatMessages(prev => [...prev, {role:"assistant", content:reply}]);
        } catch { setChatMessages(prev => [...prev, {role:"assistant", content:reply}]); }
      } else setChatMessages(prev => [...prev, {role:"assistant", content:reply}]);
    } catch(e) { setChatMessages(prev => [...prev, {role:"assistant", content:`Erreur : ${e.message}`}]); }
    setChatLoading(false);
  };

  /* ── Helpers ── */
  const qText = q => typeof q==="string" ? q : (q?.question||"");
  const qFmt  = q => typeof q==="object" ? q?.responseFormat : null;

  const EditableText = ({value, path, multiline=false, style={}}) => {
    const isEditing = editing && JSON.stringify(editing)===JSON.stringify(path);
    if (isEditing) return (
      <div style={{display:"flex",flexDirection:"column",gap:6,...style}}>
        {multiline
          ? <textarea value={editVal} onChange={e=>setEditVal(e.target.value)} rows={3} autoFocus style={{width:"100%",border:`2px solid ${T.accent}`,borderRadius:6,padding:"6px 8px",fontSize:12,fontFamily:T.ff,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          : <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}} style={{width:"100%",border:`2px solid ${T.accent}`,borderRadius:6,padding:"6px 8px",fontSize:12,fontFamily:T.ff,outline:"none"}}/>}
        <div style={{display:"flex",gap:6}}>
          <button onClick={saveEdit} style={{background:T.accent,color:"#fff",border:"none",borderRadius:5,padding:"4px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Enregistrer</button>
          <button onClick={()=>setEditing(null)} style={{background:T.bg3,color:T.muted,border:"none",borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Annuler</button>
        </div>
      </div>
    );
    return (
      <div onClick={()=>startEdit(path, value)} style={{cursor:"text",padding:"3px 5px",borderRadius:5,border:"1px dashed transparent",transition:"all .15s",...style}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=`${T.accent}55`;e.currentTarget.style.background=`${T.accent}06`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";e.currentTarget.style.background="transparent";}}>
        <span style={{fontFamily:T.ff,fontSize:12,color:T.ink2,lineHeight:1.6}}>{value}</span>
        <span style={{marginLeft:5,fontSize:9,color:T.accent2,opacity:.5}}>&#9998;</span>
      </div>
    );
  };

  const FORMAT_PRESETS = [
    "Reponse ecrite libre",
    "Echelle numerique [1-5] — 1 = Tres mauvais, 5 = Excellent",
    "Echelle numerique [1-7] — 1 = Tres difficile, 7 = Tres facile",
    "Echelle de Likert [Pas du tout d accord → Tout a fait d accord]",
    "QCM a choix unique — options : [A] / [B] / [C]",
    "QCM a choix multiple — options : [A] / [B] / [C]",
    "NPS [0-10] — 0 = Pas du tout, 10 = Absolument",
    "Score SUS — 10 affirmations, echelle 1-5",
    "Ranking — classer par ordre de preference",
  ];

  const fmtPath = (section, qIdx, taskIdx) => ({type:"responseFormat", section, qIdx, taskIdx});

  const QItem = ({q, editPath, section, idx, taskIdx}) => {
    const txt=qText(q), fmt=qFmt(q);
    const fmtEditPath = fmtPath(section, idx, taskIdx);
    const isEditingFmt = editing && editing.type==="responseFormat" && editing.section===section && editing.qIdx===idx && editing.taskIdx===taskIdx;
    return (
      <div style={{background:T.bg2,borderRadius:6,border:`1px solid ${T.border}`,overflow:"hidden",position:"relative"}}>
        <div style={{padding:"5px 26px 5px 8px"}}>
          <EditableText value={txt} path={editPath}/>
        </div>
        <div style={{padding:"3px 8px 7px",borderTop:`1px dashed ${T.border}`}}>
          {isEditingFmt ? (
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:2}}>
                {FORMAT_PRESETS.map((p,pi)=>(
                  <button key={pi} onClick={()=>{ setEditVal(p); }}
                    style={{fontSize:9,padding:"2px 8px",borderRadius:4,border:`1px solid ${editVal===p?T.accent:T.border}`,background:editVal===p?`${T.accent}14`:"#fff",color:editVal===p?T.accent:T.ink2,cursor:"pointer",fontWeight:editVal===p?700:400,transition:"all .1s"}}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:5}}>
                <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
                  onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}}
                  placeholder="Format personnalise..."
                  style={{flex:1,border:`1px solid ${T.accent}`,borderRadius:5,padding:"4px 8px",fontSize:10,fontFamily:T.ff,outline:"none"}}/>
                <button onClick={saveEdit} style={{background:T.accent,color:"#fff",border:"none",borderRadius:4,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>OK</button>
                <button onClick={()=>setEditing(null)} style={{background:T.bg3,color:T.muted,border:"none",borderRadius:4,padding:"4px 7px",fontSize:10,cursor:"pointer"}}>&#215;</button>
              </div>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}
              onClick={()=>startEdit(fmtEditPath, fmt||"")}>
              <span style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 8px",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}22`}
                onMouseLeave={e=>e.currentTarget.style.background=`${T.accent}0D`}>
                &#8627; {fmt || <em style={{opacity:.5,fontWeight:400}}>Ajouter modalite</em>}
              </span>
              <span style={{fontSize:9,color:T.accent2,opacity:.45}}>&#9998;</span>
            </div>
          )}
        </div>
        <button onClick={()=>removeItem(section,idx,taskIdx)} style={{position:"absolute",top:5,right:5,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,lineHeight:1,padding:"1px 4px",borderRadius:3}}
          onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>&#215;</button>
      </div>
    );
  };

  const AddInline = ({section, label, taskIdx}) => {
    const isMe = addingTo?.section===section && addingTo?.taskIdx===taskIdx;
    if (isMe) return (
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <input value={addVal} onChange={e=>setAddVal(e.target.value)} autoFocus
          onKeyDown={e=>{if(e.key==="Enter")commitAdd();if(e.key==="Escape"){setAddingTo(null);setAddVal("");}}}
          placeholder={`Nouveau : ${label}`}
          style={{flex:1,border:`1px solid ${T.accent}`,borderRadius:6,padding:"5px 10px",fontSize:11,fontFamily:T.ff,outline:"none",background:T.bg}}/>
        <button onClick={commitAdd} style={{background:T.accent,color:"#fff",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Ajouter</button>
        <button onClick={()=>{setAddingTo(null);setAddVal("");}} style={{background:T.bg3,color:T.muted,border:"none",borderRadius:5,padding:"5px 8px",fontSize:11,cursor:"pointer"}}>&#215;</button>
      </div>
    );
    return (
      <button onClick={()=>{setAddingTo({section,taskIdx});setAddVal("");}}
        style={{marginTop:7,display:"flex",alignItems:"center",gap:5,fontSize:10,color:T.accent,background:`${T.accent}08`,border:`1px dashed ${T.accent}35`,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontWeight:600}}>
        + Ajouter {label}
      </button>
    );
  };

  const EXAMPLES = [
    "Ajoute une tache sur la recherche de produit",
    "Rends les instructions plus naturelles et sans biais",
    "Ajoute 2 questions de cloture sur l intention d achat",
    "Reformule les hypotheses de facon plus testable",
    "Adapte les screeners pour un profil 45-60 ans",
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg2,fontFamily:T.ff,display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0}}>&#8592; Retour</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:800,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proto.title}</div>
          <div style={{fontSize:10,color:T.muted}}>{proto.platform} &middot; {proto.duration}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {!panelOpen && <div style={{fontSize:10,color:T.muted,fontStyle:"italic"}}>Cliquez sur un texte pour l&apos;editer</div>}
          <button onClick={()=>setPanelOpen(p=>!p)}
            style={{background:panelOpen?T.accent:T.bg,color:panelOpen?"#fff":T.ink2,border:`1px solid ${panelOpen?T.accent:T.border}`,borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
            &#10022; {panelOpen?"Fermer IA":"Modifier avec IA"}
          </button>
          <button onClick={()=>{
            const json = JSON.stringify(proto, null, 2);
            const blob = new Blob([json], {type:"application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (proto.title||"protocole").replace(/[^a-z0-9]/gi,"_").toLowerCase() + ".json";
            a.click();
            URL.revokeObjectURL(url);
          }} style={{background:T.bg,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            &#8659; JSON
          </button>
          <button onClick={()=>onUseBrief(proto)} style={{background:T.ok,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            &#8594; Brief Builder
          </button>
          <button onClick={()=>onAnalyse&&onAnalyse(proto)} style={{background:`${T.accent}12`,color:T.accent,border:`1px solid ${T.accent}35`,borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            &#128202; Analyser les r&#233;sultats
          </button>
        </div>
      </div>

      {/* Body — flex row */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* Scrollable protocol content */}
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{maxWidth:panelOpen?740:860,margin:"0 auto",padding:"28px 24px",display:"flex",flexDirection:"column",gap:24,transition:"max-width .2s"}}>

            {/* Missing info banner */}
            {proto.missingInfo?.length > 0 && (
              <div style={{background:`${T.warn}10`,border:`1px solid ${T.warn}40`,borderLeft:`3px solid ${T.warn}`,borderRadius:8,padding:"12px 16px"}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.warn,marginBottom:6}}>&#9888; Elements inferes</div>
                {proto.missingInfo.map((m,i)=><div key={i} style={{fontSize:11,color:T.ink2,lineHeight:1.6}}>&#8226; {m}</div>)}
              </div>
            )}

            {/* Objectif */}
            <div style={{background:T.accent,borderRadius:12,padding:"18px 22px"}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.45)",marginBottom:6}}>Objectif &middot; {proto.platform} &middot; {proto.duration}</div>
              <EditableText value={proto.objective||""} path={{type:"objective"}} style={{color:"#fff"}}/>
            </div>

            {/* Hypotheses */}
            <Section title="&#127919; Hypotheses de recherche">
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(proto.hypotheses||[]).map((h,i)=>(
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",background:T.bg,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`,borderLeft:`3px solid ${T.accent}`,position:"relative"}}>
                    <span style={{fontSize:9,fontWeight:900,color:T.accent,background:`${T.accent}14`,borderRadius:4,padding:"2px 7px",flexShrink:0,marginTop:2}}>H{i+1}</span>
                    <EditableText value={h} path={{type:"hypothesis",idx:i}} style={{flex:1}}/>
                    <button onClick={()=>removeItem("hypothesis",i)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,padding:"1px 4px",borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>&#215;</button>
                  </div>
                ))}
                <AddInline section="hypothesis" label="une hypothese"/>
              </div>
            </Section>

            {/* Recrutement */}
            <Section title="&#128101; Recrutement">
              <div style={{display:"grid",gridTemplateColumns:proto.screeners?.length?"1fr 1fr":"1fr",gap:16}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Criteres inclusion / exclusion</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {(proto.recruitingCriteria||[]).map((c,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",background:T.bg,borderRadius:7,padding:"8px 12px",border:`1px solid ${T.border}`,position:"relative"}}>
                        <div style={{width:20,height:20,borderRadius:4,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><span style={{color:"#fff",fontSize:9,fontWeight:900}}>{i+1}</span></div>
                        <EditableText value={c} path={{type:"recruiting",qIdx:i}} style={{flex:1}}/>
                        <button onClick={()=>removeItem("recruiting",i)} style={{position:"absolute",top:6,right:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,padding:"1px 4px",borderRadius:3}}
                          onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>&#215;</button>
                      </div>
                    ))}
                    <AddInline section="recruiting" label="un critere"/>
                  </div>
                </div>
                {(proto.screeners?.length > 0) && (
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Screeners</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {proto.screeners.map((s,i)=>(
                        <div key={i} style={{background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,overflow:"hidden",position:"relative"}}>
                          <div style={{padding:"10px 28px 8px 14px"}}>
                            <EditableText value={s.question} path={{type:"screenerQ",qIdx:i}}/>
                          </div>
                          <div style={{padding:"4px 14px 8px",borderTop:`1px dashed ${T.border}`}}>
                            {editing?.type==="screenerFmt"&&editing.qIdx===i ? (
                              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:2}}>
                                  {FORMAT_PRESETS.map((p,pi)=>(
                                    <button key={pi} onClick={()=>setEditVal(p)}
                                      style={{fontSize:9,padding:"2px 7px",borderRadius:4,border:`1px solid ${editVal===p?T.accent:T.border}`,background:editVal===p?`${T.accent}14`:"#fff",color:editVal===p?T.accent:T.ink2,cursor:"pointer",fontWeight:editVal===p?700:400}}>
                                      {p}
                                    </button>
                                  ))}
                                </div>
                                <div style={{display:"flex",gap:5}}>
                                  <input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
                                    onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}}
                                    placeholder="Format personnalise..."
                                    style={{flex:1,border:`1px solid ${T.accent}`,borderRadius:5,padding:"4px 8px",fontSize:10,fontFamily:T.ff,outline:"none"}}/>
                                  <button onClick={saveEdit} style={{background:T.accent,color:"#fff",border:"none",borderRadius:4,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>OK</button>
                                  <button onClick={()=>setEditing(null)} style={{background:T.bg3,color:T.muted,border:"none",borderRadius:4,padding:"4px 7px",fontSize:10,cursor:"pointer"}}>&#215;</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}} onClick={()=>startEdit({type:"screenerFmt",qIdx:i}, s.responseFormat||"")}>
                                <span style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"2px 8px"}}
                                  onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}22`}
                                  onMouseLeave={e=>e.currentTarget.style.background=`${T.accent}0D`}>
                                  &#8627; {s.responseFormat||<em style={{opacity:.5,fontWeight:400}}>Ajouter modalite</em>}
                                </span>
                                <span style={{fontSize:9,color:T.accent2,opacity:.45}}>&#9998;</span>
                              </div>
                            )}
                          </div>
                          <div style={{padding:"0 14px 10px",display:"flex",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:9,fontWeight:700,color:T.ok,background:`${T.ok}10`,borderRadius:4,padding:"2px 7px"}}>&#10003; {s.qualifying||"—"}</span>
                            <span style={{fontSize:9,fontWeight:700,color:T.danger,background:`${T.danger}10`,borderRadius:4,padding:"2px 7px"}}>&#215; {s.disqualifying||"—"}</span>
                          </div>
                          <button onClick={()=>removeItem("screener",i)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",cursor:"pointer",fontSize:13,color:T.muted,padding:"1px 4px",borderRadius:3}}
                            onMouseEnter={e=>e.currentTarget.style.color=T.danger} onMouseLeave={e=>e.currentTarget.style.color=T.muted}>&#215;</button>
                        </div>
                      ))}
                      <AddInline section="screener" label="un screener"/>
                    </div>
                  </div>
                )}
              </div>
              {!proto.screeners?.length && <div style={{marginTop:8}}><AddInline section="screener" label="un screener"/></div>}
            </Section>

            {/* Intro + Warm-up */}
            <Section title="&#127897; Introduction & Warm-up">
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Script d&apos;introduction</div>
                  <div style={{background:T.bg,borderRadius:8,padding:12,border:`1px solid ${T.border}`}}>
                    <EditableText value={proto.intro||""} path={{type:"intro"}} multiline/>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:6}}>Questions warm-up</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {(proto.warmUpQuestions||[]).map((q,i)=>(
                      <QItem key={i} q={q} editPath={{type:"warmUp",qIdx:i}} section="warmUp" idx={i}/>
                    ))}
                    <AddInline section="warmUp" label="une question warm-up"/>
                  </div>
                </div>
              </div>
            </Section>

            {/* Taches */}
            <Section title="&#129514; Taches & Scenarios">
              {(proto.tasks||[]).map((task,ti)=>(
                <div key={ti} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",marginBottom:16}}>
                  <div style={{background:T.ink,padding:"12px 18px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:26,height:26,borderRadius:6,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:"#fff",fontSize:11,fontWeight:900}}>{task.id}</span></div>
                    <div style={{flex:1}}>
                      {editing?.type==="taskTitle"&&editing.taskIdx===ti
                        ? <div style={{display:"flex",gap:6}}><input value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEdit();}} style={{flex:1,background:"rgba(255,255,255,0.1)",border:`1px solid ${T.accent}`,borderRadius:5,padding:"4px 8px",color:"#fff",fontSize:13,fontWeight:700,outline:"none"}}/><button onClick={saveEdit} style={{background:T.accent,color:"#fff",border:"none",borderRadius:5,padding:"4px 10px",fontSize:10,cursor:"pointer"}}>&#10003;</button></div>
                        : <div onClick={()=>startEdit({type:"taskTitle",taskIdx:ti},task.title)} style={{cursor:"text",fontSize:13,fontWeight:700,color:"#fff"}}>{task.title} <span style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>&#9998;</span></div>
                      }
                    </div>
                    {task.metrics?.length > 0 && <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{task.metrics.map((m,mi)=><span key={mi} style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.5)",background:"rgba(255,255,255,0.08)",borderRadius:3,padding:"2px 6px"}}>{m}</span>)}</div>}
                  </div>
                  <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
                    {task.scenario && (
                      <div>
                        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.accent2,marginBottom:4}}>&#127757; Scenario</div>
                        <div style={{background:`${T.accent}06`,borderRadius:7,padding:"8px 12px",border:`1px solid ${T.accent}20`}}>
                          <EditableText value={task.scenario} path={{type:"taskScenario",taskIdx:ti}} multiline/>
                        </div>
                      </div>
                    )}
                    <div>
                      <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:4}}>&#128203; Instruction</div>
                      <div style={{background:T.bg2,borderRadius:7,padding:"4px 6px",border:`1px solid ${T.border}`}}>
                        <EditableText value={task.instruction||""} path={{type:"taskInstruction",taskIdx:ti}} multiline/>
                      </div>
                    </div>
                    {task.thinkAloudPrompt && (
                      <div style={{background:`${T.warn}08`,borderRadius:6,padding:"8px 12px",border:`1px solid ${T.warn}25`,fontSize:10,color:T.ink2}}>
                        <span style={{fontWeight:700,color:T.warn}}>&#128172; Think-aloud : </span>{task.thinkAloudPrompt}
                      </div>
                    )}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div>
                        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.ok,marginBottom:4}}>&#10003; Critere de succes</div>
                        <div style={{background:`${T.ok}06`,borderRadius:7,padding:"4px 6px",border:`1px solid ${T.ok}20`}}>
                          <EditableText value={task.successCriteria||""} path={{type:"taskSuccess",taskIdx:ti}}/>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:4}}>&#128202; Questions post-tache</div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {(task.postTaskQuestions||[]).map((q,qi)=>(
                            <QItem key={qi} q={q} editPath={{type:"postTask",taskIdx:ti,qIdx:qi}} section="postTask" idx={qi} taskIdx={ti}/>
                          ))}
                          <AddInline section="postTask" label="une question post-tache" taskIdx={ti}/>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.muted,marginBottom:4}}>&#128172; Questions de relance</div>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {(task.followUpQuestions||[]).map((q,qi)=>(
                          <QItem key={qi} q={q} editPath={{type:"followUp",taskIdx:ti,qIdx:qi}} section="followUp" idx={qi} taskIdx={ti}/>
                        ))}
                        <AddInline section="followUp" label="une relance" taskIdx={ti}/>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <AddInline section="task" label="une tache"/>
            </Section>

            {/* Cloture */}
            <Section title="&#127987; Questions de cloture">
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(proto.closingQuestions||[]).map((q,i)=>(
                  <QItem key={i} q={q} editPath={{type:"closing",qIdx:i}} section="closing" idx={i}/>
                ))}
                <AddInline section="closing" label="une question de cloture"/>
              </div>
            </Section>

            {/* KPIs */}
            {proto.kpis && (
              <Section title="&#128207; KPIs & Mesures">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div style={{background:T.bg,borderRadius:8,padding:14,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.accent,marginBottom:10}}>Quantitatifs</div>
                    {(proto.kpis.quantitatifs||[]).map((k,i)=><div key={i} style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:T.ink}}>{k.label}</div>{k.cible&&<div style={{fontSize:9,fontWeight:700,color:T.accent,background:`${T.accent}0D`,borderRadius:3,padding:"1px 6px",display:"inline-block",marginTop:3}}>Cible : {k.cible}</div>}</div>)}
                  </div>
                  <div style={{background:T.bg,borderRadius:8,padding:14,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.ink,marginBottom:10}}>Qualitatifs</div>
                    {(proto.kpis.qualitatifs||[]).map((k,i)=><div key={i} style={{fontSize:11,color:T.ink2,marginBottom:6,lineHeight:1.5}}>&#8226; {k}</div>)}
                  </div>
                  <div style={{background:T.bg,borderRadius:8,padding:14,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.ok,marginBottom:10}}>KPI Business</div>
                    {(proto.kpis.kpiBusiness||[]).map((k,i)=><div key={i} style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:T.ink}}>{k.label}</div>{k.lien&&<div style={{fontSize:9,color:T.muted,lineHeight:1.5,marginTop:2}}>{k.lien}</div>}</div>)}
                  </div>
                </div>
              </Section>
            )}

            {/* Risques + Plan d analyse */}
            {proto.methodology && (
              <Section title="&#9888;&#65039; Risques & Plan d&apos;analyse">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div style={{background:`${T.danger}06`,borderRadius:8,padding:14,border:`1px solid ${T.danger}20`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.danger,marginBottom:8}}>Risques methodologiques</div>
                    <EditableText value={proto.methodology.risks||""} path={{type:"risks"}} multiline/>
                  </div>
                  <div style={{background:`${T.accent}06`,borderRadius:8,padding:14,border:`1px solid ${T.accent}20`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.accent,marginBottom:8}}>&#129504; Plan d&apos;analyse</div>
                    <EditableText value={proto.methodology.analysisPlan||""} path={{type:"analysisPlan"}} multiline/>
                  </div>
                </div>
              </Section>
            )}

          </div>
        </div>

        {/* ── AI Revision Panel ── */}
        {panelOpen && (
          <div style={{width:340,background:T.bg,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:3}}>&#10022; Revision IA</div>
              <div style={{fontSize:10,color:T.muted,lineHeight:1.5}}>Decrivez les modifications. Claude met a jour l&apos;ensemble du protocole instantanement.</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
              {chatMessages.length===0 && (
                <div style={{padding:"12px 14px",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.ink,marginBottom:8}}>Exemples :</div>
                  {EXAMPLES.map((ex,i)=>(
                    <div key={i} onClick={()=>setChatInput(ex)}
                      style={{fontSize:10,color:T.accent,cursor:"pointer",padding:"4px 0",borderBottom:i<EXAMPLES.length-1?`1px dashed ${T.border}`:"none",lineHeight:1.6}}>
                      &#8594; {ex}
                    </div>
                  ))}
                </div>
              )}
              {chatMessages.map((m,i)=>(
                <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                  {m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:6,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff"}}>&#10022;</div>}
                  <div style={{maxWidth:"85%",padding:"8px 12px",borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",background:m.role==="user"?T.accent:T.bg2,color:m.role==="user"?"#fff":T.ink2,fontSize:11,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${T.border}`:"none",whiteSpace:"pre-wrap"}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{display:"flex",gap:8}}>
                  <div style={{width:24,height:24,borderRadius:6,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff"}}>&#10022;</div>
                  <div style={{padding:"8px 12px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"10px 10px 10px 3px",display:"flex",gap:4,alignItems:"center"}}>
                    {[0,1,2].map(j=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:T.accent,opacity:.4,animation:`bounce 1s ${j*.2}s ease-in-out infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}/>
            </div>

            <div style={{padding:"12px 18px",borderTop:`1px solid ${T.border}`}}>
              <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendRevision();}}}
                placeholder="Ex : Ajoute une tache sur le panier, rends les scenarios plus realistes..."
                rows={3} disabled={chatLoading}
                style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:T.ff,resize:"none",outline:"none",background:chatLoading?T.bg2:T.bg,color:T.ink,boxSizing:"border-box",marginBottom:8}}/>
              <button onClick={sendRevision} disabled={chatLoading||!chatInput.trim()}
                style={{width:"100%",background:chatInput.trim()&&!chatLoading?T.accent:T.bg3,color:chatInput.trim()&&!chatLoading?"#fff":T.muted,border:"none",borderRadius:7,padding:"9px",fontSize:12,fontWeight:700,cursor:chatInput.trim()&&!chatLoading?"pointer":"default",transition:"all .15s"}}>
                &#10022; Appliquer les modifications
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({title,subtitle,children}) => (
  <div>
    <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:800,color:T.ink}}>{title}</div>
      {subtitle&&<div style={{fontSize:10,color:T.muted,fontStyle:"italic"}}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

/* ━━━ PROTOCOL CHAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const ProtocolChat = ({onProtocolReady, onBack}) => {
  const [messages, setMessages] = useState([{role:"assistant", content:TEMPLATE_MESSAGE, isWelcome:true}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);
  const [templateText, setTemplateText] = useState(TEMPLATE_TEXT);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const send = async (overrideContent) => {
    const content = overrideContent || input.trim();
    if(!content || loading) return;
    const userMsg = {role:"user", content};
    const history = messages.filter(m => !m.isWelcome);
    const newMessages = [...history, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTemplateMode(false);
    setLoading(true);
    try {
      const reply = await callClaude(newMessages, PROTOCOL_SYSTEM, 16000);

      const tryParseProtocol = (text) => {
        // 1. Bloc ```json ... ```
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          try { const p = JSON.parse(fenceMatch[1].trim()); if (p.ready && p.protocol) return p.protocol; } catch(_) {}
        }
        // 2. Premier { ... dernier }
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          const slice = text.slice(start, end + 1);
          try { const p = JSON.parse(slice); if (p.ready && p.protocol) return p.protocol; } catch(_) {}
          // 3. JSON tronqué — on tente de le réparer en fermant les structures ouvertes
          try {
            const repaired = repairJson(slice);
            const p = JSON.parse(repaired);
            if (p.ready && p.protocol) return p.protocol;
          } catch(_) {}
        }
        return null;
      };

      // Repair truncated JSON by counting and closing open brackets/braces
      const repairJson = (s) => {
        const stack = [];
        let inString = false, escaped = false;
        for (const ch of s) {
          if (escaped) { escaped = false; continue; }
          if (ch === "\\") { escaped = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
          else if (ch === "}" || ch === "]") stack.pop();
        }
        // Close any unclosed string first
        let result = s;
        if (inString) result += '"';
        // Close remaining open structures in reverse order
        return result + stack.reverse().join("");
      };

      const protocol = tryParseProtocol(reply);
      if (protocol) { onProtocolReady(protocol); return; }

      // Not a protocol response — show as chat message
      setMessages(prev => [...prev, {role:"assistant", content:reply}]);
    } catch(e) {
      setMessages(prev => [...prev, {role:"assistant", content:`Erreur : ${e.message}`}]);
    }
    setLoading(false);
  };

  const useTemplate = () => {
    setTemplateMode(true);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const sendTemplate = () => send(templateText);

  return (
    <div style={{minHeight:"100vh",background:T.bg2,display:"flex",flexDirection:"column",fontFamily:T.ff}}>
      {/* Header */}
      <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
        <button onClick={onBack} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>← Accueil</button>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:T.ink}}>Protocole Builder</div>
          <div style={{fontSize:10,color:T.muted}}>Guidé par Claude · Test non modéré UserTesting</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,background:`${T.accent}0D`,border:`1px solid ${T.accent}28`,borderRadius:20,padding:"4px 12px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:T.accent}}/>
          <span style={{fontSize:10,color:T.accent,fontWeight:600}}>UX Researcher Senior</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"24px 0"}}>
        <div style={{maxWidth:680,margin:"0 auto",padding:"0 24px",display:"flex",flexDirection:"column",gap:16}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:12,flexDirection:m.role==="user"?"row-reverse":"row",alignItems:"flex-start"}}>
              {m.role==="assistant"&&(
                <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>✦</div>
              )}
              <div style={{maxWidth:"85%",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{
                  padding:"14px 18px",borderRadius:m.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",
                  background:m.role==="user"?T.accent:T.bg,
                  border:m.role==="user"?"none":`1px solid ${T.border}`,
                  color:m.role==="user"?"#fff":T.ink2,
                  fontSize:12,lineHeight:1.75,fontFamily:T.ff,whiteSpace:"pre-wrap",
                }}>
                  {m.content.split("**").map((chunk,ci) => ci%2===1 ? <strong key={ci}>{chunk}</strong> : chunk)}
                </div>
                {/* CTA buttons on welcome message */}
                {m.isWelcome && (
                  <div style={{display:"flex",gap:8,paddingLeft:4}}>
                    <button onClick={useTemplate} style={{background:T.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      📋 Utiliser le template
                    </button>
                    <button onClick={()=>{setTemplateMode(false); setTimeout(()=>document.querySelector("input[placeholder='Votre réponse…']")?.focus(),50);}} style={{background:T.bg,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      💬 Décrire librement
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:32,height:32,borderRadius:8,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>✦</div>
              <div style={{padding:"12px 16px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:"12px 12px 12px 4px",display:"flex",gap:6,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.accent,opacity:.4,animation:`bounce 1s ${i*.2}s ease-in-out infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Input zone */}
      <div style={{background:T.bg,borderTop:`1px solid ${T.border}`,padding:"16px 24px",flexShrink:0}}>
        <div style={{maxWidth:680,margin:"0 auto",display:"flex",flexDirection:"column",gap:10}}>
          {templateMode ? (
            <>
              <div style={{fontSize:11,fontWeight:600,color:T.accent,marginBottom:2}}>📋 Template — complétez les champs puis envoyez</div>
              <textarea
                ref={textareaRef}
                value={templateText}
                onChange={e=>setTemplateText(e.target.value)}
                rows={9}
                style={{width:"100%",border:`2px solid ${T.accent}`,borderRadius:10,padding:"12px 16px",fontSize:12,fontFamily:"'Courier New',monospace",outline:"none",resize:"vertical",lineHeight:1.8,color:T.ink,boxSizing:"border-box"}}
              />
              <div style={{display:"flex",gap:8}}>
                <button onClick={sendTemplate} disabled={loading} style={{background:T.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:700,cursor:"pointer",flex:1}}>
                  ✦ Générer le protocole
                </button>
                <button onClick={()=>setTemplateMode(false)} style={{background:T.bg3,color:T.muted,border:"none",borderRadius:8,padding:"10px 16px",fontSize:12,cursor:"pointer"}}>
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <div style={{display:"flex",gap:10}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                placeholder="Votre réponse…"
                disabled={loading}
                style={{flex:1,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 16px",fontSize:13,fontFamily:T.ff,outline:"none",background:loading?T.bg2:T.bg,color:T.ink}}
              />
              <button onClick={()=>send()} disabled={loading||!input.trim()} style={{background:input.trim()&&!loading?T.accent:T.bg3,color:input.trim()&&!loading?"#fff":T.muted,border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:input.trim()&&!loading?"pointer":"default",transition:"all .15s"}}>
                Envoyer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ━━━ SLIDES SCREEN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SlidesScreen = ({slides, slideIdx, setSlideIdx, supervising, aiContent, setAiContent, openSlides, onBack}) => {
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  const sendRevision = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, {role:"user", content:userMsg}]);
    setChatInput("");
    setChatLoading(true);
    try {
      const prompt = `Tu es expert en presentation corporate. Voici le contenu actuel des slides:\n${JSON.stringify(aiContent||{})}\n\nDonnees brutes du brief:\n${JSON.stringify(briefData)}\n\nInstruction: "${userMsg}"\n\nApplique les modifications et renvoie UNIQUEMENT le JSON complet mis a jour, sans markdown, sans texte avant ou apres.`;
      const reply = await callClaude([{role:"user", content:prompt}], "", 4000);
      const clean = reply.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const updated = JSON.parse(clean.slice(start, end+1));
        setAiContent(updated);
        setChatMessages(prev => [...prev, {role:"assistant", content:"Modifications appliquees sur les slides."}]);
      } else {
        setChatMessages(prev => [...prev, {role:"assistant", content:reply}]);
      }
    } catch(e) {
      setChatMessages(prev => [...prev, {role:"assistant", content:`Erreur : ${e.message}`}]);
    }
    setChatLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg2,display:"flex",flexDirection:"column",fontFamily:T.ff}}>
      <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:12}}>
        <button onClick={onBack} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,flexShrink:0}}>
          {String.fromCharCode(8592)} Retour
        </button>
        <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap",justifyContent:"center",flex:1}}>
          {slides.map((s,i)=>(<button key={i} onClick={()=>setSlideIdx(i)} style={{height:24,padding:"0 9px",borderRadius:5,border:"none",cursor:"pointer",fontSize:8,fontWeight:800,background:i===slideIdx?T.accent:T.bg3,color:i===slideIdx?"#fff":T.muted,transition:"all .15s"}}>{s.label}</button>))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {supervising&&<div style={{display:"flex",alignItems:"center",gap:6,background:`${T.accent}10`,border:`1px solid ${T.accent}30`,borderRadius:20,padding:"4px 12px"}}><span style={{fontSize:12}}>{"\u2736"}</span><span style={{fontSize:10,color:T.accent,fontWeight:600}}>Supervision IA</span></div>}
          {!supervising&&aiContent&&<div style={{display:"flex",alignItems:"center",gap:6,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:20,padding:"4px 12px"}}><span style={{fontSize:10}}>✓</span><span style={{fontSize:10,color:T.ok,fontWeight:600}}>Supervise</span></div>}
          <span style={{fontSize:11,color:T.muted}}>{slideIdx+1} / {slides.length}</span>
          <button onClick={()=>setPanelOpen(p=>!p)}
            style={{background:panelOpen?T.accent:T.bg,color:panelOpen?"#fff":T.ink2,border:`1px solid ${panelOpen?T.accent:T.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
            {"\u2736"} {panelOpen?"Fermer":"Modifier avec IA"}
          </button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 24px",gap:16}}>
          {supervising&&slideIdx===0
            ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,textAlign:"center"}}>
                <div style={{fontSize:32}}>{"\u2736"}</div>
                <div style={{fontFamily:T.ff,fontSize:14,fontWeight:700,color:T.ink}}>Claude supervise la mise en forme</div>
                <div style={{fontFamily:T.ff,fontSize:11,color:T.muted,maxWidth:320}}>Reformulation des titres, hierarchie typographique, synthese du contenu.</div>
              </div>
            : <div style={{width:"100%",maxWidth:panelOpen?780:960,aspectRatio:"16/9",borderRadius:12,overflow:"hidden",boxShadow:"0 4px 6px rgba(0,0,0,.04),0 20px 50px rgba(0,0,0,.10),0 0 0 1px #E2E4F0",transition:"max-width .25s"}}>
                {slides[slideIdx].render()}
              </div>
          }
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",maxWidth:panelOpen?780:960}}>
            <button onClick={()=>setSlideIdx(i=>Math.max(0,i-1))} disabled={slideIdx===0||supervising} style={{padding:"8px 20px",borderRadius:7,border:`1px solid ${T.border}`,background:"none",color:slideIdx===0?T.muted:T.ink,cursor:slideIdx===0?"default":"pointer",fontSize:12,fontWeight:600,opacity:supervising?.5:1}}>
              {String.fromCharCode(8592)} Precedent
            </button>
            <div style={{display:"flex",gap:4}}>{slides.map((_,i)=><div key={i} onClick={()=>!supervising&&setSlideIdx(i)} style={{width:slideIdx===i?20:6,height:6,borderRadius:3,background:slideIdx===i?T.accent:T.border,transition:"width .2s",cursor:"pointer"}}/>)}</div>
            <button onClick={()=>setSlideIdx(i=>Math.min(slides.length-1,i+1))} disabled={slideIdx===slides.length-1||supervising} style={{padding:"8px 22px",borderRadius:7,border:"none",background:slideIdx===slides.length-1?T.bg3:T.accent,color:slideIdx===slides.length-1?T.muted:"#fff",cursor:slideIdx===slides.length-1?"default":"pointer",fontSize:12,fontWeight:700,opacity:supervising?.5:1}}>
              Suivant {String.fromCharCode(8594)}
            </button>
          </div>
        </div>

        {panelOpen && (
          <div style={{width:340,background:T.bg,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:2}}>{"\u2736"} Revision IA</div>
              <div style={{fontSize:10,color:T.muted}}>Decrivez les modifications a apporter aux slides</div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
              {chatMessages.length===0 && (
                <div style={{padding:"12px 14px",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.ink,marginBottom:8}}>Exemples :</div>
                  {["Rends les titres plus percutants","Ajoute des chiffres sur l enjeu","Simplifie la slide participants","Reformule la slide validation"].map((ex,i)=>(
                    <div key={i} onClick={()=>setChatInput(ex)}
                      style={{fontSize:10,color:T.accent,cursor:"pointer",padding:"4px 0",borderBottom:i<3?`1px dashed ${T.border}`:"none",lineHeight:1.6}}>
                      {String.fromCharCode(8594)} {ex}
                    </div>
                  ))}
                </div>
              )}
              {chatMessages.map((m,i)=>(
                <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                  {m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:6,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff"}}>{"\u2736"}</div>}
                  <div style={{maxWidth:"85%",padding:"8px 12px",borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",background:m.role==="user"?T.accent:T.bg2,color:m.role==="user"?"#fff":T.ink2,fontSize:11,lineHeight:1.6,border:m.role==="assistant"?`1px solid ${T.border}`:"none"}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading&&(
                <div style={{display:"flex",gap:8}}>
                  <div style={{width:24,height:24,borderRadius:6,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff"}}>{"\u2736"}</div>
                  <div style={{padding:"8px 12px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"10px 10px 10px 3px",display:"flex",gap:4,alignItems:"center"}}>
                    {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:T.accent,opacity:.4,animation:`bounce 1s ${i*.2}s ease-in-out infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}/>
            </div>

            <div style={{padding:"12px 18px",borderTop:`1px solid ${T.border}`}}>
              <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendRevision();}}}
                placeholder="Ex: Rends le titre de la slide Enjeu plus impactant, ajoute un sous-titre..."
                rows={3} disabled={chatLoading}
                style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:T.ff,resize:"none",outline:"none",background:chatLoading?T.bg2:T.bg,color:T.ink,boxSizing:"border-box",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={sendRevision} disabled={chatLoading||!chatInput.trim()}
                  style={{flex:1,background:chatInput.trim()&&!chatLoading?T.accent:T.bg3,color:chatInput.trim()&&!chatLoading?"#fff":T.muted,border:"none",borderRadius:7,padding:"8px",fontSize:12,fontWeight:700,cursor:chatInput.trim()&&!chatLoading?"pointer":"default"}}>
                  Appliquer
                </button>
                <button onClick={()=>{setAiContent(null);openSlides();}} disabled={supervising}
                  style={{background:T.bg2,color:T.ink2,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 12px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                  Regenerer
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};


/* ━━━ MAIN APP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */



const ANALYSIS_SYSTEM = `Tu es un UX Researcher senior. Tu analyses des resultats de tests utilisateurs avec rigueur methodologique.

TON APPROCHE EN 4 PASSES :

PASSE 1 — CADRAGE
Lis attentivement le protocole. Identifie : le dispositif exact (entre-sujets, intra-sujets, test non modere...), les hypotheses a tester, les KPIs et leurs seuils, le profil participants, les outils de mesure utilises.

PASSE 2 — ANALYSE QUANTITATIVE
Pour chaque metrique disponible dans les donnees :
- Calcule ou reporte les statistiques descriptives (moyennes, ecarts-types, pourcentages)
- Evalue la significativite statistique si des tests sont presents (p-values, Mann-Whitney, t-test...)
- Compare les groupes si test A/B ou between-subjects
- Signale explicitement quand la puissance statistique est insuffisante (petit echantillon)
- Ne tire JAMAIS de conclusion causale d un resultat non significatif

PASSE 3 — ANALYSE QUALITATIVE
Pour chaque verbatim / reponse ouverte disponible :
- Identifie les themes recurrents (positifs et negatifs)
- Distingue les themes communs a tous les groupes vs specifiques a un groupe
- Cite les verbatims les plus representatifs (dans la langue originale si possible)
- Quantifie la frequence quand possible ("5/8 participants mentionnent...")
- Note les contradictions ou paradoxes entre ce que les gens disent et font

PASSE 4 — SYNTHESE ET RECOMMANDATIONS
- Croise quantitatif et qualitatif pour former des conclusions robustes
- Valide ou invalide chaque hypothese avec les preuves disponibles
- Formule des recommandations operationnelles, pas des generalites
- Classe les recommandations par priorite (impact x faisabilite)
- Conclude avec une position claire sur la decision a prendre

EXIGENCES DE RIGUEUR :
- Distingue toujours ce qui est statistiquement significatif, une tendance, ou anecdotique
- Mentionne les limites methodologiques (taille echantillon, biais potentiels, design du test)
- Ne sur-interprete pas les tendances non significatives — indique l incertitude
- Si les donnees sont insuffisantes pour conclure sur un point, dis-le explicitement

FORMAT DE SORTIE — JSON STRICT :
Reponds UNIQUEMENT avec ce JSON brut. Zero texte avant ou apres. Commence par { et finis par }.

{
  "contextSummary": "Synthese du dispositif en 2-3 phrases : type de test, groupes, n par groupe, methode de recueil",
  "methodologicalWarnings": ["avertissement 1 sur la validite des donnees", "avertissement 2..."],

  "quantitativeAnalysis": {
    "overview": "Synthese des donnees quantitatives disponibles",
    "metrics": [
      {
        "name": "Nom de la metrique",
        "groupA": {"label": "Nom groupe A", "value": "ex: 4.20 (±1.77)", "n": 20},
        "groupB": {"label": "Nom groupe B", "value": "ex: 4.52 (±1.85)", "n": 25},
        "delta": "ex: +0.32 en faveur de B",
        "significance": "p = 0.563, non significatif | p = 0.02, significatif | non teste",
        "interpretation": "Ce que ca signifie concretement"
      }
    ],
    "behavioralData": [
      {
        "behavior": "Description du comportement mesure",
        "groupA": {"label": "nom", "value": "ex: 30%", "n": 6},
        "groupB": {"label": "nom", "value": "ex: 44%", "n": 11},
        "delta": "ex: +14 points de pourcentage",
        "interpretation": "Sens et limite de cet ecart"
      }
    ]
  },

  "qualitativeAnalysis": {
    "commonThemes": [
      {
        "theme": "Titre du theme commun",
        "description": "Description detaillee",
        "verbatims": ["verbatim 1", "verbatim 2"],
        "frequency": "ex: mentionne par 8/20 participants du groupe A et 10/25 du groupe B"
      }
    ],
    "groupSpecificThemes": [
      {
        "group": "Nom du groupe concerne",
        "theme": "Titre du theme specifique",
        "description": "Description detaillee",
        "verbatims": ["verbatim 1"],
        "frequency": "ex: 6/20 participants"
      }
    ]
  },

  "hypothesesAssessment": [
    {
      "hypothesis": "Enonce exact de l hypothese",
      "verdict": "VALIDEE | INVALIDEE | TENDANCE NON SIGNIFICATIVE | NON TESTABLE",
      "quantitativeEvidence": "Donnees chiffrees qui appuient ou infirment",
      "qualitativeEvidence": "Verbatims ou observations qui appuient ou nuancent",
      "confidence": "Elevee | Moyenne | Faible",
      "nuance": "Ce que le verdict ne dit pas — ce qui reste incertain"
    }
  ],

  "kpiAssessment": [
    {
      "kpi": "Nom du KPI",
      "target": "Seuil cible si defini",
      "observed": "Valeur observee avec contexte (groupe, n)",
      "status": "ATTEINT | NON ATTEINT | TENDANCE | NON MESURE",
      "significance": "Niveau de confiance statistique",
      "interpretation": "Lecture operationnelle"
    }
  ],

  "keyFindings": [
    {
      "finding": "Enseignement cle formule comme une phrase d action ou de fait",
      "support": "Ce qui l etaie (quanti + quali)",
      "confidence": "Elevee | Moyenne | Faible",
      "actionable": true
    }
  ],

  "recommendations": [
    {
      "priority": 1,
      "action": "Action precise et concrete",
      "rationale": "Pourquoi cette action — ancrage dans les donnees",
      "horizon": "Immediat | Court terme | Moyen terme",
      "expectedImpact": "Ce qu on anticipe comme resultat mesurable"
    }
  ],

  "decision": "GO | NO-GO | ITERER | TESTER EN PRODUCTION",
  "decisionRationale": "Justification complete en 3-5 phrases articulant quanti + quali + limites",
  "nextSteps": "Ce qu il faudrait faire pour lever les incertitudes restantes"
}`;

const AnalysisEngine = ({initialProtocol, onBack}) => {
  // Load SheetJS on mount
  useEffect(() => {
    if (window.XLSX) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const [step, setStep]           = useState(initialProtocol ? "results" : "protocol");
  const [protocol, setProtocol]   = useState(initialProtocol || null);
  const [protocolJson, setProtocolJson] = useState("");
  const [protocolError, setProtocolError] = useState("");
  // CSV multi-file state
  const [csvFiles, setCsvFiles]   = useState([]); // [{name, label, rows, headers, preview}]
  const [extraNotes, setExtraNotes] = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef = useRef(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis]   = useState(null);
  const [activeSection, setActiveSection] = useState("decision");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const chatRef = useRef(null);

  useEffect(() => { chatRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  /* ── XLSX parsing via SheetJS ── */
  const parseXLSX = (arrayBuffer, fileName) => {
    const XLSX = window.XLSX;
    const wb = XLSX.read(arrayBuffer, {type:"array"});
    const results = [];
    wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:""});
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      const label = wb.SheetNames.length > 1
        ? fileName.replace(/\.xlsx?$/i,"").replace(/[_-]/g," ") + " — " + sheetName
        : fileName.replace(/\.xlsx?$/i,"").replace(/[_-]/g," ");
      const key = fileName + "||" + sheetName;
      results.push({name:key, label, headers, rows, preview:rows.slice(0,3), totalRows:rows.length, sheetName});
    });
    return results;
  };

  const addFiles = (files) => {
    if (!window.XLSX) {
      alert("Librairie SheetJS non disponible. Actualisez la page.");
      return;
    }
    Array.from(files).forEach(file => {
      if (!file.name.match(/\.xlsx?$/i)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseXLSX(e.target.result, file.name);
        setCsvFiles(prev => {
          const existing = new Set(prev.map(f => f.name));
          const newEntries = parsed.filter(p => !existing.has(p.name));
          return [...prev, ...newEntries];
        });
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const removeFile = (name) => setCsvFiles(prev => prev.filter(f => f.name !== name));
  const updateLabel = (name, label) => setCsvFiles(prev => prev.map(f => f.name===name ? {...f, label} : f));

  /* ── Build structured context for analysis ── */
  const buildResultsContext = () => {
    const parts = [];
    csvFiles.forEach(f => {
      parts.push("=== GROUPE : " + f.label + " (" + f.totalRows + " participants) ===");
      parts.push("Colonnes disponibles : " + f.headers.join(" | "));
      const verbatimCols = f.headers.filter(h => /comment|verbatim|feedback|note|remark|reponse|answer|thought|said/i.test(h));
      const scoreCols    = f.headers.filter(h => /score|rating|rate|satisfaction|ease|difficulty|sus|nps|time|duration|success|completion/i.test(h));
      if (scoreCols.length) {
        parts.push("-- Donnees quantitatives --");
        scoreCols.forEach(col => {
          const vals = f.rows.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
          if (vals.length) {
            const avg = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
            const min = Math.min(...vals).toFixed(1), max = Math.max(...vals).toFixed(1);
            parts.push("  " + col + " : moy=" + avg + ", min=" + min + ", max=" + max + ", n=" + vals.length);
          }
        });
      }
      if (verbatimCols.length) {
        parts.push("-- Verbatims --");
        verbatimCols.forEach(col => {
          const vals = f.rows.map(r => r[col]).filter(v => v && v.length > 5);
          vals.slice(0,20).forEach((v,i) => parts.push("  P" + (i+1) + ': "' + v + '"'));
        });
      }
      const otherCols = f.headers.filter(h => !verbatimCols.includes(h) && !scoreCols.includes(h));
      if (otherCols.length > 0 && f.rows.length <= 30) {
        parts.push("-- Donnees participant par participant --");
        f.rows.forEach((row, i) => {
          const line = otherCols.map(h => h + ": " + (row[h]||"")).join(", ");
          parts.push("  P" + (i+1) + ": " + line);
        });
      }
      parts.push("");
    });
    if (extraNotes.trim()) {
      parts.push("=== NOTES COMPLEMENTAIRES ===");
      parts.push(extraNotes);
    }
    return parts.join("\n");
  };

  /* ── Parse protocol from JSON paste ── */
  const loadProtocol = () => {
    try {
      const parsed = JSON.parse(protocolJson.trim());
      const p = parsed.protocol || parsed;
      if (!p.tasks && !p.hypotheses && !p.objective) throw new Error("Structure non reconnue");
      setProtocol(p);
      setProtocolError("");
      setStep("results");
    } catch(e) {
      setProtocolError("JSON invalide ou structure non reconnue. Collez le JSON complet du protocole.");
    }
  };

  /* ── Run analysis ── */
  const runAnalysis = async () => {
    if (csvFiles.length === 0 && !extraNotes.trim()) return;
    setAnalysing(true);
    setAnalysis(null);
    try {
      const resultsCtx = buildResultsContext();
      const prompt = `PROTOCOLE DE REFERENCE :\n${JSON.stringify(protocol, null, 2)}\n\nRESULTATS STRUCTURÉS (${csvFiles.length} groupe(s) UserTesting) :\n${resultsCtx}\n\nProduis l analyse complete selon le protocole.`;
      const reply = await callClaude([{role:"user", content:prompt}], ANALYSIS_SYSTEM, 10000);
      const clean = reply.replace(/\`\`\`json|\`\`\`/g,"").trim();
      const s = clean.indexOf("{"), e2 = clean.lastIndexOf("}");
      if (s !== -1 && e2 !== -1) {
        setAnalysis(JSON.parse(clean.slice(s, e2+1)));
        setStep("analysis");
      }
    } catch(err) {
      alert(`Erreur d analyse : ${err.message}`);
    }
    setAnalysing(false);
  };

  /* ── Follow-up chat ── */
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, {role:"user", content:msg}]);
    setChatInput("");
    setChatLoading(true);
    try {
      const sys = `Tu es un UX Researcher senior. Tu reponds a des questions sur une analyse de test utilisateur. Sois precis, actionnable, ancre dans les donnees.`;
      const history = chatMessages.map(m => ({role:m.role, content:m.content}));
      const ctx = `Protocole: ${JSON.stringify(protocol)}\nResultats: ${buildResultsContext()}\nAnalyse: ${JSON.stringify(analysis)}`;
      const fullMsg = history.length === 0 ? `Contexte:\n${ctx}\n\nQuestion: ${msg}` : msg;
      const reply = await callClaude([...history, {role:"user", content:fullMsg}], sys, 3000);
      setChatMessages(prev => [...prev, {role:"assistant", content:reply}]);
    } catch(e) {
      setChatMessages(prev => [...prev, {role:"assistant", content:`Erreur : ${e.message}`}]);
    }
    setChatLoading(false);
  };

  /* ── Verdict badge ── */
  const VerdictBadge = ({v}) => {
    const map = {
      "VALIDEE":{"VALIDEE":T.ok}, "INVALIDEE":{"INVALIDEE":T.danger},
      "PARTIELLEMENT VALIDEE":{"PARTIELLEMENT VALIDEE":T.warn},
      "NON TESTABLE":{"NON TESTABLE":T.muted},
      "ATTEINT":{"ATTEINT":T.ok}, "NON ATTEINT":{"NON ATTEINT":T.danger},
      "PARTIEL":{"PARTIEL":T.warn}, "NON MESURE":{"NON MESURE":T.muted},
      "GO":{"GO":T.ok}, "NO-GO":{"NO-GO":T.danger}, "ITERER":{"ITERER":T.warn},
    };
    const color = map[v]?.[v] || T.muted;
    return <span style={{fontSize:9,fontWeight:900,color,background:`${color}15`,borderRadius:4,padding:"2px 9px",letterSpacing:"0.05em"}}>{v}</span>;
  };

  const ImpactBadge = ({v}) => {
    const c = v==="Eleve"?T.danger:v==="Moyen"?T.warn:T.ok;
    return <span style={{fontSize:9,fontWeight:700,color:c,background:`${c}12`,borderRadius:3,padding:"1px 7px"}}>{v}</span>;
  };

  const SectionBtn = ({id, label}) => (
    <button onClick={()=>setActiveSection(id)}
      style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
        background:activeSection===id?T.accent:"transparent",
        color:activeSection===id?"#fff":T.muted,transition:"all .15s"}}>
      {label}
    </button>
  );

  /* ── STEP: protocol selection ── */
  if (step === "protocol") return (
    <div style={{minHeight:"100vh",background:T.bg2,fontFamily:T.ff,display:"flex",flexDirection:"column"}}>
      <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:16}}>
        <button onClick={onBack} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>&#8592; Accueil</button>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:T.ink}}>Analysis Engine</div>
          <div style={{fontSize:10,color:T.muted}}>Etape 1 / 3 — Chargement du protocole</div>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
        <div style={{width:"100%",maxWidth:600}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:40,marginBottom:12}}>&#128202;</div>
            <div style={{fontSize:20,fontWeight:900,color:T.ink,marginBottom:6}}>Charger un protocole</div>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>Collez le JSON d un protocole existant, ou revenez sur la page Protocole Builder pour lancer l analyse depuis la vue du protocole.</div>
          </div>
          <div style={{background:T.bg,borderRadius:12,border:`1px solid ${T.border}`,padding:24}}>
            <div style={{fontSize:11,fontWeight:700,color:T.ink,marginBottom:8}}>JSON du protocole</div>
            <textarea value={protocolJson} onChange={e=>setProtocolJson(e.target.value)}
              placeholder={'{\n  "title": "...",\n  "tasks": [...],\n  "hypotheses": [...]\n}'}
              rows={10}
              style={{width:"100%",border:`1px solid ${protocolError?T.danger:T.border}`,borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'Courier New',monospace",outline:"none",resize:"vertical",color:T.ink,boxSizing:"border-box",lineHeight:1.6}}/>
            {protocolError && <div style={{fontSize:10,color:T.danger,marginTop:6}}>{protocolError}</div>}
            <button onClick={loadProtocol} disabled={!protocolJson.trim()}
              style={{marginTop:12,width:"100%",background:protocolJson.trim()?T.accent:T.bg3,color:protocolJson.trim()?"#fff":T.muted,border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:protocolJson.trim()?"pointer":"default"}}>
              &#8594; Charger le protocole
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── STEP: results input ── */
  if (step === "results") return (
    <div style={{minHeight:"100vh",background:T.bg2,fontFamily:T.ff,display:"flex",flexDirection:"column"}}>
      <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:16}}>
        <button onClick={onBack} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>&#8592; Accueil</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:T.ink}}>Analysis Engine</div>
          <div style={{fontSize:10,color:T.muted}}>Etape 2 / 3 — Saisie des resultats</div>
        </div>
        {protocol && (
          <div style={{display:"flex",alignItems:"center",gap:6,background:`${T.ok}0D`,border:`1px solid ${T.ok}30`,borderRadius:20,padding:"4px 12px"}}>
            <span style={{fontSize:10}}>&#10003;</span>
            <span style={{fontSize:10,color:T.ok,fontWeight:700}}>Protocole chargé</span>
          </div>
        )}
      </div>

      <div style={{flex:1,display:"flex",gap:0,overflow:"hidden"}}>
        {/* Protocol recap */}
        <div style={{width:280,background:T.bg,borderRight:`1px solid ${T.border}`,overflowY:"auto",padding:"20px 18px",flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:800,color:T.ink,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.1em"}}>Protocole de reference</div>
          <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:4,lineHeight:1.3}}>{protocol?.title||"—"}</div>
          <div style={{fontSize:10,color:T.muted,marginBottom:16}}>{protocol?.platform} · {protocol?.duration}</div>

          {protocol?.hypotheses?.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:6}}>Hypotheses</div>
              {protocol.hypotheses.map((h,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"flex-start"}}>
                  <span style={{fontSize:8,fontWeight:900,color:T.accent,background:`${T.accent}14`,borderRadius:3,padding:"1px 5px",flexShrink:0,marginTop:1}}>H{i+1}</span>
                  <span style={{fontSize:10,color:T.ink2,lineHeight:1.5}}>{h}</span>
                </div>
              ))}
            </div>
          )}

          {protocol?.tasks?.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:6}}>Taches</div>
              {protocol.tasks.map((t,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginBottom:5,alignItems:"flex-start"}}>
                  <div style={{width:16,height:16,borderRadius:4,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{color:"#fff",fontSize:8,fontWeight:900}}>{t.id}</span>
                  </div>
                  <span style={{fontSize:10,color:T.ink2,lineHeight:1.5}}>{t.title}</span>
                </div>
              ))}
            </div>
          )}

          {protocol?.kpis && (
            <div>
              <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:6}}>KPIs cibles</div>
              {(protocol.kpis.quantitatifs||[]).map((k,i)=>(
                <div key={i} style={{fontSize:10,color:T.ink2,marginBottom:3}}>
                  {k.label}{k.cible?<span style={{color:T.accent,fontWeight:700}}> → {k.cible}</span>:""}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results input — CSV importer */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 32px",display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:T.ink,marginBottom:4}}>Importer les resultats</div>
            <div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>Importez un ou plusieurs exports Excel UserTesting. Chaque fichier peut representer un groupe different (ex : groupe A vs groupe B, desktop vs mobile). Les colonnes sont detectees automatiquement.</div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files);}}
            onClick={()=>fileInputRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver?T.accent:T.border}`,
              borderRadius:12,background:dragOver?`${T.accent}06`:T.bg,
              padding:"28px 24px",textAlign:"center",cursor:"pointer",
              transition:"all .2s",
            }}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" multiple style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
            <div style={{fontSize:28,marginBottom:8}}>&#128196;</div>
            <div style={{fontSize:13,fontWeight:700,color:dragOver?T.accent:T.ink,marginBottom:4}}>
              {dragOver ? "Deposez les fichiers ici" : "Glissez vos fichiers Excel ici ou cliquez pour parcourir"}
            </div>
            <div style={{fontSize:10,color:T.muted}}>Exports UserTesting (.xlsx) · Plusieurs fichiers acceptes · Feuilles multiples supportees</div>
          </div>

          {/* Loaded files */}
          {csvFiles.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:11,fontWeight:700,color:T.ink}}>{csvFiles.length} fichier{csvFiles.length>1?"s":""} charge{csvFiles.length>1?"s":""}</div>
              {csvFiles.map(f => (
                <div key={f.name} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                  {/* File header */}
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${T.border}`}}>
                    <span style={{fontSize:14}}>&#128196;</span>
                    <div style={{flex:1,minWidth:0}}>
                      <input value={f.label} onChange={e=>updateLabel(f.name, e.target.value)}
                        style={{width:"100%",border:"none",outline:"none",fontSize:12,fontWeight:700,color:T.ink,fontFamily:T.ff,background:"transparent"}}
                        placeholder="Nom du groupe (ex : Groupe A — Desktop)"/>
                      <div style={{fontSize:9,color:T.muted,marginTop:1}}>{f.sheetName ? "Feuille : "+f.sheetName+" · " : ""}{f.totalRows} ligne{f.totalRows>1?"s":""} · {f.headers.length} colonnes</div>
                    </div>
                    <button onClick={()=>removeFile(f.name)}
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.muted,padding:"2px 6px",borderRadius:4}}
                      onMouseEnter={e=>e.currentTarget.style.color=T.danger}
                      onMouseLeave={e=>e.currentTarget.style.color=T.muted}>&#215;</button>
                  </div>
                  {/* Columns detected */}
                  <div style={{padding:"10px 14px"}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:6}}>Colonnes detectees</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                      {f.headers.map(h => {
                        const isVerbatim = /comment|verbatim|feedback|note|remark|reponse|answer|thought|said/i.test(h);
                        const isScore    = /score|rating|rate|satisfaction|ease|difficulty|sus|nps|time|duration|success|completion/i.test(h);
                        const color      = isVerbatim ? T.accent : isScore ? T.ok : T.muted;
                        return (
                          <span key={h} style={{fontSize:9,fontWeight:600,color,background:`${color}12`,borderRadius:3,padding:"2px 7px",border:`1px solid ${color}25`}}>
                            {isVerbatim?"💬 ":isScore?"📊 ":""}{h}
                          </span>
                        );
                      })}
                    </div>
                    {/* Preview rows */}
                    {f.preview.length > 0 && (
                      <details style={{cursor:"pointer"}}>
                        <summary style={{fontSize:9,fontWeight:700,color:T.accent,userSelect:"none"}}>Apercu ({Math.min(3,f.totalRows)} lignes)</summary>
                        <div style={{marginTop:8,overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:9,fontFamily:"'Courier New',monospace"}}>
                            <thead>
                              <tr>{f.headers.slice(0,6).map(h=><th key={h} style={{textAlign:"left",padding:"3px 6px",background:T.bg2,borderBottom:`1px solid ${T.border}`,color:T.muted,whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {f.preview.map((row,ri)=>(
                                <tr key={ri} style={{borderBottom:`1px solid ${T.border}`}}>
                                  {f.headers.slice(0,6).map(h=><td key={h} style={{padding:"3px 6px",color:T.ink2,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row[h]||""}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {f.headers.length > 6 && <div style={{fontSize:9,color:T.muted,marginTop:4}}>+{f.headers.length-6} colonnes masquees</div>}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes complementaires */}
          <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:T.ink,marginBottom:4}}>Notes complementaires <span style={{fontSize:10,fontWeight:400,color:T.muted}}>(optionnel)</span></div>
            <div style={{fontSize:10,color:T.muted,marginBottom:8,lineHeight:1.5}}>Observations de session, contexte specifique, problemes techniques rencontres, biais identifies...</div>
            <textarea value={extraNotes} onChange={e=>setExtraNotes(e.target.value)}
              placeholder={"Ex : P3 a eu un probleme de connexion pendant la tache 2, ses donnees sont partielles.\nLe groupe B testait sur mobile, le groupe A sur desktop.\n..."}
              rows={4}
              style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 12px",fontSize:11,fontFamily:T.ff,outline:"none",resize:"vertical",color:T.ink,lineHeight:1.6,boxSizing:"border-box"}}/>
          </div>

          {/* Launch button */}
          <button onClick={runAnalysis} disabled={(csvFiles.length===0 && !extraNotes.trim())||analysing}
            style={{
              background:((csvFiles.length>0||extraNotes.trim())&&!analysing)?T.accent:T.bg3,
              color:((csvFiles.length>0||extraNotes.trim())&&!analysing)?"#fff":T.muted,
              border:"none",borderRadius:10,padding:"14px",fontSize:14,fontWeight:800,
              cursor:((csvFiles.length>0||extraNotes.trim())&&!analysing)?"pointer":"default",
              display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .15s"
            }}>
            {analysing
              ? <><div style={{width:14,height:14,border:`2px solid rgba(255,255,255,.4)`,borderTop:`2px solid #fff`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/> Analyse en cours...</>
              : <><span style={{fontSize:16}}>&#10022;</span> Lancer l analyse ({csvFiles.length} fichier{csvFiles.length!==1?"s":""})</>
            }
          </button>
        </div>
      </div>
    </div>
  );

  /* ── STEP: analysis results ── */
  if (step === "analysis" && analysis) {
    const SECTIONS = [
      {id:"decision",    label:"Synthèse"},
      {id:"quanti",      label:"Quantitatif"},
      {id:"quali",       label:"Qualitatif"},
      {id:"hypotheses",  label:"Hypothèses"},
      {id:"findings",    label:"Enseignements"},
      {id:"reco",        label:"Recommandations"},
      {id:"chat",        label:"💬 Approfondir"},
    ];

    return (
      <div style={{minHeight:"100vh",background:T.bg2,fontFamily:T.ff,display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setStep("results")} style={{color:T.accent,background:"none",border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600}}>&#8592; Resultats</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:T.ink}}>{protocol?.title||"Analyse"}</div>
            <div style={{fontSize:10,color:T.muted}}>Grille : {analysis.readingGrid} · Confiance : {analysis.confidenceLevel}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <VerdictBadge v={analysis.decision}/>
          </div>
        </div>

        {/* Section nav */}
        <div style={{background:T.bg,borderBottom:`1px solid ${T.border}`,padding:"6px 24px",display:"flex",gap:2,flexShrink:0,overflowX:"auto"}}>
          {SECTIONS.map(s=><SectionBtn key={s.id} id={s.id} label={s.label}/>)}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 32px",maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>

          {/* SYNTHESE / DECISION */}
          {activeSection==="decision" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Context */}
              {analysis.contextSummary && (
                <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,padding:20}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:T.muted,marginBottom:8}}>Dispositif</div>
                  <div style={{fontSize:12,color:T.ink2,lineHeight:1.7}}>{analysis.contextSummary}</div>
                </div>
              )}
              {/* Warnings */}
              {analysis.methodologicalWarnings?.length > 0 && (
                <div style={{background:`${T.warn}08`,borderRadius:10,border:`1px solid ${T.warn}30`,borderLeft:`3px solid ${T.warn}`,padding:16}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:T.warn,marginBottom:8}}>⚠ Points de vigilance méthodologiques</div>
                  {analysis.methodologicalWarnings.map((w,i)=>(
                    <div key={i} style={{fontSize:11,color:T.ink2,lineHeight:1.6,marginBottom:4}}>• {w}</div>
                  ))}
                </div>
              )}
              {/* Decision */}
              <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,padding:20}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                  <div style={{fontSize:28,fontWeight:900,color:analysis.decision==="GO"?T.ok:analysis.decision==="NO-GO"?T.danger:T.warn,letterSpacing:"-0.02em"}}>{analysis.decision}</div>
                  <VerdictBadge v={analysis.decision}/>
                </div>
                <div style={{fontSize:12,color:T.ink2,lineHeight:1.75,marginBottom:14,whiteSpace:"pre-line"}}>{analysis.decisionRationale}</div>
                {analysis.nextSteps && (
                  <div style={{background:`${T.accent}08`,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${T.accent}`}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.accent,marginBottom:4}}>Prochaines étapes pour lever les incertitudes</div>
                    <div style={{fontSize:11,color:T.ink2,lineHeight:1.6}}>{analysis.nextSteps}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QUANTITATIF */}
          {activeSection==="quanti" && (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink}}>{analysis.quantitativeAnalysis?.overview||"Analyse quantitative"}</div>

              {/* Metrics table */}
              {analysis.quantitativeAnalysis?.metrics?.length > 0 && (
                <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.ink,textTransform:"uppercase",letterSpacing:"0.1em"}}>Métriques comparatives</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:T.bg2}}>
                          <th style={{textAlign:"left",padding:"8px 16px",color:T.muted,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>Métrique</th>
                          {analysis.quantitativeAnalysis.metrics[0]?.groupA && <th style={{textAlign:"center",padding:"8px 12px",color:T.muted,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>{analysis.quantitativeAnalysis.metrics[0].groupA.label}</th>}
                          {analysis.quantitativeAnalysis.metrics[0]?.groupB && <th style={{textAlign:"center",padding:"8px 12px",color:T.muted,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>{analysis.quantitativeAnalysis.metrics[0].groupB.label}</th>}
                          <th style={{textAlign:"center",padding:"8px 12px",color:T.muted,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>Δ</th>
                          <th style={{textAlign:"left",padding:"8px 12px",color:T.muted,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",borderBottom:`1px solid ${T.border}`}}>Significativité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.quantitativeAnalysis.metrics.map((m,i)=>{
                          const sigColor = m.significance?.includes("non significatif")||m.significance?.includes("n.s") ? T.muted : m.significance?.includes("p =") ? T.ok : T.muted;
                          return (
                            <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.bg:T.bg2}}>
                              <td style={{padding:"10px 16px"}}>
                                <div style={{fontSize:11,fontWeight:600,color:T.ink}}>{m.name}</div>
                                {m.interpretation && <div style={{fontSize:10,color:T.muted,marginTop:2,lineHeight:1.4}}>{m.interpretation}</div>}
                              </td>
                              {m.groupA && <td style={{padding:"10px 12px",textAlign:"center",fontSize:11,fontWeight:700,color:T.ink}}>{m.groupA.value}{m.groupA.n && <span style={{fontSize:9,color:T.muted,fontWeight:400}}> (n={m.groupA.n})</span>}</td>}
                              {m.groupB && <td style={{padding:"10px 12px",textAlign:"center",fontSize:11,fontWeight:700,color:T.ink}}>{m.groupB.value}{m.groupB.n && <span style={{fontSize:9,color:T.muted,fontWeight:400}}> (n={m.groupB.n})</span>}</td>}
                              <td style={{padding:"10px 12px",textAlign:"center",fontSize:11,fontWeight:800,color:m.delta?.startsWith("+")?T.ok:m.delta?.startsWith("-")?T.danger:T.muted}}>{m.delta||"—"}</td>
                              <td style={{padding:"10px 12px",fontSize:10,color:sigColor,fontWeight:600}}>{m.significance||"—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Behavioral data */}
              {analysis.quantitativeAnalysis?.behavioralData?.length > 0 && (
                <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                  <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.ink,textTransform:"uppercase",letterSpacing:"0.1em"}}>Données comportementales déclarées</div>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {analysis.quantitativeAnalysis.behavioralData.map((b,i)=>(
                      <div key={i} style={{padding:"12px 18px",borderBottom:i<analysis.quantitativeAnalysis.behavioralData.length-1?`1px solid ${T.border}`:"none",background:i%2===0?T.bg:T.bg2}}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:6}}>
                          <div style={{fontSize:11,fontWeight:600,color:T.ink,flex:1}}>{b.behavior}</div>
                          <div style={{display:"flex",gap:12,flexShrink:0}}>
                            {b.groupA && <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:T.ink}}>{b.groupA.value}</div><div style={{fontSize:8,color:T.muted}}>{b.groupA.label}</div></div>}
                            {b.groupB && <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:T.ink}}>{b.groupB.value}</div><div style={{fontSize:8,color:T.muted}}>{b.groupB.label}</div></div>}
                            {b.delta && <div style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:b.delta.startsWith("+")?T.ok:T.danger}}>{b.delta}</div><div style={{fontSize:8,color:T.muted}}>écart</div></div>}
                          </div>
                        </div>
                        {b.interpretation && <div style={{fontSize:10,color:T.ink2,lineHeight:1.5,fontStyle:"italic"}}>{b.interpretation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUALITATIF */}
          {activeSection==="quali" && (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:4}}>Enseignements qualitatifs</div>

              {analysis.qualitativeAnalysis?.commonThemes?.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:T.muted,marginBottom:10}}>Thèmes communs à tous les groupes</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {analysis.qualitativeAnalysis.commonThemes.map((t,i)=>(
                      <div key={i} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,padding:"14px 18px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:T.accent,flexShrink:0}}/>
                          <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{t.theme}</div>
                          {t.frequency && <span style={{fontSize:9,color:T.muted,background:T.bg2,borderRadius:3,padding:"1px 7px",border:`1px solid ${T.border}`,marginLeft:"auto"}}>{t.frequency}</span>}
                        </div>
                        <div style={{fontSize:11,color:T.ink2,lineHeight:1.65,marginBottom:t.verbatims?.length?10:0}}>{t.description}</div>
                        {t.verbatims?.length > 0 && (
                          <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:14,borderLeft:`2px solid ${T.border}`}}>
                            {t.verbatims.map((v,vi)=>(
                              <div key={vi} style={{fontSize:10,color:T.ink2,fontStyle:"italic",lineHeight:1.5}}>"{v}"</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.qualitativeAnalysis?.groupSpecificThemes?.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:T.muted,marginBottom:10,marginTop:6}}>Spécificités par groupe</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {analysis.qualitativeAnalysis.groupSpecificThemes.map((t,i)=>(
                      <div key={i} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,borderLeft:`4px solid ${T.accent}`,padding:"14px 18px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <span style={{fontSize:9,fontWeight:800,color:T.accent,background:`${T.accent}12`,borderRadius:3,padding:"2px 8px"}}>{t.group}</span>
                          <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{t.theme}</div>
                          {t.frequency && <span style={{fontSize:9,color:T.muted,background:T.bg2,borderRadius:3,padding:"1px 7px",border:`1px solid ${T.border}`,marginLeft:"auto"}}>{t.frequency}</span>}
                        </div>
                        <div style={{fontSize:11,color:T.ink2,lineHeight:1.65,marginBottom:t.verbatims?.length?10:0}}>{t.description}</div>
                        {t.verbatims?.length > 0 && (
                          <div style={{display:"flex",flexDirection:"column",gap:5,paddingLeft:14,borderLeft:`2px solid ${T.border}`}}>
                            {t.verbatims.map((v,vi)=>(
                              <div key={vi} style={{fontSize:10,color:T.ink2,fontStyle:"italic",lineHeight:1.5}}>"{v}"</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HYPOTHESES */}
          {activeSection==="hypotheses" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:4}}>Validation des hypothèses</div>
              {(analysis.hypothesesAssessment||[]).map((h,i)=>{
                const verdictColor = h.verdict==="VALIDEE"?T.ok:h.verdict==="INVALIDEE"?T.danger:T.warn;
                return (
                  <div key={i} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,borderLeft:`4px solid ${verdictColor}`,overflow:"hidden"}}>
                    <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                        <span style={{fontSize:9,fontWeight:900,color:T.accent,background:`${T.accent}14`,borderRadius:3,padding:"2px 7px",flexShrink:0,marginTop:1}}>H{i+1}</span>
                        <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.5}}>{h.hypothesis}</div>
                      </div>
                      <VerdictBadge v={h.verdict}/>
                    </div>
                    <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:10}}>
                      {h.quantitativeEvidence && (
                        <div>
                          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:4}}>Preuves quantitatives</div>
                          <div style={{fontSize:11,color:T.ink2,lineHeight:1.6}}>{h.quantitativeEvidence}</div>
                        </div>
                      )}
                      {h.qualitativeEvidence && (
                        <div>
                          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.muted,marginBottom:4}}>Preuves qualitatives</div>
                          <div style={{fontSize:11,color:T.ink2,lineHeight:1.6,fontStyle:"italic"}}>{h.qualitativeEvidence}</div>
                        </div>
                      )}
                      {h.nuance && (
                        <div style={{background:`${T.warn}08`,borderRadius:6,padding:"8px 12px",border:`1px solid ${T.warn}25`}}>
                          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:T.warn,marginBottom:3}}>Ce que le verdict ne dit pas</div>
                          <div style={{fontSize:10,color:T.ink2,lineHeight:1.5}}>{h.nuance}</div>
                        </div>
                      )}
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:9,color:T.muted}}>Confiance :</span>
                        <span style={{fontSize:9,fontWeight:700,color:h.confidence==="Elevee"?T.ok:h.confidence==="Faible"?T.danger:T.warn}}>{h.confidence}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ENSEIGNEMENTS */}
          {activeSection==="findings" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:4}}>Enseignements clés</div>
              {(analysis.keyFindings||analysis.topInsights||[]).map((f,i)=>{
                const item = f.finding ? f : {finding:f.title, support:f.description, confidence:f.impact==="Eleve"?"Elevee":f.impact==="Faible"?"Faible":"Moyenne", actionable:true};
                return (
                  <div key={i} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",gap:0,overflow:"hidden"}}>
                    <div style={{width:36,background:item.actionable?T.accent:T.bg3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:item.actionable?"#fff":T.muted,fontSize:12,fontWeight:900}}>#{i+1}</span>
                    </div>
                    <div style={{flex:1,padding:"14px 18px"}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.4,marginBottom:8}}>{item.finding}</div>
                      <div style={{fontSize:11,color:T.ink2,lineHeight:1.6,marginBottom:8}}>{item.support}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:9,color:T.muted}}>Confiance :</span>
                        <span style={{fontSize:9,fontWeight:700,color:item.confidence==="Elevee"?T.ok:item.confidence==="Faible"?T.danger:T.warn}}>{item.confidence}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RECOMMANDATIONS */}
          {activeSection==="reco" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink,marginBottom:4}}>Recommandations</div>
              {(analysis.recommendations||[]).map((r,i)=>(
                <div key={i} style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",gap:0,overflow:"hidden"}}>
                  <div style={{width:40,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"#fff",fontSize:14,fontWeight:900}}>{r.priority}</span>
                  </div>
                  <div style={{flex:1,padding:"14px 18px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.4}}>{r.action}</div>
                      <span style={{fontSize:9,fontWeight:700,color:T.muted,background:T.bg2,borderRadius:3,padding:"2px 8px",border:`1px solid ${T.border}`,flexShrink:0,whiteSpace:"nowrap"}}>{r.horizon||r.effort}</span>
                    </div>
                    <div style={{fontSize:11,color:T.ink2,lineHeight:1.6,marginBottom:r.expectedImpact?8:0}}>{r.rationale}</div>
                    {r.expectedImpact && (
                      <div style={{background:`${T.ok}08`,borderRadius:5,padding:"5px 10px",border:`1px solid ${T.ok}20`,fontSize:10,color:T.ink2}}>
                        <span style={{fontWeight:700,color:T.ok}}>Impact attendu :</span> {r.expectedImpact}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {/* KPI recap under reco */}
              {analysis.kpiAssessment?.length > 0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:T.muted,marginBottom:10}}>Évaluation des KPIs</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {analysis.kpiAssessment.map((k,i)=>(
                      <div key={i} style={{background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,padding:"12px 16px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                          <div style={{fontSize:11,fontWeight:700,color:T.ink,flex:1,lineHeight:1.3}}>{k.kpi}</div>
                          <VerdictBadge v={k.status}/>
                        </div>
                        <div style={{display:"flex",gap:14,marginBottom:k.interpretation?8:0}}>
                          {k.target && <div><div style={{fontSize:8,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:1}}>Cible</div><div style={{fontSize:11,fontWeight:800,color:T.accent}}>{k.target}</div></div>}
                          {k.observed && <div><div style={{fontSize:8,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:1}}>Observé</div><div style={{fontSize:11,fontWeight:800,color:k.status==="ATTEINT"?T.ok:k.status==="NON ATTEINT"?T.danger:T.warn}}>{k.observed}</div></div>}
                        </div>
                        {k.significance && <div style={{fontSize:9,color:T.muted,marginBottom:4}}>{k.significance}</div>}
                        {k.interpretation && <div style={{fontSize:10,color:T.ink2,lineHeight:1.5,borderTop:`1px solid ${T.border}`,paddingTop:6}}>{k.interpretation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {activeSection==="chat" && (
            <div style={{display:"flex",flexDirection:"column",gap:12,height:"calc(100vh - 200px)"}}>
              <div style={{fontSize:13,fontWeight:800,color:T.ink}}>Approfondir l analyse</div>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,padding:"4px 0"}}>
                {chatMessages.length===0 && (
                  <div style={{background:T.bg,borderRadius:10,border:`1px solid ${T.border}`,padding:18}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.ink,marginBottom:10}}>Posez vos questions sur l analyse :</div>
                    {[
                      "Quels sont les problemes les plus urgents a corriger ?",
                      "Comment interpreter la divergence entre P1 et P3 ?",
                      "Y a-t-il des segments d utilisateurs qui se comportent differemment ?",
                      "Quelles hypotheses faudrait-il retester ?"
                    ].map((ex,i)=>(
                      <div key={i} onClick={()=>setChatInput(ex)}
                        style={{fontSize:10,color:T.accent,cursor:"pointer",padding:"4px 0",borderBottom:i<3?`1px dashed ${T.border}`:"none",lineHeight:1.6}}>
                        &#8594; {ex}
                      </div>
                    ))}
                  </div>
                )}
                {chatMessages.map((m,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                    {m.role==="assistant" && <div style={{width:26,height:26,borderRadius:7,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:"#fff"}}>&#10022;</div>}
                    <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",background:m.role==="user"?T.accent:T.bg,color:m.role==="user"?"#fff":T.ink2,fontSize:11,lineHeight:1.7,border:m.role==="assistant"?`1px solid ${T.border}`:"none",whiteSpace:"pre-wrap"}}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{display:"flex",gap:8}}>
                    <div style={{width:26,height:26,borderRadius:7,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:"#fff"}}>&#10022;</div>
                    <div style={{padding:"10px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:"10px 10px 10px 3px",display:"flex",gap:4,alignItems:"center"}}>
                      {[0,1,2].map(j=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:T.accent,opacity:.4,animation:`bounce 1s ${j*.2}s ease-in-out infinite`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={chatRef}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                  placeholder="Posez une question sur les resultats, les patterns, les recommandations..."
                  rows={2} disabled={chatLoading}
                  style={{flex:1,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:T.ff,resize:"none",outline:"none",background:chatLoading?T.bg2:T.bg,color:T.ink,boxSizing:"border-box"}}/>
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                  style={{background:chatInput.trim()&&!chatLoading?T.accent:T.bg3,color:chatInput.trim()&&!chatLoading?"#fff":T.muted,border:"none",borderRadius:8,padding:"0 20px",fontSize:12,fontWeight:700,cursor:chatInput.trim()&&!chatLoading?"pointer":"default"}}>
                  Envoyer
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
};


export default function App() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bounce { 0%,80%,100%{transform:scale(0);opacity:.2} 40%{transform:scale(1);opacity:1} }
      @keyframes spin   { to{transform:rotate(360deg)} }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [screen, setScreen] = useState("home"); // home|protocol-chat|protocol-view|builder|slides
  const [briefData, setBriefData] = useState(initData());
  const [briefStep, setBriefStep] = useState(1);
  const [protocol, setProtocol] = useState(null);
  const [aiContent, setAiContent] = useState(null);
  const [supervising, setSupervising] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [customQuanti, setCustomQuanti] = useState({label:"",threshold:""});
  const [customQuali, setCustomQuali] = useState("");
  const [customKpiBiz, setCustomKpiBiz] = useState("");
  const [analysisProtocol, setAnalysisProtocol] = useState(null);

  const setD = (k,v) => setBriefData(d=>({...d,[k]:v}));
  const toggleTT = t => setD("testTypes",briefData.testTypes.includes(t)?briefData.testTypes.filter(x=>x!==t):[...briefData.testTypes,t]);
  const addQuanti = () => { if(customQuanti.label.trim()){setD("measuresQuanti",[...briefData.measuresQuanti,{...customQuanti}]);setCustomQuanti({label:"",threshold:""});} };
  const addQuali  = () => { if(customQuali.trim()){setD("measuresQuali",[...briefData.measuresQuali,{label:customQuali}]);setCustomQuali("");} };
  const addKpiBiz = () => { if(customKpiBiz.trim()){setD("kpiBusiness",[...briefData.kpiBusiness,{label:customKpiBiz}]);setCustomKpiBiz("");} };
  const progress = Math.round((briefStep/STEPS.length)*100);

  const useBriefFromProtocol = (proto) => {
    const m = proto.briefMeta || {};

    const tasksText = (proto.tasks || []).map(t => [
      `— Tache ${t.id} : ${t.title}`,
      t.scenario ? `Scenario : ${t.scenario}` : "",
      `Instruction : ${t.instruction}`,
      t.successCriteria ? `Succes : ${t.successCriteria}` : "",
    ].filter(Boolean).join("\n")).join("\n\n");

    const guideLines = [];
    const qText = q => typeof q === "string" ? q : q.question;
    const qFmt  = q => typeof q === "object" && q.responseFormat ? ` [${q.responseFormat}]` : "";
    if (proto.warmUpQuestions?.length) {
      guideLines.push("── WARM-UP ──");
      proto.warmUpQuestions.forEach(q => guideLines.push(`• ${qText(q)}${qFmt(q)}`));
    }
    if (proto.tasks?.length) {
      guideLines.push("\n── QUESTIONS POST-TACHE ──");
      proto.tasks.forEach(t => {
        guideLines.push(`[Tache ${t.id}]`);
        (t.postTaskQuestions || []).forEach(q => guideLines.push(`• ${qText(q)}${qFmt(q)}`));
        (t.followUpQuestions || []).forEach(q => guideLines.push(`  -> ${qText(q)}${qFmt(q)}`));
      });
    }
    if (proto.closingQuestions?.length) {
      guideLines.push("\n── CLOTURE ──");
      proto.closingQuestions.forEach(q => guideLines.push(`• ${qText(q)}${qFmt(q)}`));
    }

    const screenerText = (proto.screeners || []).map((s, i) =>
      `Q${i+1}. ${s.question}\n  OK : ${s.qualifying}\n  KO : ${s.disqualifying}`
    ).join("\n\n");

    const participantCriteria = [
      (proto.recruitingCriteria || []).join("\n"),
      screenerText ? `\n── SCREENERS ──\n${screenerText}` : ""
    ].filter(Boolean).join("\n");

    const measuresQuanti = (proto.kpis?.quantitatifs || []).map(k => ({label: k.label, threshold: k.cible || ""}));
    const measuresQuali  = (proto.kpis?.qualitatifs  || []).map(q => ({label: q}));
    const kpiBusiness    = (proto.kpis?.kpiBusiness  || []).map(k => ({label: k.label}));
    const hypothesesStr  = (proto.hypotheses || []).join("\n");

    setBriefData(d => ({
      ...d,
      projectName:        m.projectName      || d.projectName,
      team:               m.team             || d.team,
      date:               m.date             || d.date || new Date().toISOString().split("T")[0],
      sponsor:            m.sponsor          || d.sponsor,
      keyDates:           m.keyDates         || d.keyDates,
      deliverables:       m.deliverables     || d.deliverables,
      execSummary:        m.execSummary      || "",
      keyQuestion:        m.keyQuestion      || "",
      decisionExpected:   m.decisionExpected || "",
      businessIssue:      m.businessIssue    || "",
      businessImpact:     m.businessImpact   || "",
      businessStrategy:   m.businessStrategy || "",
      testTypes:          ["Non-modere"],
      primaryQuestion:    m.primaryQuestion  || "",
      secondaryQuestions: m.secondaryQuestions || "",
      hypotheses:         hypothesesStr,
      measuresQuanti,
      measuresQuali,
      kpiBusiness,
      scopeYes:           m.scopeYes         || "",
      scopeNo:            m.scopeNo          || "",
      participantCriteria,
      participantCount:   m.participantCount || "5-8 participants",
      segments:           m.segments         || "",
      maturityLevel:      m.maturityLevel    || "",
      priorExperience:    m.priorExperience  || "",
      format:             proto.methodology?.format      || "Remote",
      sessionMode:        proto.methodology?.sessionMode || "Non-modere",
      duration:           proto.duration     || "15-20 minutes",
      tools:              proto.methodology?.tools       || "UserTesting",
      sessionPlan:        proto.methodology?.sessionPlan || "",
      tasks:              tasksText,
      interviewGuide:     guideLines.join("\n"),
      risks:              proto.methodology?.risks       || "",
      constraints:        m.constraints      || "",
    }));
    setScreen("builder");
  };

  /* Slide supervision */
  const openSlides = async () => {
    setSupervising(true); setSlideIdx(0); setAiContent(null); setScreen("slides");
    try {
      const prompt = `Tu es un expert en communication visuelle et en synthèse de contenu pour des présentations de direction.

Ta mission : transformer ce brief UX en contenu de slides PERCUTANT. Chaque slide a une contrainte d espace forte : sois synthétique, impactant, sans verbosité.

RÈGLES DE RÉDACTION STRICTES :
- Titres : 3-6 mots maximum, formule affirmative ou interrogative directe
- Sous-titres : 1 ligne max, apporte une nuance ou un angle
- Corps de texte : phrases courtes (max 15 mots), privilégie les listes à puces courtes
- Reformule toujours — ne recopie JAMAIS le texte brut du brief
- Si une information est absente, invente une valeur plausible et professionnelle
- Chaque slide doit avoir une idée centrale claire, lisible en 5 secondes

DONNÉES BRUTES :
${JSON.stringify(briefData,null,2)}

Pour chaque slide, choisis la meilleure façon de présenter l information :
- Slide Couverture : titre accrocheur, sous-titre de contexte, question cle reformulee en enjeu
- Slide Enjeu : reformule le probleme business comme un defi concret avec des chiffres si disponibles
- Slide Objectifs : hierarchise clairement primaire vs secondaires, formule les hypotheses en bullet courts
- Slide Perimetre : deux colonnes tranchees OUI / NON, chaque point = max 8 mots
- Slide Participants : rends le profil immediatement lisible, synthetise les criteres en 3-4 mots-cles
- Slide Planning : liste de jalons, livrables en bullet, risques condenses
- Slide Validation : liste de checkpoints actionables, resume du brief en chiffres

SLIDE METHODOLOGIE - CHOIX DU FORMAT :
Analyse le contenu disponible (deroulé, taches, guide, format, outils, duree) et choisis le layout le plus adapte :

- "timeline" : si le deroulé est detaille avec des timings clairs (ex: "0-5 min intro, 5-15 min taches..."). Genere alors methoSteps = [{label, duration, detail}] avec 4-7 etapes horodatees.
- "steps" : si le protocole a des phases distinctes et independantes (recrutement → preparation → session → analyse). Genere methoSteps = [{label, duration?, detail}] avec 3-5 blocs.
- "split" : si le contenu est dense avec beaucoup de taches ET un guide d entretien riche. Pas besoin de methoSteps.
- "default" : si le contenu est equilibre entre deroulé, taches et guide. Pas besoin de methoSteps.

Pour "timeline" et "steps", methoSteps est obligatoire. Pour "split" et "default", il ne sert a rien (omets-le ou mets null).
Le titre methoTitle doit refleter le choix de layout (ex: "Comment se deroule la session ?" pour timeline, "Les 4 phases du test" pour steps).

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Le JSON doit commencer par { et finir par } :
{"coverTitle":"","coverTitleSize":24,"coverSub":"","coverKeyQuestion":"","coverDecision":"","coverSummary":"","enjeuTitle":"","enjeuTitleSize":19,"enjeuSub":"","enjeuIssue":"","enjeuImpact":"","enjeuStrategy":"","objPrimary":"","objSecondary":"","objHypotheses":"","scopeTitle":"","scopeSub":"","scopeYes":"","scopeNo":"","participantTitle":"","participantCriteria":"","participantMaturity":"","participantExperience":"","participantSegments":"","methoTitle":"","methoLayout":"timeline","methoSteps":[],"methoFormat":"","methoMode":"","methoDuration":"","methoTools":"","sessionPlan":"","sessionTasks":"","sessionGuide":"","planningTitle":"","planningDates":"","planningDeliverables":"","planningRisks":"","planningConstraints":"","validationTitle":"","validationTitleAccent":"","validationSub":"","validationChecks":[],"validationProject":"","validationQuestion":""}`;
      const text = await callClaude([{role:"user",content:prompt}]);
      setAiContent(JSON.parse(text.replace(/```json|```/g,"").trim()));
    } catch(e) { setAiContent(null); }
    setSupervising(false);
  };

  const slides = buildBriefSlides(briefData, aiContent);

  /* ── Form helpers ── */
  const ic = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const Fld = ({label,hint,children}) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {hint&&<p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );
  const In = ({k,ph,type="text"}) => <input type={type} value={briefData[k]} onChange={e=>setD(k,e.target.value)} placeholder={ph} className={ic}/>;
  const Ta = ({k,ph,rows=3}) => <textarea value={briefData[k]} onChange={e=>setD(k,e.target.value)} placeholder={ph} rows={rows} className={ic+" resize-none"}/>;

  const renderBriefStep = () => {
    switch(briefStep){
      case 1: return(<><Fld label="Nom du projet"><In k="projectName" ph="Ex : Refonte tunnel de commande"/></Fld><Fld label="Équipe produit"><In k="team" ph="Ex : Équipe Checkout"/></Fld><Fld label="Date du brief"><In k="date" type="date"/></Fld><Fld label="Commanditaire"><In k="sponsor" ph="Ex : Marie Dupont, PM"/></Fld><Fld label="Résumé exécutif" hint="Ce que tout stakeholder doit comprendre en 10 secondes"><Ta k="execSummary" ph="Ce test vise à identifier les freins au checkout..."/></Fld><Fld label="Question clé"><In k="keyQuestion" ph="Peut-on lancer la refonte sans risquer le taux de conversion ?"/></Fld><Fld label="Décision attendue"><Ta k="decisionExpected" ph="Go / No-go sur la mise en production..." rows={2}/></Fld></>);
      case 2: return(<><Fld label="Problématique business"><Ta k="businessIssue" ph="Le taux d'abandon panier est de 68%..."/></Fld><Fld label="Impact attendu"><Ta k="businessImpact" ph="Réduire l'abandon de 15%..."/></Fld><Fld label="Lien stratégie produit"><Ta k="businessStrategy" ph="OKR Q2 — NPS +10 pts..."/></Fld></>);
      case 3: return(<Fld label="Type(s) de test"><div className="flex flex-wrap gap-2 mt-1">{TEST_TYPES.map(t=>(<button key={t} onClick={()=>toggleTT(t)} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${briefData.testTypes.includes(t)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>{t}</button>))}</div></Fld>);
      case 4: return(<><Fld label="Question primaire"><In k="primaryQuestion" ph="Les utilisateurs finalisent-ils leur commande sans friction ?"/></Fld><Fld label="Questions secondaires"><Ta k="secondaryQuestions" ph="1. Comprennent-ils les options de livraison ?&#10;2. ..."/></Fld><Fld label="Hypothèses"><Ta k="hypotheses" ph="H1 : La complexité du formulaire est la principale cause d'abandon..."/></Fld></>);
      case 5: return(<>
        <Fld label="Données quantitatives" hint="Métriques mesurables avec seuil optionnel">
          {briefData.measuresQuanti.length>0&&<div className="mb-3 rounded-lg overflow-hidden border border-gray-200">{briefData.measuresQuanti.map((m,i)=><div key={i} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 text-sm"><span className="font-medium text-gray-800">{m.label}</span>{m.threshold&&<span className="text-indigo-600 text-xs font-semibold bg-indigo-50 px-2 py-0.5 rounded">{m.threshold}</span>}<button onClick={()=>setD("measuresQuanti",briefData.measuresQuanti.filter((_,j)=>j!==i))} className="text-gray-300 hover:text-red-400 text-lg ml-2">×</button></div>)}</div>}
          <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2"><input value={customQuanti.label} onChange={e=>setCustomQuanti(p=>({...p,label:e.target.value}))} placeholder="Ex : Taux de complétion" className={ic}/><div className="flex gap-2"><input value={customQuanti.threshold} onChange={e=>setCustomQuanti(p=>({...p,threshold:e.target.value}))} placeholder="Seuil — ex : ≥ 70%" className={ic}/><button onClick={addQuanti} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">+ Ajouter</button></div></div>
        </Fld>
        <Fld label="Données qualitatives">
          {briefData.measuresQuali.length>0&&<div className="mb-3 rounded-lg overflow-hidden border border-gray-200">{briefData.measuresQuali.map((m,i)=><div key={i} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 text-sm"><span className="text-gray-700">{m.label}</span><button onClick={()=>setD("measuresQuali",briefData.measuresQuali.filter((_,j)=>j!==i))} className="text-gray-300 hover:text-red-400 text-lg ml-2">×</button></div>)}</div>}
          <div className="bg-gray-50 rounded-lg p-3 flex gap-2"><input value={customQuali} onChange={e=>setCustomQuali(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addQuali()} placeholder="Ex : Perception de complexité" className={ic}/><button onClick={addQuali} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 whitespace-nowrap">+ Ajouter</button></div>
        </Fld>
        <Fld label="KPI business visés">
          {briefData.kpiBusiness.length>0&&<div className="mb-3 rounded-lg overflow-hidden border border-gray-200">{briefData.kpiBusiness.map((k,i)=><div key={i} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 text-sm"><span className="text-gray-700">{k.label}</span><button onClick={()=>setD("kpiBusiness",briefData.kpiBusiness.filter((_,j)=>j!==i))} className="text-gray-300 hover:text-red-400 text-lg ml-2">×</button></div>)}</div>}
          <div className="bg-green-50 rounded-lg p-3 flex gap-2"><input value={customKpiBiz} onChange={e=>setCustomKpiBiz(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKpiBiz()} placeholder="Ex : Taux de conversion checkout" className={ic}/><button onClick={addKpiBiz} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 whitespace-nowrap">+ Ajouter</button></div>
        </Fld>
      </>);
      case 6: return(<><Fld label="Ce test permettra de trancher" hint="Un point par ligne"><Ta k="scopeYes" ph="- Les utilisateurs comprennent-ils les options ?&#10;- Le formulaire génère-t-il de la friction ?"/></Fld><Fld label="Ce test ne permettra PAS de décider" hint="Un point par ligne"><Ta k="scopeNo" ph="- L'impact réel sur le taux de conversion&#10;- Le comportement sur mobile"/></Fld></>);
      case 7: return(<><Fld label="Critères de recrutement"><Ta k="participantCriteria" ph="Adultes 25-45 ans, achat en ligne mensuel..."/></Fld><Fld label="Nombre de participants"><In k="participantCount" ph="Ex : 6 participants"/></Fld><Fld label="Segments cibles"><Ta k="segments" ph="3 nouveaux / 3 récurrents" rows={2}/></Fld><Fld label="Maturité digitale"><In k="maturityLevel" ph="Utilisateurs réguliers du e-commerce"/></Fld><Fld label="Expérience préalable produit"><In k="priorExperience" ph="N'ayant jamais utilisé notre plateforme"/></Fld></>);
      case 8: return(<><Fld label="Format"><div className="flex gap-2">{["Remote","Présentiel","Hybride"].map(f=>(<button key={f} onClick={()=>setD("format",f)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${briefData.format===f?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>{f}</button>))}</div></Fld><Fld label="Mode de session"><div className="flex gap-2">{["Modéré","Non-modéré"].map(f=>(<button key={f} onClick={()=>setD("sessionMode",f)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${briefData.sessionMode===f?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>{f}</button>))}</div></Fld><Fld label="Durée par session"><In k="duration" ph="60 minutes"/></Fld><Fld label="Outils"><Ta k="tools" ph="Maze, Lookback, Figma..." rows={2}/></Fld></>);
      case 9: return(<><Fld label="Déroulé de la session"><Ta k="sessionPlan" ph="0-5 min : Accueil&#10;5-10 min : Contexte&#10;10-50 min : Tâches&#10;50-60 min : Debriefing"/></Fld><Fld label="Tâches / Scénarios"><Ta k="tasks" ph="Tâche 1 : Vous souhaitez commander..."/></Fld><Fld label="Guide d'entretien"><Ta k="interviewGuide" ph="- Qu'avez-vous ressenti à cette étape ?"/></Fld></>);
      case 10: return(<><Fld label="Dates clés"><Ta k="keyDates" ph="- Validation brief : JJ/MM&#10;- Recrutement : JJ/MM&#10;- Sessions : JJ/MM&#10;- Restitution : JJ/MM"/></Fld><Fld label="Livrables attendus"><Ta k="deliverables" ph="- Rapport de synthèse&#10;- Verbatims annotés&#10;- Recommandations"/></Fld></>);
      case 11: return(<><Fld label="Risques identifiés"><Ta k="risks" ph="Difficulté de recrutement sur ce profil..."/></Fld><Fld label="Contraintes"><Ta k="constraints" ph="Prototype incomplet sur l'étape de paiement..."/></Fld></>);
    }
  };

  /* ─── SCREENS ────────────────────────────────────────────────────────── */
  if(screen==="analysis") return <AnalysisEngine initialProtocol={analysisProtocol} onBack={()=>setScreen("home")}/>;
  if(screen==="protocol-chat") return <ProtocolChat onProtocolReady={p=>{setProtocol(p);setScreen("protocol-view");}} onBack={()=>setScreen("home")}/>;
  if(screen==="protocol-view") return <ProtocolViewer protocol={protocol} onBack={()=>setScreen("protocol-chat")} onUseBrief={useBriefFromProtocol} onAnalyse={p=>{setAnalysisProtocol(p);setScreen("analysis");}}/>;

  if(screen==="home") return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{background:"linear-gradient(135deg,#f0f1ff 0%,#fff 60%)"}}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🔬</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">User Research Suite</h1>
          <p className="text-gray-400 text-sm">Protocole Builder · Brief Builder · Analysis Engine</p>
        </div>
        <div className="grid gap-4">
          {/* Protocole Builder */}
          <button onClick={()=>setScreen("protocol-chat")} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:"#EEF2FF"}}>📋</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  Protocole Builder
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Nouveau</span>
                </div>
                <div className="text-sm text-gray-400">Créez un protocole de test guidé par Claude, éditable et exportable</div>
              </div>
              <div className="text-indigo-300 group-hover:text-indigo-500 transition-colors text-xl">→</div>
            </div>
          </button>
          {/* Analysis Engine */}
          <button onClick={()=>{setAnalysisProtocol(null);setScreen("analysis");}} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:"#FFF7ED"}}>&#128202;</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  Analysis Engine
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Nouveau</span>
                </div>
                <div className="text-sm text-gray-400">Injectez vos r&#233;sultats bruts et obtenez une analyse structur&#233;e ancr&#233;e dans votre protocole</div>
              </div>
              <div className="text-indigo-300 group-hover:text-indigo-500 transition-colors text-xl">&#8594;</div>
            </div>
          </button>
          {/* Brief Builder */}
          <button onClick={()=>{setBriefData(initData());setBriefStep(1);setScreen("builder");}} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:"#F0FDF4"}}>📑</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 mb-1">Brief Builder</div>
                <div className="text-sm text-gray-400">Construisez et exportez votre brief de validation en slides supervisées par IA</div>
              </div>
              <div className="text-indigo-300 group-hover:text-indigo-500 transition-colors text-xl">→</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if(screen==="slides") return <SlidesScreen
    slides={slides} slideIdx={slideIdx} setSlideIdx={setSlideIdx}
    supervising={supervising} aiContent={aiContent} setAiContent={setAiContent}
    openSlides={openSlides}
    onBack={()=>setScreen("builder")}
  />;

  /* BUILDER */
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-56 bg-white border-r border-gray-100 p-4 hidden md:flex flex-col">
        <div className="mb-4">
          <button onClick={()=>setScreen("home")} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">← Accueil</button>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2">Brief Builder</p>
        </div>
        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          {STEPS.map(s=>(<button key={s.id} onClick={()=>setBriefStep(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${briefStep===s.id?"bg-indigo-50 text-indigo-700":"text-gray-500 hover:bg-gray-50"}`}><span>{s.icon}</span><span>{s.label}</span></button>))}
        </nav>
      </div>
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-bold text-gray-800">{STEPS[briefStep-1].icon} {STEPS[briefStep-1].label}</h1>
              <p className="text-xs text-gray-400">Étape {briefStep} sur {STEPS.length}</p>
            </div>
            <button onClick={()=>{setAiContent(null);openSlides();}} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">✦ Générer les slides</button>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6"><div className="max-w-xl">{renderBriefStep()}</div></div>
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex justify-between">
          <button onClick={()=>setBriefStep(s=>Math.max(1,s-1))} disabled={briefStep===1} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-30">← Précédent</button>
          {briefStep<STEPS.length
            ?<button onClick={()=>setBriefStep(s=>s+1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Suivant →</button>
            :<button onClick={()=>{setAiContent(null);openSlides();}} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">✦ Générer les slides</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ━━━ ANALYSIS ENGINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */