#!/usr/bin/env python3
"""Genera portafolio/, privacidad/ y 404.html reutilizando la cabecera y el pie de index.html.

Uso:  python3 tools/paginas.py      (desde la raíz del sitio; editar index.html primero si cambia la cabecera o el pie)

Las rutas son relativas para que el sitio funcione en limonada.com.mx/ y en eliav-mejia.github.io/limonada.com.mx/.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")

TOP = INDEX[INDEX.index('  <a class="skip-link"'):INDEX.index('  <main id="main">')]
FOOT = INDEX[INDEX.index('  <footer class="site-footer">'):INDEX.index('</body>')]
HEAD_LINKS = INDEX[INDEX.index('  <link rel="preconnect"'):INDEX.index('  <script type="application/ld+json">')]


def relink(html, prefix):
    """Prefija rutas relativas del inicio: href="x" → href="../x", href="#x" → href="../#x"."""
    def fix(m):
        attr, url = m.group(1), m.group(2)
        if url == "#main" or re.match(r"^(https?:|mailto:|tel:|data:|//)", url):
            return m.group(0)
        if url == "./" and prefix:
            url = ""
        return f'{attr}="{prefix}{url}"'
    return re.sub(r'(href|src)="([^"]*)"', fix, html)


def page(path, title, description, body, prefix, current=None, robots=None, base=None):
    top = relink(TOP, prefix)
    if current:
        top = top.replace(f'href="{prefix}{current}"', f'href="{prefix}{current}" aria-current="page"')
    canonical = f'  <link rel="canonical" href="https://limonada.com.mx/{path}">\n' if path is not None else ""
    meta_robots = f'  <meta name="robots" content="{robots}">\n' if robots else ""
    html = f"""<!DOCTYPE html>
<html lang="es-MX" class="no-js">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
{base or ""}  <title>{title}</title>
  <meta name="description" content="{description}">
{canonical}{meta_robots}  <meta name="theme-color" content="#14213d">
  <link rel="icon" href="{prefix}img/favicon.svg" type="image/svg+xml">
{relink(HEAD_LINKS, prefix)}</head>
<body>
{top}  <main id="main">
{body}  </main>

{relink(FOOT, prefix)}</body>
</html>
"""
    return html


# ── Portafolio ─────────────────────────────────────────────────────────
LOOKS = [
    ("ejecutivo", "I", "El Ejecutivo", "caballero", "01-ejecutivo", "saco de dos botones y pantalón en raya diplomática azul marino",
     "El traje que abre la temporada: dos botones, solapa de muesca y raya diplomática fina. Línea limpia para la oficina de todos los días.",
     [("Piezas", "Saco y pantalón"), ("Tela", "Raya diplomática, azul marino"), ("Corte", "Dos botones, solapa de muesca"), ("Ocasión", "Oficina · uniforme directivo")]),
    ("consejo", "II", "El Consejo", "caballero", "02-consejo", "saco cruzado de solapa en pico y pantalón en espiga gris carbón",
     "Cruzado seis por dos con solapa en pico. Autoridad sin estridencia para la sala de consejo y las presentaciones.",
     [("Piezas", "Saco cruzado y pantalón"), ("Tela", "Espiga, gris carbón"), ("Corte", "Cruzado 6×2, solapa en pico"), ("Ocasión", "Consejo · presentaciones")]),
    ("tres-piezas", "III", "Tres Piezas", "caballero", "03-tres-piezas", "saco de tres botones y chaleco de cinco botones en tweed",
     "Tweed de tono tabaco con chaleco de cinco botones. Un guiño retro para los meses fríos y los equipos con carácter.",
     [("Piezas", "Saco, chaleco y pantalón"), ("Tela", "Tweed, tabaco"), ("Corte", "Tres botones, chaleco de cinco"), ("Ocasión", "Otoño · invierno")]),
    ("gala", "IV", "La Gala", "caballero", "04-gala", "saco de un botón con solapa en pico de contraste y pantalón negro",
     "Un botón y solapa en pico de contraste. El traje de noche para la cena anual, la premiación o el evento de la marca.",
     [("Piezas", "Saco y pantalón"), ("Tela", "Negro noche, solapa de contraste"), ("Corte", "Un botón, solapa en pico"), ("Ocasión", "Eventos · gala")]),
    ("directora", "V", "La Directora", "dama", "05-directora", "saco entallado de un botón y pantalón recto azul marino",
     "Saco entallado de un botón con pantalón recto. Hombro definido, cintura marcada y libertad de movimiento.",
     [("Piezas", "Saco y pantalón recto"), ("Tela", "Azul marino"), ("Corte", "Entallado, un botón"), ("Ocasión", "Dirección · oficina")]),
    ("junta", "VI", "La Junta", "dama", "06-junta", "saco entallado de dos botones y falda lápiz en Príncipe de Gales",
     "Príncipe de Gales con un hilo limón. Saco de dos botones y falda lápiz con abertura trasera.",
     [("Piezas", "Saco y falda lápiz"), ("Tela", "Príncipe de Gales, gris"), ("Corte", "Entallado, dos botones"), ("Ocasión", "Juntas · atención a clientes")]),
    ("funda", "VII", "La Funda", "dama", "07-funda", "vestido funda color vino con pinzas y abertura trasera",
     "Vestido funda con pinzas de talle y abertura trasera. Una sola pieza, impecable de la mañana a la recepción.",
     [("Piezas", "Vestido"), ("Tela", "Vino"), ("Corte", "Funda, pinzas de talle"), ("Ocasión", "Recepción · eventos")]),
    ("sucursal", "VIII", "La Sucursal", "dama", "08-sucursal", "saco entallado de solapa en pico y falda lápiz en lino natural",
     "El uniforme ejecutivo de piso de venta: lino natural, solapa en pico y falda lápiz. Fresco, lavable y con etiqueta personalizada.",
     [("Piezas", "Saco y falda"), ("Tela", "Lino natural"), ("Corte", "Entallado, solapa en pico"), ("Ocasión", "Sucursal · atención al público")]),
]


def portafolio():
    looks = []
    for slug, num, name, linea, img, alt, text, spec in LOOKS:
        dl = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in spec)
        looks.append(f"""        <article class="look reveal" id="{slug}" data-linea="{linea}">
          <figure class="plate">
            <span class="plate__num">Lámina {num}</span>
            <div class="plate__frame"><img src="../img/laminas/{img}.svg" alt="Figurín: {alt}" width="600" height="540" loading="lazy"></div>
          </figure>
          <div>
            <p class="eyebrow">{linea.capitalize()} · Lámina {num}</p>
            <h2 class="h2">{name}</h2>
            <p class="lede">{text}</p>
            <dl class="spec">{dl}</dl>
            <div class="actions" style="margin-top:32px"><a class="btn" href="../#contacto">Cotizar esta lámina <span class="arrow" aria-hidden="true">→</span></a></div>
          </div>
        </article>
""")
    body = f"""    <section class="hero">
      <div class="container">
        <div class="folio"><span>Gaceta Nº 29</span><span>Portafolio</span><span>Láminas I – VIII</span></div>
        <div class="section-head" style="margin-top:56px;margin-bottom:40px">
          <div>
            <p class="eyebrow">Portafolio editorial</p>
            <h1 class="display" style="margin-top:20px">Caballero <em>&amp;</em> Dama.</h1>
          </div>
          <p class="lede">Ocho figurines de la temporada. Todos se cortan a la medida, en la tela y el color de tu empresa, con etiquetas personalizadas por colaborador.</p>
        </div>
        <div class="chips" role="group" aria-label="Filtrar láminas">
          <button class="chip" type="button" data-filter="todos" aria-pressed="true">Todas</button>
          <button class="chip" type="button" data-filter="caballero" aria-pressed="false">Caballero</button>
          <button class="chip" type="button" data-filter="dama" aria-pressed="false">Dama</button>
        </div>
{''.join(looks)}      </div>
    </section>
"""
    return page("portafolio/", "Portafolio · Limonada · Trajes a la medida para caballero y dama",
                "Portafolio editorial de Limonada: ocho láminas de trajes a la medida y uniformes ejecutivos para caballero y dama.",
                body, "../", current="portafolio/")


def privacidad():
    body = """    <section class="section">
      <div class="container prose">
        <p class="eyebrow">Legal</p>
        <h1 class="h2" style="margin-top:18px">Aviso de privacidad</h1>
        <p class="lede" style="margin-top:24px">Limonada, con domicilio en Fray Servando Teresa de Mier #277, Piso 8, Interior 801, Col. Tránsito, 06820, Ciudad de México, es responsable del tratamiento de los datos personales que nos proporcionas.</p>
        <h2>Datos que recabamos</h2>
        <p>Nombre, empresa, teléfono, correo electrónico y, cuando contratas una prenda, medidas corporales y talla. Este sitio no recaba datos por sí mismo: el formulario de contacto abre tu programa de correo y tú decides si envías el mensaje.</p>
        <h2>Finalidades</h2>
        <ul>
          <li>Atender tu solicitud, agendar mediciones y elaborar cotizaciones.</li>
          <li>Confeccionar, ajustar y etiquetar las prendas contratadas.</li>
          <li>Dar seguimiento a garantías y arreglos.</li>
        </ul>
        <h2>Derechos ARCO</h2>
        <p>Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, o revocar tu consentimiento, escribiendo a <a href="mailto:ventas@limonada.com.mx">ventas@limonada.com.mx</a> con tu nombre y la solicitud.</p>
        <h2>Cambios</h2>
        <p>Cualquier cambio a este aviso se publicará en esta página.</p>
        <p class="mono" style="margin-top:48px">Última actualización: octubre de 2026</p>
      </div>
    </section>
"""
    return page("privacidad/", "Aviso de privacidad · Limonada", "Aviso de privacidad de Limonada, sastrería ejecutiva en la Ciudad de México.",
                body, "../")


def no_encontrada():
    # 404.html se sirve en cualquier ruta: <base> fija la raíz del sitio (dominio propio o /limonada.com.mx/ en github.io).
    base = ('  <script>(function(){var p=location.pathname,r=p.indexOf("/limonada.com.mx/")===0?"/limonada.com.mx/":"/";'
            'document.write(\'<base href="\'+r+\'">\');})();</script>\n')
    body = """    <section class="section">
      <div class="container" style="text-align:center">
        <p class="eyebrow">Error 404</p>
        <h1 class="display" style="margin-top:20px">Esta prenda <em>no</em> está en el perchero.</h1>
        <p class="lede" style="margin:28px auto 0">La página que buscas cambió de lugar. Revisa el portafolio o vuelve al inicio.</p>
        <div class="actions" style="justify-content:center;margin-top:36px">
          <a class="btn btn--lemon" href="portafolio/">Ver el portafolio <span class="arrow" aria-hidden="true">→</span></a>
          <a class="btn" href="./">Ir al inicio</a>
        </div>
      </div>
    </section>
"""
    return page(None, "Página no encontrada · Limonada", "La página que buscas no existe.", body, "", robots="noindex", base=base)


def main():
    out = {"portafolio/index.html": portafolio(), "privacidad/index.html": privacidad(), "404.html": no_encontrada()}
    for rel, html in out.items():
        p = ROOT / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(html, encoding="utf-8")
        print("✓", rel)


if __name__ == "__main__":
    main()
