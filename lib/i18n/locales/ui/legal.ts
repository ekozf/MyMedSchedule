import { defineFragment } from './define';

/**
 * Owner: Settings › About › "Your data and privacy" and "Terms of use"
 * (app/settings/privacy.tsx, app/settings/terms.tsx).
 *
 * Section bodies: paragraphs separated by a blank line; lines starting with "• " are bullets
 * (parsed by components/legal/legal-text.ts). Section order lives in the screens.
 *
 * Privacy: every claim must match the code (release build has no INTERNET permission,
 * android:allowBackup=false, SQLCipher with a random 256-bit key in SecureStore, salted PIN hash,
 * auto-lock after 60 s, PIN rate limit, photos as plain files in app-private storage, reminder
 * text in the OS notification store). Re-check when any of that changes.
 *
 * Terms: NOT LEGAL ADVICE — have reviewed by a lawyer before launch.
 */
export default defineFragment({
  en: {
    updated: 'Last updated {{date}} · Version {{version}}',
    privacy: {
      title: 'Your data and privacy',
      subtitle: 'In short: everything stays on this phone. Nobody else sees it, including us.',
      fullPolicy: 'Full privacy policy',
      sections: {
        onPhone: {
          title: 'Everything stays on this phone',
          body: "MyMedSchedule works without an account. The version from the Play Store can't connect to the internet at all.\n\n• No ads\n• No analytics or tracking\n• No crash reports\n• The developer never receives any of your data",
        },
        stored: {
          title: 'What the app keeps',
          body: '• Names and photos of the people you add\n• Your medicines: name, strength, dose, schedule, supply, expiry date, notes and photo\n• The journal of doses taken and skipped\n• Your settings, such as language and parts of the day\n• When you agreed to "Before you start", with your phone\'s model and Android version\n\nThis is only used to make the app work on this phone.',
        },
        protected: {
          title: 'How it is protected',
          body: "• Your medicines, journal and people are kept in an encrypted database (SQLCipher). Its key is a random 256-bit key, kept in Android's secure key storage.\n• Your PIN is never stored. The app only keeps a scrambled version (a salted hash) to check it.\n• With the app lock on, the app locks itself after about a minute in the background.\n• After several wrong PINs, the app makes you wait before you can try again.\n• Fingerprint and face unlock are handled by your phone. The app never sees your fingerprint or face.",
        },
        limits: {
          title: 'What this protection can’t do',
          body: "• The encryption key belongs to this phone, not to your PIN. Someone who has your unlocked phone and can open the app can see your data. Use the app lock if others use your phone.\n• Photos are kept as normal files in the app's private storage, outside the encrypted database.\n• Reminders show the medicine's name and dose. Depending on your phone's notification settings, they can also show on the lock screen.\n• Exported PDF reports are not encrypted. Once you save or share one, it is outside the app's control.",
        },
        backups: {
          title: 'No backups',
          body: "Android backup is turned off for this app, so nothing is copied to Google or to a new phone. Nothing is backed up anywhere.\n\nIf you lose your phone or uninstall the app, the data is gone. An exported PDF report is not a backup: it can't be read back into the app.",
        },
        permissions: {
          title: 'What the app asks for, and why',
          body: '• Camera: only if you want to take a photo of a medicine or a person.\n• Notifications: to show your reminders.\n• Alarms and reminders: so reminders arrive on time.\n• Fingerprint or face: only if you turn on the app lock.\n• Run at startup: to set your reminders again after the phone restarts.\n• Vibration: so a reminder can buzz.\n\nWhen you pick a photo from your gallery, the app only gets the photo you choose.',
        },
        control: {
          title: 'You are in control',
          body: '• Delete a medicine, a journal entry or a person at any time.\n• Settings › Your data › Delete everything removes all data from this phone.\n• Uninstalling the app also removes everything.',
        },
        contact: {
          title: 'Questions?',
          body: "Email {{email}}. If you write to us, we only see what you put in your email. Please don't include medical details unless you want to.",
        },
      },
    },
    // NOT LEGAL ADVICE — have reviewed by a lawyer before launch.
    terms: {
      title: 'Terms of use',
      subtitle: 'The rules for using MyMedSchedule, in plain language.',
      readPrivacy: 'Your data and privacy',
      readLicenses: 'Open-source licences',
      fullTerms: 'Full terms of use',
      sections: {
        provider: {
          title: 'Who provides the app',
          body: 'MyMedSchedule is made and provided by {{publisher}}, Belgium. Contact: {{email}}.',
        },
        whatItIs: {
          title: 'What the app is',
          body: "MyMedSchedule is a reminder and a diary for your medicines. It is not a medical device and it doesn't give medical advice.\n\n• It doesn't check whether medicines can be combined, or whether a dose is right for you.\n• Limits you set (such as a maximum per day) only show a warning. They never stop you.\n• You are responsible for what you enter and what you take. Always follow your doctor, your pharmacist and the package leaflet.",
        },
        reminders: {
          title: 'Reminders can be late or missing',
          body: 'Your phone decides when a reminder is shown. Reminders can come late, or not at all, because of phone settings, battery saving, clock or time zone changes, or when the "Alarms and reminders" permission is off.\n\nNever rely on this app as your only reminder for medicines where a missed or late dose could be serious.',
        },
        free: {
          title: 'Free of charge',
          body: 'The app is free. There are no purchases, subscriptions or ads.',
        },
        asIs: {
          title: 'No guarantees',
          body: 'The app is provided "as is". As far as the law allows, there are no guarantees that it works without errors or interruptions, or that it suits your needs.',
        },
        liability: {
          title: 'Liability',
          body: "As far as the law allows, {{publisher}} is not liable for damage caused by using the app or by not being able to use it, such as a missed or wrong dose or lost data.\n\nThis does not limit liability that can't be excluded under Belgian or EU law, such as for intent or gross negligence, and it doesn't affect your rights as a consumer.",
        },
        data: {
          title: 'Your data',
          body: 'Your data stays on your phone. We don\'t receive it. Read more in "Your data and privacy".',
        },
        openSource: {
          title: 'Open-source software',
          body: 'The app is built with open-source software. Those parts are covered by their own licences, listed under "Open-source licences".',
        },
        changes: {
          title: 'Changes to these terms',
          body: 'We may update these terms, for example when the app changes. The new version is shown in the app. If you keep using the app after a change, you accept the new terms.',
        },
        law: {
          title: 'Which law applies',
          body: 'Belgian law applies. Disputes go to the court that the law designates. If you are a consumer, you keep the protection of the law of the country where you live and you can go to the courts there.',
        },
      },
    },
  },
  nl: {
    updated: 'Laatst bijgewerkt op {{date}} · Versie {{version}}',
    privacy: {
      title: 'Je gegevens en privacy',
      subtitle:
        'Kort gezegd: alles blijft op deze telefoon. Niemand anders ziet het, ook wij niet.',
      fullPolicy: 'Volledig privacybeleid',
      sections: {
        onPhone: {
          title: 'Alles blijft op deze telefoon',
          body: 'MyMedSchedule werkt zonder account. De versie uit de Play Store kan helemaal geen verbinding maken met internet.\n\n• Geen advertenties\n• Geen statistieken of tracking\n• Geen crashrapporten\n• De ontwikkelaar ontvangt nooit iets van je gegevens',
        },
        stored: {
          title: 'Wat de app bewaart',
          body: '• Namen en foto\'s van de personen die je toevoegt\n• Je medicijnen: naam, sterkte, dosis, schema, voorraad, vervaldatum, notities en foto\n• Het dagboek van ingenomen en overgeslagen doses\n• Je instellingen, zoals taal en dagdelen\n• Wanneer je akkoord ging met "Voor je begint", met het model van je telefoon en je Android-versie\n\nDit wordt alleen gebruikt om de app op deze telefoon te laten werken.',
        },
        protected: {
          title: 'Hoe het beveiligd is',
          body: '• Je medicijnen, dagboek en personen staan in een versleutelde database (SQLCipher). De sleutel is een willekeurige sleutel van 256 bits, bewaard in de beveiligde sleutelopslag van Android.\n• Je pincode wordt nooit opgeslagen. De app bewaart alleen een versleutelde vorm (een gezouten hash) om hem te controleren.\n• Met de app-vergrendeling aan vergrendelt de app zichzelf na ongeveer een minuut op de achtergrond.\n• Na een paar foute pincodes moet je even wachten voor je het opnieuw kunt proberen.\n• Ontgrendelen met vingerafdruk of gezicht regelt je telefoon. De app ziet je vingerafdruk of gezicht nooit.',
        },
        limits: {
          title: 'Wat deze beveiliging niet kan',
          body: "• De sleutel hoort bij deze telefoon, niet bij je pincode. Iemand die je ontgrendelde telefoon heeft en de app kan openen, kan je gegevens zien. Gebruik de app-vergrendeling als anderen je telefoon gebruiken.\n• Foto's staan als gewone bestanden in de privé-opslag van de app, buiten de versleutelde database.\n• Herinneringen tonen de naam en de dosis van het medicijn. Afhankelijk van de meldingsinstellingen van je telefoon kunnen ze ook op het vergrendelscherm verschijnen.\n• Geëxporteerde pdf-rapporten zijn niet versleuteld. Zodra je er een bewaart of deelt, heeft de app er geen controle meer over.",
        },
        backups: {
          title: 'Geen back-ups',
          body: 'Android-back-up staat uit voor deze app. Er wordt dus niets gekopieerd naar Google of naar een nieuwe telefoon. Er wordt nergens een back-up van gemaakt.\n\nAls je je telefoon verliest of de app verwijdert, zijn de gegevens weg. Een geëxporteerd pdf-rapport is geen back-up: je kunt het niet terugzetten in de app.',
        },
        permissions: {
          title: 'Wat de app vraagt, en waarom',
          body: '• Camera: alleen als je een foto van een medicijn of persoon wilt maken.\n• Meldingen: om je herinneringen te tonen.\n• Wekkers en herinneringen: zodat herinneringen op tijd komen.\n• Vingerafdruk of gezicht: alleen als je de app-vergrendeling aanzet.\n• Uitvoeren bij opstarten: om je herinneringen opnieuw in te stellen nadat de telefoon opnieuw is opgestart.\n• Trillen: zodat een herinnering kan trillen.\n\nAls je een foto uit je galerij kiest, krijgt de app alleen de foto die je kiest.',
        },
        control: {
          title: 'Jij beslist',
          body: '• Verwijder op elk moment een medicijn, een dagboekregel of een persoon.\n• Instellingen › Je gegevens › Alles verwijderen wist alle gegevens van deze telefoon.\n• Als je de app verwijdert, is ook alles weg.',
        },
        contact: {
          title: 'Vragen?',
          body: 'Mail naar {{email}}. Als je ons schrijft, zien we alleen wat je in je mail zet. Zet er liever geen medische gegevens in, tenzij je dat zelf wilt.',
        },
      },
    },
    // NOT LEGAL ADVICE — have reviewed by a lawyer before launch.
    terms: {
      title: 'Gebruiksvoorwaarden',
      subtitle: 'De regels voor het gebruik van MyMedSchedule, in gewone taal.',
      readPrivacy: 'Je gegevens en privacy',
      readLicenses: 'Opensourcelicenties',
      fullTerms: 'Volledige gebruiksvoorwaarden',
      sections: {
        provider: {
          title: 'Wie de app aanbiedt',
          body: 'MyMedSchedule wordt gemaakt en aangeboden door {{publisher}}, België. Contact: {{email}}.',
        },
        whatItIs: {
          title: 'Wat de app is',
          body: 'MyMedSchedule is een herinnering en een dagboek voor je medicijnen. Het is geen medisch hulpmiddel en geeft geen medisch advies.\n\n• De app controleert niet of medicijnen samen mogen, of dat een dosis bij jou past.\n• Grenzen die je instelt (zoals een maximum per dag) tonen alleen een waarschuwing. Ze houden je nooit tegen.\n• Je bent zelf verantwoordelijk voor wat je invult en wat je inneemt. Volg altijd je arts, je apotheker en de bijsluiter.',
        },
        reminders: {
          title: 'Herinneringen kunnen te laat komen of wegblijven',
          body: 'Je telefoon bepaalt wanneer een herinnering verschijnt. Herinneringen kunnen te laat of helemaal niet komen door instellingen van je telefoon, batterijbesparing, een andere tijd of tijdzone, of als de toestemming "Wekkers en herinneringen" uit staat.\n\nVertrouw nooit alleen op deze app voor medicijnen waarbij een gemiste of late dosis ernstig kan zijn.',
        },
        free: {
          title: 'Gratis',
          body: 'De app is gratis. Er zijn geen aankopen, abonnementen of advertenties.',
        },
        asIs: {
          title: 'Geen garanties',
          body: 'De app wordt aangeboden "zoals hij is". Voor zover de wet het toelaat, is er geen garantie dat hij zonder fouten of onderbrekingen werkt, of dat hij bij jouw behoeften past.',
        },
        liability: {
          title: 'Aansprakelijkheid',
          body: 'Voor zover de wet het toelaat, is {{publisher}} niet aansprakelijk voor schade door het gebruik van de app of doordat je hem niet kon gebruiken, zoals een gemiste of verkeerde dosis of verloren gegevens.\n\nDit beperkt geen aansprakelijkheid die volgens Belgisch of Europees recht niet uitgesloten kan worden, zoals bij opzet of grove fout, en het raakt niet aan je rechten als consument.',
        },
        data: {
          title: 'Je gegevens',
          body: 'Je gegevens blijven op je telefoon. Wij ontvangen ze niet. Lees meer in "Je gegevens en privacy".',
        },
        openSource: {
          title: 'Opensourcesoftware',
          body: 'De app is gemaakt met opensourcesoftware. Die onderdelen vallen onder hun eigen licenties, te vinden onder "Opensourcelicenties".',
        },
        changes: {
          title: 'Wijzigingen in deze voorwaarden',
          body: 'We kunnen deze voorwaarden aanpassen, bijvoorbeeld als de app verandert. De nieuwe versie wordt in de app getoond. Als je de app na een wijziging blijft gebruiken, aanvaard je de nieuwe voorwaarden.',
        },
        law: {
          title: 'Welk recht geldt',
          body: 'Het Belgische recht is van toepassing. Geschillen gaan naar de rechtbank die de wet aanwijst. Als consument behoud je de bescherming van het recht van het land waar je woont en kun je ook daar naar de rechter stappen.',
        },
      },
    },
  },
  tr: {
    updated: 'Son güncelleme {{date}} · Sürüm {{version}}',
    privacy: {
      title: 'Verileriniz ve gizlilik',
      subtitle: 'Kısacası: her şey bu telefonda kalır. Biz dahil kimse göremez.',
      fullPolicy: 'Gizlilik politikasının tamamı',
      sections: {
        onPhone: {
          title: 'Her şey bu telefonda kalır',
          body: "MyMedSchedule hesap olmadan çalışır. Play Store'daki sürüm internete hiç bağlanamaz.\n\n• Reklam yok\n• Analiz veya takip yok\n• Çökme raporu yok\n• Geliştirici verilerinizin hiçbirini almaz",
        },
        stored: {
          title: 'Uygulama neleri saklar',
          body: '• Eklediğiniz kişilerin adları ve fotoğrafları\n• İlaçlarınız: ad, doz miktarı, alınacak miktar, program, stok, son kullanma tarihi, notlar ve fotoğraf\n• Alınan ve atlanan dozların günlüğü\n• Dil ve gün bölümleri gibi ayarlarınız\n• "Başlamadan önce" metnini ne zaman kabul ettiğiniz, telefonunuzun modeli ve Android sürümüyle birlikte\n\nBunlar yalnızca uygulamanın bu telefonda çalışması için kullanılır.',
        },
        protected: {
          title: 'Nasıl korunur',
          body: "• İlaçlarınız, günlüğünüz ve kişiler şifreli bir veritabanında (SQLCipher) saklanır. Anahtarı rastgele oluşturulmuş 256 bitlik bir anahtardır ve Android'in güvenli anahtar deposunda tutulur.\n• PIN'iniz hiçbir zaman saklanmaz. Uygulama, onu kontrol etmek için yalnızca karıştırılmış bir biçimini (tuzlanmış bir hash) tutar.\n• Uygulama kilidi açıksa, uygulama arka planda yaklaşık bir dakika kaldıktan sonra kendini kilitler.\n• Birkaç yanlış PIN'den sonra tekrar denemeden önce biraz beklemeniz gerekir.\n• Parmak izi ve yüz tanıma telefonunuz tarafından yapılır. Uygulama parmak izinizi veya yüzünüzü hiçbir zaman görmez.",
        },
        limits: {
          title: 'Bu korumanın yapamadıkları',
          body: "• Şifreleme anahtarı PIN'inize değil, bu telefona bağlıdır. Kilidi açık telefonunuza sahip olan ve uygulamayı açabilen biri verilerinizi görebilir. Telefonunuzu başkaları da kullanıyorsa uygulama kilidini kullanın.\n• Fotoğraflar, şifreli veritabanının dışında, uygulamanın özel depolama alanında normal dosyalar olarak saklanır.\n• Hatırlatıcılar ilacın adını ve dozunu gösterir. Telefonunuzun bildirim ayarlarına bağlı olarak kilit ekranında da görünebilirler.\n• Dışa aktarılan PDF raporları şifreli değildir. Bir raporu kaydettiğiniz veya paylaştığınız anda uygulamanın kontrolünden çıkar.",
        },
        backups: {
          title: 'Yedekleme yok',
          body: "Bu uygulama için Android yedeklemesi kapalıdır; yani hiçbir şey Google'a veya yeni bir telefona kopyalanmaz. Hiçbir yerde yedek alınmaz.\n\nTelefonunuzu kaybederseniz veya uygulamayı kaldırırsanız veriler silinir. Dışa aktarılan bir PDF raporu yedek değildir: uygulamaya geri yüklenemez.",
        },
        permissions: {
          title: 'Uygulama neler ister ve neden',
          body: '• Kamera: yalnızca bir ilacın veya kişinin fotoğrafını çekmek isterseniz.\n• Bildirimler: hatırlatıcılarınızı göstermek için.\n• Alarmlar ve hatırlatıcılar: hatırlatıcıların zamanında gelmesi için.\n• Parmak izi veya yüz: yalnızca uygulama kilidini açarsanız.\n• Başlangıçta çalışma: telefon yeniden başladıktan sonra hatırlatıcılarınızı yeniden kurmak için.\n• Titreşim: hatırlatıcının titreyebilmesi için.\n\nGalerinizden fotoğraf seçtiğinizde uygulama yalnızca seçtiğiniz fotoğrafı alır.',
        },
        control: {
          title: 'Kontrol sizde',
          body: '• Bir ilacı, bir günlük kaydını veya bir kişiyi istediğiniz zaman silin.\n• Ayarlar › Verileriniz › Her şeyi sil, bu telefondaki tüm verileri kaldırır.\n• Uygulamayı kaldırmak da her şeyi siler.',
        },
        contact: {
          title: 'Sorularınız mı var?',
          body: '{{email}} adresine e-posta gönderin. Bize yazarsanız yalnızca e-postanıza yazdıklarınızı görürüz. İstemediğiniz sürece sağlık bilgilerinizi eklemeyin.',
        },
      },
    },
    // NOT LEGAL ADVICE — have reviewed by a lawyer before launch.
    terms: {
      title: 'Kullanım koşulları',
      subtitle: 'MyMedSchedule kullanım kuralları, sade bir dille.',
      readPrivacy: 'Verileriniz ve gizlilik',
      readLicenses: 'Açık kaynak lisansları',
      fullTerms: 'Kullanım koşullarının tamamı',
      sections: {
        provider: {
          title: 'Uygulamayı kim sunuyor',
          body: 'MyMedSchedule, {{publisher}} (Belçika) tarafından geliştirilir ve sunulur. İletişim: {{email}}.',
        },
        whatItIs: {
          title: 'Uygulama nedir',
          body: 'MyMedSchedule, ilaçlarınız için bir hatırlatıcı ve günlüktür. Tıbbi bir cihaz değildir ve tıbbi tavsiye vermez.\n\n• İlaçların birlikte kullanılıp kullanılamayacağını veya bir dozun size uygun olup olmadığını kontrol etmez.\n• Belirlediğiniz sınırlar (örneğin günlük en fazla miktar) yalnızca uyarı gösterir. Sizi asla engellemez.\n• Girdiğiniz bilgilerden ve aldığınız ilaçlardan siz sorumlusunuz. Her zaman doktorunuza, eczacınıza ve prospektüse uyun.',
        },
        reminders: {
          title: 'Hatırlatıcılar gecikebilir veya gelmeyebilir',
          body: 'Hatırlatıcının ne zaman gösterileceğine telefonunuz karar verir. Telefon ayarları, pil tasarrufu, saat veya saat dilimi değişiklikleri ya da "Alarmlar ve hatırlatıcılar" izninin kapalı olması nedeniyle hatırlatıcılar gecikebilir veya hiç gelmeyebilir.\n\nKaçırılan veya geciken bir dozun ciddi sonuçlar doğurabileceği ilaçlar için asla tek hatırlatıcınız olarak bu uygulamaya güvenmeyin.',
        },
        free: {
          title: 'Ücretsiz',
          body: 'Uygulama ücretsizdir. Satın alma, abonelik veya reklam yoktur.',
        },
        asIs: {
          title: 'Garanti yok',
          body: 'Uygulama "olduğu gibi" sunulur. Yasaların izin verdiği ölçüde, hatasız veya kesintisiz çalışacağına ya da ihtiyaçlarınıza uygun olacağına dair hiçbir garanti verilmez.',
        },
        liability: {
          title: 'Sorumluluk',
          body: '{{publisher}}, yasaların izin verdiği ölçüde, uygulamanın kullanılmasından veya kullanılamamasından doğan zararlardan (örneğin kaçırılan ya da yanlış bir doz veya kaybolan veriler) sorumlu değildir.\n\nBu, Belçika veya AB hukukuna göre hariç tutulamayan sorumluluğu (örneğin kasıt veya ağır ihmal) sınırlamaz ve tüketici olarak sahip olduğunuz hakları etkilemez.',
        },
        data: {
          title: 'Verileriniz',
          body: 'Verileriniz telefonunuzda kalır. Biz onları almayız. Ayrıntılar için "Verileriniz ve gizlilik" bölümüne bakın.',
        },
        openSource: {
          title: 'Açık kaynak yazılım',
          body: 'Uygulama açık kaynak yazılımlarla geliştirilmiştir. Bu bölümler kendi lisanslarına tabidir; "Açık kaynak lisansları" bölümünde listelenmiştir.',
        },
        changes: {
          title: 'Bu koşullardaki değişiklikler',
          body: 'Bu koşulları, örneğin uygulama değiştiğinde, güncelleyebiliriz. Yeni sürüm uygulamada gösterilir. Bir değişiklikten sonra uygulamayı kullanmaya devam ederseniz yeni koşulları kabul etmiş olursunuz.',
        },
        law: {
          title: 'Hangi hukuk geçerlidir',
          body: 'Belçika hukuku geçerlidir. Uyuşmazlıklar, yasanın belirlediği mahkemede görülür. Tüketiciyseniz, yaşadığınız ülkenin hukukunun sağladığı korumayı korursunuz ve oradaki mahkemelere de başvurabilirsiniz.',
        },
      },
    },
  },
});
