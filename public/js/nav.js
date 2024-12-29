// Function to handle tabs submenu navigation
const handleTabs = () => {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".tab");

  if (tabs && tabBtns) {
    // Initially show the first tab
    tabs[0].classList.add("active");
    tabBtns[0].classList.add("active");
  }
  // Add click event listeners to each tab button
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      switchTabs(tab);
    });
  });

  // Function to switch tabs
  const switchTabs = (tabId) => {
    // Remove active class from all tabs and buttons
    tabs.forEach((t) => t.classList.remove("active"));
    tabBtns.forEach((btn) => btn.classList.remove("active"));

    // Add active class to selected tab and button
    document.getElementById(tabId).classList.add("active");
    document.getElementById(`.tab-btn[data-tab="${tabId}"]`);
  };

  // Return the switchTabs function so it can be used elsewhere
  return { switchTabs };
};

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
        <li class="has-dropdown">
          <a href="#" class="nav-link">Services
            <i class="fa-solid fa-chevron-down"></i>
          </a>
          <div class="services-dropdown">
            <div class="dropdown-content">
              <div class="services-grid">
                <!-- Authentication -->
                <a href="/authentication" class="service-item">
                  <div class="service-icon">
                    <i class="fa-solid fa-screwdriver"></i>
                  </div>
                  <div class="service-info">
                    <h4>Authentication</h4>
                    <p>Authenticate your products with our expert team.</p>
                    <span class="service-price">$30/item</span>
                  </div>
                </a>
                <!-- Trade-in -->
                <a href="/trade-request" class="service-item">
                  <div class="service-icon">
                    <i class="fa-solid fa-handshake"></i>
                  </div>
                  <div class="service-info">
                    <h4>Trade-in</h4>
                    <p>Trade in your products for a new one or store credit.</p>
                    <span class="service-price">Best Market Prices</span>
                  </div>
                </a>
                <!-- Sell to Us -->
                <a href="/sell-to-us" class="service-item">
                  <div class="service-icon">
                    <i class="fa-solid fa-store"></i>
                  </div>
                  <div class="service-info">
                    <h4>Sell to Us</h4>
                    <p>Quick and easy selling process.</p>
                    <span class="service-price">Competitive Prices</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </li>
        <li><a href="/releases" class="nav-link">Releases</a></li>
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
      <!-- profile dropdown -->
      <li class="menu-dropdown">
          <button class="menu-item dropdown-trigger">
            <i class="fa-regular fa-user"></i>
            <span>Profile</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <ul class="submenu">
            <li><a data-section="profile" href="/profile">Profile</a></li>
            <li><a data-section="payment" href="/profile">Payment Information</a></li>
            <li><a data-section="selling" href="/profile">Selling</a></li>
            <li><a data-section="favorites" href="/profile">Favorites</a></li>
            <li><a data-section="notifications" href="/profile">Notifications</a></li>
            <li><a data-section="purchases" href="/profile">Purchases</a></li>
            <li><a data-section="settings" href="/profile">Settings</a></li>
          </ul>
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
            <li><a href="/releases">Releases</a></li>
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
            <li><a href="/sell-to-us">Sell to Us</a></li>
            <li><a href="/authentication">Authentication</a></li>
            <li><a href="/trade-request">Trade-in</a></li>
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

  const { switchTabs } = handleTabs();

  const submenuLinks = nav.querySelectorAll(".submenu a");
  submenuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");
      console.log("section: ", section);

      // Hide all sections first
      switchTabs(section);

      // Close the mobile menu if it's open
      slideMenu.classList.remove("active");
      slideMenuOverlay.classList.remove("active");
    });
  });
};

newNav();
