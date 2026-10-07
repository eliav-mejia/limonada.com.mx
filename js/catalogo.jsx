// Catalogue only (index, /pages/colecciones/, garment pages, /pages/cotizacion/, /pages/empresa/, /pages/distribuidores/).
// Data layer (db), catalogue hook, garment illustration, cards, garment page and the quote message.

// --- DATA LAYER ---
// The ONLY place that knows where data comes from. Today: static JSON in /public/db (Etapa 1).
// Etapa 2: replace the bodies of db.* with Supabase queries and keep the same return shapes; nothing else changes.
const DB_BASE = '/public/db';
const jsonCache = {};
const loadJson = (name) => jsonCache[name] || (jsonCache[name] =
    fetch(`${DB_BASE}/${name}.json`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); }));

// Where a submitted quote goes. null = WhatsApp only (Etapa 1). Set to a Google Apps Script / Worker URL to also
// store it in a sheet or database. The endpoint must validate and rate-limit: it is public.
const QUOTE_ENDPOINT = null;

const db = {
    catalog: () => Promise.all([loadJson('colecciones'), loadJson('prendas'), loadJson('telas')]).then(([c, g, f]) => ({
        lines: c.lines,
        types: [...c.types].sort((a, b) => a.sort_order - b.sort_order),
        garments: g.garments.filter(x => x.active !== false),
        fabrics: f.fabrics,
    })),
    distributors: () => loadJson('distribuidores').then(d => d.distributors.filter(x => x.active !== false)),

    // Saves the request locally ('li-solicitudes') and, when configured, posts it to QUOTE_ENDPOINT.
    submitQuote: async (request) => {
        const saved = { ...request, id: `COT-${Date.now().toString(36).toUpperCase()}`, created_at: new Date().toISOString() };
        store.write('li-solicitudes', [saved, ...store.read('li-solicitudes', [])]);
        if (QUOTE_ENDPOINT) {
            await fetch(QUOTE_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(saved) }).catch(() => {});
        }
        return saved;
    },
};

const useCatalog = () => {
    const [state, setState] = useState({ status: 'loading', lines: [], types: [], garments: [], fabrics: [] });
    useEffect(() => {
        let alive = true;
        db.catalog()
            .then(d => alive && setState({ status: 'ready', ...d }))
            .catch(err => { console.error('[catalogo] No se pudo cargar:', err); alive && setState(s => ({ ...s, status: 'error' })); });
        return () => { alive = false; };
    }, []);
    return useMemo(() => {
        const colors = {};
        state.fabrics.forEach(f => f.colors.forEach(c => { colors[c.id] = c; }));
        return {
            ...state,
            colors,
            byId: Object.fromEntries(state.garments.map(g => [g.id, g])),
            bySlug: Object.fromEntries(state.garments.map(g => [g.slug, g])),
            line: Object.fromEntries(state.lines.map(l => [l.id, l])),
            type: Object.fromEntries(state.types.map(t => [t.id, t])),
            fabric: Object.fromEntries(state.fabrics.map(f => [f.id, f])),
        };
    }, [state]);
};

// Quote lines resolved against the catalogue (unknown or inactive garments are dropped).
const useQuoteLines = (catalog) => useQuote()
    .map(l => ({ ...l, garment: catalog.byId[l.garmentId], color: catalog.colors[l.colorId] }))
    .filter(l => l.garment);

// --- GARMENT ILLUSTRATION ---
// Flat SVG drawn in the chosen colour, so the catalogue works without photos. When photos exist, add
// `images: { <colorId>: "/img/prendas/<id>-<color>.webp" }` to the garment and render <img> here.
const GARMENT_SHAPES = {
    sacos: (c, s) => <g>
        <path d="M70 30 L100 62 L130 30 L162 44 L182 120 L174 200 L156 200 L152 124 L150 214 L50 214 L48 124 L44 200 L26 200 L18 120 L38 44 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M80 32 L100 112 L120 32 Z" fill="#fbfbf8" stroke={s} />
        <path d="M70 30 L94 128 M130 30 L106 128" stroke={s} strokeWidth="2" fill="none" />
        <circle cx="100" cy="146" r="3.5" fill={s} /><circle cx="100" cy="170" r="3.5" fill={s} />
        <path d="M60 160 h22 M118 160 h22" stroke={s} strokeWidth="2" />
    </g>,
    pantalones: (c, s) => <g>
        <path d="M62 24 H138 L152 222 H110 L100 92 L90 222 H48 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M62 38 H138" stroke={s} strokeWidth="2" /><path d="M100 38 V92 M78 40 L74 222 M122 40 L126 222" stroke={s} strokeWidth="1" opacity=".5" />
    </g>,
    faldas: (c, s) => <g>
        <rect x="64" y="34" width="72" height="14" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M64 48 H136 L150 206 H50 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M100 176 V206" stroke={s} strokeWidth="2" /><path d="M82 50 L80 120 M118 50 L120 120" stroke={s} opacity=".45" />
    </g>,
    vestidos: (c, s) => <g>
        <path d="M76 24 Q100 44 124 24 L142 36 L156 92 L140 96 L132 70 L134 122 L158 222 H42 L66 122 L68 70 L60 96 L44 92 L58 36 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M82 60 Q86 110 80 222 M118 60 Q114 110 120 222" stroke={s} opacity=".35" fill="none" /><path d="M68 122 H132" stroke={s} opacity=".5" />
    </g>,
    blusas: (c, s) => <g>
        <path d="M74 30 L100 70 L126 30 L160 46 L180 146 L160 152 L146 90 L150 204 H50 L54 90 L40 152 L20 146 L40 46 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M74 30 L100 70 L126 30" stroke={s} strokeWidth="2" fill="none" /><path d="M20 146 L40 152 M180 146 L160 152" stroke={s} strokeWidth="5" />
    </g>,
    camisas: (c, s) => <g>
        <path d="M76 30 L100 48 L124 30 L160 44 L180 160 L162 164 L148 92 L150 212 H50 L52 92 L38 164 L20 160 L40 44 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M76 30 L100 48 L90 62 Z M124 30 L100 48 L110 62 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M100 48 V212" stroke={s} />
        {[76, 104, 132, 160, 188].map(y => <circle key={y} cx="104" cy={y} r="2.2" fill={s} />)}
        <rect x="118" y="86" width="20" height="18" fill="none" stroke={s} opacity=".6" />
    </g>,
    chalecos: (c, s) => <g>
        <path d="M72 28 L100 92 L128 28 L150 40 L146 102 L154 202 L100 216 L46 202 L54 102 L50 40 Z" fill={c} stroke={s} strokeWidth="1.5" />
        <path d="M80 30 L100 92 L120 30 Z" fill="#fbfbf8" stroke={s} />
        <path d="M100 92 V214" stroke={s} />
        {[110, 130, 150, 170, 190].map(y => <circle key={y} cx="104" cy={y} r="2.6" fill={s} />)}
        <path d="M62 140 h22 M116 140 h22" stroke={s} strokeWidth="2" />
    </g>,
};

const Garment = ({ garment, color, className = '' }) => {
    const hex = color ? color.hex : '#1c2a4a';
    const shape = GARMENT_SHAPES[garment.type_id] || GARMENT_SHAPES.sacos;
    return (
        <svg viewBox="0 0 200 240" className={className} role="img" aria-label={`${garment.name}${color ? `, ${color.name}` : ''}`}>
            <ellipse cx="100" cy="228" rx="64" ry="5" fill="#14213d" opacity=".06" />
            {shape(hex, 'rgba(13,22,41,.35)')}
        </svg>
    );
};

const Swatch = ({ color, active, onClick, size = 'w-6 h-6' }) => (
    <button type="button" onClick={onClick} title={color.name} aria-label={color.name} aria-pressed={active}
        className={`${size} rounded-full border transition-shadow ${active ? 'ring-2 ring-offset-2 ring-navy border-navy' : 'border-navy-line hover:ring-2 hover:ring-lemon-300'}`}
        style={{ background: color.hex }} />
);

const priceLabel = (g) => (g.price_from_mxn ? `Desde ${formatMXN(g.price_from_mxn)} por pieza` : 'Precio por cotización');

// --- CARD ---
const GarmentCard = ({ garment, catalog }) => {
    const [colorId, setColorId] = useState(garment.color_ids[0]);
    const color = catalog.colors[colorId];
    const href = `/pages/colecciones/${garment.slug}/?color=${colorId}`;
    return (
        <article className="reveal group flex flex-col">
            <a href={href} className="block rounded-xl bg-cream aspect-[5/6] relative overflow-hidden border border-transparent group-hover:border-navy-line transition-colors">
                <Garment garment={garment} color={color} className="absolute inset-0 w-full h-full p-8 transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute top-4 left-4 kicker bg-white/90 px-2.5 py-1 rounded">{catalog.line[garment.line_id]?.label}</span>
            </a>
            <div className="pt-4 flex-1 flex flex-col">
                <p className="kicker text-navy-400">{catalog.type[garment.type_id]?.label} · {garment.sku}</p>
                <h3 className="text-2xl mt-1"><a href={href} className="hover:underline decoration-lemon-400 decoration-4 underline-offset-4">{garment.name}</a></h3>
                <p className="text-sm text-navy-500 mt-1 flex-1">{garment.short}</p>
                <div className="flex gap-2 mt-4" role="group" aria-label="Colores">
                    {garment.color_ids.map(id => catalog.colors[id] && <Swatch key={id} color={catalog.colors[id]} active={id === colorId} onClick={() => setColorId(id)} size="w-5 h-5" />)}
                </div>
                <p className="text-sm font-medium mt-3">{priceLabel(garment)}</p>
            </div>
        </article>
    );
};

const GridSkeleton = ({ n = 4 }) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {Array.from({ length: n }, (_, i) => <div key={i} className="animate-pulse"><div className="rounded-xl bg-cream aspect-[5/6]" /><div className="h-4 bg-cream rounded mt-4 w-1/2" /><div className="h-6 bg-cream rounded mt-2" /></div>)}
    </div>
);

const LoadError = () => <p className="text-center text-navy-400 py-16">No pudimos cargar el catálogo. Recarga la página en un momento.</p>;

// --- GARMENT PAGE ---
// Each /pages/colecciones/<slug>/index.html calls renderGarment(); the slug comes from the URL, the colour from ?color=.
const GarmentPage = () => {
    const catalog = useCatalog();
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    const garment = catalog.bySlug[slug];
    const [colorId, setColorId] = useState(new URLSearchParams(window.location.search).get('color'));
    const [qty, setQty] = useState(null);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        if (!garment) return;
        if (!garment.color_ids.includes(colorId)) setColorId(garment.color_ids[0]);
        if (qty === null) setQty(garment.min_qty);
    }, [garment]);

    if (catalog.status === 'loading') return <div className="max-w-6xl mx-auto px-4 py-20"><GridSkeleton n={2} /></div>;
    if (catalog.status === 'error') return <LoadError />;
    if (!garment) return (
        <PageHero kicker="Colecciones" title="Prenda" mark="no encontrada" intro="Puede que ya no esté en catálogo.">
            <a href="/pages/colecciones/" className="btn btn-navy mt-8">Ver colecciones</a>
        </PageHero>
    );

    const color = catalog.colors[colorId] || catalog.colors[garment.color_ids[0]];
    const fabrics = garment.fabric_ids.map(id => catalog.fabric[id]).filter(Boolean);
    const related = catalog.garments.filter(g => g.id !== garment.id && g.line_id === garment.line_id).slice(0, 4);
    const pickColor = (id) => {
        setColorId(id);
        const url = new URL(window.location); url.searchParams.set('color', id); history.replaceState(null, '', url);
    };
    const add = () => { quote.add(garment.id, color.id, qty); setAdded(true); setTimeout(() => setAdded(false), 2000); };

    return (
        <>
            <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
                <div className="md:sticky md:top-28 rounded-2xl bg-cream aspect-square relative animate-fade-in">
                    <Garment garment={garment} color={color} className="absolute inset-0 w-full h-full p-10 md:p-16" />
                    <p className="absolute bottom-5 left-5 text-sm bg-white/90 rounded px-3 py-1.5">{color.name}</p>
                    <p className="absolute bottom-5 right-5 text-xs text-navy-400">Ilustración de referencia</p>
                </div>
                <div className="animate-rise-in">
                    <nav className="text-sm text-navy-400 mb-6" aria-label="Ruta">
                        <a href="/pages/colecciones/" className="hover:text-navy">Colecciones</a> / <a href={`/pages/colecciones/?linea=${garment.line_id}`} className="hover:text-navy">{catalog.line[garment.line_id].label}</a> / {catalog.type[garment.type_id].label}
                    </nav>
                    <p className="kicker text-navy-400">{garment.sku}</p>
                    <h1 className="text-5xl md:text-6xl mt-2">{garment.name}</h1>
                    <p className="text-lg text-navy-500 mt-5 leading-relaxed">{garment.description}</p>

                    <div className="mt-8">
                        <p className="kicker text-navy-500 mb-3">Color · <span className="normal-case tracking-normal font-normal">{color.name}</span></p>
                        <div className="flex flex-wrap gap-3">{garment.color_ids.map(id => catalog.colors[id] && <Swatch key={id} color={catalog.colors[id]} active={id === color.id} onClick={() => pickColor(id)} size="w-9 h-9" />)}</div>
                    </div>

                    <dl className="grid grid-cols-3 gap-4 my-8 py-5 border-y border-navy-line">
                        <div><dt className="kicker text-navy-400">Pedido mínimo</dt><dd className="font-display text-2xl mt-1">{garment.min_qty} pzs</dd></div>
                        <div><dt className="kicker text-navy-400">Entrega</dt><dd className="font-display text-2xl mt-1">{garment.lead_days} días</dd></div>
                        <div><dt className="kicker text-navy-400">Tallas</dt><dd className="font-display text-2xl mt-1">{garment.sizes[0]}–{garment.sizes[garment.sizes.length - 1]}</dd></div>
                    </dl>

                    <p className="font-medium">{priceLabel(garment)}</p>
                    <p className="text-xs text-navy-400 mt-1">Precio orientativo antes de IVA; el precio final depende de volumen, tela y bordado.</p>

                    <div className="flex gap-3 mt-6">
                        <label className="flex items-center border border-navy-line rounded-lg pl-4">
                            <span className="text-sm text-navy-500 mr-2">Piezas</span>
                            <input type="number" min="1" step="1" value={qty || ''} onChange={e => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-20 py-3 pr-3 bg-transparent focus:outline-none" />
                        </label>
                        <button className="btn btn-navy flex-1" onClick={add}>{added ? <><IconCheck className="w-4 h-4" /> Agregado a tu cotización</> : 'Agregar a cotización'}</button>
                    </div>
                    {qty < garment.min_qty && <p className="text-sm text-lemon-600 mt-2">El pedido mínimo es de {garment.min_qty} piezas; puedes combinar tallas.</p>}
                    {added && <a href="/pages/cotizacion/" className="block text-sm text-center mt-3 underline">Ver mi cotización →</a>}

                    <h2 className="text-2xl mt-12 mb-4">Detalles</h2>
                    <ul className="space-y-2">{garment.features.map(f => <li key={f} className="flex gap-3 text-navy-500"><IconCheck className="w-5 h-5 text-lemon-600 shrink-0" />{f}</li>)}</ul>

                    <h2 className="text-2xl mt-10 mb-4">Telas disponibles</h2>
                    <div className="space-y-3">
                        {fabrics.map(f => (
                            <div key={f.id} className="rounded-xl border border-navy-line p-4">
                                <p className="font-medium">{f.name} <span className="text-sm text-navy-400 font-normal">· {f.weight}</span></p>
                                <p className="text-sm text-navy-500">{f.composition}. {f.feel}</p>
                                <p className="text-xs text-navy-400 mt-1">{f.care} Garantía: 1 año o {f.washes} lavadas en casa.</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-navy-500 mt-8">Tallas: {garment.sizes.join(' · ')}. <a href="/pages/empresa/#tallas" className="underline">Guía de tallas y medición en sitio</a></p>
                </div>
            </section>

            {related.length > 0 && (
                <section className="max-w-7xl mx-auto px-4 md:px-8 py-14">
                    <SectionTitle kicker={`Línea ${catalog.line[garment.line_id].label}`} mark="el conjunto">Completa</SectionTitle>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">{related.map(g => <GarmentCard key={g.id} garment={g} catalog={catalog} />)}</div>
                </section>
            )}
        </>
    );
};

const renderGarment = () => renderPage(GarmentPage);
