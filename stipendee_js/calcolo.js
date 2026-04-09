let e, t, i, o, d, r, n, a, u, l, m, c, b, s, N, R, x, p, g;
import "./naspi.e1790c76.js";
function h(e, t, i, o) {
  Object.defineProperty(e, t, {
    get: i,
    set: o,
    enumerable: !0,
    configurable: !0,
  });
}
function f(e) {
  return e && e.__esModule ? e.default : e;
}
var y = globalThis,
  v = {},
  k = {},
  E = y.parcelRequire6be7;
null == E &&
  (((E = function (e) {
    if (e in v) return v[e].exports;
    if (e in k) {
      var t = k[e];
      delete k[e];
      var i = { id: e, exports: {} };
      return ((v[e] = i), t.call(i.exports, i, i.exports), i.exports);
    }
    var o = Error("Cannot find module '" + e + "'");
    throw ((o.code = "MODULE_NOT_FOUND"), o);
  }).register = function (e, t) {
    k[e] = t;
  }),
  (y.parcelRequire6be7 = E));
var I = E.register;
(I("01FIu", function (e, t) {
  h(e.exports, "handleShareClick", () => a);
  var i = E("j591w");
  let o = "ph ph-share-network",
    d = "ph ph-copy";
  function r(e, { label: t, iconClass: i } = {}) {
    let o = e.querySelector(".button-text"),
      d = e.querySelector("i");
    if (i)
      if (d) d.className = i;
      else {
        let t = document.createElement("i");
        ((t.className = i),
          e.prepend(t),
          e.insertAdjacentText("afterbegin", " "));
      }
    if (o) {
      "string" == typeof t && (o.textContent = t);
      return;
    }
    if (d) {
      "string" == typeof t && (e.innerHTML = `${d.outerHTML} ${t}`);
      return;
    }
    "string" == typeof t && (e.textContent = t);
  }
  async function n(e) {
    try {
      if (navigator.clipboard && window.isSecureContext)
        return (await navigator.clipboard.writeText(e), !0);
    } catch (e) {}
    return (
      !!(function (e) {
        try {
          let t = document.createElement("textarea");
          ((t.value = e),
            t.setAttribute("readonly", ""),
            (t.style.position = "fixed"),
            (t.style.top = "-1000px"),
            (t.style.left = "-1000px"),
            document.body.appendChild(t),
            t.focus(),
            t.select(),
            t.setSelectionRange(0, t.value.length));
          let i = document.execCommand("copy");
          return (document.body.removeChild(t), i);
        } catch (e) {
          return !1;
        }
      })(e) || (window.prompt("Copia il link:", e), !1)
    );
  }
  async function a(e, t = {}) {
    if (!e) return;
    let {
      campaign: u = "sharing_link",
      generatingText: l = "Generazione...",
      readyText: m = "Copia link",
      copiedText: c = "Link copiato",
      resetAfterMs: b = 1500,
    } = t;
    e.dataset.shareOriginalContent ||
      (e.dataset.shareOriginalContent = e.innerHTML);
    let s = e.dataset.shareShortUrl;
    if ("ready" === e.dataset.shareStage && s) {
      e.disabled = !0;
      try {
        (await n(s), r(e, { label: c, iconClass: "ph ph-check" }));
      } finally {
        setTimeout(() => {
          ((e.disabled = !1), r(e, { label: m, iconClass: d }));
        }, b);
      }
      return;
    }
    ((e.disabled = !0), r(e, { label: l, iconClass: o }));
    try {
      let t = await (0, i.createShortUrl)(window.location.href, u);
      ((e.dataset.shareShortUrl = t),
        (e.dataset.shareStage = "ready"),
        r(e, { label: m, iconClass: d }));
    } catch (t) {
      (console.error("Short URL creation failed", t),
        (e.dataset.shareStage = "error"),
        r(e, { label: "Errore, riprova", iconClass: o }),
        setTimeout(() => {
          ((e.innerHTML = e.dataset.shareOriginalContent),
            delete e.dataset.shareStage,
            delete e.dataset.shareShortUrl);
        }, 2e3));
    }
    e.disabled = !1;
  }
}),
  I("j591w", function (e, t) {
    h(e.exports, "createShortUrl", () => l);
    var i = E("4QApW"),
      o = E("ilpIi");
    let d = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789",
      r = "referral",
      n = "referral",
      a = "sharing_link";
    async function u(e) {
      for (let t = 0; t < 5; t += 1) {
        let t = (function (e = 6) {
            let t = "";
            for (let i = 0; i < e; i += 1)
              t += d.charAt(Math.floor(Math.random() * d.length));
            return t;
          })(6 + Math.floor(3 * Math.random())),
          i = (0, o.doc)(e, t);
        if (!(await (0, o.getDoc)(i)).exists())
          return { shortCode: t, docRef: i };
      }
      throw Error("Unable to generate unique short code");
    }
    async function l(e, t = a) {
      let d = (function (e, t = a) {
          try {
            let i = new URL(e, window.location.origin);
            return (
              i.searchParams.set("utm_source", r),
              i.searchParams.set("utm_medium", n),
              i.searchParams.set("utm_campaign", t || a),
              i.toString()
            );
          } catch (t) {
            return (console.error("appendShareTrackingParams failed", t), e);
          }
        })(e, t),
        { app: m } = (0, i.firebaseInit)(),
        c = (0, o.getFirestore)(m),
        b = (0, o.collection)(c, "shortUrls"),
        { shortCode: s, docRef: N } = await u(b),
        R = {
          originalUrl: d,
          shortCode: s,
          baseUrl: window.location.origin,
          createdAt: (0, o.serverTimestamp)(),
          utm_source: r,
          utm_medium: n,
          utm_campaign: t || a,
        };
      await (0, o.setDoc)(N, R);
      let x = window.location.origin || "https://www.stipendee.it";
      return `${x}/s/${s}`;
    }
  }));
var S = E("01FIu"),
  L = {};
L = JSON.parse(
  '{"aliquote_regionali":{"Abruzzo":{"primoScaglione":0.0173,"secondoScaglione":0.0173,"terzoScaglione":0.0173,"else":0.0173},"Basilicata":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123},"Bolzano":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0173},"Calabria":{"primoScaglione":0.0173,"secondoScaglione":0.0173,"terzoScaglione":0.0173,"else":0.0173},"Campania":{"primoScaglione":0.0173,"secondoScaglione":0.0296,"terzoScaglione":0.032,"else":0.0333},"Emilia-Romagna":{"primoScaglione":0.0133,"secondoScaglione":0.0193,"terzoScaglione":0.0203,"else":0.0227},"Friuli Venezia-Giulia":{"primoScaglione":0.007,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123},"Lazio":{"primoScaglione":0.0173,"secondoScaglione":0.0333,"terzoScaglione":0.0333,"else":0.0333},"Liguria":{"primoScaglione":0.0123,"secondoScaglione":0.0179,"terzoScaglione":0.0231,"else":0.0233},"Lombardia":{"primoScaglione":0.0123,"secondoScaglione":0.0158,"terzoScaglione":0.0172,"else":0.0173},"Marche":{"primoScaglione":0.0123,"secondoScaglione":0.0153,"terzoScaglione":0.017,"else":0.0173},"Molise":{"primoScaglione":0.0203,"secondoScaglione":0.0223,"terzoScaglione":0.0243,"else":0.0263},"Piemonte":{"primoScaglione":0.0162,"secondoScaglione":0.0213,"terzoScaglione":0.0275,"else":0.0333},"Puglia":{"primoScaglione":0.0133,"secondoScaglione":0.0143,"terzoScaglione":0.0163,"else":0.0185},"Sardegna":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123},"Sicilia":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123},"Toscana":{"primoScaglione":0.0142,"secondoScaglione":0.0143,"terzoScaglione":0.0168,"else":0.0173},"Trento":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0173},"Umbria":{"primoScaglione":0.0123,"secondoScaglione":0.0162,"terzoScaglione":0.0167,"else":0.0183},"Valle d\'Aosta":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123},"Veneto":{"primoScaglione":0.0123,"secondoScaglione":0.0123,"terzoScaglione":0.0123,"else":0.0123}},"aliquote_inps":{"lavoratore":{"regolare":0.0919,"apprendistato":0.0584,"quindici_dipendenti":0.0949,"pubblico":0.088},"azienda":{"regolare":0.2381,"apprendistato":0.1,"pubblico":0.242},"massimale2024":119650,"massimale2025":120607,"massimale2026":120607,"esonero2024":{"primoScaglione":{"sconto":0.07,"soglia":1923},"secondoScaglione":{"sconto":0.06,"soglia":2692}},"esonero_madre_lavoratrice":{"soglia":3000}},"inail":{"massimale":35696.7,"minimale":19221.3},"aliquote_irpef":{"2026":{"primoScaglione":{"aliquota":0.23,"scaglioniPrecedenti":0},"secondoScaglione":{"aliquota":0.33,"scaglioniPrecedenti":6440.23},"else":{"aliquota":0.43,"scaglioniPrecedenti":13700.23}},"default":{"primoScaglione":{"aliquota":0.23,"scaglioniPrecedenti":0},"secondoScaglione":{"aliquota":0.35,"scaglioniPrecedenti":6440.23},"else":{"aliquota":0.43,"scaglioniPrecedenti":14140.23}}},"dati_reddito":{"Abruzzo":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":63624},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":14596},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":11703},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":10142},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":9477},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":8591},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":8661},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":16829},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":16727},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":49976},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":59638},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":53219},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":72802},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":120776},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":149754},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":53815},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":73499},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":33988},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":30755},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":7398},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":5329},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":745},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":2844},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":2668},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":3925},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":2645},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":3069},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":2217},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":1534},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":914},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":603}],"Basilicata":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":29882},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":6032},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":4988},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":4433},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":4087},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":3701},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":3534},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":7338},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":7316},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":24068},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":27921},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":25204},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":32057},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":47759},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":56211},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":19387},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":27068},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":12465},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":10097},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":2263},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":1739},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":2249},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":859},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":711},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":1164},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":846},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":1068},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":730},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":411},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":237},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":138}],"Bolzano":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":18748},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":9303},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":6812},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":5122},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":4397},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":4095},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":3597},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":6446},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":5981},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":15832},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":20946},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":17384},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":27047},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":48856},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":65239},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":2938},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":49164},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":26543},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":28468},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":734},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":5056},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":6811},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":2452},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":199},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":3053},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":2254},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":2877},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":2636},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":2167},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":1429},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":915}],"Calabria":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":85806},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":20589},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":17784},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":16964},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":15123},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":13864},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":13742},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":29441},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":29241},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":9648},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":115469},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":83141},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":93277},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":133316},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":143634},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":51136},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":75944},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":36118},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":29291},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":6405},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":4629},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":6845},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":2675},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":2479},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":4005},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":2515},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":2855},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":1834},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":1189},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":593},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":323}],"Campania":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":219772},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":57773},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":49455},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":46047},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":43322},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":38055},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":38105},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":75476},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":78393},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":224211},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":252469},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":199588},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":252214},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":384927},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":433538},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":160699},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":244503},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":12114},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":108478},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":25285},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":17529},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":25874},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":986},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":8948},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":14024},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":9448},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":11833},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":8373},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":5366},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":2945},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1907}],"Emilia-Romagna":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":141177},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":38784},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":32568},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":29084},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":27542},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":24951},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":24483},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":47319},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":4727},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":117391},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":158718},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":145445},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":241604},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":472077},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":641585},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":249116},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":355228},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":16681},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":168372},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":46674},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":34976},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":48209},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":17878},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":15249},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":23148},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":16238},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":20212},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":15895},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":11719},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":7785},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":5641}],"Friuli Venezia-Giulia":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":43767},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":11111},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":9167},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":8224},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":7755},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":738},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":6939},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":13392},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":13212},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":3496},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":42765},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":40572},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":65821},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":128298},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":176255},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":7062},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":97925},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":46111},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":43131},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":1092},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":7982},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":11275},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":4341},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":3797},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":5627},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":3912},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":4786},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":355},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":2602},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":1577},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1052}],"Italia":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":2138943},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":522713},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":477905},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":389771},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":401055},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":352835},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":328771},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":574441},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":557206},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":1819652},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":2388176},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":2043785},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":2956751},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":5398169},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":6871168},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":2407459},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":3184592},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":1390169},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":1615265},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":414973},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":351384},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":496719},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":165748},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":156347},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":246459},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":153059},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":220671},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":166771},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":94720},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":79973},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":52405}],"Lazio":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":241463},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":63776},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":49732},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":4305},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":39217},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":35571},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":35428},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":70023},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":68821},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":179629},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":229845},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":192864},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":273307},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":441383},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":549627},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":220507},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":355106},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":20006},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":218324},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":5896},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":42735},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":61858},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":23116},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":19856},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":31987},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":22891},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":28436},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":21933},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":16066},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":9545},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":6773}],"Liguria":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":5693},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":15784},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":13375},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":11863},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":11025},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":10323},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":10238},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":20595},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":21081},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":5229},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":63772},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":55727},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":86032},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":150283},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":187121},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":74993},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":113064},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":57453},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":5834},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":15317},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":11111},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":15806},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":5796},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":5027},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":7932},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":5636},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":6837},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":5117},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":3903},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":2305},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1565}],"Lombardia":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":320912},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":79693},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":68439},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":61074},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":58166},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":52684},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":50804},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":99653},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":10023},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":269252},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":333035},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":302423},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":474614},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":958978},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":1335042},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":522073},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":751388},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":369124},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":386276},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":112812},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":85556},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":121779},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":44669},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":37689},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":58223},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":41851},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":52841},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":42925},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":3417},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":24182},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":19887}],"Marche":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":53955},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":13856},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":12129},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":10837},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":10285},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":9193},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":9101},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":18054},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":1748},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":50551},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":6372},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":5992},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":92533},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":169879},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":211012},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":70928},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":93178},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":42445},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":40561},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":10818},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":7897},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":11387},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":4216},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":364},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":5596},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":3926},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":4908},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":3727},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":2665},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":1639},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1106}],"Molise":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":18734},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":4019},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":3052},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":2656},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":2397},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":214},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":207},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":3915},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":4015},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":13902},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":15219},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":13858},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":16485},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":25324},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":29549},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":11035},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":15323},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":7265},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":5973},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":1343},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":946},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":1356},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":525},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":466},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":749},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":492},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":572},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":420},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":253},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":148},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":72}],"Piemonte":[{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":36693},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":31229},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":28102},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":25837},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":23537},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":23371},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":44769},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":43437},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":119766},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":150226},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":139459},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":220098},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":434906},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":597866},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":226988},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":319299},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":151414},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":148696},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":40542},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":29414},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":40747},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":1495},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":12597},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":19746},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":1435},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":17697},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":13706},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":10071},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":6342},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":4361}],"Puglia":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":217342},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":452},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":35972},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":33035},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":31047},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":27087},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":27142},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":53324},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":55457},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":157035},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":207883},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":165247},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":231933},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":328463},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":356052},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":129518},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":18002},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":86802},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":80545},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":18009},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":12379},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":17711},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":6921},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":6109},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":9685},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":6511},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":7901},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":5638},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":3861},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":2015},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1099}],"Sardegna":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":69516},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":15975},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":13657},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":12315},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":11847},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":10938},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":10469},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":2081},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":22198},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":67599},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":75099},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":63698},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":8914},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":145271},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":169843},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":61025},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":80871},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":39237},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":34236},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":8358},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":5943},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":9177},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":3866},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":3186},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":48},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":2983},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":3506},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":2394},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":1568},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":891},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":476}],"Sicilia":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":238561},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":50603},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":42346},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":37962},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":35018},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":31077},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":29802},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":591},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":62359},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":200605},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":236154},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":185476},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":256342},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":347422},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":364576},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":13071},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":20055},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":100007},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":92718},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":22095},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":15546},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":22242},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":8887},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":7866},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":12218},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":7984},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":9567},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":6338},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":4144},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":2205},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":1153}],"Toscana":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":120505},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":32418},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":26957},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":24556},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":23818},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":21586},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":21447},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":42696},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":43507},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":117385},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":151692},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":130165},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":208033},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":390885},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":497624},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":182614},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":25248},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":118168},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":119739},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":33182},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":24343},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":34287},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":12899},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":10951},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":17079},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":1192},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":15021},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":11536},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":8363},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":5224},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":3553}],"Trento":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":21129},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":6336},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":5049},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":4082},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":4056},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":3491},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":3371},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":6234},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":6164},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":17082},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":20172},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":18782},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":29816},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":57153},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":77624},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":33055},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":45842},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":20838},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":19684},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":5421},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":384},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":5214},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":1942},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":1659},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":2589},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":1924},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":2582},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":2122},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":1472},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":881},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":536}],"Umbria":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":53167},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":816},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":6676},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":6273},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":5656},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":5137},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":4969},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":9834},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":9846},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":28713},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":34441},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":32246},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":5119},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":92073},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":115384},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":41355},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":55949},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":25561},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":22969},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":5741},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":4341},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":6252},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":2443},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":2125},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":3344},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":2178},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":2812},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":1925},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":1312},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":834},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":567}],"Valle d\'Aosta":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":4906},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":1345},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":1172},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":982},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":892},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":804},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":718},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":1375},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":1337},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":3389},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":4552},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":4046},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":6795},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":13008},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":1705},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":6977},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":9885},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":5418},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":5126},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":1299},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":887},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":1234},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":466},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":356},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":580},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":472},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":580},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":433},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":361},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":173},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":102}],"Veneto":[{"Reddito text":"da 0 a 1.000","Reddito Number":500,"Numero contribuenti":168826},{"Reddito text":"da 1.000 a 1.500","Reddito Number":1250,"Numero contribuenti":42759},{"Reddito text":"da 1.500 a 2.000","Reddito Number":1750,"Numero contribuenti":35643},{"Reddito text":"da 2.000 a 2.500","Reddito Number":2250,"Numero contribuenti":31713},{"Reddito text":"da 2.500 a 3.000","Reddito Number":2750,"Numero contribuenti":30091},{"Reddito text":"da 3.000 a 3.500","Reddito Number":3250,"Numero contribuenti":27198},{"Reddito text":"da 3.500 a 4.000","Reddito Number":3750,"Numero contribuenti":2643},{"Reddito text":"da 4.000 a 5.000","Reddito Number":4500,"Numero contribuenti":5056},{"Reddito text":"da 5.000 a 6.000","Reddito Number":5500,"Numero contribuenti":51616},{"Reddito text":"da 6.000 a 7.500","Reddito Number":6750,"Numero contribuenti":144893},{"Reddito text":"da 7.500 a 10.000","Reddito Number":8750,"Numero contribuenti":181788},{"Reddito text":"da 10.000 a 12.000","Reddito Number":11000,"Numero contribuenti":169249},{"Reddito text":"da 12.000 a 15.000","Reddito Number":13500,"Numero contribuenti":261908},{"Reddito text":"da 15.000 a 20.000","Reddito Number":17500,"Numero contribuenti":507132},{"Reddito text":"da 20.000 a 26.000","Reddito Number":23000,"Numero contribuenti":711927},{"Reddito text":"da 26.000 a 29.000","Reddito Number":27500,"Numero contribuenti":269167},{"Reddito text":"da 29.000 a 35.000","Reddito Number":32000,"Numero contribuenti":358051},{"Reddito text":"da 35.000 a 40.000","Reddito Number":37500,"Numero contribuenti":162411},{"Reddito text":"da 40.000 a 50.000","Reddito Number":45000,"Numero contribuenti":15992},{"Reddito text":"da 50.000 a 55.000","Reddito Number":52500,"Numero contribuenti":44289},{"Reddito text":"da 55.000 a 60.000","Reddito Number":57500,"Numero contribuenti":32662},{"Reddito text":"da 60.000 a 70.000","Reddito Number":65000,"Numero contribuenti":45661},{"Reddito text":"da 70.000 a 75.000","Reddito Number":72500,"Numero contribuenti":16472},{"Reddito text":"da 75.000 a 80.000","Reddito Number":77500,"Numero contribuenti":14045},{"Reddito text":"da 80.000 a 90.000","Reddito Number":85000,"Numero contribuenti":21737},{"Reddito text":"da 90.000 a 100.000","Reddito Number":95000,"Numero contribuenti":15726},{"Reddito text":"da 100.000 a 120.000","Reddito Number":110000,"Numero contribuenti":20711},{"Reddito text":"da 120.000 a 150.000","Reddito Number":135000,"Numero contribuenti":16517},{"Reddito text":"da 150.000 a 200.000","Reddito Number":175000,"Numero contribuenti":12276},{"Reddito text":"da 200.000 a 300.000","Reddito Number":250000,"Numero contribuenti":8109},{"Reddito text":"oltre 300.000","Reddito Number":300000,"Numero contribuenti":576}]}}',
);
let w = (e, t, i = {}) => {
    let o = t.aliquote_inps,
      d = i.year || "2026",
      r = Math.min(e, o[`massimale${d}`] || o.massimale2026),
      n = i.esoneroContributivo ?? !1,
      a = i.madreLavoratrice ?? !1,
      u = i.mensilita || 14,
      l = r / u,
      m = i.apprendistato ?? !1,
      c = 0,
      b = (i.alinpsDip ?? 0) / 100,
      s = (i.alinpsDat ?? 0) / 100;
    return {
      inpsDipendente: (c =
        n && l <= o.esonero2024.secondoScaglione.soglia
          ? m
            ? 0
            : l <= o.esonero2024.primoScaglione.soglia
              ? Math.round(
                  12 *
                    l *
                    Math.max(b - o.esonero2024.primoScaglione.sconto, 0) +
                    l * (u - 12) * b,
                )
              : Math.round(
                  12 *
                    l *
                    Math.max(b - o.esonero2024.secondoScaglione.sconto, 0) +
                    l * (u - 12) * b,
                )
          : a
            ? Math.round(
                Math.max(r * b - o.esonero_madre_lavoratrice.soglia, 0),
              )
            : Math.round(r * b)),
      inpsAzienda: Math.round(r * s),
    };
  },
  C = (e, t, i = {}) => {
    let o = i.rientroCervelli ?? !1,
      d = parseFloat(i.imponibileCervelli ?? 1);
    return o && e <= 6e5 ? (e - t) * d : e - t;
  },
  z = (e, t, i = {}) => {
    let o = i.year || "2026",
      d = t.aliquote_irpef[o] || t.aliquote_irpef.default,
      r = 0;
    return (
      e >= 0 && e <= 28e3
        ? (r = Math.round(e * d.primoScaglione.aliquota))
        : e > 28e3 && e <= 5e4
          ? (r = Math.round(
              (e - 28e3) * d.secondoScaglione.aliquota +
                d.secondoScaglione.scaglioniPrecedenti,
            ))
          : e > 5e4 &&
            (r = Math.round(
              (e - 5e4) * d.else.aliquota + d.else.scaglioniPrecedenti,
            )),
      r
    );
  },
  q = (e, t, i, o = {}) => {
    let d = t.aliquote_regionali,
      r = o.regione || "",
      n = 0;
    return (
      i > 0 &&
        r &&
        d[r] &&
        (e >= 0 && e <= 15e3
          ? (n = Math.round(e * d[r].primoScaglione))
          : e > 15e3 && e <= 28e3
            ? (n = Math.round(
                15e3 * d[r].primoScaglione + (e - 15e3) * d[r].secondoScaglione,
              ))
            : e > 28e3 && e <= 5e4
              ? (n = Math.round(
                  15e3 * d[r].primoScaglione +
                    13e3 * d[r].secondoScaglione +
                    (e - 28e3) * d[r].terzoScaglione,
                ))
              : e > 5e4 &&
                (n = Math.round(
                  15e3 * d[r].primoScaglione +
                    13e3 * d[r].secondoScaglione +
                    22e3 * d[r].terzoScaglione +
                    (e - 5e4) * d[r].else,
                ))),
      n
    );
  },
  B = (e, t, i = {}) => {
    let o = 0;
    return (
      t > 0 &&
        (o = Math.round((parseFloat(i.addizionaleComunale ?? 0) / 100) * e)),
      o
    );
  },
  F = (e, t = {}) => {
    let i = 0;
    e >= 0 && e <= 15e3
      ? (i = 1955)
      : e > 15e3 && e <= 28e3
        ? (i = Math.round(1910 + ((28e3 - e) / 13e3) * 1190))
        : e > 28e3 && e <= 5e4 && (i = Math.round(((5e4 - e) / 22e3) * 1910));
    let o = t.ral ?? 0;
    return (o > 25e3 && o <= 35e3 && (i += 65), i);
  },
  _ = (e, t = {}) => {
    let i = 0;
    return (
      t.coniugeCarico &&
        (e <= 15e3
          ? (i = 800 - (e / 15e3) * 110)
          : e <= 4e4
            ? ((i = 690),
              e > 29e3 && e <= 29200
                ? (i += 10)
                : e > 29300 && e <= 34700
                  ? (i += 30)
                  : e > 35e3 && e <= 35100
                    ? (i += 20)
                    : e > 35100 && e <= 35200 && (i += 10))
            : e <= 8e4 && (i = ((8e4 - e) / 4e4) * 690)),
      Math.round(i)
    );
  },
  A = (e, t, i = {}) => {
    let o = 0,
      d = e - t;
    if (i.cuneoFiscale)
      switch (!0) {
        case d > 2e4 && d <= 32e3:
          o = 1e3;
          break;
        case d > 32e3 && d <= 4e4:
          o = ((4e4 - d) / 8e3) * 1e3;
          break;
        default:
          o = 0;
      }
    return Math.round(o);
  },
  M = (e, t, i, o, d, r = {}) => {
    let n = 0,
      a = 0;
    void 0 !== r.altreDetrazioni && (a = parseFloat(r.altreDetrazioni) || 0);
    let u = t + o + d + a;
    return (
      r.bonus100Flag &&
        (e <= 15e3 && i > t
          ? (n = 1200)
          : e <= 28e3 && (n = u > i ? Math.min(1200, u - i) : 0)),
      n
    );
  },
  T = (e, t = {}) => {
    let i = 0;
    if (t.cuneoFiscale)
      switch (!0) {
        case e <= 8500:
          i = 0.071 * e;
          break;
        case e > 8500 && e <= 15e3:
          i = 0.053 * e;
          break;
        case e > 15e3 && e <= 2e4:
          i = 0.048 * e;
          break;
        default:
          i = 0;
      }
    return Math.round(i);
  },
  D = (e, t, i, o) => Math.max(e - t - i - o, 0),
  P = (e, t, i) => Math.round(e + t + i),
  $ = (e, t, i, o, d) => {
    let r = Math.round(e - t - i + o + d),
      n = i + t + r;
    return (n !== e + o + d && (r -= n - (e + o + d)), r);
  },
  j = (e, t = {}) =>
    Math.round(
      e /
        (t.mensilita ||
          document.querySelector('input[name="mensilita"]:checked')?.value ||
          14),
    ),
  U = (e, t) =>
    Math.round(
      (Math.max(t.inail.minimale, Math.min(e, t.inail.massimale)) / 1e3) * 30,
    );
var O = E("2YFJl");
function V(e, t) {
  let i;
  if (void 0 === t)
    for (let t of e)
      null != t && (i < t || (void 0 === i && t >= t)) && (i = t);
  else {
    let o = -1;
    for (let d of e)
      null != (d = t(d, ++o, e)) &&
        (i < d || (void 0 === i && d >= d)) &&
        (i = d);
  }
  return i;
}
function H(e, t) {
  let i;
  if (void 0 === t)
    for (let t of e)
      null != t && (i > t || (void 0 === i && t >= t)) && (i = t);
  else {
    let o = -1;
    for (let d of e)
      null != (d = t(d, ++o, e)) &&
        (i > d || (void 0 === i && d >= d)) &&
        (i = d);
  }
  return i;
}
function K(e, t) {
  let i = 0;
  if (void 0 === t) for (let t of e) (t *= 1) && (i += t);
  else {
    let o = -1;
    for (let d of e) (d = +t(d, ++o, e)) && (i += d);
  }
  return i;
}
function W(e) {
  return e.target.depth;
}
function G(e) {
  return e.depth;
}
function J(e, t) {
  return t - 1 - e.height;
}
function Y(e, t) {
  return e.sourceLinks.length ? e.depth : t - 1;
}
function Q(e) {
  return e.targetLinks.length
    ? e.depth
    : e.sourceLinks.length
      ? H(e.sourceLinks, W) - 1
      : 0;
}
function Z(e) {
  return function () {
    return e;
  };
}
function X(e, t) {
  return et(e.source, t.source) || e.index - t.index;
}
function ee(e, t) {
  return et(e.target, t.target) || e.index - t.index;
}
function et(e, t) {
  return e.y0 - t.y0;
}
function ei(e) {
  return e.value;
}
function eo(e) {
  return e.index;
}
function ed(e) {
  return e.nodes;
}
function er(e) {
  return e.links;
}
function en(e, t) {
  let i = e.get(t);
  if (!i) throw Error("missing: " + t);
  return i;
}
function ea({ nodes: e }) {
  for (let t of e) {
    let e = t.y0,
      i = e;
    for (let i of t.sourceLinks) ((i.y0 = e + i.width / 2), (e += i.width));
    for (let e of t.targetLinks) ((e.y1 = i + e.width / 2), (i += e.width));
  }
}
var eu = Math.PI,
  el = 2 * eu,
  em = el - 1e-6;
function ec() {
  ((this._x0 = this._y0 = this._x1 = this._y1 = null), (this._ = ""));
}
function eb() {
  return new ec();
}
ec.prototype = eb.prototype = {
  constructor: ec,
  moveTo: function (e, t) {
    this._ +=
      "M" + (this._x0 = this._x1 = +e) + "," + (this._y0 = this._y1 = +t);
  },
  closePath: function () {
    null !== this._x1 &&
      ((this._x1 = this._x0), (this._y1 = this._y0), (this._ += "Z"));
  },
  lineTo: function (e, t) {
    this._ += "L" + (this._x1 = +e) + "," + (this._y1 = +t);
  },
  quadraticCurveTo: function (e, t, i, o) {
    this._ +=
      "Q" + +e + "," + +t + "," + (this._x1 = +i) + "," + (this._y1 = +o);
  },
  bezierCurveTo: function (e, t, i, o, d, r) {
    this._ +=
      "C" +
      +e +
      "," +
      +t +
      "," +
      +i +
      "," +
      +o +
      "," +
      (this._x1 = +d) +
      "," +
      (this._y1 = +r);
  },
  arcTo: function (e, t, i, o, d) {
    ((e *= 1), (t *= 1), (i *= 1), (o *= 1), (d *= 1));
    var r = this._x1,
      n = this._y1,
      a = i - e,
      u = o - t,
      l = r - e,
      m = n - t,
      c = l * l + m * m;
    if (d < 0) throw Error("negative radius: " + d);
    if (null === this._x1)
      this._ += "M" + (this._x1 = e) + "," + (this._y1 = t);
    else if (c > 1e-6)
      if (Math.abs(m * a - u * l) > 1e-6 && d) {
        var b = i - r,
          s = o - n,
          N = a * a + u * u,
          R = Math.sqrt(N),
          x = Math.sqrt(c),
          p =
            d *
            Math.tan(
              (eu - Math.acos((N + c - (b * b + s * s)) / (2 * R * x))) / 2,
            ),
          g = p / x,
          h = p / R;
        (Math.abs(g - 1) > 1e-6 &&
          (this._ += "L" + (e + g * l) + "," + (t + g * m)),
          (this._ +=
            "A" +
            d +
            "," +
            d +
            ",0,0," +
            +(m * b > l * s) +
            "," +
            (this._x1 = e + h * a) +
            "," +
            (this._y1 = t + h * u)));
      } else this._ += "L" + (this._x1 = e) + "," + (this._y1 = t);
  },
  arc: function (e, t, i, o, d, r) {
    ((e *= 1), (t *= 1), (i *= 1), (r = !!r));
    var n = i * Math.cos(o),
      a = i * Math.sin(o),
      u = e + n,
      l = t + a,
      m = 1 ^ r,
      c = r ? o - d : d - o;
    if (i < 0) throw Error("negative radius: " + i);
    (null === this._x1
      ? (this._ += "M" + u + "," + l)
      : (Math.abs(this._x1 - u) > 1e-6 || Math.abs(this._y1 - l) > 1e-6) &&
        (this._ += "L" + u + "," + l),
      i &&
        (c < 0 && (c = (c % el) + el),
        c > em
          ? (this._ +=
              "A" +
              i +
              "," +
              i +
              ",0,1," +
              m +
              "," +
              (e - n) +
              "," +
              (t - a) +
              "A" +
              i +
              "," +
              i +
              ",0,1," +
              m +
              "," +
              (this._x1 = u) +
              "," +
              (this._y1 = l))
          : c > 1e-6 &&
            (this._ +=
              "A" +
              i +
              "," +
              i +
              ",0," +
              +(c >= eu) +
              "," +
              m +
              "," +
              (this._x1 = e + i * Math.cos(d)) +
              "," +
              (this._y1 = t + i * Math.sin(d)))));
  },
  rect: function (e, t, i, o) {
    this._ +=
      "M" +
      (this._x0 = this._x1 = +e) +
      "," +
      (this._y0 = this._y1 = +t) +
      "h" +
      +i +
      "v" +
      +o +
      "h" +
      -i +
      "Z";
  },
  toString: function () {
    return this._;
  },
};
var es = Array.prototype.slice;
function eN(e) {
  return function () {
    return e;
  };
}
function eR(e) {
  return e[0];
}
function ex(e) {
  return e[1];
}
function ep(e) {
  return e.source;
}
function eg(e) {
  return e.target;
}
function eh(e, t, i, o, d) {
  (e.moveTo(t, i), e.bezierCurveTo((t = (t + o) / 2), i, t, d, o, d));
}
function ef(e) {
  return [e.source.x1, e.y0];
}
function ey(e) {
  return [e.target.x0, e.y1];
}
function ev(e, t, i, o, d) {
  (console.log("drawDonutChart (employee) called with:", {
    retribuzioneAnnuaNetta: e,
    inpsDipendente: t,
    totaleIrpef: i,
    ral: o,
    animation: d,
  }),
  "number" != typeof e ||
    "number" != typeof t ||
    "number" != typeof i ||
    "number" != typeof o)
    ? console.warn("Invalid parameters for donut chart:", {
        retribuzioneAnnuaNetta: e,
        inpsDipendente: t,
        totaleIrpef: i,
        ral: o,
      })
    : requestAnimationFrame(() => {
        let r = [
            { name: "Netto annuo", value: e, color: "#214CCD" },
            { name: "Contributi INPS", value: t, color: "#1BCAFF" },
            { name: "Ritenute IRPEF", value: i, color: "#16E3F0" },
          ],
          n = ["Netto annuo", "Contributi INPS", "Ritenute IRPEF"],
          a = window.innerWidth <= 768,
          u = a ? 340 : 380,
          l = Math.min(u, u) / 2 - 60,
          m = O.select("#donut-container");
        m.html("");
        let c = m
            .append("svg")
            .attr("width", u)
            .attr("height", u)
            .append("g")
            .attr("transform", `translate(${u / 2}, ${u / 2})`),
          b = O.pie()
            .sort((e, t) => n.indexOf(e.name) - n.indexOf(t.name))
            .value((e) => e.value),
          s = O.arc()
            .innerRadius(0.725 * l)
            .outerRadius(l)
            .cornerRadius(5),
          N = r.reduce((e, t) => e + t.value, 0),
          R = a ? 1.2 : 1.25;
        if (d) {
          (c
            .selectAll("path")
            .data(b(r))
            .enter()
            .append("path")
            .attr("fill", (e) => e.data.color)
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .each(function (e) {
              this._current = e;
            })
            .transition()
            .duration(800)
            .attrTween("d", function (e) {
              let t = O.interpolate({ startAngle: 0, endAngle: 0 }, e);
              return function (e) {
                return s(t(e));
              };
            }),
            c
              .selectAll("text")
              .data(b(r))
              .enter()
              .append("text")
              .style("text-anchor", "middle")
              .style("fill", "black")
              .style("font-size", "14px")
              .attr("opacity", 0)
              .transition()
              .duration(800)
              .attrTween("transform", function (e) {
                let t = O.interpolate({ startAngle: 0, endAngle: 0 }, e);
                return function (e) {
                  let i = t(e),
                    o = s.centroid(i);
                  return `translate(${1.5 * o[0]}, ${1.5 * o[1]})`;
                };
              })
              .attr("opacity", 1)
              .each(function (e) {
                if (0 !== e.data.value) {
                  let o = O.select(this),
                    d = e.data.value.toLocaleString("it-IT"),
                    r = ((e.data.value / N) * 100).toFixed(1),
                    n = 0;
                  ((e.data.value / N) * 100 < 5 &&
                  "Contributi INPS" === e.data.name &&
                  i > 0 &&
                  (i / N) * 100 < 5
                    ? (n = -10)
                    : (e.data.value / N) * 100 < 5 &&
                      "Ritenute IRPEF" === e.data.name &&
                      t > 0 &&
                      (t / N) * 100 < 5 &&
                      (n = 10),
                    o
                      .append("tspan")
                      .attr("x", 0 + n)
                      .attr("dy", "-0.2em")
                      .style("font-weight", "400")
                      .style("font-size", "13px")
                      .text(`${d}\u{20AC}`),
                    o
                      .append("tspan")
                      .attr("x", 0 + n)
                      .attr("dy", "1.2em")
                      .style("font-size", "13px")
                      .text(`(${r}%)`));
                }
              }),
            c
              .selectAll("polyline")
              .data(b(r).filter((e) => 0 !== e.data.value))
              .enter()
              .append("polyline")
              .style("fill", "none")
              .style("stroke", "black")
              .style("stroke-width", "1px")
              .attr("opacity", 0)
              .transition()
              .duration(800)
              .attrTween("points", function (e) {
                let t = O.interpolate({ startAngle: 0, endAngle: 0 }, e);
                return function (e) {
                  let i = t(e),
                    o = s.centroid(i),
                    d = [o[0] * R, o[1] * R];
                  return [o, d].join(" ");
                };
              })
              .attr("opacity", 1));
          let e = c
            .append("text")
            .attr("transform", "translate(0, 0)")
            .style("text-anchor", "middle")
            .style("font-size", "20px")
            .attr("opacity", 0);
          (e.append("tspan").attr("x", 0).attr("dy", "-0.6em").text("RAL"),
            e
              .append("tspan")
              .attr("x", 0)
              .attr("dy", "1.2em")
              .text(`${o.toLocaleString("it-IT")}\u{20AC}`),
            e.transition().duration(1e3).attr("opacity", 1));
          let d = O.select("#legend-container")
            .html("")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("width", "100%")
            .style("overflow", "auto");
          r.forEach((e) => {
            let t = d
              .append("div")
              .style("display", "inline-flex")
              .style("align-items", "center")
              .style("margin", "5px");
            (t
              .append("span")
              .style("display", "inline-block")
              .style("width", "14px")
              .style("height", "14px")
              .style("border-radius", "50%")
              .style("background-color", e.color)
              .style("margin-right", "5px"),
              t.append("span").text(e.name).style("font-size", "14px"));
          });
        } else {
          (c
            .selectAll("path")
            .data(b(r))
            .enter()
            .append("path")
            .attr("fill", (e) => e.data.color)
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .attr("d", s),
            c
              .selectAll("text.label")
              .data(b(r))
              .enter()
              .append("text")
              .attr("class", "label")
              .attr("transform", function (e) {
                let t = s.centroid(e),
                  i = 1.5 * t[0],
                  o = 1.5 * t[1];
                return `translate(${i}, ${o})`;
              })
              .style("text-anchor", "middle")
              .style("fill", "black")
              .style("font-size", "14px")
              .each(function (e) {
                if (0 !== e.data.value) {
                  let o = O.select(this),
                    d = e.data.value.toLocaleString("it-IT"),
                    r = ((e.data.value / N) * 100).toFixed(1),
                    n = 0;
                  ((e.data.value / N) * 100 < 5 &&
                  "Contributi INPS" === e.data.name &&
                  i > 0 &&
                  (i / N) * 100 < 5
                    ? (n = -10)
                    : (e.data.value / N) * 100 < 5 &&
                      "Ritenute IRPEF" === e.data.name &&
                      t > 0 &&
                      (t / N) * 100 < 5 &&
                      (n = 10),
                    o
                      .append("tspan")
                      .attr("x", 0 + n)
                      .attr("dy", "-0.2em")
                      .style("font-weight", "400")
                      .style("font-size", "13px")
                      .text(`${d}\u{20AC}`),
                    o
                      .append("tspan")
                      .attr("x", 0 + n)
                      .attr("dy", "1.2em")
                      .style("font-size", "13px")
                      .text(`(${r}%)`));
                }
              }),
            c
              .selectAll("polyline")
              .data(b(r).filter((e) => 0 !== e.data.value))
              .enter()
              .append("polyline")
              .attr("points", function (e) {
                let t = s.centroid(e);
                return [t[0], t[1], t[0] * R, t[1] * R].join(",");
              })
              .style("fill", "none")
              .style("stroke", "black")
              .style("stroke-width", "1px"));
          let e = c
            .append("text")
            .attr("transform", "translate(0, 0)")
            .style("text-anchor", "middle")
            .style("font-size", "20px");
          (e.append("tspan").attr("x", 0).attr("dy", "-0.6em").text("RAL"),
            e
              .append("tspan")
              .attr("x", 0)
              .attr("dy", "1.2em")
              .text(`${o.toLocaleString("it-IT")}\u{20AC}`));
          let d = O.select("#legend-container")
            .html("")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("width", "100%")
            .style("overflow", "auto");
          r.forEach((e) => {
            let t = d
              .append("div")
              .style("display", "inline-flex")
              .style("align-items", "center")
              .style("margin", "5px");
            (t
              .append("span")
              .style("display", "inline-block")
              .style("width", "14px")
              .style("height", "14px")
              .style("border-radius", "50%")
              .style("background-color", e.color)
              .style("margin-right", "5px"),
              t.append("span").text(e.name).style("font-size", "14px"));
          });
        }
      });
}
function ek(e, t, i, o, d, r, n, a, u) {
  let l = [
    { id: "Costo azienda" },
    { id: "RAL dipendente" },
    { id: "INPS azienda" },
    { id: "TFR" },
    { id: "Oneri assicurativi" },
    { id: "Retribuzione netta" },
    { id: "INPS dipendente" },
    { id: "Ritenute IRPEF" },
  ];
  (u > 0 && l.push({ id: "Trattamento integrativo" }),
    a > 0 && l.push({ id: "Somma integrativa" }));
  let m = [
    { source: "Costo azienda", target: "RAL dipendente", value: e },
    { source: "Costo azienda", target: "INPS azienda", value: t },
    { source: "Costo azienda", target: "TFR", value: i },
    { source: "Costo azienda", target: "Oneri assicurativi", value: o },
    {
      source: "RAL dipendente",
      target: "Retribuzione netta",
      value: d - a - u,
    },
    { source: "RAL dipendente", target: "INPS dipendente", value: r },
    { source: "RAL dipendente", target: "Ritenute IRPEF", value: n },
  ];
  (u > 0 &&
    m.push({
      source: "Trattamento integrativo",
      target: "Retribuzione netta",
      value: u,
    }),
    a > 0 &&
      m.push({
        source: "Somma integrativa",
        target: "Retribuzione netta",
        value: a,
      }));
  let c = (function (
      { nodes: e, links: t, sommaIntegrativa: i, bonus100: o },
      {
        format: d = ",",
        align: r = "justify",
        nodeId: n = (e) => e.id,
        nodeGroup: a,
        nodeGroups: u,
        nodeLabel: l = (e) => {
          if (window.innerWidth <= 768) {
            if ("RAL dipendente" === e.id)
              return "RAL: " + e.value.toLocaleString("it-IT") + "€";
            if ("Retribuzione netta" === e.id)
              return "Netto: " + e.value.toLocaleString("it-IT") + "€";
            if ("INPS dipendente" === e.id)
              return "INPS: " + e.value.toLocaleString("it-IT") + "€";
            if ("Ritenute IRPEF" === e.id)
              return "IRPEF: " + e.value.toLocaleString("it-IT") + "€";
          }
          return `${e.id}: ${e.value.toLocaleString("it-IT")}\u{20AC}`;
        },
        nodeTitle: m = (e) => `${e.id}
${d(e.value)}`,
        nodeAlign: c = r,
        nodeSort: b,
        nodeWidth: s = 15,
        nodePadding: N = 15,
        nodeLabelPadding: R = 6,
        nodeStroke: x = "currentColor",
        nodeStrokeWidth: p,
        nodeStrokeOpacity: g,
        nodeStrokeLinejoin: h,
        linkSource: f = ({ source: e }) => e,
        linkTarget: y = ({ target: e }) => e,
        linkValue: v = ({ value: e }) => e,
        linkPath: k = (function (e) {
          var t = ep,
            i = eg,
            o = eR,
            d = ex,
            r = null;
          function n() {
            var n,
              a = es.call(arguments),
              u = t.apply(this, a),
              l = i.apply(this, a);
            if (
              (r || (r = n = eb()),
              e(
                r,
                +o.apply(this, ((a[0] = u), a)),
                +d.apply(this, a),
                +o.apply(this, ((a[0] = l), a)),
                +d.apply(this, a),
              ),
              n)
            )
              return ((r = null), n + "" || null);
          }
          return (
            (n.source = function (e) {
              return arguments.length ? ((t = e), n) : t;
            }),
            (n.target = function (e) {
              return arguments.length ? ((i = e), n) : i;
            }),
            (n.x = function (e) {
              return arguments.length
                ? ((o = "function" == typeof e ? e : eN(+e)), n)
                : o;
            }),
            (n.y = function (e) {
              return arguments.length
                ? ((d = "function" == typeof e ? e : eN(+e)), n)
                : d;
            }),
            (n.context = function (e) {
              return arguments.length ? ((r = null == e ? null : e), n) : r;
            }),
            n
          );
        })(eh)
          .source(ef)
          .target(ey),
        linkTitle: E = (e) => `${e.source.id} \u{2192} ${e.target.id}
${e.value.toLocaleString("it-IT")}\u{20AC}`,
        linkColor: I = "source-target",
        linkStrokeOpacity: S = 0.5,
        linkMixBlendMode: L = "multiply",
        colors: w = O.schemeTableau10,
        width: C,
        height: z,
        marginTop: q = 5,
        marginRight: B = 1,
        marginBottom: F = 5,
        marginLeft: _ = 1,
      } = {},
    ) {
      "function" != typeof c &&
        (c = { left: G, right: J, center: Q, justify: Y }[c] ?? Y);
      let A = O.map(t, f).map(eI),
        M = O.map(t, y).map(eI),
        T = O.map(t, v);
      void 0 === e && (e = Array.from(O.union(A, M), (e) => ({ id: e })));
      let D = O.map(e, n).map(eI),
        P = null == a ? null : O.map(e, a).map(eI);
      ((e = O.map(e, (e, t) => ({ id: D[t] }))),
        (t = O.map(t, (e, t) => ({ source: A[t], target: M[t], value: T[t] }))),
        !P &&
          ["source", "target", "source-target"].includes(I) &&
          (I = "currentColor"),
        P && void 0 === u && (u = P));
      let $ = null == a ? null : O.scaleOrdinal(u, w);
      (function () {
        let e,
          t,
          i = 0,
          o = 0,
          d = 1,
          r = 1,
          n = 24,
          a = 8,
          u,
          l = eo,
          m = Y,
          c = ed,
          b = er,
          s = 6;
        function N() {
          let N = {
            nodes: c.apply(null, arguments),
            links: b.apply(null, arguments),
          };
          return (
            (function ({ nodes: e, links: i }) {
              for (let [t, i] of e.entries())
                ((i.index = t), (i.sourceLinks = []), (i.targetLinks = []));
              let o = new Map(e.map((t, i) => [l(t, i, e), t]));
              for (let [e, t] of i.entries()) {
                t.index = e;
                let { source: i, target: d } = t;
                ("object" != typeof i && (i = t.source = en(o, i)),
                  "object" != typeof d && (d = t.target = en(o, d)),
                  i.sourceLinks.push(t),
                  d.targetLinks.push(t));
              }
              if (null != t)
                for (let { sourceLinks: i, targetLinks: o } of e)
                  (i.sort(t), o.sort(t));
            })(N),
            (function ({ nodes: e }) {
              for (let t of e)
                t.value =
                  void 0 === t.fixedValue
                    ? Math.max(K(t.sourceLinks, ei), K(t.targetLinks, ei))
                    : t.fixedValue;
            })(N),
            (function ({ nodes: e }) {
              let t = e.length,
                i = new Set(e),
                o = new Set(),
                d = 0;
              for (; i.size; ) {
                for (let e of i)
                  for (let { target: t } of ((e.depth = d), e.sourceLinks))
                    o.add(t);
                if (++d > t) throw Error("circular link");
                ((i = o), (o = new Set()));
              }
            })(N),
            (function ({ nodes: e }) {
              let t = e.length,
                i = new Set(e),
                o = new Set(),
                d = 0;
              for (; i.size; ) {
                for (let e of i)
                  for (let { source: t } of ((e.height = d), e.targetLinks))
                    o.add(t);
                if (++d > t) throw Error("circular link");
                ((i = o), (o = new Set()));
              }
            })(N),
            (function (l) {
              let c = (function ({ nodes: t }) {
                let o = V(t, (e) => e.depth) + 1,
                  r = (d - i - n) / (o - 1),
                  a = Array(o);
                for (let e of t) {
                  let t = Math.max(
                    0,
                    Math.min(o - 1, Math.floor(m.call(null, e, o))),
                  );
                  ((e.layer = t),
                    (e.x0 = i + t * r),
                    (e.x1 = e.x0 + n),
                    a[t] ? a[t].push(e) : (a[t] = [e]));
                }
                if (e) for (let t of a) t.sort(e);
                return a;
              })(l);
              u = Math.min(a, (r - o) / (V(c, (e) => e.length) - 1));
              let b = H(c, (e) => (r - o - (e.length - 1) * u) / K(e, ei));
              for (let e of c) {
                let i = o;
                for (let t of e)
                  for (let e of ((t.y0 = i),
                  (t.y1 = i + t.value * b),
                  (i = t.y1 + u),
                  t.sourceLinks))
                    e.width = e.value * b;
                i = (r - i + u) / (e.length + 1);
                for (let t = 0; t < e.length; ++t) {
                  let o = e[t];
                  ((o.y0 += i * (t + 1)), (o.y1 += i * (t + 1)));
                }
                var N = e;
                if (void 0 === t)
                  for (let { sourceLinks: e, targetLinks: t } of N)
                    (e.sort(ee), t.sort(X));
              }
              for (let t = 0; t < s; ++t) {
                let i = Math.pow(0.99, t),
                  o = Math.max(1 - i, (t + 1) / s);
                ((function (t, i, o) {
                  for (let d = t.length, r = d - 2; r >= 0; --r) {
                    let d = t[r];
                    for (let e of d) {
                      let t = 0,
                        o = 0;
                      for (let { target: i, value: d } of e.sourceLinks) {
                        let r = d * (i.layer - e.layer);
                        ((t +=
                          (function (e, t) {
                            let i = t.y0 - ((t.targetLinks.length - 1) * u) / 2;
                            for (let { source: o, width: d } of t.targetLinks) {
                              if (o === e) break;
                              i += d + u;
                            }
                            for (let { target: o, width: d } of e.sourceLinks) {
                              if (o === t) break;
                              i -= d;
                            }
                            return i;
                          })(e, i) * r),
                          (o += r));
                      }
                      if (!(o > 0)) continue;
                      let d = (t / o - e.y0) * i;
                      ((e.y0 += d), (e.y1 += d), g(e));
                    }
                    (void 0 === e && d.sort(et), R(d, o));
                  }
                })(c, i, o),
                  (function (t, i, o) {
                    for (let d = 1, r = t.length; d < r; ++d) {
                      let r = t[d];
                      for (let e of r) {
                        let t = 0,
                          o = 0;
                        for (let { source: i, value: d } of e.targetLinks) {
                          let r = d * (e.layer - i.layer);
                          ((t +=
                            (function (e, t) {
                              let i =
                                e.y0 - ((e.sourceLinks.length - 1) * u) / 2;
                              for (let {
                                target: o,
                                width: d,
                              } of e.sourceLinks) {
                                if (o === t) break;
                                i += d + u;
                              }
                              for (let {
                                source: o,
                                width: d,
                              } of t.targetLinks) {
                                if (o === e) break;
                                i -= d;
                              }
                              return i;
                            })(i, e) * r),
                            (o += r));
                        }
                        if (!(o > 0)) continue;
                        let d = (t / o - e.y0) * i;
                        ((e.y0 += d), (e.y1 += d), g(e));
                      }
                      (void 0 === e && r.sort(et), R(r, o));
                    }
                  })(c, i, o));
              }
            })(N),
            ea(N),
            N
          );
        }
        function R(e, t) {
          let i = e.length >> 1,
            d = e[i];
          (p(e, d.y0 - u, i - 1, t),
            x(e, d.y1 + u, i + 1, t),
            p(e, r, e.length - 1, t),
            x(e, o, 0, t));
        }
        function x(e, t, i, o) {
          for (; i < e.length; ++i) {
            let d = e[i],
              r = (t - d.y0) * o;
            (r > 1e-6 && ((d.y0 += r), (d.y1 += r)), (t = d.y1 + u));
          }
        }
        function p(e, t, i, o) {
          for (; i >= 0; --i) {
            let d = e[i],
              r = (d.y1 - t) * o;
            (r > 1e-6 && ((d.y0 -= r), (d.y1 -= r)), (t = d.y0 - u));
          }
        }
        function g({ sourceLinks: e, targetLinks: i }) {
          if (void 0 === t) {
            for (let {
              source: { sourceLinks: e },
            } of i)
              e.sort(ee);
            for (let {
              target: { targetLinks: t },
            } of e)
              t.sort(X);
          }
        }
        return (
          (N.update = function (e) {
            return (ea(e), e);
          }),
          (N.nodeId = function (e) {
            return arguments.length
              ? ((l = "function" == typeof e ? e : Z(e)), N)
              : l;
          }),
          (N.nodeAlign = function (e) {
            return arguments.length
              ? ((m = "function" == typeof e ? e : Z(e)), N)
              : m;
          }),
          (N.nodeSort = function (t) {
            return arguments.length ? ((e = t), N) : e;
          }),
          (N.nodeWidth = function (e) {
            return arguments.length ? ((n = +e), N) : n;
          }),
          (N.nodePadding = function (e) {
            return arguments.length ? ((a = u = +e), N) : a;
          }),
          (N.nodes = function (e) {
            return arguments.length
              ? ((c = "function" == typeof e ? e : Z(e)), N)
              : c;
          }),
          (N.links = function (e) {
            return arguments.length
              ? ((b = "function" == typeof e ? e : Z(e)), N)
              : b;
          }),
          (N.linkSort = function (e) {
            return arguments.length ? ((t = e), N) : t;
          }),
          (N.size = function (e) {
            return arguments.length
              ? ((i = o = 0), (d = +e[0]), (r = +e[1]), N)
              : [d - i, r - o];
          }),
          (N.extent = function (e) {
            return arguments.length
              ? ((i = +e[0][0]),
                (d = +e[1][0]),
                (o = +e[0][1]),
                (r = +e[1][1]),
                N)
              : [
                  [i, o],
                  [d, r],
                ];
          }),
          (N.iterations = function (e) {
            return arguments.length ? ((s = +e), N) : s;
          }),
          N
        );
      })()
        .nodeId(({ index: e }) => D[e])
        .nodeAlign(c)
        .nodeWidth(s)
        .nodePadding(N)
        .nodeSort(b)
        .extent([
          [_, q],
          [C - B, z - F],
        ])({ nodes: e, links: t });
      let j = e.find((e) => "RAL dipendente" === e.id),
        U = e.find((e) => "Somma integrativa" === e.id),
        W = e.find((e) => "Trattamento integrativo" === e.id);
      if (j && U && i > 0) {
        ((U.x0 = j.x0), (U.x1 = j.x1), (U.y0 += 20), (U.y1 += 20));
        let e = t.find(
          (e) =>
            "Somma integrativa" === e.source.id &&
            "Retribuzione netta" === e.target.id,
        );
        e && (e.y0 += 20);
      }
      if (j && W && o > 0) {
        ((W.x0 = j.x0), (W.x1 = j.x1), (W.y0 += 20), (W.y1 += 20));
        let e = t.find(
          (e) =>
            "Trattamento integrativo" === e.source.id &&
            "Retribuzione netta" === e.target.id,
        );
        e && (e.y0 += 20);
      }
      "function" != typeof d && (d = O.format(d));
      let eu = void 0 === l ? D : null == l ? null : O.map(e, l),
        el = null == m ? null : O.map(e, m),
        em = null == E ? null : O.map(t, E),
        ec = `O-${Math.random().toString(16).slice(2)}`,
        ev = O.create("svg")
          .attr("width", C)
          .attr("height", z)
          .attr("viewBox", [0, 0, C, z])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;"),
        ek = ev
          .append("g")
          .attr("stroke", x)
          .attr("stroke-width", p)
          .attr("stroke-opacity", g)
          .attr("stroke-linejoin", h)
          .selectAll("rect")
          .data(e)
          .join("rect")
          .attr("x", (e) => e.x0)
          .attr("y", (e) => e.y0)
          .attr("height", (e) => e.y1 - e.y0)
          .attr("width", (e) => e.x1 - e.x0)
          .attr("fill", (e) => $(e.id))
          .attr("rx", 2.5)
          .attr("ry", 2.5);
      el && ek.append("title").text(({ index: e }) => el[e]);
      let eE = ev
        .append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", S)
        .selectAll("g")
        .data(t)
        .join("g")
        .style("mix-blend-mode", L);
      function eI(e) {
        return null !== e && "object" == typeof e ? e.valueOf() : e;
      }
      return (
        "source-target" === I &&
          eE
            .append("linearGradient")
            .attr("id", (e) => `${ec}-link-${e.index}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", (e) => e.source.x1)
            .attr("x2", (e) => e.target.x0)
            .call((e) =>
              e
                .append("stop")
                .attr("offset", "0%")
                .attr("stop-color", ({ source: { index: e } }) => $(P[e])),
            )
            .call((e) =>
              e
                .append("stop")
                .attr("offset", "100%")
                .attr("stop-color", ({ target: { index: e } }) => $(P[e])),
            ),
        eE
          .append("path")
          .attr("d", k)
          .attr(
            "stroke",
            "source-target" === I
              ? ({ index: e }) => `url(#${ec}-link-${e})`
              : "source" === I
                ? ({ source: { index: e } }) => $(P[e])
                : "target" === I
                  ? ({ target: { index: e } }) => $(P[e])
                  : I,
          )
          .attr("stroke-width", ({ width: e }) => Math.max(1, e))
          .call(
            em
              ? (e) => e.append("title").text(({ index: e }) => em[e])
              : () => {},
          ),
        eu &&
          ev
            .append("g")
            .attr("font-family", "Inter")
            .attr("font-size", 14)
            .selectAll("text")
            .data(e)
            .join("text")
            .attr("x", (e) =>
              "Trattamento integrativo" === e.id || "Somma integrativa" === e.id
                ? e.x0 - R
                : e.x0 < C / 2
                  ? e.x1 + R
                  : e.x0 - R,
            )
            .attr("y", (e) => (e.y1 + e.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", (e) =>
              "Trattamento integrativo" === e.id || "Somma integrativa" === e.id
                ? "end"
                : e.x0 < C / 2
                  ? "start"
                  : "end",
            )
            .text(({ index: e }) => eu[e]),
        Object.assign(ev.node(), { scales: { color: $ } })
      );
    })(
      { nodes: l, links: m, sommaIntegrativa: a, bonus100: u },
      {
        nodeGroup: (e) => e.id.split(/\W/)[0],
        width: Math.min(960, window.innerWidth),
        height: 430,
        nodeWidth: 15,
        nodePadding: 10,
        colors: [
          "#3D92D4",
          "#6AE7FF",
          "#1BCAFF",
          "#16E3F0",
          "#4AA8E0",
          "#55BCEB",
          "#63D1F7",
          "#214CCD",
        ],
        linkColor: "source-target",
        nodeAlign: "justify",
      },
    ),
    b = document.getElementById("sankey-container");
  ((b.innerHTML = ""), b.appendChild(c));
}
function eE(e, t, i, o) {
  let d;
  if (
    (console.log("drawLineChart called with:", {
      data: e?.length,
      redditoComplessivo: t,
      regione: i,
      target: o,
    }),
    !e || !Array.isArray(e) || 0 === e.length)
  )
    return void console.warn("Invalid data for line chart:", e);
  if (!o || !document.getElementById(o))
    return void console.warn("Target container not found:", o);
  let r = [{ "Reddito Number": 0, "Numero contribuenti": 0 }, ...e],
    n = Math.min(960, window.innerWidth) - 40 - 80,
    a = 190,
    u = O.select("#" + o)
      .html("")
      .append("svg")
      .attr("width", n + 40 + 80)
      .attr("height", a + 130 + 40)
      .append("g")
      .attr("transform", "translate(40,130)"),
    l = O.sum(r, (e) => e["Numero contribuenti"]),
    m = O.scalePow()
      .exponent(0.4)
      .domain([
        O.min(r, (e) => e["Reddito Number"]),
        O.max(r, (e) => e["Reddito Number"]),
      ])
      .range([0, n])
      .nice(),
    c = r.reduce(
      (e, i) => (i["Reddito Number"] < t ? e + i["Numero contribuenti"] : e),
      0,
    ),
    b = O.max(r, (e) => (e["Numero contribuenti"] / l) * 100),
    s = O.scalePow().exponent(0.75).domain([0, b]).range([a, 0]),
    N = O.line()
      .x((e) => m(e["Reddito Number"]))
      .y((e) => s((e["Numero contribuenti"] / l) * 100))
      .curve(O.curveCatmullRom),
    R = O.area()
      .x((e) => m(e["Reddito Number"]))
      .y0(a)
      .y1((e) => s((e["Numero contribuenti"] / l) * 100))
      .curve(O.curveCatmullRom),
    x = u
      .append("g")
      .attr("transform", `translate(0,${a})`)
      .call(
        O.axisBottom(m)
          .tickValues(
            window.innerWidth < 480
              ? [500, 2e3, 5e3, 1e4, 2e4, 35e3, 5e4, 75e3, 11e4, 15e4, 2e5, 3e5]
              : [
                  50, 500, 2e3, 5e3, 1e4, 2e4, 3e4, 45e3, 6e4, 8e4, 11e4, 15e4,
                  2e5, 25e4, 3e5,
                ],
          )
          .tickFormat(O.format("~s")),
      )
      .selectAll("text")
      .style("fill", "#333");
  (x.select(".domain").attr("stroke-dasharray", null).attr("stroke", "#333"),
    x.selectAll("line").attr("stroke-dasharray", null).attr("stroke", "#333"),
    u
      .append("g")
      .call(
        O.axisLeft(s)
          .ticks(11)
          .tickFormat((e) => e + "%"),
      )
      .selectAll("text")
      .style("fill", "#333"));
  let p = s.ticks(6);
  p.pop();
  let g = u
    .append("g")
    .attr("class", "grid")
    .call(O.axisLeft(s).tickValues(p).tickSize(-n).tickFormat(""));
  (g
    .selectAll("line")
    .attr("stroke", "#dfe4ea")
    .attr("stroke-dasharray", "2,2"),
    g
      .selectAll("line")
      .filter((e) => e === O.max(p))
      .remove(),
    g.select(".domain").remove(),
    u.append("path").datum(r).attr("fill", "rgba(33,76,205,0.1)").attr("d", R));
  let h = u
    .append("path")
    .datum(r)
    .attr("fill", "none")
    .attr("stroke", "#214ccd")
    .attr("stroke-width", 3.5)
    .attr("d", N);
  u.append("line")
    .attr("x1", m(t))
    .attr("x2", m(t))
    .attr("y1", 0)
    .attr("y2", a)
    .attr("stroke", "#e74c3c")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,4");
  let f = `Il tuo reddito: ${t.toLocaleString("it-IT")}\u{20AC}`,
    y = u
      .append("g")
      .attr(
        "transform",
        `translate(${Math.min(Math.max(m(t) - 40, 0), n - 180)}, ${-38})`,
      ),
    v = y
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "#e8f0ff")
      .attr("stroke", "#214ccd")
      .attr("stroke-width", 1),
    k = y
      .append("text")
      .attr("x", 8)
      .attr("y", 18)
      .style("font-size", "13px")
      .style("fill", "#214ccd")
      .text(f),
    E = k.node().getBBox().width + 16,
    I = k.node().getBBox().height + 12;
  v.attr("width", E).attr("height", I);
  let S = -110;
  u.append("text")
    .attr("x", 0)
    .attr("y", S)
    .attr("text-anchor", "start")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Trento" == i || "Bolzano" == i ? "A " + i : "In " + i);
  let L = "Il tuo reddito complessivo è maggiore di quello del ",
    w = ((c / l) * 100).toFixed(1) + "% dei lavoratori dipendenti",
    C =
      "Reddito complessivo usato nel confronto: " +
      t.toLocaleString("it-IT") +
      "€";
  window.innerWidth < 600
    ? (u
        .append("text")
        .attr("x", 0)
        .attr("y", S + 26)
        .attr("text-anchor", "start")
        .style("font-size", "16px")
        .text(L),
      u
        .append("text")
        .attr("x", 0)
        .attr("y", S + 52)
        .attr("text-anchor", "start")
        .style("font-size", "16px")
        .text(w),
      u
        .append("text")
        .attr("x", 0)
        .attr("y", S + 78)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .attr("class", "hide-mobile-keep-space")
        .text(C))
    : (u
        .append("text")
        .attr("x", 0)
        .attr("y", S + 24)
        .attr("text-anchor", "start")
        .style("font-size", "16px")
        .text(L + w),
      u
        .append("text")
        .attr("x", 0)
        .attr("y", S + 52)
        .attr("text-anchor", "start")
        .style("font-size", "14px")
        .attr("class", "hide-mobile-keep-space")
        .text(C));
  let z = `${o}-tooltip`,
    q = document.getElementById(z);
  q ||
    (((q = document.createElement("div")).id = z),
    (q.style.position = "absolute"),
    (q.style.pointerEvents = "none"),
    (q.style.padding = "8px 10px"),
    (q.style.background = "#fff"),
    (q.style.border = "1px solid #dcdcdc"),
    (q.style.borderRadius = "6px"),
    (q.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)"),
    (q.style.fontSize = "13px"),
    (q.style.color = "#333"),
    (q.style.display = "none"),
    (document.querySelector(`#${o}`).style.position = "relative"),
    document.querySelector(`#${o}`).appendChild(q));
  let B = (e, t) => {
      ((q.innerHTML = `<b>${t["Reddito Number"].toLocaleString("it-IT")}\u{20AC}</b><br>${((t["Numero contribuenti"] / l) * 100).toFixed(2)}% dei lavoratori`),
        (q.style.display = "block"),
        (q.style.left = `${e.offsetX + 12}px`),
        (q.style.top = `${e.offsetY - 10}px`));
    },
    F = () => {
      q.style.display = "none";
    };
  u.selectAll(".point")
    .data(r)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", (e) => m(e["Reddito Number"]))
    .attr("cy", (e) => s((e["Numero contribuenti"] / l) * 100))
    .attr("r", 2.8)
    .attr("fill", "#214ccd")
    .attr("opacity", 0.85)
    .on("mouseover", function (e, t) {
      B(e, t);
    })
    .on("mousemove", function (e, t) {
      B(e, t);
    })
    .on("mouseout", F)
    .on("touchstart", function (e, t) {
      B(e, t);
    })
    .on("touchend", F);
  let _ = h.node(),
    A = m(t),
    M = _.getTotalLength(),
    T = 0,
    D = M;
  for (; T <= D; ) {
    let e = (T + D) / 2,
      t = _.getPointAtLength(e);
    if (0.5 > Math.abs(t.x - A)) {
      d = t;
      break;
    }
    (t.x < A ? (T = e + 0.1) : (D = e - 0.1), (d = t));
  }
  d &&
    u
      .append("circle")
      .attr("cx", d.x)
      .attr("cy", d.y)
      .attr("r", 5)
      .attr("fill", "#e74c3c")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 1);
}
let eI = window.location.pathname.replace(/\/+$/, ""),
  eS =
    "/calcolo-stipendio-netto" === eI ||
    "/calcolo-stipendio-netto/index.html" === eI,
  eL = {
    Lombardia: 33635,
    "Trentino-Alto Adige": 33532,
    Lazio: 33242,
    Liguria: 33195,
    Piemonte: 32361,
    "Emilia-Romagna": 32268,
    "Valle d'Aosta": 32111,
    Veneto: 31757,
    "Friuli Venezia Giulia": 31649,
    Toscana: 31016,
    Marche: 30337,
    Abruzzo: 29486,
    Umbria: 29471,
    Campania: 29296,
    Sardegna: 28947,
    Puglia: 28776,
    Sicilia: 28727,
    Molise: 28468,
    Calabria: 28010,
    Basilicata: 27232,
  };
function ew(e) {
  return e.toLocaleString("it-IT", { maximumFractionDigits: 0 });
}
let eC = "stipendee_offerwall_seen_v1",
  ez = "stipendee_offerwall_mute_until_v1",
  eq = (e) => "1" === e || 1 === e || "true" === e || !0 === e,
  eB = !1,
  eF = !1,
  e_ = (e) =>
    `${new Intl.NumberFormat("it-IT", { useGrouping: "always", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(e)} \u{20AC}`,
  eA = (e) => {
    try {
      return btoa(encodeURIComponent(JSON.stringify(e)));
    } catch (e) {
      return (console.error("encodeParams failed", e), null);
    }
  },
  eM = (e) => {
    try {
      return JSON.parse(decodeURIComponent(atob(e)));
    } catch (e) {
      return (console.error("decodeParams failed", e), null);
    }
  };
function eT(e, t) {
  let i;
  return function () {
    let o = arguments;
    i || (e.apply(this, o), (i = !0), setTimeout(() => (i = !1), t));
  };
}
let eD = (e) => (0, S.handleShareClick)(e, { campaign: "sharing_link" });
(document.addEventListener("DOMContentLoaded", async () => {
  let h;
  if (eS) {
    let h = document.querySelector(".result-section"),
      y = new URLSearchParams(window.location.search),
      v = document.getElementById("quickEditModal"),
      k = document.getElementById("quickEditForm"),
      E = document.getElementById("quickEditClose"),
      I = document.getElementById("quick-edit-active-flags"),
      S = document.getElementById("quick-edit-no-flags"),
      O = document.getElementById("quick-edit-aux-fields"),
      V = document.getElementById("quick-edit-ral"),
      H = document.getElementById("quick-edit-ral-formatted"),
      K = document.getElementById("quickEditToConfigurator"),
      W = document.querySelectorAll('input[name="quick-edit-mensilita"]'),
      G = "qeFlags",
      J = [
        {
          paramName: "cuneoFiscale",
          stateKey: "cuneoFiscale",
          label: "Taglio cuneo fiscale 2025",
        },
        {
          paramName: "esoneroContributivo",
          stateKey: "esoneroContributivo",
          label: "Esonero contributivo 2024",
        },
        {
          paramName: "madreLavoratrice",
          stateKey: "madreLavoratrice",
          label: "Madre lavoratrice",
        },
        {
          paramName: "bonus100",
          stateKey: "bonus100Flag",
          label: "Bonus IRPEF 100€",
        },
        {
          paramName: "apprendistato",
          stateKey: "apprendistato",
          label: "Contratto di apprendistato",
        },
        {
          paramName: "dipendentePubblico",
          stateKey: "dipendentePubblico",
          label: "Dipendente pubblico",
        },
        {
          paramName: "maggiore15",
          stateKey: "maggiore15",
          label: "Azienda con più di 15 dipendenti",
        },
        {
          paramName: "modificaInps",
          stateKey: "modificaInps",
          label: "Modifica aliquote INPS",
        },
        {
          paramName: "coniugeCarico",
          stateKey: "coniugeCarico",
          label: "Coniuge a carico",
        },
        {
          paramName: "rientroCervelli",
          stateKey: "rientroCervelli",
          label: "Rientro dei cervelli",
        },
      ],
      Y = ["12", "13", "14", "15", "16"],
      Q = [
        { value: "0.5", label: "50% (regime 2024)" },
        { value: "0.4", label: "40% (regime 2024 con figlio minore)" },
        { value: "0.3", label: "30% (regime precedente)" },
        {
          value: "0.1",
          label: "10% (regime precedente, trasferimento al sud)",
        },
        { value: "0.5", label: "50% (regime precedente, sportivi)" },
      ],
      Z = [],
      X = null,
      ee = !1,
      et = () => {
        if (y.has("d")) {
          let e = eM(y.get("d"));
          if (e && "object" == typeof e) return { ...e };
        }
        let e = {};
        return (
          y.forEach((t, i) => {
            e[i] = t;
          }),
          e
        );
      },
      ei = (e, t, i) => {
        null == i || "" === i ? delete e[t] : (e[t] = String(i));
      },
      eo = () => {
        if (!V || !H) return;
        let e = parseFloat(V.value) || 0;
        (e < 0 && (e = 0),
          e > 1e6 && (e = 1e6),
          (V.value = Math.round(e)),
          e > 0
            ? ((H.value = `${Math.round(e).toLocaleString("it-IT")}\u{20AC}`),
              (V.style.display = "none"),
              (H.style.display = "block"))
            : ((H.value = ""),
              (V.style.display = "block"),
              (H.style.display = "none")));
      },
      ed = () => {
        V &&
          H &&
          ((H.style.display = "none"), (V.style.display = "block"), V.focus());
      },
      er = (e, t = !1) =>
        t
          ? 100 * f(L).aliquote_inps.lavoratore.regolare
          : eq(e.apprendistato)
            ? 100 * f(L).aliquote_inps.lavoratore.apprendistato
            : eq(e.dipendentePubblico)
              ? 100 * f(L).aliquote_inps.lavoratore.pubblico
              : eq(e.maggiore15)
                ? 100 * f(L).aliquote_inps.lavoratore.quindici_dipendenti
                : 100 * f(L).aliquote_inps.lavoratore.regolare,
      en = (e, t) => {
        let i = e - (t / 100) * e;
        return i > 15e3 && i <= 28e3;
      },
      ea = () => {
        let e = et(),
          t = {};
        return (
          Z.forEach((e) => {
            let i = I?.querySelector(`input[data-quick-flag="${e}"]`);
            t[e] = !!i?.checked;
          }),
          { raw: e, activeFlagState: t }
        );
      },
      eu = () => {
        if (!O || !V) return;
        let { raw: e, activeFlagState: t } = ea(),
          i = Math.max(0, parseFloat(V.value) || 0),
          o = t.modificaInps,
          d = document.getElementById("quick-edit-alinps-dip"),
          r = o
            ? parseFloat(d?.value) || er(e)
            : er({
                ...e,
                apprendistato: t.apprendistato ? "1" : "0",
                dipendentePubblico: t.dipendentePubblico ? "1" : "0",
                maggiore15: t.maggiore15 ? "1" : "0",
              }),
          n = t.bonus100 && en(i, r),
          a = t.rientroCervelli,
          u = parseFloat(e.alinpsDip),
          l = parseFloat(e.alinpsDat),
          m = Number.isFinite(u) ? u.toFixed(2) : er(e, !0).toFixed(2),
          c = Number.isFinite(l)
            ? l.toFixed(2)
            : (100 * f(L).aliquote_inps.azienda.regolare).toFixed(2),
          b = String(e.imponibileCervelli || "0.5"),
          s = [];
        if (
          (t.modificaInps &&
            s.push(`
          <div class="quick-edit-grid">
            <div class="input-group quick-edit-input-group">
              <label for="quick-edit-alinps-dip">Aliquota INPS dipendente</label>
              <input type="number" id="quick-edit-alinps-dip" min="0" max="40" step="0.01" value="${m}">
            </div>
            <div class="input-group quick-edit-input-group">
              <label for="quick-edit-alinps-dat">Aliquota INPS datore di lavoro</label>
              <input type="number" id="quick-edit-alinps-dat" min="0" max="40" step="0.01" value="${c}">
            </div>
          </div>
        `),
          n)
        ) {
          let t = Number.isFinite(parseFloat(e.altreDetrazioni))
            ? parseFloat(e.altreDetrazioni)
            : 0;
          s.push(`
          <div class="input-group quick-edit-input-group">
            <label for="quick-edit-altre-detrazioni">Detrazioni per oneri</label>
            <input type="number" id="quick-edit-altre-detrazioni" min="0" step="100" value="${t}">
          </div>
        `);
        }
        if (a) {
          let e = !1,
            t = Q.map((t) => {
              let i = !e && t.value === b;
              return (
                i && (e = !0),
                `<option value="${t.value}" ${i ? "selected" : ""}>${t.label}</option>`
              );
            }).join("");
          s.push(`
          <div class="input-group quick-edit-input-group">
            <label for="quick-edit-imponibile-cervelli">Percentuale reddito imponibile</label>
            <select id="quick-edit-imponibile-cervelli">${t}</select>
          </div>
        `);
        }
        ((O.innerHTML = s.join("")),
          O.querySelectorAll(
            "#quick-edit-alinps-dip, #quick-edit-alinps-dat",
          ).forEach((e) => e.addEventListener("change", eu, { passive: !0 })));
      },
      el = () => {
        if (!v) return;
        (v.classList.remove("is-open"),
          v.setAttribute("aria-hidden", "true"),
          document.body.classList.remove("offerwall-open"));
        let e = document.getElementById("backArrow");
        e?.focus();
      },
      ec = () => {
        if (y.has("d")) {
          let e = eM(y.get("d"));
          if (e)
            return {
              ral: parseFloat(e.ral) || 0,
              regione: e.regione || "",
              mensilita: e.mensilita || 14,
              addizionaleComunale: parseFloat(e.addizionaleComunale) || 0,
              alinpsDip:
                void 0 !== e.alinpsDip ? parseFloat(e.alinpsDip) : void 0,
              alinpsDat:
                void 0 !== e.alinpsDat ? parseFloat(e.alinpsDat) : void 0,
              altreDetrazioni: parseFloat(e.altreDetrazioni) || 0,
              imponibileCervelli: parseFloat(e.imponibileCervelli) || 1,
              year: e.year || "2026",
              cuneoFiscale: eq(e.cuneoFiscale),
              esoneroContributivo: eq(e.esoneroContributivo),
              madreLavoratrice: eq(e.madreLavoratrice),
              bonus100Flag: eq(e.bonus100),
              apprendistato: eq(e.apprendistato),
              dipendentePubblico: eq(e.dipendentePubblico),
              maggiore15: eq(e.maggiore15),
              modificaInps: eq(e.modificaInps),
              coniugeCarico: eq(e.coniugeCarico),
              rientroCervelli: eq(e.rientroCervelli),
              mensilitaValue: e.mensilita || 14,
            };
        }
        return {
          ral: parseFloat(y.get("ral")) || 0,
          regione: y.get("regione") || "",
          mensilita: y.get("mensilita") || 14,
          addizionaleComunale: parseFloat(y.get("addizionaleComunale")) || 0,
          alinpsDip: parseFloat(y.get("alinpsDip")) || void 0,
          alinpsDat: parseFloat(y.get("alinpsDat")) || void 0,
          altreDetrazioni: parseFloat(y.get("altreDetrazioni")) || 0,
          imponibileCervelli: parseFloat(y.get("imponibileCervelli")) || 1,
          year: y.get("year") || "2026",
          cuneoFiscale: eq(y.get("cuneoFiscale")),
          esoneroContributivo: eq(y.get("esoneroContributivo")),
          madreLavoratrice: eq(y.get("madreLavoratrice")),
          bonus100Flag: eq(y.get("bonus100")),
          apprendistato: eq(y.get("apprendistato")),
          dipendentePubblico: eq(y.get("dipendentePubblico")),
          maggiore15: eq(y.get("maggiore15")),
          modificaInps: eq(y.get("modificaInps")),
          coniugeCarico: eq(y.get("coniugeCarico")),
          rientroCervelli: eq(y.get("rientroCervelli")),
          mensilitaValue: y.get("mensilita") || 14,
        };
      },
      eb = () => {
        var y, v;
        let k,
          E,
          I,
          S,
          O,
          V,
          H,
          K,
          W,
          G,
          J,
          Y,
          Q,
          Z,
          et,
          ei,
          eo,
          ed,
          er,
          en,
          ea,
          eu,
          el,
          em = ec();
        R = em.ral;
        let eb = em.year,
          es =
            f(L).aliquote_inps[`massimale${eb}`] ||
            f(L).aliquote_inps.massimale2026,
          eN = Math.min(R, es);
        (({ inpsDipendente: e, inpsAzienda: t } = w(eN, f(L), {
          year: em.year,
          esoneroContributivo: em.esoneroContributivo,
          madreLavoratrice: em.madreLavoratrice,
          mensilita: em.mensilitaValue,
          apprendistato: em.apprendistato,
          alinpsDip: em.alinpsDip,
          alinpsDat: em.alinpsDat,
        })),
          (k = (
            em.alinpsDip ?? 100 * f(L).aliquote_inps.lavoratore.regolare
          ).toFixed(2)),
          (E = (
            em.alinpsDat ?? 100 * f(L).aliquote_inps.azienda.regolare
          ).toFixed(2)),
          (I = (parseFloat(k) + parseFloat(E)).toFixed(2)),
          document
            .querySelectorAll(".alinps-dip")
            .forEach((e) => (e.textContent = k)),
          document
            .querySelectorAll(".alinps-dat")
            .forEach((e) => (e.textContent = E)),
          document
            .querySelectorAll(".alinps-tot")
            .forEach((e) => (e.textContent = I)),
          (S = em.madreLavoratrice
            ? " Esonero madre lavoratrice: azzera la quota INPS a carico dipendente fino al massimale previsto."
            : ""),
          document
            .querySelectorAll(".esonero-2024")
            .forEach((e) => (e.textContent = S)),
          (o = z(
            (i = C(R, e, {
              rientroCervelli: em.rientroCervelli,
              imponibileCervelli: em.imponibileCervelli,
            })),
            f(L),
            { year: em.year },
          )),
          (n = F(i, { ral: R })),
          (a = _(i, { coniugeCarico: em.coniugeCarico })),
          (p = A(R, e, { cuneoFiscale: em.cuneoFiscale })),
          (l = D(o, n, a, p)),
          (d = q(i, f(L), l, { regione: em.regione })),
          (r = B(i, l, { addizionaleComunale: em.addizionaleComunale })),
          (u = M(i, n, o, a, p, {
            bonus100Flag: em.bonus100Flag,
            altreDetrazioni: em.altreDetrazioni,
          })),
          (x = T(i, { cuneoFiscale: em.cuneoFiscale })),
          (g = P(l, r, d)),
          (c = j((m = $(R, e, g, x, u)), { mensilita: em.mensilitaValue })),
          (b = Math.round(R / 13.5)),
          (s = U(R, f(L))),
          (N = Math.round(R + b + t + s)),
          [
            () => {
              document.getElementById("inpsDipendente").textContent = e_(e);
            },
            () => {
              document.getElementById("inpsDipendenteDetail").value = e_(e);
            },
            () => {
              document.getElementById("inpsAzienda").value = e_(t);
            },
            () => {
              document.getElementById("imponibileIrpef").value = e_(i);
            },
            () => {
              document.getElementById("irpefLorda").value = e_(o);
            },
            () => {
              document.getElementById("addizionaleRegionale").value = e_(d);
            },
            () => {
              document.getElementById("addizionaleComunale").value = e_(r);
            },
            () => {
              document.getElementById("detrazioneLavoroDipendente").value =
                e_(n);
            },
            () => {
              document.getElementById("detrazione-coniuge").value = e_(a);
            },
            () => {
              document.getElementById("bonus-irpef-100").value = e_(u);
            },
            () => {
              document.getElementById("irpefNetta").value = e_(g);
            },
            () => {
              document.getElementById("retribuzioneAnnuaNetta").textContent =
                e_(m);
            },
            () => {
              document.getElementById("retribuzioneMensileNetta").textContent =
                e_(c);
            },
            () => {
              document.getElementById("oneriAssicurativi").value = e_(s);
            },
            () => {
              document.getElementById("trattamentoFineRapporto").value = e_(b);
            },
            () => {
              document.getElementById("costoAzienda").value = e_(N);
            },
            () => {
              document.getElementById("irpefNetta2").textContent = e_(g);
            },
            () => {
              document.getElementById("retribuzioneAnnuaNetta2").value = e_(m);
            },
            () => {
              document.getElementById("ulteriore-detrazione").value = e_(p);
            },
            () => {
              document.getElementById("somma-integrativa").value = e_(x);
            },
            () => {
              let e = document.getElementById(
                "retribuzioneMensileNetta-mobile",
              );
              e && (e.textContent = e_(c));
            },
            () => {
              let e = document.getElementById("retribuzioneAnnuaNetta-mobile");
              e && (e.textContent = e_(m));
            },
            () => {
              let e = document.getElementById("irpefNetta-mobile");
              e && (e.textContent = e_(g));
            },
            () => {
              let t = document.getElementById("inpsDipendente-mobile");
              t && (t.textContent = e_(e));
            },
          ].forEach((e) => e()),
          (y = R),
          (W = eL[(v = em.regione)] || 31856),
          (G = v
            ? "Lazio" === v
              ? "nel"
              : "Marche" === v
                ? "nelle"
                : "in"
            : "in"),
          (J = v || "Italia"),
          y < W
            ? ((O = `RAL sotto la media ${G} ${J} (impieghi full-time)`),
              (V =
                "Esplora la nostra <strong>Job Board</strong>, potresti trovare di meglio"),
              (H = "ph ph-warning"),
              (K = "cta-warning"))
            : y <= 4e4
              ? ((O = `RAL in linea col mercato ${G} ${J} (impieghi full-time)`),
                (V =
                  "Esplora la nostra <strong>Job Board</strong>, potresti trovare di meglio"),
                (H = "ph ph-chart-line-up"),
                (K = "cta-neutral"))
              : ((O = `RAL sopra la media ${G} ${J} (impieghi full-time)`),
                (V =
                  "Esplora posizioni senior nella nostra <strong>Job Board</strong>"),
                (H = "ph ph-trophy"),
                (K = "cta-positive")),
          (Y = `Media ${G} ${J}: \u{20AC}${ew(W)}`),
          (Q = O.replace(/\s*\(impieghi full-time\)/i, "")),
          (Z = document.getElementById("job-cta-title-mobile")),
          (et = document.getElementById("job-cta-subtitle-mobile")),
          (ei = document.getElementById("job-cta-icon-mobile")),
          (eo = document.getElementById("job-cta-mobile")),
          (ed = document.getElementById("job-cta-media-mobile")),
          Z && (Z.textContent = Q),
          et && (et.innerHTML = V),
          ei && (ei.className = H),
          eo &&
            (eo.classList.remove("cta-warning", "cta-neutral", "cta-positive"),
            eo.classList.add(K)),
          ed && (ed.textContent = Y),
          (er = document.getElementById("job-cta-title-desktop")),
          (en = document.getElementById("job-cta-subtitle-desktop")),
          (ea = document.getElementById("job-cta-icon-desktop")),
          (eu = document.getElementById("job-cta-desktop")),
          (el = document.getElementById("job-cta-media-desktop")),
          er && (er.textContent = O),
          en && (en.innerHTML = V),
          ea && (ea.className = H),
          eu &&
            (eu.classList.remove("cta-warning", "cta-neutral", "cta-positive"),
            eu.classList.add(K)),
          el && (el.textContent = Y));
        let eR = document.getElementById("result-subtitle");
        (eR &&
          (eR.textContent = `RAL: \u{20AC}${ew(R)} \xb7 ${em.mensilitaValue} mensilit\xe0`),
          h && (h.style.display = "block"),
          window.scrollTo(0, 0));
        let ex = (i = !0) => {
          ev(m, e, g, R, i);
          let o = Math.max(R - e, 0);
          (eE(
            f(L).dati_reddito.Italia,
            o,
            "Italia",
            "linechart-container-italia",
          ),
            f(L).dati_reddito[em.regione] &&
              eE(
                f(L).dati_reddito[em.regione],
                o,
                em.regione,
                "linechart-container-regione",
              ),
            ek(R, t, b, s, m, e, g, x, u));
        };
        if (
          ((X = ex),
          setTimeout(
            () =>
              ((e = !0) => {
                let t = () => {
                  (ex(e), (eB = !0));
                };
                "requestIdleCallback" in window
                  ? requestIdleCallback(t, { timeout: 1e3 })
                  : setTimeout(t, 0);
              })(!0),
            50,
          ),
          !ee)
        ) {
          let e = eT(() => {
            eB && X && X(!1);
          }, 250);
          (window.addEventListener("resize", e), (ee = !0));
        }
      },
      es = document.getElementById("backButton"),
      eN = document.getElementById("backArrow");
    (es && es.addEventListener("click", () => em()),
      eN &&
        eN.addEventListener("click", () =>
          (() => {
            if (!v || !V) return;
            let e = ec();
            V.value = Math.round(e.ral || 0);
            let t = String(e.mensilitaValue || "14");
            (W.forEach((e) => {
              e.checked = e.value === t;
            }),
              (() => {
                var e;
                let t, i;
                if (!I || !S) return;
                let o = ec(),
                  d = et(),
                  r =
                    ((t = new Set(J.map(({ paramName: e }) => e))),
                    (i = (
                      !(e = d[G]) || "string" != typeof e
                        ? []
                        : e
                            .split(",")
                            .map((e) => e.trim())
                            .filter(Boolean)
                            .filter((e, t, i) => i.indexOf(e) === t)
                    ).filter((e) => t.has(e))).length > 0
                      ? i
                      : J.filter(({ stateKey: e }) => !!o[e]).map(
                          ({ paramName: e }) => e,
                        )),
                  n = new Map(J.map((e) => [e.paramName, e]));
                if (((Z = r), 0 === r.length)) {
                  ((I.innerHTML = ""),
                    S.classList.remove("hidden-block"),
                    eu());
                  return;
                }
                (S.classList.add("hidden-block"),
                  (I.innerHTML = r
                    .map((e) => {
                      let t = n.get(e);
                      if (!t) return "";
                      let i = o[t.stateKey] ? "checked" : "";
                      return `
          <label class="inline-checkbox quick-edit-flag">
            <input type="checkbox" data-quick-flag="${e}" ${i}>
            <span>${t.label}</span>
          </label>
        `;
                    })
                    .join("")),
                  I.querySelectorAll('input[type="checkbox"]').forEach((e) => {
                    e.addEventListener("change", eu);
                  }),
                  eu());
              })(),
              v.classList.add("is-open"),
              v.setAttribute("aria-hidden", "false"),
              document.body.classList.add("offerwall-open"),
              eo());
          })(),
        ),
      E?.addEventListener("click", el),
      v?.addEventListener("click", (e) => {
        e.target === v && el();
      }),
      V?.addEventListener("input", eu, { passive: !0 }),
      V?.addEventListener("blur", () => {
        (eo(), eu());
      }),
      H?.addEventListener("focus", ed),
      H?.addEventListener("click", ed),
      W.forEach((e) => {
        e.addEventListener("change", eu, { passive: !0 });
      }),
      k?.addEventListener("submit", (e) => {
        let t, i, o, d;
        e.preventDefault();
        let { raw: r, activeFlagState: n } = ea(),
          a = Math.max(0, parseFloat(V?.value) || 0),
          u =
            ((t =
              document.querySelector(
                'input[name="quick-edit-mensilita"]:checked',
              )?.value || "14"),
            Y.includes(t) ? t : "14");
        if (
          (ei(r, "ral", Math.round(a)),
          ei(r, "mensilita", u),
          ei(r, G, Z.join(",")),
          Z.forEach((e) => {
            ei(r, e, n[e] ? "1" : "0");
          }),
          n.modificaInps)
        ) {
          let e = parseFloat(
              document.getElementById("quick-edit-alinps-dip")?.value,
            ),
            t = parseFloat(
              document.getElementById("quick-edit-alinps-dat")?.value,
            ),
            i = Number.isFinite(e) ? Math.min(Math.max(e, 0), 40) : er(r, !0),
            o = Number.isFinite(t)
              ? Math.min(Math.max(t, 0), 40)
              : 100 * f(L).aliquote_inps.azienda.regolare;
          (ei(r, "alinpsDip", i.toFixed(2)), ei(r, "alinpsDat", o.toFixed(2)));
        } else {
          let e = er(r),
            t = ((e, t = !1) =>
              t
                ? 100 * f(L).aliquote_inps.azienda.regolare
                : eq(e.apprendistato)
                  ? 100 * f(L).aliquote_inps.azienda.apprendistato
                  : eq(e.dipendentePubblico)
                    ? 100 * f(L).aliquote_inps.azienda.pubblico
                    : 100 * f(L).aliquote_inps.azienda.regolare)(r);
          (ei(r, "alinpsDip", e.toFixed(2)), ei(r, "alinpsDat", t.toFixed(2)));
        }
        let l = n.modificaInps ? parseFloat(r.alinpsDip) || er(r, !0) : er(r);
        (n.bonus100 && en(a, l)
          ? ei(
              r,
              "altreDetrazioni",
              Math.max(
                0,
                parseFloat(
                  document.getElementById("quick-edit-altre-detrazioni")?.value,
                ) || 0,
              ),
            )
          : delete r.altreDetrazioni,
          n.rientroCervelli
            ? ei(
                r,
                "imponibileCervelli",
                document.getElementById("quick-edit-imponibile-cervelli")
                  ?.value || "0.5",
              )
            : delete r.imponibileCervelli,
          (i = eA(r)),
          (y = new URLSearchParams()),
          i && y.set("d", i),
          (d = (o = y.toString())
            ? `/calcolo-stipendio-netto?${o}`
            : "/calcolo-stipendio-netto"),
          window.history.replaceState({}, "", d),
          eb(),
          el());
      }),
      K?.addEventListener("click", () => {
        let e = y.toString(),
          t = e ? `/?${e}` : "/";
        window.location.href = t;
      }),
      document.addEventListener("keydown", (e) => {
        if (
          v &&
          v.classList.contains("is-open") &&
          ("Escape" === e.key && el(), "Tab" === e.key)
        ) {
          let t = v.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (0 === t.length) return;
          let i = t[0],
            o = t[t.length - 1];
          e.shiftKey && document.activeElement === i
            ? (e.preventDefault(), o.focus())
            : e.shiftKey ||
              document.activeElement !== o ||
              (e.preventDefault(), i.focus());
        }
      }));
    let eR = document.getElementById("shareButton");
    eR && eR.addEventListener("click", () => eD(eR));
    let ex = document.getElementById("shareButtonMobile");
    (ex && ex.addEventListener("click", () => eD(ex)),
      eb(),
      (function () {
        let e = document.getElementById("offerwallModal");
        if (!e || "1" === sessionStorage.getItem(eC)) return;
        let t = parseInt(localStorage.getItem(ez) || "0", 10);
        if (Number.isFinite(t) && t > Date.now()) return;
        Number.isFinite(t) && t <= Date.now() && localStorage.removeItem(ez);
        let i = e.querySelectorAll("[data-offerwall-close]"),
          o = document.getElementById("offerwallCopyCode"),
          d = e.querySelectorAll("[data-offerwall-tab]"),
          r = e.querySelectorAll("[data-offerwall-panel]"),
          n = o ? o.innerHTML : "",
          a = ({ muteFor24h: t = !1 } = {}) => {
            if (t) {
              let e = Date.now() + 864e5;
              localStorage.setItem(ez, String(e));
            }
            (e.classList.remove("is-open"),
              e.setAttribute("aria-hidden", "true"),
              document.body.classList.remove("offerwall-open"));
          },
          u = null,
          l = !1,
          m = !1,
          c = () => {
            (u && (clearTimeout(u), (u = null)),
              window.removeEventListener("scroll", s),
              document.removeEventListener("visibilitychange", N));
          },
          b = () => {
            if (!l) {
              if ("visible" !== document.visibilityState) {
                m = !0;
                return;
              }
              ((l = !0),
                (m = !1),
                (() => {
                  let t = e.querySelector(".offerwall-tabs"),
                    i = e.querySelector(".offerwall-panels"),
                    o = ["jobs", "osservatorio", "cvbuilder"].map((e) => ({
                      tab: t.querySelector(`[data-offerwall-tab="${e}"]`),
                      panel: i.querySelector(`[data-offerwall-panel="${e}"]`),
                    }));
                  o.forEach((e) => {
                    (e.tab.classList.remove("is-active"),
                      e.tab.setAttribute("aria-selected", "false"),
                      e.panel.classList.remove("is-active"));
                  });
                  for (let e = o.length - 1; e > 0; e--) {
                    let t = Math.floor(Math.random() * (e + 1));
                    [o[e], o[t]] = [o[t], o[e]];
                  }
                  (o.forEach((e) => {
                    (t.appendChild(e.tab), i.appendChild(e.panel));
                  }),
                    o[0].tab.classList.add("is-active"),
                    o[0].tab.setAttribute("aria-selected", "true"),
                    o[0].panel.classList.add("is-active"));
                })(),
                e.classList.add("is-open"),
                e.setAttribute("aria-hidden", "false"),
                document.body.classList.add("offerwall-open"),
                sessionStorage.setItem(eC, "1"),
                c());
            }
          },
          s = () => {
            let e;
            !(
              (e =
                document.documentElement.scrollHeight - window.innerHeight) <= 0
            ) &&
              window.scrollY / e >= 0.5 &&
              b();
          },
          N = () => {
            "visible" === document.visibilityState && m && b();
          };
        ((u = window.setTimeout(b, 45e3)),
          window.addEventListener("scroll", s, { passive: !0 }),
          document.addEventListener("visibilitychange", N),
          s(),
          i.forEach((e) => {
            e.addEventListener("click", () => {
              a({
                muteFor24h: "mute" === e.getAttribute("data-offerwall-close"),
              });
            });
          }),
          d.forEach((e) => {
            e.addEventListener("click", () => {
              let t = e.getAttribute("data-offerwall-tab");
              t &&
                (d.forEach((t) => {
                  let i = t === e;
                  (t.classList.toggle("is-active", i),
                    t.setAttribute("aria-selected", i ? "true" : "false"));
                }),
                r.forEach((e) => {
                  let i = e.getAttribute("data-offerwall-panel") === t;
                  e.classList.toggle("is-active", i);
                }));
            });
          }),
          e.addEventListener("click", (t) => {
            t.target === e && a({ muteFor24h: !1 });
          }),
          document.addEventListener("keydown", (t) => {
            "Escape" === t.key &&
              e.classList.contains("is-open") &&
              a({ muteFor24h: !1 });
          }),
          o?.addEventListener("click", async () => {
            let e = o.dataset.offerwallCode?.trim() || "";
            if (e)
              try {
                (await navigator.clipboard.writeText(e),
                  (o.innerHTML = '<i class="ph ph-check"></i>'),
                  setTimeout(() => {
                    o.innerHTML = n;
                  }, 1800));
              } catch (e) {
                console.error("copy discount code failed", e);
              }
          }),
          window.addEventListener("beforeunload", c, { once: !0 }));
      })());
    return;
  }
  let y = document.getElementById("toggleButton"),
    v = document.getElementById("backButton"),
    k = document.getElementById("backArrow"),
    E = document.getElementById("shareButton"),
    I = document.querySelector(".input-section"),
    S = document.querySelector(".result-section"),
    O = document.getElementById("madre-lavoratrice"),
    V = document.getElementById("cuneo-fiscale"),
    H = document.getElementById("esonero-contributivo"),
    K = document.getElementById("mensilita"),
    W = document.getElementById("ral"),
    G = document.getElementById("ral-formatted"),
    J = document.getElementById("addizionale-comunale"),
    Y = document.getElementById("alinps-dip"),
    Q = document.getElementById("alinps-dat"),
    Z = document.getElementById("rientro-cervelli"),
    X = document.getElementById("modifica-inps"),
    ee = document.getElementById("dipendente-pubblico"),
    et = document.getElementById("maggiore-15"),
    ei = document.getElementById("apprendistato"),
    eo = document.getElementById("coniuge-carico"),
    ed = document.getElementById("aliquote-inps"),
    er = document.getElementById("bonus-100"),
    en = ["ral", "regione"];
  function ea() {
    requestAnimationFrame(() => {
      en.forEach((e) => {
        let t = document.getElementById(e);
        t && t.classList.remove("invalid-field");
      });
      let e = en.find((e) => {
        let t = document.getElementById(e);
        return t && "" === t.value.trim();
      });
      e && document.getElementById(e).classList.add("invalid-field");
    });
  }
  en.forEach((e) => {
    let t = document.getElementById(e);
    t && ((t.required = !0), t.classList.add("required-field"));
  });
  let eu = function (...e) {
    (clearTimeout(h),
      (h = setTimeout(() => {
        (clearTimeout(h), ea(...e));
      }, 100)));
  };
  function el(e) {
    let t = e;
    if (e.has("d")) {
      let i = eM(e.get("d"));
      i &&
        ((t = new URLSearchParams()),
        Object.entries(i).forEach(([e, i]) => t.set(e, i)));
    }
    eF = !0;
    let i = (e, i) => {
        if (!t.has(i)) return;
        let o = document.getElementById(e);
        o && (o.checked = "1" === t.get(i) || "true" === t.get(i));
      },
      o = (e, i) => {
        if (!t.has(i)) return;
        let o = document.getElementById(e);
        o && (o.value = t.get(i));
      },
      d = (e, i) => {
        if (!t.has(i)) return;
        let o = t.get(i),
          d = document.querySelector(`input[name="${e}"][value="${o}"]`);
        d && ((d.checked = !0), d.dispatchEvent(new Event("change")));
      };
    (o("ral", "ral"),
      o("regione", "regione"),
      d("mensilita", "mensilita"),
      o("addizionale-comunale", "addizionaleComunale"),
      o("alinps-dip", "alinpsDip"),
      o("alinps-dat", "alinpsDat"),
      o("altre-detrazioni", "altreDetrazioni"),
      o("imponibile-cervelli", "imponibileCervelli"),
      d("year", "year"),
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          (i("cuneo-fiscale", "cuneoFiscale"),
            i("esonero-contributivo", "esoneroContributivo"),
            i("madre-lavoratrice", "madreLavoratrice"),
            i("bonus-100", "bonus100"),
            i("apprendistato", "apprendistato"),
            i("dipendente-pubblico", "dipendentePubblico"),
            i("maggiore-15", "maggiore15"),
            i("modifica-inps", "modificaInps"),
            i("coniuge-carico", "coniugeCarico"),
            i("rientro-cervelli", "rientroCervelli"),
            eN({ preserveCustomValues: !0 }),
            ex(),
            eR(),
            ea(),
            (eF = !1));
        });
      }));
  }
  function em() {
    let e = new URLSearchParams(window.location.search).toString(),
      t = e ? `/?${e}` : "/";
    window.location.href = t;
  }
  async function ec() {
    if (!S) return;
    R = parseFloat(W.value);
    let h = document.querySelector('input[name="year"]:checked').value,
      y =
        f(L).aliquote_inps[`massimale${h}`] || f(L).aliquote_inps.massimale2026,
      v = Math.min(R, y);
    (({ inpsDipendente: e, inpsAzienda: t } = w(v, f(L), {
      year: h,
      esoneroContributivo: H.checked,
      madreLavoratrice: O.checked,
      mensilita:
        document.querySelector('input[name="mensilita"]:checked')?.value || 14,
      apprendistato: ei.checked,
      alinpsDip: parseFloat(Y.value),
      alinpsDat: parseFloat(Q.value),
    })),
      (o = z(
        (i = C(R, e, {
          rientroCervelli: Z?.checked,
          imponibileCervelli:
            parseFloat(document.getElementById("imponibile-cervelli")?.value) ||
            1,
        })),
        f(L),
        { year: h },
      )),
      (n = F(i, { ral: R })),
      (a = _(i, { coniugeCarico: eo?.checked })),
      (p = A(R, e, { cuneoFiscale: V.checked })),
      (l = D(o, n, a, p)),
      (d = q(i, f(L), l, {
        regione: document.getElementById("regione").value,
      })),
      (r = B(i, l, { addizionaleComunale: J.value })),
      (u = er.checked
        ? M(i, n, o, a, p, {
            bonus100Flag: !0,
            altreDetrazioni: document.getElementById("altre-detrazioni")?.value,
          })
        : 0),
      (x = T(i, { cuneoFiscale: V.checked })),
      (g = P(l, r, d)),
      (c = j((m = $(R, e, g, x, u)), {
        mensilita:
          document.querySelector('input[name="mensilita"]:checked')?.value ||
          14,
      })),
      (b = Math.round(R / 13.5)),
      (s = U(R, f(L))),
      (N = Math.round(R + b + t + s)),
      [
        () => {
          document.getElementById("inpsDipendente").textContent = e_(e);
        },
        () => {
          document.getElementById("inpsDipendenteDetail").value = e_(e);
        },
        () => {
          document.getElementById("inpsAzienda").value = e_(t);
        },
        () => {
          document.getElementById("imponibileIrpef").value = e_(i);
        },
        () => {
          document.getElementById("irpefLorda").value = e_(o);
        },
        () => {
          document.getElementById("addizionaleRegionale").value = e_(d);
        },
        () => {
          document.getElementById("addizionaleComunale").value = e_(r);
        },
        () => {
          document.getElementById("detrazioneLavoroDipendente").value = e_(n);
        },
        () => {
          document.getElementById("detrazione-coniuge").value = e_(a);
        },
        () => {
          document.getElementById("bonus-irpef-100").value = e_(u);
        },
        () => {
          document.getElementById("irpefNetta").value = e_(g);
        },
        () => {
          document.getElementById("retribuzioneAnnuaNetta").textContent = e_(m);
        },
        () => {
          document.getElementById("retribuzioneMensileNetta").textContent =
            e_(c);
        },
        () => {
          document.getElementById("oneriAssicurativi").value = e_(s);
        },
        () => {
          document.getElementById("trattamentoFineRapporto").value = e_(b);
        },
        () => {
          document.getElementById("costoAzienda").value = e_(N);
        },
        () => {
          document.getElementById("irpefNetta2").textContent = e_(g);
        },
        () => {
          document.getElementById("retribuzioneAnnuaNetta2").value = e_(m);
        },
        () => {
          document.getElementById("ulteriore-detrazione").value = e_(p);
        },
        () => {
          document.getElementById("somma-integrativa").value = e_(x);
        },
        () => {
          let e = document.getElementById("retribuzioneMensileNetta-mobile");
          e && (e.textContent = e_(c));
        },
        () => {
          let e = document.getElementById("retribuzioneAnnuaNetta-mobile");
          e && (e.textContent = e_(m));
        },
        () => {
          let e = document.getElementById("irpefNetta-mobile");
          e && (e.textContent = e_(g));
        },
        () => {
          let t = document.getElementById("inpsDipendente-mobile");
          t && (t.textContent = e_(e));
        },
      ].forEach((e) => e()),
      I && (I.style.display = "none"),
      (S.style.display = "block"),
      window.scrollTo(0, 0),
      setTimeout(() => {
        (S.offsetHeight,
          "requestIdleCallback" in window
            ? requestIdleCallback(
                () => {
                  ev(m, e, g, R, !0);
                  let t = Math.max(R - e, 0);
                  eE(
                    f(L).dati_reddito.Italia,
                    t,
                    "Italia",
                    "linechart-container-italia",
                  );
                  let i = document.getElementById("regione").value;
                  eE(f(L).dati_reddito[i], t, i, "linechart-container-regione");
                },
                { timeout: 1e3 },
              )
            : setTimeout(() => {
                ev(m, e, g, R, !0);
                let t = Math.max(R - e, 0);
                eE(
                  f(L).dati_reddito.Italia,
                  t,
                  "Italia",
                  "linechart-container-italia",
                );
                let i = document.getElementById("regione").value;
                eE(f(L).dati_reddito[i], t, i, "linechart-container-regione");
              }, 0),
          setTimeout(() => {
            (ek(R, t, b, s, m, e, g, x, u), (eB = !0));
          }, 100));
      }, 50));
  }
  (en.forEach((e) => {
    let t = document.getElementById(e);
    t &&
      t.addEventListener(
        "input",
        () => {
          (eu(), ex());
        },
        { passive: !0 },
      );
  }),
    ea(),
    W &&
      G &&
      (W.addEventListener("blur", () => {
        let e = parseFloat(W.value) || 0;
        (e < 0
          ? ((e = 0), (W.value = 0))
          : e > 1e6 && ((e = 1e6), (W.value = 1e6)),
          e > 0 &&
            ((G.value = e.toLocaleString("it-IT") + "€"),
            (W.style.display = "none"),
            (G.style.display = "block")));
      }),
      G.addEventListener("focus", () => {
        ((G.style.display = "none"), (W.style.display = "block"), W.focus());
      }),
      G.addEventListener("click", () => {
        ((G.style.display = "none"), (W.style.display = "block"), W.focus());
      })),
    y.addEventListener("click", () => {
      let e, t, i, o, d;
      ((d = (o = (i = eA(
        ((e = {}),
        (t = (t, i) => {
          null != i && "" !== i && (e[t] = i);
        })("ral", W?.value || ""),
        t("regione", document.getElementById("regione")?.value || ""),
        t(
          "mensilita",
          document.querySelector('input[name="mensilita"]:checked')?.value ||
            "",
        ),
        t("addizionaleComunale", J?.value || ""),
        t("alinpsDip", Y?.value || ""),
        t("alinpsDat", Q?.value || ""),
        t(
          "altreDetrazioni",
          document.getElementById("altre-detrazioni")?.value || "",
        ),
        t(
          "imponibileCervelli",
          document.getElementById("imponibile-cervelli")?.value || "",
        ),
        t(
          "year",
          document.querySelector('input[name="year"]:checked')?.value || "2026",
        ),
        [
          { id: "cuneo-fiscale", name: "cuneoFiscale" },
          { id: "esonero-contributivo", name: "esoneroContributivo" },
          { id: "madre-lavoratrice", name: "madreLavoratrice" },
          { id: "bonus-100", name: "bonus100" },
          { id: "apprendistato", name: "apprendistato" },
          { id: "dipendente-pubblico", name: "dipendentePubblico" },
          { id: "maggiore-15", name: "maggiore15" },
          { id: "modifica-inps", name: "modificaInps" },
          { id: "coniuge-carico", name: "coniugeCarico" },
          { id: "rientro-cervelli", name: "rientroCervelli" },
        ].forEach((t) => {
          let i = document.getElementById(t.id);
          i && (e[t.name] = i.checked ? "1" : "0");
        }),
        e),
      ))
        ? `d=${encodeURIComponent(i)}`
        : "")
        ? `/?${o}`
        : "/"),
        window.history.replaceState({}, "", d),
        (window.location.href = o
          ? `/calcolo-stipendio-netto?${o}`
          : "/calcolo-stipendio-netto"));
    }));
  let eb = eT(() => {
    eB &&
      ("requestIdleCallback" in window
        ? requestIdleCallback(
            () => {
              (ev(m, e, g, R, !1), ek(R, t, b, s, m, e, g, x, u));
              let i = Math.max(R - e, 0);
              eE(
                f(L).dati_reddito.Italia,
                i,
                "Italia",
                "linechart-container-italia",
              );
              let o = document.getElementById("regione").value;
              eE(f(L).dati_reddito[o], i, o, "linechart-container-regione");
            },
            { timeout: 1e3 },
          )
        : setTimeout(() => {
            (ev(m, e, g, R, !1), ek(R, t, b, s, m, e, g, x, u));
            let i = Math.max(R - e, 0);
            eE(
              f(L).dati_reddito.Italia,
              i,
              "Italia",
              "linechart-container-italia",
            );
            let o = document.getElementById("regione").value;
            eE(f(L).dati_reddito[o], i, o, "linechart-container-regione");
          }, 0));
  }, 250);
  function es() {
    let e = parseFloat(Y.value),
      t = parseFloat(Q.value),
      i = e + t,
      o = ei.checked,
      d =
        35e3 >= parseFloat(W.value) && H.checked
          ? o
            ? "Per via dell'esonero contributivo 2024, l'aliquota INPS a carico del dipendente in apprendistato è azzerata."
            : "Per via dell'esonero contributivo 2024, si applica una riduzione del" +
              (23e3 >= parseFloat(W.value) ? " 7% " : " 6% ") +
              "sui contributi previdenziali a carico del lavoratore."
          : "";
    (document.querySelectorAll(".alinps-dip").forEach((t) => {
      t.textContent = e;
    }),
      document.querySelectorAll(".alinps-dat").forEach((e) => {
        e.textContent = t;
      }),
      document.querySelectorAll(".alinps-tot").forEach((e) => {
        e.textContent = i;
      }),
      document.querySelectorAll(".esonero-2024").forEach((e) => {
        e.textContent = d;
      }),
      eR());
  }
  function eN({ preserveCustomValues: e = !1 } = {}) {
    if (!f(L) || !f(L).aliquote_inps) return;
    let t = !!Y?.value && !!Q?.value;
    (X?.checked
      ? (ed.classList.toggle("hidden-block", !1),
        (e && t) ||
          ((Y.value = (100 * f(L).aliquote_inps.lavoratore.regolare).toFixed(
            2,
          )),
          (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(2))),
        (ee.checked = !1),
        (et.checked = !1),
        (ei.checked = !1))
      : ee?.checked
        ? (ed.classList.toggle("hidden-block", !0),
          (X.checked = !1),
          (et.checked = !1),
          (ei.checked = !1),
          (Y.value = (100 * f(L).aliquote_inps.lavoratore.pubblico).toFixed(2)),
          (Q.value = (100 * f(L).aliquote_inps.azienda.pubblico).toFixed(2)))
        : ei?.checked
          ? (ed.classList.toggle("hidden-block", !0),
            (X.checked = !1),
            (et.checked = !1),
            (ee.checked = !1),
            (Y.value = (
              100 * f(L).aliquote_inps.lavoratore.apprendistato
            ).toFixed(2)),
            (Q.value = (100 * f(L).aliquote_inps.azienda.apprendistato).toFixed(
              2,
            )))
          : (et?.checked
              ? (ed.classList.toggle("hidden-block", !0),
                (X.checked = !1),
                (ei.checked = !1),
                (ee.checked = !1),
                (Y.value = (
                  100 * f(L).aliquote_inps.lavoratore.quindici_dipendenti
                ).toFixed(2)))
              : (ed.classList.toggle("hidden-block", !X?.checked),
                (Y.value = (
                  100 * f(L).aliquote_inps.lavoratore.regolare
                ).toFixed(2))),
            (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(2))),
      es());
  }
  function eR() {
    let e = document.getElementById("altre-detrazioni-row"),
      t = document.getElementById("bonus-100").checked,
      i = parseFloat(document.getElementById("ral").value) || 0,
      o =
        i -
        ((parseFloat(document.getElementById("alinps-dip").value) || 0) / 100) *
          i;
    t && o > 15e3 && o <= 28e3
      ? e.classList.remove("hidden-block")
      : e.classList.add("hidden-block");
  }
  function ex() {
    let e = document.getElementById("regione").value,
      t = document.querySelector('input[name="mensilita"]:checked')?.value,
      i = W.value,
      o = document.getElementById("addizionale-comunale").value,
      d = Y.value,
      r = Q.value,
      n = X.checked;
    y.disabled = !e || !t || !i || !o || (n && (!d || !r));
  }
  (window.addEventListener("resize", eb, { passive: !0 }),
    document.querySelectorAll('input[name="year"]').forEach((e) => {
      e.addEventListener(
        "change",
        function () {
          requestAnimationFrame(() => {
            let e = document.querySelectorAll(".dip-2025"),
              t = document.querySelectorAll(".dip-2024");
            "2025" === this.value
              ? (e.forEach((e) => e.classList.remove("hidden-block")),
                t.forEach((e) => e.classList.add("hidden-block")),
                !eF && ((H.checked = !1), O.checked || (V.checked = !0)))
              : "2024" === this.value
                ? (t.forEach((e) => e.classList.remove("hidden-block")),
                  e.forEach((e) => e.classList.add("hidden-block")),
                  eF || (O.checked || (H.checked = !0), (V.checked = !1)))
                : "2026" === this.value &&
                  (e.forEach((e) => e.classList.remove("hidden-block")),
                  t.forEach((e) => e.classList.add("hidden-block")),
                  !eF && ((H.checked = !1), O.checked || (V.checked = !0)));
          });
        },
        { passive: !0 },
      );
    }),
    v && v.addEventListener("click", () => em()),
    k && k.addEventListener("click", () => em()),
    er &&
      er.addEventListener("change", function () {
        eR();
      }),
    W &&
      W.addEventListener("change", function (e) {
        (0 > parseInt(e.target.value, 10) && (e.target.value = 0), eR());
      }),
    document.getElementById("altre-detrazioni") &&
      document
        .getElementById("altre-detrazioni")
        .addEventListener("change", function (e) {
          0 > parseInt(e.target.value, 10) && (e.target.value = 0);
        }),
    eR(),
    ex(),
    document.getElementById("regione").addEventListener("change", ex),
    document.querySelectorAll('input[name="mensilita"]').forEach((e) => {
      e.addEventListener("change", ex);
    }),
    W.addEventListener("change", function () {
      (ex(), es());
    }),
    document
      .getElementById("addizionale-comunale")
      .addEventListener("change", ex),
    Y.addEventListener("change", ex),
    Q.addEventListener("change", ex),
    ee.addEventListener("click", ex),
    O &&
      O.addEventListener("change", function () {
        (this.checked && ((H.checked = !1), (V.checked = !1)), es());
      }),
    V &&
      V.addEventListener("change", function () {
        this.checked && (O.checked = !1);
      }),
    H &&
      H.addEventListener("change", function () {
        (this.checked && (O.checked = !1), es());
      }),
    K &&
      K.addEventListener("change", function (e) {
        var t = parseInt(e.target.value, 10);
        (t < 12 && (e.target.value = 12), t > 15 && (e.target.value = 15));
      }),
    W &&
      W.addEventListener("change", function (e) {
        0 > parseInt(e.target.value, 10) && (e.target.value = 0);
      }),
    J &&
      J.addEventListener("change", function (e) {
        0 > parseFloat(e.target.value) && (e.target.value = 0);
      }),
    Y &&
      f(L).aliquote_inps &&
      Y.addEventListener("change", function (e) {
        var t = parseFloat(e.target.value);
        ((t < 0 || t >= 40) &&
          (e.target.value = 100 * f(L).aliquote_inps.lavoratore.regolare),
          es());
      }),
    Q &&
      f(L).aliquote_inps &&
      Q.addEventListener("change", function (e) {
        var t = parseFloat(e.target.value);
        ((t < 0 || t >= 40) &&
          (e.target.value = 100 * f(L).aliquote_inps.azienda.regolare),
          es());
      }),
    Z &&
      Z.addEventListener("change", function () {
        document
          .getElementById("cervelli-percentage")
          .classList.toggle("hidden-block", !this.checked);
      }),
    ei &&
      f(L).aliquote_inps &&
      ei.addEventListener("change", function () {
        (ei.checked
          ? ((X.checked = !1),
            (et.checked = !1),
            (ee.checked = !1),
            ed.classList.toggle("hidden-block", !0),
            (Y.value = (
              100 * f(L).aliquote_inps.lavoratore.apprendistato
            ).toFixed(2)))
          : (Y.value = (100 * f(L).aliquote_inps.lavoratore.regolare).toFixed(
              2,
            )),
          (Q.value = (100 * f(L).aliquote_inps.azienda.apprendistato).toFixed(
            2,
          )),
          es());
      }),
    et &&
      f(L).aliquote_inps &&
      et.addEventListener("change", function () {
        (et.checked
          ? ((X.checked = !1),
            (ei.checked = !1),
            (ee.checked = !1),
            ed.classList.toggle("hidden-block", !0),
            (Y.value = (
              100 * f(L).aliquote_inps.lavoratore.quindici_dipendenti
            ).toFixed(2)))
          : (Y.value = (100 * f(L).aliquote_inps.lavoratore.regolare).toFixed(
              2,
            )),
          (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(2)),
          es());
      }),
    ee &&
      f(L).aliquote_inps &&
      ee.addEventListener("change", function () {
        (ee.checked
          ? ((et.checked = !1),
            (X.checked = !1),
            (ei.checked = !1),
            ed.classList.toggle("hidden-block", !0),
            (Y.value = (100 * f(L).aliquote_inps.lavoratore.pubblico).toFixed(
              2,
            )),
            (Q.value = (100 * f(L).aliquote_inps.azienda.pubblico).toFixed(2)))
          : ((Y.value = (100 * f(L).aliquote_inps.lavoratore.regolare).toFixed(
              2,
            )),
            (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(2))),
          es());
      }),
    X &&
      f(L).aliquote_inps &&
      X.addEventListener("change", function () {
        (ed.classList.toggle("hidden-block", !this.checked),
          X.checked
            ? (ee.checked ||
                et.checked ||
                ei.checked ||
                ((Y.value = (
                  100 * f(L).aliquote_inps.lavoratore.regolare
                ).toFixed(2)),
                (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(
                  2,
                ))),
              (ee.checked = !1),
              (et.checked = !1),
              (ei.checked = !1))
            : ((Y.value = (
                100 * f(L).aliquote_inps.lavoratore.regolare
              ).toFixed(2)),
              (Q.value = (100 * f(L).aliquote_inps.azienda.regolare).toFixed(
                2,
              ))),
          es());
      }));
  let ep = new URLSearchParams(window.location.search);
  if (
    (ep.size > 0 ? el(ep) : eN(),
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) {
        let e = new URLSearchParams(window.location.search);
        e.size > 0 && el(e);
      }
    }),
    eS)
  ) {
    if (!W.value || !document.getElementById("regione").value) return void em();
    (I && (I.style.display = "none"), S && ((S.style.display = "block"), ec()));
  } else (I && (I.style.display = "block"), S && (S.style.display = "none"));
  E && eS && E.addEventListener("click", () => eD(E));
  let eg = document.getElementById("shareButtonMobile");
  eg && eS && eg.addEventListener("click", () => eD(eg));
}),
  (window.check = function (e) {
    document.getElementById(e).click();
  }));
//# sourceMappingURL=calcolo-stipendio-netto.0486aadd.js.map
