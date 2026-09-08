---
description: >-
  Describes all the things related to python and common patterns used in
  projects
icon: snake
cover: >-
  https://images.unsplash.com/photo-1649180556628-9ba704115795?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHw1fHxweXRob258ZW58MHx8fHwxNzUwMTkwMTg2fDA&ixlib=rb-4.1.0&q=85
coverY: 0
---

# Python & Data Analysis

**Pandas: Loading Data**

Pandas is an open source tools for allowing you to multiplate  data to conduct different types of analysis, which is a library that is commonly used by data scientist and data analysis

**Index:** When using pandas, it is a great way to allow you to index certain, which can be import from different data sources including spreadsheets, excel spreadsheet, and database such as SQL.

**Data Structures**: You can use pandas to create your own custom data structures from the data you are importing using pandas

**Merges and Joins**: You can complex different types of data using joins and merges similar to what is use in query query languages. To create useful and complex datasets that you can use to your liking.

### Data Structures&#x20;

There are two mainly used data structures used in pandas, which are Data Frames and Series.

**Series**: A one-dimensional array used for handling single rows or columns of data. It consists of two main components: an actual array of data and an associated array of index labels. The index is used to access specific data from the data labels.

**Data Frames**: Two-dimensional, size-mutable, tabular data structures with labeled axes (rows and columns). They can be created by loading data from various sources such as Excel spreadsheets, datasets, or SQL databases. Additionally, data frames can be formed from lists, dictionaries, or

## Importing Pandas

To import the pandas library and use first we must import it by using the import key word `import` the specify the library we want to use in this case we want to use the pandas library so we would write out:<br>

```python
import pandas as pd # imports the pandas library
```

Please ensure that you first have the pid install pandas library installed before preceding with the following above, if not to install the pid command use the following command&#x20;

```bash
!pid install pandas
```

#### Creating Data Frames&#x20;

You can create data frames many ways using list, dictionaries or list of dictionaries. This is how you create one using a dictionary in python

```python
x = {"Name": ["Travis", "John", "Timmy"], "ID":[1,2,3], "States": ["TX","GA","LA"] }

df = pd.DataFrames(x) # coverts dictionary to a tabular display
print(df)
```



| Name   | ID | States |
| ------ | -- | ------ |
| Travis | 1  | TX     |
| John   | 2  | GA     |
| Timmy  | 3  | LA     |

#### Selecting Columns&#x20;

In python you can select columns in a data frame by specifying the variable which the data frame is stored in and then use double square brackets. Inside the brackets then use double quotes specifying the column you want to get an example is provided below for you

```python
# assign data frames to dataframes
a = df[["Names"]]
```

You can also select multiple columns similar to how you do in selecting a single column by just adding the additional columns names&#x20;
