const confirmationText =
    "This site shouldn't be blocked. I accept the risks, and I won't regret this choice.";
const REMINDER_STORAGE_KEY = "AmnGaze-contextual-premium-reminders";
const BLOCKED_REMINDER_KEY = "blockedCompanionDismissedAt";
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const BLOCKED_REMINDER_TRANSLATIONS = {
    en: {
        eyebrow: "Extra Accountability",
        title: "Want more support after moments like this?",
        description:
            "Companion Alerts can notify a trusted person when a harmful site attempt is blocked, giving you an extra layer of accountability when you need it most.",
        cta: "Set up Companion Alerts",
        dismiss: "Not now",
        dir: "ltr",
    },
    ar: {
        eyebrow: "مساءلة إضافية",
        title: "هل تريد دعماً أكثر بعد مواقف كهذه؟",
        description:
            "يمكن لتنبيهات المرافق إشعار شخص موثوق عندما يتم حظر محاولة دخول موقع ضار، لتمنحك طبقة إضافية من المساءلة عندما تحتاجها أكثر.",
        cta: "إعداد تنبيهات المرافق",
        dismiss: "ليس الآن",
        dir: "rtl",
    },
    tr: {
        eyebrow: "Ek Hesap Verebilirlik",
        title: "Böyle anlardan sonra daha fazla destek ister misiniz?",
        description:
            "Refakatçi Uyarıları, zararlı bir site girişimi engellendiğinde güvendiğiniz bir kişiye haber verebilir ve en çok ihtiyaç duyduğunuz anda size ek bir hesap verebilirlik katmanı sağlayabilir.",
        cta: "Refakatçi Uyarılarını Ayarla",
        dismiss: "Şimdi değil",
        dir: "ltr",
    },
    ur: {
        eyebrow: "اضافی جواب دہی",
        title: "کیا آپ ایسے لمحوں کے بعد مزید سہارا چاہتے ہیں؟",
        description:
            "کمپینین الرٹس کسی نقصان دہ سائٹ کی کوشش بلاک ہونے پر ایک قابلِ اعتماد شخص کو مطلع کر سکتے ہیں، تاکہ جب آپ کو زیادہ ضرورت ہو تو آپ کو اضافی جواب دہی مل سکے۔",
        cta: "کمپینین الرٹس سیٹ کریں",
        dismiss: "ابھی نہیں",
        dir: "rtl",
    },
};

function buildFocusedOptionsUrl(feature, source) {
    const url = new URL(chrome.runtime.getURL("dist/options/options.html"));
    url.searchParams.set("focusFeature", feature);
    url.searchParams.set("source", source);
    return url.toString();
}

async function getReminderState() {
    const storage = await chrome.storage.local.get([REMINDER_STORAGE_KEY]);
    return storage[REMINDER_STORAGE_KEY] || {};
}

async function setReminderDismissed(reminderKey) {
    const reminderState = await getReminderState();
    reminderState[reminderKey] = Date.now();
    await chrome.storage.local.set({
        [REMINDER_STORAGE_KEY]: reminderState,
    });
}

async function isReminderDismissed(reminderKey) {
    const reminderState = await getReminderState();
    const dismissedAt = reminderState[reminderKey];

    if (typeof dismissedAt !== "number") return false;

    return Date.now() - dismissedAt < REMINDER_COOLDOWN_MS;
}

async function shouldShowCompanionReminder(syncSettings) {
    const isDismissed = await isReminderDismissed(BLOCKED_REMINDER_KEY);

    if (isDismissed) return false;

    return !Boolean(syncSettings?.companionMode?.enabled);
}

function applyCompanionReminderTranslations(language) {
    const reminderCard = document.getElementById("companion-reminder");
    const reminderTranslations =
        BLOCKED_REMINDER_TRANSLATIONS[language] ||
        BLOCKED_REMINDER_TRANSLATIONS.en;

    const translationTargets = {
        "companion-reminder-eyebrow": reminderTranslations.eyebrow,
        "companion-reminder-title": reminderTranslations.title,
        "companion-reminder-description": reminderTranslations.description,
        "setup-companion-alerts": reminderTranslations.cta,
        "dismiss-companion-reminder": reminderTranslations.dismiss,
    };

    Object.entries(translationTargets).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    });

    document.documentElement.lang = language;

    if (reminderCard) {
        reminderCard.dir = reminderTranslations.dir;
    }
}

async function initCompanionReminder() {
    const reminder = document.getElementById("companion-reminder");
    const setupButton = document.getElementById("setup-companion-alerts");
    const dismissButton = document.getElementById("dismiss-companion-reminder");

    if (!reminder || !setupButton || !dismissButton) return;

    setupButton.addEventListener("click", async () => {
        await chrome.tabs.create({
            url: buildFocusedOptionsUrl(
                "companion_mode",
                "blocked_site_reminder"
            ),
        });
    });

    dismissButton.addEventListener("click", async () => {
        await setReminderDismissed(BLOCKED_REMINDER_KEY);
        reminder.classList.add("hidden");
    });

    const syncStorage = await chrome.storage.sync.get(["AmnGaze-settings"]);
    const syncSettings = syncStorage["AmnGaze-settings"] || {};
    applyCompanionReminderTranslations(syncSettings.language || "en");

    if (await shouldShowCompanionReminder(syncSettings)) {
        reminder.classList.remove("hidden");
    }
}

function reportAndUnblock() {
    const e = new URLSearchParams(window.location.search).get("url");
    chrome.runtime.sendMessage(
        { type: "AmnGaze-reportBlockedSite", url: e },
        (t) => {
            t.success && window.location.replace(e);
        }
    );
}

document.getElementById("go-back").addEventListener("click", (e) => {
    e.preventDefault(), history.back();
});

document
    .getElementById("report-false-positive")
    .addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("confirmation-modal").style.display = "flex";
        document.getElementById("confirmation-text").innerText =
            confirmationText;
        document.getElementById("confirmation-input").focus();
        document
            .getElementById("cancel-unblock")
            .addEventListener("click", (e) => {
                e.preventDefault(), history.back();
            });
    });

document.getElementById("confirmation-input").addEventListener("input", (e) => {
    const t = e.target.value,
        n = document.getElementById("confirm-unblock"),
        o = document.getElementById("error-message");
    t === confirmationText
        ? ((n.disabled = !1), (o.style.display = "none"))
        : ((n.disabled = !0), (o.style.display = "block"));
});

document
    .getElementById("confirm-unblock")
    .addEventListener("click", reportAndUnblock);

document.getElementById("confirmation-modal").addEventListener("click", (e) => {
    e.target === e.currentTarget &&
        ((e.target.style.display = "none"),
        (document.getElementById("confirmation-input").value = ""),
        (document.getElementById("confirm-unblock").disabled = !0),
        (document.getElementById("error-message").style.display = "none"));
});

const checkDNS = async function () {
    const url = new URLSearchParams(window.location.search).get("url");
    const response = await fetch(
        `https://dnsforfamily.com/api/checkHost?hostnames[]=${url}`
    );
    const data = await response.json();
    const { result } = data;
    const matchedKey = Object.keys(result)?.find((key) => url.includes(key));

    if (result[matchedKey] == 1) {
        // Site is confirmed harmful
        document.body.style.visibility = "visible";

        // Send notification to background script for companion mode email
        chrome.runtime.sendMessage({
            type: "AmnGaze-harmfulSiteBlocked",
            url,
        });

        await initCompanionReminder();
    } else {
        // False positive, unblock
        reportAndUnblock();
    }
};

checkDNS();
