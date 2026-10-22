#!/usr/bin/env python3
"""Genera las láminas del portafolio (figurines técnicos en SVG) en img/laminas/.

Uso:  python3 tools/laminas.py      (desde la raíz del sitio)

Cada lámina = prenda superior + prenda inferior, rellenas con un patrón de tela.
Para añadir un look: agregar una entrada a LOOKS y volver a ejecutar.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "img" / "laminas"
INK = "#14213d"
PAPER = "#faf7ee"
STROKE = f'fill="none" stroke="{INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
THIN = f'fill="none" stroke="{INK}" stroke-width="1" stroke-dasharray="3 3" stroke-linecap="round"'

# ── Telas (patrones SVG) ───────────────────────────────────────────────
FABRICS = {
    # nombre: (fondo, definición del patrón sobre 0..s)
    "diplomatica": ("#1d2b4f", 10, '<path d="M5 0V10" stroke="#e9e4d4" stroke-opacity=".55" stroke-width=".7"/>'),
    "espiga": ("#3a3d44", 12, '<path d="M0 12L6 0M6 12L12 0" stroke="#8b8f98" stroke-opacity=".55" stroke-width="1"/><path d="M6 0V12" stroke="#2a2c31" stroke-width="1"/>'),
    "tweed": ("#8a6a46", 16, '<path d="M0 4H16M0 12H16" stroke="#5b4129" stroke-opacity=".55" stroke-width="1.4"/><path d="M4 0V16M12 0V16" stroke="#c9a46e" stroke-opacity=".5" stroke-width="1"/>'),
    "noche": ("#16171b", 8, '<circle cx="4" cy="4" r=".5" fill="#3a3b42"/>'),
    "gales": ("#9a9c9f", 24, '<path d="M0 6H24M0 8H24M0 18H24" stroke="#6e7073" stroke-width="1"/><path d="M6 0V24M8 0V24M18 0V24" stroke="#6e7073" stroke-width="1"/><path d="M0 12H24M12 0V24" stroke="#f4d35e" stroke-opacity=".6" stroke-width=".6"/>'),
    "marino": ("#22325a", 6, '<path d="M0 6L6 0" stroke="#2c3e6c" stroke-width="1"/>'),
    "vino": ("#5e1f2b", 6, '<path d="M0 6L6 0" stroke="#6f2a37" stroke-width="1"/>'),
    "lino": ("#e8dcc0", 8, '<path d="M0 2H8M0 6H8" stroke="#d6c7a3" stroke-width=".7"/><path d="M3 0V8" stroke="#d6c7a3" stroke-width=".5"/>'),
    "limon": ("#f4d35e", 8, '<path d="M0 8L8 0" stroke="#e2bf3e" stroke-width="1"/>'),
}


def pattern(pid, name):
    bg, s, body = FABRICS[name]
    return (f'<pattern id="{pid}" width="{s}" height="{s}" patternUnits="userSpaceOnUse">'
            f'<rect width="{s}" height="{s}" fill="{bg}"/>{body}</pattern>')


# ── Prendas superiores (caja 300×360, centro x=150) ────────────────────
def saco(fill, *, dama=False, cruzado=False, solapa="muesca", botones=2, chaleco=False, contraste=None):
    """Saco de vista frontal. dama: talle entallado y bastilla más corta."""
    hem = 300 if dama else 322
    waist_in = 14 if dama else 2
    side_l = f"L{84 + waist_in},{205} Q{82 + waist_in * .4:.0f},{hem - 40} 80,{hem - 4}" if dama else f"L80,{hem - 4}"
    side_r = f"Q{218 - waist_in * .4:.0f},{hem - 40} {216 - waist_in},{205} L218,132" if dama else "L218,132"
    body = (f"M120,38 L62,58 L36,252 L62,258 L84,132 {side_l} Q115,{hem + 2} 146,{hem + 14} L150,{hem + 10} "
            f"L154,{hem + 14} Q185,{hem + 2} 220,{hem - 4} {side_r} L238,258 L264,252 L238,58 L180,38 Z")
    parts = [f'<path d="{body}" fill="{fill}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>']
    # sisas y bocamangas
    parts.append(f'<path d="M62,58 Q76,96 84,132 M238,58 Q224,96 216,132 M40,226 L64,232 M260,226 L236,232" {STROKE}/>')
    v = 200 if cruzado else (170 if dama else 188)
    edge = 166 if cruzado else 150
    lap = contraste or "none"
    if solapa == "pico":
        l = f"M120,38 L114,64 L92,60 L104,84 L{edge},{v} L150,{v - 30} L134,40"
    else:
        l = f"M120,38 L112,62 L100,70 L106,84 L{edge},{v} L150,{v - 30} L134,40"
    # espejo de la solapa derecha
    def mirror(path):
        out = []
        for tok in path.split():
            cmd, xy = tok[0], tok[1:]
            x, y = xy.split(",")
            out.append(f"{cmd}{300 - float(x):g},{y}")
        return " ".join(out)
    r = mirror(l)
    parts.append(f'<path d="{l} Z" fill="{lap}" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>')
    parts.append(f'<path d="{r} Z" fill="{lap}" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>')
    # cuello del chaleco o camisa
    if chaleco:
        parts.append(f'<path d="M134,40 L150,{v - 26} L166,40" fill="#f3efe3" stroke="{INK}" stroke-width="1.2"/>')
    else:
        parts.append(f'<path d="M134,40 L150,{v - 30} L166,40 Z" fill="#f3efe3" stroke="{INK}" stroke-width="1.2"/>'
                     f'<path d="M147,{v - 60} L150,{v - 30} L153,{v - 60} L150,{v - 80} Z" fill="{INK}"/>' if not dama else
                     f'<path d="M134,40 L150,{v - 30} L166,40 Z" fill="#f3efe3" stroke="{INK}" stroke-width="1.2"/>')
    # canto delantero
    parts.append(f'<path d="M{edge},{v} L{edge - 4 if not cruzado else edge},{hem + 12}" {STROKE}/>')
    # botones
    if cruzado:
        for y in (214, 246, 278):
            for x in (130, 170):
                parts.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/>')
    else:
        start = v + 22
        for i in range(botones):
            parts.append(f'<circle cx="150" cy="{start + i * 32}" r="4" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/>')
    # bolsas
    py = hem - 58
    if dama:
        parts.append(f'<path d="M98,{py} L132,{py + 2} M168,{py + 2} L202,{py}" {STROKE}/>')
    else:
        parts.append(f'<path d="M92,{py} L130,{py} L130,{py + 12} L92,{py + 12} Z M170,{py} L208,{py} L208,{py + 12} L170,{py + 12} Z" {STROKE}/>')
        parts.append(f'<path d="M176,142 L206,138" {STROKE}/>')
    # pespuntes de sastre
    parts.append(f'<path d="M88,140 L86,{hem - 12} M212,140 L214,{hem - 12}" {THIN}/>')
    return "".join(parts)


def chaleco(fill):
    d = ("M118,40 L96,56 L92,120 L88,250 Q118,262 146,286 L150,280 L154,286 Q182,262 212,250 L208,120 L204,56 L182,40 "
         "L150,170 Z")
    parts = [f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>',
             f'<path d="M150,170 L150,280" {STROKE}/>', f'<path d="M96,56 Q110,96 92,120 M204,56 Q190,96 208,120" {STROKE}/>']
    for i in range(5):
        parts.append(f'<circle cx="150" cy="{184 + i * 20}" r="3.5" fill="{PAPER}" stroke="{INK}" stroke-width="1.1"/>')
    parts.append(f'<path d="M106,214 L132,214 M168,214 L194,214" {STROKE}/>')
    return "".join(parts)


def vestido(fill):
    d = ("M118,30 Q150,58 182,30 L210,48 L208,88 Q200,150 214,190 Q222,260 210,330 L90,330 Q78,260 86,190 "
         "Q100,150 92,88 L90,48 Z")
    return (f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="M92,88 Q150,96 208,88 M110,96 Q114,150 112,186 M190,96 Q186,150 188,186 M150,300 L150,330" {STROKE}/>'
            f'<path d="M92,182 Q150,190 214,182" {THIN}/>')


# ── Prendas inferiores (caja 200×360) ──────────────────────────────────
def pantalon(fill, *, dama=False):
    w = 6 if dama else 0
    d = f"M50,20 L150,20 L{158 + w},340 L{112 + w // 2},340 L100,110 L{88 - w // 2},340 L{42 - w},340 Z"
    return (f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="M50,36 L150,36 M100,36 L100,96 M64,40 Q70,64 58,74 M136,40 Q130,64 142,74" {STROKE}/>'
            f'<path d="M70,80 L66,336 M130,80 L134,336" {THIN}/>')


def falda(fill):
    d = "M50,20 L150,20 Q162,120 152,280 L48,280 Q38,120 50,20 Z"
    return (f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="M50,34 L150,34 M100,240 L100,280 M74,36 L76,96 M126,36 L124,96" {STROKE}/>')


# ── Looks ──────────────────────────────────────────────────────────────
LOOKS = [
    ("01-ejecutivo", "diplomatica", lambda f: saco(f, botones=2), lambda f: pantalon(f)),
    ("02-consejo", "espiga", lambda f: saco(f, cruzado=True, solapa="pico"), lambda f: pantalon(f)),
    ("03-tres-piezas", "tweed", lambda f: saco(f, botones=3, chaleco=True), lambda f: chaleco(f)),
    ("04-gala", "noche", lambda f: saco(f, botones=1, solapa="pico", contraste="#2b2c33"), lambda f: pantalon(f)),
    ("05-directora", "marino", lambda f: saco(f, dama=True, botones=1), lambda f: pantalon(f, dama=True)),
    ("06-junta", "gales", lambda f: saco(f, dama=True, botones=2), lambda f: falda(f)),
    ("07-funda", "vino", lambda f: vestido(f), None),
    ("08-sucursal", "lino", lambda f: saco(f, dama=True, botones=2, solapa="pico"), lambda f: falda(f)),
]


def build(slug, fabric, top, bottom):
    pid = f"t-{slug}"
    fill = f"url(#{pid})"
    swatch = f'<g transform="translate(470,452)"><rect width="88" height="48" fill="{fill}" stroke="{INK}" stroke-width="1"/></g>'
    if bottom:
        figure = (f'<g transform="translate(40,70)">{top(fill)}</g>'
                  f'<g transform="translate(380,90) scale(.9)">{bottom(fill)}</g>')
    else:
        figure = f'<g transform="translate(150,70)">{top(fill)}</g>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 540" role="img">'
            f'<defs>{pattern(pid, fabric)}</defs>'
            f'<rect width="600" height="540" fill="{PAPER}"/>'
            f'<rect x="16" y="16" width="568" height="508" fill="none" stroke="{INK}" stroke-opacity=".25"/>'
            f'{figure}{swatch}</svg>\n')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, fabric, top, bottom in LOOKS:
        (OUT / f"{slug}.svg").write_text(build(slug, fabric, top, bottom), encoding="utf-8")
        print("✓", slug)


if __name__ == "__main__":
    main()
