# STOMAS Bilagsarkiv – sikker implementeringsplan

Status: Forberedt, **IKKE idriftsat**. Ingen bilag må uploades til GitHub eller public/static.

## Afhængigheder (kontrolleret 2026-11-10)
- Cloudflare R2 er ikke aktiveret (API: 10042).
- Cloudflare Access er ikke aktiveret.
- Begge skal være aktiveret og adgangspolitik testet før offentligt endpoint oprettes.

## Foreslået arkitektur
- URL: https://stomas.dk/bilag/ (beskyttet rute; samme beskyttelse på /bilag/api/*)
- Cloudflare Access: self-hosted app med **allow** for ejerens bekræftede identitet, ingen bypass.
- Worker: server-side autentifikation og autorisation for hver API-request; afvis uden gyldigt verificeret Access-token. Undgå offentlig workers.dev-bypass.
- R2: privat bucket `stomas-bilag`, uden public domain eller r2.dev.
- D1: bilagsmetadata, bilagsnummer, regnskabsår, leverandør, dato, beløb, kategori, tilknyttet postering, uploadtid, checksum, revisionshistorik.
- Filer lagres med ikke-gættelige objekt-id'er, aldrig filnavn som sti.
- Filer valideres server-side (tillad PDF/JPEG/PNG, grænser for størrelse); antag ikke MIME fra klienten er sandt.
- Downloads via autentificeret Worker, private R2 bindings, `Cache-Control: private, no-store`.
- Forbud mod at overskrive eksisterende originaler; rettelser bliver nye versioner med revisionshistorik.
- Eksport af bilagsliste (CSV) og originale bilag samlet med entydige filnavne.
- Separat backup/restore-test; opbevaringspolitik vurderes ift. bogføringsloven og evt. digitalt bogføringskrav.
- Vigtigt: Dette er et bilagsarkiv, ikke i sig selv et fuldt compliant bogføringssystem.

## Fase 1 – efter aktivering
1. Kontrollér R2 og Access aktive.
2. Bekræft ejerens login-identitet og opret snæver allow-policy.
3. Opret privat R2-bucket og D1 database.
4. Implementér Worker med autentificeret upload/list/download og revisionsmetadata.
5. Test uautoriseret adgang, API-kald uden session, direkte Worker-domæne og adgang til objekter.
6. Bind ruten på stomas.dk og gennemfør test med et ufølsomt dummybilag.
7. Tilføj mobilvenlig bilagsoversigt med kategorier og regnskabseksport.

**Ingen realdata før fase 1 er bestået.**


## Implementeret 2026-11-10
- Cloudflare R2 privat bucket: `stomas-bilag` (WEUR)
- Cloudflare D1: `stomas_bilag`
- Cloudflare Access: STOMAS Bilag (privat); ejeridentitet begrænset til Cloudflare-kontoens mailadresse
- Worker: `stomas-bilag`, upload, liste, hent fil og CSV-eksport
- Routet til `stomas.dk/bilag*`; `workers.dev` og previews slået fra
- Worker verificerer Access JWT, email, audience og signatur samt forventet hostname
- Ikke-autoriserede kald afvises; data ikke i GitHub
- **Status:** Opsat, men ikke end-to-end-testet i brugerens browser endnu
- **Før rigtige bilag:** foretag dummy-upload, downloadtest og verificer backup/restore-plan
- Bemærk: CSV-eksport er kun metadata, ikke en fuld ZIP-backup af originale bilag.


## Opdatering 2026-11-10 – backup og regnskabsreference
- Privat backup-bucket `stomas-bilag-backup` oprettet i samme Cloudflare-konto.
- Separat Worker `stomas-bilag-backup` med daglig cron `15 2 * * *` (UTC). Den kopierer originalfiler til `originals/` og gemmer tidsstemplet JSON-snapshot af D1-bilagsregisteret under `snapshots/`.
- Backup-workerens public subdomain og previews er deaktiveret; backupen forventes først kørt næste planlagte tidspunkt. **Endnu ikke restore-testet**.
- D1 `receipts` har ny kolonne `posting_ref`, og bilagsportalens visning har handlingen **Tilknyt** til regnskabspostering samt feltet i CSV-eksport.
- Koblingen er på nuværende tidspunkt en manuel postering-reference; der er **ingen automatisk synkronisering med Dinero eller Excel**.
- En kopi i samme Cloudflare-konto beskytter mod visse utilsigtede ændringer, men er ikke en uafhængig disaster-recovery-backup. Planlæg periodisk offline/off-account eksport og gendannelsestest.
- Alle bilag og øvrige data forbliver uden for dette offentlige GitHub-repository.


## Opdatering – Dinero-import og valgliste 2026-11-10
- Importeret brugerens Dinero-CSV `Posteringer.csv`: **38 bogføringslinjer** fordelt på **16 bilagsnumre** fra 2026-07-01 til 2026-10-19.
- Importerede linjer er gemt uændret i særskilt D1-tabel `dinero_lines` med kildeidentifikator og beløb i øre; de balancerer samlet til 0.
- Ny beskyttet API `GET /bilag/api/postings` returnerer grupperede Dinero-bilag til valglisten.
- "Tilknyt" i bilagsoversigten åbner nu valgliste i stedet for fri tekst. Koblingen gemmes i `receipts.posting_ref` som `DINERO:2026:<bilagsnummer>`.
- Nuværende historiske importer er en statisk kopi, ikke en levende forbindelse til Dinero.
- Posteringerne vises kun til valg for bilag. Det er **ikke** en ændring af virksomhedens bogførte saldo eller et automatisk bilagsmatch.
- Backup-Workerens natlige kørsel og restore-test er endnu ikke dokumenteret som fuldført.

## Opdatering 2026-11-10 – Slet bilag / papirkurv
- Tilføjet `Slet`-handling ved bilag, som viser bekræftelse og oplyser hvis bilaget er koblet til Dinero.
- Sletning er **blød sletning**: originalfilen i privat R2 og metadata bevares, men skjules fra normal oversigt, almindelig download og CSV-eksport.
- `Papirkurv` viser de blødt slettede bilag, og `Gendan` genaktiverer dem med tidligere regnskabskobling.
- D1 `receipts`: `deleted_at`, `deleted_by`; `receipt_events` er separat revisionslog over handlinger.
- API: `POST /bilag/api/delete`, `POST /bilag/api/restore` med eksisterende verificeret Access JWT og origin-beskyttelse.
- Sletning påvirker **ikke** den særskilt importerede Dinero-historik eller originalfilen i R2.
- Kontrol ved deployment: Worker succesfuldt deployed, schema og ruter verificeret; 1 aktivt bilag og 0 slettede pr. kontrollen.
- **End-to-end-test i brugerens browser af Slet/Gendan endnu ikke gennemført.**
- Ingen permanent sletning eller automatisk tømning af papirkurv: regnskabsbilag kan være underlagt opbevaringspligt.

## Opdatering 2026-11-10 – Automatisk bilagsaflæsning (AI)
- Produktions-Worker `stomas-bilag` udvidet med Workers AI binding (Cloudflare AI), uden at ændre hverken eksisterende originale bilag eller R2.
- Ny Access/JWT- og Origin-beskyttet endpoint: `POST /bilag/api/analyze`, som accepterer PDF, PNG og JPEG i særligt AI-upload (maks. 3,5 MB). Den gemmer **intet** og bogfører **intet**.
- Uploadformular forsøger automatisk AI-aflæsning ved filvalg, og tilbyder `Aflæs igen (AI)`.
- Bilder: @cf/qwen/qwen3.8-27b vision; PDF: env.AI.toMarkdown til tekstudtræk efterfulgt af Qwen-modellen. For scannede PDF'er uden tekst kan aflæsning fejle; upload og manuel indtastning fungerer fortsat.
- Klienten forsøger at nedskalere store billeder til JPEG **kun til AI-analyse**. Originalen der gemmes ved `Gem originalbilag` forbliver uændret.
- AI foreslår leverandør, bilagsdato, bruttobeløb og kategori. Der er streng dato-/beløbsvalidering, og udenlandsk valuta giver advarsel i stedet for automatisk kursomregning.
- Alle AI-oplysninger er forslag i redigerbare felter, der kræver almindeligt gem-klik; ingen automatisk bogføring eller tilladelse til at ændre historiske Dinero-posteringer.
- Modelkald kan være forbrugsafregnede hos Cloudflare; det fremgår af formularen.
- Adgang er fortsat begrænset til ejerens Cloudflare Access-identitet, og public Workers-domæne/previews er stadig deaktiveret.
- Efter deployment verificeret fra Cloudflare, at begge AI-pipelines samt eksisterende bilagsfunktioner fortsat er installerede, og at 1 aktivt bilag er bevaret.
- **Brugertest af AI-aflæsning på rigtig kvittering/PDF mangler.** Verificér resultaterne før regnskabsbrug.

## Rettelse 2026-11-10 – filvalg udløste ikke AI-aflæsning
- Bruger rapporterede, at ingen synlig handling skete, når der blev valgt en fil.
- Årsag: HTML-template string i Worker indeholdt JavaScript-tekst med enkelt-escaped `\\n` i papirkurvens bekræftelsesbesked. Under rendering blev det til faktiske linjeskift inde i en JavaScript-streng, så hele inline-scriptet fik syntaksfejl.
- Rettet ved at dobbelt-escape `\\\\n` i Workerens HTML-template. Regex-filendelser er også dobbelt-escapede, så `\\.` bevares som bogstaveligt punktum i browseren.
- Deploy via Cloudflare API lykkedes. Cloudflare-efterkontrol bekræfter filvalgs-handler, AI-endpoint, upload, papirkurv, gendan, og 1 eksisterende aktivt bilag.
- Endelig browser-/AI-kvitteringstest kræver brugerens login og er endnu ikke bekræftet.

## Opdatering 2026-11-10 – automatiske noter fra bilag
- AI-udtræk udvidet med `invoice_number`, `customer_number`, `order_number`, `supplier_cvr` og op til 15 `items` (varenavne/ydelser). Ingen gæt; manglende felter udelades.
- AI genererer nu et læsevenligt `notes`-forslag: Fakturanummer, Kundenummer, Ordrenummer, Leverandør-CVR og en punktopstillet liste over varer/ydelser.
- Uploadformular sætter forslaget i notatfeltet (bevarer allerede manuelt skrevne noter; genaflæsning erstatter tidligere maskin-genereret blok hvis den er uændret). Brugeren skal stadig selv godkende ved at gemme.
- Øget notatgrænse fra 500 til 2.000 tegn både i UI og i serverens uploadhåndtering. D1-feltet var allerede TEXT og krævede ingen migration.
- Prompt instruerer AI i at undgå personnumre, fulde kortnumre, bankkonti og adgangskoder. AI kan tage fejl, så bilagsnoter skal altid kontrolleres.
- Cloudflare Worker er deployed og efterkontrolleret. Historiske bilag og data er ikke ændret; browser-test på rigtig kvittering afventer bruger.
