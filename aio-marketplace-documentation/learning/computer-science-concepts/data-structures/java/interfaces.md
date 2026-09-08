# Interfaces

## The List Interface

An array is an index data structure, meaning that you can access a specific item in any arbitrary order determine by the subscript value

`<E>` - This represents the data type of objects stored in the list collection.

#### Example:

```java
List<String> names = new ArrayList<>(): // A list that only contains String
names.add("Alice"); // Valid
// names.add(124); // Complie-timer error
```

In list classes, references to objects are stored. Primitive types like `int`, `double`, `float`, and `char` must be encapsulated in wrapper classes such as `Integer`, `Double`, `Float`, and `Character`. This encapsulation stores a reference to the wrapper object rather than the primitive value itself.

#### Example:

```java
import java.util.ArrayList;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        names.add("Travis"); // Automatically converts to String object
    
        String firstName = names.get(0);
        System.out.println(firstName); // Converts String object to string
    }
    
    
}
```

