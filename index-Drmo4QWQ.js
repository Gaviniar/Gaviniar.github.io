(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function a(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(t){if(t.ep)return;t.ep=!0;const o=a(t);fetch(t.href,o)}})();const W=[{id:"sunrise",label:"日出",en:"SUNRISE",range:"05:00–07:59",tone:"light",mood:"雪峰染上玫瑰晨光，庄园石阶尚有微露，炉膛余火轻暖。",hearthPower:.45},{id:"morning",label:"上午",en:"MORNING",range:"08:00–11:59",tone:"light",mood:"高纬晴空澄澈通透，晨风掠过草坡与抛光板甲。",hearthPower:.25},{id:"afternoon",label:"下午",en:"AFTERNOON",range:"12:00–16:59",tone:"light",mood:"日照饱满而宁静，铁砧上的骑士头盔泛着暖白高光。",hearthPower:.28},{id:"sunset",label:"夕阳",en:"SUNSET",range:"17:00–18:59",tone:"warm",mood:"熔金晚霞倾泻雪岭，长影漫过回廊，石炉火光渐盛。",hearthPower:.72},{id:"dusk",label:"傍晚",en:"DUSK",range:"19:00–20:59",tone:"dark",mood:"靛蓝暮色笼罩山谷，远方庄园亮起窗灯，初星点缀天际。",hearthPower:.92},{id:"night",label:"深夜",en:"MIDNIGHT",range:"21:00–04:59",tone:"dark",mood:"月华如霜覆于雪山，唯有炉火劈啪作响，照亮盔甲与铁砧。",hearthPower:1}],_=[{id:"spring",label:"春",en:"SPRING",desc:"繁花初绽 · 融雪新绿"},{id:"summer",label:"夏",en:"SUMMER",desc:"翠谷晴岚 · 萤火清风"},{id:"autumn",label:"秋",en:"AUTUMN",desc:"红叶金原 · 霜天明净"},{id:"winter",label:"冬",en:"WINTER",desc:"素雪覆檐 · 围炉暖甲"}],j=[{id:"clear",label:"晴",en:"CLEAR",desc:"天光通透"},{id:"mist",label:"雾",en:"MIST",desc:"山岚漫谷"},{id:"rain",label:"雨",en:"RAIN",desc:"檐下听雨"},{id:"snow",label:"雪",en:"SNOW",desc:"飞雪漫天"}];function q(i=new Date){const e=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),a={};for(const t of e.formatToParts(i))t.type!=="literal"&&(a[t.type]=Number(t.value));const n=a.hour===24?0:a.hour;return{year:a.year,month:a.month,day:a.day,hour:n,minute:a.minute,second:a.second}}function U(i){return i>=5&&i<=7?"sunrise":i>=8&&i<=11?"morning":i>=12&&i<=16?"afternoon":i>=17&&i<=18?"sunset":i>=19&&i<=20?"dusk":"night"}function ds(i){return i>=3&&i<=5?"spring":i>=6&&i<=8?"summer":i>=9&&i<=11?"autumn":"winter"}function w(i){return String(i).padStart(2,"0")}class cs{constructor(e){this.onChange=e;const a=q();this.state={autoTime:!0,timePhase:U(a.hour),season:ds(a.month),weather:"clear",clockShort:`${w(a.hour)}:${w(a.minute)}`,clockFull:`${w(a.hour)}:${w(a.minute)}:${w(a.second)}`,dateStr:`${a.year}.${w(a.month)}.${w(a.day)}`},this._timer=null}start(){this.applyToDOM(),this._timer=setInterval(()=>this.tick(),1e3)}stop(){this._timer&&clearInterval(this._timer)}tick(){var a;const e=q();if(this.state.clockShort=`${w(e.hour)}:${w(e.minute)}`,this.state.clockFull=`${w(e.hour)}:${w(e.minute)}:${w(e.second)}`,this.state.dateStr=`${e.year}.${w(e.month)}.${w(e.day)}`,this.state.autoTime){const n=U(e.hour);n!==this.state.timePhase&&(this.state.timePhase=n,this.applyToDOM())}(a=this.onChange)==null||a.call(this,this.getSnapshot(),"tick")}setTimePhase(e){var a;this.state.autoTime=!1,this.state.timePhase=e,this.applyToDOM(),(a=this.onChange)==null||a.call(this,this.getSnapshot(),"env")}enableAutoTime(){var a;this.state.autoTime=!0;const e=q();this.state.timePhase=U(e.hour),this.applyToDOM(),(a=this.onChange)==null||a.call(this,this.getSnapshot(),"env")}setSeason(e){var a;this.state.season=e,this.applyToDOM(),(a=this.onChange)==null||a.call(this,this.getSnapshot(),"env")}setWeather(e){var a;this.state.weather=e,this.applyToDOM(),(a=this.onChange)==null||a.call(this,this.getSnapshot(),"env")}getSnapshot(){const e=W.find(t=>t.id===this.state.timePhase)||W[5],a=_.find(t=>t.id===this.state.season)||_[2],n=j.find(t=>t.id===this.state.weather)||j[0];return{...this.state,phaseMeta:e,seasonMeta:a,weatherMeta:n}}applyToDOM(){const e=this.getSnapshot(),a=document.documentElement;a.dataset.time=e.timePhase,a.dataset.season=e.season,a.dataset.weather=e.weather,a.dataset.tone=e.phaseMeta.tone,a.style.setProperty("--hearth-power",String(e.phaseMeta.hearthPower))}}class hs{constructor(e,a){this.canvas=e,this.ctx=e.getContext("2d"),this.parallaxEl=a,this.width=window.innerWidth,this.height=window.innerHeight,this.dpr=Math.min(window.devicePixelRatio||1,2),this.state={timePhase:"night",season:"autumn",weather:"clear",hearthPower:1},this.pointer={x:0,y:0,tx:0,ty:0},this.stars=[],this.shootingStar=null,this.embers=[],this.smokePuffs=[],this.windRibbons=[],this.particles=[],this.mistClouds=[],this.rafId=null,this.lastTs=0,this.resize(),this.seedStars(),this.seedEmbers(),this.seedSmoke(),this.seedWindRibbons(),this.seedMist(),this.seedWeatherParticles(),window.addEventListener("resize",()=>this.resize()),window.addEventListener("pointermove",n=>{const t=(n.clientX/window.innerWidth-.5)*2,o=(n.clientY/window.innerHeight-.5)*2;this.pointer.tx=t,this.pointer.ty=o},{passive:!0})}resize(){this.width=window.innerWidth,this.height=window.innerHeight,this.canvas.width=Math.floor(this.width*this.dpr),this.canvas.height=Math.floor(this.height*this.dpr),this.canvas.style.width=`${this.width}px`,this.canvas.style.height=`${this.height}px`,this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}getWind(e){const a=.85+.45*Math.sin(e*.42)+.3*Math.sin(e*1.08+1.3),n=Math.pow(Math.max(0,Math.sin(e*.27-.8)),3)*1.15,t=this.state.weather==="rain"?1.35:this.state.weather==="snow"?1.1:1;return(a+n)*t}imgToScreen(e,a){const n=1.7777777777777777,t=1.045,o=this.width,r=this.height,d=o/r;let h,g;d>n?(h=o*t,g=o/n*t):(g=r*t,h=r*n*t);const y=(o-h)/2-this.pointer.x*13,p=(r-g)/2-this.pointer.y*8;return{x:y+e*h,y:p+a*g,drawW:h,drawH:g}}updateState(e){const a=e.season!==this.state.season||e.weather!==this.state.weather||e.timePhase!==this.state.timePhase;this.state={timePhase:e.timePhase,season:e.season,weather:e.weather,hearthPower:e.phaseMeta.hearthPower},a&&this.seedWeatherParticles()}seedStars(){this.stars=Array.from({length:92},()=>({nx:.2+Math.random()*.62,ny:.04+Math.random()*.34,r:.6+Math.random()*1.5,phase:Math.random()*Math.PI*2,speed:.8+Math.random()*2.1,alpha:.35+Math.random()*.65}))}seedEmbers(){this.embers=Array.from({length:54},()=>this.makeEmber(!0))}makeEmber(e=!1){const a=Math.random()>.45;return{nx:.028+Math.random()*.082,ny:.56+Math.random()*.095,prevNx:.055,prevNy:.6,vx:.012+Math.random()*(a?.042:.022),vy:-(.028+Math.random()*(a?.068:.038)),size:a?1+Math.random()*1.7:1.7+Math.random()*2.3,hot:a,life:e?Math.random()*1.5:0,maxLife:a?1.2+Math.random()*1.5:2+Math.random()*2.2,wobble:Math.random()*Math.PI*2,wobbleFreq:3+Math.random()*4.5}}seedSmoke(){this.smokePuffs=Array.from({length:14},(e,a)=>({nx:.72,ny:.4,age:a/14*5,maxAge:4.5+Math.random()*2,drift:Math.random()*Math.PI*2,scale:.7+Math.random()*.6}))}seedWindRibbons(){this.windRibbons=Array.from({length:5},(e,a)=>this.makeWindRibbon(a*.22))}makeWindRibbon(e=0){return{progress:-e,speed:.22+Math.random()*.16,yBase:.18+Math.random()*.52,amp:14+Math.random()*24,freq:2.2+Math.random()*1.8,length:.16+Math.random()*.14,alpha:.08+Math.random()*.1,phase:Math.random()*Math.PI*2}}seedMist(){this.mistClouds=Array.from({length:10},(e,a)=>({x:a/10*this.width*1.3-this.width*.15,y:this.height*(.26+Math.random()*.36),w:280+Math.random()*440,h:70+Math.random()*115,speed:12+Math.random()*18,alpha:.08+Math.random()*.12}))}seedWeatherParticles(){const{weather:e,season:a,timePhase:n}=this.state;if(this.particles=[],e==="rain"){for(let t=0;t<155;t++)this.particles.push({kind:"rain",x:Math.random()*(this.width+260)-130,y:Math.random()*this.height,len:16+Math.random()*26,speed:680+Math.random()*440,alpha:.16+Math.random()*.28,width:.75+Math.random()*.7});return}if(e==="snow"){for(let t=0;t<130;t++){const o=Math.random();this.particles.push({kind:"snow",x:Math.random()*this.width,y:Math.random()*this.height,r:1.2+o*3.2,speedY:22+o*44,speedX:16+o*28,wobble:Math.random()*Math.PI*2,alpha:.36+o*.56})}return}if(e==="mist"){for(let t=0;t<36;t++)this.particles.push({kind:"mote",x:Math.random()*this.width,y:Math.random()*this.height,r:1+Math.random()*1.9,vx:16+Math.random()*20,vy:(Math.random()-.5)*8,alpha:.14+Math.random()*.18,phase:Math.random()*Math.PI*2});return}if(a==="spring")for(let t=0;t<46;t++)this.particles.push({kind:"petal",x:Math.random()*this.width,y:Math.random()*this.height,size:3.4+Math.random()*4.8,vx:36+Math.random()*44,vy:14+Math.random()*24,rot:Math.random()*Math.PI*2,vrot:(Math.random()-.5)*3.4,wobble:Math.random()*Math.PI*2,hue:Math.random()>.35?"#ffd4e4":"#fff6fa"});else if(a==="autumn"){const t=["#d96b27","#eb9b34","#c13b22","#f4c152","#a8341d"];for(let o=0;o<42;o++)this.particles.push({kind:"leaf",x:Math.random()*this.width,y:Math.random()*this.height,size:4.5+Math.random()*5.6,vx:42+Math.random()*54,vy:16+Math.random()*28,rot:Math.random()*Math.PI*2,vrot:(Math.random()-.5)*3.6,wobble:Math.random()*Math.PI*2,color:t[o%t.length]})}else if(a==="summer"&&(n==="dusk"||n==="night"))for(let t=0;t<38;t++)this.particles.push({kind:"firefly",x:this.width*(.18+Math.random()*.68),y:this.height*(.34+Math.random()*.54),r:1.5+Math.random()*2.3,vx:(Math.random()-.35)*18,vy:(Math.random()-.5)*12,phase:Math.random()*Math.PI*2,speed:1.3+Math.random()*2.2});else if(a==="winter")for(let t=0;t<52;t++)this.particles.push({kind:"snow",x:Math.random()*this.width,y:Math.random()*this.height,r:.9+Math.random()*2,speedY:12+Math.random()*22,speedX:14+Math.random()*24,wobble:Math.random()*Math.PI*2,alpha:.28+Math.random()*.38});else for(let t=0;t<40;t++)this.particles.push({kind:t%3===0?"seed":"mote",x:Math.random()*this.width,y:Math.random()*this.height,r:1.2+Math.random()*2,vx:26+Math.random()*34,vy:-6+Math.random()*14,alpha:.26+Math.random()*.34,phase:Math.random()*Math.PI*2})}start(){this.lastTs=performance.now();const e=a=>{const n=Math.min((a-this.lastTs)/1e3,.05);this.lastTs=a,this.render(a/1e3,n),this.rafId=requestAnimationFrame(e)};this.rafId=requestAnimationFrame(e)}stop(){this.rafId&&cancelAnimationFrame(this.rafId)}render(e,a){const n=this.getWind(e);this.pointer.x+=(this.pointer.tx-this.pointer.x)*Math.min(1,a*4.5),this.pointer.y+=(this.pointer.ty-this.pointer.y)*Math.min(1,a*4.5),this.parallaxEl&&(this.parallaxEl.style.transform=`translate3d(${(-this.pointer.x*13).toFixed(2)}px, ${(-this.pointer.y*8).toFixed(2)}px, 0) scale(1.045)`);const t=this.ctx;t.clearRect(0,0,this.width,this.height);const{timePhase:o,weather:r,hearthPower:d}=this.state,h=document.documentElement.dataset.artMode==="native";if((o==="night"||o==="dusk")&&r!=="rain"){const s=(o==="night"?h?.38:.94:.36)*(r==="mist"?.42:1);t.save();for(const l of this.stars){const c=this.imgToScreen(l.nx,l.ny),v=.52+.48*Math.sin(e*l.speed+l.phase);t.fillStyle=`rgba(235, 245, 255, ${(l.alpha*v*s).toFixed(3)})`,t.beginPath(),t.arc(c.x,c.y,l.r,0,Math.PI*2),t.fill()}if(o==="night"&&r==="clear"&&(!this.shootingStar&&Math.random()<a*.16&&(this.shootingStar={x:this.width*(.26+Math.random()*.36),y:this.height*(.06+Math.random()*.14),vx:410+Math.random()*190,vy:120+Math.random()*90,life:0,maxLife:.72}),this.shootingStar)){const l=this.shootingStar;l.x+=l.vx*a,l.y+=l.vy*a,l.life+=a;const c=1-l.life/l.maxLife;if(c<=0)this.shootingStar=null;else{const v=t.createLinearGradient(l.x,l.y,l.x-l.vx*.17,l.y-l.vy*.17);v.addColorStop(0,`rgba(255,255,255,${(c*.88).toFixed(3)})`),v.addColorStop(1,"rgba(255,255,255,0)"),t.strokeStyle=v,t.lineWidth=1.6,t.beginPath(),t.moveTo(l.x,l.y),t.lineTo(l.x-l.vx*.17,l.y-l.vy*.17),t.stroke()}}t.restore()}if((o==="sunrise"||o==="sunset")&&r==="clear"){t.save();const s=o==="sunrise"?"255, 210, 162":"255, 144, 74",l=this.imgToScreen(o==="sunrise"?.66:.34,.15),c=t.createRadialGradient(l.x,l.y,10,l.x,l.y,this.width*.56);c.addColorStop(0,`rgba(${s}, 0.22)`),c.addColorStop(.5,`rgba(${s}, 0.06)`),c.addColorStop(1,`rgba(${s}, 0)`),t.globalCompositeOperation="screen",t.fillStyle=c,t.fillRect(0,0,this.width,this.height),t.restore()}t.save();const g=o==="night"||o==="dusk"?"185, 200, 224":"244, 246, 250",y=h?.846:.715,p=h?.555:.415;for(const s of this.smokePuffs){s.age+=a,s.age>=s.maxAge&&(s.age=0,s.drift=Math.random()*Math.PI*2);const l=s.age/s.maxAge,c=y+l*.055*n+Math.sin(e*1.4+s.drift)*.004*l,v=p-l*.115,u=this.imgToScreen(c,v),$=(6+l*26)*s.scale,S=Math.sin(l*Math.PI)*(h?.065:o==="night"?.1:.16),P=t.createRadialGradient(u.x,u.y,1,u.x,u.y,$);P.addColorStop(0,`rgba(${g}, ${S.toFixed(3)})`),P.addColorStop(1,`rgba(${g}, 0)`),t.fillStyle=P,t.beginPath(),t.arc(u.x,u.y,$,0,Math.PI*2),t.fill()}t.restore();const m=r==="mist"?1:r==="rain"?.52:o==="sunrise"?.34:.08;t.save();const b=o==="night"||o==="dusk"?"150, 178, 224":o==="sunset"?"255, 208, 182":"238, 246, 255";for(const s of this.mistClouds){s.x+=s.speed*n*a,s.x-s.w>this.width&&(s.x=-s.w);const l=t.createRadialGradient(s.x,s.y,s.h*.1,s.x,s.y,s.w*.65);l.addColorStop(0,`rgba(${b}, ${(s.alpha*m).toFixed(3)})`),l.addColorStop(1,`rgba(${b}, 0)`),t.fillStyle=l,t.beginPath(),t.ellipse(s.x,s.y,s.w*.65,s.h*.65,0,0,Math.PI*2),t.fill()}t.restore(),t.save();const L=o==="night"||o==="dusk"?"210, 228, 255":o==="sunset"?"255, 232, 200":"255, 255, 255";for(const s of this.windRibbons){if(s.progress+=s.speed*(.7+n*.55)*a,s.progress>1.35&&Object.assign(s,this.makeWindRibbon(.25+Math.random()*.55)),s.progress<-.1)continue;const l=(s.progress-s.length)*this.width,c=s.progress*this.width,v=s.yBase*this.height,u=Math.sin(Math.max(0,Math.min(1,s.progress/1.15))*Math.PI),$=s.alpha*u*Math.min(1.4,n*.85);if($<=.008)continue;const S=t.createLinearGradient(l,v,c,v);S.addColorStop(0,`rgba(${L}, 0)`),S.addColorStop(.5,`rgba(${L}, ${$.toFixed(3)})`),S.addColorStop(1,`rgba(${L}, 0)`),t.strokeStyle=S,t.lineWidth=1.25,t.beginPath();const P=18;for(let G=0;G<=P;G++){const H=G/P,ts=l+(c-l)*H,es=v+Math.sin(H*Math.PI*s.freq+e*2.2+s.phase)*s.amp*(.4+.6*H);G===0?t.moveTo(ts,es):t.lineTo(ts,es)}t.stroke()}t.restore();const x=this.imgToScreen(h?.055:.068,h?.48:.585),A=.86+.14*Math.sin(e*8.2)+.08*Math.sin(e*19.7)+.04*Math.cos(e*31.3),B=(h?.08+d*.14:.18+d*.38)*A;t.save(),t.globalCompositeOperation="screen";const ss=Math.max(this.width,this.height)*(h?.15:.22+d*.16),N=t.createRadialGradient(x.x,x.y,4,x.x,x.y,ss);if(N.addColorStop(0,`rgba(255, 206, 112, ${(B*.9).toFixed(3)})`),N.addColorStop(.28,`rgba(255, 118, 36, ${(B*.48).toFixed(3)})`),N.addColorStop(.65,`rgba(218, 66, 16, ${(B*.14).toFixed(3)})`),N.addColorStop(1,"rgba(218, 66, 16, 0)"),t.fillStyle=N,t.beginPath(),t.arc(x.x,x.y,ss,0,Math.PI*2),t.fill(),!h)for(let s=0;s<3;s++){const l=x.x+Math.sin(e*(7+s*3.1)+s*2)*(6+s*3),c=x.y-4-Math.abs(Math.sin(e*(9+s*2.5)))*14,v=(18+s*10)*A,u=t.createRadialGradient(l,c,1,l,c,v);u.addColorStop(0,`rgba(255, 244, 196, ${(.34*A).toFixed(3)})`),u.addColorStop(.5,`rgba(255, 132, 34, ${(.22*A).toFixed(3)})`),u.addColorStop(1,"rgba(255, 92, 12, 0)"),t.fillStyle=u,t.beginPath(),t.arc(l,c,v,0,Math.PI*2),t.fill()}for(const s of this.embers){s.prevNx=s.nx,s.prevNy=s.ny,s.life+=a,s.life>=s.maxLife&&(Object.assign(s,this.makeEmber(!1)),s.prevNx=s.nx,s.prevNy=s.ny);const l=n*.022*(s.life/s.maxLife+.35);s.nx+=(s.vx+l+Math.sin(e*s.wobbleFreq+s.wobble)*.016)*a,s.ny+=(s.vy+Math.cos(e*2.4+s.wobble)*.008)*a;const c=this.imgToScreen(s.nx,s.ny),v=this.imgToScreen(s.prevNx,s.prevNy),u=1-s.life/s.maxLife,$=.72+.28*Math.sin(e*22+s.wobble),S=Math.sin(u*Math.PI)*(.58+d*.42)*$;if(S<=.02)continue;const P=c.x-v.x,G=c.y-v.y;t.strokeStyle=s.hot?`rgba(255, 222, 130, ${(S*.85).toFixed(3)})`:`rgba(255, 138, 46, ${(S*.65).toFixed(3)})`,t.lineWidth=s.size*.85,t.lineCap="round",t.beginPath(),t.moveTo(c.x-P*2.4,c.y-G*2.4),t.lineTo(c.x,c.y),t.stroke(),t.fillStyle=s.hot?`rgba(255, 248, 210, ${S.toFixed(3)})`:`rgba(255, ${Math.floor(150+u*90)}, 64, ${S.toFixed(3)})`,t.beginPath(),t.arc(c.x,c.y,s.size*(.55+u*.55),0,Math.PI*2),t.fill()}t.restore(),t.save();for(const s of this.particles)if(s.kind==="rain"){const l=.22*n;s.x+=s.speed*l*a,s.y+=s.speed*a,(s.y>this.height+30||s.x>this.width+130)&&(s.y=-30,s.x=Math.random()*(this.width+260)-180);const c=o==="night"||o==="dusk"?"186, 214, 248":"230, 242, 255";t.strokeStyle=`rgba(${c}, ${s.alpha})`,t.lineWidth=s.width,t.beginPath(),t.moveTo(s.x,s.y),t.lineTo(s.x+s.len*l,s.y+s.len),t.stroke()}else if(s.kind==="snow"){s.x+=(s.speedX*n+Math.sin(e*1.6+s.wobble)*16)*a,s.y+=s.speedY*a,s.y>this.height+10&&(s.y=-10,s.x=Math.random()*this.width),s.x>this.width+10&&(s.x=-10),s.x<-10&&(s.x=this.width+10);const l=s.x<this.width*.28&&s.y>this.height*.35;t.fillStyle=l?`rgba(255, 224, 185, ${(s.alpha*.94).toFixed(3)})`:`rgba(246, 251, 255, ${s.alpha.toFixed(3)})`,t.beginPath(),t.arc(s.x,s.y,s.r,0,Math.PI*2),t.fill()}else if(s.kind==="petal")s.x+=(s.vx*n+Math.sin(e*1.9+s.wobble)*16)*a,s.y+=(s.vy+Math.cos(e*1.5+s.wobble)*10)*a,s.rot+=s.vrot*n*a,(s.x>this.width+20||s.y>this.height+20)&&(s.x=Math.random()<.5?-20:Math.random()*this.width*.75,s.y=Math.random()<.5?Math.random()*this.height*.6:-15),t.save(),t.translate(s.x,s.y),t.rotate(s.rot),t.fillStyle=s.hue,t.globalAlpha=o==="night"?.48:.82,t.beginPath(),t.ellipse(0,0,s.size,s.size*.5,0,0,Math.PI*2),t.fill(),t.restore();else if(s.kind==="leaf")s.x+=(s.vx*n+Math.sin(e*2.1+s.wobble)*20)*a,s.y+=(s.vy+Math.cos(e*1.7+s.wobble)*12)*a,s.rot+=s.vrot*n*a,(s.x>this.width+24||s.y>this.height+24)&&(s.x=Math.random()<.55?-20:Math.random()*this.width*.7,s.y=Math.random()<.5?Math.random()*this.height*.55:-20),t.save(),t.translate(s.x,s.y),t.rotate(s.rot),t.fillStyle=s.color,t.globalAlpha=o==="night"?.56:.88,t.beginPath(),t.moveTo(0,-s.size),t.quadraticCurveTo(s.size*.82,0,0,s.size),t.quadraticCurveTo(-s.size*.82,0,0,-s.size),t.fill(),t.restore();else if(s.kind==="firefly"){s.x+=(s.vx+n*6+Math.sin(e*1.2+s.phase)*14)*a,s.y+=(s.vy+Math.cos(e*.95+s.phase)*9)*a,s.x>this.width*.88&&(s.x=this.width*.16),s.x<this.width*.14&&(s.x=this.width*.84),s.y<this.height*.3&&(s.y=this.height*.86),s.y>this.height*.88&&(s.y=this.height*.32);const l=.2+.8*Math.pow(.5+.5*Math.sin(e*s.speed+s.phase),2),c=t.createRadialGradient(s.x,s.y,.2,s.x,s.y,s.r*5.2);c.addColorStop(0,`rgba(235, 255, 168, ${(l*.96).toFixed(3)})`),c.addColorStop(.4,`rgba(186, 235, 92, ${(l*.42).toFixed(3)})`),c.addColorStop(1,"rgba(186, 235, 92, 0)"),t.fillStyle=c,t.beginPath(),t.arc(s.x,s.y,s.r*5.2,0,Math.PI*2),t.fill()}else s.kind==="seed"?(s.x+=(s.vx*n+Math.sin(e*2.1+s.phase)*10)*a,s.y+=(s.vy+Math.cos(e*1.4+s.phase)*9)*a,s.x>this.width+16&&(s.x=-16),s.y<-16&&(s.y=this.height+16),s.y>this.height+16&&(s.y=-16),t.strokeStyle=`rgba(255, 253, 240, ${(s.alpha*.9).toFixed(3)})`,t.lineWidth=.8,t.beginPath(),t.moveTo(s.x,s.y),t.lineTo(s.x-4,s.y-5),t.moveTo(s.x,s.y),t.lineTo(s.x+2,s.y-6),t.moveTo(s.x,s.y),t.lineTo(s.x-1,s.y+4),t.stroke()):s.kind==="mote"&&(s.x+=s.vx*n*a,s.y+=(s.vy+Math.sin(e*1.3+s.phase)*6)*a,s.x>this.width+10&&(s.x=-10),s.y<-10&&(s.y=this.height+10),s.y>this.height+10&&(s.y=-10),t.fillStyle=`rgba(255, 248, 224, ${s.alpha.toFixed(3)})`,t.beginPath(),t.arc(s.x,s.y,s.r,0,Math.PI*2),t.fill());t.restore()}}const V="jpg";function ps(i){return i==="sunrise"||i==="sunset"?"golden":i==="dusk"||i==="night"?"night":"day"}class gs{constructor(e,a){this.slots=[e,a],this.activeIdx=0,this.currentKey="",this.cache=new Map,this.requestSeq=0}probeImage(e){return new Promise(a=>{const n=new Image;n.onload=()=>a(!0),n.onerror=()=>a(!1),n.src=e})}async resolveAsset(e,a){const n=`${e}-${a}`;if(this.cache.has(n))return this.cache.get(n);const t=`./assets/manor-${e}-${a}.${V}`;if(await this.probeImage(t)){const d={src:t,mode:"native",fallbackSeasonTint:""};return this.cache.set(n,d),d}if(a!=="day"){const d=`./assets/manor-${e}-day.${V}`;if(await this.probeImage(d)){const h={src:d,mode:"simulated",fallbackSeasonTint:""};return this.cache.set(n,h),h}}const r={src:`./assets/manor-winter-day.${V}`,mode:"simulated",fallbackSeasonTint:""};return this.cache.set(n,r),r}async update(e,a){const n=ps(a),t=`${e}-${n}`,o=++this.requestSeq,r=await this.resolveAsset(e,n);if(o!==this.requestSeq||(document.documentElement.dataset.artMode=r.mode,document.documentElement.dataset.lightKey=n,t===this.currentKey&&this.slots[this.activeIdx].classList.contains("is-active")))return;this.currentKey=t;const d=this.activeIdx===0?1:0,h=this.slots[d],g=this.slots[this.activeIdx];h.dataset.fallbackSeason=r.fallbackSeasonTint,h.src=r.src,requestAnimationFrame(()=>{o===this.requestSeq&&(h.classList.add("is-active"),g.classList.remove("is-active"),this.activeIdx=d)})}}const f={brandName:"Gavin's Blog",bio:"小舟从此逝，江海寄余生",coords:"UTC+8 · BEIJING // PERSONAL BLOG",established:"2026",links:[],nowList:[]},T=[],Y=["全部","技术攻略","设计手记","随笔思考","工具箱"],M=[{slug:"google-cloud-vps-ai-pro",index:"01",pinned:!1,category:"技术攻略",categoryEn:"GUIDE // CLOUD",date:"2026.02.18",readTime:"8 MIN",title:"用 Google AI Pro 每月 $10 赠金，搭建长期免维护的谷歌云 VPS",shortTitle:"Google Cloud 免费 VPS 搭建与 AI Pro $10 赠金抵扣完整指南",excerpt:"以美国俄勒冈 Always Free 永久免费层级为底座，叠加 Google AI Pro 每月 $10 赠金自动抵扣，系统梳理入站/出站与 CDN 互联流量规则、无域名与有域名双方案一键部署，以及试用期续活与链式代理提速实践。",tags:["GCP","AI Pro","sing-box","VPS","自托管"],toc:[{id:"sec-overview",num:"00",label:"核心架构与指标"},{id:"sec-billing",num:"01",label:"结算账号与 $10 赠金"},{id:"sec-vm",num:"02",label:"Always Free 实例矩阵"},{id:"sec-traffic",num:"03",label:"流量规则与 CDN 计费"},{id:"sec-deploy",num:"04",label:"SSH 与双方案一键部署"},{id:"sec-advanced",num:"05",label:"试用期续活与链式代理"},{id:"sec-sources",num:"06",label:"参考资料与官方链接"}],renderContent:vs}];function ms(i){return M.find(e=>e.slug===i)||M[0]}function os(){const i=new Map;for(const e of M)for(const a of e.tags)i.set(a,(i.get(a)||0)+1);return Array.from(i.entries()).map(([e,a])=>({name:e,count:a})).sort((e,a)=>a.count-e.count)}function vs(){return`
    <!-- 00 / MASTHEAD & KPI SPEC STRIP -->
    <header class="art-masthead" id="sec-overview">
      <div class="art-kicker-row">
        <span class="swiss-kicker">技术攻略 // GUIDE 01 · INFRASTRUCTURE</span>
        <div class="art-tags">
          <span class="swiss-tag swiss-tag-tech">GCP ALWAYS FREE</span>
          <span class="swiss-tag swiss-tag-accent">AI PRO $10</span>
          <span class="swiss-tag">SING-BOX</span>
          <span class="swiss-tag">MIHOMO</span>
        </div>
      </div>
      <h1 class="art-h1">用 Google AI Pro 每月 $10 赠金，<br />搭建长期免维护的谷歌云 VPS</h1>
      <p class="art-lead">
        借助 Google Cloud 美国俄勒冈区的 Always Free 永久免费层级，配合 Google AI Pro 附带的每月 $10 开发者赠金自动抵扣，我们完全可以零运维、近乎零成本地长期运行一台独享 IP 的海外 VPS。本文将从结算账号绑定、实例避坑配置、入站/出站与 CDN 互联计费原理，到无域名/有域名双方案一键部署与进阶链式代理，完整梳理整套搭建流程。
      </p>

      <div class="swiss-kpi-grid">
        <div class="swiss-kpi-item">
          <div class="swiss-kpi-num">200 GiB</div>
          <div class="swiss-kpi-tag">FREE STANDARD EGRESS</div>
          <div class="swiss-kpi-desc">标准网络层级每月免费单向出站额度（入站全部免费，额度不打对折）</div>
        </div>
        <div class="swiss-kpi-item is-accent">
          <div class="swiss-kpi-num">$10 / 月</div>
          <div class="swiss-kpi-tag">AUTO-APPLIED CREDIT</div>
          <div class="swiss-kpi-desc">Google AI Pro 开发者赠金自动抵扣，轻松覆盖极少量 CDN 互联微费</div>
        </div>
        <div class="swiss-kpi-item">
          <div class="swiss-kpi-num">62–89 GB</div>
          <div class="swiss-kpi-tag">REAL-WORLD USAGE</div>
          <div class="swiss-kpi-desc">日常重度主力连续三个月实测出站用量，尚不足免费额度一半</div>
        </div>
      </div>
    </header>

    <!-- 01 / BILLING & CREDITS -->
    <section class="art-section" id="sec-billing">
      <div class="sec-header">
        <div class="sec-num">01</div>
        <div>
          <h2 class="sec-title">开通 Google Cloud 结算账号并自动绑定 $10 赠金</h2>
          <p class="sec-subtitle">新旧账号皆可享受 Always Free 永久免费层级，核心在于提前锁定同一账号的月度自动续领。</p>
        </div>
      </div>

      <p class="art-p">
        新注册 Google Cloud 账号可获 <strong>90 天 $300 试用赠金</strong>，而已有旧账号（即便曾用过试用期）只要升级为完整结算账号，依然享有永久免费层级。关键在于提前把 Google AI Pro 福利绑定到同一结算账号，并开启自动续领。
      </p>

      <div class="swiss-step-cols">
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">注册与付款资料要点</h3>
            <span class="swiss-card-code">STEP 01.A</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>打开 <a href="https://cloud.google.com/free?hl=zh-CN" target="_blank" rel="noopener noreferrer">Google Cloud 免费计划页面</a>，使用<strong>已订阅 Google AI Pro 的同一个 Google 账号</strong>登录。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>创建付款资料时选择<strong>个人</strong>；账单地址建议填写美国免税州（如俄勒冈州）以减少潜在税费。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>绑定可正常扣款的外币 Visa / Mastercard 信用卡或借记卡（可重复使用，<strong>勿绑空卡</strong>以免后续扣款失败被停机）。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span>首次进入 Compute Engine 提示启用 API 属正常操作，启用 API 本身不产生费用。</span>
            </li>
          </ol>
        </div>

        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">领取并自动应用 AI Pro 赠金</h3>
            <span class="swiss-card-code">STEP 01.B</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>前往 <a href="https://me.developers.google.com/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">Google 开发者计划福利页面</a>，用同一 Google 账号登录。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>找到 <strong>Google AI Pro 每月 $10 Google Cloud 赠金</strong>卡片，选择你的结算账号，并务必勾选<strong>“始终使用此结算账号”</strong>（<a href="https://developers.google.com/profile/help/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">开发者计划 FAQ</a>）。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>若页面显示促销代码，复制后前往 <code>console.cloud.google.com/billing/redeem</code> 兑换绑定。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span>发放按首次领取的月度周年日循环，每笔赠金自发放起 <strong>1 年内有效</strong>，自动顺延抵扣账单。</span>
            </li>
          </ol>
        </div>
      </div>

      <div class="swiss-callout is-tech">
        <strong>非美区结算账号无需重来：</strong>若此前已选了日本等非美国区，结算国家<strong>不影响</strong>你在控制台选择美国俄勒冈机房，每月 $10 赠金也会按汇率自动折算抵扣（详见 <a href="https://docs.cloud.google.com/billing/docs/how-to/modify-billing-account" target="_blank" rel="noopener noreferrer">官方结算文档</a>）。
      </div>
    </section>

    <!-- 02 / VM SPECIFICATION MATRIX -->
    <section class="art-section" id="sec-vm">
      <div class="sec-header">
        <div class="sec-num">02</div>
        <div>
          <h2 class="sec-title">按官方免费层级精确创建 VM 实例</h2>
          <p class="sec-subtitle">Compute Engine → 虚拟机实例 → 创建实例。每一项参数均直接关系到账单是否归零。</p>
        </div>
      </div>

      <div class="swiss-callout">
        <strong>关于估算费用显示 $7/月：</strong>创建页右侧的“每月估算费用”按原价计算，<strong>不会</strong>扣除免费额度；实际出账时，只要全部参数严格符合 <a href="https://docs.cloud.google.com/free/docs/free-cloud-features?hl=zh-cn" target="_blank" rel="noopener noreferrer">Always Free 规则</a>，系统会自动减免为 <strong>$0</strong>。
      </div>

      <div class="spec-matrix" role="table" aria-label="VM 实例必选配置矩阵">
        <div class="spec-row" role="row">
          <div class="spec-key">区域<span class="spec-key-en">REGION</span></div>
          <div class="spec-val"><span class="param-pill">us-west1</span> <span>俄勒冈</span></div>
          <div class="spec-note">仅俄勒冈、爱荷华 (<code>us-central1</code>)、南卡 (<code>us-east1</code>) 免费；俄勒冈距亚洲最近、延迟最优。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">机器系列与规格<span class="spec-key-en">MACHINE TYPE</span></div>
          <div class="spec-val"><span class="param-pill">E2 · e2-micro</span> <span>标准预配</span></div>
          <div class="spec-note">必须为非抢占式标准预配；免费层级每月覆盖 1 台实例的完整运行时长。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">系统与启动磁盘<span class="spec-key-en">OS &amp; BOOT DISK</span></div>
          <div class="spec-val"><span class="param-pill">Ubuntu 22.04</span> <span class="param-pill">标准盘 30 GB</span></div>
          <div class="spec-note">勿选 Windows（含授权费），勿选 SSD 或平衡永久性磁盘，容量严格不超过 30 GB。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">数据保护<span class="spec-key-en">DATA PROTECTION</span></div>
          <div class="spec-val"><span class="param-pill is-red">必须改：无备份</span></div>
          <div class="spec-note">切记关闭默认开启的快照时间表，否则会产生额外的快照存储扣费。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">防火墙与外部 IP<span class="spec-key-en">FIREWALL &amp; IP</span></div>
          <div class="spec-val"><span class="param-pill">HTTP / HTTPS</span> <span class="param-pill">临时 IP</span></div>
          <div class="spec-note">静态 IP 关机闲置会扣费；临时 IP 只要实例不关机重启通常长期保持不变。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">网络服务层级<span class="spec-key-en">NETWORK TIER</span></div>
          <div class="spec-val"><span class="param-pill is-red">标准 Standard</span></div>
          <div class="spec-note">务必从默认“高级”改为<strong>标准层级</strong>；仅 <a href="https://cloud.google.com/network-tiers/pricing" target="_blank" rel="noopener noreferrer">标准层级</a> 含每月 200 GiB 免费出站，超出按 $0.085/GiB 计费。</div>
        </div>
        <div class="spec-row" role="row">
          <div class="spec-key">VPC 端口放行<span class="spec-key-en">VPC INGRESS</span></div>
          <div class="spec-val"><span class="param-pill">TCP / UDP 放行</span></div>
          <div class="spec-note">部署节点或开启本地订阅后，在 VPC 网络 → 防火墙规则中放行对应的随机节点与订阅端口。</div>
        </div>
      </div>
    </section>

    <!-- 03 / TRAFFIC BILLING RULES: INGRESS, EGRESS & CLOUDFLARE CDN INTERCONNECT -->
    <section class="art-section" id="sec-traffic">
      <div class="sec-header">
        <div class="sec-num">03</div>
        <div>
          <h2 class="sec-title">流量计费规则：入站、出站与 Cloudflare CDN 互联</h2>
          <p class="sec-subtitle">读懂谷歌云的三层流量计费逻辑，就能彻底避免莫名账单，把每月 200 GiB 免费额度用到极致。</p>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">03.1</span>入站流量（Ingress）：完全免费</h3>
      <p class="art-p">
        入站流量是指数据从外部互联网进入你的谷歌云 VPS。无论体量多大，谷歌云对入站流量均实行 <strong>100% 免费</strong>政策。在代理使用场景中，当你通过 VPS 观看 YouTube 或浏览网页时，VPS 从目标网站拉取视频与页面数据的过程属于“入站”，完全不花钱；同理，从本地设备向 VPS 上传文件也计为入站，同样免费。
      </p>

      <h3 class="art-subhead"><span class="sub-idx">03.2</span>出站流量（Egress）：核心计费项</h3>
      <p class="art-p">
        出站流量是指数据从谷歌云 VPS 发往外部互联网——例如 VPS 将拉取到的视频数据转发回你的手机或电脑，或是 VPS 向目标网站发出访问请求。谷歌云的出站流量划分为两种网络层级，创建实例时系统默认勾选高级层级，<strong>必须手动切换为标准层级</strong>才能享受免费额度：
      </p>

      <div class="tier-table-wrap">
        <table class="swiss-table" aria-label="谷歌云标准层级与高级层级流量计费对比">
          <thead>
            <tr>
              <th>对比项</th>
              <th class="col-good">标准层级（Standard Tier）✅ 必选</th>
              <th class="col-bad">高级层级（Premium Tier）❌ 默认</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>路由线路</td>
              <td>走普通公网线路，延迟略高但日常完全可用</td>
              <td>走谷歌全球私有骨干网，速度与延迟更优</td>
            </tr>
            <tr>
              <td>每月免费额度</td>
              <td><strong>200 GiB</strong>（全账号共享）</td>
              <td>仅 <strong>1 GiB</strong>（发往中国大陆甚至无免费额度）</td>
            </tr>
            <tr>
              <td>超出后单价（美区）</td>
              <td><code>$0.085 / GiB</code>（前 10 TiB）</td>
              <td><code>$0.12 / GiB</code> 起（发往中国大陆高达 <code>$0.23 / GiB</code>）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="swiss-callout is-tech">
        <strong>为什么说“200 GiB 不打对折”？</strong> 许多常规 VPS 商家采用“双向计费”（入站 + 出站合并统计），看 1 GB 视频实际要扣掉 2 GB 流量。而谷歌云<strong>只计出站</strong>：VPS 从目标站点下载 1 GB 视频（入站免费）→ 再转发到你的终端（出站 1 GB），因此 200 GiB 免费额度可以实打实用满整整 200 GiB 的真实下载量。
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">重度主力连续 3 个月实测出站用量 vs 200 GiB 免费上限</h3>
          <span class="chart-ceiling-badge">免费红线 · 200 GiB / 月</span>
        </div>

        <div class="bar-chart-rows">
          <div class="bar-row">
            <div class="bar-label">第 1 月实测<span>MONTH 01</span></div>
            <div class="bar-track" title="62 GB / 200 GB (31.0%)">
              <div class="bar-fill" style="width: 28.2%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">62 GB<small>31.0% · 余 138 GB</small></div>
          </div>

          <div class="bar-row">
            <div class="bar-label">第 2 月实测<span>MONTH 02</span></div>
            <div class="bar-track" title="83 GB / 200 GB (41.5%)">
              <div class="bar-fill" style="width: 37.7%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">83 GB<small>41.5% · 余 117 GB</small></div>
          </div>

          <div class="bar-row">
            <div class="bar-label">第 3 月实测<span>MONTH 03</span></div>
            <div class="bar-track" title="89 GB / 200 GB (44.5%)">
              <div class="bar-fill" style="width: 40.5%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">89 GB<small>44.5% · 余 111 GB</small></div>
          </div>
        </div>

        <div class="chart-axis">
          <span></span>
          <div class="chart-ticks">
            <span>0 GB</span>
            <span>55 GB</span>
            <span>110 GB</span>
            <span>165 GB</span>
            <span style="color: var(--accent-cobalt); font-weight: 700;">200 GB 免费线</span>
          </div>
          <span></span>
        </div>

        <p class="chart-caption">
          参考俄勒冈标准层级结算报告实测：即便作为日常主力（查资料、看高清视频、上传素材），月均出站也仅在 60–90 GB 左右，余量超过 <strong>55%</strong>。
        </p>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">03.3</span>Cloudflare 为什么会导致单独扣费？</h3>
      <p class="art-p">
        谷歌云与 Cloudflare 等大型 CDN 服务商之间存在单独的 <strong>CDN 互联（CDN Interconnect）</strong>计费项。凡是从谷歌云 VPS 出站并流向 Cloudflare 网络的数据，<strong>不会计入每月 200 GiB 的标准层级免费额度</strong>，而是直接按 CDN 互联费率（通常每 GiB 几美分）单独出账。
      </p>

      <p class="art-p">
        <strong>1. 必须避开的 4 个“大额反撸”操作：</strong>以下任意一项都会让节点流量大规模流经 Cloudflare，使 200 GiB 免费额度形同虚设并触发明显扣费：
      </p>

      <div class="redline-detail-grid">
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>域名解析开启“小黄云”代理</div>
          <p>客户端连接节点时，VPS 发回给你的全部下行数据都会先经由 Cloudflare，全额按 CDN 互联出站计费。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>使用 Cloudflare Argo 隧道</div>
          <p>原理与开启代理一致，全部转发流量都会穿过 Cloudflare 边缘网络，产生持续互联出账。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>使用 Cloudflare CDN 回源</div>
          <p>将 VPS 作为源站接入 Cloudflare CDN 加速，源站向 Cloudflare 回传内容同样触发大额互联出站。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>在 VPS 端开启 Cloudflare WARP</div>
          <p>VPS 发出的一切外部访问请求都会经由 Cloudflare WARP 节点转出，直接触发互联计费。</p>
        </div>
      </div>

      <p class="art-p">
        <strong>2. 为什么避开了所有坑，账单里依然会有几美分？</strong> 互联网上有大量常用网站（例如 ChatGPT、X / Twitter 等）本身托管在 Cloudflare CDN 之后。当你通过谷歌云 VPS 访问这些网站时，VPS 发往它们的请求数据（如输入的提问文本、点击指令与请求头）属于“出站至 Cloudflare”，仍会触发 CDN 互联计费。好在这类请求体积微乎其微（通常仅几 KB），而网站返回的网页、图片与回答正文属于免费的入站流量，随后由 VPS 直连发往你的设备走的是 200 GiB 标准层级免费额度。因此正常中等强度使用，全年往往只产生几美分（长期实测一年约 <strong>$0.05</strong>），完全会被每月 $10 的 AI Pro 赠金无感抵扣。
      </p>

      <div class="swiss-callout is-warn">
        <strong>重要提醒：</strong>正是因为这几美分不可避免的微小账单，90 天试用期结束并升级为完整账号后，<strong>绑定的银行卡必须能够正常扣款</strong>（切勿使用空卡或失效卡）。一旦后续扣款失败，谷歌云会直接封停整个结算账号与实例。
      </div>
    </section>

    <!-- 04 / SSH LOGIN & DUAL-MODE ONE-CLICK DEPLOYMENT -->
    <section class="art-section" id="sec-deploy">
      <div class="sec-header">
        <div class="sec-num">04</div>
        <div>
          <h2 class="sec-title">SSH 登录与一键部署（无域名 / 有域名双方案）</h2>
          <p class="sec-subtitle">使用官方网页 SSH 免配密钥登录，结合 sing-box-yg 一键脚本，按是否持有域名灵活选择自签或正规证书。</p>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.1</span>登录网页 SSH 并切换 root 权限</h3>
      <p class="art-p">
        在 Google Cloud 控制台的虚拟机实例列表中，直接点击目标实例右侧的 <strong>SSH</strong> 按钮，并在弹窗中确认即可进入浏览器网页终端。进入后先执行以下命令切换至 <code>root</code> 权限：
      </p>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">BASH · SWITCH TO ROOT</span>
          <button type="button" class="copy-btn" data-copy="sudo -i">复制命令</button>
        </div>
        <pre><code>sudo -i</code></pre>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.2</span>运行一键安装脚本与基础选项确认</h3>
      <p class="art-p">
        打开 <a href="https://github.com/yonggekkk/sing-box-yg" target="_blank" rel="noopener noreferrer">yonggekkk/sing-box-yg</a> 项目主页，复制其中的 VPS 专用一键安装命令（通常取第一条即可）粘贴至 SSH 终端回车运行：
      </p>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">BASH · SING-BOX-YG INSTALL</span>
          <button type="button" class="copy-btn" data-copy="bash <(curl -Ls https://raw.githubusercontent.com/yonggekkk/sing-box-yg/main/sb.sh)">复制命令</button>
        </div>
        <pre><code>bash &lt;(curl -Ls https://raw.githubusercontent.com/yonggekkk/sing-box-yg/main/sb.sh)</code></pre>
      </div>

      <div class="swiss-callout is-tech">
        <strong>脚本初始化提示要点：</strong>脚本加载完成后选择<strong>一键安装</strong>；若脚本弹出 <strong>IPv4 与 IPv6 相关确认项</strong>，请依次输入两个 <code>yes</code> 确认放行/启用；随后出现的两项基础配置询问——<strong>是否开放端口</strong>与<strong>选择内核版本</strong>——均直接回车沿用默认设置即可。
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.3</span>配置证书：无域名 vs 有域名双方案</h3>
      <p class="art-p">
        接下来脚本会询问采用自签证书还是申请正规域名证书。请根据自身是否拥有域名二选一（使用 Cloudflare 解析域名时<strong>切勿开启代理小黄云</strong>）：
      </p>

      <div class="swiss-step-cols">
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">方案 A：无域名（最省事）</h3>
            <span class="swiss-card-code">SELF-SIGNED</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>脚本询问证书类型时，直接按<strong>回车</strong>选择默认<strong>自签证书</strong>。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>无需任何 DNS 解析步骤，后续交互一路回车即可自动完成全部协议部署。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>适合希望几分钟内快速跑通验证、暂不打算绑定个人域名的场景。</span>
            </li>
          </ol>
        </div>

        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">方案 B：有域名（推荐）</h3>
            <span class="swiss-card-code">ACME TLS</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span><strong>添加 A 记录：</strong>登录 Cloudflare 进入目标域名的 DNS 页面，添加一条 <code>A</code> 记录；名称填自定义前缀（如 <code>test</code>），IPv4 地址填入谷歌云实例的外部 IP，<strong>务必关闭代理状态（小黄云）</strong>以防触发 CDN 互联扣费。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span><strong>验证解析生效：</strong>在本地电脑打开命令提示符（CMD），运行 <code>ping 你的完整域名</code>，确认括号内返回的 IP 与谷歌云外部 IP 一致（有丢包不影响解析验证）。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span><strong>脚本申请证书：</strong>回到 SSH 终端输入 <code>2</code> 选择申请正规证书；待依赖组件装完后，在证书申请菜单中依次输入 <code>1</code> → <code>1</code>。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span><strong>跳过邮箱并绑定域名：</strong>提示输入邮箱时直接回车跳过，接着填入刚解析好的完整域名；脚本校验域名与 IP 匹配后将自动完成正规证书签发。</span>
            </li>
          </ol>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.4</span>完成端口、UUID 设置并导入测试</h3>
      <p class="art-p">
        证书配置完成后，脚本会继续询问各协议的监听端口，直接<strong>回车采用默认端口</strong>即可，节点所需的 UUID 也会由脚本自动生成。安装全部结束后，终端会一次性输出 4 种协议的节点链接与一条底部聚合订阅链接：
      </p>

      <div class="protocol-grid protocol-grid-4">
        <div class="protocol-card">
          <span class="swiss-tag swiss-tag-tech">推荐 · 首选</span>
          <div class="protocol-name">Hysteria2</div>
          <p class="protocol-desc">基于 UDP 的高吞吐传输协议，日常与晚高峰拉流表现突出。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag swiss-tag-tech">推荐 · 首选</span>
          <div class="protocol-name">TUIC</div>
          <p class="protocol-desc">UDP 拥塞控制温和稳定，长连接浏览与开发工具体验流畅。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag">TCP 兜底</span>
          <div class="protocol-name">VLESS-Reality-Vision</div>
          <p class="protocol-desc">无需依赖 UDP，适合对 UDP 限速或封禁较严的办公/校园网环境。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag">备用通道</span>
          <div class="protocol-name">VMess-WS-TLS</div>
          <p class="protocol-desc">经典 WebSocket 加密传输协议，便于配合传统客户端或链式落地。</p>
        </div>
      </div>

      <div class="swiss-callout">
        <strong>客户端导入与测试：</strong>直接复制终端底部输出的<strong>聚合订阅链接</strong>导入到 <code>v2rayN</code> 等客户端中并执行真连接测试。四条协议中偶有个别协议因网络环境不通属于正常现象，日常优先挑选 <strong>Hysteria2</strong> 或 <strong>TUIC</strong> 节点使用即可。
      </div>
    </section>

    <!-- 05 / TRIAL ACTIVATION & CHAIN PROXY -->
    <section class="art-section" id="sec-advanced">
      <div class="sec-header">
        <div class="sec-num">05</div>
        <div>
          <h2 class="sec-title">试用期续活窗口与链式代理提速</h2>
          <p class="sec-subtitle">顺利跨过 90 天试用期转正节点，并借助链式代理在晚高峰兼得干净独享 IP 与高速带宽。</p>
        </div>
      </div>

      <div class="swiss-callout is-warn">
        <strong>90 天试用期满后 30 天内务必手动激活：</strong>新账号 90 天试用期到期后，VM 实例会被自动暂停。请务必在 <strong>30 天宽限期内</strong>登录控制台，点击顶部<strong>升级 / 激活完整账号</strong>按钮以保留原有实例与全部数据（超期将被永久清理）。升级前确认配置完全符合免费层级且绑定银行卡有效；未用完的 $300 试用金不会顺延。
      </div>

      <p class="art-p" style="margin-top: 24px;">
        <strong>进阶优化 · 链式代理化解晚高峰降速与 UDP 断流：</strong>谷歌云美西独享 IP 的纯净度远高于多人共享的普通机场节点，但晚高峰直连 TCP 可能偏慢，而高强度 UDP 协议（Hysteria2 / TUIC）在部分地区偶发运营商 QOS 断流。一个兼顾速度与纯净 IP 的成熟方案是<strong>链式代理</strong>：用低延迟的<strong>香港机场节点作为前置中转</strong>，再转发至 <strong>GCP 美西节点（普通 VLESS / VMess TCP 即可）作为最终落地</strong>。实测下行速率可从直连 <strong>20+ Mbps</strong> 提升至 <strong>500+ Mbps</strong>，彻底告别晚高峰拥堵与 UDP 断流。
      </p>

      <div class="chain-diagram" aria-label="链式代理拓扑架构图">
        <div class="chain-node">
          <div class="chain-node-kicker">01 · CLIENT</div>
          <div class="chain-node-title">本机代理客户端</div>
          <div class="chain-node-sub">配置前置中转与落地出口</div>
        </div>
        <div class="chain-arrow">→</div>
        <div class="chain-node">
          <div class="chain-node-kicker">02 · RELAY (FRONT)</div>
          <div class="chain-node-title">香港低延迟中转节点</div>
          <div class="chain-node-sub">稳定高速跨境传输链路</div>
        </div>
        <div class="chain-arrow">→</div>
        <div class="chain-node is-highlight">
          <div class="chain-node-kicker">03 · LANDING (EXIT)</div>
          <div class="chain-node-title">GCP 俄勒冈独享落地</div>
          <div class="chain-node-sub">普通 VLESS/VMess TCP · 500+ Mbps</div>
        </div>
      </div>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">YAML · MIHOMO CHAIN PROXY</span>
          <button type="button" class="copy-btn" data-copy="proxies:&#10;  - name: GCP-Oregon-CleanIP&#10;    type: vless&#10;    server: us.你的域名&#10;    port: 443&#10;    dialer-proxy: 香港中转节点名">复制片段</button>
        </div>
        <pre><code>proxies:
  - name: GCP-Oregon-CleanIP
    type: vless
    server: us.你的域名
    port: 443
    dialer-proxy: 香港中转节点名</code></pre>
      </div>
    </section>

    <!-- 06 / REFERENCES COLOPHON -->
    <section class="art-section" id="sec-sources">
      <div class="sec-header">
        <div class="sec-num">06</div>
        <div>
          <h2 class="sec-title">参考资料与官方链接</h2>
          <p class="sec-subtitle">官方文档、开源部署脚本与延伸参考索引。</p>
        </div>
      </div>

      <ol class="sources-grid">
        <li class="source-item">
          <span class="source-idx">[01]</span>
          <span>Google Cloud，<a href="https://docs.cloud.google.com/free/docs/free-cloud-features?hl=zh-cn" target="_blank" rel="noopener noreferrer">免费 Google Cloud 功能与 Always Free 层级官方文档</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[02]</span>
          <span>Google Cloud，<a href="https://cloud.google.com/network-tiers/pricing" target="_blank" rel="noopener noreferrer">Network Service Tiers 定价（标准层级每月 200 GiB 免费出站）</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[03]</span>
          <span>Google for Developers，<a href="https://developers.google.com/profile/help/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">Google 开发者计划福利 FAQ（AI Pro 每月 $10 赠金领取与自动应用）</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[04]</span>
          <span>Google Cloud，<a href="https://docs.cloud.google.com/billing/docs/how-to/modify-billing-account" target="_blank" rel="noopener noreferrer">修改 Cloud Billing 结算账号官方文档</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[05]</span>
          <span>yonggekkk，<a href="https://github.com/yonggekkk/sing-box-yg" target="_blank" rel="noopener noreferrer">sing-box-yg 多协议 VPS 一键部署脚本</a>，GitHub。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[06]</span>
          <span>Seven科技生活，<a href="https://7techlife.blogspot.com/" target="_blank" rel="noopener noreferrer">Seven Tech Life 博客与谷歌云实测参考</a>。</span>
        </li>
      </ol>
    </section>
  `}const k=document.getElementById("app-root"),us=document.getElementById("atmosphere-canvas"),bs=document.getElementById("manor-parallax"),fs=document.getElementById("manor-slot-a"),ys=document.getElementById("manor-slot-b"),I=document.getElementById("atmosphere-panel"),C=document.getElementById("atmosphere-toggle"),rs=document.getElementById("auto-time-btn"),X=document.getElementById("time-pills"),K=document.getElementById("season-pills"),Q=document.getElementById("weather-pills"),ws=document.getElementById("beijing-clock"),Ms=document.getElementById("hud-phase-label"),Ss=document.getElementById("hud-env-label"),ls=document.getElementById("zen-toggle"),as=document.getElementById("zen-restore-bar"),xs=document.getElementById("zen-exit-btn"),ks=document.getElementById("zen-clock"),Ps=document.getElementById("zen-scene-desc");let D=null,E=null,z=null,F=null;function Is(){X.innerHTML=W.map(e=>`
      <button type="button" class="atmo-pill" data-time-pick="${e.id}" title="${e.range} 北京时间">
        <span class="atmo-pill-main">${e.label}</span>
        <span class="atmo-pill-sub">${e.range.split("–")[0]}</span>
      </button>
    `).join(""),K.innerHTML=_.map(e=>`
      <button type="button" class="atmo-pill" data-season-pick="${e.id}" title="${e.desc}">
        <span class="atmo-pill-main">${e.label}</span>
        <span class="atmo-pill-sub">${e.en.slice(0,3)}</span>
      </button>
    `).join(""),Q.innerHTML=j.map(e=>`
      <button type="button" class="atmo-pill" data-weather-pick="${e.id}" title="${e.desc}">
        <span class="atmo-pill-main">${e.label}</span>
        <span class="atmo-pill-sub">${e.en}</span>
      </button>
    `).join(""),X.addEventListener("click",e=>{const a=e.target.closest("[data-time-pick]");a&&E.setTimePhase(a.dataset.timePick)}),K.addEventListener("click",e=>{const a=e.target.closest("[data-season-pick]");a&&E.setSeason(a.dataset.seasonPick)}),Q.addEventListener("click",e=>{const a=e.target.closest("[data-weather-pick]");a&&E.setWeather(a.dataset.weatherPick)}),rs.addEventListener("click",()=>E.enableAutoTime()),C.addEventListener("click",()=>{I.hasAttribute("hidden")?(I.removeAttribute("hidden"),C.setAttribute("aria-expanded","true")):(I.setAttribute("hidden",""),C.setAttribute("aria-expanded","false"))}),document.addEventListener("click",e=>{!I.hasAttribute("hidden")&&!e.target.closest("#glass-dock")&&(I.setAttribute("hidden",""),C.setAttribute("aria-expanded","false"))});const i=e=>{document.body.classList.toggle("is-zen",e),e?(I.setAttribute("hidden",""),C.setAttribute("aria-expanded","false"),as.removeAttribute("hidden")):as.setAttribute("hidden","")};ls.addEventListener("click",()=>i(!0)),xs.addEventListener("click",()=>i(!1)),window.addEventListener("keydown",e=>{e.key==="Escape"&&document.body.classList.contains("is-zen")&&i(!1)})}function is(i){ws.textContent=i.clockShort,Ms.textContent=i.phaseMeta.label,Ss.textContent=`${i.seasonMeta.label} / ${i.weatherMeta.label}`,ks.textContent=`${i.clockFull} CST`,Ps.textContent=`${i.phaseMeta.label} · ${i.seasonMeta.label} · ${i.weatherMeta.label}`,rs.classList.toggle("is-active",i.autoTime),X.querySelectorAll("[data-time-pick]").forEach(t=>{t.classList.toggle("is-active",t.dataset.timePick===i.timePhase)}),K.querySelectorAll("[data-season-pick]").forEach(t=>{t.classList.toggle("is-active",t.dataset.seasonPick===i.season)}),Q.querySelectorAll("[data-weather-pick]").forEach(t=>{t.classList.toggle("is-active",t.dataset.weatherPick===i.weather)});const e=document.getElementById("home-live-clock"),a=document.getElementById("home-live-meta"),n=document.getElementById("home-live-mood");e&&(e.textContent=i.clockFull),a&&(a.textContent=`UTC+8 · ${i.phaseMeta.label} (${i.phaseMeta.en}) · ${i.seasonMeta.label} · ${i.weatherMeta.label}`),n&&(n.textContent=i.phaseMeta.mood)}function Es(){document.querySelectorAll(".liquid-glass").forEach(i=>{i.addEventListener("pointermove",e=>{const a=i.getBoundingClientRect(),n=(e.clientX-a.left)/a.width*100,t=(e.clientY-a.top)/a.height*100;i.style.setProperty("--gx",`${n.toFixed(1)}%`),i.style.setProperty("--gy",`${t.toFixed(1)}%`)},{passive:!0})})}function O(){return`
    <footer class="liquid-glass site-footer">
      <span>© ${f.established} ${f.brandName} · ${f.bio}</span>
      <span>LIQUID GLASS × SWISS GRID · ASIA/SHANGHAI (UTC+8)</span>
    </footer>
  `}function Z(i){return`
    <article class="post-feed-card" data-post-href="#/post/${i.slug}">
      <div class="post-card-meta">
        <div class="post-card-left-meta">
          <span class="essay-num">NO.${i.index}</span>
          <span class="swiss-tag ${i.category==="技术攻略"?"swiss-tag-tech":""}">${i.category}</span>
          ${i.pinned?'<span class="swiss-tag swiss-tag-accent">置顶</span>':""}
        </div>
        <span class="post-card-date">${i.date} · ${i.readTime}</span>
      </div>
      <h3 class="post-card-title">
        <a href="#/post/${i.slug}">${i.title}</a>
      </h3>
      <p class="post-card-excerpt">${i.excerpt}</p>
      <div class="post-card-foot">
        <div class="post-card-tags">
          ${i.tags.map(e=>`<a class="mini-tag" href="#/posts?tag=${encodeURIComponent(e)}">#${e}</a>`).join("")}
        </div>
        <a class="post-read-link" href="#/post/${i.slug}">阅读全文 →</a>
      </div>
    </article>
  `}function $s(){var t,o;const i=E.getSnapshot(),e=os();k.innerHTML=`
    <div class="home-grid">
      <!-- Personal Blog Masthead + Live Manor HUD -->
      <section class="liquid-glass home-hero">
        <div class="home-hero-top">
          <span class="swiss-kicker">PERSONAL BLOG // ${f.brandName.toUpperCase()}</span>
          <span class="home-coords">${f.coords}</span>
        </div>

        <div class="home-hero-body">
          <div>
            <h1 class="home-title">${f.brandName}</h1>
            <p class="home-bio">${f.bio}</p>
            <div class="home-meta-strip">
              <div class="home-stat"><strong>${String(M.length).padStart(2,"0")}</strong><span>已发布文章</span></div>
              <div class="home-stat"><strong>${String(Y.length-1).padStart(2,"0")}</strong><span>主题栏目</span></div>
              <div class="home-stat"><strong>${String(T.length).padStart(2,"0")}</strong><span>碎碎念</span></div>
              ${f.links.length?`<div class="home-quick-links">
                      ${f.links.map(r=>`<a class="quick-chip" href="${r.href}" ${r.href.startsWith("http")?'target="_blank" rel="noopener noreferrer"':""}>${r.label}</a>`).join("")}
                    </div>`:""}
            </div>
          </div>

          <aside class="home-side-status" aria-label="庄园实时气象">
            <span class="swiss-mono status-eyebrow">MANOR LIVE TELEMETRY</span>
            <div class="status-clock-big" id="home-live-clock">${i.clockFull}</div>
            <div class="status-meta-line" id="home-live-meta">
              UTC+8 · ${i.phaseMeta.label} (${i.phaseMeta.en}) · ${i.seasonMeta.label} · ${i.weatherMeta.label}
            </div>
            <p class="status-mood" id="home-live-mood">${i.phaseMeta.mood}</p>
            <div class="status-actions">
              <button type="button" class="status-action-btn" id="hero-open-atmo">调节季节与天气</button>
              <button type="button" class="status-action-btn" id="hero-open-zen">纯粹赏景</button>
            </div>
          </aside>
        </div>
      </section>

      <!-- Asymmetric 2-Column Personal Blog Body (8 cols Posts Feed + 4 cols Personal Sidebar) -->
      <div class="blog-layout">
        <!-- Main Column: Categorized Posts Feed -->
        <section class="liquid-glass liquid-glass-elevated feed-panel">
          <div class="feed-head">
            <div>
              <span class="swiss-kicker">RECENT WRITING // 最新文章与攻略</span>
              <h2 class="panel-title" style="margin-top: 8px;">全部发布</h2>
            </div>
            <a class="view-all-link" href="#/posts">按关键词检索 →</a>
          </div>

          <div class="filter-bar" id="home-cat-bar" role="tablist" aria-label="按分类筛选">
            ${Y.map((r,d)=>`
              <button type="button" class="filter-pill ${d===0?"is-active":""}" data-home-cat="${r}">
                ${r}
              </button>
            `).join("")}
          </div>

          <div class="post-feed-list" id="home-post-list">
            ${M.map(Z).join("")}
          </div>
        </section>

        <!-- Right Sidebar: Personal Blog Modules -->
        <aside class="blog-sidebar">
          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">NOW // 此刻在做</span>
            </div>
            ${f.nowList.length?`<ul class="now-list">
                    ${f.nowList.map(r=>`
                      <li>
                        <span class="swiss-tag">${r.tag}</span>
                        <span>${r.text}</span>
                      </li>
                    `).join("")}
                  </ul>`:'<p class="mini-note-text" style="color: var(--ink-mute);">暂无内容</p>'}
          </section>

          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">FIELD NOTES // 碎碎念</span>
              <a class="sidebar-more" href="#/notes">全部 →</a>
            </div>
            ${T.length?`<div class="mini-notes-list">
                    ${T.slice(0,2).map(r=>`
                      <div class="mini-note-item">
                        <div class="mini-note-meta">${r.date} · ${r.phase} · ${r.mood}</div>
                        <p class="mini-note-text">${r.content}</p>
                      </div>
                    `).join("")}
                  </div>`:'<p class="mini-note-text" style="color: var(--ink-mute);">暂无内容，待日后随手落笔。</p>'}
          </section>

          <section class="liquid-glass sidebar-card">
            <div class="sidebar-head">
              <span class="swiss-kicker">INDEX // 标签索引</span>
              <span class="swiss-mono sidebar-meta">${e.length} TAGS</span>
            </div>
            <div class="tag-matrix">
              ${e.map(r=>`
                <a class="tag-chip" href="#/posts?tag=${encodeURIComponent(r.name)}">
                  <span>#${r.name}</span>
                  <span class="tag-count">${r.count}</span>
                </a>
              `).join("")}
            </div>
          </section>
        </aside>
      </div>

      ${O()}
    </div>
  `,(t=document.getElementById("hero-open-atmo"))==null||t.addEventListener("click",r=>{r.stopPropagation(),I.removeAttribute("hidden"),C.setAttribute("aria-expanded","true"),window.scrollTo({top:0,behavior:"smooth"})}),(o=document.getElementById("hero-open-zen"))==null||o.addEventListener("click",()=>{ls.click()});const a=document.getElementById("home-cat-bar"),n=document.getElementById("home-post-list");a==null||a.addEventListener("click",r=>{const d=r.target.closest("[data-home-cat]");if(!d)return;const h=d.dataset.homeCat;a.querySelectorAll("[data-home-cat]").forEach(y=>{y.classList.toggle("is-active",y===d)});const g=h==="全部"?M:M.filter(y=>y.category===h);n.innerHTML=g.length?g.map(Z).join(""):'<p class="empty-state">该栏目暂未发布文章。</p>',J()}),J()}function J(){k.querySelectorAll("[data-post-href]").forEach(i=>{i.addEventListener("click",e=>{e.target.closest("a")||(window.location.hash=i.dataset.postHref)})})}function Cs(i=""){const e=os();let a="全部",n=i,t="";k.innerHTML=`
    <section class="liquid-glass liquid-glass-elevated directory-panel">
      <div class="directory-header">
        <div>
          <span class="swiss-kicker">ESSAYS &amp; GUIDES // 文章归档与检索</span>
          <h1 class="art-h1" style="margin: 10px 0 0; font-size: clamp(28px, 3.6vw, 42px);">全部文章与攻略</h1>
        </div>
        <div class="search-wrap">
          <input type="search" id="post-search-input" class="swiss-search" placeholder="搜索标题、关键词或标签…" autocomplete="off" />
        </div>
      </div>

      <div class="filter-bar" id="dir-cat-bar">
        ${Y.map((p,m)=>`<button type="button" class="filter-pill ${m===0?"is-active":""}" data-dir-cat="${p}">${p}</button>`).join("")}
      </div>

      <div class="tag-filter-row" id="dir-tag-bar">
        <button type="button" class="mini-tag-btn ${n?"":"is-active"}" data-dir-tag="">全部标签</button>
        ${e.map(p=>`
          <button type="button" class="mini-tag-btn ${n===p.name?"is-active":""}" data-dir-tag="${p.name}">
            #${p.name} (${p.count})
          </button>
        `).join("")}
      </div>

      <div class="dir-count-line" id="dir-count-line"></div>
      <div class="post-feed-list" id="dir-post-list"></div>
    </section>
    ${O()}
  `;const o=document.getElementById("post-search-input"),r=document.getElementById("dir-cat-bar"),d=document.getElementById("dir-tag-bar"),h=document.getElementById("dir-post-list"),g=document.getElementById("dir-count-line"),y=()=>{const p=t.trim().toLowerCase(),m=M.filter(b=>{const L=a==="全部"||b.category===a,x=!n||b.tags.includes(n),A=!p||b.title.toLowerCase().includes(p)||b.excerpt.toLowerCase().includes(p)||b.category.toLowerCase().includes(p)||b.tags.some(B=>B.toLowerCase().includes(p));return L&&x&&A});g.textContent=`MATCHING ${String(m.length).padStart(2,"0")} / ${String(M.length).padStart(2,"0")} ENTRIES${n?` · TAG: #${n}`:""}`,h.innerHTML=m.length?m.map(Z).join(""):'<p class="empty-state">没有找到匹配的文章，试试更换关键词或清空标签筛选。</p>',J()};o.addEventListener("input",p=>{t=p.target.value,y()}),r.addEventListener("click",p=>{const m=p.target.closest("[data-dir-cat]");m&&(a=m.dataset.dirCat,r.querySelectorAll("[data-dir-cat]").forEach(b=>b.classList.toggle("is-active",b===m)),y())}),d.addEventListener("click",p=>{const m=p.target.closest("[data-dir-tag]");m&&(n=m.dataset.dirTag,d.querySelectorAll("[data-dir-tag]").forEach(b=>b.classList.toggle("is-active",b===m)),y())}),y()}function Ts(){k.innerHTML=`
    <section class="liquid-glass liquid-glass-elevated directory-panel">
      <div class="panel-head">
        <div>
          <span class="swiss-kicker">FIELD NOTES // 庄园碎碎念</span>
          <h1 class="art-h1" style="margin: 10px 0 0; font-size: clamp(28px, 3.6vw, 42px);">随手记下的片刻与灵感</h1>
        </div>
        <span class="swiss-mono" style="font-size: 12px; color: var(--ink-mute);">${T.length} NOTES</span>
      </div>

      <div class="notes-timeline">
        ${T.length?T.map((i,e)=>`
                <article class="note-entry">
                  <div class="note-stamp">
                    <span class="essay-num">${String(T.length-e).padStart(2,"0")}</span>
                    <div>
                      <div class="note-date">${i.date}</div>
                      <div class="note-sub">${i.time} · ${i.phase}</div>
                    </div>
                    <span class="swiss-tag">${i.mood}</span>
                  </div>
                  <p class="note-body">${i.content}</p>
                </article>
              `).join(""):'<p class="empty-state">暂未发布碎碎念。</p>'}
      </div>
    </section>
    ${O()}
  `}function As(i){const e=ms(i),a=M.findIndex(r=>r.slug===e.slug),n=a>0?M[a-1]:null,t=a<M.length-1?M[a+1]:null,o=document.documentElement.dataset.readingGlass||"balanced";k.innerHTML=`
    <div class="article-shell">
      <!-- Sticky Swiss TOC & Reading Controls Rail -->
      <aside class="liquid-glass article-rail" aria-label="文章章节索引">
        <a href="#/posts" class="rail-back">← RETURN / 全部文章</a>

        <div class="rail-progress-wrap">
          <div class="rail-progress-meta">
            <span>READING PROGRESS</span>
            <span id="read-progress-pct">0%</span>
          </div>
          <div class="rail-progress-track">
            <div class="rail-progress-bar" id="read-progress-bar"></div>
          </div>
        </div>

        <ul class="toc-list" id="toc-list">
          ${e.toc.map((r,d)=>`
            <li>
              <a class="toc-link ${d===0?"is-active":""}" href="#${r.id}" data-toc-id="${r.id}">
                <span class="toc-idx">${r.num}</span>
                <span>${r.label}</span>
              </a>
            </li>
          `).join("")}
        </ul>

        <div class="rail-divider"></div>

        <button type="button" class="glass-density-toggle" id="glass-density-btn">
          <span>玻璃通透度</span>
          <span class="swiss-mono" id="glass-density-label" style="color: var(--accent);">
            ${o==="solid"?"专注深磨砂":"标准透光"}
          </span>
        </button>

        <div class="rail-meta-grid">
          <div class="rail-meta-row"><span>CATEGORY</span><span class="rail-meta-val">${e.category}</span></div>
          <div class="rail-meta-row"><span>PUBLISHED</span><span class="rail-meta-val">${e.date}</span></div>
          <div class="rail-meta-row"><span>DURATION</span><span class="rail-meta-val">${e.readTime}</span></div>
        </div>
      </aside>

      <!-- Elevated Liquid Glass Swiss Monograph Paper -->
      <article class="liquid-glass liquid-glass-elevated article-paper">
        ${e.renderContent()}

        <!-- Prev / Next Article Navigation -->
        <nav class="article-pager" aria-label="上下篇导航">
          ${n?`<a class="pager-link" href="#/post/${n.slug}">
                  <span class="pager-kicker">← PREV · ${n.category}</span>
                  <span class="pager-title">${n.shortTitle}</span>
                </a>`:`<a class="pager-link" href="#/posts">
                  <span class="pager-kicker">← ARCHIVE</span>
                  <span class="pager-title">返回全部文章目录</span>
                </a>`}
          ${t?`<a class="pager-link is-right" href="#/post/${t.slug}">
                  <span class="pager-kicker">NEXT · ${t.category} →</span>
                  <span class="pager-title">${t.shortTitle}</span>
                </a>`:`<a class="pager-link is-right" href="#/">
                  <span class="pager-kicker">HOME →</span>
                  <span class="pager-title">回到博客首页</span>
                </a>`}
        </nav>
      </article>
    </div>
    ${O()}
  `,Gs(e)}function Gs(i){k.querySelectorAll(".copy-btn").forEach(d=>{d.addEventListener("click",async()=>{const h=d.dataset.copy||"";try{await navigator.clipboard.writeText(h);const g=d.textContent;d.textContent="已复制 ✓",d.classList.add("is-copied"),setTimeout(()=>{d.textContent=g,d.classList.remove("is-copied")},1800)}catch{d.textContent="请手动复制"}})}),k.querySelectorAll("[data-toc-id]").forEach(d=>{d.addEventListener("click",h=>{h.preventDefault();const g=document.getElementById(d.dataset.tocId);g&&g.scrollIntoView({behavior:"smooth",block:"start"})})});const e=document.getElementById("glass-density-btn"),a=document.getElementById("glass-density-label");e==null||e.addEventListener("click",()=>{const d=document.documentElement.dataset.readingGlass==="solid"?"balanced":"solid";document.documentElement.dataset.readingGlass=d,a.textContent=d==="solid"?"专注深磨砂":"标准透光"});const n=document.getElementById("read-progress-bar"),t=document.getElementById("read-progress-pct"),o=i.toc.map(d=>document.getElementById(d.id)).filter(Boolean),r=()=>{var p;const d=Math.max(1,document.documentElement.scrollHeight-window.innerHeight),h=Math.min(100,Math.max(0,Math.round(window.scrollY/d*100)));n&&(n.style.width=`${h}%`),t&&(t.textContent=`${h}%`);let g=(p=o[0])==null?void 0:p.id;if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-40&&o.length)g=o[o.length-1].id;else for(const m of o)m.getBoundingClientRect().top<=240&&(g=m.id);g&&k.querySelectorAll("[data-toc-id]").forEach(m=>{m.classList.toggle("is-active",m.dataset.tocId===g)})};window.addEventListener("scroll",r,{passive:!0}),r(),F=()=>window.removeEventListener("scroll",r)}function Ls(){k.innerHTML=`
    <section class="liquid-glass liquid-glass-elevated about-card">
      <span class="swiss-kicker">ABOUT // ${f.brandName.toUpperCase()}</span>
      <h1 class="art-h1" style="margin-top: 14px;">${f.brandName}</h1>
      <p class="art-lead" style="margin-top: 12px;">${f.bio}</p>

      <div class="swiss-card" style="margin-top: 24px; max-width: 520px;">
        <div class="swiss-card-head">
          <h2 class="swiss-card-title">SITE SPECIFICATION</h2>
          <span class="swiss-card-code">UTC+8</span>
        </div>
        <div class="rail-meta-grid" style="margin-top: 0;">
          <div class="rail-meta-row"><span>BLOG</span><span class="rail-meta-val">${f.brandName}</span></div>
          <div class="rail-meta-row"><span>TIMEZONE</span><span class="rail-meta-val">Asia/Shanghai (UTC+8)</span></div>
          <div class="rail-meta-row"><span>TIME PHASES</span><span class="rail-meta-val">6 (日出→深夜)</span></div>
          <div class="rail-meta-row"><span>SEASONS × WEATHER</span><span class="rail-meta-val">春夏秋冬 × 晴雾雨雪</span></div>
        </div>
      </div>
    </section>
    ${O()}
  `}function R(i){document.querySelectorAll("[data-nav]").forEach(e=>{e.classList.toggle("is-active",e.dataset.nav===i)})}function ns(){F&&(F(),F=null),I.setAttribute("hidden",""),C.setAttribute("aria-expanded","false");const i=window.location.hash||"#/",[e,a]=i.split("?"),n=new URLSearchParams(a||"");if(e.startsWith("#/post/")){const t=e.replace("#/post/","");As(t),R("posts")}else e==="#/posts"||e==="#/archive"?(Cs(n.get("tag")||""),R("posts")):e==="#/notes"?(Ts(),R("notes")):e==="#/about"?(Ls(),R("about")):($s(),R("home"));window.scrollTo({top:0,behavior:"instant"}),Es()}function Bs(){Is(),z=new gs(fs,ys),D=new hs(us,bs),E=new cs(e=>{is(e),D.updateState(e),z.update(e.season,e.timePhase)}),E.start();const i=E.getSnapshot();is(i),D.updateState(i),z.update(i.season,i.timePhase),D.start(),window.addEventListener("hashchange",ns),ns()}Bs();
