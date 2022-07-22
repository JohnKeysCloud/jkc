const openModal = document.querySelector('.nav-toggle');
const closeModal = document.querySelector('.close-btn')
let modalOpen = false;

openModal.addEventListener('click', () => {
  if (!modalOpen) {
    openModal.classList.add('open');
    modalOpen = true;
  } else {
    openModal.classList.remove('open');
    modalOpen = false;
  }
}); 

const openBtnContainer = document.getElementsByClassName("modal-trigger")[0];

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



// Start to target all items within array
// for (var i = 0; i < openModal.length; i++) {
//   openModal[i].classList.add('open');
// };




const el = document.querySelector("#full-nav");


const observer = new IntersectionObserver(
  ([e]) => e.target.classList.toggle("is-pinned", e.intersectionRatio < 1),
  { threshold: [1] }
);

observer.observe(el);