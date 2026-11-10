import { defineFragment } from './define';

/** App shell: tab bar, headers. Owner: design-system foundation. */
export default defineFragment({
  en: {
    tabs: {
      today: 'Today',
      medicines: 'Medicines',
      journal: 'Journal',
      you: 'Settings',
    },
    a11y: {
      openProfile: 'Open profile & settings',
      tabBar: 'Main navigation',
      profileChip: 'Showing {{name}}. Double tap to switch person',
    },
    people: {
      title: 'Whose medicines?',
    },
  },
  nl: {
    tabs: {
      today: 'Vandaag',
      medicines: 'Medicijnen',
      journal: 'Dagboek',
      you: 'Instellingen',
    },
    a11y: {
      openProfile: 'Profiel en instellingen openen',
      tabBar: 'Hoofdnavigatie',
      profileChip: 'Je ziet {{name}}. Dubbeltik om van persoon te wisselen',
    },
    people: {
      title: 'Wiens medicijnen?',
    },
  },
  tr: {
    tabs: {
      today: 'Bugün',
      medicines: 'İlaçlar',
      journal: 'Günlük',
      you: 'Ayarlar',
    },
    a11y: {
      openProfile: 'Profili ve ayarları aç',
      tabBar: 'Ana gezinme',
      profileChip: '{{name}} gösteriliyor. Kişi değiştirmek için iki kez dokunun',
    },
    people: {
      title: 'Kimin ilaçları?',
    },
  },
});
