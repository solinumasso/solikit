# Règles de matching FINESS ↔ Soliguide

## 1. Filtrage FINESS (avant matching)

On exclut les structures FINESS de type :

- Pharmacies (categetab 620)
- EHPAD (categetab 500)
- Laboratoires de biologie médicale (categetab 611)

## 2. Périmètre de comparaison

On compare chaque structure FINESS avec les structures Soliguide **de la même ville** uniquement (indexation par nom de ville normalisé).

## 3. Normalisation des noms

Avant comparaison, les noms sont :

- Mis en minuscules, sans accents, sans ponctuation
- Les sigles sont expansés :
  - PMI → Protection Maternelle et Infantile
  - CMPP → Centre Médico Psycho Pédagogique
  - CMP → Centre Médico-Psychologique
  - CADA → Centre d'Accueil de Demandeurs d'Asile
  - CHRS → Centre d'Hébergement et de Réinsertion Sociale
  - CCAS → Centre Communal d'Action Sociale
  - CIAS → Centre Intercommunal d'Action Sociale
  - LHSS → Lits Halte Soins Santé
  - MDS → Maison de Santé
  - CH → Centre Hospitalier
  - CHR → Centre Hospitalier Régional
  - CHU → Centre Hospitalier Universitaire
  - SSIAD → Service de Soins Infirmiers à Domicile
  - CSAPA → Centre de Soins d'Accompagnement et de Prévention en Addictologie
  - CAARUD → Centre d'Accueil et d'Accompagnement à la Réduction des Risques pour Usagers de Drogues
  - PASS → Permanence d'Accès aux Soins de Santé
  - CPEF → Centre de Planification et d'Éducation Familiale
- Les synonymes sont unifiés : "centre hospitalier" et "hopital" sont traités comme équivalents

## 4. Critères mesurés

| Critère | Méthode |
|---|---|
| **Nom** | Similarité Levenshtein (0–100%) entre noms normalisés |
| **Adresse** | Similarité Levenshtein (0–100%) entre adresses normalisées |
| **Géolocalisation** | Distance Haversine entre les 2 points GPS. Binaire : ≤200m = 1, >200m = 0 |
| **Code postal** | Identique ou non (binaire) |
| **Téléphone** | Numéros identiques après normalisation (suppression espaces, +33→0) |

## 5. Calcul du score global (0–100%)

Si la géolocalisation est disponible :

> Score = Nom × 30% + Adresse × 25% + Géoloc × 25% + Code postal × 10% + Téléphone × 10%

Si la géolocalisation n'est pas disponible :

> Score = Nom × 35% + Adresse × 35% + Code postal × 15% + Téléphone × 15%

## 6. Élimination précoce

Si le nom est < 70% **ET** l'adresse est < 70% **ET** le téléphone ne matche pas → **non matché** directement.

## 7. Classification finale

| Niveau | Condition |
|---|---|
| **Certain** | Score global ≥ 75% |
| **Possible** | Score global entre 60% et 75% |
| **Possible** (repêchage téléphone) | Score < 60% mais téléphone identique et au moins 30% de similarité sur le nom ou l'adresse |
| **Non matché** | Tout le reste |

## 8. Sélection du meilleur match

Pour chaque structure FINESS, on garde uniquement la structure Soliguide avec le **meilleur score**. Si ce meilleur score aboutit à "non matché", la structure FINESS apparaît dans l'onglet "FINESS non matchées".
