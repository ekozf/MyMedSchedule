import { defineFragment } from './define';

/** App shell: tab bar, quick add sheet, headers. Owner: design-system foundation. */
export default defineFragment({
  en: {
    tabs: {
      today: 'Today',
      medicines: 'Medicines',
      journal: 'Journal',
    },
    quickAdd: {
      title: 'What would you like to do?',
      addMedicine: 'Add a medicine',
      addMedicineHint: 'Set up a new medicine and when to take it',
      logAsNeeded: 'Log an as-needed dose',
      logAsNeededHint: 'For medicines you take only when needed',
      logPast: 'Log a past dose',
      logPastHint: 'Forgot to log one? Add it afterwards',
    },
    a11y: {
      openProfile: 'Open profile & settings',
      quickAdd: 'Add or log',
      tabBar: 'Main navigation',
    },
  },
  nl: {
    tabs: {
      today: 'Vandaag',
      medicines: 'Medicijnen',
      journal: 'Dagboek',
    },
    quickAdd: {
      title: 'Wat wil je doen?',
      addMedicine: 'Medicijn toevoegen',
      addMedicineHint: 'Stel een nieuw medicijn in en wanneer je het neemt',
      logAsNeeded: 'Dosis naar behoefte vastleggen',
      logAsNeededHint: 'Voor medicijnen die je alleen neemt als het nodig is',
      logPast: 'Eerdere dosis vastleggen',
      logPastHint: 'Vergeten vast te leggen? Voeg het achteraf toe',
    },
    a11y: {
      openProfile: 'Profiel en instellingen openen',
      quickAdd: 'Toevoegen of vastleggen',
      tabBar: 'Hoofdnavigatie',
    },
  },
  tr: {
    tabs: {
      today: 'Bugün',
      medicines: 'İlaçlar',
      journal: 'Günlük',
    },
    quickAdd: {
      title: 'Ne yapmak istersiniz?',
      addMedicine: 'İlaç ekle',
      addMedicineHint: 'Yeni bir ilaç ve ne zaman alınacağını ayarlayın',
      logAsNeeded: 'Gerektiğinde alınan dozu kaydet',
      logAsNeededHint: 'Yalnızca gerektiğinde aldığınız ilaçlar için',
      logPast: 'Geçmiş bir dozu kaydet',
      logPastHint: 'Kaydetmeyi mi unuttunuz? Sonradan ekleyin',
    },
    a11y: {
      openProfile: 'Profili ve ayarları aç',
      quickAdd: 'Ekle veya kaydet',
      tabBar: 'Ana gezinme',
    },
  },
});
