const createFooter = () => {
  let footer = document.querySelector("footer");

  footer.innerHTML = `
    <div class="col">
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
      <h4>About Us</h4>
      <a href="#">Head-To-Toe, Inc.</a>
      <a href="#">Policies</a>
      <a href="#">Investors</a>
      <a href="#">Careers</a>
      <a href="#">Impact</a>
    </div>
    <!-- gird-container-4 -->
    <div class="col">
      <h4>Help</h4>
      <a href="#">Help Center</a>
      <a href="#">Privacy Settings</a>
      
    </div>

    <div class="col">
      <h4>Sell</h4>
      <a href="#">Sell on H2T</a>
      <a href="#">Teams</a>
      <a href="#">Forums</a>
      <a href="#">Affiliates & Creators</a>
    </div>


    <!-- gird-container-5 -->
    <div class="col install">
      
      <p>Secure payment Gateways </p>
      <!-- Find payment Gateways image and paste below -->
      <img src="images/pay.jpg" alt="">
    </div>

    <div class="rights">
      <p>&copy; 2023, Head-To-Toe etc - Ecommerce website. All rights Reserved.</p>
    </div>
`;
};

createFooter();
