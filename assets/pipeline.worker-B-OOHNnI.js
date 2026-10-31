(function(){var e=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBParseError`,this.complete=t?.complete??!1}},t=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBValidationError`,this.complete=t?.complete??!1}},n=class extends Error{complete;constructor(e,t){super(e,t),this.name=`GAEBVersionError`,this.complete=t?.complete??!1}};let r=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),i=Array.from({length:256},(e,t)=>t.toString(16).padStart(2,`0`));function a(e,t){return e>>>t|e<<32-t}let o=new Uint32Array(64),s=new Uint32Array(8),c=new Uint8Array(128);function l(e,t){let n=o;for(let r=0,i=t;r<16;r++,i+=4)n[r]=e[i]<<24|e[i+1]<<16|e[i+2]<<8|e[i+3];for(let e=16;e<64;e++){let t=a(n[e-15],7)^a(n[e-15],18)^n[e-15]>>>3,r=a(n[e-2],17)^a(n[e-2],19)^n[e-2]>>>10;n[e]=n[e-16]+t+n[e-7]+r|0}let i=s,c=i[0],l=i[1],u=i[2],d=i[3],f=i[4],p=i[5],m=i[6],h=i[7];for(let e=0;e<64;e++){let t=a(f,6)^a(f,11)^a(f,25),i=f&p^~f&m,o=h+t+i+r[e]+n[e]|0,s=(a(c,2)^a(c,13)^a(c,22))+(c&l^c&u^l&u)|0;h=m,m=p,p=f,f=d+o|0,d=u,u=l,l=c,c=o+s|0}i[0]+=c,i[1]+=l,i[2]+=u,i[3]+=d,i[4]+=f,i[5]+=p,i[6]+=m,i[7]+=h}function u(e){s.set([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);let t=e.length&-64;for(let n=0;n<t;n+=64)l(e,n);let n=e.length-t,r=n+9>64?128:64;c.fill(0),c.set(e.subarray(t)),c[n]=128;let a=Math.floor(e.length/536870912),o=e.length*8>>>0;c[r-8]=a>>>24,c[r-7]=a>>>16&255,c[r-6]=a>>>8&255,c[r-5]=a&255,c[r-4]=o>>>24,c[r-3]=o>>>16&255,c[r-2]=o>>>8&255,c[r-1]=o&255;for(let e=0;e<r;e+=64)l(c,e);let u=s,d=``;for(let e=0;e<8;e++)d+=i[u[e]>>>24]+i[u[e]>>>16&255]+i[u[e]>>>8&255],d+=i[u[e]&255];return d}let d=new TextEncoder;function f(e){return u(d.encode(e))}function p(e){return e.replace(/\s+/g,` `).trim()}function m(e){return(e??``).trim().toLowerCase().replace(/\.+$/,``)}function h(e){return e===null?``:String(e)}function g(e,t){return f(JSON.stringify([`bubble-pos-v1`,...e])).slice(0,t)}function ee(e){let t=m(e.unit),n=h(e.quantity),r=g([e.oz.trim()],16),i=g([`${p(e.shortText)}\n${p(e.longText)}`],16),a=g([n,t],16);return{id:g([r,i,a,e.positionType],10),oz:r,text:i,menge:a}}function te(e){let t=[],n=e=>{for(let r of e){for(let e of r.positions)t.push(e);n(r.sections)}};for(let t of e.lots)n(t.sections);return t}function ne(e){let t=new Map,n=new Map;for(let r of te(e)){let e=ee(r),i=(n.get(e.id)??0)+1;n.set(e.id,i),t.set(r,i===1?e:{...e,id:`${e.id}-${i}`})}return t}let _=`[\\p{L}\\p{N}]`;function v(e){let t=``,n=e=>{t.endsWith(e)||(t+=e)};for(let r of e.trim())r===`*`?n(`${_}*`):r===`#`?n(`\\d+`):/\s/.test(r)?n(`\\s+`):t+=r.replace(/[.+?^${}()|[\]\\/]/g,`\\$&`);return t}function y(e){if(e.length===0)return null;let t=[...e].sort((e,t)=>t.length-e.length).map(v);return RegExp(`(?<!${_})(?:${t.join(`|`)})(?!${_})`,`giu`)}function re(e){return e.length===0?null:[...e].sort((e,t)=>t.length-e.length).map(v).join(`|`)}function ie(e,t,n){let r=Math.max(0,t-200),i=e.slice(r,t),a=[...i.matchAll(/[.!?;:]\s+(?=\p{Lu})/gu)].at(-1);a===void 0?r>0&&(r+=i.search(/\s\S/)+1):r+=a.index+a[0].length;let o=e[n-1]===`.`?n-1:n,s=Math.min(e.length,n+200),c=e.slice(o,s),l=/[.!?;](?=\s+\p{Lu}|\s*$)/u.exec(c),u=l===null?s:o+l.index+1;if(l===null&&s<e.length){let e=c.lastIndexOf(` `);e>0&&(u=o+e)}for(;r<t&&/\s/.test(e[r]);)r++;for(;u>n&&/\s/.test(e[u-1]);)u--;return{start:Math.min(r,t),end:Math.max(u,n)}}let ae=[`menge`,`einheit`,`art`],oe=[`normal`,`alternativ`,`bedarf`,`zulage`],se=[`kurztext`,`langtext`,`pdf`],ce=[`wichtig`,`material`,`masse`],le=[`geld`,`menge`,`risiko`,`norm`,`frist`,`vob`];function b(e){return e.alle??e.eines??[]}let x=e=>typeof e==`object`&&!!e&&!Array.isArray(e),ue=/^[a-z0-9][a-z0-9-]{0,79}$/;function de(e){return/^-?\d+(?:[.,]\d+)?$/.test(e.trim())?Number(e.trim().replace(`,`,`.`)):null}let S=e=>typeof e==`string`&&ue.test(e)?e:null;function fe(e){if(!Array.isArray(e)||e.length===0||e.length>50)return null;let t=e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>e!==``&&e.length<=200);return t.length===e.length?t:null}function pe(e){if(e===void 0)return{};if(!x(e)||Object.keys(e).length>20)return null;let t={};for(let[n,r]of Object.entries(e)){if(S(n)===null)return null;if(typeof r==`number`&&Number.isFinite(r))t[n]=r;else if(typeof r==`boolean`)t[n]=r;else if(typeof r==`string`&&r.length<=200)t[n]=r;else{let e=fe(r);if(e===null)return null;t[n]=e}}return t}function me(e){let t=ae.find(t=>t===e.feld);if(t===void 0)return null;if(e.ist===`leer`)return{feld:t,ist:`leer`};let n=fe(e.ist);return n===null||t===`menge`&&!n.every(e=>de(e)!==null)||t===`art`&&!n.every(e=>oe.some(t=>t===e))?null:{feld:t,ist:n}}function he(e){if(!x(e))return null;if(typeof e.begriff==`string`){let t=e.begriff.trim();return t.length<=200?{begriff:t}:null}if(x(e.menge)){let{einheit:t}=e.menge;return typeof t==`string`&&t.trim()!==``?{menge:{einheit:t.trim().slice(0,20)}}:{menge:{}}}if(x(e.norm))return{norm:{}};if(e.liste!==void 0){let t=S(e.liste);return t===null?null:{liste:t}}if(x(e.einheit)){let t=e.einheit.gruppe;return typeof t==`string`&&t.trim()!==``&&t.length<=200?{einheit:{gruppe:t.trim()}}:null}if(e.feld!==void 0)return me(e);if(e.eingebaut!==void 0){let t=S(e.eingebaut),n=pe(e.parameter);return t===null||n===null?null:Object.keys(n).length>0?{eingebaut:t,parameter:n}:{eingebaut:t}}return null}function C(e){if(!Array.isArray(e)||e.length>12)return null;let t=e.map(he);return t.every(e=>e!==null)?t:null}function ge(e){return e===`satz`||e===`feld`?e:x(e)&&typeof e.zeichen==`number`&&Number.isInteger(e.zeichen)&&e.zeichen>=1&&e.zeichen<=2e3?{zeichen:e.zeichen}:null}function _e(e){if(!x(e))return null;let t=e.alle===void 0?void 0:C(e.alle),n=e.eines===void 0?void 0:C(e.eines);if(t===null||n===null||t===void 0==(n===void 0))return null;let r=e.nicht===void 0?[]:C(e.nicht),i=ge(e.bereich),a=Array.isArray(e.wo)?se.filter(t=>e.wo.includes(t)):[];if(r===null||i===null||a.length===0)return null;let o=t??n??[],s=[...o,...r].filter(e=>`eingebaut`in e).length;return s>0&&(s>1||o.length>1||r.length>0)?null:{...t===void 0?{eines:n}:{alle:t},...r.length>0?{nicht:r}:{},bereich:i,wo:a}}function ve(e){if(!x(e))return null;let t=le.find(t=>t===e.kategorie),n=[`hinweis`,`beachten`].find(t=>t===e.schwere),r=typeof e.text==`string`?e.text.trim():``;if(t===void 0||n===void 0||r===``)return null;let i={kategorie:t,schwere:n,text:r.slice(0,1e3)},a=x(e.norm)?e.norm:null,o=typeof a?.verweis==`string`?a.verweis.trim():``,s=[`bestaetigt`,`zu_bestaetigen`].find(e=>e===a?.stand);return o===``?i:{...i,norm:{verweis:o.slice(0,200),stand:s??`zu_bestaetigen`}}}function ye(e){if(!x(e))return null;let{hervorheben:t,verknuepfen:n,pruefhinweis:r}=e;if(typeof t==`string`){let e=ce.find(e=>e===t);return e===void 0?null:{hervorheben:e}}if(r!==void 0){let e=ve(r);return e===null?null:{pruefhinweis:e}}if(x(n)){if(n.ziel===`pdf`)return{verknuepfen:{ziel:`pdf`}};let e=_e(n.ziel);if(e===null)return null;let t=Array.isArray(n.gleich)?[`abschnitt`,`einheit`].filter(e=>n.gleich.includes(e)):[];return t.length===0?null:{verknuepfen:{ziel:e,gleich:t}}}return null}function w(e,t){return t.find(t=>t===e)??null}function be(e){if(!x(e)||e.schema!==`bubble-rule-v1`)return null;let{id:t,version:n,name:r,bemerkung:i}=e;if(typeof t!=`string`||!ue.test(t)||typeof n!=`number`||!Number.isInteger(n)||n<1||typeof r!=`string`||r.trim()===``)return null;let a=w(e.geltung,[`allgemein`,`unternehmen`]),o=_e(e.bedingung),s=ye(e.wirkung),c=w(e.status,[`entwurf`,`freigegeben`,`aus`]),l=w(e.herkunft,[`nutzer`,`mining`,`ki`])??`nutzer`;if(o===null||s===null||a===null||c===null)return null;let u=o.wo.length===1&&o.wo[0]===`pdf`,d=`verknuepfen`in s&&s.verknuepfen.ziel===`pdf`;return o.wo.includes(`pdf`)&&(!u||!d)||d&&!u?null:{schema:`bubble-rule-v1`,id:t,version:n,name:r.trim().slice(0,200),bedingung:o,wirkung:s,geltung:a,status:c,herkunft:l,...typeof i==`string`&&i.trim()!==``?{bemerkung:i.trim().slice(0,1e3)}:{}}}function xe(e){if(!x(e)||e.schema!==`bubble-rule-v1`||!Array.isArray(e.regeln))return[];let t=[];for(let n of e.regeln){let e=be(n);e!==null&&!t.some(t=>t.id===e.id)&&t.push(e)}return t}let Se=RegExp(`(?<![\\p{L}\\p{N}.,])(\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d+)?\\s?(m³|m²|m3|m2|cbm|qm|lfdm|lfm|km|cm|mm|m|to|t|kg|Stück|Stck|Stk|St|psch|Std|h|l|ha|Wo|Mt)\\.?(?![\\p{L}\\p{N}])`,`gu`);function T(e){let t=e.trim().replace(/²/g,`2`).replace(/³/g,`3`).replace(/\.+$/,``).toLowerCase();return{cbm:`m3`,qm:`m2`,stück:`st`,stck:`st`,stk:`st`,lfdm:`lfm`}[t]??t}let Ce=new Map;function we(e){let t=Ce.get(e);return t===void 0&&(t=e.trim()===``?null:y([e]),Ce.set(e,t)),t}let Te=new WeakMap;function Ee(e){let t=Te.get(e);if(t===void 0){let n=e.filter(e=>e.trim()!==``);t=n.length===0?null:y(n),Te.set(e,t)}return t}function De(e,t){let n=[];if(e===null)return n;for(let r of t.matchAll(e)){let e=r.index;r[0].length>0&&n.push({start:e,end:e+r[0].length})}return n}let E=e=>`einheit`in e||`feld`in e;function Oe(e,t,n=[],r={}){if(`begriff`in e)return De(we(e.begriff),t);if(`liste`in e){let n=r.listen?.get(e.liste);return n===void 0?[]:De(Ee(n),t)}if(`menge`in e){let n=[],r=e.menge.einheit===void 0?null:T(e.menge.einheit);for(let e of t.matchAll(Se))(r===null||T(e[2])===r)&&n.push({start:e.index,end:e.index+e[0].length});return n}return`norm`in e?[...n]:[]}function D(e,t,n={}){if(t===void 0)return!1;if(`einheit`in e){let r=n.einheitGruppen?.get(e.einheit.gruppe);if(r===void 0||t.einheit===null)return!1;let i=T(t.einheit);return i!==``&&r.some(e=>T(e)===i)}if(!(`feld`in e))return!1;if(e.feld===`menge`){if(e.ist===`leer`)return t.menge===null;let n=t.menge;return n!==null&&e.ist.some(e=>de(e)===n)}if(e.feld===`einheit`){let n=t.einheit===null?``:T(t.einheit);return e.ist===`leer`?n===``:n!==``&&e.ist.some(e=>T(e)===n)}return e.ist!==`leer`&&e.ist.includes(t.art)}let ke=(e,t)=>e.start>=t.start&&e.end<=t.end,Ae=(e,t)=>e.start<t.end&&t.start<e.end;function je(e,t,n){let{bereich:r}=e;return r===`feld`?{start:0,end:t.length}:r===`satz`?ie(t,n.start,n.end):{start:Math.max(0,n.start-r.zeichen),end:Math.min(t.length,n.end+r.zeichen)}}function Me(e,t){return t===`kurztext`?e.kurztext:t===`langtext`?e.langtext:e.pdf??``}function Ne(e,t,n,r,i){let a=Me(r,n);if(a===``||t.length===0)return[];let o=r.normen?.[n]??[],s=t.map(e=>Oe(e,a,o,i)),c=(e.nicht??[]).filter(e=>!E(e)).flatMap(e=>Oe(e,a,o,i)),l=e.alle!==void 0,u=l?s.reduce((e,t)=>t.length<e.length?t:e):s.flat().sort((e,t)=>e.start-t.start),d=[];for(let t of u){if(d.some(e=>ke(t,e)))continue;let r=je(e,a,t),i=s.map(e=>e.filter(e=>ke(e,r)));if(!(l?i.every(e=>e.length>0):i.some(e=>e.length>0))||c.some(e=>Ae(e,r)))continue;let o=i.flat().sort((e,t)=>e.start-t.start);if(d.push({feld:n,start:r.start,end:r.end,marks:o}),e.bereich===`feld`)break}return d}let Pe={feld:`position`,start:0,end:0,marks:[]};function Fe(e,t,n={}){let r=b(e),[i]=r;if(i!==void 0&&`eingebaut`in i){let r=n.eingebaut?.get(i.eingebaut);return r===void 0?[]:[...r(t,i.parameter??{},e.wo)]}if((e.nicht??[]).some(e=>E(e)&&D(e,t.angaben,n)))return[];let a=r.filter(E),o=r.filter(e=>!E(e)),s=a.filter(e=>D(e,t.angaben,n)),c=()=>e.wo.flatMap(r=>Ne(e,o,r,t,n));if(e.alle!==void 0)return s.length<a.length?[]:o.length>0?c():a.length>0?[Pe]:[];let l=c();return s.length>0?[...l,Pe]:l}new Set(`aller alle allem einer eines einem einen dieser diese dieses sind wird werden nach über
  unter sowie oder auch ohne beim gemäß inkl einschl einschließlich ggf bzw mind etwa
  zwischen gesamt insgesamt herstellen liefern einbauen ausführen bauseits nicht keine`.split(/\s+/));function Ie(e){return e instanceof Error?`${e.name}: ${e.message}`:String(e)}function Le(r){return r instanceof n?{code:`version`,message:r.message,complete:r.complete}:r instanceof t?{code:`validation`,message:r.message,complete:r.complete}:r instanceof e?{code:`parse`,message:r.message,complete:r.complete}:{code:`unknown`,message:Re,complete:!0,detail:Ie(r)}}let Re=`Beim Lesen der Datei ist ein unerwarteter Fehler aufgetreten. Bitte die Datei erneut laden oder prüfen, ob sie sich in der Ausschreibungssoftware öffnen lässt.`;var ze=`merkmal,wert,stichworte,ausser,bemerkung
Erkennung,,beton*|stahlbeton*|ortbeton*|spannbeton*|leichtbeton*|normalbeton*|schwerbeton*|faserbeton*|stahlfaserbeton*|sichtbeton*|transportbeton*|wu-beton*|C#/#|LC#/#|XC#|XD#|XS#|XF#|XA#|XM#,betonstahl*|betonpumpe*|betonpflaster*|betonstein*,"Entwurf: Klassen nach DIN EN 206 zeigen Beton auch ohne das Wort an; Betonpflaster und Betonsteine zählen nicht"
Art,Normalbeton,normalbeton*|C#/#,,Entwurf: C-Klasse = Normalbeton (DIN EN 206; Schwerbeton hat ebenfalls C-Klassen)
Art,Leichtbeton,leichtbeton*|LC#/#,,Entwurf: LC-Klasse = Leichtbeton (DIN EN 206)
Art,Schwerbeton,schwerbeton*,,Entwurf
Art,Spannbeton,spannbeton*|vorgespannt*,,Entwurf
Art,Faserbeton,faserbeton*|stahlfaserbeton*,,Entwurf
Bauweise,Ortbeton,ortbeton*,,Entwurf
Bauweise,Fertigteil,fertigteil*|betonfertigteil*|stahlbetonfertigteil*,,Entwurf
Bauweise,Halbfertigteil,halbfertigteil*|elementdecke*|elementwand*|filigrandecke*|doppelwand*,,Entwurf
Bewehrung,enthalten,bewehrt*|einschl. bewehrung|einschließlich bewehrung|inkl. bewehrung|inklusive bewehrung|mit bewehrung,,Entwurf
Bewehrung,gesondert,bewehrung gesondert*|bewehrung wird gesondert*|bewehrung siehe*|bewehrung separat*,,Entwurf: „ohne Bewehrung“ kann auch unbewehrt heißen
Bewehrung,unbewehrt,unbewehrt*,,Entwurf
`,Be=`merkmal,wert,stichworte,ausser,bemerkung
Erkennung,,betonstahl*|bewehrungsstahl*|betonstabstahl*|betonstahlmatte*|lagermatte*|listenmatte*|B#A|B#B|BSt #,,Entwurf: Positionen mit Betonstahl gelten als Bewehrungspositionen
`;function Ve(e,t=`,`){let n=[],r=``,i=!1;for(let a=0;a<e.length;a++){let o=e[a];i?o===`"`?e[a+1]===`"`?(r+=`"`,a++):i=!1:r+=o:o===`"`?i=!0:o===t?(n.push(r),r=``):r+=o}return n.push(r),n.map(e=>e.trim())}function O(e){let t=e.replace(/^\uFEFF/,``).split(/\r?\n/).map((e,t)=>({text:e,number:t+1})).filter(e=>e.text.trim()!==``);if(t.length===0)return[];let n=t[0].text,r=n.includes(`;`)&&!n.includes(`,`)?`;`:`,`,i=Ve(n,r).map(e=>e.toLowerCase());return t.slice(1).map(e=>{let t=Ve(e.text,r);return{line:e.number,get(e){let n=i.indexOf(e.toLowerCase());return n<0?``:t[n]??``}}})}function He(e){return e.split(`|`).map(e=>e.trim().toLowerCase()).filter(e=>e!==``)}function k(e){return e.split(`|`).map(e=>e.trim()).filter(e=>e!==``)}function Ue(e,t,n){let r=[];for(let i of e.matchAll(t)){let e=i[0].replace(/\s+/g,` `).trim();if(n?.test(e)===!0)continue;let t=i.index??0;r.push({text:e,start:t,end:t+i[0].length})}return r}function We(e){return e.length===0?null:RegExp(`^(?:${e.map(v).join(`|`)})$`,`iu`)}function Ge(e){return e.toLowerCase().replace(/ä/g,`ae`).replace(/ö/g,`oe`).replace(/ü/g,`ue`).replace(/ß/g,`ss`).replace(/[^a-z0-9]+/g,` `).trim().split(` `).map((e,t)=>t===0?e:e.charAt(0).toUpperCase()+e.slice(1)).join(``)}function Ke(e){return e.charAt(0).toUpperCase()+e.slice(1)}function qe(e){let t=k(e.get(`stichworte`)),n=y(t);return n===null?null:{pattern:n,ausser:We(k(e.get(`ausser`))),stichworte:t,zeile:e.line}}function Je(e,t){let n=e.replace(/\.csv$/i,``),r=Ge(n),i=[],a=new Map;for(let e of O(t)){let t=e.get(`merkmal`);if(t===``)continue;if(t.toLowerCase()===`erkennung`){let t=qe(e);t!==null&&i.push(t);continue}let n=qe(e);if(n===null)continue;let o=r+Ke(Ge(t)),s=a.get(o)??{name:t,werte:[]},c=e.get(`wert`);s.werte.push({wert:c===``?null:c,matcher:n}),a.set(o,s)}return{id:r,datei:e,name:Ke(n.replace(/[-_]+/g,` `)),erkennung:i,merkmale:[...a].map(([e,{name:t,werte:n}])=>({key:e,name:t,werte:n}))}}let Ye=null;function A(){return Ye??=Object.entries(Object.assign({"../docs/domain/reference/material/beton.csv":ze,"../docs/domain/reference/material/betonstahl.csv":Be})).sort(([e],[t])=>e.localeCompare(t)).map(([e,t])=>Je(e.split(`/`).pop()??e,t)),Ye}function j(e,t){let n=e[t];return typeof n==`string`?n===``?null:n:typeof n==`number`?String(n):typeof n==`boolean`?n?`ja`:`nein`:null}function M(e,t){let n=e[t];return Array.isArray(n)?n.filter(e=>typeof e==`string`&&e!==``):[]}function Xe(e){let t=e._spans;return Array.isArray(t)?t.filter(e=>{if(typeof e!=`object`||!e)return!1;let t=e;return typeof t.key==`string`&&typeof t.label==`string`&&typeof t.start==`number`&&typeof t.end==`number`&&t.end>t.start}):[]}function Ze(e,t,n){let r=t.get(e.id)??null;if(r===null)return null;let i=n.get(r.id);if(i!==void 0)return i;let a=null;for(let e=r;e!==null;e=t.get(e.id)??null)e.kind===`section`&&(a=e);return n.set(r.id,a),a}var Qe=`gruppe,schreibweisen,quelle_version
Stück,stk|stck|st|stueck|stück,
Tonne,t|to,
Stunde,h|std|stunde|stunden|std.,
Pauschal,psch.|pau.,
`;let $e={"¹":`1`,"²":`2`,"³":`3`};function N(e){if(e==null)return null;let t=e.replace(/[¹²³]/g,e=>$e[e]).replace(/\s+/g,``).replace(/\.+$/,``).toLowerCase();return t===``?null:t}function et(){let e=new Map;for(let t of O(Qe)){let n=t.get(`gruppe`);if(n===``)continue;let r=He(t.get(`schreibweisen`)).map(e=>N(e)).filter(e=>e!==null);if(r.length===0)continue;let i={name:n,spellings:r};for(let t of r)e.set(t,i)}return e}let P=null;function tt(e){return P??=et(),P.get(e)}function nt(){return P??=et(),[...new Set(P.values())]}function F(e){let t=N(e);return t===null?null:tt(t)?.name??t}let rt={m2:`m²`,m3:`m³`};function it(e){return rt[e]??e}let at={prepare:({index:e})=>t=>{let{attributes:n}=e.positions[t],r=M(n,`platzhalter`);if(r.length===0)return[];let i=n.platzhalterAnzahl;return[{title:typeof i==`number`&&i>1?`${i} offene Stellen (${r.join(`, `)})`:r.join(`, `),span:Xe(n).find(e=>e.key===`platzhalter`)}]}},ot={prepare:({index:e})=>{let t=new Map;for(let n of e.positions){let e=F(n.unit),r=N(n.unit);if(e===null||r===null)continue;let i=t.get(e)??new Set;i.add(n.unit??r),t.set(e,i)}let n=new Map;for(let[e,r]of t)r.size>1&&n.set(e,[...r].sort((e,t)=>e.localeCompare(t,`de`)));return t=>{let{unit:r}=e.positions[t],i=F(r),a=i===null?void 0:n.get(i);return a===void 0?[]:[{title:`„${r}" — im LV auch als ${a.filter(e=>e!==r).map(e=>`„${e}"`).join(`, `)}`}]}}};function st(e){let t=e.find(e=>e.id===`beton`),n=e.find(e=>e.id===`betonstahl`),r=t?.merkmale.find(e=>e.key===`betonBewehrung`);return t===void 0||n===void 0||r===void 0||t.erkennung.length===0||n.erkennung.length===0?null:{beton:t.name,betonstahl:n.name,bewehrungKey:r.key}}function ct(e,t){let n=e.slice(0,t).join(`, `);return e.length>t?`${n} und ${e.length-t} weitere`:n}function lt(e,t,n){let r=new Map,i=st(t);if(i===null)return r;let{index:a,parents:o}=e,s=new Map,c=e=>Ze(a.nodes[e],o,s)?.id??``,l=new Map,u=[];for(let e=0;e<a.size;e++){let{attributes:t,oz:n}=a.positions[e],r=M(t,`material`),o=r.includes(i.beton);if(r.includes(i.betonstahl)&&!o){let t=c(e),r=l.get(t);r===void 0?l.set(t,[n]):r.push(n)}o&&j(t,`positionsart`)===`bauteil`&&j(t,`beton`)!==null&&M(t,i.bewehrungKey).length===0&&u.push(e)}for(let e of u){let t=l.get(c(e))??[];r.set(e,{title:t.length>0?`Keine Angabe zur Bewehrung — Betonstahl im Abschnitt: ${ct(t,n)}`:`Keine Angabe zur Bewehrung, auch kein Betonstahl im Abschnitt`})}return r}let ut=new Map([[`offene-stelle`,at],[`einheit-schreibweise`,ot],[`bewehrung`,{missing:()=>st(A())===null?`Materialtabellen docs/domain/reference/material/beton.csv und betonstahl.csv enthalten noch keine Einträge.`:null,prepare:(e,t)=>{let n=t[`positionen-im-titel`];if(typeof n!=`number`)throw Error(`Parameter „positionen-im-titel“ fehlt in der Regel.`);let r=lt(e,A(),n);return e=>{let t=r.get(e);return t===void 0?[]:[t]}}}]]);var dt=`{
  "schema": "bubble-rule-v1",
  "regeln": [
    {
      "schema": "bubble-rule-v1",
      "id": "frist-in-tagen",
      "version": 1,
      "name": "Frist in Tagen",
      "bedingung": {
        "eines": [
          { "begriff": "# Tage" },
          { "begriff": "# Werktage" },
          { "begriff": "# Kalendertage" }
        ],
        "bereich": "satz",
        "wo": ["langtext"]
      },
      "wirkung": { "hervorheben": "wichtig" },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Beispielregel für den Grundstock. Hebt Fristangaben wie „14 Tage“ hervor."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "vertragsstrafe",
      "version": 1,
      "name": "Vertragsstrafe",
      "bedingung": {
        "eines": [
          { "begriff": "Vertragsstrafe*" },
          { "begriff": "Konventionalstrafe*" }
        ],
        "bereich": "satz",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": { "hervorheben": "wichtig" },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Beispielregel für den Grundstock."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "betonstahl-zu-ortbeton",
      "version": 1,
      "name": "Betonstahl zu Ortbeton im selben Abschnitt",
      "bedingung": {
        "alle": [{ "begriff": "Betonstahl*" }],
        "bereich": "feld",
        "wo": ["kurztext"]
      },
      "wirkung": {
        "verknuepfen": {
          "ziel": {
            "alle": [{ "begriff": "Ortbeton*" }],
            "bereich": "feld",
            "wo": ["kurztext", "langtext"]
          },
          "gleich": ["abschnitt"]
        }
      },
      "geltung": "allgemein",
      "status": "entwurf",
      "herkunft": "nutzer",
      "bemerkung": "Beispiel für eine Verknüpfungsregel. Schlägt vor, Betonstahl mit den Ortbeton-Positionen desselben Abschnitts zu verbinden."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v1-bedarfsposition",
      "version": 1,
      "name": "Bedarfs- oder Alternativposition",
      "bedingung": {
        "alle": [{ "feld": "art", "ist": ["bedarf", "alternativ"] }],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "beachten",
          "text": "Die Position ist als Bedarfs- oder Alternativposition ausgewiesen. Ob sie beauftragt wird, steht bei Angebotsabgabe nicht fest.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 4", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer"
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v2-stundenlohn",
      "version": 1,
      "name": "Angehängte Stundenlohnarbeiten",
      "bedingung": {
        "eines": [
          { "einheit": { "gruppe": "Stunde" } },
          { "begriff": "stundenlohn*" },
          { "begriff": "regiearbeit*" },
          { "begriff": "regiestunde*" }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Die Position wird nach Zeit abgerechnet. Bei größerem Umfang lohnt der Blick auf Anteil und Abgrenzung zur Hauptleistung.",
          "norm": {
            "verweis": "VOB/A § 7 Abs. 1 Nr. 4 Satz 2 · Abrechnung: VOB/B § 15",
            "stand": "bestaetigt"
          }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Einheit aus der Gruppe „Stunde“ (einheiten-gruppen.csv) oder ein Stundenlohn-Wort im Text."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v3-produktname",
      "version": 1,
      "name": "Produktname ohne „oder gleichwertig“",
      "bedingung": {
        "alle": [{ "liste": "hersteller" }],
        "bereich": { "zeichen": 80 },
        "wo": ["kurztext", "langtext"],
        "nicht": [
          { "begriff": "gleichwertig*" },
          { "begriff": "o. glw." },
          { "begriff": "o.glw." },
          { "begriff": "o. glw" },
          { "begriff": "o.glw" },
          { "begriff": "o. gl." }
        ]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "beachten",
          "text": "Ein Hersteller- oder Produktname ohne den Zusatz „oder gleichwertig“ schränkt den Wettbewerb ein.",
          "norm": {
            "verweis": "VOB/A § 7 Abs. 2 · bei EU-Vergaben zusätzlich VgV § 31 Abs. 6",
            "stand": "bestaetigt"
          }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Namen aus hersteller-produktnamen.csv. Der Zusatz gilt nur bis 80 Zeichen vor oder hinter dem Namen."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v4-risiko",
      "version": 1,
      "name": "Risiko auf den Auftragnehmer übertragen",
      "bedingung": {
        "alle": [{ "liste": "risiko" }],
        "bereich": "satz",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "beachten",
          "text": "Der Text schiebt ein Risiko auf den Auftragnehmer. Ob es sich kalkulieren lässt, gehört geprüft.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 3", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Formulierungen aus risiko-formulierungen.csv."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v5-menge-einheit",
      "version": 1,
      "name": "Menge oder Einheit fehlt",
      "bedingung": {
        "eines": [
          { "feld": "menge", "ist": "leer" },
          { "feld": "menge", "ist": ["0"] },
          { "feld": "einheit", "ist": "leer" }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "menge",
          "schwere": "beachten",
          "text": "Ohne Menge oder Einheit lässt sich die Position nicht bepreisen — der Ansatz muss von woanders kommen.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 1", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer"
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v6-verweis",
      "version": 1,
      "name": "Verweis auf ein anderes Dokument",
      "bedingung": {
        "eines": [
          { "liste": "verweis-anlage" },
          { "liste": "verweis-plan" },
          { "liste": "verweis-gutachten" }
        ],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "hinweis",
          "text": "Der Text verweist auf ein Dokument außerhalb des LV. Prüfen, ob es in den Vergabeunterlagen vorliegt.",
          "norm": { "verweis": "VOB/A § 7 Abs. 1 Nr. 2", "stand": "bestaetigt" }
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Wortlisten verweis-anlage, verweis-plan, verweis-gutachten aus wortlisten.csv. Ein Verweis auf eine andere Position zählt nicht."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v7-offene-stelle",
      "version": 1,
      "name": "Offene Textergänzung",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "offene-stelle",
            "parameter": { "punktreihe-mindestlaenge": 5 }
          }
        ],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "beachten",
          "text": "Im Langtext steht eine Lücke, die der Bieter ausfüllen soll. Sie ist Teil des Angebots."
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: Eingabefelder aus der Datei zählen immer, Punkt- oder Unterstrichreihen ab der Mindestlänge, dazu die Wortlisten bieterangabe und offenes-feld (wortlisten.csv). Kein Norm-Verweis."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v8-nebenleistung",
      "version": 1,
      "name": "Ausgeschriebene Nebenleistung",
      "bedingung": {
        "alle": [{ "eingebaut": "nebenleistung" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Eine Leistung, die nach VOB/C bereits Nebenleistung ist, hat eine eigene Position — auf Doppelvergütung prüfen.",
          "norm": {
            "verweis": "VOB/C, ATV DIN 18299 Abschnitt 4.1",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht vob-nebenleistungen.csv."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v9-besondere-leistung",
      "version": 1,
      "name": "Besondere Leistung ohne eigene Position",
      "bedingung": {
        "alle": [{ "eingebaut": "besondere-leistung" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "vob",
          "schwere": "hinweis",
          "text": "Der Text erwähnt eine Besondere Leistung, für die keine eigene Position vorgesehen ist.",
          "norm": {
            "verweis": "VOB/C, ATV DIN 18299 Abschnitt 4.2",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht vob-nebenleistungen.csv."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "v10-homogenbereiche",
      "version": 1,
      "name": "Erdarbeiten ohne Homogenbereiche",
      "bedingung": {
        "alle": [{ "eingebaut": "homogenbereiche" }],
        "bereich": "feld",
        "wo": ["langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "norm",
          "schwere": "beachten",
          "text": "Erdarbeiten ohne Angabe von Homogenbereichen — seit der Fassung 2015 lösen sie die Bodenklassen ab.",
          "norm": {
            "verweis": "VOB/C, DIN 18300 Abschnitt 0",
            "stand": "zu_bestaetigen"
          }
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Noch ohne Logik. Braucht die Zuordnung zu den Erdarbeiten (Entscheidung 0044)."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "g3-einheit-schreibweise",
      "version": 1,
      "name": "Einheit uneinheitlich geschrieben",
      "bedingung": {
        "alle": [{ "eingebaut": "einheit-schreibweise" }],
        "bereich": "feld",
        "wo": ["kurztext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "menge",
          "schwere": "hinweis",
          "text": "Dieselbe Einheit steht in der Datei in mehreren Schreibweisen — meist ein Zeichen für zusammengeführte Teil-LVs."
        }
      },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: vergleicht die Einheiten im ganzen LV. Kennzahl aus der Datei, kein Norm-Verweis."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "m1-bewehrung",
      "version": 1,
      "name": "Betonposition ohne Angabe zur Bewehrung",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "bewehrung",
            "parameter": { "positionen-im-titel": 3 }
          }
        ],
        "bereich": "feld",
        "wo": ["kurztext", "langtext"]
      },
      "wirkung": {
        "pruefhinweis": {
          "kategorie": "risiko",
          "schwere": "hinweis",
          "text": "Die Betonposition nennt eine Festigkeitsklasse, sagt aber nichts zur Bewehrung. Oft steht sie in einer eigenen Position — ein Blick lohnt, ob sie dort erfasst ist."
        }
      },
      "geltung": "allgemein",
      "status": "aus",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: liest die Materialtabellen beton.csv und betonstahl.csv und nennt den Betonstahl im selben Hauptabschnitt."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "pdf-oz",
      "version": 1,
      "name": "OZ im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "oz-im-pdf",
            "parameter": { "menge-hinter-oz": 80 }
          }
        ],
        "bereich": "feld",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet OZ aus dem LV im Text des PDF, nur wenn sie genau eine Position treffen. Kurzformen nur nach „Pos.“ oder „OZ“. Eine Menge bis zu so vielen Zeichen hinter der OZ steht zum Vergleich daneben."
    },
    {
      "schema": "bubble-rule-v1",
      "id": "pdf-menge",
      "version": 1,
      "name": "Menge im Dokument",
      "bedingung": {
        "alle": [
          {
            "eingebaut": "menge-im-pdf",
            "parameter": { "kleinste-ganze-zahl": 10 }
          }
        ],
        "bereich": "satz",
        "wo": ["pdf"]
      },
      "wirkung": { "verknuepfen": { "ziel": "pdf" } },
      "geltung": "allgemein",
      "status": "freigegeben",
      "herkunft": "nutzer",
      "bemerkung": "Eingebaut: findet Menge und Einheit aus dem LV im Text des PDF. Eindeutig über Wert und Einheit oder über eigene Wörter aus dem Kurztext im Satzteil. Ganze Zahlen darunter sind zu allgemein."
    }
  ]
}
`,ft=`name,stichworte,quelle_version
Knauf,,Entwurf Claude
Saint-Gobain Rigips,Rigips,Entwurf Claude
Saint-Gobain Isover,Isover,Entwurf Claude
Saint-Gobain Weber,weber,Entwurf Claude
Rockwool,,Entwurf Claude
Kingspan,,Entwurf Claude
Xella,Ytong|Silka|Multipor,Entwurf Claude
Wienerberger,Poroton|Terca,Entwurf Claude
Heidelberg Materials,,Entwurf Claude
Dyckerhoff,,Entwurf Claude
Holcim,,Entwurf Claude
Schöck,Isokorb|Tronsole,Entwurf Claude
Halfen,,Entwurf Claude
Pfeifer,,Entwurf Claude
Max Frank,Egcobox,Entwurf Claude
Peri,,Entwurf Claude
Doka,,Entwurf Claude
Hilti,,Entwurf Claude
Fischer,,Entwurf Claude
Würth,,Entwurf Claude
Sika,Sikaflex,Entwurf Claude
MC-Bauchemie,,Entwurf Claude
PCI,,Entwurf Claude
Schomburg,,Entwurf Claude
Remmers,,Entwurf Claude
Ardex,,Entwurf Claude
Mapei,,Entwurf Claude
Sopro,,Entwurf Claude
Baumit,,Entwurf Claude
Quick-Mix,,Entwurf Claude
Kemper System,,Entwurf Claude
Bauder,,Entwurf Claude
Sto,,Entwurf Claude
Caparol,,Entwurf Claude
Keim,,Entwurf Claude
Brillux,,Entwurf Claude
Schlüter-Systems,Schlüter|Ditra,Entwurf Claude
Wedi,,Entwurf Claude
Schüco,,Entwurf Claude
Hörmann,,Entwurf Claude
Velux,,Entwurf Claude
Geberit,,Entwurf Claude
Viega,Profipress,Entwurf Claude
Grohe,,Entwurf Claude
Rehau,,Entwurf Claude
Uponor,,Entwurf Claude
ACO,,Entwurf Claude
Kessel,,Entwurf Claude
Hauraton,,Entwurf Claude
OBO,,Entwurf
`,pt=`formulierung,quelle_version
trägt der AN,docs/domain/vob-pruefungen.md
trägt der Auftragnehmer,docs/domain/vob-pruefungen.md
unabhängig von den angetroffenen Verhältnissen,docs/domain/vob-pruefungen.md
`,mt=`liste,stichworte,bemerkung
verweis-anlage,laut anlage*|laut anlage* #|gemäß anlage*|gemäß anlage* #|gemaess anlage*|gemaess anlage* #|siehe anlage*|siehe anlage* #|nach anlage*|nach anlage* #,"V6: Verweis auf eine Anlage außerhalb des LV"
verweis-plan,laut plan*|laut zeichnung*|laut detail*|laut schalplan*|laut bewehrungsplan*|gemäß plan*|gemäß zeichnung*|gemäß detail*|gemäß schalplan*|gemäß bewehrungsplan*|gemaess plan*|gemaess zeichnung*|gemaess detail*|gemaess schalplan*|gemaess bewehrungsplan*|siehe plan*|siehe zeichnung*|siehe detail*|siehe schalplan*|siehe bewehrungsplan*|nach plan*|nach zeichnung*|nach detail*|nach schalplan*|nach bewehrungsplan*,"V6: Verweis auf einen Plan außerhalb des LV"
verweis-gutachten,laut gutachten*|laut bodengutachten*|laut baugrundgutachten*|gemäß gutachten*|gemäß bodengutachten*|gemäß baugrundgutachten*|gemaess gutachten*|gemaess bodengutachten*|gemaess baugrundgutachten*|siehe gutachten*|siehe bodengutachten*|siehe baugrundgutachten*|nach gutachten*|nach bodengutachten*|nach baugrundgutachten*,"V6: Verweis auf ein Gutachten außerhalb des LV"
bieterangabe,bieterangabe*|vom bieter einzutragen|vom bieter zutragen|vom bieter anzugeben|durch den bieter einzutragen|durch den bieter zutragen|bieter trägt ein,"V7: ausformulierte Aufforderung an den Bieter"
offenes-feld,fabrikat|hersteller|typ|erzeugnis,"V7: Feldname, hinter dem nach einem Doppelpunkt nichts oder nur eine Lücke steht („Fabrikat: ....“)"
`;let I=`docs/domain/reference`;function ht(){let e=new Map;e.set(`hersteller`,{file:`${I}/hersteller-produktnamen.csv`,words:O(ft).flatMap(e=>e.get(`name`)===``?[]:[e.get(`name`),...k(e.get(`stichworte`))])}),e.set(`risiko`,{file:`${I}/risiko-formulierungen.csv`,words:O(pt).map(e=>e.get(`formulierung`)).filter(e=>e!==``)});for(let t of O(mt)){let n=t.get(`liste`);if(n===``)continue;let r=e.get(n)?.words??[];e.set(n,{file:`${I}/wortlisten.csv`,words:[...r,...k(t.get(`stichworte`))]})}return e}let gt=ht();function _t(e){return gt.get(e)?.file??`${I}/wortlisten.csv`}let vt={listen:new Map([...gt].map(([e,t])=>[e,t.words])),einheitGruppen:new Map(nt().map(e=>[e.name,e.spellings]))};function yt(e){try{return xe(JSON.parse(e)).map(e=>({...e,geltung:`allgemein`}))}catch{return[]}}let bt=yt(dt),xt=vt;function St(e,t){for(let n of bt){let[r]=b(n.bedingung);if(r!==void 0&&`eingebaut`in r&&r.eingebaut===e)return r.parameter?.[t]}}function Ct(e){let t=Xe(e.attributes).filter(e=>e.key===`normen`).map(({start:e,end:t})=>({start:e,end:t}));return{kurztext:e.shortText,langtext:e.longText,normen:{langtext:t},angaben:{menge:e.quantity,einheit:e.unit,art:wt[e.positionType]}}}let wt={NORMAL:`normal`,ALTERNATIV:`alternativ`,BEDARF:`bedarf`,ZULAGENPOSITION:`zulage`},Tt=bt.filter(e=>`pruefhinweis`in e.wirkung);function Et(e){return/^([a-z]\d+)(?:-|$)/i.exec(e)?.[1].toUpperCase()??``}function Dt(e,t,n){for(let r of b(e.bedingung)){if(`eingebaut`in r){let e=n.get(r.eingebaut);return e===void 0?`Noch nicht umgesetzt.`:e.missing?.()??null}if(`liste`in r&&(t.listen?.get(r.liste)?.length??0)===0)return`Wortliste „${r.liste}“ in ${_t(r.liste)} enthält noch keine Einträge.`;if(`einheit`in r&&(t.einheitGruppen?.get(r.einheit.gruppe)?.length??0)===0)return`Einheiten-Gruppe „${r.einheit.gruppe}“ fehlt in docs/domain/reference/einheiten-gruppen.csv.`}return null}let Ot={NORMAL:`Normalposition`,BEDARF:`Bedarfsposition`,ALTERNATIV:`Alternativposition`,ZULAGENPOSITION:`Zulagenposition`};function kt(e,t){return`einheit`in e?`Einheit ${t.unit??`–`} (${e.einheit.gruppe})`:`feld`in e?e.feld===`art`?Ot[t.positionType]:e.feld===`menge`?e.ist===`leer`?`keine Menge`:`Menge ${String(t.quantity)}`:e.ist===`leer`?`keine Einheit`:`Einheit ${t.unit??`–`}`:null}function At(e,t,n,r,i){let a=[],o=new Set,s=e=>{let t=e.toLowerCase();e===``||o.has(t)||(o.add(t),a.push(e))},c;for(let r of t){if(r.feld===`position`)continue;let t=r.feld===`kurztext`?n.kurztext:n.langtext;for(let n of r.marks){let i=t.slice(n.start,n.end).replace(/\s+/g,` `);s(i),c===void 0&&r.feld===`langtext`&&(c={key:e.id,start:n.start,end:n.end,label:i})}}if(t.some(e=>e.feld===`position`))for(let t of b(e.bedingung))D(t,n.angaben,i)&&s(kt(t,r)??``);return{title:a.length>0?a.join(`, `):e.name,span:c}}function jt(e,t,n,r,i){let{index:a}=t,o=[],[s]=b(e.bedingung);if(s!==void 0&&`eingebaut`in s){let e=i.get(s.eingebaut);if(e===void 0)return o;let n=e.prepare(t,s.parameter??{});for(let e=0;e<a.size;e++)for(let t of n(e))o.push({...t,slot:e});return o}for(let t=0;t<a.size;t++){let i=Fe(e.bedingung,n[t],r);i.length!==0&&o.push({...At(e,i,n[t],a.positions[t],r),slot:t})}return o}function Mt(e,t,n=Tt,r=new Map,i=xt,a=ut){let o={index:e,summary:t,parents:r},s=[],c=[],l=null;for(let t of n){if(t.status!==`freigegeben`)continue;let n=t.wirkung.pruefhinweis,r,u=[];try{r=Dt(t,i,a),r===null&&(l??=e.positions.map(Ct),u=jt(t,o,l,i,a).map(({slot:r,...i})=>({...i,id:t.id,category:n.kategorie,severity:n.schwere,positionId:e.nodes[r].id})))}catch(e){r=`Regel abgebrochen: ${e instanceof Error?e.message:`unbekannt`}`,u=[]}let d=r===null;if(d)for(let e of u)s.push(e);c.push({id:t.id,code:Et(t.id),label:t.name,category:n.kategorie,severity:n.schwere,hint:n.text,ruleRef:n.norm?.verweis??``,refConfirmed:n.norm?.stand===`bestaetigt`,active:d,inactiveReason:r,count:d?u.length:0})}return{flags:s,rules:c}}function L(e){return e.replace(/\s+/g,` `).trim()}function Nt(e,t,n){let r=[];for(let i of e.matchAll(t)){let e=n(i);if(e===null||e===``)continue;let t=i.index??0;r.push({value:e,start:t,end:t+i[0].length,label:L(i[0])})}return r}function R(e,t){let n=[],r=new Set,i=[];for(let a of t)r.has(a.value)||(r.add(a.value),n.push(a.value)),i.push({key:e,start:a.start,end:a.end,label:a.label??a.value});return{values:n,spans:i}}function Pt(e){return e.filter(t=>!e.some(e=>e!==t&&e.start<=t.start&&e.end>=t.end&&e.end-e.start>t.end-t.start))}function Ft(e){let t=[...e].sort((e,t)=>e.start-t.start||t.end-e.end),n=[],r=-1;for(let e of t)e.start<r||(n.push(e),r=e.end);return n}let It=[{value:`Termin`,pattern:/\b(?:\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|kw\s?\d{1,2}(?:\/\d{2,4})?|q[1-4]\/\d{2,4}|[1-4]\.\s?quartal\s+\d{4})\b/gi},{value:`Bauzeit`,pattern:/\b(?:bauzeit|bauzeitenplan|ausführungszeitraum|ausfuehrungszeitraum|fertigstellung(?:stermin)?|zwischentermin|vertragsfrist|einzelfrist)\w*/gi},{value:`Winterbau`,pattern:/\b(?:winterbau|winterbaumaßnahm\w*|winterbaumassnahm\w*|frostperiode|winterperiode)/gi},{value:`Vorleistung`,pattern:/\b(?:vorleistung\w*|vorgewerk\w*|nach\s+fertigstellung\s+der\s+vorleistung\w*)/gi},{value:`Arbeiten unter Verkehr`,pattern:/\b(?:unter\s+(?:fließendem\s+|fliessendem\s+|rollendem\s+)?verkehr|bei\s+laufendem\s+betrieb|unter\s+betrieb)/gi},{value:`Nacht- und Wochenendarbeit`,pattern:/\b(?:nachtarbeit|nachtschicht|wochenendarbeit|sonntagsarbeit|feiertagsarbeit)\w*/gi},{value:`Bauablauf`,pattern:/\b(?:bauabschnitt\w*|bauphase\w*|taktplan\w*|sperrpause\w*)/gi}];function Lt(e){let t=[];for(let n of It)for(let r of e.matchAll(n.pattern)){let e=r.index??0;t.push({value:n.value,start:e,end:e+r[0].length,label:L(r[0])})}return t.sort((e,t)=>e.start-t.start)}let Rt={id:`fristen`,extract(e){let{values:t,spans:n}=R(`fristen`,Lt(e.longText));return{attributes:t.length===0?{}:{fristen:t},spans:n}}},z=`(?:mm|cm|dm|m)`,B=`(?:kg|t|to)`,V=`\\d+(?:[.,]\\d+)?`;function H(e,t){return RegExp(`(?:${e})\\s*[:=]?\\s*${V}\\s*${t}\\b`,`gi`)}function U(e,t){return RegExp(`\\b(?:${e})\\s*[:=]\\s*${V}\\s*${t}\\b`,`gi`)}function W(e,t){return RegExp(`(?<!\\d)(?<!\\d[.,])${V}\\s*${e}\\s*(?:${t})\\b`,`gi`)}let zt=[{key:`dicke`,einheit:z,patterns:[H(`dicke|dick|stärke|staerke`,z),U(`d`,z),W(z,`dick`)]},{key:`hoehe`,einheit:z,patterns:[H(`höhe|hoehe|hoch`,z),U(`h`,z),W(z,`hoch`)]},{key:`laenge`,einheit:z,patterns:[H(`länge|laenge|lang`,z),U(`l`,z),W(z,`lang`)]},{key:`gewicht`,einheit:B,patterns:[H(`gewicht|schwer`,B),U(`g|m`,B),W(B,`schwer`)]}];function Bt(e,t){let n=RegExp(`${V}\\s*${t}\\b`,`i`).exec(e);return n===null?null:L(n[0]).toLowerCase()}function Vt(e,t){let n=null;for(let r of t.patterns)for(let i of e.matchAll(r)){let e=Bt(i[0],t.einheit);if(e===null)continue;let r=i.index??0;(n===null||r<n.start)&&(n={value:e,start:r,end:r+i[0].length,label:L(i[0])})}return n}function Ht(e,t=``){let n={},r=[];for(let i of zt){let a=Vt(e,i);if(a!==null){let e=R(i.key,[a]);n[i.key]=e.values[0],r.push(...e.spans);continue}let o=Vt(t,i);o!==null&&(n[i.key]=o.value)}return{attributes:n,spans:r}}let Ut={id:`masse`,extract(e){return Ht(e.longText,e.shortText)}};function G(e,t){return Ue(e,t.pattern,t.ausser)}function Wt(e,t){return t.flatMap(t=>G(e,t))}function Gt(e,t){e.includes(t)||e.push(t)}function Kt(e,t){let n={},r=[];for(let i of t){let t=Wt(e.longText,i.erkennung);if(t.length!==0||Wt(e.shortText,i.erkennung).length!==0){n.material??=[],Gt(n.material,i.name);for(let t of i.merkmale){let i=[];for(let{wert:n,matcher:a}of t.werte){let o=G(e.longText,a),s=G(e.shortText,a);for(let e of[...s,...o])Gt(i,n??e.text);for(let e of o){let i=`${t.name}: ${n??e.text}`;r.push({key:`material`,start:e.start,end:e.end,label:i})}}i.length>0&&(n[t.key]=i)}for(let e of t)r.push({key:`material`,start:e.start,end:e.end,label:i.name})}}return{attributes:n,spans:r}}let qt={id:`material`,extract:e=>Kt(e,A())},Jt=/\b(?:DIN\s+(?:V\s+|SPEC\s+)?)?(?:EN\s+)?(?:ISO\s+)?\d{2,5}(?:-\d+)*\b/g,Yt=/\b(?:DIN|EN|ISO)\b/,Xt=/\b(?:VOB\/[ABC]|ATV(?:\s+DIN\s+\d{4,5})?|ZTV[- ][A-Za-zÄÖÜäöüß-]+(?:\s+\d{2,4})?)/g,Zt=/^:\d{4}(?:-\d{2})?/;function Qt(e){let t=L(e[0]);return Yt.test(t)?t.toUpperCase():null}function $t(e,t){let n=Zt.exec(e.slice(t.end));if(n===null)return t;let r=t.end+n[0].length;return{...t,end:r,label:L(e.slice(t.start,r))}}function en(e){return Pt([...Nt(e,Jt,Qt),...Nt(e,Xt,e=>L(e[0]).toUpperCase())]).map(t=>$t(e,t)).sort((e,t)=>e.start-t.start)}let tn={id:`normen`,extract(e){let{values:t,spans:n}=R(`normen`,en(e.longText));return{attributes:t.length===0?{}:{normen:t},spans:n}}},nn=`Textergänzung`,K;function rn(){if(K!==void 0)return K;let e=Number(St(`offene-stelle`,`punktreihe-mindestlaenge`));return K=Number.isInteger(e)&&e>0?RegExp(`\\.{${e},}|_{${e},}|…{${Math.ceil(e/3)},}`,`g`):null,K}function an(e){let t=re(e);return t===null?null:RegExp(`(?<![\\p{L}\\p{N}])(?:${t})\\s*:\\s*(?=\\s*(?:\\.{3,}|_{3,}|…|$))`,`giu`)}let on;function sn(){let e=e=>vt.listen?.get(e)??[];return on??={bitte:e(`bieterangabe`).length===0?null:y(e(`bieterangabe`)),feld:an(e(`offenes-feld`))},on}function cn(e,t){let n=L(e.slice(ln(e,t),t));return n===``?`Offene Textergänzung`:`${n} …`}function ln(e,t){let n=Math.max(0,t-40),r=e.slice(n,t),i=Math.max(r.lastIndexOf(`. `),r.lastIndexOf(`
`));return i<0?n:n+i+1}function un(e,t=[]){let n=[...dn(e,t),...fn(e,t)],{bitte:r,feld:i}=sn();if(r!==null)for(let t of Ue(e,r,null))n.push({value:`Bieterangabe`,start:t.start,end:t.end,label:t.text});if(i!==null)for(let t of e.matchAll(i)){let e=t.index??0;n.push({value:`Offenes Feld`,start:e,end:e+t[0].length,label:L(t[0])})}return n.sort((e,t)=>e.start-t.start)}function dn(e,t){return t.map(t=>{let n=cn(e,t.start);if(!(t.end<=t.start))return{value:nn,start:t.start,end:t.end,label:n};let r=ln(e,t.start);for(;r<t.start&&/\s/.test(e[r]);)r++;return{value:nn,start:r,end:t.start,label:n}})}function fn(e,t){let n=rn();if(n===null)return[];let r=[];for(let i of e.matchAll(n)){let n=i.index??0,a=n+i[0].length;t.some(e=>n<Math.max(e.end,e.start+1)&&a>e.start)||r.push({value:`Punktreihe`,start:n,end:a,label:cn(e,n)})}return r}let pn={id:`platzhalter`,extract(e){let t=un(e.longText,e.inputFields),{values:n,spans:r}=R(`platzhalter`,t);return n.length===0?{attributes:{},spans:[]}:{attributes:{platzhalter:n,platzhalterAnzahl:t.length},spans:r}}},mn=[{value:`Positionsverweis`,pattern:/\b(?:siehe|wie|vgl\.?|gemäß|gemaess|analog)\s+(?:pos\.?|position)\s*[\w.\-/]*/gi},{value:`Anlage`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+anlage\s*[\w.\-/]*/gi},{value:`Vorbemerkung`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:vorbemerkung|vorbemerkungen)[\w.\-/]*/gi},{value:`Planunterlage`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:plan|planung|zeichnung|detail|schalplan|bewehrungsplan)[\w.\-/]*/gi},{value:`Gutachten`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:gutachten|bodengutachten|baugrundgutachten)/gi},{value:`Leistungsbeschreibung`,pattern:/\b(?:laut|gemäß|gemaess|siehe|nach)\s+(?:leistungsbeschreibung|baubeschreibung)/gi}];function hn(e){let t=[];for(let n of mn)for(let r of e.matchAll(n.pattern)){let e=r.index??0;t.push({value:n.value,start:e,end:e+r[0].length,label:L(r[0])})}return t.sort((e,t)=>e.start-t.start)}let gn=[tn,qt,Ut,pn,{id:`verweise`,extract(e){let{values:t,spans:n}=R(`verweise`,hn(e.longText));return{attributes:t.length===0?{}:{verweise:t},spans:n}}},Rt];function _n(e,t=gn){let n={},r=[];for(let i of t){let t=i.extract(e);Object.assign(n,t.attributes),r.push(...t.spans)}return{attributes:n,spans:Ft(r)}}function q(e){return e.toLowerCase().replace(/\s+/g,` `).trim()}function vn(e){let t=q(e.shortText),n=q(e.longText);return{short:t,long:n,all:`${t} ${n}`.trim(),unit:e.unit===null?null:q(e.unit)}}function yn(e){return e.short===``?e.all:e.short}function J(e,t){return t.some(t=>e.includes(t))}function Y(e,t){let n=new Set;for(let r of e.matchAll(t))n.add(r[0]);return[...n]}let bn=[{label:`WU-Beton`,keywords:[`wu-beton`,`wu beton`,`wasserundurchlässig`]},{label:`Sichtbeton`,keywords:[`sichtbeton`]},{label:`Fertigteil`,keywords:[`fertigteil`,`halbfertigteil`,`elementdecke`]},{label:`Ortbeton`,keywords:[`ortbeton`]},{label:`Brandschutz`,keywords:[`brandschutz`,`feuerwiderstand`,`f90`,`r90`]},{label:`Schallschutz`,keywords:[`schallschutz`,`schalldämm`]},{label:`Wärmedämmung`,keywords:[`wärmedämm`,`dämmung`]},{label:`Abdichtung`,keywords:[`abdichtung`,`bitumenbahn`]},{label:`Rückbau`,keywords:[`rückbau`,`abbruch`,`demontage`]},{label:`Schadstoff`,keywords:[`asbest`,`schadstoff`,`kontaminiert`]},{label:`Winterbau`,keywords:[`winterbau`,`frostschutz`,`beheizung`]},{label:`Bestand`,keywords:[`bestand`,`altbau`,`bestandsbauteil`],ausser:[`bestandteil`]}],xn=/\bcem\s?[iv]{1,3}(?:\/[a-c])?\b/g;function Sn(e){return e.map(e=>e.replace(/\s+/g,` `).toUpperCase())}function Cn(e){let t=new Set;for(let n of bn){let r=(n.ausser??[]).reduce((e,t)=>e.replaceAll(t,` `),e.all);n.keywords.some(e=>r.includes(e))&&t.add(n.label)}for(let n of Sn(Y(e.all,xn)))t.add(n);return[...t]}let wn=[`stundenlohn`,`regiearbeit`,`regiestunde`],Tn=[`vorhalten`,`vorhaltung`],En=[`werkplanung`,`ausführungsplanung`,`montageplanung`],Dn=[`gutachten`,`bestandsaufnahme`],On=[`baustelleneinrichtung`,`baustelle einrichten`,`baustelle räumen`,`bauzaun`,`baustrom`,`bauwasser`,`baustellenverkehr`,`bürocontainer`,`aufenthaltscontainer`,`sanitärcontainer`,`krananlage`,`turmdrehkran`,`sicherheitseinrichtung`],kn=[...wn,`vorarbeiter`,`facharbeiter`,`werker`,`polier`,`bauhelfer`],An=[...En,`werk- und montageplanung`,`schalplanung`,`bewehrungsplanung`,`statische berechnung`,`statischer nachweis`,`standsicherheitsnachweis`,`nachweisführung`,...Dn,`aufmaß erstellen`],jn=[`nebenleistung`,`besondere leistung`,...Tn,`andienung`,`baustellendokumentation`,`schlussreinigung`,`bauendreinigung`],Mn=new Set([`m`,`m2`,`m²`,`m3`,`m³`,`mm`,`cm`,`km`,`stk`,`st`,`stck`,`stück`,`psch`,`t`,`to`,`kg`,`l`]),Nn=new Set([`h`,`std`,`std.`,`min`,`d`,`tag`,`wo`,`mon`,`mt`]);function Pn(e){let t=yn(e);if(J(t,On))return`baustelleneinrichtung`;if(J(t,kn))return`personal`;if(J(t,An))return`planung`;if(J(t,jn))return`nebenleistung`;let n=e.unit;return n!==null&&Nn.has(n)?`personal`:n!==null&&Mn.has(n)?`bauteil`:`sonstige`}let Fn=/\b(?:lc|c)\s?\d{1,3}\/\d{1,3}\b/g,In=/\bx0\b|\bx[cdsfam][1-4]\b/g,Ln=/\bw[ofa]\b/g;function X(e){return e.map(e=>e.replace(/\s+/g,``).toUpperCase())}function Rn(e){return{beton:X(Y(e,Fn))[0]??null,expo:X(Y(e,In)),feuchtigkeitsklasse:X(Y(e,Ln))}}function zn(e){let{beton:t,expo:n,feuchtigkeitsklasse:r}=Rn(e),i={};return t!==null&&(i.beton=t),n.length>0&&(i.expo=n),r.length>0&&(i.feuchtigkeitsklasse=r),i}let Bn={id:`fallback`,extract:e=>zn(e.text.all)},Vn=[{label:`Polier`,keywords:[`polier`]},{label:`Vorarbeiter`,keywords:[`vorarbeiter`]},{label:`Facharbeiter`,keywords:[`facharbeiter`,`geselle`]},{label:`Werker`,keywords:[`werker`,`bauhelfer`,`helfer`]}],Hn={id:`personal`,positionsart:`personal`,extract(e){let t=e.text.all;return{qualifikation:Vn.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null,zeiteinheit:e.item.unit}}},Un=[{label:`Statik`,keywords:[`statische berechnung`,`statischer nachweis`,`standsicherheit`]},{label:`Bewehrungsplanung`,keywords:[`bewehrungsplanung`,`bewehrungsplan`]},{label:`Schalplanung`,keywords:[`schalplanung`,`schalplan`]},{label:`Werkplanung`,keywords:En},{label:`Gutachten`,keywords:Dn}],Wn={id:`planung`,positionsart:`planung`,extract(e){let t=e.text.all;return{planungsart:Un.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null}}},Gn=[{label:`Einrichten`,keywords:[`einrichten`,`liefern und aufstellen`,`antransport`]},{label:`Vorhalten`,keywords:Tn},{label:`Räumen`,keywords:[`räumen`,`abbauen`,`abtransport`]}],Kn=[Hn,Wn,{id:`baustelleneinrichtung`,positionsart:`baustelleneinrichtung`,extract(e){let t=e.text.all;return{einrichtungsart:Gn.find(e=>e.keywords.some(e=>t.includes(e)))?.label??null}}}];var qn=class{nonBauteil=new Map;registerNonBauteil(e){this.nonBauteil.set(e.positionsart,e)}resolveBauteil(){return Bn}resolveByPositionsart(e){return this.nonBauteil.get(e)??Bn}};function Jn(){let e=new qn;for(let t of Kn)e.registerNonBauteil(t);return e}var Yn=class{registry;constructor(e={}){this.registry=e.registry??Jn()}classify(e){let t=vn(e),n=Pn(t),r=_n({shortText:e.shortText,longText:e.longText,unit:e.unit,inputFields:e.inputFields,text:t}),i={positionsart:n,keywords:Cn(t),...r.attributes};if(n!==`bauteil`){let a=this.registry.resolveByPositionsart(n),o={item:e,text:t,positionsart:n};return this.result({...i,...a.extract(o)},a.id,r.spans)}let a=this.registry.resolveBauteil(),o={item:e,text:t,positionsart:n};return this.result({...i,...a.extract(o)},a.id,r.spans)}result(e,t,n){return{attributes:e,meta:{classifier:`rule`,ruleset:t,version:2,confidence:1},spans:n}}};function Xn(e,t){let{attributes:n,meta:r,spans:i}=t.classify({oz:e.oz,shortText:e.shortText,longText:e.longText,unit:e.unit,inputFields:e.inputFields});return{...e,attributes:{...n,_meta:r,...i.length>0?{_spans:i}:{}}}}function Zn(e,t){return{...e,positions:e.positions.map(e=>Xn(e,t)),sections:e.sections.map(e=>Zn(e,t))}}function Qn(e,t){return{...e,sections:e.sections.map(e=>Zn(e,t))}}function $n(e,t){return{...e,lots:e.lots.map(e=>Qn(e,t))}}let er=null;function tr(e){return e===void 0?(er??=new Yn,er):new Yn(e)}let nr={bauteil:`Bauteil`,personal:`Personal`,planung:`Planung`,baustelleneinrichtung:`Baustelleneinrichtung`,nebenleistung:`Nebenleistung`,sonstige:`Sonstige`},rr={NORMAL:`Normalposition`,ALTERNATIV:`Alternativposition`,BEDARF:`Bedarfsposition`,ZULAGENPOSITION:`Zulageposition`},ir=[`NORMAL`,`ALTERNATIV`,`BEDARF`,`ZULAGENPOSITION`];function Z(e){return t=>[...t].sort((t,n)=>{let r=e.indexOf(t),i=e.indexOf(n);return r<0&&i<0?t.localeCompare(n,`de`):r<0?1:i<0?-1:r-i})}let ar=A().find(e=>e.id===`beton`)?.name;function Q(e){return e===null?[]:[e]}let $=[{id:`positionsart`,label:`Positionsart`,get:e=>Q(j(e.attributes,`positionsart`)),optionLabel:e=>nr[e]??e,sortValues:Z(Object.keys(nr))},{id:`beton`,label:`Druckfestigkeit`,get:e=>Q(j(e.attributes,`beton`)),material:ar},{id:`expo`,label:`Exposition`,get:e=>M(e.attributes,`expo`),material:ar},{id:`material`,label:`Material`,get:e=>M(e.attributes,`material`)},...A().flatMap(e=>e.merkmale.map(t=>({id:t.key,label:`${t.name} (${e.name})`,get:e=>M(e.attributes,t.key),material:e.name,subLabel:t.name,sortValues:Z(t.werte.flatMap(({wert:e})=>e===null?[]:[e]))}))),{id:`keywords`,label:`Besonderheiten`,get:e=>M(e.attributes,`keywords`)},{id:`normen`,label:`Normen`,get:e=>M(e.attributes,`normen`)},{id:`fristen`,label:`Zeitbezug`,get:e=>M(e.attributes,`fristen`)},{id:`platzhalter`,label:`Offene Stellen`,get:e=>M(e.attributes,`platzhalter`)},{id:`positionstyp`,label:`Positionstyp`,get:e=>[e.positionType],optionLabel:e=>rr[e]??e,sortValues:Z(ir)},{id:`einheit`,label:`Einheit`,get:e=>Q(F(e.unit)),optionLabel:it}];new Map($.map(e=>[e.id,e]));function or(e){let t=j(e.attributes,`beton`)??``;return{facetValues:$.map(t=>t.get(e)),quantity:e.quantity??0,haystack:[e.shortText,e.oz,t,e.longText].join(`
`).toLowerCase()}}var sr=class{used=new Set;hashes;constructor(e){this.hashes=e}next(e,t,n){let r=`${e}:${t===``?n:t}`;if(!this.used.has(r))return this.used.add(r),r;let i=2;for(;this.used.has(`${r}#${i}`);)i++;let a=`${r}#${i}`;return this.used.add(a),a}};function cr(e,t){return e===``||t===``?e:e===t?``:e.startsWith(`${t}.`)?e.slice(t.length+1):e}function lr(e){return(e.quantity??0)*(e.unitPrice??0)}function ur(e,t,n,r){return{id:t.next(`position`,e.oz,`${n}`),kind:`position`,code:e.oz,ownCode:cr(e.oz,r),label:e.shortText===``?null:e.shortText,positionCount:1,totalPrice:lr(e),children:[],position:{oz:e.oz,shortText:e.shortText,longText:e.longText,unit:e.unit,quantity:e.quantity,unitPrice:e.unitPrice,positionType:e.positionType,attributes:e.attributes,hashes:t.hashes.get(e)??ee(e)}}}function dr(e){let t=0,n=0;for(let r of e)t+=r.positionCount,n+=r.totalPrice;return{positionCount:t,totalPrice:n}}function fr(e,t,n,r){let i=t.next(`section`,e.number,`${n}`),a=[...e.sections.map((n,r)=>fr(n,t,r,e.number)),...e.positions.map((n,r)=>ur(n,t,r,e.number))];return{id:i,kind:`section`,code:e.number,ownCode:cr(e.number,r),label:e.label,...dr(a),children:a,position:null}}function pr(e,t,n){let r=t.next(`lot`,e.number,`${n}`),i=e.sections.map((n,r)=>fr(n,t,r,e.number));return{id:r,kind:`lot`,code:e.number,ownCode:e.number,label:e.label,...dr(i),children:i,position:null}}function mr(e){let t=new sr(ne(e)),n=e.lots.map((e,n)=>pr(e,t,n));return{id:`project`,kind:`project`,code:``,ownCode:``,label:e.projectName,...dr(n),children:n,position:null}}function hr(e,t=[]){e.kind===`position`&&t.push(e);for(let n of e.children)hr(n,t);return t}function gr(e){let t=new Map,n=(e,r)=>{t.set(e.id,r);for(let t of e.children)n(t,e)};return n(e,null),t}function _r(e){let t=hr(e).filter(e=>e.position!==null),n=t.length,r=Array(n),i=Array(n),a=new Float64Array(n),o=new Float64Array(n),s=new Float64Array(n),c=new Map;for(let e=0;e<n;e++){let n=t[e],l=n.position;r[e]=l,i[e]=or(l),a[e]=l.quantity??NaN,o[e]=l.unitPrice??NaN,s[e]=n.totalPrice,c.set(n.id,e)}return{size:n,nodes:t,positions:r,facts:i,quantity:a,unitPrice:o,totalPrice:s,slotOf:c}}function vr(e){let t=1/0,n=-1/0;for(let r=0;r<e.length;r++){let i=e[r];Number.isFinite(i)&&(i<t&&(t=i),i>n&&(n=i))}return Number.isFinite(t)?{min:t,max:n}:null}function yr(e){let t=0;for(let n=0;n<e.length;n++)Number.isFinite(e[n])&&(t+=e[n]);return t}function br(e){let t=$.map(()=>new Map);for(let n of e.facts)for(let e=0;e<t.length;e++){let r=t[e];for(let t of n.facetValues[e])r.set(t,(r.get(t)??0)+1)}let n=new Map;return $.forEach((e,r)=>{let i=t[r],a=e.sortValues===void 0?[...i.keys()].sort((e,t)=>e.localeCompare(t,`de`)):e.sortValues([...i.keys()]);n.set(e.id,new Map(a.map(e=>[e,i.get(e)??0])))}),{positionCount:e.size,facets:n,quantity:vr(e.quantity),unitPrice:vr(e.unitPrice),totalPrice:yr(e.totalPrice)}}function xr(e,t){return t()}let Sr=new Set([`mm`,`cm`,`dm`,`m`,`m2`,`m3`,`km`,`kg`,`g`,`t`,`to`,`l`,`ltr`,`stk`,`stck`,`st`,`h`,`std`,`min`,`kn`,`mpa`,`n`]),Cr=new Set(`der.die.das.den.dem.des.ein.eine.einer.eines.einem.einen.und.oder.sowie.als.wie.mit.ohne.für.fuer.von.vom.zur.zum.zu.aus.auf.bei.beim.im.in.an.am.nach.über.ueber.unter.je.pro.ist.sind.wird.werden.bis.auch.nur.dabei.daran.dazu.sowohl.ggf.bzw.inkl.incl.einschl.usw`.split(`.`));function wr(e){let t=[];for(let n of e.toLowerCase().split(/[^0-9a-zäöüß²³]+/)){if(n===``)continue;if(/^\d/.test(n)){t.push(`#`);let e=n.replace(/^[\d.,]+/,``);e!==``&&t.push(Sr.has(Tr(e))?`#e`:e);continue}let e=Tr(n);if(Sr.has(e)){t.push(`#e`);continue}Cr.has(n)||n.length<2||t.push(n)}return t}function Tr(e){return e.replace(/²/g,`2`).replace(/³/g,`3`)}function Er(e){if(e.length<2)return new Set(e);let t=new Set;for(let n=0;n<e.length-1;n++)t.add(`${e[n]} ${e[n+1]}`);return t}function Dr(e,t){if(e.size===0||t.size===0)return 0;let[n,r]=e.size<=t.size?[e,t]:[t,e],i=0;for(let e of n)r.has(e)&&i++;return i/(e.size+t.size-i)}function Or(e,t){if(e.length===0)return NaN;if(e.length===1)return e[0];let n=(e.length-1)*t,r=Math.floor(n),i=Math.ceil(n);return e[r]+(e[i]-e[r])*(n-r)}function kr(e){let t=[...e].filter(e=>Number.isFinite(e)).sort((e,t)=>e-t);return t.length===0?null:{count:t.length,min:t[0],q1:Or(t,.25),median:Or(t,.5),q3:Or(t,.75),max:t[t.length-1]}}let Ar=new Set([`_meta`,`_spans`,`platzhalterAnzahl`]),jr=new Set([`einheit`]),Mr=` · `;function Nr(e){let t=new Map;for(let[n,r]of Object.entries(e.attributes))if(!Ar.has(n)){if(Array.isArray(r)){let e=r.filter(e=>typeof e==`string`&&e!==``);e.length>0&&t.set(n,[...e].sort((e,t)=>e.localeCompare(t,`de`)).join(Mr));continue}typeof r==`boolean`?t.set(n,r?`ja`:`nein`):typeof r==`number`?t.set(n,String(r)):typeof r==`string`&&r!==``&&t.set(n,r)}let n=F(e.unit);return n!==null&&t.set(`einheit`,it(n)),t.set(`positionstyp`,e.positionType),t}function Pr(e){return[...e].sort((e,t)=>e[0]<t[0]?-1:+(e[0]>t[0])).map(([e,t])=>`${e}=${t}`).join(`|`)}function Fr(e){let t=Nr(e),n=wr(e.shortText),r=wr(e.longText),i=Er(n),a=Er(r);return{bucket:F(e.unit)??`—`,kurz:i,lang:a,alle:[...new Set([...i,...a])],signature:`${n.join(` `)} ${r.join(` `)} ${Pr(t)}`,merkmale:t,empty:n.length===0&&r.length===0}}function Ir(e,t){let n=e.kurz.size>0&&t.kurz.size>0?Dr(e.kurz,t.kurz):null,r=e.lang.size>0&&t.lang.size>0?Dr(e.lang,t.lang):null;return n===null?r??0:r===null?n:.6*n+.4*r}function Lr(e,t){return t===void 0?0:e===t?1:!e.includes(` · `)&&!t.includes(` · `)?0:Dr(new Set(e.split(Mr)),new Set(t.split(Mr)))}function Rr(e,t){let n=0,r=0;for(let[i,a]of e.merkmale)jr.has(i)||(r++,n+=Lr(a,t.merkmale.get(i)));for(let n of t.merkmale.keys())jr.has(n)||e.merkmale.has(n)||r++;return r===0?null:n/r}function zr(e,t){let n=Ir(e,t),r=Rr(e,t);return r===null?n:.7*n+.3*r}var Br=class{parent;constructor(e){this.parent=new Int32Array(e);for(let t=0;t<e;t++)this.parent[t]=t}find(e){let t=e;for(;this.parent[t]!==t;)t=this.parent[t];let n=e;for(;this.parent[n]!==t;){let e=this.parent[n];this.parent[n]=t,n=e}return t}union(e,t){let n=this.find(e),r=this.find(t);n!==r&&(this.parent[r]=n)}};function Vr(e,t={}){let n=t.threshold??.62;if(e.size===0)return{clusters:[],clustered:0,total:0,threshold:n};let r=[],i=new Map,a=new Map;for(let t=0;t<e.size;t++){let n=Fr(e.positions[t]);if(n.empty)continue;let o=`${n.bucket} ${n.signature}`,s=a.get(o);if(s!==void 0){r[s].slots.push(t);continue}let c=r.length;r.push({slots:[t],profile:n}),a.set(o,c);let l=i.get(n.bucket);l===void 0?i.set(n.bucket,[c]):l.push(c)}let o=new Br(r.length),s=[];for(let e of i.values())e.length>1&&Hr(r,e,n,o,s);return Ur(e,r,o,s,n)}function Hr(e,t,n,r,i){let a=new Map;t.forEach((t,n)=>{for(let r of e[t].profile.alle){let e=a.get(r);e===void 0?a.set(r,[n]):e.push(n)}});let o=new Map;for(let s=0;s<t.length;s++){o.clear();let c=e[t[s]].profile;for(let e of c.alle){let t=a.get(e);if(!(t===void 0||t.length>256))for(let e of t)e>s&&o.set(e,(o.get(e)??0)+1)}let l=Math.min(2,c.alle.length),u=256;for(let[a,d]of o){if(d<l||r.find(t[s])===r.find(t[a]))continue;if(u--<=0)break;let o=zr(c,e[t[a]].profile);o<n||(r.union(t[s],t[a]),i.push({a:t[s],score:o}))}}}function Ur(e,t,n,r,i){let a=new Map;t.forEach((e,t)=>{let r=n.find(t),i=a.get(r);i===void 0?a.set(r,[t]):i.push(t)});let o=new Map,s=(e,t)=>{let n=o.get(e);n===void 0?o.set(e,{sum:t,count:1}):(n.sum+=t,n.count++)};for(let e of r)s(n.find(e.a),e.score);t.forEach((e,t)=>{for(let r=1;r<e.slots.length;r++)s(n.find(t),1)});let c=[],l=0;for(let[n,r]of a){let i=r.flatMap(e=>t[e].slots).sort((e,t)=>e-t);if(i.length<2)continue;l+=i.length;let a=o.get(n);c.push(Wr(e,i,a===void 0?1:a.sum/a.count))}return c.sort((e,t)=>t.positionIds.length-e.positionIds.length),{clusters:c,clustered:l,total:e.size,threshold:i}}function Wr(e,t,n){let r=t.map(t=>e.positions[t]),i=t.map(t=>e.nodes[t].id),{gemeinsameMerkmale:a,unterscheidendeMerkmale:o}=Gr(r);return{id:`cluster:${i[0]}`,positionIds:i,label:Kr(r),gemeinsameMerkmale:a,unterscheidendeMerkmale:o,unitPrice:kr(t.map(t=>e.unitPrice[t])),quantity:kr(t.map(t=>e.quantity[t])),similarity:n}}function Gr(e){let t=new Map,n=new Map;for(let r of e)for(let[e,i]of Nr(r)){let r=t.get(e);r===void 0?t.set(e,new Set([i])):r.add(i),n.set(e,(n.get(e)??0)+1)}let r={},i=[];for(let[a,o]of t)o.size===1&&n.get(a)===e.length?r[a]=[...o][0]:i.push([a,o.size]);return new Set(e.map(e=>e.shortText)).size>1&&i.push([`kurztext`,2]),i.sort((e,t)=>t[1]-e[1]||e[0].localeCompare(t[0],`de`)),{gemeinsameMerkmale:r,unterscheidendeMerkmale:i.map(([e])=>e)}}function Kr(e){let t=new Map;for(let n of e){let e=n.shortText.trim();e!==``&&t.set(e,(t.get(e)??0)+1)}let n=null,r=0;for(let[e,i]of t)(i>r||i===r&&n!==null&&e.length<n.length)&&(n=e,r=i);return n??`Ohne Kurztext`}function qr(e,t,n=null){let r=$n(e,tr()),i=mr(r),a=_r(i),o=br(a),s=xr(`Beziehungen`,()=>Vr(a));return{tree:i,projectName:r.projectName,client:r.client,fileName:t,fileId:n,summary:o,check:Mt(a,o,Tt,gr(i)),relations:s}}self.onmessage=e=>{let{draft:t,fileName:n,fileId:r}=e.data,i;try{i={ok:!0,result:qr(t,n,r)}}catch(e){i={ok:!1,...Le(e)}}self.postMessage(i)}})();