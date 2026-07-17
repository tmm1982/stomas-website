/* ==========================================================
   STOMAS Studio
   Signature Controller v2
========================================================== */

document.addEventListener("DOMContentLoaded", init);

const defaults = {

    name: "Thomas Fugleberg Mølgaard",

    title1: "Næstformand",

    title2: "Strubeløskonsulent",

    title3: "Foredragsholder",

    email: "tmm@live.dk",

    phone: "21 90 73 05",

    website: "stomas.dk"

};

function init() {

    bindInputs();

    fillDefaults();

    updatePreview();

}

function bindInputs() {

    document
        .querySelectorAll("input")
        .forEach(input => {

            input.addEventListener("input", updatePreview);

        });

}

function fillDefaults(){

    Object.keys(defaults).forEach(key=>{

        const input=document.getElementById(key);

        if(!input) return;

        if(input.value===""){

            input.value=defaults[key];

        }

    });

}

function updatePreview(){

    sync("name","sig-name");

    sync("title1","sig-title1");

    sync("title2","sig-title2");

    sync("title3","sig-title3");

    sync("email","sig-email");

    sync("phone","sig-phone");

    sync("website","sig-website");

}

function sync(inputId,targetId){

    const input=document.getElementById(inputId);

    const target=document.getElementById(targetId);

    if(!input || !target) return;

    target.textContent=input.value;

}
