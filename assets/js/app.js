import {state} from "./state.js";
import {dom} from "./dom.js";

export function render(){

    dom.name.textContent=state.person.name;

    dom.title1.textContent=state.person.title1;

    dom.title2.textContent=state.person.title2;

    dom.title3.textContent=state.person.title3;

    dom.email.textContent=state.contact.email;

    dom.phone.textContent=state.contact.phone;

    dom.website.textContent=state.contact.website;

}
