import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '../src/i18n');

function getIn(obj, path) {
  return path.split('.').reduce((cur, k) => cur?.[k], obj);
}
function setIn(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const fixes = {
  fr: {
    'landing.card_ordinary_title': "Je suis en Espagne depuis 2+ ans — voie ordinaire",
    'landing.card_ordinary_desc': "Résidence sociale, socioprofessionnelle, familiale, socioformative ou seconde chance. Sans date limite.",
    'landing.dates_close_desc': "Dernière chance pour EX-32 (DA 21ª) et EX-31 (DA 20ª). Après, seulement les voies ordinaires.",
    'landing.dates_permanent_title': "Voies ordinaires — sans date limite",
    'landing.stat_tasa_src': "Voies ordinaires",
    'extraordinary.legal_basis': "Disposition Additionnelle 21ª du RD 1155/2024, introduite par le RD 316/2026",
    'extraordinary.validity': "Autorisation de 1 an, renouvelable. Équivaut à une résidence sociale pour circonstances exceptionnelles.",
    'extraordinary.doc_empadronamiento': "Certificat de résidence (attestation de domicile historique)",
    'extraordinary.step5_presencial_desc': "436 points d'accueil en personne : 371 bureaux de Correos (poste), 60 bureaux de Sécurité Sociale, et 5 bureaux de l'Immigration (Madrid, Alicante, Valencia, Almería, Murcia).",
    'extraordinary.step5_hours_ext': "Bureaux de l'Immigration : lundi au vendredi 16h00–19h00",
    'pi.title': "Résidence par Protection Internationale (DA 20ª)",
    'pi.legal_basis': "Disposition Additionnelle 20ª du RD 1155/2024, introduite par le RD 316/2026",
    'ordinary.title': "Régularisation Ordinaire",
    'ordinary.sociolaboral_title': "Résidence Socioprofessionnelle",
    'ordinary.social_title': "Résidence Sociale",
    'ordinary.socioformativo_title': "Résidence Socioformative",
    'ordinary.familiar_title': "Résidence Familiale",
    'map.filter_extranjeria': "Bureaux de l'Immigration (5)",
    'map.popup_accepts_ordinary': "Accepte la régularisation ordinaire",
    'glossary.mercurio': "Plateforme en ligne du Ministère pour soumettre les demandes d'immigration",
    'glossary.circunstancias_excepcionales': "Catégorie juridique regroupant les voies de régularisation. Permet d'obtenir la résidence en dehors des voies ordinaires.",
    'glossary.da_21': "Disposition Additionnelle 21ª du RD 1155/2024, introduite par le RD 316/2026. Régit la régularisation extraordinaire.",
    'glossary.da_20': "Disposition Additionnelle 20ª du RD 1155/2024, introduite par le RD 316/2026. Régit la résidence par protection internationale.",
    'glossary.ex_07': "Formulaire officiel pour demander un séjour temporaire pour circonstances exceptionnelles (régularisation ordinaire)",
    'glossary.ex_31': "Formulaire officiel pour la résidence par protection internationale (DA 20ª, RD 316/2026)",
  },
  en: {
    'extraordinary.doc_empadronamiento': "Historical residence registration certificate",
    'extraordinary.step5_presencial_desc': "436 in-person offices: 371 Correos post offices, 60 Social Security offices, and 5 Immigration offices (Madrid, Alicante, Valencia, Almería, Murcia).",
    'extraordinary.step5_hours_ext': "Immigration Office: Monday to Friday 16:00–19:00",
    'extraordinary.step6_tie_1': "Make an appointment at your local police station (Provincial Immigration Brigade)",
    'map.filter_extranjeria': "Immigration offices (5)",
    'glossary.circunstancias_excepcionales': "Legal category covering regularization routes. Allows obtaining residence outside the ordinary routes.",
    'glossary.da_20': "Additional Provision 20ª of RD 1155/2024, introduced by RD 316/2026. Governs residency for international protection.",
    'glossary.ex_07': "Official form for temporary residence for exceptional circumstances (ordinary regularization routes)",
    'glossary.ex_31': "Official form for residency for international protection (DA 20ª, RD 316/2026)",
  },
  ca: {
    'landing.dates_close_desc': "Última oportunitat per a EX-32 (DA 21ª) i EX-31 (DA 20ª). Després, només l'arrelament ordinari.",
    'landing.dates_permanent_title': "Arrelaments ordinaris — sense data límit",
    'landing.stat_tasa_src': "Arrelament",
    'extraordinary.step5_presencial_desc': "436 punts d'atenció presencial: 371 oficines de Correos, 60 oficines de Seguretat Social, i 5 oficines d'Estrangeria (Madrid, Alacant, València, Almeria, Múrcia).",
    'extraordinary.step5_hours_ext': "Estrangeria: dilluns a divendres 16:00–19:00",
    'map.filter_extranjeria': "Oficines d'Estrangeria (5)",
  },
  pt: {
    'landing.card_ordinary_title': "Estou em Espanha há 2+ anos — via ordinária",
    'landing.card_ordinary_desc': "Residência social, sociolaboral, familiar, socioformativa ou segunda oportunidade. Sem prazo.",
    'landing.dates_close_desc': "Última oportunidade para EX-32 (DA 21ª) e EX-31 (DA 20ª). Depois, apenas as vias ordinárias.",
    'landing.dates_permanent_title': "Vias ordinárias — sem prazo",
    'landing.stat_tasa_src': "Vias ordinárias",
    'extraordinary.validity': "Autorização de 1 ano, renovável. Equivale a residência social por circunstâncias excecionais.",
    'extraordinary.doc_empadronamiento': "Certificado histórico de registo de residência",
    'extraordinary.step5_presencial_desc': "436 pontos de atendimento presencial: 371 agências dos Correios (Correos), 60 agências da Segurança Social, e 5 serviços de Imigração (Madrid, Alicante, Valencia, Almería, Murcia).",
    'extraordinary.step5_hours_ext': "Serviços de Imigração: segunda a sexta 16:00–19:00",
    'extraordinary.step6_tie_1': "Marque consulta na esquadra (Brigada Provincial de Imigração)",
    'pi.title': "Residência por Proteção Internacional (DA 20ª)",
    'ordinary.title': "Regularização Ordinária",
    'ordinary.sociolaboral_title': "Residência Sociolaboral",
    'ordinary.social_title': "Residência Social",
    'ordinary.socioformativo_title': "Residência Socioformativa",
    'ordinary.familiar_title': "Residência Familiar",
    'map.filter_extranjeria': "Serviços de Imigração (5)",
    'map.popup_accepts_ordinary': "Aceita regularização ordinária",
    'glossary.mercurio': "Plataforma online do Ministério para submeter pedidos de imigração",
    'glossary.circunstancias_excepcionales': "Categoria jurídica que engloba as vias de regularização. Permite obter residência fora das vias ordinárias.",
    'glossary.da_21': "Disposição Adicional 21ª do RD 1155/2024, introduzida pelo RD 316/2026. Regula a regularização extraordinária.",
    'glossary.da_20': "Disposição Adicional 20ª do RD 1155/2024, introduzida pelo RD 316/2026. Regula a residência por proteção internacional.",
    'glossary.ex_31': "Formulário oficial para residência por proteção internacional (DA 20ª, RD 316/2026)",
  },
  ar: {
    'landing.card_ordinary_desc': "الإقامة الاجتماعية، المهنية، العائلية، التكوينية أو فرصة ثانية. بدون موعد نهائي.",
    'extraordinary.validity': "تصريح لمدة سنة، قابل للتجديد. مكافئ للإقامة الاجتماعية للظروف الاستثنائية.",
    'extraordinary.doc_empadronamiento': "شهادة تسجيل الإقامة التاريخية",
    'extraordinary.step5_presencial_desc': "436 نقطة استقبال حضوري: 371 مكتب بريد (Correos)، 60 مكتب ضمان اجتماعي، و5 مكاتب الهجرة (مدريد، أليكانتي، فالنسيا، ألميريا، مورسيا).",
    'extraordinary.step5_hours_ext': "مكتب الهجرة: الاثنين-الجمعة 16:00–19:00",
    'extraordinary.step6_tie_1': "احجز موعداً في مركز الشرطة (فرقة الهجرة الإقليمية)",
    'pi.title': "الإقامة للحماية الدولية (DA 20ª)",
    'ordinary.title': "التسوية العادية",
    'ordinary.sociolaboral_title': "الإقامة المهنية الاجتماعية",
    'ordinary.social_title': "الإقامة الاجتماعية",
    'ordinary.socioformativo_title': "الإقامة التكوينية",
    'ordinary.familiar_title': "الإقامة العائلية",
    'map.filter_extranjeria': "مكاتب الهجرة (5)",
    'map.popup_accepts_ordinary': "يقبل التسوية العادية",
    'glossary.circunstancias_excepcionales': "فئة قانونية تشمل مسارات الإقامة. تتيح الحصول على الإقامة خارج المسارات العادية.",
    'glossary.da_20': "الحكم الإضافي 20ª من RD 1155/2024، المُضاف بـ RD 316/2026. ينظم إقامة الحماية الدولية.",
    'glossary.ex_07': "النموذج الرسمي لطلب الإقامة المؤقتة للظروف الاستثنائية (التسوية العادية)",
    'glossary.ex_31': "النموذج الرسمي لإقامة الحماية الدولية (DA 20ª, RD 316/2026)",
  },
  wo: {
    'landing.urgency_text': "Régularisation extraordinaire — ferme le 30 juin 2026",
    'landing.card_ordinary_title': "Jëgël naa fii 2+ at — yoon ordinaire",
    'landing.card_ordinary_desc': "Résidence sociale, socioprofessionnelle, familiale, socioformative ou deuxième chance. Date limite amul.",
    'landing.disclaimer_short': "Site bii ci xam-xam rekk la. Ci xam-xam jëf jëf, xam ak avocat spécialisé ci loi immigration.",
    'landing.dates_close_desc': "Dernière chance pour EX-32 et EX-31. Après, seulement les voies ordinaires.",
    'landing.dates_permanent_title': "Voies ordinaires — sans date limite",
    'landing.stat_tasa_src': "Voies ordinaires",
    'extraordinary.doc_empadronamiento': "Certificat de résidence historique",
    'extraordinary.step5_presencial_desc': "436 yɔrɔ: 371 Correos (poste), 60 Sécurité Sociale, 5 bureaux de l'Immigration (Madrid, Alicante, Valencia, Almería, Murcia).",
    'extraordinary.step5_appointment': "Rendez-vous obligatoire. Dem ci site ministère bi, formulaire en ligne, wala 060.",
    'extraordinary.step5_hours_ext': "Bureaux de l'Immigration: 16:00–19:00",
    'extraordinary.step6_tie_1': "Dëmm rendez-vous ci commissariat (Brigade provinciale Immigration)",
    'pi.title': "Résidence par Protection Internationale (DA 20ª)",
    'ordinary.title': "Régularisation Ordinaire",
    'ordinary.sociolaboral_title': "Résidence Socioprofessionnelle",
    'ordinary.social_title': "Résidence Sociale",
    'ordinary.socioformativo_title': "Résidence Socioformative",
    'ordinary.familiar_title': "Résidence Familiale",
    'map.filter_extranjeria': "Bureaux Immigration (5)",
    'map.popup_accepts_ordinary': "Accepte régularisation ordinaire",
    'map.appointment_required': "Rendez-vous obligatoire",
    'glossary.circunstancias_excepcionales': "Catégorie légale voies de régularisation",
    'glossary.da_20': "DA 20ª — résidence par protection internationale",
    'glossary.ex_07': "Formulaire régularisation ordinaire",
    'glossary.ex_31': "Formulaire résidence par protection internationale",
    'footer.disclaimer': "Site bii ci xam-xam rekk la. Amul xam-xam jëf jëf. Xam ak avocat spécialisé ci loi immigration.",
  },
  bm: {
    'landing.urgency_text': "Régularisation extraordinaire — ferme le 30 juin 2026",
    'landing.card_ordinary_title': "Ne tun yan saan 2+ — yɔrɔ ordinaire",
    'landing.card_ordinary_desc': "Résidence sociale, socioprofessionnelle, familiale, socioformative ou deuxième chance. Tile lɔgɔ tɛ.",
    'landing.disclaimer_short': "Site nin ye kunnafoni dɔrɔn. Sariya kunnafoni tɛ, jago ni avocat spécialisé kɛ immigration kɛnɛ la.",
    'landing.dates_close_desc': "Dernière chance pour EX-32 et EX-31. Après, seulement les voies ordinaires.",
    'landing.dates_permanent_title': "Voies ordinaires — sans date limite",
    'landing.stat_tasa_src': "Voies ordinaires",
    'extraordinary.doc_empadronamiento': "Certificat de résidence historique",
    'extraordinary.step5_presencial_desc': "436 yɔrɔ: 371 Correos (poste), 60 Sécurité Sociale, 5 bureaux Immigration (Madrid, Alicante, Valencia, Almería, Murcia).",
    'extraordinary.step5_appointment': "Rendez-vous obligatoire. Site ministère, formulaire en ligne, walima 060.",
    'extraordinary.step5_hours_ext': "Bureaux Immigration: 16:00–19:00",
    'extraordinary.step6_tie_1': "Rendez-vous sɔrɔ commissariat (Brigade provinciale Immigration)",
    'pi.title': "Résidence par Protection Internationale (DA 20ª)",
    'ordinary.title': "Régularisation Ordinaire",
    'ordinary.sociolaboral_title': "Résidence Socioprofessionnelle",
    'ordinary.social_title': "Résidence Sociale",
    'ordinary.socioformativo_title': "Résidence Socioformative",
    'ordinary.familiar_title': "Résidence Familiale",
    'map.filter_extranjeria': "Bureaux Immigration (5)",
    'map.popup_accepts_ordinary': "Accepte régularisation ordinaire",
    'map.appointment_required': "Rendez-vous obligatoire",
    'glossary.circunstancias_excepcionales': "Catégorie légale voies de régularisation",
    'glossary.da_20': "DA 20ª — résidence par protection internationale",
    'glossary.ex_07': "Formulaire régularisation ordinaire",
    'glossary.ex_31': "Formulaire résidence par protection internationale",
    'footer.disclaimer': "Site nin ye kunnafoni dɔrɔn. Sariya kunnafoni tɛ. Avocat spécialisé immigration kɔnɔ dɔn.",
  },
};

for (const [lang, langFixes] of Object.entries(fixes)) {
  const filePath = join(i18nDir, `${lang}.json`);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(langFixes)) {
    setIn(data, key, value);
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Fixed ${lang}.json (${Object.keys(langFixes).length} keys)`);
}
console.log('Done.');
