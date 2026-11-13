# Audit di accessibilità — novembre 2026

Obiettivo: le etichette App Store **VoiceOver, Testo più grande, Interfaccia scura, Contrasto sufficiente,
Differenziazione senza colore**. Audit su tutto `src/` (4 aree) + calcolo del contrasto di tutte le coppie di colori
(palette chiara e "Tema notte", 7 palette delle categorie): 796 coppie, 101 sotto WCAG AA.

Criteri Apple verificati: "Contrasto sufficiente" vale per i **colori di default** (chiaro e scuro), non solo con
Aumenta contrasto; "Testo più grande" chiede almeno 200 % (fino alle dimensioni di accessibilità); "Differenziazione
senza colore" chiede forme o testo oltre al colore (prova: filtro Scala di grigi).

## 1. Contrasto (chiaro e scuro)

| Dove | Coppia | Rapporto | Serve |
|---|---|---|---|
| Riquadri categoria, palette **Sottomano** (default) | testo bianco su gradiente pastello | 1,5–3,7 | 4,5 |
| Riquadri, palette **Vivace** (7 colori su 13) | bianco su gradiente medio | 2,0–4,4 | 4,5 |
| Pulsanti principali, chip attivi, giorno scelto | bianco su fine gradiente #8B6CF0 | 3,8 | 4,5 |
| Badge (scuro) | bianco su #FF4D5E | 3,2 | 4,5 |
| Testo segnaposto dei campi | #8A8DA0 su lilla / #6F7290 su scuro | 2,9–4,0 | 4,5 |
| Interruttore spento | binario #D6D8E4 su bianco / #3A3D5C su scuro | 1,4–1,8 | 3 |
| Tipo password (form) | bianco su gradiente acqua #5CC8D8 | 2,0–2,6 | 4,5 |
| Blocco app (scuro) | bianco su accento #8E9BFF | ~2,3 | 4,5 |
| Scadenza superata, chip (scuro) | bianco su #FF8A80 | ~2,2 | 4,5 |
| Preferiti con colore chiaro | sempre testo bianco (manca isLightColor) | fino a ~1,1 | 4,5 |
| **Bug tema scuro**: tessere (numero e "nessun codice"), "PDF" nel dettaglio, illustrazioni del Benvenuto | testo del tema su bianco fisso | ~1,1–2,3 | 4,5 |
| Barra zoom/pagina in Visualizza | bianco su bianco trasparente sopra la pagina | ~1 | 4,5 |
| Testi sopra la fotocamera | bianco senza velo | variabile | 4,5 |

## 2. Solo colore (Differenziazione senza colore)

- Chip scadenza: rosso (≤ 7 giorni) e ambra (≤ 30) con la stessa icona.
- Contatore "in scadenza" nelle righe (grouped-list) e in Famiglia: solo rosso.
- Calendario: "oggi" solo lilla; pallini delle scadenze solo colore.
- Selezioni solo con riempimento a gradiente: tipi/icone/immagine della password, icona della categoria, modalità in
  Aggiungi documento, chip attivi.
- Pallino "backup da fare" nel menu solo arancione; importo non valido solo bordo rosso; errore del ripristino solo
  testo rosso senza icona.
- Già a posto: Da pagare/Pagata (testo), forza password (testo), colore scelto (anello), non letta (pallino + fondo
  + etichetta).

## 3. VoiceOver

Bloccanti:
- Barra di ricerca della Home: il Pressable esterno è accessibile e nasconde campo e "Cancella".
- Calendario settimanale: si cambia settimana solo con lo swipe (le azioni sono su una View non accessibile).
- Pannello Notifiche: nessuna chiusura raggiungibile (manca onAccessibilityEscape, lo sfondo è nascosto).
- Modali trasparenti (menu, notifiche, cancella, limite): accessibilityViewIsModal sulla vista interna, la schermata
  sotto resta raggiungibile.
- Spostamento pagine nell'editor delle pagine: azioni su una View non focalizzabile (non funzionano).
- Copia "illuminata" del riquadro nel menu rapido letta come un pulsante che non fa nulla.

Informazioni mancanti:
- Righe scadenze senza la data; riquadri documento senza la scadenza; dettaglio senza "1 di N"; Famiglia senza
  "N in scadenza"; codice della tessera mai letto; tessere con foto mute; nomi icone delle categorie letti come
  "cross.case".
- Righe etichetta/valore lette in due pezzi (dettagli documento, password, tessera, persona, file in Invia, cestino,
  vantaggi e prezzo in Sblocca); etichette dei campi lette due volte; righe con interruttore lette in tre pezzi.
- Controlli a segmenti senza nome del gruppo; voce selezionata dei fogli azione indicata solo da un'icona.
- Titoli di sezione non marcati come intestazioni (rotore Intestazioni) in quasi tutte le schermate.
- Azioni solo con pressione lunga: menu delle tessere, menu delle scadenze, "Riordina" in Preferiti e Famiglia.
- Riordino: le azioni sposta su/giù esistono nelle liste e nelle griglie ma non annunciano la nuova posizione.
- Ruota dei colori: senza valore, intensità non regolabile.
- Nessun annuncio dei cambiamenti: avanzamento backup/pacchetto, file pronto in Invia, codice letto, pagina
  scattata/rimossa, zoom, password mostrata o generata, risultati della ricerca, giorno scelto, modalità
  Seleziona/Riordina, voce tolta dai preferiti, pagina del Benvenuto (e le pagine fuori schermo restano leggibili).

## 4. Testo più grande

- Limiti troppo bassi (maxFontSizeMultiplier 1,2–1,4): pulsanti su una riga, segmenti, badge di stato, conteggi nei
  riquadri, quadrato data, calendari, carte del portafoglio, menu rapido.
- Altezze/larghezze fisse attorno a testo: campi (52–56), pulsanti (34–52), riquadri Preferiti (196 con taglio),
  Home vuota (96), righe riordinabili (76), celle dell'editor pagine (140), etichette dei campi (72–104), pannello
  del limite non scorrevole, testi delle illustrazioni del Benvenuto.
- numberOfLines che tagliano nomi, sottotitoli e valori; righe orizzontali che non vanno a capo (prezzo e link in
  Sblocca, promemoria backup, Modifica/Cancella, righe delle scadenze del giorno).
- Testi da 10 pt (azioni dei titoli di sezione, "Segna come lette", "SBLOCCA", "riordina" delle tessere).

## 5. Movimento e Testo in grassetto

- Animazioni Reanimated: rispettano già "Riduci movimento" (default ReduceMotion.System).
- Non lo rispettano: Modal "slide" (fogli azione, editor pagine, scanner codice), LayoutAnimation delle tessere,
  scrollTo animato del Benvenuto, zoom animato in Visualizza, oscillazione del riordino (da rendere esplicita).
- "Testo in grassetto" ignorato in tutta l'app: Onest è un font personalizzato e il peso non segue l'impostazione.

## Correzioni previste

1. Infrastruttura: stato di accessibilità condiviso (Riduci movimento, Testo in grassetto, Aumenta contrasto) con
   ascolto dei cambiamenti; Testo in grassetto → peso Onest +1 ovunque; Aumenta contrasto → palette rinforzate.
2. Colori: riquadri leggibili calcolati dalla palette di design (inchiostro scuro dove il bianco non basta, gradiente
   scurito dove nessuno dei due basta), gradiente principale #7558E6, badge, segnaposto, interruttore; bug del tema
   scuro.
3. VoiceOver: etichette, ruoli, stati e suggerimenti (chiavi i18n in 24 lingue), elementi raggruppati, azioni
   personalizzate per pressione lunga e riordino con annuncio della posizione, modali chiuse correttamente, annunci.
4. Testo più grande: niente altezze fisse attorno al testo, limiti ≥ 2 (o nessuno), testi che vanno a capo.
5. Solo colore: icone e testo aggiunti (urgenza, oggi, selezioni, errori, backup da fare).
6. Movimento: fogli e animazioni senza scorrimento con Riduci movimento.
