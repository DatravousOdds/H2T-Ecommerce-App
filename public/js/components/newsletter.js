const createNewsletter = () => {
    const newsletter = document.getElementById('newsletter');

    newsletter.innerHTML = `
    <div class="newstext">
          <!-- change later, look at planning sheet -->
          <h4>Sign Up for Newsletter</h4>
          <!-- change later, look at planning sheet -->
          <p>
            Get E-mail updates about latest shop and <span>special offers</span>
          </p>
    </div>
    <div class="form">
          <input type="text" placeholder="  Your email address" />
          <button class="normal">Sign Up</button>
    </div>
    
    `;
}

createNewsletter();

