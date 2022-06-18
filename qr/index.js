/* eslint-disable no-return-assign, no-param-reassign */

function getAddress() {
  const params = new URLSearchParams(document.location.search);
  const address = params.has('address')
    ? params.get('address')
    : document.referrer;
  return address;
}

function getIsReadOnly() {
  const params = new URLSearchParams(document.location.search);
  const readonly = params.has('readonly');
  return readonly;
}

function cleanAddress(address) {
  let result = address || '';
  result = result.trim();
  try {
    result = atob(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`unable to base64 decode:${result}`);
  }
  return result;
}

function getEditContainer() {
  return document.querySelector('div.edit-container');
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
function getButton() {
  return document.querySelector('button.btn-visit');
}

/**
 * Update the values prior to submitting to use base64
 * */
function handleSubmit(event) {
  // console.log('submit about to take place');

  const input = event.target.querySelector('.address-input');
  const val = input.value;

  const newValue = btoa(val);
  input.value = newValue;

  // event.preventDefault();
}
document.querySelectorAll('form.app-form').forEach((el) => el.onsubmit = handleSubmit);

/**
 * Actually apply the address
 * and do the main logic
 * */
function applyAddress(address) {
  const isReadOnly = getIsReadOnly();

  // eslint-disable-next-line no-console
  console.log(`applying the address:${address}`);

  const infoContainer = getInfoContainer();
  const formContainer = getFormContainer();
  const addressDiv = getAddressDiv();
  const visitBtn = getButton();
  const editContainer = getEditContainer();

  if (!address) {
    infoContainer.hidden = true;
    formContainer.hidden = false;

    visitBtn.hidden = true;
  } else {
    infoContainer.hidden = false;
    formContainer.hidden = true;

    addressDiv.innerHTML = `Target Address:<br />${address}`;

    visitBtn.hidden = false;

    const targetAddress = address;
    const qrcodeEl = document.getElementById('qrcode');
    qrcodeEl.setAttribute('data-address', targetAddress);

    // eslint-disable-next-line no-new
    new QRCode(qrcodeEl, {
      text: targetAddress,
    });

    if (!isReadOnly) {
      editContainer.hidden = false;
      document.querySelectorAll('.app-form .address-input').forEach((addressInput) => {
        addressInput.value = address;
      });
    } else {
      editContainer.hidden = true;
    }
  }
}

/**
 * When the document has finished loading
 * */
function handleDocumentLoaded() {
  // console.log('document loaded');
  let address = getAddress();
  address = cleanAddress(address);
  applyAddress(address);
}
window.addEventListener('load', handleDocumentLoaded);

/**
 * Handle when the user clicks the button
 * */
// eslint-disable-next-line no-unused-vars
function handleButtonClicked() {
  let address = getAddress();
  address = cleanAddress(address);

  // window.open(address, '_blank')
  window.location.href = address;
}

/**
 * Handle if the edit button was clicked
 * */
// eslint-disable-next-line no-unused-vars
function handleEditButtonClicked() {
  const editForm = document.querySelector('.edit-container .edit-form');
  editForm.hidden = !editForm.hidden;
}
