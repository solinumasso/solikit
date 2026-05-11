// Script to add missing translation keys to all language files
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '../src/i18n');

// All new keys, organized by section and language
const additions = {
  nav: {
    back_home: {
      es: 'Volver al inicio', fr: 'Retour à l\'accueil', en: 'Back to home',
      ca: 'Tornar a l\'inici', pt: 'Voltar ao início', ar: 'العودة إلى الرئيسية',
      wo: 'Retour à l\'accueil', bm: 'Retour à l\'accueil',
    },
  },
  countdown: {
    days_remaining: {
      es: '— Quedan {days} días', fr: '— Il reste {days} jours', en: '— {days} days left',
      ca: '— Queden {days} dies', pt: '— Faltam {days} dias', ar: '— تبقى {days} أيام',
      wo: '— {days} fan ci kanam', bm: '— {days} don bɛ to',
    },
  },
  landing: {
    tag_verified: {
      es: 'Guía gratuita · Verificada mayo 2026', fr: 'Guide gratuit · Vérifié mai 2026',
      en: 'Free guide · Verified May 2026', ca: 'Guia gratuïta · Verificada maig 2026',
      pt: 'Guia gratuito · Verificado maio 2026', ar: 'دليل مجاني · تم التحقق منه في مايو 2026',
      wo: 'Guide yëgël ak dara · Vérifié mai 2026', bm: 'Guide dɔnkili · Vérifié mai 2026',
    },
    urgency_text: {
      es: 'Regularización extraordinaria — cierra el 30 junio 2026',
      fr: 'Régularisation extraordinaire — ferme le 30 juin 2026',
      en: 'Extraordinary regularisation — closes 30 June 2026',
      ca: 'Regularització extraordinària — tanca el 30 juny 2026',
      pt: 'Regularização extraordinária — fecha em 30 junho 2026',
      ar: 'التسوية الاستثنائية — تنتهي في 30 يونيو 2026',
      wo: 'Regularización extraordinaria — cierra el 30 junio 2026',
      bm: 'Regularización extraordinaria — cierra el 30 junio 2026',
    },
    how_title: {
      es: '¿Cómo funciona la guía?', fr: 'Comment fonctionne le guide ?',
      en: 'How does the guide work?', ca: 'Com funciona la guia?',
      pt: 'Como funciona o guia?', ar: 'كيف يعمل الدليل؟',
      wo: 'Comment fonctionne le guide ?', bm: 'Comment fonctionne le guide ?',
    },
    how_1_title: {
      es: 'Comprueba si puedes', fr: 'Vérifie ton éligibilité', en: 'Check your eligibility',
      ca: 'Comprova si pots', pt: 'Verifica se podes', ar: 'تحقق من أهليتك',
      wo: 'Vérifie ton éligibilité', bm: 'Vérifie ton éligibilité',
    },
    how_1_desc: {
      es: '3 preguntas rápidas para confirmar que cumples los requisitos.',
      fr: '3 questions rapides pour confirmer que tu remplis les conditions.',
      en: '3 quick questions to confirm you meet the requirements.',
      ca: '3 preguntes ràpides per confirmar que compleixis els requisits.',
      pt: '3 perguntas rápidas para confirmar que cumpres os requisitos.',
      ar: '3 أسئلة سريعة للتحقق من استيفاء الشروط.',
      wo: '3 laaj yu yees ngir xam ne dafa noppi.',
      bm: '3 ɲininkali jan ka i hakɛ lajɛ.',
    },
    how_2_title: {
      es: 'Prepara documentos', fr: 'Prépare les documents', en: 'Prepare documents',
      ca: 'Prepara documents', pt: 'Prepara documentos', ar: 'جهّز الوثائق',
      wo: 'Jël liggéeyam yi', bm: 'Sɛbɛnni labɛn',
    },
    how_2_desc: {
      es: 'Lista completa con dónde obtener cada papel. Copiable en un clic.',
      fr: 'Liste complète avec l\'endroit où obtenir chaque document. Copiable en un clic.',
      en: 'Complete list with where to get each document. Copyable in one click.',
      ca: 'Llista completa amb on obtenir cada document. Copiable en un clic.',
      pt: 'Lista completa com onde obter cada documento. Copiável num clique.',
      ar: 'قائمة كاملة بمكان الحصول على كل وثيقة. قابلة للنسخ بنقرة واحدة.',
      wo: 'Liste bu dëkk ak fii ngay dem jële kàddu yi.',
      bm: 'Liste min bɛɛ sɛgɛsɛgɛla ni min be baara la.',
    },
    how_3_title: {
      es: 'Paga la tasa', fr: 'Paye la taxe', en: 'Pay the fee',
      ca: 'Paga la taxa', pt: 'Paga a taxa', ar: 'ادفع الرسوم',
      wo: 'Fey taxe bi', bm: 'Tɛnɛmɛ san',
    },
    how_3_desc: {
      es: '~10,72 € — paso a paso para generar el Modelo 790-052.',
      fr: '~10,72 € — étape par étape pour générer le Formulaire 790-052.',
      en: '~10.72 € — step by step to generate Form 790-052.',
      ca: '~10,72 € — pas a pas per generar el Model 790-052.',
      pt: '~10,72 € — passo a passo para gerar o Modelo 790-052.',
      ar: '~10,72 € — خطوة بخطوة لإنشاء النموذج 790-052.',
      wo: '~10,72 € — étape par étape pour le Formulaire 790-052.',
      bm: '~10,72 € — étape par étape pour le Formulaire 790-052.',
    },
    how_4_title: {
      es: 'Presenta tu solicitud', fr: 'Dépose ta demande', en: 'Submit your application',
      ca: 'Presenta la teva sol·licitud', pt: 'Apresenta o teu pedido', ar: 'قدّم طلبك',
      wo: 'Yonneel sa dëmanu', bm: 'I daali labɛn',
    },
    how_4_desc: {
      es: 'Online (Mercurio) o en uno de los 436 puntos presenciales.',
      fr: 'En ligne (Mercurio) ou dans l\'un des 436 points en personne.',
      en: 'Online (Mercurio) or at one of the 436 in-person points.',
      ca: 'Online (Mercurio) o en un dels 436 punts presencials.',
      pt: 'Online (Mercurio) ou num dos 436 pontos presenciais.',
      ar: 'عبر الإنترنت (ميركوريو) أو في أحد نقاط التسليم الـ 436.',
      wo: 'En ligne (Mercurio) ou dans l\'un des 436 points en personne.',
      bm: 'En ligne (Mercurio) ou dans l\'un des 436 points en personne.',
    },
    dates_title: {
      es: 'Fechas clave 2026', fr: 'Dates clés 2026', en: 'Key dates 2026',
      ca: 'Dates clau 2026', pt: 'Datas-chave 2026', ar: 'التواريخ الرئيسية 2026',
      wo: 'Dates clés 2026', bm: 'Dates clés 2026',
    },
    dates_deadline_label: {
      es: 'Deadline', fr: 'Date limite', en: 'Deadline',
      ca: 'Termini', pt: 'Prazo', ar: 'الموعد النهائي',
      wo: 'Date limite', bm: 'Date limite',
    },
    dates_deadline_date: {
      es: '30 jun. 2026', fr: '30 juin 2026', en: '30 Jun. 2026',
      ca: '30 juny 2026', pt: '30 jun. 2026', ar: '30 يونيو 2026',
      wo: '30 juin 2026', bm: '30 juin 2026',
    },
    dates_close_title: {
      es: 'Cierre regularización extraordinaria',
      fr: 'Fermeture régularisation extraordinaire',
      en: 'Extraordinary regularisation closes',
      ca: 'Tancament regularització extraordinària',
      pt: 'Encerramento regularização extraordinária',
      ar: 'إغلاق التسوية الاستثنائية',
      wo: 'Fermeture régularisation extraordinaire',
      bm: 'Fermeture régularisation extraordinaire',
    },
    dates_close_desc: {
      es: 'Última oportunidad para EX-32 (DA 21ª) y EX-31 (DA 20ª). Después, solo arraigo ordinario.',
      fr: 'Dernière chance pour EX-32 (DA 21ª) et EX-31 (DA 20ª). Après, seulement l\'arraigo ordinaire.',
      en: 'Last chance for EX-32 (DA 21ª) and EX-31 (DA 20ª). After that, only ordinary arraigo.',
      ca: 'Última oportunitat per a EX-32 (DA 21ª) i EX-31 (DA 20ª). Després, només arraigo ordinari.',
      pt: 'Última oportunidade para EX-32 (DA 21ª) e EX-31 (DA 20ª). Depois, apenas arraigo ordinário.',
      ar: 'آخر فرصة لـ EX-32 و EX-31. بعد ذلك، فقط التأصيل العادي.',
      wo: 'Dernière chance pour EX-32 et EX-31. Après, seulement arraigo ordinaire.',
      bm: 'Dernière chance pour EX-32 et EX-31. Après, seulement arraigo ordinaire.',
    },
    dates_permanent_label: {
      es: 'Permanente', fr: 'Permanent', en: 'Permanent',
      ca: 'Permanent', pt: 'Permanente', ar: 'دائم',
      wo: 'Permanent', bm: 'Permanent',
    },
    dates_permanent_title: {
      es: 'Arraigos ordinarios — sin fecha límite',
      fr: 'Arraigos ordinaires — sans date limite',
      en: 'Ordinary arraigos — no deadline',
      ca: 'Arraigos ordinaris — sense data límit',
      pt: 'Arraigos ordinários — sem prazo',
      ar: 'التأصيل العادي — بدون تاريخ انتهاء',
      wo: 'Arraigos ordinaires — sans date limite',
      bm: 'Arraigos ordinaires — sans date limite',
    },
    dates_permanent_desc: {
      es: '5 vías (segunda oportunidad, sociolaboral, social, socioformativo, familiar) siguen vigentes indefinidamente.',
      fr: '5 voies (deuxième chance, sociolaboral, social, socioformatif, familial) restent valables indéfiniment.',
      en: '5 pathways (second chance, sociolaboral, social, socioformative, family) remain valid indefinitely.',
      ca: '5 vies (segona oportunitat, sociolaboral, social, socioformatiu, familiar) segueixen vigents indefinidament.',
      pt: '5 vias continuam vigentes indefinidamente.',
      ar: '5 مسارات تظل سارية المفعول إلى أجل غير مسمى.',
      wo: '5 voies restent valables indéfiniment.',
      bm: '5 voies restent valables indéfiniment.',
    },
    stat_smi_label: {
      es: 'SMI/mes 2026', fr: 'SMIC/mois 2026', en: 'Min. wage/month 2026',
      ca: 'SMI/mes 2026', pt: 'SMI/mês 2026', ar: 'الحد الأدنى/شهر 2026',
      wo: 'SMIC/mois 2026', bm: 'SMIC/mois 2026',
    },
    stat_iprem_label: {
      es: 'IPREM/mes', fr: 'IPREM/mois', en: 'IPREM/month',
      ca: 'IPREM/mes', pt: 'IPREM/mês', ar: 'IPREM/شهر',
      wo: 'IPREM/mois', bm: 'IPREM/mois',
    },
    stat_tasa_label: {
      es: 'Tasa 790-052', fr: 'Taxe 790-052', en: 'Fee 790-052',
      ca: 'Taxa 790-052', pt: 'Taxa 790-052', ar: 'رسوم 790-052',
      wo: 'Taxe 790-052', bm: 'Taxe 790-052',
    },
    stat_points_label: {
      es: 'Puntos depósito', fr: 'Points de dépôt', en: 'Submission points',
      ca: 'Punts de dipòsit', pt: 'Pontos de depósito', ar: 'نقاط التسليم',
      wo: 'Points de dépôt', bm: 'Points de dépôt',
    },
    stat_iprem_src: {
      es: 'Referencia', fr: 'Référence', en: 'Reference',
      ca: 'Referència', pt: 'Referência', ar: 'مرجع',
      wo: 'Référence', bm: 'Référence',
    },
    stat_tasa_src: {
      es: 'Arraigo', fr: 'Arraigo', en: 'Arraigo',
      ca: 'Arraigo', pt: 'Arraigo', ar: 'تأصيل',
      wo: 'Arraigo', bm: 'Arraigo',
    },
    stat_points_src: {
      es: 'Correos + SS + Ext.', fr: 'Correos + SS + Ext.', en: 'Post + SS + Ext.',
      ca: 'Correos + SS + Ext.', pt: 'Correos + SS + Ext.', ar: 'البريد + SS + هجرة',
      wo: 'Correos + SS + Ext.', bm: 'Correos + SS + Ext.',
    },
  },
  extraordinary: {
    label_deadline: {
      es: 'Deadline', fr: 'Date limite', en: 'Deadline',
      ca: 'Termini', pt: 'Prazo', ar: 'الموعد النهائي',
      wo: 'Date limite', bm: 'Date limite',
    },
    label_novedad: {
      es: 'Novedad', fr: 'Nouveauté', en: 'New',
      ca: 'Novetat', pt: 'Novidade', ar: 'جديد',
      wo: 'Nouveauté', bm: 'Nouveauté',
    },
    quiz_intro: {
      es: 'Responde para comprobar tu elegibilidad.',
      fr: 'Réponds pour vérifier ton éligibilité.',
      en: 'Answer to check your eligibility.',
      ca: 'Respon per comprovar la teva elegibilitat.',
      pt: 'Responde para verificar a tua elegibilidade.',
      ar: 'أجب للتحقق من أهليتك.',
      wo: 'Réponds pour vérifier ton éligibilité.',
      bm: 'Réponds pour vérifier ton éligibilité.',
    },
    cond_intro: {
      es: 'Marca cada requisito que cumplas. Necesitas todos para poder solicitar.',
      fr: 'Coche chaque condition que tu remplis. Tu as besoin de toutes pour faire la demande.',
      en: 'Check each requirement you meet. You need all of them to apply.',
      ca: 'Marca cada requisit que compleixis. Necessites tots per poder sol·licitar.',
      pt: 'Marca cada requisito que cumpres. Necessitas de todos para poder solicitar.',
      ar: 'علّم على كل شرط تستوفيه. تحتاج إلى جميعها للتقديم.',
      wo: 'Coche chaque condition que tu remplis.',
      bm: 'Coche chaque condition que tu remplis.',
    },
    docs_intro: {
      es: 'Lista completa de lo que necesitas presentar.',
      fr: 'Liste complète de ce que tu dois présenter.',
      en: 'Complete list of what you need to submit.',
      ca: 'Llista completa del que necessites presentar.',
      pt: 'Lista completa do que precisas de apresentar.',
      ar: 'قائمة كاملة بما تحتاج إلى تقديمه.',
      wo: 'Liste complète de ce que tu dois présenter.',
      bm: 'Liste complète de ce que tu dois présenter.',
    },
    complete_title: {
      es: '¡Información completa!', fr: 'Informations complètes !', en: 'All information complete!',
      ca: 'Informació completa!', pt: 'Informação completa!', ar: 'اكتملت المعلومات!',
      wo: 'Informations complètes !', bm: 'Informations complètes !',
    },
    complete_desc: {
      es: 'Ya tienes todo para iniciar tu trámite. La fecha límite es el 30 junio 2026.',
      fr: 'Tu as tout pour commencer ta démarche. La date limite est le 30 juin 2026.',
      en: 'You have everything to start your process. The deadline is 30 June 2026.',
      ca: 'Ja tens tot per iniciar el teu tràmit. La data límit és el 30 juny 2026.',
      pt: 'Já tens tudo para iniciar o teu processo. O prazo é 30 junho 2026.',
      ar: 'لديك كل ما تحتاجه لبدء إجراءاتك. الموعد النهائي هو 30 يونيو 2026.',
      wo: 'Tu as tout pour commencer ta démarche. La date limite est le 30 juin 2026.',
      bm: 'Tu as tout pour commencer ta démarche. La date limite est le 30 juin 2026.',
    },
    mercurio_cta: {
      es: 'Ir a Mercurio →', fr: 'Aller sur Mercurio →', en: 'Go to Mercurio →',
      ca: 'Anar a Mercurio →', pt: 'Ir para Mercurio →', ar: 'الذهاب إلى ميركوريو →',
      wo: 'Aller sur Mercurio →', bm: 'Aller sur Mercurio →',
    },
    tasa_cta: {
      es: 'Generar 790-052 →', fr: 'Générer 790-052 →', en: 'Generate 790-052 →',
      ca: 'Generar 790-052 →', pt: 'Gerar 790-052 →', ar: 'إنشاء 790-052 →',
      wo: 'Générer 790-052 →', bm: 'Générer 790-052 →',
    },
    doc_ties_where: {
      es: 'Según tu caso', fr: 'Selon votre situation', en: 'Depending on your case',
      ca: 'Segons el teu cas', pt: 'Conforme o teu caso', ar: 'حسب حالتك',
      wo: 'Selon votre situation', bm: 'Selon votre situation',
    },
    apostilla_warning: {
      es: 'Los antecedentes del extranjero deben estar apostillados y con traducción jurada.',
      fr: 'Les antécédents du pays d\'origine doivent être apostillés et traduits par un traducteur assermenté.',
      en: 'Foreign criminal records must be apostilled and have a sworn translation.',
      ca: 'Els antecedents de l\'estranger han d\'estar apostillats i amb traducció jurada.',
      pt: 'Os antecedentes do estrangeiro devem estar apostilados e com tradução juramentada.',
      ar: 'يجب أن تكون السجلات الجنائية الأجنبية مصادقاً عليها (أبوستيل) وبترجمة رسمية.',
      wo: 'Les antécédents du pays d\'origine doivent être apostillés et traduits.',
      bm: 'Les antécédents du pays d\'origine doivent être apostillés et traduits.',
    },
    online_or_presential: {
      es: '¿Online o presencial?', fr: 'En ligne ou en personne ?', en: 'Online or in person?',
      ca: 'Online o presencial?', pt: 'Online ou presencial?', ar: 'عبر الإنترنت أم حضورياً؟',
      wo: 'En ligne ou en personne ?', bm: 'En ligne ou en personne ?',
    },
  },
  ordinary: {
    docs_section: {
      es: 'Documentos', fr: 'Documents', en: 'Documents',
      ca: 'Documents', pt: 'Documentos', ar: 'الوثائق',
      wo: 'Documents', bm: 'Documents',
    },
    submit_section: {
      es: 'Presentar', fr: 'Déposer', en: 'Submit',
      ca: 'Presentar', pt: 'Apresentar', ar: 'تقديم',
      wo: 'Déposer', bm: 'Déposer',
    },
    submit_desc: {
      es: 'Oficina de Extranjería de tu provincia. Cita previa obligatoria.',
      fr: 'Bureau des étrangers de ta province. Rendez-vous obligatoire.',
      en: 'Immigration office in your province. Appointment required.',
      ca: 'Oficina d\'Estrangeria de la teva província. Cita prèvia obligatòria.',
      pt: 'Serviço de Estrangeiros da tua província. Marcação obrigatória.',
      ar: 'مكتب الأجانب في مقاطعتك. الحجز المسبق إلزامي.',
      wo: 'Bureau des étrangers de ta province. Rendez-vous obligatoire.',
      bm: 'Bureau des étrangers de ta province. Rendez-vous obligatoire.',
    },
    tasa_section: {
      es: 'Tasa', fr: 'Taxe', en: 'Fee',
      ca: 'Taxa', pt: 'Taxa', ar: 'الرسوم',
      wo: 'Taxe', bm: 'Taxe',
    },
    tasa_model: {
      es: 'Modelo 790 código 052', fr: 'Formulaire 790 code 052', en: 'Form 790 code 052',
      ca: 'Model 790 codi 052', pt: 'Modelo 790 código 052', ar: 'نموذج 790 رمز 052',
      wo: 'Formulaire 790 code 052', bm: 'Formulaire 790 code 052',
    },
    generate_btn: {
      es: 'Generar →', fr: 'Générer →', en: 'Generate →',
      ca: 'Generar →', pt: 'Gerar →', ar: 'إنشاء →',
      wo: 'Générer →', bm: 'Générer →',
    },
    notes_title: {
      es: 'Notas importantes', fr: 'Notes importantes', en: 'Important notes',
      ca: 'Notes importants', pt: 'Notas importantes', ar: 'ملاحظات مهمة',
      wo: 'Notes importantes', bm: 'Notes importantes',
    },
    note_1: {
      es: 'Antecedentes del extranjero: apostillados + traducción jurada.',
      fr: 'Antécédents de l\'étranger : apostillés + traduction assermentée.',
      en: 'Foreign criminal records: apostilled + sworn translation.',
      ca: 'Antecedents de l\'estranger: apostillats + traducció jurada.',
      pt: 'Antecedentes do estrangeiro: apostilados + tradução juramentada.',
      ar: 'السجلات الجنائية الأجنبية: مصادق عليها + ترجمة رسمية.',
      wo: 'Antécédents de l\'étranger : apostillés + traduction assermentée.',
      bm: 'Antécédents de l\'étranger : apostillés + traduction assermentée.',
    },
    note_2: {
      es: 'Ausencias máximas en el período de 2 años: 90 días.',
      fr: 'Absences maximales sur la période de 2 ans : 90 jours.',
      en: 'Maximum absences over the 2-year period: 90 days.',
      ca: 'Absències màximes en el període de 2 anys: 90 dies.',
      pt: 'Ausências máximas no período de 2 anos: 90 dias.',
      ar: 'الغيابات القصوى خلال فترة سنتين: 90 يوماً.',
      wo: 'Absences maximales sur 2 ans : 90 jours.',
      bm: 'Absences maximales sur 2 ans : 90 jours.',
    },
    note_3: {
      es: 'Silencio negativo: 3 meses sin respuesta = denegación tácita.',
      fr: 'Silence négatif : 3 mois sans réponse = refus tacite.',
      en: 'Negative silence: 3 months without response = tacit refusal.',
      ca: 'Silenci negatiu: 3 mesos sense resposta = denegació tàcita.',
      pt: 'Silêncio negativo: 3 meses sem resposta = recusa tácita.',
      ar: 'الصمت السلبي: 3 أشهر بدون رد = رفض ضمني.',
      wo: 'Silence négatif : 3 mois sans réponse = refus tacite.',
      bm: 'Silence négatif : 3 mois sans réponse = refus tacite.',
    },
    note_4: {
      es: 'SMI 2026: 1.221 €/mes (RD 126/2026). IPREM: 600 €/mes.',
      fr: 'SMI 2026 : 1 221 €/mois (RD 126/2026). IPREM : 600 €/mois.',
      en: 'Min. wage 2026: 1,221 €/month (RD 126/2026). IPREM: 600 €/month.',
      ca: 'SMI 2026: 1.221 €/mes (RD 126/2026). IPREM: 600 €/mes.',
      pt: 'SMI 2026: 1.221 €/mês (RD 126/2026). IPREM: 600 €/mês.',
      ar: 'الحد الأدنى للأجور 2026: 1.221 €/شهر (RD 126/2026). IPREM: 600 €/شهر.',
      wo: 'SMI 2026 : 1 221 €/mois (RD 126/2026). IPREM : 600 €/mois.',
      bm: 'SMI 2026 : 1 221 €/mois (RD 126/2026). IPREM : 600 €/mois.',
    },
    doc_passport: {
      es: 'Pasaporte en vigor (≥4 meses)', fr: 'Passeport valide (≥4 mois)', en: 'Valid passport (≥4 months)',
      ca: 'Passaport en vigor (≥4 mesos)', pt: 'Passaporte válido (≥4 meses)', ar: 'جواز سفر ساري المفعول (≥4 أشهر)',
      wo: 'Passeport yees (≥4 werr)', bm: 'Passeport valide (≥4 mois)',
    },
    doc_empadronamiento: {
      es: 'Certificado de empadronamiento histórico', fr: 'Certificat d\'enregistrement historique',
      en: 'Historical registration certificate', ca: 'Certificat d\'empadronament històric',
      pt: 'Certificado de registo histórico', ar: 'شهادة التسجيل البلدي التاريخية',
      wo: 'Certificat d\'enregistrement historique', bm: 'Certificat d\'enregistrement historique',
    },
    doc_antecedentes: {
      es: 'Antecedentes penales (España + origen, apostillado + traducción jurada)',
      fr: 'Casier judiciaire (Espagne + pays d\'origine, apostillé + traduction assermentée)',
      en: 'Criminal record (Spain + origin, apostilled + sworn translation)',
      ca: 'Antecedents penals (Espanya + origen, apostillat + traducció jurada)',
      pt: 'Antecedentes criminais (Espanha + origem, apostilado + tradução juramentada)',
      ar: 'السجل الجنائي (إسبانيا + بلد الأصل، أبوستيل + ترجمة رسمية)',
      wo: 'Casier judiciaire (Espagne + pays d\'origine, apostillé + traduction)',
      bm: 'Casier judiciaire (Espagne + pays d\'origine, apostillé + traduction)',
    },
    doc_tasa_payment: {
      es: 'Modelo 790 código 052 pagado (~10,72 €)', fr: 'Formulaire 790 code 052 payé (~10,72 €)',
      en: 'Form 790 code 052 paid (~10.72 €)', ca: 'Model 790 codi 052 pagat (~10,72 €)',
      pt: 'Modelo 790 código 052 pago (~10,72 €)', ar: 'نموذج 790 رمز 052 مدفوع (~10,72 €)',
      wo: 'Formulaire 790 code 052 payé (~10,72 €)', bm: 'Formulaire 790 code 052 payé (~10,72 €)',
    },
    doc_contract: {
      es: 'Contrato de trabajo (≥20h/semana al SMI 1.221 €/mes)',
      fr: 'Contrat de travail (≥20h/semaine au SMIC 1 221 €/mois)',
      en: 'Employment contract (≥20h/week at min. wage 1,221 €/month)',
      ca: 'Contracte de treball (≥20h/setmana al SMI 1.221 €/mes)',
      pt: 'Contrato de trabalho (≥20h/semana ao SMI 1.221 €/mês)',
      ar: 'عقد عمل (≥20 ساعة/أسبوع بالحد الأدنى 1.221 €/شهر)',
      wo: 'Contrat de travail (≥20h/semaine au SMIC)', bm: 'Contrat de travail (≥20h/semaine au SMIC)',
    },
    doc_social_ties: {
      es: 'Vínculos familiares o informe de inserción social CCAA',
      fr: 'Liens familiaux ou rapport d\'insertion sociale de la communauté autonome',
      en: 'Family ties or social integration report from the autonomous community',
      ca: 'Vincles familiars o informe d\'inserció social CCAA',
      pt: 'Laços familiares ou relatório de inserção social da comunidade autónoma',
      ar: 'روابط عائلية أو تقرير الاندماج الاجتماعي من الحكومة الإقليمية',
      wo: 'Liens familiaux ou rapport d\'insertion sociale', bm: 'Liens familiaux ou rapport d\'insertion sociale',
    },
    doc_fp_enrollment: {
      es: 'Matrícula en formación profesional certificante',
      fr: 'Inscription en formation professionnelle certifiante',
      en: 'Enrollment in certified vocational training',
      ca: 'Matrícula en formació professional certificant',
      pt: 'Matrícula em formação profissional certificante',
      ar: 'تسجيل في تدريب مهني معتمد',
      wo: 'Inscription en formation professionnelle certifiante',
      bm: 'Inscription en formation professionnelle certifiante',
    },
    doc_family_docs: {
      es: 'Documentación del vínculo familiar', fr: 'Documentation du lien familial',
      en: 'Family relationship documentation', ca: 'Documentació del vincle familiar',
      pt: 'Documentação do vínculo familiar', ar: 'وثائق إثبات القرابة العائلية',
      wo: 'Documentation du lien familial', bm: 'Documentation du lien familial',
    },
    doc_prev_permit: {
      es: 'Documentación del título anterior y motivos de no renovación',
      fr: 'Documentation du titre précédent et motifs de non-renouvellement',
      en: 'Documentation of previous permit and reasons for non-renewal',
      ca: 'Documentació del títol anterior i motius de no renovació',
      pt: 'Documentação do título anterior e motivos de não renovação',
      ar: 'وثائق التصريح السابق وأسباب عدم التجديد',
      wo: 'Documentation du titre précédent et motifs de non-renouvellement',
      bm: 'Documentation du titre précédent et motifs de non-renouvellement',
    },
    mercurio_btn: {
      es: 'Mercurio', fr: 'Mercurio', en: 'Mercurio',
      ca: 'Mercurio', pt: 'Mercurio', ar: 'ميركوريو',
      wo: 'Mercurio', bm: 'Mercurio',
    },
    map_btn: {
      es: 'Mapa', fr: 'Carte', en: 'Map',
      ca: 'Mapa', pt: 'Mapa', ar: 'الخريطة',
      wo: 'Carte', bm: 'Carte',
    },
    stat_smi: {
      es: 'SMI 2026', fr: 'SMIC 2026', en: 'Min. wage 2026',
      ca: 'SMI 2026', pt: 'SMI 2026', ar: 'الحد الأدنى 2026',
      wo: 'SMIC 2026', bm: 'SMIC 2026',
    },
    stat_iprem: {
      es: 'IPREM', fr: 'IPREM', en: 'IPREM',
      ca: 'IPREM', pt: 'IPREM', ar: 'IPREM',
      wo: 'IPREM', bm: 'IPREM',
    },
    stat_absences: {
      es: 'Ausencias máx.', fr: 'Absences max.', en: 'Max. absences',
      ca: 'Absències màx.', pt: 'Ausências máx.', ar: 'الغيابات القصوى',
      wo: 'Absences max.', bm: 'Absences max.',
    },
    stat_absences_src: {
      es: 'En 2 años', fr: 'Sur 2 ans', en: 'Over 2 years',
      ca: 'En 2 anys', pt: 'Em 2 anos', ar: 'خلال سنتين',
      wo: 'Sur 2 ans', bm: 'Sur 2 ans',
    },
    where_passport: {
      es: 'Consulado / país de origen', fr: 'Consulat / pays d\'origine', en: 'Consulate / country of origin',
      ca: 'Consolat / país d\'origen', pt: 'Consulado / país de origem', ar: 'القنصلية / بلد الأصل',
      wo: 'Consulat / pays d\'origine', bm: 'Consulat / pays d\'origine',
    },
    where_empadronamiento: {
      es: 'Ayuntamiento', fr: 'Mairie', en: 'Town hall',
      ca: 'Ajuntament', pt: 'Câmara Municipal', ar: 'مكتب التسجيل البلدي',
      wo: 'Mairie', bm: 'Mairie',
    },
    where_antecedentes: {
      es: 'Ministerio de Justicia + consulado', fr: 'Ministère de la Justice + consulat',
      en: 'Ministry of Justice + consulate', ca: 'Ministeri de Justícia + consolat',
      pt: 'Ministério da Justiça + consulado', ar: 'وزارة العدل + القنصلية',
      wo: 'Ministère de la Justice + consulat', bm: 'Ministère de la Justice + consulat',
    },
    where_employer: {
      es: 'Empleador', fr: 'Employeur', en: 'Employer',
      ca: 'Empleador', pt: 'Empregador', ar: 'صاحب العمل',
      wo: 'Employeur', bm: 'Employeur',
    },
    where_civil_registry: {
      es: 'Registro civil / Servicios sociales', fr: 'Registre civil / Services sociaux',
      en: 'Civil registry / Social services', ca: 'Registre civil / Serveis socials',
      pt: 'Registo civil / Serviços sociais', ar: 'سجل الأحوال المدنية / الخدمات الاجتماعية',
      wo: 'Registre civil / Services sociaux', bm: 'Registre civil / Services sociaux',
    },
    where_fp: {
      es: 'Centro de FP / SEPE', fr: 'Centre de FP / SEPE', en: 'Vocational training centre / SEPE',
      ca: 'Centre de FP / SEPE', pt: 'Centro de FP / SEPE', ar: 'مركز التدريب المهني / SEPE',
      wo: 'Centre de FP / SEPE', bm: 'Centre de FP / SEPE',
    },
    where_civil_registry_only: {
      es: 'Registro civil', fr: 'Registre civil', en: 'Civil registry',
      ca: 'Registre civil', pt: 'Registo civil', ar: 'سجل الأحوال المدنية',
      wo: 'Registre civil', bm: 'Registre civil',
    },
    where_extranjeria: {
      es: 'Oficina de Extranjería', fr: 'Bureau des étrangers', en: 'Immigration office',
      ca: 'Oficina d\'Estrangeria', pt: 'Serviço de Estrangeiros', ar: 'مكتب الأجانب',
      wo: 'Bureau des étrangers', bm: 'Bureau des étrangers',
    },
    where_tasa: {
      es: 'sede.administracionespublicas.gob.es', fr: 'sede.administracionespublicas.gob.es',
      en: 'sede.administracionespublicas.gob.es', ca: 'sede.administracionespublicas.gob.es',
      pt: 'sede.administracionespublicas.gob.es', ar: 'sede.administracionespublicas.gob.es',
      wo: 'sede.administracionespublicas.gob.es', bm: 'sede.administracionespublicas.gob.es',
    },
  },
};

// Deep merge function
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const langs = ['es', 'fr', 'en', 'ca', 'pt', 'ar', 'wo', 'bm'];

for (const lang of langs) {
  const filePath = join(i18nDir, `${lang}.json`);
  const existing = JSON.parse(readFileSync(filePath, 'utf8'));

  // Build additions for this lang
  const langAdditions = {};
  for (const [section, keys] of Object.entries(additions)) {
    langAdditions[section] = {};
    for (const [key, translations] of Object.entries(keys)) {
      const val = translations[lang] ?? translations['es']; // fallback to Spanish
      langAdditions[section][key] = val;
    }
  }

  const merged = deepMerge(existing, langAdditions);
  writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`✓ Updated ${lang}.json`);
}

console.log('\nDone! All translation files updated.');
