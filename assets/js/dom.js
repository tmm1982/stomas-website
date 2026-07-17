export const dom = {

    name:null,

    title1:null,

    title2:null,

    title3:null,

    email:null,

    phone:null,

    website:null

};

export function initDOM(){

    dom.name=document.querySelector("#sig-name");

    dom.title1=document.querySelector("#sig-title1");

    dom.title2=document.querySelector("#sig-title2");

    dom.title3=document.querySelector("#sig-title3");

    dom.email=document.querySelector("#sig-email");

    dom.phone=document.querySelector("#sig-phone");

    dom.website=document.querySelector("#sig-website");

}
