/* Storefront UI strings. Steam game names and promotion names retain their source language. */
(() => {
  const KEY = "discounted:language";
  const ar = {
    "Skip to content":"تخطَّ إلى المحتوى", "Language":"اللغة", "Currency":"العملة",
    "How it works":"كيف يعمل", "Source":"المصدر", "Find a good deal.":"اعثر على عرض جيد.",
    "Get back to playing.":"وعُد إلى اللعب.", "Browse researched Steam discounts on games, DLC and bundles.":"تصفح تخفيضات ستيم على الألعاب والإضافات والحزم.",
    "Browse deals":"تصفح العروض", "See how it works":"اعرف كيف يعمل", "Steam promotions can change.":"قد تتغير عروض ستيم.",
    "Featured deal":"عرض مميز", "View deal":"عرض التفاصيل", "Copy":"نسخ", "Save":"وفّر",
    "Results":"النتائج", "Loading deals…":"جارٍ تحميل العروض…", "Search":"بحث", "Sort":"الترتيب", "View":"العرض",
    "A to Z":"من أ إلى ي", "Z to A":"من ي إلى أ", "Cheapest first":"الأقل سعرًا", "Most expensive first":"الأعلى سعرًا",
    "Biggest discount":"أكبر خصم", "Smallest discount":"أقل خصم", "Most money saved":"أكبر توفير",
    "Cards":"بطاقات", "Compact":"مختصر", "All":"الكل", "Games":"ألعاب", "Bundles":"حزم", "Game":"لعبة", "Bundle":"حزمة", "Other":"أخرى",
    "Filters":"المرشحات", "Clear filters":"مسح المرشحات", "Genres":"التصنيفات", "Price range":"نطاق السعر", "Discount":"الخصم",
    "Show more":"عرض المزيد", "Show less":"عرض أقل", "Previous":"السابق", "Next":"التالي", "Back to top":"العودة للأعلى",
    "Steam promotion":"عرض ستيم", "Steam":"ستيم", "VIEW":"عرض", "Top seller":"الأكثر مبيعًا", "Widely reviewed":"كثيرة التقييمات", "Fewer reviews":"قليلة التقييمات",
    "Steam reviews":"تقييمات ستيم", "deals found":"عرضًا", "Checking…":"جارٍ التحقق…", "Unavailable":"غير متاح", "Steam reviews unavailable":"تقييمات ستيم غير متاحة",
    "Checking Steam reviews…":"جارٍ التحقق من تقييمات ستيم…", "Popularity uses Steam review totals. “Top seller” means listed on Steam’s revenue chart; sales counts are not public.":"تُقاس الشهرة بعدد تقييمات ستيم. تعني «الأكثر مبيعًا» الظهور في قائمة ستيم للإيرادات؛ أعداد المبيعات غير معلنة.",
    "Back to deals":"العودة للعروض", "Open on Steam":"افتح على ستيم", "Copy link":"نسخ الرابط",
    "You may also like":"قد يعجبك أيضًا", "More deals like this":"عروض مشابهة", "Deal not found.":"العرض غير موجود.",
    "This title is not in the current Discounted snapshot.":"هذا العنوان غير موجود في قائمة العروض الحالية.", "Return to catalog":"العودة للكتالوج",
    "HOW DISCOUNTED WORKS":"كيف يعمل الموقع", "One place for Steam discounts.":"مكان واحد لتخفيضات ستيم.",
    "Browse":"تصفح", "See current listings.":"اطلع على العروض الحالية.",
    "We bring discounted Steam games, DLC and bundles into one catalog. Every listing comes from the current sale snapshot, so you can browse across promotions in one place.":"نجمع ألعاب ستيم المخفضة والإضافات والحزم في كتالوج واحد. تعرض كل قائمة بيانات العروض الحالية لتتمكن من تصفحها معًا.",
    "Cheapest deal":"أقل سعر", "Largest discount":"أكبر خصم", "Ending soonest":"ينتهي قريبًا", "Digging…":"جارٍ البحث…", "Finding a deal…":"جارٍ العثور على عرض…",
    "DEALS TRACKED":"عروض مرصودة", "FEATURED DISCOUNTS":"خصومات مميزة", "Deep discounts":"خصومات كبيرة", "90% off or more.":"خصم ٩٠٪ أو أكثر.",
    "BROWSE":"تصفح", "All deals":"كل العروض", "Search and filter the current catalog.":"ابحث وصفِّ العروض الحالية.",
    "Close ×":"إغلاق ×", "Refine results":"تحسين النتائج", "Reset":"إعادة تعيين", "Product type":"نوع المنتج", "All products":"كل المنتجات",
    "Any":"الكل", "Genre":"التصنيف", "Budget":"الميزانية", "Show":"عرض", "Updated —":"تم التحديث —",
    "No matching deals.":"لا توجد عروض مطابقة.", "Try another search or reset your filters.":"جرّب بحثًا آخر أو امسح المرشحات.",
    "Reset filters":"مسح المرشحات", "Deals are unavailable.":"العروض غير متاحة.", "Try again.":"حاول مجددًا.", "Retry":"إعادة المحاولة",
    "PRICE NOTICE":"تنبيه الأسعار", "Steam prices may differ.":"قد تختلف أسعار ستيم.", "Close":"إغلاق", "Don’t show again":"لا تعرضه مجددًا",
    "Verify":"تحقق", "Know what you’re looking at.":"اعرف تفاصيل العرض.", "Filter what matters.":"صفِّ ما يهمك.", "Play":"العب", "Your next stop: Steam.":"وجهتك التالية: ستيم.",
    "Each listing keeps its source in “verified by”, along with the listed offer end date. Some offers are grounded in a sale event; others are checked on a Steam offer page. The product page tells you which.":"يعرض كل منتج مصدر التحقق وتاريخ انتهاء العرض المذكور. تستند بعض العروض إلى حدث تخفيضات، ويُتحقق من غيرها عبر صفحة العرض في ستيم.",
    "Narrow by product type, genre, discount, and budget, or switch currencies to compare estimated prices.":"حدد نوع المنتج والتصنيف والخصم والميزانية، أو غيّر العملة لمقارنة الأسعار التقريبية.",
    "Open the deal on Steam to check the current price, region, requirements and offer details before buying. Discounted does not sell games. Steam prices and promotions can change.":"افتح العرض في ستيم للتحقق من السعر الحالي والمنطقة والمتطلبات وتفاصيل العرض قبل الشراء. لا يبيع الموقع الألعاب. قد تتغير الأسعار والعروض.",
    "Browse deals ↗":"تصفح العروض ↗", "That page isn’t here.":"هذه الصفحة غير موجودة.",
    "The link may have changed, or the deal is no longer in our catalog.":"ربما تغيّر الرابط أو لم يعد العرض ضمن قائمتنا.", "Surprise me":"اقترح عرضًا",
    "Page not found":"الصفحة غير موجودة", "Go home":"العودة للرئيسية", "English":"English"
  };
  let language = "en";
  try { language = localStorage.getItem(KEY) === "ar" ? "ar" : "en"; } catch {}
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  function t(value) { return language === "ar" ? (ar[value] || value) : value; }
  function translate(root = document) {
    if (language !== "ar") return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement?.closest("script,style,svg,option,[data-no-translate]")) return;
      const trimmed = node.nodeValue.trim().replace(/\s+/g, " ");
      if (ar[trimmed]) node.nodeValue = node.nodeValue.replace(/\S[\s\S]*\S|\S/, ar[trimmed]);
    });
    root.querySelectorAll?.("[placeholder]").forEach((el) => {
      if (el.placeholder === "Search games, DLC, bundles or promotions") el.placeholder = "ابحث عن ألعاب أو إضافات أو حزم أو عروض";
    });
    root.querySelectorAll?.("option").forEach((el) => { if (ar[el.textContent.trim()]) el.textContent = ar[el.textContent.trim()]; });
  }
  window.I18n = { t, translate, language: () => language };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".language-select").forEach((select) => {
      select.value = language;
      select.addEventListener("change", () => {
        try { localStorage.setItem(KEY, select.value); } catch {}
        location.reload();
      });
    });
    translate();
  });
})();
