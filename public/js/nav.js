const newNav = () => {
  let nav = document.querySelector("#header");

  nav.innerHTML = `

    
  <nav class="navbar justify-content-between">
  <div class="nav-items">
    <!-- Search bar -->
    <div class="search_box form-inline">
      <form class="form-inline">
        <input type="text" placeholder="Search here...." class="input_box">
        <button type="submit" class="triggerSearch reg-btn"><i class="fa fa-search icon"></i></button>
      </form>
    </div>
    <!-- end of search bar -->
    <div id="ss-icon">
      <div class="icon-container">
        <div>
          <a href="cart.html" class="sh"><i class="fa-solid  fa-cart-shopping"></i></a>
        </div>
        <div>
          <button class="nav-btn-dd btn-1 nav-icon " type="button"><i
              class="fa-sharp fa-solid fa-bars"></i></button>
        </div>
      </div>
    </div>
  </div>
  <a href="/"><img src="../images/logoh2t_home.png" class="logo-img" width="80px" height="50px" /></a>
  <div id="menu">
    <button class="close-btn"><i class="fa-solid fa-x"></i></button>
    <ul class="list">
      <li class="sub-header"><a href="/mens" class="sh sub-btn">Men</a></li>
      <li class="sub-header"><a href="/women" class="sh sub-btn">Women</a></li>
      <li class="sub-header"><a href="/accessories" class="sh sub-btn">Accessories</a></li>
      <li class="sub-header"><a href="/seller" class="sh sub-btn">Sell</a>
      <li><button class="login-btn"><a class='center-text' href="/login">Login</a></button></li>
      <li><button class="signup-btn"><a class='center-text' href=/signup>Signup</a></button></li>
      <li><a href="#"><i class="fa-regular fa-bell"></i></a></li>
      <li><a href="/cart" class="sh"><i class="fa-solid fa-cart-shopping"></i></a></li>
      <li id="user_profile" class="hide"><a href="/profile"><i class="fa-regular fa-user user_profile"></i></a></liv>
    </ul>
  </div>
</nav>
`;
};

newNav();

// nav popup
const userIcon = document.querySelector("#user_profile");
console.log(userIcon);
const loginBtn = document.querySelector(".login-btn");
console.log(loginBtn);
const signupBtn = document.querySelector(".signup-btn");
console.log(signupBtn);

// loginBtn.addEventListener("click", () => {
//   userIcon.classList.toggle("hide");
//   console.log("this works")
// });

// window.onload = () => {
//   let user = JSON.parse(sessionStorage.user || null);
//   if (user != null) {
//     // already logged in
//     userIcon.classList.remove("hide")

//     loginBtn.addEventListener("click", () => {
//       sessionStorage.clear();
//       location.reload();
//     });
//   } else {
//     // user logged out
//     userIcon.classList.add("hide")
//     loginBtn.addEventListener("click", () => {
//       location.href = "/login";
//     });
//   }
// };

// search box
// const searchBtn = document.querySelector(".search-btn");
// const searchBox = document.querySelector(".search-box");
// searchBtn.addEventListener("click", () => {
//   if (searchBox.value.length) {
//     location.href = `/search/${searchBox.value}`;
//   }
// });

// sidebar
// const sideBar = document.getElementById("bar");
// const close = document.getElementById("close");
// const nav = document.getElementById("navbar");
// const h = document.getElementById("home");
// const x = document.getElementById("homeBtn");

// if (bar) {
//   bar.addEventListener("click", () => {
//     nav.classList.add("active");
//   });
// }

// if (close) {
//   close.addEventListener("click", () => {
//     nav.classList.remove("active");
//   });
// }

// active link
// const navbar = document.querySelector("#navbar").querySelectorAll("a");
// console.log(navbar);

// navbar.forEach((element) => {
//   element.addEventListener("click", function () {
//     navbar.forEach((nav) => nav.classList.remove('active'));

//     this.class += "active";
//   });
// });
