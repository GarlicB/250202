export class Modal {
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
  }
  open() {
    this.modal.style.display = "block";
  }
  close() {
    this.modal.style.display = "none";
  }
  addEventListener(selector, event, callback) {
    this.modal.querySelector(selector).addEventListener(event, callback);
  }
}