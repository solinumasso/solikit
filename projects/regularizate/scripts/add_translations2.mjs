import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '../src/i18n');

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(typeof target[key] === 'object' ? target[key] : {}, source[key]);
    } else {
      if (!(key in result)) result[key] = source[key];
    }
  }
  return result;
}

const additions = {
  map: {
    legend_extranjeria: {
      es: 'Extranjería (5)', fr: 'Étrangers (5)', en: 'Immigration (5)',
      ca: 'Estrangeria (5)', pt: 'Estrangeiros (5)', ar: 'مكتب الأجانب (5)',
      wo: 'Étrangers (5)', bm: 'Étrangers (5)',
    },
    legend_correos: {
      es: 'Correos (371 en toda España)', fr: 'Bureaux de poste (371 en Espagne)',
      en: 'Post offices (371 across Spain)', ca: 'Correus (371 a tota Espanya)',
      pt: 'Correios (371 em toda Espanha)', ar: 'مكاتب البريد (371 في جميع أنحاء إسبانيا)',
      wo: 'Bureaux de poste (371 en Espagne)', bm: 'Bureaux de poste (371 en Espagne)',
    },
    legend_ss: {
      es: 'Seguridad Social (60)', fr: 'Sécurité Sociale (60)', en: 'Social Security (60)',
      ca: 'Seguretat Social (60)', pt: 'Segurança Social (60)', ar: 'الضمان الاجتماعي (60)',
      wo: 'Sécurité Sociale (60)', bm: 'Sécurité Sociale (60)',
    },
    legend_location: {
      es: 'Tu ubicación', fr: 'Votre position', en: 'Your location',
      ca: 'La teva ubicació', pt: 'A sua localização', ar: 'موقعك',
      wo: 'Sa yoon', bm: 'I yɔrɔ',
    },
  },
  pi: {
    doc_form_label: {
      es: 'Formulario EX-31 debidamente cumplimentado y firmado',
      fr: 'Formulaire EX-31 dûment rempli et signé',
      en: 'EX-31 form duly completed and signed',
      ca: 'Formulari EX-31 degudament emplenat i signat',
      pt: 'Formulário EX-31 devidamente preenchido e assinado',
      ar: 'نموذج EX-31 مملوء وموقع حسب الأصول',
      wo: 'Formulaire EX-31 dûment rempli et signé',
      bm: 'Formulaire EX-31 dûment rempli et signé',
    },
    doc_form_where: {
      es: 'Ministerio de Inclusión', fr: 'Ministère de l\'Inclusion',
      en: 'Ministry of Inclusion', ca: 'Ministeri d\'Inclusió',
      pt: 'Ministério da Inclusão', ar: 'وزارة الإدماج',
      wo: 'Ministère de l\'Inclusion', bm: 'Ministère de l\'Inclusion',
    },
    doc_pi_label: {
      es: 'Documentación de tu solicitud PI (resolución o cédula)',
      fr: 'Documentation de votre demande PI (résolution ou récépissé)',
      en: 'PI application documentation (resolution or receipt)',
      ca: 'Documentació de la sol·licitud PI (resolució o cèdula)',
      pt: 'Documentação do pedido PI (resolução ou cédula)',
      ar: 'وثائق طلب الحماية الدولية (قرار أو إيصال)',
      wo: 'Documentation de votre demande PI (résolution ou récépissé)',
      bm: 'Documentation de votre demande PI (résolution ou récépissé)',
    },
    doc_pi_where: {
      es: 'Oficina de Asilo y Refugio (OAR)', fr: 'Bureau d\'Asile et de Refuge (OAR)',
      en: 'Asylum and Refuge Office (OAR)', ca: 'Oficina d\'Asil i Refugi (OAR)',
      pt: 'Escritório de Asilo e Refúgio (OAR)', ar: 'مكتب اللجوء والمأوى (OAR)',
      wo: 'Bureau d\'Asile et de Refuge (OAR)', bm: 'Bureau d\'Asile et de Refuge (OAR)',
    },
  },
  ordinary: {
    permanent_badge: {
      es: 'Permanente', fr: 'Permanent', en: 'Permanent',
      ca: 'Permanent', pt: 'Permanente', ar: 'دائم',
      wo: 'Permanent', bm: 'Permanent',
    },
    doc_form: {
      es: 'Formulario EX-07 firmado', fr: 'Formulaire EX-07 signé',
      en: 'Signed EX-07 form', ca: 'Formulari EX-07 signat',
      pt: 'Formulário EX-07 assinado', ar: 'نموذج EX-07 موقع',
      wo: 'Formulaire EX-07 signé', bm: 'Formulaire EX-07 signé',
    },
    where_form: {
      es: 'Ministerio de Inclusión — sede electrónica',
      fr: 'Ministère de l\'Inclusion — site officiel',
      en: 'Ministry of Inclusion — official website',
      ca: 'Ministeri d\'Inclusió — seu electrònica',
      pt: 'Ministério da Inclusão — sede eletrónica',
      ar: 'وزارة الإدماج — الموقع الرسمي',
      wo: 'Ministère de l\'Inclusion — site officiel',
      bm: 'Ministère de l\'Inclusion — site officiel',
    },
    tasa_amount: {
      es: '~10,72 €', fr: '~10,72 €', en: '~10.72 €',
      ca: '~10,72 €', pt: '~10,72 €', ar: '~10,72 €',
      wo: '~10,72 €', bm: '~10,72 €',
    },
    stat_smi_src: {
      es: 'RD 126/2026', fr: 'RD 126/2026', en: 'RD 126/2026',
      ca: 'RD 126/2026', pt: 'RD 126/2026', ar: 'RD 126/2026',
      wo: 'RD 126/2026', bm: 'RD 126/2026',
    },
    stat_iprem_src: {
      es: 'Referencia', fr: 'Référence', en: 'Reference',
      ca: 'Referència', pt: 'Referência', ar: 'مرجع',
      wo: 'Référence', bm: 'Référence',
    },
  },
};

const LANGS = ['es', 'fr', 'en', 'ca', 'pt', 'ar', 'wo', 'bm'];

for (const lang of LANGS) {
  const filePath = join(i18nDir, `${lang}.json`);
  const existing = JSON.parse(readFileSync(filePath, 'utf8'));
  const toAdd = {};
  for (const [section, keys] of Object.entries(additions)) {
    toAdd[section] = {};
    for (const [key, vals] of Object.entries(keys)) {
      toAdd[section][key] = vals[lang] ?? vals['es'];
    }
  }
  const merged = deepMerge(existing, toAdd);
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Updated ${lang}.json`);
}
console.log('Done.');
