"""
Validate that all keys in es.json exist in all other language files.
Reports missing keys per language.

Usage: python scripts/validate_translations.py
"""

import json
from pathlib import Path


def get_all_keys(obj: dict, prefix: str = "") -> set[str]:
    keys = set()
    for k, v in obj.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys |= get_all_keys(v, full_key)
        else:
            keys.add(full_key)
    return keys


def main():
    i18n_dir = Path(__file__).parent.parent / "src" / "i18n"

    reference_path = i18n_dir / "es.json"
    if not reference_path.exists():
        print("ERROR: es.json not found")
        return

    with open(reference_path) as f:
        reference = json.load(f)

    ref_keys = get_all_keys(reference)
    # Remove meta keys
    ref_keys = {k for k in ref_keys if not k.startswith("_meta")}

    print(f"Reference (es.json): {len(ref_keys)} keys\n")

    all_ok = True
    for lang_file in sorted(i18n_dir.glob("*.json")):
        if lang_file.stem == "es":
            continue

        with open(lang_file) as f:
            lang_data = json.load(f)

        lang_keys = get_all_keys(lang_data)
        lang_keys = {k for k in lang_keys if not k.startswith("_meta")}

        missing = ref_keys - lang_keys
        extra = lang_keys - ref_keys

        if missing or extra:
            all_ok = False
            print(f"❌ {lang_file.name}:")
            if missing:
                for k in sorted(missing):
                    print(f"   MISSING: {k}")
            if extra:
                for k in sorted(extra)[:5]:  # show max 5 extra keys
                    print(f"   EXTRA: {k}")
        else:
            print(f"✅ {lang_file.name}: all {len(lang_keys)} keys present")

    print()
    if all_ok:
        print("✅ All translation files are complete!")
    else:
        print("⚠  Some translation files have missing keys (see above)")
        exit(1)


if __name__ == "__main__":
    main()
