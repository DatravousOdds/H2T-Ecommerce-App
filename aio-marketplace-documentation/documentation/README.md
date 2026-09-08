---
icon: head-side
cover: >-
  https://images.unsplash.com/photo-1658204191944-374e8115a2de?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHw3fHxhcGl8ZW58MHx8fHwxNzUwNzE3Mzg0fDA&ixlib=rb-4.1.0&q=85
coverY: 0
---

# Documentation

### Authentication





### Products





### Orders



## Signup API

This endpoint handles new user registration.

### Endpoint

`POST /signup`

### Headers

```http
Content-Type: application/json
```

### Request  Body

```json
{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "number": "1234567890",
    "tac": true,
    "notification": true
}
```



### Validation Rules

* Password must be at least 8 characters
* Maximum password should be at least 64 characters to allow passphrases
* Phone number must be a valid 10 digits
* Term and agreements must be accepted

### Response Examples

```json
{
    "success": true,
    "data": {
        "name": "Test User",
        "email": "test@example.com",
        "token": "jwt_token_here"
    }
}
```

#### Success Response

```json
{
    "success": true,
    "data": {
        "name": "Test User2",
        "email": "mytestemail@gmail.com",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im15dGVzdGVtYWlsQGdtYWlsLmNvbSIsInNlbGxlciI6ZmFsc2UsImlhdCI6MTczNjkwNjE0OCwiZXhwIjoxNzM2OTkyNTQ4fQ.X9fO4ohxmmr8qx34dbyhUD-9FbKmuFly74m6ewBRw8U"
    }
}
```

#### Error Response

```json
{
    "alert": "email already exists"
}
```



## Login API

This endpoint authenticates existing users.

### Endpoint

`POST /login`

### Headers

```http
Content-Type: application/json
```

### Request Body

```json
{
    "email": "test2@example.com",
    "password": "password123"
}
```



### Response Examples

### Success Response

```json
{
    "name": "User Name",
    "email": "example@email.com",
    "seller": false
}
```

### Error Responses

**Invalid Credentials**

```json
{
    "alert": "password is incorrect"
}
```

#### User Not Found

```json
{
    "alert": "log in email does not exists"
}
```

#### MIssing Input Fields

```json
{
    "alert": "fill all the inputs"
}
```

### Notes

* Passwords are hashed using bcrypt
* The success response includes user's name, email, and seller status































