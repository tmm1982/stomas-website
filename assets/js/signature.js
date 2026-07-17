// ==========================================================
// STOMAS Creator
// Signature Studio
// Live Preview Engine v1
// ==========================================================

const fields = {
    name: "sig-name",
    title1: "sig-title1",
    company1: "sig-company1",
    title2: "sig-title2",
    company2: "sig-company2",
    title3: "sig-title3",
    company3: "sig-company3",
    email: "sig-email",
    phone: "sig-phone",
    website: "sig-website"
};

function updateField(inputId, outputId){

    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);

    if(!input || !output) return;

    output.textContent = input.value;

}

function render(){

    Object.entries(fields).forEach(([input,output])=>{
        updateField(input,output);
    });

}

Object.keys(fields).forEach(id=>{

    const el=document.getElementById(id);

    if(!el) return;

    el.addEventListener("input",render);

});

render();
