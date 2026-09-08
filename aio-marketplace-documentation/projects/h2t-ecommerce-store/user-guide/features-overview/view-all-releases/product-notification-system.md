---
description: >-
  Add email notification functionality that sends the user a notification on the
  product of the user desires after selecting the size. User will be notify
  through sms text and email if the user chooses
---

# Product Notification System

### Feature Details&#x20;



#### Notification Modal Flow

1. User clicks the product that they want to be notified for drop
2. Modal opens showing the size available for the product
3. After size selection user can:\
   \- Enter email to be inform through email

#### UI Updates

**Button State Changes**

* Initial state: Default "Notify Me" button
* After notification set: Button turns green with checkmark icon
* \[In Progress] Toggle functionality to revert button state on second link



### HTML Implementation

```html
<!-- Button Component -->
<button class="notify-btn">
    <span class="bell-icon">🔔</span>
    <span class="check-icon" style="display: none">✓</span>
    Notify Me
</button>

<!-- Modal Component -->
<div class="notified-availablity-wrapper">
    <!-- Modal content structure -->
</div>

<!-- Toast Notification -->
<div class="toast-component">
    <!-- Toast content -->
</div>
```





### CSS Implementation

```css
/* Modal Styles */
.notified-availablity-wrapper {
    display: none;
    position: fixed;
    /* Other modal styles */
}

.notified-availablity-wrapper.active {
    display: block;
}

/* Button States */
.notify-btn {
    /* Default button styles */
}

.notify-success {
    /* Success state styles */
}

/* Size Selection */
.size-item {
    /* Size button styles */
}

.size-item.selected {
    /* Selected state styles */
}

/* Toast Notification */
.toast-component {
    /* Toast styles */
}
```



### Javascript Implementation



#### DOM Elements

```javascript
// Main notification elements
const notifcation = document.querySelectorAll(".notify-btn");
const noifiedModal = document.querySelector(".notified-availability-wrapper");
const notifiedCloseBtn = document.querySelector(".close-button");

// Size selection elements
const sizeItem = document.querySelectorAll(".size-item");

// Toast notification elements
const notificationModal = document.querySelector(".toast-component");
const closeButton = notificationModal.querySelector(".notification-close-btn");
const notifyButtons = document.querySelectorAll(".notify-me");


```

## Modal Management

### Variables and Selectors

<pre class="language-javascript"><code class="lang-javascript">// Track which notification button is currently active
let activeNotifyButton = null;

// Opening the Modal
const notifiedBtn = document.querySelectorAll(".notify-btn");

notifiedBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
    // Store reference to clicked button
    activeNotifyButton = btn;
    // Display Modal
    notifiedModal.classList.add("active");
    // Prevent background scrolling
    document.body.style.overflow = "hidden";
    });
});

// Closing the Modal
const notifiedCloseBtn = document.querySelector(".close-button");

notifiedCloseBtn.addEventListener("click", () => {
<strong>    // Hide Modal 
</strong>    notifiedModal.classList.remove("active");
    // Restore background scrolling
    document.body.style.overflow = "auto";
    // Clear active button reference
    activeNotifyButton = null;
});
</code></pre>

### Notification System

```javascript
// Show toast notification
function showNotification() {
  notificationModal.style.display = "flex";
  setTimeout(hideNotification, 5000);
}

// Hides toast notification with animation
function hideNotification() {
  notificationModal.classList.remove("show-notification");
  
  setTimeout(() => {
    notificationModal.style.display = "none";
  }, 300);
}

// Updates button state after successful notification
function handleNotifySuccess(button) {
  if (!button) return;

  button.classList.add("notify-success");
  button.setAttribute("disabled", true);

  const checkIcon = button.querySelector(".check-icon");
  const bellIcon = button.querySelector(".bell-icon");

  if (checkIcon) checkIcon.style.display = "contents";
  if (bellIcon) bellIcon.style.display = "none";
}

```

**Event  Flow**

1. User clicks "Notify Me" button

* Modal opens
* Active button is tracked

2. User selects size

* Previous selections are cleared
* Selected size is highlighted

3. User confirms notification

* Validates size selection&#x20;
* Show success toast
* Update button state
* Closes modal

**Known Issues**

* Button state doesn't toggle back after notification
* No persistence of notification preferences
* No email integration implemented yet

**Next Steps**

1. Implement button state toggle functionality&#x20;
2. Add email input and validation
3. Integrate with backend notification system
4. Add data persistence

### Future Improvements

* Add ESC key listener
* Add click-outside-to-close
* Add transition animations





































