const newNav = () => {
  let nav = document.querySelector("#header");

  nav.innerHTML = `
  <nav class="navbar" aria-label="main navigation">
    <!-- Left section with search and logo -->
    <div class="search-section">
      <form class="search-form" role="search">
        <input type="text" placeholder="Search here...." class="search-input" aria-label="Search Products">
        <button type="submit" class="search-button" aria-label="Search">
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </form>

      <a href="/"><img src="../images/logoh2t_home.png" class="logo-img" width="80px" height="50px"/></a>
    </div>

    <!-- Mobile menu button -->
    <button class="menu-button" aria-label="Menu"
            aria-expanded="false"
            aria-controls="slide-menu">
      <i class="fa-solid fa-bars"></i>
    </button>

    <!-- Desktop Navigation menu -->
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
          <a href="#notifications" class="nav-link" aria-label="Notifications">
            <i class="fa-regular fa-bell"></i>
          </a>
        </li>
        <li>
          <a href="/cart" class="nav-link cart-link" aria-label="Shopping cart">
            <i class="fa-solid fa-bag-shopping"></i>
            <span class="cart-amount" aria-label="Cart items">0</span>
          </a>
        </li>
        <li>
          <a href="/profile" class="nav-link" aria-label="User profile">
            <i class="fa-regular fa-user"></i>
          </a>
        </li>
      </ul>
    </div>

    <!-- Mobile Slide-out menu -->
    <div class="slide-menu" id="slide-menu" aria-hidden="true">
      <div class="menu-header">
        <h2>Menu</h2>
        <button class="close-slide-menu" aria-label="Close Menu" aria-controls="slide-menu">
          <i class="fa-solid fa-x"></i>
        </button>
      </div>
      
      <ul class="slide-menu-list">
        <li>
          <a href="/" class="menu-item">
            <i class="fa-solid fa-home"></i>
            <span>Home</span>
          </a>
        </li>
        <li class="menu-dropdown">
          <button class="menu-item dropdown-trigger">
            <i class="fa-solid fa-shopping-bag"></i>
            <span>Shop</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <ul class="submenu">
            <li><a href="/mens">Men</a></li>
            <li><a href="/women">Women</a></li>
            <li><a href="/accessories">Accessories</a></li>
          </ul>
        </li>
        <li>
          <a href="/seller" class="menu-item">
            <i class="fa-solid fa-store"></i>
            <span>Sell</span>
          </a>
        </li>
        <li>
          <a href="/login" class="menu-item">
            <i class="fa-solid fa-sign-in-alt"></i>
            <span>Login</span>
          </a>
        </li>
        <li>
          <a href="/signup" class="menu-item">
            <i class="fa-solid fa-user-plus"></i>
            <span>Signup</span>
          </a>
        </li>
        <li>
          <a href="/profile" class="menu-item">
            <i class="fa-regular fa-user"></i>
            <span>Profile</span>
          </a>
        </li>
      </ul>
    </div>
  </nav>
  `;

  // Add event listeners after DOM insertion
  const menuButton = nav.querySelector(".menu-button");
  const closeSlideButton = nav.querySelector(".close-slide-menu");
  const slideMenu = nav.querySelector(".slide-menu");
  const dropdownTriggers = nav.querySelectorAll(".dropdown-trigger");

  // Toggle slide menu
  menuButton.addEventListener("click", () => {
    const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", !isExpanded);
    slideMenu.setAttribute("aria-hidden", isExpanded);
    slideMenu.classList.toggle("active");
  });
};

newNav();
