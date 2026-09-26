/* Shared Gem Vault interaction layer. No dependencies or build step. */
window.Vault = (() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const rarity = (n) =>
    n >= 100
      ? "mythic"
      : n >= 90
        ? "legendary"
        : n >= 70
          ? "epic"
          : n >= 50
            ? "rare"
            : "common";
  const colors = {
    common: "#9fb3c8",
    rare: "#66c0f4",
    epic: "#b48cff",
    legendary: "#ffcf6b",
    mythic: "#b5e8ef",
  };
  function paint(el, n) {
    const r = rarity(n);
    el.dataset.rarity = r;
    el.style.setProperty("--rarity", colors[r]);
  }
  let toastTimer;
  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3000);
  }
  async function copy(url) {
    try {
      await navigator.clipboard.writeText(new URL(url, location.href).href);
      toast("Copied. Share your find.");
    } catch {
      toast("Could not copy. Copy the address from your browser.");
    }
  }
  function endTime(value) {
    return Date.parse(
      /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value + "T00:00:00Z" : value,
    );
  }
  function countdown(value) {
    const ms = endTime(value) - Date.now();
    if (!Number.isFinite(ms)) return "";
    if (ms <= 0) return "Offer may have ended";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 86400)}d ${String(Math.floor(s / 3600) % 24).padStart(2, "0")}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m`;
  }
  function timers() {
    document.querySelectorAll("[data-ends]").forEach((el) => {
      if (el.id === "productTimer") {
        const seconds = Math.max(
          0,
          Math.floor((endTime(el.dataset.ends) - Date.now()) / 1000),
        );
        el.innerHTML =
          seconds > 0
            ? [
                [Math.floor(seconds / 86400), "Days"],
                [Math.floor(seconds / 3600) % 24, "Hours"],
                [Math.floor(seconds / 60) % 60, "Min"],
                [seconds % 60, "Sec"],
              ]
                .map(
                  ([v, k]) =>
                    `<span><b>${String(v).padStart(2, "0")}</b><small>${k}</small></span>`,
                )
                .join("")
            : "Offer may have ended";
      } else el.textContent = countdown(el.dataset.ends);
      el.classList.toggle(
        "warm",
        endTime(el.dataset.ends) - Date.now() < 172800000,
      );
    });
  }
  setInterval(() => {
    if (!document.hidden) timers();
  }, 1000);
  let observer;
  const visible = new WeakSet();
  if ("IntersectionObserver" in window)
    observer = new IntersectionObserver((entries) =>
      entries.forEach((e) =>
        e.isIntersecting ? visible.add(e.target) : visible.delete(e.target),
      ),
    );
  function observe(root = document) {
    root
      .querySelectorAll(
        ".product-card:not(.compact-card),.featured-card,.product-hero-media",
      )
      .forEach((el) => {
        if (observer) observer.observe(el);
        else visible.add(el);
      });
  }
  let pointerFrame = 0,
    previous = null;

  function releaseInteractiveCard(card) {
    if (!card) return;
    card.style.transition =
      "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
    card.style.transform = "";
    window.setTimeout(() => {
      if (!card.matches(":hover")) card.style.removeProperty("transition");
    }, 540);
  }

  document.addEventListener("pointermove", (event) => {
    if (reduced.matches || event.pointerType === "touch" || pointerFrame)
      return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      document.documentElement.style.setProperty(
        "--mx",
        (event.clientX / innerWidth) * 100 + "%",
      );
      document.documentElement.style.setProperty(
        "--my",
        (event.clientY / innerHeight) * 100 + "%",
      );
      document.documentElement.style.setProperty(
        "--floor",
        (event.clientX / innerWidth - 0.5) * 6 + "deg",
      );
      const card = event.target.closest(
        ".product-card:not(.compact-card),.featured-card,.product-hero-media",
      );
      if (previous && previous !== card) releaseInteractiveCard(previous);
      if (card && visible.has(card)) {
        const r = card.getBoundingClientRect();
        card.style.transition = "transform 86ms ease-out";
        card.style.transform = `perspective(900px) rotateX(${(-(event.clientY - r.top - r.height / 2) / r.height) * 12}deg) rotateY(${((event.clientX - r.left - r.width / 2) / r.width) * 12}deg) translateY(-4px)`;
        previous = card;
      }
    });
  });
  document.addEventListener("pointerout", (event) => {
    if (previous && !previous.contains(event.relatedTarget)) {
      releaseInteractiveCard(previous);
      previous = null;
    }
  });
  function shelf(el) {
    if (!el || el.dataset.ready) return;
    el.dataset.ready = "1";
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        el.scrollBy({
          left: e.key === "ArrowRight" ? 288 : -288,
          behavior: reduced.matches ? "instant" : "smooth",
        });
      }
    });
    el.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        if (
          (e.deltaY > 0 &&
            el.scrollLeft + el.clientWidth < el.scrollWidth - 2) ||
          (e.deltaY < 0 && el.scrollLeft > 0)
        ) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );
    let drag = null,
      moved = false;
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.target.closest("button")) return;
      drag = { x: e.clientX, scroll: el.scrollLeft };
      moved = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) > 6) {
        moved = true;
        el.scrollLeft = drag.scroll - (e.clientX - drag.x);
      }
    });
    window.addEventListener("pointerup", () => (drag = null));
    el.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          moved = false;
        }
      },
      true,
    );
  }
  let treasure = false;
  try {
    treasure = sessionStorage.getItem("vault:treasure") === "1";
  } catch {}
  document.body.classList.toggle("treasure", treasure);
  function unlock() {
    treasure = true;
    document.body.classList.add("treasure");
    try {
      sessionStorage.setItem("vault:treasure", "1");
    } catch {}
    toast("You found the hidden gem.");
  }
  async function random() {
    try {
      const response = await fetch("/games.json");
      if (!response.ok) throw Error();
      const { games } = await response.json();
      const valid = games.filter((x) => x && x.title);
      if (!valid.length) throw Error();
      location.href =
        "./product.html?title=" +
        encodeURIComponent(
          valid[Math.floor(Math.random() * valid.length)].title,
        );
    } catch {
      toast("The vault jammed. Try again.");
    }
  }
  const konami = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let ki = 0,
    lastG = 0;
  const panel = document.createElement("dialog");
  panel.innerHTML =
    "<h2>A few shortcuts.</h2><p><kbd>/</kbd> Search the vault</p><p><kbd>G → H</kbd> Back home</p><p><kbd>R</kbd> Dig a random gem</p><p><kbd>← →</kbd> Browse a focused shelf</p><p><kbd>Esc</kbd> Close filters or this panel</p><button>Got it</button>";
  document.body.append(panel);
  panel.querySelector("button").onclick = () => panel.close();
  document.addEventListener("keydown", (e) => {
    if (
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
      e.target.isContentEditable
    )
      return;
    ki = e.key === konami[ki] ? ki + 1 : 0;
    if (ki === konami.length) {
      unlock();
      ki = 0;
    }
    if (e.key === "?") {
      panel.showModal();
    }
    if (e.key.toLowerCase() === "r") random();
    if (e.key.toLowerCase() === "h" && Date.now() - lastG < 1000)
      location.href = "./";
    if (e.key.toLowerCase() === "g") lastG = Date.now();
  });
  let glints = 0;
  document.querySelectorAll(".brand-logo").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const bounds = el.getBoundingClientRect();
      if (e.clientX < bounds.left + bounds.width * 0.65) {
        location.href = el.closest("a").href;
        return;
      }
      if (++glints === 5) {
        unlock();
        glints = 0;
      }
    }),
  );
  const filter = document.querySelector("#filterPanel"),
    trigger = document.querySelector(".mobile-filters");
  let oldFocus;
  function closeFilters() {
    if (!filter) return;
    filter.classList.remove("open");
    filter.removeAttribute("aria-modal");
    filter.removeAttribute("role");
    trigger?.setAttribute("aria-expanded", "false");
    oldFocus?.focus();
  }
  trigger?.addEventListener("click", () => {
    oldFocus = document.activeElement;
    filter.classList.add("open");
    filter.setAttribute("role", "dialog");
    filter.setAttribute("aria-modal", "true");
    trigger.setAttribute("aria-expanded", "true");
    filter.querySelector("button").focus();
  });
  document
    .querySelector(".sheet-close")
    ?.addEventListener("click", closeFilters);
  document.addEventListener("keydown", (e) => {
    if (!filter?.classList.contains("open")) return;
    if (e.key === "Escape") closeFilters();
    if (e.key === "Tab") {
      const focus = [...filter.querySelectorAll("button,input,select")].filter(
        (x) => !x.disabled,
      );
      if (e.shiftKey && document.activeElement === focus[0]) {
        e.preventDefault();
        focus.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === focus.at(-1)) {
        e.preventDefault();
        focus[0].focus();
      }
    }
  });
  let touchY = 0;
  filter?.addEventListener(
    "touchstart",
    (e) => (touchY = e.touches[0].clientY),
    { passive: true },
  );
  filter?.addEventListener(
    "touchend",
    (e) => {
      if (e.changedTouches[0].clientY - touchY > 100 && filter.scrollTop === 0)
        closeFilters();
    },
    { passive: true },
  );
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) {
      e.preventDefault();
      copy(c.dataset.copy);
    }
    if (e.target.closest("[data-random]")) random();
  });
  document
    .querySelector("[data-shelf-prev]")
    ?.addEventListener("click", () =>
      document
        .querySelector("#legendaryShelf")
        .scrollBy({
          left: -288,
          behavior: reduced.matches ? "instant" : "smooth",
        }),
    );
  document
    .querySelector("[data-shelf-next]")
    ?.addEventListener("click", () =>
      document
        .querySelector("#legendaryShelf")
        .scrollBy({
          left: 288,
          behavior: reduced.matches ? "instant" : "smooth",
        }),
    );
  const scroll = () => {
    document.documentElement.style.setProperty(
      "--progress",
      scrollY /
        Math.max(1, document.documentElement.scrollHeight - innerHeight),
    );
    document
      .querySelector(".masthead")
      ?.classList.toggle("scrolled", scrollY > 20);
  };
  addEventListener("scroll", scroll, { passive: true });
  scroll();
  try {
    if (!sessionStorage.getItem("vault:entered")) {
      document.body.classList.add("entry");
      sessionStorage.setItem("vault:entered", "1");
    }
  } catch {}
  const canvas = document.createElement("canvas");
  canvas.className = "dust";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let frame = 0;
  const points = Array.from({ length: 30 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.3,
  }));
  function size() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  size();
  addEventListener("resize", size);
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = treasure ? "#ffcf6b66" : "#a4c7e040";
    for (const p of points) {
      p.y -= 0.00012;
      if (p.y < 0) p.y = 1;
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    frame = requestAnimationFrame(draw);
  }
  function ambient() {
    cancelAnimationFrame(frame);
    document.body.classList.toggle("paused", document.hidden);
    if (!document.hidden && !reduced.matches) draw();
  }
  document.addEventListener("visibilitychange", ambient);
  reduced.addEventListener("change", ambient);
  ambient();
  observe();
  const world = document.createElement("div");
  world.className = "world-grid";
  world.setAttribute("aria-hidden", "true");
  document.body.prepend(world);
  const grain = document.createElement("div");
  grain.className = "grain";
  grain.setAttribute("aria-hidden", "true");
  document.body.append(grain);
  function countUp(el, n) {
    if (!el) return;
    if (reduced.matches) {
      el.textContent = n.toLocaleString();
      return;
    }
    const start = performance.now();
    const tick = (t) => {
      const f = Math.min(1, (t - start) / 700);
      el.textContent = Math.round(
        n * (1 - Math.pow(1 - f, 3)),
      ).toLocaleString();
      if (f < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function flipPrices() {
    if (reduced.matches) return;
    document
      .querySelectorAll(
        ".price-now,.compact-price strong,#productPrice,.preview-pricing strong",
      )
      .forEach((el) => {
        const text = el.textContent;
        el.setAttribute("aria-label", text);
        el.replaceChildren(
          ...[...text].map((c, i) => {
            const span = document.createElement("span");
            span.textContent = c;
            span.setAttribute("aria-hidden", "true");
            span.style.display = "inline-block";
            span.animate(
              [
                { transform: "rotateX(-90deg)", opacity: 0.3 },
                { transform: "rotateX(0)", opacity: 1 },
              ],
              {
                duration: 350,
                delay: Math.min(200, i * 25),
                easing: "cubic-bezier(.22,1,.36,1)",
              },
            );
            return span;
          }),
        );
      });
  }
  if (!reduced.matches && "IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.animate(
              [
                { opacity: 0, transform: "translateY(24px)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" },
            );
            reveal.unobserve(e.target);
          }
        }),
      { threshold: 0.2 },
    );
    document
      .querySelectorAll(".story-step")
      .forEach((el) => reveal.observe(el));
  }
  return {
    rarity,
    paint,
    toast,
    copy,
    countdown,
    endTime,
    timers,
    observe,
    shelf,
    reduced,
    random,
    countUp,
    flipPrices,
  };
})();
