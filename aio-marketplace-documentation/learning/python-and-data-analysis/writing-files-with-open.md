---
icon: pen
---

# Writing Files with Open

To write to files in python you can use the `open()` method  combined with the `with()` method that is used to open files. When using the `open()` method it takes in two parameters the first one is the file you want to write to and the second is the method you want to use on the file. There are few different method `"w"`, write allows you to write to a file. The append method `("a")`, which allows you to append to a file. Using the write() method overrides all existing data being used so be very careful when using this to write data.

```python
fileName =  "example.txt"

with open(fileName, "w") as writeFile:
        writeFile.write("Override/n") # this will override any exisiting data

        
```

### Writing to a file using a list and loops

You can also can a list of text and loop through that list and write your data to a file. First you would need to create list, make the to add the `"/n"` character at the end as this will separate each line in the file when added. Then simply create a for loop to loop through that list of text and use the `write()` method to write each line onto the file.

### Appending data to an existing file

There is also another method called append that allows you to append data to a file without overriding the data that already in the file. This is the 'a', method that you specify when opening the file using the `with()` method, when using this method make sure to end each line with an `"/n"` to indicate the sentence or line ends there

### Copying contents from one file to another

You can also copy content from one file to another file in python to do this you must specify the source file with the `with()` method set to `"r" (read mode)`, as you will be reading the source file data, then within the `with()` clause open another file but with file we want this to set to "w" mode as you will reading from one file and writing to the destination file. You can write to the other file using a for loop that will loop through each line and write to the destination file, don't forget to include a `"/n"`,  after each line inside the for loop.

### File modes in Python (syntax and use cases)

When reading the file there is some additional methods you can use to reading and writing to a file.

\
**r+**: Allows you to read and write from the file, this will not overwrite data that's always there  &#x20;

**a+**: Allows you to append data to a file and write as well.

**w+**: Allows you to write to a file but this will overwrite the existing data.

### File attributes

To view the path of a file you can use the name() method, this will provide you with the path of the file specified. You can also view the current mode of the file being used using the mode() this will return "w", "r" and you can also verify if a file is closed or not by using the .closed() method.

