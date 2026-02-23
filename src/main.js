import './style.css'

const navigateTo = (url) => {
    const urlObj = new URL(url, location.origin);
    if (location.pathname === urlObj.pathname) return;
    history.pushState(null, null, urlObj.pathname);
    router();
};

const router = async () => {
    const routes = [
        { path: "/", view: () => renderPlaceholder("Welcome") },
        { path: "/dashboard", view: () => renderPlaceholder("Dashboard") },
        { path: "/saved", view: () => renderPlaceholder("Saved Jobs") },
        { path: "/digest", view: () => renderPlaceholder("Email Digest") },
        { path: "/settings", view: () => renderPlaceholder("Settings") },
        { path: "/proof", view: () => renderPlaceholder("Build Proof") },
    ];

    // Test each route for potential match
    const potentialMatches = routes.map((route) => {
        return {
            route: route,
            isMatch: location.pathname === route.path
        };
    });

    let match = potentialMatches.find((potentialMatch) => potentialMatch.isMatch);

    if (!match) {
        match = {
            route: { path: "/404", view: () => renderNotFound() },
            isMatch: true
        };
    }

    document.querySelector("#content").innerHTML = match.route.view();
    updateActiveLinks();
    closeMobileNav();
};

const renderPlaceholder = (title) => {
    return `
    <div class="placeholder-container">
      <h1>${title}</h1>
      <p>This section will be built in the next step.</p>
    </div>
  `;
};

const renderNotFound = () => {
    return `
    <div class="placeholder-container">
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" data-link class="btn btn-secondary">Return Home</a>
    </div>
  `;
};

const updateActiveLinks = () => {
    const currentPath = location.pathname;
    document.querySelectorAll("[data-link]").forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        }
    });
};

const closeMobileNav = () => {
    document.getElementById("mobile-nav").classList.remove("open");
};

window.addEventListener("popstate", router);

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", (e) => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    const hamburger = document.getElementById("hamburger");
    const mobileNav = document.getElementById("mobile-nav");

    hamburger.addEventListener("click", () => {
        mobileNav.classList.toggle("open");
    });

    router();
});
