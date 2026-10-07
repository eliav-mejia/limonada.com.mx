// Shared by EVERY page: brand config, header, footer, quote list, WhatsApp button, cookie notice, PageHero, renderPage().
// Load order on each page: tailwind.config.js → layout.jsx → (catalogo.jsx) → page script.

const { useState, useEffect, useMemo } = React;

// --- BRAND ---
// Values marked [verificar] are placeholders until the client confirms them.
const BRAND = {
    name: 'Limonada',
    tagline: 'Uniformes ejecutivos y empresariales para dama y caballero',
    since: 1997,
    email: 'ventas@limonada.com.mx',                 // [verificar]
    phone: '+52 55 0000 0000',                       // [verificar]
    whatsapp: '5200000000000',                       // [verificar] solo dígitos, formato internacional
    address: '[Dirección del taller / showroom]',    // [verificar]
    hours: 'Lunes a viernes · 9:00 – 18:00',         // [verificar]
};

const NAV_LINKS = [
    { href: '/pages/colecciones/?linea=dama', label: 'Dama', match: 'linea=dama' },
    { href: '/pages/colecciones/?linea=caballero', label: 'Caballero', match: 'linea=caballero' },
    { href: '/pages/empresa/', label: 'Empresa' },
    { href: '/pages/distribuidores/', label: 'Distribuidores' },
    { href: '/pages/contacto/', label: 'Contacto' },
];

const isActive = (link) => link.match
    ? window.location.pathname.startsWith('/pages/colecciones') && window.location.search.includes(link.match)
    : window.location.pathname.startsWith(link.href.replace(/\/$/, ''));

const formatMXN = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

// --- LOCAL STORAGE (every key starts with "li-") ---
const store = {
    read: (key, fallback) => { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    write: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
};

const useStoreEvent = (eventName, keys, read) => {
    const [value, setValue] = useState(read);
    useEffect(() => {
        const update = () => setValue(read());
        const onStorage = (e) => { if (keys.includes(e.key)) update(); };
        window.addEventListener(eventName, update);
        window.addEventListener('storage', onStorage);
        return () => { window.removeEventListener(eventName, update); window.removeEventListener('storage', onStorage); };
    }, []);
    return value;
};

// --- QUOTE LIST ---
// Companies do not buy one garment: they ask for a quote. The list is [{ key, garmentId, colorId, qty }] in 'li-cotizacion',
// synced between tabs. Etapa 2 turns it into a cart for company accounts (same shape + prices from the database).
const quote = {
    read: () => store.read('li-cotizacion', []),
    save: (lines) => { store.write('li-cotizacion', lines); window.dispatchEvent(new Event('li-cotizacion')); },
    add: (garmentId, colorId, qty) => {
        const key = `${garmentId}|${colorId}`;
        const lines = quote.read();
        const found = lines.find(l => l.key === key);
        if (found) found.qty += qty; else lines.push({ key, garmentId, colorId, qty });
        quote.save(lines);
    },
    set: (key, qty) => quote.save(qty > 0 ? quote.read().map(l => (l.key === key ? { ...l, qty } : l)) : quote.read().filter(l => l.key !== key)),
    clear: () => quote.save([]),
};

const useQuote = () => useStoreEvent('li-cotizacion', ['li-cotizacion'], quote.read);

// --- ICONS ---
const Icon = ({ d, className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const IconList = (p) => <Icon {...p} d={<><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>} />;
const IconMenu = (p) => <Icon {...p} d={<path d="M4 7h16M4 12h16M4 17h16" />} />;
const IconClose = (p) => <Icon {...p} d={<path d="M6 6l12 12M18 6L6 18" />} />;
const IconArrow = (p) => <Icon {...p} d={<path d="M5 12h14M13 6l6 6-6 6" />} />;
const IconCheck = (p) => <Icon {...p} d={<path d="M5 12.5l4.5 4.5L19 7" />} />;
const IconWhatsApp = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" /></svg>
);

// --- LOGO: a lemon slice + wordmark ---
const LemonMark = ({ className = 'w-9 h-9' }) => (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#f4d35e" />
        <circle cx="32" cy="32" r="21" fill="none" stroke="#14213d" strokeWidth="2.5" />
        <path d="M32 11v42M11 32h42M17 17l30 30M47 17L17 47" stroke="#14213d" strokeWidth="1.6" opacity=".55" />
    </svg>
);

const Logo = ({ light = false }) => (
    <a href="/" className={`flex items-center gap-3 ${light ? 'text-white' : 'text-navy'}`} aria-label={`${BRAND.name}, inicio`}>
        <LemonMark />
        <span className="leading-none">
            <span className="font-display text-2xl block">Limonada</span>
            <span className={`text-[0.6rem] tracking-[0.2em] uppercase ${light ? 'text-white/60' : 'text-navy-400'}`}>Uniformes ejecutivos</span>
        </span>
    </a>
);

// --- COOKIE NOTICE ---
const COOKIE_KEY = 'li-cookies';
window.LI_COOKIES = (store.read(COOKIE_KEY, null) || {}).choice || null;
const hasCookieConsent = () => window.LI_COOKIES === 'all';

const CookieConsent = () => {
    const [open, setOpen] = useState(!window.LI_COOKIES);
    if (!open) return null;
    const choose = (choice) => { window.LI_COOKIES = choice; store.write(COOKIE_KEY, { choice, at: new Date().toISOString() }); setOpen(false); };
    return (
        <div className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-sm z-[90] bg-white border border-navy-line rounded-xl shadow-xl p-5 animate-rise-in" role="dialog" aria-label="Cookies">
            <p className="font-display text-xl">Cookies</p>
            <p className="text-sm text-navy-500 mt-1 mb-4">Usamos almacenamiento necesario para tu lista de cotización. Con tu permiso, también para medir y mejorar el sitio. <a href="/pages/privacidad/" className="underline">Aviso de privacidad</a></p>
            <div className="flex gap-2">
                <button className="btn btn-navy flex-1 !py-2.5" onClick={() => choose('all')}>Aceptar</button>
                <button className="btn btn-line flex-1 !py-2.5" onClick={() => choose('necessary')}>Solo necesarias</button>
            </div>
        </div>
    );
};

// --- WHATSAPP BUTTON ---
const waLink = (text) => `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;

const WhatsAppButton = () => (
    <a href={waLink('Hola, me interesa cotizar uniformes para mi empresa.')} target="_blank" rel="noopener noreferrer"
       className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-[#25d366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
       aria-label="Escríbenos por WhatsApp">
        <IconWhatsApp className="w-7 h-7" />
    </a>
);

// --- REVEAL ON SCROLL ---
const useReveal = () => {
    useEffect(() => {
        const io = new IntersectionObserver((entries) => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        }), { threshold: 0.1 });
        const scan = () => document.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
        scan();
        const mo = new MutationObserver(scan);
        mo.observe(document.getElementById('root'), { childList: true, subtree: true });
        return () => { io.disconnect(); mo.disconnect(); };
    }, []);
};

// --- LAYOUT ---
const Layout = ({ children }) => {
    const lines = useQuote();
    const count = lines.reduce((a, l) => a + l.qty, 0);
    const [menuOpen, setMenuOpen] = useState(false);
    useReveal();
    useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; }, [menuOpen]);

    const QuoteButton = ({ className = '' }) => (
        <a href="/pages/cotizacion/" className={`btn btn-lemon !py-2.5 !px-4 ${className}`} aria-label={`Mi cotización, ${count} prendas`}>
            <IconList className="w-4 h-4" /> Cotización
            {count > 0 && <span className="min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-navy text-white text-xs flex items-center justify-center">{count}</span>}
        </a>
    );

    return (
        <div className="min-h-screen flex flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] bg-white px-4 py-2 rounded">Saltar al contenido</a>

            <div className="bg-navy text-white/85 text-xs">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex justify-between gap-4">
                    <p>Desde {BRAND.since} · Uniformes a la medida para empresas</p>
                    <p className="hidden md:block">Garantía de 1 año o 70 lavadas · Envíos a toda la República</p>
                </div>
            </div>

            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-navy-line">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-6">
                    <Logo />
                    <nav className="hidden lg:flex items-center gap-7 text-sm font-medium" aria-label="Principal">
                        {NAV_LINKS.map(l => (
                            <a key={l.href} href={l.href} aria-current={isActive(l) ? 'page' : undefined}
                               className={`py-1 border-b-2 transition-colors ${isActive(l) ? 'border-lemon-400' : 'border-transparent text-navy-500 hover:text-navy hover:border-lemon-300'}`}>{l.label}</a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <QuoteButton className="hidden sm:inline-flex" />
                        <button className="lg:hidden p-2" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><IconMenu className="w-6 h-6" /></button>
                    </div>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[70] bg-white animate-fade-in flex flex-col" role="dialog" aria-modal="true" aria-label="Menú">
                    <div className="h-20 px-4 flex items-center justify-between border-b border-navy-line">
                        <Logo />
                        <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><IconClose className="w-6 h-6" /></button>
                    </div>
                    <nav className="flex-1 flex flex-col px-6 py-8 gap-6">
                        <a href="/pages/colecciones/" className="font-display text-3xl">Todas las colecciones</a>
                        {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="font-display text-3xl">{l.label}</a>)}
                        <QuoteButton className="self-start mt-4" />
                    </nav>
                </div>
            )}

            <main id="main" className="flex-1">{children}</main>

            <Footer />
            <WhatsAppButton />
            <CookieConsent />
        </div>
    );
};

const FOOTER_COLUMNS = [
    { title: 'Colecciones', links: [
        { href: '/pages/colecciones/?linea=dama', label: 'Dama' },
        { href: '/pages/colecciones/?linea=caballero', label: 'Caballero' },
        { href: '/pages/colecciones/', label: 'Todas las prendas' },
    ] },
    { title: 'Empresa', links: [
        { href: '/pages/empresa/', label: 'Nuestra historia' },
        { href: '/pages/empresa/#telas', label: 'Telas' },
        { href: '/pages/empresa/#tallas', label: 'Tallas y medición' },
        { href: '/pages/distribuidores/', label: 'Distribuidores' },
    ] },
    { title: 'Ayuda', links: [
        { href: '/pages/cotizacion/', label: 'Mi cotización' },
        { href: '/pages/contacto/', label: 'Contacto' },
        { href: '/pages/terminos/', label: 'Términos y garantía' },
        { href: '/pages/privacidad/', label: 'Aviso de privacidad' },
    ] },
];

const Footer = () => (
    <footer className="pinstripe text-white/75 mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
                <Logo light />
                <p className="mt-5 text-sm max-w-xs leading-relaxed">{BRAND.tagline}. Diseño, confección y medición desde {BRAND.since}.</p>
                <p className="mt-5 text-sm">{BRAND.phone} · <a href={`mailto:${BRAND.email}`} className="hover:text-lemon-300">{BRAND.email}</a></p>
            </div>
            {FOOTER_COLUMNS.map(col => (
                <div key={col.title}>
                    <p className="kicker text-lemon-300 mb-4">{col.title}</p>
                    <ul className="space-y-2.5 text-sm">{col.links.map(l => <li key={l.href}><a href={l.href} className="hover:text-white">{l.label}</a></li>)}</ul>
                </div>
            ))}
        </div>
        <div className="border-t border-white/10">
            <p className="max-w-7xl mx-auto px-4 md:px-8 py-5 text-xs text-white/55">© {new Date().getFullYear()} {BRAND.name} · {BRAND.hours}</p>
        </div>
    </footer>
);

// --- SHARED SECTIONS ---
const PageHero = ({ kicker, title, mark, intro, children }) => (
    <section className="bg-cream border-b border-navy-line">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 animate-rise-in">
            {kicker && <p className="kicker text-navy-500 mb-4">{kicker}</p>}
            <h1 className="text-5xl md:text-6xl leading-[1.05]">{title} {mark && <span className="mark">{mark}</span>}</h1>
            {intro && <p className="mt-6 text-lg text-navy-500 max-w-2xl leading-relaxed">{intro}</p>}
            {children}
        </div>
    </section>
);

const SectionTitle = ({ kicker, children, mark, center = false }) => (
    <div className={`mb-12 reveal ${center ? 'text-center' : ''}`}>
        {kicker && <p className="kicker text-navy-500 mb-3">{kicker}</p>}
        <h2 className="text-4xl md:text-5xl leading-tight">{children} {mark && <span className="mark">{mark}</span>}</h2>
    </div>
);

const renderPage = (Page) => {
    ReactDOM.createRoot(document.getElementById('root')).render(<Layout><Page /></Layout>);
};
