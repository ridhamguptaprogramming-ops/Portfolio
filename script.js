const siteHeader = document.querySelector(".site-header");
const siteNav = document.querySelector(".site-nav");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
const sectionLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
const sections = Array.from(document.querySelectorAll("main section[id]"));

const yearSlot = document.getElementById("current-year");
if (yearSlot) {
    yearSlot.textContent = new Date().getFullYear();
}

const init3DBackground = () => {
    const canvas = document.getElementById("scene-canvas");
    if (!canvas) {
        return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let centerX = 0;
    let centerY = 0;
    let focalLength = 360;
    let depth = 1200;
    let stars = [];
    let frameId = null;
    let isAnimating = false;

    const random = (min, max) => Math.random() * (max - min) + min;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const getStarCount = () => clamp(Math.floor((width * height) / 8500), 120, 300);

    const createStar = () => ({
        x: random(-width * 0.9, width * 0.9),
        y: random(-height * 0.9, height * 0.9),
        z: random(1, depth),
        speed: random(2.2, 6.8),
        size: random(0.4, 2.4),
        hue: random(165, 220)
    });

    const resetStar = (star, placeFar = true) => {
        star.x = random(-width * 0.95, width * 0.95);
        star.y = random(-height * 0.95, height * 0.95);
        star.z = placeFar ? depth : random(1, depth);
        star.speed = random(2.2, 6.8);
        star.size = random(0.4, 2.4);
        star.hue = random(165, 220);
    };

    const paintBackdrop = () => {
        context.fillStyle = "rgba(6, 17, 28, 0.5)";
        context.fillRect(0, 0, width, height);

        const halo = context.createRadialGradient(
            centerX + pointer.x * 44,
            centerY + pointer.y * 34,
            Math.min(width, height) * 0.08,
            centerX,
            centerY,
            Math.max(width, height) * 0.75
        );
        halo.addColorStop(0, "rgba(32, 201, 151, 0.18)");
        halo.addColorStop(0.38, "rgba(22, 163, 199, 0.12)");
        halo.addColorStop(1, "rgba(3, 10, 18, 0.06)");
        context.fillStyle = halo;
        context.fillRect(0, 0, width, height);
    };

    const drawStars = (staticMode = false) => {
        pointer.x += (pointer.targetX - pointer.x) * 0.06;
        pointer.y += (pointer.targetY - pointer.y) * 0.06;
        const parallaxX = pointer.x * 64;
        const parallaxY = pointer.y * 46;

        paintBackdrop();

        for (const star of stars) {
            if (!staticMode) {
                star.z -= star.speed;
            }

            if (star.z <= 1) {
                resetStar(star, true);
                continue;
            }

            const scale = focalLength / star.z;
            const x = star.x * scale + centerX + parallaxX;
            const y = star.y * scale + centerY + parallaxY;

            if (x < -60 || x > width + 60 || y < -60 || y > height + 60) {
                resetStar(star, true);
                continue;
            }

            const previousScale = focalLength / (star.z + star.speed * 1.6);
            const prevX = star.x * previousScale + centerX + parallaxX;
            const prevY = star.y * previousScale + centerY + parallaxY;
            const depthRatio = 1 - star.z / depth;
            const alpha = clamp(depthRatio + 0.08, 0.14, 0.95);
            const radius = clamp(star.size + depthRatio * 2.25, 0.35, 3.4);

            context.strokeStyle = `hsla(${star.hue}, 95%, 78%, ${alpha * 0.38})`;
            context.lineWidth = radius * 0.44;
            context.beginPath();
            context.moveTo(prevX, prevY);
            context.lineTo(x, y);
            context.stroke();

            context.fillStyle = `hsla(${star.hue}, 98%, 84%, ${alpha})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    };

    const renderFrame = () => {
        drawStars(false);
        frameId = requestAnimationFrame(renderFrame);
    };

    const setCanvasSize = () => {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        centerX = width * 0.5;
        centerY = height * 0.5;
        focalLength = clamp(width * 0.35, 280, 560);
        depth = Math.max(900, width * 1.3);
        stars = Array.from({ length: getStarCount() }, createStar);
        context.clearRect(0, 0, width, height);
        drawStars(true);
    };

    const stopAnimation = () => {
        if (!isAnimating) {
            return;
        }
        cancelAnimationFrame(frameId);
        frameId = null;
        isAnimating = false;
    };

    const startAnimation = () => {
        if (isAnimating) {
            return;
        }
        isAnimating = true;
        frameId = requestAnimationFrame(renderFrame);
    };

    const syncMotionPreference = () => {
        if (motionQuery.matches || document.hidden) {
            stopAnimation();
            context.clearRect(0, 0, width, height);
            drawStars(true);
            return;
        }
        startAnimation();
    };

    window.addEventListener("pointermove", (event) => {
        pointer.targetX = ((event.clientX / width) * 2 - 1) * 0.9;
        pointer.targetY = ((event.clientY / height) * 2 - 1) * 0.9;
    }, { passive: true });

    window.addEventListener("pointerout", (event) => {
        if (event.relatedTarget === null) {
            pointer.targetX = 0;
            pointer.targetY = 0;
        }
    });

    window.addEventListener("resize", setCanvasSize);
    document.addEventListener("visibilitychange", syncMotionPreference);

    if (typeof motionQuery.addEventListener === "function") {
        motionQuery.addEventListener("change", syncMotionPreference);
    } else if (typeof motionQuery.addListener === "function") {
        motionQuery.addListener(syncMotionPreference);
    }

    setCanvasSize();
    syncMotionPreference();
};

init3DBackground();

const closeMobileMenu = () => {
    if (!siteNav || !menuToggle) {
        return;
    }
    siteNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
};

if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = siteNav.classList.toggle("open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
}

sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#" || !targetId.startsWith("#")) {
            return;
        }

        const target = document.querySelector(targetId);
        if (!target) {
            return;
        }

        event.preventDefault();
        const headerOffset = siteHeader ? siteHeader.offsetHeight + 10 : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
        closeMobileMenu();
    });
});

const revealElements = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
    (entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.2 }
);
revealElements.forEach((element) => revealObserver.observe(element));

const updateActiveSection = () => {
    if (!sections.length) {
        return;
    }

    const headerOffset = siteHeader ? siteHeader.offsetHeight + 100 : 100;
    let activeId = sections[0].id;

    sections.forEach((section) => {
        if (window.scrollY + headerOffset >= section.offsetTop) {
            activeId = section.id;
        }
    });

    navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
    });
};

window.addEventListener("scroll", updateActiveSection, { passive: true });
window.addEventListener("resize", closeMobileMenu);
updateActiveSection();

const contactForm = document.getElementById("contact-form");
const formFeedback = document.querySelector(".form-feedback");

if (contactForm && formFeedback) {
    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!contactForm.checkValidity()) {
            formFeedback.textContent = "Please complete all fields before submitting.";
            return;
        }

        const name = contactForm.elements.name.value.trim();
        const email = contactForm.elements.email.value.trim();
        const message = contactForm.elements.message.value.trim();
        const subject = encodeURIComponent("Portfolio Inquiry");
        const body = encodeURIComponent(
            `Hi Ridham,\n\n${message}\n\nRegards,\n${name}\n${email}`
        );

        formFeedback.textContent = "Draft prepared. Your email app will open now.";
        window.location.href = `mailto:ridham@example.com?subject=${subject}&body=${body}`;
        contactForm.reset();
    });
}
