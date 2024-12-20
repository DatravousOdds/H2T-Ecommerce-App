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

    <!-- Small screen nav -->
    <div class="small-screen-nav-container">
      <ul class="small-screen-nav">
        <li>
          <a href="#notifications" class="nav-link" aria-label="Notifications">
            <i class="fa-regular fa-bell"></i>
          </a>
        </li>
      <li>
          <a href="/profile" class="nav-link" aria-label="User profile">
            <i class="fa-regular fa-user"></i>
          </a>
        </li>
        <li>
          <a href="/cart" class="nav-link cart-link" aria-label="Shopping cart">
            <i class="fa-solid fa-bag-shopping"></i>
            <span class="cart-amount" aria-label="Cart items">0</span>
          </a>
          </li>
      </ul>
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
    <div class="slide-menu-overlay">
    <div class="slide-menu" id="slide-menu" aria-hidden="true">
      <div class="menu-header">
        
        <button class="close-slide-menu" aria-label="Close Menu" aria-controls="slide-menu">
          <i class="fa-solid fa-x"></i>
        </button>
      </div>
      
      
      <ul class="slide-menu-list">
        <li>
          <a href="/profile" class="menu-item">
            <i class="fa-regular fa-user"></i>
            <span>Profile</span>
          </a>
        </li>
        <li>
          <a href="/" class="menu-item">
            <i class="fa-solid fa-home"></i>
            <span>Home</span>
          </a>
        </li>
        <!-- Shop dropdown -->
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
        <!-- Services dropdown -->
        <li class="menu-dropdown">
          <button class="menu-item dropdown-trigger">
            <i class="fa-solid fa-screwdriver"></i>
            <span>Services</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <ul class="submenu">
            <li><a href="/repair">Repair</a></li>
            <li><a href="/authentication">Authentication</a></li>
            <li><a href="/trade-in">Trade-in</a></li>
          </ul>
        </li>
        <li>
          <a href="/seller" class="menu-item">
            <i class="fa-solid fa-store"></i>
            <span>Sell</span>
          </a>
        </li>
        
        <li>
          <a href="/signup" class="menu-item">
            <i class="fa-solid fa-user-plus"></i>
            <span>Signup</span>
          </a>
        </li>
        
        <li>
          <a href="/login" class="menu-item">
            <i class="fa-solid fa-sign-in-alt"></i>
            <span>Login</span>
          </a>
        </li>
        <li>
          <a href="/help" class="menu-item">
            <i class="fa-solid fa-question"></i>
            <span>Help</span>
          </a>
        </li>
      </ul>
    </div>
    </div>
  </nav>
  `;

  // And update your JavaScript event listeners
  const dropdownTrigger = nav.querySelectorAll(".dropdown-trigger");
  const submenu = nav.querySelector(".submenu");
  const menuButton = nav.querySelector(".menu-button");
  const slideMenu = nav.querySelector(".slide-menu");
  const closeSlideMenu = nav.querySelector(".close-slide-menu");
  const slideMenuOverlay = nav.querySelector(".slide-menu-overlay");
  // Mobile menu button
  menuButton.addEventListener("click", () => {
    slideMenu.classList.toggle("active");
    slideMenuOverlay.classList.toggle("active");
  });

  closeSlideMenu.addEventListener("click", () => {
    slideMenu.classList.remove("active");
    slideMenuOverlay.classList.remove("active");
  });

  // Add event listeners to each dropdown trigger
  dropdownTrigger.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const menuItem = trigger.closest(".menu-dropdown");

      trigger.classList.toggle("expanded");

      const submenu = menuItem.querySelector(".submenu");

      submenu.classList.toggle("active");
    });
  });
};

newNav();
