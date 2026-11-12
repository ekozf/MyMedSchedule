import en from './en';
import { mergeLocale } from './merge';

const trOverrides = {
  medications: {
    nameLabel: 'İlaç Adı',

    // Status
    inactive: 'Aktif Değil',

    scheduleTypes: {
      once_daily: 'Günde Bir Kez',
      multiple_daily: 'Günde Birden Fazla Kez',
      xth_weekday: "Ayın X'inci Günü (Aylık)",
      cycle: 'Döngü (X gün kullan, Y gün ara)',
      every_x_hours: 'Her X Saatte Bir',
      tapering: 'Azaltma (Kademeli Azalma)',
      prn: 'Gerektiğinde',
      daily: 'Günlük',
      every_x_days: 'X Günde Bir',
      specific_weekdays: 'Belirli Haftanın Günleri',
    },

    weekdays: {
      sunday: 'Pazar',
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
    },

    occurrences: {
      first: "1'inci",
      second: "2'nci",
      third: "3'üncü",
      fourth: "4'üncü",
      last: 'Son',
    },

    weekdaysShort: {
      sun: 'Paz',
      mon: 'Pzt',
      tue: 'Sal',
      wed: 'Çar',
      thu: 'Per',
      fri: 'Cum',
      sat: 'Cmt',
    },

    units: {
      g: 'gram',
      mg: 'miligram',
      ml: 'mililitre',
      grams: 'g',
      milligrams: 'mg',
      milliliters: 'ml',
      pills: 'hap',
      puffs: 'puf',
      drops: 'damla',
      patches: 'yama',
      units: 'birim',
    },
  },

  schedule: {
    description: {
      prn: 'Gerektiğinde',
      onceDaily: 'Günde bir kez {{time}} saatinde',
      timesDaily: 'Günde {{count}} kez',
      timesDaily_other: 'Günde {{count}} kez',
      everyXDays: '{{count}} günde bir',
      everyXDays_other: '{{count}} günde bir',
      specificWeekdays: '{{days}} günlerinde',
      xthWeekday: 'Her ayın {{occurrence}} {{weekday}} günü',
      occurrenceNth: '{{n}}.',
      cycle: '{{daysOn}} gün kullan, {{daysOff}} gün ara',
      everyXHours: '{{count}} saatte bir',
      everyXHours_other: '{{count}} saatte bir',
      tapering:
        'Azaltma: {{startDose}} ile başla, her {{decrementIntervalDays}} günde bir {{decrementAmount}} azalt',
      custom: 'Özel program',
      invalid: 'Geçersiz program',
    },
  },

  history: {
    actions: {
      taken: 'Alındı',
      skipped: 'Atlandı',
      partial: 'Kısmi',
    },
  },

  notifications: {
    doseBody: '{{amount}} {{unit}} alma zamanı',
    snoozedBody: 'Hâlâ alınacak: {{amount}} {{unit}}',
    refillTitle: '{{medicine}} azalıyor',
    refillBody: '{{count}} {{unit}} kaldı. Yeni kutu alma zamanı.',
    testTitle: 'Test hatırlatması',
    actions: {
      take: 'Aldım',
      snooze15: '15 dk ertele',
      skip: 'Atla',
    },
  },

  export: {
    reportTitle: 'İlaç raporu',
    reportPeriod: 'Dönem',
    madeOn: '{{date}}, {{time}} tarihinde oluşturuldu',
    medicationsSummary: 'İlaçlar',
    medicine: 'İlaç',
    dosage: 'Doz',
    scheduleType: 'Program',
    statusActive: 'Etkin',
    statusPaused: 'Duraklatıldı',
    notes: 'Not',
    noRecordsFound: 'Bu dönemde kayıt yok.',
    scheduledFor: 'Planlanan',
    actualTime: 'Kaydedilen',
    status: 'Durum',
    amount: 'Miktar',
    notScheduled: 'Planlanmamış',
    late: 'Geç',
    totalRecords: 'Kaydedilen',
    taken: 'Alındı',
    skipped: 'Atlandı',
    partial: 'Kısmen alındı',
    lateIntakes: 'Geç',
    adherenceRate: 'Kaydedilenlerden alınan',
    shareReport: 'İlaç raporunu paylaş',
    saveToFiles: "PDF'yi Dosyalara kaydet",
    savedToFilesApp: 'PDF\'yi kaydetmek için menüden "Dosyalara Kaydet" seçeneğini seçin',
    savedSuccessfully: 'PDF kaydedildi',
    permissionDenied: 'Dosya kaydetme izni reddedildi',
  },
};

export default mergeLocale(en, trOverrides);
