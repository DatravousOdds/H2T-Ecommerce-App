---
description: This page describes all the learning, terms and error encountered
---

# Postgres SQL

## Reverting Changes&#x20;

I came across a problem that when I created an import case of item that I need to get into a table. There were things that were imported incorrectly. I have imported this through the post GUI that allows you to do so. Here are some options that allow you to reverted change based on that way I have imported.

### &#x20;What worked for me?

\
\
I created a column in my bid\_items called created\_at, that allowed to see when the row was instead into the table. So I can do revert the batch that I created is the following query below:\
\
`SELECT * FROM bid_items WHERE created_at = '2026-04-01'`

This will give all the items that was imported yesterday for bid\_items, then afterwards will want to use a DELETE syntax that allows use to delete all the rows from the bid\_items table that was incorrect.

`DELETE * FROM table_name WHERE created_at = yourTimestamp;`



### GROUP BY

#### What is GROUP BY statement?  When to use it?

Group by statement is needed when there is an aggregate function in the statement, aggregate function is any statement wrapped in a function for example to get the total of all items in a column you can use the aggregate function SUM(column\_name).

### ADD \[Column Name]

To add an additional column in postgresSQL, to must first alter the table, speificying the table new and then following by the ADD keyword, plus the column name.&#x20;

```plsql
ALTER [table_name] ADD [column_name] [data_type]
```

### COALSCE(return\_if\_false, state)
