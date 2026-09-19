---
description: This explains python data structures, how they works and with code snippets
---

# Python Data Structures

## List

A list is a data structure in Python that allows you to store different primitive data types. It supports various operations and is defined using square brackets \[]. Elements in a list are ordered, mutable, and separated by commas.

### Creating a list

Syntax:

```python
new_list = []
```

### Methods

#### append()

* Is used to add elements to the end of the a list

#### Syntax:

```python
list_name.append(element)
```

Example:

```python
fruits = ["apple","cookies","chips"]
fruits.append("cereal")
print(fruits)
# ['apple', 'cookies', 'chips', 'cereal']
```

#### copy()

* allows you to make a copy of the original list

#### Syntax:

```python
list_name.copy()
```

#### Example:

```python
new_fruits = fruits.copy()
print(new_fruits)
# ['apple', 'cookies', 'chips', 'cereal']
```

#### count()

* Is use to count the number of occurrence of a specific element in a list&#x20;

#### Syntax

```python
list_name.count(element) 
# (element) - is the item you want to count
```

#### Example

```python
binary_list = [0,0,0,1,1]
ones_count = binary_list.count(1)
print(binary_list.count(1)) # returns 2
print(ones_count) # returns 2
```

#### del

* allows you to delete an element from a list at a specific index

#### Syntax

```python
del list_name[index]
```

Example

```python
del binary_list[0] # removes element at index 0
print(binary_list) 
# prints [0, 0, 1, 1]
```
