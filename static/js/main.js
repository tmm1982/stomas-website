document.addEventListener("DOMContentLoaded", () => {

    const navbar = document.querySelector("header");

    const updateNavbar = () => {

        if (window.scrollY > 40) {

            navbar.classList.add(
                "bg-slate-950/80",
                "backdrop-blur-md",
                "shadow-lg"
            );

        } else {

            navbar.classList.remove(
                "bg-slate-950/80",
                "backdrop-blur-md",
                "shadow-lg"
            );

        }

    };

    updateNavbar();

    window.addEventListener("scroll", updateNavbar);

});
