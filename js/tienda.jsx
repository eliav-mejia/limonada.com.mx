// Store only (inicio, /pages/trajes/, /pages/trajes/<slug>/, /pages/carrito/, /pages/estudio/).
// Data layer (db), catalogue hook, pricing, the configurable suit illustration (Traje), cards, product configurator
// and the order message.

// --- DATA LAYER ---
// The ONLY place that knows where data comes from. Today: static JSON in public/db (Etapa 1).
// Etapa 2: replace the bodies of db.* with Supabase queries and keep the same return shapes; nothing else changes.
const jsonCache = {};
const loadJson = (name) => jsonCache[name] || (jsonCache[name] =
    fetch(url(`/public/db/${name}.json`), { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(`${name}.json: ${r.status}`); return r.json(); }));

// Where a submitted order goes. null = WhatsApp only (Etapa 1). Etapa 2: a Supabase Edge Function that re-reads prices,
// creates the order and returns a Stripe Checkout URL for the deposit. It is public: validate and rate-limit there.
const ORDER_ENDPOINT = null;
const DEPOSIT = 0.5;   // anticipo para empezar el corte

const db = {
    catalog: () => Promise.all([loadJson('trajes'), loadJson('telas'), loadJson('opciones')]).then(([t, f, o]) => ({
        styles: t.styles, occasions: t.occasions,
        suits: t.suits.filter(x => x.active !== false),
        fabrics: f.fabrics,
        groups: o.groups, linings: o.linings, monogram: o.monogram, delivery: o.delivery,
    })),

    // Saves a summary locally ('li-pedidos', WITHOUT body measurements) and, when configured, posts it to ORDER_ENDPOINT.
    submitOrder: async (order) => {
        const saved = { ...order, id: `LIM-${Date.now().toString(36).toUpperCase()}`, created_at: new Date().toISOString() };
        const { measurements, ...summary } = saved;
        store.write('li-pedidos', [summary, ...store.read('li-pedidos', [])].slice(0, 20));
        if (ORDER_ENDPOINT) {
            const r = await fetch(ORDER_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saved) }).catch(() => null);
            if (r && r.ok) { const j = await r.json().catch(() => ({})); if (j.checkout_url) saved.checkout_url = j.checkout_url; }
        }
        return saved;
    },
};

const EMPTY = { status: 'loading', styles: [], occasions: [], suits: [], fabrics: [], groups: [], linings: [], monogram: { price_delta_mxn: 0, max_length: 3 }, delivery: [] };

const useCatalog = () => {
    const [state, setState] = useState(EMPTY);
    useEffect(() => {
        let alive = true;
        db.catalog()
            .then(d => alive && setState({ status: 'ready', ...d }))
            .catch(err => { console.error('[tienda] No se pudo cargar el catálogo:', err); alive && setState(s => ({ ...s, status: 'error' })); });
        return () => { alive = false; };
    }, []);
    return useMemo(() => {
        const colors = {};
        state.fabrics.forEach(f => f.colors.forEach(c => { colors[c.id] = c; }));
        const index = (list) => Object.fromEntries(list.map(x => [x.id, x]));
        return {
            ...state, colors,
            byId: index(state.suits),
            bySlug: Object.fromEntries(state.suits.map(s => [s.slug, s])),
            style: index(state.styles), occasion: index(state.occasions),
            fabric: index(state.fabrics), group: index(state.groups), lining: index(state.linings), deliveryById: index(state.delivery),
        };
    }, [state]);
};

// --- CONFIG + PRICE ---
// A config holds one choice per option group plus fabric, color, lining, monogram and delivery. The suit's base price
// is the price of its `defaults`; every choice adds (its delta − the default's delta).
const optionOf = (catalog, groupId, id) => ((catalog.group[groupId] || { options: [] }).options.find(o => o.id === id));
const delta = (x) => (x && x.price_delta_mxn) || 0;

const normalizeConfig = (catalog, suit, cfg = {}) => {
    const c = { delivery: 'estandar', monogram: '', ...suit.defaults, ...cfg };
    const fabric = catalog.fabric[c.fabric] || catalog.fabric[suit.defaults.fabric] || catalog.fabrics[0];
    if (!fabric) return c;
    c.fabric = fabric.id;
    if (!fabric.colors.some(x => x.id === c.color)) c.color = fabric.colors[0].id;
    catalog.groups.forEach(g => { if (!optionOf(catalog, g.id, c[g.id])) c[g.id] = suit.defaults[g.id] || g.options[0].id; });
    if (!catalog.lining[c.lining]) c.lining = suit.defaults.lining;
    if (!catalog.deliveryById[c.delivery]) c.delivery = 'estandar';
    c.monogram = String(c.monogram || '').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ.&]/g, '').slice(0, catalog.monogram.max_length || 3);
    return c;
};

const priceBreakdown = (catalog, suit, config) => {
    const d = suit.defaults, rows = [];
    const add = (label, value) => { if (value) rows.push([label, value]); };
    add(`Tela: ${catalog.fabric[config.fabric]?.name}`, delta(catalog.fabric[config.fabric]) - delta(catalog.fabric[d.fabric]));
    catalog.groups.forEach(g => add(`${g.label}: ${optionOf(catalog, g.id, config[g.id])?.label}`, delta(optionOf(catalog, g.id, config[g.id])) - delta(optionOf(catalog, g.id, d[g.id]))));
    add(`Forro: ${catalog.lining[config.lining]?.label}`, delta(catalog.lining[config.lining]) - delta(catalog.lining[d.lining]));
    if (config.monogram && !suit.monogram_included) add(`Monograma ${config.monogram}`, catalog.monogram.price_delta_mxn);
    add(`Entrega ${catalog.deliveryById[config.delivery]?.label.toLowerCase()}`, delta(catalog.deliveryById[config.delivery]));
    return rows;
};

const priceOf = (catalog, suit, config) => suit.base_price_mxn + priceBreakdown(catalog, suit, config).reduce((a, [, v]) => a + v, 0);

// Human summary of a config: [[label, value], ...]
const describeConfig = (catalog, config) => [
    ['Tela', `${catalog.fabric[config.fabric]?.name} · ${catalog.colors[config.color]?.name}`],
    ...catalog.groups.map(g => [g.label, optionOf(catalog, g.id, config[g.id])?.label]),
    ['Forro', catalog.lining[config.lining]?.label],
    ...(config.monogram ? [['Monograma', config.monogram]] : []),
    ['Entrega', catalog.deliveryById[config.delivery]?.label],
];

// Cart lines resolved against the catalogue (unknown or inactive suits are dropped).
const useCartLines = (catalog) => useCart()
    .map(l => {
        const suit = catalog.byId[l.suitId];
        if (!suit) return null;
        const config = normalizeConfig(catalog, suit, l.config);
        const unit = priceOf(catalog, suit, config);
        return { ...l, qty: Math.max(1, l.qty || 1), suit, config, unit, total: unit * Math.max(1, l.qty || 1) };
    })
    .filter(Boolean);

// --- SUIT ILLUSTRATION ---
// Flat SVG redrawn from the config (fabric pattern, colour, cut, lapel, buttons, vest, pocket square), so the catalogue
// and the configurator work without photos. When photos exist, add `images` to the suit and show them next to it.
const luminance = (hex) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const FabricPattern = ({ id, pattern, hex }) => {
    const light = luminance(hex) < 0.42;
    const ln = light ? 'rgba(255,255,255,.24)' : 'rgba(0,0,0,.16)';
    const dk = light ? 'rgba(0,0,0,.22)' : 'rgba(0,0,0,.08)';
    const tile = {
        raya: [7, 7, <path d="M0 0V7" stroke={ln} strokeWidth=".7" />],
        cuadro: [18, 18, <><path d="M0 0H18M0 0V18" stroke={ln} strokeWidth=".9" /><path d="M0 3H18M3 0V18" stroke={ln} strokeWidth=".4" /><path d="M9 0V18M0 9H18" stroke={dk} strokeWidth="2" /></>],
        espiga: [8, 6, <path d="M0 0L4 3L0 6M4 0L8 3L4 6" stroke={ln} strokeWidth=".8" fill="none" />],
        pana: [3.2, 3.2, <rect width="1.4" height="3.2" fill={dk} />],
        lino: [40, 7, <path d="M0 2H13M18 2H24M6 5H19M27 5H38" stroke={ln} strokeWidth=".6" />],
    }[pattern];
    return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={tile ? tile[0] : 4} height={tile ? tile[1] : 4}>
            <rect width="40" height="40" fill={hex} />
            {tile && tile[2]}
        </pattern>
    );
};

const BUTTONS = {
    uno: { y: 150, at: [[100, 156]] },
    dos: { y: 134, at: [[100, 140], [100, 168]] },
    tres: { y: 112, at: [[100, 118], [100, 142], [100, 166]] },
    cruzado: { y: 124, at: [[87, 132], [113, 132], [87, 156], [113, 156], [87, 180], [113, 180]] },
};

const Traje = ({ catalog, config, className = '', hanger = true, label }) => {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const fabric = catalog.fabric[config.fabric] || { pattern: 'liso' };
    const hex = (catalog.colors[config.color] || { hex: '#1d2840' }).hex;
    const lining = (catalog.lining[config.lining] || { hex: '#ecdf3f' }).hex;
    const fill = `url(#f${uid})`;
    const ink = 'rgba(10,10,10,.55)';
    const fit = { slim: [56, 62, 52], clasico: [55, 58, 50], relajado: [51, 56, 47] }[config.fit] || [56, 62, 52];
    const [sL, wL, hL] = fit, R = (x) => 200 - x;
    const b = BUTTONS[config.buttons] || BUTTONS.dos;
    const Yb = b.y, mid = 72 + (Yb - 72) * 0.35;
    const satin = config.lapel === 'chal';
    const patch = fabric.pattern === 'lino';

    const lapel = {
        muesca: `M84 40 L100 ${Yb} L70 ${mid} L65 72 L76 69 L70 53 Z`,
        pico: `M84 40 L100 ${Yb} L70 ${mid} L60 60 L76 69 L70 53 Z`,
        chal: `M84 40 C64 54 62 ${mid} 72 ${mid + 10} Q88 ${Yb - 14} 100 ${Yb} Z`,
    }[config.lapel] || '';
    const body = `M${sL} 50 L82 40 L118 40 L${R(sL)} 50 L${R(wL)} 150 L${R(hL)} 240 L${hL} 240 L${wL} 150 Z`;
    const sleeveL = `M${sL} 50 L${sL - 17} 66 L${sL - 21} 228 L${sL + 3} 230 L${sL + 7} 98 Z`;
    const sleeveR = `M${R(sL)} 50 L${R(sL) + 17} 66 L${R(sL) + 21} 228 L${R(sL) - 3} 230 L${R(sL) - 7} 98 Z`;
    const Half = ({ children }) => <>{children}<g transform="translate(200,0) scale(-1,1)">{children}</g></>;

    return (
        <svg viewBox="0 0 200 256" className={className} role="img" aria-label={label || `Traje ${catalog.fabric[config.fabric]?.name || ''} ${catalog.colors[config.color]?.name || ''}`}>
            <defs>
                <FabricPattern id={`f${uid}`} pattern={fabric.pattern} hex={hex} />
                <linearGradient id={`s${uid}`} x1="0" x2="1">
                    <stop offset="0" stopColor="#000" stopOpacity=".22" /><stop offset=".3" stopColor="#000" stopOpacity="0" />
                    <stop offset=".7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" />
                </linearGradient>
                <clipPath id={`v${uid}`}><path d={`M82 40 L118 40 L100 ${Yb} Z`} /></clipPath>
            </defs>

            {hanger && <g fill="none" strokeLinecap="round">
                <path d="M100 30 V20 a6 6 0 1 1 6 -6" stroke="#171614" strokeWidth="2" />
                <path d="M46 50 Q100 22 154 50" stroke="#8b6a45" strokeWidth="4" />
            </g>}

            {/* trousers peeking under the hem */}
            <path d={`M${hL + 8} 238 H98 L97 256 H${hL + 10} Z M${R(hL + 8)} 238 H102 L103 256 H${R(hL + 10)} Z`} fill={fill} stroke={ink} strokeWidth=".8" />

            <path d={sleeveL} fill={fill} stroke={ink} strokeWidth="1" />
            <path d={sleeveR} fill={fill} stroke={ink} strokeWidth="1" />
            <path d={`${sleeveL} ${sleeveR}`} fill="#000" opacity=".1" />
            <path d={body} fill={fill} stroke={ink} strokeWidth="1" />
            <path d={body} fill={`url(#s${uid})`} />

            {/* lining peek at the open front */}
            <path d={`M100 ${Yb + 6} L100 240 L94 240 Z`} fill={lining} opacity=".9" />

            {/* shirt, tie, then the vest over the tie */}
            <path d={`M82 40 L118 40 L100 ${Yb} Z`} fill="#f7f4ec" />
            {satin
                ? <path d="M92 46 L100 50 L108 46 L108 54 L100 50 L92 54 Z" fill="#111" />
                : <path d={`M97.5 45 H102.5 L104 ${Math.min(Yb - 8, 112)} L100 ${Math.min(Yb - 3, 117)} L96 ${Math.min(Yb - 8, 112)} Z`} fill={config.square === 'si' ? '#171614' : '#3f4a2f'} />}
            <g clipPath={`url(#v${uid})`}>
                {config.vest === 'si' && <>
                    <path d={`M60 68 L100 90 L140 68 V260 H60 Z`} fill={fill} stroke={ink} strokeWidth=".8" />
                    {[98, 108, 118, 128, 138].filter(y => y < Yb - 4).map(y => <circle key={y} cx="100" cy={y} r="1.6" fill="#171614" opacity=".7" />)}
                </>}
            </g>
            <path d="M84 40 Q100 34 116 40 L113 44 Q100 39 87 44 Z" fill="#e8e3d6" />

            {/* lapels */}
            <Half><path d={lapel} fill={satin ? '#0f0f0f' : fill} stroke={ink} strokeWidth="1" />{satin && <path d={lapel} fill="#fff" opacity=".07" />}</Half>

            {/* front edges, pockets, buttons */}
            <Half><path d={`M100 ${Yb} V234 Q99 240 ${config.buttons === 'cruzado' ? 92 : 88} 240`} stroke={ink} strokeWidth="1" fill="none" /></Half>
            <Half>{patch
                ? <path d={`M${wL + 4} 176 h26 v24 q0 4 -4 4 h-18 q-4 0 -4 -4 Z`} fill={fill} stroke={ink} strokeWidth=".9" />
                : <path d={`M${wL + 4} 180 h26 v6 h-26 Z`} fill={fill} stroke={ink} strokeWidth=".9" />}</Half>
            <path d="M118 102 l20 -3 v5 l-20 3 Z" fill={fill} stroke={ink} strokeWidth=".8" />
            {config.square === 'si' && <path d="M121 101 l3 -9 l4 6 l4 -8 l3 10 Z" fill="#ecdf3f" stroke="#171614" strokeWidth=".7" />}
            {b.at.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={satin ? '#111' : '#2a221b'} stroke="rgba(255,255,255,.25)" strokeWidth=".5" />)}
            <Half>{[214, 219, 224].map(y => <circle key={y} cx={sL - 16} cy={y} r="1.3" fill="#2a221b" />)}</Half>
        </svg>
    );
};

// A small square of the fabric, for pickers and cards
const FabricSwatch = ({ catalog, fabricId, colorId, className = 'w-10 h-10' }) => {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const f = catalog.fabric[fabricId], c = catalog.colors[colorId] || (f && f.colors[0]);
    if (!f || !c) return null;
    return (
        <svg viewBox="0 0 40 40" className={`${className} rounded-full border-[1.5px] border-ink`} aria-hidden="true">
            <defs><FabricPattern id={`w${uid}`} pattern={f.pattern} hex={c.hex} /></defs>
            <rect width="40" height="40" fill={`url(#w${uid})`} />
        </svg>
    );
};

const ColorDot = ({ color, active, onClick, size = 'w-7 h-7' }) => (
    <button type="button" onClick={onClick} title={color.name} aria-label={color.name} aria-pressed={active}
        className={`${size} rounded-full border-[1.5px] transition-shadow ${active ? 'border-ink ring-2 ring-offset-2 ring-offset-paper ring-ink' : 'border-ink/30 hover:border-ink'}`}
        style={{ background: color.hex }} />
);

// --- CARD ---
const suitHref = (suit, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return url(`/pages/trajes/${suit.slug}/${q ? `?${q}` : ''}`);
};

const SuitCard = ({ suit, catalog, index }) => {
    const [colorId, setColorId] = useState(suit.defaults.color);
    const config = normalizeConfig(catalog, suit, { color: colorId });
    const colors = catalog.fabric[suit.defaults.fabric]?.colors || [];
    const href = suitHref(suit, colorId !== suit.defaults.color ? { color: colorId } : {});
    return (
        <article className="reveal group flex flex-col">
            <a href={href} className="block rounded-[1.75rem] bg-paper-2 border-[1.5px] border-ink aspect-[4/5] relative overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0_#171614]">
                <div className="absolute inset-x-[18%] top-[14%] bottom-[10%] rounded-full bg-lemon/70 scale-90 group-hover:scale-100 transition-transform duration-500" />
                <Traje catalog={catalog} config={config} className="absolute inset-0 w-full h-full p-6 md:p-8" />
                {index != null && <span className="absolute top-4 left-5 mono text-xs">Nº {String(index + 1).padStart(2, '0')}</span>}
                {suit.badge && <span className={`absolute top-4 right-4 sticker ${suit.badge === 'Nuevo' ? 'sticker-clay' : ''}`}>{suit.badge}</span>}
            </a>
            <div className="pt-4 flex-1 flex flex-col">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-3xl"><a href={href} className="hover:italic-soft">{suit.name}</a></h3>
                    <p className="mono text-sm whitespace-nowrap">desde {formatMXN(suit.base_price_mxn)}</p>
                </div>
                <p className="text-sm text-ink-2 mt-1 flex-1">{suit.short}</p>
                <div className="flex items-center gap-2 mt-4" role="group" aria-label="Colores">
                    {colors.map(c => <ColorDot key={c.id} color={c} active={c.id === colorId} onClick={() => setColorId(c.id)} size="w-5 h-5" />)}
                    <span className="kicker text-ink-2 ml-auto">{catalog.style[suit.style_id]?.label}</span>
                </div>
            </div>
        </article>
    );
};

const GridSkeleton = ({ n = 3 }) => (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {Array.from({ length: n }, (_, i) => <div key={i} className="animate-pulse"><div className="rounded-[1.75rem] bg-paper-2 aspect-[4/5]" /><div className="h-7 bg-paper-2 rounded mt-4 w-2/3" /><div className="h-4 bg-paper-2 rounded mt-2" /></div>)}
    </div>
);

const LoadError = () => (
    <div className="text-center py-16">
        <p className="font-display text-3xl">No pudimos cargar el catálogo.</p>
        <p className="text-ink-2 mt-2">Recarga la página en un momento o escríbenos por WhatsApp.</p>
        <button className="btn btn-ink mt-6" onClick={() => location.reload()}>Recargar</button>
    </div>
);

// Rotating circular text badge
const SpinBadge = ({ text = 'hecho a mano · ciudad de méxico · ', className = 'w-28 h-28' }) => {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    return (
        <svg viewBox="0 0 100 100" className={`${className} overflow-hidden rounded-full`} aria-hidden="true">
            <defs><path id={`c${uid}`} d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" /></defs>
            <circle cx="50" cy="50" r="49" fill="#171614" />
            <g className="spin-slow" style={{ transformOrigin: '50px 50px' }}>
                <text fill="#f4f0e6" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.6, letterSpacing: 1.6, textTransform: 'uppercase' }}>
                    <textPath href={`#c${uid}`}>{text.repeat(2)}</textPath>
                </text>
            </g>
            <circle cx="50" cy="50" r="15" fill="#ecdf3f" /><path d="M50 37v26M37 50h26M41 41l18 18M59 41L41 59" stroke="#171614" strokeWidth="1.2" opacity=".6" />
        </svg>
    );
};

// --- PRODUCT PAGE (configurator) ---
// Each /pages/trajes/<slug>/index.html calls renderSuit(). The slug comes from the URL; ?tela= and ?color= preselect,
// ?editar=<cart key> loads that cart line and saves changes back to it.
const Step = ({ n, title, hint, children }) => (
    <fieldset className="py-7 stitch min-w-0">
        <legend className="sr-only">{title}</legend>
        <div className="flex items-baseline gap-3 mb-4">
            <span className="mono text-xs text-ink-2">{String(n).padStart(2, '0')}</span>
            <h2 className="text-2xl">{title}</h2>
            {hint && <span className="text-sm text-ink-2 hidden sm:inline">· {hint}</span>}
        </div>
        {children}
    </fieldset>
);

const OptionChips = ({ group, value, onChange, suit }) => (
    <div className="flex flex-wrap gap-2">
        {group.options.map(o => {
            const diff = delta(o) - delta(group.options.find(x => x.id === suit.defaults[group.id]));
            return (
                <button key={o.id} type="button" className="chip !py-2.5 !px-4 flex-col !items-start !gap-0.5 text-left" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
                    <span className="font-sans text-sm font-semibold">{o.label}{diff ? <span className="mono font-normal opacity-70"> {diff > 0 ? '+' : '−'}{formatMXN(Math.abs(diff))}</span> : null}</span>
                    {o.note && <span className="opacity-70 text-[0.68rem]">{o.note}</span>}
                </button>
            );
        })}
    </div>
);

const SuitPage = () => {
    const catalog = useCatalog();
    const slug = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '');
    const suit = catalog.bySlug[slug];
    const params = new URLSearchParams(window.location.search);
    const editKey = params.get('editar');
    const [config, setConfig] = useState(null);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        if (!suit) return;
        const editing = editKey && cart.read().find(l => l.key === editKey && l.suitId === suit.id);
        if (editing) { setQty(editing.qty || 1); setConfig(normalizeConfig(catalog, suit, editing.config)); return; }
        const pre = {};
        if (params.get('tela')) pre.fabric = params.get('tela');
        if (params.get('color')) pre.color = params.get('color');
        setConfig(normalizeConfig(catalog, suit, pre));
    }, [suit]);

    if (catalog.status === 'loading' || (suit && !config)) return <div className="max-w-6xl mx-auto px-4 py-20"><GridSkeleton n={2} /></div>;
    if (catalog.status === 'error') return <LoadError />;
    if (!suit) return (
        <PageHero kicker="Trajes" title="Este traje" mark="ya no está" intro="Puede que lo hayamos retirado o cambiado de nombre.">
            <a href={url('/pages/trajes/')} className="btn btn-ink mt-8">Ver todos los trajes</a>
        </PageHero>
    );

    const set = (patch) => setConfig(c => normalizeConfig(catalog, suit, { ...c, ...patch }));
    const fabric = catalog.fabric[config.fabric];
    const price = priceOf(catalog, suit, config);
    const extras = priceBreakdown(catalog, suit, config);
    const related = catalog.suits.filter(s => s.id !== suit.id && (s.style_id === suit.style_id || s.occasions.some(o => suit.occasions.includes(o)))).slice(0, 3);
    const save = () => {
        if (editKey && cart.read().some(l => l.key === editKey)) cart.update(editKey, { config, qty });
        else cart.add(suit.id, config, qty);
        setAdded(true);
    };

    return (
        <>
            <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-10 lg:gap-16 items-start">
                {/* Preview */}
                <div className="lg:sticky lg:top-28 animate-fade-in">
                    <div className="rounded-[2rem] bg-paper-2 border-[1.5px] border-ink aspect-square relative overflow-hidden">
                        <div className="absolute inset-[12%] rounded-full bg-lemon" />
                        <Traje catalog={catalog} config={config} className="absolute inset-0 w-full h-full p-8 md:p-12" />
                        <SpinBadge className="absolute bottom-3 right-3 w-24 h-24 md:w-32 md:h-32" />
                        <div className="absolute top-5 left-5 flex items-center gap-2 bg-paper/90 rounded-full pl-1 pr-3 py-1 border-[1.5px] border-ink">
                            <FabricSwatch catalog={catalog} fabricId={config.fabric} colorId={config.color} className="w-7 h-7" />
                            <span className="text-sm">{fabric.name} · {catalog.colors[config.color].name}</span>
                        </div>
                    </div>
                    <p className="mono text-[0.68rem] text-ink-2 mt-3">Ilustración de referencia. En la cita te mostramos el muestrario real de cada tela.</p>
                </div>

                {/* Configurator */}
                <div className="animate-rise-in">
                    <nav className="text-sm text-ink-2 mb-6 mono" aria-label="Ruta">
                        <a href={url('/pages/trajes/')} className="hover:text-ink underline-offset-4 hover:underline">Trajes</a> / <a href={url(`/pages/trajes/?estilo=${suit.style_id}`)} className="hover:text-ink underline-offset-4 hover:underline">{catalog.style[suit.style_id]?.label}</a>
                    </nav>
                    <p className="kicker text-ink-2">{suit.kicker}</p>
                    <h1 className="text-6xl md:text-7xl mt-3 leading-[0.95]">{suit.name}</h1>
                    <p className="text-lg text-ink-2 mt-5 leading-relaxed">{suit.description}</p>
                    <div className="flex flex-wrap gap-2 mt-5">{suit.occasions.map(o => <a key={o} href={url(`/pages/trajes/?ocasion=${o}`)} className="chip">{catalog.occasion[o]?.label}</a>)}</div>

                    <div className="mt-8">
                        <Step n={1} title="Tela" hint="Todas cortadas a mano">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {catalog.fabrics.map(f => {
                                    const diff = delta(f) - delta(catalog.fabric[suit.defaults.fabric]);
                                    const on = f.id === config.fabric;
                                    return (
                                        <button key={f.id} type="button" aria-pressed={on} onClick={() => set({ fabric: f.id })}
                                            className={`min-w-0 flex items-center gap-3 text-left rounded-2xl border-[1.5px] p-3 transition-colors ${on ? 'border-ink bg-paper-2' : 'border-ink/15 hover:border-ink'}`}>
                                            <FabricSwatch catalog={catalog} fabricId={f.id} colorId={on ? config.color : f.colors[0].id} />
                                            <span className="flex-1 min-w-0">
                                                <span className="block font-semibold text-sm">{f.name}</span>
                                                <span className="block mono text-[0.68rem] text-ink-2 truncate">{f.origin} · {f.season}</span>
                                            </span>
                                            {diff !== 0 && <span className="mono text-xs">{diff > 0 ? '+' : '−'}{formatMXN(Math.abs(diff))}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>
                        <Step n={2} title="Color" hint={catalog.colors[config.color].name}>
                            <div className="flex flex-wrap gap-3">{fabric.colors.map(c => <ColorDot key={c.id} color={c} active={c.id === config.color} onClick={() => set({ color: c.id })} size="w-10 h-10" />)}</div>
                        </Step>
                        {catalog.groups.map((g, i) => (
                            <Step key={g.id} n={i + 3} title={g.label} hint={g.hint}>
                                <OptionChips group={g} value={config[g.id]} onChange={(v) => set({ [g.id]: v })} suit={suit} />
                            </Step>
                        ))}
                        <Step n={catalog.groups.length + 3} title="Forro" hint="Lo que solo tú sabes que está ahí">
                            <div className="flex flex-wrap gap-2">
                                {catalog.linings.map(l => {
                                    const diff = delta(l) - delta(catalog.lining[suit.defaults.lining]);
                                    return (
                                        <button key={l.id} type="button" className="chip !pl-1.5" aria-pressed={config.lining === l.id} onClick={() => set({ lining: l.id })}>
                                            <span className="w-6 h-6 rounded-full border border-ink/40" style={{ background: l.hex }} />{l.label}{diff ? ` ${diff > 0 ? '+' : '−'}${formatMXN(Math.abs(diff))}` : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>
                        <Step n={catalog.groups.length + 4} title="Monograma" hint={suit.monogram_included ? 'Incluido en este traje' : `Bordado en el forro · +${formatMXN(catalog.monogram.price_delta_mxn)}`}>
                            <input className="field !w-40 mono uppercase tracking-[0.3em] text-center text-lg" maxLength={catalog.monogram.max_length} placeholder="ABC"
                                value={config.monogram} onChange={e => set({ monogram: e.target.value })} aria-label="Iniciales del monograma" />
                        </Step>
                        <Step n={catalog.groups.length + 5} title="Entrega" hint={`${suit.lead_days} días desde tu toma de medidas`}>
                            <div className="flex flex-wrap gap-2">
                                {catalog.delivery.map(d => (
                                    <button key={d.id} type="button" className="chip !py-2.5 !px-4 flex-col !items-start !gap-0.5" aria-pressed={config.delivery === d.id} onClick={() => set({ delivery: d.id })}>
                                        <span className="font-sans text-sm font-semibold">{d.label}{delta(d) ? <span className="mono font-normal opacity-70"> +{formatMXN(delta(d))}</span> : null}</span>
                                        <span className="opacity-70 text-[0.68rem]">{d.note}</span>
                                    </button>
                                ))}
                            </div>
                        </Step>
                    </div>

                    {/* Summary + add to cart */}
                    <div className="lg:sticky lg:bottom-3 z-30 mt-4 rounded-[1.5rem] bg-ink text-paper p-5 shadow-[6px_6px_0_#ecdf3f]">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="kicker text-paper/60">Tu traje, IVA incluido</p>
                                <p className="font-display text-4xl mt-1">{formatMXN(price * qty)}</p>
                                <p className="mono text-[0.68rem] text-paper/60 mt-1">Anticipo para empezar: {formatMXN(Math.round(price * qty * DEPOSIT))}</p>
                            </div>
                            <label className="flex items-center gap-2 mono text-sm">
                                <span className="text-paper/60">Cant.</span>
                                <input type="number" min="1" max="20" value={qty} onChange={e => setQty(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                                    className="w-14 bg-transparent border-[1.5px] border-paper/30 rounded-full px-2 py-1.5 text-center" />
                            </label>
                        </div>
                        {extras.length > 0 && (
                            <details className="mt-3 text-sm text-paper/75">
                                <summary className="cursor-pointer mono text-xs">Base {formatMXN(suit.base_price_mxn)} + {extras.length} ajuste{extras.length > 1 ? 's' : ''}</summary>
                                <ul className="mt-2 space-y-1">{extras.map(([l, v]) => <li key={l} className="flex justify-between gap-4"><span>{l}</span><span className="mono">{v > 0 ? '+' : '−'}{formatMXN(Math.abs(v))}</span></li>)}</ul>
                            </details>
                        )}
                        {added
                            ? <div className="mt-4 flex flex-wrap gap-2">
                                <a href={url('/pages/carrito/')} className="btn btn-lemon flex-1"><IconCheck className="w-4 h-4" /> {editKey ? 'Guardado · ver carrito' : 'En tu carrito · pagar'}</a>
                                <button className="btn !border-paper/30 !text-paper btn-ghost" onClick={() => setAdded(false)}>Seguir</button>
                              </div>
                            : <button className="btn btn-lemon w-full mt-4" onClick={save}><IconBag className="w-4 h-4" /> {editKey ? 'Guardar cambios' : 'Agregar al carrito'}</button>}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mt-12">
                        <div>
                            <h2 className="text-2xl mb-3">Detalles de la casa</h2>
                            <ul className="space-y-2">{suit.features.map(f => <li key={f} className="flex gap-3 text-ink-2"><IconNeedle className="w-5 h-5 text-ink shrink-0" />{f}</li>)}</ul>
                        </div>
                        <div className="rounded-2xl border-[1.5px] border-ink p-5">
                            <p className="kicker text-ink-2">La tela</p>
                            <p className="font-display text-2xl mt-1">{fabric.name}</p>
                            <p className="text-sm text-ink-2 mt-2">{fabric.composition} · {fabric.weight}<br />{fabric.origin} · {fabric.season}</p>
                            <p className="text-xs text-ink-2 mt-3">{fabric.care}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Phones: slim price bar (the full summary above is sticky only on desktop); leaves room for the WhatsApp button */}
            <div className="lg:hidden fixed bottom-4 left-4 right-[5.5rem] z-40 rounded-full bg-ink text-paper pl-5 pr-1.5 py-1.5 flex items-center justify-between gap-3 shadow-[4px_4px_0_#ecdf3f]">
                <span className="font-display text-xl">{formatMXN(price * qty)}</span>
                {added
                    ? <a href={url('/pages/carrito/')} className="btn btn-lemon !py-2 !px-4 text-sm">Ver carrito</a>
                    : <button className="btn btn-lemon !py-2 !px-4 text-sm" onClick={save}>{editKey ? 'Guardar' : 'Agregar'}</button>}
            </div>

            <HowItWorks compact />

            {related.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 md:px-8 pt-20">
                    <SectionTitle kicker="También te puede gustar" mark="familia">De la misma</SectionTitle>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">{related.map(s => <SuitCard key={s.id} suit={s} catalog={catalog} />)}</div>
                </section>
            )}
        </>
    );
};

const renderSuit = () => renderPage(SuitPage);

// --- HOW IT WORKS (home, product page) ---
const STEPS = [
    { n: '01', title: 'Diseña', text: 'Elige modelo, tela, solapa, forro y detalles. Ves cada cambio y el precio al momento.' },
    { n: '02', title: 'Aparta', text: `Pagas ${Math.round(DEPOSIT * 100)} % de anticipo para empezar. El resto, cuando te lo pruebes.` },
    { n: '03', title: 'Te medimos', text: 'En el estudio, a domicilio en CDMX o tú mismo con nuestra guía y una videollamada.' },
    { n: '04', title: 'Estrénalo', text: 'Una prueba con el sastre, ajustes finos y entrega planchado. Primer ajuste gratis.' },
];

const HowItWorks = ({ compact = false }) => (
    <section className={`bg-olive text-paper ${compact ? 'py-16' : 'py-20 md:py-28'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-12 reveal flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="kicker text-lemon mb-3">Cómo funciona</p>
                    <h2 className="text-4xl md:text-6xl leading-[1]">De la pantalla a tus <span className="italic-soft text-lemon">hombros.</span></h2>
                </div>
                <a href={url('/pages/medidas/')} className="btn btn-lemon">Guía de medidas <IconTape className="w-4 h-4" /></a>
            </div>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {STEPS.map(s => (
                    <li key={s.n} className="reveal rounded-[1.5rem] border-[1.5px] border-paper/25 p-6">
                        <p className="mono text-lemon text-sm">{s.n}</p>
                        <h3 className="text-3xl mt-3">{s.title}</h3>
                        <p className="text-paper/75 mt-2 text-sm leading-relaxed">{s.text}</p>
                    </li>
                ))}
            </ol>
        </div>
    </section>
);

// --- ORDER MESSAGE (WhatsApp / email) ---
const orderMessage = (catalog, order, lines) => {
    const L = [`Hola Limonada, quiero hacer este pedido (${order.id}):`, ''];
    lines.forEach((l, i) => {
        L.push(`${i + 1}. ${l.suit.name} × ${l.qty} — ${formatMXN(l.total)}`);
        describeConfig(catalog, l.config).forEach(([k, v]) => L.push(`   ${k}: ${v}`));
    });
    L.push('', `Total: ${formatMXN(order.total)} (IVA incluido)`, `Anticipo ${Math.round(DEPOSIT * 100)} %: ${formatMXN(order.deposit)}`, '');
    L.push(`Medidas: ${order.measure_label}`);
    if (order.measurements) Object.entries(order.measurements).filter(([, v]) => v).forEach(([k, v]) => L.push(`   ${k}: ${v} cm`));
    L.push('', `${order.customer.name} · ${order.customer.phone} · ${order.customer.email}`, `Ciudad: ${order.customer.city}`);
    if (order.customer.event_date) L.push(`Fecha del evento: ${order.customer.event_date}`);
    if (order.customer.notes) L.push(`Notas: ${order.customer.notes}`);
    return L.join('\n');
};

// --- MEASUREMENTS (carrito, medidas) ---
// How the customer gets measured. price_delta_mxn is added once per order.
const MEASURE_METHODS = [
    { id: 'estudio', label: 'En el estudio', note: 'CDMX · 40 min · con café', price_delta_mxn: 0 },
    { id: 'domicilio', label: 'A domicilio', note: 'CDMX y zona metropolitana', price_delta_mxn: 500 },   // [verificar] zona y costo
    { id: 'video', label: 'Videollamada', note: 'Te guiamos con una cinta en casa', price_delta_mxn: 0 },
    { id: 'propias', label: 'Ya tengo mis medidas', note: 'Las escribes aquí; las revisamos antes de cortar', price_delta_mxn: 0 },
];

// In centimetres. `how` is shown in the guide (pages/medidas/) and as the field hint in the cart.
const MEASURES = [
    { id: 'estatura', label: 'Estatura', how: 'Descalzo, espalda contra la pared, de la planta a la coronilla.' },
    { id: 'cuello', label: 'Cuello', how: 'Alrededor de la base del cuello, dejando un dedo de holgura.' },
    { id: 'pecho', label: 'Pecho', how: 'En la parte más ancha, bajo las axilas, con los brazos relajados.' },
    { id: 'cintura', label: 'Cintura', how: 'A la altura del ombligo, donde va el pantalón, sin meter el abdomen.' },
    { id: 'cadera', label: 'Cadera', how: 'En la parte más ancha del glúteo, con los pies juntos.' },
    { id: 'hombros', label: 'Hombros', how: 'De la punta de un hombro a la otra, por la espalda.' },
    { id: 'manga', label: 'Largo de manga', how: 'De la punta del hombro al hueso de la muñeca, con el brazo un poco doblado.' },
    { id: 'saco', label: 'Largo de saco', how: 'De la base del cuello, por la espalda, hasta donde quieres que caiga.' },
    { id: 'entrepierna', label: 'Entrepierna', how: 'Del tiro al suelo por la cara interna de la pierna, sin zapatos.' },
];
