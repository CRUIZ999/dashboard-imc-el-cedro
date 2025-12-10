// dashboard_imc.js
// Dashboard IMC – Rentabilidad y Calidad de Datos
// Requiere: PapaParse (CDN) y Chart.js (CDN)

let dataRaw = [];
let dataClean = [];
let charts = {
  categorias: null,
  sucursales: null,
  diaSemana: null,
};

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

  // Listeners de filtros
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
      renderizarDashboard();
    });
  });
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
  if (partes.length !== 3 || isNaN(partes[0]) || isNaN(partes[1]) || isNaN(partes[2])) {
    return null;
  }
  const [p1, p2, year] = partes;

  let day, month;
  if (year === 2024) {
    // dd/mm/yyyy
    day = p1;
    month = p2;
  } else if (year === 2025) {
    // mm/dd/yyyy
    month = p1;
    day = p2;
  } else {
    // fallback: dd/mm/yyyy
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
      const filtro3Norm = normalizarFiltro3(r["filtro3"] || r["filtro_3"] || r["AD"] || "");
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
 * 2. Inicializar filtros dinámicos
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

/* ----------------------------------------------------
 * 4. Cálculo de KPIs
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

/* ----------------------------------------------------
 * 5. Tabla por sucursal
 * -------------------------------------------------- */

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
 * 6. Gráficos (Chart.js)
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
 * 7. Render general del dashboard
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
