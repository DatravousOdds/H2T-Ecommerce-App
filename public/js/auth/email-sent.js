import { getAuth, sendPasswordResetEmail } from "../api/firebase-client.js";

const auth = getAuth();

const emailDisplay = document.getElementById("email");
const resendBtn = document.getElementById("resend-btn")
const resendIcon = document.querySelector(".resend-btn i");
const counter = document.getElementById("countdown-timer");

const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email');

if (emailDisplay && userEmail) {
    emailDisplay.innerText = userEmail;
}


let count;

function startCountdown(initCount = 60) {
    count = initCount;
    resendBtn.disabled = true;
    resendBtn.classList.add('disabled-btn')
    const timer = setInterval(()=> {
        counter.innerText = `${count}s`;
        count--;

        if (count < 0) {
            clearInterval(timer)
            resendBtn.disabled = false;
            resendBtn.classList.remove('disabled-btn');
            counter.innerHTML = "";

            if (resendIcon) {
            resendIcon.style.animationPlayState = 'paused';
            }
        }

        

    }, 1000)

    return timer;
}


let countdown = startCountdown(60);

resendBtn.addEventListener('click', async () => {

    if (resendBtn.disabled) return;
    
    try {
        // send email reset
       await sendPasswordResetEmail(auth, userEmail)
       
       console.log('Password reset email sent to:', userEmail)
       
       countdown = startCountdown(60);
       

    //    resendBtn.innerHTML = `<i class="fas fa-clock"></i> Resend in <span id="countdown-timer">${count}s</span>`;

    } catch(error) {
        console.error("Error during password reset:", error);
    }
})



