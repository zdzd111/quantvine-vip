import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en" | "ku" | "es";

export const LANGUAGES: Array<{ code: Lang; label: string; dir: "rtl" | "ltr" }> = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
  { code: "ku", label: "کوردی / Kurdî", dir: "rtl" },
  { code: "es", label: "Español", dir: "ltr" },
];

const ORDER: Lang[] = ["ar", "en", "ku", "es"];

/** [ar, en, ku, es] */
const DICT: Record<string, [string, string, string, string]> = {
  "nav.home": ["الصفحة الرئيسية", "Home", "پەڕەی سەرەکی", "Inicio"],
  "nav.team": ["فريقي", "My Team", "تیمەکەم", "Mi equipo"],
  "nav.quant": ["تحديد الكمية", "Quant", "دیاریکردنی بڕ", "Cuant."],
  "nav.wallet": ["المحفظة المالية", "Wallet", "جزدان", "Cartera"],
  "nav.profile": ["ملكي", "Profile", "هی من", "Perfil"],

  "common.usdt": ["الأصول المتاحة (USDT)", "Available assets (USDT)", "سامانی بەردەست (USDT)", "Activos disponibles (USDT)"],
  "common.today_earnings": ["أرباح اليوم", "Today's earnings", "قازانجی ئەمڕۆ", "Ganancias de hoy"],
  "common.yesterday_earnings": ["أرباح الأمس", "Yesterday's earnings", "قازانجی دوێنێ", "Ganancias de ayer"],
  "common.total_revenue": ["إجمالي الإيرادات", "Total revenue", "کۆی داهات", "Ingresos totales"],
  "common.team_commission": ["عمولة الفريق", "Team commission", "کۆمیسیۆنی تیم", "Comisión de equipo"],
  "common.today_commission": ["عمولة اليوم", "Today's commission", "کۆمیسیۆنی ئەمڕۆ", "Comisión de hoy"],
  "common.copy": ["نسخ العنوان", "Copy address", "لەبەرگرتنەوەی ناونیشان", "Copiar dirección"],
  "common.copied": ["تم نسخ العنوان بنجاح", "Address copied successfully", "ناونیشان کۆپی کرا", "Dirección copiada"],
  "common.copy_failed": ["تعذر النسخ", "Copy failed", "کۆپیکردن سەرکەوتوو نەبوو", "No se pudo copiar"],
  "common.network": ["الشبكة", "Network", "تۆڕ", "Red"],
  "common.amount": ["المبلغ", "Amount", "بڕ", "Importe"],
  "common.sending": ["جارٍ الإرسال...", "Sending...", "ناردن...", "Enviando..."],
  "common.deposit": ["تعبئة رصيد", "Deposit", "پڕکردنەوەی باڵانس", "Depositar"],
  "common.withdraw": ["ينسحب", "Withdraw", "دەرکردنی پارە", "Retirar"],
  "common.language": ["اللغة", "Language", "زمان", "Idioma"],

  "home.invite": ["ادعو أصدقاء", "Invite friends", "بانگهێشتی هاوڕێ", "Invitar amigos"],
  "home.agency": ["تعاون وكيل", "Agency", "هاوکاری بریکار", "Agencia"],
  "home.market": ["سوق العملات الرقمية", "Crypto market", "بازاڕی ئەرزی دیجیتاڵ", "Mercado cripto"],
  "home.live": ["مباشر", "Live", "ڕاستەوخۆ", "En vivo"],
  "home.notifications": ["الإشعارات", "Notifications", "ئاگادارکردنەوەکان", "Notificaciones"],
  "home.no_notifications": ["لا توجد إشعارات جديدة", "No new notifications", "هیچ ئاگادارکردنەوەیەکی نوێ نییە", "Sin notificaciones nuevas"],
  "home.online": ["مستخدم نشط الآن", "users online now", "بەکارهێنەری چالاک ئێستا", "usuarios activos ahora"],

  "sec.ssl": ["اتصال SSL آمن", "SSL Secured", "پەیوەندی SSL پارێزراو", "SSL seguro"],
  "sec.enc": ["تشفير كامل", "Encrypted", "کۆدکراو", "Cifrado"],
  "sec.protect": ["حماية 24/7", "24/7 Protection", "پاراستنی ٢٤/٧", "Protección 24/7"],

  "welcome.title": [
    "أهلاً بك في منصة Quantvine للتدوال الكمي الذكي 🚀",
    "Welcome to Quantvine — smart quantitative trading 🚀",
    "بەخێربێیت بۆ پلاتفۆرمی Quantvine بۆ بازرگانی کوانتی زیرەک 🚀",
    "Bienvenido a Quantvine — trading cuantitativo inteligente 🚀",
  ],
  "welcome.desc": [
    "تعمل خوارزميات الذكاء الاصطناعي لدينا على تنفيذ صفقات كمية آلية على أسواق USDT على مدار الساعة، لتمنحك عوائد يومية ثابتة دون خبرة مسبقة. الإيداع والسحب يُنفّذان بسرعة عبر شبكتي TRC-20 وBEP-20، وتحصل على عمولات فورية من ثلاثة مستويات عند دعوة أصدقائك.",
    "Our AI algorithms run automated quantitative trades on USDT markets around the clock, delivering steady daily yields with no experience required. Deposits and withdrawals execute fast over TRC-20 and BEP-20, and you earn instant 3-level referral bonuses.",
    "ئەلگۆریتمەکانی زیرەکی دەستکردمان بازرگانیی کوانتی خۆکار لە بازاڕی USDT جێبەجێ دەکەن بە درێژایی ڕۆژ، بۆ قازانجی ڕۆژانەی جێگیر بەبێ ئەزموون. دانان و دەرکردن بە خێرایی لە TRC-20 و BEP-20، لەگەڵ پاداشتی ڕاستەوخۆی سێ ئاست بۆ بانگهێشتکردن.",
    "Nuestros algoritmos de IA ejecutan operaciones cuantitativas automáticas en los mercados USDT las 24 horas, con rendimientos diarios estables sin experiencia previa. Depósitos y retiros rápidos por TRC-20 y BEP-20, además de bonos de referidos de 3 niveles.",
  ],
  "welcome.cta": ["ابدأ التداول الآن", "Start trading now", "ئێستا دەست بکە بە بازرگانی", "Empezar ahora"],

  "deposit.title": ["تعبئة رصيد", "Deposit", "پڕکردنەوەی باڵانس", "Depositar"],
  "deposit.address": ["عنوان المحفظة", "Wallet address", "ناونیشانی جزدان", "Dirección de la cartera"],
  "deposit.amount": ["مبلغ التعبئة ($)", "Deposit amount ($)", "بڕی پڕکردنەوە ($)", "Importe del depósito ($)"],
  "deposit.submit": ["إرسال طلب التعبئة", "Submit deposit request", "ناردنی داواکاری", "Enviar solicitud"],
  "deposit.notice": [
    "تستغرق عملية وصول الأموال والمراجعة من 3 دقائق إلى 10 دقائق تلقائياً. يُرجى التأكد من تحويل المبلغ المطلوب بدقة عبر الشبكة المحددة لضمان السرعة والإنجاز.",
    "Funds arrive and are reviewed automatically within 3 to 10 minutes. Please make sure to transfer the exact amount over the selected network to guarantee fast completion.",
    "گەیشتن و پێداچوونەوەی پارەکە بە شێوەی خۆکار لە نێوان ٣ بۆ ١٠ خولەک دەخایەنێت. تکایە دڵنیابە لە گواستنەوەی هەمان بڕ بە هەمان تۆڕی دیاریکراو.",
    "La llegada y revisión de los fondos tarda de 3 a 10 minutos automáticamente. Asegúrate de transferir el importe exacto por la red seleccionada.",
  ],
  "deposit.sent": ["تم إرسال طلب التعبئة، سيتم مراجعته قريباً", "Deposit request sent, review in progress", "داواکاری نێردرا، بەمزوانە پێداچوونەوەی بۆ دەکرێت", "Solicitud enviada, en revisión"],
  "deposit.invalid": ["يُرجى إدخال مبلغ صحيح", "Please enter a valid amount", "تکایە بڕێکی دروست بنووسە", "Introduce un importe válido"],

  "withdraw.title": ["ينسحب", "Withdraw", "دەرکردنی پارە", "Retirar"],
  "withdraw.address": ["عنوان المحفظة", "Wallet address", "ناونیشانی جزدان", "Dirección de la cartera"],
  "withdraw.amount": ["مبلغ السحب ($)", "Withdrawal amount ($)", "بڕی دەرکردن ($)", "Importe del retiro ($)"],
  "withdraw.all": ["سحب الكل", "Withdraw all", "هەمووی دەربکە", "Retirar todo"],
  "withdraw.min": ["الحد الأدنى للسحب $10. تتم مراجعة الطلبات يدوياً وقد تستغرق حتى 24 ساعة.", "Minimum withdrawal is $10. Requests are reviewed and may take up to 24 hours.", "کەمترین بڕی دەرکردن $10 ە. داواکارییەکان تا ٢٤ کاتژمێر پێداچوونەوەیان بۆ دەکرێت.", "El retiro mínimo es $10. Las solicitudes pueden tardar hasta 24 horas."],
  "withdraw.min_error": ["الحد الأدنى للسحب هو $10", "Minimum withdrawal is $10", "کەمترین بڕی دەرکردن $10 ە", "El retiro mínimo es $10"],
  "withdraw.bad_address": ["عنوان المحفظة غير صالح للشبكة المختارة", "Invalid wallet address for the selected network", "ناونیشانی جزدان بۆ ئەم تۆڕە دروست نییە", "Dirección no válida para la red elegida"],
  "withdraw.insufficient": ["الرصيد المتاح غير كافٍ", "Insufficient balance", "باڵانس پێویست نییە", "Saldo insuficiente"],
  "withdraw.submit": ["تأكيد السحب", "Confirm withdrawal", "پشتڕاستکردنەوە", "Confirmar retiro"],
  "withdraw.sent": ["تم إرسال طلب السحب، سيتم مراجعته قريباً", "Withdrawal request sent", "داواکاری دەرکردن نێردرا", "Solicitud de retiro enviada"],

  "wallet.title": ["المحفظة المالية", "Wallet", "جزدانی دارایی", "Cartera"],
  "wallet.history": ["سجل المعاملات", "Transaction history", "مێژووی مامەڵەکان", "Historial de transacciones"],
  "wallet.empty": ["لا توجد معاملات بعد", "No transactions yet", "هێشتا هیچ مامەڵەیەک نییە", "Aún no hay transacciones"],

  "tx.received": ["تم الاستلام", "Received", "وەرگیرا", "Recibido"],
  "tx.review": ["قيد المراجعة", "Under review", "لە پێداچوونەوەدا", "En revisión"],
  "tx.done": ["مكتمل", "Completed", "تەواو بوو", "Completado"],
  "tx.rejected": ["مرفوض", "Rejected", "ڕەتکرایەوە", "Rechazado"],
  "tx.reason": ["سبب الرفض", "Rejection reason", "هۆکاری ڕەتکردنەوە", "Motivo del rechazo"],

  "quant.title": ["تحديد الكمية", "Quantification", "دیاریکردنی بڕ", "Cuantificación"],
  "quant.start": ["تقدير بداية واحدة", "Start one round", "دەستپێکردنی یەک خول", "Iniciar una ronda"],
  "quant.running": ["جاري التحديد الكمي لأسواق USDT...", "Quantifying USDT markets...", "دیاریکردنی کوانتی بازاڕی USDT...", "Cuantificando mercados USDT..."],
  "quant.done_all": ["اكتملت مهام اليوم", "Today's tasks completed", "ئەرکەکانی ئەمڕۆ تەواو بوون", "Tareas de hoy completadas"],
  "quant.low_balance": ["رصيدك الحالي غير كافٍ لتشغيل المهمة، الحد الأدنى هو $35", "Your balance is too low to run the task, the minimum is $35", "باڵانسەکەت بەس نییە بۆ ئەرکەکە، کەمترین بڕ $35 ە", "Tu saldo es insuficiente, el mínimo es $35"],
  "quant.success": ["تم إكمال المهمة بنجاح!", "Task completed successfully!", "ئەرکەکە بە سەرکەوتوویی تەواو بوو!", "¡Tarea completada con éxito!"],
  "quant.earned": ["كسبت", "You earned", "قازانجت کرد", "Has ganado"],
  "quant.reset_in": ["تتجدد المهام اليومية خلال", "Daily tasks reset in", "ئەرکە ڕۆژانەکان نوێ دەبنەوە لە", "Las tareas se reinician en"],
  "quant.team_card": [
    "كلما أكمل فريقك مهامهم اليومية، تجني أنت 10% من أرباحهم تلقائياً!",
    "Every time your team completes their daily tasks, you automatically earn 10% of their profits!",
    "هەر کاتێک تیمەکەت ئەرکە ڕۆژانەکانیان تەواو دەکەن، تۆ بە خۆکاری ١٠٪ی قازانجیان وەردەگریت!",
    "Cada vez que tu equipo completa sus tareas diarias, ganas automáticamente el 10% de sus beneficios.",
  ],
  "quant.exhausted_toast": [
    "تم استنفاذ عدد مرات التكميم اليومية، يُرجى العودة غداً بعد الساعة 11:00 AM",
    "You have used all of today's quant rounds, please come back tomorrow after 11:00 AM",
    "هەموو خولەکانی ئەمڕۆت بەکارهێنا، تکایە سبەینێ دوای کاتژمێر ١١ بگەڕێوە",
    "Has agotado las rondas de hoy, vuelve mañana después de las 11:00 AM",
  ],
  "quant.levels": ["مستويات VIP", "VIP levels", "ئاستەکانی VIP", "Niveles VIP"],
  "quant.daily_tasks": ["عدد المهام اليومية", "Daily tasks", "ژمارەی ئەرکە ڕۆژانەکان", "Tareas diarias"],
  "quant.rate": ["نسبة الربح اليومية", "Daily profit rate", "ڕێژەی قازانجی ڕۆژانە", "Tasa de beneficio diaria"],
  "quant.requirement": ["المتطلبات", "Requirements", "پێداویستییەکان", "Requisitos"],
  "quant.locked": ["مقفل", "Locked", "داخراوە", "Bloqueado"],
  "quant.feed": ["سجل التحديد المباشر", "Live success feed", "لیستی سەرکەوتنی ڕاستەوخۆ", "Actividad en vivo"],
  "quant.feed_ok": ["تحديد النجاح", "Success", "سەرکەوتن", "Éxito"],

  "team.title": ["فريقي", "My Team", "تیمەکەم", "Mi equipo"],
  "team.reward": ["ادعُ صديقاً يشحن $100 واكسب $7 فوراً", "Invite a friend who deposits $100 and earn $7 instantly", "هاوڕێیەک بانگهێشت بکە کە $100 دادەنێت و $7 وەربگرە", "Invita a un amigo que deposite $100 y gana $7 al instante"],
  "team.friends": ["عدد الأصدقاء", "Friends", "ژمارەی هاوڕێکان", "Amigos"],
  "team.share": ["مشاركة الرابط 🔗", "Share link 🔗", "هاوبەشکردنی بەستەر 🔗", "Compartir enlace 🔗"],
  "team.vip2_goal": ["ادعُ 3 أصدقاء ($100+) واحتفظ بـ $200 لفتح VIP2", "Invite 3 friends ($100+) and keep $200 to unlock VIP2", "٣ هاوڕێ بانگهێشت بکە ($100+) و $200 بهێڵەوە بۆ VIP2", "Invita a 3 amigos ($100+) y mantén $200 para VIP2"],
  "team.invite_code": ["كود الدعوة", "Invite code", "کۆدی بانگهێشت", "Código de invitación"],
  "team.invite_link": ["رابط الدعوة", "Invite link", "بەستەری بانگهێشت", "Enlace de invitación"],

  "profile.change_password": ["تغيير كلمة المرور", "Change password", "گۆڕینی وشەی نهێنی", "Cambiar contraseña"],
  "profile.current_password": ["كلمة المرور الحالية", "Current password", "وشەی نهێنی ئێستا", "Contraseña actual"],
  "profile.new_password": ["كلمة المرور الجديدة", "New password", "وشەی نهێنی نوێ", "Nueva contraseña"],
  "profile.confirm_password": ["تأكيد كلمة المرور", "Confirm password", "دووپاتکردنەوەی وشەی نهێنی", "Confirmar contraseña"],
  "profile.save_password": ["حفظ كلمة المرور", "Save password", "پاشەکەوتکردن", "Guardar contraseña"],
  "profile.password_mismatch": ["كلمتا المرور غير متطابقتين", "Passwords do not match", "وشە نهێنییەکان وەک یەک نین", "Las contraseñas no coinciden"],
  "profile.password_short": ["كلمة المرور قصيرة جداً (6 أحرف على الأقل)", "Password too short (min 6 characters)", "وشەی نهێنی زۆر کورتە (لانیکەم ٦ پیت)", "Contraseña demasiado corta (mín. 6)"],
  "profile.password_wrong": ["كلمة المرور الحالية غير صحيحة", "Current password is incorrect", "وشەی نهێنی ئێستا هەڵەیە", "La contraseña actual no es correcta"],
  "profile.password_ok": ["تم تحديث كلمة المرور بنجاح", "Password updated successfully", "وشەی نهێنی نوێ کرایەوە", "Contraseña actualizada"],
  "profile.logout": ["تسجيل الخروج", "Sign out", "چوونەدەرەوە", "Cerrar sesión"],
  "profile.total_assets": ["إجمالي الأصول (USDT)", "Total assets (USDT)", "کۆی سامان (USDT)", "Activos totales (USDT)"],
};

type Ctx = { lang: Lang; dir: "rtl" | "ltr"; setLang: (l: Lang) => void; t: (k: string) => string };

const LangContext = createContext<Ctx | null>(null);

export function translate(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[ORDER.indexOf(lang)] ?? entry[0];
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem("qv_lang") as Lang | null;
    if (stored && ORDER.includes(stored)) setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "rtl";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("qv_lang", next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: LANGUAGES.find((l) => l.code === lang)?.dir ?? "rtl",
      setLang,
      t: (key: string) => translate(key, lang),
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  return { lang: "ar", dir: "rtl", setLang: () => {}, t: (k: string) => translate(k, "ar") };
}
