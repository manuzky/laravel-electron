document.addEventListener("DOMContentLoaded", () => {
    const loader = document.querySelector(".loader");

    // Ocultar loader cuando la página termina de cargar
    window.addEventListener("load", () => {
        loader.classList.add("loader-hidden");
    });

    // Función para mostrarlo
    function showLoader() {
        loader.classList.remove("loader-hidden");
    }

    // Enlaces con loader
    document.querySelectorAll('.show-loader').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            showLoader();

            setTimeout(() => {
                window.location.href = this.href;
            }, 300);
        });
    });

    // Formularios
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', () => {
            showLoader();
        });
    });
});