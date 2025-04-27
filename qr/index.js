/* eslint-disable no-return-assign, no-param-reassign */

function getURLAddress() {
  const params = new URLSearchParams(document.location.search);
  const address = params.has('address')
    ? params.get('address')
    : document.referrer;
  
  let result = address.trim();
  try {
    result = atob(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`unable to base64 decode:${result}`);
  }

  return result;
}

function getIsReadOnly() {
  const params = new URLSearchParams(document.location.search);
  const readonly = params.has('readonly');
  return readonly;
}

function getEditContainer() {
  return document.querySelector('div.edit-container');
}
function getAddressInput() {
  return document.querySelector('div.form-container .form-input .address-input');
}
function getIsPlainTextInput() {
  return document.querySelector('div.form-container .form-input .is-plain-text-in').checked;
}
function getInfoContainer() {
  return document.querySelector('div.info-container');
}
function getFormContainer() {
  return document.querySelector('div.form-container');
}
function getAddressDiv() {
  return document.querySelector('div.info-address');
}
function getVisitButton() {
  return document.querySelector('button.btn-visit');
}
function getQRCodeEl() {
  return document.getElementById('qrcode');
}

// eslint-disable-next-line no-unused-vars
function changeCode(str) {
  //-- update the text to show the current value
  getAddressDiv().innerText = str;

  //-- define if we can visit that location
  const canVisitAddress = isVisitableAddress(address);
  getVisitButton().hidden = !canVisitAddress;

  const qrcodeEl = getQRCodeEl();

  //-- set an attribute - just so we can troubleshoot
  qrcodeEl.setAttribute('data-address', str);

  window.myQRCodeGenerator.makeCode(str);
}

function neuterEvent(evt) {
  if (!evt) return;
  evt.preventDefault();
  evt.stopPropagation();
  evt.stopImmediatePropagation();
}

function setEditContainerVisibility(isFormVisible) {

  const isFormHidden = !isFormVisible;
  const isInfoHidden = !isFormHidden;


  const infoContainer = getInfoContainer();
  const formContainer = getFormContainer();

  infoContainer.hidden = isInfoHidden;
  formContainer.hidden = isFormHidden;
}

function isVisitableAddress(address) {
  if (!address) return false;
  return address.startsWith('http:') || address.startsWith('https:');
}

//-- Handlers

/**
 * Update the values prior to submitting to use base64
 * */
function handleSubmit(event) {
  // console.log('submit about to take place');

  neuterEvent(event);

  const input = event.target.querySelector('.address-input');
  let val = input.value || '';

  const isPlainText = getIsPlainTextInput();

  if (!isPlainText) {
    if (!val.includes(':')) {
      val = 'https://' + val;
    }
  }

  window.address = val;

  setEditContainerVisibility(false);

  changeCode(val);
  // event.preventDefault();
}
document.querySelectorAll('form.app-form').forEach((el) => el.onsubmit = handleSubmit);


/**
 * When the document has finished loading
 * */
function handleDocumentLoaded() {
  // console.log('document loaded');
  let address = getURLAddress();
  window.address = address;
  const isReadOnly = getIsReadOnly();

  // eslint-disable-next-line no-console
  console.log(`applying the address:${address}`);

  const infoContainer = getInfoContainer();
  const formContainer = getFormContainer();
  const addressDiv = getAddressDiv();
  const visitBtn = getVisitButton();
  const editContainer = getEditContainer();
  const qrcodeEl = getQRCodeEl();

  // eslint-disable-next-line no-new
  window.myQRCodeGenerator = new QRCode(qrcodeEl, {
    text: address || 'placeholder',
  });

  if (!address) {
    setEditContainerVisibility(true);

    //infoContainer.hidden = true;
    //formContainer.hidden = false;
  } else {
    //infoContainer.hidden = false;
    //formContainer.hidden = true;

    changeCode(address);

    if (!isReadOnly) {
      editContainer.hidden = false;
      document.querySelectorAll('.app-form .address-input').forEach((addressInput) => {
        addressInput.value = address;
      });
    } else {
      editContainer.hidden = true;
    }

    setEditContainerVisibility(false);
  }
}
window.addEventListener('load', handleDocumentLoaded);

/**
 * Handle when the user clicks the button
 * */
// eslint-disable-next-line no-unused-vars
function handleVisitButtonClicked(evt) {
  neuterEvent(evt);
  
  let address = window.address;
  const canVisitAddress = isVisitableAddress(address);
  if (canVisitAddress) window.location.href = address;
}
document.querySelector('button.btn-visit').onclick = handleVisitButtonClicked;

/**
 * Handle if the edit button was clicked
 * */
// eslint-disable-next-line no-unused-vars
function handleEditButtonClicked(evt) {
  neuterEvent(evt);
  setEditContainerVisibility(true);
}
document.querySelector('button.btn-edit').onclick = handleEditButtonClicked;
