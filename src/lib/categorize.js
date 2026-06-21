// Keyword-based merchant categorization. Runs entirely on-device.
// Categories mirror DEFAULT_CATEGORIES in App.jsx.

export const CATEGORIES = [
  "Rent", "Groceries", "Utilities", "Transport", "Dining",
  "Entertainment", "Health", "Savings/Investments", "Subscriptions", "Shopping", "Travel", "Education", "Other",
];

// Tokens that carry no merchant signal — company forms and transaction-type noise.
// Kept deliberately small; short common first names are NOT brand keywords below,
// so P2P transfers ("Transfer to DANIEL …") don't get miscategorized.
const NOISE = new Set([
  "srl", "sa", "pfa", "snc", "sca", "impex", "prodcom", "prod", "grup", "group",
  "gmbh", "ltd", "inc", "llc", "kft", "bv", "ag", "co",
  "cumparare", "plata", "plata", "pos", "tranzactie", "comision", "payment", "card",
]);

// Normalize a raw description to a clean, space-separated merchant string:
// lowercase, strip diacritics/punctuation, drop pure-number tokens and noise tokens.
export function normalizeMerchant(desc) {
  return (desc || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/^\d+$/.test(t) && !NOISE.has(t))
    .join(" ")
    .trim();
}

// category -> keywords. Keywords are matched against the normalized merchant string.
// Multi-word keywords match as a phrase; single-token keywords match a whole token
// (or a substring only when 5+ chars, so short ones like "mol"/"stb" stay precise).
const RULES = [
  ["Groceries", ["kaufland", "lidl", "mega image", "profi", "carrefour", "auchan", "penny", "selgros", "cora", "la doi pasi", "ladoipasi", "freshful", "bringo", "supermarket", "hypermarket", "market", "unicarm", "annabella", "metro cash", "makro", "supeco"]],
  ["Dining", ["restaurant", "mcdonald", "mcdonalds", "kfc", "burger king", "taco bell", "pizza", "pizzeria", "domino", "glovo", "tazz", "foodpanda", "bolt food", "uber eats", "ubereats", "starbucks", "5 to go", "5togo", "to go", "teds", "gregory s", "fornetti", "simigerie", "patiserie", "cofetarie", "gelateria", "gelato", "sushi", "wok", "kebab", "shaorma", "shaormeria", "bistro", "trattoria", "food", "cafe", "caffe", "coffee", "espresso", "bar", "pub", "tucano", "spartan", "city grill", "la mama", "la ionel", "salad box", "noodle", "ramen", "subway", "springtime", "dristor", "pep pepper", "pravalia cu licori", "lingura", "arabian taste"]],
  ["Transport", ["omv", "petrom", "rompetrol", "lukoil", "socar", "gazprom", "mol", "stb", "metrorex", "metrou", "ratb", "cfr", "tursib", "ctp", "ratbv", "bolt", "uber", "freenow", "free now", "clever", "taxi", "blackcab", "star taxi", "parcare", "parking", "peco", "benzin", "carburant", "rovinieta", "casco", "itp", "autostrada", "flixbus", "blablacar", "autogara", "dott", "lime", "tier", "spotparking"]],
  ["Subscriptions", ["netflix", "spotify", "hbo", "hbomax", "disney", "youtube", "amazon prime", "prime video", "apple", "itunes", "icloud", "google", "microsoft", "office", "adobe", "dropbox", "linkedin", "patreon", "audible", "canva", "notion", "chatgpt", "openai", "anthropic", "claude", "github", "figma", "jetbrains", "duolingo", "headspace", "grammarly", "twitch", "playstation plus", "game pass", "gamepass"]],
  ["Utilities", ["enel", "electrica", "e on", "eon", "engie", "hidroelectrica", "distrigaz", "apa nova", "apanova", "raja", "salubr", "romprest", "retim", "supercom", "digi", "rcs rds", "vodafone", "telekom", "akta", "focus sat", "nextgen", "factura", "intretinere"]],
  ["Health", ["farmacia", "farmacie", "catena", "sensiblu", "dr max", "help net", "helpnet", "clinica", "spital", "medical", "regina maria", "medlife", "sanador", "synevo", "medicover", "bioclinica", "optica", "optiblu", "lensa", "dental", "stomatolog", "veterinar", "vetlife", "kanovet", "animax"]],
  ["Entertainment", ["cinema", "cinema city", "happy cinema", "grand cinema", "hollywood multiplex", "steam", "playstation", "xbox", "nintendo", "epic games", "riot", "blizzard", "ea games", "eventim", "iabilet", "bilete", "escape room", "bowling", "teatru", "opera", "filarmonica", "muzeu", "world class", "worldclass", "7card", "smartfit", "stay fit", "sala fitness", "fitness", "entertainment", "club", "betano", "superbet", "unibet", "fortuna", "mozzart", "winmasters", "netbet", "vivabet", "admiral bet", "admiralbet", "napoleon games", "vbet", "win2", "publicwin", "maxbet", "stanleybet", "player ro", "playerro", "casa pariurilor", "baumbet", "magic jackpot"]],
  ["Shopping", ["emag", "altex", "flanco", "media galaxy", "mediagalaxy", "evomag", "pc garage", "pcgarage", "cel ro", "zara", "bershka", "pull bear", "stradivarius", "mango", "reserved", "sinsay", "mohito", "cropp", "about you", "aboutyou", "fashion days", "fashiondays", "answear", "lc waikiki", "lcwaikiki", "deichmann", "ccc", "primark", "decathlon", "intersport", "hervis", "sportisimo", "nike", "adidas", "douglas", "sephora", "notino", "marionnaud", "bebe tei", "bebetei", "jumbo", "pepco", "dedeman", "leroy", "hornbach", "brico", "mobexpert", "jysk", "ikea", "kik", "tedi", "flowers", "flori", "froo", "shop"]],
  ["Travel", ["hotel", "hostel", "motel", "pensiune", "booking", "airbnb", "expedia", "agoda", "trivago", "hotels com", "kayak", "esky", "vola ro", "momondo", "trip com", "skyscanner", "rentacar", "rent a car", "avis", "hertz", "sixt", "europcar", "autonom", "wizz", "wizzair", "ryanair", "blue air", "tarom", "lufthansa", "aegean", "klm", "austrian", "vueling", "easyjet", "emirates", "turkish", "qatar"]],
  ["Education", ["academia", "studii economice", "universitat", "university", "facultate", "faculty", "scoala", "gradinita", "liceu", "colegiu", "college", "udemy", "coursera", "edx", "skillshare", "pluralsight", "codecademy", "meditatii", "scolarizare", "tuition"]],
  ["Savings/Investments", ["vault", "savings", "trading", "investment", "investit", "xtb", "etoro", "tradeville", "interactive brokers", "ibkr", "degiro", "bvb", "depozit", "economii", "obligatiuni", "titluri", "binance", "coinbase", "kraken", "crypto"]],
  ["Rent", ["chirie", "rent", "inchiriere", "administratie", "asociatia", "asociatie"]],
];

// Flatten and sort by keyword length (desc) so the most specific keyword wins.
const FLAT = [];
for (const [cat, kws] of RULES) for (const kw of kws) FLAT.push({ kw, cat });
FLAT.sort((a, b) => b.kw.length - a.kw.length);

function ruleMatch(desc) {
  const norm = normalizeMerchant(desc);
  if (!norm) return null;
  const words = new Set(norm.split(" "));
  for (const { kw, cat } of FLAT) {
    if (kw.includes(" ")) {
      if (norm.includes(kw)) return cat;
    } else if (words.has(kw)) {
      return cat;
    } else if (kw.length >= 5 && norm.includes(kw)) {
      return cat;
    }
  }
  return null;
}

// Stable, learnable key for a merchant (first few normalized tokens), so a manual
// correction generalizes to the same merchant on later statements.
export function merchantKey(description) {
  return normalizeMerchant(description).split(" ").slice(0, 3).join(" ");
}

// learned: { merchantKey: category } overrides, persisted locally.
export function categorize(description, learned) {
  const key = merchantKey(description);
  if (learned && learned[key]) return learned[key];
  return ruleMatch(description) || "Other";
}
