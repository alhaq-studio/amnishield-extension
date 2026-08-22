var content=(function(){function e(e){return e}var t=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome;function n(e){return t.runtime.sendMessage(e)}var r=[`chrome:`,`chrome-extension:`,`about:`,`moz-extension:`,`edge:`,`file:`,`view-source:`];function i(e){try{let t=new URL(e);if(r.includes(t.protocol))return null;let n=t.hostname.replace(/^www\./,``);return n?{domain:n,path:t.pathname||`/`}:null}catch{return null}}var a=`
:host { all: initial; }
.amnshield-root {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg, #eedbd0);
  color: var(--ink, #2d1b14);
  opacity: 0;
  transition: opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.amnshield-root.visible { opacity: 1; }

.amnshield-root.theme-sunset {
  --bg: #eedbd0;
  --surface: #ffffff;
  --surface-2: #e6c2af;
  --ink: #2d1b14;
  --accent: #a45833;
  --muted: #755b53;
  --faint: #b9a298;
  --line: #d7bcae;
  --ring: rgba(164, 88, 51, 0.09);
  --state: rgba(164, 88, 51, 0.05);
}

.amnshield-root.theme-emerald {
  --bg: #f3f1ec;
  --surface: #ffffff;
  --surface-2: #d9e8e0;
  --ink: #202724;
  --accent: #3c7a67;
  --muted: #536159;
  --faint: #c1c7c2;
  --line: #dbddd8;
  --ring: rgba(60, 122, 103, 0.09);
  --state: rgba(60, 122, 103, 0.05);
}

.amnshield-root.theme-cosmic {
  --bg: #140d26;
  --surface: #241840;
  --surface-2: #34255c;
  --ink: #f3ecff;
  --accent: #c8b8ff;
  --muted: #988baf;
  --faint: #4e3f66;
  --line: #34255c;
  --ring: rgba(200, 184, 255, 0.15);
  --state: rgba(200, 184, 255, 0.08);
}

.amnshield-root.theme-dark {
  --bg: #0b0b0c;
  --surface: #161617;
  --surface-2: #1f1f21;
  --ink: #edece9;
  --accent: #26a69a;
  --muted: #8f8b84;
  --faint: #65615b;
  --line: #2a2a2c;
  --ring: rgba(237, 236, 233, 0.1);
  --state: rgba(237, 236, 233, 0.06);
}
.card {
  width: min(460px, 86vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 26px;
  padding: 8px;
}
.breath {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 1.5px solid var(--ink, rgba(26, 25, 23, 0.38));
  display: flex;
  align-items: center;
  justify-content: center;
  animation: breathe 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.breath::before {
  content: "";
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  border: 1px solid var(--ring, rgba(26, 25, 23, 0.14));
}
.breath span {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted, rgba(26, 25, 23, 0.52));
}
.breath .cue { display: inline-grid; }
.breath .cue > span {
  grid-area: 1 / 1;
  animation: cue-in 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.breath .cue .out { animation-name: cue-out; }
.breath .static { display: none; }
@keyframes breathe {
  0%, 100% { transform: scale(0.82); }
  50% { transform: scale(1.12); }
}
@keyframes cue-in {
  0%, 44% { opacity: 1; }
  50%, 94% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes cue-out {
  0%, 44% { opacity: 0; }
  50%, 94% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .amnshield-root { transition: none; }
  .breath { animation: none; transform: none; }
  .breath .cue { display: none; }
  .breath .static { display: inline; }
}
.message {
  font-size: 21px;
  line-height: 1.5;
  margin: 0;
  max-width: 38ch;
  white-space: pre-line;
}
.body { display: flex; flex-direction: column; gap: 14px; width: 100%; align-items: center; }
.sentence { font-style: italic; font-size: 15px; opacity: 0.7; max-width: 36ch; margin: 0; }
.note { font-size: 14px; opacity: 0.6; margin: 0; }
input, textarea {
  font-family: inherit;
  font-size: 15px;
  width: 100%;
  max-width: 340px;
  background: transparent;
  border: 1px solid var(--line, rgba(26, 25, 23, 0.25));
  border-radius: 14px;
  padding: 11px 14px;
  color: inherit;
  outline: none;
}
button {
  font-family: inherit;
  font-size: 15px;
  cursor: pointer;
  border-radius: 999px;
  padding: 13px 28px;
  transition: opacity 0.3s ease;
}
.primary {
  border: 1.5px solid var(--accent, currentColor);
  background: var(--accent);
  color: var(--bg, #eedbd0);
  min-width: 220px;
  font-weight: 600;
}
.primary:disabled { opacity: 0.4; cursor: default; }
.ghost {
  border: none;
  background: none;
  color: var(--muted, rgba(26, 25, 23, 0.55));
  padding: 8px;
}
.ghost:hover { opacity: 0.7; }
`;function o(e,t,n=!1){let r=document.createElement(`button`);return r.className=`primary`,r.textContent=e,r.disabled=n,r.onclick=t,r}function s(e){let t=document.createElement(`p`);return t.className=`note`,t.textContent=e,t}function c(){let e=null,n=new Set;function r(){e=document.createElement(`div`),e.id=`amnshield-overlay-host`;let t=e.attachShadow({mode:`open`}),n=document.createElement(`style`);return n.textContent=a,t.appendChild(n),(document.documentElement||document.body).appendChild(e),t}function i(e,t,r){let i=e;if(t(i),i<=0){r();return}let a=setInterval(()=>{--i,t(i),i<=0&&(clearInterval(a),n.delete(a),r())},1e3);n.add(a)}async function c(n,a){e&&m();let o=r();document.documentElement.style.overflow=`hidden`;let s=`emerald`;try{let e=(await t.storage.local.get(`settings`)).settings;e?.theme&&(s=e.theme),s===`system`&&(s=window.matchMedia(`(prefers-color-scheme: dark)`).matches?`dark`:`emerald`)}catch(e){console.error(`Failed to load theme settings for overlay`,e)}let c=document.createElement(`div`);c.className=`amnshield-root theme-${s}`,c.setAttribute(`role`,`dialog`),c.setAttribute(`aria-modal`,`true`),c.setAttribute(`aria-label`,`A mindful pause from AmniShield`),c.innerHTML=`
      <div class="card" tabindex="-1">
        <div class="breath" aria-hidden="true">
          <span class="cue"><span class="in">Breathe in</span><span class="out">Breathe out</span></span>
          <span class="static">Breathe</span>
        </div>
        <p class="message">${u(n.message)}</p>
        <div class="body"></div>
        <button class="ghost">Take me somewhere calmer</button>
      </div>`,o.appendChild(c),requestAnimationFrame(()=>c.classList.add(`visible`)),c.querySelector(`.ghost`).onclick=a.onLeave,c.querySelector(`.card`).focus(),l(c,o,a.onLeave);let h=c.querySelector(`.body`);if(n.source===`focus`){d(h,n,a);return}if(n.groupId===`guardian-policy`){f(h,n,a);return}let g=n.warning,_=e=>{a.onProceed(e),m()};if(g&&g.delaySeconds>0&&n.canProceed){let e=document.createElement(`p`);e.className=`note`,h.appendChild(e),i(g.delaySeconds,t=>e.textContent=`Hold on a moment… ${t}s`,()=>{h.innerHTML=``,p(h,n,_)})}else p(h,n,_)}function d(e,t,n){t.focusExitable?e.appendChild(o(`End focus session`,()=>{n.onEndFocus(),m()})):e.appendChild(s(`I'll stay until the timer is done.`))}function f(e,t,n){e.appendChild(s(`🛡️ Blocked by AmniShield System Policy`))}function p(e,t,n){let r=t.warning;if(!t.canProceed){e.appendChild(s(r?.challenge===`never`?`This one stays closed for now.`:`You've used all your passes for now. Come back later.`));return}if(r?.challenge===`effort`){let t=document.createElement(`p`);t.className=`sentence`,t.textContent=r.sentence;let i=document.createElement(`input`);i.setAttribute(`autocomplete`,`off`),i.placeholder=`Type it here`;let a=o(`Continue`,()=>!a.disabled&&n(),!0),s=()=>a.disabled=i.value.trim()!==r.sentence.trim();i.oninput=s,e.append(t,i,a),s(),i.focus();return}let i=Math.max(1,r?.unlockMinutes??15);if(r?.waitType===`dynamic`){let t=document.createElement(`input`);t.type=`number`,t.min=`1`,t.value=String(i),t.setAttribute(`autocomplete`,`off`);let r=()=>Math.max(1,Math.floor(Number(t.value))||0),a=o(`Unlock for ${r()} min`,()=>n(r()));t.oninput=()=>a.textContent=`Unlock for ${r()} min`,e.append(t,a),t.focus()}else e.appendChild(o(`Unlock for ${i} min`,()=>n(i)))}function m(){for(let e of n)clearInterval(e);n.clear(),document.documentElement.style.overflow=``,e?.remove(),e=null}return{show:c,hide:m}}function l(e,t,n){e.addEventListener(`keydown`,r=>{if(r.key===`Escape`){r.preventDefault(),n();return}if(r.key!==`Tab`)return;let i=Array.from(e.querySelectorAll(`button, input, textarea, [href]`)).filter(e=>!e.hasAttribute(`disabled`));if(i.length===0){r.preventDefault();return}let a=i[0],o=i[i.length-1],s=t.activeElement;r.shiftKey&&(s===a||s===null)?(r.preventDefault(),o.focus()):!r.shiftKey&&s===o&&(r.preventDefault(),a.focus())})}function u(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}var d=e({matches:[`<all_urls>`],runAt:`document_start`,main(){let e=c(),r=()=>{n({type:`visibility`,visible:document.visibilityState===`visible`})};document.addEventListener(`visibilitychange`,r),r();let a=()=>{n({type:`navigated`,url:location.href})};f(a),window.addEventListener(`popstate`,a);let o=()=>{history.length>1?history.back():location.replace(`about:blank`)};t.runtime.onMessage.addListener(t=>{t.type===`evaluate`&&(t.decision.blocked?e.show(t.decision,{onProceed:e=>{let r=i(location.href)?.domain;r&&n({type:`proceed`,groupId:t.decision.groupId,domain:r,minutes:e})},onLeave:o,onEndFocus:()=>void n({type:`endFocus`})}):e.hide())})}});function f(e){let t=t=>function(...n){let r=t.apply(this,n);return e(),r};history.pushState=t(history.pushState),history.replaceState=t(history.replaceState)}var p={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)},m=class e extends Event{static EVENT_NAME=h(`wxt:locationchange`);constructor(t,n){super(e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function h(e){return`${t?.runtime?.id}:content:${e}`}var g=typeof globalThis.navigation?.addEventListener==`function`;function _(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),g?globalThis.navigation.addEventListener(`navigate`,e=>{let n=new URL(e.destination.url);n.href!==t.href&&(window.dispatchEvent(new m(n,t)),t=n)},{signal:e.signal}):e.setInterval(()=>{let e=new URL(location.href);e.href!==t.href&&(window.dispatchEvent(new m(e,t)),t=e)},1e3))}}}var v=class e{static SCRIPT_STARTED_MESSAGE_TYPE=h(`wxt:content-script-started`);id;abortController;locationWatcher=_(this);constructor(e,t){this.contentScriptName=e,this.options=t,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return t.runtime?.id??this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener(`abort`,e),()=>this.signal.removeEventListener(`abort`,e)}block(){return new Promise(()=>{})}setInterval(e,t){let n=setInterval(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(e,t){let n=setTimeout(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(e){let t=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(t)),t}requestIdleCallback(e,t){let n=requestIdleCallback((...t)=>{this.signal.aborted||e(...t)},t);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(e,t,n,r){t===`wxt:locationchange`&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(t.startsWith(`wxt:`)?h(t):t,n,{...r,signal:this.signal})}notifyInvalidated(){this.abort(`Content script context invalidated`),p.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(e.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),this.options?.noScriptStartedPostMessage||window.postMessage({type:e.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},`*`)}verifyScriptStartedEvent(e){let t=e.detail?.contentScriptName===this.contentScriptName,n=e.detail?.messageId===this.id;return t&&!n}listenForNewerScripts(){let t=e=>{!(e instanceof CustomEvent)||!this.verifyScriptStartedEvent(e)||this.notifyInvalidated()};document.addEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(e.SCRIPT_STARTED_MESSAGE_TYPE,t))}},y={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{let{main:e,...t}=d;return await e(new v(`content`,t))}catch(e){throw y.error(`The content script "content" crashed on startup!`,e),e}})()})();
content;