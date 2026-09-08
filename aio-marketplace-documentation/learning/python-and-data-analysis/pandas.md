---
icon: raccoon
---

# Pandas

### Loading csv files in pandas

When using pandas in python you often times will be loading csv files from other sources and loading them into a data frames. You can do this by using the `read_csv()` , what this does is allow you to turn csv file into a data frame. The `read_csv()` method takes the path to the csv file as an argument.

Once this is done we can use the `read_excel()` method to read the csv file and use the `head()` method method which return the first five rows of the data frame.

### Viewing Data and Accessing Data

You have the choice of retrieving data as a series and to do that you just use the single columns specify the column that you want to get.

#### Example

```python
x = df["Product"] # return series
```

To return the results as a data frame you would simply use double brackets. You can also get multiple columns by specifying the columns you want separated by commas.

#### Example

```python
a = df["Product","ID","Genres"]
```

To get unique  items from the data frames, you can simple specify the index of the item you want to retrieve.

### Indexing and Slicing&#x20;

One way to get unique items from the data frame is by using the index from the table. For example to get the 1st row item you would code the following below&#x20;

```python
a = df.iloc[0,0] 
```

Access an element by specifying the row index and column name

```python
a = df.loc[1,"Product"]
```

To slice a list and retrieve a range of elements, use a syntax similar to regular Python. Specify the range in brackets, separated by comma.

```python
e =  df.iloc[0:2,0:1]
```

### Resetting Indexes

To reset an index in a pandas Data Frame you can use the following commands

```python
# Resetting the index
tesla_data.reset_index(inplace=True)
# Return the first five rows
tesla_data.head()
```
