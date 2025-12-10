// Dashboard IMC – Rentabilidad y Calidad de Datos

/* ================== Config columnas detalle =================== */

const ALL_DETALLE_COLS = [
  {
    key: "year",
    label: "Año",
    type: "number",
    value: (r) => r.year,
    display: (r) => (r.year == null ? "" : String(r.year)),
  },
  {
    key: "fecha",
    label: "Fecha",
    type: "date",
    value: (r) => r.fechaObj,
    display: (r) =>
      r.fechaObj ? r.fechaObj.toLocaleDateString("es-MX") : "",
  },
  {
    key: "hora",
    label: "Hora",
    type: "string",
    value: (r) => r.hora || r["hora"] || "",
    display: (r) => r.hora || r["hora"] || "",
  },
  {
    key: "almacen",
    label: "Almacén",
    type: "string",
    value: (r) => r.almacen || "",
    display: (r) => r.almacen || "",
  },
  {
    key: "factura",
    label: "Factura",
    type: "string",
    value: (r) => r.factura || r["factura"] || "",
    display: (r) => r.factura || r["factura"] || "",
  },
  {
    key: "cliente",
    label: "Cliente",
    type: "string",
    value: (r) => r.cliente || r["cliente"] || "",
    display: (r) => r.cliente || r["cliente"] || "",
  },
  {
    key: "categoria",
    label: "Categoría",
    type: "string",
    value: (r) => r.categoria || "",
    display: (r) => r.categoria || "",
  },
  {
    key: "producto",
    label: "Producto",
    type: "string",
    value: (r) => r.producto || r["producto"] || "",
    display: (r) => r.producto || r["producto"] || "",
  },
  {
    key: "tipoFactura",
    label: "Tipo Factura",
    type: "string",
    value: (r) => r.tipoFactura || "",
    display: (r) => r.tipoFactura || "",
  },
  {
    key: "subt_fac",
    label: "Subtotal",
    type: "number",
    value: (r) => r.subt_fac_num || 0,
    display: (r) => formatMoneda(r.subt_fac_num || 0),
  },
  {
    key: "costo",
    label: "Costo",
    type: "number",
    value: (r) =>
      parseNumero(
        r.costo1 ||
          r["costo1"] ||
          r.costo2 ||
          r["costo2"] ||
          0
      ),
    display: (r) =>
      formatMoneda(
        parseNumero(
          r.costo1 ||
            r["costo1"] ||
            r.costo2 ||
            r["costo2"] ||
            0
        )
      ),
  },
  {
    key: "descuento",
    label: "Descuento",
    type: "number",
    value: (r) => {
      let d = 0;
      ["descuento", "descuento1", "descuento_1", "descuento2", "descuento_2"].forEach(
        (c) => {
          if (r[c] != null) d += parseNumero(r[c]);
        }
      );
      return d;
    },
    display: (r) => {
      let d = 0;
      ["descuento", "descuento1", "descuento_1", "descuento2", "descuento_2"].forEach(
        (c) => {
          if (r[c] != null) d += parseNumero(r[c]);
        }
      );
      return formatMoneda(d);
    },
  },
  {
    key: "utilidad",
    label: "Utilidad",
    type: "number",
    value: (r) => r.utilidad_num || 0,
    display: (r) => formatMoneda(r.utilidad_num || 0),
  },
  {
    key: "margen",
    label: "Margen %",

    type: "number",
    value: (r) => r.margen_calc || 0,
    display: (r) => formatPorcentaje(r.margen_calc || 0),
  },
  {
    key: "filtro3",
    label: "Filtro3",
    type: "string",
    value: (r) => r.filtro3_norm || "",
    display: (r) => r.filtro3_norm || "",
  },
  {
    key: "marca",
    label: "Marca",
    type: "string",
    value: (r) => r.marca || r["marca"] || "",
    display: (r) => r.marca || r["marca"] || "",
  },
  {
    key: "vendedor",
    label: "Vendedor",
    type: "string",
    value: (r) => r.vendedor || r["vendedor"] || "",
    display: (r) => r.vendedor || r["vendedor"] || "",
  },
];

// 7 columnas visibles (slots) iniciales – en el orden que pediste
const MAX_DETALLE_COLS = 7;
let detalleSlotKeys = [
  "year",
  "almacen",
  "categoria",
  "costo",
  "subt_fac",
  "margen",
  "utilidad",
];

let dragFieldKey = null;
let detalleSortState = { col: null, dir: "asc" };
let detalleColFilters = {};

/* ================== Estado general =================== */

let dataRaw = [];
let dataClean = [];
let charts = {
  categorias: null,
  sucursales: null,
  diaSemana: null,
  compSucursales: null,
  compCategorias: null,
};
let drillMetric = null;

/* ================== Utilidades =================== */

function getColByKey(key) {
  return ALL_DETALLE_COLS.find((c) => c.key === key) || null;
}

function getActiveDetalleCols() {
  return detalleSlotKeys
    .slice(0, MAX_DETALLE_COLS)
    .map((k) => getColByKey(k))
    .filter(Boolean);
}

function normalizarFiltro3(v) {
  if (!v) return "";
  let s = String(v).trim();
  if (s === "PROMOCIÃ“N") return "PROMOCIÓN";
  if (s === "UNIDAD DE CONVERSIÃ“N") return "UNIDAD DE CONVERSIÓN";
  return s;
}

function parseFechaCedro(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.split(/[/-]/).map((x) => parseInt(x, 10));
  if (partes.length !== 3 || partes.some(isNaN)) return null;
  const [p1, p2, year] = partes;
  let day, month;
  if (year === 2024) {
    day = p1;
    month = p2;
  } else if (year === 2025) {
    month = p1;
    day = p2;
  } else {
    day = p1;
    month = p2;
  }
  return new Date(year, month - 1, day);
}

function parseNumero(valor) {
  if (valor === null || valor === undefined) return 0;
  const limpio = String(valor).replace(/\$/g, "").replace(/,/g, "").trim();
  if (limpio === "") return 0;
  const num = parseFloat(limpio);
  return isNaN(num) ? 0 : num;
}

function formatMoneda(v) {
  if (!isFinite(v)) return "$0";
  return "$" + v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}
function formatPorcentaje(v) {
  if (!isFinite(v)) return "0%";
  return (v * 100).toFixed(1) + "%";
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ================== Limpieza =================== */

function limpiarDatos(rows) {
  return rows
    .map((r) => {
      const filtro3Norm = normalizarFiltro3(
        r.filtro3 || r["filtro3"] || r["AD"]
      );
      const fechaObj = parseFechaCedro(r.fecha || r["fecha"]);
      const year = fechaObj ? fechaObj.getFullYear() : null;
      const diaSemana = fechaObj
        ? fechaObj.toLocaleDateString("es-MX", { weekday: "short" })
        : "";

      const subt = parseNumero(r.subt_fac || r["subt_fac"]);
      const util = parseNumero(r.utilidad || r["utilidad"]);

      const tipoFactura =
        r["Tipo de Factura"] ||
        r["tipo_factura"] ||
        r.tipoFactura ||
        "";
      const almacen = r.almacen || r["almacen"] || "";
      const categoria = r.categoria || r["categoria"] || "";
      const margen_calc = subt !== 0 ? util / subt : 0;

      const esAdEspecial = [
        "BASE",
        "LIQUIDACION",
        "PROMOCIÓN",
        "RANGO",
        "UNIDAD DE CONVERSIÓN",
      ].includes(filtro3Norm);

      return {
        ...r,
        filtro3_norm: filtro3Norm,
        esAdEspecial,
        fechaObj,
        year,
        diaSemana,
        subt_fac_num: subt,
        utilidad_num: util,
        margen_calc,
        tipoFactura,
        almacen,
        categoria,
      };
    })
    .filter((r) => r.fechaObj && r.year);
}

/* ================== Filtros superiores =================== */

function poblarFiltroAnio(data) {
  const sel = document.getElementById("filtroAnio");
  if (!sel) return;
  sel.innerHTML = "";

  const years = Array.from(
    new Set(
      data
        .map((r) => r.year)
        .filter((y) => y === 2024 || y === 2025)
    )
  ).sort();

  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.textContent = "Todos los años";
  sel.appendChild(optTodos);

  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    sel.appendChild(opt);
  });

  sel.value = "todos";
}

function poblarFiltroMultiples(data, campo, idSelect) {
  const sel = document.getElementById(idSelect);
  if (!sel) return;
  sel.innerHTML = "";

  let placeholder = "Todos";
  if (campo === "almacen") placeholder = "Todos los almacenes";
  if (campo === "categoria") placeholder = "Todas las categorías";

  const optTodos = document.createElement("option");
  optTodos.value = "todos";
  optTodos.textContent = placeholder;
  sel.appendChild(optTodos);

  const valores = Array.from(
    new Set(
      data
        .map((r) => r[campo])
        .filter((v) => v != null && String(v).trim() !== "")
    )
  ).sort();

  valores.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = String(v);
    sel.appendChild(opt);
  });

  sel.value = "todos";
}

function initChipSingleSelect(selectId, placeholderText) {
  const select = document.getElementById(selectId);
  if (!select || select.dataset.chipified === "1") return;

  select.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "chip-select-wrapper";

  const display = document.createElement("div");
  display.className = "chip-select-display";
  display.innerHTML = `<span class="chip-label"></span><span class="chip-arrow">▾</span>`;

  const dropdown = document.createElement("div");
  dropdown.className = "chip-select-dropdown";

  Array.from(select.options).forEach((opt) => {
    const optDiv = document.createElement("div");
    optDiv.className = "chip-option";
    optDiv.textContent = opt.textContent;
    optDiv.dataset.value = opt.value;

    if (opt.selected) optDiv.classList.add("selected");

    optDiv.addEventListener("click", () => {
      Array.from(select.options).forEach((o) => (o.selected = false));
      opt.selected = true;

      dropdown
        .querySelectorAll(".chip-option")
        .forEach((d) => d.classList.remove("selected"));
      optDiv.classList.add("selected");

      syncLabel();
      dropdown.classList.remove("open");
      select.dispatchEvent(new Event("change"));
    });

    dropdown.appendChild(optDiv);
  });

  function syncLabel() {
    const labelSpan = display.querySelector(".chip-label");
    const selectedOpt = select.options[select.selectedIndex];
    labelSpan.textContent = selectedOpt
      ? selectedOpt.textContent
      : placeholderText || "Seleccionar";
  }

  syncLabel();

  display.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  select.dataset.chipified = "1";
}

function inicializarFiltros(data) {
  poblarFiltroAnio(data);
  poblarFiltroMultiples(data, "almacen", "filtroAlmacen");
  poblarFiltroMultiples(data, "categoria", "filtroCategoria");

  const selTipo = document.getElementById("filtroTipoFactura");
  if (selTipo && selTipo.options.length === 0) {
    ["todos", "Contado", "Crédito"].forEach((valor) => {
      const opt = document.createElement("option");
      opt.value = valor === "todos" ? "todos" : valor;
      opt.textContent =
        valor === "todos" ? "Contado + Crédito" : valor;
      selTipo.appendChild(opt);
    });
    selTipo.value = "todos";
  }

  const chk = document.getElementById("chkExcluirAD");
  if (chk && !chk.checked) chk.checked = true;

  initChipSingleSelect("filtroAnio", "Todos los años");
  initChipSingleSelect("filtroTipoFactura", "Contado + Crédito");
  initChipSingleSelect("filtroAlmacen", "Todos los almacenes");
  initChipSingleSelect("filtroCategoria", "Todas las categorías");

  renderDetalleFieldPalette();
}

/* ================== Filtros de datos =================== */

function getValoresMultiples(idSelect) {
  const el = document.getElementById(idSelect);
  if (!el) return [];
  const v = el.value;
  if (!v || v === "todos") return [];
  return [v];
}

function getDatosFiltrados() {
  if (!dataClean.length) return [];

  const selAnio = document.getElementById("filtroAnio");
  const selTipo = document.getElementById("filtroTipoFactura");
  const chkAD = document.getElementById("chkExcluirAD");

  const anio = selAnio ? selAnio.value : "todos";
  const tipo = selTipo ? selTipo.value : "todos";
  const excluirAD = chkAD ? chkAD.checked : false;

  const almacenesSel = getValoresMultiples("filtroAlmacen");
  const categoriasSel = getValoresMultiples("filtroCategoria");

  return dataClean.filter((r) => {
    if (excluirAD && r.esAdEspecial) return false;
    if (anio !== "todos" && String(r.year) !== anio) return false;
    if (tipo !== "todos" && r.tipoFactura !== tipo) return false;
    if (
      almacenesSel.length > 0 &&
      !almacenesSel.includes(r.almacen)
    )
      return false;
    if (
      categoriasSel.length > 0 &&
      !categoriasSel.includes(r.categoria)
    )
      return false;
    return true;
  });
}

function getDatosFiltradosSinAnio() {
  if (!dataClean.length) return [];

  const selTipo = document.getElementById("filtroTipoFactura");
  const chkAD = document.getElementById("chkExcluirAD");

  const tipo = selTipo ? selTipo.value : "todos";
  const excluirAD = chkAD ? chkAD.checked : false;

  const almacenesSel = getValoresMultiples("filtroAlmacen");
  const categoriasSel = getValoresMultiples("filtroCategoria");

  return dataClean.filter((r) => {
    if (excluirAD && r.esAdEspecial) return false;
    if (tipo !== "todos" && r.tipoFactura !== tipo) return false;
    if (
      almacenesSel.length > 0 &&
      !almacenesSel.includes(r.almacen)
    )
      return false;
    if (
      categoriasSel.length > 0 &&
      !categoriasSel.includes(r.categoria)
    )
      return false;
    return true;
  });
}

/* ================== KPIs / agrupaciones =================== */

function calcularKpis(rows) {
  let ventas = 0,
    utilidad = 0,
    ventasCredito = 0,
    ventasNeg = 0;

  rows.forEach((r) => {
    const v = r.subt_fac_num || 0;
    const u = r.utilidad_num || 0;
    ventas += v;
    utilidad += u;
    if (r.tipoFactura === "Crédito") ventasCredito += v;
    if (u < 0) ventasNeg += v;
  });

  return {
    ventas,
    utilidad,
    margen: ventas > 0 ? utilidad / ventas : 0,
    pctCredito: ventas > 0 ? ventasCredito / ventas : 0,
    pctNegativas: ventas > 0 ? ventasNeg / ventas : 0,
  };
}

function agruparPorSucursal(rows) {
  const mapa = {};
  rows.forEach((r) => {
    const alm = r.almacen || "SIN_ALMACEN";
    if (!mapa[alm])
      mapa[alm] = { almacen: alm, ventas: 0, utilidad: 0, ventasNeg: 0 };
    mapa[alm].ventas += r.subt_fac_num || 0;
    mapa[alm].utilidad += r.utilidad_num || 0;
    if (r.utilidad_num < 0) mapa[alm].ventasNeg += r.subt_fac_num || 0;
  });

  const lista = Object.values(mapa);
  lista.forEach((s) => {
    s.margen = s.ventas > 0 ? s.utilidad / s.ventas : 0;
    s.pctNeg = s.ventas > 0 ? s.ventasNeg / s.ventas : 0;
  });

  lista.sort((a, b) => b.ventas - a.ventas);
  return lista;
}

/* ================== Resumen =================== */

function actualizarKpiCards(kpi) {
  const v = document.getElementById("kpiVentas");
  const u = document.getElementById("kpiUtilidad");
  const m = document.getElementById("kpiMargen");
  const c = document.getElementById("kpiCredito");
  const n = document.getElementById("kpiNegativas");

  if (v)
    v.innerHTML = `<h3>Ventas IMC</h3><p>${formatMoneda(
      kpi.ventas
    )}</p>`;
  if (u)
    u.innerHTML = `<h3>Utilidad Bruta</h3><p>${formatMoneda(
      kpi.utilidad
    )}</p>`;
  if (m)
    m.innerHTML = `<h3>Margen Bruto</h3><p>${formatPorcentaje(
      kpi.margen
    )}</p>`;
  if (c)
    c.innerHTML = `<h3>% Ventas a Crédito</h3><p>${formatPorcentaje(
      kpi.pctCredito
    )}</p>`;
  if (n)
    n.innerHTML = `<h3>% Ventas con Utilidad Negativa</h3><p>${formatPorcentaje(
      kpi.pctNegativas
    )}</p>`;
}

function renderTablaSucursales(rows) {
  const cont = document.getElementById("tablaSucursales");
  if (!cont) return;
  if (!rows.length) {
    cont.innerHTML = "<p>Sin datos para los filtros seleccionados.</p>";
    return;
  }
  const suc = agruparPorSucursal(rows);
  let html = `
    <table class="tabla-sucursales">
      <thead>
        <tr>
          <th>Sucursal</th>
          <th>Ventas (Subtotal)</th>
          <th>Utilidad</th>
          <th>Margen Bruto %</th>
          <th>% Ventas con Utilidad Negativa</th>
        </tr>
      </thead>
      <tbody>`;
  suc.forEach((s) => {
    html += `
      <tr>
        <td>${s.almacen}</td>
        <td>${formatMoneda(s.ventas)}</td>
        <td>${formatMoneda(s.utilidad)}</td>
        <td>${formatPorcentaje(s.margen)}</td>
        <td>${formatPorcentaje(s.pctNeg)}</td>
      </tr>`;
  });
  html += "</tbody></table>";
  cont.innerHTML = html;
}

/* ====== Gráficos resumen (orden descendente) ====== */

function destruirChart(ch) {
  if (ch && typeof ch.destroy === "function") ch.destroy();
}

function renderGraficoCategorias(rows) {
  const ctx = document.getElementById("graficoCategorias");
  if (!ctx) return;

  const mapa = {};
  rows.forEach((r) => {
    const cat = r.categoria || "SIN CATEGORIA";
    mapa[cat] = (mapa[cat] || 0) + (r.subt_fac_num || 0);
  });

  const arr = Object.entries(mapa)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total);

  destruirChart(charts.categorias);
  charts.categorias = new Chart(ctx, {
    type: "bar",
    data: {
      labels: arr.map((x) => x.cat),
      datasets: [
        { label: "Ventas por categoría", data: arr.map((x) => x.total) },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => " " + formatMoneda(c.parsed.y || 0),
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => formatMoneda(val),
          },
        },
      },
    },
  });
}

function renderGraficoSucursales(rows) {
  const ctx = document.getElementById("graficoSucursales");
  if (!ctx) return;

  const suc = agruparPorSucursal(rows);
  destruirChart(charts.sucursales);
  charts.sucursales = new Chart(ctx, {
    type: "bar",
    data: {
      labels: suc.map((s) => s.almacen),
      datasets: [
        { label: "Ventas por sucursal", data: suc.map((s) => s.ventas) },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => " " + formatMoneda(c.parsed.y || 0),
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => formatMoneda(val),
          },
        },
      },
    },
  });
}

function renderGraficoDiaSemana(rows) {
  const ctx = document.getElementById("graficoDiaSemana");
  if (!ctx) return;

  const mapa = {};
  rows.forEach((r) => {
    const d =
      (r.diaSemana || "").toLowerCase().slice(0, 3) || "n/a";
    mapa[d] = (mapa[d] || 0) + (r.subt_fac_num || 0);
  });

  const arr = Object.entries(mapa)
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => b.total - a.total);

  destruirChart(charts.diaSemana);
  charts.diaSemana = new Chart(ctx, {
    type: "bar",
    data: {
      labels: arr.map((x) => x.dia),
      datasets: [
        { label: "Ventas por día", data: arr.map((x) => x.total) },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => " " + formatMoneda(c.parsed.y || 0),
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => formatMoneda(val),
          },
        },
      },
    },
  });
}

/* ================== Comparativo YoY =================== */

function buildDeltaHtml(prev, act) {
  if (!isFinite(prev) || prev === 0)
    return `<span class="delta delta-flat">⏺ n/d</span>`;
  const d = (act - prev) / prev;
  let cls = "delta-flat",
    icon = "⏺";
  if (d > 0.001) {
    cls = "delta-up";
    icon = "▲";
  } else if (d < -0.001) {
    cls = "delta-down";
    icon = "▼";
  }
  return `<span class="delta ${cls}">${icon} ${(d * 100).toFixed(
    1
  )}%</span>`;
}

/**
 * COMPARATIVO:
 * - Tabla global 2024 vs 2025 (doble clic en métricas)
 * - Gráfico sucursales
 * - Gráfico categorías: top crecimiento y top caída, con delta margen
 */
function renderComparativo() {
  const cont = document.getElementById("tablaComparativoGlobal");
  const ctxSuc = document.getElementById("graficoComparativoSucursales");
  const ctxCat = document.getElementById("graficoComparativoCategorias");
  if (!cont || !ctxSuc || !ctxCat) return;

  // Usamos los filtros de arriba, pero SIN filtro de año
  const base = getDatosFiltradosSinAnio();
  if (!base.length) {
    cont.innerHTML = "<p>Sin datos para comparar 2024 vs 2025.</p>";
    destruirChart(charts.compSucursales);
    destruirChart(charts.compCategorias);
    return;
  }

  const r24 = base.filter((r) => r.year === 2024);
  const r25 = base.filter((r) => r.year === 2025);

  const k24 = calcularKpis(r24);
  const k25 = calcularKpis(r25);

  // ====== TABLA COMPARATIVA GLOBAL (doble clic en métricas) ======
  cont.innerHTML = `
    <table class="tabla-comparativo">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>2024</th>
          <th>2025</th>
          <th>Crecimiento %</th>
        </tr>
      </thead>
      <tbody>
        <tr data-metric="ventas">
          <td>Ventas (Subtotal)</td>
          <td>${formatMoneda(k24.ventas)}</td>
          <td>${formatMoneda(k25.ventas)}</td>
          <td>${buildDeltaHtml(k24.ventas, k25.ventas)}</td>
        </tr>
        <tr data-metric="utilidad">
          <td>Utilidad Bruta</td>
          <td>${formatMoneda(k24.utilidad)}</td>
          <td>${formatMoneda(k25.utilidad)}</td>
          <td>${buildDeltaHtml(k24.utilidad, k25.utilidad)}</td>
        </tr>
        <tr data-metric="margen">
          <td>Margen Bruto %</td>
          <td>${formatPorcentaje(k24.margen)}</td>
          <td>${formatPorcentaje(k25.margen)}</td>
          <td>${buildDeltaHtml(k24.margen, k25.margen)}</td>
        </tr>
        <tr data-metric="credito">
          <td>% Ventas a Crédito</td>
          <td>${formatPorcentaje(k24.pctCredito)}</td>
          <td>${formatPorcentaje(k25.pctCredito)}</td>
          <td>${buildDeltaHtml(k24.pctCredito, k25.pctCredito)}</td>
        </tr>
        <tr data-metric="negativas">
          <td>% Ventas con Utilidad Negativa</td>
          <td>${formatPorcentaje(k24.pctNegativas)}</td>
          <td>${formatPorcentaje(k25.pctNegativas)}</td>
          <td>${buildDeltaHtml(k24.pctNegativas, k25.pctNegativas)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ====== GRÁFICO SUCURSALES ======
  const mapaSuc = {};
  base.forEach((r) => {
    const a = r.almacen || "SIN_ALMACEN";
    if (!mapaSuc[a]) mapaSuc[a] = { v24: 0, v25: 0 };
    if (r.year === 2024) mapaSuc[a].v24 += r.subt_fac_num || 0;
    if (r.year === 2025) mapaSuc[a].v25 += r.subt_fac_num || 0;
  });

  const arrSuc = Object.entries(mapaSuc)
    .map(([alm, vals]) => ({ alm, ...vals }))
    .sort((a, b) => b.v25 - a.v25);

  destruirChart(charts.compSucursales);
  charts.compSucursales = new Chart(ctxSuc, {
    type: "bar",
    data: {
      labels: arrSuc.map((x) => x.alm),
      datasets: [
        { label: "2024", data: arrSuc.map((x) => x.v24) },
        { label: "2025", data: arrSuc.map((x) => x.v25) },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (c) =>
              `${c.dataset.label}: ${formatMoneda(c.parsed.y || 0)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => formatMoneda(v),
          },
        },
      },
    },
  });

  // ====== GRÁFICO CATEGORÍAS: MAYOR Y MENOR CRECIMIENTO + DELTA MARGEN ======
  const mapaCat = {};
  base.forEach((r) => {
    const c = r.categoria || "SIN CATEGORIA";
    if (!mapaCat[c]) {
      mapaCat[c] = {
        cat: c,
        v24: 0,
        v25: 0,
        subt24: 0,
        subt25: 0,
        util24: 0,
        util25: 0,
      };
    }
    if (r.year === 2024) {
      mapaCat[c].v24 += r.subt_fac_num || 0;
      mapaCat[c].subt24 += r.subt_fac_num || 0;
      mapaCat[c].util24 += r.utilidad_num || 0;
    } else if (r.year === 2025) {
      mapaCat[c].v25 += r.subt_fac_num || 0;
      mapaCat[c].subt25 += r.subt_fac_num || 0;
      mapaCat[c].util25 += r.utilidad_num || 0;
    }
  });

  let arrCat = Object.values(mapaCat).map((g) => {
    const margen24 = g.subt24 > 0 ? g.util24 / g.subt24 : 0;
    const margen25 = g.subt25 > 0 ? g.util25 / g.subt25 : 0;
    let deltaVentas = null;
    if (g.v24 > 0) {
      deltaVentas = (g.v25 - g.v24) / g.v24;
    }
    const deltaMargen = margen25 - margen24;
    return {
      ...g,
      margen24,
      margen25,
      deltaVentas,
      deltaMargen,
    };
  });

  const valid = arrCat.filter(
    (c) => c.deltaVentas !== null && (c.v24 > 0 || c.v25 > 0)
  );

  if (!valid.length) {
    destruirChart(charts.compCategorias);
    return;
  }

  const N = 5; // top 5 ↑ y top 5 ↓

  const topUp = [...valid]
    .sort((a, b) => b.deltaVentas - a.deltaVentas)
    .slice(0, N);

  const topDown = [...valid]
    .sort((a, b) => a.deltaVentas - b.deltaVentas)
    .slice(0, N);

  const seleccion = [];
  const vistos = new Set();
  [...topUp, ...topDown].forEach((c) => {
    if (!vistos.has(c.cat)) {
      vistos.add(c.cat);
      seleccion.push(c);
    }
  });

  seleccion.sort((a, b) => b.deltaVentas - a.deltaVentas);

  const labels = seleccion.map((c) => c.cat);
  const data24 = seleccion.map((c) => c.v24);
  const data25 = seleccion.map((c) => c.v25);
  const margen24Arr = seleccion.map((c) => c.margen24);
  const margen25Arr = seleccion.map((c) => c.margen25);
  const deltaMargenArr = seleccion.map((c) => c.deltaMargen);

  destruirChart(charts.compCategorias);
  charts.compCategorias = new Chart(ctxCat, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "2024", data: data24 },
        { label: "2025", data: data25 },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const idx = ctx.dataIndex;
              const is2024 = ctx.dataset.label === "2024";
              const venta = ctx.parsed.y || 0;

              const m24 = margen24Arr[idx] || 0;
              const m25 = margen25Arr[idx] || 0;
              const dM = deltaMargenArr[idx] || 0;

              let icon = "⏺";
              if (dM > 0.0001) icon = "▲";
              else if (dM < -0.0001) icon = "▼";

              const margenTexto = is2024
                ? `Margen 2024: ${(m24 * 100).toFixed(1)}%`
                : `Margen 2025: ${(m25 * 100).toFixed(1)}%`;

              const deltaMargenTexto = `Cambio margen: ${icon} ${(dM * 100).toFixed(1)} pp`;

              return [
                `${ctx.dataset.label}: ${formatMoneda(venta)}`,
                margenTexto,
                deltaMargenTexto,
              ];
            },
          },
        },
        legend: {},
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => formatMoneda(v),
          },
        },
      },
    },
  });
}

/* ====== Ventanas emergentes comparativo ====== */

/**
 * 1er nivel: doble clic en fila de tabla comparativo
 * Abre ventana con comparativa Año / Almacén / Categoría
 */
function handleComparativoDblClick(metricKey) {
  if (!metricKey) return;

  const base = getDatosFiltradosSinAnio(); // respeta filtros de arriba, menos año
  if (!base.length) {
    alert("Sin datos para mostrar detalle con los filtros actuales.");
    return;
  }

  let rows = base;
  let titulo = "";

  switch (metricKey) {
    case "ventas":
      titulo = "Detalle por categoría – Ventas (Subtotal)";
      break;
    case "utilidad":
      titulo = "Detalle por categoría – Utilidad Bruta";
      break;
    case "margen":
      titulo = "Detalle por categoría – Margen Bruto";
      break;
    case "credito":
      titulo = "Detalle por categoría – Ventas a Crédito";
      rows = rows.filter((r) => r.tipoFactura === "Crédito");
      break;
    case "negativas":
      titulo = "Detalle por categoría – Ventas con Utilidad Negativa";
      rows = rows.filter((r) => (r.utilidad_num || 0) < 0);
      break;
    default:
      titulo = "Detalle por categoría";
  }

  if (!rows.length) {
    alert("No hay filas para esa métrica con los filtros actuales.");
    return;
  }

  // Solo 2024 y 2025
  rows = rows.filter((r) => r.year === 2024 || r.year === 2025);
  if (!rows.length) {
    alert("No hay datos de 2024 ni 2025 para la métrica y filtros seleccionados.");
    return;
  }

  // Agrupar por (Año, Almacén, Categoría)
  const mapa = {};
  rows.forEach((r) => {
    const year = r.year || "";
    const almacen = r.almacen || "";
    const categoria = r.categoria || "SIN CATEGORIA";

    const costoRenglon = parseNumero(
      r.costo1 || r["costo1"] || r.costo2 || r["costo2"] || 0
    );

    const key = `${year}||${almacen}||${categoria}`;
    if (!mapa[key]) {
      mapa[key] = {
        year,
        almacen,
        categoria,
        costo: 0,
        subtotal: 0,
        utilidad: 0,
      };
    }
    mapa[key].costo += costoRenglon;
    mapa[key].subtotal += r.subt_fac_num || 0;
    mapa[key].utilidad += r.utilidad_num || 0;
  });

  const grupos = Object.values(mapa).map((g) => ({
    ...g,
    margen: g.subtotal > 0 ? g.utilidad / g.subtotal : 0,
  }));

  if (!grupos.length) {
    alert("No hay datos para agrupar por categoría.");
    return;
  }

  const maxRows = 5000;
  const slice = grupos.slice(0, maxRows);

  let filasHTML = "";
  slice.forEach((g) => {
    filasHTML += `
      <tr
        data-year="${g.year}"
        data-almacen="${escapeHtml(g.almacen)}"
        data-categoria="${escapeHtml(g.categoria)}"
      >
        <td>${g.year || ""}</td>
        <td>${escapeHtml(g.almacen || "")}</td>
        <td>${escapeHtml(g.categoria || "")}</td>
        <td class="num" data-num="${g.costo}">${formatMoneda(g.costo)}</td>
        <td class="num" data-num="${g.subtotal}">${formatMoneda(g.subtotal)}</td>
        <td class="num" data-num="${g.margen}">${formatPorcentaje(g.margen)}</td>
        <td class="num" data-num="${g.utilidad}">${formatMoneda(g.utilidad)}</td>
      </tr>`;
  });

  const nota =
    grupos.length > maxRows
      ? `<p style="font-size:11px;color:#9ca3af;">Mostrando ${maxRows} de ${grupos.length} combinaciones Año/Almacén/Categoría.</p>`
      : "";

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana emergente.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(titulo)}</title>
      <style>
        body{
          font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
          background:#020617;color:#e5e7eb;margin:0;padding:12px 16px;
        }
        h1{font-size:18px;margin:0 0 4px 0;}
        p{margin:0 0 8px 0;font-size:12px;color:#9ca3af;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border:1px solid #1f2937;padding:4px 6px;}
        th{background:#020617;text-align:left;vertical-align:top;}
        th.num,td.num{text-align:right;}
        thead{position:sticky;top:0;}
        .filter-input{
          width:100%;
          box-sizing:border-box;
          font-size:11px;
          padding:2px 3px;
          border-radius:4px;
          border:1px solid #1f2937;
          background:#020617;
          color:#e5e7eb;
        }
        .sort-btn{
          border:none;
          background:transparent;
          color:#9ca3af;
          font-size:10px;
          cursor:pointer;
          margin-left:4px;
        }
        .sort-btn.active{color:#e5e7eb;}
        tbody tr:hover{
          background:#111827;
          cursor:pointer;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(titulo)}</h1>
      <p>
        Comparativa año contra año (2024 vs 2025) por Categoría y Almacén,
        respetando filtros superiores (almacén, tipo de factura, categoría y AD).
        Doble clic en una fila para ver el desglose por artículos de esa Categoría.
      </p>
      <table id="catTable">
        <thead>
          <tr>
            <th data-col="0">Año <button class="sort-btn" data-col="0">⇅</button></th>
            <th data-col="1">Almacén <button class="sort-btn" data-col="1">⇅</button></th>
            <th data-col="2">Categoría <button class="sort-btn" data-col="2">⇅</button></th>
            <th data-col="3" class="num">Costo <button class="sort-btn" data-col="3">⇅</button></th>
            <th data-col="4" class="num">Subtotal factura <button class="sort-btn" data-col="4">⇅</button></th>
            <th data-col="5" class="num">Margen <button class="sort-btn" data-col="5">⇅</button></th>
            <th data-col="6" class="num">Utilidad <button class="sort-btn" data-col="6">⇅</button></th>
          </tr>
          <tr>
            <th><input class="filter-input" data-col="0" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="1" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="2" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="3" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="4" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="5" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="6" placeholder="Filtrar..." /></th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
      ${nota}

      <script>
        (function(){
          var table = document.getElementById("catTable");
          var tbody = table.querySelector("tbody");
          var originalRows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
          var numericCols = {3:true,4:true,5:true,6:true};
          var sortCol = null;
          var sortDir = "asc";

          function applyFiltersAndSort() {
            var filters = Array.prototype.slice.call(document.querySelectorAll(".filter-input"));
            var rows = originalRows.slice();

            rows = rows.filter(function(row){
              return filters.every(function(input){
                var val = (input.value || "").trim().toLowerCase();
                if (!val) return true;
                var colIndex = parseInt(input.getAttribute("data-col"),10);
                var cell = row.children[colIndex];
                if (!cell) return true;
                return cell.textContent.toLowerCase().indexOf(val) !== -1;
              });
            });

            if (sortCol !== null) {
              var factor = sortDir === "asc" ? 1 : -1;
              rows.sort(function(a,b){
                var ca = a.children[sortCol];
                var cb = b.children[sortCol];
                if (!ca || !cb) return 0;

                if (numericCols[sortCol]) {
                  var va = parseFloat(ca.getAttribute("data-num") || "0");
                  var vb = parseFloat(cb.getAttribute("data-num") || "0");
                  if (va < vb) return -1 * factor;
                  if (va > vb) return 1 * factor;
                  return 0;
                } else {
                  var va = ca.textContent.toLowerCase();
                  var vb = cb.textContent.toLowerCase();
                  if (va < vb) return -1 * factor;
                  if (va > vb) return 1 * factor;
                  return 0;
                }
              });
            }

            tbody.innerHTML = "";
            rows.forEach(function(r){ tbody.appendChild(r); });
          }

          Array.prototype.slice.call(document.querySelectorAll(".filter-input"))
            .forEach(function(inp){
              inp.addEventListener("input", applyFiltersAndSort);
            });

          Array.prototype.slice.call(document.querySelectorAll(".sort-btn"))
            .forEach(function(btn){
              btn.addEventListener("click", function(){
                var col = parseInt(btn.getAttribute("data-col"),10);
                if (sortCol === col) {
                  sortDir = (sortDir === "asc" ? "desc" : "asc");
                } else {
                  sortCol = col;
                  sortDir = "asc";
                }

                Array.prototype.slice.call(document.querySelectorAll(".sort-btn"))
                  .forEach(function(b){ b.textContent = "⇅"; b.classList.remove("active"); });

                btn.textContent = (sortDir === "asc" ? "▲" : "▼");
                btn.classList.add("active");

                applyFiltersAndSort();
              });
            });

          // Doble clic en una fila → llamar a la función del padre para desglose por artículos
          tbody.addEventListener("dblclick", function(e){
            var tr = e.target.closest("tr");
            if (!tr) return;
            var year = tr.getAttribute("data-year") || "";
            var almacen = tr.getAttribute("data-almacen") || "";
            var categoria = tr.getAttribute("data-categoria") || "";
            if (window.opener && typeof window.opener.handleCategoriaDrill === "function") {
              window.opener.handleCategoriaDrill(year, almacen, categoria, "${metricKey}");
            }
          });

          applyFiltersAndSort();
        })();
      </script>
    </body>
    </html>
  `);

  win.document.close();
}

/**
 * 2do nivel: llamado desde la ventana de categorías (desglose por artículos)
 */
window.handleCategoriaDrill = function (year, almacen, categoria, metricKey) {
  const base = getDatosFiltradosSinAnio();
  if (!base.length) {
    alert("Sin datos para mostrar detalle con los filtros actuales.");
    return;
  }

  let rows = base;

  switch (metricKey) {
    case "credito":
      rows = rows.filter((r) => r.tipoFactura === "Crédito");
      break;
    case "negativas":
      rows = rows.filter((r) => (r.utilidad_num || 0) < 0);
      break;
    case "ventas":
    case "utilidad":
    case "margen":
    default:
      break;
  }

  rows = rows.filter((r) => {
    const y = r.year != null ? String(r.year) : "";
    const a = r.almacen || "";
    const c = r.categoria || "SIN CATEGORIA";
    return (
      y === String(year) &&
      a === almacen &&
      c === categoria
    );
  });

  if (!rows.length) {
    alert("No hay artículos para esa categoría con los filtros actuales.");
    return;
  }

  const maxRows = 4000;
  const slice = rows.slice(0, maxRows);

  let filasHTML = "";
  slice.forEach((r) => {
    const articulo =
      r.producto || r["producto"] || r.clave || r["clave"] || "N/D";

    const costoNum = parseNumero(
      r.costo1 || r["costo1"] || r.costo2 || r["costo2"] || 0
    );
    const subtNum = r.subt_fac_num || 0;
    const utilNum = r.utilidad_num || 0;
    const margenNum = r.margen_calc || 0;

    filasHTML += `
      <tr>
        <td>${r.year || ""}</td>
        <td>${escapeHtml(r.almacen || "")}</td>
        <td>${escapeHtml(r.categoria || "")}</td>
        <td>${escapeHtml(articulo)}</td>
        <td class="num" data-num="${costoNum}">${formatMoneda(costoNum)}</td>
        <td class="num" data-num="${subtNum}">${formatMoneda(subtNum)}</td>
        <td class="num" data-num="${margenNum}">${formatPorcentaje(margenNum)}</td>
        <td class="num" data-num="${utilNum}">${formatMoneda(utilNum)}</td>
      </tr>`;
  });

  const nota =
    rows.length > maxRows
      ? `<p style="font-size:11px;color:#9ca3af;">Mostrando ${maxRows} de ${rows.length} renglones.</p>`
      : "";

  const titulo = `Detalle por artículos – ${year} / ${almacen} / ${categoria}`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana emergente.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(titulo)}</title>
      <style>
        body{
          font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
          background:#020617;color:#e5e7eb;margin:0;padding:12px 16px;
        }
        h1{font-size:18px;margin:0 0 4px 0;}
        p{margin:0 0 8px 0;font-size:12px;color:#9ca3af;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border:1px solid #1f2937;padding:4px 6px;}
        th{background:#020617;text-align:left;vertical-align:top;}
        th.num,td.num{text-align:right;}
        thead{position:sticky;top:0;}
        .filter-input{
          width:100%;
          box-sizing:border-box;
          font-size:11px;
          padding:2px 3px;
          border-radius:4px;
          border:1px solid #1f2937;
          background:#020617;
          color:#e5e7eb;
        }
        .sort-btn{
          border:none;
          background:transparent;
          color:#9ca3af;
          font-size:10px;
          cursor:pointer;
          margin-left:4px;
        }
        .sort-btn.active{color:#e5e7eb;}
      </style>
    </head>
    <body>
      <h1>${escapeHtml(titulo)}</h1>
      <p>
        Detalle por artículos respetando los filtros superiores.
        Puedes filtrar y ordenar cada columna como en Excel.
      </p>
      <table id="detalleArtTable">
        <thead>
          <tr>
            <th data-col="0">Año <button class="sort-btn" data-col="0">⇅</button></th>
            <th data-col="1">Almacén <button class="sort-btn" data-col="1">⇅</button></th>
            <th data-col="2">Categoría <button class="sort-btn" data-col="2">⇅</button></th>
            <th data-col="3">Artículo <button class="sort-btn" data-col="3">⇅</button></th>
            <th data-col="4" class="num">Costo <button class="sort-btn" data-col="4">⇅</button></th>
            <th data-col="5" class="num">Subtotal factura <button class="sort-btn" data-col="5">⇅</button></th>
            <th data-col="6" class="num">Margen <button class="sort-btn" data-col="6">⇅</button></th>
            <th data-col="7" class="num">Utilidad <button class="sort-btn" data-col="7">⇅</button></th>
          </tr>
          <tr>
            <th><input class="filter-input" data-col="0" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="1" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="2" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="3" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="4" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="5" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="6" placeholder="Filtrar..." /></th>
            <th><input class="filter-input" data-col="7" placeholder="Filtrar..." /></th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
      ${nota}

      <script>
        (function(){
          var table = document.getElementById("detalleArtTable");
          var tbody = table.querySelector("tbody");
          var originalRows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
          var numericCols = {4:true,5:true,6:true,7:true};
          var sortCol = null;
          var sortDir = "asc";

          function applyFiltersAndSort() {
            var filters = Array.prototype.slice.call(document.querySelectorAll(".filter-input"));
            var rows = originalRows.slice();

            rows = rows.filter(function(row){
              return filters.every(function(input){
                var val = (input.value || "").trim().toLowerCase();
                if (!val) return true;
                var colIndex = parseInt(input.getAttribute("data-col"),10);
                var cell = row.children[colIndex];
                if (!cell) return true;
                return cell.textContent.toLowerCase().indexOf(val) !== -1;
              });
            });

            if (sortCol !== null) {
              var factor = sortDir === "asc" ? 1 : -1;
              rows.sort(function(a,b){
                var ca = a.children[sortCol];
                var cb = b.children[sortCol];
                if (!ca || !cb) return 0;

                if (numericCols[sortCol]) {
                  var va = parseFloat(ca.getAttribute("data-num") || "0");
                  var vb = parseFloat(cb.getAttribute("data-num") || "0");
                  if (va < vb) return -1 * factor;
                  if (va > vb) return 1 * factor;
                  return 0;
                } else {
                  var va = ca.textContent.toLowerCase();
                  var vb = cb.textContent.toLowerCase();
                  if (va < vb) return -1 * factor;
                  if (va > vb) return 1 * factor;
                  return 0;
                }
              });
            }

            tbody.innerHTML = "";
            rows.forEach(function(r){ tbody.appendChild(r); });
          }

          Array.prototype.slice.call(document.querySelectorAll(".filter-input"))
            .forEach(function(inp){
              inp.addEventListener("input", applyFiltersAndSort);
            });

          Array.prototype.slice.call(document.querySelectorAll(".sort-btn"))
            .forEach(function(btn){
              btn.addEventListener("click", function(){
                var col = parseInt(btn.getAttribute("data-col"),10);
                if (sortCol === col) {
                  sortDir = (sortDir === "asc" ? "desc" : "asc");
                } else {
                  sortCol = col;
                  sortDir = "asc";
                }

                Array.prototype.slice.call(document.querySelectorAll(".sort-btn"))
                  .forEach(function(b){ b.textContent = "⇅"; b.classList.remove("active"); });

                btn.textContent = (sortDir === "asc" ? "▲" : "▼");
                btn.classList.add("active");

                applyFiltersAndSort();
              });
            });

          applyFiltersAndSort();
        })();
      </script>
    </body>
    </html>
  `);

  win.document.close();
};

/* ================== Detalle (7 columnas + paleta drag & drop) =================== */

function getColValue(row, colKey) {
  const col = getColByKey(colKey);
  if (!col || !col.value) return null;
  try {
    return col.value(row);
  } catch {
    return null;
  }
}
function getColDisplay(row, colKey) {
  const col = getColByKey(colKey);
  if (!col) return "";
  if (col.display) {
    try {
      return col.display(row);
    } catch {
      return "";
    }
  }
  const v = getColValue(row, colKey);
  return v == null ? "" : String(v);
}
function getColFilterValue(row, colKey) {
  return String(getColDisplay(row, colKey)).toLowerCase();
}

function renderDetalleFieldPalette() {
  const cont = document.getElementById("detalle-field-palette");
  if (!cont) return;

  let html = "";
  ALL_DETALLE_COLS.forEach((col) => {
    const assigned = detalleSlotKeys.includes(col.key);
    html += `
      <div class="field-chip${assigned ? " assigned" : ""}"
           draggable="true" data-key="${col.key}">
        ${col.label}
      </div>`;
  });
  cont.innerHTML = html;

  cont.querySelectorAll(".field-chip").forEach((chip) => {
    chip.addEventListener("dragstart", (e) => {
      dragFieldKey = chip.dataset.key;
      e.dataTransfer.effectAllowed = "move";
    });
    chip.addEventListener("dragend", () => {
      dragFieldKey = null;
    });
  });
}

function renderDetalle() {
  const cont = document.getElementById("tablaDetalle");
  const search = document.getElementById("searchDetalle");
  const info = document.getElementById("detalleDrillInfo");
  if (!cont || !search) return;

  const base = getDatosFiltrados();
  if (!base.length) {
    cont.innerHTML = "<p>Sin datos para los filtros seleccionados.</p>";
    if (info) info.textContent = "";
    return;
  }

  let rows = base;
  let textoInfo = "";

  if (drillMetric === "negativas") {
    rows = rows.filter((r) => (r.utilidad_num || 0) < 0);
    textoInfo = "Drill-down: solo filas con utilidad negativa.";
  } else if (drillMetric === "credito") {
    rows = rows.filter((r) => r.tipoFactura === "Crédito");
    textoInfo = "Drill-down: solo facturas a Crédito.";
  } else if (drillMetric === "ventas") {
    textoInfo = "Drill-down: detalle de ventas.";
  } else if (drillMetric === "utilidad") {
    textoInfo = "Drill-down: detalle de utilidad.";
  } else if (drillMetric === "margen") {
    textoInfo = "Drill-down: análisis de margen.";
  }
  if (info) info.textContent = textoInfo;

  const texto = search.value.trim().toLowerCase();
  if (texto) {
    rows = rows.filter((r) => {
      const c = (r.cliente || r["cliente"] || "").toLowerCase();
      const p = (r.producto || r["producto"] || "").toLowerCase();
      const f = (r.factura || r["factura"] || "").toLowerCase();
      return (
        c.includes(texto) || p.includes(texto) || f.includes(texto)
      );
    });
  }

  Object.entries(detalleColFilters).forEach(([colKey, val]) => {
    const f = (val || "").trim().toLowerCase();
    if (!f) return;
    rows = rows.filter((r) =>
      getColFilterValue(r, colKey).includes(f)
    );
  });

  if (detalleSortState.col) {
    const { col, dir } = detalleSortState;
    const factor = dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const va = getColValue(a, col);
      const vb = getColValue(b, col);
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * factor;
      if (vb == null) return 1 * factor;
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
  }

  const maxRows = 500;
  const slice = rows.slice(0, maxRows);
  const cols = getActiveDetalleCols();

  if (!slice.length) {
    cont.innerHTML = "<p>Sin filas para mostrar con los filtros actuales.</p>";
    return;
  }

  let html = `
    <table class="tabla-detalle">
      <thead>
        <tr>`;
  cols.forEach((col, idx) => {
    const isActive = detalleSortState.col === col.key;
    const symbol = !isActive
      ? "⇅"
      : detalleSortState.dir === "asc"
      ? "▲"
      : "▼";
    html += `
      <th data-col="${col.key}" data-slot="${idx}">
        ${col.label}
        <button type="button" class="th-sort${
          isActive ? " active" : ""
        }">${symbol}</button>
      </th>`;
  });
  html += `
        </tr>
        <tr>`;
  cols.forEach((col) => {
    const val = detalleColFilters[col.key] || "";
    html += `
      <th>
        <input class="detalle-filter" data-col="${
          col.key
        }" value="${val.replace(/"/g, "&quot;")}" placeholder="Filtrar..." />
      </th>`;
  });
  html += `
        </tr>
      </thead>
      <tbody>`;
  slice.forEach((r) => {
    html += "<tr>";
    cols.forEach((col) => {
      html += `<td>${getColDisplay(r, col.key)}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  if (rows.length > maxRows) {
    html += `<p class="help-text">Mostrando ${maxRows} de ${rows.length} filas.</p>`;
  }

  cont.innerHTML = html;

  cont.querySelectorAll(".th-sort").forEach((btn) => {
    btn.addEventListener("click", () => {
      const th = btn.closest("th");
      const colKey = th.getAttribute("data-col");
      if (!colKey) return;
      if (detalleSortState.col === colKey) {
        detalleSortState.dir =
          detalleSortState.dir === "asc" ? "desc" : "asc";
      } else {
        detalleSortState.col = colKey;
        detalleSortState.dir = "asc";
      }
      renderDetalle();
    });
  });

  cont.querySelectorAll(".detalle-filter").forEach((inp) => {
    inp.addEventListener("input", () => {
      const colKey = inp.getAttribute("data-col");
      detalleColFilters[colKey] = inp.value;
      renderDetalle();
    });
  });

  cont
    .querySelectorAll("thead tr:first-child th")
    .forEach((th) => {
      th.addEventListener("dragover", (e) => {
        e.preventDefault();
        th.classList.add("drop-target");
      });
      th.addEventListener("dragleave", () => {
        th.classList.remove("drop-target");
      });
      th.addEventListener("drop", (e) => {
        e.preventDefault();
        th.classList.remove("drop-target");
        if (!dragFieldKey) return;
        const slot = parseInt(th.getAttribute("data-slot"), 10);
        if (isNaN(slot)) return;

        detalleSlotKeys = detalleSlotKeys.map((k, idx) =>
          idx === slot
            ? dragFieldKey
            : k === dragFieldKey && idx !== slot
            ? null
            : k
        );
        detalleSortState = { col: null, dir: "asc" };
        detalleColFilters = {};
        dragFieldKey = null;
        renderDetalleFieldPalette();
        renderDetalle();
      });
    });
}

/* ================== Render global =================== */

function renderizarDashboard() {
  const rows = getDatosFiltrados();
  if (!rows.length) {
    actualizarKpiCards({
      ventas: 0,
      utilidad: 0,
      margen: 0,
      pctCredito: 0,
      pctNegativas: 0,
    });
    renderTablaSucursales([]);
    renderGraficoCategorias([]);
    renderGraficoSucursales([]);
    renderGraficoDiaSemana([]);
    return;
  }
  const kpi = calcularKpis(rows);
  actualizarKpiCards(kpi);
  renderTablaSucursales(rows);
  renderGraficoCategorias(rows);
  renderGraficoSucursales(rows);
  renderGraficoDiaSemana(rows);
}

/* ================== DOM Ready =================== */

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (res) => {
          dataRaw = res.data || [];
          dataClean = limpiarDatos(dataRaw);
          inicializarFiltros(dataClean);
          renderizarDashboard();
          renderDetalle();
        },
      });
    });
  }

  ["filtroAnio", "filtroAlmacen", "filtroTipoFactura", "filtroCategoria", "chkExcluirAD"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        const activeBtn = document.querySelector(".tab-btn.active");
        const view = activeBtn ? activeBtn.dataset.view : "resumen";
        if (view === "resumen") renderizarDashboard();
        else if (view === "comparativo") renderComparativo();
        else if (view === "detalle") renderDetalle();
      });
    }
  );

  const searchDetalle = document.getElementById("searchDetalle");
  if (searchDetalle) {
    searchDetalle.addEventListener("input", () => {
      renderDetalle();
    });
  }

  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view !== "detalle") drillMetric = null;

      tabButtons.forEach((b) => b.classList.remove("active"));
      views.forEach((v) => v.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`view-${view}`).classList.add("active");

      if (view === "resumen") renderizarDashboard();
      else if (view === "comparativo") renderComparativo();
      else if (view === "detalle") {
        renderDetalleFieldPalette();
        renderDetalle();
      }
    });
  });

  const contComp = document.getElementById("tablaComparativoGlobal");
  if (contComp) {
    contComp.addEventListener("dblclick", (e) => {
      const tr = e.target.closest("tr[data-metric]");
      if (!tr) return;
      const metric = tr.dataset.metric;
      handleComparativoDblClick(metric);
    });
  }

  document.addEventListener("click", (e) => {
    document.querySelectorAll(".chip-select-dropdown").forEach((dd) => {
      if (!dd.parentNode.contains(e.target)) dd.classList.remove("open");
    });
  });

  renderDetalleFieldPalette();
});
