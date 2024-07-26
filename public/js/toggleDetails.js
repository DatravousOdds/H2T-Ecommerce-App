
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".detail-subheader").forEach(function (expandBtn) {
    expandBtn.addEventListener("click", function () {
      const detailText =
        this.closest(".detail-container").querySelector(".detail-text");
      if (detailText.classList.contains("expanded")) {
        detailText.classList.remove("expanded");
        // detailText.style.display = "block";
        this.querySelector("i").classList.remove("fa-minus");
        this.querySelector("i").classList.add("fa-plus");
      } else {
        detailText.classList.add("expanded");
        this.querySelector("i").classList.remove("fa-plus");
        this.querySelector("i").classList.add("fa-minus");
      }
    });
  });
});
6                                                  