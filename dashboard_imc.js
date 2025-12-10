// dashboard_imc.js
// Dashboard IMC – Rentabilidad y Calidad de Datos

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

  // Filtros
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

  // Buscador detalle
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

      // si salgo de detalle, limpio drill-down
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

  // Delegación de doble clic en tabla comparativo (drill-down)
  const contComparativo = document.getElementById("tablaComparativoGlobal");
  if (contComparativo) {
    contComparativo.addEventListener("dblclick", (e) => {
      const tr = e.target.closest("tr[data-metric]");
      if (!tr) return;
      const metricKey = tr.getAttribute("data-metric");
      handleComparativoDblClick(metricKey);
    });
  }
});

/* ----------------------------------------------------
 * 1. Limpieza y normalización de datos
 * -------------------------------------------------- */

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

/* ----------------------------------------------------
 * 2. Inicializar filtros + chips
 * -------------------------------------------------- */

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
  }

  const chkExcluirAD = document.getElementById("chkExcluirAD");
  if (chkExcluirAD && chkExcluirAD.checked === false) {
    chkExcluirAD.checked = true;
  }

  // Activar chips
  initChipSingleSelect("filtroAnio", "Todos los años");
  initChipSingleSelect("filtroTipoFactura", "Contado + Crédito");
  initChipMultiSelect("filtroAlmacen");
  initChipMultiSelect("filtroCategoria");
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
}

/* ---------- Chips helpers ---------- */

// cerrar dropdowns al hacer clic fuera
document.addEventListener("click", (e) => {
  document.querySelectorAll(".chip-select-dropdown").forEach((dd) => {
    if (!dd.parentNode.contains(e.target)) {
      dd.classList.remove("open");
    }
  });
});

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

function initChipMultiSelect(selectId) {
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

  // opción "Todos"
  const optTodosDiv = document.createElement("div");
  optTodosDiv.className = "chip-option chip-option-todos";
  optTodosDiv.textContent = "Todos";
  optTodosDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    Array.from(select.options).forEach((o) => (o.selected = false));
    dropdown.querySelectorAll(".chip-option").forEach((d) =>
      d.classList.remove("selected")
    );
    syncMultiLabel();
    dropdown.classList.remove("open");
    select.dispatchEvent(new Event("change"));
  });
  dropdown.appendChild(optTodosDiv);

  // opciones reales
  Array.from(select.options).forEach((opt) => {
    const optDiv = document.createElement("div");
    optDiv.className = "chip-option";
    optDiv.textContent = opt.textContent;
    optDiv.dataset.value = opt.value;

    if (opt.selected) optDiv.classList.add("selected");

    optDiv.addEventListener("click", (e) => {
      e.stopPropagation();
      opt.selected = !opt.selected;
      optDiv.classList.toggle("selected", opt.selected);
      syncMultiLabel();
      select.dispatchEvent(new Event("change"));
    });

    dropdown.appendChild(optDiv);
  });

  function syncMultiLabel() {
    const labelSpan = display.querySelector(".chip-label");
    const selectedOpts = Array.from(select.options).filter((o) => o.selected);

    if (selectedOpts.length === 0) {
      labelSpan.textContent = "Todos";
    } else if (selectedOpts.length === 1) {
      labelSpan.textContent = selectedOpts[0].textContent;
    } else {
      labelSpan.textContent = `${selectedOpts.length} seleccionados`;
    }
  }

  syncMultiLabel();

  display.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  select.dataset.chipified = "1";
}

/* ----------------------------------------------------
 * 3. Filtros de datos
 * -------------------------------------------------- */

function getValoresMultiples(idSelect) {
  const el = document.getElementById(idSelect);
  if (!el) return [];
  return Array.from(el.selectedOptions || []).map((o) => o.value);
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

// Filtrado sin año (para comparativo YoY)
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

/* ----------------------------------------------------
 * 4. KPIs y agrupación
 * -------------------------------------------------- */

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

/* ----------------------------------------------------
 * 5. Vista Resumen
 * -------------------------------------------------- */

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

/* ----------------------------------------------------
 * 6. Gráficos Resumen
 * -------------------------------------------------- */

function destruirChart(chartRef) {
  if (chartRef && typeof chartRef.destroy === "function") {
    chartRef.destroy();
  }
}

function renderGraficoCategorias(rows) {
  const ctx = document.getElementById("graficoCategorias");
  if (!ctx) return;

  const mapa = {};
  rows.forEach((r) => {
    const cat = r.categoria || "SIN CATEGORIA";
    if (!mapa[cat]) mapa[cat] = 0;
    mapa[cat] += r.subt_fac_num || 0;
  });

  const labels = Object.keys(mapa);
  const valores = labels.map((l) => mapa[l]);

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

function renderGraficoDiaSemana(rows) {
  const ctx = document.getElementById("graficoDiaSemana");
  if (!ctx) return;

  const ordenDias = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
  const mapa = {};
  ordenDias.forEach((d) => (mapa[d] = 0));

  rows.forEach((r) => {
    const d = (r.diaSemana || "").toLowerCase().slice(0, 3);
    if (!mapa.hasOwnProperty(d)) mapa[d] = 0;
    mapa[d] += r.subt_fac_num || 0;
  });

  const labels = ordenDias;
  const valores = labels.map((l) => mapa[l] || 0);

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

/* ----------------------------------------------------
 * 7. Comparativo YoY + drill-down
 * -------------------------------------------------- */

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

  // Gráfico comparativo por sucursal
  const mapaSuc = {};
  base.forEach((r) => {
    const alm = r.almacen || "SIN_ALMACEN";
    if (!mapaSuc[alm]) mapaSuc[alm] = { v24: 0, v25: 0 };
    if (r.year === 2024) mapaSuc[alm].v24 += r.subt_fac_num || 0;
    if (r.year === 2025) mapaSuc[alm].v25 += r.subt_fac_num || 0;
  });

  const labelsSuc = Object.keys(mapaSuc);
  const data24Suc = labelsSuc.map((k) => mapaSuc[k].v24);
  const data25Suc = labelsSuc.map((k) => mapaSuc[k].v25);

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

  // Gráfico comparativo por categoría (top 10 por ventas 2025)
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

function handleComparativoDblClick(metricKey) {
  if (!metricKey) return;
  drillMetric = metricKey;

  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  tabButtons.forEach((b) => b.classList.remove("active"));
  views.forEach((v) => v.classList.remove("active"));

  const btnDetalle = document.querySelector('.tab-btn[data-view="detalle"]');
  const viewDetalle = document.getElementById("view-detalle");

  if (btnDetalle) btnDetalle.classList.add("active");
  if (viewDetalle) viewDetalle.classList.add("active");

  renderDetalle();
}

/* ----------------------------------------------------
 * 8. Vista Detalle
 * -------------------------------------------------- */

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
    textoInfo = "Drill-down: solo filas con utilidad negativa (según filtros actuales).";
  } else if (drillMetric === "credito") {
    rows = rows.filter((r) => r.tipoFactura === "Crédito");
    textoInfo = "Drill-down: solo facturas a Crédito (según filtros actuales).";
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

  const maxRows = 500;
  const slice = rows.slice(0, maxRows);

  if (!slice.length) {
    cont.innerHTML =
      "<p>Sin filas para mostrar con el drill-down y búsqueda aplicada.</p>";
    return;
  }

  let html = `
    <table class="tabla-detalle">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Almacén</th>
          <th>Factura</th>
          <th>Cliente</th>
          <th>Categoría</th>
          <th>Producto</th>
          <th>Tipo Factura</th>
          <th>Subtotal</th>
          <th>Utilidad</th>
          <th>Margen %</th>
          <th>Filtro3</th>
        </tr>
      </thead>
      <tbody>
  `;

  slice.forEach((r) => {
    const fechaStr = r.fechaObj
      ? r.fechaObj.toLocaleDateString("es-MX")
      : "";
    const margen = r.margen_calc || 0;
    html += `
      <tr>
        <td>${fechaStr}</td>
        <td>${r.almacen || ""}</td>
        <td>${r["factura"] || ""}</td>
        <td>${r["cliente"] || ""}</td>
        <td>${r.categoria || ""}</td>
        <td>${r["producto"] || ""}</td>
        <td>${r.tipoFactura || ""}</td>
        <td>${formatMoneda(r.subt_fac_num || 0)}</td>
        <td>${formatMoneda(r.utilidad_num || 0)}</td>
        <td>${formatPorcentaje(margen)}</td>
        <td>${r.filtro3_norm || ""}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";

  if (rows.length > maxRows) {
    html += `<p class="help-text">Mostrando ${maxRows} de ${rows.length} filas.</p>`;
  }

  cont.innerHTML = html;
}

/* ----------------------------------------------------
 * 9. Render general (Resumen)
 * -------------------------------------------------- */

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
