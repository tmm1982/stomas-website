/* ==========================================================
   STOMAS Studio
   Clipboard
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("copy-signature");

    if (!button) return;

    button.addEventListener("click", copySignature);

});

/* ==========================================================
   Copy Signature
========================================================== */

async function copySignature() {

    const signature = document.getElementById("signature");

    if (!signature) {

        alert("Signaturen blev ikke fundet.");

        return;

    }

    const html = signature.outerHTML;

    try {

        if (
            navigator.clipboard &&
            window.ClipboardItem
        ) {

            const blob = new Blob(
                [html],
                { type: "text/html" }
            );

            const item = new ClipboardItem({
                "text/html": blob,
                "text/plain": new Blob(
                    [signature.innerText],
                    { type: "text/plain" }
                )
            });

            await navigator.clipboard.write([item]);

        } else {

            fallbackCopy(html);

        }

        showToast("✅ Signaturen er kopieret.");

    }

    catch (err) {

        console.error(err);

        fallbackCopy(html);

    }

}

/* ==========================================================
   Fallback
========================================================== */

function fallbackCopy(html) {

    const textarea = document.createElement("textarea");

    textarea.value = html;

    document.body.appendChild(textarea);

    textarea.select();

    document.execCommand("copy");

    textarea.remove();

}

/* ==========================================================
   Toast
========================================================== */

function showToast(text) {

    const toast = document.createElement("div");

    toast.className = "st-toast";

    toast.textContent = text;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        },300);

    },2500);

}
