---
description: >-
  This document outlines the structure for financial documents in our e-commerce
  platform, including monthly statements and tax documents.
---

# Statements and Tax Documents Schema

### Collection Structure

#### userProfiles/{email}/statements

Monthly financial statements are stored as subcollections under each user profile.

* **Document ID**: "{year}-{month}" (Example: "2025-01")
* **Purpose**: Store monthly financial information for sellers

### Schema

```
data: string | Display name |
dateGenerated: timestamps | Statement date |
downloadUrl: string |
item: Array | Display name |
month: number | Display name |
monthName: string | Display name |
title: string | Display name |
total: number | Display name |
transactions: array | Display name |
year: number | Display name |
```

#### userProfiles/{email}/taxDocuments

Tax documents such as 1099-K forms are stored as subcollections under each user profile.

* **Document ID**: Tax year (Example: "2024")
* **Purpose**: Store tax-related documents and information

### Schema for Tax Documents

```
1099k.formId | String | Form identifier
1099k.downloadUrl | String | Description
1099k.dueDate | Timestamp | Deadline for form submission |
1099k.issuedYear | Number | Tax year for which the form was issued |
1099k.status | String | Status |
description:  String | Description |
formType: String | Type of form submitted |
salesThreshold: number | The threshold amount taken
```



### Access Patterns

#### Loading Monthly Statements

```javascript

async function loadStatements(userData, statementId = "2025-01") {
  const statementList = document.querySelector(".statement-list");

  // Clear existing content
  statementList.innerHTML = "";

  if (!userData || !statementId) return null;

  try {
    const statementDocRef = doc(
      db,
      "userProfiles",
      userData.email,
      "statements",
      statementId
    );

    const statementSnapshot = await getDoc(statementDocRef);
    
    // Process tax document...
  } catch (error) {
    console.log("Error occurred loading data: ", error);
  }
}

```



### Fetching Tax Documents



### Security Considerations

* Access to financial documents should be restricted to the document owner only
* Tax documents contain sensitive information and require additional validation
* Implement security rules to prevent unauthorized access to financial data



















