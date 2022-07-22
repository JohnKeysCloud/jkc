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

const openBtnContainer = document.getElementsByClassName("modal-trigger")[0];
const closeModal = document.querySelector(".close-btn");

let modalOpen = false;

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


const stickyCheck = document.querySelector("#full-nav");

const observer = new IntersectionObserver(
  ([e]) => {
    return e.target.classList.toggle("is-pinned", e.intersectionRatio < 1);
  },
  { threshold: [1] }
);

observer.observe(stickyCheck);