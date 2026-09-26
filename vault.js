/* Shared storefront behavior. No dependencies or build step. */
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
  function paint(el, n) {
    const r = rarity(n);
    el.dataset.rarity = r;
    el.style.setProperty("--rarity", "var(--accent)");
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
      toast("Deals are unavailable. Try again.");
    }
  }
  let lastG = 0;
  const panel = document.createElement("dialog");
  panel.innerHTML =
    "<h2>A few shortcuts.</h2><p><kbd>/</kbd> Search deals</p><p><kbd>G → H</kbd> Back home</p><p><kbd>R</kbd> Open a random deal</p><p><kbd>← →</kbd> Browse a focused shelf</p><p><kbd>Esc</kbd> Close filters or this panel</p><button>Got it</button>";
  document.body.append(panel);
  panel.querySelector("button").onclick = () => panel.close();
  document.addEventListener("keydown", (e) => {
    if (
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
      e.target.isContentEditable
    )
      return;
    if (e.key === "?") {
      panel.showModal();
    }
    if (e.key.toLowerCase() === "r") random();
    if (e.key.toLowerCase() === "h" && Date.now() - lastG < 1000)
      location.href = "./";
    if (e.key.toLowerCase() === "g") lastG = Date.now();
  });
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
  observe();
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
