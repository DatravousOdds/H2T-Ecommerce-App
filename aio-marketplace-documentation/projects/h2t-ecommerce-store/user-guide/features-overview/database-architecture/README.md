---
description: Overview of the Firestore database  structure for the AIO Marketplace.
---

# Database Architecture

### User Profile Schema

Detailed documentation of the userProfiles collection structure.

#### Core Profile Data

```javascript
userProfiles/{email}
- firstName: string
- lastName: string
- email: string
- phoneNumber: string
- username: string
- lastUpdated: timestamp
```

### Shipping Information

```javascript
// Fields within userProfile document
- address1: string
- address2: string
- city: string
- state: string
- postalCode: number
```

#### Profile Images

Fields for storing profile media:

* `profileImage`: string (S3 URL)
* `backgroundImage`: string (S3 URL)

#### Account Statistics

Fields for user engagement:

* `wallet`: map
  * `balance`: number
  * `currency`: string
  * `status`: string
  * `lastUpdated`: timestamp

### Sub-Collections

#### Recent Activities

* **Collection**: `recentActivities`
* **Document ID**: Auto-generated
* **Fields**:
  * `type`: string ("alert" | "order")
  * `title`: string
  * `details`: string
  * `timestamp`: timestamp
  * `status`: string

### JavaScript Implementation

#### Fetching User Profile

```javascript
const fetchUserProfile = async (email) => {
  // Code example here
}
```

### Updating Profile Information

```javascript
const updateProfile = async (email, updateData) => {
  // Code example here
}
```

### Usage Examples

#### \`Loading Profile Data

```javascript
// Example of how to load profile data
window.onload = async () => {
  // Implementation example
}
```

#### Updating Shipping Information

```javascript
// Example of updating shipping info
const updateShipping = async () => {
  // Implementation example
}
```

#### Security Rules

Important Firestore



















