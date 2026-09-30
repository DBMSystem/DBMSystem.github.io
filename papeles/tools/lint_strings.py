#!/usr/bin/env python3
"""Checks the app's UI text against CLAUDE.md (rules 2 and 9).

Fails (exit code 1) when:
- a string resource contains a forbidden word ("error", "reclam", "ilegal", "debes", "deberia",
  "fraude", "abusiv"), with or without accents and in any case;
- a frequent word appears without its accent or ñ (e.g. "nomina" instead of "nómina"),
  or with an accent it must not carry (e.g. "fáctura");
- a string resource shows mojibake from a wrong encoding (e.g. "Ã³");
- Kotlin UI code passes a string literal to Text(), text =, label = or contentDescription =.

Usage: python3 tools/lint_strings.py [project_dir]
Only reports file, resource name or line and the rule broken; it never needs document content.
"""

import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

FORBIDDEN = ("error", "reclam", "ilegal", "debes", "deberia", "fraude", "abusiv")

# Unaccented spelling -> correct spelling. Matched as whole words, ignoring case.
MISSING_ACCENT = {
    "nomina": "nómina",
    "nominas": "nóminas",
    "renovacion": "renovación",
    "devolucion": "devolución",
    "suscripcion": "suscripción",
    "poliza": "póliza",
    "polizas": "pólizas",
    "garantia": "garantía",
    "dia": "día",
    "dias": "días",
    "proxima": "próxima",
    "proximo": "próximo",
    "pagina": "página",
    "paginas": "páginas",
    "numero": "número",
    "informacion": "información",
    "revision": "revisión",
    "comparacion": "comparación",
    "notificacion": "notificación",
    "deteccion": "detección",
    "extraccion": "extracción",
    "exportacion": "exportación",
    "contrasena": "contraseña",
    "compania": "compañía",
    "companias": "compañías",
    "telefonia": "telefonía",
    "vehiculo": "vehículo",
    "ano": "año",
    "anos": "años",
    "espana": "España",
    "tambien": "también",
    "aqui": "aquí",
    "todavia": "todavía",
    "camara": "cámara",
    "codigo": "código",
    "facil": "fácil",
    "boton": "botón",
}

# Wrongly accented spelling -> correct spelling.
WRONG_ACCENT = {
    "fáctura": "factura",
    "fácturas": "facturas",
    "factúra": "factura",
}

MOJIBAKE = ("Ã", "Â", "�")

# A string literal with at least one letter passed straight to a UI parameter.
HARDCODED_UI = re.compile(r'(\bText\(\s*|\b(?:text|label|contentDescription|title)\s*=\s*)"[^"$]*[^\W\d_]')

WORD = re.compile(r"[^\W\d_]+")


def fold(text):
    """Lowercase and strip accents, so "DEBERÍAS" and "deberias" compare equal."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn")


def check_text(text):
    """Returns the list of rule violations found in one UI string."""
    problems = []
    folded = fold(text)
    for word in FORBIDDEN:
        if word in folded:
            problems.append(f'palabra prohibida "{word}"')
    for token in WORD.findall(text):
        lower = token.lower()
        if lower in MISSING_ACCENT:
            problems.append(f'"{token}" sin tilde o ñ: se escribe "{MISSING_ACCENT[lower]}"')
        if lower in WRONG_ACCENT:
            problems.append(f'"{token}" con tilde de más: se escribe "{WRONG_ACCENT[lower]}"')
    for sign in MOJIBAKE:
        if sign in text:
            problems.append("codificación rota (el archivo no se leyó como UTF-8)")
            break
    return problems


def resource_strings(path):
    """Yields (name, text) for every <string>, <plurals> item and <string-array> item."""
    root = ET.parse(path).getroot()
    for element in root:
        name = element.get("name", "?")
        if element.tag == "string":
            yield name, "".join(element.itertext())
        elif element.tag in ("plurals", "string-array"):
            for index, item in enumerate(element.findall("item")):
                yield f"{name}[{item.get('quantity', index)}]", "".join(item.itertext())


def is_source(path, root):
    parts = path.relative_to(root).parts
    return "build" not in parts and "build-logic" not in parts and "tools" not in parts


def scan(root):
    root = Path(root)
    problems = []
    for path in sorted(root.glob("**/src/*/res/values*/*.xml")):
        if not is_source(path, root):
            continue
        try:
            entries = list(resource_strings(path))
        except (ET.ParseError, UnicodeDecodeError) as exc:
            problems.append(f"{path.relative_to(root)}: no se puede leer como XML UTF-8 ({exc})")
            continue
        for name, text in entries:
            for problem in check_text(text):
                problems.append(f"{path.relative_to(root)} [{name}]: {problem}")
    for path in sorted(root.glob("**/src/main/**/*.kt")):
        if not is_source(path, root):
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if HARDCODED_UI.search(line):
                problems.append(f"{path.relative_to(root)}:{number}: texto de interfaz en el código; usa strings.xml")
    return problems


def main(argv):
    root = argv[1] if len(argv) > 1 else "."
    problems = scan(root)
    for problem in problems:
        print(problem)
    if problems:
        print(f"lint_strings: {len(problems)} problema(s).")
        return 1
    print("lint_strings: sin problemas.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
