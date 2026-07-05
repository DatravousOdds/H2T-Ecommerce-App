const createFooter = () => {
  let footer = document.querySelector("footer");

  footer.innerHTML = `
    <div class="col">
      <div class="col">
      <h4>New Releases</h4>
      <a href="/releases">New Releases</a>
    </div>
      <div class="follow">
        <h4>Follow Us</h4>
        <div class="icon">
          <a href="https://x.com/hexxostore?s=11" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on X"><i class="fab fa-twitter"></i></a>
          <a href="https://www.instagram.com/hexxo.store" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on Instagram"><i class="fab fa-instagram"></i></a>
          <a href="https://www.tiktok.com/@hexxo.shop" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on TikTok"><i class="fa-brands fa-tiktok"></i></a>
        </div>
      </div>
    </div>
    <!-- gird-container-3 -->
    <div class="col">
      <h4>About Us</h4>
      <a href="/static/about.html">About Us</a>
    </div>
    <!-- gird-container-4 -->
    <div class="col">
      <h4>Help</h4>
      <a href="/contact">Contact Us</a>
      <a href="/terms">Terms of Service</a>
    </div>

    <div class="col">
      <h4>Sell</h4>
      <a href="/seller">Sell on Hexxo</a>
    </div>


    <!-- gird-container-5 -->
    <div class="col install">

      <p>Secure payment Gateways </p>
      <!-- Find payment Gateways image and paste below -->
      <img src="/images/pay.jpg" alt="">
    </div>

    <div class="rights">
      <p>&copy; 2026, Hexxo etc - Ecommerce website. All rights Reserved.</p>
    </div>
  `;
};

createFooter();
