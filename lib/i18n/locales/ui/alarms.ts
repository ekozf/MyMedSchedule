import { defineFragment } from './define';

/**
 * Owner: Android 12+ exact alarms ("Alarms & reminders") — the one-time sheet on Today after
 * reminders are allowed, the "On-time reminders" card in Settings › Reminders and Today's
 * "Reminders may arrive late" banner. Use as `i18n.t('ui.alarms.<key>')`.
 */
export default defineFragment({
  en: {
    sheet: {
      title: 'Let reminders arrive on time',
      body: 'Android can delay reminders by several minutes unless the app is allowed to set exact alarms. We only use this for your medicine reminders.',
      allow: 'Allow on-time reminders',
      notNow: 'Not now',
    },
    settings: {
      title: 'On-time reminders',
      on: 'On',
      off: 'Off',
      explainOn: 'Reminders arrive at the exact time.',
      explainOff: 'Android may show reminders a few minutes late.',
      turnOn: 'Turn on',
    },
    banner: {
      title: 'Reminders may arrive late',
      body: "Allow on-time reminders in your phone's settings.",
      fix: 'Fix',
    },
  },
  nl: {
    sheet: {
      title: 'Laat herinneringen op tijd komen',
      body: 'Android kan herinneringen enkele minuten uitstellen, tenzij de app exacte wekkers mag zetten. We gebruiken dit alleen voor je medicijnherinneringen.',
      allow: 'Herinneringen op tijd toestaan',
      notNow: 'Niet nu',
    },
    settings: {
      title: 'Herinneringen op tijd',
      on: 'Aan',
      off: 'Uit',
      explainOn: 'Herinneringen komen precies op tijd.',
      explainOff: 'Android kan herinneringen een paar minuten te laat tonen.',
      turnOn: 'Aanzetten',
    },
    banner: {
      title: 'Herinneringen kunnen te laat komen',
      body: 'Sta herinneringen op tijd toe in de instellingen van je telefoon.',
      fix: 'Oplossen',
    },
  },
  tr: {
    sheet: {
      title: 'Hatırlatmalar zamanında gelsin',
      body: 'Uygulamaya tam zamanlı alarm kurma izni verilmezse Android hatırlatmaları birkaç dakika geciktirebilir. Bu izni yalnızca ilaç hatırlatmalarınız için kullanırız.',
      allow: 'Zamanında hatırlatmalara izin ver',
      notNow: 'Şimdi değil',
    },
    settings: {
      title: 'Zamanında hatırlatmalar',
      on: 'Açık',
      off: 'Kapalı',
      explainOn: 'Hatırlatmalar tam zamanında gelir.',
      explainOff: 'Android hatırlatmaları birkaç dakika geç gösterebilir.',
      turnOn: 'Aç',
    },
    banner: {
      title: 'Hatırlatmalar geç gelebilir',
      body: 'Telefonunuzun ayarlarından zamanında hatırlatmalara izin verin.',
      fix: 'Düzelt',
    },
  },
});
