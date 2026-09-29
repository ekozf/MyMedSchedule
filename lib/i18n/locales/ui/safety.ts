import { defineFragment } from './define';

/** Shared dose-safety + log-error copy used by every logging surface. Owner: lead. */
export default defineFragment({
  en: {
    checkTitle: 'Take a moment',
    maxDailyTitle: 'This goes over your daily limit',
    maxDaily:
      'In the last 24 hours you have taken {{current}}. With this dose it would be {{next}}, and your limit is {{max}}.',
    minHoursTitle: 'Your last dose was recently',
    minHours:
      'You last took it at {{time}}, {{hours}} hours ago. You set at least {{minHours}} hours between doses.',
    takeAnyway: 'Take anyway',
    notEnoughSupplyTitle: 'Not enough left',
    notEnoughSupply:
      'Your supply shows only {{amount}} left. Update your supply first, then log this dose.',
    couldNotSave: 'That could not be saved. Please try again.',
    couldNotDelete: 'That could not be removed. Please try again.',
  },
  nl: {
    checkTitle: 'Even stilstaan',
    maxDailyTitle: 'Dit gaat over je daglimiet',
    maxDaily:
      'In de afgelopen 24 uur heb je {{current}} ingenomen. Met deze dosis wordt dat {{next}}, en je limiet is {{max}}.',
    minHoursTitle: 'Je laatste dosis was kort geleden',
    minHours:
      'Je nam het laatst om {{time}}, {{hours}} uur geleden. Je hebt minstens {{minHours}} uur tussen doses ingesteld.',
    takeAnyway: 'Toch innemen',
    notEnoughSupplyTitle: 'Niet genoeg over',
    notEnoughSupply:
      'Je voorraad toont nog maar {{amount}}. Werk eerst je voorraad bij en registreer daarna deze dosis.',
    couldNotSave: 'Opslaan is niet gelukt. Probeer het opnieuw.',
    couldNotDelete: 'Verwijderen is niet gelukt. Probeer het opnieuw.',
  },
  tr: {
    checkTitle: 'Bir dakika',
    maxDailyTitle: 'Bu, günlük sınırınızı aşıyor',
    maxDaily:
      'Son 24 saatte {{current}} aldınız. Bu dozla birlikte {{next}} olacak; sınırınız {{max}}.',
    minHoursTitle: 'Son dozunuz yakın zamanda alındı',
    minHours:
      'En son {{time}} saatinde, {{hours}} saat önce aldınız. Dozlar arasında en az {{minHours}} saat belirlediniz.',
    takeAnyway: 'Yine de al',
    notEnoughSupplyTitle: 'Yeterli ilaç yok',
    notEnoughSupply:
      'Stokunuzda yalnızca {{amount}} görünüyor. Önce stoğunuzu güncelleyin, sonra bu dozu kaydedin.',
    couldNotSave: 'Kaydedilemedi. Lütfen tekrar deneyin.',
    couldNotDelete: 'Kaldırılamadı. Lütfen tekrar deneyin.',
  },
});
