/* ----------------------------------------------------
 * 11. Inicialización segura de pestañas
 * -------------------------------------------------- */

// Este bloque se ejecuta una vez y conecta los botones de pestaña
(function initTabsSafe() {
  // Esperamos a que el DOM esté listo por si el script se carga muy rápido
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachTabs);
  } else {
    attachTabs();
  }

  function attachTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const views = document.querySelectorAll(".view");
    if (!tabButtons.length || !views.length) {
      // Si no encuentra pestañas, no hacemos nada
      return;
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");

        // Quitar estado activo
        tabButtons.forEach((b) => b.classList.remove("active"));
        views.forEach((v) => v.classList.remove("active"));

        // Activar pestaña seleccionada
        btn.classList.add("active");
        const viewEl = document.getElementById(`view-${view}`);
        if (viewEl) {
          viewEl.classList.add("active");
        }

        // Redibujar contenido según vista
        if (typeof renderizarDashboard === "function" && view === "resumen") {
          renderizarDashboard();
        }
        if (typeof renderComparativo === "function" && view === "comparativo") {
          renderComparativo();
        }
        if (typeof renderDetalle === "function" && view === "detalle") {
          renderDetalle();
        }
      });
    });
  }
})();
