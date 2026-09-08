---
icon: input-numeric
---

# NumPy

## What is NumPy?

Numpy is an open source python library use for working with arrays. This is widely used for linear algebra, fortier operation, and matrices. NumPy array objects are called **ndarrays,** which are arrays that are cast in a list. Arrays are used in this library as it is the quickest and efficient. NumPy stands for Numerical Python and is usual imported under the alias **`np`**&#x20;

```python
# import numpy
import numpy as np

# create a numpy array 
x = np.array([1,2,3,4])
```

You can index or select items from the array similar to how you would if you were retrieving items from a list data structure that is used in python. Using square brackets and selecting the item you want through a zero base index.

```python
x = np.array([1,2,3,4])

# print out each item
print("x[0]:",x[0])
print("x[1]:",x[1])
print("x[2]:",x[2])
print("x[3]:",x[3])
```

## Checking NumPy Version

You can check the version of the NumPy library by entering in the following command

```python
# printing out the version
print(np.__version__)
```

### Type

You can also check the type of the data structure you are using in NumPy, by typing in the following command

<pre class="language-python"><code class="lang-python">a = np.array([])

<strong># printing the type
</strong>type(a)

</code></pre>

Also check the type of the data inside the ndarray by using the following command

```python
# print out data tpye of elements
a = np.array([])
a.dtype
```

## 1D Array : Vectors

One dimensional arrays are called vectors, there can be a row vector or a column vector, depending on the orientation of the data.

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption><p>A picture of row and column vectors</p></figcaption></figure>

You can perform varies mathematics operations on vectors such as addition, subtraction, multiplication, and division. We conducting these operations the vector size should not changes what so ever, it should always remain the same regardless of the operation done to the vector.

You can also do mathematically operations with a constant (scalar), which you can do scalar addition, scalar subtraction, scalar product, which would result in finding the product of two vector with the scalar value included.

<figure><img src="../../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

## 2D Array : Matrices

Two dimensional array are called Matrices, which is a rectangular array, that consist of rows and columns&#x20;

### Creating a 2D Arrays

To create a two-dimensional array in NumPy, assign the array to a custom variable and use the array method with double brackets to specify the values, ensuring they are of the same type.

```python
# import packages
import numpy as np
# creating 2D array
2d_array = np.array([[1,2,3,], [4,5,6,],[7,8,9]])
# checking type 
type(2d_array)
```

This creates a rectangle structure, which can be visual as a matrix. Where each individual row corresponds to the each column value. The `np.array()`  converts a list into a 2D numpy array.&#x20;

### Array attributes

NumPy has several array attributes

```python
print(2d_array.ndim) # represents the depth of the dimesions
# output 2
print(2d_array.size) # represents the total number of item in the array
# output 9
print(2d_array.shape) # represents the number of columns and row shown in a tuple
# output (3,3)
```

### Indexing and slicing

NumPy allows you to access elements through indexes

```python
print(2d_array[1,2]) # access [2nd row, and 3rd column]
print(2d_array[:,0]) #
```

