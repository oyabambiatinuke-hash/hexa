import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";

/* =========================================================
   HEXA NEXUS — RELEASE UI
   ========================================================= */

const NAV = [
  { id: "overview", icon: "⌂", label: "Nexus" },
  { id: "chat", icon: "◉", label: "Chat" },
  { id: "groups", icon: "◎", label: "Groups" },
  { id: "communities", icon: "◇", label: "Communities" },
  { id: "projects", icon: "◆", label: "Projects" },
];

const styles = `
*{box-sizing:border-box}
:root{
  --hx-bg:#07080b;
  --hx-bg2:#0a0c10;
  --hx-panel:#0e1015;
  --hx-panel2:#12151b;
  --hx-border:rgba(255,255,255,.075);
  --hx-border2:rgba(255,255,255,.12);
  --hx-text:#f5f7fa;
  --hx-muted:#8b929f;
  --hx-soft:#b5bbc5;
  --hx-accent:#ffffff;
  --hx-green:#61e6a2;
  --hx-purple:#9b8cff;
  --hx-radius:18px;
}

body{
  margin:0;
  background:var(--hx-bg);
  color:var(--hx-text);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}

button,input,textarea{font:inherit}
button{cursor:pointer}

.hx-app{
  min-height:100vh;
  background:
    radial-gradient(circle at 78% -10%,rgba(130,110,255,.12),transparent 30%),
    radial-gradient(circle at 10% 20%,rgba(255,255,255,.035),transparent 25%),
    #07080b;
}

.hx-auth{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.1fr .9fr;
  overflow:hidden;
}

.hx-auth-visual{
  position:relative;
  padding:48px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  border-right:1px solid var(--hx-border);
  background:
    radial-gradient(circle at 55% 40%,rgba(155,140,255,.18),transparent 26%),
    radial-gradient(circle at 20% 80%,rgba(97,230,162,.07),transparent 24%),
    #08090d;
}

.hx-grid{
  position:absolute;
  inset:0;
  opacity:.22;
  background-image:
    linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:48px 48px;
  mask-image:linear-gradient(to bottom,black,transparent);
}

.hx-auth-logo{
  position:relative;
  z-index:2;
  display:flex;
  align-items:center;
  gap:12px;
}

.hx-logo-box{
  width:42px;
  height:42px;
  border:1px solid rgba(255,255,255,.2);
  border-radius:13px;
  display:grid;
  place-items:center;
  font-weight:900;
  background:rgba(255,255,255,.055);
  box-shadow:0 0 35px rgba(255,255,255,.06);
}

.hx-logo-word{
  font-size:17px;
  font-weight:800;
  letter-spacing:.18em;
}

.hx-auth-hero{
  position:relative;
  z-index:2;
  max-width:650px;
}

.hx-auth-kicker{
  display:inline-flex;
  border:1px solid var(--hx-border2);
  padding:7px 10px;
  border-radius:999px;
  color:#c8cdd6;
  font-size:10px;
  font-weight:800;
  letter-spacing:.18em;
  background:rgba(255,255,255,.035);
}

.hx-auth-hero h1{
  margin:22px 0 15px;
  font-size:clamp(48px,6vw,92px);
  line-height:.92;
  letter-spacing:-.07em;
}

.hx-auth-hero p{
  color:var(--hx-muted);
  max-width:520px;
  font-size:16px;
  line-height:1.7;
}

.hx-auth-orbit{
  width:210px;
  height:210px;
  position:absolute;
  right:14%;
  top:32%;
  border:1px solid rgba(255,255,255,.12);
  border-radius:50%;
  box-shadow:0 0 80px rgba(155,140,255,.12);
}

.hx-auth-orbit:before,
.hx-auth-orbit:after{
  content:"";
  position:absolute;
  inset:24px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:50%;
}

.hx-auth-orbit:after{
  inset:70px;
  background:rgba(255,255,255,.04);
  border-color:rgba(255,255,255,.2);
}

.hx-auth-footer{
  position:relative;
  z-index:2;
  color:#666d78;
  font-size:11px;
  letter-spacing:.12em;
}

.hx-auth-panel{
  min-width:0;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:30px;
  background:#090a0e;
}

.hx-auth-card{
  width:min(430px,100%);
}

.hx-auth-card h2{
  margin:0;
  font-size:38px;
  letter-spacing:-.045em;
}

.hx-auth-card>p{
  margin:9px 0 28px;
  color:var(--hx-muted);
}

.hx-auth-tabs{
  display:grid;
  grid-template-columns:1fr 1fr;
  padding:4px;
  border:1px solid var(--hx-border);
  background:#0d0f13;
  border-radius:12px;
  margin-bottom:25px;
}

.hx-auth-tabs button{
  border:0;
  background:transparent;
  color:#727985;
  padding:11px;
  border-radius:8px;
}

.hx-auth-tabs button.active{
  background:#1a1d23;
  color:white;
  box-shadow:0 3px 15px rgba(0,0,0,.25);
}

.hx-field{
  margin-bottom:16px;
}

.hx-field label{
  display:block;
  margin-bottom:8px;
  font-size:10px;
  font-weight:800;
  letter-spacing:.14em;
  color:#969daa;
}

.hx-input-wrap{
  position:relative;
}

.hx-input-wrap span{
  position:absolute;
  left:14px;
  top:50%;
  transform:translateY(-50%);
  color:#6e7580;
}

.hx-input{
  width:100%;
  border:1px solid var(--hx-border);
  outline:none;
  background:#0d0f14;
  color:white;
  border-radius:12px;
  padding:13px 14px;
  transition:.2s;
}

.hx-input.has-icon{padding-left:40px}

.hx-input:focus{
  border-color:rgba(255,255,255,.27);
  box-shadow:0 0 0 3px rgba(255,255,255,.035);
}

.hx-password-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.hx-link{
  color:#a9a0ff;
  background:none;
  border:0;
  padding:0;
  font-size:12px;
}

.hx-check{
  display:flex;
  gap:8px;
  color:#818894;
  font-size:12px;
  align-items:center;
  margin:5px 0 18px;
}

.hx-main-btn{
  width:100%;
  border:0;
  border-radius:12px;
  padding:14px;
  color:#08090b;
  background:#f4f5f7;
  font-weight:800;
  transition:.2s;
}

.hx-main-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 12px 30px rgba(255,255,255,.08);
}

.hx-main-btn:disabled{
  opacity:.5;
  cursor:not-allowed;
}

.hx-divider{
  display:flex;
  align-items:center;
  gap:12px;
  margin:23px 0;
  color:#5d636e;
  font-size:10px;
  letter-spacing:.13em;
}

.hx-divider:before,.hx-divider:after{
  content:"";
  flex:1;
  height:1px;
  background:var(--hx-border);
}

.hx-socials{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.hx-social{
  border:1px solid var(--hx-border);
  background:#0d0f14;
  color:white;
  border-radius:11px;
  padding:12px;
}

.hx-auth-switch{
  text-align:center;
  margin-top:22px;
  color:#666d78;
  font-size:12px;
}

.hx-auth-switch button{
  border:0;
  background:none;
  color:white;
  font-weight:700;
}

.hx-error{
  padding:11px 13px;
  border:1px solid rgba(255,90,90,.22);
  background:rgba(255,70,70,.07);
  color:#ff9a9a;
  border-radius:10px;
  margin-bottom:15px;
  font-size:12px;
}

.hx-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:230px 1fr;
}

.hx-sidebar{
  position:fixed;
  inset:0 auto 0 0;
  width:230px;
  border-right:1px solid var(--hx-border);
  background:rgba(8,9,12,.9);
  backdrop-filter:blur(24px);
  padding:24px 14px;
  display:flex;
  flex-direction:column;
  z-index:20;
}

.hx-side-brand{
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 10px 28px;
}

.hx-side-brand .hx-logo-box{
  width:34px;
  height:34px;
  border-radius:10px;
}

.hx-side-brand strong{
  font-size:14px;
  letter-spacing:.16em;
}

.hx-side-label{
  color:#555c67;
  font-size:9px;
  font-weight:900;
  letter-spacing:.18em;
  padding:0 11px 8px;
}

.hx-nav{
  display:grid;
  gap:3px;
}

.hx-nav button{
  position:relative;
  border:0;
  background:transparent;
  color:#777e89;
  display:flex;
  align-items:center;
  gap:12px;
  padding:11px;
  border-radius:10px;
  text-align:left;
  transition:.18s;
}

.hx-nav button:hover{
  background:rgba(255,255,255,.035);
  color:white;
}

.hx-nav button.active{
  color:white;
  background:rgba(255,255,255,.07);
}

.hx-nav button.active:before{
  content:"";
  position:absolute;
  left:0;
  width:2px;
  height:18px;
  background:white;
  border-radius:2px;
}

.hx-nav-icon{
  width:20px;
  text-align:center;
}

.hx-sidebar-bottom{
  margin-top:auto;
}

.hx-user-mini{
  border-top:1px solid var(--hx-border);
  padding:17px 8px 5px;
  display:flex;
  align-items:center;
  gap:10px;
}

.hx-avatar{
  width:34px;
  height:34px;
  flex:none;
  border-radius:10px;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg,#242934,#111319);
  border:1px solid rgba(255,255,255,.1);
  color:white;
  font-size:11px;
  font-weight:800;
  overflow:hidden;
}

.hx-avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.hx-user-mini div{
  min-width:0;
}

.hx-user-mini strong,
.hx-user-mini span{
  display:block;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}

.hx-user-mini strong{font-size:12px}
.hx-user-mini span{font-size:10px;color:#656c77}

.hx-content{
  grid-column:2;
  min-width:0;
}

.hx-topbar{
  height:72px;
  border-bottom:1px solid var(--hx-border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 34px;
  position:sticky;
  top:0;
  z-index:15;
  background:rgba(7,8,11,.72);
  backdrop-filter:blur(24px);
}

.hx-search{
  width:min(440px,50vw);
  display:flex;
  align-items:center;
  gap:9px;
  background:#0c0e12;
  border:1px solid var(--hx-border);
  padding:9px 12px;
  border-radius:10px;
}

.hx-search span{color:#606772}
.hx-search input{
  width:100%;
  border:0;
  outline:0;
  background:none;
  color:white;
}

.hx-top-actions{
  display:flex;
  align-items:center;
  gap:9px;
}

.hx-icon-btn{
  width:36px;
  height:36px;
  border:1px solid var(--hx-border);
  border-radius:10px;
  background:#0c0e12;
  color:#8c939e;
}

.hx-page{
  max-width:1450px;
  margin:auto;
  padding:42px 42px 70px;
}

.hx-heading{
  display:flex;
  justify-content:space-between;
  gap:30px;
  align-items:flex-end;
  margin-bottom:34px;
}

.hx-eyebrow{
  color:#747b86;
  font-size:10px;
  font-weight:900;
  letter-spacing:.2em;
}

.hx-heading h1{
  margin:8px 0 7px;
  font-size:clamp(36px,4vw,58px);
  letter-spacing:-.06em;
  line-height:1;
}

.hx-heading p{
  margin:0;
  color:#777e89;
}

.hx-hero{
  position:relative;
  overflow:hidden;
  min-height:290px;
  border:1px solid var(--hx-border);
  border-radius:24px;
  background:
    radial-gradient(circle at 82% 35%,rgba(155,140,255,.15),transparent 25%),
    linear-gradient(135deg,#101218,#0b0d11);
  padding:36px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.hx-hero:after{
  content:"";
  position:absolute;
  width:340px;
  height:340px;
  right:-110px;
  top:-130px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:50%;
  box-shadow:
    0 0 0 35px rgba(255,255,255,.015),
    0 0 0 70px rgba(255,255,255,.01);
}

.hx-hero h2{
  position:relative;
  z-index:2;
  margin:8px 0;
  font-size:clamp(32px,4vw,58px);
  letter-spacing:-.06em;
  max-width:700px;
}

.hx-hero p{
  position:relative;
  z-index:2;
  color:#858c97;
  max-width:600px;
}

.hx-actions{
  position:relative;
  z-index:3;
  display:flex;
  flex-wrap:wrap;
  gap:9px;
  margin-top:22px;
}

.hx-action{
  border:1px solid var(--hx-border2);
  background:rgba(255,255,255,.055);
  color:white;
  border-radius:10px;
  padding:11px 14px;
}

.hx-action.primary{
  background:#f1f2f4;
  color:#08090b;
  border-color:#f1f2f4;
  font-weight:800;
}

.hx-section-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin:34px 0 14px;
}

.hx-section-title span{
  font-size:10px;
  color:#646b76;
  font-weight:900;
  letter-spacing:.18em;
}

.hx-grid-cards{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
}

.hx-feature{
  min-height:165px;
  border:1px solid var(--hx-border);
  border-radius:17px;
  background:#0d0f14;
  padding:22px;
  transition:.2s;
}

.hx-feature:hover{
  transform:translateY(-2px);
  border-color:var(--hx-border2);
  background:#101218;
}

.hx-feature-top{
  display:flex;
  justify-content:space-between;
  color:#707782;
}

.hx-feature-icon{
  width:37px;
  height:37px;
  display:grid;
  place-items:center;
  border-radius:10px;
  background:#171a20;
  color:#e6e8ec;
}

.hx-feature h3{
  margin:26px 0 5px;
  font-size:16px;
}

.hx-feature p{
  margin:0;
  color:#6f7681;
  font-size:12px;
}

.hx-empty{
  min-height:240px;
  border:1px dashed rgba(255,255,255,.1);
  border-radius:18px;
  display:grid;
  place-items:center;
  text-align:center;
  padding:35px;
  background:rgba(255,255,255,.015);
}

.hx-empty-icon{
  width:48px;
  height:48px;
  display:grid;
  place-items:center;
  border-radius:15px;
  background:#12151b;
  color:#a9a0ff;
  margin:auto;
}

.hx-empty h3{margin:15px 0 6px}
.hx-empty p{margin:0 0 18px;color:#6d747f;font-size:13px}

.hx-btn{
  border:1px solid var(--hx-border2);
  color:white;
  background:#111319;
  padding:10px 14px;
  border-radius:10px;
}

.hx-btn.light{
  background:white;
  color:#07080b;
  font-weight:800;
}

.hx-list{
  border:1px solid var(--hx-border);
  border-radius:17px;
  overflow:hidden;
  background:#0c0e12;
}

.hx-list-row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:17px;
  border-bottom:1px solid var(--hx-border);
}

.hx-list-row:last-child{border-bottom:0}

.hx-list-info{
  display:flex;
  align-items:center;
  gap:12px;
}

.hx-list-info strong{display:block;font-size:13px}
.hx-list-info span{display:block;color:#686f7a;font-size:11px;margin-top:3px}

.hx-status{
  color:var(--hx-green);
  font-size:10px;
  font-weight:800;
}

.hx-two{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}

.hx-panel{
  border:1px solid var(--hx-border);
  background:#0c0e12;
  border-radius:17px;
  padding:20px;
}

.hx-panel-head{
  display:flex;
  justify-content:space-between;
  color:#727985;
  font-size:10px;
  font-weight:800;
  letter-spacing:.12em;
  margin-bottom:16px;
}

.hx-chat{
  height:calc(100vh - 72px);
  display:grid;
  grid-template-columns:300px 1fr;
}

.hx-chat-sidebar{
  border-right:1px solid var(--hx-border);
  padding:20px;
  overflow:auto;
}

.hx-chat-sidebar h3{
  font-size:13px;
  margin:0 0 14px;
}

.hx-chat-search{
  display:flex;
  background:#0c0e12;
  border:1px solid var(--hx-border);
  border-radius:10px;
  padding:9px;
  gap:8px;
}

.hx-chat-search input{
  background:none;
  border:0;
  outline:0;
  color:white;
  width:100%;
}

.hx-person{
  width:100%;
  margin-top:6px;
  padding:10px;
  display:flex;
  align-items:center;
  gap:10px;
  border:0;
  border-radius:10px;
  color:white;
  background:transparent;
  text-align:left;
}

.hx-person:hover,.hx-person.active{
  background:rgba(255,255,255,.06);
}

.hx-person strong,.hx-person span{display:block}
.hx-person strong{font-size:12px}
.hx-person span{font-size:10px;color:#666d77;margin-top:3px}

.hx-chat-window{
  min-width:0;
  display:flex;
  flex-direction:column;
}

.hx-chat-head{
  min-height:70px;
  padding:14px 22px;
  border-bottom:1px solid var(--hx-border);
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.hx-chat-user{
  display:flex;
  align-items:center;
  gap:10px;
}

.hx-chat-user strong,.hx-chat-user span{display:block}
.hx-chat-user strong{font-size:13px}
.hx-chat-user span{font-size:10px;color:#69707b}

.hx-messages{
  flex:1;
  padding:25px;
  overflow:auto;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.hx-message{
  max-width:min(560px,75%);
  align-self:flex-start;
}

.hx-message.mine{align-self:flex-end}

.hx-message p{
  margin:0;
  padding:11px 13px;
  background:#11141a;
  border:1px solid var(--hx-border);
  border-radius:13px 13px 13px 4px;
  font-size:13px;
}

.hx-message.mine p{
  background:#e9eaed;
  color:#08090b;
  border-radius:13px 13px 4px 13px;
}

.hx-message small{
  display:block;
  margin-top:4px;
  color:#555c66;
  font-size:9px;
}

.hx-composer{
  margin:15px;
  border:1px solid var(--hx-border2);
  background:#0c0e12;
  border-radius:14px;
  padding:7px;
  display:flex;
  gap:8px;
  align-items:end;
}

.hx-composer textarea{
  flex:1;
  resize:none;
  background:none;
  color:white;
  border:0;
  outline:0;
  min-height:38px;
  padding:9px;
}

.hx-composer button{
  width:38px;
  height:38px;
  border:0;
  border-radius:9px;
  background:#161920;
  color:#aaa;
}

.hx-composer .send{
  background:white;
  color:black;
  font-weight:900;
}

.hx-cards{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
  gap:12px;
}

.hx-project{
  min-height:190px;
  border:1px solid var(--hx-border);
  border-radius:17px;
  padding:20px;
  background:#0d0f14;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}

.hx-project-type{
  color:#777e88;
  font-size:9px;
  font-weight:900;
  letter-spacing:.15em;
}

.hx-project h3{margin:35px 0 5px}
.hx-project p{color:#676e79;font-size:12px;margin:0}

.hx-modal-backdrop{
  position:fixed;
  inset:0;
  z-index:100;
  background:rgba(0,0,0,.72);
  backdrop-filter:blur(12px);
  display:grid;
  place-items:center;
  padding:20px;
}

.hx-modal{
  width:min(480px,100%);
  border:1px solid var(--hx-border2);
  background:#101218;
  border-radius:20px;
  padding:25px;
  box-shadow:0 30px 100px rgba(0,0,0,.5);
}

.hx-modal h2{margin:5px 0 23px}
.hx-modal-actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:20px;
}

.hx-profile{
  display:grid;
  grid-template-columns:280px 1fr;
  gap:15px;
}

.hx-profile-card{
  border:1px solid var(--hx-border);
  border-radius:18px;
  padding:28px;
  background:#0c0e12;
  text-align:center;
}

.hx-profile-card .hx-avatar{
  width:90px;
  height:90px;
  margin:auto;
  border-radius:24px;
  font-size:25px;
}

.hx-profile-card h2{margin:17px 0 4px}
.hx-profile-card p{margin:0;color:#696f7a;font-size:12px}

.hx-form{
  border:1px solid var(--hx-border);
  border-radius:18px;
  padding:26px;
  background:#0c0e12;
}

.hx-form h2{margin:5px 0 25px}

.hx-studio{
  border:1px solid var(--hx-border);
  border-radius:20px;
  overflow:hidden;
  min-height:500px;
  background:#0b0d11;
}

.hx-studio-bar{
  height:54px;
  border-bottom:1px solid var(--hx-border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 14px;
}

.hx-studio-body{
  min-height:450px;
  display:grid;
  place-items:center;
  text-align:center;
}

.hx-studio-body h2{
  font-size:28px;
  letter-spacing:-.04em;
}

.hx-studio-body p{color:#69707a}

.hx-code{
  height:calc(100vh - 72px);
  display:grid;
  grid-template-columns:220px 1fr;
}

.hx-code-tree{
  border-right:1px solid var(--hx-border);
  padding:18px;
  background:#090b0e;
}

.hx-code-tree span{
  color:#666d77;
  font-size:9px;
  font-weight:900;
  letter-spacing:.15em;
}

.hx-code-tree button{
  width:100%;
  display:block;
  text-align:left;
  border:0;
  background:transparent;
  color:#828995;
  padding:9px;
  border-radius:7px;
  margin-top:3px;
  font-size:12px;
}

.hx-code-tree button:hover{
  background:#11141a;
  color:white;
}

.hx-code-editor{
  min-width:0;
  display:flex;
  flex-direction:column;
}

.hx-code-tabs{
  height:48px;
  border-bottom:1px solid var(--hx-border);
  display:flex;
  align-items:center;
  gap:20px;
  padding:0 17px;
  color:#8d949f;
  font-size:12px;
}

.hx-code-area{
  flex:1;
  border:0;
  resize:none;
  outline:0;
  background:#080a0d;
  color:#cdd2da;
  padding:22px;
  font-family:"JetBrains Mono","Cascadia Code",monospace;
  font-size:13px;
  line-height:1.7;
}

.hx-mobile{
  display:none;
}

@media(max-width:900px){
  .hx-auth{grid-template-columns:1fr}
  .hx-auth-visual{display:none}
  .hx-shell{display:block}
  .hx-sidebar{
    transform:translateX(-100%);
    transition:.25s;
  }
  .hx-sidebar.open{transform:translateX(0)}
  .hx-content{margin-left:0}
  .hx-mobile{display:block}
  .hx-grid-cards{grid-template-columns:1fr}
  .hx-two,.hx-profile{grid-template-columns:1fr}
  .hx-chat{grid-template-columns:1fr}
  .hx-chat-sidebar{display:none}
  .hx-page{padding:28px 18px 50px}
  .hx-topbar{padding:0 16px}
  .hx-search{width:48px}
  .hx-search input{display:none}
  .hx-code{grid-template-columns:1fr}
  .hx-code-tree{display:none}
}
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

    const { data } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession || null);
      }
    );

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <>
        <style>{styles}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#07080b",
            color: "white",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="hx-logo-box"
              style={{ margin: "auto", width: 60, height: 60 }}
            >
              H
            </div>
            <p style={{ color: "#707782", marginTop: 14 }}>
              INITIALIZING HEXA
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <style>{styles}</style>
        <AuthPage />
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <Workspace session={session} />
    </>
  );
}

/* =========================================================
   AUTHENTICATION
========================================================= */

function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (mode === "signup" && (!name.trim() || !username.trim())) {
      setError("Enter your name and choose a username.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      } else {
        const cleanUsername = username
          .trim()
          .replace(/^@/, "")
          .toLowerCase();

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              username: cleanUsername,
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            "Account created. Check your email to confirm your account, then sign in."
          );
        } else {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: name.trim(),
            username: cleanUsername,
          });
        }
      }
    } catch (err) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider) {
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) setError(error.message);
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) setError(error.message);
    else setMessage("Password reset instructions have been sent.");
  }

  return (
    <div className="hx-auth">
      <section className="hx-auth-visual">
        <div className="hx-grid" />
        <div className="hx-auth-orbit" />

        <div className="hx-auth-logo">
          <div className="hx-logo-box">H</div>
          <span className="hx-logo-word">HEXA</span>
        </div>

        <div className="hx-auth-hero">
          <span className="hx-auth-kicker">HEXA NEXUS / 01</span>
          <h1>
            One space.
            <br />
            Everything.
          </h1>
          <p>
            Build products, connect with people, create projects,
            write code and manage your digital world from one
            intelligent workspace.
          </p>
        </div>

        <div className="hx-auth-footer">
          HEXA NEXUS · YOUR DIGITAL WORKSPACE
        </div>
      </section>

      <section className="hx-auth-panel">
        <form className="hx-auth-card" onSubmit={submit}>
          <h2>
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </h2>

          <p>
            {mode === "signin"
              ? "Enter your workspace and continue building."
              : "Start your HEXA workspace today."}
          </p>

          <div className="hx-auth-tabs">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setError("");
                setMessage("");
              }}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
                setMessage("");
              }}
            >
              Sign up
            </button>
          </div>

          {error && <div className="hx-error">{error}</div>}
          {message && (
            <div
              className="hx-error"
              style={{
                borderColor: "rgba(97,230,162,.2)",
                color: "#8ff0bc",
                background: "rgba(97,230,162,.05)",
              }}
            >
              {message}
            </div>
          )}

          {mode === "signup" && (
            <>
              <div className="hx-field">
                <label>FULL NAME</label>
                <input
                  className="hx-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="hx-field">
                <label>USERNAME</label>
                <div className="hx-input-wrap">
                  <span>@</span>
                  <input
                    className="hx-input has-icon"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>
              </div>
            </>
          )}

          <div className="hx-field">
            <label>EMAIL ADDRESS</label>
            <div className="hx-input-wrap">
              <span>✉</span>
              <input
                className="hx-input has-icon"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="hx-field">
            <div className="hx-password-row">
              <label>PASSWORD</label>

              {mode === "signin" && (
                <button
                  type="button"
                  className="hx-link"
                  onClick={forgotPassword}
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div className="hx-input-wrap">
              <span>●</span>
              <input
                className="hx-input has-icon"
                type="password"
                autoComplete={
                  mode === "signin"
                    ? "current-password"
                    : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {mode === "signin" && (
            <label className="hx-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
          )}

          <button className="hx-main-btn" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "signin"
              ? "Sign in →"
              : "Create account →"}
          </button>

          <div className="hx-divider">OR CONTINUE WITH</div>

          <div className="hx-socials">
            <button
              type="button"
              className="hx-social"
              onClick={() => oauth("google")}
            >
              G&nbsp; Google
            </button>

            <button
              type="button"
              className="hx-social"
              onClick={() => oauth("github")}
            >
              ◈&nbsp; GitHub
            </button>
          </div>

          <div className="hx-auth-switch">
            {mode === "signin"
              ? "Don't have a HEXA account?"
              : "Already have a HEXA account?"}{" "}
            <button
              type="button"
              onClick={() =>
                setMode(mode === "signin" ? "signup" : "signin")
              }
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* =========================================================
   WORKSPACE
========================================================= */

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

  useEffect(() => {
    loadEverything();
  }, [userId]);

  async function loadEverything() {
    await Promise.all([
      loadProfile(),
      loadGroups(),
      loadCommunities(),
      loadProjects(),
    ]);
  }

  async function loadProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) setProfile(data);
  }

  async function loadGroups() {
    const { data, error } = await supabase
      .from("conversation_members")
      .select(
        "conversation_id,conversations(id,name,type,created_at)"
      )
      .eq("user_id", userId);

    if (!error) {
      setGroups(
        (data || [])
          .map((x) => x.conversations)
          .filter((x) => x?.type === "group")
      );
    }
  }

  async function loadCommunities() {
    const { data, error } = await supabase
      .from("community_members")
      .select(
        "community_id,communities(id,name,description,created_at)"
      )
      .eq("user_id", userId);

    if (!error) {
      setCommunities(
        (data || [])
          .map((x) => x.communities)
          .filter(Boolean)
      );
    }
  }

  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (!error) setProjects(data || []);
  }

  const displayName =
    profile?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "HEXA User";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  function navigate(next) {
    setPage(next);
    setMobileOpen(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="hx-app">
      <aside className={`hx-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="hx-side-brand">
          <div className="hx-logo-box">H</div>
          <strong>HEXA</strong>
        </div>

        <div className="hx-side-label">NEXUS</div>

        <nav className="hx-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <span className="hx-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hx-side-label" style={{ marginTop: 26 }}>
          CREATE
        </div>

        <nav className="hx-nav">
          <button onClick={() => navigate("game")}>
            <span className="hx-nav-icon">▣</span>
            Game Studio
          </button>

          <button onClick={() => navigate("app")}>
            <span className="hx-nav-icon">▤</span>
            App Studio
          </button>

          <button onClick={() => navigate("code")}>
            <span className="hx-nav-icon">&lt;/&gt;</span>
            CodeSpace
          </button>
        </nav>

        <div className="hx-sidebar-bottom">
          <nav className="hx-nav">
            <button onClick={() => navigate("profile")}>
              <span className="hx-nav-icon">◎</span>
              Profile
            </button>

            <button onClick={signOut}>
              <span className="hx-nav-icon">↪</span>
              Sign out
            </button>
          </nav>

          <div className="hx-user-mini">
            <Avatar profile={profile} initials={initials} />
            <div>
              <strong>{displayName}</strong>
              <span>
                @{profile?.username || "username"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="hx-content">
        <header className="hx-topbar">
          <button
            className="hx-icon-btn hx-mobile"
            onClick={() => setMobileOpen((v) => !v)}
          >
            ☰
          </button>

          <div className="hx-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search HEXA..."
            />
          </div>

          <div className="hx-top-actions">
            <button className="hx-icon-btn">⌘</button>
            <button
              className="hx-icon-btn"
              onClick={() => navigate("profile")}
            >
              {initials || "H"}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ padding: "18px 40px 0" }}>
            <div className="hx-error">
              {error}
              <button
                onClick={() => setError("")}
                style={{
                  float: "right",
                  background: "none",
                  border: 0,
                  color: "inherit",
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {page === "overview" && (
          <NexusPage
            displayName={displayName}
            profile={profile}
            projects={projects}
            groups={groups}
            communities={communities}
            navigate={navigate}
          />
        )}

        {page === "chat" && (
          <ChatPage
            userId={userId}
            profile={profile}
            setError={setError}
          />
        )}

        {page === "groups" && (
          <GroupsPage
            groups={groups}
            setGroups={setGroups}
            userId={userId}
            setError={setError}
          />
        )}

        {page === "communities" && (
          <CommunitiesPage
            communities={communities}
            setCommunities={setCommunities}
            userId={userId}
            setError={setError}
          />
        )}

        {page === "projects" && (
          <ProjectsPage
            projects={projects}
            setProjects={setProjects}
            userId={userId}
            setError={setError}
          />
        )}

        {page === "profile" && (
          <ProfilePage
            profile={profile}
            session={session}
            setProfile={setProfile}
            setError={setError}
          />
        )}

        {(page === "game" || page === "app") && (
          <StudioPage type={page} navigate={navigate} />
        )}

        {page === "code" && <CodeSpacePage navigate={navigate} />}
      </div>
    </div>
  );
}

/* =========================================================
   NEXUS
========================================================= */

function NexusPage({
  displayName,
  profile,
  projects,
  groups,
  communities,
  navigate,
}) {
  const hasAnything =
    projects.length > 0 ||
    groups.length > 0 ||
    communities.length > 0;

  return (
    <main className="hx-page">
      <div className="hx-heading">
        <div>
          <span className="hx-eyebrow">NEXUS / HOME</span>
          <h1>Good evening, {displayName.split(" ")[0]}.</h1>
          <p>Your workspace is ready.</p>
        </div>
      </div>

      <section className="hx-hero">
        <span className="hx-eyebrow">HEXA NEXUS</span>
        <h2>What are you building today?</h2>
        <p>
          Create, connect and develop without leaving your
          workspace.
        </p>

        <div className="hx-actions">
          <button
            className="hx-action primary"
            onClick={() => navigate("projects")}
          >
            + New project
          </button>

          <button
            className="hx-action"
            onClick={() => navigate("chat")}
          >
            Start a conversation
          </button>

          <button
            className="hx-action"
            onClick={() => navigate("code")}
          >
            Open CodeSpace
          </button>
        </div>
      </section>

      <div className="hx-section-title">
        <span>WORKSPACE</span>
      </div>

      <div className="hx-grid-cards">
        <FeatureCard
          icon="◉"
          title="Chat"
          text="Connect with people in your HEXA network."
          onClick={() => navigate("chat")}
        />

        <FeatureCard
          icon="◆"
          title="Projects"
          text={
            projects.length
              ? `${projects.length} project${
                  projects.length === 1 ? "" : "s"
                } in your workspace.`
              : "Your projects will appear here."
          }
          onClick={() => navigate("projects")}
        />

        <FeatureCard
          icon="</>"
          title="CodeSpace"
          text="Work with your development workspace."
          onClick={() => navigate("code")}
        />
      </div>

      <div className="hx-section-title">
        <span>YOUR DATA</span>
      </div>

      {hasAnything ? (
        <div className="hx-two">
          <div className="hx-panel">
            <div className="hx-panel-head">
              <span>PROJECTS</span>
              <span>{projects.length}</span>
            </div>

            {projects.length ? (
              projects.slice(0, 4).map((project) => (
                <div className="hx-list-row" key={project.id}>
                  <div className="hx-list-info">
                    <div className="hx-feature-icon">◆</div>
                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {project.project_type || "Project"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptySmall text="No projects yet." />
            )}
          </div>

          <div className="hx-panel">
            <div className="hx-panel-head">
              <span>NETWORK</span>
              <span>
                {groups.length + communities.length}
              </span>
            </div>

            {groups.length || communities.length ? (
              <>
                {groups.slice(0, 3).map((group) => (
                  <div className="hx-list-row" key={group.id}>
                    <div className="hx-list-info">
                      <div className="hx-feature-icon">◎</div>
                      <div>
                        <strong>{group.name}</strong>
                        <span>Group</span>
                      </div>
                    </div>
                  </div>
                ))}

                {communities.slice(0, 3).map((community) => (
                  <div
                    className="hx-list-row"
                    key={community.id}
                  >
                    <div className="hx-list-info">
                      <div className="hx-feature-icon">◇</div>
                      <div>
                        <strong>{community.name}</strong>
                        <span>Community</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <EmptySmall text="Your network is empty." />
            )}
          </div>
        </div>
      ) : (
        <div className="hx-empty">
          <div>
            <div className="hx-empty-icon">✦</div>
            <h3>Your workspace is empty</h3>
            <p>
              Create a project, start a conversation or build
              something in CodeSpace.
            </p>

            <button
              className="hx-btn light"
              onClick={() => navigate("projects")}
            >
              Create your first project →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function FeatureCard({ icon, title, text, onClick }) {
  return (
    <button
      className="hx-feature"
      onClick={onClick}
      style={{
        color: "white",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div className="hx-feature-top">
        <div className="hx-feature-icon">{icon}</div>
        <span>↗</span>
      </div>

      <h3>{title}</h3>
      <p>{text}</p>
    </button>
  );
}

function EmptySmall({ text }) {
  return (
    <div style={{ color: "#666d77", fontSize: 12 }}>
      {text}
    </div>
  );
}

/* =========================================================
   CHAT
========================================================= */

function ChatPage({ userId, profile, setError }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [active, setActive] = useState(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setPeople([]);
      return;
    }

    const timer = setTimeout(async () => {
      const clean = query.replace(/^@/, "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .ilike("username", `%${clean}%`)
        .neq("id", userId)
        .limit(15);

      if (!error) setPeople(data || []);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, userId]);

  async function send() {
    if (!text.trim() || !active) return;

    /*
      This local append keeps the composer immediately responsive.
      Replace with your messages table insert when your schema
      contains a direct-message/messages table.
    */
    const message = {
      id: crypto.randomUUID(),
      sender_id: userId,
      text: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, message]);
    setText("");
  }

  return (
    <main className="hx-chat">
      <aside className="hx-chat-sidebar">
        <h3>CONVERSATIONS</h3>

        <div className="hx-chat-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone..."
          />
        </div>

        <div style={{ marginTop: 15 }}>
          {people.map((person) => (
            <button
              className={`hx-person ${
                active?.id === person.id ? "active" : ""
              }`}
              key={person.id}
              onClick={() => {
                setActive(person);
                setMessages([]);
              }}
            >
              <Avatar profile={person} />

              <div>
                <strong>
                  {person.full_name || person.username}
                </strong>
                <span>@{person.username}</span>
              </div>
            </button>
          ))}

          {!query && (
            <div
              style={{
                color: "#5e6570",
                fontSize: 11,
                padding: "25px 5px",
                lineHeight: 1.6,
              }}
            >
              Search for a real HEXA username to start a
              conversation.
            </div>
          )}
        </div>
      </aside>

      <section className="hx-chat-window">
        {!active ? (
          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: 30,
            }}
          >
            <div>
              <div className="hx-empty-icon">◉</div>
              <h2>HEXA Chat</h2>
              <p style={{ color: "#666d77" }}>
                Select a person to start a conversation.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="hx-chat-head">
              <div className="hx-chat-user">
                <Avatar profile={active} />
                <div>
                  <strong>{active.full_name}</strong>
                  <span>@{active.username}</span>
                </div>
              </div>

              <div>
                <button className="hx-icon-btn">☎</button>
              </div>
            </header>

            <div className="hx-messages">
              {messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    color: "#646b76",
                  }}
                >
                  <strong>Start the conversation</strong>
                  <p style={{ fontSize: 12 }}>
                    Say hello to {active.full_name}.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`hx-message ${
                      message.sender_id === userId ? "mine" : ""
                    }`}
                    key={message.id}
                  >
                    <p>{message.text}</p>
                    <small>
                      {new Date(
                        message.created_at
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                ))
              )}
            </div>

            <div className="hx-composer">
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Write a message..."
              />

              <button className="send" onClick={send}>
                ↑
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

/* =========================================================
   GROUPS
========================================================= */

function GroupsPage({
  groups,
  setGroups,
  userId,
  setError,
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function create() {
    if (!name.trim()) {
      setError("Enter a group name.");
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        type: "group",
        name: name.trim(),
        created_by: userId,
      })
      .select("id,name,type,created_at")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.from("conversation_members").insert({
      conversation_id: data.id,
      user_id: userId,
      is_admin: true,
    });

    setGroups((prev) => [data, ...prev]);
    setName("");
    setOpen(false);
  }

  return (
    <main className="hx-page">
      <PageHeading
        eyebrow="NETWORK / GROUPS"
        title="Groups"
        text="Private spaces for your people."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="hx-btn light" onClick={() => setOpen(true)}>
          + New group
        </button>
      </div>

      {groups.length === 0 ? (
        <Empty
          icon="◎"
          title="No groups yet"
          text="Create your first private group."
          button="Create group"
          onClick={() => setOpen(true)}
        />
      ) : (
        <div className="hx-cards">
          {groups.map((group) => (
            <div className="hx-project" key={group.id}>
              <div>
                <span className="hx-project-type">GROUP</span>
                <h3>{group.name}</h3>
                <p>Private HEXA conversation space.</p>
              </div>

              <button className="hx-btn">Open →</button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="Create group" close={() => setOpen(false)}>
          <Field
            label="GROUP NAME"
            value={name}
            setValue={setName}
            placeholder="HEXA Developers"
          />

          <ModalButtons
            close={() => setOpen(false)}
            action="Create group"
            onAction={create}
          />
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   COMMUNITIES
========================================================= */

function CommunitiesPage({
  communities,
  setCommunities,
  userId,
  setError,
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function create() {
    if (!name.trim()) {
      setError("Enter a community name.");
      return;
    }

    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        description: description.trim(),
        created_by: userId,
      })
      .select("id,name,description,created_at")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: userId,
      is_admin: true,
    });

    setCommunities((prev) => [data, ...prev]);
    setName("");
    setDescription("");
    setOpen(false);
  }

  return (
    <main className="hx-page">
      <PageHeading
        eyebrow="NETWORK / COMMUNITIES"
        title="Communities"
        text="Build spaces around shared ideas."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="hx-btn light" onClick={() => setOpen(true)}>
          + New community
        </button>
      </div>

      {communities.length === 0 ? (
        <Empty
          icon="◇"
          title="No communities yet"
          text="Create a community and bring people together."
          button="Create community"
          onClick={() => setOpen(true)}
        />
      ) : (
        <div className="hx-cards">
          {communities.map((community) => (
            <div className="hx-project" key={community.id}>
              <div>
                <span className="hx-project-type">COMMUNITY</span>
                <h3>{community.name}</h3>
                <p>
                  {community.description ||
                    "HEXA community."}
                </p>
              </div>

              <button className="hx-btn">Open →</button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="Create community"
          close={() => setOpen(false)}
        >
          <Field
            label="COMMUNITY NAME"
            value={name}
            setValue={setName}
            placeholder="HEXA Creators"
          />

          <Field
            label="DESCRIPTION"
            value={description}
            setValue={setDescription}
            placeholder="What is this community about?"
            textarea
          />

          <ModalButtons
            close={() => setOpen(false)}
            action="Create community"
            onAction={create}
          />
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   PROJECTS
========================================================= */

function ProjectsPage({
  projects,
  setProjects,
  userId,
  setError,
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("app");

  async function create() {
    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        project_type: type,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setProjects((prev) => [data, ...prev]);
    setName("");
    setOpen(false);
  }

  return (
    <main className="hx-page">
      <PageHeading
        eyebrow="WORK / PROJECTS"
        title="Projects"
        text="Everything you are building."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="hx-btn light" onClick={() => setOpen(true)}>
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <Empty
          icon="◆"
          title="Your project universe is empty"
          text="Create your first HEXA project."
          button="Create project"
          onClick={() => setOpen(true)}
        />
      ) : (
        <div className="hx-cards">
          {projects.map((project) => (
            <div className="hx-project" key={project.id}>
              <div>
                <span className="hx-project-type">
                  {(project.project_type || "PROJECT").toUpperCase()}
                </span>

                <h3>{project.name}</h3>

                <p>Development workspace</p>
              </div>

              <button className="hx-btn">
                Open workspace →
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="Create project"
          close={() => setOpen(false)}
        >
          <Field
            label="PROJECT NAME"
            value={name}
            setValue={setName}
            placeholder="My next project"
          />

          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: "#777e89",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ".14em",
            }}
          >
            PROJECT TYPE
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            {["app", "game"].map((item) => (
              <button
                key={item}
                className={`hx-btn ${
                  type === item ? "light" : ""
                }`}
                onClick={() => setType(item)}
              >
                {item === "app" ? "▤ App" : "▣ Game"}
              </button>
            ))}
          </div>

          <ModalButtons
            close={() => setOpen(false)}
            action="Create project"
            onAction={create}
          />
        </Modal>
      )}
    </main>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfilePage({
  profile,
  session,
  setProfile,
  setError,
}) {
  const fileRef = useRef(null);

  const [name, setName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(
    profile?.username || ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name || "");
    setUsername(profile?.username || "");
  }, [profile]);

  async function save() {
    const clean = username
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

    setSaving(true);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        username: clean,
      })
      .eq("id", session.user.id)
      .select("id,username,full_name,avatar_url")
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setProfile(data);
  }

  async function upload(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    try {
      const ext = file.name.split(".").pop() || "jpg";

      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) throw uploadError;

      const { data: publicData } =
        supabase.storage
          .from("avatars")
          .getPublicUrl(path);

      const avatar_url =
        `${publicData.publicUrl}?v=${Date.now()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url })
        .eq("id", session.user.id)
        .select("id,username,full_name,avatar_url")
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="hx-page">
      <PageHeading
        eyebrow="IDENTITY / PROFILE"
        title="Your identity"
        text="Manage the profile attached to your HEXA account."
      />

      <div className="hx-profile">
        <section className="hx-profile-card">
          <Avatar profile={profile} large />

          <h2>{name || "HEXA User"}</h2>
          <p>@{username || "username"}</p>

          <button
            className="hx-btn"
            style={{ marginTop: 20 }}
            onClick={() => fileRef.current?.click()}
          >
            Change picture
          </button>

          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </section>

        <section className="hx-form">
          <span className="hx-eyebrow">PERSONAL DATA</span>
          <h2>Profile settings</h2>

          <Field
            label="FULL NAME"
            value={name}
            setValue={setName}
            placeholder="Your name"
          />

          <Field
            label="USERNAME"
            value={username}
            setValue={setUsername}
            placeholder="username"
          />

          <div className="hx-field">
            <label>EMAIL</label>
            <input
              className="hx-input"
              disabled
              value={session?.user?.email || ""}
            />
          </div>

          <button
            className="hx-btn light"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save changes →"}
          </button>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   STUDIO
========================================================= */

function StudioPage({ type, navigate }) {
  const game = type === "game";

  function openVSCode() {
    /*
      Browsers cannot silently execute arbitrary desktop
      applications. The vscode:// protocol is the legitimate
      handoff mechanism when VS Code is installed and the
      browser allows the protocol.
    */
    const projectName = game
      ? "HEXA-GAME"
      : "HEXA-APP";

    const url =
      `vscode://file/${encodeURIComponent(
        `${projectName}`
      )}`;

    window.location.href = url;
  }

  return (
    <main className="hx-page">
      <PageHeading
        eyebrow={`STUDIO / ${game ? "GAME" : "APP"}`}
        title={game ? "Game Studio" : "App Studio"}
        text={
          game
            ? "Build games and interactive experiences."
            : "Create applications and digital products."
        }
      />

      <section className="hx-studio">
        <div className="hx-studio-bar">
          <span style={{ color: "#8a919b", fontSize: 12 }}>
            {game ? "GAME_PROJECT" : "APP_PROJECT"}
          </span>

          <div style={{ display: "flex", gap: 7 }}>
            <button className="hx-btn">Preview</button>
            <button className="hx-btn light">
              Run
            </button>
          </div>
        </div>

        <div className="hx-studio-body">
          <div>
            <div className="hx-empty-icon">
              {game ? "▣" : "▤"}
            </div>

            <h2>
              {game
                ? "GAME DEVELOPMENT"
                : "APPLICATION DEVELOPMENT"}
            </h2>

            <p>
              Your {game ? "game" : "app"} workspace is ready.
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="hx-btn light"
                onClick={() => navigate("code")}
              >
                Open CodeSpace →
              </button>

              <button
                className="hx-btn"
                onClick={openVSCode}
              >
                Open VS Code
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   CODESPACE
========================================================= */

function CodeSpacePage() {
  const [code, setCode] = useState(
`import React from "react";

export default function App() {
  return (
    <main>
      <h1>HEXA</h1>
    </main>
  );
}`
  );

  function openVSCode() {
    const path =
      window.prompt(
        "Enter the local project folder path to open in VS Code:",
        "C:\\HEXA"
      );

    if (!path) return;

    /*
      vscode://file/ is the browser-to-VS-Code handoff.
      Windows paths are converted to forward slashes.
    */
    const normalized = path.replace(/\\/g, "/");

    window.location.href =
      `vscode://file/${encodeURI(normalized)}`;
  }

  return (
    <main className="hx-code">
      <aside className="hx-code-tree">
        <span>EXPLORER</span>

        <button>▾ src</button>
        <button>　App.jsx</button>
        <button>　App.css</button>
        <button>　components</button>
        <button>▾ public</button>
        <button>package.json</button>
      </aside>

      <section className="hx-code-editor">
        <div className="hx-code-tabs">
          <span>App.jsx</span>

          <button
            className="hx-btn"
            style={{
              marginLeft: "auto",
              padding: "6px 10px",
            }}
            onClick={openVSCode}
          >
            Open VS Code ↗
          </button>
        </div>

        <textarea
          className="hx-code-area"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
      </section>
    </main>
  );
}

/* =========================================================
   COMMON COMPONENTS
========================================================= */

function PageHeading({ eyebrow, title, text }) {
  return (
    <div className="hx-heading">
      <div>
        <span className="hx-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
    </div>
  );
}

function Avatar({ profile, large = false, initials }) {
  const letters =
    initials ||
    profile?.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() ||
    "H";

  return (
    <div
      className="hx-avatar"
      style={
        large
          ? {
              width: 90,
              height: 90,
              borderRadius: 24,
              fontSize: 24,
            }
          : undefined
      }
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" />
      ) : (
        letters
      )}
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  placeholder,
  textarea = false,
}) {
  return (
    <div className="hx-field">
      <label>{label}</label>

      {textarea ? (
        <textarea
          className="hx-input"
          style={{ minHeight: 90, resize: "vertical" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="hx-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
  button,
  onClick,
}) {
  return (
    <div className="hx-empty">
      <div>
        <div className="hx-empty-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>

        <button className="hx-btn light" onClick={onClick}>
          {button} →
        </button>
      </div>
    </div>
  );
}

function Modal({ title, close, children }) {
  return (
    <div className="hx-modal-backdrop" onMouseDown={close}>
      <div
        className="hx-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="hx-eyebrow">HEXA NEXUS</span>

          <button
            className="hx-icon-btn"
            onClick={close}
          >
            ×
          </button>
        </div>

        <h2>{title}</h2>

        {children}
      </div>
    </div>
  );
}

function ModalButtons({
  close,
  action,
  onAction,
}) {
  return (
    <div className="hx-modal-actions">
      <button className="hx-btn" onClick={close}>
        Cancel
      </button>

      <button className="hx-btn light" onClick={onAction}>
        {action} →
      </button>
    </div>
  );
}