import en from './en';
import { mergeLocale } from './merge';

const nlOverrides = {
  medications: {
    nameLabel: 'Medicijnnaam',

    // Status
    inactive: 'Inactief',

    scheduleTypes: {
      once_daily: 'Eenmaal Dagelijks',
      multiple_daily: 'Meerdere Keren Dagelijks',
      xth_weekday: 'Xe Dag van de Week (Maandelijks)',
      cycle: 'Cyclus (X dagen aan, Y dagen uit)',
      every_x_hours: 'Elke X Uur',
      tapering: 'Afbouwen (Geleidelijke Vermindering)',
      prn: 'Zo Nodig',
      daily: 'Dagelijks',
      every_x_days: 'Elke X Dagen',
      specific_weekdays: 'Specifieke Weekdagen',
    },

    weekdays: {
      sunday: 'Zondag',
      monday: 'Maandag',
      tuesday: 'Dinsdag',
      wednesday: 'Woensdag',
      thursday: 'Donderdag',
      friday: 'Vrijdag',
      saturday: 'Zaterdag',
    },

    occurrences: {
      first: '1e',
      second: '2e',
      third: '3e',
      fourth: '4e',
      last: 'Laatste',
    },

    weekdaysShort: {
      sun: 'Zo',
      mon: 'Ma',
      tue: 'Di',
      wed: 'Wo',
      thu: 'Do',
      fri: 'Vr',
      sat: 'Za',
    },

    units: {
      g: 'gram',
      mg: 'milligram',
      ml: 'milliliter',
      grams: 'g',
      milligrams: 'mg',
      milliliters: 'ml',
      pills: 'pillen',
      puffs: 'pufjes',
      drops: 'druppels',
      patches: 'pleisters',
      units: 'eenheden',
    },
  },

  schedule: {
    description: {
      prn: 'Zo nodig',
      onceDaily: 'Eenmaal per dag om {{time}}',
      timesDaily: '{{count}} keer per dag',
      timesDaily_other: '{{count}} keer per dag',
      everyXDays: 'Elke {{count}} dag',
      everyXDays_other: 'Elke {{count}} dagen',
      specificWeekdays: 'Op {{days}}',
      xthWeekday: '{{occurrence}} {{weekday}} van de maand',
      occurrenceNth: '{{n}}e',
      cycle: '{{daysOn}} dagen aan, {{daysOff}} dagen uit',
      everyXHours: 'Elke {{count}} uur',
      everyXHours_other: 'Elke {{count}} uur',
      tapering:
        'Afbouwen: start {{startDose}}, verlaag met {{decrementAmount}} elke {{decrementIntervalDays}} dagen',
      custom: 'Aangepast schema',
      invalid: 'Ongeldig schema',
    },
  },

  history: {
    actions: {
      taken: 'Ingenomen',
      skipped: 'Overslaan',
      partial: 'Gedeeltelijk',
    },
  },

  notifications: {
    doseBody: 'Tijd om {{amount}} {{unit}} in te nemen',
    snoozedBody: 'Nog in te nemen: {{amount}} {{unit}}',
    refillTitle: '{{medicine}} is bijna op',
    refillBody: 'Nog {{count}} {{unit}}. Tijd voor een nieuwe verpakking.',
    testTitle: 'Testherinnering',
    actions: {
      take: 'Ingenomen',
      snooze15: '15 min uitstellen',
      skip: 'Overslaan',
    },
  },

  export: {
    reportTitle: 'Medicatierapport',
    reportPeriod: 'Periode',
    madeOn: 'Gemaakt op {{date}} om {{time}}',
    medicationsSummary: 'Medicijnen',
    medicine: 'Medicijn',
    dosage: 'Dosis',
    scheduleType: 'Schema',
    statusActive: 'Actief',
    statusPaused: 'Gepauzeerd',
    notes: 'Notitie',
    noRecordsFound: 'Niets genoteerd in deze periode.',
    scheduledFor: 'Gepland voor',
    actualTime: 'Genoteerd om',
    status: 'Status',
    amount: 'Hoeveelheid',
    notScheduled: 'Niet gepland',
    late: 'Te laat',
    totalRecords: 'Genoteerd',
    taken: 'Ingenomen',
    skipped: 'Overgeslagen',
    partial: 'Deels ingenomen',
    lateIntakes: 'Te laat',
    adherenceRate: 'Ingenomen van genoteerd',
    shareReport: 'Medicatierapport delen',
    saveToFiles: 'PDF opslaan in Bestanden',
    savedToFilesApp: 'Kies "Opslaan in Bestanden" in het menu om de PDF op te slaan',
    savedSuccessfully: 'PDF opgeslagen',
    permissionDenied: 'Toestemming om bestand op te slaan geweigerd',
  },
};

export default mergeLocale(en, nlOverrides);
