---
icon: java
---

# Java

### Abstract Data Types (ADT)

Abstract Data Types (ADT) represent a design concept for managing data with a defined set of operations. When data fields are private, they can only be accessed through public methods, ensuring encapsulation.

#### Key Points

* **Encapsulation**: Data is packaged with associated methods.
* **Access Control**: Private data fields are accessed through public methods.
* **Interface**: Often, ADTs are described using interfaces, which specify available methods and their functionalities.
* **Java Interface**: Acts as a contract detailing what methods are available and their expected behavior.



#### Understanding Interfaces in Programming

1. **Functionality**:
   * Interfaces specify the arguments accepted and the return type of each function.
2. **Characteristics**:
   * Interfaces outline what tasks should be performed but not how they should be achieved.
   * Interfaces cannot act as constructors since they cannot be instantiated; you can't create objects from them.
3. **Implementation**:
   * They are represented by instances of classes that implement them.
   * Methods in interfaces are `public` and `abstract` by default, so these keywords are usually omitted.
4. **Usage**:
   * You can declare a variable of an interface type to reference an instance of a class implementing that interface.

#### Example

```java
ATM anATM = new ATM(); // invalid statement
```

```java
ATM ATM1 = new ATMbankAmerica(); // valid statement
```



