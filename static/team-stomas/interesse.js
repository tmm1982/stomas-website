/* Team STOMAS interest form. This is an email handoff, NOT official event registration.
   No visitor data is stored by this page. The visitor must send the draft in their email app. */
(() => {
  "use strict";
  const form = document.querySelector("[data-team-stomas-interest]");
  if (!form) return;
  const feedback = document.getElementById("team-stomas-email-note");
  form.addEventListener("submit", function (event) {
    if (!form.checkValidity()) return;
    event.preventDefault();
    const data = new FormData(form);
    const text = value => String(data.get(value) || "").trim().slice(0, 400);
    const sizeValues = {
      "adult-S": "Voksen S", "adult-M": "Voksen M", "adult-L": "Voksen L",
      "adult-XL": "Voksen XL", "adult-2XL": "Voksen 2XL",
      "adult-3XL": "Voksen 3XL", "adult-4XL": "Voksen 4XL",
      "child-4": "Barn 4", "child-8": "Barn 8",
      "child-12": "Barn 12", "child-16": "Barn 16",
      "unsure": "Ved det ikke endnu"
    };
    const size = sizeValues[text("shirt_size")] || "Ikke oplyst";
    const lines = [
      "Interesse for Team STOMAS 2027",
      "",
      "Kontaktperson: " + text("contact_name"),
      "E-mail: " + text("email"),
      "Foreløbig T-shirt-størrelse: " + size,
      "Andre størrelser i familien/gruppen: " + (text("more_sizes") || "Ingen oplyst"),
      "",
      "Jeg vil gerne kontaktes om Team STOMAS 2027.",
      "Jeg ved, at dette IKKE er en officiel tilmelding til Stafet For Livet.",
      "Den officielle tilmelding skal foretages særskilt hos Kræftens Bekæmpelse."
    ];
    const subject = "Team STOMAS 2027 - interesse og T-shirt-størrelse";
    const url = "mailto:teamstomas@stomas.dk?subject=" + encodeURIComponent(subject)
      + "&body=" + encodeURIComponent(lines.join("\n"));
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = form.getAttribute("data-email-message")
        || "Din mailapp åbner nu. Husk at trykke Send i mailappen.";
    }
    // Trigger a draft via a user-initiated action. No submission is claimed on this page.
    window.location.href = url;
  });
})();
