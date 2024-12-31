document.querySelectorAll(".wishlist-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    btn.classList.toggle("active");

    const icon = btn.querySelector("i");
    icon.classList.toggle("bi-heart-fill");
    icon.classList.toggle("bi-heart");
  });
});

// Notify Me
document.querySelectorAll(".notify-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Skip if already notified
    if (btn.classList.contains("notified")) {
      btn.classList.remove("notified");
      btn.innerHTML = `
        <i class="bi bi-bell"></i>
        <span>Notify Me</span>
      `;

      return;
    }

    // Start loading state
    btn.classList.add("loading");
    btn.textContent = "";

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Set permanent notified state
      btn.classList.remove("loading");
      btn.classList.add("notified");

      // Add bell icon and text
      const icon = document.createElement("i");
      icon.className = "bi bi-bell-fill";
      const text = document.createElement("span");
      text.textContent = "Notified!";

      btn.appendChild(icon);
      btn.appendChild(text);
    } catch (error) {
      // Handle error - revert to original state
      btn.classList.remove("loading");
      btn.textContent = "Notify Me";
    }
  });
});
