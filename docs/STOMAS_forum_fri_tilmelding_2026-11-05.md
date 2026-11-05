# STOMAS Fællesskab – fri tilmelding med e-mailbekræftelse

**Status:** Forberedt og sikkerhedsafspærret – **ikke åbnet**. 5. november 2026.

## Gennemført

- Serveren understøtter åben kontooprettelse uden invitationskode, men aktiveres kun med produktionens environment variable `FORUM_REGISTRATION_OPEN=true`.
- Nye konti får et kryptografisk tilfældigt engangslink. Kun hash af token lagres i D1. Udløber efter 24 timer.
- Nye brugere kan først logge ind og skrive efter mailbekræftelse.
- Aktivisering sender eksisterende administrationsnotifikation til `info@stomas.dk`.
- Frontend er klar med offentlig tilmeldingsformular, bekræftelsesvisning, genudsendelse og aktiveringslink.
- Enkel botforebyggelse: rate limits pr. IP og e-mail, honeypot, obligatorisk 18+-samtykke og moderering af alle indlæg.
- Eksisterende tre brugere er markeret som verificerede for at bevare adgang og data.
- Ikke-verificerede brugere ældre end 7 dage ryddes ved nye offentlige registreringer.
- Invitationsbaseret oprettelse er fortsat mulig. Ny e-mailbekræftelse gælder for selvbetjent fri oprettelse.
- Mailservice-Worker `stomas-forum-mailer` har nu også en intern verificeringsrute, men den kræver en aktiveret mailafsender til vilkårlige modtagere.

## Blokering

Cloudflare kan sende administrationsnotifikationer til allerede verificeret `info@stomas.dk`, men afviser almindelig afsendelse til ikke-verificerede modtagere med `403 email.sending.error.email.sending_disabled`.

API-adgang til kontoadministration af Email Sending-domæner returnerer `401 Unauthorized` via den aktuelle Cloudflare-forbindelse.

**Åbn derfor ikke fri tilmelding endnu.** Hvis flaget aktiveres nu, vil en registrering blive afvist, når bekræftelsesmail ikke kan leveres, og kontoen bliver rullet tilbage. Ingen bruger vil få en fungerende konto uden verifikation.

## Påkrævet Cloudflare-opsætning

1. Log ind i Cloudflare Dashboard og gå til **Compute → Email Service → Email Sending**.
2. Kontroller, om kontoen har adgang til Email Sending med afsendelse til vilkårlige modtagere. Cloudflares dokumentation oplyser, at dette kræver **Workers Paid**.
3. Onboard eventuelt det separate afsenderdomæne `notify.stomas.dk`, så Purelymails eksisterende MX på `stomas.dk` ikke ændres. Cloudflare viser DNS-posterne til underdomænet i onboarding-forløbet.
4. Når afsenderdomænet er verificeret, prøv en ægte test til en STOMAS-ejet adresse, som ikke er forudgodkendt som modtager i Email Routing.
5. Bekræft at det private `stomas-forum-mailer` kan sende via `MEMBER_EMAIL` fra `notifikation@notify.stomas.dk`, mens `FORUM_EMAIL` stadig sender til `info@stomas.dk`.
6. Først da sættes environment variable `FORUM_REGISTRATION_OPEN=true` på Cloudflare Pages `stomas-app` i production; deploy, test faktisk frivillig oprettelse, aktiveringsmail og login.
7. Overvej Turnstile og en egentlig dokumenteret privatlivs- og slettepolitik før bred markedsføring, eftersom brugerkategorier og forumindlæg kan indeholde helbredsoplysninger.

**Kilder:** Cloudflare [Email Service](https://developers.cloudflare.com/email-service/), [subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/) og [send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/).

Dette er et teknisk arbejdsnotat. Ingen konti, adgangskoder eller private tokens er medtaget.
