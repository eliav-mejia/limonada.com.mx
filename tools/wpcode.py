#!/usr/bin/env python3
"""Empaqueta el botón de WhatsApp con filtro (v1.2.0) como un solo fragmento para WPCode en el WordPress actual.

Uso:  python3 tools/wpcode.py [URL_DEL_WEBHOOK]
Salida: tools/wordpress/whatsapp-wpcode.html  → WPCode › Agregar fragmento › HTML › Ubicación: «Pie de página en todo el sitio».

Toma el CSS del bloque «WhatsApp con filtro» de css/brand.css y js/whatsapp.js tal cual: el sitio nuevo y WordPress
usan el mismo código. Publicarlo el mismo día que se retira el widget de GetButton.io, nunca antes.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "wordpress" / "whatsapp-wpcode.html"
PRIVACY = "https://eliav-mejia.github.io/limonada.com.mx/privacidad/"  # cambiar por el aviso del WordPress si se actualiza allí

css = (ROOT / "css" / "brand.css").read_text(encoding="utf-8")
start = css.index("/* ── WhatsApp con filtro (v1.2.0)")
end = css.index("/* ── fin WhatsApp ── */")
css = css[start:end].rstrip()
js = (ROOT / "js" / "whatsapp.js").read_text(encoding="utf-8").rstrip()
webhook = sys.argv[1] if len(sys.argv) > 1 else ""

snippet = f"""<!-- Limonada · WhatsApp con filtro v1.2.0 (generado por tools/wpcode.py; no editar a mano) -->
<style id="limonada-wa-css">
{css}
</style>
<script data-no-optimize="1">
window.LIMONADA_WA = {{ site: "wordpress", phone: "5215614800424", webhook: "{webhook}", privacy: "{PRIVACY}" }};
</script>
<script data-no-optimize="1">
{js}
</script>
<!-- /Limonada · WhatsApp con filtro -->
"""
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(snippet, encoding="utf-8")
print("✓", OUT.relative_to(ROOT), "· webhook:", webhook or "(vacío: solo abre WhatsApp)")
