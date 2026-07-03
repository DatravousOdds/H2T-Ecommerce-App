import { checkUserStatus } from "../auth/auth.js";
import { db, doc, updateDoc } from "../api/firebase-client.js";

const createNewsletter = () => {
    const newsletter = document.getElementById('newsletter');
    if (!newsletter) return;

    newsletter.innerHTML = `
    <div class="newstext">
          <!-- change later, look at planning sheet -->
          <h4>Sign Up for Newsletter</h4>
          <!-- change later, look at planning sheet -->
          <p>
            Get E-mail updates about latest shop and <span>special offers</span>
          </p>
          <p class="signup-text hidden"></p>
    </div>
    <form class="form">
          <input type="email" placeholder="  Your email address" required />
          <button type="submit" class="normal">Sign Up</button>
    </form>

    `;

    wireNewsletterForm();
}

function wireNewsletterForm() {
    const newsletter = document.getElementById('newsletter');
    const form = newsletter.querySelector('.form');
    const input = form.querySelector('input');
    const signupText = newsletter.querySelector('.signup-text');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!input.checkValidity()) {
            input.reportValidity();
            return;
        }

        const currentUser = await checkUserStatus();
        if (!currentUser) {
            signupText.textContent = 'Please log in to sign up for the newsletter.';
            signupText.classList.remove('hidden');
            return;
        }

        try {
            await updateDoc(doc(db, 'userProfiles', currentUser.userId), {
                'appSettings.newsletter': true,
            });

            form.classList.add('hidden');
            signupText.textContent = 'Thanks for signing up!';
            signupText.classList.remove('hidden');
        } catch (error) {
            console.error('Error saving newsletter preference:', error);
            signupText.textContent = 'Something went wrong -- please try again.';
            signupText.classList.remove('hidden');
        }
    });
}

createNewsletter();
