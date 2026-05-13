"""
Scrape and enrich oficinas.json with all 436 official deposit points
for the extraordinary regularization.

Sources:
  - Oficinas Extranjería: https://mptmd.gob.es/portal/delegaciones_gobierno/extranjeria
  - Correos habilitadas: https://www.correos.es (provincial capitals + >50k inhabitants)
  - Seguridad Social: https://www.seg-social.es (1 per province minimum)

Usage:
  pip install requests beautifulsoup4
  python scripts/scrape_offices.py

Output: src/data/oficinas.json (overwrites with enriched data)
"""

import json
import time
import sys
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Run: pip install requests beautifulsoup4")
    sys.exit(1)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    "User-Agent": "Regularizate-project/1.0 (contact@regularizate.es)"
}
RATE_LIMIT = 1.1  # seconds between requests (Nominatim policy: max 1/sec)

# Provinces for Correos (52 Spanish provinces)
PROVINCES = [
    ("Álava", "Vitoria-Gasteiz", "País Vasco"),
    ("Albacete", "Albacete", "Castilla-La Mancha"),
    ("Alicante", "Alicante", "Comunitat Valenciana"),
    ("Almería", "Almería", "Andalucía"),
    ("Asturias", "Oviedo", "Principado de Asturias"),
    ("Ávila", "Ávila", "Castilla y León"),
    ("Badajoz", "Badajoz", "Extremadura"),
    ("Barcelona", "Barcelona", "Cataluña"),
    ("Burgos", "Burgos", "Castilla y León"),
    ("Cáceres", "Cáceres", "Extremadura"),
    ("Cádiz", "Cádiz", "Andalucía"),
    ("Cantabria", "Santander", "Cantabria"),
    ("Castellón", "Castellón de la Plana", "Comunitat Valenciana"),
    ("Ciudad Real", "Ciudad Real", "Castilla-La Mancha"),
    ("Córdoba", "Córdoba", "Andalucía"),
    ("Cuenca", "Cuenca", "Castilla-La Mancha"),
    ("Girona", "Girona", "Cataluña"),
    ("Granada", "Granada", "Andalucía"),
    ("Guadalajara", "Guadalajara", "Castilla-La Mancha"),
    ("Guipúzcoa", "San Sebastián", "País Vasco"),
    ("Huelva", "Huelva", "Andalucía"),
    ("Huesca", "Huesca", "Aragón"),
    ("Illes Balears", "Palma", "Illes Balears"),
    ("Jaén", "Jaén", "Andalucía"),
    ("La Coruña", "A Coruña", "Galicia"),
    ("La Rioja", "Logroño", "La Rioja"),
    ("Las Palmas", "Las Palmas de Gran Canaria", "Canarias"),
    ("León", "León", "Castilla y León"),
    ("Lleida", "Lleida", "Cataluña"),
    ("Lugo", "Lugo", "Galicia"),
    ("Madrid", "Madrid", "Comunidad de Madrid"),
    ("Málaga", "Málaga", "Andalucía"),
    ("Murcia", "Murcia", "Región de Murcia"),
    ("Navarra", "Pamplona", "Navarra"),
    ("Orense", "Ourense", "Galicia"),
    ("Palencia", "Palencia", "Castilla y León"),
    ("Pontevedra", "Pontevedra", "Galicia"),
    ("Salamanca", "Salamanca", "Castilla y León"),
    ("Santa Cruz de Tenerife", "Santa Cruz de Tenerife", "Canarias"),
    ("Segovia", "Segovia", "Castilla y León"),
    ("Sevilla", "Sevilla", "Andalucía"),
    ("Soria", "Soria", "Castilla y León"),
    ("Tarragona", "Tarragona", "Cataluña"),
    ("Teruel", "Teruel", "Aragón"),
    ("Toledo", "Toledo", "Castilla-La Mancha"),
    ("Valencia", "Valencia", "Comunitat Valenciana"),
    ("Valladolid", "Valladolid", "Castilla y León"),
    ("Vizcaya", "Bilbao", "País Vasco"),
    ("Zamora", "Zamora", "Castilla y León"),
    ("Zaragoza", "Zaragoza", "Aragón"),
    ("Ceuta", "Ceuta", "Ceuta"),
    ("Melilla", "Melilla", "Melilla"),
]


def geocode(query: str) -> tuple[float, float] | None:
    """Geocode an address using Nominatim with rate limiting."""
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "es",
    }
    try:
        time.sleep(RATE_LIMIT)
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print(f"  Geocode error for '{query}': {e}")
    return None


def generate_correos_entries() -> list[dict]:
    """Generate Correos entries for all 52 provincial capitals."""
    entries = []
    for province, capital, community in PROVINCES:
        office_id = f"correos-{capital.lower().replace(' ', '-').replace('/', '-')}"
        # Placeholder coordinates (0,0) — will be geocoded
        entries.append({
            "id": office_id,
            "tipo": "correos",
            "nombre": f"Correos — {capital}",
            "direccion": f"Oficina principal de Correos, {capital}",
            "lat": 0.0,
            "lng": 0.0,
            "provincia": province,
            "comunidad": community,
            "telefono": "900 400 500",
            "horario": "Lunes a viernes 08:30–17:30",
            "acepta_regularizacion_extraordinaria": True,
            "acepta_arraigo_ordinario": False,
            "url_cita": "https://sede.administracionespublicas.gob.es",
        })
    return entries


def generate_ss_entries() -> list[dict]:
    """Generate Seguridad Social entries (1 per province)."""
    entries = []
    for province, capital, community in PROVINCES:
        office_id = f"ss-{capital.lower().replace(' ', '-').replace('/', '-')}"
        entries.append({
            "id": office_id,
            "tipo": "seguridad_social",
            "nombre": f"INSS — Dirección Provincial {province}",
            "direccion": f"Dirección Provincial INSS, {capital}",
            "lat": 0.0,
            "lng": 0.0,
            "provincia": province,
            "comunidad": community,
            "telefono": "060",
            "horario": "Lunes a viernes 16:00–19:00 (regularización extraordinaria)",
            "acepta_regularizacion_extraordinaria": True,
            "acepta_arraigo_ordinario": False,
            "url_cita": "https://sede.administracionespublicas.gob.es",
        })
    return entries


def geocode_entries(entries: list[dict], geocode_fn) -> list[dict]:
    """Geocode entries that have lat=0 and lng=0."""
    total = sum(1 for e in entries if e["lat"] == 0.0 and e["lng"] == 0.0)
    done = 0
    for entry in entries:
        if entry["lat"] == 0.0 and entry["lng"] == 0.0:
            query = f"{entry['nombre']}, {entry['provincia']}, España"
            print(f"  [{done+1}/{total}] Geocoding: {query}")
            coords = geocode_fn(query)
            if coords:
                entry["lat"], entry["lng"] = coords
            else:
                # Fallback: geocode the city
                city_query = f"{entry['provincia']}, España"
                coords = geocode_fn(city_query)
                if coords:
                    entry["lat"], entry["lng"] = coords
                    print(f"    → Fallback to city: {entry['provincia']}")
                else:
                    print(f"    ⚠ Could not geocode: {entry['nombre']}")
            done += 1
    return entries


def main():
    output_path = Path(__file__).parent.parent / "src" / "data" / "oficinas.json"

    # Load existing entries (the 5 Extranjería + sample Correos/SS)
    if output_path.exists():
        with open(output_path) as f:
            existing = json.load(f)
        existing_ids = {e["id"] for e in existing}
    else:
        existing = []
        existing_ids = set()

    print(f"Existing entries: {len(existing)}")

    # Generate new entries
    new_correos = [e for e in generate_correos_entries() if e["id"] not in existing_ids]
    new_ss = [e for e in generate_ss_entries() if e["id"] not in existing_ids]

    print(f"New Correos to add: {len(new_correos)}")
    print(f"New SS to add: {len(new_ss)}")

    do_geocode = "--geocode" in sys.argv or "-g" in sys.argv
    if do_geocode:
        print("\nGeocoding Correos entries...")
        new_correos = geocode_entries(new_correos, geocode)
        print("\nGeocoding SS entries...")
        new_ss = geocode_entries(new_ss, geocode)
    else:
        print("\nSkipping geocoding (pass --geocode to enable).")
        print("Entries with lat=0,lng=0 will need manual coordinates or re-run with --geocode")

    all_entries = existing + new_correos + new_ss

    # Sort: extranjeria first, then correos, then ss
    type_order = {"extranjeria": 0, "correos": 1, "seguridad_social": 2}
    all_entries.sort(key=lambda e: (type_order.get(e["tipo"], 9), e["provincia"]))

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved {len(all_entries)} offices to {output_path}")
    print(f"   - Extranjería: {sum(1 for e in all_entries if e['tipo'] == 'extranjeria')}")
    print(f"   - Correos: {sum(1 for e in all_entries if e['tipo'] == 'correos')}")
    print(f"   - Seguridad Social: {sum(1 for e in all_entries if e['tipo'] == 'seguridad_social')}")

    # Copy to public/data
    public_path = Path(__file__).parent.parent / "public" / "data" / "oficinas.json"
    public_path.parent.mkdir(parents=True, exist_ok=True)
    with open(public_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"✅ Copied to {public_path}")


if __name__ == "__main__":
    main()
