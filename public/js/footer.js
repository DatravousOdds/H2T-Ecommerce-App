const createFooter = () => {
    let footer = document.querySelector('footer');

    footer.innerHTML = `
    <div class="col">
      <img class='lgo' src="images/white logo.jpg" alt="">
      <h4>Contact</h4>
      <p><strong>Address:</strong></p>
      <p><strong>Phone:</strong></p>
      <p><strong>Hours:</strong></p>
      <div class="follow">
        <h4>Follow Us</h4>
        <div class="icon">
          <i class="fab fa-facebook-f"></i>
          <i class="fab fa-twitter"></i>
          <i class="fab fa-instagram"></i>
          <i class="fa-brands fa-tiktok"></i>
          <i class="fab fa-youtube"></i>
        </div>
      </div>
    </div>
    <!-- gird-container-3 -->
    <div class="col">
      <h4>About</h4>
      <a href="#">About us</a>
      <a href="#">Help</a>
      <a href="#">Terms & Conditions</a>
      <a href="#">Privacy Policy</a>
      <a href="/contact">Contact Us</a>
      <a href="#">Your Order</a>
    </div>
    <!-- gird-container-4 -->
    <div class="col">
      <h4>My Account</h4>
      <a href="#">Air Jordan</a>
      <a href="#">Air Jordan Release Dates</a>
      <a href="#">Women Jordans</a>
      <a href="#">Air Jordan 11</a>
      <a href="#">Air Jordan 4</a>
      <a href="#">Jordan 1 Mid</a>
    </div>


    <!-- gird-container-5 -->
    <div class="col install">
      <h4>Download Our App</h4>
      <p>From App Store or Google Play</p>
      <div class="row">
        <!-- Insert Apple and Google Images below -->
        <a href="#"><img src="images/app.jpg" alt=""></a>
        <a href="#"><img src="images/play.jpg" alt=""></a>
      </div>
      <p>Secure payment Gateways </p>
      <!-- Find payment Gateways image and paste below -->
      <img src="images/pay.jpg" alt="">
    </div>

    <div class="rights">
      <p>&copy; 2023, Head-To-Toe etc - Ecommerce website. All rights Reserved.</p>
    </div>
`;
}

createFooter();