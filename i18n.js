/* Interface strings for English and Arabic. Steam titles and promotion names keep their source language. */
(() => {
  const KEY = "discounted:language";

  const en = {
    "skip": "Skip to deals",
    "skip.main": "Skip to content",
    "brand.home": "Discounted home",
    "nav.deals": "Deals",
    "nav.how": "How it works",
    "nav.source": "Source",
    "lang.switch": "العربية",
    "lang.switchLabel": "Switch to Arabic",
    "currency": "Currency",

    "intro.eyebrow": "Steam discounts",
    "intro.updated": "Updated {date}",
    "intro.title": "Steam deals, sorted.",
    "intro.lede": "Games, DLC and bundles on sale now. Filter by genre, budget and discount, then confirm the final price on Steam.",
    "stat.count": "Deals listed",
    "stat.lowest": "Lowest price",
    "stat.deepest": "Deepest cut",
    "stat.deadline": "Next deadline",
    "stat.none": "None listed",

    "events.title": "Sale events",
    "events.lede": "Named promotions with a listed end date.",
    "events.item": "{count} · ends {date}",
    "events.itemNoDate": "{count}",

    "filters": "Filters",
    "filters.reset": "Reset",
    "filters.close": "Close filters",
    "filters.type": "Type",
    "filters.discount": "Discount",
    "filters.price": "Price",
    "filters.genre": "Genre",
    "filters.any": "Any",
    "filters.priceAny": "Any price",
    "filters.priceUpTo": "Up to {max}",
    "filters.priceFrom": "{min} and up",
    "filters.priceRange": "{min} – {max}",
    "filters.minPrice": "Minimum price",
    "filters.maxPrice": "Maximum price",
    "filters.show": "Show results",
    "filters.showCount": "Show {deals}",
    "filters.remove": "Remove filter: {label}",
    "filters.sale": "Sale event",

    "type.all": "Everything",
    "type.game": "Games",
    "type.dlc": "DLC",
    "type.bundle": "Bundles",
    "type.other": "Other",
    "kind.game": "Game",
    "kind.dlc": "DLC",
    "kind.bundle": "Bundle",
    "kind.other": "Other",

    "search": "Search deals",
    "search.placeholder": "Search Steam deals",

    "sort": "Sort",
    "sort.featured": "Featured",
    "sort.discount": "Biggest discount",
    "sort.ending": "Ending soonest",
    "sort.cheap": "Lowest price",
    "sort.expensive": "Highest price",
    "sort.savings": "Most money saved",
    "sort.az": "Title A–Z",
    "sort.za": "Title Z–A",
    "sort.discount-low": "Smallest discount",
    "view": "Layout",
    "view.full": "Grid",
    "view.compact": "List",

    "results.loading": "Loading deals…",
    "results.range": "Showing {from}–{to}",
    "results.unavailable": "Catalog unavailable",
    "perPage": "Per page",
    "page.prev": "Previous",
    "page.next": "Next",
    "page.label": "Page {n}",
    "pages": "Result pages",

    "empty.title": "No deals match.",
    "empty.body": "Try a shorter search, a wider price range or fewer genres.",
    "empty.reset": "Reset filters",
    "error.title": "Deals couldn’t load.",
    "error.body": "Check your connection and try again.",
    "error.retry": "Try again",

    "card.ends": "Ends {date}",
    "card.endsIn": "Ends {rel}",
    "card.ended": "May have ended",
    "card.topSeller": "Top seller",
    "card.topSellerHint": "On Steam’s top-sellers chart, which Steam ranks by revenue",
    "card.view": "View {title}",
    "card.steam": "Steam",
    "card.steamLabel": "Open {title} on Steam",

    "popularity.note": "Review counts come from Steam and show how widely a game is known, not how many copies sold. “Top seller” means the game is on Steam’s top-sellers chart, which Steam ranks by revenue. Sales figures aren’t public.",

    "toTop": "Back to top",
    "footer.note": "Prices are recorded from Steam and can change. Discounted doesn’t sell games.",
    "footer.updated": "Catalog updated {date}",

    "notice.eyebrow": "Price notice",
    "notice.title": "Steam has the final price.",
    "notice.body": "Discounted shows the prices we recorded during research. Steam prices, discounts, availability and regional pricing can change at any time, so the price on Steam may differ.",
    "notice.close": "Got it",
    "notice.never": "Don’t show again",

    "toast.copied": "Link copied",
    "toast.copyFailed": "Couldn’t copy. Copy the address from your browser.",
    "toast.reset": "Filters reset",
    "toast.unavailable": "Deals are unavailable. Try again.",

    "shortcuts.title": "Keyboard shortcuts",
    "shortcuts.search": "Search deals",
    "shortcuts.home": "Go home",
    "shortcuts.random": "Open a random deal",
    "shortcuts.close": "Close a panel",
    "shortcuts.done": "Done",

    "product.back": "All deals",
    "product.save": "You save {amount}",
    "product.was": "Was {price}",
    "product.open": "Open on Steam",
    "product.copy": "Copy link",
    "product.ends": "Offer ends {date}",
    "product.endsRel": "{rel}",
    "product.noEnd": "No end date listed",
    "product.ended": "This offer may have ended",
    "product.reviews": "Steam reviews",
    "product.reviewsUnknown": "Review count unavailable",
    "product.recorded": "Price recorded {date} · Source: {source}",
    "product.recordedNoSource": "Price recorded {date}",
    "product.fine": "Steam may show a different price in your region or after the offer changes.",
    "product.details": "Details",
    "product.genres": "Genres",
    "product.sale": "Promotion",
    "product.more": "More like this",
    "product.missingTitle": "Deal not found.",
    "product.missingBody": "This title isn’t in the current Discounted catalog. The offer may have ended or the link may have changed.",
    "product.missingCta": "Browse all deals",
    "product.loading": "Loading deal…",

    "how.eyebrow": "How Discounted works",
    "how.title": "One catalog for Steam discounts.",
    "how.lede": "Discounted collects Steam sale prices in one place so you can compare them quickly. Steam is always the final word on price.",
    "how.1.title": "Collect",
    "how.1.body": "Discounted games come from Steam’s specials listings. DLC, bundles and named sale events are researched by hand, with the offer end date when Steam lists one.",
    "how.2.title": "Record",
    "how.2.body": "Each listing keeps its price, discount and the source it was checked against. The product page shows that source and the date the catalog was updated.",
    "how.3.title": "Filter",
    "how.3.body": "Narrow by type, genre, discount and budget, or browse a sale event. Switch currencies to see estimated prices; conversions use current exchange rates.",
    "how.4.title": "Buy on Steam",
    "how.4.body": "Open the deal on Steam to confirm the price, region, requirements and offer details. Discounted doesn’t sell games or earn from purchases.",
    "how.popTitle": "What the popularity labels mean",
    "how.popReviews": "Steam reviews",
    "how.popReviewsBody": "The total number of user reviews on Steam. It’s a sign of how widely a game is known, not a count of copies sold.",
    "how.popTop": "Top seller",
    "how.popTopBody": "The game currently appears on Steam’s top-sellers chart, which Steam ranks by revenue. Discounted doesn’t estimate or publish sales numbers.",
    "how.featTitle": "How “Featured” orders deals",
    "how.featBody": "Featured lists deals from named sale events first, then everything else by the size of the discount. It isn’t paid placement.",
    "how.cta": "Browse deals",

    "404.title": "That page isn’t here.",
    "404.body": "The link may have changed, or the deal is no longer in the catalog.",
    "404.home": "Browse deals",
    "404.random": "Open a random deal",
  };

  const ar = {
    "skip": "تخطَّ إلى العروض",
    "skip.main": "تخطَّ إلى المحتوى",
    "brand.home": "الصفحة الرئيسية لموقع Discounted",
    "nav.deals": "العروض",
    "nav.how": "كيف يعمل",
    "nav.source": "الشيفرة المصدرية",
    "lang.switch": "English",
    "lang.switchLabel": "التبديل إلى الإنجليزية",
    "currency": "العملة",

    "intro.eyebrow": "تخفيضات ستيم",
    "intro.updated": "آخر تحديث {date}",
    "intro.title": "عروض ستيم، مرتّبة.",
    "intro.lede": "ألعاب ومحتوى إضافي وحزم مخفّضة الآن. صفِّ حسب التصنيف والميزانية ونسبة الخصم، ثم تأكد من السعر النهائي على ستيم.",
    "stat.count": "العروض المدرجة",
    "stat.lowest": "أقل سعر",
    "stat.deepest": "أكبر خصم",
    "stat.deadline": "أقرب موعد انتهاء",
    "stat.none": "لا يوجد",

    "events.title": "مواسم التخفيضات",
    "events.lede": "عروض بأسماء محددة وتاريخ انتهاء معلن.",
    "events.item": "{count} · ينتهي {date}",
    "events.itemNoDate": "{count}",

    "filters": "التصفية",
    "filters.reset": "إعادة الضبط",
    "filters.close": "إغلاق التصفية",
    "filters.type": "النوع",
    "filters.discount": "الخصم",
    "filters.price": "السعر",
    "filters.genre": "التصنيف",
    "filters.any": "الكل",
    "filters.priceAny": "أي سعر",
    "filters.priceUpTo": "حتى {max}",
    "filters.priceFrom": "من {min} فأكثر",
    "filters.priceRange": "{min} – {max}",
    "filters.minPrice": "أدنى سعر",
    "filters.maxPrice": "أعلى سعر",
    "filters.show": "عرض النتائج",
    "filters.showCount": "اعرض النتائج ({n})",
    "filters.remove": "إزالة عامل التصفية: {label}",
    "filters.sale": "موسم التخفيضات",

    "type.all": "الكل",
    "type.game": "ألعاب",
    "type.dlc": "محتوى إضافي",
    "type.bundle": "حزم",
    "type.other": "أخرى",
    "kind.game": "لعبة",
    "kind.dlc": "محتوى إضافي",
    "kind.bundle": "حزمة",
    "kind.other": "أخرى",

    "search": "ابحث في العروض",
    "search.placeholder": "ابحث في عروض ستيم",

    "sort": "الترتيب",
    "sort.featured": "المميزة",
    "sort.discount": "الأكبر خصمًا",
    "sort.ending": "الأقرب انتهاءً",
    "sort.cheap": "الأقل سعرًا",
    "sort.expensive": "الأعلى سعرًا",
    "sort.savings": "الأكثر توفيرًا",
    "sort.az": "العنوان أ–ي",
    "sort.za": "العنوان ي–أ",
    "sort.discount-low": "الأقل خصمًا",
    "view": "طريقة العرض",
    "view.full": "شبكة",
    "view.compact": "قائمة",

    "results.loading": "جارٍ تحميل العروض…",
    "results.range": "عرض {from}–{to}",
    "results.unavailable": "الكتالوج غير متاح",
    "perPage": "لكل صفحة",
    "page.prev": "السابق",
    "page.next": "التالي",
    "page.label": "الصفحة {n}",
    "pages": "صفحات النتائج",

    "empty.title": "لا توجد عروض مطابقة.",
    "empty.body": "جرّب بحثًا أقصر أو نطاق سعر أوسع أو تصنيفات أقل.",
    "empty.reset": "إعادة ضبط التصفية",
    "error.title": "تعذّر تحميل العروض.",
    "error.body": "تحقق من اتصالك ثم حاول مجددًا.",
    "error.retry": "حاول مجددًا",

    "card.ends": "ينتهي {date}",
    "card.endsIn": "ينتهي {rel}",
    "card.ended": "ربما انتهى العرض",
    "card.topSeller": "الأعلى مبيعًا",
    "card.topSellerHint": "ضمن قائمة ستيم للأعلى مبيعًا، التي يرتّبها ستيم حسب الإيرادات",
    "card.view": "عرض {title}",
    "card.steam": "ستيم",
    "card.steamLabel": "فتح {title} على ستيم",

    "popularity.note": "أعداد المراجعات مأخوذة من ستيم وتدل على مدى شهرة اللعبة، لا على عدد النسخ المبيعة. تعني «الأعلى مبيعًا» أن اللعبة ضمن قائمة ستيم للأعلى مبيعًا التي يرتّبها ستيم حسب الإيرادات. أرقام المبيعات غير معلنة.",

    "toTop": "العودة إلى الأعلى",
    "footer.note": "الأسعار مسجّلة من ستيم وقد تتغير. Discounted لا يبيع الألعاب.",
    "footer.updated": "آخر تحديث للكتالوج {date}",

    "notice.eyebrow": "تنبيه بشأن الأسعار",
    "notice.title": "السعر النهائي لدى ستيم.",
    "notice.body": "يعرض Discounted الأسعار التي سجّلناها أثناء البحث. قد تتغير أسعار ستيم وخصوماته وتوفّر المنتجات والأسعار الإقليمية في أي وقت، لذا قد يختلف السعر على ستيم.",
    "notice.close": "حسنًا",
    "notice.never": "لا تعرضه مجددًا",

    "toast.copied": "تم نسخ الرابط",
    "toast.copyFailed": "تعذّر النسخ. انسخ العنوان من المتصفح.",
    "toast.reset": "تمت إعادة ضبط التصفية",
    "toast.unavailable": "العروض غير متاحة. حاول مجددًا.",

    "shortcuts.title": "اختصارات لوحة المفاتيح",
    "shortcuts.search": "البحث في العروض",
    "shortcuts.home": "الانتقال إلى الرئيسية",
    "shortcuts.random": "فتح عرض عشوائي",
    "shortcuts.close": "إغلاق اللوحة",
    "shortcuts.done": "تم",

    "product.back": "كل العروض",
    "product.save": "توفّر {amount}",
    "product.was": "كان {price}",
    "product.open": "افتح على ستيم",
    "product.copy": "نسخ الرابط",
    "product.ends": "ينتهي العرض {date}",
    "product.endsRel": "{rel}",
    "product.noEnd": "لا يوجد تاريخ انتهاء معلن",
    "product.ended": "ربما انتهى هذا العرض",
    "product.reviews": "مراجعات ستيم",
    "product.reviewsUnknown": "عدد المراجعات غير متاح",
    "product.recorded": "سُجّل السعر {date} · المصدر: {source}",
    "product.recordedNoSource": "سُجّل السعر {date}",
    "product.fine": "قد يعرض ستيم سعرًا مختلفًا في منطقتك أو بعد تغيّر العرض.",
    "product.details": "التفاصيل",
    "product.genres": "التصنيفات",
    "product.sale": "العرض الترويجي",
    "product.more": "عروض مشابهة",
    "product.missingTitle": "العرض غير موجود.",
    "product.missingBody": "هذا العنوان ليس ضمن كتالوج Discounted الحالي. ربما انتهى العرض أو تغيّر الرابط.",
    "product.missingCta": "تصفح كل العروض",
    "product.loading": "جارٍ تحميل العرض…",

    "how.eyebrow": "كيف يعمل Discounted",
    "how.title": "كتالوج واحد لتخفيضات ستيم.",
    "how.lede": "يجمع Discounted أسعار تخفيضات ستيم في مكان واحد لتقارن بينها بسرعة. يبقى ستيم المرجع النهائي للسعر.",
    "how.1.title": "الجمع",
    "how.1.body": "تأتي الألعاب المخفّضة من قوائم العروض الخاصة في ستيم. أما المحتوى الإضافي والحزم ومواسم التخفيضات فتُبحث يدويًا، مع تاريخ انتهاء العرض إن أعلنه ستيم.",
    "how.2.title": "التسجيل",
    "how.2.body": "يحتفظ كل عرض بسعره ونسبة خصمه والمصدر الذي تم التحقق منه. تعرض صفحة المنتج هذا المصدر وتاريخ تحديث الكتالوج.",
    "how.3.title": "التصفية",
    "how.3.body": "صفِّ حسب النوع والتصنيف والخصم والميزانية، أو تصفح موسم تخفيضات. غيّر العملة لرؤية أسعار تقديرية وفق أسعار الصرف الحالية.",
    "how.4.title": "الشراء من ستيم",
    "how.4.body": "افتح العرض على ستيم لتأكيد السعر والمنطقة والمتطلبات وتفاصيل العرض. لا يبيع Discounted الألعاب ولا يربح من عمليات الشراء.",
    "how.popTitle": "ماذا تعني مؤشرات الشهرة",
    "how.popReviews": "مراجعات ستيم",
    "how.popReviewsBody": "إجمالي مراجعات المستخدمين على ستيم. وهو مؤشر على مدى شهرة اللعبة، وليس عدد النسخ المبيعة.",
    "how.popTop": "الأعلى مبيعًا",
    "how.popTopBody": "اللعبة ظاهرة حاليًا في قائمة ستيم للأعلى مبيعًا، التي يرتّبها ستيم حسب الإيرادات. لا يقدّر Discounted أرقام المبيعات ولا ينشرها.",
    "how.featTitle": "كيف يرتّب خيار «المميزة» العروض",
    "how.featBody": "يعرض خيار «المميزة» عروض مواسم التخفيضات المسمّاة أولًا، ثم بقية العروض حسب حجم الخصم. لا توجد مواضع مدفوعة.",
    "how.cta": "تصفح العروض",

    "404.title": "هذه الصفحة غير موجودة.",
    "404.body": "ربما تغيّر الرابط، أو لم يعد العرض ضمن الكتالوج.",
    "404.home": "تصفح العروض",
    "404.random": "فتح عرض عشوائي",
  };

  // Counted nouns. Arabic uses the CLDR plural categories (zero, one, two, few, many, other).
  const plurals = {
    en: {
      deals: { one: "{n} deal", other: "{n} deals" },
      reviews: { one: "{n} review", other: "{n} reviews" },
    },
    ar: {
      deals: { zero: "لا عروض", one: "عرض واحد", two: "عرضان", few: "{n} عروض", many: "{n} عرضًا", other: "{n} عرض" },
      reviews: { zero: "لا مراجعات", one: "مراجعة واحدة", two: "مراجعتان", few: "{n} مراجعات", many: "{n} مراجعة", other: "{n} مراجعة" },
    },
  };

  const genres = {
    "Action": "أكشن", "Adventure": "مغامرات", "RPG": "تقمّص الأدوار", "Strategy": "استراتيجية",
    "Simulation": "محاكاة", "Casual": "خفيفة", "Indie": "مستقلة", "Racing": "سباقات", "Sports": "رياضة",
    "Massively Multiplayer": "جماعية واسعة", "Puzzle": "ألغاز", "Horror": "رعب", "Survival": "نجاة",
    "Open World": "عالم مفتوح",
  };

  let language = "en";
  try { language = localStorage.getItem(KEY) === "ar" ? "ar" : "en"; } catch {}
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === "ar" ? "rtl" : "ltr";

  // Latin digits keep prices, dates and Steam titles consistent in both languages.
  const locale = language === "ar" ? "ar-u-nu-latn" : "en-US";
  const table = language === "ar" ? ar : en;
  const pluralRules = new Intl.PluralRules(locale);
  const numberFormat = new Intl.NumberFormat(locale);

  function fill(template, vars = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
  }
  function t(key, vars) {
    return fill(table[key] ?? en[key] ?? key, vars);
  }
  function count(noun, n, formatted) {
    const forms = plurals[language][noun] || plurals.en[noun];
    const category = pluralRules.select(n);
    const form = forms[category] ?? forms.other;
    return fill(form, { n: formatted ?? numberFormat.format(n) });
  }
  function number(n, options) {
    return options ? new Intl.NumberFormat(locale, options).format(n) : numberFormat.format(n);
  }
  function date(value, options = { month: "short", day: "numeric" }) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(d);
  }
  const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  function relative(ms) {
    const minutes = Math.round(ms / 60000);
    if (Math.abs(minutes) < 60) return relativeFormat.format(Math.max(1, minutes), "minute");
    const hours = Math.round(ms / 3600000);
    if (Math.abs(hours) < 48) return relativeFormat.format(hours, "hour");
    return relativeFormat.format(Math.floor(ms / 86400000), "day");
  }
  function genre(name) {
    return language === "ar" ? genres[name] || name : name;
  }

  // Elements declare their strings with data-i18n="key" and data-i18n-attr="attr:key;attr:key".
  function apply(scope = document) {
    if (language === "en") return;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((part) => part.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  function setLanguage(next) {
    try { localStorage.setItem(KEY, next); } catch {}
    location.reload();
  }

  window.I18n = { t, count, number, date, relative, genre, apply, setLanguage, language: () => language, locale };

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    if (language === "ar") {
      const title = document.querySelector("[data-i18n-title]");
      if (title) document.title = `Discounted — ${t(title.dataset.i18nTitle)}`;
    }
    root.classList.remove("i18n-pending");
  });
})();
