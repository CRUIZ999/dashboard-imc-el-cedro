// dashboard_imc.js
// Dashboard IMC – Rentabilidad y Calidad de Datos

/* =========================================================
 *  Configuración columnas Detalle (todas las disponibles)
 * ======================================================= */

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
    value: (r) => r["hora"] || "",
    display: (r) => r["hora"] || "",
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
    value: (r) => r["factura"] || "",
    display: (r) => r["factura"] || "",
  },
  {
    key: "cliente",
    label: "Cliente",
    type: "string",
    value: (r) => r["cliente"] || "",
    display: (r) => r["cliente"] || "",
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
    value: (r) => r["producto"] || "",
    display: (r) => r["producto"] || "",
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
    value: (r) => parseNumero(r["costo1"] || r["costo2"] || 0),
    display: (r) => formatMoneda(parseNumero(r["costo1"] || r["costo2"] || 0)),
  },
  {
    key: "descuento",
    label: "Descuento",
    type: "number",
    value: (r) => {
      let d = 0;
      ["descuento", "descuento1", "descuento_1", "descuento2", "descuento_2"].forEach(
        (campo) => {
          if (r.hasOwnProperty(campo)) {
            d += parseNumero(r[campo]);
          }
        }
      );
      return d;
    },
    display: (r) => {
      let d = 0;
      ["descuento", "descuento1", "descuento_1", "descuento2", "descuento_2"].forEach(
        (campo) => {
          if (r.hasOwnProperty(campo)) {
            d += parseNumero(r[campo]);
          }
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
    value: (r) => r["marca"] || "",
    display: (r) => r["marca"] || "",
  },
  {
    key: "vendedor",
    label: "Vendedor",
    type: "string",
    value: (r) => r["vendedor"] || "",
    display: (r) => r["vendedor"] || "",
  },
];

// columnas visibles por defecto en Detalle
let detalleActiveKeys = [
  "fecha",
  "almacen",
  "factura",
  "cliente",
  "categoria",
  "producto",
  "tipoFactura",
  "subt_fac",
  "utilidad",
  "margen",
  "filtro3",
];

// estado para ordenar y filtrar en Detalle
let detalleSortState = { col: null, dir: "asc" }; // 'asc' | 'desc'
let detalleColFilters = {}; // { key: textoFiltro }

function getColByKey(key) {
  return ALL_DETALLE_COLS.find((c) => c.key === key) || null;
}

function getActiveDetalleCols() {
  return detalleActiveKeys
    .map((k) => getColByKey(k))
    .filter((c) => c !== null);
}

/* =========================================================
 *  Variables generales
 * ======================================================= */

let dataRaw = [];
let dataClean = [];
let charts = {
  categorias: null,
  sucursales: null,
  diaSemana: null,
  compSucursales: null,
  compCategorias: null,
};
let drillMetric = null; // métrica seleccionada desde comparativo YoY para drill-down

/* =========================================================
 *  Inicialización
 * ======================================================= */

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
        complete: (results) => {
          dataRaw = results.data || [];
          dataClean = limpiarDatos(dataRaw);
          inicializarFiltros(dataClean);
          renderizarDashboard();
        },
      });
    });
  }

  // Filtros superiores
  const filtroIds = [
    "filtroAnio",
    "filtroAlmacen",
    "filtroTipoFactura",
    "filtroCategoria",
    "chkExcluirAD",
  ];

  filtroIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      const activeViewBtn = document.querySelector(".tab-btn.active");
      const view = activeViewBtn
        ? activeViewBtn.getAttribute("data-view")
        : "resumen";
      if (view === "resumen") {
        renderizarDashboard();
      } else if (view === "comparativo") {
        renderComparativo();
      } else if (view === "detalle") {
        renderDetalle();
      }
    });
  });

  // Buscador general en detalle
  const searchDetalle = document.getElementById("searchDetalle");
  if (searchDetalle) {
    searchDetalle.addEventListener("input", () => {
      renderDetalle();
    });
  }

  // Tabs
  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");

      if (view !== "detalle") {
        drillMetric = null;
      }

      tabButtons.forEach((b) => b.classList.remove("active"));
      views.forEach((v) => v.classList.remove("active"));

      btn.classList.add("active");
      const viewEl = document.getElementById(`view-${view}`);
      if (viewEl) viewEl.classList.add("active");

      if (view === "resumen") {
        renderizarDashboard();
      } else if (view === "comparativo") {
        renderComparativo();
      } else if (view === "detalle") {
        renderDetalle();
      }
    });
  });

  // Doble clic en comparativo -> detalle en nueva ventana
  const contComparativo = document.getElementById("tablaComparativoGlobal");
  if (contComparativo) {
    contComparativo.addEventListener("dblclick", (e) => {
      const tr = e.target.closest("tr[data-metric]");
      if (!tr) return;
      const metricKey = tr.getAttribute("data-metric");
      handleComparativoDblClick(metricKey);
    });
  }

  // Cerrar dropdowns de chips al hacer clic fuera
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".chip-select-dropdown").forEach((dd) => {
      if (!dd.parentNode.contains(e.target)) {
        dd.classList.remove("open");
      }
    });
  });

  // Inicializar panel de columnas de Detalle (aunque aún no haya datos)
  renderDetalleColumnPicker();
});

/* =========================================================
 *  Limpieza y normalización de datos
 * ======================================================= */

function normalizarFiltro3(valor) {
  if (!valor) return "";
  let v = String(valor).trim();
  if (v === "PROMOCIÃ“N") return "PROMOCIÓN";
  if (v === "UNIDAD DE CONVERSIÃ“N") return "UNIDAD DE CONVERSIÓN";
  return v;
}

/**
 * parseFechaCedro
 *  - 2024: dd/mm/yyyy
 *  - 2025: mm/dd/yyyy
 */
function parseFechaCedro(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.split(/[/-]/).map((x) => parseInt(x, 10));
  if (
    partes.length !== 3 ||
    isNaN(partes[0]) ||
    isNaN(partes[1]) ||
    isNaN(partes[2])
  ) {
    return null;
  }
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

function limpiarDatos(rows) {
  return rows
    .map((r) => {
      const filtro3Norm = normalizarFiltro3(
        r["filtro3"] || r["filtro_3"] || r["AD"] || ""
      );
      const fechaObj = parseFechaCedro(r["fecha"]);
      const year = fechaObj ? fechaObj.getFullYear() : null;
      const diaSemana = fechaObj
        ? fechaObj.toLocaleDateString("es-MX", { weekday: "short" })
        : "";

      const subt = parseNumero(r["subt_fac"]);
      const util = parseNumero(r["utilidad"]);

      const tipoFactura = r["Tipo de Factura"] || r["tipo_factura"] || "";
      const almacen = r["almacen"] || "";
      const categoria = r["categoria"] || "";
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

/* =========================================================
 *  Filtros superiores
 * ======================================================= */

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

  const chkExcluirAD = document.getElementById("chkExcluirAD");
  if (chkExcluirAD && chkExcluirAD.checked === false) {
    chkExcluirAD.checked = true;
  }

  // chips
  initChipSingleSelect("filtroAnio", "Todos los años");
  initChipSingleSelect("filtroTipoFactura", "Contado + Crédito");
  initChipSingleSelect("filtroAlmacen", "Todos los almacenes");
  initChipSingleSelect("filtroCategoria", "Todas las categorías");
}

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
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
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

/* ---------- Chips helpers ---------- */

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

    if (opt.selected) {
      optDiv.classList.add("selected");
    }

    optDiv.addEventListener("click", () => {
      Array.from(select.options).forEach((o) => (o.selected = false));
      opt.selected = true;

      dropdown.querySelectorAll(".chip-option").forEach((d) =>
        d.classList.remove("selected")
      );
      optDiv.classList.add("selected");

      syncSingleLabel();
      dropdown.classList.remove("open");
      select.dispatchEvent(new Event("change"));
    });

    dropdown.appendChild(optDiv);
  });

  function syncSingleLabel() {
    const labelSpan = display.querySelector(".chip-label");
    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt) {
      labelSpan.textContent = selectedOpt.textContent;
    } else {
      labelSpan.textContent = placeholderText || "Seleccionar";
    }
  }

  syncSingleLabel();

  display.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  select.dataset.chipified = "1";
}

/* =========================================================
 *  Helpers filtros generales
 * ======================================================= */

function getValoresMultiples(idSelect) {
  const el = document.getElementById(idSelect);
  if (!el) return [];

  // select simple con opción "todos"
  const v = el.value;
  if (!v || v === "todos") return [];
  return [v];
}

function getDatosFiltrados() {
  if (!Array.isArray(dataClean) || dataClean.length === 0) return [];

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
    if (almacenesSel.length > 0 && !almacenesSel.includes(r.almacen)) return false;
    if (categoriasSel.length > 0 && !categoriasSel.includes(r.categoria)) return false;
    return true;
  });
}

// para comparativo / detalle emergente (sin filtro de año)
function getDatosFiltradosSinAnio() {
  if (!Array.isArray(dataClean) || dataClean.length === 0) return [];

  const selTipo = document.getElementById("filtroTipoFactura");
  const chkAD = document.getElementById("chkExcluirAD");

  const tipo = selTipo ? selTipo.value : "todos";
  const excluirAD = chkAD ? chkAD.checked : false;

  const almacenesSel = getValoresMultiples("filtroAlmacen");
  const categoriasSel = getValoresMultiples("filtroCategoria");

  return dataClean.filter((r) => {
    if (excluirAD && r.esAdEspecial) return false;
    if (tipo !== "todos" && r.tipoFactura !== tipo) return false;
    if (almacenesSel.length > 0 && !almacenesSel.includes(r.almacen)) return false;
    if (categoriasSel.length > 0 && !categoriasSel.includes(r.categoria)) return false;
    return true;
  });
}

/* =========================================================
 *  KPIs y agrupación
 * ======================================================= */

function calcularKpis(rows) {
  let ventas = 0;
  let utilidad = 0;
  let ventasCredito = 0;
  let ventasNegativas = 0;

  rows.forEach((r) => {
    const v = r.subt_fac_num || 0;
    const u = r.utilidad_num || 0;
    ventas += v;
    utilidad += u;
    if (r.tipoFactura === "Crédito") ventasCredito += v;
    if (u < 0) ventasNegativas += v;
  });

  const margen = ventas > 0 ? utilidad / ventas : 0;
  const pctCredito = ventas > 0 ? ventasCredito / ventas : 0;
  const pctNegativas = ventas > 0 ? ventasNegativas / ventas : 0;

  return { ventas, utilidad, margen, pctCredito, pctNegativas };
}

function agruparPorSucursal(rows) {
  const mapa = {};
  rows.forEach((r) => {
    const alm = r.almacen || "SIN_ALMACEN";
    if (!mapa[alm]) {
      mapa[alm] = {
        almacen: alm,
        ventas: 0,
        utilidad: 0,
        ventasNegativas: 0,
      };
    }
    mapa[alm].ventas += r.subt_fac_num || 0;
    mapa[alm].utilidad += r.utilidad_num || 0;
    if (r.utilidad_num < 0) {
      mapa[alm].ventasNegativas += r.subt_fac_num || 0;
    }
  });

  const lista = Object.values(mapa);
  lista.forEach((s) => {
    s.margen = s.ventas > 0 ? s.utilidad / s.ventas : 0;
    s.pctNegativas = s.ventas > 0 ? s.ventasNegativas / s.ventas : 0;
  });

  lista.sort((a, b) => b.ventas - a.ventas);
  return lista;
}

function formatMoneda(valor) {
  if (!isFinite(valor)) return "$0";
  return "$" + valor.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function formatPorcentaje(valor) {
  if (!isFinite(valor)) return "0%";
  return (valor * 100).toFixed(1) + "%";
}

/* =========================================================
 *  Vista Resumen
 * ======================================================= */

function actualizarKpiCards(kpi) {
  const kpiVentas = document.getElementById("kpiVentas");
  const kpiUtilidad = document.getElementById("kpiUtilidad");
  const kpiMargen = document.getElementById("kpiMargen");
  const kpiCredito = document.getElementById("kpiCredito");
  const kpiNegativas = document.getElementById("kpiNegativas");

  if (kpiVentas) {
    kpiVentas.innerHTML = `
      <h3>Ventas IMC</h3>
      <p>${formatMoneda(kpi.ventas)}</p>
    `;
  }

  if (kpiUtilidad) {
    kpiUtilidad.innerHTML = `
      <h3>Utilidad Bruta</h3>
      <p>${formatMoneda(kpi.utilidad)}</p>
    `;
  }

  if (kpiMargen) {
    kpiMargen.innerHTML = `
      <h3>Margen Bruto</h3>
      <p>${formatPorcentaje(kpi.margen)}</p>
    `;
  }

  if (kpiCredito) {
    kpiCredito.innerHTML = `
      <h3>% Ventas a Crédito</h3>
      <p>${formatPorcentaje(kpi.pctCredito)}</p>
    `;
  }

  if (kpiNegativas) {
    kpiNegativas.innerHTML = `
      <h3>% Ventas con Utilidad Negativa</h3>
      <p>${formatPorcentaje(kpi.pctNegativas)}</p>
    `;
  }
}

function renderTablaSucursales(rows) {
  const contenedor = document.getElementById("tablaSucursales");
  if (!contenedor) return;
  if (!rows || rows.length === 0) {
    contenedor.innerHTML = "<p>Sin datos para los filtros seleccionados.</p>";
    return;
  }

  const sucursales = agruparPorSucursal(rows);

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
      <tbody>
  `;

  sucursales.forEach((s) => {
    html += `
      <tr>
        <td>${s.almacen}</td>
        <td>${formatMoneda(s.ventas)}</td>
        <td>${formatMoneda(s.utilidad)}</td>
        <td>${formatPorcentaje(s.margen)}</td>
        <td>${formatPorcentaje(s.pctNegativas)}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  contenedor.innerHTML = html;
}

/* =========================================================
 *  Gráficos Resumen (orden descendente)
 * ======================================================= */

function destruirChart(chartRef) {
  if (chartRef && typeof chartRef.destroy === "function") {
    chartRef.destroy();
  }
}

// Categorías descendente por ventas
function renderGraficoCategorias(rows) {
  const ctx = document.getElementById("graficoCategorias");
  if (!ctx) return;

  const mapa = {};
  rows.forEach((r) => {
    const cat = r.categoria || "SIN CATEGORIA";
    if (!mapa[cat]) mapa[cat] = 0;
    mapa[cat] += r.subt_fac_num || 0;
  });

  let entries = Object.entries(mapa).map(([cat, total]) => ({
    cat,
    total,
  }));
  entries.sort((a, b) => b.total - a.total);

  const labels = entries.map((e) => e.cat);
  const valores = entries.map((e) => e.total);

  destruirChart(charts.categorias);

  charts.categorias = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ventas por categoría",
          data: valores,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const v = context.parsed.y || 0;
              return " " + formatMoneda(v);
            },
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

// Sucursales ya vienen ordenadas por ventas desc
function renderGraficoSucursales(rows) {
  const ctx = document.getElementById("graficoSucursales");
  if (!ctx) return;

  const sucursales = agruparPorSucursal(rows);
  const labels = sucursales.map((s) => s.almacen);
  const valores = sucursales.map((s) => s.ventas);

  destruirChart(charts.sucursales);

  charts.sucursales = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ventas por sucursal",
          data: valores,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => " " + formatMoneda(context.parsed.y || 0),
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

// Días de semana descendente por ventas
function renderGraficoDiaSemana(rows) {
  const ctx = document.getElementById("graficoDiaSemana");
  if (!ctx) return;

  const mapa = {};
  rows.forEach((r) => {
    const d = (r.diaSemana || "").toLowerCase().slice(0, 3) || "n/a";
    if (!mapa[d]) mapa[d] = 0;
    mapa[d] += r.subt_fac_num || 0;
  });

  let entries = Object.entries(mapa).map(([dia, total]) => ({
    dia,
    total,
  }));
  entries.sort((a, b) => b.total - a.total);

  const labels = entries.map((e) => e.dia);
  const valores = entries.map((e) => e.total);

  destruirChart(charts.diaSemana);

  charts.diaSemana = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ventas por día de la semana",
          data: valores,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => " " + formatMoneda(context.parsed.y || 0),
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

/* =========================================================
 *  Comparativo YoY + ventana emergente detalle métrica
 * ======================================================= */

function buildDeltaHtml(valorAnterior, valorActual) {
  if (!isFinite(valorAnterior) || valorAnterior === 0) {
    return `<span class="delta delta-flat">⏺ n/d</span>`;
  }
  const deltaPct = (valorActual - valorAnterior) / valorAnterior;
  let clase = "delta-flat";
  let icono = "⏺";
  if (deltaPct > 0.001) {
    clase = "delta-up";
    icono = "▲";
  } else if (deltaPct < -0.001) {
    clase = "delta-down";
    icono = "▼";
  }
  return `<span class="delta ${clase}">${icono} ${(deltaPct * 100).toFixed(
    1
  )}%</span>`;
}

function renderComparativo() {
  const contTabla = document.getElementById("tablaComparativoGlobal");
  const ctxSuc = document.getElementById("graficoComparativoSucursales");
  const ctxCat = document.getElementById("graficoComparativoCategorias");

  if (!contTabla || !ctxSuc || !ctxCat) return;

  const base = getDatosFiltradosSinAnio();
  if (!base.length) {
    contTabla.innerHTML =
      "<p>Sin datos para comparar 2024 vs 2025 con los filtros seleccionados.</p>";
    destruirChart(charts.compSucursales);
    destruirChart(charts.compCategorias);
    return;
  }

  const rows2024 = base.filter((r) => r.year === 2024);
  const rows2025 = base.filter((r) => r.year === 2025);

  const k24 = calcularKpis(rows2024);
  const k25 = calcularKpis(rows2025);

  let html = `
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
  contTabla.innerHTML = html;

  // Gráfico comparativo por sucursal ordenado por ventas 2025 desc
  const mapaSuc = {};
  base.forEach((r) => {
    const alm = r.almacen || "SIN_ALMACEN";
    if (!mapaSuc[alm]) mapaSuc[alm] = { v24: 0, v25: 0 };
    if (r.year === 2024) mapaSuc[alm].v24 += r.subt_fac_num || 0;
    if (r.year === 2025) mapaSuc[alm].v25 += r.subt_fac_num || 0;
  });

  let arrSuc = Object.entries(mapaSuc).map(([alm, vals]) => ({
    alm,
    ...vals,
  }));
  arrSuc.sort((a, b) => b.v25 - a.v25);

  const labelsSuc = arrSuc.map((x) => x.alm);
  const data24Suc = arrSuc.map((x) => x.v24);
  const data25Suc = arrSuc.map((x) => x.v25);

  destruirChart(charts.compSucursales);
  charts.compSucursales = new Chart(ctxSuc, {
    type: "bar",
    data: {
      labels: labelsSuc,
      datasets: [
        { label: "2024", data: data24Suc },
        { label: "2025", data: data25Suc },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoneda(ctx.parsed.y)}`,
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

  // Gráfico comparativo por categoría (top 10 por 2025)
  const mapaCat = {};
  base.forEach((r) => {
    const cat = r.categoria || "SIN CATEGORIA";
    if (!mapaCat[cat]) mapaCat[cat] = { v24: 0, v25: 0 };
    if (r.year === 2024) mapaCat[cat].v24 += r.subt_fac_num || 0;
    if (r.year === 2025) mapaCat[cat].v25 += r.subt_fac_num || 0;
  });

  let arrCat = Object.entries(mapaCat).map(([cat, vals]) => ({
    cat,
    ...vals,
  }));

  arrCat.sort((a, b) => b.v25 - a.v25);
  arrCat = arrCat.slice(0, 10);

  const labelsCat = arrCat.map((x) => x.cat);
  const data24Cat = arrCat.map((x) => x.v24);
  const data25Cat = arrCat.map((x) => x.v25);

  destruirChart(charts.compCategorias);
  charts.compCategorias = new Chart(ctxCat, {
    type: "bar",
    data: {
      labels: labelsCat,
      datasets: [
        { label: "2024", data: data24Cat },
        { label: "2025", data: data25Cat },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatMoneda(ctx.parsed.y)}`,
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

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ventana nueva con detalle por métrica
function handleComparativoDblClick(metricKey) {
  if (!metricKey) return;

  const base = getDatosFiltradosSinAnio();
  if (!base.length) {
    alert("Sin datos para mostrar detalle con los filtros actuales.");
    return;
  }

  let rows = base;
  let titulo = "";

  switch (metricKey) {
    case "ventas":
      titulo = "Detalle – Ventas (Subtotal)";
      break;
    case "utilidad":
      titulo = "Detalle – Utilidad Bruta";
      break;
    case "margen":
      titulo = "Detalle – Margen Bruto";
      break;
    case "credito":
      titulo = "Detalle – Ventas a Crédito";
      rows = rows.filter((r) => r.tipoFactura === "Crédito");
      break;
    case "negativas":
      titulo = "Detalle – Ventas con Utilidad Negativa";
      rows = rows.filter((r) => (r.utilidad_num || 0) < 0);
      break;
    default:
      titulo = "Detalle de métricas";
  }

  if (!rows.length) {
    alert("No hay filas que cumplan con esta métrica y filtros.");
    return;
  }

  const maxRows = 2000;
  const slice = rows.slice(0, maxRows);

  let filasHTML = "";
  slice.forEach((r) => {
    const year = r.year || "";
    const alm = escapeHtml(r.almacen || "");
    const articulo = escapeHtml(r["producto"] || r["clave"] || "");
    const costoNum = parseNumero(r["costo1"] || r["costo2"] || 0);

    let descNum = 0;
    ["descuento", "descuento1", "descuento_1", "descuento2", "descuento_2"].forEach(
      (campo) => {
        if (r.hasOwnProperty(campo)) {
          descNum += parseNumero(r[campo]);
        }
      }
    );

    const subtotalNum = r.subt_fac_num || 0;
    const utilidadNum = r.utilidad_num || 0;
    const margenVal = r.margen_calc || 0;

    filasHTML += `
      <tr>
        <td>${year}</td>
        <td>${alm}</td>
        <td>${articulo}</td>
        <td style="text-align:right;">${formatMoneda(costoNum)}</td>
        <td style="text-align:right;">${formatMoneda(subtotalNum)}</td>
        <td style="text-align:right;">${formatMoneda(descNum)}</td>
        <td style="text-align:right;">${formatMoneda(utilidadNum)}</td>
        <td style="text-align:right;">${formatPorcentaje(margenVal)}</td>
      </tr>
    `;
  });

  const notaExtra =
    rows.length > maxRows
      ? `<p style="font-size:11px;color:#9ca3af;margin-top:4px;">
           Mostrando ${maxRows} de ${rows.length} filas (se recortó para mejorar rendimiento).
         </p>`
      : "";

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana emergente. Permite pop-ups para ver el detalle.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(titulo)}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #020617;
          color: #e5e7eb;
          margin: 0;
          padding: 12px 16px;
        }
        h1 {
          font-size: 18px;
          margin: 0 0 4px 0;
        }
        p {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #9ca3af;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #1f2937;
          padding: 4px 6px;
        }
        th {
          background: #020617;
          text-align: left;
        }
        th.num, td.num {
          text-align: right;
        }
        thead {
          position: sticky;
          top: 0;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(titulo)}</h1>
      <p>Detalle generado con los filtros actuales del dashboard (sin filtro de año para comparar 2024 vs 2025).</p>
      <table>
        <thead>
          <tr>
            <th>Año</th>
            <th>Almacén</th>
            <th>Artículo</th>
            <th class="num">Costo</th>
            <th class="num">Subtotal factura</th>
            <th class="num">Descuento</th>
            <th class="num">Utilidad</th>
            <th class="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
      ${notaExtra}
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}

/* =========================================================
 *  Vista Detalle con panel de columnas + sort + filtros
 * ======================================================= */

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
  if (v === null || v === undefined) return "";
  return String(v);
}

function getColFilterValue(row, colKey) {
  return String(getColDisplay(row, colKey)).toLowerCase();
}

// panel izquierdo: lista de columnas
function renderDetalleColumnPicker() {
  const cont = document.getElementById("detalle-column-picker");
  if (!cont) return;

  let html = `
    <div class="col-picker-title">Columnas disponibles</div>
    <div class="col-picker-help">
      Marca las columnas que quieres ver en la tabla.<br/>
      Arrastra las activas para cambiar el orden.
    </div>
    <div class="col-picker-list">
  `;

  ALL_DETALLE_COLS.forEach((col) => {
    const active = detalleActiveKeys.includes(col.key);
    html += `
      <div class="col-picker-item${active ? " active" : ""}" draggable="true" data-key="${
        col.key
      }">
        <span class="col-picker-handle">☰</span>
        <span class="col-picker-label">${col.label}</span>
        <input type="checkbox" class="col-picker-check" ${
          active ? "checked" : ""
        } />
      </div>
    `;
  });

  html += "</div>";
  cont.innerHTML = html;

  const items = cont.querySelectorAll(".col-picker-item");
  let dragKey = null;

  items.forEach((item) => {
    const key = item.getAttribute("data-key");
    const chk = item.querySelector(".col-picker-check");

    // activar / desactivar columna
    chk.addEventListener("change", () => {
      const checked = chk.checked;
      if (checked && !detalleActiveKeys.includes(key)) {
        detalleActiveKeys.push(key);
      } else if (!checked && detalleActiveKeys.includes(key)) {
        detalleActiveKeys = detalleActiveKeys.filter((k) => k !== key);
        if (detalleSortState.col === key) {
          detalleSortState.col = null;
        }
        delete detalleColFilters[key];
      }
      renderDetalleColumnPicker();
      renderDetalle();
    });

    // drag & drop solo para columnas activas
    item.addEventListener("dragstart", (e) => {
      dragKey = key;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragend", () => {
      dragKey = null;
      item.classList.remove("dragging");
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      const overKey = key;
      if (!dragKey || dragKey === overKey) return;

      const fromIdx = detalleActiveKeys.indexOf(dragKey);
      const toIdx = detalleActiveKeys.indexOf(overKey);
      if (fromIdx === -1 || toIdx === -1) return; // alguno no activo

      detalleActiveKeys.splice(fromIdx, 1);
      detalleActiveKeys.splice(toIdx, 0, dragKey);

      renderDetalleColumnPicker();
      renderDetalle();
    });
  });
}

function renderDetalle() {
  const cont = document.getElementById("tablaDetalle");
  const search = document.getElementById("searchDetalle");
  const infoDiv = document.getElementById("detalleDrillInfo");
  if (!cont || !search) return;

  const base = getDatosFiltrados();
  if (!base.length) {
    cont.innerHTML = "<p>Sin datos para los filtros seleccionados.</p>";
    if (infoDiv) infoDiv.textContent = "";
    return;
  }

  let rows = base;
  let textoInfo = "";

  if (drillMetric === "negativas") {
    rows = rows.filter((r) => (r.utilidad_num || 0) < 0);
    textoInfo =
      "Drill-down: solo filas con utilidad negativa (según filtros actuales).";
  } else if (drillMetric === "credito") {
    rows = rows.filter((r) => r.tipoFactura === "Crédito");
    textoInfo =
      "Drill-down: solo facturas a Crédito (según filtros actuales).";
  } else if (drillMetric === "ventas") {
    textoInfo = "Drill-down: detalle de ventas (solo filtros globales).";
  } else if (drillMetric === "utilidad") {
    textoInfo = "Drill-down: detalle de utilidad bruta (solo filtros globales).";
  } else if (drillMetric === "margen") {
    textoInfo = "Drill-down: detalle para analizar margen (solo filtros globales).";
  } else {
    textoInfo = "";
  }

  if (infoDiv) infoDiv.textContent = textoInfo;

  const texto = search.value.trim().toLowerCase();
  if (texto) {
    rows = rows.filter((r) => {
      const cliente = (r["cliente"] || "").toString().toLowerCase();
      const producto = (r["producto"] || "").toString().toLowerCase();
      const factura = (r["factura"] || "").toString().toLowerCase();
      return (
        cliente.includes(texto) ||
        producto.includes(texto) ||
        factura.includes(texto)
      );
    });
  }

  // filtros por columna
  Object.entries(detalleColFilters).forEach(([colKey, rawValue]) => {
    const filtro = (rawValue || "").trim().toLowerCase();
    if (!filtro) return;
    rows = rows.filter((r) => {
      const cell = getColFilterValue(r, colKey);
      return cell.includes(filtro);
    });
  });

  // ordenamiento
  if (detalleSortState.col) {
    const { col, dir } = detalleSortState;
    const factor = dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const va = getColValue(a, col);
      const vb = getColValue(b, col);

      if (va === null && vb === null) return 0;
      if (va === null) return -1 * factor;
      if (vb === null) return 1 * factor;

      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
  }

  const maxRows = 500;
  const slice = rows.slice(0, maxRows);
  const cols = getActiveDetalleCols();

  if (!slice.length) {
    cont.innerHTML =
      "<p>Sin filas para mostrar con el drill-down, búsqueda y filtros por columna aplicados.</p>";
    return;
  }

  // construir tabla
  let html = `
    <table class="tabla-detalle">
      <thead>
        <tr>
  `;
  cols.forEach((col) => {
    const isActive = detalleSortState.col === col.key;
    const symbol = !isActive
      ? "⇅"
      : detalleSortState.dir === "asc"
      ? "▲"
      : "▼";
    html += `
      <th data-col="${col.key}">
        ${col.label}
        <button type="button" class="th-sort${isActive ? " active" : ""}">
          ${symbol}
        </button>
      </th>`;
  });
  html += `
        </tr>
        <tr>
  `;
  cols.forEach((col) => {
    const val = detalleColFilters[col.key] || "";
    html += `
      <th>
        <input
          class="detalle-filter"
          data-col="${col.key}"
          value="${val.replace(/"/g, "&quot;")}"
          placeholder="Filtrar..."
        />
      </th>`;
  });
  html += `
        </tr>
      </thead>
      <tbody>
  `;

  slice.forEach((r) => {
    html += "<tr>";
    cols.forEach((col) => {
      const display = getColDisplay(r, col.key);
      html += `<td>${display}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";

  if (rows.length > maxRows) {
    html += `<p class="help-text">Mostrando ${maxRows} de ${rows.length} filas.</p>`;
  }

  cont.innerHTML = html;

  // eventos de sort
  cont.querySelectorAll(".th-sort").forEach((btn) => {
    btn.addEventListener("click", () => {
      const th = btn.closest("th");
      if (!th) return;
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

  // eventos filtros por columna
  cont.querySelectorAll(".detalle-filter").forEach((input) => {
    input.addEventListener("input", () => {
      const colKey = input.getAttribute("data-col");
      detalleColFilters[colKey] = input.value;
      renderDetalle();
    });
  });
}

/* =========================================================
 *  Render global
 * ======================================================= */

function renderizarDashboard() {
  const rowsFiltrados = getDatosFiltrados();
  if (!rowsFiltrados || rowsFiltrados.length === 0) {
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

  const kpi = calcularKpis(rowsFiltrados);
  actualizarKpiCards(kpi);
  renderTablaSucursales(rowsFiltrados);
  renderGraficoCategorias(rowsFiltrados);
  renderGraficoSucursales(rowsFiltrados);
  renderGraficoDiaSemana(rowsFiltrados);
}
