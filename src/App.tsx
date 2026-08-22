import { useState, useEffect, useCallback, useRef } from "react";

const CATEGORIES = ["All", "Plushies", "Keychains", "Stickers", "Mugs"] as const;
type Category = (typeof CATEGORIES)[number];

interface Product {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  price: number;
  emoji: string;
  bg: string;
  accent: string;
  desc: string;
  photo?: string | null;
  stock?: number;
  isSoldOut?: boolean;
}

/* ── API connection ── */
const API_BASE = "http://127.0.0.1:8000/api";

// Visual defaults per category, since the backend only stores real data
// (name/price/stock/category) — not emoji/colors, which are frontend-only styling.
const CATEGORY_LOOK: Record<Exclude<Category, "All">, { emoji: string; bg: string; accent: string }> = {
  Plushies: { emoji: "🧸", bg: "#fcdde8", accent: "#e8849a" },
  Keychains: { emoji: "🔑", bg: "#fde8d8", accent: "#e8a070" },
  Stickers: { emoji: "✨", bg: "#e8e0f5", accent: "#9d77d8" },
  Mugs: { emoji: "☕", bg: "#daeeff", accent: "#8bbfe8" },
};

function normalizeCategory(rawName: string): Exclude<Category, "All"> {
  const n = rawName.toLowerCase();
  if (n.includes("plush")) return "Plushies";
  if (n.includes("keychain")) return "Keychains";
  if (n.includes("sticker")) return "Stickers";
  if (n.includes("mug")) return "Mugs";
  return "Keychains"; // fallback bucket for unrecognized categories
}

interface ApiProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  stock: number;
  is_sold_out: boolean;
  is_new_arrival: boolean;
  category: { id: number; name: string; slug: string };
}

function mapApiProduct(p: ApiProduct): Product {
  const category = normalizeCategory(p.category?.name ?? "");
  const look = CATEGORY_LOOK[category];
  return {
    id: p.id,
    name: p.name,
    category,
    price: Number(p.price),
    emoji: look.emoji,
    bg: look.bg,
    accent: look.accent,
    desc: p.description,
    photo: p.image,
    stock: p.stock,
    isSoldOut: p.is_sold_out,
  };
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products/`);
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  const data: ApiProduct[] = await res.json();
  return data.map(mapApiProduct);
}

// Fallback data shown briefly before the API responds (or if it fails).
let PRODUCTS: Product[] = [
  { id: 1, name: "Cloud Puff Plushie", category: "Plushies", price: 28, emoji: "🌤️", bg: "#daeeff", accent: "#8bbfe8", desc: "Ultra-soft cloud friend, perfect for desk hugs." },
  { id: 2, name: "Strawberry Bear", category: "Plushies", price: 32, emoji: "🍓", bg: "#fcdde8", accent: "#e8849a", desc: "A berry-sweet bear in a strawberry hoodie." },
  { id: 3, name: "Star Sprinkle Keychain", category: "Keychains", price: 9, emoji: "⭐", bg: "#fde8d8", accent: "#e8a070", desc: "Gold-painted resin star with a glitter core." },
  { id: 4, name: "Mushroom Keychain", category: "Keychains", price: 10, emoji: "🍄", bg: "#d8f0e8", accent: "#5db88a", desc: "Pastel spotty mushroom charm for your keys." },
  { id: 5, name: "Holographic Cat Sticker", category: "Stickers", price: 4, emoji: "🐱", bg: "#e8e0f5", accent: "#9d77d8", desc: "Rainbow-shift holographic vinyl, waterproof." },
  { id: 6, name: "Cottagecore Sticker Sheet", category: "Stickers", price: 7, emoji: "🌿", bg: "#d8f0e8", accent: "#5db88a", desc: "16 illustrated botanicals & little creatures." },
  { id: 7, name: "Pastel Gradient Mug", category: "Mugs", price: 18, emoji: "☕", bg: "#fde8d8", accent: "#e8a070", desc: "11 oz ceramic, dishwasher safe, satin finish." },
  { id: 8, name: "Moon Phase Mug", category: "Mugs", price: 20, emoji: "🌙", bg: "#daeeff", accent: "#8bbfe8", desc: "Full moon cycle printed on matte black ceramic." },
  { id: 9, name: "Bunny Plushie", category: "Plushies", price: 26, emoji: "🐰", bg: "#fcdde8", accent: "#e8849a", desc: "Floppy-eared bunny in a soft lavender romper." },
];

const BANNERS = [
  { category: "Plushies" as const, tag: "New arrivals", headline: "Soft friends for\nevery desk.", sub: "Ultra-huggable plushies in limited pastel editions.", img: "https://images.unsplash.com/photo-1744608257868-b3a034a85d22?w=1400&h=600&fit=crop&auto=format", alt: "A pile of colorful plushies", overlay: "from-[#fcdde8]/80", dot: "#e8849a" },
  { category: "Keychains" as const, tag: "Fan favourites", headline: "Carry a little\njoy with you.", sub: "Resin charms and plush keychains for your everyday carry.", img: "https://images.unsplash.com/photo-1775884078836-9079c66dcd5b?w=1400&h=600&fit=crop&auto=format", alt: "Assortment of cute plush keychains and trinkets", overlay: "from-[#fde8d8]/80", dot: "#e8a070" },
  { category: "Stickers" as const, tag: "Stick it everywhere", headline: "Your laptop\ndeserves art.", sub: "Waterproof vinyl stickers, holographic sheets, and more.", img: "https://images.unsplash.com/photo-1625768376503-68d2495d78c5?w=1400&h=600&fit=crop&auto=format", alt: "Assorted stickers on a white wall", overlay: "from-[#e8e0f5]/80", dot: "#9d77d8" },
  { category: "Mugs" as const, tag: "Morning essentials", headline: "Sip in style,\nevery morning.", sub: "11 oz ceramic mugs with pastel glazes and moon prints.", img: "https://images.unsplash.com/photo-1773065557644-812e4f062e84?w=1400&h=600&fit=crop&auto=format", alt: "Hands holding a warm cup of coffee", overlay: "from-[#daeeff]/80", dot: "#8bbfe8" },
];

/* ── Banner carousel ── */
function Banner({ onShopCategory }: { onShopCategory: (cat: Exclude<Category, "All">) => void }) {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = useCallback((next: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setActive(next); setAnimating(false); }, 350);
  }, [animating]);

  useEffect(() => {
    const id = setInterval(() => go((active + 1) % BANNERS.length), 4500);
    return () => clearInterval(id);
  }, [active, go]);

  const b = BANNERS[active];

  return (
    <div className="relative w-full overflow-hidden bg-[#e8e0f5]" style={{ height: 480 }}>
      <img
        key={active}
        src={b.img}
        alt={b.alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: animating ? 0 : 1, transition: "opacity 500ms" }}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-r ${b.overlay} to-transparent`}
        style={{ opacity: animating ? 0 : 1, transition: "opacity 500ms" }}
      />
      <div
        className="absolute inset-0 flex flex-col justify-center px-10 md:px-20 max-w-2xl"
        style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(12px)" : "translateY(0)", transition: "opacity 500ms, transform 500ms" }}
      >
        <span className="inline-block bg-white/70 backdrop-blur-sm text-[#7a6e8a] text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 w-fit">
          {b.tag} ✨
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-[#2d2140] leading-tight mb-3 whitespace-pre-line" style={{ fontFamily: "var(--font-display)" }}>
          {b.headline}
        </h2>
        <p className="text-[#4a3f5e] text-base mb-6 max-w-sm">{b.sub}</p>
        <button
          onClick={() => onShopCategory(b.category)}
          className="bg-[#2d2140] text-white font-bold px-7 py-3 rounded-full text-sm hover:bg-[#b191e8] active:scale-95 transition-all shadow-lg w-fit"
        >
          Shop {b.category} →
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5">
        {BANNERS.map((bn, i) => (
          <button key={i} onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{ width: i === active ? 24 : 8, height: 8, background: i === active ? bn.dot : "#fff", opacity: i === active ? 1 : 0.55 }}
          />
        ))}
      </div>

      {/* Arrows */}
      {(["prev", "next"] as const).map((dir) => (
        <button key={dir} aria-label={dir}
          onClick={() => go(dir === "prev" ? (active - 1 + BANNERS.length) % BANNERS.length : (active + 1) % BANNERS.length)}
          className={`absolute top-1/2 -translate-y-1/2 ${dir === "prev" ? "left-4" : "right-4"} bg-white/60 backdrop-blur-sm hover:bg-white/90 text-[#2d2140] w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm text-lg font-bold`}
        >
          {dir === "prev" ? "‹" : "›"}
        </button>
      ))}
    </div>
  );
}

/* ── Product card ── */
function ProductCard({ product, onAdd, added }: { product: Product; onAdd: (p: Product) => void; added: boolean }) {
  const soldOut = product.isSoldOut ?? false;
  return (
    <div className="rounded-2xl overflow-hidden border border-[#e4ddf0] bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="h-44 flex items-center justify-center text-6xl relative" style={{ background: product.bg }}>
        {product.photo ? (
          <img src={product.photo} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          product.emoji
        )}
        {soldOut && (
          <span className="absolute top-2 right-2 bg-[#2d2140] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            Sold out
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: product.bg, color: product.accent }}>
              {product.category}
            </span>
            <h3 className="text-base font-bold text-[#2d2140] mt-1" style={{ fontFamily: "var(--font-display)" }}>
              {product.name}
            </h3>
          </div>
          <span className="text-[#b191e8] font-bold text-sm shrink-0">${product.price}</span>
        </div>
        <p className="text-[#7a6e8a] text-xs flex-1">{product.desc}</p>
        <button
          onClick={() => onAdd(product)}
          disabled={soldOut}
          className={`w-full mt-1 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
            soldOut
              ? "bg-[#f0edf7] text-[#b3aac2] cursor-not-allowed"
              : added
              ? "bg-[#d8f0e8] text-[#5db88a]"
              : "bg-[#b191e8] text-white hover:bg-[#9d77d8] shadow-sm shadow-[#b191e8]/30"
          }`}
        >
          {soldOut ? "Sold out" : added ? "✓ Added!" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/* ── Shop payment details (placeholder) ── */
const SHOP_PAYMENT = {
  cardholderName: "Puffshop Studio",
  cardNumber: "4118 2637 9045 1820",
  expiry: "08 / 29",
  bank: "Pastel Bank N.A.",
  iban: "US82 0031 0012 3456 7890 1234 56",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-[#7a6e8a] uppercase tracking-wider">{label}</span>
      <div className="flex items-center justify-between gap-2 bg-white border border-[#e4ddf0] rounded-xl px-4 py-2.5">
        <span className="text-sm font-semibold text-[#2d2140] tracking-wide">{value}</span>
        <button
          onClick={copy}
          className={`text-[11px] font-bold shrink-0 transition-colors ${copied ? "text-[#5db88a]" : "text-[#b191e8] hover:text-[#9d77d8]"}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/* ── Checkout form ── */
type DeliveryFields = { name: string; phone: string; address: string; city: string; zip: string };
const emptyDelivery = (): DeliveryFields => ({ name: "", phone: "", address: "", city: "", zip: "" });

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && JSON.stringify(body)) || `Failed (${res.status})`);
      }
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-4 text-left" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#7a6e8a] uppercase tracking-wider">Name</label>
          <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="border border-[#e4ddf0] rounded-xl px-4 py-2.5 text-sm text-[#2d2140] outline-none focus:border-[#b191e8] transition-colors bg-white" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#7a6e8a] uppercase tracking-wider">Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-[#e4ddf0] rounded-xl px-4 py-2.5 text-sm text-[#2d2140] outline-none focus:border-[#b191e8] transition-colors bg-white" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-[#7a6e8a] uppercase tracking-wider">Message</label>
        <textarea rows={5} placeholder="What's on your mind?" value={message} onChange={(e) => setMessage(e.target.value)} className="border border-[#e4ddf0] rounded-xl px-4 py-2.5 text-sm text-[#2d2140] outline-none focus:border-[#b191e8] transition-colors bg-white resize-none" />
      </div>
      <button type="submit" disabled={submitting} className="bg-[#b191e8] text-white font-bold py-3 rounded-full hover:bg-[#9d77d8] active:scale-95 transition-all shadow-md shadow-[#b191e8]/30 disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? "Sending…" : sent ? "Sent! 💌" : "Send Message ✉️"}
      </button>
      {error && <p className="text-[#e8849a] text-sm text-center">{error}</p>}
    </form>
  );
}

function CheckoutFormField({ label, id, errors, children }: { label: string; id: keyof DeliveryFields; errors: Partial<DeliveryFields>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-[#7a6e8a] uppercase tracking-wider">{label}</label>
      {children}
      {errors[id] && <span className="text-[11px] text-[#e8849a]">{errors[id]}</span>}
    </div>
  );
}

async function submitOrder(fields: DeliveryFields, cart: Record<number, number>) {
  const items = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => ({ product_id: Number(productId), quantity }));

  const res = await fetch(`${API_BASE}/orders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fields.name,
      phone: fields.phone,
      street_address: fields.address,
      city: fields.city,
      zip_code: fields.zip,
      items,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body && (body.non_field_errors?.[0] || body.detail || JSON.stringify(body))) ||
      `Order failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

function CheckoutForm({ total, cart, onBack, onDone, onOrderPlaced, summaryOnly = false }: { total: number; cart: Record<number, number>; onBack: () => void; onDone: () => void; onOrderPlaced: () => void; summaryOnly?: boolean }) {
  const [fields, setFields] = useState<DeliveryFields>(emptyDelivery());
  const [errors, setErrors] = useState<Partial<DeliveryFields>>({});
  const [placed, setPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (key: keyof DeliveryFields, val: string) => {
    if (key === "phone") val = val.replace(/[^\d+\s\-()]/g, "").slice(0, 18);
    if (key === "zip") val = val.replace(/\D/g, "").slice(0, 10);
    setFields((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Partial<DeliveryFields> = {};
    if (!fields.name.trim()) e.name = "Required";
    if (!fields.phone.trim()) e.phone = "Required";
    if (!fields.address.trim()) e.address = "Required";
    if (!fields.city.trim()) e.city = "Required";
    if (!fields.zip.trim()) e.zip = "Required";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitOrder(fields, cart);
      onOrderPlaced();
      setPlaced(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong placing your order.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (key: keyof DeliveryFields) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm text-[#2d2140] outline-none transition-colors bg-white ${errors[key] ? "border-[#e8849a] focus:border-[#e8849a]" : "border-[#e4ddf0] focus:border-[#b191e8]"}`;

  if (placed) return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
      <div className="text-6xl">🎉</div>
      <h3 className="text-2xl font-bold text-[#2d2140]" style={{ fontFamily: "var(--font-display)" }}>Order placed!</h3>
      <p className="text-[#7a6e8a] text-sm max-w-xs">Thanks, {fields.name.split(" ")[0]}! Your goodies are on their way. We'll send a confirmation to you shortly.</p>
      <button onClick={onDone} className="mt-2 bg-[#b191e8] text-white font-bold px-8 py-3 rounded-full hover:bg-[#9d77d8] active:scale-95 transition-all shadow-md shadow-[#b191e8]/30">
        Back to shop
      </button>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="bg-white border border-[#e4ddf0] rounded-2xl p-6 flex flex-col gap-4">
        <p className="text-xs font-bold text-[#b191e8] uppercase tracking-widest">Delivery details</p>
        <CheckoutFormField label="Full name" id="name" errors={errors}>
          <input className={inputCls("name")} placeholder="Jane Doe" value={fields.name} onChange={(e) => set("name", e.target.value)} />
        </CheckoutFormField>
        <CheckoutFormField label="Phone number" id="phone" errors={errors}>
          <input className={inputCls("phone")} placeholder="+1 555 000 0000" value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
        </CheckoutFormField>
        <CheckoutFormField label="Street address" id="address" errors={errors}>
          <input className={inputCls("address")} placeholder="123 Pastel Lane" value={fields.address} onChange={(e) => set("address", e.target.value)} />
        </CheckoutFormField>
        <div className="grid grid-cols-2 gap-3">
          <CheckoutFormField label="City" id="city" errors={errors}>
            <input className={inputCls("city")} placeholder="Springfield" value={fields.city} onChange={(e) => set("city", e.target.value)} />
          </CheckoutFormField>
          <CheckoutFormField label="ZIP code" id="zip" errors={errors}>
            <input className={inputCls("zip")} placeholder="62701" value={fields.zip} onChange={(e) => set("zip", e.target.value)} />
          </CheckoutFormField>
        </div>
      </div>

      <button type="submit" disabled={submitting} className="w-full bg-[#b191e8] text-white font-bold py-3.5 rounded-full hover:bg-[#9d77d8] active:scale-95 transition-all shadow-lg shadow-[#b191e8]/30 text-base disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? "Placing order…" : "I've paid — Place Order →"}
      </button>
      {submitError && <p className="text-[#e8849a] text-sm text-center -mt-2">{submitError}</p>}
    </form>
  );
}

/* ── Cart drawer (cart only) ── */
function CartDrawer({ cart, onRemove, onClose, onCheckout }: {
  cart: Record<number, number>;
  onRemove: (id: number) => void;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const items = PRODUCTS.filter((p) => cart[p.id]);
  const total = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const handleCheckout = () => { onClose(); onCheckout(); };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#fdf8f2] z-50 shadow-2xl flex flex-col" style={{ animation: "slideIn 0.3s ease" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e4ddf0] shrink-0">
          <h2 className="text-xl font-bold text-[#2d2140]" style={{ fontFamily: "var(--font-display)" }}>Your Cart 🛒</h2>
          <button onClick={onClose} className="text-[#7a6e8a] hover:text-[#2d2140] text-2xl leading-none transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#7a6e8a] gap-3">
              <span className="text-5xl">🫙</span>
              <p className="font-semibold">Your cart is empty!</p>
              <p className="text-sm">Go find something cute.</p>
            </div>
          ) : items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-[#e4ddf0] rounded-2xl p-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: p.bg }}>{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#2d2140] text-sm truncate" style={{ fontFamily: "var(--font-display)" }}>{p.name}</div>
                <div className="text-xs text-[#7a6e8a]">{cart[p.id]} × ${p.price} = ${cart[p.id] * p.price}</div>
              </div>
              <button onClick={() => onRemove(p.id)} className="text-[#e8849a] hover:text-[#c0526e] text-xs font-bold transition-colors shrink-0">Remove</button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[#e4ddf0] flex flex-col gap-3 shrink-0">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#2d2140]" style={{ fontFamily: "var(--font-display)" }}>Total</span>
              <span className="text-xl font-bold text-[#b191e8]">${total}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#b191e8] text-white font-bold py-3.5 rounded-full hover:bg-[#9d77d8] active:scale-95 transition-all shadow-lg shadow-[#b191e8]/30"
            >
              Checkout →
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

/* ── Full-page checkout ── */
function CheckoutPage({ cart, onBack, onDone, onOrderPlaced }: { cart: Record<number, number>; onBack: () => void; onDone: () => void; onOrderPlaced: () => void }) {
  const items = PRODUCTS.filter((p) => cart[p.id]);
  const total = items.reduce((sum, p) => sum + p.price * cart[p.id], 0);

  return (
    <div className="min-h-screen bg-[#fdf8f2] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#7a6e8a] hover:text-[#b191e8] transition-colors mb-8 group">
          <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span> Back to shop
        </button>

        <h1 className="text-4xl font-bold text-[#2d2140] mb-10" style={{ fontFamily: "var(--font-display)" }}>Checkout 💳</h1>

        <div className="grid md:grid-cols-[1fr_420px] gap-10 items-start">

          {/* LEFT — order summary + form */}
          <div className="flex flex-col gap-8">

            {/* Order summary with thumbnails */}
            <div className="bg-white border border-[#e4ddf0] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e4ddf0]">
                <p className="text-xs font-bold text-[#b191e8] uppercase tracking-widest">Order summary</p>
              </div>
              <div className="divide-y divide-[#e4ddf0]">
                {items.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-sm" style={{ background: p.bg }}>
                      {p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#2d2140] text-sm" style={{ fontFamily: "var(--font-display)" }}>{p.name}</p>
                      <p className="text-xs text-[#7a6e8a] mt-0.5">{p.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.bg, color: p.accent }}>
                          qty {cart[p.id]}
                        </span>
                      </div>
                    </div>
                    <p className="font-bold text-[#2d2140] text-sm shrink-0">${p.price * cart[p.id]}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-[#e4ddf0] flex justify-between items-center bg-[#faf8ff]">
                <span className="font-bold text-[#2d2140]" style={{ fontFamily: "var(--font-display)" }}>Total</span>
                <span className="text-xl font-bold text-[#b191e8]">${total}</span>
              </div>
            </div>

            {/* Delivery form */}
            <CheckoutForm total={total} cart={cart} onBack={onBack} onDone={onDone} onOrderPlaced={onOrderPlaced} summaryOnly />
          </div>

          {/* RIGHT — payment info */}
          <div className="flex flex-col gap-4 md:sticky md:top-24">
            <p className="text-xs font-bold text-[#b191e8] uppercase tracking-widest">Pay to</p>
            <p className="text-[11px] text-[#7a6e8a]">Transfer the total amount to the details below, then confirm your order.</p>

            <div className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #b191e8 0%, #8bbfe8 100%)" }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute bottom-2 -left-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="flex justify-between items-start relative">
                <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest">Puffshop</span>
                <span className="text-white text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">VISA</span>
              </div>
              <p className="text-white font-mono text-xl tracking-widest font-bold relative">{SHOP_PAYMENT.cardNumber}</p>
              <div className="flex justify-between items-end relative">
                <div>
                  <p className="text-white/60 text-[10px] uppercase tracking-wider">Cardholder</p>
                  <p className="text-white text-sm font-bold">{SHOP_PAYMENT.cardholderName}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px] uppercase tracking-wider">Expires</p>
                  <p className="text-white text-sm font-bold">{SHOP_PAYMENT.expiry}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <CopyField label="Card number" value={SHOP_PAYMENT.cardNumber} />
              <CopyField label="IBAN" value={SHOP_PAYMENT.iban} />
              <CopyField label="Bank" value={SHOP_PAYMENT.bank} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Header ── */
function Header({ cartCount, onCartOpen, onScrollTo }: { cartCount: number; onCartOpen: () => void; onScrollTo: (id: string) => void }) {
  const navLink = (label: string, target: string) => (
    <button
      key={label}
      onClick={() => onScrollTo(target)}
      className="text-sm font-semibold tracking-wide text-[#2d2140] hover:text-[#b191e8] transition-colors pb-0.5 border-b-2 border-transparent hover:border-[#b191e8]"
    >
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 bg-[#fdf8f2]/90 backdrop-blur-md border-b border-[#e4ddf0]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <nav className="flex items-center gap-6">
          {navLink("Home", "home")}
          {navLink("Products", "products")}
        </nav>

        <button onClick={() => onScrollTo("home")} className="flex items-center gap-2 shrink-0 group">
          <span className="text-2xl">🧸</span>
          <span className="text-xl font-bold tracking-tight text-[#2d2140] group-hover:text-[#b191e8] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
            Puffshop
          </span>
        </button>

        <nav className="flex items-center gap-6">
          {navLink("Contact", "contact")}
          <button onClick={onCartOpen} className="relative group">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2d2140] group-hover:text-[#b191e8] transition-colors">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#b191e8] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ── Main app ── */
export default function App() {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"shop" | "checkout">("shop");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        PRODUCTS = data;
        setProductsError(null);
      })
      .catch((err) => {
        console.error(err);
        setProductsError("Couldn't reach the backend — showing sample products instead.");
      })
      .finally(() => setProductsLoaded(true));
  }, []);

  const homeRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  const refs: Record<string, React.RefObject<HTMLElement | null>> = { home: homeRef, products: productsRef, contact: contactRef };

  const scrollTo = (id: string) => {
    refs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (p: Product) => {
    setCart((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }));
    setAddedIds((prev) => new Set(prev).add(p.id));
    setTimeout(() => setAddedIds((prev) => { const n = new Set(prev); n.delete(p.id); return n; }), 1800);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const handleBannerShop = (cat: Exclude<Category, "All">) => {
    setActiveCategory(cat);
    setTimeout(() => scrollTo("products"), 50);
  };

  const filtered = activeCategory === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory);

  if (view === "checkout") {
    return (
      <div className="min-h-full flex flex-col">
        <Header cartCount={cartCount} onCartOpen={() => setCartOpen(true)} onScrollTo={(id) => { setView("shop"); setTimeout(() => scrollTo(id), 50); }} />
        <CheckoutPage cart={cart} onBack={() => setView("shop")} onDone={() => setView("shop")} onOrderPlaced={() => setCart({})} />
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header cartCount={cartCount} onCartOpen={() => setCartOpen(true)} onScrollTo={scrollTo} />

      {/* HOME */}
      <section ref={homeRef} id="home" className="relative overflow-hidden bg-[#fdf8f2] py-20 px-6">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#fcdde8] opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-0 w-60 h-60 rounded-full bg-[#daeeff] opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-[#e8e0f5] opacity-40 blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center">
          <span className="inline-block bg-[#e8e0f5] text-[#7a6e8a] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            New arrivals ✨
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-[#2d2140] leading-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Tiny things, <em className="not-italic text-[#b191e8]">big joy.</em>
          </h1>
          <p className="text-[#7a6e8a] text-lg max-w-md mx-auto mb-8">
            Handpicked plushies, keychains, stickers & mugs for people who love cute things.
          </p>
          <button
            onClick={() => scrollTo("products")}
            className="bg-[#b191e8] text-white font-bold px-8 py-3.5 rounded-full text-base hover:bg-[#9d77d8] active:scale-95 transition-all shadow-lg shadow-[#b191e8]/30"
          >
            Shop Now →
          </button>
        </div>
      </section>

      {/* BANNER */}
      <Banner onShopCategory={handleBannerShop} />

      {/* PRODUCTS */}
      <section ref={productsRef} id="products" className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-[#2d2140] mb-2" style={{ fontFamily: "var(--font-display)" }}>Our Products</h2>
          <p className="text-[#7a6e8a]">Browse by category or explore everything</p>
          {!productsLoaded && <p className="text-[#b191e8] text-sm mt-2">Loading products…</p>}
          {productsError && <p className="text-[#e8849a] text-sm mt-2">{productsError}</p>}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? "bg-[#b191e8] text-white shadow-md shadow-[#b191e8]/30" : "bg-white border border-[#e4ddf0] text-[#7a6e8a] hover:border-[#b191e8] hover:text-[#b191e8]"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} added={addedIds.has(p.id)} />
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section ref={contactRef} id="contact" className="bg-[#f5f0fb] border-t border-[#e4ddf0]">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-bold text-[#2d2140] mb-3" style={{ fontFamily: "var(--font-display)" }}>Say hello! 👋</h2>
          <p className="text-[#7a6e8a] mb-10">Questions, collabs, or just want to share cute finds — we're here for it.</p>
          <ContactForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#e4ddf0] bg-[#fdf8f2] py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">🧸</span>
          <span className="text-base font-bold text-[#2d2140]" style={{ fontFamily: "var(--font-display)" }}>Puffshop</span>
        </div>
        <p className="text-xs text-[#7a6e8a]">Made with 💜 for a course project · 2026</p>
      </footer>

      {/* CART DRAWER */}
      {cartOpen && <CartDrawer cart={cart} onRemove={removeFromCart} onClose={() => setCartOpen(false)} onCheckout={() => setView("checkout")} />}
    </div>
  );
}