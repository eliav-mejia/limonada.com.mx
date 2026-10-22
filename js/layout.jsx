// Shared by EVERY page: brand config, url(), cart store, header, footer, WhatsApp button, cookie notice, error boundary,
// PageHero, SectionTitle, renderPage(). Load order on each page: arranque.js → tailwind.config.js → layout.jsx →
// (tienda.jsx) → page script.

const { useState, useEffect, useMemo, useRef, useId } = React;

// --- PATHS ---
// Every internal link and fetch goes through url(): it prefixes LI_ROOT (set by js/arranque.js from its own address),
// so the site works at the domain root and in any subfolder. Write paths as if from the root: url('/pages/trajes/').
const ROOT = window.LI_ROOT || '/';
const url = (path = '/') => ROOT + String(path).replace(/^\//, '');
const here = () => window.location.href.split(/[?#]/)[0];

// --- BRAND ---
// Values marked [verificar] are placeholders until the client confirms them.
const BRAND = {
    name: 'Limonada',
    tagline: 'Sastrería a la medida',
    since: 1997,
    email: 'hola@limonada.com.mx',                    // [verificar]
    phone: '+52 55 0000 0000',                        // [verificar]
    whatsapp: '5200000000000',                        // [verificar] solo dígitos, formato internacional
    address: '[Dirección del estudio], Ciudad de México', // [verificar]
    hours: 'Martes a sábado · 11:00 – 20:00',         // [verificar]
    instagram: 'limonada.sastreria',                  // [verificar]
};

const NAV_LINKS = [
    { href: '/pages/trajes/', label: 'Trajes' },
    { href: '/pages/trajes/#telas', label: 'Telas', match: false },
    { href: '/pages/medidas/', label: 'Medidas y citas' },
    { href: '/pages/estudio/', label: 'El estudio' },
    { href: '/pages/contacto/', label: 'Contacto' },
];

const isActive = (link) => link.match !== false && here().startsWith(url(link.href).split('#')[0]);

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

// --- CART ---
// [{ key, suitId, config: { fabric, color, fit, lapel, ... , monogram, delivery }, qty }] in 'li-carrito', synced between
// tabs. Prices are NOT stored: tienda.jsx computes them from the catalogue on every render, so they never go stale.
const cart = {
    read: () => { const v = store.read('li-carrito', []); return Array.isArray(v) ? v.filter(l => l && l.key && l.suitId && l.config) : []; },
    save: (lines) => { store.write('li-carrito', lines); window.dispatchEvent(new Event('li-carrito')); },
    add: (suitId, config, qty = 1) => {
        const key = `${suitId}-${Date.now().toString(36)}`;
        cart.save([...cart.read(), { key, suitId, config, qty }]);
        return key;
    },
    update: (key, patch) => cart.save(cart.read().map(l => (l.key === key ? { ...l, ...patch } : l))),
    remove: (key) => cart.save(cart.read().filter(l => l.key !== key)),
    clear: () => cart.save([]),
};

const useCart = () => useStoreEvent('li-carrito', ['li-carrito'], cart.read);

// --- ICONS ---
const Icon = ({ d, className = 'w-5 h-5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const IconBag = (p) => <Icon {...p} d={<><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>} />;
const IconMenu = (p) => <Icon {...p} d={<path d="M4 8h16M4 16h16" />} />;
const IconClose = (p) => <Icon {...p} d={<path d="M6 6l12 12M18 6L6 18" />} />;
const IconArrow = (p) => <Icon {...p} d={<path d="M5 12h14M13 6l6 6-6 6" />} />;
const IconCheck = (p) => <Icon {...p} d={<path d="M5 12.5l4.5 4.5L19 7" />} />;
const IconTape = (p) => <Icon {...p} d={<><circle cx="9" cy="12" r="6" /><circle cx="9" cy="12" r="1.5" /><path d="M15 12h6v4h-6M17 12v2M19 12v2" /></>} />;
const IconNeedle = (p) => <Icon {...p} d={<><path d="M4 20L18 6" /><ellipse cx="19" cy="5" rx="1.6" ry="1" transform="rotate(-45 19 5)" /><path d="M6 14c-3 1-3 5 1 5s6-6 10-5" /></>} />;
const IconWhatsApp = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" /></svg>
);

// --- LOGO: a lemon wedge + wordmark ---
const LemonMark = ({ className = 'w-9 h-9' }) => (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="29" fill="#ecdf3f" stroke="#171614" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="21" fill="none" stroke="#171614" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M32 12v40M12 32h40M18 18l28 28M46 18L18 46" stroke="#171614" strokeWidth="1.5" opacity=".6" />
        <circle cx="32" cy="32" r="3" fill="#171614" />
    </svg>
);

const Logo = ({ light = false }) => (
    <a href={url('/')} className={`flex items-center gap-2.5 ${light ? 'text-paper' : 'text-ink'}`} aria-label={`${BRAND.name}, inicio`}>
        <LemonMark />
        <span className="leading-none">
            <span className="font-display italic-soft text-[1.7rem] block -mb-0.5">limonada</span>
            <span className={`kicker !text-[0.55rem] ${light ? 'text-paper/60' : 'text-ink-2'}`}>Sastrería · est. {BRAND.since}</span>
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
        <div className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-sm z-[90] bg-paper border-[1.5px] border-ink rounded-2xl shadow-[6px_6px_0_#171614] p-5 animate-rise-in" role="dialog" aria-label="Cookies">
            <p className="font-display text-xl">Galletas, pocas 🍋</p>
            <p className="text-sm text-ink-2 mt-1 mb-4">Guardamos en tu navegador lo necesario para tu carrito. Con tu permiso, también medimos visitas para mejorar el sitio. <a href={url('/pages/privacidad/')} className="underline">Aviso de privacidad</a></p>
            <div className="flex gap-2">
                <button className="btn btn-ink flex-1 !py-2.5" onClick={() => choose('all')}>Aceptar</button>
                <button className="btn btn-ghost flex-1 !py-2.5" onClick={() => choose('necessary')}>Solo necesarias</button>
            </div>
        </div>
    );
};

// --- WHATSAPP BUTTON ---
const waLink = (text) => `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;

const WhatsAppButton = () => (
    <a href={waLink('Hola, quiero información sobre un traje a la medida.')} target="_blank" rel="noopener noreferrer"
       className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-[#25d366] text-white flex items-center justify-center border-[1.5px] border-ink shadow-[3px_3px_0_#171614] hover:-translate-y-0.5 transition-transform"
       aria-label="Escríbenos por WhatsApp">
        <IconWhatsApp className="w-7 h-7" />
    </a>
);

// --- REVEAL ON SCROLL ---
const useReveal = () => {
    useEffect(() => {
        if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        }), { threshold: 0.08 });
        const scan = () => document.querySelectorAll('.reveal:not(.is-in)').forEach(el => io.observe(el));
        scan();
        const mo = new MutationObserver(scan);
        mo.observe(document.getElementById('root'), { childList: true, subtree: true });
        return () => { io.disconnect(); mo.disconnect(); };
    }, []);
};

// --- MARQUEE ---
const Marquee = ({ items, className = '' }) => {
    const row = <div aria-hidden="true">{items.map((t, i) => <span key={i} className="flex items-center gap-6 pr-6">{t}<span className="text-lemon">✺</span></span>)}</div>;
    return <div className={`marquee ${className}`} role="presentation">{row}{row}</div>;
};

// --- LAYOUT ---
const Layout = ({ children }) => {
    const lines = useCart();
    const count = lines.reduce((a, l) => a + (l.qty || 1), 0);
    const [menuOpen, setMenuOpen] = useState(false);
    useReveal();
    useEffect(() => { document.body.style.overflow = menuOpen ? 'hidden' : ''; }, [menuOpen]);

    const CartButton = ({ className = '' }) => (
        <a href={url('/pages/carrito/')} className={`btn btn-lemon !py-2.5 !px-4 ${className}`} aria-label={`Carrito, ${count} ${count === 1 ? 'traje' : 'trajes'}`}>
            <IconBag className="w-4 h-4" /> <span className="hidden sm:inline">Carrito</span>
            <span className="min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-ink text-paper text-xs mono flex items-center justify-center">{count}</span>
        </a>
    );

    return (
        <div className="min-h-screen flex flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] bg-paper px-4 py-2 rounded">Saltar al contenido</a>

            <div className="bg-ink text-paper/90 text-[0.7rem] mono py-2">
                <Marquee items={['Trajes a la medida desde $7,900', 'Hechos a mano en CDMX', `Sastrería desde ${BRAND.since}`, 'Primera prueba incluida', 'Envíos a todo México']} />
            </div>

            <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur border-b-[1.5px] border-ink">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-[4.5rem] flex items-center justify-between gap-6">
                    <Logo />
                    <nav className="hidden lg:flex items-center gap-1 text-sm font-medium" aria-label="Principal">
                        {NAV_LINKS.map(l => (
                            <a key={l.href} href={url(l.href)} aria-current={isActive(l) ? 'page' : undefined}
                               className={`px-3.5 py-2 rounded-full transition-colors ${isActive(l) ? 'bg-ink text-paper' : 'hover:bg-paper-2'}`}>{l.label}</a>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <a href={url('/pages/medidas/#cita')} className="hidden md:inline-flex btn btn-ghost !py-2.5 !px-4">Agenda cita</a>
                        <CartButton />
                        <button className="lg:hidden p-2" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><IconMenu className="w-7 h-7" /></button>
                    </div>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[70] bg-lemon animate-fade-in flex flex-col" role="dialog" aria-modal="true" aria-label="Menú">
                    <div className="h-[4.5rem] px-4 flex items-center justify-between border-b-[1.5px] border-ink">
                        <Logo />
                        <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><IconClose className="w-7 h-7" /></button>
                    </div>
                    <nav className="flex-1 flex flex-col px-6 py-10 gap-5">
                        {NAV_LINKS.map((l, i) => (
                            <a key={l.href} href={url(l.href)} onClick={() => setMenuOpen(false)} className="font-display text-5xl flex items-baseline gap-4">
                                <span className="mono text-sm">0{i + 1}</span>{l.label}
                            </a>
                        ))}
                        <a href={url('/pages/medidas/#cita')} className="btn btn-ink self-start mt-6">Agenda tu cita</a>
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
    { title: 'Tienda', links: [
        { href: '/pages/trajes/', label: 'Todos los trajes' },
        { href: '/pages/trajes/?estilo=tres-piezas', label: 'Tres piezas' },
        { href: '/pages/trajes/?ocasion=boda', label: 'Para boda' },
        { href: '/pages/trajes/#telas', label: 'Telas' },
    ] },
    { title: 'Sastrería', links: [
        { href: '/pages/medidas/', label: 'Cómo medirte' },
        { href: '/pages/medidas/#cita', label: 'Agenda una cita' },
        { href: '/pages/estudio/', label: 'El estudio' },
        { href: '/pages/estudio/#empresas', label: 'Empresas y grupos' },
    ] },
    { title: 'Ayuda', links: [
        { href: '/pages/carrito/', label: 'Mi carrito' },
        { href: '/pages/contacto/', label: 'Contacto' },
        { href: '/pages/terminos/', label: 'Términos y garantía' },
        { href: '/pages/privacidad/', label: 'Aviso de privacidad' },
    ] },
];

const Footer = () => (
    <footer className="bg-ink text-paper/75 mt-24">
        <div className="tape" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-10">
            <p className="font-display text-paper text-5xl md:text-7xl leading-[0.95] max-w-4xl">Hecho a tu medida, <span className="italic-soft text-lemon">no a la de un maniquí.</span></p>
            <div className="grid gap-10 md:grid-cols-5 mt-14">
                <div className="md:col-span-2">
                    <Logo light />
                    <p className="mt-5 text-sm max-w-xs leading-relaxed">{BRAND.tagline} en la Ciudad de México. Cortamos, cosemos y planchamos cada traje para una sola persona.</p>
                    <p className="mt-5 text-sm mono">{BRAND.phone}<br /><a href={`mailto:${BRAND.email}`} className="hover:text-lemon">{BRAND.email}</a><br />
                        <a href={`https://instagram.com/${BRAND.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-lemon">@{BRAND.instagram}</a></p>
                </div>
                {FOOTER_COLUMNS.map(col => (
                    <div key={col.title}>
                        <p className="kicker text-lemon mb-4">{col.title}</p>
                        <ul className="space-y-2.5 text-sm">{col.links.map(l => <li key={l.href}><a href={url(l.href)} className="hover:text-paper">{l.label}</a></li>)}</ul>
                    </div>
                ))}
            </div>
        </div>
        <div className="border-t border-paper/10">
            <p className="max-w-7xl mx-auto px-4 md:px-8 py-5 text-xs mono text-paper/50 flex flex-wrap justify-between gap-2">
                <span>© {new Date().getFullYear()} {BRAND.name} · {BRAND.address}</span><span>{BRAND.hours}</span>
            </p>
        </div>
    </footer>
);

// --- SHARED SECTIONS ---
const PageHero = ({ kicker, title, mark, intro, children }) => (
    <section className="border-b-[1.5px] border-ink">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24 animate-rise-in">
            {kicker && <p className="kicker text-ink-2 mb-5">{kicker}</p>}
            <h1 className="text-5xl md:text-7xl leading-[0.98]">{title} {mark && <span className="italic-soft hl">{mark}</span>}</h1>
            {intro && <p className="mt-7 text-lg text-ink-2 max-w-2xl leading-relaxed">{intro}</p>}
            {children}
        </div>
    </section>
);

const SectionTitle = ({ kicker, children, mark, center = false, aside }) => (
    <div className={`mb-12 reveal flex flex-wrap items-end justify-between gap-6 ${center ? 'text-center justify-center' : ''}`}>
        <div>
            {kicker && <p className="kicker text-ink-2 mb-3">{kicker}</p>}
            <h2 className="text-4xl md:text-6xl leading-[1]">{children} {mark && <span className="italic-soft hl">{mark}</span>}</h2>
        </div>
        {aside}
    </div>
);

// --- ERROR BOUNDARY ---
// A render error in any page shows this card instead of unmounting the whole tree (the old white screen).
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error('[limonada] Error al mostrar la página:', error, info && info.componentStack); }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <section className="max-w-2xl mx-auto px-4 py-24">
                <p className="kicker text-ink-2">Se nos fue un hilo</p>
                <h1 className="text-5xl mt-4">Algo salió mal al mostrar esta página.</h1>
                <p className="text-ink-2 mt-5">Recarga la página. Si sigue igual, escríbenos por WhatsApp y te atendemos directo.</p>
                <pre className="mt-6 text-xs bg-paper-2 rounded-xl p-4 whitespace-pre-wrap">{String(this.state.error && this.state.error.message)}</pre>
                <div className="flex flex-wrap gap-3 mt-8">
                    <button className="btn btn-ink" onClick={() => location.reload()}>Recargar</button>
                    <a className="btn btn-ghost" href={url('/')}>Ir al inicio</a>
                </div>
            </section>
        );
    }
}

const renderPage = (Page) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <ErrorBoundary><Layout><ErrorBoundary><Page /></ErrorBoundary></Layout></ErrorBoundary>
    );
};
