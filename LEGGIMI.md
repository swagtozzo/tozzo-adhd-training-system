# Rimessa in forma

App per il programma di allenamento: giorni, schede esercizio, ritmo guidato, timer di tenute e recupero, note, fastidi, diario e progressi.

Funziona da sola, senza account né server. I dati restano nella memoria del telefono e l'app funziona anche senza connessione.

## Pubblicarla su GitHub Pages (una volta sola, dal computer)

1. Crea un account gratuito su github.com, se non ce l'hai.
2. In alto a destra premi **+** e poi **New repository**. Nome: `allenamento`. Lascialo **Public**, perché GitHub Pages gratuito funziona solo con i repository pubblici. Premi **Create repository**.
3. Nella pagina del repository premi **uploading an existing file**.
4. Trascina nella pagina **tutto il contenuto** di questa cartella: `index.html`, `sw.js`, `manifest.webmanifest`, `LEGGIMI.md` e le cartelle `img`, `fonts` e `icons`. Premi **Commit changes**.
5. Vai in **Settings**, poi **Pages**. Alla voce **Source** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`, e premi **Save**.
6. Dopo uno o due minuti l'app è online su `https://TUONOME.github.io/allenamento/`.

Il codice è pubblico, i tuoi dati no: restano sul telefono.

## Installarla sul Galaxy S26 Ultra

1. Apri l'indirizzo con Chrome.
2. Premi **Installa** nell'avviso dell'app, oppure apri il menu **⋮** e scegli **Aggiungi a schermata Home**, poi **Installa**.
3. Da quel momento la apri dall'icona, a schermo intero, anche offline.

Al primo salvataggio l'app chiede ad Android di proteggere i dati dalla pulizia automatica dello spazio. Con l'app installata di solito lo concede da solo. Lo stato si vede in **Impostazioni**, nella sezione **Dati**.

## Backup

I dati si perdono se disinstalli l'app o cancelli i dati di Chrome. Ogni due settimane vai in **Progressi**, sezione **Backup**:

- **Invia backup** apre la condivisione di Android: puoi salvarlo su Google Drive o mandarlo a te stesso su Telegram.
- **Salva file** lo mette nella cartella Download.
- **Ripristina da file** lo ricarica, anche su un telefono nuovo. Accetta anche il file esportato dalla versione dell'app che stava su Claude.

L'app ti ricorda il backup se sono passate più di due settimane dall'ultimo.

## Aggiornare l'app

Quando sostituisci i file su GitHub, apri `sw.js` e cambia il numero in `const VERSION = "1.0";`, per esempio in `"1.1"`. Alla successiva apertura l'app mostra **Aggiorna ora**. I dati non vengono toccati.

## Licenze

- Immagini degli esercizi: Free Exercise DB, pubblico dominio (github.com/yuhonas/free-exercise-db).
- Caratteri Barlow Condensed e Atkinson Hyperlegible: SIL Open Font License, testi in `fonts/`.
