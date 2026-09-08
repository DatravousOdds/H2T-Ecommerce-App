---
description: Documentation for seller-related data structures
---

# Seller Dashboard Schema

## Seller Overview

```javascript
sellerOverview: {
    totalRevenue: number,
    activeListings: number,
    productsSold: number,
    sellerRating: number,
    monthlySales: {
        january: number,
        february: number,
        // ... other months
    }
}
```

## Recent Activities

```javascript
recentActivities/{activityId}
- type: string ("alert" | "order")
- title: string
- details: string
- timestamp: timestamp
- status: string
```

## Implementation Details

### Fetching User Profile

```javascript
// Example code for fetching user profile
const fetchUserProfile = async (email) => {
  // Implementation
}
```



### Updating Profile

```javascript
// Example code for updating profile
const updateProfile = async (email, data) => {
// Implementation
}
```

### Security Considerations

* Authentication requirements
* Data access rules
* Field validation

### Data Flow

* Profile creation flow
* Update operations
* Data validation process











