const key = document.getElementById('key-img')
const openModal = document.querySelector('.nav-toggle');
let navOpen = false;
key.addEventListener('click', () => {
  if (!navOpen) {
    openModal.classList.add('open');
    navOpen = true;
  } else {
    openModal.classList.remove('open');
    navOpen = false;
  }
}); 


const logoModalTrigger = document.querySelector(".logo-modal-trigger")
let modalOpen = false;
logoModalTrigger.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    modalOpen = true;
  } else {
    openBtnContainer.classList.remove("open");
    modalOpen = false;
  }
}); 


const openBtnContainer = document.querySelector(".modal-trigger");
const closeModal = document.querySelector(".close-btn");

openBtnContainer.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    modalOpen = true;
  }
}); 
closeModal.addEventListener('click', () => {
  if (modalOpen) {
    openBtnContainer.classList.remove("open");
    modalOpen = false;
  }
});

const stickyCheck = document.querySelector("#navigation");
const observer = new IntersectionObserver(
  ([e]) => {
    return e.target.classList.toggle("is-pinned", e.intersectionRatio < 1);
  },
  { threshold: [1] }
);
observer.observe(stickyCheck);