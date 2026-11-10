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
