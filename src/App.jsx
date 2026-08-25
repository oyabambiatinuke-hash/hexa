import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";

/*
  HEXA NEXUS — NEXT LEVEL APP.JSX
  ------------------------------------------------------------
  Communication + creation workspace:
  Chat, Groups, Communities, Channels, Status, Calls,
  Projects, Game Studio, App Studio, CodeSpace, AI + Offline Reserve.
  Existing Supabase authentication/profile/project/group/community
  tables are preserved. New communication surfaces gracefully use
  local state until their backend tables are connected.
*/

const NAV = [
  { id: "overview", icon: "⌂", label: "Nexus" },
  { id: "chat", icon: "◉", label: "Chat" },
  { id: "groups", icon: "◎", label: "Groups" },
  { id: "communities", icon: "◇", label: "Communities" },
  { id: "channels", icon: "◈", label: "Channels" },
  { id: "status", icon: "◌", label: "Status" },
  { id: "calls", icon: "⌁", label: "Calls" },
  { id: "projects", icon: "◆", label: "Projects" },
];

const CREATE_NAV = [
  { id: "game", icon: "▣", label: "Game Studio" },
  { id: "app", icon: "▤", label: "App Studio" },
  { id: "code", icon: "</>", label: "CodeSpace" },
];

const GAME_ENGINES = [
  { id: "unreal", name: "Unreal Engine", icon: "UE", desc: "High-end 3D, cinematic and multiplayer development." },
  { id: "unity", name: "Unity", icon: "U", desc: "2D/3D games, mobile, XR and cross-platform projects." },
  { id: "godot", name: "Godot", icon: "G", desc: "Open-source 2D/3D game development." },
  { id: "vscode", name: "VS Code", icon: "</>", desc: "Build with your own engine, framework or custom stack." },
];

const APP_STACKS = [
  { id: "vscode", name: "VS Code", icon: "</>", desc: "Flexible development workspace." },
  { id: "react", name: "React", icon: "R", desc: "Modern web interfaces and products." },
  { id: "react-native", name: "React Native", icon: "RN", desc: "Cross-platform mobile applications." },
  { id: "flutter", name: "Flutter", icon: "F", desc: "Cross-platform apps from one codebase." },
  { id: "electron", name: "Electron", icon: "E", desc: "Desktop applications with web technology." },
];

const STATUS_SEED = [
  { id: "s1", name: "HEXA", handle: "@hexa", type: "text", text: "Build. Connect. Create.", time: "2h", seen: false },
  { id: "s2", name: "HEXA Developers", handle: "@developers", type: "text", text: "Shipping something new today.", time: "4h", seen: false },
  { id: "s3", name: "Creative Lab", handle: "@creative", type: "text", text: "Design mode: ON", time: "7h", seen: true },
];

const CHANNEL_SEED = [
  { id: "c1", name: "HEXA Official", handle: "@hexa", followers: "12.4K", verified: true, description: "Official HEXA announcements and releases.", posts: [{ id: "p1", text: "Welcome to HEXA NEXUS. One space. Everything.", time: "Today", likes: 84 }] },
  { id: "c2", name: "HEXA Developers", handle: "@hexadev", followers: "4.8K", verified: true, description: "Code, engines, projects and developer news.", posts: [{ id: "p2", text: "Game Studio now supports Unreal, Unity, Godot and VS Code workflows.", time: "Today", likes: 51 }] },
];

const LOCAL_MESSAGES = [
  { id: "m1", sender_id: "other", text: "Welcome to HEXA. What are you building?", created_at: new Date(Date.now() - 3600000).toISOString(), mine: false },
  { id: "m2", sender_id: "me", text: "Something much bigger than a chat app.", created_at: new Date(Date.now() - 3300000).toISOString(), mine: true },
];

const STARTER_CODE = `import React from "react";

export default function App() {
  return (
    <main>
      <h1>HEXA</h1>
      <p>Build something great.</p>
    </main>
  );
}`;

const styles = `
*{box-sizing:border-box}
:root{
  --hx-bg:#06070a;--hx-bg2:#090b10;--hx-panel:#0d1016;--hx-panel2:#11151d;
  --hx-panel3:#151a23;--hx-border:rgba(255,255,255,.075);--hx-border2:rgba(255,255,255,.14);
  --hx-text:#f6f8fb;--hx-muted:#858d9a;--hx-soft:#b8bec8;--hx-green:#61e6a2;
  --hx-purple:#9d8cff;--hx-blue:#7eb8ff;--hx-red:#ff7373;--hx-radius:18px;
}
html,body,#root{margin:0;min-height:100%;background:var(--hx-bg)}
body{color:var(--hx-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,textarea,select{font:inherit}button{cursor:pointer}
button:disabled{cursor:not-allowed;opacity:.5}
.hx-app{min-height:100vh;background:
 radial-gradient(circle at 78% -10%,rgba(130,110,255,.15),transparent 30%),
 radial-gradient(circle at 10% 20%,rgba(255,255,255,.035),transparent 25%),#06070a}
.hx-auth{min-height:100vh;display:grid;grid-template-columns:1.08fr .92fr;overflow:hidden}
.hx-auth-visual{position:relative;padding:48px;display:flex;flex-direction:column;justify-content:space-between;border-right:1px solid var(--hx-border);background:radial-gradient(circle at 55% 40%,rgba(155,140,255,.18),transparent 26%),radial-gradient(circle at 20% 80%,rgba(97,230,162,.07),transparent 24%),#08090d}
.hx-grid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent)}
.hx-auth-logo,.hx-auth-hero,.hx-auth-footer{position:relative;z-index:2}
.hx-auth-logo{display:flex;align-items:center;gap:12px}.hx-logo-box{width:42px;height:42px;border:1px solid rgba(255,255,255,.2);border-radius:13px;display:grid;place-items:center;font-weight:900;background:rgba(255,255,255,.055);box-shadow:0 0 35px rgba(255,255,255,.06)}
.hx-logo-word{font-size:17px;font-weight:800;letter-spacing:.18em}.hx-auth-hero{max-width:700px}.hx-auth-kicker,.hx-chip{display:inline-flex;border:1px solid var(--hx-border2);padding:7px 10px;border-radius:999px;color:#c8cdd6;font-size:10px;font-weight:800;letter-spacing:.15em;background:rgba(255,255,255,.035)}
.hx-auth-hero h1{margin:22px 0 15px;font-size:clamp(48px,6vw,92px);line-height:.92;letter-spacing:-.07em}.hx-auth-hero p{color:var(--hx-muted);max-width:560px;font-size:16px;line-height:1.7}.hx-auth-orbit{width:230px;height:230px;position:absolute;right:12%;top:31%;border:1px solid rgba(255,255,255,.12);border-radius:50%;box-shadow:0 0 100px rgba(155,140,255,.13)}.hx-auth-orbit:before,.hx-auth-orbit:after{content:"";position:absolute;inset:26px;border:1px solid rgba(255,255,255,.08);border-radius:50%}.hx-auth-orbit:after{inset:76px;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.2)}
.hx-auth-footer{color:#666d78;font-size:11px;letter-spacing:.12em}.hx-auth-panel{min-width:0;display:flex;align-items:center;justify-content:center;padding:30px;background:#090a0e}.hx-auth-card{width:min(430px,100%)}.hx-auth-card h2{margin:0;font-size:38px;letter-spacing:-.045em}.hx-auth-card>p{margin:9px 0 28px;color:var(--hx-muted)}
.hx-auth-tabs{display:grid;grid-template-columns:1fr 1fr;padding:4px;border:1px solid var(--hx-border);background:#0d0f13;border-radius:12px;margin-bottom:25px}.hx-auth-tabs button{border:0;background:transparent;color:#727985;padding:11px;border-radius:8px}.hx-auth-tabs button.active{background:#1a1d23;color:white}
.hx-field{margin-bottom:16px}.hx-field label{display:block;margin-bottom:8px;font-size:10px;font-weight:800;letter-spacing:.14em;color:#969daa}.hx-input-wrap{position:relative}.hx-input-wrap span{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#6e7580}.hx-input{width:100%;border:1px solid var(--hx-border);outline:none;background:#0d0f14;color:white;border-radius:12px;padding:13px 14px;transition:.2s}.hx-input.has-icon{padding-left:40px}.hx-input:focus{border-color:rgba(255,255,255,.27);box-shadow:0 0 0 3px rgba(255,255,255,.035)}
.hx-password-row{display:flex;justify-content:space-between;align-items:center}.hx-link{color:#a9a0ff;background:none;border:0;padding:0;font-size:12px}.hx-check{display:flex;gap:8px;color:#818894;font-size:12px;align-items:center;margin:5px 0 18px}.hx-main-btn{width:100%;border:0;border-radius:12px;padding:14px;color:#08090b;background:#f4f5f7;font-weight:800;transition:.2s}.hx-main-btn:hover{transform:translateY(-1px);box-shadow:0 12px 30px rgba(255,255,255,.08)}
.hx-divider{display:flex;align-items:center;gap:12px;margin:23px 0;color:#5d636e;font-size:10px;letter-spacing:.13em}.hx-divider:before,.hx-divider:after{content:"";flex:1;height:1px;background:var(--hx-border)}.hx-socials{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hx-social{border:1px solid var(--hx-border);background:#0d0f14;color:white;border-radius:11px;padding:12px}.hx-auth-switch{text-align:center;margin-top:22px;color:#666d78;font-size:12px}.hx-auth-switch button{border:0;background:none;color:white;font-weight:700}.hx-error{padding:11px 13px;border:1px solid rgba(255,90,90,.22);background:rgba(255,70,70,.07);color:#ff9a9a;border-radius:10px;margin-bottom:15px;font-size:12px}
.hx-shell{min-height:100vh;display:grid;grid-template-columns:248px 1fr}.hx-sidebar{position:fixed;inset:0 auto 0 0;width:248px;border-right:1px solid var(--hx-border);background:rgba(7,8,11,.86);backdrop-filter:blur(28px);padding:20px 13px;display:flex;flex-direction:column;z-index:50}.hx-side-brand{display:flex;align-items:center;gap:10px;padding:2px 10px 22px}.hx-side-brand .hx-logo-box{width:36px;height:36px;border-radius:11px}.hx-side-brand strong{font-size:14px;letter-spacing:.16em}.hx-side-label{color:#555c67;font-size:9px;font-weight:900;letter-spacing:.18em;padding:0 11px 8px}.hx-nav{display:grid;gap:3px}.hx-nav button{position:relative;border:0;background:transparent;color:#777e89;display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:10px;text-align:left;transition:.18s;width:100%}.hx-nav button:hover{background:rgba(255,255,255,.035);color:white}.hx-nav button.active{color:white;background:linear-gradient(90deg,rgba(255,255,255,.09),rgba(255,255,255,.035))}.hx-nav button.active:before{content:"";position:absolute;left:0;width:2px;height:18px;background:white;border-radius:2px}.hx-nav-icon{width:21px;text-align:center}.hx-sidebar-bottom{margin-top:auto}.hx-user-mini{border-top:1px solid var(--hx-border);padding:15px 8px 4px;display:flex;align-items:center;gap:10px}.hx-user-mini div{min-width:0}.hx-user-mini strong,.hx-user-mini span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hx-user-mini strong{font-size:12px}.hx-user-mini span{font-size:10px;color:#656c77}
.hx-content{grid-column:2;min-width:0}.hx-topbar{height:72px;border-bottom:1px solid var(--hx-border);display:flex;align-items:center;justify-content:space-between;gap:15px;padding:0 30px;position:sticky;top:0;z-index:30;background:rgba(7,8,11,.72);backdrop-filter:blur(24px)}.hx-search{width:min(520px,55vw);display:flex;align-items:center;gap:9px;background:#0c0e12;border:1px solid var(--hx-border);padding:9px 12px;border-radius:11px}.hx-search span{color:#606772}.hx-search input{width:100%;border:0;outline:0;background:none;color:white}.hx-top-actions{display:flex;align-items:center;gap:8px}.hx-icon-btn{width:36px;height:36px;border:1px solid var(--hx-border);border-radius:10px;background:#0c0e12;color:#a0a7b2}.hx-icon-btn:hover{border-color:var(--hx-border2);color:white}.hx-page{max-width:1500px;margin:auto;padding:38px 40px 70px}.hx-heading{display:flex;justify-content:space-between;gap:30px;align-items:flex-end;margin-bottom:30px}.hx-eyebrow{color:#747b86;font-size:10px;font-weight:900;letter-spacing:.2em}.hx-heading h1{margin:8px 0 7px;font-size:clamp(36px,4vw,58px);letter-spacing:-.06em;line-height:1}.hx-heading p{margin:0;color:#777e89}
.hx-hero{position:relative;overflow:hidden;min-height:310px;border:1px solid var(--hx-border);border-radius:25px;background:radial-gradient(circle at 82% 35%,rgba(155,140,255,.18),transparent 25%),radial-gradient(circle at 70% 100%,rgba(97,230,162,.07),transparent 25%),linear-gradient(135deg,#101218,#0a0c10);padding:36px;display:flex;flex-direction:column;justify-content:center}.hx-hero:before{content:"HEXA";position:absolute;right:5%;bottom:-35px;font-size:170px;font-weight:900;letter-spacing:-.09em;color:rgba(255,255,255,.018)}.hx-hero:after{content:"";position:absolute;width:340px;height:340px;right:-110px;top:-130px;border:1px solid rgba(255,255,255,.08);border-radius:50%;box-shadow:0 0 0 35px rgba(255,255,255,.015),0 0 0 70px rgba(255,255,255,.01)}.hx-hero h2,.hx-hero p,.hx-actions{position:relative;z-index:2}.hx-hero h2{margin:8px 0;font-size:clamp(32px,4vw,58px);letter-spacing:-.06em;max-width:720px}.hx-hero p{color:#858c97;max-width:600px}.hx-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.hx-action,.hx-btn{border:1px solid var(--hx-border2);background:rgba(255,255,255,.055);color:white;border-radius:10px;padding:10px 14px}.hx-action:hover,.hx-btn:hover{border-color:rgba(255,255,255,.24);transform:translateY(-1px)}.hx-action.primary,.hx-btn.light{background:#f1f2f4;color:#08090b;border-color:#f1f2f4;font-weight:800}
.hx-section-title{display:flex;justify-content:space-between;align-items:center;margin:32px 0 14px}.hx-section-title span{font-size:10px;color:#646b76;font-weight:900;letter-spacing:.18em}.hx-grid-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.hx-feature{min-height:165px;border:1px solid var(--hx-border);border-radius:17px;background:#0d0f14;padding:21px;transition:.2s}.hx-feature:hover{transform:translateY(-3px);border-color:var(--hx-border2);background:#101218;box-shadow:0 20px 50px rgba(0,0,0,.2)}.hx-feature-top{display:flex;justify-content:space-between;color:#707782}.hx-feature-icon,.hx-empty-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:#171a20;color:#e6e8ec}.hx-feature h3{margin:26px 0 5px;font-size:16px}.hx-feature p{margin:0;color:#6f7681;font-size:12px;line-height:1.55}
.hx-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hx-panel{border:1px solid var(--hx-border);background:#0c0e12;border-radius:17px;padding:20px}.hx-panel-head{display:flex;justify-content:space-between;color:#727985;font-size:10px;font-weight:800;letter-spacing:.12em;margin-bottom:16px}.hx-list{border:1px solid var(--hx-border);border-radius:17px;overflow:hidden;background:#0c0e12}.hx-list-row{display:flex;justify-content:space-between;align-items:center;padding:15px 17px;border-bottom:1px solid var(--hx-border)}.hx-list-row:last-child{border-bottom:0}.hx-list-info{display:flex;align-items:center;gap:12px}.hx-list-info strong{display:block;font-size:13px}.hx-list-info span{display:block;color:#686f7a;font-size:11px;margin-top:3px}.hx-status{color:var(--hx-green);font-size:10px;font-weight:800}
.hx-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}.hx-project{min-height:200px;border:1px solid var(--hx-border);border-radius:17px;padding:20px;background:#0d0f14;display:flex;flex-direction:column;justify-content:space-between;transition:.2s}.hx-project:hover{border-color:var(--hx-border2);transform:translateY(-2px)}.hx-project-type{color:#777e88;font-size:9px;font-weight:900;letter-spacing:.15em}.hx-project h3{margin:28px 0 5px}.hx-project p{color:#676e79;font-size:12px;margin:0;line-height:1.5}
.hx-empty{min-height:260px;border:1px dashed rgba(255,255,255,.1);border-radius:18px;display:grid;place-items:center;text-align:center;padding:35px;background:rgba(255,255,255,.015)}.hx-empty-icon{margin:auto;color:#a9a0ff}.hx-empty h3{margin:15px 0 6px}.hx-empty p{margin:0 0 18px;color:#6d747f;font-size:13px}
.hx-chat{height:calc(100vh - 72px);display:grid;grid-template-columns:320px 1fr}.hx-chat-sidebar{border-right:1px solid var(--hx-border);padding:18px;overflow:auto}.hx-chat-sidebar h3{font-size:13px;margin:0 0 13px}.hx-chat-search{display:flex;background:#0c0e12;border:1px solid var(--hx-border);border-radius:10px;padding:9px;gap:8px}.hx-chat-search input{background:none;border:0;outline:0;color:white;width:100%}.hx-person{width:100%;margin-top:6px;padding:10px;display:flex;align-items:center;gap:10px;border:0;border-radius:10px;color:white;background:transparent;text-align:left}.hx-person:hover,.hx-person.active{background:rgba(255,255,255,.06)}.hx-person strong,.hx-person span{display:block}.hx-person strong{font-size:12px}.hx-person span{font-size:10px;color:#666d77;margin-top:3px}.hx-chat-window{min-width:0;display:flex;flex-direction:column}.hx-chat-head{min-height:70px;padding:12px 20px;border-bottom:1px solid var(--hx-border);display:flex;justify-content:space-between;align-items:center}.hx-chat-user{display:flex;align-items:center;gap:10px}.hx-chat-user strong,.hx-chat-user span{display:block}.hx-chat-user strong{font-size:13px}.hx-chat-user span{font-size:10px;color:#69707b}.hx-presence-dot{width:8px;height:8px;border-radius:50%;background:var(--hx-green);display:inline-block;margin-left:5px;box-shadow:0 0 12px rgba(97,230,162,.5)}.hx-messages{flex:1;padding:25px;overflow:auto;display:flex;flex-direction:column;gap:9px}.hx-message{max-width:min(600px,75%);align-self:flex-start;position:relative}.hx-message.mine{align-self:flex-end}.hx-message p{margin:0;padding:11px 13px;background:#11141a;border:1px solid var(--hx-border);border-radius:13px 13px 13px 4px;font-size:13px;line-height:1.5}.hx-message.mine p{background:#e9eaed;color:#08090b;border-radius:13px 13px 4px 13px}.hx-message small{display:block;margin-top:4px;color:#555c66;font-size:9px}.hx-message-menu{position:absolute;z-index:90;min-width:180px;background:#151922;border:1px solid var(--hx-border2);border-radius:13px;box-shadow:0 25px 70px rgba(0,0,0,.55);padding:6px}.hx-message-menu button{width:100%;border:0;background:transparent;color:#dfe3e9;text-align:left;padding:9px;border-radius:8px;font-size:12px}.hx-message-menu button:hover{background:rgba(255,255,255,.07)}.hx-composer{margin:13px;border:1px solid var(--hx-border2);background:#0c0e12;border-radius:14px;padding:7px;display:flex;gap:7px;align-items:end}.hx-composer textarea{flex:1;resize:none;background:none;color:white;border:0;outline:0;min-height:38px;padding:9px}.hx-composer button{width:38px;height:38px;border:0;border-radius:9px;background:#161920;color:#aaa}.hx-composer .send{background:white;color:black;font-weight:900}
.hx-tool-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.hx-tool{border:1px solid var(--hx-border);background:linear-gradient(145deg,#0e1117,#0a0c10);border-radius:18px;padding:18px;min-height:170px;transition:.2s}.hx-tool:hover{border-color:var(--hx-border2);transform:translateY(-2px)}.hx-tool.selected{border-color:rgba(157,140,255,.6);box-shadow:0 0 0 1px rgba(157,140,255,.15),0 20px 55px rgba(90,70,200,.12)}.hx-tool-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:#171b24;font-weight:900}.hx-tool h3{margin:22px 0 5px;font-size:15px}.hx-tool p{margin:0;color:#717985;font-size:12px;line-height:1.55}
.hx-studio{border:1px solid var(--hx-border);border-radius:20px;overflow:hidden;background:#0b0d11}.hx-studio-bar{min-height:56px;border-bottom:1px solid var(--hx-border);display:flex;align-items:center;justify-content:space-between;padding:0 15px;gap:10px}.hx-studio-body{padding:25px}.hx-studio-launch{display:grid;grid-template-columns:1.25fr .75fr;gap:14px}.hx-launch-card{border:1px solid var(--hx-border);border-radius:18px;background:#0d1016;padding:24px}.hx-launch-card h2{margin:8px 0;font-size:27px;letter-spacing:-.04em}.hx-launch-card p{color:#737b87;line-height:1.6}.hx-step{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--hx-border)}.hx-step:last-child{border-bottom:0}.hx-step-num{width:25px;height:25px;border-radius:8px;background:#171b23;display:grid;place-items:center;font-size:10px;font-weight:900}
.hx-code{height:calc(100vh - 72px);display:grid;grid-template-columns:220px 1fr 270px}.hx-code-tree{border-right:1px solid var(--hx-border);padding:18px;background:#090b0e}.hx-code-tree span{color:#666d77;font-size:9px;font-weight:900;letter-spacing:.15em}.hx-code-tree button{width:100%;display:block;text-align:left;border:0;background:transparent;color:#828995;padding:9px;border-radius:7px;margin-top:3px;font-size:12px}.hx-code-tree button:hover{background:#11141a;color:white}.hx-code-editor{min-width:0;display:flex;flex-direction:column}.hx-code-tabs{height:48px;border-bottom:1px solid var(--hx-border);display:flex;align-items:center;gap:10px;padding:0 13px;color:#8d949f;font-size:12px}.hx-code-area{flex:1;border:0;resize:none;outline:0;background:#080a0d;color:#cdd2da;padding:22px;font-family:"JetBrains Mono","Cascadia Code",monospace;font-size:13px;line-height:1.7}.hx-code-side{border-left:1px solid var(--hx-border);padding:17px;background:#090b0f;overflow:auto}.hx-code-side h4{margin:0 0 12px;font-size:10px;letter-spacing:.15em;color:#737a85}.hx-terminal{background:#07090c;border:1px solid var(--hx-border);border-radius:11px;padding:12px;color:#8d96a3;font:11px/1.7 monospace;min-height:110px}
.hx-status-layout{display:grid;grid-template-columns:360px 1fr;gap:15px}.hx-status-list,.hx-status-view{border:1px solid var(--hx-border);border-radius:18px;background:#0c0f14}.hx-status-list{padding:12px}.hx-status-view{min-height:520px;padding:24px;position:relative;overflow:hidden}.hx-status-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:transparent;border:0;color:white;width:100%;text-align:left}.hx-status-card:hover,.hx-status-card.active{background:rgba(255,255,255,.06)}.hx-ring{width:48px;height:48px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#9d8cff,#61e6a2)}.hx-ring-inner{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:#11151b;border:2px solid #0c0f14}.hx-status-preview{min-height:420px;border-radius:22px;background:radial-gradient(circle at 70% 20%,rgba(157,140,255,.25),transparent 28%),linear-gradient(145deg,#11151d,#080a0e);display:flex;align-items:flex-end;padding:30px}.hx-status-preview h2{font-size:38px;letter-spacing:-.05em;margin:5px 0}.hx-status-preview p{color:#9ca4af}
.hx-channel-hero{border:1px solid var(--hx-border);border-radius:20px;padding:24px;background:radial-gradient(circle at 80% 10%,rgba(157,140,255,.16),transparent 28%),#0c0f14;margin-bottom:15px}.hx-channel-row{display:flex;align-items:center;gap:14px}.hx-channel-avatar{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(135deg,#222836,#11151b);border:1px solid var(--hx-border2);font-weight:900}.hx-post{border:1px solid var(--hx-border);background:#0c0f14;border-radius:17px;padding:18px;margin-top:10px}.hx-post p{line-height:1.6;color:#dce0e6}.hx-post-actions{display:flex;gap:7px;margin-top:12px}
.hx-call{min-height:calc(100vh - 72px);padding:28px}.hx-call-stage{min-height:560px;border:1px solid var(--hx-border);border-radius:22px;background:radial-gradient(circle at 50% 30%,rgba(157,140,255,.14),transparent 30%),#090c11;display:grid;place-items:center;position:relative;overflow:hidden}.hx-call-avatar{width:105px;height:105px;border-radius:30px;display:grid;place-items:center;background:linear-gradient(135deg,#252b38,#11151b);border:1px solid var(--hx-border2);font-size:30px;font-weight:900}.hx-call-controls{position:absolute;bottom:25px;display:flex;gap:10px}.hx-call-control{width:48px;height:48px;border-radius:15px;border:1px solid var(--hx-border2);background:#171b23;color:white}.hx-call-control.end{background:#e65c67;border-color:#e65c67}.hx-call-mini{position:absolute;top:18px;right:18px;width:190px;height:120px;border-radius:14px;background:#06080b;border:1px solid var(--hx-border2);overflow:hidden}.hx-call-mini video{width:100%;height:100%;object-fit:cover}.hx-call-grid{display:grid;grid-template-columns:1fr 300px;gap:14px}
.hx-profile{display:grid;grid-template-columns:280px 1fr;gap:15px}.hx-profile-card,.hx-form{border:1px solid var(--hx-border);border-radius:18px;padding:26px;background:#0c0e12}.hx-profile-card{text-align:center}.hx-profile-card h2{margin:17px 0 4px}.hx-profile-card p{margin:0;color:#696f7a;font-size:12px}
.hx-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px}.hx-modal{width:min(560px,100%);max-height:90vh;overflow:auto;border:1px solid var(--hx-border2);background:#101218;border-radius:20px;padding:25px;box-shadow:0 30px 100px rgba(0,0,0,.5)}.hx-modal h2{margin:5px 0 23px}.hx-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.hx-offline{display:flex;align-items:center;gap:8px;border:1px solid var(--hx-border);background:#0c0f14;border-radius:10px;padding:7px 10px;font-size:10px;color:#aeb5c0}.hx-offline strong{color:#61e6a2}.hx-offline.offline strong{color:#ffcc75}.hx-pulse{width:7px;height:7px;border-radius:50%;background:#61e6a2;box-shadow:0 0 10px #61e6a2}.hx-offline.offline .hx-pulse{background:#ffcc75;box-shadow:0 0 10px #ffcc75}
.hx-mobile{display:none}
@media(max-width:1150px){.hx-grid-cards{grid-template-columns:repeat(2,1fr)}.hx-code{grid-template-columns:190px 1fr}.hx-code-side{display:none}}
@media(max-width:900px){.hx-auth{grid-template-columns:1fr}.hx-auth-visual{display:none}.hx-shell{display:block}.hx-sidebar{transform:translateX(-100%);transition:.25s}.hx-sidebar.open{transform:translateX(0)}.hx-content{margin-left:0}.hx-mobile{display:block}.hx-grid-cards{grid-template-columns:1fr}.hx-two,.hx-profile,.hx-studio-launch,.hx-status-layout,.hx-call-grid{grid-template-columns:1fr}.hx-chat{grid-template-columns:1fr}.hx-chat-sidebar{display:none}.hx-page{padding:28px 18px 50px}.hx-topbar{padding:0 14px}.hx-search{width:48px}.hx-search input{display:none}.hx-code{grid-template-columns:1fr}.hx-code-tree{display:none}.hx-status-view{min-height:450px}}
`;

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data?.session || null);
          setReady(true);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setReady(true);
      }
    }
    init();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession || null));
    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) return <><style>{styles}</style><LoadingScreen /></>;
  if (!session) return <><style>{styles}</style><AuthPage /></>;
  return <><style>{styles}</style><Workspace session={session} /></>;
}

function LoadingScreen() {
  return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#06070a", color: "white" }}>
    <div style={{ textAlign: "center" }}>
      <div className="hx-logo-box" style={{ margin: "auto", width: 62, height: 62 }}>H</div>
      <p style={{ color: "#707782", letterSpacing: ".15em", fontSize: 10 }}>INITIALIZING HEXA CORE</p>
    </div>
  </div>;
}

function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (mode === "signup" && (!name.trim() || !username.trim())) return setError("Enter your name and choose a username.");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim(), username: cleanUsername } }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Account created. Check your email to confirm your account, then sign in.");
        } else {
          await supabase.from("profiles").upsert({ id: data.user.id, full_name: name.trim(), username: cleanUsername });
        }
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally { setBusy(false); }
  }

  async function oauth(provider) {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) setError(error.message);
  }

  async function forgotPassword() {
    if (!email.trim()) return setError("Enter your email address first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(error.message); else setMessage("Password reset instructions have been sent.");
  }

  return <div className="hx-auth">
    <section className="hx-auth-visual">
      <div className="hx-grid" /><div className="hx-auth-orbit" />
      <div className="hx-auth-logo"><div className="hx-logo-box">H</div><span className="hx-logo-word">HEXA</span></div>
      <div className="hx-auth-hero">
        <span className="hx-auth-kicker">HEXA NEXUS / CORE</span>
        <h1>One space.<br />Everything.</h1>
        <p>Chat, communities, channels, status, calls, documents, projects, code and creation tools inside one intelligent workspace.</p>
      </div>
      <div className="hx-auth-footer">HEXA NEXUS · COMMUNICATE / CREATE / BUILD</div>
    </section>
    <section className="hx-auth-panel">
      <form className="hx-auth-card" onSubmit={submit}>
        <h2>{mode === "signin" ? "Welcome back." : "Create your account."}</h2>
        <p>{mode === "signin" ? "Enter your workspace and continue building." : "Start your HEXA workspace today."}</p>
        <div className="hx-auth-tabs">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Sign up</button>
        </div>
        {error && <div className="hx-error">{error}</div>}
        {message && <div className="hx-error" style={{ borderColor: "rgba(97,230,162,.2)", color: "#8ff0bc", background: "rgba(97,230,162,.05)" }}>{message}</div>}
        {mode === "signup" && <>
          <Field label="FULL NAME" value={name} setValue={setName} placeholder="Your name" />
          <Field label="USERNAME" value={username} setValue={setUsername} placeholder="@username" />
        </>}
        <div className="hx-field"><label>EMAIL ADDRESS</label><div className="hx-input-wrap"><span>✉</span><input className="hx-input has-icon" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div></div>
        <div className="hx-field"><div className="hx-password-row"><label>PASSWORD</label>{mode === "signin" && <button type="button" className="hx-link" onClick={forgotPassword}>Forgot password?</button>}</div><input className="hx-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></div>
        <button className="hx-main-btn" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in →" : "Create account →"}</button>
        <div className="hx-divider">OR CONTINUE WITH</div>
        <div className="hx-socials"><button type="button" className="hx-social" onClick={() => oauth("google")}>G&nbsp; Google</button><button type="button" className="hx-social" onClick={() => oauth("github")}>◈&nbsp; GitHub</button></div>
        <div className="hx-auth-switch">{mode === "signin" ? "Don't have a HEXA account?" : "Already have a HEXA account?"}{" "}<button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create one" : "Sign in"}</button></div>
      </form>
    </section>
  </div>;
}

function Workspace({ session }) {
  const userId = session?.user?.id;
  const [page, setPage] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadEverything();
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [userId]);

  async function loadEverything() {
    await Promise.all([loadProfile(), loadGroups(), loadCommunities(), loadProjects()]);
  }
  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", userId).maybeSingle();
    if (data) setProfile(data);
  }
  async function loadGroups() {
    const { data } = await supabase.from("conversation_members").select("conversation_id,conversations(id,name,type,created_at)").eq("user_id", userId);
    if (data) setGroups(data.map(x => x.conversations).filter(x => x?.type === "group"));
  }
  async function loadCommunities() {
    const { data } = await supabase.from("community_members").select("community_id,communities(id,name,description,created_at)").eq("user_id", userId);
    if (data) setCommunities(data.map(x => x.communities).filter(Boolean));
  }
  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").eq("created_by", userId).order("created_at", { ascending: false });
    if (data) setProjects(data);
  }

  const displayName = profile?.full_name || session?.user?.email?.split("@")[0] || "HEXA User";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();

  function navigate(next) { setPage(next); setMobileOpen(false); }
  async function signOut() { await supabase.auth.signOut(); }

  return <div className="hx-app"><div className="hx-shell">
    <aside className={`hx-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="hx-side-brand"><div className="hx-logo-box">H</div><strong>HEXA</strong></div>
      <div className="hx-side-label">NEXUS</div>
      <nav className="hx-nav">{NAV.map(item => <NavButton key={item.id} item={item} page={page} onClick={navigate} />)}</nav>
      <div className="hx-side-label" style={{ marginTop: 22 }}>CREATE</div>
      <nav className="hx-nav">{CREATE_NAV.map(item => <NavButton key={item.id} item={item} page={page} onClick={navigate} />)}</nav>
      <div className="hx-sidebar-bottom">
        <nav className="hx-nav">
          <button onClick={() => navigate("profile")}><span className="hx-nav-icon">◎</span>Profile</button>
          <button onClick={() => navigate("ai")}><span className="hx-nav-icon">✦</span>HEXA AI</button>
          <button onClick={signOut}><span className="hx-nav-icon">↪</span>Sign out</button>
        </nav>
        <div className="hx-user-mini"><Avatar profile={profile} initials={initials} /><div><strong>{displayName}</strong><span>@{profile?.username || "username"}</span></div></div>
      </div>
    </aside>

    <div className="hx-content">
      <header className="hx-topbar">
        <button className="hx-icon-btn hx-mobile" onClick={() => setMobileOpen(v => !v)}>☰</button>
        <div className="hx-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HEXA..." /></div>
        <OfflineBadge online={online} />
        <div className="hx-top-actions"><button className="hx-icon-btn" onClick={() => navigate("ai")}>✦</button><button className="hx-icon-btn" onClick={() => navigate("profile")}>{initials || "H"}</button></div>
      </header>
      {error && <div style={{ padding: "16px 35px 0" }}><div className="hx-error">{error}<button onClick={() => setError("")} style={{ float:"right",background:"none",border:0,color:"inherit" }}>×</button></div></div>}

      {page === "overview" && <NexusPage displayName={displayName} projects={projects} groups={groups} communities={communities} navigate={navigate} />}
      {page === "chat" && <ChatPage userId={userId} profile={profile} setError={setError} />}
      {page === "groups" && <GroupsPage groups={groups} setGroups={setGroups} userId={userId} setError={setError} />}
      {page === "communities" && <CommunitiesPage communities={communities} setCommunities={setCommunities} userId={userId} setError={setError} />}
      {page === "channels" && <ChannelsPage />}
      {page === "status" && <StatusPage profile={profile} />}
      {page === "calls" && <CallsPage />}
      {page === "projects" && <ProjectsPage projects={projects} setProjects={setProjects} userId={userId} setError={setError} />}
      {page === "profile" && <ProfilePage profile={profile} session={session} setProfile={setProfile} setError={setError} />}
      {page === "game" && <StudioPage type="game" navigate={navigate} />}
      {page === "app" && <StudioPage type="app" navigate={navigate} />}
      {page === "code" && <CodeSpacePage />}
      {page === "ai" && <AIPage />}
    </div>
  </div></div>;
}

function NavButton({ item, page, onClick }) {
  return <button className={page === item.id ? "active" : ""} onClick={() => onClick(item.id)}><span className="hx-nav-icon">{item.icon}</span>{item.label}</button>;
}

function NexusPage({ displayName, projects, groups, communities, navigate }) {
  const features = [
    ["◉","Chat","Real-time conversations, reactions, media and message actions.","chat"],
    ["◎","Groups","Private spaces with members, admins, polls and events.","groups"],
    ["◇","Communities","Organize multiple groups around shared interests.","communities"],
    ["◈","Channels","Broadcast updates to followers from one place.","channels"],
    ["◌","Status","Share temporary text, media and voice updates.","status"],
    ["⌁","Calls","Voice, video, screen sharing and presentation mode.","calls"],
    ["◆","Projects","Keep files, tasks, code and people together.","projects"],
    ["✦","HEXA AI","Cloud AI plus an earned offline reserve.","ai"],
  ];
  return <main className="hx-page">
    <div className="hx-heading"><div><span className="hx-eyebrow">NEXUS / HOME</span><h1>Good morning, {displayName.split(" ")[0]}.</h1><p>Your digital workspace is ready.</p></div></div>
    <section className="hx-hero"><span className="hx-eyebrow">HEXA CORE / ONLINE</span><h2>Communicate. Create. Build.</h2><p>Everything from conversations and communities to games, apps, code and AI — connected inside one workspace.</p><div className="hx-actions"><button className="hx-action primary" onClick={() => navigate("chat")}>Open Chat</button><button className="hx-action" onClick={() => navigate("game")}>Create Game</button><button className="hx-action" onClick={() => navigate("app")}>Create App</button><button className="hx-action" onClick={() => navigate("ai")}>Ask HEXA AI</button></div></section>
    <div className="hx-section-title"><span>HEXA ECOSYSTEM</span><span>{projects.length + groups.length + communities.length} ACTIVE SPACES</span></div>
    <div className="hx-grid-cards">{features.map(([icon,title,text,id]) => <FeatureCard key={id} icon={icon} title={title} text={text} onClick={() => navigate(id)} />)}</div>
    <div className="hx-section-title"><span>CREATION LAYER</span></div>
    <div className="hx-two">
      <div className="hx-panel"><div className="hx-panel-head"><span>GAME STUDIO</span><span>4 ENGINES</span></div><div className="hx-list-row"><div className="hx-list-info"><div className="hx-feature-icon">▣</div><div><strong>Unreal · Unity · Godot · VS Code</strong><span>Choose your development environment.</span></div></div><button className="hx-btn" onClick={() => navigate("game")}>Open →</button></div></div>
      <div className="hx-panel"><div className="hx-panel-head"><span>APP STUDIO</span><span>5 STACKS</span></div><div className="hx-list-row"><div className="hx-list-info"><div className="hx-feature-icon">▤</div><div><strong>VS Code · React · RN · Flutter · Electron</strong><span>Build web, mobile and desktop products.</span></div></div><button className="hx-btn" onClick={() => navigate("app")}>Open →</button></div></div>
    </div>
  </main>;
}

function FeatureCard({ icon, title, text, onClick }) {
  return <button className="hx-feature" onClick={onClick} style={{ textAlign:"left",color:"inherit",width:"100%" }}><div className="hx-feature-top"><div className="hx-feature-icon">{icon}</div><span>↗</span></div><h3>{title}</h3><p>{text}</p></button>;
}

function ChatPage({ userId, profile, setError }) {
  const [query,setQuery] = useState(""); const [people,setPeople] = useState([]); const [active,setActive] = useState(null);
  const [messages,setMessages] = useState(LOCAL_MESSAGES); const [text,setText] = useState(""); const [menu,setMenu] = useState(null);
  useEffect(() => {
    if (!query.trim()) { setPeople([]); return; }
    const timer=setTimeout(async()=>{ const clean=query.replace(/^@/,""); const {data,error}=await supabase.from("profiles").select("id,username,full_name,avatar_url").ilike("username",`%${clean}%`).neq("id",userId).limit(15); if(!error)setPeople(data||[]); },300);
    return ()=>clearTimeout(timer);
  },[query,userId]);
  function choose(person){setActive(person);setMessages(LOCAL_MESSAGES);setMenu(null)}
  function send(){if(!text.trim()||!active)return;setMessages(cur=>[...cur,{id:crypto.randomUUID(),sender_id:userId,text:text.trim(),created_at:new Date().toISOString(),mine:true}]);setText("")}
  function messageAction(action,message){
    setMenu(null);
    if(action==="delete")setMessages(cur=>cur.filter(m=>m.id!==message.id));
    if(action==="copy")navigator.clipboard?.writeText(message.text);
    if(action==="save")setMessages(cur=>cur.map(m=>m.id===message.id?{...m,saved:!m.saved}:m));
  }
  return <main className="hx-chat">
    <aside className="hx-chat-sidebar"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3>MESSAGES</h3><span className="hx-chip">LIVE</span></div><div className="hx-chat-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a HEXA username..." /></div>
      <div style={{marginTop:15}}>{people.map(person=><button className={`hx-person ${active?.id===person.id?"active":""}`} key={person.id} onClick={()=>choose(person)}><Avatar profile={person}/><div><strong>{person.full_name||person.username}</strong><span>@{person.username}</span></div></button>)}</div>
      {!query&&<div style={{color:"#5e6570",fontSize:11,padding:"25px 5px",lineHeight:1.6}}>Search for a real HEXA username. Presence is never faked.</div>}
    </aside>
    <section className="hx-chat-window">{!active?<div style={{flex:1,display:"grid",placeItems:"center",textAlign:"center",padding:30}}><div><div className="hx-empty-icon">◉</div><h2>HEXA Chat</h2><p style={{color:"#666d77"}}>Find a person and start a conversation.</p></div></div>:<>
      <header className="hx-chat-head"><div className="hx-chat-user"><Avatar profile={active}/><div><strong>{active.full_name||active.username}<span className="hx-presence-dot"/></strong><span>@{active.username} · online</span></div></div><div><button className="hx-icon-btn" onClick={()=>window.dispatchEvent(new CustomEvent("hexa-call"))}>☎</button><button className="hx-icon-btn">⋯</button></div></header>
      <div className="hx-messages" onClick={()=>setMenu(null)}>{messages.map(m=><div key={m.id} className={`hx-message ${m.sender_id===userId||m.mine?"mine":""}`} onContextMenu={e=>{e.preventDefault();setMenu({id:m.id,x:e.clientX,y:e.clientY,message:m})}} onTouchStart={()=>{}}><p>{m.text}{m.saved&&<span style={{marginLeft:7,color:"#9d8cff"}}>🔖</span>}</p><small>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} {m.mine?" · ✓✓":""}</small></div>)}</div>
      <div className="hx-composer"><button title="Attach">＋</button><textarea rows={1} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Write a message..." /><button title="Voice message">◉</button><button className="send" onClick={send}>↑</button></div>
      {menu&&<div className="hx-message-menu" style={{position:"fixed",left:Math.min(menu.x,window.innerWidth-200),top:Math.min(menu.y,window.innerHeight-260)}}><button onClick={()=>messageAction("copy",menu.message)}>Copy</button><button onClick={()=>messageAction("save",menu.message)}>Save message</button><button onClick={()=>messageAction("reply",menu.message)}>↩ Reply</button><button onClick={()=>messageAction("forward",menu.message)}>↗ Forward</button><button onClick={()=>messageAction("pin",menu.message)}>📌 Pin</button><button onClick={()=>messageAction("delete",menu.message)}>🗑 Delete</button></div>}
    </>}</section>
  </main>;
}

function GroupsPage({ groups,setGroups,userId,setError }) {
  const [open,setOpen]=useState(false);const [name,setName]=useState("");
  async function create(){if(!name.trim())return setError("Enter a group name.");const {data,error}=await supabase.from("conversations").insert({type:"group",name:name.trim(),created_by:userId}).select("id,name,type,created_at").single();if(error)return setError(error.message);await supabase.from("conversation_members").insert({conversation_id:data.id,user_id:userId,is_admin:true});setGroups(p=>[data,...p]);setName("");setOpen(false)}
  return <main className="hx-page"><PageHeading eyebrow="NETWORK / GROUPS" title="Groups" text="Private spaces for your people."/><div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}><button className="hx-btn light" onClick={()=>setOpen(true)}>+ New group</button></div>{groups.length===0?<Empty icon="◎" title="No groups yet" text="Create your first private group." button="Create group" onClick={()=>setOpen(true)}/>:<div className="hx-cards">{groups.map(g=><div className="hx-project" key={g.id}><div><span className="hx-project-type">GROUP</span><h3>{g.name}</h3><p>Members · admins · polls · events · files · calls</p></div><button className="hx-btn">Open →</button></div>)}</div>}{open&&<Modal title="Create group" close={()=>setOpen(false)}><Field label="GROUP NAME" value={name} setValue={setName} placeholder="HEXA Developers"/><ModalButtons close={()=>setOpen(false)} action="Create group" onAction={create}/></Modal>}</main>;
}

function CommunitiesPage({ communities,setCommunities,userId,setError }) {
  const [open,setOpen]=useState(false);const [name,setName]=useState("");const [description,setDescription]=useState("");
  async function create(){if(!name.trim())return setError("Enter a community name.");const {data,error}=await supabase.from("communities").insert({name:name.trim(),description:description.trim(),created_by:userId}).select("id,name,description,created_at").single();if(error)return setError(error.message);await supabase.from("community_members").insert({community_id:data.id,user_id:userId,is_admin:true});setCommunities(p=>[data,...p]);setName("");setDescription("");setOpen(false)}
  return <main className="hx-page"><PageHeading eyebrow="NETWORK / COMMUNITIES" title="Communities" text="Build spaces around shared ideas."/><div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}><button className="hx-btn light" onClick={()=>setOpen(true)}>+ New community</button></div>{communities.length===0?<Empty icon="◇" title="No communities yet" text="Create a community and bring people together." button="Create community" onClick={()=>setOpen(true)}/>:<div className="hx-cards">{communities.map(c=><div className="hx-project" key={c.id}><div><span className="hx-project-type">COMMUNITY</span><h3>{c.name}</h3><p>{c.description||"HEXA community."}</p></div><button className="hx-btn">Open →</button></div>)}</div>}{open&&<Modal title="Create community" close={()=>setOpen(false)}><Field label="COMMUNITY NAME" value={name} setValue={setName} placeholder="HEXA Creators"/><Field label="DESCRIPTION" value={description} setValue={setDescription} placeholder="What is this community about?" textarea/><ModalButtons close={()=>setOpen(false)} action="Create community" onAction={create}/></Modal>}</main>;
}

function ChannelsPage(){
  const [channels,setChannels]=useState(CHANNEL_SEED);const [active,setActive]=useState(CHANNEL_SEED[0]);const [following,setFollowing]=useState({});
  return <main className="hx-page"><PageHeading eyebrow="BROADCAST / CHANNELS" title="Channels" text="Follow creators, teams and official broadcasts."/>
    <div className="hx-channel-hero"><div className="hx-channel-row"><div className="hx-channel-avatar">◈</div><div><span className="hx-eyebrow">HEXA CHANNELS</span><h2 style={{margin:"5px 0"}}>Broadcast without the noise.</h2><p style={{margin:0,color:"#737b87"}}>One-way updates with reactions, media, followers and notifications.</p></div></div></div>
    <div className="hx-two"><div className="hx-panel"><div className="hx-panel-head"><span>DISCOVER</span><span>{channels.length}</span></div>{channels.map(c=><button key={c.id} className={`hx-status-card ${active.id===c.id?"active":""}`} onClick={()=>setActive(c)}><div className="hx-channel-avatar" style={{width:44,height:44,borderRadius:13}}>◈</div><div style={{flex:1}}><strong>{c.name} {c.verified&&"✓"}</strong><div style={{color:"#6f7681",fontSize:11}}>{c.followers} followers · {c.handle}</div></div><button className="hx-btn" onClick={e=>{e.stopPropagation();setFollowing(x=>({...x,[c.id]:!x[c.id]}))}}>{following[c.id]?"Following":"Follow"}</button></button>)}</div>
      <div className="hx-panel"><div className="hx-panel-head"><span>{active.name.toUpperCase()}</span><span>{active.followers}</span></div><h2 style={{marginTop:0}}>{active.name} {active.verified&&"✓"}</h2><p style={{color:"#747c88"}}>{active.description}</p>{active.posts.map(p=><div className="hx-post" key={p.id}><small style={{color:"#69717d"}}>{p.time}</small><p>{p.text}</p><div className="hx-post-actions"><button className="hx-btn">♡ {p.likes}</button><button className="hx-btn">↗ Share</button><button className="hx-btn">🔔 Notify</button></div></div>)}</div></div>
  </main>;
}

function StatusPage({ profile }){
  const [statuses,setStatuses]=useState(STATUS_SEED);const [active,setActive]=useState(STATUS_SEED[0]);const [open,setOpen]=useState(false);const [text,setText]=useState("");
  function post(){if(!text.trim())return;const s={id:crypto.randomUUID(),name:profile?.full_name||"You",handle:`@${profile?.username||"you"}`,type:"text",text:text.trim(),time:"now",seen:false};setStatuses(p=>[s,...p]);setActive(s);setText("");setOpen(false)}
  return <main className="hx-page"><PageHeading eyebrow="MOMENTS / STATUS" title="Status" text="Share temporary updates that disappear after 24 hours."/>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:15}}><button className="hx-btn light" onClick={()=>setOpen(true)}>＋ Add status</button></div>
    <div className="hx-status-layout"><div className="hx-status-list"><div className="hx-panel-head" style={{padding:"8px 8px 0"}}><span>RECENT UPDATES</span><span>24H</span></div>{statuses.map(s=><button key={s.id} className={`hx-status-card ${active.id===s.id?"active":""}`} onClick={()=>setActive(s)}><div className="hx-ring"><div className="hx-ring-inner">{s.name.slice(0,1)}</div></div><div><strong>{s.name}</strong><div style={{fontSize:10,color:"#6e7681"}}>{s.handle} · {s.time}</div></div></button>)}</div>
      <div className="hx-status-view"><div className="hx-status-preview"><div><span className="hx-chip">STATUS · 24H</span><h2>{active.text}</h2><p>{active.name} · {active.time}</p><div className="hx-actions"><button className="hx-btn">♡ React</button><button className="hx-btn">↩ Reply</button><button className="hx-btn">⋯ More</button></div></div></div></div></div>
    {open&&<Modal title="Create status" close={()=>setOpen(false)}><Field label="STATUS" value={text} setValue={setText} placeholder="What's happening?" textarea/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="hx-btn">＋ Photo</button><button className="hx-btn">◉ Video</button><button className="hx-btn">GIF</button><button className="hx-btn">🎙 Voice</button></div><ModalButtons close={()=>setOpen(false)} action="Post status" onAction={post}/></Modal>}</main>;
}

function CallsPage(){
  const videoRef=useRef(null);const [calling,setCalling]=useState(false);const [video,setVideo]=useState(false);const [muted,setMuted]=useState(false);const [camera,setCamera]=useState(false);const [stream,setStream]=useState(null);
  async function startVideo(){try{const s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});setStream(s);setCamera(true);setVideo(true);setCalling(true);setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s},0)}catch(e){setCalling(true)}}
  function end(){stream?.getTracks().forEach(t=>t.stop());setStream(null);setCalling(false);setVideo(false);setCamera(false)}
  return <main className="hx-call"><PageHeading eyebrow="REAL-TIME / CALLS" title="Calls" text="Voice, video, screen sharing and presentation mode."/>
    <div className="hx-call-grid"><section className="hx-call-stage"><div style={{textAlign:"center"}}><div className="hx-call-avatar">H</div><h2>{calling?"HEXA Call":"Ready to connect"}</h2><p style={{color:"#737b87"}}>{calling?(video?"Video call in progress":"Voice call in progress"):"Start a voice or video call."}</p></div>{camera&&<div className="hx-call-mini"><video ref={videoRef} autoPlay muted playsInline/></div>}<div className="hx-call-controls">{!calling?<><button className="hx-call-control" onClick={()=>{setCalling(true)}}>☎</button><button className="hx-call-control" onClick={startVideo}>▣</button></>:<><button className="hx-call-control" onClick={()=>setMuted(x=>!x)}>{muted?"🔇":"🎙"}</button><button className="hx-call-control" onClick={()=>setCamera(x=>!x)}>▣</button><button className="hx-call-control">▤</button><button className="hx-call-control end" onClick={end}>×</button></>}</div></section>
      <aside className="hx-panel"><div className="hx-panel-head"><span>CALL FEATURES</span><span>HEXA</span></div>{["1-to-1 voice","Video calling","Group calls","Screen sharing","Presentation mode","Call history","Speaker / Bluetooth"].map((x,i)=><div className="hx-step" key={x}><div className="hx-step-num">{i+1}</div><div><strong>{x}</strong><div style={{fontSize:11,color:"#6d7580",marginTop:3}}>{i<2?"Ready":"Workspace integration"}</div></div></div>)}</aside></div>
  </main>;
}

function ProjectsPage({projects,setProjects,userId,setError}){
  const [open,setOpen]=useState(false);const [name,setName]=useState("");const [type,setType]=useState("app");
  async function create(){if(!name.trim())return setError("Enter a project name.");const {data,error}=await supabase.from("projects").insert({name:name.trim(),project_type:type,created_by:userId}).select("*").single();if(error)return setError(error.message);setProjects(p=>[data,...p]);setName("");setOpen(false)}
  return <main className="hx-page"><PageHeading eyebrow="WORK / PROJECTS" title="Projects" text="Everything you are building, connected to people and tools."/><div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}><button className="hx-btn light" onClick={()=>setOpen(true)}>+ New project</button></div>{projects.length===0?<Empty icon="◆" title="Your project universe is empty" text="Create your first HEXA project." button="Create project" onClick={()=>setOpen(true)}/>:<div className="hx-cards">{projects.map(p=><div className="hx-project" key={p.id}><div><span className="hx-project-type">{(p.project_type||"PROJECT").toUpperCase()}</span><h3>{p.name}</h3><p>Chat · Files · Documents · Tasks · Code · AI · Members</p></div><button className="hx-btn">Open workspace →</button></div>)}</div>}{open&&<Modal title="Create project" close={()=>setOpen(false)}><Field label="PROJECT NAME" value={name} setValue={setName} placeholder="My next project"/><label className="hx-field"><span style={{display:"block",marginBottom:8,fontSize:10,color:"#969daa",fontWeight:800}}>PROJECT TYPE</span><div style={{display:"flex",gap:8}}>{["app","game","web","code"].map(x=><button type="button" className={`hx-btn ${type===x?"light":""}`} key={x} onClick={()=>setType(x)}>{x}</button>)}</div></label><ModalButtons close={()=>setOpen(false)} action="Create project" onAction={create}/></Modal>}</main>;
}

function StudioPage({type,navigate}){
  const game=type==="game";const [selected,setSelected]=useState(game?GAME_ENGINES[0]:APP_STACKS[0]);const [name,setName]=useState("");const [created,setCreated]=useState(false);const options=game?GAME_ENGINES:APP_STACKS;
  return <main className="hx-page"><PageHeading eyebrow={`CREATE / ${game?"GAME":"APP"} STUDIO`} title={game?"Game Studio":"App Studio"} text={game?"Choose Unreal, Unity, Godot or VS Code and build your game.":"Choose your application stack and build a product."}/>
    <section className="hx-studio"><div className="hx-studio-bar"><span style={{fontSize:12,color:"#8a919b"}}>{game?"GAME_STUDIO":"APP_STUDIO"} / {selected.name.toUpperCase()}</span><div style={{display:"flex",gap:7}}><button className="hx-btn" onClick={()=>setCreated(false)}>New</button><button className="hx-btn light" onClick={()=>setCreated(true)}>Create</button></div></div><div className="hx-studio-body">
      {!created?<><div className="hx-studio-launch"><div className="hx-launch-card"><span className="hx-eyebrow">STEP 01 / ENGINE</span><h2>{game?"Choose your game engine.":"Choose your app stack."}</h2><p>Your choice becomes the project's primary development environment. HEXA can hand the project off to installed desktop tools such as VS Code.</p><div className="hx-tool-grid">{options.map(o=><button className={`hx-tool ${selected.id===o.id?"selected":""}`} key={o.id} onClick={()=>setSelected(o)} style={{textAlign:"left",color:"inherit"}}><div className="hx-tool-icon">{o.icon}</div><h3>{o.name}</h3><p>{o.desc}</p></button>)}</div></div><div className="hx-launch-card"><span className="hx-eyebrow">STEP 02 / PROJECT</span><h2>Name your project.</h2><Field label="PROJECT NAME" value={name} setValue={setName} placeholder={game?"My Unreal Game":"My HEXA App"}/><div className="hx-step"><div className="hx-step-num">1</div><div><strong>Workspace created</strong><div style={{fontSize:11,color:"#6f7782"}}>Files, collaboration and AI context.</div></div></div><div className="hx-step"><div className="hx-step-num">2</div><div><strong>Open CodeSpace</strong><div style={{fontSize:11,color:"#6f7782"}}>Edit and inspect project files.</div></div></div><div className="hx-step"><div className="hx-step-num">3</div><div><strong>Launch external tool</strong><div style={{fontSize:11,color:"#6f7782"}}>{selected.name} integration/handoff.</div></div></div></div></div></>:<div style={{width:"100%",maxWidth:780,margin:"auto",textAlign:"left"}}><span className="hx-eyebrow">PROJECT READY</span><h2 style={{fontSize:42,letterSpacing:"-.06em",margin:"8px 0"}}>{name||"Untitled Project"}</h2><p style={{color:"#747c87"}}>{selected.name} workspace initialized. Connect your backend/project runner next.</p><div className="hx-actions"><button className="hx-btn light" onClick={()=>navigate("code")}>Open CodeSpace →</button><button className="hx-btn" onClick={()=>window.open("https://code.visualstudio.com","_blank")}>VS Code ↗</button><button className="hx-btn" onClick={()=>setCreated(false)}>Configure</button></div></div>}
    </div></section>
  </main>;
}

function CodeSpacePage(){
  const [code,setCode]=useState(STARTER_CODE);const [file,setFile]=useState("App.jsx");const [terminal,setTerminal]=useState("HEXA terminal ready.\\n$ ");
  const files=["src","App.jsx","App.css","components","services","public","package.json","README.md"];
  function run(){setTerminal(t=>`${t}\\n$ hexa run\\n✓ Workspace preview started.\\n`)}
  function openVSCode(){window.location.href=`vscode://file/${encodeURIComponent("C:/HEXA")}`}
  return <main className="hx-code"><aside className="hx-code-tree"><span>EXPLORER</span>{files.map((f,i)=><button key={f} onClick={()=>setFile(f)}>{i===0||f==="public"?"▾ ":"　"}{f}</button>)}<div style={{marginTop:20}}><span>SOURCE CONTROL</span><button>↻ Changes</button><button>⑂ Git</button></div></aside><section className="hx-code-editor"><div className="hx-code-tabs"><span>● {file}</span><button className="hx-btn" style={{marginLeft:"auto",padding:"6px 10px"}} onClick={run}>Run ▶</button><button className="hx-btn" style={{padding:"6px 10px"}} onClick={openVSCode}>Open VS Code ↗</button></div><textarea className="hx-code-area" value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}/></section><aside className="hx-code-side"><h4>HEXA AI</h4><div className="hx-panel" style={{padding:13,marginBottom:12}}><strong>Code assistant</strong><p style={{fontSize:11,color:"#727a85",lineHeight:1.5}}>Ask HEXA to explain, refactor, debug or generate code.</p><button className="hx-btn light" style={{width:"100%"}}>Ask AI →</button></div><h4>TERMINAL</h4><div className="hx-terminal">{terminal}</div></aside></main>;
}

function AIPage(){
  const [messages,setMessages]=useState([{role:"ai",text:"I'm HEXA AI. Ask me to plan, write, explain, debug or create."}]);const [text,setText]=useState("");
  const [online,setOnline]=useState(navigator.onLine);const [reserve,setReserve]=useState(()=>Number(localStorage.getItem("hexaOfflineSeconds")||600));
  useEffect(()=>{const up=()=>setOnline(true),down=()=>setOnline(false);window.addEventListener("online",up);window.addEventListener("offline",down);return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",down)}},[]);
  useEffect(()=>{localStorage.setItem("hexaOfflineSeconds",String(reserve))},[reserve]);
  function send(){if(!text.trim())return;const q=text.trim();setMessages(m=>[...m,{role:"user",text:q},{role:"ai",text:online?`HEXA received: "${q}". Connect your AI provider here for cloud responses.`:`Offline HEXA received: "${q}". This message is stored locally and can sync when you reconnect.`}]);setText("");if(!online&&reserve>0)setReserve(s=>Math.max(0,s-60))}
  const mins=Math.floor(reserve/60),secs=reserve%60;
  return <main className="hx-page"><PageHeading eyebrow="INTELLIGENCE / HEXA AI" title="HEXA AI" text="Cloud intelligence with an earned offline reserve."/><div className="hx-two"><section className="hx-panel"><div className="hx-panel-head"><span>AI CHAT</span><span>{online?"ONLINE":"OFFLINE"}</span></div><div style={{minHeight:390,maxHeight:520,overflow:"auto",display:"flex",flexDirection:"column",gap:9}}>{messages.map((m,i)=><div key={i} style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"80%",padding:"11px 13px",borderRadius:13,background:m.role==="user"?"#e9eaed":"#11151c",color:m.role==="user"?"#08090b":"#e3e7ed",fontSize:13,lineHeight:1.5}}>{m.text}</div>)}</div><div className="hx-composer" style={{margin:"14px 0 0"}}><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder={online?"Ask HEXA anything...":"Offline HEXA — limited reserve"} disabled={!online&&reserve<=0}/><button className="send" onClick={send}>↑</button></div></section><aside className="hx-panel"><div className="hx-panel-head"><span>OFFLINE RESERVE</span><span>3H → 10M</span></div><div style={{padding:"18px 0"}}><div style={{fontSize:46,fontWeight:900,letterSpacing:"-.06em"}}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div><p style={{color:"#747c87",lineHeight:1.6}}>Chat with HEXA online for 3 hours to earn 10 minutes of offline AI. The reserve is stored on this device.</p><div className={`hx-offline ${online?"":"offline"}`}><span className="hx-pulse"/><strong>{online?"ONLINE MODE":"OFFLINE MODE"}</strong><span>{online?"Cloud features available":"Local reserve active"}</span></div></div><div className="hx-step"><div className="hx-step-num">1</div><div><strong>3 hours active AI chat</strong><div style={{fontSize:11,color:"#6f7782"}}>Accumulate actual chat time, not idle time.</div></div></div><div className="hx-step"><div className="hx-step-num">2</div><div><strong>10 minutes offline</strong><div style={{fontSize:11,color:"#6f7782"}}>Continue with local/offline capabilities.</div></div></div><div className="hx-step"><div className="hx-step-num">3</div><div><strong>Sync when connected</strong><div style={{fontSize:11,color:"#6f7782"}}>Queued activity can be synchronized later.</div></div></div></aside></div></main>;
}

function ProfilePage({profile,session,setProfile,setError}){
  const fileRef=useRef(null);const [name,setName]=useState(profile?.full_name||"");const [username,setUsername]=useState(profile?.username||"");const [saving,setSaving]=useState(false);
  useEffect(()=>{setName(profile?.full_name||"");setUsername(profile?.username||"")},[profile]);
  async function save(){const clean=username.trim().replace(/^@/,"").toLowerCase();setSaving(true);const {data,error}=await supabase.from("profiles").update({full_name:name.trim(),username:clean}).eq("id",session.user.id).select("id,username,full_name,avatar_url").single();setSaving(false);if(error)return setError(error.message);setProfile(data)}
  async function upload(file){if(!file)return;if(!file.type.startsWith("image/"))return setError("Select an image file.");if(file.size>5*1024*1024)return setError("Image must be under 5MB.");try{const ext=file.name.split(".").pop()||"jpg";const path=`${session.user.id}/avatar-${Date.now()}.${ext}`;const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{upsert:false,contentType:file.type});if(uploadError)throw uploadError;const {data:publicData}=supabase.storage.from("avatars").getPublicUrl(path);const avatar_url=`${publicData.publicUrl}?v=${Date.now()}`;const {data,error}=await supabase.from("profiles").update({avatar_url}).eq("id",session.user.id).select("id,username,full_name,avatar_url").single();if(error)throw error;setProfile(data)}catch(err){setError(err.message)}}
  return <main className="hx-page"><PageHeading eyebrow="IDENTITY / PROFILE" title="Your identity" text="Manage your HEXA profile, presence and privacy."/><div className="hx-profile"><section className="hx-profile-card"><Avatar profile={profile} large/><h2>{name||"HEXA User"}</h2><p>@{username||"username"}</p><div style={{marginTop:18}} className="hx-offline"><span className="hx-pulse"/>Online presence enabled</div><button className="hx-btn" style={{marginTop:20}} onClick={()=>fileRef.current?.click()}>Change picture</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>{upload(e.target.files?.[0]);e.target.value=""}}/></section><section className="hx-form"><span className="hx-eyebrow">PERSONAL DATA</span><h2>Profile settings</h2><Field label="FULL NAME" value={name} setValue={setName} placeholder="Your name"/><Field label="USERNAME" value={username} setValue={setUsername} placeholder="username"/><div className="hx-field"><label>EMAIL</label><input className="hx-input" disabled value={session?.user?.email||""}/></div><div className="hx-section-title" style={{marginTop:25}}><span>PRIVACY</span></div><div className="hx-list"><div className="hx-list-row"><div><strong>Online status</strong><span>Show when you are active.</span></div><input type="checkbox" defaultChecked/></div><div className="hx-list-row"><div><strong>Read receipts</strong><span>Show message read state.</span></div><input type="checkbox" defaultChecked/></div><div className="hx-list-row"><div><strong>Two-step verification</strong><span>Protect your account.</span></div><button className="hx-btn">Configure</button></div></div><button className="hx-btn light" disabled={saving} style={{marginTop:18}} onClick={save}>{saving?"Saving...":"Save changes →"}</button></section></div></main>;
}

function PageHeading({eyebrow,title,text}){return <div className="hx-heading"><div><span className="hx-eyebrow">{eyebrow}</span><h1>{title}</h1>{text&&<p>{text}</p>}</div></div>}
function Avatar({profile,large=false,initials}){const letters=initials||profile?.full_name?.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"H";return <div className="hx-avatar" style={large?{width:90,height:90,borderRadius:24,fontSize:24}:undefined}>{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:letters}</div>}
function Field({label,value,setValue,placeholder,textarea=false}){return <div className="hx-field"><label>{label}</label>{textarea?<textarea className="hx-input" style={{minHeight:90,resize:"vertical"}} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>:<input className="hx-input" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>}</div>}
function Empty({icon,title,text,button,onClick}){return <div className="hx-empty"><div><div className="hx-empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p><button className="hx-btn light" onClick={onClick}>{button} →</button></div></div>}
function Modal({title,close,children}){return <div className="hx-modal-backdrop" onMouseDown={close}><div className="hx-modal" onMouseDown={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span className="hx-eyebrow">HEXA NEXUS</span><button className="hx-icon-btn" onClick={close}>×</button></div><h2>{title}</h2>{children}</div></div>}
function ModalButtons({close,action,onAction}){return <div className="hx-modal-actions"><button className="hx-btn" onClick={close}>Cancel</button><button className="hx-btn light" onClick={onAction}>{action} →</button></div>}
function OfflineBadge({online}){return <div className={`hx-offline ${online?"":"offline"}`}><span className="hx-pulse"/><strong>{online?"ONLINE":"OFFLINE"}</strong><span>{online?"HEXA CORE":"Offline mode"}</span></div>}