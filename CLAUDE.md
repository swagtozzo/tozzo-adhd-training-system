# Tozzo Training System

PWA personale di allenamento ("Rimessa in forma"). Pubblicata su GitHub Pages, usata solo dal telefono di Andrea (Galaxy S26 Ultra, Chrome, installata come app).

**Cosa fare** (il programma) si decide in un'altra chat e arriva come file di dati (`data/programma.json`). Qui ci si occupa di **come lo fa l'app**. Le scelte sul programma non si cambiano da qui: si segnalano.

## Chi la usa
- Andrea, 27 anni, 1,85 m, 76 kg. Riparte molto deallenato dopo circa un anno e mezzo sedentario. In passato basket, pesi e corpo libero.
- Obiettivo: tornare muscoloso e definito, ma anche flessibile e in salute. Attenzione alla schiena: ogni sessione ha riscaldamento core e mobilità.
- Si allena a casa, 4 giorni a settimana, circa 75 minuti, alternando parte alta e parte bassa.
- **Ciclo (corretto così, non cambiare `autoPhase`)**: il rientro si fa una volta sola, settimane 1–4. Poi si ripetono all'infinito blocchi di 6 settimane di costruzione + 1 di scarico: costruzione 5–10, scarico 11, costruzione 12–17, scarico 18, e così via. Le durate stanno in `fasi.settimane` di `programma.json`.
- Attrezzatura (profilo "casa" in `programma.json`): sbarra, paralleline, anelli, tappetino, elastici. Niente panca. Bilanciere dritto non olimpionico da 10 kg, dischi 8 × 2 kg e 4 × 1 kg, due impugnature manubrio da 1 kg. L'app ne ricava i massimi: bilanciere 30 kg, manubri 11 kg per mano, 21 kg con uno solo. I dischi vanno spostati tra un esercizio e l'altro.

## Vincoli non negoziabili
- **Indipendente e offline**: niente account, server, API, CDN o dipendenze esterne. Tutto deve funzionare senza connessione.
- **Dati sul telefono**: IndexedDB `DB_NAME = "rimessa-in-forma"` (store `docs`), con ripiego su localStorage `LS_KEY = "rimessa-in-forma-v1"`. Non cambiare chiavi o formato dei dati salvati senza una migrazione.
- **Backup**: "Ripristina da file" deve continuare ad accettare tutti i backup esistenti: formato attuale (`sessioni` come elenco, `impostazioni`, `misure`) e formato vecchio (`sessions` come oggetto, `settings`, `measures`).
- Interfaccia in italiano, pensata per il telefono.
- A ogni modifica pubblicata: aggiorna `VERSION` in `sw.js` (e `APP_VERSION` in `app.js`) e la lista `ASSETS` se aggiungi o rinomini file.
- Il repo è pubblico: non committare mai libri, PDF o archivi (vedi `.gitignore`).

## Struttura
- `index.html`: solo intestazione e markup (testata, viste, barra di recupero, timer guidato, scheda, menu in basso). Carica `app.css` e `app.js`.
- `app.css`: tutti gli stili, con tema chiaro e scuro.
- `app.js`: tutto lo script, uno script classico con variabili globali e senza moduli.
  - helper `h()`/`sv()` per creare il DOM, formattazione date;
  - **programma**: `applyProgram()` e `loadProgram()` leggono `data/programma.json` e riempiono `P` (il file intero), `EX` (con le varianti del profilo attivo già applicate), `DAYS`, `DAY_ORDER`, `CYCLE`, `PH`, `ZONES`, `SIDE_EX`, `ATT` (profilo attivo e carichi massimi), `ATTIVITA`;
  - **stato e salvataggio**: `DEF` (impostazioni predefinite), `S` (stato), `persist()`/`flush()` verso IndexedDB o localStorage;
  - settimane e fasi (`weekNo`, `autoPhase`, `phaseFor`), sessioni (`newSession`, `dayItems`, `entry`, `newSet`);
  - rendering: `renderOggi`, `card`, `setRow`, `renderDiario`, `renderProgressi`, `renderImpost`, scheda esercizio `openSheet`;
  - timer: recupero (`startRest`, `tickRest`) e esecuzione guidata (`startGuide`, `startTempo`, `tickCoach`);
  - backup: `backupJSON`, `prepareImport`, `importConfirm`;
  - avvio: `loadProgram().then(boot)`, poi registrazione del service worker e prompt "Aggiorna ora".
- `data/programma.json`: il programma (schema sotto).
- `sw.js`: cache offline. Precarica `ASSETS` e risponde prima dalla cache. Cambiare `VERSION` crea una cache nuova e fa comparire "Aggiorna ora".
- `manifest.webmanifest`, `icons/`, `fonts/` (Barlow Condensed, Atkinson Hyperlegible, licenza OFL), `img/` (Free Exercise DB, pubblico dominio: `<Nome>-0.jpg` e `<Nome>-1.jpg`).

## Schema di `data/programma.json`
Gli id (chiavi di `esercizi` e `giorni`, e la `key` delle voci) finiscono nei dati salvati e nei backup: **non rinominarli e non toglierli**. Un giorno che sparisce rende illeggibili le sue sessioni nei backup, perché il ripristino scarta le sessioni di giorni sconosciuti. Per cambiare un esercizio, aggiungine uno con un id nuovo.

- `esercizi`: `{ id: esercizio }`
  - `name`, `type`: `reps` (ripetizioni), `holds` (tenute contate), `hold` (una tenuta in secondi), `time` (minuti), `carry` (camminata con peso);
  - `load`: `kg`, `extra` (zavorra) o `none`. `db: true` = manubri (`manubri: 1` facoltativo se ne usa uno solo, per il limite di carico), `side: true` = un lato alla volta, `iso: true` = isolamento (cambia la riserva);
  - `varianti` (facoltativo): `{ profilo: { campi da sostituire } }`. Con quel profilo attivo i campi della variante sostituiscono quelli base, e `info` si unisce campo per campo. Esempio: `"varianti": { "palestra": { "name": "Distensioni su panca", "info": { "pos": "…" } } }`. L'id dell'esercizio resta lo stesso, quindi lo storico non si spezza;
  - `img`: nome del file in `img/` senza `-0.jpg`, oppure `null`. `imgNote` facoltativa;
  - `yt`: ricerca YouTube. `tempo`: fasi del ritmo guidato, `[["Giù", 3], ["Su", 1.5]]`;
  - `etichettaTimer` (facoltativo, solo `type: "time"`): parola grande mostrata dal timer guidato, ad esempio `"Cammina"`. Se manca compare "Vai";
  - `info`: `lead`, `mus`, `pos`, `ese`, `resp`, `senti`, `no`, `extra` (elenco di `[titolo, testo]`).
- `tenutePerLato`: esercizi di tipo `hold` da fare su entrambi i lati.
- `blocchi`: `{ nome: [voce, ...] }`, cioè riscaldamenti e mobilità riusati in più giorni.
- `giorni`: `{ id: { label, short, tag, program?, lower?, back?, minimum?, sections: [{ t, note?, items }] } }`
  - `program`: conta come giorno del ciclo, con fasi e riserva;
  - `lower`: giorno di parte bassa, per l'avviso schiena;
  - `minimum`: piano minimo.
  - `items` contiene voci oppure `{ "blocco": "nome" }`.
- **voce**: `{ ex, sets, spec, rest, key?, main?, heavy?, note? }`
  - `spec`: `{lo, hi}` per reps, hold, time e carry; per holds `{ n, secs, side? }`, dove `n` è un numero o un elenco per serie e `side` vale `"alt"` o `"block"`;
  - `rest`: secondi di recupero;
  - `key`: serve solo se lo stesso esercizio compare due volte (es. `aperture-risc`). Le key che contengono `risc` o iniziano con `f1-` sono etichettate in Progressi;
  - `main`: esercizio di lavoro, con riserva, suggerimenti e serie ridotte per fase.
- `ordineGiorni`: ordine dei bottoni. `ciclo`: rotazione dei giorni consigliati.
- `fasi`:
  - `nomi`;
  - `settimane` `{rientro, costruzione, scarico}`: dopo il rientro si ripetono costruzione e scarico;
  - `serie` `{ fase: { meno?, frazione? } }`: serie in meno o frazione, arrotondata per eccesso, per le voci `main` dei giorni `program`;
  - `sottotitolo`, `descrizione`.
- `riserva`: `pianoMinimo`, `fasi.{fase}.{base, isolamento}`, `esercizi.{id}.{fase}` per eccezioni come lo stacco.
- `sostituzioni`: `[{ giorno, ex, fase?, finoSettimana?, con: voce }]`, cioè quando sostituire una voce (oggi: dip → tenuta agli anelli nelle settimane 1–2).
- `schiena`: `{ soglia, giorno }`. Con fastidio ≥ soglia in un giorno `lower` l'app propone di passare a quel giorno.
- `zone`: zone del fastidio a fine sessione.
- `attrezzatura`: `{ profiloAttivo, profili: { id: profilo } }`. Oggi c'è solo `casa`; in futuro, ad esempio, `palestra`. Un profilo contiene:
  - `nome`;
  - `bilanciere: { peso }` (assente = niente bilanciere);
  - `dischi: [{ kg, quantita }]`;
  - `impugnatureManubrio: { peso, quantita }`;
  - `panca` (true/false);
  - `altro`: elenco libero.

  I massimi si calcolano così: impugnatura + 2 × (per ogni tipo di disco, kg × quantità divisa in parti uguali tra i lati dei bilancieri o manubri caricati insieme, arrotondata per difetto). Quindi `ATT.maxBilanciere`, `ATT.maxManubri` (per mano, con due manubri) e `ATT.maxManubrioSingolo`. Con le serie chiuse al massimo delle ripetizioni a quel carico, l'app suggerisce di rallentare invece di aumentare il peso. Il carico registrato è il totale del bilanciere, o il peso di un manubrio. `panca` per ora viene solo letto.
- `attivita`: `[{ id, nome, giorni: ["lun"…"dom"], durataMin, note? }]`, cioè attività della settimana che non sono pesi (pugilato, camminate…), senza serie né carichi. Per ora vengono caricate e controllate (`ATTIVITA`) ma non mostrate: l'interfaccia è da fare.

All'avvio l'app controlla che esercizi, blocchi, giorni, fasi, profilo di attrezzatura e attività siano coerenti. Se il file è rotto mostra un messaggio e non tocca i dati.

Per aggiungere in futuro un profilo palestra: aggiungi il profilo in `attrezzatura.profili`, le `varianti.palestra` agli esercizi che cambiano e cambia `profiloAttivo`. Servirà poi un selettore nelle Impostazioni, salvato in `S.settings` con un campo nuovo e un valore predefinito in `DEF`, così i dati vecchi restano validi.

## Provarla in locale
```bash
python -m http.server 8000
```
Poi apri `http://localhost:8000/`. Su `localhost` il service worker si registra, quindi si possono provare offline e aggiornamenti.

Per verifiche serie usa Playwright con viewport da telefono (412 × 915) e orologio fisso. Controlla:
- tutte le viste e tutti i giorni;
- scheda esercizio, recupero e timer guidato;
- diario, progressi, misure;
- backup: export, import del formato nuovo e vecchio;
- offline (`context.setOffline`) e "Aggiorna ora": servire `sw.js` con una `VERSION` diversa e chiamare `registration.update()`.

Confronta gli screenshot prima e dopo una modifica. Nota: al primissimo avvio l'app si ricarica una volta da sola quando il service worker prende il controllo.

## Rilascio
1. Lavora su un branch, commit piccoli. Push solo su richiesta di Andrea.
2. Aggiorna `VERSION` in `sw.js` e `APP_VERSION` in `app.js`. Se aggiungi o rinomini file (immagini comprese), aggiorna `ASSETS`.
3. Anche una modifica al solo `data/programma.json` richiede di cambiare `VERSION`: altrimenti il telefono continua a usare la copia in cache.
4. Dopo il merge su `main`, GitHub Pages pubblica. Sul telefono compare "Aggiorna ora".

## Seconda app: Allenamento a casa (`casa/`)
È l'app che Andrea usa adesso per la fase di riavvicinamento con l'attrezzatura di casa. È nata come artefatto ed è pubblicata come PWA separata su `…/casa/`.
- `casa/index.html`: un solo file con CSS, markup e script. Le immagini degli esercizi stanno inline in base64 (`IM`), i disegni SVG animati in `DRAW`. Tutto il programma (EX, DAYS, WARM, STRETCH, TESTS) è nel codice.
- Logica principale:
  - `prescribe()`: doppia progressione con il voto dell'ultima serie (facile, ok, duro), poi +2 kg, discesa lenta o livello successivo;
  - `phase()`: cicli da 5 settimane, con le ripetizioni in canna per settimana (`RIRT`), lo scarico e le domande di fine ciclo;
  - seduta Test, misure, backup.
- Dati: localStorage `casa-allenamento-v1`, l'intero stato `S`. Il backup è `JSON.stringify(S)` e si ripristina incollando il testo o caricando un file. **Non cambiare chiave né formato**: Andrea ripristina backup copiati dall'artefatto.
- `casa/sw.js`:
  - scope `/casa/` e cache `casa-allenamento-<VERSION>`, che non tocca l'app principale né le sue cache `rimessa-in-forma-*` (e viceversa);
  - precarica anche i font e le icone condivisi in `../fonts/` e `../icons/`;
  - si aggiorna con `skipWaiting`: la versione nuova si usa dalla riapertura successiva, non c'è un prompt "Aggiorna ora".
- `casa/manifest.webmanifest`: senza `id`, così l'id dell'app è `/casa/`, diverso da quello dell'app principale. Con `"id": "./"` le due app risulterebbero la stessa.
- Rilascio: cambia `VERSION` in `casa/sw.js`, e `ASSETS` se aggiungi file.
- Il service worker dell'app principale (scope radice) copre anche `/casa/`, ma le pagine di `casa/` sono controllate da quello più specifico. Non mettere file di `casa/` negli `ASSETS` principali.

## Libri di riferimento
In `testi fitness/` (solo in locale, ignorata da git) ci sono libri su allenamento, schiena (McGill), mobilità e nutrizione. Per informazioni tecniche su esercizi, schiena o nutrizione puoi cercarvi dentro, ma **solo quando serve** e **senza mai committarli** né copiarne parti nel repo.
