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

    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
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
    let focalLength = 400;
    let depth = 1300;
    let qualityTier = "high";
    let maxComets = 2;
    let lastFrameTime = performance.now();
    let cometCooldown = 0;
    let stars = [];
    let dust = [];
    let comets = [];
    let frameId = null;
    let isAnimating = false;

    const random = (min, max) => Math.random() * (max - min) + min;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const computeQualityTier = () => {
        const lowPowerDevice =
            (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
            (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4);

        if (motionQuery.matches) {
            return "low";
        }

        if (width < 760 || lowPowerDevice) {
            return "medium";
        }

        return "high";
    };

    const getCounts = () => {
        const areaFactor = (width * height) / 9000;
        if (qualityTier === "low") {
            const starCount = clamp(Math.floor(areaFactor * 0.45), 70, 145);
            return { starCount, dustCount: Math.floor(starCount * 0.45), maxComets: 0 };
        }
        if (qualityTier === "medium") {
            const starCount = clamp(Math.floor(areaFactor * 0.72), 100, 235);
            return { starCount, dustCount: Math.floor(starCount * 0.58), maxComets: 1 };
        }
        const starCount = clamp(Math.floor(areaFactor), 140, 340);
        return { starCount, dustCount: Math.floor(starCount * 0.72), maxComets: 2 };
    };

    const createStar = () => ({
        x: random(-width * 0.9, width * 0.9),
        y: random(-height * 0.9, height * 0.9),
        z: random(1, depth),
        speed: random(2.2, qualityTier === "high" ? 7.8 : 6.5),
        size: random(0.4, 2.4),
        hue: random(165, 220),
        twinkle: random(0, Math.PI * 2)
    });

    const createDustParticle = () => ({
        x: random(-width, width),
        y: random(-height, height),
        z: random(1, depth),
        speed: random(0.8, 2.1),
        size: random(0.35, 1.4),
        alpha: random(0.08, 0.34),
        hue: random(180, 212)
    });

    const createComet = () => {
        const life = random(52, 88);
        return {
            x: random(-width * 0.25, width * 0.72),
            y: random(-height * 0.3, height * 0.35),
            vx: random(9.5, 15.5),
            vy: random(2.2, 4.7),
            life,
            maxLife: life,
            width: random(1.2, 2.2),
            hue: random(176, 212)
        };
    };

    const resetStar = (star, placeFar = true) => {
        star.x = random(-width * 0.95, width * 0.95);
        star.y = random(-height * 0.95, height * 0.95);
        star.z = placeFar ? depth : random(1, depth);
        star.speed = random(2.2, qualityTier === "high" ? 7.8 : 6.5);
        star.size = random(0.4, 2.4);
        star.hue = random(165, 220);
        star.twinkle = random(0, Math.PI * 2);
    };

    const resetDust = (particle, placeFar = true) => {
        particle.x = random(-width, width);
        particle.y = random(-height, height);
        particle.z = placeFar ? depth : random(1, depth);
        particle.speed = random(0.8, 2.1);
        particle.size = random(0.35, 1.4);
        particle.alpha = random(0.08, 0.34);
        particle.hue = random(180, 212);
    };

    const paintBackdrop = (time) => {
        context.fillStyle = "rgba(6, 17, 28, 0.5)";
        context.fillRect(0, 0, width, height);

        const pulse = (Math.sin(time * 0.00027) + 1) * 0.5;
        const halo = context.createRadialGradient(
            centerX + pointer.x * (46 + pulse * 18),
            centerY + pointer.y * (36 + pulse * 14),
            Math.min(width, height) * 0.08,
            centerX,
            centerY,
            Math.max(width, height) * 0.75
        );
        halo.addColorStop(0, "rgba(32, 201, 151, 0.2)");
        halo.addColorStop(0.38, "rgba(22, 163, 199, 0.13)");
        halo.addColorStop(1, "rgba(3, 10, 18, 0.04)");
        context.fillStyle = halo;
        context.fillRect(0, 0, width, height);

        const edgeShade = context.createRadialGradient(
            centerX,
            centerY,
            Math.min(width, height) * 0.25,
            centerX,
            centerY,
            Math.max(width, height) * 0.7
        );
        edgeShade.addColorStop(0, "rgba(0, 0, 0, 0)");
        edgeShade.addColorStop(1, "rgba(2, 6, 12, 0.42)");
        context.fillStyle = edgeShade;
        context.fillRect(0, 0, width, height);
    };

    const drawDust = (parallaxX, parallaxY, delta, staticMode) => {
        for (const particle of dust) {
            if (!staticMode) {
                particle.z -= particle.speed * delta;
            }

            if (particle.z <= 1) {
                resetDust(particle, true);
                continue;
            }

            const scale = focalLength / (particle.z * 1.2);
            const x = particle.x * scale + centerX + parallaxX * 0.55;
            const y = particle.y * scale + centerY + parallaxY * 0.55;

            if (x < -40 || x > width + 40 || y < -40 || y > height + 40) {
                resetDust(particle, true);
                continue;
            }

            const depthRatio = 1 - particle.z / depth;
            const alpha = clamp(particle.alpha + depthRatio * 0.18, 0.08, 0.36);
            const radius = clamp(particle.size + depthRatio * 0.7, 0.2, 1.55);
            context.fillStyle = `hsla(${particle.hue}, 88%, 78%, ${alpha})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
    };

    const drawStars = (parallaxX, parallaxY, delta, staticMode, projected, time) => {
        for (const star of stars) {
            if (!staticMode) {
                star.z -= star.speed * delta;
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

            const previousScale = focalLength / (star.z + star.speed * (1.2 + delta));
            const prevX = star.x * previousScale + centerX + parallaxX;
            const prevY = star.y * previousScale + centerY + parallaxY;
            const depthRatio = 1 - star.z / depth;
            const sparkle = (Math.sin(time * 0.0018 + star.twinkle) + 1) * 0.5;
            const alpha = clamp(depthRatio + 0.07 + sparkle * 0.22, 0.12, 0.96);
            const radius = clamp(star.size + depthRatio * 2.4, 0.3, 3.6);

            context.strokeStyle = `hsla(${star.hue}, 95%, 78%, ${alpha * 0.32})`;
            context.lineWidth = radius * 0.44;
            context.beginPath();
            context.moveTo(prevX, prevY);
            context.lineTo(x, y);
            context.stroke();

            context.fillStyle = `hsla(${star.hue}, 100%, 84%, ${alpha})`;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();

            if (qualityTier === "high" && depthRatio > 0.57) {
                projected.push({ x, y, alpha, radius });
            }
        }
    };

    const drawConnections = (projected) => {
        if (qualityTier !== "high" || projected.length < 2) {
            return;
        }

        const maxDistance = 98;
        const maxDistanceSq = maxDistance * maxDistance;
        const points = projected.slice(0, 68);
        let linesLeft = 44;

        for (let i = 0; i < points.length && linesLeft > 0; i += 1) {
            const pointA = points[i];
            for (let j = i + 1; j < points.length && linesLeft > 0; j += 1) {
                const pointB = points[j];
                const dx = pointA.x - pointB.x;
                const dy = pointA.y - pointB.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq > maxDistanceSq) {
                    continue;
                }

                const strength = 1 - distanceSq / maxDistanceSq;
                const alpha = strength * Math.min(pointA.alpha, pointB.alpha) * 0.16;
                context.strokeStyle = `rgba(171, 246, 227, ${alpha})`;
                context.lineWidth = 0.38 + (pointA.radius + pointB.radius) * 0.05;
                context.beginPath();
                context.moveTo(pointA.x, pointA.y);
                context.lineTo(pointB.x, pointB.y);
                context.stroke();
                linesLeft -= 1;
            }
        }
    };

    const drawComets = (delta, staticMode) => {
        if (maxComets <= 0) {
            return;
        }

        if (!staticMode) {
            cometCooldown -= delta;
            const shouldSpawn =
                comets.length < maxComets &&
                cometCooldown <= 0 &&
                Math.random() < 0.035 * delta;

            if (shouldSpawn) {
                comets.push(createComet());
                cometCooldown = random(42, 128);
            }
        }

        for (let index = comets.length - 1; index >= 0; index -= 1) {
            const comet = comets[index];
            if (!staticMode) {
                comet.x += comet.vx * delta;
                comet.y += comet.vy * delta;
                comet.life -= delta;
            }

            if (comet.life <= 0 || comet.x > width + 220 || comet.y > height + 220) {
                comets.splice(index, 1);
                continue;
            }

            const lifeRatio = clamp(comet.life / comet.maxLife, 0, 1);
            const tailLength = 5.8 + (1 - lifeRatio) * 3.2;
            const tailX = comet.x - comet.vx * tailLength;
            const tailY = comet.y - comet.vy * tailLength;
            const tailGradient = context.createLinearGradient(comet.x, comet.y, tailX, tailY);
            tailGradient.addColorStop(0, `hsla(${comet.hue}, 100%, 88%, ${0.8 * lifeRatio})`);
            tailGradient.addColorStop(1, `hsla(${comet.hue}, 100%, 70%, 0)`);

            context.strokeStyle = tailGradient;
            context.lineWidth = comet.width * lifeRatio;
            context.beginPath();
            context.moveTo(comet.x, comet.y);
            context.lineTo(tailX, tailY);
            context.stroke();

            context.fillStyle = `hsla(${comet.hue}, 100%, 92%, ${0.92 * lifeRatio})`;
            context.beginPath();
            context.arc(comet.x, comet.y, Math.max(0.75, comet.width * 0.9), 0, Math.PI * 2);
            context.fill();
        }
    };

    const drawScene = (delta, staticMode, time) => {
        pointer.x += (pointer.targetX - pointer.x) * 0.06;
        pointer.y += (pointer.targetY - pointer.y) * 0.06;
        const parallaxX = pointer.x * 68;
        const parallaxY = pointer.y * 48;

        paintBackdrop(time);
        drawDust(parallaxX, parallaxY, delta, staticMode);

        const projected = [];
        drawStars(parallaxX, parallaxY, delta, staticMode, projected, time);
        drawConnections(projected);
        drawComets(delta, staticMode);
    };

    const renderFrame = (time) => {
        const rawDelta = (time - lastFrameTime) / 16.67;
        lastFrameTime = time;
        const delta = clamp(rawDelta, 0.45, 2.3);
        drawScene(delta, false, time);
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
        focalLength = clamp(width * 0.36, 290, 620);
        depth = Math.max(980, width * 1.35);

        qualityTier = computeQualityTier();
        const counts = getCounts();
        maxComets = counts.maxComets;
        stars = Array.from({ length: counts.starCount }, createStar);
        dust = Array.from({ length: counts.dustCount }, createDustParticle);
        comets = [];
        cometCooldown = random(24, 90);
        lastFrameTime = performance.now();

        context.clearRect(0, 0, width, height);
        drawScene(1, true, performance.now());
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
        lastFrameTime = performance.now();
        frameId = requestAnimationFrame(renderFrame);
    };

    const syncMotionPreference = () => {
        if (motionQuery.matches || document.hidden) {
            stopAnimation();
            context.clearRect(0, 0, width, height);
            drawScene(1, true, performance.now());
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
    window.addEventListener("orientationchange", setCanvasSize);
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

        if (link.getAttribute("target") === "_blank") {
            closeMobileMenu();
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
        window.location.href = `mailto:ridham.gupta.programming@gmail.com?subject=${subject}&body=${body}`;
        contactForm.reset();
    });
}
