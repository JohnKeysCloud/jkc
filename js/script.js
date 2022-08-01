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


const modalTriggerBtn = document.querySelector('#clickMeContainer');
const inception = document.querySelector(".project-stack");
let modalOpen = false;

modalTriggerBtn.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    inception.classList.add("inception");
    clickMe.classList.add("clicked");
    modalOpen = true;
  }
}); 

const openBtnContainer = document.querySelector(".modal-trigger");
const clickMe = document.querySelector("#levelOne");
const closeModal = document.querySelector(".close-btn");


openBtnContainer.addEventListener("click", () => {
  if (!modalOpen) {
    openBtnContainer.classList.add("open");
    clickMe.classList.add("clicked")
    inception.classList.add("inception");
    modalOpen = true;
  }
}); 
closeModal.addEventListener('click', () => {
  if (modalOpen) {
    openBtnContainer.classList.remove("open");
    inception.classList.remove("inception");
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

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth",
    });
  });
});