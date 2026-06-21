// Keyword-based merchant categorization. Runs entirely on-device.
// Categories mirror DEFAULT_CATEGORIES in App.jsx.

export const CATEGORIES = [
  "Rent", "Groceries", "Utilities", "Transport", "Dining",
  "Entertainment", "Health", "Savings/Investments", "Subscriptions", "Other",
];

// Ordered rules: first match wins. Keywords are lowercased substrings.
const RULES = [
  // Note: avoid "alimentar" (collides with RO "alimentare card/cont/combustibil")
  // and bare "metro" (collides with "metrou"/"metrorex" → Transport).
  ["Groceries", ["kaufland", "lidl", "mega image", "mega-image", "profi", "carrefour", "auchan", "penny", "selgros", "cora", "metro cash", "la doi pasi", "freshful", "supermarket", "magazin alim", "bringo"]],
  ["Dining", ["restaurant", "mcdonald", "kfc", "burger", "pizza", "pizzeria", "glovo", "tazz", "foodpanda", "bolt food", "uber eats", "ubereats", "cafe", "caffe", "coffee", "starbucks", "5 to go", "5to go", "taco", "bistro", "shaorma", "kebab", "sushi", "resto"]],
  ["Transport", ["omv", "petrom", "rompetrol", "lukoil", "socar", "gazprom", " mol ", "stb", "metrorex", "metrou", "ratb", "bolt.eu", "bolt ", "uber", "taxi", "clever", "parcare", "parking", "peco", "benzin", "carburant", "cfr", "blue air", "wizz", "tarom", "ryanair", "flixbus", "autogara", "rovinieta", "rca ", " itp"]],
  ["Subscriptions", ["netflix", "spotify", "hbo", "disney", "youtube", "amazon prime", "prime video", "apple.com", "itunes", "icloud", "google storage", "google one", "microsoft", "office 365", "microsoft 365", "adobe", "dropbox", "linkedin", "patreon", "audible", "canva", "notion", "chatgpt", "openai", "anthropic", "claude.ai", "github"]],
  ["Utilities", ["enel", "electrica", "e-on", "e.on", " eon", "engie", "hidroelectrica", "digi", "rcs", "rds", "orange", "vodafone", "telekom", "upc", "apa nova", "apanova", "distrigaz", "factura", "utilit", "salubr", "romprest", "raja", "internet"]],
  ["Health", ["farmacia", "farmacie", "catena", "sensiblu", "dr max", "dr.max", "help net", "helpnet", "clinica", "spital", "medical", "regina maria", "medlife", "sanador", "synevo", "dent", "optica"]],
  ["Entertainment", ["cinema", "hollywood", "bilet", "ticket", "steam", "playstation", "xbox", "nintendo", "epic games", "concert", "teatru", "iabilet", "eventim", "gym", "fitness", "worldclass", "world class", "7card"]],
  ["Savings/Investments", ["vault", "broker", "xtb", "etoro", "tradeville", "trading212", "trading 212", "interactive brokers", "bvb", "depozit", "economii", "fond ", "investit", "binance", "kraken", "coinbase", "obligatiuni", "titluri", "dividend"]],
  ["Rent", ["chirie", " rent", "inchiriere", "administratie", "intretinere", "asociatia", "asociatie"]],
];

function ruleMatch(text) {
  const t = ` ${text.toLowerCase()} `;
  for (const [cat, keys] of RULES) {
    for (const k of keys) {
      if (t.includes(k)) return cat;
    }
  }
  return null;
}

// Stable, learnable key for a merchant: strip diacritics, digits, punctuation,
// keep the first few words. Used both for rule-matching and learned overrides.
export function merchantKey(description) {
  return (description || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

// learned: { merchantKey: category } overrides, persisted locally.
export function categorize(description, learned) {
  const key = merchantKey(description);
  if (learned && learned[key]) return learned[key];
  return ruleMatch(description) || "Other";
}
