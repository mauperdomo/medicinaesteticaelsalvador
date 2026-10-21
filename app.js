(function () {
  "use strict";

  const DB = window.VADEMECUM;
  const app = document.getElementById("app");
  const labsById = Object.fromEntries(DB.laboratorios.map((l) => [l.id, l]));
  const productsById = Object.fromEntries(DB.productos.map((p) => [p.id, p]));
  const MAX_COMPARE = 3;

  // ───────────── utilidades ─────────────
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const VERIFY = '<span class="verify">Verificar en ficha técnica</span>';
  const val = (v) => (v === null || v === undefined || v === "" ? VERIFY : esc(v));
  const list = (arr) =>
    arr && arr.length ? `<ul class="clean">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : VERIFY;
  const cat = (id) => DB.categorias[id];
  const catTag = (id) => `<span class="tag" style="background:${cat(id).color}">${esc(cat(id).nombre)}</span>`;
  const productsOf = (labId) => DB.productos.filter((p) => p.lab === labId);

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* almacenamiento no disponible: el comparador funciona solo en esta sesión */
      }
    },
  };

  // ───────────── comparador (estado) ─────────────
  let compare = store.get("compare", []).filter((id) => productsById[id]);

  function toggleCompare(id) {
    if (compare.includes(id)) compare = compare.filter((x) => x !== id);
    else if (compare.length >= MAX_COMPARE) {
      renderCompareUI(`Máximo ${MAX_COMPARE} productos. Quita uno para agregar otro.`);
      return;
    } else compare.push(id);
    store.set("compare", compare);
    renderCompareUI();
  }

  function renderCompareUI(message) {
    const count = document.getElementById("compareCount");
    count.hidden = compare.length === 0;
    count.textContent = compare.length;
    document.querySelectorAll("[data-compare]").forEach((b) => {
      const on = compare.includes(b.dataset.compare);
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "✓ En comparación" : "⚖️ Comparar";
    });
    const tray = document.getElementById("compareTray");
    const onComparePage = location.hash.startsWith("#/comparar");
    tray.hidden = compare.length === 0 || onComparePage;
    tray.innerHTML = `<span>${message ? esc(message) : `${compare.length} de ${MAX_COMPARE} seleccionados`}</span>
      <a class="btn" href="#/comparar">Ver comparación</a>`;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-compare]");
    if (btn) {
      e.preventDefault();
      toggleCompare(btn.dataset.compare);
    }
  });

  // ───────────── componentes ─────────────
  function productCard(p) {
    const lab = labsById[p.lab];
    return `<article class="card product-card">
      <div class="head">
        <div>
          <h3><a href="#/producto/${p.id}">${esc(p.nombre)}</a></h3>
          <div class="meta">${esc(lab.nombre)}</div>
        </div>
        ${catTag(p.categoria)}
      </div>
      <div class="small">${esc(p.principioActivo)}</div>
      <div class="conc">${val(p.concentracion)}</div>
      <div class="chips">
        ${p.usoDomiciliario ? '<span class="chip on">Uso domiciliario</span>' : ""}
        ${p.lidocaina ? '<span class="chip">Con lidocaína</span>' : ""}
        ${p.tecnologia ? `<span class="chip">${esc(p.tecnologia)}</span>` : ""}
        ${p.duracion ? `<span class="chip">⏱ ${esc(p.duracion)}</span>` : ""}
      </div>
      <div class="actions">
        <a class="btn btn-primary" href="#/producto/${p.id}">Ver ficha</a>
        <button class="btn" data-compare="${p.id}" aria-pressed="false">⚖️ Comparar</button>
      </div>
    </article>`;
  }

  // Coordenadas de cada zona sobre el esquema facial (viewBox 200×280).
  const FACE_POINTS = {
    frente: [[100, 52, 34, 10]],
    glabela: [[100, 80, 8, 6]],
    patas_gallo: [[46, 100, 7, 9], [154, 100, 7, 9]],
    sienes: [[40, 76, 7, 10], [160, 76, 7, 10]],
    ojeras: [[74, 111, 10, 4], [126, 111, 10, 4]],
    mejilla: [[60, 132, 12, 10], [140, 132, 12, 10]],
    nariz: [[100, 122, 5, 14]],
    nasogeniano: [[80, 154, 4, 12], [120, 154, 4, 12]],
    peribucal: [[100, 164, 14, 3]],
    labios: [[100, 175, 14, 5]],
    marioneta: [[82, 190, 4, 9], [118, 190, 4, 9]],
    menton: [[100, 208, 13, 7]],
    mandibula: [[62, 192, 6, 14], [138, 192, 6, 14]],
    submenton: [[100, 232, 18, 5]],
    cuello: [[100, 262, 22, 8]],
  };

  function faceMap(zonas) {
    const shapes = zonas
      .flatMap((z) => FACE_POINTS[z] || [])
      .map(([cx, cy, rx, ry]) => `<ellipse class="zone" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />`)
      .join("");
    return `<div class="face"><svg viewBox="0 0 200 280" role="img" aria-label="Mapa de zonas de aplicación">
      <rect class="outline" x="78" y="225" width="44" height="55" rx="8" />
      <ellipse class="outline" cx="100" cy="128" rx="68" ry="98" />
      <path d="M70 100 q10 -6 20 0 M110 100 q10 -6 20 0" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5" />
      <path d="M86 176 q14 8 28 0" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5" />
      ${shapes}
    </svg></div>`;
  }

  function evidenceLinks(p) {
    const base = p.nombre.split("/")[0].replace(/[®™]/g, "").replace(/\(.*?\)/g, "").trim();
    const term = encodeURIComponent(base);
    const active = encodeURIComponent(p.principioActivo.split("(")[0].trim());
    const own = (p.evidencia || [])
      .map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.titulo)}</a></li>`)
      .join("");
    return `<ul class="clean">
      ${own}
      <li><a href="https://pubmed.ncbi.nlm.nih.gov/?term=${term}" target="_blank" rel="noopener">PubMed: estudios sobre ${esc(base)}</a></li>
      <li><a href="https://pubmed.ncbi.nlm.nih.gov/?term=${active}&filter=pubt.randomizedcontrolledtrial" target="_blank" rel="noopener">PubMed: ensayos aleatorizados sobre ${esc(p.principioActivo.split("(")[0].trim())}</a></li>
      <li><a href="https://clinicaltrials.gov/search?term=${term}" target="_blank" rel="noopener">ClinicalTrials.gov: ensayos registrados</a></li>
    </ul>
    <p class="small muted">Aprobaciones reportadas: ${val(p.aprobaciones)}</p>`;
  }

  // ───────────── vistas ─────────────
  function viewHome() {
    const labCards = (sugerido) =>
      DB.laboratorios
        .filter((l) => l.sugerido === sugerido)
        .map((l) => {
          const prods = productsOf(l.id);
          const cats = [...new Set(prods.map((p) => p.categoria))];
          return `<a class="card lab-card" href="#/lab/${l.id}">
            <div class="head" style="display:flex;justify-content:space-between;gap:8px">
              <h3>${esc(l.nombre)}</h3>
              ${l.sugerido ? '<span class="tag tag-suggested">Sugerido</span>' : ""}
            </div>
            <div class="meta">${esc(l.pais)} · ${prods.length} producto${prods.length === 1 ? "" : "s"}</div>
            <p class="small">${esc(l.descripcion)}</p>
            <div class="lab-stats">${cats.map(catTag).join("")}</div>
          </a>`;
        })
        .join("");

    const catChips = Object.entries(DB.categorias)
      .map(([id, c]) => `<a class="chip" href="#/buscar?cat=${id}">${c.icono} ${esc(c.nombre)}</a>`)
      .join("");

    return `<section class="hero">
        <h1>Vademécum de inyectables dermatológicos</h1>
        <p class="muted">Consulta por laboratorio: concentración, composición, indicaciones y seguridad.</p>
      </section>
      <div class="chips" style="margin:12px 0">${catChips}</div>
      <div class="notice">Uso exclusivo para profesionales de la salud. Datos referenciales: confirma siempre con el inserto aprobado por la Superintendencia de Regulación Sanitaria (SRS).</div>
      <h2 class="section-title">Laboratorios principales</h2>
      <div class="grid">${labCards(false)}</div>
      <h2 class="section-title">Otros laboratorios sugeridos <span class="small muted">(verificar registro SRS)</span></h2>
      <div class="grid">${labCards(true)}</div>
      <p class="footer-note">Base de datos versión ${esc(DB.version)} · ${DB.productos.length} productos</p>`;
  }

  function viewLab(id) {
    const lab = labsById[id];
    if (!lab) return notFound();
    const prods = productsOf(id);
    const groups = Object.keys(DB.categorias)
      .map((c) => [c, prods.filter((p) => p.categoria === c)])
      .filter(([, ps]) => ps.length);
    return `<nav class="breadcrumb"><a href="#/">Laboratorios</a> › ${esc(lab.nombre)}</nav>
      <div class="sheet-head">
        <div>
          <h1>${esc(lab.nombre)}</h1>
          <div class="muted">${esc(lab.pais)} · <a href="${esc(lab.sitio)}" target="_blank" rel="noopener">Sitio oficial</a></div>
        </div>
        ${lab.sugerido ? '<span class="tag tag-suggested">Sugerido · verificar registro SRS</span>' : ""}
      </div>
      <p>${esc(lab.descripcion)}</p>
      ${lab.notas ? `<div class="notice small">${list(lab.notas)}</div>` : ""}
      ${lab.guia ? labGuide(lab) : ""}
      ${groups
        .map(
          ([c, ps]) => `<h2 class="section-title">${cat(c).icono} ${esc(cat(c).nombre)} <span class="small muted">${ps.length}</span></h2>
          <div class="grid">${ps.map(productCard).join("")}</div>`
        )
        .join("")}`;
  }

  // Campos de protocolo en el orden en que se ejecutan; solo se muestran los presentes.
  const PROTOCOL_FIELDS = [
    ["preparacion", "Preparación de la piel"],
    ["dilucion", "Reconstitución", true],
    ["tecnica", "Técnica de aplicación"],
    ["profundidad", "Profundidad"],
    ["distancia", "Distancia entre puntos"],
    ["cantidad", "Cantidad"],
    ["volumenPunto", "Volumen por inyección", true],
    ["volumenSesion", "Volumen total por sesión"],
    ["tiempo", "Tiempo de exposición", true],
    ["neutralizacion", "Neutralización"],
    ["postPeel", "Cuidado inmediato"],
    ["esquemas", "Dilución y dosis por indicación"],
    ["porZona", "Técnica por zona"],
    ["sesiones", "Frecuencia y n.º de sesiones", true],
    ["mantenimiento", "Seguimiento"],
  ];

  function labGuide(lab) {
    return `<details class="card guide"><summary><strong>🧭 Guía por patología</strong> <span class="small muted">¿qué peeling elegir?</span></summary>
      <div class="grid" style="margin-top:12px">${lab.guia
        .map(
          (g) => `<div class="card"><h3>${esc(g.trastorno)}</h3>
            <div class="kv">${g.opciones
              .map(([nivel, id]) => `<div>${esc(nivel)}</div><div><a href="#/producto/${id}">${esc(productsById[id].nombre.replace(/^INNO-EXFO® /, ""))}</a></div>`)
              .join("")}</div></div>`
        )
        .join("")}</div>
      ${lab.fuenteGuia ? `<p class="small muted">Fuente: ${esc(lab.fuenteGuia)}</p>` : ""}
      ${lab.adyuvantes ? `<h3 style="margin-top:16px">Adyuvantes</h3>${list(lab.adyuvantes)}` : ""}</details>`;
  }

  function viewProduct(id, tab) {
    const p = productsById[id];
    if (!p) return notFound();
    const lab = labsById[p.lab];
    const seg = DB.seguridadCategoria[p.categoria];
    const t = tab || "ficha";
    const tabs = [
      ["ficha", "Ficha técnica"],
      ["uso", "Indicaciones y zonas"],
      ["seguridad", "Seguridad"],
      ["evidencia", "Evidencia"],
    ];
    if (p.protocolo) tabs.splice(2, 0, ["protocolo", "Protocolo"]);

    const ficha = `<div class="kv">
        <div>Principio activo</div><div>${val(p.principioActivo)}</div>
        <div>Concentración</div><div><strong>${val(p.concentracion)}</strong></div>
        <div>Composición</div><div>${val(p.composicion)}</div>
        ${p.tecnologia ? `<div>Tecnología</div><div>${esc(p.tecnologia)}</div>` : ""}
        <div>Lidocaína</div><div>${p.lidocaina ? "Sí (0.3 %) o versión disponible con lidocaína" : "No"}</div>
        <div>Presentación</div><div>${val(p.presentacion)}</div>
        ${p.dilucion ? `<div>Reconstitución</div><div>${esc(p.dilucion.diluyente)}<br><strong>${esc(p.dilucion.estandar)}</strong>${p.categoria === "toxina" ? '<br><a href="#/calculadora?prod=' + p.id + '">Abrir en la calculadora →</a>' : ""}</div>` : ""}
        ${p.ph ? `<div>pH</div><div><strong>${esc(p.ph)}</strong></div>` : ""}
        ${p.osmolaridad ? `<div>Osmolaridad</div><div>${esc(p.osmolaridad)}</div>` : ""}
        ${p.profundidad ? `<div>Profundidad del peeling</div><div>${esc(p.profundidad)}</div>` : ""}
        ${p.molestia ? `<div>Molestia</div><div>${esc(p.molestia)}</div>` : ""}
        ${p.recuperacion ? `<div>Recuperación</div><div>${esc(p.recuperacion)}</div>` : ""}
        ${p.sesionesMin ? `<div>Sesiones mínimas</div><div>${esc(p.sesionesMin)}</div>` : ""}
        <div>Conservación</div><div>${val(p.conservacion)}</div>
        <div>Duración del efecto</div><div>${val(p.duracion)}</div>
        <div>Características</div><div>${list(p.caracteristicas)}</div>
      </div>
      ${p.fuente ? `<p class="small muted">Fuente: ${esc(p.fuente)}</p>` : ""}`;

    const pr = p.protocolo || {};
    const protocolo = `<div class="kv">
        ${PROTOCOL_FIELDS.filter(([k]) => pr[k])
          .map(([k, label, strong]) => {
            const v = Array.isArray(pr[k]) ? list(pr[k]) : esc(pr[k]);
            return `<div>${label}</div><div>${strong ? `<strong>${v}</strong>` : v}</div>`;
          })
          .join("")}
        ${p.domiciliario ? `<div>Tratamiento domiciliario</div><div>${list(p.domiciliario)}</div>` : ""}
      </div>
      ${/UTI/.test(JSON.stringify(pr)) ? '<p class="small muted">1 UTI (Unidad Terapéutica Innoaesthetics) = 0.02 ml.</p>' : ""}
      ${p.fuente ? `<p class="small muted">Fuente: ${esc(p.fuente)}</p>` : ""}`;

    const zonasFaciales = p.zonas.filter((z) => FACE_POINTS[z]);
    const uso = `<div class="face-wrap">
        ${zonasFaciales.length ? faceMap(p.zonas) : ""}
        <div>
          <h3>Indicaciones</h3>${list(p.indicaciones)}
          <h3 style="margin-top:12px">Zonas</h3>
          <div class="chips">${p.zonas.map((z) => `<a class="chip on" href="#/buscar?zona=${z}">${esc(DB.zonas[z])}</a>`).join("")}</div>
          <div class="kv" style="margin-top:12px">
            <div>Plano de inyección</div><div>${val(p.plano)}</div>
            <div>Aguja / cánula</div><div>${val(p.aguja)}</div>
            ${p.dosis ? `<div>Dosis de referencia</div><div>${list(p.dosis)}</div>` : ""}
          </div>
        </div>
      </div>`;

    const seguridad = `
      ${p.seguridadExtra ? `<div class="notice danger" style="margin-bottom:12px"><strong>Advertencias específicas</strong>${list(p.seguridadExtra)}</div>` : ""}
      <div class="kv">
        <div>Contraindicaciones</div><div>${list(seg.contraindicaciones)}</div>
        <div>Precauciones</div><div>${list(seg.precauciones)}</div>
        <div>Efectos adversos</div><div>${list(seg.efectosAdversos)}</div>
        <div>Manejo de complicaciones</div><div>${esc(seg.complicaciones)}</div>
      </div>
      <p class="small muted">Información general de la categoría «${esc(cat(p.categoria).nombre)}». Consulta el inserto del producto.</p>`;

    const body = { ficha, uso, protocolo, seguridad, evidencia: evidenceLinks(p) }[t] || ficha;

    return `<nav class="breadcrumb"><a href="#/">Laboratorios</a> › <a href="#/lab/${lab.id}">${esc(lab.nombre)}</a> › ${esc(p.nombre)}</nav>
      <div class="sheet-head">
        <div>
          <h1>${esc(p.nombre)}</h1>
          <div class="muted">${esc(lab.nombre)} · ${catTag(p.categoria)}</div>
        </div>
        <button class="btn" data-compare="${p.id}" aria-pressed="false">⚖️ Comparar</button>
      </div>
      ${p.revisado ? "" : '<div class="notice small">Ficha aún no revisada por el equipo médico. Contrasta los datos con el inserto vigente.</div>'}
      <div class="tabs" role="tablist">
        ${tabs
          .map(
            ([k, label]) =>
              `<a class="chip ${k === t ? "on" : ""}" role="tab" aria-selected="${k === t}" href="#/producto/${p.id}?tab=${k}">${label}</a>`
          )
          .join("")}
      </div>
      <section class="card">${body}</section>`;
  }

  function viewSearch(params) {
    const q = params.get("q") || "";
    const fCat = params.get("cat") || "";
    const fLab = params.get("lab") || "";
    const fZona = params.get("zona") || "";
    const fLido = params.get("lido") || "";

    const options = (entries, sel, all) =>
      `<option value="">${all}</option>` +
      entries.map(([v, l]) => `<option value="${v}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`).join("");

    const words = norm(q).split(/\s+/).filter(Boolean);
    const results = DB.productos.filter((p) => {
      if (fCat && p.categoria !== fCat) return false;
      if (fLab && p.lab !== fLab) return false;
      if (fZona && !p.zonas.includes(fZona)) return false;
      if (fLido === "si" && !p.lidocaina) return false;
      if (fLido === "no" && p.lidocaina) return false;
      if (!words.length) return true;
      const hay = norm(
        [
          p.nombre,
          labsById[p.lab].nombre,
          p.principioActivo,
          p.composicion,
          p.concentracion,
          p.tecnologia,
          p.profundidad,
          cat(p.categoria).nombre,
          ...(p.indicaciones || []),
          ...p.zonas.map((z) => DB.zonas[z]),
        ].join(" ")
      );
      return words.every((w) => hay.includes(w));
    });

    return `<h1>Buscar</h1>
      <form class="filters" id="filters">
        <div class="field"><label for="q">Texto libre</label>
          <input id="q" name="q" type="search" value="${esc(q)}" placeholder="Ej.: lidocaína, Vycross, PLLA, ojeras…" autocomplete="off" /></div>
        <div class="filters-row">
          <div class="field"><label for="cat">Categoría</label><select id="cat" name="cat">${options(
            Object.entries(DB.categorias).map(([k, c]) => [k, c.nombre]),
            fCat,
            "Todas"
          )}</select></div>
          <div class="field"><label for="lab">Laboratorio</label><select id="lab" name="lab">${options(
            DB.laboratorios.map((l) => [l.id, l.nombre]),
            fLab,
            "Todos"
          )}</select></div>
          <div class="field"><label for="zona">Zona</label><select id="zona" name="zona">${options(
            Object.entries(DB.zonas),
            fZona,
            "Todas"
          )}</select></div>
          <div class="field"><label for="lido">Lidocaína</label><select id="lido" name="lido">${options(
            [["si", "Con lidocaína"], ["no", "Sin lidocaína"]],
            fLido,
            "Indistinto"
          )}</select></div>
        </div>
      </form>
      <p class="muted small" aria-live="polite">${results.length} resultado${results.length === 1 ? "" : "s"}</p>
      ${
        results.length
          ? `<div class="grid">${results.map(productCard).join("")}</div>`
          : '<div class="empty">No hay productos que coincidan. Prueba con menos filtros.</div>'
      }`;
  }

  function bindSearch() {
    const form = document.getElementById("filters");
    if (!form) return;
    const update = () => {
      const params = new URLSearchParams();
      new FormData(form).forEach((v, k) => v && params.set(k, v));
      const hash = "#/buscar" + (params.toString() ? "?" + params : "");
      history.replaceState(null, "", hash);
      const focusId = document.activeElement && document.activeElement.id;
      const caret = document.activeElement && document.activeElement.selectionStart;
      render();
      const el = focusId && document.getElementById(focusId);
      if (el) {
        el.focus();
        if (typeof caret === "number" && el.setSelectionRange) el.setSelectionRange(caret, caret);
      }
    };
    form.addEventListener("input", update);
    form.addEventListener("submit", (e) => e.preventDefault());
  }

  function viewCompare() {
    const ps = compare.map((id) => productsById[id]);
    if (!ps.length)
      return `<h1>Comparar productos</h1>
        <div class="empty">Aún no has seleccionado productos.<br>Pulsa <strong>⚖️ Comparar</strong> en hasta ${MAX_COMPARE} fichas.<br><br>
        <a class="btn btn-primary" href="#/buscar">Buscar productos</a></div>`;

    const rows = [
      ["Laboratorio", (p) => esc(labsById[p.lab].nombre)],
      ["Categoría", (p) => catTag(p.categoria)],
      ["Principio activo", (p) => val(p.principioActivo)],
      ["Concentración", (p) => `<strong>${val(p.concentracion)}</strong>`],
      ["Composición", (p) => val(p.composicion)],
      ["Tecnología", (p) => val(p.tecnologia || (p.categoria === "ha" ? null : "—"))],
      ["Lidocaína", (p) => (p.lidocaina ? "Sí" : "No")],
      ["Presentación", (p) => val(p.presentacion)],
      ["Plano", (p) => val(p.plano)],
      ["Aguja / cánula", (p) => val(p.aguja)],
      ["Duración", (p) => val(p.duracion)],
      ["Indicaciones", (p) => list(p.indicaciones)],
      ["Zonas", (p) => p.zonas.map((z) => esc(DB.zonas[z])).join(", ")],
      ["Características", (p) => list(p.caracteristicas)],
      ["Conservación", (p) => val(p.conservacion)],
      ["Aprobaciones", (p) => val(p.aprobaciones)],
    ];
    if (ps.some((p) => p.ph))
      rows.splice(
        4,
        0,
        ["pH", (p) => val(p.ph)],
        ["Profundidad", (p) => val(p.profundidad)],
        ["Recuperación", (p) => val(p.recuperacion)],
        ["Exposición", (p) => val(p.protocolo && p.protocolo.tiempo)],
        ["Neutralización", (p) => val(p.protocolo && p.protocolo.neutralizacion)],
        ["Sesiones", (p) => val(p.protocolo && p.protocolo.sesiones)]
      );
    const mixed = new Set(ps.map((p) => p.categoria)).size > 1;

    return `<div class="sheet-head"><h1>Comparar productos</h1>
        <button class="btn" id="clearCompare">Vaciar comparación</button></div>
      ${mixed ? '<div class="notice small" style="margin-bottom:12px">Estás comparando productos de categorías distintas.</div>' : ""}
      <div class="table-scroll"><table class="compare">
        <thead><tr><th scope="col"></th>${ps
          .map(
            (p) => `<th scope="col"><a href="#/producto/${p.id}">${esc(p.nombre)}</a><br>
              <button class="btn small" data-remove="${p.id}" style="margin-top:6px">Quitar</button></th>`
          )
          .join("")}</tr></thead>
        <tbody>${rows
          .map(([label, fn]) => `<tr><th scope="row">${label}</th>${ps.map((p) => `<td>${fn(p)}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table></div>`;
  }

  function bindCompare() {
    const btn = document.getElementById("clearCompare");
    if (btn)
      btn.addEventListener("click", () => {
        compare = [];
        store.set("compare", compare);
        render();
      });
    document.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => {
        toggleCompare(b.dataset.remove);
        render();
      })
    );
  }

  // Vial por defecto de cada toxina en la calculadora.
  const TOXIN_DEFAULT_UNITS = { botox: 100, xeomin: 100, dysport: 300, letybo: 100, newlux: 100 };

  function viewCalculator(params) {
    const sel = params.get("prod") || "botox";
    const toxinas = DB.productos.filter((p) => p.categoria === "toxina");
    return `<h1>Calculadora de dilución de toxina</h1>
      <p class="muted">Calcula la concentración final según las unidades del vial y el volumen de diluyente.</p>
      <div class="calc">
        <form class="card filters" id="calcForm">
          <div class="field"><label for="cProd">Producto</label>
            <select id="cProd">${toxinas
              .map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.nombre)}</option>`)
              .join("")}<option value="otro" ${sel === "otro" ? "selected" : ""}>Otro / manual</option></select></div>
          <div class="field"><label for="cUnits">Unidades por vial</label>
            <input id="cUnits" type="number" min="1" step="1" inputmode="numeric" /></div>
          <div class="field"><label for="cMl">Volumen de diluyente (ml)</label>
            <input id="cMl" type="number" min="0.1" step="0.1" inputmode="decimal" value="2.5" /></div>
          <div class="chips" id="mlPresets">
            ${[1, 1.25, 2, 2.5, 4, 5].map((m) => `<button type="button" class="chip" data-ml="${m}">${m} ml</button>`).join("")}
          </div>
          <div class="field"><label for="cDose">Dosis deseada por punto (U)</label>
            <input id="cDose" type="number" min="0" step="0.5" inputmode="decimal" value="4" /></div>
        </form>
        <section class="card" id="calcOut" aria-live="polite"></section>
      </div>
      <h2 class="section-title">Cálculo inverso</h2>
      <form class="card filters" id="invForm">
        <div class="filters-row">
          <div class="field"><label for="iUnits">Unidades por vial</label><input id="iUnits" type="number" min="1" value="100" /></div>
          <div class="field"><label for="iTarget">Concentración deseada (U por 0.1 ml)</label><input id="iTarget" type="number" min="0.1" step="0.1" value="4" /></div>
        </div>
        <p id="invOut" class="result-row"></p>
      </form>
      <div class="notice small" style="margin-top:16px">Las unidades de toxina botulínica no son intercambiables entre marcas (p. ej., las unidades Speywood de Dysport). En jeringas de insulina U-100, cada marca de "1 unidad" equivale a 0.01 ml.</div>`;
  }

  function bindCalculator() {
    const form = document.getElementById("calcForm");
    if (!form) return;
    const $ = (id) => document.getElementById(id);
    const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString("es-SV", { maximumFractionDigits: d }) : "—");

    const setDefaults = () => {
      const units = TOXIN_DEFAULT_UNITS[$("cProd").value];
      if (units) $("cUnits").value = units;
      const p = productsById[$("cProd").value];
      $("cDose").value = p && p.id === "dysport" ? 10 : 4;
    };

    const calc = () => {
      const units = parseFloat($("cUnits").value);
      const ml = parseFloat($("cMl").value);
      const dose = parseFloat($("cDose").value);
      const perMl = units / ml;
      const vol = dose / perMl;
      const p = productsById[$("cProd").value];
      document.querySelectorAll("#mlPresets [data-ml]").forEach((b) => b.classList.toggle("on", parseFloat(b.dataset.ml) === ml));
      $("calcOut").innerHTML =
        units > 0 && ml > 0
          ? `<div class="muted small">${p ? esc(p.nombre) : "Producto manual"}</div>
            <div class="result-big">${fmt(perMl / 10)} U / 0.1 ml</div>
            <div class="result-row"><span>Unidades por ml</span><strong>${fmt(perMl)} U</strong></div>
            <div class="result-row"><span>Unidades por 0.05 ml</span><strong>${fmt(perMl / 20)} U</strong></div>
            <div class="result-row"><span>Unidades por marca de jeringa U-100 (0.01 ml)</span><strong>${fmt(perMl / 100)} U</strong></div>
            ${
              dose > 0
                ? `<div class="result-row"><span>Volumen para ${fmt(dose)} U por punto</span><strong>${fmt(vol, 3)} ml · ${fmt(vol * 100, 1)} marcas U-100</strong></div>
                   <div class="result-row"><span>Puntos de ${fmt(dose)} U por vial</span><strong>${fmt(Math.floor(units / dose), 0)}</strong></div>`
                : ""
            }
            ${p && p.dilucion ? `<p class="small muted">Referencia del inserto: ${esc(p.dilucion.estandar)}</p>` : ""}`
          : '<div class="empty">Introduce las unidades y el volumen.</div>';

      const iu = parseFloat($("iUnits").value);
      const it = parseFloat($("iTarget").value);
      $("invOut").innerHTML =
        iu > 0 && it > 0
          ? `<span>Diluyente necesario</span><strong>${fmt(iu / (it * 10))} ml</strong>`
          : "<span>Completa los campos</span>";
    };

    $("cProd").addEventListener("change", () => {
      setDefaults();
      calc();
    });
    $("mlPresets").addEventListener("click", (e) => {
      const b = e.target.closest("[data-ml]");
      if (!b) return;
      $("cMl").value = b.dataset.ml;
      calc();
    });
    form.addEventListener("input", calc);
    document.getElementById("invForm").addEventListener("input", calc);
    form.addEventListener("submit", (e) => e.preventDefault());
    setDefaults();
    calc();
  }

  function viewAbout() {
    const sugeridos = DB.laboratorios.filter((l) => l.sugerido);
    return `<h1>Acerca del vademécum</h1>
      <section class="card">
        <p>Herramienta de consulta rápida para médicos de El Salvador sobre productos dermatológicos inyectables y peelings,
        organizada por laboratorio y categoría.</p>
        <h3>Aviso importante</h3>
        <ul class="clean">
          <li>Uso exclusivo para profesionales de la salud. No sustituye el inserto ni el juicio clínico.</li>
          <li>Los datos proceden de fichas técnicas e insertos públicos internacionales; las indicaciones aprobadas y las presentaciones pueden variar en El Salvador.</li>
          <li>Verifica el registro sanitario vigente de cada producto en la <a href="https://www.srs.gob.sv" target="_blank" rel="noopener">Superintendencia de Regulación Sanitaria (SRS)</a>.</li>
          <li>Los campos marcados como ${VERIFY} no se han confirmado todavía.</li>
        </ul>
        <h3 style="margin-top:12px">Laboratorios sugeridos</h3>
        <p class="small">Marcas con presencia habitual en Centroamérica cuya disponibilidad y registro en El Salvador deben confirmarse con la SRS y los distribuidores locales:
        ${sugeridos.map((l) => `<a href="#/lab/${l.id}">${esc(l.nombre)}</a>`).join(", ")}.</p>
        <h3 style="margin-top:12px">Instalar en el celular</h3>
        <p class="small">Abre la app en el navegador y elige «Agregar a pantalla de inicio». Una vez cargada, funciona sin conexión.</p>
        <p class="small muted">Versión de datos: ${esc(DB.version)}</p>
      </section>`;
  }

  function notFound() {
    return '<div class="empty">No encontramos esta página. <a href="#/">Volver al inicio</a></div>';
  }

  // ───────────── enrutador ─────────────
  function render() {
    const [path, query] = (location.hash.slice(1) || "/").split("?");
    const params = new URLSearchParams(query || "");
    const parts = path.split("/").filter(Boolean);
    let html, nav, after;

    switch (parts[0]) {
      case undefined:
        html = viewHome();
        nav = "inicio";
        break;
      case "lab":
        html = viewLab(parts[1]);
        nav = "inicio";
        break;
      case "producto":
        html = viewProduct(parts[1], params.get("tab"));
        nav = "inicio";
        break;
      case "buscar":
        html = viewSearch(params);
        nav = "buscar";
        after = bindSearch;
        break;
      case "comparar":
        html = viewCompare();
        nav = "comparar";
        after = bindCompare;
        break;
      case "calculadora":
        html = viewCalculator(params);
        nav = "calculadora";
        after = bindCalculator;
        break;
      case "acerca":
        html = viewAbout();
        nav = "acerca";
        break;
      default:
        html = notFound();
    }

    app.innerHTML = html;
    document.querySelectorAll(".bottomnav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
    if (after) after();
    renderCompareUI();
  }

  let lastPath = null;
  window.addEventListener("hashchange", () => {
    render();
    const path = location.hash.split("?")[0];
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
  });

  document.getElementById("searchTop").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("searchTopInput").value.trim();
    location.hash = "#/buscar" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  lastPath = location.hash.split("?")[0];
  render();
})();
