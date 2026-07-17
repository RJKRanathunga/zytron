const sidebar = document.getElementById('sidebar');
const mobileMenu = document.getElementById('mobileMenu');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message, detail = 'The prototype action has been completed.') {
  if (!toast) return;
  toast.querySelector('strong').textContent = message;
  toast.querySelector('small').textContent = detail;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

if (mobileMenu && sidebar) {
  mobileMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (event) => {
    if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(event.target) && event.target !== mobileMenu) sidebar.classList.remove('open');
  });
}

document.querySelectorAll('[data-toast]').forEach((element) => {
  element.addEventListener('click', (event) => {
    if (element.tagName === 'A') event.preventDefault();
    showToast(element.dataset.toast);
    if (sidebar) sidebar.classList.remove('open');
  });
});

document.querySelectorAll('.segmented button').forEach((button) => {
  button.addEventListener('click', () => {
    button.parentElement.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    showToast(`${button.textContent.trim()} filter selected`, 'The dashboard view has been filtered.');
  });
});

function closeModals() {
  document.querySelectorAll('.modal-backdrop.open').forEach((modal) => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  });
}

document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    const modal = document.getElementById(button.dataset.modal);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  });
});

document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => {
  if (event.target === backdrop) closeModals();
}));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModals(); });

document.querySelectorAll('[data-confirm]').forEach((button) => {
  button.addEventListener('click', () => {
    const message = button.dataset.confirm;
    closeModals();
    showToast(message, 'The corresponding workflow is now reflected in the prototype.');
  });
});
