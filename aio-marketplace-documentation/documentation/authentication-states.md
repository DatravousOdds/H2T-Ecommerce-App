# Authentication States

### 1. Not Authenticated

* No user data in storage
* Show login/signup buttons
* Restrict access to protected routes

### 2. Authenticated

* User data in both sessionStorage and localStorage
* Show user profile menu
* Allow access to protected routes

### 3. Session Management

* sessionStorage: Temporary (cleared when browser closes)
* localStorage: Persistent (remains until explicitly cleared)

