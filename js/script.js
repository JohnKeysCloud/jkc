const openModal = document.querySelector('.project-stack');
const closeModal = document.querySelector('.close-btn')
let modalOpen = false;

openModal.addEventListener('click', () => {
  if(!modalOpen) {
    openModal.classList.add('open');
    modalOpen = true;
    }
}); 

closeModal.addEventListener('click', () => {
  if (modalOpen) {
    openModal.classList.remove('open');
    modalOpen = false;
  }
});