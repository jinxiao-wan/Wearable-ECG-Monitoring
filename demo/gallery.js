'use strict';
const dialog = document.getElementById('image-dialog');
const enlarged = document.getElementById('enlarged-image');
const caption = document.getElementById('image-caption');
const original = document.getElementById('image-original');
for (const button of document.querySelectorAll('[data-image]')) {
  button.addEventListener('click', () => {
    const title = button.dataset.caption;
    enlarged.src = button.dataset.image;
    enlarged.alt = title;
    caption.textContent = title;
    original.href = button.dataset.image;
    dialog.showModal();
  });
}
document.getElementById('close-image').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
