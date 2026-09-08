---
description: This defines the definition and purpose of CTEs
---

# CTEs

### What is a CTE?

A CTE (Common Table Expression) that allows us to define a query with a name, this is just a temporary table that allows you to organize complex queries and optimize performance. CTEs are much more readable and understandable then mulitple subquery.

#### Syntax

```
WITH query_name AS (
...your query
)
```

You can also have multiple queries within one CTE, all you have to do to add another query within a CTE, is by using a comma. Here is example

