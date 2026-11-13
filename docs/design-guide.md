# Sottomano – Guida per lo sviluppo (copia dell'11 novembre 2026)

Fonte: https://claude.ai/artifact/GA4emjzXUyz45mpreYFXV5 · Tavola di design: https://claude.ai/artifact/V3VCy8gn2oRjjDo8Pu9zAc

## Panoramica

Sottomano è un'app per iPhone e Android che archivia i documenti di casa, le tessere e le scadenze. Tutto resta sul telefono e funziona senza internet. Le schermate di riferimento sono sulla [tavola di design](https://claude.ai/artifact/V3VCy8gn2oRjjDo8Pu9zAc).

**Decisioni di prodotto prese**

| Tema | Decisione |
|---|---|
| Account | Nessun account e nessun server. L'app si usa subito dopo il benvenuto. |
| Connessione | Funziona interamente senza internet. |
| Backup | File creato sul telefono (app File / archivio Android), ripristinabile su un nuovo telefono. Promemoria periodico per farlo. |
| Famiglia | Profili locali per ogni persona di casa, sullo stesso telefono. Nessuna condivisione automatica: per mandare un documento si usa Invia. |
| Prezzo | Gratis fino a 7 elementi in tutto (documenti + tessere). Sblocco senza limiti con un acquisto unico da 0,99 €, nessun abbonamento. |
| Limite raggiunto | Si può ancora consultare, inviare, mostrare le tessere e ricevere promemoria. Si blocca solo l'aggiunta di nuovi elementi. |
| Lingua | Italiano. |

**Funzioni principali:** archivio a cartelle colorate, preferiti, scadenze con calendario e promemoria, tessere con codice a barre o QR code, profili della famiglia, ricerca, invio (email, WhatsApp, stampa, file), widget e notifiche.

## Fondamenta grafiche

Fondo bianco, schede bianche con ombra leggera, una sfumatura indaco-lilla per le azioni principali e un colore pastello per ogni cartella.

**Colori di base**

| Nome | Valore | Uso |
|---|---|---|
| Sfondo | #FFFFFF | Sfondo di tutte le schermate |
| Inchiostro | #1C1E2E | Testo principale, icone |
| Testo secondario | #6A6D80 | Sottotitoli, etichette, date |
| Testo su lilla chiaro | #4B4E63 | Note e spiegazioni su fondo #F7F6FE |
| Accento (link, attivo) | #3B4FE0 | Link, voce attiva del menu, "Vedi tutto" |
| Indaco testo | #4A3FD9 | Icone e testi su lilla chiaro |
| Lilla chiaro | #F1EFFD | Pulsanti tondi, campi, filtri non attivi |
| Lilla chiarissimo | #F7F6FE | Riquadri informativi, avvisi |
| Separatore | #EEF0F5 | Linee tra le righe delle schede |
| Interruttore spento | #D6D8E4 | Binario degli interruttori disattivati |
| Errore / cancella | #B42318 su #FDECEC | Testo e fondo delle azioni distruttive, "Da pagare" |
| Pulsante cancella | #D92D20 | Pulsante pieno nelle conferme di cancellazione |
| Successo | #0B6B4F su #E3F6EE | "Pagata", conferme |
| Badge notifiche | #E5243B | Pallino con numero |

**Sfumatura principale:** linear-gradient(135deg, #4A5CF0, #8B6CF0). Si usa per il pulsante "+", i pulsanti principali, il giorno scelto nel calendario, gli interruttori accesi, i filtri attivi e l'icona dell'app. Ombra abbinata: 0 10px 22px rgba(100,90,235,0.28).

**Colori delle cartelle** (sfumatura a 135°, testo e icone bianchi)

| Cartella | Da | A | Ombra (rgba) | Tinta chiara | Testo su tinta |
|---|---|---|---|---|---|
| Bollette · albicocca | #FFA36E | #F5824A | 245,130,74 | #FFF0E7 | #B5541C |
| Casa · lilla | #A59AF7 | #8778EE | 135,120,238 | #F1EFFD | #5B4BD6 |
| Auto · azzurro | #86B4F7 | #6494EE | 100,148,238 | #EAF2FE | #2F62C8 |
| Salute · rosa | #F79BBA | #EE7499 | 238,116,153 | #FDEBF1 | #B42A5A |
| Tessere · menta | #6FD3AE | #45B68E | 69,182,142 | #E6F7F0 | #1F7A5A |
| Garanzie · giallo | #F5CB6B | #EBAA45 | 235,170,69 | #FDF5E2 | #8A5A0B |
| Grigio (scelta libera) | #A9AFC4 | #858CA6 | 110,118,145 | #F0F1F5 | #4B5068 |

Ogni sezione prende il colore della sua cartella: pulsanti tondi in alto e filtri non attivi sulla tinta chiara, azione principale nella sfumatura della cartella. Il menu in basso resta sempre indaco.

**Carattere: Onest** (Google Fonts, licenza libera). Spaziatura tra le lettere +0,02em su tutto il testo, +0,005em sui titoli grandi, +0,1em sui titoletti in maiuscolo.

| Ruolo | Dimensione | Peso | Note |
|---|---|---|---|
| Saluto home | 30 px | 700 | "Ciao!" |
| Titolo pagina | 30 px (28 nei dettagli) | 700 |  |
| Titoletto di sezione | 13 px | 400 | Maiuscolo, #6A6D80 |
| Link "Vedi tutto" / "Riordina" | 10 px | 600 | Maiuscolo, #3B4FE0, area tocco ≥ 44 px |
| Titolo scheda / riga | 16–17 px | 600 |  |
| Sottotitolo riga | 13 px | 400 | #6A6D80 |
| Testo normale | 15–16 px | 400 | Interlinea 1,45–1,5 |
| Pulsante principale | 16 px | 600 |  |
| Importi | 16–17 px | 600–700 |  |

**Angoli:** schede e quadrati 20–22 px · quadrati grandi della home 22 px · icone in quadratino 12–14 px · pulsanti e campi a pillola = metà dell'altezza · pannelli dal basso 30–32 px in alto · menu a vetro 34 px.

**Ombre:** scheda 0 6px 22px rgba(28,30,70,0.08) · quadrato colorato 0 10px 20px rgba(<colore>,0.22) · icona in quadratino 0 6px 12px rgba(<colore>,0.22) · pannello dal basso 0 -10px 30px rgba(28,30,70,0.15) · finestra di conferma 0 20px 50px rgba(28,30,70,0.25).

**Spaziature:** margini laterali 22 px · tra sezioni 24–26 px · tra titoletto e contenuto 12 px · tra schede e quadrati 10–14 px · spazio sotto il contenuto per il menu a vetro 120–130 px. Aree di tocco sempre ≥ 44 × 44 px.

## Componenti

Tutte le schermate sono costruite con questi componenti; conviene programmarli una volta sola e riusarli.

| Componente | Misure | Aspetto | Stati e comportamento |
|---|---|---|---|
| Menu a vetro in basso | 68 px di altezza, staccato 18 px dai lati e 22 px dal fondo, angoli 34 px | Vetro bianco 72→42%, sfocatura 22 px, bordo bianco 80%, riflesso interno in alto | 5 posti: Home, Preferiti, Scadenze (badge), Famiglia, "+". Solo icone 26 px. Voce attiva in una pillola di vetro più chiara con icona #4A3FD9 |
| Pulsante "+" | Cerchio 44 px dentro il menu | Sfumatura principale | Limite raggiunto: grigio (#A9AFC4→#858CA6) con lucchetto nero 22 px, apre il pannello del limite |
| Pulsante tondo in alto | 44 × 44 px | Fondo lilla chiaro (o tinta della sezione), icona 20–22 px | Indietro, cerca, "…", condividi |
| Quadrato cartella (home) | 2 per riga, 132 px di altezza, padding 16 | Sfumatura della cartella, icona 28 px in alto, nome 17/600 e conteggio 13/400 in basso | Tocco: apre la cartella. Pressione lunga: modalità riordino |
| Riquadro preferito grande | 2 per riga, 196 px | Come il quadrato cartella | Apre il documento |
| Scheda bianca con righe | Angoli 22, padding verticale 4 | Ombra scheda, separatori #EEF0F5 rientrati a 70–78 px | Righe da 64–76 px: icona, titolo + sottotitolo, valore o freccia |
| Icona in quadratino | 40–52 px, angoli 12–16 | Sfumatura della cartella, icona bianca |  |
| Quadratino data | 46 × 50 px | Giorno 18/700 + mese 12/500 | Scadenza più vicina: sfumatura principale; altre: lilla chiaro con testo #4A3FD9 |
| Pulsante principale | 54–58 px, pillola, larghezza piena | Sfumatura (principale o della sezione), testo 16/600 bianco |  |
| Pulsante secondario | 44–52 px, pillola | Lilla chiaro, testo #1C1E2E o #4A3FD9 |  |
| Filtri (chip) | 36–40 px, pillola, vanno a capo | Attivo: sfumatura + testo bianco 600. Non attivo: tinta chiara + testo 500 | Mai scorrimento orizzontale |
| Scelta a due (segmentato) | 38 px dentro una pillola lilla chiaro | Voce attiva: pillola bianca con ombra, testo #4A3FD9 | Settimana/Mese, PDF/Foto, Codice a barre/QR |
| Interruttore | 52 × 32 px, pomello 26 px | Acceso: sfumatura principale. Spento: #D6D8E4 |  |
| Menu a tendina | 44–56 px, angoli 14–18 | Fondo #F7F6FE o bianco con ombra, freccia a destra | Apre il selettore di sistema |
| Riquadro tratteggiato "aggiungi" | Stesse misure dell'elemento che aggiunge | Bordo 2 px tratteggiato #C9CCDA (o colore della sezione), "+" e testo 15/500 | In fondo a home, cartelle, tessere, famiglia, preferiti |
| Pannello dal basso | Larghezza piena, angoli in alto 30–32 | Maniglia 40 × 5 px, fondo oscurato rgba(28,30,70,0.35–0.42) | Si chiude toccando fuori o "Annulla" |
| Finestra di conferma | Larga 342 px, angoli 30, centrata | Icona cestino in cerchio #FDECEC, pulsante rosso pieno + "Annulla" | Solo per cancellazioni |

**Barra di ricerca della home:** 64 px, pillola, fondo #F1EFFD, lente #6D5CE6 a destra. Toccandola si apre la schermata Ricerca.

**Icone:** a tratto, spessore 2 px, angoli arrotondati (stile Lucide o SF Symbols). Mai emoji.

## Schermate e navigazione

L'app ha oltre 30 schermate; il menu a vetro collega Home, Preferiti, Scadenze e Famiglia, il "+" apre la fotocamera. Ogni nome qui sotto corrisponde a un riquadro della tavola di design.

| Schermata | Ci si arriva da | Contenuto e azioni |
|---|---|---|
| Benvenuto 1–3 | Primo avvio | 3 pagine con illustrazione; Avanti, Salta, "Ripristina da un backup". Fine → Home vuota |
| Home vuota | Primo avvio | Invito a fotografare il primo documento o caricare un PDF; cartelle vuote |
| Home | Menu | Menu laterale, notifiche (badge), logo; "Ciao!"; ricerca; avviso backup o limite; Preferiti (2 grandi); Scadenze (1 voce); Archivio (cartelle 2 per riga + "Nuova categoria"); scorre in verticale |
| Notifiche | Campanella in home | Pannello sopra la home: Oggi / Questa settimana, non lette evidenziate, "Segna come lette" |
| Menu laterale | Tre linee in home | Utilizzo gratuito (5 di 7) + Sblocca; sezioni; Impostazioni, Backup, Aiuto, Valuta, Consiglia |
| Cartella (es. Bollette) | Quadrato in home | Filtri, documenti per mese con stato, "Nuova bolletta"; "…" → Modifica / Cancella categoria |
| Documento | Riga di una cartella, preferito, scadenza | Anteprima; Visualizza, Invia, Preferiti, Modifica, Cancella; Dettagli; promemoria; "Segna come pagata" |
| Visualizza | Anteprima o voce Visualizza | Pagine una sotto l'altra su fondo scuro, zoom 100–200%, Invia |
| Invia | Voce Invia | Formato PDF/Foto; Email, WhatsApp, Stampa, Salva in File, Copia, Altro; includi nota |
| Modifica documento | Voce Modifica | Come Nuovo documento, già compilato; Salva modifiche, Cancella |
| Cancella documento | Voce Cancella | Conferma con spiegazione |
| Fotocamera | "+" o "Fotografa" | Scansione con riconoscimento dei bordi; Scansiona / Dalle foto / Da PDF |
| Nuovo documento | Scatto | Pagine, "Letto dal documento", nome, cartella e persona (menu a tendina), scadenza con calendario e avviso, note, preferito |
| Nuova categoria | Riquadro tratteggiato in home | Anteprima, nome, 8 colori, 10 icone, per chi è |
| Riordina cartelle | Pressione lunga su un quadrato | Quadrati inclinati con maniglia, quello trascinato sollevato; Fine |
| Cancella categoria | "…" nella cartella | Scelta: sposta i documenti in Altro oppure cancellali |
| Scadenze | Menu | Settimana / Mese; calendario mensile con pallini e scadenze del giorno; elenco per mese |
| Preferiti | Menu | Elenco verticale; cuore per togliere (la voce sparisce); vuoto: messaggio |
| Tessere | Quadrato Tessere | Tessere impilate con foto come copertina; tocco: si apre con codice a barre o QR; Riordina; Nuova tessera |
| Nuova tessera | "+" in Tessere | Scansione della carta intera; copertina dalla foto; codice riconosciuto; dati letti modificabili |
| Riordina tessere / famiglia | Pressione lunga su una riga | Righe con maniglia a destra |
| Famiglia | Menu | Componenti con numero di documenti; "Aggiungi una persona"; nota sulla privacy |
| Persona | Riga in Famiglia | Foto, nome, ruolo; documenti 2 per riga; "…" → Modifica / Cancella persona |
| Nuova persona | Riquadro tratteggiato in Famiglia | Foto, nome, chi è |
| Ricerca | Barra in home | Risultati mentre scrivi, parola evidenziata, filtri Tutto/Documenti/Tessere/Scadenze |
| Impostazioni | Menu | Versione gratuita + Sblocca; Sicurezza (Face ID, anteprime); Promemoria; Backup; Aspetto; Informazioni |
| Backup | Impostazioni o menu | Crea backup → completato (percorso del file); Ripristina; promemoria periodico |
| Sblocca | Menu, Impostazioni, limite | Barra 5 di 7; vantaggi; 0,99 € senza limiti; Ripristina acquisto |
| Limite raggiunto | "+" al 7° elemento | Pannello: cosa resta possibile, cosa no; Sblocca / Più tardi |
| Home con limite | Dopo il 7° elemento | Scheda "7 di 7" al posto dell'avviso backup; "+" grigio con lucchetto |
| Widget e schermata di blocco | Sistema | Prossima scadenza, elenco scadenze, tessera rapida, azioni rapide; notifica di promemoria |

## Regole di funzionamento

**Limite gratuito**

- Il limite è di 7 elementi in tutto: ogni documento e ogni tessera conta 1; categorie, persone e scadenze non contano.
- Il conteggio si fa sul telefono, senza internet. Cancellare un elemento libera uno spazio.
- Al 7° elemento: "+", "Fotografa" e "Nuova tessera" mostrano il lucchetto e aprono il pannello del limite. Consultare, inviare, stampare, mostrare le tessere e i promemoria restano attivi.
- Lo sblocco è un acquisto unico (non consumabile) nello store, con "Ripristina acquisto" in Sblocca.

**Promemoria e notifiche**

- Notifiche locali programmate sul telefono, nessun server. Avviso predefinito: 2 giorni prima alle 9:00 (modificabili in Impostazioni e per ogni documento: il giorno stesso, 1 giorno, 2 giorni, 1 settimana prima).
- Con "Nascondi anteprime" attivo, la notifica non mostra nome e importo.
- Il badge sulla campanella e sull'icona Scadenze conta le notifiche non lette.

**Backup**

- "Crea backup ora" produce un unico file con documenti, tessere, cartelle, persone, scadenze e impostazioni, salvato in File › Sottomano (Android: cartella Download o selettore di sistema).
- "Ripristina" sostituisce il contenuto attuale con quello del file, dopo una conferma.
- Promemoria per il backup: ogni settimana, ogni mese (predefinito) o mai. L'avviso in home compare finché non esiste un backup.

**Lettura automatica**

- Documento: rilevamento dei bordi, raddrizzamento, lettura del testo per proporre nome, importo e scadenza. L'utente conferma sempre.
- Tessera: foto della carta intera come copertina, lettura di codice a barre (EAN-13, Code 128 e simili) o QR code, numero e intestatario.
- Tutto avviene sul telefono.

**Riordino:** pressione lunga su quadrati della home, tessere, persone e preferiti; trascinamento; l'ordine si salva subito.

**Ricerca:** cerca in nomi, cartelle, tessere, scadenze e note mentre si scrive; evidenzia la parte trovata; filtri Tutto / Documenti / Tessere / Scadenze.

**Cancellazioni:** sempre con conferma. Categoria: scelta tra spostare i documenti in "Altro" o cancellarli. Persona: i suoi documenti passano a "Tutta la famiglia" o vengono cancellati (stessa finestra). Il documento cancellato si recupera solo da un backup.

**Tessere alla cassa:** aprendo una tessera lo schermo va alla luminosità massima finché il codice è visibile.

**Sicurezza:** blocco con Face ID / impronta all'apertura (attivo per impostazione).

## Modello dei dati

Un database locale sul telefono (per esempio SQLite) con 6 tabelle; i file delle pagine e delle copertine stanno in una cartella dell'app e il database ne salva il percorso.

| Tabella | Campi principali | Note |
|---|---|---|
| Categoria | id, nome, colore, icona, ordine, persona_id (facoltativo) | Le 6 iniziali sono create al primo avvio; "Altro" esiste sempre e non si cancella |
| Persona | id, nome, relazione, foto (percorso), colore, ordine, è_utente | Una sola ha è_utente = sì ("Tu") |
| Documento | id, nome, categoria_id, persona_id, note, preferito, ordine_preferito, stato (da pagare / pagato / nessuno), importo, creato_il, modificato_il | Conta 1 nel limite gratuito |
| Pagina | id, documento_id, file, ordine, testo_letto | Il testo letto serve alla ricerca |
| Scadenza | id, documento_id, data, avviso (giorni prima), orario, fatta | Una scadenza programma una notifica locale |
| Tessera | id, nome, tipo, numero, intestatario, codice, formato_codice (EAN-13, Code 128, QR…), copertina (file), ordine, persona_id | Conta 1 nel limite gratuito |

**Impostazioni** (chiave-valore): sbloccato, face_id, nascondi_anteprime, notifiche, orario_avvisi, avviso_predefinito, frequenza_promemoria_backup, ultimo_backup, tema.

**Limite:** elementi = conteggio(Documento) + conteggio(Tessera); se sbloccato = no e elementi ≥ 7, le azioni di aggiunta mostrano il pannello del limite.

## Note tecniche e scelte da fare

Tutte le funzioni si possono fare con strumenti già presenti nei telefoni, senza servizi esterni; le versioni attuali delle librerie vanno verificate prima di iniziare.

| Funzione | iPhone | Android |
|---|---|---|
| Scansione documento con bordi | VisionKit (scanner documenti) | ML Kit Document Scanner |
| Lettura del testo | Vision (riconoscimento testo) | ML Kit Text Recognition |
| Codice a barre e QR | Vision / AVFoundation | ML Kit Barcode Scanning |
| Promemoria | Notifiche locali | Notifiche locali (AlarmManager / WorkManager) |
| Acquisto 0,99 € | StoreKit, prodotto non consumabile | Google Play Billing, prodotto una tantum |
| Widget | WidgetKit (in Swift) | App Widget / Glance |
| Blocco app | Face ID / Touch ID | Biometria Android |
| Backup | File in app File (UIDocumentPicker) | Storage Access Framework |
| Invio e stampa | Pannello di condivisione e stampa di sistema | Intent di condivisione e PrintManager |

**Scelte ancora da fare**

- Tecnologia: nativo (Swift + Kotlin) oppure un solo codice per entrambi (Flutter o React Native). I widget richiedono comunque una parte nativa.
- Partire solo con iPhone o con entrambe le piattaforme.
- Tema scuro: rimandarlo alla versione 2 e togliere per ora la voce "Tema" dalle impostazioni.
- Limite gratuito: confermare 7 elementi (in alternativa 5).
- Logo definitivo con la sfumatura indaco-lilla e la scritta in Onest; icone dell'app in tutti i formati.
- Immagini e testi per App Store e Google Play.

**Da tenere presente sul prezzo:** 0,99 € include l'IVA (22% in Italia) e lo store trattiene una commissione, in genere il 15% per gli sviluppatori piccoli: a vendita restano circa 0,70 €. Le percentuali vanno verificate sui programmi attuali di Apple e Google.

---

## Adattamento per Sottomano (decisioni di Step, 11 novembre 2026)

Questa sezione ha la precedenza sulla guida dove le due non coincidono.

- **Si tiene tutto quello che l'app fa già.** Stack (React Native + Expo SDK 58, Expo Router, SQLite con migrazioni V1–V14), scanner, motore di invio, backup **cifrato con password**, notifiche, calendario «Sottomano», cestino di 30 giorni, scadenze che si ripetono, "Rinnovato" con versioni precedenti, pacchetto per il commercialista, categorie Pet e Password (Portachiavi), pressione lunga per riordinare e menu rapido, copertina Foto/Colore, campanella sulle scadenze, 6 palette. La riga della guida "Il documento cancellato si recupera solo da un backup" NON vale: resta il cestino.
- **La grafica nuova sostituisce del tutto quella attuale**: colori di base, sfumatura indaco-lilla (sostituisce il rosa #FF4F64 e la sfumatura arancio-rosa), carattere **Onest** ovunque (sostituisce Outfit e la scritta in Fraunces), fondo bianco con schede bianche e ombra (sostituisce i colori "grouped" di iOS), componenti, angoli, ombre, spaziature.
- **Si tiene solo il tema chiaro.**
- **Categorie: si tengono le nostre 13.** La **palette predefinita è "Pastello"** (decisione del 13 novembre 2026, revisione di accessibilità): sfumature chiare con testo e icone scuri, contrasto WCAG AA su ogni riquadro (minimo 4,7:1) in chiaro, in Tema notte e con Aumenta contrasto. Le nuove installazioni partono da Pastello; una migrazione una tantum porta su Pastello chi aveva "Sottomano", poi si rispetta la scelta fatta in Aspetto.
- **"Sottomano"** (tabella sotto: sfumatura a 135°, testo e icone bianchi nel disegno originale) resta selezionabile in Aspetto, insieme alle altre palette. Dove il testo bianco non raggiunge 4,5:1 l'app mostra l'inchiostro scuro #1C1E2E (o scurisce la sfumatura), vedi `readableColors` in `src/utils/colors.ts`.

| Categoria | Da | A | Ombra (rgb) | Tinta chiara | Testo su tinta | Origine |
|---|---|---|---|---|---|---|
| Documenti | #8F9BF8 | #6C7BEF | 108,123,239 | #EEF0FE | #3A47C2 | nuovo |
| Tessere e card | #6FD3AE | #45B68E | 69,182,142 | #E6F7F0 | #1F7A5A | guida (Tessere) |
| Utenze | #FFA36E | #F5824A | 245,130,74 | #FFF0E7 | #B5541C | guida (Bollette) |
| Casa | #A59AF7 | #8778EE | 135,120,238 | #F1EFFD | #5B4BD6 | guida |
| Assicurazioni | #6CCAD6 | #3FAFBF | 63,175,191 | #E4F6F8 | #17707C | nuovo |
| Garanzie e scontrini | #F5CB6B | #EBAA45 | 235,170,69 | #FDF5E2 | #8A5A0B | guida |
| Auto | #86B4F7 | #6494EE | 100,148,238 | #EAF2FE | #2F62C8 | guida |
| Spese 730 | #F79BBA | #EE7499 | 238,116,153 | #FDEBF1 | #B42A5A | guida (Salute) |
| Colf | #F2A08A | #E07A5F | 224,122,95 | #FCEEE9 | #A9472C | nuovo |
| Scuola | #E79BD9 | #D274C2 | 210,116,194 | #FCEDF9 | #9A2F88 | nuovo |
| Pet | #A8CF6E | #86B347 | 134,179,71 | #F0F7E5 | #4F7420 | nuovo |
| Password | #8FA3B8 | #6B8299 | 107,130,153 | #EDF1F5 | #3E5468 | nuovo |
| Altro | #A9AFC4 | #858CA6 | 110,118,145 | #F0F1F5 | #4B5068 | guida (Grigio) |

- **Barra in basso**: menu a vetro della guida (Home, Preferiti, Scadenze, Famiglia, "+", solo icone), con il badge su Scadenze.
- **Prezzo**: 7 elementi gratis (documenti + tessere) e sblocco unico da 0,99 €. La logica del limite si prepara in Expo Go; l'acquisto vero (StoreKit / Google Play Billing) si collega con la prima development build.
- **Ridisegno a passi**: 1) fondamenta (colori, Onest, ombre, componenti condivisi); 2) Home; 3) Cartella, Documento, Nuovo/Modifica; 4) Scadenze, Preferiti, Tessere, Famiglia, Persona; 5) Menu laterale, Notifiche, Impostazioni, Backup, Ricerca, Benvenuto; 6) Sblocca e limite. Ogni passo si prova sull'iPhone prima del successivo.

## Tema notte

> **Sostituita da "Tema notte (v2)"** (sotto): i valori di questa sezione restano solo come storia.

Palette ufficiale del tema scuro (Impostazioni › Aspetto › Tema: Automatico / Chiaro / Scuro). Ogni colore è una variabile del tema con lo stesso nome e due valori.

| Ruolo | Chiaro | Notte |
|---|---|---|
| Sfondo | #FFFFFF | #0F1020 |
| Scheda | #FFFFFF | #1B1D33 |
| Lilla chiaro (pulsanti, campi) | #F1EFFD | #262849 |
| Lilla chiarissimo (riquadri informativi) | #F7F6FE | #1F2140 |
| Testo principale | #1C1E2E | #F2F3FA |
| Testo secondario | #6A6D80 | #A3A6BD |
| Testo su riquadro | #4B4E63 | #C3C5D9 |
| Accento e link | #3B4FE0 | #8E9BFF |
| Indaco testo e icone | #4A3FD9 | #B3A8FF |
| Separatore | #EEF0F5 | #2C2F4D |
| Interruttore spento | #D6D8E4 | #3A3D5C |
| Tratteggio | #C9CCDA | #4A4D6E |
| Tinta Bollette (Utenze) / testo | #FFF0E7 / #C2530F | #3A2418 / #FFB48A |
| Tinta Tessere / testo | #E6F7F0 / #1F7A5A | #15332A / #7FE0BC |
| Tinta Casa / testo | #F1EFFD / #5B4BD6 | #262849 / #B3A8FF |
| Tinta Auto / testo | #EAF2FE / #2F62C8 | #16263F / #8DB6FF |
| Tinta Salute (Spese 730) / testo | #FDEBF1 / #B42A5A | #3A1A28 / #FF9CC0 |
| Tinta Garanzie / testo | #FDF5E2 / #8A5A0B | #352A12 / #F5CB6B |
| Tinta Password / testo | #E3F6F9 / #1A6F7E | #12313A / #7FD6E4 |
| Grigio pulsanti (scelte inattive) | #F4F5F8 | #24263F |
| Icone grigie | #4B5068 | #B4B7CC |
| Segnaposto | #8A8DA0 | #6F7290 |
| Badge notifiche | #E5243B | #FF4D5E |
| Cuore preferiti | #E8457A | #FF6F9B |
| Errore fondo / testo | #FDECEC / #B42318 | #3A1A1E / #FF8A80 |
| Successo fondo / testo | #E3F6EE / #0B6B4F | #15332A / #7FE0BC |
| Menu a vetro | bianco 72% → 42% | #282A4A 78% → #1C1E38 60%, bordo bianco 12% |

**Regole:** tutti i colori sono variabili del tema. Le sfumature delle cartelle, la sfumatura principale e quella delle Password (#5CC8D8 → #2FA3B8) restano uguali; i colori scelti dall'utente per l'anteprima e le copertine non cambiano; codici a barre e QR sempre su fondo bianco. Le ombre delle schede diventano un bordo interno di 1 px bianco al 7%.

**Categorie non presenti nella guida** (stessa regola: tinta scura della tonalità con la luminosità della guida, testo chiaro della tonalità):

| Categoria | Tinta notte | Testo notte |
|---|---|---|
| Documenti | #1E2346 | #A9B3FF |
| Assicurazioni | #123038 | #8ADCE8 |
| Colf | #3A201B | #FFB09B |
| Scuola | #36183A | #F2A6E6 |
| Pet | #253015 | #C2E58F |
| Altro | #24263F | #C3C7D9 |


## Tema notte (v2)

Tavolozza notte del design (13 novembre 2026). Sostituisce tutti i valori notte precedenti e la variante notte di
Pastello. Il tema chiaro non cambia. I codici a barre e QR delle tessere restano sempre su una scheda bianca; i colori
scelti dall'utente per una categoria non cambiano; Aumenta contrasto rinforza grigi e bordi anche di notte.

### Fondo e superfici

| Elemento | Valore |
|---|---|
| Sfondo | #0D0E1C, con una luce indaco tenue in alto nello schermo |
| Scheda | #17182C |
| Pulsanti tondi, campi, scelte non attive | #212339 |
| Riquadri morbidi | #1C1D34 |
| Separatore | #25273F |
| Ombra delle schede | diventa una linea chiara di 1 px, bianco 7 % |

### Testo e icone

| Elemento | Valore |
|---|---|
| Testo principale | #EEEFF8 |
| Testo secondario | #9C9FBA |
| Testo sui riquadri | #C7C9DD |
| Icone del menu | #C7C9DD |
| Icone grigie | #B4B7CC |
| Segnaposto | #898BA4 |
| Accento / link | #A99CFF |
| Testo e icone indaco | #B8ADFF |

### Sfumatura principale

#4F5CF2 → #7A55F0 (testo bianco ≥ 4,5:1); bagliore sotto i pulsanti al 45 %, più ampio.

### Cartelle

Di notte valgono per **ogni palette** (la palette scelta in Aspetto vale per il tema chiaro, predefinita Pastello).
Sfumatura a 135° con testo e icone bianchi (≥ 4,5:1 su entrambi i capi), bordo 1 px bianco 7 %, nessuna ombra colorata.
Le categorie con un colore scelto dall'utente lo mantengono.

| Categoria | Da | A | Tinta di sezione | Testo su tinta | Origine |
|---|---|---|---|---|---|
| Documenti | #4C5EE6 | #3246E2 | #1B1F3A | #A9B3FF | ricavata |
| Tessere e card | #228468 | #1A6E55 | #14282A | #7FE0BC | design |
| Utenze (Bollette) | #C2531D | #AD4423 | #2A1E24 | #FFB089 | design |
| Casa | #725FEE | #5A47D6 | #212339 | #C3B8FF | design |
| Assicurazioni | #2E7E8A | #266973 | #13282D | #8ADCE8 | ricavata |
| Garanzie e scontrini | #996D1A | #80590F | #2A2420 | #F5CF7A | design |
| Auto | #3470E5 | #2F5FCB | #18233D | #9EC2FF | design |
| Spese 730 (Salute) | #D03C74 | #B03564 | #2A1B2C | #FFA3C2 | design |
| Colf | #CB4A27 | #B14022 | #2A1D1E | #FFAE98 | ricavata |
| Scuola | #C13EAA | #AA3796 | #291A2E | #F2A6E6 | ricavata |
| Pet | #5E7E32 | #4E6829 | #1C2617 | #C2E58F | ricavata |
| Password | #23808F | #1A6A77 | #13283A | #7FD6E4 | design |
| Altro | #6C7493 | #5F6682 | #1F2131 | #C3C7D9 | ricavata |

Ricavate: la tonalità della cartella Sottomano, più profonda (luminosità abbassata finché il testo bianco arriva a
≥ 4,6:1 in alto, il fondo 6 punti più scuro); la tinta è la stessa tonalità molto scura, il testo una sua versione chiara
(≥ 8:1 sulla tinta).

### Stati

| Elemento | Valore |
|---|---|
| Da pagare | #3A1A24 / #FF8F8F |
| Pagata | #123228 / #6FDCB2 |
| Pallino notifiche | #E0263B |
| Cuore | #FF6F9B |
| Interruttore spento | #5E62A2 |
| Bordo tratteggiato | #5D6199 (design #595D92, alzato di poco per 3:1 sulle schede) |

### Menu a vetro e fogli

Vetro #242644 al 94 % → #16172C al 92 % sopra una sfocatura forte (intensità 80), per menu laterale, menu rapido e fogli azione (la prima versione al 78 % → 62 % era troppo trasparente), bordo bianco 10 %; voce attiva lilla #A99CFF al 16 %; velo dietro i fogli
nero 55 %.
