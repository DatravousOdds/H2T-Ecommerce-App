const newNav = () => {
  let nav = document.querySelector("#header");

  nav.innerHTML = `

    
  <nav class="navbar" aria-label="main navigation">

<!-- Left section with search and logo -->
<div class="search-section">
  <form class="search-form" role="search">
  <button type="submit" class="search-button" aria-label="Search">
     <i class="fa-solid fa-magnifying-glass"></i>
    </button>
    <input type="text" placeholder="Search here...." class="search-input" aria-label="Search Products">
    
  </form>

  <a href="/"><img src="../images/logoh2t_home.png" class="logo-img" width="80px" height="50px"/></a>
</div>

<!-- Mobile menu button -->
<button class="menu-button" aria-label="Menu"
        aria-expanded="false"
        aria-controls="main-menu">
  <i class="fa-solid fa-bars"></i>
</button>


<!-- Navigation menu -->
<div class="nav-menu" id="main-menu" aria-hidden="true">
    <button class="close-btn" aria-label="Close Menu" aria-controls="main-menu">
      <i class="fa-solid fa-x"></i>
    </button>
 
  
    <ul class="nav-list">
            <li><a href="/mens" class="nav-link">Men</a></li>
            <li><a href="/women" class="nav-link">Women</a></li>
            <li><a href="/accessories" class="nav-link">Accessories</a></li>
            <li><a href="/seller" class="nav-link">Sell</a></li>
            <li>
                <a href="/login" class="button-link login-button">Login</a>
            </li>
            <li>
                <a href="/signup" class="button-link signup-button">Signup</a>
            </li>
            <li>
                <a href="#notifications" 
                   class="nav-link" 
                   aria-label="Notifications">
                    <i class="fa-regular fa-bell"></i>
                </a>
            </li>
           <li>
    <a href="/cart" 
       class="nav-link cart-link" 
       aria-label="Shopping cart">
        <i class="fa-solid fa-cart-shopping"></i>
        <span class="cart-amount" aria-label="Cart items">0</span>
    </a>
</li>
            <li>
                <a href="/profile" 
                   class="nav-link" 
                   aria-label="User profile">
                    <i class="fa-regular fa-user"></i>
                </a>
            </li>
      </ul>
  </div>
</nav>
`;
};

newNav();
