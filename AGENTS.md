# STOMAS website publishing

Keep the user's established design and terminology. Danish first-party copy uses “medrørende”; preserve actual organisation names, quotations and external source titles.

When the user asks us to create or update STOMAS website content, translation and publication of the corresponding content is part of the same task unless the user explicitly narrows the scope:

| Version | Branch | Public URL |
| --- | --- | --- |
| Danish | main | https://stomas.dk/ |
| English | stomasguide-en | https://stomasguide.com/ |
| Brazilian Portuguese | stomasguide-en | https://stomasguide.com/pt-br/ |
| German | stomas-de | https://stomas.de/ |
| French | stomas-fr | https://stomas.fr/ |

The Portuguese edition uses Brazilian Portuguese, including “fonoaudiólogo” and “prótese vocal”. On the English branch, translated content uses `.pt-br.md` filenames and shared templates use the `i18n` tables. Keep the English root URLs intact. Language labels include their names, with flags as an additional visual cue. Update `data/language_routes.json` when adding or changing translated routes so the switcher and hreflang links retain corresponding pages.

These are separate branches and Cloudflare Pages projects; there is no background translation service. Read current branch heads before edits, publish only authorised changes, and verify deployment results. Never merge a language branch wholesale into another language branch. The app at https://app.stomas.dk/ is a separate deployment of `static/app` from main.

STOMAS is the user's own business/initiative. Keep this role distinct from DLHM. Do not invent clinical credentials, medical approval, language fluency, corporate endorsements or partnerships. Sharing a link with Coloplast contacts does not establish a Coloplast partnership. Retain the distinction between total laryngectomy and tracheostomy. Do not send emails without explicit instructions.

Follow docs/architecture.md: one CSS entry point (`assets/css/main.css`), no duplicated CSS or JavaScript. Build the CSS when it changes and build Hugo; verify translated internal links, language metadata and mobile navigation. Never send test contact-form emails without explicit authorisation.
