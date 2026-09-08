---
icon: java
---

# Java

## Interfaces

```java
// ============================================
// JAVA INTERFACES - COMPLETE BREAKDOWN
// ============================================

// 1. DEFINING AN INTERFACE
// An interface is like a contract that specifies what methods a class must implement
interface ATM {
    // Methods in interfaces are public and abstract by default
    void insertCard();
    void enterPIN(int pin);
    double checkBalance();
    void withdrawMoney(double amount);
    void ejectCard();
    
    // You can also have constants (public, static, final by default)
    int MAX_ATTEMPTS = 3;
}

// 2. IMPLEMENTING AN INTERFACE
// Classes that implement an interface MUST provide implementations for all methods
class ATMBankAmerica implements ATM {
    private double balance = 1000.0;
    private boolean cardInserted = false;
    private boolean pinVerified = false;
    
    @Override
    public void insertCard() {
        System.out.println("Bank of America: Card inserted");
        cardInserted = true;
    }
    
    @Override
    public void enterPIN(int pin) {
        System.out.println("Bank of America: PIN entered");
        // Simplified PIN verification
        if (pin == 1234) {
            pinVerified = true;
            System.out.println("PIN verified");
        } else {
            System.out.println("Invalid PIN");
        }
    }
    
    @Override
    public double checkBalance() {
        if (cardInserted && pinVerified) {
            System.out.println("Bank of America: Balance = $" + balance);
            return balance;
        } else {
            System.out.println("Please insert card and enter PIN first");
            return 0;
        }
    }
    
    @Override
    public void withdrawMoney(double amount) {
        if (cardInserted && pinVerified && amount <= balance) {
            balance -= amount;
            System.out.println("Bank of America: Withdrawn $" + amount);
            System.out.println("Remaining balance: $" + balance);
        } else {
            System.out.println("Transaction failed");
        }
    }
    
    @Override
    public void ejectCard() {
        System.out.println("Bank of America: Card ejected");
        cardInserted = false;
        pinVerified = false;
    }
}

// Another implementation of the same interface
class ATMWellsFargo implements ATM {
    private double balance = 1500.0;
    private boolean authenticated = false;
    
    @Override
    public void insertCard() {
        System.out.println("Wells Fargo: Welcome! Card accepted");
    }
    
    @Override
    public void enterPIN(int pin) {
        System.out.println("Wells Fargo: Verifying PIN...");
        authenticated = (pin == 5678);
        System.out.println(authenticated ? "Access granted" : "Access denied");
    }
    
    @Override
    public double checkBalance() {
        if (authenticated) {
            System.out.println("Wells Fargo: Your balance is $" + balance);
            return balance;
        }
        return 0;
    }
    
    @Override
    public void withdrawMoney(double amount) {
        if (authenticated && amount <= balance) {
            balance -= amount;
            System.out.println("Wells Fargo: $" + amount + " dispensed");
        }
    }
    
    @Override
    public void ejectCard() {
        System.out.println("Wells Fargo: Thank you! Card returned");
        authenticated = false;
    }
}

// 3. USING INTERFACES - THE MAIN CONCEPT
public class InterfaceDemo {
    public static void main(String[] args) {
        
        // ❌ INVALID - Cannot instantiate an interface directly
        // ATM anATM = new ATM(); // This would cause a compilation error
        
        // ✅ VALID - Reference interface, but instantiate implementing class
        ATM atm1 = new ATMBankAmerica();  // Interface reference, concrete implementation
        ATM atm2 = new ATMWellsFargo();   // Same interface, different implementation
        
        System.out.println("=== Using Bank of America ATM ===");
        useATM(atm1, 1234);
        
        System.out.println("\n=== Using Wells Fargo ATM ===");
        useATM(atm2, 5678);
        
        // 4. POLYMORPHISM IN ACTION
        System.out.println("\n=== Polymorphism Demo ===");
        ATM[] atms = {new ATMBankAmerica(), new ATMWellsFargo()};
        
        for (ATM atm : atms) {
            atm.insertCard(); // Same method call, different behavior
        }
    }
    
    // This method accepts ANY class that implements the ATM interface
    public static void useATM(ATM atm, int pin) {
        atm.insertCard();
        atm.enterPIN(pin);
        atm.checkBalance();
        atm.withdrawMoney(100);
        atm.ejectCard();
    }
}

// ============================================
// KEY CONCEPTS EXPLAINED
// ============================================

/*
1. INTERFACE AS A CONTRACT:
   - Defines WHAT methods must exist
   - Doesn't define HOW they work (no implementation)
   - All methods are public and abstract by default

2. IMPLEMENTATION REQUIREMENTS:
   - Classes implementing an interface MUST implement ALL methods
   - Each class can implement methods differently
   - Multiple classes can implement the same interface

3. POLYMORPHISM:
   - Interface reference can point to any implementing class
   - Same method call produces different behavior based on actual object type
   - Enables writing flexible, reusable code

4. WHY USE INTERFACES:
   - Code to interfaces, not implementations
   - Easy to swap implementations without changing client code
   - Supports multiple inheritance (class can implement multiple interfaces)
   - Promotes loose coupling between components

5. REAL-WORLD ANALOGY:
   - Interface = Job description (what tasks must be done)
   - Implementation = Specific person doing the job (how they do it)
   - You can hire different people for the same job description
*/
```
