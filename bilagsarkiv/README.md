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
