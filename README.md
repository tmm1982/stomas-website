# STOMAS Guide — English edition

English translation of the STOMAS website at https://stomas.dk, published at https://stomasguide.com.

- Source: `stomasguide-en` branch of `tmm1982/stomas-website`.
- Hosting: separate Cloudflare Pages project `stomasguide`.
- Build: `hugo --minify`; output: `public`; Hugo 0.168.0.
- The Danish website and app continue to deploy from `main`.
- The Danish app is excluded from this build; `/app/` redirects to https://app.stomas.dk/.

The design, photographs, original events and organisational names are retained. Public pages and six guides have English text and English URLs. Original Danish URLs redirect to the English counterparts. Danish media is labelled as Danish.

The source file named `provox-rengoering` contained a duplicate of the smell guide. This edition provides a short voice-prosthesis care guide with a manufacturer reference. Water safety and prosthesis care wording refers readers to their clinical team. Editorial image placeholders have been removed. These are patient information and personal experience, not a claim of clinical endorsement.

Contact details and the existing FormSubmit destination are retained. Form delivery must be verified by the owner; no test messages were sent during deployment.

## Brazilian Portuguese

The `stomasguide-en` branch now builds English at `/` and Brazilian Portuguese at `/pt-br/` with Hugo multilingual mode. The Portuguese edition uses `.pt-br.md` companion files and the `i18n/pt-BR.json` table; English keeps its existing content files and root URLs. Both languages share all templates, styles and photographs. Internal navigation resolves the corresponding page in the current language.

The language picker includes Denmark, English, Germany, France and Brazil. `data/language_routes.json` maps corresponding pages across the four domains and feeds the picker and hreflang metadata. Flags are from lipis/flag-icons v7.3.2, under the included MIT license at `static/img/flags/LICENSE.txt`.

The Brazilian edition cites the local manufacturer's information for voice-prosthesis care. It makes no claim of clinical approval or a corporate partnership. No emails or contact-form test messages were sent.

See `AGENTS.md` for the user's standing instruction to translate and publish future website content across these editions.
